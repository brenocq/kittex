// The landing render's cost (stress report F9): the images of the previews a
// reply streamed are drawn between flushes, kept by formula and geometry, so
// the render at landing only composes, and a re-render reuses every source.

import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { init } from '../hooks/core.js'
import { COLUMNS, startSession } from './support.ts'

/** A formula whose image takes long to draw (many rows). */
const HEAVY = `\\begin{aligned}${Array.from({ length: 30 }, (_, k) => `f_{${k}}(x) &= \\sum_{i=0}^{${k}} \\frac{x^i}{i!} + \\int_0^x t^{${k}} \\, dt`).join(' \\\\ ')}\\end{aligned}`

function mount($: Engine, text: string) {
  return $.ui.mount({
    plugin: 'kittex',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text, isFirstOfReply: true },
    viewport: { columns: COLUMNS, rows: 50 },
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
