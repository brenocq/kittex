import { ImageError } from './bitmap.js'

/*
 * A JPEG's decode time follows its scans, not its size. jpeg-js visits every
 * block a scan covers, and in a progressive refinement scan every coefficient
 * of the scan's band in each block, even when the scan codes the whole band
 * as a few end-of-band runs in a few dozen bytes: 100 refinement scans over a
 * 6000×4000 RGB frame are a 155 KB file that runs for 18 s on the UI thread.
 * checkScans walks the file the way jpeg-js will and refuses it, before
 * jpeg-js runs, past MAX_JPEG_SCANS scans or past VISITS_PER_COEFFICIENT
 * coefficient visits for each coefficient the frame holds.
 *
 * Real encoders stay well inside both. libjpeg's progressive script is 10
 * scans (6 for gray) and codes each coefficient in at most three; mozjpeg's
 * scan search refines luma from Al 3, at most four, and a 13-scan script of
 * that shape spends two thirds of the budget. At the budget the worst file
 * (refinement scans over the whole band, about 2 ns per visit) takes 1.3 s
 * on a 24-megapixel RGB frame whose single DC scan takes 0.6 s, and about
 * twice the added time at the largest frame jpeg-js allocates (2M blocks).
 *
 * The walk has to see the scans jpeg-js sees, so it follows jpeg-js's parser
 * rather than the segment lengths alone: jpeg-js reads its tables, frame and
 * scan headers by their contents and ignores a scan's length, so a segment
 * whose length disagrees with its contents is refused, as is a scan with more
 * restart markers than restart intervals (jpeg-js resumes reading markers at
 * the spare one). jpeg-js's two recoveries (a marker whose 0xff was eaten,
 * and one malformed APP segment) are followed as it follows them.
 */

export const MAX_JPEG_SCANS = 100
export const VISITS_PER_COEFFICIENT = 5

interface Component {
  h: number
  v: number
  blocksPerLine: number
  blocksPerColumn: number
}

interface Frame {
  progressive: boolean
  mcusPerLine: number
  mcusPerColumn: number
  components: Map<number, Component>
  /** Coefficient visits the scans may make in all. */
  budget: number
}

const isRestart = (byte: number): boolean => byte >= 0xd0 && byte <= 0xd7

export function checkScans(bytes: Uint8Array): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const u16 = (at: number): number => (at + 2 <= bytes.length ? view.getUint16(at) : -1)
  let frame: Frame | undefined
  let resetInterval = 0
  let scans = 0
  let visits = 0
  let recovered = false
  let at = 2
  for (;;) {
    const marker = u16(at)
    if (marker === -1 || marker === 0xffd9) return // the end, or a read past it that jpeg-js refuses
    if (marker === 0xff00) {
      at += 2
      continue
    }
    if (marker === 0xffff) {
      at += bytes[at + 2] === 0xff ? 2 : 1 // a fill byte
      continue
    }
    const length = u16(at + 2)
    if (length === -1) throw new ImageError('JPEG is truncated')
    const end = at + 2 + length
    if ((marker >= 0xffe0 && marker <= 0xffef) || marker === 0xfffe) {
      at = at + 2 + Math.max(length, 2)
      continue
    }
    if (marker === 0xffdb || marker === 0xffc4) {
      if (tablesEnd(bytes, marker, at + 4, end) !== end) throw new ImageError('JPEG table segment length disagrees with its tables')
      at = end
      continue
    }
    if (marker === 0xffdd || marker === 0xffdc) {
      if (length !== 4) throw new ImageError('JPEG DRI or DNL segment has the wrong length')
      if (marker === 0xffdd) resetInterval = u16(at + 4)
      at = end
      continue
    }
    if (marker >= 0xffc0 && marker <= 0xffc2) {
      if (frame) throw new ImageError('JPEG has more than one frame')
      frame = parseFrame(bytes, at, marker === 0xffc2)
      at = end
      continue
    }
    if (marker === 0xffda) {
      if (!frame) throw new ImageError('JPEG scan comes before its frame')
      if (++scans > MAX_JPEG_SCANS) throw new ImageError(`JPEG has more than ${MAX_JPEG_SCANS} scans`)
      const scan = parseScan(bytes, at, frame, resetInterval)
      visits += scan.visits
      if (visits > frame.budget) throw new ImageError(`JPEG scans ask for more than ${VISITS_PER_COEFFICIENT} decoding passes over the frame`)
      at = skipEntropy(bytes, at + 2 + length, scan.intervals)
      continue
    }
    // jpeg-js's default branch: a marker whose 0xff an encoder ate, then one malformed APP0 or APP1.
    if (bytes[at - 1] === 0xff && bytes[at]! >= 0xc0 && bytes[at]! <= 0xfe) {
      at -= 1
      continue
    }
    if ((marker === 0x00e0 || marker === 0x00e1) && !recovered && bytes[end] === 0xff) {
      recovered = true
      at = end
      continue
    }
    throw new ImageError(`JPEG has an unknown marker 0x${marker.toString(16)}`)
  }
}

