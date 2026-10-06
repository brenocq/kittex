import type { Probe, RGB, TerminalColors, TerminalInfo } from '../types.js'
import type { ConfigReadOptions, FileReader } from './color.js'
import type { Env } from './detect.js'
import { ghosttyColorProbes, readGhosttyColors } from './ghostty.js'
import { kittyColorProbes, readKittyColors } from './kitty.js'

export { cellProbe, cellProbePython, cellProbes, emPxForCell, fontCell, parseWinsize, textBaseline } from './cell.js'
export {
  CLAUDE_THEME_TEXT,
  type ClaudeBuiltinTheme,
  type ClaudeCustomTheme,
  chooseInk,
  claudeCustomThemePath,
  claudeThemeInk,
  claudeThemeScheme,
  type InkSources,
  parseClaudeColor,
  parseClaudeCustomTheme,
  resolveClaudeTheme,
} from './claude-theme.js'
export { type ConfigReadOptions, type FileReader, isDark, parseColorValue, toHex } from './color.js'
export { detectTerminal, type Env } from './detect.js'
export { ghosttyDefaultAlphaBlending, ghosttyEntries, parseAlphaBlending, parseGhosttyConfig, parseMetricAdjust, readGhosttyColors } from './ghostty.js'
export { kittyConfigDirs, parseKittyColors, readKittyColors } from './kitty.js'

export interface ColorProbeOptions {
  /** Claude Code's environment, to find the terminal's binary (GHOSTTY_BIN_DIR, KITTY_INSTALLATION_DIR). */
  env?: Env
  /** The desktop's light/dark appearance (see claudeThemeScheme), for kitty's auto themes and Ghostty's light/dark pairs. */
  scheme?: 'dark' | 'light'
}

/**
 * Commands that read the terminal's configured colours, to try in order until
 * one parses. Only kitty and Ghostty have them, which are also the only
 * terminals where kittex draws images; none over ssh (the terminal and its
 * config are on the other machine). They report the configuration, not
 * runtime changes (kitty's set-colors, OSC 10/11 from programs). Asking the
 * terminal itself (OSC 10/11) would need Claude Code's tty, whose replies would
 * land in Claude Code's own input.
 */
export function colorProbes(terminal: TerminalInfo, options: ColorProbeOptions = {}): Probe<TerminalColors>[] {
  if (terminal.ssh) return []
  const env = options.env ?? {}
  switch (terminal.kind) {
    case 'kitty':
      return kittyColorProbes(env, options.scheme)
    case 'ghostty':
      return ghosttyColorProbes(env, options.scheme)
    default:
      return []
  }
}

/** The terminal's configured colours from its config files, for when its probes can't run. */
export async function readTerminalColors(terminal: TerminalInfo, read: FileReader, options: ConfigReadOptions): Promise<TerminalColors | undefined> {
  if (terminal.ssh) return undefined
  switch (terminal.kind) {
    case 'kitty':
      return readKittyColors(read, options)
    case 'ghostty':
      return readGhosttyColors(read, options)
    default:
      return undefined
  }
}

/**
 * The background an image's ink alpha must be corrected against so a formula
 * weighs what the terminal's text weighs (raster's inkAlpha), or undefined
 * where the terminal blends images and text alike.
 *
 * Ghostty with `alpha-blending = linear-corrected` (its default outside macOS)
 * blends everything in linear light but corrects text glyphs to look
 * gamma-blended; images get no correction, so measured on Ghostty 1.3.1 a
 * formula drew thinner than the text beside it on a light background and
 * bolder on a dark one. Text is corrected against the cell's background, the
 * default background under reply text. With `native` or `linear` Ghostty
 * blends images as it blends text, and kitty blends both in linear light (its
 * `text_composition_strategy` on Linux, 1.0 0, adds nothing to that).
 */
export function imageInkBackground(kind: TerminalInfo['kind'], colors: TerminalColors | undefined): RGB | undefined {
  if (kind !== 'ghostty' || colors?.alphaBlending !== 'linear-corrected') return undefined
  return colors.background
}
