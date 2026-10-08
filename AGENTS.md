# kittex: working notes for agents

Read the design notes first: `docs/design.md` and `docs/engine-findings.md` in
the main checkout's `docs/`, which is kept locally and never committed (from a
worktree, read them from the main checkout). Then read `core/src/types.ts`, the
contracts between modules. Never add or commit anything under `docs/`.

## Layout and ownership

- `core/src/<module>/` and `core/test/<module>/` belong to one module each:
  `scan`, `typeset`, `raster`, `unicode`, `terminal`. Work only inside your own
  module's directories; a change anywhere else (types.ts, index.ts, scripts,
  package.json) must be small, additive and called out in your final report.
- `core/src/types.ts` is the shared contract. Don't change an existing
  signature; adding an optional field or a new export is fine.
- `core/src/index.ts` is the integration layer; each module's `index.ts` must
  keep exporting what `core/src/index.ts` imports from it.
- `plugin/` is the Claude Code mod. `plugin/hooks/register.tsx` is the only
  file that may take `$` (`$` cannot cross an import).

## The sandbox

Everything under `core/src/` runs inside Claude Code's mod sandbox:

- no Node APIs (`fs`, `process`, `Buffer`, `require`), no DOM;
- no `eval` or `new Function` over a string, no `WebAssembly`;
- no timers (`setTimeout`, `setInterval`), no dynamic `import()`;
- available: ECMAScript built-ins, `TextEncoder`/`TextDecoder`, `URL`,
  `AbortController`, `crypto.subtle`.

`npm run check:sandbox` bundles core and runs it in a Node `vm` context with
code generation off and none of Node's globals. It must pass before you
commit. Tests (`core/test/`) run under Node and may use Node APIs.

## Commands

```sh
npm ci                 # once per worktree
npm test               # vitest, core/test/**
npm run typecheck      # tsc: core/src (sandbox libs only) and core/test
npm run build          # bundle core -> plugin/hooks/core.js
npm run check:sandbox  # run the bundle under sandbox rules
claude plugin validate plugin
```

`plugin/hooks/core.js` and `plugin/hooks/core-parts/` are build outputs,
committed for installs from git. Claude Code refuses to read any plugin file
over 1 MiB, so the build splits the bundle and fails if a file passes 256 KiB (the plugin directory inspects nothing larger).
Only the integration on `main` commits them: before committing on a branch,
`git checkout plugin/hooks/core.js plugin/hooks/core-parts` if the build changed them.

## Heavy jobs

This machine has 31 GB of RAM and agents often run side by side; parallel fuzz
shards once filled it and the swap, and the OOM killer took down the desktop.

- Fuzz only through `npm run fuzz -- <cases> [findings dir]` (.github/scripts/fuzz.sh):
  8 shards at once, one fuzz run machine-wide at a time (a lock), and the
  whole run capped at 12 GB with no swap, so it dies alone if it grows.
  Never start fuzz shards as background jobs yourself.
- Run anything else heavy (batches of Claude Code sessions, headless Chrome
  renders) under a cap too:
  `systemd-run --user --scope -p MemoryMax=4G -p MemorySwapMax=0 <command>`,
  and no more than 3 at a time.

## Commits

Conventional commits with the module as scope (`feat(scan): ...`,
`fix(raster): ...`, `test(unicode): ...`), and a body of one to three short
paragraphs saying what changed and why. No bullet-list changelogs and no
`Co-Authored-By` or other agent signatures. Commit only on your own branch, in
your own worktree, and never push.
