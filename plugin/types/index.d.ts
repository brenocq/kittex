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
  /** Whether the terminal draws emoji sequences (an emoji with U+FE0F or a skin tone, joiner chains, flags, keycaps) two cells wide, as the engine counts them; absent: they keep their paragraph's math Unicode. */
  emojiSequences?: boolean
  /** The stroke weight the math is drawn with, matched to the terminal font's weight (strokeWeight); absent when that weight isn't known (the default weight). */
  weight?: number
  /** The terminal's background, when its colours were read: TeX's white becomes it, and diagrams' colours are kept legible on it. */
  background?: { r: number; g: number; b: number }
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
  /**
   * Inline: where its ink goes in those cells, as the characters around it in
   * the source suggest (an image drawn ahead of landing; the landed layout's
   * rows decide).
   */
  place?: 'center' | 'start' | 'end'
  /** Where the preview starts in the block's text as the engine shows it (every flush's displayContent joined): how a landed block finds it. */
  at?: number
  /** Display: written in a blockquote this deep (its lines carry the quote's `>`, its width the quote's text width). */
  quote?: number
  /**
   * Display: written in a list item whose text is this many cells in from the
   * reply column (its lines carry the item's indentation, its width the item's
   * text width); its image lies over it in the item once landed.
   */
  indent?: number
  /**
   * A diagram for the local TeX (a ```latex, ```tex or ```tikz block, or a
   * bare picture environment), `tex` its source: the preview is its
   * placeholder, `rows` tall, drawn over by its picture once landed (with
   * `error`: the block as written and its `not rendered` line).
   */
  diagram?: 'latex' | 'tikz' | 'env'
}

/** One text block kittex streamed (kittex.blocks, by MessageDisplay's message_id). */
export type KittexBlock = {
  /** Its previews, in the order written, each with `at`. */
  records: KittexPreview[]
  /** Where the stream gave up: from this offset of the shown text on, the model's text passed as written. */
  raw?: number
}

declare module 'claude-code' {
  interface PluginState {
    kittex: {
      /** The terminal as drawing sees it; null until session.start set it up, or when that failed. */
      env: KittexEnv | null
      /** Each streamed block's previews, by MessageDisplay's message_id; null once dropped (past BLOCK_LIMIT). */
      blocks: StateFamily<KittexBlock | null>
      /** The message_id each landed block streamed as, by its transcript row's uuid (AssistantMessage's requestId). */
      requests: StateFamily<string>
      /** The newest blocks' message_ids, newest last (a landed block that no row links is looked for among them). */
      recent: string[]
    }
  }
}
