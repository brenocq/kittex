// The stress runner: every formula of the stress corpus through the real
// pipeline (measureDisplay, previewDisplay as the plugin calls it, renderDisplay)
// at 13×26 px cells (or KITTEX_STRESS_CELL) and several reply widths, recording what goes wrong, plus
// contact sheets of every image for checking by eye. Slow (minutes), so it is
// skipped unless KITTEX_STRESS=1; `npm run stress` runs it. Results go to
// KITTEX_STRESS_OUT (default: a kittex-stress folder under the OS temp dir).
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { unzlibSync } from 'fflate'
import { expect, test } from 'vitest'

import {
  emPxForCell,
  GlyphError,
  init,
  measureDisplay,
  previewDisplay,
  previewInline,
  rasterize,
  renderDisplay,
  TexError,
  texToMathML,
  toUnicode,
  typeset,
} from '../../src/index.js'
import type { RenderEnv } from '../../src/index.js'
import { init as initBundle } from '../../../plugin/hooks/core.js'
import { BLANK_CELL, displayPreviewLines } from '../../../plugin/hooks/math.js'
import { STRESS_CORPUS } from './corpus.js'
import { contactSheets, touchesEdge } from './sheet.js'
import type { Coverage, SheetEntry } from './sheet.js'

const RUN = process.env.KITTEX_STRESS === '1'
const OUT = process.env.KITTEX_STRESS_OUT ?? join(tmpdir(), 'kittex-stress')
/** Reply columns to run at: the user's (a 100-column window less the reply indent), narrow and wide. */
const WIDTHS = (process.env.KITTEX_STRESS_WIDTHS ?? '98,40,160').split(',').map(Number)
/** Widths that get contact sheets. */
const SHEET_WIDTHS = new Set((process.env.KITTEX_STRESS_SHEETS ?? '98,40').split(',').map(Number))

/** Cell size in px, `WxH` (KITTEX_STRESS_CELL; default the Linux rig's 13×26, e.g. 7x13 for Menlo 11 pt on a 1x Mac). */
const [CELL_W, CELL_H] = (process.env.KITTEX_STRESS_CELL ?? '13x26').split('x').map(Number) as [number, number]
const CELL = { cellWidth: CELL_W, cellHeight: CELL_H }
const INK = { r: 0xeb, g: 0xdb, b: 0xb2 }
const BACKGROUND = { r: 0x28, g: 0x28, b: 0x28 }

/** Thresholds behind the flags. */
const LIMITS = { scale: 0.6, renderMs: 50, pngBytes: 64 * 1024, cells: 255 }

/** `rows`: a table broken inside its cells (stacked or compact; breakTables). */
type Form = 'stacked' | 'compact' | 'inline' | 'rows'

interface Outcome {
  index: number
  area: string
  stress: string[]
  tex: string
  width: number
  error?: string
  /** Rows reserved (measureDisplay), and the image's own rows without padding. */
  rows?: number
  naturalRows?: number
  columns?: number
  scale?: number
  /** First measure + render of this formula at this width, ms (typeset, raster, PNG). */
  ms?: number
  pngBytes?: number
  /**
   * Which Unicode form the plugin's preview shows: a 2-D form that fits,
   * `wrapped` when none does and the one-line form is wrapped at the width
   * (cut with … past the rows), `source` when Unicode has no form at all and
   * the plugin streams the TeX itself.
   */
  preview?: Form | 'wrapped' | 'source'
  /** The preview as the plugin writes it (displayPreviewLines), its markdown padding and escapes undone. */
  previewLines?: string[]
  /** One-line Unicode for the same TeX as inline math (null: none). */
  inline?: string | null
  /** Ink in the outermost pixel of the image: clipped or touching glyphs. */
  edges?: string[]
  flags: string[]
}

/** Decodes a kittex palette PNG (colour type 3, filter None) back to coverage: pixel value = alpha. */
function decodeCoverage(png: Uint8Array): Coverage {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  const idat: Uint8Array[] = []
  for (let at = 8; at < png.length; ) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8))
    if (type === 'IDAT') idat.push(png.subarray(at + 8, at + 8 + length))
    at += 12 + length
  }
  const joined = new Uint8Array(idat.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of idat) {
    joined.set(c, at)
    at += c.length
  }
  const raw = unzlibSync(joined)
  const alpha = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    if (raw[y * (width + 1)] !== 0) throw new Error('unexpected PNG filter')
    alpha.set(raw.subarray(y * (width + 1) + 1, (y + 1) * (width + 1)), y * width)
  }
  return { alpha, width, height }
}

