// The metrics of the terminal's text font, read from its file (an OpenType or
// TrueType font, or a face of a collection), so the math can be set on the
// text's own baseline and at its x-height: the vertical metrics the terminal
// lays its cells out with, the x-height, the em, the weight.

/**
 * Reads `length` bytes of the font file from `offset` (fewer at its end), or
 * undefined when it can't. The mod backs it with `$.fs.read` (the whole file,
 * up to 4 MiB) or with `od` for larger files.
 */
export type ByteReader = (offset: number, length: number) => Promise<Uint8Array | undefined>

/** A font's metrics in its own units (y up from the baseline). */
export interface FontMetrics {
  unitsPerEm: number
  /**
   * The vertical metrics FreeType (kitty) and Ghostty lay a cell out with:
   * OS/2's typo metrics when the font sets USE_TYPO_METRICS, else hhea's;
   * typo, then win, when hhea's are zero. The descender is negative.
   */
  ascender: number
  descender: number
  lineGap: number
  /** The height of a lowercase x: OS/2's sxHeight, else the top of the `x` glyph; absent when neither is known. */
  xHeight?: number
  /** OS/2's usWeightClass (400 regular, 500 medium...). */
  weight?: number
  /** The widest advance of the printable ASCII glyphs (a terminal's cell is that wide). */
  advance?: number
}

const tag = (b: Uint8Array, at: number) => String.fromCharCode(b[at]!, b[at + 1]!, b[at + 2]!, b[at + 3]!)
const u16 = (b: Uint8Array, at: number) => (b[at]! << 8) | b[at + 1]!
const i16 = (b: Uint8Array, at: number) => (u16(b, at) << 16) >> 16
const u32 = (b: Uint8Array, at: number) => ((b[at]! << 24) >>> 0) + ((b[at + 1]! << 16) | (b[at + 2]! << 8) | b[at + 3]!)

interface Table {
  offset: number
  length: number
}

/** A reader over bytes already in memory. */
export function bytesReader(bytes: Uint8Array): ByteReader {
  return async (offset, length) => (offset >= 0 && offset < bytes.length ? bytes.subarray(offset, Math.min(bytes.length, offset + length)) : undefined)
}

/**
 * The metrics of face `index` of a font file (index 0 unless the file is a
 * collection), or undefined when it isn't a font kittex can read (no head,
 * hhea or em). Reads only the table directory and the few tables it needs.
 */
export async function readFontMetrics(read: ByteReader, index = 0): Promise<FontMetrics | undefined> {
  const exact = async (offset: number, length: number) => {
    const bytes = await read(offset, length)
    return bytes && bytes.length >= length ? bytes : undefined
  }
  let start = 0
  let header = await exact(0, 12)
  if (!header) return undefined
  if (tag(header, 0) === 'ttcf') {
    const count = u32(header, 8)
    if (index < 0 || index >= count || count > 4096) return undefined
    const at = await exact(12 + 4 * index, 4)
    if (!at) return undefined
    start = u32(at, 0)
    header = await exact(start, 12)
    if (!header) return undefined
  }
  const version = u32(header, 0)
  if (version !== 0x00010000 && tag(header, 0) !== 'OTTO' && tag(header, 0) !== 'true') return undefined
  const numTables = u16(header, 4)
  if (numTables === 0 || numTables > 1024) return undefined
  const dir = await exact(start + 12, 16 * numTables)
  if (!dir) return undefined
  const tables = new Map<string, Table>()
  for (let i = 0; i < numTables; i++) tables.set(tag(dir, 16 * i), { offset: u32(dir, 16 * i + 8), length: u32(dir, 16 * i + 12) })
  const table = async (name: string, min: number, max = min) => {
    const t = tables.get(name)
    if (!t || t.length < min) return undefined
    return exact(t.offset, Math.min(t.length, max))
  }

  const head = await table('head', 54)
  const hhea = await table('hhea', 36)
  if (!head || !hhea) return undefined
  const unitsPerEm = u16(head, 18)
  if (unitsPerEm < 16 || unitsPerEm > 16384) return undefined
  const os2 = await table('OS/2', 78, 96)

  const hheaMetrics = [i16(hhea, 4), i16(hhea, 6), i16(hhea, 8)] as const
  let vertical: readonly [number, number, number] = hheaMetrics
  let xHeight: number | undefined
  let weight: number | undefined
  if (os2) {
    const typo = [i16(os2, 68), i16(os2, 70), i16(os2, 72)] as const
    const useTypo = (u16(os2, 62) & 0x80) !== 0
    if (useTypo) vertical = typo
    else if (hheaMetrics[0] === 0 && hheaMetrics[1] === 0) vertical = typo[0] !== 0 || typo[1] !== 0 ? typo : [u16(os2, 74), -u16(os2, 76), 0]
    weight = u16(os2, 4) || undefined
    if (u16(os2, 0) >= 2 && os2.length >= 88) xHeight = i16(os2, 86) || undefined
  }
  const metrics: FontMetrics = { unitsPerEm, ascender: vertical[0], descender: vertical[1], lineGap: Math.max(0, vertical[2]) }
  if (weight) metrics.weight = weight

  // The x glyph's top and the ASCII advances, through cmap, hmtx and (TrueType outlines) loca and glyf.
  const glyphs = await glyphReader(tables, exact, u16(hhea, 34), i16(head, 50))
  if (glyphs) {
    if (xHeight === undefined) xHeight = await glyphs.top(0x78)
    const advance = await glyphs.maxAdvance(0x20, 0x7e)
    if (advance) metrics.advance = advance
  }
  if (xHeight !== undefined && xHeight > 0) metrics.xHeight = xHeight
  return metrics
}

