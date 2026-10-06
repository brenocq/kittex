import type { UnicodeOptions, UnicodeResult } from '../types.js'
import { lines } from './box.js'
import { layoutMath } from './layout.js'
import { parseXml } from './xml.js'

/**
 * Renders presentation MathML (as MathJax 4 serializes it) as terminal text:
 * one row for inline math, several for display math (stacked fractions, limits,
 * tall delimiters, matrices). All or nothing: null when some element or
 * construct isn't supported, when inline math won't fit one row, or when the
 * result is wider than `maxWidth`, so the caller can show the source instead.
 */
export function toUnicode(mathml: string, options: UnicodeOptions): UnicodeResult | null {
  try {
    const box = layoutMath(parseXml(mathml), options.display, options.display && options.compact === true)
    if (!options.display && box.rows.length !== 1) return null
    if (options.maxWidth !== undefined && box.width > options.maxWidth) return null
    return { lines: lines(box), baseline: box.base, width: box.width }
  } catch {
    return null
  }
}
