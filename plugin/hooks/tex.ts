// The local LaTeX, for what MathJax can't draw: diagrams (TikZ, pgfplots,
// chemfig, circuitikz, tikz-cd) and math MathJax refuses (siunitx's \unit,
// \qty...). Nothing here takes `$`: register.tsx hands a TexHost of closures
// over session.start's `$` (a compile may outlive the dispatch that asked for
// it). core/src/diagram/tex.ts has the documents, the commands and the threat
// model; this file runs them, remembers what they gave, and caches it on disk.
//
// The order is the approved one: MathJax first for everything it draws (it
// takes milliseconds and lets the stream reserve exact rows), the local TeX
// only for what it refuses, and the source (or Unicode) when TeX fails too.

import {
  bwrapProbe,
  confined,
  diagramDocument,
  drawsPicture,
  dvisvgmArgv,
  FORMAT_SOURCE,
  formatArgv,
  formatName,
  isJobDir,
  latexArgv,
  JOB_NAME,
  jobDirTemplate,
  LATEX_ARGV,
  mathDocument,
  PREAMBLE_VERSION,
  SvgError,
  texEnvironment,
  texError,
  texFormula,
  texPicture,
  unsafeTex,
  XmlError,
} from './core.js'
import type { Confinement, Picture, TexDocument, TypesetResult } from './core.js'

/** What a compile gave: the picture, or why there is none. */
export type TexOutcome =
  | { ok: true; picture: Picture }
  /** `lasting`: TeX's own answer (an error in the source), kept on disk; else (a timeout, a missing command) it may be tried again. */
  | { ok: false; error: string; lasting: boolean }

/** What a TeX run needs from the host: commands, and text files (register.tsx backs these with `$`). */
export interface TexHost {
  run(argv: readonly string[], init: { cwd?: string; env?: Record<string, string>; timeoutMs: number }): Promise<{ exitCode: number; stdout: string; stderr: string; isStdoutTruncated: boolean }>
  write(path: string, text: string): Promise<void>
  read(path: string): Promise<string | undefined>
}

/** The host as found at session start: TeX's commands are there, and how jobs are confined. */
export interface TexSetup {
  /** `latex --version`'s and `dvisvgm --version`'s first lines: they key the disk cache with the preamble version. */
  versions: string
  confinement: Confinement
  /** The host's temporary directory (TMPDIR), where each job gets a directory of its own. */
  tmpdir: string | undefined
  /** Where outcomes are cached across sessions; absent: not cached on disk. */
  cacheDir?: string
  /** The dumped fragment format (prepareFormat), once it is there: its name and the directory holding `<name>.fmt`. */
  format?: { name: string; dir: string }
}

/** How long a probe command may run. */
const PROBE_MS = 3000
/** How long a stream holds a diagram (or a formula MathJax refused) for TeX before it shows the source. */
export const TEX_STREAM_BUDGET_MS = 3000
/** How long a compile in the background (a landed block's, after --resume) may run. */
export const TEX_BACKGROUND_MS = 20_000
/** Compiles that run at once (each is one TeX process, then one dvisvgm). */
const MAX_COMPILES = 3
/** Outcomes kept in memory. */
const BOOK_LIMIT = 256

/**
 * Finds TeX: `latex` and `dvisvgm` answering `--version`, and what jobs can
 * be confined with (prlimit; bubblewrap, by a trial run hiding `hide`).
 * Undefined when either command is missing.
 */
