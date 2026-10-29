// `$.kittex.formula` (formula.ts): one formula typeset for another plugin, as
// an image in the colour it names and as Unicode, and the colour names it reads.

import { describe, expect } from 'claude-code/testing'

import { colorOf, formulaOf } from '../hooks/formula.ts'
import { CELL, kittyEnv, test } from './support.ts'

const RED = { r: 205, g: 0, b: 0 }
/** The engine's own RGB for `cyan`, as a Text draws it. */
const CYAN = { r: 0x05, g: 0xa2, b: 0xc2 }
/** kitty's 13×26 px cells: the session tests' 13×20 cells leave a superscript no room in a row. */
const kitty26 = () => ({ ...kittyEnv(), cellHeight: 26 })

/** The colours of a palette PNG's palette (its PLTE chunk), as `r,g,b`. */
function paletteOf(base64: string): string[] {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  for (let at = 8; at < bytes.length; ) {
    const length = (bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!
    const type = String.fromCharCode(...bytes.slice(at + 4, at + 8))
    if (type === 'PLTE') {
      const out: string[] = []
      for (let i = 0; i < length; i += 3) out.push(`${bytes[at + 8 + i]},${bytes[at + 9 + i]},${bytes[at + 10 + i]}`)
      return out
    }
    at += 12 + length
  }
  return []
}

describe('colorOf', () => {
  test("reads hex, names as the engine draws them, ansi names from the palette, and nothing else", () => {
    expect(colorOf('#f28fad', undefined)).toEqual({ r: 0xf2, g: 0x8f, b: 0xad })
    expect(colorOf('#abc', undefined)).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc })
    const palette = Array.from({ length: 16 }, (_, i) => ({ r: i, g: i, b: i }))
    expect(colorOf('cyan', { palette })).toEqual(CYAN)
    expect(colorOf('ansi:red', undefined)).toEqual(RED)
    expect(colorOf('ansi:gray', { palette })).toEqual({ r: 8, g: 8, b: 8 })
    expect(colorOf('ansi:cyan', { palette })).toEqual({ r: 6, g: 6, b: 6 })
    expect(colorOf('permission', { palette })).toBeUndefined()
    expect(colorOf(undefined, { palette })).toBeUndefined()
  })
})

describe('formulaOf', () => {
  const math = { block: 'image', inline: 'image' } as const

  test('an inline formula is one row in the colour asked, with its Unicode', () => {
    const shown = formulaOf({ tex: 'x^2 + y^2', color: 'ansi:red', maxColumns: 40 }, kitty26(), undefined, math)
    expect(shown.error).toBeUndefined()
    expect(shown.text).toEqual(['x² + y²'])
    expect(shown.image?.rows).toBe(1)
    expect(shown.image!.columns).toBeGreaterThan(0)
    expect(shown.image!.columns).toBeLessThanOrEqual(40)
    expect(paletteOf(shown.image!.png)).toContain('205,0,0')
    const bytes = Uint8Array.from(atob(shown.image!.png), c => c.charCodeAt(0))
    const width = new DataView(bytes.buffer).getUint32(16)
    expect(width).toBe(shown.image!.columns * CELL.cellWidth)
  })

  test('a display formula is several rows within the width, keyed by its pixels', () => {
    const tex = '\\sum_{i=1}^{n} \\frac{1}{i^2}'
    const blue = formulaOf({ tex, display: true, color: '#5bb8f5', maxColumns: 30 }, kittyEnv(), undefined, math)
    expect(blue.image!.rows).toBeGreaterThan(1)
    expect(blue.image!.columns).toBeLessThanOrEqual(30)
    expect(blue.text!.length).toBeGreaterThan(1)
    const plain = formulaOf({ tex, display: true, maxColumns: 30 }, kittyEnv(), undefined, math)
    expect(plain.image!.key).not.toBe(blue.image!.key)
  })

  test('no image without images, in unicode mode, or before the setup; raw gives nothing', () => {
    const env = kittyEnv()
    expect(formulaOf({ tex: 'x^2' }, { ...env, images: false }, undefined, math)).toEqual({ text: ['x²'] })
    expect(formulaOf({ tex: 'x^2' }, env, undefined, { block: 'image', inline: 'unicode' })).toEqual({ text: ['x²'] })
    expect(formulaOf({ tex: 'x^2' }, null, undefined, math)).toEqual({ text: ['x²'] })
    expect(formulaOf({ tex: 'x^2' }, env, undefined, { block: 'image', inline: 'raw' })).toEqual({ text: null })
  })

  test('an inline formula too tall for a row gets its Unicode alone; a refused one says why', () => {
    const tall = formulaOf({ tex: '\\begin{pmatrix} a \\\\ b \\\\ c \\\\ d \\end{pmatrix}' }, kittyEnv(), undefined, math)
    expect(tall.image).toBeUndefined()
    const refused = formulaOf({ tex: '\\frac{' , display: true }, kittyEnv(), undefined, math)
    expect(refused.image).toBeUndefined()
  })
})
