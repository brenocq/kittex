// TeX pictures for the Diagrams card: diagrams compiled by the local LaTeX the
// way kittex compiles it (core's document, commands and environment), read
// back by core's own SVG reader, and written out again as SVG markup in the
// colours kittex would draw it in on a dark terminal.
//
// Needs `latex` and `dvisvgm` on the PATH, with the packages kittex's preamble
// loads (TikZ, pgfplots, circuitikz, chemfig, tikz-cd, siunitx).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { r } from './lib.mjs'

/** Compiles a ```latex block's TikZ as kittex does and returns core's Picture (in em). */
export function compilePicture(core, source) {
  const document = core.diagramDocument(source, 'latex')
  const dir = mkdtempSync(join(tmpdir(), 'kittex-card-'))
  try {
    writeFileSync(join(dir, `${core.JOB_NAME}.tex`), document.text)
    const env = { ...process.env, ...core.texEnvironment(dir) }
    const run = argv => execFileSync(argv[0], argv.slice(1), { cwd: dir, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 })
    try {
      run(core.latexArgv())
    } catch (error) {
      throw new Error(`latex failed (is TeX Live with pgfplots installed?): ${error.message.split('\n')[0]}`)
    }
    return core.texPicture(run(core.dvisvgmArgv(dir)), document)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const hex = ({ r: red, g, b }) => '#' + [red, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
const rgb = h => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) })

/**
 * The picture as SVG markup, `scale` px per em with its top left at (x, y):
 * fills and strokes in kittex's adapted colours for `paper` ({ ink, background }
 * as #rrggbb), its clips as clipPaths. `group(op, i)` names the class each op is
 * drawn under (ops of one class in a row share a group); a stroke whose
 * class starts with `draw` gets pathLength=1, to be drawn in by its dash
 * offset. Returns { defs, markup }.
 */
export function pictureMarkup(core, picture, { x, y, scale, paper, group, prefix = 'p', minStroke = 0.9 }) {
  const paperRgb = { ink: rgb(paper.ink), background: rgb(paper.background) }
  const top = y + picture.height * scale
  const place = ([a, b, c, d, e, f]) => `matrix(${r(a * scale, 5)} ${r(b * scale, 5)} ${r(c * scale, 5)} ${r(d * scale, 5)} ${r(x + e * scale)} ${r(top + f * scale)})`
  const defs = picture.clips.map((clip, k) => {
    const within = clip.within !== undefined ? ` clip-path="url(#${prefix}c${clip.within})"` : ''
    const paths = clip.paths.map(p => `<path d="${p.d}" transform="${place(p.transform)}"${p.rule === 'evenodd' ? ' clip-rule="evenodd"' : ''}/>`).join('')
    return `<clipPath id="${prefix}c${k}" clipPathUnits="userSpaceOnUse"${within}>${paths}</clipPath>`
  })
  const groups = []
  picture.ops.forEach((op, i) => {
    const color = core.adaptColor(op.paint.color, paperRgb, op.type === 'stroke' || op.glyph === true)
    if (color === 'erase') return
    const opacity = op.paint.opacity < 1 ? ` opacity="${r(op.paint.opacity)}"` : ''
    const cls = group(op, i)
    let el
    if (op.type === 'fill') {
      el = `<path d="${op.d}" transform="${place(op.transform)}" fill="${hex(color)}"${op.rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}${opacity}/>`
    } else {
      const [a, b, c, d] = op.transform
      const unit = Math.sqrt(Math.abs(a * d - b * c)) * scale
      const s = op.style
      const width = Math.max(s.width, minStroke / unit)
      const dash = s.dash ? ` stroke-dasharray="${s.dash.map(n => r(n, 3)).join(' ')}" stroke-dashoffset="${r(s.dashOffset ?? 0, 3)}"` : ''
      const draw = cls.startsWith('draw') && !s.dash ? ' pathLength="1"' : ''
      el = `<path d="${op.d}" transform="${place(op.transform)}" fill="none" stroke="${hex(color)}" stroke-width="${r(width, 4)}" stroke-linecap="${s.cap}" stroke-linejoin="${s.join}"${dash}${draw}${opacity}/>`
    }
    if (op.clip !== undefined) el = `<g clip-path="url(#${prefix}c${op.clip})">${el}</g>`
    const last = groups.at(-1)
    if (last && last.cls === cls) last.els.push(el)
    else groups.push({ cls, els: [el] })
  })
  const markup = groups.map(g => `<g class="${g.cls}">${g.els.join('')}</g>`).join('')
  return { defs: defs.join(''), markup, width: picture.width * scale, height: (picture.height + picture.depth) * scale }
}
