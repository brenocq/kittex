// The `block` and `inline` options through the engine: each of the nine
// combinations streamed, landed and read back after --resume, in kitty and in
// a terminal without images; the instructions to the model; and a setting
// changed under replies already on screen.

import { describe, expect } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { init, measureDisplay, previewInline, renderDisplay, renderInline } from '../hooks/core.js'
import {
  displayPreviewLines,
  INLINE_JOIN,
  INLINE_MARK,
  INLINE_PAD,
  inlineEnvFor,
  MATH_MODES,
  MessageStream,
  mathOptions,
  planLanded,
  proseWidthFor,
  renderEnvFor,
  rawSource,
  replyColumns,
  SECTION_ID,
  SOURCE_PATTERN,
  sourcePattern,
  streamEnvFor,
} from '../hooks/math.ts'
import type { KittexEnv, MathMode, MathOptions, PreviewRecord } from '../hooks/math.ts'
import { COLUMNS, COMPOSE, kittyEnv, KITTY, startSession, test } from './support.ts'

const DISPLAY = 'e^{i\\pi} + 1 = 0'
const INLINE = 'x'
const REPLY = `Euler's identity, with $${INLINE}$ inline:\n\n$$${DISPLAY}$$\n\nis beautiful.`
/** A terminal that draws no images. */
const XTERM = { TERM: 'xterm-256color' }

const TERMINALS = [
  { name: 'kitty', variables: KITTY, images: true },
  { name: 'xterm', variables: XTERM, images: false },
] as const

const COMBINATIONS = MATH_MODES.flatMap(block => MATH_MODES.map(inline => ({ block, inline })))

/** Streams a reply through MessageDisplay a line per flush, as the engine does; what it shows. */
async function stream($: Engine, text: string, id = 'm'): Promise<string> {
  const lines = text.split(/(?<=\n)/)
  let shown = ''
  for (const [index, delta] of lines.entries()) {
    const result = await $.classic.MessageDisplay({ turn_id: 't', message_id: id, index, final: index === lines.length - 1, delta })
    shown += result.displayContent ?? delta
  }
  return shown
}

function mount($: Engine, text: string) {
  return $.ui.mount({
    plugin: 'kittex',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text, isFirstOfReply: true },
    viewport: { columns: COLUMNS, rows: 50, isFullscreen: false },
  })
}

/** The formulas drawn as images in a drawing, by their alt text. */
function imagesIn(node: unknown): string[] {
  if (typeof node !== 'object' || node === null) return []
  const element = node as { type?: unknown; props?: { alt?: string }; children?: unknown[] }
  const own = element.type === 'Image' ? [String(element.props?.alt)] : []
  return [...own, ...(element.children ?? []).flatMap(imagesIn)]
}

/** A drawing with its images' pixels left out and its handlers' ids left out. */
function shapeOf(node: unknown): unknown {
  return JSON.parse(JSON.stringify(node, (key, value: unknown) => (key === 'png' || key === 'key' || key === 'handle' ? undefined : value)))
}

