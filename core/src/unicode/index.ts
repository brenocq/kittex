import type { UnicodeOptions, UnicodeResult } from '../types.js'

// STUB, replaced by feat/unicode: the MathML's text content on one line.

/** Renders presentation MathML as terminal text; null when a construct isn't supported or it doesn't fit. */
export function toUnicode(mathml: string, options: UnicodeOptions): UnicodeResult | null {
  const text = mathml
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
  if (options.maxWidth !== undefined && text.length > options.maxWidth) return null
  return { lines: [text], baseline: 0, width: text.length }
}
