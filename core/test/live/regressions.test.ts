// Regressions found by the live QA pass (branch qa/live): real Haiku replies
// driven through Claude Code 2.1.291 in a pty posing as kitty and as Ghostty,
// replayed through @xterm/headless and drawn in headless Chrome. Each skipped
// test states the behaviour kittex should have; unskip it with the fix. The
// `todo`s are failures that live in the engine's drawing and have no unit seam
// here; their cause and evidence are in the comment above each.

import { beforeAll, describe, expect, test } from 'vitest'

import { emPxForCell, init, layoutTable, measureDisplay, renderDisplay, renderInline } from '../../../plugin/hooks/core.js'
import { inlineEnvFor, inlineFlow, locatePreviews, MessageStream, PIECE_TOP, planLanded, proseWidthFor, renderEnvFor, SOURCE_PATTERN, STREAMED_PATTERN } from '../../../plugin/hooks/math.js'
import { NUMBER_THEORY } from '../../../plugin/tests/fixtures/number-theory.js'
import { performance } from 'node:perf_hooks'
import type { InlineImage, KittexEnv, PreviewRecord, StreamEnv } from '../../../plugin/hooks/math.js'

const CELL = { cellWidth: 13, cellHeight: 26 }
const env = (columns = 100): KittexEnv => ({ kind: 'kitty', images: true, ...CELL, columns, emPx: emPxForCell(CELL), ink: { r: 0xeb, g: 0xdb, b: 0xb2 }, measured: true })
const inlineOn = (columns = 100): StreamEnv => ({ ...env(columns), inline: true })

/** One reply streamed in one flush: what kittex hands the engine, and the previews it recorded. */
function stream(markdown: string, columns = 100): { text: string; records: PreviewRecord[] } {
  const out = new MessageStream().push(markdown, true, inlineOn(columns))
  return { text: out.text, records: out.records }
}

/** The landed plan of a text (a streamed one with its records, or LaTeX as written). */
function plan(text: string, records: readonly PreviewRecord[], columns = 100) {
  const e = env(columns)
  const renderEnv = renderEnvFor(e)
  const inlineEnv = inlineEnvFor(e)
  return planLanded(text, records, {
    maxColumns: renderEnv.maxColumns,
    draw: (tex, rows, maxColumns) => {
      const at = maxColumns === undefined ? renderEnv : { ...renderEnv, maxColumns }
      return renderDisplay(tex, at, rows ?? measureDisplay(tex, at).rows)
    },
    width: proseWidthFor(e),
    measure: (tex, maxColumns) => measureDisplay(tex, { ...renderEnv, maxColumns }).rows,
    inline: { env: inlineEnv, width: proseWidthFor(e), columns: e.columns, draw: (tex, cells, place) => renderInline(tex, inlineEnv, cells, place) },
  })
}

/** The inline images a landed plan places for a streamed reply, by prose piece. */
function placedInline(markdown: string, columns = 100): InlineImage[][] {
  const { text, records } = stream(markdown, columns)
  return plan(text, records, columns).pieces.flatMap(piece => (piece.kind === 'prose' && piece.inline?.length ? [piece.inline] : []))
}

/** A plan as its pieces' kinds, texts and images (row, column, rows): what the engine and kittex draw. */
function shape(pieces: ReturnType<typeof plan>['pieces']) {
  return pieces.map(piece => [piece.kind, piece.kind === 'image' ? piece.tex : piece.text, piece.kind === 'prose' ? (piece.inline ?? []).map(one => [one.tex, one.row, one.col, one.image.rows]) : []])
}

/** The inline images a landed plan places for a streamed reply. */
function inlineImages(markdown: string): number {
  return placedInline(markdown).reduce((n, inline) => n + inline.length, 0)
}

beforeAll(async () => {
  await init()
})

