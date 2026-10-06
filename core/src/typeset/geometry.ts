// Affine matrices, SVG path parsing, and the few geometric operations the SVG
// walker needs to turn MathJax's output into plain filled shapes: clipping a
// path to a rectangle (nested <svg> viewports) and outlining strokes (lines,
// frames, ellipses and stroked paths).
import type { Matrix } from '../types.js'

export type Point = readonly [number, number]
/** A closed polygon. */
export type Polygon = Point[]
/** An axis-aligned rectangle, [x0, y0, x1, y1] with x0 ≤ x1 and y0 ≤ y1. */
export type Box = readonly [number, number, number, number]

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

/** m · n: apply n first, then m. */
export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

export function apply(m: Matrix, x: number, y: number): Point {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

export function translate(x: number, y: number): Matrix {
  return [1, 0, 0, 1, x, y]
}

export function scale(sx: number, sy: number): Matrix {
  return [sx, 0, 0, sy, 0, 0]
}

/** Whether m maps axis-aligned rectangles to axis-aligned rectangles (no rotation or skew). */
export function isAxisAligned(m: Matrix): boolean {
  return (m[1] === 0 && m[2] === 0) || (m[0] === 0 && m[3] === 0)
}

/** The bounding box of a rectangle mapped by m. */
export function mapBox(m: Matrix, [x0, y0, x1, y1]: Box): Box {
  const [ax, ay] = apply(m, x0, y0)
  const [bx, by] = apply(m, x1, y1)
  return [Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by)]
}

export function intersect(a: Box, b: Box): Box {
  return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]
}

/**
 * Parses an SVG transform list (translate, scale, rotate, matrix, skewX, skewY).
 * Throws on anything else.
 */
