/**
 * Terminal cells a character takes, as Claude Code measures it
 * (`Bun.stringWidth` with ambiguous characters narrow) and as kitty and
 * Ghostty draw it, for the characters kittex can be sure of. Everything else
 * is unknown (-1): emoji sequences and presentation selectors, wide East Asian
 * text, control and format characters, private use. A line holding an unknown
 * character can't be laid out exactly, so it keeps its Unicode math.
 */

/**
 * Zero-width combining marks (they join the character before them), assigned
 * ones only (kitty draws an unassigned code point one cell wide). U+20E3, the
 * keycap, is left out: a keycap is two cells to the engine and one to kitty.
 */
const COMBINING: readonly (readonly [number, number])[] = [
  [0x0300, 0x036f],
  [0x0483, 0x0489],
  [0x1ab0, 0x1add],
  [0x1ae0, 0x1aeb],
  [0x1dc0, 0x1dff],
  [0x20d0, 0x20e2],
  [0x20e4, 0x20f0],
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
  [0x03a3, 0x0482],
  [0x048a, 0x052f],
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

/**
 * Two-cell emoji: the code points that are emoji by default
 * (Emoji_Presentation=Yes) and were in Unicode 15.1 or earlier, standing
 * alone. Claude Code 2.1.291 (its wrap, Bun.stringWidth, and its cell writer,
 * measured live), kitty 0.49 (wcswidth) and Ghostty 1.3 (cursor reports,
 * either grapheme-width-method) all give each of them two cells, as kitty has
 * since 0.26.4 (Unicode 15.0). Left out: newer emoji (a terminal older than
 * its Unicode 16 update draws them one cell wide), regional indicators (a
 * lone one is one cell to the engine and two to both terminals) and skin-tone
 * modifiers (they join the emoji before them). Whatever joins an emoji (a
 * presentation selector, a modifier, a zero-width joiner, a keycap, tags, a
 * combining mark) is unknown, so sequences are refused: the terminals' widths
 * for them vary with version and settings (Ghostty's grapheme-width-method).
 */
const EMOJI: readonly (readonly [number, number])[] = [
  [0x231a, 0x231b],
  [0x23e9, 0x23ec],
  [0x23f0, 0x23f0],
  [0x23f3, 0x23f3],
  [0x25fd, 0x25fe],
  [0x2614, 0x2615],
  [0x2648, 0x2653],
  [0x267f, 0x267f],
  [0x2693, 0x2693],
  [0x26a1, 0x26a1],
  [0x26aa, 0x26ab],
  [0x26bd, 0x26be],
  [0x26c4, 0x26c5],
  [0x26ce, 0x26ce],
  [0x26d4, 0x26d4],
  [0x26ea, 0x26ea],
  [0x26f2, 0x26f3],
  [0x26f5, 0x26f5],
  [0x26fa, 0x26fa],
  [0x26fd, 0x26fd],
  [0x2705, 0x2705],
  [0x270a, 0x270b],
  [0x2728, 0x2728],
  [0x274c, 0x274c],
  [0x274e, 0x274e],
  [0x2753, 0x2755],
  [0x2757, 0x2757],
  [0x2795, 0x2797],
  [0x27b0, 0x27b0],
  [0x27bf, 0x27bf],
  [0x2b1b, 0x2b1c],
  [0x2b50, 0x2b50],
  [0x2b55, 0x2b55],
  [0x1f004, 0x1f004],
  [0x1f0cf, 0x1f0cf],
  [0x1f18e, 0x1f18e],
  [0x1f191, 0x1f19a],
  [0x1f201, 0x1f201],
  [0x1f21a, 0x1f21a],
  [0x1f22f, 0x1f22f],
  [0x1f232, 0x1f236],
  [0x1f238, 0x1f23a],
  [0x1f250, 0x1f251],
  [0x1f300, 0x1f320],
  [0x1f32d, 0x1f335],
  [0x1f337, 0x1f37c],
  [0x1f37e, 0x1f393],
  [0x1f3a0, 0x1f3ca],
  [0x1f3cf, 0x1f3d3],
  [0x1f3e0, 0x1f3f0],
  [0x1f3f4, 0x1f3f4],
  [0x1f3f8, 0x1f3fa],
  [0x1f400, 0x1f43e],
  [0x1f440, 0x1f440],
  [0x1f442, 0x1f4fc],
  [0x1f4ff, 0x1f53d],
  [0x1f54b, 0x1f54e],
  [0x1f550, 0x1f567],
  [0x1f57a, 0x1f57a],
  [0x1f595, 0x1f596],
  [0x1f5a4, 0x1f5a4],
  [0x1f5fb, 0x1f64f],
  [0x1f680, 0x1f6c5],
  [0x1f6cc, 0x1f6cc],
  [0x1f6d0, 0x1f6d2],
  [0x1f6d5, 0x1f6d7],
  [0x1f6dc, 0x1f6df],
  [0x1f6eb, 0x1f6ec],
  [0x1f6f4, 0x1f6fc],
  [0x1f7e0, 0x1f7eb],
  [0x1f7f0, 0x1f7f0],
  [0x1f90c, 0x1f93a],
  [0x1f93c, 0x1f945],
  [0x1f947, 0x1f9ff],
  [0x1fa70, 0x1fa7c],
  [0x1fa80, 0x1fa88],
  [0x1fa90, 0x1fabd],
  [0x1fabf, 0x1fac5],
  [0x1face, 0x1fadb],
  [0x1fae0, 0x1fae8],
  [0x1faf0, 0x1faf8],
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

/** Cells a code point takes: 0 (combining), 1, 2 (an emoji), or -1 when unknown. */
export function codeWidth(code: number): number {
  if (within(NARROW, code)) return 1
  if (within(COMBINING, code)) return 0
  if (within(EMOJI, code)) return 2
  return -1
}

/**
 * Cells a string takes, or -1 when it holds a character of unknown width or a
 * combining mark on an emoji (the cluster's width isn't certain).
 */
export function textWidth(text: string): number {
  let cells = 0
  let wide = false
  for (const char of text) {
    const width = codeWidth(char.codePointAt(0)!)
    if (width < 0 || (width === 0 && wide)) return -1
    wide = width === 2
    cells += width
  }
  return cells
}
