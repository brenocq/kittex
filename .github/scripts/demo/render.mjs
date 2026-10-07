#!/usr/bin/env node
// Renders the README demo from the recordings made by record.py: the session
// replayed through a terminal emulator, each screen drawn like kitty in a
// macOS-style window by headless Chrome, retimed, and encoded.
//
//   npm run readme:demo                       # .github/assets/demo.rec.gz (+ demo-2.rec.gz) -> demo.webp, demo.png, demo.mp4,
//                                             #   and demo-social.png (the social card's still)
//   node .github/scripts/demo/render.mjs [--recording <file> ...] [--out <dir>] [--speed 1.5]
//       [--webp lossless|<quality>] [--stills <dir> --at <s,s,...>]   # stills: PNGs at output times
//
// Several recordings play as one session: one made with record.py --resume
// goes on from the one before (with --rewind, in place of its last turn).
//
// Needs Chrome (headless; CHROME=/path overrides), ffmpeg with libwebp_anim and
// libx264, fc-match, and the fonts named in LOOK (the window title is set in
// Inter from Google Fonts, Cantarell or another sans when offline).
//
// Retiming only (the content is never edited): each prompt's typing plays in
// about two seconds, the time before typing, the wait for the first words and
// every idle gap are capped at about a second, each streamed reply plays up to
// `--speed` times faster, a landed reply is held to be read before the next
// prompt, the last one is held longer, then cross-fades to the first frame so
// the loop has no hard seam.

import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { emulate, loadRecording, screenText } from './emulate.mjs'
import { launch } from './chrome.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../..')

// The look: kitty with Roboto Mono and gruvbox dark (~/.config/kitty/current-theme.conf).
const LOOK = {
  theme: {
    foreground: '#ebdbb2', background: '#282828', cursor: '#bdae93', cursorText: '#665c54',
    palette: ['#3c3836', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#a89984',
      '#928374', '#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#fbf1c7'],
    dimOpacity: 0.4, // kitty's dim_opacity
  },
  fonts: [['normal', 500, 'Roboto Mono:style=Medium'], ['normal', 700, 'Roboto Mono:style=Bold'],
    ['italic', 500, 'Roboto Mono:style=Medium Italic'], ['italic', 700, 'Roboto Mono:style=Bold Italic']],
  fallback: '"DejaVu Sans Mono", "DejaVu Sans", "Noto Sans Symbols 2", "Noto Sans Symbols", "Noto Sans CJK SC", sans-serif',
  weight: 500,
  boldWeight: 700,
  dpr: 2,
  fontSize: 30, // device px: Roboto Mono's advance is 0.6 em, so 18 px cells
  baseline: 31, // device px from the cell top (ascender 31.4 of a 39.6 line in a 40 px cell)
  underlineOffset: 4,
  lineWidth: 3, // light box-drawing lines (kitty: 1 pt at 2x)
  heavyWidth: 5,
  titleBar: '#2c2c2c',
  padding: [4, 10, 10, 10], // CSS px around the cells: top, right, bottom, left
  margin: [50, 72, 94, 72], // CSS px of transparent canvas for the shadow
  defaultTitle: 'claude',
  mp4Background: '#d9dbe0',
}

const TIMING = {
  fps: 25, // ffmpeg's concat demuxer times images in 1/25 s: anything finer rounds, some frames to 0 ms
  lead: 1.0, // the empty prompt before the first key
  typing: 2.0, // the prompt typed, first key to Enter (still key by key, in quick bursts)
  cap: 1.0, // longest idle gap
  thinkHead: 0.9, // the spinner shown after submitting...
  thinkTail: 0.5, // ...and just before the first words
  read: 5.0, // a landed reply, before the next prompt is typed
  settle: 0.1, // longest idle redraw between a reply and the next prompt
  hold: 6.0, // the last landed screen
  fade: 0.5, // cross-fade back to the first frame
}

function args() {
  const { values } = parseArgs({
    options: {
      recording: { type: 'string', multiple: true },
      out: { type: 'string', default: join(ROOT, '.github/assets') },
      speed: { type: 'string', default: '1.5' },
      webp: { type: 'string', default: 'lossless' },
      stills: { type: 'string' },
      at: { type: 'string' },
      keep: { type: 'string' },
      'no-mp4': { type: 'boolean', default: false },
    },
  })
  return values
}

