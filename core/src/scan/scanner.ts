/**
 * The line machine behind both `scan` and `createLineScanner`. It takes whole
 * lines, one at a time, and keeps all of its state between them, so a reply cut
 * into batches at line boundaries gives the same segments as the reply scanned
 * at once (the only exception is the streaming hold limit).
 *
 * Per line, in order: inside a code fence the line is code; inside an open
 * display block it is held (or closes or cancels the block); otherwise it is a
 * blank line, a line of an indented code block, a fence opener, a display-math
 * opener, or prose. Prose lines gather into paragraphs, which are scanned for
 * inline math once they end (or, when streaming, as far as they are settled).
 *
 * A display block that cannot close where it is (a blank line, a fence, a
 * change of blockquote depth or a misplaced closing delimiter inside it, or the
 * end of the input) was not one: its lines are scanned again as ordinary lines,
 * with openers of that kind ignored up to where it gave up. Ignoring them is
 * exact (no opener of the same kind in between could have closed earlier) and
 * keeps the whole scan linear.
 */
import type { MathDelimiter, Segment } from '../types.js'
import {
  closesFence,
  delimitsTable,
  type DisplayKind,
  endsTable,
  displayOpen,
  fenceOpen,
  findClose,
  isListItem,
  looksLikeFence,
  onlySpaceAfter,
  standsAlone,
  startsBlock,
} from './blocks.js'
import { scanInline } from './inline.js'
import { type Line, makeLine, restAt, trimEndLength } from './lines.js'

interface Flags {
  /** The line before was blank (or there was none): an indented code block may start. */
  prevBlank: boolean
  /** The line before was indented code. */
  prevCode: boolean
  /** Inside a list: indentation is list nesting, not code, and may hold fences and display math. */
  inList: boolean
}

interface Fence {
  t: 'fence'
  ch: string
  len: number
  indent: number
  depth: number
}

interface MathFence {
  t: 'mathfence'
  ch: string
  len: number
  indent: number
  depth: number
  lines: Line[]
}

interface Display {
  t: 'display'
  kind: DisplayKind
  delimiter: '$$' | '\\[' | 'env'
  /** Where the content starts in the opener line's body. */
  from: number
  depth: number
  lines: Line[]
  /** The flags before the opener line, to scan the lines again if the block gives up. */
  flags: Flags
}

/** A display block too long to hold while streaming: its lines pass as text until it closes. */
interface Released {
  t: 'released'
  kind: DisplayKind
  depth: number
}

type State = { t: 'normal' } | Fence | MathFence | Display | Released

const NORMAL: State = { t: 'normal' }

/** Collects segments in order, merging adjacent text. */
class Output {
  private segments: Segment[] = []
  private parts: string[] = []
  private textStart = 0
  private textEnd = 0

  text(text: string, start: number): void {
    if (text === '') return
    if (this.parts.length === 0) this.textStart = start
    this.parts.push(text)
    this.textEnd = start + text.length
  }

  line(line: Line): void {
    this.text(line.raw, line.start)
  }

  lines(lines: readonly Line[]): void {
    for (const line of lines) this.line(line)
  }

  segment(segment: Segment): void {
    if (segment.kind === 'text') return this.text(segment.text, segment.start)
    this.flushText()
    this.segments.push(segment)
  }

  take(): Segment[] {
    this.flushText()
    const segments = this.segments
    this.segments = []
    return segments
  }

  private flushText(): void {
    if (this.parts.length === 0) return
    const text = this.parts.length === 1 ? this.parts[0]! : this.parts.join('')
    this.segments.push({ kind: 'text', text, start: this.textStart, end: this.textEnd })
    this.parts = []
  }
}

/** Whether a `\begin{…}` in these lines has no `\end{…}` yet. */
function openEnvironment(lines: readonly Line[]): boolean {
  let depth = 0
  for (const line of lines) {
    depth += line.text.split('\\begin{').length - 1
    depth -= line.text.split('\\end{').length - 1
  }
  return depth > 0
}

