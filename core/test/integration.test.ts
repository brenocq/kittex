// The whole chain on the formulas Claude typically writes: typeset's MathML feeds
// the Unicode renderer, so a preview must exist for every formula the image path
// can draw, and must fit in the rows that image reserves.
import { expect, test } from 'vitest'
import { emPxForCell, GlyphError, init, measureDisplay, previewDisplay, previewInline, renderDisplay, TexError, typeset } from '../src/index.js'
import { STRESS_CORPUS } from './stress/corpus.js'
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

/** The stress corpus formulas that were refused (unloaded packages, physics' overrides, Unicode minus). */
const ONCE_REFUSED = [
  'slashed', 'mathbbm', 'bm', 'mhchem', 'amscd', 'DeclarePairedDelimiter', 'textsc-texttt', 'siunitx',
  'empheq-unsupported', 'ointclockwise', 'unicode-minus', 'physics-div', 'physics-re-im', 'eqref', 'ref', 'cancel',
]

test('the stress formulas once refused draw, with a preview in their rows, at 98 and 40 columns', async () => {
  await init()
  const formulas = STRESS_CORPUS.filter(f => f.stress.some(s => ONCE_REFUSED.includes(s)))
  expect(formulas.length).toBeGreaterThanOrEqual(20)
  const failures: string[] = []
  for (const maxColumns of [98, 40]) {
    const at = { ...env, maxColumns }
    for (const { tex } of formulas) {
      try {
        const { rows } = measureDisplay(tex, at)
        if (renderDisplay(tex, at, rows).rows !== rows) failures.push(`${maxColumns}: image rows: ${tex}`)
        const preview = previewDisplay(tex, { maxColumns: maxColumns - 2 }, rows)
        if (preview?.length !== rows) failures.push(`${maxColumns}: no preview in ${rows} rows: ${tex}`)
      } catch (error) {
        failures.push(`${maxColumns}: ${(error as Error).message}: ${tex}`)
      }
    }
  }
  expect(failures).toEqual([])
})

test('a narrow window still gets previews: forms break into lines the way the image does', async () => {
  await init()
  const at = { ...env, maxColumns: 40 }
  const schwarzschild = String.raw`ds^2 = -\left(1 - \frac{2GM}{c^2 r}\right) c^2\,dt^2 + \left(1 - \frac{2GM}{c^2 r}\right)^{-1} dr^2 + r^2\left(d\theta^2 + \sin^2\theta\, d\phi^2\right)`
  const { rows } = measureDisplay(schwarzschild, at)
  expect(rows).toBe(renderDisplay(schwarzschild, at).rows)
  const preview = previewDisplay(schwarzschild, { maxColumns: 38 }, rows)!
  expect(preview).toHaveLength(rows)
  for (const line of preview) expect(line.length).toBeLessThanOrEqual(38)
})

test('characters the font lacks: the preview takes the rows, and there is no image', async () => {
  await init()
  for (const tex of [String.raw`\text{Привет}\ x = 1`, String.raw`v = \text{速度}`, String.raw`\text{🚀} = 1`]) {
    const { rows } = measureDisplay(tex, env)
    expect(previewDisplay(tex, { maxColumns: env.maxColumns - 2 }, rows), tex).toHaveLength(rows)
    expect(() => renderDisplay(tex, env, rows), tex).toThrow(GlyphError)
  }
})

test('a formula that would be drawn below half size is refused, not drawn unreadable', async () => {
  await init()
  const bomb = String.raw`\def\a{xx}\def\b{\a\a\a\a}\def\c{\b\b\b\b}\def\d{\c\c\c\c}\d\d`
  expect(() => measureDisplay(bomb, env)).toThrow(TexError)
  expect(() => measureDisplay(bomb, env)).toThrow(/legibly/)
  expect(() => renderDisplay(bomb, env)).toThrow(/legibly/)
})

test('a tag stays a cell clear of the right edge', async () => {
  await init()
  const tex = String.raw`a^2 + b^2 = c^2 \tag{1}`
  const image = renderDisplay(tex, env)
  const ihdr = new DataView(image.png.buffer, image.png.byteOffset + 16, 8)
  expect(ihdr.getUint32(0)).toBe(env.maxColumns * env.cellWidth)
  // Display math is laid out two cells narrower than the image and centred: the tag ends a cell from the edge.
  const lineWidth = ((env.maxColumns - 2) * env.cellWidth) / env.emPx
  const tagged = typeset(tex, { display: true, lineWidth })
  expect(tagged.width).toBeCloseTo(lineWidth, 3)
})

test('inline previews are tight by default, spaced on request', async () => {
  await init()
  expect(previewInline(String.raw`O(n \log n)`)).toBe('O(nlogn)')
  expect(previewInline(String.raw`O(n \log n)`, undefined, { tight: false })).toBe('O(n log n)')
  expect(previewInline(String.raw`\ce{H2O}`)).toBe('H₂O')
  expect(previewInline(String.raw`\dot{\theta}_i`)).toBe('θ′ᵢ')
})
