import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { crc32, inflateSync } from 'node:zlib'
import { describe, expect, test } from 'vitest'
import { curvedAlpha, encodePng, inkAlpha, rasterize, recolorPng } from '../../src/raster/index.js'
import type { Raster, RGB, TypesetResult } from '../../src/types.js'

interface Chunk {
  type: string
  data: Uint8Array
}

/** Splits a PNG into chunks, checking the signature, every length and every CRC. */
function chunks(png: Uint8Array): Chunk[] {
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const out: Chunk[] = []
  let at = 8
  while (at < png.length) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8))
    const data = png.subarray(at + 8, at + 8 + length)
    expect(view.getUint32(at + 8 + length), `${type} CRC`).toBe(crc32(png.subarray(at + 4, at + 8 + length)))
    out.push({ type, data })
    at += 12 + length
  }
  expect(at).toBe(png.length)
  return out
}

/** Decodes one of encodePng's images back to its palette, alpha table and pixel indices. */
function decode(png: Uint8Array) {
  const list = chunks(png)
  expect(list.map(c => c.type)).toEqual(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'])
  const ihdr = new DataView(list[0]!.data.buffer, list[0]!.data.byteOffset, 13)
  const width = ihdr.getUint32(0)
  const height = ihdr.getUint32(4)
  expect([...list[0]!.data.subarray(8)]).toEqual([8, 3, 0, 0, 0])
  const raw = inflateSync(list[3]!.data)
  expect(raw.length).toBe(height * (width + 1))
  const pixels = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (width + 1)]!
    const row = raw.subarray(y * (width + 1) + 1, (y + 1) * (width + 1))
    for (let x = 0; x < width; x++) {
      const a = x > 0 ? pixels[y * width + x - 1]! : 0
      const b = y > 0 ? pixels[(y - 1) * width + x]! : 0
      const c = x > 0 && y > 0 ? pixels[(y - 1) * width + x - 1]! : 0
      const p = a + b - c
      const pred = [0, a, b, (a + b) >> 1, Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c][filter]
      expect(pred, 'filter type').toBeDefined()
      pixels[y * width + x] = (row[x]! + pred!) & 0xff
    }
  }
  return { width, height, plte: list[1]!.data, trns: list[2]!.data, pixels }
}

const gaussian: TypesetResult = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/gaussian.json'), 'utf8')).result
const raster = rasterize(gaussian, { emPx: 25, cellWidth: 13, cellHeight: 26, maxColumns: 40, align: 'center' })
const ink: RGB = { r: 230, g: 220, b: 10 }

describe('encodePng', () => {
  test('a palette PNG: 256 ink entries, alpha 0..255, one byte per pixel', () => {
    const png = encodePng(raster, ink)
    const { width, height, plte, trns, pixels } = decode(png)
    expect([width, height]).toEqual([raster.widthPx, raster.heightPx])
    expect(plte.length).toBe(768)
    for (let i = 0; i < 768; i += 3) expect([plte[i], plte[i + 1], plte[i + 2]]).toEqual([230, 220, 10])
    expect([...trns]).toEqual(Array.from({ length: 256 }, (_, i) => i))
    expect(pixels).toEqual(raster.alpha)
    // Small: deflate takes the long transparent runs.
    expect(png.length).toBeLessThan(raster.alpha.length / 10)
  })

  test('round-trips arbitrary coverage, including every byte value', () => {
    const w = 37
    const h = 23
    const alpha = Uint8Array.from({ length: w * h }, (_, i) => (i * 97 + (i >> 3)) & 0xff)
    const r: Raster = { columns: 1, rows: 1, scale: 1, alpha, widthPx: w, heightPx: h, baselinePx: 10 }
    expect(decode(encodePng(r, ink)).pixels).toEqual(alpha)
  })

  test('ink channels are clamped to bytes', () => {
    const { plte } = decode(encodePng(raster, { r: 300, g: -4, b: 12.6 }))
    expect([...plte.subarray(0, 3)]).toEqual([255, 0, 13])
  })

  test('recolorPng rewrites only the palette', () => {
    const png = encodePng(raster, ink)
    const other = recolorPng(png, { r: 1, g: 2, b: 3 })
    expect(other).toEqual(encodePng(raster, { r: 1, g: 2, b: 3 }))
    expect(other.length).toBe(png.length)
    const changed = [...png].flatMap((b, i) => (b !== other[i] ? [i] : []))
    // Only bytes of the PLTE chunk (data and CRC) differ.
    expect(Math.min(...changed)).toBeGreaterThanOrEqual(33 + 8)
    expect(Math.max(...changed)).toBeLessThan(33 + 12 + 768)
    expect(png).toEqual(encodePng(raster, ink)) // the input is untouched
    expect(() => recolorPng(new Uint8Array(100), ink)).toThrow()
  })
})