export function parseTransform(text: string): Matrix {
  let m = IDENTITY
  const re = /(\w+)\s*\(([^)]*)\)/g
  for (let match = re.exec(text); match; match = re.exec(text)) {
    const name = match[1]!
    const v = (match[2]!.trim().match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number)
    let t: Matrix
    switch (name) {
      case 'translate':
        t = translate(v[0] ?? 0, v[1] ?? 0)
        break
      case 'scale':
        t = scale(v[0] ?? 1, v[1] ?? v[0] ?? 1)
        break
      case 'matrix':
        if (v.length !== 6) throw new Error(`bad matrix(${match[2]})`)
        t = v as unknown as Matrix
        break
      case 'rotate': {
        const a = ((v[0] ?? 0) * Math.PI) / 180
        const [cx, cy] = [v[1] ?? 0, v[2] ?? 0]
        const r: Matrix = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]
        t = multiply(translate(cx, cy), multiply(r, translate(-cx, -cy)))
        break
      }
      case 'skewX':
        t = [1, 0, Math.tan(((v[0] ?? 0) * Math.PI) / 180), 1, 0, 0]
        break
      case 'skewY':
        t = [1, Math.tan(((v[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0]
        break
      default:
        throw new Error(`unsupported transform ${name}()`)
    }
    m = multiply(m, t)
  }
  return m
}

/** Absolute path segments: M, L, C (two control points and the end), Z. */
export type Segment =
  | { c: 'M'; x: number; y: number }
  | { c: 'L'; x: number; y: number }
  | { c: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { c: 'Z' }

const ARG_COUNT: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }

/** Parses SVG path data into absolute M/L/C/Z segments (quadratics are raised to cubics; arcs become lines). */
export function parsePath(d: string): Segment[] {
  const tokens = d.match(/[a-df-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []
  const out: Segment[] = []
  let i = 0
  let cmd = ''
  let [x, y, sx, sy] = [0, 0, 0, 0]
  // Last control point, for S and T reflections.
  let [cx, cy] = [0, 0]
  let last = ''
  while (i < tokens.length) {
    const token = tokens[i]!
    if (/[a-z]/i.test(token)) {
      cmd = token
      i++
      if (cmd === 'z' || cmd === 'Z') {
        out.push({ c: 'Z' })
        ;[x, y] = [sx, sy]
        last = 'Z'
        continue
      }
    } else if (!cmd) {
      throw new Error('path data does not start with a command')
    }
    const upper = cmd.toUpperCase()
    const n = ARG_COUNT[upper]
    if (n === undefined) throw new Error(`unsupported path command ${cmd}`)
    const v = tokens.slice(i, i + n).map(Number)
    if (v.length < n || v.some(Number.isNaN)) throw new Error('truncated path data')
    i += n
    const rel = cmd !== upper
    const ax = (k: number) => v[k]! + (rel ? x : 0)
    const ay = (k: number) => v[k]! + (rel ? y : 0)
    switch (upper) {
      case 'M':
        ;[x, y] = [ax(0), ay(1)]
        ;[sx, sy] = [x, y]
        out.push({ c: 'M', x, y })
        cmd = rel ? 'l' : 'L'
        break
      case 'L':
        ;[x, y] = [ax(0), ay(1)]
        out.push({ c: 'L', x, y })
        break
      case 'H':
        x = v[0]! + (rel ? x : 0)
        out.push({ c: 'L', x, y })
        break
      case 'V':
        y = v[0]! + (rel ? y : 0)
        out.push({ c: 'L', x, y })
        break
      case 'C':
      case 'S': {
        const [x1, y1] = upper === 'C' ? [ax(0), ay(1)] : last === 'C' ? [2 * x - cx, 2 * y - cy] : [x, y]
        const k = upper === 'C' ? 2 : 0
        const [x2, y2, ex, ey] = [ax(k), ay(k + 1), ax(k + 2), ay(k + 3)]
        out.push({ c: 'C', x1, y1, x2, y2, x: ex, y: ey })
        ;[cx, cy, x, y] = [x2, y2, ex, ey]
        last = 'C'
        continue
      }
      case 'Q':
      case 'T': {
        const [qx, qy] = upper === 'Q' ? [ax(0), ay(1)] : last === 'Q' ? [2 * x - cx, 2 * y - cy] : [x, y]
        const k = upper === 'Q' ? 2 : 0
        const [ex, ey] = [ax(k), ay(k + 1)]
        out.push({ c: 'C', x1: x + (2 / 3) * (qx - x), y1: y + (2 / 3) * (qy - y), x2: ex + (2 / 3) * (qx - ex), y2: ey + (2 / 3) * (qy - ey), x: ex, y: ey })
        ;[cx, cy, x, y] = [qx, qy, ex, ey]
        last = 'Q'
        continue
      }
      case 'A':
        // MathJax's glyphs and notations don't use arcs; a straight line keeps the shape closed.
        ;[x, y] = [ax(5), ay(6)]
        out.push({ c: 'L', x, y })
        break
    }
    last = upper
  }
  return out
}

/** Flattens path segments into polylines (one per subpath), mapped by m. `closed` subpaths end with Z. */
export function flatten(segments: Segment[], m: Matrix = IDENTITY, steps = 8): { points: Point[]; closed: boolean }[] {
  const lines: { points: Point[]; closed: boolean }[] = []
  let current: { points: Point[]; closed: boolean } | undefined
  let [x, y, sx, sy] = [0, 0, 0, 0]
  for (const s of segments) {
    if (s.c === 'M') {
      current = { points: [apply(m, s.x, s.y)], closed: false }
      lines.push(current)
      ;[x, y, sx, sy] = [s.x, s.y, s.x, s.y]
      continue
    }
    if (!current) {
      current = { points: [apply(m, x, y)], closed: false }
      lines.push(current)
    }
    if (s.c === 'Z') {
      current.closed = true
      current = undefined
      ;[x, y] = [sx, sy]
    } else if (s.c === 'L') {
      current.points.push(apply(m, s.x, s.y))
      ;[x, y] = [s.x, s.y]
    } else {
      for (let k = 1; k <= steps; k++) {
        const t = k / steps
        const u = 1 - t
        const px = u * u * u * x + 3 * u * u * t * s.x1 + 3 * u * t * t * s.x2 + t * t * t * s.x
        const py = u * u * u * y + 3 * u * u * t * s.y1 + 3 * u * t * t * s.y2 + t * t * t * s.y
        current.points.push(apply(m, px, py))
      }
      ;[x, y] = [s.x, s.y]
    }
  }
  return lines
}

/** Sutherland–Hodgman clip of a closed polygon to an axis-aligned box; keeps the polygon's orientation. */
export function clipPolygon(polygon: Polygon, [x0, y0, x1, y1]: Box): Polygon {
  let pts = polygon
  const edges: [(p: Point) => boolean, (a: Point, b: Point) => Point][] = [
    [p => p[0] >= x0, (a, b) => lerpAt(a, b, 0, x0)],
    [p => p[0] <= x1, (a, b) => lerpAt(a, b, 0, x1)],
    [p => p[1] >= y0, (a, b) => lerpAt(a, b, 1, y0)],
    [p => p[1] <= y1, (a, b) => lerpAt(a, b, 1, y1)],
  ]
  for (const [inside, cross] of edges) {
    if (pts.length === 0) break
    const next: Point[] = []
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length]!
      const b = pts[i]!
      if (inside(b)) {
        if (!inside(a)) next.push(cross(a, b))
        next.push(b)
      } else if (inside(a)) {
        next.push(cross(a, b))
      }
    }
    pts = next
  }
  return pts
}

function lerpAt(a: Point, b: Point, axis: 0 | 1, value: number): Point {
  const t = (value - a[axis]) / (b[axis] - a[axis])
  return axis === 0 ? [value, a[1] + t * (b[1] - a[1])] : [a[0] + t * (b[0] - a[0]), value]
}

export function signedArea(polygon: Polygon): number {
  let area = 0
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i]!
    const [bx, by] = polygon[(i + 1) % polygon.length]!
    area += ax * by - bx * ay
  }
  return area / 2
}

