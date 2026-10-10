// A corpus of real replies' diagrams through kittex's own pipeline (the
// scanner, the job's document, the local TeX from the dumped format, the SVG
// reader, the rasteriser), each next to TeX's own PDF of the same source.
// Skipped unless KITTEX_DIAGRAM_CORPUS names a JSON list of reply markdown;
// KITTEX_DIAGRAM_OUT is where the sources, pictures and results go.
//
//   KITTEX_DIAGRAM_CORPUS=replies.json KITTEX_DIAGRAM_OUT=out npx vitest run core/test/diagram/corpus.test.ts

import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateSync, deflateSync } from 'node:zlib'
import { test } from 'vitest'
import { diagramDocument, drawsPicture, dvisvgmArgv, FORMAT_SOURCE, formatArgv, JOB_NAME, latexArgv, texEnvironment, texError, texPicture, unsafeTex } from '../../src/diagram/index.ts'
import type { DiagramLang, TexDocument } from '../../src/diagram/index.ts'
import { measurePicture, renderPicture, scan } from '../../src/index.ts'

const CORPUS = process.env.KITTEX_DIAGRAM_CORPUS
const OUT = process.env.KITTEX_DIAGRAM_OUT ?? join(tmpdir(), 'kittex-diagram-corpus')
/** Only these diagram numbers (comma-separated), to redo a few. */
const ONLY = process.env.KITTEX_DIAGRAM_ONLY?.split(',').map(Number)

const DARK = { cellWidth: 13, cellHeight: 26, maxColumns: 100, emPx: (13 / 0.6) * 1.15, ink: { r: 220, g: 220, b: 220 }, background: { r: 30, g: 30, b: 30 } }
const LIGHT = { ...DARK, ink: { r: 20, g: 20, b: 20 }, background: { r: 255, g: 255, b: 255 } }

interface Result {
  n: number
  reply: number
  family: string
  lines: number
  refused?: string
  error?: string
  texMs?: number
  drawMs?: number
  cells?: string
  scale?: number
  pngBytes?: number
  reference?: string
}

function family(source: string): string {
  if (/\\chemfig|\\schemestart/.test(source)) return 'chemfig'
  if (/\\begin\{circuitikz\}|\\ctikzset/.test(source)) return 'circuitikz'
  if (/\\begin\{tikzcd\}/.test(source)) return 'tikz-cd'
  if (/\\begin\{(?:axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis|groupplot)\}|\\addplot/.test(source)) return 'pgfplots'
  return 'tikz'
}

function run(argv: string[], dir: string, env: Record<string, string>, timeout = 20_000) {
  const started = performance.now()
  const result = spawnSync(argv[0]!, argv.slice(1), { cwd: dir, env: { ...process.env, ...env }, timeout, encoding: 'utf8', maxBuffer: 64 << 20 })
  return { ...result, ms: performance.now() - started }
}

/** TeX's own document for the source, as a person would compile it: pdfLaTeX, the fragment's packages, nothing changed. */
function referenceDocument(source: string, lang: DiagramLang): string {
  if (lang === 'latex' && (/^(?:\s|%[^\n]*\n)*\\documentclass\b/.test(source) || /\\begin\{document\}/.test(source))) {
    return /\\documentclass/.test(source) ? source : `\\documentclass[border=4pt]{standalone}\n${source}`
  }
  const preamble = FORMAT_SOURCE.split('\n')
    .filter(line => !/^\\makeatletter|^\\csname|^\\begin\{document\}|^\\end\{document\}/.test(line))
    .map(line => line.replace('[dvisvgm,border=1pt]', '[border=4pt]'))
  const lines = /^[ \t]*\\(?:usepackage|RequirePackage|usetikzlibrary|usepgfplotslibrary|usepgflibrary)\b[^\n]*$/gm
  const moved = [...source.matchAll(lines)].map(m => m[0])
  let body = source.replace(lines, '')
  if (lang === 'tikz' && !/\\begin\{tikzpicture\}|\\tikz\b/.test(body)) body = `\\begin{tikzpicture}\n${body}\n\\end{tikzpicture}`
  return [...preamble, ...moved, '\\begin{document}', body, '\\end{document}', ''].join('\n')
}

// ─── PNG in and out, to put TeX's picture over kittex's ──────────────────────

interface Rgba { width: number; height: number; data: Uint8Array }

