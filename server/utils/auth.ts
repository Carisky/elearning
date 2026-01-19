import jwt from 'jsonwebtoken'
import { setCookie, getCookie, createError } from 'h3'
import type { H3Event } from 'h3'
import { prisma } from './db'
import type { User, UserRole } from '../../prisma/generated/client'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret'
const COOKIE_NAME = 'auth'
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 30,
}

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
  setCookie(event, COOKIE_NAME, token, COOKIE_OPTIONS)
}

export const clearAuthToken = (event: H3Event) => {
  setCookie(event, COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 })
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