describe('live QA regressions', () => {
  // Fullscreen landing blank. kittex hooks a fullscreen block on its first
  // render when its text looks like LaTeX as written (SOURCE_PATTERN); a
  // streamed block waits for `onScreen` (STREAMED_PATTERN), so the engine's
  // own drawing stays up meanwhile. A reply's currency (`$100`, or `\$100`,
  // which the engine draws as `$100`) passes into the streamed text as is, so
  // the block matches SOURCE_PATTERN, is hooked on its first render and is
  // drawn as nothing until the hook answers: the reply vanishes for 15 to 140
  // ms at landing (the transcript's top shows, the screen jumps). Live: every
  // fullscreen run whose streamed text held a `$`, kitty and Ghostty alike
  // (p09, p11, p16, p30; still on main 66e695b, p09-K120-m2). The same blank
  // for kittex's own escaped `\[` was fixed on main meanwhile (1c9f43a).
  test('a streamed block with a dollar amount is still matched as streamed', () => {
    for (const reply of ['You save \\$100 at a rate $r = 0.05$ a year.\n', 'You save $100 at a rate $r = 0.05$ a year.\n']) {
      const { text } = stream(reply)
      expect(STREAMED_PATTERN.test(text)).toBe(true)
      expect(SOURCE_PATTERN.test(text)).toBe(false)
    }
    // Currency alone is never LaTeX source (p11: two loans of $25,000).
    expect(SOURCE_PATTERN.test("I'm comparing two loans: $25,000 at 6.5% APR over 5 years, and $25,000 at 4.9% over 7 years.")).toBe(false)
  })

  // Pipes in table cells. A model escapes `|` as `\|` inside a table row (GFM
  // takes `\|` as a literal pipe before any inline parsing, code spans
  // included), but kittex hands `\|x\|` to MathJax, where `\|` is ‖: |x| is
  // drawn ‖x‖, |−3| = 3 as ‖−3‖ = 3, P(A|B) as P(A‖B). Live: p30-K120
  // (sheet-table-escaped-bars.png), every norms/probability table.
  test('`\\|` inside math in a table cell is a pipe', () => {
    const { records } = stream('| a | b |\n|---|---|\n| abs | $\\|x\\|$ |\n')
    expect(records.map(record => record.tex)).toEqual(['|x|'])
    // The header row too, and the copy button's LaTeX is the record's; in prose `\|` stays the norm.
    expect(stream('| $P(A\\|B)$ | b |\n|---|---|\n| 1 | 2 |\n').records.map(record => record.tex)).toEqual(['P(A|B)'])
    expect(stream('The norm $\\|x\\|$ of $x$.\n').records.map(record => record.tex)).toEqual(['\\|x\\|', 'x'])
  })

  // A paragraph or list holding a character whose width kittex can't be sure
  // of keeps its Unicode math, but formulas before that character were
  // already padded while they streamed (main pads only where the replay can
  // lay the paragraph out so far, fa3812a, which fixed CJK and emoji that come
  // first): the pads stay as blank cells after each formula. Seen live with
  // Dingbats and Misc Symbols in text presentation after the math (✓ ✔ ✗ ★
  // ☐; mostly a "✓" closing a check line or the last item of a list, which
  // costs the whole list its images). Live: p27-K120, p27-K30, p16-K50s, and
  // on main 66e695b p27-K120-m2 (25 pad cells left over five list items).
  test('a check mark after a formula leaves no pad behind', () => {
    // Text-presentation symbols are one cell to the engine, kitty and Ghostty: the formula gets its image.
    for (const reply of ['Check $x = 1$ ✓\n', 'Check $x = 1$ ★\n', 'Check $x = 1$ ☐ ✗ ✔ ☑\n']) expect([reply, inlineImages(reply)]).toEqual([reply, 1])
    // A list ending in a check mark keeps every image (p27-K120-m2: 25 pads over five items).
    expect(inlineImages('- $p = 61$, $q = 53$\n- Choose $e = 17$\n- **Decrypt** $m = 65$ ✓\n')).toBe(4)
    // What the replay can't measure (wide text) stops its part's layout there: the formulas before it get their
    // images, a formula glued to it is never padded, and none after it is.
    for (const reply of ['Check $x = 1$ 中文 and $y = 2$\n', 'Check $x = 1$中 and $y = 2$\n', '- $a = 1$\n- 中 $b = 2$\n']) {
      const { text, records } = stream(reply)
      const placed = inlineImages(reply)
      expect([reply, placed]).toEqual([reply, records.length])
      expect([reply, (text.match(/⠀/g) ?? []).length > 0]).toEqual([reply, records.some(record => record.preview.includes('⠀'))])
    }
  })

  // Table cells narrower than a preview with its pad: the engine wraps the
  // pad (U+2800) onto a line of its own inside the cell, the row grows by a
  // line, and the formula stays Unicode (the wrapped cell can't be placed),
  // its number split across lines (8.854×10⁻¹ / ²). Live: p01-K120, p02-K60m.
  test('an inline preview in a table cell never wraps its pad onto a line of its own', () => {
    // Streamed into a table already too wide for its columns: a preview is padded only where its cell holds it,
    // else written with no pad where its image fits its Unicode's cells, else plain Unicode.
    const hard = '| Constant | Symbol | Value | Units |\n|---|---|---|---|\n| Electric permittivity | $\\varepsilon_0$ | $8.854 \\times 10^{-12}$ | (dimensionless) |\n| Magnetic permeability | $\\mu_0$ | $1.257 \\times 10^{-6}$ | H·m⁻¹ |\n'
    const { text, records } = stream(hard, 60)
    const lines = layoutTable(text, 60, [], proseWidthFor(env(60)))!.lines
    expect(lines.filter(line => /│[ ⠀]*⠀[ ⠀]*│/.test(line))).toEqual([])
    expect(records.map(record => record.tex)).toEqual(['\\varepsilon_0', '\\mu_0', '1.257 \\times 10^{-6}'])
    expect(placedInline(hard, 60).flat().map(one => one.tex)).toEqual(records.map(record => record.tex))
    // A table a later row makes too wide: a pad written before then wraps (the engine's own reflow while
    // streaming), and the formula still gets its image, over its Unicode alone.
    const later = '| Constant | Symbol | Value | Units |\n|---|---|---|---|\n| Light | $c$ | $2.998 \\times 10^8$ | m/s |\n| Permeability | $\\mu_0$ | $1.257 \\times 10^{-6}$ | H/m |\n| Electric permittivity | $\\varepsilon_0$ | $8.854 \\times 10^{-12}$ | (dimensionless) |\n'
    const images = placedInline(later, 60).flat()
    expect(images.map(one => [one.tex, one.image.columns])).toContainEqual(['1.257 \\times 10^{-6}', 10])
    expect(images).toHaveLength(stream(later, 60).records.length)
  })

  // Inline images above the fullscreen viewport pile up on its first row. A
  // prose piece's inline images were absolute boxes at their preview's cell;
  // when a landed reply is taller than the window, the engine draws an
  // absolute box whose top falls above the screen clamped onto row 0 (2.1.291:
  // `if (y < 0 && position === "absolute") y = 0`) instead of clipping it, over
  // the text there and over each other. Live: 19 of 46 fullscreen runs, both
  // terminals, also after a resize or a font zoom (sheet-top-row-pileup.png).
  // Now laid out in the flow of an overlay column (inlineFlow), each image
  // scrolls and clips with its row; this checks the flow puts every image of a
  // long reply at its own preview cell.
  test('inline images of rows above the fullscreen viewport are clipped, not drawn on its first row', () => {
    const reply = Array.from({ length: 12 }, (_, k) => `Line ${k}: the sum $\\sum_{n=1}^{${k + 2}} n^2$ and the ratio $a_{${k}}/b$ hold for every $x > ${k}$ in the set.`).join(' ') + '\n'
    const pieces = placedInline(reply)
    expect(pieces.length).toBeGreaterThan(0)
    for (const inline of pieces) {
      let bottom = 0
      const seen = new Set<string>()
      for (const { inline: one, marginTop, marginLeft } of inlineFlow(inline, 2)) {
        const top = bottom + marginTop
        bottom = top + one.image.rows
        expect([top, marginLeft]).toEqual([PIECE_TOP + one.row, 2 + one.col])
        seen.add(`${one.row},${one.col}`)
      }
      expect(seen.size).toBe(inline.length)
      // Rows well past a window's height: the ones a scroll puts above the top.
      expect(Math.max(...inline.map(one => one.row))).toBeGreaterThan(5)
    }
  })

  // Display math inside a list item: the landed plan splits the item at the
  // formula, and the text after it is drawn as a piece of its own, outside the
  // list, so its wrapped lines lose the item's hanging indent (5 → 2) and wrap
  // at another width than while streaming: rows move at landing in narrow
  // windows. Live: p32-G60m ("(where β" / "> 0)" streamed, "(where β >" /
  // "0)" landed).
  test('text after display math in a list item keeps the item indent once landed', () => {
    const reply =
      '3. Construct the solution from the roots:\n\n   **Case 3: Complex conjugate roots** $r = \\alpha \\pm \\beta i$ (where $\\beta > 0$)\n\n' +
      '   $$y_h = e^{\\alpha x}\\left(C_1 \\cos(\\beta x) + C_2 \\sin(\\beta x)\\right)$$\n\n' +
      '   where the constants $C_1$ and $C_2$ come from the initial conditions (where $\\beta > 0$ again)\n\n4. Done.\n'
    const { text, records } = stream(reply, 60)
    expect(records.find(record => record.rows > 1)).toMatchObject({ indent: 3 })
    const { pieces } = plan(text, records, 60)
    // The list is drawn whole, as it streamed (its rows can't move), the formula's image over its preview in the item.
    expect(pieces).toHaveLength(1)
    expect(pieces[0]!.kind === 'prose' && pieces[0]!.text).toBe(text.trimEnd())
    const images = pieces[0]!.kind === 'prose' ? pieces[0]!.inline! : []
    expect(images.filter(one => one.image.rows > 1).map(one => one.col)).toEqual([3])
    expect(images.filter(one => one.image.rows === 1).every(one => one.col >= 3)).toBe(true)
    expect(images).toHaveLength(records.length)
  })

  // Live and resumed drawings differ for a list after display math in list
  // items: the stream keeps the later items' inline math as Unicode (no pads),
  // while the resumed session draws it as images. Live: p32-K120 vs p32-K120-res.
  test('a resumed reply draws its list items as the live landing did', () => {
    const reply =
      '4. Find the complementary solution $y_c$ from the roots:\n\n   **Case 1: Two distinct real roots** $r_1 \\neq r_2$\n   \n   $$y_c = C_1 e^{r_1 x} + C_2 e^{r_2 x}$$\n\n' +
      '   **Case 2: One repeated real root** $r_1 = r_2 = r$\n   \n   $$y_c = (C_1 + C_2 x) e^{rx}$$\n\n5. If $f(x) \\neq 0$, find a particular solution $y_p$.\n'
    for (const columns of [120, 60]) {
      const { text, records } = stream(reply, columns)
      const live = plan(text, records, columns).pieces
      const resumed = plan(reply, [], columns).pieces
      expect(shape(resumed)).toEqual(shape(live))
      // The better of the two: every formula an image, the later items' inline math included.
      expect(live.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []) : [])).sort((a, b) => a.row - b.row).map(one => one.tex)).toEqual([
        'y_c', 'r_1 \\neq r_2', 'y_c = C_1 e^{r_1 x} + C_2 e^{r_2 x}', 'r_1 = r_2 = r', 'y_c = (C_1 + C_2 x) e^{rx}', 'f(x) \\neq 0', 'y_p',
      ])
    }
  })

  // The landing got slower (p27-K120: ~78 ms, then ~153 ms for the
  // AssistantMessage hook, its plan ~8 ms of it): every paragraph, list and
  // heading holding a formula was drawn as a piece of its own, and every
  // display formula cut the text, so the reply's landing made 44 round trips
  // through the engine (one next() a piece, one after another). Now a piece
  // is cut only where a part's rows aren't known, the images laid over it,
  // and the pieces are drawn at once: a few round trips, the plan as cheap.
  test('a long reply lands in a few pieces, its plan in a few milliseconds (p27)', () => {
    const e = env(120)
    const out = new MessageStream()
    let shown = ''
    let records: PreviewRecord[] = []
    const lines = NUMBER_THEORY.split(/(?<=\n)/)
    for (let i = 0; i < lines.length; i += 2) {
      const flush = out.push(lines.slice(i, i + 2).join(''), i + 2 >= lines.length, { ...e, inline: true })
      records = [...records, ...locatePreviews(flush.text, flush.records, shown.length)]
      shown += flush.text
    }
    const renderEnv = renderEnvFor(e)
    const inlineEnv = inlineEnvFor(e)
    const options = {
      streamed: {},
      maxColumns: renderEnv.maxColumns,
      draw: (tex: string, rows?: number, maxColumns?: number) => renderDisplay(tex, maxColumns === undefined ? renderEnv : { ...renderEnv, maxColumns }, rows),
      width: proseWidthFor(e),
      measure: (tex: string, maxColumns: number) => measureDisplay(tex, { ...renderEnv, maxColumns }).rows,
      inline: { env: inlineEnv, width: proseWidthFor(e), columns: e.columns, draw: (tex: string, cells: number, place?: 'center' | 'start' | 'end') => renderInline(tex, inlineEnv, cells, place) },
    }
    // The images were drawn while the reply streamed: the landing composes.
    planLanded(shown, records, options)
    const start = performance.now()
    const { pieces } = planLanded(shown, records, options)
    const ms = performance.now() - start
    const images = pieces.reduce((n, piece) => n + (piece.kind === 'prose' ? (piece.inline?.length ?? 0) : 0), 0)
    expect(images).toBe(records.length)
    // Its rules (`---`, rows the replay doesn't follow) cut it, nothing else.
    expect(pieces.length).toBeLessThanOrEqual(6)
    expect(ms).toBeLessThan(100)
  })

  // Main screen (`"tui": "default"`), kitty 0.49.2 on macOS, Claude Code
  // 2.1.296, 120x50 cells of 7x13 px: a reply taller than the window is
  // printed twice into the scrollback when it lands. The landed render is
  // hooked (the main screen reports no `onScreen`), so the engine draws the
  // block as nothing for the hook's hop (engine-findings.md §4), and with
  // rows above the viewport changed it clears the screen and prints the whole
  // transcript again under the copy that streamed: the banner, the reply's
  // streamed preview, then everything once more. The same reply without
  // kittex prints once; with kittex in unicode mode it is printed twice too,
  // so the hop, not the images, starts it. After `--resume` with a cold TeX
  // cache, each late diagram redraws the block again: a stale partial copy of
  // a tall circuit stays above the full one, and inline images the redraw
  // deleted (a=d,d=I) leave blank gaps in the older copies. Nothing is drawn
  // over text; the copies only pile up. Evidence: docs/stress-macos/
  // scroll-overlay/ (ms1, ms2, ms3 with kittex, ms4 without; replies 12, 15,
  // 16, 17 of replies.json).
  test.todo('a landed reply taller than the window is printed once on the main screen')
})
