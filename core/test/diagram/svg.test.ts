import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { adaptColor, assumedBackground, countNumbers, MAX_PATH_DATA, MAX_PICTURE_NUMBERS, readSvg, SvgError, texPicture, XmlError } from '../../src/diagram/index.ts'
import { parseXml } from '../../src/diagram/xml.ts'
import { rasterizePicture } from '../../src/raster/index.ts'
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

  test('nesting is deep but bounded, with no recursion (a pgfplots surface nests a group per patch)', () => {
    expect(parseXml('<g>'.repeat(5000) + '</g>'.repeat(5000)).children).toHaveLength(1)
    expect(() => parseXml('<g>'.repeat(25_000) + '</g>'.repeat(25_000))).toThrow(XmlError)
  })

  test('a picture thousands of groups deep reads', () => {
    const body = '<g fill="#00f">'.repeat(3000) + '<path d="M0 0H1V1Z"/>' + '</g>'.repeat(3000)
    expect(read(body).ops).toHaveLength(1)
    // A faceted pgfplots surface (shader=faceted interp, 46 samples) nests deeper than a recursive walk's stack.
    const named = Array.from({ length: 15_000 }, (_, i) => `<g id="g${i}" fill="#00f">`).join('') + '<path d="M0 0H1V1Z"/>' + '</g>'.repeat(15_000)
    expect(read(named).ops).toHaveLength(1)
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

  test('a gradient stroke paints its mean colour; a pattern with no tile, a light tint', () => {
    const picture = read(`<defs><linearGradient id='g'><stop offset='0' stop-color='#000'/><stop offset='1' stop-color='#fff'/></linearGradient><pattern id='p'><path d='M0 0L1 1' stroke='#f00'/></pattern></defs><path d='M0 0H1V1Z' fill='none' stroke='url(#g)'/><path d='M0 0H1V1Z' fill='url(#p)'/>`)
    expect(picture.ops[0]!.paint.color).toEqual({ r: 128, g: 128, b: 128 })
    expect(picture.ops[1]!.paint).toEqual({ color: { r: 255, g: 0, b: 0 }, opacity: 0.35 })
  })
})

