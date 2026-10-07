import { blockParts, charsOf, engineHyperlinks, layoutHeading, layoutList, layoutProse, layoutQuote, layoutTable, proseBlocks, textWidth, visibleProse, wrapLine, wrapRows } from './layout/index.js'
import { adaptColor, assumedBackground, texPicture } from './diagram/index.js'
import { encodePicturePng, encodePng, INK_EDGE, inkAlpha, measure, measurePicture as pictureCells, pictureOutlines, rasterize, rasterizePicture, recolorPng, strokeWeight } from './raster/index.js'
import { createLineScanner, scan } from './scan/index.js'
import { GlyphError, initTypeset, TexError, texToMathML, typeset, typesetLoaded } from './typeset/index.js'
import type { CellBox, Picture, RasterOptions, RGB, TextCurve, TypesetResult, UnicodeResult } from './types.js'
import { toUnicode } from './unicode/index.js'

export type * from './types.js'
export {
  adaptColor,
  assumedBackground,
  bwrapProbe,
  confined,
  DIAGRAM_ENVS,
  diagramDocument,
  diagramFence,
  drawsPicture,
  dvisvgmArgv,
  isJobDir,
  JOB_NAME,
  jobDirTemplate,
  LATEX_ARGV,
  mathDocument,
  MAX_TEX_SOURCE,
  PREAMBLE_VERSION,
  SvgError,
  texEnvironment,
  texError,
  texPicture,
  unsafeTex,
  XmlError,
} from './diagram/index.js'
export type { Adapted, Confinement, DiagramLang, PaperColors, TexDocument } from './diagram/index.js'
export {
  cellProbe,
  cellProbes,
  chooseInk,
  claudeCustomThemePath,
  claudeThemeInk,
  claudeThemeScheme,
  colorProbes,
  detectTerminal,
  drawsEmojiSequences,
  emPxForCell,
  fontCell,
  fontFileArgv,
  GHOSTTY_BUILTIN_FONT,
  imageInkBackground,
  imageInkCurve,
  matchesFamily,
  mathEmPx,
  odArgv,
  parseFontFile,
  parseOd,
  readFontMetrics,
  readTerminalColors,
  textBaseline,
  textLayout,
  toHex,
} from './terminal/index.js'
export type { ByteReader, ColorProbeOptions, ConfigReadOptions, FileReader, FontFile, FontMetrics, InkSources, TextLayout } from './terminal/index.js'
export { createLineScanner, encodePng, GlyphError, initTypeset, inkAlpha, measure, rasterize, recolorPng, scan, strokeWeight, TexError, texToMathML, toUnicode, typeset, typesetLoaded }
export { blockParts, charsOf, engineHyperlinks, layoutHeading, layoutList, layoutProse, layoutQuote, layoutTable, proseBlocks, textWidth, visibleProse, wrapLine, wrapRows }
export type { BlockPart, Char, LinkMode, ProseBlock, ProseLayout, SourceSpan, SpanPlace, VisibleText, WrappedLine } from './layout/index.js'

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
  /**
   * The background to correct the ink's alpha against, as the terminal
   * corrects its text's (imageInkBackground): absent where images and text
   * blend alike.
   */
  inkOver?: RGB
  /**
   * With `inkOver`: kitty's text curve (its text_composition_strategy) to
   * correct the ink's alpha with, instead of the gamma-blend correction.
   */
  inkCurve?: TextCurve
  /**
   * The stroke weight to draw with (RasterOptions.weight), to match the
   * terminal font's (strokeWeight); absent for the default.
   */
  weight?: number
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

/**
 * How far, as a fraction of the cell height (at least a pixel), an inline
 * formula drawn at MIN_INLINE_SCALE may run past its row: 2 px at 26 px cells,
 * 1 px at 18. A bar in a subscript (P_{k|k-1}, \hat{x}_{0|0}) reaches 0.35 em
 * below the baseline and would otherwise need about 0.8 and stay Unicode.
 */
export const INLINE_OVERFLOW = 0.06

/** Where an inline formula's ink goes in a slot wider than it (RasterOptions.inkPlace). */
export type InkPlace = NonNullable<RasterOptions['inkPlace']>

/** A display formula ready for an Image element. */
export interface RenderedImage extends CellBox {
  /** A PNG of exactly columns × cellWidth by rows × cellHeight pixels. */
  png: Uint8Array
}