function fontFile(pattern) {
  return execFileSync('fc-match', ['-f', '%{file}', pattern], { encoding: 'utf8' })
}

/** Output frames: { start, dur, screen, next?, mix? } in seconds of the animation. */
export function timeline(screens, turns, speed) {
  const T = TIMING
  turns = turns.filter(u => u.submit !== undefined && u.done !== undefined)
  if (!turns.length) throw new Error('no turn in the recording')
  const first = lastAtOrBefore(screens, turns[0].ready)
  const end = lastAtOrBefore(screens, turns.at(-1).done)
  // A reply has begun when a bullet follows its prompt in the transcript
  // (above the input box, the last two rules).
  const replied = (s, prompt) => {
    let lines = screenText(s).split('\n')
    for (let k = 0; k < 2; k++) {
      const rule = lines.findLastIndex(l => /^─{8}/.test(l))
      if (rule >= 0) lines = lines.slice(0, rule)
    }
    const asked = lines.findLastIndex(l => /^❯\s/.test(l) && l.slice(1).trim().startsWith(prompt.slice(0, 40)))
    return asked >= 0 && lines.slice(asked + 1).some(l => /^\s*[●⏺]/.test(l))
  }
  // Each turn's phases: the prompt typed, the wait for the first words, the reply streaming.
  const phases = turns.map((u, k) => {
    const typed = screens.findIndex(s => s.t > u.ready)
    const reply = screens.findIndex(s => s.t > u.submit && replied(s, u.prompt))
    if (typed < 0 || reply < 0) throw new Error(`no reply to prompt ${k + 1} in the recording`)
    const typeStart = screens[typed].t
    // Typing plays faster, so each prompt takes about T.typing.
    return { ...u, typed, typeStart, thinkStart: u.submit, thinkEnd: screens[reply].t, typeSpeed: Math.max(1, (u.submit - typeStart) / T.typing) }
  })

  // Warped time of each screen from `first` to `end`.
  const at = new Map([[first, 0]])
  let out = 0
  for (let i = first + 1; i <= end; i++) {
    const [a, b] = [screens[i - 1].t, screens[i].t]
    const k = phases.findLastIndex(p => p.ready < b)
    const p = phases[Math.max(0, k)]
    let dt
    if (i === p.typed) dt = k <= 0 ? T.lead : T.read // the empty prompt; then each landed reply, held to be read
    else if (b <= p.thinkEnd && a >= p.thinkStart) {
      // The wait for the first words: its head and tail at real speed, the middle skipped.
      const keep = (t0, t1) => Math.max(0, Math.min(t1, p.thinkStart + T.thinkHead) - Math.max(t0, p.thinkStart)) +
        Math.max(0, Math.min(t1, p.thinkEnd) - Math.max(t0, p.thinkEnd - T.thinkTail))
      dt = Math.min(keep(a, b), b - a)
    } else if (a >= p.thinkEnd && b <= p.done) dt = (b - a) / speed
    else if (a >= p.typeStart && b <= p.thinkStart) dt = (b - a) / p.typeSpeed
    else if (a >= p.done || (k > 0 && i < p.typed)) dt = Math.min(b - a, T.settle) // idle redraws between a reply and the next prompt
    else dt = b - a
    out += i === p.typed ? dt : Math.min(dt, T.cap)
    at.set(i, out)
  }

  // Sample at the frame rate as a screen recorder would: each frame shows the
  // screen in force at its instant; runs of one screen become one longer frame.
  const q = 1 / T.fps
  const frames = []
  let i = first
  for (let k = 0; k * q <= out + q / 2; k++) {
    while (i < end && at.get(i + 1) <= k * q + 1e-9) i++
    if (!frames.length || frames.at(-1).screen !== screens[i]) frames.push({ start: k * q, screen: screens[i] })
  }
  // The final screen can fall between the last two instants (the images land a
  // few ms after the last preview): it still gets a frame of its own.
  if (frames.at(-1).screen !== screens[end]) frames.push({ start: frames.at(-1).start + q, screen: screens[end] })
  const landed = frames.at(-1)
  let t = landed.start + T.hold
  const steps = Math.max(2, Math.round(T.fade * T.fps))
  for (let k = 1; k < steps; k++) {
    frames.push({ start: t, screen: landed.screen, next: screens[first], mix: k / steps })
    t += T.fade / steps
  }
  frames.push({ start: t, end: true })
  for (let i = 0; i + 1 < frames.length; i++) frames[i].dur = frames[i + 1].start - frames[i].start
  frames.pop()
  // The loop restarts on the first frame, which keeps its own lead time.
  return { frames: frames.filter(f => f.dur > 1e-6), landed: landed.screen, total: t }
}