function decodePng(bytes: Uint8Array): Rgba {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let at = 8
  let width = 0, height = 0, depth = 0, type = 0
  let palette: Uint8Array = new Uint8Array(0)
  let alpha: Uint8Array = new Uint8Array(0)
  const idat: Uint8Array[] = []
  while (at < bytes.length) {
    const length = view.getUint32(at)
    const kind = String.fromCharCode(...bytes.subarray(at + 4, at + 8))
    const data = bytes.subarray(at + 8, at + 8 + length)
    if (kind === 'IHDR') {
      width = view.getUint32(at + 8)
      height = view.getUint32(at + 12)
      depth = data[8]!
      type = data[9]!
    } else if (kind === 'PLTE') palette = data
    else if (kind === 'tRNS') alpha = data
    else if (kind === 'IDAT') idat.push(data)
    at += 12 + length
  }
  if (depth !== 8) throw new Error(`png depth ${depth}`)
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type]!
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const pixels = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x]!
      const a = x >= channels ? pixels[y * stride + x - channels]! : 0
      const b = y > 0 ? pixels[(y - 1) * stride + x]! : 0
      const c = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels]! : 0
      const p = a + b - c
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
      const predictor = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter]!
      pixels[y * stride + x] = (v + predictor) & 255
    }
  }
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    if (type === 3) {
      const k = pixels[i]!
      data.set([palette[k * 3]!, palette[k * 3 + 1]!, palette[k * 3 + 2]!, k < alpha.length ? alpha[k]! : 255], o)
    } else if (type === 2) data.set([pixels[i * 3]!, pixels[i * 3 + 1]!, pixels[i * 3 + 2]!, 255], o)
    else if (type === 6) data.set(pixels.subarray(i * 4, i * 4 + 4), o)
    else if (type === 0) data.set([pixels[i]!, pixels[i]!, pixels[i]!, 255], o)
    else data.set([pixels[i * 2]!, pixels[i * 2]!, pixels[i * 2]!, pixels[i * 2 + 1]!], o)
  }
  return { width, height, data }
}

function crc32(bytes: Uint8Array): number {
  let c = ~0
  for (const byte of bytes) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function encodePngRgb(image: Rgba): Buffer {
  const raw = Buffer.alloc((image.width * 3 + 1) * image.height)
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4
      const a = image.data[i + 3]! / 255
      for (let k = 0; k < 3; k++) raw[y * (image.width * 3 + 1) + 1 + x * 3 + k] = Math.round(image.data[i + k]! * a + 255 * (1 - a))
    }
  }
  const chunk = (kind: string, data: Uint8Array) => {
    const head = Buffer.alloc(8)
    head.writeUInt32BE(data.length)
    head.write(kind, 4, 'latin1')
    const tail = Buffer.alloc(4)
    tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])))
    return Buffer.concat([head, data, tail])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(image.width, 0)
  ihdr.writeUInt32BE(image.height, 4)
  ihdr.set([8, 2, 0, 0, 0], 8)
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array(0))])
}

/** TeX's picture (scaled to fit `width`) above kittex's, with a grey rule between. */
function stack(top: Rgba | undefined, bottom: Rgba | undefined, width: number): Rgba {
  const scaled = (image: Rgba | undefined) => {
    if (!image) return { width, height: 20, data: new Uint8Array(width * 20 * 4).fill(255) }
    const s = Math.min(1, width / image.width)
    const w = Math.max(1, Math.round(image.width * s)), h = Math.max(1, Math.round(image.height * s))
    const data = new Uint8Array(w * h * 4)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(image.data.subarray(((Math.floor(y / s) * image.width + Math.floor(x / s)) * 4), ((Math.floor(y / s) * image.width + Math.floor(x / s)) * 4) + 4), (y * w + x) * 4)
    return { width: w, height: h, data }
  }
  const a = scaled(top), b = scaled(bottom)
  const height = a.height + 6 + b.height
  const data = new Uint8Array(width * height * 4).fill(255)
  for (let y = 0; y < a.height; y++) data.set(a.data.subarray(y * a.width * 4, (y + 1) * a.width * 4), y * width * 4)
  for (let y = a.height; y < a.height + 6; y++) for (let x = 0; x < width; x++) data.set([150, 150, 150, 255], (y * width + x) * 4)
  for (let y = 0; y < b.height; y++) data.set(b.data.subarray(y * b.width * 4, (y + 1) * b.width * 4), (a.height + 6 + y) * width * 4)
  return { width, height, data }
}

