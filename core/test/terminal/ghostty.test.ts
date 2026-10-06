import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  colorProbes,
  detectTerminal,
  ghosttyEntries,
  imageInkBackground,
  parseGhosttyConfig,
  parseMetricAdjust,
  readGhosttyColors,
  readTerminalColors,
  toHex,
} from '../../src/terminal/index.js'
import type { TerminalColors } from '../../src/types.js'

// ghostty-show-config.txt is built from the formatter in Ghostty's source
// (src/config/formatter.zig: `key = value`, colours `#rrggbb`, `palette =
// N=#rrggbb` for all 256 entries); ghostty-1.3.1-show-config.txt is the real
// output of Ghostty 1.3.1 on Linux.
const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')
const memFs = (files: Record<string, string>) => async (path: string) => files[path]
const hex = (c: TerminalColors | undefined) => c && { foreground: toHex(c.foreground!), background: toHex(c.background!), palette: c.palette!.map(toHex) }

const GHOSTTY_DEFAULT_PALETTE = ['#1d1f21', '#cc6666', '#b5bd68', '#f0c674', '#81a2be', '#b294bb', '#8abeb7', '#c5c8c6', '#666666', '#d54e53', '#b9ca4a', '#e7c547', '#7aa6da', '#c397d8', '#70c0b1', '#eaeaea']
const DEFAULTS = { foreground: '#ffffff', background: '#282c34', palette: GHOSTTY_DEFAULT_PALETTE }

describe('ghosttyEntries', () => {
  test('key = value lines; comments only on their own line; outer quotes dropped', () => {
    expect(ghosttyEntries('# c\n\nfont-family = "Iosevka Term"\n  palette = 0=#aabbcc  \nkeybind=ctrl+a=new_tab\nnoequals\nempty =\n')).toEqual([
      ['font-family', 'Iosevka Term'],
      ['palette', '0=#aabbcc'],
      ['keybind', 'ctrl+a=new_tab'],
      ['empty', ''],
    ])
  })
})

