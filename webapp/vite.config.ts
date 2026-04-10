import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
  server: {
    proxy: {
      '/play': 'http://localhost:3001',
    },
  },
  define: {
    'import.meta.env.VITE_GAMEY_API_URL': JSON.stringify(''),
  },
})