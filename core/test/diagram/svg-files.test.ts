// Ordinary SVG files, as a reply's \includegraphics points at them: what
// matplotlib, Inkscape, graphviz and draw.io write, read with the document's
// own size (userUnit: 'document').

import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { MAX_PICTURE_OPS, readSvg, SvgError, XmlError } from '../../src/diagram/index.ts'
import type { Matrix, Picture, PictureOp } from '../../src/types.ts'

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}.svg`, import.meta.url), 'utf8')
/** Em per big point at kittex's 10 pt em. */
const EM = 72.27 / 72 / 10
const open = (svg: string): Picture => readSvg(svg, { baseline: 'bottom', emPerUnit: EM, userUnit: 'document' })
const doc = (body: string, attrs = `viewBox='0 0 100 50'`) => `<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' ${attrs}>${body}</svg>`
const ops = (body: string, attrs?: string) => open(doc(body, attrs)).ops

/** Where a point of an op's own coordinates lands, in em. */
const at = (m: Matrix, x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
const rgb = (op: PictureOp) => op.paint.color
/** A tick label's glyph in a matplotlib plot: a black fill of an outline nothing strokes (a tick's line is both). */
const isGlyph = (picture: Picture) => {
  const stroked = new Set(picture.ops.filter(op => op.type === 'stroke').map(op => op.d))
  return (op: PictureOp) => op.type === 'fill' && rgb(op).r === 0 && rgb(op).g === 0 && rgb(op).b === 0 && !stroked.has(op.d)
}

describe('matplotlib', () => {
  test('a line plot: its size, its two lines in their colors, clipped to the axes, and the tick labels as outlines', () => {
    const picture = open(fixture('matplotlib'))
    // figsize 2.4 × 1.6 in: 172.8 × 115.2 pt.
    expect(picture.width).toBeCloseTo(172.8 * EM, 6)
    expect(picture.height).toBeCloseTo(115.2 * EM, 6)
    expect(picture.depth).toBe(0)
    // Two white patches, four ticks (each a stroke, and a fill of its line that covers nothing), four glyphs, two
    // lines, four spines.
    expect(picture.ops).toHaveLength(20)
    const blue = picture.ops.filter(op => op.type === 'stroke' && rgb(op).r === 31 && rgb(op).g === 119 && rgb(op).b === 180)
    expect(blue).toHaveLength(1)
    expect(blue[0]!.clip).toBeDefined()
    const red = picture.ops.find(op => op.type === 'stroke' && rgb(op).r === 214 && rgb(op).g === 39 && rgb(op).b === 40)
    expect(red?.paint.opacity).toBeCloseTo(0.6, 6)
    expect(red?.type === 'stroke' && red.style.dash).toBeTruthy()
    // matplotlib's sheet: *{stroke-linejoin: round; stroke-linecap: butt}.
    expect(red?.type === 'stroke' && red.style.join).toBe('round')
    // The four tick labels' glyphs (0, 2, 0, 1), filled black through <use>.
    expect(picture.ops.filter(isGlyph(picture))).toHaveLength(4)
  })

  test('with svg.fonttype none, the tick labels are <text>: skipped, everything else as drawn with outlines', () => {
    const outlined = open(fixture('matplotlib'))
    const text = open(fixture('matplotlib-text'))
    expect(fixture('matplotlib-text')).toContain('<text')
    expect(text.ops.filter(isGlyph(text))).toHaveLength(0)
    const glyph = isGlyph(outlined)
    expect(text.ops).toEqual(outlined.ops.filter(op => !glyph(op)))
    expect(text.width).toBe(outlined.width)
  })
})

describe('graphviz', () => {
  test('a two-node graph: pt size, its transform, the nodes, the edge and its arrowhead; labels skipped', () => {
    const picture = open(fixture('graphviz'))
    expect(picture.width).toBeCloseTo(62 * EM, 6)
    expect(picture.height).toBeCloseTo(116 * EM, 6)
    expect(picture.ops.map(op => op.type)).toEqual(['fill', 'stroke', 'fill', 'stroke', 'stroke', 'fill', 'stroke'])
    // The white page, mapped by translate(4 112) onto the picture's whole box: (-4, 4) is its bottom left corner.
    const page = picture.ops[0]!
    expect(rgb(page)).toEqual({ r: 255, g: 255, b: 255 })
    const [x, y] = at(page.transform, -4, 4)
    expect(x).toBeCloseTo(0, 6)
    expect(y).toBeCloseTo(0, 6)
    const [x2, y2] = at(page.transform, 58, -112)
    expect(x2).toBeCloseTo(picture.width, 6)
    expect(y2).toBeCloseTo(-picture.height, 6)
    // Node b, filled lightblue (a CSS name beyond the basic sixteen).
    expect(rgb(picture.ops[2]!)).toEqual({ r: 173, g: 216, b: 230 })
  })
})

describe('Inkscape', () => {
  const ink = fixture('inkscape')

  test('a mm page: its size, a translucent rounded rect, a gradient circle in bands; the filter ignored, the text skipped', () => {
    const picture = open(ink)
    // 100 mm × 50 mm.
    expect(picture.width).toBeCloseTo((100 * 72) / 25.4 * EM, 6)
    expect(picture.height).toBeCloseTo((50 * 72) / 25.4 * EM, 6)
    const [rectFill, rectStroke, ...bands] = picture.ops
    expect(rectFill?.type).toBe('fill')
    expect(rgb(rectFill!)).toEqual({ r: 255, g: 102, b: 0 })
    expect(rectFill?.paint.opacity).toBe(0.5)
    expect(rectStroke?.type === 'stroke' && rectStroke.style.width).toBeCloseTo(0.264583, 6)
    // The layer's translate(-5,-5): the rect's corner (10, 15) is at 5 mm, 10 mm from the page's top left.
    const [x, y] = at(rectFill!.transform, 10, 15)
    expect(x).toBeCloseTo((5 * 72) / 25.4 * EM, 6)
    expect(y).toBeCloseTo(-picture.height + (10 * 72) / 25.4 * EM, 6)
    // The gradient (through its href) from blue to red, in bands clipped to the circle.
    expect(bands.length).toBeGreaterThan(10)
    expect(new Set(bands.map(op => op.clip)).size).toBe(1)
    // Each band is the color at its middle: the first nearly the first stop's, the last nearly the last's.
    expect(rgb(bands[0]!)).toEqual({ r: 2, g: 0, b: 253 })
    expect(rgb(bands.at(-1)!)).toEqual({ r: 253, g: 0, b: 2 })
  })

  test('the drawing is the same without its filter and without its text', () => {
    const plain = ink.replace(';filter:url(#filter4)', '').replace(/<text[\s\S]*<\/text>/, '')
    expect(plain).not.toBe(ink)
    expect(open(plain)).toEqual(open(ink))
  })

  test('a gradient stroke is its stops\' mean color', () => {
    const stroked = open(ink.replace('fill:url(#linearGradient3);stroke:none', 'fill:none;stroke:url(#linearGradient3)'))
    const stroke = stroked.ops.at(-1)!
    expect(stroke.type).toBe('stroke')
    expect(rgb(stroke)).toEqual({ r: 128, g: 0, b: 128 })
  })
})

describe('style sheets', () => {
  test('class, id, type and universal rules, by specificity, then order; the style attribute over all, attributes under all', () => {
    // In the reverse of their specificity, so that order alone would get them wrong.
    const sheet = `<style>/* a comment */ #x { fill: teal } .a.b { fill: navy } .a { fill: blue } path { fill: lime } * { fill: red } .late { fill: purple } .late { fill: olive }</style>`
    const fills = ops(
      `${sheet}<rect width='1' height='1' fill='black'/><path d='M0 0H1V1Z'/><path class='a' d='M0 0H1V1Z'/><path class='b a' d='M0 0H1V1Z'/><path id='x' class='a b' d='M0 0H1V1Z'/><path class='a' style='fill: yellow' d='M0 0H1V1Z'/><path class='late' d='M0 0H1V1Z'/>`,
    ).map(rgb)
    expect(fills).toEqual([
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 0, g: 0, b: 128 },
      { r: 0, g: 128, b: 128 },
      { r: 255, g: 255, b: 0 },
      { r: 128, g: 128, b: 0 },
    ])
  })

  test('Illustrator\'s class rules in CDATA; selectors it can\'t match and at-rules leave the attributes standing', () => {
    const sheet = `<style type='text/css'><![CDATA[ @import url('x.css'); .st0{fill:#FFFFFF;stroke:#000000;stroke-miterlimit:10;} ]]></style><style>@media print { .st1 { fill: red } } g .st1 { fill: red } .st1:hover { fill: red } .st1 { stroke: blue !important }</style>`
    const [white, black, plain, blue] = ops(`${sheet}<path class='st0' d='M0 0H1V1Z'/><path class='st1' fill='green' d='M0 0H1V1Z'/>`)
    expect(rgb(white!)).toEqual({ r: 255, g: 255, b: 255 })
    expect(black?.type === 'stroke' && black.style.miterLimit).toBe(10)
    expect(rgb(plain!)).toEqual({ r: 0, g: 128, b: 0 })
    expect(rgb(blue!)).toEqual({ r: 0, g: 0, b: 255 })
  })

  test('a style sheet past 256 KiB is refused', () => {
    expect(() => ops(`<style>${'.a{fill:red}'.repeat(30_000)}</style>`)).toThrow(XmlError)
  })
})

