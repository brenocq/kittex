// Runs markdown files through the fuzz driver, for a look at one case or a
// live check: `KITTEX_FUZZ_CASES=a.md,b.md [KITTEX_FUZZ_SHAPE='{"columns":40}']
// [KITTEX_FUZZ_OUT=<file>] npx vitest run core/test/fuzz/cases.test.ts`. Each
// case's streamed text goes to `<case>.streamed` (research/fuzzcheck.py draws
// it on the real engine against the case landed through kittex), and the
// drawings (streamed, live landing, resumed landing) and failures to the
// output file. Skipped unless KITTEX_FUZZ_CASES is set.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { test } from 'vitest'

import { init } from '../../../plugin/hooks/core.js'
import { describeShape, runCase } from './drive.js'
import type { Shape } from './drive.js'
import { showDrawing } from './screen.js'

const CASES = (process.env.KITTEX_FUZZ_CASES ?? '').split(',').filter(Boolean)

test.skipIf(CASES.length === 0)('fuzz cases', { timeout: 600_000 }, async () => {
  await init()
  const shape: Shape = {
    columns: 80,
    cellWidth: 13,
    cellHeight: 26,
    terminal: 'kitty',
    inline: true,
    links: 'osc8',
    trimLanded: false,
    flushSeed: 1,
    ...(process.env.KITTEX_FUZZ_SHAPE ? (JSON.parse(process.env.KITTEX_FUZZ_SHAPE) as Partial<Shape>) : {}),
  }
  const out: string[] = []
  for (const path of CASES) {
    const markdown = readFileSync(path, 'utf8')
    const result = runCase(markdown, shape)
    writeFileSync(path + '.streamed', result.streamed?.shown ?? '')
    out.push(`##### ${path}: ${describeShape(shape)}`, markdown, '--- streamed text', JSON.stringify(result.streamed?.shown))
    const pieces = result.live?.pieces ?? []
    out.push('--- landed pieces', ...pieces.map(p => JSON.stringify({ kind: p.kind, gap: p.gap, text: p.kind === 'image' ? p.tex : p.text, inline: p.kind === 'prose' ? p.inline?.map(i => [i.tex, i.row, i.col, i.image.columns]) : undefined })))
    const [a, b, c] = [result.streamDrawing, result.liveDrawing, result.resumedDrawing].map(d => (d ? showDrawing(d, 400) : []))
    const w = Math.min(shape.columns, 100)
    out.push('--- streamed | landed | resumed')
    for (let i = 0; i < Math.max(a!.length, b!.length, c!.length); i++) out.push(`${String(i).padStart(3)} ${(a![i] ?? '').slice(0, w).padEnd(w)} | ${(b![i] ?? '').slice(0, w).padEnd(w)} | ${(c![i] ?? '').slice(0, w)}`)
    out.push('--- failures', ...result.failures.map(f => `${f.check}/${f.cause}: ${f.detail.slice(0, 300)}`), '')
  }
  writeFileSync(process.env.KITTEX_FUZZ_OUT ?? join(tmpdir(), 'kittex-fuzz-cases.txt'), out.join('\n') + '\n')
})
