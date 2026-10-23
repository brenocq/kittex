import type { ImageFormat } from './bitmap.js'

/*
 * Format sniffing from the first bytes, and the pixel size of a PNG or JPEG
 * read from its headers alone, so a caller can size an image's cells before
 * (or without) decoding it. A JPEG's size is the displayed one: its EXIF
 * orientation, which decodeImage applies, swaps width and height for the
 * four orientations that turn the picture a quarter.
 */

export interface ImageHeader {
  format: ImageFormat
  width?: number
  height?: number
}

/** A JPEG's frame size as stored, its EXIF orientation (1 to 8, 1 when absent), and its displayed size. */
export interface JpegInfo {
  width: number
  height: number
  orientation: number
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export function imageHeader(bytes: Uint8Array): ImageHeader | undefined {
  if (PNG_SIGNATURE.every((b, i) => bytes[i] === b)) {
    // IHDR is always the first chunk: length (4), "IHDR" (4), width, height.
    if (bytes.length < 24 || ascii(bytes, 12, 16) !== 'IHDR') return { format: 'png' }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    return { format: 'png', width: view.getUint32(16), height: view.getUint32(20) }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    const info = jpegInfo(bytes)
    if (!info) return { format: 'jpeg' }
    const turned = info.orientation >= 5
    return { format: 'jpeg', width: turned ? info.height : info.width, height: turned ? info.width : info.height }
  }
  const head = ascii(bytes, 0, Math.min(bytes.length, 4096))
  if (head.slice(0, 1024).includes('%PDF-')) return { format: 'pdf' }
  if (SVG_START.test(head.replace(/^\xef\xbb\xbf/, ''))) return { format: 'svg' }
  return undefined
}

/** Whitespace, an XML declaration, comments and a doctype, then an `<svg` element. */
const SVG_START = /^(?:\s|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?\s*>)*<svg[\s>/]/i

/** Walks a JPEG's marker segments up to its first scan; undefined when no frame header comes before it. */
export function jpegInfo(bytes: Uint8Array): JpegInfo | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let orientation = 1
  let at = 2
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) return undefined
    const marker = bytes[at + 1]!
    if (marker === 0xff) {
      at++ // fill byte
      continue
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2 // standalone markers carry no length
      continue
    }
    if (marker === 0xd9 || marker === 0xda) return undefined
    const length = view.getUint16(at + 2)
    const end = at + 2 + length
    if (length < 2 || end > bytes.length) return undefined
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isFrame) {
      if (length < 7) return undefined
      return { width: view.getUint16(at + 7), height: view.getUint16(at + 5), orientation }
    }
    if (marker === 0xe1 && length >= 8 && ascii(bytes, at + 4, at + 10) === 'Exif\0\0') orientation = exifOrientation(view, at + 10, end) ?? orientation
    at = end
  }
  return undefined
}

/** The Orientation tag (0x0112) of IFD0 in the TIFF structure at [start, end), if present and valid. */
function exifOrientation(view: DataView, start: number, end: number): number | undefined {
  if (start + 8 > end) return undefined
  const order = view.getUint16(start)
  if (order !== 0x4949 && order !== 0x4d4d) return undefined
  const little = order === 0x4949
  if (view.getUint16(start + 2, little) !== 42) return undefined
  const ifd = start + view.getUint32(start + 4, little)
  if (ifd + 2 > end) return undefined
  const count = view.getUint16(ifd, little)
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12
    if (entry + 12 > end) return undefined
    if (view.getUint16(entry, little) !== 0x0112) continue
    const value = view.getUint16(entry + 8, little)
    return value >= 1 && value <= 8 ? value : undefined
  }
  return undefined
}

function ascii(bytes: Uint8Array, from: number, to: number): string {
  let s = ''
  for (let i = from; i < to && i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return s
}