/**
 * Which build of kittex this is: the build (scripts/build.mjs) writes a hash
 * of the bundle and the mod's hooks in its place, so a cache of drawings from
 * another build is never read. `dev` from source.
 */
export const BUILD_ID: string = 'kittex-build:dev'

/** Formulas longer than this are refused before MathJax sees them. */
export const MAX_TEX_LENGTH = 4096

/** Images with more pixels than this are refused before they are drawn (255 × 255 large cells would be ~200 M). */
export const MAX_PIXELS = 16_000_000

/**
 * The longest side, in pixels, of a PNG Claude Code's Image takes; a larger
 * one fails the whole drawing it is in (the engine then draws its own). An
 * image never spans more columns than fit in it (large cells: narrower than
 * the reply column), and a formula taller than it is refused.
 */
export const MAX_IMAGE_SIDE = 4096

/**
 * The most bytes of PNG Claude Code takes, for one Image and for all the
 * Images of one drawing together (one ui.render answer; past either, it draws
 * its own instead). A formula whose PNG alone passes it is refused.
 */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024

/** The columns an image `maxColumns` wide may take: at most 255, and no wider than MAX_IMAGE_SIDE pixels. */
export function imageColumns(env: Pick<RenderEnv, 'cellWidth' | 'maxColumns'>): number {
  return Math.max(1, Math.min(255, Math.floor(env.maxColumns), Math.floor(MAX_IMAGE_SIDE / env.cellWidth)))
}

let ready: Promise<void> | undefined

/**
 * Prepares the typesetter (loads MathJax and the font data) ahead of the first
 * formula. Optional: measuring, rendering or previewing does it when needed.
 */
export function init(): Promise<void> {
  return (ready ??= initTypeset())
}

const typesetCache = new Map<string, TypesetResult>()
const imageCache = new Map<string, RenderedImage>()
const CACHE_LIMIT = 256

/**
 * Display formulas that would have to shrink below this to fit the column are
 * refused (TexError): smaller than half size, TeX is no longer readable.
 */
export const MIN_DISPLAY_SCALE = 0.5

/**
 * The columns a display preview's text may take: two fewer than the image's,
 * so a pad leads every line and none reaches the edge (the plugin writes
 * previews this way).
 */
export function previewWidth(maxColumns: number): number {
  return Math.max(1, Math.min(255, maxColumns) - 2)
}

/**
 * The cells to reserve for a display formula, shared by its streaming preview and
 * its image (draw it with `renderDisplay(tex, env, rows)`). That is the image's
 * own size, unless no Unicode preview (previewWidth wide) fits in it: then the
 * shortest preview's height is reserved and the image is padded to it.
 *
 * A formula holding characters the font can't draw (GlyphError) has no image,
 * but when it has a preview, the preview's own rows are reserved: renderDisplay
 * then throws and the preview stays. Throws TexError, also for a formula that
 * would be drawn below MIN_DISPLAY_SCALE.
 */
export function measureDisplay(tex: string, env: RenderEnv): CellBox {
  let result: TypesetResult
  try {
    result = typesetDisplay(tex, env)
  } catch (error) {
    const form = error instanceof GlyphError ? previewForms(tex, previewWidth(env.maxColumns))[0] : undefined
    if (form) return { columns: Math.max(1, Math.min(255, env.maxColumns)), rows: Math.min(255, form.lines.length), scale: 1 }
    throw error
  }
  const box = measure(result, rasterOptions(env))
  if (box.scale < MIN_DISPLAY_SCALE) throw new TexError(tooSmall(box.scale))
  const forms = previewForms(tex, previewWidth(env.maxColumns))
  const reserved = forms.length === 0 || forms.some(form => form.lines.length <= box.rows) ? box : measure(result, rasterOptions(env, Math.min(255, ...forms.map(form => form.lines.length))))
  if (reserved.rows * env.cellHeight > MAX_IMAGE_SIDE) throw new TexError(TOO_LARGE)
  return reserved
}

const TOO_LARGE = 'formula too large to draw'

function tooSmall(scale: number): string {
  return `formula too wide to draw legibly (it would be drawn at ${Math.round(scale * 100)}% size)`
}

