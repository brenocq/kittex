import { zlibSync } from 'fflate'
import type { RGB, TextCurve } from '../types.js'

/*
 * A coverage raster as an indexed-colour PNG (colour type 3, 8 bits): pixel
 * value v is palette entry v, every PLTE entry is the ink colour and tRNS gives
 * entry v alpha v. One byte per pixel instead of four, and a change of colour
 * rewrites only the 780-byte PLTE chunk (recolorPng). No pHYs, gAMA, sRGB or
 * other ancillary chunks: Ghostty misreads DPI chunks and the alpha is linear
 * coverage that should be composited as is.
 *
 * As is, unless the terminal blends its text in a way it doesn't blend images:
 * then `over` (the background the text is corrected against) gives each alpha
 * level the correction the terminal's text gets (inkAlpha), still in the tRNS
 * chunk, so a formula's strokes weigh what the text's do.
 */

const SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
/** Byte offset of the PLTE chunk: signature (8) + IHDR (12 + 13). */
const PLTE_AT = 33

/** Byte offset of the tRNS chunk, right after the PLTE chunk's 768 bytes. */
const TRNS_AT = PLTE_AT + 12 + 768

/**
 * Encodes `alpha` (width × height coverage bytes) as a palette PNG in one ink
 * colour, its alpha levels corrected against `over` when given (inkAlpha).
 */
export function encodeAlphaPng(alpha: Uint8Array, width: number, height: number, ink: RGB, over?: RGB, curve?: TextCurve): Uint8Array {
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr.set([8, 3, 0, 0, 0], 8) // bit depth 8, colour type 3 (indexed), deflate, filter method 0, no interlace
  return concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('PLTE', palette(ink)),
    chunk('tRNS', alphaTable(ink, over, curve)),
    chunk('IDAT', zlibSync(filter(alpha, width, height), { level: 6 })),
    chunk('IEND', new Uint8Array(0)),
  ])
}

/**
 * The same PNG in another ink colour (and alpha correction, see
 * encodeAlphaPng): only the PLTE and tRNS chunks are rewritten. Throws if
 * `png` is not one of encodePng's.
 */
export function recolorPng(png: Uint8Array, ink: RGB, over?: RGB, curve?: TextCurve): Uint8Array {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const isPlte =
    png.length > TRNS_AT + 12 + 256 &&
    view.getUint32(PLTE_AT) === 768 &&
    png[PLTE_AT + 4] === 0x50 && png[PLTE_AT + 5] === 0x4c && png[PLTE_AT + 6] === 0x54 && png[PLTE_AT + 7] === 0x45 &&
    view.getUint32(TRNS_AT) === 256 &&
    png[TRNS_AT + 4] === 0x74 && png[TRNS_AT + 5] === 0x52 && png[TRNS_AT + 6] === 0x4e && png[TRNS_AT + 7] === 0x53
  if (!isPlte) throw new Error('recolorPng: not a kittex palette PNG')
  const out = png.slice()
  out.set(chunk('PLTE', palette(ink)), PLTE_AT)
  out.set(chunk('tRNS', alphaTable(ink, over, curve)), TRNS_AT)
  return out
}

/**
 * Coverage `alpha` (0 to 1) of ink over `over`, corrected the way Ghostty's
 * `alpha-blending = linear-corrected` (its default outside macOS) corrects text
 * glyphs: Ghostty blends in linear light, which draws dark text on a light
 * background much thinner and light text on a dark one much bolder than the
 * gamma (sRGB) blending fonts are designed for, so its text shader
 * (cell_text.f.glsl) moves each glyph's alpha to where the gamma blend's
 * luminance lands. Its image shader has no such step: an image's alpha is
 * blended in linear light as it is. With this applied to a formula's alpha
 * levels, a formula and the text beside it reach the same luminances.
 *
 * The same arithmetic as the shader: luminances of the linear colours, blended
 * gamma-encoded, linearised again, and mapped back to [0, 1] between the
 * background's and the ink's; no correction within 0.001 of luminance.
 */
