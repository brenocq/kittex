import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { DEFAULT_WEIGHT, INK_EDGE, measure, rasterize, strokeWeight } from '../../src/raster/index.js'
import type { DrawOp, Raster, RasterOptions, TypesetResult } from '../../src/types.js'

const FIXTURES = join(import.meta.dirname, 'fixtures')
const fixtures: { name: string; tex: string; result: TypesetResult }[] = readdirSync(FIXTURES)
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(join(FIXTURES, f), 'utf8')))

const base: RasterOptions = { emPx: 25, cellWidth: 13, cellHeight: 26, maxColumns: 80, align: 'center' }

/** A formula of the given box filled by one rect. */
const box = (width: number, height: number, depth: number, ops?: DrawOp[]): TypesetResult => ({
  width,
  height,
  depth,
  ops: ops ?? [{ type: 'rect', x: 0, y: -height, width, height: height + depth }],
})

const ink = (r: Raster) => r.alpha.reduce((n, a) => n + a, 0) / 255
const at = (r: Raster, x: number, y: number) => r.alpha[y * r.widthPx + x]!

/** The bounding box of the pixels with any coverage. */
function inkBox(r: Raster) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let y = 0; y < r.heightPx; y++)
    for (let x = 0; x < r.widthPx; x++)
      if (at(r, x, y)) {
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x + 1)
        y0 = Math.min(y0, y)
        y1 = Math.max(y1, y + 1)
      }
  return { x0, y0, x1, y1 }
}

