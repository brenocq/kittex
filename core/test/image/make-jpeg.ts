/*
 * A test-side writer of flat (all-zero coefficient) progressive JPEGs with a
 * chosen scan list, the shape a scan bomb takes: each AC scan codes its whole
 * band as end-of-band runs of 16384 blocks (15 bits each), so a scan over a
 * 24-megapixel frame is a few dozen bytes while the decoder still visits every
 * block. DC scans cost one bit per block. Every Huffman table holds a single
 * one-bit code, so the entropy data is all zero bits and needs no stuffing.
 */

export interface JpegScan {
  /** Frame component indices (0-based) the scan covers. */
  components: readonly number[]
  ss: number
  se: number
  /** Successive approximation: 0 for a first scan, 1 for a refinement. */
  ah?: number
}

export interface JpegSpec {
  width: number
  height: number
  /** Components, each sampled 1×1. */
  components: number
  scans: readonly JpegScan[]
}

const segment = (marker: number, body: readonly number[]): number[] => [0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 255, ...body]

export function makeFlatProgressiveJpeg(spec: JpegSpec): Uint8Array {
  const { width, height, components } = spec
  const blocks = Math.ceil(width / 8) * Math.ceil(height / 8)
  const parts: Array<readonly number[] | Uint8Array> = [[0xff, 0xd8]]
  parts.push(segment(0xdb, [0, ...new Array<number>(64).fill(1)]))
  const sof = [8, height >> 8, height & 255, width >> 8, width & 255, components]
  for (let c = 0; c < components; c++) sof.push(c + 1, 0x11, 0)
  parts.push(segment(0xc2, sof))
  // DC table 0: one code '0' for category 0. AC table 0: one code '0' for EOBRUN with 14 extra bits.
  const table = (cls: number, symbol: number): number[] => [cls << 4, 1, ...new Array<number>(15).fill(0), symbol]
  parts.push(segment(0xc4, [...table(0, 0), ...table(1, 0xe0)]))
  for (const scan of spec.scans) {
    const ah = scan.ah ?? 0
    const sos = [scan.components.length]
    for (const c of scan.components) sos.push(c + 1, 0x00)
    sos.push(scan.ss, scan.se, ah << 4)
    parts.push(segment(0xda, sos))
    const covered = blocks * scan.components.length
    const bits = scan.ss === 0 ? covered : Math.ceil(covered / 16384) * 15
    parts.push(new Uint8Array(Math.ceil(bits / 8) + 2))
  }
  parts.push([0xff, 0xd9])
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}
