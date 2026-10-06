import type { RGB, TerminalColors } from '../types.js'
import { isDark, xterm256 } from './color.js'

/**
 * Claude Code's built-in themes and the value of their `text` token ("Default
 * foreground text"), as in Claude Code 2.1.290's theme tables. The ANSI themes
 * name a palette colour, so the terminal decides the RGB.
 */
export const CLAUDE_THEME_TEXT = {
  dark: 'rgb(255,255,255)',
  light: 'rgb(0,0,0)',
  'dark-daltonized': 'rgb(255,255,255)',
  'light-daltonized': 'rgb(0,0,0)',
  'dark-ansi': 'ansi:whiteBright',
  'light-ansi': 'ansi:black',
} as const

export type ClaudeBuiltinTheme = keyof typeof CLAUDE_THEME_TEXT

/** A custom theme file, `~/.claude/themes/<slug>.json` (all fields optional). */
export interface ClaudeCustomTheme {
  name?: string
  /** A built-in theme other than auto; `dark` when missing or invalid. */
  base?: string
  /** Token name to colour: `#rrggbb`, `#rgb`, `rgb(r,g,b)`, `ansi256(n)` or `ansi:<name>`. */
  overrides?: Record<string, unknown>
}

const ANSI_NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']

function isBuiltin(theme: unknown): theme is ClaudeBuiltinTheme {
  return typeof theme === 'string' && Object.hasOwn(CLAUDE_THEME_TEXT, theme)
}

/**
 * A Claude theme colour value as RGB, with the same syntax Claude Code accepts:
 * `rgb(r,g,b)` (one optional space around each number), `#rrggbb`, `#rgb`,
 * `ansi256(n)`, `ansi:<name>` (black...white, blackBright...whiteBright).
 * Palette colours (ANSI names, ansi256 0-15) need the terminal's palette.
 */
export function parseClaudeColor(value: unknown, palette?: readonly RGB[]): RGB | undefined {
  if (typeof value !== 'string') return undefined
  const rgb = /^rgb\(\s?(\d{1,3}),\s?(\d{1,3}),\s?(\d{1,3})\s?\)$/.exec(value)
  if (rgb) {
    const [r, g, b] = rgb.slice(1).map(Number) as [number, number, number]
    return r <= 255 && g <= 255 && b <= 255 ? { r, g, b } : undefined
  }
  const hex6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value)
  if (hex6) return { r: parseInt(hex6[1]!, 16), g: parseInt(hex6[2]!, 16), b: parseInt(hex6[3]!, 16) }
  const hex3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value)
  if (hex3) return { r: parseInt(hex3[1]! + hex3[1]!, 16), g: parseInt(hex3[2]! + hex3[2]!, 16), b: parseInt(hex3[3]! + hex3[3]!, 16) }
  const n256 = /^ansi256\((\d{1,3})\)$/.exec(value)
  if (n256) {
    const n = Number(n256[1])
    return n < 16 ? palette?.[n] : xterm256(n)
  }
  if (value.startsWith('ansi:')) {
    const m = /^([a-z]+?)(Bright)?$/.exec(value.slice(5))
    const index = m ? ANSI_NAMES.indexOf(m[1]!) : -1
    return index < 0 ? undefined : palette?.[index + (m![2] ? 8 : 0)]
  }
  return undefined
}

function isClaudeColor(value: unknown): boolean {
  return parseClaudeColor(value, Array<RGB>(16).fill({ r: 0, g: 0, b: 0 })) !== undefined
}

/** A custom theme file's contents (JSON text or the parsed object), validated as Claude Code does. */
export function parseClaudeCustomTheme(json: unknown): ClaudeCustomTheme | undefined {
  let value = json
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return undefined
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  const theme: ClaudeCustomTheme = { base: isBuiltin(raw.base) ? raw.base : 'dark', overrides: {} }
  if (typeof raw.name === 'string') theme.name = raw.name
  if (typeof raw.overrides === 'object' && raw.overrides !== null) {
    // Claude Code also drops tokens its base theme lacks; every theme has `text`, the one kittex reads.
    for (const [key, v] of Object.entries(raw.overrides)) if (isClaudeColor(v)) theme.overrides![key] = v
  }
  return theme
}

