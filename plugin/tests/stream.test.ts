// The streaming rewrite and the plan of a landed reply, with core's own scanner.

import { describe, expect } from 'claude-code/testing'

import { init, measureDisplay, previewDisplay, previewInline, renderDisplay, TexError } from '../hooks/core.js'
import {
  BLANK_CELL,
  BULLET,
  bulletFor,
  cellsOf,
  displayPreviewLines,
  escapeMarkdown,
  HELD_DISPLAY,
  LANDED_PATTERN,
  SOURCE_PATTERN,
  STREAMED_PATTERN,
  MessageStream,
  NOT_RENDERED,
  planLanded,
  PREVIEW_PAD,
  previewMarkdownLines,
  renderEnvFor,
  replyColumns,
  spreadRows,
  withoutTextOverride,
} from '../hooks/math.ts'
import type { KittexEnv, Piece, PlanOptions, PreviewRecord } from '../hooks/math.ts'
import { COLUMNS, kittyEnv, test } from './support.ts'

const TEX = 'E = mc^2'
const INTEGRAL = '\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}'

/** Streams `flushes` (the last one final) as one message: what was shown, and the previews recorded. */
function streamed(flushes: readonly string[], env: KittexEnv = kittyEnv()): { shown: string[]; landed: string; records: PreviewRecord[] } {
  const stream = new MessageStream()
  const shown: string[] = []
  const records: PreviewRecord[] = []
  for (const [i, delta] of flushes.entries()) {
    const flush = stream.push(delta, i === flushes.length - 1, env)
    shown.push(flush.text)
    records.push(...flush.records)
  }
  return { shown, landed: shown.join(''), records }
}

/** The landed text's plan with images, as the AssistantMessage hook makes it. */
function plan(text: string, records: readonly PreviewRecord[], extra: Partial<PlanOptions> = {}) {
  const renderEnv = renderEnvFor(kittyEnv())
  return planLanded(text, records, {
    maxColumns: renderEnv.maxColumns,
    draw: (tex, rows) => renderDisplay(tex, renderEnv, rows ?? measureDisplay(tex, renderEnv).rows),
    ...extra,
  })
}

