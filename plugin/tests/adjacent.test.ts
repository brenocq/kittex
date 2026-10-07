// Inline math in a block of several parts with no blank line between them (a
// heading right above a paragraph, a paragraph right above a list or a code
// block): streamed padded and given images at landing, each part drawn as a
// piece of its own with the blank row above it the engine's drawing of the
// whole has, or none (core/src/layout/blocks.ts, measured live on Claude Code
// 2.1.291, research/lab runs AB-*).

import { describe, expect } from 'claude-code/testing'

import { init, measureDisplay, renderDisplay, renderInline } from '../hooks/core.js'
import { inlineEnvFor, joinProse, MessageStream, placeable, planLanded, proseWidthFor, renderEnvFor } from '../hooks/math.ts'
import type { KittexEnv, Piece, PreviewRecord, StreamEnv } from '../hooks/math.ts'
import { kittyEnv, pieceLines, test } from './support.ts'

const kitty26 = (): KittexEnv => ({ ...kittyEnv(), cellHeight: 26 })
const inlineOn = (): StreamEnv => ({ ...kitty26(), inline: true })
const WIDTH = proseWidthFor(kitty26())

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
    draw: (tex, rows) => renderDisplay(tex, renderEnv, rows ?? measureDisplay(tex, renderEnv).rows),
    width: WIDTH,
    inline: { env: inlineEnv, width: WIDTH, draw: (tex, columns, place) => renderInline(tex, inlineEnv, columns, place) },
  })
}

/** Each piece: its text, its gap, the formulas drawn over it. */
function shape(pieces: readonly Piece[]): [string, boolean, string[]][] {
  return pieces.map(piece => [piece.kind === 'prose' ? piece.text : piece.kind, piece.gap, piece.kind === 'prose' ? (piece.inline ?? []).map(image => image.tex) : []])
}

/**
 * The rows of a reply drawn as kittex composes its pieces (each laid out on
 * its own, a blank row above it where it has a gap), and where each image
 * lands in them: they must be the rows and cells of the formula's preview in
 * the engine's drawing of the whole.
 */
function composed(pieces: readonly Piece[]): { rows: string[]; images: [string, number, number][] } {
  const rows: string[] = []
  const images: [string, number, number][] = []
  for (const piece of pieces) {
    if (piece.kind !== 'prose') throw new Error('prose only')
    // Its parts one under the other, a code block its lines inside the fences.
    const lines = pieceLines(piece.text, WIDTH, WIDTH + 2, {}, true)!
    if (piece.gap) rows.push('')
    for (const image of piece.inline ?? []) images.push([image.tex, rows.length + image.row, image.col])
    rows.push(...lines)
  }
  return { rows, images }
}

describe('adjacent blocks: streaming', () => {
  test('a paragraph right under a heading, or right above a list or a code block, streams padded', async () => {
    await init()
    for (const flushes of [
      ['## The model\n', 'Text with $x_k$ in it.\n'],
      ['Text with $x_k$ in it:\n', '- a\n'],
      ['```python\n', 'x = 1\n', '```\n', 'After the code, $x_k$.\n'],
      ['### Steps\n', '- predict $x_k$\n'],
    ]) {
      const { records } = streamed(flushes)
      expect(records.map(record => record.tex)).toEqual(['x_k'])
    }
  })

  test('math in a heading, a quote or a table right under a paragraph streams padded too', async () => {
    await init()
    for (const flushes of [['Intro.\n', '## The $x_k$ case\n'], ['Intro:\n', '> quoted $x_k$\n'], ['Intro:\n', '| $x_k$ | b |\n']]) {
      expect(streamed(flushes).records.map(record => record.tex)).toEqual(['x_k'])
    }
  })

  test('the check looks at the part the formula lands in', () => {
    expect(placeable('## Title\nText ', WIDTH)).toBe(true)
    expect(placeable('Text\n## Title ', WIDTH)).toBe(true)
    expect(placeable('```\ncode\n```\nafter ', WIDTH)).toBe(true)
    expect(placeable('Text:\n```\ncode ', WIDTH)).toBe(false)
    expect(placeable('### Steps\n- item ', WIDTH)).toBe(true)
    expect(placeable('Text\n> quote ', WIDTH)).toBe(true)
    expect(placeable('Text\n> ```\n> code ', WIDTH)).toBe(false)
  })
})

