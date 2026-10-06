// kittex's pure side: the constants, the streaming rewrite and the plan of a
// landed reply. Nothing here takes `$` (it cannot cross an import); register.tsx
// does the I/O and hands these functions plain values.
//
// The layout rules below were measured on the live engine (Claude Code
// 2.1.290 and 2.1.291); docs/engine-findings.md has the recordings.

import {
  createLineScanner,
  engineHyperlinks,
  layoutList,
  layoutProse,
  measureDisplay,
  measureInline,
  previewDisplay,
  GlyphError,
  previewInline,
  proseBlocks,
  scan,
  TexError,
  textWidth,
} from './core.js'
import type { CellSize, InlineEnv, LineScanner, LinkMode, RenderedImage, RenderEnv, Segment, SourceSpan } from './core.js'
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

/** The label of the copy button shown over a formula image while the pointer is on it. */
export const COPY_LABEL = '⧉ copy LaTeX'

/** What the copy button puts on the clipboard: the formula as a display block, ready to paste back into markdown. */
export function copiedFormula(tex: string): string {
  return `$$\n${tex.trim()}\n$$`
}

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

/**
 * Where inline images put the math baseline in a cell, from the top, as a
 * fraction of the cell's height. The terminal font's own baseline is 21 px down
 * a 13×26 px cell in kitty (DejaVu Sans Mono: glyphs reach 16 px above it and 4
 * below); one pixel higher leaves room under it for brackets, bars and \ne at
 * 0.91 of the display size, so every inline formula draws as an image at one
 * size instead of bracketed ones staying Unicode. The pixel is not visible at
 * normal size.
 */
export const TEXT_BASELINE = 20 / 26

/**
 * What joins the words of an inline preview: a no-break space, one cell that
 * the engine's word wrap (Bun.wrapAnsi, which splits at U+0020 alone) never
 * breaks at, and that marked and the engine draw as it is. Measured live.
 */
export const INLINE_JOIN = '\u00a0'

/**
 * What pads an inline preview to its image's width: U+2800, a blank cell that
 * neither breaks a line nor counts as whitespace, so emphasis closing right
 * after a formula (`*… $x$*`) still closes, and no trim takes it.
 */
export const INLINE_PAD = BLANK_CELL

/**
 * What marks an inline preview that holds neither a join nor a pad (its
 * Unicode as wide as its image, one word): U+034F, a combining mark of no
 * width that the engine, kitty and Ghostty draw as nothing, so the preview is
 * found again by its content without a blank cell after the image.
 */
export const INLINE_MARK = '\u034f'

/**
 * The ASCII inline Unicode escapes, padded or not (markdown could read it as
 * syntax: `_(…)` and `B*A*` as emphasis, a `|` as a table cell's end, `[a](b)`
 * as a link). Each is one that makes the engine read the text as markdown at
 * all, so the escape is always read as one, never drawn as a backslash; a `]`
 * or a `<` is not (in a text the engine draws as written its escape would
 * show), and needs none: `[` is escaped, so no link opens, and a `<` that
 * could open a tag is kept apart from the letter after it (inlineUnicode).
 */
