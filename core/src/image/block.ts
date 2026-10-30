/*
 * Which ```latex blocks are image files to show, and how big each is drawn: a
 * block whose whole content is `\includegraphics[options]{path}` commands,
 * one to MAX_BLOCK_IMAGES of them, each alone or in a subfigure or minipage
 * of its own, side by side in rows (`\\` or a blank line starts the next),
 * optionally inside a figure or center environment with `\centering`,
 * `\caption` and `\label`. Anything else (text, a picture drawn in TikZ) is
 * not an image block and takes the diagram path (TeX, or code) as before.
 * Pure: the files themselves are read and decoded elsewhere.
 */

/** A length from `\includegraphics`' options: a fraction of the line's width or of the text's height, or an absolute length in TeX points. */
export type ImageLength = { kind: 'line'; fraction: number } | { kind: 'page'; fraction: number } | { kind: 'absolute'; pt: number }

/** One image file to show: its path, as written, and the size its options ask for. */
export interface ImageSpec {
  path: string
  width?: ImageLength
  height?: ImageLength
  scale?: number
}

/** An image of an image block: its file, and the subfigure or minipage it sits in, by that box's width. */
export interface BlockImage extends ImageSpec {
  /** The box's width (a fraction of the line, or absolute): `\linewidth` in the image's options is this, and so is its width without one. */
  box?: ImageLength
}

/** An image block: its images in rows, top to bottom, each row left to right; no row is empty. */
export interface ImageBlock {
  rows: BlockImage[][]
}

/**
 * The most images one block shows. Each file stays decoded while its block
 * is drawn (the plugin's ImageBook keeps four at the most pixels a file
 * keeps), and a row of more is a contact sheet, not a figure.
 */
export const MAX_BLOCK_IMAGES = 4

/** A block's images in reading order: rows top to bottom, each left to right. */
export function blockImages(block: ImageBlock): BlockImage[] {
  return block.rows.flat()
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

/** Commands that may stand around the images and draw nothing of their own here. */
const SPACING = /^\\(?:centering|noindent|smallskip|medskip|bigskip)(?![A-Za-z])/

/** What may stand between two images of a row: each leaves the same gap here (IMAGE_GAP), whatever its own width. */
const GAP = /^(?:~|\\(?:hfill|hfil|quad|qquad)(?![A-Za-z])|\\[,;: ]|\\hspace\*?\s*\{[^{}\n]*\})/

/** What ends a row: `\\` (with its optional `*` and `[length]`) or `\par`; a blank line does too. */
const ROW_BREAK = /^(?:\\\\\*?(?:\s*\[[^\]\n]*\])?|\\par(?![A-Za-z]))/

/** An open environment: figure or center, or a subfigure or minipage (`box`: its width) and whether its image came. */
interface Open {
  name: string
  box?: ImageLength
  filled?: boolean
}

/**
 * The images a ```latex block shows, or undefined when the block is anything
 * but `\includegraphics` commands (one to MAX_BLOCK_IMAGES, each alone or as
 * the one image of a subfigure or minipage, with figure or center around
 * them, `\centering`, captions, labels, the spacing between images, comments
 * and blank lines). `\\`, `\par` or a blank line between images starts a new
 * row.
 */