describe('measure', () => {
  test('center spans maxColumns; left is as wide as the formula', () => {
    const f = box(4, 0.75, 0.25)
    expect(measure(f, { ...base, weight: 0 })).toEqual({ columns: 80, rows: 1, scale: 1 })
    // 4 em × 25 px = 100 px over 13 px cells: 8 columns.
    expect(measure(f, { ...base, align: 'left', weight: 0 })).toEqual({ columns: 8, rows: 1, scale: 1 })
    // 104 px exactly fills 8 columns; one more pixel takes a ninth.
    expect(measure(box(104 / 25, 0.5, 0.1), { ...base, align: 'left', weight: 0 }).columns).toBe(8)
    expect(measure(box(105 / 25, 0.5, 0.1), { ...base, align: 'left', weight: 0 }).columns).toBe(9)
  })

  test('the stroke weight pads the ink box by whole pixels on every side', () => {
    // weight 15 at 25 px/em dilates 0.375 px: one pixel of padding each side.
    expect(measure(box(104 / 25, 0.5, 0.1), { ...base, align: 'left' }).columns).toBe(9)
    expect(measure(box(1, 48 / 25, 2 / 25), { ...base, align: 'left' }).rows).toBe(2)
    expect(measure(box(1, 49 / 25, 2 / 25), { ...base, align: 'left' }).rows).toBe(3)
    expect(DEFAULT_WEIGHT).toBe(15)
  })

  test('rows = ceil(box height / cellHeight), at least minRows, at most 255', () => {
    expect(measure(box(2, 1.2, 0.4), { ...base, weight: 0 }).rows).toBe(2) // 40 px
    expect(measure(box(2, 1.6, 0.48), { ...base, weight: 0 }).rows).toBe(2) // 52 px
    expect(measure(box(2, 1.6, 0.5), { ...base, weight: 0 }).rows).toBe(3) // 52.5 px
    expect(measure(box(2, 1.2, 0.4), { ...base, minRows: 5 }).rows).toBe(5)
    expect(measure(box(2, 1.2, 0.4), { ...base, minRows: 300 }).rows).toBe(255)
    expect(measure(box(0, 0, 0, []), base)).toEqual({ columns: 80, rows: 1, scale: 1 })
  })

  test('a formula wider than maxColumns is scaled down to fit exactly', () => {
    const f = box(100, 1, 0.5)
    const m = measure(f, { ...base, maxColumns: 10, weight: 0 })
    expect(m.columns).toBe(10)
    expect(m.scale).toBeCloseTo(130 / 2500, 12)
    expect(m.rows).toBe(1)
    expect(measure(f, { ...base, maxColumns: 10, align: 'left', weight: 0 })).toEqual(m)
    // With padding, the scaled formula plus a pixel each side fills the 130 px.
    const padded = measure(f, { ...base, maxColumns: 10, align: 'left' })
    expect(padded.scale).toBeCloseTo(128 / 2500, 12)
    expect(padded.columns).toBe(10)
    const r = rasterize(f, { ...base, maxColumns: 10, align: 'left' })
    expect(r.widthPx).toBe(130)
    // The padding stays a whole pixel while the dilation shrinks with the formula.
    expect(at(r, 0, r.baselinePx - 1)).toBeLessThan(10)
    expect(at(r, 1, r.baselinePx - 1)).toBe(255)
    expect(at(r, 128, r.baselinePx - 1)).toBe(255)
    expect(at(r, 129, r.baselinePx - 1)).toBeLessThan(10)
  })

  test('a formula taller than 255 rows is scaled down to fit them', () => {
    const f = box(2, 200, 100) // 7500 px tall
    const m = measure(f, { ...base, weight: 0 })
    expect(m.rows).toBe(255)
    expect(m.scale).toBeCloseTo((255 * 26) / 7500, 12)
  })

  test('maxColumns and minRows are clamped to 1..255', () => {
    expect(measure(box(1, 1, 0), { ...base, maxColumns: 999 }).columns).toBe(255)
    expect(measure(box(1, 1, 0), { ...base, maxColumns: 0 }).columns).toBe(1)
    expect(measure(box(1, 1, 0), { ...base, minRows: -3, weight: 0 }).rows).toBe(1)
    expect(() => measure(box(1, 1, 0), { ...base, emPx: 0 })).toThrow(RangeError)
  })

  test('measure agrees with rasterize, and the image fills whole cells', () => {
    const cells = [
      [13, 26],
      [9.6, 19.25],
      [10.333, 21.5],
      [26, 52],
    ]
    for (const { result } of fixtures) {
      for (const [cellWidth, cellHeight] of cells) {
        for (const align of ['center', 'left'] as const) {
          for (const options of [
            { emPx: (cellWidth! / 0.6) * 1.15, cellWidth: cellWidth!, cellHeight: cellHeight!, maxColumns: 100, align },
            { emPx: (cellWidth! / 0.6) * 1.15, cellWidth: cellWidth!, cellHeight: cellHeight!, maxColumns: 17, align, minRows: 4 },
            { emPx: 30, cellWidth: cellWidth!, cellHeight: cellHeight!, maxColumns: 255, align, weight: 0 },
          ]) {
            const m = measure(result, options)
            const r = rasterize(result, options)
            expect({ columns: r.columns, rows: r.rows, scale: r.scale }).toEqual(m)
            expect(r.widthPx).toBe(Math.round(m.columns * cellWidth!))
            expect(r.heightPx).toBe(Math.round(m.rows * cellHeight!))
            expect(r.alpha.length).toBe(r.widthPx * r.heightPx)
            expect(Number.isInteger(r.baselinePx)).toBe(true)
          }
        }
      }
    }
  })
})

