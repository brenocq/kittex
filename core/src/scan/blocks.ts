/**
 * Block-level recognisers: code fences, display-math openers and closers, and
 * the markers that start a new markdown block (and so end a paragraph).
 */

const BACKSLASH = 92
const DOLLAR = 36

// ─── code fences ─────────────────────────────────────────────────────────────

export interface FenceOpen {
  ch: '`' | '~'
  len: number
  /** A ```math fence (its body is display math). */
  math: boolean
  /** A fence a diagram may be in: ```latex and ```tex (`latex`), ```tikz (`tikz`). */
  diagram?: 'latex' | 'tikz'
}

const FENCE = /^(`{3,}|~{3,})(.*)$/

/** A fence opener in a line's body (indentation already removed), or null. */
export function fenceOpen(body: string): FenceOpen | null {
  const m = FENCE.exec(body)
  if (!m) return null
  const run = m[1]!
  const info = m[2]!
  if (run[0] === '`' && info.includes('`')) return null
  const lang = info.trim().split(/\s+/, 1)[0]!.toLowerCase()
  const diagram = lang === 'latex' || lang === 'tex' ? 'latex' : lang === 'tikz' ? 'tikz' : undefined
  return { ch: run[0] as '`' | '~', len: run.length, math: lang === 'math', ...(diagram ? { diagram } : {}) }
}

/** Whether a body (indentation removed) closes a fence of `ch` at least `len` long. */
export function closesFence(body: string, ch: string, len: number): boolean {
  let n = 0
  while (body[n] === ch) n++
  if (n < len) return false
  for (let i = n; i < body.length; i++) {
    const c = body.charCodeAt(i)
    if (c !== 32 && c !== 9 && c !== 13) return false
  }
  return true
}

/** Whether a body looks like any fence (used to give up on an open display block). */
export function looksLikeFence(body: string): boolean {
  return body.startsWith('```') || body.startsWith('~~~')
}

// ─── display math ────────────────────────────────────────────────────────────

/**
 * The environments whose bare `\begin{…}` at the start of a line is display
 * math: amsmath's display environments, and the ones models write bare though
 * they belong inside math (matrices, cases, aligned, array, CD).
 */
const ENVS = new Set([
  'equation', 'align', 'gather', 'multline', 'flalign', 'alignat', 'eqnarray', 'displaymath', 'subequations',
  'matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix', 'smallmatrix',
  'cases', 'dcases', 'rcases', 'aligned', 'alignedat', 'gathered', 'split', 'multlined', 'array', 'CD', 'empheq',
])
const BEGIN = /^\\begin\{([A-Za-z]+)(\*?)\}/

/** The environments whose bare `\begin{…}` at the start of a line is a diagram for TeX (LineScannerOptions.diagrams). */
export const DIAGRAM_ENVS: ReadonlySet<string> = new Set(['tikzpicture', 'tikzcd', 'circuitikz'])

/**
 * The kind of a display block: `$$`, `\[`, or an environment name (`align*`).
 * A block of a kind is closed by that kind's delimiter.
 */
export type DisplayKind = string

export interface DisplayOpen {
  kind: DisplayKind
  delimiter: '$$' | '\\[' | 'env'
  /** Index in the body where the content starts, after the opening delimiter. */
  from: number
  /** Set for a block that is the whole line: where its closing delimiter ends, and its TeX. */
  oneLine?: { end: number; tex: string }
}

/**
 * A display-math opener at the start of a line's body (indentation removed), or
 * null. A line whose closing delimiter is followed by more text is not one.
 */
export function displayOpen(body: string, diagrams = false): DisplayOpen | null {
  let kind: DisplayKind
  let delimiter: DisplayOpen['delimiter']
  let from: number
  if (body.startsWith('$$')) {
    if (body[2] === '$') return null
    kind = delimiter = '$$'
    from = 2
  } else if (body.startsWith('\\[')) {
    kind = delimiter = '\\['
    from = 2
  } else {
    const m = BEGIN.exec(body)
    if (!m || !(ENVS.has(m[1]!) || (diagrams && DIAGRAM_ENVS.has(m[1]!)))) return null
    kind = m[1]! + m[2]!
    delimiter = 'env'
    from = m[0].length
  }
  const close = findClose(kind, body, from)
  if (!close) return { kind, delimiter, from }
  if (!close.ok || !onlySpaceAfter(body, close.end)) return null
  if (isBlankRange(body, from, close.pos)) return null
  const tex = (delimiter === 'env' ? body.slice(0, close.end) : body.slice(from, close.pos)).trim()
  return { kind, delimiter, from, oneLine: { end: close.end, tex } }
}

