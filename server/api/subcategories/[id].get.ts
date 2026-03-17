import { createError } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = event.context.params ?? {}
  const subcategoryId = Number(id)
  if (!Number.isFinite(subcategoryId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid subcategory id' })
  }

  const subcategory = await prisma.subcategory.findUnique({
    where: { id: subcategoryId },
    select: {
      id: true,
      categoryId: true,
      title: true,
      slug: true,
      sortOrder: true,
      category: { select: { id: true, title: true } },
    },
  })

  if (!subcategory) {
    throw createError({ statusCode: 404, statusMessage: 'Subcategory not found' })
  }

  return subcategory
})

