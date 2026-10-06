// Inline formulas as one-row images: drawn on the terminal font's baseline,
// scaled down only a little to fit the row, refused (left to Unicode) beyond.
import { describe, expect, test } from 'vitest'
import { emPxForCell, init, measureInline, MIN_INLINE_SCALE, rasterize, renderInline, typeset } from '../src/index.js'

const cell = { cellWidth: 13, cellHeight: 26 }
// The baseline of DejaVu Sans Mono in kitty's 13×26 cells, measured: 21 px down.
const env = { ...cell, maxColumns: 100, emPx: emPxForCell(cell), ink: { r: 235, g: 219, b: 178 }, baselinePx: 21 }

describe('measureInline', () => {
  test('a short formula is one row at full size', async () => {
    await init()
    expect(measureInline('x', env)).toEqual({ columns: 2, rows: 1, scale: 1 })
    expect(measureInline('E = mc^2', env)).toMatchObject({ rows: 1, columns: 8 })
  })

  test('a taller one is scaled down a little, never below MIN_INLINE_SCALE', async () => {
    await init()
    for (const tex of ['x^2', 'y', '\\sqrt{2}', 'e^{-x^2}', '\\alpha \\le \\beta']) {
      const box = measureInline(tex, env)
      expect(box, tex).not.toBeNull()
      expect(box!.rows).toBe(1)
      expect(box!.scale).toBeGreaterThanOrEqual(MIN_INLINE_SCALE)
    }
  })

  test('one that would need more stays Unicode (null)', async () => {
    await init()
    for (const tex of ['\\frac{a}{b}', '\\sum_{i=1}^n a_i', '\\int_0^1 f', 'f(x)', '\\begin{pmatrix}a\\\\b\\end{pmatrix}']) {
      expect(measureInline(tex, env), tex).toBeNull()
    }
  })

  test('a formula MathJax refuses stays Unicode', async () => {
    await init()
    expect(measureInline('\\frac{', env)).toBeNull()
  })
})

describe('renderInline', () => {
  test('one row, the asked columns, the formula resting on the baseline', async () => {
    await init()
    const image = renderInline('x', env, 3)
    expect([image.columns, image.rows]).toEqual([3, 1])
    const ihdr = new DataView(image.png.buffer, image.png.byteOffset + 16, 8)
    expect([ihdr.getUint32(0), ihdr.getUint32(4)]).toEqual([39, 26])
    // The same raster: the x ends on the baseline (its serifs, 0.011 em deep, and the
    // stroke weight darken the row under it a little more than half).
    const r = rasterize(typeset('x', { display: false }), {
      emPx: env.emPx,
      cellWidth: 13,
      cellHeight: 26,
      maxColumns: 3,
      align: 'center',
      minRows: 1,
      baselinePx: 21,
    })
    expect(r.baselinePx).toBe(21)
    let lowest = -1
    for (let y = 0; y < r.heightPx; y++) for (let x = 0; x < r.widthPx; x++) if (r.alpha[y * r.widthPx + x]! > 128) lowest = Math.max(lowest, y)
    expect([20, 21]).toContain(lowest)
  })
})
