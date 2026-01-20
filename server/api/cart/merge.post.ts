import { readBody, createError } from 'h3'
import { prisma } from '../../utils/db'
import { requireAuth } from '../../utils/auth'
import { getOrCreateCart } from '../../utils/cart'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{ courseIds?: number[] }>(event)
  const courseIds = Array.isArray(body?.courseIds)
    ? body.courseIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : []

  if (!courseIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'courseIds required' })
  }

  const cart = await getOrCreateCart(user.id)
  await prisma.cartItem.createMany({
    data: courseIds.map((courseId) => ({ cartId: cart.id, courseId, quantity: 1 })),
    skipDuplicates: true,
  })

  return { ok: true }
})

