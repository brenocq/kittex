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
  /** A file's bytes (the DVI, for its specials), or undefined when it can't be read; absent: never read. */
  readBytes?(path: string): Promise<Uint8Array | undefined>
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
  /**
   * False where dvisvgm has no `--libgs` (built with Ghostscript linked in or
   * left out, as Arch's, Debian's and Fedora's are): it refuses the option,
   * so jobs run without it. Absent: dvisvgm takes it (TeX Live's own build).
   */
  libgs?: false
  /**
   * True where dvisvgm has Ghostscript linked in and can't be told to ignore
   * PostScript (3.5 to 3.6.1 read `--no-specials=<list>` wrongly and ignore
   * nothing): it runs every PostScript special through Ghostscript, which it
   * starts with -dDELAYSAFER and never makes safe. kittex's own documents
   * carry none; a document that does is refused unless bubblewrap confines
   * the job.
   */
  postscript?: true
  /** With bubblewrap: what its namespace must still show (the TeX trees and programs it hides) and the PATH jobs run with. */
  sandbox?: Sandbox
}

/** What a job's namespace binds back read-only, and the PATH TeX is found by inside it. */
export interface Sandbox {
  /** Directories and files TeX needs that lie in a hidden directory (TeX Live installed into the home folder): bound read-only, nothing more. */
  binds: string[]
  /** PATH with latex's and dvisvgm's own directories first, so the namespace finds them where a hidden link would have; absent: the host's. */
  path?: string
}

/** Whether a job's sandbox runs TeX here, and if not, why (the first line its trial printed). */
export type SandboxProbe = { ok: true; sandbox: Sandbox } | { ok: false; error: string }

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
 * be confined with: prlimit, and bubblewrap where TeX runs inside its
 * namespace (probeSandbox: a real trial, not a bare `true`), else none.
 * Undefined when either command is missing.
 */
export async function probeTex(host: TexHost, options: { tmpdir: string | undefined; hide: readonly string[]; cacheDir?: string; path?: string }): Promise<TexSetup | undefined> {
  const ok = (argv: readonly string[]) =>
    host.run(argv, { timeoutMs: PROBE_MS }).then(
      result => (result.exitCode === 0 ? result.stdout : undefined),
      () => undefined,
    )
  const [latex, dvisvgm, help, extended, prlimit] = await Promise.all([
    ok(['latex', '--version']),
    ok(['dvisvgm', '--version']),
    ok(['dvisvgm', '--help']),
    ok(['dvisvgm', '-V1']),
    ok(['prlimit', '--version']),
  ])
  if (latex === undefined || dvisvgm === undefined) return undefined
  const sandbox = options.hide.length > 0 ? await probeSandbox(host, { hide: options.hide, tmpdir: options.tmpdir, path: options.path, prlimit: prlimit !== undefined }) : undefined
  const first = (text: string) => text.split('\n', 1)[0]!.trim()
  return {
    versions: `${first(latex)}\n${first(dvisvgm)}`,
    confinement: { prlimit: prlimit !== undefined, ...(sandbox?.ok ? { bwrap: { hide: options.hide } } : {}) },
    tmpdir: options.tmpdir,
    ...(options.cacheDir !== undefined ? { cacheDir: options.cacheDir } : {}),
    ...(help !== undefined && !takesLibgs(help) ? { libgs: false as const } : {}),
    ...(help !== undefined && !takesLibgs(help) && runsPostScript(first(dvisvgm), extended) ? { postscript: true as const } : {}),
    ...(sandbox?.ok ? { sandbox: sandbox.sandbox } : {}),
  }
}

/**
 * Whether a dvisvgm without --libgs hands PostScript specials to Ghostscript
 * whatever --no-specials says: Ghostscript linked in (`-V1` names it) and a
 * version whose list parsing ignores nothing (3.5 to 3.6.1, fixed after).
 */