export const INLINE_SPECIALS = /[`*_[|~#>]/g

/** A `<` the engine's markdown could read as the start of a tag. */
const TAG_OPEN = /<[A-Za-z/!?]/

/** Inline Unicode with its markdown syntax escaped (INLINE_SPECIALS). */
export function escapeInline(text: string): string {
  return text.replace(INLINE_SPECIALS, '\\$&')
}

/**
 * An inline formula as the reader sees it where it stays text (no image: a
 * terminal without images, a block the replay doesn't follow, math read back
 * after `--resume`): one line of Unicode with TeX's spacing (a relation keeps
 * its spaces, so a `<` never touches a letter), at any width (prose wraps),
 * escaped; null where Unicode has no one-line form.
 */
export function inlineText(tex: string): string | null {
  const unicode = previewInline(tex, undefined, { tight: false })
  return unicode === null ? null : escapeInline(unicode)
}

/**
 * Rows from the top of a prose piece's drawing (a `next()` result) to its first
 * row of text: the one-row top margin every AssistantMessage drawing brings.
 */
export const PIECE_TOP = 1

// ─── Engine-independent settings ─────────────────────────────────────────────

/** Cells assumed when the cell probe fails, at FALLBACK_PIXEL_SCALE resolution (the terminal scales the image to the cells). */
export const FALLBACK_CELL = { cellWidth: 10, cellHeight: 20 } as const
export const FALLBACK_PIXEL_SCALE = 2
/** Terminal columns assumed until the probe or a render says. */
export const FALLBACK_COLUMNS = 80
/** How long a probe command may run. */
export const PROBE_TIMEOUT_MS = 2000
/**
 * Wait after the last change of width before probing the cell size once more
 * (a font zoom changes both); every change restarts it, so a drag ends with
 * the final size.
 */
export const RESIZE_SETTLE_MS = 400
/**
 * How often the cell size is probed once an image has been drawn: a move to a
 * monitor of another scale changes the cells' pixels and may keep the width,
 * so no render says so. A probe is one short process.
 */
export const CELL_POLL_MS = 2500
/** Formula images kept drawn, by formula and geometry (a long reply holds hundreds, inline ones included). */
export const IMAGE_LIMIT = 1024
/** Preview records kept for mapping landed replies back to TeX (inline ones included). */
export const RECORD_LIMIT = 512
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
 * display preview's pad, an inline preview's join or pad, or a refused
 * formula's source block. The AssistantMessage
 * hook is registered with this as its `props.text` matcher, so every other
 * block is drawn by the engine without a round trip through kittex.
 */
export const LANDED_PATTERN = /\$|\\[([]|\\begin\{|&nbsp;|```latex|\u00a0|\u2800|\u034f/

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

/** Where inline formulas are drawn: one text row, the math on the font's baseline. */
export function inlineEnvFor(env: KittexEnv, columns = env.columns): InlineEnv {
  return { ...renderEnvFor(env, columns), baselinePx: Math.round(env.cellHeight * TEXT_BASELINE) }
}

/**
 * The cells a display preview (and its image) takes in a blockquote `depth`
 * deep: the engine draws a quote's text two cells in (a bar and a space),
 * at most maxProseWidth wide.
 */
export function quoteColumns(env: KittexEnv, depth: number, columns = env.columns): number {
  return Math.max(1, proseWidthFor(env, columns) - 2 * depth)
}

/**
 * How the engine draws links in a terminal with these variables (as OSC 8
 * hyperlinks, or as text with the url beside it), for KittexEnv; nothing when
 * that isn't known, and links then keep their paragraph's math Unicode.
 */
export function linkEnv(variables: Readonly<Record<string, string | undefined>>): Pick<KittexEnv, 'hyperlinks'> {
  const hyperlinks = engineHyperlinks(variables)
  return hyperlinks === undefined ? {} : { hyperlinks }
}

/** The width reply prose wraps at: the reply column, or `maxProseWidth` when that is narrower. */
export function proseWidthFor(env: KittexEnv, columns = env.columns): number {
  const reply = replyColumns(columns)
  return env.maxProseWidth !== undefined && env.maxProseWidth >= 1 ? Math.min(reply, Math.floor(env.maxProseWidth)) : reply
}

/** What a streamed message is rewritten for: the terminal, and whether inline math becomes images. */
export type StreamEnv = KittexEnv & {
  /** Inline math is drawn as images (the `inline` option, where the terminal draws images). */
  inline?: boolean
}

/**
 * An inline formula as it is written while it streams, when it will be drawn
 * as an image once landed: its one-line Unicode, words joined by INLINE_JOIN,
 * padded with INLINE_PAD to exactly the image's columns (the image is widened
 * instead when the Unicode is wider; one that holds neither a join nor a pad
 * ends with INLINE_MARK: a preview is found again by its content), markdown
 * syntax escaped.
 */
export interface InlinePreview {
  markdown: string
  tex: string
  columns: number
}

/**
 * The preview of an inline formula drawn as an image, or null when it stays
 * plain Unicode: too tall for a row (see measureInline), refused by MathJax,
 * wider than a row of prose (`rowWidth`), no one-line Unicode, a character whose
 * width isn't certain, or a backslash.
 */
export function inlinePreview(tex: string, env: InlineEnv, rowWidth = env.maxColumns): InlinePreview | null {
  // Tight, so the text is no wider than the image; spaced where tight would put a `<` against a letter.
  let unicode = previewInline(tex, env.maxColumns)?.trim()
  if (unicode && TAG_OPEN.test(unicode)) unicode = previewInline(tex, env.maxColumns, { tight: false })?.trim()
  if (unicode && TAG_OPEN.test(unicode)) return null
  if (!unicode || /[\\\s]/.test(unicode.replaceAll(' ', ''))) return null
  const width = textWidth(unicode)
  if (width < 1) return null
  const box = measureInline(tex, env)
  if (!box) return null
  const columns = Math.max(box.columns, width)
  // The image is drawn on one row: wider than prose wraps, it could never be placed.
  if (columns > Math.min(255, env.maxColumns, rowWidth)) return null
  const body = escapeInline(unicode.replaceAll(' ', INLINE_JOIN))
  const mark = columns === width && !unicode.includes(' ') ? INLINE_MARK : ''
  return { markdown: body + mark + INLINE_PAD.repeat(columns - width), tex, columns }
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
  if (lines && lines.length > 0) return previewMarkdownLines(spreadRows(lines, tex), maxColumns)
  if (rows === undefined || rows < 1) return null
  // No Unicode form fits: the source on the middle row keeps the rows reserved.
  const source = oneLine(tex, previewColumns(maxColumns))
  const above = Math.floor((rows - 1) / 2)
  const padded = [...Array<string>(above).fill(''), source, ...Array<string>(rows - 1 - above).fill('')]
  return previewMarkdownLines(padded, maxColumns)
}

/**
 * A preview with a line per row of a tall environment (`aligned`, `gathered`,
 * a derivation), padded to its image's rows with more blank rows than it has
 * lines, spread over the image's height: each line about where its row of the
 * image will be, instead of a block in the middle with blank slabs above and
 * below (stress report F18). Anything else is returned as it is.
 */
export function spreadRows(lines: readonly string[], tex: string): readonly string[] {
  const blank = (line: string) => line.trim() === ''
  const first = lines.findIndex(line => !blank(line))
  const last = lines.findLastIndex(line => !blank(line))
  if (first < 0) return lines
  const content = lines.slice(first, last + 1)
  const rows = lines.length
  if (content.length < 3 || content.some(blank) || rows - content.length < content.length) return lines
  // One line per row of the environment: as many lines as the formula has rows (its `\\`s, none nested).
  const body = /^\s*\\begin\{(aligned|align\*?|gathered|gather\*?|split|eqnarray\*?|multline\*?)\}([\s\S]*)\\end\{\1\}\s*$/.exec(tex)?.[2]
  if (body === undefined || /\\begin\{/.test(body)) return lines
  if (body.replace(/\\\\\s*$/, '').split('\\\\').length !== content.length) return lines
  const width = Math.max(...content.map(line => line.length))
  const out = Array.from({ length: rows }, () => ' '.repeat(width))
  for (const [i, line] of content.entries()) out[Math.floor(((i + 0.5) * rows) / content.length)] = line
  return out
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

/** A line's start that only opens blockquotes (`> `, `>> `, `> > `). */
const QUOTE_LEAD = /^[ \t]{0,3}(?:>[ \t]?)+$/

/** How much of what a writer took it keeps for reading the block being written (a long list included). */
const WRITER_TAIL = 2048

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
  /** The blockquote prefix the last block was written under ('' outside a quote). */
  private quote = ''

  text(text: string): void {
    if (text === '') return
    if (this.afterBlock && this.quote !== '') {
      // In a quote the blank line after a block is a `>` line: a bare one would end the quote.
      if (/^[ \t]*\r?\n[ \t]*(?:>[ \t]*)+\r?\n/.test(text)) text = text.replace(/^[ \t]*\r?\n/, '')
      else this.out += this.quote.trimEnd() + (/^[ \t]*\r?\n/.test(text) ? '' : '\n')
    } else if (this.afterBlock && !/^[ \t]*\r?\n/.test(text)) {
      this.out += '\n'
    }
    this.afterBlock = false
    if (/\S/.test(text)) this.started = true
    this.out += text
  }

  /**
   * Writes a block and returns it as written (lines after the first indented,
   * or under the blockquote prefix the line it starts on opens with).
   */
  block(lines: readonly string[]): string {
    const written = this.tail + this.out
    const start = written.lastIndexOf('\n') + 1
    const lead = written.slice(start)
    let indent = ''
    this.quote = ''
    if (/^[ \t]*$/.test(lead)) {
      indent = lead
      const above = written.slice(0, start)
      if (this.started && !/\n[ \t]*\n$/.test(above)) this.out += '\n' + indent
    } else if (QUOTE_LEAD.test(lead)) {
      // A paragraph of its own inside the quote: a `>` line above it unless one is there.
      indent = lead
      this.quote = lead
      const above = written.slice(0, start)
      if (this.started && !/(?:^|\n)[ \t]*(?:>[ \t]*)+\n$/.test(above)) this.out += '\n' + indent
    } else {
      this.out += '\n\n'
    }
    const block = lines.join('\n' + indent)
    this.out += block + '\n'
    this.started = true
    this.afterBlock = true
    return block
  }

  /** How many blockquotes deep the line being written is (its `>` prefix so far; 0 outside a quote). */
  quoteDepth(): number {
    const written = this.tail + this.out
    const lead = written.slice(written.lastIndexOf('\n') + 1)
    return QUOTE_LEAD.test(lead) ? (lead.match(/>/g) ?? []).length : 0
  }

  /** The end of everything written so far, earlier takes included: enough to see the block being written. */
  recent(): string {
    return this.tail + this.out
  }

  /** Takes the text written so far (one flush, or one prose piece). */
  take(): string {
    const out = this.out
    this.tail = (this.tail + out).slice(-WRITER_TAIL)
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
 * Unicode (padded to its image's width, with a record, when inline images are
 * on and the formula gets one), a display formula as its preview (exactly the rows its image will
 * take when the terminal draws images), a formula MathJax refuses as its
 * source and a `not rendered` line. `writer` carries the line state across the
 * message's flushes.
 */
export function rewriteSegments(segments: readonly Segment[], env: StreamEnv, writer: MarkdownWriter): StreamRewrite {
  const renderEnv = renderEnvFor(env)
  const { maxColumns } = renderEnv
  const records: PreviewRecord[] = []
  for (const segment of segments) {
    if (segment.kind === 'text') {
      writer.text(segment.text)
    } else if (!segment.display) {
      const inline =
        env.inline && env.images && placeable(writer.recent(), proseWidthFor(env), { hyperlinks: env.hyperlinks })
          ? inlinePreview(segment.tex, inlineEnvFor(env), proseWidthFor(env))
          : null
      if (inline) {
        writer.text(inline.markdown)
        records.push({ preview: inline.markdown, tex: segment.tex, rows: 1, inline: true, columns: inline.columns })
      } else {
        writer.text(inlineText(segment.tex) ?? segment.raw)
      }
    } else {
      // In a blockquote the preview stays inside it, as wide as the quote's text; one quote deep its image lies over it once landed.
      const quote = writer.quoteDepth()
      const width = quote > 0 ? quoteColumns(env, quote) : maxColumns
      const drawn = env.images && quote <= 1
      let rows: number | undefined
      try {
        rows = drawn ? measureDisplay(segment.tex, { ...renderEnv, maxColumns: width }).rows : undefined
      } catch (error) {
        if (!(error instanceof TexError)) throw error
        const preview = writer.block(refusedMarkdownLines(segment.tex, reasonOf(error), maxColumns))
        if (env.images) records.push({ preview, tex: segment.tex, rows: 0, error: reasonOf(error) })
        continue
      }
      const lines = displayPreviewLines(segment.tex, width, rows)
      if (lines) {
        const preview = writer.block(lines)
        if (rows !== undefined) records.push({ preview, tex: segment.tex, rows, ...(quote > 0 ? { quote } : {}) })
        continue
      }
      const refused = texErrorOf(segment.tex, renderEnv)
      if (refused) writer.block(refusedMarkdownLines(segment.tex, refused, maxColumns))
      else writer.text(segment.raw)
    }
  }
  return { text: writer.take(), records }
}

/**
 * Whether inline math written next, after `written`, lands in a block whose
 * inline previews get images at landing (proseBlocks, the rule the landed
 * drawing uses): a plain paragraph, or the text of a list item in a list the
 * replay follows so far (`width`: the width prose wraps at; `mode`: how the
 * engine draws links). Anywhere else (a heading, a quote, a table) the formula
 * is drawn as plain Unicode, so streaming writes it unpadded: padding there
 * would stay behind as gaps.
 */
export function placeable(written: string, width: number, mode: LinkMode = {}): boolean {
  // A table's first row reads as a paragraph until its delimiter row arrives.
  if (/^[ \t]*\|/.test(written.slice(written.lastIndexOf('\n') + 1))) return false
  // A stand-in for the formula, so the line it starts is part of the block read.
  const text = written + 'x'
  const last = proseBlocks(text)?.at(-1)
  if (last === undefined || last.end !== text.length) return false
  if (last.paragraph) return true
  return last.list === true && layoutList(text.slice(last.start, last.end), width, [], mode) !== null
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
  push(delta: string, final: boolean, env: StreamEnv): StreamRewrite {
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
  | { kind: 'prose'; text: string; gap: boolean; inline?: InlineImage[] }
  | { kind: 'image'; tex: string; image: RenderedImage; gap: boolean }
  | { kind: 'note'; text: string; gap: boolean }

/** Cells from a blockquote's edge to its text: the bar and a space (the engine's quote border and padding). */
export const QUOTE_INDENT = 2

/** An inline formula's image (or a quoted display formula's), drawn over its preview: the preview's row and column in its prose piece's drawing. */
export interface InlineImage {
  tex: string
  image: RenderedImage
  row: number
  col: number
}

export interface LandedPlan {
  pieces: Piece[]
  /** Whether anything differs from the text as it came. */
  changed: boolean
}

export interface PlanOptions {
  maxColumns: number
  /**
   * Draws a display formula `rows` tall (rows from measureDisplay when not
   * given), `maxColumns` wide when given (a quote's width); absent where no
   * images are drawn. Throws TexError.
   */
  draw?: (tex: string, rows?: number, maxColumns?: number) => RenderedImage
  /** The width prose wraps at (maxProseWidth included); maxColumns when absent. A quote's text is two cells narrower. */
  width?: number
  /** The rows a display formula's image takes `maxColumns` wide (measureDisplay); absent, a quoted formula keeps its preview. Throws TexError. */
  measure?: (tex: string, maxColumns: number) => number
  /** Splits markdown into prose and math (core's scan unless given). */
  scan?: (markdown: string) => Segment[]
  /**
   * Inline math drawn as images: where (one text row), the width prose wraps
   * at, and the drawing (throws TexError), and how the engine draws links
   * (`hyperlinks`, KittexEnv's). Absent: inline math stays Unicode.
   */
  inline?: { env: InlineEnv; width: number; draw: (tex: string, columns: number) => RenderedImage; hyperlinks?: boolean | undefined }
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
  for (const record of records) if (!record.inline) latest.set(record.preview, record)
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

/**
 * The inline previews kittex recorded that a prose text holds, in order (a
 * longer one wins where two overlap). Only previews written with a pad are
 * recorded, so plain text can't be taken for one.
 */
export function findInlinePreviews(text: string, records: readonly PreviewRecord[]): Span[] {
  const marked = (preview: string) => preview.includes(INLINE_PAD) || preview.includes(INLINE_JOIN) || preview.includes(INLINE_MARK)
  if (!marked(text)) return []
  const latest = new Map<string, PreviewRecord>()
  for (const record of records) if (record.inline && marked(record.preview)) latest.set(record.preview, record)
  const spans: Span[] = []
  for (const record of latest.values()) {
    for (let at = text.indexOf(record.preview); at >= 0; at = text.indexOf(record.preview, at + 1)) {
      spans.push({ start: at, end: at + record.preview.length, record })
    }
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

/** Marks an inline preview in planned markdown: open, its index, separator, the preview, close (private-use characters). */
const MARK_OPEN = '\ue002'
const MARK_SEP = '\ue003'
const MARK_CLOSE = '\ue004'
const MARK = /\ue002(\d+)\ue003([^\ue004]*)\ue004/g

interface InlineMark {
  tex: string
  columns: number
  /** What the formula is written as where it gets no image, when that may differ (math read back as LaTeX, never shown padded). */
  plain?: string
  /** A display preview inside a blockquote (one deep), its image `rows` tall drawn over it: no inline formula. */
  rows?: number
}

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

  // A display formula in a blockquote: its preview stays in the quote, as wide as the quote's text.
  const quoted = (tex: string, fallback: string, depth: number) => {
    const width = Math.max(1, (options.width ?? maxColumns) - 2 * depth)
    let rows: number | undefined
    try {
      rows = options.draw && options.measure && depth === 1 ? options.measure(tex, width) : undefined
    } catch (error) {
      if (!(error instanceof TexError)) throw error
    }
    const lines = displayPreviewLines(tex, width, rows)
    if (!lines) return writer.text(fallback)
    changed = true
    if (rows !== undefined) {
      marks.push({ tex, columns: width, rows })
      lines[0] = MARK_OPEN + (marks.length - 1) + MARK_SEP + lines[0]
      lines[lines.length - 1] += MARK_CLOSE
    }
    writer.block(lines)
  }

  const display = (tex: string, fallback: string) => {
    const depth = writer.quoteDepth()
    if (depth > 0) return quoted(tex, fallback, depth)
    changed = true
    if (options.draw) {
      try {
        writer.block([put({ kind: 'image', tex, image: options.draw(tex) })])
      } catch (error) {
        if (!(error instanceof TexError)) throw error
        // Characters the font can't draw: the Unicode preview stays, as it streamed.
        const lines = error instanceof GlyphError ? displayPreviewLines(tex, maxColumns) : null
        if (lines) writer.block(lines)
        else refused(tex, reasonOf(error))
      }
      return
    }
    const lines = displayPreviewLines(tex, maxColumns)
    if (lines) return writer.block(lines)
    const reason = texErrorOf(tex, { cellWidth: 10, cellHeight: 20, emPx: 16, maxColumns, ink: { r: 0, g: 0, b: 0 } })
    if (reason) refused(tex, reason)
    else writer.text(fallback)
  }

  const marks: InlineMark[] = []
  const mark = (markdown: string, inline: InlineMark) => {
    changed = true
    marks.push(inline)
    writer.text(MARK_OPEN + (marks.length - 1) + MARK_SEP + markdown + MARK_CLOSE)
  }

  // Prose: inline previews written while streaming are marked for their images.
  const prose = (source: string) => {
    if (source === '' || !options.inline) return proseMath(source)
    let at = 0
    for (const span of findInlinePreviews(source, records)) {
      proseMath(source.slice(at, span.start))
      mark(source.slice(span.start, span.end), { tex: span.record.tex, columns: span.record.columns ?? 0 })
      at = span.end
    }
    proseMath(source.slice(at))
  }

  // Prose that may still hold LaTeX.
  const proseMath = (source: string) => {
    if (source === '') return
    if (!/\$|\\[([]|\\begin\{/.test(source)) return writer.text(source)
    for (const segment of (options.scan ?? scan)(source)) {
      if (segment.kind === 'text') {
        writer.text(segment.text)
      } else if (!segment.display) {
        const plain = inlineText(segment.tex)
        const padded = options.inline ? inlinePreview(segment.tex, options.inline.env, options.inline.width) : null
        if (padded) {
          mark(padded.markdown, { tex: segment.tex, columns: padded.columns, plain: plain ?? segment.raw })
          continue
        }
        if (plain !== null) changed = true
        writer.text(plain ?? segment.raw)
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
    } else if (record.quote !== undefined) {
      // In a quote the preview stays; one deep, its image lies over it.
      if (record.quote === 1) mark(written, { tex: record.tex, columns: Math.max(1, (options.width ?? maxColumns) - 2), rows: record.rows })
      else writer.text(written)
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
  return { pieces: placeInline(piecesOf(writer.take(), items), marks, options), changed }
}

/**
 * Gives the inline previews marked in prose pieces their images. A paragraph
 * or a list holding previews, set apart by blank lines, is drawn as a piece of
 * its own (so its first row is the piece's), laid out as the engine lays it
 * out, and each preview drawn whole on one row gets its image there. Everything else
 * keeps its text: previews streamed padded stay as they were shown, math read
 * back as LaTeX goes back to its plain Unicode.
 */
function placeInline(pieces: readonly Piece[], marks: readonly InlineMark[], options: PlanOptions): Piece[] {
  const out: Piece[] = []
  for (const piece of pieces) {
    if (piece.kind !== 'prose' || !piece.text.includes(MARK_OPEN)) {
      out.push(piece)
      continue
    }
    // The marks taken out: the text as streamed, and where each preview is in it.
    let text = ''
    const spans: (SourceSpan & { mark: InlineMark })[] = []
    let last = 0
    for (const match of piece.text.matchAll(MARK)) {
      text += piece.text.slice(last, match.index)
      const start = text.length
      text += match[2]!
      spans.push({ start, end: text.length, width: marks[Number(match[1])]!.columns, mark: marks[Number(match[1])]! })
      last = match.index + match[0].length
    }
    text += piece.text.slice(last)

    // The paragraphs and lists whose inline previews get images, and the quotes whose display previews do.
    const parts: { start: number; end: number; images: InlineImage[] }[] = []
    const placed = new Set<SourceSpan>()
    const overlays = spans.some(span => span.mark.rows !== undefined)
    for (const block of (options.inline || overlays ? proseBlocks(text) : null) ?? []) {
      const inside = spans.filter(span => span.start >= block.start && span.end <= block.end)
      const inline = inside.filter(span => span.mark.rows === undefined)
      const quoted = inside.filter(span => span.mark.rows !== undefined)
      let images: [SourceSpan, InlineImage][] = []
      if ((block.paragraph || block.list) && inline.length > 0 && options.inline) {
        images = placeImages(text.slice(block.start, block.end), inline, block.start, options.inline, block.list === true)
      } else if (block.quote && quoted.length > 0) {
        images = placeQuoted(text.slice(block.start, block.end), quoted, block.start, options)
      }
      for (const [span] of images) placed.add(span)
      if (images.length > 0) parts.push({ start: block.start, end: block.end, images: images.map(([, image]) => image) })
    }

    // Text outside those images, with math read back as LaTeX in its plain form.
    const plain = (from: number, to: number) => {
      let written = ''
      let at = from
      for (const span of spans) {
        if (span.start < from || span.end > to || span.mark.plain === undefined || placed.has(span)) continue
        written += text.slice(at, span.start) + span.mark.plain
        at = span.end
      }
      return written + text.slice(at, to)
    }
    // Split at the blank lines around them: each later piece has a blank row above it, as the whole had.
    let at = 0
    let gap = piece.gap
    for (const part of parts) {
      let before = plain(at, part.start).replace(/(?:\n[ \t]*)+$/, '')
      if (at > 0) before = before.replace(/^(?:[ \t]*\n)+/, '')
      if (before.trim() !== '') {
        out.push({ kind: 'prose', text: before, gap })
        gap = true
      }
      // As laid out: previews that got no image keep their padded form (their plain one could move the others).
      out.push({ kind: 'prose', text: text.slice(part.start, part.end), gap, inline: part.images })
      gap = true
      at = part.end
    }
    const after = plain(at, text.length)
    if (at === 0) {
      out.push({ kind: 'prose', text: after, gap: piece.gap })
    } else if (after.trim() !== '') {
      out.push({ kind: 'prose', text: after.replace(/^(?:[ \t]*\n)+/, ''), gap: true })
    }
  }
  return out
}

/** Lays out one paragraph (or list) and draws the images of the previews found whole on a row. */
function placeImages(
  block: string,
  spans: readonly (SourceSpan & { mark: InlineMark })[],
  offset: number,
  inline: NonNullable<PlanOptions['inline']>,
  list: boolean,
): [SourceSpan, InlineImage][] {
  const layout = (list ? layoutList : layoutProse)(
    block,
    inline.width,
    spans.map(span => ({ start: span.start - offset, end: span.end - offset, width: span.width })),
    { hyperlinks: inline.hyperlinks },
  )
  if (!layout) return []
  const images: [SourceSpan, InlineImage][] = []
  for (const [k, place] of layout.places.entries()) {
    const span = spans[k]!
    const { mark } = span
    if (!place || mark.columns < 1 || place.columns !== mark.columns) continue
    try {
      images.push([span, { tex: mark.tex, image: inline.draw(mark.tex, mark.columns), row: place.row, col: place.col }])
    } catch (error) {
      if (!(error instanceof TexError)) throw error
    }
  }
  return images
}

/**
 * Draws the display previews written in a blockquote over them. The engine
 * draws a quote's text as one box two cells in (a bar and a space), its
 * paragraphs a blank row apart, wrapped at the quote's width; the text before
 * each preview is laid out as paragraphs, and an image goes where the preview's
 * first row is. Past text that can't be laid out, the previews stay.
 */
function placeQuoted(
  quote: string,
  spans: readonly (SourceSpan & { mark: InlineMark })[],
  offset: number,
  options: PlanOptions,
): [SourceSpan, InlineImage][] {
  if (!options.draw) return []
  const images: [SourceSpan, InlineImage][] = []
  const inner = (from: number, to: number) =>
    quote
      .slice(from, to)
      .split('\n')
      .map(line => line.replace(/^[ \t]{0,3}>[ \t]?/, ''))
      .join('\n')
      .replace(/^\s+|\s+$/g, '')
  let row = 0
  let at = 0
  for (const span of spans) {
    const before = inner(at, span.start - offset)
    if (before !== '') {
      const layout = layoutProse(before, span.mark.columns)
      if (!layout) break
      row += layout.rows + 1
    }
    try {
      const image = options.draw(span.mark.tex, span.mark.rows, span.mark.columns)
      images.push([span, { tex: span.mark.tex, image, row, col: QUOTE_INDENT }])
    } catch (error) {
      if (!(error instanceof TexError)) throw error
    }
    row += span.mark.rows! + 1
    at = span.end - offset
  }
  return images
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

/** Prose pieces joined back into one text (a plan with no images, inline ones included, or notes). */
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
