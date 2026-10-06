/**
 * Inline math in one paragraph: `$…$`, `$$…$$` and `\(…\)`, never inside a code
 * span. Pandoc's dollar rules, with TeX's reading of a `$`: the next unescaped
 * `$` after an opener is the only candidate closer.
 *
 * - Code spans are resolved first (CommonMark: a backtick run closed by the next
 *   run of the same length) and math never crosses a backtick, so code is never
 *   math and a math span never depends on an unresolved code span.
 * - `$` opens when it is a single `$` not followed by whitespace; the next `$`
 *   run closes it if that run is a single `$` not preceded by whitespace and not
 *   followed by a digit. Otherwise the opener is a literal dollar.
 * - `$$` (exactly two) is closed by the next `$` run if that run is `$$`.
 * - `\(` is closed by the next `\)`.
 * - `\$`, `\(` and `\)` follow backslash escaping (an odd run of backslashes).
 * - Math whose content is only whitespace is text.
 */
import type { Segment } from '../types.js'
import { type Line, isSpace, stripQuotes } from './lines.js'

const TICK = 0
const DOLLAR = 1
const OPEN_PAREN = 2
const CLOSE_PAREN = 3

interface Token {
  type: typeof TICK | typeof DOLLAR | typeof OPEN_PAREN | typeof CLOSE_PAREN
  /** Where the token starts; for a paren, the position of its backslash. */
  pos: number
  len: number
  /** Ticks: the run length that can open a code span (one less when the run's first tick is escaped). */
  open: number
  /** Single dollars: can open / can close inline math. */
  canOpen: boolean
  canClose: boolean
}

export interface InlineResult {
  /** Text and math covering the paragraph from its start to `cut`, absolute offsets. */
  segments: Segment[]
  /**
   * Absolute offset, at a line start, up to which the result is final. While the
   * paragraph may still continue (`open`), anything from the line of the first
   * opener without a closer onwards is left out, since later lines could close it.
   */
  cut: number
}

/** Scans a paragraph's lines (all at the same blockquote depth) for inline math. */
export function scanInline(lines: readonly Line[], open: boolean): InlineResult {
  const first = lines[0]!
  const base = first.start
  const depth = first.depth
  const s = lines.length === 1 ? first.raw : lines.map(l => l.raw).join('')
  const tokens = tokenize(s)
  const n = tokens.length
  let pending = Infinity

  // Code spans: each tick run that opens one points at the run that closes it.
  const closeTick = new Int32Array(n).fill(-1)
  {
    const nextByLen = new Map<number, number>()
    const nextSame = new Int32Array(n).fill(-1)
    for (let k = n - 1; k >= 0; k--) {
      const t = tokens[k]!
      if (t.type !== TICK) continue
      if (t.open > 0) nextSame[k] = nextByLen.get(t.open) ?? -1
      nextByLen.set(t.len, k)
    }
    for (let k = 0; k < n; k++) {
      const t = tokens[k]!
      if (t.type !== TICK || t.open === 0) continue
      const m = nextSame[k]!
      if (m >= 0) {
        closeTick[k] = m
        k = m
      } else if (open) {
        pending = t.pos
        break
      }
    }
  }

  // For each token, the next `$` run or tick, and the next `\)` or tick: a math
  // span's only candidate closer, or the backtick that ends its search.
  const nextDollar = new Int32Array(n).fill(-1)
  const nextParen = new Int32Array(n).fill(-1)
  for (let k = n - 1, dollar = -1, paren = -1; k >= 0; k--) {
    nextDollar[k] = dollar
    nextParen[k] = paren
    const t = tokens[k]!
    if (t.type === TICK) dollar = paren = k
    else if (t.type === DOLLAR) dollar = k
    else if (t.type === CLOSE_PAREN) paren = k
  }

  interface Span {
    start: number
    end: number
    math?: { tex: string; delimiter: '$' | '$$' | '\\(' }
  }
  const spans: Span[] = []
  for (let k = 0; k < n; k++) {
    const t = tokens[k]!
    if (t.pos >= pending) break
    if (t.type === TICK) {
      const m = closeTick[k]!
      if (m >= 0) {
        spans.push({ start: t.pos, end: tokens[m]!.pos + tokens[m]!.len })
        k = m
      }
      continue
    }
    if (t.type === CLOSE_PAREN || (t.type === DOLLAR && (t.len > 2 || (t.len === 1 && !t.canOpen)))) continue
    const m = t.type === DOLLAR ? nextDollar[k]! : nextParen[k]!
    if (m < 0) {
      if (open) {
        pending = t.pos
        break
      }
      continue
    }
    const c = tokens[m]!
    if (c.type === TICK) continue
    let delimiter: '$' | '$$' | '\\('
    if (t.type === OPEN_PAREN) delimiter = '\\('
    else if (t.len === 1 && c.len === 1 && c.canClose) delimiter = '$'
    else if (t.len === 2 && c.len === 2) delimiter = '$$'
    else continue
    k = m
    // An empty pair is text, but still a pair: it must not be cut apart while streaming.
    const tex = texOf(s.slice(t.pos + t.len, c.pos), depth)
    spans.push({ start: t.pos, end: c.pos + c.len, math: tex === '' ? undefined : { tex, delimiter } })
  }

  let cut = s.length
  if (pending < Infinity) {
    const starts = lineStarts(lines, base)
    cut = lineStartAt(starts, pending)
    for (let j = spans.length - 1; j >= 0; j--) {
      const span = spans[j]!
      if (span.end <= cut) break
      if (span.start < cut) cut = lineStartAt(starts, span.start)
    }
  }

  const segments: Segment[] = []
  let pos = 0
  const text = (to: number) => {
    if (to > pos) segments.push({ kind: 'text', text: s.slice(pos, to), start: base + pos, end: base + to })
  }
  for (const span of spans) {
    if (span.start >= cut) break
    if (!span.math) continue
    text(span.start)
    segments.push({
      kind: 'math',
      display: false,
      tex: span.math.tex,
      raw: s.slice(span.start, span.end),
      delimiter: span.math.delimiter,
      start: base + span.start,
      end: base + span.end,
    })
    pos = span.end
  }
  text(cut)
  return { segments, cut: base + cut }
}

