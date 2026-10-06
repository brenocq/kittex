// Inline math as one-row images: the padded preview written while a reply
// streams, the landed plan that places each image over its preview, the
// fallbacks to Unicode, and the `inline` option.

import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { init, layoutProse, previewInline, renderDisplay, measureDisplay, renderInline, textWidth } from '../hooks/core.js'
import {
  INLINE_JOIN,
  INLINE_PAD,
  inlineEnvFor,
  inlinePreview,
  MessageStream,
  PIECE_TOP,
  planLanded,
  proseWidthFor,
  renderEnvFor,
  REPLY_INDENT,
  TEXT_BASELINE,
} from '../hooks/math.ts'
import type { KittexEnv, PlanOptions, PreviewRecord, StreamEnv } from '../hooks/math.ts'
import { CELL, COLUMNS, kittyEnv, startSession } from './support.ts'

/** kitty's 13×26 px cells (the session tests' 13×20 cells leave little room above the baseline). */
const kitty26 = (): KittexEnv => ({ ...kittyEnv(), cellHeight: 26, emPx: kittyEnv().emPx })
const inlineOn = (): StreamEnv => ({ ...kitty26(), inline: true })

/** Streams `flushes` (the last one final) as one message: the text shown and the previews recorded. */
function streamed(flushes: readonly string[], env: StreamEnv = inlineOn()): { landed: string; records: PreviewRecord[] } {
  const stream = new MessageStream()
  let landed = ''
  const records: PreviewRecord[] = []
  for (const [i, delta] of flushes.entries()) {
    const flush = stream.push(delta, i === flushes.length - 1, env)
    landed += flush.text
    records.push(...flush.records)
  }
  return { landed, records }
}

/** The plan the AssistantMessage hook makes, with display and inline images. */
function plan(text: string, records: readonly PreviewRecord[] = [], env: KittexEnv = kitty26(), extra: Partial<PlanOptions> = {}) {
  const renderEnv = renderEnvFor(env)
  const inlineEnv = inlineEnvFor(env)
  return planLanded(text, records, {
    maxColumns: renderEnv.maxColumns,
    draw: (tex, rows) => renderDisplay(tex, renderEnv, rows ?? measureDisplay(tex, renderEnv).rows),
    inline: { env: inlineEnv, width: proseWidthFor(env), draw: (tex, columns) => renderInline(tex, inlineEnv, columns) },
    ...extra,
  })
}

/** Where each inline image of a plan landed: [tex, row, col, columns]. */
function places(pieces: ReturnType<typeof plan>['pieces']) {
  return pieces.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []).map(img => [img.tex, img.row, img.col, img.image.columns]) : []))
}

describe('the inline preview', () => {
  test('is the Unicode, words joined by no-break spaces, padded to the image with blank cells', async () => {
    await init()
    const env = inlineEnvFor(kitty26())
    const preview = inlinePreview('E = mc^2', env)!
    const unicode = previewInline('E = mc^2')!
    expect(preview.markdown.startsWith(unicode.replaceAll(' ', INLINE_JOIN))).toBe(true)
    expect(textWidth(preview.markdown)).toBe(preview.columns)
    expect(preview.markdown.slice(unicode.length)).toMatch(new RegExp(`^${INLINE_PAD}*$`))
  })

  test('holds a join or a pad even where the Unicode is as wide as the image', async () => {
    await init()
    const preview = inlinePreview('x', inlineEnvFor(kitty26()))!
    expect(preview.markdown).toMatch(/[ ⠀]/)
  })

  test('escapes the markdown the Unicode could form', async () => {
    await init()
    expect(inlinePreview('|x|', inlineEnvFor({ ...kitty26(), cellHeight: 40 }))?.markdown).toMatch(/^\\\|x\\\|/)
  })

  test('is null for a formula too tall for one row: it stays plain Unicode', async () => {
    await init()
    expect(inlinePreview('\\frac{a}{b}', inlineEnvFor(kitty26()))).toBeNull()
    expect(inlinePreview('\\sum_{i=1}^n a_i', inlineEnvFor(kitty26()))).toBeNull()
  })

  test('puts the math baseline one pixel above the font baseline measured in kitty', () => {
    expect(inlineEnvFor(kitty26()).baselinePx).toBe(20)
    expect(inlineEnvFor(kittyEnv()).baselinePx).toBe(Math.round(CELL.cellHeight * TEXT_BASELINE))
  })
})

