// Renders formulas' DrawOps to standalone SVG for checking the geometry by eye:
//   KITTEX_SVG_OUT=/some/dir npx vitest run core/test/typeset/svg.test.ts
// writes one SVG per formula (box above the baseline red, below blue, baseline green).
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, expect, test } from 'vitest'
import { initTypeset, typeset } from '../../src/typeset/index.js'
import { opsToSvg } from './draw-svg.js'

beforeAll(() => initTypeset())

const FORMULAS: [string, string, boolean, number?][] = [
  ['letters', String.raw`x y \alpha g \mathbb{R}`, false],
  ['fraction', String.raw`\left( \frac{a}{b} \right)^2 + \sqrt{x^2+1}`, true],
  ['gaussian', String.raw`\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}`, true],
  ['brace', String.raw`f(x) = \begin{cases} x^2 & x \ge 0 \\ -x & x < 0 \end{cases}`, true],
  ['matrix', String.raw`\begin{array}{c|c} a & b \\ \hline c & d \end{array} \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}`, true],
  ['accents', String.raw`\overbrace{a+b+c}^{n} \xrightarrow{f} \widehat{xyz} \cancel{x} \boxed{y}`, true],
  ['tag', String.raw`E = mc^2 \tag{1}`, true, 20],
  ['broken', String.raw`f(x) = a_0 + a_1 x + a_2 x^2 + a_3 x^3 + a_4 x^4 + a_5 x^5 + a_6 x^6`, true, 10],
]

test.each(FORMULAS)('%s draws to SVG', (name, tex, display, lineWidth) => {
  const result = typeset(tex, { display, lineWidth })
  const svg = opsToSvg(result)
  expect(svg).toMatch(/^<svg [^>]*viewBox="[-\d. ]+"/)
  expect(svg).not.toContain('NaN')
  const out = process.env.KITTEX_SVG_OUT
  if (out) {
    mkdirSync(out, { recursive: true })
    writeFileSync(join(out, `${name}.svg`), svg)
  }
})
