import { prisma } from '../utils/db'
import { requireAdmin } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          orders: true,
          enrollments: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    ordersCount: user._count.orders,
    enrollmentsCount: user._count.enrollments,
  }))
})
