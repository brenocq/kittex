import type { CellBox, DrawOp, Matrix, Raster, RasterOptions, RGB, TypesetResult } from '../types.js'
import { Coverage } from './fill.js'
import { type Contour, flattenPath } from './path.js'
import { encodeAlphaPng, recolorPng } from './png.js'

export { recolorPng }

/*
 * Draw ops (em) -> anti-aliased coverage over whole terminal cells.
 *
 * Every op is mapped to pixels (its transform, then emPx × scale, then the
 * image origin), its curves flattened to polygons within 0.05 px, its outline
 * dilated by the stroke weight, thin rules snapped to whole pixels, and the
 * result filled with exact-area coverage under the nonzero rule (fill.ts).
 *
 * Layout (`measure`, shared by `rasterize`):
 * - The ink box is the formula's box (width × (height + depth) em at emPx ×
 *   scale) plus `pad` whole pixels on every side, pad = ceil(dilation), so the
 *   dilated outline is never clipped.
 * - scale < 1 only when that box is wider than maxColumns cells (or taller
 *   than 255 rows): the formula then shrinks to fit exactly.
 * - columns: maxColumns for `center`, else ceil(ink width / cellWidth).
 *   rows: ceil(ink height / cellHeight), at least minRows, at most 255.
 * - Cell sizes may be fractional (the probe divides the window's pixels by
 *   its cells). The image is round(columns × cellWidth) by round(rows ×
 *   cellHeight) pixels, the whole-pixel size nearest the area the terminal
 *   stretches it over, so any rescaling is below half a pixel over the image.
 * - The formula is centred in the image (horizontally only for `center`;
 *   `left` puts the ink box at x = 0, or with `centerInk` centres the drawn
 *   ink itself), with its origin on whole pixels, so the baseline is a pixel
 *   boundary and glyphs land the same way in every image.
 * - Inline placement (`baselinePx`): the image is exactly `minRows` rows (one
 *   by default) and the baseline sits at the given pixel row, the terminal
 *   font's own; scale < 1 also when the formula's height above the baseline or
 *   depth below it, plus the dilation, would leave the image (rows never grow).
 *   Before shrinking, the baseline may move by up to BASELINE_SHIFT of the cell
 *   height (a pixel at 26 px) towards the side with room.
 */

/**
 * The default stroke weight: outlines grow by 15/1000 em on each side.
 * New Computer Modern's stems are about 0.07 em and its hairlines 0.02 em,
 * against 0.09 to 0.1 em for the stems of regular monospace terminal fonts;
 * at 20 to 30 px per em CM's hairlines also fall under a pixel and
 * anti-alias to a faint grey. Growing each side by 0.015 em (0.375 px at
 * 25 px/em) brings the stems to about 0.1 em and the hairlines past a pixel,
 * while counters and letter shapes stay the font's. Chosen by eye against
 * Roboto Mono and DejaVu Sans Mono at 13 × 26 px cells: 12 still reads light,
 * 18 matches a Medium weight and starts to clog small superscripts. A coverage
 * gamma was the alternative, but it only darkens edge pixels: a hairline stays
 * a grey line, just a less faint one. The weight is in em, not pixels, so a
 * formula looks the same at every resolution.
 */
export const DEFAULT_WEIGHT = 15

/** How far an inline formula's baseline may move from the font's, as a fraction of the cell height (at least a pixel). */
export const BASELINE_SHIFT = 0.04

interface Layout extends CellBox {
  widthPx: number
  heightPx: number
  /** Pixels per em after scaling. */
  k: number
  /** Outline dilation in pixels. */
  dilation: number
  /** Pixel offset of the formula's origin (left end of the baseline). */
  originX: number
  baselinePx: number
}