/** The polygon with the given orientation sign (+1 or -1 signed area). */
export function oriented(polygon: Polygon, sign: 1 | -1): Polygon {
  return Math.sign(signedArea(polygon)) === -sign ? [...polygon].reverse() : polygon
}

/** A rectangle around the segment a–b, `width` wide (butt ends, or square ends extended by width/2). */
export function strokeSegment(a: Point, b: Point, width: number, extend = 0): Polygon {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (len === 0) return []
  const [ux, uy] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]
  const [nx, ny] = [(-uy * width) / 2, (ux * width) / 2]
  const [ex, ey] = [ux * extend, uy * extend]
  return oriented(
    [
      [a[0] - ex + nx, a[1] - ey + ny],
      [b[0] + ex + nx, b[1] + ey + ny],
      [b[0] + ex - nx, b[1] + ey - ny],
      [a[0] - ex - nx, a[1] - ey - ny],
    ],
    1,
  )
}

/** A regular polygon approximating a disc, for round joins and caps. */
export function disc(c: Point, r: number, sides = 12): Polygon {
  const pts: Point[] = []
  for (let k = 0; k < sides; k++) {
    const a = (2 * Math.PI * k) / sides
    pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)])
  }
  return oriented(pts, 1)
}

/** An ellipse as a polygon. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, sides = 48): Polygon {
  const pts: Point[] = []
  for (let k = 0; k < sides; k++) {
    const a = (2 * Math.PI * k) / sides
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)])
  }
  return pts
}

/** SVG path data for polygons. */
export function polygonsToPath(polygons: Polygon[]): string {
  let d = ''
  for (const p of polygons) {
    if (p.length < 3) continue
    d += p.map(([x, y], i) => `${i ? 'L' : 'M'}${fmt(x)} ${fmt(y)}`).join('') + 'Z'
  }
  return d
}

function fmt(n: number): string {
  return String(Math.round(n * 1e5) / 1e5)
}
