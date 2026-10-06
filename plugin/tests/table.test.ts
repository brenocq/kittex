// Inline math in table cells: streamed padded (a table's first row while it
// still reads as a paragraph included) and given images at landing, placed by
// the replay of the engine's table drawing (core/src/layout/table.ts, measured
// live on Claude Code 2.1.291, research/lab runs TB-*).

import { describe, expect, test } from 'claude-code/testing'

import { init, layoutTable, measureDisplay, previewInline, renderDisplay, renderInline, textWidth } from '../hooks/core.js'
import { inlineEnvFor, joinProse, MessageStream, placeable, planLanded, proseWidthFor, renderEnvFor } from '../hooks/math.ts'
import type { KittexEnv, PreviewRecord, StreamEnv } from '../hooks/math.ts'
import { kittyEnv } from './support.ts'

const kitty26 = (columns = 100): KittexEnv => ({ ...kittyEnv(), cellHeight: 26, columns })
const inlineOn = (columns = 100): StreamEnv => ({ ...kitty26(columns), inline: true })

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
    width: proseWidthFor(env),
    inline: { env: inlineEnv, width: proseWidthFor(env), columns: env.columns, draw: (tex, columns) => renderInline(tex, inlineEnv, columns) },
  })
}

function places(pieces: ReturnType<typeof plan>['pieces']): [string, number, number, number][] {
  return pieces.flatMap(piece =>
    piece.kind === 'prose' ? (piece.inline ?? []).map(img => [img.tex, img.row, img.col, img.image.columns] as [string, number, number, number]) : [],
  )
}

/** Every image of a plan lies over its preview, on the replay's own row of the table. */
function expectOverPreviews(pieces: ReturnType<typeof plan>['pieces'], records: readonly PreviewRecord[], env: KittexEnv) {
  for (const piece of pieces) {
    if (piece.kind !== 'prose' || !piece.inline) continue
    const layout = layoutTable(piece.text, env.columns, [], proseWidthFor(env))!
    expect(layout).not.toBeNull()
    for (const image of piece.inline) {
      const preview = records.find(record => record.tex === image.tex)!.preview.replace(/\\(.)/g, '$1')
      const line = layout.lines[image.row]!
      const at = line.indexOf(preview)
      expect(at).toBeGreaterThanOrEqual(0)
      expect(image.col).toBe(textWidth(line.slice(0, at)))
      expect(image.image.columns).toBe(textWidth(preview))
    }
  }
}

const TABLE = [
  '| Symbol | Meaning | Value |\n',
  '|:---:|:---|---:|\n',
  '| $\\alpha$ | learning rate | $10^{-3}$ |\n',
  '| $\\beta_1, \\beta_2$ | moment decay rates for the running averages | $0.9$ |\n',
]

describe('tables: streaming', () => {
  test('inline math in every cell streams padded, with records, the header row included', async () => {
    await init()
    const flushes = ['| $x$ | $x^2$ |\n', '|---|---|\n', '| $2$ | $4$ |\n']
    const { landed, records } = streamed(flushes)
    expect(records.map(record => record.tex)).toEqual(['x', 'x^2', '2', '4'])
    for (const record of records) expect(landed).toContain(record.preview)
  })

  test('a row placeable while the table is followed, and not once a cell holds a link', () => {
    const head = '| a | b |\n|---|---|\n'
    expect(placeable(head + '| ', 98, 100)).toBe(true)
    expect(placeable('| first ', 98, 100)).toBe(true)
    expect(placeable(head + '| [x](y) | 2 |\n| ', 98, 100)).toBe(false)
    expect(placeable(head + '| `a|b` | 2 |\n| ', 98, 100)).toBe(false)
  })

  test('a table in a quote keeps plain Unicode', async () => {
    await init()
    const { landed, records } = streamed(['> | $x_k$ | state |\n', '> |---|---|\n'])
    expect(records).toEqual([])
    expect(landed).toContain(previewInline('x_k')!)
  })
})

describe('tables: landing', () => {
  test('each formula streamed padded gets its image over its preview, in its cell', async () => {
    await init()
    const { landed, records } = streamed(['Symbols:\n', '\n', ...TABLE, '\n', 'Done.\n'])
    const { pieces } = plan(landed, records)
    expect(places(pieces).map(([tex]) => tex)).toEqual(['\\alpha', '10^{-3}', '\\beta_1, \\beta_2', '0.9'])
    expectOverPreviews(pieces, records, kitty26())
    // Nothing else changes: the pieces join back to the text as it streamed.
    expect(joinProse(pieces).replace(/\s+/g, '')).toBe(landed.replace(/\s+/g, ''))
  })

  test('the header is centred, a right-aligned cell is padded on the left', async () => {
    await init()
    const { landed, records } = streamed(TABLE)
    const placed = places(plan(landed, records).pieces)
    const alpha = placed.find(([tex]) => tex === '\\alpha')!
    const value = placed.find(([tex]) => tex === '10^{-3}')!
    const layout = layoutTable(landed.trimEnd(), 100)!
    expect(alpha[1]).toBe(3)
    expect(layout.lines[3]!.slice(alpha[2] + alpha[3]).startsWith(' ')).toBe(true)
    expect(value[2] + value[3]).toBe(textWidth(layout.lines[3]!) - 2)
  })

  test('at a narrow width the table lands in its list form, images where a preview is whole on a row', async () => {
    await init()
    const env = inlineOn(30)
    const { landed, records } = streamed(TABLE, env)
    const { pieces } = plan(landed, records, kitty26(30))
    const layout = layoutTable(landed.trimEnd(), 30)!
    expect(layout.lines[0]!.startsWith('Symbol: ')).toBe(true)
    expect(places(pieces).length).toBe(4)
    expectOverPreviews(pieces, records, kitty26(30))
  })

  test('a paragraph right before the table lands with it', async () => {
    await init()
    const { landed, records } = streamed(['The symbols:\n', ...TABLE])
    const { pieces } = plan(landed, records)
    expect(pieces.filter(piece => piece.kind === 'prose' && piece.inline?.length).length).toBe(1)
    expect(places(pieces)[0]![1]).toBe(5)
  })

  test('LaTeX read back after --resume is typeset in its cells the same way', async () => {
    await init()
    const text = TABLE.join('').trimEnd()
    const { pieces } = plan(text)
    expect(places(pieces).map(([tex]) => tex)).toEqual(['\\alpha', '10^{-3}', '\\beta_1, \\beta_2', '0.9'])
    const { landed, records } = streamed(TABLE)
    expect(places(pieces)).toEqual(places(plan(landed, records).pieces))
  })

  test('a table the replay does not follow keeps its text as it streamed', async () => {
    await init()
    const flushes = ['| a | b |\n', '|---|---|\n', '| $x$ | [link](https://example.com) |\n']
    const { landed, records } = streamed(flushes)
    const { pieces } = plan(landed, records)
    expect(places(pieces)).toEqual([])
    expect(joinProse(pieces).trimEnd()).toBe(landed.trimEnd())
  })

  test('a bar inside a formula is escaped, so the table keeps its cells', async () => {
    await init()
    const { landed, records } = streamed(['| norm | $\\|x\\|$ |\n', '|---|---|\n', '| cond | $P(A|B)$ |\n'])
    expect(records.length).toBe(2)
    const layout = layoutTable(landed.trimEnd(), 100)!
    expect(layout.lines[0]!.split('┬').length).toBe(2)
    expect(places(plan(landed, records).pieces).length).toBe(2)
  })
})
