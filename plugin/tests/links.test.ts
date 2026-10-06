// Inline math in paragraphs and list items that hold links: streamed padded
// and given images at landing, placed by the replay of how the engine draws
// each link form (core/src/layout/links.ts), measured live on Claude Code
// 2.1.291 with hyperlinks on (kitty) and off (FORCE_HYPERLINK=0).

import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { init, layoutList, layoutProse, measureDisplay, renderDisplay, renderInline, textWidth } from '../hooks/core.js'
import { inlineEnvFor, linkEnv, MessageStream, placeable, planLanded, proseWidthFor, renderEnvFor } from '../hooks/math.ts'
import type { KittexEnv, PreviewRecord, StreamEnv } from '../hooks/math.ts'
import { COLUMNS, KITTY, kittyEnv, startSession } from './support.ts'

const kitty26 = (hyperlinks?: boolean): KittexEnv => ({ ...kittyEnv(), cellHeight: 26, ...(hyperlinks === undefined ? {} : { hyperlinks }) })

function streamed(flushes: readonly string[], env: StreamEnv): { landed: string; records: PreviewRecord[] } {
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

function plan(text: string, records: readonly PreviewRecord[], env: KittexEnv) {
  const renderEnv = renderEnvFor(env)
  const inlineEnv = inlineEnvFor(env)
  return planLanded(text, records, {
    maxColumns: renderEnv.maxColumns,
    draw: (tex, rows) => renderDisplay(tex, renderEnv, rows ?? measureDisplay(tex, renderEnv).rows),
    inline: { env: inlineEnv, width: proseWidthFor(env), draw: (tex, columns) => renderInline(tex, inlineEnv, columns), hyperlinks: env.hyperlinks },
  })
}

function places(pieces: ReturnType<typeof plan>['pieces']): [string, number, number][] {
  return pieces.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []).map(img => [img.tex, img.row, img.col] as [string, number, number]) : []))
}

/** Every image lies over its preview: the cells it covers in the replay's rows of its piece hold the preview's text. */
function expectOverPreviews(pieces: ReturnType<typeof plan>['pieces'], records: readonly PreviewRecord[], env: KittexEnv) {
  let images = 0
  for (const piece of pieces) {
    if (piece.kind !== 'prose' || !piece.inline) continue
    const mode = { hyperlinks: env.hyperlinks }
    const layout = layoutProse(piece.text, proseWidthFor(env), [], mode) ?? layoutList(piece.text, proseWidthFor(env), [], mode)
    expect(layout).not.toBeNull()
    for (const image of piece.inline) {
      const preview = records.find(record => record.tex === image.tex)!.preview.replace(/\\(.)/g, '$1')
      // The row's cells: a zero-width mark joins the cell before it.
      const cells: string[] = []
      for (const char of layout!.lines[image.row]!) {
        if (textWidth(char) === 0 && cells.length > 0) cells[cells.length - 1] += char
        else cells.push(char)
      }
      expect(cells.slice(image.col).join('').startsWith(preview)).toBe(true)
      images += 1
    }
  }
  return images
}

const PARAGRAPH = [
  'The update [`solve()` and the *adjoint* method](https://example.com/docs/solve) gives $x_k$ in closed form, see <https://arxiv.org/abs/2401.01234>\n',
  'and https://en.wikipedia.org/wiki/Kalman_filter. or www.python.org/doc, anthropics/claude-code#12345, @someone, me@example.com for $u_k$.\n',
  '[$f(x)$ the map](https://example.com/f) and [write](mailto:a@b.co) and [t](https://example.com/t "Title") and $\\theta$\n',
]

const LIST = [
  'Where:\n',
  '- [the docs](https://example.com/docs) step 3. holds $x_k$ and https://example.com/x, then [step 4. inside](https://example.com/s) 5. done\n',
  '- anthropics/claude-code#7 and 2. after a ref, [**bold** and `code`](https://example.com/c) with $\\|v\\|$ and a.b@c.io\n',
  '  1. nested <https://example.com/n> with $\\sqrt{2}$ and www.example.org. at the end https://example.com/end\n',
]

