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
  claudeCustomThemePath,
  claudeThemeScheme,
  colorProbes,
  detectTerminal,
  drawsEmojiSequences,
  emPxForCell,
  fontCell,
  imageInkBackground,
  measureDisplay,
  previewDisplay,
  readTerminalColors,
  renderDisplay,
  renderInline,
  strokeWeight,
  toBase64,
  BUILD_ID,
} from './core.js'
import type { CellSize, InkPlace, InlineEnv, RenderedImage, RenderEnv, TerminalColors, TerminalInfo } from './core.js'
import {
  BLOCK_LIMIT,
  blockMatches,
  BULLET,
  bulletFor,
  CELL_POLL_MS,
  cellOrFallback,
  COPY_LABEL,
  copiedFormula,
  FALLBACK_COLUMNS,
  INK_PREFER,
  IMAGE_LIMIT,
  inlineEnvFor,
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
import { altText, fallbackLines, overBudget } from './budget.ts'
import { CACHE_READ_MS, cacheDir, cacheFacts, decodeEntry, encodeEntry, entryKey, entryPath, ENTRY_NAME, pruneList } from './cache.ts'
import { newestFirst } from './schedule.ts'
import type { InlineSlot, KittexEnv, LandedPlan, MathOptions, Piece, PlanOptions, PreviewRecord, StreamedBlock } from './math.ts'

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
/** Writes a file with session.start's `$` (a render's may not): the cache's entries. */
let writeFile: ((path: string, text: string) => Promise<void>) | undefined
/** Where the cache's entries go (cache.ts), from XDG_CACHE_HOME or HOME; undefined without either. */
let cacheFolder: string | undefined
/**
 * Settles once session.start has stored kittex.env (or given up). After
 * --resume the engine asks for the transcript's drawings before it raises
 * session.start: a render that comes first waits for it.
 */
let envSettled: (() => void) | undefined
let envReady: Promise<void> = new Promise(resolve => {
  envSettled = resolve
})
/** kittex.env as the last session stored it, for renders before session.start (read once). */
let rememberedEnv: Promise<KittexEnv | undefined> | undefined
const REMEMBERED = 'env'
/** The `cache` option: drawings of resumed blocks kept on disk (cache.ts). */
let cacheOn = true

export const register: Register = (on, options) => {
  /** The `block` and `inline` options: how each kind of math is shown (image, unicode or raw). */
  const math = mathOptions(options)
  // Both left as Claude wrote them: kittex does nothing (no rewrite, no instructions to the model).
  if (math.block === 'raw' && math.inline === 'raw') return
  cacheOn = options.cache !== false

  // ─── Setup ─────────────────────────────────────────────────────────────────

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    cells?.stop()
    cells = cellsFor($)
    later = laterFor($)
    writeFile = (path, text) => $.fs.write(path, text)
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
      envSettled?.()
    }
    if (cacheOn) soon(() => void pruneCache($).catch(() => undefined))
    if (unwritten.size > 0) soon(flushEntries)
    return started
  })

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
      if (!e.surfaces.includes('terminal') || !instructs(await readEnv($))) return composed
      if (composed.sections.some(section => section.id === SECTION_ID)) return composed
      return { sections: [...composed.sections, { id: SECTION_ID, text: MATH_INSTRUCTIONS, scope: 'session' as const }] }
    } catch {
      return composed
    }
  })

  on('prompt.submit', async ($, e, next) => {
    if (!instructByContext || !contextPending) return next(e)
    contextPending = false
    const entered = await next({ ...e, context: [...(e.context ?? []), MATH_INSTRUCTIONS] })
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
    const below = await next(e)
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
      if (!entry) {
        if (delta === '' && e.final) return below
        entry = { stream: new MessageStream(), source: '', shown: 0, stored: false, linked: false, done: false }
        streams.delete(e.message_id)
        streams.set(e.message_id, entry)
        for (const id of streams.keys()) if (streams.size > STREAM_LIMIT) streams.delete(id)
      }
      before = entry.shown
      entry.source += e.delta
      const rewrite = entry.stream!.push(delta, e.final, streamEnvFor(env, math))
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
  on('ui.render', { ...landed, surface: 'terminal', props: { text: sourcePattern(math) } }, ($, e, next) => drawLanded($, e, next, math))
  on('ui.render', { ...landed, surface: ['desktop', 'mobile', 'vscode'], props: { text: LANDED_PATTERN } }, ($, e, next) => drawLanded($, e, next, math))
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
      env = (await (rememberedEnv ??= readRemembered($))) ?? (await within(envReady, ENV_WAIT_MS, clockOf($)), await readEnv($))
      if (!env) return next(e)
    }
    const seen = e.surface === 'terminal' ? e.viewport?.columns : undefined
    if (seen !== undefined && seen !== env.columns) {
      // The window changed width since the cells were measured, and a font
      // zoom changes the cells too: measure before drawing, so no image goes
      // out for cells that are gone, and once more when the resize settles.
      // A render may not write state, so the settle timer stores what it finds.
      const cell = await cells?.probe()
      if (cell) env = { ...env, ...cellEnv(cell, env.cellAdjust), columns: seen }
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
      measure: (tex, maxColumns) => measureDisplay(tex, { ...renderEnv, maxColumns }).rows,
      math,
      inline:
        inlineImages
          ? { env: inlineEnv, width: proseWidthFor(env, columns), columns, draw: (tex, cells, place) => inlineImage(tex, inlineEnv, cells, place), hyperlinks: env.hyperlinks, emojiSequences: env.emojiSequences }
          : undefined,
    }
    // A block read back as LaTeX (a resumed session) may be on disk already
    // (cache.ts); one off screen in the fullscreen layout (`onScreen` null:
    // the engine lays out blocks around the view) gets its rows only, its
    // images once it is on screen; every other is typeset in its turn, the
    // newest first (schedule.ts).
    const resumed = e.surface === 'terminal' && images && !streamed && records.length === 0
    const key = resumed && cacheOn && cacheFolder ? entryKey(e.props.text, cacheFacts(env, columns, math, BUILD_ID)) : undefined
    let plan: LandedPlan | undefined = key ? await readEntry($, key) : undefined
    if (!plan) {
      const offScreen = resumed && e.viewport?.isFullscreen === true && (e.props as { onScreen?: unknown }).onScreen === null
      const release = await turns.take(() => $.state.get(ENV))
      try {
        plan = planLanded(e.props.text, records, offScreen ? reservedOptions(planOptions, renderEnv) : planOptions)
      } finally {
        release()
      }
      if (key && !offScreen) keepEntry(key, plan, (path, text) => $.fs.write(path, text))
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
    const { pieces } = plan
    // One answer holds at most 2 MiB of Image source: past it, the rest keep their Unicode (budget.ts).
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
    const copy = (tex: string) => async () => {
      const copied = await $.ui.copy({ text: copiedFormula(tex), surface: e.surface })
      $.ui.toast(copied.isCopied ? 'Copied the formula as LaTeX' : 'Could not copy the formula')
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
            <Button key={`kittex-copy-${i}`} label={COPY_LABEL} plain dimColor onPress={copy(piece.tex)} />
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
                    <Button key={`kittex-copy-${k}`} label={COPY_LABEL} plain dimColor onPress={copy(inline.tex)} />
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
  const cellAdjust = terminalColors?.cellAdjust
  const env: KittexEnv = {
    kind: terminal.kind,
    images: terminal.images,
    ...cellEnv(cell, cellAdjust),
    ...(cellAdjust ? { cellAdjust } : {}),
    columns: cell?.columns ?? FALLBACK_COLUMNS,
    ink: inkNow(),
    ...inkOverNow(),
    bullet: bulletFor(uname, processEnv.HOME),
    maxProseWidth: await readProseWidth($),
    ...linkEnv(processEnv),
    emojiSequences: drawsEmojiSequences(terminal, terminalColors),
    // Strokes as heavy as the terminal's text, when its font's weight is known.
    ...(terminalColors?.fontWeight ? { weight: strokeWeight(terminalColors.fontWeight) } : {}),
  }
  await $.state.set(ENV, env)
  envSettled?.()
  // For the next session's first renders, which come before its session.start.
  await $.store.set(REMEMBERED, { id: terminalId(processEnv), env }).catch(() => undefined)

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
function inkOverNow(): Pick<KittexEnv, 'inkOver'> {
  const over = terminal ? imageInkBackground(terminal.kind, terminalColors) : undefined
  return over ? { inkOver: { r: over.r, g: over.g, b: over.b } } : {}
}

const sameColor = (a: KittexEnv['inkOver'], b: KittexEnv['inkOver']) => a === b || (!!a && !!b && a.r === b.r && a.g === b.g && a.b === b.b)

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
  if (sameColor(ink, env.ink) && sameColor(over.inkOver, env.inkOver)) return
  const { inkOver: _, ...rest } = env
  await $.state.set(ENV, { ...rest, ink, ...over })
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

/** A measured cell as kittex.env holds it: the math's em from the font's own cell (fontCell), the terminal's adjustments undone. */
function cellEnv(cell: CellSize | undefined, adjust: KittexEnv['cellAdjust']): Pick<KittexEnv, 'cellWidth' | 'cellHeight' | 'measured' | 'emPx'> {
  const { cellWidth, cellHeight, measured } = cellOrFallback(cell)
  return { cellWidth, cellHeight, measured, emPx: emPxForCell(fontCell({ cellWidth, cellHeight }, adjust)) }
}

/** Stores a probe's cells and columns in kittex.env when they changed (a failed probe changes only the columns, to `seen`). */
async function storeCells($: $, cell: CellSize | undefined, seen: number | undefined): Promise<void> {
  const env = await readEnv($)
  if (!env) return
  const columns = cell?.columns ?? seen ?? env.columns
  const measured = cell ? cellEnv(cell, env.cellAdjust) : undefined
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
  const over = env.inkOver ? [env.inkOver.r, env.inkOver.g, env.inkOver.b] : []
  return [env.cellWidth, env.cellHeight, env.maxColumns, env.emPx, env.weight ?? '', env.ink.r, env.ink.g, env.ink.b, ...over].join(',')
}

/** A display formula's image, `rows` tall (measured when not given). Throws TexError. */
function displayImage(tex: string, env: RenderEnv, rows?: number): RenderedImage {
  const height = rows ?? measureDisplay(tex, env).rows
  return cachedImage(`d\n${geometryKey(env)}\n${height}\n${tex}`, () => renderDisplay(tex, env, height))
}

/** An inline formula's image, `columns` wide, its ink where `place` says. Throws TexError. */
function inlineImage(tex: string, env: InlineEnv, columns: number, place: InkPlace = 'center'): RenderedImage {
  return cachedImage(`i\n${geometryKey(env)},${env.baselinePx}\n${columns},${place}\n${tex}`, () => renderInline(tex, env, columns, place))
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
      const image = record.inline
        ? inlineImage(record.tex, inlineEnvFor(env), record.columns ?? 0, record.place)
        : displayImage(record.tex, { ...renderEnv, maxColumns: displayColumns(record, env) }, record.rows)
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
    const [stored, TERM, TERM_PROGRAM, TERM_PROGRAM_VERSION, TMUX, XDG_CACHE_HOME, HOME] = await Promise.all([
      $.store.get(REMEMBERED),
      $.env.get('TERM'),
      $.env.get('TERM_PROGRAM'),
      $.env.get('TERM_PROGRAM_VERSION'),
      $.env.get('TMUX'),
      $.env.get('XDG_CACHE_HOME'),
      $.env.get('HOME'),
    ])
    // The cache is read from the first render on (session.start sets it again).
    cacheFolder ??= cacheDir({ XDG_CACHE_HOME, HOME })
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
