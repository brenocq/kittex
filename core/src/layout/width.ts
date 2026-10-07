/**
 * Terminal cells a character takes, as Claude Code measures it
 * (`Bun.stringWidth` with ambiguous characters narrow) and as kitty and
 * Ghostty draw it, for the characters kittex can be sure of. Everything else
 * is unknown (-1): wide East Asian text, control and format characters,
 * private use, and the emoji sequences the terminal may draw otherwise. A line
 * holding an unknown character can't be laid out exactly, so it keeps its
 * Unicode math.
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
 * symbols, dingbats) are listed in parts around them.
 *
 * The control pictures, enclosed alphanumerics (①, ⒜, Ⓐ), and the misc
 * symbols and dingbats in text presentation (✓ ✔ ✗ ★ ☐ ☑ ♥ ⚠ ❤ ➜, standing
 * alone: U+FE0F after one makes it an emoji, read by charAt) are those that
 * Claude Code 2.1.291 (Bun.stringWidth, ambiguous narrow), kitty 0.49
 * (wcswidth) and Ghostty (one cell unless East Asian wide or emoji by default,
 * ambiguous narrow) all draw one cell wide, alone and between letters. Left
 * out where they disagree or may: the trigrams and the monograms and digrams
 * (☰ ⚊, wide since Unicode 16) and the skin-tone bases ☝ ⛹ ✌ ✍ (two cells to
 * kitty).
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
  [0x2400, 0x2429],
  [0x2440, 0x244a],
  [0x2460, 0x25fc],
  [0x25ff, 0x25ff],
  [0x2600, 0x2613],
  [0x2616, 0x261c],
  [0x261e, 0x262f],
  [0x2638, 0x2647],
  [0x2654, 0x267e],
  [0x2680, 0x2689],
  [0x2690, 0x2692],
  [0x2694, 0x26a0],
  [0x26a2, 0x26a9],
  [0x26ac, 0x26bc],
  [0x26bf, 0x26c3],
  [0x26c6, 0x26cd],
  [0x26cf, 0x26d3],
  [0x26d5, 0x26e9],
  [0x26eb, 0x26f1],
  [0x26f4, 0x26f4],
  [0x26f6, 0x26f8],
  [0x26fb, 0x26fc],
  [0x26fe, 0x2704],
  [0x2706, 0x2709],
  [0x270e, 0x2727],
  [0x2729, 0x274b],
  [0x274d, 0x274d],
  [0x274f, 0x2752],
  [0x2756, 0x2756],
  [0x2758, 0x2794],
  [0x2798, 0x27af],
  [0x27b1, 0x27be],
  [0x27c0, 0x27ff],
  [0x2800, 0x28ff],
  [0x2900, 0x2b1a],
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
 * modifiers (they join the emoji before them). Sequences are read by charAt.
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

/**
 * Code points that are emoji with U+FE0F after them and text without it
 * (emoji-variation-sequences, Unicode 15.1), the keycap bases `#*0-9` left
 * out: `1️` is one cell to the engine and two to kitty.
 */
