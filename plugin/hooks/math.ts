// kittex's pure side: the constants, the streaming rewrite and the plan of a
// landed reply. Nothing here takes `$` (it cannot cross an import); register.tsx
// does the I/O and hands these functions plain values.

import { createLineScanner, measureDisplay, previewDisplay, previewInline, scan, TexError } from './core.js'
import type { CellSize, LineScanner, RenderedImage, RenderEnv, Segment } from './core.js'
import type { KittexEnv, KittexPreview } from '../types'

// ─── Guesses, to be settled by the engine probe (research/engine-probe) ──────

/**
 * Columns the terminal draws reply text in from the left edge: the bullet and
 * its space (`⏺ `). A display image is indented by this much to line up with
 * the text above and below it. GUESS: 2, from how replies look.
 */
export const REPLY_INDENT = 2

/**
 * Columns kept free at the right of the reply column, so a preview line or an
 * image never touches the edge and wraps. GUESS: 1, a safety margin.
 */
export const REPLY_RIGHT_MARGIN = 1

/**
 * How the streaming preview of a display formula is written into the reply's
 * markdown: a fenced code block with this info string, its lines verbatim.
 * `text` keeps the highlighter from colouring the symbols. GUESS: the engine
 * draws a fenced block with no fence rows, no label and no padding, one row
 * per line.
 */
export const PREVIEW_FENCE_INFO = 'text'

/**
 * Rows the preview's form adds around its lines on screen (fence rows, a
 * label, padding). The preview is given `rows - PREVIEW_OVERHEAD_ROWS` lines so
 * that it takes exactly the rows its image will. GUESS: 0 (see above).
 */
export const PREVIEW_OVERHEAD_ROWS = 0

/** Whether the preview lines are centred in the reply column, as the image's formula is. */
export const PREVIEW_CENTERED = true

/**
 * What a MessageDisplay flush shows while an open display block is held: the
 * empty text. GUESS: the engine takes `''` as "show nothing for this flush"
 * rather than as "no rewrite".
 */
export const HELD_DISPLAY = ''

/**
 * Blank rows above a display image when a landed reply is redrawn as engine
 * drawings and images. The preview sits in its own markdown block, which the
 * engine separates from the prose above by one blank row; each engine drawing
 * of a prose segment brings its own blank row above it (the row 0 of a
 * message, per OnScreen's doc), so the image needs one above and none below.
 * GUESS on both counts.
 */
export const IMAGE_MARGIN_TOP = 1
export const IMAGE_MARGIN_BOTTOM = 0

/**
 * How a landed reply that MessageDisplay rewrote is mapped back to its TeX:
 * by content. Each preview kittex wrote is recorded with its TeX (in
 * `$.state`, so the landed message redraws once the record arrives), and the
 * landed text is searched for those previews, trailing spaces of each line
 * ignored. Chosen because MessageDisplay's `message_id` and AssistantMessage's
 * `requestId` may not be the same id (an open question).
 */
export const MAP_BY = 'content' as const

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
  'Math in your replies is typeset in this terminal. Write every mathematical ' +
  'expression in LaTeX: inline as `$...$`, display as `$$` on a line of its own, ' +
  'the formula, then `$$` on a line of its own. Use `aligned`, `cases`, ' +
  '`pmatrix` and similar inside `$$` rather than bare environments. Never put ' +
  "math in backticks or code blocks, and don't write math with Unicode symbols. " +
  'Write a literal dollar sign as `\\$`. This overrides the plain CommonMark note ' +
  'for math only.'

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

/** Cells across the reply column for a viewport this wide, 1 to 255. */
export function replyColumns(columns: number): number {
  return Math.max(1, Math.min(255, Math.floor(columns) - REPLY_INDENT - REPLY_RIGHT_MARGIN))
}

export function renderEnvFor(env: KittexEnv, columns = env.columns): RenderEnv {
  return { cellWidth: env.cellWidth, cellHeight: env.cellHeight, maxColumns: replyColumns(columns), emPx: env.emPx, ink: env.ink }
}

