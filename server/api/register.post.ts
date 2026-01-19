import bcrypt from 'bcryptjs'
import { readBody, createError } from 'h3'
import { prisma } from '../utils/db'
import { signToken, setAuthToken } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string
    email: string
    password: string
    role?: 'USER' | 'ADMIN'
  }>(event)

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password required' })
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Email already in use' })
  }

  const hashed = await bcrypt.hash(body.password, 10)

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name ?? null,
      password: hashed,
      role: body.role ?? 'USER',
    },
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
