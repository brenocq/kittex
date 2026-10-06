import { Marked } from 'marked'
import type { Token, Tokens } from 'marked'

/*
 * What Claude Code draws for a run of markdown prose, character for character:
 * its own marked (15.0.6, GFM) with the engine's tokenizer overrides, and its
 * terminal renderer's rules for the inline tokens kittex can follow. Anything
 * else (links, autolinks, HTML, images, tables, lists, headings, code blocks)
 * makes the text unpredictable here, and its math stays Unicode. A `<` is
 * refused only where it could open a tag (the engine strips some tags, and
 * marked reads HTML and autolinks there): `a < b` is plain text.
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

/** `owner/repo#123`: the engine may draw it as a link to the issue. */
const ISSUE_REF = /(^|[^\w./-])([A-Za-z0-9][\w-]*\/[A-Za-z0-9][\w.-]*)#(\d+)\b/

/**
 * What the engine does to the text of a list item (its `glueProse`): a space
 * before a number that ends in `.` or `)` becomes a no-break space, so the
 * number never starts a row (where it could read as a list marker).
 */
const GLUE = / (\d{1,9}[.)])(?!\w)/g

/** Whether markdown holds something whose drawing kittex can't follow at all (controls, tags, issue links). */
export function unfollowable(markdown: string): boolean {
  return /[\t\r\u0000-\u0008\u000b-\u001f\u007f]|<[A-Za-z/!?]/.test(markdown) || ISSUE_REF.test(markdown)
}

/** Where a drawn text could put a space at the start of a row: the engine's drawing isn't followed there. */
export const LEADING_SPACE = / {2}|(?:^|\n) /

/** The text as drawn, and for each of its UTF-16 units the offset in the markdown it came from (-1: none). */
export interface VisibleText {
  text: string
  source: number[]
}

/**
 * The text the engine draws for `markdown`, a run of paragraphs (blank lines
 * between them allowed), before wrapping: emphasis markers and escapes
 * removed, code spans as their content, soft line breaks kept. Null when the
 * markdown holds anything else, or anything whose drawing kittex can't be
 * sure of.
 */
export function visibleProse(markdown: string): VisibleText | null {
  if (unfollowable(markdown)) return null
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
        if (!inline(out, paragraph.tokens, paragraph.text, at)) return null
        out.text += '\n'
        out.source.push(-1)
      } else {
        return null
      }
      at += token.raw.length
    }
    if (at !== markdown.length) return null
  }
  // The engine drops leading newlines and trailing whitespace of a prose run.
  const lead = /^\n*/.exec(out.text)![0].length
  const kept = out.text.slice(lead).trimEnd().length
  const text = out.text.slice(lead, lead + kept)
  // Where a row could start with a space, the engine's drawing isn't followed here.
  if (LEADING_SPACE.test(text)) return null
  return { text, source: out.source.slice(lead, lead + kept) }
}

function emit(out: VisibleText, text: string, offset: number): void {
  out.text += text
  for (let i = 0; i < text.length; i++) out.source.push(offset + i)
}

/**
 * Appends the drawing of inline tokens whose raws, concatenated, are `src` (at
 * `offset` in the markdown). `glue`: the text of a list item (see GLUE).
 */
export function inline(out: VisibleText, tokens: readonly Token[], src: string, offset: number, glue = false): boolean {
  let at = 0
  for (const token of tokens) {
    if (!src.startsWith(token.raw, at)) return false
    const base = offset + at
    switch (token.type) {
      case 'text': {
        const text = token as Tokens.Text
        if (text.tokens) return false
        if (text.text !== text.raw) return false
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
        if (glue) out.text = out.text.slice(0, run) + out.text.slice(run).replace(GLUE, '\u00a0$1')
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
        if (!inline(out, styled.tokens, styled.text, base + lead, glue)) return false
        break
      }
      case 'br':
        out.text += '\n'
        out.source.push(-1)
        break
      default:
        return false
    }
    at += token.raw.length
  }
  return at === src.length
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
