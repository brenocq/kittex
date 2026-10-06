import { describe, expect, test } from 'vitest'
import { apply, clipPolygon, flatten, multiply, parsePath, parseTransform, signedArea } from '../../src/typeset/geometry.js'

describe('parseTransform', () => {
  test('composes left to right like SVG', () => {
    const m = parseTransform('translate(10, 20) scale(2,-1)')
    expect(apply(m, 1, 1)).toEqual([12, 19])
    expect(parseTransform('matrix(1 0 0 -1 0 0) scale(0.5)')).toEqual([0.5, 0, 0, -0.5, 0, 0])
    expect(parseTransform('translate(5)')).toEqual([1, 0, 0, 1, 5, 0])
  })

  test('rotates about a point', () => {
    const [x, y] = apply(parseTransform('rotate(90 1 1)'), 2, 1)
    expect(x).toBeCloseTo(1)
    expect(y).toBeCloseTo(2)
  })

  test('multiply applies the right matrix first', () => {
    const m = multiply([2, 0, 0, 2, 0, 0], [1, 0, 0, 1, 3, 0])
    expect(apply(m, 0, 0)).toEqual([6, 0])
  })
})

describe('parsePath', () => {
  test('relative and shorthand commands become absolute M/L/C/Z', () => {
    const segments = parsePath('M10 10l5 0h5v5H10zm1 1 2 2')
    expect(segments).toEqual([
      { c: 'M', x: 10, y: 10 },
      { c: 'L', x: 15, y: 10 },
      { c: 'L', x: 20, y: 10 },
      { c: 'L', x: 20, y: 15 },
      { c: 'L', x: 10, y: 15 },
      { c: 'Z' },
      { c: 'M', x: 11, y: 11 },
      { c: 'L', x: 13, y: 13 },
    ])
  })

  test('numbers without separators, as MathJax writes them', () => {
    expect(parsePath('M1-2L.5.5')).toEqual([
      { c: 'M', x: 1, y: -2 },
      { c: 'L', x: 0.5, y: 0.5 },
    ])
  })

  test('quadratics are raised to cubics with the same ends', () => {
    const [, q] = parsePath('M0 0Q3 3 6 0')
    expect(q).toEqual({ c: 'C', x1: 2, y1: 2, x2: 4, y2: 2, x: 6, y: 0 })
  })
})

describe('clipPolygon', () => {
  const square = flatten(parsePath('M0 0L10 0L10 10L0 10Z'))[0]!.points

  test('clips to the box and keeps orientation', () => {
    const clipped = clipPolygon(square, [5, -1, 20, 4])
    expect(Math.abs(signedArea(clipped))).toBeCloseTo(20)
    expect(Math.sign(signedArea(clipped))).toBe(Math.sign(signedArea(square)))
  })

  test('outside is empty', () => {
    expect(clipPolygon(square, [20, 20, 30, 30])).toEqual([])
  })
})
