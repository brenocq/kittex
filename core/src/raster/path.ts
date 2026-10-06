import type { Matrix } from '../types.js'

/**
 * A closed polygon in pixels, as flat [x0, y0, x1, y1, ...]; the closing edge
 * back to the first point is implied.
 */
export type Contour = number[]

/** Largest distance, in pixels, between a curve and the polyline that replaces it. */
const FLATNESS = 0.05

/**
 * Parses SVG path data (M L H V C S Q T A Z, absolute and relative), maps it
 * through `m` into pixels and flattens its curves into closed contours. Each
 * subpath becomes one contour; open subpaths are closed, as a fill does.
 * Malformed data ends the path at the first unreadable token, like a browser.
 */
export function flattenPath(d: string, m: Matrix): Contour[] {
  const contours: Contour[] = []
  let contour: Contour = []
  const [a, b, c, dd, e, f] = m
  const px = (x: number, y: number) => a * x + c * y + e
  const py = (x: number, y: number) => b * x + dd * y + f

  // Current point, subpath start and the last control point (path units).
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  let ctrlX = 0
  let ctrlY = 0
  let prev = ''

  const finish = () => {
    if (contour.length >= 6) contours.push(contour)
    contour = []
  }
  const begin = () => {
    if (contour.length === 0) contour.push(px(x, y), py(x, y))
  }
  const lineTo = (nx: number, ny: number) => {
    begin()
    contour.push(px(nx, ny), py(nx, ny))
    x = nx
    y = ny
  }
  const quadTo = (x1: number, y1: number, nx: number, ny: number) => {
    begin()
    const p0x = px(x, y), p0y = py(x, y)
    const p1x = px(x1, y1), p1y = py(x1, y1)
    const p2x = px(nx, ny), p2y = py(nx, ny)
    const ddx = p0x - 2 * p1x + p2x
    const ddy = p0y - 2 * p1y + p2y
    const n = Math.min(100, Math.ceil(Math.sqrt(Math.hypot(ddx, ddy) / (4 * FLATNESS))))
    for (let i = 1; i < n; i++) {
      const t = i / n
      const u = 1 - t
      contour.push(u * u * p0x + 2 * u * t * p1x + t * t * p2x, u * u * p0y + 2 * u * t * p1y + t * t * p2y)
    }
    contour.push(p2x, p2y)
    x = nx
    y = ny
  }
  const cubicTo = (x1: number, y1: number, x2: number, y2: number, nx: number, ny: number) => {
    begin()
    const p0x = px(x, y), p0y = py(x, y)
    const p1x = px(x1, y1), p1y = py(x1, y1)
    const p2x = px(x2, y2), p2y = py(x2, y2)
    const p3x = px(nx, ny), p3y = py(nx, ny)
    const dd1 = Math.hypot(p0x - 2 * p1x + p2x, p0y - 2 * p1y + p2y)
    const dd2 = Math.hypot(p1x - 2 * p2x + p3x, p1y - 2 * p2y + p3y)
    const n = Math.min(100, Math.ceil(Math.sqrt((0.75 * Math.max(dd1, dd2)) / FLATNESS)))
    for (let i = 1; i < n; i++) {
      const t = i / n
      const u = 1 - t
      const w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t
      contour.push(w0 * p0x + w1 * p1x + w2 * p2x + w3 * p3x, w0 * p0y + w1 * p1y + w2 * p2y + w3 * p3y)
    }
    contour.push(p3x, p3y)
    x = nx
    y = ny
  }
  const arcTo = (rx: number, ry: number, angle: number, large: boolean, sweep: boolean, nx: number, ny: number) => {
    for (const seg of arcToCubics(x, y, rx, ry, angle, large, sweep, nx, ny)) cubicTo(...seg)
    x = nx
    y = ny
  }

  const s = new Scanner(d)
  let cmd = ''
  for (;;) {
    s.skip()
    if (s.done()) break
    const next = s.command()
    if (next) cmd = next
    else if (!cmd || cmd === 'Z' || cmd === 'z') break
    else if (cmd === 'M') cmd = 'L'
    else if (cmd === 'm') cmd = 'l'
    const rel = cmd === cmd.toLowerCase()
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    const upper = cmd.toUpperCase()
    let cx = NaN
    let cy = NaN
    if (upper === 'Z') {
      finish()
      x = startX
      y = startY
    } else if (upper === 'M') {
      const nx = s.number() + ox
      const ny = s.number() + oy
      if (Number.isNaN(nx + ny)) break
      finish()
      x = startX = nx
      y = startY = ny
    } else if (upper === 'L') {
      const nx = s.number() + ox
      const ny = s.number() + oy
      if (Number.isNaN(nx + ny)) break
      lineTo(nx, ny)
    } else if (upper === 'H') {
      const nx = s.number() + ox
      if (Number.isNaN(nx)) break
      lineTo(nx, y)
    } else if (upper === 'V') {
      const ny = s.number() + oy
      if (Number.isNaN(ny)) break
      lineTo(x, ny)
    } else if (upper === 'C' || upper === 'S') {
      let x1: number
      let y1: number
      if (upper === 'C') {
        x1 = s.number() + ox
        y1 = s.number() + oy
      } else if (prev === 'C' || prev === 'S') {
        x1 = 2 * x - ctrlX
        y1 = 2 * y - ctrlY
      } else {
        x1 = x
        y1 = y
      }
      const x2 = s.number() + ox
      const y2 = s.number() + oy
      const nx = s.number() + ox
      const ny = s.number() + oy
      if (Number.isNaN(x1 + y1 + x2 + y2 + nx + ny)) break
      cubicTo(x1, y1, x2, y2, nx, ny)
      cx = x2
      cy = y2
    } else if (upper === 'Q' || upper === 'T') {
      let x1: number
      let y1: number
      if (upper === 'Q') {
        x1 = s.number() + ox
        y1 = s.number() + oy
      } else if (prev === 'Q' || prev === 'T') {
        x1 = 2 * x - ctrlX
        y1 = 2 * y - ctrlY
      } else {
        x1 = x
        y1 = y
      }
      const nx = s.number() + ox
      const ny = s.number() + oy
      if (Number.isNaN(x1 + y1 + nx + ny)) break
      quadTo(x1, y1, nx, ny)
      cx = x1
      cy = y1
    } else if (upper === 'A') {
      const rx = s.number()
      const ry = s.number()
      const angle = s.number()
      const large = s.flag()
      const sweep = s.flag()
      const nx = s.number() + ox
      const ny = s.number() + oy
      if (Number.isNaN(rx + ry + angle + large + sweep + nx + ny)) break
      arcTo(rx, ry, angle, large === 1, sweep === 1, nx, ny)
    } else {
      break
    }
    ctrlX = cx
    ctrlY = cy
    prev = upper
  }
  finish()
  return contours
}

