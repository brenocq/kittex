// kittex's pure side: the constants, the streaming rewrite and the plan of a
// landed reply. Nothing here takes `$` (it cannot cross an import); register.tsx
// does the I/O and hands these functions plain values.
//
// The layout rules below were measured on the live engine (Claude Code
// 2.1.290 and 2.1.291); docs/engine-findings.md has the recordings.

import {
  createLineScanner,
  blockParts,
  engineHyperlinks,
  layoutHeading,
  layoutList,
  layoutProse,
  layoutQuote,
  layoutTable,
  measureDisplay,
  measureDisplayResult,
  measureInline,
  measureInlineResult,
  measurePicture,
  MAX_PICTURE_ROWS,
  MAX_TEX_LENGTH,
  previewDisplay,
  GlyphError,
  previewInline,
  scan,
  TexError,
  textBaseline,
  textWidth,
  typeset,
} from './core.js'
import type { BlockPart, CellSize, InkPlace, InlineEnv, LineScanner, LinkMode, PictureEnv, ProseBlock, ProseLayout, RenderedImage, RenderEnv, Segment, SourceSpan, SpanPlace, TexDocument } from './core.js'
import type { KittexBlock, KittexEnv, KittexPreview } from '../types'
import { diagramJob, diagramLabel, mathJob, texBook, texResult } from './tex.ts'
import type { DiagramKind } from './tex.ts'

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

/** The most cells of `not rendered: <reason>` a refused inline formula's note quotes. */
const INLINE_NOTE_CELLS = 60

/** An inline math segment: what the fallbacks below read. */
type InlineMath = Pick<Extract<Segment, { kind: 'math' }>, 'tex' | 'raw' | 'delimiter'>

/**
 * An inline formula where it gets neither an image nor one line of Unicode
 * (stress report F5): its source as a code span, where markdown reads none of
 * it (no `\\` eaten, in a table cell neither), as the model wrote it (so a
 * table cell's `\|` still reads as a pipe), and where MathJax refuses it an
 * italic `not rendered: …` in parentheses after it, as a refused display formula has. Never
 * the TeX as prose.
 */