export interface Close {
  /** Where the closing delimiter starts and ends. */
  pos: number
  end: number
  /** False for a `$` run of three or more, which closes nothing. */
  ok: boolean
}

/**
 * The first closing delimiter of a `kind` block in `s` from `from`, skipping
 * backslash escapes: the first unescaped run of two or more `$` for `$$`,
 * `\]` for `\[`, `\end{env}` for an environment.
 */
export function findClose(kind: DisplayKind, s: string, from: number): Close | null {
  if (kind === '$$') {
    for (let i = from; i < s.length; ) {
      const c = s.charCodeAt(i)
      if (c === BACKSLASH) {
        i += 2
      } else if (c === DOLLAR) {
        let j = i + 1
        while (s.charCodeAt(j) === DOLLAR) j++
        if (j - i >= 2) return { pos: i, end: j, ok: j - i === 2 }
        i = j
      } else {
        i++
      }
    }
    return null
  }
  const token = kind === '\\[' ? ']' : `end{${kind}}`
  for (let i = from; i < s.length; i++) {
    if (s.charCodeAt(i) !== BACKSLASH) continue
    if (s.startsWith(token, i + 1)) return { pos: i, end: i + 1 + token.length, ok: true }
    i++
  }
  return null
}

export function onlySpaceAfter(s: string, from: number): boolean {
  return isBlankRange(s, from, s.length)
}

export function isBlankRange(s: string, from: number, to: number): boolean {
  return s.slice(from, to).trim() === ''
}

// ─── paragraphs ──────────────────────────────────────────────────────────────

const LIST_ITEM = /^(?:[-+*]|\d{1,9}[.)])(?:[ \t]|$)/
const HEADING = /^#{1,6}(?:[ \t]|$)/
const THEMATIC_OR_SETEXT = /^(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|=+[ \t]*)\r?$/

export function isListItem(body: string): boolean {
  return LIST_ITEM.test(body)
}

/** A line that only stands alone: a heading or a table row; the next line starts a new paragraph. */
export function standsAlone(body: string): boolean {
  return HEADING.test(body) || body.startsWith('|')
}

/** A line that starts a new block, so it never continues the paragraph above it. */
export function startsBlock(body: string): boolean {
  return HEADING.test(body) || LIST_ITEM.test(body) || body.startsWith('|') || THEMATIC_OR_SETEXT.test(body)
}

/** A GFM table's delimiter row (marked's): dashes with optional colons, parted by pipes. */
const DELIMITER_ROW = /^ {0,3}((?:\| *)?:?-+:? *(?:\| *:?-+:? *)*(?:\| *)?)$/

/**
 * Whether `body` is a GFM table's delimiter row under a header line `header`,
 * as marked reads them: a pipe or a colon in it, and as many cells as the header.
 */
export function delimitsTable(header: string, body: string): boolean {
  const delimiter = DELIMITER_ROW.exec(body.replace(/[ \t\r]+$/, ''))?.[1]
  if (!delimiter || !/[:|]/.test(delimiter) || header.trim() === '') return false
  return cellCount(header) === delimiter.replace(/^\||\| *$/g, '').split('|').length
}

/** The cells marked splits a table line into (an escaped pipe parts none; empty outer cells dropped). */
function cellCount(line: string): number {
  const cells = line
    .replace(/\|/g, (_match: string, offset: number, all: string) => {
      let escaped = false
      for (let p = offset - 1; p >= 0 && all[p] === '\\'; p--) escaped = !escaped
      return escaped ? '|' : ' |'
    })
    .split(/ \|/)
  if (!cells[0]?.trim()) cells.shift()
  if (cells.length > 0 && !cells.at(-1)?.trim()) cells.pop()
  return cells.length
}

/** A line that ends a GFM table's rows (marked's): a heading, a rule, a fence, a list item, HTML. */
export function endsTable(body: string): boolean {
  return HEADING.test(body) || LIST_ITEM.test(body) || THEMATIC_OR_SETEXT.test(body) || looksLikeFence(body) || body.startsWith('<')
}
