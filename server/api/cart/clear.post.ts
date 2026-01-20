import { prisma } from '../../utils/db'
import { requireAuth } from '../../utils/auth'
import { getOrCreateCart } from '../../utils/cart'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const cart = await getOrCreateCart(user.id)
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  return { ok: true }
})

