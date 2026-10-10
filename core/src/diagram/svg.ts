import type { Matrix, Paint, Picture, PictureClip, PictureOp, RGB, StrokeStyle } from '../types.js'
import { flattenSubpaths } from '../raster/path.js'
import { parseXml, type XmlElement } from './xml.js'

/*
 * dvisvgm's SVG (`--no-fonts`: every glyph a path) read into a Picture: each
 * shape it paints, in order, as a fill or a stroke in em with its colour, and
 * the clip regions they are drawn inside. What kittex's rasterizer draws.
 *
 * Read: svg, g (and a), path, use (of a glyph or any element), rect, circle,
 * ellipse, line, polyline, polygon, clipPath; the presentation attributes and
 * a `style` attribute's declarations of the same names; transforms. A group's
 * opacity multiplies into its shapes'. A shape filled with a gradient is
 * painted in bands of its colours (linear and radial, focus included), and one
 * filled with a pattern in copies of its tile, both clipped to the shape: TikZ
 * shadings and patterns as they print. A gradient stroke paints its stops'
 * mean colour, and a pattern that can't be tiled within MAX_PATTERN_OPS its
 * first colour at PATTERN_OPACITY (a flat tint). Text, images, masks and nested
 * documents refuse the picture (SvgError), so nothing is drawn half: dvisvgm
 * writes none of them for TikZ, pgfplots, chemfig or circuitikz with
 * --no-fonts, and a picture that needs them stays its source.
 */

export class SvgError extends Error {}

/** Where the picture's baseline is: the SVG's y = 0 (TeX's reference point, preview mode), or the bottom of its viewBox (a diagram, no depth). */
export type BaselineAt = 'origin' | 'bottom'

export interface SvgReadOptions {
  baseline: BaselineAt
  /** Em per SVG user unit (a big point): 72.27 / 72 / the font size in TeX points. */
  emPerUnit: number
}

/** Shapes one picture may paint, at most. */
export const MAX_PICTURE_OPS = 60_000
/**
 * The longest path data one shape may have, in characters. dvisvgm's longest
 * for real pictures: about 18 000 for a 1000-sample pgfplots plot, 145 000
 * for 8000 samples (near where TeX's main memory runs out, in 20 s of TeX).
 */
export const MAX_PATH_DATA = 1_000_000
/**
 * The numbers (coordinates and arc parameters) one picture's path data may
 * hold in all, each shape counted as often as it is painted or clips (a glyph
 * per use): what the rasterizer flattens. Real pictures hold up to about
 * 57 000 (a 60 × 60 pgfplots surface), 40 000 for a picture of 40 formulas.
 */
export const MAX_PICTURE_NUMBERS = 2_000_000
/** Elements one picture's walk may visit, at most (a `use` of a group visits it again). */
const MAX_VISITS = 400_000
/** How deep `use` may reference (a cycle is refused). */
const MAX_USE_DEPTH = 8
/** The opacity a pattern's colour paints with, standing for its lines' coverage, where the pattern is drawn as a tint. */
const PATTERN_OPACITY = 0.35
/** Bands a gradient's vector (0 to 1) is cut into; neighbours of one colour are merged. */
const GRADIENT_BANDS = 64
/** Shapes the tiles of one pattern fill may paint; a finer pattern (or a larger shape) is a tint. */
const MAX_PATTERN_OPS = 6000
/** Clips the gradient and pattern fills of one picture may add (each is a mask the picture's size when drawn); past them, flat. */
const MAX_SERVER_CLIPS = 64

interface Style {
  fill: PaintSource | null
  fillOpacity: number
  fillRule: 'nonzero' | 'evenodd'
  stroke: PaintSource | null
  strokeOpacity: number
  strokeWidth: number
  cap: StrokeStyle['cap']
  join: StrokeStyle['join']
  miterLimit: number
  dash: number[] | undefined
  dashOffset: number
  /** The product of the groups' opacities. */
  opacity: number
  color: RGB
  clip: number | undefined
}

type PaintSource = RGB | { ref: string }

const BLACK: RGB = { r: 0, g: 0, b: 0 }

const INITIAL: Style = {
  fill: BLACK,
  fillOpacity: 1,
  fillRule: 'nonzero',
  stroke: null,
  strokeOpacity: 1,
  strokeWidth: 1,
  cap: 'butt',
  join: 'miter',
  miterLimit: 4,
  dash: undefined,
  dashOffset: 0,
  opacity: 1,
  color: BLACK,
  clip: undefined,
}

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

/** Elements that draw nothing themselves and hold only definitions or metadata. */
const SKIPPED = new Set(['defs', 'clipPath', 'linearGradient', 'radialGradient', 'pattern', 'symbol', 'marker', 'title', 'desc', 'metadata', 'style', 'script'])
/** Elements a picture can't be drawn without. */
const REFUSED = new Set(['text', 'image', 'foreignObject', 'mask', 'svg', 'video', 'iframe'])

