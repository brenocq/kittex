// Claude Code's own decision on pictures. Its probe of the terminal decides
// whether an Image draws its picture or its alt (kitty's reply arriving late,
// over ssh or on a busy machine, makes it no), whatever kittex reads from
// TERM and KITTY_WINDOW_ID. kittex's alts are the text already under each
// image, so a refused picture leaves its preview as it streamed; a blit to
// one of its Images tells kittex the decision, and on a no every block is
// drawn in Unicode. Deny texts are Claude Code 2.1.293's own.

import { describe, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { init } from '../hooks/core.js'
import { BLANK_ALT, graphicsFromBlit, inlineAlt, inlineEnvFor, cellsOf } from '../hooks/math.ts'
import { DOCTOR_COMMAND } from '../hooks/doctor.ts'
import { COLUMNS, kittyEnv, startSession, test } from './support.ts'

const ALT = 'the Image draws its alt here: the terminal draws no placeholder images'
const NO = `${ALT} (env: terminal=kitty, not asked yet, no answer)`
const PENDING = `${ALT} (env: terminal=kitty, not asked yet)`
const REPLY = "Euler's identity:\n\n$$e^{i\\pi} + 1 = 0$$\n\nso $x$ and $\\alpha$ hold.\n"
const RUN = { command: DOCTOR_COMMAND, args: '', origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 100 } }

function mount($: Engine, text: string, requestId = 'r1') {
  return $.ui.mount({
    plugin: 'kittex',
    surface: 'terminal',
    component: 'AssistantMessage',
    requestId,
    props: { text, isFirstOfReply: true },
    viewport: { columns: COLUMNS, rows: 50, isFullscreen: false },
  })
}

interface Element {
  type?: string
  key?: unknown
  props?: Record<string, unknown>
  children?: unknown[]
}

function images(node: unknown): Element[] {
  if (typeof node !== 'object' || node === null) return []
  const element = node as Element
  return [...(element.type === 'Image' ? [element] : []), ...(element.children ?? []).flatMap(images)]
}

/** Claude Code beneath the plugin, answering every blit with `answers` in turn (the last one kept); the blits asked. */
function engineSays(on: On, ...answers: (string | undefined)[]): { asked: Record<string, unknown>[] } {
  const asked: Record<string, unknown>[] = []
  on('ui.blit', ($, e) => {
    asked.push(e as unknown as Record<string, unknown>)
    const deny = answers[Math.min(asked.length - 1, answers.length - 1)]
    return { value: deny === undefined ? {} : { deny } }
  })
  return { asked }
}

describe('reading the decision', () => {
  test("a blit's answer: taken, refused for good, not asked yet, or something else", () => {
    expect(graphicsFromBlit(undefined)).toEqual({ state: 'yes' })
    expect(graphicsFromBlit(NO)).toEqual({ state: 'no', source: 'env: terminal=kitty, not asked yet, no answer' })
    expect(graphicsFromBlit(`${ALT} (probe: no reply to the graphics query)`)).toEqual({ state: 'no', source: 'probe: no reply to the graphics query' })
    expect(graphicsFromBlit(`${ALT} (env: inside tmux or screen)`)).toEqual({ state: 'no', source: 'env: inside tmux or screen' })
    expect(graphicsFromBlit('the Image draws its alt here: every 8-bit image id is in use')).toEqual({ state: 'no', source: 'every 8-bit image id is in use' })
    expect(graphicsFromBlit(PENDING)).toEqual({ state: 'pending', source: 'env: terminal=kitty, not asked yet' })
    expect(graphicsFromBlit('nothing of this plugin is mounted there')).toBeUndefined()
  })
})

