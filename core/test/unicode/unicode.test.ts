import { describe, expect, test } from 'vitest'
import { textWidth } from '../../src/unicode/box.js'
import { toUnicode } from '../../src/unicode/index.js'
import { mathml } from './mathml.js'

const display = (tex: string, maxWidth?: number) => toUnicode(mathml(tex, true), { display: true, maxWidth })
const inline = (tex: string, maxWidth?: number) => toUnicode(mathml(tex, false), { display: false, maxWidth })
const lines = (tex: string) => display(tex)?.lines
const line = (tex: string) => inline(tex)?.lines[0]

describe('results', () => {
  test('every line is padded to the width', () => {
    for (const tex of [String.raw`\frac{a+b}{c} = \sqrt{\frac{1}{2}}`, String.raw`\text{日本} + \hat{x}`, String.raw`\sum_{i=1}^n i`]) {
      const result = display(tex)!
      for (const l of result.lines) expect(textWidth(l)).toBe(result.width)
    }
  })

  test('the baseline is the row of the main axis', () => {
    expect(display(String.raw`y = \frac{a}{b}`)).toEqual({ lines: ['    a', 'y = ─', '    b'], baseline: 1, width: 5 })
  })

  test('inline math is one line', () => {
    expect(inline(String.raw`\frac{a}{b}`)).toEqual({ lines: ['a/b'], baseline: 0, width: 3 })
    expect(inline(String.raw`\begin{pmatrix} a \\ b \end{pmatrix}`)).toBeNull()
  })

  test('maxWidth refuses what does not fit', () => {
    expect(display('a + b + c', 9)).not.toBeNull()
    expect(display('a + b + c', 8)).toBeNull()
    expect(inline('a + b', 4)).toBeNull()
  })

  test('unsupported constructs make the whole result null', () => {
    expect(toUnicode('<math><mstack><msrow><mn>1</mn></msrow></mstack></math>', { display: true })).toBeNull()
    expect(toUnicode('<math><mi>x<mglyph src="x.png"/></mi></math>', { display: true })).toBeNull()
    expect(toUnicode('<math><merror><mtext>bad</mtext></merror></math>', { display: true })).toBeNull()
    expect(toUnicode('<math><mi>x</mi>', { display: true })).toBeNull()
    expect(toUnicode('<mrow><mi>x</mi></mrow>', { display: true })).toBeNull()
    expect(toUnicode('<math><menclose notation="circle"><mi>x</mi></menclose></math>', { display: true })).toBeNull()
  })
})

describe('tokens', () => {
  test('mathvariants map to Mathematical Alphanumeric Symbols, plain letters stay ASCII', () => {
    expect(line(String.raw`x + \mathbf{v} + \mathbb{R} + \mathcal{L} + \mathfrak{g} + \mathsf{A} + \mathtt{B} + \mathbf{0}`)).toBe('x + 𝐯 + ℝ + ℒ + 𝔤 + 𝖠 + 𝙱 + 𝟎')
    expect(line(String.raw`\boldsymbol{\alpha} + \mathbb{1} + \mathit{x} + \mathrm{d}x`)).toBe('𝛂 + 𝟙 + x + dx')
  })

  test('text keeps its spaces', () => {
    expect(line(String.raw`x \text{ if } y`)).toBe('x if y')
  })

  test('function names are spaced from their arguments like TeX', () => {
    expect(line(String.raw`\sin x + \log(n) + \sin\frac{\pi}{2}`)).toBe('sin x + log(n) + sin(π/2)')
  })
})