/**
 * Where a `custom:<slug>` theme lives: `<claude config dir>/themes/<slug>.json`
 * (the config dir is CLAUDE_CONFIG_DIR or ~/.claude). Plugin themes,
 * `custom:<plugin>:<slug>`, live in the plugin's own `themes/` and give undefined.
 */
export function claudeCustomThemePath(theme: string | undefined, claudeConfigDir: string): string | undefined {
  const slug = theme?.startsWith('custom:') ? theme.slice(7) : undefined
  if (!slug || slug.includes(':') || slug.includes('/') || slug.startsWith('.')) return undefined
  return `${claudeConfigDir.replace(/\/+$/, '')}/themes/${slug}.json`
}

/**
 * The built-in theme a theme setting resolves to: `auto` follows the terminal's
 * background (dark when unknown, as Claude Code falls back); a custom theme
 * resolves to its base; anything unknown to `dark`, Claude Code's default.
 */
export function resolveClaudeTheme(theme: string | undefined, customTheme?: unknown, terminal?: TerminalColors): ClaudeBuiltinTheme {
  if (isBuiltin(theme)) return theme
  if (theme === 'auto') return terminal?.background && !isDark(terminal.background) ? 'light' : 'dark'
  if (theme?.startsWith('custom:')) {
    const base = parseClaudeCustomTheme(customTheme)?.base
    if (isBuiltin(base)) return base
  }
  return 'dark'
}

/** Whether the theme setting means a dark or a light background, for terminals with light/dark themes. */
export function claudeThemeScheme(theme: string | undefined, customTheme?: unknown, terminal?: TerminalColors): 'dark' | 'light' {
  return resolveClaudeTheme(theme, customTheme, terminal).startsWith('light') ? 'light' : 'dark'
}

/**
 * The RGB of the `text` token in a Claude theme setting (`dark`, `light`, the
 * daltonized and ANSI variants, `auto`, `custom:<slug>` with its file's
 * contents in `customTheme`). An ANSI colour comes from the terminal's palette:
 * undefined when the palette isn't known.
 */
export function claudeThemeInk(theme: string | undefined, customTheme?: unknown, terminal?: TerminalColors): RGB | undefined {
  const override = theme?.startsWith('custom:') ? parseClaudeCustomTheme(customTheme)?.overrides?.text : undefined
  const value = override ?? CLAUDE_THEME_TEXT[resolveClaudeTheme(theme, customTheme, terminal)]
  return parseClaudeColor(value, terminal?.palette)
}

/** Where the ink colour may come from; see chooseInk. */
export interface InkSources {
  /** Claude Code's `theme` setting. */
  theme?: string
  /** A colour already known to be what reply text is drawn in; wins unless `prefer` is `terminal`. */
  themeInk?: RGB
  /** The terminal's configured colours (colour probes or config files). */
  terminal?: TerminalColors
  /** The custom theme file's contents when `theme` is `custom:<slug>`. */
  customTheme?: unknown
  /**
   * Whether reply text is drawn in the theme's `text` colour or in the
   * terminal's default foreground. Unset: an explicit `themeInk`, then a custom
   * theme's `text` override, then the terminal foreground, then the built-in
   * theme's `text`.
   */
  prefer?: 'theme' | 'terminal'
}

/** The ink colour for formulas: the colour reply text is drawn in, as best known. */
export function chooseInk(sources: InkSources): RGB {
  const { theme, customTheme, terminal } = sources
  // No theme given means unknown, not Claude Code's default: fall through to the greys.
  const fromTheme = () => sources.themeInk ?? (theme === undefined ? undefined : claudeThemeInk(theme, customTheme, terminal))
  const fromTerminal = () => terminal?.foreground
  let ink: RGB | undefined
  if (sources.prefer === 'theme') ink = fromTheme() ?? fromTerminal()
  else if (sources.prefer === 'terminal') ink = fromTerminal() ?? fromTheme()
  else {
    const override = theme?.startsWith('custom:') ? parseClaudeCustomTheme(customTheme)?.overrides?.text : undefined
    ink = sources.themeInk ?? (override === undefined ? undefined : parseClaudeColor(override, terminal?.palette)) ?? fromTerminal() ?? fromTheme()
  }
  return ink ?? (claudeThemeScheme(theme, customTheme, terminal) === 'light' ? { r: 0x22, g: 0x22, b: 0x22 } : { r: 0xe6, g: 0xe6, b: 0xe6 })
}
