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

  const row = await prisma.serviceForm.findUnique({
    where: { id: serviceFormId },
    select: { id: true, title: true, slug: true, sortOrder: true },
  })

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Service form not found' })
  }

  return row
})

