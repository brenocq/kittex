import { once } from 'node:events'
import { createDeflate } from 'node:zlib'
import { zlibSync } from 'fflate'
import { describe, expect, test } from 'vitest'
import { decodeImage, ImageError, MAX_IMAGE_PIXELS } from '../../src/image/index.js'
import { CHANNELS, chunk, fixture, ihdr, makePng, pngFile, samples, scanlines } from './make-png.js'

const W = 7
const H = 5

/** Stored sample -> 8 bits, the PNG spec's scaling (v × 255 / max, rounded). */
const to8 = (v: number, depth: number) => Math.round((v * 255) / (2 ** depth - 1))

function randomSamples(colorType: number, depth: number, seed: number, max = 2 ** depth - 1): number[][] {
  const next = samples(seed)
  return Array.from({ length: H }, () => Array.from({ length: W * CHANNELS[colorType]! }, () => next() % (max + 1)))
}

/** The RGBA a decoder must produce from `rows` of stored samples, worked out pixel by pixel. */
function expectedRgba(colorType: number, depth: number, rows: number[][], plte?: Uint8Array, trns?: Uint8Array): number[] {
  const out: number[] = []
  for (const row of rows) {
    for (let x = 0; x < W; x++) {
      const s = (c: number) => row[x * CHANNELS[colorType]! + c]!
      if (colorType === 0) out.push(to8(s(0), depth), to8(s(0), depth), to8(s(0), depth), 255)
      if (colorType === 2) out.push(to8(s(0), depth), to8(s(1), depth), to8(s(2), depth), 255)
      if (colorType === 3) out.push(plte![s(0) * 3]!, plte![s(0) * 3 + 1]!, plte![s(0) * 3 + 2]!, trns?.[s(0)] ?? 255)
      if (colorType === 4) out.push(to8(s(0), depth), to8(s(0), depth), to8(s(0), depth), to8(s(1), depth))
      if (colorType === 6) out.push(to8(s(0), depth), to8(s(1), depth), to8(s(2), depth), to8(s(3), depth))
    }
  }
  return out
}

const MATRIX: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [0, 4],
  [0, 8],
  [0, 16],
  [2, 8],
  [2, 16],
  [3, 1],
  [3, 2],
  [3, 4],
  [3, 8],
  [4, 8],
  [4, 16],
  [6, 8],
  [6, 16],
]

describe('decodeImage: PNG', () => {
  test.each(MATRIX)('colour type %i at %i bits decodes every pixel', (colorType, depth) => {
    const plte = colorType === 3 ? Uint8Array.from({ length: 256 * 3 }, (_, i) => (i * 37 + 11) & 255) : undefined
    const rows = randomSamples(colorType, depth, colorType * 100 + depth)
    const bitmap = decodeImage(makePng({ width: W, height: H, depth, colorType, samples: rows, ...(plte ? { plte } : {}) }))
    expect([bitmap.width, bitmap.height]).toEqual([W, H])
    expect(Array.from(bitmap.rgba)).toEqual(expectedRgba(colorType, depth, rows, plte))
  })

  test('16-bit samples round to the nearest 8-bit value, not the high byte', () => {
    // 0x12ff / 257 = 18.6: rounds to 19, where the high byte alone would give 18.
    const rows = Array.from({ length: H }, () => Array.from({ length: W }, () => 0x12ff))
    const bitmap = decodeImage(makePng({ width: W, height: H, depth: 16, colorType: 0, samples: rows }))
    expect(Array.from(bitmap.rgba.subarray(0, 4))).toEqual([19, 19, 19, 255])
  })

  test('palette with a tRNS shorter than the palette: listed entries take its alpha, the rest are opaque', () => {
    const plte = Uint8Array.of(10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120)
    const trns = Uint8Array.of(0, 128)
    const rows = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x + y) % 4))
    const bitmap = decodeImage(makePng({ width: W, height: H, depth: 2, colorType: 3, samples: rows, plte, trns }))
    expect(Array.from(bitmap.rgba)).toEqual(expectedRgba(3, 2, rows, plte, trns))
    expect(Array.from(bitmap.rgba.subarray(0, 12))).toEqual([10, 20, 30, 0, 40, 50, 60, 128, 70, 80, 90, 255])
  })

  test('gray tRNS makes the key gray transparent, compared at the stored bit depth', () => {
    const rows = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x + y) % 16))
    const bitmap = decodeImage(makePng({ width: W, height: H, depth: 4, colorType: 0, samples: rows, trns: Uint8Array.of(0, 5) }))
    const alphas = rows.flat().map((v) => (v === 5 ? 0 : 255))
    expect(Array.from(bitmap.rgba.filter((_, i) => i % 4 === 3))).toEqual(alphas)
  })

  test('RGB tRNS makes only the exact 16-bit key colour transparent', () => {
    const key = [0x1234, 0xabcd, 0x0001]
    const rows = Array.from({ length: H }, (_, y) =>
      Array.from({ length: W }, (_, x) => ((x + y) % 3 === 0 ? key : (x + y) % 3 === 1 ? [0x1234, 0xabcd, 0x0002] : [0, 0, 0])).flat(),
    )
    const trns = Uint8Array.of(0x12, 0x34, 0xab, 0xcd, 0x00, 0x01)
    const bitmap = decodeImage(makePng({ width: W, height: H, depth: 16, colorType: 2, samples: rows, trns }))
    const alphas = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => ((x + y) % 3 === 0 ? 0 : 255))).flat()
    expect(Array.from(bitmap.rgba.filter((_, i) => i % 4 === 3))).toEqual(alphas)
  })
})

