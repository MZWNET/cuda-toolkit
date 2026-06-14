import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['**/coverage', '**/dist', '**/linter', '**/node_modules', '**/.licenses', 'scripts/**'],
  formatters: true,
  typescript: true,
  rules: {
    'ts/no-explicit-any': 'error',
  },
})
