import { describe, expect, test } from 'vitest'
import { MAX_JPEG_SCANS, VISITS_PER_COEFFICIENT } from '../../src/image/jpeg-scans.js'
import { decodeImage, ImageError } from '../../src/image/index.js'
import { type JpegScan, makeFlatProgressiveJpeg } from './make-jpeg.js'

/*
 * Scan bombs: a frame that decodes quickly, made slow by repeating scans that
 * cost the file a few bytes each. The caps refuse them before jpeg-js runs,
 * so each refusal is timed: a refusal that took jpeg-js's seconds first would
 * still be a frozen interface.
 */

const dc = (components: readonly number[]): JpegScan => ({ components, ss: 0, se: 0 })
const refine = (component: number): JpegScan => ({ components: [component], ss: 1, se: 63, ah: 1 })

function refusalMs(bytes: Uint8Array, pattern: RegExp): number {
  const start = performance.now()
  let error: unknown
  try {
    decodeImage(bytes)
  } catch (caught) {
    error = caught
  }
  const ms = performance.now() - start
  expect(error).toBeInstanceOf(ImageError)
  expect(String(error)).toMatch(pattern)
  return ms
}

describe('decodeImage: JPEG scan caps', () => {
  test('a frame at the visit budget decodes, and one refinement scan more is refused', () => {
    // 16×16 gray: 4 blocks. A DC scan visits 4, each refinement scan 4 × 63.
    const budget = VISITS_PER_COEFFICIENT * 64 * 4
    const fitting = Math.floor((budget - 4) / (4 * 63))
    const scans = (n: number) => [dc([0]), ...Array.from({ length: n }, () => refine(0))]
    const bitmap = decodeImage(makeFlatProgressiveJpeg({ width: 16, height: 16, components: 1, scans: scans(fitting) }))
    expect(bitmap.width).toBe(16)
    expect(() => decodeImage(makeFlatProgressiveJpeg({ width: 16, height: 16, components: 1, scans: scans(fitting + 1) }))).toThrow(/decoding passes/)
  })

  test('a 24-megapixel frame with eight refinement scans is refused in well under 100 ms', () => {
    const bomb = makeFlatProgressiveJpeg({ width: 6000, height: 4000, components: 1, scans: [dc([0]), ...Array.from({ length: 8 }, () => refine(0))] })
    expect(bomb.length).toBeLessThan(50_000)
    expect(refusalMs(bomb, /decoding passes/)).toBeLessThan(100)
  })

  test('more scans than the scan cap are refused in well under 100 ms, even when each is cheap', () => {
    // One-coefficient bands over a 64×64 frame: inside the visit budget, past the scan count.
    const cheap: JpegScan = { components: [0], ss: 1, se: 1 }
    const scans = [dc([0]), ...Array.from({ length: MAX_JPEG_SCANS }, () => cheap)]
    expect(refusalMs(makeFlatProgressiveJpeg({ width: 64, height: 64, components: 1, scans }), /more than 100 scans/)).toBeLessThan(100)
    expect(decodeImage(makeFlatProgressiveJpeg({ width: 64, height: 64, components: 1, scans: scans.slice(0, MAX_JPEG_SCANS) })).width).toBe(64)
  })

  test('a scan header whose length disagrees with its components is refused', () => {
    const file = makeFlatProgressiveJpeg({ width: 16, height: 16, components: 1, scans: [dc([0])] })
    const sos = file.findIndex((b, i) => b === 0xff && file[i + 1] === 0xda)
    file[sos + 3]! += 40 // jpeg-js ignores a scan's length, so a walk by lengths would skip what jpeg-js reads
    expect(() => decodeImage(file)).toThrow(/scan header length/)
  })
})
