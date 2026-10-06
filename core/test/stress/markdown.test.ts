// The markdown stress runner: replies with math in hard places (markdown.ts)
// through the plugin's own pure side, exactly as it ships (plugin/hooks/math.ts
// over the built core bundle): core's scan, MessageStream fed line by line and
// in batches as MessageDisplay feeds it, and planLanded on the landed text (the
// rewrite, and the original as after --resume). It records mis-scans, previews
// whose rows differ from their images, TeX left raw, and inline Unicode that
// carries markdown syntax into the engine's markdown. Skipped unless
// KITTEX_STRESS=1; writes markdown-report.txt to KITTEX_STRESS_OUT.
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { expect, test } from 'vitest'

import { emPxForCell, init, measureDisplay, previewInline, renderDisplay, scan } from '../../../plugin/hooks/core.js'
import type { Segment } from '../../../plugin/hooks/core.js'
import { MessageStream, planLanded, renderEnvFor } from '../../../plugin/hooks/math.js'
import type { KittexEnv, PreviewRecord } from '../../../plugin/hooks/math.js'
import { MARKDOWN_CASES } from './markdown.js'

const RUN = process.env.KITTEX_STRESS === '1'
const OUT = process.env.KITTEX_STRESS_OUT ?? join(tmpdir(), 'kittex-stress')
const CELL = { cellWidth: 13, cellHeight: 26 }

function envFor(replyColumns: number): KittexEnv {
  return { kind: 'kitty', images: true, ...CELL, columns: replyColumns + 2, emPx: emPxForCell(CELL), ink: { r: 0xeb, g: 0xdb, b: 0xb2 }, measured: true }
}

/** Streams the reply as MessageDisplay would: `perFlush` lines a flush, the last flush final. */
function stream(markdown: string, env: KittexEnv, perFlush: number): { shown: string; records: PreviewRecord[]; maxMs: number; totalMs: number } {
  const lines = markdown.split(/(?<=\n)/)
  const s = new MessageStream()
  let shown = ''
  const records: PreviewRecord[] = []
  let maxMs = 0
  let totalMs = 0
  for (let i = 0; i < lines.length; i += perFlush) {
    const delta = lines.slice(i, i + perFlush).join('')
    const start = performance.now()
    const flush = s.push(delta, i + perFlush >= lines.length, env)
    const ms = performance.now() - start
    maxMs = Math.max(maxMs, ms)
    totalMs += ms
    shown += flush.text
    records.push(...flush.records)
  }
  return { shown, records, maxMs, totalMs }
}

