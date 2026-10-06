// kittex's own TeX macros, for what Claude writes that the bundled MathJax
// packages lack or get wrong in a terminal:
//
// - \slashed (Feynman slash, through the letter), \bm, \mathbbm and \mathds
//   (New Computer Modern has no bbm/dsfont glyphs: drawn as \mathbb),
//   \textsc, \varointclockwise;
// - a minimal siunitx: \SI{number}{units}, \si{units} and \num{number};
// - mhchem's reaction arrows from the font's own arrows (mhchem's come from a
//   font extension kittex doesn't carry);
// - \ref and \eqref, in math and in \text: each formula is typeset on its own,
//   so a label from another formula is unknown and MathJax would draw "(???)".
//   A reference draws the tag its label got in an earlier formula when there is
//   one, else the label's own name.
//
// They form the `kittex` package, checked before every other package's macros,
// and `kittex-text`, which adds the references to textmacros' text mode.
import { Configuration } from '@mathjax/src/js/input/tex/Configuration.js'
import { ParseUtil } from '@mathjax/src/js/input/tex/ParseUtil.js'
import type TexParser from '@mathjax/src/js/input/tex/TexParser.js'
import { CharacterMap, CommandMap } from '@mathjax/src/js/input/tex/TokenMap.js'
import ParseMethods from '@mathjax/src/js/input/tex/ParseMethods.js'
import BaseMethods from '@mathjax/src/js/input/tex/base/BaseMethods.js'
import { AmsMethods } from '@mathjax/src/js/input/tex/ams/AmsMethods.js'
import type { Token } from '@mathjax/src/js/input/tex/Token.js'
import { TEXCLASS } from '@mathjax/src/js/core/MmlTree/MmlNode.js'

/** Replaces the macro just read by `tex` (as a user \newcommand would expand). */
function expand(parser: TexParser, tex: string): void {
  parser.string = ParseUtil.addArgs(parser, tex, parser.string.slice(parser.i))
  parser.i = 0
  ParseUtil.checkMaxMacros(parser)
}

// ─── references ──────────────────────────────────────────────────────────────

interface Tags {
  allLabels: Record<string, { tag: string } | undefined>
  labels: Record<string, { tag: string } | undefined>
}

/** Tags that labels got in earlier formulas, oldest first. */
const remembered = new Map<string, string>()

/** Keeps the labels a formula defined (with their tags) for references in later formulas, the `limit` latest. */
export function rememberLabels(labels: Record<string, { tag: string } | undefined>, limit: number): void {
  for (const [label, info] of Object.entries(labels)) {
    if (!info || info.tag === '???') continue
    remembered.delete(label)
    remembered.set(label, info.tag)
  }
  while (remembered.size > limit) remembered.delete(remembered.keys().next().value!)
}

function reference(parser: TexParser, name: string, eqref: boolean): void {
  const label = parser.GetArgument(name).trim()
  const tags = parser.tags as unknown as Tags
  const known = tags.labels[label] ?? tags.allLabels[label]
  const tag = known && known.tag !== '???' ? known.tag : (remembered.get(label) ?? label)
  const text = eqref ? `(${tag})` : tag
  parser.Push(parser.create('node', 'mrow', ParseUtil.internalMath(parser, text)))
}

// ─── small caps ──────────────────────────────────────────────────────────────

/** \textsc{Map}: capitals as they are, small letters as smaller capitals. */
function smallCaps(parser: TexParser, name: string): void {
  const text = parser.GetArgument(name)
  if (/[\\{}$]/.test(text)) return expand(parser, `\\text{${text}}`)
  const runs = text.match(/[a-z]+|[^a-z]+/g) ?? []
  expand(parser, runs.map(run => (/^[a-z]/.test(run) ? `\\text{\\footnotesize ${run.toUpperCase()}}` : `\\text{${run}}`)).join(''))
}

// ─── siunitx, the common part ────────────────────────────────────────────────

const PREFIXES: Record<string, string> = {
  yocto: 'y', zepto: 'z', atto: 'a', femto: 'f', pico: 'p', nano: 'n', micro: '\\mu', milli: 'm', centi: 'c', deci: 'd',
  deca: 'da', deka: 'da', hecto: 'h', kilo: 'k', mega: 'M', giga: 'G', tera: 'T', peta: 'P', exa: 'E', zetta: 'Z', yotta: 'Y',
}

