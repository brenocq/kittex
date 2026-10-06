// The box model: a rectangle of terminal cells with a baseline row. A cell is
// one column; it holds a character with any combining marks after it, a space,
// or '' when the character on its left is a wide (two-column) one.

export interface Box {
  /** Rows of cells, every row exactly `width` cells long. */
  rows: string[][]
  width: number
  /** Index of the row on the math baseline. */
  base: number
}

/** A formula the Unicode renderer can't express: the caller shows its source instead. */
export class Unsupported extends Error {
  override name = 'Unsupported'
}

export function fail(what: string): never {
  throw new Unsupported(what)
}

// East Asian Wide and Fullwidth ranges (Unicode 15), the characters a terminal
// draws two columns wide. Ambiguous-width characters count as one.
const WIDE: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f], [0x231a, 0x231b], [0x2329, 0x232a], [0x23e9, 0x23ec], [0x23f0, 0x23f0], [0x23f3, 0x23f3],
  [0x25fd, 0x25fe], [0x2614, 0x2615], [0x2648, 0x2653], [0x267f, 0x267f], [0x2693, 0x2693], [0x26a1, 0x26a1],
  [0x26aa, 0x26ab], [0x26bd, 0x26be], [0x26c4, 0x26c5], [0x26ce, 0x26ce], [0x26d4, 0x26d4], [0x26ea, 0x26ea],
  [0x26f2, 0x26f3], [0x26f5, 0x26f5], [0x26fa, 0x26fa], [0x26fd, 0x26fd], [0x2705, 0x2705], [0x270a, 0x270b],
  [0x2728, 0x2728], [0x274c, 0x274c], [0x274e, 0x274e], [0x2753, 0x2755], [0x2757, 0x2757], [0x2795, 0x2797],
  [0x27b0, 0x27b0], [0x27bf, 0x27bf], [0x2b1b, 0x2b1c], [0x2b50, 0x2b50], [0x2b55, 0x2b55], [0x2e80, 0x303e],
  [0x3041, 0x33ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xa000, 0xa4cf], [0xa960, 0xa97f], [0xac00, 0xd7a3],
  [0xf900, 0xfaff], [0xfe10, 0xfe19], [0xfe30, 0xfe6f], [0xff00, 0xff60], [0xffe0, 0xffe6], [0x16fe0, 0x16fe4],
  [0x17000, 0x18cff], [0x1b000, 0x1b2ff], [0x1f004, 0x1f004], [0x1f0cf, 0x1f0cf], [0x1f18e, 0x1f18e],
  [0x1f191, 0x1f19a], [0x1f200, 0x1f251], [0x1f300, 0x1f320], [0x1f32d, 0x1f335], [0x1f337, 0x1f37c],
  [0x1f37e, 0x1f393], [0x1f3a0, 0x1f3ca], [0x1f3cf, 0x1f3d3], [0x1f3e0, 0x1f3f0], [0x1f3f4, 0x1f3f4],
  [0x1f3f8, 0x1f43e], [0x1f440, 0x1f440], [0x1f442, 0x1f4fc], [0x1f4ff, 0x1f53d], [0x1f54b, 0x1f54e],
  [0x1f550, 0x1f567], [0x1f57a, 0x1f57a], [0x1f595, 0x1f596], [0x1f5a4, 0x1f5a4], [0x1f5fb, 0x1f64f],
  [0x1f680, 0x1f6c5], [0x1f6cc, 0x1f6cc], [0x1f6d0, 0x1f6d2], [0x1f6d5, 0x1f6d7], [0x1f6dc, 0x1f6df],
  [0x1f6eb, 0x1f6ec], [0x1f6f4, 0x1f6fc], [0x1f7e0, 0x1f7eb], [0x1f7f0, 0x1f7f0], [0x1f90c, 0x1f93a],
  [0x1f93c, 0x1f945], [0x1f947, 0x1f9ff], [0x1fa70, 0x1faff], [0x20000, 0x2fffd], [0x30000, 0x3fffd],
]

const ZERO_WIDTH = /^[\p{Mn}\p{Me}\p{Cf}]$/u

