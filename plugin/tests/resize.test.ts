// kittex after the window changes: a resize or a font zoom (a new width, often
// new cells too), a move to a monitor of another scale (new cells at the same
// width), and the images drawn after it.

import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine, FoundElement } from 'claude-code/testing'

import { init } from '../hooks/core.js'
import { CELL_POLL_MS, REPLY_INDENT, replyColumns, RESIZE_SETTLE_MS } from '../hooks/math.ts'
import { CELL, COLUMNS, startSession } from './support.ts'

const TEX = 'e^{i\\pi} + 1 = 0'
const REPLY = `Euler's identity:\n\n$$${TEX}$$\n\nis beautiful.`

/** The reply drawn in a viewport `columns` wide; with none, at the width kittex.env holds. */
function mountAt($: Engine, columns?: number) {
  return $.ui.mount({
    plugin: 'kittex',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: REPLY, isFirstOfReply: true },
    ...(columns === undefined ? {} : { viewport: { columns, rows: 50, isFullscreen: false } }),
  })
}

/** The terminal as kittex.env holds it, read off a drawing that has no viewport (it draws with the env's columns and cells). */
async function storedEnv($: Engine) {
  const ui = await mountAt($)
  const image = imageOf(await ui.find({ type: 'Image' }))
  await ui.unmount()
  return { columns: image.columns + REPLY_INDENT, cellWidth: image.width / image.columns, cellHeight: image.height / image.rows }
}

/** A PNG's width and height in pixels, from its base64 (the IHDR chunk, bytes 16 to 24). */
function pngSize(base64: string): { width: number; height: number } {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const bytes: number[] = []
  for (let i = 0; i < 32; i += 4) {
    const n = [...base64.slice(i, i + 4)].reduce((acc, char) => (acc << 6) | alphabet.indexOf(char), 0)
    bytes.push((n >> 16) & 255, (n >> 8) & 255, n & 255)
  }
  const word = (at: number) => ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0
  return { width: word(16), height: word(20) }
}

/** The keys of the formulas' Boxes in a drawing. */
function formulaKeys(node: unknown): string[] {
  if (typeof node !== 'object' || node === null) return []
  const element = node as { key?: unknown; props?: { key?: unknown }; children?: unknown[] }
  const key = element.key ?? element.props?.key
  const own = typeof key === 'string' && key.startsWith('kittex-formula-') ? [key] : []
  return [...own, ...(element.children ?? []).flatMap(formulaKeys)]
}

/** The formula's Image: its cells and the pixels of its PNG. */
function imageOf(found: FoundElement | undefined) {
  const props = found!.props as { columns: number; rows: number; source: { png: string } }
  return { columns: props.columns, rows: props.rows, ...pngSize(props.source.png) }
}

describe('a new width', () => {
  test('a render at a new width draws for the cells it measures then, and the settle stores them', async ($, on) => {
    const clock = mock.clock(on)
    const session = await startSession($, on)
    await init()
    // A font zoom: twice the columns, cells half as big.
    Object.assign(session.screen, { columns: 200, cellWidth: 6, cellHeight: 10 })
    const ui = await mountAt($, 200)
    const image = imageOf(await ui.find({ type: 'Image' }))
    expect(image).toMatchObject({ columns: replyColumns(200), width: replyColumns(200) * 6, height: image.rows * 10 })
    // Drawing writes nothing: the settle timer stores what the probe found.
    expect(await storedEnv($)).toEqual({ columns: COLUMNS, ...CELL })
    await clock.advance(RESIZE_SETTLE_MS)
    expect(await storedEnv($)).toEqual({ columns: 200, cellWidth: 6, cellHeight: 10 })
  })

  test('a drag ends with the final width: every change restarts the settle', async ($, on) => {
    const clock = mock.clock(on)
    const session = await startSession($, on)
    await init()
    for (const columns of [110, 130, 150]) {
      session.screen.columns = columns
      await (await mountAt($, columns)).unmount()
      await clock.advance(RESIZE_SETTLE_MS / 2)
      expect((await storedEnv($)).columns).toBe(COLUMNS)
    }
    await clock.advance(RESIZE_SETTLE_MS)
    expect((await storedEnv($)).columns).toBe(150)
    // The setup's probe, one per render at a new width, and one when it settled.
    expect(session.cellProbes()).toBe(1 + 3 + 1)
  })

  test("the settle outlives the render that started it (it runs on session.start's $)", async ($, on) => {
    const clock = mock.clock(on)
    const session = await startSession($, on)
    await init()
    session.screen.columns = 150
    const ui = await mountAt($, 150)
    await ui.unmount()
    await clock.advance(RESIZE_SETTLE_MS)
    expect((await storedEnv($)).columns).toBe(150)
  })

  test('a render at the stored width probes nothing', async ($, on) => {
    const clock = mock.clock(on)
    const session = await startSession($, on)
    await init()
    await mountAt($, COLUMNS)
    await clock.advance(RESIZE_SETTLE_MS)
    expect(session.cellProbes()).toBe(1)
  })
})

