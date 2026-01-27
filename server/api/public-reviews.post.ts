import { createError, readBody } from 'h3'
import { prisma } from '../utils/db'

const clampString = (value: unknown, maxLen: number) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed
}

const normalizeRating = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const rating = Number(value)
  if (!Number.isFinite(rating)) return null
  const rounded = Math.round(rating)
  if (rounded < 1 || rounded > 5) return null
  return rounded
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    authorName?: unknown
    authorTitle?: unknown
    rating?: unknown
    content?: unknown
  }>(event)

  const authorName = clampString(body?.authorName, 80)
  const authorTitle = clampString(body?.authorTitle, 120) || null
  const content = clampString(body?.content, 1200)
  const rating = normalizeRating(body?.rating)

  if (!authorName) {
    throw createError({ statusCode: 400, statusMessage: 'Author name is required' })
  }
  if (!content || content.length < 10) {
    throw createError({ statusCode: 400, statusMessage: 'Review content is required' })
  }

  const created = await prisma.review.create({
    data: {
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