describe('streaming', () => {
  test('inline math is written padded, with a record of its TeX and width', async () => {
    await init()
    const { landed, records } = streamed(['Let $x$ be real and $E = mc^2$ famous.\n'])
    expect(landed).not.toContain('$')
    expect(records.map(record => [record.tex, record.inline, record.rows])).toEqual([
      ['x', true, 1],
      ['E = mc^2', true, 1],
    ])
    for (const record of records) expect(landed).toContain(record.preview)
  })

  test('outside a plain paragraph inline math streams unpadded, with no record, so no gap stays at landing', async () => {
    await init()
    for (const line of ['- $x_k$: state\n', '1. $x_k$: state\n', '## The $x_k$ state\n', '> the $x_k$ state\n', '| $x_k$ | state |\n']) {
      const { landed, records } = streamed([line])
      expect({ line, records }).toEqual({ line, records: [] })
      expect(landed).toBe(line.replace('$x_k$', previewInline('x_k')!))
    }
    // A paragraph after a list, a blank line between, is a paragraph again.
    const { records } = streamed(['- a list item\n', '\n', 'Then $x$ is real.\n'])
    expect(records.map(record => record.tex)).toEqual(['x'])
  })

  test('a formula too tall for a row is plain Unicode with no record', async () => {
    await init()
    const { landed, records } = streamed(['so $\\frac{a}{b}$ is.\n'])
    expect(records).toEqual([])
    expect(landed).toBe(`so ${previewInline('\\frac{a}{b}')} is.\n`)
  })

  test('without the option (or images) inline math is the plain Unicode it always was', async () => {
    await init()
    for (const env of [kitty26(), { ...kitty26(), inline: false }, { ...kitty26(), images: false, inline: true }]) {
      const { landed, records } = streamed(['Let $x^2$ be.\n'], env)
      expect(landed).toBe(`Let ${previewInline('x^2')} be.\n`)
      expect(records).toEqual([])
    }
  })
})

describe('the landed plan', () => {
  test('each streamed preview gets its image at the cell it was drawn in', async () => {
    await init()
    const { landed, records } = streamed(['Let $x$ be real and $E = mc^2$ famous.'])
    const { pieces, changed } = plan(landed, records)
    expect(changed).toBe(true)
    expect(pieces).toHaveLength(1)
    expect(pieces[0]).toMatchObject({ kind: 'prose', text: landed })
    const x = landed.indexOf(records[0]!.preview)
    const e = landed.indexOf(records[1]!.preview)
    expect(places(pieces)).toEqual([
      ['x', 0, x, records[0]!.columns],
      ['E = mc^2', 0, textWidth(landed.slice(0, e)), records[1]!.columns],
    ])
  })

  test('places follow the engine wrap on a long paragraph', async () => {
    await init()
    const words = 'the value of the function at each point we take is'
    const { landed, records } = streamed([`${words} $x^2$ and ${words} $\\theta$ and ${words} $p_k$ end.`])
    const { pieces } = plan(landed, records)
    const layout = layoutProse(landed, proseWidthFor(kitty26()))!
    expect(layout.rows).toBeGreaterThan(1)
    for (const [tex, row, col, columns] of places(pieces) as [string, number, number, number][]) {
      const preview = records.find(record => record.tex === tex)!.preview
      expect(layout.lines[row]!.slice(0, 400)).toContain(preview)
      expect(textWidth(layout.lines[row]!.slice(0, layout.lines[row]!.indexOf(preview)))).toBe(col)
      expect(columns).toBe(textWidth(preview))
    }
  })

  test('a paragraph holding inline images is a piece of its own; the rest keeps together', async () => {
    await init()
    const text = 'Intro.\n\nMore intro.\n\nLet $x$ be.\n\nOutro.'
    const { pieces } = plan(text)
    expect(pieces.map(piece => [piece.kind, piece.gap, piece.kind === 'prose' ? piece.text.replace(/[ ⠀]/g, '_') : ''])).toEqual([
      ['prose', false, 'Intro.\n\nMore intro.'],
      ['prose', true, `Let ${previewInline('x')}_ be.`],
      ['prose', true, 'Outro.'],
    ])
    expect(places(pieces)).toEqual([['x', 0, 4, 2]])
  })

  test('after --resume the LaTeX gets the same previews and images', async () => {
    await init()
    const { landed, records } = streamed(['A $x^2$ and $\\theta$ here.'])
    const live = plan(landed, records)
    const resumed = plan('A $x^2$ and $\\theta$ here.')
    expect(resumed.pieces).toEqual(live.pieces)
  })

  test('a paragraph whose layout is unsure keeps Unicode: a link in it', async () => {
    await init()
    const text = 'See [docs](https://example.com) for $x^2$.'
    const resumed = plan(text)
    expect(places(resumed.pieces)).toEqual([])
    // Read back as LaTeX, it is the plain Unicode it always was (no pads).
    expect(resumed.pieces).toEqual([{ kind: 'prose', text: `See [docs](https://example.com) for ${previewInline('x^2')}.`, gap: false }])
    // Streamed, it stays as it was shown.
    const { landed, records } = streamed([`${text}\n`])
    const live = plan(landed, records)
    expect(places(live.pieces)).toEqual([])
    expect(live.pieces[0]).toMatchObject({ kind: 'prose', text: landed })
  })

  test('list items and headings keep Unicode', async () => {
    await init()
    expect(places(plan('- a list item with $x$\n- and $y$').pieces)).toEqual([])
    expect(places(plan('# Title with $x$').pieces)).toEqual([])
  })

  test('emphasis around a formula still closes after its pad', async () => {
    await init()
    const { pieces } = plan('An *italic $y$* and **bold $x$**.')
    const piece = pieces[0]!
    expect(piece.kind).toBe('prose')
    const layout = layoutProse(piece.kind === 'prose' ? piece.text : '', 100)!
    expect(layout.lines[0]).not.toContain('*')
    expect(places(pieces).map(place => place[0])).toEqual(['y', 'x'])
  })

  test('maxProseWidth narrows the wrap', async () => {
    await init()
    const words = 'one two three four five six seven eight nine ten'
    const text = `${words} $x$ ${words} $\\theta$`
    const wide = places(plan(text).pieces)
    const narrow = places(plan(text, [], { ...kitty26(), maxProseWidth: 40 }).pieces)
    expect(wide).not.toEqual(narrow)
    for (const [, , col, columns] of narrow as number[][]) expect(col! + columns!).toBeLessThanOrEqual(40)
  })

  test('without inline images the plan is the plain Unicode it always was', async () => {
    await init()
    const { pieces } = plan('A $x^2$ here.', [], kitty26(), { inline: undefined })
    expect(pieces).toEqual([{ kind: 'prose', text: `A ${previewInline('x^2')} here.`, gap: false }])
  })
})