export async function probeTex(host: TexHost, options: { tmpdir: string | undefined; hide: readonly string[]; cacheDir?: string }): Promise<TexSetup | undefined> {
  const ok = (argv: readonly string[]) =>
    host.run(argv, { timeoutMs: PROBE_MS }).then(
      result => (result.exitCode === 0 ? result.stdout : undefined),
      () => undefined,
    )
  const [latex, dvisvgm, prlimit, bwrap] = await Promise.all([
    ok(['latex', '--version']),
    ok(['dvisvgm', '--version']),
    ok(['prlimit', '--version']),
    options.hide.length > 0 ? ok(bwrapProbe(options.hide)) : Promise.resolve(undefined),
  ])
  if (latex === undefined || dvisvgm === undefined) return undefined
  const first = (text: string) => text.split('\n', 1)[0]!.trim()
  return {
    versions: `${first(latex)}\n${first(dvisvgm)}`,
    confinement: { prlimit: prlimit !== undefined, ...(bwrap !== undefined ? { bwrap: { hide: options.hide } } : {}) },
    tmpdir: options.tmpdir,
    ...(options.cacheDir !== undefined ? { cacheDir: options.cacheDir } : {}),
  }
}

/**
 * The directories a confined job can't see: the home directory and the
 * temporary ones (a job's own directory is bound back inside). Only absolute
 * paths that are no system root.
 */
export function hiddenDirs(home: string | undefined, tmpdir: string | undefined): string[] {
  const dirs = [home, '/tmp', '/var/tmp', '/run', tmpdir]
  return [...new Set(dirs.filter((dir): dir is string => dir !== undefined && /^\/[^\s]+$/.test(dir) && !['/', '/usr', '/etc', '/opt', '/bin', '/lib', '/nix'].includes(dir.replace(/\/+$/, ''))).map(dir => dir.replace(/\/+$/, '')))]
}

/** The disk cache's directory: XDG_CACHE_HOME's (or ~/.cache's) kittex/tex. */
export function texCacheDir(env: { XDG_CACHE_HOME?: string | undefined; HOME?: string | undefined }): string | undefined {
  const base = env.XDG_CACHE_HOME?.startsWith('/') ? env.XDG_CACHE_HOME : env.HOME?.startsWith('/') ? `${env.HOME}/.cache` : undefined
  return base === undefined ? undefined : `${base.replace(/\/+$/, '')}/kittex/tex`
}

/**
 * Compiles documents and remembers what they gave, by document: the stream
 * and the landing read outcomes from here synchronously (`known`), and ask
 * for the ones missing (`compile`), MAX_COMPILES at a time, each document
 * compiled once however many ask.
 */
export class TexBook {
  private readonly outcomes = new Map<string, TexOutcome>()
  private readonly running = new Map<string, Promise<TexOutcome>>()
  /** Compiles running now, and those waiting for one of them to end (at most MAX_COMPILES at once). */
  private active = 0
  private readonly waiting: (() => void)[] = []
  /** Documents the stream showed as source (TeX too slow): left as source when their block lands, though TeX finished later. */
  private readonly shownAsSource = new Set<string>()
  /** Documents a landing asked for that TeX hasn't drawn yet (drawn later, then the blocks redraw). */
  private readonly asked = new Map<string, TexDocument>()
  host: TexHost | undefined
  setup: TexSetup | undefined

  /** A landing wants this document drawn (a reply read back after --resume): kept until takeAsked. Not one shown as source. */
  ask(document: TexDocument): void {
    if (this.ready && !this.shownAsSource.has(document.text) && this.asked.size < BOOK_LIMIT) this.asked.set(document.text, document)
  }

  /** The documents asked for since the last take. */
  takeAsked(): TexDocument[] {
    const documents = [...this.asked.values()]
    this.asked.clear()
    return documents
  }

  /** Forgets everything (a new host, tests). */
  reset(host?: TexHost, setup?: TexSetup): void {
    this.outcomes.clear()
    this.running.clear()
    this.shownAsSource.clear()
    this.asked.clear()
    this.active = 0
    this.waiting.length = 0
    this.host = host
    this.setup = setup
  }

  /** TeX is there to ask. */
  get ready(): boolean {
    return this.host !== undefined && this.setup !== undefined
  }

  /** What a document gave, if it was compiled (or read from the disk cache) in this process; a passing failure (a timeout) included. */
  known(document: TexDocument): TexOutcome | undefined {
    const outcome = this.outcomes.get(document.text)
    if (outcome) {
      this.outcomes.delete(document.text)
      this.outcomes.set(document.text, outcome)
    }
    return outcome
  }

