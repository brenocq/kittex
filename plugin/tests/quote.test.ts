// Inline math in headings and blockquotes: streamed padded and given images
// at landing, placed by the replay of the engine's heading and quote drawing
// (a heading is prose with no marker; a quote is a box with a bar and its
// text two cells in, nested quotes and lists drawn as text), measured live on
// Claude Code 2.1.291 (research/lab runs HQ-*).

import { describe, expect } from 'claude-code/testing'

import { init, layoutHeading, layoutQuote, measureDisplay, renderDisplay, renderInline, textWidth } from '../hooks/core.js'
import { inlineEnvFor, MessageStream, placeable, planLanded, proseWidthFor, quotesOpening, renderEnvFor } from '../hooks/math.ts'
import type { KittexEnv, PreviewRecord, StreamEnv } from '../hooks/math.ts'
import { kittyEnv, test } from './support.ts'

const kitty26 = (): KittexEnv => ({ ...kittyEnv(), cellHeight: 26 })
const inlineOn = (): StreamEnv => ({ ...kitty26(), inline: true })

function streamed(flushes: readonly string[], env: StreamEnv = inlineOn()): { landed: string; records: PreviewRecord[] } {
  const stream = new MessageStream()
  let landed = ''
  const records: PreviewRecord[] = []
  for (const [i, delta] of flushes.entries()) {
    const flush = stream.push(delta, i === flushes.length - 1, env)
    landed += flush.text
    records.push(...flush.records)
  }
  return { landed, records }
}

function plan(text: string, records: readonly PreviewRecord[] = [], env: KittexEnv = kitty26()) {
  const renderEnv = renderEnvFor(env)
  const inlineEnv = inlineEnvFor(env)
  return planLanded(text, records, {
    maxColumns: renderEnv.maxColumns,
    draw: (tex, rows, maxColumns) => {
      const at = maxColumns === undefined ? renderEnv : { ...renderEnv, maxColumns }
      return renderDisplay(tex, at, rows ?? measureDisplay(tex, at).rows)
    },
    width: proseWidthFor(env),
    measure: (tex, maxColumns) => measureDisplay(tex, { ...renderEnv, maxColumns }).rows,
    inline: { env: inlineEnv, width: proseWidthFor(env), draw: (tex, columns, place) => renderInline(tex, inlineEnv, columns, place) },
  })
}

type Pieces = ReturnType<typeof plan>['pieces']

function places(pieces: Pieces): [string, number, number, number][] {
  return pieces.flatMap(piece =>
    piece.kind === 'prose' ? (piece.inline ?? []).map(img => [img.tex, img.row, img.col, img.image.columns] as [string, number, number, number]) : [],
  )
}

/** Every inline image lies over its preview, in the replay's own rows of its piece (a heading's or a quote's). */
function expectOverPreviews(pieces: Pieces, records: readonly PreviewRecord[], width: number) {
  let seen = 0
  for (const piece of pieces) {
    if (piece.kind !== 'prose' || !piece.inline) continue
    const layout = piece.text.startsWith('>') ? layoutQuote(piece.text, width) : layoutHeading(piece.text, width)
    expect(layout).not.toBeNull()
    for (const image of piece.inline) {
      const record = records.find(one => one.tex === image.tex && one.inline)
      if (!record) continue
      const preview = record.preview.replace(/\\(.)/g, '$1')
      const cells = [...layout!.lines[image.row]!]
      let col = 0
      let at = 0
      while (at < cells.length && !cells.slice(at).join('').startsWith(preview)) {
        col += textWidth(cells[at]!)
        at += 1
      }
      expect(at).toBeLessThan(cells.length)
      expect(image.col).toBe(col)
      seen += 1
    }
  }
  return seen
}

describe('headings', () => {
  test('inline math in a heading streams padded, with records, at every level', async () => {
    await init()
    for (const line of ['# The $x_k$ state\n', '### The $x_k$ state\n', '###### $x_k$\n']) {
      const { records } = streamed([line])
      expect(records.map(record => [record.tex, record.inline])).toEqual([['x_k', true]])
    }
    expect(placeable('## The ', 98)).toBe(true)
  })

  test('lands with each image over its preview, in the heading text with no marker', async () => {
    await init()
    const { landed, records } = streamed(['## The $x_k$ state and $u_k$\n', '\n', 'Then $y$ follows.\n'])
    const { pieces } = plan(landed, records)
    // One piece: the paragraph a blank row under the heading.
    expect(places(pieces).map(([tex, row]) => [tex, row])).toEqual([
      ['x_k', 0],
      ['u_k', 0],
      ['y', 2],
    ])
    expect(places(pieces)[0]![2]).toBe('The '.length)
    expect(pieces.map(piece => [piece.kind, piece.gap])).toEqual([['prose', false]])
    const heading = pieces[0]!.kind === 'prose' ? { ...pieces[0]!, text: pieces[0]!.text.split('\n')[0]!, inline: pieces[0]!.inline!.slice(0, 2) } : pieces[0]!
    expect(expectOverPreviews([heading], records, proseWidthFor(kitty26()))).toBe(2)
  })

  test('a long heading wraps as prose: a formula at the start of a row, and one ending the heading', async () => {
    await init()
    const env = { ...kitty26(), columns: 42 }
    const words = 'the value of the function at each point we take'
    const { landed, records } = streamed([`# ${words} $x_k$ ${words} $u_k$\n`], { ...env, inline: true })
    const { pieces } = plan(landed, records, env)
    expect(places(pieces).map(([tex]) => tex)).toEqual(['x_k', 'u_k'])
    expect(places(pieces)[1]![1]).toBeGreaterThan(0)
    expect(expectOverPreviews(pieces, records, proseWidthFor(env))).toBe(2)
  })

  test('after --resume the LaTeX gets the same previews and images', async () => {
    await init()
    const text = '## The $x_k$ state\n\nSetext $y$\n---'
    const { landed, records } = streamed(text.split(/(?<=\n)/))
    expect(plan(text).pieces).toEqual(plan(landed, records).pieces)
    expect(places(plan(text).pieces).map(([tex]) => tex)).toEqual(['x_k', 'y'])
  })
})

