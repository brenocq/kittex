import type { CellBox, RasterOptions, Raster, RGB, TypesetResult } from '../types.js'

// STUB, replaced by feat/raster: rules only (paths are skipped), no anti-aliasing,
// RGBA PNG with stored (uncompressed) deflate blocks.

/** The cells a formula will take under `options`, without drawing it. */
export function measure(result: TypesetResult, options: RasterOptions): CellBox {
  const { emPx, cellWidth, cellHeight, maxColumns } = options
  const naturalWidth = result.width * emPx
  const scale = naturalWidth > maxColumns * cellWidth ? (maxColumns * cellWidth) / naturalWidth : 1
  const columns =
    options.align === 'center' ? maxColumns : Math.min(maxColumns, Math.max(1, Math.ceil((naturalWidth * scale) / cellWidth)))
  const rows = Math.min(255, Math.max(options.minRows ?? 1, Math.ceil(((result.height + result.depth) * emPx * scale) / cellHeight)))
  return { columns, rows, scale }
}

/** Draws a typeset formula as coverage over whole cells. */
export function rasterize(result: TypesetResult, options: RasterOptions): Raster {
  const box = measure(result, options)
  const widthPx = box.columns * options.cellWidth
  const heightPx = box.rows * options.cellHeight
  const alpha = new Uint8Array(widthPx * heightPx)
  const k = options.emPx * box.scale
  const left = options.align === 'center' ? (widthPx - result.width * k) / 2 : 0
  const baselinePx = Math.round((heightPx - (result.height + result.depth) * k) / 2 + result.height * k)
  for (const op of result.ops) {
    if (op.type !== 'rect') continue
    const x0 = Math.max(0, Math.round(left + op.x * k))
    const x1 = Math.min(widthPx, Math.round(left + (op.x + op.width) * k))
    const y0 = Math.max(0, Math.round(baselinePx + op.y * k))
    const y1 = Math.min(heightPx, Math.round(baselinePx + (op.y + op.height) * k))
    for (let y = y0; y < y1; y++) alpha.fill(255, y * widthPx + x0, y * widthPx + x1)
  }
  return { ...box, alpha, widthPx, heightPx, baselinePx }
}

/** Encodes a raster as a PNG in one ink colour, transparent where there is no coverage. */
export function encodePng(raster: Raster, ink: RGB): Uint8Array {
  const { widthPx: w, heightPx: h, alpha } = raster
  const raw = new Uint8Array(h * (1 + w * 4))
  for (let y = 0; y < h; y++) {
    const row = y * (1 + w * 4)
    for (let x = 0; x < w; x++) {
      const p = row + 1 + x * 4
      raw[p] = ink.r
      raw[p + 1] = ink.g
      raw[p + 2] = ink.b
      raw[p + 3] = alpha[y * w + x]!
    }
  }
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, w)
  view.setUint32(4, h)
  ihdr.set([8, 6, 0, 0, 0], 8)
  return concat([
    Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibStored(raw)),
    chunk('IEND', new Uint8Array(0)),
  ])
}

function zlibStored(data: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [Uint8Array.of(0x78, 0x01)]
  for (let i = 0; i === 0 || i < data.length; i += 65535) {
    const block = data.subarray(i, i + 65535)
    const last = i + 65535 >= data.length ? 1 : 0
    parts.push(Uint8Array.of(last, block.length & 0xff, block.length >> 8, ~block.length & 0xff, (~block.length >> 8) & 0xff), block)
  }
  let a = 1
  let b = 0
  for (const byte of data) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  const adler = new Uint8Array(4)
  new DataView(adler.buffer).setUint32(0, ((b << 16) | a) >>> 0)
  parts.push(adler)
  return concat(parts)
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

let crcTable: Uint32Array | undefined
function crc32(bytes: Uint8Array): number {
  crcTable ??= Uint32Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}
