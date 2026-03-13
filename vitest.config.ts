import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['src/**'],
      exclude: ['node_modules/', 'dist/'],
      reportsDirectory: './coverage',
      reporter: ['json-summary', 'text', 'lcov'],
    },
    include: ['**/*.test.ts'],
    exclude: ['dist/', 'node_modules/'],
  },
})
