import { encodePng, measure, rasterize } from './raster/index.js'
import { createLineScanner, scan } from './scan/index.js'
import { initTypeset, TexError, texToMathML, typeset } from './typeset/index.js'
import type { CellBox, RasterOptions, RGB, TypesetResult } from './types.js'
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
export { createLineScanner, encodePng, initTypeset, measure, rasterize, scan, TexError, texToMathML, toUnicode, typeset }

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

/** A display formula ready for an Image element. */
export interface RenderedImage extends CellBox {
  /** A PNG of exactly columns × cellWidth by rows × cellHeight pixels. */
  png: Uint8Array
}

/** Formulas longer than this are refused before MathJax sees them. */
export const MAX_TEX_LENGTH = 4096

let ready: Promise<void> | undefined

/** Prepares the typesetter. Await it once before measuring, rendering or previewing. */
export function init(): Promise<void> {
  return (ready ??= initTypeset())
}

const typesetCache = new Map<string, TypesetResult>()
const imageCache = new Map<string, RenderedImage>()
const CACHE_LIMIT = 256

/** The cells a display formula's image will take. Throws TexError. */
export function measureDisplay(tex: string, env: RenderEnv): CellBox {
  return measure(typesetDisplay(tex, env), rasterOptions(env))
}

/** Typesets and draws a display formula, at least `minRows` tall. Throws TexError. */
export function renderDisplay(tex: string, env: RenderEnv, minRows?: number): RenderedImage {
  const key = [env.cellWidth, env.cellHeight, env.maxColumns, env.emPx, env.ink.r, env.ink.g, env.ink.b, minRows ?? 0, tex].join('\n')
  const cached = remember(imageCache, key)
  if (cached) return cached
  const raster = rasterize(typesetDisplay(tex, env), rasterOptions(env, minRows))
  const image: RenderedImage = { columns: raster.columns, rows: raster.rows, scale: raster.scale, png: encodePng(raster, env.ink) }
  return store(imageCache, key, image)
}

/**
 * A display formula as Unicode lines, padded with blank lines to `rows` (the rows
 * its image takes) so a streaming preview reserves exactly the image's room.
 * Null when Unicode can't express it, or it is wider than maxColumns or taller than `rows`.
 */
export function previewDisplay(tex: string, env: Pick<RenderEnv, 'maxColumns'>, rows?: number): string[] | null {
  const result = unicodeFor(tex, true, env.maxColumns)
  if (!result) return null
  if (rows === undefined || result.lines.length === rows) return result.lines
  if (result.lines.length > rows) return null
  const blank = ' '.repeat(result.width)
  const above = Math.floor((rows - result.lines.length) / 2)
  return [...Array<string>(above).fill(blank), ...result.lines, ...Array<string>(rows - result.lines.length - above).fill(blank)]
}

/** An inline formula as one line of Unicode, or null when it can't be written on one line. */
export function previewInline(tex: string, maxWidth?: number): string | null {
  const result = unicodeFor(tex, false, maxWidth)
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

function unicodeFor(tex: string, display: boolean, maxWidth?: number) {
  if (tex.length > MAX_TEX_LENGTH) return null
  try {
    return toUnicode(texToMathML(tex, { display }), { display, maxWidth })
  } catch {
    return null
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
