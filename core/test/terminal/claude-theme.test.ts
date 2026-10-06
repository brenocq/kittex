import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  CLAUDE_THEME_TEXT,
  chooseInk,
  claudeCustomThemePath,
  claudeThemeInk,
  claudeThemeScheme,
  parseClaudeColor,
  parseClaudeCustomTheme,
  parseKittyColors,
  resolveClaudeTheme,
  toHex,
} from '../../src/terminal/index.js'
import type { RGB, TerminalColors } from '../../src/types.js'

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')
const ink = (c: RGB | undefined) => c && toHex(c)

// This machine: kitty with Gruvbox Dark (foreground #ebdbb2, color0 #3c3836, color15 #fbf1c7).
const gruvbox = parseKittyColors(fixture('kitty-runpy-gruvbox.txt'))!
const solarizedLight: TerminalColors = { foreground: { r: 0x65, g: 0x7b, b: 0x83 }, background: { r: 0xfd, g: 0xf6, b: 0xe3 } }

describe('claudeThemeInk', () => {
  // The `text` token of each built-in theme in Claude Code 2.1.290.
  test.each([
    ['dark', '#ffffff'],
    ['light', '#000000'],
    ['dark-daltonized', '#ffffff'],
    ['light-daltonized', '#000000'],
    ['dark-ansi', '#fbf1c7'], // ansi:whiteBright = color15
    ['light-ansi', '#3c3836'], // ansi:black = color0
    ['auto', '#ffffff'], // dark background -> dark
    [undefined, '#ffffff'], // Claude Code's default is dark
    ['no-such-theme', '#ffffff'],
  ])('%s', (theme, expected) => {
    expect(ink(claudeThemeInk(theme, undefined, gruvbox))).toBe(expected)
  })

  test('the table matches the theme values', () => {
    expect(CLAUDE_THEME_TEXT).toEqual({
      dark: 'rgb(255,255,255)',
      light: 'rgb(0,0,0)',
      'dark-daltonized': 'rgb(255,255,255)',
      'light-daltonized': 'rgb(0,0,0)',
      'dark-ansi': 'ansi:whiteBright',
      'light-ansi': 'ansi:black',
    })
  })

  test('ANSI themes need the terminal palette', () => {
    expect(claudeThemeInk('dark-ansi')).toBeUndefined()
    expect(claudeThemeInk('light-ansi', undefined, { foreground: { r: 1, g: 2, b: 3 } })).toBeUndefined()
  })

  test('auto follows the terminal background, dark when unknown', () => {
    expect(ink(claudeThemeInk('auto', undefined, solarizedLight))).toBe('#000000')
    expect(ink(claudeThemeInk('auto'))).toBe('#ffffff')
    expect(resolveClaudeTheme('auto', undefined, solarizedLight)).toBe('light')
    expect(claudeThemeScheme('auto', undefined, gruvbox)).toBe('dark')
    expect(claudeThemeScheme('light-ansi')).toBe('light')
  })

  test('custom themes: text override, else the base theme\'s text', () => {
    const dracula = '{ "name": "Dracula", "base": "dark", "overrides": { "claude": "#bd93f9", "text": "#f8f8f2" } }'
    expect(ink(claudeThemeInk('custom:dracula', dracula))).toBe('#f8f8f2')
    expect(ink(claudeThemeInk('custom:paper', { base: 'light' }))).toBe('#000000')
    expect(ink(claudeThemeInk('custom:term', { base: 'dark-ansi', overrides: { claude: '#ff0000' } }, gruvbox))).toBe('#fbf1c7')
    expect(ink(claudeThemeInk('custom:x', { overrides: { text: 'ansi:cyan' } }, gruvbox))).toBe('#689d6a')
    // Base defaults to dark; auto is not a valid base; invalid colours are ignored.
    expect(ink(claudeThemeInk('custom:x', { base: 'auto', overrides: { text: 'chartreuse' } }))).toBe('#ffffff')
    // The file wasn't read or isn't JSON: the dark base.
    expect(ink(claudeThemeInk('custom:x'))).toBe('#ffffff')
    expect(ink(claudeThemeInk('custom:x', '{ not json'))).toBe('#ffffff')
    // An override only counts for a custom theme setting.
    expect(ink(claudeThemeInk('light', { overrides: { text: '#123456' } }))).toBe('#000000')
  })
})

