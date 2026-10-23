import { type Bitmap, ImageError, MAX_IMAGE_PIXELS } from './bitmap.js'
import { imageHeader } from './header.js'
import { decodeJpeg } from './jpeg.js'
import { decodePng } from './png.js'

/*
 * Image files -> a PNG sized exactly to the cells it takes: sniff the format
 * and size (imageHeader), decode PNG or JPEG to straight RGBA (decodeImage),
 * resample to the target pixels (scaleBitmap) and encode (encodeRgbaPng).
 * SVG and PDF are only recognized here; they're drawn elsewhere.
 */

export type { Bitmap, ImageFormat } from './bitmap.js'
export { ImageError, MAX_IMAGE_PIXELS } from './bitmap.js'
export { encodeRgbaPng } from './encode.js'
export { imageHeader } from './header.js'
export { scaleBitmap } from './scale.js'

/**
 * Decodes PNG (every colour type and bit depth, palette + tRNS, interlaced)
 * or JPEG (baseline and progressive, EXIF orientation applied) to RGBA.
 * Throws ImageError on corrupt input, an unknown format, or more than
 * `limits.maxPixels` pixels (MAX_IMAGE_PIXELS by default).
 */
export function decodeImage(bytes: Uint8Array, limits?: { maxPixels?: number }): Bitmap {
  const maxPixels = limits?.maxPixels ?? MAX_IMAGE_PIXELS
  const format = imageHeader(bytes)?.format
  if (format === 'png') return decodePng(bytes, maxPixels)
  if (format === 'jpeg') return decodeJpeg(bytes, maxPixels)
  throw new ImageError(format ? `decodeImage does not decode ${format}` : 'not an image kittex knows')
}