test.skipIf(!CORPUS)('the diagram corpus through kittex and through TeX', { timeout: 3_600_000 }, () => {
  const replies = JSON.parse(readFileSync(CORPUS!, 'utf8')) as string[]
  mkdirSync(OUT, { recursive: true })
  const fmtDir = mkdtempSync(join(tmpdir(), 'kittex-fmt.'))
  const name = 'kittex-corpus'
  {
    const dir = mkdtempSync(join(tmpdir(), 'kittex-tex.'))
    writeFileSync(join(dir, `${name}.tex`), FORMAT_SOURCE)
    const dumped = run(formatArgv(name), dir, texEnvironment(dir), 120_000)
    if (dumped.status !== 0) throw new Error(`format: ${texError(dumped.stdout ?? '')}`)
    copyFileSync(join(dir, `${name}.fmt`), join(fmtDir, `${name}.fmt`))
    rmSync(dir, { recursive: true, force: true })
  }
  const results: Result[] = []
  let n = 0
  replies.forEach((markdown, reply) => {
    for (const segment of scan(markdown, { diagrams: true })) {
      if (segment.kind !== 'math' || !segment.diagram) continue
      const lang: DiagramLang = segment.diagram === 'env' ? 'env' : segment.diagram
      if (!drawsPicture(segment.tex, lang)) continue
      n++
      if (ONLY && !ONLY.includes(n)) continue
      const id = String(n).padStart(2, '0')
      const source = segment.tex
      writeFileSync(join(OUT, `${id}.src.tex`), source)
      const result: Result = { n, reply: reply + 1, family: family(source), lines: source.split('\n').length }
      results.push(result)
      const refused = unsafeTex(source)
      if (refused) result.refused = refused
      // TeX's own picture, whatever kittex does.
      {
        const dir = mkdtempSync(join(tmpdir(), 'kittex-ref.'))
        writeFileSync(join(dir, 'ref.tex'), referenceDocument(source, lang))
        const pdf = run(['pdflatex', '-interaction=nonstopmode', '-halt-on-error', '-no-shell-escape', 'ref.tex'], dir, {}, 120_000)
        if (pdf.status === 0 && existsSync(join(dir, 'ref.pdf'))) {
          copyFileSync(join(dir, 'ref.pdf'), join(OUT, `${id}.ref.pdf`))
          // Quick Look draws the PDF sharp at any size (sips only at 72 dpi), but now and then never returns.
          spawnSync('qlmanage', ['-t', '-s', '1400', '-o', dir, join(dir, 'ref.pdf')], { stdio: 'ignore', timeout: 20_000, killSignal: 'SIGKILL' })
          // Elsewhere, poppler's pdftoppm.
          if (!existsSync(join(dir, 'ref.pdf.png'))) spawnSync('pdftoppm', ['-png', '-r', '300', '-singlefile', join(dir, 'ref.pdf'), join(dir, 'ref.pdf')], { stdio: 'ignore', timeout: 20_000 })
          if (!existsSync(join(dir, 'ref.pdf.png'))) spawnSync('sips', ['-s', 'format', 'png', join(dir, 'ref.pdf'), '--out', join(dir, 'ref.pdf.png')], { stdio: 'ignore', timeout: 20_000 })
          if (existsSync(join(dir, 'ref.pdf.png'))) copyFileSync(join(dir, 'ref.pdf.png'), join(OUT, `${id}.ref.png`))
          result.reference = 'ok'
        } else result.reference = texError(pdf.stdout ?? '')
        rmSync(dir, { recursive: true, force: true })
      }
      if (refused) continue
      const document: TexDocument = diagramDocument(source, lang)
      const dir = mkdtempSync(join(tmpdir(), 'kittex-tex.'))
      try {
        writeFileSync(join(dir, `${JOB_NAME}.tex`), document.text)
        const env = { ...texEnvironment(dir), TEXFORMATS: `${fmtDir}:` }
        const latex = run(document.format ? latexArgv(name) : latexArgv(), dir, env, 20_000)
        if (latex.status !== 0) {
          result.texMs = Math.round(latex.ms)
          result.error = latex.error ? `TeX took longer than 20 s` : texError(`${latex.stdout}\n${existsSync(join(dir, `${JOB_NAME}.log`)) ? readFileSync(join(dir, `${JOB_NAME}.log`), 'utf8') : ''}`, document.offset)
          continue
        }
        const svg = run(dvisvgmArgv(dir), dir, env, 20_000)
        result.texMs = Math.round(latex.ms + svg.ms)
        if (svg.status !== 0 || !svg.stdout.includes('<svg')) {
          result.error = `dvisvgm: ${(svg.stderr ?? '').split('\n')[0]}`
          continue
        }
        writeFileSync(join(OUT, `${id}.svg`), svg.stdout)
        const started = performance.now()
        try {
          const picture = texPicture(svg.stdout, document)
          const box = measurePicture(picture, DARK)
          const dark = renderPicture(picture, DARK, box.rows)
          result.drawMs = Math.round(performance.now() - started)
          result.cells = `${dark.columns}x${dark.rows}`
          result.scale = Math.round(dark.scale * 100) / 100
          result.pngBytes = dark.png.length
          writeFileSync(join(OUT, `${id}.dark.png`), dark.png)
          const light = renderPicture(picture, LIGHT, box.rows)
          writeFileSync(join(OUT, `${id}.light.png`), light.png)
          const ref = existsSync(join(OUT, `${id}.ref.png`)) ? decodePng(readFileSync(join(OUT, `${id}.ref.png`))) : undefined
          writeFileSync(join(OUT, `${id}.pair.png`), encodePngRgb(stack(ref, decodePng(light.png), 1300)))
        } catch (error) {
          result.error = `draw: ${error instanceof Error ? error.message : String(error)}`
        }
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    }
  })
  rmSync(fmtDir, { recursive: true, force: true })
  for (const result of results) process.stderr.write(`${String(result.n).padStart(2, '0')} ${result.family} ${result.refused ?? result.error ?? `ok ${result.texMs} ms tex, ${result.drawMs} ms draw, ${result.cells}`}\n`)
  const file = join(OUT, ONLY ? 'results-only.json' : 'results.json')
  writeFileSync(file, JSON.stringify(results, null, 1))
})
