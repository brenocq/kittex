import type { Bitmap } from './bitmap.js'

/*
 * Area-average resampling: each output pixel is the mean of the source area it
 * covers, each source pixel weighted by the fraction of it inside, so a
 * downscale keeps every source pixel's contribution (no aliasing, a thin line
 * fades rather than vanishes). Upscaling is the same rule, which makes it
 * nearest-neighbour with a blended pixel where a source edge falls inside an
 * output pixel.
 *
 * Colour is averaged premultiplied (weighted by alpha) and divided back out,
 * so a transparent pixel's colour, typically black, never darkens an edge.
 *
 * The rows stream: one row of premultiplied sums the width of the source is
 * accumulated per output row, then reduced across, so the transient memory is
 * a row, not a second image.
 */

/** For each output index: the first source index and the normalized weights of the source indices it covers. */
interface Spans {
  first: Int32Array
  offsets: Int32Array
  weights: Float64Array
}

function spans(from: number, to: number): Spans {
  const scale = from / to
  const first = new Int32Array(to)
  const offsets = new Int32Array(to + 1)
  const weights: number[] = []
  for (let o = 0; o < to; o++) {
    const start = o * scale
    const end = Math.min(from, (o + 1) * scale)
    const lo = Math.min(from - 1, Math.floor(start))
    first[o] = lo
    for (let i = lo; i < end && i < from; i++) {
      const w = Math.min(i + 1, end) - Math.max(i, start)
      if (w > 1e-9 || i === lo) weights.push(Math.max(w, 0) / (end - start))
      else break
    }
    offsets[o + 1] = weights.length
  }
  return { first, offsets, weights: Float64Array.from(weights) }
}

export function scaleBitmap(bitmap: Bitmap, widthPx: number, heightPx: number): Bitmap {
  const { width: w, height: h, rgba } = bitmap
  if (!Number.isInteger(widthPx) || !Number.isInteger(heightPx) || widthPx < 1 || heightPx < 1) {
    throw new RangeError(`scaleBitmap: target size ${widthPx}×${heightPx} is not a positive whole size`)
  }
  if (rgba.length !== w * h * 4 || w < 1 || h < 1) throw new RangeError(`scaleBitmap: ${rgba.length} bytes is not a ${w}×${h} RGBA bitmap`)
  if (widthPx === w && heightPx === h) return { width: w, height: h, rgba: rgba.slice() }
  const xs = spans(w, widthPx)
  const ys = spans(h, heightPx)
  const out = new Uint8Array(widthPx * heightPx * 4)
  const row = new Float64Array(w * 4)
  for (let oy = 0; oy < heightPx; oy++) {
    row.fill(0)
    for (let k = ys.offsets[oy]!, sy = ys.first[oy]!; k < ys.offsets[oy + 1]!; k++, sy++) {
      const wy = ys.weights[k]!
      const base = sy * w * 4
      for (let x = 0, i = base; x < w * 4; x += 4, i += 4) {
        const a = rgba[i + 3]! * wy
        row[x] = row[x]! + rgba[i]! * a
        row[x + 1] = row[x + 1]! + rgba[i + 1]! * a
        row[x + 2] = row[x + 2]! + rgba[i + 2]! * a
        row[x + 3] = row[x + 3]! + a
      }
    }
    for (let ox = 0; ox < widthPx; ox++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let k = xs.offsets[ox]!, sx = xs.first[ox]! * 4; k < xs.offsets[ox + 1]!; k++, sx += 4) {
        const wx = xs.weights[k]!
        r += row[sx]! * wx
        g += row[sx + 1]! * wx
        b += row[sx + 2]! * wx
        a += row[sx + 3]! * wx
      }
      const at = (oy * widthPx + ox) * 4
      if (a > 0) {
        out[at] = Math.round(r / a)
        out[at + 1] = Math.round(g / a)
        out[at + 2] = Math.round(b / a)
        out[at + 3] = Math.round(a)
      }
    }
  }
  return { width: widthPx, height: heightPx, rgba: out }
}
