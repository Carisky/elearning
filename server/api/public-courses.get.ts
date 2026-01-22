import { prisma } from '../utils/db'
import { deltaToPlainText } from '../utils/rich-text'

export default defineEventHandler(async () => {
  const courses = await prisma.course.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      category: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    priceCents: course.priceCents,
    currency: course.currency,
    previewImageUrl: course.previewImageUrl,
    descriptionText: deltaToPlainText(course.descriptionJson).slice(0, 220),
    category: course.category,
  }))
})