/** Reads dvisvgm's SVG into a Picture. Throws SvgError (or XmlError) for what it can't draw. */
export function readSvg(source: string, options: SvgReadOptions): Picture {
  const root = parseXml(source)
  if (root.name !== 'svg') throw new SvgError('not an SVG document')
  const box = viewBox(root)
  // Every id, the first in document order winning; with a stack of its own, as the walk below, since a faceted
  // pgfplots surface nests one group per facet thousands deep.
  const ids = new Map<string, XmlElement>()
  const pending: XmlElement[] = [root]
  for (let el = pending.pop(); el; el = pending.pop()) {
    const id = el.attrs.id
    if (id !== undefined && !ids.has(id)) ids.set(id, el)
    for (let i = el.children.length - 1; i >= 0; i--) pending.push(el.children[i]!)
  }

  const s = options.emPerUnit
  const baselineY = options.baseline === 'origin' ? 0 : box.y + box.height
  const toEm: Matrix = [s, 0, 0, s, -box.x * s, -baselineY * s]
  const ops: PictureOp[] = []
  const clips: PictureClip[] = []
  const clipIds = new Map<string, number>()

  // Numbers per path data, counted once each (a glyph's outline is painted many times).
  const counted = new Map<string, number>()
  let numbers = 0
  const account = (d: string) => {
    if (d.length > MAX_PATH_DATA) throw new SvgError(`picture too complex (a path of ${d.length} characters)`)
    let n = counted.get(d)
    if (n === undefined) {
      n = countNumbers(d)
      counted.set(d, n)
    }
    numbers += n
    if (numbers > MAX_PICTURE_NUMBERS) throw new SvgError(`picture too complex (more than ${MAX_PICTURE_NUMBERS} path coordinates)`)
  }

  const push = (op: PictureOp) => {
    if (ops.length >= MAX_PICTURE_OPS) throw new SvgError('picture too complex')
    account(op.d)
    ops.push(op)
  }

  const paintOf = (source: PaintSource | null, opacity: number, style: Style): Paint | null => {
    if (source === null || !(opacity > 0)) return null
    if ('ref' in source) {
      const resolved = referencedPaint(source.ref, ids, style.color)
      if (!resolved) return null
      return { color: resolved.color, opacity: opacity * resolved.opacity }
    }
    return { color: source, opacity }
  }

  const draw = (d: string, ctm: Matrix, style: Style, glyph: boolean, canFill = true) => {
    if (d.trim() === '') return
    const transform = multiply(toEm, ctm)
    // A gradient or pattern fill draws itself (clipped to the shape) when it can, before the shape's stroke.
    const server = canFill && style.fill !== null && 'ref' in style.fill ? style.fill.ref : undefined
    const opacity = style.fillOpacity * style.opacity
    const served = server !== undefined && opacity > 0 && !glyph && serverFill(server, d, ctm, style, opacity)
    const fill = canFill && !served ? paintOf(style.fill, opacity, style) : null
    if (fill) push({ type: 'fill', d, transform, rule: style.fillRule, paint: fill, ...(glyph ? { glyph: true } : {}), ...(style.clip !== undefined ? { clip: style.clip } : {}) })
    const stroke = paintOf(style.stroke, style.strokeOpacity * style.opacity, style)
    if (stroke && style.strokeWidth > 0) {
      const strokeStyle: StrokeStyle = { width: style.strokeWidth, cap: style.cap, join: style.join, miterLimit: style.miterLimit }
      if (style.dash) {
        strokeStyle.dash = style.dash
        strokeStyle.dashOffset = style.dashOffset
      }
      push({ type: 'stroke', d, transform, style: strokeStyle, paint: stroke, ...(style.clip !== undefined ? { clip: style.clip } : {}) })
    }
  }

  const clipFor = (ref: string, ctm: Matrix, within: number | undefined): number | undefined => {
    const el = ids.get(ref)
    if (!el || el.name !== 'clipPath') return within
    const key = `${ref}\n${ctm.join(',')}\n${within ?? ''}`
    const known = clipIds.get(key)
    if (known !== undefined) return known
    const own = multiply(ctm, transformOf(el.attrs.transform))
    const paths: PictureClip['paths'] = []
    const gather = (node: XmlElement, m: Matrix, depth: number) => {
      if (depth > MAX_USE_DEPTH) throw new SvgError('clip path nested too deep')
      const local = multiply(m, transformOf(node.attrs.transform))
      const rule = (declared(node, 'clip-rule') ?? 'nonzero') === 'evenodd' ? 'evenodd' : 'nonzero'
      if (node.name === 'use') {
        const target = ids.get(hrefOf(node) ?? '')
        if (target) gather(target, multiply(local, translation(node)), depth + 1)
        return
      }
      const d = shapePath(node)
      if (d !== undefined) {
        account(d)
        paths.push({ d, transform: multiply(toEm, local), rule })
        return
      }
      if (node.name === 'g') for (const child of node.children) gather(child, local, depth + 1)
    }
    for (const child of el.children) gather(child, own, 0)
    clips.push({ paths, ...(within !== undefined ? { within } : {}) })
    const index = clips.length - 1
    clipIds.set(key, index)
    return index
  }

  // ─── Gradient and pattern fills ───
  let serverClips = 0
  let patternDepth = 0

  /** A clip of one shape (a gradient's or pattern's fill), inside the clip the shape is drawn in. */
  const shapeClip = (d: string, ctm: Matrix, rule: 'nonzero' | 'evenodd', within: number | undefined): number => {
    account(d)
    clips.push({ paths: [{ d, transform: multiply(toEm, ctm), rule }], ...(within !== undefined ? { within } : {}) })
    serverClips++
    return clips.length - 1
  }

  /** Fills a shape with a gradient's or a pattern's own drawing; false when it can't be (it is then filled flat). */
  const serverFill = (ref: string, d: string, ctm: Matrix, style: Style, opacity: number): boolean => {
    const el = ids.get(ref)
    if (!el || serverClips >= MAX_SERVER_CLIPS) return false
    if (el.name === 'linearGradient' || el.name === 'radialGradient') return gradientFill(el, d, ctm, style, opacity)
    if (el.name === 'pattern') return patternFill(el, d, ctm, style, opacity)
    return false
  }

  /**
   * A gradient as bands of its colours over the shape (its box mapped to the
   * gradient's own space): strips across a linear gradient's vector, discs
   * about a radial one's focus. Opaque bands are painted each over the rest of
   * the way (no seams between neighbours); translucent ones side by side.
   */
  const gradientFill = (el: XmlElement, d: string, ctm: Matrix, style: Style, opacity: number): boolean => {
    const stops = gradientStops(el, ids, 0)
    const box = pathBox(d)
    if (stops.length < 2 || !box) return false
    const attr = (name: string) => inheritedAttr(el, name, ids)
    const bounding = (attr('gradientUnits') ?? 'objectBoundingBox') !== 'userSpaceOnUse'
    if (bounding && !(box.width > 0 && box.height > 0)) return false
    const units: Matrix = bounding ? [box.width, 0, 0, box.height, box.x, box.y] : IDENTITY
    const space = multiply(units, transformOf(attr('gradientTransform')))
    const back = invert(space)
    if (!back) return false
    // The shape's box in the gradient's space, where the bands are laid out.
    const corners = [
      apply(back, box.x, box.y),
      apply(back, box.x + box.width, box.y),
      apply(back, box.x, box.y + box.height),
      apply(back, box.x + box.width, box.y + box.height),
    ]
    const coord = (name: string, fallback: number) => {
      const value = attr(name)
      const n = value === undefined ? NaN : value.endsWith('%') ? parseFloat(value) / 100 : parseFloat(value)
      return Number.isFinite(n) ? n : fallback
    }
    const bands = gradientBands(stops)
    const opaque = stops.every(stop => stop.paint.opacity >= 1)
    const shapes: { d: string; paint: Paint; rule: 'nonzero' | 'evenodd' }[] = []
    if (el.name === 'linearGradient') {
      const x1 = coord('x1', bounding ? 0 : box.x)
      const y1 = coord('y1', bounding ? 0 : box.y)
      const x2 = coord('x2', bounding ? 1 : box.x + box.width)
      const y2 = coord('y2', bounding ? 0 : box.y)
      const vx = x2 - x1
      const vy = y2 - y1
      const length2 = vx * vx + vy * vy
      if (!(length2 > 0)) return false
      // Each corner's place along the vector (t) and across it (s), in the vector's lengths.
      const ts = corners.map(([x, y]) => ((x - x1) * vx + (y - y1) * vy) / length2)
      const ss = corners.map(([x, y]) => ((y - y1) * vx - (x - x1) * vy) / length2)
      const tMin = Math.min(0, ...ts) - 0.01
      const tMax = Math.max(1, ...ts) + 0.01
      const sMin = Math.min(...ss) - 0.01
      const sMax = Math.max(...ss) + 0.01
      const at = (t: number, s: number) => `${fmt(x1 + t * vx - s * vy)} ${fmt(y1 + t * vy + s * vx)}`
      bands.forEach((band, k) => {
        const from = k === 0 ? tMin : band.from
        const to = opaque || k === bands.length - 1 ? tMax : band.to
        shapes.push({ d: `M${at(from, sMin)}L${at(to, sMin)}L${at(to, sMax)}L${at(from, sMax)}Z`, paint: band.paint, rule: 'nonzero' })
      })
    } else {
      const cx = coord('cx', bounding ? 0.5 : box.x + box.width / 2)
      const cy = coord('cy', bounding ? 0.5 : box.y + box.height / 2)
      const r = coord('r', bounding ? 0.5 : Math.hypot(box.width, box.height) / 2)
      const fx = coord('fx', cx)
      const fy = coord('fy', cy)
      if (!(r > 0)) return false
      // The circle at t: centred from the focus (0) to the centre (1), its radius t r.
      const circle = (t: number) => {
        const x = fx + t * (cx - fx)
        const y = fy + t * (cy - fy)
        const rt = Math.max(t * r, 1e-6)
        return `M${fmt(x + rt)} ${fmt(y)}A${fmt(rt)} ${fmt(rt)} 0 1 1 ${fmt(x - rt)} ${fmt(y)}A${fmt(rt)} ${fmt(rt)} 0 1 1 ${fmt(x + rt)} ${fmt(y)}Z`
      }
      const xs = [...corners.map(([x]) => x), cx - r, cx + r]
      const ys = [...corners.map(([, y]) => y), cy - r, cy + r]
      const x0 = Math.min(...xs) - 0.01
      const x1 = Math.max(...xs) + 0.01
      const y0 = Math.min(...ys) - 0.01
      const y1 = Math.max(...ys) + 0.01
      const outside = `M${fmt(x0)} ${fmt(y0)}H${fmt(x1)}V${fmt(y1)}H${fmt(x0)}Z`
      const last = bands[bands.length - 1]!.paint
      if (opaque) {
        // The pad past the rim, then each disc from the outermost in.
        shapes.push({ d: outside, paint: last, rule: 'nonzero' })
        for (let k = bands.length - 1; k >= 0; k--) shapes.push({ d: circle(bands[k]!.to), paint: bands[k]!.paint, rule: 'nonzero' })
      } else {
        shapes.push({ d: outside + circle(1), paint: last, rule: 'evenodd' })
        for (const band of bands) shapes.push({ d: band.from > 0 ? circle(band.to) + circle(band.from) : circle(band.to), paint: band.paint, rule: 'evenodd' })
      }
    }
    const clip = shapeClip(d, ctm, style.fillRule, style.clip)
    const transform = multiply(toEm, multiply(ctm, space))
    for (const shape of shapes) push({ type: 'fill', d: shape.d, transform, rule: shape.rule, paint: { color: shape.paint.color, opacity: shape.paint.opacity * opacity }, clip })
    return true
  }

  /**
   * A pattern as copies of its tile over the shape (every tile the shape's box
   * reaches, in the pattern's own space), clipped to the shape; false for a
   * tile too fine to draw within MAX_PATTERN_OPS (it is then a tint).
   */
  const patternFill = (el: XmlElement, d: string, ctm: Matrix, style: Style, opacity: number): boolean => {
    const content = patternContent(el, ids)
    const box = pathBox(d)
    if (content.length === 0 || !box || patternDepth > 0) return false
    const attr = (name: string) => inheritedAttr(el, name, ids)
    if (attr('viewBox') !== undefined) return false
    const number = (name: string) => {
      const value = attr(name)
      const n = value === undefined ? 0 : value.endsWith('%') ? parseFloat(value) / 100 : parseFloat(value)
      return Number.isFinite(n) ? n : 0
    }
    let x = number('x')
    let y = number('y')
    let w = number('width')
    let h = number('height')
    if ((attr('patternUnits') ?? 'objectBoundingBox') !== 'userSpaceOnUse') {
      x = box.x + x * box.width
      y = box.y + y * box.height
      w *= box.width
      h *= box.height
    }
    if (!(w > 0 && h > 0)) return false
    const tileSpace = transformOf(attr('patternTransform'))
    const back = invert(tileSpace)
    if (!back) return false
    const corners = [apply(back, box.x, box.y), apply(back, box.x + box.width, box.y), apply(back, box.x, box.y + box.height), apply(back, box.x + box.width, box.y + box.height)]
    // A tile's drawing may reach past its tile (pgf centres some on the tile's corner): one more tile all round.
    const i0 = Math.floor((Math.min(...corners.map(([cx]) => cx)) - x) / w) - 1
    const i1 = Math.ceil((Math.max(...corners.map(([cx]) => cx)) - x) / w) + 1
    const j0 = Math.floor((Math.min(...corners.map(([, cy]) => cy)) - y) / h) - 1
    const j1 = Math.ceil((Math.max(...corners.map(([, cy]) => cy)) - y) / h) + 1
    const perTile = shapesIn(content, ids)
    const total = (i1 - i0 + 1) * (j1 - j0 + 1) * perTile
    if (!(perTile > 0) || !(total <= MAX_PATTERN_OPS) || ops.length + total > MAX_PICTURE_OPS / 2) return false
    const contentUnits: Matrix = attr('patternContentUnits') === 'objectBoundingBox' ? [box.width, 0, 0, box.height, 0, 0] : IDENTITY
    // The tile's drawing inherits from the pattern, not from the shape it fills.
    const inherited: Style = { ...styleOf(el, INITIAL), clip: shapeClip(d, ctm, style.fillRule, style.clip), opacity }
    const frames: Frame[] = []
    for (let j = j1; j >= j0; j--) {
      for (let i = i1; i >= i0; i--) {
        const m = multiply(ctm, multiply(tileSpace, multiply([1, 0, 0, 1, x + i * w, y + j * h], contentUnits)))
        for (let k = content.length - 1; k >= 0; k--) frames.push({ el: content[k]!, ctm: m, inherited, root: false, glyph: false, uses: 0 })
      }
    }
    patternDepth++
    try {
      walk(frames)
    } finally {
      patternDepth--
    }
    return true
  }

  // Depth first, in document order, with a stack of its own: dvisvgm nests a group per pgfplots patch (thousands deep).
  interface Frame {
    el: XmlElement
    ctm: Matrix
    inherited: Style
    root: boolean
    glyph: boolean
    /** How many `use` elements led here. */
    uses: number
  }
  let visits = 0
  const walk = (stack: Frame[]) => {
    while (stack.length > 0) {
      const { el, ctm, inherited, root: isRoot, glyph, uses } = stack.pop()!
      if (++visits > MAX_VISITS) throw new SvgError('picture too complex')
      if (SKIPPED.has(el.name)) continue
      if (REFUSED.has(el.name) && !isRoot) throw new SvgError(`<${el.name}> is not drawn`)
      if (declared(el, 'display') === 'none') continue
      const m = el.name === 'svg' ? ctm : multiply(ctm, transformOf(el.attrs.transform))
      const style = styleOf(el, inherited)
      const clipRef = urlOf(declared(el, 'clip-path'))
      if (clipRef !== undefined) style.clip = clipFor(clipRef, m, inherited.clip)
      if (declared(el, 'mask') !== undefined && declared(el, 'mask') !== 'none') throw new SvgError('masks are not drawn')
      const hidden = declared(el, 'visibility') === 'hidden'
      switch (el.name) {
        case 'svg':
        case 'g':
        case 'a':
        case 'switch':
          // Pushed last child first: the first is drawn first.
          for (let k = el.children.length - 1; k >= 0; k--) stack.push({ el: el.children[k]!, ctm: m, inherited: style, root: false, glyph, uses })
          continue
        case 'use': {
          const id = hrefOf(el)
          const target = id === undefined ? undefined : ids.get(id)
          if (!target || target === el) continue
          if (uses >= MAX_USE_DEPTH || useDepth(el, ids) > MAX_USE_DEPTH) throw new SvgError('use nested too deep')
          // A glyph: dvisvgm puts each character's outline in <defs> and draws it with <use>.
          const isGlyph = target.name === 'path' && /^g\d*-/.test(id ?? '')
          stack.push({ el: target.name === 'symbol' ? { ...target, name: 'g' } : target, ctm: multiply(m, translation(el)), inherited: style, root: false, glyph: glyph || isGlyph, uses: uses + 1 })
          continue
        }
        default: {
          const d = shapePath(el)
          if (d === undefined || hidden) continue
          // A line has no inside to fill.
          draw(d, m, style, glyph, el.name !== 'line')
        }
      }
    }
  }
  walk([{ el: root, ctm: IDENTITY, inherited: { ...INITIAL }, root: true, glyph: false, uses: 0 }])

  const height = (baselineY - box.y) * s
  const depth = (box.y + box.height - baselineY) * s
  return { width: box.width * s, height: Math.max(0, height), depth: Math.max(0, depth), ops, clips }
}

