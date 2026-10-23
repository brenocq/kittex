import type { DrawOp, Matrix, Paint, TypesetResult } from '../types.js'
import type { XmlElement } from './xml.js'

/*
 * An SVG `<text>` set in kittex's own font: its characters gathered from the
 * element and its `<tspan>`s, white space collapsed as a browser does (or kept,
 * under `xml:space="preserve"` or `white-space: pre`), placed by `x`, `y`,
 * `dx` and `dy` (lists too, a value per character), each text chunk shifted
 * by its `text-anchor`, and each run of one style typeset by the caller
 * (SvgReadOptions.text: MathJax's `\text{}`, so this module stays free of the
 * typesetter). The SVG's font family is not read: every run is set in New
 * Computer Modern, the math's font, upright or italic, normal or bold. A run
 * advances by that font's widths, so text its writer placed by measuring it
 * in a wider font (a `start`-anchored label centred by hand) sits off by the
 * difference.
 *
 * Degraded: `<textPath>` and `<tref>` are not drawn; a `rotate` list,
 * `textLength`, `letter-spacing`, `word-spacing`, `baseline-shift` and
 * vertical writing modes are ignored (the text is set horizontally, at its own
 * advance); a stroke on text is not drawn (its fill is).
 */

/** One run of a text's characters in one style, for SvgReadOptions.text to typeset. */
export interface SvgTextRun {
  readonly text: string
  readonly bold: boolean
  readonly italic: boolean
}

/**
 * Typesets a run, in em of its font size, the origin at the left end of its
 * baseline, y down (a TypesetResult); undefined when it can't be (a character
 * the font lacks).
 */
export type SvgTextTypesetter = (run: SvgTextRun) => TypesetResult | undefined

export type TextAnchor = 'start' | 'middle' | 'end'

/** The text properties an element has, its own or inherited (CSS's initial values at the root). */
export interface TextFont {
  /** In the element's user units. */
  readonly size: number
  readonly bold: boolean
  readonly italic: boolean
  readonly anchor: TextAnchor
  /** How far the alphabetic baseline sits below the `y` given, in em (dominant-baseline, alignment-baseline). */
  readonly baselineShift: number
  /** White space kept as written (`xml:space="preserve"`, `white-space: pre`), not collapsed. */
  readonly preserve: boolean
  readonly underline: boolean
  readonly lineThrough: boolean
}

export const INITIAL_FONT: TextFont = {
  size: 16,
  bold: false,
  italic: false,
  anchor: 'start',
  baselineShift: 0,
  preserve: false,
  underline: false,
  lineThrough: false,
}

/** How a span of a text is drawn: its font, its fill (null: not painted), and whether it is hidden (it still takes its room). */
export interface TextSpan {
  readonly font: TextFont
  readonly paint: Paint | null
  readonly hidden: boolean
}

/** One fill of a set text: a glyph's outline (or a rule's box), in the text element's user units. */
export interface PlacedFill {
  d: string
  transform: Matrix
  paint: Paint
}

/** Characters one picture's texts may hold in all; more is refused (svg.ts). */
export const MAX_TEXT_CHARS = 20_000
/** Characters of one text's content read before it is collapsed; more is refused, as MAX_TEXT_CHARS. */
export const MAX_RAW_TEXT_CHARS = 4 * MAX_TEXT_CHARS
/** Characters typeset at once: a longer run is set in pieces (MathJax takes at most 4096 characters of TeX, and an escape is up to 18). */
const MAX_RUN_CHARS = 200
/** Elements a text's content may nest, its tspans in tspans; deeper ones are not drawn. */
const MAX_TEXT_DEPTH = 32
/** The advance of a character the font lacks, in em: it is not drawn, and the rest of its run keeps its place. */
const MISSING_ADVANCE = 0.5

