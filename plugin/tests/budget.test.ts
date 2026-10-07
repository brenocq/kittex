// The engine's Image limits (measured live on 2.1.291): at most 2 MiB of PNG
// per Image and per drawing (one ui.render answer), at most 4096 px a side;
// past any of them it draws its own text instead of the whole answer. kittex
// stays inside: a block's images past the 2 MiB are left out (each keeps its
// Unicode, in its own rows), and no image is wider or taller than 4096 px.

import { describe, expect } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { emPxForCell, imageColumns, init, MAX_IMAGE_BYTES, MAX_IMAGE_SIDE, measureDisplay, renderDisplay, TexError } from '../hooks/core.js'
import type { RenderedImage } from '../hooks/core.js'
import { altText, fallbackLines, overBudget, TREE_IMAGE_BYTES } from '../hooks/budget.ts'
import type { Piece } from '../hooks/math.ts'
import { startSession, test } from './support.ts'

const fake = (bytes: number, rows = 3): RenderedImage => ({ columns: 40, rows, scale: 1, png: new Uint8Array(bytes) })

/** A big matrix: about 150 KB of PNG at 26×52 px cells across 118 columns. */
const matrix = (seed: number) =>
  String.raw`\begin{pmatrix}` + Array.from({ length: 16 }, (_, i) => Array.from({ length: 16 }, (_, j) => `\\frac{${i + seed}}{${j + 7}}`).join(' & ')).join(String.raw` \\ `) + String.raw`\end{pmatrix}`

type Node = { type?: unknown; props?: Record<string, unknown>; children?: unknown[] }
function walk(node: unknown, visit: (node: Node) => void): void {
  if (typeof node !== 'object' || node === null) return
  visit(node as Node)
  for (const child of (node as Node).children ?? []) walk(child, visit)
}

describe('image budget', () => {
  test('an alt with a control character (the engine refuses the whole drawing over one) is cleaned', () => {
    expect(altText('a\fb\nc\u0000d\u007fe')).toBe('a b c d e')
    expect(altText('')).toBe(' ')
  })

  test('images are taken in reading order while they fit; the rest are left out', () => {
    const [a, b, c, d, e] = [fake(90), fake(90), fake(40), fake(20), fake(15)] as const
    const pieces: Piece[] = [
      { kind: 'image', tex: 'a', image: a, gap: false },
      { kind: 'prose', text: 'x', gap: true, inline: [{ tex: 'e', image: e, row: 1, col: 0 }, { tex: 'd', image: d, row: 0, col: 4 }] },
      { kind: 'image', tex: 'b', image: b, gap: true },
      { kind: 'image', tex: 'c', image: c, gap: true },
    ]
    // a, then the inline d (row 0) and e (row 1): 125; b would pass 200 and is left out; c still fits.
    const left = overBudget(pieces, 200)
    expect(left.size).toBe(1)
    expect(left.has(b)).toBe(true)
    expect(overBudget(pieces).size).toBe(0)
    expect(TREE_IMAGE_BYTES).toBe(2 * 1024 * 1024)
  })

  test("a formula left out keeps its rows: its Unicode centred in the image's box", () => {
    expect(fallbackLines(['a', '─', 'b'], '\\frac a b', 9, 5)).toEqual(['', '    a', '    ─', '    b', ''])
    expect(fallbackLines(null, '\\begin{foo}  x \\end{foo}', 10, 2)).toEqual(['\\begin{fo…', ''])
    expect(fallbackLines(['1', '2', '3'], 'x', 4, 2)).toEqual([' x', ''])
  })

  test('no image is wider than 4096 px: at large cells it spans fewer columns', async () => {
    await init()
    const cell = { cellWidth: 40, cellHeight: 80 }
    expect(imageColumns({ ...cell, maxColumns: 200 })).toBe(Math.floor(MAX_IMAGE_SIDE / 40))
    expect(imageColumns({ cellWidth: 13, maxColumns: 200 })).toBe(200)
    const env = { ...cell, maxColumns: 200, emPx: emPxForCell(cell), ink: { r: 200, g: 200, b: 200 } }
    const tex = String.raw`\sum_{k=1}^{n} k = \frac{n(n+1)}{2}`
    const image = renderDisplay(tex, env, measureDisplay(tex, env).rows)
    expect(image.columns * cell.cellWidth).toBeLessThanOrEqual(MAX_IMAGE_SIDE)
  })

  test('a formula taller than 4096 px is refused, not drawn', () => {
    const cell = { cellWidth: 20, cellHeight: 120 }
    const env = { ...cell, maxColumns: 100, emPx: emPxForCell({ cellWidth: 20, cellHeight: 40 }), ink: { r: 200, g: 200, b: 200 } }
    const tall = String.raw`\begin{aligned}` + Array.from({ length: 40 }, (_, k) => `x_{${k}} &= ${k}`).join(String.raw` \\ `) + String.raw`\end{aligned}`
    expect(() => measureDisplay(tall, env)).toThrow(TexError)
    expect(MAX_IMAGE_BYTES).toBe(2 * 1024 * 1024)
  })

  test('a resumed block of large formulas past 2 MiB draws what fits, the rest as text in the same rows', { timeoutMs: 120_000 }, async ($: Engine, on) => {
    const session = await startSession($, on)
    // A font zoom: the window is now 120 columns of 26×52 px cells (the render measures them).
    Object.assign(session.screen, { columns: 120, cellWidth: 26, cellHeight: 52 })
    const text = Array.from({ length: 15 }, (_, k) => `Matrix ${k}:\n\n$$\n${matrix(k)}\n$$\n`).join('\n')
    const drawn = await (
      await $.ui.mount({ plugin: 'kittex', surface: 'terminal', component: 'AssistantMessage', props: { text, isFirstOfReply: true }, viewport: { columns: 120, rows: 50, isFullscreen: false } })
    ).drawn()
    let bytes = 0
    let images = 0
    const boxes: number[] = []
    walk(drawn, node => {
      if (node.type === 'Image') {
        images += 1
        bytes += (Uint8Array as unknown as { fromBase64(s: string): Uint8Array }).fromBase64((node.props!.source as { png: string }).png).length
      }
      if (node.type === 'Box' && typeof node.props?.key === 'string' && node.props.key.endsWith('-text')) boxes.push(node.props.height as number)
    })
    expect(bytes).toBeLessThanOrEqual(2 * 1024 * 1024)
    expect(images).toBeGreaterThan(0)
    // Every image is laid over its preview in the text (landing-map): one left out leaves its preview there, in its rows.
    expect(images).toBeLessThan(15)
    expect(boxes).toEqual([])
  })
})
