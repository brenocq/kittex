// Generates the README's feature cards, one theme-adaptive animated SVG each:
//
//   npm run readme:features          # writes .github/assets/feature-{live,diagrams,tex,inline,reflow,copy}.svg and terminals.svg
//   npm run readme:features:preview  # also renders a contact sheet and the preview page
//
// Run `npm ci` first. Math is New Computer Modern from kittex's own
// typesetter (the Reflow card's line breaks are its own, at the window's
// widths), terminal text is Roboto Mono (see ../banner/glyphs.mjs), and the
// Unicode preview is kittex's own. The Diagrams card's pictures (a plot, a
// circuit, a molecule) are compiled by your local TeX the way kittex compiles
// one (picture.mjs), so this needs `latex` and `dvisvgm` with pgfplots,
// circuitikz and chemfig (TeX Live). Titles and
// descriptions are <text> in GitHub's system fonts; each card moves on its own
// loop, and prefers-reduced-motion shows a still frame.
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadCore, loadMono } from '../banner/glyphs.mjs'
import { compilePicture, pictureMarkup } from './picture.mjs'
import { terminals } from './terminals.mjs'
import { ACCENT, CONTENT_TOP, Defs, PANEL, TERM, card, cellWidth, drawOps, keyframes, monoText, panel, placeMath, r } from './lib.mjs'

const OUT_DIR = '.github/assets'

const core = await loadCore()
const mono = loadMono()
const display = (tex, lineWidth) => core.typeset(tex, { display: true, ...(lineWidth ? { lineWidth } : {}) })
const inline = tex => core.typeset(tex, { display: false })

/** The panel's content box: below the window dots, inside the panel. */
const BOX = { x0: PANEL.x + 16, x1: PANEL.x + PANEL.w - 16, y0: CONTENT_TOP, y1: PANEL.y + PANEL.h }
const CX = (PANEL.x * 2 + PANEL.w) / 2

/** Blur-and-settle in, as the banner turns source into math. */
const MORPH_OUT = 'opacity:0;transform:scale(.92);filter:blur(3px)'
const MORPH_IN = 'opacity:0;transform:scale(1.06);filter:blur(3px)'
const SHOWN = 'opacity:1;transform:none;filter:blur(0)'

/** Shows from second `t` of the loop on (a parent group hides it again). */
function appear(name, t, loop) {
  return keyframes(name, loop, [[0, 'opacity:0'], [t - 0.001, 'opacity:0'], [t, 'opacity:1'], [loop, 'opacity:1']])
}

/** The CSS that runs every animated element on the card's loop. */
const looping = (selector, loop) => `${selector}{animation-duration:${loop}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}`

// ─── 1. Live ───────────────────────────────────────────────────────────────

