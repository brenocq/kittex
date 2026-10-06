import type { Token, Tokens } from 'marked'

import { inline, LEADING_SPACE, marked, unfollowable } from './prose.js'
import type { VisibleText } from './prose.js'
import { codeWidth } from './width.js'
import { wrapLine } from './wrap.js'

/*
 * What Claude Code draws for a list, cell for cell (its markdown component,
 * 2.1.291): each item is a row of three boxes, the indent (its nesting), the
 * marker's box (the marker and one cell, at least two cells) and the item's
 * text, which wraps in what is left of the row: a hanging indent. Items are
 * stacked with no blank row between them unless marked's tokens say so (an
 * item whose last token is a blank line); a nested list sits under its item,
 * indented to the item's text (at most 32 cells). Markers are `-` for every
 * bullet and `N.` for ordered items: numbers at the top level, letters one
 * level down, lower-case roman numerals two levels down. Item text is drawn
 * as paragraphs are, except that a space before a number ending in `.` or `)`
 * becomes a no-break space (the engine's glueProse).
 *
 * Anything else in a list (code blocks, quotes, tables, rules, headings, HTML,
 * task items, links, an item opening with a nested list) makes it
 * unpredictable here, and its math stays Unicode.
 */

/** The deepest indent the engine gives a nested list's items (`Bwr`). */
const MAX_INDENT = 32

/**
 * The narrowest the text box of an item may be (the engine's minContentWidth,
 * min(10, columns - 6)): narrower, the boxes beside it shrink instead, which
 * isn't followed here.
 */
const MIN_TEXT = 10

/** Items a list may hold (the engine draws bigger lists as plain text, past 300 elements). */
const MAX_ITEMS = 200

/** A string, and the markdown offset each of its UTF-16 units came from. */
export interface Mapped {
  text: string
  map: readonly number[]
}

/** The drawing being built: every visible character in drawing order, with its cell. */
export class Canvas {
  readonly text: string[] = []
  readonly source: number[] = []
  readonly row: number[] = []
  readonly col: number[] = []
  /** Whether the character is the last of a text the engine trims at its end (the end of an item's text or a paragraph). */
  readonly end: boolean[] = []
  private readonly cells: string[][] = []
  rows = 0

  constructor(readonly width: number) {}

  /** Puts text that isn't from a span (a marker) at a cell. */
  put(text: string, row: number, col: number): void {
    this.grow(row + 1)
    for (const [k, char] of [...text].entries()) this.cells[row]![col + k] = char
  }

  /**
   * Draws a text (the engine's prose, after its trims) from `top`, wrapped in
   * a box `width` cells wide whose left edge is `left`. False when a line
   * can't be laid out.
   */
  draw(visible: VisibleText, top: number, left: number, width: number): boolean {
    let r = top
    let at = 0
    for (const line of visible.text.split('\n')) {
      const wrapped = wrapLine(line, width)
      if (!wrapped) return false
      this.grow(r + wrapped.rows)
      for (let i = 0; i < line.length; i++) {
        const row = r + wrapped.row[i]!
        const col = left + wrapped.col[i]!
        this.text.push(line[i]!)
        this.source.push(visible.source[at + i]!)
        this.row.push(row)
        this.col.push(col)
        this.end.push(false)
        if (wrapped.hidden[i]) continue
        const cells = this.cells[row]!
        // A combining mark or the low half of a pair joins the cell before it.
        const code = line.charCodeAt(i)
        if ((code >= 0xdc00 && code <= 0xdfff) || codeWidth(line.codePointAt(i)!) === 0) {
          const last = Math.max(0, cells.length - 1)
          cells[last] = (cells[last] ?? '') + line[i]!
        } else {
          cells[col] = line[i]!
        }
      }
      // The line break itself, as layoutProse counts it.
      this.text.push('\n')
      this.source.push(-1)
      this.row.push(r + wrapped.rows - 1)
      this.col.push(-1)
      this.end.push(false)
      r += wrapped.rows
      at += line.length + 1
    }
    // The break after the last line isn't drawn; the character before it ends the text.
    this.text.pop()
    this.source.pop()
    this.row.pop()
    this.col.pop()
    this.end.pop()
    if (this.end.length > 0) this.end[this.end.length - 1] = true
    return true
  }

  lines(): string[] {
    this.grow(this.rows)
    return this.cells.slice(0, this.rows).map(cells => Array.from(cells, cell => cell ?? ' ').join('').replace(/ +$/, ''))
  }

  private grow(rows: number): void {
    while (this.cells.length < rows) this.cells.push([])
    this.rows = Math.max(this.rows, rows)
  }
}