/** The cells a preview line takes on screen: a pad is one cell, an escape none. */
function drawnCells(line: string): number {
  return cellsOf(line.replaceAll(PREVIEW_PAD, ' ').replace(/\\([\\`*_[\]<>|~&!#])/g, '$1'))
}

function shape(pieces: readonly Piece[]): string[] {
  return pieces.map(piece => (piece.kind === 'prose' ? `prose${piece.gap ? '+gap' : ''}:${piece.text}` : `${piece.kind}${piece.gap ? '+gap' : ''}`))
}

describe('preview lines', () => {
  test('leading spaces become pads, blank lines keep theirs, markdown syntax is escaped', () => {
    const lines = previewMarkdownLines(['  a*b_c', '       ', '# x|y <z> `w` \\ [k] ~ & !'], 40)
    for (const line of lines) {
      expect(line.startsWith(PREVIEW_PAD)).toBe(true)
      expect(line).not.toMatch(/\s$/)
    }
    expect(lines[0]).toMatch(/^(&nbsp;)+a\\\*b\\_c$/)
    expect(lines[1]).toMatch(/^(&nbsp;)+\u2800$/)
    expect(lines[2]).toMatch(/^(&nbsp;)+\\# x\\\|y \\<z\\> \\`w\\` \\\\ \\\[k\\\] \\~ \\& \\!$/)
    expect(escapeMarkdown('1. -+>')).toBe('1. -+\\>')
  })

  test('lines are centred and narrower than the reply column', () => {
    const lines = previewMarkdownLines(['abc', 'abcdef'], 20)
    expect(lines.map(drawnCells)).toEqual([10, 13])
    const wide = previewMarkdownLines(['x'.repeat(18)], 20)
    expect(drawnCells(wide[0]!)).toBe(19)
  })
})

describe('MessageStream', () => {
  test('holds an open display block, then shows exactly the rows its image takes, as a paragraph of its own', async () => {
    await init()
    const env = kittyEnv()
    const { shown, records } = streamed(['Energy is\n$$\n', `${TEX}\n`, '$$\nas Einstein said.\n', 'The end.'], env)
    expect(shown[0]).toBe('Energy is\n')
    expect(shown[1]).toBe(HELD_DISPLAY)
    const rows = measureDisplay(TEX, renderEnvFor(env)).rows
    // A blank line before and after the preview even though the source had none.
    const lines = shown[2]!.split('\n')
    expect(lines[0]).toBe('')
    expect(lines.slice(1, rows + 1).every(line => line.startsWith(PREVIEW_PAD))).toBe(true)
    expect(lines.slice(rows + 1)).toEqual(['', 'as Einstein said.', ''])
    expect(shown[2]!.endsWith('\n')).toBe(true)
    expect(records).toEqual([{ preview: lines.slice(1, rows + 1).join('\n'), tex: TEX, rows }])
    for (const line of lines.slice(1, rows + 1)) expect(drawnCells(line)).toBeLessThan(replyColumns(COLUMNS))
  })

  test('padding rows end in a blank cell, so no row is a line of pads alone', async () => {
    await init()
    const { records } = streamed([`$$\na^2 + b^2 = c^2\n$$\n`, `$$\n${INTEGRAL}\n$$\n`, 'end'])
    const lines = records.flatMap(record => record.preview.split('\n'))
    expect(lines.some(line => line.endsWith(BLANK_CELL))).toBe(true)
    for (const line of lines) expect(line).not.toMatch(/^(&nbsp;)*$/)
  })

  test('a preview is a pure function of the formula and the terminal', async () => {
    await init()
    const a = streamed([`$$\n${INTEGRAL}\n$$\n`, 'x'])
    const b = streamed(['Before.\n\n', `$$\n${INTEGRAL}\n$$\n`, 'y'])
    expect(a.records[0]!.preview).toBe(b.records[0]!.preview)
  })

  test('one flush may carry several lines, a whole formula among them', async () => {
    await init()
    const { shown, records } = streamed([`Line 10\n$$\n${TEX}\n$$\nLine 11\n`, 'end'])
    expect(records).toHaveLength(1)
    expect(shown[0]!.startsWith('Line 10\n\n' + records[0]!.preview + '\n\nLine 11\n')).toBe(true)
  })

  test('a reply that opens with a formula opens with its preview', async () => {
    await init()
    const { landed, records } = streamed(['$$\n', `${TEX}\n`, '$$\n', 'is famous.'])
    expect(landed.startsWith(records[0]!.preview + '\n\nis famous.')).toBe(true)
  })

  test('two formulas with no blank line between them stay two previews', async () => {
    await init()
    const { landed, records } = streamed([`$$${TEX}$$\n$$${INTEGRAL}$$\n`, 'done'])
    expect(records.map(record => record.tex)).toEqual([TEX, INTEGRAL])
    expect(landed).toBe(`${records[0]!.preview}\n\n${records[1]!.preview}\n\ndone`)
  })

  test('a formula in a list item keeps its indentation', async () => {
    await init()
    const { landed, records } = streamed(['- Basel:\n', '  $$\n', `  ${TEX}\n`, '  $$\n', '- next'])
    const lines = landed.split('\n')
    expect(lines[0]).toBe('- Basel:')
    expect(lines[1]!.trim()).toBe('')
    expect(lines.slice(2, -2).every(line => line.startsWith('  ' + PREVIEW_PAD))).toBe(true)
    expect(lines.slice(-2)).toEqual(['', '- next'])
    expect(plan(landed, records).pieces.filter(piece => piece.kind === 'image')).toHaveLength(1)
  })

  test('inline math becomes one line of Unicode while streaming', async () => {
    await init()
    const { shown } = streamed(['Let $x^2$ be positive.\n', ''])
    expect(shown[0]).toBe(`Let ${previewInline('x^2', renderEnvFor(kittyEnv()).maxColumns)} be positive.\n`)
  })

  test('a refused formula shows its source and a not-rendered line, and the others still render', async () => {
    await init()
    const { landed, records } = streamed(['$$\\foo{x}$$\n', '\n', `$$${TEX}$$\n`, '\n', `$$${INTEGRAL}$$\n`, 'end'])
    const refused = records[0]!
    expect(refused).toMatchObject({ tex: '\\foo{x}', rows: 0, error: expect.stringContaining('foo') })
    expect(refused.preview).toBe(`\`\`\`latex\n\\foo{x}\n\`\`\`\n\n*not rendered: ${escapeMarkdown(refused.error!)}*`)
    expect(records.slice(1).map(record => record.tex)).toEqual([TEX, INTEGRAL])
    const pieces = plan(landed, records).pieces
    expect(shape(pieces)).toEqual(['prose:```latex\n\\foo{x}\n```', 'note+gap', 'image+gap', 'image+gap', 'prose+gap:end'])
    expect(pieces[1]).toMatchObject({ text: NOT_RENDERED + refused.error })
  })

  test('a formula the font has no glyphs for streams its Unicode preview, which stays once landed', async () => {
    await init()
    const tex = '\\text{Привет}\\ x = 1'
    const { landed, records } = streamed([`$$${tex}$$\n`, '\n', `$$${TEX}$$\n`, 'end'])
    expect(records[0]).toMatchObject({ tex, rows: 1 })
    expect(records[0]!.error).toBeUndefined()
    expect(records[0]!.preview).toContain('Привет x = 1')
    const pieces = plan(landed, records).pieces
    expect(shape(pieces)[0]).toContain('Привет x = 1')
    expect(pieces.filter(piece => piece.kind === 'image').length).toBe(1)
    expect(pieces.some(piece => piece.kind === 'note')).toBe(false)
  })

  test('without images a display formula is an unpadded preview and records nothing', async () => {
    await init()
    const env = { ...kittyEnv(), kind: 'wezterm' as const, images: false }
    const { landed, records } = streamed([`$$\n${TEX}\n$$\n`, ''], env)
    expect(records).toEqual([])
    const lines = previewDisplay(TEX, { maxColumns: renderEnvFor(env).maxColumns - 2 })!
    expect(landed.trimEnd().split('\n')).toEqual(previewMarkdownLines(lines, renderEnvFor(env).maxColumns))
  })
})