describe('the nine combinations', () => {
  for (const terminal of TERMINALS) {
    for (const { block, inline } of COMBINATIONS) {
      const name = `${terminal.name}: block ${block}, inline ${inline}`
      const blockImage = terminal.images && block === 'image'
      const inlineImage = terminal.images && inline === 'image'
      test(`${name}: streams, lands and resumes as the options say`, { options: { block, inline } }, async ($, on) => {
        await startSession($, on, terminal.variables)
        await init()
        const shown = await stream($, REPLY)

        // Streaming: each kind as its option says, the other kind alike whatever this one is.
        if (block === 'raw') expect(shown).toContain(`\n$$${DISPLAY}$$\n`)
        else expect(shown).not.toContain(`$$${DISPLAY}$$`)
        const unicode = displayPreviewLines(DISPLAY, replyColumns(COLUMNS))!.join('\n')
        if (block === 'unicode' || (block === 'image' && !terminal.images)) expect(shown).toContain(unicode)
        if (blockImage) {
          const rows = measureDisplay(DISPLAY, renderEnvFor(kittyEnv(), COLUMNS)).rows
          expect(shown).toContain(displayPreviewLines(DISPLAY, replyColumns(COLUMNS), rows)!.join('\n'))
        }
        if (inline === 'raw') expect(shown).toContain(`with $${INLINE}$ inline`)
        else if (inlineImage) expect(shown).toMatch(new RegExp(`with ${previewInline(INLINE)}[${INLINE_PAD}${INLINE_MARK}${INLINE_JOIN}]`))
        else expect(shown).toContain(`with ${previewInline(INLINE)} inline`)
        if (block === 'raw' && inline === 'raw') expect(shown).toBe(REPLY)

        // Landing: images for the kinds set to image (where the terminal draws them), none otherwise.
        const live = await (await mount($, shown)).drawn()
        expect(imagesIn(live).sort()).toEqual([...(blockImage ? [DISPLAY] : []), ...(inlineImage ? [INLINE] : [])].sort())
        // Nothing moves: without images the landed text is the streamed one, as it streamed.
        if (!blockImage && !inlineImage) expect(live).toEqual({ type: 'Text', children: [shown] })

        // Resumed (the LaTeX as written lands directly): drawn as the live landing is.
        const resumed = await (await mount($, REPLY)).drawn()
        expect(shapeOf(resumed)).toEqual(shapeOf(live))
      })
    }
  }

  test('both raw: no hook alters the text (MessageDisplay passes, landing is the engine\'s)', { options: { block: 'raw', inline: 'raw' } }, async ($, on) => {
    await startSession($, on)
    await init()
    const result = await $.classic.MessageDisplay({ turn_id: 't', message_id: 'm', index: 0, final: true, delta: REPLY })
    expect(result.displayContent).toBeUndefined()
    expect(await (await mount($, REPLY)).drawn()).toEqual({ type: 'Text', children: [REPLY] })
  })

  test('a stored value outside the options counts as image', async () => {
    expect(mathOptions({})).toEqual({ block: 'image', inline: 'image' })
    expect(mathOptions({ block: true, inline: false })).toEqual({ block: 'image', inline: 'image' })
    expect(mathOptions({ block: 'unicode', inline: 'raw' })).toEqual({ block: 'unicode', inline: 'raw' })
  })
})

describe('which landed blocks kittex takes from the engine', () => {
  // A block taken on its first render is drawn as nothing until kittex answers:
  // one holding only math left raw stays the engine's.
  test('only blocks holding math of a kind kittex changes', () => {
    const display = 'So:\n\n$$x^2$$\n\nthen\n\\begin{aligned}a\\end{aligned}\n'
    const inline = 'So $x$ and $y$ here.'
    expect(sourcePattern({ block: 'image', inline: 'image' }).source).toBe(SOURCE_PATTERN.source)
    expect(sourcePattern({ block: 'raw' }).test(display)).toBe(false)
    expect(sourcePattern({ block: 'raw' }).test(inline)).toBe(true)
    expect(sourcePattern({ block: 'raw' }).test('So $$x$$ inline.')).toBe(true)
    expect(sourcePattern({ block: 'raw' }).test('$$x$$ and more.')).toBe(true)
    expect(sourcePattern({ block: 'raw' }).test('> $$x$$\n')).toBe(false)
    expect(sourcePattern({ block: 'raw' }).test('$$\nx\n$$ and more.\n')).toBe(true)
    expect(sourcePattern({ block: 'raw' }).test('$$\nx\n$$\n\n$$\ny\n$$ more\n')).toBe(true)
    expect(sourcePattern({ block: 'raw' }).test('$$\nx\n$$\n\n$$\ny\n$$\n')).toBe(false)
    expect(sourcePattern({ inline: 'raw' }).test(inline)).toBe(false)
    expect(sourcePattern({ inline: 'raw' }).test(display)).toBe(true)
  })

  test('math left raw counts where a backslash in it needs its mark (as read back after --resume)', () => {
    for (const text of ['$$\\{x\\}$$\n', '\\[y\\]\n', '\\begin{align}a \\\\\nb\\end{align}\n']) expect(sourcePattern({ block: 'raw' }).test(text)).toBe(true)
    for (const text of ['So $\\{x\\}$ here.', 'So $a\\,b$ here.', 'So \\(y\\) here.']) expect(sourcePattern({ inline: 'raw' }).test(text)).toBe(true)
    // Marked already (streamed): the block holds a preview mark, and is no source.
    expect(sourcePattern({ inline: 'raw' }).test(`So $\\${INLINE_MARK}{x\\${INLINE_MARK}}$ here.`)).toBe(false)
  })
})

