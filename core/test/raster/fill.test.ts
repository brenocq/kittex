import { describe, expect, test } from 'vitest'
import { Coverage } from '../../src/raster/fill.js'
import { type Contour, flattenPath } from '../../src/raster/path.js'
import type { Matrix } from '../../src/types.js'

const ID: Matrix = [1, 0, 0, 1, 0, 0]

/** Fills path data (pixels) into a w × h coverage and returns the alpha bytes. */
function render(d: string, w = 40, h = 40, m: Matrix = ID, sign = 1): Uint8Array {
  const cov = new Coverage(w, h)
  for (const c of flattenPath(d, m)) cov.fill(c, sign)
  return cov.toAlpha()
}

/** Total coverage in pixels. */
const area = (alpha: Uint8Array) => alpha.reduce((n, a) => n + a, 0) / 255

/** Rounding to bytes costs at most half a level per pixel. */
const tolerance = (alpha: Uint8Array) => (alpha.length * 0.5) / 255

function circle(cx: number, cy: number, r: number, clockwise = true): string {
  const s = clockwise ? 1 : 0
  return `M${cx - r} ${cy}A${r} ${r} 0 0 ${s} ${cx + r} ${cy}A${r} ${r} 0 0 ${s} ${cx - r} ${cy}Z`
}

