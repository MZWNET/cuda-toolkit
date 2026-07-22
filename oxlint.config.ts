import oxlint from '@mzwing/oxc-config'

export default oxlint({
  // ignores: ['**/coverage', '**/dist', '**/linter', '**/node_modules', '**/.licenses', 'scripts/**'],
  typescript: true,
  rules: {
    'ts/no-explicit-any': 'error',
  },
})
