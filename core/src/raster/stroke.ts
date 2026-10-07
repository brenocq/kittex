import type { Contour, Subpath } from './path.js'

/*
 * Strokes as filled outlines, in pixels: each segment of a flattened subpath
 * is a quad as wide as the line, each vertex gets its join (a miter, a bevel
 * or a round), each open end its cap, and every piece is wound the same way,
 * so under the nonzero fill (fill.ts) the pieces union into the stroke. Dashes
 * cut the subpaths into pieces first, each with its own caps (SVG's rules).
 */

export interface StrokeGeometry {
  /** The line's width, in pixels. */
  width: number
  cap: 'butt' | 'round' | 'square'
  join: 'miter' | 'round' | 'bevel'
  miterLimit: number
  /** Dash and gap lengths in pixels, in turn (even count); absent for a solid line. */
  dash?: readonly number[]
  dashOffset?: number
}

/** A dash pattern shorter than this (pixels) draws as a solid line: its dashes would blur into one. */
const MIN_DASH_PERIOD = 0.5
/** Dashes one stroke may cut into, at most; past it the stroke is solid. */
const MAX_DASHES = 20_000
/** A join whose outer gap is narrower than this (pixels) is left out; up to ROUND_AS_BEVEL a round join is drawn as a bevel. */
const NO_JOIN = 0.02
const ROUND_AS_BEVEL = 0.25
/** Points closer than this (pixels, on both axes) are one point. */
const SAME_POINT = 0.01
/** The largest distance (pixels) from a round join's or cap's arc to its polygon. */
const ARC_FLATNESS = 0.05

/** A stroke's outline as contours, all wound positively (clockwise on screen). */
export function strokeOutlines(subpaths: readonly Subpath[], g: StrokeGeometry): Contour[] {
  const hw = g.width / 2
  if (!(hw > 0)) return []
  const out: Contour[] = []
  for (const piece of dashed(subpaths, g)) strokePiece(piece, hw, g, out)
  for (const c of out) if (area(c) < 0) reverse(c)
  return out
}

/** The subpaths cut by the dash pattern (open pieces), or as they are for a solid line. */
function dashed(subpaths: readonly Subpath[], g: StrokeGeometry): Subpath[] {
  const dash = g.dash
  if (!dash || dash.length === 0) return [...subpaths]
  const period = dash.reduce((sum, n) => sum + n, 0)
  if (!(period >= MIN_DASH_PERIOD)) return [...subpaths]
  const pieces: Subpath[] = []
  for (const sub of subpaths) {
    const pts = sub.points.slice()
    if (sub.closed) pts.push(pts[0]!, pts[1]!)
    // Where in the pattern the subpath starts (each subpath starts it again).
    let phase = (((g.dashOffset ?? 0) % period) + period) % period
    let k = 0
    while (phase >= dash[k]!) {
      phase -= dash[k]!
      k = (k + 1) % dash.length
    }
    let left = dash[k]! - phase
    let on = k % 2 === 0
    let current: number[] = on ? [pts[0]!, pts[1]!] : []
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const x0 = pts[i]!, y0 = pts[i + 1]!, x1 = pts[i + 2]!, y1 = pts[i + 3]!
      const len = Math.hypot(x1 - x0, y1 - y0)
      let at = 0
      while (len - at > left) {
        at += left
        const t = at / len
        const x = x0 + (x1 - x0) * t
        const y = y0 + (y1 - y0) * t
        if (on) {
          current.push(x, y)
          pieces.push({ points: current, closed: false })
          if (pieces.length > MAX_DASHES) return [...subpaths]
          current = []
        } else {
          current = [x, y]
        }
        on = !on
        k = (k + 1) % dash.length
        left = dash[k]!
      }
      left -= len - at
      if (on) current.push(x1, y1)
    }
    if (on && current.length >= 4) pieces.push({ points: current, closed: false })
  }
  return pieces
}

