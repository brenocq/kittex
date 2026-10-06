// Lays presentation MathML out as boxes of terminal cells. Display math may use
// several rows (stacked fractions, limits, tall delimiters, tables); inline math
// stays on one row. Anything this doesn't know throws Unsupported, so the whole
// formula falls back to its source.

import {
  above,
  type Align,
  below,
  blank,
  type Box,
  extend,
  fail,
  hcat,
  height,
  isBlank,
  pad,
  phantom,
  textBox,
  toCells,
  vstack,
  widen,
} from './box.js'
import {
  arrowRow,
  braceRow,
  FENCES,
  mapScript,
  OVER_ACCENTS,
  STRETCHY_ARROWS,
  styleText,
  SUBSCRIPTS,
  SUPERSCRIPTS,
  tallDelimiter,
  tallIntegral,
  UNDER_ACCENTS,
  VULGAR,
  type Accent,
} from './chars.js'
import { type Form, inForm, operatorClass, parseClass, type TexClass, texSpace } from './classes.js'
import { type Element, elements, tokenText } from './xml.js'

interface Extent {
  up: number
  down: number
}

interface Ctx {
  /** Several rows allowed (display math). */
  twoD: boolean
  /** TeX's display style: limits go above and below. */
  display: boolean
  /** Script level: 0 for the main formula, 1 and up inside scripts. */
  level: number
  /** For a stretchy operator: the rows above and below the baseline to cover. */
  stretch?: Extent
}

/** One atom of a row. */
interface Item {
  el: Element
  box: Box
  cls: TexClass
  /** A fraction (thin spaces around it), or a \left…\right group or parenthesized fraction (no thin spaces). */
  kind?: 'frac' | 'fence'
  /** A one-row fraction's parenthesized form, used when it touches a neighbour. */
  wrapped?: Box
  /** A multi-letter mi that became an operator (sin, log): ordinary again next to a relation. */
  autoOP?: boolean
  /** A binary operator with nothing on its left (a sign): no space after it. */
  unary?: boolean
  /** Explicit spacing of an mo (\bmod), in cells. */
  lspace?: number
  rspace?: number
  /** The row inside a grouping mrow, to see through `{…}`. */
  row?: Row
}

interface Row {
  box: Box
  items: Item[]
  /** Some space was put between atoms (so the row isn't one tight unit). */
  spaced: boolean
}

/** Lays out a <math> element. */
export function layoutMath(root: Element, display: boolean): Box {
  if (root.name !== 'math') fail(`root <${root.name}>`)
  return layoutRow(elements(root), { twoD: display, display, level: 0 }).box
}

// ─── rows ────────────────────────────────────────────────────────────────────

interface Flat {
  el: Element
  ctx: Ctx
}

const SCRIPTED = new Set(['msub', 'msup', 'msubsup', 'munder', 'mover', 'munderover'])

/** Children of rows that carry no class of their own (plain mrow, mstyle) are spliced into the row. */
function flatten(children: readonly Element[], ctx: Ctx, out: Flat[] = []): Flat[] {
  for (const el of children) {
    if (el.name === 'mrow' && el.attrs['data-mjx-texclass'] === undefined) flatten(elements(el), ctx, out)
    else if (el.name === 'mstyle') flatten(elements(el), styleCtx(el, ctx), out)
    else if (el.name === 'semantics') {
      const first = elements(el)[0]
      if (first) flatten([first], ctx, out)
    } else out.push({ el, ctx })
  }
  return out
}

function styleCtx(el: Element, ctx: Ctx): Ctx {
  const next: Ctx = { twoD: ctx.twoD, display: ctx.display, level: ctx.level }
  const display = el.attrs.displaystyle
  if (display === 'true') next.display = true
  if (display === 'false') next.display = false
  const level = el.attrs.scriptlevel
  if (level !== undefined) {
    const n = parseInt(level, 10)
    if (Number.isNaN(n)) fail('scriptlevel')
    next.level = /^[+-]/.test(level) ? Math.max(0, ctx.level + n) : Math.max(0, n)
  }
  return next
}

function isNewline(el: Element): boolean {
  return el.name === 'mspace' && el.attrs.linebreak === 'newline'
}

function layoutRow(children: readonly Element[], ctx: Ctx): Row {
  const flat = flatten(children, ctx)
  if (!flat.some(f => isNewline(f.el))) return buildRow(flat, ctx)
  // \\ outside an environment: the lines, stacked and centred.
  if (!ctx.twoD) fail('line break in inline math')
  const parts: Flat[][] = [[]]
  for (const f of flat) {
    if (isNewline(f.el)) parts.push([])
    else parts.at(-1)!.push(f)
  }
  const rows = parts.map(part => buildRow(part, ctx))
  const box = vstack(rows.map(r => r.box), 'center', rows[0]!.box.base)
  return { box, items: rows.flatMap(r => r.items), spaced: true }
}

