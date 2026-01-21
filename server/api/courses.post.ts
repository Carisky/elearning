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

const isUniqueConstraintError = (error: any, field: string) => {
  if (!error || typeof error !== 'object') return false
  if (error.code !== 'P2002') return false
  const target = error?.meta?.target
  if (Array.isArray(target)) return target.includes(field)
  if (typeof target === 'string') return target.includes(field)
  return false
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

  const baseSlug = slug
  let course:
    | {
        id: number
        title: string
        slug: string
        priceCents: number
        currency: string
        status: any
        categoryId: number
        createdById: number
      }
    | null = null

  for (let attempt = 0; attempt < 200; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`
    try {
      course = await prisma.course.create({
        data: {
          categoryId: body.categoryId,
          title: body.title.trim(),
          slug: candidate,
          priceCents,
          currency,
          status,
          createdById: admin.id,
        },
      })
      break
    } catch (error: any) {
      if (isUniqueConstraintError(error, 'slug')) continue
      throw error
    }
  }

  if (!course) {
    throw createError({ statusCode: 409, statusMessage: 'Slug already exists' })
  }

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
