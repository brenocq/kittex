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

test('aligned equations reserve exactly the rows of their image', async () => {
  await init()
  // A reply's Kalman filter equations: subscripts like k|k−1 have no Unicode form,
  // so their stacked preview is about twice the image's height; the compact form fits.
  const kalman = [
    String.raw`\begin{aligned} x_k &= F_k x_{k-1} + B_k u_k + w_k, & w_k &\sim \mathcal{N}(0, Q_k) \\ z_k &= H_k x_k + v_k, & v_k &\sim \mathcal{N}(0, R_k) \end{aligned}`,
    String.raw`\begin{aligned} \hat{x}_{k|k-1} &= F_k \hat{x}_{k-1|k-1} + B_k u_k \\ P_{k|k-1} &= F_k P_{k-1|k-1} F_k^\top + Q_k \end{aligned}`,
    String.raw`\begin{aligned} y_k &= z_k - H_k \hat{x}_{k|k-1} && \text{(innovation)} \\ S_k &= H_k P_{k|k-1} H_k^\top + R_k && \text{(innovation covariance)} \\ K_k &= P_{k|k-1} H_k^\top S_k^{-1} && \text{(Kalman gain)} \\ \hat{x}_{k|k} &= \hat{x}_{k|k-1} + K_k y_k \\ P_{k|k} &= (I - K_k H_k)\, P_{k|k-1} \end{aligned}`,
    String.raw`\begin{aligned} \nabla\cdot\mathbf{E} &= \frac{\rho}{\varepsilon_0} \\ \nabla\times\mathbf{B} &= \mu_0\mathbf{J} + \mu_0\varepsilon_0\frac{\partial\mathbf{E}}{\partial t} \end{aligned}`,
  ]
  for (const tex of kalman) expect({ tex, rows: measureDisplay(tex, env).rows }).toEqual({ tex, rows: renderDisplay(tex, env).rows })
})

test('only formulas with no compact or one-line form pad their image, by a row at most', async () => {
  await init()
  const padded = CORPUS.map(tex => ({ tex, extra: measureDisplay(tex, env).rows - renderDisplay(tex, env).rows })).filter(p => p.extra > 0)
  // Today the two brace examples (\underbrace, \overbrace): braces have no one-line form.
  expect(padded.length).toBeLessThanOrEqual(2)
  for (const p of padded) expect(p.extra).toBeLessThanOrEqual(1)
})
