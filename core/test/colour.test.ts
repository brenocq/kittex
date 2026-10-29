// Coloured math (\color, \textcolor, \colorbox) drawn in its colours, each
// kept legible on the terminal's background.
import { beforeAll, describe, expect, test } from 'vitest'
import { emPxForCell, init, previewDisplay, previewInline, renderDisplay, renderInline } from '../src/index.js'
import { decodeImage } from '../src/image/index.js'
import type { RGB } from '../src/types.js'

const cell = { cellWidth: 13, cellHeight: 26 }
const dark = { ...cell, maxColumns: 100, emPx: emPxForCell(cell), ink: { r: 235, g: 219, b: 178 }, background: { r: 40, g: 40, b: 40 } }
const light = { ...dark, ink: { r: 60, g: 56, b: 54 }, background: { r: 251, g: 241, b: 199 } }

beforeAll(() => init())

/** WCAG 2 contrast ratio. */
function contrast(a: RGB, b: RGB): number {
  const lum = (c: RGB) => {
    const lin = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** The image's fully opaque colours, most pixels first. */
function solids(png: Uint8Array): RGB[] {
  const { rgba } = decodeImage(png)
  const count = new Map<number, number>()
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] !== 255) continue
    const key = (rgba[i]! << 16) | (rgba[i + 1]! << 8) | rgba[i + 2]!
    count.set(key, (count.get(key) ?? 0) + 1)
  }
  return [...count].sort((a, b) => b[1] - a[1]).map(([k]) => ({ r: k >> 16, g: (k >> 8) & 255, b: k & 255 }))
}

const only = (png: Uint8Array): RGB => {
  const colours = solids(png)
  expect(colours).toHaveLength(1)
  return colours[0]!
}

describe('glyph colours', () => {
  test('a red glyph comes out red on a dark and on a light background', () => {
    for (const env of [dark, light]) {
      const red = only(renderDisplay(String.raw`\textcolor{red}{x}`, env).png)
      expect(red.r - Math.max(red.g, red.b)).toBeGreaterThan(100)
      expect(contrast(red, env.background)).toBeGreaterThanOrEqual(4.4)
    }
  })

  test('inline math is coloured too', () => {
    const red = only(renderInline(String.raw`\textcolor{red}{x}`, { ...dark, baselinePx: 20 }, 2).png)
    expect(red.r - Math.max(red.g, red.b)).toBeGreaterThan(100)
  })

  test('what is not coloured stays in the terminal ink', () => {
    const colours = solids(renderDisplay(String.raw`{\color{red}x} + y = z`, dark).png)
    expect(colours).toHaveLength(2)
    expect(colours).toContainEqual(dark.ink)
  })

  test('a colour already legible is kept exactly', () => {
    expect(only(renderDisplay(String.raw`\textcolor[RGB]{0,100,0}{x}`, light).png)).toEqual({ r: 0, g: 100, b: 0 })
    expect(only(renderDisplay(String.raw`\textcolor[RGB]{255,200,0}{x}`, dark).png)).toEqual({ r: 255, g: 200, b: 0 })
  })

  test('black on a dark theme and white on a light one are moved until they read', () => {
    const gray = (c: RGB) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) <= 2
    const black = only(renderDisplay(String.raw`\textcolor{black}{x}`, dark).png)
    expect(contrast(black, dark.background)).toBeGreaterThanOrEqual(4.4)
    expect(gray(black)).toBe(true)
    const white = only(renderDisplay(String.raw`\textcolor{white}{x}`, light).png)
    expect(contrast(white, light.background)).toBeGreaterThanOrEqual(4.4)
    expect(gray(white)).toBe(true)
  })

  test('a low-contrast colour keeps its hue when it is moved', () => {
    const blue = only(renderDisplay(String.raw`\textcolor{blue}{x}`, dark).png)
    expect(contrast(blue, dark.background)).toBeGreaterThanOrEqual(4.4)
    expect(blue.b - Math.max(blue.r, blue.g)).toBeGreaterThan(40)
  })

  test("on a low-contrast theme a colour needs only the theme's own text contrast", () => {
    const dim = { ...dark, ink: { r: 170, g: 150, b: 120 }, background: { r: 90, g: 90, b: 90 } }
    const floor = contrast(dim.ink, dim.background)
    const near = only(renderDisplay(String.raw`\textcolor[RGB]{100,100,100}{x}`, dim).png)
    expect(near).not.toEqual(dim.ink)
    expect(contrast(near, dim.background)).toBeGreaterThanOrEqual(floor - 0.1)
    expect(contrast(near, dim.background)).toBeLessThan(floor + 0.5)
  })

  test('a coloured formula follows the theme it is drawn for (the cache keys on it)', () => {
    const tex = String.raw`\textcolor{blue}{x}`
    const onDark = only(renderDisplay(tex, dark).png)
    const onLight = only(renderDisplay(tex, light).png)
    expect(onDark).not.toEqual(onLight)
    expect(contrast(onLight, light.background)).toBeGreaterThanOrEqual(4.4)
    // The same ink on another background.
    const onBlack = only(renderDisplay(tex, { ...dark, background: { r: 0, g: 0, b: 0 } }).png)
    expect(onBlack).not.toEqual(onDark)
    expect(only(renderDisplay(tex, dark).png)).toEqual(onDark)
  })
})

describe('\\colorbox', () => {
  test('the box is drawn and its content reads on it', () => {
    for (const env of [dark, light]) {
      for (const tex of [String.raw`\colorbox{yellow}{x}`, String.raw`\colorbox{black}{x}`, String.raw`\colorbox{yellow}{\textcolor{yellow}{x}}`]) {
        const [box, glyph] = solids(renderDisplay(tex, env).png)
        expect(box, tex).toBeDefined()
        expect(glyph, tex).toBeDefined()
        expect(contrast(glyph!, box!), tex).toBeGreaterThanOrEqual(4.4)
      }
    }
  })

  test('a pale box becomes a dark tint of its hue on a dark theme', () => {
    const [box] = solids(renderDisplay(String.raw`\colorbox{yellow}{x}`, dark).png)
    expect(contrast(box!, dark.background)).toBeLessThan(3)
    expect(Math.min(box!.r, box!.g) - box!.b).toBeGreaterThan(10)
  })
})

describe('Unicode previews', () => {
  test('show what is coloured in the plain text colour, never the colour commands', () => {
    expect(previewDisplay(String.raw`\textcolor{red}{x} + {\color{blue}y}`, { maxColumns: 40 })).toEqual(['x + y'])
    expect(previewInline(String.raw`\colorbox{yellow}{z} + \fcolorbox{red}{blue}{q}`, 40)).toBe('z+q')
  })
})

describe('uncoloured formulas', () => {
  test('stay one-ink palette images whatever the background', () => {
    const tex = String.raw`e^{i\pi} + 1 = 0`
    const plain = renderDisplay(tex, { ...dark, background: { r: 0, g: 0, b: 0 } }).png
    const other = renderDisplay(tex, dark).png
    expect(other).toEqual(plain)
    expect(only(plain)).toEqual(dark.ink)
  })
})
