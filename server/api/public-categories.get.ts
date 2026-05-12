import { getQuery } from 'h3'
import { prisma } from '../utils/db'

const MAX_CATEGORY_SUGGESTIONS = 20

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = String(query.q ?? '').trim()

  return prisma.category.findMany({
    where: {
      courses: {
        some: {
          status: 'PUBLISHED',
        },
      },
      ...(search
        ? {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {}),
    },
    orderBy: [
      { sortOrder: 'asc' },
      { title: 'asc' },
    ],
    take: MAX_CATEGORY_SUGGESTIONS,
    select: {
      id: true,
      title: true,
    },
  })
})
