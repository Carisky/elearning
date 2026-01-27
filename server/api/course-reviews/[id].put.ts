import { createError, readBody } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const id = Number(event.context.params?.id)
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const body = await readBody<{ status?: unknown }>(event)
  const statusRaw = typeof body?.status === 'string' ? body.status.toUpperCase() : 'PENDING'
  const status =
    statusRaw === 'PENDING' || statusRaw === 'APPROVED' || statusRaw === 'REJECTED' ? statusRaw : 'PENDING'

  const now = new Date()
  const updated = await prisma.courseReview.update({
    where: { id },
    data: {
      status,
      approvedAt: status === 'APPROVED' ? now : null,
      rejectedAt: status === 'REJECTED' ? now : null,
      moderatedById: status === 'PENDING' ? null : admin.id,
    },
    select: { id: true, status: true, approvedAt: true, rejectedAt: true, updatedAt: true },
  })

  return updated
})

