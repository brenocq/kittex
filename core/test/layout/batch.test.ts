// The layout replays together: blocks of adjacent parts whose headings,
// quotes and tables hold links, issue references and emoji, laid out part by
// part with the link mode. The fixtures' screens are the engine's own drawing
// of fixtures/batch-parts.md and batch-parts2.md (Claude Code 2.1.291, a
// resumed session drawn by klabr at 120 and 60 columns, with OSC 8 hyperlinks
// as in kitty and with FORCE_HYPERLINK=0), row for row.

import { describe, expect, test } from 'vitest'

import { readFileSync } from 'node:fs'

import { blockParts, layoutHeading, layoutList, layoutProse, layoutQuote, layoutTable, textWidth } from '../../src/layout/index.js'
import type { LinkMode, ProseLayout, SourceSpan } from '../../src/layout/index.js'

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')

/** One part laid out by its replay: tables in the terminal's width (`columns`), the rest in the reply column. */
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

/** A reply drawn part by part, and where each `xₖ` in it lands: [row, cell column] in the whole drawing. */
function drawn(markdown: string, columns: number, mode: LinkMode): { rows: string[]; places: [number, number][] } | null {
  const rows: string[] = []
  const places: [number, number][] = []
  for (const part of blockParts(markdown) ?? []) {
    const text = markdown.slice(part.start, part.end)
    const spans = [...text.matchAll(/xₖ/g)].map(match => ({ start: match.index, end: match.index + 2 }))
    const layout = layoutPart(part.type, text, columns, spans, mode)
    if (!layout) return null
    if (part.gap) rows.push('')
    for (const place of layout.places) {
      if (!place) return null
      places.push([rows.length + place.row, place.col])
    }
    rows.push(...layout.lines)
  }
  return { rows, places }
}

describe('the replays together (live screens)', () => {
  for (const name of ['batch-parts', 'batch-parts2']) {
    test(`${name}: a heading, a quote and a table next to prose, links and emoji in each, row for row`, () => {
      const markdown = fixture(`${name}.md`).replace(/\n$/, '')
      const screens = JSON.parse(fixture(`${name}-screens.json`)) as Record<string, string[]>
      for (const [key, screen] of Object.entries(screens)) {
        const [columns, links] = key.split(' ')
        const result = drawn(markdown, Number(columns), { hyperlinks: links === 'hyperlinks' })
        expect([key, result?.rows.map(row => row.trimEnd())]).toEqual([key, screen])
        // Every span is found where the engine drew it: its row, its cell column.
        expect(result!.places.length).toBe([...markdown.matchAll(/xₖ/g)].length)
        for (const [row, col] of result!.places) {
          const line = screen[row]!
          const at = cellAt(line, col)
          expect([key, row, textWidth(line.slice(0, at)), line.slice(at, at + 2)]).toEqual([key, row, col, 'xₖ'])
        }
      }
    })
  }

  test('with no link mode known, the parts holding links are still refused', () => {
    const markdown = fixture('batch-parts.md').replace(/\n$/, '')
    const refused = (blockParts(markdown) ?? []).filter(part => {
      const text = markdown.slice(part.start, part.end)
      return layoutPart(part.type, text, 120, [], {}) === null
    })
    expect(refused.map(part => part.type)).toEqual(['heading', 'paragraph', 'blockquote', 'paragraph', 'table'])
  })
})

/** The UTF-16 index of the first character drawn at or after cell `col`. */
function cellAt(line: string, col: number): number {
  let cells = 0
  let at = 0
  for (const char of line) {
    if (cells >= col) break
    cells += Math.max(0, textWidth(char))
    at += char.length
  }
  return at
}