function strokePiece(sub: Subpath, hw: number, g: StrokeGeometry, out: Contour[]): void {
  // Points without repeats: a segment much shorter than a pixel has no direction worth joining at.
  const pts: number[] = []
  for (let i = 0; i + 1 < sub.points.length; i += 2) {
    const x = sub.points[i]!
    const y = sub.points[i + 1]!
    const n = pts.length
    if (n >= 2 && Math.abs(x - pts[n - 2]!) < SAME_POINT && Math.abs(y - pts[n - 1]!) < SAME_POINT) continue
    pts.push(x, y)
  }
  let closed = sub.closed
  if (closed && pts.length >= 4 && Math.abs(pts[0]! - pts[pts.length - 2]!) < SAME_POINT && Math.abs(pts[1]! - pts[pts.length - 1]!) < SAME_POINT) pts.length -= 2
  const n = pts.length / 2
  if (n < 2) {
    // A zero-length subpath: a dot where its cap is round or square.
    if (n === 1 && g.cap !== 'butt' && sub.points.length >= 4) {
      const x = pts[0]!, y = pts[1]!
      out.push(g.cap === 'round' ? circle(x, y, hw) : [x - hw, y - hw, x + hw, y - hw, x + hw, y + hw, x - hw, y + hw])
    }
    return
  }
  if (n === 2) closed = false
  const segments = closed ? n : n - 1
  // Unit directions of the segments.
  const dx = new Float64Array(segments)
  const dy = new Float64Array(segments)
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % n
    const ex = pts[2 * j]! - pts[2 * i]!
    const ey = pts[2 * j + 1]! - pts[2 * i + 1]!
    const len = Math.hypot(ex, ey)
    dx[i] = ex / len
    dy[i] = ey / len
  }
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % n
    // The normal (-dy, dx), half the width out to each side.
    const nx = -dy[i]! * hw
    const ny = dx[i]! * hw
    const ax = pts[2 * i]!, ay = pts[2 * i + 1]!, bx = pts[2 * j]!, by = pts[2 * j + 1]!
    out.push([ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny])
  }
  const first = closed ? 0 : 1
  const last = closed ? n - 1 : n - 2
  for (let v = first; v <= last; v++) {
    const into = (v - 1 + segments) % segments
    const from = v % segments
    join(pts[2 * v]!, pts[2 * v + 1]!, dx[into]!, dy[into]!, dx[from]!, dy[from]!, hw, g, out)
  }
  if (!closed) {
    cap(pts[0]!, pts[1]!, -dx[0]!, -dy[0]!, hw, g.cap, out)
    cap(pts[2 * n - 2]!, pts[2 * n - 1]!, dx[segments - 1]!, dy[segments - 1]!, hw, g.cap, out)
  }
}

/** The join at (x, y) between a segment going (ix, iy) and the next going (ox, oy), unit directions. */
function join(x: number, y: number, ix: number, iy: number, ox: number, oy: number, hw: number, g: StrokeGeometry, out: Contour[]): void {
  const cross = ix * oy - iy * ox
  const dot = ix * ox + iy * oy
  const turn = Math.atan2(Math.abs(cross), dot)
  if (hw * turn < NO_JOIN) return
  // The outer side is away from the turn: the normals (-dy, dx) point into it when turning the other way.
  const s = cross > 0 ? -1 : 1
  const ax = x + s * -iy * hw
  const ay = y + s * ix * hw
  const bx = x + s * -oy * hw
  const by = y + s * ox * hw
  if (g.join === 'round' && hw * turn > ROUND_AS_BEVEL) {
    out.push(circle(x, y, hw))
    return
  }
  if (g.join === 'miter') {
    // Miter length over the line width: 1 / sin(φ / 2), φ the angle between the segments.
    const ratio = 1 / Math.sqrt(Math.max(1e-12, (1 + dot) / 2))
    if (ratio <= g.miterLimit) {
      let mx = -iy - oy
      let my = ix + ox
      const len = Math.hypot(mx, my)
      if (len > 1e-9) {
        mx = (mx / len) * s * hw * ratio
        my = (my / len) * s * hw * ratio
        out.push([x, y, ax, ay, x + mx, y + my, bx, by])
        return
      }
    }
  }
  out.push([x, y, ax, ay, bx, by])
}

