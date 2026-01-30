import { createError, readBody } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { computeExtendedEnrollmentExpiresAt, toEnrollmentAccessDto } from '../../../utils/course-access'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const slug = event.context.params?.slug

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Course slug is required' })
  }

  const body = await readBody<{ optionId?: unknown }>(event)
  const optionId = Number(body?.optionId)
  if (!Number.isFinite(optionId)) {
    throw createError({ statusCode: 400, statusMessage: 'optionId is required' })
  }

  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, currency: true },
  })

  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    select: { id: true, activatedAt: true, expiresAt: true },
  })

  if (!enrollment) {
    throw createError({ statusCode: 403, statusMessage: 'You are not enrolled in this course' })
  }

  if (enrollment.expiresAt === null) {
    throw createError({ statusCode: 409, statusMessage: 'Masz bezterminowy dostęp do tego kursu' })
  }

  const option = await prisma.courseRenewalOption.findFirst({
    where: { id: optionId, courseId: course.id, isActive: true },
    select: { id: true, durationDays: true, priceCents: true, currency: true },
  })

  if (!option) {
    throw createError({ statusCode: 404, statusMessage: 'Renewal option not found' })
  }

  if (option.currency !== course.currency) {
    throw createError({ statusCode: 409, statusMessage: 'Currency mismatch' })
  }

  const now = new Date()
  const nextExpiresAt = computeExtendedEnrollmentExpiresAt(now, enrollment, option.durationDays)
  if (!nextExpiresAt) {
    throw createError({ statusCode: 409, statusMessage: 'Cannot renew this enrollment' })
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: user.id,
        status: 'PAID',
        totalCents: option.priceCents,
        currency: option.currency,
        items: {
          create: {
            courseId: course.id,
            type: 'COURSE_RENEWAL',
            courseRenewalOptionId: option.id,
            priceCents: option.priceCents,
            currency: option.currency,
          },
        },
      },
      select: { id: true },
    })

    const updatedEnrollment = await tx.enrollment.update({
      where: { id: enrollment.id },
      data: { expiresAt: nextExpiresAt },
      select: { activatedAt: true, expiresAt: true },
    })

    await tx.enrollmentRenewal.create({
      data: {
        enrollmentId: enrollment.id,
        optionId: option.id,
        orderId: order.id,
        addedDays: option.durationDays,
        previousExpiresAt: enrollment.expiresAt,
        newExpiresAt: nextExpiresAt,
      },
      select: { id: true },
    })

    return { orderId: order.id, updatedEnrollment }
  })

  return {
    ok: true,
    orderId: result.orderId,
    access: toEnrollmentAccessDto({
      activatedAt: enrollment.activatedAt,
      expiresAt: result.updatedEnrollment.expiresAt,
    }),
  }
})

