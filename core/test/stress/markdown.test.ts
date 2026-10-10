// The markdown stress runner: replies with math in hard places (markdown.ts)
// through the plugin's own pure side, exactly as it ships (plugin/hooks/math.ts
// over the built core bundle): core's scan, MessageStream fed line by line and
// in batches as MessageDisplay feeds it, and planLanded on the landed text (the
// rewrite, and the original as after --resume). It records mis-scans, previews
// whose rows differ from their images, TeX left raw, and inline Unicode that
// carries markdown syntax into the engine's markdown. Skipped unless
// KITTEX_STRESS=1; writes markdown-report.txt to KITTEX_STRESS_OUT.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { marked } from 'marked'
import type { Token } from 'marked'
import { expect, test } from 'vitest'

import { emPxForCell, init, measureDisplay, previewInline, renderDisplay, scan } from '../../../plugin/hooks/core.js'
import type { Segment } from '../../../plugin/hooks/core.js'
import { MessageStream, planLanded, renderEnvFor } from '../../../plugin/hooks/math.js'
import type { KittexEnv, PreviewRecord } from '../../../plugin/hooks/math.js'
import { runCase } from '../fuzz/drive.js'
import type { Shape } from '../fuzz/drive.js'
import { MARKDOWN_CASES, REPLY_CASES } from './markdown.js'
import type { MarkdownCase } from './markdown.js'

const RUN = process.env.KITTEX_STRESS === '1'
const OUT = process.env.KITTEX_STRESS_OUT ?? join(tmpdir(), 'kittex-stress')
/** Cell size in px, `WxH` (KITTEX_STRESS_CELL; default the Linux rig's 13×26, e.g. 7x13 for Menlo 11 pt on a 1x Mac). */
const [CELL_W, CELL_H] = (process.env.KITTEX_STRESS_CELL ?? '13x26').split('x').map(Number) as [number, number]
const CELL = { cellWidth: CELL_W, cellHeight: CELL_H }
/** Reply columns each case runs at (a case with its own `columns` runs once). */
const WIDTHS = (process.env.KITTEX_STRESS_MD_WIDTHS ?? '98').split(',').map(Number)
/** A JSON list of reply markdown to run as well. */
const REPLIES = process.env.KITTEX_STRESS_REPLIES

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

/** Markdown constructs inline math could turn its neighbours into: counted in the engine's markdown (marked) of a text. */
const SYNTAX = ['em', 'strong', 'del', 'link', 'html', 'codespan', 'table'] as const

function syntaxOf(markdown: string): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(SYNTAX.map(k => [k, 0]))
  const walk = (tokens: readonly Token[] | undefined): void => {
    for (const token of tokens ?? []) {
      if (token.type in counts) counts[token.type]!++
      const t = token as Token & { tokens?: Token[]; items?: Token[]; header?: { tokens: Token[] }[]; rows?: { tokens: Token[] }[][] }
      walk(t.tokens)
      walk(t.items)
      for (const cell of t.header ?? []) walk(cell.tokens)
      for (const row of t.rows ?? []) for (const cell of row) walk(cell.tokens)
    }
  }
  walk(marked.lexer(markdown, { gfm: true }))
  return counts
}

/** The reply with each formula a plain word: the markdown a correct rewrite keeps. */
function withMathAsWords(markdown: string, segments: readonly Segment[]): string {
  return segments.map(s => (s.kind === 'text' ? s.text : s.display ? 'D' : 'M')).join('')
}

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
    // Recorded replies (a JSON list of markdown strings, e.g. a fakeapi.py replies file), when given.
    const recorded: MarkdownCase[] = REPLIES ? (JSON.parse(readFileSync(REPLIES, 'utf8')) as string[]).map((markdown, i) => ({ name: `recorded reply ${i}`, markdown })) : []
    const runs = WIDTHS.flatMap(width => [...MARKDOWN_CASES, ...REPLY_CASES, ...recorded].filter(c => c.columns === undefined || width === WIDTHS[0]).map(c => ({ c, columns: c.columns ?? width })))
    for (const { c, columns } of runs) {
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
      // Display images: pieces of their own, or (since images are overlays) laid over their previews in a prose piece.
      const displayImages = (plan: typeof landed) =>
        plan.pieces.flatMap(p => (p.kind === 'image' ? [{ tex: p.tex, rows: p.image.rows }] : p.kind === 'prose' ? (p.inline ?? []).filter(i => i.display).map(i => ({ tex: i.tex, rows: i.image.rows })) : []))
      const images = displayImages(landed)
      const resumedImages = displayImages(resumed)
      if (images.length !== resumedImages.length) flags.push(`live landing draws ${images.length} images, resumed ${resumedImages.length}`)
      for (const r of byLine.records.filter(r => r.rows > 0)) {
        const image = images.find(p => p.tex === r.tex)
        if (!image) flags.push(`preview never became an image: ${r.tex.slice(0, 40)}`)
        else if (image.rows !== r.rows) flags.push(`image ${image.rows} rows where ${r.rows} were reserved`)
      }
      if (planMs > 200 || resumeMs > 200) flags.push(`slow landing: live ${planMs.toFixed(0)} ms, resumed ${resumeMs.toFixed(0)} ms`)

      const hazards = new Set<string>()
      for (const s of inline) {
        if (s.kind !== 'math') continue
        if (previewInline(s.tex, renderEnv.maxColumns) === null) hazards.add(`no one-line Unicode within the column (wrapped or raw): ${s.raw.slice(0, 50)}`)
      }
      flags.push(...hazards)
      // Markdown the streamed text gains or loses against the reply with its inline math as plain words (stress F1).
      const want = syntaxOf(withMathAsWords(c.markdown, segments))
      // (The `*not rendered: …*` line under a refused formula is italic by design.)
      const got = syntaxOf(byLine.shown.replace(/^\*not rendered: .*\*$/gm, 'note'))
      for (const k of SYNTAX) if (want[k] !== got[k]) flags.push(`streamed text has ${got[k]} ${k} where the reply has ${want[k]}`)

      // Every invariant of the fuzz driver (rows, image places, raw LaTeX, resume parity), on this fixed reply.
      const shape: Shape = { columns: columns + 2, ...CELL, terminal: 'kitty', block: 'image', inline: 'image', links: 'osc8', trimLanded: false, flushSeed: 1 }
      const checked = runCase(c.markdown, shape)
      for (const f of checked.failures) flags.push(`fuzz check ${f.check}/${f.cause}: ${f.detail.replace(/\s+/g, ' ').slice(0, 160)}`)

      const st = checked.stats
      summary.push(`${flags.length === 0 ? 'ok  ' : 'FLAG'} ${c.name} @${columns}: ${flags.length} flags; images inline ${st.inlineImages}/${st.inline}, display ${st.displayImages}/${st.display}; stream max ${byLine.maxMs.toFixed(1)} ms, total ${byLine.totalMs.toFixed(0)} ms; landing ${planMs.toFixed(0)} ms, resumed ${resumeMs.toFixed(0)} ms`)
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
    expect(summary.length).toBe(runs.length)
  },
  10 * 60 * 1000,
)