function layout(result: TypesetResult, options: RasterOptions): Layout {
  const { emPx, cellWidth, cellHeight } = options
  if (!(emPx > 0 && cellWidth > 0 && cellHeight > 0)) throw new RangeError('raster: emPx and cell sizes must be positive')
  const maxColumns = Math.max(1, Math.min(255, Math.floor(options.maxColumns) || 1))
  const minRows = Math.max(1, Math.min(255, Math.ceil(options.minRows ?? 1)))
  const weight = Math.max(0, options.weight ?? DEFAULT_WEIGHT)
  const width = Math.max(0, result.width)
  const boxHeight = Math.max(0, result.height + result.depth)

  const dilation0 = (weight / 1000) * emPx
  const pad = Math.ceil(dilation0 - 1e-9)
  const availWidth = maxColumns * cellWidth - 2 * pad
  const availHeight = 255 * cellHeight - 2 * pad
  const inline = options.baselinePx !== undefined
  let scale = 1
  let inlineBaseline = 0
  if (width * emPx > availWidth) scale = Math.max(0, availWidth) / (width * emPx)
  if (inline) {
    // The dilation scales with the formula, so the ink at scale s spans (height × emPx + dilation) × s above the baseline.
    const heightPx = Math.max(1, Math.round(minRows * cellHeight))
    const baseline = Math.min(heightPx, Math.max(0, Math.round(options.baselinePx!)))
    const above = Math.max(0, result.height) * emPx + dilation0
    const below = Math.max(0, result.depth) * emPx + dilation0
    // The baseline may move a pixel or so (towards the side with room) rather
    // than shrink the formula: a subscript with a descender (a_{ij}) fits.
    const shift = Math.max(1, Math.round(cellHeight * BASELINE_SHIFT))
    const fit = (at: number) => Math.min(scale, above > 0 ? at / above : Infinity, below > 0 ? (heightPx - at) / below : Infinity)
    let best = baseline
    for (let d = 1; d <= shift; d++) {
      for (const at of [baseline - d, baseline + d]) {
        if (at >= 0 && at <= heightPx && fit(at) > fit(best) + 1e-9) best = at
      }
    }
    inlineBaseline = best
    scale = fit(best)
    // A formula that fits only below the floor (a bar in a subscript reaches
    // 0.35 em down) is drawn at the floor if its ink then passes the cell by no
    // more than overflowPx: the clipped pixel or two is the tip of a thin stroke.
    const floor = options.minScale ?? 0
    const slack = Math.max(0, options.overflowPx ?? 0)
    if (scale < floor && slack > 0) {
      const fitWith = (at: number) => Math.min(above > 0 ? (at + slack) / above : Infinity, below > 0 ? (heightPx - at + slack) / below : Infinity)
      let rescue = baseline
      for (let d = 1; d <= shift; d++) {
        for (const at of [baseline - d, baseline + d]) {
          if (at >= 0 && at <= heightPx && fitWith(at) > fitWith(rescue) + 1e-9) rescue = at
        }
      }
      if (fitWith(rescue) >= floor - 1e-9 && (width * emPx * floor <= availWidth || availWidth <= 0)) {
        inlineBaseline = rescue
        scale = floor
      }
    }
  } else if (boxHeight * emPx * scale > availHeight) {
    scale = Math.max(0, availHeight) / (boxHeight * emPx)
  }
  const k = emPx * scale
  const inkWidth = width * k + 2 * pad
  const inkHeight = boxHeight * k + 2 * pad

  const minColumns = Math.max(1, Math.floor(options.minColumns ?? 1))
  const columns =
    options.align === 'center' ? maxColumns : Math.min(maxColumns, Math.max(minColumns, Math.ceil(inkWidth / cellWidth - 1e-9)))
  const rows = inline ? minRows : Math.min(255, Math.max(minRows, Math.ceil(inkHeight / cellHeight - 1e-9)))
  const widthPx = Math.max(1, Math.round(columns * cellWidth))
  const heightPx = Math.max(1, Math.round(rows * cellHeight))
  const originX = options.align === 'center' ? Math.round((widthPx - width * k) / 2) : pad
  const baselinePx = inline
    ? inlineBaseline
    : Math.round((heightPx - inkHeight) / 2 + pad + Math.max(0, result.height) * k)
  return { columns, rows, scale, widthPx, heightPx, k, dilation: dilation0 * scale, originX, baselinePx }
}

/** The cells a formula will take under `options`, without drawing it. */
export function measure(result: TypesetResult, options: RasterOptions): CellBox {
  const { columns, rows, scale } = layout(result, options)
  return { columns, rows, scale }
}