describe('rasterize', () => {
  test('the formula is centred, its baseline on a whole pixel', () => {
    // A 4 × 1 em box at 25 px/em in 80 columns × 2 rows, no weight.
    const f = box(4, 0.7, 0.3)
    const r = rasterize(f, { ...base, weight: 0, minRows: 2 })
    expect(r.widthPx).toBe(1040)
    expect(r.heightPx).toBe(52)
    // Ink 25 px tall centred in 52 px: top at 13.5 → baseline at 13.5 + 17.5 = 31.
    expect(r.baselinePx).toBe(31)
    const b = inkBox(r)
    expect([b.x0, b.x1]).toEqual([470, 570])
    expect([b.y0, b.y1]).toEqual([31 - 18, 31 + 8])
    expect(at(r, 500, 20)).toBe(255)
    // Horizontal edges at 13.5 and 38.5 are half-covered rows; vertical edges at whole pixels are sharp.
    expect(at(r, 500, 13)).toBe(128)
    expect(at(r, 500, 38)).toBe(128)
    expect(at(r, 469, 20)).toBe(0)
    expect(at(r, 470, 20)).toBe(255)
  })

  test('left alignment puts the padded ink box at x = 0', () => {
    const r = rasterize(box(2, 0.5, 0), { ...base, align: 'left' })
    expect(inkBox(r).x0).toBe(0)
    expect(at(r, 0, r.baselinePx - 5)).toBeGreaterThan(0)
    expect(at(r, 1, r.baselinePx - 5)).toBe(255)
  })

  test('the weight thickens outlines by 2 × weight / 1000 em', () => {
    // A 10 × 10 px square path, wound either way, under a mirroring transform too.
    for (const transform of [
      [1 / 25, 0, 0, 1 / 25, 1, -0.6],
      [1 / 25, 0, 0, -1 / 25, 1, -0.2],
    ] as const) {
      for (const d of ['M0 0H10V10H0Z', 'M0 0V10H10V0Z']) {
        const f = box(2, 1, 0.2, [{ type: 'path', d, transform }])
        expect(ink(rasterize(f, { ...base, weight: 0 }))).toBeCloseTo(100, 1)
        // weight 20 at 25 px/em: 0.5 px a side, 11 × 11 px.
        // (Half-covered edge pixels round to 128/255, a little over half.)
        expect(Math.abs(ink(rasterize(f, { ...base, weight: 20 })) - 121)).toBeLessThan(0.2)
      }
    }
  })

  test('the weight shrinks holes', () => {
    const transform = [1 / 25, 0, 0, 1 / 25, 1, -0.8] as const
    const ring: DrawOp = { type: 'path', d: 'M0 0H20V20H0Z M5 5V15H15V5Z', transform }
    const f = box(2, 1, 0.2, [ring])
    expect(ink(rasterize(f, { ...base, weight: 0 }))).toBeCloseTo(400 - 100, 1)
    expect(Math.abs(ink(rasterize(f, { ...base, weight: 20 })) - (21 * 21 - 9 * 9))).toBeLessThan(0.4)
  })

  test('overlapping ops union, whichever way each is wound', () => {
    const t = [1 / 25, 0, 0, 1 / 25, 1, -0.8] as const
    const f = box(2, 1, 0.2, [
      { type: 'path', d: 'M0 0H10V10H0Z', transform: t },
      { type: 'path', d: 'M5 0V10H15V0Z', transform: t },
      { type: 'rect', x: 1 + 5 / 25, y: -0.8, width: 5 / 25, height: 10 / 25 },
    ])
    expect(ink(rasterize(f, { ...base, weight: 0 }))).toBeCloseTo(150, 1)
  })

  test('thin horizontal rules land on whole pixel rows', () => {
    for (const y of [-0.3, -0.31, -0.322, -0.335, -0.349]) {
      for (const [height, weight] of [
        [0.04, 0],
        [0.06, 0],
        [0.04, 15],
        [0.06, 15],
        [0.1, 0],
      ] as const) {
        const f = box(3, 0.8, 0.2, [{ type: 'rect', x: 0.5, y, width: 2, height }])
        const r = rasterize(f, { ...base, weight })
        const column = Array.from({ length: r.heightPx }, (_, row) => at(r, 520, row))
        expect(column.every(a => a === 0 || a === 255)).toBe(true)
        const rows = column.filter(a => a === 255).length
        expect(rows).toBe(Math.max(1, Math.round((height * 25) + (2 * weight * 25) / 1000)))
        // The rule stays within half a pixel of where it was.
        const top = column.indexOf(255)
        const centre = r.baselinePx + (y + height / 2) * 25
        expect(Math.abs(top + rows / 2 - centre)).toBeLessThanOrEqual(0.5 + 1e-9)
      }
    }
  })

  test('glyph-like rules (a minus with rounded ends) snap too; round shapes do not', () => {
    const t = [1 / 1000, 0, 0, 1 / 1000, 0.5, 0] as const
    const minus: DrawOp = {
      type: 'path',
      d: 'M100 -237C80 -237 70 -247 70 -262C70 -277 80 -287 100 -287L700 -287C720 -287 730 -277 730 -262C730 -247 720 -237 700 -237Z',
      transform: t,
    }
    const r = rasterize(box(2, 0.8, 0.2, [minus]), { ...base, weight: 0 })
    const column = Array.from({ length: r.heightPx }, (_, row) => at(r, inkBox(r).x0 + 8, row))
    expect(column.every(a => a === 0 || a === 255)).toBe(true)
    expect(column.filter(a => a === 255).length).toBe(1)
    const dot: DrawOp = { type: 'path', d: 'M0 -20A20 20 0 1 0 0 20A20 20 0 1 0 0 -20Z', transform: [1 / 1000, 0, 0, 1 / 1000, 0.51, -0.31] }
    const rd = rasterize(box(2, 0.8, 0.2, [dot]), { ...base, weight: 0 })
    expect([...rd.alpha].some(a => a > 0 && a < 255)).toBe(true)
  })

  test('thin vertical rules land on whole pixel columns', () => {
    const f = box(3, 0.8, 0.2, [{ type: 'rect', x: 1.013, y: -0.7, width: 0.05, height: 0.8 }])
    const r = rasterize(f, { ...base, weight: 0, align: 'left' })
    const row = Array.from(r.alpha.subarray((r.baselinePx - 5) * r.widthPx, (r.baselinePx - 4) * r.widthPx))
    expect(row.every(a => a === 0 || a === 255)).toBe(true)
    expect(row.filter(a => a === 255).length).toBe(1)
  })

  test('every fixture draws within its image, the same each time', () => {
    for (const { name, result } of fixtures) {
      const options = { ...base, emPx: (13 / 0.6) * 1.15, maxColumns: 100 }
      const r = rasterize(result, options)
      const b = inkBox(r)
      expect(ink(r), name).toBeGreaterThan(50)
      expect(b.x0, name).toBeGreaterThan(0)
      expect(b.x1, name).toBeLessThan(r.widthPx)
      expect(b.y0, name).toBeGreaterThanOrEqual(0)
      expect(b.y1, name).toBeLessThanOrEqual(r.heightPx)
      // Ink is centred vertically to within the slack between MathJax's box and the glyphs.
      expect(Math.abs(b.y0 - (r.heightPx - b.y1)), name).toBeLessThanOrEqual(8)
      expect(rasterize(result, options).alpha).toEqual(r.alpha)
    }
  })
})

