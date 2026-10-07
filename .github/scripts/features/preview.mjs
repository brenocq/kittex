// Renders the README cards for review, in headless Chrome (no window opens):
//
//   node .github/scripts/features/preview.mjs [--scale 2]
//
// Writes .github/assets/features-contact-sheet.png: a few moments of each card
// (every animation paused there through the Web Animations API), on a light
// and a dark page; and .github/assets/features-preview.html: the cards laid out
// as the README lays them out, in both themes side by side.
//
// Each card is inlined with its theme forced: the cards follow
// prefers-color-scheme through custom properties, so a wrapper class that sets
// them wins over the card's own query. Run it under a memory cap
// (AGENTS.md, "Heavy jobs"):
//   systemd-run --user --scope -p MemoryMax=4G -p MemorySwapMax=0 node .github/scripts/features/preview.mjs
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { launch } from '../demo/chrome.mjs'
import { PRIMER } from './lib.mjs'

const ASSETS = '.github/assets'
const args = process.argv.slice(2)
const scale = Number(args[args.indexOf('--scale') + 1] || 2)

/** The cards and the moments of their loops the contact sheet shows. */
const CARDS = [
  { file: 'feature-live.svg', times: [1.4, 2.1, 3.05, 5] },
  { file: 'feature-tex.svg', times: [1.5, 3.9, 6.3, 8.7] },
  { file: 'feature-inline.svg', times: [1.2, 2.5, 4.3, 5.5] },
  { file: 'feature-copy.svg', times: [1.2, 2.6, 3.42, 4.6] },
]
const PAGE = { light: '#ffffff', dark: '#0d1117' }

const vars = theme => Object.entries(PRIMER[theme]).map(([k, v]) => `--${k}:${v}`).join(';')
const THEME_CSS = `.light svg{${vars('light')}}.dark svg{${vars('dark')}}`

let copies = 0
/** A card's SVG, inlined with ids of its own (ids are per document once inlined). */
function inlined(file) {
  const n = copies++
  return readFileSync(join(ASSETS, file), 'utf8')
    .replace(/id="/g, `id="c${n}-`)
    .replace(/href="#/g, `href="#c${n}-`)
    .replace(/url\(#/g, `url(#c${n}-`)
}

function contactSheet() {
  const columns = Math.max(...CARDS.map(c => c.times.length))
  const cells = CARDS.flatMap(({ file, times }) =>
    ['light', 'dark'].flatMap(theme =>
      times.map(t => `<div class="cell ${theme}" data-t="${t}"><span>${file.replace(/\.svg$/, '')} · ${theme} · t = ${t}s</span>${inlined(file)}</div>`),
    ),
  )
  return {
    width: columns * 452,
    height: CARDS.length * 2 * 272,
    html: `<!doctype html><meta charset="utf-8"><style>${THEME_CSS}
body{margin:0;display:grid;grid-template-columns:repeat(${columns},452px)}
.cell{position:relative;height:272px}.light{background:${PAGE.light}}.dark{background:${PAGE.dark}}
.cell svg{position:absolute;left:16px;top:22px}
.cell span{position:absolute;left:16px;top:4px;font:11px monospace;color:#8b949e}
</style>${cells.join('')}<script>
for (const a of document.getAnimations()) { a.pause(); a.currentTime = Number(a.effect.target.closest('.cell').dataset.t) * 1000 }
</script>`,
  }
}

/** The README's layout: a 2×2 grid of images at 49% of a GitHub-width column, in both themes. */
function previewPage() {
  const grid = () =>
    [0, 2]
      .map(i => `<p align="center">${CARDS.slice(i, i + 2).map(c => `<span class="img">${inlined(c.file)}</span>`).join('\n')}</p>`)
      .join('')
  return `<!doctype html><meta charset="utf-8"><title>kittex feature cards</title><style>${THEME_CSS}
body{margin:0;display:flex;flex-wrap:wrap;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif}
.page{flex:1 1 900px;padding:24px 16px}.light{background:${PAGE.light};color:#1f2328}.dark{background:${PAGE.dark};color:#f0f6fc}
.readme{max-width:896px;margin:0 auto}h2{border-bottom:1px solid #d1d9e055;padding-bottom:.3em;font-size:1.5em;font-weight:600}
p{margin:0 0 16px}.img{display:inline-block;width:49%}.img svg{width:100%;height:auto;display:block}
</style>
<section class="page light"><div class="readme"><h2>What you get</h2>${grid()}</div></section>
<section class="page dark"><div class="readme"><h2>What you get</h2>${grid()}</div></section>
<!-- The README uses <p align="center"> with two <img width="49%"> per row; this page inlines the
     same SVGs so both themes show at once. Narrow the window to see the phone layout. -->`
}

writeFileSync(join(ASSETS, 'features-preview.html'), previewPage())

const dir = mkdtempSync(join(tmpdir(), 'kittex-features-'))
const chrome = await launch()
try {
  await chrome.send('Page.enable')
  const sheet = contactSheet()
  const page = join(dir, 'sheet.html')
  writeFileSync(page, sheet.html)
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: sheet.width, height: sheet.height, deviceScaleFactor: scale, mobile: false })
  const loaded = chrome.once('Page.loadEventFired')
  await chrome.send('Page.navigate', { url: pathToFileURL(page).href })
  await loaded
  await new Promise(done => setTimeout(done, 300))
  const { data } = await chrome.send('Page.captureScreenshot', { format: 'png' })
  const out = join(ASSETS, 'features-contact-sheet.png')
  writeFileSync(out, Buffer.from(data, 'base64'))
  console.log(out)
  console.log(join(ASSETS, 'features-preview.html'))
} finally {
  await chrome.close()
  rmSync(dir, { recursive: true, force: true })
}
