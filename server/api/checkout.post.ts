import { readBody, createError } from 'h3'
import { prisma } from '../utils/db'
import { requireAuth } from '../utils/auth'
import { getOrCreateCart } from '../utils/cart'
import { computeExtendedEnrollmentExpiresAt, computeInitialEnrollmentExpiresAt } from '../utils/course-access'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{ mode?: 'cart'; courseIds?: number[]; acceptedTerms?: boolean }>(event)

  if (body?.acceptedTerms !== true) {
    throw createError({ statusCode: 400, statusMessage: 'Zaakceptuj warunki zakupu, aby kontynuować.' })
  }

  const explicitIds = Array.isArray(body?.courseIds)
    ? body.courseIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : null

  let courseIds: number[] = []
  let shouldClearCart = false

  if (explicitIds?.length) {
    courseIds = Array.from(new Set(explicitIds))
  } else if (body?.mode === 'cart') {
    shouldClearCart = true
    const cart = await getOrCreateCart(user.id)
    const cartItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      select: { courseId: true },
    })
    courseIds = cartItems.map((item) => item.courseId)
  }

  if (!courseIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'No courses to checkout' })
  }

  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: {
      id: true,
      priceCents: true,
      currency: true,
      status: true,
      accessDurationDays: true,
    },
  })

  const missing = courseIds.filter((id) => !courses.some((course) => course.id === id))
  if (missing.length) {
    throw createError({ statusCode: 404, statusMessage: 'Some courses not found' })
  }

  const notPublished = courses.filter((course) => course.status !== 'PUBLISHED').map((c) => c.id)
  if (notPublished.length) {
    throw createError({ statusCode: 400, statusMessage: 'Some courses are not available for purchase' })
  }

  const currency = courses[0]?.currency ?? 'PLN'
  const differentCurrency = courses.some((course) => course.currency !== currency)
  if (differentCurrency) {
    throw createError({ statusCode: 400, statusMessage: 'Mixed currencies are not supported' })
  }

  const totalCents = courses.reduce((acc, course) => acc + (course.priceCents ?? 0), 0)

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      status: 'PAID',
      totalCents,
      currency,
      items: {
        create: courses.map((course) => ({
          courseId: course.id,
          type: 'COURSE',
          priceCents: course.priceCents ?? 0,
          currency,
        })),
      },
    },
    select: { id: true },
  })

  const now = new Date()

  for (const course of courses) {
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
      select: { id: true, expiresAt: true },
    })

    if (!existing) {
      const expiresAt = computeInitialEnrollmentExpiresAt(now, { accessDurationDays: course.accessDurationDays ?? null })
      await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          source: 'ORDER',
          activatedAt: now,
          expiresAt,
        },
        select: { id: true },
      })
      continue
    }

    if (course.accessDurationDays != null && course.accessDurationDays > 0 && existing.expiresAt !== null) {
      const nextExpiresAt = computeExtendedEnrollmentExpiresAt(now, { expiresAt: existing.expiresAt }, course.accessDurationDays)
      await prisma.enrollment.update({
        where: { id: existing.id },
        data: { expiresAt: nextExpiresAt },
        select: { id: true },
      })
    }
  }

  if (shouldClearCart) {
    const cart = await getOrCreateCart(user.id)
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  }

  return { ok: true, orderId: order.id }
})
