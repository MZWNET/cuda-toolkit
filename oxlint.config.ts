import oxlint from '@mzwing/oxc-config'

export default oxlint({
  type: 'lib',
  ignores: ['**/dist'],
  typescript: true,
})