describe('exact-area coverage', () => {
  test('an axis-aligned square at a fractional offset covers its area', () => {
    const alpha = render('M3.3 4.7H15.6V17.05H3.3Z')
    expect(area(alpha)).toBeCloseTo(12.3 * 12.35, 0)
    expect(Math.abs(area(alpha) - 12.3 * 12.35)).toBeLessThan(tolerance(alpha))
  })

  test('a unit square straddling four pixels gives each a quarter', () => {
    const alpha = render('M1.5 1.5h1v1h-1z', 4, 4)
    expect([...alpha]).toEqual([0, 0, 0, 0, 0, 64, 64, 0, 0, 64, 64, 0, 0, 0, 0, 0])
  })

  test('a rotated square, a triangle and a circle cover their geometric areas', () => {
    const cases: [string, number][] = [
      ['M20 3L37 20L20 37L3 20Z', 2 * 17 * 17],
      ['M2.25 3.5L35.75 9.1L12.4 33.3Z', Math.abs((35.75 - 2.25) * (33.3 - 3.5) - (12.4 - 2.25) * (9.1 - 3.5)) / 2],
      [circle(20.3, 19.6, 15.2), Math.PI * 15.2 * 15.2],
      [circle(20.3, 19.6, 15.2, false), Math.PI * 15.2 * 15.2],
    ]
    for (const [d, expected] of cases) {
      const alpha = render(d)
      // The circle is flattened within 0.05 px, so its polygon loses at most perimeter × 0.05.
      expect(Math.abs(area(alpha) - expected)).toBeLessThan(tolerance(alpha) + 2 * Math.PI * 15.2 * 0.05)
    }
  })

  test('a tiny shape inside one pixel gives that pixel its area', () => {
    const alpha = render('M2.2 1.1L2.8 1.1L2.5 1.9Z', 4, 4)
    expect(alpha[1 * 4 + 2]).toBe(Math.round(((0.6 * 0.8) / 2) * 255))
    expect(area(alpha) * 255).toBe(alpha[6])
  })

  test('both windings of the same shape give the same coverage', () => {
    const cw = render('M5.5 4.2L33 9L18 36Z')
    const ccw = render('M5.5 4.2L18 36L33 9Z')
    expect(ccw).toEqual(cw)
  })

  test('coverage is symmetric for a symmetric shape', () => {
    // A circle and a diamond centred on the middle of a 30 × 30 image.
    for (const d of [circle(15, 15, 11.3), 'M15 2.6L27.4 15L15 27.4L2.6 15Z']) {
      const alpha = render(d, 30, 30)
      for (let y = 0; y < 30; y++) {
        for (let x = 0; x < 30; x++) {
          const v = alpha[y * 30 + x]!
          expect(Math.abs(v - alpha[y * 30 + 29 - x]!)).toBeLessThanOrEqual(1)
          expect(Math.abs(v - alpha[(29 - y) * 30 + x]!)).toBeLessThanOrEqual(1)
          expect(Math.abs(v - alpha[x * 30 + y]!)).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  test('edges outside the image are clipped without changing what is inside', () => {
    // A square from -10 to 10 in a 5 × 5 image: everything inside is ink.
    expect([...render('M-10 -10H10V10H-10Z', 5, 5)]).toEqual(Array(25).fill(255))
    // A triangle cut by the left and right sides keeps its inside area.
    const alpha = render('M-20 0L30 0L5 20Z', 10, 20)
    let expected = 0
    for (let y = 0; y < 20; y++) {
      const half = ((20 - y - 0.5) / 20) * 25 // half-width at the row's middle
      expected += Math.max(0, Math.min(10, 5 + half) - Math.max(0, 5 - half))
    }
    expect(Math.abs(area(alpha) - expected)).toBeLessThan(tolerance(alpha) + 0.5)
  })
})

describe('nonzero winding', () => {
  const A = 'M5 5H25V25H5Z'
  const B = 'M15 15H35V35H15Z'
  test('overlapping contours wound the same way union without over-darkening', () => {
    const alpha = render(A + B)
    expect(Math.max(...alpha)).toBe(255)
    expect(area(alpha)).toBeCloseTo(400 + 400 - 100, 1)
  })

  test('a contour nested in one wound the same way fills (unlike even-odd)', () => {
    expect(area(render('M5 5H35V35H5Z M10 10H30V30H10Z'))).toBeCloseTo(900, 1)
  })

  test('an oppositely wound contour cuts a hole', () => {
    expect(area(render('M5 5H35V35H5Z M10 10V30H30V10Z'))).toBeCloseTo(900 - 400, 1)
  })

  test('opposite windings that overlap partly cancel only where both are', () => {
    // A clockwise and an anticlockwise square overlapping by 10 × 10: winding +1, 0, -1.
    const alpha = render(A + 'M15 15V35H35V15Z')
    expect(area(alpha)).toBeCloseTo(300 + 300, 1)
    expect(alpha[20 * 40 + 20]).toBe(0)
  })

  test('sign -1 counts the other winding as ink', () => {
    expect(render(A, 40, 40, ID, -1)).toEqual(render(A))
  })
})

describe('path data', () => {
  const points = (d: string, m: Matrix = ID): Contour[] => flattenPath(d, m).map(c => c.map(v => Math.round(v * 1e6) / 1e6))

  test('absolute and relative commands give the same polygon', () => {
    expect(points('m1 2 l3 0 0 4 -3 0 z')).toEqual(points('M1 2L4 2L4 6L1 6Z'))
    expect(points('M1 2h3v4h-3z')).toEqual(points('M1 2H4V6H1Z'))
    // Implicit lineto after a moveto, packed numbers and exponents.
    expect(points('M1,2 4,2,4,6 1,6z')).toEqual(points('M1 2L4 2L4 6L1 6Z'))
    expect(points('M.5.5L1e1.5L10-2.5e0Z')).toEqual([[0.5, 0.5, 10, 0.5, 10, -2.5]])
  })

  test('after Z, a relative command starts from the subpath start', () => {
    expect(points('M10 10h5v5zl-5 0 0 5z')).toEqual([
      [10, 10, 15, 10, 15, 15],
      [10, 10, 5, 10, 5, 15],
    ])
  })

  test('smooth curves reflect the previous control point', () => {
    const c = points('M0 0C0 10 10 10 10 0S20 -10 20 0Z')
    const s = points('M0 0C0 10 10 10 10 0C10 -10 20 -10 20 0Z')
    expect(c).toEqual(s)
    const t = points('M0 0Q5 10 10 0T20 0Z')
    const q = points('M0 0Q5 10 10 0Q15 -10 20 0Z')
    expect(t).toEqual(q)
    // S after a non-curve uses the current point as the first control point.
    expect(points('M0 0L1 0S5 10 10 0Z')).toEqual(points('M0 0L1 0C1 0 5 10 10 0Z'))
  })

  test('curves are flattened within a twentieth of a pixel', () => {
    const [c] = flattenPath('M0 0C0 40 40 40 40 0Z', ID)
    for (let i = 0; i + 3 < c!.length; i += 2) {
      // The midpoint of each chord lies close to the curve: check against the closest sample.
      const mx = (c![i]! + c![i + 2]!) / 2
      const my = (c![i + 1]! + c![i + 3]!) / 2
      let best = Infinity
      for (let k = 0; k <= 2000; k++) {
        const t = k / 2000
        const u = 1 - t
        const x = 3 * u * t * t * 40 + t * t * t * 40
        const y = 3 * u * u * t * 40 + 3 * u * t * t * 40
        best = Math.min(best, Math.hypot(x - mx, y - my))
      }
      expect(best).toBeLessThan(0.06)
    }
  })

  test('arcs with packed flags', () => {
    expect(points('M0 0a5 5 0 1010 0')).toEqual(points('M0 0A5 5 0 1 0 10 0'))
    const [c] = flattenPath('M0 0A5 5 0 0 1 10 0', ID)
    // A half circle above (sweep 1, y down): every point within radius 5 of (5, 0), y ≤ 0.
    for (let i = 0; i < c!.length; i += 2) {
      expect(Math.hypot(c![i]! - 5, c![i + 1]!)).toBeCloseTo(5, 1)
      expect(c![i + 1]!).toBeLessThanOrEqual(1e-9)
    }
  })

  test('the matrix maps every point', () => {
    expect(points('M1 2L3 2L3 5Z', [2, 0, 0, -3, 10, 20])).toEqual([[12, 14, 16, 14, 16, 5]])
    expect(points('M1 0L2 0L2 1Z', [0, 1, -1, 0, 0, 0])).toEqual([[0, 1, 0, 2, -1, 2]])
  })

  test('malformed data stops at the first bad token', () => {
    expect(points('M0 0L10 0L10 10L0 10Z M1 1 L5 x 9')).toEqual([[0, 0, 10, 0, 10, 10, 0, 10]])
    expect(points('')).toEqual([])
    expect(points('Q 1 2')).toEqual([])
  })
})
