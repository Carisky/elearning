import { requireAuth } from '../utils/auth'
import { prisma } from '../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const latestProgress = await prisma.userCourseProgress.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: { course: { select: { slug: true } } },
  })

  if (latestProgress?.course?.slug) {
    return { slug: latestProgress.course.slug }
  }

  const latestEnrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id },
    orderBy: { activatedAt: 'desc' },
    select: { course: { select: { slug: true } } },
  })

  return { slug: latestEnrollment?.course?.slug ?? null }
})

