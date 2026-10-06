// Generates the animated README banner, one SVG for both light and dark pages:
//
//   npm run readme:banner            # writes .github/assets/banner.svg
//   npm run readme:banner:preview    # also renders frames and a contact sheet (headless Chrome)
//
// Run `npm ci` first. The glyphs are real outlines: New Computer Modern from
// kittex's own typesetter (core/src/typeset) and Roboto Mono (set ROBOTO_MONO
// to its RobotoMono-Regular.ttf if it is not under /usr/share/fonts).
//
// GitHub shows the SVG through an <img>, so it is shapes only: no <text>, no
// script, no external references. Everything moves with CSS keyframes on one
// shared loop (LOOP seconds), and prefers-reduced-motion gets a still frame.
// One file serves both GitHub themes: its colours are custom properties, light
// by default and dark under prefers-color-scheme.
import { mkdirSync, writeFileSync } from 'node:fs'
import { CAT_CSS, CAT_REACH, CAT_THEMES, cat, TAIL_MOTION, TAIL_ROOT, tailGeometry, tailReach } from './cat.mjs'
import { loadMono, loadTypesetter } from './glyphs.mjs'

const OUT_DIR = '.github/assets'
const W = 880
const H = 272
/** One loop of the whole animation, in seconds; every keyframe sits on it. */
const LOOP = 16

/**
 * The colours that follow the page: light by default, dark under
 * prefers-color-scheme, as custom properties the stylesheet paints with.
 */
const THEMES = {
  light: { ink: '#1f2328', muted: '#59636e', caret: '#d65d0e', ...CAT_THEMES.light },
  dark: { ink: '#e6edf3', muted: '#8b949e', caret: '#fe8019', ...CAT_THEMES.dark },
}
const vars = theme => `svg{${Object.entries(theme).map(([k, v]) => `--${k}:${v}`).join(';')}}`

/**
 * The subtitle, typed once when the banner appears and then typeset for good:
 * its source, and the words that follow the LaTeX logo.
 */
const SUBTITLE_SOURCE = '\\LaTeX\\ for Claude Code'
const SUBTITLE_TEXT = 'for Claude Code'

/**
 * The formulas, as their source streams in: `|` separates the chunks that
 * arrive together (as a model streams tokens), and is not part of the TeX.
 */
const FORMULAS = [
  '\\mathrm|{soft|max}|\\left(|\\frac|{Q|K|^\\top|}{|\\sqrt|{d|_k|}}|\\right)|V',
  '-|\\sum|_t |\\log| p|_\\theta|(x|_t |\\mid| x|_{<|t})',
  'e|^{i|\\pi}|+|1|=|0',
  '\\int|_{-|\\infty}|^{\\infty}| e|^{-|x^2}|\\,|dx|=|\\sqrt|{\\pi}',
]

// ─── layout (px) ───────────────────────────────────────────────────────────

const GAP = 122 // from the middle of the cat's body to the wordmark
const CAT_GROUND = 240
const WORD_EM = 112
const WORD_BASELINE = 106
const SUB_EM = 30
const SUB_BASELINE = 164
const FORMULA_MID = 224 // vertical middle of the formula line
const MONO_SIZE = 13.5
const TEX_EM = 25

// ─── timeline (s) ──────────────────────────────────────────────────────────

const TOKEN = 0.065 // mean time between streamed chunks
const LEAD = 0.2 // from a formula's slot start to its first chunk
const HOLD = 0.4 // typed source, caret blinking, before it turns into math
const MORPH = 0.6 // source out, math in
const FADE = 0.4 // math fades away at the end of its slot
const SUB_START = 0.35 // the subtitle's first keystroke after the banner appears
const KEY = 0.05 // mean time between the subtitle's keystrokes
/** The subtitle's one-shot animation, in seconds (it then holds its last frame). */
const SUB_DURATION = 3

// ─── helpers ───────────────────────────────────────────────────────────────

