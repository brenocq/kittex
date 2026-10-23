/** Straight (non-premultiplied) RGBA pixels, row-major, 4 bytes per pixel. */
export interface Bitmap {
  width: number
  height: number
  rgba: Uint8Array
}

/** A file kittex can't or won't decode: corrupt, truncated, an unknown format, or over the pixel cap. */
export class ImageError extends Error {
  override name = 'ImageError'
}

export type ImageFormat = 'png' | 'jpeg' | 'svg' | 'pdf'

/**
 * The most pixels decodeImage accepts by default: 24 megapixels (a 6000 ×
 * 4000 camera frame) is 96 MB of RGBA, and the decode's transient buffers
 * (the inflated PNG rows, or jpeg-js's component planes) stay within about as
 * much again, so a decode in the sandbox peaks well under 200 MB.
 */
export const MAX_IMAGE_PIXELS: number = 24e6

/** Throws ImageError unless width × height is a positive size within `maxPixels`. */
export function checkSize(width: number, height: number, maxPixels: number): void {
  if (!(width > 0 && height > 0)) throw new ImageError(`image has no pixels (${width}×${height})`)
  if (width * height > maxPixels) throw new ImageError(`image is ${width}×${height}, over the ${maxPixels}-pixel cap`)
}
