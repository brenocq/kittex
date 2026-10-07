import type { Token, Tokens } from 'marked'

import type { VisibleText } from './prose.js'

/*
 * What Claude Code (2.1.291) draws for a link in prose, read from its markdown
 * renderer and measured live. It depends on whether the engine draws links as
 * OSC 8 hyperlinks (`hyperlinks`, its `pb()`: kitty and Ghostty do):
 *
 * - `[text](url)`: with hyperlinks, the text alone (in blue, an OSC 8 link to
 *   the url); without, `text (url)`. The text is drawn as inline markdown
 *   (code spans, emphasis), except that its plain text keeps entities such as
 *   `&nbsp;` as written. An empty text, or one equal to the url, draws the url;
 *   without hyperlinks so does a text the url only prefixes with `http://` or
 *   `https://` (`[example.com](https://example.com)` draws the url).
 * - `<https://…>` and bare urls (marked's GFM autolinks, trailing punctuation
 *   left out by marked): the url as written, without the brackets; a bare
 *   `www.` url without hyperlinks draws `http://www.…`.
 * - `[text](mailto:a@b)`, `<a@b>` and bare emails: never a hyperlink; the
 *   address, or `text (address)` with the text exactly as written (markdown
 *   and all) when it isn't the address.
 * - A title adds ` ("title")` after any of these.
 * - `owner/repo#12` in text: with hyperlinks, the same characters as an OSC 8
 *   link to the issue (its escapes can change where a list item's text glues a
 *   number, see refGlue); without, plain text. `@user` is plain text.
 *
 * The escapes are zero-width: a link wraps as its drawn characters do, at
 * plain spaces, inside it or not (measured live). What isn't followed here
 * (and keeps its math Unicode): hyperlinks unknown, a url the engine would
 * resolve as a file (`file:`, an absolute or `..` path, anything but a plain
 * relative path), a claude.ai artifact link (drawn with a ⧉ mark), a block
 * holding ⧉ (the engine moves link urls around it), an image.
 */

/**
 * How the engine and the terminal draw what the text alone doesn't tell:
 * links as OSC 8 hyperlinks or as text (undefined when unknown: links aren't
 * followed), and whether the terminal draws emoji sequences two cells wide,
 * as the engine counts them (charAt; refused when not).
 */
export interface LinkMode {
  hyperlinks?: boolean | undefined
  emojiSequences?: boolean | undefined
}

/** The mode inline drawing passes down: inside a link's text, and whether an OSC 8 link was drawn. */
export interface InlineLinks extends LinkMode {
  inside?: boolean
  linked?: { value: boolean }
}

/** The engine's issue references (`xe`): drawn as an OSC 8 link where hyperlinks are on. */
export const ISSUE_REF_ALL = /(^|[^\w./-])([A-Za-z0-9][\w-]*\/[A-Za-z0-9][\w.-]*)#(\d+)\b/g

/** The mark the engine puts on claude.ai artifact links, and around which it moves link urls. */
export const ARTIFACT_MARK = '⧉'

const CONTROL = /[\x00-\x1f\x7f-\x9f]/

/** A url with a scheme (the engine's `Z`). */
const SCHEME = /^[a-z][a-z0-9+.-]*:/i

/**
 * A relative url the engine surely links as written (its `de` returns it
 * unchanged): a plain path, no `..` segment, no leading slash, no `%`, `?`,
 * `:` or backslash (which it would decode, or read as a Windows or device path).
 */