function buildRow(flat: readonly Flat[], rowCtx: Ctx): Row {
  const solid = flat.map((f, i) => (f.el.name === 'mspace' ? -1 : i)).filter(i => i >= 0)
  const first = solid[0]
  const last = solid.at(-1)
  const formOf = (i: number): Form => (solid.length > 1 && i === first ? 'prefix' : solid.length > 1 && i === last ? 'postfix' : 'infix')

  // Lay out everything that doesn't stretch, then stretch the rest over it.
  // A fence covers the whole row (and the row it wraps, if it is one); an
  // integral sign only its integrand, up to the next relation.
  const items: (Item | undefined)[] = flat.map(() => undefined)
  const stretchy = flat.map(f => stretches(f.el, f.ctx))
  flat.forEach((f, i) => {
    if (!stretchy[i]) items[i] = makeItem(f.el, strip(f.ctx), formOf(i))
  })
  const extentOf = (from: number, to: number): Extent => {
    const extent: Extent = { up: rowCtx.stretch?.up ?? 0, down: rowCtx.stretch?.down ?? 0 }
    for (let i = from; i < to; i++) {
      const box = items[i]?.box
      if (!box || stretchy[i]) continue
      extent.up = Math.max(extent.up, above(box))
      extent.down = Math.max(extent.down, below(box))
    }
    return extent
  }
  const whole = extentOf(0, flat.length)
  flat.forEach((f, i) => {
    if (!stretchy[i]) return
    let extent = whole
    const core = coreMo(f.el)!
    if (isIntegral(tokenText(core))) {
      let end = i + 1
      while (end < flat.length && !['REL', 'PUNCT'].includes(items[end] ? items[end]!.cls : 'ORD')) end++
      extent = extentOf(i + 1, end)
    } else if (core.attrs.minsize !== undefined || core.attrs.maxsize !== undefined) {
      // \big( and friends (and \binom's parentheses) cover what lies between them and their partner.
      const text = tokenText(core)
      const given = classOf(f.el, formOf(i))
      const opens = inForm(text, 'prefix') && !inForm(text, 'postfix')
      const closes = inForm(text, 'postfix') && !inForm(text, 'prefix')
      const cls = given === 'OPEN' || given === 'CLOSE' ? given : opens ? 'OPEN' : closes ? 'CLOSE' : given
      const next = stretchy.indexOf(true, i + 1)
      const prevIndex = stretchy.lastIndexOf(true, i - 1)
      if (cls === 'OPEN') extent = extentOf(i + 1, next < 0 ? flat.length : next)
      else if (cls === 'CLOSE') extent = extentOf(prevIndex + 1, i)
    }
    items[i] = makeItem(f.el, { ...strip(f.ctx), stretch: extent }, formOf(i))
  })
  const list = items as Item[]

  adjustClasses(list)
  middleBars(list)

  // A one-row fraction touching an atom on either side goes in parentheses.
  const solidItems = list.filter(item => item.cls !== 'NONE')
  solidItems.forEach((item, k) => {
    if (!item.wrapped) return
    const prev = solidItems[k - 1]
    const next = solidItems[k + 1]
    // After a function name (sin, log) parentheses read as its argument; after lim or ∑ a space does.
    const touches =
      (prev !== undefined && !prev.unary && (prev.cls === 'ORD' || prev.cls === 'INNER' || prev.cls === 'CLOSE' || (prev.cls === 'OP' && prev.el.name === 'mi'))) ||
      (next !== undefined && (next.cls === 'ORD' || next.cls === 'INNER' || next.cls === 'OPEN' || next.cls === 'OP'))
    if (touches) {
      item.box = item.wrapped
      item.kind = 'fence'
    }
  })

  const script = rowCtx.level > 0
  const boxes: Box[] = []
  let prev: Item | undefined
  let spaced = false
  // Explicit spaces (\, \quad) and TeX's own don't add up: the wider one wins.
  let pending = 0
  const flush = (space: number) => {
    if (space > 0) {
      boxes.push(blank(space))
      spaced = true
    }
    pending = 0
  }
  for (const item of list) {
    if (item.cls === 'NONE') {
      if (item.el.name === 'mspace') {
        pending += item.box.width
        continue
      }
      if (item.box.width > 0 || item.lspace) flush(pending + (item.lspace ?? 0))
      boxes.push(item.box)
      pending += item.rspace ?? 0
      continue
    }
    flush(Math.max(prev ? gap(prev, item, script) : 0, pending))
    boxes.push(item.box)
    prev = item
  }
  flush(pending)
  return { box: boxes.length ? hcat(boxes) : blank(0), items: list, spaced }
}

/** TeX's rules for binary operators with nothing to combine (The TeXbook, Appendix G, rules 5 and 6). */
function adjustClasses(items: Item[]): void {
  let prev: Item | undefined
  for (const item of items) {
    if (item.cls === 'NONE') continue
    if (prev?.autoOP && (item.cls === 'BIN' || item.cls === 'REL')) prev.cls = 'ORD'
    const before = prev?.cls
    if (item.cls === 'BIN' && (!before || before === 'BIN' || before === 'OP' || before === 'REL' || before === 'OPEN' || before === 'PUNCT')) {
      item.cls = 'ORD'
      item.unary = true
    } else if (before === 'BIN' && (item.cls === 'REL' || item.cls === 'CLOSE' || item.cls === 'PUNCT')) {
      prev!.cls = 'ORD'
    }
    prev = item
  }
  if (prev?.cls === 'BIN') prev.cls = 'ORD'
}

/** \middle| comes between an empty closing and an empty opening group: space it like a relation. */
function middleBars(items: Item[]): void {
  for (let i = 1; i + 1 < items.length; i++) {
    const [l, m, r] = [items[i - 1]!, items[i]!, items[i + 1]!]
    if (l.cls === 'CLOSE' && l.box.width === 0 && r.cls === 'OPEN' && r.box.width === 0 && m.el.name === 'mo') {
      l.cls = 'NONE'
      r.cls = 'NONE'
      m.cls = 'REL'
    }
  }
}

/** Terminal cells between two atoms: TeX's medium and thick spaces are one cell, thin ones only where they help. */
function gap(left: Item, right: Item, script: boolean): number {
  const space = texSpace(left.cls, right.cls, script)
  if (space === 0) return 0
  if (space >= 2) return 1
  if (left.unary || right.cls === 'PUNCT') return 0
  if (left.cls === 'PUNCT') return 1
  // A function name takes its parenthesized argument without a space: sin(π/2).
  if (left.cls === 'OP' && right.kind === 'fence') return left.el.name === 'mi' ? 0 : 1
  if (left.cls === 'OP' || right.cls === 'OP') return 1
  if (left.kind === 'frac' || right.kind === 'frac') return 1
  return 0
}

// ─── atoms ───────────────────────────────────────────────────────────────────

function makeItem(el: Element, ctx: Ctx, form: Form): Item {
  if (el.name === 'mfrac') {
    const frac = layoutFraction(el, ctx)
    return { el, box: frac.box, cls: frac.plain ? 'ORD' : 'INNER', kind: frac.plain ? undefined : 'frac', wrapped: frac.wrapped }
  }
  if (el.name === 'mrow') {
    const binom = ctx.twoD ? undefined : binomial(el, ctx)
    if (binom) return { el, box: binom, cls: 'ORD' }
    const row = layoutRow(elements(el), ctx)
    const cls = parseClass(el.attrs['data-mjx-texclass']) ?? 'ORD'
    return { el, box: row.box, cls, kind: cls === 'INNER' ? 'fence' : undefined, row }
  }
  const box = layoutNode(el, ctx)
  const item: Item = { el, box, cls: classOf(el, form) }
  if (el.name === 'mi' && item.cls === 'OP' && el.attrs['data-mjx-texclass'] === undefined) item.autoOP = true
  if (el.name === 'mo' && el.attrs['data-mjx-texclass'] === undefined && (el.attrs.lspace !== undefined || el.attrs.rspace !== undefined)) {
    item.cls = 'NONE'
    item.lspace = cells(length(el.attrs.lspace ?? '0'))
    item.rspace = cells(length(el.attrs.rspace ?? '0'))
  }
  return item
}