describe('blockquotes', () => {
  test('inline math in a quote streams padded, nested quotes and lists in quotes included', async () => {
    await init()
    for (const flushes of [
      ['> the $x_k$ state\n'],
      ['> a\n', '>\n', '> > nested $x_k$\n'],
      ['> Where:\n', '>\n', '> - $x_k$ the state\n', '>   1. $u_k$ the input\n'],
    ]) {
      const { records } = streamed(flushes)
      expect(records.length).toBeGreaterThan(0)
      expect(records.every(record => record.inline)).toBe(true)
    }
    expect(placeable('> quote ', 98)).toBe(true)
    expect(quotesOpening('> > nested ')).toBe(2)
    expect(quotesOpening('text > not a quote')).toBe(0)
  })

  test('lands with each image over its preview, two cells in, on the rows the engine wraps to', async () => {
    await init()
    const env = { ...kitty26(), columns: 50 }
    const flushes = [
      '> $x_k$ opens the quote, and a long line of words wraps onto the next rows of the quote $u_k$\n',
      '> soft break $y$\n',
      '>\n',
      '> > nested with $z$ and more words to wrap the nested line past the width\n',
      '>\n',
      '> - item $a$ with words that wrap past the row\n',
      '>   - nested item $b$\n',
    ]
    const { landed, records } = streamed(flushes, { ...env, inline: true })
    expect(records.map(record => record.tex)).toEqual(['x_k', 'u_k', 'y', 'z', 'a', 'b'])
    const { pieces } = plan(landed, records, env)
    expect(places(pieces).map(([tex]) => tex)).toEqual(['x_k', 'u_k', 'y', 'z', 'a', 'b'])
    // The first formula opens the quote's text: row 0, after the bar and its space.
    expect(places(pieces)[0]!.slice(1, 3)).toEqual([0, 2])
    expect(expectOverPreviews(pieces, records, proseWidthFor(env))).toBe(6)
  })

  test('a quote is drawn with the prose around it, its images on its rows under the paragraph above', async () => {
    await init()
    const { pieces } = plan('Intro.\n\n> a $x$ here\n\nOutro.')
    expect(pieces.map(piece => [piece.kind, piece.gap, piece.kind === 'prose' ? (piece.inline ?? []).map(image => [image.tex, image.row, image.col]) : []])).toEqual([
      ['prose', false, [['x', 2, 2 + 'a '.length]]],
    ])
  })

  test('display and inline math in one quote both get their images', async () => {
    await init()
    const text = '> For $x$:\n>\n> $$\n> x^2 + y^2 = 1\n> $$\n>\n> and $y$ too.'
    const { landed, records } = streamed(text.split(/(?<=\n)/))
    for (const pieces of [plan(landed, records).pieces, plan(text).pieces]) {
      const display = records.find(record => !record.inline)!
      expect(places(pieces).map(([tex, row, col]) => [tex, row, col])).toEqual([
        ['x', 0, 2 + 'For '.length],
        ['y', 3 + display.rows, 2 + 'and '.length],
        [display.tex, 2, 2],
      ])
    }
  })

  test('after --resume the LaTeX gets the same previews and images', async () => {
    await init()
    const text = '> the $x_k$ state\n>\n> > and $u_k$\n>\n> - item $y$'
    const { landed, records } = streamed(text.split(/(?<=\n)/))
    expect(plan(text).pieces).toEqual(plan(landed, records).pieces)
    expect(places(plan(text).pieces).map(([tex]) => tex)).toEqual(['x_k', 'u_k', 'y'])
  })

  test('a quote the replay does not follow keeps Unicode: a code block in it, a link', async () => {
    await init()
    for (const text of ['> ```\n> code\n> ```\n> the $x$ state', '> see [docs](https://example.com) for $x$']) {
      expect(places(plan(text).pieces)).toEqual([])
      expect(streamed(text.split(/(?<=\n)/)).records).toEqual([])
    }
  })

  test('a formula wider than a nested quote row streams plain', async () => {
    await init()
    const env = { ...kitty26(), columns: 24 }
    const tex = 'x_1 + x_2 + x_3 + x_4'
    expect(streamed([`So $${tex}$.\n`], { ...env, inline: true }).records).toHaveLength(1)
    expect(streamed([`> > > > > > So $${tex}$.\n`], { ...env, inline: true }).records).toEqual([])
  })
})