/** How many numbers path data holds, as SVG reads them (`0.5.5` is two, `1e-5` one). */
export function countNumbers(d: string): number {
  let n = 0
  let inNumber = false
  let dot = false
  let exponent = false
  for (let i = 0; i < d.length; i++) {
    const c = d.charCodeAt(i)
    if (c >= 48 && c <= 57) {
      if (!inNumber) {
        n++
        inNumber = true
        dot = false
        exponent = false
      }
    } else if (c === 46) {
      // A point after a number's own point or its exponent starts the next number.
      if (!inNumber || dot || exponent) {
        n++
        inNumber = true
        exponent = false
      }
      dot = true
    } else if ((c === 101 || c === 69) && inNumber && !exponent) {
      exponent = true
    } else if ((c === 43 || c === 45) && inNumber && exponent && (d.charCodeAt(i - 1) === 101 || d.charCodeAt(i - 1) === 69)) {
      // The exponent's sign.
    } else {
      inNumber = false
    }
  }
  return n
}

function viewBox(root: XmlElement): { x: number; y: number; width: number; height: number } {
  const numbers = (root.attrs.viewBox ?? '').trim().split(/[\s,]+/).map(Number)
  if (numbers.length === 4 && numbers.every(Number.isFinite) && numbers[2]! > 0 && numbers[3]! > 0) {
    const [x, y, width, height] = numbers as [number, number, number, number]
    return { x, y, width, height }
  }
  const width = length(root.attrs.width)
  const height = length(root.attrs.height)
  if (width && height && width > 0 && height > 0) return { x: 0, y: 0, width, height }
  throw new SvgError('the picture is empty')
}

