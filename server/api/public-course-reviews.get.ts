import { createError, getQuery } from 'h3'
import { prisma } from '../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const limitCandidate = Number(query.limit ?? 10)
  const limit = Number.isFinite(limitCandidate) ? Math.max(1, Math.min(50, limitCandidate)) : 10

  const courseIdCandidate = query.courseId === undefined ? null : Number(query.courseId)
  const courseId = courseIdCandidate !== null && Number.isFinite(courseIdCandidate) ? courseIdCandidate : null

  const slug = typeof query.slug === 'string' ? query.slug.trim() : ''

  if (!courseId && !slug) {
    throw createError({ statusCode: 400, statusMessage: 'courseId or slug is required' })
  }

  const course = courseId
    ? await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })
    : await prisma.course.findUnique({ where: { slug }, select: { id: true } })

  if (!course) throw createError({ statusCode: 404, statusMessage: 'Course not found' })

  return prisma.courseReview.findMany({
    where: { courseId: course.id, status: 'APPROVED' },
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
})

