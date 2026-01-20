import { createError } from 'h3'
import { prisma } from '../../../utils/db'
import { requireAuth } from '../../../utils/auth'
import { getOrCreateCart } from '../../../utils/cart'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { courseId: courseIdParam } = event.context.params ?? {}
  const courseId = Number(courseIdParam)
  if (!Number.isFinite(courseId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid course id' })
  }

  const cart = await getOrCreateCart(user.id)
  await prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
      courseId,
    },
  })
  return { ok: true }
})

