// The README's terminals card: where kittex draws typeset images (kitty and
// Ghostty, with their official icons) and where it writes Unicode math (every
// other terminal, as name chips: no logos, several are others' trademarks),
// each over a mini terminal showing the same formula as that terminal gets it.
//
// The icons come from their projects' repositories at pinned commits, checked
// by hash and cached in the system temp directory:
// - kitty: logo/kitty.svg from kovidgoyal/kitty (GPL-3.0, the repository's
//   licence; no separate licence for the logo), inlined as vector shapes;
// - Ghostty: images/icons/icon_128.png from ghostty-org/ghostty (MIT, the
//   repository's licence; no separate licence for the icon), as a data URI.
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Defs, FONT_STACK, TERM, cellWidth, keyframes, monoText, placeMath, r, themeCss } from './lib.mjs'

const ICONS = {
  kitty: {
    url: 'https://raw.githubusercontent.com/kovidgoyal/kitty/efcacd0885e914de4c6c91c1c51e6107309edb3b/logo/kitty.svg',
    sha256: 'b937ae4fea91793b992a59ed39c1f472741a2bdbcf5175bdcb78bdceb4c03aac',
  },
  ghostty: {
    url: 'https://raw.githubusercontent.com/ghostty-org/ghostty/c1c3f639c5d50e15c8890ecfa56d82f52072deea/images/icons/icon_128.png',
    sha256: 'e98963724b3b2be2cf0c45dc3d32d52f416a2167fcf73fa95d25c87c6833db94',
  },
}

