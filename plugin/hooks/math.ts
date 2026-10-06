// kittex's pure side: the constants, the streaming rewrite and the plan of a
// landed reply. Nothing here takes `$` (it cannot cross an import); register.tsx
// does the I/O and hands these functions plain values.
//
// The layout rules below were measured on the live engine (Claude Code
// 2.1.290 and 2.1.291); docs/engine-findings.md has the recordings.

import { createLineScanner, measureDisplay, previewDisplay, previewInline, scan, TexError } from './core.js'
import type { CellSize, LineScanner, RenderedImage, RenderEnv, Segment } from './core.js'
import type { KittexEnv, KittexPreview } from '../types'

// ─── The engine's layout (measured) ──────────────────────────────────────────

/**
 * Columns the engine draws reply text in from the left edge of a block that
 * opens a reply: the bullet's box (`minWidth: 2`). A block drawn without the
 * bullet (`isFirstOfReply: false`) starts at column 0.
 */
export const REPLY_INDENT = 2

/**
 * The bullet that opens a reply, as the engine draws it (in the theme's `text`
 * colour): `⏺` on macOS, `●` elsewhere.
 */
export const BULLET = { macos: '⏺', other: '●' } as const

/**
 * What stands for a space at the start of a preview line, and for a padding
 * line: markdown would strip a leading space (or read four of them as code)
 * and drop an empty line. The engine draws `&nbsp;` as one blank cell, and a
 * text that holds it always goes through its markdown parser, so the escapes
 * in a preview line are always read.
 */
export const PREVIEW_PAD = '&nbsp;'

/**
 * What a padding line (a preview row with no text) ends with: U+2800, a blank
 * cell that no trim takes for whitespace. The engine's streaming preview drops
 * a line of pads alone at the end of a paragraph (its landed drawing keeps
 * it), which would move everything below by a row at landing.
 */
export const BLANK_CELL = '\u2800'

