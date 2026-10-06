import { Marked } from 'marked'
import type { Token, Tokens } from 'marked'

import { ARTIFACT_MARK, drawLink, hasIssueRef, refGlueAgrees } from './links.js'
import type { InlineLinks, LinkMode } from './links.js'

/*
 * What Claude Code draws for a run of markdown prose, character for character:
 * its own marked (15.0.6, GFM) with the engine's tokenizer overrides, and its
 * terminal renderer's rules for the inline tokens kittex can follow, links
 * included (links.ts). Anything else (HTML, images, tables, lists, headings,
 * code blocks) makes the text unpredictable here, and its math stays Unicode.
 * A `<` is refused only where it could open a tag (the engine strips some
 * tags, and marked reads HTML there): `a < b` and an autolink are followed.
 */

/** The engine's marked: its GFM lexer with the tokenizer overrides that change what is drawn. */
export const marked = new Marked({
  gfm: true,
  tokenizer: {
    // The engine strikes through `~~text~~` only (marked's GFM also takes `~text~`).
    del(src: string) {
      const cap = /^~~(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))~~(?=[^~]|$)/.exec(src)
      const text = cap?.[1]
      if (!cap || text === undefined) return undefined
      return { type: 'del', raw: cap[0], text, tokens: this.lexer.inlineTokens(text) }
    },
    // Link reference definitions are not read: the line stays text.
    def() {
      return undefined
    },
  },
})

/**
 * The engine draws a text with none of these as one paragraph, as written,
 * without reading markdown at all (and a text with `&nbsp;` always as markdown).
 */
