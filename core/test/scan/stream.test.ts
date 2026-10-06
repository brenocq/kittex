import { describe, expect, test } from 'vitest'
import { createLineScanner, scan } from '../../src/scan/index.js'
import type { Segment } from '../../src/types.js'
import { checked, merge, rng, splitLines, stream } from './helpers.js'

const kinds = (segments: Segment[]) => segments.map(s => (s.kind === 'text' ? s.text : [s.delimiter, s.display, s.tex]))

describe('LineScanner', () => {
  test('prose comes back as it arrives, inline math split out, offsets cumulative', () => {
    const scanner = createLineScanner()
    expect(scanner.push('Hello $x$ world.\n', false)).toEqual([
      { kind: 'text', text: 'Hello ', start: 0, end: 6 },
      { kind: 'math', display: false, tex: 'x', raw: '$x$', delimiter: '$', start: 6, end: 9 },
      { kind: 'text', text: ' world.\n', start: 9, end: 17 },
    ])
    expect(scanner.push('\nMore $y$.\n', false)).toEqual([
      { kind: 'text', text: '\nMore ', start: 17, end: 23 },
      { kind: 'math', display: false, tex: 'y', raw: '$y$', delimiter: '$', start: 23, end: 26 },
      { kind: 'text', text: '.\n', start: 26, end: 28 },
    ])
    expect(scanner.push('', true)).toEqual([])
  })

  test('a display block is held until it closes, then comes back whole', () => {
    const scanner = createLineScanner()
    expect(kinds(scanner.push('Intro\n> $$\n', false))).toEqual(['Intro\n'])
    expect(scanner.push('> a +\n', false)).toEqual([])
    expect(scanner.push('> b\n', false)).toEqual([])
    expect(scanner.push('> $$\nafter\n', false)).toEqual([
      { kind: 'text', text: '> ', start: 6, end: 8 },
      { kind: 'math', display: true, tex: 'a +\nb', raw: '$$\n> a +\n> b\n> $$', delimiter: '$$', start: 8, end: 25 },
      { kind: 'text', text: '\nafter\n', start: 25, end: 32 },
    ])
  })

  test('environments and math fences are held too', () => {
    const scanner = createLineScanner()
    expect(scanner.push('\\begin{align}\n', false)).toEqual([])
    expect(kinds(scanner.push('x\n\\end{align}\n', false))).toEqual([['env', true, '\\begin{align}\nx\n\\end{align}'], '\n'])
    expect(scanner.push('```math\ny\n', false)).toEqual([])
    expect(kinds(scanner.push('```\n', true))).toEqual([['fence', true, 'y'], '\n'])
  })

  test('fence state carries across pushes', () => {
    const scanner = createLineScanner()
    expect(kinds(scanner.push('```sh\n', false))).toEqual(['```sh\n'])
    expect(kinds(scanner.push('echo $x$\n', false))).toEqual(['echo $x$\n'])
    expect(kinds(scanner.push('$$\n', false))).toEqual(['$$\n'])
    expect(kinds(scanner.push('```\n', false))).toEqual(['```\n'])
    expect(kinds(scanner.push('$y$\n', true))).toEqual([['$', false, 'y'], '\n'])
  })

  test('a block that gives up comes back as text when it does', () => {
    const scanner = createLineScanner()
    expect(scanner.push('$$ is the display delimiter\n', false)).toEqual([])
    expect(kinds(scanner.push('\n', false))).toEqual(['$$ is the display delimiter\n\n'])
  })

  test('a line waiting for an inline closer is held until the paragraph settles it', () => {
    const scanner = createLineScanner()
    expect(kinds(scanner.push('First line.\nLet $a +\n', false))).toEqual(['First line.\n'])
    expect(kinds(scanner.push('b$ hold.\n', false))).toEqual(['Let ', ['$', false, 'a +\nb'], ' hold.\n'])
    expect(kinds(scanner.push('It costs $5\n', false))).toEqual([])
    expect(kinds(scanner.push('\n', false))).toEqual(['It costs $5\n\n'])
    expect(kinds(scanner.push('Use `a\n', false))).toEqual([])
    expect(kinds(scanner.push('$x$` here\n', true))).toEqual(['Use `a\n$x$` here\n'])
  })

  test('a last line holding `\\|` waits for the next: a delimiter row under it makes it a table header', () => {
    const scanner = createLineScanner()
    expect(kinds(scanner.push('| $\\|v\\|$ | b |\n', false))).toEqual([])
    expect(kinds(scanner.push('|---|---|\n| $\\|w\\|$ | c |\n', false))).toEqual(['| ', ['$', false, '|v|'], ' | b |\n|---|---|\n| ', ['$', false, '|w|'], ' | c |\n'])
    // In prose the line comes once the next one says no table starts, its `\\|` a norm.
    const prose = createLineScanner()
    expect(kinds(prose.push('The norm $\\|x\\|$\n', false))).toEqual([])
    expect(kinds(prose.push('is positive.\n', false))).toEqual(['The norm ', ['$', false, '\\|x\\|'], '\nis positive.\n'])
    expect(kinds(prose.push('\n', true))).toEqual(['\n'])
  })

  test('final flushes an unclosed block as text', () => {
    const scanner = createLineScanner()
    expect(scanner.push('Intro\n\n$$\n\\frac{a}{b}\n', false)).toEqual([{ kind: 'text', text: 'Intro\n\n', start: 0, end: 7 }])
    expect(scanner.push('', true)).toEqual([{ kind: 'text', text: '$$\n\\frac{a}{b}\n', start: 7, end: 22 }])
  })

  test('final flushes an unclosed math fence as text', () => {
    const scanner = createLineScanner()
    expect(scanner.push('```math\nx\n', false)).toEqual([])
    expect(kinds(scanner.push('y $z$', true))).toEqual(['```math\nx\ny $z$'])
  })

  test('the last batch may end mid-line', () => {
    const scanner = createLineScanner()
    expect(kinds(scanner.push('$$\nx\n', false))).toEqual([])
    expect(kinds(scanner.push('$$', true))).toEqual([['$$', true, 'x']])
    const other = createLineScanner()
    expect(kinds(other.push('a $x', true))).toEqual(['a $x'])
  })

  test('a partial line is kept until the rest of it arrives', () => {
    const scanner = createLineScanner()
    expect(scanner.push('a $', false)).toEqual([])
    expect(kinds(scanner.push('x$ b\n', false))).toEqual(['a ', ['$', false, 'x'], ' b\n'])
  })

  describe('hold limit', () => {
    test('a block held past maxHeldLines is released as text, the rest of it too', () => {
      const scanner = createLineScanner({ maxHeldLines: 3 })
      expect(scanner.push('$$\n', false)).toEqual([])
      expect(scanner.push('a\n', false)).toEqual([])
      expect(scanner.push('b\n', false)).toEqual([])
      expect(kinds(scanner.push('c\n', false))).toEqual(['$$\na\nb\nc\n'])
      expect(kinds(scanner.push('d $x$\n', false))).toEqual(['d $x$\n'])
      expect(kinds(scanner.push('$$\n', false))).toEqual(['$$\n'])
      expect(kinds(scanner.push('$y$\n', true))).toEqual([['$', false, 'y'], '\n'])
    })

    test('a released block ends where the block would have given up', () => {
      const scanner = createLineScanner({ maxHeldLines: 1 })
      expect(scanner.push('\\[\n', false)).toEqual([])
      expect(kinds(scanner.push('a\n', false))).toEqual(['\\[\na\n'])
      expect(kinds(scanner.push('\n$y$\n', true))).toEqual(['\n', ['$', false, 'y'], '\n'])
    })

    test('the default limit is 40 lines', () => {
      const scanner = createLineScanner()
      expect(scanner.push('$$\n', false)).toEqual([])
      for (let i = 0; i < 39; i++) expect(scanner.push(`x_${i}\n`, false)).toEqual([])
      expect(scanner.push('x\n', false)).toHaveLength(1)
    })

    test('a block that arrives whole in one batch is never released', () => {
      const body = Array.from({ length: 100 }, (_, i) => `x_{${i}} \\\\`).join('\n')
      const scanner = createLineScanner({ maxHeldLines: 5 })
      expect(kinds(scanner.push(`$$\n${body}\n$$\n`, false))).toEqual([['$$', true, body], '\n'])
    })

    test('a math fence past the limit is released and stays code', () => {
      const scanner = createLineScanner({ maxHeldLines: 2 })
      expect(scanner.push('```math\n', false)).toEqual([])
      expect(scanner.push('a\n', false)).toEqual([])
      expect(kinds(scanner.push('b\n', false))).toEqual(['```math\na\nb\n'])
      expect(kinds(scanner.push('$c$\n', false))).toEqual(['$c$\n'])
      expect(kinds(scanner.push('```\n$d$', true))).toEqual(['```\n', ['$', false, 'd']])
    })

    test('a paragraph held past the limit is released', () => {
      const scanner = createLineScanner({ maxHeldLines: 2 })
      expect(scanner.push('costs $5\n', false)).toEqual([])
      expect(scanner.push('and more\n', false)).toEqual([])
      expect(kinds(scanner.push('and more\n', false))).toEqual(['costs $5\nand more\nand more\n'])
    })
  })
})