/** ASCII characters markdown may read as syntax inside a preview line; each is backslash-escaped. */
export const MARKDOWN_SPECIALS = /[\\`*_[\]<>|~&!#]/g

/** Whether the preview lines are centred in the reply column, as the image's formula is. */
export const PREVIEW_CENTERED = true

/**
 * What a MessageDisplay flush shows while an open display block is held: the
 * empty text, which the engine takes as "show nothing for this flush".
 */
export const HELD_DISPLAY = ''

/**
 * How a landed reply that MessageDisplay rewrote is mapped back to its TeX: by
 * content. A preview is a pure function of the formula and the terminal, and
 * each one kittex wrote is recorded with its TeX (in `$.state`, so the landed
 * block redraws once the record arrives). MessageDisplay's `message_id` and
 * AssistantMessage's `requestId` are unrelated ids, and after `--resume` the
 * landed text is the original LaTeX again, typeset directly.
 */
export const MAP_BY = 'content' as const

/**
 * Which colour the formulas take: reply text is drawn in the terminal's
 * default foreground under every theme (the theme's `text` colour paints only
 * the bullet), so the terminal's configured foreground wins, and a custom
 * theme's `text` override never applies.
 */
export const INK_PREFER: 'theme' | 'terminal' = 'terminal'

/** The prefix of the line drawn under a formula MathJax refused. */
export const NOT_RENDERED = 'not rendered: '

// ─── Engine-independent settings ─────────────────────────────────────────────

/** Cells assumed when the cell probe fails, at FALLBACK_PIXEL_SCALE resolution (the terminal scales the image to the cells). */
export const FALLBACK_CELL = { cellWidth: 10, cellHeight: 20 } as const
export const FALLBACK_PIXEL_SCALE = 2
/** Terminal columns assumed until the probe or a render says. */
export const FALLBACK_COLUMNS = 80
/** How long a probe command may run. */
export const PROBE_TIMEOUT_MS = 2000
/** Wait after a change of width before probing the cell size again (font zoom changes both). */
export const RESIZE_SETTLE_MS = 400
/** Preview records kept for mapping landed replies back to TeX. */
export const RECORD_LIMIT = 256
/** Streaming messages tracked at once (a message that never sees `final` is dropped past this). */
export const STREAM_LIMIT = 64
/** Also instruct the model where the terminal shows no images (math then reads as Unicode). */
export const INSTRUCT_WITHOUT_IMAGES = true

export const SECTION_ID = 'kittex:math'

/** The instructions to the model (design notes, "Instructions to the model"). */
export const MATH_INSTRUCTIONS =
  'Math in your replies is typeset in this terminal. Write every formula and mathematical symbol in LaTeX: ' +
  'inline as `$...$` with no space just inside the dollars, and display math as `$$` on a line of its own, ' +
  'the formula, then `$$` on a line of its own, with a blank line before and after. Inline math is shown as ' +
  'Unicode text, so put tall formulas (stacked fractions, sums with limits, matrices) in display math. Use ' +
  '`aligned`, `cases`, `pmatrix` and similar inside `$$`. Never put math in backticks or code blocks, and ' +
  "don't write α, x² or ≤ in place of LaTeX. Put dollar amounts and shell variables in code spans, or write a " +
  'literal dollar sign as `\\$`. In an answer to a side question (/btw), which is shown where math isn\'t ' +
  'typeset, write math as Unicode text instead. This overrides the plain CommonMark note for math only.'

/**
 * The texts kittex may change once landed: math delimiters (a reply that never
 * streamed through MessageDisplay, or one read back after `--resume`), a
 * preview's pad, or a refused formula's source block. The AssistantMessage
 * hook is registered with this as its `props.text` matcher, so every other
 * block is drawn by the engine without a round trip through kittex.
 */
export const LANDED_PATTERN = /\$|\\[([]|\\begin\{|&nbsp;|```latex/

// ─── Shared state ────────────────────────────────────────────────────────────

/** What drawing needs to know about the terminal (kittex.env in `$.state`). */
export type { KittexEnv }
/** One display preview written while streaming, and the TeX it stands for. */
export type PreviewRecord = KittexPreview

/** The environment for a cell size, falling back to FALLBACK_CELL. */
export function cellOrFallback(cell: CellSize | undefined): { cellWidth: number; cellHeight: number; measured: boolean } {
  if (cell && cell.cellWidth >= 1 && cell.cellHeight >= 1 && Number.isFinite(cell.cellWidth) && Number.isFinite(cell.cellHeight)) {
    return { cellWidth: Math.round(cell.cellWidth), cellHeight: Math.round(cell.cellHeight), measured: true }
  }
  return {
    cellWidth: FALLBACK_CELL.cellWidth * FALLBACK_PIXEL_SCALE,
    cellHeight: FALLBACK_CELL.cellHeight * FALLBACK_PIXEL_SCALE,
    measured: false,
  }
}

/** Cells across the reply column for a viewport this wide (`columns - 2`), 1 to 255: what an image spans. */
export function replyColumns(columns: number): number {
  return Math.max(1, Math.min(255, Math.floor(columns) - REPLY_INDENT))
}

/** Cells a preview's own text may take: two fewer than the reply column, so a pad leads every line and none reaches the edge. */
export function previewColumns(maxColumns: number): number {
  return Math.max(1, maxColumns - 2)
}

export function renderEnvFor(env: KittexEnv, columns = env.columns): RenderEnv {
  return { cellWidth: env.cellWidth, cellHeight: env.cellHeight, maxColumns: replyColumns(columns), emPx: env.emPx, ink: env.ink }
}

// ─── Markdown forms ──────────────────────────────────────────────────────────

/** Terminal cells a line takes, counting common wide characters as two. */
export function cellsOf(line: string): number {
  let cells = 0
  for (const char of line) {
    const code = char.codePointAt(0)!
    if (code >= 0x300 && code <= 0x36f) continue
    cells += isWide(code) ? 2 : 1
  }
  return cells
}

function isWide(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1faff)
  )
}