// Ghostty 1.3.1's linear-corrected text blending (cell_text.f.glsl), written
// out independently: luminances of the linear colours, blended gamma-encoded.
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const enc = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)
const lum = (c: RGB) => 0.2126 * lin(c.r / 255) + 0.7152 * lin(c.g / 255) + 0.0722 * lin(c.b / 255)
function ghosttyText(a: number, fg: RGB, bg: RGB): number {
  const f = lum(fg)
  const b = lum(bg)
  return Math.abs(f - b) > 0.001 ? Math.min(1, Math.max(0, (lin(enc(f) * a + enc(b) * (1 - a)) - b) / (f - b))) : a
}

const black: RGB = { r: 0, g: 0, b: 0 }
const white: RGB = { r: 255, g: 255, b: 255 }
// The two gruvbox themes measured live: Ghostty's Gruvbox Light, and kitty's (and Ghostty's) Gruvbox Dark.
const lightFg: RGB = { r: 0x3c, g: 0x38, b: 0x36 }
const lightBg: RGB = { r: 0xfb, g: 0xf1, b: 0xc7 }
const darkFg: RGB = { r: 0xeb, g: 0xdb, b: 0xb2 }
const darkBg: RGB = { r: 0x28, g: 0x28, b: 0x28 }

describe('inkAlpha (Ghostty linear-corrected text blending, for images)', () => {
  test('black on white: the linear blend lands where the gamma blend would, 1 - lin(1 - a)', () => {
    for (const a of [0.1, 0.25, 0.5, 0.75, 0.9]) expect(inkAlpha(a, black, white)).toBeCloseTo(1 - lin(1 - a), 12)
    expect(inkAlpha(0.5, black, white)).toBeCloseTo(0.786, 3)
  })

  test('dark ink on a light background gains alpha, light ink on a dark one loses it; 0 and 1 stay', () => {
    for (const a of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(inkAlpha(a, lightFg, lightBg)).toBeGreaterThan(a)
      expect(inkAlpha(a, darkFg, darkBg)).toBeLessThan(a)
    }
    for (const [fg, bg] of [[lightFg, lightBg], [darkFg, darkBg]] as const) {
      expect(inkAlpha(0, fg, bg)).toBe(0)
      expect(inkAlpha(1, fg, bg)).toBeCloseTo(1, 12)
    }
  })

  test("matches Ghostty's text shader over the measured themes", () => {
    for (const [fg, bg] of [[lightFg, lightBg], [darkFg, darkBg], [ink, darkBg], [white, black]] as const) {
      for (let i = 0; i <= 255; i++) expect(inkAlpha(i / 255, fg, bg)).toBeCloseTo(ghosttyText(i / 255, fg, bg), 12)
    }
  })

  test('ink and background within 0.001 of luminance: no correction', () => {
    expect(inkAlpha(0.4, lightBg, lightBg)).toBe(0.4)
    expect(inkAlpha(0.4, { r: 128, g: 128, b: 128 }, { r: 128, g: 128, b: 129 })).toBe(0.4)
  })
})

