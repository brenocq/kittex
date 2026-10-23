/*
 * Which ```latex blocks are an image file to show, and how big it is drawn:
 * a block whose whole content is one `\includegraphics[options]{path}`,
 * optionally inside a figure or center environment with `\centering`,
 * `\caption` and `\label`. Anything else (a second image, text, a picture
 * drawn in TikZ) is not an image block and takes the diagram path (TeX, or
 * code) as before. Pure: the file itself is read and decoded elsewhere.
 */

/** A length from `\includegraphics`' options: a fraction of the line's width or of the text's height, or an absolute length in TeX points. */
export type ImageLength = { kind: 'line'; fraction: number } | { kind: 'page'; fraction: number } | { kind: 'absolute'; pt: number }

/** An image block: the file it names, as written, and the size its options ask for. */
export interface ImageSpec {
  path: string
  width?: ImageLength
  height?: ImageLength
  scale?: number
}

/** TeX points per unit. `px` is pdfTeX's default (a big point); `em` and `ex` at a 10 pt font. */
const UNIT_PT: Readonly<Record<string, number>> = {
  pt: 1,
  bp: 72.27 / 72,
  px: 72.27 / 72,
  in: 72.27,
  cm: 72.27 / 2.54,
  mm: 72.27 / 25.4,
  pc: 12,
  dd: 1238 / 1157,
  cc: (12 * 1238) / 1157,
  sp: 1 / 65536,
  em: 10,
  ex: 4.31,
}

/** The commands a length may be a fraction of: the line's width, or the text's height. */
const WIDTHS = new Set(['linewidth', 'textwidth', 'columnwidth', 'hsize', 'paperwidth'])
const HEIGHTS = new Set(['textheight', 'vsize', 'paperheight'])

/** A length as `\includegraphics` takes it (`0.8\linewidth`, `\textwidth`, `5cm`, `120pt`); undefined when it reads as none of these. */
export function parseLength(text: string): ImageLength | undefined {
  const m = /^\s*(\d*\.?\d*)\s*(?:\\([A-Za-z]+)|([a-z]{2}))\s*$/.exec(text)
  if (!m) return undefined
  const number = m[1] === '' ? 1 : Number(m[1])
  if (!Number.isFinite(number) || number <= 0) return undefined
  if (m[2] !== undefined) {
    if (WIDTHS.has(m[2])) return { kind: 'line', fraction: number }
    if (HEIGHTS.has(m[2])) return { kind: 'page', fraction: number }
    return undefined
  }
  const unit = m[1] === '' ? undefined : UNIT_PT[m[3]!]
  return unit === undefined ? undefined : { kind: 'absolute', pt: number * unit }
}

/** The size options of `\includegraphics[...]`: width, height and scale (the others, `keepaspectratio` and `page` among them, change nothing here). */
function parseOptions(text: string): Pick<ImageSpec, 'width' | 'height' | 'scale'> {
  const out: Pick<ImageSpec, 'width' | 'height' | 'scale'> = {}
  for (const item of text.split(',')) {
    const eq = item.indexOf('=')
    if (eq < 0) continue
    const key = item.slice(0, eq).trim()
    const value = item.slice(eq + 1).trim().replace(/^\{(.*)\}$/, '$1')
    if (key === 'width' || key === 'height') {
      const length = parseLength(value)
      if (length) out[key] = length
    } else if (key === 'scale') {
      const scale = Number(value)
      if (Number.isFinite(scale) && scale > 0) out.scale = scale
    }
  }
  return out
}

/** The index just past the group opened at `open` (a `{`), counting nested braces and skipping escaped ones; -1 when it never closes. */
function groupEnd(text: string, open: number): number {
  let depth = 0
  for (let at = open; at < text.length; at++) {
    const c = text[at]
    if (c === '\\') at++
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return at + 1
  }
  return -1
}

/** Commands that may stand around the image and draw nothing of their own here. */
const SPACING = /^\\(?:centering|noindent|par|smallskip|medskip|bigskip)(?![A-Za-z])/

/**
 * The image a ```latex block shows, or undefined when the block is anything
 * but one `\includegraphics` (with figure or center around it, `\centering`,
 * a `\caption` and a `\label`, comments and blank lines).
 */