export function imageBlock(source: string): ImageBlock | undefined {
  // Comments out as TeX reads them: a % not escaped as \% (an even run of backslashes before it) to the
  // end of its line, the line break and the next line's indent with it (so a comment line is no blank line).
  let rest = source.replace(/(?<=(?:^|[^\\])(?:\\\\)*)%[^\n]*(?:\n[ \t]*)?/g, '')
  const open: Open[] = []
  const rows: BlockImage[][] = [[]]
  let count = 0
  const inBox = () => open.some(one => one.box !== undefined)
  // Inside a box a break ends the box's own lines, not the row it stands in.
  const breakRow = () => {
    if (!inBox() && rows.at(-1)!.length > 0) rows.push([])
  }
  for (;;) {
    const space = /^\s*/.exec(rest)![0]
    if (/\n[ \t]*\n/.test(space)) breakRow()
    rest = rest.slice(space.length)
    if (rest === '') break
    let m: RegExpExecArray | null
    if ((m = /^\\begin\s*\{(figure\*?|center)\}\s*(?:\[[^\]\n]*\])?/.exec(rest))) {
      if (inBox()) return undefined
      open.push({ name: m[1]! })
    } else if ((m = /^\\begin\s*\{(subfigure|minipage)\}\s*(?:\[[^\]\n]*\]\s*){0,3}\{([^{}\n]*)\}/.exec(rest))) {
      const box = parseLength(m[2]!)
      if (inBox() || !box || box.kind === 'page') return undefined
      open.push({ name: m[1]!, box })
    } else if ((m = /^\\end\s*\{(figure\*?|center|subfigure|minipage)\}/.exec(rest))) {
      const closed = open.pop()
      if (!closed || closed.name !== m[1] || (closed.box !== undefined && !closed.filled)) return undefined
    } else if ((m = SPACING.exec(rest)) || (m = GAP.exec(rest))) {
      // Nothing drawn: the row's gaps are the layout's.
    } else if ((m = ROW_BREAK.exec(rest))) {
      breakRow()
    } else if ((m = /^\\(?:caption|subcaption|label)\s*(?:\[[^\]\n]*\]\s*)?(?=\{)/.exec(rest))) {
      const end = groupEnd(rest, m[0].length)
      if (end < 0) return undefined
      rest = rest.slice(end)
      continue
    } else if ((m = /^\\includegraphics\*?\s*(?:\[([^\]]*)\]\s*)?\{([^{}\n]*)\}/.exec(rest))) {
      const path = m[2]!.trim().replace(/^"(.*)"$/, '$1')
      const box = open.findLast(one => one.box !== undefined)
      if (path === '' || box?.filled || ++count > MAX_BLOCK_IMAGES) return undefined
      if (box) box.filled = true
      rows.at(-1)!.push({ path, ...parseOptions(m[1] ?? ''), ...(box?.box ? { box: box.box } : {}) })
    } else {
      return undefined
    }
    rest = rest.slice(m[0].length)
  }
  if (rows.at(-1)!.length === 0) rows.pop()
  return open.length === 0 && rows.length > 0 ? { rows } : undefined
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
  const { columnPx, rowsPx } = boxPixels(box)
  const { width, height } = imageSize(own, spec, columnPx, columnPx, rowsPx)
  const widthPx = Math.max(1, Math.round(width))
  const heightPx = Math.max(1, Math.min(Math.round(rowsPx), Math.round(height)))
  return { ...cellsFor(widthPx, heightPx, box), widthPx, heightPx }
}

/** The pixels of the column and of the rows a picture may take. */
function boxPixels(box: ImageBox): { columnPx: number; rowsPx: number } {
  return { columnPx: Math.max(1, Math.floor(box.maxColumns)) * box.cellWidth, rowsPx: Math.max(1, Math.floor(box.maxRows)) * box.cellHeight }
}

/** The whole cells `widthPx` × `heightPx` pixels take, within the box. */
function cellsFor(widthPx: number, heightPx: number, box: ImageBox): { columns: number; rows: number } {
  return {
    columns: Math.min(Math.max(1, Math.floor(box.maxColumns)), Math.max(1, Math.ceil(widthPx / box.cellWidth - 1e-9))),
    rows: Math.min(Math.max(1, Math.floor(box.maxRows)), Math.max(1, Math.ceil(heightPx / box.cellHeight - 1e-9))),
  }
}

/**
 * fitImage's size in pixels, unrounded, where `\linewidth` is `linePx` (the
 * column, or the subfigure the image sits in) and absolute lengths are
 * measured against the whole column.
 */
function imageSize(own: { width: number; height: number }, spec: Pick<ImageSpec, 'width' | 'height' | 'scale'>, linePx: number, columnPx: number, rowsPx: number): { width: number; height: number } {
  const ownWidth = Math.max(1, own.width)
  const aspect = Math.max(1, own.height) / ownWidth
  const along = (length: ImageLength, axis: 'width' | 'height') => {
    if (length.kind === 'line') return length.fraction * linePx
    if (length.kind === 'page') return length.fraction * rowsPx
    return axis === 'width' ? (length.pt / LINE_WIDTH_PT) * columnPx : (length.pt / TEXT_HEIGHT_PT) * rowsPx
  }
  let width: number
  if (spec.width && spec.height) width = Math.min(along(spec.width, 'width'), along(spec.height, 'height') / aspect)
  else if (spec.width) width = along(spec.width, 'width')
  else if (spec.height) width = along(spec.height, 'height') / aspect
  else if (spec.scale !== undefined) width = ownWidth * spec.scale
  else width = linePx
  width = Math.min(width, linePx, rowsPx / aspect, ownWidth)
  return { width, height: width * aspect }
}

