import type { Contour } from './path.js'

/**
 * Exact-area anti-aliased polygon fill by signed-area accumulation (the method
 * of font-rs and stb_truetype v2): every edge adds, to the cells of each pixel
 * row it crosses, the signed area it sweeps to its right, and a running sum
 * along the row turns those deltas into each pixel's coverage. Coverage is
 * |sum| clamped to 1, so contours wound the same way union (overlaps never
 * darken twice) and oppositely wound ones cut holes: the nonzero rule.
 */
export class Coverage {
  readonly width: number
  readonly height: number
  /** Row stride of `acc`: two spare cells right of the image take the deltas of edges at x = width. */
  private readonly stride: number
  private readonly acc: Float32Array

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.stride = width + 2
    this.acc = new Float32Array(this.stride * height)
  }

  /** Adds a closed contour. `sign` is +1 or -1: the winding that counts as ink for this contour's shape. */
  fill(contour: Contour, sign: number): void {
    const n = contour.length
    let x0 = contour[n - 2]!
    let y0 = contour[n - 1]!
    for (let i = 0; i < n; i += 2) {
      const x1 = contour[i]!
      const y1 = contour[i + 1]!
      this.line(x0, y0, x1, y1, sign)
      x0 = x1
      y0 = y1
    }
  }

  /** Adds one edge, clipped to the image: the parts left of x = 0 or right of x = width run along that side. */
  line(x0: number, y0: number, x1: number, y1: number, sign: number): void {
    if (y0 === y1) return
    const w = this.width
    if (x0 >= 0 && x1 >= 0 && x0 <= w && x1 <= w) {
      this.edge(x0, y0, x1, y1, sign)
      return
    }
    // Split at the crossings of x = 0 and x = width, then clamp each piece.
    const ts = [0, 1]
    for (const bound of [0, w]) {
      if ((x0 - bound) * (x1 - bound) < 0) ts.push((bound - x0) / (x1 - x0))
    }
    ts.sort((a, b) => a - b)
    for (let i = 1; i < ts.length; i++) {
      const ta = ts[i - 1]!
      const tb = ts[i]!
      const ax = x0 + (x1 - x0) * ta
      const bx = x0 + (x1 - x0) * tb
      const ay = y0 + (y1 - y0) * ta
      const by = y0 + (y1 - y0) * tb
      this.edge(Math.min(w, Math.max(0, ax)), ay, Math.min(w, Math.max(0, bx)), by, sign)
    }
  }

  /** Adds one edge with 0 ≤ x ≤ width; rows outside the image are skipped. */
  private edge(px0: number, py0: number, px1: number, py1: number, sign: number): void {
    if (py0 === py1) return
    let dir = sign
    let x0 = px0, y0 = py0, x1 = px1, y1 = py1
    if (y0 > y1) {
      dir = -sign
      x0 = px1
      y0 = py1
      x1 = px0
      y1 = py0
    }
    const h = this.height
    if (y1 <= 0 || y0 >= h) return
    const acc = this.acc
    const stride = this.stride
    const dxdy = (x1 - x0) / (y1 - y0)
    let x = x0
    if (y0 < 0) x -= y0 * dxdy
    const rowFrom = Math.max(0, Math.floor(y0))
    const rowTo = Math.min(h, Math.ceil(y1))
    for (let row = rowFrom; row < rowTo; row++) {
      const base = row * stride
      const dy = Math.min(row + 1, y1) - Math.max(row, y0)
      const xnext = x + dxdy * dy
      const d = dy * dir
      const xa = x < xnext ? x : xnext
      const xb = x < xnext ? xnext : x
      const xaFloor = Math.floor(xa)
      const xai = xaFloor
      const xbCeil = Math.ceil(xb)
      const xbi = xbCeil
      if (xbi <= xai + 1) {
        // Within one pixel column: a trapezoid, split at the edge's mean x.
        const xmf = 0.5 * (x + xnext) - xaFloor
        acc[base + xai]! += d - d * xmf
        acc[base + xai + 1]! += d * xmf
      } else {
        // Across columns: the area right of the edge grows linearly then quadratically at the ends.
        const s = 1 / (xb - xa)
        const xaf = xa - xaFloor
        const a0 = 0.5 * s * (1 - xaf) * (1 - xaf)
        const xbf = xb - xbCeil + 1
        const am = 0.5 * s * xbf * xbf
        acc[base + xai]! += d * a0
        if (xbi === xai + 2) {
          acc[base + xai + 1]! += d * (1 - a0 - am)
        } else {
          const a1 = s * (1.5 - xaf)
          acc[base + xai + 1]! += d * (a1 - a0)
          for (let xi = xai + 2; xi < xbi - 1; xi++) acc[base + xi]! += d * s
          const a2 = a1 + (xbi - xai - 3) * s
          acc[base + xbi - 1]! += d * (1 - a2 - am)
        }
        acc[base + xbi]! += d * am
      }
      x = xnext
    }
  }

  /** The coverage as bytes (0 to 255), row-major, through `curve` (256 entries) when given. */
  toAlpha(curve?: Uint8Array): Uint8Array {
    const { width: w, height: h, stride, acc } = this
    const out = new Uint8Array(w * h)
    for (let row = 0; row < h; row++) {
      let sum = 0
      const from = row * stride
      const to = row * w
      for (let x = 0; x < w; x++) {
        sum += acc[from + x]!
        const c = sum < 0 ? -sum : sum
        const byte = c >= 1 ? 255 : (c * 255 + 0.5) | 0
        out[to + x] = curve ? curve[byte]! : byte
      }
    }
    return out
  }
}
