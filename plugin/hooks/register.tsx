// kittex's Claude Code mod: typesets the LaTeX math in Claude's replies, as TeX
// images where the terminal draws them (kitty, Ghostty) and as Unicode
// elsewhere. Every function that takes `$` lives here; the pure side (the
// rewrite of streamed text, the plan of a landed reply, the constants that
// encode guesses about the engine) is in math.ts.
//
// The flow (design notes, "Streaming"): classic.MessageDisplay rewrites the
// reply while it streams, display formulas becoming Unicode previews padded to
// the rows their images will take, and records each preview with its TeX; when
// the block lands, ui.render on AssistantMessage draws the prose through the
// engine and puts an Image where each preview was. Anything that fails falls
// back to what the engine would have drawn.

import { update } from 'claude-code'
import type { EngineInterface, MatchedHook, Register, RenderElement, Timer } from 'claude-code'

import {
  cellProbes,
  chooseInk,
  createLineScanner,
  claudeCustomThemePath,
  claudeThemeScheme,
  colorProbes,
  detectTerminal,
  drawsEmojiSequences,
  fontFileArgv,
  GHOSTTY_BUILTIN_FONT,
  imageInkBackground,
  imageInkCurve,
  matchesFamily,
  odArgv,
  parseFontFile,
  parseOd,
  readFontMetrics,
  measureDisplay,
  measureDisplayResult,
  previewDisplay,
  readTerminalColors,
  renderDisplay,
  renderDisplayResult,
  renderInline,
  renderInlineResult,
  renderPicture,
  TexError,
  strokeWeight,
  toBase64,
  BUILD_ID,
} from './core.js'
import type { ByteReader, CellSize, FontMetrics, InkPlace, InlineEnv, PictureEnv, RenderedImage, RenderEnv, TerminalColors, TerminalInfo, TexDocument } from './core.js'
import {
  BLOCK_LIMIT,
  blockMatches,
  BULLET,
  bulletFor,
  CELL_POLL_MS,
  cellOrFallback,
  COPY_LABEL,
  copiedFormula,
  DIAGRAM_INSTRUCTIONS,
  FALLBACK_COLUMNS,
  INK_PREFER,
  IMAGE_LIMIT,
  inlineEnvFor,
  mathEmPxFor,
  INSTRUCT_WITHOUT_IMAGES,
  inlineFlow,
  joinProse,
  LANDED_PATTERN,
  STREAMED_PATTERN,
  linkEnv,
  locatePreviews,
  MessageStream,
  MATH_INSTRUCTIONS,
  mathOptions,
  pictureEnvFor,
  planLanded,
  PROBE_TIMEOUT_MS,
  proseWidthFor,
  displayColumns,
  PENDING_ROWS,
  RECENT_BLOCKS,
  renderEnvFor,
  REPLY_INDENT,
  RESIZE_SETTLE_MS,
  SECTION_ID,
  sourcePattern,
  STREAM_LIMIT,
  streamEnvFor,
  withoutTextOverride,
} from './math.ts'
import { altText, fallbackLines, fitPictures, overBudget } from './budget.ts'
import { CACHE_READ_MS, cacheDir, cacheFacts, decodeEntry, encodeEntry, entryKey, entryPath, ENTRY_NAME, pruneList } from './cache.ts'
import { newestFirst } from './schedule.ts'
import type { InlineSlot, KittexEnv, LandedPlan, MathOptions, Piece, PlanOptions, PreviewRecord, StreamedBlock, StreamEnv, StreamRewrite, TexUse } from './math.ts'
import { diagramJob, hiddenDirs, mathJob, prepareFormat, probeTex, rememberedTex, TEX_BACKGROUND_MS, TEX_STREAM_BUDGET_MS, texBook, texCacheDir, texResult } from './tex.ts'
import type { DiagramKind, TexHost } from './tex.ts'
import { DOCTOR_DESCRIPTION, DOCTOR_PROBE_MS, formatDoctor, osFacts, plain, probeCache, probeDiagrams } from './doctor.ts'
import type { DoctorFacts, DoctorHost, TerminalFacts } from './doctor.ts'

type $ = EngineInterface

const ENV = { plugin: 'kittex', key: 'env' } as const
const BLOCKS = { plugin: 'kittex', key: 'blocks' } as const
const REQUESTS = { plugin: 'kittex', key: 'requests' } as const
const RECENT = { plugin: 'kittex', key: 'recent' } as const
/** How long a render waits for session.start's kittex.env before it draws without kittex. */
const ENV_WAIT_MS = 1500

// Module state that drawing never reads (a hot reload resets it, and
// session.start runs again then).

/** A message streaming through MessageDisplay (one text block), as kittex follows it. */
interface Streaming {
  /** Its stream; null once kittex gave up on it (the rest passes as written). */
  stream: MessageStream | null
  /** The model's text so far, every delta as it came: what the block's transcript row holds. */
  source: string
  /** How much of it the engine shows (every flush's text joined): where the next flush's previews start. */
  shown: number
  /** Its block is in kittex.blocks. */
  stored: boolean
  /** A row's uuid links it (kittex.requests). */
  linked: boolean
  /** Its final flush came. */
  done: boolean
}

/** Per message, a gate per flush index that opens once that flush's rewrite is done (see the MessageDisplay hook). */
const flushGates = new Map<string, Map<number, { promise: Promise<void>; resolve: () => void }>>()

/** The gate of a message's flush `index` (open at once below 0: there is no flush before the first). */
function flushGate(id: string, index: number): { promise: Promise<void>; resolve: () => void } {
  if (index < 0) return { promise: Promise.resolve(), resolve: () => undefined }
  let gates = flushGates.get(id)
  if (!gates) {
    gates = new Map()
    flushGates.set(id, gates)
    for (const key of flushGates.keys()) if (flushGates.size > STREAM_LIMIT) flushGates.delete(key)
  }
  let gate = gates.get(index)
  if (!gate) {
    let resolve!: () => void
    const promise = new Promise<void>(r => (resolve = r))
    gate = { promise, resolve }
    gates.set(index, gate)
    // Only the last few are ever waited on.
    gates.delete(index - 8)
  }
  return gate
}

/** Messages streaming through MessageDisplay, and the last ones that did (their rows may be appended after their final flush). */
const streams = new Map<string, Streaming>()
/** The message_ids of the blocks stored, oldest first: past BLOCK_LIMIT the oldest is dropped. */
const storedBlocks: string[] = []
/** Response rows appended before any flush of their block (a one-line reply): linked once its stream shows up. */
const pendingRows: { uuid: string; text: string }[] = []
/** Claude Code's environment as the terminal helpers read it. */
let processEnv: Record<string, string | undefined> = {}
let terminal: TerminalInfo | undefined
let terminalColors: TerminalColors | undefined
/** The light/dark scheme terminalColors were read for (kitty's auto themes, Ghostty's pairs follow it). */
let colorScheme: 'dark' | 'light' | undefined
let theme: string | undefined
/** A custom theme's file contents, when `theme` is `custom:<slug>`. */
let customTheme: string | undefined
/** prompt.compose's section did not reach the prompt: instructions ride prompt.submit's context. */
let instructByContext = false
/** The next prompt carries the instructions (first of a conversation, after /clear or compaction). */
let contextPending = false
/** The cell probes, bound to the `$` session.start received. */
let cells: Cells | undefined
/** Runs a function on session.start's clock once the current dispatch resolves, or `ms` later (a hook's `$` belongs to its one dispatch). */
let later: ((fn: () => void, ms?: number) => void) | undefined
/** Writes a file with session.start's `$`: the cache's entries a render could not write itself. */
let writeFile: ((path: string, text: string) => Promise<void>) | undefined
/** Where the cache's entries go (cache.ts), from XDG_CACHE_HOME or HOME; undefined without either. */
let cacheFolder: string | undefined
/**
 * Settles once session.start has stored kittex.env (or given up). After
 * --resume the engine asks for the transcript's drawings before it raises
 * session.start: a render that comes first waits for it.
 */
let envSettled: (() => void) | undefined
/** session.start has run setUp this process (kittex.env is then the truth, null included). */
let envKnown = false
let envReady: Promise<void> = new Promise(resolve => {
  envSettled = resolve
})
/** kittex.env as the last session stored it, for renders before session.start (read once). */
let rememberedEnv: Promise<KittexEnv | undefined> | undefined
const REMEMBERED = 'env'
/** The `cache` option: drawings of resumed blocks kept on disk (cache.ts). */
let cacheOn = true
/** session.start's dispatches in this process (a hot reload makes a second). */
let sessions = 0
/** The local TeX may draw here (the `latex` option on, block math not Unicode): an earlier session's TeX cache is read. */
let texAllowed = false
/** Where the setup TeX was found with is remembered for the next session ($.store): its cache's key. */
const REMEMBERED_TEX = 'tex'
/** `darwin`, `linux`... from `uname -s`, when it ran. */
let platform: string | undefined
/** The probe for the local TeX (the `latex` option), started after session.start; settles once texBook knows. */
let texProbe: Promise<void> | undefined
/** Redraws the landed blocks once a compile they asked for ends (session.start's `$`). */
let redraw: (() => void) | undefined

