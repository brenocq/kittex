/**
 * The contracts between kittex's core modules. Each module implements its part
 * in its own directory (scan/, typeset/, raster/, unicode/, terminal/) and
 * core/src/index.ts wires them together; adapters only use what index.ts exports.
 *
 * Everything in core runs inside Claude Code's mod sandbox: no Node or DOM APIs,
 * no eval or new Function, no WebAssembly, no timers, no dynamic import().
 */

/** An sRGB colour, each channel 0 to 255. */
export interface RGB {
  r: number
  g: number
  b: number
}

// ─── scan ────────────────────────────────────────────────────────────────────

/** How a math span was written: `$…$`, `$$…$$`, `\(…\)`, `\[…\]`, a bare `\begin{env}…\end{env}`, or a ```math fence. */
export type MathDelimiter = '$' | '$$' | '\\(' | '\\[' | 'env' | 'fence'

/** A piece of a markdown reply. Offsets index the scanned text (for a LineScanner, everything pushed so far). */
export type Segment =
  | { kind: 'text'; text: string; start: number; end: number }
  | {
      kind: 'math'
      /** Display math (a block of its own) or inline math. */
      display: boolean
      /** The TeX between the delimiters, trimmed; for `env`, the whole `\begin{…}…\end{…}`. */
      tex: string
      /** The source exactly as written, delimiters included. */
      raw: string
      delimiter: MathDelimiter
      start: number
      end: number
    }

export interface LineScannerOptions {
  /** Lines an open display block may hold before it is released as text. Default 40. */
  maxHeldLines?: number
}

/** Scans a reply as it streams in, in batches of whole lines (MessageDisplay deltas). */
export interface LineScanner {
  /**
   * Takes the next delta and returns the segments it completes, in order. Prose
   * comes back as it arrives (inline math split out of it); an open display block
   * is held until it closes, passes `maxHeldLines` (then released as text), or
   * `final` is true, and then comes back whole.
   */
  push(delta: string, final: boolean): Segment[]
}

// ─── typeset ─────────────────────────────────────────────────────────────────

/** A 2-D affine matrix [a, b, c, d, e, f] as in SVG's matrix(): x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Matrix = readonly [number, number, number, number, number, number]

/**
 * One drawing operation, in em. Origin at the left end of the baseline, x to the
 * right, y DOWN (SVG convention), so ink above the baseline has negative y.
 * A path's `d` is SVG path data (any of M L H V C S Q T Z, absolute or relative)
 * in its own coordinates, mapped to em by `transform`. Fill rule: nonzero.
 */
export type DrawOp =
  | { type: 'path'; d: string; transform: Matrix }
  | { type: 'rect'; x: number; y: number; width: number; height: number }

export interface TypesetOptions {
  display: boolean
  /** Width available to a display formula, in em; MathJax breaks lines to fit when given. */
  lineWidth?: number
}

/** A typeset formula: its box in em and the shapes that fill it. */
export interface TypesetResult {
  /** Advance width, height above the baseline and depth below it, in em. */
  width: number
  height: number
  depth: number
  ops: DrawOp[]
}

// ─── raster ──────────────────────────────────────────────────────────────────

export interface RasterOptions {
  /** Pixels per em of the math font. */
  emPx: number
  /** One terminal cell, in pixels. */
  cellWidth: number
  cellHeight: number
  /** Cells available across, 1 to 255; a wider formula is scaled down to fit. */
  maxColumns: number
  /** `center`: the image spans maxColumns with the formula centred (display math). `left`: as wide as the formula. */
  align: 'center' | 'left'
  /** `left` only: the image is at least this many columns wide, the formula at its left end (an inline slot) unless `centerInk`. */
  minColumns?: number
  /**
   * `left` only: the formula's ink is centred across the image, the blank
   * split evenly (to a pixel) on both sides, instead of starting at its left
   * edge. For an inline slot, whose whole cells (and a preview wider than the
   * image) leave up to a cell or more of blank that would otherwise all fall
   * after the formula and detach it from the text that follows.
   */
  centerInk?: boolean
  /** Reserve at least this many rows (to match a streaming preview); the formula is centred vertically. */
  minRows?: number
  /** Stroke darkening: outlines grow by this many thousandths of an em on each side. 0 for none; the default (15) matches terminal text weight. */
  weight?: number
  /**
   * Inline placement: the math baseline goes this many pixels below the
   * image's top (the terminal font's baseline in its cell), the image is
   * exactly `minRows` rows tall (1 by default), and the formula is scaled down,
   * never up, until its ink, stroke weight included, fits above and below the
   * baseline. Without it the formula is centred vertically.
   */
  baselinePx?: number
  /**
   * Inline only: the smallest scale an inline formula may be drawn at. One that
   * fits only below it may instead be drawn at this scale with up to
   * `overflowPx` of its tallest or deepest ink past the cell, clipped (the tip
   * of a bar in a subscript, as in P_{k|k-1}); further than that, `scale`
   * reports the smaller fit and the caller keeps the formula as text.
   */
  minScale?: number
  /** Inline only: how many pixels of ink may run past the cell when `minScale` is used. */
  overflowPx?: number
}

