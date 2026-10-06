import { expect, test } from 'vitest'
import { charWidth, textWidth, toCells } from '../../src/unicode/box.js'
import { parseXml, tokenText } from '../../src/unicode/xml.js'

test('reads elements, attributes, text and references', () => {
  const root = parseXml(`<?xml version="1.0"?><math display='block'><mi data-x="a &amp; b">x</mi><mo>&#x2212;</mo><mtext>&lt;&#160;&gt;</mtext><mspace/></math>`)
  expect(root.name).toBe('math')
  expect(root.attrs.display).toBe('block')
  const [mi, mo, mtext, mspace] = root.children as Exclude<(typeof root.children)[number], string>[]
  expect(mi!.attrs['data-x']).toBe('a & b')
  expect(tokenText(mo!)).toBe('−')
  expect(tokenText(mtext!)).toBe('< >')
  expect(mspace!.children).toEqual([])
})

test('collapses whitespace in tokens as MathML does', () => {
  expect(tokenText(parseXml('<mi>\n   sin  \n</mi>'))).toBe('sin')
  expect(tokenText(parseXml('<mtext> a   b </mtext>'))).toBe('a b')
})

test('refuses malformed XML', () => {
  for (const bad of ['<math>', '<math></mrow>', '<math><mi>x</math>', '<math a=1/>', '<math>&foo;</math>', '<math>&amp</math>', '<a/><b/>', '<math x="1" x="2"/>']) {
    expect(() => parseXml(bad), bad).toThrow()
  }
})

test('cell widths: combining marks take none, wide characters two, the rest one', () => {
  expect(charWidth(0x0302)).toBe(0)
  expect(charWidth(0x2061)).toBe(0)
  expect(charWidth(0x65e5)).toBe(2)
  expect(charWidth(0x2211)).toBe(1)
  expect(charWidth(0x1d400)).toBe(1)
  expect(textWidth('x̂ + 日本')).toBe(8)
  expect(toCells('x̂日')).toEqual(['x̂', '日', ''])
})
