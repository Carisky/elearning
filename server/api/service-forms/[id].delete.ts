import { createError } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = event.context.params ?? {}
  const serviceFormId = Number(id)
  if (!Number.isFinite(serviceFormId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid service form id' })
  }

  try {
    await prisma.serviceForm.delete({ where: { id: serviceFormId } })
    return { ok: true }
  } catch (e: any) {
    const message = e?.message as string | undefined
    if (message?.includes('Foreign key constraint') || message?.includes('violates foreign key constraint')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cannot delete service form with courses attached',
      })
    }
    throw e
  }
})