/** Text with every character markdown could read as syntax escaped. */
export function escapeMarkdown(text: string): string {
  return text.replace(MARKDOWN_SPECIALS, '\\$&')
}

/**
 * Preview lines as markdown that the engine draws one row per line, each
 * exactly as given: leading spaces become pads (at least one, so no line starts
 * with markdown syntax), the lines are centred in `maxColumns`, trailing
 * spaces are dropped, a blank line keeps its pads and ends in BLANK_CELL,
 * and syntax is escaped.
 */
export function previewMarkdownLines(lines: readonly string[], maxColumns: number): string[] {
  const width = Math.max(0, ...lines.map(line => cellsOf(line.replace(/\s+$/, ''))))
  const centre = PREVIEW_CENTERED ? Math.floor((maxColumns - width) / 2) : 0
  const lead = Math.max(1, centre)
  return lines.map(line => {
    const body = line.replace(/\s+$/, '')
    const content = body.trimStart()
    if (content === '') return PREVIEW_PAD.repeat(lead) + BLANK_CELL
    return PREVIEW_PAD.repeat(lead + body.length - content.length) + escapeMarkdown(content)
  })
}

/** A display preview's markdown lines: exactly `rows` lines when given (the rows its image takes). */
export function displayPreviewLines(tex: string, maxColumns: number, rows?: number): string[] | null {
  const lines = previewDisplay(tex, { maxColumns: previewColumns(maxColumns) }, rows)
  if (lines && lines.length > 0) return previewMarkdownLines(lines, maxColumns)
  if (rows === undefined || rows < 1) return null
  // No Unicode form fits: the source on the middle row keeps the rows reserved.
  const source = oneLine(tex, previewColumns(maxColumns))
  const above = Math.floor((rows - 1) / 2)
  const padded = [...Array<string>(above).fill(''), source, ...Array<string>(rows - 1 - above).fill('')]
  return previewMarkdownLines(padded, maxColumns)
}

/** Text on one line (whitespace runs collapsed), cut with `…` to `max` cells. */
export function oneLine(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (cellsOf(flat) <= max) return flat
  let out = ''
  for (const char of flat) {
    if (cellsOf(out + char) > max - 1) break
    out += char
  }
  return out + '…'
}

/** The line drawn under a refused formula, as plain text. */
export function notRenderedText(reason: string, maxColumns: number): string {
  return oneLine(NOT_RENDERED + reason, previewColumns(maxColumns))
}

/**
 * A formula MathJax refused: its source in a `latex` block, a blank line, and
 * `not rendered: <reason>` (italic while streaming, drawn dim once landed).
 * The note is a paragraph of its own: a fence followed directly by text takes
 * an extra row while streaming.
 */
