import decode from 'jpeg-js/lib/decoder.js'
import { type Bitmap, checkSize, ImageError } from './bitmap.js'
import { jpegInfo } from './header.js'
import { checkScans } from './jpeg-scans.js'

/*
 * JPEG -> straight RGBA through jpeg-js (baseline and progressive, gray,
 * YCbCr and Adobe CMYK/YCCK), then turned upright by the EXIF orientation.
 * The size is checked against the cap from the frame header before jpeg-js
 * allocates anything. `useTArray` keeps jpeg-js on Uint8Array: its other
 * branch reaches for Node's Buffer, which the sandbox lacks.
 */

export function decodeJpeg(bytes: Uint8Array, maxPixels: number): Bitmap {
  const info = jpegInfo(bytes)
  if (!info) throw new ImageError('JPEG has no frame header')
  checkSize(info.width, info.height, maxPixels)
  checkScans(bytes)
  let decoded
  try {
    decoded = decode(bytes, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: maxPixels / 1e6 })
  } catch (error) {
    throw new ImageError(`JPEG is corrupt or unsupported (${error instanceof Error ? error.message : String(error)})`)
  }
  const { width, height, data } = decoded
  if (width !== info.width || height !== info.height || data.length !== width * height * 4) throw new ImageError('JPEG decoded to an unexpected size')
  return orient({ width, height, rgba: data }, info.orientation)
}

/** Applies EXIF orientation 1-8: the stored pixels as they're meant to be seen. */
export function orient(bitmap: Bitmap, orientation: number): Bitmap {
  if (orientation <= 1 || orientation > 8) return bitmap
  const { width: w, height: h, rgba } = bitmap
  const turned = orientation >= 5
  const outW = turned ? h : w
  const outH = turned ? w : h
  const out = new Uint8Array(rgba.length)
  const pixels = new Uint32Array(rgba.buffer, rgba.byteOffset, w * h)
  const target = new Uint32Array(out.buffer)
  // The source pixel of output (x, y) is origin + x * dx + y * dy.
  const last = (h - 1) * w
  const [origin, dx, dy] = (
    {
      2: [w - 1, -1, w],
      3: [last + w - 1, -1, -w],
      4: [last, 1, -w],
      5: [0, w, 1],
      6: [last, -w, 1],
      7: [last + w - 1, -w, -1],
      8: [w - 1, w, -1],
    } as const satisfies Record<number, readonly [number, number, number]>
  )[orientation as 2 | 3 | 4 | 5 | 6 | 7 | 8]
  for (let y = 0; y < outH; y++) {
    let from = origin + y * dy
    for (let x = 0; x < outW; x++, from += dx) target[y * outW + x] = pixels[from]!
  }
  return { width: outW, height: outH, rgba: out }
}
