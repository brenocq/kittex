import type { Token, Tokens } from 'marked'

import { Canvas, itemText, markerOf, textWidthOf } from './list.js'
import type { Mapped } from './list.js'
import type { InlineLinks, LinkMode } from './links.js'
import { inline, linksHold, marked, unfollowable } from './prose.js'
import type { VisibleText } from './prose.js'
import { textWidth } from './width.js'

/*
 * What Claude Code draws for a blockquote (2.1.291, its markdown component's
 * quote box and its renderer's `blockquote` case), cell for cell:
 *
 * - The quote is a box with a left border (`▎`, dim, at the box's column 0)
 *   and one cell of padding, so its text starts two cells in and wraps two
 *   cells narrower than prose (the box takes maxProseWidth as its own width
 *   limit, border included). The bar runs down every row of the box.
 * - Everything inside is one italic text: each token drawn as text and joined,
 *   leading newlines and trailing whitespace trimmed. A paragraph is its
 *   lines; a blank line between paragraphs is a blank row; a heading is its
 *   text and a blank line.
 * - A nested quote is text too: every line of it that isn't blank gets a
 *   `▎ ` prefix (one per level below the box), so a long nested line wraps
 *   back to the box's text column, with no bar of its own on the rows it
 *   wraps onto.
 * - A list is text: each item `marker text`, its soft-broken lines indented
 *   by the marker's width plus one, nested lists indented to their item's
 *   text (at most 32 cells), markers as in a list outside a quote (`-`;
 *   numbers, letters a level down, roman numerals two down). An item's long
 *   line wraps back to the quote's text column (no hanging indent). Item text
 *   gets the engine's glueProse (a no-break space before `3.`-like numbers).
 *   A blank line inside an item is a blank row; one between items is not.
 * - Links are drawn as in a paragraph (links.ts), given the engine's link
 *   mode; with none known they are not followed.
 *
 * Anything else in a quote (code blocks and tables, which the engine draws
 * full width, rules, HTML, task items, an item opening with something other
 * than text, a setext heading) makes it unpredictable here, and its math
 * stays Unicode.
 */

/** The quote box's left border, as the engine draws it (`▎`, U+258E). */
export const QUOTE_BAR = '▎'

/** Cells from a quote box's edge to its text: the border and the padding. */
export const QUOTE_TEXT = 2

/** The deepest indent the engine gives a nested list's items. */
const MAX_INDENT = 32

/** How deep quotes and lists may nest here (marked stops nesting further down). */
const MAX_NESTING = 8

/** Items a list in a quote may hold. */
const MAX_ITEMS = 200

/**
 * Where a line may draw differently from the replay: two spaces after a word,
 * where the line wraps (a row could open with the second). A line no wider
 * than its row is drawn as it is.
 */
const INNER_SPACES = /\S {2}/

/**
 * Lays out a block that is one blockquote as the engine draws it in a column
 * `width` cells wide: the bar at column 0 of every row, the text from column
 * QUOTE_TEXT. Null when anything in it isn't followed (see above).
 */
export function drawQuote(markdown: string, width: number, mode: LinkMode = {}): Canvas | null {
  if (unfollowable(markdown) || !(width > QUOTE_TEXT)) return null
  let tokens: Token[]
  try {
    tokens = marked.lexer(markdown)
  } catch {
    return null
  }
  const quote = tokens[0]
  if (quote?.type !== 'blockquote' || tokens.slice(1).some(token => token.type !== 'space')) return null
  if (!markdown.startsWith(quote.raw)) return null
  const raw: Mapped = { text: markdown, map: Array.from({ length: markdown.length }, (_, k) => k) }
  const links: InlineLinks = { hyperlinks: mode.hyperlinks, linked: { value: false } }
  const inner = quoteText(quote as Tokens.Blockquote, raw, 0, 0, links)
  if (!inner || !linksHold(markdown, links)) return null
  // The box's text: leading newlines and trailing whitespace trimmed.
  const lead = /^\n*/.exec(inner.text)![0].length
  const kept = inner.text.slice(lead).trimEnd().length
  const visible: VisibleText = { text: inner.text.slice(lead, lead + kept), source: inner.source.slice(lead, lead + kept) }
  if (visible.text === '') return null
  for (const line of visible.text.split('\n')) {
    if (INNER_SPACES.test(line) && !(textWidth(line) >= 0 && textWidth(line) <= width - QUOTE_TEXT)) return null
  }
  const canvas = new Canvas(width)
  if (!canvas.draw(visible, 0, QUOTE_TEXT, width - QUOTE_TEXT)) return null
  for (let row = 0; row < canvas.rows; row++) canvas.put(QUOTE_BAR, row, 0)
  return canvas
}

