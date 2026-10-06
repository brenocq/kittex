// Character tables: Unicode sub- and superscripts, the Mathematical
// Alphanumeric Symbols for mathvariant, accents as combining marks, and the
// pieces that build tall delimiters and wide braces.

/** Superscript forms; characters that already sit high (primes, †, *) map to themselves. */
export const SUPERSCRIPTS: ReadonlyMap<string, string> = pairs(
  '0⁰1¹2²3³4⁴5⁵6⁶7⁷8⁸9⁹+⁺−⁻-⁻=⁼(⁽)⁾' +
    'aᵃbᵇcᶜdᵈeᵉfᶠgᵍhʰiⁱjʲkᵏlˡmᵐnⁿoᵒpᵖrʳsˢtᵗuᵘvᵛwʷxˣyʸzᶻ' +
    'AᴬBᴮDᴰEᴱGᴳHᴴIᴵJᴶKᴷLᴸMᴹNᴺOᴼPᴾRᴿTᵀUᵁVⱽWᵂ' +
    'αᵅβᵝγᵞδᵟεᵋϵᵋθᶿιᶥφᵠϕᵠχᵡ' +
    '′′″″‴‴⁗⁗∗***††‡‡⊤ᵀ∘°°°  ',
)

/** Subscript forms. */
export const SUBSCRIPTS: ReadonlyMap<string, string> = pairs(
  '0₀1₁2₂3₃4₄5₅6₆7₇8₈9₉+₊−₋-₋=₌(₍)₎' +
    'aₐeₑhₕiᵢjⱼkₖlₗmₘnₙoₒpₚrᵣsₛtₜuᵤvᵥxₓ' +
    'βᵦγᵧρᵨφᵩϕᵩχᵪ  ',
)

function pairs(spec: string): Map<string, string> {
  const chars = [...spec]
  const map = new Map<string, string>()
  for (let i = 0; i + 1 < chars.length; i += 2) map.set(chars[i]!, chars[i + 1]!)
  // Punctuation reads fine at full size inside a script.
  for (const ch of ',.;:') map.set(ch, ch)
  return map
}

/** The text as Unicode sub/superscripts, or undefined when some character has no such form. */
export function mapScript(cells: readonly string[], table: ReadonlyMap<string, string>): string | undefined {
  let out = ''
  for (const cell of cells) {
    if (cell === '') continue
    const mapped = table.get(cell)
    if (mapped === undefined) return undefined
    out += mapped
  }
  return out
}

// ─── mathvariant ─────────────────────────────────────────────────────────────

interface Alphabet {
  latin?: number
  digits?: number
  greek?: number
  holes?: Record<string, string>
}