describe('new cells at the same width', () => {
  test('nothing probes before an image is drawn', async ($, on) => {
    const clock = mock.clock(on)
    const session = await startSession($, on)
    await clock.advance(3 * CELL_POLL_MS)
    expect(session.cellProbes()).toBe(1)
  })

  test('once an image is drawn, the periodic probe finds new cells and the formula is drawn for them, as a new element', async ($, on) => {
    const clock = mock.clock(on)
    const session = await startSession($, on)
    await init()
    const ui = await mountAt($, COLUMNS)
    const before = await ui.find({ type: 'Image' })
    expect(imageOf(before)).toMatchObject({ width: replyColumns(COLUMNS) * CELL.cellWidth })
    await clock.advance(CELL_POLL_MS)
    expect(session.cellProbes()).toBe(2)
    expect(await storedEnv($)).toEqual({ columns: COLUMNS, ...CELL })
    // A move to a monitor of another scale: the same columns, other pixels.
    Object.assign(session.screen, { cellWidth: 9, cellHeight: 18 })
    await clock.advance(CELL_POLL_MS)
    expect(await storedEnv($)).toEqual({ columns: COLUMNS, cellWidth: 9, cellHeight: 18 })
    const after = await ui.find({ type: 'Image' })
    expect(imageOf(after)).toMatchObject({ columns: replyColumns(COLUMNS), width: replyColumns(COLUMNS) * 9 })
    // A changed image is a new element (keyed by its pixels), so the terminal
    // gets it under a new image id: Ghostty keeps showing an earlier
    // transmission sent again under the same id.
    const keys = async () => formulaKeys(await ui.drawn())
    expect(await keys()).toEqual([expect.stringMatching(/^kittex-formula-1-/)])
    Object.assign(session.screen, { cellWidth: 13, cellHeight: 20 })
    const changed = await keys()
    await clock.advance(CELL_POLL_MS)
    expect(await keys()).not.toBe(changed)
  })
})

describe('inline formulas', () => {
  test('inline images are drawn for the new cells too, at a new width and at the same width', async ($, on) => {
    const clock = mock.clock(on)
    const session = await startSession($, on)
    await init()
    const inline = async (columns: number) => {
      const ui = await $.ui.mount({
        plugin: 'kittex',
        surface: 'terminal',
        component: 'AssistantMessage',
        props: { text: 'Let $x$ be real.', isFirstOfReply: true },
        viewport: { columns, rows: 50, isFullscreen: false },
      })
      return { ui, image: () => ui.find({ type: 'Image' }).then(imageOf) }
    }
    const zoomed = Object.assign(session.screen, { columns: 200, cellWidth: 6, cellHeight: 10 })
    const wide = await inline(200)
    expect(await wide.image()).toMatchObject({ rows: 1, height: zoomed.cellHeight })
    expect((await wide.image()).width).toBe((await wide.image()).columns * zoomed.cellWidth)
    await clock.advance(RESIZE_SETTLE_MS)
    // A move to a monitor of another scale at the same width.
    Object.assign(session.screen, { cellWidth: 9, cellHeight: 18 })
    await clock.advance(CELL_POLL_MS)
    const after = await wide.image()
    expect(after).toMatchObject({ rows: 1, height: 18, width: after.columns * 9 })
  })
})
