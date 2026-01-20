import { prisma } from './db'

export const getOrCreateCart = async (userId: number) => {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })
}