/** Cheap test for text kittex might change: math delimiters or a fenced block (a preview). */
export function mayHoldMath(text: string): boolean {
  return /\$|\\[([]|\\begin\{|```/.test(text)
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

/** A display preview's lines in the preview form (see PREVIEW_FENCE_INFO), with no trailing newline. */
export function previewMarkdown(lines: readonly string[], maxColumns: number): string {
  const width = Math.max(0, ...lines.map(cellsOf))
  const pad = PREVIEW_CENTERED ? ' '.repeat(Math.max(0, Math.floor((maxColumns - width) / 2))) : ''
  return ['```' + PREVIEW_FENCE_INFO, ...lines.map(line => pad + line), '```'].join('\n')
}

/** A formula MathJax refused, shown as its source. */
export function latexFence(tex: string): string {
  return '```latex\n' + tex + '\n```'
}

/**
 * Builds markdown out of source text and blocks. A block starts on a line of
 * its own (at the indentation of the formula it replaces, so it stays in its
 * list item) and is followed by a line break.
 */
export class MarkdownWriter {
  out = ''
  /** A block was the last thing written: the next text must start a new line. */
  needBreak = false
  /** The unfinished line that earlier pieces (taken) ended with. */
  private carry = ''

  text(text: string): void {
    if (text === '') return
    if (this.needBreak && !text.startsWith('\n') && !text.startsWith('\r\n')) this.out += '\n'
    this.needBreak = false
    this.out += text
  }

  /** Writes a block and returns it as written (indented). */
  block(markdown: string): string {
    if (this.needBreak) this.out += '\n'
    const written = this.carry + this.out
    const lead = written.slice(written.lastIndexOf('\n') + 1)
    let indent = ''
    if (/^[ \t]*$/.test(lead)) indent = lead
    else this.out += '\n'
    const block = markdown.split('\n').join('\n' + indent)
    this.out += block
    this.needBreak = true
    return block
  }

  /** Takes the text written so far (one flush, or one prose piece). */
  take(): string {
    const out = this.out
    const written = this.carry + out
    this.carry = written.slice(written.lastIndexOf('\n') + 1)
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
 * Unicode, a display formula as its preview (padded to the rows its image will
 * take when the terminal draws images), a formula MathJax refuses as a `latex`
 * block. `writer` carries the line state across the message's flushes.
 */
export function rewriteSegments(segments: readonly Segment[], env: KittexEnv, writer: MarkdownWriter): StreamRewrite {
  const renderEnv = renderEnvFor(env)
  const records: PreviewRecord[] = []
  for (const segment of segments) {
    if (segment.kind === 'text') {
      writer.text(segment.text)
    } else if (!segment.display) {
      writer.text(previewInline(segment.tex, renderEnv.maxColumns) ?? segment.raw)
    } else if (env.images) {
      let rows: number
      try {
        rows = measureDisplay(segment.tex, renderEnv).rows
      } catch (error) {
        if (!(error instanceof TexError)) throw error
        writer.block(latexFence(segment.tex))
        continue
      }
      const lines = previewDisplay(segment.tex, renderEnv, rows - PREVIEW_OVERHEAD_ROWS)
      if (lines && lines.length > 0) {
        const preview = writer.block(previewMarkdown(lines, renderEnv.maxColumns))
        records.push({ preview, tex: segment.tex, rows })
      } else {
        writer.text(segment.raw)
      }
    } else {
      const lines = previewDisplay(segment.tex, renderEnv)
      if (lines && lines.length > 0) writer.block(previewMarkdown(lines, renderEnv.maxColumns))
      else writer.text(segment.raw)
    }
  }
  return { text: writer.take(), records }
}

/**
 * One message streaming through MessageDisplay: its scanner, its line state
 * and how much of what was pushed has been shown.
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

export type Piece = { kind: 'prose'; text: string } | { kind: 'image'; tex: string; image: RenderedImage }

export interface LandedPlan {
  pieces: Piece[]
  /** Whether anything differs from the text as it came. */
  changed: boolean
}

export interface PlanOptions {
  maxColumns: number
  /** Draws a display formula at least `minRows` tall; absent where no images are drawn. Throws TexError. */
  draw?: (tex: string, minRows?: number) => RenderedImage
  /** Splits markdown into prose and math (core's scan unless given). */
  scan?: (markdown: string) => Segment[]
}

interface Span {
  start: number
  end: number
  record: PreviewRecord
}

/** The previews kittex recorded that the text holds, in order, trailing spaces of each line ignored. */
export function findPreviews(text: string, records: readonly PreviewRecord[]): Span[] {
  if (records.length === 0 || !text.includes('```')) return []
  const latest = new Map<string, PreviewRecord>()
  for (const record of records) latest.set(record.preview, record)
  const spans: Span[] = []
  for (const record of latest.values()) {
    const pattern = new RegExp(
      record.preview
        .split('\n')
        .map(line => escapeRegExp(line.replace(/[ \t]+$/, '')) + '[ \\t]*')
        .join('\\n'),
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

/**
 * Plans the drawing of a landed reply: the previews kittex wrote while it
 * streamed become their images again (or, with no images, previews without the
 * row padding), and math still written as LaTeX (a reply that never streamed
 * through MessageDisplay) is typeset the same way.
 */
export function planLanded(text: string, records: readonly PreviewRecord[], options: PlanOptions): LandedPlan {
  const pieces: Piece[] = []
  const writer = new MarkdownWriter()
  let changed = false

  const flush = () => {
    const prose = writer.take()
    if (prose !== '') pieces.push({ kind: 'prose', text: prose })
  }

  const display = (tex: string, fallback: string, minRows?: number) => {
    if (options.draw) {
      try {
        const image = options.draw(tex, minRows)
        flush()
        writer.needBreak = false
        pieces.push({ kind: 'image', tex, image })
      } catch (error) {
        if (!(error instanceof TexError)) throw error
        writer.block(latexFence(tex))
      }
      return
    }
    const lines = previewDisplay(tex, { maxColumns: options.maxColumns })
    if (lines && lines.length > 0) writer.block(previewMarkdown(lines, options.maxColumns))
    else writer.text(fallback)
  }

  const prose = (source: string) => {
    if (source === '') return
    if (!/\$|\\[([]|\\begin\{/.test(source)) return writer.text(source)
    for (const segment of (options.scan ?? scan)(source)) {
      if (segment.kind === 'text') {
        writer.text(segment.text)
      } else if (!segment.display) {
        const inline = previewInline(segment.tex, options.maxColumns)
        if (inline !== null) changed = true
        writer.text(inline ?? segment.raw)
      } else {
        changed = true
        display(segment.tex, segment.raw)
      }
    }
  }

  let at = 0
  for (const span of findPreviews(text, records)) {
    prose(text.slice(at, span.start))
    changed = true
    display(span.record.tex, text.slice(span.start, span.end), span.record.rows)
    at = span.end
  }
  prose(text.slice(at))
  flush()
  return { pieces, changed }
}

/** Drops the blank lines around prose that borders an image (the image keeps its own margins) and prose left empty. */
export function trimPieces(pieces: readonly Piece[]): Piece[] {
  const out: Piece[] = []
  for (const [i, piece] of pieces.entries()) {
    if (piece.kind === 'image') {
      out.push(piece)
      continue
    }
    let text = piece.text
    if (pieces[i - 1]?.kind === 'image') text = text.replace(/^(?:[ \t]*\r?\n)+/, '')
    if (pieces[i + 1]?.kind === 'image') text = text.replace(/\s+$/, '')
    if (text.trim() !== '') out.push({ kind: 'prose', text })
  }
  return out
}

/** Prose pieces joined back into one text (a plan with no images). */
export function joinProse(pieces: readonly Piece[]): string {
  return pieces.map(piece => (piece.kind === 'prose' ? piece.text : '')).join('')
}
