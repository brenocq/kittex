// What kittex knows of the terminal it draws in (kittex.env, math.ts's
// KittexEnv): the pure reads register.tsx makes of it while it measures,
// stores and remembers the terminal.

import { cellOrFallback, mathEmPxFor } from './math.ts'
import type { KittexEnv } from './math.ts'
import type { CellSize } from './core.js'

/**
 * A measured cell as kittex.env holds it, with the math's em for it
 * (mathEmPxFor: from the text font's metrics once read, else the font's own
 * cell, the terminal's adjustments undone).
 */
export function cellEnv(cell: CellSize | undefined, env: Pick<KittexEnv, 'kind' | 'cellAdjust' | 'kittyAdjust' | 'font'>): Pick<KittexEnv, 'cellWidth' | 'cellHeight' | 'measured' | 'emPx'> {
  const { cellWidth, cellHeight, measured } = cellOrFallback(cell)
  return { cellWidth, cellHeight, measured, emPx: mathEmPxFor({ cellWidth, cellHeight }, env) }
}

/** The terminal a remembered env was measured in. */
export function terminalId(variables: Readonly<Record<string, string | undefined>>): string {
  return [variables.TERM, variables.TERM_PROGRAM, variables.TERM_PROGRAM_VERSION, variables.TMUX ? 'tmux' : ''].join('|')
}

export const sameColor = (a: KittexEnv['inkOver'], b: KittexEnv['inkOver']) => a === b || (!!a && !!b && a.r === b.r && a.g === b.g && a.b === b.b)
export const sameCurve = (a: KittexEnv['inkCurve'], b: KittexEnv['inkCurve']) => a === b || (!!a && !!b && a.gamma === b.gamma && a.contrast === b.contrast)