describe('colors', () => {
  test('alpha from rgba, #rrggbbaa and #rgba multiplies into the opacity; hsl; transparent paints nothing', () => {
    const painted = ops(
      `<path fill='rgba(255, 0, 0, 0.5)' fill-opacity='0.5' d='M0 0H1V1Z'/><path fill='#00ff0080' d='M0 0H1V1Z'/><path fill='#00f8' d='M0 0H1V1Z'/><path fill='hsl(120 100% 25%)' d='M0 0H1V1Z'/><path fill='hsla(-120, 100%, 50%, 25%)' d='M0 0H1V1Z'/><path fill='transparent' d='M0 0H1V1Z'/><path fill='rebeccapurple' d='M0 0H1V1Z'/>`,
    )
    expect(painted.map(op => [rgb(op), Math.round(op.paint.opacity * 1000) / 1000])).toEqual([
      [{ r: 255, g: 0, b: 0 }, 0.25],
      [{ r: 0, g: 255, b: 0 }, 0.502],
      [{ r: 0, g: 0, b: 255 }, 0.533],
      [{ r: 0, g: 128, b: 0 }, 1],
      [{ r: 0, g: 0, b: 255 }, 0.25],
      [{ r: 102, g: 51, b: 153 }, 1],
    ])
  })

  test('a gradient stop\'s alpha joins its stop-opacity', () => {
    const [stroke] = ops(`<defs><linearGradient id='g'><stop offset='0' stop-color='rgba(0,0,255,0.5)'/><stop offset='1' stop-color='#00f'/></linearGradient></defs><path stroke='url(#g)' fill='none' d='M0 0H1'/>`)
    expect(stroke?.paint.opacity).toBeCloseTo(0.75, 9)
  })
})

