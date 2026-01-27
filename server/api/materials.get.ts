import { getQuery } from 'h3'
import { prisma } from '../utils/db'
import { requireAdmin } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const typeRaw = typeof query.type === 'string' ? query.type.toUpperCase() : null
  const type = typeRaw === 'PDF' || typeRaw === 'VIDEO' ? typeRaw : null

  const q = typeof query.q === 'string' ? query.q.trim() : ''

  return prisma.material.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      type: true,
      url: true,
      description: true,
      thumbnailUrl: true,
      durationSec: true,
      createdAt: true,
      updatedAt: true,
    },
  })
})