function classOf(el: Element, form: Form): TexClass {
  const explicit = parseClass(el.attrs['data-mjx-texclass'])
  if (explicit) return explicit
  switch (el.name) {
    case 'mo': {
      const text = tokenText(el)
      const given = el.attrs.form
      let cls = operatorClass(text, given === 'prefix' || given === 'infix' || given === 'postfix' ? given : form)
      if (el.attrs.fence === 'true' && cls === 'REL') {
        if (form === 'prefix') cls = 'OPEN'
        if (form === 'postfix') cls = 'CLOSE'
      }
      return cls
    }
    case 'mi': {
      const text = tokenText(el)
      const variant = el.attrs.mathvariant ?? ([...text].length > 1 ? 'normal' : 'italic')
      const auto = el.attrs['data-mjx-auto-op'] !== 'false'
      return auto && [...text].length > 1 && /^[a-z][a-z0-9]*$/i.test(text) && variant === 'normal' ? 'OP' : 'ORD'
    }
    case 'mspace':
      return 'NONE'
    default:
      if (SCRIPTED.has(el.name)) {
        const base = elements(el)[0]
        if (base && (base.name === 'mo' || base.name === 'mi' || SCRIPTED.has(base.name) || (base.name === 'mrow' && base.attrs['data-mjx-texclass'] !== undefined))) {
          return classOf(base, form)
        }
      }
      return 'ORD'
  }
}

/** The mo at the core of an embellished operator (an mo, or one with scripts or a lone wrapper). */
function coreMo(el: Element): Element | undefined {
  if (el.name === 'mo') return el
  if (el.name === 'mrow' || el.name === 'mstyle') {
    const kids = elements(el)
    return kids.length === 1 ? coreMo(kids[0]!) : undefined
  }
  if (SCRIPTED.has(el.name)) {
    const base = elements(el)[0]
    return base && coreMo(base)
  }
  return undefined
}

/** Integral signs that grow: the single, double and triple integrals. */
const INTEGRAL_SIGNS = new Map([
  ['∫', 1],
  ['∬', 2],
  ['∭', 3],
])

function isIntegral(text: string): boolean {
  return INTEGRAL_SIGNS.has(text)
}

/** Whether the atom stretches to the height of its row: a fence, or an integral sign in display style. */
function stretches(el: Element, ctx: Ctx): boolean {
  if (!ctx.twoD) return false
  const mo = coreMo(el)
  if (!mo) return false
  const text = tokenText(mo)
  if (isIntegral(text)) return ctx.display && !el.name.startsWith('munder') && el.name !== 'mover'
  if (!FENCES.has(text)) return false
  const stretchy = mo.attrs.stretchy
  if (stretchy === 'true') return true
  if (stretchy === 'false') return false
  if (mo.attrs.minsize !== undefined || mo.attrs.maxsize !== undefined) return true
  return text !== '/' && text !== '\\' && (inForm(text, 'prefix') || inForm(text, 'postfix'))
}

function layoutNode(el: Element, ctx: Ctx): Box {
  switch (el.name) {
    case 'mi':
    case 'mn':
    case 'mtext':
      return token(el)
    case 'ms': {
      const text = token(el)
      return hcat([textBox(el.attrs.lquote ?? '"'), text, textBox(el.attrs.rquote ?? '"')])
    }
    case 'mo':
      return operator(el, ctx)
    case 'mspace':
      return blank(cells(length(el.attrs.width ?? '0')))
    case 'mrow':
    case 'mstyle':
      return layoutRow([el], ctx).box
    case 'semantics': {
      const first = elements(el)[0]
      return first ? layoutNode(first, ctx) : blank(0)
    }
    case 'maction': {
      const kids = elements(el)
      const chosen = kids[parseInt(el.attrs.selection ?? '1', 10) - 1]
      return chosen ? layoutNode(chosen, ctx) : fail('maction')
    }
    case 'mphantom':
      return phantom(layoutRow(elements(el), strip(ctx)).box)
    case 'mpadded':
      return padded(el, ctx)
    case 'mfrac':
      return layoutFraction(el, ctx).box
    case 'msqrt':
      return root(layoutRow(elements(el), strip(ctx)), undefined, ctx)
    case 'mroot': {
      const kids = elements(el)
      if (kids.length !== 2) fail('mroot')
      return root(layoutRow([kids[0]!], strip(ctx)), kids[1]!, ctx)
    }
    case 'msub':
    case 'msup':
    case 'msubsup':
      return scripts(el, ctx)
    case 'mmultiscripts':
      return multiscripts(el, ctx)
    case 'munder':
    case 'mover':
    case 'munderover':
      return underOver(el, ctx)
    case 'menclose':
      return enclose(el, ctx)
    case 'mtable':
      return table(el, ctx)
  }
  return fail(`<${el.name}>`)
}

/** The context without a stretch target, for anything but an embellished operator's base. */
function strip(ctx: Ctx): Ctx {
  return ctx.stretch ? { twoD: ctx.twoD, display: ctx.display, level: ctx.level } : ctx
}

function scriptCtx(ctx: Ctx): Ctx {
  return { twoD: ctx.twoD, display: false, level: ctx.level + 1 }
}

// ─── tokens ──────────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text.replace(/[\u00a0\u2000-\u200a\u202f\u205f]/g, ' ')
}

function token(el: Element): Box {
  const text = normalize(tokenText(el))
  // MathJax's noundefined package marks an unknown macro as red text.
  if (el.name === 'mtext' && el.attrs.mathcolor === 'red' && text.startsWith('\\')) fail('undefined macro')
  const variant = el.attrs.mathvariant
  return textBox(styleText(text, variant))
}

function operator(el: Element, ctx: Ctx): Box {
  const text = normalize(tokenText(el))
  const stretch = ctx.stretch
  if (stretch && (stretch.up > 0 || stretch.down > 0)) {
    const rows = stretch.up + stretch.down + 1
    const count = INTEGRAL_SIGNS.get(text)
    const column = count ? tallIntegral(rows).map(c => c.repeat(count)) : tallDelimiter(text, rows, stretch.up)
    const cellRows = column.map(c => toCells(c))
    return { rows: cellRows, width: cellRows[0]!.length, base: stretch.up }
  }
  return textBox(styleText(text, el.attrs.mathvariant))
}

