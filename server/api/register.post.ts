import bcrypt from 'bcryptjs'
import { readBody, createError } from 'h3'
import { prisma } from '../utils/db'
import { signToken, setAuthToken } from '../utils/auth'
import { redeemInviteForUser } from '../utils/user-invites'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string
    email: string
    password: string
    role?: 'USER' | 'ADMIN'
    inviteToken?: unknown
  }>(event)

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password required' })
  }

  const hashed = await bcrypt.hash(body.password, 10)

  const inviteToken = typeof body.inviteToken === 'string' ? body.inviteToken.trim() : ''

  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: body.email } })
    if (existing) {
      throw createError({ statusCode: 409, statusMessage: 'Email already in use' })
    }

    const created = await tx.user.create({
      data: {
        email: body.email,
        name: body.name ?? null,
        password: hashed,
        role: inviteToken ? 'USER' : body.role ?? 'USER',
      },
    })

    if (inviteToken) {
      await redeemInviteForUser(tx, inviteToken, { id: created.id, email: created.email })
    }

    return created
  })

  const token = signToken(user)
  setAuthToken(event, token)

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
})