const r = (n, digits = 2) => {
  const f = 10 ** digits
  const v = Math.round(n * f) / f
  return String(Object.is(v, -0) ? 0 : v).replace(/^(-?)0\./, '$1.')
}
const pct = t => `${r((t / LOOP) * 100, 3)}%`

/** A deterministic jitter in [-1, 1], so the stream has a rhythm but the files are reproducible. */
function jitter(i) {
  const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

/** Shared glyph definitions: identical outlines are drawn once and reused. */
class Defs {
  constructor() {
    this.ids = new Map()
    this.out = []
  }
  id(d, prefix, attrs = '') {
    const key = `${d}|${attrs}`
    let id = this.ids.get(key)
    if (!id) {
      id = `${prefix}${this.ids.size.toString(36)}`
      this.ids.set(key, id)
      this.out.push(`<path id="${id}" d="${d}"${attrs}/>`)
    }
    return id
  }
}

/** A typeset formula's ops as <use>/<rect> markup at (x, baseline), `em` px per em. */
function drawOps(defs, ops, x, baseline, em) {
  return ops
    .map(op => {
      if (op.type === 'rect') return `<rect x="${r(x + op.x * em)}" y="${r(baseline + op.y * em)}" width="${r(op.width * em)}" height="${r(op.height * em)}"/>`
      const [a, b, c, d, e, f] = op.transform
      const id = defs.id(op.d, 't')
      return `<use href="#${id}" transform="matrix(${r(a * em, 5)} ${r(b * em, 5)} ${r(c * em, 5)} ${r(d * em, 5)} ${r(x + e * em)} ${r(baseline + f * em)})"/>`
    })
    .join('')
}

/** The ink box of a list of ops, in em (from the glyph paths' control points: close enough for layout). */
function inkBox(ops) {
  let box = [Infinity, Infinity, -Infinity, -Infinity]
  const grow = (x, y) => {
    box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)]
  }
  for (const op of ops) {
    if (op.type === 'rect') {
      grow(op.x, op.y)
      grow(op.x + op.width, op.y + op.height)
      continue
    }
    const [a, b, c, d, e, f] = op.transform
    const nums = op.d.match(/-?\d*\.?\d+(?:e-?\d+)?/g).map(Number)
    for (let i = 0; i + 1 < nums.length; i += 2) grow(a * nums[i] + c * nums[i + 1] + e, b * nums[i] + d * nums[i + 1] + f)
  }
  return box
}

// ─── the banner ────────────────────────────────────────────────────────────