/** Reads SVG path data: command letters, numbers ("1.5.5-2e3"), and arc flags ("01"). */
class Scanner {
  private i = 0
  constructor(private readonly s: string) {}

  done(): boolean {
    return this.i >= this.s.length
  }

  /** Skips whitespace and commas. */
  skip(): void {
    while (this.i < this.s.length) {
      const ch = this.s.charCodeAt(this.i)
      if (ch === 0x20 || ch === 0x2c || ch === 0x09 || ch === 0x0a || ch === 0x0d || ch === 0x0c) this.i++
      else break
    }
  }

  /** The command letter at the cursor, consumed, or '' when a number is next. */
  command(): string {
    const ch = this.s[this.i]!
    if ('MmLlHhVvCcSsQqTtAaZz'.includes(ch)) {
      this.i++
      return ch
    }
    return ''
  }

  /** The next number, or NaN when there is none. */
  number(): number {
    this.skip()
    const s = this.s
    const start = this.i
    let i = start
    if (s[i] === '+' || s[i] === '-') i++
    const digitsFrom = i
    while (i < s.length && s.charCodeAt(i) >= 0x30 && s.charCodeAt(i) <= 0x39) i++
    if (s[i] === '.') {
      i++
      while (i < s.length && s.charCodeAt(i) >= 0x30 && s.charCodeAt(i) <= 0x39) i++
    }
    if (i === digitsFrom || (i === digitsFrom + 1 && s[digitsFrom] === '.')) return NaN
    if (s[i] === 'e' || s[i] === 'E') {
      let j = i + 1
      if (s[j] === '+' || s[j] === '-') j++
      const expFrom = j
      while (j < s.length && s.charCodeAt(j) >= 0x30 && s.charCodeAt(j) <= 0x39) j++
      if (j > expFrom) i = j
    }
    this.i = i
    return Number(s.slice(start, i))
  }

  /** An arc flag: a single 0 or 1, which may be packed against what follows. */
  flag(): number {
    this.skip()
    const ch = this.s[this.i]
    if (ch === '0' || ch === '1') {
      this.i++
      return ch === '1' ? 1 : 0
    }
    return NaN
  }
}

type Cubic = [number, number, number, number, number, number]

/** An SVG elliptical arc as cubic Béziers of at most 90° each (SVG 1.1 appendix F.6). */
function arcToCubics(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  angle: number,
  large: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
): Cubic[] {
  if (x1 === x2 && y1 === y2) return []
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]]
  const phi = (angle * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const hx = (x1 - x2) / 2
  const hy = (y1 - y2) / 2
  const x1p = cos * hx + sin * hy
  const y1p = -sin * hx + cos * hy
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lambda > 1) {
    rx *= Math.sqrt(lambda)
    ry *= Math.sqrt(lambda)
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
  let k = Math.sqrt(Math.max(0, num / den))
  if (large === sweep) k = -k
  const cxp = (k * rx * y1p) / ry
  const cyp = (-k * ry * x1p) / rx
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2
  const vecAngle = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
  const theta = vecAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
  let delta = vecAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
  if (!sweep && delta > 0) delta -= 2 * Math.PI
  if (sweep && delta < 0) delta += 2 * Math.PI
  const n = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9))
  const step = delta / n
  const t = (4 / 3) * Math.tan(step / 4)
  const point = (u: number): [number, number, number, number] => {
    const cu = Math.cos(u)
    const su = Math.sin(u)
    // The point on the ellipse and its derivative, rotated into place.
    return [
      cx + rx * cu * cos - ry * su * sin,
      cy + rx * cu * sin + ry * su * cos,
      -rx * su * cos - ry * cu * sin,
      -rx * su * sin + ry * cu * cos,
    ]
  }
  const out: Cubic[] = []
  let [ax, ay, adx, ady] = point(theta)
  for (let i = 1; i <= n; i++) {
    const [bx, by, bdx, bdy] = point(theta + i * step)
    const endX = i === n ? x2 : bx
    const endY = i === n ? y2 : by
    out.push([ax + t * adx, ay + t * ady, endX - t * bdx, endY - t * bdy, endX, endY])
    ax = endX
    ay = endY
    adx = bdx
    ady = bdy
  }
  return out
}