const PLAIN_RELATIVE = /^(?!.*(?:^|\/)\.\.(?:\/|#|$))[A-Za-z0-9_][A-Za-z0-9._~/=&+@,!*'()$;-]*(?:#[A-Za-z0-9._~/=&+@,!*'()$;:-]*)?$/

/** Whether the engine draws a hyperlink to `href` as its text, with no url beside it (`E` in its link case). */
export function linkedAsWritten(href: string): boolean {
  if (CONTROL.test(href) || href !== href.trim()) return false
  if (/^https:\/\/claude\.ai(?:[/?#]|$)/.test(href)) return false
  if (SCHEME.test(href)) return !/^file:/i.test(href)
  return PLAIN_RELATIVE.test(href)
}

function plain(out: VisibleText, text: string): void {
  out.text += text
  for (let i = 0; i < text.length; i++) out.source.push(-1)
}

function append(out: VisibleText, part: VisibleText): void {
  out.text += part.text
  out.source.push(...part.source)
}

/**
 * Appends the drawing of a link token whose raw starts at `base` in the
 * markdown. `label` draws its text tokens (inline drawing inside a link).
 * False when it isn't followed.
 */
export function drawLink(
  out: VisibleText,
  link: Tokens.Link,
  base: number,
  links: InlineLinks,
  label: (out: VisibleText, tokens: readonly Token[], src: string, offset: number) => boolean,
): boolean {
  const { hyperlinks } = links
  if (hyperlinks === undefined) return false
  const href = link.href
  const title = link.title ? ` ("${link.title}")` : ''
  if (CONTROL.test(href + title) || href.includes(ARTIFACT_MARK)) return false
  // The text as written: after `[` in a link, the whole raw in an autolink.
  const at = link.raw.indexOf(link.text)
  if (link.text !== '' && at < 0) return false

  if (href.startsWith('mailto:')) {
    const address = href.slice('mailto:'.length)
    if (link.text !== '') {
      const written: VisibleText = { text: link.text, source: Array.from(link.text, (_, k) => base + at + k) }
      append(out, written)
      if (link.text !== address) plain(out, ` (${address})`)
    } else {
      plain(out, address)
    }
    plain(out, title)
    return true
  }

  const text: VisibleText = { text: '', source: [] }
  if (!label(text, link.tokens ?? [], link.text, base + at)) return false
  if (text.text.includes(ARTIFACT_MARK)) return false
  const differs = text.text !== '' && text.text !== href

  if (hyperlinks) {
    if (!linkedAsWritten(href)) return false
    if (links.linked) links.linked.value = true
    // The text, or the url when it's empty (a text equal to the url is the url's characters too).
    if (text.text !== '') append(out, text)
    else plain(out, href)
  } else {
    const same = text.text === href || href === `http://${text.text}` || href === `https://${text.text}`
    if (differs && !same) {
      append(out, text)
      plain(out, ` (${href})`)
    } else {
      plain(out, href)
    }
  }
  plain(out, title)
  return true
}

/**
 * Whether a list item's text glues its numbers (the engine's glueProse, `GLUE`)
 * the same with issue references drawn as OSC 8 links as without: the escape
 * after ` 5)` in ` 5)owner/repo#1` lets it glue where plain text wouldn't.
 */
export function refGlueAgrees(text: string, glue: RegExp): boolean {
  if (!text.includes('#')) return true
  const marked = text.replace(ISSUE_REF_ALL, (_, before: string, repo: string, number: string) => `${before}\u0000${repo}#${number}\u0000`)
  if (marked === text) return true
  return marked.replace(glue, ' $1').replaceAll('\u0000', '') === text.replace(glue, ' $1')
}

/** Whether `text` holds an issue reference the engine may draw as an OSC 8 link. */
export function hasIssueRef(text: string): boolean {
  ISSUE_REF_ALL.lastIndex = 0
  return ISSUE_REF_ALL.test(text)
}

/** The terminal names the engine trusts with hyperlinks (its `pb()` list). */
const HYPERLINK_TERMINALS = ['ghostty', 'Hyper', 'kitty', 'alacritty', 'iTerm.app', 'iTerm2', 'WarpTerminal']

/**
 * Whether Claude Code draws links as OSC 8 hyperlinks in a terminal with
 * these environment variables (its `pb()`, with supports-hyperlinks inside).
 * Undefined where it depends on more than the variables (the colour support
 * of its stdout): links are then not followed.
 */
export function engineHyperlinks(env: Readonly<Record<string, string | undefined>>): boolean | undefined {
  const force = env.FORCE_HYPERLINK
  if (force !== undefined) return force.length > 0 ? parseInt(force, 10) !== 0 : undefined
  const program = env.TERM_PROGRAM
  if (program !== undefined && HYPERLINK_TERMINALS.includes(program)) return true
  if (env.TERMINAL_EMULATOR === 'JetBrains-JediTerm') return true
  if (env.WT_SESSION && program !== 'tmux' && !env.TMUX) return true
  if (program === 'tmux') {
    const [major, minor] = (env.TERM_PROGRAM_VERSION ?? '').split('.').map(part => parseInt(part, 10))
    if (major! > 3 || (major === 3 && minor! >= 4)) return true
  }
  if (env.LC_TERMINAL !== undefined && HYPERLINK_TERMINALS.includes(env.LC_TERMINAL)) return true
  if (env.TERM?.includes('kitty')) return true
  // supports-hyperlinks: true for these only where stdout has colours.
  if (env.NETLIFY) return true
  if (env.CI || env.TEAMCITY_VERSION) return false
  if (env.WT_SESSION || program === 'WezTerm' || program === 'vscode' || env.VTE_VERSION || env.TERM === 'alacritty') return undefined
  return false
}