const TEXT_EMOJI: readonly (readonly [number, number])[] = [
  [0xa9, 0xa9], [0xae, 0xae], [0x203c, 0x203c], [0x2049, 0x2049], [0x2122, 0x2122], [0x2139, 0x2139],
  [0x2194, 0x2199], [0x21a9, 0x21aa], [0x2328, 0x2328], [0x23cf, 0x23cf], [0x23ed, 0x23ef], [0x23f1, 0x23f2],
  [0x23f8, 0x23fa], [0x24c2, 0x24c2], [0x25aa, 0x25ab], [0x25b6, 0x25b6], [0x25c0, 0x25c0], [0x25fb, 0x25fc],
  [0x2600, 0x2604], [0x260e, 0x260e], [0x2611, 0x2611], [0x2618, 0x2618], [0x261d, 0x261d], [0x2620, 0x2620],
  [0x2622, 0x2623], [0x2626, 0x2626], [0x262a, 0x262a], [0x262e, 0x262f], [0x2638, 0x263a], [0x2640, 0x2640],
  [0x2642, 0x2642], [0x265f, 0x2660], [0x2663, 0x2663], [0x2665, 0x2666], [0x2668, 0x2668], [0x267b, 0x267b],
  [0x267e, 0x267e], [0x2692, 0x2692], [0x2694, 0x2697], [0x2699, 0x2699], [0x269b, 0x269c], [0x26a0, 0x26a0],
  [0x26a7, 0x26a7], [0x26b0, 0x26b1], [0x26c8, 0x26c8], [0x26cf, 0x26cf], [0x26d1, 0x26d1], [0x26d3, 0x26d3],
  [0x26e9, 0x26e9], [0x26f0, 0x26f1], [0x26f4, 0x26f4], [0x26f7, 0x26f9], [0x2702, 0x2702], [0x2708, 0x2709],
  [0x270c, 0x270d], [0x270f, 0x270f], [0x2712, 0x2712], [0x2714, 0x2714], [0x2716, 0x2716], [0x271d, 0x271d],
  [0x2721, 0x2721], [0x2733, 0x2734], [0x2744, 0x2744], [0x2747, 0x2747], [0x2763, 0x2764], [0x27a1, 0x27a1],
  [0x2934, 0x2935], [0x2b05, 0x2b07], [0x3030, 0x3030], [0x303d, 0x303d], [0x3297, 0x3297], [0x3299, 0x3299],
  [0x1f170, 0x1f171], [0x1f17e, 0x1f17f], [0x1f202, 0x1f202], [0x1f237, 0x1f237], [0x1f321, 0x1f321], [0x1f324, 0x1f32c],
  [0x1f336, 0x1f336], [0x1f37d, 0x1f37d], [0x1f396, 0x1f397], [0x1f399, 0x1f39b], [0x1f39e, 0x1f39f], [0x1f3cb, 0x1f3ce],
  [0x1f3d4, 0x1f3df], [0x1f3f3, 0x1f3f3], [0x1f3f5, 0x1f3f5], [0x1f3f7, 0x1f3f7], [0x1f43f, 0x1f43f], [0x1f441, 0x1f441],
  [0x1f4fd, 0x1f4fd], [0x1f549, 0x1f54a], [0x1f56f, 0x1f570], [0x1f573, 0x1f579], [0x1f587, 0x1f587], [0x1f58a, 0x1f58d],
  [0x1f590, 0x1f590], [0x1f5a5, 0x1f5a5], [0x1f5a8, 0x1f5a8], [0x1f5b1, 0x1f5b2], [0x1f5bc, 0x1f5bc], [0x1f5c2, 0x1f5c4],
  [0x1f5d1, 0x1f5d3], [0x1f5dc, 0x1f5de], [0x1f5e1, 0x1f5e1], [0x1f5e3, 0x1f5e3], [0x1f5e8, 0x1f5e8], [0x1f5ef, 0x1f5ef],
  [0x1f5f3, 0x1f5f3], [0x1f5fa, 0x1f5fa], [0x1f6cb, 0x1f6cb], [0x1f6cd, 0x1f6cf], [0x1f6e0, 0x1f6e5], [0x1f6e9, 0x1f6e9],
  [0x1f6f0, 0x1f6f0], [0x1f6f3, 0x1f6f3],
]