describe('parseClaudeColor', () => {
  const palette = gruvbox.palette
  test.each([
    ['rgb(1,2,3)', '#010203'],
    ['rgb( 10, 20, 30 )', '#0a141e'],
    ['rgb(55, 55, 55)', '#373737'],
    ['#AbCdEf', '#abcdef'],
    ['#fa0', '#ffaa00'],
    ['ansi256(16)', '#000000'],
    ['ansi256(196)', '#ff0000'],
    ['ansi256(244)', '#808080'],
    ['ansi256(9)', '#fb4934'],
    ['ansi:redBright', '#fb4934'],
    ['ansi:white', '#a89984'],
    ['ansi:whiteBright', '#fbf1c7'],
  ])('%s', (value, expected) => {
    expect(ink(parseClaudeColor(value, palette))).toBe(expected)
  })

  test.each(['rgb(256,0,0)', 'rgb(1,2)', 'rgb(1,  2,3)', '#abcd', 'abcdef', 'ansi:purple', 'ansi:Red', 'ansi256(256)', 'red', 42, undefined])('rejects %s', value => {
    expect(parseClaudeColor(value, palette)).toBeUndefined()
  })
})

describe('parseClaudeCustomTheme', () => {
  test('validates like Claude Code: base defaults to dark, bad colours dropped', () => {
    expect(parseClaudeCustomTheme('{"name":"N","base":"light-ansi","overrides":{"text":"#123","claude":"nope","error":"ansi256(1)"}}')).toEqual({
      name: 'N',
      base: 'light-ansi',
      overrides: { text: '#123', error: 'ansi256(1)' },
    })
    expect(parseClaudeCustomTheme({})).toEqual({ base: 'dark', overrides: {} })
    expect(parseClaudeCustomTheme('[]')).toBeUndefined()
    expect(parseClaudeCustomTheme(null)).toBeUndefined()
  })

  test('custom:<slug> lives in <config dir>/themes/<slug>.json; plugin themes are elsewhere', () => {
    expect(claudeCustomThemePath('custom:dracula', '/home/u/.claude/')).toBe('/home/u/.claude/themes/dracula.json')
    expect(claudeCustomThemePath('custom:my-plugin:dracula', '/home/u/.claude')).toBeUndefined()
    expect(claudeCustomThemePath('custom:../x', '/home/u/.claude')).toBeUndefined()
    expect(claudeCustomThemePath('dark', '/home/u/.claude')).toBeUndefined()
    expect(claudeCustomThemePath(undefined, '/home/u/.claude')).toBeUndefined()
  })
})

describe('chooseInk', () => {
  const custom = { overrides: { text: '#f8f8f2' } }

  test('by default: explicit themeInk, a custom text override, the terminal foreground, then the theme', () => {
    expect(ink(chooseInk({ theme: 'dark', themeInk: { r: 1, g: 1, b: 1 }, terminal: gruvbox }))).toBe('#010101')
    expect(ink(chooseInk({ theme: 'custom:d', customTheme: custom, terminal: gruvbox }))).toBe('#f8f8f2')
    expect(ink(chooseInk({ theme: 'dark', terminal: gruvbox }))).toBe('#ebdbb2')
    expect(ink(chooseInk({ theme: 'custom:d', customTheme: { base: 'light' }, terminal: gruvbox }))).toBe('#ebdbb2')
    expect(ink(chooseInk({ theme: 'light' }))).toBe('#000000')
    expect(ink(chooseInk({ theme: 'dark-ansi', terminal: { palette: gruvbox.palette } }))).toBe('#fbf1c7')
  })

  test('prefer theme: the theme\'s text colour even over the terminal foreground', () => {
    expect(ink(chooseInk({ theme: 'dark', terminal: gruvbox, prefer: 'theme' }))).toBe('#ffffff')
    expect(ink(chooseInk({ theme: 'auto', terminal: solarizedLight, prefer: 'theme' }))).toBe('#000000')
    expect(ink(chooseInk({ theme: 'dark-ansi', terminal: gruvbox, prefer: 'theme' }))).toBe('#fbf1c7')
    expect(ink(chooseInk({ theme: 'custom:d', customTheme: custom, terminal: gruvbox, prefer: 'theme' }))).toBe('#f8f8f2')
    // An ANSI theme without a palette falls back to the terminal foreground.
    expect(ink(chooseInk({ theme: 'light-ansi', terminal: solarizedLight, prefer: 'theme' }))).toBe('#657b83')
  })

  test('prefer terminal: the terminal foreground over everything', () => {
    expect(ink(chooseInk({ theme: 'custom:d', customTheme: custom, themeInk: { r: 1, g: 1, b: 1 }, terminal: gruvbox, prefer: 'terminal' }))).toBe('#ebdbb2')
    expect(ink(chooseInk({ theme: 'light', prefer: 'terminal' }))).toBe('#000000')
  })

  test('nothing known: a grey for the theme\'s side', () => {
    expect(ink(chooseInk({}))).toBe('#e6e6e6')
    expect(ink(chooseInk({ theme: 'light-ansi' }))).toBe('#222222')
    expect(ink(chooseInk({ theme: 'dark-ansi', prefer: 'theme' }))).toBe('#e6e6e6')
  })
})
