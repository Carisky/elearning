import { getQuery, createError } from 'h3'
import { previewInvite } from '../../utils/user-invites'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = typeof query.token === 'string' ? query.token.trim() : ''
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'token is required' })
  }
  return previewInvite(token)
})