describe('parseGhosttyConfig (+show-config --changes-only=false)', () => {
  test('foreground, background and the first 16 palette entries', () => {
    expect(hex(parseGhosttyConfig(fixture('ghostty-show-config.txt')))).toEqual({
      foreground: '#ebdbb2',
      background: '#282828',
      palette: ['#282828', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#a89984', '#928374', '#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#ebdbb2'],
    })
  })

  test('a light/dark pair is resolved to the light theme by the CLI, so dark gets nothing', () => {
    const out = 'theme = light:Builtin Light,dark:Builtin Dark\nforeground = #000000\nbackground = #ffffff\n'
    expect(hex(parseGhosttyConfig(out, 'light'))).toMatchObject({ foreground: '#000000' })
    expect(hex(parseGhosttyConfig(out))).toMatchObject({ foreground: '#000000' })
    expect(parseGhosttyConfig(out, 'dark')).toBeUndefined()
    expect(parseGhosttyConfig('theme = light:A,dark:A\nforeground = #000000\n', 'dark')).toBeDefined()
  })

  test('without colour lines (an error, an empty pipe) nothing', () => {
    expect(parseGhosttyConfig('')).toBeUndefined()
    expect(parseGhosttyConfig('error: unknown field: changes-only\n')).toBeUndefined()
  })

  test('missing keys fall back to Ghostty defaults; X11 names and bare hex parse', () => {
    expect(hex(parseGhosttyConfig('foreground = cdcdcd\n'))).toEqual({ ...DEFAULTS, foreground: '#cdcdcd' })
    expect(hex(parseGhosttyConfig('background = white\npalette = 0x1 = #123\n'))).toEqual({ ...DEFAULTS, background: '#ffffff', palette: ['#1d1f21', '#112233', ...GHOSTTY_DEFAULT_PALETTE.slice(2)] })
  })
})

describe('colorProbes for ghostty', () => {
  test('GHOSTTY_BIN_DIR first, then PATH, then the macOS app', () => {
    const ghostty = detectTerminal({ TERM_PROGRAM: 'ghostty' })
    const probes = colorProbes(ghostty, { env: { GHOSTTY_BIN_DIR: '/opt/ghostty/bin/' } })
    expect(probes.map(p => p.argv)).toEqual([
      ['/opt/ghostty/bin/ghostty', '+show-config', '--changes-only=false'],
      ['ghostty', '+show-config', '--changes-only=false'],
      ['/Applications/Ghostty.app/Contents/MacOS/ghostty', '+show-config', '--changes-only=false'],
    ])
    expect(probes[0]!.parse(fixture('ghostty-show-config.txt'))).toBeDefined()
  })
})

describe('readGhosttyColors', () => {
  const env = { HOME: '/h' }

  test('no config: Ghostty defaults', async () => {
    expect(hex(await readGhosttyColors(memFs({}), { env }))).toEqual(DEFAULTS)
  })

  test('config then config.ghostty; XDG_CONFIG_HOME; macOS Application Support after', async () => {
    const files = {
      '/x/ghostty/config': 'foreground = #111111\nbackground = #111111\n',
      '/x/ghostty/config.ghostty': 'foreground = #222222\n',
      '/h/Library/Application Support/com.mitchellh.ghostty/config.ghostty': 'background = #333333\n',
    }
    expect(hex(await readGhosttyColors(memFs(files), { env: { ...env, XDG_CONFIG_HOME: '/x' }, platform: 'darwin' }))).toMatchObject({ foreground: '#222222', background: '#333333' })
    expect(hex(await readGhosttyColors(memFs(files), { env: { ...env, XDG_CONFIG_HOME: '/x' }, platform: 'linux' }))).toMatchObject({ foreground: '#222222', background: '#111111' })
  })

  test('config-file includes load after the whole file, relative to it, optional with ?', async () => {
    const files = {
      '/h/.config/ghostty/config': 'config-file = colors/main\nconfig-file = ?missing\nforeground = #111111\nbackground = #111111\n',
      '/h/.config/ghostty/colors/main': 'foreground = #aaaaaa\nconfig-file = ../more\n',
      '/h/.config/ghostty/more': 'palette = 4=#0000ff\nconfig-file = colors/main\n',
    }
    const colors = hex(await readGhosttyColors(memFs(files), { env }))!
    expect(colors.foreground).toBe('#aaaaaa')
    expect(colors.background).toBe('#111111')
    expect(colors.palette[4]).toBe('#0000ff')
  })

  test('a theme from the user themes dir, under the user\'s own colours', async () => {
    const files = {
      '/h/.config/ghostty/config': 'background = #010101\ntheme = Mine\n',
      '/h/.config/ghostty/themes/Mine': 'background = #fafafa\nforeground = #0a0a0a\npalette = 0=#000000\n',
    }
    expect(hex(await readGhosttyColors(memFs(files), { env }))).toEqual({ foreground: '#0a0a0a', background: '#010101', palette: ['#000000', ...GHOSTTY_DEFAULT_PALETTE.slice(1)] })
  })

  test('a bundled theme from GHOSTTY_RESOURCES_DIR, and light/dark pairs by scheme', async () => {
    const files = {
      '/h/.config/ghostty/config.ghostty': 'theme = light:Day,dark:Night\n',
      '/usr/share/ghostty/themes/Day': 'foreground = #000000\nbackground = #ffffff\n',
      '/usr/share/ghostty/themes/Night': 'foreground = #eeeeee\nbackground = #111111\n',
    }
    const options = { env: { ...env, GHOSTTY_RESOURCES_DIR: '/usr/share/ghostty' } }
    expect(hex(await readGhosttyColors(memFs(files), options))).toMatchObject({ foreground: '#000000' })
    expect(hex(await readGhosttyColors(memFs(files), { ...options, scheme: 'light' }))).toMatchObject({ foreground: '#000000' })
    expect(hex(await readGhosttyColors(memFs(files), { ...options, scheme: 'dark' }))).toMatchObject({ foreground: '#eeeeee', background: '#111111' })
  })

  test('an absolute theme path; an empty value resets to the default', async () => {
    const files = {
      '/h/.config/ghostty/config': 'theme = ~/my-theme\nforeground = #123456\nforeground =\n',
      '/h/my-theme': 'background = #654321\n',
    }
    expect(hex(await readGhosttyColors(memFs(files), { env }))).toMatchObject({ foreground: '#ffffff', background: '#654321' })
  })

  test('dispatched by readTerminalColors for Ghostty only', async () => {
    const files = { '/h/.config/ghostty/config': 'foreground = #123456\n' }
    expect(hex(await readTerminalColors(detectTerminal({ TERM: 'xterm-ghostty' }), memFs(files), { env }))).toMatchObject({ foreground: '#123456' })
    expect(await readTerminalColors(detectTerminal({ TERM: 'xterm-ghostty', SSH_TTY: '/dev/pts/1' }), memFs(files), { env })).toBeUndefined()
    expect(await readTerminalColors(detectTerminal({ TERM_PROGRAM: 'WezTerm' }), memFs(files), { env })).toBeUndefined()
  })
})

describe('alpha-blending and the cell adjustments', () => {
  test('Ghostty 1.3.1 on Linux, theme Gruvbox Light: linear-corrected by default, no adjustments', () => {
    // Captured on this machine: `ghostty +show-config --changes-only=false` with a config of one line, theme = Gruvbox Light.
    const colors = parseGhosttyConfig(fixture('ghostty-1.3.1-show-config.txt'))
    expect(hex(colors)).toMatchObject({ foreground: '#3c3836', background: '#fbf1c7' })
    expect(colors?.alphaBlending).toBe('linear-corrected')
    expect(colors?.cellAdjust).toBeUndefined()
  })

  test('show-config prints the adjustments as Ghostty formats them', () => {
    // Printed by Ghostty 1.3.1 for adjust-cell-width = 20%, adjust-cell-height = -2, adjust-font-baseline = 10%.
    const out = 'foreground = #000000\nalpha-blending = native\nadjust-cell-width = 19.999999999999996%\nadjust-cell-height = -2\nadjust-font-baseline = 10.000000000000009%\n'
    const colors = parseGhosttyConfig(out)
    expect(colors?.alphaBlending).toBe('native')
    expect(colors?.cellAdjust?.width).toEqual({ factor: expect.closeTo(1.2, 12) })
    expect(colors?.cellAdjust?.height).toEqual({ px: -2 })
    expect(colors?.cellAdjust?.baseline).toEqual({ factor: expect.closeTo(1.1, 12) })
  })

  test('parseMetricAdjust: percent as a factor (never below 0), integers as pixels, anything else unset', () => {
    expect(parseMetricAdjust('20%')).toEqual({ factor: 1.2 })
    expect(parseMetricAdjust('-25%')).toEqual({ factor: 0.75 })
    expect(parseMetricAdjust('-150%')).toEqual({ factor: 0 })
    expect(parseMetricAdjust('3')).toEqual({ px: 3 })
    expect(parseMetricAdjust('-2')).toEqual({ px: -2 })
    for (const bad of ['', '%', '1.5', 'abc', '2px']) expect(parseMetricAdjust(bad)).toBeUndefined()
  })

  test('config files: alpha-blending as set, else the platform default once the platform is known', async () => {
    const env = { HOME: '/h' }
    const set = { '/h/.config/ghostty/config': 'alpha-blending = linear\nadjust-cell-width = 10%\n' }
    expect((await readGhosttyColors(memFs(set), { env }))?.alphaBlending).toBe('linear')
    expect((await readGhosttyColors(memFs(set), { env }))?.cellAdjust).toEqual({ width: { factor: 1.1 } })
    expect((await readGhosttyColors(memFs({}), { env, platform: 'linux' }))?.alphaBlending).toBe('linear-corrected')
    expect((await readGhosttyColors(memFs({}), { env, platform: 'darwin' }))?.alphaBlending).toBe('native')
    expect((await readGhosttyColors(memFs({}), { env }))?.alphaBlending).toBeUndefined()
    const reset = { '/h/.config/ghostty/config': 'adjust-cell-width = 10%\nadjust-cell-width =\n' }
    expect((await readGhosttyColors(memFs(reset), { env }))?.cellAdjust).toBeUndefined()
  })

  test('imageInkBackground: the background in Ghostty with linear-corrected blending only', () => {
    const background = { r: 0xfb, g: 0xf1, b: 0xc7 }
    expect(imageInkBackground('ghostty', { background, alphaBlending: 'linear-corrected' })).toEqual(background)
    expect(imageInkBackground('ghostty', { background, alphaBlending: 'native' })).toBeUndefined()
    expect(imageInkBackground('ghostty', { background, alphaBlending: 'linear' })).toBeUndefined()
    expect(imageInkBackground('ghostty', { background })).toBeUndefined()
    expect(imageInkBackground('ghostty', undefined)).toBeUndefined()
    expect(imageInkBackground('kitty', { background, alphaBlending: 'linear-corrected' })).toBeUndefined()
  })
})