describe('math left raw keeps its backslashes', () => {
  // The engine's markdown reads `\{`, `\,`, `\\` and a backslash before a line
  // break as escapes and drops the backslash: each gets a mark of no width.
  const INLINE_RAW = 'Sets $\\{x\\}\\,y$ and $a\\\\b$ here.'
  const BLOCK_RAW = '$$\\{x\\}\\,y$$\n\n\\begin{align}\na &= b \\\\\nc &= d\n\\end{align}'
  const reply = `${INLINE_RAW}\n\n${BLOCK_RAW}\n\nDone.`
  const marked = (text: string) => text.replace(/\\(?=[{},\\\n])/g, `\\${INLINE_MARK}`)
  const cases: [MathMode, MathMode][] = [
    ['raw', 'image'],
    ['raw', 'unicode'],
    ['image', 'raw'],
    ['unicode', 'raw'],
  ]
  for (const [block, inline] of cases) {
    test(`block ${block}, inline ${inline}: streamed, landed and resumed with every backslash`, { options: { block, inline } }, async ($, on) => {
      await startSession($, on)
      await init()
      const shown = await stream($, reply)
      if (inline === 'raw') expect(shown).toContain(marked(INLINE_RAW))
      if (block === 'raw') expect(shown).toContain(marked(BLOCK_RAW))
      // Without the marks, the text is Claude's where it is left raw.
      if (inline === 'raw') expect(shown.replaceAll(INLINE_MARK, '')).toContain(INLINE_RAW)
      if (block === 'raw') expect(shown.replaceAll(INLINE_MARK, '')).toContain(BLOCK_RAW)
      // Landed: the raw math as streamed; resumed: marked the same way, drawn as the live landing.
      const live = await (await mount($, shown)).drawn()
      const resumed = await (await mount($, reply)).drawn()
      expect(shapeOf(resumed)).toEqual(shapeOf(live))
      if (inline === 'raw') expect(JSON.stringify(live)).toContain(JSON.stringify(marked(INLINE_RAW)).slice(1, -1))
      if (block === 'raw') expect(JSON.stringify(live)).toContain(JSON.stringify(marked('\\begin{align}\na &= b \\\\\nc &= d\n\\end{align}')).slice(1, -1))
    })
  }

  test('rawSource: marks each backslash markdown would drop, once', async () => {
    const M = INLINE_MARK
    const span = (raw: string, tex = raw.slice(1, -1), display = false) => rawSource({ raw, tex, display, delimiter: display ? '$$' : '$' })
    expect(span('$\\{x\\}\\,\\;\\!y$')).toBe(`$\\${M}{x\\${M}}\\${M},\\${M};\\${M}!y$`)
    expect(span('$a\\\\b$')).toBe(`$a\\${M}\\b$`)
    expect(span('$\\alpha + \\beta$')).toBe('$\\alpha + \\beta$')
    // An escaped dollar stays one (for kittex's scanner, as for the reader).
    expect(span('$a \\$ b$')).toBe('$a \\$ b$')
    // Idempotent: the landing reads the streamed text again.
    const once = span('$\\{x\\}\\\\$')
    expect(span(once)).toBe(once)
    // In a table row `\|` is the row's escape of a pipe (the formula reads it as `|`): it stays.
    expect(rawSource({ raw: '$\\|x\\|\\,$', tex: '|x|\\,', display: false, delimiter: '$' })).toBe(`$\\|x\\|\\${M},$`)
    expect(rawSource({ raw: '$\\|x\\|$', tex: '\\|x\\|', display: false, delimiter: '$' })).toBe(`$\\${M}|x\\${M}|$`)
  })

  test('a ```math fence is code: left as written', async () => {
    await init()
    const fence = '```math\n\\{x\\} \\\\ y\n```\n'
    const stream = new MessageStream()
    expect(stream.push(fence, true, streamEnvFor(kittyEnv(), { block: 'raw', inline: 'image' })).text).toBe(fence)
  })
})

