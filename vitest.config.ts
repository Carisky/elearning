import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    maxWorkers: 4,
    minWorkers: 4,
    maxConcurrency: 1,
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
})

