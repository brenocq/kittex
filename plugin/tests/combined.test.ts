// The layout batch together: a heading, a quote or a table right next to
// prose (blockParts) is laid out by its own replay, links in each follow the
// engine's link mode, and emoji take two cells in all of them. The landed
// plan of fixtures like these was checked live on resumed sessions (klabr and
// kittex, 100 and 60 columns, with and without hyperlinks): every image lay
// over its preview, the rest matched the replays cell for cell.

import { describe, expect } from 'claude-code/testing'

import { init, layoutHeading, layoutList, layoutProse, layoutQuote, layoutTable, measureDisplay, renderDisplay, renderInline, textWidth } from '../hooks/core.js'
import { inlineEnvFor, MessageStream, placeable, planLanded, proseWidthFor, renderEnvFor } from '../hooks/math.ts'
import type { KittexEnv, Piece, PreviewRecord, StreamEnv } from '../hooks/math.ts'
import { kittyEnv, test } from './support.ts'

const kitty26 = (hyperlinks?: boolean): KittexEnv => ({ ...kittyEnv(), cellHeight: 26, ...(hyperlinks === undefined ? {} : { hyperlinks }) })
const inlineOn = (hyperlinks?: boolean): StreamEnv => ({ ...kitty26(hyperlinks), inline: true })
const WIDTH = proseWidthFor(kitty26())
const COLUMNS = kitty26().columns

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
    inline: { env: inlineEnv, width: WIDTH, columns: env.columns, draw: (tex, columns, place) => renderInline(tex, inlineEnv, columns, place), hyperlinks: env.hyperlinks },
  })
}

/** Each prose piece: its first line, its gap, the formulas drawn over it with their row and column. */
function shape(pieces: readonly Piece[]): [string, boolean, [string, number, number][]][] {
  return pieces.map(piece => [
    piece.kind === 'prose' ? piece.text.split('\n')[0]! : piece.kind,
    piece.gap,
    piece.kind === 'prose' ? (piece.inline ?? []).map(image => [image.tex, image.row, image.col] as [string, number, number]) : [],
  ])
}

/** Every image of a prose piece lies over its preview in the piece's own drawing (its replay, found by its first characters). */
function expectOverPreviews(pieces: readonly Piece[], records: readonly PreviewRecord[], hyperlinks?: boolean) {
  const mode = { hyperlinks }
  for (const piece of pieces) {
    if (piece.kind !== 'prose' || !piece.inline?.length) continue
    const text = piece.text
    const layout = text.startsWith('|')
      ? layoutTable(text, COLUMNS, [], WIDTH, mode)
      : text.startsWith('#')
        ? layoutHeading(text, WIDTH, [], mode)
        : text.startsWith('>')
          ? layoutQuote(text, WIDTH, [], mode)
          : (layoutProse(text, WIDTH, [], mode) ?? layoutList(text, WIDTH, [], mode))
    expect(layout).not.toBeNull()
    for (const image of piece.inline) {
      const record = records.find(one => one.tex === image.tex)
      const preview = (record?.preview ?? '').replace(/\\(.)/g, '$1')
      const line = layout!.lines[image.row]!
      const at = line.indexOf(preview)
      expect([image.tex, at >= 0]).toEqual([image.tex, true])
      expect([image.tex, image.col]).toEqual([image.tex, textWidth(line.slice(0, at))])
      expect(image.image.columns).toBe(textWidth(preview))
    }
  }
}

