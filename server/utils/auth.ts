import jwt from 'jsonwebtoken'
import { setCookie, getCookie, createError, getHeader } from 'h3'
import type { H3Event } from 'h3'
import { prisma } from './db'
import type { User, UserRole } from '../../prisma/generated/client'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret'
const COOKIE_NAME = 'auth'

const cookieBaseOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30,
}

const parseForwardedProto = (value: string): string | null => {
  // Forwarded: for=...;proto=https;host=...
  const match = value.match(/(?:^|;)\s*proto=([^;]+)/i)
  return match?.[1]?.trim()?.toLowerCase() ?? null
}

const isRequestSecure = (event: H3Event): boolean => {
  const forwardedProto = getHeader(event, 'x-forwarded-proto')
  if (typeof forwardedProto === 'string') {
    const proto = forwardedProto.split(',')[0]?.trim()?.toLowerCase()
    if (proto) return proto === 'https'
  }

  const forwardedSsl = getHeader(event, 'x-forwarded-ssl')
  if (typeof forwardedSsl === 'string' && forwardedSsl.trim().toLowerCase() === 'on') return true

  const forwarded = getHeader(event, 'forwarded')
  if (typeof forwarded === 'string') {
    const proto = parseForwardedProto(forwarded)
    if (proto) return proto === 'https'
  }

  const cfVisitor = getHeader(event, 'cf-visitor')
  if (typeof cfVisitor === 'string') {
    try {
      const parsed = JSON.parse(cfVisitor)
      if (parsed?.scheme === 'https') return true
    } catch {
      // ignore
    }
  }

  return Boolean((event.node.req.socket as any)?.encrypted)
}

const shouldUseSecureCookie = (event: H3Event): boolean => {
  const override = process.env.COOKIE_SECURE
  if (override) return override === 'true' || override === '1'
  if (process.env.NODE_ENV !== 'production') return false
  return isRequestSecure(event)
}

const cookieOptions = (event: H3Event) => ({
  ...cookieBaseOptions,
  secure: shouldUseSecureCookie(event),
})

type AuthPayload = {
  userId: number
  role: UserRole
  email: string
}

export const signToken = (user: Pick<User, 'id' | 'email' | 'role'>) => {
  return jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  )
}

export const setAuthToken = (event: H3Event, token: string) => {
  setCookie(event, COOKIE_NAME, token, cookieOptions(event))
}

export const clearAuthToken = (event: H3Event) => {
  setCookie(event, COOKIE_NAME, '', { ...cookieOptions(event), maxAge: 0 })
}

export const getTokenFromEvent = (event: H3Event): string | undefined =>
  getCookie(event, COOKIE_NAME)

export const verifyToken = (token: string): AuthPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload
  } catch (error) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }
}

export const getSessionUser = async (event: H3Event) => {
  const token = getTokenFromEvent(event)
  if (!token) return null

  const payload = verifyToken(token)
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  })
  return user
}

export const requireAuth = async (event: H3Event) => {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  return user
}

export const requireAdmin = async (event: H3Event) => {
  const user = await requireAuth(event)
  if (user.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }
  return user
}
