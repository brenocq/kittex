// The build's splitter (scripts/split.mjs): one module cut into a chain of
// small parts must behave exactly as the module did, and literal tables as
// JSON must be the same values.
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, describe, expect, test } from 'vitest'
import { jsonTables, splitModule } from '../../scripts/split.mjs'

const dirs: string[] = []
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

/** Writes the split module to a fresh directory and imports its entry. */
async function load(code: string, budget: number): Promise<{ module: Record<string, unknown>; parts: number }> {
  const dir = mkdtempSync(join(tmpdir(), 'kittex-split-'))
  dirs.push(dir)
  const { entry, parts } = splitModule(code, { budget, dir: './parts' })
  mkdirSync(join(dir, 'parts'))
  for (const part of parts) writeFileSync(join(dir, 'parts', part.file), part.source)
  writeFileSync(join(dir, 'entry.js'), entry)
  return { module: await import(pathToFileURL(join(dir, 'entry.js')).href), parts: parts.length }
}

/** As the module itself would run: written out whole and imported. */
async function whole(code: string): Promise<Record<string, unknown>> {
  const dir = mkdtempSync(join(tmpdir(), 'kittex-whole-'))
  dirs.push(dir)
  writeFileSync(join(dir, 'whole.js'), code)
  return import(pathToFileURL(join(dir, 'whole.js')).href)
}

// A module with every kind of reference a bundle has: a function called before
// its declaration (hoisted), a class and a var read only later (through the
// late getters), a var written by an init function in another statement, a
// counter assigned from several statements, and the order side effects run in.
const SAMPLE = `
var log = [];
var counter = 0;
function bump() { counter += 1; return counter }
var early = useLater();
function useLater() { return helper() + 1 }
function helper() { return 41 }
var lateRead = () => typeof Later === 'function' ? new Later().value : 'none';
log.push('a:' + lateRead());
var shared;
var initShared = () => { shared = { n: bump() } };
${Array.from({ length: 30 }, (_, i) => `var filler${i} = [${Array.from({ length: 20 }, (_, k) => `${i}+${k}`).join(',')}].map(x => x + counter); log.push('f${i}');`).join('\n')}
var Later = class { constructor() { this.value = 'later:' + bump() } };
initShared();
log.push('b:' + lateRead());
var table = { b: 2, a: 1, 10: 'ten', 2: 'two', nested: [1, -2.5, 'x', null, true, { deep: 'y' }], more: [${Array.from({ length: 40 }, (_, k) => k).join(',')}] };
var short = { x: 1 };
export { log, early, shared, counter as count, table, Later, lateRead, short };
`

describe('splitModule', () => {
  test('the parts behave as the module: values, order of effects, live bindings', async () => {
    const expected = await whole(SAMPLE)
    const { module, parts } = await load(SAMPLE, 40)
    expect(parts).toBeGreaterThan(3)
    for (const key of ['log', 'early', 'shared', 'count', 'table', 'short']) expect(module[key]).toEqual(expected[key])
    expect((module.lateRead as () => string)()).toBe((expected.lateRead as () => string)())
    expect(Object.keys(module.table as object)).toEqual(Object.keys(expected.table as object))
  })

  test('each part imports only the part before it', () => {
    const { entry, parts } = splitModule(SAMPLE, { budget: 40, dir: '.' })
    expect(entry).toContain(`from'./${parts.at(-1)!.file}'`)
    for (const [i, part] of parts.entries()) {
      const sources = [...part.source.matchAll(/from'([^']+)'/g)].map(m => m[1])
      expect(new Set(sources)).toEqual(i === 0 ? new Set() : new Set([`./${parts[i - 1]!.file}`]))
    }
  })

  test('a name written in another statement is never cut away from its declaration', () => {
    const { parts } = splitModule(SAMPLE, { budget: 1 })
    const holder = parts.find(part => /\bvar shared\b/.test(part.source))!
    expect(holder.source).toMatch(/initShared\s*=/)
  })

  test('a bundle of the whole core splits and draws as the unsplit one does', async () => {
    const { bundleCore } = await import('../../scripts/bundle.mjs' as string)
    const code: string = await bundleCore({ legalComments: 'none' })
    const [split, one] = await Promise.all([load(code, 9000), whole(code)])
    expect(split.parts).toBeGreaterThan(10)
    const env = { cellWidth: 13, cellHeight: 26, maxColumns: 80, emPx: 25, ink: { r: 200, g: 200, b: 200 } }
    type Core = { typesetLoaded(): boolean; measureDisplay(tex: string, env: object): { rows: number }; renderDisplay(tex: string, env: object, rows: number): { png: Uint8Array }; previewInline(tex: string): string | null }
    const a = split.module as unknown as Core
    const b = one as unknown as Core
    expect(a.typesetLoaded()).toBe(false)
    for (const tex of [String.raw`\int_0^1 x^2\,dx`, String.raw`\begin{pmatrix} a & b \\ c & d \end{pmatrix}`, String.raw`\ce{H2O}`]) {
      const rows = a.measureDisplay(tex, env).rows
      expect(rows).toBe(b.measureDisplay(tex, env).rows)
      expect(a.renderDisplay(tex, env, rows).png).toEqual(b.renderDisplay(tex, env, rows).png)
      expect(a.previewInline(tex)).toBe(b.previewInline(tex))
    }
    expect(a.typesetLoaded()).toBe(true)
  }, 60_000)
})

describe('jsonTables', () => {
  const evaluate = (code: string) => new Function(`return (${code})`)() as unknown

  test('a literal table becomes JSON.parse of the same value, keys in the same order', () => {
    const literal = `{ b: [${Array.from({ length: 70 }, (_, k) => k - 3).join(',')}], a: 'é\\u2028\\'"', 7: true, 3: null, z: { y: -1.5e-7 } }`
    const out = jsonTables(`var t = ${literal};`)
    expect(out).toMatch(/^var t = JSON\.parse\('/)
    const rewritten = out.slice('var t = '.length, -1)
    expect(evaluate(rewritten)).toEqual(evaluate(literal))
    expect(Object.keys(evaluate(rewritten) as object)).toEqual(Object.keys(evaluate(literal) as object))
  })

  test('tables JSON cannot hold the same way stay as written', () => {
    // Flat, so no part of each is a table of its own.
    const items = Array.from({ length: 70 }, (_, k) => k).join(',')
    const keys = Array.from({ length: 40 }, (_, k) => `k${k}: ${k}`).join(',')
    for (const literal of [`{ __proto__: null, ${keys} }`, `[-0, ${items}]`, `[x, ${items}]`, `[${items}, ...rest]`, `{ [k]: 1, ${keys} }`, `{ f() {}, ${keys} }`, `[${items}, /re/]`]) {
      expect(jsonTables(`var t = ${literal};`)).toBe(`var t = ${literal};`)
    }
  })

  test('small literals are left alone', () => {
    expect(jsonTables('var t = [1, 2, 3];')).toBe('var t = [1, 2, 3];')
  })
})