export function imageBlock(source: string): ImageSpec | undefined {
  // Comments out: a % not escaped as \% (an even run of backslashes before it) to the end of its line.
  let rest = source.replace(/(^|[^\\])((?:\\\\)*)%[^\n]*/g, '$1$2')
  const open: string[] = []
  let spec: ImageSpec | undefined
  for (;;) {
    rest = rest.replace(/^\s+/, '')
    if (rest === '') break
    let m: RegExpExecArray | null
    if ((m = /^\\begin\s*\{(figure\*?|center)\}\s*(?:\[[^\]\n]*\])?/.exec(rest))) {
      open.push(m[1]!)
      rest = rest.slice(m[0].length)
    } else if ((m = /^\\end\s*\{(figure\*?|center)\}/.exec(rest))) {
      if (open.pop() !== m[1]) return undefined
      rest = rest.slice(m[0].length)
    } else if ((m = SPACING.exec(rest))) {
      rest = rest.slice(m[0].length)
    } else if ((m = /^\\(?:caption|label)\s*(?:\[[^\]\n]*\]\s*)?(?=\{)/.exec(rest))) {
      const end = groupEnd(rest, m[0].length)
      if (end < 0) return undefined
      rest = rest.slice(end)
    } else if ((m = /^\\includegraphics\*?\s*(?:\[([^\]]*)\]\s*)?\{([^{}\n]*)\}/.exec(rest))) {
      if (spec) return undefined
      const path = m[2]!.trim().replace(/^"(.*)"$/, '$1')
      if (path === '') return undefined
      spec = { path, ...parseOptions(m[1] ?? '') }
      rest = rest.slice(m[0].length)
    } else {
      return undefined
    }
  }
  return open.length === 0 ? spec : undefined
}

/**
 * An image block's path as a file system path: absolute as written, `~/`
 * under the home directory, anything else under the session's working
 * directory, with `.` and `..` folded. Undefined where it can't be placed
 * (`~user/`, a relative path without a working directory).
 */
export function resolveImagePath(path: string, cwd: string | undefined, home: string | undefined): string | undefined {
  let full: string
  if (path.startsWith('/')) full = path
  else if (path === '~' || path.startsWith('~/')) {
    if (home === undefined || !home.startsWith('/')) return undefined
    full = `${home}/${path.slice(2)}`
  } else if (path.startsWith('~')) return undefined
  else {
    if (cwd === undefined || !cwd.startsWith('/')) return undefined
    full = `${cwd}/${path}`
  }
  const parts: string[] = []
  for (const part of full.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return `/${parts.join('/')}`
}

// ─── Sizing ──────────────────────────────────────────────────────────────────

/**
 * What an absolute length is measured against: LaTeX's article class at
 * 10 pt sets its text 345 pt wide and 550 pt tall, so `width=5cm` takes the
 * share of the column a 5 cm figure takes of that page's line, and a height
 * the same share of the rows a picture may take.
 */
export const LINE_WIDTH_PT = 345
export const TEXT_HEIGHT_PT = 550

/** The cells an image may take, and their size. */
export interface ImageBox {
  /** Cells across (the reply column) and rows (MAX_PICTURE_ROWS by default) the image may take. */
  maxColumns: number
  maxRows: number
  cellWidth: number
  cellHeight: number
}

/** Where an image is drawn: whole cells, and the pixels of those cells its picture covers (aspect ratio kept, centred in them). */
export interface ImageFit {
  columns: number
  rows: number
  widthPx: number
  heightPx: number
}

/**
 * The size an image is drawn at, from its own size in pixels and its
 * block's options: `width` and `height` in fractions of the column (and of
 * the rows a picture may take) or absolute lengths measured against
 * LINE_WIDTH_PT and TEXT_HEIGHT_PT, `scale` against its own pixels, and
 * without any, as wide as the column. Then always: the aspect ratio kept
 * (width and height both given fit the image inside both, as
 * keepaspectratio does), no wider than the column, no taller than
 * `maxRows`, and never more pixels than the image has.
 */
export function fitImage(own: { width: number; height: number }, spec: Pick<ImageSpec, 'width' | 'height' | 'scale'>, box: ImageBox): ImageFit {
  const ownWidth = Math.max(1, own.width)
  const ownHeight = Math.max(1, own.height)
  const aspect = ownHeight / ownWidth
  const columnPx = Math.max(1, Math.floor(box.maxColumns)) * box.cellWidth
  const rowsPx = Math.max(1, Math.floor(box.maxRows)) * box.cellHeight
  const along = (length: ImageLength, axis: 'width' | 'height') => {
    const full = axis === 'width' ? columnPx : rowsPx
    if (length.kind === 'line') return length.fraction * columnPx
    if (length.kind === 'page') return length.fraction * rowsPx
    return (length.pt / (axis === 'width' ? LINE_WIDTH_PT : TEXT_HEIGHT_PT)) * full
  }
  let width: number
  if (spec.width && spec.height) width = Math.min(along(spec.width, 'width'), along(spec.height, 'height') / aspect)
  else if (spec.width) width = along(spec.width, 'width')
  else if (spec.height) width = along(spec.height, 'height') / aspect
  else if (spec.scale !== undefined) width = ownWidth * spec.scale
  else width = columnPx
  width = Math.min(width, columnPx, rowsPx / aspect, ownWidth)
  const widthPx = Math.max(1, Math.round(width))
  const heightPx = Math.max(1, Math.min(Math.round(rowsPx), Math.round(width * aspect)))
  const columns = Math.min(Math.max(1, Math.floor(box.maxColumns)), Math.max(1, Math.ceil(widthPx / box.cellWidth - 1e-9)))
  const rows = Math.min(Math.max(1, Math.floor(box.maxRows)), Math.max(1, Math.ceil(heightPx / box.cellHeight - 1e-9)))
  return { columns, rows, widthPx, heightPx }
}
