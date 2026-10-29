// One formula typeset for another plugin ($.kittex.formula, register.tsx):
// its image in a colour the caller names, as the terminal draws that colour,
// and its Unicode for where no image is shown. No `$`: the env and the
// terminal's colours are handed in.

import { measureInline, previewDisplay, previewInline } from './core.js'
import type { TerminalColors } from './core.js'
import { base64Of, displayImage, inlineImage, signatureOf } from './drawing.ts'
import { mathBaseline, renderEnvFor } from './math.ts'
import type { KittexEnv, MathOptions } from './math.ts'
import type { KittexFormula, KittexFormulaRequest } from '../types'

type RGB = KittexEnv['ink']

/** The longest formula typeset for another plugin; a longer one gets its Unicode alone. */
export const FORMULA_LIMIT = 2000

/** The ANSI palette index of each `ansi:<name>` (`gray` is bright black). */
const ANSI_INDEX: Readonly<Record<string, number>> = { black: 0, red: 1, green: 2, yellow: 3, blue: 4, magenta: 5, cyan: 6, white: 7, gray: 8, grey: 8 }

/** xterm's palette, for an `ansi:<name>` when the terminal's own wasn't read. */
const XTERM: readonly RGB[] = [
  [0, 0, 0], [205, 0, 0], [0, 205, 0], [205, 205, 0], [0, 0, 238], [205, 0, 205], [0, 205, 205], [229, 229, 229], [127, 127, 127],
].map(([r, g, b]) => ({ r: r!, g: g!, b: b! }))

/**
 * What the engine draws for a Text's colour name: its own fixed RGB, not the
 * terminal's palette (2.1.312's table, read off its drawn escape codes).
 */
const NAMED: Readonly<Record<string, string>> = {
  black: '#000000', red: '#e5484d', green: '#46a758', yellow: '#f5d90a', blue: '#3e63dd', magenta: '#d6409f', cyan: '#05a2c2', white: '#ffffff', gray: '#8b8d98', grey: '#8b8d98',
}

/**
 * The colour a caller names, as a Text with that colour draws it: `#rgb`,
 * `#rrggbb`, a colour name (the engine's RGB for it), or `ansi:<name>` (the
 * terminal palette's); undefined for none, or one it can't read (a theme's
 * name), so the formula takes the env's ink.
 */
export function colorOf(name: string | undefined, colors: TerminalColors | undefined): RGB | undefined {
  if (name === undefined) return undefined
  const named = NAMED[name.toLowerCase()] ?? name
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(named)?.[1]
  if (hex !== undefined) {
    const full = hex.length === 3 ? [...hex].map(c => c + c).join('') : hex
    const value = parseInt(full, 16)
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
  }
  const ansi = /^ansi:(.*)$/i.exec(name)?.[1]
  const index = ansi === undefined ? undefined : ANSI_INDEX[ansi.toLowerCase()]
  if (index === undefined) return undefined
  return colors?.palette?.[index] ?? XTERM[index]
}

/** The formula's Unicode: one line inline; the display's lines, or its one line where it has no other form. */
function unicodeOf(tex: string, display: boolean, maxColumns: number): string[] | null {
  if (display) {
    const lines = previewDisplay(tex, { maxColumns })
    if (lines && lines.length > 0) return lines.map(line => line.trimEnd())
  }
  const line = previewInline(tex, undefined, { tight: false })
  return line === null ? null : [line.trim()]
}

/**
 * `request` typeset in `env`: its Unicode (null where it has none), and its
 * image where `images` allows one (the terminal draws them and the kind's
 * option is `image`). An inline image is one row tall; it is left out where
 * the formula doesn't fit one row or `maxColumns`. Never throws: what fails
 * is in `error`, with the Unicode still given.
 */
export function formulaOf(request: KittexFormulaRequest, env: KittexEnv | null, colors: TerminalColors | undefined, math: MathOptions): KittexFormula {
  const tex = String(request.tex ?? '').trim()
  const display = request.display === true
  const maxColumns = Math.max(1, Math.min(255, Math.floor(request.maxColumns ?? env?.columns ?? 80)))
  const mode = display ? math.block : math.inline
  if (tex === '' || mode === 'raw') return { text: null }
  let text: string[] | null = null
  try {
    text = unicodeOf(tex, display, maxColumns)
  } catch (error) {
    return { text: null, error: String(error) }
  }
  if (mode !== 'image' || env === null || !env.images || tex.length > FORMULA_LIMIT) return { text }
  const ink = colorOf(request.color, colors) ?? env.ink
  try {
    // The caller's width exactly: no reply indent or prose cap (renderEnvFor's).
    const renderEnv = { ...renderEnvFor({ ...env, ink }), maxColumns }
    if (display) {
      const image = displayImage(tex, renderEnv)
      return { text, image: { png: base64Of(image.png), columns: image.columns, rows: image.rows, key: signatureOf(image.png) } }
    }
    const inlineEnv = { ...renderEnv, baselinePx: mathBaseline(env) }
    const box = measureInline(tex, inlineEnv)
    if (!box || box.columns > maxColumns) return { text }
    const image = inlineImage(tex, inlineEnv, box.columns)
    return { text, image: { png: base64Of(image.png), columns: image.columns, rows: image.rows, key: signatureOf(image.png) } }
  } catch (error) {
    return { text, error: error instanceof Error ? error.message : String(error) }
  }
}
