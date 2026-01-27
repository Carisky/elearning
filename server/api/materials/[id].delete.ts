import { createError } from 'h3'
import { unlink } from 'node:fs/promises'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'
import { resolveStoragePath } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = Number(event.context.params?.id)
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const material = await prisma.material.findUnique({
    where: { id },
    select: { storageKey: true },
  })

  await prisma.material.delete({ where: { id } })

  if (material?.storageKey) {
    const abs = resolveStoragePath(material.storageKey)
    await unlink(abs).catch(() => {})
  }

  return { ok: true }
})