export const register: Register = (on, options) => {
  /** The `block` and `inline` options: how each kind of math is shown (image, unicode or raw). */
  const math = mathOptions(options)
  // Both left as Claude wrote them: kittex does nothing (no rewrite, no instructions to the model) but its doctor.
  const off = math.block === 'raw' && math.inline === 'raw'
  cacheOn = options.cache !== false
  /** The `latex` option: `auto` draws diagrams and the math MathJax refuses with the local LaTeX where it is found; `off` never runs it. */
  const latex = options.latex === 'off' ? 'off' : 'auto'
  texAllowed = !off && latex === 'auto' && math.block !== 'unicode'

  // /kittex-doctor (doctor.ts), whatever the options.
  on('command.run', { command: 'kittex-doctor' }, $ => runDoctor($, options))

  // ─── Setup ─────────────────────────────────────────────────────────────────

  on('session.start', async ($, e, next) => {
    const started = await startDoctor($, e.surface, await next(e))
    if (off) return started
    if (e.surface !== 'terminal') {
      // A -p run or the SDK (Claude Code for VS Code, the desktop app): no
      // terminal draws here, and MessageDisplay's rewrite would become the
      // reply's text in the SDK's output. Nothing is probed or rewritten.
      cells?.stop()
      cells = undefined
      await $.state.set(ENV, null).catch(() => undefined)
      envKnown = true
      envSettled?.()
      return started
    }
    cells?.stop()
    cells = cellsFor($)
    later = laterFor($)
    writeFile = (path, text) => $.fs.write(path, text)
    sessions += 1
    let settled = false
    void envReady.then(() => (settled = true))
    await Promise.resolve()
    if (settled) {
      // A second session in this process (a hot reload): its own wait.
      envReady = new Promise(resolve => {
        envSettled = resolve
      })
    }
    try {
      await setUp($, e.surface)
    } catch {
      await $.state.set(ENV, null).catch(() => undefined)
    } finally {
      envKnown = true
      envSettled?.()
    }
    if (cacheOn) soon(() => void pruneCache($).catch(() => undefined))
    if (unwritten.size > 0) soon(flushEntries)
    // The local TeX, found after setup without holding it up (process.run: the terminal only).
    // The first session keeps what renders before it read from TeX's cache (a resume's diagrams).
    if (sessions > 1) texBook.reset()
    texProbe = undefined
    if (latex === 'auto' && math.block !== 'unicode') {
      redraw = () => $.ui.invalidate('ui.render')
      // Not awaited: a few short commands (each with its time limit) that settle meanwhile.
      texProbe = setUpTex($)
    }
    return started
  })
  if (off) return

  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const result = await next(e)
    if (result.deny === undefined && typeof result.value === 'string') await refreshInk($, result.value).catch(() => undefined)
    return result
  }).catch(($, e, next) => next(e))

  // Prose wraps at maxProseWidth: inline images are placed by it.
  on('config.set', { key: 'maxProseWidth' }, async ($, e, next) => {
    const result = await next(e)
    if (result.deny === undefined) await refreshProseWidth($).catch(() => undefined)
    return result
  }).catch(($, e, next) => next(e))

  // ─── Instructions to the model ─────────────────────────────────────────────

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    try {
      const env = await readEnv($)
      if (!e.surfaces.includes('terminal') || !instructs(env)) return composed
      if (composed.sections.some(section => section.id === SECTION_ID)) return composed
      return { sections: [...composed.sections, { id: SECTION_ID, text: await instructions(env, math), scope: 'session' as const }] }
    } catch {
      return composed
    }
  })

  on('prompt.submit', async ($, e, next) => {
    if (!instructByContext || !contextPending) return next(e)
    contextPending = false
    const entered = await next({ ...e, context: [...(e.context ?? []), await instructions(await readEnv($), math)] })
    if (entered.drop !== undefined) contextPending = true
    return entered
  }).catch(($, e, next) => next(e))

  // A new conversation in the same process: /clear, and a compaction (which
  // drops the turn that carried the instructions). The hooks only observe: a
  // failure (here and at the other gating sites) lets the event go on as is.
  on('session.end', ($, e, next) => {
    if (e.reason === 'clear') contextPending = instructByContext
    return next(e)
  })

  on('classic.SessionStart', async ($, e, next) => {
    const result = await next(e)
    if (e.source === 'clear' || e.source === 'compact') contextPending = instructByContext
    return result
  }).catch(($, e, next) => next(e))

  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined && e.trigger !== 'precompute' && result.skip === undefined) contextPending = instructByContext
    return result
  }).catch(($, e, next) => next(e))

  // ─── Streaming ─────────────────────────────────────────────────────────────

  on('classic.MessageDisplay', async ($, e, next) => {
    // The engine dispatches a message's flushes without waiting for the hook on the one before (measured live:
    // while a flush waited for TeX, the next two ran first). A stream reads them in order: each waits for the
    // flush before it (its index - 1) to be done, then is done itself however it ends.
    const done = flushGate(e.message_id, e.index)
    try {
      const below = await next(e)
      await flushGate(e.message_id, e.index - 1).promise
      return await rewriteFlush($, e, below, math)
    } finally {
      done.resolve()
      if (e.final) flushGates.delete(e.message_id)
    }
  }).catch(($, e, next) => next(e))


  // A landed block is told from the others by its transcript row: the row a
  // text block is appended as holds the model's text, which the block's
  // stream started (MessageDisplay's message_id and AssistantMessage's
  // requestId, the row's uuid, are unrelated ids). The link is what a landed
  // block's drawing reads its previews by (fuzz FUZZ-7, FUZZ-14).
  on('session.append', { door: 'response' }, async ($, e, next) => {
    try {
      const text = e.message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('')
      if (text.trim() !== '') {
        const id = streamOf(text)
        if (id !== undefined) {
          await linkRow($, e.uuid, id)
        } else {
          pendingRows.push({ uuid: e.uuid, text })
          pendingRows.splice(0, Math.max(0, pendingRows.length - PENDING_ROWS))
        }
      }
    } catch {
      // drawn by its text
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // ─── Landed replies ────────────────────────────────────────────────────────

  // Registered with matchers on the text, so a block that holds no math and
  // no kittex preview is drawn by the engine alone (no round trip here).
  //
  // The engine draws a hooked block as nothing until the hook's answer
  // arrives (a hop to the worker and back, 15 to 50 ms), unless the block was
  // drawn unhooked before: then its own drawing stays up meanwhile. So in the
  // fullscreen layout a block kittex streamed is hooked only once its
  // `onScreen` is reported, which it never is on a block's first render: the
  // engine draws that one itself, and its drawing of a streamed text is the
  // streaming preview row for row, so the landing shows no blank, only the
  // images arriving over their previews. A block holding a preview mark is a
  // streamed one whatever else it holds (a reply's `$100` stays as written in
  // it). LaTeX as written (after --resume) is hooked from the first render (its
  // own drawing would show the source), as is every block on the main screen,
  // which reports no `onScreen`. The four matchers never select the same
  // render, so kittex runs once per render.
  const landed = { component: 'AssistantMessage' } as const
  on('ui.render', { ...landed, surface: 'terminal', viewport: { isFullscreen: true }, props: { text: STREAMED_PATTERN, onScreen: [{}, null] } }, ($, e, next) => drawLanded($, e, next, math))
  on('ui.render', { ...landed, surface: 'terminal', viewport: { isFullscreen: false }, props: { text: STREAMED_PATTERN } }, ($, e, next) => drawLanded($, e, next, math))
  on('ui.render', { ...landed, surface: 'terminal', props: { text: sourcePattern(math, latex === 'auto') } }, ($, e, next) => drawLanded($, e, next, math))
  on('ui.render', { ...landed, surface: ['desktop', 'mobile', 'vscode'], props: { text: LANDED_PATTERN } }, ($, e, next) => drawLanded($, e, next, math))
}

/** One flush's rewrite (the MessageDisplay hook's work, its flushes taken in order). */
async function rewriteFlush<B extends { displayContent?: string }>($: $, e: { message_id: string; delta: string; final: boolean }, below: B, math: MathOptions): Promise<B> {
  const delta = below.displayContent ?? e.delta
  let entry: Streaming | undefined
  let before = 0
  try {
    const env = await readEnv($)
    if (!env) return below
    entry = streams.get(e.message_id)
    if (entry?.done) entry = undefined
    if (entry?.stream === null) {
      entry.source += e.delta
      entry.shown += delta.length
      if (e.final) entry.done = true
      return below
    }
    const streamEnv: StreamEnv = { ...streamEnvFor(env, math), ...texUse(env, math) }
    if (!entry) {
      if (delta === '' && e.final) return below
      // Diagrams are held for TeX where it draws them (a block streaming when TeX is found keeps its code).
      entry = { stream: new MessageStream(createLineScanner({ diagrams: streamEnv.tex?.block === true })), source: '', shown: 0, stored: false, linked: false, done: false }
      streams.delete(e.message_id)
      streams.set(e.message_id, entry)
      for (const id of streams.keys()) if (streams.size > STREAM_LIMIT) streams.delete(id)
    }
    before = entry.shown
    entry.source += e.delta
    const rewrite = await withTex(entry.stream!, entry.stream!.push(delta, e.final, streamEnv), streamEnv)
    // Each preview where the engine will show it: a landed block maps its previews back by place, not by content.
    const records = locatePreviews(rewrite.text, rewrite.records, before)
    entry.shown = before + rewrite.text.length
    if (e.final) entry.done = true
    if (records.length > 0 || (!entry.stored && rewrite.text !== delta)) await storeBlock($, e.message_id, entry, records)
    if (!entry.linked) await linkPending($, e.message_id, entry)
    if (records.length > 0 && env.images) drawSoon(records, env)
    return rewrite.text === delta ? below : { ...below, displayContent: rewrite.text }
  } catch {
    // Show whatever was held back, as written, and leave the rest of the message alone.
    const unshown = entry?.stream?.unshown() ?? delta
    if (entry) {
      entry.stream = null
      entry.shown = before + unshown.length
      if (e.final) entry.done = true
      // From here on the text is the model's as written: the landing may read its LaTeX.
      await storeBlock($, e.message_id, entry, [], before).catch(() => undefined)
    }
    return unshown === delta ? below : { ...below, displayContent: unshown }
  }
}

/**
 * Draws a landed block (see the AssistantMessage registrations): its prose
 * through the engine, an Image where each preview was; anything that fails
 * falls back to the engine's drawing. `math`: the options (a kind set to
 * `unicode` gets no image, one set to `raw` is left as written).
 */
async function drawLanded<E extends LandedEvent>($: $, e: E, next: (e: E) => Promise<RenderElement>, math: MathOptions): Promise<RenderElement> {
  if (e.props.isSummary) return next(e)
  try {
    let env = await readEnv($)
    if (!env) {
      // A resumed session asks for its blocks before session.start has
      // measured the terminal: draw with what the last session measured in
      // this terminal, else wait for session.start, rather than draw nothing
      // of kittex's now and everything later (which moves rows twice).
      env = (envKnown ? undefined : await (rememberedEnv ??= readRemembered($))) ?? (envKnown ? null : (await within(envReady, ENV_WAIT_MS, clockOf($)), await readEnv($)))
      if (!env) return next(e)
    }
    const seen = e.surface === 'terminal' ? e.viewport?.columns : undefined
    if (seen !== undefined && seen !== env.columns) {
      // The window changed width since the cells were measured, and a font
      // zoom changes the cells too: measure before drawing, so no image goes
      // out for cells that are gone, and once more when the resize settles.
      // A render may not write state, so the settle timer stores what it finds.
      const cell = await cells?.probe()
      if (cell) env = { ...env, ...cellEnv(cell, env), columns: seen }
      cells?.settle(seen)
    }
    const columns = e.viewport?.columns ?? env.columns
    const terminalImages = e.surface === 'terminal' && env.images
    const blockImages = terminalImages && math.block === 'image'
    const inlineImages = terminalImages && math.inline === 'image'
    const images = blockImages || inlineImages
    // The text may lack the block's last flush (or be empty) on the first
    // render: nothing here is final, and the render runs again when it lands
    // (and when its block's previews or its row's link are stored: read here).
    const found = e.surface === 'terminal' ? await landedBlock($, e) : { streamed: false }
    const streamed = found.streamed || STREAMED_PATTERN.test(e.props.text)
    const records = images ? (found.block?.records ?? []) : []
    const renderEnv = renderEnvFor(env, columns)
    const inlineEnv = inlineEnvFor(env, columns)
    const planOptions: PlanOptions = {
      ...(streamed ? { streamed: found.block?.raw === undefined ? {} : { raw: found.block.raw } } : {}),
      mode: { hyperlinks: env.hyperlinks, emojiSequences: env.emojiSequences },
      columns,
      maxColumns: renderEnv.maxColumns,
      draw: blockImages ? (tex, rows, maxColumns) => displayImage(tex, maxColumns === undefined ? renderEnv : { ...renderEnv, maxColumns }, rows) : undefined,
      width: proseWidthFor(env, columns),
      measure: (tex, maxColumns) => displayRows(tex, { ...renderEnv, maxColumns }),
      math,
      inline:
        inlineImages
          ? { env: inlineEnv, width: proseWidthFor(env, columns), columns, draw: (tex, cells, place) => inlineImage(tex, inlineEnv, cells, place), hyperlinks: env.hyperlinks, emojiSequences: env.emojiSequences }
          : undefined,
    }
    // Diagrams where the local TeX draws (its pictures as wide as the prose).
    const texOn = e.surface === 'terminal' && texUse(env, math).tex?.block === true
    if (texOn) {
      const pictureEnv = pictureEnvFor(env, columns)
      planOptions.diagram = (source, kind, rows) => diagramImage(source, kind, pictureEnv, rows)
    }
    // A block read back as LaTeX (a resumed session) may be on disk already
    // (cache.ts); one off screen in the fullscreen layout (`onScreen` null:
    // the engine lays out blocks around the view) gets its rows only, its
    // images once it is on screen; every other is typeset in its turn, the
    // newest first (schedule.ts).
    const resumed = e.surface === 'terminal' && images && !streamed && records.length === 0
    const key = resumed && cacheOn && cacheFolder ? entryKey(e.props.text, cacheFacts(env, columns, math, `${BUILD_ID}|tex:${texOn}`)) : undefined
    let plan: LandedPlan | undefined = key ? await readEntry($, key) : undefined
    if (!plan) {
      const offScreen = resumed && e.viewport?.isFullscreen === true && (e.props as { onScreen?: unknown }).onScreen === null
      const options = offScreen ? reservedOptions(planOptions, renderEnv) : planOptions
      let asked: ReturnType<typeof texBook.takeAsked> = []
      const release = await turns.take(() => $.state.get(ENV))
      try {
        texBook.takeAsked()
        plan = planLanded(e.props.text, records, options)
        asked = texBook.takeAsked()
      } finally {
        release()
      }
      // What TeX drew in an earlier session is on disk: read, then planned again (no jump after --resume); the rest is compiled, then redrawn.
      // Read with this render's own $ (a resume's first renders come before TeX is probed); a missing file asked first, so no failed read is logged.
      const read = async (path: string) => ((await $.fs.exists(path).catch(() => false)) ? $.fs.read(path).then(text => (typeof text === 'string' ? text : undefined), () => undefined) : undefined)
      if (asked.length > 0 && (await loadAsked(asked, read))) {
        plan = planLanded(e.props.text, records, options)
        asked = [...asked, ...texBook.takeAsked()]
      }
      compileAsked(asked)
      // Kept only once final: no TeX document it waits for.
      const final = asked.every(document => {
        const known = texBook.known(document)
        return known !== undefined && (known.ok || known.lasting)
      })
      if (key && !offScreen && final) keepEntry(key, plan, (path, text) => $.fs.write(path, text))
    }
    if (!plan.changed) return next(e)
    if (e.surface !== 'terminal' || plan.pieces.every(piece => piece.kind === 'prose' && !piece.inline?.length)) {
      return next({ ...e, props: { ...e.props, text: joinProse(plan.pieces) } })
    }
    // Drawn as the engine drew the preview, row for row (measured live): the
    // first prose piece is the engine's own drawing with the block's bullet;
    // later pieces are drawn without a bullet (each brings a one-row top
    // margin) and indented to the reply column; images and notes sit in that
    // column, a blank row above them where a blank line was. A block that
    // opens with a formula gets the bullet beside the image's first row,
    // where the preview's first line had it.
    // One answer holds at most 2 MiB of Image source: past it, the rest keep their Unicode (budget.ts).
    // Pictures drawn at fewer pixels first (same cells), so they fit rather than stay placeholders.
    const pieces = fitPictures(plan.pieces, (image, density) => pictureRedraws.get(image)?.(density))
    const over = overBudget(pieces)
    /** An image not drawn: past the budget, or only its rows reserved (off screen). */
    const left = { has: (image: RenderedImage) => image.png.length === 0 || over.has(image) }
    if (images) cells?.poll()
    const { Box, Button, Image, Text } = $.ui.resolve(e as Extract<LandedEvent, { surface: 'terminal' }>)
    const indentOf = (isFirstOfReply: boolean) => (isFirstOfReply ? REPLY_INDENT : 0)
    const first = e.props.isFirstOfReply
    const indent = first ? REPLY_INDENT : 0
    // A selection over an image copies the terminal's placeholder cells, not the
    // formula (the engine copies screen cells and offers no hook), so each image
    // carries a copy button, shown while the pointer is over it (fullscreen), in
    // its top-right corner: absolute, so it moves no row.
    const copy = (tex: string, source?: string) => async () => {
      const copied = await $.ui.copy({ text: source ?? copiedFormula(tex), surface: e.surface })
      $.ui.toast(copied.isCopied ? (source === undefined ? 'Copied the formula as LaTeX' : 'Copied the LaTeX source') : 'Could not copy the formula')
    }
    const own = (piece: Exclude<Piece, { kind: 'prose' }>, i: number) =>
      piece.kind === 'image' && left.has(piece.image) ? (
        <Box key={`kittex-formula-${i}-text`} width={piece.image.columns} height={piece.image.rows} flexDirection="column">
          <Text>{fallbackLines(previewDisplay(piece.tex, { maxColumns: piece.image.columns }, piece.image.rows), piece.tex, piece.image.columns, piece.image.rows).join('\n')}</Text>
        </Box>
      ) : piece.kind === 'image' ? (
        <Box key={`kittex-formula-${i}-${signatureOf(piece.image.png)}`}>
          <Image source={{ png: base64Of(piece.image.png) }} columns={piece.image.columns} rows={piece.image.rows} alt={altText(piece.tex)} />
          <Box position="absolute" top={0} right={0} display="none" hover={{ display: 'flex' }}>
            <Button key={`kittex-copy-${i}`} label={COPY_LABEL} plain dimColor onPress={copy(piece.tex, piece.copy)} />
          </Box>
        </Box>
      ) : (
        <Text dimColor>{piece.text}</Text>
      )
    // A prose piece is the engine's own drawing; the images of its formulas
    // lie over their previews, each at the cell its preview starts in: a row
    // under the piece's top margin, the column after the bullet's where the
    // piece draws one (a display formula's over its preview's rows, with its
    // copy button). Not absolute: the engine puts an absolute box that falls
    // above the screen on its first row (fullscreen, a reply scrolled past
    // the top), so the images go in the flow of an overlay column, as wide as
    // nothing and as tall as the piece, beside the drawing in a row-reverse
    // Box: it starts at the piece's top-left cell, is painted after the
    // drawing, and takes no room (nothing moves). The drawing's wrapper grows
    // to the width instead of naming one: the engine refuses its own drawing
    // under a Box with a size, a position or an overflow.
    const prose = async (piece: Extract<Piece, { kind: 'prose' }>, isFirstOfReply: boolean) => {
      const text = await next({ ...e, props: { ...e.props, text: piece.text, isFirstOfReply } })
      const inline = piece.inline?.filter(one => !left.has(one.image))
      if (!inline?.length) return text
      return (
        <Box flexDirection="row-reverse">
          <Box flexDirection="column" flexGrow={1} flexShrink={1}>
            {text}
          </Box>
          <Box flexDirection="column" width={0} flexShrink={0} alignItems="flex-start">
            {inlineFlow(inline, indentOf(isFirstOfReply)).map(({ inline, marginTop, marginLeft }: InlineSlot, k: number) => (
              <Box
                key={`kittex-${inline.display ? 'formula' : 'inline'}-${k}-${signatureOf(inline.image.png)}`}
                marginTop={marginTop}
                marginLeft={marginLeft}
                width={inline.image.columns}
                height={inline.image.rows}
                flexShrink={0}
              >
                <Image source={{ png: base64Of(inline.image.png) }} columns={inline.image.columns} rows={inline.image.rows} alt={altText(inline.tex)} />
                {inline.display ? (
                  <Box position="absolute" top={0} right={0} display="none" hover={{ display: 'flex' }}>
                    <Button key={`kittex-copy-${k}`} label={COPY_LABEL} plain dimColor onPress={copy(inline.tex, inline.copy)} />
                  </Box>
                ) : null}
              </Box>
            ))}
          </Box>
        </Box>
      )
    }
    // The prose pieces are drawn by the engine at once: each is a round trip, and a block may hold several.
    const texts = await Promise.all(pieces.map((piece, i) => (piece.kind === 'prose' ? prose(piece, i === 0 ? first : false) : null)))
    const drawn = []
    for (const [i, piece] of pieces.entries()) {
      if (i === 0) {
        if (piece.kind === 'prose') {
          drawn.push(texts[i])
        } else {
          drawn.push(
            <Box flexDirection="row" marginTop={1}>
              {first ? (
                <Box minWidth={REPLY_INDENT}>
                  <Text color="text">{env.bullet ?? BULLET.other}</Text>
                </Box>
              ) : null}
              {own(piece, i)}
            </Box>,
          )
        }
      } else if (piece.kind === 'prose') {
        drawn.push(
          <Box paddingLeft={indent} marginTop={piece.gap ? 0 : -1}>
            {texts[i]}
          </Box>,
        )
      } else if (piece.kind === 'image') {
        drawn.push(
          <Box marginLeft={indent} marginTop={piece.gap ? 1 : 0}>
            {own(piece, i)}
          </Box>,
        )
      } else {
        drawn.push(
          <Box paddingLeft={indent} marginTop={piece.gap ? 1 : 0}>
            {own(piece, i)}
          </Box>,
        )
      }
    }
    return <Box flexDirection="column">{drawn}</Box>
  } catch {
    return next(e)
  }
}

/** A render of a landed block, as any of the AssistantMessage registrations receives it. */
type LandedEvent = Parameters<MatchedHook<'ui.render', { component: 'AssistantMessage' }>>[1]

// ─── Helpers that take $ ─────────────────────────────────────────────────────

async function readEnv($: $): Promise<KittexEnv | null> {
  return (await $.state.get(ENV)).value ?? null
}

/** Whether the model is told to write LaTeX: kittex is set up and draws math on this terminal. */
function instructs(env: KittexEnv | null): boolean {
  return env !== null && (env.images || INSTRUCT_WITHOUT_IMAGES)
}

async function setUp($: $, surface: string | null): Promise<void> {
  // MathJax is not loaded here: the first formula loads it (core's typeset is lazy).
  processEnv = await readProcessEnv($)
  cacheFolder = cacheDir(processEnv)
  terminal = detectTerminal(processEnv)
  const [cell, uname] = await Promise.all([probeCell($), probeSystem($), resolveTheme($)])
  platform = uname?.trim().toLowerCase() || undefined
  const cellAdjust = terminalColors?.cellAdjust
  const kittyAdjust = terminalColors?.kittyAdjust
  const env: KittexEnv = {
    kind: terminal.kind,
    images: terminal.images,
    ...cellEnv(cell, { kind: terminal.kind, cellAdjust, kittyAdjust }),
    ...(cellAdjust ? { cellAdjust } : {}),
    ...(kittyAdjust ? { kittyAdjust } : {}),
    columns: cell?.columns ?? FALLBACK_COLUMNS,
    ink: inkNow(),
    ...inkOverNow(),
    ...backgroundNow(),
    bullet: bulletFor(uname, processEnv.HOME),
    maxProseWidth: await readProseWidth($),
    ...linkEnv(processEnv),
    emojiSequences: drawsEmojiSequences(terminal, terminalColors),
    // Strokes as heavy as the terminal's text, when its font's weight is known.
    ...(terminalColors?.fontWeight ? { weight: strokeWeight(terminalColors.fontWeight) } : {}),
  }
  // The text font's metrics as the last session read them in this terminal, at
  // these cells: the first drawing has the size it keeps (loadFont reads them
  // again and changes nothing when they match), as the renders before
  // session.start had it from the remembered env.
  const remembered = (await $.store.get(REMEMBERED).catch(() => undefined)) as { id?: unknown; env?: KittexEnv } | undefined
  const known = remembered?.id === terminalId(processEnv) && remembered.env?.font && remembered.env.cellWidth === env.cellWidth && remembered.env.cellHeight === env.cellHeight ? remembered.env : undefined
  const withFont = known ? { ...env, font: known.font, ...(env.weight === undefined && known.weight !== undefined ? { weight: known.weight } : {}) } : env
  const start: KittexEnv = known ? { ...withFont, emPx: mathEmPxFor(withFont, withFont) } : env
  await $.state.set(ENV, start)
  envSettled?.()
  // For the next session's first renders, which come before its session.start.
  await $.store.set(REMEMBERED, { id: terminalId(processEnv), env: start }).catch(() => undefined)
  // The text font's metrics, read from its file after setup (the first drawing doesn't wait for them).
  if (env.images) later?.(() => void loadFont($).catch(() => undefined))

  // Self-check: a policy plugin (cc-plugin-sec-default on Team/Enterprise or
  // managed machines) may skip installed plugins' prompt.compose hooks; then
  // the instructions ride the first prompt's context instead.
  const wanted = surface === 'terminal' && instructs(env)
  let present = false
  if (wanted) {
    try {
      const composed = await $.prompt.compose({ surfaces: ['terminal'] })
      present = composed.sections.some(section => section.id === SECTION_ID)
    } catch {
      present = false
    }
  }
  instructByContext = wanted && !present
  contextPending = instructByContext
}

/**
 * The variables the terminal helpers read (detection, the colour probes'
 * binaries, the config files' locations, Claude's config dir); names must be
 * literals.
 */
async function readProcessEnv($: $): Promise<Record<string, string | undefined>> {
  const values = await Promise.all([
    $.env.get('TERM'),
    $.env.get('TERM_PROGRAM'),
    $.env.get('TERM_PROGRAM_VERSION'),
    $.env.get('LC_TERMINAL'),
    $.env.get('KITTY_WINDOW_ID'),
    $.env.get('KITTY_PID'),
    $.env.get('KITTY_INSTALLATION_DIR'),
    $.env.get('KITTY_CONFIG_DIRECTORY'),
    $.env.get('GHOSTTY_RESOURCES_DIR'),
    $.env.get('GHOSTTY_BIN_DIR'),
    $.env.get('WEZTERM_PANE'),
    $.env.get('WEZTERM_EXECUTABLE'),
    $.env.get('ITERM_SESSION_ID'),
    $.env.get('TMUX'),
    $.env.get('STY'),
    $.env.get('ZELLIJ'),
    $.env.get('ZELLIJ_SESSION_NAME'),
    $.env.get('SSH_CONNECTION'),
    $.env.get('SSH_CLIENT'),
    $.env.get('SSH_TTY'),
    $.env.get('CLAUDE_CODE_FORCE_TERMINAL_IMAGES'),
    $.env.get('CLAUDE_CODE_SESSION_KIND'),
    $.env.get('CLAUDE_CONFIG_DIR'),
    $.env.get('HOME'),
    $.env.get('XDG_CONFIG_HOME'),
    $.env.get('XDG_CONFIG_DIRS'),
    $.env.get('XDG_CACHE_HOME'),
    $.env.get('FORCE_HYPERLINK'),
    $.env.get('TERMINAL_EMULATOR'),
    $.env.get('WT_SESSION'),
    $.env.get('VTE_VERSION'),
    $.env.get('CI'),
    $.env.get('TEAMCITY_VERSION'),
    $.env.get('NETLIFY'),
  ])
  const names = [
    'TERM',
    'TERM_PROGRAM',
    'TERM_PROGRAM_VERSION',
    'LC_TERMINAL',
    'KITTY_WINDOW_ID',
    'KITTY_PID',
    'KITTY_INSTALLATION_DIR',
    'KITTY_CONFIG_DIRECTORY',
    'GHOSTTY_RESOURCES_DIR',
    'GHOSTTY_BIN_DIR',
    'WEZTERM_PANE',
    'WEZTERM_EXECUTABLE',
    'ITERM_SESSION_ID',
    'TMUX',
    'STY',
    'ZELLIJ',
    'ZELLIJ_SESSION_NAME',
    'SSH_CONNECTION',
    'SSH_CLIENT',
    'SSH_TTY',
    'CLAUDE_CODE_FORCE_TERMINAL_IMAGES',
    'CLAUDE_CODE_SESSION_KIND',
    'CLAUDE_CONFIG_DIR',
    'HOME',
    'XDG_CONFIG_HOME',
    'XDG_CONFIG_DIRS',
    'XDG_CACHE_HOME',
    'FORCE_HYPERLINK',
    'TERMINAL_EMULATOR',
    'WT_SESSION',
    'VTE_VERSION',
    'CI',
    'TEAMCITY_VERSION',
    'NETLIFY',
  ]
  return Object.fromEntries(names.map((name, i) => [name, values[i]]))
}

/** `uname -s` (the engine's bullet differs on macOS), or undefined when it can't run. */
async function probeSystem($: $): Promise<string | undefined> {
  try {
    const { exitCode, stdout } = await $.process.run(['uname', '-s'], { timeoutMs: PROBE_TIMEOUT_MS })
    return exitCode === 0 ? stdout : undefined
  } catch {
    return undefined
  }
}

/** The cell size from the first cell probe that answers (perl, then python3). */
async function probeCell($: $): Promise<CellSize | undefined> {
  for (const probe of cellProbes) {
    try {
      const { exitCode, stdout } = await $.process.run(probe.argv, { timeoutMs: PROBE_TIMEOUT_MS })
      const cell = exitCode === 0 ? probe.parse(stdout) : undefined
      if (cell) return cell
    } catch {
      // the next probe
    }
  }
  return undefined
}

/** The terminal's configured colours: its probes, else its config files. */
async function readColors($: $, info: TerminalInfo, scheme: 'dark' | 'light'): Promise<TerminalColors | undefined> {
  for (const probe of colorProbes(info, { env: processEnv, scheme })) {
    try {
      const { exitCode, stdout } = await $.process.run(probe.argv, { timeoutMs: PROBE_TIMEOUT_MS })
      const colors = exitCode === 0 ? probe.parse(stdout) : undefined
      if (colors?.foreground) return colors
    } catch {
      // the next probe
    }
  }
  try {
    return await readTerminalColors(info, path => readText($, path), { env: processEnv, scheme })
  } catch {
    return undefined
  }
}

async function readText($: $, path: string): Promise<string | undefined> {
  try {
    return await $.fs.read(path)
  } catch {
    return undefined
  }
}

async function readThemeSetting($: $): Promise<string | undefined> {
  try {
    const row = (await $.config.list()).find(one => one.key === 'theme')
    return typeof row?.value === 'string' ? row.value : undefined
  } catch {
    return undefined
  }
}

/**
 * Reads what the ink depends on: the theme setting (unless given), a custom
 * theme's file, and the terminal's colours for the theme's light/dark scheme
 * (read again only when the scheme changes).
 */
async function resolveTheme($: $, setting?: string): Promise<void> {
  theme = setting ?? (await readThemeSetting($))
  const configDir = processEnv.CLAUDE_CONFIG_DIR ?? (processEnv.HOME ? `${processEnv.HOME}/.claude` : undefined)
  const path = configDir ? claudeCustomThemePath(theme, configDir) : undefined
  customTheme = path ? await readText($, path) : undefined
  // `auto` follows the terminal's background, so read the colours (dark first) before settling the scheme.
  for (let pass = 0; pass < 2 && terminal; pass += 1) {
    const scheme = claudeThemeScheme(theme, customTheme, terminalColors)
    if (scheme === colorScheme) break
    terminalColors = await readColors($, terminal, scheme)
    colorScheme = scheme
  }
}

/** The formulas' ink: the terminal's foreground first; a custom theme's `text` colour (the bullet's) never. */
function inkNow() {
  return chooseInk({ theme, customTheme: withoutTextOverride(customTheme), terminal: terminalColors, prefer: INK_PREFER })
}

/** The background the ink's alpha is corrected against (imageInkBackground), as kittex.env's `inkOver`: none where images blend as text does. */
function inkOverNow(): Pick<KittexEnv, 'inkOver' | 'inkCurve'> {
  const over = terminal ? imageInkBackground(terminal.kind, terminalColors, platform) : undefined
  const curve = terminal ? imageInkCurve(terminal.kind, terminalColors, platform) : undefined
  return over ? { inkOver: { r: over.r, g: over.g, b: over.b }, ...(curve ? { inkCurve: { gamma: curve.gamma, contrast: curve.contrast } } : {}) } : {}
}

/** The terminal's background as kittex.env's `background`, when its colours were read (diagrams are drawn for it). */
function backgroundNow(): Pick<KittexEnv, 'background'> {
  const background = terminalColors?.background
  return background ? { background: { r: background.r, g: background.g, b: background.b } } : {}
}

const sameColor = (a: KittexEnv['inkOver'], b: KittexEnv['inkOver']) => a === b || (!!a && !!b && a.r === b.r && a.g === b.g && a.b === b.b)
const sameCurve = (a: KittexEnv['inkCurve'], b: KittexEnv['inkCurve']) => a === b || (!!a && !!b && a.gamma === b.gamma && a.contrast === b.contrast)

/** The `maxProseWidth` setting, when set: reply prose wraps at most this wide. */
async function readProseWidth($: $): Promise<number | undefined> {
  try {
    const value = (await $.settings.read()).maxProseWidth
    return typeof value === 'number' && Number.isFinite(value) && value >= 1 ? Math.floor(value) : undefined
  } catch {
    return undefined
  }
}

/** maxProseWidth changed: inline images are placed at the new width. */
async function refreshProseWidth($: $): Promise<void> {
  const env = await readEnv($)
  if (!env) return
  const maxProseWidth = await readProseWidth($)
  if (maxProseWidth !== env.maxProseWidth) await $.state.set(ENV, { ...env, maxProseWidth })
}

/** The theme changed: the formulas' ink may follow it. */
async function refreshInk($: $, setting: string): Promise<void> {
  await resolveTheme($, setting)
  const env = await readEnv($)
  if (!env) return
  const ink = inkNow()
  const over = inkOverNow()
  const back = backgroundNow()
  if (sameColor(ink, env.ink) && sameColor(over.inkOver, env.inkOver) && sameCurve(over.inkCurve, env.inkCurve) && sameColor(back.background, env.background)) return
  const { inkOver: _, inkCurve: __, background: ___, ...rest } = env
  await $.state.set(ENV, { ...rest, ink, ...over, ...back })
}

/**
 * The cell probes after setup: for a render that sees a new width, once a
 * resize settles, and periodically. Each measures the terminal's own
 * TIOCGWINSZ (its columns and pixels); the timers store what they find in
 * kittex.env when it changed, which redraws every block that read it.
 */
interface Cells {
  /** Probes now, for drawing: one probe at a time, shared by every render that asks meanwhile. Stores nothing (a render may not write state). */
  probe(): Promise<CellSize | undefined>
  /**
   * Probes and stores once the width has stopped changing: every call
   * restarts the wait, so a drag ends with the final size. `seen`: the width a
   * render saw, kept when the probe can't tell the columns.
   */
  settle(seen?: number): void
  /** Starts the periodic probe (once): a change of the cells' pixels alone draws nothing by itself. */
  poll(): void
  stop(): void
}

/**
 * The probes on session.start's `$`: a render's `$` belongs to its one
 * dispatch, and the timers outlive it. A timer's callback is a dispatch of its
 * own, where a state write is allowed.
 */
function cellsFor($: $): Cells {
  let probing: Promise<CellSize | undefined> | undefined
  /** The stores, one after another (a settle never skipped for a periodic probe running). */
  let stores: Promise<void> = Promise.resolve()
  let settleTimer: Timer | undefined
  let pollTimer: Timer | undefined
  const store = (seen?: number) => {
    stores = stores.then(async () => storeCells($, await probeCell($), seen)).catch(() => undefined)
  }
  return {
    probe() {
      return (probing ??= probeCell($).finally(() => {
        probing = undefined
      }))
    },
    settle(seen) {
      settleTimer?.cancel()
      try {
        settleTimer = $.clock.after(RESIZE_SETTLE_MS, () => {
          settleTimer = undefined
          store(seen)
        })
      } catch {
        settleTimer = undefined
      }
    },
    poll() {
      if (pollTimer) return
      try {
        pollTimer = $.clock.every(CELL_POLL_MS, () => {
          store()
        })
      } catch {
        pollTimer = undefined
      }
    },
    stop() {
      settleTimer?.cancel()
      pollTimer?.cancel()
    },
  }
}

/**
 * A measured cell as kittex.env holds it, with the math's em for it
 * (mathEmPxFor: from the text font's metrics once read, else the font's own
 * cell, the terminal's adjustments undone).
 */
function cellEnv(cell: CellSize | undefined, env: Pick<KittexEnv, 'kind' | 'cellAdjust' | 'kittyAdjust' | 'font'>): Pick<KittexEnv, 'cellWidth' | 'cellHeight' | 'measured' | 'emPx'> {
  const { cellWidth, cellHeight, measured } = cellOrFallback(cell)
  return { cellWidth, cellHeight, measured, emPx: mathEmPxFor({ cellWidth, cellHeight }, env) }
}

/**
 * Reads the text font's metrics and stores them in kittex.env, with the em
 * they give the math, then redraws: the file kitty names (its probe), else
 * the one fontconfig finds for the configured family and style; Ghostty's
 * built-in JetBrains Mono when it names none or fontconfig has no such
 * family. Off the startup path: on session.start's clock after setup.
 */
async function loadFont($: $): Promise<void> {
  if (!terminal || (terminal.kind !== 'kitty' && terminal.kind !== 'ghostty') || terminal.ssh) return
  const named = terminalColors?.font
  let metrics: FontMetrics | undefined
  let file = named?.file
  let index = named?.index ?? 0
  if (!file && named?.family) {
    const found = await runProbe($, fontFileArgv(named.family, named.style), parseFontFile)
    if (found && matchesFamily(found, named.family)) [file, index] = [found.file, found.index]
  }
  if (file) metrics = await readFontMetrics(await fontBytes($, file), index)
  else if (terminal.kind === 'ghostty') metrics = GHOSTTY_BUILTIN_FONT
  if (!metrics) return
  const env = await readEnv($)
  if (!env) return
  const font: NonNullable<KittexEnv['font']> = {
    unitsPerEm: metrics.unitsPerEm,
    ascender: metrics.ascender,
    descender: metrics.descender,
    lineGap: metrics.lineGap,
    ...(metrics.xHeight ? { xHeight: metrics.xHeight } : {}),
    ...(metrics.advance ? { advance: metrics.advance } : {}),
    ...(named?.sizePt ? { sizePt: named.sizePt } : {}),
    ...(platform ? { platform } : {}),
  }
  // The font's weight (usWeightClass) when the config's names don't say one.
  const weight = env.weight === undefined && metrics.weight && metrics.weight !== 400 ? { weight: strokeWeight(metrics.weight) } : {}
  const next = { ...env, font, ...weight }
  const measured = { ...next, emPx: mathEmPxFor(next, next) }
  // As setUp started from (the last session's reading): nothing to redraw.
  if (JSON.stringify(env.font) === JSON.stringify(font) && env.weight === measured.weight && env.emPx === measured.emPx) return
  await $.state.set(ENV, measured)
  // The next session's first renders draw with the font too (their cache keys hold it).
  await $.store.set(REMEMBERED, { id: terminalId(processEnv), env: measured }).catch(() => undefined)
  $.ui.invalidate('ui.render')
}

/** A font file's bytes: read whole when $.fs.read takes it (up to 4 MiB), else in pieces through `od`. */
async function fontBytes($: $, path: string): Promise<ByteReader> {
  try {
    const { base64 } = await $.fs.read(path, { as: 'bytes' })
    // The sandbox's Uint8Array has the base64 helpers (Node's TypeScript lib doesn't declare them yet).
    const bytes = (Uint8Array as unknown as { fromBase64(text: string): Uint8Array }).fromBase64(base64)
    return async (offset, length) => (offset < bytes.length ? bytes.subarray(offset, offset + length) : undefined)
  } catch {
    return async (offset, length) => (length > 1 << 20 ? undefined : runProbe($, odArgv(path, offset, length), parseOd))
  }
}

/** Runs a fixed argv and parses its output, or undefined when it fails. */
async function runProbe<T>($: $, argv: readonly string[], parse: (stdout: string) => T | undefined): Promise<T | undefined> {
  try {
    const { exitCode, stdout } = await $.process.run(argv, { timeoutMs: PROBE_TIMEOUT_MS })
    return exitCode === 0 ? parse(stdout) : undefined
  } catch {
    return undefined
  }
}

/** Stores a probe's cells and columns in kittex.env when they changed (a failed probe changes only the columns, to `seen`). */
async function storeCells($: $, cell: CellSize | undefined, seen: number | undefined): Promise<void> {
  const env = await readEnv($)
  if (!env) return
  const columns = cell?.columns ?? seen ?? env.columns
  const measured = cell ? cellEnv(cell, env) : undefined
  const same = measured === undefined || (measured.cellWidth === env.cellWidth && measured.cellHeight === env.cellHeight)
  if (same && columns === env.columns) return
  await $.state.set(ENV, { ...env, ...measured, columns })
  // Every landed block draws for the new cells, those off screen included.
  if (!same) $.ui.invalidate('ui.render')
}

/**
 * Stores a flush's previews (with `at`) in its block, and `raw` where its
 * stream gave up. A block new to the store is one of the recent ones; past
 * BLOCK_LIMIT the oldest is dropped (drawn as it streamed if it redraws).
 */
async function storeBlock($: $, id: string, entry: Streaming, records: readonly PreviewRecord[], raw?: number): Promise<void> {
  await update($, { ...BLOCKS, id }, block => {
    const kept: StreamedBlock = { records: [...(block?.records ?? []), ...records] }
    const at = raw ?? block?.raw
    return at === undefined ? kept : { ...kept, raw: at }
  })
  if (entry.stored) return
  entry.stored = true
  storedBlocks.push(id)
  await update($, RECENT, list => [...(list ?? []).filter(one => one !== id), id].slice(-RECENT_BLOCKS))
  while (storedBlocks.length > BLOCK_LIMIT) await $.state.set({ ...BLOCKS, id: storedBlocks.shift()! }, null)
}

/** The message whose stream a row's text starts with (the longest such, so the newest of two that begin alike). */
function streamOf(text: string): string | undefined {
  let best: string | undefined
  let length = 0
  for (const [id, entry] of streams) {
    const source = entry.source.trimEnd()
    if (source !== '' && source.length >= length && text.startsWith(source)) {
      best = id
      length = source.length
    }
  }
  return best
}

async function linkRow($: $, uuid: string, id: string): Promise<void> {
  await $.state.set({ ...REQUESTS, id: uuid }, id)
  const entry = streams.get(id)
  if (entry) entry.linked = true
}

/** Links a stream to a row appended before its first flush, once its text shows whose row that is. */
async function linkPending($: $, id: string, entry: Streaming): Promise<void> {
  const source = entry.source.trimEnd()
  if (source === '') return
  const k = pendingRows.findIndex(row => row.text.startsWith(source))
  if (k < 0) return
  const [row] = pendingRows.splice(k, 1)
  await linkRow($, row!.uuid, id)
}

/**
 * The streamed block a landed one is: the one its row links (`streamed`
 * even with no previews stored: its text holds no LaTeX to read again), else,
 * for a text holding preview marks, the newest block whose previews it holds
 * where they were written (no link after a hot reload). A render only reads.
 */
async function landedBlock($: $, e: LandedEvent): Promise<{ streamed: boolean; block?: StreamedBlock }> {
  const id = (await $.state.get({ ...REQUESTS, id: e.requestId })).value
  if (id !== undefined) {
    const block = (await $.state.get({ ...BLOCKS, id })).value
    return block ? { streamed: true, block } : { streamed: true }
  }
  if (!STREAMED_PATTERN.test(e.props.text)) return { streamed: false }
  const recent = (await $.state.get(RECENT)).value ?? []
  for (const one of [...recent].reverse()) {
    const block = (await $.state.get({ ...BLOCKS, id: one })).value
    if (block && blockMatches(e.props.text, block.records)) return { streamed: true, block }
  }
  return { streamed: false }
}

// ─── Images (stress report F9: the landing render only composes) ─────────────

/**
 * Images drawn, by formula and geometry (cells, column, ink, rows or columns),
 * least recently used first. Each keeps one PNG object, so its base64 and its
 * signature are computed once, and a re-render of a landed block sends the
 * same source (no new transmission).
 */
const drawnImages = new Map<string, RenderedImage>()

function cachedImage(key: string, draw: () => RenderedImage): RenderedImage {
  let image = drawnImages.get(key)
  if (image) {
    drawnImages.delete(key)
  } else {
    image = draw()
    while (drawnImages.size >= IMAGE_LIMIT) drawnImages.delete(drawnImages.keys().next().value!)
  }
  drawnImages.set(key, image)
  return image
}

function geometryKey(env: RenderEnv): string {
  const over = env.inkOver ? [env.inkOver.r, env.inkOver.g, env.inkOver.b, env.inkCurve?.gamma ?? '', env.inkCurve?.contrast ?? ''] : []
  return [env.cellWidth, env.cellHeight, env.maxColumns, env.emPx, env.weight ?? '', env.ink.r, env.ink.g, env.ink.b, ...over].join(',')
}

/** A display formula's image, `rows` tall (measured when not given). Throws TexError. */
function displayImage(tex: string, env: RenderEnv, rows?: number): RenderedImage {
  let height: number
  try {
    height = rows ?? measureDisplay(tex, env).rows
    return cachedImage(`d\n${geometryKey(env)}\n${height}\n${tex}`, () => renderDisplay(tex, env, height))
  } catch (error) {
    // MathJax refused it: TeX's drawing where the local LaTeX made one.
    const result = error instanceof TexError ? texDrawn(tex, true) : undefined
    if (!result) throw texRefusal(tex, true) ?? error
    height = rows ?? measureDisplayResult(result, env).rows
    return cachedImage(`t\n${geometryKey(env)}\n${height}\n${tex}`, () => renderDisplayResult(result, env, height))
  }
}

/** The rows a display formula's image takes: MathJax's, or TeX's where MathJax refused it. Throws TexError. */
function displayRows(tex: string, env: RenderEnv): number {
  try {
    return measureDisplay(tex, env).rows
  } catch (error) {
    const result = error instanceof TexError ? texDrawn(tex, true) : undefined
    if (!result) throw texRefusal(tex, true) ?? error
    return measureDisplayResult(result, env).rows
  }
}

/** An inline formula's image, `columns` wide, its ink where `place` says. Throws TexError. */
function inlineImage(tex: string, env: InlineEnv, columns: number, place: InkPlace = 'center'): RenderedImage {
  const key = `${geometryKey(env)},${env.baselinePx}\n${columns},${place}\n${tex}`
  try {
    return cachedImage(`i\n${key}`, () => renderInline(tex, env, columns, place))
  } catch (error) {
    // MathJax refused it: TeX's drawing where the local LaTeX made one.
    const result = error instanceof TexError ? texDrawn(tex, false) : undefined
    if (!result) throw error
    return cachedImage(`ti\n${key}`, () => renderInlineResult(result, env, columns, place))
  }
}

/** Formulas streaming wrote previews for, waiting to be drawn ahead of their landing. */
const pending: { record: PreviewRecord; env: KittexEnv }[] = []

/**
 * Draws the images of previews just written, one per tick of session.start's
 * clock (between flushes, after this one is shown), with their base64 and
 * signature: by the time the block lands its drawing only composes.
 */
function drawSoon(records: readonly PreviewRecord[], env: KittexEnv): void {
  const idle = pending.length === 0
  for (const record of records) if (record.error === undefined) pending.push({ record, env })
  if (!idle || pending.length === 0) return
  const step = () => {
    const next = pending.shift()
    if (!next) return
    const { record, env } = next
    try {
      const renderEnv = renderEnvFor(env)
      const image = record.diagram !== undefined
        ? diagramImage(record.tex, record.diagram, pictureEnvFor(env), record.rows)
        : record.inline
          ? inlineImage(record.tex, inlineEnvFor(env), record.columns ?? 0, record.place)
          : displayImage(record.tex, { ...renderEnv, maxColumns: displayColumns(record, env) }, record.rows)
      if (image === null || !('png' in image)) throw new Error('not drawn')
      base64Of(image.png)
      signatureOf(image.png)
    } catch {
      // drawn (or refused) at landing as before
    }
    if (pending.length > 0) after(step)
  }
  after(step)
}

function after(fn: () => void): void {
  try {
    if (!later) throw new Error('no clock')
    later(fn)
  } catch {
    pending.length = 0
  }
}

function laterFor($: $): (fn: () => void, ms?: number) => void {
  return (fn, ms = 0) => {
    $.clock.after(ms, fn)
  }
}

const base64Cache = new WeakMap<Uint8Array, string>()
const signatureCache = new WeakMap<Uint8Array, string>()

/**
 * A PNG's FNV-1a hash, for the key of the Box that holds its Image: an image
 * whose pixels change (new cells, width or ink) is a new element, which the
 * engine sends under a new image id, deleting the old one. Sent again under
 * the same id, Ghostty keeps drawing an earlier transmission.
 */
function signatureOf(png: Uint8Array): string {
  let signature = signatureCache.get(png)
  if (signature === undefined) {
    let hash = 0x811c9dc5
    for (const byte of png) hash = Math.imul(hash ^ byte, 0x01000193)
    signature = (hash >>> 0).toString(36)
    signatureCache.set(png, signature)
  }
  return signature
}

function base64Of(png: Uint8Array): string {
  let base64 = base64Cache.get(png)
  if (base64 === undefined) {
    base64 = toBase64(png)
    base64Cache.set(png, base64)
  }
  return base64
}

// ─── Resume: the order, the waits, the rows of off-screen blocks ─────────────

/** Landed blocks to typeset, newest first (schedule.ts), each in a dispatch of its own. */
const turns = newestFirst()

/** A clock for `within`: this dispatch's own, or session.start's. */
function clockOf($: $): (fn: () => void, ms: number) => void {
  return (fn, ms) => {
    try {
      $.clock.after(ms, fn)
    } catch {
      later?.(fn, ms)
    }
  }
}

/** The terminal a remembered env was measured in. */
function terminalId(variables: Readonly<Record<string, string | undefined>>): string {
  return [variables.TERM, variables.TERM_PROGRAM, variables.TERM_PROGRAM_VERSION, variables.TMUX ? 'tmux' : ''].join('|')
}

/** The env the last session stored, when it was this terminal's (a render's $: three variables and a store read). */
async function readRemembered($: $): Promise<KittexEnv | undefined> {
  try {
    const [stored, TERM, TERM_PROGRAM, TERM_PROGRAM_VERSION, TMUX, XDG_CACHE_HOME, HOME, tex] = await Promise.all([
      $.store.get(REMEMBERED),
      $.env.get('TERM'),
      $.env.get('TERM_PROGRAM'),
      $.env.get('TERM_PROGRAM_VERSION'),
      $.env.get('TMUX'),
      $.env.get('XDG_CACHE_HOME'),
      $.env.get('HOME'),
      texAllowed ? $.store.get(REMEMBERED_TEX) : Promise.resolve(undefined),
    ])
    // The cache is read from the first render on (session.start sets it again).
    cacheFolder ??= cacheDir({ XDG_CACHE_HOME, HOME })
    // So are the diagrams the last session's TeX drew: their rows are the picture's from the first frame.
    if (texAllowed) texBook.cached ??= rememberedTex(tex)
    const entry = stored as { id?: unknown; env?: KittexEnv } | undefined
    if (!entry || entry.id !== terminalId({ TERM, TERM_PROGRAM, TERM_PROGRAM_VERSION, TMUX }) || typeof entry.env?.cellWidth !== 'number') return undefined
    return entry.env
  } catch {
    return undefined
  }
}

/** Settles as `promise` does, or with undefined after `ms` (no wait longer than that), never rejecting. */
function within<T>(promise: Promise<T>, ms: number, clock?: (fn: () => void, ms: number) => void): Promise<T | undefined> {
  return new Promise(resolve => {
    let done = false
    const finish = (value: T | undefined) => {
      if (done) return
      done = true
      resolve(value)
    }
    promise.then(finish, () => finish(undefined))
    try {
      if (clock) clock(() => finish(undefined), ms)
      else later?.(() => finish(undefined), ms)
    } catch {
      // no clock: the promise alone
    }
  })
}

const NO_PNG = new Uint8Array(0)

/**
 * A plan's options for a block off screen: every formula measured (its rows
 * and its slot reserved, as the full drawing has them) and none drawn; an
 * image with no PNG is drawn as its Unicode (budget.ts's fallback), and an
 * inline one leaves its preview, until the block comes on screen.
 */
function reservedOptions(options: PlanOptions, renderEnv: RenderEnv): PlanOptions {
  return {
    ...options,
    ...(options.draw
      ? {
          draw: (tex: string, rows?: number, maxColumns?: number) => {
            const box = measureDisplay(tex, maxColumns === undefined ? renderEnv : { ...renderEnv, maxColumns })
            return { columns: box.columns, rows: rows ?? box.rows, scale: box.scale, png: NO_PNG }
          },
        }
      : {}),
    ...(options.inline ? { inline: { ...options.inline, draw: (_tex: string, columns: number) => ({ columns, rows: 1, scale: 1, png: NO_PNG }) } } : {}),
  }
}

// ─── The image cache (the `cache` option, cache.ts) ─────────────────────────

/** Drawings read or planned this session, by key (a re-render reuses the same PNGs: no new transmission). */
const entries = new Map<string, LandedPlan>()
const ENTRY_MEMORY = 256

function remembered(key: string, plan: LandedPlan): LandedPlan {
  entries.delete(key)
  entries.set(key, plan)
  while (entries.size > ENTRY_MEMORY) entries.delete(entries.keys().next().value!)
  return plan
}

/** A block's drawing from memory or disk; undefined on a miss, a bad file, or a read slower than CACHE_READ_MS. */
async function readEntry($: $, key: string): Promise<LandedPlan | undefined> {
  const known = entries.get(key)
  if (known) return remembered(key, known)
  if (!cacheFolder) return undefined
  const text = await within(
    $.fs.read(entryPath(cacheFolder, key)).then(value => (typeof value === 'string' ? value : undefined)),
    CACHE_READ_MS,
  )
  if (text === undefined) return undefined
  const pieces = decodeEntry(text, key, (png, base64) => base64Cache.set(png, base64))
  return pieces ? remembered(key, { pieces, changed: true }) : undefined
}

/** Entries waiting to be written, by session.start's clock (a render may not write). */
const unwritten = new Map<string, string>()

/**
 * Keeps a block's drawing in memory, and on disk: written by the render
 * itself (`write`, its own $), else, where that is refused, by session.start's
 * clock once it runs (a resume's first renders come before it).
 */
function keepEntry(key: string, plan: LandedPlan, write: (path: string, text: string) => Promise<void>): void {
  remembered(key, plan)
  const folder = cacheFolder
  if (!plan.changed || !folder) return
  let text: string
  try {
    text = encodeEntry(key, plan.pieces, base64Of)
  } catch {
    return
  }
  write(entryPath(folder, key), text).catch(() => {
    unwritten.set(key, text)
    if (unwritten.size === 1 && writeFile) soon(flushEntries)
  })
}

function flushEntries(): void {
  const folder = cacheFolder
  const write = writeFile
  if (!folder || !write) return
  const [key, text] = unwritten.entries().next().value ?? []
  if (key === undefined || text === undefined) return
  unwritten.delete(key)
  // One write a tick: rendering goes first. A failed write is a later miss.
  write(entryPath(folder, key), text)
    .catch(() => undefined)
    .finally(() => {
      if (unwritten.size > 0) soon(flushEntries)
    })
}

/** Runs `fn` on session.start's clock, or now without one. */
function soon(fn: () => void): void {
  try {
    if (!later) throw new Error('no clock')
    later(fn)
  } catch {
    fn()
  }
}

/** How many entries one `rm` removes. */
const PRUNE_BATCH = 200

/** Holds the cache folder under its cap: the oldest entries go (cache.ts's pruneList), by `rm` (the sandbox's fs removes nothing). */
async function pruneCache($: $): Promise<void> {
  const folder = cacheFolder
  if (!folder) return
  let files: Awaited<ReturnType<typeof $.fs.list>>
  try {
    files = await $.fs.list(folder)
  } catch {
    return // no folder yet
  }
  const names = pruneList(files).filter(name => ENTRY_NAME.test(name))
  for (let i = 0; i < names.length; i += PRUNE_BATCH) {
    const paths = names.slice(i, i + PRUNE_BATCH).map(name => `${folder}/${name}`)
    await $.process.run(['rm', '-f', '--', ...paths], { timeoutMs: PROBE_TIMEOUT_MS }).catch(() => undefined)
  }
}

// ─── The local TeX (tex.ts) ──────────────────────────────────────────────────

/** Where the local TeX draws for these options, once it was found: diagrams and display math (`block`), inline math (`inline`). */
function texUse(env: KittexEnv, math: MathOptions): { tex?: TexUse } {
  if (!texBook.drawable || !env.images) return {}
  const block = math.block === 'image'
  const inline = math.inline === 'image'
  return block || inline ? { tex: { block, inline } } : {}
}

/**
 * A flush's rewrite once TeX has answered what it waits for: the documents
 * compiled (each within the stream's budget, counted from the ask), then the
 * held segments written, until none waits. A compile that fails or runs out
 * of time is an outcome too: the stream shows that block's source.
 */
async function withTex(stream: MessageStream, first: StreamRewrite, env: StreamEnv): Promise<StreamRewrite> {
  let text = first.text
  const records = [...first.records]
  let pending = first.pending
  for (let round = 0; pending && pending.length > 0 && round < 64; round++) {
    await Promise.all(pending.map(document => texBook.compile(document, TEX_STREAM_BUDGET_MS)))
    // A document whose compile left no outcome (none ran) is shown as written: no stream waits twice.
    for (const document of pending) if (!texBook.known(document)) texBook.remember(document, { ok: false, error: 'no TeX', lasting: false })
    const next = stream.resume(env)
    text += next.text
    records.push(...next.records)
    pending = next.pending
  }
  return { text, records }
}

/** Finds the local TeX with session.start's `$` and gives texBook its host (a compile may outlive the dispatch that asked for it). */
async function setUpTex($: $): Promise<void> {
  const host: TexHost = {
    run: (argv, init) => $.process.run(argv, init),
    write: (path, text) => $.fs.write(path, text),
    // A missing file is no error (a cache miss): asked first, so the engine logs no failed read.
    read: async path => ((await $.fs.exists(path).catch(() => false)) ? $.fs.read(path).catch(() => undefined) : undefined),
    readBytes: path => readBytes($, path),
  }
  try {
    const [tmpdir, cacheHome, path] = await Promise.all([$.env.get('TMPDIR'), $.env.get('XDG_CACHE_HOME'), $.env.get('PATH')])
    const home = processEnv.HOME
    const cacheDir = texCacheDir({ XDG_CACHE_HOME: cacheHome, HOME: home })
    const setup = await probeTex(host, { tmpdir, hide: hiddenDirs(home, tmpdir), ...(cacheDir !== undefined ? { cacheDir } : {}), ...(path !== undefined ? { path } : {}) })
    // For the next session's first renders: the cache's key, or nothing (TeX gone: its diagrams start as code).
    await $.store.set(REMEMBERED_TEX, setup ?? null).catch(() => undefined)
    if (!setup) return
    texBook.host = host
    texBook.setup = setup
    // Blocks drawn before TeX was found (a resumed conversation's) are drawn again with it.
    $.ui.invalidate('ui.render')
    // The fragment format, dumped once into the cache directory (about a second, in the background).
    void prepareFormat(host, setup).catch(() => undefined)
  } catch {
    // no TeX: diagrams stay code
  }
}

/** kittex's instructions to the model: the math, and where TeX draws diagrams, how to ask for one. */
async function instructions(env: KittexEnv | null, math: MathOptions): Promise<string> {
  await texProbe
  // Only where TeX itself is there (an earlier session's cache alone draws what it holds, nothing new).
  return env && texBook.ready && texUse(env, math).tex?.block ? `${MATH_INSTRUCTIONS} ${DIAGRAM_INSTRUCTIONS}` : MATH_INSTRUCTIONS
}

/** A landed block's plan asked for documents TeX hasn't drawn (texBook.ask): read from the disk cache; true when any was there (the plan is made again). */
async function loadAsked(documents: readonly TexDocument[], read: (path: string) => Promise<string | undefined>): Promise<boolean> {
  const found = await Promise.all(documents.map(document => texBook.load(document, read)))
  return found.some(outcome => outcome !== undefined)
}

/** Compiles what is still missing in the background, and redraws every block once they are done. */
function compileAsked(documents: readonly TexDocument[]): void {
  const missing = documents.filter(document => {
    const known = texBook.known(document)
    return !known || (!known.ok && !known.lasting)
  })
  if (missing.length === 0) return
  void Promise.all(missing.map(document => texBook.compile(document, TEX_BACKGROUND_MS))).then(() => redraw?.(), () => undefined)
}

/** How each picture's image is drawn again at fewer pixels (fitPictures). */
const pictureRedraws = new WeakMap<RenderedImage, (density: number) => RenderedImage>()

/** A diagram's image `rows` tall (its own when not given), for the landing: as TexBook has it, or null / { error } (see PlanOptions.diagram). */
function diagramImage(source: string, kind: DiagramKind, env: PictureEnv, rows?: number): RenderedImage | { error: string } | null {
  const job = diagramJob(source, kind)
  if (!job) return null
  if ('refused' in job) return { error: job.refused }
  const outcome = texBook.known(job.document)
  if (!outcome || (!outcome.ok && !outcome.lasting)) {
    texBook.ask(job.document)
    return null
  }
  if (!outcome.ok) return { error: outcome.error }
  try {
    const key = `p\n${geometryKey(env)},${env.background ? [env.background.r, env.background.g, env.background.b].join(',') : ''}\n${rows ?? ''}\n${job.document.text}`
    const image = cachedImage(key, () => renderPicture(outcome.picture, env, rows))
    if (!pictureRedraws.has(image)) pictureRedraws.set(image, density => cachedImage(`${key}\n${density}`, () => renderPicture(outcome.picture, env, image.rows, density)))
    return image
  } catch (error) {
    if (error instanceof TexError) return { error: error.message }
    throw error
  }
}

/** A formula MathJax refused, as TeX drew it (TexBook), or undefined: then wanted for the next draw. */
function texDrawn(tex: string, display: boolean): ReturnType<typeof texResult> | undefined {
  const document = mathJob(tex, display)
  if (!document) return undefined
  const outcome = texBook.known(document)
  if (outcome?.ok) return texResult(outcome.picture)
  if (!outcome || !outcome.lasting) texBook.ask(document)
  return undefined
}

/** TeX's own error for a formula MathJax refused and TeX failed on for good (the note shows it, as the stream did). */
function texRefusal(tex: string, display: boolean): TexError | undefined {
  const document = mathJob(tex, display)
  const outcome = document ? texBook.known(document) : undefined
  return outcome && !outcome.ok && outcome.lasting ? new TexError(outcome.error) : undefined
}

// ─── /kittex-doctor (doctor.ts) ──────────────────────────────────────────────

/** The surface session.start reported, for the doctor. */
let doctorSurface: string | undefined

/** Declares /kittex-doctor for the session (session.start, after the hooks beneath), passing `started` on. */
async function startDoctor<T>($: $, surface: string | null, started: T): Promise<T> {
  doctorSurface = surface ?? undefined
  await $.command.register({ name: 'kittex-doctor', description: DOCTOR_DESCRIPTION }).catch(() => undefined)
  return started
}

/** The answer to /kittex-doctor: the report, or why there is none. */
async function runDoctor($: $, options: Parameters<Register>[1]): Promise<{ text: string }> {
  try {
    return { text: formatDoctor(await doctorFacts($, options)) }
  } catch (error) {
    return { text: `kittex doctor failed: ${plain(String(error))}` }
  }
}

/** Everything the doctor reports: what setup found (or the same read again when kittex is off), and the probes. */
async function doctorFacts($: $, options: Parameters<Register>[1]): Promise<DoctorFacts> {
  const math = mathOptions(options)
  const off = math.block === 'raw' && math.inline === 'raw'
  const variables = processEnv.TERM !== undefined || processEnv.HOME !== undefined ? processEnv : await readProcessEnv($)
  const [PATH, TMPDIR, XDG_CACHE_HOME] = await Promise.all([$.env.get('PATH'), $.env.get('TMPDIR'), $.env.get('XDG_CACHE_HOME')])
  const run = (argv: readonly string[]) => $.process.run(argv, { timeoutMs: DOCTOR_PROBE_MS }).catch(() => undefined)
  const host: DoctorHost = {
    run: (argv, init) => $.process.run(argv, init),
    write: (path, text) => $.fs.write(path, text),
    read: async path => ((await $.fs.exists(path).catch(() => false)) ? $.fs.read(path).catch(() => undefined) : undefined),
    exists: path => $.fs.exists(path),
    size: path => $.fs.stat(path).then(stat => stat.size, () => undefined),
    readBytes: path => readBytes($, path),
  }
  const [uname, osRelease, version, manifest, env, policy] = await Promise.all([
    platform ?? run(['uname', '-s']).then(out => (out?.exitCode === 0 ? out.stdout : undefined)),
    $.fs.read('/etc/os-release').catch(() => undefined),
    $.session.version().catch(() => undefined),
    $.fs.read(`${$.plugin.root}/.claude-plugin/plugin.json`).catch(() => undefined),
    readEnv($).catch(() => null),
    $.settings.read({ source: 'policy' }).catch(() => undefined),
  ])
  const os = osFacts(uname, typeof osRelease === 'string' ? osRelease : undefined)
  const info = terminal ?? detectTerminal(variables)
  const surface = doctorSurface
  const drawn = !off && surface === 'terminal' && (env?.images ?? info.images) && math.block === 'image'
  const env2 = { PATH, HOME: variables.HOME, TMPDIR, XDG_CACHE_HOME }
  // The section the setup looked for: still there now?
  let section: boolean | undefined
  if (!off && surface === 'terminal' && instructs(env)) {
    section = await $.prompt.compose({ surfaces: ['terminal'] }).then(composed => composed.sections.some(one => one.id === SECTION_ID), () => undefined)
  }
  const [diagrams, cache, font] = await Promise.all([
    probeDiagrams(host, { option: options.latex === 'off' ? 'off' : 'auto', drawn, found: texBook.ready, os, env: env2, hide: hiddenDirs(variables.HOME, TMPDIR) }),
    probeCache(host, env2),
    doctorFont($, env),
  ])
  const hex = (c: { r: number; g: number; b: number } | undefined) => (c ? `#${[c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}` : undefined)
  const program = [variables.TERM_PROGRAM, variables.TERM_PROGRAM_VERSION].filter(Boolean).join(' ')
  const terminalFacts: TerminalFacts = {
    kind: info.kind,
    images: info.images,
    ...(info.multiplexer ? { multiplexer: info.multiplexer } : {}),
    ...(info.ssh ? { ssh: true } : {}),
    ...(variables.TERM ? { term: variables.TERM } : {}),
    ...(program ? { program } : {}),
    ...(env ? { cell: { width: env.cellWidth, height: env.cellHeight, measured: env.measured } } : {}),
    ...(font ? { font } : {}),
    ...(env ? { ink: hex(env.ink) } : {}),
    ...(env?.background ? { background: hex(env.background) } : {}),
    colors: terminalColors?.foreground ? 'terminal' : 'theme',
  }
  const pluginVersion = typeof manifest === 'string' ? (JSON.parse(manifest) as { version?: unknown }).version : undefined
  const optionText = (value: unknown, fallback: string) => (value === undefined ? fallback : typeof value === 'boolean' ? (value ? 'on' : 'off') : String(value))
  return {
    kittex: { ...(typeof pluginVersion === 'string' ? { version: pluginVersion } : {}), build: BUILD_ID.replace(/^kittex-build:/, '') },
    ...(version ? { claudeCode: version.version } : {}),
    ...(surface ? { surface } : {}),
    ...(off ? {} : { terminal: terminalFacts }),
    streaming: { off, streamed: streams.size, unstreamed: pendingRows.length, ...(section !== undefined ? { section } : {}), managed: policy !== undefined && Object.keys(policy).length > 0 },
    options: {
      block: math.block,
      inline: math.inline,
      latex: options.latex === 'off' ? 'off' : 'auto',
      ...('cache' in options ? { cache: optionText(options.cache, 'on') } : {}),
    },
    diagrams,
    cache,
    os,
    ...(variables.HOME ? { home: variables.HOME } : {}),
  }
}

/** The text font as kittex reads it (loadFont's sources, in its order), for the doctor. */
async function doctorFont($: $, env: KittexEnv | null): Promise<TerminalFacts['font'] | undefined> {
  const named = terminalColors?.font
  const metrics = env?.font !== undefined
  if (!named && !metrics) return undefined
  let file = named?.file
  let source: NonNullable<TerminalFacts['font']>['source'] = file ? 'kitty' : undefined
  if (!file && named?.family) {
    const found = await runProbe($, fontFileArgv(named.family, named.style), parseFontFile)
    if (found && matchesFamily(found, named.family)) [file, source] = [found.file, 'fontconfig']
  }
  if (!file && terminal?.kind === 'ghostty') source = 'ghostty'
  return {
    ...(named?.family ? { family: named.family } : {}),
    ...(named?.style ? { style: named.style } : {}),
    ...(named?.sizePt ? { sizePt: named.sizePt } : env?.font?.sizePt ? { sizePt: env.font.sizePt } : {}),
    ...(file ? { file } : {}),
    ...(source ? { source } : {}),
    metrics,
  }
}

/** A file's bytes, or undefined when it can't be read (the sandbox's Uint8Array has the base64 helpers). */
async function readBytes($: $, path: string): Promise<Uint8Array | undefined> {
  try {
    const { base64 } = await $.fs.read(path, { as: 'bytes' })
    return (Uint8Array as unknown as { fromBase64(text: string): Uint8Array }).fromBase64(base64)
  } catch {
    return undefined
  }
}
