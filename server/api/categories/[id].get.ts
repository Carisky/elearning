import { createError } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = event.context.params ?? {}
  const categoryId = Number(id)
  if (!Number.isFinite(categoryId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid category id' })
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, title: true, slug: true, sortOrder: true },
  })

  if (!category) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  return category
})

