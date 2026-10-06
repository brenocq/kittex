import type { Tokens } from 'marked'

import type { InlineLinks, LinkMode } from './links.js'
import { Canvas } from './list.js'
import { inline, LEADING_SPACE, linksHold, marked, unfollowable, visibleProse } from './prose.js'
import type { VisibleText } from './prose.js'
import { codeWidth, textWidth } from './width.js'
import { wrapLine } from './wrap.js'

/*
 * What Claude Code draws for a table, cell for cell (its markdown component's
 * table, 2.1.291), replayed so that inline math in a cell can be placed:
 *
 * - Every cell is drawn as its inline text (emphasis and escapes removed, code
 *   spans as their content). A column's minimum width is its widest word
 *   (split at any whitespace, no-break spaces included), its ideal width its
 *   widest cell, both at least 3 cells.
 * - The columns may take `columns - 4 - (1 + 3n)` cells (`columns`: the
 *   terminal's width, never maxProseWidth), at least 3n. Ideal widths are used
 *   when they fit; else, when the minimum widths fit, each column gets its
 *   minimum and a share of the room left in proportion to how much it wants
 *   more (rounded down); else each column is its minimum scaled to the room,
 *   rounded down, at least 3, and cells wrap hard (words cut).
 * - A cell wraps at its column's width (Bun.wrapAnsi, no trim: a word wider
 *   than the column overflows it unless wrapping is hard). Cells shorter than
 *   their row are centred in it vertically (rounded up).
 * - Lines: `┌─┬─┐` on top, the header (always centred), `├─┼─┤` under it and
 *   between every two rows, `└─┴─┘` at the bottom; each cell is drawn as
 *   `│ text │`, padded to its column as the delimiter row aligns it (left when
 *   it doesn't).
 * - When a cell takes more than 4 rows, or a line is wider than `columns - 4`,
 *   the table is drawn as a list instead: each row's cells as `Header: text`
 *   lines (whitespace collapsed to single spaces, so no-break spaces break),
 *   rows parted by a rule `─` × min(columns - 1, 40); those lines wrap again
 *   in the reply column, as prose does.
 *
 * A paragraph right before the table (no blank line between) is drawn above
 * it, a blank row apart. Anything else, a table the engine reads otherwise
 * than marked does (a `|` inside a code span, a row with more cells than the
 * header), HTML, characters of unknown width, more than 200 rows, links with
 * no link mode known, makes the table unpredictable here, and its math stays
 * Unicode. A link in a cell is drawn as in a paragraph (links.ts), and its
 * column is as wide as the drawn text: the OSC 8 escapes take no cells.
 */

/** Cells the engine keeps free beside a table (its `Se`). */
const TABLE_MARGIN = 4
/** The narrowest a column is drawn (`Re`). */
const MIN_COLUMN = 3
/** Rows a cell may take before the table is drawn as a list (`Ao`). */
const MAX_CELL_ROWS = 4
/** Rows the engine draws (`cr`); more are cut with a note, not followed here. */
const MAX_ROWS = 200
/** The longest rule between two rows of the list form. */
const RULE_MAX = 40
/** The reply column is two cells narrower than the terminal (the bullet's box). */
const REPLY_INDENT = 2

/** Drawn text: each UTF-16 unit and the markdown offset it came from (-1: none). */
interface Run {
  text: string
  source: number[]
}

const EMPTY: Run = { text: '', source: [] }

function run(text: string, source = -1): Run {
  return { text, source: Array.from({ length: text.length }, () => source) }
}

function concat(...runs: readonly Run[]): Run {
  return { text: runs.map(one => one.text).join(''), source: runs.flatMap(one => one.source) }
}

function slice(of: Run, start: number, end = of.text.length): Run {
  return { text: of.text.slice(start, end), source: of.source.slice(start, end) }
}

/** JavaScript's trim (whitespace as `\s`), keeping sources. */
function trim(of: Run): Run {
  const start = of.text.length - of.text.trimStart().length
  return slice(of, start, start + of.text.trim().length)
}