describe('draw.io', () => {
  test('a switch draws its first child that needs no extension: the HTML label (foreignObject) never, its fallback text skipped', () => {
    const body = `<g><rect x='1' y='1' width='20' height='10' fill='#dae8fc' stroke='#6c8ebf'/></g><g><switch><foreignObject requiredFeatures='http://www.w3.org/TR/SVG11/feature#Extensibility' width='20' height='10'><div xmlns='http://www.w3.org/1999/xhtml'>Box</div></foreignObject><text x='11' y='7'>Box</text></switch></g><switch><g requiredExtensions='http://example.com/x'><rect width='5' height='5'/></g><rect width='3' height='3' fill='red'/><rect width='4' height='4' fill='blue'/></switch>`
    const drawn = ops(body)
    expect(drawn.map(op => [op.type, rgb(op)])).toEqual([
      ['fill', { r: 218, g: 232, b: 252 }],
      ['stroke', { r: 108, g: 142, b: 191 }],
      ['fill', { r: 255, g: 0, b: 0 }],
    ])
  })
})

describe('the document size', () => {
  const box = (attrs: string) => {
    const picture = open(doc(`<rect width='1' height='1'/>`, attrs))
    return [Math.round((picture.width / EM) * 1000) / 1000, Math.round((picture.height / EM) * 1000) / 1000]
  }

  test('units, in big points', () => {
    expect(box(`width='200' height='100' viewBox='0 0 100 50'`)).toEqual([150, 75])
    expect(box(`width='200px' height='100px' viewBox='0 0 100 50'`)).toEqual([150, 75])
    expect(box(`width='2in' height='1in' viewBox='0 0 100 50'`)).toEqual([144, 72])
    expect(box(`width='2.54cm' height='12.7mm' viewBox='0 0 100 50'`)).toEqual([72, 36])
    expect(box(`width='6pc' height='36pt' viewBox='0 0 100 50'`)).toEqual([72, 36])
  })

  test('no width or a percentage: a user unit is a CSS pixel; one given sets the scale', () => {
    expect(box(`viewBox='0 0 100 50'`)).toEqual([75, 37.5])
    expect(box(`width='100%' height='100%' viewBox='0 0 100 50'`)).toEqual([75, 37.5])
    expect(box(`width='50pt' viewBox='0 0 100 50'`)).toEqual([50, 25])
    expect(box(`width='40pt' height='40pt'`)).toEqual([40, 40])
    // Without a viewBox the user unit is still a pixel: a 30-unit rect is 22.5 pt across.
    const [rect] = open(doc(`<rect width='30' height='1'/>`, `width='40pt' height='40pt'`)).ops
    expect(at(rect!.transform, 30, 0)[0]! - at(rect!.transform, 0, 0)[0]!).toBeCloseTo(22.5 * EM, 9)
  })

  test('the viewBox keeps its aspect ratio inside a box of another shape, unless preserveAspectRatio is none', () => {
    expect(box(`width='100pt' height='100pt' viewBox='0 0 100 50'`)).toEqual([100, 50])
    expect(box(`width='100pt' height='20pt' viewBox='0 0 100 50'`)).toEqual([40, 20])
    expect(box(`width='100pt' height='100pt' viewBox='0 0 100 50' preserveAspectRatio='none'`)).toEqual([100, 100])
  })

  test('the default (bp) reads the viewBox as big points, whatever width and height say (dvisvgm)', () => {
    const picture = readSvg(doc(`<rect width='1' height='1'/>`, `width='1in' height='1in' viewBox='0 0 100 50'`), { baseline: 'bottom', emPerUnit: EM })
    expect(picture.width).toBeCloseTo(100 * EM, 9)
  })
})

