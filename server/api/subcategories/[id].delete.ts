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

  try {
    await prisma.subcategory.delete({ where: { id: subcategoryId } })
    return { ok: true }
  } catch (e: any) {
    const message = e?.message as string | undefined
    if (message?.includes('Foreign key constraint') || message?.includes('violates foreign key constraint')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cannot delete subcategory with courses attached',
      })
    }
    throw e
  }
})