/** A length attribute in user units (unit suffixes dropped: dvisvgm writes user units). */
function length(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : undefined
}

function hrefOf(el: XmlElement): string | undefined {
  const href = el.attrs['xlink:href'] ?? el.attrs.href
  return href?.startsWith('#') ? href.slice(1) : undefined
}

/** How many `use` elements a `use` leads through before it reaches a shape (a cycle counts as too many). */
function useDepth(el: XmlElement, ids: ReadonlyMap<string, XmlElement>): number {
  let depth = 0
  let at: XmlElement | undefined = el
  const seen = new Set<XmlElement>()
  while (at && at.name === 'use') {
    if (seen.has(at)) return Infinity
    seen.add(at)
    depth++
    const id = hrefOf(at)
    at = id === undefined ? undefined : ids.get(id)
  }
  return depth
}

function translation(el: XmlElement): Matrix {
  return [1, 0, 0, 1, length(el.attrs.x) ?? 0, length(el.attrs.y) ?? 0]
}

/** A presentation attribute, or the same property in the element's `style` attribute (which wins). */
function declared(el: XmlElement, name: string): string | undefined {
  const style = el.attrs.style
  if (style !== undefined) {
    for (const declaration of style.split(';')) {
      const colon = declaration.indexOf(':')
      if (colon > 0 && declaration.slice(0, colon).trim() === name) return declaration.slice(colon + 1).trim()
    }
  }
  const value = el.attrs[name]
  return value === undefined ? undefined : value.trim()
}

