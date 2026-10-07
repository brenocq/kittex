// Runs the core bundle under the mod sandbox's rules: a vm context with code
// generation off (no eval, new Function or WebAssembly) and none of Node's
// globals (no timers, process, Buffer or require), only the web APIs the
// sandbox has. The bundle is the mod's own: the entry and its chain of parts
// as the build writes them (bundle.mjs, split.mjs), linked as ES modules.
// Checks that loading it evaluates no MathJax, then typesets and draws sample
// formulas and reports timings.
//
//   node --experimental-vm-modules scripts/sandbox-check.mjs [--out <dir>]   # --out also writes the PNGs
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'
import { bundleCore } from './bundle.mjs'
import { splitModule } from './split.mjs'

const SAMPLES = [
  String.raw`\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}`,
  String.raw`\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}`,
  String.raw`\begin{aligned} \nabla\cdot\mathbf{E} &= \frac{\rho}{\varepsilon_0} \\ \nabla\times\mathbf{B} &= \mu_0\mathbf{J} + \mu_0\varepsilon_0\frac{\partial\mathbf{E}}{\partial t} \end{aligned}`,
  String.raw`A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}, \quad \det A = ad - bc`,
  String.raw`f(x) = \begin{cases} x^2 & x \ge 0 \\ -x & x < 0 \end{cases}`,
  String.raw`\mathbb{E}[X] = \int_{\Omega} X \, d\mathbb{P}, \qquad \mathcal{L}(\theta) = \prod_{i} p_\theta(x_i)`,
]

const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : undefined

const { entry, parts } = splitModule(await bundleCore({ legalComments: 'none' }), { dir: '.' })
const sources = new Map([['core.js', entry], ...parts.map(part => [part.file, part.source])])
const code = [...sources.values()].join('\n')

let failed = false
const fail = message => {
  failed = true
  console.error(`FAIL ${message}`)
}

// The engine refuses a module holding import(); the others never run in the sandbox.
for (const [pattern, what] of [
  [/\bimport\s*\(/, 'dynamic import()'],
  [/\bnew Function\s*\(/, 'new Function'],
  [/(?<![.\w$])eval\s*\(/, 'eval'],
  [/\bWebAssembly\b/, 'WebAssembly'],
]) {
  if (pattern.test(code)) fail(`bundle contains ${what}`)
}
for (const name of ['setTimeout', 'setInterval', 'require', 'process', 'Buffer', 'document', 'window']) {
  const count = code.match(new RegExp(`(?<![.\\w$])${name}\\b`, 'g'))?.length ?? 0
  if (count > 0) console.warn(`note: bundle mentions ${name} ${count}x (must never run in the sandbox)`)
}
console.log(`bundle: ${(code.length / 1024).toFixed(0)} KiB`)

const context = vm.createContext(
  { TextEncoder, TextDecoder, URL, AbortController, crypto: globalThis.crypto },
  { codeGeneration: { strings: false, wasm: false } },
)
try {
  let t = performance.now()
  const modules = new Map()
  for (const [file, source] of sources) modules.set(file, new vm.SourceTextModule(source, { identifier: file, context }))
  await modules.get('core.js').link(specifier => {
    const module = modules.get(specifier.replace(/^\.\//, ''))
    if (!module) throw new Error(`no part ${specifier}`)
    return module
  })
  await modules.get('core.js').evaluate()
  const kittex = modules.get('core.js').namespace
  console.log(`load: ${(performance.now() - t).toFixed(0)} ms (${sources.size} modules)`)
  if (kittex.typesetLoaded()) fail('loading the bundle evaluated MathJax (it should wait for the first formula)')


  t = performance.now()
  await kittex.init()
  console.log(`init: ${(performance.now() - t).toFixed(0)} ms`)

  const cell = { cellWidth: 13, cellHeight: 26 }
  const env = { ...cell, maxColumns: 100, emPx: kittex.emPxForCell(cell), ink: { r: 230, g: 230, b: 230 } }
  if (out) mkdirSync(out, { recursive: true })
  for (const [i, tex] of SAMPLES.entries()) {
    try {
      // As the mod does: reserve the rows, draw the image and the preview in them.
      t = performance.now()
      const { rows } = kittex.measureDisplay(tex, env)
      const first = kittex.renderDisplay(tex, env, rows)
      const firstMs = performance.now() - t
      t = performance.now()
      kittex.renderDisplay(tex, { ...env, ink: { r: 20, g: 20, b: 20 } }, rows)
      const recolourMs = performance.now() - t
      const preview = kittex.previewDisplay(tex, env, rows)
      if (!preview) fail(`sample #${i}: no preview in ${rows} rows`)
      console.log(
        `#${i} ${first.columns}x${first.rows} cells, ${first.png.length} B png, first ${firstMs.toFixed(1)} ms, ` +
          `recolour ${recolourMs.toFixed(1)} ms, preview ${preview ? `${preview.length} lines` : 'none'}`,
      )
      if (out) writeFileSync(join(out, `sample-${i}.png`), first.png)
    } catch (error) {
      fail(`sample #${i}: ${error?.stack ?? error}`)
    }
  }
  const segments = kittex.scan('Euler: $$e^{i\\pi} + 1 = 0$$ done.')
  if (!segments.some(s => s.kind === 'math')) fail('scan found no math in a $$ sample')
  // Inline images and the prose layout replay (marked runs in here too).
  const inlineEnv = { ...env, baselinePx: 21 }
  const box = kittex.measureInline('E = mc^2', inlineEnv)
  if (!box || box.rows !== 1) fail('measureInline gave no one-row box for E = mc^2')
  else if (kittex.renderInline('E = mc^2', inlineEnv, box.columns).rows !== 1) fail('renderInline drew more than one row')
  const layout = kittex.layoutProse('A **bold** move: x + y, then `code` and more words to wrap.', 20, [{ start: 17, end: 22 }])
  if (!layout || layout.places[0] === null) fail('layoutProse could not place a span')
  else console.log(`inline: E = mc^2 in ${box?.columns} cells; prose laid out in ${layout.rows} rows, span at ${JSON.stringify(layout.places[0])}`)
} catch (error) {
  fail(error?.stack ?? String(error))
}
process.exit(failed ? 1 : 0)