/** Draws a typeset formula as coverage over whole cells. */
export function rasterize(result: TypesetResult, options: RasterOptions): Raster {
  const box = layout(result, options)
  const { widthPx, heightPx, k, dilation, originX, baselinePx } = box
  const coverage = new Coverage(widthPx, heightPx)
  const toPx: Matrix = [k, 0, 0, k, originX, baselinePx]
  // Rules up to 0.15 em thick (4 px at least) are snapped: TeX's are 0.04 to 0.1 em.
  const ruleMax = Math.max(RULE_MIN_SNAP, 0.15 * k)
  const shapes = result.ops.flatMap(op => outline(op, toPx, dilation, ruleMax) ?? [])
  // Centred by its ink, moved by whole pixels so glyphs land as they would at the left.
  const dx = options.align === 'left' && options.centerInk ? inkShift(shapes, widthPx) : 0
  for (const { contours, sign } of shapes) {
    for (const c of contours) {
      if (dx !== 0) for (let i = 0; i < c.length; i += 2) c[i] = c[i]! + dx
      coverage.fill(c, sign)
    }
  }
  return {
    columns: box.columns,
    rows: box.rows,
    scale: box.scale,
    alpha: coverage.toAlpha(),
    widthPx,
    heightPx,
    baselinePx,
  }
}

/** Encodes a raster as a PNG in one ink colour, transparent where there is no coverage. */
export function encodePng(raster: Raster, ink: RGB): Uint8Array {
  return encodeAlphaPng(raster.alpha, raster.widthPx, raster.heightPx, ink)
}

/** An op's outlines in pixels, dilated and snapped, and the winding its ink fills with. */
interface Shape {
  contours: Contour[]
  sign: number
}

/**
 * The whole pixels to move every outline by so the ink's horizontal extent is
 * centred in an image `widthPx` wide; 0 for no ink. Never moves ink that fits
 * past either edge.
 */
function inkShift(shapes: readonly Shape[], widthPx: number): number {
  let x0 = Infinity
  let x1 = -Infinity
  for (const { contours } of shapes) {
    for (const c of contours) {
      for (let i = 0; i < c.length; i += 2) {
        if (c[i]! < x0) x0 = c[i]!
        if (c[i]! > x1) x1 = c[i]!
      }
    }
  }
  if (!(x1 > x0)) return 0
  const dx = Math.round((widthPx - (x1 - x0)) / 2 - x0)
  if (x1 - x0 > widthPx) return 0
  return Math.min(Math.max(dx, Math.ceil(-x0 - 1e-9)), Math.floor(widthPx - x1 + 1e-9))
}

function outline(op: DrawOp, toPx: Matrix, dilation: number, ruleMax: number): Shape | undefined {
  let contours: Contour[]
  if (op.type === 'rect') {
    const [k, , , , e, f] = toPx
    const x0 = e + k * Math.min(op.x, op.x + op.width)
    const x1 = e + k * Math.max(op.x, op.x + op.width)
    const y0 = f + k * Math.min(op.y, op.y + op.height)
    const y1 = f + k * Math.max(op.y, op.y + op.height)
    if (!(x1 > x0 && y1 > y0)) return undefined
    contours = [[x0, y0, x1, y0, x1, y1, x0, y1]]
  } else {
    contours = flattenPath(op.d, compose(toPx, op.transform))
  }
  // The op's ink is the side its outlines wind on overall: outer contours
  // dominate the signed area whichever way the font (or a mirroring
  // transform) winds them. Filling with that sign makes every op's ink count
  // positive, so overlapping ops union instead of cancelling.
  let area = 0
  for (const c of contours) area += signedArea(c)
  if (!(Math.abs(area) > 1e-9)) return undefined
  const sign = area > 0 ? 1 : -1
  const out: Contour[] = []
  for (let c of contours) {
    if (dilation > 0) c = dilate(c, dilation, sign)
    snapRule(c, ruleMax)
    out.push(c)
  }
  return { contours: out, sign }
}

function compose(p: Matrix, t: Matrix): Matrix {
  return [
    p[0] * t[0] + p[2] * t[1],
    p[1] * t[0] + p[3] * t[1],
    p[0] * t[2] + p[2] * t[3],
    p[1] * t[2] + p[3] * t[3],
    p[0] * t[4] + p[2] * t[5] + p[4],
    p[1] * t[4] + p[3] * t[5] + p[5],
  ]
}