function styleOf(el: XmlElement, inherited: Style): Style {
  const style: Style = { ...inherited }
  const color = declared(el, 'color')
  if (color !== undefined && color !== 'inherit') style.color = parseColor(color, inherited.color) ?? inherited.color
  const paint = (value: string | undefined, current: PaintSource | null): PaintSource | null => {
    if (value === undefined || value === 'inherit') return current
    if (value === 'none') return null
    const ref = urlOf(value)
    if (ref !== undefined) return { ref }
    if (value === 'currentColor') return style.color
    return parseColor(value, style.color) ?? current
  }
  style.fill = paint(declared(el, 'fill'), inherited.fill)
  style.stroke = paint(declared(el, 'stroke'), inherited.stroke)
  const number = (name: string, current: number) => {
    const value = declared(el, name)
    if (value === undefined || value === 'inherit') return current
    const n = value.endsWith('%') ? parseFloat(value) / 100 : parseFloat(value)
    return Number.isFinite(n) ? n : current
  }
  style.fillOpacity = clamp01(number('fill-opacity', inherited.fillOpacity))
  style.strokeOpacity = clamp01(number('stroke-opacity', inherited.strokeOpacity))
  style.opacity = inherited.opacity * clamp01(number('opacity', 1))
  style.strokeWidth = Math.max(0, number('stroke-width', inherited.strokeWidth))
  style.miterLimit = Math.max(1, number('stroke-miterlimit', inherited.miterLimit))
  style.dashOffset = number('stroke-dashoffset', inherited.dashOffset)
  const rule = declared(el, 'fill-rule')
  if (rule === 'evenodd' || rule === 'nonzero') style.fillRule = rule
  const cap = declared(el, 'stroke-linecap')
  if (cap === 'butt' || cap === 'round' || cap === 'square') style.cap = cap
  const join = declared(el, 'stroke-linejoin')
  if (join === 'miter' || join === 'round' || join === 'bevel') style.join = join
  else if (join === 'miter-clip' || join === 'arcs') style.join = 'miter'
  const dash = declared(el, 'stroke-dasharray')
  if (dash !== undefined && dash !== 'inherit') {
    const lengths = dash === 'none' ? [] : dash.split(/[\s,]+/).filter(Boolean).map(Number)
    const valid = lengths.length > 0 && lengths.every(n => Number.isFinite(n) && n >= 0) && lengths.some(n => n > 0)
    style.dash = valid ? (lengths.length % 2 === 1 ? [...lengths, ...lengths] : lengths) : undefined
  }
  return style
}

