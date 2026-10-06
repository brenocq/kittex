// Regressions found by the live QA pass (branch qa/live): real Haiku replies
// driven through Claude Code 2.1.291 in a pty posing as kitty and as Ghostty,
// replayed through @xterm/headless and drawn in headless Chrome. Each skipped
// test states the behaviour kittex should have; unskip it with the fix. The
// `todo`s are failures that live in the engine's drawing and have no unit seam
// here; their cause and evidence are in the comment above each.

import { beforeAll, describe, expect, test } from 'vitest'

import { emPxForCell, init, measureDisplay, renderDisplay, renderInline } from '../../../plugin/hooks/core.js'
import { inlineEnvFor, inlineFlow, MessageStream, PIECE_TOP, planLanded, proseWidthFor, renderEnvFor, SOURCE_PATTERN, STREAMED_PATTERN } from '../../../plugin/hooks/math.js'
import type { InlineImage, KittexEnv, PreviewRecord, StreamEnv } from '../../../plugin/hooks/math.js'

const CELL = { cellWidth: 13, cellHeight: 26 }
const env = (): KittexEnv => ({ kind: 'kitty', images: true, ...CELL, columns: 100, emPx: emPxForCell(CELL), ink: { r: 0xeb, g: 0xdb, b: 0xb2 }, measured: true })
const inlineOn = (): StreamEnv => ({ ...env(), inline: true })

/** One reply streamed in one flush: what kittex hands the engine, and the previews it recorded. */
function stream(markdown: string): { text: string; records: PreviewRecord[] } {
  const out = new MessageStream().push(markdown, true, inlineOn())
  return { text: out.text, records: out.records }
}

/** The inline images a landed plan places for a streamed reply, by prose piece. */
function placedInline(markdown: string): InlineImage[][] {
  const { text, records } = stream(markdown)
  const e = env()
  const renderEnv = renderEnvFor(e)
  const inlineEnv = inlineEnvFor(e)
  const plan = planLanded(text, records, {
    maxColumns: renderEnv.maxColumns,
    draw: (tex, rows) => renderDisplay(tex, renderEnv, rows ?? measureDisplay(tex, renderEnv).rows),
    width: proseWidthFor(e),
    inline: { env: inlineEnv, width: proseWidthFor(e), columns: e.columns, draw: (tex, columns) => renderInline(tex, inlineEnv, columns) },
  })
  return plan.pieces.flatMap(piece => (piece.kind === 'prose' && piece.inline?.length ? [piece.inline] : []))
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
  test.skip('`\\|` inside math in a table cell is a pipe', () => {
    const { records } = stream('| a | b |\n|---|---|\n| abs | $\\|x\\|$ |\n')
    expect(records.map(record => record.tex)).toEqual(['|x|'])
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
  test.skip('a check mark after a formula leaves no pad behind', () => {
    for (const reply of ['Check $x = 1$ ✓\n', 'Check $x = 1$ ★\n']) {
      const placed = inlineImages(reply)
      const { text } = stream(reply)
      expect(placed === 1 || !text.includes('⠀')).toBe(true)
    }
  })

  // Table cells narrower than a preview with its pad: the engine wraps the
  // pad (U+2800) onto a line of its own inside the cell, the row grows by a
  // line, and the formula stays Unicode (the wrapped cell can't be placed),
  // its number split across lines (8.854×10⁻¹ / ²). Live: p01-K120, p02-K60m.
  test.todo('an inline preview in a table cell never wraps its pad onto a line of its own')

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
  test.todo('text after display math in a list item keeps the item indent once landed')

  // Live and resumed drawings differ for a list after display math in list
  // items: the stream keeps the later items' inline math as Unicode (no pads),
  // while the resumed session draws it as images. Live: p32-K120 vs p32-K120-res.
  test.todo('a resumed reply draws its list items as the live landing did')
})
