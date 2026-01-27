import { createError, readBody } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

const clampString = (value: unknown, maxLen: number) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed
}

const normalizeType = (value: unknown): 'PDF' | 'VIDEO' | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return null
  const upper = value.trim().toUpperCase()
  return upper === 'PDF' || upper === 'VIDEO' ? upper : null
}

const normalizeDurationSec = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  const rounded = Math.round(num)
  if (rounded <= 0) return null
  return rounded
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = Number(event.context.params?.id)
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const body = await readBody<{
    title?: unknown
    type?: unknown
    url?: unknown
    description?: unknown
    thumbnailUrl?: unknown
    durationSec?: unknown
  }>(event)

  const title = clampString(body?.title, 160) || null
  const type = normalizeType(body?.type)
  const url = clampString(body?.url, 2048) || null
  const description = clampString(body?.description, 2000) || null
  const thumbnailUrl = clampString(body?.thumbnailUrl, 2048) || null
  const durationSec =
    body?.durationSec === null || body?.durationSec === undefined || body?.durationSec === ''
      ? null
      : normalizeDurationSec(body?.durationSec)

  const updated = await prisma.material.update({
    where: { id },
    data: {
      ...(title !== null ? { title } : {}),
      ...(type ? { type } : {}),
      ...(url !== null ? { url } : {}),
      description,
      thumbnailUrl,
      durationSec,
    },
    select: {
      id: true,
      title: true,
      type: true,
      url: true,
      description: true,
      thumbnailUrl: true,
      durationSec: true,
      updatedAt: true,
    },
  })

  return updated
})
