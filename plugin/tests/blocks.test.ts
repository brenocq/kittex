// What register.tsx keeps of each streamed block and how a landed block finds
// it: its previews by message (kittex.blocks), each where it was written, and
// the link from the block's transcript row (its uuid, AssistantMessage's
// requestId) to the stream it was (kittex.requests, set as the row is
// appended). Fuzz findings FUZZ-7, FUZZ-12 and FUZZ-14; the landing's round
// trips through the engine (live QA p27: 44 of them, ~153 ms).

import { describe, expect } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { init } from '../hooks/core.js'
import { COPY_LABEL, RECENT_BLOCKS, SOURCE_PATTERN, STREAMED_PATTERN } from '../hooks/math.ts'
import { NUMBER_THEORY } from './fixtures/number-theory.ts'
import { COLUMNS, KITTY, startSession, test } from './support.ts'

/** Cells tall enough for these formulas' inline images (a 20 px cell keeps `½` Unicode). */
const TALL = { cellWidth: 13, cellHeight: 26 }

/** Streams `markdown` as one message, a line or two a flush: what the engine shows. */
async function stream($: Engine, id: string, markdown: string): Promise<string> {
  const lines = markdown.split(/(?<=\n)/)
  const flushes: string[] = []
  for (let i = 0; i < lines.length; i += 2) flushes.push(lines.slice(i, i + 2).join(''))
  let shown = ''
  for (const [index, delta] of flushes.entries()) {
    const result = await $.classic.MessageDisplay({ turn_id: 't', message_id: id, index, final: index === flushes.length - 1, delta })
    shown += result.displayContent ?? delta
  }
  return shown
}

/**
 * The block's row, as the engine appends it when the block lands: kittex links
 * the row to its stream on the way down (this world has no store beneath, so
 * the append itself then fails).
 */
async function land($: Engine, uuid: string, markdown: string): Promise<void> {
  await $.session
    .append({ message: { type: 'assistant', role: 'assistant', content: [{ type: 'text', text: markdown }] }, door: 'response', origin: { kind: 'model', model: 'claude' }, uuid })
    .catch(() => undefined)
}

function mount($: Engine, text: string, requestId: string) {
  return $.ui.mount({ plugin: 'kittex', surface: 'terminal', component: 'AssistantMessage', requestId, props: { text, isFirstOfReply: true }, viewport: { columns: COLUMNS, rows: 50, isFullscreen: false } })
}

/** The TeX of every image drawn, in order. */
function alts(node: unknown): string[] {
  if (typeof node !== 'object' || node === null) return []
  const element = node as { type?: unknown; props?: { alt?: unknown }; children?: unknown[] }
  const own = element.type === 'Image' && typeof element.props?.alt === 'string' ? [element.props.alt] : []
  return [...own, ...(element.children ?? []).flatMap(alts)]
}

