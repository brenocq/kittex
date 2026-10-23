import { Unzlib } from 'fflate'
import { type Bitmap, checkSize, ImageError } from './bitmap.js'

/*
 * PNG -> straight RGBA, 8 bits per channel: every colour type (gray, RGB,
 * palette, gray+alpha, RGBA) at every bit depth the spec allows (1, 2, 4, 8,
 * 16), tRNS (palette alpha, or the gray or RGB colour key), and Adam7
 * interlacing. 16-bit samples round to 8 bits. Ancillary chunks (gAMA, iCCP,
 * sRGB, an APNG's later frames) are ignored: the default image is drawn as
 * stored. CRCs are not checked; a corrupt stream fails in inflate or in the
 * filter bytes instead.
 *
 * The inflated size is known from the header, so inflate streams into a
 * buffer of exactly that size: a stream that inflates to more (a zlib bomb) is
 * refused as soon as it passes the size, and one that inflates to less
 * (truncated) is refused at its end.
 */

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** Samples per pixel for each colour type, and the bit depths it allows. */
const COLOR_TYPES: Readonly<Record<number, { channels: number; depths: readonly number[] }>> = {
  0: { channels: 1, depths: [1, 2, 4, 8, 16] },
  2: { channels: 3, depths: [8, 16] },
  3: { channels: 1, depths: [1, 2, 4, 8] },
  4: { channels: 2, depths: [8, 16] },
  6: { channels: 4, depths: [8, 16] },
}

/** Adam7 passes: x0, y0, dx, dy. */
const ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
] as const

interface Header {
  width: number
  height: number
  depth: number
  colorType: number
  channels: number
  interlaced: boolean
}

export function decodePng(bytes: Uint8Array, maxPixels: number): Bitmap {
  if (!SIGNATURE.every((b, i) => bytes[i] === b)) throw new ImageError('not a PNG')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let header: Header | undefined
  let palette: Uint8Array | undefined
  let trns: Uint8Array | undefined
  const idat: Uint8Array[] = []
  let at = 8
  for (;;) {
    if (at + 8 > bytes.length) {
      if (header && idat.length > 0) break // no IEND: decode what the IDATs hold, inflate judges if it's whole
      throw new ImageError('PNG is truncated')
    }
    const length = view.getUint32(at)
    const type = String.fromCharCode(bytes[at + 4]!, bytes[at + 5]!, bytes[at + 6]!, bytes[at + 7]!)
    if (header && type === 'IEND') break // a cut inside IEND loses nothing
    if (at + 12 + length > bytes.length) throw new ImageError(`PNG ${type} chunk is truncated`)
    const data = bytes.subarray(at + 8, at + 8 + length)
    at += 12 + length
    if (!header) {
      if (type !== 'IHDR') throw new ImageError('PNG does not start with IHDR')
      header = parseHeader(data, maxPixels)
      continue
    }
    if (type === 'PLTE') palette = data
    else if (type === 'tRNS') trns = data
    else if (type === 'IDAT') idat.push(data)
  }
  if (idat.length === 0) throw new ImageError('PNG has no IDAT')
  if (header.colorType === 3 && !palette) throw new ImageError('palette PNG has no PLTE')
  const raw = inflate(idat, header)
  return toRgba(raw, header, palette, trns)
}

function parseHeader(data: Uint8Array, maxPixels: number): Header {
  if (data.length < 13) throw new ImageError('PNG IHDR is short')
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const width = view.getUint32(0)
  const height = view.getUint32(4)
  const depth = data[8]!
  const colorType = data[9]!
  const kind = COLOR_TYPES[colorType]
  if (!kind || !kind.depths.includes(depth)) throw new ImageError(`PNG colour type ${colorType} at ${depth} bits is not valid`)
  if (data[10] !== 0 || data[11] !== 0 || (data[12] !== 0 && data[12] !== 1)) throw new ImageError('PNG uses an unknown compression, filter or interlace method')
  checkSize(width, height, maxPixels)
  return { width, height, depth, colorType, channels: kind.channels, interlaced: data[12] === 1 }
}

