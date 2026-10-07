import type { CellAdjust, MetricAdjust, Probe, RGB, TerminalColors } from '../types.js'
import type { Env } from './detect.js'
import { type ConfigReadOptions, dirname, type FileReader, homeOf, parseColorValue, resolvePath, tryRead, xdgConfigHome } from './color.js'
import { fontWeightOf } from './font.js'

// Ghostty's built-in colours (src/config/Config.zig, src/terminal/color.zig;
// the same in 1.2.3, 1.3.1 and main as of 2026-10).
export const GHOSTTY_DEFAULT_FOREGROUND: RGB = { r: 0xff, g: 0xff, b: 0xff }
export const GHOSTTY_DEFAULT_BACKGROUND: RGB = { r: 0x28, g: 0x2c, b: 0x34 }
export const GHOSTTY_DEFAULT_PALETTE: readonly RGB[] = [
  0x1d1f21, 0xcc6666, 0xb5bd68, 0xf0c674, 0x81a2be, 0xb294bb, 0x8abeb7, 0xc5c8c6,
  0x666666, 0xd54e53, 0xb9ca4a, 0xe7c547, 0x7aa6da, 0xc397d8, 0x70c0b1, 0xeaeaea,
].map(n => ({ r: n >> 16, g: (n >> 8) & 0xff, b: n & 0xff }))

type Scheme = ConfigReadOptions['scheme']

/** A Ghostty config file read as `key = value` lines, in order. */
export function ghosttyEntries(text: string): [key: string, value: string][] {
  const entries: [string, string][] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    entries.push([key, value])
  }
  return entries
}

/** A `theme` value: one theme, or a light/dark pair (`light:A,dark:B`). */
export function parseGhosttyTheme(value: string): { light: string; dark: string } | undefined {
  const v = value.trim()
  if (!v) return undefined
  if (!/[,:=]/.test(v)) return { light: v, dark: v }
  let light: string | undefined
  let dark: string | undefined
  for (const part of v.split(',')) {
    const m = /^\s*(light|dark)\s*[:=]\s*(.+?)\s*$/.exec(part)
    if (m?.[1] === 'light') light = m[2]
    else if (m?.[1] === 'dark') dark = m[2]
  }
  return light && dark ? { light, dark } : undefined
}

interface GhosttyColors {
  values: Map<'foreground' | 'background', RGB>
  palette: Map<number, RGB>
  alphaBlending?: TerminalColors['alphaBlending']
  adjust: CellAdjust
  /** font-variation, font-style and the first font-family, as last set. */
  font: { variation?: string; style?: string; family?: string }
}

/** Ghostty's options that set its cells off the font's own metrics, and the CellAdjust field each sets. */
const ADJUST_KEYS = { 'adjust-cell-width': 'width', 'adjust-cell-height': 'height', 'adjust-font-baseline': 'baseline' } as const

/**
 * An `adjust-*` metric value, parsed as Ghostty's font/Metrics.zig Modifier
 * does: `N%` changes the metric by N percent (a factor of 1 + N/100, no less
 * than 0), a bare integer adds that many pixels. Empty or malformed: unset.
 */
export function parseMetricAdjust(value: string): MetricAdjust | undefined {
  const v = value.trim()
  if (v.endsWith('%')) {
    const percent = Number(v.slice(0, -1))
    if (v.length < 2 || !Number.isFinite(percent)) return undefined
    return { factor: Math.max(0, 1 + percent / 100) }
  }
  return /^[+-]?\d+$/.test(v) ? { px: Number(v) } : undefined
}

function emptyColors(): GhosttyColors {
  return { values: new Map(), palette: new Map(), adjust: {}, font: {} }
}

/** An `alpha-blending` value (Ghostty 1.1 and later). */
export function parseAlphaBlending(value: string): TerminalColors['alphaBlending'] {
  const v = value.trim()
  return v === 'native' || v === 'linear' || v === 'linear-corrected' ? v : undefined
}

/** Ghostty's `alpha-blending` when nothing sets it: native on macOS, linear-corrected elsewhere (Config.zig). */
export function ghosttyDefaultAlphaBlending(platform: string): NonNullable<TerminalColors['alphaBlending']> {
  return platform === 'darwin' ? 'native' : 'linear-corrected'
}

