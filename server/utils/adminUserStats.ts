import { prisma } from './db'

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const averagePercent = (values: number[]) => {
  if (!values.length) return 0
  return clampPercent(values.reduce((sum, value) => sum + value, 0) / values.length)
}

const examAttemptPercent = (score: number, totalPoints: number) => {
  if (totalPoints <= 0) return 0
  return clampPercent((score / totalPoints) * 100)
}

export const getAdminUserStats = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) return null

  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    orderBy: { activatedAt: 'desc' },
    select: {
      activatedAt: true,
      expiresAt: true,
      source: true,
      course: {
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
              userProgress: {
                where: { userId },
                select: { completedAt: true },
              },
              userReadProgress: {
                where: { userId },
                select: { readPercent: true, updatedAt: true },
              },
              assessment: {
                select: {
                  minPassScore: true,
                  questions: {
                    select: { points: true },
                  },
                  attempts: {
                    where: { userId },
                    orderBy: { startedAt: 'desc' },
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
        },
      },
    },
  })

  const courses = enrollments.map((enrollment) => {
    const requiredItems = enrollment.course.items.filter((item) => item.isRequired)
    const completedItems = requiredItems.filter((item) => item.userProgress.length > 0)
    const requiredChapters = requiredItems.filter((item) => item.type === 'CHAPTER')

    const itemProgressUnits = requiredItems.map((item) => {
      if (item.userProgress.length > 0) return 1
      if (item.type !== 'CHAPTER') return 0

      const readPercent = item.userReadProgress[0]?.readPercent ?? 0
      return clampPercent(readPercent) / 100
    })

    const progressPercent = requiredItems.length
      ? Math.floor((itemProgressUnits.reduce((sum, value) => sum + value, 0) / requiredItems.length) * 100)
      : 0

    const materialReadPercent = averagePercent(
      requiredChapters.map((item) => {
        if (item.userProgress.length > 0) return 100
        return item.userReadProgress[0]?.readPercent ?? 0
      }),
    )

    const latestActivityAt = [
      ...enrollment.course.items.flatMap((item) => item.userProgress.map((progress) => progress.completedAt)),
      ...enrollment.course.items.flatMap((item) => item.userReadProgress.map((progress) => progress.updatedAt)),
      ...enrollment.course.items.flatMap((item) => item.assessment?.attempts.map((attempt) => attempt.startedAt) ?? []),
      enrollment.activatedAt,
    ].sort((a, b) => b.getTime() - a.getTime())[0] ?? enrollment.activatedAt

    const finished = requiredItems.length > 0 && completedItems.length >= requiredItems.length

    const exams = enrollment.course.items
      .filter((item) => item.type === 'EXAM' && item.assessment)
      .map((item) => {
        const attempts = item.assessment?.attempts ?? []
        const latestAttempt = attempts[0] ?? null
        const totalPoints = item.assessment?.questions.reduce((sum, question) => sum + question.points, 0) ?? 0

        return {
          itemId: item.id,
          title: item.title,
          minPassScore: item.assessment?.minPassScore ?? 0,
          attemptsCount: attempts.length,
          passedAttempts: attempts.filter((attempt) => attempt.passed).length,
          failedAttempts: attempts.filter((attempt) => !attempt.passed).length,
          latestAttempt: latestAttempt
            ? {
                id: latestAttempt.id,
                score: latestAttempt.score,
                totalPoints,
                percent: examAttemptPercent(latestAttempt.score, totalPoints),
                passed: latestAttempt.passed,
                startedAt: latestAttempt.startedAt,
                finishedAt: latestAttempt.finishedAt,
              }
            : null,
        }
      })

    return {
      id: enrollment.course.id,
      title: enrollment.course.title,
      slug: enrollment.course.slug,
      activatedAt: enrollment.activatedAt,
      expiresAt: enrollment.expiresAt,
      source: enrollment.source,
      progressPercent,
      materialReadPercent,
      finished,
      finishedAt: finished ? latestActivityAt : null,
      latestActivityAt,
      requiredItemsCount: requiredItems.length,
      completedItemsCount: completedItems.length,
      exams,
    }
  })

  const currentCourses = courses.filter((course) => !course.finished && course.progressPercent > 0)
  const currentCourse = [...(currentCourses.length ? currentCourses : courses.filter((course) => !course.finished))]
    .sort((a, b) => b.latestActivityAt.getTime() - a.latestActivityAt.getTime())[0] ?? null

  const passedExams = courses.reduce(
    (sum, course) => sum + course.exams.filter((exam) => exam.latestAttempt?.passed).length,
    0,
  )
  const failedExams = courses.reduce(
    (sum, course) => sum + course.exams.filter((exam) => exam.latestAttempt && !exam.latestAttempt.passed).length,
    0,
  )

  return {
    user,
    summary: {
      enrolledCourses: courses.length,
      completedCourses: courses.filter((course) => course.finished).length,
      currentCourses: currentCourses.length,
      passedExams,
      failedExams,
      averageCourseProgress: averagePercent(courses.map((course) => course.progressPercent)),
      materialReadPercent: averagePercent(courses.map((course) => course.materialReadPercent)),
    },
    currentCourse: currentCourse
      ? {
          id: currentCourse.id,
          title: currentCourse.title,
          slug: currentCourse.slug,
          progressPercent: currentCourse.progressPercent,
          materialReadPercent: currentCourse.materialReadPercent,
          latestActivityAt: currentCourse.latestActivityAt,
        }
      : null,
    courses,
  }
}
