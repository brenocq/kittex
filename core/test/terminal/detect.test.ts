import { describe, expect, test } from 'vitest'
import { detectTerminal } from '../../src/terminal/index.js'

// Environments as each terminal sets them (this machine's kitty 0.49.1 for kitty;
// the others from their documented child environments).
const KITTY = { TERM: 'xterm-kitty', KITTY_WINDOW_ID: '1', KITTY_PID: '1066981', KITTY_INSTALLATION_DIR: '/usr/lib/kitty', COLORTERM: 'truecolor' }
const GHOSTTY = { TERM: 'xterm-ghostty', TERM_PROGRAM: 'ghostty', TERM_PROGRAM_VERSION: '1.3.1', GHOSTTY_RESOURCES_DIR: '/usr/share/ghostty', GHOSTTY_BIN_DIR: '/usr/bin' }
const WEZTERM = { TERM: 'xterm-256color', TERM_PROGRAM: 'WezTerm', WEZTERM_PANE: '0', WEZTERM_EXECUTABLE: '/usr/bin/wezterm-gui' }
const ITERM = { TERM: 'xterm-256color', TERM_PROGRAM: 'iTerm.app', LC_TERMINAL: 'iTerm2', ITERM_SESSION_ID: 'w0t0p0:ABC' }
const TMUX = { TMUX: '/tmp/tmux-1000/default,123,0', TERM: 'tmux-256color', TERM_PROGRAM: 'tmux' }
const SSH = { SSH_CONNECTION: '10.0.0.2 51000 10.0.0.1 22', SSH_CLIENT: '10.0.0.2 51000 22', SSH_TTY: '/dev/pts/3' }

describe('detectTerminal', () => {
  test.each([
    ['kitty', KITTY, { kind: 'kitty', images: true, multiplexed: false }],
    ['kitty, TERM only', { TERM: 'xterm-kitty' }, { kind: 'kitty', images: true, multiplexed: false }],
    ['kitty, KITTY_PID only', { KITTY_PID: '1' }, { kind: 'kitty', images: true, multiplexed: false }],
    ['ghostty', GHOSTTY, { kind: 'ghostty', images: true, multiplexed: false }],
    ['ghostty, TERM_PROGRAM only', { TERM_PROGRAM: 'ghostty' }, { kind: 'ghostty', images: true, multiplexed: false }],
    ['ghostty, resources dir only', { GHOSTTY_RESOURCES_DIR: '/x' }, { kind: 'ghostty', images: true, multiplexed: false }],
    ['wezterm', WEZTERM, { kind: 'wezterm', images: false, multiplexed: false }],
    ['iterm2', ITERM, { kind: 'iterm2', images: false, multiplexed: false }],
    ['iterm2 over ssh (LC_TERMINAL is forwarded)', { TERM: 'xterm-256color', LC_TERMINAL: 'iTerm2', ...SSH }, { kind: 'iterm2', images: false, multiplexed: false, ssh: true }],
    ['unknown', { TERM: 'xterm-256color' }, { kind: 'other', images: false, multiplexed: false }],
    ['empty', {}, { kind: 'other', images: false, multiplexed: false }],
    ['tmux inside kitty', { ...KITTY, ...TMUX }, { kind: 'kitty', images: false, multiplexed: true, multiplexer: 'tmux' }],
    ['tmux inside ghostty', { ...GHOSTTY, ...TMUX }, { kind: 'ghostty', images: false, multiplexed: true, multiplexer: 'tmux' }],
    ['screen inside kitty', { KITTY_WINDOW_ID: '1', STY: '123.pts-0.host', TERM: 'screen.xterm-256color' }, { kind: 'kitty', images: false, multiplexed: true, multiplexer: 'screen' }],
    ['screen by TERM alone', { TERM: 'screen-256color' }, { kind: 'other', images: false, multiplexed: true, multiplexer: 'screen' }],
    ['zellij inside kitty', { ...KITTY, ZELLIJ: '0', ZELLIJ_SESSION_NAME: 'x' }, { kind: 'kitty', images: false, multiplexed: true, multiplexer: 'zellij' }],
    ['kitty over ssh', { TERM: 'xterm-kitty', ...SSH }, { kind: 'kitty', images: true, multiplexed: false, ssh: true }],
    ['forced in tmux', { ...TMUX, CLAUDE_CODE_FORCE_TERMINAL_IMAGES: '1' }, { kind: 'other', images: true, multiplexed: true, multiplexer: 'tmux' }],
    ['forced in an unknown terminal', { TERM: 'xterm', CLAUDE_CODE_FORCE_TERMINAL_IMAGES: 'true' }, { kind: 'other', images: true, multiplexed: false }],
    ['empty force variable', { ...WEZTERM, CLAUDE_CODE_FORCE_TERMINAL_IMAGES: '' }, { kind: 'wezterm', images: false, multiplexed: false }],
    ['background worker', { ...KITTY, CLAUDE_CODE_SESSION_KIND: 'bg' }, { kind: 'kitty', images: false, multiplexed: false }],
  ])('%s', (_name, env, expected) => {
    expect(detectTerminal(env)).toEqual(expected)
  })

  test('the terminal that set TERM wins over inherited markers', () => {
    // Ghostty started from a kitty window inherits KITTY_WINDOW_ID.
    expect(detectTerminal({ ...KITTY, ...GHOSTTY }).kind).toBe('ghostty')
    // kitty started from Ghostty inherits TERM_PROGRAM=ghostty but sets TERM itself.
    expect(detectTerminal({ TERM_PROGRAM: 'ghostty', GHOSTTY_BIN_DIR: '/usr/bin', TERM: 'xterm-kitty' }).kind).toBe('kitty')
    // WezTerm started from kitty.
    expect(detectTerminal({ KITTY_WINDOW_ID: '1', ...WEZTERM }).kind).toBe('wezterm')
  })

  test("Terminal.app and VS Code name themselves in TERM_PROGRAM: a kitty's or Ghostty's inherited markers don't make them one", () => {
    // Terminal.app opened with `open -a Terminal` from a kitty shell (measured on macOS 26: it inherits that shell's variables).
    const terminalApp = { TERM: 'xterm-256color', TERM_PROGRAM: 'Apple_Terminal', TERM_PROGRAM_VERSION: '470.2', TERM_SESSION_ID: 'w0t0p0:X' }
    expect(detectTerminal({ KITTY_WINDOW_ID: '1', KITTY_PID: '90110', ...terminalApp })).toEqual({ kind: 'other', images: false, multiplexed: false })
    // VS Code started from a Ghostty or kitty shell (`code .`).
    expect(detectTerminal({ GHOSTTY_RESOURCES_DIR: '/r', GHOSTTY_BIN_DIR: '/b', TERM: 'xterm-256color', TERM_PROGRAM: 'vscode' }).kind).toBe('other')
    expect(detectTerminal({ KITTY_WINDOW_ID: '1', TERM: 'xterm-256color', TERM_PROGRAM: 'vscode' }).images).toBe(false)
    // Their own TERM still wins: kitty or Ghostty started from them.
    expect(detectTerminal({ ...terminalApp, ...KITTY }).kind).toBe('kitty')
  })
})