export function runsPostScript(version: string, extended: string | undefined): boolean {
  const m = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(version)
  if (!m || !/^Ghostscript:/m.test(extended ?? '')) return false
  const v = Number(m[1]) * 10_000 + Number(m[2]) * 100 + Number(m[3] ?? 0)
  return v >= 30_500 && v <= 30_601
}

/** The special prefixes dvisvgm's PostScript handler takes (PsSpecialHandler::prefixes). */
const POSTSCRIPT_PREFIXES = new Set(['header=', 'pdffile=', 'psfile=', 'PSfile=', 'ps:', 'ps::', '!', '"', 'pst:', 'PST:'])

/** A special's prefix as dvisvgm reads it: letters and digits, then one punctuation character (`ps::` whole). */
function specialPrefix(text: string): string {
  const m = /^[A-Za-z0-9]*/.exec(text)!
  let prefix = m[0]
  const next = text[prefix.length]
  if (next !== undefined && /[!-/:-@[-`{-~]/.test(next)) prefix += next
  if (prefix === 'ps:' && text[3] === ':') prefix += ':'
  return prefix
}

/**
 * The specials a DVI file holds, in order (a walk over its commands from the
 * preamble to the postamble); undefined when the bytes aren't a DVI file.
 */
export function dviSpecials(bytes: Uint8Array): string[] | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const n = (at: number, size: number) => (size === 1 ? view.getUint8(at) : size === 2 ? view.getUint16(at) : size === 3 ? (view.getUint16(at) << 8) | view.getUint8(at + 2) : view.getUint32(at))
  const out: string[] = []
  let at = 0
  try {
    if (view.getUint8(0) !== 247) return undefined
    at = 15 + view.getUint8(14)
    while (at < bytes.length) {
      const op = view.getUint8(at++)
      if (op <= 127 || (op >= 171 && op <= 234) || op === 138 || op === 140 || op === 141 || op === 142 || op === 147 || op === 152 || op === 161 || op === 166) continue
      if (op >= 128 && op <= 131) at += op - 127
      else if (op === 132 || op === 137) at += 8
      else if (op >= 133 && op <= 136) at += op - 132
      else if (op === 139) at += 44
      else if (op >= 143 && op <= 146) at += op - 142
      else if (op >= 148 && op <= 151) at += op - 147
      else if (op >= 153 && op <= 156) at += op - 152
      else if (op >= 157 && op <= 160) at += op - 156
      else if (op >= 162 && op <= 165) at += op - 161
      else if (op >= 167 && op <= 170) at += op - 166
      else if (op >= 235 && op <= 238) at += op - 234
      else if (op >= 239 && op <= 242) {
        const size = op - 238
        const length = n(at, size)
        at += size
        let text = ''
        for (const byte of bytes.subarray(at, at + length)) text += String.fromCharCode(byte)
        out.push(text)
        at += length
      } else if (op >= 243 && op <= 246) {
        at += op - 242 + 12
        const a = view.getUint8(at)
        const l = view.getUint8(at + 1)
        at += 2 + a + l
      } else if (op === 248) return out
      else return undefined
    }
  } catch {
    return undefined
  }
  return undefined
}

/** Whether any of these specials is PostScript (dvisvgm would hand it to Ghostscript). */
export function hasPostScript(specials: readonly string[]): boolean {
  return specials.some(special => POSTSCRIPT_PREFIXES.has(specialPrefix(special.trimStart())))
}

/** The kpathsea variables naming every tree TeX reads: its root (programs, texmf.cnf), the search path, the config path. */
const TEX_TREES = '-expand-braces=$TEXMFROOT:$TEXMF:$TEXMFCNF'

/**
 * Whether TeX runs inside bubblewrap's namespace here, and what that needs:
 * the TeX trees (kpsewhich, as a job's environment sees them), latex's and
 * dvisvgm's real files and the libraries they load, each bound read-only
 * where it lies in a hidden directory (never a hidden directory itself), and
 * latex's and dvisvgm's directories first on PATH. The trial runs latex
 * (its format loaded) and dvisvgm in that namespace, as a job does.
 */
export async function probeSandbox(host: TexHost, options: { hide: readonly string[]; tmpdir: string | undefined; path?: string; prlimit: boolean }): Promise<SandboxProbe> {
  const run = (argv: readonly string[], init: { cwd?: string; env?: Record<string, string> } = {}) =>
    host.run(argv, { ...init, timeoutMs: PROBE_MS }).catch(() => undefined)
  const lines = (text: string | undefined) => (text ?? '').split('\n').map(line => line.trim()).filter(Boolean)
  const dirs = (options.path ?? '').split(':').filter(dir => dir.startsWith('/')).map(dir => dir.replace(/\/+$/, '') || '/')
  // The first latex and dvisvgm on PATH, links resolved (realpath prints only the ones there, in order).
  const find = async (name: string) => (dirs.length > 0 ? lines((await run(['realpath', '-e', '--', ...dirs.map(dir => `${dir}/${name}`)]))?.stdout)[0] : undefined)
  const placeholder = `${jobDirTemplate(options.tmpdir).replace(/\.X+$/, '')}.probe`
  const [latex, dvisvgm, trees, hidden] = await Promise.all([
    find('latex'),
    find('dvisvgm'),
    run(['kpsewhich', TEX_TREES], { env: texEnvironment(placeholder) }),
    run(['realpath', '-m', '--', ...options.hide]),
  ])
  const programs = [latex, dvisvgm].filter((one): one is string => one !== undefined)
  const libraries = await Promise.all(programs.map(program => run(['ldd', program])))
  const candidates = [
    ...programs.map(program => program.replace(/\/[^/]+$/, '')),
    ...(trees?.exitCode === 0 ? trees.stdout.trim().split(':') : []).map(tree => tree.replace(/^!!/, '').replace(/\/+$/, '')),
    ...libraries.flatMap(result => lines(result?.stdout).flatMap(line => /(?:=>\s*)?(\/[^\s()]+)\s*\(0x/.exec(line)?.[1] ?? [])),
  ].filter(path => path.startsWith('/'))
  const real = candidates.length > 0 ? lines((await run(['realpath', '-e', '--', ...new Set(candidates)]))?.stdout) : []
  const hide = [...new Set([...options.hide, ...lines(hidden?.stdout)])]
  const binds = sandboxBinds(real, hide)
  const bin = [...new Set(programs.map(program => program.replace(/\/[^/]+$/, '')))]
  const sandbox: Sandbox = { binds, ...(options.path !== undefined ? { path: [...new Set([...bin, ...dirs])].join(':') } : {}) }
  // The trial: latex with its format and dvisvgm, in the namespace a job gets.
  const made = await run(['mktemp', '-d', jobDirTemplate(options.tmpdir)])
  const job = made?.stdout.trim() ?? ''
  if (made?.exitCode !== 0 || !isJobDir(job)) return { ok: false, error: 'no temporary directory for the trial' }
  try {
    const confinement: Confinement = { prlimit: options.prlimit, bwrap: { hide: options.hide } }
    const env = { ...texEnvironment(job), ...(sandbox.path ? { PATH: sandbox.path } : {}) }
    for (const argv of [['latex', '-no-shell-escape', '-interaction=nonstopmode', '-halt-on-error', '\\stop'], ['dvisvgm', '--version']]) {
      const result = await run(confined(argv, job, confinement, binds), { cwd: job, env })
      if (result?.exitCode !== 0) {
        const said = lines(result?.stderr)[0] ?? lines(result?.stdout).find(line => line.startsWith('!'))
        return { ok: false, error: `${argv[0]} in the sandbox: ${said ?? (result ? `exit ${result.exitCode}` : 'did not run')}`.slice(0, 200) }
      }
    }
    return { ok: true, sandbox }
  } finally {
    await run(['rm', '-rf', '--', job])
  }
}

/**
 * The paths a job's namespace binds back: those of `paths` that lie inside a
 * hidden directory (never one of them, nor anything holding one), each once
 * (none inside another).
 */
export function sandboxBinds(paths: readonly string[], hide: readonly string[]): string[] {
  const inside = (path: string, dir: string) => path.startsWith(`${dir.replace(/\/+$/, '')}/`)
  const under = [...new Set(paths)].filter(path => hide.some(dir => inside(path, dir)) && !hide.some(dir => dir === path || inside(dir, path)))
  return under.filter(path => !under.some(other => other !== path && inside(path, other))).sort()
}

/** The extra paths every confined command of a job binds back, and the variables it runs with (a sandbox's PATH). */
function sandboxed(setup: Pick<TexSetup, 'confinement' | 'sandbox'>): { binds: string[]; env: Record<string, string> } {
  const jailed = setup.confinement.bwrap !== undefined
  return { binds: jailed ? (setup.sandbox?.binds ?? []) : [], env: jailed && setup.sandbox?.path ? { PATH: setup.sandbox.path } : {} }
}

/** Whether `dvisvgm --help` lists `--libgs`; a help that isn't dvisvgm's (no `--no-specials`) counts as yes. */
export function takesLibgs(help: string): boolean {
  return !/--no-specials\b/.test(help) || /--libgs\b/.test(help)
}

/** dvisvgm on a job in `dir`, as this host's dvisvgm takes it (without `--libgs` where it has none). */
export function dvisvgmCommand(dir: string, setup: Pick<TexSetup, 'libgs'>): string[] {
  const argv = dvisvgmArgv(dir)
  return setup.libgs === false ? argv.filter(arg => !arg.startsWith('--libgs=')) : argv
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
  /**
   * The setup an earlier session found (rememberedTex): its versions key the
   * disk cache, so the pictures it compiled are read with it before TeX is
   * probed (a resume draws them from its first render), and once TeX is gone.
   */
  cached: TexSetup | undefined

  /** A landing wants this document drawn (a reply read back after --resume): kept until takeAsked. Not one shown as source. */
  ask(document: TexDocument): void {
    if (this.drawable && !this.shownAsSource.has(document.text) && this.asked.size < BOOK_LIMIT) this.asked.set(document.text, document)
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
    this.cached = undefined
  }

  /** TeX is there to ask. */
  get ready(): boolean {
    return this.host !== undefined && this.setup !== undefined
  }

  /** Pictures can be shown: TeX is there, or the disk cache of an earlier session's TeX can be read. */
  get drawable(): boolean {
    return this.ready || this.cached?.cacheDir !== undefined
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

  /**
   * Reads a document's outcome from the disk cache into the book, when it is
   * there: with TeX's host, else with `read` (a render's own file reads) and
   * the cached setup, before TeX is found or once it is gone.
   */
  async load(document: TexDocument, read?: (path: string) => Promise<string | undefined>): Promise<TexOutcome | undefined> {
    const known = this.known(document)
    if (known && (known.ok || known.lasting)) return known
    const reader = this.host ? (path: string) => this.host!.read(path) : read
    const setup = this.setup ?? this.cached
    if (!reader || !setup?.cacheDir) return undefined
    try {
      const text = await reader(`${setup.cacheDir}/${await cacheKey(document, setup)}.json`)
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
    const jail = sandboxed(setup)
    const dumped = await run(confined(formatArgv(name), job, setup.confinement, jail.binds), { cwd: job, env: { ...texEnvironment(job), ...jail.env }, timeoutMs: FORMAT_MS })
    if (dumped.exitCode !== 0) return
    if ((await run(['mkdir', '-p', '--', dir], { timeoutMs: PROBE_MS })).exitCode !== 0) return
    // Copied under a name of its own, then renamed: a session starting meanwhile never reads half a format.
    const part = `${path}.${job.slice(-10)}`
    if ((await run(['cp', '--', `${job}/${name}.fmt`, part], { timeoutMs: PROBE_MS })).exitCode !== 0) return
    if ((await run(['mv', '-f', '--', part, path], { timeoutMs: PROBE_MS })).exitCode !== 0) return
    setup.format = { name, dir }
    // The formats of an earlier TeX (or kittex preamble) are superseded: removed, about 11 MB each.
    await run(['find', dir, '-maxdepth', '1', '-type', 'f', '-name', 'kittex-*.fmt', '!', '-name', `${name}.fmt`, '-delete'], { timeoutMs: PROBE_MS })
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
    const jail = sandboxed(setup)
    const env = { ...texEnvironment(dir), ...jail.env }
    let latex
    // A fragment starts from the dumped format, read where the namespace hides the cache directory.
    const format = document.format ? setup.format : undefined
    try {
      latex = format
        ? await host.run(confined(latexArgv(format.name), dir, setup.confinement, [...jail.binds, format.dir]), { cwd: dir, env: { ...env, TEXFORMATS: `${format.dir}:` }, timeoutMs: Math.max(1, left()) })
        : await host.run(confined(LATEX_ARGV, dir, setup.confinement, jail.binds), { cwd: dir, env, timeoutMs: Math.max(1, left()) })
      // A format TeX can't read (a stale or broken file): the same job without it.
      if (format && latex.exitCode !== 0 && /format file|\.fmt\b/i.test(latex.stdout)) {
        latex = await host.run(confined(LATEX_ARGV, dir, setup.confinement, jail.binds), { cwd: dir, env, timeoutMs: Math.max(1, left()) })
      }
    } catch {
      return late
    }
    if (latex.exitCode !== 0) {
      const log = `${latex.stdout}\n${(await host.read(`${dir}/${JOB_NAME}.log`)) ?? ''}`
      return { ok: false, error: texError(log, document.offset), lasting: true }
    }
    // A dvisvgm that would run PostScript through Ghostscript unconfined (setup.postscript): only a DVI without any.
    if (setup.postscript && !setup.confinement.bwrap) {
      const bytes = await host.readBytes?.(`${dir}/${JOB_NAME}.dvi`).catch(() => undefined)
      const specials = bytes ? dviSpecials(bytes) : undefined
      if (!specials || hasPostScript(specials)) return { ok: false, error: 'uses PostScript (a rotation or scaling, say), which this dvisvgm runs through Ghostscript outside any sandbox', lasting: true }
    }
    let svg
    try {
      if (left() < 1) return late
      svg = await host.run(confined(dvisvgmCommand(dir, setup), dir, setup.confinement, jail.binds), { cwd: dir, env, timeoutMs: Math.max(1, left()) })
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

/**
 * One compile of `document` outside the book: nothing remembered, nothing
 * cached (/kittex-doctor's trial picture), within `timeoutMs`.
 */
export function compileTrial(host: TexHost, setup: TexSetup, document: TexDocument, timeoutMs: number): Promise<TexOutcome> {
  return compileOnce(host, setup, document, Date.now() + timeoutMs, timeoutMs).catch((error: unknown): TexOutcome => ({ ok: false, error: String(error), lasting: false }))
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

/** A setup as it is remembered for the next session ($.store): plain data, or undefined when it isn't one. */
export function rememberedTex(value: unknown): TexSetup | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const setup = value as Partial<TexSetup>
  if (typeof setup.versions !== 'string' || typeof setup.cacheDir !== 'string' || typeof setup.confinement !== 'object' || setup.confinement === null) return undefined
  return {
    versions: setup.versions,
    confinement: setup.confinement,
    tmpdir: typeof setup.tmpdir === 'string' ? setup.tmpdir : undefined,
    cacheDir: setup.cacheDir,
    ...(setup.format && typeof setup.format.name === 'string' && typeof setup.format.dir === 'string' ? { format: setup.format } : {}),
    ...(setup.libgs === false ? { libgs: false as const } : {}),
    ...(setup.postscript === true ? { postscript: true as const } : {}),
    ...(setup.sandbox && Array.isArray(setup.sandbox.binds) && setup.sandbox.binds.every(bind => typeof bind === 'string')
      ? { sandbox: { binds: setup.sandbox.binds, ...(typeof setup.sandbox.path === 'string' ? { path: setup.sandbox.path } : {}) } }
      : {}),
  }
}