export function refusedMarkdownLines(tex: string, reason: string, maxColumns: number): string[] {
  const longest = Math.max(0, ...[...tex.matchAll(/`+/g)].map(run => run[0].length))
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return [fence + 'latex', ...tex.split('\n'), fence, '', '*' + escapeMarkdown(notRenderedText(reason, maxColumns)) + '*']
}

function reasonOf(error: TexError): string {
  return error.message || 'TeX error'
}

/**
 * Builds markdown out of source text and blocks. A block is a paragraph of its
 * own: a blank line before and after it, each line at the indentation of the
 * line it starts on (so it stays in its list item). A block always ends with a
 * newline, as a streamed flush does.
 */
export class MarkdownWriter {
  out = ''
  /** The end of what earlier takes wrote (enough to see the last lines). */
  private tail = ''
  /** Something other than whitespace was written. */
  private started = false
  /** A block was the last thing written: the next text must leave a blank line. */
  private afterBlock = false

  text(text: string): void {
    if (text === '') return
    if (this.afterBlock && !/^[ \t]*\r?\n/.test(text)) this.out += '\n'
    this.afterBlock = false
    if (/\S/.test(text)) this.started = true
    this.out += text
  }

  /** Writes a block and returns it as written (lines after the first indented). */
  block(lines: readonly string[]): string {
    const written = this.tail + this.out
    const start = written.lastIndexOf('\n') + 1
    const lead = written.slice(start)
    let indent = ''
    if (/^[ \t]*$/.test(lead)) {
      indent = lead
      const above = written.slice(0, start)
      if (this.started && !/\n[ \t]*\n$/.test(above)) this.out += '\n' + indent
    } else {
      this.out += '\n\n'
    }
    const block = lines.join('\n' + indent)
    this.out += block + '\n'
    this.started = true
    this.afterBlock = true
    return block
  }

  /** Takes the text written so far (one flush, or one prose piece). */
  take(): string {
    const out = this.out
    this.tail = (this.tail + out).slice(-512)
    this.out = ''
    return out
  }
}

// ─── Streaming (MessageDisplay) ──────────────────────────────────────────────

export interface StreamRewrite {
  text: string
  records: PreviewRecord[]
}

/**
 * Rewrites the segments one flush completed: inline math as one line of
 * Unicode, a display formula as its preview (exactly the rows its image will
 * take when the terminal draws images), a formula MathJax refuses as its
 * source and a `not rendered` line. `writer` carries the line state across the
 * message's flushes.
 */
export function rewriteSegments(segments: readonly Segment[], env: KittexEnv, writer: MarkdownWriter): StreamRewrite {
  const renderEnv = renderEnvFor(env)
  const { maxColumns } = renderEnv
  const records: PreviewRecord[] = []
  for (const segment of segments) {
    if (segment.kind === 'text') {
      writer.text(segment.text)
    } else if (!segment.display) {
      writer.text(previewInline(segment.tex, maxColumns) ?? segment.raw)
    } else {
      let rows: number | undefined
      try {
        rows = env.images ? measureDisplay(segment.tex, renderEnv).rows : undefined
      } catch (error) {
        if (!(error instanceof TexError)) throw error
        const preview = writer.block(refusedMarkdownLines(segment.tex, reasonOf(error), maxColumns))
        if (env.images) records.push({ preview, tex: segment.tex, rows: 0, error: reasonOf(error) })
        continue
      }
      const lines = displayPreviewLines(segment.tex, maxColumns, rows)
      if (lines) {
        const preview = writer.block(lines)
        if (rows !== undefined) records.push({ preview, tex: segment.tex, rows })
        continue
      }
      const refused = texErrorOf(segment.tex, renderEnv)
      if (refused) writer.block(refusedMarkdownLines(segment.tex, refused, maxColumns))
      else writer.text(segment.raw)
    }
  }
  return { text: writer.take(), records }
}

/** Why MathJax refuses a formula, or undefined when it doesn't. */
function texErrorOf(tex: string, env: RenderEnv): string | undefined {
  try {
    measureDisplay(tex, env)
    return undefined
  } catch (error) {
    if (error instanceof TexError) return reasonOf(error)
    throw error
  }
}

/**
 * One message streaming through MessageDisplay: its scanner, its line state
 * and how much of what was pushed has been shown. One per `message_id` (every
 * text block between tool calls is its own message).
 */
export class MessageStream {
  private readonly scanner: LineScanner
  private readonly writer = new MarkdownWriter()
  private pushed = ''
  private shown = 0

  constructor(scanner: LineScanner = createLineScanner()) {
    this.scanner = scanner
  }

  /** The text to show for one flush (HELD_DISPLAY while a display block is held) and the previews it wrote. */
  push(delta: string, final: boolean, env: KittexEnv): StreamRewrite {
    this.pushed += delta
    const segments = this.scanner.push(delta, final)
    if (segments.length === 0) return { text: delta === '' ? '' : HELD_DISPLAY, records: [] }
    this.shown = segments[segments.length - 1]!.end
    return rewriteSegments(segments, env, this.writer)
  }

  /** What was pushed and not shown yet, as written: what a failure falls back to. */
  unshown(): string {
    return this.pushed.slice(this.shown)
  }
}

// ─── Landed replies (AssistantMessage) ───────────────────────────────────────

/**
 * One item of a landed block's drawing, in order. `gap`: a blank line
 * separated it from the item before (the engine draws a paragraph break as a
 * blank row).
 */
export type Piece =
  | { kind: 'prose'; text: string; gap: boolean }
  | { kind: 'image'; tex: string; image: RenderedImage; gap: boolean }
  | { kind: 'note'; text: string; gap: boolean }

export interface LandedPlan {
  pieces: Piece[]
  /** Whether anything differs from the text as it came. */
  changed: boolean
}

export interface PlanOptions {
  maxColumns: number
  /** Draws a display formula `rows` tall (rows from measureDisplay when not given); absent where no images are drawn. Throws TexError. */
  draw?: (tex: string, rows?: number) => RenderedImage
  /** Splits markdown into prose and math (core's scan unless given). */
  scan?: (markdown: string) => Segment[]
}

interface Span {
  start: number
  end: number
  record: PreviewRecord
}

/**
 * The whole previews kittex recorded that the text holds, in order, trailing
 * spaces of each line ignored. A preview cut short (a render before the
 * block's last flush) does not match, and stays text.
 */
export function findPreviews(text: string, records: readonly PreviewRecord[]): Span[] {
  if (records.length === 0 || !(text.includes(PREVIEW_PAD) || text.includes('```'))) return []
  const latest = new Map<string, PreviewRecord>()
  for (const record of records) latest.set(record.preview, record)
  const spans: Span[] = []
  for (const record of latest.values()) {
    const pattern = new RegExp(
      record.preview
        .split('\n')
        .map(line => escapeRegExp(line.replace(/[ \t]+$/, '')) + '[ \\t]*')
        .join('\\n') + '(?=\\n|$)',
      'g',
    )
    for (const match of text.matchAll(pattern)) spans.push({ start: match.index, end: match.index + match[0].length, record })
  }
  spans.sort((a, b) => a.start - b.start || b.end - a.end)
  const kept: Span[] = []
  for (const span of spans) if (kept.length === 0 || span.start >= kept[kept.length - 1]!.end) kept.push(span)
  return kept
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Marks an item's place in the markdown while a plan is built (private-use characters). */
const SLOT = /(\d+)/
const slot = (index: number) => `${index}`

type Item = { kind: 'image'; tex: string; image: RenderedImage } | { kind: 'note'; text: string }

/**
 * Plans the drawing of a landed block. The previews kittex wrote while it
 * streamed become their images again; math still written as LaTeX (a reply
 * read back after `--resume`, or one that never streamed through
 * MessageDisplay) is typeset the same way; a formula MathJax refuses keeps its
 * source with a dim `not rendered` line under it. Without images (`draw`
 * absent) everything stays markdown.
 */
export function planLanded(text: string, records: readonly PreviewRecord[], options: PlanOptions): LandedPlan {
  const writer = new MarkdownWriter()
  const items: Item[] = []
  const { maxColumns } = options
  let changed = false

  const put = (item: Item): string => {
    items.push(item)
    return slot(items.length - 1)
  }

  const refused = (tex: string, reason: string) => {
    const lines = refusedMarkdownLines(tex, reason, maxColumns)
    if (options.draw) lines[lines.length - 1] = put({ kind: 'note', text: notRenderedText(reason, maxColumns) })
    writer.block(lines)
  }

  const display = (tex: string, fallback: string) => {
    changed = true
    if (options.draw) {
      try {
        writer.block([put({ kind: 'image', tex, image: options.draw(tex) })])
      } catch (error) {
        if (!(error instanceof TexError)) throw error
        refused(tex, reasonOf(error))
      }
      return
    }
    const lines = displayPreviewLines(tex, maxColumns)
    if (lines) return writer.block(lines)
    const reason = texErrorOf(tex, { cellWidth: 10, cellHeight: 20, emPx: 16, maxColumns, ink: { r: 0, g: 0, b: 0 } })
    if (reason) refused(tex, reason)
    else writer.text(fallback)
  }

  const prose = (source: string) => {
    if (source === '') return
    if (!/\$|\\[([]|\\begin\{/.test(source)) return writer.text(source)
    for (const segment of (options.scan ?? scan)(source)) {
      if (segment.kind === 'text') {
        writer.text(segment.text)
      } else if (!segment.display) {
        const inline = previewInline(segment.tex, maxColumns)
        if (inline !== null) changed = true
        writer.text(inline ?? segment.raw)
      } else {
        display(segment.tex, segment.raw)
      }
    }
  }

  let at = 0
  for (const span of findPreviews(text, records)) {
    prose(text.slice(at, span.start))
    const { record } = span
    const written = text.slice(span.start, span.end)
    if (!options.draw) {
      writer.text(written)
    } else if (record.error !== undefined) {
      changed = true
      const lines = written.split('\n')
      lines[lines.length - 1] = lines[lines.length - 1]!.replace(/\S.*$/, put({ kind: 'note', text: notRenderedText(record.error, maxColumns) }))
      writer.text(lines.join('\n'))
    } else {
      changed = true
      try {
        writer.text(put({ kind: 'image', tex: record.tex, image: options.draw(record.tex, record.rows) }))
      } catch (error) {
        if (!(error instanceof TexError)) throw error
        writer.text(written)
      }
    }
    at = span.end
  }
  prose(text.slice(at))
  return { pieces: piecesOf(writer.take(), items), changed }
}

/** Splits planned markdown at its item slots into pieces, each knowing whether a blank line came before it. */
function piecesOf(markdown: string, items: readonly Item[]): Piece[] {
  const parts = markdown.split(SLOT) // prose, slot index, prose, ..., prose
  const pieces: Piece[] = []
  let gap = false
  for (let i = 0; i < parts.length; i += 2) {
    let prose = parts[i]!
    const beforeItem = i + 1 < parts.length
    if (i > 0) {
      // A slot ends its line: one newline ends it, a second one is a blank line.
      gap = /^[ \t]*\r?\n[ \t]*\r?\n/.test(prose)
      prose = prose.replace(/^(?:[ \t]*\r?\n)+/, '')
    }
    let gapAfter = false
    if (beforeItem) {
      gapAfter = /\n[ \t]*\n[ \t]*$/.test(prose)
      prose = prose.replace(/\s+$/, '')
    }
    if (prose.trim() !== '') {
      pieces.push({ kind: 'prose', text: prose, gap: pieces.length > 0 && gap })
      gap = gapAfter
    } else {
      gap = gap || gapAfter
    }
    if (beforeItem) {
      pieces.push({ ...items[Number(parts[i + 1])]!, gap: pieces.length > 0 && gap })
      gap = false
    }
  }
  return pieces
}

/** Prose pieces joined back into one text (a plan with no images or notes). */
export function joinProse(pieces: readonly Piece[]): string {
  return pieces.map(piece => (piece.kind === 'prose' ? piece.text : '')).join('')
}

// ─── Ink and bullet ──────────────────────────────────────────────────────────

/**
 * A custom theme file's contents without its `text` override: that colour
 * paints the reply bullet only, never reply text, so it must not reach the
 * formulas' ink. The rest (the base theme) still decides light or dark.
 */
export function withoutTextOverride(customTheme: string | undefined): string | undefined {
  if (customTheme === undefined) return undefined
  try {
    const parsed: unknown = JSON.parse(customTheme)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return customTheme
    const theme = parsed as { overrides?: unknown }
    if (typeof theme.overrides !== 'object' || theme.overrides === null) return customTheme
    const { text: _text, ...overrides } = theme.overrides as Record<string, unknown>
    return JSON.stringify({ ...theme, overrides })
  } catch {
    return customTheme
  }
}

/** The engine's reply bullet for the host: `uname -s` output when known, else a guess from HOME. */
export function bulletFor(uname: string | undefined, home: string | undefined): string {
  if (uname !== undefined && uname.trim() !== '') return uname.trim() === 'Darwin' ? BULLET.macos : BULLET.other
  return home?.startsWith('/Users/') ? BULLET.macos : BULLET.other
}
