// An SVG's <text> set through readSvg's `text` typesetter (svg-text.ts): where
// each glyph lands, which runs are typeset in which style and paint, and the
// TeX a run becomes. Layout is checked with a fake typesetter whose glyphs are
// boxes half an em apart, so every place is exact; the TeX with MathJax itself.

import { describe, expect, test } from 'vitest'
import { MAX_TEXT_CHARS, readSvg, svgTextTex, SvgError, type SvgTextRun, type SvgTextTypesetter } from '../../src/diagram/index.ts'
import { flattenSubpaths } from '../../src/raster/path.ts'
import { GlyphError, typeset } from '../../src/typeset/index.ts'
import type { Picture, PictureOp, TypesetResult } from '../../src/types.ts'

/** Lacks this character, as the font lacks CJK. */
const MISSING = '☃'

/** A fake typesetter: each character a box 0.4 em wide and 0.7 em tall on the baseline, advancing 0.5 em (a space draws nothing); the runs it was asked for. */
function fake(): SvgTextTypesetter & { runs: SvgTextRun[] } {
  const runs: SvgTextRun[] = []
  const fn = (run: SvgTextRun): TypesetResult | undefined => {
    runs.push(run)
    if (run.text.includes(MISSING)) return undefined
    const points = [...run.text]
    const ops = points.flatMap((c, i) => (c === ' ' ? [] : [{ type: 'rect' as const, x: i * 0.5, y: -0.7, width: 0.4, height: 0.7 }]))
    return { width: points.length * 0.5, height: 0.7, depth: 0, ops }
  }
  return Object.assign(fn, { runs })
}

/** One em per user unit, the baseline at y = 0: an op's place in em is its place in the SVG's user units. */
const read = (body: string, text: SvgTextTypesetter = fake(), attrs = `viewBox='0 0 200 100'`): Picture =>
  readSvg(`<svg xmlns='http://www.w3.org/2000/svg' ${attrs}>${body}</svg>`, { baseline: 'origin', emPerUnit: 1, text })

/** Each glyph's ink box, in user units, in order. */
function boxes(picture: Picture): { left: number; top: number; right: number; bottom: number }[] {
  return glyphs(picture).map(op => {
    const points = flattenSubpaths(op.d, op.transform, 0.01).flatMap(subpath => [...subpath.points])
    const xs = points.filter((_, i) => i % 2 === 0)
    const ys = points.filter((_, i) => i % 2 === 1)
    return { left: round(Math.min(...xs)), top: round(Math.min(...ys)), right: round(Math.max(...xs)), bottom: round(Math.max(...ys)) }
  })
}
const round = (v: number) => Math.round(v * 1000) / 1000
const lefts = (picture: Picture) => boxes(picture).map(b => b.left)
const glyphs = (picture: Picture) => picture.ops.filter((op): op is Extract<PictureOp, { type: 'fill' }> => op.type === 'fill' && op.glyph === true)

