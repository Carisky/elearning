import { readBody, createError } from 'h3'
import { prisma } from '../utils/db'
import { requireAdmin } from '../utils/auth'

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
  const admin = await requireAdmin(event)
  const body = await readBody<{
    title: string
    slug?: string
    categoryId: number
    price?: number | string
    currency?: string
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  }>(event)

  if (!body.title || !body.categoryId) {
    throw createError({ statusCode: 400, statusMessage: 'Title and category are required' })
  }

  const slug =
    (body.slug?.trim() ? body.slug : createSlug(body.title)).toLowerCase()

  const priceCandidate = Number(body.price ?? 0)
  const priceCents = Number.isFinite(priceCandidate)
    ? Math.max(0, Math.round(priceCandidate * 100))
    : 0

  const currency = (body.currency ?? 'PLN').toUpperCase()
  const status = body.status ?? 'DRAFT'

  const course = await prisma.course.create({
    data: {
      categoryId: body.categoryId,
      title: body.title.trim(),
      slug,
      priceCents,
      currency,
      status,
      createdById: admin.id,
    },
  })

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    priceCents: course.priceCents,
    currency: course.currency,
    status: course.status,
    categoryId: course.categoryId,
    createdById: course.createdById,
  }
})