/** A label drawn with the typesetter itself, left-aligned. */
function label(text: string): Coverage {
  const safe = text.replace(/[^A-Za-z0-9 .,:;=()/+-]/g, ' ')
  const result = typeset(`\\text{${safe}}`, { display: false })
  const options = { emPx: 18, cellWidth: 9, cellHeight: 22, maxColumns: 255, align: 'left' as const }
  const raster = rasterize(result, options)
  return { alpha: raster.alpha, width: raster.widthPx, height: raster.heightPx }
}

/** Which form the plugin's preview took: the first whose own lines fit the reserved rows, as previewDisplay picks. */
function chosenForm(tex: string, maxWidth: number, rows: number): Form | 'source' {
  for (const form of ['stacked', 'compact', 'inline'] as const) {
    try {
      const display = form !== 'inline'
      const result = toUnicode(texToMathML(tex, { display }), { display, maxWidth, compact: form === 'compact', breakLines: true })
      if (result && result.lines.length <= rows) return form
    } catch {
      // not this form
    }
  }
  for (const compact of [false, true]) {
    const result = toUnicode(texToMathML(tex, { display: true }), { display: true, maxWidth, compact, breakLines: true, breakTables: true })
    if (result && result.lines.length <= rows) return 'rows'
  }
  return 'source'
}

