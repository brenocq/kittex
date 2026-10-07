import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { adaptColor, assumedBackground, readSvg, SvgError, texPicture, XmlError } from '../../src/diagram/index.ts'
import { parseXml } from '../../src/diagram/xml.ts'
import type { Picture, PictureOp } from '../../src/types.ts'

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}.svg`, import.meta.url), 'utf8')
const doc = (body: string, viewBox = '0 0 100 50') => `<?xml version='1.0'?>\n<!-- comment -->\n<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='${viewBox}'>${body}</svg>`
const read = (body: string, viewBox?: string): Picture => readSvg(doc(body, viewBox), { baseline: 'bottom', emPerUnit: 0.1 })

describe('xml', () => {
  test('elements, attributes, entities; markup skipped', () => {
    const root = parseXml(`<?xml version="1.0"?><!DOCTYPE svg><a x="1 &amp; 2" y='&#65;&#x42;'><!-- c --><![CDATA[ <x> ]]><b/>text<c k="v"></c></a>`)
    expect(root.name).toBe('a')
    expect(root.attrs).toEqual({ x: '1 & 2', y: 'AB' })
    expect(root.children.map(child => child.name)).toEqual(['b', 'c'])
  })

  test('malformed input throws', () => {
    for (const bad of ['', '<a>', '<a></b>', '<a x=1/>', '<a x="1/>', 'text']) expect(() => parseXml(bad), bad).toThrow(XmlError)
  })

  test('nesting is bounded', () => {
    expect(() => parseXml('<g>'.repeat(1000) + '</g>'.repeat(1000))).toThrow(XmlError)
  })
})

describe('reading dvisvgm SVG', () => {
  test('a TikZ figure: strokes, fills and glyphs, in em with the baseline at the bottom', () => {
    const picture = texPicture(fixture('tikz'), { baseline: 'bottom', fontSize: 10 })
    expect(picture.depth).toBe(0)
    // 88.27 by 50.09 big points, at 10 TeX points to the em.
    expect(picture.width).toBeCloseTo((88.268174 * 72.27) / 72 / 10, 4)
    expect(picture.height).toBeCloseTo((50.094237 * 72.27) / 72 / 10, 4)
    const kinds = picture.ops.map(op => `${op.type}${op.type === 'fill' && op.glyph ? '-glyph' : ''}`)
    expect(kinds).toContain('stroke')
    expect(kinds.filter(kind => kind === 'fill-glyph')).toHaveLength(2)
    const red = picture.ops.filter(op => op.paint.color.r === 255 && op.paint.color.g === 0)
    expect(red.length).toBeGreaterThanOrEqual(3)
    const pale = picture.ops.find(op => op.type === 'fill' && op.paint.color.b === 255 && op.paint.color.r === 204)
    expect(pale).toBeDefined()
  })

  test('a pgfplots plot: its plot lines clipped to the axis', () => {
    const picture = texPicture(fixture('plot'), { baseline: 'bottom', fontSize: 10 })
    expect(picture.clips).toHaveLength(1)
    const clipped = picture.ops.filter(op => op.clip === 0)
    expect(clipped.map(op => op.paint.color)).toEqual(expect.arrayContaining([{ r: 0, g: 0, b: 255 }, { r: 255, g: 0, b: 0 }]))
  })

  test('every fixture reads', () => {
    for (const name of ['tikz', 'plot', 'chem', 'circ', 'cd', 'si']) {
      const picture = texPicture(fixture(name), { baseline: 'bottom', fontSize: 10 })
      expect(picture.ops.length, name).toBeGreaterThan(0)
      for (const op of picture.ops) expect(op.transform.every(Number.isFinite), name).toBe(true)
    }
  })

  test('preview mode: the baseline at the origin, depth below it', () => {
    const picture = readSvg(doc('<path d="M0 -8H10V2H0Z"/>', '0 -8 10 10'), { baseline: 'origin', emPerUnit: 0.1 })
    expect(picture.height).toBeCloseTo(0.8)
    expect(picture.depth).toBeCloseTo(0.2)
    expect(picture.ops[0]!.transform).toEqual([0.1, 0, 0, 0.1, 0, 0])
  })

  test('shapes become paths; lines are never filled', () => {
    const picture = read(`<rect x='1' y='2' width='3' height='4'/><circle cx='5' cy='5' r='2'/><ellipse cx='1' cy='1' rx='1' ry='2'/><line x1='0' y1='0' x2='5' y2='5' stroke='#000'/><polyline points='0,0 1,1 2,0' fill='none' stroke='red'/><polygon points='0 0 1 1 2 0'/>`)
    const types = picture.ops.map(op => op.type)
    expect(types).toEqual(['fill', 'fill', 'fill', 'stroke', 'stroke', 'fill'])
    expect(picture.ops[0]!.d).toBe('M1 2H4V6H1Z')
  })

  test('styles inherit, a style attribute wins, opacity multiplies', () => {
    const picture = read(`<g fill='#f00' opacity='0.5' stroke='blue' stroke-width='2'><g style='fill: #0f0; stroke-dasharray: 1 2'><path d='M0 0H1V1Z' fill-opacity='0.5' stroke-linecap='round'/></g></g>`)
    const [fill, stroke] = picture.ops as [Extract<PictureOp, { type: 'fill' }>, Extract<PictureOp, { type: 'stroke' }>]
    expect(fill.paint).toEqual({ color: { r: 0, g: 255, b: 0 }, opacity: 0.25 })
    expect(stroke.paint).toEqual({ color: { r: 0, g: 0, b: 255 }, opacity: 0.5 })
    expect(stroke.style).toMatchObject({ width: 2, cap: 'round', dash: [1, 2] })
  })

  test('transforms compose, outermost first', () => {
    const picture = read(`<g transform='translate(10,0)'><path transform='scale(2)' d='M0 0H1V1Z'/></g>`)
    // em: 0.1 per unit, the bottom of the 50-unit-high box as the baseline.
    expect(picture.ops[0]!.transform).toEqual([0.2, 0, 0, 0.2, 1, -5])
  })

  test('use draws its target with its own position; cycles are refused', () => {
    const picture = read(`<defs><path id='g0-1' d='M0 0H1V1Z'/></defs><use x='3' y='4' xlink:href='#g0-1' fill='#00f'/>`)
    expect(picture.ops).toHaveLength(1)
    expect(picture.ops[0]).toMatchObject({ glyph: true, paint: { color: { r: 0, g: 0, b: 255 } } })
    expect(() => read(`<use id='a' xlink:href='#b'/><use id='b' xlink:href='#a'/>`)).toThrow(SvgError)
  })

  test('gradients paint their mean colour, patterns a light tint', () => {
    const picture = read(`<defs><linearGradient id='g'><stop offset='0' stop-color='#000'/><stop offset='1' stop-color='#fff'/></linearGradient><pattern id='p'><path d='M0 0L1 1' stroke='#f00'/></pattern></defs><path d='M0 0H1V1Z' fill='url(#g)'/><path d='M0 0H1V1Z' fill='url(#p)'/>`)
    expect(picture.ops[0]!.paint.color).toEqual({ r: 128, g: 128, b: 128 })
    expect(picture.ops[1]!.paint).toEqual({ color: { r: 255, g: 0, b: 0 }, opacity: 0.35 })
  })

  test('what can not be drawn refuses the picture', () => {
    for (const body of [`<text>hi</text>`, `<image href='x.png' width='1' height='1'/>`, `<g mask='url(#m)'><path d='M0 0H1V1Z'/></g>`, `<svg/>`]) {
      expect(() => read(body), body).toThrow(SvgError)
    }
    expect(() => readSvg('<svg/>', { baseline: 'bottom', emPerUnit: 1 })).toThrow(SvgError)
    expect(() => read(`<path transform='rotate(oops)' d='M0 0H1V1Z'/>`)).toThrow(SvgError)
  })

  test('hidden elements draw nothing', () => {
    expect(read(`<g display='none'><path d='M0 0H1V1Z'/></g><path d='M0 0H1V1Z' fill='none'/>`).ops).toHaveLength(0)
  })
})

describe('colours on the terminal', () => {
  const dark = { ink: { r: 220, g: 220, b: 220 }, background: { r: 30, g: 30, b: 30 } }
  const light = { ink: { r: 20, g: 20, b: 20 }, background: { r: 255, g: 255, b: 255 } }
  const lightness = (c: { r: number; g: number; b: number }) => (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255

  test("TeX's black is the ink, its white the background", () => {
    expect(adaptColor({ r: 0, g: 0, b: 0 }, dark, true)).toEqual(dark.ink)
    expect(adaptColor({ r: 255, g: 255, b: 255 }, dark, false)).toBe('erase')
    expect(adaptColor({ r: 1, g: 1, b: 1 }, light, true)).toEqual(light.ink)
  })

  test('on a light theme colours stay about as they are', () => {
    for (const color of [{ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }, { r: 204, g: 204, b: 255 }, { r: 128, g: 128, b: 128 }]) {
      const out = adaptColor(color, light, false) as { r: number; g: number; b: number }
      expect(Math.abs(lightness(out) - lightness(color)), JSON.stringify(color)).toBeLessThan(0.12)
    }
  })

  test('on a dark theme a pale fill turns into a dark tint of its hue', () => {
    const out = adaptColor({ r: 204, g: 204, b: 255 }, dark, false) as { r: number; g: number; b: number }
    expect(lightness(out)).toBeLessThan(0.35)
    expect(out.b).toBeGreaterThan(out.r)
  })

  test('saturated mid-tones keep their colour; dark ones are lightened', () => {
    const red = adaptColor({ r: 255, g: 0, b: 0 }, dark, true) as { r: number; g: number; b: number }
    expect(red.r).toBeGreaterThan(200)
    expect(red.g).toBeLessThan(80)
    const navy = adaptColor({ r: 0, g: 0, b: 128 }, dark, true) as { r: number; g: number; b: number }
    expect(lightness(navy)).toBeGreaterThan(0.4)
  })

  test('a line never comes too close to the background', () => {
    const yellow = adaptColor({ r: 255, g: 255, b: 0 }, light, true) as { r: number; g: number; b: number }
    expect(lightness(yellow)).toBeLessThan(0.8)
  })

  test('the background assumed is opposite the ink', () => {
    expect(assumedBackground({ r: 230, g: 230, b: 230 }).r).toBeLessThan(60)
    expect(assumedBackground({ r: 20, g: 20, b: 20 }).r).toBe(255)
  })
})