describe('encodePng / recolorPng with a corrected alpha', () => {
  test('tRNS holds each level corrected against `over`; pixels and palette are unchanged', () => {
    const plain = decode(encodePng(raster, lightFg))
    const corrected = decode(encodePng(raster, lightFg, lightBg))
    expect(corrected.pixels).toEqual(plain.pixels)
    expect(corrected.plte).toEqual(plain.plte)
    const expected = Array.from({ length: 256 }, (_, i) => (i === 0 || i === 255 ? i : Math.round(255 * ghosttyText(i / 255, lightFg, lightBg))))
    expect([...corrected.trns]).toEqual(expected)
    // Monotonic, and darker at every partial level (dark ink on a light background).
    for (let i = 1; i < 256; i++) expect(corrected.trns[i]!).toBeGreaterThanOrEqual(corrected.trns[i - 1]!)
    expect(corrected.trns[128]).toBeGreaterThan(128 + 30)
  })

  test('recolorPng rewrites the correction with the colour, and back', () => {
    const plain = encodePng(raster, ink)
    const corrected = recolorPng(plain, lightFg, lightBg)
    expect(corrected).toEqual(encodePng(raster, lightFg, lightBg))
    expect(recolorPng(corrected, ink)).toEqual(plain)
    const changed = [...plain].flatMap((b, i) => (b !== corrected[i] ? [i] : []))
    // Only the PLTE and tRNS chunks (data and CRCs) differ.
    expect(Math.min(...changed)).toBeGreaterThanOrEqual(33 + 8)
    expect(Math.max(...changed)).toBeLessThan(33 + 12 + 768 + 12 + 256)
  })
})

// kitty 0.49's text curve (cell.slang, foreground_contrast_new), written out independently.
function kittyText(a: number, fg: RGB, bg: RGB, gamma: number, contrast: number): number {
  const g = gamma < 0.01 ? 1 : 1 / gamma
  const t = (1 - lum(fg) + lum(bg)) * 0.5
  const mixed = a * (1 - t) + a ** g * t
  return Math.min(1, Math.max(0, mixed * (1 + contrast * 0.01)))
}

describe("curvedAlpha (kitty's text_composition_strategy, for images)", () => {
  test("matches kitty's text shader over the measured themes", () => {
    for (const [fg, bg] of [[lightFg, lightBg], [darkFg, darkBg], [black, white], [white, black]] as const) {
      for (const [gamma, contrast] of [[1.7, 30], [1.2, 0], [0.8, 10]] as const) {
        for (let i = 0; i <= 255; i++) expect(curvedAlpha(i / 255, fg, bg, { gamma, contrast })).toBeCloseTo(kittyText(i / 255, fg, bg, gamma, contrast), 12)
      }
    }
  })

  test('1.7 30 (macOS) thickens dark ink on light much more than light ink on dark; 1.0 0 changes nothing', () => {
    const curve = { gamma: 1.7, contrast: 30 }
    expect(curvedAlpha(0.3, lightFg, lightBg, curve) - 0.3).toBeGreaterThan(curvedAlpha(0.3, darkFg, darkBg, curve) - 0.3)
    expect(curvedAlpha(0.3, darkFg, darkBg, curve)).toBeGreaterThan(0.3)
    for (const a of [0, 0.2, 0.5, 1]) expect(curvedAlpha(a, lightFg, lightBg, { gamma: 1, contrast: 0 })).toBeCloseTo(a, 12)
  })

  test("a curve goes into the PNG's tRNS, and recolouring keeps it", () => {
    const raster: Raster = { alpha: Uint8Array.of(0, 64, 128, 255), widthPx: 4, heightPx: 1, columns: 1, rows: 1, scale: 1, baselinePx: 1 }
    const curve = { gamma: 1.7, contrast: 30 }
    const trns = (png: Uint8Array) => chunks(png).find(c => c.type === 'tRNS')!.data
    const png = encodePng(raster, lightFg, lightBg, curve)
    expect(trns(png)[128]).toBe(Math.round(255 * kittyText(128 / 255, lightFg, lightBg, 1.7, 30)))
    expect(trns(png)[255]).toBe(255)
    expect(trns(recolorPng(encodePng(raster, darkFg), lightFg, lightBg, curve))).toEqual(trns(png))
    // Without a curve, the gamma correction as before.
    expect(trns(encodePng(raster, lightFg, lightBg))[128]).toBe(Math.round(255 * inkAlpha(128 / 255, lightFg, lightBg)))
  })
})
