// The fuzz driver: streams a reply through kittex's real hook code the way
// Claude Code does (MessageStream fed MessageDisplay flushes of whole-line
// batches, the last one final and possibly mid-line; records kept as
// register.tsx keeps them), lands it as register.tsx's drawLanded does
// (planLanded with the same options, drawn by the real renderers), and lands
// the LaTeX source as after --resume. Then every invariant is checked on the
// screen model (screen.ts), each a named check whose failure says what broke.

import { performance } from 'node:perf_hooks'

import {
  GlyphError,
  measureDisplay,
  renderDisplay,
  renderInline,
  scan,
  TexError,
} from '../../../plugin/hooks/core.js'
import type { RenderedImage, RenderEnv, InlineEnv } from '../../../plugin/hooks/core.js'
import {
  inlineEnvFor,
  inlineText,
  joinProse,
  MessageStream,
  planLanded,
  proseWidthFor,
  renderEnvFor,
  REPLY_INDENT,
  SOURCE_PATTERN,
  STREAMED_PATTERN,
} from '../../../plugin/hooks/math.js'
import type { LandedPlan, Piece, PreviewRecord, StreamEnv } from '../../../plugin/hooks/math.js'
import { envFor, flushesOf, remember } from '../../../plugin/tests/fuzz/shape.ts'
import type { Shape } from '../../../plugin/tests/fuzz/shape.ts'
import { missingInline, padCause, rowCause } from './diagnose.js'
import type { CaseContext } from './diagnose.js'
import { cellsOf, engineRows, landedDrawing } from './screen.js'
import type { DrawContext, Drawing, Placed, Row } from './screen.js'

export { CELLS, describeShape, envFor, flushesOf, remember, shapeFor, variablesFor } from '../../../plugin/tests/fuzz/shape.ts'
export type { Shape } from '../../../plugin/tests/fuzz/shape.ts'

// ─── Images (the real renderers, kept by formula and geometry) ───────────────

/** What a check needs of an image: its cells and a signature of its pixels. */
interface ImageInfo extends RenderedImage {
  signature: string
}

const images = new Map<string, ImageInfo | TexError>()
const IMAGE_CACHE = 30_000

function signature(png: Uint8Array): string {
  let hash = 0x811c9dc5
  for (const byte of png) hash = Math.imul(hash ^ byte, 0x01000193)
  return (hash >>> 0).toString(36) + ':' + png.length
}

function cached(key: string, draw: () => RenderedImage): ImageInfo {
  let image = images.get(key)
  if (image === undefined) {
    try {
      const drawn = draw()
      image = { columns: drawn.columns, rows: drawn.rows, scale: drawn.scale, png: new Uint8Array(0), signature: signature(drawn.png) }
    } catch (error) {
      if (!(error instanceof TexError)) throw error
      image = error
    }
    if (images.size >= IMAGE_CACHE) images.delete(images.keys().next().value!)
    images.set(key, image)
  }
  if (image instanceof TexError) throw image
  return image
}

function geometry(env: RenderEnv): string {
  return [env.cellWidth, env.cellHeight, env.maxColumns, env.emPx].join(',')
}

function displayImage(tex: string, env: RenderEnv, rows?: number): ImageInfo {
  const height = rows ?? measureDisplay(tex, env).rows
  return cached(`d\n${geometry(env)}\n${height}\n${tex}`, () => renderDisplay(tex, env, height))
}

function inlineImage(tex: string, env: InlineEnv, columns: number): ImageInfo {
  return cached(`i\n${geometry(env)},${env.baselinePx}\n${columns}\n${tex}`, () => renderInline(tex, env, columns))
}

// ─── Streaming ───────────────────────────────────────────────────────────────

export interface Streamed {
  /** What the engine shows: every flush's displayContent, joined. */
  shown: string
  /** Records this reply wrote, in order (one per preview written). */
  written: PreviewRecord[]
  /** The record store after the reply (register.tsx's remember). */
  store: PreviewRecord[]
  flushes: number
  maxPushMs: number
}

