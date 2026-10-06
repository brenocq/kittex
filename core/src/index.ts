import { layoutProse, proseBlocks, textWidth, visibleProse, wrapLine, wrapRows } from './layout/index.js'
import { encodePng, measure, rasterize, recolorPng } from './raster/index.js'
import { createLineScanner, scan } from './scan/index.js'
import { initTypeset, TexError, texToMathML, typeset } from './typeset/index.js'
import type { CellBox, RasterOptions, RGB, TypesetResult, UnicodeResult } from './types.js'
import { toUnicode } from './unicode/index.js'

export type * from './types.js'
export {
  cellProbe,
  cellProbes,
  chooseInk,
  claudeCustomThemePath,
  claudeThemeInk,
  claudeThemeScheme,
  colorProbes,
  detectTerminal,
  emPxForCell,
  readTerminalColors,
  toHex,
} from './terminal/index.js'
export type { ColorProbeOptions, ConfigReadOptions, FileReader, InkSources } from './terminal/index.js'
export { createLineScanner, encodePng, initTypeset, measure, rasterize, recolorPng, scan, TexError, texToMathML, toUnicode, typeset }
export { layoutProse, proseBlocks, textWidth, visibleProse, wrapLine, wrapRows }
export type { ProseBlock, ProseLayout, SourceSpan, SpanPlace, VisibleText, WrappedLine } from './layout/index.js'

/** Where a display formula is drawn. */
export interface RenderEnv {
  /** One terminal cell, in pixels. */
  cellWidth: number
  cellHeight: number
  /** Cells available across (the reply column), 1 to 255. */
  maxColumns: number
  /** Pixels per em of the math font (see emPxForCell). */
  emPx: number
  /** The colour to draw in. */
  ink: RGB
}

/** Where an inline formula is drawn: one text row. */
export interface InlineEnv extends RenderEnv {
  /** The terminal font's baseline: pixels from the top of a cell (the math baseline goes there). */
  baselinePx: number
}

/**
 * The least an inline formula is scaled (against the display size) to fit one
 * text row; one that would need more (a stacked fraction, a sum with limits, a
 * deep parenthesis in a short cell) is left to its Unicode form.
 */
export const MIN_INLINE_SCALE = 0.85

/** A display formula ready for an Image element. */
export interface RenderedImage extends CellBox {
  /** A PNG of exactly columns × cellWidth by rows × cellHeight pixels. */
  png: Uint8Array
}

/** Formulas longer than this are refused before MathJax sees them. */
export const MAX_TEX_LENGTH = 4096

/** Images with more pixels than this are refused before they are drawn (255 × 255 large cells would be ~200 M). */
export const MAX_PIXELS = 16_000_000

let ready: Promise<void> | undefined

/** Prepares the typesetter. Await it once before measuring, rendering or previewing. */
export function init(): Promise<void> {
  return (ready ??= initTypeset())
}

const typesetCache = new Map<string, TypesetResult>()
const imageCache = new Map<string, RenderedImage>()
const CACHE_LIMIT = 256

/**
 * The cells to reserve for a display formula, shared by its streaming preview and
 * its image (draw it with `renderDisplay(tex, env, rows)`). That is the image's
 * own size, unless no Unicode preview fits in it: then the shortest preview's
 * height is reserved and the image is padded to it. Throws TexError.
 */
export function measureDisplay(tex: string, env: RenderEnv): CellBox {
  const result = typesetDisplay(tex, env)
  const box = measure(result, rasterOptions(env))
  const forms = previewForms(tex, env.maxColumns)
  if (forms.length === 0 || forms.some(form => form.lines.length <= box.rows)) return box
  return measure(result, rasterOptions(env, Math.min(255, ...forms.map(form => form.lines.length))))
}

/** Typesets and draws a display formula, at least `minRows` tall. Throws TexError. */
export function renderDisplay(tex: string, env: RenderEnv, minRows?: number): RenderedImage {
  // Cached without its colour: a palette PNG changes colour by rewriting its palette alone.
  const key = [env.cellWidth, env.cellHeight, env.maxColumns, env.emPx, minRows ?? 0, tex].join('\n')
  let image = remember(imageCache, key)
  if (!image) {
    const result = typesetDisplay(tex, env)
    const options = rasterOptions(env, minRows)
    const box = measure(result, options)
    if (box.columns * env.cellWidth * box.rows * env.cellHeight > MAX_PIXELS) throw new TexError('formula too large to draw')
    const raster = rasterize(result, options)
    image = store(imageCache, key, { columns: raster.columns, rows: raster.rows, scale: raster.scale, png: encodePng(raster, env.ink) })
  }
  return { ...image, png: recolorPng(image.png, env.ink) }
}

/**
 * A display formula as Unicode lines, padded with blank lines to `rows` (from
 * measureDisplay) so a streaming preview reserves exactly the image's room: the
 * first of the stacked, compact (a line per table row) and one-line forms that
 * fits. Null when Unicode can't express it in that room or within maxColumns.
 */
