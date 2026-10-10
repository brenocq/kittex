import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  bytesReader,
  coreTextFontArgv,
  faceIndexOf,
  fontFileArgv,
  fontPattern,
  GHOSTTY_BUILTIN_FONT,
  matchesFamily,
  odArgv,
  parseFontFile,
  parseCoreTextFont,
  parseOd,
  readFontMetrics,
} from '../../src/terminal/index.js'

const fixture = JSON.parse(readFileSync(new URL('fixtures/font-layouts.json', import.meta.url), 'utf8')) as {
  fonts: Record<string, { file: string; unitsPerEm: number; ascender: number; descender: number; lineGap: number; xHeight?: number; weight?: number; advance?: number }>
}

// ─── a small font, built table by table ─────────────────────────────────────

const be16 = (v: number) => [(v >> 8) & 0xff, v & 0xff]
const be32 = (v: number) => [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]

interface Synthetic {
  upm?: number
  hhea?: [number, number, number]
  typo?: [number, number, number]
  win?: [number, number]
  useTypo?: boolean
  /** OS/2 version (sxHeight from 2 on); undefined: no OS/2 table. */
  os2Version?: number
  xHeight?: number
  weight?: number
  /** The `x` glyph's top, in its glyf header. */
  xTop?: number
  advance?: number
  /** A name table with this PostScript name (name ID 6), as Windows (UTF-16BE) or Mac (Roman) writes it. */
  postscript?: string
  postscriptMac?: boolean
}

/** A TrueType font holding head, hhea, OS/2, cmap (format 4: space, x, ~), hmtx, loca and glyf. */
function synthetic(o: Synthetic): Uint8Array {
  const upm = o.upm ?? 1000
  const tables: [string, number[]][] = []
  const head = new Array(54).fill(0)
  head.splice(18, 2, ...be16(upm))
  head.splice(50, 2, ...be16(0)) // short loca
  tables.push(['head', head])
  const hhea = new Array(36).fill(0)
  const [ha, hd, hg] = o.hhea ?? [800, -200, 0]
  hhea.splice(4, 6, ...be16(ha & 0xffff), ...be16(hd & 0xffff), ...be16(hg & 0xffff))
  hhea.splice(34, 2, ...be16(3)) // numberOfHMetrics
  tables.push(['hhea', hhea])
  if (o.os2Version !== undefined) {
    const os2 = new Array(96).fill(0)
    os2.splice(0, 2, ...be16(o.os2Version))
    os2.splice(4, 2, ...be16(o.weight ?? 400))
    os2.splice(62, 2, ...be16(o.useTypo ? 0x80 : 0))
    const [ta, td, tg] = o.typo ?? [0, 0, 0]
    os2.splice(68, 6, ...be16(ta & 0xffff), ...be16(td & 0xffff), ...be16(tg & 0xffff))
    const [wa, wd] = o.win ?? [0, 0]
    os2.splice(74, 4, ...be16(wa), ...be16(wd))
    os2.splice(86, 2, ...be16(o.xHeight ?? 0))
    tables.push(['OS/2', os2])
  }
  // cmap: one format 4 subtable (3, 1) mapping U+0020 -> 1, U+0078 -> 2, U+007E -> 1, and the 0xFFFF end segment.
  const segs = [
    [0x20, 0x20, 1 - 0x20],
    [0x78, 0x78, 2 - 0x78],
    [0x7e, 0x7e, 1 - 0x7e],
    [0xffff, 0xffff, 1],
  ]
  const sub = [
    ...be16(4),
    ...be16(16 + 8 * segs.length),
    ...be16(0),
    ...be16(2 * segs.length),
    ...be16(0),
    ...be16(0),
    ...be16(0),
    ...segs.flatMap(s => be16(s[1]!)),
    ...be16(0),
    ...segs.flatMap(s => be16(s[0]!)),
    ...segs.flatMap(s => be16(s[2]! & 0xffff)),
    ...segs.flatMap(() => be16(0)),
  ]
  tables.push(['cmap', [...be16(0), ...be16(1), ...be16(3), ...be16(1), ...be32(12), ...sub]])
  const advance = o.advance ?? 600
  tables.push(['hmtx', [...be16(advance), ...be16(0), ...be16(advance), ...be16(0), ...be16(advance - 100), ...be16(0)]])
  // glyph 0 and 1 empty, glyph 2 (x): a 10-byte header.
  const glyf = [...be16(1), ...be16(0), ...be16(0), ...be16(500), ...be16(o.xTop ?? 500), 0, 0]
  tables.push(['loca', [...be16(0), ...be16(0), ...be16(0), ...be16(6)]])
  tables.push(['glyf', glyf])
  if (o.postscript !== undefined) {
    const text = o.postscriptMac ? [...o.postscript].map(c => c.charCodeAt(0)) : [...o.postscript].flatMap(c => be16(c.charCodeAt(0)))
    const family = [...'Family'].flatMap(c => be16(c.charCodeAt(0)))
    const [platform, encoding, language] = o.postscriptMac ? [1, 0, 0] : [3, 1, 0x409]
    // Two records: the family (ID 1, Windows), then the PostScript name (ID 6).
    tables.push(['name', [...be16(0), ...be16(2), ...be16(6 + 24), ...be16(3), ...be16(1), ...be16(0x409), ...be16(1), ...be16(family.length), ...be16(0),
      ...be16(platform), ...be16(encoding), ...be16(language), ...be16(6), ...be16(text.length), ...be16(family.length), ...family, ...text]])
  }
  const header = [...be32(0x00010000), ...be16(tables.length), 0, 0, 0, 0, 0, 0]
  let offset = 12 + 16 * tables.length
  const dir: number[] = []
  const body: number[] = []
  for (const [tag, data] of tables) {
    while (data.length % 4) data.push(0)
    dir.push(...[...tag].map(c => c.charCodeAt(0)), 0, 0, 0, 0, ...be32(offset), ...be32(data.length))
    body.push(...data)
    offset += data.length
  }
  return Uint8Array.from([...header, ...dir, ...body])
}

