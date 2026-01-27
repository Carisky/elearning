import { createError, getQuery } from 'h3'
import { prisma } from '../utils/db'
import { requireAdmin } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const courseId = Number(query.courseId)
  if (!Number.isFinite(courseId)) {
    throw createError({ statusCode: 400, statusMessage: 'courseId is required' })
  }

  const rows = await prisma.courseMaterial.findMany({
    where: { courseId },
    orderBy: [{ position: 'asc' }, { addedAt: 'asc' }],
    select: {
      position: true,
      addedAt: true,
      material: {
        select: {
          id: true,
          title: true,
          type: true,
          url: true,
          description: true,
          thumbnailUrl: true,
          durationSec: true,
        },
      },
    },
  })

  return rows.map((row) => ({ ...row.material, position: row.position, addedAt: row.addedAt }))
})

