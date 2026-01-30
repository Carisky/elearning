import { createError, readBody } from 'h3'
import { prisma } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const courseId = Number(event.context.params?.id)
  if (!Number.isFinite(courseId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid course id' })
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, currency: true },
  })
  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  const body = await readBody<{
    title?: unknown
    durationDays?: unknown
    price?: unknown
    isActive?: unknown
    sortOrder?: unknown
  }>(event)

  const durationDays = Math.floor(Number(body?.durationDays))
  if (!Number.isFinite(durationDays) || durationDays <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'durationDays is required' })
  }

  const priceCandidate = Number(body?.price ?? 0)
  if (!Number.isFinite(priceCandidate) || priceCandidate < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid price' })
  }
  const priceCents = Math.round(priceCandidate * 100)

  const sortOrderCandidate = body?.sortOrder == null ? 0 : Number(body.sortOrder)
  const sortOrder = Number.isFinite(sortOrderCandidate) ? Math.round(sortOrderCandidate) : 0

  const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : null

  const created = await prisma.courseRenewalOption.create({
    data: {
      courseId: course.id,
      title,
      durationDays,
      priceCents,
      currency: course.currency,
      isActive: body?.isActive === undefined ? true : Boolean(body.isActive),
      sortOrder,
    },
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

  return created
})