describe('planLanded', () => {
  test('the landed text maps back to the TeX and the reserved rows', async () => {
    await init()
    const { landed, records } = streamed(["Euler's identity:\n\n$$\n", `${TEX}\n`, '$$\n\nis beautiful.'])
    const { pieces, changed } = plan(landed, records)
    expect(changed).toBe(true)
    expect(shape(pieces)).toEqual(["prose:Euler's identity:", 'image+gap', 'prose+gap:is beautiful.'])
    const image = pieces[1]!
    if (image.kind !== 'image') throw new Error('not an image')
    expect(image.tex).toBe(TEX)
    expect(image.image.rows).toBe(records[0]!.rows)
    expect(image.image.columns).toBe(replyColumns(COLUMNS))
  })

  test('a reply that opens with a formula plans the image first', async () => {
    await init()
    const { landed, records } = streamed([`$$\n${TEX}\n$$\n`, 'is famous.'])
    expect(shape(plan(landed, records).pieces)).toEqual(['image', 'prose+gap:is famous.'])
  })

  test('trailing spaces the engine trims still map back', async () => {
    await init()
    const { landed, records } = streamed([`$$\n${TEX}\n$$\n`, ''])
    expect(shape(plan(landed.replace(/[ \t]+$/gm, ''), records).pieces)).toEqual(['image'])
  })

  test('a render before the last flush: a preview cut off stays text', async () => {
    await init()
    const { landed, records } = streamed(['Intro.\n\n', `$$\n${INTEGRAL}\n$$\n`, 'tail'])
    const cut = landed.slice(0, landed.indexOf(records[0]!.preview) + records[0]!.preview.lastIndexOf('\n'))
    const partial = plan(cut, records)
    expect(partial.pieces.every(piece => piece.kind === 'prose')).toBe(true)
    expect(plan('', records).changed).toBe(false)
    expect(shape(plan(landed, records).pieces)).toEqual(['prose:Intro.', 'image+gap', 'prose+gap:tail'])
  })

  test('after --resume the original LaTeX is typeset directly', async () => {
    await init()
    const pieces = plan(`Energy is\n\n$$\n${TEX}\n$$\n\nas Einstein said.`, []).pieces
    expect(shape(pieces)).toEqual(['prose:Energy is', 'image+gap', 'prose+gap:as Einstein said.'])
  })

  test('rewrites inline math in a reply that never streamed', async () => {
    await init()
    const result = planLanded('Take $a+b$ and $c$.', [], { maxColumns: 97 })
    expect(result.changed).toBe(true)
    expect(result.pieces).toEqual([{ kind: 'prose', text: `Take ${previewInline('a+b', undefined, { tight: false })} and ${previewInline('c', undefined, { tight: false })}.`, gap: false }])
  })

  test('leaves a reply without math alone', () => {
    expect(planLanded('Nothing to see.', [], { maxColumns: 97 }).changed).toBe(false)
    expect(LANDED_PATTERN.test('Nothing to see, costs 5 dollars.')).toBe(false)
    expect(LANDED_PATTERN.test('costs $5')).toBe(true)
    expect(LANDED_PATTERN.test('&nbsp;x')).toBe(true)
  })

  test('a streamed text and LaTeX as written are told apart, escaped brackets included', () => {
    const streamedText = '&nbsp;&nbsp;= −𝔼\\[log σ\\] and y\u2800'
    expect([STREAMED_PATTERN.test(streamedText), SOURCE_PATTERN.test(streamedText)]).toEqual([true, false])
    for (const source of ['\\[ x \\]', 'a $x$', '$$\nx^2\n$$', '\\(x\\)', '\\begin{aligned}', 'You save $100 at a rate $r = 0.05$ a year.']) {
      expect({ source, streamed: STREAMED_PATTERN.test(source), latex: SOURCE_PATTERN.test(source) }).toEqual({ source, streamed: false, latex: true })
    }
    expect([STREAMED_PATTERN.test('plain [x]'), SOURCE_PATTERN.test('plain [x]')]).toEqual([false, false])
  })

  // A block holding a preview mark is one kittex streamed, whatever else it
  // holds: hooked as LaTeX source, the fullscreen landing drew it as nothing
  // until the hook answered (live QA: 22 of 46 fullscreen runs, 15 to 140 ms).
  test('a preview mark makes a text streamed, never LaTeX source, a dollar in it or not', () => {
    for (const streamed of ['x\u2800 $y$', '\\(x\\) &nbsp;', 'r\u00a0=\u00a00.05 on $100', 'x\u034f costs \\$5', '```latex\n\\begin{x}\n```\n\n*not rendered: missing argument*']) {
      expect({ streamed, is: STREAMED_PATTERN.test(streamed), latex: SOURCE_PATTERN.test(streamed) }).toEqual({ streamed, is: true, latex: false })
    }
  })

  test('a dollar amount, as written or escaped, is no LaTeX source', () => {
    for (const text of [
      'You save $100 a year.',
      'You save \\$100 a year.',
      '$25,000 at 6.5% APR over 5 years, and $25,000 at 4.9% over 7 years',
      'from $5-$10 each',
      'between $5 and $10',
      'Run `echo $HOME` or `$PATH`.',
    ]) {
      expect({ text, latex: SOURCE_PATTERN.test(text), streamed: STREAMED_PATTERN.test(text) }).toEqual({ text, latex: false, streamed: false })
    }
  })

  test('keeps a formula MathJax refuses as its source, with a note under it', () => {
    const raw = '$$\\frac{$$'
    const result = planLanded(raw, [], {
      maxColumns: 97,
      draw: () => {
        throw new TexError('missing argument')
      },
      scan: () => [{ kind: 'math', display: true, tex: '\\frac{', raw, delimiter: '$$', start: 0, end: raw.length }],
    })
    expect(result.pieces).toEqual([
      { kind: 'prose', text: '```latex\n\\frac{\n```', gap: false },
      { kind: 'note', text: 'not rendered: missing argument', gap: true },
    ])
  })
})