describe('decodeImage: interlaced PNG (written by ImageMagick)', () => {
  const pattern = fixture('pattern.rgba')

  test('RGBA 8-bit', () => {
    const bitmap = decodeImage(fixture('interlaced-rgba8.png'))
    expect([bitmap.width, bitmap.height]).toEqual([13, 11])
    expect(Array.from(bitmap.rgba)).toEqual(Array.from(pattern))
  })

  test('RGBA 16-bit', () => {
    expect(Array.from(decodeImage(fixture('interlaced-rgba16.png')).rgba)).toEqual(Array.from(pattern))
  })

  test('palette 4-bit with tRNS', () => {
    const want = fixture('palette.rgba')
    const got = decodeImage(fixture('interlaced-palette4.png')).rgba
    for (let i = 0; i < want.length; i += 4) {
      expect(got[i + 3]).toBe(want[i + 3])
      // A fully transparent pixel's colour is whatever the palette entry holds.
      if (want[i + 3]! > 0) expect(Array.from(got.subarray(i, i + 3))).toEqual(Array.from(want.subarray(i, i + 3)))
    }
  })

  test('gray 1-bit', () => {
    const gray = fixture('bw.gray')
    const got = decodeImage(fixture('interlaced-gray1.png')).rgba
    expect(Array.from(got)).toEqual(Array.from(gray).flatMap((g) => [g, g, g, 255]))
  })
})

describe('decodeImage: the pixel cap', () => {
  const gray = (width: number, height: number) =>
    makePng({ width, height, depth: 8, colorType: 0, samples: Array.from({ length: height }, () => new Array<number>(width).fill(7)) })

  test('a PNG at the cap decodes, one pixel over throws', () => {
    expect(decodeImage(gray(100, 50), { maxPixels: 5000 }).width).toBe(100)
    expect(() => decodeImage(gray(100, 50), { maxPixels: 4999 })).toThrow(/cap/)
    expect(() => decodeImage(gray(100, 50), { maxPixels: 4999 })).toThrow(ImageError)
  })

  test('a header claiming a huge image throws before anything is allocated', () => {
    const huge = pngFile(ihdr(100_000, 100_000, 8, 6), chunk('IDAT', zlibSync(new Uint8Array(10))))
    expect(100_000 * 100_000).toBeGreaterThan(MAX_IMAGE_PIXELS)
    expect(() => decodeImage(huge)).toThrow(/cap/)
  })
})

