import { createError } from 'h3'
import { prisma } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const courseId = Number(event.context.params?.id)
  if (!Number.isFinite(courseId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid course id' })
  }

  const exists = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  })
  if (!exists) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  const options = await prisma.courseRenewalOption.findMany({
    where: { courseId },
    orderBy: [{ sortOrder: 'asc' }, { durationDays: 'asc' }, { priceCents: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      title: true,
      durationDays: true,
      priceCents: true,
      currency: true,
      isActive: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return options
})

