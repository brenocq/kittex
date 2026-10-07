import { readFileSync } from 'node:fs'
import { unzlibSync } from 'fflate'
import { describe, expect, test } from 'vitest'
import { readSvg, texPicture } from '../../src/diagram/index.ts'
import { measureDisplayResult, measureInlineResult, measurePicture, MIN_PICTURE_SCALE, renderDisplayResult, renderInlineResult, renderPicture, TexError, texFormula } from '../../src/index.ts'
import { Coverage } from '../../src/raster/fill.ts'
import { flattenPath, flattenSubpaths } from '../../src/raster/path.ts'
import { snapStroke, strokeOutlines } from '../../src/raster/stroke.ts'
import type { Picture } from '../../src/types.ts'

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}.svg`, import.meta.url), 'utf8')
const IDENTITY = [1, 0, 0, 1, 0, 0] as const

/** The coverage of contours filled positively in a w × h image, summed over every pixel (0 to 1 each). */
function inked(contours: number[][], w: number, h: number): number {
  const coverage = new Coverage(w, h)
  for (const c of contours) coverage.fill(c, 1)
  return coverage.toAlpha().reduce((sum, a) => sum + a / 255, 0)
}

describe('strokes', () => {
  test('a horizontal line covers its length by its width', () => {
    const contours = strokeOutlines(flattenSubpaths('M2 10H22', IDENTITY), { width: 2, cap: 'butt', join: 'miter', miterLimit: 4 })
    expect(inked(contours, 30, 20)).toBeCloseTo(40, 0)
  })

  test('caps extend an open line: square by half its width, round by a half disc', () => {
    const line = flattenSubpaths('M10 10H20', IDENTITY)
    expect(inked(strokeOutlines(line, { width: 2, cap: 'square', join: 'miter', miterLimit: 4 }), 40, 20)).toBeCloseTo(24, 0)
    expect(inked(strokeOutlines(line, { width: 2, cap: 'round', join: 'miter', miterLimit: 4 }), 40, 20)).toBeCloseTo(20 + Math.PI, 0)
  })

  test("a closed square's corners are mitred, not left notched", () => {
    const square = flattenSubpaths('M5 5H25V25H5Z', IDENTITY)
    const miter = inked(strokeOutlines(square, { width: 2, cap: 'butt', join: 'miter', miterLimit: 4 }), 40, 40)
    expect(miter).toBeCloseTo(22 * 22 - 18 * 18, 0)
    const bevel = inked(strokeOutlines(square, { width: 2, cap: 'butt', join: 'bevel', miterLimit: 4 }), 40, 40)
    expect(bevel).toBeCloseTo(22 * 22 - 18 * 18 - 4 * 0.5, 0)
  })

  test('dashes cut the line into pieces', () => {
    const contours = strokeOutlines(flattenSubpaths('M0 5H20', IDENTITY), { width: 2, cap: 'butt', join: 'miter', miterLimit: 4, dash: [3, 2] })
    expect(contours).toHaveLength(4)
    expect(inked(contours, 30, 10)).toBeCloseTo(4 * 3 * 2, 0)
  })

  test('every piece winds positively, so pieces union', () => {
    for (const c of strokeOutlines(flattenSubpaths('M0 0L10 5L0 10Z', IDENTITY), { width: 3, cap: 'round', join: 'round', miterLimit: 4 })) {
      let area = 0
      for (let i = 0, j = c.length - 2; i < c.length; j = i, i += 2) area += c[j]! * c[i + 1]! - c[i]! * c[j + 1]!
      expect(area).toBeGreaterThan(0)
    }
  })

  test('axis-aligned segments snap to whole pixels', () => {
    const subpaths = flattenSubpaths('M1.3 4.2H9.7V8.6', IDENTITY)
    expect(snapStroke(subpaths, 0.8)).toBe(1)
    // Across each line only: an end keeps its place along it.
    expect(subpaths[0]!.points).toEqual([1.3, 4.5, 9.5, 4.5, 9.5, 8.6])
    const slanted = flattenSubpaths('M0 0L5 3', IDENTITY)
    expect(snapStroke(slanted, 0.8)).toBe(0.8)
  })

  test('a closed frame whose end repeats its start snaps as one point (no spike at the corner)', () => {
    const frame = flattenSubpaths('M2.3 2.3V20.2H20.4V2.3H2.3Z', IDENTITY)
    const width = snapStroke(frame, 1.4)
    const contours = strokeOutlines(frame, { width, cap: 'butt', join: 'miter', miterLimit: 10 })
    let x0 = Infinity
    for (const c of contours) for (let i = 0; i < c.length; i += 2) x0 = Math.min(x0, c[i]!)
    expect(x0).toBeGreaterThanOrEqual(0.9)
  })

  test('flattenPath keeps only subpaths with an inside, as before', () => {
    expect(flattenPath('M0 0L10 0M0 0L10 0L10 10Z', IDENTITY)).toHaveLength(1)
    expect(flattenSubpaths('M0 0L10 0M0 0L10 0L10 10Z', IDENTITY).map(s => s.closed)).toEqual([false, true])
  })
})

const DARK = { cellWidth: 13, cellHeight: 26, maxColumns: 100, emPx: (13 / 0.6) * 1.15, ink: { r: 220, g: 220, b: 220 }, background: { r: 30, g: 30, b: 30 } }

/** A PNG's colour type and its first pixel rows, decoded (filters undone). */
function decode(png: Uint8Array): { width: number; height: number; type: number; rgba: Uint8Array } {
  const view = new DataView(png.buffer, png.byteOffset)
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  const type = png[25]!
  let at = 8
  const idat: Uint8Array[] = []
  let plte = new Uint8Array(0)
  let trns = new Uint8Array(0)
  while (at < png.length) {
    const length = view.getUint32(at)
    const name = String.fromCharCode(...png.slice(at + 4, at + 8))
    if (name === 'IDAT') idat.push(png.slice(at + 8, at + 8 + length))
    if (name === 'PLTE') plte = png.slice(at + 8, at + 8 + length)
    if (name === 'tRNS') trns = png.slice(at + 8, at + 8 + length)
    at += 12 + length
  }
  const raw = unzlibSync(Uint8Array.from(idat.flatMap(part => [...part])))
  const bpp = type === 3 ? 1 : 4
  const stride = width * bpp
  const bytes = new Uint8Array(width * height * bpp)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!
    for (let i = 0; i < stride; i++) {
      const x = raw[y * (stride + 1) + 1 + i]!
      const a = i >= bpp ? bytes[y * stride + i - bpp]! : 0
      const b = y > 0 ? bytes[(y - 1) * stride + i]! : 0
      const c = y > 0 && i >= bpp ? bytes[(y - 1) * stride + i - bpp]! : 0
      const p = a + b - c
      const pred = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c
      bytes[y * stride + i] = (x + pred) & 255
    }
  }
  if (type !== 3) return { width, height, type, rgba: bytes }
  // An indexed PNG: each index through its palette entry and transparency.
  const rgba = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const k = bytes[i]!
    rgba.set([plte[3 * k]!, plte[3 * k + 1]!, plte[3 * k + 2]!, k < trns.length ? trns[k]! : 255], 4 * i)
  }
  return { width, height, type, rgba }
}

describe('pictures', () => {
  test('a picture is as wide as it needs (whole cells), in a palette PNG of tens of KB; its rows hold it', () => {
    const picture = texPicture(fixture('plot'), { baseline: 'bottom', fontSize: 10 })
    const box = measurePicture(picture, DARK)
    expect(box.columns).toBeLessThan(60)
    expect(box.columns).toBeGreaterThan(30)
    expect(box.scale).toBe(1)
    const image = renderPicture(picture, DARK)
    expect(image).toMatchObject({ columns: box.columns, rows: box.rows })
    expect(image.png.length).toBeLessThan(30_000)
    const png = decode(image.png)
    expect(png).toMatchObject({ width: box.columns * 13, height: box.rows * 26, type: 3 })
    // Explicit colours survive: the plot's red series.
    let red = 0
    for (let i = 0; i < png.rgba.length; i += 4) if (png.rgba[i + 3]! > 200 && png.rgba[i]! > 180 && png.rgba[i + 1]! < 90) red++
    expect(red).toBeGreaterThan(100)
  })

  test('a tall picture shrinks to its row cap; a wide one to the columns', () => {
    const picture = texPicture(fixture('plot'), { baseline: 'bottom', fontSize: 10 })
    const capped = measurePicture(picture, { ...DARK, maxRows: 10 })
    expect(capped.rows).toBe(10)
    expect(capped.scale).toBeLessThan(1)
    const narrow = measurePicture(picture, { ...DARK, maxColumns: 40 })
    expect(narrow.columns).toBe(40)
    expect(narrow.scale).toBeLessThan(1)
  })

  test('at a density below 1: the same cells, a fraction of the pixels and bytes', () => {
    const picture = texPicture(fixture('plot'), { baseline: 'bottom', fontSize: 10 })
    const full = renderPicture(picture, DARK)
    const half = renderPicture(picture, DARK, undefined, 0.5)
    expect(half).toMatchObject({ columns: full.columns, rows: full.rows })
    expect(decode(half.png).width).toBe(Math.round(full.columns * 6.5))
    expect(half.png.length).toBeLessThan(full.png.length * 0.6)
  })

  test('never wider or taller than 4096 px: at large cells, fewer columns and rows', () => {
    const picture = texPicture(fixture('plot'), { baseline: 'bottom', fontSize: 10 })
    const big = { ...DARK, cellWidth: 60, cellHeight: 300, maxColumns: 200, emPx: (60 / 0.6) * 1.15 }
    const box = measurePicture(picture, big)
    expect(box.columns * 60).toBeLessThanOrEqual(4096)
    expect(box.rows * 300).toBeLessThanOrEqual(4096)
  })

  test('never grown: a small picture keeps its size', () => {
    const picture = texPicture(fixture('cd'), { baseline: 'bottom', fontSize: 10 })
    expect(measurePicture(picture, { ...DARK, maxColumns: 200 }).scale).toBe(1)
  })

  test('one too large to read is refused', () => {
    const picture = texPicture(fixture('plot'), { baseline: 'bottom', fontSize: 10 })
    expect(() => measurePicture(picture, { ...DARK, maxColumns: 8 })).toThrow(TexError)
    expect(MIN_PICTURE_SCALE).toBeGreaterThan(0)
  })

  test("white paints nothing: the terminal's background shows through", () => {
    const picture: Picture = readSvg(`<svg viewBox='0 0 20 20'><path d='M0 0H20V20H0Z' fill='#f00'/><path d='M5 5H15V15H5Z' fill='#fff'/></svg>`, { baseline: 'bottom', emPerUnit: 0.1 })
    const png = decode(renderPicture(picture, { ...DARK, maxColumns: 4 }).png)
    const centre = ((png.height >> 1) * png.width + (png.width >> 1)) * 4
    expect(png.rgba[centre + 3]).toBe(0)
  })

  test('the Ghostty correction changes alpha only at the edges', () => {
    const picture = texPicture(fixture('tikz'), { baseline: 'bottom', fontSize: 10 })
    const plain = decode(renderPicture(picture, DARK).png)
    const corrected = decode(renderPicture(picture, { ...DARK, inkOver: DARK.background }).png)
    let changed = 0
    let solid = 0
    let solidChanged = 0
    for (let i = 3; i < plain.rgba.length; i += 4) {
      if (plain.rgba[i] !== corrected.rgba[i]) changed++
      if (plain.rgba[i] === 255) solid++
      // (Quantized to the palette's alpha levels, an edge pixel near 255 may round to it in one and not the other.)
      if (plain.rgba[i] === 255 && corrected.rgba[i]! < 240) solidChanged++
    }
    expect(changed).toBeGreaterThan(0)
    expect(solidChanged).toBeLessThanOrEqual(solid * 0.01)
  })
})

describe('formulas TeX drew', () => {
  const si = () => texFormula(readSvg(`<svg viewBox='0 -8 30 10.5'><path d='M0 -7H30V-6H0Z'/><path d='M0 0L10 2.5' stroke='#000' stroke-width='0.4' fill='none'/></svg>`, { baseline: 'origin', emPerUnit: 0.1 }))

  test('a picture becomes one ink of draw ops, strokes outlined', () => {
    const result = si()
    expect(result.ops).toHaveLength(2)
    expect(result.ops.every(op => op.type === 'path')).toBe(true)
    expect(result.height).toBeCloseTo(0.8)
    expect(result.depth).toBeCloseTo(0.25)
  })

  test('display and inline, as MathJax output is', () => {
    const result = si()
    const env = { ...DARK, ink: { r: 200, g: 200, b: 200 } }
    const box = measureDisplayResult(result, env)
    expect(box.columns).toBe(100)
    expect(renderDisplayResult(result, env, box.rows).rows).toBe(box.rows)
    const inline = measureInlineResult(result, { ...env, baselinePx: 20 })
    expect(inline?.rows).toBe(1)
    expect(renderInlineResult(result, { ...env, baselinePx: 20 }, inline!.columns).columns).toBe(inline!.columns)
  })
})
