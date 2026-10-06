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
import type { EngineInterface, Register } from 'claude-code'

import { cellProbe, chooseInk, colorProbes, detectTerminal, emPxForCell, init, renderDisplay, toBase64 } from './core.js'
import type { CellSize, TerminalColors, TerminalInfo } from './core.js'
import {
  cellOrFallback,
  FALLBACK_COLUMNS,
  IMAGE_MARGIN_BOTTOM,
  IMAGE_MARGIN_TOP,
  INSTRUCT_WITHOUT_IMAGES,
  joinProse,
  MessageStream,
  MATH_INSTRUCTIONS,
  mayHoldMath,
  planLanded,
  PROBE_TIMEOUT_MS,
  RECORD_LIMIT,
  renderEnvFor,
  REPLY_INDENT,
  RESIZE_SETTLE_MS,
  SECTION_ID,
  STREAM_LIMIT,
  trimPieces,
} from './math.ts'
import type { KittexEnv, PreviewRecord } from './math.ts'

type $ = EngineInterface

const ENV = { plugin: 'kittex', key: 'env' } as const
const RECORDS = { plugin: 'kittex', key: 'records' } as const

// Module state that drawing never reads (a hot reload resets it, and
// session.start runs again then).
/** Messages streaming through MessageDisplay; null for one kittex gave up on (it passes as written). */
const streams = new Map<string, MessageStream | null>()
let terminalColors: TerminalColors | undefined
let theme: string | undefined
/** prompt.compose's section did not reach the prompt: instructions ride prompt.submit's context. */
let instructByContext = false
/** The next prompt carries the instructions (first of a conversation, after /clear or compaction). */
let contextPending = false
let reprobePending = false

export const register: Register = (on, options) => {
  if (options.enabled === false) return

  // ─── Setup ─────────────────────────────────────────────────────────────────

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    try {
      await setUp($, e.surface)
    } catch {
      await $.state.set(ENV, null).catch(() => undefined)
    }
    return started
  })

  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const result = await next(e)
    if (result.deny === undefined && typeof result.value === 'string') {
      theme = result.value
      await refreshInk($).catch(() => undefined)
    }
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
    let stream: MessageStream | undefined
    try {
      const env = await readEnv($)
      if (!env) return below
      const known = streams.get(e.message_id)
      if (known === null) {
        if (e.final) streams.delete(e.message_id)
        return below
      }
      stream = known
      if (!stream) {
        if (delta === '' && e.final) return below
        stream = new MessageStream()
        streams.set(e.message_id, stream)
        for (const id of streams.keys()) if (streams.size > STREAM_LIMIT) streams.delete(id)
      }
      const rewrite = stream.push(delta, e.final, env)
      if (e.final) streams.delete(e.message_id)
      if (rewrite.records.length > 0) await remember($, rewrite.records)
      return rewrite.text === delta ? below : { ...below, displayContent: rewrite.text }
    } catch {
      // Show whatever was held back, as written, and leave the rest of the message alone.
      if (e.final) streams.delete(e.message_id)
      else streams.set(e.message_id, null)
      const unshown = stream?.unshown() ?? delta
      return unshown === delta ? below : { ...below, displayContent: unshown }
    }
  }).catch(($, e, next) => next(e))

  // ─── Landed replies ────────────────────────────────────────────────────────

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.isSummary || !mayHoldMath(e.props.text)) return next(e)
    try {
      const env = await readEnv($)
      if (!env) return next(e)
      const columns = e.viewport?.columns ?? env.columns
      if (e.surface === 'terminal') watchWidth($, env, e.viewport?.columns)
      const images = e.surface === 'terminal' && env.images
      const records = e.props.text.includes('```') ? ((await $.state.get(RECORDS)).value ?? []) : []
      const renderEnv = renderEnvFor(env, columns)
      const plan = planLanded(e.props.text, records, {
        maxColumns: renderEnv.maxColumns,
        draw: images ? (tex, minRows) => renderDisplay(tex, renderEnv, minRows) : undefined,
      })
      if (!plan.changed) return next(e)
      const pieces = trimPieces(plan.pieces)
      if (e.surface !== 'terminal' || !pieces.some(piece => piece.kind === 'image')) {
        return next({ ...e, props: { ...e.props, text: joinProse(plan.pieces) } })
      }

      const { Box, Image } = $.ui.resolve(e)
      const drawn = []
      for (const [i, piece] of pieces.entries()) {
        if (piece.kind === 'prose') {
          const isFirstOfReply = i === 0 && e.props.isFirstOfReply
          drawn.push(await next({ ...e, props: { ...e.props, text: piece.text, isFirstOfReply } }))
        } else {
          drawn.push(
            <Box marginLeft={REPLY_INDENT} marginTop={IMAGE_MARGIN_TOP} marginBottom={IMAGE_MARGIN_BOTTOM}>
              <Image source={{ png: base64Of(piece.image.png) }} columns={piece.image.columns} rows={piece.image.rows} alt={piece.tex} />
            </Box>,
          )
        }
      }
      return <Box flexDirection="column">{drawn}</Box>
    } catch {
      return next(e)
    }
  })
}

// ─── Helpers that take $ ─────────────────────────────────────────────────────

async function readEnv($: $): Promise<KittexEnv | null> {
  return (await $.state.get(ENV)).value ?? null
}

