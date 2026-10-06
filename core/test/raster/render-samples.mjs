// Dev-only: renders the fixtures with the raster module for checking by eye.
//
//   node core/test/raster/render-samples.mjs [--weight N] [--zoom N] [--cell WxH] [--em PX] [--only NAME] [--columns N] [--tag SUFFIX]
//
// Writes into core/test/raster/out/ (git-ignored), per fixture:
//   <name>.png        the PNG exactly as encodePng makes it (light ink, transparent)
//   <name>-dark.png   composited on a dark terminal background, with the cell grid
//                     faintly marked, and zoomed (nearest neighbour) when --zoom is given
// and prints timings and sizes.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { deflateSync } from 'node:zlib'
import { build } from 'esbuild'

const here = dirname(fileURLToPath(import.meta.url))
const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback)
const weight = arg('--weight') === undefined ? undefined : Number(arg('--weight'))
const zoom = Number(arg('--zoom', '1'))
const [cellWidth, cellHeight] = arg('--cell', '13x26').split('x').map(Number)
const emPx = Number(arg('--em', String((cellWidth / 0.6) * 1.15)))
const only = arg('--only')
const maxColumns = Number(arg('--columns', '100'))
const tag = arg('--tag', '')

const out = join(here, 'out')
mkdirSync(out, { recursive: true })
const bundled = join(out, 'raster.bundle.mjs')
await build({
  entryPoints: [join(here, '../../src/raster/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  outfile: bundled,
  logLevel: 'warning',
})
const raster = await import(pathToFileURL(bundled).href)

const ink = { r: 230, g: 230, b: 230 }
const bg = { r: 30, g: 30, b: 30 }

for (const file of readdirSync(join(here, 'fixtures')).sort()) {
  const { name, result } = JSON.parse(readFileSync(join(here, 'fixtures', file), 'utf8'))
  if (only && name !== only) continue
  const options = { emPx, cellWidth, cellHeight, maxColumns, align: 'center', weight }
  let t = performance.now()
  const r = raster.rasterize(result, options)
  const rasterMs = performance.now() - t
  t = performance.now()
  const png = raster.encodePng(r, ink)
  const encodeMs = performance.now() - t
  writeFileSync(join(out, `${name}${tag}.png`), png)
  writeFileSync(join(out, `${name}${tag}-dark.png`), preview(r, zoom))
  console.log(
    `${name}: ${r.columns}x${r.rows} cells, ${r.widthPx}x${r.heightPx} px, scale ${r.scale.toFixed(3)}, ` +
      `raster ${rasterMs.toFixed(2)} ms, encode ${encodeMs.toFixed(2)} ms, ${png.length} B`,
  )
}

function preview(r, z) {
  // Crop to the ink's columns (plus a margin) so the zoomed image stays readable.
  let minX = r.widthPx
  let maxX = 0
  for (let y = 0; y < r.heightPx; y++)
    for (let x = 0; x < r.widthPx; x++)
      if (r.alpha[y * r.widthPx + x]) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
      }
  const x0 = Math.max(0, Math.floor(minX - cellWidth))
  const x1 = Math.min(r.widthPx, Math.ceil(maxX + cellWidth))
  const w = (x1 - x0) * z
  const h = r.heightPx * z
  const raw = Buffer.alloc(h * (1 + w * 3))
  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / z)
    for (let x = 0; x < w; x++) {
      const sx = x0 + Math.floor(x / z)
      const a = r.alpha[sy * r.widthPx + sx] / 255
      // Composite in sRGB space, as terminals do.
      let base = bg
      if (sy % Math.round(cellHeight) === 0 || sy === r.baselinePx) base = sy === r.baselinePx ? { r: 60, g: 30, b: 30 } : { r: 40, g: 40, b: 50 }
      const p = y * (1 + w * 3) + 1 + x * 3
      raw[p] = Math.round(base.r + (ink.r - base.r) * a)
      raw[p + 1] = Math.round(base.g + (ink.g - base.g) * a)
      raw[p + 2] = Math.round(base.b + (ink.b - base.b) * a)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr.set([8, 2, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function chunk(type, data) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'latin1')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}

function crc32(bytes) {
  let c = 0xffffffff
  for (const b of bytes) {
    c ^= b
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return (c ^ 0xffffffff) >>> 0
}
