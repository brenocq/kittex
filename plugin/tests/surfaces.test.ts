// kittex outside a terminal. A -p run and the SDK (Claude Code for VS Code,
// the desktop app) start with no surface: the engine passes each finished
// message through MessageDisplay once and sends its displayContent as the
// message's text, so a rewrite there would change what those clients (and a
// -p run's output) receive. A remote surface (desktop, vscode, mobile) asks
// for its drawings with the props it holds and draws markdown its own way.
// Neither has kitty graphics: kittex probes nothing, rewrites nothing and
// tells the model nothing there.

import { describe, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, RenderSurface } from 'claude-code'

import { COLUMNS, COMPOSE, INTRO, KITTY, startSession, test } from './support.ts'
import { SECTION_ID } from '../hooks/math.ts'

const TIKZ = '```latex\n\\begin{tikzpicture}\n\\draw[red] (0,0) -- (2,1);\n\\end{tikzpicture}\n```'
const TABLE = '| quantity | value |\n|---|---|\n| energy | $E = mc^2$ |\n| area | $\\pi r^2$ |'
/** A reply with every kind of math kittex draws: display, inline, a table, a diagram. */
const REPLY = `Euler's identity:\n\n$$\ne^{i\\pi} + 1 = \\frac{a}{b}\n$$\n\nand $x^2$ inline.\n\n${TABLE}\n\nA figure:\n\n${TIKZ}\n\nDone.`
const REMOTE: readonly RenderSurface[] = ['desktop', 'vscode', 'mobile']

/** The world beneath the plugins without a terminal: kitty's variables (Claude Code started from it), every command recorded and answered. */
function world(on: On): { runs: string[][] } {
  mock.env(on, { ...KITTY, PATH: '/usr/bin', HOME: '/home/user' })
  const runs: string[][] = []
  on('process.run', ($, e) => {
    runs.push([...e.argv])
    return { value: { exitCode: 0, stdout: '50 100 1300 1000\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('prompt.compose', () => ({ sections: [INTRO] }))
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
  on('classic.MessageDisplay', () => ({}))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => ({ type: 'Text' as const, children: [e.props.text] }))
  return { runs }
}

/** What the SDK receives for a finished message: one final flush of the whole text (shown as the hook left it). */
async function sdkMessage($: Engine, text: string, id = 'm1'): Promise<string | undefined> {
  return (await $.classic.MessageDisplay({ turn_id: 't', message_id: id, index: 0, final: true, delta: text })).displayContent
}

function mountOn($: Engine, surface: RenderSurface, text: string) {
  return $.ui.mount({
    plugin: 'kittex',
    surface,
    component: 'AssistantMessage',
    props: { text, isFirstOfReply: true },
    viewport: { columns: COLUMNS, rows: 50, isFullscreen: false },
  } as never)
}

describe('a -p run or the SDK', () => {
  for (const surface of [null, ...REMOTE]) {
    test(`session.start on ${surface ?? 'no surface'}: no probe runs, no rewrite, no instructions`, async ($, on) => {
      const clock = mock.clock(on)
      const { runs } = world(on)
      await $.session.start({ cwd: '/tmp', surface, isInteractive: false })
      for (let k = 0; k < 4; k++) await clock.advance(1000)
      // No cell probe, uname, kitty +runpy, font lookup, cache prune, latex or kpsewhich.
      expect(runs).toEqual([])

      // The SDK's one flush of a finished message: its text stays the model's.
      expect(await sdkMessage($, REPLY)).toBeUndefined()
      // A message in several flushes (should the engine stream one) passes as written too.
      const lines = REPLY.split(/(?<=\n)/)
      for (const [index, delta] of lines.entries()) {
        const shown = await $.classic.MessageDisplay({ turn_id: 't', message_id: 'm2', index, final: index === lines.length - 1, delta })
        expect(shown.displayContent).toBeUndefined()
      }

      // The model is told nothing of kittex's: no section, no context.
      for (const surfaces of [[], ['vscode'], ['desktop'], ['mobile']] as const) {
        const composed = await $.prompt.compose({ ...COMPOSE, surfaces })
        expect(composed.sections.map(one => one.id)).toEqual([INTRO.id])
      }
      expect((await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })).context ?? []).toEqual([])

      // A client drawing the reply gets the engine's own drawing of it.
      for (const remote of REMOTE) {
        const ui = await mountOn($, remote, REPLY)
        expect(await ui.drawn()).toEqual({ type: 'Text', children: [REPLY] })
      }
      expect(runs).toEqual([])
    })
  }

  test('a resumed conversation drawn on a client before session.start is the engine drawing, at once', async ($, on) => {
    world(on)
    for (const remote of REMOTE) {
      const ui = await mountOn($, remote, REPLY)
      expect(await ui.drawn()).toEqual({ type: 'Text', children: [REPLY] })
    }
  })
})

describe('a terminal session with a client attached', () => {
  test('the terminal still gets the instructions and its images', async ($, on) => {
    await startSession($, on)
    const composed = await $.prompt.compose({ ...COMPOSE, surfaces: ['terminal', 'mobile'] })
    expect(composed.sections.map(one => one.id)).toEqual([INTRO.id, SECTION_ID])
    const ui = await mountOn($, 'terminal', REPLY)
    expect(await ui.find({ type: 'Image' })).toBeDefined()
  })

  test('a client draws the reply its own way: LaTeX as written, or a streamed text as shown', async ($, on) => {
    await startSession($, on)
    // As streamed in the terminal (previews in place of the formulas), should a client hold that text.
    const lines = REPLY.split(/(?<=\n)/)
    let shown = ''
    for (const [index, delta] of lines.entries()) {
      const result = await $.classic.MessageDisplay({ turn_id: 't', message_id: 'm1', index, final: index === lines.length - 1, delta })
      shown += result.displayContent ?? delta
    }
    expect(shown).not.toBe(REPLY)
    for (const remote of REMOTE) {
      for (const text of [REPLY, shown, 'Costs $5, or \\(x\\) and \\[y\\].']) {
        const ui = await mountOn($, remote, text)
        expect(await ui.drawn()).toEqual({ type: 'Text', children: [text] })
      }
    }
    // The terminal's drawing of the same reply is kittex's.
    expect(await (await mountOn($, 'terminal', REPLY)).find({ type: 'Image' })).toBeDefined()
  })
})
