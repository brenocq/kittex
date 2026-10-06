// The fuzz suite: seeded random replies (generate.ts) streamed and landed in
// random terminals (drive.ts), every invariant checked on each. A few hundred
// cases by default; `KITTEX_FUZZ=50000` for a big run, split over processes
// with `KITTEX_FUZZ_SHARD=i/n`, its findings (counts per check and cause,
// shrunk repros) written to `KITTEX_FUZZ_OUT` when set.
//
// Known failures (regressions.test.ts, skipped until fixed) are counted but
// don't fail the default run; anything else does.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'

import { init } from '../../../plugin/hooks/core.js'
import { describeShape, runCase, shapeFor } from './drive.js'
import type { Failure, Shape } from './drive.js'
import { generateReply, writeReply } from '../../../plugin/tests/fuzz/generate.ts'
import { optionsFor } from './corpus.js'
import { knownCause } from './known.js'
import { showDrawing } from './screen.js'
import { shrink } from './shrink.js'

const COUNT = Number(process.env.KITTEX_FUZZ ?? 100)
const FIRST = Number(process.env.KITTEX_FUZZ_SEED ?? 1)
const [SHARD, SHARDS] = (process.env.KITTEX_FUZZ_SHARD ?? '0/1').split('/').map(Number) as [number, number]
const OUT = process.env.KITTEX_FUZZ_OUT
/** Repros shrunk per check and cause. */
const SHRINK = Number(process.env.KITTEX_FUZZ_SHRINK ?? (OUT ? 3 : 0))
/** Only these check/cause keys are shrunk (a regular expression; `unknown`: those no known finding explains), when set. */
const KEYS = process.env.KITTEX_FUZZ_KEYS === 'unknown' ? 'unknown' : process.env.KITTEX_FUZZ_KEYS ? new RegExp(process.env.KITTEX_FUZZ_KEYS) : undefined

interface Finding {
  key: string
  known?: string
  cases: number
  real: number
  examples: { seed: number; shape: Shape; failure: Failure }[]
}

test(`fuzz: ${COUNT} replies streamed and landed`, { timeout: 24 * 3600_000 }, async () => {
  await init()
  const findings = new Map<string, Finding>()
  const slowest: { seed: number; ms: number; what: string }[] = []
  let cases = 0
  let failed = 0
  const unknown: string[] = []
  for (let seed = FIRST; seed < FIRST + COUNT; seed++) {
    if (seed % SHARDS !== SHARD) continue
    const options = optionsFor(seed)
    const reply = generateReply(seed, options)
    const shape = shapeFor(seed)
    const result = runCase(writeReply(reply), shape, { partial: seed % 5 === 0 })
    cases++
    const { pushMs, landMs, resumeMs } = result.stats
    const ms = Math.max(pushMs, landMs, resumeMs)
    slowest.push({ seed, ms, what: `push ${pushMs.toFixed(0)} ms, land ${landMs.toFixed(0)} ms, resume ${resumeMs.toFixed(0)} ms` })
    slowest.sort((a, b) => b.ms - a.ms)
    slowest.length = Math.min(slowest.length, 10)
    if (result.failures.length > 0) failed++
    const seen = new Set<string>()
    for (const failure of result.failures) {
      const key = `${failure.check}/${failure.cause}`
      if (seen.has(key)) continue
      seen.add(key)
      const finding = findings.get(key) ?? { key, known: knownCause(failure)?.id, cases: 0, real: 0, examples: [] }
      finding.cases++
      if (options.profile === 'real') finding.real++
      if (finding.examples.length < Math.max(1, SHRINK)) finding.examples.push({ seed, shape, failure })
      findings.set(key, finding)
      if (!knownCause(failure)) unknown.push(`seed ${seed} (${describeShape(shape)}): ${key}: ${failure.detail.slice(0, 300)}`)
    }
  }
  if (OUT) writeReport(OUT, cases, failed, findings, slowest)
  if (!OUT) expect(unknown.slice(0, 5)).toEqual([])
})

function writeReport(dir: string, cases: number, failed: number, findings: Map<string, Finding>, slowest: { seed: number; ms: number; what: string }[]): void {
  mkdirSync(dir, { recursive: true })
  const sorted = [...findings.values()].sort((a, b) => b.real - a.real || b.cases - a.cases)
  const lines: string[] = [`${cases} cases, ${failed} with a failure (shard ${SHARD}/${SHARDS}, seeds ${FIRST}..${FIRST + COUNT - 1})`, '']
  for (const finding of sorted) lines.push(`${String(finding.cases).padStart(6)} cases (${String(finding.real).padStart(5)} real)  ${(finding.known ?? 'UNKNOWN').padEnd(8)} ${finding.key}`)
  lines.push('', 'slowest:', ...slowest.map(s => `  seed ${s.seed}: ${s.what}`), '')
  const json: unknown[] = []
  for (const finding of sorted) {
    lines.push(`=== ${finding.key}: ${finding.cases} cases (${finding.known ?? 'UNKNOWN'})`)
    const wanted = KEYS === undefined || (KEYS === 'unknown' ? finding.known === undefined : KEYS.test(finding.key))
    for (const example of finding.examples.slice(0, wanted ? SHRINK : 0)) {
      const reply = generateReply(example.seed, optionsFor(example.seed))
      const repro = shrink(reply, example.shape, example.failure)
      const result = runCase(repro.markdown, repro.shape)
      lines.push(`--- seed ${example.seed}, shrunk: ${describeShape(repro.shape)}`, repro.markdown, '--- failure', repro.failure.detail.slice(0, 600))
      if (result.streamDrawing && result.liveDrawing) {
        const a = showDrawing(result.streamDrawing, 40)
        const b = showDrawing(result.liveDrawing, 40)
        lines.push('--- streamed | landed')
        for (let i = 0; i < Math.max(a.length, b.length); i++) lines.push(`${(a[i] ?? '').padEnd(Math.min(100, repro.shape.columns))} | ${b[i] ?? ''}`)
      }
      json.push({ key: finding.key, seed: example.seed, shape: repro.shape, markdown: repro.markdown, detail: repro.failure.detail })
      lines.push('')
    }
  }
  writeFileSync(join(dir, `report-${SHARD}.txt`), lines.join('\n') + '\n')
  writeFileSync(join(dir, `findings-${SHARD}.json`), JSON.stringify({ cases, failed, findings: sorted.map(f => ({ key: f.key, known: f.known, cases: f.cases, real: f.real })), repros: json, slowest }, null, 1))
}
