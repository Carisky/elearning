import { createError, readBody } from 'h3'
import { prisma } from '../utils/db'
import { requireAdmin } from '../utils/auth'

const normalizeIdList = (value: unknown): number[] => {
  if (!Array.isArray(value)) return []
  const out: number[] = []
  for (const v of value) {
    const id = Number(v)
    if (!Number.isFinite(id)) continue
    const int = Math.trunc(id)
    if (int <= 0) continue
    out.push(int)
  }
  return Array.from(new Set(out))
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<{ courseId?: unknown; materialIds?: unknown }>(event)
  const courseId = Number(body?.courseId)
  if (!Number.isFinite(courseId)) {
    throw createError({ statusCode: 400, statusMessage: 'courseId is required' })
  }

  const materialIds = normalizeIdList(body?.materialIds)

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })
  if (!course) throw createError({ statusCode: 404, statusMessage: 'Course not found' })

  if (materialIds.length) {
    const existing = await prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true },
    })
    const existingSet = new Set(existing.map((m) => m.id))
    const missing = materialIds.filter((id) => !existingSet.has(id))
    if (missing.length) {
      throw createError({ statusCode: 400, statusMessage: `Unknown materialIds: ${missing.join(', ')}` })
    }
  }

  await prisma.$transaction(async (tx) => {
    if (!materialIds.length) {
      await tx.courseMaterial.deleteMany({ where: { courseId } })
      return
    }

    await tx.courseMaterial.deleteMany({
      where: { courseId, materialId: { notIn: materialIds } },
    })

    for (let i = 0; i < materialIds.length; i++) {
      const materialId = materialIds[i]!
      await tx.courseMaterial.upsert({
        where: { courseId_materialId: { courseId, materialId } },
        update: { position: i + 1 },
        create: { courseId, materialId, position: i + 1 },
      })
    }
  })

  return { ok: true }
})
