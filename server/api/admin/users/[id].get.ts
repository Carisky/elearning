import { createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getAdminUserStats } from '../../../utils/adminUserStats'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const userId = Number(event.context.params?.id)
  if (!Number.isInteger(userId) || userId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Valid user id is required' })
  }

  const stats = await getAdminUserStats(userId)
  if (!stats) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return stats
})
