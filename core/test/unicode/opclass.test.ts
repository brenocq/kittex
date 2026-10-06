import { OPTABLE, RANGES as MJ_RANGES } from '@mathjax/src/js/core/MmlTree/OperatorDictionary.js'
import { TEXCLASS } from '@mathjax/src/js/core/MmlTree/MmlNode.js'
import { expect, test } from 'vitest'
import { OPERATORS, RANGES } from '../../src/unicode/opclass.js'

const NAMES = Object.fromEntries(Object.entries(TEXCLASS).map(([name, n]) => [n, name]))

test("the operator table matches MathJax's dictionary", () => {
  for (const form of ['prefix', 'infix', 'postfix'] as const) {
    const expected: Record<string, string[]> = {}
    for (const [text, def] of Object.entries(OPTABLE[form]!)) {
      if ([...text].length === 1) (expected[NAMES[def[2]]!] ??= []).push(text)
    }
    const actual = Object.fromEntries(Object.entries(OPERATORS[form]).map(([cls, chars]) => [cls, [...chars!].sort()]))
    for (const chars of Object.values(expected)) chars.sort()
    expect(actual).toEqual(expected)
  }
  expect(RANGES.map(([a, b, cls]) => [a, b, cls])).toEqual(MJ_RANGES.map(([a, b, cls]) => [a, b, NAMES[cls]]))
})
