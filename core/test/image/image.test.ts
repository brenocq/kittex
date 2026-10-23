import { inflateSync } from 'node:zlib'
import { describe, expect, test } from 'vitest'
import { type Bitmap, decodeImage, encodeRgbaPng, ImageError, imageHeader, scaleBitmap } from '../../src/image/index.js'
import { fixture, samples } from './make-png.js'

const RED = [220, 30, 30]
const BLUE = [30, 30, 220]
const GREEN = [30, 200, 30]
const WHITE = [250, 250, 250]

const pixel = (b: Bitmap, x: number, y: number) => Array.from(b.rgba.subarray((y * b.width + x) * 4, (y * b.width + x) * 4 + 4))

function expectNear(got: number[], want: number[], tolerance: number, label = ''): void {
  got.forEach((v, i) => expect(Math.abs(v - want[i]!), `${label} channel ${i}: ${got} vs ${want}`).toBeLessThanOrEqual(tolerance))
}

describe('decodeImage: JPEG (written by Pillow)', () => {
  test.each(['quad.jpg', 'quad-progressive.jpg'])('%s: each quadrant keeps its colour', (name) => {
    const b = decodeImage(fixture(name))
    expect([b.width, b.height]).toEqual([32, 16])
    expectNear(pixel(b, 4, 4), [...RED, 255], 6, 'top left')
    expectNear(pixel(b, 27, 4), [...BLUE, 255], 6, 'top right')
    expectNear(pixel(b, 4, 12), [...GREEN, 255], 6, 'bottom left')
    expectNear(pixel(b, 27, 12), [...WHITE, 255], 6, 'bottom right')
  })

  test('grayscale JPEG decodes to gray RGBA', () => {
    const b = decodeImage(fixture('quad-gray.jpg'))
    const [r, g, bl, a] = pixel(b, 4, 4)
    expect([g, bl, a]).toEqual([r, r, 255])
    expectNear([r!], [Math.round(0.299 * 220 + 0.587 * 30 + 0.114 * 30)], 6)
  })

  test.each([1, 2, 3, 4, 5, 6, 7, 8])('EXIF orientation %i turns the picture upright as Pillow does', (n) => {
    const got = decodeImage(fixture(`orient-${n}.jpg`))
    const want = decodeImage(fixture(`orient-${n}.png`))
    expect([got.width, got.height]).toEqual([want.width, want.height])
    // Sample each quadrant's middle, away from the block edges where two decoders' rounding differs most.
    for (const [x, y] of [
      [want.width / 4, want.height / 4],
      [(3 * want.width) / 4, want.height / 4],
      [want.width / 4, (3 * want.height) / 4],
      [(3 * want.width) / 4, (3 * want.height) / 4],
    ] as const) {
      expectNear(pixel(got, x, y), pixel(want, x, y), 8, `orientation ${n} at ${x},${y}`)
    }
  })

  test('truncated and corrupt JPEGs throw ImageError or decode at the header size, never anything else', () => {
    const good = fixture('quad-progressive.jpg')
    const inputs = [...Array.from({ length: good.length }, (_, n) => good.subarray(0, n))]
    for (let at = 2; at < good.length; at += 3) {
      const bad = good.slice()
      bad[at]! ^= 0x5a
      inputs.push(bad)
    }
    for (const input of inputs) {
      try {
        const b = decodeImage(input)
        expect(b.rgba.length).toBe(b.width * b.height * 4)
      } catch (error) {
        expect(error).toBeInstanceOf(ImageError)
      }
    }
    expect(() => decodeImage(good.subarray(0, 100))).toThrow(ImageError)
  })

  test('the pixel cap applies to JPEG, from the frame header', () => {
    expect(decodeImage(fixture('quad.jpg'), { maxPixels: 512 }).width).toBe(32)
    expect(() => decodeImage(fixture('quad.jpg'), { maxPixels: 511 })).toThrow(/cap/)
  })
})