/**
 * Emulates each recording and joins them into one session: a recording that
 * resumed the one before (record.py --resume) goes on from its first prompt,
 * and one that also rewound it (--rewind) takes the place of its last turn.
 */
export async function replay(paths) {
  let screens = [], turns = [], header
  const images = new Map()
  for (const path of paths) {
    const rec = loadRecording(path)
    const part = await emulate(rec, LOOK.theme)
    const prompts = rec.header.prompts ?? [rec.header.prompt]
    part.turns.forEach((u, k) => { u.prompt = prompts[k] })
    for (const [id, image] of part.images) images.set(id, image)
    if (!header) {
      ({ header } = rec)
      ;({ screens, turns } = part)
      continue
    }
    if (rec.header.cols !== header.cols || rec.header.rows !== header.rows) throw new Error(`${path}: another window size`)
    if (rec.header.rewind) turns = turns.slice(0, -1)
    const cut = turns.at(-1).done
    const from = lastAtOrBefore(part.screens, part.turns[0].ready)
    const shift = cut + 0.5 - part.screens[from].t
    screens = [...screens.filter(s => s.t <= cut), ...part.screens.slice(from).map(s => ({ ...s, t: s.t + shift }))]
    turns = [...turns, ...part.turns.map(u => Object.fromEntries(Object.entries(u).map(([k, v]) => [k, typeof v === 'number' ? v + shift : v])))]
  }
  return { header, screens, turns, images }
}

function lastAtOrBefore(screens, t) {
  let k = 0
  screens.forEach((s, i) => { if (s.t <= t) k = i })
  return k
}

/**
 * The first row worth starting a still at: past a picture cut off by the top
 * edge (its first row is above the screen) and the blank rows after it.
 */
export function cleanTop(screen) {
  let y = 0
  while (y < screen.rows.length && screen.rows[y].some(c => c.img && c.img.row > y)) y++
  if (y === 0) return 0
  while (y < screen.rows.length && screen.rows[y].every(c => !c.img && !(c.ch ?? '').trim())) y++
  return y
}

/** Drops the per-screen key and keeps what the page draws. */
function plain(screen) {
  return screen && { rows: screen.rows, cursor: screen.cursor, title: screen.title }
}