export function previewDisplay(tex: string, env: Pick<RenderEnv, 'maxColumns'>, rows?: number): string[] | null {
  const result = previewForms(tex, env.maxColumns).find(form => rows === undefined || form.lines.length <= rows)
  if (!result) return null
  if (rows === undefined || result.lines.length === rows) return result.lines
  const blank = ' '.repeat(result.width)
  const above = Math.floor((rows - result.lines.length) / 2)
  return [...Array<string>(above).fill(blank), ...result.lines, ...Array<string>(rows - result.lines.length - above).fill(blank)]
}

/**
 * The cells an inline formula's image takes: one row, the formula on the
 * terminal font's baseline, scaled down to fit the row when it must (`scale`).
 * Null when it would need less than MIN_INLINE_SCALE, or MathJax refuses it:
 * the formula then stays Unicode.
 */
export function measureInline(tex: string, env: InlineEnv): CellBox | null {
  let result: TypesetResult
  try {
    result = typesetInline(tex)
  } catch (error) {
    if (error instanceof TexError) return null
    throw error
  }
  const box = measure(result, inlineOptions(env, 255, 'left'))
  return box.scale >= MIN_INLINE_SCALE ? box : null
}

/**
 * Draws an inline formula `columns` wide (at least what measureInline gave)
 * and one row tall, centred across, its baseline on the font's. Throws
 * TexError.
 */
export function renderInline(tex: string, env: InlineEnv, columns: number): RenderedImage {
  const key = ['inline', env.cellWidth, env.cellHeight, env.emPx, env.baselinePx, columns, tex].join('\n')
  let image = remember(imageCache, key)
  if (!image) {
    const result = typesetInline(tex)
    const options = inlineOptions(env, columns, 'center')
    const raster = rasterize(result, options)
    image = store(imageCache, key, { columns: raster.columns, rows: raster.rows, scale: raster.scale, png: encodePng(raster, env.ink) })
  }
  return { ...image, png: recolorPng(image.png, env.ink) }
}

/** An inline formula as one line of Unicode, or null when it can't be written on one line. */
export function previewInline(tex: string, maxWidth?: number): string | null {
  const result = unicodeFor(tex, 'inline', maxWidth)
  return result && result.lines.length === 1 ? result.lines[0]! : null
}

/** Standard padded base64, for an Image's `{ png }` source. */
export function toBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += alphabet[(n >> 18) & 63]! + alphabet[(n >> 12) & 63]!
    out += i + 1 < bytes.length ? alphabet[(n >> 6) & 63]! : '='
    out += i + 2 < bytes.length ? alphabet[n & 63]! : '='
  }
  return out
}

function typesetDisplay(tex: string, env: RenderEnv): TypesetResult {
  if (tex.length > MAX_TEX_LENGTH) throw new TexError(`formula longer than ${MAX_TEX_LENGTH} characters`)
  const lineWidth = (Math.min(255, env.maxColumns) * env.cellWidth) / env.emPx
  const key = `${lineWidth.toFixed(3)}\n${tex}`
  return remember(typesetCache, key) ?? store(typesetCache, key, typeset(tex, { display: true, lineWidth }))
}

/** A display formula's Unicode forms that exist, most faithful first: stacked, compact, one line. */
function previewForms(tex: string, maxWidth: number): UnicodeResult[] {
  return (['stacked', 'compact', 'inline'] as const).flatMap(form => unicodeFor(tex, form, maxWidth) ?? [])
}

const unicodeCache = new Map<string, UnicodeResult | null>()

function unicodeFor(tex: string, form: 'stacked' | 'compact' | 'inline', maxWidth?: number): UnicodeResult | null {
  if (tex.length > MAX_TEX_LENGTH) return null
  const key = `${form}${maxWidth ?? ''}\n${tex}`
  if (unicodeCache.has(key)) return remember(unicodeCache, key) ?? null
  const display = form !== 'inline'
  let result: UnicodeResult | null
  try {
    result = toUnicode(texToMathML(tex, { display }), { display, maxWidth, compact: form === 'compact' })
  } catch {
    result = null
  }
  return store(unicodeCache, key, result)
}

function typesetInline(tex: string): TypesetResult {
  if (tex.length > MAX_TEX_LENGTH) throw new TexError(`formula longer than ${MAX_TEX_LENGTH} characters`)
  const key = `inline\n${tex}`
  return remember(typesetCache, key) ?? store(typesetCache, key, typeset(tex, { display: false }))
}

function inlineOptions(env: InlineEnv, columns: number, align: 'left' | 'center'): RasterOptions {
  return {
    emPx: env.emPx,
    cellWidth: env.cellWidth,
    cellHeight: env.cellHeight,
    maxColumns: Math.max(1, Math.min(255, columns)),
    align,
    minRows: 1,
    baselinePx: env.baselinePx,
  }
}

function rasterOptions(env: RenderEnv, minRows?: number): RasterOptions {
  return {
    emPx: env.emPx,
    cellWidth: env.cellWidth,
    cellHeight: env.cellHeight,
    maxColumns: Math.max(1, Math.min(255, env.maxColumns)),
    align: 'center',
    minRows,
  }
}

function remember<V>(cache: Map<string, V>, key: string): V | undefined {
  const value = cache.get(key)
  if (value !== undefined) {
    cache.delete(key)
    cache.set(key, value)
  }
  return value
}

function store<V>(cache: Map<string, V>, key: string, value: V): V {
  cache.set(key, value)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!)
  return value
}