/** An icon's bytes: from the cache, or downloaded once; refused unless they hash as pinned. */
async function icon({ url, sha256 }) {
  const dir = join(tmpdir(), 'kittex-readme-icons')
  const file = join(dir, sha256)
  const hash = bytes => createHash('sha256').update(bytes).digest('hex')
  try {
    const bytes = readFileSync(file)
    if (hash(bytes) === sha256) return bytes
  } catch {}
  const response = await fetch(url)
  if (!response.ok) throw new Error(`could not download ${url}: ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (hash(bytes) !== sha256) throw new Error(`${url} changed (sha256 ${hash(bytes)})`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(file, bytes)
  return bytes
}

const W = 880
const H = 280
const DIVIDER = W / 2
const COLS = [
  { x: 24, title: 'Typeset images', sub: 'Real equations, drawn in place' },
  { x: DIVIDER + 24, title: 'Unicode math', sub: 'Every other terminal, as text' },
]
const TILE = { y: 136, w: W / 2 - 48, h: 124, rx: 8 }
const OTHERS = ['WezTerm', 'iTerm2', 'Terminal.app', 'Windows Terminal', 'Alacritty', 'tmux', '…']

const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function terminals({ core, mono }) {
  const defs = new Defs()
  const css = []
  const tex = 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}'

  // The icons. kitty's SVG is shapes only (checked here), so it is inlined.
  const kittySvg = (await icon(ICONS.kitty)).toString('utf8')
  if (/<script|href|foreignObject|\son\w+=/i.test(kittySvg)) throw new Error('the kitty icon is not plain shapes')
  const kittyInner = kittySvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  const ghostty = (await icon(ICONS.ghostty)).toString('base64')
  const iconSize = 40
  const iconY = 73
  const [left, right] = COLS
  const named = (x, name) => `<text class="name" x="${x + iconSize + 10}" y="${iconY + 25}">${name}</text>`
  const icons = [
    `<svg x="${left.x + 2}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 0 240 240">${kittyInner}</svg>`,
    named(left.x + 2, 'kitty'),
    `<image x="${left.x + 132}" y="${iconY}" width="${iconSize}" height="${iconSize}" href="data:image/png;base64,${ghostty}"/>`,
    named(left.x + 132, 'Ghostty'),
  ].join('')

  // The other terminals as chips, wrapped to the column; widths leave slack
  // for whichever system font draws them.
  const chipH = 22
  let cx = right.x
  let cy = 68
  const chips = OTHERS.map(name => {
    const w = Math.round([...name].length * 7.2 + 24)
    if (cx + w > right.x + TILE.w) {
      cx = right.x
      cy += chipH + 6
    }
    const chip = `<rect class="chip" x="${cx + 0.5}" y="${cy + 0.5}" width="${w}" height="${chipH}" rx="${chipH / 2}"/><text class="chipt" x="${r(cx + 0.5 + w / 2)}" y="${cy + 15.5}" text-anchor="middle">${escape(name)}</text>`
    cx += w + 8
    return chip
  }).join('')

  // The two tiles: the formula as kitty and Ghostty show it, and as the rest do.
  const tile = x => `<rect x="${x}" y="${TILE.y}" width="${TILE.w}" height="${TILE.h}" rx="${TILE.rx}" fill="${TERM.bg}"/>${[0, 1, 2].map(i => `<circle cx="${x + 13 + i * 11}" cy="${TILE.y + 11}" r="3.2" fill="${TERM.faint}"/>`).join('')}`
  const mid = TILE.y + 22 + (TILE.h - 22) / 2
  const math = placeMath(defs, core.typeset(tex, { display: true }), { cx: left.x + TILE.w / 2, cy: mid - 2, em: 25 })
  const lines = core.previewDisplay(tex, { maxColumns: 40 })
  const size = 13
  const adv = cellWidth(mono, size)
  const lineH = 17
  const width = Math.max(...lines.map(l => [...l].length)) * adv
  const ux = right.x + TILE.w / 2 - width / 2
  const firstBaseline = mid - (lines.length * lineH) / 2 + 12
  const unicode = lines.map((l, i) => `<g class="row row${i}">${monoText(defs, mono, l, ux, firstBaseline + i * lineH, size)}</g>`).join('')

  // Once, as the card appears: the image settles in, the text arrives row by row.
  const ONCE = 1.6
  css.push(
    `.land{animation:land ${ONCE}s linear both;transform-origin:${r(left.x + TILE.w / 2)}px ${r(mid)}px}`,
    keyframes('land', ONCE, [[0, 'opacity:0'], [0.35, 'opacity:0;transform:scale(1.06);filter:blur(3px);animation-timing-function:cubic-bezier(.2,.7,.3,1)'], [0.95, 'opacity:1;transform:none;filter:blur(0)'], [ONCE, 'opacity:1;transform:none;filter:blur(0)']]),
    ...lines.map((_, i) => `.row${i}{animation:row${i} ${ONCE}s linear both}${keyframes(`row${i}`, ONCE, [[0, 'opacity:0'], [0.4 + i * 0.09, 'opacity:0'], [0.4 + i * 0.09 + 0.12, 'opacity:1'], [ONCE, 'opacity:1']])}`),
  )

  const header = col => `<text class="head" x="${col.x + 2}" y="38">${col.title}</text><text class="sub" x="${col.x + 2}" y="57">${col.sub}</text>`
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<title>Terminals: typeset images in kitty and Ghostty, Unicode math in every other terminal</title>`,
    `<style>${themeCss()}`,
    `.head{fill:var(--fg);font:600 16px ${FONT_STACK}}.sub{fill:var(--muted);font:400 13px ${FONT_STACK}}`,
    `.name{fill:var(--fg);font:500 14px ${FONT_STACK}}`,
    `.chip{fill:none;stroke:var(--border)}.chipt{fill:var(--fg);font:500 12px ${FONT_STACK}}`,
    `${css.join('')}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>`,
    `<defs>${defs.out.join('')}</defs>`,
    `<rect class="surface" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12"/>`,
    `<line class="edge" x1="${DIVIDER}" y1="20" x2="${DIVIDER}" y2="${H - 20}"/>`,
    COLS.map(header).join(''),
    icons,
    chips,
    tile(left.x),
    tile(right.x),
    `<g class="land" fill="${TERM.fg}">${math.markup}</g>`,
    `<g fill="${TERM.fg}">${unicode}</g>`,
    `</svg>`,
  ].join('\n')
  return `${svg}\n`
}