interface Glyphs {
  /** The top of a character's outline (yMax), when its glyph has TrueType outlines. */
  top(codepoint: number): Promise<number | undefined>
  /** The widest advance of the characters from..to that the font has. */
  maxAdvance(from: number, to: number): Promise<number | undefined>
}

/** cmap subtables kittex reads: format 4 (BMP) and 12 (full range) of a Unicode encoding. */
async function glyphReader(
  tables: Map<string, Table>,
  exact: (offset: number, length: number) => Promise<Uint8Array | undefined>,
  numberOfHMetrics: number,
  locFormat: number,
): Promise<Glyphs | undefined> {
  const cmapTable = tables.get('cmap')
  if (!cmapTable || cmapTable.length < 4) return undefined
  const cmapHead = await exact(cmapTable.offset, Math.min(cmapTable.length, 4 + 8 * 64))
  if (!cmapHead) return undefined
  const count = Math.min(u16(cmapHead, 2), Math.floor((cmapHead.length - 4) / 8))
  let best: { offset: number; rank: number } | undefined
  for (let i = 0; i < count; i++) {
    const platform = u16(cmapHead, 4 + 8 * i)
    const encoding = u16(cmapHead, 6 + 8 * i)
    const offset = u32(cmapHead, 8 + 8 * i)
    const rank = platform === 3 && encoding === 10 ? 4 : platform === 0 && encoding >= 4 ? 3 : platform === 3 && encoding === 1 ? 2 : platform === 0 ? 1 : 0
    if (rank > 0 && (!best || rank > best.rank)) best = { offset, rank }
  }
  if (!best || best.offset >= cmapTable.length) return undefined
  const subAt = cmapTable.offset + best.offset
  const sub = await exact(subAt, 8)
  if (!sub) return undefined
  const format = u16(sub, 0)
  const subLength = format === 12 ? u32(sub, 4) : u16(sub, 2)
  if (subLength > 1 << 20 || best.offset + subLength > cmapTable.length) return undefined
  const cmap = await exact(subAt, subLength)
  if (!cmap) return undefined
  const glyphOf = (cp: number): number => {
    if (format === 4) {
      const segs = u16(cmap, 6) / 2
      for (let s = 0; s < segs; s++) {
        const end = u16(cmap, 14 + 2 * s)
        if (cp > end) continue
        const startAt = 16 + 2 * segs + 2 * s
        const begin = u16(cmap, startAt)
        if (cp < begin) return 0
        const delta = u16(cmap, startAt + 2 * segs)
        const rangeAt = startAt + 4 * segs
        const range = u16(cmap, rangeAt)
        if (range === 0) return (cp + delta) & 0xffff
        const at = rangeAt + range + 2 * (cp - begin)
        if (at + 2 > cmap.length) return 0
        const g = u16(cmap, at)
        return g === 0 ? 0 : (g + delta) & 0xffff
      }
      return 0
    }
    if (format === 12) {
      const groups = u32(cmap, 12)
      for (let i = 0; i < groups && 16 + 12 * i + 12 <= cmap.length; i++) {
        const begin = u32(cmap, 16 + 12 * i)
        const end = u32(cmap, 20 + 12 * i)
        if (cp >= begin && cp <= end) return u32(cmap, 24 + 12 * i) + (cp - begin)
      }
    }
    return 0
  }
  const hmtx = tables.get('hmtx')
  const loca = tables.get('loca')
  const glyf = tables.get('glyf')
  return {
    async top(cp) {
      const id = glyphOf(cp)
      if (!id || !loca || !glyf) return undefined
      const long = locFormat === 1
      const entry = await exact(loca.offset + id * (long ? 4 : 2), long ? 8 : 4)
      if (!entry) return undefined
      const from = long ? u32(entry, 0) : 2 * u16(entry, 0)
      const to = long ? u32(entry, 4) : 2 * u16(entry, 2)
      if (to - from < 10 || from + 10 > glyf.length) return undefined
      const glyph = await exact(glyf.offset + from, 10)
      return glyph ? i16(glyph, 8) : undefined
    },
    async maxAdvance(from, to) {
      if (!hmtx || numberOfHMetrics === 0) return undefined
      let max = 0
      for (let cp = from; cp <= to; cp++) {
        const id = glyphOf(cp)
        if (!id) continue
        const at = Math.min(id, numberOfHMetrics - 1) * 4
        if (at + 2 > hmtx.length) continue
        const bytes = await exact(hmtx.offset + at, 2)
        if (bytes) max = Math.max(max, u16(bytes, 0))
      }
      return max || undefined
    },
  }
}

