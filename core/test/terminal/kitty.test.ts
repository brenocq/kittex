import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'
import { colorProbes, detectTerminal, kittyConfigDirs, parseKittyColors, readKittyColors, readTerminalColors, toHex } from '../../src/terminal/index.js'
import type { TerminalColors } from '../../src/types.js'

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')
const memFs = (files: Record<string, string>) => async (path: string) => files[path]
const hex = (c: TerminalColors | undefined) => c && { foreground: toHex(c.foreground!), background: toHex(c.background!), palette: c.palette!.map(toHex) }

// Gruvbox Dark, this machine's kitty theme (current-theme.conf from `kitten themes`).
const GRUVBOX = {
  foreground: '#ebdbb2',
  background: '#282828',
  palette: ['#3c3836', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#a89984', '#928374', '#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#fbf1c7'],
}
const KITTY_DEFAULT_PALETTE = ['#000000', '#cc0403', '#19cb00', '#cecb00', '#0d73cc', '#cb1ed1', '#0dcdcd', '#dddddd', '#767676', '#f2201f', '#23fd00', '#fffd00', '#1a8fff', '#fd28ff', '#14ffff', '#ffffff']

describe('parseKittyColors', () => {
  test('the kitty +runpy probe output captured on this machine', () => {
    expect(hex(parseKittyColors(fixture('kitty-runpy-gruvbox.txt')))).toEqual(GRUVBOX)
  })

  test('automatic light/dark themes follow the scheme', () => {
    // KITTY_CONFIG_DIRECTORY with kitty.conf (foreground #112233, include theme.conf with background
    // #445566) and light-theme.auto.conf (#000000 on #ffffff, color0 #010203), captured from kitty 0.49.1.
    const out = fixture('kitty-runpy-auto-light.txt')
    expect(hex(parseKittyColors(out))).toMatchObject({ foreground: '#112233', background: '#445566' })
    expect(hex(parseKittyColors(out, 'dark'))).toMatchObject({ foreground: '#112233', background: '#445566' })
    const light = hex(parseKittyColors(out, 'light'))!
    expect(light).toMatchObject({ foreground: '#000000', background: '#ffffff' })
    expect(light.palette).toEqual(['#010203', ...KITTY_DEFAULT_PALETTE.slice(1)])
  })

  test('kitten @ get-colors output has the same shape', () => {
    const out = 'active_border_color #00ff00\nbackground  #fdf6e3\ncolor0 #073642\nforeground  #657b83\nselection_background #eee8d5\n'
    expect(hex(parseKittyColors(out))).toMatchObject({ foreground: '#657b83', background: '#fdf6e3', palette: ['#073642', ...KITTY_DEFAULT_PALETTE.slice(1)] })
  })

  test('nothing useful is undefined', () => {
    expect(parseKittyColors('')).toBeUndefined()
    expect(parseKittyColors('Traceback (most recent call last):\n  File "<string>", line 1\n')).toBeUndefined()
    expect(parseKittyColors('color1 #ff0000\n')).toBeUndefined()
  })
})

describe('readKittyColors', () => {
  const env = { HOME: '/home/u' }
  const real = { '/home/u/.config/kitty/kitty.conf': fixture('kitty-config/kitty.conf'), '/home/u/.config/kitty/current-theme.conf': fixture('kitty-config/current-theme.conf') }

  test('this machine\'s kitty.conf and its included current-theme.conf', async () => {
    expect(hex(await readKittyColors(memFs(real), { env }))).toEqual(GRUVBOX)
  })

  test('no config file: undefined', async () => {
    expect(await readKittyColors(memFs({}), { env })).toBeUndefined()
  })

  test('a config without colours gives kitty\'s defaults', async () => {
    expect(hex(await readKittyColors(memFs({ '/home/u/.config/kitty/kitty.conf': 'font_size 11\n' }), { env }))).toEqual({ foreground: '#dddddd', background: '#000000', palette: KITTY_DEFAULT_PALETTE })
  })

  test('later lines win, includes are inlined where they appear, relative to the including file', async () => {
    const files = {
      '/home/u/.config/kitty/kitty.conf': 'foreground #111111\ninclude themes/a.conf\nbackground #222222\ninclude ~/b.conf\ninclude ${MY_DIR}/c.conf\n',
      '/home/u/.config/kitty/themes/a.conf': 'foreground #aaaaaa\nbackground #aaaaaa\ninclude sub.conf\n',
      '/home/u/.config/kitty/themes/sub.conf': 'color1 #abcdef\n',
      '/home/u/b.conf': 'color2   rgb:ff/80/00\n',
      '/opt/c.conf': 'color3 #fff\ninclude /opt/c.conf\n',
    }
    const colors = hex(await readKittyColors(memFs(files), { env: { ...env, MY_DIR: '/opt' } }))!
    expect(colors.foreground).toBe('#aaaaaa')
    expect(colors.background).toBe('#222222')
    expect(colors.palette.slice(1, 4)).toEqual(['#abcdef', '#ff8000', '#ffffff'])
  })

  test('envinclude reads config from environment variables', async () => {
    const files = { '/home/u/.config/kitty/kitty.conf': 'envinclude KITTY_CONF_*\n' }
    const colors = await readKittyColors(memFs(files), { env: { ...env, KITTY_CONF_COLORS: 'foreground #123456' } })
    expect(toHex(colors!.foreground!)).toBe('#123456')
  })

  test('config directories: KITTY_CONFIG_DIRECTORY alone, else XDG, ~/.config, macOS Preferences, XDG_CONFIG_DIRS', async () => {
    expect(kittyConfigDirs({ HOME: '/h', KITTY_CONFIG_DIRECTORY: '/k' })).toEqual(['/k'])
    expect(kittyConfigDirs({ HOME: '/h', XDG_CONFIG_HOME: '/x' }, 'linux')).toEqual(['/x/kitty', '/h/.config/kitty', '/etc/xdg/kitty'])
    expect(kittyConfigDirs({ HOME: '/h' }, 'darwin')).toEqual(['/h/.config/kitty', '/h/Library/Preferences/kitty', '/etc/xdg/kitty'])
    const files = { '/h/Library/Preferences/kitty/kitty.conf': 'foreground #010101\n' }
    expect(toHex((await readKittyColors(memFs(files), { env: { HOME: '/h' }, platform: 'darwin' }))!.foreground!)).toBe('#010101')
    expect(await readKittyColors(memFs(files), { env: { HOME: '/h' }, platform: 'linux' })).toBeUndefined()
  })

  test('automatic themes next to kitty.conf replace the colours for their scheme', async () => {
    const files = {
      ...real,
      '/home/u/.config/kitty/light-theme.auto.conf': 'foreground #000000\nbackground #ffffff\n',
    }
    expect(hex(await readKittyColors(memFs(files), { env, scheme: 'light' }))).toEqual({ foreground: '#000000', background: '#ffffff', palette: KITTY_DEFAULT_PALETTE })
    expect(hex(await readKittyColors(memFs(files), { env, scheme: 'dark' }))).toEqual(GRUVBOX)
    expect(hex(await readKittyColors(memFs(files), { env }))).toEqual(GRUVBOX)
  })

  test('a reader that throws counts as a missing file', async () => {
    const read = async () => {
      throw new Error('EACCES')
    }
    expect(await readKittyColors(read, { env })).toBeUndefined()
  })
})

describe('colorProbes for kitty', () => {
  const kitty = detectTerminal({ TERM: 'xterm-kitty', KITTY_INSTALLATION_DIR: '/usr/lib/kitty' })

  test('kitty +runpy on PATH, then the launcher and the macOS bundle', () => {
    const probes = colorProbes(kitty, { env: { KITTY_INSTALLATION_DIR: '/usr/lib/kitty' } })
    expect(probes.map(p => p.argv[0])).toEqual(['kitty', '/usr/lib/kitty/kitty/launcher/kitty', '/Applications/kitty.app/Contents/MacOS/kitty'])
    for (const p of probes) expect(p.argv[1]).toBe('+runpy')
  })

  test('none over ssh, none for terminals without a config to read', () => {
    expect(colorProbes({ ...kitty, ssh: true })).toEqual([])
    expect(colorProbes(detectTerminal({ TERM_PROGRAM: 'WezTerm' }))).toEqual([])
    expect(colorProbes(detectTerminal({ TERM_PROGRAM: 'iTerm.app' }))).toEqual([])
  })

  // The probe for real, compared with reading the same config files directly.
  const probe = colorProbes(kitty)[0]!
  const result = spawnSync(probe.argv[0]!, probe.argv.slice(1), { encoding: 'utf8', timeout: 20_000, stdio: ['ignore', 'pipe', 'pipe'] })
  test.skipIf(result.error !== undefined || result.status !== 0)('the probe agrees with readKittyColors on this machine', async () => {
    const fromProbe = probe.parse(result.stdout)
    expect(fromProbe).toBeDefined()
    const read = (path: string) => readFile(path, 'utf8').catch(() => undefined)
    expect(await readTerminalColors(kitty, read, { env: process.env, platform: process.platform })).toEqual(fromProbe)
  })
})
