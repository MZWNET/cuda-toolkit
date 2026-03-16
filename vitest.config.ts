import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    globals: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['src/**'],
      exclude: ['dist/', 'node_modules/'],
      reportsDirectory: './coverage',
      reporter: ['json-summary', 'text', 'lcov'],
    },
    include: ['**/*.test.ts'],
    exclude: ['dist/', 'node_modules/'],
  },
})