function live() {
  const LOOP = 8
  const defs = new Defs()
  const css = []
  const size = 11
  const adv = cellWidth(mono, size)
  const line = 16
  const baseline = row => BOX.y0 + 24 + row * line
  const tex = 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}'
  const preview = core.previewDisplay(tex, { maxColumns: 40 })
  if (preview.length !== 4) throw new Error(`expected a 4-row preview, got ${preview.length}`)

  // The reply streams in chunks: a line, the display formula's preview (it
  // appears when the formula closes), the next line. Then the preview becomes
  // the typeset formula in the rows it reserved, and nothing below it moves.
  const before = 'Solving| ax²| +| bx| +| c| =| 0| gives'
  const after = 'so| a| quadratic| has| at| most| two| roots.'
  const stream = []
  let t = 0.25
  const chunks = (text, row) => {
    let col = 0
    for (const chunk of text.split('|')) {
      stream.push({ text: chunk, row, col, t })
      col += [...chunk].length
      t += 0.075 + 0.03 * Math.sin(stream.length * 2.3)
    }
    return col
  }
  const beforeCols = chunks(before, 0)
  const previewAt = t + 0.25
  t = previewAt + 0.45
  const afterCols = chunks(after, 5)
  const typed = t
  const m0 = typed + 0.55
  const m1 = m0 + 0.6
  const fade0 = LOOP - 0.8
  const fade1 = LOOP - 0.35

  const textMarkup = stream
    .map((c, i) => {
      css.push(`.s${i}{animation-name:s${i}}`, appear(`s${i}`, c.t, LOOP))
      return `<g class="a s${i}">${monoText(defs, mono, c.text, BOX.x0 + c.col * adv, baseline(c.row), size)}</g>`
    })
    .join('')

  // The preview, centred like kittex centres a display formula, and the image in the same rows.
  const previewWidth = Math.max(...preview.map(l => [...l].length)) * adv
  const px = CX - previewWidth / 2
  const previewMarkup = preview.map((l, i) => monoText(defs, mono, l, px, baseline(1 + i), size)).join('')
  const top = baseline(1) - line + 4
  const math = placeMath(defs, display(tex), { cx: CX, cy: top + 2 * line, em: 22, maxHeight: 4 * line - 6 })
  const origin = `transform-origin:${r(CX)}px ${r(top + 2 * line)}px`
  css.push(
    `.pv{animation-name:pv;${origin}}.tx{opacity:1;animation-name:tx;${origin}}.pv{opacity:0}`,
    keyframes('pv', LOOP, [[0, 'opacity:0'], [previewAt - 0.001, 'opacity:0'], [previewAt, SHOWN], [m0, `${SHOWN};animation-timing-function:cubic-bezier(.5,0,.75,0)`], [m0 + 0.35, MORPH_OUT], [LOOP, 'opacity:0']]),
    keyframes('tx', LOOP, [[0, 'opacity:0'], [m0 + 0.15, `${MORPH_IN};animation-timing-function:cubic-bezier(.2,.7,.3,1)`], [m1, SHOWN], [LOOP, SHOWN]]),
  )

  // The caret follows the stream, blinks once it ends, and leaves as the formula lands.
  const caretFrames = [[0, 'opacity:0']]
  for (const c of stream) {
    const x = (c.col + [...c.text].length) * adv
    const y = baseline(c.row) - baseline(0)
    caretFrames.push([c.t, `opacity:1;transform:translate(${r(x)}px,${r(y)}px)`])
    if (c === stream.find(s => s.row === 0 && s.col + [...s.text].length === beforeCols)) caretFrames.push([previewAt, `opacity:1;transform:translate(0px,${r(baseline(5) - baseline(0))}px)`])
  }
  const end = `transform:translate(${r(afterCols * adv)}px,${r(baseline(5) - baseline(0))}px)`
  caretFrames.push([typed + 0.2, `opacity:0;${end}`], [typed + 0.4, `opacity:1;${end}`], [m0 + 0.1, 'opacity:0'], [LOOP, 'opacity:0'])
  css.push(`.caret{fill:${ACCENT};opacity:0;animation-name:caret;animation-timing-function:steps(1,end)}`, keyframes('caret', LOOP, caretFrames))
  const caret = `<rect class="caret" x="${r(BOX.x0 + 1)}" y="${r(baseline(0) - 9)}" width="1.6" height="12" rx=".8"/>`

  // The whole reply clears at the end of the loop, for the next one.
  css.push(`.reply{animation-name:reply}`, keyframes('reply', LOOP, [[0, 'opacity:1'], [fade0, 'opacity:1'], [fade1, 'opacity:0'], [LOOP, 'opacity:0']]))
  css.push(looping('.a,.pv,.tx,.caret,.reply', LOOP))

  const body = `${panel()}<g class="reply" fill="${TERM.fg}">${textMarkup}<g class="pv">${previewMarkup}</g><g class="tx">${math.markup}</g>${caret}</g>`
  return card({
    title: 'Live',
    label: 'Live: readable while Claude writes, typeset when each part is done',
    lines: ['Readable while Claude writes, typeset when', 'each part is done. Nothing jumps.'],
    defs,
    css: css.join(''),
    body,

  })
}

// ─── 2. Real TeX ───────────────────────────────────────────────────────────

