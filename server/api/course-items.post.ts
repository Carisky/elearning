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

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<{
    courseId: number
    type: 'CHAPTER' | 'QUIZ' | 'EXAM'
    title: string
    position: number
    isRequired?: boolean
    chapterContent?: string
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

  const courseItem = await prisma.courseItem.create({
    data: {
      courseId: body.courseId,
      type: body.type,
      title: body.title.trim(),
      position,
      isRequired: body.isRequired ?? true,
    },
  })

  if (body.type === 'CHAPTER' && body.chapterContent) {
    await prisma.courseChapter.create({
      data: {
        courseItemId: courseItem.id,
        contentJson: { body: body.chapterContent },
      },
    })
  }

  if (body.type === 'QUIZ' || body.type === 'EXAM') {
    const assessmentPayload = body.assessment ?? {}
    const questions = (assessmentPayload.questions ?? []).map((question, index) => {
      const questionPosition = Number.isFinite(Number(question.position ?? index))
        ? Number(question.position ?? index)
        : index

      const answers = (question.answers ?? []).map((answer, answerIndex) => {
        const answerPosition = Number.isFinite(Number(answer.position ?? answerIndex))
          ? Number(answer.position ?? answerIndex)
          : answerIndex

        return {
          text: answer.text?.trim() ?? '',
          isCorrect: Boolean(answer.isCorrect),
          position: answerPosition,
        }
      })

      return {
        type: question.type ?? 'SINGLE',
        text: question.text?.trim() ?? '',
        points: Number.isFinite(Number(question.points ?? 1)) ? Number(question.points ?? 1) : 1,
        position: questionPosition,
        answers: {
          create: answers,
        },
      }
    })

    await prisma.assessment.create({
      data: {
        courseItemId: courseItem.id,
        minPassScore: Number.isFinite(Number(assessmentPayload.minPassScore ?? 0))
          ? Number(assessmentPayload.minPassScore ?? 0)
          : 0,
        attemptsLimit: Number.isFinite(Number(assessmentPayload.attemptsLimit ?? 0))
          ? Number(assessmentPayload.attemptsLimit ?? 0)
          : null,
        timeLimitSec: Number.isFinite(Number(assessmentPayload.timeLimitSec ?? 0))
          ? Number(assessmentPayload.timeLimitSec ?? 0)
          : null,
        shuffleQuestions: Boolean(assessmentPayload.shuffleQuestions),
        questions: {
          create: questions,
        },
      },
    })
  }

  return prisma.courseItem.findUnique({
    where: { id: courseItem.id },
    include: {
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
