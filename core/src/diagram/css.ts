import type { RGB } from '../types.js'
import type { XmlElement } from './xml.js'

/*
 * The CSS an ordinary SVG carries: a `<style>` sheet's rules (Illustrator's
 * `.st0{fill:#fff}`, matplotlib's `*{stroke-linecap:butt}`) and the named
 * colors. Only simple selectors are read, a type, a class, an id or `*`, alone
 * or compounded (`path.st0`), comma lists of them included; a rule with any
 * other selector (a descendant, a pseudo-class, an attribute) and every
 * at-rule are skipped, so their properties fall back to the attributes.
 */

/** Rules one sheet may hold, at most; past them the rest are skipped. */
const MAX_RULES = 4000
/** Classes and ids one compound selector may join (`.a.b#c`); a longer one is skipped. */
const MAX_COMPOUND = 16

export interface CssRule {
  tag?: string
  id?: string
  classes: readonly string[]
  /** id × 10 000 + classes × 100 + type, as CSS ranks them. */
  specificity: number
  /** The rule's place in the sheets, for rules of equal specificity. */
  order: number
  /** Its declarations as a `style` attribute holds them. */
  declarations: string
}

/** The simple rules of a style sheet's text (see above). */
export function parseStylesheet(text: string, first = 0): CssRule[] {
  const css = text.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, ' ')
  const rules: CssRule[] = []
  let at = 0
  while (at < css.length && rules.length < MAX_RULES) {
    const open = css.indexOf('{', at)
    if (open < 0) break
    const prelude = css.slice(at, open).trim()
    // A statement at-rule (@import, @charset) before this block ends at its semicolon.
    const statement = prelude.lastIndexOf(';')
    const selectors = statement >= 0 ? prelude.slice(statement + 1).trim() : prelude
    const close = blockEnd(css, open)
    // A block at-rule (@media, @font-face) matches no simple selector, and the rules nested in it are passed over whole.
    const declarations = css.slice(open + 1, close).replace(/!\s*important/gi, '').trim()
    for (const selector of selectors.split(',')) {
      const rule = simpleRule(selector.trim(), declarations, first + rules.length)
      if (rule) rules.push(rule)
    }
    at = close + 1
  }
  return rules
}

/** Where the block opened at `open` closes (nested blocks counted), or the text's end. */
function blockEnd(css: string, open: number): number {
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return i
  }
  return css.length
}

