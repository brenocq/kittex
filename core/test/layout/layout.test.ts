// The replay of Claude Code's prose layout. Every expectation below was
// measured on the live engine (Claude Code 2.1.291, research/lab runs E1c22,
// W1c80, W2c61, W2mp60, W3c43, W3c72): the engine's own drawing of the same
// markdown, row for row.

import { describe, expect, test } from 'vitest'

import { codeWidth, layoutProse, proseBlocks, textWidth, visibleProse, wrapRows } from '../../src/layout/index.js'

const NB = ' '

describe('cell widths', () => {
  test('Latin, Greek, math letters and operators take one cell, combining marks none', () => {
    expect(textWidth('a é α ≤ ∑ 𝑥 ℝⁿ ⟨⟩ ₖ ⠀')).toBe(21)
    expect(textWidth('x̂')).toBe(1)
    expect(codeWidth(0xa0)).toBe(1)
  })

  test('characters whose width kittex is not sure of are unknown', () => {
    for (const char of ['😀', '中', '­', '​', '', '\t', '⌚']) expect(textWidth(char)).toBe(-1)
  })
})

describe('word wrap (Bun.wrapAnsi, hard, no trim)', () => {
  test('breaks at plain spaces only; the space stays at the end of the row it ends', () => {
    expect(wrapRows('hello world foo bar baz', 10)).toEqual(['hello ', 'world foo ', 'bar baz'])
  })

  test('a no-break space joins', () => {
    expect(wrapRows(`aa bb${NB}cc`, 6)).toEqual(['aa ', `bb${NB}cc`])
  })

  test('after an exactly full row the space is counted on the next row but not drawn', () => {
    expect(wrapRows(`${'a'.repeat(20)} ${'b'.repeat(20)} cc`, 20)).toEqual(['a'.repeat(20), '', 'b'.repeat(20), 'cc'])
    expect(wrapRows(`dd ${'a'.repeat(17)} ${'b'.repeat(19)} e`, 20)).toEqual([`dd ${'a'.repeat(17)}`, 'b'.repeat(19), 'e'])
    expect(wrapRows(`ff ${'a'.repeat(17)}`, 20)).toEqual([`ff ${'a'.repeat(17)}`])
  })

  test('a word wider than the row is cut per character', () => {
    expect(wrapRows(`${'x'.repeat(45)} yy`, 20)).toEqual(['x'.repeat(20), 'x'.repeat(20), 'xxxxx yy'])
    expect(wrapRows(`kk ${'y'.repeat(16)} ${'z'.repeat(40)}`, 20)).toEqual([`kk ${'y'.repeat(16)} `, 'z'.repeat(20), 'z'.repeat(20)])
    // After a full row the hidden space takes the first cell the long word could have had.
    expect(wrapRows(`${'a'.repeat(20)} ${'b'.repeat(25)} cc`, 20)).toEqual(['a'.repeat(20), 'b'.repeat(19), 'bbbbbb cc'])
  })

  test('a line holding a character of unknown width is not laid out', () => {
    expect(wrapRows('a 😀 b', 10)).toBeNull()
  })
})

