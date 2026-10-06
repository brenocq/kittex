import type { Token, Tokens } from 'marked'

import { Canvas } from './list.js'
import type { InlineLinks, LinkMode } from './links.js'
import { inline, LEADING_SPACE, linksHold, marked, unfollowable } from './prose.js'
import type { VisibleText } from './prose.js'

/*
 * What Claude Code draws for a heading (2.1.291, its markdown renderer's
 * `heading` case): the heading's inline text, bold (level 1 also italic and
 * underlined), with no `#` marker, no colour and no indent, followed by a blank
 * line. It goes into the same text box as the prose around it, so it wraps as
 * a paragraph does, and the blank line under it is there whether or not the
 * markdown has one (a trailing one is trimmed off the end of the text).
 * Levels 1 to 6 and setext headings (`===`, `---` underlines) are drawn alike.
 * Links in it are drawn as in a paragraph (links.ts), given the link mode.
 */

/** A heading's visible text, laid out from the block's top-left cell. */
export function drawHeading(markdown: string, width: number, mode: LinkMode = {}, partial = false): Canvas | null {
  const visible = visibleHeading(markdown, mode)
  if (!visible || !(width >= 1)) return null
  const canvas = new Canvas(width, mode.emojiSequences === true, partial)
  return canvas.draw(visible, 0, 0, width) || canvas.stop < Infinity ? canvas : null
}

/**
 * The text the engine draws for a block that is one heading (ATX or setext),
 * with the markdown offset of each character. Null when the block is anything
 * else, or holds anything paragraphs can't hold (see visibleProse).
 */
export function visibleHeading(markdown: string, mode: LinkMode = {}): VisibleText | null {
  if (unfollowable(markdown)) return null
  const links: InlineLinks = { hyperlinks: mode.hyperlinks, linked: { value: false } }
  let tokens: Token[]
  try {
    tokens = marked.lexer(markdown)
  } catch {
    return null
  }
  const heading = tokens[0]
  if (heading?.type !== 'heading' || tokens.slice(1).some(token => token.type !== 'space')) return null
  const { text, raw } = heading as Tokens.Heading
  if (!markdown.startsWith(raw) || text === '') return null
  // ATX: the text after the opening hashes; setext: the lines above the underline.
  const at = /^ {0,3}(?:#{1,6}[ \t]+)?/.exec(raw)![0].length
  if (!raw.startsWith(text, at)) return null
  const out: VisibleText = { text: '', source: [] }
  if (!inline(out, (heading as Tokens.Heading).tokens, text, at, false, links) || !linksHold(markdown, links)) return null
  // The blank line the engine adds under a heading is trimmed off the end of the text.
  const kept = out.text.trimEnd().length
  const visible = { text: out.text.slice(0, kept), source: out.source.slice(0, kept) }
  if (visible.text === '' || visible.text.startsWith('\n') || LEADING_SPACE.test(visible.text)) return null
  return visible
}