export function inlineSource(math: InlineMath): string {
  const open = math.delimiter === '$' ? 1 : 2
  const source = math.raw.slice(open, math.raw.length - open).replace(/\s+/g, ' ').trim() || math.tex
  const longest = Math.max(0, ...[...source.matchAll(/`+/g)].map(run => run[0].length))
  const fence = '`'.repeat(longest + 1)
  const code = fence + (/^`|`$/.test(source) ? ` ${source} ` : source) + fence
  const reason = inlineTexError(math.tex)
  return reason === undefined ? code : `${code} (*${escapeMarkdown(oneLine(NOT_RENDERED + reason, INLINE_NOTE_CELLS))}*)`
}

/** An inline formula as it is written where it gets no image: its one-line Unicode, or its source (inlineSource). */
export function inlineFallback(math: InlineMath): string {
  return inlineText(math.tex) ?? inlineSource(math)
}

/** Why MathJax refuses an inline formula, or undefined when it doesn't. */
function inlineTexError(tex: string): string | undefined {
  if (tex.length > MAX_TEX_LENGTH) return `formula longer than ${MAX_TEX_LENGTH} characters`
  try {
    typeset(tex, { display: false })
    return undefined
  } catch (error) {
    if (error instanceof TexError) return reasonOf(error)
    throw error
  }
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
/**
 * Streamed blocks whose previews are kept for their landed drawings, each
 * block its own (fuzz FUZZ-14: one store for the session, an early block
 * redrawn after 512 later previews lost its images). A block past this is
 * drawn as it streamed.
 */
export const BLOCK_LIMIT = 1024
/** The newest blocks, looked through by their text for a landed block that no row id links to its stream (after a hot reload). */
export const RECENT_BLOCKS = 8
/** Appended rows remembered until a stream they start shows up (a reply whose only flush comes after its row). */
export const PENDING_ROWS = 8
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
 * hook is registered with this as its `props.text` matcher (split as below on
 * the terminal), so every other block is drawn by the engine without a round
 * trip through kittex.
 */
export const LANDED_PATTERN = /\$|\\[([]|\\begin\{|&nbsp;|```latex|\u00a0|\u2800|\u034f|(?:^|\n)[ \t>]*(?:`{3,}|~{3,})[ \t]*[Mm][Aa][Tt][Hh](?![^\s])/

/**
 * What only kittex writes into a streamed block: a display preview's pad, an
 * inline preview's join, pad or mark, a refused formula's note. A block
 * holding one is one kittex streamed, whatever else it holds (a reply's
 * currency, `$` in code, a `$` a preview shows).
 */
const PREVIEW_MARK = String.raw`&nbsp;|\u00a0|\u2800|\u034f|\*${NOT_RENDERED}`

/**
 * Inline math as written, by the scanner's dollar rules (scan/inline.ts): a
 * single unescaped `$` not followed by whitespace, closed by the next `$` if
 * that one is single, not after whitespace and not before a digit, within a
 * paragraph and no code span. So a reply's currency (`$100`, `\$100`, `$25,000
 * at 6.5% and $25,000`, `$5-$10`) is no math.
 */
const INLINE_DOLLARS = String.raw`(?<![\\$\`])\$(?![\s$])(?:[^$\`\\\n]|\\[^\n]|\n(?![ \t]*\n))*(?<![\s\\])\$(?![$\d])`

/** Display math as written: `$$` (not escaped, not a longer run) up to the next `$$`. */
const DISPLAY_DOLLARS = String.raw`(?<![\\$])\$\$(?!\$)[\s\S]*?\$\$`

/**
 * A ```math (or ~~~math) fence's opening line, as the scanner reads one
 * (scan/blocks.ts: the info string's first word, any case): its body is
 * display math (stress report F15, fuzz FUZZ-8).
 */
const MATH_FENCE = String.raw`(?:^|\n)[ \t>]*(?:\`{3,}|~{3,})[ \t]*[Mm][Aa][Tt][Hh](?![^\s])`

/**
 * What follows a backslash that the engine's markdown reads as an escape and
 * drops (`\{` drawn `{`, `\,` drawn `,`): ASCII punctuation, and a line break
 * (a hard break). `$` aside: an escaped dollar is kittex's scanner's too, and
 * stays one.
 */
const ESCAPED = String.raw`(?:[!-#%-\/:-@\[-\`{-~]|\r?\n)`
const ESCAPING = new RegExp(String.raw`\\(?=${ESCAPED})`, 'g')

/**
 * `$$…$$` with other text on its first or last line: inline math (a display
 * formula has its lines to itself), within a paragraph (no blank line).
 */
const INLINE_DISPLAY_DOLLARS = (() => {
  const one = String.raw`(?<![\\$])\$\$(?!\$)(?:(?!\$\$)(?!\n[ \t]*\n)[\s\S])*?\$\$`
  return String.raw`[^\s>][^\n]*?${one}|${one}[ \t]*[^\s]`
})()

/**
 * LaTeX as written: a reply that never streamed through MessageDisplay, or one
 * read back after `--resume`. Never a block holding a preview mark (one kittex
 * streamed: its `\[` is a bracket its previews escaped, `𝔼\[x\]`, and a `$`
 * left in it is code or a preview's), and never for a currency dollar alone.
 */
export const SOURCE_PATTERN = sourcePattern({})

/** A ```latex, ```tex or ```tikz fence's opening line. */
const DIAGRAM_FENCE = String.raw`(?:^|\n)[ \t>]*(?:\`{3,}|~{3,})[ \t]*(?:latex|tex|tikz)\b`

/**
 * SOURCE_PATTERN for these options (and `diagrams`: where the local TeX may draw them): only the math of a kind kittex changes
 * (a block whose math is all left raw stays the engine's, which would
 * otherwise draw nothing until kittex answered). Math left raw counts where a
 * backslash in it needs its mark (rawSource), as math read back after
 * --resume does. With display math raw, `$$…$$` counts only where it is
 * inline math.
 */
export function sourcePattern(math: Partial<MathOptions>, diagrams = false): RegExp {
  const inline = math.inline !== 'raw'
  const block = math.block !== 'raw'
  const needs = String.raw`\\(?=${ESCAPED})`
  const kinds = [
    ...(inline ? [INLINE_DOLLARS] : [String.raw`(?<![\\$])\$(?![\s$])[^$\n]*?${needs}`]),
    String.raw`\\\(`,
    ...(block
      ? [DISPLAY_DOLLARS, MATH_FENCE, String.raw`\\\[`, String.raw`\\begin\{`]
      : [String.raw`(?<![\\$])\$\$(?:(?!\$\$)[\s\S])*?${needs}`, String.raw`\\\[`, String.raw`\\begin\{(?:(?!\\end\{)[\s\S])*?${needs}`, ...(inline ? [INLINE_DISPLAY_DOLLARS] : [])]),
    // A diagram for the local TeX: a ```latex, ```tex or ```tikz block (`diagrams`, with display math drawn).
    ...(diagrams && block ? [DIAGRAM_FENCE] : []),
  ]
  return new RegExp(String.raw`^(?![\s\S]*(?:${PREVIEW_MARK}))[\s\S]*?(?:${kinds.join('|')})`)
}

/**
 * A block as kittex streamed it: one holding a preview mark. The engine's own
 * drawing of such a text is the streaming preview row for row, so it may
 * stand in while kittex's drawing is on its way (the AssistantMessage hook,
 * in the fullscreen layout). Never matches a text SOURCE_PATTERN matches.
 */
export const STREAMED_PATTERN = new RegExp(PREVIEW_MARK)

// ─── Shared state ────────────────────────────────────────────────────────────

/** What drawing needs to know about the terminal (kittex.env in `$.state`). */
export type { KittexEnv }
/** One preview written while streaming, and the TeX it stands for. */
export type PreviewRecord = KittexPreview
/** What kittex keeps of one streamed block (kittex.blocks): its previews, each where it was written. */
export type StreamedBlock = KittexBlock

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

/**
 * Where formulas are drawn for a viewport this wide: a display formula's
 * image (and its preview) spans the width prose wraps at, the reply column or
 * `maxProseWidth` when that is narrower (fuzz FUZZ-2: centred in the whole
 * column, a preview's lines wrapped at the prose width while streaming).
 */
export function renderEnvFor(env: KittexEnv, columns = env.columns): RenderEnv {
  const renderEnv: RenderEnv = { cellWidth: env.cellWidth, cellHeight: env.cellHeight, maxColumns: proseWidthFor(env, columns), emPx: env.emPx, ink: env.ink }
  if (env.inkOver) renderEnv.inkOver = env.inkOver
  if (env.weight !== undefined) renderEnv.weight = env.weight
  return renderEnv
}

/** Where inline formulas are drawn: one text row, the math on the font's baseline. */
export function inlineEnvFor(env: KittexEnv, columns = env.columns): InlineEnv {
  return { ...renderEnvFor(env, columns), baselinePx: textBaseline(env.cellHeight, TEXT_BASELINE, env.cellAdjust) }
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
 * The cells a recorded display preview's image spans: the prose width (the
 * reply column, or maxProseWidth), a quote's text, or a list item's text (see
 * PreviewRecord's `quote`, `indent`).
 */
export function displayColumns(record: PreviewRecord, env: KittexEnv, columns = env.columns): number {
  if (record.quote !== undefined) return quoteColumns(env, record.quote, columns)
  if (record.indent !== undefined) return Math.max(1, proseWidthFor(env, columns) - record.indent)
  return proseWidthFor(env, columns)
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

// ─── The options ─────────────────────────────────────────────────────────────

/**
 * How one kind of math is shown (the `block` and `inline` options): `image`,
 * typeset images where the terminal draws them (Unicode elsewhere);
 * `unicode`, Unicode text, never an image; `raw`, the LaTeX as Claude wrote it.
 */
export type MathMode = 'image' | 'unicode' | 'raw'

export const MATH_MODES: readonly MathMode[] = ['image', 'unicode', 'raw']

/** The two options: display math (`$$…$$`, `\[…\]`, bare environments, ```math fences) and inline math (`$…$`, `\(…\)`). */
export interface MathOptions {
  block: MathMode
  inline: MathMode
}

/** The options as register receives them; a value that is no mode (unset, or stored by an older manifest) is `image`, the default. */
export function mathOptions(options: Readonly<Record<string, unknown>>): MathOptions {
  const mode = (value: unknown): MathMode => (MATH_MODES.includes(value as MathMode) ? (value as MathMode) : 'image')
  return { block: mode(options.block), inline: mode(options.inline) }
}

/** What a streamed message is rewritten for, in this terminal with these options. */
export function streamEnvFor(env: KittexEnv, math: MathOptions): StreamEnv {
  return { ...env, inline: math.inline === 'image' && env.images, math }
}

/** What a streamed message is rewritten for: the terminal, whether inline math becomes images, and the options. */
export type StreamEnv = KittexEnv & {
  /** Inline math is drawn as images (the `inline` option, where the terminal draws images). */
  inline?: boolean
  /**
   * The options (each kind `image` when absent): a kind set to `raw` is
   * written as Claude wrote it, display math set to `unicode` as where the
   * terminal draws no images.
   */
  math?: Partial<MathOptions>
  /**
   * Where the local LaTeX draws (the `latex` option, TeX found, images
   * drawn): diagrams and display math MathJax refuses (`block`), inline math
   * it refuses (`inline`). Absent: neither.
   */
  tex?: TexUse
}

/** Whether a math segment is of a kind these options leave as written. */
function leftRaw(segment: { display: boolean }, math: Partial<MathOptions> | undefined): boolean {
  return (segment.display ? math?.block : math?.inline) === 'raw'
}


/**
 * Math left raw as the engine draws it as written: INLINE_MARK (no width,
 * drawn as nothing) after every backslash its markdown would read as an escape,
 * so the backslash is no escape and stays, whether the engine reads the text
 * as markdown or draws it plain (it does either, part by part, while a reply
 * streams). A ```math fence is code, where markdown reads no escapes; in a
 * GFM table row `\|` is the row's escape of a pipe and stays one. Idempotent:
 * the landing reads the streamed text again.
 */
export function rawSource(math: Pick<MathSegment, 'raw' | 'tex' | 'display' | 'delimiter'>): string {
  if (math.delimiter === 'fence') return math.raw
  const tableRow = !math.display && math.raw.includes('\\|') && !math.tex.includes('\\|')
  return math.raw.replace(ESCAPING, (backslash: string, at: number) => (tableRow && math.raw[at + 1] === '|' ? backslash : backslash + INLINE_MARK))
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
  if (unicode) unicode = ungroupScripts(unicode, tex)
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

/**
 * A script written as letters or digits with no Unicode script form, which
 * the Unicode renderer groups as `_(…)` or `^(…)`, when nothing that could
 * read as part of it (a letter, a digit, a mark, another script) follows.
 * Script characters (`^(xˣ)`, a script of its own) are no such letters.
 */
const GROUPED_SCRIPT = /([_^])\(((?:(?![\u00b2\u00b3\u00b9\u02b0-\u02ff\u1d2c-\u1dbf\u2070-\u209f\u2c7c\u2c7d])[\p{L}\p{N}])+)\)(?![\p{L}\p{N}\p{M}_^])/gu

/**
 * An inline preview's scripts without the parentheses the Unicode renderer
 * groups them in (`π_(ref)` as `π_ref`, `D_(KL)` as `D_KL`), where they
 * only take cells: the preview sets its image's slot, and every cell it is
 * wider than the image is blank around the formula once it lands. Kept where
 * the formula has parentheses of its own (one could be the group's).
 */
export function ungroupScripts(unicode: string, tex: string): string {
  return /\(|\\lparen/.test(tex) ? unicode : unicode.replace(GROUPED_SCRIPT, '$1$2')
}

/** What may open a phrase right before a formula: an opening bracket, a quote or a dash (`non-$x$`). */
const OPENS = /^[\p{Ps}\p{Pi}\p{Pd}"'`]$/u
/** What may close one right after it: a closing bracket or quote, punctuation (`,`, `:`, `.`) or a dash (`$x$-axis`). */
const CLOSES = /^[\p{Pe}\p{Pf}\p{Po}\p{Pd}]$/u

/**
 * Where an inline formula's ink goes in a slot wider than it, from the
 * characters drawn in the cells right before and after the slot (undefined at
 * the start or end of the row's text): flush with the text column at its
 * start (`start`) and against the slot's right edge at its end (`end`, unless
 * a bracket opens right before it); against the right edge when a space is
 * before it and punctuation, a dash or a closing bracket after it (`y_l,`,
 * `x-axis`: the blank joins the space before), against its left edge in the
 * mirror case (`(x_k `), centred otherwise (`(y_w)`, `a x b`).
 */
export function inkPlaceBeside(before: string | undefined, after: string | undefined): InkPlace {
  if (before === undefined) return 'start'
  if (after === undefined) return OPENS.test(before) ? 'start' : 'end'
  const blankBefore = /^\s$/u.test(before)
  const blankAfter = /^\s$/u.test(after)
  if (blankBefore && !blankAfter && CLOSES.test(after)) return 'end'
  if (blankAfter && !blankBefore && OPENS.test(before)) return 'start'
  return 'center'
}

/**
 * What a row may hold before its text: indentation, quote bars, and a list
 * item's marker (`-`, `•`, `1.`, `a.`, `iv.`) with the space after it.
 */
const TEXT_START = /^[\s▎]*(?:(?:[-*+•◦▪‣]|\d{1,9}[.)]|[a-z]{1,6}[.)])\s+)?$/u

/**
 * The characters drawn in the cell before column `col` of a row and in the
 * cell after the `columns` from it (zero-width marks skipped; undefined past
 * the ends of the row's text: before its first character, a list marker or
 * quote bar not counted, and after its last).
 */
export function cellsBeside(line: string, col: number, columns: number): [string | undefined, string | undefined] {
  const chars = [...line]
  let at = 0
  let before: string | undefined
  let prefix = ''
  for (const [i, char] of chars.entries()) {
    const cells = cellsOf(char)
    if (cells === 0) continue
    if (at + cells <= col) {
      before = char
      prefix += char
    } else if (at >= col + columns) {
      // Blanks to the row's end are past its text.
      const after = /^\s*$/u.test(chars.slice(i).join('')) ? undefined : char
      return [TEXT_START.test(prefix) ? undefined : before, after]
    }
    at += cells
  }
  return [TEXT_START.test(prefix) ? undefined : before, undefined]
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

/**
 * A display preview's markdown lines: exactly `rows` lines when given (the
 * rows its image takes). Where no Unicode form fits the width (stress report
 * F4: a wide formula in a narrow window), its one-line form wrapped at the
 * width, cut with `…` past the rows; the TeX source (cut likewise) only where
 * Unicode has no form at all.
 */
export function displayPreviewLines(tex: string, maxColumns: number, rows?: number): string[] | null {
  const lines = previewDisplay(tex, { maxColumns: previewColumns(maxColumns) }, rows)
  if (lines && lines.length > 0) return previewMarkdownLines(spreadRows(lines, tex), maxColumns)
  if (rows !== undefined && rows < 1) return null
  const flat = previewInline(tex, undefined, { tight: false })
  if (flat === null && rows === undefined) return null
  const width = previewColumns(maxColumns)
  let text = flat === null ? [oneLine(tex, width)] : wrapCells(flat, width)
  if (rows === undefined) return previewMarkdownLines(text, maxColumns)
  if (text.length > rows) text = [...text.slice(0, rows - 1), oneLine(text.slice(rows - 1).join(' '), width)]
  const above = Math.floor((rows - text.length) / 2)
  const padded = [...Array<string>(above).fill(''), ...text, ...Array<string>(rows - text.length - above).fill('')]
  return previewMarkdownLines(padded, maxColumns)
}

/** Text broken into lines at most `width` cells wide: at spaces, and inside a word only where it is wider than a line. */
export function wrapCells(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ').filter(word => word !== '')) {
    const joined = line === '' ? word : `${line} ${word}`
    if (cellsOf(joined) <= width) {
      line = joined
      continue
    }
    if (line !== '') lines.push(line)
    line = ''
    for (const char of word) {
      if (line !== '' && cellsOf(line + char) > width) {
        lines.push(line)
        line = ''
      }
      line += char
    }
  }
  if (line !== '' || lines.length === 0) lines.push(line)
  return lines
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
  return [...sourceMarkdownLines(tex), '', '*' + escapeMarkdown(notRenderedText(reason, maxColumns)) + '*']
}

/** A formula's source in a `latex` block: where Unicode can't write it and no image is drawn. */
export function sourceMarkdownLines(tex: string): string[] {
  const longest = Math.max(0, ...[...tex.matchAll(/`+/g)].map(run => run[0].length))
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return [fence + 'latex', ...tex.split('\n'), fence]
}

function reasonOf(error: TexError): string {
  return error.message || 'TeX error'
}

/** A line's start that only opens blockquotes (`> `, `>> `, `> > `). */
const QUOTE_LEAD = /^[ \t]{0,3}(?:>[ \t]?)+$/

/**
 * Where MarkdownWriter.block puts a block written after `written`: what it
 * writes before the block's first line (a blank line, or in a quote a `>`
 * line, unless one is there; a paragraph break after text), and the
 * indentation (or blockquote prefix, `quote`) of its other lines. `started`:
 * something other than whitespace was written.
 */
export function blockOpening(written: string, started = /\S/.test(written)): { before: string; indent: string; quote: string } {
  const start = written.lastIndexOf('\n') + 1
  const lead = written.slice(start)
  const above = written.slice(0, start)
  if (/^[ \t]*$/.test(lead)) return { before: started && !/\n[ \t]*\n$/.test(above) ? '\n' + lead : '', indent: lead, quote: '' }
  // A paragraph of its own inside the quote: a `>` line above it unless one is there.
  if (QUOTE_LEAD.test(lead)) return { before: started && !/(?:^|\n)[ \t]*(?:>[ \t]*)+\n$/.test(above) ? '\n' + lead : '', indent: lead, quote: lead }
  return { before: '\n\n', indent: '', quote: '' }
}

/**
 * Builds markdown out of source text and blocks. A block is a paragraph of its
 * own: a blank line before and after it, each line at the indentation of the
 * line it starts on (so it stays in its list item). A block always ends with a
 * newline, as a streamed flush does.
 */
export class MarkdownWriter {
  out = ''
  /**
   * What earlier takes wrote, all of it: the part being written is read from
   * where it starts (a long list's outer items included), as the landing reads it.
   */
  private tail = ''
  /** Something other than whitespace was written. */
  private started = false
  /** A block was the last thing written: the next text must leave a blank line. */
  private afterBlock = false
  /** The blockquote prefix the last block was written under ('' outside a quote). */
  private quote = ''

  text(text: string): void {
    if (text === '') return
    const written = this.prepare(text)
    this.afterBlock = false
    if (/\S/.test(text)) this.started = true
    this.out += written
  }

  /**
   * What text() writes for `text`: the text, after the blank line (in a quote,
   * the `>` line) a block right before it needs. Only its start may differ.
   */
  prepare(text: string): string {
    if (text === '' || !this.afterBlock) return text
    if (this.quote !== '') {
      // In a quote the blank line after a block is a `>` line: a bare one would end the quote.
      if (/^[ \t]*\r?\n[ \t]*(?:>[ \t]*)+\r?\n/.test(text)) return text.replace(/^[ \t]*\r?\n/, '')
      // One that opens with such a line already has it (a flush starting right after the block's closing line).
      if (/^[ \t]*(?:>[ \t]*)+\r?\n/.test(text)) return text
      return this.quote.trimEnd() + (/^[ \t]*\r?\n/.test(text) ? '' : '\n') + text
    }
    return /^[ \t]*\r?\n/.test(text) ? text : '\n' + text
  }

  /**
   * Writes a block and returns it as written (lines after the first indented,
   * or under the blockquote prefix the line it starts on opens with).
   */
  block(lines: readonly string[]): string {
    const opening = blockOpening(this.tail + this.out, this.started)
    this.quote = opening.quote
    const block = lines.join('\n' + opening.indent)
    this.out += opening.before + block + '\n'
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

  /** Everything written so far, earlier takes included. */
  recent(): string {
    return this.tail + this.out
  }

  /** Takes the text written so far (one flush, or one prose piece). */
  take(): string {
    const out = this.out
    this.tail += out
    this.out = ''
    return out
  }
}

// ─── Streaming (MessageDisplay) ──────────────────────────────────────────────

export interface StreamRewrite {
  text: string
  records: PreviewRecord[]
  /**
   * Documents the stream waits for TeX to compile (TexBook): everything from
   * the first segment that needs one is held, and comes out of resume() once
   * their outcomes are known.
   */
  pending?: TexDocument[]
}

/**
 * Where the landing will cut what is being streamed (planLanded): it draws a
 * display image, or a refused formula's note, as an item of its own, and lays
 * the text after it out as a piece of its own, part by part (blockParts). So
 * the stream reads the part a formula is in as the landing reads it: from
 * where its piece starts, all of it however long (a long list's outer items
 * included). Offsets index everything the writer wrote.
 */
export class StreamPlan {
  /** Where the piece being written starts: right after the last image's or note's block. */
  piece = 0
  /**
   * Where the last block read in it so far starts (proseBlocks' block: what
   * comes before it can't join a later part). blockParts reads the piece again
   * from there, so a flush costs about as much as the block it ends in, not
   * the whole reply.
   */
  anchor = 0

  /** A new piece starts at `at`. */
  cut(at: number): void {
    this.piece = at
    this.anchor = at
  }
}

/**
 * Rewrites the segments one flush completed: inline math as one line of
 * Unicode (padded to its image's width, with a record, when inline images are
 * on and the landing will place its image: see writeProse), a display formula
 * as its preview (exactly the rows its image will take when the terminal draws
 * images), a formula MathJax refuses as its source and a `not rendered` line.
 * `writer` carries the line state across the message's flushes, `plan` where
 * the landing cuts it.
 */
export function rewriteSegments(segments: readonly Segment[], env: StreamEnv, writer: MarkdownWriter, plan = new StreamPlan()): StreamRewrite {
  const records: PreviewRecord[] = []
  // Math its option leaves raw is text from here on (as written, its backslashes kept), as the landing reads it.
  segments = asWritten(segments, env.math)
  for (let k = 0; k < segments.length; ) {
    const segment = segments[k]!
    if (segment.kind === 'math' && segment.display) {
      if (segment.diagram !== undefined) writeDiagram(segment, env, writer, plan, records)
      else writeDisplay(segment, env, writer, plan, records)
      k++
      continue
    }
    let end = k + 1
    while (end < segments.length && !isDisplayMath(segments[end]!)) end++
    writeProse(segments.slice(k, end), segments[end], env, writer, plan, records)
    k = end
  }
  return { text: writer.take(), records }
}

type MathSegment = Extract<Segment, { kind: 'math' }>

/** The segments with the math of each kind its option leaves raw turned into text, as written (adjacent text joined). */
function asWritten(segments: readonly Segment[], math: Partial<MathOptions> | undefined): Segment[] {
  if (math?.block !== 'raw' && math?.inline !== 'raw') return [...segments]
  return joinText(segments.map(segment => (segment.kind === 'math' && leftRaw(segment, math) ? { kind: 'text', text: rawSource(segment), start: segment.start, end: segment.end } : segment)))
}

function isDisplayMath(segment: Segment): boolean {
  return segment.kind === 'math' && segment.display
}

/** How the engine draws links and the terminal emoji sequences, as the replays take it. */
function linkModeOf(env: KittexEnv): LinkMode {
  return { hyperlinks: env.hyperlinks, emojiSequences: env.emojiSequences }
}

/**
 * Writes a display formula's preview. In a blockquote it stays inside it, as
 * wide as the quote's text (one quote deep, its image lies over it once
 * landed); in a list item likewise, as wide as the item's text, its image over
 * it in the item; anywhere else it is as wide as the reply column and lands as
 * an image of its own, after which a new piece starts (as after a refused
 * formula's note).
 */
function writeDisplay(segment: MathSegment, env: StreamEnv, writer: MarkdownWriter, plan: StreamPlan, records: PreviewRecord[]): void {
  const renderEnv = renderEnvFor(env)
  const { maxColumns } = renderEnv
  const quote = writer.quoteDepth()
  // Display math gets images where the terminal draws them, unless the `block` option says Unicode.
  const images = env.images && env.math?.block !== 'unicode'
  // The item's text is laid out from where its list starts, however far back that is.
  const indent = quote === 0 && images ? itemIndent(writer.recent().slice(plan.anchor), proseWidthFor(env), linkModeOf(env)) : undefined
  const width = quote > 0 ? quoteColumns(env, quote) : indent !== undefined ? Math.max(1, proseWidthFor(env) - indent) : maxColumns
  // In a quote at any depth (fuzz FUZZ-9), where the quote so far is one the landing lays out (else its image could never be placed).
  const drawn = images && (quote === 0 || placeable(writer.recent().slice(plan.anchor), proseWidthFor(env), env.columns, linkModeOf(env)))
  // The landing cuts its text only at a refused formula's note in the reply column (in a list item or a quote the
  // note stays in it: planLanded's nestedAt); a display formula's image lies over its preview in the text.
  const head = writer.recent().slice(plan.anchor)
  const nested = quote > 0 || nestedAt(head, head.length)
  let rows: number | undefined
  try {
    rows = drawn ? measureDisplay(segment.tex, { ...renderEnv, maxColumns: width }).rows : undefined
  } catch (error) {
    if (!(error instanceof TexError)) throw error
    // What MathJax refuses, the local TeX may draw.
    const viaTex = drawn && env.tex?.block ? texDisplay(segment.tex, { ...renderEnv, maxColumns: width }) : undefined
    if (viaTex && 'rows' in viaTex) return writeDisplayPreview(segment, renderEnv, viaTex.rows, width, quote, indent, writer, plan, records)
    const reason = viaTex?.error ?? reasonOf(error)
    const preview = writer.block(refusedMarkdownLines(segment.tex, reason, maxColumns))
    if (images) {
      records.push({ preview, tex: segment.tex, rows: 0, error: reason })
      if (!nested) plan.cut(writer.recent().length)
    }
    return
  }
  writeDisplayPreview(segment, renderEnv, rows, width, quote, indent, writer, plan, records)
}

/** Writes a display formula's preview `rows` tall (none: as Unicode alone) and records it; its source where Unicode has no form. */
function writeDisplayPreview(
  segment: MathSegment,
  renderEnv: RenderEnv,
  rows: number | undefined,
  width: number,
  quote: number,
  indent: number | undefined,
  writer: MarkdownWriter,
  plan: StreamPlan,
  records: PreviewRecord[],
): void {
  const lines = displayPreviewLines(segment.tex, width, rows)
  if (lines) {
    const preview = writer.block(lines)
    if (rows === undefined) return
    records.push({ preview, tex: segment.tex, rows, ...(quote > 0 ? { quote } : {}), ...(indent !== undefined ? { indent } : {}) })
    return
  }
  const refused = texErrorOf(segment.tex, renderEnv)
  writer.block(refused ? refusedMarkdownLines(segment.tex, refused, renderEnv.maxColumns) : sourceMarkdownLines(segment.tex))
}

/** Layouts of one run of prose a flush may take beyond the first before what is still undecided in it is written plain. */
const MAX_RELAYOUTS = 32

/** An inline formula of a run being written: the forms it may take, padded first, and the one it has (`options.length`: plain Unicode). */
interface InlineChoice {
  segment: MathSegment
  options: InlinePreview[]
  choice: number
  /** Placed for good: a part's drawing up to a formula never depends on what comes after it (a table's does). */
  done: boolean
  /** Where it is in the text being laid out, as the forms chosen so far put it. */
  start: number
  end: number
}

/**
 * Writes a run of prose (its text and inline math, up to a display formula).
 * Inline math is written padded to its image's width only where the landing
 * will draw the image over it: where its part, read as the landing reads it
 * (blockParts from where its piece starts) with the whole run in it, is laid
 * out with the preview whole on one row (the rule placeInline places images
 * by); else unpadded, its image in those cells, where that is placed
 * (narrowPreview); else as plain Unicode. Each part is laid out with all its
 * formulas at once; where one isn't placed it takes its next form and the
 * part is laid out again (its drawing up to a formula doesn't depend on what
 * follows, so those before it stay placed); past where the replay follows the
 * part, every formula is plain at once. `next`: the segment after the run.
 */
function writeProse(run: readonly Segment[], next: Segment | undefined, env: StreamEnv, writer: MarkdownWriter, plan: StreamPlan, records: PreviewRecord[]): void {
  const choices = new Map<number, InlineChoice>()
  if (env.inline && env.images && run.some(segment => segment.kind === 'math')) decideInline(run, next !== undefined && isDisplayMath(next), env, writer, plan, choices)
  let before = lastChar(writer.recent())
  for (const [at, segment] of run.entries()) {
    const choice = choices.get(at)
    const inline = choice?.options[choice.choice]
    const text = segment.kind === 'text' ? segment.text : inline ? inline.markdown : inlineFallback(segment)
    if (text === '') continue
    const written = writer.prepare(text)
    if (inline && segment.kind === 'math') {
      // Where its ink will go, as the source around it says (the landed rows decide; this draws it ahead).
      const after = run[at + 1] ?? next
      const first = after === undefined ? undefined : after.kind === 'text' ? [...after.text][0] : after.raw[0]
      const place = inkPlaceBeside((written.length > text.length ? lastChar(written.slice(0, -text.length)) : before)?.replace('\n', ' '), first)
      records.push({ preview: inline.markdown, tex: segment.tex, rows: 1, inline: true, columns: inline.columns, ...(place === 'center' ? {} : { place }) })
    }
    writer.text(text)
    before = lastChar(written) ?? before
  }
}

/** The last character of a text (a surrogate pair whole), or undefined. */
function lastChar(text: string): string | undefined {
  if (text === '') return undefined
  const code = text.charCodeAt(text.length - 1)
  return code >= 0xdc00 && code <= 0xdfff && text.length > 1 ? text.slice(-2) : text.slice(-1)
}

/**
 * Chooses the form of each inline formula in a run (see writeProse), keyed by
 * its index in the run. `display`: a display formula follows the run (its
 * block is read as a line of text where MarkdownWriter.block will put it).
 */
function decideInline(run: readonly Segment[], display: boolean, env: StreamEnv, writer: MarkdownWriter, plan: StreamPlan, choices: Map<number, InlineChoice>): void {
  const inlineEnv = inlineEnvFor(env)
  const width = proseWidthFor(env)
  const mode = linkModeOf(env)
  const head = writer.recent().slice(plan.anchor)
  // The run as written with the forms chosen so far; each formula's place in it.
  const build = (): string => {
    let body = ''
    let first = true
    for (const [at, segment] of run.entries()) {
      const choice = choices.get(at)
      const text = segment.kind === 'text' ? segment.text : choice && choice.choice < choice.options.length ? choice.options[choice.choice]!.markdown : inlineFallback(segment)
      if (text === '') continue
      body += first ? writer.prepare(text) : text
      first = false
      if (choice) {
        choice.end = head.length + body.length
        choice.start = choice.end - text.length
      }
    }
    return head + body
  }
  for (const [at, segment] of run.entries()) {
    if (segment.kind === 'math') choices.set(at, { segment, options: [], choice: 0, done: false, start: 0, end: 0 })
  }
  let source = build()
  for (const choice of choices.values()) {
    // In a quote the formula's row is the quote's text: two cells in, two more per quote nested in it.
    const line = source.slice(source.lastIndexOf('\n', choice.start - 1) + 1, choice.start)
    choice.options = inlineOptions(choice.segment.tex, inlineEnv, width - QUOTE_INDENT * quotesOpening(line))
  }
  const live = () => [...choices.values()].filter(choice => choice.choice < choice.options.length)
  let parts: BlockPart[] | null = null
  for (let layouts = 0; ; layouts++) {
    source = build()
    if (display) source += blockOpening(source).before + 'x'
    // At a piece's start, the blank lines the landing drops from it (piecesOf): read without them.
    const skip = plan.anchor === plan.piece ? (/^(?:[ \t]*\r?\n)+/.exec(source)?.[0].length ?? 0) : 0
    parts = skip === 0 ? blockParts(source) : (blockParts(source.slice(skip))?.map(part => ({ ...part, start: part.start + skip, end: part.end + skip, block: (part.block ?? part.start) + skip })) ?? null)
    const open = live().filter(choice => !choice.done)
    if (open.length === 0) break
    if (!parts || layouts > MAX_RELAYOUTS) {
      for (const choice of open) choice.choice = choice.options.length
      break
    }
    // The formulas of each part the replay lays out; any other is plain.
    const inPart = new Map<BlockPart, InlineChoice[]>()
    let changed = false
    let p = 0
    for (const choice of live()) {
      while (p < parts.length && parts[p]!.end < choice.end) p++
      const part = parts[p]
      if (part && part.start <= choice.start && layable(part)) {
        inPart.set(part, [...(inPart.get(part) ?? []), choice])
      } else if (!choice.done) {
        choice.choice = choice.options.length
        changed = true
      }
    }
    for (const [part, inside] of inPart) {
      if (inside.every(choice => choice.done)) continue
      const spans = inside.map(choice => ({ start: choice.start - part.start, end: choice.end - part.start, width: choice.options[choice.choice]!.columns }))
      const layout = layoutPart(part, source.slice(part.start, part.end), spans, width, env.columns, mode)
      for (const [i, choice] of inside.entries()) {
        if (layout?.places[i]) {
          // A table's columns follow every cell: its formulas are asked again until none moves.
          if (!part.table) choice.done = true
          continue
        }
        if (!layout || (layout.stop !== undefined && spans[i]!.end > layout.stop)) {
          // Past where the replay follows the part: no form of these is placed.
          for (const later of inside.slice(i)) if (!later.done) later.choice = later.options.length
        } else {
          choice.choice++
        }
        changed = true
        break
      }
    }
    if (!changed) break
  }
  // The text read again from the start of its last block: what comes before it is laid out for good.
  const last = parts?.at(-1)
  if (last) plan.anchor += last.block ?? last.start
}

/** The forms of an inline formula already worked out, by formula, geometry and row width (a long list repeats its formulas). */
const optionsMemo = new Map<string, InlinePreview[]>()
const OPTIONS_MEMO = 4096

/** The forms an inline formula may be streamed as where it gets an image, padded first (inlinePreview, narrowPreview); none where it can't. */
function inlineOptions(tex: string, env: InlineEnv, rowWidth: number): InlinePreview[] {
  const key = [tex, env.cellWidth, env.cellHeight, env.maxColumns, env.emPx, env.baselinePx, rowWidth].join('\n')
  let options = optionsMemo.get(key)
  if (!options) {
    const padded = inlinePreview(tex, env, rowWidth)
    const narrow = padded ? narrowPreview(tex, env) : null
    options = [padded, narrow].filter((option): option is InlinePreview => option !== null)
    if (optionsMemo.size >= OPTIONS_MEMO) optionsMemo.delete(optionsMemo.keys().next().value!)
    optionsMemo.set(key, options)
  }
  if (options.length > 0) return options
  // MathJax refused it: TeX's image, once TeX drew it (not memoized: TeX answers later).
  const viaTex = texInlinePreview(tex, env, rowWidth)
  return viaTex ? [viaTex] : options
}

/** Whether a part's inline previews can get images: a paragraph, a heading, a blockquote, a table or a list. */
function layable(part: BlockPart): boolean {
  return part.paragraph || part.heading === true || part.quote === true || part.table === true || part.list === true
}

/**
 * A part laid out by the replay the landing lays it out with (placeInline):
 * up to where it can follow it, a table whole, in the terminal's width.
 */
function layoutPart(part: BlockPart, markdown: string, spans: readonly SourceSpan[], width: number, columns: number, mode: LinkMode): ProseLayout | null {
  if (part.paragraph) return layoutProse(markdown, width, spans, mode, true)
  if (part.heading) return layoutHeading(markdown, width, spans, mode, true)
  if (part.quote) return layoutQuote(markdown, width, spans, mode, true)
  if (part.table) return layoutTable(markdown, columns, spans, width, mode)
  if (part.list) return layoutList(markdown, width, spans, mode, true)
  return null
}

/**
 * Whether inline math written next, after `written`, lands where its part is
 * laid out up to it (blockParts, the parts the landing lays out): a paragraph,
 * a heading, a list, a blockquote or a table the replay follows that far
 * (`width`: the width prose wraps at; `columns`: the terminal's width, which
 * tables are laid out in; `mode`: how the engine draws links and the terminal
 * emoji sequences). Anywhere else (a code block, a part the replay doesn't
 * follow up to there) the formula is drawn as plain Unicode, so streaming
 * writes it unpadded: padding there would stay behind as gaps. The stream
 * itself asks this of every formula in a run at once (writeProse).
 */
export function placeable(written: string, width: number, columns = width + REPLY_INDENT, mode: LinkMode = {}): boolean {
  // A stand-in for the formula, so the line it starts is part of the block read.
  const text = written + 'x'
  const part = blockParts(text)?.find(one => one.start < text.length && one.end >= text.length)
  if (!part || !layable(part)) return false
  const at = text.length - 1 - part.start
  return layoutPart(part, text.slice(part.start, part.end), [{ start: at, end: at + 1 }], width, columns, mode)?.places[0] != null
}

/**
 * An inline preview with no pad (stress QA: a table cell narrower than the
 * padded one): its Unicode alone, its image drawn in those cells, scaled down
 * to fit them (no further than measureInline allows). Null where the padded
 * preview has no pad, or the image can't be fitted.
 */
export function narrowPreview(tex: string, env: InlineEnv): InlinePreview | null {
  const padded = inlinePreview(tex, env)
  if (!padded || !padded.markdown.endsWith(INLINE_PAD)) return null
  const body = padded.markdown.replace(new RegExp(`${INLINE_PAD}+$`), '')
  const columns = padded.columns - (padded.markdown.length - body.length)
  const box = measureInline(tex, env, columns)
  if (!box || box.columns > columns) return null
  return { markdown: body.includes(INLINE_JOIN) ? body : body + INLINE_MARK, tex, columns }
}

/**
 * The cells from the reply column's left edge to the text of the list item a
 * block written after `written` would be in (a display formula indented under
 * an item), where the replay lays out the list written so far; undefined
 * outside a list item, or where it doesn't. The block's first line is put
 * where MarkdownWriter.block puts it (blockOpening).
 */
export function itemIndent(written: string, width: number, mode: LinkMode = {}): number | undefined {
  const text = written + blockOpening(written).before + 'x'
  const part = blockParts(text)?.at(-1)
  if (!part?.list || part.end !== text.length) return undefined
  const block = text.slice(part.start, part.end)
  const place = layoutList(block, width, [{ start: block.length - 1, end: block.length }], mode, true)?.places[0]
  return place && place.col > 0 ? place.col : undefined
}

/** How many quotes the line being written opens with (its leading `>` markers; 0 outside a quote). */
export function quotesOpening(written: string): number {
  const line = written.slice(written.lastIndexOf('\n') + 1)
  return (/^[ \t]{0,3}(?:>[ \t]?)+/.exec(line)?.[0].match(/>/g) ?? []).length
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

/** Lines of a table (from its first row holding inline math) held back while it streams, at most: past them it is written as it comes. */
const MAX_HELD_ROWS = 40

/** A table's delimiter row (marked's: a `|` or a `:` in it), its line's quote markers and indentation taken off. */
const DELIMITER_ROW = /^\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/

/** A line that starts a block of its own, ending a table (marked's interruptions), quote markers and indentation taken off. */
const ENDS_TABLE = /^(?:#{1,6}(?:[ \t]|$)|```|~~~|[-*+][ \t]|\d{1,9}[.)][ \t]|<[A-Za-z/!?]|(?:[-*_][ \t]*){3,}$)/

/**
 * Where to hold the segments of a flush back from, as an offset of the text
 * pushed (undefined: hold nothing): a table's columns, so the rows its inline
 * math lands on, depend on every row of it, the header row included, which
 * reads as a paragraph until the delimiter row under it arrives. So a line
 * holding inline math that could be a table's header (a `|` in it) waits for
 * the next line, and a table holding inline math is held from its first row
 * that does until it ends (a blank line, or a line that starts another
 * block), at most MAX_HELD_ROWS lines. The engine shows nothing for them
 * meanwhile, as for a display block being held. `text`: what was pushed, up to
 * the end of the flush's segments.
 */
export function holdFrom(text: string, segments: readonly Segment[]): number | undefined {
  // The last lines, up to a blank one or a display formula (a block of its own: a table before it has ended), with their starts.
  const floor = segments.findLast(isDisplayMath)?.end ?? 0
  const lines: { start: number; text: string }[] = []
  let end = text.endsWith('\n') ? text.length - 1 : text.length
  while (lines.length < MAX_HELD_ROWS + 2 && end > floor) {
    const start = text.lastIndexOf('\n', end - 1) + 1
    const line = text.slice(start, end)
    if (line.trim() === '' || start < floor) break
    lines.unshift({ start, text: line.replace(/^[ \t>]*/, '') })
    if (start === 0) break
    end = start - 1
  }
  if (lines.length === 0) return undefined
  const math = (from: number, to: number) => segments.some(segment => segment.kind === 'math' && !segment.display && segment.start < to && segment.end > from)
  const endOf = (k: number) => (k + 1 < lines.length ? lines[k + 1]!.start : text.length)
  const first = segments[0]?.start ?? 0
  // The table the last line is in: a header with a `|`, its delimiter row (the first: a row may look like
  // one), then rows up to the last line that start no other block.
  const ended = lines.findLastIndex(line => ENDS_TABLE.test(line.text))
  let top: number | undefined
  for (let d = Math.max(1, ended + 2); d < lines.length; d++) {
    if (DELIMITER_ROW.test(lines[d]!.text) && /[|:]/.test(lines[d]!.text) && lines[d - 1]!.text.includes('|')) {
      top = d - 1
      break
    }
  }
  // Else the last line may be a header whose delimiter row is still to come.
  if (top === undefined) top = lines.at(-1)!.text.includes('|') ? lines.length - 1 : undefined
  if (top === undefined) return undefined
  for (let k = top; k < lines.length; k++) {
    if (endOf(k) <= first || !math(lines[k]!.start, endOf(k))) continue
    // A table longer than the lines held is written as it comes.
    if (lines.length - k > MAX_HELD_ROWS) return undefined
    return Math.max(lines[k]!.start, first)
  }
  return undefined
}

/** Splits a flush's segments at an offset of the text pushed: those written now, and those held back (a formula across it is held whole). */
function splitAt(segments: readonly Segment[], at: number): [Segment[], Segment[]] {
  const now: Segment[] = []
  const held: Segment[] = []
  for (const segment of segments) {
    if (segment.end <= at) now.push(segment)
    else if (segment.start >= at || segment.kind === 'math') held.push(segment)
    else {
      const cut = at - segment.start
      now.push({ kind: 'text', text: segment.text.slice(0, cut), start: segment.start, end: at })
      held.push({ kind: 'text', text: segment.text.slice(cut), start: at, end: segment.end })
    }
  }
  // A formula held whole holds what comes after it too, never what comes before it.
  while (now.length > 0 && held.length > 0 && now.at(-1)!.end > held[0]!.start) held.unshift(now.pop()!)
  return [now, held]
}

/** Segments with each run of text segments one after another joined into one (held text and the text after it read together). */
function joinText(segments: readonly Segment[]): Segment[] {
  const out: Segment[] = []
  for (const segment of segments) {
    const last = out.at(-1)
    if (segment.kind === 'text' && last?.kind === 'text' && last.end === segment.start) out[out.length - 1] = { kind: 'text', text: last.text + segment.text, start: last.start, end: segment.end }
    else out.push(segment)
  }
  return out
}

/**
 * One message streaming through MessageDisplay: its scanner, its line state
 * and how much of what was pushed has been shown. One per `message_id` (every
 * text block between tool calls is its own message).
 */
export class MessageStream {
  private readonly scanner: LineScanner
  private readonly writer = new MarkdownWriter()
  private readonly plan = new StreamPlan()
  private pushed = ''
  private shown = 0
  /** Segments completed but held back (see holdFrom). */
  private held: Segment[] = []

  constructor(scanner: LineScanner = createLineScanner()) {
    this.scanner = scanner
  }

  /** The last push was the message's final one. */
  private final = false

  /**
   * The text to show for one flush (HELD_DISPLAY while a display block or a
   * table is held) and the previews it wrote. With `pending`, the stream
   * waits for TeX: compile them (TexBook), then call resume().
   */
  push(delta: string, final: boolean, env: StreamEnv): StreamRewrite {
    this.pushed += delta
    this.final = final
    return this.take(this.scanner.push(delta, final), env)
  }

  /** What was held for TeX, once the outcomes push() waited for are known (more may be pending). */
  resume(env: StreamEnv): StreamRewrite {
    return this.take([], env)
  }

  private take(fresh: readonly Segment[], env: StreamEnv): StreamRewrite {
    const final = this.final
    let segments = joinText([...this.held, ...fresh])
    this.held = []
    let from = final || segments.length === 0 || !(env.inline && env.images) ? undefined : holdFrom(this.pushed.slice(0, segments.at(-1)!.end), segments)
    // In a quote, the line break ending a display block's closing line waits for the next line, which decides
    // how the quote goes on after the block (MarkdownWriter.prepare): as the landing writes it, the two read together.
    const last = segments.at(-1)
    const display = segments.at(-2)
    if (!final && from === undefined && last?.kind === 'text' && /^[ \t]*\r?\n$/.test(last.text) && display && isDisplayMath(display)) {
      if (QUOTE_LEAD.test(this.pushed.slice(this.pushed.lastIndexOf('\n', display.start - 1) + 1, display.start))) from = last.start
    }
    if (from !== undefined) [segments, this.held] = splitAt(segments, from)
    // A segment TeX has yet to draw holds it and everything after it (shown once TeX answers or gives up).
    const pending: TexDocument[] = []
    // A diagram in a blockquote stays as written: no TeX for it.
    const quoted = (segment: Segment) => QUOTE_LEAD.test(this.pushed.slice(this.pushed.lastIndexOf('\n', segment.start - 1) + 1, segment.start))
    const wait = env.tex ? segments.findIndex(segment => !(segment.kind === 'math' && segment.diagram !== undefined && quoted(segment)) && texPending(segment, env, pending)) : -1
    if (wait >= 0) {
      // The later ones TeX will be asked for too: compiled side by side, not one per resume.
      for (const segment of segments.slice(wait + 1)) {
        const document = segment.kind === 'math' && !(segment.diagram !== undefined && quoted(segment)) ? texDocument(segment, env) : undefined
        if (document && !texBook.known(document) && !pending.some(one => one.text === document.text)) pending.push(document)
      }
      this.held = [...segments.slice(wait), ...this.held]
      segments = segments.slice(0, wait)
    }
    const waiting = pending.length > 0 ? { pending } : {}
    if (segments.length === 0) return { text: HELD_DISPLAY, records: [], ...waiting }
    this.shown = segments[segments.length - 1]!.end
    return { ...rewriteSegments(segments, env, this.writer, this.plan), ...waiting }
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
 * blank row). Images are laid over the prose pieces' text (InlineImage); an
 * `image` piece of its own is no longer planned, and is drawn as before.
 */
export type Piece =
  | { kind: 'prose'; text: string; gap: boolean; inline?: InlineImage[] }
  /** `copy`: what its copy button copies, where that is not the formula as a display block (a diagram's source). */
  | { kind: 'image'; tex: string; image: RenderedImage; gap: boolean; copy?: string }
  | { kind: 'note'; text: string; gap: boolean }

/** Cells from a blockquote's edge to its text: the bar and a space (the engine's quote border and padding). */
export const QUOTE_INDENT = 2

/**
 * A formula's image drawn over its preview in a prose piece's drawing: the
 * preview's first row and column there. An inline formula's is one row; a
 * display formula's (`display`) spans its preview's rows and carries the copy
 * button.
 */
export interface InlineImage {
  tex: string
  image: RenderedImage
  row: number
  col: number
  /** A display formula's image (its preview's rows, in the reply column, a quote or a list item). */
  display?: true
  /** What its copy button copies where that is not the formula as a display block: a diagram's source. */
  copy?: string
}

/** An inline image as the overlay beside its prose piece lays it out: in the overlay's column, by margins (inlineFlow). */
export interface InlineSlot {
  inline: InlineImage
  /** Rows from the bottom of the slot before it (from the piece's top for the first); negative to go back up. */
  marginTop: number
  /** Columns from the piece's left edge. */
  marginLeft: number
}

/**
 * The images of a prose piece laid out in the flow of a column that starts
 * at the piece's top-left cell: each at PIECE_TOP + its row, `left` + its
 * column, every slot as tall as its image. In the flow, not absolute: the
 * engine draws an absolute box whose top falls above the screen on the
 * screen's first row (clamped, not clipped), so in the fullscreen layout every
 * formula scrolled above the viewport piled up on its top row; a box in the
 * flow scrolls and clips as text does.
 */
export function inlineFlow(inline: readonly InlineImage[], left: number): InlineSlot[] {
  const sorted = [...inline].sort((a, b) => a.row - b.row || a.col - b.col)
  let bottom = 0
  return sorted.map(one => {
    const top = PIECE_TOP + one.row
    const slot = { inline: one, marginTop: top - bottom, marginLeft: left + one.col }
    bottom = top + one.image.rows
    return slot
  })
}

export interface LandedPlan {
  pieces: Piece[]
  /** Whether anything differs from the text as it came. */
  changed: boolean
}

export interface PlanOptions {
  /** The cells a display formula's image spans outside quotes and lists: the width prose wraps at (proseWidthFor). */
  maxColumns: number
  /**
   * Draws a display formula `rows` tall (rows from measureDisplay when not
   * given), `maxColumns` wide when given (a quote's width); absent where no
   * images are drawn. Throws TexError.
   */
  draw?: (tex: string, rows?: number, maxColumns?: number) => RenderedImage
  /** The width prose wraps at (maxProseWidth included); maxColumns when absent. A quote's text is two cells narrower. */
  width?: number
  /** The rows a display formula's image takes `maxColumns` wide (measureDisplay); absent, math read back as LaTeX keeps its preview. Throws TexError. */
  measure?: (tex: string, maxColumns: number) => number
  /** Splits markdown into prose and math (core's scan unless given; diagrams marked when `diagram` is given). */
  scan?: (markdown: string) => Segment[]
  /**
   * Draws a diagram for TeX (a ```latex, ```tex or ```tikz block, a bare
   * tikzpicture, tikzcd or circuitikz) `rows` tall when given: its image,
   * `{ error }` where TeX failed on it for good (it stays as written, with a
   * `not rendered` line), or null where it isn't drawn now (it stays as
   * written). Absent: diagrams are left as written.
   */
  diagram?: (source: string, kind: DiagramKind, rows?: number) => RenderedImage | { error: string } | null
  /**
   * The options: math of a kind set to `raw` is left as written. Images and
   * Unicode are `draw` and `inline` (absent for a kind set to `unicode`).
   */
  math?: Partial<MathOptions>
  /**
   * Inline math drawn as images: where (one text row), the width prose wraps
   * at, the terminal's width (tables are laid out in it; the reply column and
   * two cells when absent), the drawing (throws TexError), and how the engine
   * draws links and the terminal emoji sequences (`hyperlinks`,
   * `emojiSequences`, KittexEnv's). Absent: inline math stays Unicode.
   */
  inline?: {
    env: InlineEnv
    width: number
    columns?: number
    /** Draws a formula `columns` wide, its ink where `place` says in that slot (inkPlaceBeside). */
    draw: (tex: string, columns: number, place?: InkPlace) => RenderedImage
    hyperlinks?: boolean | undefined
    emojiSequences?: boolean | undefined
  }
  /**
   * How the engine draws links and the terminal emoji sequences (KittexEnv's),
   * for the replays of lists and quotes that hold display math, inline images
   * on or off (`inline` gives them too); unknown when absent.
   */
  mode?: LinkMode
  /** The terminal's width (tables are laid out in it), inline images on or off; `inline`'s, else the reply column and two cells. */
  columns?: number
  /**
   * The text is a block kittex streamed (its rewrite, as the engine shows
   * it): what lies outside its recorded previews is never scanned for LaTeX
   * again (fuzz FUZZ-12: a currency `$`, or a `$` a preview shows, would pair
   * into a formula the reply never had), except from `raw` on, where the
   * stream gave up and passed the model's text as written.
   */
  streamed?: { raw?: number }
}

interface Span {
  start: number
  end: number
  record: PreviewRecord
}

/**
 * A flush's records, each with where its preview is in the text the engine
 * shows (`at`): `text` is the flush's rewrite, `offset` how much was shown
 * before it. Every preview is written into its flush as recorded, in order, so
 * each is found after the one before it; one that isn't keeps no `at` (and is
 * never found by position).
 */
export function locatePreviews(text: string, records: readonly PreviewRecord[], offset: number): PreviewRecord[] {
  let from = 0
  return records.map(record => {
    const at = text.indexOf(record.preview, from)
    if (at < 0) return record
    from = at + record.preview.length
    return { ...record, at: offset + at }
  })
}

/** How far the landed text may sit from the shown one (the engine dropping leading blank lines): beyond, a record isn't looked for. */
const SHIFT_LIMIT = 256

/**
 * The previews of a streamed block (records with `at`) that the landed text
 * holds, each at the place it was written: two formulas with the same
 * preview (`\tfrac12` and `\frac12` are both `½`) keep their own TeX (fuzz
 * FUZZ-7). The landed text may lack the block's last flush (a preview cut
 * short, or past its end, isn't there and stays text) and may have lost
 * leading blank lines: every record is shifted as the first one found is.
 */
export function previewsAt(text: string, records: readonly PreviewRecord[]): Span[] {
  const placed = records.filter(record => record.at !== undefined).sort((a, b) => a.at! - b.at!)
  const spans: Span[] = []
  let shift: number | undefined
  let end = 0
  for (const record of placed) {
    const at = record.at!
    if (shift === undefined) {
      if (text.startsWith(record.preview, at)) {
        shift = 0
      } else {
        const found = text.indexOf(record.preview, Math.max(0, at - SHIFT_LIMIT))
        if (found < 0 || Math.abs(found - at) > SHIFT_LIMIT) continue
        shift = found - at
      }
    }
    const start = at + shift
    if (start < end || !text.startsWith(record.preview, start)) continue
    spans.push({ start, end: start + record.preview.length, record })
    end = start + record.preview.length
  }
  return spans
}

/**
 * Whether a landed text is the block these records (with `at`) were written
 * in: some of them are in it, and every one whose place it reaches is there.
 * For a block found by its text (no link from its row's id).
 */
export function blockMatches(text: string, records: readonly PreviewRecord[]): boolean {
  const want = records.filter(record => record.at !== undefined && record.at + record.preview.length <= text.length).length
  return want > 0 && previewsAt(text, records).length >= want
}

/**
 * The whole previews kittex recorded that the text holds, in order, trailing
 * spaces of each line ignored, the newest record of a preview winning: for
 * records found by content (no `at`). A preview cut short (a render before
 * the block's last flush) does not match, and stays text.
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
 * longer one wins where two overlap), found by content (records with no
 * `at`). Only previews written with a pad are recorded, so plain text can't
 * be taken for one.
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
const SLOT = /\ue000(\d+)\ue001/
const slot = (index: number) => `\ue000${index}\ue001`

/** What is cut out of the prose: a refused formula's dim note, in the reply column. */
type Item = { kind: 'note'; text: string }

/** Marks a preview in planned markdown: open, its index, separator, the preview, close (private-use characters). */
const MARK_OPEN = ''
const MARK_SEP = ''
const MARK_CLOSE = ''
const MARK = /(\d+)([^]*)/g

interface InlineMark {
  tex: string
  columns: number
  /** What the formula is written as where it gets no image, when that may differ (math read back as LaTeX, never shown padded). */
  plain?: string
  /** With `plain`: the formula's number among the reply's inline math read back as LaTeX (see planLanded's passes). */
  id?: number
  /** A display formula's preview, its image `rows` tall drawn over it: in the reply column, a quote or a list item. */
  rows?: number
  /** With `rows`: written in a blockquote this deep (its image starts two cells in per quote). */
  quote?: number
  /** With `rows`: a diagram's placeholder, its picture drawn by PlanOptions.diagram (`tex` its source). */
  diagram?: DiagramKind
}

/**
 * How many times a plan is drawn: math read back as LaTeX that got no image
 * takes its next form each time (padded, unpadded, plain: see planLanded).
 */
const PLAN_PASSES = 4

/** What may hold LaTeX as written: math delimiters, a bare environment, a ```math fence. */
const LATEX_HINT = new RegExp(String.raw`\$|\\[([]|\\begin\{|${MATH_FENCE}`)

/** What may hold a diagram as written: a ```latex, ```tex or ```tikz fence. */
const DIAGRAM_HINT = new RegExp(DIAGRAM_FENCE)

/**
 * The engine's test for a text it reads as markdown (its `sn`, core's
 * MARKDOWN_LIKE): a text with none of these and no `&nbsp;` is drawn as one
 * paragraph as written, its escapes showing.
 */
const MARKDOWN_LIKE =
  /[#*`|[>\-_~]|\n[\r\n]|\r\r|\r\n[\r\n]|(?:^|[\r\n]) {0,3}(?:\d+[.)]|\+) |(?:^|[\r\n]) {0,3}=+ *(?:[\r\n]|$)|https?:\/\/|www\./

/** Whether the engine reads a text as markdown. */
export function readAsMarkdown(text: string): boolean {
  return MARKDOWN_LIKE.test(text) || text.includes(PREVIEW_PAD)
}

/**
 * What a prose piece cut out of a block the engine read as markdown is
 * given at its end when it holds no markdown of its own, so the engine reads
 * it as markdown too (fuzz FUZZ-11: drawn as written, `\$5` would show its
 * backslash): a blank line, which a drawing of prose trims.
 */
export const MARKDOWN_TAIL = '\n\n'

/**
 * Plans the drawing of a landed block. The previews kittex wrote while it
 * streamed get their images again, laid over them in the prose (the engine
 * draws the text as it streamed, so nothing moves); math still written as
 * LaTeX (a reply read back after `--resume`, or one that never streamed
 * through MessageDisplay) gets the previews streaming would have written and
 * the same images; a formula MathJax refuses keeps its source with a
 * `not rendered` line under it, dim in the reply column (italic, as it
 * streamed, in a list item or a quote). Without images (`draw` absent)
 * everything stays markdown.
 */
export function planLanded(text: string, records: readonly PreviewRecord[], options: PlanOptions): LandedPlan {
  // Math read back as LaTeX was never shown, so how it is written is free: a
  // formula padded for an image that its part's layout then didn't place
  // (its row too narrow) takes its next form, as streaming tries them
  // (padded, then unpadded where its image fits its Unicode's cells, then
  // plain), and the plan is drawn again.
  let forms = new Map<number, number>()
  for (let pass = 1; ; pass++) {
    const { plan, unplaced } = planOnce(text, records, options, forms)
    if (unplaced.length === 0 || pass === PLAN_PASSES) return plan
    forms = new Map(forms)
    for (const id of unplaced) forms.set(id, (forms.get(id) ?? 0) + 1)
  }
}

/** The text before `at` on its line: a list item's indent, a quote's `>`s, or nothing at a line's start. */
function leadAt(text: string, at: number): string {
  return text.slice(text.lastIndexOf('\n', at - 1) + 1, at)
}

/**
 * Whether a block written at `at` in `text` is inside a list item or a quote
 * (its lines carry the lead before it), as MarkdownWriter.block writes it:
 * after a line that only opens quotes, or after an indent where the text so
 * far is a list (an indented line after a blank one is a paragraph of its
 * own). Where the text can't be read, a block after an indent counts as in
 * a list item.
 */
function nestedAt(text: string, at: number): boolean {
  const lead = leadAt(text, at)
  if (lead === '') return false
  if (QUOTE_LEAD.test(lead)) return true
  if (!/^[ \t]*$/.test(lead)) return false
  const last = blockParts(text.slice(0, at) + 'x')?.at(-1)
  return last === undefined || !last.paragraph
}

/**
 * One pass of planLanded: the plan, the math read back as LaTeX in the form
 * `forms` gives it (by InlineMark id: 0 padded, 1 unpadded, 2 plain); and
 * those written padded or unpadded that got no image.
 */
function planOnce(text: string, records: readonly PreviewRecord[], options: PlanOptions, forms: ReadonlyMap<number, number>): { plan: LandedPlan; unplaced: number[] } {
  let inlineId = 0
  const writer = new MarkdownWriter()
  const items: Item[] = []
  const marks: InlineMark[] = []
  const { maxColumns } = options
  const width = options.width ?? maxColumns
  const mode = modeOf(options)
  const positional = records.some(record => record.at !== undefined)
  // The rows a display formula's image takes: measured, or drawn where only a drawing is given.
  const { draw } = options
  const measure =
    options.measure ??
    (draw
      ? (tex: string, columns: number) => {
          try {
            return draw(tex, undefined, columns).rows
          } catch (error) {
            // Characters the font can't draw: the preview's own rows, as measureDisplay reserves them.
            const lines = error instanceof GlyphError ? previewDisplay(tex, { maxColumns: previewColumns(columns) }) : null
            if (lines) return lines.length
            throw error
          }
        }
      : undefined)
  let changed = false

  const put = (item: Item): string => {
    items.push(item)
    return slot(items.length - 1)
  }

  const mark = (markdown: string, inline: InlineMark) => {
    changed = true
    marks.push(inline)
    writer.text(MARK_OPEN + (marks.length - 1) + MARK_SEP + markdown + MARK_CLOSE)
  }

  // A display preview written as a block, marked for its image.
  const markBlock = (lines: string[], inline: InlineMark) => {
    changed = true
    marks.push(inline)
    lines[0] = MARK_OPEN + (marks.length - 1) + MARK_SEP + lines[0]
    lines[lines.length - 1] += MARK_CLOSE
    writer.block(lines)
  }

  // A refused formula: its source, and the note under it (dim in the reply column; italic, as it streamed, in a list item or a quote).
  const refused = (tex: string, reason: string, nested: boolean) => {
    changed = true
    const lines = refusedMarkdownLines(tex, reason, maxColumns)
    if (options.draw && !nested) lines[lines.length - 1] = put({ kind: 'note', text: notRenderedText(reason, maxColumns) })
    writer.block(lines)
  }

  // A display formula read back as LaTeX, `columns` wide: the preview streaming writes, marked for its image. False where it gets none.
  const overlay = (tex: string, columns: number, nested: boolean, quote?: number): boolean => {
    if (!options.draw || !measure) return false
    let rows: number
    try {
      rows = measure(tex, columns)
    } catch (error) {
      if (!(error instanceof TexError)) throw error
      refused(tex, reasonOf(error), nested)
      return true
    }
    const lines = displayPreviewLines(tex, columns, rows)
    if (!lines) return false
    markBlock(lines, { tex, columns, rows, ...(quote !== undefined ? { quote } : {}) })
    return true
  }

  // A display formula that gets no image: the preview (or the source, a refused formula's note) as streaming writes it there.
  // Why MathJax refuses a formula in the reply column, as streaming finds it (measured where a measure is given).
  const refusal = (tex: string): string | undefined => {
    if (!measure) return texErrorOf(tex, { cellWidth: 10, cellHeight: 20, emPx: 16, maxColumns, ink: { r: 0, g: 0, b: 0 } })
    try {
      measure(tex, maxColumns)
      return undefined
    } catch (error) {
      if (!(error instanceof TexError)) throw error
      return reasonOf(error)
    }
  }

  // A display formula that gets no image: the preview (or the source, a refused formula's note) as streaming
  // writes it there: padded to its image's rows where streaming measured it (`measured`), else its own rows.
  const kept = (tex: string, columns: number, nested: boolean, measured = true) => {
    changed = true
    let rows: number | undefined
    try {
      rows = measured && options.draw && measure ? measure(tex, columns) : undefined
    } catch (error) {
      if (!(error instanceof TexError)) throw error
      return refused(tex, reasonOf(error), nested)
    }
    const lines = displayPreviewLines(tex, columns, rows)
    if (lines) return void writer.block(lines)
    const reason = refusal(tex)
    if (reason) refused(tex, reason, nested)
    else writer.block(sourceMarkdownLines(tex))
  }


  // Display math read back as LaTeX, where streaming would have written it.
  const display = (tex: string) => {
    const depth = writer.quoteDepth()
    const recent = unmarked(writer.recent())
    if (depth > 0) {
      // In a quote, as wide as its text, at any depth (fuzz FUZZ-9), where the quote so far is one the replay follows.
      const columns = quoteColumnsFor(width, depth)
      // Where it isn't, streaming wrote it unmeasured (no image could be placed): its preview's own rows.
      if (placeable(recent, width, maxColumnsOf(options), mode)) {
        if (overlay(tex, columns, true, depth)) return
        return kept(tex, columns, true)
      }
      return kept(tex, columns, true, false)
    }
    if (nestedAt(recent, recent.length)) {
      // In a list item: as wide as its text, its image over it; the preview alone where the replay doesn't follow the list.
      const indent = options.draw && measure ? itemIndent(recent, width, mode) : undefined
      if (indent !== undefined && overlay(tex, Math.max(1, width - indent), true)) return
      return kept(tex, maxColumns, true)
    }
    if (overlay(tex, maxColumns, false)) return
    kept(tex, maxColumns, false)
  }

  // Prose that may still hold LaTeX (read back after --resume, or never streamed).
  const proseMath = (source: string) => {
    if (source === '') return
    if (!LATEX_HINT.test(source) && !(options.diagram && DIAGRAM_HINT.test(source))) return writer.text(source)
    for (const segment of (options.scan ?? (markdown => scan(markdown, { diagrams: options.diagram !== undefined })))(source)) {
      if (segment.kind === 'text') {
        writer.text(segment.text)
      } else if (leftRaw(segment, options.math)) {
        const written = rawSource(segment)
        if (written !== segment.raw) changed = true
        writer.text(written)
      } else if (!segment.display) {
        const fallback = inlineFallback(segment)
        const id = inlineId++
        const form = forms.get(id) ?? 0
        const env = options.inline?.env
        const preview = !env || form > 1 ? null : form === 0 ? (inlinePreview(segment.tex, env, options.inline!.width) ?? texInlinePreview(segment.tex, env, options.inline!.width)) : narrowPreview(segment.tex, env)
        const padded = preview && preview.columns <= options.inline!.width ? preview : null
        if (padded) {
          mark(padded.markdown, { tex: segment.tex, columns: padded.columns, plain: fallback, id })
          continue
        }
        changed = true
        writer.text(fallback)
      } else if (segment.diagram !== undefined) {
        diagram(segment)
      } else {
        display(segment.tex)
      }
    }
  }

  // A diagram as written (a reply read back after --resume, or one that never streamed): the placeholder streaming
  // writes, its picture laid over it; where TeX failed on it, as written with its note; else as written.
  const diagram = (segment: MathSegment) => {
    const recent = unmarked(writer.recent())
    const top = writer.quoteDepth() === 0 && !nestedAt(recent, recent.length)
    const drawn = options.diagram && options.draw && top ? options.diagram(segment.tex, segment.diagram!) : null
    if (drawn === null) return writer.text(segment.raw)
    changed = true
    if ('error' in drawn) return void writer.block([...segment.raw.split('\n'), '', put({ kind: 'note', text: notRenderedText(drawn.error, maxColumns) })])
    markBlock(diagramPlaceholder(diagramLabel(segment.tex), drawn.rows, maxColumns, segment.tex), { tex: segment.tex, columns: maxColumns, rows: drawn.rows, diagram: segment.diagram! })
  }

  // Prose between the previews found: a streamed block's is never scanned again, except where its stream gave up.
  const prose = (source: string, offset: number) => {
    if (source === '') return
    if (options.streamed) {
      const raw = options.streamed.raw
      if (raw === undefined || offset + source.length <= raw) return writer.text(source)
      const cut = Math.max(0, raw - offset)
      writer.text(source.slice(0, cut))
      return proseMath(source.slice(cut))
    }
    if (positional || !options.inline) return proseMath(source)
    // Records found by content: inline previews in the prose too.
    let at = 0
    for (const span of findInlinePreviews(source, records)) {
      proseMath(source.slice(at, span.start))
      mark(source.slice(span.start, span.end), { tex: span.record.tex, columns: span.record.columns ?? 0 })
      at = span.end
    }
    proseMath(source.slice(at))
  }

  let at = 0
  for (const span of positional ? previewsAt(text, records) : findPreviews(text, records)) {
    prose(text.slice(at, span.start), at)
    const { record } = span
    const written = text.slice(span.start, span.end)
    const nested = nestedAt(text, span.start)
    if (record.inline) {
      if (options.inline) mark(written, { tex: record.tex, columns: record.columns ?? 0 })
      else writer.text(written)
    } else if (!options.draw) {
      writer.text(written)
    } else if (record.error !== undefined) {
      // In a list item or a quote the note stays as it streamed: cut out, the rest of the list or quote would be drawn anew (fuzz FUZZ-1).
      if (nested) {
        writer.text(written)
      } else {
        changed = true
        const lines = written.split('\n')
        lines[lines.length - 1] = lines[lines.length - 1]!.replace(/\S.*$/, put({ kind: 'note', text: notRenderedText(record.error, maxColumns) }))
        writer.text(lines.join('\n'))
      }
    } else if (record.diagram !== undefined) {
      // A diagram's placeholder: its picture laid over it (it is written only outside quotes and lists).
      if (nested || !options.diagram) writer.text(written)
      else mark(written, { tex: record.tex, columns: maxColumns, rows: record.rows, diagram: record.diagram })
    } else if (record.quote !== undefined) {
      mark(written, { tex: record.tex, columns: quoteColumnsFor(width, record.quote), rows: record.rows, quote: record.quote })
    } else if (record.indent !== undefined) {
      mark(written, { tex: record.tex, columns: Math.max(1, width - record.indent), rows: record.rows })
    } else if (nested) {
      // In a list item the replay didn't follow while streaming: its preview stays, the list whole.
      writer.text(written)
    } else {
      mark(written, { tex: record.tex, columns: maxColumns, rows: record.rows })
    }
    at = span.end
  }
  prose(text.slice(at), at)
  const unplaced: number[] = []
  const planned = writer.take()
  let pieces = placeOverlays(piecesOf(planned, items), marks, options, readAsMarkdown(unmarked(planned)), unplaced)
  if (pieces.length > 1 && readAsMarkdown(unmarked(planned))) {
    // A piece cut out of a text the engine reads as markdown is read so too.
    pieces = pieces.map(piece => (piece.kind === 'prose' && !readAsMarkdown(piece.text) ? { ...piece, text: piece.text + MARKDOWN_TAIL } : piece))
  }
  return { plan: { pieces, changed }, unplaced }
}

/** The cells a display preview (and its image) takes `depth` quotes deep in prose `width` wide (see quoteColumns). */
function quoteColumnsFor(width: number, depth: number): number {
  return Math.max(1, width - QUOTE_INDENT * depth)
}

/** Planned markdown without its inline marks and item slots (an item stands as one letter): what the replays read. */
function unmarked(markdown: string): string {
  return markdown.replace(/\d+|/g, '').replace(/\d+/g, 'x')
}

/** The previews that are drawn over (see InlineMark) and the spans they are found by. */
type MarkedSpan = SourceSpan & { mark: InlineMark }

/** What laying a part out gives: the images placed in it (rows from the part's first row) and its rows, null where they aren't known. */
interface LaidOut {
  images: [MarkedSpan, InlineImage][]
  rows: number | null
}

/**
 * Gives the previews marked in prose pieces their images, laid over them.
 * A piece's text is drawn by the engine as it streamed; its parts
 * (blockParts: paragraphs, lists, headings, quotes, tables, code blocks) are
 * laid out one after another as the engine stacks them, a blank row between
 * two where it puts one, and each preview drawn whole on a row gets its
 * image there: an inline formula's over its cells, a display formula's over
 * its rows (a paragraph of preview lines, one row each; in a list item or a
 * quote, from the row its first line is on). Where a part's rows aren't known
 * (one the replay doesn't follow: a code block, a character of unknown
 * width), the piece is cut after it, before the next part with a preview:
 * that part's drawing starts a piece of its own, a blank row above it where
 * the whole has one. So a block is drawn in as few pieces as it can be (each
 * is a round trip through the engine), and a list or a quote is never cut
 * at a formula. Previews that get no image keep their text: as streamed, or,
 * read back as LaTeX, its plain Unicode where that moves no image.
 * `markdown`: the whole planned text is one the engine reads as markdown.
 */
function placeOverlays(pieces: readonly Piece[], marks: readonly InlineMark[], options: PlanOptions, markdown: boolean, unplaced: number[] = []): Piece[] {
  const out: Piece[] = []
  for (const piece of pieces) {
    if (piece.kind !== 'prose' || !piece.text.includes(MARK_OPEN)) {
      out.push(piece)
      continue
    }
    // The marks taken out: the text as streamed, and where each preview is in it.
    let text = ''
    const spans: MarkedSpan[] = []
    let last = 0
    for (const match of piece.text.matchAll(MARK)) {
      text += piece.text.slice(last, match.index)
      const start = text.length
      text += match[2]!
      const one = marks[Number(match[1])]!
      spans.push({ start, end: text.length, width: one.columns, mark: one })
      last = match.index + match[0].length
    }
    text += piece.text.slice(last)

    const parts = partsOf(text)
    const inside = parts.map(part => spans.filter(span => span.start >= part.start && span.end <= part.end))
    const lastMarked = inside.findLastIndex(list => list.length > 0)
    const placed = new Set<MarkedSpan>()
    /** Runs of parts drawn as one piece: where each starts, its gap, its images, and the end of the last part that has one. */
    const runs: { start: number; gap: boolean; images: InlineImage[]; drawnTo: number }[] = []
    /** The current run's rows so far, to the end of its last part; null where they aren't known. */
    let rows: number | null = null
    for (const [k, part] of parts.entries()) {
      if (k > lastMarked) break
      const own = inside[k]!
      let offset = 0
      if (runs.length === 0 || (own.length > 0 && rows === null)) {
        runs.push({ start: part.start, gap: runs.length === 0 ? piece.gap : part.gap, images: [], drawnTo: part.start })
      } else if (rows === null) {
        continue
      } else {
        offset = rows + (part.gap ? 1 : 0)
      }
      const run = runs[runs.length - 1]!
      const laid = layOut(text.slice(part.start, part.end), part, own, options, markdown, k < lastMarked)
      for (const [span, image] of laid.images) {
        placed.add(span)
        run.images.push({ ...image, row: image.row + offset })
        run.drawnTo = part.end
      }
      rows = laid.rows === null ? null : offset + laid.rows
    }
    for (const span of spans) if (span.mark.id !== undefined && !placed.has(span)) unplaced.push(span.mark.id)

    // Text with math read back as LaTeX that got no image in its plain form, where that moves no image (after a run's last one).
    const plainFrom = (from: number, to: number, after: number) => {
      let written = ''
      let at = from
      for (const span of spans) {
        if (span.start < Math.max(from, after) || span.end > to || span.mark.plain === undefined || placed.has(span)) continue
        written += text.slice(at, span.start) + span.mark.plain
        at = span.end
      }
      return written + text.slice(at, to)
    }
    // A run that got no image is drawn with the one before it.
    const drawn = runs.filter((run, r) => r === 0 || run.images.length > 0)
    if (drawn.every(run => run.images.length === 0)) {
      out.push({ kind: 'prose', text: plainFrom(0, text.length, 0), gap: piece.gap })
      continue
    }
    for (const [r, run] of drawn.entries()) {
      const end = drawn[r + 1]?.start ?? text.length
      let body = plainFrom(r === 0 ? 0 : run.start, end, run.drawnTo)
      // Trailing blank lines dropped (the engine trims them): a piece's drawing ends at its last part.
      body = body.replace(/[ \t\r\n]+$/, '')
      if (r > 0) body = body.replace(/^(?:[ \t]*\n)+/, '')
      out.push({ kind: 'prose', text: body, gap: run.gap, ...(run.images.length > 0 ? { inline: run.images } : {}) })
    }
  }
  return out
}

/**
 * The parts of a piece's text (blockParts). Where marked's tokens don't
 * account for the whole text, the parts of its longest start that ends at a
 * blank line and is read whole, then the rest as one part whose rows aren't
 * known: a preview before what can't be read still gets its image.
 */
function partsOf(text: string): BlockPart[] {
  const whole = blockParts(text)
  if (whole) return whole
  const ends = [...text.matchAll(/\n[ \t]*\n/g)].map(match => match.index)
  // The parts of a start, while each longer start that is read keeps the ones before it.
  let low = 0
  let high = ends.length - 1
  let best: { parts: BlockPart[]; end: number } | undefined
  while (low <= high) {
    const mid = (low + high) >> 1
    const parts = blockParts(text.slice(0, ends[mid]!))
    if (parts) {
      best = { parts, end: ends[mid]! }
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  if (!best) return []
  const rest = text.slice(best.end).search(/\S/)
  if (rest < 0) return best.parts
  const start = best.end + rest
  return [...best.parts, { start, end: text.length, paragraph: false, type: 'block', gap: true }]
}

/**
 * Lays one part out (`block`, its text) and draws the images of the
 * previews in it (`spans`, offsets in the piece): see placeOverlays. `rows`
 * is asked for only where a later part needs it (`needRows`).
 */
function layOut(block: string, part: BlockPart, spans: readonly MarkedSpan[], options: PlanOptions, markdown: boolean, needRows: boolean): LaidOut {
  const width = options.inline?.width ?? options.width ?? options.maxColumns
  const lines = previewParagraph(block, part, width, modeOf(options).emojiSequences === true)
  if (lines !== null) {
    // A paragraph of display preview lines (a formula in the reply column, or one kept as its preview): a row each.
    const images: [MarkedSpan, InlineImage][] = []
    for (const span of spans) {
      if (span.mark.rows === undefined || !options.draw) continue
      const row = (block.slice(0, span.start - part.start).match(/\n/g) ?? []).length
      if (span.mark.diagram !== undefined) {
        // A diagram's picture, its copy button copying its source.
        const drawn = options.diagram?.(span.mark.tex, span.mark.diagram, span.mark.rows) ?? null
        // As wide as the picture: centred across the placeholder, as its label is.
        if (drawn !== null && 'png' in drawn) {
          const col = Math.max(0, Math.floor((span.mark.columns - drawn.columns) / 2))
          images.push([span, { tex: span.mark.tex, image: drawn, row, col, display: true, copy: span.mark.tex }])
        }
        continue
      }
      try {
        images.push([span, { tex: span.mark.tex, image: options.draw(span.mark.tex, span.mark.rows, span.mark.columns), row, col: 0, display: true }])
      } catch (error) {
        if (!(error instanceof TexError)) throw error
      }
    }
    return { images, rows: lines }
  }
  if (spans.length === 0 && !needRows) return { images: [], rows: null }
  // A rule is drawn as its `---`, one row of the prose run (blocks.ts).
  if (part.type === 'hr') return { images: [], rows: 1 }
  if (part.quote) return placeQuote(block, spans, part.start, options)
  if (!(part.paragraph || part.list || part.heading || part.table)) return { images: [], rows: null }
  // A paragraph with no markdown of its own in a text the engine reads as markdown is laid out as markdown.
  const asMarkdown = part.paragraph && markdown && !readAsMarkdown(block)
  const layout = layoutOf(part, options)
  const laid = placeImages(asMarkdown ? block + '\n\nx' : block, spans, part.start, options, layout)
  const known = laid.layout && laid.layout.stop === undefined ? laid.layout.rows - (asMarkdown ? 2 : 0) : null
  return { images: laid.images, rows: known }
}

/**
 * A paragraph part of display preview lines (each led by a pad), when every
 * line fits its row: its rows, one a line. Null for anything else.
 */
function previewParagraph(block: string, part: BlockPart, width: number, sequences: boolean): number | null {
  if (!part.paragraph) return null
  const lines = block.replace(/\s+$/, '').split('\n')
  for (const line of lines) {
    // A pad leads every line, after the indent of a paragraph that starts indented (at most three cells: four would be code).
    if (!/^[ \t]{0,3}&nbsp;/.test(line)) return null
    const cells = textWidth(line.replaceAll(PREVIEW_PAD, ' ').replace(/\\(.)/g, '$1'), sequences)
    if (!(cells >= 0 && cells <= width)) return null
  }
  return lines.length
}

/** The terminal's width a plan is drawn in: given, or the reply column and the bullet's two cells. */
function maxColumnsOf(options: PlanOptions): number {
  return options.columns ?? options.inline?.columns ?? options.maxColumns + REPLY_INDENT
}

/** How the engine draws links and the terminal emoji sequences, for the replays: `inline`'s, else `mode`. */
function modeOf(options: PlanOptions): LinkMode {
  const { inline, mode } = options
  return { hyperlinks: inline?.hyperlinks ?? mode?.hyperlinks, emojiSequences: inline?.emojiSequences ?? mode?.emojiSequences }
}

/** A replay of the engine's drawing of a part (layoutProse and the others). */
type Layout = (markdown: string, width: number, spans: readonly SourceSpan[], mode: LinkMode) => ProseLayout | null

/** The replay that lays out a part: a table in the terminal's width, everything else in the prose width given. */
function layoutOf(part: ProseBlock, options: PlanOptions): Layout {
  if (part.table) return (markdown, width, spans, mode) => layoutTable(markdown, maxColumnsOf(options), spans, width, mode)
  // Up to where the replay can follow the part: a preview before that is placed all the same.
  const layout = part.list ? layoutList : part.heading ? layoutHeading : layoutProse
  return (markdown, width, spans, mode) => layout(markdown, width, spans, mode, true)
}

/**
 * Lays out one part (a paragraph, a list, a heading, a table) and draws the
 * images of the previews found whole on a row: inline ones (see
 * inlineImages), and a display preview in a list item over its rows, from the
 * cell its first line starts in. Also gives the layout (its rows).
 */
function placeImages(
  block: string,
  spans: readonly MarkedSpan[],
  offset: number,
  options: PlanOptions,
  layoutOf: Layout,
): { images: [SourceSpan & { mark: InlineMark }, InlineImage][]; layout: ProseLayout | null } {
  const inline = options.inline ? spans.filter(span => span.mark.rows === undefined) : []
  const overlays = options.draw ? spans.filter(span => span.mark.rows !== undefined) : []
  const at = (span: SourceSpan): SourceSpan => ({ start: span.start - offset, end: span.end - offset, ...(span.width === undefined ? {} : { width: span.width }) })
  const bodies = inline.map(span => bodyOf(block, at(span)))
  const asked = [...inline.map(at), ...bodies.flatMap(body => (body ? [body] : [])), ...overlays.map(span => firstLine(block, at(span)))]
  const layout = layoutOf(block, options.inline?.width ?? options.width ?? options.maxColumns, asked, modeOf(options))
  if (!layout) return { images: [], layout: null }
  let next = inline.length
  const bodyPlaces = bodies.map(body => (body ? layout.places[next++]! : null))
  const images = options.inline ? inlineImages(inline, layout.places.slice(0, inline.length), options.inline, layout.lines, bodyPlaces, bodies) : []
  for (const [k, span] of overlays.entries()) {
    const place = layout.places[next + k]
    if (!place) continue
    try {
      images.push([span, { tex: span.mark.tex, image: options.draw!(span.mark.tex, span.mark.rows, span.mark.columns), row: place.row, col: place.col, display: true }])
    } catch (error) {
      if (!(error instanceof TexError)) throw error
    }
  }
  return { images, layout }
}

/** A display preview's first line (drawn on one row: what it is found by). */
function firstLine(block: string, span: SourceSpan): SourceSpan {
  const end = block.indexOf('\n', span.start)
  return { start: span.start, end: end < 0 || end > span.end ? span.end : end }
}

/** An inline preview's Unicode without its pad, and its cells: where it is found when the pad went to another row. Null with no pad. */
function bodyOf(block: string, span: SourceSpan): SourceSpan | null {
  let end = span.end
  while (end > span.start && block[end - 1] === INLINE_PAD) end--
  if (end === span.end || end === span.start || span.width === undefined) return null
  return { start: span.start, end, width: span.width - (span.end - end) }
}

/**
 * The images of inline previews laid out at `places` (one per span): those
 * drawn whole on a row, as wide as their image, each with its ink placed by
 * the cells beside its slot on that row of `lines` (the layout's rows). One
 * whose pad went to another row (a table cell narrower than it: its row
 * grows, while streaming as once landed) is drawn over its Unicode alone, at
 * `bodies`' cells (`bodyPlaces`), where its image fits them (measureInline).
 */
function inlineImages(
  spans: readonly MarkedSpan[],
  places: readonly (SpanPlace | null)[],
  inline: NonNullable<PlanOptions['inline']>,
  lines: readonly string[] = [],
  bodyPlaces: readonly (SpanPlace | null)[] = [],
  bodies: readonly (SourceSpan | null)[] = [],
): [MarkedSpan, InlineImage][] {
  const images: [MarkedSpan, InlineImage][] = []
  for (const [k, whole] of places.entries()) {
    const span = spans[k]!
    const { mark } = span
    let place = whole && whole.columns === mark.columns ? whole : null
    let columns = mark.columns
    const body = bodyPlaces[k]
    if (!place && body && body.columns === bodies[k]!.width && measureInline(mark.tex, inline.env, body.columns)?.columns === body.columns) {
      place = body
      columns = body.columns
    }
    if (!place || columns < 1) continue
    const line = lines[place.row]
    const ink = line === undefined ? 'center' : inkPlaceBeside(...cellsBeside(line, place.col, columns))
    try {
      images.push([span, { tex: mark.tex, image: inline.draw(mark.tex, columns, ink), row: place.row, col: place.col }])
    } catch (error) {
      if (!(error instanceof TexError)) throw error
    }
  }
  return images
}

/**
 * Draws the images of a blockquote's previews, laid out as the engine lays
 * the quote out (layoutQuote: the bar, the text two cells in, nested quotes
 * and lists as text): each inline preview drawn whole on a row gets its image
 * there, each display preview an image over its rows from the row its first
 * line is on, two cells in per quote it is written in. Where the replay
 * doesn't follow the quote, its display previews one quote deep are placed by
 * placeQuoted and its inline ones keep their text. Gives the quote's rows
 * where the replay follows it whole.
 */
function placeQuote(quote: string, spans: readonly MarkedSpan[], offset: number, options: PlanOptions): LaidOut {
  const inline = options.inline ? spans.filter(span => span.mark.rows === undefined) : []
  const quoted = options.draw ? spans.filter(span => span.mark.rows !== undefined) : []
  // A display preview is found by its first line, which is drawn on one row.
  const firstLine = (span: SourceSpan) => {
    const end = quote.indexOf('\n', span.start - offset)
    return { start: span.start - offset, end: end < 0 || end > span.end - offset ? span.end - offset : end }
  }
  const layout = layoutQuote(quote, options.inline?.width ?? options.width ?? options.maxColumns, [
    ...inline.map(span => ({ start: span.start - offset, end: span.end - offset, width: span.width })),
    ...quoted.map(firstLine),
  ], modeOf(options), true)
  if (!layout) return { images: placeQuoted(quote, quoted.filter(span => (span.mark.quote ?? 1) === 1), offset, options), rows: null }
  const images = options.inline ? inlineImages(inline, layout.places.slice(0, inline.length), options.inline, layout.lines) : []
  for (const [k, span] of quoted.entries()) {
    const place = layout.places[inline.length + k]
    if (!place) continue
    try {
      const image = options.draw!(span.mark.tex, span.mark.rows, span.mark.columns)
      images.push([span, { tex: span.mark.tex, image, row: place.row, col: QUOTE_INDENT * (span.mark.quote ?? 1), display: true }])
    } catch (error) {
      if (!(error instanceof TexError)) throw error
    }
  }
  return { images, rows: layout.stop === undefined ? layout.rows : null }
}

/**
 * Draws the display previews written in a blockquote over them. The engine
 * draws a quote's text as one box two cells in (a bar and a space), its
 * paragraphs a blank row apart, wrapped at the quote's width; the text before
 * each preview is laid out as paragraphs, and an image goes where the preview's
 * first row is. Past text that can't be laid out, the previews stay.
 */
function placeQuoted(quote: string, spans: readonly MarkedSpan[], offset: number, options: PlanOptions): [MarkedSpan, InlineImage][] {
  if (!options.draw) return []
  const images: [MarkedSpan, InlineImage][] = []
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
      const layout = layoutProse(before, span.mark.columns, [], modeOf(options))
      if (!layout) break
      row += layout.rows + 1
    }
    try {
      const image = options.draw(span.mark.tex, span.mark.rows, span.mark.columns)
      images.push([span, { tex: span.mark.tex, image, row, col: QUOTE_INDENT, display: true }])
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

// ─── The local TeX: diagrams, and math MathJax refuses ───────────────────────

/** Where the local LaTeX draws in a stream (StreamEnv.tex). */
export interface TexUse {
  /** Diagrams, and display math MathJax refuses. */
  block: boolean
  /** Inline math MathJax refuses. */
  inline: boolean
}

/** One short line kittex adds to its instructions to the model where the local LaTeX draws diagrams. */
export const DIAGRAM_INSTRUCTIONS =
  'Diagrams are drawn here too: for a figure, plot, molecule, circuit or commutative diagram, write TikZ (or pgfplots, chemfig, ' +
  'circuitikz, tikz-cd) in a ```latex code block, a tikzpicture or similar environment with no preamble, and it is shown as a picture.'

/** Where a diagram is drawn: the width prose wraps at, centred, MAX_PICTURE_ROWS tall at most, on the terminal's background. */
export function pictureEnvFor(env: KittexEnv, columns = env.columns): PictureEnv {
  return {
    ...renderEnvFor(env, columns),
    maxColumns: proseWidthFor(env, columns),
    maxRows: MAX_PICTURE_ROWS,
    ...(env.background ? { background: env.background } : {}),
  }
}

/**
 * Whether a segment waits for TeX: one TeX would draw (texDocument) whose
 * outcome TexBook doesn't know yet; its document is added to `pending`.
 */
function texPending(segment: Segment, env: StreamEnv, pending: TexDocument[]): boolean {
  const document = texDocument(segment, env)
  if (!document || texBook.known(document)) return false
  pending.push(document)
  return true
}

/**
 * The document TeX would draw a segment as, in a stream with these options:
 * a diagram that draws something, or math MathJax refuses (not merely too
 * wide, nor a character its font lacks).
 */
export function texDocument(segment: Segment, env: StreamEnv): TexDocument | undefined {
  if (segment.kind !== 'math' || !env.tex || !env.images || leftRaw(segment, env.math)) return undefined
  if (segment.diagram !== undefined) {
    if (!env.tex.block || env.math?.block === 'unicode') return undefined
    const job = diagramJob(segment.tex, segment.diagram)
    return job && 'document' in job ? job.document : undefined
  }
  if (segment.display) {
    if (!env.tex.block || env.math?.block === 'unicode') return undefined
    try {
      measureDisplay(segment.tex, renderEnvFor(env))
      return undefined
    } catch (error) {
      if (!(error instanceof TexError)) throw error
      return refusedByMathJax(segment.tex, true) ? mathJob(segment.tex, true) : undefined
    }
  }
  if (!env.tex.inline || !env.inline || measureInline(segment.tex, inlineEnvFor(env)) !== null) return undefined
  return refusedByMathJax(segment.tex, false) ? mathJob(segment.tex, false) : undefined
}

/** Whether MathJax refuses a formula outright (an unknown macro or environment), not for its size or a glyph it lacks. */
function refusedByMathJax(tex: string, display: boolean): boolean {
  if (tex.length > MAX_TEX_LENGTH) return false
  try {
    typeset(tex, { display })
    return false
  } catch (error) {
    if (!(error instanceof TexError)) throw error
    return !(error instanceof GlyphError)
  }
}

/** A display formula MathJax refused, as TeX drew it: the rows its image takes, TeX's error, or undefined (not drawn by TeX). */
function texDisplay(tex: string, env: RenderEnv): { rows: number } | { error: string } | undefined {
  const document = mathJob(tex, true)
  const outcome = document ? texBook.known(document) : undefined
  if (!outcome) return undefined
  if (!outcome.ok) return outcome.lasting ? { error: outcome.error } : undefined
  try {
    return { rows: measureDisplayResult(texResult(outcome.picture), env).rows }
  } catch (error) {
    if (!(error instanceof TexError)) throw error
    return { error: reasonOf(error) }
  }
}

/**
 * The preview of an inline formula MathJax refused and TeX drew: as
 * inlinePreview's, its Unicode read with the macros MathJax doesn't know
 * dropped (\unit{m/s^2} as m/s²), padded to the TeX image's cells.
 */
export function texInlinePreview(tex: string, env: InlineEnv, rowWidth = env.maxColumns): InlinePreview | null {
  const document = mathJob(tex, false)
  const outcome = document ? texBook.known(document) : undefined
  // Not drawn yet (read back after --resume): asked for, so the block draws it once TeX has.
  if (document && texBook.ready && (!outcome || (!outcome.ok && !outcome.lasting)) && refusedByMathJax(tex, false)) texBook.ask(document)
  if (!outcome?.ok) return null
  const box = measureInlineResult(texResult(outcome.picture), env)
  if (!box) return null
  let unicode = relaxedUnicode(tex)?.trim()
  if (unicode && TAG_OPEN.test(unicode)) return null
  if (unicode) unicode = ungroupScripts(unicode, tex)
  if (!unicode || /[\\\s]/.test(unicode.replaceAll(' ', ''))) return null
  const width = textWidth(unicode)
  if (width < 1) return null
  const columns = Math.max(box.columns, width)
  if (columns > Math.min(255, env.maxColumns, rowWidth)) return null
  const body = escapeInline(unicode.replaceAll(' ', INLINE_JOIN))
  const mark = columns === width && !unicode.includes(' ') ? INLINE_MARK : ''
  return { markdown: body + mark + INLINE_PAD.repeat(columns - width), tex, columns }
}

/** A formula's one-line Unicode with the control sequences MathJax doesn't know taken out, their arguments kept; null where there is none. */
export function relaxedUnicode(tex: string): string | null {
  let source = tex
  for (let pass = 0; pass < 8; pass++) {
    const unicode = previewInline(source, undefined, { tight: true })
    if (unicode !== null) return unicode
    const reason = inlineTexError(source)
    const unknown = reason === undefined ? undefined : /Undefined control sequence (\\[A-Za-z]+)/.exec(reason)?.[1]
    if (unknown === undefined) return null
    source = source.replace(new RegExp(`${unknown.replace(/\\/g, '\\\\')}(?![A-Za-z])`, 'g'), ' ')
  }
  return null
}

/**
 * Writes a diagram for TeX. Drawn (TexBook knows its picture), its
 * placeholder: as many rows as the picture's image, a word for what it is in
 * the middle one, recorded so the landing draws the picture there; refused or
 * failed for good, the block as written with a `not rendered` line under it;
 * anything else (no TeX here, LaTeX that draws nothing, TeX too slow, inside
 * a quote or a list item), the block exactly as written.
 */
function writeDiagram(segment: MathSegment, env: StreamEnv, writer: MarkdownWriter, plan: StreamPlan, records: PreviewRecord[]): void {
  const kind = segment.diagram!
  const drawn = env.images && env.tex?.block && env.math?.block !== 'unicode' && writer.quoteDepth() === 0
  const nested = drawn && itemIndent(writer.recent().slice(plan.anchor), proseWidthFor(env), linkModeOf(env)) !== undefined
  const job = drawn && !nested ? diagramJob(segment.tex, kind) : undefined
  if (!job) return writer.text(segment.raw)
  const { maxColumns } = renderEnvFor(env)
  const failed = (reason: string) => {
    const preview = writer.block([...segment.raw.split('\n'), '', '*' + escapeMarkdown(notRenderedText(reason, maxColumns)) + '*'])
    records.push({ preview, tex: segment.tex, rows: 0, error: reason, diagram: kind })
    plan.cut(writer.recent().length)
  }
  if ('refused' in job) return failed(job.refused)
  const outcome = texBook.known(job.document)
  if (!outcome || (!outcome.ok && !outcome.lasting)) {
    // Too slow (or no TeX after all): shown as written, and left so when its block lands.
    texBook.markShownAsSource(job.document)
    return writer.text(segment.raw)
  }
  if (!outcome.ok) return failed(outcome.error)
  const pictureEnv = pictureEnvFor(env)
  let rows: number
  try {
    rows = measurePicture(outcome.picture, pictureEnv).rows
  } catch (error) {
    if (!(error instanceof TexError)) throw error
    return failed(reasonOf(error))
  }
  // Its picture lies over the placeholder once landed: the text after it goes on in the same piece.
  const preview = writer.block(diagramPlaceholder(job.label, rows, pictureEnv.maxColumns, segment.tex))
  records.push({ preview, tex: segment.tex, rows, diagram: kind })
}

/**
 * A diagram's placeholder lines while it waits to land: `rows` rows, its
 * label in the middle one, centred in `maxColumns`. Its last row ends with a
 * tag of its source (PLACEHOLDER_TAG blank cells, each followed by
 * INLINE_MARK or not, by the source's hash): two diagrams of the same size
 * would otherwise write the same placeholder, and a landed block finds each
 * preview by its text.
 */
export function diagramPlaceholder(label: string, rows: number, maxColumns: number, source = ''): string[] {
  const lines = Array.from({ length: Math.max(1, rows) }, () => '')
  lines[Math.floor((lines.length - 1) / 2)] = oneLine(`· ${label} ·`, previewColumns(maxColumns))
  const out = previewMarkdownLines(lines, maxColumns)
  let hash = 0x811c9dc5
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 0x01000193)
  let tag = ''
  // Never as wide as the column: a line that wraps takes another row.
  for (let bit = 0; bit < Math.min(PLACEHOLDER_TAG, maxColumns - 3); bit++) tag += BLANK_CELL + ((hash >>> bit) & 1 ? INLINE_MARK : '')
  const last = out.length - 1
  out[last] = out[last]!.replace(new RegExp(`${BLANK_CELL}$`), '') + tag
  return out
}

/** Cells in a diagram placeholder's tag: 2^16 tags, as wide as the shortest reply column leaves room for. */
const PLACEHOLDER_TAG = 16
