// Renders the banner at chosen moments of its loop, on a white and a GitHub-dark
// background, into one PNG (headless Chrome; no window opens):
//
//   node scripts/readme/banner/preview.mjs [--out file.png] [--scale 1] [t1 t2 ...]
//
// Without times it renders the contact sheet: six moments of the loop, written
// to .github/assets/banner-contact-sheet.png. Each frame inlines the SVG and
// pauses every animation at its time through the Web Animations API.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(name)
  if (i < 0) return fallback
  const [value] = args.splice(i, 2).slice(1)
  return value
}
const out = resolve(option('--out', '.github/assets/banner-contact-sheet.png'))
// 2x by default: at 1x Chrome may rasterize a paused, transformed layer (the
// tail) blurry, which the live banner in an <img> is not.
const scale = Number(option('--scale', '2'))
const chrome = process.env.CHROME ?? '/usr/bin/google-chrome-stable'
// Default moments: the source streaming in, the morph, a blink over the attention
// formula, the tail's flick and an ear twitch as the loss lands, Euler, and
// the Gaussian integral.
const times = args.length ? args.map(Number) : [0.75, 1.85, 2.67, 6.33, 10.6, 14.6]

const W = 880
const H = 220
const LABEL = 18
const svgs = { light: readFileSync('.github/assets/banner-light.svg', 'utf8'), dark: readFileSync('.github/assets/banner-dark.svg', 'utf8') }
const backgrounds = { light: '#ffffff', dark: '#0d1117' }

let frames = ''
let n = 0
for (const t of times) {
  for (const theme of ['light', 'dark']) {
    // Ids are per document once inlined: give each copy its own.
    const svg = svgs[theme].replace(/id="/g, `id="f${n}-`).replace(/href="#/g, `href="#f${n}-`).replace(/url\(#/g, `url(#f${n}-`)
    frames += `<div class="frame" style="background:${backgrounds[theme]}" data-t="${t}"><span>${theme} · t = ${t}s</span>${svg}</div>`
    n++
  }
}

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;display:grid;grid-template-columns:${W}px ${W}px;background:#888;gap:0}
.frame{position:relative;width:${W}px;height:${H + LABEL}px}
.frame svg{position:absolute;left:0;top:${LABEL}px}
.frame span{position:absolute;left:6px;top:2px;font:11px monospace;color:#999}
</style>${frames}<script>
for (const a of document.getAnimations()) {
  const t = Number(a.effect.target.closest('.frame').dataset.t)
  a.pause()
  a.currentTime = t * 1000
}
</script>`

const dir = mkdtempSync(join(tmpdir(), 'kittex-preview-'))
try {
  const page = join(dir, 'frames.html')
  writeFileSync(page, html)
  const rows = Math.ceil(n / 2)
  execFileSync(chrome, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    `--user-data-dir=${join(dir, 'profile')}`,
    `--force-device-scale-factor=${scale}`,
    `--window-size=${2 * W},${rows * (H + LABEL)}`,
    '--virtual-time-budget=3000',
    `--screenshot=${out}`,
    `file://${page}`,
  ], { stdio: ['ignore', 'ignore', 'pipe'] })
  console.log(out)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
