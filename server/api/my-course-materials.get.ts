import { createError, getQuery } from 'h3'
import { requireAuth } from '../utils/auth'
import { prisma } from '../utils/db'
import { toEnrollmentAccessDto } from '../utils/course-access'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const slug = typeof query.slug === 'string' ? query.slug.trim() : ''

  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Course slug is required' })

  const courseBase = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
    },
  })

  if (!courseBase) throw createError({ statusCode: 404, statusMessage: 'Course not found' })

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: courseBase.id } },
    select: { id: true, activatedAt: true, expiresAt: true },
  })

  if (!enrollment) throw createError({ statusCode: 403, statusMessage: 'You are not enrolled in this course' })

  const access = toEnrollmentAccessDto(enrollment)

  const renewalOptions = await prisma.courseRenewalOption.findMany({
    where: { courseId: courseBase.id, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { durationDays: 'asc' }, { priceCents: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      title: true,
      durationDays: true,
      priceCents: true,
      currency: true,
    },
  })

  if (access.isExpired) {
    return {
      locked: true,
      lockedReason: 'EXPIRED' as const,
      course: { id: courseBase.id, title: courseBase.title, slug: courseBase.slug },
      access,
      renewalOptions,
      materials: [] as any[],
    }
  }

  const course = await prisma.course.findUnique({
    where: { id: courseBase.id },
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

  return {
    course: { id: course.id, title: course.title, slug: course.slug },
    access,
    renewalOptions,
    materials: course.materials.map((row) => ({
      ...row.material,
      position: row.position,
    })),
  }
})
