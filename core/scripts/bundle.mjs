// The one ES module of core, as the mod's build (build.mjs) and the sandbox
// check (sandbox-check.mjs) bundle it: minified, with MathJax behind a lazy
// require (typeset/load.ts), so the bundle evaluates MathJax's modules and the
// font tables when the first formula needs them.
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const LOAD = resolve(dirname(fileURLToPath(import.meta.url)), '../src/typeset/load.ts')

/** typeset/load.ts in the bundle: engine.ts and what only it imports, evaluated on the first call. */
const lazyEngine = {
  name: 'kittex-lazy-engine',
  setup(build) {
    build.onLoad({ filter: /[\\/]typeset[\\/]load\.ts$/ }, args => {
      if (resolve(args.path) !== LOAD) return undefined
      return {
        loader: 'ts',
        resolveDir: dirname(LOAD),
        contents: [
          'declare const require: (path: string) => unknown',
          "let engine: typeof import('./engine.js') | undefined",
          "export function loadEngine() { return (engine ??= require('./engine.js') as typeof import('./engine.js')) }",
          'export function engineLoaded(): boolean { return engine !== undefined }',
        ].join('\n'),
      }
    })
  },
}

/** Bundles core/src/index.ts; `options` adds to (or overrides) esbuild's. Returns the code. */
export async function bundleCore(options = {}) {
  const result = await build({
    entryPoints: ['core/src/index.ts'],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    mainFields: ['module', 'main'],
    conditions: ['import', 'default'],
    target: 'es2022',
    minify: true,
    legalComments: 'eof',
    logLevel: 'warning',
    write: false,
    outfile: 'core.js',
    plugins: [lazyEngine],
    ...options,
  })
  return result.outputFiles[0].text
}
