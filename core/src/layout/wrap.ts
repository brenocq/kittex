import { codeWidth, textWidth } from './width.js'

/**
 * Where every character of one line lands once word-wrapped, replaying
 * wrap-ansi with `{ hard: true, trim: false }` (Claude Code's Ink wraps text
 * with `Bun.wrapAnsi`, a port of it, in that mode):
 *
 * - The line is split at plain spaces (U+0020) only: a no-break space joins.
 * - Between two words the space goes on the current row. When that row is
 *   already full, a new row starts with the space: it counts as a cell for
 *   the wrapping of that row, but the engine doesn't draw it, so the row's
 *   text starts at column 0 (measured live on Claude Code 2.1.291).
 * - A word that doesn't fit after the space starts a new row (the space stays
 *   at the end of the row before).
 * - A word wider than the row is cut into rows, per character, starting on
 *   the current row when that takes no more rows than starting on the next.
 */
export interface WrappedLine {
  /** Rows the line takes (at least 1). */
  rows: number
  /** Row of each UTF-16 unit of the line (both units of a surrogate pair alike). */
  row: Int32Array
  /** Column of each UTF-16 unit. */
  col: Int32Array
  /** 1 for a space the engine counts but doesn't draw (the first cell of a row after a full one). */
  hidden: Uint8Array
}

/**
 * Wraps one line (no newline in it) to `columns`; null when a character's
 * width is unknown. `hard: false` replays `{ hard: false }` (the engine's
 * table cells): a word wider than the row is not cut, it takes a row of its
 * own and overflows it.
 */
export function wrapLine(line: string, columns: number, hard = true): WrappedLine | null {
  if (!(columns >= 1)) return null
  const row = new Int32Array(line.length)
  const col = new Int32Array(line.length)
  const hidden = new Uint8Array(line.length)
  // Words: [start, end) in UTF-16 units, and their widths.
  const words: { start: number; end: number; width: number }[] = []
  let start = 0
  for (let i = 0; i <= line.length; i++) {
    if (i === line.length || line.charCodeAt(i) === 0x20) {
      const width = widthOf(line, start, i)
      if (width < 0) return null
      words.push({ start, end: i, width })
      start = i + 1
    }
  }
  let r = 0
  let length = 0
  /** Cells the current row's text is drawn left of where it was counted (the hidden space). */
  let shift = 0
  const newRow = () => {
    r += 1
    length = 0
    shift = 0
  }
  const place = (from: number, to: number) => {
    for (let i = from; i < to; ) {
      const code = line.codePointAt(i)!
      const units = code > 0xffff ? 2 : 1
      for (let u = 0; u < units; u++) {
        row[i + u] = r
        col[i + u] = length - shift
      }
      length += codeWidth(code)
      i += units
    }
  }
  for (const [index, word] of words.entries()) {
    if (index > 0) {
      row[word.start - 1] = r
      col[word.start - 1] = length
      if (length >= columns) {
        newRow()
        shift = 1
        row[word.start - 1] = r
        col[word.start - 1] = 0
        hidden[word.start - 1] = 1
      }
      length += 1
    }
    if (hard && word.width > columns) {
      const remaining = columns - length
      const breaksHere = 1 + Math.floor((word.width - remaining - 1) / columns)
      const breaksNext = Math.floor((word.width - 1) / columns)
      if (breaksNext < breaksHere) newRow()
      // wrapWord: a character that doesn't fit starts a row; a full row ends one unless the word ends there.
      for (let i = word.start; i < word.end; ) {
        const code = line.codePointAt(i)!
        const units = code > 0xffff ? 2 : 1
        const width = codeWidth(code)
        if (width > 0 && length > 0 && length + width > columns) newRow()
        place(i, i + units)
        i += units
        if (length === columns && i < word.end) newRow()
      }
      continue
    }
    if (length + word.width > columns && length > 0 && word.width > 0) newRow()
    place(word.start, word.end)
  }
  return { rows: r + 1, row, col, hidden }
}

function widthOf(line: string, from: number, to: number): number {
  return textWidth(line.slice(from, to))
}

/** The rows a line wraps into, as text (for checks against a terminal screen). */
export function wrapRows(line: string, columns: number): string[] | null {
  const wrapped = wrapLine(line, columns)
  if (!wrapped) return null
  const rows = Array.from({ length: wrapped.rows }, () => '')
  for (let i = 0; i < line.length; i++) {
    const at = wrapped.row[i]!
    if (!wrapped.hidden[i]) rows[at] = rows[at]! + line[i]!
  }
  return rows
}