describe('scripts', () => {
  test('Unicode sub- and superscripts when every character has one', () => {
    expect(line(String.raw`x_i^2 + a_{n+1} + A^{-1} + A^\top + f'(x) + 90^\circ`)).toBe('xᵢ² + aₙ₊₁ + A⁻¹ + Aᵀ + f′(x) + 90°')
  })

  test('inline falls back to ^ and _ with parentheses', () => {
    expect(line(String.raw`e^{i\pi} + T_{\text{eff}} + x^{y^z}`)).toBe('e^(iπ) + T_(eff) + x^(yᶻ)')
  })

  test('display places scripts above and below', () => {
    expect(lines(String.raw`e^{i\pi}`)).toEqual([' iπ', 'e  '])
    expect(lines(String.raw`T_{\mathrm{eff}}`)).toEqual(['T   ', ' eff'])
  })

  test('limits go under and over in display, beside in inline', () => {
    expect(lines(String.raw`\sum_{i=1}^{n} i`)).toEqual([' n   ', ' ∑  i', 'i=1  '])
    expect(line(String.raw`\sum_{i=1}^{n} i`)).toBe('∑ᵢ₌₁ⁿ i')
    expect(line(String.raw`\lim_{x \to 0} f(x)`)).toBe('lim_(x→0) f(x)')
  })

  test('pre- and postscripts', () => {
    expect(line(String.raw`\prescript{14}{6}{C} + \sideset{_a}{^b}\sum x`)).toBe('₆¹⁴C + ₐ∑ᵇ x')
    expect(lines(String.raw`\prescript{A}{Z}{X}`)).toEqual(['ᴬX', 'Z '])
  })
})

describe('fractions', () => {
  test('display fractions stack over a bar as wide as the wider part', () => {
    expect(lines(String.raw`\frac{a+b}{c}`)).toEqual(['a + b', '─────', '  c  '])
  })

  test('a fraction of fractions has the longer main bar', () => {
    expect(lines(String.raw`\frac{\frac{a}{b}}{c}`)).toEqual([' a ', ' ─ ', ' b ', '───', ' c '])
  })

  test('inline fractions add parentheses only where needed', () => {
    expect(line(String.raw`\frac{a+b}{c}`)).toBe('(a + b)/c')
    expect(line(String.raw`\frac{1}{2\pi}`)).toBe('1/(2π)')
    expect(line(String.raw`\frac{dy}{dx}`)).toBe('dy/dx')
    expect(line(String.raw`\frac{f(x)}{g(x)}`)).toBe('f(x)/g(x)')
    expect(line(String.raw`2\frac{a}{b}`)).toBe('2(a/b)')
    expect(line(String.raw`\frac{a}{b} + c`)).toBe('a/b + c')
    expect(line(String.raw`\frac{1}{2}x`)).toBe('½x')
  })

  test('binomials', () => {
    expect(lines(String.raw`\binom{n}{k}`)).toEqual(['⎛n⎞', '⎜ ⎟', '⎝k⎠'])
    expect(line(String.raw`\binom{n}{k}`)).toBe('C(n, k)')
  })
})

describe('roots', () => {
  test('a bar over the radicand in display, parentheses inline', () => {
    expect(lines(String.raw`\sqrt{x+1}`)).toEqual([' _____', '√x + 1'])
    expect(lines(String.raw`\sqrt{2}`)).toEqual(['√2'])
    expect(line(String.raw`\sqrt{x+1} + \sqrt[3]{y} + \sqrt[n]{z}`)).toBe('√(x + 1) + ∛y + ⁿ√z')
  })

  test('a tall radicand gets a tall radical', () => {
    expect(lines(String.raw`\sqrt{\frac{a}{b}}`)).toEqual([' ┌──', ' │ a', ' │ ─', '╲│ b'])
  })
})

