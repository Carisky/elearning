import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const now = new Date()
  const [
    users,
    courses,
    orders,
    enrollments,
    paidOrderAggregate,
    pendingReviews,
    pendingCourseReviews,
    activeInvites,
    latestOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.order.count(),
    prisma.enrollment.count(),
    prisma.order.aggregate({
      where: { status: 'PAID' },
      _sum: { totalCents: true },
    }),
    prisma.review.count({ where: { status: 'PENDING' } }),
    prisma.courseReview.count({ where: { status: 'PENDING' } }),
    prisma.userInvite.count({
      where: {
        expiresAt: { gt: now },
        accessGrantedAt: null,
        declinedAt: null,
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        totalCents: true,
        currency: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    }),
  ])

  return {
    users,
    courses,
    orders,
    enrollments,
    revenueCents: paidOrderAggregate._sum.totalCents ?? 0,
    pendingReviews: pendingReviews + pendingCourseReviews,
    activeInvites,
    latestOrders: latestOrders.map((order) => ({
      id: order.id,
      status: order.status,
      totalCents: order.totalCents,
      currency: order.currency,
      createdAt: order.createdAt,
      user: order.user,
    })),
  }
})