// ─── streaming equals scan ───────────────────────────────────────────────────

const PIECES = [
  'plain words',
  '$x$',
  '$a + b = c$',
  '$5',
  '$10',
  '\\$3',
  '$ s $',
  '$a',
  'b$',
  '$$y$$',
  '$$',
  '\\(z\\)',
  '\\(',
  '\\)',
  '`code $c$`',
  '``a ` b``',
  '`',
  '\\`',
  '\\\\',
  'and',
  'costs',
  '(',
]

const LINES = [
  '',
  '',
  '$$',
  '$$',
  '$$ a + b $$',
  '$$ x',
  'y $$',
  '$$ end $$ trailing',
  '\\[',
  '\\]',
  '\\[ q \\]',
  '\\begin{align}',
  'a &= b \\\\',
  '\\end{align}',
  '\\begin{equation*}',
  '\\end{equation*}',
  '```',
  '```math',
  '~~~',
  '````',
  '```python',
  '    indented $i$',
  '> $$',
  '> x',
  '> $$',
  '> text $q$',
  '> ',
  '- item $l$',
  '  $$',
  '1. one',
  '# head $h$',
  '| $t$ | u |',
]

function randomLine(random: () => number): string {
  if (random() < 0.45) {
    const n = 1 + Math.floor(random() * 6)
    return Array.from({ length: n }, () => PIECES[Math.floor(random() * PIECES.length)]!).join(' ')
  }
  return LINES[Math.floor(random() * LINES.length)]!
}

