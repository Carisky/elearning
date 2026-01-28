import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

await setup({
  rootDir,
  server: true,
  browser: false,
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    STORAGE: process.env.STORAGE,
  },
})

