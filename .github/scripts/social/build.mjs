// The repository's social preview card: the banner's kitten, wordmark and
// subtitle beside a still of the demo window, 1280×640 as GitHub asks for.
//
//   npm run readme:social        # writes .github/assets/social.png
//
// Reads .github/assets/banner.svg (npm run readme:banner) and demo.png (npm
// run readme:demo); renders in headless Chrome with the banner in its dark
// theme and its still frame (reduced motion). GitHub takes the card by hand:
// Settings → General → Social preview → Edit → Upload an image.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { launch } from '../demo/chrome.mjs'

const W = 1280
const H = 640
const ASSETS = '.github/assets'

const banner = readFileSync(join(ASSETS, 'banner.svg'), 'utf8').replace(/^<\?xml[^>]*>\s*/, '')
const demo = `data:image/png;base64,${readFileSync(join(ASSETS, 'demo.png')).toString('base64')}`

const page = `<!doctype html>
<meta charset="utf-8">
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
  body {
    position: relative;
    background:
      radial-gradient(640px 420px at 18% 38%, rgba(254, 128, 25, 0.13), transparent 70%),
      radial-gradient(720px 520px at 92% 96%, rgba(131, 165, 152, 0.12), transparent 70%),
      #0d1117;
    font-family: 'Roboto Mono', monospace;
  }
  .left { position: absolute; left: 64px; top: 0; bottom: 0; width: 540px; display: flex; flex-direction: column; justify-content: center; gap: 40px; }
  .crop { position: relative; overflow: hidden; }
  .crop svg { position: absolute; display: block; }
  .install {
    align-self: flex-start; margin-left: 8px;
    padding: 12px 18px; border-radius: 10px;
    background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.10);
    color: #e6edf3; font-size: 15.5px; font-weight: 500; white-space: nowrap;
  }
  .install b { color: #fe8019; font-weight: 500; margin-right: 10px; }
  .demo { position: absolute; }
</style>
<div class="left">
  <div class="crop">${banner}</div>
  <div class="install"><b>❯</b>/plugin install kittex --marketplace brenocq/kittex</div>
</div>
<img class="demo" src="${demo}">
<script>
  // Crop the banner to its visible ink (its SVG carries its own margins) and
  // scale it to the column; place the demo window's full width on the right,
  // bleeding off the bottom edge.
  window.layout = async () => {
    await document.fonts.ready
    const crop = document.querySelector('.crop'), svg = crop.querySelector('svg')
    svg.style.width = '880px'; svg.style.height = 'auto'
    const box = svg.getBoundingClientRect()
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const el of svg.querySelectorAll('path, use, rect, circle, ellipse, line, polyline, polygon')) {
      let shown = true
      for (let n = el; n && n !== svg; n = n.parentElement) {
        const cs = getComputedStyle(n)
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) { shown = false; break }
      }
      const r = el.getBoundingClientRect()
      if (!shown || r.width === 0 || r.height === 0) continue
      x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom)
    }
    const pad = 4, k = 540 / (x1 - x0 + 2 * pad)
    svg.style.width = 880 * k + 'px'
    svg.style.left = -(x0 - box.left - pad) * k + 'px'
    svg.style.top = -(y0 - box.top - pad) * k + 'px'
    crop.style.width = (x1 - x0 + 2 * pad) * k + 'px'
    crop.style.height = (y1 - y0 + 2 * pad) * k + 'px'
    // demo.png: the window is 848×808 CSS px inside a 992-wide image (2×), centred.
    const img = document.querySelector('.demo')
    const s = 600 / 848, margin = (992 - 848) / 2
    img.style.width = 992 * s + 'px'
    img.style.left = ${W} - 52 - 600 - margin * s + 'px'
    img.style.top = 64 - 40 * s + 'px'
  }
</script>
`

const html = join(ASSETS, '.social.html')
writeFileSync(html, page)
const chrome = await launch()
try {
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await chrome.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  await chrome.send('Page.enable')
  const loaded = chrome.once('Page.loadEventFired')
  await chrome.send('Page.navigate', { url: pathToFileURL(html).href })
  await loaded
  await chrome.evaluate('window.layout().then(() => new Promise(r => setTimeout(r, 300)))')
  const shot = await chrome.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } })
  writeFileSync(join(ASSETS, 'social.png'), Buffer.from(shot.data, 'base64'))
  console.log(`${ASSETS}/social.png: ${W}×${H}`)
} finally {
  await chrome.close()
}
