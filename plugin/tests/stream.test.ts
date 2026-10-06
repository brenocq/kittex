// The streaming rewrite and the plan of a landed reply, with core's own scanner.

import { describe, expect, test } from 'claude-code/testing'

import { init, measureDisplay, previewDisplay, previewInline, renderDisplay, TexError } from '../hooks/core.js'
import {
  HELD_DISPLAY,
  MessageStream,
  PREVIEW_FENCE_INFO,
  PREVIEW_OVERHEAD_ROWS,
  planLanded,
  renderEnvFor,
  trimPieces,
} from '../hooks/math.ts'
import type { PreviewRecord } from '../hooks/math.ts'
import { kittyEnv } from './support.ts'

const TEX = 'E = mc^2'

/** The lines inside the one preview fence of `text`. */
function previewLines(text: string): string[] {
  const open = '```' + PREVIEW_FENCE_INFO + '\n'
  const start = text.indexOf(open)
  const end = text.indexOf('\n```', start)
  expect(start).toBeGreaterThan(-1)
  return text.slice(start + open.length, end).split('\n')
}

describe('MessageStream', () => {
  test('holds an open display block, then shows exactly the rows its image takes', async () => {
    await init()
    const env = kittyEnv()
    const stream = new MessageStream()

    const first = stream.push('Energy is\n$$\n', false, env)
    expect(first.text).toBe('Energy is\n')
    const held = stream.push(`${TEX}\n`, false, env)
    expect(held.text).toBe(HELD_DISPLAY)
    expect(held.records).toEqual([])

    const closed = stream.push('$$\nas Einstein said.\n', true, env)
    const rows = measureDisplay(TEX, renderEnvFor(env)).rows
    expect(previewLines(closed.text)).toHaveLength(rows - PREVIEW_OVERHEAD_ROWS)
    expect(closed.text.endsWith('\nas Einstein said.\n')).toBe(true)
    expect(closed.records).toEqual([{ preview: expect.any(String), tex: TEX, rows }])
  })

  test('the landed text maps back to the TeX and the reserved rows', async () => {
    await init()
    const env = kittyEnv()
    const stream = new MessageStream()
    const records: PreviewRecord[] = []
    let landed = ''
    for (const [delta, final] of [['Energy is\n$$\n', false], [`${TEX}\n`, false], ['$$\nas Einstein said.', true]] as const) {
      const flush = stream.push(delta, final, env)
      landed += flush.text
      records.push(...flush.records)
    }
    expect(landed).not.toContain('$$')

    const renderEnv = renderEnvFor(env)
    const plan = planLanded(landed, records, {
      maxColumns: renderEnv.maxColumns,
      draw: (tex, minRows) => renderDisplay(tex, renderEnv, minRows),
    })
    const pieces = trimPieces(plan.pieces)
    expect(plan.changed).toBe(true)
    expect(pieces.map(piece => piece.kind)).toEqual(['prose', 'image', 'prose'])
    const image = pieces[1]!
    if (image.kind !== 'image') throw new Error('not an image')
    expect(image.tex).toBe(TEX)
    expect(image.image.rows).toBe(records[0]!.rows)
    expect(image.image.columns).toBe(renderEnv.maxColumns)
    expect(pieces[0]).toEqual({ kind: 'prose', text: 'Energy is' })
    expect(pieces[2]).toEqual({ kind: 'prose', text: 'as Einstein said.' })
  })

  test('trailing spaces the engine trims still map back', async () => {
    await init()
    const env = kittyEnv()
    const stream = new MessageStream()
    const flush = stream.push(`$$\n${TEX}\n$$\n`, true, env)
    const trimmed = flush.text.replace(/[ \t]+$/gm, '')
    const renderEnv = renderEnvFor(env)
    const plan = planLanded(trimmed, flush.records, { maxColumns: renderEnv.maxColumns, draw: tex => renderDisplay(tex, renderEnv) })
    expect(trimPieces(plan.pieces).map(piece => piece.kind)).toEqual(['image'])
  })

  test('a formula in a list item keeps its indentation and still maps back', async () => {
    await init()
    const env = kittyEnv()
    const stream = new MessageStream()
    let landed = ''
    const records: PreviewRecord[] = []
    for (const [delta, final] of [['- Basel:\n', false], ['  $$\n', false], [`  ${TEX}\n`, false], ['  $$\n', false], ['- next', true]] as const) {
      const flush = stream.push(delta, final, env)
      landed += flush.text
      records.push(...flush.records)
    }
    const lines = landed.split('\n')
    expect(lines[1]).toBe('  ```' + PREVIEW_FENCE_INFO)
    expect(lines.slice(1, -1).every(line => line.startsWith('  '))).toBe(true)
    expect(lines[lines.length - 1]).toBe('- next')
    const renderEnv = renderEnvFor(env)
    const plan = planLanded(landed, records, { maxColumns: renderEnv.maxColumns, draw: (tex, minRows) => renderDisplay(tex, renderEnv, minRows) })
    expect(plan.pieces.filter(piece => piece.kind === 'image').map(piece => piece.kind === 'image' && piece.tex)).toEqual([TEX])
  })

  test('inline math becomes one line of Unicode while streaming', async () => {
    await init()
    const env = kittyEnv()
    const stream = new MessageStream()
    const flush = stream.push('Let $x^2$ be positive.\n', false, env)
    expect(flush.text).toBe(`Let ${previewInline('x^2', renderEnvFor(env).maxColumns)} be positive.\n`)
  })

  test('without images a display formula is an unpadded preview and records nothing', async () => {
    await init()
    const env = { ...kittyEnv(), kind: 'wezterm' as const, images: false }
    const stream = new MessageStream()
    const flush = stream.push(`$$\n${TEX}\n$$\n`, true, env)
    expect(flush.records).toEqual([])
    const lines = previewDisplay(TEX, renderEnvFor(env))!
    expect(previewLines(flush.text).map(line => line.trim())).toEqual(lines.map(line => line.trim()))
  })
})

describe('planLanded', () => {
  test('rewrites inline math in a reply that never streamed', async () => {
    await init()
    const plan = planLanded('Take $a+b$ and $c$.', [], { maxColumns: 97 })
    expect(plan.changed).toBe(true)
    expect(plan.pieces).toEqual([{ kind: 'prose', text: `Take ${previewInline('a+b', 97)} and ${previewInline('c', 97)}.` }])
  })

  test('leaves a reply without math alone', () => {
    const plan = planLanded('Nothing to see.', [], { maxColumns: 97 })
    expect(plan.changed).toBe(false)
  })

  test('keeps a formula MathJax refuses as a latex block', () => {
    const raw = '$$\\frac{$$'
    const plan = planLanded(raw, [], {
      maxColumns: 97,
      draw: () => {
        throw new TexError('missing argument')
      },
      scan: () => [{ kind: 'math', display: true, tex: '\\frac{', raw, delimiter: '$$', start: 0, end: raw.length }],
    })
    expect(plan.pieces).toEqual([{ kind: 'prose', text: '```latex\n\\frac{\n```' }])
  })
})
