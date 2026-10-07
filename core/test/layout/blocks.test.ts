// How Claude Code stacks the parts of a block that no blank line splits (a
// heading, a paragraph, a list, a code block, a quote, a rule, a table right
// under one another). The fixture's screens are the engine's own drawing of
// fixtures/adjacent.md (Claude Code 2.1.291, research/lab runs AB-adj1-c120,
// c80, c50: a resumed session drawn by klabr), row for row.

import { describe, expect, test } from 'vitest'

import { readFileSync } from 'node:fs'

import { blockParts, gapBetween, layoutHeading, layoutList, layoutProse, layoutQuote, layoutTable } from '../../src/layout/index.js'
import type { BlockPart } from '../../src/layout/index.js'

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')

const shape = (markdown: string) => blockParts(markdown)?.map(part => [markdown.slice(part.start, part.end), part.type, part.gap])

/**
 * A reply drawn part by part, as kittex composes it: paragraphs, lists,
 * headings, quotes and tables by their replays (a table in the terminal's
 * width, the reply column and two cells), rules and code blocks as the engine
 * draws these short ones (`---`, the lines inside the fences), a blank row
 * above each part with a gap.
 */
function partRows(markdown: string, width: number): string[] | null {
  const rows: string[] = []
  for (const part of blockParts(markdown) ?? []) {
    const text = markdown.slice(part.start, part.end)
    const lines = drawPart(part, text, width)
    if (!lines) return null
    if (part.gap) rows.push('')
    rows.push(...lines)
  }
  return rows
}

function drawPart(part: BlockPart, text: string, width: number): string[] | null | undefined {
  switch (part.type) {
    case 'paragraph':
      return layoutProse(text, width)?.lines
    case 'list':
      return layoutList(text, width)?.lines
    case 'heading':
      return layoutHeading(text, width)?.lines
    case 'hr':
      return ['---']
    case 'code':
      return text.split('\n').slice(1, -1)
    case 'blockquote':
      return layoutQuote(text, width)?.lines
    case 'table':
      return layoutTable(text, width + 2, [], width)?.lines
    default:
      return null
  }
}

describe('blockParts', () => {
  test('a block of several parts is split at its tokens, with the engine spacing between them', () => {
    expect(shape('## Head\nText X here')).toEqual([
      ['## Head', 'heading', false],
      ['Text X here', 'paragraph', true],
    ])
    expect(shape('Text X here\n## Head')).toEqual([
      ['Text X here', 'paragraph', false],
      ['## Head', 'heading', false],
    ])
    expect(shape('Text:\n- a\n* b\n```python\nx = 1\n```\nMore')).toEqual([
      ['Text:', 'paragraph', false],
      ['- a\n* b', 'list', false],
      ['```python\nx = 1\n```', 'code', false],
      ['More', 'paragraph', false],
    ])
    expect(shape('Text\n> quote')).toEqual([
      ['Text', 'paragraph', false],
      ['> quote', 'blockquote', true],
    ])
    expect(shape('Text\n| a | b |\n|---|---|\n| 1 | 2 |')).toEqual([
      ['Text', 'paragraph', false],
      ['| a | b |\n|---|---|\n| 1 | 2 |', 'table', true],
    ])
    expect(shape('### Step\n- item\n\nPara\n***\nEnd')).toEqual([
      ['### Step', 'heading', false],
      ['- item', 'list', true],
      ['Para', 'paragraph', true],
      ['***', 'hr', false],
      ['End', 'paragraph', false],
    ])
  })

  test('blocks set apart by blank lines get a blank row above them, single ones keep proseBlocks flags', () => {
    expect(blockParts('One.\n\n- a\n- b\n\n> q')).toEqual([
      { start: 0, end: 4, paragraph: true, type: 'paragraph', gap: false, block: 0 },
      { start: 6, end: 13, paragraph: false, list: true, type: 'list', gap: true, block: 6 },
      { start: 15, end: 18, paragraph: false, quote: true, type: 'blockquote', gap: true, block: 15 },
    ])
  })

  test('a lazy line after a list item is the item text, not a paragraph of its own', () => {
    expect(shape('- a X\nmore text')).toEqual([['- a X\nmore text', 'list', false]])
  })

  test('a token whose rows are not followed goes, with the rest of its block, into the part before it', () => {
    // The part is laid out up to it (its drawing never depends on what follows), and cut out at the blank lines around the block.
    expect(shape('Text\n<div>\nhtml\n</div>')).toEqual([['Text\n<div>\nhtml\n</div>', 'paragraph', false]])
    expect(shape('## Title\nText $x$\n<div>\nhtml\n</div>\n- item')).toEqual([
      ['## Title', 'heading', false],
      ['Text $x$\n<div>\nhtml\n</div>\n- item', 'paragraph', true],
    ])
    expect(shape('> quote\n```\n```')).toEqual([['> quote\n```\n```', 'blockquote', false]])
    // A block that opens with one stays one part.
    expect(shape('<div>\nhtml\n</div>\nText')).toEqual([['<div>\nhtml\n</div>\nText', 'block', false]])
  })

  test('each part knows where its block starts', () => {
    expect(blockParts('One.\n\n## Title\nText\n- item')?.map(part => [part.start, part.block])).toEqual([
      [0, 0],
      [6, 6],
      [15, 6],
      [20, 6],
    ])
  })

  test('the gap rule: after a heading, and around a table or a quote', () => {
    expect(gapBetween('heading', 'paragraph')).toBe(true)
    expect(gapBetween('heading', 'list')).toBe(true)
    expect(gapBetween('paragraph', 'table')).toBe(true)
    expect(gapBetween('blockquote', 'list')).toBe(true)
    expect(gapBetween('paragraph', 'heading')).toBe(false)
    expect(gapBetween('list', 'heading')).toBe(false)
    expect(gapBetween('paragraph', 'code')).toBe(false)
    expect(gapBetween('code', 'paragraph')).toBe(false)
    expect(gapBetween('hr', 'paragraph')).toBe(false)
  })

  test('drawn part by part, a reply takes the rows the engine drew for it whole (AB-adj1)', () => {
    const markdown = fixture('adjacent.md').replace(/\n$/, '')
    const screens = JSON.parse(fixture('adjacent-screens.json')) as Record<string, string[]>
    for (const [width, screen] of Object.entries(screens)) {
      const rows = partRows(markdown, Number(width))!
      expect(rows).not.toBeNull()
      expect(rows.length).toBe(screen.length)
      for (const [k, row] of rows.entries()) expect([k, row.trimEnd()]).toEqual([k, screen[k]])
    }
  })
})
