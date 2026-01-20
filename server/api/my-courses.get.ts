import { requireAuth } from '../utils/auth'
import { prisma } from '../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    orderBy: { activatedAt: 'desc' },
    select: {
      activatedAt: true,
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  })
  return enrollments.map((enrollment) => ({
    activatedAt: enrollment.activatedAt,
    course: enrollment.course,
  }))
})

