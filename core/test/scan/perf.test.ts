import { describe, expect, test } from 'vitest'
import { createLineScanner, scan } from '../../src/scan/index.js'
import { checked } from './helpers.js'

const SIZE = 200 * 1024

function repeatTo(chunk: string, size = SIZE): string {
  return chunk.repeat(Math.ceil(size / chunk.length))
}

function timed<T>(run: () => T): [T, number] {
  const t = performance.now()
  const result = run()
  return [result, performance.now() - t]
}

/** Scans a text whole and line by line, checks both, and returns the slower time in ms. */
function scanBothWays(text: string): number {
  const [whole, wholeMs] = timed(() => scan(text))
  checked(text, whole)
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? []
  const [, streamMs] = timed(() => {
    const scanner = createLineScanner()
    lines.forEach((line, i) => scanner.push(line, i === lines.length - 1))
  })
  return Math.max(wholeMs, streamMs)
}

const REPLY = `## Section

The price is \\$5 per unit, or $5 to $10 in bulk; let $f(x) = x^2 + \\alpha$ and \\(g(x)\\) be smooth.
Inline display $$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$ in a sentence, and \`code with $dollars$\`.

$$
\\int_0^1 f(x)\\,dx = \\frac{1}{3}
$$

> Quoted:
> $$
> a^2 + b^2 = c^2
> $$

- Item one with $y$.
- Item two costs $3.

   \\begin{align*}
   u &= v \\\\
   w &= z
   \\end{align*}

\`\`\`python
total = "$" + str(price)  # $x$
\`\`\`

\`\`\`math
\\nabla \\cdot E = \\rho
\`\`\`

`

describe('performance on 200 KB replies', () => {
  test('a realistic reply', () => {
    const text = repeatTo(REPLY)
    const ms = scanBothWays(text)
    expect(scan(text).filter(s => s.kind === 'math').length).toBeGreaterThan(1000)
    expect(ms).toBeLessThan(500)
  })

  test.each([
    ['one long line of currency', repeatTo('costs $5 and ')],
    ['one paragraph of currency lines', repeatTo('costs $5 and\n')],
    ['inline math in one line', repeatTo('$x$ and ')],
    ['unclosed $$ openers without blank lines', repeatTo('$$ a\n')],
    ['unclosed \\[ openers without blank lines', repeatTo('\\[ a\n')],
    ['unclosed environments of every kind', repeatTo('\\begin{equation}\n\\begin{align}\n\\begin{gather*}\n\\begin{multline}\nx\n')],
    ['an unclosed fence', `\`\`\`\n${repeatTo('$x$ code\n')}`],
    ['an unclosed math fence', `\`\`\`math\n${repeatTo('x\n')}`],
    ['backtick runs of growing length', Array.from({ length: 600 }, (_, i) => '`'.repeat(i + 1)).join(' $a$ ')],
    ['many unmatched backticks', repeatTo('` $a ')],
    ['many \\( without \\)', repeatTo('\\( $ ')],
    ['many $$ without a closer on one line', repeatTo('a $$ b $ ')],
    ['deep blockquotes', repeatTo('> > > > $x$ and $$\n')],
    ['backslashes', repeatTo('\\\\\\$\\(')],
  ])('%s', (_, text) => {
    expect(scanBothWays(text)).toBeLessThan(500)
  })

  test('time grows linearly', () => {
    const small = repeatTo(REPLY, SIZE / 4)
    const large = repeatTo(REPLY, SIZE * 2)
    scan(small)
    const [, smallMs] = timed(() => scan(small))
    const [, largeMs] = timed(() => scan(large))
    expect(largeMs / Math.max(smallMs, 1)).toBeLessThan(40)
  })
})