export function inkAlpha(alpha: number, ink: RGB, over: RGB): number {
  const fg = linearLuminance(ink)
  const bg = linearLuminance(over)
  if (!(Math.abs(fg - bg) > 0.001)) return alpha
  const blend = linearize(unlinearize(fg) * alpha + unlinearize(bg) * (1 - alpha))
  return Math.min(1, Math.max(0, (blend - bg) / (fg - bg)))
}

/**
 * Coverage `alpha` (0 to 1) of ink over `over`, given the curve kitty's
 * `text_composition_strategy` gives its text glyphs (cell.slang,
 * foreground_contrast_new): the alpha moved towards alpha^(1/gamma), the more
 * so the darker the ink against the background, then multiplied by
 * 1 + contrast/100. kitty draws images with their alpha as it is, so with
 * this applied to a formula's alpha levels it weighs what the text does
 * (`1.7 30`, kitty's default on macOS, draws text much bolder than images).
 * The luminances are of the linear colours, as in the shader.
 */
export function curvedAlpha(alpha: number, ink: RGB, over: RGB, curve: TextCurve): number {
  const gamma = curve.gamma < 0.01 ? 1 : 1 / curve.gamma
  const t = (1 - linearLuminance(ink) + linearLuminance(over)) * 0.5
  const moved = alpha + (alpha ** gamma - alpha) * t
  return Math.min(1, Math.max(0, moved * (1 + curve.contrast * 0.01)))
}

/**
 * tRNS: alpha level i is i, or i corrected against `over` (inkAlpha, or
 * curvedAlpha with a `curve`); 0 stays put, and 255 too unless a curve
 * moves it.
 */
function alphaTable(ink: RGB, over: RGB | undefined, curve?: TextCurve): Uint8Array {
  const trns = new Uint8Array(256)
  for (let i = 0; i < 256; i++) {
    if (!over || i === 0 || (i === 255 && !curve)) trns[i] = i
    else trns[i] = Math.round(255 * (curve ? curvedAlpha(i / 255, ink, over, curve) : inkAlpha(i / 255, ink, over)))
  }
  return trns
}

const linearize = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const unlinearize = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)
const linearLuminance = (c: RGB) =>
  0.2126 * linearize(clampByte(c.r) / 255) + 0.7152 * linearize(clampByte(c.g) / 255) + 0.0722 * linearize(clampByte(c.b) / 255)

function palette(ink: RGB): Uint8Array {
  const plte = new Uint8Array(768)
  const r = clampByte(ink.r), g = clampByte(ink.g), b = clampByte(ink.b)
  for (let i = 0; i < 768; i += 3) {
    plte[i] = r
    plte[i + 1] = g
    plte[i + 2] = b
  }
  return plte
}

const clampByte = (v: number) => Math.min(255, Math.max(0, Math.round(v))) || 0

/**
 * Prefixes each row with filter type 0 (None). Measured on the fixtures, None
 * deflates smallest for coverage images (the wide sample: 13.9 KB against
 * 15.3 KB for libpng's per-row adaptive choice and 16.3 KB for Sub or Up):
 * the rows are long zero runs and stroke profiles that repeat exactly from
 * glyph to glyph, which LZ77 matches as they are, while Sub/Up/Paeth turn each
 * edge into signed differences that depend on its sub-pixel phase. It is also
 * the fastest, and what the PNG spec recommends for palette images.
 */
function filter(alpha: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(h * (w + 1))
  for (let y = 0; y < h; y++) out.set(alpha.subarray(y * w, y * w + w), y * (w + 1) + 1)
  return out
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out, 4, 8 + data.length))
  return out
}

let crcTable: Uint32Array | undefined
function crc32(bytes: Uint8Array, from: number, to: number): number {
  const table = (crcTable ??= Uint32Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  }))
  let crc = 0xffffffff
  for (let i = from; i < to; i++) crc = table[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8)
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