/** Terminal columns a code point takes: 0 for combining marks and format characters, 2 for wide ones. */
export function charWidth(cp: number): 0 | 1 | 2 {
  if (cp < 0x300) return cp < 0x20 || (cp >= 0x7f && cp < 0xa0) ? 0 : 1
  if (ZERO_WIDTH.test(String.fromCodePoint(cp)) || (cp >= 0x1160 && cp <= 0x11ff)) return 0
  if (cp < 0x1100) return 1
  let lo = 0
  let hi = WIDE.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const [start, end] = WIDE[mid]!
    if (cp < start) hi = mid - 1
    else if (cp > end) lo = mid + 1
    else return 2
  }
  return 1
}

/** Display width of a string in terminal cells. */
export function textWidth(text: string): number {
  let width = 0
  for (const ch of text) width += charWidth(ch.codePointAt(0)!)
  return width
}

/** Splits text into cells; a zero-width character joins the cell before it. */
export function toCells(text: string): string[] {
  const cells: string[] = []
  let last = -1
  for (const ch of text) {
    const width = charWidth(ch.codePointAt(0)!)
    if (width === 0) {
      if (last < 0) {
        // A mark with nothing to sit on: a format character is dropped, a combining mark gets a space.
        if (/\p{Cf}/u.test(ch)) continue
        cells.push(' ')
        last = 0
      }
      cells[last] += ch
    } else {
      last = cells.length
      cells.push(ch)
      if (width === 2) cells.push('')
    }
  }
  return cells
}

export function textBox(text: string): Box {
  const cells = toCells(text)
  return { rows: [cells], width: cells.length, base: 0 }
}

export function blank(width: number, height = 1, base = 0): Box {
  return { rows: Array.from({ length: height }, () => Array<string>(width).fill(' ')), width, base }
}

export function height(box: Box): number {
  return box.rows.length
}

/** Rows above the baseline. */
export function above(box: Box): number {
  return box.base
}

/** Rows below the baseline. */
export function below(box: Box): number {
  return box.rows.length - box.base - 1
}

/** Boxes side by side on a shared baseline. */
export function hcat(boxes: readonly Box[]): Box {
  if (boxes.length === 1) return boxes[0]!
  const up = Math.max(0, ...boxes.map(above))
  const down = Math.max(0, ...boxes.map(below))
  const rows: string[][] = Array.from({ length: up + down + 1 }, () => [])
  let width = 0
  for (const box of boxes) {
    const top = up - box.base
    for (let r = 0; r < rows.length; r++) {
      const row = box.rows[r - top]
      if (row) rows[r]!.push(...row)
      else for (let c = 0; c < box.width; c++) rows[r]!.push(' ')
    }
    width += box.width
  }
  return { rows, width, base: up }
}

export type Align = 'left' | 'center' | 'right'

/** Widens a box to `width`, placing it by `align`. */
export function widen(box: Box, width: number, align: Align): Box {
  if (box.width >= width) return box
  const extra = width - box.width
  const left = align === 'left' ? 0 : align === 'right' ? extra : Math.floor(extra / 2)
  return pad(box, left, extra - left)
}

export function pad(box: Box, left: number, right: number): Box {
  if (left === 0 && right === 0) return box
  const l = Array<string>(left).fill(' ')
  const r = Array<string>(right).fill(' ')
  return { rows: box.rows.map(row => [...l, ...row, ...r]), width: box.width + left + right, base: box.base }
}

/** Boxes stacked top to bottom, each aligned in the widest one's width; `base` is a row index of the result. */
export function vstack(boxes: readonly Box[], align: Align, base: number): Box {
  const width = Math.max(0, ...boxes.map(b => b.width))
  const rows = boxes.flatMap(b => widen(b, width, align).rows)
  return { rows, width, base }
}

/** Adds blank rows so the box spans `up` rows above and `down` below its baseline. */
export function extend(box: Box, up: number, down: number): Box {
  const addUp = Math.max(0, up - above(box))
  const addDown = Math.max(0, down - below(box))
  if (addUp === 0 && addDown === 0) return box
  const blankRow = () => Array<string>(box.width).fill(' ')
  return {
    rows: [...Array.from({ length: addUp }, blankRow), ...box.rows, ...Array.from({ length: addDown }, blankRow)],
    width: box.width,
    base: box.base + addUp,
  }
}

/** A box with the same shape and nothing in it. */
export function phantom(box: Box): Box {
  return blank(box.width, box.rows.length, box.base)
}

export function isBlank(box: Box): boolean {
  return box.rows.every(row => row.every(cell => cell === ' ' || cell === ''))
}

/** The rows as strings, every one `width` cells wide. */
export function lines(box: Box): string[] {
  return box.rows.map(row => row.join(''))
}
