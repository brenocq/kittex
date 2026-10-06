// Bundles core into the one ES module the Claude Code mod imports.
import { build } from 'esbuild'

const result = await build({
  entryPoints: ['core/src/index.ts'],
  outfile: 'plugin/hooks/core.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  conditions: ['import', 'default'],
  target: 'es2022',
  minify: true,
  legalComments: 'eof',
  metafile: true,
  logLevel: 'info',
})

const bytes = Object.values(result.metafile.outputs).reduce((n, o) => n + o.bytes, 0)
console.log(`core bundle: ${(bytes / 1024).toFixed(0)} KiB`)
