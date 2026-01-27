import { getQuery } from 'h3'
import { prisma } from '../utils/db'
import { requireAdmin } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const statusRaw = typeof query.status === 'string' ? query.status.toUpperCase() : null
  const status =
    statusRaw === 'PENDING' || statusRaw === 'APPROVED' || statusRaw === 'REJECTED' ? statusRaw : null

  const courseId = query.courseId === undefined ? null : Number(query.courseId)
  const courseIdFilter = courseId !== null && Number.isFinite(courseId) ? courseId : null

  return prisma.courseReview.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(courseIdFilter ? { courseId: courseIdFilter } : {}),
    },
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
      course: { select: { id: true, title: true, slug: true } },
      user: { select: { id: true, email: true, name: true } },
      moderatedBy: { select: { id: true, email: true, name: true } },
    },
  })
})
