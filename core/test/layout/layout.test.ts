// The replay of Claude Code's prose layout. Every expectation below was
// measured on the live engine (Claude Code 2.1.291, research/lab runs E1c22,
// W1c80, W2c61, W2mp60, W3c43, W3c72): the engine's own drawing of the same
// markdown, row for row.

import { describe, expect, test } from 'vitest'

import { readFileSync } from 'node:fs'

import { codeWidth, layoutList, layoutProse, markerOf, proseBlocks, textWidth, visibleProse, wrapRows } from '../../src/layout/index.js'

const NB = ' '

describe('cell widths', () => {
  test('Latin, Greek, math letters and operators take one cell, combining marks none', () => {
    expect(textWidth('a é α ≤ ∑ 𝑥 ℝⁿ ⟨⟩ ₖ ⠀')).toBe(21)
    expect(textWidth('x̂')).toBe(1)
    expect(codeWidth(0xa0)).toBe(1)
  })

  test('characters whose width kittex is not sure of are unknown', () => {
    for (const char of ['中', '­', '​', '', '\t']) expect(textWidth(char)).toBe(-1)
  })
  test('single emoji (Emoji_Presentation, Unicode 15.1 or older) take two cells', () => {
    // Two cells in Claude Code 2.1.291 (Bun.stringWidth, its wrap, its cell writer), kitty 0.49 and Ghostty 1.3.
    expect(textWidth('😀🚀✅⌚⭐🀄🆎🈁🟰🫨🪿🛜🤌🧠')).toBe(28)
    expect(codeWidth(0x1f600)).toBe(2)
    expect(textWidth('a 😀 b')).toBe(6)
  })

  test('emoji the engine and the terminals may draw differently are unknown', () => {
    for (const text of [
      '\u2764', // text presentation by default (one cell)
      '\u2600',
      '\u{1f170}', // ambiguous width
      '\u2764\ufe0f', // a presentation selector after it
      '\u{1f600}\ufe0f',
      '\u2600\ufe0e',
      '\u{1f44d}\u{1f3fd}', // a skin-tone modifier
      '\u{1f3fd}',
      '\u{1f468}\u200d\u{1f469}\u200d\u{1f467}', // a zero-width joiner sequence
      '\u{1f1e7}\u{1f1f7}', // a flag
      '\u{1f1e6}', // a lone regional indicator: one cell to the engine, two to kitty and Ghostty
      '1\ufe0f\u20e3', // a keycap
      '#\u20e3', // a bare keycap: two cells to the engine, one to kitty
      '\u{1f3f4}\u{e0067}\u{e0062}\u{e0065}\u{e006e}\u{e0067}\u{e007f}', // tags
      '\u{1f600}\u0301', // a combining mark on an emoji
      '\u{1fae9}', // Unicode 16: one cell in terminals older than their Unicode 16 update
      '\u{1f6d8}', // Unicode 17
    ])
      expect(textWidth(text)).toBe(-1)
  })

  test('combining Cyrillic marks take no cell', () => {
    expect(textWidth('\u0430\u0483')).toBe(1)
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
    expect(wrapRows('a \u2764\ufe0f b', 10)).toBeNull()
    expect(wrapRows('a \u{1f44d}\u{1f3fd} b', 10)).toBeNull()
  })

  test('an emoji takes two cells: one that does not fit starts the next row', () => {
    expect(wrapRows('aaaa 😀 bb', 6)).toEqual(['aaaa ', '😀 bb'])
    expect(wrapRows('aaa 😀', 6)).toEqual(['aaa 😀'])
    // Cut per character, an emoji that would straddle the row's end goes to the next row.
    expect(wrapRows('xxxxx😀😀😀', 6)).toEqual(['xxxxx', '😀😀😀'])
    expect(wrapRows('😀😀😀😀', 6)).toEqual(['😀😀😀', '😀'])
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

/** A reply of paragraphs and lists drawn as the engine draws it: each block laid out, a blank row between. */
function replyRows(markdown: string, width: number): string[] | null {
  const rows: string[] = []
  for (const [k, block] of (proseBlocks(markdown) ?? []).entries()) {
    const text = markdown.slice(block.start, block.end)
    const layout = block.list ? layoutList(text, width) : block.paragraph ? layoutProse(text, width) : null
    if (!layout) return null
    if (k > 0) rows.push('')
    rows.push(...layout.lines)
  }
  return rows
}

describe('layoutList', () => {
  const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')

  test('draws lists row for row as the engine did live (research/lab runs LB-listedge-c120, c61, c42)', () => {
    const markdown = fixture('list-edge.md').replace(/\n$/, '')
    const screens = JSON.parse(fixture('list-edge-screens.json')) as Record<string, string[]>
    for (const [width, screen] of Object.entries(screens)) expect(replyRows(markdown, Number(width))).toEqual(screen)
  })

  test('draws paragraphs and lists holding emoji as the engine did live (research/lab runs EMO-raw-emoji1, EMO-raw-emoji3 at c120, c61, c33)', () => {
    for (const name of ['emoji-prose', 'emoji-list']) {
      const markdown = fixture(`${name}.md`).replace(/\n$/, '')
      const screens = JSON.parse(fixture(`${name}-screens.json`)) as Record<string, string[]>
      for (const [width, screen] of Object.entries(screens)) expect(replyRows(markdown, Number(width))?.map(row => row.trimEnd())).toEqual(screen)
    }
  })

  test('finds spans after emoji, two cells each', () => {
    const markdown = '- 🚀 at X and 😀😀Y'
    const x = markdown.indexOf('X')
    const y = markdown.indexOf('Y')
    expect(layoutList(markdown, 40, [{ start: x, end: x + 1 }, { start: y, end: y + 1 }])?.places).toEqual([
      { row: 0, col: 8, columns: 1 },
      { row: 0, col: 18, columns: 1 },
    ])
    expect(layoutList('- 😀 a', 40)?.lines).toEqual(['- 😀 a'])
    expect(layoutProse('😀 X', 40, [{ start: 3, end: 4 }])?.places).toEqual([{ row: 0, col: 3, columns: 1 }])
  })

  test('markers: dashes for every bullet, numbers, then letters, then roman numerals', () => {
    expect(markerOf(0, 3, 1, 5)).toBe('3.')
    expect(markerOf(1, 2, 1, 5)).toBe('b.')
    expect(markerOf(1, 27, 1, 30)).toBe('aa.')
    expect(markerOf(2, 4, 1, 5)).toBe('iv.')
    expect(markerOf(3, 4, 1, 5)).toBe('4.')
    expect(layoutList('* a\n+ b', 40)?.lines).toEqual(['- a', '- b'])
  })

  test('an item wraps in the column after its marker (a hanging indent)', () => {
    expect(layoutList('10. one two three four five six', 20)?.lines).toEqual(['10. one two three', '    four five six'])
  })

  test('a space before a number ending in . or ) joins it to the word before', () => {
    expect(layoutList('- aaaa at step 3. done', 16)?.lines).toEqual(['- aaaa at', '  step\u00a03. done'])
    expect(layoutProse('aaaa at step 3. done', 14)?.lines).toEqual(['aaaa at step ', '3. done'])
  })

  test('finds each span in the item text column, nested lists included', () => {
    const markdown = '- see X here\n  1. and Y'
    const x = markdown.indexOf('X')
    const y = markdown.indexOf('Y')
    expect(layoutList(markdown, 40, [{ start: x, end: x + 1 }, { start: y, end: y + 1 }])?.places).toEqual([
      { row: 0, col: 6, columns: 1 },
      { row: 1, col: 9, columns: 1 },
    ])
  })

  test('spans after characters outside the BMP keep their place (offsets are UTF-16 units)', () => {
    const markdown = '- Control matrix: 𝐁ₖ⠀\n- Measurement matrix: 𝐇ₖ⠀'
    const b = markdown.indexOf('𝐁')
    const h = markdown.indexOf('𝐇')
    expect(layoutList(markdown, 118, [{ start: b, end: b + 4, width: 3 }, { start: h, end: h + 4, width: 3 }])?.places).toEqual([
      { row: 0, col: 18, columns: 3 },
      { row: 1, col: 22, columns: 3 },
    ])
  })

  test('a paragraph right before the list draws above it, no blank row', () => {
    expect(layoutList('Where:\n- a\n- b', 40)?.lines).toEqual(['Where:', '- a', '- b'])
  })

  test('code blocks, quotes, tables, task items, links and too-narrow rows are not followed', () => {
    expect(layoutList('- a\n\n  ```\n  x\n  ```', 40)).toBeNull()
    expect(layoutList('- a\n  > quote', 40)).toBeNull()
    expect(layoutList('- [ ] task', 40)).toBeNull()
    expect(layoutList('- a [link](https://x.y)', 40)).toBeNull()
    expect(layoutList('- a b c', 11)).toBeNull()
    expect(layoutList('Just a paragraph.', 40)).toBeNull()
  })

  test('proseBlocks marks list blocks', () => {
    expect(proseBlocks('Intro:\n- a\n* b\n\nText.')).toEqual([
      { start: 0, end: 14, paragraph: false, list: true },
      { start: 16, end: 21, paragraph: true },
    ])
  })
})