const UNITS: Record<string, string> = {
  meter: 'm', metre: 'm', second: 's', gram: 'g', kilogram: 'kg', ampere: 'A', kelvin: 'K', mole: 'mol', candela: 'cd',
  newton: 'N', joule: 'J', watt: 'W', pascal: 'Pa', hertz: 'Hz', coulomb: 'C', volt: 'V', ohm: '\\Omega', farad: 'F',
  tesla: 'T', henry: 'H', weber: 'Wb', siemens: 'S', becquerel: 'Bq', gray: 'Gy', sievert: 'Sv', lumen: 'lm', lux: 'lx',
  radian: 'rad', steradian: 'sr', katal: 'kat', liter: 'L', litre: 'L', minute: 'min', hour: 'h', day: 'd',
  electronvolt: 'eV', dalton: 'Da', bar: 'bar', angstrom: '\\unicode{x212B}', atomicmassunit: 'u', astronomicalunit: 'au',
  degreeCelsius: '{}^{\\circ}\\mathrm{C}', celsius: '{}^{\\circ}\\mathrm{C}', degree: '{}^{\\circ}', arcminute: '\\prime',
  arcsecond: '\\prime\\prime', percent: '\\%', decibel: 'dB', bel: 'B', neper: 'Np', byte: 'B', bit: 'bit',
}

/** A number as siunitx prints it: `e` exponents as × 10ⁿ, `+-` as ±. */
function siNumber(text: string): string {
  const m = /^\s*([+-]?[\d.,]*)\s*(?:\+-\s*([\d.,]+)\s*)?(?:[eE]\s*([+-]?\d+))?\s*$/.exec(text)
  if (!m || (m[1] === '' && m[3] === undefined)) return text
  let out = m[1]!.replace(/^-/, '-').replace(/,/g, '.')
  if (m[2] !== undefined) out = `(${out} \\pm ${m[2]})`
  if (m[3] !== undefined) out += `${out === '' ? '' : ' \\times '}10^{${m[3].replace(/^\+/, '')}}`
  return out
}

/** Units as siunitx's macros or literal text, upright, with powers. */
function siUnits(text: string): string {
  if (!text.includes('\\')) return `\\mathrm{${text.replace(/\./g, '\\,').replace(/~/g, '\\,')}}`
  const parts: { symbol: string; power: number }[] = []
  let prefix = ''
  let per = false
  let pre = 1
  const tokens = text.match(/\\[A-Za-z]+|\{[^{}]*\}|[^\\\s{}]+/g) ?? []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    const cs = token.startsWith('\\') ? token.slice(1) : undefined
    if (cs === undefined) {
      parts.push({ symbol: `\\mathrm{${token.replace(/^\{|\}$/g, '')}}`, power: per ? -1 : 1 })
      per = false
    } else if (cs in PREFIXES) {
      prefix += PREFIXES[cs]
    } else if (cs === 'per') {
      per = true
    } else if (cs === 'square') {
      pre = 2
    } else if (cs === 'cubic') {
      pre = 3
    } else if (cs === 'squared' || cs === 'cubed') {
      const last = parts.at(-1)
      if (last) last.power *= cs === 'squared' ? 2 : 3
    } else if (cs === 'tothe' || cs === 'raiseto') {
      const n = Number((tokens[++i] ?? '').replace(/^\{|\}$/g, ''))
      const last = parts.at(-1)
      if (cs === 'tothe' && last && Number.isFinite(n)) last.power *= n
      else if (Number.isFinite(n)) pre = n
    } else {
      const unit = UNITS[cs]
      let symbol: string
      if (unit === undefined) symbol = `\\${cs}`
      else if (/^(?:\{|\\%|\\prime)/.test(unit)) symbol = unit
      else symbol = `\\mathrm{${prefix}${unit}}`
      parts.push({ symbol, power: (per ? -1 : 1) * pre })
      prefix = ''
      per = false
      pre = 1
    }
  }
  return parts.map(part => (part.power === 1 ? part.symbol : `${part.symbol}^{${part.power}}`)).join('\\,')
}

function si(parser: TexParser, name: string, withNumber: boolean): void {
  parser.GetBrackets(name)
  const number = withNumber ? siNumber(parser.GetArgument(name)) : ''
  const units = siUnits(parser.GetArgument(name))
  expand(parser, withNumber ? `{${number}\\,${units}}` : `{${units}}`)
}

function num(parser: TexParser, name: string): void {
  parser.GetBrackets(name)
  expand(parser, `{${siNumber(parser.GetArgument(name))}}`)
}

// ─── mhchem's arrows ─────────────────────────────────────────────────────────