function realTex() {
  const THEMES = [
    { name: 'gruvbox dark', bg: '#282828', fg: '#ebdbb2' },
    { name: 'dracula', bg: '#282a36', fg: '#f8f8f2' },
    { name: 'solarized light', bg: '#fdf6e3', fg: '#586e75' },
    { name: 'tokyo night', bg: '#1a1b26', fg: '#c0caf5' },
  ]
  const HOLD = 2.4
  const FADE = 0.6
  const LOOP = HOLD * THEMES.length
  const defs = new Defs()
  const css = []

  // Each theme holds, then eases into the next; the last eases back into the first.
  const cycle = (prop, key) => [
    [0, `${prop}:${THEMES.at(-1)[key]}`],
    ...THEMES.flatMap((theme, k) => [[k * HOLD + FADE, `${prop}:${theme[key]}`], [(k + 1) * HOLD, `${prop}:${theme[key]}`]]),
  ]
  css.push(
    `.tbg{fill:${THEMES[0].bg};animation-name:tbg;animation-timing-function:ease-in-out}`,
    keyframes('tbg', LOOP, cycle('fill', 'bg')),
    `.tfg{fill:${THEMES[0].fg};animation-name:tfg;animation-timing-function:ease-in-out}`,
    keyframes('tfg', LOOP, cycle('fill', 'fg')),
  )

  // The theme's name, bottom right, fading with it.
  const size = 10
  const adv = cellWidth(mono, size)
  const labels = THEMES.map((theme, k) => {
    const x = BOX.x1 - [...theme.name].length * adv
    const start = k * HOLD
    const frames =
      k === 0
        ? [[0, 'opacity:0'], [FADE, 'opacity:.6'], [HOLD, 'opacity:.6'], [HOLD + FADE * 0.6, 'opacity:0'], [LOOP, 'opacity:0']]
        : k === THEMES.length - 1
          ? [[0, 'opacity:.6'], [FADE * 0.6, 'opacity:0'], [start, 'opacity:0'], [start + FADE, 'opacity:.6'], [LOOP, 'opacity:.6']]
          : [[0, 'opacity:0'], [start, 'opacity:0'], [start + FADE, 'opacity:.6'], [start + HOLD, 'opacity:.6'], [start + HOLD + FADE * 0.6, 'opacity:0'], [LOOP, 'opacity:0']]
    css.push(`.n${k}{opacity:${k === 0 ? 0.6 : 0};animation-name:n${k}}`, keyframes(`n${k}`, LOOP, frames))
    return `<g class="lbl n${k}">${monoText(defs, mono, theme.name, x, BOX.y1 - 12, size)}</g>`
  })
  css.push(looping('.tbg,.tfg,.lbl', LOOP))

  const math = placeMath(defs, display('\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}'), { cx: CX, cy: (BOX.y0 + BOX.y1) / 2 - 4, em: 26 })
  const dots = [0, 1, 2].map(i => `<circle cx="${PANEL.x + 13 + i * 11}" cy="${PANEL.y + 11}" r="3.2" opacity=".25"/>`).join('')
  const body = [
    `<rect class="tbg" x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.w}" height="${PANEL.h}" rx="${PANEL.rx}"/>`,
    `<rect x="${PANEL.x + 0.5}" y="${PANEL.y + 0.5}" width="${PANEL.w - 1}" height="${PANEL.h - 1}" rx="${PANEL.rx - 0.5}" class="edge" opacity=".7"/>`,
    `<g class="tfg">${dots}${math.markup}${labels.join('')}</g>`,
  ].join('')
  return card({
    title: 'Real TeX',
    label: "Real TeX: the font of LaTeX papers, in your terminal's colours",
    lines: ['The font of LaTeX papers,', "in your terminal's colours."],
    defs,
    css: css.join(''),
    body,

  })
}

// ─── 3. Inline too ─────────────────────────────────────────────────────────

function inlineToo() {
  const LOOP = 7
  const defs = new Defs()
  const css = []
  const size = 13
  const adv = cellWidth(mono, size)
  const em = 16.2
  const baselines = [BOX.y0 + 50, BOX.y0 + 78]
  // Each line: prose with {math} slots, as many cells as the formula needs.
  const lines = ['The estimate {\\hat{x}_k} drifts toward the data', 'as its variance {\\sigma^2} shrinks.']
  const guides = []
  const markup = lines
    .map((text, n) => {
      let col = 0
      let out = ''
      // Odd parts are the formulas.
      text.split(/\{((?:[^{}]|\{[^{}]*\})*)\}/).forEach((part, i) => {
        if (i % 2) {
          const result = inline(part)
          out += drawOps(defs, result.ops, BOX.x0 + col * adv, baselines[n], em)
          col += Math.ceil((result.width * em) / adv)
        } else {
          out += monoText(defs, mono, part, BOX.x0 + col * adv, baselines[n], size)
          col += [...part].length
        }
      })
      guides.push(col * adv)
      return out
    })
    .join('')

  // A baseline guide draws itself under each line in turn, holds, and fades.
  const sweeps = [0.6, 3.6]
  const guideMarkup = guides
    .map((width, n) => {
      const t0 = sweeps[n]
      const x = BOX.x0 - 6
      const w = width + 12
      css.push(
        `.g${n}{opacity:${n === 0 ? 0.9 : 0};animation-name:g${n};transform-origin:${r(x)}px 0}`,
        keyframes(`g${n}`, LOOP, [[0, 'opacity:0;transform:scaleX(0)'], [t0 - 0.01, 'opacity:0;transform:scaleX(0)'], [t0, 'opacity:.9;transform:scaleX(0);animation-timing-function:cubic-bezier(.4,0,.2,1)'], [t0 + 1.3, 'opacity:.9;transform:scaleX(1)'], [t0 + 2.4, 'opacity:.9;transform:scaleX(1);animation-timing-function:ease-in'], [t0 + 2.9, 'opacity:0;transform:scaleX(1)'], [LOOP, 'opacity:0']]),
        `.h${n}{opacity:0;animation-name:h${n}}`,
        keyframes(`h${n}`, LOOP, [[0, 'opacity:0;transform:translateX(0)'], [t0 - 0.01, 'opacity:0;transform:translateX(0)'], [t0, 'opacity:1;transform:translateX(0);animation-timing-function:cubic-bezier(.4,0,.2,1)'], [t0 + 1.3, `opacity:1;transform:translateX(${r(w)}px)`], [t0 + 1.6, `opacity:0;transform:translateX(${r(w)}px)`], [LOOP, 'opacity:0']]),
      )
      return `<rect class="gd g${n}" x="${r(x)}" y="${r(baselines[n])}" width="${r(w)}" height="1.1" fill="${ACCENT}"/><circle class="gd h${n}" cx="${r(x)}" cy="${r(baselines[n] + 0.55)}" r="2.4" fill="${ACCENT}"/>`
    })
    .join('')
  css.push(looping('.gd', LOOP))

  const body = `${panel()}${guideMarkup}<g fill="${TERM.fg}">${markup}</g>`
  return card({
    title: 'Inline too',
    label: "Inline too: math inside a sentence sits on the line, at your text's size",
    lines: ['Math inside a sentence sits on the line,', "at your text's size."],
    defs,
    css: css.join(''),
    body,

  })
}

