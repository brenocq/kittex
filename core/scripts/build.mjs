// Bundles core into the ES modules the Claude Code mod imports. Claude Code
// refuses to read any plugin file over 1 MiB, so the bundle is split:
// plugin/hooks/core.js plus parts under plugin/hooks/core-parts/, joined by
// static imports (the engine refuses a module holding a dynamic import()).
import { rmSync } from 'node:fs'
import { basename, join } from 'node:path'
import { build } from 'esbuild'

const OUT = 'plugin/hooks'
const PARTS = 'core-parts'
/** Claude Code reads plugin files up to 1 MiB (1,048,576 bytes); stay well under it. */
const MAX_FILE_BYTES = 900 * 1024
/** Source modules that minify to more than this become entry points, so each lands in a file of its own. */
const SPLIT_INPUT_BYTES = 96 * 1024

const common = {
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  conditions: ['import', 'default'],
  target: 'es2022',
  minify: true,
  legalComments: 'eof',
  logLevel: 'warning',
}

// First pass, unsplit, to find the large modules.
const probe = await build({ ...common, entryPoints: ['core/src/index.ts'], write: false, metafile: true, outfile: 'core.js' })
const inputs = Object.values(probe.metafile.outputs)[0].inputs
const large = Object.entries(inputs)
  .filter(([, input]) => input.bytesInOutput > SPLIT_INPUT_BYTES)
  .map(([path]) => path)

// The typeset module and MathJax's TeX input and SVG output are entry points
// too, so MathJax's own code leaves core.js in a few part files.
const entryPoints = {
  core: 'core/src/index.ts',
  [`${PARTS}/typeset`]: 'core/src/typeset/index.ts',
  [`${PARTS}/mathjax-tex`]: '@mathjax/src/js/input/tex.js',
  [`${PARTS}/mathjax-svg`]: '@mathjax/src/js/output/svg.js',
}
for (const [i, path] of large.entries()) entryPoints[`${PARTS}/${i}-${basename(path).replace(/\.[^.]+$/, '')}`] = path

rmSync(join(OUT, PARTS), { recursive: true, force: true })
const result = await build({ ...common, entryPoints, splitting: true, outdir: OUT, chunkNames: `${PARTS}/[name]-[hash]`, metafile: true })

let total = 0
let failed = false
for (const [file, output] of Object.entries(result.metafile.outputs)) {
  total += output.bytes
  if (output.bytes > MAX_FILE_BYTES) {
    failed = true
    console.error(`FAIL ${file} is ${(output.bytes / 1024).toFixed(0)} KiB, over the ${MAX_FILE_BYTES / 1024} KiB limit`)
  }
}
const files = Object.keys(result.metafile.outputs).length
const largest = Math.max(...Object.values(result.metafile.outputs).map(o => o.bytes))
console.log(`core bundle: ${(total / 1024).toFixed(0)} KiB in ${files} files, largest ${(largest / 1024).toFixed(0)} KiB`)
if (failed) process.exit(1)