/** em in a MathML length. */
function length(value: string): number {
  const named: Record<string, number> = {
    veryverythinmathspace: 1,
    verythinmathspace: 2,
    thinmathspace: 3,
    mediummathspace: 4,
    thickmathspace: 5,
    verythickmathspace: 6,
    veryverythickmathspace: 7,
  }
  const v = value.trim()
  const negative = v.startsWith('negative')
  const name = negative ? v.slice(8) : v
  if (named[name] !== undefined) return ((negative ? -1 : 1) * named[name]!) / 18
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+))\s*(em|ex|pt|px|mu|in|cm|mm|pc)?$/.exec(v)
  if (!m) return fail(`length ${value}`)
  const n = parseFloat(m[1]!)
  const unit = m[2] ?? 'em'
  const per: Record<string, number> = { em: 1, ex: 0.43, pt: 0.1, px: 1 / 16, mu: 1 / 18, in: 7.2, cm: 2.835, mm: 0.2835, pc: 1.2 }
  return n * per[unit]!
}

/** Cells for a horizontal space in em: any positive space is at least one cell, a quad two. */
function cells(em: number): number {
  return em <= 0.05 ? 0 : Math.max(1, Math.round(em * 2))
}

function padded(el: Element, ctx: Ctx): Box {
  const inner = layoutRow(elements(el), ctx).box
  if (!isBlank(inner)) return inner
  // Phantoms and struts: \vphantom keeps its height, \hphantom its width.
  let box = inner
  if (el.attrs.width === '0') box = { rows: box.rows.map(() => []), width: 0, base: box.base }
  if (el.attrs.height === '0' && el.attrs.depth === '0') box = blank(box.width)
  return box
}

// ─── fractions ───────────────────────────────────────────────────────────────

interface Fraction {
  box: Box
  /** Parenthesized form of a one-row fraction. */
  wrapped?: Box
  /** A vulgar fraction character: an ordinary atom. */
  plain?: boolean
}

function layoutFraction(el: Element, ctx: Ctx): Fraction {
  const kids = elements(el)
  if (kids.length !== 2) fail('mfrac')
  const [num, den] = kids as [Element, Element]
  const noBar = /^0+(\.0*)?([a-z]+)?$/.test(el.attrs.linethickness ?? '')
  const inner = strip(ctx)

  const vulgar = noBar ? undefined : VULGAR.get(`${numeral(num)}/${numeral(den)}`)
  if (vulgar && (!ctx.twoD || !ctx.display)) return { box: textBox(vulgar), plain: true }

  if (ctx.twoD && ctx.level === 0 && el.attrs.bevelled !== 'true') {
    const partCtx: Ctx = { twoD: true, display: false, level: ctx.display ? ctx.level : ctx.level + 1 }
    const top = layoutRow([num], partCtx).box
    const bottom = layoutRow([den], partCtx).box
    // A bar over tall parts (a fraction of fractions) reaches past them, so it reads as the main one.
    const overhang = height(top) > 1 || height(bottom) > 1 ? 1 : 0
    const width = Math.max(top.width, bottom.width) + 2 * overhang
    const bar = noBar ? blank(width) : textBox('─'.repeat(width))
    return { box: vstack([top, bar, bottom], 'center', height(top)) }
  }

  if (vulgar) return { box: textBox(vulgar), plain: true }

  const top = layoutRow([num], inner)
  const bottom = layoutRow([den], inner)
  if (noBar) {
    // \binom and friends written on one line: n over k as "n k" inside the parentheses MathJax adds.
    return { box: hcat([top.box, blank(1), bottom.box]), plain: true }
  }
  const box = hcat([parens(top.box, needsParens(top, 'num')), textBox('/'), parens(bottom.box, needsParens(bottom, 'den'))])
  return { box, wrapped: parens(box, true) }
}

/** \binom{n}{k} on one line: C(n, k). MathJax writes it as ( mfrac[linethickness=0] ). */
function binomial(el: Element, ctx: Ctx): Box | undefined {
  const kids = elements(el)
  if (kids.length !== 3) return undefined
  const [open, frac, close] = kids as [Element, Element, Element]
  const fence = (e: Element, ch: string) => {
    const mo = coreMo(e)
    return mo !== undefined && tokenText(mo) === ch
  }
  if (!fence(open, '(') || !fence(close, ')') || frac.name !== 'mfrac') return undefined
  if (!/^0+(\.0*)?([a-z]+)?$/.test(frac.attrs.linethickness ?? '')) return undefined
  const [n, k] = elements(frac)
  if (!n || !k) return undefined
  return hcat([textBox('C('), layoutRow([n], ctx).box, textBox(', '), layoutRow([k], ctx).box, textBox(')')])
}

/** The digits of an mn, seen through grouping mrows; '' for anything else. */
function numeral(el: Element): string {
  if (el.name === 'mn') return tokenText(el)
  if (el.name === 'mrow' || el.name === 'mstyle') {
    const kids = elements(el)
    return kids.length === 1 ? numeral(kids[0]!) : ''
  }
  return ''
}

function parens(box: Box, wrap: boolean): Box {
  if (!wrap) return box
  if (height(box) === 1) return hcat([textBox('('), box, textBox(')')])
  const delim = (ch: string) => ({ rows: tallDelimiter(ch, height(box), box.base).map(c => toCells(c)), width: 1, base: box.base })
  return hcat([delim('('), box, delim(')')])
}

/** The atoms of a row with zero-width struts dropped, seen through a lone `{…}` group. */
function atoms(row: Row): { items: Item[]; spaced: boolean } {
  let items = row.items.filter(item => item.box.width > 0)
  let spaced = row.spaced
  while (items.length === 1 && items[0]!.row && items[0]!.kind !== 'fence') {
    const inner = items[0]!.row!
    items = inner.items.filter(item => item.box.width > 0)
    spaced = inner.spaced
  }
  return { items, spaced }
}

const DIFFERENTIALS = new Set(['d', '∂', 'δ', 'Δ', '∇', 'D'])

/** Whether a linear fraction's numerator or denominator needs parentheses to read right. */
function needsParens(row: Row, side: 'num' | 'den'): boolean {
  const { items, spaced } = atoms(row)
  if (items.length === 0) return false
  if (items.some(item => item.wrapped && item.kind === 'frac')) return true
  if (items.length === 1) {
    const only = items[0]!
    return only.el.name === 'mtext' && tokenText(only.el).includes(' ')
  }
  if (spaced) return true
  if (side === 'num') return false
  // A denominator is one unit only if it is a differential (dx, ∂x²), a call g(x), or n!.
  const [head, second] = items as [Item, Item]
  const lastItem = items.at(-1)!
  const single = (item: Item) => ['mi', 'mn', 'msub', 'msup', 'msubsup'].includes(item.el.name)
  if (items.length === 2 && DIFFERENTIALS.has(plainText(head)) && single(second)) return false
  if (single(head) && second.cls === 'OPEN' && lastItem.cls === 'CLOSE') return false
  if (items.length === 2 && single(head) && plainText(second) === '!') return false
  return true
}