/** The cells a formula takes, known before rasterizing. */
export interface CellBox {
  columns: number
  rows: number
  /** 1 unless the formula was shrunk to fit maxColumns. */
  scale: number
}

/** A formula rendered as coverage over a whole number of cells. */
export interface Raster extends CellBox {
  /** widthPx × heightPx coverage bytes (0 transparent, 255 full ink), row-major. */
  alpha: Uint8Array
  /** columns × cellWidth, rounded to whole pixels when cells are fractional. */
  widthPx: number
  /** rows × cellHeight, rounded to whole pixels when cells are fractional. */
  heightPx: number
  /** Pixel row of the math baseline, from the top of the image. */
  baselinePx: number
}

// ─── unicode ─────────────────────────────────────────────────────────────────

export interface UnicodeOptions {
  /** Display math may use several lines; inline math must fit one. */
  display: boolean
  /** Terminal columns available; output wider than this is refused (null). */
  maxWidth?: number
  /**
   * Display math only: tables (aligned, cases, matrices) keep one line per row,
   * their columns aligned, and everything else is written on one line, so the
   * result is about as tall as its tables have rows.
   */
  compact?: boolean
  /**
   * Break a result wider than `maxWidth` into lines at its top-level
   * relations, operators and wide spaces, as MathJax breaks a display image,
   * each line at most `maxWidth` wide (inline math then may take several lines
   * too: for a display preview's one-line form).
   */
  breakLines?: boolean
  /**
   * Drop the spaces TeX puts between atoms and thin explicit ones (`\,`),
   * keeping a cell for wider ones (`\quad`, `\bmod`): `O(nlogn)`, `E=mc²`.
   * For a preview standing in for an image, as narrow as the image.
   */
  tight?: boolean
}

export interface UnicodeResult {
  /** The lines, each padded with spaces to `width` terminal cells. */
  lines: string[]
  /** Index of the line that holds the math baseline. */
  baseline: number
  /** Display width of every line, in terminal cells. */
  width: number
}

// ─── terminal ────────────────────────────────────────────────────────────────

/** The terminal's grid, from the cell probe. */
export interface CellSize {
  cellWidth: number
  cellHeight: number
  columns: number
  rows: number
}

export interface TerminalColors {
  foreground?: RGB
  background?: RGB
  /** The 16 ANSI colours (0-7 normal, 8-15 bright), when known; ANSI Claude themes draw text in these. */
  palette?: RGB[]
  /** Ghostty's `grapheme-width-method`, read with its colours, when its config sets it (Ghostty's default is `unicode`). */
  graphemeWidth?: 'unicode' | 'legacy'
}

export type TerminalKind = 'kitty' | 'ghostty' | 'wezterm' | 'iterm2' | 'other'

export interface TerminalInfo {
  kind: TerminalKind
  /** Whether Claude Code's Image element draws pictures here (kitty ≥ 0.28 or Ghostty, outside tmux/screen). */
  images: boolean
  /** Inside tmux, screen or zellij. */
  multiplexed: boolean
  /** Which multiplexer, when multiplexed. */
  multiplexer?: 'tmux' | 'screen' | 'zellij'
  /** Over ssh: the terminal (and its config files) is on another machine, so colour probes don't apply. */
  ssh?: boolean
}

/** A host command for the adapter to run (no shell), and how to read its output. */
export interface Probe<T> {
  argv: readonly string[]
  parse(stdout: string): T | undefined
}