/** The gap between two images of a block, across and down: a share of the column, about LaTeX's `\hfill` between two 0.48\linewidth subfigures. */
export const IMAGE_GAP = 0.03

/** Where a block's images are drawn: the cells it takes, and each image's pixels in them. */
export interface BlockFit {
  columns: number
  rows: number
  /** The pixels the images and their gaps cover together, centred in the cells. */
  widthPx: number
  heightPx: number
  /** Each image's place in that area, in reading order (blockImages), from its top left. */
  images: { x: number; y: number; widthPx: number; heightPx: number }[]
}

/**
 * The size a block's images are drawn at, `own` their own sizes in reading
 * order. Each is sized as fitImage sizes one, its `\linewidth` the width of
 * the subfigure or minipage it sits in, which it is centred in. A row's
 * images stand IMAGE_GAP apart, centred on each other's middle; rows stand
 * as far apart, each centred across the widest. All of it too wide for the
 * column, or too tall for its rows, is scaled down as a whole.
 */
export function fitImageBlock(own: readonly { width: number; height: number }[], block: ImageBlock, box: ImageBox): BlockFit {
  const { columnPx, rowsPx } = boxPixels(box)
  const gap = IMAGE_GAP * columnPx
  let next = 0
  const rows = block.rows.map(row => {
    const items = row.map(image => {
      const boxPx = image.box && Math.min(columnPx, image.box.kind === 'absolute' ? (image.box.pt / LINE_WIDTH_PT) * columnPx : image.box.fraction * columnPx)
      const size = imageSize(own[next++] ?? { width: 1, height: 1 }, image, boxPx ?? columnPx, columnPx, rowsPx)
      return { ...size, slot: Math.max(boxPx ?? 0, size.width) }
    })
    const width = items.reduce((sum, item) => sum + item.slot, 0) + gap * (items.length - 1)
    return { items, width, height: Math.max(...items.map(item => item.height)) }
  })
  const width = Math.max(...rows.map(row => row.width))
  const height = rows.reduce((sum, row) => sum + row.height, 0) + gap * (rows.length - 1)
  const k = Math.min(1, columnPx / width, rowsPx / height)
  const images: BlockFit['images'] = []
  let y = 0
  for (const row of rows) {
    let x = (width - row.width) / 2
    for (const item of row.items) {
      const left = x + (item.slot - item.width) / 2
      const top = y + (row.height - item.height) / 2
      images.push({ x: Math.round(left * k), y: Math.round(top * k), widthPx: Math.max(1, Math.round(item.width * k)), heightPx: Math.max(1, Math.round(item.height * k)) })
      x += item.slot + gap
    }
    y += row.height + gap
  }
  const widthPx = Math.max(1, Math.round(width * k))
  const heightPx = Math.max(1, Math.round(height * k))
  return { ...cellsFor(widthPx, heightPx, box), widthPx, heightPx, images }
}

/** The whole cells one image of a block covers, counted from its picture's top-left cell. */
export interface ImageCells {
  column: number
  row: number
  columns: number
  rows: number
}

/**
 * The cells each image of a block covers where its picture is `fit.columns`
 * wide and `rows` tall (fit.rows, or more for a taller placeholder), the
 * images' area centred in them as renderImageBlock centres it. Each edge is
 * rounded to the nearest cell line, so neighbours IMAGE_GAP apart share no
 * cell, and every image keeps at least one cell each way.
 */
export function blockCells(fit: BlockFit, box: Pick<ImageBox, 'cellWidth' | 'cellHeight'>, rows: number = fit.rows): ImageCells[] {
  const left = (fit.columns * box.cellWidth - fit.widthPx) / 2
  const top = (rows * box.cellHeight - fit.heightPx) / 2
  const span = (from: number, size: number, cell: number, count: number) => {
    const start = Math.min(count - 1, Math.max(0, Math.round(from / cell)))
    const end = Math.min(count, Math.max(start + 1, Math.round((from + size) / cell)))
    return [start, end - start] as const
  }
  return fit.images.map(place => {
    const [column, columns] = span(left + place.x, place.widthPx, box.cellWidth, fit.columns)
    const [row, height] = span(top + place.y, place.heightPx, box.cellHeight, rows)
    return { column, row, columns, rows: height }
  })
}
