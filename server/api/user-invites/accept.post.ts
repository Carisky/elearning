import { readBody, createError } from 'h3'
import { acceptInvite } from '../../utils/user-invites'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: unknown }>(event)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'token is required' })
  }
  return acceptInvite(token)
})