/** CSS's font-size keywords, in px. */
const SIZE_KEYWORDS: Record<string, number> = { 'xx-small': 9, 'x-small': 10, small: 13, medium: 16, large: 18, 'x-large': 24, 'xx-large': 32, 'xxx-large': 48 }
/** Px per CSS unit (a user unit is a px). */
const PX_PER: Record<string, number> = { px: 1, pt: 4 / 3, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, q: 96 / 101.6 }
/**
 * Where each baseline the SVG names sits above the alphabetic one, in em, for
 * a font of ascent 0.8 and descent 0.2 with New Computer Modern's x-height
 * (0.43) and math axis (0.25).
 */
const BASELINES: Record<string, number> = {
  auto: 0,
  alphabetic: 0,
  baseline: 0,
  middle: 0.215,
  central: 0.3,
  mathematical: 0.25,
  hanging: 0.8,
  'text-before-edge': 0.8,
  'text-top': 0.8,
  'before-edge': 0.8,
  'text-after-edge': -0.2,
  'text-bottom': -0.2,
  'after-edge': -0.2,
  ideographic: -0.2,
}

/** A length in px from a CSS value: a number, an absolute unit, or em, ex and % of `em`; undefined for anything else. */
function cssLength(value: string, em: number): number | undefined {
  const match = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-z%]*)\s*$/i.exec(value)
  if (!match) return undefined
  const n = Number(match[1])
  const unit = match[2]!.toLowerCase()
  let px: number
  if (unit === '') px = n
  else if (unit === 'em') px = n * em
  else if (unit === 'ex') px = (n * em) / 2
  else if (unit === '%') px = (n * em) / 100
  else if (unit === 'rem') px = n * INITIAL_FONT.size
  else px = n * (PX_PER[unit] ?? NaN)
  return Number.isFinite(px) ? px : undefined
}

/** A font-size value, in px, relative to the parent's; undefined when it isn't one. */
function fontSize(value: string, parent: number): number | undefined {
  const v = value.trim().toLowerCase()
  const keyword = SIZE_KEYWORDS[v]
  if (keyword !== undefined) return keyword
  if (v === 'smaller') return parent / 1.2
  if (v === 'larger') return parent * 1.2
  const px = cssLength(v, parent)
  return px !== undefined && px >= 0 ? px : undefined
}

function isBold(weight: string, parent: boolean): boolean {
  const w = weight.trim().toLowerCase()
  if (w === 'bold' || w === 'bolder') return true
  if (w === 'normal' || w === 'lighter') return false
  const n = Number(w)
  return w !== '' && Number.isFinite(n) ? n >= 600 : parent
}

function isItalic(style: string, parent: boolean): boolean {
  const s = style.trim().toLowerCase()
  if (s === 'italic' || s.startsWith('oblique')) return true
  return s === 'normal' ? false : parent
}

/** The `font` shorthand's style, weight and size (`italic bold 12px/1.2 serif`, `10px 'DejaVu Sans'`); its family is not read. */
function fontShorthand(value: string): { size?: string; weight?: string; style?: string } {
  const out: { size?: string; weight?: string; style?: string } = {}
  for (const token of value.trim().toLowerCase().split(/\s+/)) {
    if (token === 'italic' || token === 'oblique') out.style = token
    else if (token === 'bold' || token === 'bolder' || token === 'lighter' || /^[1-9]00$/.test(token)) out.weight = token
    else if (token !== 'normal' && token !== 'small-caps') {
      // The size, then the family: the first token that is neither style, weight nor variant.
      const size = token.split('/')[0]!
      if (SIZE_KEYWORDS[size] !== undefined || cssLength(size, INITIAL_FONT.size) !== undefined) out.size = size
      break
    }
  }
  return out
}

/** The names fontOf reads: an element with none of them (and no `style` naming one) inherits its parent's font as is. */
export const FONT_PROPERTIES = ['font', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'alignment-baseline', 'xml:space', 'white-space', 'text-decoration'] as const

