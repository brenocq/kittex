import { describe, expect, test } from 'vitest'
import { decodeImage } from '../../src/image/index.ts'
import { IMAGE_FILE_BYTES, measureImage, pictureSource, renderImage, type ImageSource, type PictureEnv } from '../../src/index.ts'
import type { Picture } from '../../src/types.ts'

// 100 columns of 10 × 20 px cells (1000 px), 30 rows (600 px).
const ENV: PictureEnv = { cellWidth: 10, cellHeight: 20, maxColumns: 100, maxRows: 30, emPx: 20, ink: { r: 220, g: 220, b: 220 }, background: { r: 20, g: 20, b: 20 } }

/** A `width` × `height` bitmap source of pseudo-random opaque pixels (a photo's worth of entropy: PNG barely compresses it). */
function noise(width: number, height: number): ImageSource {
  const rgba = new Uint8Array(width * height * 4)
  let s = 12345
  for (let i = 0; i < rgba.length; i++) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0
    rgba[i] = i % 4 === 3 ? 255 : s >>> 24
  }
  return { kind: 'bitmap', width, height, bitmap: { width, height, rgba } }
}

/** A flat-colour bitmap source: a plot's worth (it compresses to almost nothing). */
function flat(width: number, height: number): ImageSource {
  const rgba = new Uint8Array(width * height * 4).fill(255)
  return { kind: 'bitmap', width, height, bitmap: { width, height, rgba } }
}

describe('renderImage: a bitmap', () => {
  test('a small image is drawn at full density: the PNG is its cells exactly, the pixels centred, the rest transparent', () => {
    const image = renderImage(flat(95, 30), {}, ENV)
    expect(image).toMatchObject({ columns: 10, rows: 2, density: 1 })
    const drawn = decodeImage(image.png)
    expect([drawn.width, drawn.height]).toEqual([100, 40])
    const alpha = (x: number, y: number) => drawn.rgba[(y * drawn.width + x) * 4 + 3]
    // 95 px in 100: two blank columns on the left, three on the right; 30 px in 40: five blank rows above.
    expect([alpha(1, 20), alpha(2, 20), alpha(96, 20), alpha(97, 20)]).toEqual([0, 255, 255, 0])
    expect([alpha(50, 4), alpha(50, 5), alpha(50, 34), alpha(50, 35)]).toEqual([0, 255, 255, 0])
  })

  test('a photo is drawn at fewer pixels until its PNG fits, in the same cells', () => {
    const photo = noise(1600, 1000)
    const box = measureImage(photo, {}, ENV)
    // As wide as the column: 1000 px, 625 px tall capped to the 30 rows' 600 px (960 × 600).
    expect(box).toEqual({ columns: 96, rows: 30, scale: 1 })
    const image = renderImage(photo, {}, ENV)
    expect(image.png.length).toBeLessThanOrEqual(IMAGE_FILE_BYTES)
    expect(image.density).toBeLessThan(1)
    expect([image.columns, image.rows]).toEqual([box.columns, box.rows])
    const drawn = decodeImage(image.png)
    expect(drawn.width).toBe(Math.round(96 * 10 * image.density))
  })

  test('drawn again at a lower density for the drawing budget: fewer bytes, the same cells', () => {
    const photo = noise(400, 200)
    const full = renderImage(photo, {}, ENV)
    const half = renderImage(photo, {}, ENV, full.rows, full.density / 2)
    expect(half.png.length).toBeLessThan(full.png.length / 2)
    expect([half.columns, half.rows]).toEqual([full.columns, full.rows])
  })

  test('at least minRows tall (a streaming placeholder taller than the image)', () => {
    const image = renderImage(flat(95, 30), {}, ENV, 5)
    expect(image.rows).toBe(5)
    expect(decodeImage(image.png).height).toBe(100)
  })
})

describe('an image file as a picture (SVG, a PDF page)', () => {
  // A 2 × 1 em black box: 39.85 × 19.93 px of its own (two pixels per big point).
  const box: Picture = { width: 2, height: 1, depth: 0, ops: [{ type: 'fill', d: 'M0 0H2V-1H0Z', transform: [1, 0, 0, 1, 0, 0], rule: 'nonzero', paint: { color: { r: 0, g: 0, b: 0 }, opacity: 1 } }], clips: [] }

  test('sized by its block like a bitmap: the width asked for, never past its own size', () => {
    const source = pictureSource(box)
    expect(source.width).toBeCloseTo(39.85, 1)
    const own = measureImage(source, {}, ENV)
    expect(own.columns).toBeLessThanOrEqual(5)
    const wide = measureImage(pictureSource({ ...box, width: 200, height: 50 }), { width: { kind: 'line', fraction: 0.5 } }, ENV)
    expect(wide.columns).toBeGreaterThanOrEqual(50)
    expect(wide.columns).toBeLessThanOrEqual(51)
    const image = renderImage(pictureSource({ ...box, width: 200, height: 50 }), { width: { kind: 'line', fraction: 0.5 } }, ENV)
    expect([image.columns, image.rows]).toEqual([wide.columns, wide.rows])
  })

  test('an empty picture is refused', () => {
    expect(() => pictureSource({ ...box, width: 0 })).toThrow('the picture is empty')
  })
})