/** Whether the model is told to write LaTeX: kittex is set up and draws math on this terminal. */
function instructs(env: KittexEnv | null): boolean {
  return env !== null && (env.images || INSTRUCT_WITHOUT_IMAGES)
}

async function setUp($: $, surface: string | null): Promise<void> {
  await init()
  const terminal = detectTerminal(await readTerminalEnv($))
  const [cell, colors, themeName] = await Promise.all([probeCell($), probeColors($, terminal), readTheme($)])
  terminalColors = colors
  theme = themeName
  const { cellWidth, cellHeight, measured } = cellOrFallback(cell)
  const env: KittexEnv = {
    kind: terminal.kind,
    images: terminal.images,
    cellWidth,
    cellHeight,
    columns: cell?.columns ?? FALLBACK_COLUMNS,
    emPx: emPxForCell({ cellWidth, cellHeight }),
    ink: chooseInk({ theme, terminal: terminalColors }),
    measured,
  }
  await $.state.set(ENV, env)

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

/** The variables detectTerminal reads (and a few it may come to read); names must be literals. */
async function readTerminalEnv($: $): Promise<Record<string, string | undefined>> {
  const [TERM, TERM_PROGRAM, TERM_PROGRAM_VERSION, KITTY_WINDOW_ID, KITTY_PID, GHOSTTY_RESOURCES_DIR, TMUX, STY, ZELLIJ, WEZTERM_EXECUTABLE, ITERM_SESSION_ID, LC_TERMINAL, SSH_TTY] =
    await Promise.all([
      $.env.get('TERM'),
      $.env.get('TERM_PROGRAM'),
      $.env.get('TERM_PROGRAM_VERSION'),
      $.env.get('KITTY_WINDOW_ID'),
      $.env.get('KITTY_PID'),
      $.env.get('GHOSTTY_RESOURCES_DIR'),
      $.env.get('TMUX'),
      $.env.get('STY'),
      $.env.get('ZELLIJ'),
      $.env.get('WEZTERM_EXECUTABLE'),
      $.env.get('ITERM_SESSION_ID'),
      $.env.get('LC_TERMINAL'),
      $.env.get('SSH_TTY'),
    ])
  return { TERM, TERM_PROGRAM, TERM_PROGRAM_VERSION, KITTY_WINDOW_ID, KITTY_PID, GHOSTTY_RESOURCES_DIR, TMUX, STY, ZELLIJ, WEZTERM_EXECUTABLE, ITERM_SESSION_ID, LC_TERMINAL, SSH_TTY }
}

async function probeCell($: $): Promise<CellSize | undefined> {
  try {
    const { exitCode, stdout } = await $.process.run(cellProbe.argv, { timeoutMs: PROBE_TIMEOUT_MS })
    return exitCode === 0 ? cellProbe.parse(stdout) : undefined
  } catch {
    return undefined
  }
}

async function probeColors($: $, info: TerminalInfo): Promise<TerminalColors | undefined> {
  for (const probe of colorProbes(info)) {
    try {
      const { exitCode, stdout } = await $.process.run(probe.argv, { timeoutMs: PROBE_TIMEOUT_MS })
      const colors = exitCode === 0 ? probe.parse(stdout) : undefined
      if (colors?.foreground) return colors
    } catch {
      // the next probe
    }
  }
  return undefined
}

async function readTheme($: $): Promise<string | undefined> {
  try {
    const row = (await $.config.list()).find(one => one.key === 'theme')
    return typeof row?.value === 'string' ? row.value : undefined
  } catch {
    return undefined
  }
}

/** The theme changed: the formulas' ink may follow it. */
async function refreshInk($: $): Promise<void> {
  const env = await readEnv($)
  if (!env) return
  const ink = chooseInk({ theme, terminal: terminalColors })
  if (ink.r !== env.ink.r || ink.g !== env.ink.g || ink.b !== env.ink.b) await $.state.set(ENV, { ...env, ink })
}

/**
 * A render saw the viewport at another width: a resize, or a font zoom, which
 * also changes the cell size. Once the width settles, probe the cells again
 * and store both; at most one probe waits at a time.
 */
function watchWidth($: $, env: KittexEnv, columns: number | undefined): void {
  if (columns === undefined || columns === env.columns || reprobePending) return
  reprobePending = true
  try {
    $.clock.after(RESIZE_SETTLE_MS, () => {
      void reprobe($, columns)
        .catch(() => undefined)
        .finally(() => {
          reprobePending = false
        })
    })
  } catch {
    reprobePending = false
  }
}

async function reprobe($: $, columns: number): Promise<void> {
  const env = await readEnv($)
  if (!env) return
  const cell = await probeCell($)
  const { cellWidth, cellHeight, measured } = cell ? cellOrFallback(cell) : env
  if (env.columns === columns && env.cellWidth === cellWidth && env.cellHeight === cellHeight) return
  await $.state.set(ENV, { ...env, columns, cellWidth, cellHeight, measured, emPx: emPxForCell({ cellWidth, cellHeight }) })
}

async function remember($: $, records: readonly PreviewRecord[]): Promise<void> {
  await update($, RECORDS, list => [...(list ?? []), ...records].slice(-RECORD_LIMIT))
}

const base64Cache = new WeakMap<Uint8Array, string>()

function base64Of(png: Uint8Array): string {
  let base64 = base64Cache.get(png)
  if (base64 === undefined) {
    base64 = toBase64(png)
    base64Cache.set(png, base64)
  }
  return base64
}
