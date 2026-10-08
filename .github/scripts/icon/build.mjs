// The plugin's icon for Claude Code's plugin directory: the banner's kitten
// (head and upper body, from the same drawing in banner/cat.mjs) on a rounded
// square of GitHub's dark surface, 1024×1024 PNG.
//
//   npm run plugin:icon                     # writes plugin/.claude-plugin/icon.png
//   node .github/scripts/icon/build.mjs --transparent --out file.png
//                                           # the whole cat, no background
//
// Run `npm ci` first; renders in headless Chrome (CHROME=/path/to/chrome to
// override). The cat takes its dark-page colours (the tail a charcoal with a
// lighter rim) and its still pose: no animation runs in a PNG.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { CAT_CSS, CAT_THEMES, cat } from '../banner/cat.mjs'
import { loadTypesetter } from '../banner/glyphs.mjs'
import { launch } from '../demo/chrome.mjs'

const args = process.argv.slice(2)
const transparent = args.includes('--transparent')
const outAt = args.indexOf('--out')
const out = resolve(outAt >= 0 ? args[outAt + 1] : 'plugin/.claude-plugin/icon.png')
const SIZE = 1024
const RADIUS = 224 // the square's corners, px

// The ∫ for the tail, in font units with y up (as the banner takes it).
const typeset = await loadTypesetter()
const int = typeset('\\int', { display: true }).ops[0]
const nums = int.d.match(/-?\d*\.?\d+/g).map(Number)
const xs = nums.filter((_, i) => i % 2 === 0)
const ys = nums.filter((_, i) => i % 2 === 1)
const integral = { d: int.d, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }

// The window onto the cat, in its units (origin on the ground, y down): on the
// square, the head and chest, the body running off the bottom edge; without
// it, the whole cat with a margin.
const view = transparent ? [-104, -204, 208, 208] : [-98, -220, 196, 196]
const vars = Object.entries(CAT_THEMES.dark).map(([k, v]) => `--${k}:${v}`).join(';')
const background = transparent
  ? ''
  : `<defs><radialGradient id="glow" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#fe8019" stop-opacity=".09"/><stop offset="1" stop-color="#fe8019" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="square"><rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}"/></clipPath></defs>` +
    `<rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" fill="#151b23"/><rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" fill="url(#glow)"/>`
const drawing = `<svg x="0" y="0" width="${SIZE}" height="${SIZE}" viewBox="${view.join(' ')}" overflow="hidden">${cat({ integral })}</svg>`
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`,
  `<style>svg{${vars}}${CAT_CSS}</style>`,
  background,
  transparent ? drawing : `<g clip-path="url(#square)">${drawing}</g>`,
  // A faint edge, so the square holds on a page as dark as itself.
  transparent ? '' : `<rect x="3" y="3" width="${SIZE - 6}" height="${SIZE - 6}" rx="${RADIUS - 3}" fill="none" stroke="#ffffff" stroke-opacity=".1" stroke-width="6"/>`,
  `</svg>`,
].join('')

const dir = mkdtempSync(join(tmpdir(), 'kittex-icon-'))
const chrome = await launch()
try {
  const html = join(dir, 'icon.html')
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`)
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: SIZE, height: SIZE, deviceScaleFactor: 1, mobile: false })
  await chrome.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
  await chrome.send('Page.enable')
  const loaded = chrome.once('Page.loadEventFired')
  await chrome.send('Page.navigate', { url: pathToFileURL(html).href })
  await loaded
  const shot = await chrome.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: SIZE, height: SIZE, scale: 1 } })
  const png = Buffer.from(shot.data, 'base64')
  writeFileSync(out, png)
  console.log(`${out}: ${SIZE}×${SIZE}, ${(png.length / 1024).toFixed(0)} KiB`)
} finally {
  await chrome.close()
  rmSync(dir, { recursive: true, force: true })
}
