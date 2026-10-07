// What a formula is written as where it gets no image and Unicode has no form
// that fits (stress report F4, F5; live QA p07-K30, p34-K30, p12, p40):
// never its TeX as prose, where markdown eats `\\` and reads `_` and `*`.

import { describe, expect } from 'claude-code/testing'

import { init, measureDisplay, previewInline, renderDisplay, renderInline } from '../hooks/core.js'
import { displayPreviewLines, inlineEnvFor, inlineFallback, MessageStream, planLanded, proseWidthFor, renderEnvFor, wrapCells } from '../hooks/math.ts'
import type { KittexEnv, PreviewRecord } from '../hooks/math.ts'
import { kittyEnv, test } from './support.ts'

const kitty26 = (columns = 100): KittexEnv => ({ ...kittyEnv(), cellHeight: 26, columns })

function streamed(markdown: string, env = kitty26()): { text: string; records: PreviewRecord[] } {
  const out = new MessageStream().push(markdown, true, { ...env, inline: true })
  return { text: out.text, records: out.records }
}

function plan(text: string, records: readonly PreviewRecord[] = [], env = kitty26()) {
  const renderEnv = renderEnvFor(env)
  const inlineEnv = inlineEnvFor(env)
  return planLanded(text, records, {
    maxColumns: renderEnv.maxColumns,
    draw: (tex, rows) => renderDisplay(tex, renderEnv, rows ?? measureDisplay(tex, renderEnv).rows),
    width: proseWidthFor(env),
    inline: { env: inlineEnv, width: proseWidthFor(env), columns: env.columns, draw: (tex, columns, place) => renderInline(tex, inlineEnv, columns, place) },
  })
}

const MATRIX = '\\mathbf{p} = \\begin{pmatrix} l_1 c_1 + l_2 c_{12} \\\\ l_1 s_1 + l_2 s_{12} \\end{pmatrix}'

describe('inline math with no image', () => {
  test('an inline environment is written on one line: rows parted by `;`, cells by `,`', async () => {
    await init()
    expect(previewInline(MATRIX, undefined, { tight: false })).toBe('𝐩 = (l₁c₁ + l₂c₁₂; l₁s₁ + l₂s₁₂)')
    const { text } = streamed(`End-effector position: $${MATRIX}$ in the base frame.\n`)
    expect(text).toBe('End-effector position: 𝐩 = (l₁c₁ + l₂c₁₂; l₁s₁ + l₂s₁₂) in the base frame.\n')
    // In a table cell too, where the engine would eat the `\\`.
    const table = streamed('| Matrix | Value |\n|---|---|\n| $A$ | $\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}$ |\n').text
    expect(table).toContain('\\[1, 2; 3, 4]')
  })

  test('a formula MathJax refuses is its source in a code span, with the note a refused display formula has', async () => {
    await init()
    const fallback = inlineFallback({ tex: '\\frac{a}{', raw: '$\\frac{a}{$', delimiter: '$' })
    expect(fallback).toMatch(/^`\\frac\{a\}\{` \(\*not rendered: .+\*\)$/)
    const { text } = streamed('So $\\frac{a}{$ is wrong.\n')
    expect(text).toBe(`So ${fallback} is wrong.\n`)
    // Read back after --resume, the same.
    expect(plan('So $\\frac{a}{$ is wrong.\n').pieces.map(piece => (piece.kind === 'prose' ? piece.text : ''))).toEqual([`So ${fallback} is wrong.\n`])
    // A backtick in the source takes a longer fence.
    expect(inlineFallback({ tex: 'a`b \\foo', raw: '$a`b \\foo$', delimiter: '$' })).toMatch(/^``a`b \\foo`` /)
  })
})

describe('display previews in a narrow window (F4)', () => {
  test('where no form fits, the one-line form wrapped at the width, never the source', async () => {
    await init()
    const tex = 'ds^2 = -\\left(1 - \\frac{2GM}{c^2 r}\\right) c^2 dt^2 + \\left(1 - \\frac{2GM}{c^2 r}\\right)^{-1} dr^2 + r^2 d\\Omega^2'
    const env = renderEnvFor(kitty26(40))
    const rows = measureDisplay(tex, env).rows
    const lines = displayPreviewLines(tex, env.maxColumns, rows)!
    expect(lines).toHaveLength(rows)
    expect(lines.join('\n')).not.toMatch(/\\\\(left|frac)/)
    expect(lines.join('\n')).toMatch(/ds²/)
  })

  test('wrapCells breaks at spaces, inside a word only where it must', () => {
    expect(wrapCells('a = b + c + d', 6)).toEqual(['a = b', '+ c +', 'd'])
    expect(wrapCells('abcdefgh ij', 4)).toEqual(['abcd', 'efgh', 'ij'])
  })
})
