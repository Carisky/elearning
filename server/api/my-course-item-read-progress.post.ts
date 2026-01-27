import { createError, readBody } from 'h3'
import { requireAuth } from '../utils/auth'
import { prisma } from '../utils/db'
import { updateUserCourseProgress } from '../utils/progress'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{ courseItemId?: number; readPercent?: number }>(event)

  const courseItemId = Number(body?.courseItemId)
  if (!Number.isFinite(courseItemId)) {
    throw createError({ statusCode: 400, statusMessage: 'courseItemId is required' })
  }

  const readPercentCandidate = Number(body?.readPercent)
  if (!Number.isFinite(readPercentCandidate)) {
    throw createError({ statusCode: 400, statusMessage: 'readPercent is required' })
  }

  const courseItem = await prisma.courseItem.findUnique({
    where: { id: courseItemId },
    select: { id: true, courseId: true, type: true },
  })

  if (!courseItem) {
    throw createError({ statusCode: 404, statusMessage: 'Course item not found' })
  }

  if (courseItem.type !== 'CHAPTER') {
    throw createError({ statusCode: 400, statusMessage: 'Read progress is supported only for CHAPTER items' })
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: courseItem.courseId } },
    select: { id: true },
  })

  if (!enrollment) {
    throw createError({ statusCode: 403, statusMessage: 'You are not enrolled in this course' })
  }

  const clamped = Math.max(0, Math.min(100, Math.round(readPercentCandidate)))

  const existing = await prisma.userCourseItemReadProgress.findUnique({
    where: { userId_courseItemId: { userId: user.id, courseItemId } },
    select: { readPercent: true },
  })

  const nextReadPercent = Math.max(existing?.readPercent ?? 0, clamped)

  await prisma.userCourseItemReadProgress.upsert({
    where: { userId_courseItemId: { userId: user.id, courseItemId } },
    update: { readPercent: nextReadPercent },
    create: { userId: user.id, courseItemId, readPercent: nextReadPercent },
    select: { id: true },
  })

  const shouldComplete = nextReadPercent >= 100
  if (shouldComplete) {
    await prisma.userCourseItemProgress.upsert({
      where: { userId_courseItemId: { userId: user.id, courseItemId } },
      update: {},
      create: { userId: user.id, courseItemId },
      select: { id: true },
    })
  }

  const progress = await updateUserCourseProgress(user.id, courseItem.courseId)
  return { ok: true, readPercent: nextReadPercent, completed: shouldComplete, progress }
})

