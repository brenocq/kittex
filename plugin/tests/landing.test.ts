// The landing render's cost (stress report F9): the images of the previews a
// reply streamed are drawn between flushes, kept by formula and geometry, so
// the render at landing only composes, and a re-render reuses every source.

import { describe, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { init } from '../hooks/core.js'
import { COLUMNS, startSession, test } from './support.ts'

/** A formula whose image takes long to draw (many rows). */
const HEAVY = `\\begin{aligned}${Array.from({ length: 30 }, (_, k) => `f_{${k}}(x) &= \\sum_{i=0}^{${k}} \\frac{x^i}{i!} + \\int_0^x t^{${k}} \\, dt`).join(' \\\\ ')}\\end{aligned}`

function mount($: Engine, text: string) {
  return $.ui.mount({
    plugin: 'kittex',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text, isFirstOfReply: true },
    viewport: { columns: COLUMNS, rows: 50, isFullscreen: false },
  })
}

/** Streams `text` as one message, a flush per line, and returns what was shown. */
async function stream($: Engine, text: string, id: string): Promise<string> {
  const lines = text.split(/(?<=\n)/)
  let shown = ''
  for (const [index, delta] of lines.entries()) {
    const result = await $.classic.MessageDisplay({ turn_id: 't', message_id: id, index, final: index === lines.length - 1, delta })
    shown += result.displayContent ?? delta
  }
  return shown
}

function sources(node: unknown): string[] {
  if (typeof node !== 'object' || node === null) return []
  const element = node as { type?: unknown; props?: { source?: { png?: unknown } }; children?: unknown[] }
  const own = element.type === 'Image' && typeof element.props?.source?.png === 'string' ? [element.props.source.png] : []
  return [...own, ...(element.children ?? []).flatMap(sources)]
}

describe('landing', () => {
  test('streamed previews have their images drawn before the block lands: the landing render only composes', async ($, on) => {
    const clock = mock.clock(on)
    await startSession($, on)
    await init()
    const reply = (n: number) => `Take $x_${n}$ and:\n\n$$\n${HEAVY} + ${n}\n$$\n\nDone.\n`

    // Streamed, landing before the clock ran: the landing render draws the images.
    let shown = await stream($, reply(1), 'm1')
    let t = performance.now()
    await (await mount($, shown)).drawn()
    const cold = performance.now() - t

    // Streamed, the clock running between flushes and landing: they are drawn already.
    shown = await stream($, reply(2), 'm2')
    for (let k = 0; k < 8; k++) await clock.advance(0)
    t = performance.now()
    const drawn = await (await mount($, shown)).drawn()
    const warm = performance.now() - t
    expect(sources(drawn)).toHaveLength(2)
    expect(warm).toBeLessThan(cold / 2)
  })

  test('a re-render sends the very same sources', async ($, on) => {
    await startSession($, on)
    await init()
    const text = 'Let $x$ be:\n\n$$\ne^{i\\pi} + 1 = 0\n$$\n'
    const first = sources(await (await mount($, text)).drawn())
    const again = sources(await (await mount($, text)).drawn())
    expect(first).toHaveLength(2)
    expect(again).toEqual(first)
  })
})

// The landing blank (engine-findings, "A blank flash at landing"): the engine
// draws a hooked block as nothing until the hook answers, unless it drew the
// block unhooked before. In the fullscreen layout kittex leaves a streamed
// block's first render (no `onScreen` yet) to the engine, whose drawing of the
// streamed text is the streaming preview, and draws from the next one on.
describe('landing in the fullscreen layout', () => {
  const FULLSCREEN = { columns: COLUMNS, rows: 50, isFullscreen: true }
  const ON_SCREEN = { first: 0, last: 5, of: 6 }

  function mountFullscreen($: Engine, text: string, onScreen?: { first: number; last: number; of: number } | null) {
    return $.ui.mount({
      plugin: 'kittex',
      surface: 'terminal',
      component: 'AssistantMessage',
      props: { text, isFirstOfReply: true, ...(onScreen === undefined ? {} : { onScreen }) },
      viewport: FULLSCREEN,
    })
  }

  test("a streamed block's first render (no onScreen yet) is the engine's own drawing of its preview", async ($, on) => {
    await startSession($, on)
    await init()
    const shown = await stream($, 'Let $x$ be:\n\n$$\ne^{i\\pi} + 1 = 0\n$$\n', 'f1')
    expect(await (await mountFullscreen($, shown)).drawn()).toEqual({ type: 'Text', children: [shown] })
  })

  // The README demo's reply blanked for 75 ms: its previews escape a `[` as
  // `\[` (𝔼\[r(x, y)\]), which the LaTeX-source matcher took for `\[`
  // math, so the block was hooked from its first render.
  test('a preview holding a bracket (escaped as \\[) still leaves the first render to the engine', async ($, on) => {
    await startSession($, on)
    await init()
    const shown = await stream($, 'The objective:\n\n$$\n\\max_\\theta \\mathbb{E}[r(x, y)] - \\beta\n$$\n\nwith $\\mathbb{E}[x]$ inline.\n', 'f5')
    expect(shown).toContain('\\[')
    expect(await (await mountFullscreen($, shown)).drawn()).toEqual({ type: 'Text', children: [shown] })
    expect(sources(await (await mountFullscreen($, shown, ON_SCREEN)).drawn()).length).toBeGreaterThan(0)
  })

  test('once its rows on screen are reported, on screen or off, kittex draws its images', async ($, on) => {
    await startSession($, on)
    await init()
    const shown = await stream($, 'Let $x$ be:\n\n$$\ne^{i\\pi} + 1 = 0\n$$\n', 'f2')
    expect(sources(await (await mountFullscreen($, shown, ON_SCREEN)).drawn())).toHaveLength(2)
    expect(sources(await (await mountFullscreen($, shown, null)).drawn())).toHaveLength(2)
  })

  test('LaTeX as written (after --resume) is drawn by kittex from the first render, its source never shown', async ($, on) => {
    await startSession($, on)
    await init()
    const text = 'Let $x$ be:\n\n$$\ne^{i\\pi} + 1 = 0\n$$\n'
    expect(sources(await (await mountFullscreen($, text)).drawn())).toHaveLength(2)
    expect(sources(await (await mountFullscreen($, text, ON_SCREEN)).drawn())).toHaveLength(2)
  })

  test('a text holding both previews and LaTeX is drawn once, by one registration', async ($, on) => {
    await startSession($, on)
    await init()
    const shown = await stream($, 'Let $x$ be:\n\n$$\ne^{i\\pi} + 1 = 0\n$$\n', 'f3')
    const mixed = `${shown}\nThen $y$ too.\n`
    const ui = await mountFullscreen($, mixed, ON_SCREEN)
    // Once: the preview's image, x's and y's, none drawn twice over a drawing of kittex's own.
    expect(sources(await ui.drawn())).toHaveLength(3)
  })

  test('the main screen reports no onScreen: a streamed block is drawn by kittex from its first render', async ($, on) => {
    await startSession($, on)
    await init()
    const shown = await stream($, 'Let $x$ be:\n\n$$\ne^{i\\pi} + 1 = 0\n$$\n', 'f4')
    expect(sources(await (await mount($, shown)).drawn())).toHaveLength(2)
  })
})
