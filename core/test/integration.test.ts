// The whole chain on the formulas Claude typically writes: typeset's MathML feeds
// the Unicode renderer, so a preview must exist for every formula the image path
// can draw, and must fit in the rows that image reserves.
import { expect, test } from 'vitest'
import { emPxForCell, init, measureDisplay, previewDisplay, previewInline, renderDisplay } from '../src/index.js'
import { CORPUS } from './unicode/corpus.js'

const cell = { cellWidth: 13, cellHeight: 26 }
const env = { ...cell, maxColumns: 100, emPx: emPxForCell(cell), ink: { r: 235, g: 219, b: 178 } }

test('every corpus formula has a preview and an image that take the same rows', async () => {
  await init()
  const failures: string[] = []
  for (const tex of CORPUS) {
    try {
      const { rows } = measureDisplay(tex, env)
      const image = renderDisplay(tex, env, rows)
      const preview = previewDisplay(tex, env, rows)
      if (image.rows !== rows) failures.push(`image is ${image.rows} rows, not ${rows}: ${tex}`)
      if (!preview) failures.push(`no preview in ${rows} rows: ${tex}`)
      else if (preview.length !== rows) failures.push(`preview is ${preview.length} rows, not ${rows}: ${tex}`)
    } catch (error) {
      failures.push(`${(error as Error).message}: ${tex}`)
    }
  }
  expect(failures).toEqual([])
})

test('the image keeps its own height unless no preview fits it', async () => {
  await init()
  // A fraction is a 2-row image; its stacked preview needs 3, so the one-line form is used.
  const fraction = String.raw`F = G \frac{m_1 m_2}{r^2}`
  expect(measureDisplay(fraction, env).rows).toBe(renderDisplay(fraction, env).rows)
  expect(previewDisplay(fraction, env, measureDisplay(fraction, env).rows)?.filter(line => line.trim() !== '')).toHaveLength(1)
  // Aligned equations have no one-line form: the stacked preview's height is reserved.
  const aligned = String.raw`\begin{aligned} f(x) &= \frac{x^2 - 1}{x - 1} \\ &= x + 1 \end{aligned}`
  expect(measureDisplay(aligned, env).rows).toBeGreaterThanOrEqual(renderDisplay(aligned, env).rows)
})

test('inline previews exist for the formulas that fit one line', async () => {
  await init()
  const missing = CORPUS.filter(tex => previewInline(tex) === null)
  // Multi-row constructs (matrices, cases, aligned) have no one-line form.
  expect(missing.length).toBeLessThanOrEqual(CORPUS.length / 4)
})
