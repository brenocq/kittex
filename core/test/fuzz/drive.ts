// The fuzz driver: streams a reply through kittex's real hook code the way
// Claude Code does (MessageStream fed MessageDisplay flushes of whole-line
// batches, the last one final and possibly mid-line; records kept as
// register.tsx keeps them), lands it as register.tsx's drawLanded does
// (planLanded with the same options, drawn by the real renderers), and lands
// the LaTeX source as after --resume. Then every invariant is checked on the
// screen model (screen.ts), each a named check whose failure says what broke.

import { performance } from 'node:perf_hooks'

import {
  createLineScanner,
  GlyphError,
  measureDisplay,
  measureDisplayResult,
  previewDisplay,
  renderDisplay,
  renderDisplayResult,
  renderInline,
  renderInlineResult,
  renderPicture,
  scan,
  TexError,
  texPicture,
} from '../../../plugin/hooks/core.js'
import type { InkPlace, InlineEnv, PictureEnv, RenderedImage, RenderEnv, TexDocument } from '../../../plugin/hooks/core.js'
import { diagramJob, mathJob, texBook, texResult } from '../../../plugin/hooks/tex.ts'
import type { DiagramKind, TexOutcome } from '../../../plugin/hooks/tex.ts'
import {
  inlineEnvFor,
  inlineText,
  joinProse,
  MessageStream,
  NOT_RENDERED,
  pictureEnvFor,
  planLanded,
  proseWidthFor,
  renderEnvFor,
  REPLY_INDENT,
  sourcePattern,
  STREAMED_PATTERN,
  streamEnvFor,
} from '../../../plugin/hooks/math.js'
import type { LandedPlan, Piece, PreviewRecord, StreamEnv } from '../../../plugin/hooks/math.js'
import { envFor, flushesOf, mathOf, remember } from '../../../plugin/tests/fuzz/shape.ts'
import type { Shape } from '../../../plugin/tests/fuzz/shape.ts'
import { missingInline, padCause, rowCause } from './diagnose.js'
import type { CaseContext } from './diagnose.js'
import { cellsOf, engineRows, landedDrawing } from './screen.js'
import type { DrawContext, Drawing, Placed, Row } from './screen.js'

export { CELLS, describeShape, envFor, flushesOf, mathOf, remember, shapeFor, variablesFor } from '../../../plugin/tests/fuzz/shape.ts'
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
  return [env.cellWidth, env.cellHeight, env.maxColumns, env.emPx, env.inkOver ? 'over' : ''].join(',')
}

function displayImage(tex: string, env: RenderEnv, rows?: number): ImageInfo {
  try {
    const height = rows ?? measureDisplay(tex, env).rows
    return cached(`d\n${geometry(env)}\n${height}\n${tex}`, () => renderDisplay(tex, env, height))
  } catch (error) {
    // register.tsx: what MathJax refused, TeX's drawing where the local LaTeX made one.
    const result = error instanceof TexError ? texDrawn(tex, true) : undefined
    if (!result) throw texRefusal(tex, true) ?? error
    const height = rows ?? measureDisplayResult(result, env).rows
    return cached(`t\n${geometry(env)}\n${height}\n${tex}`, () => renderDisplayResult(result, env, height))
  }
}

function displayRows(tex: string, env: RenderEnv): number {
  try {
    return measureDisplay(tex, env).rows
  } catch (error) {
    const result = error instanceof TexError ? texDrawn(tex, true) : undefined
    if (!result) throw texRefusal(tex, true) ?? error
    return measureDisplayResult(result, env).rows
  }
}

function inlineImage(tex: string, env: InlineEnv, columns: number, place: InkPlace = 'center'): ImageInfo {
  try {
    return cached(`i\n${geometry(env)},${env.baselinePx}\n${columns},${place}\n${tex}`, () => renderInline(tex, env, columns, place))
  } catch (error) {
    const result = error instanceof TexError ? texDrawn(tex, false) : undefined
    if (!result) throw error
    return cached(`ti\n${geometry(env)},${env.baselinePx}\n${columns},${place}\n${tex}`, () => renderInlineResult(result, env, columns, place))
  }
}

// ─── The local TeX (a stand-in: tex.ts's book, filled with outcomes by the document's hash) ─

function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  return h >>> 0
}

/**
 * What TeX gives for a document, decided by its hash: mostly a picture of a
 * size of its own (a diagram from 40 to 500 big points wide and 20 to 400
 * high, a formula on its baseline), now and then an error, now and then too
 * slow. The same document always gives the same outcome.
 */