describe('decodeImage: corrupt PNG', () => {
  const good = makePng({ width: W, height: H, depth: 8, colorType: 6, samples: randomSamples(6, 8, 1) })

  test('every truncation throws ImageError or (past the image data) still decodes the whole image', () => {
    const idatEnd = good.length - 12 // the IEND chunk
    for (let n = 0; n < good.length; n++) {
      const cut = good.subarray(0, n)
      if (n < idatEnd) expect(() => decodeImage(cut), `cut at ${n}`).toThrow(ImageError)
      else expect(decodeImage(cut).rgba.length).toBe(W * H * 4)
    }
  })

  test('flipped bytes throw ImageError or decode at the header size, never anything else', () => {
    for (let at = 8; at < good.length; at++) {
      for (const flip of [0x01, 0x80, 0xff]) {
        const bad = good.slice()
        bad[at]! ^= flip
        try {
          const bitmap = decodeImage(bad)
          expect(bitmap.rgba.length).toBe(bitmap.width * bitmap.height * 4)
        } catch (error) {
          expect(error, `byte ${at} ^ ${flip}`).toBeInstanceOf(ImageError)
        }
      }
    }
  })

  test('an unknown filter type throws', () => {
    const raw = scanlines({ width: W, height: H, depth: 8, colorType: 0, samples: randomSamples(0, 8, 2) })
    raw[0] = 5
    expect(() => decodeImage(pngFile(ihdr(W, H, 8, 0), chunk('IDAT', zlibSync(raw))))).toThrow(/filter type 5/)
  })

  test('image data that inflates to more than the header allows throws (a zlib bomb)', () => {
    const raw = scanlines({ width: W, height: H, depth: 8, colorType: 0, samples: randomSamples(0, 8, 3) })
    const bomb = new Uint8Array(raw.length + 1_000_000)
    bomb.set(raw)
    expect(() => decodeImage(pngFile(ihdr(W, H, 8, 0), chunk('IDAT', zlibSync(bomb))))).toThrow(/inflates to/)
  })

  test('a zlib bomb is refused in well under 100 ms, not inflated whole first', async () => {
    // 256 MiB of zeros, about 250 KB deflated, streamed so the test never holds the inflated bytes.
    const deflate = createDeflate({ level: 9 })
    const parts: Buffer[] = []
    deflate.on('data', (part: Buffer) => parts.push(part))
    const zeros = Buffer.alloc(1 << 20)
    for (let i = 0; i < 256; i++) if (!deflate.write(zeros)) await once(deflate, 'drain')
    deflate.end()
    await once(deflate, 'end')
    const bomb = pngFile(ihdr(W, H, 8, 0), chunk('IDAT', Buffer.concat(parts)))
    const start = performance.now()
    expect(() => decodeImage(bomb)).toThrow(/inflates to more than/)
    expect(performance.now() - start).toBeLessThan(100)
  })

  test('image data that inflates to less than the header needs throws', () => {
    const raw = scanlines({ width: W, height: H, depth: 8, colorType: 0, samples: randomSamples(0, 8, 4) })
    expect(() => decodeImage(pngFile(ihdr(W, H, 8, 0), chunk('IDAT', zlibSync(raw.subarray(0, raw.length - 1)))))).toThrow(/inflates to/)
  })

  test('a palette image without PLTE, an invalid depth, and a file of no known format throw', () => {
    const raw = zlibSync(scanlines({ width: W, height: H, depth: 8, colorType: 3, samples: randomSamples(3, 8, 5, 3) }))
    expect(() => decodeImage(pngFile(ihdr(W, H, 8, 3), chunk('IDAT', raw)))).toThrow(/PLTE/)
    expect(() => decodeImage(pngFile(ihdr(W, H, 3, 0), chunk('IDAT', raw)))).toThrow(/3 bits/)
    expect(() => decodeImage(new TextEncoder().encode('hello'))).toThrow(ImageError)
    expect(() => decodeImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toThrow(/does not decode svg/)
  })
})
