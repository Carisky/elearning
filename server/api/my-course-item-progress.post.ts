import { createError, readBody } from 'h3'
import { requireAuth } from '../utils/auth'
import { prisma } from '../utils/db'
import { updateUserCourseProgress } from '../utils/progress'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{ courseItemId?: number }>(event)

  const courseItemId = Number(body?.courseItemId)
  if (!Number.isFinite(courseItemId)) {
    throw createError({ statusCode: 400, statusMessage: 'courseItemId is required' })
  }

  const courseItem = await prisma.courseItem.findUnique({
    where: { id: courseItemId },
    select: { id: true, courseId: true },
  })

  if (!courseItem) {
    throw createError({ statusCode: 404, statusMessage: 'Course item not found' })
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: courseItem.courseId } },
    select: { id: true },
  })

  if (!enrollment) {
    throw createError({ statusCode: 403, statusMessage: 'You are not enrolled in this course' })
  }

  await prisma.userCourseItemProgress.upsert({
    where: { userId_courseItemId: { userId: user.id, courseItemId } },
    update: {},
    create: { userId: user.id, courseItemId },
    select: { id: true },
  })

  const progress = await updateUserCourseProgress(user.id, courseItem.courseId)

  return { ok: true, progress }
})

