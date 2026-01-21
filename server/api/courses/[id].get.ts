import { createError } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = event.context.params ?? {}
  const courseId = Number(id)
  if (!Number.isFinite(courseId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid course id' })
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      category: { select: { id: true, title: true } },
    },
  })

  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  return course
})

