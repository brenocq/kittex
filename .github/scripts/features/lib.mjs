// What the README's cards share: the card frame and its GitHub (Primer)
// colours, a mini terminal panel, Roboto Mono text and typeset math drawn as
// outlines, and keyframes on a card's own loop.
//
// A card is one SVG for both GitHub themes, like the banner: its colours are
// custom properties, light by default and dark under prefers-color-scheme.
// Titles and descriptions are <text> in GitHub's system font stack, so they
// look native on every OS; everything else is outlines.

/** GitHub's Primer colours, and kittex's orange as the one accent. */
export const PRIMER = {
  light: { fg: '#1f2328', muted: '#59636e', border: '#d1d9e0', surface: '#f6f8fa' },
  dark: { fg: '#f0f6fc', muted: '#9198a1', border: '#3d444d', surface: '#151b23' },
}
export const ACCENT = '#fe8019'

/** The mini terminal's colours: gruvbox dark, as in the demo window (both page themes). */
export const TERM = { bg: '#282828', fg: '#ebdbb2', dim: '#a89984', faint: '#504945' }

export const FONT_STACK = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`

export const r = (n, digits = 2) => {
  const f = 10 ** digits
  const v = Math.round(n * f) / f
  return String(Object.is(v, -0) ? 0 : v).replace(/^(-?)0\./, '$1.')
}

const vars = theme => `svg{${Object.entries(theme).map(([k, v]) => `--${k}:${v}`).join(';')}}`

/** The colour custom properties for both page themes, with the classes that paint with them. */
export function themeCss() {
  return [
    vars(PRIMER.light),
    `@media (prefers-color-scheme:dark){${vars(PRIMER.dark)}}`,
    `.surface{fill:var(--surface);stroke:var(--border)}.edge{fill:none;stroke:var(--border)}`,
    `.title{fill:var(--fg);font:600 16px ${FONT_STACK}}`,
    `.desc{fill:var(--muted);font:400 13px ${FONT_STACK}}`,
  ].join('')
}

/** Shared glyph definitions: identical outlines are drawn once and reused. */
export class Defs {
  constructor(prefix = 'g') {
    this.prefix = prefix
    this.ids = new Map()
    this.out = []
  }
  id(d, attrs = '') {
    const key = `${d}|${attrs}`
    let id = this.ids.get(key)
    if (!id) {
      id = `${this.prefix}${this.ids.size.toString(36)}`
      this.ids.set(key, id)
      this.out.push(`<path id="${id}" d="${d}"${attrs}/>`)
    }
    return id
  }
}

/** Typeset ops (in em) as <use>/<rect> markup with their left baseline end at (x, baseline), `em` px per em. */
export function drawOps(defs, ops, x, baseline, em) {
  return ops
    .map(op => {
      if (op.type === 'rect') return `<rect x="${r(x + op.x * em)}" y="${r(baseline + op.y * em)}" width="${r(op.width * em)}" height="${r(op.height * em)}"/>`
      const [a, b, c, d, e, f] = op.transform
      return `<use href="#${defs.id(op.d)}" transform="matrix(${r(a * em, 5)} ${r(b * em, 5)} ${r(c * em, 5)} ${r(d * em, 5)} ${r(x + e * em)} ${r(baseline + f * em)})"/>`
    })
    .join('')
}

/** The ink box of typeset ops, in em, from the glyphs' points (close enough for layout). */
export function inkBox(ops) {
  let box = [Infinity, Infinity, -Infinity, -Infinity]
  const grow = (x, y) => {
    box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)]
  }
  for (const op of ops) {
    if (op.type === 'rect') {
      grow(op.x, op.y)
      grow(op.x + op.width, op.y + op.height)
      continue
    }
    const [a, b, c, d, e, f] = op.transform
    const nums = op.d.match(/-?\d*\.?\d+(?:e-?\d+)?/g).map(Number)
    for (let i = 0; i + 1 < nums.length; i += 2) grow(a * nums[i] + c * nums[i + 1] + e, b * nums[i] + d * nums[i + 1] + f)
  }
  return box
}

/**
 * A typeset formula placed in a box: scaled to `em` px per em (or less, to fit
 * `maxWidth` × `maxHeight`) and centred on (cx, cy) by its ink.
 */
export function placeMath(defs, result, { cx, cy, em, maxWidth = Infinity, maxHeight = Infinity }) {
  const [x0, y0, x1, y1] = inkBox(result.ops)
  const size = Math.min(em, maxWidth / (x1 - x0), maxHeight / (y1 - y0))
  const x = cx - ((x0 + x1) / 2) * size
  const baseline = cy - ((y0 + y1) / 2) * size
  return { markup: drawOps(defs, result.ops, x, baseline, size), size, box: [x + x0 * size, baseline + y0 * size, x + x1 * size, baseline + y1 * size] }
}

/**
 * Terminal text in Roboto Mono outlines: one cell per character from (x,
 * baseline), `size` px per em. Box-drawing ─ is drawn as a rule across its
 * cell, as terminals draw it; any other character the font lacks is refused.
 */
export function monoText(defs, mono, text, x, baseline, size) {
  const s = size / mono.upm
  const advance = mono.advance * s
  let out = ''
  ;[...text].forEach((ch, i) => {
    const cx = x + i * advance
    if (ch === ' ') return
    if (ch === '─') {
      out += `<rect x="${r(cx)}" y="${r(baseline - 0.36 * size)}" width="${r(advance + 0.05)}" height="${r(0.07 * size)}"/>`
      return
    }
    if (!mono.has(ch)) throw new Error(`Roboto Mono has no ${JSON.stringify(ch)}`)
    out += `<use href="#${defs.id(mono.glyph(ch), ` transform="scale(${r(s, 6)} ${r(-s, 6)})"`)}" x="${r(cx)}" y="${r(baseline)}"/>`
  })
  return out
}

/** The advance of one Roboto Mono cell at `size` px per em. */
export const cellWidth = (mono, size) => (mono.advance * size) / mono.upm

/** Keyframes on a loop of `loop` seconds: frames as [seconds, declarations]. */
export function keyframes(name, loop, frames) {
  return `@keyframes ${name}{${frames.map(([t, body]) => `${r((t / loop) * 100, 3)}%{${body}}`).join('')}}`
}

export const W = 420
export const H = 240
/** The illustration panel: a mini terminal window across the card's top. */
export const PANEL = { x: 12, y: 12, w: 396, h: 142, rx: 8 }
/** Where a panel's content starts, below its three window dots. */
export const CONTENT_TOP = PANEL.y + 22

/** A mini terminal panel's frame: the window and its three dots (`dotClass` paints them). */
export function panel({ fill = TERM.bg, cls = '', dotFill = TERM.faint, dotClass = '' } = {}) {
  const dots = [0, 1, 2]
    .map(i => `<circle cx="${PANEL.x + 13 + i * 11}" cy="${PANEL.y + 11}" r="3.2"${dotClass ? ` class="${dotClass}"` : ` fill="${dotFill}"`}/>`)
    .join('')
  return `<rect${cls ? ` class="${cls}"` : ''} x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.w}" height="${PANEL.h}" rx="${PANEL.rx}" fill="${fill}"/>${dots}`
}

const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * A whole card: its surface and border, the illustration, the title and up to
 * two lines of description.
 */
export function card({ title, label, lines, defs, css, body }) {
  const textX = PANEL.x + 4
  const description = lines.map((line, i) => `<tspan x="${textX}" y="${H - 37 + i * 18}">${escape(line)}</tspan>`).join('')
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<title>${escape(label)}</title>`,
    `<style>${themeCss()}${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>`,
    `<defs>${defs.out.join('')}</defs>`,
    `<rect class="surface" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12"/>`,
    body,
    `<text class="title" x="${textX}" y="${H - 58}">${escape(title)}</text>`,
    `<text class="desc">${description}</text>`,
    `</svg>`,
  ].join('\n') + '\n'
}