describe('readFontMetrics', () => {
  test('hhea metrics, OS/2 sxHeight and weight, the widest ASCII advance', async () => {
    const font = synthetic({ hhea: [900, -250, 50], typo: [700, -300, 0], os2Version: 4, xHeight: 520, weight: 500, advance: 600 })
    expect(await readFontMetrics(bytesReader(font))).toEqual({ unitsPerEm: 1000, ascender: 900, descender: -250, lineGap: 50, xHeight: 520, weight: 500, advance: 600 })
  })

  test('typo metrics when the font sets USE_TYPO_METRICS (bit 7 of fsSelection)', async () => {
    const font = synthetic({ hhea: [965, -215, 70], typo: [965, -285, 0], useTypo: true, os2Version: 4, xHeight: 520 })
    expect(await readFontMetrics(bytesReader(font))).toMatchObject({ ascender: 965, descender: -285, lineGap: 0 })
  })

  test('typo, then win metrics when hhea has none', async () => {
    expect(await readFontMetrics(bytesReader(synthetic({ hhea: [0, 0, 0], typo: [750, -250, 100], os2Version: 4 })))).toMatchObject({ ascender: 750, descender: -250, lineGap: 100 })
    expect(await readFontMetrics(bytesReader(synthetic({ hhea: [0, 0, 0], win: [900, 300], os2Version: 4 })))).toMatchObject({ ascender: 900, descender: -300, lineGap: 0 })
  })

  test("the x glyph's top when OS/2 has no sxHeight (version 1, as DejaVu Sans Mono)", async () => {
    expect(await readFontMetrics(bytesReader(synthetic({ os2Version: 1, xTop: 547 })))).toMatchObject({ xHeight: 547 })
    expect(await readFontMetrics(bytesReader(synthetic({ xTop: 480 })))).toMatchObject({ xHeight: 480, advance: 600 })
  })

  test('a face of a collection', async () => {
    const face = synthetic({ hhea: [880, -120, 0], os2Version: 4, xHeight: 500 })
    const shifted = 12 + 8
    const relocated = face.slice()
    // Table offsets are from the start of the file: move each by the collection header.
    const numTables = (face[4]! << 8) | face[5]!
    for (let i = 0; i < numTables; i++) {
      const at = 12 + 16 * i + 8
      const v = ((face[at]! << 24) >>> 0) + ((face[at + 1]! << 16) | (face[at + 2]! << 8) | face[at + 3]!) + shifted
      relocated.set(be32(v), at)
    }
    const ttc = Uint8Array.from([...[...'ttcf'].map(c => c.charCodeAt(0)), ...be32(0x00010000), ...be32(2), ...be32(shifted), ...be32(shifted), ...relocated])
    expect(await readFontMetrics(bytesReader(ttc), 1)).toMatchObject({ ascender: 880, descender: -120, xHeight: 500 })
    expect(await readFontMetrics(bytesReader(ttc), 2)).toBeUndefined()
  })

  test('anything else is no font', async () => {
    expect(await readFontMetrics(bytesReader(new TextEncoder().encode('not a font at all, just text')))).toBeUndefined()
    expect(await readFontMetrics(bytesReader(new Uint8Array(0)))).toBeUndefined()
    expect(await readFontMetrics(bytesReader(synthetic({}).slice(0, 40)))).toBeUndefined()
    expect(await readFontMetrics(async () => undefined)).toBeUndefined()
  })

  test('reads only what it needs, in pieces (as through od)', async () => {
    const font = synthetic({ hhea: [900, -250, 50], os2Version: 4, xHeight: 520 })
    const asked: number[] = []
    const reader = async (offset: number, length: number) => {
      asked.push(length)
      return font.subarray(offset, offset + length)
    }
    expect(await readFontMetrics(reader)).toMatchObject({ ascender: 900, xHeight: 520 })
    expect(Math.max(...asked)).toBeLessThan(200)
  })

  // The fixture's metrics were read from the font files with this parser and match fontTools; when the
  // files are on this machine, they still read the same.
  const files: Record<string, string> = {
    'RobotoMono-Regular.ttf': '/usr/share/fonts/TTF/RobotoMono-Regular.ttf',
    'DejaVuSansMono.ttf': '/usr/share/fonts/TTF/DejaVuSansMono.ttf',
    'LiberationMono-Regular.ttf': '/usr/share/fonts/liberation/LiberationMono-Regular.ttf',
    'SourceCodePro-Regular.otf': '/usr/share/fonts/adobe-source-code-pro/SourceCodePro-Regular.otf',
  }
  for (const [name, metrics] of Object.entries(fixture.fonts)) {
    const path = files[metrics.file]
    test.skipIf(!path || !existsSync(path))(`${name} on this machine`, async () => {
      const { file: _, ...expected } = metrics
      expect(await readFontMetrics(bytesReader(new Uint8Array(readFileSync(path!))))).toEqual(expected)
    })
  }

  test("Ghostty's built-in JetBrains Mono is JetBrains Mono", () => {
    const { file: _, ...jetbrains } = fixture.fonts['JetBrains Mono']!
    expect(GHOSTTY_BUILTIN_FONT).toEqual(jetbrains)
  })
})

