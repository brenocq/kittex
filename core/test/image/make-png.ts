import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { crc32 } from 'node:zlib'
import { zlibSync } from 'fflate'

/*
 * A test-side PNG writer, independent of kittex's encoder: any colour type
 * and bit depth, rows packed from samples as stored, and each row filtered
 * with filter (y % 5) so every unfilter path runs. Interlaced files come from
 * ImageMagick instead (fixtures/make-fixtures.py).
 */

export const fixture = (name: string): Uint8Array => new Uint8Array(readFileSync(join(import.meta.dirname, 'fixtures', name)))

export function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'latin1')
  out.set(data, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

export const CHANNELS: Readonly<Record<number, number>> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

export interface PngSpec {
  width: number
  height: number
  depth: number
  colorType: number
  /** Samples as stored, row by row (width × channels per row). */
  samples: number[][]
  plte?: Uint8Array
  trns?: Uint8Array
}

export function packRow(samples: number[], depth: number): Uint8Array {
  if (depth === 16) return Uint8Array.from(samples.flatMap((v) => [v >> 8, v & 255]))
  if (depth === 8) return Uint8Array.from(samples)
  const out = new Uint8Array(Math.ceil((samples.length * depth) / 8))
  samples.forEach((v, i) => {
    const bit = i * depth
    out[bit >> 3]! |= v << (8 - depth - (bit & 7))
  })
  return out
}

function filterRow(type: number, row: Uint8Array, prev: Uint8Array, bpp: number): Uint8Array {
  const out = new Uint8Array(row.length + 1)
  out[0] = type
  for (let i = 0; i < row.length; i++) {
    const a = i >= bpp ? row[i - bpp]! : 0
    const b = prev[i]!
    const c = i >= bpp ? prev[i - bpp]! : 0
    const p = a + b - c
    const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c
    const predictor = [0, a, b, (a + b) >> 1, paeth][type]!
    out[i + 1] = (row[i]! - predictor) & 255
  }
  return out
}

export function ihdr(width: number, height: number, depth: number, colorType: number, interlace = 0): Uint8Array {
  const data = Buffer.alloc(13)
  data.writeUInt32BE(width, 0)
  data.writeUInt32BE(height, 4)
  data.set([depth, colorType, 0, 0, interlace], 8)
  return chunk('IHDR', data)
}

export const SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)

export function pngFile(...chunks: Uint8Array[]): Uint8Array {
  return Buffer.concat([SIGNATURE, ...chunks, chunk('IEND', new Uint8Array(0))])
}

/** The filtered, deflated scanlines of `spec`, before they're put in IDAT. */
export function scanlines(spec: PngSpec): Uint8Array {
  const bpp = Math.max(1, (CHANNELS[spec.colorType]! * spec.depth) >> 3)
  let prev: Uint8Array = new Uint8Array(packRow(spec.samples[0]!, spec.depth).length)
  const rows = spec.samples.map((samples, y) => {
    const row = packRow(samples, spec.depth)
    const filtered = filterRow(y % 5, row, prev, bpp)
    prev = row
    return filtered
  })
  return Buffer.concat(rows)
}

export function makePng(spec: PngSpec): Uint8Array {
  const chunks = [ihdr(spec.width, spec.height, spec.depth, spec.colorType)]
  if (spec.plte) chunks.push(chunk('PLTE', spec.plte))
  if (spec.trns) chunks.push(chunk('tRNS', spec.trns))
  chunks.push(chunk('IDAT', zlibSync(scanlines(spec))))
  return pngFile(...chunks)
}

/** A deterministic sample stream (an LCG), so a failing case reproduces. */
export function samples(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state >> 8
  }
}