describe('delimiters', () => {
  test('\\left and \\right stretch over tall content', () => {
    expect(lines(String.raw`\left( \frac{a}{b} \right]`)).toEqual(['⎛a⎤', '⎜─⎥', '⎝b⎦'])
    expect(lines(String.raw`\left\{ \frac{a}{b} \right\| \left\lfloor \frac{a}{b} \right\rceil`)).toEqual(['⎧a║⎢a⎤', '⎨─║⎢─⎥', '⎩b║⎣b⎥'])
  })

  test('plain parentheses stay one row', () => {
    expect(lines(String.raw`(\frac{a}{b})`)).toEqual([' a ', '(─)', ' b '])
  })

  test('an integral grows with its integrand and carries its limits beside it', () => {
    expect(lines(String.raw`\int_0^1 \frac{1}{x} dx = 1`)).toEqual(['⌠¹ 1       ', '⎮  ─ dx = 1', '⌡₀ x       '])
    expect(lines(String.raw`\int_0^1 x\,dx`)).toEqual(['∫₀¹ x dx'])
    expect(lines(String.raw`\iint_D f\,dA`)).toEqual(['∬  f dA', ' D     '])
    expect(lines(String.raw`\iint_{D}^{E} f`)).toEqual(['⌠⌠ᴱ  ', '⎮⎮  f', '⌡⌡D  '])
  })
})

describe('accents', () => {
  test('combining marks on a single letter', () => {
    expect(line(String.raw`\hat{x} \bar{y} \vec{v} \dot{a} \ddot{b} \tilde{n}`)).toBe('x\u0302y\u0304v\u20d7a\u0307b\u0308n\u0303')
  })

  test('over a wider base: a row of its own in display, marks inline', () => {
    expect(lines(String.raw`\vec{AB}`)).toEqual(['─→', 'AB'])
    expect(line(String.raw`\overline{AB}`)).toBe('A\u0305B\u0305')
  })

  test('braces with their labels', () => {
    expect(lines(String.raw`\underbrace{a+b}_{n}`)).toEqual(['a + b', '╰─┬─╯', '  n  '])
    expect(inline(String.raw`\underbrace{a+b}_{n}`)).toBeNull()
  })
})

describe('tables', () => {
  test('matrices', () => {
    expect(lines(String.raw`\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}`)).toEqual(['⎡1  0⎤', '⎣0  1⎦'])
  })

  test('aligned columns line up at the &', () => {
    expect(lines(String.raw`\begin{aligned} f(x) &= x^2 + 2x + 1 \\ &= (x+1)^2 \end{aligned}`)).toEqual(['f(x) = x² + 2x + 1', '     = (x + 1)²   '])
  })

  test('cases', () => {
    expect(lines(String.raw`|x| = \begin{cases} x & x \ge 0 \\ -x & x < 0 \\ 0 & \text{never} \end{cases}`)).toEqual([
      '      ⎧x   x ≥ 0',
      '|x| = ⎨−x  x < 0',
      '      ⎩0   never',
    ])
  })

  test('frames and rules', () => {
    expect(lines(String.raw`\begin{array}{|c|c|} \hline a & b \\ \hline c & d \\ \hline \end{array}`)).toEqual([
      '┌───┬───┐',
      '│ a │ b │',
      '├───┼───┤',
      '│ c │ d │',
      '└───┴───┘',
    ])
    expect(lines(String.raw`\begin{array}{|l|r|} a & bb \\ c & d \end{array}`)).toEqual(['│ a │ bb │', '│ c │  d │'])
  })

  test('multline puts its lines left and right', () => {
    expect(lines(String.raw`\begin{multline} a + b \\ = c \end{multline}`)).toEqual(['a + b', '  = c'])
  })

  test('column lines and tags', () => {
    expect(lines(String.raw`\begin{array}{c|c} a & b \end{array}`)).toEqual(['a │ b'])
    expect(lines(String.raw`x = 1 \tag{2}`)).toEqual(['x = 1  (2)'])
  })
})

describe('enclosures', () => {
  test('cancel strikes through, boxed draws a box in display', () => {
    expect(line(String.raw`\cancel{x}`)).toBe('x\u0338')
    expect(lines(String.raw`\boxed{x}`)).toEqual(['┌───┐', '│ x │', '└───┘'])
  })
})