/** Where a DQT or DHT segment's tables end, read by their contents as jpeg-js reads them. */
function tablesEnd(bytes: Uint8Array, marker: number, start: number, end: number): number {
  let at = start
  while (at < end && at < bytes.length) {
    if (marker === 0xffdb) {
      const precision = bytes[at]! >> 4
      if (precision > 1) throw new ImageError('JPEG DQT has an invalid table spec')
      at += 1 + 64 * (precision + 1)
    } else {
      let count = 0
      for (let i = 1; i <= 16; i++) count += bytes[at + i] ?? 0
      at += 17 + count
    }
  }
  return at
}

function parseFrame(bytes: Uint8Array, at: number, progressive: boolean): Frame {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const count = bytes[at + 9] ?? 0
  if (at + 10 + 3 * count > bytes.length || view.getUint16(at + 2) !== 8 + 3 * count) throw new ImageError('JPEG frame header length disagrees with its components')
  const height = view.getUint16(at + 5)
  const width = view.getUint16(at + 7)
  // jpeg-js keys components by id, so a repeated id replaces the earlier one.
  const sampling = new Map<number, { h: number; v: number }>()
  for (let i = 0; i < count; i++) {
    const hv = bytes[at + 11 + 3 * i]!
    if (hv >> 4 === 0 || (hv & 15) === 0) throw new ImageError('JPEG component has a zero sampling factor')
    sampling.set(bytes[at + 10 + 3 * i]!, { h: hv >> 4, v: hv & 15 })
  }
  const values = [...sampling.values()]
  const maxH = Math.max(1, ...values.map((c) => c.h))
  const maxV = Math.max(1, ...values.map((c) => c.v))
  const mcusPerLine = Math.ceil(width / 8 / maxH)
  const mcusPerColumn = Math.ceil(height / 8 / maxV)
  const components = new Map<number, Component>()
  let blocks = 0
  for (const [id, { h, v }] of sampling) {
    components.set(id, {
      h,
      v,
      blocksPerLine: Math.ceil((Math.ceil(width / 8) * h) / maxH),
      blocksPerColumn: Math.ceil((Math.ceil(height / 8) * v) / maxV),
    })
    blocks += mcusPerLine * h * mcusPerColumn * v
  }
  return { progressive, mcusPerLine, mcusPerColumn, components, budget: VISITS_PER_COEFFICIENT * 64 * blocks }
}

/** The coefficient visits a scan makes and the restart intervals it holds, from its header. */
function parseScan(bytes: Uint8Array, at: number, frame: Frame, resetInterval: number): { visits: number; intervals: number } {
  const count = bytes[at + 4] ?? 0
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (at + 8 + 2 * count > bytes.length) throw new ImageError('JPEG scan header is truncated')
  if (view.getUint16(at + 2) !== 6 + 2 * count) throw new ImageError('JPEG scan header length disagrees with its components')
  const listed: Component[] = []
  for (let i = 0; i < count; i++) {
    const component = frame.components.get(bytes[at + 5 + 2 * i]!)
    if (!component) throw new ImageError('JPEG scan names a component its frame lacks')
    listed.push(component)
  }
  const ss = bytes[at + 5 + 2 * count]!
  const se = bytes[at + 6 + 2 * count]!
  // Blocks and MCUs as jpeg-js's decodeScan walks them.
  const single = listed.length === 1 ? listed[0] : undefined
  const mcus = single ? single.blocksPerLine * single.blocksPerColumn : frame.mcusPerLine * frame.mcusPerColumn
  const blocks = single ? mcus : mcus * listed.reduce((n, c) => n + c.h * c.v, 0)
  // A baseline block reads up to 64 coefficients, a progressive DC scan one, an AC scan its band.
  const perBlock = !frame.progressive ? 64 : ss === 0 ? 1 : Math.max(1, se - ss + 1)
  return { visits: blocks * perBlock, intervals: resetInterval > 0 ? Math.ceil(mcus / resetInterval) : 1 }
}

/**
 * The offset of the marker that ends a scan's entropy-coded data: the first
 * 0xff followed by neither a stuffed 0x00 nor a restart marker. A scan with
 * more restart markers than intervals is refused, since jpeg-js would go back
 * to reading markers after a spare one.
 */
function skipEntropy(bytes: Uint8Array, start: number, intervals: number): number {
  let restarts = 0
  for (let at = start; at + 1 < bytes.length; at++) {
    if (bytes[at] !== 0xff) continue
    const next = bytes[at + 1]!
    if (next === 0) continue
    if (!isRestart(next)) return at
    if (++restarts >= intervals) throw new ImageError('JPEG scan has more restart markers than restart intervals')
    at++
  }
  return bytes.length
}