async function main() {
  const typeset = await loadTypesetter()
  const mono = loadMono()
  const defs = new Defs()

  // The ∫ for the tail, in font units with y up.
  const int = typeset('\\int', { display: true }).ops[0]
  const intNums = int.d.match(/-?\d*\.?\d+/g).map(Number)
  const xs = intNums.filter((_, i) => i % 2 === 0)
  const ys = intNums.filter((_, i) => i % 2 === 1)
  const integral = { d: int.d, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }

  // The wordmark's letters: "kit", then the TeX logo (placed below).
  const exEm = 0.4306
  const piece = tex => typeset(`\\mathrm{${tex}}`, { display: false })
  const kit = piece('kit')
  const [T, E, X] = ['T', 'E', 'X'].map(piece)
  const xT = kit.width - 0.03
  const xE = xT + T.width - 1 / 6
  const xX = xE + E.width - 1 / 8

  // The cat and the wordmark are centred together; the formulas sit under the
  // wordmark, so the group stays put whichever one is showing.
  const wordWidth = (xX + X.width) * WORD_EM
  const CAT_X = Math.round((W - (CAT_REACH + GAP + wordWidth)) / 2 + CAT_REACH)
  const TEXT_X = CAT_X + GAP
  const reach = tailReach(integral)
  if (reach.whiskers < 2) throw new Error(`the tail comes within ${r(reach.whiskers)} px of a whisker`)
  if (reach.head < 3) throw new Error(`the tail comes within ${r(reach.head)} px of the head`)
  if (CAT_X + reach.right > TEXT_X - 6) throw new Error(`the tail reaches the wordmark (${r(CAT_X + reach.right)} px)`)

  // The wordmark: "kit", then the TeX logo: T, E lowered by half an ex and
  // kerned in by 1/6 em, X kerned in by 1/8 em.
  const word = {
    kit: drawOps(defs, kit.ops, TEXT_X, WORD_BASELINE, WORD_EM),
    tex:
      drawOps(defs, T.ops, TEXT_X + xT * WORD_EM, WORD_BASELINE, WORD_EM) +
      drawOps(defs, E.ops, TEXT_X + xE * WORD_EM, WORD_BASELINE + 0.5 * exEm * WORD_EM, WORD_EM) +
      drawOps(defs, X.ops, TEXT_X + xX * WORD_EM, WORD_BASELINE, WORD_EM),
    width: wordWidth,
  }

  // The subtitle: the LaTeX logo as LaTeX builds it (L, a script-size A raised
  // to T's height and kerned in by .36 em, then .15 em before the TeX logo),
  // a word space, and the text, all at SUB_EM.
  const L = piece('L')
  const A = piece('A')
  const aScale = 0.7
  const sub = { xA: L.width - 0.36, raiseA: T.height - A.height * aScale }
  sub.xT = sub.xA + A.width * aScale - 0.15
  sub.xE = sub.xT + T.width - 1 / 6
  sub.xX = sub.xE + E.width - 1 / 8
  sub.xText = sub.xX + X.width + 0.333
  const words = typeset(`\\text{${SUBTITLE_TEXT}}`, { display: false })
  const subWidth = (sub.xText + words.width) * SUB_EM
  if (subWidth > wordWidth) throw new Error(`the subtitle (${r(subWidth)} px) is wider than the wordmark`)
  const at = (x, dy = 0) => [TEXT_X + x * SUB_EM, SUB_BASELINE + dy * SUB_EM]
  const subtitleMath = [
    drawOps(defs, L.ops, ...at(0), SUB_EM),
    drawOps(defs, A.ops, ...at(sub.xA, -sub.raiseA), SUB_EM * aScale),
    drawOps(defs, T.ops, ...at(sub.xT), SUB_EM),
    drawOps(defs, E.ops, ...at(sub.xE, 0.5 * exEm), SUB_EM),
    drawOps(defs, X.ops, ...at(sub.xX), SUB_EM),
    drawOps(defs, words.ops, ...at(sub.xText), SUB_EM),
  ].join('')

  // The formulas: their streamed source in Roboto Mono, then the typeset math.
  const ms = MONO_SIZE / mono.upm
  const advance = mono.advance * ms
  const monoBaseline = FORMULA_MID + (mono.xHeight * ms) / 2
  const slots = FORMULAS.map(spec => {
    const chunks = spec.split('|')
    const tex = chunks.join('')
    const math = typeset(tex, { display: true })
    const [, y0, , y1] = inkBox(math.ops)
    return { chunks, tex, math, baseline: FORMULA_MID - ((y0 + y1) / 2) * TEX_EM }
  })

  // Stream times: each chunk after the last, with a little jitter.
  let tokenIndex = 0
  const streamTimes = slots.map(slot => {
    let t = 0
    return slot.chunks.map((_, i) => {
      if (i > 0) t += TOKEN * (1 + 0.45 * jitter(tokenIndex++))
      return t
    })
  })
  const fixed = slots.length * (LEAD + HOLD + MORPH + FADE)
  const streamed = streamTimes.reduce((sum, times) => sum + times.at(-1) + TOKEN, 0)
  const show = (LOOP - fixed - streamed) / slots.length
  if (show < 1.2) throw new Error(`the loop is too short: each formula would show for ${show.toFixed(2)} s`)

  const css = []
  const keyframes = (name, frames) => css.push(`@keyframes ${name}{${frames.map(([t, body]) => `${pct(t)}{${body}}`).join('')}}`)
  const once = (name, frames) => css.push(`@keyframes ${name}{${frames.map(([t, body]) => `${r((t / SUB_DURATION) * 100, 3)}%{${body}}`).join('')}}`)

  // The subtitle, once: keystroke by keystroke with the caret, a beat, then it
  // turns into the typeset line and stays.
  const subMid = SUB_BASELINE - 0.34 * SUB_EM
  const subMonoBaseline = subMid + (mono.xHeight * ms) / 2
  const keys = []
  let keyTime = SUB_START
  for (let i = 0; i < SUBTITLE_SOURCE.length; i++) {
    keys.push(keyTime)
    keyTime += KEY * (1 + 0.5 * jitter(100 + i))
  }
  const subTyped = keys.at(-1) + KEY
  const subM0 = subTyped + HOLD
  const subM1 = subM0 + MORPH
  if (subM1 > SUB_DURATION) throw new Error('the subtitle takes longer than its animation')
  const subChars = [...SUBTITLE_SOURCE]
    .map((ch, i) => {
      if (ch === ' ') return ''
      const id = defs.id(mono.glyph(ch), 'm', ` transform="scale(${r(ms, 6)} ${r(-ms, 6)})"`)
      return `<use class="sch" href="#${id}" x="${r(TEXT_X + i * advance)}" y="${r(subMonoBaseline)}" style="animation-delay:${r(keys[i], 3)}s"/>`
    })
    .join('')
  once('sraw', [
    [0, 'opacity:1;transform:none;filter:blur(0)'],
    [subM0, 'opacity:1;transform:none;filter:blur(0);animation-timing-function:cubic-bezier(.5,0,.75,0)'],
    [subM0 + MORPH * 0.55, 'opacity:0;transform:scale(.84,.92);filter:blur(3px)'],
    [SUB_DURATION, 'opacity:0'],
  ])
  const subCaretFrames = [[0, 'opacity:0'], [SUB_START - 0.2, 'opacity:1;transform:translateX(0)']]
  keys.forEach((k, i) => subCaretFrames.push([k, `opacity:1;transform:translateX(${r((i + 1) * advance)}px)`]))
  const end = `transform:translateX(${r(SUBTITLE_SOURCE.length * advance)}px)`
  subCaretFrames.push([subTyped + HOLD / 3, `opacity:0;${end}`], [subTyped + (2 * HOLD) / 3, `opacity:1;${end}`], [subM0 + 0.08, 'opacity:0'], [SUB_DURATION, 'opacity:0'])
  once('scaret', subCaretFrames)
  once('stex', [
    [0, 'opacity:0'],
    [subM0 + MORPH * 0.3, 'opacity:0;transform:scale(1.08);filter:blur(4px);animation-timing-function:cubic-bezier(.2,.7,.3,1)'],
    [subM1, 'opacity:1;transform:none;filter:blur(0)'],
    [SUB_DURATION, 'opacity:1;transform:none;filter:blur(0)'],
  ])
  const subCaretH = mono.capHeight * ms * 1.45
  const subtitle = [
    `<g class="sraw muted">${subChars}</g>`,
    `<rect class="scaret" x="${r(TEXT_X + 1)}" y="${r(subMonoBaseline - subCaretH * 0.84)}" width="1.8" height="${r(subCaretH)}" rx=".9"/>`,
    `<g class="stex ink">${subtitleMath}</g>`,
  ].join('')
  css.push(
    `.sch{animation:son .01s linear both}@keyframes son{from{opacity:0}to{opacity:1}}`,
    `.sraw,.scaret,.stex{animation-duration:${SUB_DURATION}s;animation-timing-function:linear;animation-fill-mode:both}`,
    `.sraw{opacity:0;animation-name:sraw;transform-origin:${r(TEXT_X)}px ${r(subMid)}px}`,
    `.scaret{opacity:0;fill:var(--caret);animation-name:scaret;animation-timing-function:steps(1,end)}`,
    `.stex{animation-name:stex;transform-origin:${r(TEXT_X + subWidth / 2)}px ${r(subMid)}px}`,
  )
  // The formula loop (and the cat's reactions to it) starts once the subtitle
  // is written; it still repeats every LOOP seconds.
  const OFFSET = r(subM1 - LEAD + 0.25, 2)

  const sources = []
  const maths = []
  const glances = []
  const timeline = []
  let start = 0
  slots.forEach((slot, n) => {
    const times = streamTimes[n].map(t => start + LEAD + t)
    const typed = times.at(-1) + TOKEN
    const m0 = typed + HOLD
    const m1 = m0 + MORPH
    const f0 = m1 + show
    const f1 = f0 + FADE
    glances.push([m0 + 0.15, f0])
    timeline.push(`${slot.tex}: streams ${r(times[0])}-${r(typed)} s, typeset ${r(m0)}-${r(m1)} s, fades ${r(f0)}-${r(f1)} s`)

    // The source, chunk by chunk: each chunk shows from its time on (a shared
    // keyframe shifted by its delay); the line as a whole shows until the morph.
    let col = 0
    const chunkMarkup = slot.chunks.map((chunk, i) => {
      const uses = [...chunk]
        .map(ch => {
          const x = TEXT_X + col++ * advance
          if (ch === ' ') return ''
          const id = defs.id(mono.glyph(ch), 'm', ` transform="scale(${r(ms, 6)} ${r(-ms, 6)})"`)
          return `<use href="#${id}" x="${r(x)}" y="${r(monoBaseline)}"/>`
        })
        .join('')
      return `<g class="ch" style="animation-delay:${r(times[i] - LOOP + Number(OFFSET), 3)}s">${uses}</g>`
    })
    const rawWidth = col * advance
    const originRaw = `transform-origin:${r(TEXT_X)}px ${FORMULA_MID}px`
    keyframes(`raw${n}`, [
      [0, 'opacity:0'],
      [times[0] - 0.001, 'opacity:0'],
      [times[0], 'opacity:1;transform:none;filter:blur(0)'],
      [m0, 'opacity:1;transform:none;filter:blur(0);animation-timing-function:cubic-bezier(.5,0,.75,0)'],
      [m0 + MORPH * 0.55, 'opacity:0;transform:scale(.84,.92);filter:blur(3px)'],
      [LOOP, 'opacity:0'],
    ])
    css.push(`.raw${n}{opacity:0;animation-name:raw${n};${originRaw}}`)

    // The caret: after the last chunk that has arrived, then blinking, then gone.
    const caretFrames = [[0, 'opacity:0']]
    if (times[0] > 0.01) caretFrames.push([times[0] - 0.12, 'opacity:1;transform:translateX(0)'])
    let x = 0
    slot.chunks.forEach((chunk, i) => {
      x += [...chunk].length * advance
      caretFrames.push([times[i], `opacity:1;transform:translateX(${r(x)}px)`])
    })
    const blink = HOLD / 3
    caretFrames.push([typed + blink, `opacity:0;transform:translateX(${r(x)}px)`])
    caretFrames.push([typed + 2 * blink, `opacity:1;transform:translateX(${r(x)}px)`])
    caretFrames.push([m0 + 0.08, 'opacity:0'])
    caretFrames.push([LOOP, 'opacity:0'])
    keyframes(`caret${n}`, caretFrames)
    css.push(`.caret${n}{animation-name:caret${n}}`)
    const caretH = mono.capHeight * ms * 1.45
    const caret = `<rect class="caret caret${n}" x="${r(TEXT_X + 1)}" y="${r(monoBaseline - caretH * 0.84)}" width="1.8" height="${r(caretH)}" rx=".9"/>`

    // The math: comes in where the source was, holds, then fades.
    const mathWidth = slot.math.width * TEX_EM
    const originTex = `transform-origin:${r(TEXT_X + mathWidth / 2)}px ${FORMULA_MID}px`
    keyframes(`tex${n}`, [
      [0, 'opacity:0'],
      [m0 + MORPH * 0.3, 'opacity:0;transform:scale(1.08);filter:blur(4px);animation-timing-function:cubic-bezier(.2,.7,.3,1)'],
      [m1, 'opacity:1;transform:none;filter:blur(0)'],
      [f0, 'opacity:1;transform:none;filter:blur(0);animation-timing-function:ease-in'],
      [f1, 'opacity:0;transform:translateY(-4px);filter:blur(1.5px)'],
      [LOOP, 'opacity:0'],
    ])
    css.push(`.tex${n}{opacity:${n === 0 ? 1 : 0};animation-name:tex${n};${originTex}}`)

    sources.push(`<g class="raw raw${n}">${chunkMarkup.join('')}</g>${caret}`)
    maths.push(`<g class="tex tex${n}">${drawOps(defs, slot.math.ops, TEXT_X, slot.baseline, TEX_EM)}</g>`)
    if (rawWidth + TEXT_X > W - 8) throw new Error(`formula ${n} source runs off the banner (${r(rawWidth)} px)`)
    start = f1
  })

  // The cat's small life, on the same loop: eyes blink now and then (a double
  // blink once); the left ear twitches when a formula appears; the eyes glance
  // at the math. The tail swishes four times a loop, eased; each joint up the tail bends the
  // same way a little later than the one below (follow-through, so the tail
  // curls and uncurls), and flicks as each formula lands.
  const swish = LOOP / 4
  const { base, tip, flick } = TAIL_MOTION
  const swing = (lo, hi) => {
    const frames = []
    for (let k = 0; k <= 8; k++) frames.push([(k * swish) / 2, `transform:rotate(${k % 2 ? hi : lo}deg)`])
    return frames
  }
  keyframes('tail', swing(base[0], base[1]))
  keyframes('tip', swing(tip[0], tip[1]))
  const flickFrames = [[0, 'transform:none']]
  for (const [g0] of glances) {
    const landed = g0 - 0.15 + MORPH
    flickFrames.push([landed - 0.05, 'transform:none'], [landed + 0.12, `transform:rotate(${flick[0]}deg)`], [landed + 0.3, `transform:rotate(${flick[1]}deg)`], [landed + 0.5, 'transform:none'])
  }
  flickFrames.push([LOOP, 'transform:none'])
  keyframes('flick', flickFrames)
  const joints = tailGeometry(integral).joints
  const blinks = [2.6, 8.3, 12.9, 13.25]
  const blinkFrames = [[0, 'transform:none']]
  const lidFrames = [[0, 'opacity:0']]
  for (const b of blinks) {
    blinkFrames.push([b, 'transform:none'], [b + 0.06, 'transform:scaleY(0)'], [b + 0.11, 'transform:scaleY(0)'], [b + 0.17, 'transform:none'])
    lidFrames.push([b + 0.045, 'opacity:0'], [b + 0.055, 'opacity:1'], [b + 0.115, 'opacity:1'], [b + 0.125, 'opacity:0'])
  }
  blinkFrames.push([LOOP, 'transform:none'])
  lidFrames.push([LOOP, 'opacity:0'])
  keyframes('blink', blinkFrames)
  keyframes('lids', lidFrames)
  const twitches = [glances[1][0] + 0.25, glances[3][0] + 0.25]
  const earFrames = [[0, 'transform:none']]
  for (const e of twitches) earFrames.push([e, 'transform:none'], [e + 0.08, 'transform:rotate(-12deg)'], [e + 0.2, 'transform:rotate(3deg)'], [e + 0.3, 'transform:none'])
  earFrames.push([LOOP, 'transform:none'])
  keyframes('ear', earFrames)
  const glanceFrames = [[0, 'transform:none']]
  for (const [g0, g1] of glances) glanceFrames.push([g0, 'transform:none'], [g0 + 0.25, 'transform:translate(2.4px,1.6px)'], [g1, 'transform:translate(2.4px,1.6px)'], [g1 + 0.3, 'transform:none'])
  glanceFrames.push([LOOP, 'transform:none'])
  keyframes('glance', glanceFrames)

  const [rootX, rootY] = TAIL_ROOT
  const animCss = [
    `.raw,.caret,.tex,.ch,.tail,.tip,.flick,.eye,.lids,.ear-l,.pupils{animation-duration:${LOOP}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}`,
    `.ch{animation-name:ch}`,
    `@keyframes ch{0%,${r(50, 3)}%{opacity:1}${r(50.01, 3)}%,100%{opacity:0}}`,
    `.caret{opacity:0;animation-timing-function:steps(1,end)}`,
    `.tail{animation-name:tail;animation-timing-function:ease-in-out;transform-origin:${rootX}px ${rootY}px}`,
    `.tip{animation-name:tip;animation-timing-function:ease-in-out}`,
    `.flick{animation-name:flick;animation-timing-function:ease-out}`,
    ...joints.map((j, k) => {
      const origin = `transform-origin:${r(j.x)}px ${r(j.y)}px`
      return `.j${k + 1}>.tip{${origin};animation-delay:${r(swish / 6 + k * 0.18 - LOOP, 3)}s}.j${k + 1}>.tip>.flick{${origin};animation-delay:${r(k * 0.06 + Number(OFFSET), 3)}s}`
    }),
    `.eye{animation-name:blink;transform-origin:0 -118px}`,
    `.lids{animation-name:lids}`,
    `.ear-l{animation-name:ear;transform-origin:-38px -142px}`,
    `.pupils{animation-name:glance;animation-timing-function:ease-in-out}`,
    `.raw,.caret,.tex,.ear-l,.pupils{animation-delay:${OFFSET}s}`,
    ...css,
    `@media (prefers-reduced-motion:reduce){*{animation:none!important}}`,
  ].join('')

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<title>kittex: LaTeX for Claude Code, typeset as real equations</title>`,
    `<style>${vars(THEMES.light)}@media (prefers-color-scheme:dark){${vars(THEMES.dark)}}`,
    `.ink{fill:var(--ink)}.muted{fill:var(--muted)}.caret{fill:var(--caret)}${CAT_CSS}`,
    `${animCss}</style>`,
    `<defs>${defs.out.join('')}</defs>`,
    `<g transform="translate(${CAT_X} ${CAT_GROUND})">${cat({ integral })}</g>`,
    `<g class="ink">${word.kit}${word.tex}</g>`,
    subtitle,
    `<g class="muted">${sources.join('')}</g>`,
    `<g class="ink">${maths.join('')}</g>`,
    `</svg>`,
  ].join('\n')
  mkdirSync(OUT_DIR, { recursive: true })
  const file = `${OUT_DIR}/banner.svg`
  writeFileSync(file, `${svg}\n`)
  console.log(`${file}: ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KiB`)
  console.log(`wordmark ${r(word.width)} px wide; each formula shows for ${show.toFixed(2)} s`)
  console.log(`  subtitle: ${r(subWidth)} px wide, typed ${r(SUB_START)}-${r(subTyped)} s, typeset ${r(subM0)}-${r(subM1)} s; the loop starts ${OFFSET} s in`)
  for (const line of timeline) console.log(`  ${line} (into the loop)`)
  console.log(`  tail: at least ${r(reach.whiskers)} px from a whisker, ${r(reach.head)} px from the head, ${r(TEXT_X - CAT_X - reach.right)} px from the wordmark`)
  console.log(`  blinks at ${blinks.join(', ')} s; ear twitches at ${twitches.map(t => r(t)).join(', ')} s`)
}

await main()
