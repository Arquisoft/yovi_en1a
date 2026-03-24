import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

// Load env vars from the project root (.env), not hardcoded
const parentEnv = loadEnv('test', '..', '');

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'lcov'],
    },
    env: { NODE_ENV: 'test', JWT_SECRET: parentEnv.JWT_SECRET }
  },
})
