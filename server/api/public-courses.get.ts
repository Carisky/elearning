import { getQuery } from 'h3'
import { prisma } from '../utils/db'
import { deltaToPlainText } from '../utils/rich-text'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const featuredOnly =
    query.featured === '1' ||
    query.featured === 'true' ||
    query.featured === 'yes'

  const limitCandidate = query.limit !== undefined ? Number(query.limit) : null
  const limit =
    limitCandidate !== null && Number.isFinite(limitCandidate)
      ? Math.max(1, Math.min(60, limitCandidate))
      : null

  const courses = await prisma.course.findMany({
    where: {
      status: 'PUBLISHED',
      ...(featuredOnly ? { isFeatured: true } : {}),
    },
    include: {
      category: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    ...(limit ? { take: limit } : {}),
  })

  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    priceCents: course.priceCents,
    currency: course.currency,
    isFeatured: course.isFeatured,
    previewImageUrl: course.previewImageUrl,
    descriptionText: deltaToPlainText(course.descriptionJson).slice(0, 220),
    category: course.category,
  }))
})