/** One row of a wrapped text: its units, each at a column of the row, and the cells it takes. */
interface Row {
  units: { unit: string; source: number; col: number }[]
  width: number
}

/**
 * A text wrapped as the engine wraps a cell (`Bun.wrapAnsi` with no trim,
 * after a trimEnd, empty rows dropped): every row as the string Bun returns,
 * a space that opens a row after a full one included and drawn. Null when a
 * width is unknown.
 */
function wrapCell(text: Run, width: number, hard: boolean): Row[] | null {
  const trimmed = slice(text, 0, text.text.trimEnd().length)
  if (trimmed.text === '') return [{ units: [], width: 0 }]
  const wrapped = wrapLine(trimmed.text, width, hard)
  if (!wrapped) return null
  const rows: Row[] = Array.from({ length: wrapped.rows }, () => ({ units: [], width: 0 }))
  const shifted = new Uint8Array(wrapped.rows)
  for (let i = 0; i < trimmed.text.length; i++) if (wrapped.hidden[i]) shifted[wrapped.row[i]!] = 1
  for (let i = 0; i < trimmed.text.length; i++) {
    const row = rows[wrapped.row[i]!]!
    const col = wrapped.hidden[i] ? 0 : wrapped.col[i]! + shifted[wrapped.row[i]!]!
    row.units.push({ unit: trimmed.text[i]!, source: trimmed.source[i]!, col })
    const code = trimmed.text.charCodeAt(i)
    if (code < 0xdc00 || code > 0xdfff) row.width += Math.max(0, codeWidth(trimmed.text.codePointAt(i)!))
  }
  const kept = rows.filter(row => row.units.length > 0)
  return kept.length > 0 ? kept : [{ units: [], width: 0 }]
}

function rowRun(row: Row): Run {
  return { text: row.units.map(one => one.unit).join(''), source: row.units.map(one => one.source) }
}

/**
 * Lays out a block that is a table (after one paragraph or none) as the
 * engine draws it in a terminal `columns` wide; the paragraph wraps at
 * `proseWidth` (maxProseWidth applies to prose, not to tables). Null when
 * anything in it isn't followed (see above).
 */
export function drawTable(markdown: string, columns: number, proseWidth = columns - REPLY_INDENT, mode: LinkMode = {}): Canvas | null {
  if (unfollowable(markdown) || !(columns >= 1) || !(proseWidth >= 1)) return null
  let tokens
  try {
    tokens = marked.lexer(markdown)
  } catch {
    return null
  }
  const links: InlineLinks = { hyperlinks: mode.hyperlinks, linked: { value: false } }
  const canvas = new Canvas(columns)
  let at = 0
  let table: Tokens.Table | undefined
  let top = 0
  for (const token of tokens) {
    if (!markdown.startsWith(token.raw, at)) return null
    if (token.type === 'paragraph' && at === 0) {
      const visible = visibleProse(token.raw, mode)
      if (!visible) return null
      const rows = drawProse(canvas, visible, proseWidth)
      if (rows === null) return null
      top = rows + 1
    } else if (token.type === 'table' && !table) {
      table = token as Tokens.Table
      if (!drawTableToken(canvas, table, markdown.slice(at, at + token.raw.length), at, top, columns, links)) return null
    } else if (token.type !== 'space' || !table) {
      return null
    }
    at += token.raw.length
  }
  return table && at === markdown.length && linksHold(markdown, links) ? canvas : null
}

/** Draws prose from row `top`, wrapped `width` wide as the engine wraps a text; the rows it took, or null. */
function drawProse(canvas: Canvas, visible: VisibleText, width: number, top = 0): number | null {
  return canvas.draw(visible, top, 0, width) ? canvas.rows - top : null
}

/** A cell of a row line as marked splits it: its text and the markdown offset of each unit. */
interface SplitCell {
  text: string
  map: number[]
}