/** Bytes in one scanline of `width` pixels, without its filter byte. */
function stride(width: number, h: Header): number {
  return Math.ceil((width * h.channels * h.depth) / 8)
}

/** The passes as [x0, y0, dx, dy, columns, rows], empty passes left out. */
function passes(h: Header): Array<readonly [number, number, number, number, number, number]> {
  if (!h.interlaced) return [[0, 0, 1, 1, h.width, h.height]]
  return ADAM7.map(([x0, y0, dx, dy]) => [x0, y0, dx, dy, Math.ceil((h.width - x0) / dx), Math.ceil((h.height - y0) / dy)] as const).filter(
    ([, , , , w, rows]) => w > 0 && rows > 0,
  )
}

/*
 * Deflate expands at most about 1032 to 1, so INFLATE_STEP bytes of input
 * inflate to at most about 4 MB before the next size check: a bomb is refused
 * within one step instead of being inflated whole (unzlibSync with a fixed
 * `out` keeps inflating past its end and drops the rest). Smaller steps cost
 * nothing measurable on a valid image; 64 KiB steps let one step run to 67 MB.
 */
const INFLATE_STEP = 4096

function inflate(idat: Uint8Array[], h: Header): Uint8Array {
  const expected = passes(h).reduce((n, [, , , , w, rows]) => n + rows * (1 + stride(w, h)), 0)
  const out = new Uint8Array(expected)
  let length = 0
  const stream = new Unzlib((chunk) => {
    if (length + chunk.length > expected) throw new ImageError(`PNG image data inflates to more than the ${expected} bytes its header allows`)
    out.set(chunk, length)
    length += chunk.length
  })
  try {
    for (const data of idat) for (let at = 0; at < data.length; at += INFLATE_STEP) stream.push(data.subarray(at, at + INFLATE_STEP))
    stream.push(new Uint8Array(0), true)
  } catch (error) {
    if (error instanceof ImageError) throw error
    throw new ImageError(`PNG image data is corrupt or truncated (${error instanceof Error ? error.message : String(error)})`)
  }
  if (length !== expected) throw new ImageError(`PNG image data inflates to ${length} bytes, not ${expected}`)
  return out
}

function toRgba(raw: Uint8Array, h: Header, palette: Uint8Array | undefined, trns: Uint8Array | undefined): Bitmap {
  const rgba = new Uint8Array(h.width * h.height * 4)
  const bpp = Math.max(1, (h.channels * h.depth) >> 3)
  const convert = converter(h, palette, trns)
  let at = 0
  for (const [x0, y0, dx, dy, w, rows] of passes(h)) {
    const n = stride(w, h)
    let previous = new Uint8Array(n)
    let line = new Uint8Array(n)
    const pixels = new Uint8Array(w * 4)
    for (let row = 0; row < rows; row++) {
      unfilter(raw[at]!, raw.subarray(at + 1, at + 1 + n), previous, line, bpp)
      at += 1 + n
      const y = y0 + row * dy
      if (dx === 1) convert(line, w, rgba.subarray(y * h.width * 4, (y + 1) * h.width * 4))
      else {
        convert(line, w, pixels)
        for (let i = 0; i < w; i++) rgba.set(pixels.subarray(i * 4, i * 4 + 4), (y * h.width + x0 + i * dx) * 4)
      }
      ;[previous, line] = [line, previous]
    }
  }
  return { width: h.width, height: h.height, rgba }
}