/** An element's text properties, from its declarations (`get`: a presentation attribute or style declaration by name) and its parent's. */
export function fontOf(get: (name: string) => string | undefined, parent: TextFont): TextFont {
  const short = get('font')
  const shorthand = short === undefined ? {} : fontShorthand(short)
  const sizeValue = get('font-size') ?? shorthand.size
  const weight = get('font-weight') ?? shorthand.weight
  const style = get('font-style') ?? shorthand.style
  const anchor = get('text-anchor')?.toLowerCase()
  const baseline = get('alignment-baseline') ?? get('dominant-baseline')
  const shift = baseline === undefined ? undefined : BASELINES[baseline.trim().toLowerCase()]
  const space = get('white-space')?.toLowerCase()
  const xmlSpace = get('xml:space')
  const decoration = get('text-decoration')?.toLowerCase()
  let preserve = parent.preserve
  if (space !== undefined && space !== 'inherit') preserve = space === 'pre' || space === 'pre-wrap' || space === 'break-spaces'
  else if (xmlSpace === 'preserve' || xmlSpace === 'default') preserve = xmlSpace === 'preserve'
  return {
    size: sizeValue === undefined ? parent.size : (fontSize(sizeValue, parent.size) ?? parent.size),
    bold: weight === undefined ? parent.bold : isBold(weight, parent.bold),
    italic: style === undefined ? parent.italic : isItalic(style, parent.italic),
    anchor: anchor === 'start' || anchor === 'middle' || anchor === 'end' ? anchor : parent.anchor,
    baselineShift: shift ?? parent.baselineShift,
    preserve,
    underline: decoration === undefined ? parent.underline : decoration.includes('underline'),
    lineThrough: decoration === undefined ? parent.lineThrough : decoration.includes('line-through'),
  }
}

// ─── TeX ─────────────────────────────────────────────────────────────────────

/**
 * Each character MathJax's text mode (textmacros) reads as markup, as the TeX
 * that draws it literally. A space is a control space, so runs of them and
 * those at a run's ends keep their width; a quote is closed off with `{}` so
 * two never make a double quote.
 */
const TEX_ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  $: '\\$',
  '%': '\\%',
  '&': '\\&',
  '#': '\\#',
  _: '\\_',
  '^': '\\textasciicircum{}',
  '~': '\\textasciitilde{}',
  ' ': '\\ ',
  ' ': '\\ ',
  '`': '`{}',
  "'": "'{}",
}

/** The TeX (a `\text{}`) that typesets a run: every character drawn as itself, none read as markup. */
export function svgTextTex(run: SvgTextRun): string {
  let body = ''
  for (const c of run.text) body += TEX_ESCAPES[c] ?? (INVISIBLE.test(c) ? '' : c)
  if (run.italic) body = `\\textit{${body}}`
  if (run.bold) body = `\\textbf{${body}}`
  return `\\text{${body}}`
}

// ─── Gathering ───────────────────────────────────────────────────────────────

/** A character of a text, with the span it is drawn in and the elements it is inside (the text first). */
export interface TextChar<S extends TextSpan> {
  ch: string
  span: S
  owners: readonly XmlElement[]
}

/** Characters dropped: controls (white space aside), and the zero-width ones no font draws. */
const INVISIBLE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f​-‍⁠﻿]/

/**
 * A text's characters, in order, white space collapsed where its span's font
 * doesn't preserve it (newlines and tabs as spaces, a space after a space
 * dropped, and the text's leading and trailing ones). `spanOf` gives a child
 * element's span from its parent's, undefined for one not displayed.
 * Throws RangeError past MAX_RAW_TEXT_CHARS.
 */
