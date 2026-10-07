// The display formulas the fuzz suite draws from: the generator's own and the
// stress corpus's 425 (every area Claude writes about).

import { DISPLAY } from '../../../plugin/tests/fuzz/formulas.ts'
import type { GenOptions } from '../../../plugin/tests/fuzz/generate.ts'
import { STRESS_CORPUS } from '../stress/corpus.js'

export const FUZZ_DISPLAY: readonly string[] = [...STRESS_CORPUS.map(formula => formula.tex), ...DISPLAY]

/** The generator options for a seed: real replies mostly, a wild one in four, a huge one in fifty, diagrams in one in three. */
export function optionsFor(seed: number): GenOptions {
  return { profile: seed % 4 === 3 ? 'wild' : 'real', huge: seed % 50 === 7, display: FUZZ_DISPLAY, ...(seed % 3 === 1 ? { diagrams: true } : {}) }
}
