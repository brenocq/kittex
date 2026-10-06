import { expect, test } from 'vitest'
import { lines, textWidth, Unsupported } from '../../src/unicode/box.js'
import { layoutMath } from '../../src/unicode/layout.js'
import { parseXml } from '../../src/unicode/xml.js'
import { mathml } from './mathml.js'

// Random nestings of common constructs: whatever they render to, the layout
// either refuses them (Unsupported) or returns well-formed boxes, never crashes.
const ATOMS = [
  'x', 'y_1', 'z^2', '\\alpha', '\\frac{a}{b}', '\\sqrt{x}', '\\sqrt[3]{y+1}', '\\left( a \\right)',
  '\\left[ \\frac{1}{2} \\right]', '\\sum_{i=1}^n', '\\int_0^1', '\\lim_{x\\to 0}', '\\hat{x}', '\\vec{AB}',
  '\\overline{xy}', '\\underbrace{a+b}_{n}', '\\binom{n}{k}', '\\mathbb{R}', '\\text{if }',
  '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', '\\begin{cases} 1 & x \\\\ 0 & y \\end{cases}', '\\cancel{z}',
  '\\boxed{w}', '+', '-', '=', '\\le', ',', '\\cdot', '\\,', '\\quad', '(', ')', '|', '\\|', '\\{', '\\}', '\\langle',
  '\\rangle', "f'", '\\sin', '\\log', '\\nabla', '\\partial', '\\infty', '!', '\\dots', '{}^{a}', '\\big(', '\\Big]',
]

test('random formulas lay out into well-formed boxes or are refused', () => {
  let seed = 12345
  const rand = (n: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed % n
  }
  const gen = (depth: number): string => {
    let out = ''
    for (let i = 1 + rand(4); i > 0; i--) {
      const pick = depth > 0 ? rand(10) : 9
      if (pick === 0) out += `\\frac{${gen(depth - 1)}}{${gen(depth - 1)}}`
      else if (pick === 1) out += `{${gen(depth - 1)}}^{${gen(depth - 1)}}`
      else if (pick === 2) out += `\\left( ${gen(depth - 1)} \\right)`
      else if (pick === 3) out += `\\sqrt{${gen(depth - 1)}}`
      else if (pick === 4) out += `x_{${gen(depth - 1)}}`
      else out += ` ${ATOMS[rand(ATOMS.length)]} `
    }
    return out
  }
  let rendered = 0
  for (let k = 0; k < 150; k++) {
    const tex = gen(2)
    for (const display of [true, false]) {
      const source = mathml(tex, display)
      if (source.includes('<merror')) continue
      try {
        const box = layoutMath(parseXml(source), display)
        const rows = lines(box)
        for (const row of rows) expect(textWidth(row), tex).toBe(box.width)
        expect(box.base, tex).toBeGreaterThanOrEqual(0)
        expect(box.base, tex).toBeLessThan(rows.length)
        if (!display) expect(rows, tex).toHaveLength(1)
        rendered++
      } catch (error) {
        if (!(error instanceof Unsupported)) throw new Error(`${tex}: ${String(error)}`)
      }
    }
  }
  expect(rendered).toBeGreaterThan(100)
})