describe('parts laid out by their own replays', () => {
  test('a paragraph right above a table: both get their images, the table a blank row under the paragraph', async () => {
    await init()
    const { landed, records } = streamed(['Values of $\\alpha$ and $x_k$:\n', '| Symbol | Value |\n', '|---|---|\n', '| $\\alpha$ | $10^{-3}$ |\n'])
    expect(records.map(record => record.tex)).toEqual(['\\alpha', 'x_k', '\\alpha', '10^{-3}'])
    const { pieces } = plan(landed, records)
    expect(shape(pieces).map(([text, gap, images]) => [text.slice(0, 9), gap, images.map(([tex]) => tex)])).toEqual([
      ['Values of', false, ['\\alpha', 'x_k']],
      ['| Symbol ', true, ['\\alpha', '10^{-3}']],
    ])
    expectOverPreviews(pieces, records)
  })

  test('a heading right above a list: the heading and every item get their images', async () => {
    await init()
    const { landed, records } = streamed(['### Steps for $u_k$\n', '- predict $x_k$\n', '- update with $K_k$\n'])
    expect(records.map(record => record.tex)).toEqual(['u_k', 'x_k', 'K_k'])
    const { pieces } = plan(landed, records)
    expect(shape(pieces).map(([text, gap, images]) => [text, gap, images.map(([tex, row]) => [tex, row])])).toEqual([
      [expect.stringMatching(/^### Steps for /), false, [['u_k', 0]]],
      [expect.stringMatching(/^- predict /), true, [['x_k', 0], ['K_k', 1]]],
    ])
    expectOverPreviews(pieces, records)
  })

  test('a quote right under a paragraph, holding an emoji next to inline math', async () => {
    await init()
    const { landed, records } = streamed(['The gain $K_k$:\n', '> ✅ done: $K_k = P H^T S^{-1}$ 🚀 and 😀$z_k$\n'])
    expect(records.map(record => record.tex)).toEqual(['K_k', 'K_k = P H^T S^{-1}', 'z_k'])
    const { pieces } = plan(landed, records)
    expect(shape(pieces).map(([text, gap, images]) => [[...text].slice(0, 3).join(''), gap, images])).toEqual([
      ['The', false, [['K_k', 0, 'The gain '.length]]],
      // The bar and a space, then two cells for each emoji.
      ['> ✅', true, [['K_k = P H^T S^{-1}', 0, 2 + 2 + ' done: '.length], ['z_k', 0, 2 + 2 + ' done: '.length + records[1]!.columns! + ' '.length + 2 + ' and '.length + 2]]],
    ])
    expectOverPreviews(pieces, records)
  })

  test('emoji in a heading and in a table cell take two cells', async () => {
    await init()
    const { pieces } = plan('## 🚀 Launch at $t_0$\n| Stage | Thrust |\n|---|---|\n| ⭐ one | $F = ma$ ✅ |')
    expect(shape(pieces).map(([text, gap, images]) => [[...text].slice(0, 4).join(''), gap, images.map(([tex, , col]) => [tex, col])])).toEqual([
      ['## 🚀', false, [['t_0', 2 + ' Launch at '.length]]],
      ['| St', true, [['F = ma', expect.any(Number)]]],
    ])
    const table = pieces[1]!.kind === 'prose' ? pieces[1]! : undefined
    const layout = layoutTable(table!.text, COLUMNS, [], WIDTH)!
    // The emoji's row: the cell after ⭐ one starts where its two cells end.
    expect(layout.lines[3]).toMatch(/^│ ⭐ one │ /)
    expect(table!.inline![0]!.col).toBe(textWidth('│ ⭐ one │ '))
  })
})

describe('links in headings, quotes and tables', () => {
  const reply = [
    '## The state $x_k$ and [docs](https://example.com/kf) 🚀\n',
    'Right under it, $P_k = A P_{k-1} A^T + Q$ with [a link](https://example.com/x) and acme/kf#12.\n',
    '> Quoted ✅ next to $K_k$ and acme/kf#7, then $z_k = H x_k$ with [more](https://example.com/q).\n',
    '\n',
    'Values right above the table, $\\alpha$:\n',
    '| Symbol | Meaning |\n',
    '|---|---|\n',
    '| $\\alpha$ 🚀 | the [rate](https://example.com/r) |\n',
    '| $\\beta_1$ | acme/kf#3 |\n',
    '\n',
    '### Steps 😀 with $u_k$\n',
    '- first [item](https://example.com/i) with $w_k$ and ⭐\n',
    '- second, $v_k$\n',
  ]
  const TEXES = ['x_k', 'P_k = A P_{k-1} A^T + Q', 'K_k', 'z_k = H x_k', '\\alpha', '\\alpha', '\\beta_1', 'u_k', 'w_k', 'v_k']

  for (const hyperlinks of [true, false]) {
    test(`with ${hyperlinks ? 'hyperlinks' : 'links drawn as text'}, every formula streams padded and lands over its preview`, async () => {
      await init()
      const { landed, records } = streamed(reply, inlineOn(hyperlinks))
      expect(records.map(record => record.tex)).toEqual(TEXES)
      const { pieces } = plan(landed, records, kitty26(hyperlinks))
      expect(pieces.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []).map(image => image.tex) : []))).toEqual(TEXES)
      expectOverPreviews(pieces, records, hyperlinks)
      // After --resume the LaTeX is typeset in the same places.
      expect(shape(plan(reply.join('').trimEnd(), [], kitty26(hyperlinks)).pieces)).toEqual(shape(pieces))
    })
  }

  test('the places the live check saw (100 columns, hyperlinks)', async () => {
    await init()
    const { pieces } = plan(reply.join('').trimEnd(), [], kitty26(true))
    expect(shape(pieces).map(([, gap, images]) => [gap, images])).toEqual([
      [false, [['x_k', 0, 10]]],
      [true, [['P_k = A P_{k-1} A^T + Q', 0, 16]]],
      [true, [['K_k', 0, 20], ['z_k = H x_k', 0, 44]]],
      [true, [['\\alpha', 0, 30]]],
      [true, [['\\alpha', 3, 2], ['\\beta_1', 5, 2]]],
      [true, [['u_k', 0, 14]]],
      [true, [['w_k', 0, 18], ['v_k', 1, 10]]],
    ])
  })

  test('with the link mode unknown, the parts holding links keep their text', async () => {
    await init()
    const { landed, records } = streamed(reply)
    // Streaming sees the rest of the formula's line: a heading, a quote or a table row holding a link isn't
    // padded; in a paragraph what precedes its first link is laid out exactly, so it streams padded.
    expect(records.map(record => record.tex)).toEqual(['P_k = A P_{k-1} A^T + Q', '\\alpha', 'u_k'])
    // Landed, every formula streamed padded gets its image: no pad stays behind.
    const { pieces } = plan(landed, records)
    expect(pieces.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []).map(image => image.tex) : []))).toEqual(['P_k = A P_{k-1} A^T + Q', '\\alpha', 'u_k'])
    expect(pieces.map(piece => (piece.kind === 'prose' ? piece.text : '')).join('').replace(/\s+/g, '')).toBe(landed.replace(/\s+/g, ''))
    expect(placeable('## See [docs](https://example.com) for ', WIDTH, COLUMNS)).toBe(false)
    expect(placeable('## See [docs](https://example.com) for ', WIDTH, COLUMNS, { hyperlinks: true })).toBe(true)
    expect(placeable('> See [docs](https://example.com) for ', WIDTH, COLUMNS, { hyperlinks: false })).toBe(true)
    expect(placeable('| a | b |\n|---|---|\n| [x](https://example.com/y) ', WIDTH, COLUMNS)).toBe(false)
    expect(placeable('| a | b |\n|---|---|\n| [x](https://example.com/y) ', WIDTH, COLUMNS, { hyperlinks: true })).toBe(true)
  })
})
