// Dev-only: typesets sample formulas with MathJax 4 (TeX in, SVG out, New
// Computer Modern) in Node and writes them as TypesetResult JSON fixtures for
// the raster tests and sample renders, so the rasterizer can be developed
// without the typeset module.
//
//   node core/test/raster/make-fixtures.mjs
//
// Each fixture is { name, tex, result } with result in em: origin at the left
// end of the baseline, y down, every SVG transform flattened into the op's
// `transform` (path data is left in glyph units).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import MathJax from '@mathjax/src'

export const FORMULAS = {
  gaussian: String.raw`\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}`,
  basel: String.raw`\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}`,
  maxwell: String.raw`\begin{aligned} \nabla\cdot\mathbf{E} &= \frac{\rho}{\varepsilon_0} \\ \nabla\times\mathbf{B} &= \mu_0\mathbf{J} + \mu_0\varepsilon_0\frac{\partial\mathbf{E}}{\partial t} \end{aligned}`,
  matrix: String.raw`A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}, \quad \det A = ad - bc`,
  cases: String.raw`f(x) = \begin{cases} x^2 & x \ge 0 \\ -x & x < 0 \end{cases}`,
  quadratic: String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}, \qquad \overline{z w} = \bar z \, \bar w`,
  fonts: String.raw`\mathbb{E}[X] = \int_{\Omega} X \, d\mathbb{P}, \qquad \mathcal{L}(\theta) = \prod_{i} p_\theta(x_i)`,
  wide: String.raw`\frac{\partial}{\partial t}\int_{\Omega(t)} \rho\, u_i \, dV = -\oint_{\partial\Omega(t)} \left( p\,\delta_{ij} + \rho\, u_i u_j - \mu \left( \frac{\partial u_i}{\partial x_j} + \frac{\partial u_j}{\partial x_i} \right) \right) n_j \, dA + \int_{\Omega(t)} \rho\, g_i \, dV + \sum_{k=1}^{N} F_{k,i} + \lim_{h\to 0} \frac{f(x+h)-f(x)}{h}`,
}

const here = dirname(fileURLToPath(import.meta.url))

await MathJax.init({ loader: { load: ['input/tex', 'output/svg'] }, svg: { fontCache: 'none' } })
const adaptor = MathJax.startup.adaptor

const multiply = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
]

function parseTransform(text) {
  let m = [1, 0, 0, 1, 0, 0]
  for (const [, name, args] of (text ?? '').matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const v = args.split(/[\s,]+/).filter(Boolean).map(Number)
    if (name === 'translate') m = multiply(m, [1, 0, 0, 1, v[0], v[1] ?? 0])
    else if (name === 'scale') m = multiply(m, [v[0], 0, 0, v[1] ?? v[0], 0, 0])
    else if (name === 'matrix') m = multiply(m, v)
    else if (name === 'rotate') {
      const a = (v[0] * Math.PI) / 180
      const [cx, cy] = [v[1] ?? 0, v[2] ?? 0]
      m = multiply(m, [1, 0, 0, 1, cx, cy])
      m = multiply(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0])
      m = multiply(m, [1, 0, 0, 1, -cx, -cy])
    } else throw new Error(`unsupported transform ${name}`)
  }
  return m
}

const round = x => Math.round(x * 1e6) / 1e6
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

function walk(node, m, ops, skipped) {
  const kind = adaptor.kind(node)
  if (kind === '#text' || kind === '#comment') return
  const attr = name => adaptor.getAttribute(node, name)
  let local = multiply(m, parseTransform(attr('transform')))
  if (kind === 'svg') local = multiply(local, [1, 0, 0, 1, Number(attr('x') ?? 0), Number(attr('y') ?? 0)])
  if (kind === 'path') {
    ops.push({ type: 'path', d: attr('d'), transform: local.map(round) })
  } else if (kind === 'rect') {
    const [x, y, w, h] = ['x', 'y', 'width', 'height'].map(name => Number(attr(name) ?? 0))
    if (local[1] !== 0 || local[2] !== 0) throw new Error('rotated rect')
    const [x0, y0] = apply(local, x, y)
    const [x1, y1] = apply(local, x + w, y + h)
    ops.push({
      type: 'rect',
      x: round(Math.min(x0, x1)),
      y: round(Math.min(y0, y1)),
      width: round(Math.abs(x1 - x0)),
      height: round(Math.abs(y1 - y0)),
    })
  } else if (kind === 'text' || kind === 'line' || kind === 'use') {
    skipped.add(kind)
    return
  }
  for (const child of adaptor.childNodes(node)) walk(child, local, ops, skipped)
}

export async function typesetFixture(tex) {
  const container = await MathJax.tex2svgPromise(tex, { display: true })
  const svg = adaptor.firstChild(container)
  const [minX, minY, w, h] = adaptor.getAttribute(svg, 'viewBox').split(/\s+/).map(Number)
  // viewBox units are thousandths of an em, y down with the baseline at y = 0.
  const root = [1 / 1000, 0, 0, 1 / 1000, -minX / 1000, 0]
  const ops = []
  const skipped = new Set()
  for (const child of adaptor.childNodes(svg)) walk(child, root, ops, skipped)
  if (skipped.size) console.warn(`${tex}: skipped ${[...skipped].join(', ')}`)
  return { width: round(w / 1000), height: round(-minY / 1000), depth: round((h + minY) / 1000), ops }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = join(here, 'fixtures')
  mkdirSync(dir, { recursive: true })
  for (const [name, tex] of Object.entries(FORMULAS)) {
    const result = await typesetFixture(tex)
    writeFileSync(join(dir, `${name}.json`), `${JSON.stringify({ name, tex, result })}\n`)
    console.log(`${name}: ${result.width.toFixed(2)} x ${(result.height + result.depth).toFixed(2)} em, ${result.ops.length} ops`)
  }
}