/**
 * Lays out a block that is a list (or lists, after one paragraph or none) as the engine
 * draws it in a column `width` cells wide. Null when anything in it isn't
 * followed (see above).
 */
export function drawList(markdown: string, width: number): Canvas | null {
  if (unfollowable(markdown) || !(width >= 1)) return null
  let tokens: Token[]
  try {
    tokens = marked.lexer(markdown)
  } catch {
    return null
  }
  const canvas = new Canvas(width)
  let at = 0
  let listed = false
  let after = ''
  for (const token of tokens) {
    if (!markdown.startsWith(token.raw, at)) return null
    const mapped: Mapped = { text: token.raw, map: Array.from({ length: token.raw.length }, (_, k) => at + k) }
    if (token.type === 'paragraph' && !listed && at === 0) {
      // The paragraph's prose, then the list right under it (no blank line between them in the markdown).
      const paragraph = token as Tokens.Paragraph
      const visible = textOf([{ tokens: paragraph.tokens ?? [], text: paragraph.text, at: 0 }], mapped, false)
      if (!visible || !canvas.draw(visible, 0, 0, width)) return null
    } else if (token.type === 'list' && (!listed || after === 'list')) {
      // Lists one after another (a new bullet character starts a new list) are stacked with no row between.
      listed = true
      if (!drawItems(canvas, token as Tokens.List, mapped, 0, 0)) return null
    } else if (token.type !== 'space' || !listed) {
      return null
    }
    at += token.raw.length
    after = token.type
  }
  return listed && at === markdown.length ? canvas : null
}

/** Draws a list's items from the canvas's last row: `indent` cells in, `depth` lists deep. */
function drawItems(canvas: Canvas, list: Tokens.List, raw: Mapped, indent: number, depth: number): boolean {
  if (list.items.length === 0 || list.items.length > MAX_ITEMS) return false
  const first = list.start === '' || list.start === undefined ? 1 : Number(list.start)
  const last = first + list.items.length - 1
  let at = 0
  for (const [u, item] of list.items.entries()) {
    if (!raw.text.startsWith(item.raw, at)) return false
    const marker = list.ordered ? markerOf(depth, first + u, first, last) : '-'
    const blank = u > 0 && endsInBlank(list.items[u - 1]!)
    const itemRaw: Mapped = { text: item.raw, map: raw.map.slice(at, at + item.raw.length) }
    if (!drawItem(canvas, item, itemRaw, marker, indent, depth, blank)) return false
    at += item.raw.length
  }
  // A nested list's raw may keep the newline its last item's lost.
  return /^\s*$/.test(raw.text.slice(at))
}

/**
 * Draws one item (the engine's `on`): its text beside the marker, wrapped in
 * the rest of the row, a nested list under it. `blank`: a blank row above it.
 */
function drawItem(canvas: Canvas, item: Tokens.ListItem, raw: Mapped, marker: string, indent: number, depth: number, blank: boolean): boolean {
  if (item.task) return false
  const text = itemText(item, raw)
  if (!text) return false
  // The item's tokens, as the engine groups them: runs of inline text, and nested lists.
  type Part = { kind: 'inline'; runs: Run[]; newlines: string } | { kind: 'list'; list: Tokens.List; raw: Mapped }
  const parts: Part[] = []
  let at = 0
  for (const token of item.tokens) {
    if (token.type === 'list') {
      const list = token as Tokens.List
      if (list.ordered && list.items.every(one => one.tokens.length === 0)) return false // the engine draws it as text
      const start = text.text.indexOf(list.raw, at)
      if (start < 0) return false
      parts.push({ kind: 'list', list, raw: { text: list.raw, map: text.map.slice(start, start + list.raw.length) } })
      at = start + list.raw.length
      continue
    }
    let part = parts.at(-1)
    if (part?.kind !== 'inline') parts.push((part = { kind: 'inline', runs: [], newlines: '' }))
    if (token.type === 'space') {
      part.runs.push({ space: true })
    } else if (token.type === 'text') {
      const run = token as Tokens.Text
      const start = text.text.indexOf(run.text, at)
      if (start < 0 || !run.tokens) return false
      part.runs.push({ tokens: run.tokens, text: run.text, at: start })
      at = start + run.text.length
    } else {
      return false
    }
  }
  if (parts[0]?.kind !== 'inline') return false
  const box = Math.max(2, textWidthOf(marker) + 1)
  const nested = Math.min(indent + box, MAX_INDENT)
  const left = indent + box
  const room = canvas.width - left
  let gap = blank
  for (const [m, part] of parts.entries()) {
    if (part.kind === 'list') {
      const top = canvas.rows + (gap ? 1 : 0)
      canvas.rows = top
      if (!drawItems(canvas, part.list, part.raw, nested, depth + 1)) return false
      gap = false
      continue
    }
    const drawn = textOf(part.runs, text, true)
    if (!drawn) return false
    const opens = drawn.lead
    if (drawn.text === '' && m > 0) {
      gap ||= drawn.newline
      continue
    }
    if (drawn.text === '' || room < MIN_TEXT) return false
    const top = canvas.rows + (gap || (m > 0 && opens) ? 1 : 0)
    if (m === 0) canvas.put(marker, top, indent)
    if (!canvas.draw(drawn, top, left, room)) return false
    gap = drawn.blankAfter
  }
  return true
}