/** Shoelace area; positive when the contour runs clockwise on screen (y down). */
export function signedArea(c: Contour): number {
  let sum = 0
  const n = c.length
  let x0 = c[n - 2]!
  let y0 = c[n - 1]!
  for (let i = 0; i < n; i += 2) {
    const x1 = c[i]!
    const y1 = c[i + 1]!
    sum += x0 * y1 - x1 * y0
    x0 = x1
    y0 = y1
  }
  return sum / 2
}

/**
 * Moves every edge of `c` by `d` pixels away from the ink (the side `sign`
 * says the ink is on), joining neighbours with miters capped at 2d. Outer
 * contours grow and holes shrink, so strokes thicken by 2d.
 */
export function dilate(c: Contour, d: number, sign: number): Contour {
  // Drop repeated points, which have no edge direction.
  const pts: number[] = []
  for (let i = 0; i < c.length; i += 2) {
    const x = c[i]!
    const y = c[i + 1]!
    const n = pts.length
    if (n >= 2 && Math.abs(x - pts[n - 2]!) < 1e-6 && Math.abs(y - pts[n - 1]!) < 1e-6) continue
    pts.push(x, y)
  }
  while (pts.length >= 4 && Math.abs(pts[0]! - pts[pts.length - 2]!) < 1e-6 && Math.abs(pts[1]! - pts[pts.length - 1]!) < 1e-6) {
    pts.length -= 2
  }
  const n = pts.length / 2
  if (n < 3) return c
  // Outward unit normal of edge i (from point i to i + 1).
  const nx = new Float64Array(n)
  const ny = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const dx = pts[2 * j]! - pts[2 * i]!
    const dy = pts[2 * j + 1]! - pts[2 * i + 1]!
    const len = Math.hypot(dx, dy)
    nx[i] = (sign * dy) / len
    ny[i] = (-sign * dx) / len
  }
  const out: Contour = new Array<number>(2 * n)
  for (let i = 0; i < n; i++) {
    const p = (i + n - 1) % n
    const sx = nx[p]! + nx[i]!
    const sy = ny[p]! + ny[i]!
    const cos1 = 1 + nx[p]! * nx[i]! + ny[p]! * ny[i]!
    // Miter vector (n1 + n2) / (1 + n1·n2); its length 1/cos(θ/2) is capped at 2.
    let mx = 0
    let my = 0
    if (cos1 >= 0.5) {
      mx = sx / cos1
      my = sy / cos1
    } else {
      const len = Math.hypot(sx, sy)
      if (len > 1e-9) {
        mx = (2 * sx) / len
        my = (2 * sy) / len
      }
    }
    out[2 * i] = pts[2 * i]! + d * mx
    out[2 * i + 1] = pts[2 * i + 1]! + d * my
  }
  return out
}

/** Contours up to this thick (px; more at large sizes, see rasterize) and at least twice as long count as rules. */
const RULE_MIN_SNAP = 4
/** …and must fill this much of their bounding box (a disc fills 79 %). */
const RULE_MIN_FILL = 0.9

/**
 * Snaps a rule-like contour (a fraction bar, vinculum, overline, minus or
 * equals bar, a vertical bar) to whole pixels across its thickness: its
 * thickness is rounded to whole pixels (at least one) and it is placed on the
 * rows (or columns) nearest its centre, so it draws as solid pixels instead of
 * two half-covered rows. Other contours are left alone.
 */
export function snapRule(c: Contour, maxThickness = RULE_MIN_SNAP): void {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = 0; i < c.length; i += 2) {
    const x = c[i]!
    const y = c[i + 1]!
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  const w = x1 - x0
  const h = y1 - y0
  if (!(w > 0 && h > 0) || Math.abs(signedArea(c)) < RULE_MIN_FILL * w * h) return
  const axis = h <= maxThickness && w >= 2 * h ? 1 : w <= maxThickness && h >= 2 * w ? 0 : -1
  if (axis < 0) return
  const lo = axis === 1 ? y0 : x0
  const size = axis === 1 ? h : w
  const t = Math.max(1, Math.round(size))
  const to = Math.round(lo + size / 2 - t / 2)
  const f = t / size
  for (let i = axis; i < c.length; i += 2) c[i] = to + (c[i]! - lo) * f
}