export class Scanner {
  private state: State = NORMAL
  private flags: Flags = { prevBlank: true, prevCode: false, inList: false }
  /** Prose lines of the open paragraph not yet returned. */
  private para: Line[] = []
  /** The paragraph's last line while a paragraph is open (its lines may already be returned). */
  private paraLast: Line | null = null
  /** Display kinds whose openers are ignored on lines starting before the given offset. */
  private readonly ignore = new Map<DisplayKind, number>()
  /** Lines waiting to be processed; a display block that gives up pushes its lines back on top. */
  private readonly frames: { lines: readonly Line[]; i: number }[] = []
  private readonly out = new Output()
  private partial = ''
  private offset = 0
  /** The start offsets of the lines read as rows of a GFM table (its header included). */
  private readonly rows = new Set<number>()
  /** The table whose rows go on, at its blockquote depth (null outside a table). */
  private table: { depth: number } | null = null
  private readonly isRow = (line: Line): boolean => this.rows.has(line.start)

  constructor(private readonly maxHeldLines: number) {}

  push(delta: string, final: boolean): Segment[] {
    const text = this.partial + delta
    const lines: Line[] = []
    let from = 0
    for (let nl = text.indexOf('\n'); nl >= 0; nl = text.indexOf('\n', from)) {
      lines.push(this.line(text.slice(from, nl + 1)))
      from = nl + 1
    }
    this.partial = text.slice(from)
    if (final && this.partial !== '') {
      lines.push(this.line(this.partial))
      this.partial = ''
    }
    this.frames.push({ lines, i: 0 })
    this.drain()
    if (final) this.finish()
    else this.settle()
    return this.out.take()
  }

  private line(raw: string): Line {
    const line = makeLine(raw, this.offset)
    this.offset = line.end
    return line
  }

  private drain(): void {
    while (this.frames.length > 0) {
      const frame = this.frames[this.frames.length - 1]!
      if (frame.i >= frame.lines.length) this.frames.pop()
      else this.process(frame.lines[frame.i++]!)
    }
  }

  /** End of a streaming batch: return what is settled, release what was held too long. */
  private settle(): void {
    const st = this.state
    if (st.t === 'display' && st.lines.length > this.maxHeldLines) {
      this.out.lines(st.lines)
      this.state = { t: 'released', kind: st.kind, depth: st.depth }
    } else if (st.t === 'mathfence' && st.lines.length > this.maxHeldLines) {
      this.out.lines(st.lines)
      this.state = { t: 'fence', ch: st.ch, len: st.len, indent: st.indent, depth: st.depth }
    }
    if (this.para.length > 0) {
      const { segments, cut } = scanInline(this.para, true, this.isRow)
      for (const segment of segments) this.out.segment(segment)
      let keep = 0
      while (keep < this.para.length && this.para[keep]!.start < cut) keep++
      this.para = this.para.slice(keep)
      if (this.para.length > this.maxHeldLines) this.endParagraph()
    }
  }

  /** End of the input: open display blocks give up, an open math fence is text. */
  private finish(): void {
    for (;;) {
      const st = this.state
      if (st.t === 'display') {
        this.giveUp(st, Infinity, [])
        this.drain()
        continue
      }
      if (st.t === 'mathfence') this.out.lines(st.lines)
      this.state = NORMAL
      break
    }
    this.endParagraph()
  }