describe('links: streaming', () => {
  test('a list item holding links is placeable once the link mode is known, so its formulas stream padded', async () => {
    await init()
    const written = '- [the docs](https://example.com/docs) holds '
    for (const hyperlinks of [true, false]) expect(placeable(written, 98, 100, { hyperlinks })).toBe(true)
    expect(placeable(written, 98)).toBe(false)
    for (const hyperlinks of [true, false]) {
      const { records } = streamed(LIST, { ...kitty26(hyperlinks), inline: true })
      expect(records.filter(record => record.inline)).toHaveLength(3)
    }
    expect(streamed(LIST, { ...kitty26(), inline: true }).records).toHaveLength(0)
  })
})

describe('links: landing', () => {
  for (const hyperlinks of [true, false]) {
    test(`every streamed preview in paragraphs and lists with links gets its image over it (hyperlinks ${hyperlinks ? 'on' : 'off'})`, async () => {
      await init()
      const env = kitty26(hyperlinks)
      for (const flushes of [PARAGRAPH, LIST]) {
        const { landed, records } = streamed(flushes, { ...env, inline: true })
        const live = plan(landed, records, env)
        expect(places(live.pieces)).toHaveLength(records.length)
        expect(expectOverPreviews(live.pieces, records, env)).toBe(records.length)
        // After --resume the LaTeX lands the same.
        expect(places(plan(flushes.join(''), [], env).pieces)).toEqual(places(live.pieces))
      }
    })
  }

  test('the link mode moves the formulas after a link: its url is drawn beside it without hyperlinks', async () => {
    await init()
    const text = 'See [docs](https://example.com/docs) for $x^2$.'
    expect(places(plan(text, [], kitty26(true)).pieces)).toEqual([['x^2', 0, 13]])
    expect(places(plan(text, [], kitty26(false)).pieces)).toEqual([['x^2', 0, 40]])
    expect(places(plan(text, [], kitty26()).pieces)).toEqual([])
  })
})

describe('links: the engine link mode', () => {
  test('linkEnv: hyperlinks in kitty and Ghostty, off with FORCE_HYPERLINK=0, absent when unknown', () => {
    expect(linkEnv(KITTY)).toEqual({ hyperlinks: true })
    expect(linkEnv({ TERM: 'xterm-ghostty', TERM_PROGRAM: 'ghostty' })).toEqual({ hyperlinks: true })
    expect(linkEnv({ ...KITTY, FORCE_HYPERLINK: '0' })).toEqual({ hyperlinks: false })
    expect(linkEnv({ TERM: 'xterm-256color' })).toEqual({ hyperlinks: false })
    expect(linkEnv({ TERM_PROGRAM: 'WezTerm' })).toEqual({})
  })

  function mountReply($: Engine, text: string) {
    return $.ui.mount({ plugin: 'kittex', surface: 'terminal', component: 'AssistantMessage', props: { text, isFirstOfReply: true }, viewport: { columns: COLUMNS, rows: 50, isFullscreen: false } })
  }

  test('a landed paragraph with a link draws its inline images in kitty', async ($, on) => {
    await startSession($, on)
    await init()
    const ui = await mountReply($, 'See [docs](https://example.com/docs) for $x$.')
    expect(await ui.find({ type: 'Image' })).toMatchObject({ props: { alt: 'x', rows: 1 } })
  })

  test('with FORCE_HYPERLINK empty (the link mode unknown) it keeps the formula Unicode', async ($, on) => {
    await startSession($, on, { ...KITTY, FORCE_HYPERLINK: '' })
    await init()
    const ui = await mountReply($, 'See [docs](https://example.com/docs) for $x$.')
    expect(await ui.find({ type: 'Image' })).toBeUndefined()
  })
})
