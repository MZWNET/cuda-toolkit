import { build, context } from 'esbuild'

const watch = process.argv.includes('--watch')

const options = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.mjs',
  treeShaking: true,
  minify: true,
  sourcemap: true,
  tsconfig: 'tsconfig.build.json',
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
}

if (watch) {
  const ctx = await context(options)
  await ctx.watch()
  console.log('Watching...')
}
else {
  await build(options)
}
