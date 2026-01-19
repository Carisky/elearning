import { prisma } from '../utils/db'

export default defineEventHandler(async () => {
  return prisma.category.findMany({
    orderBy: {
      sortOrder: 'asc',
    },
    select: {
      id: true,
      title: true,
      slug: true,
      sortOrder: true,
    },
  })
})
