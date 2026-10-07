// Minimal repros of the failures the fuzz suite found (known.ts names them
// FUZZ-n), each shrunk from a fuzz case and skipped until it is fixed: the
// comment says what breaks, where, and why. "Live" marks the ones confirmed
// on the real engine (Claude Code 2.1.291, research/fuzzcheck.py: the
// streamed text drawn by the engine alone against the LaTeX landed through
// kittex on a resumed session, at no model cost). Most of FUZZ-1, -4, -5, -6
// and -12 was fixed on main while the suite ran (90c1bba, 1bbf44c, 37c5e74;
// FUZZ-1, -4 and -5 confirmed fixed live): those tests run, as guards, and
// what is left of them is pinned skipped.

import { describe, expect, test } from 'vitest'

import { init, previewInline } from '../../../plugin/hooks/core.js'
import { performance } from 'node:perf_hooks'

import { BLOCK_LIMIT, MessageStream } from '../../../plugin/hooks/math.js'
import { envFor, land, remember, runCase, streamReply } from './drive.js'
import type { CheckName, Shape } from './drive.js'

const BASE: Shape = { columns: 80, cellWidth: 13, cellHeight: 26, terminal: 'kitty', inline: true, links: 'osc8', flushSeed: 1, trimLanded: false }

/** The failures of these checks in a reply landed in a terminal of this shape. */
function failures(markdown: string, shape: Partial<Shape>, checks: CheckName[]) {
  return runCase(markdown, { ...BASE, ...shape })
    .failures.filter(failure => checks.includes(failure.check))
    .map(failure => `${failure.check}/${failure.cause}: ${failure.detail}`)
}

