import type { Probe, TerminalColors, TerminalInfo } from '../types.js'
import type { ConfigReadOptions, FileReader } from './color.js'
import type { Env } from './detect.js'
import { ghosttyColorProbes, readGhosttyColors } from './ghostty.js'
import { kittyColorProbes, readKittyColors } from './kitty.js'

export { cellProbe, cellProbePython, cellProbes, emPxForCell, parseWinsize } from './cell.js'
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
export { ghosttyEntries, parseGhosttyConfig, readGhosttyColors } from './ghostty.js'
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

/**
 * Whether the terminal draws emoji sequences (an emoji with U+FE0F or a skin
 * tone, zero-width joiner chains, flags, keycaps with U+FE0F) two cells wide,
 * as Claude Code counts them: kitty (wcswidth, measured on 0.49), and Ghostty
 * unless its `grapheme-width-method` is `legacy` (there they take one to six
 * cells; `unicode`, its default, gives two). Not over ssh or in a
 * multiplexer, where the drawing terminal and its settings aren't known (and
 * a multiplexer measures widths itself), nor in any other terminal.
 */
export function drawsEmojiSequences(terminal: TerminalInfo, colors?: TerminalColors): boolean {
  if (terminal.ssh || terminal.multiplexed) return false
  if (terminal.kind === 'kitty') return true
  return terminal.kind === 'ghostty' && colors?.graphemeWidth !== 'legacy'
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
