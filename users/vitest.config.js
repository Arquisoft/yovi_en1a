import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'lcov'],
    },
    env: { NODE_ENV: 'test' }
  },
})