function plainText(item: Item): string {
  return item.box.rows.length === 1 ? item.box.rows[0]!.join('') : ''
}

// ─── roots ───────────────────────────────────────────────────────────────────

function isAtom(row: Row): boolean {
  const { items } = atoms(row)
  if (items.length === 0) return true
  if (items.length !== 1) return false
  const only = items[0]!
  if (only.kind === 'fence') return true
  return (only.el.name === 'mi' || only.el.name === 'mn' || only.el.name === 'mtext') && !plainText(only).includes(' ')
}

function root(radicand: Row, indexEl: Element | undefined, ctx: Ctx): Box {
  let index: Box | undefined
  let mapped: string | undefined
  if (indexEl) {
    index = layoutRow([indexEl], { twoD: ctx.twoD, display: false, level: ctx.level + 2 }).box
    mapped = height(index) === 1 ? mapScript(index.rows[0]!, SUPERSCRIPTS) : undefined
  }
  const sign = mapped === '³' ? '∛' : mapped === '⁴' ? '∜' : '√'
  const prefix = sign === '√' && mapped !== undefined ? mapped : ''
  if (index && sign === '√' && mapped === undefined && !ctx.twoD) fail('root index')
  const r = radicand.box

  if (height(r) === 1 && (isAtom(radicand) || !ctx.twoD)) {
    const body = isAtom(radicand) ? r : parens(r, true)
    const box = hcat([textBox(prefix + sign), body])
    return index && mapped === undefined ? hangIndex(box, index, 0) : box
  }
  if (height(r) === 1) {
    // √ with a bar over the radicand on the row above.
    const bar = textBox(' '.repeat(toCells(prefix).length + 1) + '_'.repeat(r.width))
    const box = vstack([bar, hcat([textBox(prefix + sign), r])], 'left', 1)
    return index && mapped === undefined ? hangIndex(box, index, 1) : box
  }
  // A tall radical: ┌── over the radicand, │ down its left side, ╲│ at the bottom.
  const rows = height(r) + 1
  const leadCells = toCells(prefix)
  const left = Array.from({ length: rows }, (_, i) => [
    ...(i === rows - 2 ? leadCells : Array<string>(leadCells.length).fill(' ')),
    i === rows - 1 ? '╲' : ' ',
    i === 0 ? '┌' : '│',
  ])
  const leftBox: Box = { rows: left, width: left[0]!.length, base: r.base + 1 }
  const body: Box = { rows: [Array<string>(r.width + 1).fill('─'), ...r.rows.map(row => [' ', ...row])], width: r.width + 1, base: r.base + 1 }
  const box = hcat([leftBox, body])
  return index && mapped === undefined ? hangIndex(box, index, box.rows.length - 1) : box
}

/** An index with no superscript form, hung over the left of the radical. */
function hangIndex(box: Box, index: Box, signRow: number): Box {
  const indent = index.width
  const shifted = pad(box, indent, 0)
  return compose([
    { box: shifted, row: -shifted.base, col: 0 },
    { box: index, row: signRow - shifted.base - height(index), col: 0 },
  ])
}

// ─── scripts ─────────────────────────────────────────────────────────────────

interface Placed {
  box: Box
  /** Top row, relative to the baseline. */
  row: number
  col: number
}

/** Boxes placed on a canvas around the baseline (row 0). */
function compose(parts: readonly Placed[]): Box {
  const top = Math.min(...parts.map(p => p.row))
  const bottom = Math.max(...parts.map(p => p.row + height(p.box) - 1))
  const left = Math.min(0, ...parts.map(p => p.col))
  const width = Math.max(0, ...parts.map(p => p.col + p.box.width)) - left
  const out = blank(width, bottom - top + 1, -top)
  for (const p of parts) {
    p.box.rows.forEach((row, r) => {
      row.forEach((cell, c) => {
        out.rows[p.row - top + r]![p.col - left + c] = cell
      })
    })
  }
  return out
}

/** Script text written inline when it has no Unicode script form: x^2n becomes x^(2n). */
function group(box: Box): string {
  const text = box.rows[0]!.join('')
  const cellsCount = box.rows[0]!.filter(c => c !== '').length
  if (cellsCount <= 1) return text
  if (/^\(.*\)$/.test(text) && balanced(text.slice(1, -1))) return text
  return `(${text})`
}

function balanced(text: string): boolean {
  let depth = 0
  for (const ch of text) {
    if (ch === '(') depth++
    if (ch === ')' && --depth < 0) return false
  }
  return depth === 0
}

function scripts(el: Element, ctx: Ctx): Box {
  const kids = elements(el)
  const expected = el.name === 'msubsup' ? 3 : 2
  if (kids.length !== expected) fail(el.name)
  const base = kids[0]!
  const sub = el.name === 'msup' ? undefined : kids[1]
  const sup = el.name === 'msub' ? undefined : el.name === 'msup' ? kids[1] : kids[2]
  return attach(base, sub, sup, ctx)
}

function attach(baseEl: Element, subEl: Element | undefined, supEl: Element | undefined, ctx: Ctx): Box {
  const sctx = scriptCtx(ctx)
  const scripts = makeScripts(subEl && layoutRow([subEl], sctx).box, supEl && layoutRow([supEl], sctx).box)
  const core = coreMo(baseEl)
  const integral = core !== undefined && isIntegral(tokenText(core)) && ctx.twoD && ctx.display

  // An integral is made tall enough to carry its limits beside it.
  let baseCtx = ctx
  if (integral) {
    const { sub, sup, subMapped, supMapped } = scripts
    const target = ctx.stretch ?? { up: 0, down: 0 }
    // A lone subscript with no script form (∫_C) can sit under a one-row sign; limits on both ends go beside a tall one.
    const unmappedSup = sup !== undefined && supMapped === undefined
    const unmappedSub = sub !== undefined && subMapped === undefined
    if (unmappedSup || (unmappedSub && sup !== undefined) || target.up + target.down > 0) {
      baseCtx = {
        ...ctx,
        stretch: {
          up: Math.max(target.up, sup ? (supMapped !== undefined ? 1 : height(sup)) : 0, 1),
          down: Math.max(target.down, sub ? (subMapped !== undefined ? 1 : height(sub)) : 0, sub ? 1 : 0),
        },
      }
    }
  }
  const base = baseScriptBox(baseEl, baseCtx)
  if (!ctx.twoD) return hcat([base, textBox(scriptText(scripts))])
  return compose([{ box: base, row: -base.base, col: 0 }, ...placeScripts(base, scripts, 'right', integral)])
}

