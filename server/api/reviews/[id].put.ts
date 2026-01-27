import { createError, getRouterParam, readBody } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

const clampString = (value: unknown, maxLen: number) => {
  if (value === null) return null
  if (value === undefined) return undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed
}

const normalizeRating = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const rating = Number(value)
  if (!Number.isFinite(rating)) return undefined
  const rounded = Math.round(rating)
  if (rounded < 1 || rounded > 5) return undefined
  return rounded
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  const reviewId = Number(id)
  if (!Number.isFinite(reviewId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid review id' })
  }

  const body = await readBody<{
    authorName?: unknown
    authorTitle?: unknown
    rating?: unknown
    content?: unknown
    status?: unknown
  }>(event)

  const updateData: Record<string, any> = {}

  const authorName = clampString(body?.authorName, 80)
  if (authorName !== undefined) {
    if (authorName === null) throw createError({ statusCode: 400, statusMessage: 'Author name is required' })
    updateData.authorName = authorName
  }

  const authorTitle = clampString(body?.authorTitle, 120)
  if (authorTitle !== undefined) updateData.authorTitle = authorTitle

  const content = clampString(body?.content, 1200)
  if (content !== undefined) {
    if (content === null || content.length < 10) {
      throw createError({ statusCode: 400, statusMessage: 'Review content is required' })
    }
    updateData.content = content
  }

  const rating = normalizeRating(body?.rating)
  if (rating !== undefined) {
    if (rating === undefined) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid rating' })
    }
    updateData.rating = rating
  }

  if (body?.status !== undefined) {
    const statusRaw = typeof body.status === 'string' ? body.status.toUpperCase() : ''
    const status =
      statusRaw === 'PENDING' || statusRaw === 'APPROVED' || statusRaw === 'REJECTED' ? statusRaw : null
    if (!status) throw createError({ statusCode: 400, statusMessage: 'Invalid status' })

    const now = new Date()
    updateData.status = status
    updateData.moderatedById = status === 'PENDING' ? null : admin.id
    updateData.approvedAt = status === 'APPROVED' ? now : null
    updateData.rejectedAt = status === 'REJECTED' ? now : null
  }

  if (!Object.keys(updateData).length) {
    throw createError({ statusCode: 400, statusMessage: 'No data to update' })
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: updateData,
    select: {
      id: true,
      authorName: true,
      authorTitle: true,
      rating: true,
      content: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      approvedAt: true,
      rejectedAt: true,
      moderatedBy: { select: { id: true, name: true, email: true } },
    },
  })

  return updated
})

