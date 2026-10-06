import type { LineScanner, LineScannerOptions, Segment } from '../types.js'

// STUB, replaced by feat/scan: finds `$$…$$` only, with no regard for code.

/** Splits a markdown reply into prose and math segments, in order, covering the whole text. */
export function scan(markdown: string): Segment[] {
  const segments: Segment[] = []
  let last = 0
  for (const match of markdown.matchAll(/\$\$([\s\S]+?)\$\$/g)) {
    const start = match.index
    const end = start + match[0].length
    if (start > last) segments.push({ kind: 'text', text: markdown.slice(last, start), start: last, end: start })
    segments.push({ kind: 'math', display: true, tex: match[1]!.trim(), raw: match[0], delimiter: '$$', start, end })
    last = end
  }
  if (last < markdown.length) segments.push({ kind: 'text', text: markdown.slice(last), start: last, end: markdown.length })
  return segments
}

/** A scanner for a reply that streams in as batches of whole lines. */
export function createLineScanner(_options: LineScannerOptions = {}): LineScanner {
  let offset = 0
  return {
    push(delta) {
      const start = offset
      offset += delta.length
      return delta === '' ? [] : [{ kind: 'text', text: delta, start, end: offset }]
    },
  }
}