export function streamReply(markdown: string, shape: Shape, store: readonly PreviewRecord[] = []): Streamed {
  const env = envFor(shape)
  const streamEnv: StreamEnv = { ...env, inline: shape.inline && env.images }
  const stream = new MessageStream()
  const flushes = flushesOf(markdown, shape.flushSeed)
  let shown = ''
  let records = [...store]
  const written: PreviewRecord[] = []
  let maxPushMs = 0
  for (const [index, delta] of flushes.entries()) {
    const final = index === flushes.length - 1
    // register.tsx: a message whose first flush is empty and final is not streamed.
    if (index === 0 && delta === '' && final) break
    const start = performance.now()
    const rewrite = stream.push(delta, final, streamEnv)
    maxPushMs = Math.max(maxPushMs, performance.now() - start)
    shown += rewrite.text
    if (rewrite.records.length > 0) {
      written.push(...rewrite.records)
      records = remember(records, rewrite.records)
    }
  }
  return { shown, written, store: records, flushes: flushes.length, maxPushMs }
}

// ─── Landing ─────────────────────────────────────────────────────────────────

export interface Landed {
  /** Whether the AssistantMessage hook runs on this text at all (its matchers). */
  hooked: boolean
  plan: LandedPlan | null
  /** What is drawn: the plan's pieces, or the text as one prose piece where kittex draws nothing of its own. */
  pieces: Piece[]
  ms: number
}