  /** Records an outcome (tests, and what compile and load find). */
  remember(document: TexDocument, outcome: TexOutcome): void {
    this.outcomes.delete(document.text)
    this.outcomes.set(document.text, outcome)
    while (this.outcomes.size > BOOK_LIMIT) this.outcomes.delete(this.outcomes.keys().next().value!)
  }

  markShownAsSource(document: TexDocument): void {
    this.shownAsSource.add(document.text)
    if (this.shownAsSource.size > BOOK_LIMIT) this.shownAsSource.delete(this.shownAsSource.values().next().value!)
  }

  wasShownAsSource(document: TexDocument): boolean {
    return this.shownAsSource.has(document.text)
  }

  /** Reads a document's outcome from the disk cache into the book, when it is there. */
  async load(document: TexDocument): Promise<TexOutcome | undefined> {
    const known = this.known(document)
    if (known && (known.ok || known.lasting)) return known
    const host = this.host
    const setup = this.setup
    if (!host || !setup?.cacheDir) return undefined
    try {
      const text = await host.read(`${setup.cacheDir}/${await cacheKey(document, setup)}.json`)
      if (text === undefined) return undefined
      const stored = JSON.parse(text) as { ok?: unknown; svg?: unknown; error?: unknown }
      const outcome: TexOutcome | undefined =
        stored.ok === true && typeof stored.svg === 'string'
          ? { ok: true, picture: texPicture(stored.svg, document) }
          : stored.ok === false && typeof stored.error === 'string'
            ? { ok: false, error: stored.error, lasting: true }
            : undefined
      if (outcome) this.remember(document, outcome)
      return outcome
    } catch {
      return undefined
    }
  }

  /**
   * The document's outcome: known, cached on disk, or compiled now (after the
   * compiles before it), within `timeoutMs` of TeX's own time. A timeout is
   * an outcome that isn't kept (the next ask compiles again).
   */
  compile(document: TexDocument, timeoutMs: number): Promise<TexOutcome> {
    const known = this.known(document)
    if (known && (known.ok || known.lasting)) return Promise.resolve(known)
    const running = this.running.get(document.text)
    if (running) return running
    const job = (async (): Promise<TexOutcome> => {
      const cached = await this.load(document)
      if (cached) return cached
      const host = this.host
      const setup = this.setup
      if (!host || !setup) return { ok: false, error: 'no TeX', lasting: false }
      const deadline = Date.now() + timeoutMs
      if (this.active >= MAX_COMPILES) await new Promise<void>(resolve => this.waiting.push(resolve))
      this.active++
      const outcome = await compileOnce(host, setup, document, deadline, timeoutMs).catch((error: unknown): TexOutcome => ({ ok: false, error: String(error), lasting: false }))
      this.active--
      this.waiting.shift()?.()
      // A passing failure is remembered too (the stream reads it and shows the source), but compiled again when asked.
      this.remember(document, outcome)
      if ((outcome.ok || outcome.lasting) && setup.cacheDir) await store(host, setup, document, outcome)
      return outcome
    })()
    this.running.set(document.text, job)
    void job.finally(() => this.running.delete(document.text))
    return job
  }
}

/** How long dumping the format may take. */
const FORMAT_MS = 60_000

/**
 * Makes the fragment format available (setup.format): the one dumped
 * earlier into the cache directory, else dumped now from FORMAT_SOURCE (no
 * source of the model's in it), confined as every job is, and copied there.
 * Without a cache directory, or where mylatexformat is missing, there is no
 * format and fragments load their packages each time.
 */