// mhchem draws its reaction arrows from a font extension kittex doesn't carry
// (private-use glyphs in a -mhchem variant); these are the font's own arrows.
const ARROW_CHARS: Record<string, string> = {
  mhchemlongleftarrow: '\u27f5',
  mhchemlongrightarrow: '\u27f6',
  mhchemlongleftrightarrow: '\u27f7',
  mhchemlongrightleftharpoons: '\u21cc',
  mhchemlongRightleftharpoons: '\u21cc',
  mhchemlongLeftrightharpoons: '\u21cb',
  mhchemlongleftrightarrows: '\u21c4',
  mhchemrightarrow: '\u2192',
  mhchemleftarrow: '\u2190',
  mhchemleftrightarrow: '\u2194',
}

function relation(parser: TexParser, mchar: Token): void {
  parser.Push(parser.create('token', 'mo', { stretchy: false, texClass: TEXCLASS.REL }, mchar.char))
}

const ARROW_MACROS: Record<string, unknown> = {
  mhchemxrightarrow: [AmsMethods.xArrow, 0x2192, 5, 10],
  mhchemxleftarrow: [AmsMethods.xArrow, 0x2190, 10, 5],
  mhchemxleftrightarrow: [AmsMethods.xArrow, 0x2194, 10, 10],
  mhchemxleftrightarrows: [AmsMethods.xArrow, 0x21c4, 10, 10],
  mhchemxrightleftharpoons: [AmsMethods.xArrow, 0x21cc, 10, 10],
  mhchemxRightleftharpoons: [AmsMethods.xArrow, 0x21cc, 10, 10],
  mhchemxLeftrightharpoons: [AmsMethods.xArrow, 0x21cb, 10, 10],
}

// ─── the package ─────────────────────────────────────────────────────────────

const MACROS: Record<string, unknown> = {
  ref: [reference, false],
  eqref: [reference, true],
  textsc: smallCaps,
  SI: [si, true],
  si: [si, false],
  num,
  // A slash through the letter (centernot's \centerOver), not \not's slash beside it.
  slashed: [BaseMethods.Macro, '\\centerOver{#1}{/}', 1],
  bm: [BaseMethods.Macro, '\\boldsymbol{#1}', 1],
  mathbbm: [BaseMethods.Macro, '\\mathbb{#1}', 1],
  mathbbmss: [BaseMethods.Macro, '\\mathbb{#1}', 1],
  mathds: [BaseMethods.Macro, '\\mathbb{#1}', 1],
  ...ARROW_MACROS,
}
new CommandMap('kittex-macros', MACROS as ConstructorParameters<typeof CommandMap>[1])

new CharacterMap('kittex-chars', ParseMethods.mathchar0mo as ConstructorParameters<typeof CharacterMap>[1], {
  varointclockwise: ['\u2232', { largeop: true, symmetric: true }],
  ointctrclockwise: ['\u2233', { largeop: true, symmetric: true }],
  varointctrclockwise: ['\u2233', { largeop: true, symmetric: true }],
  ointclockwise: ['\u2232', { largeop: true, symmetric: true }],
})

new CharacterMap('kittex-arrows', relation as ConstructorParameters<typeof CharacterMap>[1], ARROW_CHARS)

export const KittexConfiguration = Configuration.create('kittex', {
  handler: { macro: ['kittex-chars', 'kittex-arrows', 'kittex-macros'] },
  priority: 1,
})

// References in text mode (\text{see \eqref{x}}), which textmacros parses on its own.
new CommandMap('kittex-text-macros', { ref: [reference, false], eqref: [reference, true] } as unknown as ConstructorParameters<typeof CommandMap>[1])
// Priority 0: textmacros' own text-base, which also defines them, is 1.
Configuration.create('text-kittex', { parser: 'text', handler: { macro: ['kittex-text-macros'] }, priority: 0 })

/** Adds the text-mode references to textmacros (as textcomp adds its macros); listed after textmacros. */
export const KittexTextConfiguration = Configuration.create('kittex-text', {
  config(_config: unknown, jax: unknown) {
    type TextMacros = { parseOptions: { options: { textmacros: { packages: string[] } } }; textConf: { add(name: string, jax: unknown, options: object): void } }
    const textmacros = (jax as { parseOptions: { packageData: Map<string, TextMacros | undefined> } }).parseOptions.packageData.get('textmacros')
    if (!textmacros) return
    textmacros.parseOptions.options.textmacros.packages.push('text-kittex')
    textmacros.textConf.add('text-kittex', jax, {})
  },
})
