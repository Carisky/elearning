import { createError, getQuery } from 'h3'
import { prisma } from '../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = query.slug
  if (!slug || typeof slug !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'slug is required' })
  }

  const limitCandidate = Number(query.limit ?? 12)
  const limit = Number.isFinite(limitCandidate) ? Math.max(1, Math.min(50, limitCandidate)) : 12

  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  const reviews = await prisma.courseReview.findMany({
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

  return reviews
})

