// Emoji sequences in the layout replay, where the terminal draws them as
// Claude Code counts them (kitty, Ghostty with grapheme-width-method=unicode):
// each emoji grapheme cluster is one character two cells wide. Widths were
// measured in Claude Code 2.1.291's own Bun.stringWidth (Bun 1.4.2), kitty 0.49
// (wcswidth) for every RGI sequence of Unicode 15.1, and the engine's drawing
// live (research/lab runs ESQ-*, a resumed session drawn by klabr).

import { describe, expect, test } from 'vitest'

import { readFileSync } from 'node:fs'

import { blockParts, charsOf, layoutHeading, layoutList, layoutProse, layoutQuote, layoutTable, textWidth, wrapRows } from '../../src/layout/index.js'
import type { LinkMode, ProseLayout, SourceSpan } from '../../src/layout/index.js'

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')

const ADMITTED = [
  '❤️', // ❤️ text by default, emoji with U+FE0F
  '⚠️',
  '✔️',
  '\u{1f6f0}️', // 🛰️
  '☀️',
  '©️', // ©️: one cell alone, two with U+FE0F
  '\u{1f600}️', // an emoji by default, U+FE0F after it all the same
  '\u{1f44d}\u{1f3fd}', // 👍🏽 a skin tone
  '☝\u{1f3fd}', // ☝🏽 on a text-default modifier base
  '\u{1f468}‍\u{1f469}‍\u{1f467}', // 👨‍👩‍👧
  '\u{1f3f3}️‍\u{1f308}', // 🏳️‍🌈
  '\u{1f468}\u{1f3fd}‍\u{1f680}', // 👨🏽‍🚀
  '\u{1f441}️‍\u{1f5e8}️', // 👁️‍🗨️
  '\u{1f468}‍⚕', // a text-default emoji joined without U+FE0F (non-RGI): its width is the first emoji's
  '\u{1f9d1}‍\u{1fa70}', // 🧑‍🩰 (Unicode 17) of older code points
  '\u{1f1e7}\u{1f1f7}', // 🇧🇷
  '1️⃣', // 1️⃣
  '#️⃣',
]

const REFUSED = [
  '\u{1f1e6}', // a lone regional indicator: one cell to the engine, two to kitty
  '\u{1f1e7}\u{1f1f7}\u{1f1e6}', // a flag and a lone one
  '#⃣', // a keycap without U+FE0F: two cells to the engine, one to kitty
  '1️', // a keycap base with U+FE0F alone: one cell to the engine, two to kitty
  '\u{1f3f4}\u{e0067}\u{e0062}\u{e0065}\u{e006e}\u{e0067}\u{e007f}', // tags (England's flag)
  '☀', // text presentation: one cell, and its width in other terminals varies
  '\u{1f170}',
  '☀︎', // U+FE0E
  '\u{1f600}︎',
  '\u{1fae9}', // Unicode 16: one cell in terminals older than their Unicode 16 update
  '\u{1fae9}️',
  '\u{1f600}́', // a combining mark on an emoji
  '❤️́',
  '❤️\u{1f3fd}', // a tone after U+FE0F: four cells to the engine, two to kitty
  '\u{1f600}\u{1f3fd}', // a tone on an emoji that takes none: four cells to the engine
  '\u{1f3fd}', // a lone tone
  '❤‍\u{1f525}', // ❤‍🔥 with no U+FE0F: one cell to kitty
  '\u{1f600}‍', // a joiner joining nothing
  '‍\u{1f600}',
  'x️', // U+FE0F on a letter
]

