// Terminal shapes for the fuzz suite (core/test/fuzz), and the flush chunking
// and record keeping register.tsx does. Here, pure (no Node API), so the
// mod's own tests (plugin/tests/fuzz.test.ts) can use them too.

import { drawsEmojiSequences, emPxForCell, fontCell } from '../../hooks/core.js'
import type { CellAdjust, TerminalInfo } from '../../hooks/core.js'
import { linkEnv, RECORD_LIMIT } from '../../hooks/math.ts'
import type { KittexEnv, MathMode, MathOptions, PreviewRecord } from '../../hooks/math.ts'
import { Rng } from './rng.ts'

// ─── Terminal shapes ─────────────────────────────────────────────────────────

export interface Shape {
  columns: number
  cellWidth: number
  cellHeight: number
  terminal: 'kitty' | 'ghostty'
  /** The `block` option: display math as images, Unicode, or left as written. */
  block: MathMode
  /** The `inline` option, likewise for inline math. */
  inline: MathMode
  /** How the engine draws links: FORCE_HYPERLINK unset (osc8 in kitty and Ghostty), `0` (text), `` (unknown). */
  links: 'osc8' | 'text' | 'unknown'
  maxProseWidth?: number
  /** Seed of the flush chunking. */
  flushSeed: number
  /** The landed text's trailing whitespace is trimmed by the engine (not known: both are tried). */
  trimLanded: boolean
  /** Ghostty only: `grapheme-width-method = legacy` (emoji sequences not drawn as the engine counts them). */
  graphemeLegacy?: boolean
  /** Ghostty only: adjust-cell-height / adjust-font-baseline, as its config probe reads them. */
  cellAdjust?: CellAdjust
  /** The local TeX was found (the `latex` option on): diagrams and the math MathJax refuses go to it. */
  tex?: boolean
}

/** Cell sizes: kitty's at common fonts and scales, Ghostty's (10×21, 9×19 at 1x), and odd ones. */
export const CELLS: readonly (readonly [number, number])[] = [
  [8, 16], [9, 18], [9, 19], [10, 20], [10, 21], [11, 22], [11, 23], [12, 24], [13, 26], [13, 20],
  [14, 28], [15, 30], [16, 32], [17, 35], [18, 36], [19, 42], [20, 40], [22, 44], [7, 15],
]

export function shapeFor(seed: number): Shape {
  const r = new Rng(seed ^ 0x5eed)
  const columns = r.weighted<number>([[3, r.int(20, 60)], [6, r.int(60, 130)], [2, r.int(130, 200)], [2, r.pick([80, 100, 120])]])
  const [cellWidth, cellHeight] = r.pick(CELLS)
  // Drawn in the order they always were, so a seed keeps its terminal.
  const terminal = r.chance(0.7) ? 'kitty' : 'ghostty'
  const inlineImages = r.chance(0.85)
  return {
    columns,
    cellWidth,
    cellHeight,
    terminal,
    ...mathModes(seed, inlineImages),
    links: r.weighted([[6, 'osc8'], [1, 'text'], [1, 'unknown']]),
    ...(r.chance(0.2) ? { maxProseWidth: r.int(40, 120) } : {}),
    flushSeed: r.int(0, 2 ** 30),
    trimLanded: r.chance(0.3),
    ...ghosttyOptions(r),
    // From a source of its own: a seed keeps the terminal it had.
    ...(new Rng(seed ^ 0x7e70).chance(0.5) ? { tex: true } : {}),
  }
}

/**
 * The two options, from a source of their own (a seed's terminal is the one it
 * had before they were drawn): mostly `image`, now and then `unicode` or `raw`
 * (both raw now and then: kittex then does nothing).
 */
function mathModes(seed: number, inlineImages: boolean): MathOptions {
  const r = new Rng(seed ^ 0x0b10c)
  const block = r.weighted<MathMode>([[14, 'image'], [3, 'unicode'], [3, 'raw']])
  const inline: MathMode = r.chance(0.12) ? 'raw' : inlineImages ? 'image' : 'unicode'
  return { block, inline }
}

/** The options of a shape, as register receives them. */
export function mathOf(shape: Shape): MathOptions {
  return { block: shape.block, inline: shape.inline }
}

