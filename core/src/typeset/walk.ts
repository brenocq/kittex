// Flattens MathJax's SVG output (a liteAdaptor tree, fontCache 'none') into
// DrawOps in em: every <g>/<svg> transform and viewport is folded into each
// op's matrix, nested <svg> viewports (stretchy delimiter extenders, tagged
// tables) are clipped geometrically, and strokes (lines, frames, ellipses) are
// outlined as filled polygons. Colours are ignored: everything is one ink.
import type { LiteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js'
import type { LiteElement, LiteNode } from '@mathjax/src/js/adaptors/lite/Element.js'
import type { DrawOp, Matrix } from '../types.js'
import {
  apply,
  type Box,
  clipPolygon,
  disc,
  ellipse,
  flatten,
  intersect,
  isAxisAligned,
  mapBox,
  multiply,
  oriented,
  parsePath,
  parseTransform,
  type Polygon,
  polygonsToPath,
  scale,
  strokeSegment,
  translate,
} from './geometry.js'

export interface WalkOptions {
  /** The size of 1ex in em (MathJax sizes its outer <svg> in ex). */
  exEm: number
  /** The CSS pixels per em MathJax laid out with (an outer <svg> without a viewBox works in px). */
  emPx: number
  /** The formula's width in em: the size of an outer <svg> that is 100% wide (tagged equations). */
  width: number
  /** The formula's height above the baseline in em: the origin of an outer <svg> without a viewBox. */
  height: number
}

/** Thrown for SVG content that cannot be drawn as paths (text in a font we don't carry, images, HTML). */
export class UndrawableError extends Error {}

interface State {
  /** User units of this element to em. */
  m: Matrix
  /** Clip rectangle in em, if any. */
  clip: Box | null
  /** Size of the nearest viewport, in current user units (for percentages). */
  vw: number
  vh: number
}

/** Walks the outer <svg> MathJax produced and returns its ops in em, origin at the left end of the baseline. */
export function walkSvg(adaptor: LiteAdaptor, svg: LiteElement, options: WalkOptions): DrawOp[] {
  const ops: DrawOp[] = []
  const { emPx } = options
  // The outer viewport in CSS px.
  const width = length(adaptor.getAttribute(svg, 'width'), options.width * emPx, options.exEm * emPx)
  const height = length(adaptor.getAttribute(svg, 'height'), 0, options.exEm * emPx)
  const viewBox = numbers(adaptor.getAttribute(svg, 'viewBox'))
  let m: Matrix
  let vw: number
  let vh: number
  if (viewBox.length === 4) {
    // Ordinary output: the viewBox is in 1/1000 em (MathJax's own unit, exact,
    // unlike the size in ex it rounds), its (0, 0) the baseline's left end.
    m = scale(1 / 1000, 1 / 1000)
    ;[vw, vh] = [viewBox[2]!, viewBox[3]!]
  } else {
    // A 100%-wide svg (a tagged equation, forced line breaks): user units are px
    // from the top-left corner.
    m = [1 / emPx, 0, 0, 1 / emPx, 0, -options.height]
    ;[vw, vh] = [width, height]
  }
  walkChildren(adaptor, svg, { m, clip: null, vw, vh }, ops)
  return ops
}

function walkChildren(adaptor: LiteAdaptor, node: LiteElement, state: State, ops: DrawOp[]) {
  for (const child of adaptor.childNodes(node) as LiteNode[]) {
    if (!('kind' in child) || child.kind === '#text' || child.kind === '#comment') continue
    walk(adaptor, child as LiteElement, state, ops)
  }
}

function walk(adaptor: LiteAdaptor, el: LiteElement, parent: State, ops: DrawOp[]) {
  const kind = adaptor.kind(el)
  const transform = adaptor.getAttribute(el, 'transform')
  const state: State = transform ? { ...parent, m: multiply(parent.m, parseTransform(transform)) } : parent
  switch (kind) {
    case 'g':
    case 'a':
      walkChildren(adaptor, el, state, ops)
      return
    case 'svg':
      walkChildren(adaptor, el, nestedViewport(adaptor, el, state), ops)
      return
    // Shapes are filled unless fill="none", and stroked when they have a stroke
    // width (the root sets stroke-width 0; glyphs' CSS "blacker" stroke is left
    // to the rasterizer's weight).
    case 'path': {
      const d = adaptor.getAttribute(el, 'd')
      if (!d) return
      if (!isUnfilled(adaptor, el)) {
        if (state.clip) emitPolygons(flatten(parsePath(d)).map(l => l.points), state, ops)
        else ops.push({ type: 'path', d, transform: state.m })
      }
      const stroke = strokeWidth(adaptor, el)
      if (stroke > 0) emitPolygons(strokePath(d, stroke), state, ops)
      return
    }
    case 'rect': {
      // A background (\colorbox, mathbackground) is not ink.
      if (adaptor.getAttribute(el, 'data-bgcolor') != null) return
      const x = num(adaptor.getAttribute(el, 'x'))
      const y = num(adaptor.getAttribute(el, 'y'))
      const w = num(adaptor.getAttribute(el, 'width'))
      const h = num(adaptor.getAttribute(el, 'height'))
      if (!isUnfilled(adaptor, el) && w > 0 && h > 0) emitRect([x, y, x + w, y + h], state, ops)
      const stroke = strokeWidth(adaptor, el)
      if (stroke > 0) emitPolygons(frame(x, y, w, h, stroke), state, ops)
      return
    }
    case 'line': {
      const stroke = strokeWidth(adaptor, el)
      if (stroke <= 0) return
      const a = [num(adaptor.getAttribute(el, 'x1')), num(adaptor.getAttribute(el, 'y1'))] as const
      const b = [num(adaptor.getAttribute(el, 'x2')), num(adaptor.getAttribute(el, 'y2'))] as const
      const dashes = dashArray(adaptor, el, stroke)
      const square = adaptor.getAttribute(el, 'stroke-linecap') === 'square'
      emitPolygons(dashes ? dashedSegment(a, b, stroke, dashes) : [strokeSegment(a, b, stroke, square ? stroke / 2 : 0)], state, ops)
      return
    }
    case 'ellipse':
    case 'circle': {
      const cx = num(adaptor.getAttribute(el, 'cx'))
      const cy = num(adaptor.getAttribute(el, 'cy'))
      const rx = num(adaptor.getAttribute(el, kind === 'circle' ? 'r' : 'rx'))
      const ry = kind === 'circle' ? rx : num(adaptor.getAttribute(el, 'ry'))
      if (!isUnfilled(adaptor, el)) emitPolygons([ellipse(cx, cy, rx, ry)], state, ops)
      const t = strokeWidth(adaptor, el) / 2
      if (t > 0) {
        const ring = [oriented(ellipse(cx, cy, rx + t, ry + t), 1), oriented(ellipse(cx, cy, Math.max(0, rx - t), Math.max(0, ry - t)), -1)]
        emitPolygons(ring, state, ops)
      }
      return
    }
    case 'polygon':
    case 'polyline': {
      const v = numbers(adaptor.getAttribute(el, 'points'))
      const pts: [number, number][] = []
      for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i]!, v[i + 1]!])
      if (!isUnfilled(adaptor, el)) emitPolygons([pts], state, ops)
      const stroke = strokeWidth(adaptor, el)
      if (stroke > 0) emitPolygons(strokePolyline(pts, kind === 'polygon', stroke), state, ops)
      return
    }
    case 'title':
    case 'desc':
    case 'defs':
    case 'style':
      return
    case 'text': {
      const text = textContent(adaptor, el)
      if (text.trim() === '') return
      const code = [...text].map(c => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`).join(' ')
      throw new UndrawableError(`no glyph for "${text}" (${code}) in the bundled font`)
    }
    default:
      throw new UndrawableError(`cannot draw <${kind}>`)
  }
}

/** The state inside a nested <svg>: its viewport mapping and clip. */
function nestedViewport(adaptor: LiteAdaptor, el: LiteElement, parent: State): State {
  const x = length(adaptor.getAttribute(el, 'x'), parent.vw, 0)
  const y = length(adaptor.getAttribute(el, 'y'), parent.vh, 0)
  const w = length(adaptor.getAttribute(el, 'width') ?? '100%', parent.vw, 0)
  const h = length(adaptor.getAttribute(el, 'height') ?? '100%', parent.vh, 0)
  const viewBox = numbers(adaptor.getAttribute(el, 'viewBox'))
  let inner: Matrix = translate(x, y)
  let [vw, vh] = [w, h]
  if (viewBox.length === 4) {
    inner = viewBoxMatrix([x, y, w, h], viewBox as [number, number, number, number], adaptor.getAttribute(el, 'preserveAspectRatio'))
    ;[vw, vh] = [viewBox[2]!, viewBox[3]!]
  }
  let clip = parent.clip
  // A nested <svg> clips to its viewport, except MathJax's tagged-table pieces,
  // which its stylesheet lets overflow.
  const overflow = adaptor.getAttribute(el, 'overflow') ?? adaptor.getStyle(el, 'overflow')
  const visible = overflow === 'visible' || adaptor.getAttribute(el, 'data-table') != null || adaptor.getAttribute(el, 'data-labels') != null
  if (!visible && isAxisAligned(parent.m)) {
    const box = mapBox(parent.m, [x, y, x + w, y + h])
    clip = clip ? intersect(clip, box) : box
  }
  return { m: multiply(parent.m, inner), clip, vw, vh }
}

/** The matrix from a viewBox to a viewport [x, y, w, h], per preserveAspectRatio. */
function viewBoxMatrix([x, y, w, h]: [number, number, number, number], [vx, vy, vw, vh]: [number, number, number, number], par: string | null | undefined): Matrix {
  let sx = vw ? w / vw : 1
  let sy = vh ? h / vh : 1
  const [align = 'xMidYMid', mode = 'meet'] = (par ?? '').trim().split(/\s+/).filter(Boolean)
  let tx = x - vx * sx
  let ty = y - vy * sy
  if (align !== 'none') {
    const s = mode === 'slice' ? Math.max(sx, sy) : Math.min(sx, sy)
    ;[sx, sy] = [s, s]
    const xAlign = align.slice(0, 4)
    const yAlign = align.slice(4)
    const dx = w - vw * s
    const dy = h - vh * s
    tx = x - vx * s + (xAlign === 'xMid' ? dx / 2 : xAlign === 'xMax' ? dx : 0)
    ty = y - vy * s + (yAlign === 'YMid' ? dy / 2 : yAlign === 'YMax' ? dy : 0)
  }
  return [sx, 0, 0, sy, tx, ty]
}

function emitRect(box: Box, state: State, ops: DrawOp[]) {
  if (isAxisAligned(state.m)) {
    let r = mapBox(state.m, box)
    if (state.clip) r = intersect(r, state.clip)
    if (r[2] > r[0] && r[3] > r[1]) ops.push({ type: 'rect', x: r[0], y: r[1], width: r[2] - r[0], height: r[3] - r[1] })
    return
  }
  const [x0, y0, x1, y1] = box
  emitPolygons(
    [
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ],
    ],
    state,
    ops,
  )
}

/** Polygons in user units, mapped to em, clipped, as one path op with an identity transform. */
function emitPolygons(polygons: Polygon[], state: State, ops: DrawOp[]) {
  let mapped = polygons.map(p => p.map(([x, y]) => apply(state.m, x, y)))
  if (state.clip) {
    const clip = state.clip
    mapped = mapped.map(p => clipPolygon(p, clip))
  }
  const d = polygonsToPath(mapped)
  if (d) ops.push({ type: 'path', d, transform: [1, 0, 0, 1, 0, 0] })
}

/** A rectangle outline of the given stroke width centred on the rectangle's edges, as an outer and an inner (hole) polygon. */
function frame(x: number, y: number, w: number, h: number, t: number): Polygon[] {
  const o = t / 2
  const outer: Polygon = [
    [x - o, y - o],
    [x + w + o, y - o],
    [x + w + o, y + h + o],
    [x - o, y + h + o],
  ]
  if (w - t <= 0 || h - t <= 0) return [oriented(outer, 1)]
  const inner: Polygon = [
    [x + o, y + o],
    [x + w - o, y + o],
    [x + w - o, y + h - o],
    [x + o, y + h - o],
  ]
  return [oriented(outer, 1), oriented(inner, -1)]
}

function strokePath(d: string, width: number): Polygon[] {
  return flatten(parsePath(d)).flatMap(line => strokePolyline(line.points, line.closed, width))
}

/** Segments as rectangles plus round joins, all with the same orientation so they union under nonzero. */
function strokePolyline(points: readonly (readonly [number, number])[], closed: boolean, width: number): Polygon[] {
  const out: Polygon[] = []
  const n = points.length
  for (let i = 0; i + 1 < n; i++) out.push(strokeSegment(points[i]!, points[i + 1]!, width))
  if (closed && n > 2) out.push(strokeSegment(points[n - 1]!, points[0]!, width))
  for (const p of points) out.push(disc(p, width / 2))
  return out.filter(p => p.length > 2)
}

function isUnfilled(adaptor: LiteAdaptor, el: LiteElement): boolean {
  return (adaptor.getAttribute(el, 'fill') ?? adaptor.getStyle(el, 'fill')) === 'none' || isTableRule(adaptor, el)
}

/** MathJax's table rules (data-line, data-frame) take their width from a stylesheet: 0.07 em unless given. */
const TABLE_RULE = 70

function strokeWidth(adaptor: LiteAdaptor, el: LiteElement): number {
  const value = adaptor.getAttribute(el, 'stroke-width') ?? adaptor.getStyle(el, 'stroke-width')
  if (value) return num(value)
  if (isTableRule(adaptor, el)) {
    const thickness = adaptor.getAttribute(el, 'stroke-thickness')
    return thickness ? num(thickness) : TABLE_RULE
  }
  return 0
}

function isTableRule(adaptor: LiteAdaptor, el: LiteElement): boolean {
  return adaptor.getAttribute(el, 'data-line') != null || adaptor.getAttribute(el, 'data-frame') != null
}

/** The dash pattern of a dashed or dotted rule, [dash, gap] in user units (a 0 dash is a dot). */
function dashArray(adaptor: LiteAdaptor, el: LiteElement, stroke: number): [number, number] | null {
  const explicit = adaptor.getAttribute(el, 'stroke-dasharray')
  const classes = adaptor.getAttribute(el, 'class') ?? ''
  if (explicit) {
    const v = numbers(explicit)
    if (v.length === 1 && v[0]! > 0) return [v[0]!, v[0]!]
    if (v.length >= 2 && v[0]! + v[1]! > 0) return [v[0]!, v[1]!]
    return null
  }
  if (/\bmjx-dashed\b/.test(classes)) return [2 * stroke, 2 * stroke]
  if (/\bmjx-dotted\b/.test(classes)) return [0, 2 * stroke]
  return null
}

/** A dashed line as rectangles (dots, for a 0-length dash, as discs). */
function dashedSegment(a: readonly [number, number], b: readonly [number, number], width: number, [dash, gap]: [number, number]): Polygon[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const period = dash + gap
  if (len === 0 || period <= 0) return []
  const at = (t: number): [number, number] => [a[0] + ((b[0] - a[0]) * t) / len, a[1] + ((b[1] - a[1]) * t) / len]
  const out: Polygon[] = []
  for (let t = 0; t < len && out.length < 1000; t += period) {
    if (dash === 0) out.push(disc(at(t), width / 2, 8))
    else out.push(strokeSegment(at(t), at(Math.min(len, t + dash)), width))
  }
  return out.filter(p => p.length > 2)
}

function textContent(adaptor: LiteAdaptor, node: LiteNode): string {
  if ('kind' in node && node.kind === '#text') return adaptor.value(node) ?? ''
  return ((adaptor.childNodes(node as LiteElement) as LiteNode[]) ?? []).map(child => textContent(adaptor, child)).join('')
}

/** A length attribute: plain user units, `ex`, `em` or a percentage of `percentBase`. */
function length(value: string | null | undefined, percentBase: number, exEm: number): number {
  if (value === null || value === undefined || value === '') return 0
  const match = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*(%|ex|em|px)?\s*$/i.exec(value)
  if (!match) return 0
  const n = Number(match[1])
  switch (match[2]) {
    case '%':
      return (n / 100) * percentBase
    case 'ex':
      return n * exEm
    default:
      return n
  }
}

function num(value: string | null | undefined): number {
  const n = value ? Number.parseFloat(value) : 0
  return Number.isFinite(n) ? n : 0
}

function numbers(value: string | null | undefined): number[] {
  return (value?.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number)
}
