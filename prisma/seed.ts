import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient, UserRole } from './generated/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

const ADMIN_EMAIL = 'admin@example.com'
const USER_EMAIL = 'user@example.com'

async function main() {
  const adminPassword = await bcrypt.hash('admin', 10)
  const userPassword = await bcrypt.hash('user', 10)

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { password: adminPassword, role: UserRole.ADMIN },
    create: {
      email: ADMIN_EMAIL,
      name: 'Admin',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  })

  await prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: { password: userPassword, role: UserRole.USER },
    create: {
      email: USER_EMAIL,
      name: 'User',
      password: userPassword,
      role: UserRole.USER,
    },
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
