import { drawHeading } from './heading.js'
import { drawList } from './list.js'
import type { Canvas } from './list.js'
import { visibleProse } from './prose.js'
import { drawQuote } from './quote.js'
import { codeWidth } from './width.js'
import { wrapLine } from './wrap.js'

export { blockParts, gapBetween } from './blocks.js'
export type { BlockPart } from './blocks.js'
export { visibleHeading } from './heading.js'
export { markerOf } from './list.js'
export { QUOTE_BAR, QUOTE_TEXT } from './quote.js'
export { proseBlocks, visibleProse } from './prose.js'
export type { ProseBlock, VisibleText } from './prose.js'
export { codeWidth, textWidth } from './width.js'
export { wrapLine, wrapRows } from './wrap.js'
export type { WrappedLine } from './wrap.js'

/** A span of the markdown, `[start, end)` in UTF-16 units. */
export interface SourceSpan {
  start: number
  end: number
  /**
   * The cells it takes drawn whole. Given, a span whose trailing blanks the
   * engine trims (at the end of the prose) is still placed, this wide.
   */
  width?: number
}

/** Where a span is drawn: its first cell, in rows and columns from the prose's top-left cell. */
export interface SpanPlace {
  row: number
  col: number
  /** Cells it takes, all on that row. */
  columns: number
}

/** A prose run as the engine lays it out: its rows, and where each span asked for landed. */
export interface ProseLayout {
  rows: number
  /** One per span asked for, in order; null where the span is drawn split over two rows or not as written. */
  places: (SpanPlace | null)[]
  /** The rows as text (for checks against a screen). */
  lines: string[]
}

/**
 * Lays out a run of markdown prose as the engine draws it `width` cells wide,
 * and finds where each span lands (spans should hold plain text: inside a
 * code span or rewritten by an escape they are not found). Null when the
 * prose can't be laid out exactly (see visibleProse and wrapLine).
 */
export function layoutProse(markdown: string, width: number, spans: readonly SourceSpan[] = []): ProseLayout | null {
  const visible = visibleProse(markdown)
  if (!visible) return null
  const { text, source } = visible
  // Where each markdown offset was drawn: its visible index.
  const drawnAt = new Map<number, number>()
  for (let i = 0; i < source.length; i++) if (source[i]! >= 0) drawnAt.set(source[i]!, i)
  const rowOf = new Int32Array(text.length)
  const colOf = new Int32Array(text.length)
  const lines: string[] = []
  let rows = 0
  let lineStart = 0
  for (const line of text.split('\n')) {
    const wrapped = wrapLine(line, width)
    if (!wrapped) return null
    const first = lines.length
    for (let r = 0; r < wrapped.rows; r++) lines.push('')
    for (let i = 0; i < line.length; i++) {
      rowOf[lineStart + i] = rows + wrapped.row[i]!
      colOf[lineStart + i] = wrapped.col[i]!
      const at = first + wrapped.row[i]!
      if (!wrapped.hidden[i]) lines[at] = lines[at]! + line[i]!
    }
    rows += wrapped.rows
    lineStart += line.length + 1
  }
  const places = spans.map(span => placeSpan(markdown, span, text, source, rowOf, colOf, width, i => i === text.length - 1))
  return { rows, places, lines }
}

/**
 * Lays out a block that is a list (after one paragraph or none: a block
 * proseBlocks marks `list`) as the engine draws it `width` cells wide, and
 * finds where each span lands, as layoutProse does. Null when the list holds
 * anything its replay doesn't follow (see drawList).
 */
export function layoutList(markdown: string, width: number, spans: readonly SourceSpan[] = []): ProseLayout | null {
  return layoutCanvas(markdown, drawList(markdown, width), width, spans)
}

/**
 * Lays out a block that is one heading (proseBlocks marks it `heading`) as the
 * engine draws it `width` cells wide: its text with no marker, wrapped as
 * prose. Spans are found as layoutProse finds them. Null when the heading
 * holds anything prose can't (see visibleHeading).
 */
export function layoutHeading(markdown: string, width: number, spans: readonly SourceSpan[] = []): ProseLayout | null {
  return layoutCanvas(markdown, drawHeading(markdown, width), width, spans)
}

/**
 * Lays out a block that is one blockquote (proseBlocks marks it `quote`) as
 * the engine draws it `width` cells wide (bar included): the bar in column 0
 * of every row, the text from column QUOTE_TEXT. Spans are found as
 * layoutProse finds them, columns counted from the bar's. Null when the quote
 * holds anything its replay doesn't follow (see drawQuote).
 */
export function layoutQuote(markdown: string, width: number, spans: readonly SourceSpan[] = []): ProseLayout | null {
  return layoutCanvas(markdown, drawQuote(markdown, width), width, spans)
}

function layoutCanvas(markdown: string, canvas: Canvas | null, width: number, spans: readonly SourceSpan[]): ProseLayout | null {
  if (!canvas) return null
  const text = canvas.text.join('')
  const places = spans.map(span => placeSpan(markdown, span, text, canvas.source, canvas.row, canvas.col, width, i => canvas.end[i] === true))
  return { rows: canvas.rows, places, lines: canvas.lines() }
}

/**
 * Where a span was drawn: its visible characters must be one run, all from the
 * span and none from elsewhere, on one row, within the width.
 */
function placeSpan(
  markdown: string,
  span: SourceSpan,
  text: string,
  source: readonly number[],
  rowOf: ArrayLike<number>,
  colOf: ArrayLike<number>,
  width: number,
  ends: (i: number) => boolean,
): SpanPlace | null {
  const inside = (i: number) => source[i]! >= span.start && source[i]! < span.end
  let first = -1
  let last = -1
  for (let i = 0; i < source.length; i++) {
    if (!inside(i)) continue
    if (first < 0) first = i
    last = i
  }
  if (first < 0) return null
  for (let i = first; i <= last; i++) if (!inside(i) || rowOf[i] !== rowOf[first]) return null
  let columns = 0
  for (const char of text.slice(first, last + 1)) columns += Math.max(0, codeWidth(char.codePointAt(0)!))
  if (span.width !== undefined && span.width !== columns) {
    // Only blanks the engine trimmed off the end of the prose may be missing.
    const rest = markdown.slice(source[last]! + 1, span.end)
    if (!ends(last) || span.width < columns || !/^\s*$/.test(rest)) return null
    columns = span.width
  }
  if (colOf[first]! + columns > width) return null
  return { row: rowOf[first]!, col: colOf[first]!, columns }
}
