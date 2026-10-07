import type { RGB } from '../types.js'

/*
 * A TeX picture is drawn for paper: black ink on white. In a terminal its
 * default black is the terminal's text colour (the ink kittex draws math in),
 * its white is no paint at all (the terminal's background shows through), and
 * every other colour keeps its hue but moves, in lightness, along the axis
 * from paper to ink: on a light theme it stays where it was, on a dark
 * one a pale fill (blue!20 behind a label) becomes a dark tint of its hue, so
 * the label (now in light ink) stays legible on it, and a dark colour (navy,
 * a black-ish rule) becomes light instead of vanishing into the background.
 *
 * Saturated mid-tones, what a plot's series and TikZ's `red`, `blue`, `orange`
 * are, are kept nearly as they are, so the picture's colours stay its own;
 * then a line or a glyph too close to the background in lightness is moved
 * just far enough from it to be seen. Lightness is OKLab's, hue and chroma
 * are kept (chroma reduced where the colour would leave sRGB).
 */

/** What a picture's colour becomes: a colour to paint, or `erase` (white: the background shows through). */
export type Adapted = RGB | 'erase'

/** Where a picture is drawn: the ink its black becomes and the background behind it. */
export interface PaperColors {
  ink: RGB
  background: RGB
}

/** Channels within this of 0 count as TeX's black, within this of 255 as its white. */
const NEAR = 2

/** Chroma (OKLab) from which a mid-tone keeps its own lightness. */
const SATURATED = 0.12
/** The lightness band (OKLab) whose saturated colours are kept: around this, ± KEEP_BAND. */
const KEEP_CENTER = 0.55
const KEEP_BAND = 0.4
/** How far (OKLab lightness) a line or a glyph is kept from the background. */
const MIN_CONTRAST = 0.3

/** The background assumed when the terminal's isn't known: the opposite of its ink in lightness. */
export function assumedBackground(ink: RGB): RGB {
  return oklab(ink).l > 0.5 ? { r: 24, g: 24, b: 24 } : { r: 255, g: 255, b: 255 }
}

/**
 * A picture's colour as drawn in the terminal (see above). `line`: it paints
 * a stroke or a glyph, which must stand off the background; an area fill may
 * come as close to it as its paper colour came to white.
 */
export function adaptColor(color: RGB, paper: PaperColors, line: boolean): Adapted {
  if (color.r <= NEAR && color.g <= NEAR && color.b <= NEAR) return paper.ink
  if (color.r >= 255 - NEAR && color.g >= 255 - NEAR && color.b >= 255 - NEAR) return 'erase'
  const lab = oklab(color)
  const inkL = oklab(paper.ink).l
  const backL = oklab(paper.background).l
  let l = lab.l
  if (backL < 0.5) {
    // A dark background: paper's white is the background, its black the ink.
    const flipped = inkL + lab.l * (backL - inkL)
    const chroma = Math.hypot(lab.a, lab.b)
    const keep = clamp01(chroma / SATURATED) * clamp01(1 - Math.abs(lab.l - KEEP_CENTER) / KEEP_BAND)
    l = flipped + (lab.l - flipped) * keep
  }
  if (l === lab.l && !(line && Math.abs(l - backL) < MIN_CONTRAST)) return { ...color }
  if (line && Math.abs(l - backL) < MIN_CONTRAST) {
    const towards = inkL >= backL ? 1 : -1
    l = clamp01(backL + towards * MIN_CONTRAST)
  }
  return fromOklab(l, lab.a, lab.b)
}

/** Whether two colours are the same. */
export function sameRgb(a: RGB, b: RGB): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b
}

// ─── OKLab (Björn Ottosson, 2020) ────────────────────────────────────────────

interface Lab {
  l: number
  a: number
  b: number
}

const toLinear = (v: number) => {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const fromLinear = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255

function oklab(c: RGB): Lab {
  const r = toLinear(c.r), g = toLinear(c.g), b = toLinear(c.b)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

/** Linear sRGB of an OKLab colour (may fall outside 0 to 1). */
function linearOf(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

/** The sRGB colour of an OKLab one, its chroma reduced (hue and lightness kept) until it is inside sRGB. */
function fromOklab(L: number, a: number, b: number): RGB {
  const inside = (k: number) => linearOf(L, a * k, b * k).every(v => v >= -1e-6 && v <= 1 + 1e-6)
  let k = 1
  if (!inside(1)) {
    let lo = 0
    let hi = 1
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      if (inside(mid)) lo = mid
      else hi = mid
    }
    k = lo
  }
  const [r, g, bl] = linearOf(L, a * k, b * k)
  const byte = (v: number) => Math.min(255, Math.max(0, Math.round(fromLinear(Math.min(1, Math.max(0, v))))))
  return { r: byte(r), g: byte(g), b: byte(bl) }
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