/** Typesets and draws a display formula, at least `minRows` tall. Throws TexError. */
export function renderDisplay(tex: string, env: RenderEnv, minRows?: number): RenderedImage {
  // Cached without its colour: a palette PNG changes colour by rewriting its palette alone.
  const key = [env.cellWidth, env.cellHeight, env.maxColumns, env.emPx, env.weight ?? '', minRows ?? 0, tex].join('\n')
  let image = remember(imageCache, key)
  if (!image) {
    const result = typesetDisplay(tex, env)
    const options = rasterOptions(env, minRows)
    const box = measure(result, options)
    if (box.scale < MIN_DISPLAY_SCALE) throw new TexError(tooSmall(box.scale))
    if (box.columns * env.cellWidth * box.rows * env.cellHeight > MAX_PIXELS || box.rows * env.cellHeight > MAX_IMAGE_SIDE) throw new TexError(TOO_LARGE)
    const raster = rasterize(result, options)
    const png = encodePng(raster, env.ink, env.inkOver, env.inkCurve)
    if (png.length > MAX_IMAGE_BYTES) throw new TexError(TOO_LARGE)
    image = store(imageCache, key, { columns: raster.columns, rows: raster.rows, scale: raster.scale, png })
  }
  return { ...image, png: recolorPng(image.png, env.ink, env.inkOver, env.inkCurve) }
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
 * terminal font's baseline, scaled down to fit the row when it must (`scale`),
 * and to fit `columns` when given (a slot narrower than the formula). Null
 * when it would need less than MIN_INLINE_SCALE, or MathJax refuses it: the
 * formula then stays Unicode.
 */
export function measureInline(tex: string, env: InlineEnv, columns = 255): CellBox | null {
  let result: TypesetResult
  try {
    result = typesetInline(tex)
  } catch (error) {
    if (error instanceof TexError) return null
    throw error
  }
  return measureInlineResult(result, env, columns)
}

/** measureInline for a formula typeset some other way (TeX's, see texFormula). */
export function measureInlineResult(result: TypesetResult, env: InlineEnv, columns = 255): CellBox | null {
  const options = inlineOptions(env, columns, 'left')
  const box = measure(result, options)
  if (box.scale < MIN_INLINE_SCALE) return null
  // Drawn at the floor only because its ink may pass the row: allowed when what
  // the row cuts is the tip of a thin stroke (a bar, a parenthesis), never part of a letter.
  const strict = measure(result, { ...options, overflowPx: 0 })
  if (strict.scale < MIN_INLINE_SCALE && !clipsOnlyThinInk(result, options)) return null
  return box
}

/** The widest run of ink, in pixels, a row may have where an inline image cuts it. */
const CLIPPED_RUN_PX = 2.5

/**
 * Whether the rows an inline image cuts off hold only thin strokes: draws the
 * formula as placed, then again at the same size and baseline in a row
 * `overflowPx` taller at each end (and INK_EDGE more at the top), and checks
 * that no row outside the image has a run of ink wider than CLIPPED_RUN_PX.
 */
function clipsOnlyThinInk(result: TypesetResult, options: RasterOptions): boolean {
  const slack = Math.max(0, Math.ceil(options.overflowPx ?? 0))
  // A pixel more above, for the room the raster keeps clear of the top (INK_EDGE).
  const top = slack + Math.ceil(INK_EDGE)
  const placed = rasterize(result, options)
  const tall = rasterize(result, {
    ...options,
    emPx: options.emPx * placed.scale,
    cellHeight: options.cellHeight + top + slack,
    baselinePx: placed.baselinePx + top,
    minColumns: placed.columns,
    minScale: 0,
    overflowPx: 0,
  })
  if (Math.abs(tall.scale - 1) > 1e-6) return false
  const { alpha, widthPx, heightPx } = tall
  for (let y = 0; y < heightPx; y++) {
    if (y >= top && y < heightPx - slack) continue
    let run = 0
    for (let x = 0; x < widthPx; x++) {
      run = alpha[y * widthPx + x]! >= 64 ? run + 1 : 0
      if (run > CLIPPED_RUN_PX) return false
    }
  }
  return true
}

/**
 * Draws an inline formula `columns` wide (its slot: measureInline's columns,
 * or its preview's when that is wider), on the terminal font's baseline. The
 * blank its whole cells leave over the ink goes where `place` says: split
 * between both sides (`center`, the default) instead of all falling after it,
 * where it would read as a space before the next character (`(y_w)`), or all
 * on one side (`end`: the ink against the slot's right edge, the blank before
 * it; `start`: after it), to join a space the slot already has there.
 */
export function renderInline(tex: string, env: InlineEnv, columns: number, place: InkPlace = 'center'): RenderedImage {
  const key = ['inline', env.cellWidth, env.cellHeight, env.emPx, env.weight ?? '', env.baselinePx, columns, place, tex].join('\n')
  let image = remember(imageCache, key)
  if (!image) {
    const drawn = drawInline(typesetInline(tex), env, columns, place)
    if (drawn.png.length > MAX_IMAGE_BYTES) throw new TexError(TOO_LARGE)
    image = store(imageCache, key, drawn)
  }
  return { ...image, png: recolorPng(image.png, env.ink, env.inkOver, env.inkCurve) }
}

/** renderInline for a formula typeset some other way (TeX's, see texFormula); not cached. */
export function renderInlineResult(result: TypesetResult, env: InlineEnv, columns: number, place: InkPlace = 'center'): RenderedImage {
  return drawInline(result, env, columns, place)
}

function drawInline(result: TypesetResult, env: InlineEnv, columns: number, place: InkPlace): RenderedImage {
  const options = { ...inlineOptions(env, columns, 'left'), minColumns: columns, inkPlace: place }
  const raster = rasterize(result, options)
  return { columns: raster.columns, rows: raster.rows, scale: raster.scale, png: encodePng(raster, env.ink, env.inkOver, env.inkCurve) }
}

export interface InlinePreviewOptions {
  /**
   * Drop optional spaces (`O(nlogn)`, `E=mc²`), so a preview standing in for
   * an inline image is no wider than the image. Default true; false keeps
   * TeX's spacing, for math that stays text.
   */
  tight?: boolean
}

/** An inline formula as one line of Unicode, or null when it can't be written on one line. */
export function previewInline(tex: string, maxWidth?: number, options: InlinePreviewOptions = {}): string | null {
  const result = unicodeFor(tex, options.tight === false ? 'inline' : 'tight', maxWidth)
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
  // A cell clear of each edge: a tag (\tag, a numbered row) sits at the line's right end.
  const lineWidth = (previewWidth(imageColumns(env)) * env.cellWidth) / env.emPx
  const key = `${lineWidth.toFixed(3)}\n${tex}`
  return remember(typesetCache, key) ?? store(typesetCache, key, typeset(tex, { display: true, lineWidth }))
}

/**
 * A display formula's Unicode forms that exist, most faithful first: stacked,
 * compact, one line; each broken into lines (as MathJax breaks the image)
 * when it is wider than maxWidth.
 */
function previewForms(tex: string, maxWidth: number): UnicodeResult[] {
  return (['stacked', 'compact', 'lines'] as const).flatMap(form => unicodeFor(tex, form, maxWidth) ?? [])
}

const unicodeCache = new Map<string, UnicodeResult | null>()

type UnicodeForm = 'stacked' | 'compact' | 'lines' | 'inline' | 'tight'

function unicodeFor(tex: string, form: UnicodeForm, maxWidth?: number): UnicodeResult | null {
  if (tex.length > MAX_TEX_LENGTH) return null
  const key = `${form}${maxWidth ?? ''}\n${tex}`
  if (unicodeCache.has(key)) return remember(unicodeCache, key) ?? null
  const display = form === 'stacked' || form === 'compact'
  const breakLines = form !== 'inline' && form !== 'tight'
  let result: UnicodeResult | null
  try {
    result = toUnicode(texToMathML(tex, { display }), { display, maxWidth, compact: form === 'compact', breakLines, tight: form === 'tight' })
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
    maxColumns: imageColumns({ cellWidth: env.cellWidth, maxColumns: columns }),
    align,
    minRows: 1,
    baselinePx: env.baselinePx,
    // Fitted to its ink, which renderInline places in its slot.
    centerInk: align === 'left',
    minScale: MIN_INLINE_SCALE,
    overflowPx: Math.max(1, Math.round(env.cellHeight * INLINE_OVERFLOW)),
    ...(env.weight !== undefined ? { weight: env.weight } : {}),
  }
}

function rasterOptions(env: RenderEnv, minRows?: number): RasterOptions {
  return {
    emPx: env.emPx,
    cellWidth: env.cellWidth,
    cellHeight: env.cellHeight,
    maxColumns: imageColumns(env),
    align: 'center',
    minRows,
    ...(env.weight !== undefined ? { weight: env.weight } : {}),
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

// ─── TeX's own drawings (diagram/) ───────────────────────────────────────────

/** Where a TeX picture is drawn: as display math is, with the terminal's background when known. */
export interface PictureEnv extends RenderEnv {
  /** The terminal's background, which TeX's white becomes and its colours are kept legible on (assumed from the ink when absent). */
  background?: RGB
  /** Rows a picture may take before it is shrunk (MAX_PICTURE_ROWS by default). */
  maxRows?: number
}

/** Rows a picture may take: a taller one is shrunk to them. */
export const MAX_PICTURE_ROWS = 30

/** Pictures that would have to shrink below this to fit are refused (TexError): their text would be unreadable. */
export const MIN_PICTURE_SCALE = 0.3

/** The largest PNG an Image takes (2 MiB). */
export const MAX_PNG_BYTES = 2 * 1024 * 1024

function pictureOptions(env: PictureEnv, minRows?: number) {
  const paper = { ink: env.ink, background: env.background ?? assumedBackground(env.ink) }
  return {
    emPx: env.emPx,
    cellWidth: env.cellWidth,
    cellHeight: env.cellHeight,
    maxColumns: Math.max(1, Math.min(255, env.maxColumns)),
    maxRows: Math.max(1, Math.min(255, env.maxRows ?? MAX_PICTURE_ROWS)),
    ...(minRows !== undefined ? { minRows } : {}),
    ...(env.weight !== undefined ? { weight: env.weight } : {}),
    ...(env.inkOver ? { over: env.inkOver } : {}),
    color: (color: RGB, line: boolean) => adaptColor(color, paper, line),
  }
}

/**
 * The cells a TeX picture takes (its streaming placeholder's and its
 * image's): the width of the column at most, MAX_PICTURE_ROWS tall at most,
 * shrunk to fit and never grown past its own size (its em is the math's).
 * Throws TexError when it would be drawn below MIN_PICTURE_SCALE.
 */
export function measurePicture(picture: Picture, env: PictureEnv): CellBox {
  const box = pictureCells(picture, pictureOptions(env))
  if (box.scale < MIN_PICTURE_SCALE) throw new TexError(`picture too large to draw legibly (it would be drawn at ${Math.round(box.scale * 100)}% size)`)
  return box
}

/** Draws a TeX picture in its colours (adaptColor), at least `minRows` tall. Throws TexError. */
export function renderPicture(picture: Picture, env: PictureEnv, minRows?: number): RenderedImage {
  const options = pictureOptions(env, minRows)
  const box = pictureCells(picture, options)
  if (box.scale < MIN_PICTURE_SCALE) throw new TexError(`picture too large to draw legibly (it would be drawn at ${Math.round(box.scale * 100)}% size)`)
  if (box.columns * env.cellWidth * box.rows * env.cellHeight > MAX_PIXELS) throw new TexError('picture too large to draw')
  const raster = rasterizePicture(picture, options)
  const png = encodePicturePng(raster)
  if (png.length > MAX_PNG_BYTES) throw new TexError('picture too large to send to the terminal')
  return { columns: raster.columns, rows: raster.rows, scale: raster.scale, png }
}

/** A formula TeX drew (MathJax refused it) as one ink's draw ops, laid out, sized and coloured as MathJax's are. */
export function texFormula(picture: Picture): TypesetResult {
  return pictureOutlines(picture)
}

/** measureDisplay for a formula TeX drew (texFormula): its image's cells. Throws TexError below MIN_DISPLAY_SCALE. */
export function measureDisplayResult(result: TypesetResult, env: RenderEnv): CellBox {
  const box = measure(result, rasterOptions(env))
  if (box.scale < MIN_DISPLAY_SCALE) throw new TexError(tooSmall(box.scale))
  return box
}

/** renderDisplay for a formula TeX drew (texFormula), at least `minRows` tall. Throws TexError. */
export function renderDisplayResult(result: TypesetResult, env: RenderEnv, minRows?: number): RenderedImage {
  const options = rasterOptions(env, minRows)
  const box = measure(result, options)
  if (box.scale < MIN_DISPLAY_SCALE) throw new TexError(tooSmall(box.scale))
  if (box.columns * env.cellWidth * box.rows * env.cellHeight > MAX_PIXELS) throw new TexError('formula too large to draw')
  const raster = rasterize(result, options)
  return { columns: raster.columns, rows: raster.rows, scale: raster.scale, png: encodePng(raster, env.ink, env.inkOver, env.inkCurve) }
}
