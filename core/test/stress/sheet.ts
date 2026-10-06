// Contact sheets for the stress runner: every formula's coverage composited in
// one ink on one background, under a label, stacked into PNG pages that can be
// checked by eye. Node only (tests).
import { zlibSync } from 'fflate'

import type { RGB } from '../../src/types.js'

/** A coverage image (0 transparent, 255 full ink), row-major. */
export interface Coverage {
  alpha: Uint8Array
  width: number
  height: number
}

export interface SheetEntry {
  label: Coverage
  image: Coverage
}

export interface SheetOptions {
  ink: RGB
  background: RGB
  /** A page is cut before an entry that would make it taller than this (one entry alone may be taller). */
  maxHeight: number
  /** Gap and frame colour between entries. */
  rule: RGB
}

/** Lays entries out as pages: label above, image below, a rule under each, the image's own box framed. `pageOf[i]` is entry i's page (0-based). */
export function contactSheets(entries: readonly SheetEntry[], options: SheetOptions): { pages: Uint8Array[]; pageOf: number[] } {
  const margin = 8
  const pages: SheetEntry[][] = [[]]
  const pageOf: number[] = []
  let height = margin
  for (const entry of entries) {
    const h = entry.label.height + entry.image.height + 3 * margin
    if (pages[pages.length - 1]!.length > 0 && height + h > options.maxHeight) {
      pages.push([])
      height = margin
    }
    pages[pages.length - 1]!.push(entry)
    pageOf.push(pages.length - 1)
    height += h
  }
  const pngs = pages.map(page => {
    const width = 2 * margin + Math.max(1, ...page.map(e => Math.max(e.label.width, e.image.width + 2)))
    const pageHeight = margin + page.reduce((sum, e) => sum + e.label.height + e.image.height + 3 * margin + 2, 0)
    const rgb = new Uint8Array(width * pageHeight * 3)
    fill(rgb, width, 0, 0, width, pageHeight, options.background)
    let y = margin
    for (const entry of page) {
      blend(rgb, width, entry.label, margin, y, options.ink, options.background)
      y += entry.label.height + margin / 2
      // A dim frame around the image's own box: whatever touches it was drawn at the edge.
      frame(rgb, width, margin, y, entry.image.width + 2, entry.image.height + 2, options.rule)
      blend(rgb, width, entry.image, margin + 1, y + 1, options.ink, options.background)
      y += entry.image.height + 2 + margin
      fill(rgb, width, 0, y, width, 1, options.rule)
      y += margin + margin / 2
    }
    return encodeRgbPng(rgb, width, pageHeight)
  })
  return { pages: pngs, pageOf }
}

function fill(rgb: Uint8Array, stride: number, x0: number, y0: number, w: number, h: number, c: RGB): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * stride + x) * 3
      rgb[i] = c.r
      rgb[i + 1] = c.g
      rgb[i + 2] = c.b
    }
  }
}

function frame(rgb: Uint8Array, stride: number, x: number, y: number, w: number, h: number, c: RGB): void {
  fill(rgb, stride, x, y, w, 1, c)
  fill(rgb, stride, x, y + h - 1, w, 1, c)
  fill(rgb, stride, x, y, 1, h, c)
  fill(rgb, stride, x + w - 1, y, 1, h, c)
}

function blend(rgb: Uint8Array, stride: number, cov: Coverage, x0: number, y0: number, ink: RGB, bg: RGB): void {
  for (let y = 0; y < cov.height; y++) {
    for (let x = 0; x < cov.width; x++) {
      const a = cov.alpha[y * cov.width + x]! / 255
      if (a === 0) continue
      const i = ((y0 + y) * stride + x0 + x) * 3
      rgb[i] = Math.round(bg.r + (ink.r - bg.r) * a)
      rgb[i + 1] = Math.round(bg.g + (ink.g - bg.g) * a)
      rgb[i + 2] = Math.round(bg.b + (ink.b - bg.b) * a)
    }
  }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
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

/** An 8-bit RGB PNG. */
export function encodeRgbPng(rgb: Uint8Array, width: number, height: number): Uint8Array {
  const raw = new Uint8Array((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1)
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr.set([8, 2, 0, 0, 0], 8)
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlibSync(raw, { level: 6 })), chunk('IEND', new Uint8Array())]
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/** Whether any ink lies in the outermost `band` pixels of an image: a glyph drawn at (or past) its edge. */
export function touchesEdge(cov: Coverage, band = 1): { left: boolean; right: boolean; top: boolean; bottom: boolean } {
  const at = (x: number, y: number) => cov.alpha[y * cov.width + x]! > 24
  let left = false
  let right = false
  let top = false
  let bottom = false
  for (let y = 0; y < cov.height; y++) {
    for (let b = 0; b < band; b++) {
      if (at(b, y)) left = true
      if (at(cov.width - 1 - b, y)) right = true
    }
  }
  for (let x = 0; x < cov.width; x++) {
    for (let b = 0; b < band; b++) {
      if (at(x, b)) top = true
      if (at(x, cov.height - 1 - b)) bottom = true
    }
  }
  return { left, right, top, bottom }
}
