import { getQuery } from 'h3'
import { prisma } from '../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limitCandidate = Number(query.limit ?? 6)
  const limit = Number.isFinite(limitCandidate) ? Math.max(1, Math.min(30, limitCandidate)) : 6

  const reviews = await prisma.review.findMany({
    where: { status: 'APPROVED' },
    orderBy: [{ approvedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      authorName: true,
      authorTitle: true,
      rating: true,
      content: true,
      approvedAt: true,
      createdAt: true,
    },
  })

  return reviews
})
