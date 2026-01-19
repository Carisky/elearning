import { readBody, createError } from 'h3'
import { prisma } from '../utils/db'
import { requireAdmin } from '../utils/auth'

const createSlug = (value: string) => {
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

  const body = await readBody<{ title: string; slug?: string; sortOrder?: number }>(event)

  if (!body.title) {
    throw createError({ statusCode: 400, statusMessage: 'Category title is required' })
  }

  const slug =
    (body.slug?.trim() ? body.slug : createSlug(body.title)).toLowerCase()

  const sortOrderCandidate = Number(body.sortOrder ?? 0)
  const sortOrder = Number.isFinite(sortOrderCandidate) ? sortOrderCandidate : 0

  const category = await prisma.category.create({
    data: {
      title: body.title.trim(),
      slug,
      sortOrder,
    },
  })

  return {
    id: category.id,
    title: category.title,
    slug: category.slug,
    sortOrder: category.sortOrder,
  }
})
