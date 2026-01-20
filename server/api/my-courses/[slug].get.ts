import { createError } from 'h3'
import { requireAuth } from '../../utils/auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const slug = event.context.params?.slug

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Course slug is required' })
  }

  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      items: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          type: true,
          title: true,
          position: true,
          isRequired: true,
          chapter: { select: { contentJson: true } },
          assessment: {
            select: {
              minPassScore: true,
              attemptsLimit: true,
              timeLimitSec: true,
              questions: {
                orderBy: { position: 'asc' },
                select: {
                  id: true,
                  type: true,
                  text: true,
                  points: true,
                  position: true,
                  answers: {
                    orderBy: { position: 'asc' },
                    select: { id: true, text: true, position: true },
                  },
                },
              },
              attempts: {
                where: { userId: user.id },
                orderBy: { startedAt: 'desc' },
                take: 1,
                select: {
                  id: true,
                  startedAt: true,
                  finishedAt: true,
                  score: true,
                  passed: true,
                },
              },
            },
          },
        },
      },
      progress: {
        where: { userId: user.id },
        select: { progressPercent: true, finished: true, finishedAt: true, updatedAt: true },
      },
    },
  })

  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    select: { id: true },
  })

  if (!enrollment) {
    throw createError({ statusCode: 403, statusMessage: 'You are not enrolled in this course' })
  }

  const itemIds = course.items.map((item) => item.id)
  const itemProgress = itemIds.length
    ? await prisma.userCourseItemProgress.findMany({
        where: { userId: user.id, courseItemId: { in: itemIds } },
        select: { courseItemId: true, completedAt: true },
      })
    : []

  const completedItemIds = new Set(itemProgress.map((p) => p.courseItemId))

  const latestAttemptsByItemId = new Map<number, { id: number; score: number; passed: boolean; startedAt: string; finishedAt: string | null }>()
  for (const item of course.items) {
    const attempt = item.assessment?.attempts?.[0]
    if (attempt) {
      latestAttemptsByItemId.set(item.id, {
        id: attempt.id,
        score: attempt.score,
        passed: attempt.passed,
        startedAt: attempt.startedAt.toISOString(),
        finishedAt: attempt.finishedAt ? attempt.finishedAt.toISOString() : null,
      })
    }
  }

  return {
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
    },
    progress: course.progress[0] ?? { progressPercent: 0, finished: false, finishedAt: null, updatedAt: null },
    completedItemIds: Array.from(completedItemIds),
    latestAttemptsByItemId: Object.fromEntries(latestAttemptsByItemId.entries()),
    items: course.items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      position: item.position,
      isRequired: item.isRequired,
      chapterContent: item.chapter?.contentJson && typeof item.chapter.contentJson === 'object'
        ? (item.chapter.contentJson as any)?.body ?? null
        : null,
      assessment: item.assessment
        ? {
            minPassScore: item.assessment.minPassScore,
            attemptsLimit: item.assessment.attemptsLimit,
            timeLimitSec: item.assessment.timeLimitSec,
            questions: item.assessment.questions.map((q) => ({
              id: q.id,
              type: q.type,
              text: q.text,
              points: q.points,
              position: q.position,
              answers: q.answers.map((a) => ({ id: a.id, text: a.text, position: a.position })),
            })),
          }
        : null,
    })),
  }
})