/** Emoji a skin-tone modifier may follow (Emoji_Modifier_Base, Unicode 15.1). */
const MODIFIER_BASE: readonly (readonly [number, number])[] = [
  [0x261d, 0x261d], [0x26f9, 0x26f9], [0x270a, 0x270d], [0x1f385, 0x1f385], [0x1f3c2, 0x1f3c4], [0x1f3c7, 0x1f3c7],
  [0x1f3ca, 0x1f3cc], [0x1f442, 0x1f443], [0x1f446, 0x1f450], [0x1f466, 0x1f478], [0x1f47c, 0x1f47c], [0x1f481, 0x1f483],
  [0x1f485, 0x1f487], [0x1f48f, 0x1f48f], [0x1f491, 0x1f491], [0x1f4aa, 0x1f4aa], [0x1f574, 0x1f575], [0x1f57a, 0x1f57a],
  [0x1f590, 0x1f590], [0x1f595, 0x1f596], [0x1f645, 0x1f647], [0x1f64b, 0x1f64f], [0x1f6a3, 0x1f6a3], [0x1f6b4, 0x1f6b6],
  [0x1f6c0, 0x1f6c0], [0x1f6cc, 0x1f6cc], [0x1f90c, 0x1f90c], [0x1f90f, 0x1f90f], [0x1f918, 0x1f91f], [0x1f926, 0x1f926],
  [0x1f930, 0x1f939], [0x1f93c, 0x1f93e], [0x1f977, 0x1f977], [0x1f9b5, 0x1f9b6], [0x1f9b8, 0x1f9b9], [0x1f9bb, 0x1f9bb],
  [0x1f9cd, 0x1f9cf], [0x1f9d1, 0x1f9dd], [0x1fac3, 0x1fac5], [0x1faf0, 0x1faf8],
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

const VS16 = 0xfe0f
const ZWJ = 0x200d
const KEYCAP = 0x20e3
const isTone = (code: number) => code >= 0x1f3fb && code <= 0x1f3ff
const isRegional = (code: number) => code >= 0x1f1e6 && code <= 0x1f1ff
const isKeycapBase = (code: number) => code === 0x23 || code === 0x2a || (code >= 0x30 && code <= 0x39)
const unitsOf = (code: number) => (code > 0xffff ? 2 : 1)

/** One character of a text: the UTF-16 units `[start, end)` and the cells it takes (-1: unknown). */
export interface Char {
  start: number
  end: number
  width: number
}

/**
 * The character at `at`: a code point and the combining marks after it, or,
 * with `sequences` (a terminal that draws them as the engine counts them),
 * one emoji grapheme cluster, two cells wide. The engine wraps each such
 * multi-code-point cluster as one two-cell stand-in (its wrap swaps it for
 * U+2FA1D before Bun.wrapAnsi), so it never breaks across rows. A cluster is
 * an emoji followed by U+FE0F or a skin-tone modifier, zero-width joiners
 * chaining such emoji, a pair of regional indicators (a flag), or a keycap
 * with U+FE0F (`1️⃣`). Unknown: a lone regional indicator or modifier, a
 * keycap without U+FE0F (one cell to kitty), tags (subdivision flags), U+FE0E,
 * emoji newer than Unicode 15.1, a combining mark on an emoji or on a space
 * (the engine joins it to the space, which then breaks no line). The engine
 * draws a cluster of three UTF-16 units or more that lands in the terminal's
 * last two columns as `…` (measured): nothing on the row moves, so laid-out
 * rows keep the cluster.
 */
export function charAt(text: string, at: number, sequences = false): Char {
  const code = text.codePointAt(at)!
  let end = at + unitsOf(code)
  let width = codeWidth(code)
  if (sequences) {
    const cluster = emojiEnd(text, at)
    if (cluster > end) {
      end = cluster
      width = 2
    }
  }
  while (end < text.length && within(COMBINING, text.charCodeAt(end))) {
    if (width === 2 || code === 0x20) width = -1
    end += 1
  }
  return { start: at, end, width }
}

/** Where the emoji sequence at `at` ends (at `at` when there is none). */
function emojiEnd(text: string, at: number): number {
  const code = text.codePointAt(at)!
  const next = at + unitsOf(code)
  if (isRegional(code)) return isRegional(text.codePointAt(next) ?? 0) ? next + 2 : at
  if (isKeycapBase(code)) return text.charCodeAt(next) === VS16 && text.charCodeAt(next + 1) === KEYCAP ? next + 2 : at
  let end = emojiElement(text, at, true)
  while (end > at && text.charCodeAt(end) === ZWJ) {
    const joined = emojiElement(text, end + 1, false)
    if (joined < 0) break
    end = joined
  }
  return Math.max(at, end)
}

/**
 * Where the emoji at `at` ends, with its U+FE0F or skin tone, or -1 when there
 * is none. The first of a sequence is drawn as an emoji (by default or with
 * U+FE0F), and sets its width; a joined one may be a text-default emoji.
 */
function emojiElement(text: string, at: number, first: boolean): number {
  const code = text.codePointAt(at)
  if (code === undefined) return -1
  const end = at + unitsOf(code)
  const pictured = within(EMOJI, code)
  if (!pictured && !within(TEXT_EMOJI, code)) return -1
  const next = text.codePointAt(end) ?? 0
  if (next === VS16) return end + 1
  if (isTone(next) && within(MODIFIER_BASE, code)) return end + 2
  return pictured || !first ? end : -1
}

/** The characters of a text, in order (see charAt). */
export function charsOf(text: string, sequences = false): Char[] {
  const chars: Char[] = []
  for (let at = 0; at < text.length; ) {
    const char = charAt(text, at, sequences)
    chars.push(char)
    at = char.end
  }
  return chars
}

/** Cells a string takes, or -1 when it holds a character of unknown width (see charAt). */
export function textWidth(text: string, sequences = false): number {
  let cells = 0
  for (const char of charsOf(text, sequences)) {
    if (char.width < 0) return -1
    cells += char.width
  }
  return cells
}
