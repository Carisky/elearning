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

const isUniqueConstraintError = (error: any, field: string) => {
  if (!error || typeof error !== 'object') return false
  if (error.code !== 'P2002') return false
  const target = error?.meta?.target
  if (Array.isArray(target)) return target.includes(field)
  if (typeof target === 'string') return target.includes(field)
  return false
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
  if (body.slug !== undefined) {
    const nextSlug = body.slug?.trim()
    if (nextSlug) updateData.slug = nextSlug.toLowerCase()
    else if (body.title?.trim()) updateData.slug = createSlug(body.title.trim()).toLowerCase()
  } else if (body.title?.trim()) {
    // keep existing slug when user edits only title
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

  // If slug changes, handle collisions by suffixing.
  if (updateData.slug) {
    const baseSlug = updateData.slug as string
    let updated: any | null = null
    for (let attempt = 0; attempt < 200; attempt++) {
      const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`
      try {
        updated = await prisma.course.update({
          where: { id: courseId },
          data: { ...updateData, slug: candidate },
        })
        break
      } catch (error: any) {
        if (isUniqueConstraintError(error, 'slug')) continue
        throw error
      }
    }
    if (!updated) {
      throw createError({ statusCode: 409, statusMessage: 'Slug already exists' })
    }
    return {
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      categoryId: updated.categoryId,
      priceCents: updated.priceCents,
      currency: updated.currency,
      status: updated.status,
    }
  }

  const updated = await prisma.course.update({ where: { id: courseId }, data: updateData })

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
