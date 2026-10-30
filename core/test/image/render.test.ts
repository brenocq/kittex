import { describe, expect, test } from 'vitest'
import { texPicture } from '../../src/diagram/index.ts'
import { decodeImage } from '../../src/image/index.ts'
import { fitImageBlock, IMAGE_FILE_BYTES, type ImageBlock, MAX_IMAGE_PIXELS, measureImage, measureImageBlock, originalPng, pictureSource, readImageFile, renderImage, renderImageBlock, type ImageSource, type PictureEnv } from '../../src/index.ts'
import { fixture } from './make-png.ts'
import type { Picture } from '../../src/types.ts'

// 100 columns of 10 × 20 px cells (1000 px), 30 rows (600 px).
const ENV: PictureEnv = { cellWidth: 10, cellHeight: 20, maxColumns: 100, maxRows: 30, emPx: 20, ink: { r: 220, g: 220, b: 220 }, background: { r: 20, g: 20, b: 20 } }

/** A `width` × `height` bitmap source of pseudo-random opaque pixels (a photo's worth of entropy: PNG barely compresses it). */
function noise(width: number, height: number, seed = 12345): ImageSource {
  const rgba = new Uint8Array(width * height * 4)
  let s = seed
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

  test('an SVG file is its own width and height in CSS pixels, at two pixels per big point, its viewBox kept in proportion', () => {
    // 300 × 150 CSS px around a 3:1 viewBox: fitted inside (meet), 300 × 100 px, which is 225 × 75 bp.
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 30 10"><rect width="30" height="10"/></svg>'
    const source = readImageFile(new TextEncoder().encode(svg))
    if (source === 'pdf') throw new Error('read as a PDF')
    expect(source.kind).toBe('picture')
    expect(source.width).toBeCloseTo(450, 6)
    expect(source.height).toBeCloseTo(150, 6)
    // A 1000 px column leaves it at its own size (45 × 7.5 cells, renderPicture's layout adding at most a column), never upscaled.
    const cells = measureImage(source, {}, ENV)
    expect(cells.columns).toBeGreaterThanOrEqual(45)
    expect(cells.columns).toBeLessThanOrEqual(46)
    expect(cells.rows).toBe(8)
  })

  test("a PDF page (dvisvgm's SVG at a 10 pt em, as the plugin reads it) is sized as the same page read as an SVG file", () => {
    const page = '<svg xmlns="http://www.w3.org/2000/svg" width="50pt" height="40pt" viewBox="0 0 50 40"><path d="M10 10H40V30H10Z" fill="#00f"/></svg>'
    const pdf = pictureSource(texPicture(page, { baseline: 'bottom', fontSize: 10 }))
    const file = readImageFile(new TextEncoder().encode(page))
    if (file === 'pdf') throw new Error('read as a PDF')
    // 50 × 40 bp at two pixels per big point.
    expect(pdf.width).toBeCloseTo(100, 6)
    expect(pdf.height).toBeCloseTo(80, 6)
    expect([file.width, file.height].map(n => n.toFixed(6))).toEqual([pdf.width, pdf.height].map(n => n.toFixed(6)))
    expect(measureImage(pdf, {}, ENV)).toEqual(measureImage(file, {}, ENV))
  })

  test('an empty picture is refused', () => {
    expect(() => pictureSource({ ...box, width: 0 })).toThrow('the picture is empty')
  })

  test('copied as a PNG of its own: at its own size, in its own colours, not the terminal-adapted ones', () => {
    // A dark blue the dark terminal would lighten (adaptColor) on a transparent page.
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 30 10"><rect x="5" width="20" height="10" fill="#000040"/></svg>'
    const source = readImageFile(new TextEncoder().encode(svg))
    if (source === 'pdf') throw new Error('read as a PDF')
    const png = decodeImage(originalPng(source))
    expect([png.width, png.height]).toEqual([450, 150])
    const at = (x: number, y: number) => [...png.rgba.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)]
    expect(at(225, 75)).toEqual([0, 0, 64, 255])
    expect(at(10, 75)[3]).toBe(0)
    // The terminal's drawing of the same file adapts that blue to the dark background.
    const shown = decodeImage(renderImage(source, {}, ENV).png)
    const middle = (Math.floor(shown.height / 2) * shown.width + Math.floor(shown.width / 2)) * 4
    expect([...shown.rgba.subarray(middle, middle + 3)]).not.toEqual([0, 0, 64])
  })

  test('a bitmap file says which format it is, so it is copied as it is', () => {
    const png = readImageFile(fixture('interlaced-rgba8.png'))
    const jpeg = readImageFile(fixture('quad.jpg'))
    expect(png !== 'pdf' && png.kind === 'bitmap' ? png.format : undefined).toBe('png')
    expect(jpeg !== 'pdf' && jpeg.kind === 'bitmap' ? jpeg.format : undefined).toBe('jpeg')
  })

  test('a picture past MAX_IMAGE_PIXELS is copied scaled down to them, its proportions kept', () => {
    const huge = pictureSource({ ...box, width: 400, height: 200 })
    const png = decodeImage(originalPng(huge))
    expect(png.width * png.height).toBeLessThanOrEqual(MAX_IMAGE_PIXELS)
    expect(png.width * png.height).toBeGreaterThan(MAX_IMAGE_PIXELS * 0.99)
    expect(png.width / png.height).toBeCloseTo(huge.width / huge.height, 2)
  })
})