// Applies one colour entry; an empty value resets the key to its default.
function applyColor(into: GhosttyColors, key: string, value: string): void {
  if (Object.prototype.hasOwnProperty.call(ADJUST_KEYS, key)) {
    const field = ADJUST_KEYS[key as keyof typeof ADJUST_KEYS]
    const adjust = value ? parseMetricAdjust(value) : undefined
    if (adjust) into.adjust[field] = adjust
    else delete into.adjust[field]
  } else if (key === 'font-family' || key === 'font-style' || key === 'font-variation') {
    // Repeated font-family lines add fallbacks: the first is the text font (an empty one resets the list).
    const field = key === 'font-family' ? 'family' : key === 'font-style' ? 'style' : 'variation'
    if (!value) delete into.font[field]
    else if (field !== 'family' || into.font.family === undefined) into.font[field] = value
  } else if (key === 'alpha-blending') {
    // An empty value resets it to the default, which depends on the platform.
    into.alphaBlending = parseAlphaBlending(value)
  } else if (key === 'foreground' || key === 'background') {
    if (!value) {
      into.values.delete(key)
      return
    }
    const color = parseColorValue(value)
    if (color) into.values.set(key, color)
  } else if (key === 'palette') {
    const m = /^\s*(0x[0-9a-f]+|0o[0-7]+|0b[01]+|\d+)\s*=\s*(.+)$/i.exec(value)
    if (!m) return
    const index = Number(m[1]!.toLowerCase())
    const color = parseColorValue(m[2]!)
    if (color && index >= 0 && index < 16) into.palette.set(index, color)
  }
}

/** A `grapheme-width-method` value Ghostty knows. */
function graphemeWidthOf(value: string): TerminalColors['graphemeWidth'] {
  return value === 'unicode' || value === 'legacy' ? value : undefined
}

function toTerminalColors(...layers: GhosttyColors[]): TerminalColors {
  const pick = (key: 'foreground' | 'background') => layers.reduce<RGB | undefined>((c, l) => l.values.get(key) ?? c, undefined)
  const colors: TerminalColors = {
    foreground: pick('foreground') ?? GHOSTTY_DEFAULT_FOREGROUND,
    background: pick('background') ?? GHOSTTY_DEFAULT_BACKGROUND,
    palette: GHOSTTY_DEFAULT_PALETTE.map((c, i) => layers.reduce((acc, l) => l.palette.get(i) ?? acc, c)),
  }
  const blending = layers.reduce<TerminalColors['alphaBlending']>((b, l) => l.alphaBlending ?? b, undefined)
  if (blending) colors.alphaBlending = blending
  const adjust: CellAdjust = Object.assign({}, ...layers.map(l => l.adjust))
  if (Object.keys(adjust).length > 0) colors.cellAdjust = adjust
  const font = Object.assign({}, ...layers.map(l => l.font)) as GhosttyColors['font']
  // `default` and `true` keep the family's regular face; with no family, Ghostty's own (JetBrains Mono) Regular.
  const style = font.style === undefined || ['default', 'true', 'false'].includes(font.style) ? undefined : font.style
  const fontWeight = fontWeightOf([font.variation, style, font.family]) ?? (font.family === undefined && style === undefined ? 400 : undefined)
  if (fontWeight) colors.fontWeight = fontWeight
  return colors
}

/**
 * Reads `ghostty +show-config --changes-only=false`: every option as
 * `key = value`, colours as `#rrggbb`, the palette as `palette = N=#rrggbb`,
 * `alpha-blending` resolved for the platform, with the theme already applied
 * (Config.load runs finalize, which loads the theme under the user's own
 * settings). For `theme = light:A,dark:B` the CLI resolves the light theme
 * (the GUI alone follows the desktop), so with scheme `dark` and two
 * different themes the answer is known to be wrong: undefined. The
 * `grapheme-width-method` comes along (how Ghostty measures emoji sequences).
 */
export function parseGhosttyConfig(stdout: string, scheme?: Scheme): TerminalColors | undefined {
  const colors = emptyColors()
  let theme: { light: string; dark: string } | undefined
  let graphemeWidth: TerminalColors['graphemeWidth']
  for (const [key, value] of ghosttyEntries(stdout)) {
    if (key === 'theme') theme = parseGhosttyTheme(value)
    else if (key === 'grapheme-width-method') graphemeWidth = graphemeWidthOf(value)
    else applyColor(colors, key, value)
  }
  if (!colors.values.has('foreground') && !colors.values.has('background')) return undefined
  if (scheme === 'dark' && theme && theme.light !== theme.dark) return undefined
  return { ...toTerminalColors(colors), ...(graphemeWidth ? { graphemeWidth } : {}) }
}

/**
 * Commands that print Ghostty's effective configuration. GHOSTTY_BIN_DIR is set
 * in every Ghostty child (except under Flatpak) even when the shell rewrites
 * PATH; on macOS the CLI is the app binary, rarely on PATH outside Ghostty.
 * Running it doesn't open a window or need a terminal. Note: when the user has
 * no config file at all, Ghostty writes a commented template config.ghostty.
 */
