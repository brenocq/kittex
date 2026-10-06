// Replays a recording (record.py) through a real terminal emulator
// (@xterm/headless) and returns every distinct screen it showed, cell by cell,
// with the kitty images those screens place.
//
//   import { loadRecording, emulate } from './emulate.mjs'
//   const rec = loadRecording('.github/assets/demo.rec.gz')
//   const { screens, images } = await emulate(rec, theme)
//
// xterm.js knows nothing of the kitty graphics protocol, so the APC commands
// (ESC _ G ... ESC \) are taken out of the stream first: chunked PNG
// transmissions (a=T, f=100, U=1 for Unicode placeholders) are joined and kept
// by image id. A placeholder cell (U+10EEEE) carries its image id in its
// foreground colour (24-bit, plus a third diacritic for the top byte) and its
// row and column in the image as diacritics; xterm keeps those combining marks
// with the cell, so each one resolves to a tile of its image. A screen is only
// taken outside synchronized updates (DEC 2026), as kitty only paints then.

import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import xtermHeadless from '@xterm/headless'
import unicode11 from '@xterm/addon-unicode11'

const { Terminal } = xtermHeadless
const { Unicode11Addon } = unicode11

export const PLACEHOLDER = 0x10eeee

// kitty's row/column diacritics (rowcolumn-diacritics.txt), in order: the
// n-th one stands for row or column n.
const DIACRITICS = [773, 781, 782, 784, 786, 829, 830, 831, 838, 842, 843, 844, 848, 849, 850, 855, 859, 867, 868, 869, 870, 871, 872, 873, 874, 875, 876, 877, 878, 879, 1155, 1156, 1157, 1158, 1159, 1426, 1427, 1428, 1429, 1431, 1432, 1433, 1436, 1437, 1438, 1439, 1440, 1441, 1448, 1449, 1451, 1452, 1455, 1476, 1552, 1553, 1554, 1555, 1556, 1557, 1558, 1559, 1623, 1624, 1625, 1626, 1627, 1629, 1630, 1750, 1751, 1752, 1753, 1754, 1755, 1756, 1759, 1760, 1761, 1762, 1764, 1767, 1768, 1771, 1772, 1840, 1842, 1843, 1845, 1846, 1850, 1853, 1855, 1856, 1857, 1859, 1861, 1863, 1865, 1866, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2035, 2070, 2071, 2072, 2073, 2075, 2076, 2077, 2078, 2079, 2080, 2081, 2082, 2083, 2085, 2086, 2087, 2089, 2090, 2091, 2092, 2093, 2385, 2387, 2388, 3970, 3971, 3974, 3975, 4957, 4958, 4959, 6109, 6458, 6679, 6773, 6774, 6775, 6776, 6777, 6778, 6779, 6780, 7019, 7021, 7022, 7023, 7024, 7025, 7026, 7027, 7376, 7377, 7378, 7386, 7387, 7392, 7616, 7617, 7619, 7620, 7621, 7622, 7623, 7624, 7625, 7627, 7628, 7633, 7634, 7635, 7636, 7637, 7638, 7639, 7640, 7641, 7642, 7643, 7644, 7645, 7646, 7647, 7648, 7649, 7650, 7651, 7652, 7653, 7654, 7678, 8400, 8401, 8404, 8405, 8406, 8407, 8411, 8412, 8417, 8423, 8425, 8432, 11503, 11504, 11505, 11744, 11745, 11746, 11747, 11748, 11749, 11750, 11751, 11752, 11753, 11754, 11755, 11756, 11757, 11758, 11759, 11760, 11761, 11762, 11763, 11764, 11765, 11766, 11767, 11768, 11769, 11770, 11771, 11772, 11773, 11774, 11775, 42607, 42620, 42621, 42736, 42737, 43232, 43233, 43234, 43235, 43236, 43237, 43238, 43239, 43240, 43241, 43242, 43243, 43244, 43245, 43246, 43247, 43248, 43249, 43696, 43698, 43699, 43703, 43704, 43710, 43711, 43713, 65056, 65057, 65058, 65059, 65060, 65061, 65062, 68111, 68152, 119173, 119174, 119175, 119176, 119177, 119210, 119211, 119212, 119213, 119362, 119363, 119364]
const DIACRITIC_INDEX = new Map(DIACRITICS.map((c, i) => [c, i]))

