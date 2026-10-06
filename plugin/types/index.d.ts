// kittex's contract: the values it keeps in `$.state` (PluginState), named in
// plugin.json as "types". Self-contained (no import), types only.

/** What drawing needs to know about the terminal (kittex.env). */
export type KittexEnv = {
  kind: 'kitty' | 'ghostty' | 'wezterm' | 'iterm2' | 'other'
  /** Whether Image draws pictures here. */
  images: boolean
  /** One cell, in pixels. */
  cellWidth: number
  cellHeight: number
  /** Terminal (viewport) columns as last known. */
  columns: number
  /** Pixels per em of the math font. */
  emPx: number
  /** The formulas' colour. */
  ink: { r: number; g: number; b: number }
  /** The background the ink's alpha is corrected against, as the terminal corrects its text (Ghostty's linear-corrected blending); absent where images and text blend alike. */
  inkOver?: { r: number; g: number; b: number }
  /** How the terminal set its cells off its font's (Ghostty's adjust-cell-width, adjust-cell-height, adjust-font-baseline); absent when none is set. */
  cellAdjust?: {
    width?: { factor: number } | { px: number }
    height?: { factor: number } | { px: number }
    baseline?: { factor: number } | { px: number }
  }
  /** Whether the cell size was measured (false: the fallback cell). */
  measured: boolean
  /** The glyph the engine opens a reply with (`⏺` on macOS, `●` elsewhere); `●` when absent. */
  bullet?: string
  /** The `maxProseWidth` setting: reply prose wraps at most this wide; absent when unset. */
  maxProseWidth?: number
  /** Whether the engine draws links as OSC 8 hyperlinks (their text alone) or as text with the url beside it; absent when unknown (links aren't followed). */
  hyperlinks?: boolean
}

/** One preview written while a reply streamed (display, or inline when `inline`), and the TeX it stands for (kittex.records). */
export type KittexPreview = {
  /** The markdown exactly as written into the reply (lines after the first carry its indentation). */
  preview: string
  tex: string
  /** Rows reserved on screen; the image is drawn at least this tall (0 for a refused formula). */
  rows: number
  /** MathJax refused the formula: why. The preview is its source and a `not rendered` line. */
  error?: string
  /** An inline formula's preview (one row, `columns` cells, drawn over by its image once landed). */
  inline?: true
  /** Inline: the cells the preview and its image take. */
  columns?: number
  /** Display: written in a blockquote this deep (its lines carry the quote's `>`, its width the quote's text width). */
  quote?: number
}

declare module 'claude-code' {
  interface PluginState {
    kittex: {
      /** The terminal as drawing sees it; null until session.start set it up, or when that failed. */
      env: KittexEnv | null
      /** Previews written while streaming, newest last. */
      records: KittexPreview[]
    }
  }
}