describe('placing characters', () => {
  test('x and y place the first character; the rest follow at their advance', () => {
    const picture = read(`<text x='10' y='20' font-size='10'>abc</text>`)
    expect(lefts(picture)).toEqual([10, 15, 20])
    // The glyph sits on the baseline at y = 20: 0.7 em tall.
    expect(boxes(picture)[0]).toEqual({ left: 10, top: 13, right: 14, bottom: 20 })
  })

  test('without x and y, the text starts at the origin', () => {
    expect(boxes(read(`<text font-size='10'>a</text>`))[0]).toMatchObject({ left: 0, bottom: 0 })
  })

  test('an x list places a character each; the characters past it follow the last', () => {
    expect(lefts(read(`<text x='10 30' y='20' font-size='10'>abc</text>`))).toEqual([10, 30, 35])
    expect(lefts(read(`<text x='10,30' y='20' font-size='10'>abc</text>`))).toEqual([10, 30, 35])
  })

  test('a y list moves each character down to its own baseline', () => {
    expect(boxes(read(`<text x='10' y='20 30' font-size='10'>ab</text>`)).map(b => b.bottom)).toEqual([20, 30])
  })

  test('dx and dy shift a character and every one after it', () => {
    const b = boxes(read(`<text x='10' y='20' dx='2 3' dy='0 4' font-size='10'>abc</text>`))
    expect(b.map(g => g.left)).toEqual([12, 20, 25])
    expect(b.map(g => g.bottom)).toEqual([20, 24, 24])
  })

  test('em lengths in position lists are the element’s font size (mermaid’s y="-0.1em" dy="1.1em")', () => {
    const b = boxes(read(`<g font-size='10'><text y='-10'><tspan x='0' y='-0.1em' dy='1.1em'>a</tspan></text></g>`))
    expect(b[0]).toMatchObject({ left: 0, bottom: 10 })
  })

  test('a tspan continues where the text before it ends, in its own style, and the text after it follows it', () => {
    const typesetter = fake()
    const picture = read(`<text x='10' y='20' font-size='10'>ab<tspan font-weight='bold'>cd</tspan>e</text>`, typesetter)
    expect(lefts(picture)).toEqual([10, 15, 20, 25, 30])
    expect(typesetter.runs).toEqual([
      { text: 'ab', bold: false, italic: false },
      { text: 'cd', bold: true, italic: false },
      { text: 'e', bold: false, italic: false },
    ])
  })

  test('a tspan with its own x and y starts a line (Inkscape’s multi-line text)', () => {
    const b = boxes(read(`<text font-size='10'><tspan x='5' y='10'>ab</tspan><tspan x='5' y='22'>cd</tspan></text>`))
    expect(b.map(g => [g.left, g.bottom])).toEqual([
      [5, 10],
      [10, 10],
      [5, 22],
      [10, 22],
    ])
  })

  test('a tspan’s position list counts its own characters; the text’s counts all of them', () => {
    // The text's x list: 'a' at 10, 'b' at 50 (inside the tspan, which has no x of its own), 'c' at 90.
    expect(lefts(read(`<text x='10 50 90' y='20' font-size='10'>a<tspan>b</tspan>c</text>`))).toEqual([10, 50, 90])
    // The tspan's own list wins over the text's for its characters.
    expect(lefts(read(`<text x='10 50 90' y='20' font-size='10'>a<tspan x='70'>b</tspan>c</text>`))).toEqual([10, 70, 90])
  })

  test('a run longer than a typesetting is set in pieces, laid end to end', () => {
    const typesetter = fake()
    const long = 'abc'.repeat(150)
    const picture = read(`<text x='0' y='20' font-size='2'>${long}</text>`, typesetter, `viewBox='0 0 1000 100'`)
    expect(typesetter.runs.map(run => run.text.length)).toEqual([200, 200, 50])
    expect(lefts(picture)[449]).toBe(449)
  })

  test('a run with a character the font lacks is set a character at a time, that one left blank', () => {
    const picture = read(`<text x='0' y='20' font-size='10'>a${MISSING}b</text>`)
    expect(lefts(picture)).toEqual([0, 10])
  })
})

describe('text-anchor', () => {
  const at = (anchor: string) => lefts(read(`<text x='100' y='20' font-size='10' text-anchor='${anchor}'>abcd</text>`))
  test('start, middle and end: the text begins at, is centred on, or ends at x', () => {
    expect(at('start')).toEqual([100, 105, 110, 115])
    expect(at('middle')).toEqual([90, 95, 100, 105])
    expect(at('end')).toEqual([80, 85, 90, 95])
  })

  test('each line of a multi-line text is anchored on its own, from a style or a class', () => {
    const b = boxes(
      read(`<style>.c { text-anchor: middle }</style><text class='c' font-size='10'><tspan x='50' y='10'>ab</tspan><tspan x='50' y='22'>abcd</tspan></text>`),
    )
    expect(b.map(g => g.left)).toEqual([45, 50, 40, 45, 50, 55])
  })

  test('a whole line of tspans in several styles is centred as one', () => {
    expect(lefts(read(`<text x='50' y='10' font-size='10' text-anchor='middle'>a<tspan font-style='italic'>b</tspan>c</text>`))).toEqual([42.5, 47.5, 52.5])
  })
})

describe('baselines', () => {
  const bottom = (attrs: string) => boxes(read(`<text x='0' y='50' font-size='10' ${attrs}>a</text>`))[0]!.bottom
  test('dominant-baseline and alignment-baseline move the alphabetic baseline below y', () => {
    expect(bottom('')).toBe(50)
    expect(bottom(`dominant-baseline='alphabetic'`)).toBe(50)
    expect(bottom(`dominant-baseline='middle'`)).toBe(52.15)
    expect(bottom(`dominant-baseline='central'`)).toBe(53)
    expect(bottom(`dominant-baseline='hanging'`)).toBe(58)
    expect(bottom(`dominant-baseline='text-after-edge'`)).toBe(48)
    expect(bottom(`style='dominant-baseline: central'`)).toBe(53)
  })

  test('alignment-baseline on a tspan moves only its characters', () => {
    const b = boxes(read(`<text x='0' y='50' font-size='10'>a<tspan alignment-baseline='central'>b</tspan></text>`))
    expect(b.map(g => g.bottom)).toEqual([50, 53])
  })
})