/**
 * JetBrains Mono's metrics: Ghostty's built-in font (embedded in its binary,
 * so there is no file to read), drawn when its config names no font-family
 * or one fontconfig doesn't have.
 */
export const GHOSTTY_BUILTIN_FONT: FontMetrics = { unitsPerEm: 1000, ascender: 1020, descender: -300, lineGap: 0, xHeight: 550, weight: 400, advance: 600 }

/** A font file found by fontconfig, and the family names of the face it chose. */
export interface FontFile {
  file: string
  index: number
  families: string[]
}

/**
 * The fontconfig query for a family and style, as `fc-match` reads it:
 * `-`, `:`, `,` and `\` in names are escaped with `\`.
 */
export function fontPattern(family: string, style?: string): string {
  const escape = (name: string) => name.replace(/[\\:,-]/g, c => `\\${c}`)
  return style ? `${escape(family)}:style=${escape(style)}` : escape(family)
}

/** `fc-match` printing the matched file, its face index and family names, one per line. */
export function fontFileArgv(family: string, style?: string): string[] {
  return ['fc-match', '--format=%{file}\\n%{index}\\n%{family}\\n', fontPattern(family, style)]
}

/** Reads fontFileArgv's output: undefined unless it names an absolute path. */
export function parseFontFile(stdout: string): FontFile | undefined {
  const [file, index, families] = stdout.split('\n')
  if (!file?.startsWith('/')) return undefined
  const n = Number(index)
  return { file, index: Number.isInteger(n) && n >= 0 ? n : 0, families: (families ?? '').split(',').map(f => f.trim()).filter(Boolean) }
}

/** Whether fontconfig's match is the family asked for (it falls back to another font when it has none). */
export function matchesFamily(match: FontFile, family: string): boolean {
  const want = family.trim().toLowerCase()
  return match.families.some(f => f.toLowerCase() === want)
}

/**
 * CoreText's match for a family and style, through osascript's JavaScript
 * and its Objective-C bridge (macOS, where fontconfig is seldom installed and
 * Ghostty finds its fonts with CoreText): the face of that family whose style
 * is the one asked for, else its Regular, else its first; printed as its
 * file, PostScript name and family, one per line, or nothing when CoreText
 * has no such family. The names are the script's arguments, never part of it.
 */
// ObjC['import'], not ObjC.import: the bundle check refuses anything spelled like a dynamic import().
const CORETEXT_FONT_JXA = `ObjC['import']('AppKit')
function run(argv) {
  const attrs = $.NSMutableDictionary.alloc.init
  attrs.setObjectForKey($(argv[0]), 'NSFontFamilyAttribute')
  const all = $.NSFontDescriptor.fontDescriptorWithFontAttributes(attrs).matchingFontDescriptorsWithMandatoryKeys($.NSSet.setWithObject('NSFontFamilyAttribute'))
  const faces = []
  for (let i = 0; i < all.count; i++) {
    const d = all.objectAtIndex(i)
    const url = d.objectForKey('NSCTFontFileURLAttribute')
    const name = key => { const v = d.objectForKey(key); return v.isNil() ? '' : v.js }
    if (!url.isNil()) faces.push({ file: url.path.js, style: name('NSFontFaceAttribute'), postscript: name('NSFontNameAttribute'), family: name('NSFontFamilyAttribute') })
  }
  const want = (argv[1] || 'Regular').toLowerCase()
  const face = faces.find(f => f.style.toLowerCase() === want) || faces.find(f => f.style.toLowerCase() === 'regular') || faces[0]
  return face ? [face.file, face.postscript, face.family].join('\\n') : ''
}`