/** marked's splitCells, keeping offsets: unescaped pipes part cells, outer empty cells go, each is trimmed and its `\|` read as `|`. */
function splitCells(line: string, base: number, count?: number): SplitCell[] {
  const segments: [number, number][] = []
  let start = 0
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== '|') continue
    let escaped = false
    for (let k = i - 1; k >= 0 && line[k] === '\\'; k--) escaped = !escaped
    if (escaped) continue
    segments.push([start, i])
    start = i + 1
  }
  segments.push([start, line.length])
  const blank = ([from, to]: [number, number]) => line.slice(from, to).trim() === ''
  if (segments.length > 0 && blank(segments[0]!)) segments.shift()
  if (segments.length > 0 && blank(segments.at(-1)!)) segments.pop()
  if (count !== undefined) {
    if (segments.length > count) segments.splice(count)
    while (segments.length < count) segments.push([line.length, line.length])
  }
  return segments.map(([from, to]) => {
    const raw = line.slice(from, to)
    const lead = raw.length - raw.trimStart().length
    const end = from + lead + raw.trim().length
    let text = ''
    const map: number[] = []
    for (let k = from + lead; k < end; k++) {
      if (line[k] === '\\' && line[k + 1] === '|' && k + 1 < end) {
        text += '|'
        map.push(base + k + 1)
        k += 1
      } else {
        text += line[k]!
        map.push(base + k)
      }
    }
    return { text, map }
  })
}

/**
 * The engine reads a table line with a `|` inside a code span otherwise (its
 * `me` escapes it first): such a line is not followed. True when the line is
 * read as marked reads it.
 */
function codePipesAlike(line: string): boolean {
  if (!line.includes('`') || !line.includes('|')) return true
  const starts: number[] = []
  const lengths: number[] = []
  for (let c = 0; c < line.length; ) {
    if (line[c] !== '`') {
      c++
      continue
    }
    let d = 0
    while (line[c + d] === '`') d++
    starts.push(c)
    lengths.push(d)
    c += d
  }
  // A run of backticks closes at the next run as long; the engine escapes the pipes between.
  const closes = new Array<number>(starts.length).fill(-1)
  const next = new Map<number, number>()
  for (let c = starts.length - 1; c >= 0; c--) {
    const found = next.get(lengths[c]!)
    if (found !== undefined) closes[c] = found
    next.set(lengths[c]!, c)
  }
  for (let p = 0; p < starts.length; ) {
    const close = closes[p]!
    if (close === -1) {
      p++
      continue
    }
    if (line.slice(starts[p]! + lengths[p]!, starts[close]!).includes('|')) return false
    p = close + 1
  }
  return true
}

/** The engine's own cell split of a row line (its `Te`), for its check that no row has more cells than the header. */
function engineCells(line: string): string[] {
  const cells = line
    .replace(/\|/g, (_match: string, offset: number, all: string) => {
      let escaped = false
      for (let p = offset - 1; p >= 0 && all[p] === '\\'; p--) escaped = !escaped
      return escaped ? '|' : ' |'
    })
    .split(/ \|/)
  if (!cells[0]?.trim()) cells.shift()
  if (cells.length > 0 && !cells.at(-1)?.trim()) cells.pop()
  return cells
}

