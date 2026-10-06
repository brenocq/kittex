// Renders the banner at chosen moments of its loop, once with the page in light
// mode (on #ffffff) and once in dark mode (on #0d1117), side by side in one PNG.
// Headless Chrome, driven over the DevTools protocol; no window opens:
//
//   node scripts/readme/banner/preview.mjs [--out file.png] [--scale 1] [t1 t2 ...]
//
// Without times it renders the contact sheet: six moments of the loop, written
// to .github/assets/banner-contact-sheet.png. Each frame inlines banner.svg and
// pauses every animation at its time through the Web Animations API; the theme
// comes from the SVG's own prefers-color-scheme query, emulated per column.
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

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
const svg = readFileSync('.github/assets/banner.svg', 'utf8')
const THEMES = { light: '#ffffff', dark: '#0d1117' }

/** One column of frames: the banner inlined at each time, every animation paused there. */
function framesPage(theme) {
  const frames = times
    .map((t, n) => {
      // Ids are per document once inlined: give each copy its own.
      const copy = svg.replace(/id="/g, `id="f${n}-`).replace(/href="#/g, `href="#f${n}-`).replace(/url\(#/g, `url(#f${n}-`)
      return `<div class="frame" data-t="${t}"><span>${theme} · t = ${t}s</span>${copy}</div>`
    })
    .join('')
  return `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:${THEMES[theme]}}
.frame{position:relative;width:${W}px;height:${H + LABEL}px}
.frame svg{position:absolute;left:0;top:${LABEL}px}
.frame span{position:absolute;left:6px;top:2px;font:11px monospace;color:#999}
</style>${frames}<script>
for (const a of document.getAnimations()) {
  a.pause()
  a.currentTime = Number(a.effect.target.closest('.frame').dataset.t) * 1000
}
</script>`
}

const sleep = ms => new Promise(done => setTimeout(done, ms))

/** A headless Chrome tab and a minimal DevTools-protocol client for it. */
async function openChrome(dir) {
  const profile = join(dir, 'profile')
  const proc = spawn(chrome, ['--headless', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' })
  let port
  for (let i = 0; i < 100 && !port; i++) {
    await sleep(100)
    try {
      port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]
    } catch {}
  }
  if (!port) throw new Error('Chrome did not start')
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((done, fail) => {
    ws.addEventListener('open', done)
    ws.addEventListener('error', fail)
  })
  let id = 0
  const pending = new Map()
  const waiters = []
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id) pending.get(message.id)?.(message)
    else for (const w of waiters.filter(w => w.method === message.method)) waiters.splice(waiters.indexOf(w), 1) && w.done()
  })
  const call = (method, params = {}) =>
    new Promise((done, fail) => {
      pending.set(++id, message => (message.error ? fail(new Error(`${method}: ${message.error.message}`)) : done(message.result)))
      ws.send(JSON.stringify({ id, method, params }))
    })
  const once = method => new Promise(done => waiters.push({ method, done }))
  await call('Page.enable')
  return {
    call,
    /** Loads a page at the given CSS size and returns its screenshot as PNG bytes. */
    async shoot(url, width, height) {
      await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false })
      const loaded = once('Page.loadEventFired')
      await call('Page.navigate', { url })
      await loaded
      await sleep(200)
      const { data } = await call('Page.captureScreenshot', { format: 'png' })
      return Buffer.from(data, 'base64')
    },
    close() {
      ws.close()
      proc.kill()
    },
  }
}

const dir = mkdtempSync(join(tmpdir(), 'kittex-preview-'))
let browser
try {
  browser = await openChrome(dir)
  const height = times.length * (H + LABEL)
  for (const theme of Object.keys(THEMES)) {
    const page = join(dir, `${theme}.html`)
    writeFileSync(page, framesPage(theme))
    await browser.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] })
    writeFileSync(join(dir, `${theme}.png`), await browser.shoot(pathToFileURL(page).href, W, height))
  }
  // The two columns side by side.
  const sheet = join(dir, 'sheet.html')
  writeFileSync(sheet, `<!doctype html><style>body{margin:0;display:flex}img{width:${W}px;height:${height}px}</style><img src="light.png"><img src="dark.png">`)
  writeFileSync(out, await browser.shoot(pathToFileURL(sheet).href, 2 * W, height))
  console.log(out)
} finally {
  browser?.close()
  await sleep(300)
  rmSync(dir, { recursive: true, force: true })
}
