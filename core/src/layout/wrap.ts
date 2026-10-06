import { charsOf } from './width.js'
import type { Char } from './width.js'

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
  /** Row of each UTF-16 unit of the line (every unit of a character alike). */
  row: Int32Array
  /** Column of each UTF-16 unit. */
  col: Int32Array
  /** 1 for a space the engine counts but doesn't draw (the first cell of a row after a full one). */
  hidden: Uint8Array
  /** Cells the character starting at each UTF-16 unit takes; -1 for a unit inside a character (see charAt). */
  cells: Int8Array
}

/**
 * Wraps one line (no newline in it) to `columns`; null when a character's
 * width is unknown. `hard: false` replays `{ hard: false }` (the engine's
 * table cells): a word wider than the row is not cut, it takes a row of its
 * own and overflows it. `sequences`: emoji sequences are characters (charAt).
 */
export function wrapLine(line: string, columns: number, hard = true, sequences = false): WrappedLine | null {
  if (!(columns >= 1)) return null
  const row = new Int32Array(line.length)
  const col = new Int32Array(line.length)
  const hidden = new Uint8Array(line.length)
  const cells = new Int8Array(line.length).fill(-1)
  const chars = charsOf(line, sequences)
  // Words: chars [first, last), split at plain spaces, and their widths.
  const words: { first: number; last: number; width: number }[] = []
  let first = 0
  let width = 0
  for (let k = 0; k <= chars.length; k++) {
    const char = chars[k]
    if (char === undefined || (char.end - char.start === 1 && line.charCodeAt(char.start) === 0x20)) {
      words.push({ first, last: k, width })
      first = k + 1
      width = 0
    } else if (char.width < 0) {
      return null
    } else {
      width += char.width
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
  const place = (char: Char) => {
    for (let i = char.start; i < char.end; i++) {
      row[i] = r
      col[i] = length - shift
    }
    cells[char.start] = char.width
    length += char.width
  }
  for (const [index, word] of words.entries()) {
    if (index > 0) {
      const space = chars[word.first - 1]!.start
      row[space] = r
      col[space] = length
      cells[space] = 1
      if (length >= columns) {
        newRow()
        shift = 1
        row[space] = r
        col[space] = 0
        hidden[space] = 1
      }
      length += 1
    }
    if (hard && word.width > columns) {
      const remaining = columns - length
      const breaksHere = 1 + Math.floor((word.width - remaining - 1) / columns)
      const breaksNext = Math.floor((word.width - 1) / columns)
      if (breaksNext < breaksHere) newRow()
      // wrapWord: a character that doesn't fit starts a row; a full row ends one unless the word ends there.
      for (let k = word.first; k < word.last; k++) {
        const char = chars[k]!
        if (char.width > 0 && length > 0 && length + char.width > columns) newRow()
        place(char)
        if (length === columns && k + 1 < word.last) newRow()
      }
      continue
    }
    if (length + word.width > columns && length > 0 && word.width > 0) newRow()
    for (let k = word.first; k < word.last; k++) place(chars[k]!)
  }
  return { rows: r + 1, row, col, hidden, cells }
}

/** The rows a line wraps into, as text (for checks against a terminal screen). */
export function wrapRows(line: string, columns: number, sequences = false): string[] | null {
  const wrapped = wrapLine(line, columns, true, sequences)
  if (!wrapped) return null
  const rows = Array.from({ length: wrapped.rows }, () => '')
  for (let i = 0; i < line.length; i++) {
    const at = wrapped.row[i]!
    if (!wrapped.hidden[i]) rows[at] = rows[at]! + line[i]!
  }
  return rows
}