/** Reads a recording: { header, records } (records keep their t, o/i/mark). */
export function loadRecording(path) {
  const lines = gunzipSync(readFileSync(path)).toString('utf8').split('\n').filter(Boolean)
  const header = JSON.parse(lines[0])
  if (header.kind !== 'kittex-demo-recording') throw new Error(`${path}: not a demo recording`)
  return { header, records: lines.slice(1).map(l => JSON.parse(l)) }
}

/** The 256-colour palette: the theme's 16, then xterm's 6×6×6 cube and grey ramp. */
export function palette256(theme) {
  const out = theme.palette.slice(0, 16)
  const level = [0, 95, 135, 175, 215, 255]
  for (let r = 0; r < 6; r++) for (let g = 0; g < 6; g++) for (let b = 0; b < 6; b++) out.push(hex(level[r], level[g], level[b]))
  for (let i = 0; i < 24; i++) out.push(hex(8 + i * 10, 8 + i * 10, 8 + i * 10))
  return out
}

function hex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
}

function mix(a, b, f) {
  const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return hex(...x.map((v, i) => v * f + y[i] * (1 - f)))
}

/** Pulls kitty graphics commands out of decoded text, across chunk boundaries. */
class GraphicsFilter {
  constructor() {
    this.pending = ''
    this.images = new Map() // id -> { id, png (base64), cols, rows, t }
    this.partial = null
  }

  /** Text with every APC removed; graphics commands are applied at time t. */
  filter(text, t) {
    let s = this.pending + text
    this.pending = ''
    let out = ''
    for (;;) {
      const start = s.indexOf('\x1b_')
      if (start === -1) {
        // An ESC at the very end may open the next APC.
        if (s.endsWith('\x1b')) { this.pending = '\x1b'; s = s.slice(0, -1) }
        return out + s
      }
      const end = s.indexOf('\x1b\\', start + 2)
      if (end === -1) { this.pending = s.slice(start); return out + s.slice(0, start) }
      out += s.slice(0, start)
      this.command(s.slice(start + 2, end), t)
      s = s.slice(end + 2)
    }
  }

  command(body, t) {
    if (!body.startsWith('G')) return
    const semi = body.indexOf(';')
    const control = semi === -1 ? body.slice(1) : body.slice(1, semi)
    const payload = semi === -1 ? '' : body.slice(semi + 1)
    const keys = Object.fromEntries(control.split(',').filter(kv => kv.includes('=')).map(kv => kv.split('=', 2)))
    const more = keys.m === '1'
    if (this.partial) {
      // A continuation chunk: only m (and q) are sent again.
      this.partial.data += payload
      if (!more) { this.finish(this.partial); this.partial = null }
      return
    }
    const action = keys.a ?? 't'
    if (action === 'T' || action === 't') {
      const image = { keys, data: payload, t }
      if (more) this.partial = image
      else this.finish(image)
    } else if (action === 'p' && keys.i) {
      const image = this.images.get(Number(keys.i))
      if (image) { image.cols = Number(keys.c ?? image.cols); image.rows = Number(keys.r ?? image.rows) }
    }
  }

  finish({ keys, data, t }) {
    if (keys.f !== '100') return // kittex sends PNG only
    const id = Number(keys.i)
    this.images.set(id, { id, png: data.replace(/[^A-Za-z0-9+/=]/g, ''), cols: Number(keys.c ?? 0), rows: Number(keys.r ?? 0), t })
  }
}

/**
 * Replays the recording; returns { screens, images, marks, title }. A screen is
 * { t, rows: [[cell...]], cursor: {x, y, visible}, title, key }, a cell
 * { ch, w, fg, bg, bold, italic, underline, strike, img?: {id, row, col} }
 * with colours resolved against the theme (inverse and dim applied).
 */
