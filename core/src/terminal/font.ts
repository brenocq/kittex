// The weight of the terminal's text font, from the names its configuration
// gives it (kitty's font_family, Ghostty's font-family, font-style and
// font-variation), so the math can be drawn at a matching stroke weight.

/** Weight words in font names and styles, most specific first, with their CSS weights. */
const WEIGHT_WORDS: readonly (readonly [RegExp, number])[] = [
  [/(?:extra|ultra)[-_\s]?light/i, 200],
  [/(?:semi|demi)[-_\s]?bold/i, 600],
  [/(?:extra|ultra)[-_\s]?bold/i, 800],
  [/thin|hairline/i, 100],
  [/black|heavy/i, 900],
  [/light/i, 300],
  [/retina/i, 450],
  [/medium/i, 500],
  [/bold/i, 700],
  [/regular|normal|book|roman/i, 400],
]

/**
 * The CSS weight (100 to 900) a font's names say, the first one that says
 * one winning: a variation axis (`wght=500`), a weight number, or a weight
 * word (`Medium`, `SemiBold`, `RobotoMono-Light`). Undefined when none does
 * (a bare family name: most likely the regular weight, but not known).
 */
export function fontWeightOf(names: readonly (string | undefined)[]): number | undefined {
  for (const name of names) {
    if (!name) continue
    const axis = /\bwght\s*[=:]\s*(\d{3})\b/i.exec(name)
    if (axis) return clampWeight(Number(axis[1]))
    if (/^\s*\d{3}\s*$/.test(name)) return clampWeight(Number(name))
    for (const [word, weight] of WEIGHT_WORDS) if (word.test(name)) return weight
  }
  return undefined
}

function clampWeight(weight: number): number {
  return Math.min(900, Math.max(100, weight))
}
