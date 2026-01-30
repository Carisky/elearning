import { createError } from 'h3'
import { prisma } from '../../../../utils/db'
import { requireAdmin } from '../../../../utils/auth'

const isForeignKeyConstraintError = (error: any) => {
  return !!error && typeof error === 'object' && error.code === 'P2003'
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const courseId = Number(event.context.params?.id)
  const optionId = Number(event.context.params?.optionId)
  if (!Number.isFinite(courseId) || !Number.isFinite(optionId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const option = await prisma.courseRenewalOption.findUnique({
    where: { id: optionId },
    select: { id: true, courseId: true },
  })
  if (!option || option.courseId !== courseId) {
    throw createError({ statusCode: 404, statusMessage: 'Renewal option not found' })
  }

  try {
    await prisma.courseRenewalOption.delete({ where: { id: optionId } })
  } catch (error: any) {
    if (isForeignKeyConstraintError(error)) {
      throw createError({ statusCode: 409, statusMessage: 'Cannot delete option that is already used' })
    }
    throw error
  }

  return { ok: true }
})

