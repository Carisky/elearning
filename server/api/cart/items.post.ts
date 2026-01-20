import { readBody, createError } from 'h3'
import { prisma } from '../../utils/db'
import { requireAuth } from '../../utils/auth'
import { getOrCreateCart } from '../../utils/cart'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{ courseId?: number }>(event)
  const courseId = Number(body?.courseId)
  if (!Number.isFinite(courseId)) {
    throw createError({ statusCode: 400, statusMessage: 'courseId required' })
  }

  const cart = await getOrCreateCart(user.id)
  await prisma.cartItem.create({
    data: { cartId: cart.id, courseId, quantity: 1 },
  }).catch(async (error: any) => {
    const code = String(error?.code ?? '')
    if (code !== 'P2002') throw error
  })

  return { ok: true }
})
