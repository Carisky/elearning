import { getQuery, createError } from 'h3'
import { prisma } from '../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const categoryIdRaw = query.categoryId
  const categoryId =
    categoryIdRaw === undefined
      ? null
      : Number(Array.isArray(categoryIdRaw) ? categoryIdRaw[0] : categoryIdRaw)

  if (categoryIdRaw !== undefined && !Number.isFinite(categoryId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid categoryId' })
  }

  return prisma.subcategory.findMany({
    where: categoryId ? { categoryId } : {},
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    select: {
      id: true,
      categoryId: true,
      title: true,
      slug: true,
      sortOrder: true,
      category: { select: { id: true, title: true } },
    },
  })
})