/** The TeX of a span's content: blockquote markers of its later lines removed, trimmed. */
function texOf(content: string, depth: number): string {
  if (depth > 0 && content.includes('\n')) content = content.split('\n').map((l, i) => (i === 0 ? l : stripQuotes(l, depth))).join('\n')
  return content.trim()
}

function tokenize(s: string): Token[] {
  const tokens: Token[] = []
  const n = s.length
  const push = (type: Token['type'], pos: number, len: number, open = 0, canOpen = false, canClose = false) =>
    tokens.push({ type, pos, len, open, canOpen, canClose })
  for (let i = 0; i < n; ) {
    const c = s.charCodeAt(i)
    if (c === 92) {
      let k = i + 1
      while (s.charCodeAt(k) === 92) k++
      const escaped = (k - i) % 2 === 1
      const d = s.charCodeAt(k)
      if (d === 96) {
        const j = runEnd(s, k, 96)
        push(TICK, k, j - k, escaped ? j - k - 1 : j - k)
        i = j
      } else if (escaped && (d === 40 || d === 41)) {
        push(d === 40 ? OPEN_PAREN : CLOSE_PAREN, k - 1, 2)
        i = k + 1
      } else {
        // An escaped `$` (or any other escaped character) is a literal.
        i = escaped && k < n ? k + 1 : k
      }
    } else if (c === 96) {
      const j = runEnd(s, i, 96)
      push(TICK, i, j - i, j - i)
      i = j
    } else if (c === 36) {
      const j = runEnd(s, i, 36)
      const single = j - i === 1
      const canOpen = single && j < n && !isSpace(s.charCodeAt(j))
      const next = s.charCodeAt(j)
      const canClose = single && i > 0 && !isSpace(s.charCodeAt(i - 1)) && !(next >= 48 && next <= 57)
      push(DOLLAR, i, j - i, 0, canOpen, canClose)
      i = j
    } else {
      i++
    }
  }
  return tokens
}

function runEnd(s: string, i: number, code: number): number {
  let j = i
  while (s.charCodeAt(j) === code) j++
  return j
}

function lineStarts(lines: readonly Line[], base: number): number[] {
  return lines.map(l => l.start - base)
}

/** The start of the line holding position `pos`. */
function lineStartAt(starts: readonly number[], pos: number): number {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid]! <= pos) lo = mid
    else hi = mid - 1
  }
  return starts[lo]!
}
