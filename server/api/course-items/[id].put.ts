import { readBody, createError } from 'h3'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'

type AssessmentPayload = {
  minPassScore?: number
  attemptsLimit?: number | null
  timeLimitSec?: number | null
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

  const attemptsLimitCandidate = payload?.attemptsLimit === null ? null : Number(p.attemptsLimit ?? 0)
  const attemptsLimit =
    attemptsLimitCandidate === null
      ? null
      : Number.isFinite(attemptsLimitCandidate) && attemptsLimitCandidate > 0
        ? attemptsLimitCandidate
        : null

  const timeLimitCandidate = payload?.timeLimitSec === null ? null : Number(p.timeLimitSec ?? 0)
  const timeLimitSec =
    timeLimitCandidate === null
      ? null
      : Number.isFinite(timeLimitCandidate) && timeLimitCandidate > 0
        ? timeLimitCandidate
        : null

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
  const { id } = event.context.params ?? {}
  const courseItemId = Number(id)
  if (!Number.isFinite(courseItemId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid course item id' })
  }

  const body = await readBody<{
    title?: string
    position?: number
    isRequired?: boolean
    parentId?: number | null
    chapterContent?: unknown
    assessment?: AssessmentPayload
  }>(event)

  const existing = await prisma.courseItem.findUnique({
    where: { id: courseItemId },
    select: { id: true, courseId: true, type: true },
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Course item not found' })
  }

  const updateData: Record<string, any> = {}
  if (body.title?.trim()) updateData.title = body.title.trim()
  if (body.position !== undefined) {
    const positionCandidate = Number(body.position)
    updateData.position = Number.isFinite(positionCandidate) ? positionCandidate : 0
  }
  if (body.isRequired !== undefined) updateData.isRequired = Boolean(body.isRequired)

  if (body.parentId !== undefined) {
    const parentIdCandidate = body.parentId === null ? null : Number(body.parentId)
    if (parentIdCandidate === null) {
      updateData.parentId = null
    } else if (!Number.isFinite(parentIdCandidate)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid parentId' })
    } else if (parentIdCandidate === courseItemId) {
      throw createError({ statusCode: 400, statusMessage: 'parentId cannot reference itself' })
    } else {
      const parent = await prisma.courseItem.findUnique({
        where: { id: parentIdCandidate },
        select: { id: true, courseId: true },
      })
      if (!parent || parent.courseId !== existing.courseId) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid parentId' })
      }
      updateData.parentId = parentIdCandidate
    }
  }

  const shouldUpdateChapter = existing.type === 'CHAPTER' && body.chapterContent !== undefined
  const shouldUpdateAssessment = (existing.type === 'QUIZ' || existing.type === 'EXAM') && body.assessment !== undefined

  if (!Object.keys(updateData).length && !shouldUpdateChapter && !shouldUpdateAssessment) {
    throw createError({ statusCode: 400, statusMessage: 'No data to update' })
  }

  const result = await prisma.$transaction(async (tx) => {
    let updated: any
    if (Object.keys(updateData).length) {
      try {
        updated = await tx.courseItem.update({ where: { id: courseItemId }, data: updateData })
      } catch (error: any) {
        if (isUniqueConstraintError(error, ['courseId', 'position'])) {
          throw createError({ statusCode: 409, statusMessage: 'Position already used in this course' })
        }
        throw error
      }
    } else {
      updated = await tx.courseItem.findUniqueOrThrow({ where: { id: courseItemId } })
    }

    if (shouldUpdateChapter) {
      const contentJson = normalizeChapterContent(body.chapterContent)
      if (contentJson) {
        await tx.courseChapter.upsert({
          where: { courseItemId },
          update: { contentJson },
          create: { courseItemId, contentJson },
        })
      } else {
        await tx.courseChapter.deleteMany({ where: { courseItemId } })
      }
    }

    if (shouldUpdateAssessment) {
      const normalized = normalizeAssessmentPayload(body.assessment)

      await tx.assessment.upsert({
        where: { courseItemId },
        update: {
          minPassScore: normalized.minPassScore,
          attemptsLimit: normalized.attemptsLimit,
          timeLimitSec: normalized.timeLimitSec,
          shuffleQuestions: normalized.shuffleQuestions,
        },
        create: {
          courseItemId,
          minPassScore: normalized.minPassScore,
          attemptsLimit: normalized.attemptsLimit,
          timeLimitSec: normalized.timeLimitSec,
          shuffleQuestions: normalized.shuffleQuestions,
        },
      })

      await tx.assessmentQuestion.deleteMany({ where: { assessmentId: courseItemId } })

      for (const q of normalized.questions) {
        await tx.assessmentQuestion.create({
          data: {
            assessmentId: courseItemId,
            type: q.type,
            text: q.text,
            points: q.points,
            position: q.position,
            answers: { create: q.answers.create },
          },
        })
      }
    }

    return updated
  })

  return prisma.courseItem.findUnique({
    where: { id: result.id },
    include: {
      parent: { select: { id: true, title: true, type: true } },
      chapter: true,
      assessment: {
        include: {
          questions: { include: { answers: true }, orderBy: { position: 'asc' } },
        },
      },
    },
  })
})
