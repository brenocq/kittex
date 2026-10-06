// The bundled core must load in the mod sandbox: no dynamic import() anywhere
// (the engine refuses the module), no eval or new Function. Mirrors the static
// scan in scripts/sandbox-check.mjs, which also runs the bundle.
import { build } from 'esbuild'
import { expect, test } from 'vitest'

test('the core bundle has no forbidden constructs', async () => {
  const result = await build({
    entryPoints: ['core/src/index.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    mainFields: ['module', 'main'],
    conditions: ['import', 'default'],
    target: 'es2022',
    minify: true,
    logLevel: 'silent',
  })
  const code = result.outputFiles[0]!.text
  expect(code).not.toMatch(/\bimport\s*\(/)
  expect(code).not.toMatch(/\bnew Function\s*\(/)
  expect(code).not.toMatch(/(?<![.\w$])eval\s*\(/)
  expect(code).not.toMatch(/\bWebAssembly\b/)
  expect(code.length).toBeLessThan(6 * 1024 * 1024)
}, 30_000)
