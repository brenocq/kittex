import { zlibSync } from 'fflate'
import { chunk, concat, filterBytes } from '../raster/png.js'
import type { Bitmap } from './bitmap.js'

const SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)

/**
 * A bitmap as an 8-bit PNG: RGB (colour type 2) when every pixel is opaque, a
 * quarter fewer bytes to filter and deflate, else RGBA (colour type 6). No
 * ancillary chunks: Ghostty misreads DPI chunks (see raster/png.ts).
 */
export function encodeRgbaPng(bitmap: Bitmap): Uint8Array {
  const { width, height, rgba } = bitmap
  if (rgba.length !== width * height * 4 || width < 1 || height < 1) throw new RangeError(`encodeRgbaPng: ${rgba.length} bytes is not a ${width}×${height} RGBA bitmap`)
  let opaque = true
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] !== 255) {
      opaque = false
      break
    }
  }
  let pixels = rgba
  if (opaque) {
    pixels = new Uint8Array(width * height * 3)
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
      pixels[j] = rgba[i]!
      pixels[j + 1] = rgba[i + 1]!
      pixels[j + 2] = rgba[i + 2]!
    }
  }
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr.set([8, opaque ? 2 : 6, 0, 0, 0], 8) // bit depth 8, colour type, deflate, filter method 0, no interlace
  const filtered = filterBytes(pixels, width, height, opaque ? 3 : 4)
  return concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', zlibSync(filtered, { level: 6 })), chunk('IEND', new Uint8Array(0))])
}