/** `url(#id)` (quoted or not), or undefined. */
function urlOf(value: string | undefined): string | undefined {
  const match = value === undefined ? null : /^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(value)
  return match ? match[1] : undefined
}

/** A gradient or pattern paint as one colour (see the note at the top). */
function referencedPaint(id: string, ids: ReadonlyMap<string, XmlElement>, current: RGB): Paint | null {
  const el = ids.get(id)
  if (!el) return null
  if (el.name === 'linearGradient' || el.name === 'radialGradient') {
    const stops = gradientStops(el, ids, 0)
    if (stops.length === 0) return null
    if (stops.length === 1) return stops[0]!.paint
    let weight = 0
    let r = 0, g = 0, b = 0, a = 0
    for (let i = 0; i + 1 < stops.length; i++) {
      const w = Math.max(0, stops[i + 1]!.offset - stops[i]!.offset)
      for (const stop of [stops[i]!, stops[i + 1]!]) {
        r += stop.paint.color.r * w
        g += stop.paint.color.g * w
        b += stop.paint.color.b * w
        a += stop.paint.opacity * w
      }
      weight += 2 * w
    }
    if (!(weight > 0)) return stops[0]!.paint
    return { color: { r: Math.round(r / weight), g: Math.round(g / weight), b: Math.round(b / weight) }, opacity: a / weight }
  }
  if (el.name === 'pattern') {
    const first = firstColor(el, current)
    return first ? { color: first, opacity: PATTERN_OPACITY } : null
  }
  return null
}

function gradientStops(el: XmlElement, ids: ReadonlyMap<string, XmlElement>, depth: number): { offset: number; paint: Paint }[] {
  const stops = el.children
    .filter(child => child.name === 'stop')
    .map(stop => {
      const raw = declared(stop, 'offset') ?? '0'
      const offset = clamp01(raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw) || 0)
      const color = parseColor(declared(stop, 'stop-color') ?? 'black', BLACK) ?? BLACK
      const opacity = clamp01(parseFloat(declared(stop, 'stop-opacity') ?? '1'))
      return { offset, paint: { color, opacity: Number.isFinite(opacity) ? opacity : 1 } }
    })
  if (stops.length > 0 || depth > MAX_USE_DEPTH) return stops
  const parent = ids.get(hrefOf(el) ?? '')
  return parent ? gradientStops(parent, ids, depth + 1) : []
}

/** The first colour a pattern's tile paints with. */
function firstColor(el: XmlElement, current: RGB): RGB | undefined {
  for (const child of el.children) {
    for (const name of ['fill', 'stroke']) {
      const value = declared(child, name)
      if (value && value !== 'none' && urlOf(value) === undefined) {
        const color = value === 'currentColor' ? current : parseColor(value, current)
        if (color) return color
      }
    }
    const nested = firstColor(child, current)
    if (nested) return nested
  }
  return undefined
}

/** A gradient's or pattern's attribute, or the one it inherits through its href chain. */
function inheritedAttr(el: XmlElement, name: string, ids: ReadonlyMap<string, XmlElement>): string | undefined {
  let at: XmlElement | undefined = el
  for (let depth = 0; at && depth <= MAX_USE_DEPTH; depth++) {
    const value = at.attrs[name]
    if (value !== undefined) return value.trim()
    at = ids.get(hrefOf(at) ?? '')
  }
  return undefined
}

/** A pattern's tile drawing: the children of the first pattern in its href chain that has any. */
function patternContent(el: XmlElement, ids: ReadonlyMap<string, XmlElement>): XmlElement[] {
  let at: XmlElement | undefined = el
  for (let depth = 0; at && depth <= MAX_USE_DEPTH; depth++) {
    if (at.children.length > 0) return at.children
    at = ids.get(hrefOf(at) ?? '')
  }
  return []
}