describe('inline placement (baselinePx)', () => {
  const inline: RasterOptions = { ...base, align: 'left', minRows: 1, baselinePx: 21, weight: 0 }

  test('the image is one row, the baseline on the given pixel row', () => {
    const r = rasterize(box(1, 0.4, 0), inline)
    expect([r.rows, r.heightPx, r.baselinePx, r.scale]).toEqual([1, 26, 21, 1])
    // A box from 0.4 em above the baseline down to it: 10 px of ink ending on row 21.
    expect(inkBox(r)).toMatchObject({ y0: 11, y1: 21 })
  })

  test('a formula too tall above the baseline moves it down a pixel, then is scaled until it fits, never the rows grown', () => {
    const r = rasterize(box(1, 1.2, 0), inline)
    expect(r.rows).toBe(1)
    expect(r.baselinePx).toBe(22)
    // Half a pixel clear of the top (INK_EDGE): the top row half covered, not cut flat.
    expect(r.scale).toBeCloseTo((22 - INK_EDGE) / 30, 6)
    expect(inkBox(r)).toMatchObject({ y0: 0, y1: 22 })
    const top = r.alpha.subarray(0, r.widthPx).reduce((m, a) => Math.max(m, a), 0)
    expect(top).toBeGreaterThan(100)
    expect(top).toBeLessThan(160)
  })

  test('the depth below the baseline is fitted to the rows under it, the baseline a pixel higher at most', () => {
    // 0.2 em deep is 5 px: it fits under the font's baseline as it is.
    expect(rasterize(box(1, 0.4, 0.2), inline)).toMatchObject({ scale: 1, baselinePx: 21 })
    // 6.25 px: the baseline goes up a pixel (6 px of room), the formula shrinks to fit the rest.
    expect(rasterize(box(1, 0.4, 0.25), inline)).toMatchObject({ baselinePx: 20 })
    expect(measure(box(1, 0.4, 0.25), inline).scale).toBeCloseTo(6 / 6.25, 6)
    expect(measure(box(1, 0.4, 0.3), inline).scale).toBeCloseTo(6 / 7.5, 6)
    // Dilation included: 5.375 px fits in the 6 px under a baseline moved up.
    const weighted = rasterize(box(1, 0.4, 0.2), { ...inline, weight: DEFAULT_WEIGHT })
    expect([weighted.scale, weighted.baselinePx]).toEqual([1, 20])
  })

  test('at the left of the columns asked for (minColumns)', () => {
    const r = rasterize(box(1, 0.4, 0), { ...inline, maxColumns: 4, minColumns: 4 })
    expect([r.columns, r.widthPx]).toEqual([4, 52])
    expect(inkBox(r).x0).toBeLessThanOrEqual(1)
    expect(measure(box(1, 0.4, 0), inline).columns).toBe(2)
  })

  test('centerInk: the ink centred across the columns asked for, by whole pixels', () => {
    for (const width of [0.3, 0.5, 1, 1.7]) {
      const r = rasterize(box(width, 0.4, 0), { ...inline, maxColumns: 4, minColumns: 4, centerInk: true })
      const { x0, x1 } = inkBox(r)
      expect(Math.abs(x0 - (r.widthPx - x1))).toBeLessThanOrEqual(1)
      // Moved by whole pixels: the same coverage as at the left, shifted.
      const left = rasterize(box(width, 0.4, 0), { ...inline, maxColumns: 4, minColumns: 4 })
      expect(ink(r)).toBeCloseTo(ink(left), 6)
    }
    // Its own width: the part of a cell left over goes half to each side.
    const own = rasterize(box(0.6, 0.4, 0), { ...inline, centerInk: true })
    expect(own.columns).toBe(2)
    expect(inkBox(own)).toMatchObject({ x0: 6, x1: 21 })
    // Ink in an image that has none is left alone.
    expect(rasterize(box(0, 0, 0, []), { ...inline, centerInk: true }).alpha.every(a => a === 0)).toBe(true)
  })

  test('centred across the columns asked for', () => {
    const r = rasterize(box(1, 0.4, 0), { ...inline, align: 'center', maxColumns: 4 })
    expect([r.columns, r.widthPx]).toEqual([4, 52])
    const { x0, x1 } = inkBox(r)
    expect(Math.abs(x0 + x1 - 52)).toBeLessThanOrEqual(1)
  })
})

describe('strokeWeight', () => {
  // Matched by eye to Roboto Mono of each weight at 13×26 px cells (Medium measured 17% heavier than the default).
  test('Regular text keeps the default, Medium and heavier draw heavier, Light lighter', () => {
    expect(strokeWeight(undefined)).toBe(DEFAULT_WEIGHT)
    expect(strokeWeight(400)).toBe(DEFAULT_WEIGHT)
    expect(strokeWeight(500)).toBe(20)
    expect(strokeWeight(450)).toBe(18)
    expect(strokeWeight(700)).toBe(26)
    expect(strokeWeight(900)).toBe(26)
    expect(strokeWeight(300)).toBe(12)
    expect(strokeWeight(100)).toBe(12)
  })

  test('a heavier weight darkens the same glyphs', () => {
    const glyph = box(0.5, 0.5, 0)
    const ink = (weight: number) => rasterize(glyph, { ...base, align: 'left', weight }).alpha.reduce((s, a) => s + a, 0)
    expect(ink(strokeWeight(500))).toBeGreaterThan(ink(strokeWeight(400)))
  })
})
