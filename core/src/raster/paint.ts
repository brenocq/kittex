import type { RGB } from '../types.js'
import { inkAlpha } from './png.js'

/*
 * A picture's pixels: each shape's coverage (fill.ts) painted over the ones
 * before it in its colour, source-over, as SVG paints. Kept premultiplied in
 * bytes. `erase` paints the background back (TeX's white: the terminal's own
 * background shows through, which is what white paper is in a terminal).
 */
export class Canvas {
  /** Premultiplied RGBA, row-major. */
  readonly pixels: Uint8Array

  constructor(readonly width: number, readonly height: number) {
    this.pixels = new Uint8Array(width * height * 4)
  }

  /**
   * Paints `coverage` (w × h bytes, its top-left at x0, y0 in the canvas) in
   * `color` at `opacity`, through `mask` (the canvas's size, a clip) when given.
   */
  paint(coverage: Uint8Array, x0: number, y0: number, w: number, h: number, color: RGB | 'erase', opacity: number, mask?: Uint8Array): void {
    const px = this.pixels
    const W = this.width
    const erase = color === 'erase'
    const r = erase ? 0 : color.r
    const g = erase ? 0 : color.g
    const b = erase ? 0 : color.b
    const k = Math.min(1, Math.max(0, opacity)) / 255
    for (let y = 0; y < h; y++) {
      const cy = y0 + y
      if (cy < 0 || cy >= this.height) continue
      for (let x = 0; x < w; x++) {
        const c = coverage[y * w + x]!
        if (c === 0) continue
        const cx = x0 + x
        if (cx < 0 || cx >= W) continue
        const at = cy * W + cx
        let a = c * k
        if (mask) {
          const m = mask[at]!
          if (m === 0) continue
          a = (a * m) / 255
        }
        const keep = 1 - a
        const i = at * 4
        if (erase) {
          px[i] = px[i]! * keep + 0.5
          px[i + 1] = px[i + 1]! * keep + 0.5
          px[i + 2] = px[i + 2]! * keep + 0.5
          px[i + 3] = px[i + 3]! * keep + 0.5
        } else {
          px[i] = r * a + px[i]! * keep + 0.5
          px[i + 1] = g * a + px[i + 1]! * keep + 0.5
          px[i + 2] = b * a + px[i + 2]! * keep + 0.5
          px[i + 3] = 255 * a + px[i + 3]! * keep + 0.5
        }
      }
    }
  }

  /**
   * The pixels with straight alpha, for a PNG; with `over`, each pixel's
   * alpha corrected for its colour as the terminal corrects text blended over
   * that background (inkAlpha: Ghostty's linear-corrected blending).
   */
  straight(over?: RGB): Uint8Array {
    const px = this.pixels
    const out = new Uint8Array(px.length)
    const tables = new Map<number, Uint8Array>()
    for (let i = 0; i < px.length; i += 4) {
      const a = px[i + 3]!
      if (a === 0) continue
      // Integer arithmetic: Math is a global lookup per call in the sandbox's context.
      const half = a >> 1
      const r0 = ((px[i]! * 255 + half) / a) | 0
      const g0 = ((px[i + 1]! * 255 + half) / a) | 0
      const b0 = ((px[i + 2]! * 255 + half) / a) | 0
      const r = r0 > 255 ? 255 : r0
      const g = g0 > 255 ? 255 : g0
      const b = b0 > 255 ? 255 : b0
      out[i] = r
      out[i + 1] = g
      out[i + 2] = b
      if (!over || a === 255) {
        out[i + 3] = a
        continue
      }
      const key = (r << 16) | (g << 8) | b
      let table = tables.get(key)
      if (!table) {
        if (tables.size >= 4096) {
          out[i + 3] = Math.round(255 * inkAlpha(a / 255, { r, g, b }, over))
          continue
        }
        table = correctionTable({ r, g, b }, over)
        tables.set(key, table)
      }
      out[i + 3] = table[a]!
    }
    return out
  }
}

function correctionTable(color: RGB, over: RGB): Uint8Array {
  const table = new Uint8Array(256)
  for (let a = 0; a < 256; a++) table[a] = a === 0 || a === 255 ? a : Math.round(255 * inkAlpha(a / 255, color, over))
  return table
}