function unfilter(type: number, src: Uint8Array, up: Uint8Array, out: Uint8Array, bpp: number): void {
  const n = src.length
  switch (type) {
    case 0:
      out.set(src)
      return
    case 1:
      for (let i = 0; i < n; i++) out[i] = src[i]! + (i >= bpp ? out[i - bpp]! : 0)
      return
    case 2:
      for (let i = 0; i < n; i++) out[i] = src[i]! + up[i]!
      return
    case 3:
      for (let i = 0; i < n; i++) out[i] = src[i]! + (((i >= bpp ? out[i - bpp]! : 0) + up[i]!) >> 1)
      return
    case 4:
      for (let i = 0; i < n; i++) {
        const a = i >= bpp ? out[i - bpp]! : 0
        const b = up[i]!
        const c = i >= bpp ? up[i - bpp]! : 0
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        out[i] = src[i]! + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
      }
      return
    default:
      throw new ImageError(`PNG row has unknown filter type ${type}`)
  }
}

type Convert = (line: Uint8Array, width: number, out: Uint8Array) => void

/** Reads one unfiltered scanline of `width` pixels into RGBA8. */
function converter(h: Header, palette: Uint8Array | undefined, trns: Uint8Array | undefined): Convert {
  const { depth, colorType } = h
  const sample = sampleReader(depth)
  const to8 = depth === 16 ? (v: number) => ((v * 255 + 32767) / 65535) | 0 : depth === 8 ? (v: number) => v : (v: number) => (v * 255) / ((1 << depth) - 1)
  const key = (i: number) => (trns && trns.length >= i * 2 + 2 ? (trns[i * 2]! << 8) | trns[i * 2 + 1]! : -1)
  switch (colorType) {
    case 0: {
      const gray = key(0)
      return (line, width, out) => {
        for (let x = 0; x < width; x++) {
          const v = sample(line, x)
          const g = to8(v)
          out[x * 4] = out[x * 4 + 1] = out[x * 4 + 2] = g
          out[x * 4 + 3] = v === gray ? 0 : 255
        }
      }
    }
    case 2: {
      const [kr, kg, kb] = [key(0), key(1), key(2)]
      return (line, width, out) => {
        for (let x = 0; x < width; x++) {
          const r = sample(line, x * 3)
          const g = sample(line, x * 3 + 1)
          const b = sample(line, x * 3 + 2)
          out[x * 4] = to8(r)
          out[x * 4 + 1] = to8(g)
          out[x * 4 + 2] = to8(b)
          out[x * 4 + 3] = r === kr && g === kg && b === kb ? 0 : 255
        }
      }
    }
    case 3: {
      const plte = palette ?? new Uint8Array(0)
      // Entries past the palette's end are opaque black.
      const table = new Uint8Array(256 * 4)
      for (let i = 0; i < 256; i++) {
        if (i * 3 + 2 < plte.length) table.set(plte.subarray(i * 3, i * 3 + 3), i * 4)
        table[i * 4 + 3] = trns && i < trns.length ? trns[i]! : 255
      }
      return (line, width, out) => {
        for (let x = 0; x < width; x++) {
          const at = sample(line, x) * 4
          out[x * 4] = table[at]!
          out[x * 4 + 1] = table[at + 1]!
          out[x * 4 + 2] = table[at + 2]!
          out[x * 4 + 3] = table[at + 3]!
        }
      }
    }
    case 4:
      return (line, width, out) => {
        for (let x = 0; x < width; x++) {
          out[x * 4] = out[x * 4 + 1] = out[x * 4 + 2] = to8(sample(line, x * 2))
          out[x * 4 + 3] = to8(sample(line, x * 2 + 1))
        }
      }
    default:
      return (line, width, out) => {
        if (depth === 8) out.set(line.subarray(0, width * 4))
        else for (let i = 0; i < width * 4; i++) out[i] = to8(sample(line, i))
      }
  }
}

/** Sample `i` of a scanline at `depth` bits, as stored (not scaled). */
function sampleReader(depth: number): (line: Uint8Array, i: number) => number {
  if (depth === 8) return (line, i) => line[i]!
  if (depth === 16) return (line, i) => (line[i * 2]! << 8) | line[i * 2 + 1]!
  const mask = (1 << depth) - 1
  return (line, i) => {
    const bit = i * depth
    return (line[bit >> 3]! >> (8 - depth - (bit & 7))) & mask
  }
}