export function ghosttyColorProbes(env: Env, scheme?: Scheme): Probe<TerminalColors>[] {
  const commands: string[] = []
  if (env.GHOSTTY_BIN_DIR?.startsWith('/')) commands.push(`${env.GHOSTTY_BIN_DIR.replace(/\/+$/, '')}/ghostty`)
  commands.push('ghostty', '/Applications/Ghostty.app/Contents/MacOS/ghostty')
  return commands.map(cmd => ({ argv: [cmd, '+show-config', '--changes-only=false'], parse: (out: string) => parseGhosttyConfig(out, scheme) }))
}

// ─── config files ────────────────────────────────────────────────────────────

/** Ghostty's default config files, in load order. */
export function ghosttyConfigFiles(env: Env, platform?: string): string[] {
  const files: string[] = []
  const xdg = xdgConfigHome(env)
  if (xdg) files.push(`${xdg}/ghostty/config`, `${xdg}/ghostty/config.ghostty`)
  const home = homeOf(env)
  if (home && (platform === undefined || platform === 'darwin')) {
    const support = `${home}/Library/Application Support/com.mitchellh.ghostty`
    files.push(`${support}/config`, `${support}/config.ghostty`)
  }
  return files
}

function ghosttyThemeDirs(env: Env): string[] {
  const dirs: string[] = []
  const xdg = xdgConfigHome(env)
  if (xdg) dirs.push(`${xdg}/ghostty/themes`)
  if (env.GHOSTTY_RESOURCES_DIR?.startsWith('/')) dirs.push(`${env.GHOSTTY_RESOURCES_DIR.replace(/\/+$/, '')}/themes`)
  else {
    if (env.GHOSTTY_BIN_DIR?.startsWith('/')) dirs.push(resolvePath('../share/ghostty/themes', env, env.GHOSTTY_BIN_DIR)!)
    dirs.push('/Applications/Ghostty.app/Contents/Resources/ghostty/themes', '/usr/share/ghostty/themes', '/usr/local/share/ghostty/themes')
  }
  return dirs
}

/**
 * Ghostty's configured colours, read from its config files through `read`, the
 * way Config.load does: the default files ($XDG_CONFIG_HOME/ghostty/config and
 * config.ghostty, then on macOS the same two in Application Support), then the
 * `config-file` includes (relative to the including file, `?` for optional),
 * each loaded after everything before it; then the theme (a name looked up in
 * ~/.config/ghostty/themes and the resources dir, or an absolute path) under
 * the user's own colours. A light/dark theme pair follows `scheme` (light when
 * not given, as the CLI does). Ghostty's defaults when nothing sets a colour.
 * `alpha-blending` as configured, else the platform's default when
 * `platform` is given (unknown otherwise). The last `grapheme-width-method`
 * set comes along.
 */
export async function readGhosttyColors(read: FileReader, options: ConfigReadOptions): Promise<TerminalColors> {
  const { env } = options
  const user = emptyColors()
  let theme: { light: string; dark: string } | undefined
  let graphemeWidth: TerminalColors['graphemeWidth']
  // Missing files are skipped whether or not they were marked optional with `?`.
  const queue = ghosttyConfigFiles(env, options.platform)
  const seen = new Set<string>()
  for (let i = 0; i < queue.length && i < 64; i++) {
    const path = queue[i]!
    if (seen.has(path)) continue
    seen.add(path)
    const text = await tryRead(read, path)
    if (text === undefined) continue
    for (const [key, value] of ghosttyEntries(text)) {
      if (key === 'config-file') {
        if (!value) continue
        const target = resolvePath(value.startsWith('?') ? value.slice(1) : value, env, dirname(path))
        if (target) queue.push(target)
      } else if (key === 'theme') theme = parseGhosttyTheme(value)
      else if (key === 'grapheme-width-method') graphemeWidth = graphemeWidthOf(value)
      else applyColor(user, key, value)
    }
  }
  const themeColors = emptyColors()
  const name = theme && (options.scheme === 'dark' ? theme.dark : theme.light)
  if (name) {
    const candidates = name.startsWith('/') || name.startsWith('~/') ? [resolvePath(name, env)] : name.includes('/') ? [] : ghosttyThemeDirs(env).map(d => `${d}/${name}`)
    for (const path of candidates) {
      const text = await tryRead(read, path)
      if (text === undefined) continue
      for (const [key, value] of ghosttyEntries(text)) applyColor(themeColors, key, value)
      break
    }
  }
  const colors = toTerminalColors(themeColors, user)
  if (!colors.alphaBlending && options.platform !== undefined) colors.alphaBlending = ghosttyDefaultAlphaBlending(options.platform)
  return { ...colors, ...(graphemeWidth ? { graphemeWidth } : {}) }
}