/** How many shapes drawing these elements paints (through `use`), up to 1000. */
function shapesIn(nodes: readonly XmlElement[], ids: ReadonlyMap<string, XmlElement>, depth = 0): number {
  if (depth > MAX_USE_DEPTH) return 1000
  let n = 0
  for (const node of nodes) {
    if (SKIPPED.has(node.name)) continue
    if (node.name === 'use') {
      const target = ids.get(hrefOf(node) ?? '')
      if (target) n += target.name === 'g' || target.name === 'symbol' ? shapesIn(target.children, ids, depth + 1) : shapesIn([target], ids, depth + 1)
    } else if (shapePath(node) !== undefined) n += 2
    else n += shapesIn(node.children, ids, depth + 1)
    if (n >= 1000) return 1000
  }
  return n
}

/** The bands a gradient is drawn in: cut at every stop and at GRADIENT_BANDS even steps, each its middle's colour; neighbours of one colour merged. */
function gradientBands(stops: readonly { offset: number; paint: Paint }[]): { from: number; to: number; paint: Paint }[] {
  const cuts = [...new Set([0, 1, ...stops.map(stop => stop.offset), ...Array.from({ length: GRADIENT_BANDS }, (_, k) => k / GRADIENT_BANDS)])].sort((a, b) => a - b)
  const bands: { from: number; to: number; paint: Paint }[] = []
  for (let k = 0; k + 1 < cuts.length; k++) {
    const from = cuts[k]!
    const to = cuts[k + 1]!
    if (!(to > from)) continue
    const paint = colorAt(stops, (from + to) / 2)
    const before = bands[bands.length - 1]
    if (before && sameRgb(before.paint.color, paint.color) && Math.abs(before.paint.opacity - paint.opacity) < 0.002) before.to = to
    else bands.push({ from, to, paint })
  }
  return bands
}

/** A gradient's colour at t (0 to 1): its stops' interpolated, padded past the first and the last. */
function colorAt(stops: readonly { offset: number; paint: Paint }[], t: number): Paint {
  // Stops never step back (SVG: an offset below the one before is that one).
  let previous = stops[0]!
  if (t <= previous.offset) return previous.paint
  for (const stop of stops.slice(1)) {
    const offset = Math.max(stop.offset, previous.offset)
    if (t <= offset) {
      const f = offset > previous.offset ? (t - previous.offset) / (offset - previous.offset) : 1
      const mix = (a: number, b: number) => Math.round(a + (b - a) * f)
      const a = previous.paint
      const b = stop.paint
      return { color: { r: mix(a.color.r, b.color.r), g: mix(a.color.g, b.color.g), b: mix(a.color.b, b.color.b) }, opacity: a.opacity + (b.opacity - a.opacity) * f }
    }
    previous = { offset, paint: stop.paint }
  }
  return previous.paint
}

const sameRgb = (a: RGB, b: RGB) => a.r === b.r && a.g === b.g && a.b === b.b

/** A path's bounding box in its own units (its curves flattened finely), or undefined when it has no extent. */
function pathBox(d: string): { x: number; y: number; width: number; height: number } | undefined {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const subpath of flattenSubpaths(d, IDENTITY, 0.01)) {
    const p = subpath.points
    for (let i = 0; i + 1 < p.length; i += 2) {
      if (p[i]! < x0) x0 = p[i]!
      if (p[i]! > x1) x1 = p[i]!
      if (p[i + 1]! < y0) y0 = p[i + 1]!
      if (p[i + 1]! > y1) y1 = p[i + 1]!
    }
  }
  return x1 >= x0 && y1 >= y0 && Number.isFinite(x1 - x0 + y1 - y0) ? { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } : undefined
}

/** A number for path data: five decimals, no exponent. */
function fmt(v: number): string {
  return (Math.round(v * 100_000) / 100_000).toFixed(5).replace(/\.?0+$/, '')
}

