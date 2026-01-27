import { createError, getRouterParam } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  const reviewId = Number(id)
  if (!Number.isFinite(reviewId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid review id' })
  }

  await prisma.review.delete({ where: { id: reviewId } })
  return { ok: true }
})