describe('ink and bullet', () => {
  test("a custom theme's text colour is dropped, its base kept", () => {
    const sepia = JSON.stringify({ base: 'light', overrides: { text: '#704214', claude: '#ff0000' } })
    expect(JSON.parse(withoutTextOverride(sepia)!)).toEqual({ base: 'light', overrides: { claude: '#ff0000' } })
    expect(withoutTextOverride(undefined)).toBeUndefined()
    expect(withoutTextOverride('not json')).toBe('not json')
  })

  test('the bullet follows the host system', () => {
    expect(bulletFor('Darwin\n', undefined)).toBe(BULLET.macos)
    expect(bulletFor('Linux\n', '/Users/x')).toBe(BULLET.other)
    expect(bulletFor(undefined, '/Users/me')).toBe(BULLET.macos)
    expect(bulletFor(undefined, '/home/me')).toBe(BULLET.other)
  })
})

/** kitty's 13×26 px cells. */
const kitty26 = (): KittexEnv => ({ ...kittyEnv(), cellHeight: 26 })

describe('tall previews (stress report F18)', () => {
  const DERIVATION = "\\begin{aligned}\nI &= \\int_0^\\infty x^2 e^{-ax^2}\\,dx \\\\\n&= -\\frac{\\partial}{\\partial a}\\int_0^\\infty e^{-ax^2}\\,dx \\\\\n&= -\\frac{\\partial}{\\partial a}\\left(\\frac{1}{2}\\sqrt{\\frac{\\pi}{a}}\\right) \\\\\n&= -\\frac{\\sqrt{\\pi}}{2}\\frac{\\partial}{\\partial a}a^{-1/2} \\\\\n&= -\\frac{\\sqrt{\\pi}}{2}\\left(-\\frac{1}{2}\\right)a^{-3/2} \\\\\n&= \\frac{\\sqrt{\\pi}}{4}a^{-3/2} \\\\\n&= \\frac{1}{4}\\sqrt{\\frac{\\pi}{a^3}} \\\\\nJ &= \\int_0^\\infty x^4 e^{-ax^2}\\,dx \\\\\n&= \\frac{\\partial^2}{\\partial a^2}\\int_0^\\infty e^{-ax^2}\\,dx \\\\\n&= \\frac{\\sqrt{\\pi}}{2}\\frac{\\partial^2}{\\partial a^2}a^{-1/2} \\\\\n&= \\frac{\\sqrt{\\pi}}{2}\\cdot\\frac{3}{4}a^{-5/2} \\\\\n&= \\frac{3\\sqrt{\\pi}}{8}a^{-5/2} \\\\\n\\langle x^2 \\rangle &= \\frac{I}{\\int_0^\\infty e^{-ax^2}dx} \\\\\n&= \\frac{\\frac{\\sqrt{\\pi}}{4}a^{-3/2}}{\\frac{1}{2}\\sqrt{\\pi}a^{-1/2}} \\\\\n&= \\frac{1}{2a} \\\\\n\\langle x^4 \\rangle &= \\frac{3}{4a^2}\n\\end{aligned}"

  test('a line per row of a tall derivation is spread over its image rows, not a block between blank slabs', async () => {
    await init()
    const env = renderEnvFor(kitty26())
    const rows = measureDisplay(DERIVATION, env).rows
    const lines = displayPreviewLines(DERIVATION, env.maxColumns, rows)!
    expect(lines).toHaveLength(rows)
    const filled = lines.flatMap((line, row) => (line.endsWith(BLANK_CELL) ? [] : [row]))
    expect(filled).toHaveLength(16)
    // The longest run of blank rows is short: no slab above or below.
    const gaps = filled.map((row, k) => row - (k === 0 ? -1 : filled[k - 1]!) - 1)
    expect(Math.max(...gaps, rows - 1 - filled.at(-1)!)).toBeLessThanOrEqual(2)
  })

  test('other previews keep their shape', () => {
    const fraction = ['  a  ', '-----', '  b  ', '', '']
    expect(spreadRows(fraction, '\\frac{a}{b}')).toEqual(fraction)
    const nested = ['', '', '', 'x', 'y', 'z', '', '', '']
    expect(spreadRows(nested, '\\begin{aligned}x \\\\ \\begin{matrix}y\\end{matrix} \\\\ z\\end{aligned}')).toEqual(nested)
  })
})
