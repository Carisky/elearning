import { prisma } from './db'

export const updateUserCourseProgress = async (userId: number, courseId: number) => {
  const requiredItems = await prisma.courseItem.findMany({
    where: { courseId, isRequired: true },
    select: { id: true },
  })

  const requiredItemIds = requiredItems.map((item) => item.id)
  const requiredTotal = requiredItemIds.length

  const completedRequired = requiredTotal
    ? await prisma.userCourseItemProgress.count({
        where: { userId, courseItemId: { in: requiredItemIds } },
      })
    : 0

  const progressPercent = requiredTotal ? Math.floor((completedRequired / requiredTotal) * 100) : 0
  const finished = requiredTotal > 0 && completedRequired >= requiredTotal

  const progress = await prisma.userCourseProgress.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {
      progressPercent,
      finished,
      finishedAt: finished ? new Date() : null,
    },
    create: {
      userId,
      courseId,
      progressPercent,
      finished,
      finishedAt: finished ? new Date() : null,
    },
    select: {
      progressPercent: true,
      finished: true,
      finishedAt: true,
      updatedAt: true,
    },
  })

  return progress
}

