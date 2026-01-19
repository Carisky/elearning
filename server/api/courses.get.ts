import { prisma } from '../utils/db'

export default defineEventHandler(async () => {
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