describe('streamed blocks', () => {
  test('two blocks that stream the same text each land with their own formula (FUZZ-7)', async ($, on) => {
    await startSession($, on, KITTY, 'dark', TALL)
    await init()
    // A^T and A^\top are both `Aᵀ`, \mathbf{x} and \bm{x} both `𝐱`: the previews alone can't tell them apart.
    const a = await stream($, 'ma', 'Take $A^T$ and $\\mathbf{x}$ here.\n')
    await land($, 'ua', 'Take $A^T$ and $\\mathbf{x}$ here.\n')
    const b = await stream($, 'mb', 'Take $A^\\top$ and $\\bm{x}$ here.\n')
    await land($, 'ub', 'Take $A^\\top$ and $\\bm{x}$ here.\n')
    expect(a).toBe(b)
    expect(alts(await (await mount($, a, 'ua')).drawn())).toEqual(['A^T', '\\mathbf{x}'])
    expect(alts(await (await mount($, b, 'ub')).drawn())).toEqual(['A^\\top', '\\bm{x}'])
  })

  test('within a block, each preview maps to its own formula (FUZZ-7)', async ($, on) => {
    await startSession($, on, KITTY, 'dark', TALL)
    await init()
    const markdown = '$\\mathbf{x}$\n\n$\\bm{x}$ and $A^\\top$, $A^T$.\n'
    const shown = await stream($, 'm1', markdown)
    await land($, 'u1', markdown)
    expect(alts(await (await mount($, shown, 'u1')).drawn())).toEqual(['\\mathbf{x}', '\\bm{x}', 'A^\\top', 'A^T'])
  })

  test('an early block keeps its images after many later ones (FUZZ-14)', { timeoutMs: 120_000 }, async ($, on) => {
    await startSession($, on)
    await init()
    const first = await stream($, 'm0', 'Take $x_{0}$ and $y$.\n')
    await land($, 'u0', 'Take $x_{0}$ and $y$.\n')
    // 300 later blocks of two previews each: more than the 512 previews the session kept before, more than the
    // recent blocks a landed block is looked for among by its text.
    for (let k = 1; k <= 300; k++) {
      const markdown = `Then $z_{${k}}$ and $w_{${k}}$.\n`
      await stream($, `m${k}`, markdown)
      await land($, `u${k}`, markdown)
    }
    expect(300).toBeGreaterThan(RECENT_BLOCKS)
    // A redraw of the first block (a resize, a theme change, scrolling back in the fullscreen layout).
    expect(alts(await (await mount($, first, 'u0')).drawn())).toEqual(['x_{0}', 'y'])
  })

  test('a block found by its text where no row links it: the newest whose previews it holds where they were written', async ($, on) => {
    await startSession($, on)
    await init()
    const shown = await stream($, 'm1', 'So $\\alpha$ and $\\beta$.\n')
    // No row was appended for it (a hot reload since it streamed): found among the recent blocks.
    expect(alts(await (await mount($, shown, 'unlinked')).drawn())).toEqual(['\\alpha', '\\beta'])
  })

  test("a streamed block's text is never read as LaTeX again: dollars it shows don't pair into a formula (FUZZ-12)", { options: { inline: false } }, async ($, on) => {
    await startSession($, on)
    await init()
    // With inline images off, `\$` in a formula is a `$` in its Unicode, and the two left pair as LaTeX would.
    const markdown = 'Note $\\$x$ and $y\\$$ here.\n'
    const shown = await stream($, 'm1', markdown)
    expect([STREAMED_PATTERN.test(shown), SOURCE_PATTERN.test(shown)]).toEqual([false, true])
    await land($, 'u1', markdown)
    expect(await (await mount($, shown, 'u1')).drawn()).toEqual({ type: 'Text', children: [shown] })
  })
})

describe('the landing', () => {
  test('display math in a list item lies over its preview in the item, with its copy button', async ($, on) => {
    await startSession($, on)
    await init()
    const markdown = '1. Compute:\n\n   $$\n   x^2 + y^2 = r^2\n   $$\n\n   which gives $r$.\n2. Done.\n'
    const shown = await stream($, 'm1', markdown)
    await land($, 'u1', markdown)
    const ui = await mount($, shown, 'u1')
    expect(alts(await ui.drawn())).toEqual(['x^2 + y^2 = r^2', 'r'])
    // One button: the display formula's (inline ones have none).
    const buttons = await ui.findAll({ type: 'Button' })
    expect(buttons.map(button => button.props.label)).toEqual([COPY_LABEL])
  })

  test('a long reply lands in a few round trips through the engine (live QA p27: 44, ~153 ms)', async ($, on) => {
    const session = await startSession($, on)
    await init()
    const shown = await stream($, 'm1', NUMBER_THEORY)
    await land($, 'u1', NUMBER_THEORY)
    const before = session.renders()
    const ui = await mount($, shown, 'u1')
    const drawn = await ui.drawn()
    // Every formula drawn, in pieces cut only where a part's rows aren't known (its rules here).
    expect(alts(drawn).length).toBeGreaterThan(50)
    expect(session.renders() - before).toBeLessThanOrEqual(6)
  })
})
