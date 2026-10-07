// The real thing: the local TeX run as the mod runs it (the same documents,
// argument vectors, environment and confinement), where latex and dvisvgm are
// installed; skipped elsewhere. KITTEX_TEX=1 also times the typical diagrams.

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { bwrapProbe, confined, diagramDocument, dvisvgmArgv, JOB_NAME, LATEX_ARGV, mathDocument, texEnvironment, texError, texPicture, unsafeTex } from '../../src/diagram/index.ts'
import type { Confinement, DiagramLang, TexDocument } from '../../src/diagram/index.ts'
import { measurePicture, renderPicture } from '../../src/index.ts'

const has = (command: string) => spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0
const TEX = has('latex') && has('dvisvgm')
const HIDE = [homedir(), '/tmp', '/var/tmp', '/run']
const confinement: Confinement = {
  prlimit: has('prlimit'),
  ...(spawnSync(bwrapProbe(HIDE)[0]!, bwrapProbe(HIDE).slice(1), { stdio: 'ignore' }).status === 0 ? { bwrap: { hide: HIDE } } : {}),
}

/** Compiles a document as tex.ts does (mktemp's directory, latex, dvisvgm), in milliseconds. */
function compile(document: TexDocument): { svg?: string; error?: string; ms: number } {
  const started = performance.now()
  const dir = mkdtempSync(join(tmpdir(), 'kittex-tex.'))
  try {
    writeFileSync(join(dir, `${JOB_NAME}.tex`), document.text)
    const env = { ...process.env, ...texEnvironment(dir) }
    const [cmd, ...args] = confined(LATEX_ARGV, dir, confinement)
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

  test.skipIf(process.env.KITTEX_TEX !== '1')('times the typical diagrams', () => {
    for (const [name, source, lang] of DIAGRAMS) {
      const document = diagramDocument(source, lang)
      const runs = [compile(document), compile(document)]
      for (const run of runs) expect(run.error, name).toBeUndefined()
      const picture = texPicture(runs[0]!.svg!, document)
      const started = performance.now()
      const box = measurePicture(picture, ENV)
      renderPicture(picture, ENV, box.rows)
      process.stderr.write(`${name}: TeX ${runs.map(run => run.ms.toFixed(0)).join(' / ')} ms, drawn ${(performance.now() - started).toFixed(0)} ms, ${box.columns}x${box.rows} cells (${confinement.bwrap ? 'bwrap' : 'no bwrap'}, ${confinement.prlimit ? 'prlimit' : 'no prlimit'})\n`)
    }
  }, 120_000)
})
