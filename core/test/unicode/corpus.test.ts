import { expect, test } from 'vitest'
import { textWidth } from '../../src/unicode/box.js'
import { toUnicode } from '../../src/unicode/index.js'
import { CORPUS } from './corpus.js'
import { mathml } from './mathml.js'

// The whole corpus in display and inline form, in one file meant to be read:
// review it by eye when the renderer changes (vitest -u rewrites it).
test('corpus renderings', async () => {
  const out: string[] = []
  for (const tex of CORPUS) {
    const display = toUnicode(mathml(tex, true), { display: true })
    const inline = toUnicode(mathml(tex, false), { display: false })
    for (const result of [display, inline]) {
      if (!result) continue
      for (const l of result.lines) expect(textWidth(l), tex).toBe(result.width)
      expect(result.baseline).toBeLessThan(result.lines.length)
    }
    expect(inline?.lines.length ?? 1, tex).toBe(1)
    expect(display, tex).not.toBeNull()
    out.push(`$$ ${tex}`)
    if (display) out.push(...display.lines.map((l, i) => `${i === display.baseline ? '>' : ' '} │${l}│`))
    else out.push('  (none)')
    out.push(`$ ${inline ? inline.lines[0] : '(none)'}`, '')
  }
  await expect(out.join('\n')).toMatchFileSnapshot('./__snapshots__/corpus.txt')
})
