// kittex's hooks through the engine: the off switch, the landed reply's
// drawing, MessageDisplay's wiring, and the instructions to the model.

import { describe, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { chooseInk, init, measureDisplay, renderDisplay, toBase64 } from '../hooks/core.js'
import {
  BULLET,
  copiedFormula,
  COPY_LABEL,
  HELD_DISPLAY,
  MARKDOWN_TAIL,
  MATH_INSTRUCTIONS,
  PIECE_TOP,
  PREVIEW_PAD,
  renderEnvFor,
  REPLY_INDENT,
  replyColumns,
  SECTION_ID,
} from '../hooks/math.ts'
import { COLUMNS, COMPOSE, INTRO, KITTY, kittyEnv, startSession, test } from './support.ts'

const TEX = 'e^{i\\pi} + 1 = 0'
const REPLY = `Euler's identity:\n\n$$${TEX}$$\n\nis beautiful.`

function mountReply($: Engine, text: string, surface: 'terminal' | 'desktop' = 'terminal', isFirstOfReply = true) {
  return $.ui.mount({
    plugin: 'kittex',
    surface,
    component: 'AssistantMessage',
    props: { text, isFirstOfReply },
    viewport: { columns: COLUMNS, rows: 50, isFullscreen: false },
  })
}

/**
 * A display formula as kittex draws it: a slot of the overlay laid over the
 * engine's drawing of the prose (`slot`: its margins there), holding its Image
 * and a copy button revealed on hover over it.
 */
function formula(image: Record<string, unknown>, slot: Record<string, unknown> = {}) {
  return {
    type: 'Box',
    props: slot,
    children: [
      { type: 'Image', ...image },
      { type: 'Box', props: { position: 'absolute', top: 0, right: 0, display: 'none' }, hover: { display: 'flex' }, children: [{ type: 'Button', props: { label: COPY_LABEL } }] },
    ],
  }
}

/** A prose piece as kittex composes it: the engine's drawing of its text (a Text of it here), the formulas' slots laid over it. */
function overlaid(text: unknown, slots: unknown[]) {
  return {
    type: 'Box',
    props: { flexDirection: 'row-reverse' },
    children: [
      { type: 'Box', props: { flexDirection: 'column' }, children: [{ type: 'Text', children: [text] }] },
      { type: 'Box', props: { width: 0 }, children: slots },
    ],
  }
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
  test('a $$ formula becomes an Image over the preview it streams as, in the engine drawing of the prose', async ($, on) => {
    await startSession($, on)
    await init()
    const ui = await mountReply($, REPLY)
    const rows = measureDisplay(TEX, renderEnvFor(kittyEnv(), COLUMNS)).rows
    // The text, the blank row, then the preview's rows (a paragraph of its own), under the drawing's top margin and beside the bullet.
    expect(await ui.drawn()).toMatchObject({
      type: 'Box',
      props: { flexDirection: 'column' },
      children: [
        overlaid(expect.stringMatching(/^Euler's identity:\n\n&nbsp;[^]*\nis beautiful\.$/), [
          formula({ props: { columns: replyColumns(COLUMNS), rows, alt: TEX, source: { png: expect.any(String) } } }, { marginTop: PIECE_TOP + 2, marginLeft: REPLY_INDENT }),
        ]),
      ],
    })
  })

  test('each formula has a copy button that puts its LaTeX on the clipboard', async ($, on) => {
    // The engine's clipboard, beneath the plugin: registered before the test's first $ call.
    const copied: string[] = []
    on('ui.copy', ($, e) => {
      copied.push(e.text)
      return { value: { isCopied: true } }
    })
    await startSession($, on)
    await init()
    const ui = await mountReply($, REPLY)
    const button = await ui.find({ type: 'Button' })
    expect(button?.props).toMatchObject({ label: COPY_LABEL })
    await ui.press({ key: String(button?.key) })
    expect(copied).toEqual([copiedFormula(TEX)])
    expect(copiedFormula(TEX)).toBe(`$$\n${TEX}\n$$`)
  })

  test('with no blank lines around the formula, its preview is a paragraph of its own as it streams', async ($, on) => {
    await startSession($, on)
    await init()
    const ui = await mountReply($, `Euler's identity:\n$$\n${TEX}\n$$\nis beautiful.`)
    expect(await ui.drawn()).toMatchObject({
      children: [overlaid(expect.stringMatching(/^Euler's identity:\n\n&nbsp;/), [formula({ props: { alt: TEX } }, { marginTop: PIECE_TOP + 2, marginLeft: REPLY_INDENT })])],
    })
  })

  test('a block that opens with a formula keeps its bullet beside the image', async ($, on) => {
    await startSession($, on)
    await init()
    const ui = await mountReply($, `$$${TEX}$$\n\nis beautiful.`)
    // The engine draws the bullet beside the preview's first row, the image over the rows after it.
    expect(await ui.drawn()).toMatchObject({
      children: [overlaid(expect.stringMatching(/^&nbsp;[^]*is beautiful\.$/), [formula({ props: { alt: TEX } }, { marginTop: PIECE_TOP, marginLeft: REPLY_INDENT })])],
    })
    expect(BULLET.other).toBe('●')
  })

  test('a block drawn without the bullet keeps everything at column 0', async ($, on) => {
    await startSession($, on)
    await init()
    const ui = await mountReply($, `$$${TEX}$$\n\nis beautiful.`, 'terminal', false)
    expect(await ui.drawn()).toMatchObject({
      children: [overlaid(expect.stringMatching(/^&nbsp;/), [formula({}, { marginTop: PIECE_TOP, marginLeft: 0 })])],
    })
  })

  test('a formula MathJax refuses stays as its source, with a dim note under it', async ($, on) => {
    await startSession($, on)
    const bad = 'Bad:\n\n$$\\frac{1}{$$\n\nafter.'
    const drawn = await (await mountReply($, bad)).drawn()
    expect(drawn).toMatchObject({
      children: [
        { type: 'Text', children: ['Bad:\n\n```latex\n\\frac{1}{\n```'] },
        { type: 'Box', props: { paddingLeft: REPLY_INDENT, marginTop: 1 }, children: [{ type: 'Text', props: { dimColor: true }, children: [expect.stringMatching(/^not rendered: /)] }] },
        // A piece with no markdown of its own is read as markdown, as the whole was (its escapes read).
        { type: 'Box', props: { paddingLeft: REPLY_INDENT, marginTop: 0 }, children: [{ type: 'Text', children: [`after.${MARKDOWN_TAIL}`] }] },
      ],
    })
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
    expect(text).toContain(PREVIEW_PAD)
  })

  test('a terminal without images gets the Unicode preview in the text', async ($, on) => {
    await startSession($, on, { TERM_PROGRAM: 'WezTerm' })
    const ui = await mountReply($, REPLY)
    const drawn = await ui.drawn()
    expect(drawn).toMatchObject({ type: 'Text' })
    expect(await ui.find({ type: 'Image' })).toBeUndefined()
    expect(JSON.stringify(drawn)).toContain(PREVIEW_PAD)
  })

  test('a summary is left alone', async ($, on) => {
    await startSession($, on)
    const ui = await $.ui.mount({
      plugin: 'kittex',
      surface: 'terminal',
      component: 'AssistantMessage',
      props: { text: REPLY, isFirstOfReply: true, isSummary: true },
      viewport: { columns: COLUMNS, rows: 50, isFullscreen: false },
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

  test("a custom theme's text colour does not reach the formulas (it paints only the bullet)", async ($, on) => {
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
    // The terminal's foreground is unknown here, so the base theme's text colour stands in.
    const ink = chooseInk({ theme: 'light', prefer: 'terminal' })
    expect(ink).not.toEqual({ r: 0x70, g: 0x42, b: 0x14 })
    const rows = measureDisplay(TEX, renderEnvFor(kittyEnv(), COLUMNS)).rows
    const light = renderDisplay(TEX, { ...renderEnvFor(kittyEnv(), COLUMNS), ink }, rows)
    expect(image?.props).toMatchObject({ source: { png: toBase64(light.png) } })
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
    // A paragraph of its own: a blank line, the preview rows, then the `$$`
    // line's newline after the block's own (a blank line before the text).
    const lines = shown[3]!.split('\n')
    expect(lines[0]).toBe('')
    expect(lines.slice(1, -2)).toHaveLength(rows)
    expect(lines.slice(1, -2).every(line => line.startsWith(PREVIEW_PAD))).toBe(true)
    expect(lines.slice(-2)).toEqual(['', ''])
    expect(shown[4]).toBe('is beautiful.')
  })

  test('flushes of two messages streaming at once keep their own state', async ($, on) => {
    await startSession($, on)
    await init()
    expect((await $.classic.MessageDisplay({ turn_id: 't', message_id: 'a', index: 0, final: false, delta: '$$\n' })).displayContent).toBe(HELD_DISPLAY)
    const b = await $.classic.MessageDisplay({ turn_id: 't', message_id: 'b', index: 0, final: true, delta: 'Plain $x$ text.\n' })
    expect(b.displayContent).not.toContain(PREVIEW_PAD)
    const a = await $.classic.MessageDisplay({ turn_id: 't', message_id: 'a', index: 1, final: true, delta: `${TEX}\n$$\n` })
    expect(a.displayContent).toContain(PREVIEW_PAD)
  })

  test('a streamed reply lands as an Image of the rows its preview reserved', async ($, on) => {
    await startSession($, on)
    await init()
    const landed = (await stream($, 'm2', ["Euler's identity:\n", '$$\n', `${TEX}\n`, '$$\n', 'is beautiful.'])).join('')
    expect(landed).not.toContain('$$')
    const ui = await mountReply($, landed)
    const rows = measureDisplay(TEX, renderEnvFor(kittyEnv(), COLUMNS)).rows
    // Drawn as it streamed, the image over the preview's rows.
    expect(await ui.drawn()).toMatchObject({
      children: [overlaid(landed.trimEnd(), [formula({ props: { rows, alt: TEX } }, { marginTop: PIECE_TOP + 2, marginLeft: REPLY_INDENT })])],
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
    for (const phrase of ['no space just inside the dollars', 'with a blank line before and after', 'Put dollar amounts and shell variables in code spans', '(/btw)']) {
      expect(MATH_INSTRUCTIONS).toContain(phrase)
    }
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
