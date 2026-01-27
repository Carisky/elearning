import { getQuery } from 'h3'
import { prisma } from '../utils/db'
import { requireAdmin } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const statusRaw = typeof query.status === 'string' ? query.status.toUpperCase() : null
  const status =
    statusRaw === 'PENDING' || statusRaw === 'APPROVED' || statusRaw === 'REJECTED' ? statusRaw : null

  return prisma.review.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      authorName: true,
      authorTitle: true,
      rating: true,
      content: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      approvedAt: true,
      rejectedAt: true,
      moderatedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  })
})
