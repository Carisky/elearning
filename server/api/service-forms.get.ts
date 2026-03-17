import { prisma } from '../utils/db'

export default defineEventHandler(async () => {
  return prisma.serviceForm.findMany({
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    select: { id: true, title: true, slug: true, sortOrder: true },
  })
})

