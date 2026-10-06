// Names the cause of a failure from the case it happened in: which part of
// the reply the broken row or formula is in (blockParts' type), why the replay
// refused that part, and whether a preview line is wider than the prose it is
// drawn in. The fuzz report groups failures by these names, and the default
// run tells known causes (known.ts) from new ones by them.

import { blockParts, charsOf, layoutHeading, layoutList, layoutProse, layoutQuote, layoutTable, textWidth, visibleProse } from '../../../plugin/hooks/core.js'
import type { BlockPart, LinkMode } from '../../../plugin/hooks/core.js'
import { replyColumns } from '../../../plugin/hooks/math.js'
import type { Piece, PreviewRecord } from '../../../plugin/hooks/math.js'
import { glyphed } from './screen.js'
import type { DrawContext, Drawing, Row } from './screen.js'

/** The engine's test for a text it reads as markdown (its `sn`). */
const MARKDOWN_LIKE =
  /[#*`|[>\-_~]|\n[\r\n]|\r\r|\r\n[\r\n]|(?:^|[\r\n]) {0,3}(?:\d+[.)]|\+) |(?:^|[\r\n]) {0,3}=+ *(?:[\r\n]|$)|https?:\/\/|www\./

export interface CaseContext {
  ctx: DrawContext
  /** The streamed text (where each preview was written, its line's indent before it). */
  shown: string
  columns: number
  maxProseWidth?: number
  written: readonly PreviewRecord[]
  pieces: readonly Piece[]
  streamed: Drawing
  live: Drawing
}

/** Why the replay refuses a part's text (the first reason found). */
export function refusal(text: string, mode: LinkMode): string {
  if (/\t/.test(text)) return 'tab'
  if (/\r/.test(text)) return 'cr'
  if (/[\u0000-\u0008\u000b-\u001f\u007f]/.test(text)) return 'control'
  if (/<[A-Za-z/!?]/.test(text.replace(/<(?:https?|mailto):[^\s<>]*>/g, ''))) return 'html'
  for (const { start, end } of charsOf(text, mode.emojiSequences === true)) {
    const char = text.slice(start, end)
    if (char === '\n' || textWidth(char, mode.emojiSequences === true) >= 0) continue
    if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}　-〿＀-￯]/u.test(char)) return 'cjk'
    if (/[‍️⃣\u{1f3fb}-\u{1f3ff}\u{1f1e6}-\u{1f1ff}]|\p{Extended_Pictographic}/u.test(char)) return 'emoji-sequence'
    return `char-U+${char.codePointAt(0)!.toString(16).toUpperCase()}`
  }
  if (/\p{Extended_Pictographic}[̀-ͯ]/u.test(text)) return 'emoji-mark'
  if (mode.hyperlinks === undefined && /\]\(|https?:\/\/|www\./.test(text)) return 'links-unknown'
  if (/^[ \t>]*(?:```|~~~)/m.test(text)) return 'code'
  if (/^[ \t>]*(?:[-*+]|\d+[.)])[ \t]/m.test(text) && /^[ \t>]*>/m.test(text)) return 'list-and-quote'
  if (/(?:^|\n)[ \t]+\S/.test(text)) return 'leading-space'
  if (/\S {2,}\S/.test(text)) return 'double-space'
  if (/\]\(/.test(text)) return 'link'
  return 'other'
}

/** Whether the replay lays a part out as kittex calls it (its text as it is). */
function layoutPlain(part: BlockPart, text: string, ctx: DrawContext): boolean {
  if (part.paragraph) return layoutProse(text, ctx.width, [], ctx.mode) !== null
  if (part.list) return layoutList(text, ctx.width, [], ctx.mode) !== null
  if (part.heading) return layoutHeading(text, ctx.width, [], ctx.mode) !== null
  if (part.quote) return layoutQuote(text, ctx.width, [], ctx.mode) !== null
  if (part.table) return layoutTable(text, ctx.columns, [], ctx.width, ctx.mode) !== null
  return false
}

function layoutFor(part: BlockPart, text: string, ctx: DrawContext): boolean {
  const md = glyphed(text)
  if (part.paragraph) return layoutProse(md.replace(/\s+$/, '') + '\n\n\u01c2', ctx.width, [], ctx.mode) !== null
  if (part.list) return layoutList(md, ctx.width, [], ctx.mode) !== null
  if (part.heading) return layoutHeading(md, ctx.width, [], ctx.mode) !== null
  if (part.quote) return layoutQuote(md, ctx.width, [], ctx.mode) !== null
  if (part.table) return layoutTable(md, ctx.columns, [], ctx.width, ctx.mode) !== null
  return false
}

/**
 * Why an inline preview written while streaming got no image: another
 * formula streamed the same preview, or where it landed (the part, laid out
 * or refused, and why). Each place the preview is in is looked at, a refused
 * part first (it can't be told which one lost its image).
 */
export function missingInline(tex: string, c: CaseContext): string {
  const own = c.written.filter(record => record.inline && record.tex === tex)
  const previews = new Set(own.map(record => record.preview))
  if (c.written.some(record => record.inline && record.tex !== tex && previews.has(record.preview))) return 'collision'
  const causes: string[] = []
  for (const piece of c.pieces) {
    if (piece.kind !== 'prose') continue
    // A text with no markdown in it is drawn as written, as one paragraph: the replay follows it whole or not at all.
    if (!MARKDOWN_LIKE.test(piece.text) && !piece.text.includes('&nbsp;') && [...previews].some(p => piece.text.includes(p)) && visibleProse(piece.text, c.ctx.mode) === null) {
      causes.push(`as-written-refused-${refusal(piece.text, c.ctx.mode)}`)
      continue
    }
    const parts = blockParts(piece.text)
    for (const preview of previews) {
      for (let at = piece.text.indexOf(preview); at >= 0; at = piece.text.indexOf(preview, at + 1)) {
        const part = parts?.find(p => p.start <= at && at < p.end)
        if (!part) {
          causes.push('no-part')
          continue
        }
        const text = piece.text.slice(part.start, part.end)
        if (!['paragraph', 'list', 'heading', 'blockquote', 'table'].includes(part.type)) causes.push(`in-${part.type}`)
        else if (!layoutFor(part, text, c.ctx)) causes.push(`${part.type}-refused-${refusal(text, c.ctx.mode)}`)
        else causes.push(`${part.type}-laid-out`)
      }
    }
  }
  return causes.find(cause => !cause.endsWith('-laid-out')) ?? causes[0] ?? 'not-found'
}

/** The widest a display preview line is drawn (its indent and quote bar included) against the prose width. */
function overflowing(c: CaseContext): string | undefined {
  for (const record of c.written) {
    if (record.inline || record.error !== undefined) continue
    const at = c.shown.indexOf(record.preview)
    const lead = at < 0 ? '' : c.shown.slice(c.shown.lastIndexOf('\n', at - 1) + 1, at)
    for (const line of (lead + record.preview).split('\n')) {
      const prefix = /^[ \t>]*/.exec(line)![0]
      const body = line.slice(prefix.length).replace(/&nbsp;/g, ' ').replace(/\\(.)/g, '$1')
      const sequences = c.ctx.mode.emojiSequences === true
      const width = textWidth(prefix.replace(/>/g, '▎')) + Math.max(0, textWidth(body, sequences))
      if (width > c.ctx.width) {
        if (c.maxProseWidth !== undefined && c.ctx.width < replyColumns(c.columns)) return 'maxProseWidth'
        if (/\S/.test(prefix)) return 'quote'
        if (prefix.length > 0) return 'indent'
        return 'wide'
      }
    }
  }
  return undefined
}

function part(row: Row | undefined, mode: LinkMode = {}): string {
  if (!row) return 'none'
  if (row.opaque !== undefined) return `opaque-${row.part ?? 'text'}(${refusal(row.opaque, mode)})`
  return row.part ?? 'blank'
}

function count$(row: Row | undefined): number {
  return ((row?.opaque ?? (row?.cells ?? []).join('')).match(/\$/g) ?? []).length
}

/** A row-level failure (moved, overPreview, unverified): the parts of the first rows that differ, and a preview line too wide. */
export function rowCause(row: number, c: CaseContext): string {
  const over = overflowing(c)
  const notes = c.written.some(record => record.error !== undefined) && c.maxProseWidth !== undefined && c.ctx.width < replyColumns(c.columns)
  // Dollar signs that streamed and did not land: the landed text was scanned again and paired them into formulas.
  // (Display previews' lines aside: their Unicode may show a `$`, and an image takes their place.)
  const dollars = (text: string) => (text.replace(/^.*&nbsp;.*$/gm, '').match(/\$/g) ?? []).length
  const rescanned = dollars(c.shown) > dollars(c.pieces.map(piece => (piece.kind === 'prose' ? piece.text : '')).join(''))
    // or on the very row that differs, when the rows still line up (a preview kept as text, in a nested quote)
    || (c.streamed.rows.length === c.live.rows.length && count$(c.streamed.rows[row]) > count$(c.live.rows[row]))
  const tail = over ? `:preview-wider-than-prose(${over})` : notes ? ':refused-note-wraps(maxProseWidth)' : rescanned ? ':dollars-paired' : ''
  return `${part(c.streamed.rows[row], c.ctx.mode)}>${part(c.live.rows[row], c.ctx.mode)}${tail}`
}

/** A pad left visible: the part of its row, and why the replay refuses it (as kittex lays it out, no glyphs). */
export function padCause(row: number, c: CaseContext): string {
  const at = c.live.rows[row]
  const source = at?.source
  if (at && at.opaque === undefined && source !== undefined && at.part !== 'text') {
    const parts = blockParts(source)
    const first = parts?.[0]
    if (first && !layoutPlain(first, source, c.ctx)) return `${at.part}-refused-${refusal(source, c.ctx.mode)}`
  }
  if (at?.part === 'text' && source !== undefined && visibleProse(source, c.ctx.mode) === null) return `as-written-refused-${refusal(source, c.ctx.mode)}`
  return part(at, c.ctx.mode)
}
