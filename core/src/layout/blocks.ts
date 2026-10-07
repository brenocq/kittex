import type { Token } from 'marked'

import { marked, proseBlocks } from './prose.js'
import type { ProseBlock } from './prose.js'

/*
 * How Claude Code (2.1.291, its markdown component) stacks the parts of a
 * block that no blank line splits: a paragraph right before a list, a heading
 * right before a paragraph, a paragraph right before a code fence or a table.
 *
 * The component walks marked's top-level tokens. Tables, blockquotes and lists
 * are elements of their own (and fenced code, where prose width is capped);
 * every other token is drawn as text appended to one run of prose (a
 * paragraph's text and a newline, a heading's and two, a rule's `---` and
 * one), which is drawn as one text box once an element (or the end) comes,
 * its leading newlines and trailing whitespace trimmed. So, between two
 * tokens with no blank line between them:
 *
 * - after a heading there is always a blank row (its second newline, or, at
 *   the end of a run, the run's blank-line ending giving the next element a
 *   one-row margin);
 * - next to a table or a blockquote there is always a blank row (an element
 *   of kind `block` gets a one-row margin, and so does a run after one);
 * - anywhere else there is none: a paragraph, a rule, a code block and a list
 *   follow each other row after row.
 *
 * A part's own drawing does not depend on what comes after it, and drawn on
 * its own it takes the same rows: its only margin is the one above it, so a
 * block can be drawn part by part, each with a blank row above it or none.
 */

/** A part of the markdown that the engine draws on its own rows: one top-level token, or a run of lists. */
export interface BlockPart extends ProseBlock {
  /**
   * What it is: marked's token type (`paragraph`, `list`, `heading`, `code`,
   * `table`, `blockquote`, `hr`), or `block` for a block not split.
   */
  type: string
  /** A blank row between it and the part before it (false for the first part). */
  gap: boolean
  /** Where the block it is in starts (proseBlocks' block: blank lines part it from the one before). */
  block?: number
}

/** Tokens the component draws as elements of their own with a blank row around them (its `block` kind). */
const BLOCK_ELEMENTS = new Set(['table', 'blockquote'])

/** Tokens a block can be split at: their rows and the rows around them are known. */
const SPLITTABLE = new Set(['paragraph', 'list', 'heading', 'code', 'table', 'blockquote', 'hr'])

/**
 * The parts of `markdown` the engine draws one under the other: the blocks
 * proseBlocks finds (a blank row above each but the first), each split into
 * its top-level tokens where no blank line parts them (consecutive lists kept
 * together, as one list part), with the engine's spacing between them. A
 * token whose rows aren't followed here (HTML, an empty code block) goes,
 * with the rest of its block, into the part before it, which is laid out up
 * to it (a part's drawing never depends on what comes after it); a block
 * that opens with one stays one part (`type: 'block'`). Null when
 * proseBlocks is.
 */
export function blockParts(markdown: string): BlockPart[] | null {
  const blocks = proseBlocks(markdown)
  if (!blocks) return null
  const parts: BlockPart[] = []
  for (const block of blocks) {
    const gap = parts.length > 0
    const split = block.paragraph || block.quote ? null : splitBlock(markdown, block.start, block.end)
    if (split) {
      parts.push(...split.map((part, k) => ({ ...part, ...(k === 0 ? { gap } : {}), block: block.start })))
    } else {
      const type = block.paragraph ? 'paragraph' : block.list ? 'list' : block.quote ? 'blockquote' : block.heading ? 'heading' : block.table ? 'table' : 'block'
      parts.push({ ...block, type, gap, block: block.start })
    }
  }
  return parts
}

/** The parts of one block (no blank line in it), or null when it can't be split. */
function splitBlock(markdown: string, start: number, end: number): BlockPart[] | null {
  const source = markdown.slice(start, end)
  let tokens: Token[]
  try {
    tokens = marked.lexer(source)
  } catch {
    return null
  }
  const parts: BlockPart[] = []
  let at = 0
  for (const token of tokens) {
    if (!source.startsWith(token.raw, at)) return null
    // A code block with no text is drawn as a bare newline: its rows aren't followed here.
    if (!SPLITTABLE.has(token.type) || (token.type === 'code' && (token as { text?: string }).text === '')) {
      // It and the rest of the block are drawn after the part before it, in its rows: that part is laid out up to it.
      const last = parts.at(-1)
      if (!last) return null
      last.end = end
      return parts
    }
    const body = token.raw.replace(/(?:\r?\n[ \t]*)+$/, '')
    const last = parts.at(-1)
    if (token.type === 'list' && last?.type === 'list') {
      // Lists one after another (a new bullet character starts a new list) are stacked as one.
      last.end = start + at + body.length
    } else {
      parts.push({
        start: start + at,
        end: start + at + body.length,
        paragraph: token.type === 'paragraph',
        ...(token.type === 'list' ? { list: true } : {}),
        ...(token.type === 'blockquote' ? { quote: true } : {}),
        ...(token.type === 'heading' ? { heading: true } : {}),
        ...(token.type === 'table' ? { table: true } : {}),
        type: token.type,
        gap: last !== undefined && gapBetween(last.type, token.type),
      })
    }
    at += token.raw.length
  }
  if (at !== source.length || parts.length === 0) return null
  return parts
}

/** Whether the engine leaves a blank row between two tokens that no blank line parts. */
export function gapBetween(before: string, after: string): boolean {
  return before === 'heading' || BLOCK_ELEMENTS.has(before) || BLOCK_ELEMENTS.has(after)
}