export function textChars<S extends TextSpan>(text: XmlElement, span: S, spanOf: (el: XmlElement, parent: S) => S | undefined): TextChar<S>[] {
  const raw: TextChar<S>[] = []
  const gather = (el: XmlElement, at: S, owners: readonly XmlElement[]) => {
    for (const item of el.content ?? []) {
      if (typeof item === 'string') {
        if (raw.length + item.length > MAX_RAW_TEXT_CHARS) throw new RangeError(`more than ${MAX_RAW_TEXT_CHARS} characters of text`)
        for (const ch of item) if (!INVISIBLE.test(ch)) raw.push({ ch: ch === '\n' || ch === '\r' || ch === '\t' ? ' ' : ch, span: at, owners })
      } else if ((item.name === 'tspan' || item.name === 'a') && owners.length < MAX_TEXT_DEPTH) {
        const inner = spanOf(item, at)
        if (inner) gather(item, inner, [...owners, item])
      }
    }
  }
  gather(text, span, [text])
  const kept: TextChar<S>[] = []
  for (const c of raw) {
    if (c.ch === ' ' && !c.span.font.preserve) {
      const before = kept[kept.length - 1]
      if (before === undefined || before.ch === ' ') continue
    }
    kept.push(c)
  }
  for (let last = kept[kept.length - 1]; last && last.ch === ' ' && !last.span.font.preserve; last = kept[kept.length - 1]) kept.pop()
  return kept
}

// ─── Setting ─────────────────────────────────────────────────────────────────

/** A run as typeset: its advance and outlines, in em. */
interface SetRun {
  width: number
  ops: readonly DrawOp[]
}

export type TextSetter = (text: string, bold: boolean, italic: boolean) => SetRun

/**
 * The typesetter with a cache for one picture (graphviz repeats a label's
 * words, a PDF's text gives each character its own position), and a run the
 * font can't set whole set a character at a time, those it lacks left blank
 * at MISSING_ADVANCE.
 */
export function textSetter(typeset: SvgTextTypesetter): TextSetter {
  const cache = new Map<string, SetRun | null>()
  const once = (text: string, bold: boolean, italic: boolean): SetRun | null => {
    const key = `${bold ? 'b' : ''}${italic ? 'i' : ''}\n${text}`
    let set = cache.get(key)
    if (set === undefined) {
      const result = typeset({ text, bold, italic })
      set = result ? { width: result.width, ops: result.ops } : null
      cache.set(key, set)
    }
    return set
  }
  return (text, bold, italic) => {
    const whole = once(text, bold, italic)
    if (whole) return whole
    const points = [...text]
    let width = 0
    const ops: DrawOp[] = []
    for (const ch of points) {
      const one = points.length > 1 ? once(ch, bold, italic) : null
      if (one) for (const op of one.ops) ops.push(shifted(op, width))
      width += one ? one.width : MISSING_ADVANCE
    }
    return { width, ops }
  }
}

/** An op moved `dx` em along the baseline. */
function shifted(op: DrawOp, dx: number): DrawOp {
  if (dx === 0) return op
  if (op.type === 'rect') return { ...op, x: op.x + dx }
  const m = op.transform
  return { type: 'path', d: op.d, transform: [m[0], m[1], m[2], m[3], m[4] + dx, m[5]] }
}

/** The values of a position list (`x="10 20 30"`, `dy="1.1em"`), in px of a font `em` big; an entry that can't be read is undefined. */
function positionList(value: string | undefined, em: number): (number | undefined)[] {
  if (value === undefined || value.trim() === '') return []
  return value.trim().split(/[\s,]+/).map(v => cssLength(v, em))
}

interface Lists {
  x: (number | undefined)[]
  y: (number | undefined)[]
  dx: (number | undefined)[]
  dy: (number | undefined)[]
}

/**
 * Sets a text's characters (textChars) with `set` (textSetter): every glyph
 * and decoration as a fill, in the text element's user units. `fontOfOwner`
 * gives the font size an element's position lists are read in (their em).
 */
