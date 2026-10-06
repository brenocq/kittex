/**
 * One line of a reply, measured once: its blockquote prefix, its indentation and
 * the body after them. Block rules (fences, display math, paragraphs) only look
 * at these fields.
 */
export interface Line {
  /** The line as written, with its '\n' when it has one. */
  readonly raw: string
  /** The line without its '\n'. */
  readonly text: string
  /** Offset of the line in the whole input. */
  readonly start: number
  /** Offset just past the line, '\n' included. */
  readonly end: number
  /** Blockquote depth: how many `>` markers open the line. */
  readonly depth: number
  /** `prefixEnds[d]` is the index in `text` just past the first `d` markers. */
  readonly prefixEnds: readonly number[]
  /** Columns of indentation after the blockquote prefix (tabs to multiples of 4). */
  readonly indent: number
  /** Index in `text` where the body starts, after the prefix and the indentation. */
  readonly bodyStart: number
  readonly body: string
  /** Nothing but whitespace after the blockquote prefix. */
  readonly blank: boolean
}

export function makeLine(raw: string, start: number): Line {
  const text = raw.endsWith('\n') ? raw.slice(0, -1) : raw
  const prefixEnds = [0]
  let p = 0
  for (let q = quoteMarkerEnd(text, p); q >= 0; q = quoteMarkerEnd(text, p)) {
    p = q
    prefixEnds.push(p)
  }
  let indent = 0
  let i = p
  for (; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c === 32) indent++
    else if (c === 9) indent += 4 - (indent % 4)
    else break
  }
  const body = text.slice(i)
  return {
    raw,
    text,
    start,
    end: start + raw.length,
    depth: prefixEnds.length - 1,
    prefixEnds,
    indent,
    bodyStart: i,
    body,
    blank: isBlank(body),
  }
}

/** The line's text after its first `depth` blockquote markers (the line must have that many). */
export function restAt(line: Line, depth: number): string {
  return line.text.slice(line.prefixEnds[depth] ?? 0)
}

/** Removes up to `depth` blockquote markers from the start of `text`. */
export function stripQuotes(text: string, depth: number): string {
  let p = 0
  for (let d = 0; d < depth; d++) {
    const q = quoteMarkerEnd(text, p)
    if (q < 0) break
    p = q
  }
  return text.slice(p)
}

/** Where a `>` marker starting at `p` (after up to 3 spaces) ends, its one optional space included; -1 if there is none. */
function quoteMarkerEnd(text: string, p: number): number {
  let q = p
  while (q - p < 3 && text.charCodeAt(q) === 32) q++
  if (text.charCodeAt(q) !== 62) return -1
  q++
  const c = text.charCodeAt(q)
  if (c === 32 || c === 9) q++
  return q
}

export function isBlank(s: string): boolean {
  for (let i = 0; i < s.length; i++) if (!isSpace(s.charCodeAt(i))) return false
  return true
}

export function isSpace(c: number): boolean {
  if (c <= 32) return c === 32 || (c >= 9 && c <= 13)
  return c >= 128 && /\s/.test(String.fromCharCode(c))
}

/** Length of `s` without its trailing whitespace. */
export function trimEndLength(s: string): number {
  let n = s.length
  while (n > 0 && isSpace(s.charCodeAt(n - 1))) n--
  return n
}
