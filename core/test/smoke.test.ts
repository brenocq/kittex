import { expect, test } from 'vitest'
import { init, measureDisplay, previewDisplay, renderDisplay, scan, toBase64 } from '../src/index.js'

const env = { cellWidth: 13, cellHeight: 26, maxColumns: 80, emPx: 25, ink: { r: 230, g: 230, b: 230 } }

test('a display formula renders to a PNG that fills whole cells', async () => {
  await init()
  const image = renderDisplay(String.raw`e^{i\pi} + 1 = 0`, env)
  expect([...image.png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const view = new DataView(image.png.buffer, image.png.byteOffset)
  expect(view.getUint32(16)).toBe(image.columns * env.cellWidth)
  expect(view.getUint32(20)).toBe(image.rows * env.cellHeight)
  expect(measureDisplay(String.raw`e^{i\pi} + 1 = 0`, env)).toEqual({ columns: image.columns, rows: image.rows, scale: image.scale })
})

test('a new ink colour re-colours the cached image without changing its size', async () => {
  await init()
  const tex = String.raw`\frac{a}{b}`
  const light = renderDisplay(tex, env)
  const dark = renderDisplay(tex, { ...env, ink: { r: 20, g: 20, b: 20 } })
  expect({ columns: dark.columns, rows: dark.rows, length: dark.png.length }).toEqual({ columns: light.columns, rows: light.rows, length: light.png.length })
  expect(dark.png).not.toEqual(light.png)
  expect(renderDisplay(tex, env).png).toEqual(light.png)
})

test('a preview reserves exactly the rows asked for', async () => {
  await init()
  expect(previewDisplay('x', env, 3)).toHaveLength(3)
})

test('scan finds display math', () => {
  expect(scan('a $$x$$ b').map(s => s.kind)).toEqual(['text', 'math', 'text'])
})

test('base64 matches the standard encoding', () => {
  for (const s of ['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar']) {
    expect(toBase64(new TextEncoder().encode(s))).toBe(btoa(s))
  }
})