/** A shape element's outline as path data, or undefined for an element that has none. */
function shapePath(el: XmlElement): string | undefined {
  const a = el.attrs
  const n = (v: string | undefined) => length(v) ?? 0
  switch (el.name) {
    case 'path':
      return a.d ?? ''
    case 'rect': {
      const w = n(a.width)
      const h = n(a.height)
      if (!(w > 0 && h > 0)) return ''
      const x = n(a.x)
      const y = n(a.y)
      let rx = length(a.rx)
      let ry = length(a.ry)
      if (rx === undefined) rx = ry
      if (ry === undefined) ry = rx
      rx = Math.min(Math.max(0, rx ?? 0), w / 2)
      ry = Math.min(Math.max(0, ry ?? 0), h / 2)
      if (!(rx > 0 && ry > 0)) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`
    }
    case 'circle':
    case 'ellipse': {
      const cx = n(a.cx)
      const cy = n(a.cy)
      const rx = el.name === 'circle' ? n(a.r) : n(a.rx)
      const ry = el.name === 'circle' ? n(a.r) : n(a.ry)
      if (!(rx > 0 && ry > 0)) return ''
      return `M${cx + rx} ${cy}A${rx} ${ry} 0 1 1 ${cx - rx} ${cy}A${rx} ${ry} 0 1 1 ${cx + rx} ${cy}Z`
    }
    case 'line':
      return `M${n(a.x1)} ${n(a.y1)}L${n(a.x2)} ${n(a.y2)}`
    case 'polyline':
    case 'polygon': {
      const points = (a.points ?? '').trim().split(/[\s,]+/).filter(Boolean).map(Number)
      if (points.length < 4 || points.some(v => !Number.isFinite(v))) return ''
      let d = `M${points[0]} ${points[1]}`
      for (let i = 2; i + 1 < points.length; i += 2) d += `L${points[i]} ${points[i + 1]}`
      return el.name === 'polygon' ? d + 'Z' : d
    }
    default:
      return undefined
  }
}

// ─── Transforms ──────────────────────────────────────────────────────────────

/** p then q: the matrix that maps through q first, then p (p × q). */
export function multiply(p: Matrix, q: Matrix): Matrix {
  return [
    p[0] * q[0] + p[2] * q[1],
    p[1] * q[0] + p[3] * q[1],
    p[0] * q[2] + p[2] * q[3],
    p[1] * q[2] + p[3] * q[3],
    p[0] * q[4] + p[2] * q[5] + p[4],
    p[1] * q[4] + p[3] * q[5] + p[5],
  ]
}

/** An SVG transform list as one matrix (identity for none; an unreadable list throws). */
export function transformOf(value: string | undefined): Matrix {
  if (value === undefined || value.trim() === '') return IDENTITY
  let m: Matrix = IDENTITY
  const pattern = /\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)\s*,?/gy
  let at = 0
  for (let match = pattern.exec(value); match; match = pattern.exec(value)) {
    at = pattern.lastIndex
    const args = match[2]!.trim().split(/[\s,]+/).filter(Boolean).map(Number)
    if (args.some(v => !Number.isFinite(v))) throw new SvgError(`unreadable transform ${match[0]}`)
    m = multiply(m, single(match[1]!, args))
  }
  if (value.slice(at).trim() !== '') throw new SvgError(`unreadable transform ${value}`)
  return m
}

function single(kind: string, args: number[]): Matrix {
  const [a = 0, b, c] = args
  switch (kind) {
    case 'matrix':
      if (args.length !== 6) throw new SvgError('matrix() takes six numbers')
      return args as unknown as Matrix
    case 'translate':
      return [1, 0, 0, 1, a, b ?? 0]
    case 'scale':
      return [a, 0, 0, b ?? a, 0, 0]
    case 'rotate': {
      const r = (a * Math.PI) / 180
      const cos = Math.cos(r)
      const sin = Math.sin(r)
      const rot: Matrix = [cos, sin, -sin, cos, 0, 0]
      if (b === undefined || c === undefined) return rot
      return multiply(multiply([1, 0, 0, 1, b, c], rot), [1, 0, 0, 1, -b, -c])
    }
    case 'skewX':
      return [1, 0, Math.tan((a * Math.PI) / 180), 1, 0, 0]
    case 'skewY':
      return [1, Math.tan((a * Math.PI) / 180), 0, 1, 0, 0]
    default:
      return IDENTITY
  }
}

/** The matrix undoing m, or undefined when m flattens the plane. */
function invert(m: Matrix): Matrix | undefined {
  const [a, b, c, d, e, f] = m
  const det = a * d - b * c
  if (!(Math.abs(det) > 1e-12)) return undefined
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det]
}

function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

// ─── Colours ─────────────────────────────────────────────────────────────────

/** An SVG colour: `#rgb`, `#rrggbb`, `rgb(…)` (numbers or percentages) or a name; undefined otherwise. */
export function parseColor(value: string, current: RGB): RGB | undefined {
  const v = value.trim().toLowerCase()
  if (v === 'currentcolor') return current
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v)
  if (hex) {
    const digits = hex[1]!
    const full = digits.length === 3 ? [...digits].map(d => d + d).join('') : digits
    return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) }
  }
  const rgb = /^rgba?\(([^)]*)\)$/.exec(v)
  if (rgb) {
    const parts = rgb[1]!.split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3) return undefined
    const channel = (p: string) => (p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p))
    const [r, g, b] = parts.slice(0, 3).map(channel) as [number, number, number]
    if (![r, g, b].every(Number.isFinite)) return undefined
    const byte = (x: number) => Math.min(255, Math.max(0, Math.round(x)))
    return { r: byte(r), g: byte(g), b: byte(b) }
  }
  return NAMED[v]
}

const NAMED: Record<string, RGB> = {
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  red: { r: 255, g: 0, b: 0 },
  lime: { r: 0, g: 255, b: 0 },
  green: { r: 0, g: 128, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  cyan: { r: 0, g: 255, b: 255 },
  aqua: { r: 0, g: 255, b: 255 },
  magenta: { r: 255, g: 0, b: 255 },
  fuchsia: { r: 255, g: 0, b: 255 },
  gray: { r: 128, g: 128, b: 128 },
  grey: { r: 128, g: 128, b: 128 },
  silver: { r: 192, g: 192, b: 192 },
  maroon: { r: 128, g: 0, b: 0 },
  olive: { r: 128, g: 128, b: 0 },
  navy: { r: 0, g: 0, b: 128 },
  purple: { r: 128, g: 0, b: 128 },
  teal: { r: 0, g: 128, b: 128 },
  orange: { r: 255, g: 165, b: 0 },
  brown: { r: 165, g: 42, b: 42 },
  pink: { r: 255, g: 192, b: 203 },
  violet: { r: 238, g: 130, b: 238 },
  darkgray: { r: 169, g: 169, b: 169 },
  lightgray: { r: 211, g: 211, b: 211 },
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1)
