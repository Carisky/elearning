import { readBody, createError } from 'h3'
import { prisma } from '../utils/db'
import { requireAdmin } from '../utils/auth'

type AssessmentPayload = {
  minPassScore?: number
  attemptsLimit?: number
  timeLimitSec?: number
  shuffleQuestions?: boolean
  questions?: Array<{
    type?: 'SINGLE' | 'MULTI' | 'TEXT'
    text?: string
    points?: number
    position?: number
    answers?: Array<{
      text?: string
      isCorrect?: boolean
      position?: number
    }>
  }>
}

const isUniqueConstraintError = (error: any, fields: string[]) => {
  if (!error || typeof error !== 'object') return false
  if (error.code !== 'P2002') return false
  const target = error?.meta?.target
  if (Array.isArray(target)) return fields.every((f) => target.includes(f))
  if (typeof target === 'string') return fields.every((f) => target.includes(f))
  return false
}

const normalizeChapterContent = (value: unknown) => {
  if (typeof value === 'string') {
    const text = value
    if (!text.trim()) return null
    return { body: text }
  }
  if (value && typeof value === 'object') {
    return value
  }
  return null
}

const normalizeAssessmentPayload = (payload: AssessmentPayload | undefined) => {
  const p = payload ?? {}
  const rawQuestions = p.questions ?? []

  const questions = rawQuestions.map((q, index) => ({
    inputPosition: Number.isFinite(Number(q.position)) ? Number(q.position) : index,
    type: (q.type ?? 'SINGLE') as 'SINGLE' | 'MULTI' | 'TEXT',
    text: q.text?.trim() ?? '',
    points: Number.isFinite(Number(q.points ?? 1)) ? Number(q.points ?? 1) : 1,
    answers: (q.answers ?? []).map((a, aIndex) => ({
      inputPosition: Number.isFinite(Number(a.position)) ? Number(a.position) : aIndex,
      text: a.text?.trim() ?? '',
      isCorrect: Boolean(a.isCorrect),
    })),
  }))

  questions.sort((a, b) => a.inputPosition - b.inputPosition)

  const normalizedQuestions = questions.map((q, position) => ({
    type: q.type,
    text: q.text,
    points: q.points,
    position,
    answers: {
      create: q.answers
        .slice()
        .sort((a, b) => a.inputPosition - b.inputPosition)
        .map((a, idx) => ({
          text: a.text,
          isCorrect: a.isCorrect,
          position: idx,
        })),
    },
  }))

  const attemptsLimitCandidate = Number(p.attemptsLimit ?? 0)
  const attemptsLimit = Number.isFinite(attemptsLimitCandidate) && attemptsLimitCandidate > 0 ? attemptsLimitCandidate : null

  const timeLimitCandidate = Number(p.timeLimitSec ?? 0)
  const timeLimitSec = Number.isFinite(timeLimitCandidate) && timeLimitCandidate > 0 ? timeLimitCandidate : null

  const minPassScoreCandidate = Number(p.minPassScore ?? 0)
  const minPassScore = Number.isFinite(minPassScoreCandidate) ? minPassScoreCandidate : 0

  return {
    minPassScore,
    attemptsLimit,
    timeLimitSec,
    shuffleQuestions: Boolean(p.shuffleQuestions),
    questions: normalizedQuestions,
  }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<{
    courseId: number
    parentId?: number | null
    type: 'CHAPTER' | 'QUIZ' | 'EXAM'
    title: string
    position: number
    isRequired?: boolean
    chapterContent?: unknown
    assessment?: AssessmentPayload
  }>(event)

  if (!body.courseId || !body.title) {
    throw createError({ statusCode: 400, statusMessage: 'Course and title are required' })
  }

  if (!['CHAPTER', 'QUIZ', 'EXAM'].includes(body.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported course item type' })
  }

  const positionCandidate = Number(body.position ?? 0)
  const position = Number.isFinite(positionCandidate) ? positionCandidate : 0

  const parentIdCandidate = body.parentId === null || body.parentId === undefined ? null : Number(body.parentId)
  const parentId =
    parentIdCandidate === null
      ? null
      : Number.isFinite(parentIdCandidate)
        ? parentIdCandidate
        : null

  if (parentId !== null) {
    const parent = await prisma.courseItem.findUnique({
      where: { id: parentId },
      select: { id: true, courseId: true },
    })
    if (!parent || parent.courseId !== body.courseId) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid parentId' })
    }
  }

  let courseItem: { id: number } | null = null
  try {
    courseItem = await prisma.courseItem.create({
      data: {
        courseId: body.courseId,
        parentId,
        type: body.type,
        title: body.title.trim(),
        position,
        isRequired: body.isRequired ?? true,
      },
      select: { id: true },
    })
  } catch (error: any) {
    if (isUniqueConstraintError(error, ['courseId', 'position'])) {
      throw createError({ statusCode: 409, statusMessage: 'Position already used in this course' })
    }
    throw error
  }

  const chapterContentJson = body.type === 'CHAPTER' ? normalizeChapterContent(body.chapterContent) : null
  if (body.type === 'CHAPTER' && chapterContentJson) {
    await prisma.courseChapter.create({
      data: {
        courseItemId: courseItem.id,
        contentJson: chapterContentJson,
      },
    })
  }

  if (body.type === 'QUIZ' || body.type === 'EXAM') {
    const normalized = normalizeAssessmentPayload(body.assessment)

    await prisma.assessment.create({
      data: {
        courseItemId: courseItem!.id,
        minPassScore: normalized.minPassScore,
        attemptsLimit: normalized.attemptsLimit,
        timeLimitSec: normalized.timeLimitSec,
        shuffleQuestions: normalized.shuffleQuestions,
        questions: {
          create: normalized.questions,
        },
      },
    })
  }

  return prisma.courseItem.findUnique({
    where: { id: courseItem!.id },
    include: {
      parent: { select: { id: true, title: true, type: true } },
      chapter: true,
      assessment: {
        include: {
          questions: {
            include: {
              answers: true,
            },
            orderBy: {
              position: 'asc',
            },
          },
        },
      },
    },
  })
})