function randomDoc(random: () => number, maxLines: number): string {
  const n = 1 + Math.floor(random() * maxLines)
  const text = Array.from({ length: n }, () => randomLine(random)).join('\n')
  return random() < 0.5 ? `${text}\n` : text
}

function randomSoup(random: () => number): string {
  const alphabet = '$$$```\\\\()[]{}>-~#| \n\nab12'
  const n = Math.floor(random() * 120)
  let text = ''
  for (let i = 0; i < n; i++) text += alphabet[Math.floor(random() * alphabet.length)]
  return text
}

function expectStreamEqualsScan(text: string, random: () => number, maxHeldLines?: number) {
  const whole = checked(text, scan(text))
  for (let trial = 0; trial < 4; trial++) {
    const batches = splitLines(text, random)
    if (random() < 0.2) batches.push('')
    const segments = stream(batches, { maxHeldLines })
    for (const batch of segments) {
      for (let i = 1; i < batch.length; i++) expect(batch[i - 1]!.kind === 'text' && batch[i]!.kind === 'text').toBe(false)
    }
    const joined = merge(segments.flat())
    if (JSON.stringify(joined) !== JSON.stringify(whole)) {
      expect({ text, batches, segments: joined }).toEqual({ text, batches, segments: whole })
    }
  }
}

describe('streaming equals scan for any split at line boundaries', () => {
  test('random replies within the hold limit', () => {
    const random = rng(1)
    for (let i = 0; i < 1500; i++) expectStreamEqualsScan(randomDoc(random, 40), random)
  })

  test('random longer replies without a hold limit', () => {
    const random = rng(2)
    for (let i = 0; i < 400; i++) expectStreamEqualsScan(randomDoc(random, 150), random, Infinity)
  })

  test('random character soup', () => {
    const random = rng(3)
    for (let i = 0; i < 3000; i++) expectStreamEqualsScan(randomSoup(random), random, Infinity)
  })

  test('random replies keep every segment invariant under the default limit', () => {
    const random = rng(4)
    for (let i = 0; i < 300; i++) {
      const text = randomDoc(random, 150)
      checked(text, merge(stream(splitLines(text, random)).flat()))
    }
  })
})
