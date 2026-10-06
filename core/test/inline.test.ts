// Inline formulas as one-row images: drawn on the terminal font's baseline,
// scaled down only a little to fit the row, refused (left to Unicode) beyond.
import { unzlibSync } from 'fflate'
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
    // A parenthesis moves the baseline a pixel rather than shrink further.
    for (const tex of ['x^2', 'y', '\\sqrt{2}', 'e^{-x^2}', '\\alpha \\le \\beta', 'f(x)', 'O(n \\log n)', '\\dot{\\theta}']) {
      const box = measureInline(tex, env)
      expect(box, tex).not.toBeNull()
      expect(box!.rows).toBe(1)
      expect(box!.scale).toBeGreaterThanOrEqual(MIN_INLINE_SCALE)
    }
  })

  test('a subscript with a descender fits on the baseline the plugin uses (20 of 26 px) by moving it up a pixel', async () => {
    await init()
    for (const tex of ['a_{ij}', 'p_j', 'g_{jk}']) {
      const box = measureInline(tex, { ...env, baselinePx: 20 })
      expect(box, tex).not.toBeNull()
      expect(box!.scale).toBeGreaterThan(0.9)
    }
  })

  test('one that would need more stays Unicode (null)', async () => {
    await init()
    for (const tex of ['\\frac{a}{b}', '\\sum_{i=1}^n a_i', '\\int_0^1 f', '\\begin{pmatrix}a\\\\b\\end{pmatrix}']) {
      expect(measureInline(tex, env), tex).toBeNull()
    }
  })

  test('a formula MathJax refuses stays Unicode', async () => {
    await init()
    expect(measureInline('\\frac{', env)).toBeNull()
  })
})

/** The blank pixel columns left and right of an inline image's ink (a kittex palette PNG: index = alpha, filter None). */
function margins(png: Uint8Array): { width: number; left: number; right: number } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  let at = 8
  while (String.fromCharCode(...png.subarray(at + 4, at + 8)) !== 'IDAT') at += 12 + view.getUint32(at)
  const raw = unzlibSync(png.subarray(at + 8, at + 8 + view.getUint32(at)))
  let x0 = width
  let x1 = -1
  for (let y = 0; y < height; y++) {
    expect(raw[y * (width + 1)]).toBe(0)
    for (let x = 0; x < width; x++) {
      if (raw[y * (width + 1) + 1 + x]! > 0) {
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
      }
    }
  }
  return { width, left: x0, right: width - 1 - x1 }
}

describe('renderInline', () => {
  test('centred in a slot wider than the formula', async () => {
    await init()
    const image = renderInline('x', env, 4)
    expect([image.columns, image.rows]).toEqual([4, 1])
    const { width, left, right } = margins(image.png)
    expect(width).toBe(52)
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1)
    expect(left).toBeGreaterThan(13)
  })

  // The whole cells an image takes leave part of one blank: drawn at the
  // slot's left end all of it fell before the next character, `(𝑦𝑤 )` (12 of
  // y_w's 39 px at 13×26, against 1 px on the left).
  test('the blank a narrow formula leaves in its cells is split evenly between both sides', async () => {
    await init()
    for (const geometry of [{ cellWidth: 13, cellHeight: 26 }, { cellWidth: 10, cellHeight: 20 }, { cellWidth: 9, cellHeight: 18 }]) {
      const at = { ...env, ...geometry, emPx: emPxForCell(geometry), baselinePx: Math.round((geometry.cellHeight * 20) / 26) }
      for (const tex of ['y_w', 'y_l', 'x_k', 'E = mc^2', 'a^2 + b^2 = c^2']) {
        const box = measureInline(tex, at)!
        const { width, left, right } = margins(renderInline(tex, at, box.columns).png)
        expect({ tex, geometry, width }).toEqual({ tex, geometry, width: box.columns * geometry.cellWidth })
        expect({ tex, geometry, unevenBy: Math.abs(left - right) <= 1 }).toEqual({ tex, geometry, unevenBy: true })
      }
    }
  })

  test('an image is as narrow as its drawn ink needs, not its advance width', async () => {
    await init()
    const at = { ...env, baselinePx: 20 }
    // x_k's and x²'s advance (subscript space, italic correction) is past two cells; their ink is not.
    expect(measureInline('x_k', at)!.columns).toBe(2)
    expect(measureInline('x^2', at)!.columns).toBe(2)
    for (const tex of ['x', 'y_w', 'y_l', 'x_k', 'x^2', 'E = mc^2', 'a^2 + b^2 = c^2', '\\beta', 'a_{ij}', 'f(x)']) {
      const box = measureInline(tex, at)!
      const { width, left, right } = margins(renderInline(tex, at, box.columns).png)
      // Never cut: the ink fits.
      expect({ tex, fits: left >= 0 && right >= 0, width }).toEqual({ tex, fits: true, width: box.columns * 13 })
      // And never a whole cell to spare (a pixel more where the formula is scaled to fit the row).
      expect({ tex, spare: left + right < (box.scale < 1 ? 15 : 13) }).toEqual({ tex, spare: true })
    }
  })

  test('the ink goes against the right edge (end) or the left one (start) when asked', async () => {
    await init()
    for (const [tex, columns] of [['y_l', 2], ['\\pi_{\\text{ref}}', 5], ['x', 3]] as const) {
      const centre = margins(renderInline(tex, env, columns).png)
      const end = margins(renderInline(tex, env, columns, 'end').png)
      const start = margins(renderInline(tex, env, columns, 'start').png)
      expect({ tex, end: end.right <= 1, start: start.left <= 1 }).toEqual({ tex, end: true, start: true })
      // The same ink, moved: its blank all on one side.
      expect(end.left + end.right).toBe(centre.left + centre.right)
      expect(start.left + start.right).toBe(centre.left + centre.right)
    }
  })

  test('a slot set by a wider preview has the formula in its middle', async () => {
    await init()
    // π_θ(y_w|x) streams as 10 cells of Unicode; its image needs 7.
    const tex = '\\pi_\\theta(y_w|x)'
    expect(measureInline(tex, env)!.columns).toBe(7)
    const { width, left, right } = margins(renderInline(tex, env, 10).png)
    expect(width).toBe(130)
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1)
    expect(left).toBeGreaterThanOrEqual(13)
  })

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

describe('ink past the row', () => {
  // kitty's 13×26 and 9×18 px cells, the math baseline a pixel above the font's (20/26).
  const at = (cellWidth: number, cellHeight: number) => ({
    cellWidth,
    cellHeight,
    maxColumns: 100,
    emPx: emPxForCell({ cellWidth, cellHeight }),
    ink: { r: 235, g: 219, b: 178 },
    baselinePx: Math.round((cellHeight * 20) / 26),
  })

  test('a bar in a subscript is drawn at the floor, its tip past the row', async () => {
    await init()
    for (const geometry of [at(13, 26), at(9, 18)]) {
      for (const tex of ['P_{k|k-1}', '\\hat{x}_{0|0}', 'h(\\hat{x}_{k|k-1})']) {
        expect({ tex, scale: measureInline(tex, geometry)?.scale }).toEqual({ tex, scale: MIN_INLINE_SCALE })
      }
    }
  })

  test('formulas that fit keep their scale', async () => {
    await init()
    expect(measureInline('F_k', at(13, 26))?.scale).toBe(1)
    expect(measureInline('f(x)', at(13, 26))?.scale).toBeGreaterThan(0.95)
  })

  test('a cut through a letter is refused: a stacked fraction stays text at 13×26', async () => {
    await init()
    expect(measureInline('\\frac{a}{b}', at(13, 26))).toBeNull()
  })
})
