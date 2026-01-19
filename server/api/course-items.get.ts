import { getQuery } from 'h3'
import { prisma } from '../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const courseId = query.courseId ? Number(query.courseId) : undefined
  const where = courseId && !Number.isNaN(courseId) ? { courseId } : {}

  return prisma.courseItem.findMany({
    where,
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
    orderBy: {
      position: 'asc',
    },
  })
})
