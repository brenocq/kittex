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

const BASE: Shape = { columns: 80, cellWidth: 13, cellHeight: 26, terminal: 'kitty', block: 'image', inline: 'image', links: 'osc8', flushSeed: 1, trimLanded: false }

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

  // The driver's TeX book outlived its case: a formula MathJax refuses,
  // compiled by the stand-in TeX in a case with the local TeX, was then read
  // at landing and after --resume in a later case without it (no session can:
  // the book is the process's), so the resumed drawing showed the earlier
  // case's picture where the live one showed MathJax's note. Seeds 3353,
  // 4812, 5803, 6013, 7819 and 8674 of the 10000-case run; they surfaced once
  // the math documents changed (9eedf8e) and the stand-in's outcomes, keyed by
  // the document's text, moved.
  test("a case without the local TeX reads nothing an earlier case's TeX drew", () => {
    const cases: [string, Partial<Shape>][] = [
      ['$$\n\\foo{x} + 1\n$$\n', { columns: 40, terminal: 'ghostty' }],
      ['$$\na \\hfill b\n$$\n', { block: 'unicode' }],
      ['$$\n\\begin{tikzcd} A \\arrow[r] & B \\end{tikzcd}\n$$\n', { columns: 40 }],
    ]
    for (const [md, shape] of cases) {
      // The same reply with the local TeX first (it compiles the formula), then without it.
      runCase(md, { ...BASE, ...shape, tex: true })
      expect(failures(md, shape, ['resumed'])).toEqual([])
    }
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

  // FUZZ-3. The stream decided on the part written so far (a 2 KB tail of
  // it); something later in the same part made the replay refuse the whole
  // part at landing, and the formulas padded before it kept their pads (gaps)
  // and no image: a code fence later in a list item or a quote, a tab, HTML,
  // a link with no link mode known on a later line, a whitespace-only line in
  // a text with no other markdown, and anything the replay refuses more than
  // 2 KB back in a long list. Fixed: the stream reads the whole part, and the
  // replays lay a part out up to the line (or the block) they can't follow
  // instead of refusing it, so what was placed while streaming is placed
  // landed: guards.
  test('FUZZ-3: a formula padded before what refuses its part gets its image or no pads', () => {
    expect(failures('- $a c$\n  ```python\n  x = 1\n  ```\n', {}, ['inlineImage', 'padVisible'])).toEqual([])
    expect(failures('$a_1 a_{15}$\n  \n$\\exists y$\n', {}, ['inlineImage', 'padVisible'])).toEqual([])
    const items = ['- item zero with <b>html</b> in it', ...Array.from({ length: 69 }, (_, i) => `- item ${i + 1} with words and more words${i + 1 > 50 ? ` $a_{${i + 1}}$` : ''} there`)]
    expect(failures(items.join('\n') + '\n', {}, ['inlineImage'])).toEqual([])
  })

  test('FUZZ-3: a tab, HTML, a code fence or an unknown link after the formula in its part', () => {
    const cases: [string, Partial<Shape>][] = [
      ['1. $f g$ covariance\nhence\tfilter\n', {}],
      ['+ $a*b$ or\nbound <b>bold</b>\n', {}],
      ['$\\sim$\n<b>bold</b>\n', {}],
      ['> $A^*$\n~~~\n', {}],
      ['> $\\sum_{i=1}^{n} x_n^2$\nupdate\tstep\n', {}],
      ['> 1) $\\mathbf{x}$ which?\n> ```\n', {}],
      ['> $x_i$ `**not\n[$n!$](http://arxiv.org/abs/1706.03762)\n', { links: 'unknown' }],
      ['> $y_w$\nposterior](https://example.com) $p\n>\n', { links: 'unknown' }],
      ['$\\sum_{i=1}^n x_i$\nthis](https://github.com/owner/repo/issues/42)\n\n$x_i$\nsample\tto\n', { links: 'unknown' }],
    ]
    for (const [md, shape] of cases) expect({ md, failures: failures(md, shape, ['inlineImage', 'padVisible']) }).toEqual({ md, failures: [] })
  })

  test('FUZZ-3: a table whose later row the replay refuses streams its formulas unpadded', () => {
    expect(failures('$\\bar{x}$ | | |\n:---: | - | ---:\n\uff46\uff55\uff4c\uff4c\n', {}, ['inlineImage', 'padVisible'])).toEqual([])
    expect(failures('from | | $n$ | | | [not](http://arxiv.org/abs/1706.03762)\n:---: | ---: | :---: | - | --- | --------\n', { links: 'unknown' }, ['inlineImage', 'padVisible'])).toEqual([])
    const md = '$5 | | $\\|x\\|$\n-------- | --- | ---\n$a_1 a_{15}$ |\n| -\nof | | [follows](https://github.com/owner/repo/issues/42) | in\n\n'
    for (const flushSeed of [1, 1000531432]) expect(failures(md, { flushSeed }, ['inlineImage', 'padVisible'])).toEqual([])
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

  // FUZZ-4, what main left: a table's header row was padded as a paragraph
  // until its delimiter row arrived, so in a narrow column its preview wrapped
  // inside the cell; the landing drew the part left on the row (6 columns for
  // a 7-column slot) and the pad stayed on the next row. Fixed: a line that
  // may be a table's header waits for the next line, and a table holding
  // inline math is held until it ends, so its formulas are decided on the
  // whole table: a guard.
  test('FUZZ-4: a formula in a narrow header cell is not padded', () => {
    const md = '[note](https://en.wikipedia.org/wiki/Kalman_filter) | | $\\cos^2 + 1$\n--- | ---: | :---:\n\\frac{\\rho}{\\varepsilon_0}$ | [derivative](https://en.wikipedia.org/wiki/Kalman_filter)\n'
    expect(failures(md, { columns: 100, links: 'text' }, ['imageShape', 'overPreview', 'padVisible'])).toEqual([])
    const narrow = 'entropy | | | $\\gg$ | | | | | |\n-------- | -------- | :--- | --- | ---: | -------- | --- | :---: | --------\n$\\beta_1$ | distribution | `a b` | $\\nabla f$ | `np.linalg.inv(A)`\n'
    expect(failures(narrow, {}, ['imageShape', 'overPreview', 'padVisible', 'resumed'])).toEqual([])
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

  // FUZZ-10. For each inline formula, rewriteSegments called placeable on all
  // the writer held (its 2 KB tail and the whole flush so far): blockParts
  // and a layout of the block, so a flush cost formulas × flush length. One
  // flush carrying a 40-item list (14 KB, 800 formulas) took ~1.5 s, an
  // 80-item one (29 KB) ~5.7 s of the hook's 10 s. Fixed: a flush lays each
  // part out once with all its formulas (again only for one that didn't fit),
  // from the start of the block it ends in, and a formula's forms are worked
  // out once per terminal: guards.
  test('FUZZ-10: one flush of a long list stays well under the budget', () => {
    const item = Array.from({ length: 10 }, (_, k) => `word $x_{${k}}$ and $\\alpha^{${k}}$ more`).join(' ')
    const list = Array.from({ length: 40 }, (_, i) => `- item ${i} ${item}`).join('\n') + '\n'
    const env = { ...envFor(BASE), inline: true }
    const start = performance.now()
    new MessageStream().push(list, true, env)
    expect(performance.now() - start).toBeLessThan(300)
  })

  test('FUZZ-10: every flush of a 200-item list takes less than 100 ms, whole or line by line', () => {
    const item = Array.from({ length: 10 }, (_, k) => `word $x_{${k}}$ and $\\alpha^{${k}}$ more`).join(' ')
    const lines = Array.from({ length: 200 }, (_, i) => `- item ${i} ${item}\n`)
    const env = { ...envFor(BASE), inline: true }
    new MessageStream().push(lines.slice(0, 2).join(''), true, env) // its formulas worked out once
    const whole = Math.min(...[0, 1, 2].map(() => {
      const start = performance.now()
      new MessageStream().push(lines.join(''), true, env)
      return performance.now() - start
    }))
    expect(whole).toBeLessThan(100)
    const stream = new MessageStream()
    let slowest = 0
    for (const [k, line] of lines.entries()) {
      const start = performance.now()
      stream.push(line, k === lines.length - 1, env)
      slowest = Math.max(slowest, performance.now() - start)
    }
    expect(slowest).toBeLessThan(100)
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
    expect(failures(md, { inline: 'unicode' }, ['phantom', 'moved'])).toEqual([])
  })

  // FUZZ-13. The Unicode renderer drops the parentheses of a fraction's
  // numerator in a script, under a root and in the tight form: e^{\frac{a+b}{c}}
  // is written `e^(a+b/c)` and a^{\frac{p-1}{2}} `a^(p−1/2)`, which read as
  // other formulas. Inline math too tall for an image stays in this form.
  test.skip('FUZZ-13: a fraction in a script keeps its numerator grouped', () => {
    expect(previewInline('a^{\\frac{p-1}{2}}', undefined, { tight: false })).toBe('a^((p−1)/2)')
    expect(previewInline('\\sqrt{\\frac{a-b}{c}}')).toBe('√((a−b)/c)')
  })

  // FUZZ-15. MarkdownWriter kept only a 2 KB tail of what it wrote: in a
  // list longer than that, a display formula in a nested item was sized from
  // a tail that no longer held the outer item (displayColumns), so its image
  // was two cells too wide for the item and passed the window's right edge
  // (resumed, with the whole list, it fit). Fixed: the writer keeps it all,
  // and the item is read from where its list starts: a guard.
  test('FUZZ-15: a display in a nested item of a long list fits the window', () => {
    const items = Array.from({ length: 30 }, (_, i) => `  - nested item ${i} with a sentence of ordinary words to make it long enough`)
    const md = ['- Outer item', ...items, '  - last one:', '', '    $$', '    \\gcd(a, b) = \\gcd(b, a \\bmod b), \\qquad x \\equiv 3 \\mod 7', '    $$', ''].join('\n')
    expect(failures(md, { columns: 118, cellWidth: 10, cellHeight: 20 }, ['overlap', 'resumed'])).toEqual([])
  })

  // FUZZ-16. Live kept Unicode where resumed drew images: the stream judged
  // a formula's part with what came before it (the landing lays the text after
  // a display image out as a piece of its own), read a table's header row as
  // a paragraph, and put a display after a list item's line in the item (its
  // block is written after a blank line, at the reply's edge). Fixed: guards.
  test('FUZZ-16: live lands the images resumed lands', () => {
    const cases: [string, Partial<Shape>][] = [

      // A table's header row, its delimiter row in the next flush.
      ['|  | | | $|a| |b|$\n-------- | ---: | :--- | ---\n', {}],
      // A display right after a list item's line is no part of the item.
      ['- in](https://example.com)\n$$\\comm{\\hat{L}_i}{\\hat{L}_j} i\\hbar\\,\\epsilon_{ijk}\\hat{L}_k$$\n', { inline: 'unicode' }],
      // A piece after a refused formula's note, its blank lines dropped as the landing drops them.
      ['\\[\\frac{d}{dx}\\int_{a(x)}^{b(x)} x}\\,dt\\]\n  \n$\\emptyset$\n\n', {}],
      // A heading right above a code fence that is still open.
      ['basis;\n\nb}_{n}$.\n\n### $\\partial_t u$\n```latex\n$HOME\n\n', {}],
      // A quote's formula, a display in the quote after it.
      ['> > $\\vec{v}$?\n>\n> $$\n> \\begin{equation}\n> \\end{equation}\n$$\n', { flushSeed: 618747191 }],
    ]
    for (const [md, shape] of cases) expect({ md, failures: failures(md, shape, ['resumed', 'inlineImage', 'displayImage']) }).toEqual({ md, failures: [] })
  })

  // FUZZ-16 with fix/landing-map: a display in a list item the replay doesn't follow up to it (a link it can't
  // lay out) keeps its preview, the list drawn whole as it streamed (no cut: FUZZ-1); the stream plans no cut
  // there either, so a formula in a later item streams as plain Unicode, live as resumed.
  test('FUZZ-16: a kept display in an item does not cut the list, live or resumed', () => {
    const md = '- https://example.com/a/very/long/path/that/keeps/going/and/going/index.html?query=1&other=2\n  \\begin{array}{c||c} \\end{array}\n- $\\emptyset$ step\n'
    expect(failures(md, { links: 'unknown' }, ['resumed', 'inlineImage', 'moved', 'padVisible'])).toEqual([])
  })

  // The same for an unclosed fence before a display (marked reads the rest as its code; the scanner took the
  // fence for closed, so the display streamed as a preview): no piece starts after it, so the formula after it
  // isn't padded, and nothing is drawn over the code.
  test('FUZZ-16: an unclosed fence before a display reaches the text after it, live and resumed', () => {
    const md = '+\n    ```text\n```\n\\begin{align}\ne\n\\end{align}\n$\\hat{x}_{k|k} \\hat{x}_{k|k-1})$\n'
    expect(failures(md, {}, ['resumed', 'inlineImage', 'moved', 'padVisible'])).toEqual([])
  })

  // FUZZ-16, the landing's part: with inline images off, planLanded gets no
  // link mode (PlanOptions has it only in `inline`), so a list item holding a
  // link is a list it doesn't follow there; the stream knows the mode and
  // writes the display as the item's, whose image the landing then can't
  // place (live keeps the preview), while resumed draws it as an image of its
  // own and cuts the list. Fix (landing): give planLanded the link mode
  // whatever the inline option. Fixed: PlanOptions.mode.
  test('FUZZ-16: with inline images off, a display in an item holding a link lands as resumed lands it', () => {
    const md = '2. rank](https://github.com/owner/repo/issues/42)\n   \\[\nN(d_2)\n\\]\n   $\\frac{n(n+1)}{2}$\n'
    expect(failures(md, { inline: 'unicode' }, ['resumed', 'displayImage'])).toEqual([])
  })

  test('FUZZ-16: a quote goes on after a display block as the landing writes it, whatever the flushes', () => {
    const md = '> > > $$\n> > > \\Gamma^\\rho_{\\nu\\sigma}\n> > > $$\n> > >\ncovariance\n'
    for (const flushSeed of [1, 2, 3]) expect(failures(md, { inline: 'unicode', flushSeed }, ['resumed', 'moved'])).toEqual([])
  })

  // fix/landing-map's fuzz run: with inline images off the plan knew no terminal width (only `inline` had it),
  // so a table above a display was laid out in the prose width (its list form) and the image landed rows low;
  // and math read back as LaTeX in a table cell kept the unpadded form where the plain one was its last chance.
  test('the plan lays tables out in the terminal width, and gives resumed math its last form', () => {
    const md = '[value](https://github.com/owner/repo/issues/42) | $D_{KL}(p \\sum_x p(x) \\log | | |\n- | - | - | -------- \n$\\min_i x_i$ \n\\mid B)$ | | `\\frac{a}{b}` \n$$\n\\ointctrclockwise_C \n$$\n\n- norm.\n'
    expect(failures(md, { inline: 'unicode', maxProseWidth: 49 }, ['overPreview', 'moved'])).toEqual([])
    const table = 'likelihood | $\\hbar$ | | averyveryveryveryveryveryveryveryveryveryverylongidentifierwithoutanybreaks \n| - | :--- | :--- | :--- \n$\\beta_1$ \nupdate | holds $\\arg\\max_x f(x)$ space \n\n'
    expect(failures(table, {}, ['resumed'])).toEqual([])
  })

  // FUZZ-16, the stream's part (fix/resume-parity): a formula the stream waits
  // on TeX for (one MathJax refuses) cut what it wrote there, mid-line, so the
  // formulas before it were decided on a line cut short (`- Holds ` read as no
  // part at all) and streamed plain, where resumed, the line whole, drew them;
  // in a table the rows written before the wait were laid out without the rows
  // it held. Fixed: what TeX holds is held from its line's start, or from where
  // a table holding inline math is held (holdFrom).
  test('FUZZ-16: formulas before one TeX holds are decided on whole lines, live as resumed', () => {
    const cases: [string, Partial<Shape>][] = [
      ['$\\star$ \n- Holds $x^{2$ \n', { flushSeed: 307125138, tex: true }],
      ['$P(A B)$ | | | |\n--- | ---: | :--- | --------\n$\\undefinedmacro$ \nthat | where diverges ', { columns: 40, tex: true }],
    ]
    for (const [md, shape] of cases) expect({ md, failures: failures(md, shape, ['resumed', 'inlineImage', 'padVisible']) }).toEqual({ md, failures: [] })
  })

  // FUZZ-16, the stream's part: the stream laid each part out alone, so a
  // paragraph with no markdown of its own was read as written (a hard line
  // break's two spaces not followed) where the landing, the whole text read
  // as markdown, laid it out as markdown and placed the formula after the
  // break; it read the text after a diagram TeX doesn't draw (written as it
  // came, no blank line before it) from a cell too far, a fence's first
  // backtick lost; and a text marked can't read whole as no part at all where
  // the landing reads its start (partsOf). Fixed: the stream reads parts as
  // the landing does.
  test('FUZZ-16: the stream reads parts as the landing reads them', () => {
    const cases: [string, Partial<Shape>][] = [
      ['$\\sigma^2$:  \n$\\sin\\theta$ \n\n$$', {}],
      ['$\\langle\\phi|\\psi\\rangle$ \n```latex\n\\sqrt{c}\n```\n$\\langle \\rangle$ ', { tex: true }],
      ['$\\mathbbm{1}$ \n\n> * = \n ', { flushSeed: 911639543 }],
    ]
    for (const [md, shape] of cases) expect({ md, failures: failures(md, shape, ['resumed', 'inlineImage', 'padVisible']) }).toEqual({ md, failures: [] })
  })

  // FUZZ-16, the landing's part: math read back as LaTeX in a quote was
  // padded for a row as wide as the prose, where streaming measures it
  // against the quote's text (two cells in per quote): a formula too wide
  // for that streamed plain and resumed drew an image.
  test('FUZZ-16: resumed math in a quote is measured against the quote\'s text', () => {
    const md = '> > $f(x) = a_0 + a_1 x + a_2 x^2 + a_3 x^3 + a_4 x^4 + a_5 x^5 + a_6 x^6$ \n'
    expect(failures(md, { columns: 46 }, ['resumed', 'inlineImage', 'padVisible'])).toEqual([])
  })

  // FUZZ-16 and the unknown resumed/rows (seeds 2607, 7887, 8293): math read
  // back as LaTeX that a pass left without an image all took its next form
  // at once, where streaming moves one formula a part at a time and lays the
  // part out again (in a table each form changes the columns): resumed
  // tables settled on other forms, other column widths and other rows; and a
  // padded formula whose pad went to the next row of its cell was drawn over
  // its Unicode, the pad left on that row, where streaming writes it
  // unpadded. Fixed: planLanded moves them on as decideInline does, and math
  // read back as LaTeX is never drawn over its Unicode alone.
  test('FUZZ-16: resumed tables settle on the forms the live landing drew', () => {
    const cases: [string, Partial<Shape>][] = [
      ['$\\mathfrak{g}$ | | |\n--- | - | -------- \n|\nvariance | $\\sum_{i=1}^{n} x_i^2 x_1^2 x_n^2$ | $P(A \\mid B)$ \n', { columns: 40 }],
      ['or | $a < b > c$ \n:---: | :---: \n1]$ | $x_{k+1} - f(x_k)$ \n$a_1 + a_2 + a_5 + a_6 + a_7 + a_8 + a_9 + a_{10} + a_{11} + a_{12} + a_{13} + a_{14} + a_{15}$ | operator \n', { columns: 60 }],
      ['as | | |\n- | :---: | :--- \ndeterminant \nfor | | because \nvariance | $\\Pr[X = 1]$ ', { columns: 40, cellWidth: 10, cellHeight: 20, terminal: 'ghostty' }],
      ['$|x|$ | | | $P(A \n--- | - | :---: | ---: \ngives | [limit](https://github.com/owner/repo/issues/42) \n|\noperator | | $A^{-1}$ \n\nconverges', { columns: 62, terminal: 'ghostty', links: 'text' }],
      ['B)$ | | converges \n---: | :--- | --- \nthat | $x_1 * y_2$ \n| | determinant \nsample \n', { columns: 28 }],
      ['$|a| + |b|$ | operator | | | bound | note \n:---: | - | --- | --- | - | -\n$A^{-1}$ | | | therefore \n1` | \n', { columns: 52 }],
    ]
    for (const [md, shape] of cases) expect({ md, failures: failures(md, shape, ['resumed', 'inlineImage', 'padVisible']) }).toEqual({ md, failures: [] })
  })

  // FUZZ-3 and FUZZ-4, the stream's part: a formula streamed padded, then
  // something later in its part made the landing lose it, its pad left: a
  // code fence still open at the end of a flush, lexed without its newline,
  // read as a lazy line of the quote before it (the part not split, so the
  // stream wrote the formula plain where the landing placed it); a lazy line
  // after a quote, which marked ends with a newline the text doesn't have
  // (blockParts null: no part); a table whose delimiter row starts as a list
  // item does (`- | :--- | -`), not held while its rows came, its layout
  // changed by a later row. Fixed: guards.
  test('FUZZ-3/4: an open fence, a lazy line or a delimiter row like an item keep the part streamed', () => {
    const cases: [string, Partial<Shape>][] = [
      ['not.\n> 2) $a b$ state.\n```python\n```\n', {}],
      ['> * $\\theta$ with.\neach:', {}],
      ['$|x|$ | | |\n- | :--- | -\nposterior \n|', { columns: 25, terminal: 'ghostty' }],
    ]
    for (const [md, shape] of cases) expect({ md, failures: failures(md, shape, ['resumed', 'inlineImage', 'padVisible']) }).toEqual({ md, failures: [] })
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