describe('the caps hold for ordinary files', () => {
  test('a sheet within its own cap that folds onto every element past 8 MiB in all refuses the picture', () => {
    const long = `*{fill:red;${'stroke-dasharray:1 1;'.repeat(40)}}`
    expect(() => ops(`<style>${long}</style>${"<rect width='1' height='1'/>".repeat(1000)}`)).not.toThrow()
    expect(() => ops(`<style>${long}</style>${"<rect width='1' height='1'/>".repeat(12_000)}`)).toThrow(/style sheet/)
  })

  test('a compound selector of more than 16 parts is skipped, not matched part by part', () => {
    const classes = Array.from({ length: 17 }, (_, i) => `c${i}`)
    const sheet = (n: number) => `<style>.${classes.slice(0, n).join('.')}{fill:red}</style>`
    const body = `<path class='${classes.join(' ')}' fill='blue' d='M0 0H1V1Z'/>`
    expect(rgb(ops(sheet(16) + body)[0]!)).toEqual({ r: 255, g: 0, b: 0 })
    expect(rgb(ops(sheet(17) + body)[0]!)).toEqual({ r: 0, g: 0, b: 255 })
  })

  test('a size no picture can be drawn at is refused', () => {
    expect(() => open(doc(`<rect width='1' height='1'/>`, `width='100pt' height='100pt' viewBox='0 0 1e-320 1e-320'`))).toThrow(/no drawable size/)
  })

  test('more shapes than MAX_PICTURE_OPS, through a class rule, refuse the picture', () => {
    const many = `<style>.r{fill:red}</style>${"<rect class='r' width='1' height='1'/>".repeat(MAX_PICTURE_OPS + 1)}`
    expect(() => ops(many)).toThrow(SvgError)
  })
})
