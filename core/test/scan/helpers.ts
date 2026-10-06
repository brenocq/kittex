import { expect } from 'vitest'
import { createLineScanner, scan } from '../../src/scan/index.js'
import type { LineScannerOptions, Segment } from '../../src/types.js'

/** Checks the invariants every scan result must hold, and returns it. */
export function checked(input: string, segments: Segment[]): Segment[] {
  let pos = 0
  let prev: Segment | undefined
  for (const segment of segments) {
    expect(segment.start, 'segments are contiguous').toBe(pos)
    expect(segment.end).toBeGreaterThan(segment.start)
    const source = input.slice(segment.start, segment.end)
    if (segment.kind === 'text') {
      expect(segment.text).toBe(source)
      expect(prev?.kind, 'adjacent text is merged').not.toBe('text')
    } else {
      expect(segment.raw).toBe(source)
      expect(segment.tex).toBe(segment.tex.trim())
      expect(segment.tex).not.toBe('')
    }
    pos = segment.end
    prev = segment
  }
  expect(pos, 'segments cover the whole input').toBe(input.length)
  return segments
}

/** `scan` with its invariants checked. */
export function scanned(input: string): Segment[] {
  return checked(input, scan(input))
}

/** A compact view of a scan: text as strings, math as `[delimiter, display, tex]`. */
export function view(input: string): (string | [string, boolean, string])[] {
  return scanned(input).map(s => (s.kind === 'text' ? s.text : [s.delimiter, s.display, s.tex]))
}

/** The math segments of a scan. */
export function maths(input: string): Extract<Segment, { kind: 'math' }>[] {
  return scanned(input).filter(s => s.kind === 'math')
}

/** Merges adjacent text segments (what a consumer joining batches would see). */
export function merge(segments: readonly Segment[]): Segment[] {
  const out: Segment[] = []
  for (const segment of segments) {
    const last = out[out.length - 1]
    if (segment.kind === 'text' && last?.kind === 'text') {
      out[out.length - 1] = { kind: 'text', text: last.text + segment.text, start: last.start, end: segment.end }
    } else {
      out.push({ ...segment })
    }
  }
  return out
}

/** Pushes batches through a LineScanner (the last one final) and returns every batch's segments. */
export function stream(batches: readonly string[], options?: LineScannerOptions): Segment[][] {
  const scanner = createLineScanner(options)
  return batches.map((batch, i) => scanner.push(batch, i === batches.length - 1))
}

/** A small seeded PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Cuts a text into batches of whole lines at random line boundaries (the last may end mid-line). */
export function splitLines(text: string, random: () => number): string[] {
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? []
  const batches: string[] = []
  let current = ''
  for (const line of lines) {
    current += line
    if (random() < 0.4) {
      batches.push(current)
      current = ''
    }
  }
  batches.push(current)
  return batches
}