describe('imageHeader', () => {
  const text = (s: string) => new TextEncoder().encode(s)

  test('PNG and JPEG give format and size without decoding', () => {
    expect(imageHeader(fixture('interlaced-rgba8.png'))).toEqual({ format: 'png', width: 13, height: 11 })
    expect(imageHeader(fixture('quad.jpg'))).toEqual({ format: 'jpeg', width: 32, height: 16 })
    expect(imageHeader(fixture('quad-progressive.jpg'))).toEqual({ format: 'jpeg', width: 32, height: 16 })
  })

  test('a JPEG turned a quarter by EXIF reports its upright size', () => {
    expect(imageHeader(fixture('orient-3.jpg'))).toEqual({ format: 'jpeg', width: 32, height: 16 })
    expect(imageHeader(fixture('orient-6.jpg'))).toEqual({ format: 'jpeg', width: 16, height: 32 })
    expect(imageHeader(fixture('orient-8.jpg'))).toEqual({ format: 'jpeg', width: 16, height: 32 })
  })

  test('a truncated PNG or JPEG is still recognized, without a size', () => {
    expect(imageHeader(fixture('quad.jpg').subarray(0, 8))).toEqual({ format: 'jpeg' })
    expect(imageHeader(fixture('interlaced-rgba8.png').subarray(0, 10))).toEqual({ format: 'png' })
  })

  test('SVG behind a BOM, an XML declaration, comments and a doctype', () => {
    expect(imageHeader(text('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toEqual({ format: 'svg' })
    const prolog = '﻿<?xml version="1.0"?>\n<!-- drawn -->\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd">\n<SVG>'
    expect(imageHeader(text(prolog))).toEqual({ format: 'svg' })
  })

  test('PDF', () => {
    expect(imageHeader(text('%PDF-1.7\n%âãÏÓ\n'))).toEqual({ format: 'pdf' })
  })

  test('anything else is undefined', () => {
    expect(imageHeader(text('<svgx>'))).toBeUndefined()
    expect(imageHeader(text('<html><svg></svg></html>'))).toBeUndefined()
    expect(imageHeader(text('GIF89a'))).toBeUndefined()
    expect(imageHeader(new Uint8Array(0))).toBeUndefined()
  })
})

const bitmap = (width: number, height: number, pixels: number[][]): Bitmap => ({ width, height, rgba: Uint8Array.from(pixels.flat()) })

describe('scaleBitmap', () => {
  const noise = (w: number, h: number) => {
    const next = samples(9)
    return { width: w, height: h, rgba: Uint8Array.from({ length: w * h * 4 }, () => next() & 255) }
  }

  test.each([
    [3, 2],
    [20, 9],
    [1, 1],
    [7, 5],
    [6, 11],
  ])('7×5 to %i×%i gives exactly that size', (w, h) => {
    const out = scaleBitmap(noise(7, 5), w, h)
    expect([out.width, out.height, out.rgba.length]).toEqual([w, h, w * h * 4])
  })

  test('a downscale averages the area each output pixel covers', () => {
    const halves = bitmap(4, 2, Array.from({ length: 8 }, (_, i) => (i % 4 < 2 ? [0, 0, 0, 255] : [255, 255, 255, 255])))
    expect(pixel(scaleBitmap(halves, 1, 1), 0, 0)).toEqual([128, 128, 128, 255])
    expect(pixel(scaleBitmap(halves, 2, 1), 0, 0)).toEqual([0, 0, 0, 255])
    expect(pixel(scaleBitmap(halves, 2, 1), 1, 0)).toEqual([255, 255, 255, 255])
  })

  test('a fractional ratio weights a source pixel by the part of it inside', () => {
    // 3 -> 2: the middle pixel is split half and half.
    const ramp = bitmap(3, 1, [
      [0, 0, 0, 255],
      [90, 90, 90, 255],
      [180, 180, 180, 255],
    ])
    const out = scaleBitmap(ramp, 2, 1)
    expect(pixel(out, 0, 0)).toEqual([30, 30, 30, 255])
    expect(pixel(out, 1, 0)).toEqual([150, 150, 150, 255])
  })

  test('colour is weighted by alpha: a transparent neighbour does not darken an edge', () => {
    const edge = bitmap(2, 1, [
      [255, 0, 0, 255],
      [0, 0, 0, 0],
    ])
    expect(pixel(scaleBitmap(edge, 1, 1), 0, 0)).toEqual([255, 0, 0, 128])
    const quarter = bitmap(2, 2, [
      [0, 200, 100, 64],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    expect(pixel(scaleBitmap(quarter, 1, 1), 0, 0)).toEqual([0, 200, 100, 16])
  })

  test('an upscale repeats pixels', () => {
    const two = bitmap(2, 1, [
      [10, 20, 30, 255],
      [200, 100, 50, 128],
    ])
    const out = scaleBitmap(two, 4, 2)
    expect([0, 1, 2, 3].map((x) => pixel(out, x, 1))).toEqual([
      [10, 20, 30, 255],
      [10, 20, 30, 255],
      [200, 100, 50, 128],
      [200, 100, 50, 128],
    ])
  })

  test('a target size that is not a positive whole number throws', () => {
    expect(() => scaleBitmap(noise(2, 2), 0, 1)).toThrow(RangeError)
    expect(() => scaleBitmap(noise(2, 2), 1.5, 1)).toThrow(RangeError)
  })
})

describe('encodeRgbaPng', () => {
  /** The chunk types in order, and IHDR's colour type. */
  function chunks(png: Uint8Array): { types: string[]; colorType: number; idat: Uint8Array } {
    const view = new DataView(png.buffer, png.byteOffset)
    const types: string[] = []
    let idat: Uint8Array = new Uint8Array(0)
    for (let at = 8; at < png.length; ) {
      const length = view.getUint32(at)
      const type = new TextDecoder().decode(png.subarray(at + 4, at + 8))
      if (type === 'IDAT') idat = png.subarray(at + 8, at + 8 + length)
      types.push(type)
      at += 12 + length
    }
    return { types, colorType: png[25]!, idat }
  }

  test('a translucent bitmap round-trips through RGBA (colour type 6) with no ancillary chunks', () => {
    const next = samples(4)
    const src = { width: 9, height: 6, rgba: Uint8Array.from({ length: 9 * 6 * 4 }, () => next() & 255) }
    const png = encodeRgbaPng(src)
    expect(chunks(png).types).toEqual(['IHDR', 'IDAT', 'IEND'])
    expect(chunks(png).colorType).toBe(6)
    expect(decodeImage(png)).toEqual(src)
  })

  test('an opaque bitmap is written as RGB (colour type 2) and round-trips', () => {
    const next = samples(5)
    const src = { width: 9, height: 6, rgba: Uint8Array.from({ length: 9 * 6 * 4 }, (_, i) => (i % 4 === 3 ? 255 : next() & 255)) }
    const png = encodeRgbaPng(src)
    const { colorType, idat } = chunks(png)
    expect(colorType).toBe(2)
    expect(inflateSync(idat).length).toBe(6 * (1 + 9 * 3))
    expect(decodeImage(png)).toEqual(src)
  })

  test('decode, scale and encode a photo to a cell-sized PNG', () => {
    const png = encodeRgbaPng(scaleBitmap(decodeImage(fixture('quad.jpg')), 8, 4))
    const back = decodeImage(png)
    expect([back.width, back.height]).toEqual([8, 4])
    expectNear(pixel(back, 1, 1), [...RED, 255], 6)
    expectNear(pixel(back, 6, 3), [...WHITE, 255], 6)
  })
})
