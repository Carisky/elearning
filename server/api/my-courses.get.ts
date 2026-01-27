import { requireAuth } from '../utils/auth'
import { prisma } from '../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    orderBy: { activatedAt: 'desc' },
    select: {
      activatedAt: true,
      expiresAt: true,
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          previewImageUrl: true,
          progress: {
            where: { userId: user.id },
            select: {
              progressPercent: true,
              finished: true,
              finishedAt: true,
            },
          },
          items: {
            where: { type: { in: ['QUIZ', 'EXAM'] } },
            orderBy: { position: 'asc' },
            select: {
              id: true,
              type: true,
              position: true,
              assessment: {
                select: {
                  questions: { select: { points: true } },
                  attempts: {
                    where: { userId: user.id },
                    orderBy: { startedAt: 'desc' },
                    take: 1,
                    select: { score: true, passed: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const toAttemptSummary = (item: (typeof enrollments)[number]['course']['items'][number] | undefined) => {
    if (!item?.assessment) return null
    const attempt = item.assessment.attempts?.[0] ?? null
    const totalPoints = item.assessment.questions.reduce((acc, q) => acc + (q.points ?? 0), 0)
    return {
      score: attempt?.score ?? null,
      totalPoints,
      passed: attempt?.passed ?? null,
    }
  }

  return enrollments.map((enrollment) => {
    const items = enrollment.course.items ?? []
    const preTestItem = items.find((i) => i.type === 'QUIZ')
    const postTestItem = [...items].reverse().find((i) => i.type === 'EXAM')

    return {
      activatedAt: enrollment.activatedAt,
      expiresAt: enrollment.expiresAt,
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        slug: enrollment.course.slug,
        previewImageUrl: enrollment.course.previewImageUrl,
      },
      progress: enrollment.course.progress[0] ?? { progressPercent: 0, finished: false, finishedAt: null },
      preTest: toAttemptSummary(preTestItem),
      postTest: toAttemptSummary(postTestItem),
    }
  })
})
