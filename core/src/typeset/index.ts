// MathJax 4 inside the mod sandbox: TeX input, SVG output with the New Computer
// Modern font and the lite adaptor (no DOM), read back as DrawOps in em.
//
// MathJax itself lives in engine.ts, reached through load.ts: the mod's bundle
// evaluates it (MathJax's modules, the TeX packages, the font tables) only when
// the first formula is typeset or turned into MathML, so loading the mod costs
// none of it. Everything here is synchronous.
import type { TypesetOptions, TypesetResult } from '../types.js'
import { GlyphError } from './errors.js'
import { engineLoaded, loadEngine } from './load.js'

export { GlyphError, TexError } from './errors.js'

/** Unicode superscript and subscript characters, and what they are in TeX. */
const SUPERSCRIPT_TEX: Record<string, string> = Object.fromEntries(
  [...'⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ'].map((c, i) => [c, '0123456789+-=()ni'[i]!]),
)
const SUBSCRIPT_TEX: Record<string, string> = Object.fromEntries(
  [...'₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₕₖₗₘₙₚₛₜ'].map((c, i) => [c, '0123456789+-=()aeoxhklmnpst'[i]!]),
)
const SCRIPT_RUN = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]+|[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₕₖₗₘₙₚₛₜ]+/g

/** Unicode scripts written as TeX scripts: 10⁻³ as 10^{-3} (the font lacks some of those characters). */
function texScripts(tex: string): string {
  return tex.replace(SCRIPT_RUN, run => {
    const sup = SUPERSCRIPT_TEX[run[0]!] !== undefined
    const table = sup ? SUPERSCRIPT_TEX : SUBSCRIPT_TEX
    return `${sup ? '^' : '_'}{${[...run].map(c => table[c]).join('')}}`
  })
}

/**
 * Loads MathJax and the font data and configures them, once per process.
 * Optional: the first formula does it otherwise (typeset and texToMathML are
 * synchronous either way).
 */
export function initTypeset(): Promise<void> {
  try {
    loadEngine().prepare()
    return Promise.resolve()
  } catch (error) {
    return Promise.reject(error)
  }
}

/** Whether MathJax has been loaded (by initTypeset or a formula); a mod that drew only cached images never loads it. */
export function typesetLoaded(): boolean {
  return engineLoaded()
}

/**
 * Typesets one formula; throws TexError when the TeX is invalid or exceeds the
 * limits, GlyphError when it holds characters the font can't draw.
 */
export function typeset(tex: string, options: TypesetOptions): TypesetResult {
  const engine = loadEngine()
  try {
    return engine.typesetOnce(tex, options)
  } catch (error) {
    // Unicode scripts the font lacks (10⁻³) are drawn as TeX scripts.
    if (!(error instanceof GlyphError)) throw error
    const scripted = texScripts(tex)
    if (scripted === tex) throw error
    return engine.typesetOnce(scripted, options)
  }
}

/** The formula as presentation MathML (`<math>…</math>`), for the Unicode renderer. */
export function texToMathML(tex: string, options: Pick<TypesetOptions, 'display'>): string {
  return loadEngine().texToMathML(tex, options)
}
