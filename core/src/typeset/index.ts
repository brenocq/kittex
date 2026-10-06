import type { TypesetOptions, TypesetResult } from '../types.js'

// STUB, replaced by feat/typeset: a box the size of the source, filled by one rule.

/** A formula MathJax could not parse or lay out; `message` says why, for a "not rendered" note. */
export class TexError extends Error {
  override name = 'TexError'
}

/** Loads the font data and configures MathJax; resolves once `typeset` may be called. Called once per process. */
export function initTypeset(): Promise<void> {
  return Promise.resolve()
}

/** Typesets one formula; throws TexError when the TeX is invalid or exceeds the limits. */
export function typeset(tex: string, options: TypesetOptions): TypesetResult {
  if (tex.trim() === '') throw new TexError('empty formula')
  const width = Math.max(1, tex.length * 0.5)
  const height = options.display ? 1.2 : 0.75
  const depth = options.display ? 0.4 : 0.25
  return { width, height, depth, ops: [{ type: 'rect', x: 0, y: -height, width, height: height + depth }] }
}

/** The formula as presentation MathML (`<math>…</math>`), for the Unicode renderer. */
export function texToMathML(tex: string, options: Pick<TypesetOptions, 'display'>): string {
  const text = tex.replace(/[&<>]/g, c => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))
  return `<math display="${options.display ? 'block' : 'inline'}"><mtext>${text}</mtext></math>`
}