export async function emulate({ header, records }, theme) {
  const { cols, rows } = header
  const term = new Terminal({ cols, rows, scrollback: 0, allowProposedApi: true })
  term.loadAddon(new Unicode11Addon())
  term.unicode.activeVersion = '11'
  const pal = palette256(theme)
  const decoder = new TextDecoder('utf-8')
  const graphics = new GraphicsFilter()
  let title = ''
  term.onTitleChange(s => { title = s })
  let cursorVisible = true
  const write = s => new Promise(resolve => term.write(s, resolve))

  const screens = []
  const marks = {}
  let lastKey = ''

  const color = (mode, value, fallback) => {
    if (mode === 'rgb') return hex(value >> 16, (value >> 8) & 255, value & 255)
    if (mode === 'p') return pal[value] ?? fallback
    return fallback
  }

  const snapshot = t => {
    const buffer = term.buffer.active
    const out = []
    const cell = buffer.getNullCell()
    for (let y = 0; y < rows; y++) {
      const line = buffer.getLine(buffer.viewportY + y)
      const row = []
      let prev = null // the last placeholder cell, for diacritics left out
      for (let x = 0; x < cols; x++) {
        line?.getCell(x, cell)
        const chars = line ? cell.getChars() : ''
        const w = line ? cell.getWidth() : 1
        const fgMode = cell.isFgRGB() ? 'rgb' : cell.isFgPalette() ? 'p' : 'd'
        const bgMode = cell.isBgRGB() ? 'rgb' : cell.isBgPalette() ? 'p' : 'd'
        let fg = color(fgMode, cell.getFgColor(), theme.foreground)
        let bg = color(bgMode, cell.getBgColor(), theme.background)
        const c = { ch: chars, w, bold: !!cell.isBold(), italic: !!cell.isItalic(), underline: !!cell.isUnderline(), strike: !!cell.isStrikethrough() }
        const cps = Array.from(chars, s => s.codePointAt(0))
        if (cps[0] === PLACEHOLDER) {
          const marks = cps.slice(1).map(cp => DIACRITIC_INDEX.get(cp))
          let id = fgMode === 'rgb' ? cell.getFgColor() : fgMode === 'p' ? cell.getFgColor() : 0
          let r = marks[0], col = marks[1]
          if (marks[2] !== undefined) id += marks[2] << 24
          // Diacritics left out continue the cell before (same image, next column).
          if (r === undefined && prev && prev.id === id) r = prev.row
          if (col === undefined && prev && prev.id === id && prev.row === r) col = prev.col + 1
          c.img = { id, row: r ?? 0, col: col ?? 0 }
          c.ch = ''
          prev = c.img
        } else {
          prev = null
          if (cell.isInverse()) [fg, bg] = [bg, fg]
          if (cell.isDim()) fg = mix(fg, bg, theme.dimOpacity)
          if (cell.isInvisible()) c.ch = ''
        }
        c.fg = fg
        c.bg = bg
        row.push(c)
      }
      out.push(row)
    }
    const cursor = { x: buffer.cursorX, y: buffer.cursorY, visible: cursorVisible }
    const key = JSON.stringify([out, cursor, title])
    if (key === lastKey) return
    lastKey = key
    screens.push({ t, rows: out, cursor, title, key })
  }

  for (const r of records) {
    if (r.mark) { marks[r.mark] ??= r.t; continue }
    if (!r.o) continue
    const text = graphics.filter(decoder.decode(Buffer.from(r.o, 'base64'), { stream: true }), r.t)
    // Paint only where kitty would: at the end of each synchronized update, and
    // at the end of a chunk written outside one.
    const pieces = text.split(/(?<=\x1b\[\?2026l)/)
    for (const piece of pieces) {
      for (const m of piece.matchAll(/\x1b\[\?([0-9;]+)([hl])/g)) {
        if (m[1].split(';').includes('25')) cursorVisible = m[2] === 'h'
      }
      await write(piece)
      if (!term.modes.synchronizedOutputMode) snapshot(r.t)
    }
  }
  term.dispose()
  return { screens, images: graphics.images, marks }
}

/** A screen as plain text (placeholders as ▒), for checks and logs. */
export function screenText(screen) {
  return screen.rows.map(row => row.map(c => (c.img ? '▒' : c.ch || ' ')).join('').trimEnd()).join('\n')
}