describe('font size', () => {
  /** The advance of one character: half the font size. */
  const size = (body: string) => {
    const l = lefts(read(body))
    return (l[1]! - l[0]!) * 2
  }
  test('in user units, px, pt and em, from attributes, styles, the font shorthand and class rules', () => {
    expect(size(`<text font-size='10'>ab</text>`)).toBe(10)
    expect(size(`<text font-size='10px'>ab</text>`)).toBe(10)
    expect(size(`<text font-size='12pt'>ab</text>`)).toBe(16)
    expect(size(`<g font-size='10'><text font-size='2em'>ab</text></g>`)).toBe(20)
    expect(size(`<g style='font-size:10px'><text style='font-size:150%'>ab</text></g>`)).toBe(15)
    expect(size(`<text style='font: italic 7.5pt sans-serif'>ab</text>`)).toBe(10)
    expect(size(`<style>.big { font-size: 30px }</style><text class='big'>ab</text>`)).toBe(30)
    expect(size(`<style>#root { font-size: 14px }</style><g id='root'><text>ab</text></g>`)).toBe(14)
    expect(size(`<text font-size='large'>ab</text>`)).toBe(18)
  })

  test('the initial size is CSS’s medium, 16 px; one that can’t be read is inherited', () => {
    expect(size(`<text>ab</text>`)).toBe(16)
    expect(size(`<g font-size='10'><text font-size='huge-ish'>ab</text></g>`)).toBe(10)
  })

  test('a tspan’s em is its text’s size', () => {
    const l = lefts(read(`<text font-size='10' x='0' y='10'>a<tspan font-size='2em'>bc</tspan></text>`))
    expect(l).toEqual([0, 5, 15])
  })
})

describe('weight, style and paint', () => {
  test('bold and italic, from attributes, styles and keywords, reach the typesetter', () => {
    const typesetter = fake()
    read(
      `<text font-weight='bold'>a</text><text style='font-weight:700'>b</text><text font-weight='400'>c</text><text font-style='italic'>d</text><text style='font-style:oblique'>e</text><g font-weight='bold'><text font-style='italic'>f</text></g>`,
      typesetter,
    )
    expect(typesetter.runs.map(run => `${run.text}${run.bold ? 'B' : ''}${run.italic ? 'I' : ''}`)).toEqual(['aB', 'bB', 'c', 'dI', 'eI', 'fBI'])
  })

  test('glyphs are filled in the text’s fill and opacity, a tspan’s own fill winning; black by default', () => {
    const picture = read(`<g opacity='0.5'><text fill='#ff0000' fill-opacity='0.5'>a<tspan fill='blue'>b</tspan></text></g><text>c</text>`)
    expect(glyphs(picture).map(op => op.paint)).toEqual([
      { color: { r: 255, g: 0, b: 0 }, opacity: 0.25 },
      { color: { r: 0, g: 0, b: 255 }, opacity: 0.25 },
      { color: { r: 0, g: 0, b: 0 }, opacity: 1 },
    ])
  })

  test('fill none, display none and visibility hidden draw nothing, but hidden text keeps its room', () => {
    expect(glyphs(read(`<text fill='none'>a</text>`))).toHaveLength(0)
    expect(lefts(read(`<text font-size='10'>a<tspan display='none'>b</tspan>c</text>`))).toEqual([0, 5])
    expect(lefts(read(`<text font-size='10'>a<tspan visibility='hidden'>b</tspan>c</text>`))).toEqual([0, 10])
    expect(lefts(read(`<text font-size='10' visibility='hidden'>a<tspan visibility='visible'>b</tspan></text>`))).toEqual([5])
  })

  test('underline and line-through are rules across the run', () => {
    const picture = read(`<text x='0' y='20' font-size='10' text-decoration='underline'>ab</text>`)
    expect(boxes(picture).at(-1)).toEqual({ left: 0, top: 21, right: 10, bottom: 21.5 })
  })

  test('the text’s transform chain maps its glyphs, and its clip clips them', () => {
    const picture = read(
      `<defs><clipPath id='c'><rect width='50' height='50'/></clipPath></defs><g transform='translate(5 0)'><text transform='scale(2)' x='10' y='20' font-size='10' clip-path='url(#c)'>a</text></g>`,
    )
    expect(boxes(picture)[0]).toEqual({ left: 25, top: 26, right: 33, bottom: 40 })
    expect(glyphs(picture)[0]!.clip).toBe(0)
  })
})

