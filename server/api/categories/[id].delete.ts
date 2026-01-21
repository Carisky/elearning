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

  try {
    await prisma.category.delete({ where: { id: categoryId } })
    return { ok: true }
  } catch (e: any) {
    const message = e?.message as string | undefined
    if (message?.includes('Foreign key constraint') || message?.includes('violates foreign key constraint')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cannot delete category with courses attached',
      })
    }
    throw e
  }
})