const SCRIPT_HOLES = { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' }
const FRAKTUR_HOLES = { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' }
const DOUBLE_HOLES = { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' }

const BOLD: Alphabet = { latin: 0x1d400, digits: 0x1d7ce, greek: 0x1d6a8 }
const SANS_BOLD: Alphabet = { latin: 0x1d5d4, digits: 0x1d7ec, greek: 0x1d756 }
const SANS: Alphabet = { latin: 0x1d5a0, digits: 0x1d7e2 }

// Italic is left out on purpose: plain letters read better in a terminal than 𝑥.
const ALPHABETS: Record<string, Alphabet> = {
  bold: BOLD,
  'bold-italic': BOLD,
  'double-struck': { latin: 0x1d538, digits: 0x1d7d8, holes: DOUBLE_HOLES },
  script: { latin: 0x1d49c, holes: SCRIPT_HOLES },
  'bold-script': { latin: 0x1d4d0 },
  fraktur: { latin: 0x1d504, holes: FRAKTUR_HOLES },
  'bold-fraktur': { latin: 0x1d56c },
  'sans-serif': SANS,
  'sans-serif-italic': SANS,
  'bold-sans-serif': SANS_BOLD,
  'sans-serif-bold-italic': SANS_BOLD,
  monospace: { latin: 0x1d670, digits: 0x1d7f6 },
}

const KNOWN_VARIANTS = new Set(['normal', 'italic', ...Object.keys(ALPHABETS)])

/** Whether mathvariant names a style this renderer knows (styled or deliberately plain). */
export function knownVariant(variant: string): boolean {
  return KNOWN_VARIANTS.has(variant) || variant.startsWith('-tex-')
}

// Position of each Greek letter in a bold Greek alphabet (capitals 0–24, ∇ 25, small 26–50, variants 51–57).
const GREEK_INDEX = new Map<number, number>()
for (let cp = 0x391; cp <= 0x3a9; cp++) if (cp !== 0x3a2) GREEK_INDEX.set(cp, cp - 0x391)
GREEK_INDEX.set(0x3f4, 17)
GREEK_INDEX.set(0x2207, 25)
for (let cp = 0x3b1; cp <= 0x3c9; cp++) GREEK_INDEX.set(cp, cp - 0x3b1 + 26)
for (const [i, cp] of [0x2202, 0x3f5, 0x3d1, 0x3f0, 0x3d5, 0x3f1, 0x3d6].entries()) GREEK_INDEX.set(cp, 51 + i)

/** One character in a mathvariant; characters the alphabet lacks stay as they are. */
export function styleChar(ch: string, variant: string): string {
  const alphabet = ALPHABETS[variant]
  if (!alphabet) return ch
  const hole = alphabet.holes?.[ch]
  if (hole) return hole
  const cp = ch.codePointAt(0)!
  if (alphabet.latin !== undefined) {
    if (cp >= 0x41 && cp <= 0x5a) return String.fromCodePoint(alphabet.latin + cp - 0x41)
    if (cp >= 0x61 && cp <= 0x7a) return String.fromCodePoint(alphabet.latin + 26 + cp - 0x61)
  }
  if (alphabet.digits !== undefined && cp >= 0x30 && cp <= 0x39) return String.fromCodePoint(alphabet.digits + cp - 0x30)
  const greek = GREEK_INDEX.get(cp)
  if (alphabet.greek !== undefined && greek !== undefined) return String.fromCodePoint(alphabet.greek + greek)
  return ch
}

export function styleText(text: string, variant: string | undefined): string {
  if (!variant || !ALPHABETS[variant]) return text
  let out = ''
  for (const ch of text) out += styleChar(ch, variant)
  return out
}

// ─── accents ─────────────────────────────────────────────────────────────────

/** An accent drawn over its base: the combining mark, and the spacing character for a row of its own. */
export interface Accent {
  mark: string
  glyph: string
  /** Drawn along the whole base (a bar), rather than once over it. */
  wide?: boolean
  /** An arrow: as a row, it spans the base. */
  arrow?: 'right' | 'left' | 'both'
}

export const OVER_ACCENTS: ReadonlyMap<string, Accent> = new Map<string, Accent>([
  ['^', { mark: '̂', glyph: '^' }],
  ['ˆ', { mark: '̂', glyph: '^' }],
  ['ˇ', { mark: '̌', glyph: 'ˇ' }],
  ['~', { mark: '̃', glyph: '~' }],
  ['˜', { mark: '̃', glyph: '~' }],
  ['¯', { mark: '̄', glyph: '_', wide: true }],
  ['ˉ', { mark: '̄', glyph: '_', wide: true }],
  ['‾', { mark: '̅', glyph: '_', wide: true }],
  ['―', { mark: '̅', glyph: '_', wide: true }],
  ['─', { mark: '̅', glyph: '_', wide: true }],
  ['_', { mark: '̅', glyph: '_', wide: true }],
  ['˙', { mark: '̇', glyph: '˙' }],
  ['¨', { mark: '̈', glyph: '¨' }],
  ['⃛', { mark: '⃛', glyph: '⋯' }],
  ['⃜', { mark: '⃜', glyph: '⋯' }],
  ['´', { mark: '́', glyph: '´' }],
  ['ˊ', { mark: '́', glyph: '´' }],
  ['`', { mark: '̀', glyph: '`' }],
  ['ˋ', { mark: '̀', glyph: '`' }],
  ['˘', { mark: '̆', glyph: '˘' }],
  ['˚', { mark: '̊', glyph: '°' }],
  ['→', { mark: '⃗', glyph: '→', arrow: 'right' }],
  ['⃗', { mark: '⃗', glyph: '→', arrow: 'right' }],
  ['←', { mark: '⃖', glyph: '←', arrow: 'left' }],
  ['↔', { mark: '⃡', glyph: '↔', arrow: 'both' }],
])

export const UNDER_ACCENTS: ReadonlyMap<string, Accent> = new Map<string, Accent>([
  ['―', { mark: '̲', glyph: '‾', wide: true }],
  ['_', { mark: '̲', glyph: '‾', wide: true }],
  ['‾', { mark: '̲', glyph: '‾', wide: true }],
  ['¯', { mark: '̲', glyph: '‾', wide: true }],
  ['─', { mark: '̲', glyph: '‾', wide: true }],
  ['~', { mark: '̰', glyph: '~' }],
  ['˜', { mark: '̰', glyph: '~' }],
  ['→', { mark: '⃯', glyph: '→', arrow: 'right' }],
  ['←', { mark: '⃮', glyph: '←', arrow: 'left' }],
  ['↔', { mark: '͍', glyph: '↔', arrow: 'both' }],
])

/** A horizontal arrow (or bar) `width` cells long. */
export function arrowRow(kind: 'right' | 'left' | 'both', width: number, double = false): string {
  const line = double ? '═' : '─'
  const [l, r] = double ? ['⇐', '⇒'] : ['←', '→']
  if (width <= 1) return kind === 'right' ? r : kind === 'left' ? l : double ? '⇔' : '↔'
  if (kind === 'right') return line.repeat(width - 1) + r
  if (kind === 'left') return l + line.repeat(width - 1)
  return l + line.repeat(Math.max(0, width - 2)) + r
}

/** Horizontally stretchy operators (\xrightarrow and friends) and how to draw them. */
export const STRETCHY_ARROWS: ReadonlyMap<string, (width: number) => string> = new Map([
  ['→', (w: number) => arrowRow('right', w)],
  ['⟶', (w: number) => arrowRow('right', w)],
  ['←', (w: number) => arrowRow('left', w)],
  ['⟵', (w: number) => arrowRow('left', w)],
  ['↔', (w: number) => arrowRow('both', w)],
  ['⟷', (w: number) => arrowRow('both', w)],
  ['⇒', (w: number) => arrowRow('right', w, true)],
  ['⟹', (w: number) => arrowRow('right', w, true)],
  ['⇐', (w: number) => arrowRow('left', w, true)],
  ['⟸', (w: number) => arrowRow('left', w, true)],
  ['⇔', (w: number) => arrowRow('both', w, true)],
  ['⟺', (w: number) => arrowRow('both', w, true)],
  ['↦', (w: number) => (w <= 1 ? '↦' : '├' + '─'.repeat(Math.max(0, w - 2)) + '→')],
  ['⟼', (w: number) => (w <= 1 ? '↦' : '├' + '─'.repeat(Math.max(0, w - 2)) + '→')],
])

/** Over- and underbraces, -brackets and -parens as a row `width` cells wide. */
export function braceRow(ch: string, width: number): string | undefined {
  const w = Math.max(1, width)
  const span = (l: string, mid: string, r: string, tip: string) => {
    if (w === 1) return tip
    if (w === 2) return l + r
    if (!mid) return l + '─'.repeat(w - 2) + r
    const left = Math.floor((w - 3) / 2)
    return l + '─'.repeat(left) + mid + '─'.repeat(w - 3 - left) + r
  }
  switch (ch) {
    case '⏞':
      return span('╭', '┴', '╮', '┴')
    case '⏟':
      return span('╰', '┬', '╯', '┬')
    case '⏜':
      return span('╭', '', '╮', '⌒')
    case '⏝':
      return span('╰', '', '╯', '‿')
    case '⎴':
      return span('┌', '', '┐', '┬')
    case '⎵':
      return span('└', '', '┘', '┴')
  }
  return undefined
}

// ─── tall delimiters ─────────────────────────────────────────────────────────

/** Characters that stretch vertically as fences. */
export const FENCES = new Set(['(', ')', '[', ']', '{', '}', '|', '‖', '∥', '⌊', '⌋', '⌈', '⌉', '⟨', '⟩', '⟦', '⟧', '/', '\\', ''])

/**
 * A delimiter `rows` tall with the baseline on row `base`: one character per
 * row, top to bottom. One row is the character itself.
 */
export function tallDelimiter(ch: string, rows: number, base: number): string[] {
  if (rows <= 1) return [ch === '∥' ? '‖' : ch]
  const column = (top: string, mid: string, bottom: string) => [top, ...Array<string>(rows - 2).fill(mid), bottom]
  switch (ch) {
    case '(':
      return column('⎛', '⎜', '⎝')
    case ')':
      return column('⎞', '⎟', '⎠')
    case '[':
      return column('⎡', '⎢', '⎣')
    case ']':
      return column('⎤', '⎥', '⎦')
    case '⌈':
      return column('⎡', '⎢', '⎢')
    case '⌉':
      return column('⎤', '⎥', '⎥')
    case '⌊':
      return column('⎢', '⎢', '⎣')
    case '⌋':
      return column('⎥', '⎥', '⎦')
    case '⟦':
      return column('╓', '║', '╙')
    case '⟧':
      return column('╖', '║', '╜')
    case '|':
      return Array<string>(rows).fill('│')
    case '‖':
    case '∥':
      return Array<string>(rows).fill('║')
    case '{':
    case '}': {
      const [top, mid, bottom, ext] = ch === '{' ? ['⎧', '⎨', '⎩', '⎪'] : ['⎫', '⎬', '⎭', '⎪']
      if (rows === 2) return ch === '{' ? ['⎰', '⎱'] : ['⎱', '⎰']
      const middle = base > 0 && base < rows - 1 ? base : Math.floor(rows / 2)
      return Array.from({ length: rows }, (_, r) => (r === 0 ? top : r === rows - 1 ? bottom : r === middle ? mid : ext))
    }
    case '⟨':
    case '⟩': {
      const [up, down] = ch === '⟨' ? ['╱', '╲'] : ['╲', '╱']
      const half = rows / 2
      return Array.from({ length: rows }, (_, r) => (r < Math.floor(half) ? up : r >= Math.ceil(half) ? down : ch))
    }
    case '/':
      return Array<string>(rows).fill('╱')
    case '\\':
      return Array<string>(rows).fill('╲')
    case '':
      return Array<string>(rows).fill('')
  }
  return Array.from({ length: rows }, (_, r) => (r === base ? ch : ' '))
}

/** A tall integral sign. */
export function tallIntegral(rows: number): string[] {
  if (rows <= 1) return ['∫']
  return ['⌠', ...Array<string>(rows - 2).fill('⎮'), '⌡']
}

/** Unicode's vulgar fractions, for numeric inline fractions. */
export const VULGAR: ReadonlyMap<string, string> = new Map([
  ['1/2', '½'], ['1/3', '⅓'], ['2/3', '⅔'], ['1/4', '¼'], ['3/4', '¾'], ['1/5', '⅕'], ['2/5', '⅖'],
  ['3/5', '⅗'], ['4/5', '⅘'], ['1/6', '⅙'], ['5/6', '⅚'], ['1/7', '⅐'], ['1/8', '⅛'], ['3/8', '⅜'],
  ['5/8', '⅝'], ['7/8', '⅞'], ['1/9', '⅑'], ['1/10', '⅒'],
])
