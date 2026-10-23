import { blockParts, charsOf, engineHyperlinks, layoutHeading, layoutList, layoutProse, layoutQuote, layoutTable, proseBlocks, textWidth, visibleProse, wrapLine, wrapRows } from './layout/index.js'
import { adaptColor, assumedBackground, readSvg, texPicture } from './diagram/index.js'
import { fitImage, type ImageBox, type ImageSpec } from './image/block.js'
import { type Bitmap, decodeImage, encodeRgbaPng as encodeBitmapPng, ImageError, imageHeader, MAX_IMAGE_PIXELS, scaleBitmap } from './image/index.js'
import { encodePicturePng, encodePng, INK_EDGE, inkAlpha, measure, measurePicture as pictureCells, pictureOutlines, rasterize, rasterizePicture, recolorPng, strokeWeight } from './raster/index.js'
import { createLineScanner, scan } from './scan/index.js'
import { GlyphError, initTypeset, TexError, texToMathML, typeset, typesetLoaded } from './typeset/index.js'
import type { CellBox, Picture, RasterOptions, RGB, TextCurve, TypesetResult, UnicodeResult } from './types.js'
import { toUnicode } from './unicode/index.js'

export type * from './types.js'
export * from './image/index.js'
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
  FORMAT_SOURCE,
  formatArgv,
  formatName,
  inlineTables,
  isJobDir,
  latexArgv,
  JOB_NAME,
  jobDirTemplate,
  LATEX_ARGV,
  mathDocument,
  MAX_TEX_SOURCE,
  PDF_NAME,
  pdfArgv,
  pdfCopyArgv,
  PREAMBLE_VERSION,
  SvgError,
  TRIAL_PDF,
  texEnvironment,
  texError,
  texPicture,
  ulimitProbe,
  unsafeTex,
  XmlError,
} from './diagram/index.js'
export type { Adapted, Confinement, DiagramLang, PaperColors, TexDocument } from './diagram/index.js'
export {
  cellProbe,
  cellProbeRan,
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
  coreTextFontArgv,
  faceIndexOf,
  fontFileArgv,
  GHOSTTY_BUILTIN_FONT,
  imageInkBackground,
  imageInkCurve,
  matchesFamily,
  mathEmPx,
  odArgv,
  parseCoreTextFont,
  parseFontFile,
  parseOd,
  readFontMetrics,
  readTerminalColors,
  textBaseline,
  textLayout,
  toHex,
} from './terminal/index.js'
export type { ByteReader, ColorProbeOptions, ConfigReadOptions, FileReader, FontFile, FontMetrics, InkSources, TextLayout } from './terminal/index.js'
export { fitImage, imageBlock, LINE_WIDTH_PT, parseLength, resolveImagePath, TEXT_HEIGHT_PT } from './image/block.js'
export type { ImageBox, ImageFit, ImageLength, ImageSpec } from './image/block.js'
export { ImageError, imageHeader, MAX_IMAGE_PIXELS } from './image/index.js'
export type { Bitmap, ImageFormat } from './image/index.js'
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
    const width = previewWidth(env.maxColumns)
    const form = error instanceof GlyphError ? (previewForms(tex, width)[0] ?? tableForms(tex, width)[0]) : undefined
    if (form) return { columns: Math.max(1, Math.min(255, env.maxColumns)), rows: Math.min(255, form.lines.length), scale: 1 }
    throw error
  }
  const box = measure(result, rasterOptions(env))
  if (box.scale < MIN_DISPLAY_SCALE) throw new TexError(tooSmall(box.scale))
  const forms = previewForms(tex, previewWidth(env.maxColumns))
  const fits = (form: UnicodeResult) => form.lines.length <= box.rows
  const reserved =
    forms.length === 0 || forms.some(fits) || tableForms(tex, previewWidth(env.maxColumns)).some(fits) ? box : measure(result, rasterOptions(env, Math.min(255, ...forms.map(form => form.lines.length))))
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
  const fits = (form: UnicodeResult) => rows === undefined || form.lines.length <= rows
  const result = previewForms(tex, env.maxColumns).find(fits) ?? tableForms(tex, env.maxColumns).find(fits)
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
  const png = encodePng(raster, env.ink, env.inkOver, env.inkCurve)
  if (png.length > MAX_IMAGE_BYTES) throw new TexError(TOO_LARGE)
  return { columns: raster.columns, rows: raster.rows, scale: raster.scale, png }
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