interface Scripts {
  sub?: Box
  sup?: Box
  /** The scripts as Unicode sub/superscript characters, when they all have one. */
  subMapped?: string
  supMapped?: string
}

function makeScripts(sub: Box | undefined, sup: Box | undefined): Scripts {
  return {
    sub,
    sup,
    subMapped: sub && height(sub) === 1 ? mapScript(sub.rows[0]!, SUBSCRIPTS) : undefined,
    supMapped: sup && height(sup) === 1 ? mapScript(sup.rows[0]!, SUPERSCRIPTS) : undefined,
  }
}

/** Scripts on one row: Unicode script characters, or _(…) and ^(…). */
function scriptText({ sub, sup, subMapped, supMapped }: Scripts): string {
  let text = ''
  if (sub) text += subMapped ?? '_' + group(sub)
  if (sup) text += supMapped ?? '^' + group(sup)
  return text
}

/**
 * Where scripts go around a base drawn at column 0 with its baseline on row 0:
 * script characters on the base's top or bottom row, other scripts above or
 * below a one-row base and beside the top or bottom of a tall one.
 */
function placeScripts(base: Box, { sub, sup, subMapped, supMapped }: Scripts, side: 'left' | 'right', integral = false): Placed[] {
  const tall = height(base) > 1
  const top = -above(base)
  const bottom = below(base)
  const subBox = subMapped !== undefined ? textBox(subMapped) : sub
  const supBox = supMapped !== undefined ? textBox(supMapped) : sup
  const at = (box: Box, row: number, width: number): Placed => ({
    box: side === 'right' ? box : widen(box, width, 'right'),
    row,
    col: side === 'right' ? base.width : -width,
  })
  if (!tall && subMapped !== undefined && supMapped !== undefined) {
    const both = textBox(subMapped + supMapped)
    return [at(both, 0, both.width)]
  }
  const width = Math.max(subBox?.width ?? 0, supBox?.width ?? 0)
  const parts: Placed[] = []
  if (supBox) {
    const row = integral && tall ? top : supMapped !== undefined ? top : tall ? top - height(supBox) + 1 : top - height(supBox)
    parts.push(at(supBox, row, width))
  }
  if (subBox) {
    const row = integral && tall ? bottom - height(subBox) + 1 : subMapped !== undefined ? bottom : tall ? bottom : bottom + 1
    parts.push(at(subBox, row, width))
  }
  return parts
}

/** Pre- and postscripts (\sideset, \prescript): each side's scripts side by side. */
function multiscripts(el: Element, ctx: Ctx): Box {
  const kids = elements(el)
  if (kids.length === 0) fail('mmultiscripts')
  const sctx = scriptCtx(ctx)
  const sides: { sub: Box[]; sup: Box[] }[] = [
    { sub: [], sup: [] },
    { sub: [], sup: [] },
  ]
  let side = 0
  for (let i = 1; i < kids.length; ) {
    if (kids[i]!.name === 'mprescripts') {
      side = 1
      i++
      continue
    }
    const pair = [kids[i], kids[i + 1]]
    if (!pair[1]) fail('mmultiscripts pair')
    const [subEl, supEl] = pair as [Element, Element]
    if (subEl.name !== 'none') sides[side]!.sub.push(layoutRow([subEl], sctx).box)
    if (supEl.name !== 'none') sides[side]!.sup.push(layoutRow([supEl], sctx).box)
    i += 2
  }
  const join = (boxes: Box[]) => (boxes.length ? hcat(boxes) : undefined)
  const [post, pre] = sides.map(s => makeScripts(join(s.sub), join(s.sup))) as [Scripts, Scripts]
  const base = layoutNode(kids[0]!, strip(ctx))
  if (!ctx.twoD) return hcat([textBox(scriptText(pre)), base, textBox(scriptText(post))])
  return compose([{ box: base, row: -base.base, col: 0 }, ...placeScripts(base, post, 'right'), ...placeScripts(base, pre, 'left')])
}

/** A script's base; a one-row fraction there goes in parentheses. */
function baseScriptBox(el: Element, ctx: Ctx): Box {
  if (el.name === 'mfrac') {
    const frac = layoutFraction(el, ctx)
    return frac.wrapped ?? frac.box
  }
  return layoutNode(el, ctx)
}

// ─── under and over ──────────────────────────────────────────────────────────

const INTEGRALS = /^[∫-∳⨋-⨜]$/

/** Whether limits move to script positions outside display style (\sum, \lim, \operatorname*). */
function movable(base: Element): boolean {
  const mo = coreMo(base)
  if (mo) {
    if (mo.attrs.movablelimits === 'true') return true
    if (mo.attrs.movablelimits === 'false') return false
    const text = tokenText(mo)
    return operatorClass(text, 'prefix') === 'OP' && !INTEGRALS.test(text)
  }
  return base.name === 'mi' && [...tokenText(base)].length > 1
}

