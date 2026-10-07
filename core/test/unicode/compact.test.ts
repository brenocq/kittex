import { expect, test } from 'vitest'
import { textWidth } from '../../src/unicode/box.js'
import { toUnicode } from '../../src/unicode/index.js'
import { mathml } from './mathml.js'

/** The terminal column where `mark` starts in `line`. */
const column = (line: string, mark: string) => textWidth(line.slice(0, line.indexOf(mark)))

const compact = (tex: string) => toUnicode(mathml(tex, true), { display: true, compact: true })?.lines.map(l => l.trimEnd())

test('aligned rows take one line each, with the relations lined up', () => {
  expect(
    compact(String.raw`\begin{aligned} \hat{x}_{k|k-1} &= F_k \hat{x}_{k-1|k-1} + B_k u_k \\ P_{k|k-1} &= F_k P_{k-1|k-1} F_k^\top + Q_k \end{aligned}`),
  ).toEqual(['x̂ₖ|ₖ₋₁ = Fₖx̂ₖ₋₁|ₖ₋₁ + Bₖuₖ', 'Pₖ|ₖ₋₁ = FₖPₖ₋₁|ₖ₋₁Fₖᵀ + Qₖ'])
})

test('fractions and limits are written on one line, with no blank lines between rows', () => {
  const lines = compact(String.raw`\begin{aligned} \nabla\cdot\mathbf{E} &= \frac{\rho}{\varepsilon_0} \\ \sum_{i=1}^n x_i &= \frac{\partial E}{\partial t} \end{aligned}`)!
  expect(lines).toHaveLength(2)
  expect(lines[0]).toContain('ρ/ε₀')
  expect(column(lines[1]!, '=')).toBe(column(lines[0]!, '='))
})

test('tagged columns stay aligned', () => {
  const lines = compact(String.raw`\begin{aligned} y_k &= z_k && \text{(a)} \\ S_k &= R_k + 1 && \text{(bb)} \end{aligned}`)!
  expect(lines).toHaveLength(2)
  expect(column(lines[0]!, '(a)')).toBe(column(lines[1]!, '(bb)'))
})

test('fences still stretch around a table', () => {
  expect(compact(String.raw`A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}`)).toEqual(['A = ⎛a  b⎞', '    ⎝c  d⎠'])
})

test('a formula with no table is one line', () => {
  expect(compact(String.raw`\int_0^1 \frac{dx}{1 + x^2} = \frac{\pi}{4}`)).toHaveLength(1)
})