function fakeTex(document: TexDocument): TexOutcome {
  const h = hash(document.text)
  const roll = h % 20
  if (roll === 0) return { ok: false, error: 'Undefined control sequence \\nope (line 2)', lasting: true }
  if (roll === 1) return { ok: false, error: 'TeX took longer than 3 s', lasting: false }
  const w = 40 + ((h >>> 5) % 460)
  const ht = 20 + ((h >>> 13) % 380)
  const svg =
    document.baseline === 'origin'
      ? `<svg viewBox='0 -7 ${10 + (w % 40)} 10'><path d='M0 -6H${10 + (w % 40)}V2H0Z'/></svg>`
      : `<svg viewBox='0 0 ${w} ${ht}'><path d='M0 0L${w} ${ht}' stroke='#f00' stroke-width='0.8' fill='none'/><rect x='2' y='2' width='${w / 2}' height='${ht / 3}' fill='#ccf'/><path d='M1 1H${w - 1}V${ht - 1}H1Z' fill='none' stroke='#000' stroke-width='0.4'/></svg>`
  return { ok: true, picture: texPicture(svg, document) }
}

/** Resolves the documents a stream waits for, as register.tsx's compile would (synchronously, from the stand-in). */
function compileFake(documents: readonly TexDocument[]): void {
  for (const document of documents) if (!texBook.known(document)) texBook.remember(document, fakeTex(document))
}

/** A formula MathJax refused, as TeX drew it (register.tsx's texDrawn). */
function texDrawn(tex: string, display: boolean) {
  const document = mathJob(tex, display)
  const outcome = document ? texBook.known(document) : undefined
  return outcome?.ok ? texResult(outcome.picture) : undefined
}

/** A diagram's image (register.tsx's diagramImage), from the book. */
function diagramImage(source: string, kind: DiagramKind, env: PictureEnv, rows?: number): ImageInfo | { error: string } | null {
  const job = diagramJob(source, kind)
  if (!job) return null
  if ('refused' in job) return { error: job.refused }
  const outcome = texBook.known(job.document)
  if (!outcome || (!outcome.ok && !outcome.lasting)) return null
  if (!outcome.ok) return { error: outcome.error }
  try {
    return cached(`p\n${geometry(env)}\n${rows ?? ''}\n${job.document.text}`, () => renderPicture(outcome.picture, env, rows))
  } catch (error) {
    if (error instanceof TexError) return { error: error.message }
    throw error
  }
}

// ─── Streaming ───────────────────────────────────────────────────────────────

export interface Streamed {
  /** What the engine shows: every flush's displayContent, joined. */
  shown: string
  /** Records this reply wrote, in order (one per preview written), each where it was shown (`at`). */
  written: PreviewRecord[]
  /** The reply's block as register.tsx stores it (kittex.blocks): its records, each with `at`. */
  store: PreviewRecord[]
  flushes: number
  maxPushMs: number
}

