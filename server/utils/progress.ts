import { prisma } from './db'

export const updateUserCourseProgress = async (userId: number, courseId: number) => {
  const requiredItems = await prisma.courseItem.findMany({
    where: { courseId, isRequired: true },
    select: { id: true, type: true },
  })

  const requiredItemIds = requiredItems.map((item) => item.id)
  const requiredTotal = requiredItemIds.length

  const completedRows = requiredTotal
    ? await prisma.userCourseItemProgress.findMany({
        where: { userId, courseItemId: { in: requiredItemIds } },
        select: { courseItemId: true },
      })
    : []

  const completedRequiredSet = new Set(completedRows.map((row) => row.courseItemId))
  const completedRequired = completedRequiredSet.size

  const requiredChapterIds = requiredItems
    .filter((item) => item.type === 'CHAPTER')
    .map((item) => item.id)

  const chapterReadRows = requiredChapterIds.length
    ? await prisma.userCourseItemReadProgress.findMany({
        where: { userId, courseItemId: { in: requiredChapterIds } },
        select: { courseItemId: true, readPercent: true },
      })
    : []

  const chapterReadMap = new Map<number, number>(
    chapterReadRows.map((row) => [row.courseItemId, row.readPercent]),
  )

  let completedFraction = 0
  for (const item of requiredItems) {
    if (completedRequiredSet.has(item.id)) {
      completedFraction += 1
      continue
    }

    if (item.type === 'CHAPTER') {
      const readPercent = chapterReadMap.get(item.id) ?? 0
      completedFraction += Math.max(0, Math.min(100, readPercent)) / 100
    }
  }

  const progressPercent = requiredTotal ? Math.floor((completedFraction / requiredTotal) * 100) : 0
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
