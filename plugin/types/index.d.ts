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
  /** Whether the cell size was measured (false: the fallback cell). */
  measured: boolean
}

/** One display preview written while a reply streamed, and the TeX it stands for (kittex.records). */
export type KittexPreview = {
  /** The markdown exactly as written into the reply. */
  preview: string
  tex: string
  /** Rows reserved on screen; the image is drawn at least this tall. */
  rows: number
}

declare module 'claude-code' {
  interface PluginState {
    kittex: {
      /** The terminal as drawing sees it; null until session.start set it up, or when that failed. */
      env: KittexEnv | null
      /** Display previews written while streaming, newest last. */
      records: KittexPreview[]
    }
  }
}
