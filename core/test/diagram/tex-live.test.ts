// The real thing: the local TeX run as the mod runs it (the same documents,
// argument vectors, environment and confinement), where latex and dvisvgm are
// installed; skipped elsewhere. KITTEX_TEX=1 also times the typical diagrams.

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { bwrapProbe, confined, countNumbers, diagramDocument, dvisvgmArgv, FORMAT_SOURCE, formatArgv, JOB_NAME, LATEX_ARGV, latexArgv, mathDocument, MAX_PATH_DATA, MAX_PICTURE_NUMBERS, texEnvironment, texError, texPicture, unsafeTex } from '../../src/diagram/index.ts'
import type { Confinement, DiagramLang, TexDocument } from '../../src/diagram/index.ts'
import { measurePicture, renderPicture } from '../../src/index.ts'

const has = (command: string) => spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0
const TEX = has('latex') && has('dvisvgm')
const HIDE = [homedir(), '/tmp', '/var/tmp', '/run']
const confinement: Confinement = {
  prlimit: has('prlimit'),
  ...(spawnSync(bwrapProbe(HIDE)[0]!, bwrapProbe(HIDE).slice(1), { stdio: 'ignore' }).status === 0 ? { bwrap: { hide: HIDE } } : {}),
}

/** Dumps the fragment format as tex.ts's prepareFormat does, into `out`; its time in milliseconds. */
function dumpFormat(out: string): { name: string; ms: number } {
  const started = performance.now()
  const name = 'kittex-test'
  const dir = mkdtempSync(join(tmpdir(), 'kittex-tex.'))
  try {
    writeFileSync(join(dir, `${name}.tex`), FORMAT_SOURCE)
    const [cmd, ...args] = confined(formatArgv(name), dir, confinement)
    const run = spawnSync(cmd!, args, { cwd: dir, env: { ...process.env, ...texEnvironment(dir) }, timeout: 60_000, encoding: 'utf8' })
    if (run.status !== 0) throw new Error(`format: ${texError(run.stdout ?? '')}`)
    execFileSync('cp', ['--', join(dir, `${name}.fmt`), join(out, `${name}.fmt`)])
    return { name, ms: performance.now() - started }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Compiles a document as tex.ts does (mktemp's directory, latex, dvisvgm), in milliseconds; from the format in `format` when given. */
function compile(document: TexDocument, format?: { name: string; dir: string }): { svg?: string; error?: string; ms: number } {
  const started = performance.now()
  const dir = mkdtempSync(join(tmpdir(), 'kittex-tex.'))
  try {
    writeFileSync(join(dir, `${JOB_NAME}.tex`), document.text)
    const env = { ...process.env, ...texEnvironment(dir), ...(format ? { TEXFORMATS: `${format.dir}:` } : {}) }
    const [cmd, ...args] = format && document.format ? confined(latexArgv(format.name), dir, confinement, [format.dir]) : confined(LATEX_ARGV, dir, confinement)
    const latex = spawnSync(cmd!, args, { cwd: dir, env, timeout: 20_000, encoding: 'utf8' })
    if (latex.status !== 0) return { error: texError(latex.stdout ?? '', document.offset), ms: performance.now() - started }
    const [svgCmd, ...svgArgs] = confined(dvisvgmArgv(dir), dir, confinement)
    const svg = execFileSync(svgCmd!, svgArgs, { cwd: dir, env, timeout: 20_000, encoding: 'utf8', maxBuffer: 8 << 20 })
    return { svg, ms: performance.now() - started }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const DIAGRAMS: [string, string, DiagramLang][] = [
  ['tikz', '\\begin{tikzpicture}[>=Stealth]\n\\node[draw, circle, fill=blue!20] (a) {A};\n\\node[draw, circle, right=2cm of a] (b) {B};\n\\draw[->, thick, red] (a) -- node[above] {$f$} (b);\n\\end{tikzpicture}', 'latex'],
  ['tikz fence', '\\draw[->] (0,0) -- (2,0) node[right] {$x$};\n\\draw[->] (0,0) -- (0,2) node[above] {$y$};\n\\draw[domain=0:1.8, smooth, blue] plot (\\x, {\\x*\\x/2});', 'tikz'],
  ['pgfplots', '\\begin{tikzpicture}\n\\begin{axis}[xlabel=$x$, ylabel=$y$, legend pos=north west, grid=major]\n\\addplot[blue, domain=-2:2, samples=60] {x^2};\n\\addplot[red, domain=-2:2, samples=60] {x^3};\n\\legend{$x^2$, $x^3$}\n\\end{axis}\n\\end{tikzpicture}', 'latex'],
  ['chemfig', '\\chemfig{*6((-OH)-=-=(-COOH)-=)}', 'latex'],
  ['circuitikz', '\\begin{circuitikz}\n\\draw (0,0) to[battery1, l=$V$] (0,2) to[R, l=$R$] (3,2) to[C, l=$C$] (3,0) -- (0,0);\n\\end{circuitikz}', 'env'],
  ['tikz-cd', '\\begin{tikzcd}\nA \\arrow[r, "f"] \\arrow[d, "g"\'] & B \\arrow[d, "h"] \\\\\nC \\arrow[r, "k"\'] & D\n\\end{tikzcd}', 'env'],
  ['document', '\\documentclass[12pt]{article}\n\\usepackage{tikz}\n\\begin{document}\n\\begin{tikzpicture}\\draw[fill=yellow] (0,0) rectangle (2,1);\\end{tikzpicture}\n\\end{document}', 'latex'],
]

const ENV = { cellWidth: 13, cellHeight: 26, maxColumns: 100, emPx: (13 / 0.6) * 1.15, ink: { r: 220, g: 220, b: 220 }, background: { r: 30, g: 30, b: 30 } }

describe.skipIf(!TEX)('the local TeX', () => {
  test('a TikZ diagram compiles, reads and draws', { timeout: 30_000 }, () => {
    const [, source, lang] = DIAGRAMS[0]!
    const document = diagramDocument(source, lang)
    const { svg, error } = compile(document)
    expect(error).toBeUndefined()
    const picture = texPicture(svg!, document)
    expect(picture.ops.length).toBeGreaterThan(5)
    expect(renderPicture(picture, ENV, measurePicture(picture, ENV).rows).png.length).toBeGreaterThan(100)
  })

  test("siunitx's \\unit inline: on the baseline, with depth", { timeout: 30_000 }, () => {
    const document = mathDocument('\\unit{kg.m/s^2}', false)
    const { svg, error } = compile(document)
    expect(error).toBeUndefined()
    const picture = texPicture(svg!, document)
    expect(picture.height).toBeGreaterThan(0.5)
    expect(picture.depth).toBeGreaterThan(0.1)
  })

  test('an error comes back as its first line, at the source line', { timeout: 30_000 }, () => {
    const document = diagramDocument('\\begin{tikzpicture}\n\\draw (0,0) -- (1,1);\n\\nope\n\\end{tikzpicture}', 'latex')
    expect(compile(document).error).toBe('Undefined control sequence \\nope (line 3)')
  })

  test.skipIf(!confinement.bwrap)('confined, TeX sees no home directory even past the source check', { timeout: 30_000 }, () => {
    const secret = join(homedir(), `.kittex-probe-${process.pid}`)
    writeFileSync(secret, 'SECRET')
    try {
      // \input of an absolute path is refused before TeX; written here anyway, TeX can't open it.
      const source = `\\begin{tikzpicture}\\node {\\input{${secret}}};\\end{tikzpicture}`
      expect(unsafeTex(source)).toBeDefined()
      const result = compile(diagramDocument(source, 'latex'))
      expect(result.error).toMatch(/not found/)
      expect(readFileSync(secret, 'utf8')).toBe('SECRET')
    } finally {
      rmSync(secret, { force: true })
    }
  })

  test('from the dumped format, a fragment draws as it does without it', { timeout: 60_000 }, () => {
    const out = mkdtempSync(join(tmpdir(), 'kittex-fmt.'))
    try {
      const format = { ...dumpFormat(out), dir: out }
      const document = diagramDocument('\\usetikzlibrary{mindmap}\n\\begin{tikzpicture}[mindmap, concept color=blue!20]\\node[concept]{root};\\end{tikzpicture}', 'latex')
      const plain = compile(document)
      const fast = compile(document, format)
      expect(fast.error).toBeUndefined()
      expect(texPicture(fast.svg!, document).ops.length).toBe(texPicture(plain.svg!, document).ops.length)
    } finally {
      rmSync(out, { recursive: true, force: true })
    }
  })

  test.skipIf(process.env.KITTEX_TEX !== '1')('times the typical diagrams', () => {
    const out = mkdtempSync(join(tmpdir(), 'kittex-fmt.'))
    const dumped = dumpFormat(out)
    const format = { name: dumped.name, dir: out }
    process.stderr.write(`format dumped in ${dumped.ms.toFixed(0)} ms\n`)
    for (const [name, source, lang] of DIAGRAMS) {
      const document = diagramDocument(source, lang)
      const fast = [compile(document, format), compile(document, format)]
      for (const run of fast) expect(run.error, name).toBeUndefined()
      process.stderr.write(`${name}: from the format ${fast.map(run => run.ms.toFixed(0)).join(' / ')} ms\n`)
      const runs = [compile(document), compile(document)]
      for (const run of runs) expect(run.error, name).toBeUndefined()
      const picture = texPicture(runs[0]!.svg!, document)
      const started = performance.now()
      const box = measurePicture(picture, ENV)
      renderPicture(picture, ENV, box.rows)
      process.stderr.write(`${name}: without ${runs.map(run => run.ms.toFixed(0)).join(' / ')} ms, drawn ${(performance.now() - started).toFixed(0)} ms, ${box.columns}x${box.rows} cells (${confinement.bwrap ? 'bwrap' : 'no bwrap'}, ${confinement.prlimit ? 'prlimit' : 'no prlimit'})\n`)
    }
  }, 120_000)

  // The heaviest pictures kittex is asked for, measured against the SVG reader's path limits (security review):
  // each must stay at least ten times inside them (8000 samples, near TeX's own memory limit, makes a 145 000-character path).
  test('the largest real pictures are far inside the path-data limits', { timeout: 120_000 }, () => {
    const heavy: [string, string, DiagramLang][] = [
      ['flat surface 40 x 40', '\\begin{tikzpicture}\\begin{axis}[view={60}{30}]\\addplot3[surf, shader=flat, samples=40, domain=-2:2] {exp(-x^2-y^2)};\\end{axis}\\end{tikzpicture}', 'latex'],
      ['interp surface 60 x 60 (drawn flat)', '\\begin{tikzpicture}\\begin{axis}\\addplot3[surf, shader=interp, samples=60, domain=-2:2] {sin(deg(x*y))};\\end{axis}\\end{tikzpicture}', 'latex'],
      ['1000-sample plot', '\\begin{tikzpicture}\\begin{axis}\\addplot[samples=1000, domain=0:10] {sin(deg(x))*x};\\end{axis}\\end{tikzpicture}', 'latex'],
      // A reply's surface: faceted interp shading (drawn faceted), a colorbar (drawn sampled), groups nested thousands deep.
      ['faceted interp surface 46 x 46 with a horizontal colorbar', '\\begin{tikzpicture}\\begin{axis}[view={35}{38}, colormap/viridis, colorbar horizontal, domain=-10:10, y domain=-10:10, samples=46, trig format plots=rad, z buffer=sort]\\addplot3[surf, shader=faceted interp, draw opacity=0.25] {sin(sqrt(x^2+y^2))/sqrt(x^2+y^2)};\\end{axis}\\end{tikzpicture}', 'latex'],
      ['chemfig', '\\chemfig{*6((-OH)-=-(-[:30]*6(-=-=-=))=(-COOH)-=)}', 'latex'],
      ['circuitikz', '\\begin{circuitikz}\\draw (0,0) to[battery1, l=$V$] (0,2) to[R, l=$R_1$] (3,2) to[L, l=$L$] (6,2) to[C, l=$C$] (6,0) to[D] (3,0) -- (0,0);\\end{circuitikz}', 'env'],
    ]
    for (const [name, source, lang] of heavy) {
      const document = diagramDocument(source, lang)
      const { svg, error } = compile(document)
      expect(error, name).toBeUndefined()
      const picture = texPicture(svg!, document)
      expect(Math.max(...picture.ops.map(op => op.d.length)), name).toBeLessThan(MAX_PATH_DATA / 10)
      expect(picture.ops.reduce((sum, op) => sum + countNumbers(op.d), 0), name).toBeLessThan(MAX_PICTURE_NUMBERS / 10)
    }
  })
})
