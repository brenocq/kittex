// TeX's atom classes and the spacing between them (The TeXbook, chapter 18),
// with operator classes looked up the way MathJax does.

import { OPERATORS, RANGES } from './opclass.js'

export type TexClass = 'ORD' | 'OP' | 'BIN' | 'REL' | 'OPEN' | 'CLOSE' | 'PUNCT' | 'INNER' | 'NONE'
export type Form = 'prefix' | 'infix' | 'postfix'

const CLASS_NAMES = new Set<string>(['ORD', 'OP', 'BIN', 'REL', 'OPEN', 'CLOSE', 'PUNCT', 'INNER', 'NONE'])

export function parseClass(name: string | undefined): TexClass | undefined {
  return name !== undefined && CLASS_NAMES.has(name) ? (name as TexClass) : undefined
}

const TABLES = Object.fromEntries(
  (Object.keys(OPERATORS) as Form[]).map(form => {
    const map = new Map<string, TexClass>()
    for (const [cls, chars] of Object.entries(OPERATORS[form])) for (const ch of chars!) map.set(ch, cls as TexClass)
    return [form, map]
  }),
) as Record<Form, Map<string, TexClass>>

const ORDERS: Record<Form, readonly Form[]> = {
  prefix: ['prefix', 'infix', 'postfix'],
  infix: ['infix', 'prefix', 'postfix'],
  postfix: ['postfix', 'infix', 'prefix'],
}

/** The dictionary class of an operator's text in a form, as MathJax resolves it. */
export function operatorClass(text: string, form: Form): TexClass {
  for (const f of ORDERS[form]) {
    const cls = TABLES[f].get(text)
    if (cls) return cls
  }
  if (/^[a-zA-Z]{2,}$/.test(text)) return 'OP'
  const cp = text.codePointAt(0)
  if (cp === undefined) return 'ORD'
  for (const [start, end, cls] of RANGES) {
    if (cp <= end) return cp >= start ? cls : 'REL'
  }
  return 'REL'
}

/** Whether the dictionary lists the operator in a form (needed to tell fences apart). */
export function inForm(text: string, form: Form): boolean {
  return TABLES[form].has(text)
}

const ORDER: readonly TexClass[] = ['ORD', 'OP', 'BIN', 'REL', 'OPEN', 'CLOSE', 'PUNCT', 'INNER']

// 0 none, 1 thin, 2 medium, 3 thick; negative: also in scripts.
// prettier-ignore
const TEXSPACE = [
  [ 0, -1,  2,  3,  0,  0,  0,  1], // ORD
  [-1, -1,  0,  3,  0,  0,  0,  1], // OP
  [ 2,  2,  0,  0,  2,  0,  0,  2], // BIN
  [ 3,  3,  0,  0,  3,  0,  0,  3], // REL
  [ 0,  0,  0,  0,  0,  0,  0,  0], // OPEN
  [ 0, -1,  2,  3,  0,  0,  0,  1], // CLOSE
  [ 1,  1,  0,  1,  1,  1,  1,  1], // PUNCT
  [ 1, -1,  2,  3,  1,  0,  1,  1], // INNER
]

/** TeX's space between two atoms: 0 none, 1 thin, 2 medium, 3 thick. */
export function texSpace(left: TexClass, right: TexClass, script: boolean): number {
  const l = ORDER.indexOf(left)
  const r = ORDER.indexOf(right)
  if (l < 0 || r < 0) return 0
  const space = TEXSPACE[l]![r]!
  if (space < 0) return -space
  return script ? 0 : space
}
