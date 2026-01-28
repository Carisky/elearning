import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../prisma/generated/client'

const parseSchemaFromDatabaseUrl = (databaseUrl: string): string | undefined => {
  try {
    const url = new URL(databaseUrl)
    const schema = url.searchParams.get('schema')?.trim()
    return schema || undefined
  } catch {
    return undefined
  }
}

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL!
  const schema = parseSchemaFromDatabaseUrl(connectionString)
  const pool = new PrismaPg({ connectionString }, schema ? { schema } : undefined)
  return new PrismaClient({ adapter: pool })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
