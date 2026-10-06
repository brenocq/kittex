// kittex's hooks through the engine: the off switch, the landed reply's
// drawing, MessageDisplay's wiring, and the instructions to the model.

import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { init, measureDisplay, renderDisplay, toBase64 } from '../hooks/core.js'
import {
  HELD_DISPLAY,
  MATH_INSTRUCTIONS,
  PREVIEW_FENCE_INFO,
  PREVIEW_OVERHEAD_ROWS,
  renderEnvFor,
  REPLY_INDENT,
  replyColumns,
  RESIZE_SETTLE_MS,
  SECTION_ID,
} from '../hooks/math.ts'
import { COLUMNS, COMPOSE, INTRO, KITTY, kittyEnv, startSession } from './support.ts'

const TEX = 'e^{i\\pi} + 1 = 0'
const REPLY = `Euler's identity:\n\n$$${TEX}$$\n\nis beautiful.`

function mountReply($: Engine, text: string, surface: 'terminal' | 'desktop' = 'terminal') {
  return $.ui.mount({
    plugin: 'kittex',
    surface,
    component: 'AssistantMessage',
    props: { text, isFirstOfReply: true },
    viewport: { columns: COLUMNS, rows: 50 },
  })
}

describe('off switch', () => {
  test('enabled: false changes nothing', { options: { enabled: false } }, async ($, on) => {
    await startSession($, on)
    const ui = await mountReply($, REPLY)
    expect(await ui.drawn()).toEqual({ type: 'Text', children: [REPLY] })
    const composed = await $.prompt.compose(COMPOSE)
    expect(composed.sections.map(section => section.id)).toEqual([INTRO.id])
  })
})

describe('AssistantMessage', () => {
  test('a $$ formula becomes an Image between engine drawings of the prose', async ($, on) => {
    await startSession($, on)
    await init()
    const ui = await mountReply($, REPLY)
    const rows = measureDisplay(TEX, renderEnvFor(kittyEnv(), COLUMNS)).rows
    expect(await ui.drawn()).toMatchObject({
      type: 'Box',
      props: { flexDirection: 'column' },
      children: [
        { type: 'Text', children: ["Euler's identity:"] },
        {
          type: 'Box',
          props: { marginLeft: REPLY_INDENT },
          children: [{ type: 'Image', props: { columns: replyColumns(COLUMNS), rows, alt: TEX, source: { png: expect.any(String) } } }],
        },
        { type: 'Text', children: ['is beautiful.'] },
      ],
    })
  })

  test('a formula MathJax refuses stays as its source in a latex block', async ($, on) => {
    await startSession($, on)
    const bad = 'Bad:\n\n$$\\frac{1}{$$\n\nafter.'
    const drawn = await (await mountReply($, bad)).drawn()
    expect(drawn).toEqual({ type: 'Text', children: ['Bad:\n\n```latex\n\\frac{1}{\n```\n\nafter.'] })
  })

  test('a reply without math is drawn by the engine untouched', async ($, on) => {
    await startSession($, on)
    const ui = await mountReply($, 'Just prose, costs 5 dollars.')
    expect(await ui.drawn()).toEqual({ type: 'Text', children: ['Just prose, costs 5 dollars.'] })
  })

  test('a surface without images gets the Unicode preview in the text', async ($, on) => {
    await startSession($, on)
    const ui = await mountReply($, REPLY, 'desktop')
    const drawn = await ui.drawn()
    expect(drawn).toMatchObject({ type: 'Text' })
    const text = JSON.stringify(drawn)
    expect(text).not.toContain('$$')
    expect(text).toContain('```text')
  })

  test('a terminal without images gets the Unicode preview in the text', async ($, on) => {
    await startSession($, on, { TERM_PROGRAM: 'WezTerm' })
    const ui = await mountReply($, REPLY)
    const drawn = await ui.drawn()
    expect(drawn).toMatchObject({ type: 'Text' })
    expect(await ui.find({ type: 'Image' })).toBeUndefined()
    expect(JSON.stringify(drawn)).toContain('```text')
  })

  test('a summary is left alone', async ($, on) => {
    await startSession($, on)
    const ui = await $.ui.mount({
      plugin: 'kittex',
      surface: 'terminal',
      component: 'AssistantMessage',
      props: { text: REPLY, isFirstOfReply: true, isSummary: true },
      viewport: { columns: COLUMNS, rows: 50 },
    })
    expect(await ui.drawn()).toEqual({ type: 'Text', children: [REPLY] })
  })
})

