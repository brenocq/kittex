// Inline math in list items: streamed padded and given images at landing,
// placed by the replay of the engine's list layout (marker box, hanging
// indent, nested lists), measured live on Claude Code 2.1.291 (research/lab
// runs LB-*).

import { describe, expect } from 'claude-code/testing'

import { init, layoutList, measureDisplay, previewInline, renderDisplay, renderInline, textWidth } from '../hooks/core.js'
import { inlineEnvFor, MessageStream, placeable, planLanded, proseWidthFor, renderEnvFor } from '../hooks/math.ts'
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
    draw: (tex, rows) => renderDisplay(tex, renderEnv, rows ?? measureDisplay(tex, renderEnv).rows),
    inline: { env: inlineEnv, width: proseWidthFor(env), draw: (tex, columns) => renderInline(tex, inlineEnv, columns) },
  })
}

function places(pieces: ReturnType<typeof plan>['pieces']): [string, number, number, number][] {
  return pieces.flatMap(piece =>
    piece.kind === 'prose' ? (piece.inline ?? []).map(img => [img.tex, img.row, img.col, img.image.columns] as [string, number, number, number]) : [],
  )
}

/** Every image of a plan lies over its preview in the replay's own rows of the piece. */
function expectOverPreviews(pieces: ReturnType<typeof plan>['pieces'], records: readonly PreviewRecord[], width: number) {
  for (const piece of pieces) {
    if (piece.kind !== 'prose' || !piece.inline) continue
    const layout = layoutList(piece.text, width)!
    expect(layout).not.toBeNull()
    for (const image of piece.inline) {
      const preview = records.find(record => record.tex === image.tex)!.preview
      const line = layout.lines[image.row]!
      expect(line).toContain(preview.replace(/\\(.)/g, '$1'))
      const cells = [...line]
      let col = 0
      let at = 0
      while (at < cells.length && !line.slice(cells.slice(0, at).join('').length).startsWith(preview.replace(/\\(.)/g, '$1'))) {
        col += textWidth(cells[at]!)
        at += 1
      }
      expect(image.col).toBe(col)
    }
  }
}

describe('list items: streaming', () => {
  test('inline math in bullet and numbered items streams padded, with records', async () => {
    await init()
    for (const flushes of [
      ['- $x_k$ is the state, $u_k$ the control input\n'],
      ['1. $x_k$: state\n', '2. $u_k$: input\n'],
      ['Where:\n', '- $x_k$ is the state\n'],
      ['- a\n', '  - nested $x$ here\n'],
    ]) {
      const { records } = streamed(flushes)
      expect(records.length).toBeGreaterThan(0)
      expect(records.every(record => record.inline)).toBe(true)
    }
  })

  test('the check sees a list item the replay follows, and nothing else', () => {
    expect(placeable('- the state ', 98)).toBe(true)
    expect(placeable('Where:\n1. the state ', 98)).toBe(true)
    expect(placeable('- [ ] a task ', 98)).toBe(false)
    expect(placeable('- item\n\n  ```\n  code\n  ```\n- then ', 98)).toBe(false)
    expect(placeable('Text:\n```\ncode ', 98)).toBe(false)
    expect(placeable('> ```\n> code\n> ```\n> quote ', 98)).toBe(false)
    // Too narrow for the item's text box: the engine's boxes shrink instead.
    expect(placeable('- ', 10)).toBe(false)
  })
})

describe('list items: the landed plan', () => {
  test('each image lands beside the marker, in the item text column', async () => {
    await init()
    const { landed, records } = streamed(['- $x_k$ is the state, $u_k$ the control input\n', '- $w_k$ the noise\n'])
    const { pieces } = plan(landed, records)
    expect(places(pieces).map(([tex, row, col]) => [tex, row, col])).toEqual([
      ['x_k', 0, 2],
      ['u_k', 0, 2 + textWidth(records[0]!.preview) + ' is the state, '.length],
      ['w_k', 1, 2],
    ])
  })

  test('wide markers, nested lists and wrapped items follow the engine layout', async () => {
    await init()
    const words = 'the value of the function at each point we take is'
    const flushes = [
      'The model, where:\n',
      ...Array.from({ length: 9 }, (_, k) => `${k + 1}. item ${k}\n`),
      `10. ${words} $x^2$ and ${words} $\\theta$ end\n`,
      `    1. nested ${words} $p_k$ and ${words} $q_k$\n`,
      '       - deeper $y$\n',
    ]
    const { landed, records } = streamed(flushes)
    expect(records.map(record => record.tex)).toEqual(['x^2', '\\theta', 'p_k', 'q_k', 'y'])
    const { pieces } = plan(landed, records)
    expect(places(pieces).map(([tex]) => tex)).toEqual(['x^2', '\\theta', 'p_k', 'q_k', 'y'])
    expectOverPreviews(pieces, records, proseWidthFor(kitty26()))
    // Under "10." the text starts 4 cells in, the nested "a." item's 3 more, the bullet's 2 more.
    const y = places(pieces).find(([tex]) => tex === 'y')!
    expect(y[2]).toBe(4 + 3 + 2 + 'deeper '.length)
  })

  test('a list block is a piece of its own, between the prose around it', async () => {
    await init()
    const { pieces } = plan('Intro.\n\n- a $x$ item\n- b\n\nOutro.')
    expect(pieces.map(piece => [piece.kind, piece.gap, piece.kind === 'prose' ? piece.inline?.length ?? 0 : -1])).toEqual([
      ['prose', false, 0],
      ['prose', true, 1],
      ['prose', true, 0],
    ])
  })

  test('after --resume the LaTeX gets the same previews and images', async () => {
    await init()
    const text = '- $x_k$ is the state\n- $u_k$ the input'
    const { landed, records } = streamed([text])
    expect(plan(text).pieces).toEqual(plan(landed, records).pieces)
  })

  test('a list the replay does not follow keeps Unicode: a code block in an item', async () => {
    await init()
    const text = '- $x$ here\n\n  ```\n  code\n  ```\n- more'
    const resumed = plan(text)
    expect(places(resumed.pieces)).toEqual([])
    expect(resumed.pieces.map(piece => (piece.kind === 'prose' ? piece.text : '')).join('')).toContain(`- ${previewInline('x')} here`)
  })
})
