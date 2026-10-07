// The errors typeset reports, outside the lazily loaded MathJax side (engine.ts)
// so the rest of core can tell them apart without loading it.

/** A formula MathJax could not parse or lay out; `message` says why, for a "not rendered" note. */
export class TexError extends Error {
  override name = 'TexError'
}

/**
 * A formula MathJax reads, with characters the bundled font can't draw
 * (Cyrillic or CJK text, emoji): its Unicode form can still show it.
 */
export class GlyphError extends TexError {
  override name = 'GlyphError'
}
