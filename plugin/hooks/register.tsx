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

import {
  cellProbes,
  chooseInk,
  claudeCustomThemePath,
  claudeThemeScheme,
  colorProbes,
  detectTerminal,
  emPxForCell,
  init,
  readTerminalColors,
  renderDisplay,
  toBase64,
} from './core.js'
import type { CellSize, TerminalColors, TerminalInfo } from './core.js'
import {
  cellOrFallback,
  FALLBACK_COLUMNS,
  IMAGE_MARGIN_BOTTOM,
  IMAGE_MARGIN_TOP,
  INK_PREFER,
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
    if (result.deny === undefined && typeof result.value === 'string') await refreshInk($, result.value).catch(() => undefined)
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
  processEnv = await readProcessEnv($)
  terminal = detectTerminal(processEnv)
  const [cell] = await Promise.all([probeCell($), resolveTheme($)])
  const { cellWidth, cellHeight, measured } = cellOrFallback(cell)
  const env: KittexEnv = {
    kind: terminal.kind,
    images: terminal.images,
    cellWidth,
    cellHeight,
    columns: cell?.columns ?? FALLBACK_COLUMNS,
    emPx: emPxForCell({ cellWidth, cellHeight }),
    ink: inkNow(),
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
  ]
  return Object.fromEntries(names.map((name, i) => [name, values[i]]))
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

function inkNow() {
  return chooseInk({ theme, customTheme, terminal: terminalColors, prefer: INK_PREFER })
}

/** The theme changed: the formulas' ink may follow it. */
async function refreshInk($: $, setting: string): Promise<void> {
  await resolveTheme($, setting)
  const env = await readEnv($)
  if (!env) return
  const ink = inkNow()
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
