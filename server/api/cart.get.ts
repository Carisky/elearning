import { requireAuth } from '../utils/auth'
import { prisma } from '../utils/db'
import { getOrCreateCart } from '../utils/cart'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const cart = await getOrCreateCart(user.id)
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { addedAt: 'asc' },
    select: {
      courseId: true,
      quantity: true,
    },
  })
  return { items }
})

