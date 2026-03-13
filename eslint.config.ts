import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['**/coverage', '**/dist', '**/linter', '**/node_modules', '**/.licenses'],
  formatters: true,
  typescript: {
    tsconfigPath: 'tsconfig.json',
  },
  rules: {
    'ts/no-explicit-any': 'error',
  },
})
