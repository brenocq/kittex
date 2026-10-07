// A screen model of Claude Code's drawing of a reply block, built on kittex's
// own layout replay (core/src/layout): the streamed text as the engine draws
// it, and the landed drawing as register.tsx composes it (prose pieces drawn
// by the engine, images and notes in the reply column, inline images laid
// over their pieces). Parts the replay can't follow are kept as opaque rows,
// equal only to a part of the very same text.

import { blockParts, charsOf, layoutHeading, layoutList, layoutProse, layoutQuote, layoutTable, wrapRows } from '../../../plugin/hooks/core.js'
import type { LinkMode } from '../../../plugin/hooks/core.js'
import { REPLY_INDENT } from '../../../plugin/hooks/math.js'
import type { Piece } from '../../../plugin/hooks/math.js'

/** One row of the drawing: its cells from the reply column, or an opaque part. */
export interface Row {
  /** Each cell's character ('' for the second cell of a wide one); absent for an opaque row. */
  cells?: string[]
  /** A part the replay can't follow: its source. Its rows are unknown, but the same text draws the same rows. */
  opaque?: string
  /** A display preview's line (a paragraph of `&nbsp;`-led lines). */
  preview?: boolean
  /** Where in the drawn text this row came from (for repro printing). */
  note?: string
  /** The part it is drawn for (blockParts' type), or `image`, `note`. */
  part?: string
  /** That part's markdown (for diagnosis). */
  source?: string
}

export interface Placed {
  kind: 'inline' | 'display' | 'quoted' | 'note'
  tex: string
  /** Row in the block's drawing (0: the row the bullet is on) and cell from the reply column (column 0 is the terminal's column 2). */
  row: number
  col: number
  rows: number
  columns: number
  /** The column it may not pass: the prose width, or the reply column in a table. */
  bound: number
  /** Its piece, or a row above it, is a part the replay can't follow: its row here is not known. */
  unknown?: boolean
}

export interface Drawing {
  rows: Row[]
  images: Placed[]
}

export interface DrawContext {
  /** The width prose wraps at. */
  width: number
  /** The terminal's columns (tables are laid out in it). */
  columns: number
  mode: LinkMode
}

const BLANK: Row = { cells: [] }

/**
 * A text line as cells: wide characters take two, combining marks join the
 * cell before; with `sequences` (a terminal that draws emoji sequences as the
 * engine counts them) an emoji sequence is one two-cell character.
 */
export function cellsOf(line: string, sequences = false): string[] {
  const cells: string[] = []
  for (const char of charsOf(line, sequences)) {
    const text = line.slice(char.start, char.end)
    if (char.width === 0 && cells.length > 0) {
      let at = cells.length - 1
      while (at > 0 && cells[at] === '') at--
      cells[at] += text
    } else if (char.width === 2) {
      cells.push(text, '')
    } else {
      cells.push(text)
    }
  }
  return cells
}

/**
 * What stands for a display preview line's pads (`&nbsp;`) and spaces while
 * the replay lays a part out: one-cell letters (the replay refuses a row that
 * could start with a space, and two spaces in a row), which never break a
 * line. Drawn back as blanks. A preview line is no wider than its box when
 * kittex gets it right; one that is wider is wrapped per cell here, which
 * takes rows as the engine's wrap would (not the same rows exactly).
 */
const PAD_GLYPH = '\u01c2'
const SPACE_GLYPH = '\u01c3'
/** An escaped `<` in a preview line (the replay refuses a `<` before a letter, which could open a tag). */
const LT_GLYPH = '\u01c0'

/** A part's preview lines (those holding `&nbsp;`) with their pads and spaces as glyphs. */
export function glyphed(source: string): string {
  return source
    .split('\n')
    .map(line => {
      const at = line.indexOf('&nbsp;')
      if (at < 0) return line
      return line.slice(0, at) + line.slice(at).replace(/&nbsp;/g, PAD_GLYPH).replace(/ /g, SPACE_GLYPH).replace(/\\</g, LT_GLYPH)
    })
    .join('\n')
}

