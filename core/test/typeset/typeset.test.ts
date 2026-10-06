import { beforeAll, describe, expect, test } from 'vitest'
import { initTypeset, TexError, texToMathML, typeset } from '../../src/typeset/index.js'
import { inkBox } from './ink.js'

beforeAll(() => initTypeset())

const inline = { display: false }
const display = { display: true }

describe('metrics', () => {
  test('a single x is about 0.57 em wide, x-height tall, on the baseline', () => {
    const r = typeset('x', inline)
    expect(r.width).toBeCloseTo(0.572, 2)
    expect(r.height).toBeGreaterThan(0.4)
    expect(r.height).toBeLessThan(0.5)
    expect(r.depth).toBeLessThan(0.05)
  })

  test('y has a depth, a fraction is taller than a letter', () => {
    expect(typeset('y', inline).depth).toBeGreaterThan(0.15)
    const letter = typeset('a', inline)
    const fraction = typeset(String.raw`\frac{a}{b}`, inline)
    expect(fraction.height).toBeGreaterThan(letter.height)
    expect(fraction.depth).toBeGreaterThan(letter.depth)
  })

  test('display style sets big operators and fractions larger than inline', () => {
    for (const tex of [String.raw`\sum_{n=1}^{\infty} n`, String.raw`\frac{a}{b}`, String.raw`\int_0^1 f`]) {
      const i = typeset(tex, inline)
      const d = typeset(tex, display)
      expect(d.height + d.depth).toBeGreaterThan(i.height + i.depth)
    }
  })

  test('every op is made of finite numbers', () => {
    const r = typeset(String.raw`\left( \frac{\sqrt{x^2+1}}{\overbrace{a+b}^{n}} \right)^{\!2} \xrightarrow{f} \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}`, display)
    expect(r.ops.length).toBeGreaterThan(5)
    for (const op of r.ops) {
      if (op.type === 'rect') {
        expect([op.x, op.y, op.width, op.height].every(Number.isFinite)).toBe(true)
        expect(op.width).toBeGreaterThan(0)
        expect(op.height).toBeGreaterThan(0)
      } else {
        expect(op.transform.every(Number.isFinite)).toBe(true)
        expect(op.d).toMatch(/^[MmLlHhVvCcSsQqTtZz0-9.\s,eE+-]+$/)
      }
    }
    for (const n of [r.width, r.height, r.depth]) expect(Number.isFinite(n)).toBe(true)
  })

  test('ink sits in the box: above the baseline is negative y', () => {
    const x = inkBox(typeset('x', inline))
    expect(x.minY).toBeCloseTo(-0.442, 1)
    expect(x.maxY).toBeGreaterThan(-0.05)
    expect(x.minX).toBeGreaterThan(-0.05)
    expect(x.maxX).toBeLessThan(0.6)
    const y = inkBox(typeset('y', inline))
    expect(y.maxY).toBeGreaterThan(0.15)
    const sum = typeset(String.raw`\sum_{k=0}^{n} k`, display)
    const ink = inkBox(sum)
    expect(ink.minY).toBeGreaterThan(-sum.height - 0.05)
    expect(ink.maxY).toBeLessThan(sum.depth + 0.05)
    expect(ink.maxX).toBeLessThan(sum.width + 0.05)
  })

  test('a fraction bar is a rule at the math axis', () => {
    const r = typeset(String.raw`\frac{a}{b}`, display)
    const rules = r.ops.filter(op => op.type === 'rect')
    expect(rules).toHaveLength(1)
    const bar = rules[0]!
    if (bar.type !== 'rect') throw new Error('not a rect')
    expect(bar.y + bar.height / 2).toBeCloseTo(-0.25, 1)
    expect(bar.width).toBeGreaterThan(0.5)
  })

  test('colours are ignored', () => {
    const plain = typeset('x+y', inline)
    const coloured = typeset(String.raw`\color{red}{x}+\textcolor{blue}{y}`, inline)
    expect(coloured.width).toBeCloseTo(plain.width, 6)
    expect(coloured.ops.map(op => (op.type === 'path' ? op.d : op.type))).toEqual(plain.ops.map(op => (op.type === 'path' ? op.d : op.type)))
    // \colorbox's background is not drawn as ink.
    expect(typeset(String.raw`\colorbox{yellow}{x}`, inline).ops.every(op => op.type === 'path')).toBe(true)
  })
})

describe('line breaking and tags', () => {
  const long = String.raw`f(x) = a_0 + a_1 x + a_2 x^2 + a_3 x^3 + a_4 x^4 + a_5 x^5 + a_6 x^6 + a_7 x^7 + a_8 x^8`

  test('a display formula is broken to fit lineWidth', () => {
    const one = typeset(long, display)
    expect(one.width).toBeGreaterThan(20)
    const broken = typeset(long, { display: true, lineWidth: 10 })
    expect(broken.width).toBeLessThanOrEqual(10)
    expect(broken.height + broken.depth).toBeGreaterThan(2 * (one.height + one.depth))
  })

  test('a formula that fits is not changed by lineWidth', () => {
    const tex = String.raw`e^{i\pi} + 1 = 0`
    expect(typeset(tex, { display: true, lineWidth: 40 })).toEqual(typeset(tex, display))
  })

  test('forced breaks (\\\\) stack lines, as wide as the widest', () => {
    for (const options of [inline, display]) {
      const r = typeset(String.raw`x+y \\ z`, options)
      expect(r.width).toBeGreaterThan(1.5)
      expect(r.width).toBeLessThan(3)
      expect(r.depth).toBeGreaterThan(1)
    }
  })

  test('inline math is never broken', () => {
    expect(typeset(long, { display: false, lineWidth: 10 }).width).toBeGreaterThan(20)
  })

  test('an explicit \\tag is shown at the right of the line width; no automatic numbers', () => {
    const tagged = typeset(String.raw`E = mc^2 \tag{1}`, { display: true, lineWidth: 30 })
    expect(tagged.width).toBe(30)
    expect(inkBox(tagged).maxX).toBeGreaterThan(29)
    expect(typeset(String.raw`\begin{align} a &= b \\ c &= d \end{align}`, display).width).toBeLessThan(4)
  })
})