/** The cap at an open end (x, y) of a line leaving it in direction (dx, dy) outward. */
function cap(x: number, y: number, dx: number, dy: number, hw: number, kind: StrokeGeometry['cap'], out: Contour[]): void {
  if (kind === 'round') {
    out.push(circle(x, y, hw))
  } else if (kind === 'square') {
    const nx = -dy * hw
    const ny = dx * hw
    const ex = x + dx * hw
    const ey = y + dy * hw
    out.push([x + nx, y + ny, ex + nx, ey + ny, ex - nx, ey - ny, x - nx, y - ny])
  }
}

function circle(x: number, y: number, r: number): Contour {
  const k = r <= ARC_FLATNESS ? 6 : Math.min(128, Math.max(6, Math.ceil(Math.PI / Math.acos(1 - ARC_FLATNESS / r))))
  const c: Contour = []
  for (let i = 0; i < k; i++) {
    const t = (2 * Math.PI * i) / k
    c.push(x + r * Math.cos(t), y + r * Math.sin(t))
  }
  return c
}

function area(c: Contour): number {
  let sum = 0
  const n = c.length
  let x0 = c[n - 2]!
  let y0 = c[n - 1]!
  for (let i = 0; i < n; i += 2) {
    sum += x0 * c[i + 1]! - c[i]! * y0
    x0 = c[i]!
    y0 = c[i + 1]!
  }
  return sum / 2
}

function reverse(c: Contour): void {
  for (let i = 0, j = c.length - 2; i < j; i += 2, j -= 2) {
    const x = c[i]!
    const y = c[i + 1]!
    c[i] = c[j]!
    c[i + 1] = c[j + 1]!
    c[j] = x
    c[j + 1] = y
  }
}

/**
 * Snaps a stroke's axis-aligned segments to the pixel grid: the line's
 * coordinate across each such segment goes to a pixel centre (an odd whole
 * width) or a pixel edge (an even one), so a plot's axes, ticks and grid
 * lines draw as solid rows and columns instead of two half-covered ones.
 * Returns the whole width the caller strokes them with, or `width` when no
 * segment is axis-aligned. Moves vertices in place.
 */
export function snapStroke(subpaths: Subpath[], width: number): number {
  const whole = Math.max(1, Math.round(width))
  const at = (v: number) => (whole % 2 === 1 ? Math.floor(v) + 0.5 : Math.round(v))
  let snapped = false
  for (const sub of subpaths) {
    const p = sub.points
    // A closed subpath that ends where it starts: the end is the start (snapped as one point).
    if (sub.closed && p.length >= 6 && Math.abs(p[0]! - p[p.length - 2]!) < SAME_POINT && Math.abs(p[1]! - p[p.length - 1]!) < SAME_POINT) p.length -= 2
    const n = p.length / 2
    const segments = sub.closed ? n : n - 1
    const snapX = new Uint8Array(n)
    const snapY = new Uint8Array(n)
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % n
      const ex = p[2 * j]! - p[2 * i]!
      const ey = p[2 * j + 1]! - p[2 * i + 1]!
      const len = Math.hypot(ex, ey)
      if (!(len > 0)) continue
      if (Math.abs(ey) < 1e-3 * len) snapY[i] = snapY[j] = 1
      else if (Math.abs(ex) < 1e-3 * len) snapX[i] = snapX[j] = 1
    }
    for (let i = 0; i < n; i++) {
      if (snapX[i]) p[2 * i] = at(p[2 * i]!)
      if (snapY[i]) p[2 * i + 1] = at(p[2 * i + 1]!)
      if (snapX[i] || snapY[i]) snapped = true
    }
  }
  return snapped ? whole : width
}