/** A text being built, and the markdown offset of each of its UTF-16 units (-1: drawn by the engine, not from the markdown). */
class Text implements VisibleText {
  text = ''
  source: number[] = []

  add(text: string, source = -1): this {
    this.text += text
    for (let i = 0; i < text.length; i++) this.source.push(source < 0 ? -1 : source + i)
    return this
  }

  append(other: VisibleText): this {
    this.text += other.text
    this.source.push(...other.source)
    return this
  }

  /** Splits at newlines, as the engine's `split("\n")` does. */
  lines(): VisibleText[] {
    const out: VisibleText[] = []
    let at = 0
    for (const line of this.text.split('\n')) {
      out.push({ text: line, source: this.source.slice(at, at + line.length) })
      at += line.length + 1
    }
    return out
  }
}

/**
 * The text of a quote's tokens joined (the engine's quote box, before its
 * trims). `raw` holds the quote's raw at `at`; `depth`: quotes around it.
 */
function quoteText(quote: Tokens.Blockquote, raw: Mapped, at: number, depth: number, links: InlineLinks): Text | null {
  if (depth >= MAX_NESTING) return null
  const inner = stripQuote(raw, at, quote)
  if (!inner) return null
  const out = new Text()
  let from = 0
  for (const token of quote.tokens) {
    const start = inner.text.indexOf(token.raw, from)
    if (start < 0 || /\S/.test(inner.text.slice(from, start))) return null
    const drawn = blockText(token, inner, start, depth, links)
    if (!drawn) return null
    out.append(drawn)
    from = start + token.raw.length
  }
  return /\S/.test(inner.text.slice(from)) ? null : out
}

/**
 * The quote's text as marked lexes it (each line's `>` and one space or tab
 * after it taken off), mapped to the markdown; null where marked's own text
 * differs (a setext underline it shields, a list it continues).
 */
function stripQuote(raw: Mapped, at: number, quote: Tokens.Blockquote): Mapped | null {
  if (!raw.text.startsWith(quote.raw, at)) return null
  let text = ''
  const map: number[] = []
  let offset = at
  for (const [k, line] of quote.raw.split('\n').entries()) {
    if (k > 0) {
      text += '\n'
      map.push(raw.map[offset - 1] ?? -1)
    }
    const marker = /^ {0,3}>[ \t]?/.exec(line)?.[0].length ?? 0
    text += line.slice(marker)
    for (let i = marker; i < line.length; i++) map.push(raw.map[offset + i] ?? -1)
    offset += line.length + 1
  }
  return text === quote.text ? { text, map } : null
}

