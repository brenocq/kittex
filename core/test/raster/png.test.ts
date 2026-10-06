import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { crc32, inflateSync } from 'node:zlib'
import { describe, expect, test } from 'vitest'
import { encodePng, rasterize, recolorPng } from '../../src/raster/index.js'
import type { Raster, RGB, TypesetResult } from '../../src/types.js'

interface Chunk {
  type: string
  data: Uint8Array
}

/** Splits a PNG into chunks, checking the signature, every length and every CRC. */
function chunks(png: Uint8Array): Chunk[] {
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const out: Chunk[] = []
  let at = 8
  while (at < png.length) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8))
    const data = png.subarray(at + 8, at + 8 + length)
    expect(view.getUint32(at + 8 + length), `${type} CRC`).toBe(crc32(png.subarray(at + 4, at + 8 + length)))
    out.push({ type, data })
    at += 12 + length
  }
  expect(at).toBe(png.length)
  return out
}

/** Decodes one of encodePng's images back to its palette, alpha table and pixel indices. */
function decode(png: Uint8Array) {
  const list = chunks(png)
  expect(list.map(c => c.type)).toEqual(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'])
  const ihdr = new DataView(list[0]!.data.buffer, list[0]!.data.byteOffset, 13)
  const width = ihdr.getUint32(0)
  const height = ihdr.getUint32(4)
  expect([...list[0]!.data.subarray(8)]).toEqual([8, 3, 0, 0, 0])
  const raw = inflateSync(list[3]!.data)
  expect(raw.length).toBe(height * (width + 1))
  const pixels = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (width + 1)]!
    const row = raw.subarray(y * (width + 1) + 1, (y + 1) * (width + 1))
    for (let x = 0; x < width; x++) {
      const a = x > 0 ? pixels[y * width + x - 1]! : 0
      const b = y > 0 ? pixels[(y - 1) * width + x]! : 0
      const c = x > 0 && y > 0 ? pixels[(y - 1) * width + x - 1]! : 0
      const p = a + b - c
      const pred = [0, a, b, (a + b) >> 1, Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c][filter]
      expect(pred, 'filter type').toBeDefined()
      pixels[y * width + x] = (row[x]! + pred!) & 0xff
    }
  }
  return { width, height, plte: list[1]!.data, trns: list[2]!.data, pixels }
}

const gaussian: TypesetResult = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/gaussian.json'), 'utf8')).result
const raster = rasterize(gaussian, { emPx: 25, cellWidth: 13, cellHeight: 26, maxColumns: 40, align: 'center' })
const ink: RGB = { r: 230, g: 220, b: 10 }

describe('encodePng', () => {
  test('a palette PNG: 256 ink entries, alpha 0..255, one byte per pixel', () => {
    const png = encodePng(raster, ink)
    const { width, height, plte, trns, pixels } = decode(png)
    expect([width, height]).toEqual([raster.widthPx, raster.heightPx])
    expect(plte.length).toBe(768)
    for (let i = 0; i < 768; i += 3) expect([plte[i], plte[i + 1], plte[i + 2]]).toEqual([230, 220, 10])
    expect([...trns]).toEqual(Array.from({ length: 256 }, (_, i) => i))
    expect(pixels).toEqual(raster.alpha)
    // Small: deflate takes the long transparent runs.
    expect(png.length).toBeLessThan(raster.alpha.length / 10)
  })

  test('round-trips arbitrary coverage, including every byte value', () => {
    const w = 37
    const h = 23
    const alpha = Uint8Array.from({ length: w * h }, (_, i) => (i * 97 + (i >> 3)) & 0xff)
    const r: Raster = { columns: 1, rows: 1, scale: 1, alpha, widthPx: w, heightPx: h, baselinePx: 10 }
    expect(decode(encodePng(r, ink)).pixels).toEqual(alpha)
  })

  test('ink channels are clamped to bytes', () => {
    const { plte } = decode(encodePng(raster, { r: 300, g: -4, b: 12.6 }))
    expect([...plte.subarray(0, 3)]).toEqual([255, 0, 13])
  })

  test('recolorPng rewrites only the palette', () => {
    const png = encodePng(raster, ink)
    const other = recolorPng(png, { r: 1, g: 2, b: 3 })
    expect(other).toEqual(encodePng(raster, { r: 1, g: 2, b: 3 }))
    expect(other.length).toBe(png.length)
    const changed = [...png].flatMap((b, i) => (b !== other[i] ? [i] : []))
    // Only bytes of the PLTE chunk (data and CRC) differ.
    expect(Math.min(...changed)).toBeGreaterThanOrEqual(33 + 8)
    expect(Math.max(...changed)).toBeLessThan(33 + 12 + 768)
    expect(png).toEqual(encodePng(raster, ink)) // the input is untouched
    expect(() => recolorPng(new Uint8Array(100), ink)).toThrow()
  })
})
