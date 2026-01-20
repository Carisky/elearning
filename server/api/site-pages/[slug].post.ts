import { createError, getRouterParam, readBody } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }

  const body = await readBody<{ content?: unknown }>(event)
  if (!body || typeof body.content !== 'object' || body.content === null) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid content' })
  }

  const page = await prisma.sitePage.upsert({
    where: { slug },
    update: { content: body.content as any },
    create: { slug, content: body.content as any },
    select: { slug: true, content: true },
  })

  return page
})