function underOver(el: Element, ctx: Ctx): Box {
  const kids = elements(el)
  const expected = el.name === 'munderover' ? 3 : 2
  if (kids.length !== expected) fail(el.name)
  const baseEl = kids[0]!
  const underEl = el.name === 'mover' ? undefined : kids[1]
  const overEl = el.name === 'munder' ? undefined : el.name === 'mover' ? kids[1] : kids[2]

  // Accents and braces: a lone mo over or under the base.
  const overText = overEl?.name === 'mo' ? tokenText(overEl) : undefined
  const underText = underEl?.name === 'mo' ? tokenText(underEl) : undefined
  if (el.name !== 'munderover') {
    const mark = overText ?? underText
    const isOver = overText !== undefined
    if (mark !== undefined) {
      const brace = braceRow(mark, 1)
      if (brace !== undefined) {
        if (!ctx.twoD) fail('brace in inline math')
        const base = layoutNode(baseEl, strip(ctx))
        const row = textBox(braceRow(mark, base.width)!)
        return isOver ? vstack([row, base], 'center', base.base + 1) : vstack([base, row], 'center', base.base)
      }
      const accent = (isOver ? OVER_ACCENTS : UNDER_ACCENTS).get(mark)
      if (accent && el.attrs[isOver ? 'accent' : 'accentunder'] !== 'false' && !(isOver ? overEl : underEl)!.attrs.accent?.startsWith('f')) {
        return applyAccent(layoutNode(baseEl, strip(ctx)), accent, isOver, ctx)
      }
    }
  }

  // \xrightarrow and friends: the arrow grows to fit its labels.
  const draw = baseEl.name === 'mo' && baseEl.attrs.stretchy !== 'false' ? STRETCHY_ARROWS.get(tokenText(baseEl)) : undefined
  if (draw && ctx.twoD) {
    const sctx = scriptCtx(ctx)
    const over = overEl && layoutRow([overEl], sctx).box
    const under = underEl && layoutRow([underEl], sctx).box
    const width = Math.max(over?.width ?? 0, under?.width ?? 0) + 2
    const arrow = textBox(draw(width))
    return stack(arrow, over, under)
  }

  if (!ctx.twoD || (!ctx.display && movable(baseEl))) return attach(baseEl, underEl, overEl, ctx)

  const sctx = scriptCtx(ctx)
  const base = layoutNode(baseEl, strip(ctx))
  const over = overEl && layoutRow([overEl], sctx).box
  const under = underEl && layoutRow([underEl], sctx).box
  return stack(base, over, under)
}

function stack(base: Box, over: Box | undefined, under: Box | undefined): Box {
  const parts = [over, base, under].filter((b): b is Box => b !== undefined)
  return vstack(parts, 'center', (over ? height(over) : 0) + base.base)
}

/** Adds a combining mark to a cell. */
function marked(cell: string, mark: string): string {
  return cell === '' ? cell : cell + mark
}

function applyAccent(base: Box, accent: Accent, over: boolean, ctx: Ctx): Box {
  if (height(base) === 1) {
    const row = base.rows[0]!
    const filled = row.filter(c => c !== '')
    if (filled.length === 1 && row.length === 1) return { ...base, rows: [[marked(row[0]!, accent.mark)]] }
    if (accent.wide) return { ...base, rows: [row.map(c => marked(c, accent.mark))] }
    if (!ctx.twoD) {
      if (accent.arrow) {
        const lastIndex = row.reduce((at, c, i) => (c !== '' && c !== ' ' ? i : at), -1)
        return { ...base, rows: [row.map((c, i) => (i === lastIndex ? marked(c, accent.mark) : c))] }
      }
      return { ...base, rows: [row.map(c => (c === ' ' ? c : marked(c, accent.mark)))] }
    }
  }
  if (!ctx.twoD) fail('accent over a tall base')
  const width = Math.max(1, base.width)
  const glyph = accent.arrow ? arrowRow(accent.arrow, width) : accent.wide ? accent.glyph.repeat(width) : accent.glyph
  const row = widen(textBox(glyph), width, 'center')
  return over ? vstack([row, base], 'center', base.base + 1) : vstack([base, row], 'center', base.base)
}

// ─── enclosures ──────────────────────────────────────────────────────────────

function enclose(el: Element, ctx: Ctx): Box {
  const inner = layoutRow(elements(el), strip(ctx)).box
  const notations = (el.attrs.notation ?? 'longdiv').trim().split(/\s+/)
  let box = inner
  for (const notation of notations) {
    switch (notation) {
      case 'updiagonalstrike':
      case 'downdiagonalstrike':
      case 'horizontalstrike': {
        const mark = notation === 'horizontalstrike' ? '\u0336' : '\u0338'
        if (box.rows.some(row => row.some(c => c.includes(mark)))) break
        box = { ...box, rows: box.rows.map(row => row.map(c => (c === ' ' || c === '' ? c : c + mark))) }
        break
      }
      case 'box':
      case 'roundedbox': {
        if (!ctx.twoD) break
        const [tl, tr, bl, br] = notation === 'box' ? ['┌', '┐', '└', '┘'] : ['╭', '╮', '╰', '╯']
        const w = box.width + 2
        const side = (ch: string): Box => ({ rows: box.rows.map(() => [ch]), width: 1, base: box.base })
        const middle = hcat([side('│'), pad(box, 1, 1), side('│')])
        box = vstack([textBox(tl + '─'.repeat(w) + tr), middle, textBox(bl + '─'.repeat(w) + br)], 'left', box.base + 1)
        break
      }
      case 'left':
      case 'right':
      case 'top':
      case 'bottom':
        break
      default:
        fail(`menclose ${notation}`)
    }
  }
  return sides(box, new Set(notations), ctx)
}

/** Rules on some sides of an enclosure (an array's outer | columns, \overline-like notations). */
function sides(box: Box, notations: ReadonlySet<string>, ctx: Ctx): Box {
  const [left, right, top, bottom] = ['left', 'right', 'top', 'bottom'].map(n => notations.has(n))
  if (!left && !right && !top && !bottom) return box
  if (height(box) === 1) {
    let row = box.rows[0]!
    if (top) row = row.map(c => marked(c, '\u0305'))
    if (bottom) row = row.map(c => marked(c, '\u0332'))
    const bar = ctx.twoD ? '│' : '|'
    const cellsRow = [...(left ? [bar] : []), ...row, ...(right ? [bar] : [])]
    return { rows: [cellsRow], width: cellsRow.length, base: 0 }
  }
  const rule = (ch: string): Box => ({ rows: box.rows.map(() => [ch]), width: 1, base: box.base })
  let out = hcat([...(left ? [rule('│'), blank(1, height(box), box.base)] : []), box, ...(right ? [blank(1, height(box), box.base), rule('│')] : [])])
  const line = (l: string, r: string) => textBox((left ? l : '─') + '─'.repeat(out.width - (left ? 1 : 0) - (right ? 1 : 0)) + (right ? r : '─'))
  if (top) out = vstack([line('┌', '┐'), out], 'left', out.base + 1)
  if (bottom) out = vstack([out, line('└', '┘')], 'left', out.base)
  return out
}

// ─── tables ──────────────────────────────────────────────────────────────────

function list(value: string | undefined, fallback: string): string[] {
  const parts = (value ?? fallback).trim().split(/\s+/)
  return parts.length ? parts : [fallback]
}

function pick<T>(values: readonly T[], i: number): T {
  return values[Math.min(i, values.length - 1)]!
}