/**
 * The engine draws a text with none of these (and no `&nbsp;`) as one
 * paragraph, as written, without reading markdown (its `sn`; core's
 * MARKDOWN_LIKE): indentation and escapes stay.
 */
const MARKDOWN_LIKE =
  /[#*`|[>\-_~]|\n[\r\n]|\r\r|\r\n[\r\n]|(?:^|[\r\n]) {0,3}(?:\d+[.)]|\+) |(?:^|[\r\n]) {0,3}=+ *(?:[\r\n]|$)|https?:\/\/|www\./

/** The engine's drawing of a text block (next() of AssistantMessage), its rows from the first row of text. */
export function engineRows(text: string, ctx: DrawContext): Row[] {
  if (!MARKDOWN_LIKE.test(text) && !text.includes('&nbsp;')) {
    // As written: its lines wrapped, leading newlines and trailing whitespace dropped.
    const rows: Row[] = []
    for (const line of text.replace(/^\n+/, '').trimEnd().split('\n')) {
      const wrapped = wrapRows(line, ctx.width, ctx.mode.emojiSequences === true)
      if (!wrapped) return [{ opaque: text, part: 'text', source: text }]
      rows.push(...wrapped.map(row => ({ cells: cellsOf(row, ctx.mode.emojiSequences === true), part: 'text', source: text })))
    }
    return text.trim() === '' ? [] : rows
  }
  const parts = blockParts(text)
  if (!parts) return [{ opaque: text }]
  const rows: Row[] = []
  for (const [k, part] of parts.entries()) {
    if (k > 0 && part.gap) rows.push(BLANK)
    const source = text.slice(part.start, part.end)
    rows.push(...partRows(source, part, ctx).map(row => ({ ...row, part: part.type })))
  }
  return rows
}

function partRows(source: string, part: NonNullable<ReturnType<typeof blockParts>>[number], ctx: DrawContext): Row[] {
  // A display preview's lines: its pads laid out as one-cell letters, drawn back as blanks.
  const padded = source.includes('&nbsp;')
  let markdown = padded ? glyphed(source) : source
  // A paragraph's indentation is drawn as it is (seen live on 2.1.291: `   which gives y.` after a list's
  // display image keeps its three cells); the replay refuses a row opening with a space, so it gets glyphs.
  if (part.paragraph) markdown = markdown.replace(/(^|\n)([ \t]+)/g, (_, lead: string, run: string) => lead + SPACE_GLYPH.repeat(run.length))
  // Whole, or (as kittex lays a part out) up to what the replay can't follow: the rows before it are the
  // engine's, the rest of the part an opaque row.
  const layout = (partial: boolean) => {
    if (part.paragraph) {
      // The engine reads the whole text as markdown (it holds markdown, or `&nbsp;`), this paragraph's escapes
      // included even where the paragraph alone holds no markdown: one more paragraph keeps the replay reading it so.
      const laid = layoutProse(markdown.replace(/\s+$/, '') + '\n\n' + PAD_GLYPH, ctx.width, [], ctx.mode, partial)
      return laid && laid.stop === undefined ? { ...laid, lines: laid.lines.slice(0, -2) } : laid
    }
    if (part.list) return layoutList(markdown, ctx.width, [], ctx.mode, partial)
    if (part.heading) return layoutHeading(markdown, ctx.width, [], ctx.mode, partial)
    if (part.quote) return layoutQuote(markdown, ctx.width, [], ctx.mode, partial)
    if (part.table) return layoutTable(markdown, ctx.columns, [], ctx.width, ctx.mode)
    return null
  }
  const whole = layout(false)
  if (whole) return laidOut(whole.lines, source, ctx.mode.emojiSequences === true)
  const partial = layout(true)
  if (partial?.stop === undefined || partial.stop <= 0) return [{ opaque: source, source }]
  return [...laidOut(partial.lines, source, ctx.mode.emojiSequences === true), { opaque: markdown.slice(partial.stop), source }]
}

/** A part's laid-out lines as rows (preview lines' glyphs drawn back as blanks), each knowing its part's source. */
function laidOut(lines: string[], source: string, sequences: boolean): Row[] {
  return lines.map(line =>
    line.includes(PAD_GLYPH)
      ? { cells: cellsOf(line.replaceAll(PAD_GLYPH, ' ').replaceAll(SPACE_GLYPH, ' ').replaceAll(LT_GLYPH, '<'), sequences), preview: true, source }
      : { cells: cellsOf(line.replaceAll(SPACE_GLYPH, ' '), sequences), source },
  )
}

/**
 * The landed drawing as register.tsx composes the plan's pieces: the first
 * prose piece is the engine's drawing; a later one sits a blank row lower
 * where it has a gap (its own top margin, cancelled with -1 where not); an
 * image or note sits in the reply column, a blank row above it where it has a
 * gap; an inline image lies over its piece at the preview's row and column.
 */
/**
 * What the formulas of a reply were streamed as: each inline one's slot
 * widths, and the display ones laid over a preview in a quote or a list item
 * (drawn as a prose piece's overlay, as inline images are).
 */
export interface Streamed {
  inline: ReadonlyMap<string, readonly number[]>
  overlays: ReadonlySet<string>
}

/** Whether a prose piece's overlay is a display formula's (in a quote or a list item) rather than an inline one's. */
function isOverlay(tex: string, rows: number, columns: number, streamed: Streamed | undefined): boolean {
  if (rows > 1) return true
  if (streamed?.inline.get(tex)?.includes(columns)) return false
  return streamed?.overlays.has(tex) === true
}

export function landedDrawing(pieces: readonly Piece[], ctx: DrawContext, streamed?: Streamed): Drawing {
  const rows: Row[] = []
  const images: Placed[] = []
  for (const [i, piece] of pieces.entries()) {
    if (i > 0 && piece.gap) rows.push(BLANK)
    const top = rows.length
    if (piece.kind === 'prose') {
      const drawn = engineRows(piece.text, ctx)
      // Below a part the replay can't follow (up to its row), the rows aren't known here.
      const above = rows.some(row => row.opaque !== undefined)
      rows.push(...drawn)
      const table = drawn.some(row => row.part === 'table')
      for (const inline of piece.inline ?? []) {
        const unknown = above || drawn.slice(0, inline.row + 1).some(row => row.opaque !== undefined)
        // A display formula in a quote or a list item is drawn over its preview as the inline ones are.
        const quoted = isOverlay(inline.tex, inline.image.rows, inline.image.columns, streamed)
        images.push({ kind: quoted ? 'quoted' : 'inline', tex: inline.tex, row: top + inline.row, col: inline.col, rows: inline.image.rows, columns: inline.image.columns, bound: table ? ctx.columns - 2 : ctx.width, ...(unknown ? { unknown } : {}) })
      }
    } else if (piece.kind === 'image') {
      for (let r = 0; r < piece.image.rows; r++) rows.push({ cells: [], part: 'image' })
      images.push({ kind: 'display', tex: piece.tex, row: top, col: 0, rows: piece.image.rows, columns: piece.image.columns, bound: ctx.columns - 2 })
    } else {
      rows.push({ cells: cellsOf(piece.text, ctx.mode.emojiSequences === true), note: 'note', part: 'note' })
    }
  }
  return { rows, images }
}

/** The terminal column a drawing's cell is at. */
export const LEFT = REPLY_INDENT

/** A drawing as text, for repro printing: ▒ over images, ⟦…⟧ for an opaque part. */
export function showDrawing(drawing: Drawing, limit = 80): string[] {
  const out = drawing.rows.map(row => (row.opaque !== undefined ? `⟦opaque ${JSON.stringify(row.opaque.slice(0, 60))}⟧` : (row.cells ?? []).join('')))
  const grid = drawing.rows.map(row => (row.cells ? [...row.cells] : null))
  for (const image of drawing.images) {
    for (let r = image.row; r < image.row + image.rows; r++) {
      const cells = grid[r]
      if (!cells) continue
      while (cells.length < image.col + image.columns) cells.push(' ')
      for (let c = image.col; c < image.col + image.columns; c++) cells[c] = image.kind === 'inline' ? '▒' : '▓'
      out[r] = cells.join('')
    }
  }
  return out.slice(0, limit).map(line => line.replace(/⠀/g, '⣿').replace(/ /g, '·'))
}