/** Text with fenced blocks and code spans blanked out. */
function withoutCode(text: string): string {
  return text.replace(/^(```|~~~)[\s\S]*?^\1/gm, '').replace(/(`+)[^`]*?\1/g, '')
}

const RAW_TEX = /\\(frac|begin|end|sum|int|alpha|mathbf|mathcal|left|right|text|sqrt|partial|nabla|mu|nu|lambda|cdot|times|le|ge|mid)\b|\$\$|\^\{|_\{/

function describe(segments: readonly Segment[]): string[] {
  return segments.filter(s => s.kind === 'math').map(s => (s.kind === 'math' ? `${s.display ? 'D' : 'i'}[${s.delimiter}] ${s.tex.replace(/\s+/g, ' ').slice(0, 70)}` : ''))
}

test.skipIf(!RUN)(
  'markdown stress cases through the plugin',
  async () => {
    await init()
    mkdirSync(OUT, { recursive: true })
    const report: string[] = []
    const summary: string[] = []
    for (const c of MARKDOWN_CASES) {
      const columns = c.columns ?? 98
      const env = envFor(columns)
      const renderEnv = renderEnvFor(env)
      const flags: string[] = []
      const segments = scan(c.markdown)
      const inline = segments.filter(s => s.kind === 'math' && !s.display)
      const display = segments.filter(s => s.kind === 'math' && s.display)
      if (c.inline !== undefined && inline.length !== c.inline) flags.push(`inline math found ${inline.length}, expected ${c.inline}`)
      if (c.display !== undefined && display.length !== c.display) flags.push(`display math found ${display.length}, expected ${c.display}`)

      const byLine = stream(c.markdown, env, 1)
      const batched = stream(c.markdown, env, 3)
      const whole = stream(c.markdown, env, 1e9)
      if (byLine.shown !== batched.shown || byLine.shown !== whole.shown) flags.push('streamed text depends on how the reply was split into flushes')
      if (byLine.maxMs > 100) flags.push(`slow flush: ${byLine.maxMs.toFixed(0)} ms`)

      for (const r of byLine.records) {
        const lines = r.preview.split('\n').length
        if (r.rows > 0 && lines !== r.rows) flags.push(`preview of ${lines} lines reserves ${r.rows} rows: ${r.tex.slice(0, 40)}`)
        if (r.rows > 0 && r.preview.includes('```')) flags.push(`preview is a fence: ${r.tex.slice(0, 40)}`)
      }
      const shownNoCode = withoutCode(byLine.shown)
      const raw = shownNoCode.split('\n').filter(line => RAW_TEX.test(line))
      if (raw.length > 0) flags.push(`raw TeX left in the streamed text (${raw.length} lines)`)

      const draw = (tex: string, rows?: number) => renderDisplay(tex, renderEnv, rows ?? measureDisplay(tex, renderEnv).rows)
      let planMs = performance.now()
      const landed = planLanded(byLine.shown, byLine.records, { maxColumns: renderEnv.maxColumns, draw })
      planMs = performance.now() - planMs
      let resumeMs = performance.now()
      const resumed = planLanded(c.markdown, [], { maxColumns: renderEnv.maxColumns, draw })
      resumeMs = performance.now() - resumeMs
      const images = landed.pieces.filter(p => p.kind === 'image')
      const resumedImages = resumed.pieces.filter(p => p.kind === 'image')
      if (images.length !== resumedImages.length) flags.push(`live landing draws ${images.length} images, resumed ${resumedImages.length}`)
      for (const r of byLine.records.filter(r => r.rows > 0)) {
        const image = images.find(p => p.kind === 'image' && p.tex === r.tex)
        if (!image) flags.push(`preview never became an image: ${r.tex.slice(0, 40)}`)
        else if (image.kind === 'image' && image.image.rows !== r.rows) flags.push(`image ${image.image.rows} rows where ${r.rows} were reserved`)
      }
      if (planMs > 200 || resumeMs > 200) flags.push(`slow landing: live ${planMs.toFixed(0)} ms, resumed ${resumeMs.toFixed(0)} ms`)

      const hazards = new Set<string>()
      for (const s of inline) {
        if (s.kind !== 'math') continue
        const unicode = previewInline(s.tex, renderEnv.maxColumns)
        if (unicode === null) hazards.add(`no one-line Unicode (raw kept): ${s.raw.slice(0, 50)}`)
        else if (/[|*_<>`[\]~\\]/.test(unicode)) hazards.add(`inline Unicode carries markdown syntax: ${s.raw.slice(0, 40)} -> ${unicode.slice(0, 60)}`)
      }
      flags.push(...hazards)

      summary.push(`${flags.length === 0 ? 'ok  ' : 'FLAG'} ${c.name}: ${flags.length} flags; stream max ${byLine.maxMs.toFixed(1)} ms, total ${byLine.totalMs.toFixed(0)} ms; landing ${planMs.toFixed(0)} ms, resumed ${resumeMs.toFixed(0)} ms`)
      const cut = (text: string) => (text.split('\n').length > 60 ? text.split('\n').slice(0, 60).join('\n') + '\n…' : text)
      report.push(
        `════ ${c.name} (reply column ${columns})`,
        c.note ? `note: ${c.note}` : '',
        '── input',
        cut(c.markdown),
        '── math found by scan',
        ...describe(segments).slice(0, 30),
        '── flags',
        ...(flags.length ? flags : ['(none)']),
        ...(raw.length ? ['── raw TeX lines in the streamed text', ...raw.slice(0, 10)] : []),
        '── streamed text (what MessageDisplay shows; &nbsp; pads)',
        cut(byLine.shown),
        '── landed plan',
        ...landed.pieces.slice(0, 40).map(p => (p.kind === 'prose' ? `prose${p.gap ? '+gap' : ''}: ${p.text.replace(/\n/g, '⏎').slice(0, 110)}` : p.kind === 'image' ? `image${p.gap ? '+gap' : ''}: ${p.image.columns}×${p.image.rows} ${p.tex.replace(/\s+/g, ' ').slice(0, 60)}` : `note: ${p.text}`)),
        '',
      )
    }
    writeFileSync(join(OUT, 'markdown-report.txt'), summary.join('\n') + '\n\n' + report.join('\n'))
    expect(summary.length).toBe(MARKDOWN_CASES.length)
  },
  10 * 60 * 1000,
)