/** A collection of `faces` (each a whole font), table offsets moved to where each face lands. */
function collection(faces: Uint8Array[]): Uint8Array {
  const head = 12 + 4 * faces.length
  const starts: number[] = []
  let at = head
  for (const face of faces) {
    starts.push(at)
    at += face.length
  }
  const moved = faces.map((face, k) => {
    const out = face.slice()
    const numTables = (face[4]! << 8) | face[5]!
    for (let i = 0; i < numTables; i++) {
      const p = 12 + 16 * i + 8
      const v = ((face[p]! << 24) >>> 0) + ((face[p + 1]! << 16) | (face[p + 2]! << 8) | face[p + 3]!) + starts[k]!
      out.set(be32(v), p)
    }
    return [...out]
  })
  return Uint8Array.from([...[...'ttcf'].map(c => c.charCodeAt(0)), ...be32(0x00010000), ...be32(faces.length), ...starts.flatMap(be32), ...moved.flat()])
}

describe('finding the file on macOS (CoreText, without fontconfig)', () => {
  test('osascript asks CoreText for the family and style: a fixed script, the names as its arguments', () => {
    const argv = coreTextFontArgv('Menlo', 'Bold')
    expect(argv.slice(0, 4)).toEqual(['osascript', '-l', 'JavaScript', '-e'])
    expect(argv.slice(5)).toEqual(['Menlo', 'Bold'])
    expect(argv[4]).not.toContain('Menlo')
    expect(coreTextFontArgv('Menlo').slice(5)).toEqual(['Menlo', ''])
  })

  test('parses the match: the file, its PostScript name and family', () => {
    expect(parseCoreTextFont('/System/Library/Fonts/Menlo.ttc\nMenlo-Bold\nMenlo\n')).toEqual({ file: '/System/Library/Fonts/Menlo.ttc', index: 0, families: ['Menlo'], postscript: 'Menlo-Bold' })
    expect(parseCoreTextFont('\n')).toBeUndefined()
    expect(parseCoreTextFont('')).toBeUndefined()
    expect(parseCoreTextFont('Menlo.ttc\nMenlo-Bold\nMenlo\n')).toBeUndefined()
  })

  test("a collection's face by its PostScript name (Windows or Mac names); 0 when none or not a collection", async () => {
    const ttc = collection([synthetic({ postscript: 'Mono-Regular' }), synthetic({ postscript: 'Mono-Bold', postscriptMac: true }), synthetic({ postscript: 'Mono-Italic' })])
    expect(await faceIndexOf(bytesReader(ttc), 'Mono-Bold')).toBe(1)
    expect(await faceIndexOf(bytesReader(ttc), 'Mono-Italic')).toBe(2)
    expect(await faceIndexOf(bytesReader(ttc), 'Other')).toBe(0)
    expect(await faceIndexOf(bytesReader(synthetic({ postscript: 'Mono-Bold' })), 'Mono-Bold')).toBe(0)
    expect(await faceIndexOf(async () => undefined, 'Mono-Bold')).toBe(0)
  })

  const osascript = process.platform === 'darwin' && existsSync('/System/Library/Fonts/Menlo.ttc') && spawnSync('osascript', ['-e', 'return 1']).status === 0
  test.skipIf(!osascript)('this Mac: Menlo Bold is the second face of Menlo.ttc; a family CoreText lacks prints nothing', async () => {
    const run = (family: string, style?: string) => {
      const [cmd, ...args] = coreTextFontArgv(family, style)
      const out = spawnSync(cmd!, args, { encoding: 'utf8' })
      expect(out.status).toBe(0)
      return parseCoreTextFont(out.stdout)
    }
    const bold = run('Menlo', 'Bold')!
    expect(bold).toMatchObject({ file: '/System/Library/Fonts/Menlo.ttc', families: ['Menlo'], postscript: 'Menlo-Bold' })
    expect(await faceIndexOf(bytesReader(new Uint8Array(readFileSync(bold.file))), bold.postscript)).toBe(1)
    // No style: the regular face.
    expect(run('menlo')).toMatchObject({ postscript: 'Menlo-Regular' })
    expect(run('No Such Family Anywhere')).toBeUndefined()
  })
})

