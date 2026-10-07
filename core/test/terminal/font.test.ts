import { describe, expect, test } from 'vitest'
import { fontWeightOf } from '../../src/terminal/font.js'
import { parseGhosttyConfig, parseKittyColors, readKittyColors } from '../../src/terminal/index.js'

// The text font's weight, so the math's strokes can match it (strokeWeight).
describe('fontWeightOf', () => {
  test('weight words in styles and names, the most specific first', () => {
    expect(fontWeightOf(['Medium'])).toBe(500)
    expect(fontWeightOf(['SemiBold'])).toBe(600)
    expect(fontWeightOf(['Semi Bold'])).toBe(600)
    expect(fontWeightOf(['ExtraLight'])).toBe(200)
    expect(fontWeightOf(['RobotoMono-Light'])).toBe(300)
    expect(fontWeightOf(['Bold Italic'])).toBe(700)
    expect(fontWeightOf(['Book'])).toBe(400)
    expect(fontWeightOf(['Fira Code Retina'])).toBe(450)
  })

  test('a variation axis or a number wins; the first name that says a weight counts', () => {
    expect(fontWeightOf(['wght=550', 'Bold'])).toBe(550)
    expect(fontWeightOf(['500'])).toBe(500)
    expect(fontWeightOf([undefined, '', 'Roboto Mono', 'Roboto Mono Medium'])).toBe(500)
  })

  test('a bare family says nothing', () => {
    expect(fontWeightOf(['Roboto Mono'])).toBeUndefined()
    expect(fontWeightOf([])).toBeUndefined()
  })
})

describe('read with the colours', () => {
  test('kitty: the probe prints the font spec as JSON (kitty 0.49.1 on this machine)', () => {
    const out = 'foreground #ebdbb2\nbackground #282828\nfont_spec ["Medium", "Roboto Mono", "family=\\"Roboto Mono\\" style=\\"Medium\\""]\n'
    expect(parseKittyColors(out)?.fontWeight).toBe(500)
    expect(parseKittyColors('foreground #ebdbb2\nfont_spec ["Roboto Mono"]\n')?.fontWeight).toBeUndefined()
    expect(parseKittyColors('foreground #ebdbb2\nfont_spec not json\n')?.fontWeight).toBeUndefined()
  })

  test('kitty config files: font_family as written, new style or bare', async () => {
    const read = (conf: string) => readKittyColors(async path => (path === '/home/u/.config/kitty/kitty.conf' ? conf : undefined), { env: { HOME: '/home/u' } })
    expect((await read('font_family family="Roboto Mono" style="Medium"\n'))?.fontWeight).toBe(500)
    expect((await read('font_family JetBrains Mono Light\n'))?.fontWeight).toBe(300)
    expect((await read('font_family monospace\n'))?.fontWeight).toBeUndefined()
  })

  test('Ghostty: font-variation, then font-style, then font-family; its own Regular when none is set', () => {
    const show = (lines: string) => parseGhosttyConfig(`foreground = #ffffff\nbackground = #000000\n${lines}`)?.fontWeight
    // Ghostty 1.3.1 on this machine: nothing set.
    expect(show('font-family = \nfont-style = default\nfont-variation = \n')).toBe(400)
    expect(show('font-family = JetBrains Mono\nfont-style = Medium\n')).toBe(500)
    expect(show('font-family = Iosevka Term Light\nfont-style = default\n')).toBe(300)
    expect(show('font-family = Iosevka\nfont-family = Symbols Nerd Font Mono Bold\n')).toBeUndefined()
    expect(show('font-family = Iosevka\nfont-variation = wght=600\n')).toBe(600)
  })
})