describe('errors', () => {
  test('unknown macros, bad syntax and empty input are TexErrors', () => {
    for (const tex of [String.raw`\foo`, String.raw`\frac{a}`, '{', '}', 'x^', '', '   ', String.raw`\require{mhchem}`, String.raw`\href{x}{y}`]) {
      expect(() => typeset(tex, display), tex).toThrow(TexError)
      expect(() => texToMathML(tex, display), tex).toThrow(TexError)
    }
    expect(() => typeset(String.raw`\foo`, display)).toThrow(/\\foo/)
  })

  test('over-long input is refused', () => {
    expect(() => typeset('x'.repeat(5000), display)).toThrow(TexError)
  })

  test('recursive macros and expansion bombs fail fast', () => {
    const bombs = [
      String.raw`\def\a{\a}\a`,
      String.raw`\def\a{\a\a}\a`,
      String.raw`\def\a#1{\a{#1#1}}\a{x}`,
      String.raw`\newcommand{\a}{\a}\a`,
      String.raw`\def\a{xxxxxxxxxx}\def\b{\a\a\a\a\a\a\a\a\a\a}\def\c{\b\b\b\b\b\b\b\b\b\b}\def\d{\c\c\c\c\c\c\c\c\c\c}\d\d\d`,
      String.raw`\newcommand{\x}[1]{#1#1}` + String.raw`\x{`.repeat(16) + 'y' + '}'.repeat(16),
    ]
    for (const tex of bombs) {
      const start = performance.now()
      expect(() => typeset(tex, display), tex).toThrow(TexError)
      expect(performance.now() - start, tex).toBeLessThan(500)
    }
  })

  test('deep nesting is an error, not a crash', () => {
    const start = performance.now()
    try {
      typeset('{'.repeat(2000) + 'x' + '}'.repeat(2000), display)
    } catch (error) {
      expect(error).toBeInstanceOf(TexError)
    }
    expect(performance.now() - start).toBeLessThan(2000)
  })

  test('characters outside the bundled font are TexErrors, but still have MathML', () => {
    for (const tex of [String.raw`\text{日本}`, '😀', String.raw`\digamma`]) {
      expect(() => typeset(tex, display), tex).toThrow(TexError)
      expect(texToMathML(tex, display)).toMatch(/^<math/)
    }
  })

  test('definitions do not leak from one formula into the next', () => {
    typeset(String.raw`\def\foo{x} \foo`, display)
    expect(() => typeset(String.raw`\foo`, display)).toThrow(TexError)
    typeset(String.raw`\renewcommand{\frac}[2]{#1} \frac{a}{b}`, display)
    expect(typeset(String.raw`\frac{a}{b}`, display).ops.some(op => op.type === 'rect')).toBe(true)
    typeset(String.raw`x \label{eq} \tag{1}`, display)
    expect(() => typeset(String.raw`x \label{eq} \tag{1}`, display)).not.toThrow()
  })
})

describe('packages', () => {
  test.each([
    String.raw`\mathbb{R} \mathcal{L} \mathscr{F} \mathfrak{g} \mathsf{A} \mathtt{B} \ell`,
    String.raw`\boldsymbol{\alpha} \mathbf{v}`,
    String.raw`\bra{\psi} \ket{\phi} \braket{\psi|\phi}`,
    String.raw`\cancel{x} \bcancel{y} \xcancel{z} \cancelto{0}{x}`,
    String.raw`\coloneqq \mathclap{x} \DeclarePairedDelimiter{\pair}{\lvert}{\rvert} \pair{x}`,
    String.raw`\dv{f}{x} \pdv{f}{x}{y} \norm{v} \qty(\frac{a}{b})`,
    String.raw`\text{if $x > 0$ then café}`,
    String.raw`\unicode{x263A}`,
    String.raw`\begin{aligned} a &= b \\ c &= d \end{aligned} \begin{cases} 1 & x \\ 0 & y \end{cases}`,
  ])('%s', tex => {
    expect(typeset(tex, display).ops.length).toBeGreaterThan(0)
  })
})

describe('MathML', () => {
  test('a fraction is an mfrac', () => {
    const mml = texToMathML(String.raw`\frac{a}{b}`, inline)
    expect(mml).toMatch(/^<math display="inline"/)
    expect(mml).toContain('<mfrac><mi>a</mi><mi>b</mi></mfrac>')
    expect(mml).toMatch(/<\/math>$/)
    expect(mml).not.toContain('data-latex')
  })

  test('display mode is marked', () => {
    expect(texToMathML('x', display)).toMatch(/^<math display="block"/)
  })

  test('the same parse as typeset', () => {
    expect(texToMathML(String.raw`\alpha_i^2`, inline)).toContain('<msubsup><mi>&#x3B1;</mi><mi>i</mi><mn>2</mn></msubsup>')
  })
})
