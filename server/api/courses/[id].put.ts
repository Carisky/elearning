import { readBody, createError } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

const createSlug = (value: string) => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 128)
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = event.context.params ?? {}
  const courseId = Number(id)
  if (!Number.isFinite(courseId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid course id' })
  }

  const body = await readBody<{
    title?: string
    slug?: string
    categoryId?: number
    price?: number | string
    currency?: string
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  }>(event)

  const updateData: Record<string, any> = {}
  if (body.title?.trim()) updateData.title = body.title.trim()
  if (body.slug?.trim()) {
    updateData.slug = body.slug.trim().toLowerCase()
  }
  if (body.categoryId) updateData.categoryId = body.categoryId
  if (body.price !== undefined) {
    const priceCandidate = Number(body.price)
    updateData.priceCents = Number.isFinite(priceCandidate)
      ? Math.max(0, Math.round(priceCandidate * 100))
      : 0
  }
  if (body.currency?.trim()) updateData.currency = body.currency.trim().toUpperCase()
  if (body.status) updateData.status = body.status

  if (!Object.keys(updateData).length) {
    throw createError({ statusCode: 400, statusMessage: 'No data to update' })
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: updateData,
  })

  return {
    id: updated.id,
    title: updated.title,
    slug: updated.slug,
    categoryId: updated.categoryId,
    priceCents: updated.priceCents,
    currency: updated.currency,
    status: updated.status,
  }
})
