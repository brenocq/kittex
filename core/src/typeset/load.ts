// The MathJax side of typeset (engine.ts), as typeset reaches it. Here it is a
// static import, as tests and type checking see it; the mod's bundle replaces
// this module (scripts/bundle.mjs) with a lazy `require`, so MathJax and the
// font tables are evaluated when the first formula needs them, not when the
// mod loads.
import * as engine from './engine.js'

export type Engine = typeof engine

export function loadEngine(): Engine {
  return engine
}

/** Whether MathJax's modules have been evaluated (always, here; in the bundle, once a formula needed them). */
export function engineLoaded(): boolean {
  return true
}
