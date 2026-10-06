// Glyph outlines for the banner: New Computer Modern from kittex's own
// typesetter (MathJax 4 with the newcm font, bundled with esbuild the way
// scripts/build.mjs bundles core) and Roboto Mono for the raw LaTeX source.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import opentype from 'opentype.js'

/** Loads core/src/typeset in Node and returns its `typeset(tex, options)`. */
export async function loadTypesetter() {
  const dir = mkdtempSync(join(tmpdir(), 'kittex-banner-'))
  const outfile = join(dir, 'typeset.mjs')
  try {
    await build({
      entryPoints: ['core/src/typeset/index.ts'],
      bundle: true,
      format: 'esm',
      platform: 'neutral',
      mainFields: ['module', 'main'],
      conditions: ['import', 'default'],
      target: 'es2022',
      outfile,
      logLevel: 'warning',
    })
    const module = await import(pathToFileURL(outfile).href)
    await module.initTypeset()
    return module.typeset
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const MONO_PATHS = [
  process.env.ROBOTO_MONO,
  '/usr/share/fonts/TTF/RobotoMono-Regular.ttf',
  '/usr/share/fonts/truetype/roboto/mono/RobotoMono-Regular.ttf',
  '/usr/share/fonts/roboto-mono/RobotoMono-Regular.ttf',
].filter(Boolean)

/** Roboto Mono, parsed: `{ upm, advance, xHeight, capHeight, glyph(char) -> path data in font units, y up }`. */
export function loadMono() {
  let bytes
  for (const path of MONO_PATHS) {
    try {
      bytes = readFileSync(path)
      break
    } catch {}
  }
  if (!bytes) throw new Error(`Roboto Mono not found; set ROBOTO_MONO to RobotoMono-Regular.ttf (tried ${MONO_PATHS.join(', ')})`)
  const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  return {
    upm: font.unitsPerEm,
    advance: font.charToGlyph('x').advanceWidth,
    xHeight: font.tables.os2.sxHeight,
    capHeight: font.tables.os2.sCapHeight,
    glyph: char => font.charToGlyph(char).path.toPathData(0),
  }
}
