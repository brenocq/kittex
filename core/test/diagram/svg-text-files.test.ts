// The labels of real SVG files, set by MathJax through readSvg's `text`, as
// core/src/index.ts sets them: where each label's ink lands against its node.
// graphviz-labels.svg is written in dot 12's output form (one <text> per line,
// HTML labels as start-anchored runs), inkscape-text.svg and drawio.svg are
// trimmed from those editors' files, and mermaid.svg is mmdc's (htmlLabels off).

import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { readSvg, svgTextTex, type SvgTextTypesetter } from '../../src/diagram/index.ts'
import { flattenSubpaths } from '../../src/raster/path.ts'
import { GlyphError, typeset } from '../../src/typeset/index.ts'
import type { Picture, PictureOp } from '../../src/types.ts'

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}.svg`, import.meta.url), 'utf8')

const mathjax: SvgTextTypesetter = run => {
  try {
    return typeset(svgTextTex(run), { display: false })
  } catch (error) {
    if (error instanceof GlyphError) return undefined
    throw error
  }
}

type Glyph = Extract<PictureOp, { type: 'fill' }> & { box: Box }
interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

/** The picture in its own user units (one em each, x from the viewBox's left), and its glyphs' ink boxes in those units. */
function open(svg: string, text: SvgTextTypesetter | null = mathjax): { picture: Picture; glyphs: Glyph[] } {
  const picture = readSvg(svg, { baseline: 'origin', emPerUnit: 1, ...(text ? { text } : {}) })
  const x0 = Number((/viewBox="\s*([-\d.]+)/.exec(svg) ?? [])[1] ?? 0)
  const glyphs = picture.ops.flatMap(op => (op.type === 'fill' && op.glyph ? [{ ...op, box: inkBox(op, x0) }] : []))
  return { picture, glyphs }
}

function inkBox(op: PictureOp, x0: number): Box {
  const points = flattenSubpaths(op.d, op.transform, 0.01).flatMap(subpath => [...subpath.points])
  const xs = points.filter((_, i) => i % 2 === 0).map(x => x + x0)
  const ys = points.filter((_, i) => i % 2 === 1)
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) }
}

const union = (boxes: readonly Box[]): Box => ({
  left: Math.min(...boxes.map(b => b.left)),
  top: Math.min(...boxes.map(b => b.top)),
  right: Math.max(...boxes.map(b => b.right)),
  bottom: Math.max(...boxes.map(b => b.bottom)),
})
const centerX = (b: Box) => (b.left + b.right) / 2
const centerY = (b: Box) => (b.top + b.bottom) / 2

/** The glyphs whose ink is centred inside `region`. */
const inside = (glyphs: readonly Glyph[], region: Box) =>
  glyphs.filter(g => centerX(g.box) > region.left && centerX(g.box) < region.right && centerY(g.box) > region.top && centerY(g.box) < region.bottom)

/** Expects a label's glyphs (`count` of them) all inside `region`, its ink centred on `cx` (and `cy`) within `tolerance`. */
function expectLabel(glyphs: readonly Glyph[], region: Box, count: number, center?: { cx?: number; cy?: number; tolerance: number }): Box {
  const mine = inside(glyphs, region)
  expect(mine).toHaveLength(count)
  const ink = union(mine.map(g => g.box))
  expect(ink.left).toBeGreaterThan(region.left)
  expect(ink.right).toBeLessThan(region.right)
  expect(ink.top).toBeGreaterThan(region.top)
  expect(ink.bottom).toBeLessThan(region.bottom)
  if (center?.cx !== undefined) expect(Math.abs(centerX(ink) - center.cx)).toBeLessThan(center.tolerance)
  if (center?.cy !== undefined) expect(Math.abs(centerY(ink) - center.cy)).toBeLessThan(center.tolerance)
  return ink
}

describe('graphviz', () => {
  // dot's graph coordinates, under its translate(4 256), in the SVG's user units.
  const g = (left: number, top: number, right: number, bottom: number): Box => ({ left: left + 4, top: top + 256, right: right + 4, bottom: bottom + 256 })
  const { glyphs } = open(fixture('graphviz-labels'))

  test('every label is drawn, each character an outline', () => {
    expect(glyphs).toHaveLength(5 + 8 + 4 + 9 + 4 + 5 + 11)
  })

  test('an ellipse node’s label is centred in its ellipse, across and down', () => {
    expectLabel(glyphs, g(31.5, -252, 94.5, -216), 5, { cx: 63 + 4, tolerance: 1.5 })
    // Down, within a fifth of the 14 pt font (the p descends).
    expectLabel(glyphs, g(31.5, -252, 94.5, -216), 5, { cy: -234 + 256, tolerance: 2.8 })
  })

  test('a two-line label: one text a line, each centred, the first above the second', () => {
    const node = g(31.5, -170.74, 94.5, -117.26)
    expectLabel(glyphs, node, 8, { cx: 67, cy: -144 + 256, tolerance: 2 })
    const two = inside(glyphs, { ...node, bottom: -140 + 256 })
    const lines = inside(glyphs, { ...node, top: -140 + 256 })
    expect([two.length, lines.length]).toEqual([3, 5])
    expect(Math.abs(centerX(union(two.map(x => x.box))) - 67)).toBeLessThan(1.5)
    expect(Math.abs(centerX(union(lines.map(x => x.box))) - 67)).toBeLessThan(1.5)
  })

  test('an edge label beside its edge', () => {
    expectLabel(glyphs, g(60, -200, 100, -178), 4, { cx: 77.62 + 4, tolerance: 1.5 })
  })

  test('an HTML label’s bold and italic runs, in its fontcolor, inside its box', () => {
    const typed: string[] = []
    open(fixture('graphviz-labels'), run => {
      typed.push(`${run.text}${run.bold ? ':bold' : ''}${run.italic ? ':italic' : ''}`)
      return mathjax(run)
    })
    expect(typed).toContain('Bold:bold')
    expect(typed).toContain('it&co:italic')
    const box = g(23.3, -54, 102.7, -18)
    expectLabel(glyphs, box, 9)
    expect(inside(glyphs, box).every(x => x.paint.color.r === 255 && x.paint.color.g === 0)).toBe(true)
  })

  test('a record’s fields, each centred in its cell', () => {
    expectLabel(glyphs, g(133, -53.5, 174, -18.5), 4, { cx: 153.5 + 4, tolerance: 1.5 })
    expectLabel(glyphs, g(174, -53.5, 217, -18.5), 5, { cx: 195.5 + 4, tolerance: 1.5 })
  })

  test('a left-justified line (text-anchor start) begins at its x', () => {
    const ink = expectLabel(glyphs, g(130, -162, 226, -126), 11)
    expect(ink.left).toBeGreaterThan(138 + 4 - 0.5)
    expect(ink.left).toBeLessThan(138 + 4 + 1)
  })

  test('without a typesetter, the labels are not drawn and the rest is', () => {
    const bare = open(fixture('graphviz-labels'), null)
    expect(bare.glyphs).toHaveLength(0)
    expect(bare.picture.ops.length).toBeGreaterThan(10)
  })
})

describe('Inkscape', () => {
  const { glyphs } = open(fixture('inkscape-text'))

  test('a centred two-line text: each line centred on its x, inside its box, a bold run in its own colour', () => {
    const box = { left: 5, top: 5, right: 55, bottom: 29 }
    expectLabel(glyphs, box, 9 + 14)
    const first = inside(glyphs, { ...box, bottom: 16 })
    const second = inside(glyphs, { ...box, top: 16 })
    expect([first.length, second.length]).toEqual([9, 14])
    expect(Math.abs(centerX(union(first.map(x => x.box))) - 30)).toBeLessThan(1)
    expect(Math.abs(centerX(union(second.map(x => x.box))) - 30)).toBeLessThan(1)
    const red = second.filter(x => x.paint.color.r === 0xc0 && x.paint.color.g === 0)
    expect(red).toHaveLength(4)
    expect(second.filter(x => x.paint.color.r === 0x1a)).toHaveLength(10)
  })

  test('a rotated italic label runs up its tall box, at its fill opacity', () => {
    const ink = expectLabel(glyphs, { left: 80, top: 5, right: 92, bottom: 55 }, 11)
    expect(ink.bottom - ink.top).toBeGreaterThan(3 * (ink.right - ink.left))
    expect(ink.bottom).toBeLessThan(48.5)
    expect(inside(glyphs, { left: 80, top: 5, right: 92, bottom: 55 }).every(x => Math.abs(x.paint.opacity - 0.8) < 1e-9)).toBe(true)
  })
})

describe('draw.io', () => {
  const { glyphs } = open(fixture('drawio'))

  test('each shape’s label (the fallback text of its switch, not the HTML) is centred in it', () => {
    expect(glyphs).toHaveLength(5 + 11)
    expectLabel(glyphs, { left: 0, top: 10, right: 120, bottom: 70 }, 5, { cx: 59.5, cy: 39.5, tolerance: 2 })
    expectLabel(glyphs, { left: 160, top: 10, right: 280, bottom: 70 }, 11, { cx: 219.5, cy: 39.5, tolerance: 2 })
  })

  test('its light-dark() colors are read as their light one, the shape’s fill and the label’s alike', () => {
    const { picture } = open(fixture('drawio'))
    const box = picture.ops.find(op => op.type === 'fill' && !op.glyph && op.paint.color.b === 252)
    expect(box?.paint.color).toEqual({ r: 218, g: 232, b: 252 })
    const tinted = open(fixture('drawio').replace('fill="light-dark(#000000, #ffffff)"', 'fill="light-dark(rgb(200, 0, 0), #ffffff)"')).glyphs
    expect(tinted.filter(g => g.paint.color.r === 200)).toHaveLength(5)
  })
})

describe('mermaid', () => {
  const { glyphs } = open(fixture('mermaid'))
  // Its labels are centred across by `#my-svg .node .label text { text-anchor: middle }`, a descendant selector
  // css.ts doesn't read: they start at their node's centre. Down, their em-unit y and dy place them.
  test('each node’s label sits on its node’s middle line, its lines set by em-unit y and dy', () => {
    expect(glyphs).toHaveLength(5 + 7 + 6 + 8 + 3)
    for (const [cy, count] of [
      [33.5, 5],
      [119.5, 7],
      [268.5, 6],
      [477.5, 8],
    ] as const) {
      const row = inside(glyphs, { left: 90, top: cy - 15, right: 200, bottom: cy + 15 })
      expect(row).toHaveLength(count)
      expect(Math.abs(centerY(union(row.map(x => x.box))) - cy)).toBeLessThan(3)
    }
  })
})

describe('matplotlib with svg.fonttype none', () => {
  test('the tick labels land where matplotlib’s own outlines of them do', () => {
    const outlined = open(fixture('matplotlib'), null)
    // matplotlib's outlines are <use> of glyph paths, not marked glyphs: the black fills nothing strokes.
    const stroked = new Set(outlined.picture.ops.filter(op => op.type === 'stroke').map(op => op.d))
    const theirs = outlined.picture.ops.filter(op => op.type === 'fill' && op.paint.color.r === 0 && !stroked.has(op.d)).map(op => inkBox(op, 0))
    const ours = open(fixture('matplotlib-text')).glyphs.map(x => x.box)
    expect(ours).toHaveLength(theirs.length)
    expect(theirs).toHaveLength(4)
    ours.forEach((box, i) => {
      expect(Math.abs(centerX(box) - centerX(theirs[i]!))).toBeLessThan(1)
      expect(Math.abs(box.bottom - theirs[i]!.bottom)).toBeLessThan(0.5)
    })
  })
})