/** Draws a table token from `top`; false when it isn't followed. */
function drawTableToken(
  canvas: Canvas,
  table: Tokens.Table,
  raw: string,
  offset: number,
  top: number,
  columns: number,
  links: InlineLinks,
): boolean {
  const lines = raw.split('\n')
  if (!lines.every(codePipesAlike)) return false
  // The engine refuses a table whose row has more cells than the header (it reads a paragraph).
  for (let n = 2; n < lines.length; n++) {
    const cells = engineCells(lines[n]!)
    for (let s = table.header.length; s < cells.length; s++) if (cells[s]!.trim()) return false
  }
  if (table.rows.length > MAX_ROWS || table.header.length === 0) return false
  const starts: number[] = []
  for (let k = 0, p = offset; k < lines.length; k++) {
    starts.push(p)
    p += lines[k]!.length + 1
  }
  const rowLines = lines.slice(2)
  while (rowLines.length > 0 && rowLines.at(-1)!.trim() === '') rowLines.pop()
  if (rowLines.length !== table.rows.length) return false

  // Every cell's drawn text, with the markdown offset of each unit.
  const cellRun = (cell: Tokens.TableCell, split: SplitCell | undefined): Run | null => {
    if (!split || split.text !== cell.text) return null
    const out: VisibleText = { text: '', source: [] }
    if (!inline(out, cell.tokens, cell.text, 0, false, links)) return null
    if (textWidth(out.text) < 0 || /^\s|\s$/.test(out.text)) return null
    return { text: out.text, source: out.source.map(k => (k < 0 ? -1 : (split.map[k] ?? -1))) }
  }
  const headerSplit = splitCells(lines[0]!, starts[0]!)
  if (headerSplit.length !== table.header.length) return false
  const header: Run[] = []
  for (const [c, cell] of table.header.entries()) {
    const drawn = cellRun(cell, headerSplit[c])
    if (!drawn) return false
    header.push(drawn)
  }
  const body: Run[][] = []
  for (const [r, row] of table.rows.entries()) {
    const split = splitCells(rowLines[r]!, starts[r + 2]!, table.header.length)
    const cells: Run[] = []
    for (const [c, cell] of row.entries()) {
      const drawn = cellRun(cell, split[c])
      if (!drawn) return false
      cells.push(drawn)
    }
    if (cells.length !== table.header.length) return false
    body.push(cells)
  }

  const count = header.length
  const all = [header, ...body]
  const widest = (text: string) => Math.max(MIN_COLUMN, ...text.split(/\s+/).filter(word => word.length > 0).map(textWidth))
  const least = header.map((_, c) => Math.max(...all.map(cells => widest(cells[c]!.text))))
  const ideal = header.map((_, c) => Math.max(...all.map(cells => Math.max(textWidth(cells[c]!.text), MIN_COLUMN))))
  const room = Math.max(columns - (1 + count * 3) - TABLE_MARGIN, count * MIN_COLUMN)
  const sumLeast = least.reduce((a, b) => a + b, 0)
  const sumIdeal = ideal.reduce((a, b) => a + b, 0)
  let hard = false
  let widths: number[]
  if (sumIdeal <= room) {
    widths = ideal
  } else if (sumLeast <= room) {
    const extra = room - sumLeast
    const wants = ideal.map((w, c) => w - least[c]!)
    const total = wants.reduce((a, b) => a + b, 0)
    widths = least.map((w, c) => (total === 0 ? w : w + Math.floor((wants[c]! / total) * extra)))
  } else {
    hard = true
    const scale = room / sumLeast
    widths = least.map(w => Math.max(Math.floor(w * scale), MIN_COLUMN))
  }

  const wrapped: Row[][][] = []
  for (const cells of all) {
    const rows: Row[][] = []
    for (const [c, cell] of cells.entries()) {
      const cellRows = wrapCell(cell, widths[c]!, hard)
      if (!cellRows) return false
      rows.push(cellRows)
    }
    wrapped.push(rows)
  }
  const tall = Math.max(1, ...wrapped.flatMap(rows => rows.map(cell => cell.length)))
  if (tall > MAX_CELL_ROWS) return drawList(canvas, header, body, top, columns)

  // The bordered form, line by line; any line wider than the room makes it a list.
  type Line = { put: [string, number][]; units: { unit: string; source: number; col: number }[]; width: number }
  const border = (left: string, joint: string, right: string): Line => {
    let text = left
    for (const [c, w] of widths.entries()) text += '─'.repeat(w + 2) + (c < count - 1 ? joint : right)
    return { put: [[text, 0]], units: [], width: textWidth(text) }
  }
  const rowOfLines = (rows: Row[][], isHeader: boolean): Line[] => {
    const height = Math.max(1, ...rows.map(cell => cell.length))
    const out: Line[] = []
    for (let g = 0; g < height; g++) {
      const line: Line = { put: [['│', 0]], units: [], width: 0 }
      let x = 1
      for (const [c, cell] of rows.entries()) {
        const k = g - Math.floor((height - cell.length) / 2)
        const content = k >= 0 && k < cell.length ? cell[k]! : { units: [], width: 0 }
        const pad = Math.max(0, widths[c]! - content.width)
        const align = isHeader ? 'center' : (table.align[c] ?? 'left')
        const left = align === 'center' ? Math.floor(pad / 2) : align === 'right' ? pad : 0
        x += 1
        for (const one of content.units) line.units.push({ ...one, col: x + left + one.col })
        x += content.width + pad + 1
        line.put.push(['│', x])
        x += 1
      }
      line.width = x
      out.push(line)
    }
    return out
  }
  const drawnLines: Line[] = [border('┌', '┬', '┐'), ...rowOfLines(wrapped[0]!, true), border('├', '┼', '┤')]
  for (const [r, rows] of wrapped.slice(1).entries()) {
    drawnLines.push(...rowOfLines(rows, false))
    if (r < body.length - 1) drawnLines.push(border('├', '┼', '┤'))
  }
  drawnLines.push(border('└', '┴', '┘'))
  if (Math.max(...drawnLines.map(line => line.width)) > columns - TABLE_MARGIN) return drawList(canvas, header, body, top, columns)
  for (const [k, line] of drawnLines.entries()) {
    canvas.grow(top + k + 1)
    for (const [text, col] of line.put) canvas.put(text, top + k, col)
    for (const one of line.units) canvas.unit(one.unit, one.source, top + k, one.col)
  }
  return true
}