describe('fuzz regressions', () => {
  test('the suite itself runs (init)', async () => {
    await init()
  })

  // FUZZ-1 (live). planLanded cuts a list at a display image and hands the
  // rest of the list to the engine as a text of its own. Inside the list the
  // engine puts no blank row between an item's last paragraph and the next
  // item (the item's last token is text, not a blank line); drawn alone, that
  // blank line is a paragraph break, a blank row: everything below moves down
  // a row at landing. Fix: keep the list whole and lay the image over its
  // preview rows (as placeQuote does for quotes), or give the rest piece
  // marginTop -1 where the list had no blank row.
  test('FUZZ-1: a display in a list item, then the next item: no row moves', () => {
    const md = '1. Compute:\n   $$\n   x^2\n   $$\n2. Then $\\alpha$.\n'
    expect(failures(md, {}, ['moved'])).toEqual([])
    const loose = '1. Compute:\n\n   $$\n   x^2\n   $$\n\n   which gives $y$.\n\n2. Then.\n'
    expect(failures(loose, {}, ['moved'])).toEqual([])
  })

  // FUZZ-1 (live). The same cut makes a nested item after the display a
  // top-level one (`  - next` drawn at the list's left edge), and an ordered
  // item written `3)` after a continuation line plain text (`2.` while streaming).
  test('FUZZ-1: a display in a nested item keeps the items after it nested and numbered', () => {
    expect(failures('- Outer:\n  - inner $a$:\n\n    $$\n    x^2\n    $$\n\n  - next $b$\n- last\n', {}, ['moved'])).toEqual([])
    expect(failures('1) f\n   \\begin{aligned}\n\\varepsilon\n\\end{aligned}\n   $\\sqrt{2}$\n3) eigenvalue:\n', {}, ['moved'])).toEqual([])
  })

  // FUZZ-1, what main left (live on 3451481: a refused display in an item,
  // then `which gives y.` and `2. Norm.`: the note lands at the reply's edge
  // instead of the item's, and `2. Norm.` a row lower). A list whose display
  // formula is not drawn (refused, or kept as its preview) is still cut there.
  // Fixed: a refused note or a kept preview in a list item stays in the item, as it streamed.
  test('FUZZ-1: a list holding a display formula that is not drawn is not cut', () => {
    const md = '* integral\n  \\[\n\\sum_{\\begin{subarray}{l} < n \\end{subarray}}\n\\]\n  $$\nT_{\\mu\\nu}\n$$\n  $[0, 1)$ gives that sum!\n'
    expect(failures(md, { columns: 21 }, ['moved'])).toEqual([])
  })

  // FUZZ-1. While streaming, placeable refuses the list once it holds a
  // display preview (the replay can't lay one out in a list), so inline math
  // in later items streams as plain Unicode; resumed, the cut list's rest is
  // laid out alone and gets images: live and resumed differ.
  test('FUZZ-1: inline math in items after a display gets its image live as it does resumed', () => {
    const md = '1. Compute the gradient of $f$:\n\n   $$\n   \\nabla f(x) = 2x\n   $$\n\n2. Then step with $\\alpha$.\n'
    expect(failures(md, {}, ['resumed'])).toEqual([])
  })

  // FUZZ-2 (live). Display previews are centred in the reply column
  // (replyColumns) and refused notes cut to it, but prose wraps at
  // maxProseWidth: with maxProseWidth 60 in a 120-column window the
  // preview's lines (lead pads + formula) wrap while streaming, and the image,
  // as tall as the unwrapped preview, lands with the text below moving up.
  // Fix: lay previews (and notes) out in proseWidthFor, or pad to its rows.
  // Fixed: renderEnvFor's maxColumns is proseWidthFor, streaming and landing alike.
  test('FUZZ-2: with maxProseWidth, a display preview takes the rows its image takes', () => {
    const md = 'The roots are\n\n$$\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$\n\nfor any $a \\ne 0$.\n'
    expect(failures(md, { columns: 120, maxProseWidth: 60 }, ['moved', 'overPreview'])).toEqual([])
  })

  test('FUZZ-2: with maxProseWidth, a refused formula\'s note takes one row', () => {
    const md = '\\[\n\\def\\a{\\b\\b}\\def\\b{\\c\\c}\\def\\c{\\d\\d}\\def\\d{\\e\\e}\\def\\e{\\f\\f}\\def\\f{xx} \\a\\a\\a\\a\n\\]\n'
    expect(failures(md, { maxProseWidth: 55 }, ['moved'])).toEqual([])
  })

  // FUZZ-3. placeable decides on the part written so far; something later in
  // the same part makes the replay refuse it at landing, and the formulas
  // padded before it keep their pads (gaps) and no image. Known for emoji
  // sequences (fix/emoji-sequences); these are other triggers: a code fence
  // opened in the list item, a whitespace-only line in a text with no other
  // markdown (drawn as written), and something refused more than WRITER_TAIL
  // (2 KB) earlier in a long list, which placeable no longer sees.
  test.skip('FUZZ-3: a formula padded before what refuses its part gets its image or no pads', () => {
    expect(failures('- $a c$\n  ```python\n  x = 1\n  ```\n', {}, ['inlineImage', 'padVisible'])).toEqual([])
    expect(failures('$a_1 a_{15}$\n  \n$\\exists y$\n', {}, ['inlineImage', 'padVisible'])).toEqual([])
    const items = ['- item zero with <b>html</b> in it', ...Array.from({ length: 69 }, (_, i) => `- item ${i + 1} with words and more words${i + 1 > 50 ? ` $a_{${i + 1}}$` : ''} there`)]
    expect(failures(items.join('\n') + '\n', {}, ['inlineImage'])).toEqual([])
  })

  // FUZZ-4 (live). inlinePreview checks a preview against the prose width
  // (less the quote's indent), not against the box it lands in: a table cell
  // narrower than the preview, a list item's text (the marker's cells
  // narrower), or the row left after punctuation glued to the formula. The
  // padded preview wraps, gets no image, and its pads stay.
  test('FUZZ-4: an inline preview wider than its cell or item is not padded', () => {
    const table = '| quantity | value | note |\n|---|---|---|\n| loss | $(AB)^* = B^*A^*$ | adjoint |\n| norm | $\\|x\\|_2$ | ok |\n'
    expect(failures(table, { columns: 40 }, ['padVisible', 'inlineImage'])).toEqual([])
    expect(failures('1) $10 = a_0 + a_1 + a_2 x^2 + a_3 x^3 + a_4 x^4 + a_5 x^5 + a_6 x^6$!\n', { columns: 45 }, ['padVisible', 'inlineImage'])).toEqual([])
    const quote = '> equals $a_1 + a_2 + a_3 + a_4 + a_5 + a_6 + a_7 + a_8 + a_9 + a_{10} + a_{11} + a_{12} + a_{13} + a_{14} + a_{15}$.\n'
    expect(failures(quote, { maxProseWidth: 67 }, ['padVisible', 'inlineImage'])).toEqual([])
  })

  // FUZZ-4, what main left: a table's header row is padded as a paragraph
  // until its delimiter row arrives, so in a narrow column its preview wraps
  // inside the cell; the landing draws the part left on the row (6 columns
  // for a 7-column slot) and the pad stays on the next row.
  test.skip('FUZZ-4: a formula in a narrow header cell is not padded', () => {
    const md = '[note](https://en.wikipedia.org/wiki/Kalman_filter) | | $\\cos^2 + 1$\n--- | ---: | :---:\n\\frac{\\rho}{\\varepsilon_0}$ | [derivative](https://en.wikipedia.org/wiki/Kalman_filter)\n'
    expect(failures(md, { columns: 100, links: 'text' }, ['imageShape', 'overPreview', 'padVisible'])).toEqual([])
  })

  // FUZZ-5. A display preview in a list item is centred in the reply column
  // and then indented by the item's text: its lines (the raw-TeX fallback
  // line especially, as wide as the column) are wider than the item's box
  // and wrap while streaming; the image lands shorter and the rows below move.
  test('FUZZ-5: a display preview in a list item fits the item', () => {
    const md = '3. =\n   \\begin{aligned}\n\\sqrt{n}\\left(\\bar{X}_n \\mu\\right) \\mathcal{N}(0,\n\\end{aligned}\nholds?\n'
    expect(failures(md, {}, ['moved'])).toEqual([])
  })

  // FUZZ-6 (stress report F5). Inline math with no one-line Unicode
  // (matrices, cases) got neither an image (too tall for a row) nor Unicode:
  // its LaTeX source stayed in the prose. Fixed on main (37c5e74: a matrix is
  // written on one line, `(a, b; c, d)`; what has no form, \underbrace, is
  // shown as a code span): a guard.
  test('FUZZ-6: inline matrices and cases do not stay raw LaTeX', () => {
    expect(failures('Let $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$ be invertible.\n', {}, ['rawLatex'])).toEqual([])
  })

  // FUZZ-7. Records map a landed preview back to its TeX by content, the
  // newest record winning: two formulas whose previews are equal (\tfrac12
  // and \frac12 are both `½`, A^T and A^\top both `Aᵀ`) both land with the
  // later one's image (and the records outlive the reply: a later reply can
  // change an earlier one's image when it redraws).
  // Fixed: records carry where their preview was written (`at`), kept per block; a landed block is linked to
  // its stream by its row (plugin/tests/blocks.test.ts).
  test('FUZZ-7: formulas with the same preview keep their own images', () => {
    expect(failures('$\\tfrac{1}{2}$\n\n$\\frac{1}{2}$\n', {}, ['impure', 'inlineImage'])).toEqual([])
    expect(failures('$A^\\top$\n$A^T$\n', {}, ['impure', 'inlineImage'])).toEqual([])
  })

  // FUZZ-8 (live; stress report F15). SOURCE_PATTERN and planLanded's
  // pre-check know `$`, `\(`, `\[` and `\begin{`, not a ```math fence: a reply
  // whose only math is one is drawn live but stays a code block after --resume.
  // Fixed: MATH_FENCE in SOURCE_PATTERN, LANDED_PATTERN and planLanded's check.
  test('FUZZ-8: a ```math fence lands as an image after --resume', () => {
    expect(failures('```math\ne^{i\\pi} + 1 = 0\n```\n', {}, ['resumed'])).toEqual([])
  })

  // FUZZ-9. Display math two quotes deep is never measured (drawn only at
  // depth 1): with no Unicode form that fits it stays raw LaTeX; one MathJax
  // refuses there gets no note.
  // Fixed: measured and drawn at any depth where the quote so far is followed.
  test('FUZZ-9: display math in a nested quote is drawn or noted', () => {
    expect(failures('> > > \\begin{aligned}\n> > > \\pmod{p}\n> > > \\end{aligned}\n', {}, ['rawLatex'])).toEqual([])
  })

  // FUZZ-10. For each inline formula, rewriteSegments calls placeable on all
  // the writer holds (its 2 KB tail and the whole flush so far): blockParts
  // and a layout of the block, so a flush costs formulas × flush length. One
  // flush carrying a 40-item list (14 KB, 800 formulas) takes ~1.5 s, an
  // 80-item one (29 KB) ~5.7 s of the hook's 10 s; prose about 15 times less.
  test.skip('FUZZ-10: one flush of a long list stays well under the budget', () => {
    const item = Array.from({ length: 10 }, (_, k) => `word $x_{${k}}$ and $\\alpha^{${k}}$ more`).join(' ')
    const list = Array.from({ length: 40 }, (_, i) => `- item ${i} ${item}`).join('\n') + '\n'
    const env = { ...envFor(BASE), inline: true }
    const start = performance.now()
    new MessageStream().push(list, true, env)
    expect(performance.now() - start).toBeLessThan(300)
  })

  // FUZZ-11 (live). A prose piece cut out at an image is drawn by the engine
  // as a text of its own; one with no markdown in it is drawn as written, so
  // its escapes and entities show: `\$5`, which the instructions tell the
  // model to write, streams as `$5` (the whole text is markdown) and lands as
  // `\$5`.
  // Fixed: images lie over the streamed text, so a piece is cut only where rows aren't known, and a cut piece
  // with no markdown of its own gets MARKDOWN_TAIL, so the engine reads it as markdown.
  test('FUZZ-11: escapes in a piece after an image are read as in the whole', () => {
    expect(failures('The area is\n\n$$\nA = \\pi r^2\n$$\n\nand it costs \\$5 per m.\n', {}, ['moved'])).toEqual([])
  })

  // FUZZ-12 (live). planLanded scans the landed text again for LaTeX: dollar
  // signs the streaming left as text (currency, a raw formula's own `$`, a
  // `$` in a formula's Unicode from `\$`) pair into formulas the reply never
  // had.
  test('FUZZ-12: no formula appears at landing that the reply did not have', () => {
    // Live (the streamed text landed with no records, as with `inline` off): the two rows land as one,
    // `$100 per seat, or † and [$` drawn as a formula.
    const md = 'The fee is $100 per seat, or\n$\\dagger$ and [$\\begin{pmatrix} 1 \\\\ 0 \\end{pmatrix}$] for both.\n'
    expect(failures(md, { inline: false }, ['phantom', 'moved'])).toEqual([])
  })

  // FUZZ-13. The Unicode renderer drops the parentheses of a fraction's
  // numerator in a script, under a root and in the tight form: e^{\frac{a+b}{c}}
  // is written `e^(a+b/c)` and a^{\frac{p-1}{2}} `a^(p−1/2)`, which read as
  // other formulas. Inline math too tall for an image stays in this form.
  test.skip('FUZZ-13: a fraction in a script keeps its numerator grouped', () => {
    expect(previewInline('a^{\\frac{p-1}{2}}', undefined, { tight: false })).toBe('a^((p−1)/2)')
    expect(previewInline('\\sqrt{\\frac{a-b}{c}}')).toBe('√((a−b)/c)')
  })

  // FUZZ-15. MarkdownWriter keeps only WRITER_TAIL (2 KB) of what it wrote:
  // in a list longer than that, a display formula in a nested item is sized
  // from a tail that no longer holds the outer item (displayColumns), so its
  // image is two cells too wide for the item and passes the window's right
  // edge (resumed, with the whole list, it fits).
  test.skip('FUZZ-15: a display in a nested item of a long list fits the window', () => {
    const items = Array.from({ length: 30 }, (_, i) => `  - nested item ${i} with a sentence of ordinary words to make it long enough`)
    const md = ['- Outer item', ...items, '  - last one:', '', '    $$', '    \\gcd(a, b) = \\gcd(b, a \\bmod b), \\qquad x \\equiv 3 \\mod 7', '    $$', ''].join('\n')
    expect(failures(md, { columns: 118, cellWidth: 10, cellHeight: 20 }, ['overlap', 'resumed'])).toEqual([])
  })

  // FUZZ-14. remember() kept the newest RECORD_LIMIT (512) previews for the
  // whole session: once a session had streamed more distinct previews, an
  // earlier block that redraws (a resize, a theme change, scrolling in the
  // fullscreen layout) found none of its records and lost its images, its
  // pads left as gaps. Records are kept per block now (kittex.blocks, by
  // message, the oldest dropped past BLOCK_LIMIT blocks): a block lands with
  // its own records whatever streamed after it (plugin/tests/blocks.test.ts
  // drives the store itself through register.tsx).
  test('FUZZ-14: an early reply keeps its images after many later formulas', () => {
    const first = streamReply('Take $x_{0}$ and $y$.\n', BASE)
    const later = Array.from({ length: 600 }, (_, k) => streamReply(`Then $z_{${k}}$.\n`, BASE))
    expect(later.every(reply => reply.store.length === 1)).toBe(true)
    expect(BLOCK_LIMIT).toBeGreaterThan(later.length)
    const images = land(first.shown, first.store, BASE).pieces.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []) : []))
    expect(images.map(image => image.tex)).toEqual(['x_{0}', 'y'])
  })
})