  private process(line: Line): void {
    const st = this.state
    switch (st.t) {
      case 'fence':
        if (line.depth < st.depth) break
        this.out.line(line)
        if (this.closesFence(line, st)) this.state = NORMAL
        this.after(line)
        return
      case 'mathfence':
        if (line.depth < st.depth) {
          this.out.lines(st.lines)
          break
        }
        st.lines.push(line)
        if (this.closesFence(line, st)) this.closeMathFence(st)
        this.after(line)
        return
      case 'display': {
        const rest = line.depth === st.depth ? restAt(line, st.depth) : null
        // One blank line is held inside an environment still open in the block (a gap in an aligned derivation).
        if (rest !== null && line.blank && !st.lines.at(-1)!.blank && openEnvironment(st.lines)) {
          st.lines.push(line)
          return
        }
        if (rest === null || line.blank || looksLikeFence(rest.trimStart())) return this.giveUp(st, line.start, [line])
        const close = findClose(st.kind, rest, 0)
        if (!close) {
          st.lines.push(line)
          return
        }
        if (close.ok && onlySpaceAfter(rest, close.end)) return this.closeDisplay(st, line, close.pos, close.end)
        return this.giveUp(st, line.end, [line])
      }
      case 'released': {
        const rest = line.depth === st.depth ? restAt(line, st.depth) : null
        if (rest === null || line.blank || looksLikeFence(rest.trimStart())) break
        const close = findClose(st.kind, rest, 0)
        if (close && !(close.ok && onlySpaceAfter(rest, close.end))) break
        this.out.line(line)
        if (close) this.state = NORMAL
        this.after(line)
        return
      }
      case 'normal':
        break
    }
    this.state = NORMAL
    this.normal(line)
  }

  private normal(line: Line): void {
    const flags = this.flags
    const before = { ...flags }
    this.tableRow(line)
    if (line.blank) {
      this.endParagraph()
      this.out.line(line)
      this.after(line)
      return
    }
    const listItem = (line.indent <= 3 || flags.inList) && isListItem(line.body)
    if (listItem) flags.inList = true
    else if (line.indent < 2 && flags.prevBlank) flags.inList = false

    if (line.indent >= 4 && !flags.inList && (flags.prevBlank || flags.prevCode)) {
      this.endParagraph()
      this.out.line(line)
      this.after(line, true)
      return
    }

    if (line.indent <= 3 || flags.inList) {
      const fence = fenceOpen(line.body.slice(0, trimEndLength(line.body)))
      if (fence) {
        this.endParagraph()
        const common = { ch: fence.ch, len: fence.len, indent: line.indent, depth: line.depth }
        if (fence.math) {
          this.state = { t: 'mathfence', ...common, lines: [line] }
        } else {
          this.state = { t: 'fence', ...common }
          this.out.line(line)
        }
        this.after(line)
        return
      }
      const open = displayOpen(line.body)
      if (open && line.start >= (this.ignore.get(open.kind) ?? -1)) {
        this.endParagraph()
        if (open.oneLine) {
          const start = line.start + line.bodyStart
          const end = start + open.oneLine.end
          this.out.text(line.raw.slice(0, line.bodyStart), line.start)
          this.math(open.delimiter, open.oneLine.tex, line.raw.slice(line.bodyStart, line.bodyStart + open.oneLine.end), start, end)
          this.out.text(line.raw.slice(line.bodyStart + open.oneLine.end), end)
          this.after(line)
        } else {
          this.state = { t: 'display', kind: open.kind, delimiter: open.delimiter, from: open.from, depth: line.depth, lines: [line], flags: before }
        }
        return
      }
    }

    if (!(this.paraLast && this.continues(this.paraLast, line))) this.endParagraph()
    this.para.push(line)
    this.paraLast = line
    this.after(line)
  }

  private continues(prev: Line, line: Line): boolean {
    if (line.depth !== prev.depth) return false
    if (prev.indent <= 3 && standsAlone(prev.body)) return false
    return !((line.indent <= 3 || this.flags.inList) && startsBlock(line.body))
  }

  /**
   * Follows GFM tables (marked's reading), before the line joins a paragraph:
   * a delimiter row right under a prose line makes that line a header and
   * starts a table; its rows go on until a blank line, a change of quote
   * depth or a line that starts another block.
   */
  private tableRow(line: Line): void {
    if (this.table && (line.blank || line.depth !== this.table.depth || endsTable(line.body))) this.table = null
    if (this.table) {
      this.rows.add(line.start)
      return
    }
    const header = this.paraLast
    if (header && header.depth === line.depth && delimitsTable(header.body, line.body)) {
      this.rows.add(header.start)
      this.rows.add(line.start)
      this.table = { depth: line.depth }
    }
  }

