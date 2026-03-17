import { readBody, createError } from 'h3'
import { prisma } from '../utils/db'
import { requireAdmin } from '../utils/auth'

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

  const body = await readBody<{ title?: string; slug?: string; sortOrder?: number; categoryId?: number }>(event)

  const title = body.title?.trim()
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Subcategory title is required' })
  }

  const categoryId = Number(body.categoryId)
  if (!Number.isFinite(categoryId)) {
    throw createError({ statusCode: 400, statusMessage: 'categoryId is required' })
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { title: true } })
  if (!category) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid categoryId' })
  }

  const sortOrderCandidate = Number(body.sortOrder ?? 0)
  const sortOrder = Number.isFinite(sortOrderCandidate) ? sortOrderCandidate : 0

  const slug = (body.slug?.trim() ? body.slug.trim() : slugify(`${category.title}-${title}`)).toLowerCase()

  const created = await prisma.subcategory.create({
    data: { title, slug, sortOrder, categoryId },
    select: { id: true, categoryId: true, title: true, slug: true, sortOrder: true },
  })

  return created
})