export async function prepareFormat(host: TexHost, setup: TexSetup): Promise<void> {
  if (!setup.cacheDir) return
  const name = formatName(setup.versions)
  const dir = `${setup.cacheDir}/fmt`
  const path = `${dir}/${name}.fmt`
  const run = (argv: readonly string[], init: { cwd?: string; env?: Record<string, string>; timeoutMs: number }) => host.run(argv, init).catch(() => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false }))
  if ((await run(['test', '-s', path], { timeoutMs: PROBE_MS })).exitCode === 0) {
    setup.format = { name, dir }
    return
  }
  const made = await run(['mktemp', '-d', jobDirTemplate(setup.tmpdir)], { timeoutMs: PROBE_MS })
  const job = made.stdout.trim()
  if (made.exitCode !== 0 || !isJobDir(job)) return
  try {
    await host.write(`${job}/${name}.tex`, FORMAT_SOURCE)
    const dumped = await run(confined(formatArgv(name), job, setup.confinement), { cwd: job, env: texEnvironment(job), timeoutMs: FORMAT_MS })
    if (dumped.exitCode !== 0) return
    if ((await run(['mkdir', '-p', '--', dir], { timeoutMs: PROBE_MS })).exitCode !== 0) return
    // Copied under a name of its own, then renamed: a session starting meanwhile never reads half a format.
    const part = `${path}.${job.slice(-10)}`
    if ((await run(['cp', '--', `${job}/${name}.fmt`, part], { timeoutMs: PROBE_MS })).exitCode !== 0) return
    if ((await run(['mv', '-f', '--', part, path], { timeoutMs: PROBE_MS })).exitCode !== 0) return
    setup.format = { name, dir }
  } finally {
    await run(['rm', '-rf', '--', job], { timeoutMs: PROBE_MS })
  }
}

/** The process's book: register.tsx gives it its host and setup, math.ts reads it. */
export const texBook = new TexBook()