// TikZ's shadings and patterns as pgfsys-dvisvgm writes them: a shading is a 100.375 bp square (or circle) filled with
// an objectBoundingBox gradient, inside the shaded path's clip; a pattern is a userSpaceOnUse tile of symbol paths.
describe('shadings and patterns', () => {
  const pixel = (picture: Picture, x: number, y: number, cells = { cellWidth: 10, cellHeight: 20 }) => {
    const env = { ...cells, maxColumns: 40, emPx: 40, ink: { r: 0, g: 0, b: 0 }, background: { r: 255, g: 255, b: 255 } }
    const raster = rasterizePicture(picture, { emPx: env.emPx, cellWidth: env.cellWidth, cellHeight: env.cellHeight, maxColumns: env.maxColumns, maxRows: 40, color: c => c })
    const i = (Math.round(y * raster.heightPx) * raster.widthPx + Math.round(x * raster.widthPx)) * 4
    return { r: raster.rgba[i]!, g: raster.rgba[i + 1]!, b: raster.rgba[i + 2]!, a: raster.rgba[i + 3]! }
  }

  test('a linear shading goes from its first colour to its last, inside its shape only', () => {
    // left color=black, right color=white, as TikZ writes it: the middle half of the gradient spans the square.
    const picture = read(
      `<defs><linearGradient id='s'><stop offset='0' stop-color='#000'/><stop offset='0.25' stop-color='#000'/><stop offset='0.75' stop-color='#fff'/><stop offset='1' stop-color='#fff'/></linearGradient></defs>` +
        `<rect x='-25' y='0' width='100' height='50' style='fill:url(#s); stroke:none'/>`,
      '0 0 50 50',
    )
    expect(new Set(picture.ops.map(op => op.paint.color.r)).size).toBeGreaterThan(8)
    expect(new Set(picture.ops.map(op => op.clip))).toEqual(new Set([0]))
    const left = pixel(picture, 0.05, 0.5)
    const middle = pixel(picture, 0.5, 0.5)
    const right = pixel(picture, 0.95, 0.5)
    expect(left.r).toBeLessThan(40)
    expect(Math.abs(middle.r - 128)).toBeLessThan(30)
    expect(right.r).toBeGreaterThan(215)
  })

  test('a vertical shading (gradientTransform rotate(90)) changes down the shape, not across', () => {
    const picture = read(
      `<defs><linearGradient id='s' gradientTransform='rotate(90)'><stop offset='0' stop-color='#f00'/><stop offset='1' stop-color='#00f'/></linearGradient></defs><rect width='50' height='50' fill='url(#s)'/>`,
      '0 0 50 50',
    )
    const top = pixel(picture, 0.5, 0.05)
    const bottom = pixel(picture, 0.5, 0.95)
    expect(top.r).toBeGreaterThan(200)
    expect(bottom.b).toBeGreaterThan(200)
    expect(pixel(picture, 0.05, 0.5)).toEqual(pixel(picture, 0.95, 0.5))
  })

  test('a radial (ball) shading is its first colour at the focus and its last at the rim', () => {
    const picture = read(
      `<defs><radialGradient id='b' fx='0.4' fy='0.4'><stop offset='0' stop-color='#fff'/><stop offset='1' stop-color='#000'/></radialGradient></defs><circle cx='25' cy='25' r='25' fill='url(#b)'/>`,
      '0 0 50 50',
    )
    expect(pixel(picture, 0.4, 0.4).r).toBeGreaterThan(220)
    expect(pixel(picture, 0.5, 0.97).r).toBeLessThan(60)
    // Outside the circle: nothing painted.
    expect(pixel(picture, 0.03, 0.03).a).toBe(0)
  })

  test('a pattern tiles its shape: lines and gaps, nothing outside it', () => {
    // pattern=horizontal lines, its tile 4 bp tall, a line at the tile's middle.
    const picture = read(
      `<defs><pattern id='t' width='100' height='4' patternUnits='userSpaceOnUse'/><symbol id='l'><path d='M0 2H100' fill='none' stroke-width='1'/></symbol></defs>` +
        `<pattern id='u' xlink:href='#t'><g fill='#000' stroke='#000'><use xlink:href='#l'/></g></pattern><g fill='url(#u)'><path d='M0 0H40V40H0Z' stroke='none'/></g>`,
      '0 0 50 50',
    )
    expect(picture.ops.length).toBeGreaterThan(8)
    expect(picture.ops.every(op => op.type === 'stroke' && op.clip === 0)).toBe(true)
    // Down the middle of the square: inked rows and blank rows in turn.
    const column = Array.from({ length: 64 }, (_, k) => pixel(picture, 0.4, (k + 0.5) / 80).a)
    expect(column.filter(a => a > 200).length).toBeGreaterThan(4)
    expect(column.filter(a => a === 0).length).toBeGreaterThan(4)
    expect(pixel(picture, 0.9, 0.5).a).toBe(0)
  })

  test('a rotated pattern (patterns.meta Lines[angle=45]) is tiled along its own axes', () => {
    const picture = read(
      `<defs><pattern id='t' width='4' height='4' patternUnits='userSpaceOnUse' patternTransform='matrix(0.7071 0.7071 -0.7071 0.7071 0 0)'/><symbol id='l'><path d='M-2 0H2' fill='none' stroke-width='0.5'/></symbol></defs>` +
        `<pattern id='u' xlink:href='#t'><g stroke='#00f'><use xlink:href='#l'/></g></pattern><path d='M0 0H50V50H0Z' fill='url(#u)'/>`,
      '0 0 50 50',
    )
    // Every tile in reach of the square, and no more than that by much.
    expect(picture.ops.length).toBeGreaterThan(150)
    expect(picture.ops.length).toBeLessThan(600)
    expect(picture.ops.every(op => op.paint.color.b === 255)).toBe(true)
  })

  test('a pattern too fine for its shape is a tint, so the picture stays drawable', () => {
    const picture = read(
      `<defs><pattern id='t' width='0.01' height='0.01' patternUnits='userSpaceOnUse'/><symbol id='l'><path d='M0 0H0.01' stroke-width='0.001'/></symbol></defs>` +
        `<pattern id='u' xlink:href='#t'><g stroke='#0f0'><use xlink:href='#l'/></g></pattern><path d='M0 0H50V50H0Z' fill='url(#u)'/>`,
      '0 0 50 50',
    )
    expect(picture.ops).toHaveLength(1)
    expect(picture.ops[0]!.paint).toEqual({ color: { r: 0, g: 255, b: 0 }, opacity: 0.35 })
  })

  test('the shape keeps its stroke on top of its pattern', () => {
    const picture = read(
      `<defs><pattern id='t' width='5' height='5' patternUnits='userSpaceOnUse'/><symbol id='l'><path d='M0 0L5 5' stroke-width='0.4'/></symbol></defs>` +
        `<pattern id='u' xlink:href='#t'><g stroke='#f00'><use xlink:href='#l'/></g></pattern><path d='M5 5H45V45H5Z' fill='url(#u)' stroke='#00f'/>`,
      '0 0 50 50',
    )
    const last = picture.ops.at(-1)!
    expect(last.type).toBe('stroke')
    expect(last.paint.color).toEqual({ r: 0, g: 0, b: 255 })
    expect(last.clip).toBeUndefined()
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

describe('limits on path data (security review: a picture the rasterizer would take minutes over)', () => {
  test('numbers are counted as SVG reads them', () => {
    expect(countNumbers('M0 0L10.5,-2.25')).toBe(4)
    expect(countNumbers('M0.5.5l1e-5-2E+3 .1')).toBe(5)
    expect(countNumbers('M1-2-3')).toBe(3)
    expect(countNumbers('Z')).toBe(0)
  })

  test("dvisvgm's real pictures are far inside both limits", () => {
    for (const name of ['cd', 'chem', 'circ', 'plot', 'si', 'tikz']) {
      const picture = texPicture(fixture(name), { baseline: 'bottom', fontSize: 10 })
      expect(Math.max(...picture.ops.map(op => op.d.length)), name).toBeLessThan(MAX_PATH_DATA / 100)
      expect(picture.ops.reduce((sum, op) => sum + countNumbers(op.d), 0), name).toBeLessThan(MAX_PICTURE_NUMBERS / 100)
    }
  })

  test('one path longer than MAX_PATH_DATA refuses the picture', () => {
    const d = `M0 0${'L1 1'.repeat(MAX_PATH_DATA / 4)}`
    expect(() => read(`<path d='${d}'/>`)).toThrow(/picture too complex \(a path of \d+ characters\)/)
    expect(() => read(`<path d='${d.slice(0, MAX_PATH_DATA)}'/>`)).not.toThrow()
  })

  test('a glyph painted again and again counts each time, until the picture holds too many coordinates', () => {
    // 1000 numbers in one outline, painted by `use` 3000 times: 3 000 000 coordinates.
    const glyph = `<defs><path id='g0-1' d='M0 0${' L1 1'.repeat(499)}'/></defs>`
    const uses = (n: number) => `<use xlink:href='#g0-1' x='1' y='1'/>`.repeat(n)
    expect(() => read(glyph + uses(3000))).toThrow(SvgError)
    expect(() => read(glyph + uses(3000))).toThrow(/more than 2000000 path coordinates/)
    expect(read(glyph + uses(100)).ops).toHaveLength(100)
  })

  test('clip paths count too, once per place they clip', () => {
    // About 499 000 numbers in one clip path, under MAX_PATH_DATA characters; clipping in five places passes the limit.
    const clip = `<clipPath id='c'><path d='M0 0${' 1'.repeat(499_000)}'/></clipPath>`
    const clipped = (n: number) => Array.from({ length: n }, (_, k) => `<g clip-path='url(#c)' transform='translate(${k} 0)'><rect width='1' height='1'/></g>`).join('')
    expect(() => read(clip + clipped(5))).toThrow(/path coordinates/)
    expect(read(clip + clipped(2)).ops).toHaveLength(2)
  })
})