type Run = { space: true } | { space?: false; tokens: readonly Token[]; text: string; at: number }

/**
 * The text the engine draws for runs of an item's (or a paragraph's) tokens:
 * each text token's inline drawing and a newline, each blank line a newline;
 * then leading newlines and trailing whitespace trimmed. `lead`: it opened
 * with a newline; `blankAfter`: it ended with a blank line (the next part gets
 * a blank row above it); `newline`: it held one at all.
 */
function textOf(
  runs: readonly Run[],
  owner: Mapped,
  glue: boolean,
): (VisibleText & { lead: boolean; blankAfter: boolean; newline: boolean }) | null {
  const out: VisibleText = { text: '', source: [] }
  for (const run of runs) {
    if (run.space) {
      out.text += '\n'
      out.source.push(-1)
      continue
    }
    const drawn: VisibleText = { text: '', source: [] }
    if (!inline(drawn, run.tokens, run.text, run.at, glue)) return null
    out.text += drawn.text + '\n'
    for (const offset of drawn.source) out.source.push(offset < 0 ? -1 : (owner.map[offset] ?? -1))
    out.source.push(-1)
  }
  const raw = out.text
  const lead = /^\n*/.exec(raw)![0].length
  const kept = raw.slice(lead).trimEnd().length
  const text = raw.slice(lead, lead + kept)
  if (LEADING_SPACE.test(text)) return null
  return {
    text,
    source: out.source.slice(lead, lead + kept),
    lead: raw.startsWith('\n'),
    blankAfter: /\n\s*\n$/.test(raw) && raw.endsWith('\n'),
    newline: raw.includes('\n'),
  }
}

/**
 * An item's text (marked's, with the marker and each line's indent taken off)
 * and the markdown offset of each of its characters: line for line, each line
 * of the text ends its line of the raw item.
 */
export function itemText(item: Tokens.ListItem, raw: Mapped): Mapped | null {
  const lines = item.text.split('\n')
  const rawLines = raw.text.split('\n')
  if (lines.length > rawLines.length) return null
  const map: number[] = []
  let rawAt = 0
  for (const [k, line] of lines.entries()) {
    const rawLine = rawLines[k]!
    if (!rawLine.endsWith(line)) return null
    const start = rawAt + rawLine.length - line.length
    for (let i = 0; i < line.length; i++) map.push(raw.map[start + i]!)
    if (k < lines.length - 1) map.push(raw.map[rawAt + rawLine.length] ?? -1)
    rawAt += rawLine.length + 1
  }
  return { text: item.text, map }
}

/** Whether the engine leaves a blank row after an item (its last token a blank line, in its last nested item too). */
function endsInBlank(item: Tokens.ListItem): boolean {
  const last = item.tokens.at(-1)
  if (last?.type === 'space') return true
  if (last?.type === 'list') {
    const inner = (last as Tokens.List).items.at(-1)
    return inner ? endsInBlank(inner) : false
  }
  return false
}

/** An ordered item's marker: `N.` at the top level, letters a level down (`a.`), roman numerals two down (`i.`). */
export function markerOf(depth: number, number: number, first: number, last: number): string {
  if (depth === 1 && first >= 1) return `${letters(number)}.`
  if (depth === 2 && first >= 1 && last <= 3999) return `${roman(number)}.`
  return `${number}.`
}

function letters(n: number): string {
  let out = ''
  while (n > 0) {
    n -= 1
    out = String.fromCharCode(97 + (n % 26)) + out
    n = Math.floor(n / 26)
  }
  return out
}

const ROMAN: readonly (readonly [number, string])[] = [
  [1000, 'm'],
  [900, 'cm'],
  [500, 'd'],
  [400, 'cd'],
  [100, 'c'],
  [90, 'xc'],
  [50, 'l'],
  [40, 'xl'],
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
]

function roman(n: number): string {
  let out = ''
  for (const [value, digits] of ROMAN) while (n >= value) (out += digits), (n -= value)
  return out
}

export function textWidthOf(text: string): number {
  let cells = 0
  for (const char of text) cells += Math.max(0, codeWidth(char.codePointAt(0)!))
  return cells
}
