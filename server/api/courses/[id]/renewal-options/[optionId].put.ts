import { createError, readBody } from 'h3'
import { prisma } from '../../../../utils/db'
import { requireAdmin } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const courseId = Number(event.context.params?.id)
  const optionId = Number(event.context.params?.optionId)
  if (!Number.isFinite(courseId) || !Number.isFinite(optionId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const body = await readBody<{
    title?: unknown
    durationDays?: unknown
    price?: unknown
    isActive?: unknown
    sortOrder?: unknown
  }>(event)

  const option = await prisma.courseRenewalOption.findUnique({
    where: { id: optionId },
    select: { id: true, courseId: true },
  })
  if (!option || option.courseId !== courseId) {
    throw createError({ statusCode: 404, statusMessage: 'Renewal option not found' })
  }

  const updateData: Record<string, any> = {}

  if (body.title !== undefined) {
    updateData.title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null
  }

  if (body.durationDays !== undefined) {
    const durationDays = Math.floor(Number(body.durationDays))
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid durationDays' })
    }
    updateData.durationDays = durationDays
  }

  if (body.price !== undefined) {
    const priceCandidate = Number(body.price)
    if (!Number.isFinite(priceCandidate) || priceCandidate < 0) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid price' })
    }
    updateData.priceCents = Math.round(priceCandidate * 100)
  }

  if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)

  if (body.sortOrder !== undefined) {
    const sortOrderCandidate = Number(body.sortOrder)
    if (!Number.isFinite(sortOrderCandidate)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid sortOrder' })
    }
    updateData.sortOrder = Math.round(sortOrderCandidate)
  }

  if (!Object.keys(updateData).length) {
    throw createError({ statusCode: 400, statusMessage: 'No data to update' })
  }

  const updated = await prisma.courseRenewalOption.update({
    where: { id: optionId },
    data: updateData,
    select: {
      id: true,
      title: true,
      durationDays: true,
      priceCents: true,
      currency: true,
      isActive: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return updated
})