describe('terminal changes', () => {
  test('a theme change recolours the formulas', async ($, on) => {
    on('config.set', ($, e) => ({ value: e.value }))
    await startSession($, on)
    const ui = await mountReply($, REPLY)
    const before = await ui.find({ type: 'Image' })
    await $.config.set({ key: 'theme', value: 'light', previous: 'dark', provider: { plugin: 'engine', tier: 'core' }, origin: { kind: 'composer' } } as never)
    await ui.redraw()
    const after = await ui.find({ type: 'Image' })
    expect(after).toBeDefined()
    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before))
  })

  test('the text colour of a custom theme is read from its file', async ($, on) => {
    const read: string[] = []
    on('fs.read', ($, e) => {
      read.push(e.path)
      return e.path === '/home/me/.claude/themes/sepia.json'
        ? { value: JSON.stringify({ base: 'light', overrides: { text: '#704214' } }) }
        : { deny: 'no such file' }
    })
    await startSession($, on, { ...KITTY, HOME: '/home/me' }, 'custom:sepia')
    const image = await (await mountReply($, REPLY)).find({ type: 'Image' })
    expect(read).toContain('/home/me/.claude/themes/sepia.json')
    await init()
    const sepia = renderDisplay(TEX, { ...renderEnvFor(kittyEnv(), COLUMNS), ink: { r: 0x70, g: 0x42, b: 0x14 } })
    expect(image?.props).toMatchObject({ source: { png: toBase64(sepia.png) } })
  })

  test('a new width probes the cell size again once it settles', async ($, on) => {
    const clock = mock.clock(on)
    const session = await startSession($, on)
    expect(session.cellProbes()).toBe(1)
    const ui = await $.ui.mount({
      plugin: 'kittex',
      surface: 'terminal',
      component: 'AssistantMessage',
      props: { text: REPLY, isFirstOfReply: true },
      viewport: { columns: 80, rows: 50 },
    })
    expect((await ui.find({ type: 'Image' }))?.props).toMatchObject({ columns: replyColumns(80) })
    await clock.advance(RESIZE_SETTLE_MS)
    expect(session.cellProbes()).toBe(2)
    await ui.redraw()
    await clock.advance(RESIZE_SETTLE_MS)
    expect(session.cellProbes()).toBe(2)
  })
})

describe('MessageDisplay', () => {
  /** Streams `flushes` as one message; what each flush showed. */
  async function stream($: Engine, id: string, flushes: readonly string[]): Promise<string[]> {
    const shown: string[] = []
    for (const [index, delta] of flushes.entries()) {
      const final = index === flushes.length - 1
      const result = await $.classic.MessageDisplay({ turn_id: 't1', message_id: id, index, final, delta })
      shown.push(result.displayContent ?? delta)
    }
    return shown
  }

  test('an open display block shows nothing until it closes, then exactly its reserved rows', async ($, on) => {
    await startSession($, on)
    await init()
    const shown = await stream($, 'm1', ["Euler's identity:\n", '$$\n', `${TEX}\n`, '$$\n', 'is beautiful.'])
    expect(shown.slice(0, 3)).toEqual(["Euler's identity:\n", HELD_DISPLAY, HELD_DISPLAY])
    const rows = measureDisplay(TEX, renderEnvFor(kittyEnv(), COLUMNS)).rows
    const fence = shown[3]!.split('\n')
    expect(fence[0]).toBe('```' + PREVIEW_FENCE_INFO)
    expect(fence.indexOf('```', 1) - 1).toBe(rows - PREVIEW_OVERHEAD_ROWS)
    expect(shown[4]).toBe('is beautiful.')
  })

  test('a streamed reply lands as an Image of the rows its preview reserved', async ($, on) => {
    await startSession($, on)
    await init()
    const landed = (await stream($, 'm2', ["Euler's identity:\n", '$$\n', `${TEX}\n`, '$$\n', 'is beautiful.'])).join('')
    expect(landed).not.toContain('$$')
    const ui = await mountReply($, landed)
    const rows = measureDisplay(TEX, renderEnvFor(kittyEnv(), COLUMNS)).rows
    expect(await ui.drawn()).toMatchObject({
      children: [
        { type: 'Text', children: ["Euler's identity:"] },
        { children: [{ type: 'Image', props: { rows, alt: TEX } }] },
        { type: 'Text', children: ['is beautiful.'] },
      ],
    })
  })

  test('a held line that turns out to be prose comes back as written', async ($, on) => {
    await startSession($, on)
    const flushes = ['It costs $5\n', 'and that is all.\n', '\n', 'Next paragraph.']
    const shown = await stream($, 'm3', flushes)
    expect(shown.join('')).toBe(flushes.join(''))
  })

  test('prose without math passes through unchanged', async ($, on) => {
    await startSession($, on)
    const shown = await $.classic.MessageDisplay({ turn_id: 't1', message_id: 'm2', index: 0, final: true, delta: 'Hello.\n' })
    expect(shown.displayContent).toBeUndefined()
  })
})