  private endParagraph(): void {
    if (this.para.length > 0) {
      for (const segment of scanInline(this.para, false, this.isRow).segments) this.out.segment(segment)
      this.para = []
    }
    this.paraLast = null
  }

  private after(line: Line, code = false): void {
    this.flags.prevBlank = line.blank
    this.flags.prevCode = code
  }

  private closesFence(line: Line, fence: Fence | MathFence): boolean {
    const rest = restAt(line, fence.depth)
    let i = 0
    let cols = 0
    for (; i < rest.length; i++) {
      const c = rest.charCodeAt(i)
      if (c === 32) cols++
      else if (c === 9) cols += 4 - (cols % 4)
      else break
    }
    return cols <= Math.max(3, fence.indent) && closesFence(rest.slice(i), fence.ch, fence.len)
  }

  private closeMathFence(st: MathFence): void {
    this.state = NORMAL
    const lines = st.lines
    const first = lines[0]!
    const last = lines[lines.length - 1]!
    const tex = lines
      .slice(1, -1)
      .map(l => restAt(l, st.depth))
      .join('\n')
      .trim()
    if (tex === '') return this.out.lines(lines)
    const start = first.start + first.bodyStart
    const lastRest = restAt(last, st.depth)
    const end = last.start + (last.prefixEnds[st.depth] ?? 0) + trimEndLength(lastRest)
    this.emitBlock(lines, start, end, 'fence', tex)
  }

  private closeDisplay(st: Display, line: Line, closePos: number, closeEnd: number): void {
    const lines = [...st.lines, line]
    const first = lines[0]!
    const inner = [first.body.slice(st.from), ...lines.slice(1, -1).map(l => restAt(l, st.depth)), restAt(line, st.depth).slice(0, closePos)]
    if (inner.join('\n').trim() === '') return this.giveUp(st, line.end, [line])
    let tex: string
    if (st.delimiter === 'env') {
      inner[0] = first.body
      inner[inner.length - 1] = restAt(line, st.depth).slice(0, closeEnd)
      tex = inner.join('\n').trim()
    } else {
      tex = inner.join('\n').trim()
    }
    this.state = NORMAL
    const start = first.start + first.bodyStart
    const end = line.start + (line.prefixEnds[st.depth] ?? 0) + closeEnd
    this.emitBlock(lines, start, end, st.delimiter, tex)
    this.after(line)
  }

  /** Emits a closed block: the text before its opening delimiter, the math, the rest of its last line. */
  private emitBlock(lines: readonly Line[], start: number, end: number, delimiter: MathDelimiter, tex: string): void {
    const first = lines[0]!
    const last = lines[lines.length - 1]!
    const source = lines.map(l => l.raw).join('')
    this.out.text(source.slice(0, start - first.start), first.start)
    this.math(delimiter, tex, source.slice(start - first.start, end - first.start), start, end)
    this.out.text(last.raw.slice(end - last.start), end)
  }

  private math(delimiter: MathDelimiter, tex: string, raw: string, start: number, end: number): void {
    this.out.segment({ kind: 'math', display: true, tex, raw, delimiter, start, end })
  }

  /**
   * A display block that was not one: its lines (and `more`) are processed again
   * as ordinary lines, its kind of opener ignored on lines starting before `until`.
   */
  private giveUp(st: Display, until: number, more: readonly Line[]): void {
    this.ignore.set(st.kind, Math.max(this.ignore.get(st.kind) ?? -1, until))
    this.flags = st.flags
    this.state = NORMAL
    this.frames.push({ lines: [...st.lines, ...more], i: 0 })
  }
}
