import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { Client } from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const createSchemaName = () =>
  `test_${Date.now()}_${randomUUID().slice(0, 8)}`.replace(/-/g, '_')

const quoteIdent = (value: string) => `"${value.replaceAll('"', '""')}"`

export default async () => {
  dotenv.config({ path: path.join(rootDir, '.env') })

  const baseDatabaseUrl = process.env.DATABASE_URL
  if (!baseDatabaseUrl) {
    throw new Error('DATABASE_URL is not set. Ensure .env exists and postgres is running.')
  }

  const schema = createSchemaName()

  try {
    const client = new Client({ connectionString: baseDatabaseUrl })
    await client.connect()
    await client.query(`CREATE SCHEMA ${quoteIdent(schema)}`)
    await client.end()
  } catch (error: any) {
    const message = error?.message ? ` (${error.message})` : ''
    throw new Error(
      `Cannot connect to postgres to create test schema.${message}\n` +
      `Start DB with: npm run docker:up\n` +
      `Current DATABASE_URL: ${baseDatabaseUrl}`
    )
  }

  const testDbUrl = (() => {
    const url = new URL(baseDatabaseUrl)
    // Prisma Migrate uses `schema=...` for Postgres schemas.
    url.searchParams.set('schema', schema)
    // App runtime uses @prisma/adapter-pg which relies on pg connection options.
    // Setting search_path ensures queries go to the test schema.
    url.searchParams.set('options', `-c search_path=${schema}`)
    return url.toString()
  })()

  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = testDbUrl
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
  process.env.STORAGE = process.env.STORAGE || path.join(rootDir, '.storage-test')
  process.env.MAIL_TRANSPORT = 'noop'

  execSync('npx prisma migrate deploy --config prisma.config.ts', {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
    },
  })

  return async () => {
    const client = new Client({ connectionString: baseDatabaseUrl })
    await client.connect()
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdent(schema)} CASCADE`)
    await client.end()
  }
}
