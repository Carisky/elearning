import { createError } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = event.context.params ?? {}
  const courseItemId = Number(id)
  if (!Number.isFinite(courseItemId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid course item id' })
  }

  await prisma.courseItem.delete({ where: { id: courseItemId } })
  return { ok: true }
})

