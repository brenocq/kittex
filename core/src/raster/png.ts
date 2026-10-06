import { zlibSync } from 'fflate'
import type { RGB } from '../types.js'

/*
 * A coverage raster as an indexed-colour PNG (colour type 3, 8 bits): pixel
 * value v is palette entry v, every PLTE entry is the ink colour and tRNS gives
 * entry v alpha v. One byte per pixel instead of four, and a change of colour
 * rewrites only the 780-byte PLTE chunk (recolorPng). No pHYs, gAMA, sRGB or
 * other ancillary chunks: Ghostty misreads DPI chunks and the alpha is linear
 * coverage that should be composited as is.
 */

const SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
/** Byte offset of the PLTE chunk: signature (8) + IHDR (12 + 13). */
const PLTE_AT = 33

/** Encodes `alpha` (width × height coverage bytes) as a palette PNG in one ink colour. */
export function encodeAlphaPng(alpha: Uint8Array, width: number, height: number, ink: RGB): Uint8Array {
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr.set([8, 3, 0, 0, 0], 8) // bit depth 8, colour type 3 (indexed), deflate, filter method 0, no interlace
  const trns = new Uint8Array(256)
  for (let i = 0; i < 256; i++) trns[i] = i
  return concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('PLTE', palette(ink)),
    chunk('tRNS', trns),
    chunk('IDAT', zlibSync(filter(alpha, width, height), { level: 6 })),
    chunk('IEND', new Uint8Array(0)),
  ])
}

/** The same PNG in another ink colour: only the palette is rewritten. Throws if `png` is not one of encodePng's. */
export function recolorPng(png: Uint8Array, ink: RGB): Uint8Array {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const isPlte =
    png.length > PLTE_AT + 12 + 768 &&
    view.getUint32(PLTE_AT) === 768 &&
    png[PLTE_AT + 4] === 0x50 && png[PLTE_AT + 5] === 0x4c && png[PLTE_AT + 6] === 0x54 && png[PLTE_AT + 7] === 0x45
  if (!isPlte) throw new Error('recolorPng: not a kittex palette PNG')
  const out = png.slice()
  out.set(chunk('PLTE', palette(ink)), PLTE_AT)
  return out
}

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