/**
 * The stacked and compact forms of a table (aligned, cases) too wide for a
 * line per row, its rows broken inside their cells (UnicodeOptions.breakTables):
 * tried after previewForms, and never a reason to pad an image (measureDisplay).
 */
function tableForms(tex: string, maxWidth: number): UnicodeResult[] {
  return (['stackedRows', 'compactRows'] as const).flatMap(form => unicodeFor(tex, form, maxWidth) ?? [])
}

const unicodeCache = new Map<string, UnicodeResult | null>()

type UnicodeForm = 'stacked' | 'compact' | 'lines' | 'stackedRows' | 'compactRows' | 'inline' | 'tight'

function unicodeFor(tex: string, form: UnicodeForm, maxWidth?: number): UnicodeResult | null {
  if (tex.length > MAX_TEX_LENGTH) return null
  const key = `${form}${maxWidth ?? ''}\n${tex}`
  if (unicodeCache.has(key)) return remember(unicodeCache, key) ?? null
  const breakTables = form === 'stackedRows' || form === 'compactRows'
  const display = form === 'stacked' || form === 'compact' || breakTables
  const breakLines = form !== 'inline' && form !== 'tight'
  let result: UnicodeResult | null
  try {
    const compact = form === 'compact' || form === 'compactRows'
    result = toUnicode(texToMathML(tex, { display }), { display, maxWidth, compact, breakLines, breakTables, tight: form === 'tight' })
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

function pictureOptions(env: PictureEnv, minRows?: number) {
  const paper = { ink: env.ink, background: env.background ?? assumedBackground(env.ink) }
  return {
    emPx: env.emPx,
    cellWidth: env.cellWidth,
    cellHeight: env.cellHeight,
    // Never a side past MAX_IMAGE_SIDE pixels: at large cells, fewer columns and rows.
    maxColumns: imageColumns(env),
    maxRows: Math.max(1, Math.min(255, env.maxRows ?? MAX_PICTURE_ROWS, Math.floor(MAX_IMAGE_SIDE / env.cellHeight))),
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

/**
 * Draws a TeX picture in its colours (adaptColor), at least `minRows` tall,
 * as many whole cells wide as it needs (centre it in its column). `density`
 * below 1 draws it with that fraction of the cells' pixels each way (the
 * terminal scales the image to its cells): the same cells for a quarter of
 * the bytes at a half, to fit what one drawing may send. Throws TexError.
 */
export function renderPicture(picture: Picture, env: PictureEnv, minRows?: number, density = 1): RenderedImage {
  const box = pictureCells(picture, pictureOptions(env, minRows))
  const d = Math.min(1, Math.max(0.1, density))
  // Fewer pixels, the same cells: as many columns and rows as at full density.
  const options = d === 1 ? pictureOptions(env, minRows) : { ...pictureOptions({ ...env, cellWidth: env.cellWidth * d, cellHeight: env.cellHeight * d, emPx: env.emPx * d }, box.rows), minColumns: box.columns }
  if (box.scale < MIN_PICTURE_SCALE) throw new TexError(`picture too large to draw legibly (it would be drawn at ${Math.round(box.scale * 100)}% size)`)
  if (box.columns * env.cellWidth * box.rows * env.cellHeight > MAX_PIXELS) throw new TexError('picture too large to draw')
  const raster = rasterizePicture(picture, options)
  const png = encodePicturePng(raster)
  if (png.length > MAX_IMAGE_BYTES) throw new TexError('picture too large to send to the terminal')
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

// ─── Image files (image/) ────────────────────────────────────────────────────

/** The most bytes of an image file read: what Claude Code's file read takes (it refuses a larger file). */
export const MAX_IMAGE_FILE_BYTES = 4 * 1024 * 1024

/** Pixels a decoded image keeps for drawing: a larger one is scaled down to it once (its own size still sizes it). More than the largest box it is drawn in. */
export const KEPT_IMAGE_PIXELS = 6_000_000

/** The PNG bytes one image file is drawn within: half of what one drawing may send, so a reply with a photo keeps room for its formulas. */
export const IMAGE_FILE_BYTES = MAX_IMAGE_BYTES / 2

/** The least density (fraction of its cells' pixels each way) an image file is drawn at to fit IMAGE_FILE_BYTES; below it, it is refused. */
export const MIN_IMAGE_DENSITY = 0.1

/** A vector image's own pixels per em of its picture (10 TeX points): two per big point, as on a 2× screen. */
export const VECTOR_PX_PER_EM = 2 * (72 / 72.27) * 10

/** Em per SVG user unit for an SVG file: a unit is a big point, an em 10 TeX points (as TeX's pictures). */
const SVG_EM_PER_UNIT = 72.27 / 72 / 10

/**
 * An image file ready to draw: its pixels (PNG, JPEG), kept at most
 * KEPT_IMAGE_PIXELS, or its picture (SVG, a PDF's first page), with its own
 * size in pixels (a vector's at VECTOR_PX_PER_EM), which sizes it.
 */
export type ImageSource =
  | { kind: 'bitmap'; width: number; height: number; bitmap: Bitmap }
  | { kind: 'picture'; width: number; height: number; picture: Picture }

/**
 * An image file's bytes as an ImageSource, by what they are (not by the
 * file's name); `pdf` for a PDF, which the host converts (pictureSource).
 * Throws ImageError (not an image, too large, undecodable), SvgError or
 * XmlError (an SVG kittex can't draw).
 */
export function readImageFile(bytes: Uint8Array): ImageSource | 'pdf' {
  if (bytes.length > MAX_IMAGE_FILE_BYTES) throw new ImageError(`file larger than ${MAX_IMAGE_FILE_BYTES / 1024 / 1024} MiB`)
  const header = imageHeader(bytes)
  if (!header) throw new ImageError('not a PNG, JPEG, SVG or PDF file')
  if (header.format === 'pdf') return 'pdf'
  if (header.format === 'svg') return pictureSource(readSvg(byteString(bytes), { baseline: 'bottom', emPerUnit: SVG_EM_PER_UNIT }))
  if (header.width !== undefined && header.height !== undefined && header.width * header.height > MAX_IMAGE_PIXELS) {
    throw new ImageError(`image too large to draw (${header.width} × ${header.height} pixels)`)
  }
  const bitmap = decodeImage(bytes, { maxPixels: MAX_IMAGE_PIXELS })
  const pixels = bitmap.width * bitmap.height
  const k = pixels > KEPT_IMAGE_PIXELS ? Math.sqrt(KEPT_IMAGE_PIXELS / pixels) : 1
  const kept = k < 1 ? scaleBitmap(bitmap, Math.max(1, Math.round(bitmap.width * k)), Math.max(1, Math.round(bitmap.height * k))) : bitmap
  return { kind: 'bitmap', width: bitmap.width, height: bitmap.height, bitmap: kept }
}

/**
 * Bytes as a string, one character per byte. Enough for readSvg: SVG's
 * markup is ASCII, and the text it would read beyond that (a <text>) it
 * refuses anyway.
 */
function byteString(bytes: Uint8Array): string {
  let out = ''
  for (let at = 0; at < bytes.length; at += 8192) out += String.fromCharCode(...bytes.subarray(at, at + 8192))
  return out
}

/** A picture (an SVG file's, a PDF page's) as an ImageSource. Throws ImageError for an empty one. */
export function pictureSource(picture: Picture): ImageSource {
  const width = picture.width * VECTOR_PX_PER_EM
  const height = (picture.height + picture.depth) * VECTOR_PX_PER_EM
  if (!(width > 0 && height > 0)) throw new ImageError('the picture is empty')
  return { kind: 'picture', width, height, picture }
}

/** The cells an image file may take where a TeX picture is drawn (pictureOptions' limits). */
function imageBox(env: PictureEnv): ImageBox {
  return {
    maxColumns: imageColumns(env),
    maxRows: Math.max(1, Math.min(255, env.maxRows ?? MAX_PICTURE_ROWS, Math.floor(MAX_IMAGE_SIDE / env.cellHeight))),
    cellWidth: env.cellWidth,
    cellHeight: env.cellHeight,
  }
}

/** Where a picture source is drawn at the size its block asks for: the math's env with the em that gives it fitImage's width. */
function pictureImageEnv(source: Extract<ImageSource, { kind: 'picture' }>, spec: Pick<ImageSpec, 'width' | 'height' | 'scale'>, env: PictureEnv): PictureEnv {
  const box = imageBox(env)
  const fit = fitImage(source, spec, box)
  return { ...env, emPx: fit.widthPx / source.picture.width, maxRows: box.maxRows }
}

/** The cells an image file takes (its streaming placeholder's and its image's): fitImage's, a picture's as renderPicture lays it out. Throws TexError. */
export function measureImage(source: ImageSource, spec: Pick<ImageSpec, 'width' | 'height' | 'scale'>, env: PictureEnv): CellBox {
  if (source.kind === 'picture') return measurePicture(source.picture, pictureImageEnv(source, spec, env))
  const fit = fitImage(source, spec, imageBox(env))
  return { columns: fit.columns, rows: fit.rows, scale: 1 }
}

/**
 * Draws an image file at the size its block asks for (fitImage), at least
 * `minRows` tall, centred in its cells. `density` below 1 draws it with that
 * fraction of its cells' pixels each way; a photo is drawn at less still
 * where its PNG would pass IMAGE_FILE_BYTES (the terminal scales it to its
 * cells, so the cells stay). `density` in the result: the one it was drawn
 * at. A picture is drawn as a TeX picture is (renderPicture, its colours
 * adapted to the background). Throws TexError.
 */
export function renderImage(source: ImageSource, spec: Pick<ImageSpec, 'width' | 'height' | 'scale'>, env: PictureEnv, minRows?: number, density = 1): RenderedImage & { density: number } {
  if (source.kind === 'picture') return { ...renderPicture(source.picture, pictureImageEnv(source, spec, env), minRows, density), density }
  const fit = fitImage(source, spec, imageBox(env))
  const rows = Math.max(fit.rows, minRows ?? 0)
  const fullWidth = fit.columns * env.cellWidth
  const fullHeight = rows * env.cellHeight
  // Started where the raw pixels are four times the bytes allowed: a photo's PNG is rarely smaller than a quarter of them.
  let d = Math.min(1, Math.max(MIN_IMAGE_DENSITY, density), Math.sqrt(IMAGE_FILE_BYTES / (fullWidth * fullHeight)))
  for (;;) {
    const png = drawBitmap(source.bitmap, fit.widthPx * d, fit.heightPx * d, fullWidth * d, fullHeight * d)
    if (png.length <= IMAGE_FILE_BYTES) return { columns: fit.columns, rows, scale: 1, png, density: d }
    if (d <= MIN_IMAGE_DENSITY) throw new TexError('image too large to send to the terminal')
    d = Math.max(MIN_IMAGE_DENSITY, d * 0.7)
  }
}

/** `bitmap` scaled to `width` × `height` pixels, centred on a transparent `boxWidth` × `boxHeight` (each rounded to whole pixels), as a PNG. */
function drawBitmap(bitmap: Bitmap, width: number, height: number, boxWidth: number, boxHeight: number): Uint8Array {
  const W = Math.max(1, Math.round(boxWidth))
  const H = Math.max(1, Math.round(boxHeight))
  // Never more pixels than the kept bitmap has: it was kept at least as large as any box it is drawn in.
  const w = Math.min(W, bitmap.width, Math.max(1, Math.round(width)))
  const h = Math.min(H, bitmap.height, Math.max(1, Math.round(height)))
  const scaled = w === bitmap.width && h === bitmap.height ? bitmap : scaleBitmap(bitmap, w, h)
  if (w === W && h === H) return encodeBitmapPng(scaled)
  const rgba = new Uint8Array(W * H * 4)
  const x0 = Math.floor((W - w) / 2)
  const y0 = Math.floor((H - h) / 2)
  for (let y = 0; y < h; y++) rgba.set(scaled.rgba.subarray(y * w * 4, (y + 1) * w * 4), ((y0 + y) * W + x0) * 4)
  return encodeBitmapPng({ width: W, height: H, rgba })
}

/** renderDisplay for a formula TeX drew (texFormula), at least `minRows` tall. Throws TexError. */
export function renderDisplayResult(result: TypesetResult, env: RenderEnv, minRows?: number): RenderedImage {
  const options = rasterOptions(env, minRows)
  const box = measure(result, options)
  if (box.scale < MIN_DISPLAY_SCALE) throw new TexError(tooSmall(box.scale))
  if (box.columns * env.cellWidth * box.rows * env.cellHeight > MAX_PIXELS || box.rows * env.cellHeight > MAX_IMAGE_SIDE) throw new TexError(TOO_LARGE)
  const raster = rasterize(result, options)
  const png = encodePng(raster, env.ink, env.inkOver, env.inkCurve)
  if (png.length > MAX_IMAGE_BYTES) throw new TexError(TOO_LARGE)
  return { columns: raster.columns, rows: raster.rows, scale: raster.scale, png }
}