export function streamReply(markdown: string, shape: Shape): Streamed {
  const env = envFor(shape)
  const math = mathOf(shape)
  const tex = shape.tex ? { block: math.block === 'image', inline: math.inline === 'image' } : undefined
  const streamEnv: StreamEnv = { ...streamEnvFor(env, math), ...(tex && (tex.block || tex.inline) ? { tex } : {}) }
  const stream = new MessageStream(createLineScanner({ diagrams: streamEnv.tex?.block === true }))
  const flushes = flushesOf(markdown, shape.flushSeed)
  // register.tsx: with both kinds raw kittex registers no hook, and every flush shows as written.
  if (math.block === 'raw' && math.inline === 'raw') return { shown: flushes.join(''), written: [], store: [], flushes: flushes.length, maxPushMs: 0 }
  let shown = ''
  let block: PreviewRecord[] = []
  let maxPushMs = 0
  for (const [index, delta] of flushes.entries()) {
    const final = index === flushes.length - 1
    // register.tsx: a message whose first flush is empty and final is not streamed.
    if (index === 0 && delta === '' && final) break
    let start = performance.now()
    let rewrite = stream.push(delta, final, streamEnv)
    // register.tsx's withTex: TeX answers what the flush waits for, then the stream resumes; the flush's text is all of it.
    let text = ''
    const records: PreviewRecord[] = []
    for (let round = 0; ; round++) {
      maxPushMs = Math.max(maxPushMs, performance.now() - start)
      text += rewrite.text
      records.push(...rewrite.records)
      if (!rewrite.pending?.length || round >= 64) break
      compileFake(rewrite.pending)
      start = performance.now()
      rewrite = stream.resume(streamEnv)
    }
    if (records.length > 0) block = remember(block, records, shown, text)
    shown += text
  }
  return { shown, written: block, store: block, flushes: flushes.length, maxPushMs }
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

/**
 * drawLanded's plan for a landed text, in a terminal of this shape: `block`,
 * the records of the block it streamed as (the one its row links), or none
 * for LaTeX as written (after --resume).
 */
export function land(text: string, block: readonly PreviewRecord[] | undefined, shape: Shape): Landed {
  const env = envFor(shape)
  const columns = shape.columns
  const math = mathOf(shape)
  // The four registrations' matchers (terminal): streamed previews, or LaTeX as written; none with both kinds raw.
  const registered = math.block !== 'raw' || math.inline !== 'raw'
  const hooked = registered && (STREAMED_PATTERN.test(text) || sourcePattern(math, shape.tex === true).test(text))
  if (!hooked) return { hooked, plan: null, pieces: [{ kind: 'prose', text, gap: false }], ms: 0 }
  const blockImages = env.images && math.block === 'image'
  const inlineImages = env.images && math.inline === 'image'
  const images = blockImages || inlineImages
  const records = images ? (block ?? []) : []
  const streamed = block !== undefined || STREAMED_PATTERN.test(text)
  const renderEnv = renderEnvFor(env, columns)
  const inlineEnv = inlineEnvFor(env, columns)
  const start = performance.now()
  const pictureEnv = pictureEnvFor(env, columns)
  const plan = planLanded(text, records, {
    ...(streamed ? { streamed: {} } : {}),
    mode: { hyperlinks: env.hyperlinks, emojiSequences: env.emojiSequences },
    columns,
    maxColumns: renderEnv.maxColumns,
    draw: blockImages ? (tex, rows, maxColumns) => displayImage(tex, maxColumns === undefined ? renderEnv : { ...renderEnv, maxColumns }, rows) : undefined,
    width: proseWidthFor(env, columns),
    measure: (tex, maxColumns) => displayRows(tex, { ...renderEnv, maxColumns }),
    ...(shape.tex && blockImages ? { diagram: (source: string, kind: DiagramKind, rows?: number) => diagramImage(source, kind, pictureEnv, rows) } : {}),
    math,
    inline: inlineImages ? { env: inlineEnv, width: proseWidthFor(env, columns), columns, draw: (tex, cells, place) => inlineImage(tex, inlineEnv, cells, place), hyperlinks: env.hyperlinks, emojiSequences: env.emojiSequences } : undefined,
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
  return { width: proseWidthFor(env, shape.columns), columns: shape.columns, mode: { hyperlinks: env.hyperlinks, emojiSequences: env.emojiSequences } }
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
export function runCase(markdown: string, shape: Shape, options: { partial?: boolean } = {}): CaseResult {
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
    streamed = streamReply(markdown, shape)
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
    resumed = land(markdown, undefined, shape)
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
  const slots = new Map<string, number[]>()
  for (const record of streamed.written) if (record.inline) slots.set(record.tex, [...(slots.get(record.tex) ?? []), record.columns ?? 0])
  const formulas = { inline: slots, overlays: new Set(streamed.written.filter(record => !record.inline && (record.quote !== undefined || record.indent !== undefined)).map(record => record.tex)) }
  const liveDrawing = landedDrawing(live.pieces, ctx, formulas)
  const resumedDrawing = landedDrawing(resumed.pieces, ctx, formulas)
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
      // (A quoted display formula is drawn the same way, as wide as the quote: only an inline record's slot counts.)
      const slots = streamed.store.filter(record => record.inline && record.tex === inline.tex).map(record => record.columns)
      const quoted = streamed.store.some(record => !record.inline && record.quote !== undefined && record.tex === inline.tex)
      if (!quoted && slots.length > 0 && inline.image.rows === 1 && !slots.includes(inline.image.columns)) {
        fail('imageShape', 'inline-columns', `inline image ${JSON.stringify(inline.tex)} is ${inline.image.columns} columns for a ${slots[0]}-column slot`)
      }
    }
  }

  // Nothing moves; each image over its preview.
  const aligned = compareDrawings(streamDrawing, liveDrawing, fail, 'moved')
  predictedOverPreview(liveDrawing, streamDrawing, streamed, fail, aligned, ctx.mode.emojiSequences === true)

  // Raw LaTeX left at landing.
  rawLatex(markdown, live, shape, fail)

  // Formulas (and diagrams) the reply never had (the landed text is scanned again).
  const own = new Set(scan(markdown, { diagrams: shape.tex === true }).flatMap(segment => (segment.kind === 'math' ? [segment.tex] : [])))
  const phantoms = liveDrawing.images.filter(image => !own.has(image.tex))
  if (phantoms.length > 0) fail('phantom', 'rescan', `drawn at landing, not in the reply: ${phantoms.slice(0, 3).map(image => JSON.stringify(image.tex)).join(', ')}`, { tex: phantoms[0]!.tex })

  // The preview is a pure function of the formula (and its context).
  const seen = new Map<string, string>()
  for (const record of streamed.written) {
    const key = `${record.inline ? 'i' : 'd'}\n${record.columns ?? ''}\n${record.rows}\n${record.quote ?? 0}\n${record.indent ?? ''}\n${record.tex}`
    const before = seen.get(key)
    if (before !== undefined && before.replace(/^[ \t>]+/gm, '') !== record.preview.replace(/^[ \t>]+/gm, '')) {
      fail('impure', 'preview', `${JSON.stringify(record.tex.slice(0, 50))} was previewed as ${JSON.stringify(before.slice(0, 60))} and as ${JSON.stringify(record.preview.slice(0, 60))}`)
    }
    seen.set(key, record.preview)
  }
  // Two formulas may stream the same preview (\tfrac12 and \frac12 are both `½`): records are found again by
  // where they were written, so each lands with its own image (FUZZ-7; the image checks above and the resumed
  // comparison see a swap).

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
function previewCells(preview: string, sequences: boolean): string[] {
  return cellsOf(preview.replace(/\\([`*_[|~#>])/g, '$1'), sequences)
}

/**
 * Each image over its preview: in the landed drawing's own text (the replay
 * of the padded pieces: `predicted`) and in the streamed drawing (the
 * engine's drawing of what streamed: `overPreview`), the cells under an
 * inline image are its preview's, and the rows under a display image are a
 * display preview's lines.
 */
function predictedOverPreview(landed: Drawing, streamed: Drawing, stream: Streamed, fail: Fail, aligned: number, sequences: boolean): void {
  const previewsOf = new Map<string, string[][]>()
  for (const record of stream.store) {
    if (!record.inline) continue
    const list = previewsOf.get(record.tex) ?? []
    list.push(previewCells(record.preview, sequences))
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
    if (image.kind !== 'inline' || image.unknown) continue
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
    if (image.kind === 'inline' || image.unknown || image.row + image.rows > aligned) continue
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
  // A note is dim in the reply column, or, in a list item or a quote, italic in its text as it streamed.
  const notes = live.pieces.filter(piece => piece.kind === 'note' || (piece.kind === 'prose' && piece.text.includes(`*${NOT_RENDERED}`))).length
  const segments = scan(markdown).filter(segment => segment.kind === 'math')
  let refused = 0
  const reported = new Set<string>()
  for (const segment of segments) {
    if (segment.kind !== 'math') continue
    // A kind its option leaves as written.
    if ((segment.display ? shape.block : shape.inline) === 'raw') continue
    let error: string | undefined
    try {
      measureDisplay(segment.tex, renderEnv)
    } catch (e) {
      if (!(e instanceof TexError)) throw e
      // Characters the font lacks: the Unicode preview stays where it has one; with none, the source and a note.
      error = e instanceof GlyphError && previewDisplay(segment.tex, { maxColumns: renderEnv.maxColumns }) !== null ? undefined : e.message
    }
    if (error !== undefined) {
      // One the local TeX drew needs no note.
      const document = shape.tex ? mathJob(segment.tex, segment.display) : undefined
      const drawn = document ? texBook.known(document)?.ok === true : false
      refused += segment.display && !drawn ? 1 : 0
      continue
    }
    const raw = segment.raw.trim()
    if (raw.length < 3 || reported.has(raw)) continue
    const asMath = segments.filter(other => other.kind === 'math' && other.raw.trim() === raw).length
    // The same source as math of a kind left raw (inline `$$…$$` and a display formula alike) stays.
    const keptRaw = segments.filter(other => other.kind === 'math' && other.raw.trim() === raw && (other.display ? shape.block : shape.inline) === 'raw').length
    if (count(landedText, raw) <= count(markdown, raw) - asMath + keptRaw) continue
    reported.add(raw)
    const why = segment.display ? 'display' : inlineText(segment.tex) === null ? 'inline-no-unicode' : 'inline'
    fail('rawLatex', why, `${segment.display ? 'display' : 'inline'} ${JSON.stringify(raw.slice(0, 70))} is left as written`)
  }
  if (live.hooked && live.plan && refused > 0 && notes === 0 && env.images && shape.block === 'image') {
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
    // The same cells, another formula: the live one is another formula's image (records map previews by content).
    const at = (key: string) => key.slice(0, key.indexOf(' ', key.indexOf(' ') + 1))
    const swapped = onlyLive.length > 0 && onlyLive.length === onlyResumed.length && onlyLive.every(key => onlyResumed.some(other => at(other) === at(key)))
    const cause = swapped ? 'images-swapped' : onlyLive.length > 0 && onlyResumed.length > 0 ? 'images-differ' : onlyLive.length > 0 ? `live-only-${kinds(onlyLive)}` : `resumed-only-${kinds(onlyResumed)}`
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

/** TeX's own error for a formula MathJax refused and TeX failed on for good (the note shows it, as the stream did). */
function texRefusal(tex: string, display: boolean): TexError | undefined {
  const document = mathJob(tex, display)
  const outcome = document ? texBook.known(document) : undefined
  return outcome && !outcome.ok && outcome.lasting ? new TexError(outcome.error) : undefined
}
