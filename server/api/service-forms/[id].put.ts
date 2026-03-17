import { readBody, createError } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

const slugify = (value: string) => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 128)
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = event.context.params ?? {}
  const serviceFormId = Number(id)
  if (!Number.isFinite(serviceFormId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid service form id' })
  }

  const body = await readBody<{ title?: string; slug?: string; sortOrder?: number }>(event)
  const title = body.title?.trim()
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Service form title is required' })
  }

  const slug = (body.slug?.trim() ? body.slug.trim() : slugify(title)).toLowerCase()
  const sortOrderCandidate = Number(body.sortOrder ?? 0)
  const sortOrder = Number.isFinite(sortOrderCandidate) ? sortOrderCandidate : 0

  const updated = await prisma.serviceForm.update({
    where: { id: serviceFormId },
    data: { title, slug, sortOrder },
    select: { id: true, title: true, slug: true, sortOrder: true },
  })

  return updated
})