describe('instructions to the model', () => {
  const cases: [MathMode, MathMode, boolean][] = [
    ['image', 'image', true],
    ['raw', 'unicode', true],
    ['unicode', 'raw', true],
    ['image', 'raw', true],
    ['raw', 'raw', false],
  ]
  for (const [block, inline, sent] of cases) {
    test(`block ${block}, inline ${inline}: ${sent ? 'sent' : 'not sent'}`, { options: { block, inline } }, async ($, on) => {
      await startSession($, on)
      const composed = await $.prompt.compose(COMPOSE)
      expect(composed.sections.some(section => section.id === SECTION_ID)).toBe(sent)
    })
  }
})

describe('a setting changed under replies already on screen', () => {
  // The config menu reloads the module with the new options: replies streamed
  // under the old ones are drawn again under the new ones, from the same
  // records (kittex.records outlives the reload).
  const reply = `So $${INLINE}$ and $\\alpha_k$ here:\n\n$$${DISPLAY}$$\n\n> quoted $$\\frac{a}{b}$$ too\n\n- an item\n\n  $$\\sum_i x_i$$\n\ndone.\n`

  function streamed(env: KittexEnv, math: MathOptions): { shown: string; records: PreviewRecord[] } {
    const stream = new MessageStream()
    const lines = reply.split(/(?<=\n)/)
    let shown = ''
    const records: PreviewRecord[] = []
    for (const [index, delta] of lines.entries()) {
      const rewrite = stream.push(delta, index === lines.length - 1, streamEnvFor(env, math))
      shown += rewrite.text
      records.push(...rewrite.records)
    }
    return { shown, records }
  }

  /** drawLanded's plan in kitty under these options. */
  function landed(text: string, records: readonly PreviewRecord[], math: MathOptions) {
    const env = kittyEnv()
    const renderEnv = renderEnvFor(env)
    const inlineEnv = inlineEnvFor(env)
    return planLanded(text, records, {
      maxColumns: renderEnv.maxColumns,
      draw: math.block === 'image' ? (tex, rows, maxColumns) => renderDisplay(tex, { ...renderEnv, ...(maxColumns ? { maxColumns } : {}) }, rows ?? measureDisplay(tex, renderEnv).rows) : undefined,
      width: proseWidthFor(env),
      measure: (tex, maxColumns) => measureDisplay(tex, { ...renderEnv, maxColumns }).rows,
      math,
      inline: math.inline === 'image' ? { env: inlineEnv, width: proseWidthFor(env), columns: env.columns, draw: (tex, cells, place) => renderInline(tex, inlineEnv, cells, place) } : undefined,
    })
  }

  test('a kind no longer set to image keeps its streamed preview, so no row moves', async () => {
    await init()
    const { shown, records } = streamed(kittyEnv(), { block: 'image', inline: 'image' })
    expect(records.length).toBeGreaterThan(2)
    for (const block of ['unicode', 'raw'] as const) {
      for (const inline of ['unicode', 'raw'] as const) {
        expect(landed(shown, records, { block, inline }).changed).toBe(false)
      }
    }
  })

  test('a reply streamed without images stays as it streamed once images are on', async () => {
    await init()
    for (const math of COMBINATIONS.filter(one => one.block !== 'image' && one.inline !== 'image')) {
      const { shown, records } = streamed(kittyEnv(), math)
      expect(records).toEqual([])
      // Its math written raw is LaTeX as written, typeset like a resumed reply's; the rest stays.
      const plan = landed(shown, [], { block: 'image', inline: 'image' })
      if (math.block !== 'raw' && math.inline !== 'raw') expect(plan.changed).toBe(false)
    }
  })
})
