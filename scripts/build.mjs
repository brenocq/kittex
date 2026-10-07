// Bundles core into the ES modules the Claude Code mod imports:
// plugin/hooks/core.js and a chain of parts under plugin/hooks/core-parts/.
//
// Claude Code refuses to read any plugin file over 1 MiB, and before it starts
// a mod it parses and indexes every file the mod imports on its main thread,
// one import level at a time; that work follows the number of AST nodes, and
// a level is never interrupted. So the bundle is cut into small parts, each
// importing only the one before it (scripts/split.mjs): the engine meets one
// part per level and does other work between them, and the prompt box is not
// held up. MathJax and the font tables sit behind a lazy require
// (bundle.mjs): loading the mod evaluates none of them. No dynamic import():
// the engine refuses a module holding one.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { bundleCore } from './bundle.mjs'
import { splitModule } from './split.mjs'

const OUT = 'plugin/hooks'
const PARTS = 'core-parts'
/** Claude Code reads plugin files up to 1 MiB (1,048,576 bytes); stay well under it. */
const MAX_FILE_BYTES = 900 * 1024
/** AST nodes per part: about 10 ms of the engine's scan each. */
const PART_NODES = 9000

const code = await bundleCore()
// The legal comments esbuild gathered at the end, after the export list.
const legal = code.slice(code.lastIndexOf('export{')).replace(/^export\{[^}]*\};?/, '').trim()
const { entry, parts } = splitModule(code, { budget: PART_NODES, dir: `./${PARTS}` })

rmSync(join(OUT, PARTS), { recursive: true, force: true })
mkdirSync(join(OUT, PARTS), { recursive: true })
const files = [[join(OUT, 'core.js'), `${entry}${legal ? `\n${legal}\n` : ''}`], ...parts.map(part => [join(OUT, PARTS, part.file), part.source])]
let total = 0
let failed = false
for (const [file, source] of files) {
  const bytes = Buffer.byteLength(source)
  total += bytes
  if (bytes > MAX_FILE_BYTES) {
    failed = true
    console.error(`FAIL ${file} is ${(bytes / 1024).toFixed(0)} KiB, over the ${MAX_FILE_BYTES / 1024} KiB limit`)
  }
  writeFileSync(file, source)
}
const largest = Math.max(...files.map(([, source]) => Buffer.byteLength(source)))
const nodes = parts.reduce((sum, part) => sum + part.nodes, 0)
console.log(
  `core bundle: ${(total / 1024).toFixed(0)} KiB in ${files.length} files, largest ${(largest / 1024).toFixed(0)} KiB; ` +
    `${nodes} nodes, largest part ${Math.max(...parts.map(part => part.nodes))}`,
)
if (failed) process.exit(1)
