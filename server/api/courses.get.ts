import { prisma } from '../utils/db'
import { requireAdmin } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return prisma.course.findMany({
    include: {
      category: {
        select: {
          id: true,
          title: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
})