export const MARKDOWN_LIKE =
  /[#*`|[>\-_~]|\n[\r\n]|\r\r|\r\n[\r\n]|(?:^|[\r\n]) {0,3}(?:\d+[.)]|\+) |(?:^|[\r\n]) {0,3}=+ *(?:[\r\n]|$)|https?:\/\/|www\./

/** The no-break space entities the engine draws as a plain space. */
const NBSP_ENTITY = /&(?:nbsp|#0{0,4}160|#[xX]0{0,4}[aA]0);/g

/** marked's autolinks, `<scheme:…>` and `<address@host>`: a `<` that opens one isn't a tag. */
const AUTOLINK =
  /^<(?:[a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\s\x00-\x1f<>]*|[a-zA-Z0-9.!#$%&'*+/=?_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_]))>/

/**
 * What the engine does to the text of a list item (its `glueProse`): a space
 * before a number that ends in `.` or `)` becomes a no-break space, so the
 * number never starts a row (where it could read as a list marker).
 */
const GLUE = / (\d{1,9}[.)])(?!\w)/g

/** Whether markdown holds something whose drawing kittex can't follow at all (controls, tags). */
export function unfollowable(markdown: string): boolean {
  if (/[\t\r\u0000-\u0008\u000b-\u001f\u007f]/.test(markdown)) return true
  for (const tag of markdown.matchAll(/<[A-Za-z/!?]/g)) if (!AUTOLINK.test(markdown.slice(tag.index))) return true
  return false
}

/**
 * Whether a drawing that put OSC 8 links in a block still holds: the engine
 * moves link urls around a ⧉ in such a block (its `rIt`).
 */
export function linksHold(markdown: string, links: InlineLinks): boolean {
  if (!markdown.includes(ARTIFACT_MARK)) return true
  return !links.linked?.value && !(links.hyperlinks !== false && hasIssueRef(markdown))
}

/** Where a drawn text could put a space at the start of a row: the engine's drawing isn't followed there. */
export const LEADING_SPACE = / {2}|(?:^|\n) /

/** The text as drawn, and for each of its UTF-16 units the offset in the markdown it came from (-1: none). */
export interface VisibleText {
  text: string
  source: number[]
  /**
   * A partial text only: the markdown offset from which it isn't followed
   * (the text holds what is drawn before it, up to the last whole word).
   */
  stop?: number
}

/**
 * Cuts a partial visible text back to its last whole word (the cut word may go
 * on in what isn't followed), and notes in `stop` the first markdown offset
 * cut off. `at`: where the text stops being followed (its length by default).
 */
export function cutPartial(visible: VisibleText, stop: number, at = visible.text.length): VisibleText {
  let end = at
  while (end > 0 && visible.text[end - 1] !== ' ' && visible.text[end - 1] !== '\n') end--
  if (end > 0) end--
  for (let i = end; i < visible.text.length; i++) if (visible.source[i]! >= 0) stop = Math.min(stop, visible.source[i]!)
  return { text: visible.text.slice(0, end), source: visible.source.slice(0, end), stop }
}

/**
 * The text the engine draws for `markdown`, a run of paragraphs (blank lines
 * between them allowed), before wrapping: emphasis markers and escapes
 * removed, code spans as their content, soft line breaks kept. Null when the
 * markdown holds anything else, or anything whose drawing kittex can't be
 * sure of. `mode`: how the engine draws links (none are followed unknown).
 */
export function visibleProse(markdown: string, mode: LinkMode = {}, partial = false): VisibleText | null {
  if (unfollowable(markdown)) return null
  const links: InlineLinks = { hyperlinks: mode.hyperlinks, linked: { value: false } }
  const out: VisibleText = { text: '', source: [] }
  if (!MARKDOWN_LIKE.test(markdown) && !markdown.includes('&nbsp;')) {
    emit(out, markdown, 0)
  } else {
    let tokens: Token[]
    try {
      tokens = marked.lexer(markdown)
    } catch {
      return null
    }
    let at = 0
    for (const token of tokens) {
      const from = markdown.indexOf(token.raw, at)
      if (from !== at) return null
      if (token.type === 'space') {
        out.text += '\n'
        out.source.push(-1)
      } else if (token.type === 'paragraph') {
        const paragraph = token as Tokens.Paragraph
        if (!markdown.startsWith(paragraph.text, at)) return null
        if (!inline(out, paragraph.tokens, paragraph.text, at, false, links)) {
          if (!partial || out.stop === undefined) return null
          break
        }
        out.text += '\n'
        out.source.push(-1)
      } else {
        if (!partial) return null
        out.stop = at
        break
      }
      at += token.raw.length
    }
    if (out.stop === undefined && at !== markdown.length) return null
  }
  if (!linksHold(markdown, links)) return null
  // The engine drops leading newlines and trailing whitespace of a prose run.
  const lead = /^\n*/.exec(out.text)![0].length
  const kept = out.text.slice(lead).trimEnd().length
  let visible: VisibleText = { text: out.text.slice(lead, lead + kept), source: out.source.slice(lead, lead + kept) }
  if (out.stop !== undefined) visible = cutPartial(visible, out.stop)
  // Where a row could start with a space, the engine's drawing isn't followed here.
  const space = LEADING_SPACE.exec(visible.text)
  if (space) {
    if (!partial) return null
    visible = cutPartial(visible, visible.stop ?? Infinity, space.index + 1)
  }
  return visible
}

function emit(out: VisibleText, text: string, offset: number): void {
  out.text += text
  for (let i = 0; i < text.length; i++) out.source.push(offset + i)
}

/**
 * Appends the drawing of inline tokens whose raws, concatenated, are `src` (at
 * `offset` in the markdown). `glue`: the text of a list item (see GLUE).
 * `links`: how links are drawn (none followed when unknown), and whether this
 * is a link's text (its plain text is drawn as written).
 */
export function inline(out: VisibleText, tokens: readonly Token[], src: string, offset: number, glue = false, links: InlineLinks = {}): boolean {
  let at = 0
  for (const token of tokens) {
    if (!src.startsWith(token.raw, at)) return stopAt(out, out.text.length, offset + at)
    const base = offset + at
    const drawn = out.text.length
    if (!inlineToken(out, token, base, glue, links)) return stopAt(out, drawn, base)
    at += token.raw.length
  }
  return at === src.length || stopAt(out, out.text.length, offset + at)
}

/**
 * A token that isn't followed: the text is cut back to what came before it
 * (`drawn` units), and `stop` notes its markdown offset. Always false.
 */
function stopAt(out: VisibleText, drawn: number, offset: number): false {
  out.text = out.text.slice(0, drawn)
  out.source.length = drawn
  out.stop = Math.min(out.stop ?? Infinity, offset)
  return false
}

/** Appends one inline token's drawing (see inline); false when it isn't followed. */
function inlineToken(out: VisibleText, token: Token, base: number, glue: boolean, links: InlineLinks): boolean {
  {
    switch (token.type) {
      case 'text': {
        const text = token as Tokens.Text
        if (text.tokens) return false
        if (text.text !== text.raw) return false
        if (links.inside) {
          // A link's text keeps entities as written; no glue, no issue links.
          emit(out, text.raw, base)
          break
        }
        const run = out.text.length
        if ((text as { escaped?: boolean }).escaped === false) {
          // `&nbsp;` and its numeric forms are drawn as a plain space.
          let last = 0
          for (const match of text.raw.matchAll(NBSP_ENTITY)) {
            emit(out, text.raw.slice(last, match.index), base + last)
            out.text += ' '
            out.source.push(base + match.index)
            last = match.index + match[0].length
          }
          emit(out, text.raw.slice(last), base + last)
        } else {
          emit(out, text.raw, base)
        }
        if (glue) {
          const drawn = out.text.slice(run)
          if (links.hyperlinks !== false && !refGlueAgrees(drawn, GLUE)) return false
          out.text = out.text.slice(0, run) + drawn.replace(GLUE, '\u00a0$1')
        }
        break
      }
      case 'escape': {
        const escape = token as Tokens.Escape
        if (escape.raw.length !== escape.text.length + 1 || !escape.raw.endsWith(escape.text)) return false
        emit(out, escape.text, base + 1)
        break
      }
      case 'codespan': {
        // Drawn as its content in the code colour; no padding, no backticks.
        const code = token as Tokens.Codespan
        out.text += code.text
        for (let i = 0; i < code.text.length; i++) out.source.push(-1)
        break
      }
      case 'em':
      case 'strong':
      case 'del': {
        const styled = token as Tokens.Em | Tokens.Strong | Tokens.Del
        const lead = styled.raw.indexOf(styled.text)
        const trail = styled.raw.length - lead - styled.text.length
        if (lead < 1 || lead !== trail) return false
        if (!inline(out, styled.tokens, styled.text, base + lead, glue, links)) return false
        break
      }
      case 'link': {
        const link = token as Tokens.Link
        const label = (into: VisibleText, inner: readonly Token[], text: string, at: number) =>
          inline(into, inner, text, at, false, { ...links, inside: true })
        if (!drawLink(out, link, base, links, label)) return false
        break
      }
      case 'br':
        out.text += '\n'
        out.source.push(-1)
        break
      default:
        return false
    }
  }
  return true
}

/**
 * A top-level block of markdown: `[start, end)`, whether it is a single
 * paragraph, and whether it is a list (list tokens, after one paragraph or
 * none: a list may follow a paragraph's last line, and a new bullet character
 * starts a new list).
 */
export interface ProseBlock {
  start: number
  end: number
  paragraph: boolean
  list?: boolean
  /** A single blockquote, which the engine draws as one text box two cells in (a bar and a space). */
  quote?: boolean
  /** A single heading, which the engine draws as prose with no marker. */
  heading?: boolean
  /** A table, after one paragraph or none (layoutTable). */
  table?: boolean
}

/**
 * The top-level blocks of `markdown` that blank lines separate, as the
 * engine's marked reads them (a list, a table or a code block is one block
 * with whatever no blank line parts it from). Each can be drawn on its own
 * with a blank row between, as the whole is. Null when marked's tokens don't
 * account for every character.
 */
export function proseBlocks(markdown: string): ProseBlock[] | null {
  if (!MARKDOWN_LIKE.test(markdown) && !markdown.includes('&nbsp;')) {
    return markdown.trim() === '' ? [] : [{ start: 0, end: markdown.length, paragraph: true }]
  }
  let tokens: Token[]
  try {
    tokens = marked.lexer(markdown)
  } catch {
    return null
  }
  const blocks: ProseBlock[] = []
  let block: { start: number; end: number; types: string[] } | undefined
  const close = () => {
    if (!block) return
    const types = block.types.join(',')
    blocks.push({
      start: block.start,
      end: block.end,
      paragraph: types === 'paragraph',
      ...(/^(?:paragraph,)?list(?:,list)*$/.test(types) ? { list: true } : {}),
      ...(types === 'blockquote' ? { quote: true } : {}),
      ...(types === 'heading' ? { heading: true } : {}),
      ...(/^(?:paragraph,)?table$/.test(types) ? { table: true } : {}),
    })
    block = undefined
  }
  let at = 0
  for (const token of tokens) {
    if (!markdown.startsWith(token.raw, at)) return null
    if (token.type === 'space' && /\n[ \t]*\n/.test(markdown.slice(Math.max(0, at - 1), at + token.raw.length))) {
      close()
    } else if (token.type !== 'space' || block) {
      if (!block) block = { start: at, end: at, types: [] }
      // Some tokens (a heading, a code block, a rule) take the blank line after
      // them into their raw: it still ends the block, at the token's own text.
      const body = token.raw.replace(/(?:\r?\n[ \t]*)+$/, '')
      block.end = at + (token.type === 'space' ? token.raw.length : body.length)
      if (token.type !== 'space') block.types.push(token.type)
      if (token.type !== 'space' && /\n[ \t]*\n[ \t]*$/.test(token.raw)) close()
    }
    at += token.raw.length
  }
  if (at !== markdown.length) return null
  close()
  return blocks
}