describe('adjacent blocks: the landed plan', () => {
  test('a heading, then a paragraph: the paragraph a blank row under it, in one piece', async () => {
    await init()
    const { landed, records } = streamed(['## The model\n', 'Text with $x_k$ in it.\n'])
    const { pieces } = plan(landed, records)
    expect(shape(pieces).map(([text, gap, texes]) => [text.split('\n')[0], gap, texes])).toEqual([['## The model', false, ['x_k']]])
    expect(composed(pieces).images).toEqual([['x_k', 2, 'Text with '.length]])
  })

  test('a paragraph right above a heading, a list and a code block: no blank row between them', async () => {
    await init()
    const flushes = [
      'Text with $a$ in it.\n',
      '## Then a heading\n',
      'Where $b$ is:\n',
      '- the item $c$\n',
      '```python\n',
      'x = 1\n',
      '```\n',
      'After the code, $d$.\n',
    ]
    const { landed, records } = streamed(flushes)
    expect(records.map(record => record.tex)).toEqual(['a', 'b', 'c', 'd'])
    const { pieces } = plan(landed, records)
    // One piece down to the code block, whose rows the replay doesn't know: the paragraph under it is a piece of its own.
    expect(shape(pieces).map(([text, gap, texes]) => [text.split('\n')[0], gap, texes])).toEqual([
      [expect.stringMatching(/^Text with /), false, ['a', 'b', 'c']],
      [expect.stringMatching(/^After the code/), false, ['d']],
    ])
    // Rows: the paragraph, the heading, a blank row, the paragraph, the list, the code's one line, the paragraph.
    expect(composed(pieces).images.map(([tex, row, col]) => [tex, row, col])).toEqual([
      ['a', 0, 'Text with '.length],
      ['b', 3, 'Where '.length],
      ['c', 4, '- the item '.length],
      ['d', 6, 'After the code, '.length],
    ])
  })

  test('a table or a quote right under a paragraph: a blank row between them', async () => {
    await init()
    const { landed, records } = streamed(['Values of $x$:\n', '| a | b |\n', '|---|---|\n', '| 1 | 2 |\n'])
    const { pieces } = plan(landed, records)
    expect(shape(pieces).map(([text, gap, texes]) => [text.split('\n')[0], gap, texes])).toEqual([[expect.stringMatching(/^Values of /), false, ['x']]])
    expect(pieceLines(pieces[0]!.kind === 'prose' ? pieces[0]!.text : '', WIDTH, WIDTH + 2)![1]).toBe('')
  })

  test('a display formula in a blockquote right under a paragraph lies over its preview in the quote', async () => {
    await init()
    const { landed, records } = streamed(['Intro, with $x$:\n', '> The filter:\n', '>\n', '> $$\n', '> \\frac{a}{b} = K_k\n', '> $$\n'])
    const { pieces } = plan(landed, records)
    expect(shape(pieces).map(([text, gap, texes]) => [text.split('\n')[0], gap, texes])).toEqual([[expect.stringMatching(/^Intro, with /), false, ['x', '\\frac{a}{b} = K_k']]])
    // A blank row under the paragraph, then under the quote's first line and the blank `>` line, two cells in (the bar and a space).
    const quoted = pieces[0]!.kind === 'prose' ? pieces[0]!.inline![1]! : undefined
    expect([quoted?.row, quoted?.col, quoted?.display]).toEqual([2 + 2, 2, true])
  })

  test('a paragraph streamed before the list under it arrived keeps its place once the list lands', async () => {
    await init()
    // The padding is decided on the paragraph line alone; the list comes in a later flush.
    const { landed, records } = streamed(['The state has two parts, $x$ and $v$:\n', '- position $x$\n', '- velocity $v$\n'])
    expect(records.map(record => record.tex)).toEqual(['x', 'v', 'x', 'v'])
    const { pieces } = plan(landed, records)
    const placed = composed(pieces).images
    expect(placed.map(([tex, row]) => [tex, row])).toEqual([
      ['x', 0],
      ['v', 0],
      ['x', 1],
      ['v', 2],
    ])
    expect(joinProse(pieces).replace(/\n/g, '')).toBe(landed.replace(/\n+$/, '').replace(/\n/g, ''))
  })

  test('after --resume the LaTeX gets the same pieces and images', async () => {
    await init()
    const text = '## The model\nText with $x_k$ in it.\n- the item $c$\n```python\nx = 1\n```\nAfter the code, $d$.'
    const { landed, records } = streamed(text.split(/(?<=\n)/))
    expect(plan(text).pieces).toEqual(plan(landed, records).pieces)
  })

  test('a block whose parts are not all followed is laid out up to what is not (FUZZ-3), and keeps its Unicode past it', async () => {
    await init()
    const { pieces } = plan('Text with $x$ here\n<div>\nhtml\n</div>')
    expect(pieces.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []).map(image => [image.tex, image.row, image.col]) : []))).toEqual([['x', 0, 10]])
    expect(pieces.map(piece => (piece.kind === 'prose' ? piece.text : '')).join('')).toContain('<div>\nhtml\n</div>')
    const after = plan('<div>\nhtml\n</div>\nText with $x$ here').pieces
    expect(after.every(piece => piece.kind !== 'prose' || !piece.inline?.length)).toBe(true)
  })
})