describe('white space', () => {
  const runs = (body: string) => {
    const typesetter = fake()
    read(body, typesetter)
    return typesetter.runs.map(run => run.text)
  }
  test('collapsed by default: newlines and tabs are spaces, runs of them one, and the text’s ends trimmed', () => {
    expect(runs(`<text>  a \n\t  b  </text>`)).toEqual(['a b'])
    expect(runs(`<text> a <tspan> b </tspan> </text>`)).toEqual(['a ', 'b'])
  })

  test('kept under xml:space="preserve" and white-space: pre, newlines and tabs as spaces', () => {
    expect(runs(`<text xml:space='preserve'>  a \n b  </text>`)).toEqual(['  a   b  '])
    expect(runs(`<g xml:space='preserve'><text>a  b</text></g>`)).toEqual(['a  b'])
    expect(runs(`<text style='white-space:pre'>a  b</text>`)).toEqual(['a  b'])
    expect(runs(`<text xml:space='preserve'>a <tspan xml:space='default'> b  c </tspan></text>`)).toEqual(['a ', 'b c'])
  })

  test('character references, CDATA and controls', () => {
    expect(runs(`<text>a&amp;b&#x263A;<![CDATA[<c>]]>\u0001</text>`)).toEqual(['a&b☺<c>'])
  })
})

describe('limits', () => {
  test('text is not drawn without a typesetter', () => {
    const picture = readSvg(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><text>a</text></svg>`, { baseline: 'origin', emPerUnit: 1 })
    expect(picture.ops).toHaveLength(0)
  })

  test(`a picture holding more than ${MAX_TEXT_CHARS} characters of text is refused`, () => {
    const text = `<text>${'a'.repeat(1000)}</text>`
    expect(() => read(text.repeat(MAX_TEXT_CHARS / 1000))).not.toThrow()
    expect(() => read(text.repeat(MAX_TEXT_CHARS / 1000) + '<text>a</text>')).toThrow(SvgError)
    // Collapsed white space doesn't count, up to a bound on what is read.
    expect(() => read(`<text>a${' '.repeat(50_000)}b</text>`)).not.toThrow()
    expect(() => read(`<text>a${' '.repeat(100_000)}b</text>`)).toThrow(SvgError)
  })
})

/** MathJax itself, as core/src/index.ts calls it. */
const mathjax: SvgTextTypesetter = run => {
  try {
    return typeset(svgTextTex(run), { display: false })
  } catch (error) {
    if (error instanceof GlyphError) return undefined
    throw error
  }
}

describe('the TeX a run becomes', () => {
  test('a run in \\text{}, bold and italic as \\textbf and \\textit', () => {
    expect(svgTextTex({ text: 'ab', bold: false, italic: false })).toBe('\\text{ab}')
    expect(svgTextTex({ text: 'ab', bold: true, italic: false })).toBe('\\text{\\textbf{ab}}')
    expect(svgTextTex({ text: 'ab', bold: true, italic: true })).toBe('\\text{\\textbf{\\textit{ab}}}')
    expect(svgTextTex({ text: 'a b', bold: false, italic: false })).toBe('\\text{a\\ b}')
  })

  const hostile = [
    '\\def\\x{y}\\x',
    '$x^2$ and \\(\\frac12\\)',
    '}\\rule{1em}{1em}{',
    '\\input{/etc/passwd}',
    '\\color{red}{red} \\href{http://x}{y}',
    '% a comment eats the rest',
    '#1 & ~ ^ _ { } \\\\',
    "``quotes'' and `single' --- dashes -- here",
    '\\textbf{not bold} \\verb|v|',
    '\\begin{array}{c}a\\end{array}',
    '\\ref{x} \\eqref{y} \\unicode{65}',
    'a\\',
    '\\'.repeat(200),
    '^'.repeat(200),
  ]
  test.each(hostile)('%j is drawn character for character: one outline each, nothing else', text => {
    for (const style of [
      { bold: false, italic: false },
      { bold: true, italic: true },
    ]) {
      const result = typeset(svgTextTex({ text, ...style }), { display: false })
      expect(result.ops.every(op => op.type === 'path')).toBe(true)
      expect(result.ops).toHaveLength([...text].filter(c => c !== ' ').length)
    }
  })

  test('drawn through readSvg, a hostile label’s characters all land on its line', () => {
    const picture = read(`<text x='10' y='20' font-size='10'>}\\rule{50em}{50em}{ $x$</text>`, mathjax)
    const b = boxes(picture)
    expect(glyphs(picture)).toHaveLength(22)
    expect(Math.min(...b.map(g => g.top))).toBeGreaterThan(10)
  })
})