const SIMPLE = /^(\*|[A-Za-z][-\w]*)?((?:[.#][-\w]+)*)$/

function simpleRule(selector: string, declarations: string, order: number): CssRule | undefined {
  const match = SIMPLE.exec(selector)
  if (!match || selector === '') return undefined
  const tag = match[1] === undefined || match[1] === '*' ? undefined : match[1]
  const parts = match[2]!.match(/[.#][-\w]+/g) ?? []
  const ids = parts.filter(part => part.startsWith('#')).map(part => part.slice(1))
  // Two ids match no element; a compound longer than MAX_COMPOUND is no writer's, and would be matched part by part.
  if (ids.length > 1 || parts.length > MAX_COMPOUND) return undefined
  const classes = parts.filter(part => part.startsWith('.')).map(part => part.slice(1))
  return {
    ...(tag !== undefined ? { tag } : {}),
    ...(ids[0] !== undefined ? { id: ids[0] } : {}),
    classes,
    specificity: ids.length * 10_000 + classes.length * 100 + (tag !== undefined ? 1 : 0),
    order,
    declarations,
  }
}

/** The rules each element matches, by what they key on: an element is matched against only the rules its id, classes and type can meet. */
export class RuleIndex {
  readonly #universal: CssRule[] = []
  readonly #byTag = new Map<string, CssRule[]>()
  readonly #byId = new Map<string, CssRule[]>()
  readonly #byClass = new Map<string, CssRule[]>()

  constructor(rules: readonly CssRule[]) {
    const add = (map: Map<string, CssRule[]>, key: string, rule: CssRule) => {
      const list = map.get(key)
      if (list) list.push(rule)
      else map.set(key, [rule])
    }
    for (const rule of rules) {
      if (rule.id !== undefined) add(this.#byId, rule.id, rule)
      else if (rule.classes[0] !== undefined) add(this.#byClass, rule.classes[0], rule)
      else if (rule.tag !== undefined) add(this.#byTag, rule.tag, rule)
      else this.#universal.push(rule)
    }
  }

  /** The declarations of every rule `el` matches, lowest specificity first (so the strongest come last and win). */
  declarationsFor(el: XmlElement): string {
    const classes = new Set((el.attrs.class ?? '').split(/\s+/).filter(Boolean))
    const candidates = [...this.#universal, ...(this.#byTag.get(el.name) ?? []), ...(el.attrs.id !== undefined ? (this.#byId.get(el.attrs.id) ?? []) : []), ...[...classes].flatMap(name => this.#byClass.get(name) ?? [])]
    const matched = [...new Set(candidates)].filter(rule => (rule.tag === undefined || rule.tag === el.name) && (rule.id === undefined || rule.id === el.attrs.id) && rule.classes.every(name => classes.has(name)))
    return matched
      .toSorted((a, b) => a.specificity - b.specificity || a.order - b.order)
      .map(rule => rule.declarations)
      .join(';')
  }
}

/** CSS's named colors (CSS Color 4), as `name:rrggbb` pairs. */
const NAMES =
  'aliceblue:f0f8ff antiquewhite:faebd7 aqua:00ffff aquamarine:7fffd4 azure:f0ffff beige:f5f5dc bisque:ffe4c4 black:000000 blanchedalmond:ffebcd blue:0000ff ' +
  'blueviolet:8a2be2 brown:a52a2a burlywood:deb887 cadetblue:5f9ea0 chartreuse:7fff00 chocolate:d2691e coral:ff7f50 cornflowerblue:6495ed cornsilk:fff8dc ' +
  'crimson:dc143c cyan:00ffff darkblue:00008b darkcyan:008b8b darkgoldenrod:b8860b darkgray:a9a9a9 darkgreen:006400 darkgrey:a9a9a9 darkkhaki:bdb76b ' +
  'darkmagenta:8b008b darkolivegreen:556b2f darkorange:ff8c00 darkorchid:9932cc darkred:8b0000 darksalmon:e9967a darkseagreen:8fbc8f darkslateblue:483d8b ' +
  'darkslategray:2f4f4f darkslategrey:2f4f4f darkturquoise:00ced1 darkviolet:9400d3 deeppink:ff1493 deepskyblue:00bfff dimgray:696969 dimgrey:696969 ' +
  'dodgerblue:1e90ff firebrick:b22222 floralwhite:fffaf0 forestgreen:228b22 fuchsia:ff00ff gainsboro:dcdcdc ghostwhite:f8f8ff gold:ffd700 goldenrod:daa520 ' +
  'gray:808080 green:008000 greenyellow:adff2f grey:808080 honeydew:f0fff0 hotpink:ff69b4 indianred:cd5c5c indigo:4b0082 ivory:fffff0 khaki:f0e68c ' +
  'lavender:e6e6fa lavenderblush:fff0f5 lawngreen:7cfc00 lemonchiffon:fffacd lightblue:add8e6 lightcoral:f08080 lightcyan:e0ffff lightgoldenrodyellow:fafad2 ' +
  'lightgray:d3d3d3 lightgreen:90ee90 lightgrey:d3d3d3 lightpink:ffb6c1 lightsalmon:ffa07a lightseagreen:20b2aa lightskyblue:87cefa lightslategray:778899 ' +
  'lightslategrey:778899 lightsteelblue:b0c4de lightyellow:ffffe0 lime:00ff00 limegreen:32cd32 linen:faf0e6 magenta:ff00ff maroon:800000 ' +
  'mediumaquamarine:66cdaa mediumblue:0000cd mediumorchid:ba55d3 mediumpurple:9370db mediumseagreen:3cb371 mediumslateblue:7b68ee mediumspringgreen:00fa9a ' +
  'mediumturquoise:48d1cc mediumvioletred:c71585 midnightblue:191970 mintcream:f5fffa mistyrose:ffe4e1 moccasin:ffe4b5 navajowhite:ffdead navy:000080 ' +
  'oldlace:fdf5e6 olive:808000 olivedrab:6b8e23 orange:ffa500 orangered:ff4500 orchid:da70d6 palegoldenrod:eee8aa palegreen:98fb98 paleturquoise:afeeee ' +
  'palevioletred:db7093 papayawhip:ffefd5 peachpuff:ffdab9 peru:cd853f pink:ffc0cb plum:dda0dd powderblue:b0e0e6 purple:800080 rebeccapurple:663399 red:ff0000 ' +
  'rosybrown:bc8f8f royalblue:4169e1 saddlebrown:8b4513 salmon:fa8072 sandybrown:f4a460 seagreen:2e8b57 seashell:fff5ee sienna:a0522d silver:c0c0c0 ' +
  'skyblue:87ceeb slateblue:6a5acd slategray:708090 slategrey:708090 snow:fffafa springgreen:00ff7f steelblue:4682b4 tan:d2b48c teal:008080 thistle:d8bfd8 ' +
  'tomato:ff6347 turquoise:40e0d0 violet:ee82ee wheat:f5deb3 white:ffffff whitesmoke:f5f5f5 yellow:ffff00 yellowgreen:9acd32'

export const NAMED_COLORS: ReadonlyMap<string, RGB> = new Map(
  NAMES.split(' ').map(pair => {
    const [name, hex] = pair.split(':') as [string, string]
    return [name, { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) }]
  }),
)