/** drawLanded's plan for a landed text, in a terminal of this shape. */
export function land(text: string, store: readonly PreviewRecord[], shape: Shape): Landed {
  const env = envFor(shape)
  const columns = shape.columns
  // The four registrations' matchers (terminal): streamed previews, or LaTeX as written.
  const hooked = STREAMED_PATTERN.test(text) || SOURCE_PATTERN.test(text)
  if (!hooked) return { hooked, plan: null, pieces: [{ kind: 'prose', text, gap: false }], ms: 0 }
  const images = env.images
  const records = images && /&nbsp;|```| |⠀|͏/.test(text) ? store : []
  const renderEnv = renderEnvFor(env, columns)
  const inlineEnv = inlineEnvFor(env, columns)
  const start = performance.now()
  const plan = planLanded(text, records, {
    maxColumns: renderEnv.maxColumns,
    draw: images ? (tex, rows, maxColumns) => displayImage(tex, maxColumns === undefined ? renderEnv : { ...renderEnv, maxColumns }, rows) : undefined,
    width: proseWidthFor(env, columns),
    measure: (tex, maxColumns) => measureDisplay(tex, { ...renderEnv, maxColumns }).rows,
    inline: images && shape.inline ? { env: inlineEnv, width: proseWidthFor(env, columns), columns, draw: (tex, cells) => inlineImage(tex, inlineEnv, cells), hyperlinks: env.hyperlinks } : undefined,
  })
  const ms = performance.now() - start
  let pieces: Piece[]
  if (!plan.changed) pieces = [{ kind: 'prose', text, gap: false }]
  else if (plan.pieces.every(piece => piece.kind === 'prose' && !piece.inline?.length)) pieces = [{ kind: 'prose', text: joinProse(plan.pieces), gap: false }]
  else pieces = plan.pieces
  return { hooked, plan, pieces, ms }
}

export function contextFor(shape: Shape): DrawContext {
  const env = envFor(shape)
  return { width: proseWidthFor(env, shape.columns), columns: shape.columns, mode: { hyperlinks: env.hyperlinks } }
}

// ─── Checks ──────────────────────────────────────────────────────────────────

/** The names of the invariants. */
export const CHECKS = {
  exception: 'no exception in a hook',
  slow: 'each hook call well inside the 10 s budget',
  inlineImage: 'every inline formula padded while streaming gets its image at landing',
  displayImage: 'every display preview recorded while streaming gets its image at landing',
  padVisible: 'no U+2800 pad left visible in the landed text',
  moved: 'nothing moves at landing: landed rows equal the streamed rows outside images',
  unverified: 'landed parts the replay cannot follow are the streamed ones (same text, same order)',
  overPreview: 'every image lies exactly over its preview cells',
  overlap: 'no image overlaps another image or the right edge',
  imageShape: 'an inline image is one row and as wide as its slot; a display image as tall as its preview',
  rawLatex: 'no raw LaTeX left at landing unless MathJax refused it (then its source and the dim note)',
  impure: 'the streamed preview is a pure function of the formula and the terminal',
  resumed: 'resumed (LaTeX landing directly) draws as the live landing does',
  predicted: 'the planned places match the replay of the padded text',
  phantom: 'no formula is drawn at landing that the reply did not have',
} as const

export type CheckName = keyof typeof CHECKS

export interface Failure {
  check: CheckName
  detail: string
  /** A cause key for grouping (what kind of thing broke): refined by diagnose.ts. */
  cause: string
  /** The row (of the drawings) or the formula the failure is at, for diagnosis. */
  row?: number
  tex?: string
}

type Fail = (check: CheckName, cause: string, detail: string, at?: { row?: number; tex?: string }) => void

export interface CaseResult {
  failures: Failure[]
  streamed: Streamed | null
  live: Landed | null
  resumed: Landed | null
  liveDrawing: Drawing | null
  streamDrawing: Drawing | null
  resumedDrawing: Drawing | null
  stats: { inline: number; inlineImages: number; display: number; displayImages: number; pushMs: number; landMs: number; resumeMs: number }
}

const SLOW_PUSH_MS = 1000
const SLOW_LAND_MS = 2000

/** Runs one reply in one terminal shape and checks every invariant. */
export function runCase(markdown: string, shape: Shape, options: { store?: PreviewRecord[]; partial?: boolean } = {}): CaseResult {
  const failures: Failure[] = []
  const fail: Fail = (check, cause, detail, at = {}) => failures.push({ check, cause, detail, ...at })
  const result: CaseResult = {
    failures,
    streamed: null,
    live: null,
    resumed: null,
    liveDrawing: null,
    streamDrawing: null,
    resumedDrawing: null,
    stats: { inline: 0, inlineImages: 0, display: 0, displayImages: 0, pushMs: 0, landMs: 0, resumeMs: 0 },
  }
  const ctx = contextFor(shape)

  let streamed: Streamed
  try {
    streamed = streamReply(markdown, shape, options.store)
  } catch (error) {
    fail('exception', 'stream', `MessageStream.push threw: ${(error as Error)?.stack ?? error}`)
    return result
  }
  result.streamed = streamed
  result.stats.pushMs = streamed.maxPushMs
  if (streamed.maxPushMs > SLOW_PUSH_MS) fail('slow', 'push', `a MessageDisplay flush took ${streamed.maxPushMs.toFixed(0)} ms`)

  const landedText = shape.trimLanded ? streamed.shown.replace(/\s+$/, '') : streamed.shown
  let live: Landed
  let resumed: Landed
  try {
    live = land(landedText, streamed.store, shape)
  } catch (error) {
    fail('exception', 'land', `planLanded (live) threw: ${(error as Error)?.stack ?? error}`)
    return result
  }
  try {
    resumed = land(markdown, [], shape)
  } catch (error) {
    fail('exception', 'resume', `planLanded (resumed) threw: ${(error as Error)?.stack ?? error}`)
    return result
  }
  if (options.partial) {
    // The first render at landing may lack the block's last flush.
    const cut = landedText.slice(0, Math.max(0, landedText.lastIndexOf('\n', landedText.length - 2) + 1))
    try {
      land(cut, streamed.store, shape)
    } catch (error) {
      fail('exception', 'partial', `planLanded (a render before the last flush) threw: ${(error as Error)?.stack ?? error}`)
    }
  }
  result.live = live
  result.resumed = resumed
  result.stats.landMs = live.ms
  result.stats.resumeMs = resumed.ms
  if (live.ms > SLOW_LAND_MS) fail('slow', 'land', `the landing plan took ${live.ms.toFixed(0)} ms`)
  if (resumed.ms > SLOW_LAND_MS) fail('slow', 'resume', `the resumed landing plan took ${resumed.ms.toFixed(0)} ms`)

  const streamDrawing: Drawing = { rows: engineRows(landedText, ctx), images: [] }
  const liveDrawing = landedDrawing(live.pieces, ctx)
  const resumedDrawing = landedDrawing(resumed.pieces, ctx)
  result.streamDrawing = streamDrawing
  result.liveDrawing = liveDrawing
  result.resumedDrawing = resumedDrawing

  const inlineWritten = streamed.written.filter(record => record.inline)
  const displayWritten = streamed.written.filter(record => !record.inline && record.error === undefined && record.rows > 0)
  const liveInline = liveDrawing.images.filter(image => image.kind === 'inline')
  const liveDisplay = liveDrawing.images.filter(image => image.kind !== 'inline')
  result.stats.inline = inlineWritten.length
  result.stats.inlineImages = liveInline.length
  result.stats.display = displayWritten.length
  result.stats.displayImages = liveDisplay.length

  // Every padded inline preview gets its image.
  const missing = multisetMinus(inlineWritten.map(record => record.tex), liveInline.map(image => image.tex))
  if (missing.length > 0) fail('inlineImage', 'inline-missing', `${missing.length} of ${inlineWritten.length} padded inline previews got no image: ${missing.slice(0, 4).map(s => JSON.stringify(s)).join(', ')}`, { tex: missing[0] })
  const extra = multisetMinus(liveInline.map(image => image.tex), inlineWritten.map(record => record.tex))
  if (extra.length > 0 && live.hooked) fail('inlineImage', 'inline-extra', `inline images with no preview written for them: ${extra.slice(0, 4).map(s => JSON.stringify(s)).join(', ')}`)
  const dmissing = multisetMinus(displayWritten.map(record => record.tex), liveDisplay.map(image => image.tex))
  if (dmissing.length > 0) fail('displayImage', 'display-missing', `${dmissing.length} of ${displayWritten.length} display previews got no image: ${dmissing.slice(0, 3).map(s => JSON.stringify(s.slice(0, 60))).join(', ')}`, { tex: dmissing[0] })

  // Pads left visible.
  const covered = coverage(liveDrawing)
  for (const [r, row] of liveDrawing.rows.entries()) {
    if (!row.cells || row.preview) continue
    for (const [c, cell] of row.cells.entries()) {
      if (cell.includes('⠀') && !covered.has(`${r},${c}`)) {
        fail('padVisible', 'pad', `row ${r} column ${c}: ${JSON.stringify(row.cells.join(''))}`, { row: r })
        break
      }
    }
  }

  // Images: in bounds, no overlap, the right shape.
  const owner = new Map<string, Placed>()
  for (const image of liveDrawing.images) {
    const right = image.bound
    if (image.col < 0 || image.col + image.columns > right || REPLY_INDENT + image.col + image.columns > shape.columns) {
      fail('overlap', `edge-${image.kind}`, `${image.kind} image ${JSON.stringify(image.tex.slice(0, 40))} at column ${image.col}, ${image.columns} wide, passes column ${right}`)
    }
    for (let r = image.row; r < image.row + image.rows; r++) {
      for (let c = image.col; c < image.col + image.columns; c++) {
        const other = owner.get(`${r},${c}`)
        if (other && other !== image) {
          // Below a part the replay doesn't follow, the rows are unknown (opaque counts one): the overlap may be the model's.
          const unknown = liveDrawing.rows.slice(0, r + 1).some(row => row.opaque !== undefined)
          fail('overlap', unknown ? 'images-below-opaque' : 'images', `images ${JSON.stringify(other.tex.slice(0, 30))} and ${JSON.stringify(image.tex.slice(0, 30))} share row ${r} column ${c}`)
          r = Infinity
          break
        }
        owner.set(`${r},${c}`, image)
      }
    }
    if (image.kind === 'inline' && image.rows !== 1) fail('imageShape', 'inline-rows', `inline image ${JSON.stringify(image.tex)} is ${image.rows} rows`)
  }
  for (const piece of live.pieces) {
    if (piece.kind !== 'prose') continue
    for (const inline of piece.inline ?? []) {
      const record = streamed.store.find(record => record.inline && record.tex === inline.tex)
      if (record?.columns !== undefined && inline.image.rows === 1 && inline.image.columns !== record.columns) {
        fail('imageShape', 'inline-columns', `inline image ${JSON.stringify(inline.tex)} is ${inline.image.columns} columns for a ${record.columns}-column slot`)
      }
    }
  }

  // Nothing moves; each image over its preview.
  const aligned = compareDrawings(streamDrawing, liveDrawing, fail, 'moved')
  predictedOverPreview(liveDrawing, streamDrawing, streamed, fail, aligned)

  // Raw LaTeX left at landing.
  rawLatex(markdown, live, shape, fail)

  // Formulas the reply never had (the landed text is scanned again).
  const own = new Set(scan(markdown).flatMap(segment => (segment.kind === 'math' ? [segment.tex] : [])))
  const phantoms = liveDrawing.images.filter(image => !own.has(image.tex))
  if (phantoms.length > 0) fail('phantom', 'rescan', `drawn at landing, not in the reply: ${phantoms.slice(0, 3).map(image => JSON.stringify(image.tex)).join(', ')}`, { tex: phantoms[0]!.tex })

  // The preview is a pure function of the formula (and its context).
  const seen = new Map<string, string>()
  for (const record of streamed.written) {
    const key = `${record.inline ? 'i' : 'd'}\n${record.columns ?? ''}\n${record.rows}\n${record.quote ?? 0}\n${record.tex}`
    const before = seen.get(key)
    if (before !== undefined && before.replace(/^[ \t>]+/gm, '') !== record.preview.replace(/^[ \t>]+/gm, '')) {
      fail('impure', 'preview', `${JSON.stringify(record.tex.slice(0, 50))} was previewed as ${JSON.stringify(before.slice(0, 60))} and as ${JSON.stringify(record.preview.slice(0, 60))}`)
    }
    seen.set(key, record.preview)
  }
  const byPreview = new Map<string, string>()
  for (const record of streamed.written) {
    if (!record.inline) continue
    const other = byPreview.get(record.preview)
    if (other !== undefined && other !== record.tex) {
      fail('impure', 'collision', `${JSON.stringify(other)} and ${JSON.stringify(record.tex)} stream the same preview ${JSON.stringify(record.preview)}: both land with the image of the later one`)
    }
    byPreview.set(record.preview, record.tex)
  }

  // Resumed equals live.
  compareResumed(liveDrawing, resumedDrawing, fail, failures.some(failure => failure.check === 'padVisible' || failure.cause.startsWith('inline-missing')))

  // Causes named from where each failure is.
  const context: CaseContext = { ctx, shown: landedText, columns: shape.columns, maxProseWidth: shape.maxProseWidth, written: streamed.written, pieces: live.pieces, streamed: streamDrawing, live: liveDrawing }
  for (const failure of failures) {
    if (failure.check === 'inlineImage' && failure.cause === 'inline-missing' && failure.tex !== undefined) failure.cause += `:${missingInline(failure.tex, context)}`
    else if (failure.check === 'padVisible' && failure.row !== undefined) failure.cause += `:${padCause(failure.row, context)}`
    else if ((failure.check === 'moved' || failure.check === 'unverified' || failure.check === 'overPreview') && failure.row !== undefined) failure.cause += `:${rowCause(failure.row, context)}`
  }
  return result
}

function multisetMinus(a: readonly string[], b: readonly string[]): string[] {
  const counts = new Map<string, number>()
  for (const x of b) counts.set(x, (counts.get(x) ?? 0) + 1)
  const out: string[] = []
  for (const x of a) {
    const n = counts.get(x) ?? 0
    if (n > 0) counts.set(x, n - 1)
    else out.push(x)
  }
  return out
}

function coverage(drawing: Drawing): Set<string> {
  const covered = new Set<string>()
  for (const image of drawing.images) for (let r = image.row; r < image.row + image.rows; r++) for (let c = image.col; c < image.col + image.columns; c++) covered.add(`${r},${c}`)
  return covered
}

/** Cells equal for the comparison: blanks (a space, an empty cell, a pad's trimmed end) alike. */
function blankish(cell: string | undefined): boolean {
  return cell === undefined || cell === ' ' || cell === '' || cell === '\u00a0'
}

function sameCell(a: string | undefined, b: string | undefined): boolean {
  return a === b || (blankish(a) && blankish(b))
}

/** Two texts around where they first differ. */
export function textDiff(a: string, b: string): string {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  const from = Math.max(0, i - 30)
  return `at ${i}: ${JSON.stringify(a.slice(from, i + 40))} vs ${JSON.stringify(b.slice(from, i + 40))}`
}

function rowPair(x: Row | undefined, y: Row | undefined): string {
  if (x?.opaque !== undefined && y?.opaque !== undefined) return `opaque parts differ ${textDiff(x.opaque, y.opaque)}`
  return `${rowText(x)} / ${rowText(y)}`
}

/** A part's text as the engine draws it: trailing whitespace of each line, and of the whole, dropped. */
function trimmed(text: string | undefined): string | undefined {
  return text?.replace(/[ \t]+$/gm, '').trimEnd()
}

function rowText(row: Row | undefined): string {
  if (!row) return '(none)'
  if (row.opaque !== undefined) return `⟦opaque ${JSON.stringify(row.opaque.slice(0, 50))}⟧`
  return JSON.stringify((row.cells ?? []).join('').replace(/\s+$/, ''))
}

/** Streamed against landed, row for row, outside the landed drawing's images. */
function compareDrawings(streamed: Drawing, landed: Drawing, fail: Fail, check: CheckName): number {
  const covered = coverage(landed)
  const opaque = streamed.rows.some(row => row.opaque !== undefined) || landed.rows.some(row => row.opaque !== undefined)
  if (streamed.rows.length !== landed.rows.length) {
    const first = firstDifference(streamed, landed, covered)
    fail(opaque && first.opaque ? 'unverified' : check, opaque && first.opaque ? 'structure' : 'rows', `${streamed.rows.length} rows streamed, ${landed.rows.length} landed; first difference at row ${first.row}, streamed / landed: ${rowPair(streamed.rows[first.row], landed.rows[first.row])}`, { row: first.row })
    return first.row
  }
  const first = firstDifference(streamed, landed, covered)
  if (first.row >= 0) {
    fail(first.opaque ? 'unverified' : check, first.opaque ? 'structure' : 'cells', `row ${first.row} differs, streamed / landed: ${rowPair(streamed.rows[first.row], landed.rows[first.row])}`, { row: first.row })
    return first.row
  }
  return Infinity
}

function firstDifference(streamed: Drawing, landed: Drawing, covered: Set<string>): { row: number; opaque: boolean } {
  const n = Math.max(streamed.rows.length, landed.rows.length)
  for (let r = 0; r < n; r++) {
    const s = streamed.rows[r]
    const l = landed.rows[r]
    if (!s || !l) return { row: r, opaque: s?.opaque !== undefined || l?.opaque !== undefined }
    if (s.opaque !== undefined || l.opaque !== undefined) {
      if (trimmed(s.opaque) !== trimmed(l.opaque)) return { row: r, opaque: true }
      continue
    }
    const sc = s.cells ?? []
    const lc = l.cells ?? []
    for (let c = 0; c < Math.max(sc.length, lc.length); c++) {
      if (covered.has(`${r},${c}`)) continue
      if (!sameCell(sc[c], lc[c])) return { row: r, opaque: false }
    }
  }
  return { row: -1, opaque: false }
}

/** An inline preview's markdown as drawn: escapes read, as cells. */
function previewCells(preview: string): string[] {
  return cellsOf(preview.replace(/\\([`*_[|~#>])/g, '$1'))
}

/**
 * Each image over its preview: in the landed drawing's own text (the replay
 * of the padded pieces: `predicted`) and in the streamed drawing (the
 * engine's drawing of what streamed: `overPreview`), the cells under an
 * inline image are its preview's, and the rows under a display image are a
 * display preview's lines.
 */
function predictedOverPreview(landed: Drawing, streamed: Drawing, stream: Streamed, fail: Fail, aligned: number): void {
  const previewsOf = new Map<string, string[][]>()
  for (const record of stream.store) {
    if (!record.inline) continue
    const list = previewsOf.get(record.tex) ?? []
    list.push(previewCells(record.preview))
    previewsOf.set(record.tex, list)
  }
  const matches = (row: Row | undefined, image: Placed, want: string[]) => {
    const cells = row?.cells ?? []
    for (let c = 0; c < image.columns; c++) {
      const have = cells[image.col + c]
      const expected = want[c]
      if (expected === undefined) {
        if (!(blankish(have) || have === '\u2800')) return false
      } else if (!(have === expected || (expected === '\u2800' && blankish(have)) || (blankish(expected) && blankish(have)))) {
        return false
      }
    }
    return want.length <= image.columns
  }
  for (const image of landed.images) {
    if (image.kind !== 'inline') continue
    const wants = previewsOf.get(image.tex)
    if (!wants) continue // a formula read back as LaTeX: its preview is the plan's own
    const own = landed.rows[image.row]
    if (!wants.some(want => matches(own, image, want))) {
      fail('predicted', 'inline', `inline image ${JSON.stringify(image.tex)} at row ${image.row} column ${image.col} (${image.columns} wide) is not over its preview in the landed text: ${rowText(own)}`, { row: image.row, tex: image.tex })
    }
    const there = streamed.rows[image.row]
    // Past the first row that moved the drawings no longer line up (that row is the failure).
    if (image.row >= aligned) continue
    if (!wants.some(want => matches(there, image, want))) {
      fail('overPreview', 'inline', `inline image ${JSON.stringify(image.tex)} at row ${image.row} column ${image.col} (${image.columns} wide) is not over its streamed preview: ${rowText(there)}`, { row: image.row, tex: image.tex })
    }
  }
  for (const image of landed.images) {
    if (image.kind === 'inline' || image.row + image.rows > aligned) continue
    for (let r = image.row; r < image.row + image.rows; r++) {
      const row = streamed.rows[r]
      // A quoted display's rows hold the quote's bar too; a display image's rows hold only the preview.
      const ok = image.kind === 'display' ? row?.preview === true : row?.cells !== undefined
      if (!ok) {
        fail('overPreview', image.kind, `${image.kind} image ${JSON.stringify(image.tex.slice(0, 40))} (rows ${image.row}-${image.row + image.rows - 1}) covers streamed row ${r}, which is not its preview: ${rowText(row)}`, { row: r, tex: image.tex })
        break
      }
    }
  }
}

/** Code spans and fences blanked out (raw LaTeX there is meant). */
function withoutCode(text: string): string {
  return text.replace(/^[ \t>]*(```|~~~)[^\n]*\n[\s\S]*?^[ \t>]*\1[ \t]*$/gm, '').replace(/(`+)[\s\S]*?\1/g, '')
}

function count(text: string, part: string): number {
  let n = 0
  for (let at = text.indexOf(part); at >= 0; at = text.indexOf(part, at + 1)) n++
  return n
}

/**
 * Math as written left in the landed text: a formula MathJax draws whose
 * source appears in the landed prose more often than outside math in the
 * reply (in code, say); and a refused display formula with no dim note.
 */
function rawLatex(markdown: string, live: Landed, shape: Shape, fail: Fail): void {
  const env = envFor(shape)
  const renderEnv = renderEnvFor(env)
  const landedText = live.pieces.map(piece => (piece.kind === 'prose' ? piece.text : '')).join('\n')
  const notes = live.pieces.filter(piece => piece.kind === 'note').length
  const segments = scan(markdown).filter(segment => segment.kind === 'math')
  let refused = 0
  const reported = new Set<string>()
  for (const segment of segments) {
    if (segment.kind !== 'math') continue
    let error: string | undefined
    try {
      measureDisplay(segment.tex, renderEnv)
    } catch (e) {
      if (!(e instanceof TexError)) throw e
      error = e instanceof GlyphError ? undefined : e.message
    }
    if (error !== undefined) {
      refused += segment.display ? 1 : 0
      continue
    }
    const raw = segment.raw.trim()
    if (raw.length < 3 || reported.has(raw)) continue
    const asMath = segments.filter(other => other.kind === 'math' && other.raw.trim() === raw).length
    if (count(landedText, raw) <= count(markdown, raw) - asMath) continue
    reported.add(raw)
    const why = segment.display ? 'display' : inlineText(segment.tex) === null ? 'inline-no-unicode' : 'inline'
    fail('rawLatex', why, `${segment.display ? 'display' : 'inline'} ${JSON.stringify(raw.slice(0, 70))} is left as written`)
  }
  if (live.hooked && live.plan && refused > 0 && notes === 0 && env.images) {
    fail('rawLatex', 'note', `${refused} display formula(s) MathJax refused landed with no dim note`)
  }
}

/** Resumed against live: the same rows, the same images at the same cells. */
function compareResumed(live: Drawing, resumed: Drawing, fail: Fail, padsLeft: boolean): void {
  const key = (image: Placed) => `${image.kind === 'quoted' ? 'q' : image.kind[0]}@${image.row},${image.col} ${image.rows}x${image.columns} ${image.tex}`
  const a = live.images.map(key)
  const b = resumed.images.map(key)
  const onlyLive = multisetMinus(a, b)
  const onlyResumed = multisetMinus(b, a)
  if (onlyLive.length > 0 || onlyResumed.length > 0) {
    const kinds = (keys: string[]) => [...new Set(keys.map(key => key[0]))].sort().join('')
    const cause = onlyLive.length > 0 && onlyResumed.length > 0 ? 'images-differ' : onlyLive.length > 0 ? `live-only-${kinds(onlyLive)}` : `resumed-only-${kinds(onlyResumed)}`
    fail('resumed', cause, `live only: ${onlyLive.slice(0, 3).join('; ') || '-'}; resumed only: ${onlyResumed.slice(0, 3).join('; ') || '-'}`)
    return
  }
  const covered = coverage(live)
  const n = Math.max(live.rows.length, resumed.rows.length)
  for (let r = 0; r < n; r++) {
    const x = live.rows[r]
    const y = resumed.rows[r]
    const same = x && y && (x.opaque !== undefined || y.opaque !== undefined ? trimmed(x.opaque) === trimmed(y.opaque) : (x.cells ?? []).every((cell, c) => covered.has(`${r},${c}`) || sameCell(cell, (y.cells ?? [])[c])) && (y.cells ?? []).every((cell, c) => covered.has(`${r},${c}`) || sameCell(cell, (x.cells ?? [])[c])))
    if (!same) {
      const cause = padsLeft ? 'pads-left-live' : x?.opaque !== undefined || y?.opaque !== undefined ? 'structure' : 'rows'
      fail('resumed', cause, `row ${r}, live / resumed: ${rowPair(x, y)} (${live.rows.length} rows live, ${resumed.rows.length} resumed)`, { row: r })
      return
    }
  }
}