async function cacheKey(document: TexDocument, setup: TexSetup): Promise<string> {
  const bytes = new TextEncoder().encode(`kittex-tex ${PREAMBLE_VERSION}\n${setup.versions}\n${document.baseline} ${document.fontSize}\n${document.text}`)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

async function store(host: TexHost, setup: TexSetup, document: TexDocument, outcome: TexOutcome): Promise<void> {
  try {
    const svg = outcomeSvgs.get(outcome)
    const body = outcome.ok ? (svg === undefined ? undefined : { ok: true, svg }) : { ok: false, error: outcome.error }
    if (body) await host.write(`${setup.cacheDir}/${await cacheKey(document, setup)}.json`, JSON.stringify(body))
  } catch {
    // not cached
  }
}

/** The SVG each compiled outcome was read from, for the disk cache. */
const outcomeSvgs = new WeakMap<TexOutcome, string>()

/**
 * One job: a fresh directory (mktemp), the document written into it, latex,
 * dvisvgm (SVG on stdout), the SVG read into a Picture, the directory removed.
 * latex and dvisvgm run with what is left until `deadline` (the time asked
 * for, `timeoutMs`, counts from the ask: a job waiting behind another uses it).
 */
async function compileOnce(host: TexHost, setup: TexSetup, document: TexDocument, deadline: number, timeoutMs: number): Promise<TexOutcome> {
  const left = () => deadline - Date.now()
  const late: TexOutcome = { ok: false, error: `TeX took longer than ${(timeoutMs / 1000).toFixed(0)} s`, lasting: false }
  if (left() < 50) return late
  const made = await host.run(['mktemp', '-d', jobDirTemplate(setup.tmpdir)], { timeoutMs: PROBE_MS })
  const dir = made.stdout.trim()
  if (made.exitCode !== 0 || !isJobDir(dir)) return { ok: false, error: 'no temporary directory for TeX', lasting: false }
  try {
    await host.write(`${dir}/${JOB_NAME}.tex`, document.text)
    const env = texEnvironment(dir)
    let latex
    // A fragment starts from the dumped format, read where the namespace hides the cache directory.
    const format = document.format ? setup.format : undefined
    try {
      latex = format
        ? await host.run(confined(latexArgv(format.name), dir, setup.confinement, [format.dir]), { cwd: dir, env: { ...env, TEXFORMATS: `${format.dir}:` }, timeoutMs: Math.max(1, left()) })
        : await host.run(confined(LATEX_ARGV, dir, setup.confinement), { cwd: dir, env, timeoutMs: Math.max(1, left()) })
      // A format TeX can't read (a stale or broken file): the same job without it.
      if (format && latex.exitCode !== 0 && /format file|\.fmt\b/i.test(latex.stdout)) {
        latex = await host.run(confined(LATEX_ARGV, dir, setup.confinement), { cwd: dir, env, timeoutMs: Math.max(1, left()) })
      }
    } catch {
      return late
    }
    if (latex.exitCode !== 0) {
      const log = `${latex.stdout}\n${(await host.read(`${dir}/${JOB_NAME}.log`)) ?? ''}`
      return { ok: false, error: texError(log, document.offset), lasting: true }
    }
    let svg
    try {
      if (left() < 1) return late
      svg = await host.run(confined(dvisvgmArgv(dir), dir, setup.confinement), { cwd: dir, env, timeoutMs: Math.max(1, left()) })
    } catch {
      return late
    }
    if (svg.exitCode !== 0 || svg.isStdoutTruncated || !svg.stdout.includes('<svg')) {
      return { ok: false, error: svg.isStdoutTruncated ? 'the picture is too large' : firstLine(svg.stderr) || 'dvisvgm failed', lasting: true }
    }
    try {
      const outcome: TexOutcome = { ok: true, picture: texPicture(svg.stdout, document) }
      outcomeSvgs.set(outcome, svg.stdout)
      return outcome
    } catch (error) {
      if (error instanceof SvgError || error instanceof XmlError) return { ok: false, error: error.message, lasting: true }
      throw error
    }
  } finally {
    await host.run(['rm', '-rf', '--', dir], { timeoutMs: PROBE_MS }).catch(() => undefined)
  }
}

function firstLine(text: string): string {
  return (text.split('\n').find(line => line.trim() !== '') ?? '').replace(/^\s*(?:ERROR|WARNING):?\s*/i, '').trim().slice(0, 200)
}

// ─── Which segments go to TeX, as which document ─────────────────────────────

/** A diagram segment's kind (the scanner's `diagram` mark). */
export type DiagramKind = 'latex' | 'tikz' | 'env'

/** What becomes of a diagram: compiled as `document`, refused (`refused`: why), or no drawing at all (left as code). */
export type DiagramJob = { document: TexDocument; label: string } | { refused: string } | undefined

/**
 * The job of a diagram (a ```latex, ```tex or ```tikz fence's content, or a
 * bare environment): undefined for LaTeX that draws nothing (a formula or a
 * preamble shown as code stays code), refused for a source unsafeTex refuses.
 */
export function diagramJob(source: string, kind: DiagramKind): DiagramJob {
  const lang = kind === 'env' ? 'env' : kind
  if (!drawsPicture(source, lang)) return undefined
  const refused = unsafeTex(source)
  if (refused !== undefined) return { refused }
  return { document: diagramDocument(source, lang), label: diagramLabel(source) }
}

/** The document a formula MathJax refused compiles as, or undefined when its source is refused. */
export function mathJob(tex: string, display: boolean): TexDocument | undefined {
  return unsafeTex(tex) === undefined ? mathDocument(tex, display) : undefined
}

/** A word for what a diagram draws, shown in its placeholder while it waits to land. */
export function diagramLabel(source: string): string {
  if (/\\begin\{(?:axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis)\}/.test(source)) return 'plot'
  if (/\\begin\{circuitikz\}|\\ctikzset/.test(source)) return 'circuit'
  if (/\\begin\{tikzcd\}/.test(source)) return 'commutative diagram'
  if (/\\chemfig|\\schemestart/.test(source)) return 'molecule'
  if (/\\documentclass/.test(source)) return 'LaTeX document'
  return 'diagram'
}

const results = new WeakMap<Picture, TypesetResult>()

/** A formula TeX drew, as one ink's draw ops (texFormula), worked out once per picture. */
export function texResult(picture: Picture): TypesetResult {
  let result = results.get(picture)
  if (!result) {
    result = texFormula(picture)
    results.set(picture, result)
  }
  return result
}
