import { prisma } from '../utils/db'

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
    category: course.category,
  }))
})

