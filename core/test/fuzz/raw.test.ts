// Math left raw (the `block` and `inline` options' `raw`) as the engine draws
// it: its markdown reads `\{`, `\,`, `\\` and a line-ending backslash as
// escapes and drops the backslash, so kittex marks each such backslash
// (rawSource) and the drawing shows Claude's source exactly, streamed,
// landed and resumed, with nothing moving at landing.

import { describe, expect, test } from 'vitest'

import { init } from '../../../plugin/hooks/core.js'
import { runCase } from './drive.js'
import type { Shape } from './drive.js'
import { showDrawing } from './screen.js'

const BASE: Shape = { columns: 100, cellWidth: 13, cellHeight: 26, terminal: 'kitty', block: 'image', inline: 'image', links: 'osc8', flushSeed: 1, trimLanded: false }

const INLINE = 'Sets $\\{x\\}\\,y$ and $a\\\\b$ and $\\;z\\!$ here.'
const DISPLAY = '$$\\{x\\}\\,y$$'
const ALIGN = '\\begin{align}\na &= b \\\\\nc &= d\n\\end{align}'
/** One reply with both kinds; a blank line makes the engine read it as markdown, the way that eats escapes. */
const REPLY = `${INLINE}\n\n${DISPLAY}\n\nThen:\n\n${ALIGN}\n\nDone.\n`

/** What a drawing shows, a row a line, without the marks (zero width: no cell of their own). */
function shown(rows: string[]): string {
  return rows.map(row => row.replaceAll('\u034f', '').trimEnd()).join('\n')
}

describe('math left raw is drawn exactly as Claude wrote it', () => {
  const modes = [
    { block: 'raw', inline: 'image' },
    { block: 'raw', inline: 'unicode' },
    { block: 'image', inline: 'raw' },
    { block: 'unicode', inline: 'raw' },
  ] as const
  for (const math of modes) {
    test(`block ${math.block}, inline ${math.inline}`, async () => {
      await init()
      for (const flushSeed of [1, 2, 3]) {
        const result = runCase(REPLY, { ...BASE, ...math, flushSeed })
        expect(result.failures.map(failure => `${failure.check}/${failure.cause}: ${failure.detail}`)).toEqual([])
        const streamed = shown(showDrawing(result.streamDrawing!, 400))
        const landed = shown(showDrawing(result.liveDrawing!, 400))
        const resumed = shown(showDrawing(result.resumedDrawing!, 400))
        if (math.inline === 'raw') for (const drawing of [streamed, landed, resumed]) expect(drawing).toContain(INLINE)
        if (math.block === 'raw') {
          for (const drawing of [streamed, landed, resumed]) {
            expect(drawing).toContain(DISPLAY)
            expect(drawing).toContain(ALIGN)
          }
        }
      }
    })
  }
})

describe('display math left raw next to the same formula inline', () => {
  // Fuzz seed 2884: `$$…$$` with text after its closing line is inline math;
  // with display math raw it is still typeset as inline math, live and after
  // --resume alike, and the display formula of the same source stays raw.
  test('lands and resumes alike', async () => {
    await init()
    const tex = 'f(x; \\alpha, \\beta) = \\frac{\\Gamma(\\alpha + \\beta)}{\\Gamma(\\alpha)\\Gamma(\\beta)}'
    const md = `$$\n${tex}\n$$ and \n\n$$\n${tex}\n$$\n`
    const result = runCase(md, { ...BASE, columns: 80, terminal: 'ghostty', block: 'raw', inline: 'image' })
    expect(result.failures.map(failure => `${failure.check}/${failure.cause}: ${failure.detail}`)).toEqual([])
  })
})