/** One token of a quote as the engine draws it there (its renderer's text form). */
function blockText(token: Token, owner: Mapped, at: number, depth: number, links: InlineLinks): Text | null {
  switch (token.type) {
    case 'space':
      return new Text().add('\n')
    case 'paragraph':
    case 'heading': {
      const block = token as Tokens.Paragraph | Tokens.Heading
      const start = token.type === 'heading' ? at + /^ {0,3}(?:#{1,6}[ \t]+)?/.exec(block.raw)![0].length : at
      if (!owner.text.startsWith(block.text, start) || block.text === '') return null
      const drawn = inlineText(block.tokens, block.text, start, owner, false, links)
      return drawn ? drawn.add(token.type === 'heading' ? '\n\n' : '\n') : null
    }
    case 'blockquote': {
      // A quote in a quote: `▎ ` before each line that isn't blank.
      const inner = quoteText(token as Tokens.Blockquote, owner, at, depth + 1, links)
      if (!inner) return null
      const out = new Text()
      for (const [k, line] of inner.lines().entries()) {
        if (k > 0) out.add('\n')
        if (line.text.trim() !== '') out.add(QUOTE_BAR + ' ')
        out.append(line)
      }
      return out
    }
    case 'list':
      return listText(token as Tokens.List, { text: token.raw, map: owner.map.slice(at, at + token.raw.length) }, 0, '', links)
    default:
      return null
  }
}

/** Inline tokens drawn as text (`src` at `at` in `owner`), offsets mapped to the markdown. */
function inlineText(tokens: readonly Token[], src: string, at: number, owner: Mapped, glue: boolean, links: InlineLinks): Text | null {
  const drawn: VisibleText = { text: '', source: [] }
  if (!inline(drawn, tokens, src, at, glue, links)) return null
  const out = new Text()
  out.text = drawn.text
  out.source = drawn.source.map(offset => (offset < 0 ? -1 : (owner.map[offset] ?? -1)))
  return out
}

/** A list in a quote as text (the engine's `list` case): its items one after another, `depth` lists deep, `indent` before each marker. */
function listText(list: Tokens.List, raw: Mapped, depth: number, indent: string, links: InlineLinks): Text | null {
  if (depth >= MAX_NESTING || list.items.length === 0 || list.items.length > MAX_ITEMS) return null
  const first = list.start === '' || list.start === undefined ? 1 : Number(list.start)
  const last = first + list.items.length - 1
  const out = new Text()
  let at = 0
  for (const [u, item] of list.items.entries()) {
    if (!raw.text.startsWith(item.raw, at)) return null
    const marker = list.ordered ? markerOf(depth, first + u, first, last) : '-'
    const drawn = itemOf(item, { text: item.raw, map: raw.map.slice(at, at + item.raw.length) }, marker, depth, indent, links)
    if (!drawn) return null
    out.append(drawn)
    at += item.raw.length
  }
  return /^\s*$/.test(raw.text.slice(at)) ? out : null
}

/**
 * One item as text (the engine's `list_item` case): its first text line after
 * `indent marker `, its other lines after as many spaces, nested lists
 * indented to its text, blank lines kept.
 */
function itemOf(item: Tokens.ListItem, raw: Mapped, marker: string, depth: number, indent: string, links: InlineLinks): Text | null {
  if (item.task) return null
  const text = itemText(item, raw)
  if (!text) return null
  const hang = indent + ' '.repeat(textWidthOf(marker) + 1)
  const nested = ' '.repeat(Math.min(hang.length, MAX_INDENT))
  const tokens = item.tokens.slice(Math.max(0, item.tokens.findIndex(token => token.type !== 'space')))
  // An item that opens with anything but text is drawn with its marker on a row of its own.
  if (tokens[0]?.type !== 'text') return null
  const out = new Text()
  let opened = false
  let at = 0
  for (const token of tokens) {
    if (token.type === 'space') {
      out.add('\n')
    } else if (token.type === 'list') {
      const list = token as Tokens.List
      if (list.ordered && list.items.every(one => one.tokens.length === 0)) return null // the engine draws it as text
      const start = text.text.indexOf(list.raw, at)
      if (start < 0) return null
      const drawn = listText(list, { text: list.raw, map: text.map.slice(start, start + list.raw.length) }, depth + 1, nested, links)
      if (!drawn) return null
      out.append(drawn)
      at = start + list.raw.length
    } else if (token.type === 'text') {
      const run = token as Tokens.Text
      const start = text.text.indexOf(run.text, at)
      if (start < 0 || !run.tokens) return null
      const drawn = inlineText(run.tokens, run.text, start, text, true, links)
      if (!drawn) return null
      // The first line after the marker, every other line that isn't empty after the hanging indent.
      for (const [k, line] of drawn.add('\n').lines().entries()) {
        if (k > 0) out.add('\n')
        if (k === 0) out.add(opened ? hang : `${indent}${marker} `)
        else if (line.text !== '') out.add(hang)
        out.append(line)
      }
      opened = true
      at = start + run.text.length
    } else {
      return null
    }
  }
  return out
}