export function setText<S extends TextSpan>(chars: readonly TextChar<S>[], set: TextSetter, emOf: (el: XmlElement) => number): PlacedFill[] {
  const lists = new Map<XmlElement, Lists>()
  const listsOf = (el: XmlElement): Lists => {
    let found = lists.get(el)
    if (!found) {
      const em = emOf(el)
      found = { x: positionList(el.attrs.x, em), y: positionList(el.attrs.y, em), dx: positionList(el.attrs.dx, em), dy: positionList(el.attrs.dy, em) }
      lists.set(el, found)
    }
    return found
  }
  // Each character's index among an element's characters, which picks its entry of that element's lists.
  const counters = new Map<XmlElement, number>()

  interface Segment {
    text: string
    span: S
    x: number
    y: number
    chunk: number
    pieces: { set: SetRun; at: number }[]
    advance: number
  }
  const segments: Segment[] = []
  /** Each text chunk (from one absolutely placed character to the next): where it starts and ends, and how it is anchored. */
  const chunks: { start: number; end: number; anchor: TextAnchor }[] = []
  let cx = 0
  let cy = 0
  let open: Segment | undefined
  const close = (segment: Segment) => {
    const points = [...segment.text]
    const font = segment.span.font
    let at = 0
    for (let i = 0; i < points.length; i += MAX_RUN_CHARS) {
      const piece = set(points.slice(i, i + MAX_RUN_CHARS).join(''), font.bold, font.italic)
      segment.pieces.push({ set: piece, at })
      at += piece.width
    }
    segment.advance = at * font.size
    cx += segment.advance
    chunks[segment.chunk]!.end = cx
    segments.push(segment)
  }

  for (const c of chars) {
    // The innermost element with an entry for this character decides each of its positions.
    let x: number | undefined, y: number | undefined, dx: number | undefined, dy: number | undefined
    for (let k = c.owners.length - 1; k >= 0; k--) {
      const owner = c.owners[k]!
      const index = counters.get(owner) ?? 0
      counters.set(owner, index + 1)
      const l = listsOf(owner)
      x ??= l.x[index]
      y ??= l.y[index]
      dx ??= l.dx[index]
      dy ??= l.dy[index]
    }
    const absolute = x !== undefined || y !== undefined
    const moved = (dx ?? 0) !== 0 || (dy ?? 0) !== 0
    if (open && (absolute || moved || open.span !== c.span)) {
      close(open)
      open = undefined
    }
    if (absolute) {
      cx = x ?? cx
      cy = y ?? cy
    }
    cx += dx ?? 0
    cy += dy ?? 0
    if (absolute || chunks.length === 0) chunks.push({ start: cx, end: cx, anchor: c.span.font.anchor })
    open ??= { text: '', span: c.span, x: cx, y: cy, chunk: chunks.length - 1, pieces: [], advance: 0 }
    open.text += c.ch
  }
  if (open) close(open)

  const fills: PlacedFill[] = []
  for (const segment of segments) {
    const { font, paint, hidden } = segment.span
    if (hidden || paint === null || !(font.size > 0)) continue
    const chunk = chunks[segment.chunk]!
    const shift = chunk.anchor === 'start' ? 0 : (chunk.start - chunk.end) * (chunk.anchor === 'middle' ? 0.5 : 1)
    const s = font.size
    const x0 = segment.x + shift
    const y0 = segment.y + font.baselineShift * s
    for (const piece of segment.pieces) {
      const tx = x0 + piece.at * s
      for (const op of piece.set.ops) {
        if (op.type === 'rect') fills.push({ d: box(op.x, op.y, op.width, op.height), transform: [s, 0, 0, s, tx, y0], paint })
        else {
          // The op's own transform, then the run's scale and place.
          const m = op.transform
          fills.push({ d: op.d, transform: [s * m[0], s * m[1], s * m[2], s * m[3], s * m[4] + tx, s * m[5] + y0], paint })
        }
      }
    }
    // Rules about as thick as the font's own underline, across the segment's advance.
    const width = segment.advance / s
    if (font.underline) fills.push({ d: box(0, 0.1, width, 0.05), transform: [s, 0, 0, s, x0, y0], paint })
    if (font.lineThrough) fills.push({ d: box(0, -0.275, width, 0.05), transform: [s, 0, 0, s, x0, y0], paint })
  }
  return fills
}

function box(x: number, y: number, width: number, height: number): string {
  return `M${x} ${y}H${x + width}V${y + height}H${x}Z`
}