/**
 * Draws the table as the engine's list form (its fallback when the table
 * doesn't fit): per row, a `Header: text` line for each cell with text,
 * continuation lines under it, rows parted by a rule; then every line wraps
 * in the reply column (`columns - 2`) as prose does.
 */
function drawList(canvas: Canvas, header: readonly Run[], body: readonly Run[][], top: number, columns: number): boolean {
  const heads = header.map(trim)
  const rule = run('─'.repeat(Math.max(0, Math.min(columns - 1, RULE_MAX))))
  const lines: Run[] = []
  for (const cells of body) {
    const rowLines: Run[] = []
    for (const [c, cell] of cells.entries()) {
      const head = heads[c] ?? EMPTY
      // Whitespace collapses to single spaces (no-break spaces included); a run of it is not followed.
      if (/\s\s/.test(cell.text)) return false
      const text = trim({ text: cell.text.replace(/\s/g, ' '), source: cell.source })
      if (head.text === '' && text.text === '') continue
      const first = head.text !== '' ? columns - textWidth(head.text) - 3 : columns - 1
      const rest = columns - 3
      const rows = wrapCell(text, Math.max(first, 10), false)
      if (!rows) return false
      let parts: Run[] = rows.map(rowRun)
      if (parts.length > 1) {
        const joined: Run[] = []
        for (const [k, part] of parts.slice(1).entries()) {
          if (k > 0) joined.push(run(' '))
          joined.push(trim(part))
        }
        const more = wrapCell(concat(...joined), rest, false)
        if (!more) return false
        parts = [parts[0]!, ...more.map(rowRun)]
      }
      rowLines.push(head.text !== '' ? concat(head, run(': '), parts[0] ?? EMPTY) : (parts[0] ?? EMPTY))
      for (const part of parts.slice(1)) if (part.text.trim() !== '') rowLines.push(part)
    }
    if (rowLines.length === 0) continue
    if (lines.length > 0) lines.push(rule)
    lines.push(...rowLines)
  }
  // Wrapped again in the reply column. A line that fits is drawn as it is, a
  // leading space included (measured); one that wraps and holds a leading or
  // a double space is not followed. A trailing space past a full row takes a
  // blank row of its own, as wrapLine counts it (measured).
  const width = columns - REPLY_INDENT
  if (width < 1) return false
  for (const line of lines) {
    if (LEADING_SPACE.test(line.text) && textWidth(line.text.trimEnd()) > width) return false
  }
  const text = lines.map(line => line.text).join('\n')
  const rows = drawProse(canvas, { text, source: lines.flatMap((line, k) => (k > 0 ? [-1, ...line.source] : line.source)) }, width, top)
  return rows !== null
}
