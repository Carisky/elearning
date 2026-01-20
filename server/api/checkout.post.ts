import { readBody, createError } from 'h3'
import { prisma } from '../utils/db'
import { requireAuth } from '../utils/auth'
import { getOrCreateCart } from '../utils/cart'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{ mode?: 'cart'; courseIds?: number[] }>(event)

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
          priceCents: course.priceCents ?? 0,
          currency,
        })),
      },
    },
    select: { id: true },
  })

  for (const course of courses) {
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        courseId: course.id,
        source: 'ORDER',
      },
    })
  }

  if (shouldClearCart) {
    const cart = await getOrCreateCart(user.id)
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  }

  return { ok: true, orderId: order.id }
})