async function main() {
  const opt = args()
  const recordings = opt.recording ?? ['demo.rec.gz', 'demo-2.rec.gz'].map(f => join(ROOT, '.github/assets', f)).filter(f => existsSync(f))
  const { header, screens, images, turns } = await replay(recordings)
  if (header.cellWidth % 1 || header.cellHeight % 1) throw new Error('cells must be whole device pixels')
  const { frames, landed, total } = timeline(screens, turns, Number(opt.speed))
  console.error(`${screens.length} screens, ${images.size} images, ${frames.length} frames, ${total.toFixed(2)} s`)

  const work = opt.keep ? resolve(opt.keep) : mkdtempSync(join(tmpdir(), 'kittex-demo-'))
  mkdirSync(work, { recursive: true })
  const config = {
    ...LOOK,
    fonts: LOOK.fonts.map(([style, weight, pattern]) => [style, weight, pathToFileURL(fontFile(pattern)).href]),
    cols: header.cols, rows: header.rows, cellWidth: header.cellWidth, cellHeight: header.cellHeight,
    images: Object.fromEntries([...images.values()].map(i => [i.id, { data: i.png, cols: i.cols, rows: i.rows }])),
  }

  const chrome = await launch()
  try {
    await chrome.send('Page.enable')
    await chrome.send('Runtime.enable')
    const loaded = chrome.once('Page.loadEventFired')
    await chrome.send('Page.navigate', { url: pathToFileURL(join(HERE, 'page.html')).href })
    await loaded
    await chrome.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
    const size = await chrome.evaluate(`setup(${JSON.stringify(config)})`)
    await chrome.send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: LOOK.dpr, mobile: false })
    const shoot = async (frame, file, box = size) => {
      await chrome.evaluate(`show(${JSON.stringify({ screen: plain(frame.screen), next: plain(frame.next), mix: frame.mix })})`)
      const { data } = await chrome.send('Page.captureScreenshot', {
        format: 'png', clip: { x: 0, y: 0, width: box.width, height: box.height, scale: 1 }, captureBeyondViewport: false,
      })
      writeFileSync(file, Buffer.from(data, 'base64'))
    }

    if (opt.stills) {
      // PNGs at chosen output times, for looking at.
      mkdirSync(opt.stills, { recursive: true })
      for (const s of (opt.at ?? '0').split(',').map(Number)) {
        const f = frames.filter(x => x.start <= s).at(-1) ?? frames[0]
        const file = join(opt.stills, `still-${s.toFixed(2)}.png`)
        await shoot(f, file)
        console.log(file)
      }
      return
    }

    const dir = join(work, 'frames')
    mkdirSync(dir, { recursive: true })
    let list = ''
    for (const [i, f] of frames.entries()) {
      const file = join(dir, `${String(i).padStart(5, '0')}.png`)
      await shoot(f, file)
      list += `file '${file}'\nduration ${f.dur.toFixed(4)}\n`
      if (i % 50 === 0) console.error(`frame ${i}/${frames.length}`)
    }
    // The concat demuxer drops the last duration unless the file is listed again.
    list += `file '${join(dir, `${String(frames.length - 1).padStart(5, '0')}.png`)}'\n`
    writeFileSync(join(work, 'frames.txt'), list)
    await shoot({ screen: landed }, join(work, 'poster.png'))
    // The social card's still: the landed screen in a window that starts at a
    // clean row, the rows above (a picture cut by the top edge) left out.
    const top = cleanTop(landed)
    if (top > 0) {
      const box = await chrome.evaluate(`setup(${JSON.stringify({ ...config, rows: header.rows - top })})`)
      await chrome.send('Emulation.setDeviceMetricsOverride', { width: box.width, height: box.height, deviceScaleFactor: LOOK.dpr, mobile: false })
      const cropped = { rows: landed.rows.slice(top), cursor: { ...landed.cursor, y: landed.cursor.y - top }, title: landed.title }
      await shoot({ screen: cropped }, join(work, 'social.png'), box)
    } else copyFileSync(join(work, 'poster.png'), join(work, 'social.png'))
  } finally {
    await chrome.close()
  }

  mkdirSync(opt.out, { recursive: true })
  const webp = join(opt.out, 'demo.webp'), png = join(opt.out, 'demo.png'), mp4 = join(opt.out, 'demo.mp4')
  // Lossless takes RGB (yuva420p would halve the colour resolution before encoding);
  // it is both sharper and smaller than lossy at quality 92 for these frames.
  const quality = opt.webp === 'lossless' ? ['-lossless', '1', '-compression_level', '6', '-quality', '100', '-pix_fmt', 'bgra']
    : ['-lossless', '0', '-quality', opt.webp, '-compression_level', '6', '-preset', 'text', '-pix_fmt', 'yuva420p']
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', join(work, 'frames.txt'), '-fps_mode', 'passthrough',
    '-c:v', 'libwebp_anim', ...quality, '-loop', '0', webp])
  copyFileSync(join(work, 'poster.png'), png)
  copyFileSync(join(work, 'social.png'), join(opt.out, 'demo-social.png'))
  if (!opt['no-mp4']) {
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', join(work, 'frames.txt'),
      '-f', 'lavfi', '-i', `color=c=${LOOK.mp4Background}:s=16x16`,
      '-filter_complex', '[1][0]scale2ref[bg][fg];[bg][fg]overlay=shortest=1,fps=25,pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p',
      '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-tune', 'animation', '-movflags', '+faststart', mp4])
  }
  for (const f of [webp, png, ...(opt['no-mp4'] ? [] : [mp4])]) console.log(`${f}  ${(statSync(f).size / 1024).toFixed(0)} KiB`)
  if (!opt.keep) rmSync(work, { recursive: true, force: true })
}

function ffmpeg(argv) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { stdio: 'inherit' })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
