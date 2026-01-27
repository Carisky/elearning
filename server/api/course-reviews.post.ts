import { createError, readBody } from 'h3'
import { prisma } from '../utils/db'
import { requireAuth } from '../utils/auth'

const clampString = (value: unknown, maxLen: number) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed
}

const normalizeRating = (value: unknown): number | null => {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  const rounded = Math.round(num)
  if (rounded < 1 || rounded > 5) return null
  return rounded
}

const fallbackAuthorName = (email: string) => {
  const local = email.split('@')[0] ?? ''
  const cleaned = local.replace(/[._-]+/g, ' ').trim()
  return cleaned ? cleaned.slice(0, 80) : 'Użytkownik'
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody<{
    courseId?: unknown
    rating?: unknown
    content?: unknown
    authorTitle?: unknown
  }>(event)

  const courseId = Number(body?.courseId)
  if (!Number.isFinite(courseId)) throw createError({ statusCode: 400, statusMessage: 'courseId is required' })

  const rating = normalizeRating(body?.rating)
  const content = clampString(body?.content, 1200)
  const authorTitle = clampString(body?.authorTitle, 120) || null

  if (!rating) throw createError({ statusCode: 400, statusMessage: 'Rating must be 1..5' })
  if (!content || content.length < 10) {
    throw createError({ statusCode: 400, statusMessage: 'Review content is required' })
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true },
  })
  if (!enrollment) throw createError({ statusCode: 403, statusMessage: 'You are not enrolled in this course' })

  const progress = await prisma.userCourseProgress.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { finished: true },
  })
  if (!progress?.finished) {
    throw createError({ statusCode: 403, statusMessage: 'You can review this course after completion' })
  }

  const existing = await prisma.courseReview.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true },
  })
  if (existing) throw createError({ statusCode: 409, statusMessage: 'You already reviewed this course' })

  const authorName = (user.name?.trim() || fallbackAuthorName(user.email)).slice(0, 80)

  const created = await prisma.courseReview.create({
    data: {
      courseId,
      userId: user.id,
      authorName,
      authorTitle,
      rating,
      content,
      status: 'PENDING',
    },
    select: { id: true, status: true, createdAt: true },
  })

  return created
})