/** Mounts a landed reply as the transcript would. */
function mountReply($: Engine, text: string) {
  return $.ui.mount({
    plugin: 'kittex',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text, isFirstOfReply: true },
    viewport: { columns: COLUMNS, rows: 50 },
  })
}

describe('AssistantMessage', () => {
  test('inline images lie over their previews, absolute, below the piece margin and beside the bullet', async ($, on) => {
    await startSession($, on)
    await init()
    const ui = await mountReply($, 'Let $x$ be real.')
    const text = `Let ${inlinePreview('x', inlineEnvFor(kitty26()))!.markdown} be real.`
    expect(await ui.drawn()).toMatchObject({
      type: 'Box',
      props: { flexDirection: 'column' },
      children: [
        {
          type: 'Box',
          props: { flexDirection: 'column' },
          children: [
            { type: 'Text', children: [text] },
            {
              type: 'Box',
              props: { position: 'absolute', top: PIECE_TOP, left: REPLY_INDENT + 4 },
              children: [{ type: 'Image', props: { columns: 2, rows: 1, alt: 'x', source: { png: expect.any(String) } } }],
            },
          ],
        },
      ],
    })
  })

  test('the wrapper of the engine drawing carries no position (the engine refuses it)', async ($, on) => {
    await startSession($, on)
    await init()
    const drawn = (await (await mountReply($, 'Let $x$ be real.')).drawn()) as { children: { props?: Record<string, unknown> }[] }
    expect(drawn.children[0]!.props?.position).toBeUndefined()
  })

  test('inline: false draws inline math as Unicode text, as before', { options: { inline: false } }, async ($, on) => {
    await startSession($, on)
    await init()
    const ui = await mountReply($, 'Let $x^2$ be real.')
    expect(await ui.drawn()).toEqual({ type: 'Text', children: [`Let ${previewInline('x^2')} be real.`] })
  })

  test('maxProseWidth from the settings narrows the wrap the images follow', async ($, on) => {
    on('settings.read', () => ({ value: { maxProseWidth: 30 } }) as never)
    await startSession($, on)
    await init()
    const drawn = (await (await mountReply($, 'one two three four five six seven $x$ end.')).drawn()) as {
      children: { children: { props?: { top?: number; left?: number } }[] }[]
    }
    // "one two three four five six " fills 28 of 30 cells: "seven" and the formula go on the next row.
    expect(drawn.children[0]!.children[1]!.props).toMatchObject({ top: PIECE_TOP + 1, left: REPLY_INDENT + 'seven '.length })
  })
})

describe('MessageDisplay', () => {
  test('streams padded previews and records them; the landed block draws their images', async ($, on) => {
    await startSession($, on)
    await init()
    const shown = await $.classic.MessageDisplay({ turn_id: 't', message_id: 'm', index: 0, final: true, delta: 'Let $x$ be.' })
    expect(shown.displayContent).toContain(INLINE_PAD)
    const drawn = JSON.stringify(await (await mountReply($, shown.displayContent!)).drawn())
    expect(drawn).toContain('"alt":"x"')
  })

  test('inline: false streams plain Unicode', { options: { inline: false } }, async ($, on) => {
    await startSession($, on)
    await init()
    const shown = await $.classic.MessageDisplay({ turn_id: 't', message_id: 'm', index: 0, final: true, delta: 'Let $x$ be.' })
    expect(shown.displayContent).toBe(`Let ${previewInline('x')} be.`)
  })
})

void mock
