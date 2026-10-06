// The replay of Claude Code's headings and blockquotes. The fixture screens
// were measured on the live engine (Claude Code 2.1.291, research/lab runs
// HQ-hq1-c120/c80/c50/c37, HQ-hq2-c120/c80/c61/c44, HQ-hq3-c120/c50 and HQ-hq2-c120-mpw60,
// maxProseWidth 60): the engine's own drawing of the same markdown, row for
// row, from the reply's text column.

import { describe, expect, test } from 'vitest'

import { readFileSync } from 'node:fs'

import { layoutHeading, layoutList, layoutProse, layoutQuote, proseBlocks, visibleHeading } from '../../src/layout/index.js'

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')

/** The rows of a reply of blocks, a blank row between blocks, as the engine draws them `width` cells wide. */
function replyRows(markdown: string, width: number): string[] | null {
  const rows: string[] = []
  for (const [k, block] of (proseBlocks(markdown) ?? []).entries()) {
    const text = markdown.slice(block.start, block.end)
    const layout = block.list
      ? layoutList(text, width)
      : block.paragraph
        ? layoutProse(text, width)
        : block.heading
          ? layoutHeading(text, width)
          : block.quote
            ? layoutQuote(text, width)
            : null
    if (!layout) return null
    if (k > 0) rows.push('')
    rows.push(...layout.lines)
  }
  return rows
}

describe('live screens', () => {
  test('headings of every level, setext headings, and quotes with paragraphs, nested quotes and lists', () => {
    const markdown = fixture('headings-quotes.md').replace(/\n$/, '')
    const screens = JSON.parse(fixture('headings-quotes-screens.json')) as Record<string, string[]>
    expect(Object.keys(screens)).toHaveLength(4)
    for (const [width, screen] of Object.entries(screens)) expect(replyRows(markdown, Number(width))).toEqual(screen)
  })

  test('long words, formulas at row starts and ends, lazy lines, nested ordered lists, and maxProseWidth', () => {
    const markdown = fixture('headings-quotes-edge.md').replace(/\n$/, '')
    const screens = JSON.parse(fixture('headings-quotes-edge-screens.json')) as Record<string, string[]>
    expect(Object.keys(screens)).toHaveLength(5)
    for (const [width, screen] of Object.entries(screens)) expect(replyRows(markdown, Number(width))).toEqual(screen)
  })

  test('loose lists, ordered lists from 7, and a quote opening with a nested quote (HQ-hq3-c120, c50)', () => {
    const markdown = fixture('quote-lists.md').replace(/\n$/, '')
    const screens = JSON.parse(fixture('quote-lists-screens.json')) as Record<string, string[]>
    expect(Object.keys(screens)).toHaveLength(2)
    for (const [width, screen] of Object.entries(screens)) expect(replyRows(markdown, Number(width))).toEqual(screen)
  })
})

describe('proseBlocks', () => {
  test('marks a block that is one heading, and one that is one quote', () => {
    const md = '## Title $x$\n\n> quoted $y$\n> more\n\n## Title\nwith text under it'
    expect(proseBlocks(md)?.map(block => [md.slice(block.start, block.end), block.heading === true, block.quote === true])).toEqual([
      ['## Title $x$', true, false],
      ['> quoted $y$\n> more', false, true],
      ['## Title\nwith text under it', false, false],
    ])
  })
})

describe('layoutHeading', () => {
  test('draws the text with no marker and no closing hashes, at every level and as setext', () => {
    for (const md of ['# Title here', '###### Title here ##', 'Title here\n===', 'Title here\n---']) expect(layoutHeading(md, 40)?.lines).toEqual(['Title here'])
  })

  test('wraps as prose does', () => {
    expect(layoutHeading('## one two three four five six', 14)?.lines).toEqual(['one two three', 'four five six'])
  })

  test('finds spans in the heading text', () => {
    const md = '## The X state'
    const at = md.indexOf('X')
    expect(layoutHeading(md, 40, [{ start: at, end: at + 1 }])?.places).toEqual([{ row: 0, col: 4, columns: 1 }])
  })

  test('emphasis and code are drawn as their text', () => {
    expect(visibleHeading('### A **bold** `code` \\* x')?.text).toBe('A bold code * x')
  })

  test('anything else is not a heading block: a paragraph under it, a link, an empty heading', () => {
    for (const md of ['# Title\ntext', '# see [x](http://a)', '#', 'plain text', '- item']) expect(layoutHeading(md, 40)).toBeNull()
  })
})

describe('layoutQuote', () => {
  test('a bar in column 0 of every row, the text two cells in, wrapped two cells narrower', () => {
    expect(layoutQuote('> one two three four five', 16)?.lines).toEqual(['▎ one two three', '▎ four five'])
    expect(layoutQuote('> a\n>\n> b', 16)?.lines).toEqual(['▎ a', '▎', '▎ b'])
  })

  test('a nested quote is text with a bar per level; its long lines wrap back to the text column', () => {
    expect(layoutQuote('> a\n>\n> > one two three four\n> > > c', 16)?.lines).toEqual(['▎ a', '▎', '▎ ▎ one two', '▎ three four', '▎ ▎ ▎ c'])
  })

  test('a list in a quote is text: markers, a hang for soft-broken lines, nested items indented, no hanging wrap', () => {
    expect(layoutQuote('> - one two three four\n>   five\n>   1. six seven', 14)?.lines).toEqual([
      '▎ - one two',
      '▎ three four',
      '▎   five',
      '▎   a. six',
      '▎ seven',
    ])
  })

  test('a heading in a quote is its text and a blank row', () => {
    expect(layoutQuote('> # Head\n> text', 20)?.lines).toEqual(['▎ Head', '▎', '▎ text'])
  })

  test('finds spans with columns counted from the bar', () => {
    const md = '> - item X here\n>\n> > nested Y'
    const x = md.indexOf('X')
    const y = md.indexOf('Y')
    expect(layoutQuote(md, 40, [{ start: x, end: x + 1 }, { start: y, end: y + 1 }])?.places).toEqual([
      { row: 0, col: 2 + '- item '.length, columns: 1 },
      { row: 2, col: 2 + '▎ nested '.length, columns: 1 },
    ])
  })

  test('code blocks, tables, rules, links, tasks and items opening with a quote are not followed', () => {
    for (const md of [
      '> ```\n> code\n> ```',
      '> | a |\n> |---|\n> | b |',
      '> a\n>\n> ---',
      '> see [x](http://a)',
      '> - [ ] task',
      '> - > quoted item',
      'not a quote',
    ])
      expect(layoutQuote(md, 40)).toBeNull()
  })

  test('two spaces after a word are refused only where the line wraps', () => {
    expect(layoutQuote('> a&nbsp;&nbsp;b', 20)?.lines).toEqual(['▎ a  b'])
    expect(layoutQuote('> one&nbsp;&nbsp;two three four five', 14)).toBeNull()
  })
})