describe('the visible text of prose', () => {
  test('emphasis markers, escapes and code-span backticks are not drawn', () => {
    expect(visibleProse('a **bold** and *it* `code` \\* x~~del~~')?.text).toBe('a bold and it code * xdel')
  })

  test('the engine strikes through ~~text~~ only; one tilde stays', () => {
    expect(visibleProse('a ~b~ c')?.text).toBe('a ~b~ c')
  })

  test('&nbsp; is drawn as a plain space', () => {
    expect(visibleProse('x&nbsp;y')?.text).toBe('x y')
  })

  test('a text with no markdown in it is drawn as written, escapes included', () => {
    expect(visibleProse('a \\! b')?.text).toBe('a \\! b')
    expect(visibleProse('a \\! b *c*')?.text).toBe('a ! b c')
  })

  test('soft line breaks stay; blank lines between paragraphs become one blank row', () => {
    expect(visibleProse('a\nb\n\n\nc')?.text).toBe('a\nb\n\nc')
  })

  test('links, autolinks, HTML, lists, headings, tables and code blocks are not followed', () => {
    for (const md of ['see [x](http://a)', 'see https://a.b', 'a <b>c</b>', '- item', '# head', '| a |\n|---|\n| b |', '```\nx\n```', 'acme/repo#12'])
      expect(visibleProse(md)).toBeNull()
  })

  test('a < that cannot open a tag is plain text', () => {
    expect(visibleProse('all λᵢ < 0 and x > y')?.text).toBe('all λᵢ < 0 and x > y')
    expect(visibleProse('a <b>c')).toBeNull()
  })

  test('two spaces in a row, or a line opening with one, are not followed', () => {
    expect(visibleProse('a  b')).toBeNull()
    expect(visibleProse('a\n b')).toBeNull()
  })
})

describe('layoutProse', () => {
  test('finds each span on its row and column, through emphasis and escapes', () => {
    const md = `abc 𝑥${NB}+${NB}𝑦 *it 𝑎\\*𝑏⠀* d`
    const x = md.indexOf('𝑥')
    const a = md.indexOf('𝑎')
    const layout = layoutProse(md, 8, [
      { start: x, end: x + '𝑥 + 𝑦'.length },
      { start: a, end: a + '𝑎\\*𝑏⠀'.length },
    ])
    expect(layout?.lines).toEqual(['abc ', `𝑥${NB}+${NB}𝑦 it`, '𝑎*𝑏⠀ d'])
    expect(layout?.places).toEqual([
      { row: 1, col: 0, columns: 5 },
      { row: 2, col: 0, columns: 4 },
    ])
  })

  test('a span cut over two rows has no place', () => {
    const md = `a ${'x'.repeat(12)}`
    expect(layoutProse(md, 8, [{ start: 2, end: 14 }])?.places).toEqual([null])
  })

  test('a span in a code span has no place', () => {
    expect(layoutProse('a `xy` b', 20, [{ start: 3, end: 5 }])?.places).toEqual([null])
  })

  test('a span whose trailing blanks the engine trims keeps its width', () => {
    const md = `ends with 𝑥${NB}`
    expect(layoutProse(md, 20, [{ start: 10, end: md.length, width: 2 }])?.places).toEqual([{ row: 0, col: 10, columns: 2 }])
  })

  test('a span that would reach past the row has no place', () => {
    const md = `ends 𝑥${NB}`
    expect(layoutProse(md, 6, [{ start: 5, end: md.length, width: 2 }])?.places).toEqual([null])
  })
})

describe('proseBlocks', () => {
  test('splits at blank lines and says which blocks are single paragraphs', () => {
    const md = 'para one\nstill one\n\n- a\n- b\n\npara *two*'
    const blocks = proseBlocks(md)!
    expect(blocks.map(block => [md.slice(block.start, block.end).trimEnd(), block.paragraph])).toEqual([
      ['para one\nstill one', true],
      ['- a\n- b', false],
      ['para *two*', true],
    ])
  })

  test('a paragraph and a list with no blank line between are one block', () => {
    expect(proseBlocks('intro:\n- a\n- b')?.map(block => block.paragraph)).toEqual([false])
  })

  test('a paragraph after a heading, a code block or a rule is a block of its own', () => {
    // marked takes the blank line after these into the token itself.
    for (const lead of ['## Extended Kalman filter (nonlinear models)', '```\ncode\n```', '---']) {
      const md = `${lead}\n\nFor $x$ and $y$:`
      const blocks = proseBlocks(md)!
      expect(blocks.map(block => [md.slice(block.start, block.end), block.paragraph])).toEqual([
        [lead, false],
        ['For $x$ and $y$:', true],
      ])
    }
    // With no blank line between, a heading and the text under it stay one block.
    expect(proseBlocks('## Head\nText')?.map(block => block.paragraph)).toEqual([false])
  })
})