// ─── 4. Copy ───────────────────────────────────────────────────────────────

function copy() {
  const LOOP = 8
  const defs = new Defs()
  const css = []
  const tex = 'P(A \\mid B) = \\frac{P(B \\mid A)\\,P(A)}{P(B)}'
  const math = placeMath(defs, display(tex), { cx: CX, cy: BOX.y0 + 54, em: 21 })
  const [bx0, by0, bx1, by1] = math.box
  const pad = 9
  const hover = { x: bx0 - pad, y: by0 - pad, w: bx1 - bx0 + 2 * pad, h: by1 - by0 + 2 * pad }

  // The button, just above the formula's top right, as kittex shows it on hover.
  const size = 9.5
  const adv = cellWidth(mono, size)
  const btn = { w: 92, h: 19 }
  btn.x = hover.x + hover.w - btn.w
  btn.y = hover.y - btn.h - 4
  const textX = btn.x + 22
  const textY = btn.y + 13
  const copyIcon = `<g fill="none" stroke="${TERM.fg}" stroke-width="1.1"><rect x="${r(btn.x + 8)}" y="${r(btn.y + 7.5)}" width="6" height="6" rx="1"/><rect x="${r(btn.x + 10.5)}" y="${r(btn.y + 5)}" width="6" height="6" rx="1" fill="#3c3836"/></g>`
  const checkIcon = `<path d="M${r(btn.x + 8)} ${r(btn.y + 9.8)}l2.6 2.7 5.4-6" fill="none" stroke="${ACCENT}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
  const button = [
    `<g class="btn">`,
    `<rect x="${r(btn.x)}" y="${r(btn.y)}" width="${btn.w}" height="${btn.h}" rx="4.5" fill="#3c3836" stroke="#665c54"/>`,
    `<g class="lab0">${copyIcon}<g fill="${TERM.fg}">${monoText(defs, mono, 'copy LaTeX', textX, textY, size)}</g></g>`,
    `<g class="lab1">${checkIcon}<g fill="${TERM.fg}">${monoText(defs, mono, 'copied', textX, textY, size)}</g></g>`,
    `</g>`,
  ].join('')

  // The source, as it lands on the clipboard.
  const source = `$$${tex}$$`
  const srcSize = 9.5
  const srcX = CX - ([...source].length * cellWidth(mono, srcSize)) / 2
  const srcY = BOX.y1 - 13
  const sourceMarkup = `<g class="src" fill="${TERM.dim}">${monoText(defs, mono, source, srcX, srcY, srcSize)}</g>`

  // The pointer: tip at its origin.
  const pointer = `<path d="M0 0v15.5l3.7-3.5 2.6 5.9 2.6-1.1-2.6-5.8h5.2z" fill="#fff" stroke="#111" stroke-width="1" stroke-linejoin="round"/>`
  const start = [BOX.x1 - 20, BOX.y1 - 6]
  const onMath = [bx1 - 34, (by0 + by1) / 2 + 4]
  const onButton = [btn.x + btn.w / 2 - 6, btn.y + btn.h / 2 + 1]
  const at = ([x, y], extra = '') => `transform:translate(${r(x)}px,${r(y)}px)${extra}`

  const click = 3.3
  css.push(
    `.ptr{transform:translate(${r(onButton[0])}px,${r(onButton[1])}px);animation-name:ptr;animation-timing-function:cubic-bezier(.45,0,.25,1)}`,
    keyframes('ptr', LOOP, [
      [0, `opacity:0;${at(start)}`],
      [0.4, `opacity:1;${at(start)}`],
      [1.6, `opacity:1;${at(onMath)}`],
      [2.3, `opacity:1;${at(onMath)}`],
      [3.0, `opacity:1;${at(onButton)}`],
      [click, `opacity:1;${at(onButton)}`],
      [click + 0.1, `opacity:1;${at(onButton, ' scale(.88)')}`],
      [click + 0.22, `opacity:1;${at(onButton)}`],
      [6.1, `opacity:1;${at(onButton)}`],
      [7.1, `opacity:0;${at(start)}`],
      [LOOP, `opacity:0;${at(start)}`],
    ]),
    `.hov{animation-name:hov}`,
    keyframes('hov', LOOP, [[0, 'opacity:0'], [1.5, 'opacity:0'], [1.9, 'opacity:1'], [6.3, 'opacity:1'], [6.8, 'opacity:0'], [LOOP, 'opacity:0']]),
    `.btn{animation-name:btn;transform-origin:${r(btn.x + btn.w / 2)}px ${r(btn.y + btn.h / 2)}px}`,
    keyframes('btn', LOOP, [[0, 'opacity:0'], [1.6, 'opacity:0;transform:translateY(3px)'], [2.0, 'opacity:1;transform:none'], [click, 'opacity:1;transform:none'], [click + 0.1, 'opacity:1;transform:scale(.95)'], [click + 0.22, 'opacity:1;transform:none'], [6.3, 'opacity:1;transform:none'], [6.8, 'opacity:0;transform:none'], [LOOP, 'opacity:0']]),
    `.lab0{opacity:0;animation-name:lab0}.lab1{animation-name:lab1}`,
    keyframes('lab0', LOOP, [[0, 'opacity:1'], [click + 0.12, 'opacity:1'], [click + 0.3, 'opacity:0'], [LOOP, 'opacity:0']]),
    keyframes('lab1', LOOP, [[0, 'opacity:0'], [click + 0.12, 'opacity:0'], [click + 0.3, 'opacity:1'], [LOOP, 'opacity:1']]),
    `.src{animation-name:src;animation-timing-function:cubic-bezier(.2,.7,.3,1)}`,
    keyframes('src', LOOP, [[0, 'opacity:0;transform:translateY(8px)'], [click + 0.25, 'opacity:0;transform:translateY(8px)'], [click + 0.8, 'opacity:1;transform:none'], [5.7, 'opacity:1;transform:none;animation-timing-function:ease-in'], [6.2, 'opacity:0;transform:translateY(-3px)'], [LOOP, 'opacity:0']]),
    looping('.ptr,.hov,.btn,.lab0,.lab1,.src', LOOP),
  )

  const body = [
    panel(),
    `<rect class="hov" x="${r(hover.x)}" y="${r(hover.y)}" width="${r(hover.w)}" height="${r(hover.h)}" rx="6" fill="${TERM.fg}" fill-opacity=".07" stroke="${TERM.fg}" stroke-opacity=".14"/>`,
    `<g fill="${TERM.fg}">${math.markup}</g>`,
    sourceMarkup,
    button,
    `<g class="ptr">${pointer}</g>`,
  ].join('')
  return card({
    title: 'Copy',
    label: 'Copy: hover an equation to copy its LaTeX',
    lines: ['Hover an equation to copy its LaTeX.'],
    defs,
    css: css.join(''),
    body,

  })
}

// ─── 5. Diagrams ──────────────────────────────────────────────────────────

/** The card's diagrams, as Claude would write them in ```latex blocks: each compiled by the local TeX. */
const PLOT = [
  '\\begin{tikzpicture}',
  '\\begin{axis}[axis lines=middle, width=11cm, height=4.4cm,',
  '    domain=0:20, samples=200, ticks=none, xlabel=$t$, ylabel=$x$]',
  '  \\addplot[blue, very thick] {exp(-x/6)*cos(deg(2*x))};',
  '  \\addplot[red, dashed] {exp(-x/6)};',
  '  \\addplot[red, dashed] {-exp(-x/6)};',
  '\\end{axis}',
  '\\end{tikzpicture}',
]
const CIRCUIT = [
  '\\begin{circuitikz}',
  '\\draw (0,0) node[op amp] (oa) {}',
  '  (oa.-) to[R, l_=$R_1$, -o] ++(-2.5,0) node[left] {$v_i$}',
  '  (oa.-) |- ++(0,1.5) coordinate (t) to[R, l=$R_f$] (t -| oa.out) -- (oa.out)',
  '  (oa.+) -- ++(0,-0.6) node[ground] {}',
  '  (oa.out) to[short, -o] ++(1,0) node[right] {$v_o$};',
  '\\end{circuitikz}',
]
const MOLECULE = ['\\chemfig{*6(-=-(-O-[::-60](=[::-60]O)-[::60]CH_3)=(-COOH)-=)}']

function diagrams() {
  const LOOP = 15
  const defs = new Defs()
  const css = []
  const size = 8.6
  const line = 12.4
  const top = BOX.y0 + 10
  const paper = { ink: TERM.fg, background: TERM.bg }
  const mid = (BOX.y0 + BOX.y1) / 2
  const origin = `transform-origin:${r(CX)}px ${r(mid)}px`

  // A picture compiled from its source, as large as the panel holds, centred in it.
  const place = (source, prefix, group) => {
    const picture = compilePicture(core, source.join('\n'))
    const room = { w: BOX.x1 - BOX.x0 + 8, h: BOX.y1 - BOX.y0 - 10 }
    const scale = Math.min(room.w / picture.width, room.h / (picture.height + picture.depth))
    const w = picture.width * scale, h = (picture.height + picture.depth) * scale
    const drawn = pictureMarkup(core, picture, { x: CX - w / 2, y: mid - h / 2 + 1, scale, paper, group: (op, i) => group(op, i, picture), prefix })
    defs.out.push(drawn.defs)
    return drawn.markup
  }

  // The plot's code block streams in a line at a time, as Claude writes it.
  const lineAt = k => 0.35 + k * 0.16
  const source = PLOT.map((text, k) => {
    css.push(`.dl${k}{animation-name:dl${k}}`, appear(`dl${k}`, lineAt(k), LOOP))
    return `<g class="dl dl${k}">${monoText(defs, mono, text, BOX.x0 - 4, top + k * line, size)}</g>`
  }).join('')

  // When it lands it becomes the picture TeX drew: the axes settle in where
  // the code was, then the curve and its envelope draw themselves.
  let strokes = []
  const plot = place(PLOT, 'p', (op, i, picture) => {
    if (!strokes.length) strokes = picture.ops.filter(o => o.type === 'stroke' && o.clip !== undefined)
    return op.type === 'stroke' && op.clip !== undefined ? `draw dpen${strokes.indexOf(op)}` : 'daxes'
  })
  const land = lineAt(PLOT.length - 1) + 0.9
  css.push(
    `.dsrc{opacity:0;animation-name:dsrc;${origin}}.daxes{animation-name:daxes;${origin}}`,
    keyframes('dsrc', LOOP, [[0, SHOWN], [land, `${SHOWN};animation-timing-function:cubic-bezier(.5,0,.75,0)`], [land + 0.35, MORPH_OUT], [LOOP, 'opacity:0']]),
    keyframes('daxes', LOOP, [[0, 'opacity:0'], [land + 0.15, `${MORPH_IN};animation-timing-function:cubic-bezier(.2,.7,.3,1)`], [land + 0.75, SHOWN], [LOOP, SHOWN]]),
    `.draw path{stroke-dashoffset:0}`,
  )
  const drawIn = (name, t0, t1) => keyframes(name, LOOP, [[0, 'opacity:0'], [t0 - 0.001, 'opacity:0'], [t0, 'opacity:1;stroke-dasharray:1 1;stroke-dashoffset:1;animation-timing-function:cubic-bezier(.45,0,.4,1)'], [t1, 'opacity:1;stroke-dasharray:1 1;stroke-dashoffset:0'], [LOOP, 'opacity:1;stroke-dasharray:1 1;stroke-dashoffset:0']])
  strokes.forEach((op, k) => {
    // The curve first, then both halves of its envelope together.
    const t0 = land + 0.55 + (k === 0 ? 0 : 1.25)
    const t1 = t0 + (k === 0 ? 1.6 : 1.1)
    css.push(
      `.dpen${k}{animation-name:dpen${k}}`,
      op.style.dash
        ? keyframes(`dpen${k}`, LOOP, [[0, 'opacity:0'], [t0, 'opacity:0;clip-path:inset(0 100% 0 0)'], [t1, 'opacity:1;clip-path:inset(0 0 0 0)'], [LOOP, 'opacity:1']])
        : drawIn(`dpen${k}`, t0, t1),
    )
  })

  // Then a circuit and a molecule, each crossfading in and drawing its lines, its labels after.
  const circuit = place(CIRCUIT, 'q', op => (op.type === 'stroke' ? 'draw dcs' : 'dcf'))
  const molecule = place(MOLECULE, 'm', op => (op.type === 'stroke' ? 'draw dms' : 'dmf'))
  const [plotOut, circuitOut] = [7.0, 10.8]
  const visible = (name, t0, t1, base) => keyframes(name, LOOP, [[0, `opacity:${base}`], ...(t0 > 0 ? [[t0, 'opacity:0'], [t0 + 0.3, 'opacity:1']] : []), [t1, 'opacity:1'], [t1 + 0.4, 'opacity:0'], [LOOP - 0.001, 'opacity:0'], [LOOP, `opacity:${base}`]])
  const fadeIn = (name, t0) => keyframes(name, LOOP, [[0, 'opacity:0'], [t0, 'opacity:0'], [t0 + 0.5, 'opacity:1'], [LOOP, 'opacity:1']])
  css.push(
    `.dplot{animation-name:dplot}`, visible('dplot', 0, plotOut, 1),
    `.dckt{opacity:0;animation-name:dckt}`, visible('dckt', plotOut + 0.2, circuitOut, 0),
    `.dcs path{animation-name:dcs}`, drawIn('dcs', plotOut + 0.3, plotOut + 1.6),
    `.dcf{animation-name:dcf}`, fadeIn('dcf', plotOut + 1.2),
    `.dmol{opacity:0;animation-name:dmol}`, visible('dmol', circuitOut + 0.2, LOOP - 0.9, 0),
    `.dms path{animation-name:dms}`, drawIn('dms', circuitOut + 0.3, circuitOut + 1.5),
    `.dmf{animation-name:dmf}`, fadeIn('dmf', circuitOut + 1.1),
  )
  css.push(looping(`.dl,.dsrc,.daxes,.dplot,.dckt,.dcs path,.dcf,.dmol,.dms path,.dmf,${strokes.map((_, k) => `.dpen${k}`).join(',')}`, LOOP))

  const body = `${panel()}<g class="dsrc" fill="${TERM.dim}">${source}</g><g class="dplot">${plot}</g><g class="dckt">${circuit}</g><g class="dmol">${molecule}</g>`
  return card({
    title: 'Diagrams',
    label: 'Diagrams: TikZ, plots, circuits and molecules, drawn by your own LaTeX',
    lines: ['TikZ, plots, circuits and molecules,', 'drawn by your own LaTeX.'],
    defs,
    css: css.join(''),
    body,
  })
}

// ─── 6. Reflow ─────────────────────────────────────────────────────────────

function reflow() {
  const LOOP = 9
  const defs = new Defs()
  const css = []
  const tex = '(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^{k} = a^n + n\\,a^{n-1} b + \\binom{n}{2} a^{n-2} b^2 + \\cdots + b^n'
  const em = 12.8
  const pad = 14
  const cy = (CONTENT_TOP + PANEL.y + PANEL.h) / 2
  // The window's widths, and the formula as kittex lays it out for each: its
  // line width is the window's, so MathJax breaks it into one, two, three lines.
  const states = [PANEL.w, 284, 197].map(width => {
    const result = display(tex, (width - 2 * pad) / em)
    return { width, result, lines: new Set(result.ops.map(op => (op.type === 'rect' ? op.y : op.transform[5]).toFixed(1))).size }
  })
  if (states.map(s => s.result.height + s.result.depth).some((h, i, all) => i > 0 && h <= all[i - 1])) throw new Error('expected each narrower window to break the formula into more lines')

  // The window: a left cap, a middle that stretches, a right cap that moves.
  const cap = 40
  const at = width => `transform:translateX(${r(width - PANEL.w)}px)`
  const stretch = width => `transform:scaleX(${r((width - cap) / (PANEL.w - cap), 4)})`
  // Widths over the loop: wide, narrower, narrowest, wide again.
  const [W1, W2, W3] = states.map(s => s.width)
  const moves = [[0, W1], [1.6, W1], [2.3, W2], [4.0, W2], [4.7, W3], [6.4, W3], [7.3, W1], [LOOP, W1]]
  const ease = 'animation-timing-function:cubic-bezier(.45,0,.25,1)'
  css.push(
    `.rfc{${at(W2)};animation-name:rfc}.rfm{${stretch(W2)};transform-origin:${PANEL.x + cap / 2}px 0;animation-name:rfm}`,
    keyframes('rfc', LOOP, moves.map(([t, w]) => [t, `${at(w)};${ease}`])),
    keyframes('rfm', LOOP, moves.map(([t, w]) => [t, `${stretch(w)};${ease}`])),
  )
  // The window's shape, drawn and again as the clip the formula is seen through.
  const shape = [
    `<rect x="${PANEL.x}" y="${PANEL.y}" width="${cap}" height="${PANEL.h}" rx="${PANEL.rx}"/>`,
    `<rect class="rfm" x="${PANEL.x + cap / 2}" y="${PANEL.y}" width="${PANEL.w - cap}" height="${PANEL.h}"/>`,
    `<rect class="rfc" x="${PANEL.x + PANEL.w - cap}" y="${PANEL.y}" width="${cap}" height="${PANEL.h}" rx="${PANEL.rx}"/>`,
  ]
  defs.out.push(`<clipPath id="rfwin">${shape.join('')}</clipPath>`)
  const window = [
    `<g fill="${TERM.bg}">${shape.join('')}</g>`,
    // The resize pointer on the window's right edge.
    `<g class="rfc"><g transform="translate(${r(PANEL.x + PANEL.w)} ${r(cy)})"><path d="M-9 0l4.5-4.5v2.6h9v-2.6L9 0l-4.5 4.5v-2.6h-9v2.6z" fill="#fff" stroke="#111" stroke-width="1" stroke-linejoin="round"/></g></g>`,
    [0, 1, 2].map(i => `<circle cx="${PANEL.x + 13 + i * 11}" cy="${PANEL.y + 11}" r="3.2" fill="${TERM.faint}"/>`).join(''),
  ].join('')

  // Each layout stays while the window is dragged (cut off by its edge) and
  // gives way to the next one's breaks, centred in the new width, when the drag ends.
  const switches = [2.3, 4.7, 7.3]
  const shown = [[[0, switches[0]], [switches[2], LOOP]], [[switches[0], switches[1]]], [[switches[1], switches[2]]]]
  const FADE = 0.25
  const formulas = states.map((state, k) => {
    const math = placeMath(defs, state.result, { cx: PANEL.x + state.width / 2, cy, em })
    const frames = [[0, k === 0 ? 'opacity:1' : 'opacity:0']]
    for (const [t0, t1] of shown[k]) {
      // The old breaks leave a little before the new ones arrive, so the two barely overlap.
      if (t0 > 0) frames.push([t0 + 0.1, 'opacity:0'], [t0 + 0.1 + FADE, 'opacity:1'])
      if (t1 < LOOP) frames.push([t1, 'opacity:1'], [t1 + FADE / 2, 'opacity:0'])
    }
    frames.push([LOOP, k === 0 ? 'opacity:1' : 'opacity:0'])
    css.push(`.rf${k}{opacity:${k === 1 ? 1 : 0};animation-name:rf${k}}`, keyframes(`rf${k}`, LOOP, frames.sort((a, b) => a[0] - b[0])))
    return `<g class="rf${k}">${math.markup}</g>`
  })
  css.push(looping('.rfc,.rfm,.rf0,.rf1,.rf2', LOOP))

  return card({
    title: 'Reflow',
    label: 'Reflow: resize the window and equations break to fit it, then join back as it widens',
    lines: ['Resize the window and equations break', 'to fit it, then join back as it widens.'],
    defs,
    css: css.join(''),
    body: `${window}<g fill="${TERM.fg}" clip-path="url(#rfwin)">${formulas.join('')}</g>`,
  })
}

mkdirSync(OUT_DIR, { recursive: true })
for (const [name, make] of [['live', live], ['tex', realTex], ['inline', inlineToo], ['copy', copy], ['diagrams', diagrams], ['reflow', reflow]]) {
  const svg = make()
  const file = `${OUT_DIR}/feature-${name}.svg`
  writeFileSync(file, svg)
  console.log(`${file}: ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KiB`)
}
const svg = await terminals({ core, mono })
writeFileSync(`${OUT_DIR}/terminals.svg`, svg)
console.log(`${OUT_DIR}/terminals.svg: ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KiB`)
