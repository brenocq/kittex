import { describe, expect, test } from 'vitest'
import { createLineScanner, scan } from '../../src/scan/index.ts'

const TIKZ = '```latex\n\\begin{tikzpicture}\n\\draw (0,0) -- (1,1);\n\\end{tikzpicture}\n```'

describe('diagrams', () => {
  test('off by default: a latex fence is code and a tikzpicture prose', () => {
    const segments = scan(`Look:\n\n${TIKZ}\n\n\\begin{tikzpicture}\n\\draw (0,0);\n\\end{tikzpicture}\n`)
    expect(segments.every(segment => segment.kind === 'text')).toBe(true)
  })

  test('a latex fence is a display segment marked diagram, as written', () => {
    const text = `Look:\n\n${TIKZ}\n\nDone.\n`
    const segments = scan(text, { diagrams: true })
    const diagram = segments.find(segment => segment.kind === 'math')
    expect(diagram).toMatchObject({ display: true, diagram: 'latex', delimiter: 'fence', raw: TIKZ, tex: '\\begin{tikzpicture}\n\\draw (0,0) -- (1,1);\n\\end{tikzpicture}' })
    expect(segments.map(segment => (segment.kind === 'text' ? segment.text : segment.raw)).join('')).toBe(text)
  })

  test('tex and tikz fences; other languages stay code', () => {
    expect(scan('```tex\n\\chemfig{A-B}\n```\n', { diagrams: true })[0]).toMatchObject({ diagram: 'latex' })
    expect(scan('```tikz\n\\draw (0,0) -- (1,0);\n```\n', { diagrams: true })[0]).toMatchObject({ diagram: 'tikz' })
    expect(scan('```python\nprint(1)\n```\n', { diagrams: true }).every(segment => segment.kind === 'text')).toBe(true)
  })

  test('bare picture environments, on several lines or one', () => {
    const [first] = scan('\\begin{tikzcd} A \\arrow[r] & B \\end{tikzcd}\n', { diagrams: true }).filter(segment => segment.kind === 'math')
    expect(first).toMatchObject({ diagram: 'env', delimiter: 'env', tex: '\\begin{tikzcd} A \\arrow[r] & B \\end{tikzcd}' })
    const [second] = scan('Text.\n\n\\begin{circuitikz}\n\\draw (0,0) to[R] (2,0);\n\\end{circuitikz}\n', { diagrams: true }).filter(segment => segment.kind === 'math')
    expect(second).toMatchObject({ diagram: 'env', tex: '\\begin{circuitikz}\n\\draw (0,0) to[R] (2,0);\n\\end{circuitikz}' })
  })

  test('math is still math: a ```math fence and $$ are no diagrams', () => {
    const segments = scan('```math\nx^2\n```\n\n$$\ny\n$$\n', { diagrams: true }).filter(segment => segment.kind === 'math')
    expect(segments).toHaveLength(2)
    expect(segments.every(segment => segment.kind === 'math' && segment.diagram === undefined)).toBe(true)
  })

  test('a fence inside another fence is code', () => {
    const segments = scan('````markdown\n```latex\n\\draw;\n```\n````\n', { diagrams: true })
    expect(segments.every(segment => segment.kind === 'text')).toBe(true)
  })

  test('streaming: held until it closes, then whole', () => {
    const scanner = createLineScanner({ diagrams: true })
    expect(scanner.push('Intro\n\n```latex\n', false).map(s => s.kind)).toEqual(['text'])
    expect(scanner.push('\\begin{tikzpicture}\n\\draw (0,0);\n', false)).toEqual([])
    const closed = scanner.push('\\end{tikzpicture}\n```\n', false)
    expect(closed.find(segment => segment.kind === 'math')).toMatchObject({ diagram: 'latex' })
  })

  test('streaming: a diagram longer than its hold limit passes as text', () => {
    const scanner = createLineScanner({ diagrams: true, maxDiagramLines: 3 })
    scanner.push('```latex\n\\begin{tikzpicture}\n', false)
    const released = scanner.push('\\draw (0,0);\n\\draw (1,1);\n\\draw (2,2);\n', false)
    expect(released.every(segment => segment.kind === 'text')).toBe(true)
    expect(scanner.push('\\end{tikzpicture}\n```\n', true).every(segment => segment.kind === 'text')).toBe(true)
  })

  test('an unclosed fence at the end is text', () => {
    const scanner = createLineScanner({ diagrams: true })
    scanner.push('```latex\n\\draw (0,0);\n', false)
    expect(scanner.push('', true).every(segment => segment.kind === 'text')).toBe(true)
  })
})
