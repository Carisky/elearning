import bcrypt from 'bcryptjs'
import { readBody, createError } from 'h3'
import { prisma } from '../utils/db'
import { signToken, setAuthToken } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; password: string }>(event)

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password required' })
  }

  const user = await prisma.user.findUnique({ where: { email: body.email } })
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const validPassword = await bcrypt.compare(body.password, user.password)
  if (!validPassword) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const token = signToken(user)
  setAuthToken(event, token)

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
})
