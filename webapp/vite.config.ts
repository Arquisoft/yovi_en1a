import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
  server: {
    proxy: {
      '/play': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // In dev mode (local + CI): use empty string so requests go through Vite's proxy
  // In production (Docker build): don't override, let env var or fallback work
  define: mode === 'development' ? {
    'import.meta.env.VITE_GAMEY_API_URL': JSON.stringify(''),
  } : {},
}))