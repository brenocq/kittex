/**
 * Terminal cells a character takes, as Claude Code measures it
 * (`Bun.stringWidth` with ambiguous characters narrow) and as kitty and
 * Ghostty draw it, for the characters kittex can be sure of. Everything else
 * is unknown (-1): emoji and their presentation selectors, wide East Asian
 * text, control and format characters, private use. A line holding an unknown
 * character can't be laid out exactly, so it keeps its Unicode math.
 */

/** Zero-width combining marks (they join the character before them). */
const COMBINING: readonly (readonly [number, number])[] = [
  [0x0300, 0x036f],
  [0x0483, 0x0489],
  [0x1ab0, 0x1aff],
  [0x1dc0, 0x1dff],
  [0x20d0, 0x20ff],
  [0xfe20, 0xfe2f],
]

/**
 * One-cell ranges: Latin, Greek, Cyrillic, punctuation, letterlike symbols,
 * arrows, mathematical operators and alphanumerics, box drawing. Ranges that
 * hold emoji-presentation characters (misc technical, geometric shapes, misc
 * symbols) are listed in parts around them.
 */
const NARROW: readonly (readonly [number, number])[] = [
  [0x0020, 0x007e],
  [0x00a0, 0x00ac], // U+00AD (soft hyphen) is left out: its width differs between measures
  [0x00ae, 0x02ff],
  [0x0370, 0x0377],
  [0x037a, 0x037f],
  [0x0384, 0x038a],
  [0x038c, 0x038c],
  [0x038e, 0x03a1],
  [0x03a3, 0x052f],
  [0x1d00, 0x1dbf],
  [0x1e00, 0x1fff],
  [0x2010, 0x2027],
  [0x2030, 0x205e],
  [0x2070, 0x2071],
  [0x2074, 0x208e],
  [0x2090, 0x209c],
  [0x20a0, 0x20c0],
  [0x2100, 0x214f],
  [0x2150, 0x218b],
  [0x2190, 0x21ff],
  [0x2200, 0x22ff],
  [0x2300, 0x2319],
  [0x231c, 0x2328],
  [0x232b, 0x23e8],
  [0x23ed, 0x23ef],
  [0x23f1, 0x23f2],
  [0x23f4, 0x23ff],
  [0x2500, 0x25fc],
  [0x25ff, 0x25ff],
  [0x27c0, 0x27ff],
  [0x2800, 0x28ff],
  [0x2900, 0x2b0f],
  [0x2b12, 0x2b1a],
  [0x2b1d, 0x2b4f],
  [0x2b51, 0x2b54],
  [0x2b56, 0x2bff],
  [0x2c60, 0x2c7f],
  [0x1d400, 0x1d7ff],
]

function within(ranges: readonly (readonly [number, number])[], code: number): boolean {
  let lo = 0
  let hi = ranges.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const [from, to] = ranges[mid]!
    if (code < from) hi = mid - 1
    else if (code > to) lo = mid + 1
    else return true
  }
  return false
}

/** Cells a code point takes: 0 (combining), 1, or -1 when unknown. */
export function codeWidth(code: number): number {
  if (within(NARROW, code)) return 1
  if (within(COMBINING, code)) return 0
  return -1
}

/** Cells a string takes, or -1 when it holds a character of unknown width. */
export function textWidth(text: string): number {
  let cells = 0
  for (const char of text) {
    const width = codeWidth(char.codePointAt(0)!)
    if (width < 0) return -1
    cells += width
  }
  return cells
}
