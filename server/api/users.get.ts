import { prisma } from '../utils/db'

export default defineEventHandler(async () => {
  // Fetch all registered users so the UI can render the list.
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
  })
})