describe('finding the file', () => {
  test('fc-match with an escaped pattern, printing file, index and families', () => {
    expect(fontPattern('Roboto Mono', 'Medium')).toBe('Roboto Mono:style=Medium')
    expect(fontPattern('Font-Name: x,y')).toBe('Font\\-Name\\: x\\,y')
    expect(fontFileArgv('Iosevka')).toEqual(['fc-match', '--format=%{file}\\n%{index}\\n%{family}\\n', 'Iosevka'])
  })

  test('parses the match and checks its family', () => {
    const match = parseFontFile('/usr/share/fonts/TTF/RobotoMono-Medium.ttf\n0\nRoboto Mono,Roboto Mono Medium\n')!
    expect(match).toEqual({ file: '/usr/share/fonts/TTF/RobotoMono-Medium.ttf', index: 0, families: ['Roboto Mono', 'Roboto Mono Medium'] })
    expect(matchesFamily(match, 'roboto mono')).toBe(true)
    // fontconfig falls back to another family when it has none of the name.
    expect(matchesFamily(parseFontFile('/usr/share/fonts/TTF/DejaVuSans.ttf\n0\nDejaVu Sans\n')!, 'Nonexistent')).toBe(false)
    expect(parseFontFile('')).toBeUndefined()
    expect(parseFontFile('relative/path.ttf\n0\nX\n')).toBeUndefined()
    expect(parseFontFile('/a.ttc\nnope\nX')).toMatchObject({ index: 0 })
  })

  test('od reads a range of bytes as decimal numbers', () => {
    expect(odArgv('/f.ttf', 12, 16)).toEqual(['od', '-An', '-v', '-tu1', '-j', '12', '-N', '16', '/f.ttf'])
    expect(parseOd('   0   1 255\n  16\n')).toEqual(Uint8Array.of(0, 1, 255, 16))
    expect(parseOd('')).toEqual(new Uint8Array(0))
    expect(parseOd('0 256')).toBeUndefined()
    expect(parseOd('od: /f.ttf: No such file')).toBeUndefined()
  })
})
