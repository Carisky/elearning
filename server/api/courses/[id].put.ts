import { readBody, createError } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'
import { isSupportedCurrencyCode, normalizeCurrencyCode } from '~/utils/currency'
import { normalizeDeltaPojo } from '../../utils/rich-text'

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

  const existing = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      categoryId: true,
      subcategoryId: true,
      serviceFormId: true,
      shortDescription: true,
      hoursTotal: true,
      status: true,
    },
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  const body = await readBody<{
    title?: string
    slug?: string
    categoryId?: number
    subcategoryId?: number | null
    serviceFormId?: number | null
    shortDescription?: string | null
    hoursTotal?: number | string | null
    price?: number | string
    currency?: string
    accessDurationDays?: number | string | null
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    isFeatured?: boolean
    previewImageUrl?: string | null
    descriptionJson?: any | null
    programJson?: any | null
    instructorJson?: any | null
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
  if (body.categoryId !== undefined) {
    const parsed = Number(body.categoryId)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid categoryId' })
    }
    updateData.categoryId = parsed
  }
  if (body.subcategoryId !== undefined) {
    if (body.subcategoryId === null) updateData.subcategoryId = null
    else {
      const parsed = Number(body.subcategoryId)
      if (!Number.isFinite(parsed)) throw createError({ statusCode: 400, statusMessage: 'Invalid subcategoryId' })
      updateData.subcategoryId = parsed
    }
  }
  if (body.serviceFormId !== undefined) {
    if (body.serviceFormId === null) updateData.serviceFormId = null
    else {
      const parsed = Number(body.serviceFormId)
      if (!Number.isFinite(parsed)) throw createError({ statusCode: 400, statusMessage: 'Invalid serviceFormId' })
      updateData.serviceFormId = parsed
    }
  }
  if (body.shortDescription !== undefined) {
    const next =
      typeof body.shortDescription === 'string' && body.shortDescription.trim() ? body.shortDescription.trim() : null
    if (next && next.length > 500) {
      throw createError({ statusCode: 400, statusMessage: 'shortDescription is too long' })
    }
    updateData.shortDescription = next
  }
  if (body.hoursTotal !== undefined) {
    if (body.hoursTotal === null) updateData.hoursTotal = null
    else {
      const parsed = Number(body.hoursTotal)
      if (!Number.isFinite(parsed)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid hoursTotal' })
      }
      const hours = Math.floor(parsed)
      if (hours <= 0) {
        throw createError({ statusCode: 400, statusMessage: 'hoursTotal must be greater than 0' })
      }
      updateData.hoursTotal = hours
    }
  }
  if (body.price !== undefined) {
    const priceCandidate = Number(body.price)
    updateData.priceCents = Number.isFinite(priceCandidate)
      ? Math.max(0, Math.round(priceCandidate * 100))
      : 0
  }
  if (body.currency !== undefined) {
    const normalizedCurrency = normalizeCurrencyCode(body.currency)
    if (normalizedCurrency && isSupportedCurrencyCode(normalizedCurrency)) updateData.currency = normalizedCurrency
    else if (body.currency?.trim()) throw createError({ statusCode: 400, statusMessage: 'Unsupported currency' })
  }
  if (body.accessDurationDays !== undefined) {
    if (body.accessDurationDays === null) {
      updateData.accessDurationDays = null
    } else {
      const parsed = Number(body.accessDurationDays)
      if (!Number.isFinite(parsed)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid accessDurationDays' })
      }
      const days = Math.floor(parsed)
      updateData.accessDurationDays = days <= 0 ? null : days
    }
  }
  if (body.status) updateData.status = body.status
  if (body.isFeatured !== undefined) updateData.isFeatured = Boolean(body.isFeatured)
  if (body.previewImageUrl !== undefined) {
    updateData.previewImageUrl = typeof body.previewImageUrl === 'string' && body.previewImageUrl.trim()
      ? body.previewImageUrl.trim()
      : null
  }
  if (body.descriptionJson !== undefined) {
    updateData.descriptionJson = normalizeDeltaPojo(body.descriptionJson)
  }
  if (body.programJson !== undefined) {
    updateData.programJson = normalizeDeltaPojo(body.programJson)
  }
  if (body.instructorJson !== undefined) {
    updateData.instructorJson = normalizeDeltaPojo(body.instructorJson)
  }

  const nextCategoryId = (updateData.categoryId ?? existing.categoryId) as number
  const nextSubcategoryId =
    updateData.subcategoryId !== undefined ? (updateData.subcategoryId as number | null) : existing.subcategoryId
  const nextServiceFormId =
    updateData.serviceFormId !== undefined ? (updateData.serviceFormId as number | null) : existing.serviceFormId
  const nextShortDescription =
    updateData.shortDescription !== undefined ? (updateData.shortDescription as string | null) : existing.shortDescription
  const nextHoursTotal = updateData.hoursTotal !== undefined ? (updateData.hoursTotal as number | null) : existing.hoursTotal
  const nextStatus = (updateData.status ?? existing.status) as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

  if (nextSubcategoryId !== null) {
    const ok = await prisma.subcategory.findFirst({
      where: { id: nextSubcategoryId, categoryId: nextCategoryId },
      select: { id: true },
    })
    if (!ok) {
      throw createError({ statusCode: 400, statusMessage: 'Subcategory does not belong to category' })
    }
  }

  if (nextServiceFormId !== null) {
    const ok = await prisma.serviceForm.findUnique({ where: { id: nextServiceFormId }, select: { id: true } })
    if (!ok) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid serviceFormId' })
    }
  }

  if (nextStatus === 'PUBLISHED') {
    if (!nextShortDescription) {
      throw createError({ statusCode: 400, statusMessage: 'shortDescription is required for publishing' })
    }
    if (nextHoursTotal === null) {
      throw createError({ statusCode: 400, statusMessage: 'hoursTotal is required for publishing' })
    }
    if (nextSubcategoryId === null) {
      throw createError({ statusCode: 400, statusMessage: 'subcategoryId is required for publishing' })
    }
    if (nextServiceFormId === null) {
      throw createError({ statusCode: 400, statusMessage: 'serviceFormId is required for publishing' })
    }
  }

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