/** osascript asking CoreText for the font file of a family and style (CORETEXT_FONT_JXA). */
export function coreTextFontArgv(family: string, style?: string): string[] {
  return ['osascript', '-l', 'JavaScript', '-e', CORETEXT_FONT_JXA, family, style ?? '']
}

/** A font file CoreText found, with the face's PostScript name (faceIndexOf finds its index in a collection). */
export interface CoreTextFont extends FontFile {
  postscript: string
}

/** Reads coreTextFontArgv's output: undefined unless it names an absolute path. */
export function parseCoreTextFont(stdout: string): CoreTextFont | undefined {
  const [file, postscript, family] = stdout.split('\n').map(line => line.trim())
  if (!file?.startsWith('/')) return undefined
  return { file, index: 0, families: family ? [family] : [], postscript: postscript ?? '' }
}

/**
 * The index of the face named `postscript` (its name table's ID 6) in a
 * font collection; 0 for a single font, or when no face has that name.
 */
export async function faceIndexOf(read: ByteReader, postscript: string): Promise<number> {
  const exact = async (offset: number, length: number) => {
    const bytes = await read(offset, length)
    return bytes && bytes.length >= length ? bytes : undefined
  }
  const header = await exact(0, 12)
  if (!header || tag(header, 0) !== 'ttcf') return 0
  const count = u32(header, 8)
  if (count > 64) return 0
  const offsets = await exact(12, 4 * count)
  if (!offsets) return 0
  for (let index = 0; index < count; index++) {
    const start = u32(offsets, 4 * index)
    const face = await exact(start, 12)
    if (!face) continue
    const numTables = u16(face, 4)
    if (numTables === 0 || numTables > 1024) continue
    const dir = await exact(start + 12, 16 * numTables)
    if (!dir) continue
    for (let i = 0; i < numTables; i++) {
      if (tag(dir, 16 * i) !== 'name') continue
      const name = await exact(u32(dir, 16 * i + 8), Math.min(u32(dir, 16 * i + 12), 1 << 16))
      if (name && postscriptNames(name).includes(postscript)) return index
    }
  }
  return 0
}

/** The PostScript names (ID 6) a name table holds: UTF-16BE (Unicode, Windows) and Mac Roman's ASCII. */
function postscriptNames(name: Uint8Array): string[] {
  if (name.length < 6) return []
  const count = u16(name, 2)
  const strings = u16(name, 4)
  const out: string[] = []
  for (let r = 0; r < count && 6 + 12 * r + 12 <= name.length; r++) {
    const at = 6 + 12 * r
    if (u16(name, at + 6) !== 6) continue
    const platform = u16(name, at)
    const length = u16(name, at + 8)
    const from = strings + u16(name, at + 10)
    if (from + length > name.length) continue
    const bytes = name.subarray(from, from + length)
    if (platform === 1) out.push(String.fromCharCode(...bytes))
    else {
      let text = ''
      for (let k = 0; k + 1 < bytes.length; k += 2) text += String.fromCharCode(u16(bytes, k))
      out.push(text)
    }
  }
  return out
}

/** `od` printing `length` bytes of a file from `offset` as decimal numbers: for a file too large to read whole. */
export function odArgv(path: string, offset: number, length: number): string[] {
  return ['od', '-An', '-v', '-tu1', '-j', String(offset), '-N', String(length), path]
}

/** Reads odArgv's output as bytes (undefined when it holds anything else). */
export function parseOd(stdout: string): Uint8Array | undefined {
  const words = stdout.split(/\s+/).filter(Boolean)
  const bytes = new Uint8Array(words.length)
  for (let i = 0; i < words.length; i++) {
    const v = Number(words[i])
    if (!Number.isInteger(v) || v < 0 || v > 255) return undefined
    bytes[i] = v
  }
  return bytes
}
