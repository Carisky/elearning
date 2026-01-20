import { createError, readBody } from 'h3'
import { requireAuth } from '../utils/auth'
import { prisma } from '../utils/db'
import { updateUserCourseProgress } from '../utils/progress'

type AnswerPayload = Record<string, number | number[] | string | null | undefined>

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<{ courseItemId?: number; answers?: AnswerPayload }>(event)

  const courseItemId = Number(body?.courseItemId)
  if (!Number.isFinite(courseItemId)) {
    throw createError({ statusCode: 400, statusMessage: 'courseItemId is required' })
  }

  const courseItem = await prisma.courseItem.findUnique({
    where: { id: courseItemId },
    select: {
      id: true,
      courseId: true,
      type: true,
      assessment: {
        select: {
          courseItemId: true,
          minPassScore: true,
          attemptsLimit: true,
          questions: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              type: true,
              text: true,
              points: true,
              answers: { select: { id: true, isCorrect: true } },
            },
          },
        },
      },
    },
  })

  if (!courseItem || !courseItem.assessment) {
    throw createError({ statusCode: 404, statusMessage: 'Assessment not found' })
  }

  if (courseItem.type !== 'QUIZ' && courseItem.type !== 'EXAM') {
    throw createError({ statusCode: 400, statusMessage: 'Course item is not an assessment' })
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: courseItem.courseId } },
    select: { id: true },
  })

  if (!enrollment) {
    throw createError({ statusCode: 403, statusMessage: 'You are not enrolled in this course' })
  }

  if (courseItem.type === 'EXAM') {
    const alreadyPassed = await prisma.assessmentAttempt.findFirst({
      where: { userId: user.id, assessmentId: courseItem.assessment.courseItemId, passed: true },
      select: { id: true },
    })
    if (alreadyPassed) {
      throw createError({ statusCode: 400, statusMessage: 'Exam already passed' })
    }
  }

  if (courseItem.assessment.attemptsLimit != null) {
    const attemptsCount = await prisma.assessmentAttempt.count({
      where: { userId: user.id, assessmentId: courseItem.assessment.courseItemId },
    })
    if (attemptsCount >= courseItem.assessment.attemptsLimit) {
      throw createError({ statusCode: 400, statusMessage: 'Attempts limit reached' })
    }
  }

  const answers = body?.answers ?? {}
  const createdAt = new Date()

  let score = 0
  let correctQuestions = 0
  let wrongQuestions = 0
  let skippedQuestions = 0

  const attemptAnswers: Array<{
    questionId: number
    answerId?: number | null
    textAnswer?: string | null
    isCorrect: boolean
    pointsAwarded: number
  }> = []

  const totalPoints = courseItem.assessment.questions.reduce((acc, q) => acc + (q.points ?? 0), 0)

  for (const question of courseItem.assessment.questions) {
    const key = String(question.id)
    const raw = answers[key]

    if (question.type === 'SINGLE') {
      const answerId = raw == null ? null : Number(raw)
      if (!answerId || !Number.isFinite(answerId)) {
        skippedQuestions += 1
        attemptAnswers.push({ questionId: question.id, answerId: null, textAnswer: null, isCorrect: false, pointsAwarded: 0 })
        continue
      }

      const isCorrect = question.answers.some((a) => a.id === answerId && a.isCorrect)
      const pointsAwarded = isCorrect ? question.points : 0
      score += pointsAwarded
      if (isCorrect) correctQuestions += 1
      else wrongQuestions += 1

      attemptAnswers.push({ questionId: question.id, answerId, textAnswer: null, isCorrect, pointsAwarded })
      continue
    }

    if (question.type === 'MULTI') {
      const selectedIds = Array.isArray(raw)
        ? raw.map((v) => Number(v)).filter((v) => Number.isFinite(v))
        : []
      const uniqueSelected = Array.from(new Set(selectedIds))
      const correctIds = question.answers.filter((a) => a.isCorrect).map((a) => a.id).sort((a, b) => a - b)
      const selectedSorted = uniqueSelected.slice().sort((a, b) => a - b)
      const isCorrect = correctIds.length > 0
        && correctIds.length === selectedSorted.length
        && correctIds.every((id, idx) => id === selectedSorted[idx])
      const pointsAwarded = isCorrect ? question.points : 0
      score += pointsAwarded
      if (uniqueSelected.length === 0) skippedQuestions += 1
      else if (isCorrect) correctQuestions += 1
      else wrongQuestions += 1

      if (uniqueSelected.length === 0) {
        attemptAnswers.push({ questionId: question.id, answerId: null, textAnswer: null, isCorrect: false, pointsAwarded: 0 })
      } else {
        uniqueSelected.forEach((answerId, index) => {
          attemptAnswers.push({
            questionId: question.id,
            answerId,
            textAnswer: null,
            isCorrect,
            pointsAwarded: index === 0 ? pointsAwarded : 0,
          })
        })
      }
      continue
    }

    // TEXT
    const textAnswer = typeof raw === 'string' ? raw.trim() : ''
    if (!textAnswer) {
      skippedQuestions += 1
    } else {
      wrongQuestions += 1
    }
    attemptAnswers.push({
      questionId: question.id,
      answerId: null,
      textAnswer: textAnswer || null,
      isCorrect: false,
      pointsAwarded: 0,
    })
  }

  const passed = score >= (courseItem.assessment.minPassScore ?? 0)
  const percent = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0

  const attempt = await prisma.assessmentAttempt.create({
    data: {
      userId: user.id,
      assessmentId: courseItem.assessment.courseItemId,
      startedAt: createdAt,
      finishedAt: createdAt,
      score,
      passed,
      answers: { create: attemptAnswers },
    },
    select: { id: true },
  })

  let progress = null as null | { progressPercent: number; finished: boolean; finishedAt: Date | null; updatedAt: Date }
  if (passed) {
    await prisma.userCourseItemProgress.upsert({
      where: { userId_courseItemId: { userId: user.id, courseItemId } },
      update: {},
      create: { userId: user.id, courseItemId },
      select: { id: true },
    })
    progress = await updateUserCourseProgress(user.id, courseItem.courseId)
  }

  return {
    ok: true,
    attemptId: attempt.id,
    score,
    totalPoints,
    percent,
    passed,
    stats: {
      questions: courseItem.assessment.questions.length,
      correct: correctQuestions,
      wrong: wrongQuestions,
      skipped: skippedQuestions,
    },
    progress,
  }
})
