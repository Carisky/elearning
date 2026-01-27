import { createError, getQuery } from 'h3'
import { requireAuth } from '../utils/auth'
import { prisma } from '../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const slug = typeof query.slug === 'string' ? query.slug.trim() : ''

  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Course slug is required' })

  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      materials: {
        orderBy: [{ position: 'asc' }, { addedAt: 'asc' }],
        select: {
          position: true,
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
      },
    },
  })

  if (!course) throw createError({ statusCode: 404, statusMessage: 'Course not found' })

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    select: { id: true },
  })

  if (!enrollment) throw createError({ statusCode: 403, statusMessage: 'You are not enrolled in this course' })

  return {
    course: { id: course.id, title: course.title, slug: course.slug },
    materials: course.materials.map((row) => ({
      ...row.material,
      position: row.position,
    })),
  }
})