describe('alts', () => {
  test("every Image is keyed; its alt is its formula until Claude Code says it draws none, then the text under it", async ($, on) => {
    const clock = mock.clock(on)
    engineSays(on, PENDING)
    await startSession($, on)
    await init()
    const ui = await mount($, REPLY)
    let drawn = images(await ui.drawn())
    expect(drawn.length).toBe(3)
    expect(new Set(drawn.map(one => one.props?.key)).size).toBe(3)
    for (const image of drawn) expect(String(image.props?.key)).toMatch(/^kittex-image-/)
    // Before any answer: the formulas, for a screen reader.
    expect(drawn.map(one => one.props?.alt).sort()).toEqual(['\\alpha', 'e^{i\\pi} + 1 = 0', 'x'])

    // Claude Code hasn't asked the terminal yet: each alt is what its preview shows in those cells.
    await clock.advance(200)
    await ui.redraw()
    drawn = images(await ui.drawn())
    expect(drawn.length).toBe(3)
    const env = inlineEnvFor(kittyEnv(), COLUMNS)
    for (const image of drawn) {
      const alt = String(image.props?.alt)
      expect(alt).not.toContain('\n')
      if (alt === BLANK_ALT) continue
      // One row as wide as the image, the formula's Unicode first.
      expect(cellsOf(alt)).toBe(image.props?.columns)
      expect(['x', 'α']).toContain(alt.trim())
      expect(alt).toBe(inlineAlt(alt.trim() === 'α' ? '\\alpha' : 'x', env, Number(image.props?.columns)))
    }
    expect(drawn.filter(one => one.props?.alt === BLANK_ALT)).toHaveLength(1)
  })
})

describe('Claude Code draws no pictures', () => {
  test('a blit after the drawing finds out, and every block is drawn again in Unicode', async ($, on) => {
    const clock = mock.clock(on)
    const { asked } = engineSays(on, NO)
    await startSession($, on)
    await init()
    const ui = await mount($, REPLY, 'reply-1')
    expect(images(await ui.drawn()).length).toBe(3)
    await clock.advance(1000)
    expect(asked).toHaveLength(1)
    expect(asked[0]).toMatchObject({ requestId: 'reply-1', key: expect.stringMatching(/^kittex-image-/), source: { png: expect.any(String) } })
    await ui.redraw()
    const after = await ui.drawn()
    expect(images(after)).toEqual([])
    expect(JSON.stringify(after)).toContain('α')
    // A new reply streams and lands in Unicode, and nobody asks again.
    expect(images(await (await mount($, REPLY, 'reply-2')).drawn())).toEqual([])
    await clock.advance(5000)
    expect(asked).toHaveLength(1)

    const { text } = await $.command.run(RUN)
    expect(text).toContain('✗ Claude Code draws no pictures here (env: terminal=kitty, not asked yet, no answer), so kittex shows math as Unicode text.')
    expect(text).toContain('`CLAUDE_CODE_FORCE_TERMINAL_IMAGES=1`')
  })
})

describe('Claude Code draws pictures', () => {
  test("while its probe is pending kittex asks again; once it says yes the images stay", async ($, on) => {
    const clock = mock.clock(on)
    const { asked } = engineSays(on, PENDING, PENDING, undefined)
    await startSession($, on)
    await init()
    const ui = await mount($, REPLY)
    await ui.drawn()
    for (let k = 0; k < 6; k++) await clock.advance(2000)
    expect(asked).toHaveLength(3)
    await ui.redraw()
    expect(images(await ui.drawn()).length).toBe(3)
    const { text } = await $.command.run(RUN)
    expect(text).toContain('✓ Claude Code draws the pictures: kitty answered its graphics query')
    expect(asked).toHaveLength(3)
  })

  test('the doctor asks itself when nothing has, and says when no image is drawn yet', async ($, on) => {
    engineSays(on, PENDING)
    await startSession($, on)
    expect(await $.command.run(RUN).then(r => r.text)).toContain("– Claude Code's own check on pictures: known once kittex has drawn an image")
    await init()
    await (await mount($, REPLY)).drawn()
    expect(await $.command.run(RUN).then(r => r.text)).toContain("– Claude Code hasn't asked the terminal about pictures yet (env: terminal=kitty, not asked yet)")
  })

  test('an Image no longer mounted teaches nothing', async ($, on) => {
    const clock = mock.clock(on)
    const { asked } = engineSays(on, 'nothing of this plugin is mounted there')
    await startSession($, on)
    await init()
    const ui = await mount($, REPLY)
    await ui.drawn()
    await clock.advance(1000)
    expect(asked).toHaveLength(1)
    await ui.redraw()
    expect(images(await ui.drawn()).length).toBe(3)
  })
})