describe('renderImageBlock: several images as one picture', () => {
  /** A flat bitmap source of one colour. */
  const solid = (width: number, height: number, rgb: readonly [number, number, number]): ImageSource => {
    const rgba = new Uint8Array(width * height * 4)
    for (let i = 0; i < rgba.length; i += 4) rgba.set([...rgb, 255], i)
    return { kind: 'bitmap', width, height, bitmap: { width, height, rgba } }
  }
  const RED = [200, 0, 0] as const
  const BLUE = [0, 0, 200] as const
  const pair: ImageBlock = { rows: [[{ path: 'a.png' }, { path: 'b.png' }]] }
  const pixel = (image: { png: Uint8Array }) => {
    const drawn = decodeImage(image.png)
    return { drawn, at: (x: number, y: number) => [...drawn.rgba.subarray((y * drawn.width + x) * 4, (y * drawn.width + x) * 4 + 4)] }
  }

  test('two images side by side, the shorter centred on the row, a transparent gap between, the PNG its cells exactly', () => {
    // 200 × 100 and 200 × 50, 30 px apart (3% of 1000): 430 × 100 px, 43 columns and 5 rows exactly.
    const sources = [solid(200, 100, RED), solid(200, 50, BLUE)]
    expect(measureImageBlock(sources, pair, ENV)).toEqual({ columns: 43, rows: 5, scale: 1 })
    const image = renderImageBlock(sources, pair, ENV)
    expect(image).toMatchObject({ columns: 43, rows: 5, density: 1 })
    const { drawn, at } = pixel(image)
    expect([drawn.width, drawn.height]).toEqual([430, 100])
    expect([at(0, 0), at(199, 99), at(100, 50)]).toEqual([[...RED, 255], [...RED, 255], [...RED, 255]])
    expect([at(200, 50)[3], at(229, 50)[3]]).toEqual([0, 0])
    expect([at(230, 50), at(429, 50)]).toEqual([[...BLUE, 255], [...BLUE, 255]])
    // 50 px in 100: 25 transparent rows above and below.
    expect([at(330, 24)[3], at(330, 25)[3], at(330, 74)[3], at(330, 75)[3]]).toEqual([0, 255, 255, 0])
    // Each image's own cells: the red's 200 px are columns 0-19, the gap 20-22, the blue's 23-42; the blue's 50 px rows 1-3 of 5 (25 to 75 px, rounded).
    expect(image.cells).toEqual([
      { column: 0, row: 0, columns: 20, rows: 5 },
      { column: 23, row: 1, columns: 20, rows: 3 },
    ])
  })

  test("each image's cells follow it down a taller placeholder, and four images in two rows share no cell", () => {
    // 100 px in 140 (7 rows): 20 px above, so rows 1 to 6.
    const tall = renderImageBlock([solid(200, 100, RED), solid(200, 100, BLUE)], pair, ENV, 7)
    expect(tall.cells).toEqual([
      { column: 0, row: 1, columns: 20, rows: 5 },
      { column: 23, row: 1, columns: 20, rows: 5 },
    ])
    const grid: ImageBlock = { rows: [[{ path: 'a.png' }, { path: 'b.png' }], [{ path: 'c.png' }, { path: 'd.png' }]] }
    const cells = renderImageBlock([1, 2, 3, 4].map(() => solid(200, 100, RED)), grid, ENV).cells ?? []
    expect(cells).toHaveLength(4)
    const taken = new Set<string>()
    for (const one of cells) {
      for (let row = one.row; row < one.row + one.rows; row++) {
        for (let column = one.column; column < one.column + one.columns; column++) {
          expect(taken.has(`${column},${row}`)).toBe(false)
          taken.add(`${column},${row}`)
        }
      }
    }
    // Reading order: the second row's images below the first's.
    expect(cells[2]!.row).toBeGreaterThanOrEqual(cells[0]!.row + cells[0]!.rows)
    expect(cells[1]!.column).toBeGreaterThanOrEqual(cells[0]!.column + cells[0]!.columns)
  })

  test('the images are centred in their cells, at least minRows tall', () => {
    // 195 + 30 + 200 = 425 px in 43 columns (430): 2.5 px either side, rounded to 3 on the left.
    const image = renderImageBlock([solid(195, 100, RED), solid(200, 100, BLUE)], pair, ENV, 7)
    expect(image.rows).toBe(7)
    const { drawn, at } = pixel(image)
    expect([drawn.width, drawn.height]).toEqual([430, 140])
    // 100 px in 140: 20 rows above.
    expect([at(2, 70)[3], at(3, 70), at(100, 19)[3], at(100, 20)]).toEqual([0, [...RED, 255], 0, [...RED, 255]])
  })

  test('a picture takes its place beside a bitmap, in its colours, nothing of it outside', () => {
    // A 4 × 1 em black box: 79.7 × 19.9 px of its own, drawn at that size beside a 100 × 40 bitmap.
    const wide = pictureSource({ width: 4, height: 1, depth: 0, ops: [{ type: 'fill', d: 'M0 0H4V-1H0Z', transform: [1, 0, 0, 1, 0, 0], rule: 'nonzero', paint: { color: { r: 0, g: 0, b: 0 }, opacity: 1 } }], clips: [] })
    const sources = [solid(100, 40, RED), wide]
    const fit = fitImageBlock(sources, pair, { maxColumns: 100, maxRows: 30, cellWidth: 10, cellHeight: 20 })
    const image = renderImageBlock(sources, pair, ENV)
    const { drawn, at } = pixel(image)
    const left = Math.round((drawn.width - fit.widthPx) / 2)
    const top = Math.round((drawn.height - fit.heightPx) / 2)
    const place = fit.images[1]!
    // Ink in the middle of its place; nothing in the gap between the two images, nor below it.
    expect(at(left + place.x + Math.floor(place.widthPx / 2), top + place.y + Math.floor(place.heightPx / 2))[3]).toBeGreaterThan(200)
    expect(at(left + 100 + 15, top + 20)[3]).toBe(0)
    expect(at(left + place.x + Math.floor(place.widthPx / 2), top + place.y + place.heightPx + 2)[3]).toBe(0)
  })

  test('photos are drawn at fewer pixels until the one PNG fits, in the same cells', () => {
    // Four photos in two rows, each at its own size, fill the column and the 30 rows: 1000 × 600 px of noise, past what one PNG may hold.
    const grid: ImageBlock = { rows: [[{ path: 'a.png' }, { path: 'b.png' }], [{ path: 'c.png' }, { path: 'd.png' }]] }
    // Each its own noise: a copy of one beside it would be a repeat deflate finds along the scanline.
    const sources = [1, 2, 3, 4].map(seed => noise(485, 285, seed))
    const box = measureImageBlock(sources, grid, ENV)
    expect(box).toEqual({ columns: 100, rows: 30, scale: 1 })
    const image = renderImageBlock(sources, grid, ENV)
    expect(image.png.length).toBeLessThanOrEqual(IMAGE_FILE_BYTES)
    expect(image.density).toBeLessThan(1)
    expect([image.columns, image.rows]).toEqual([box.columns, box.rows])
    const half = renderImageBlock(sources, grid, ENV, image.rows, image.density / 2)
    expect(half.png.length).toBeLessThan(image.png.length / 2)
  })

  test('a lone image is drawn as renderImage draws it; the sources must match the images', () => {
    const lone: ImageBlock = { rows: [[{ path: 'a.png', width: { kind: 'line', fraction: 0.5 } }]] }
    const source = noise(300, 200)
    expect(renderImageBlock([source], lone, ENV).png).toEqual(renderImage(source, lone.rows[0]![0]!, ENV).png)
    // A picture too: its cells as renderPicture lays them out, its PNG as renderPicture encodes it; its one image covers them all.
    const picture = pictureSource({ width: 4, height: 1, depth: 0, ops: [{ type: 'fill', d: 'M0 0H4V-1H0Z', transform: [1, 0, 0, 1, 0, 0], rule: 'nonzero', paint: { color: { r: 0, g: 0, b: 0 }, opacity: 1 } }], clips: [] })
    const alone = renderImage(picture, lone.rows[0]![0]!, ENV)
    expect(renderImageBlock([picture], lone, ENV)).toEqual({ ...alone, cells: [{ column: 0, row: 0, columns: alone.columns, rows: alone.rows }] })
    expect(() => renderImageBlock([source], pair, ENV)).toThrow(RangeError)
  })
})