describe('instructions to the model', () => {
  // Stands for the engine filling the facts of a plugin's $.prompt.compose()
  // call (a test session has no model); with `strip`, also for the policy
  // plugin (cc-plugin-sec-default) that skips installed plugins' prompt hooks.
  const facts = {
    name: 'facts',
    tier: 'prepend' as const,
    register(on: import('claude-code').On) {
      on('prompt.compose', async ($, e, next) => {
        const composed = await next({ ...e, promptModel: e.promptModel ?? 'claude', tools: e.tools ?? [], outputStyle: e.outputStyle ?? null, traits: e.traits ?? [] })
        return composed
      })
    },
  }
  const policy = {
    name: 'policy',
    tier: 'prepend' as const,
    register(on: import('claude-code').On) {
      on('prompt.compose', async ($, e, next) => {
        const composed = await next({ ...e, promptModel: e.promptModel ?? 'claude', tools: e.tools ?? [], outputStyle: e.outputStyle ?? null, traits: e.traits ?? [] })
        return { sections: composed.sections.filter(section => !section.id.startsWith('kittex:')) }
      })
    },
  }

  /** A prompt typed at the terminal; resolves to what entered, context included. */
  function submit($: Engine, text: string) {
    return $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
  }

  function answerSubmit(on: import('claude-code').On) {
    on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
    on('classic.SessionStart', () => ({}))
  }

  test('prompt.compose adds the kittex:math section on a terminal', { plugins: [facts] }, async ($, on) => {
    await startSession($, on)
    const composed = await $.prompt.compose(COMPOSE)
    expect(composed.sections).toEqual([INTRO, { id: SECTION_ID, text: MATH_INSTRUCTIONS, scope: 'session' }])
    const headless = await $.prompt.compose({ ...COMPOSE, surfaces: [] })
    expect(headless.sections).toEqual([INTRO])
  })

  test('with the section in place, prompts carry no extra context', { plugins: [facts] }, async ($, on) => {
    answerSubmit(on)
    await startSession($, on)
    const entered = await submit($, 'hi')
    expect(entered.context ?? []).toEqual([])
  })

  test('when a policy drops the section, the first prompt of each conversation carries it', { plugins: [policy] }, async ($, on) => {
    answerSubmit(on)
    await startSession($, on)
    expect((await submit($, 'first')).context).toEqual([MATH_INSTRUCTIONS])
    expect((await submit($, 'second')).context ?? []).toEqual([])

    await $.classic.SessionStart({ source: 'clear' })
    expect((await submit($, 'after clear')).context).toEqual([MATH_INSTRUCTIONS])
    expect((await submit($, 'again')).context ?? []).toEqual([])

    await $.classic.SessionStart({ source: 'compact' })
    expect((await submit($, 'after compaction')).context).toEqual([MATH_INSTRUCTIONS])
  })
})