describe('emoji clusters (sequences on)', () => {
  test('every emoji grapheme cluster the engine and the terminal agree on takes two cells', () => {
    for (const text of ADMITTED) expect([text, textWidth(text, true)]).toEqual([text, 2])
    for (const text of ADMITTED) expect([text, charsOf(`a${text}b`, true).map(char => char.width)]).toEqual([text, [1, 2, 1]])
  })

  test('what still disagrees is unknown', () => {
    for (const text of REFUSED) expect([text, textWidth(text, true)]).toEqual([text, -1])
  })

  test('sequences off (another terminal, Ghostty legacy, ssh), every sequence is unknown and single emoji stay two cells', () => {
    for (const text of ADMITTED) expect([text, textWidth(text)]).toEqual([text, -1])
    expect(textWidth('😀 🚀')).toBe(5)
  })

  test('a combining mark joins its letter, and makes a space unknown (the engine joins them into one cell)', () => {
    expect(charsOf('xéy').map(char => [char.start, char.end, char.width])).toEqual([
      [0, 1, 1],
      [1, 3, 1],
      [3, 4, 1],
    ])
    expect(textWidth('a ́b')).toBe(-1)
    expect(wrapRows('a ́b', 10)).toBeNull()
  })

  test('a cluster is never cut: one that does not fit starts the next row', () => {
    expect(wrapRows('aaaa 🇧🇷 bb', 6, true)).toEqual(['aaaa ', '🇧🇷 bb'])
    expect(wrapRows('xxxxx👨‍👩‍👧👍🏽', 6, true)).toEqual(['xxxxx', '👨‍👩‍👧👍🏽'])
    expect(wrapRows('xxxx1️⃣❤️yy', 6, true)).toEqual(['xxxx1️⃣', '❤️yy'])
  })

  test('spans after clusters are found two cells per cluster', () => {
    const markdown = '❤️ 👨‍👩‍👧 X and 🇧🇷1️⃣Y'
    const x = markdown.indexOf('X')
    const y = markdown.indexOf('Y')
    const mode = { emojiSequences: true }
    expect(layoutProse(markdown, 40, [{ start: x, end: x + 1 }, { start: y, end: y + 1 }], mode)?.places).toEqual([
      { row: 0, col: 6, columns: 1 },
      { row: 0, col: 16, columns: 1 },
    ])
    expect(layoutProse(markdown, 40)).toBeNull()
    expect(layoutList(`- ${markdown}`, 40, [], mode)?.lines).toEqual([`- ${markdown}`])
  })
})

/** One part laid out by its replay: tables in the terminal's width, the rest in the reply column. */
function layoutPart(type: string, text: string, columns: number, spans: readonly SourceSpan[], mode: LinkMode): ProseLayout | null {
  const width = columns - 2
  switch (type) {
    case 'paragraph':
      return layoutProse(text, width, spans, mode)
    case 'list':
      return layoutList(text, width, spans, mode)
    case 'heading':
      return layoutHeading(text, width, spans, mode)
    case 'blockquote':
      return layoutQuote(text, width, spans, mode)
    case 'table':
      return layoutTable(text, columns, spans, width, mode)
    default:
      return null
  }
}

/**
 * The engine draws a cluster of three or more UTF-16 units that lands in the
 * terminal's last two columns as `…` (measured; `❤️`, two units, is drawn).
 * Nothing else on the row moves, so no image is placed otherwise.
 */
function edge(row: string, columns: number): string {
  let cell = 0
  let out = ''
  for (const char of charsOf(row, true)) {
    const text = row.slice(char.start, char.end)
    out += char.width === 2 && text.length >= 3 && cell === columns - 4 ? '…' : text
    cell += Math.max(0, char.width)
  }
  return out
}

/** A reply drawn part by part, and where each `xₖ` in it lands: [row, cell column]. */
function drawn(markdown: string, columns: number): { rows: string[]; places: [number, number][] } | null {
  const mode = { hyperlinks: true, emojiSequences: true }
  const rows: string[] = []
  const places: [number, number][] = []
  for (const part of blockParts(markdown) ?? []) {
    const text = markdown.slice(part.start, part.end)
    const spans = [...text.matchAll(/xₖ/g)].map(match => ({ start: match.index, end: match.index + 2 }))
    const layout = layoutPart(part.type, text, columns, spans, mode)
    if (!layout) return null
    if (part.gap) rows.push('')
    for (const place of layout.places) if (place) places.push([rows.length + place.row, place.col])
    rows.push(...layout.lines.map(row => edge(row, columns)))
  }
  return { rows, places }
}

/** The UTF-16 index of the first character drawn at or after cell `col`. */
function cellAt(line: string, col: number): number {
  let cells = 0
  for (const char of charsOf(line, true)) {
    if (cells >= col) return char.start
    cells += Math.max(0, char.width)
  }
  return line.length
}

describe('the replays against the engine (live screens)', () => {
  for (const name of ['emoji-seq1', 'emoji-seq2', 'emoji-seq-end']) {
    test(`${name}: paragraphs, list items, a heading, a quote and a table holding sequences next to math, row for row`, () => {
      const markdown = fixture(`${name}.md`).replace(/\n$/, '')
      const screens = JSON.parse(fixture(`${name}-screens.json`)) as Record<string, string[]>
      for (const [columns, screen] of Object.entries(screens)) {
        const result = drawn(markdown, Number(columns))
        expect([columns, result?.rows.map(row => row.trimEnd().normalize())]).toEqual([columns, screen.map(row => row.normalize())])
        for (const [row, col] of result!.places) {
          const line = screen[row]!.normalize()
          const at = cellAt(line, col)
          expect([columns, row, line.slice(at, at + 2)]).toEqual([columns, row, 'xₖ'])
        }
      }
    })
  }
})
