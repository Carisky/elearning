import { createError } from 'h3'
import { prisma } from '../../utils/db'
import { deltaToPlainText } from '../../utils/rich-text'

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Course slug is required' })
  }

  const course = await prisma.course.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      slug: true,
      priceCents: true,
      currency: true,
      previewImageUrl: true,
      descriptionJson: true,
      category: { select: { id: true, title: true } },
    },
  })

  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  return {
    ...course,
    descriptionText: deltaToPlainText(course.descriptionJson),
  }
})