/** The plugin's preview lines for a display formula `rows` tall at reply column `width`, as plain text. */
function pluginPreview(tex: string, width: number, rows?: number): string[] | undefined {
  const lines = displayPreviewLines(tex, width, rows)
  return lines?.map(line => line.replaceAll('&nbsp;', ' ').replaceAll(BLANK_CELL, ' ').replace(/\\([\\`*_[\]<>|~&!#])/g, '$1'))
}

/** What the plugin streams where no 2-D form fits: the wrapped one-line form, or the TeX source when there is none. */
function fallbackKind(tex: string): 'wrapped' | 'source' {
  return previewInline(tex, undefined, { tight: false }) === null ? 'source' : 'wrapped'
}

function run(index: number, width: number): { outcome: Outcome; coverage?: Coverage } {
  const { area, stress, tex } = STRESS_CORPUS[index]!
  const env: RenderEnv = { ...CELL, maxColumns: width, emPx: emPxForCell(CELL), ink: INK }
  const outcome: Outcome = { index, area, stress, tex, width, flags: [] }
  // The plugin previews in two columns fewer than the reply column (math.ts previewColumns).
  const previewWidth = Math.max(1, width - 2)
  outcome.inline = previewInline(tex, width)
  let coverage: Coverage | undefined
  try {
    const start = performance.now()
    const box = measureDisplay(tex, env)
    const image = renderDisplay(tex, env, box.rows)
    outcome.ms = performance.now() - start
    outcome.rows = box.rows
    outcome.columns = image.columns
    outcome.scale = image.scale
    outcome.pngBytes = image.png.length
    outcome.naturalRows = renderDisplay(tex, env).rows
    const lines = previewDisplay(tex, { maxColumns: previewWidth }, box.rows)
    outcome.preview = lines ? chosenForm(tex, previewWidth, box.rows) : fallbackKind(tex)
    outcome.previewLines = pluginPreview(tex, width, box.rows)
    coverage = decodeCoverage(image.png)
    const edge = touchesEdge(coverage)
    outcome.edges = Object.entries(edge).filter(([, v]) => v).map(([k]) => k)
    if (image.rows !== box.rows) outcome.flags.push('image-rows-differ')
    if (lines && lines.length !== box.rows) outcome.flags.push('preview-rows-differ')
    if (!lines) outcome.flags.push(outcome.preview === 'source' ? 'source-preview' : 'wrapped-preview')
    if (box.rows > outcome.naturalRows) outcome.flags.push('padded')
    if (image.scale < LIMITS.scale) outcome.flags.push('scale<0.6')
    else if (image.scale < 1) outcome.flags.push('scaled')
    if (outcome.ms > LIMITS.renderMs) outcome.flags.push('slow')
    if (image.png.length > LIMITS.pngBytes) outcome.flags.push('png>64K')
    if (box.rows >= LIMITS.cells) outcome.flags.push('rows>=255')
    if (outcome.edges.length > 0) outcome.flags.push('edge')
  } catch (error) {
    if (!(error instanceof TexError)) throw error
    outcome.error = error.message
    if (error instanceof GlyphError) {
      // No image, but measureDisplay reserves the preview's rows and the preview stays.
      outcome.flags.push('glyph-fallback')
      const rows = measureDisplay(tex, env).rows
      outcome.rows = rows
      outcome.previewLines = pluginPreview(tex, width, rows)
      outcome.preview = previewDisplay(tex, { maxColumns: previewWidth }, rows) ? chosenForm(tex, previewWidth, rows) : fallbackKind(tex)
      return { outcome }
    }
    outcome.flags.push('tex-error')
    outcome.preview = previewDisplay(tex, { maxColumns: previewWidth }) ? chosenForm(tex, previewWidth, Infinity) : fallbackKind(tex)
  }
  return { outcome, coverage }
}

test.skipIf(!RUN)(
  'stress corpus through the pipeline',
  async () => {
    await init()
    await initBundle()
    mkdirSync(OUT, { recursive: true })
    // Warm MathJax up so the first formula's time is its own.
    renderDisplay('x', { ...CELL, maxColumns: 98, emPx: emPxForCell(CELL), ink: INK })
    const all: Outcome[] = []
    for (const width of WIDTHS) {
      const entries: SheetEntry[] = []
      const previews: string[] = []
      for (let i = 0; i < STRESS_CORPUS.length; i++) {
        const { outcome, coverage } = run(i, width)
        all.push(outcome)
        const head = `${i}. ${outcome.area} (${outcome.stress.join(', ')}) ${outcome.rows ?? '-'} rows, scale ${outcome.scale?.toFixed(2) ?? '-'}${outcome.error ? ', ERROR ' + outcome.error : ''}`
        previews.push(
          [
            `── ${head}`,
            `tex: ${outcome.tex.replace(/\s*\n\s*/g, ' ')}`,
            `flags: ${outcome.flags.join(' ') || '-'}; preview: ${outcome.preview}; inline: ${outcome.inline ?? '(none)'}`,
            ...(outcome.previewLines ?? []).map(line => `│${line}`),
            '',
          ].join('\n'),
        )
        if (SHEET_WIDTHS.has(width)) {
          const text = `${i}  ${outcome.area}  ${outcome.rows ?? '-'}r  s=${outcome.scale?.toFixed(2) ?? '-'}  ${outcome.flags.join(' ')}${outcome.error ? '  ' + outcome.error.slice(0, 60) : ''}`
          entries.push({ label: label(text), image: coverage ?? { alpha: new Uint8Array(1), width: 1, height: 1 } })
        }
      }
      writeFileSync(join(OUT, `previews-${width}.txt`), previews.join('\n'))
      if (entries.length > 0) {
        const { pages, pageOf } = contactSheets(entries, { ink: INK, background: BACKGROUND, rule: { r: 0x50, g: 0x49, b: 0x45 }, maxHeight: 1400 })
        const name = (p: number) => `sheet-${width}-${String(p + 1).padStart(2, '0')}.png`
        for (const [p, png] of pages.entries()) writeFileSync(join(OUT, name(p)), png)
        writeFileSync(join(OUT, `sheet-index-${width}.txt`), pageOf.map((p, i) => `${i}\t${name(p)}`).join('\n') + '\n')
      }
    }
    writeFileSync(join(OUT, 'results.json'), JSON.stringify(all, null, 1))
    writeFileSync(join(OUT, 'summary.txt'), summarize(all))
    expect(all.length).toBe(STRESS_CORPUS.length * WIDTHS.length)
  },
  30 * 60 * 1000,
)

function summarize(all: readonly Outcome[]): string {
  const out: string[] = []
  for (const width of WIDTHS) {
    const rows = all.filter(o => o.width === width)
    const count = (flag: string) => rows.filter(o => o.flags.includes(flag)).length
    const times = rows.flatMap(o => (o.ms === undefined ? [] : [o.ms])).sort((a, b) => a - b)
    const forms = ['stacked', 'compact', 'inline', 'rows', 'wrapped', 'source'].map(f => `${f} ${rows.filter(o => o.preview === f).length}`).join(', ')
    out.push(
      `width ${width}: ${rows.length} formulas; tex-error ${count('tex-error')}, glyph-fallback ${count('glyph-fallback')}, wrapped-preview ${count('wrapped-preview')}, source-preview ${count('source-preview')}, padded ${count('padded')}, ` +
        `scale<0.6 ${count('scale<0.6')}, scaled ${count('scaled')}, slow ${count('slow')}, png>64K ${count('png>64K')}, rows>=255 ${count('rows>=255')}, edge ${count('edge')}`,
      `  previews: ${forms}`,
      `  render ms: median ${times[Math.floor(times.length / 2)]?.toFixed(1)}, p90 ${times[Math.floor(times.length * 0.9)]?.toFixed(1)}, max ${times[times.length - 1]?.toFixed(1)}`,
    )
    for (const o of rows.filter(o => o.flags.length > 0)) {
      out.push(`  #${o.index} [${o.area}: ${o.stress.join(',')}] ${o.flags.join(' ')}${o.error ? ' :: ' + o.error : ''}${o.scale !== undefined ? ` (rows ${o.rows}/${o.naturalRows}, scale ${o.scale.toFixed(2)}, ${o.ms?.toFixed(0)} ms, ${o.pngBytes} B, preview ${o.preview}${o.edges?.length ? ', edges ' + o.edges.join('/') : ''})` : ''}`)
    }
    out.push('')
  }
  return out.join('\n')
}