/** Ghostty's settings that change the drawing (drawn for every shape, kept for Ghostty ones). */
function ghosttyOptions(r: Rng): Pick<Shape, 'graphemeLegacy' | 'cellAdjust'> {
  const legacy = r.chance(0.2)
  const adjust = r.weighted<CellAdjust | undefined>([
    [6, undefined],
    [1, { height: { factor: 1.2 } }],
    [1, { height: { px: 2 }, baseline: { px: 1 } }],
    [1, { width: { factor: 1.05 } }],
  ])
  return { ...(legacy ? { graphemeLegacy: true } : {}), ...(adjust ? { cellAdjust: adjust } : {}) }
}

export function variablesFor(shape: Shape): Record<string, string> {
  const base: Record<string, string> =
    shape.terminal === 'kitty'
      ? { TERM: 'xterm-kitty', KITTY_WINDOW_ID: '1', TERM_PROGRAM: 'kitty' }
      : { TERM: 'xterm-ghostty', TERM_PROGRAM: 'ghostty', TERM_PROGRAM_VERSION: '1.2.0' }
  if (shape.links === 'text') base.FORCE_HYPERLINK = '0'
  if (shape.links === 'unknown') base.FORCE_HYPERLINK = ''
  return base
}

/** The env session.start stores for this terminal (kittex.env). */
export function envFor(shape: Shape): KittexEnv {
  const cell = { cellWidth: shape.cellWidth, cellHeight: shape.cellHeight }
  const ghostty = shape.terminal === 'ghostty'
  const cellAdjust = ghostty ? shape.cellAdjust : undefined
  const terminal: TerminalInfo = { kind: shape.terminal, images: true, multiplexed: false }
  return {
    kind: shape.terminal,
    images: true,
    ...cell,
    ...(cellAdjust ? { cellAdjust } : {}),
    columns: shape.columns,
    emPx: emPxForCell(fontCell(cell, cellAdjust)),
    ink: { r: 0xdd, g: 0xdd, b: 0xdd },
    measured: true,
    bullet: '●',
    ...(shape.maxProseWidth !== undefined ? { maxProseWidth: shape.maxProseWidth } : {}),
    ...linkEnv(variablesFor(shape)),
    emojiSequences: drawsEmojiSequences(terminal, ghostty && shape.graphemeLegacy ? { graphemeWidth: 'legacy' } : {}),
  }
}

export function describeShape(shape: Shape): string {
  const mpw = shape.maxProseWidth !== undefined ? ` maxProseWidth=${shape.maxProseWidth}` : ''
  const ghostty = shape.terminal !== 'ghostty' ? '' : `${shape.graphemeLegacy ? ' grapheme-width-method=legacy' : ''}${shape.cellAdjust ? ` cell adjust ${JSON.stringify(shape.cellAdjust)}` : ''}`
  return `${shape.columns} columns, ${shape.cellWidth}×${shape.cellHeight} px cells, ${shape.terminal}${ghostty}, block ${shape.block}, inline ${shape.inline}, links ${shape.links}${mpw}${shape.tex ? ', local TeX' : ''}`
}

/** MessageDisplay flushes for a reply: whole-line batches, the last final (it may end mid-line, or be empty). */
export function flushesOf(markdown: string, seed: number): string[] {
  const r = new Rng(seed)
  const lines = markdown.split(/(?<=\n)/)
  const out: string[] = []
  const per = r.weighted<() => number>([[4, () => 1], [3, () => r.int(1, 3)], [2, () => r.int(1, 8)], [1, () => lines.length]])
  for (let i = 0; i < lines.length; ) {
    const n = Math.max(1, per())
    out.push(lines.slice(i, i + n).join(''))
    i += n
  }
  if (markdown.endsWith('\n') && r.chance(0.3)) out.push('')
  return out.length > 0 ? out : ['']
}

/** Keeps records as register.tsx's remember does: a preview recorded again replaces the older one; the newest RECORD_LIMIT kept. */
export function remember(store: readonly PreviewRecord[], records: readonly PreviewRecord[]): PreviewRecord[] {
  const fresh = new Set(records.map(record => record.preview))
  return [...store.filter(record => !fresh.has(record.preview)), ...records].slice(-RECORD_LIMIT)
}

