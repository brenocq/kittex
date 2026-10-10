import type { TerminalInfo, TerminalKind } from '../types.js'

export type Env = Readonly<Record<string, string | undefined>>

/**
 * What the environment says about the terminal Claude Code runs in.
 *
 * The kind comes from the variables each terminal sets in its children, the
 * strongest first: TERM (set by the terminal itself, rewritten only by a
 * multiplexer), TERM_PROGRAM (tmux overwrites it with "tmux"), then markers that
 * are merely inherited (KITTY_WINDOW_ID, GHOSTTY_RESOURCES_DIR, LC_TERMINAL...).
 * TERM and LC_TERMINAL also survive ssh, so a remote session is still recognised.
 *
 * `images` mirrors Claude Code 2.1.290's own decision for its Image element: on
 * when CLAUDE_CODE_FORCE_TERMINAL_IMAGES is set; off in a background worker
 * (CLAUDE_CODE_SESSION_KIND=bg) and inside tmux or screen; otherwise on when the
 * terminal answers its XTVERSION query as kitty >= 0.28 or Ghostty. The child
 * can't send that query, so kitty and Ghostty count as capable (kitty 0.28 is
 * from 2023); inside zellij the multiplexer answers the query, so images are off.
 */
export function detectTerminal(env: Env): TerminalInfo {
  const multiplexer = detectMultiplexer(env)
  const kind = detectKind(env)
  const forced = isSet(env.CLAUDE_CODE_FORCE_TERMINAL_IMAGES)
  const background = env.CLAUDE_CODE_SESSION_KIND === 'bg'
  const images = forced || (!background && multiplexer === undefined && (kind === 'kitty' || kind === 'ghostty'))
  const info: TerminalInfo = { kind, images, multiplexed: multiplexer !== undefined }
  if (multiplexer) info.multiplexer = multiplexer
  if (isSet(env.SSH_CONNECTION) || isSet(env.SSH_CLIENT) || isSet(env.SSH_TTY)) info.ssh = true
  return info
}

function detectKind(env: Env): TerminalKind {
  const term = env.TERM ?? ''
  if (term === 'xterm-ghostty') return 'ghostty'
  if (term.includes('kitty')) return 'kitty'
  switch (env.TERM_PROGRAM) {
    case 'ghostty':
      return 'ghostty'
    case 'kitty':
      return 'kitty'
    case 'WezTerm':
      return 'wezterm'
    case 'iTerm.app':
      return 'iterm2'
  }
  // Terminals without kitty graphics that name themselves: the markers below would be inherited (Terminal.app
  // opened with `open -a Terminal` from a kitty shell gets that shell's variables; so does VS Code started from one).
  if (env.TERM_PROGRAM !== undefined && OTHER_PROGRAMS.has(env.TERM_PROGRAM)) return 'other'
  if (term === 'wezterm') return 'wezterm'
  if (env.LC_TERMINAL === 'iTerm2') return 'iterm2'
  if (isSet(env.KITTY_WINDOW_ID) || isSet(env.KITTY_PID)) return 'kitty'
  if (isSet(env.GHOSTTY_RESOURCES_DIR) || isSet(env.GHOSTTY_BIN_DIR)) return 'ghostty'
  if (isSet(env.WEZTERM_PANE) || isSet(env.WEZTERM_EXECUTABLE)) return 'wezterm'
  if (isSet(env.ITERM_SESSION_ID)) return 'iterm2'
  return 'other'
}

/** TERM_PROGRAM values of terminals that are none of kittex's kinds (they set it themselves, so it beats inherited markers). */
const OTHER_PROGRAMS = new Set(['Apple_Terminal', 'vscode', 'WarpTerminal', 'Hyper', 'Tabby'])

function detectMultiplexer(env: Env): TerminalInfo['multiplexer'] {
  const term = env.TERM ?? ''
  if (isSet(env.TMUX) || env.TERM_PROGRAM === 'tmux' || /^tmux(-|$)/.test(term)) return 'tmux'
  if (isSet(env.STY) || /^screen(\.|-|$)/.test(term)) return 'screen'
  if (isSet(env.ZELLIJ) || isSet(env.ZELLIJ_SESSION_NAME)) return 'zellij'
  return undefined
}

function isSet(value: string | undefined): boolean {
  return value !== undefined && value !== ''
}
