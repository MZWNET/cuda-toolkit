import { isBuiltin } from 'node:module'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  outDir: 'dist',
  format: 'esm',
  platform: 'node',
  fixedExtension: false,
  sourcemap: true,
  clean: true,
  deps: {
    alwaysBundle: id => !isBuiltin(id),
    onlyBundle: false,
  },
})