function alignOf(value: string): Align {
  if (value === 'left' || value === 'right' || value === 'center') return value
  if (value === 'decimalpoint') return 'center'
  return fail(`columnalign ${value}`)
}

function table(el: Element, ctx: Ctx): Box {
  const cellCtx: Ctx = { twoD: ctx.twoD, display: el.attrs.displaystyle === 'true', level: ctx.level }
  const rowEls = elements(el)
  if (!ctx.twoD && rowEls.length > 1) fail('table in inline math')
  const tableAligns = list(el.attrs.columnalign, 'center')
  // A percentage (multline's) has no meaning in cells: no extra space.
  const spacing = list(el.attrs.columnspacing, '0.8em').map(v => (v.endsWith('%') ? 0 : cells(length(v))))
  const columnLines = list(el.attrs.columnlines, 'none')
  const rowLines = list(el.attrs.rowlines, 'none')

  interface Cell {
    box: Box
    align: Align
  }
  const rows: Cell[][] = []
  const labels: (Box | undefined)[] = []
  for (const rowEl of rowEls) {
    if (rowEl.name !== 'mtr' && rowEl.name !== 'mlabeledtr') fail(`<${rowEl.name}> in mtable`)
    const cellEls = elements(rowEl)
    let label: Box | undefined
    if (rowEl.name === 'mlabeledtr') {
      const labelEl = cellEls.shift()
      if (!labelEl) fail('mlabeledtr')
      label = layoutRow(elements(labelEl), { ...cellCtx, display: false }).box
    }
    const rowAligns = rowEl.attrs.columnalign ? list(rowEl.attrs.columnalign, 'center') : undefined
    rows.push(
      cellEls.map((cellEl, c) => {
        if (cellEl.name !== 'mtd') fail(`<${cellEl.name}> in mtr`)
        if ((cellEl.attrs.rowspan ?? '1') !== '1' || (cellEl.attrs.columnspan ?? '1') !== '1') fail('spanning cell')
        const align = alignOf(cellEl.attrs.columnalign ?? pick(rowAligns ?? tableAligns, c))
        return { box: layoutRow(elements(cellEl), cellCtx).box, align }
      }),
    )
    labels.push(label)
  }
  if (rows.length === 0) return blank(0)

  const columns = Math.max(...rows.map(r => r.length))
  const widths = Array.from({ length: columns }, (_, c) => Math.max(0, ...rows.map(r => r[c]?.box.width ?? 0)))
  const gaps = Array.from({ length: Math.max(0, columns - 1) }, (_, c) => {
    const line = pick(columnLines, c)
    const space = pick(spacing, c)
    return line === 'none' ? { space, line: '' } : { space: Math.max(3, space | 1), line: line === 'dashed' ? '┆' : '│' }
  })
  const tall = rows.some(r => r.some(cell => height(cell.box) > 1))

  const rowBoxes = rows.map(r => {
    const up = Math.max(0, ...r.map(cell => above(cell.box)))
    const down = Math.max(0, ...r.map(cell => below(cell.box)))
    const parts: Box[] = []
    for (let c = 0; c < columns; c++) {
      const cell = r[c] ?? { box: blank(0), align: 'center' as Align }
      parts.push(widen(extend(cell.box, up, down), widths[c]!, cell.align))
      const g = gaps[c]
      if (g && c < columns - 1) {
        const left = g.line ? (g.space - 1) / 2 : g.space
        const right = g.line ? g.space - 1 - left : 0
        parts.push(blank(left, up + down + 1, up))
        if (g.line) parts.push({ rows: Array.from({ length: up + down + 1 }, () => [g.line]), width: 1, base: up })
        if (right) parts.push(blank(right, up + down + 1, up))
      }
    }
    return extend(hcat(parts), up, down)
  })
  const width = Math.max(...rowBoxes.map(b => b.width))
  const lineCols: number[] = []
  let col = 0
  for (let c = 0; c < columns - 1; c++) {
    col += widths[c]!
    const g = gaps[c]!
    if (g.line) lineCols.push(col + (g.space - 1) / 2)
    col += g.space
  }

  const separator = (r: number): Box | undefined => {
    const line = pick(rowLines, r)
    if (line !== 'none') {
      const cellsRow = Array<string>(width).fill(line === 'dashed' ? '┄' : '─')
      for (const x of lineCols) cellsRow[x] = '┼'
      return { rows: [cellsRow], width, base: 0 }
    }
    return tall ? blank(width) : undefined
  }

  const stacked: Box[] = []
  const ruled = new Set<number>()
  let at = 0
  rowBoxes.forEach((box, r) => {
    if (r > 0) {
      const sep = separator(r - 1)
      if (sep) {
        if (pick(rowLines, r - 1) !== 'none') ruled.add(at)
        stacked.push(sep)
        at += height(sep)
      }
    }
    stacked.push(widen(box, width, 'left'))
    at += height(box)
  })
  let body = vstack(stacked, 'left', Math.floor((at - 1) / 2))

  const frame = el.attrs.frame
  if (frame !== undefined && frame !== 'none') {
    // A border one cell clear of the content; column and row rules meet it.
    const [h, v] = frame === 'dashed' ? ['┄', '┆'] : ['─', '│']
    const edge = (l: string, r: string, tee: string) => {
      const row = [l, ...Array<string>(body.width + 2).fill(h), r]
      for (const x of lineCols) row[x + 2] = tee
      return row
    }
    const middle = body.rows.map((row, y) => (ruled.has(y) ? ['├', h, ...row, h, '┤'] : [v, ' ', ...row, ' ', v]))
    body = { rows: [edge('┌', '┐', '┬'), ...middle, edge('└', '┘', '┴')], width: body.width + 4, base: body.base + 1 }
  }

  if (labels.some(l => l !== undefined)) {
    // Equation tags: a column of their own, two cells to the right.
    const labelWidth = Math.max(...labels.map(l => l?.width ?? 0))
    const column: Box[] = []
    rowBoxes.forEach((box, r) => {
      if (r > 0) {
        const sep = separator(r - 1)
        if (sep) column.push(blank(labelWidth, height(sep)))
      }
      const label = labels[r]
      column.push(label ? widen(extend(label, box.base, below(box)), labelWidth, 'right') : blank(labelWidth, height(box)))
    })
    if (frame !== undefined && frame !== 'none') {
      column.unshift(blank(labelWidth))
      column.push(blank(labelWidth))
    }
    const labelBox = vstack(column, 'left', body.base)
    body = hcat([body, blank(2, height(body), body.base), labelBox])
  }
  return body
}
