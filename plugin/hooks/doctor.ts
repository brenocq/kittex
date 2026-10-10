// /kittex-doctor: what kittex depends on, checked, and for what is missing,
// what to install. Nothing here takes `$`: register.tsx gathers the facts it
// holds (the terminal, the options, the streaming hooks seen) and hands a
// DoctorHost of closures over `$` for the probes; this file runs the probes,
// maps a missing piece to the package that ships it on the host's OS, and
// writes the report.
//
// The report is a CommandOutput row, drawn as markdown (the engine's own
// drawing: kittex hooks AssistantMessage only, so none of it is read as
// math). It holds no `$`, and every name from the host (a path, a TeX error)
// goes in code spans or through `plain`, so no markdown in it changes the row.

import { diagramDocument, formatName, ulimitProbe } from './core.js'
import { compileTrial, onPath, probeSandbox, runsPostScript, takesLibgs, texCacheDir, texPath } from './tex.ts'
import { CACHE_LIMIT_BYTES, TEX_CACHE_LIMIT_BYTES } from './cache.ts'
import type { Sandbox, SandboxProbe, TexHost, TexSetup } from './tex.ts'

/** The command's name: typed as `/kittex-doctor`. */
export const DOCTOR_COMMAND = 'kittex-doctor'
export const DOCTOR_DESCRIPTION = "Check kittex's terminal, streaming and local TeX setup, and what to install for diagrams"

/** How long one probe command may run. */
export const DOCTOR_PROBE_MS = 2000
/** How long the trial picture may take (TeX loading every picture package without the format takes about a second). */
export const DOCTOR_TRIAL_MS = 8000

/** The fixed picture the doctor compiles: the only source it ever gives TeX. */
export const TRIAL_PICTURE = '\\draw[->] (0,0) -- (1,0.6) node[right] {$x$};\n\\draw (0,0) circle (0.3);'

// ─── What TeX needs ──────────────────────────────────────────────────────────

/** A command or a TeX file kittex's documents need, and what it costs when missing. */
export interface Requirement {
  name: string
  kind: 'command' | 'file'
  /**
   * `pictures`: every diagram (one preamble loads every picture package);
   * `math`: the formulas MathJax refuses; `speed`: the dumped format;
   * `check`: this doctor's package check; `confine`: confinement (Linux).
   */
  need: 'pictures' | 'math' | 'speed' | 'check' | 'confine' | 'postscript'
}

/** The commands, in the order the report lists them. */
export const TEX_COMMANDS: readonly Requirement[] = [
  { name: 'latex', kind: 'command', need: 'pictures' },
  { name: 'dvisvgm', kind: 'command', need: 'pictures' },
  { name: 'kpsewhich', kind: 'command', need: 'check' },
]

/** What confines TeX on Linux. */
export const CONFINE_COMMANDS: readonly Requirement[] = [
  { name: 'bwrap', kind: 'command', need: 'confine' },
  { name: 'prlimit', kind: 'command', need: 'confine' },
]

/**
 * The files the documents load (core/src/diagram/tex.ts: the fragment
 * preamble, the format's mylatexformat, the math preamble), and three a
 * distribution may split off: chemfig's simplekv, the Computer Modern
 * outlines dvisvgm draws the glyphs from, and dvips's PostScript header
 * (tex.pro), which a dvisvgm that runs PostScript through Ghostscript reads
 * first (kittex's own documents carry no PostScript; a whole document that
 * rotates or scales with graphicx does).
 */
export const TEX_FILES: readonly Requirement[] = [
  { name: 'standalone.cls', kind: 'file', need: 'pictures' },
  { name: 'amsmath.sty', kind: 'file', need: 'pictures' },
  { name: 'amssymb.sty', kind: 'file', need: 'pictures' },
  { name: 'tikz.sty', kind: 'file', need: 'pictures' },
  { name: 'pgfplots.sty', kind: 'file', need: 'pictures' },
  { name: 'tikz-cd.sty', kind: 'file', need: 'pictures' },
  { name: 'circuitikz.sty', kind: 'file', need: 'pictures' },
  { name: 'chemfig.sty', kind: 'file', need: 'pictures' },
  { name: 'simplekv.tex', kind: 'file', need: 'pictures' },
  { name: 'siunitx.sty', kind: 'file', need: 'pictures' },
  { name: 'cmr10.pfb', kind: 'file', need: 'pictures' },
  { name: 'tex.pro', kind: 'file', need: 'postscript' },
  { name: 'mathtools.sty', kind: 'file', need: 'math' },
  { name: 'preview.sty', kind: 'file', need: 'math' },
  { name: 'mylatexformat.ltx', kind: 'file', need: 'speed' },
]

// ─── Which OS, which packages ────────────────────────────────────────────────

/** How the host installs TeX: its distribution's packages, TeX Live's own tlmgr (macOS, an installer's TeX Live), or unknown. */
export type InstallFamily = 'arch' | 'debian' | 'fedora' | 'macos' | 'texlive'

/** The OS as read from `uname -s` and /etc/os-release. */
export interface OsFacts {
  /** `linux`, `darwin`... (uname -s, lowercased). */
  platform?: string
  /** /etc/os-release's ID, ID_LIKE and PRETTY_NAME. */
  id?: string
  idLike?: readonly string[]
  name?: string
}

/** /etc/os-release's variables (quotes removed). */
export function parseOsRelease(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m) out[m[1]!] = m[2]!.replace(/^(["'])(.*)\1$/, '$2')
  }
  return out
}

/** The OS facts from uname's output and /etc/os-release's text (either may be missing). */
export function osFacts(uname: string | undefined, osRelease: string | undefined): OsFacts {
  const platform = uname?.trim().toLowerCase() || undefined
  const vars = osRelease ? parseOsRelease(osRelease) : {}
  const idLike = (vars.ID_LIKE ?? '').split(/\s+/).filter(Boolean)
  return {
    ...(platform ? { platform } : {}),
    ...(vars.ID ? { id: vars.ID.toLowerCase() } : {}),
    ...(idLike.length > 0 ? { idLike: idLike.map(one => one.toLowerCase()) } : {}),
    ...(vars.PRETTY_NAME || vars.NAME ? { name: vars.PRETTY_NAME || vars.NAME } : {}),
  }
}

/**
 * How TeX is installed here: by the distribution's packages (Arch and its
 * derivatives, Debian and Ubuntu and theirs, Fedora), by tlmgr on macOS and
 * where `latex` comes from TeX Live's own installer (a `texlive/<year>/bin`
 * or `/Library/TeX` path), else TeX Live's way. RHEL and its rebuilds lack
 * several of the packages, so they get TeX Live's way too.
 */
export function installFamily(os: OsFacts, latexPath?: string): InstallFamily {
  if (os.platform === 'darwin') return 'macos'
  if (latexPath && (/\/texlive\/\d{4}\/bin\//.test(latexPath) || latexPath.startsWith('/Library/TeX/'))) return 'texlive'
  const ids = [os.id ?? '', ...(os.idLike ?? [])]
  if (ids.includes('arch')) return 'arch'
  if (ids.includes('debian') || ids.includes('ubuntu')) return 'debian'
  if (os.id === 'fedora' || (ids.includes('fedora') && !ids.includes('rhel'))) return 'fedora'
  return 'texlive'
}

/**
 * The package that ships each requirement, per family. Checked against each
 * distribution's own index (Arch: pacman -F; Debian 13 and Ubuntu 24.04:
 * apt-file; Fedora 44: dnf repoquery --whatprovides 'tex(<file>)'; TeX Live:
 * tlmgr search --file) and installed end to end in a container of each, where
 * kittex's format, pictures and math compiled.
 */
export const PACKAGES: Readonly<Record<InstallFamily, Readonly<Record<string, string>>>> = {
  arch: {
    latex: 'texlive-latex',
    dvisvgm: 'dvisvgm',
    kpsewhich: 'texlive-bin',
    bwrap: 'bubblewrap',
    prlimit: 'util-linux',
    'standalone.cls': 'texlive-latexextra',
    'amsmath.sty': 'texlive-latex',
    'amssymb.sty': 'texlive-basic',
    'tikz.sty': 'texlive-pictures',
    'pgfplots.sty': 'texlive-pictures',
    'tikz-cd.sty': 'texlive-pictures',
    'circuitikz.sty': 'texlive-pictures',
    'chemfig.sty': 'texlive-pictures',
    'simplekv.tex': 'texlive-plaingeneric',
    'siunitx.sty': 'texlive-mathscience',
    'cmr10.pfb': 'texlive-basic',
    'tex.pro': 'texlive-basic',
    'mathtools.sty': 'texlive-latexrecommended',
    'preview.sty': 'texlive-latexextra',
    'mylatexformat.ltx': 'texlive-latexextra',
  },
  debian: {
    latex: 'texlive-latex-base',
    dvisvgm: 'dvisvgm',
    kpsewhich: 'texlive-binaries',
    bwrap: 'bubblewrap',
    prlimit: 'util-linux',
    'standalone.cls': 'texlive-latex-extra',
    'amsmath.sty': 'texlive-latex-base',
    'amssymb.sty': 'texlive-base',
    'tikz.sty': 'texlive-pictures',
    'pgfplots.sty': 'texlive-pictures',
    'tikz-cd.sty': 'texlive-pictures',
    'circuitikz.sty': 'texlive-pictures',
    'chemfig.sty': 'texlive-pictures',
    'simplekv.tex': 'texlive-plain-generic',
    'siunitx.sty': 'texlive-science',
    'cmr10.pfb': 'texlive-base',
    'tex.pro': 'texlive-base',
    'mathtools.sty': 'texlive-latex-recommended',
    'preview.sty': 'preview-latex-style',
    'mylatexformat.ltx': 'texlive-latex-extra',
  },
  fedora: {
    latex: 'texlive-latex',
    dvisvgm: 'texlive-dvisvgm',
    kpsewhich: 'texlive-kpathsea',
    bwrap: 'bubblewrap',
    prlimit: 'util-linux',
    'standalone.cls': 'texlive-standalone',
    'amsmath.sty': 'texlive-amsmath',
    'amssymb.sty': 'texlive-amsfonts',
    'tikz.sty': 'texlive-pgf',
    'pgfplots.sty': 'texlive-pgfplots',
    'tikz-cd.sty': 'texlive-tikz-cd',
    'circuitikz.sty': 'texlive-circuitikz',
    'chemfig.sty': 'texlive-chemfig',
    'simplekv.tex': 'texlive-simplekv',
    'siunitx.sty': 'texlive-siunitx',
    'cmr10.pfb': 'texlive-amsfonts',
    'tex.pro': 'texlive-dvips',
    'mathtools.sty': 'texlive-mathtools',
    'preview.sty': 'texlive-preview',
    'mylatexformat.ltx': 'texlive-mylatexformat',
  },
  macos: TEXLIVE(),
  texlive: TEXLIVE(),
}

/** TeX Live's package names (tlmgr), from scheme-basic up (BasicTeX holds more). */
function TEXLIVE(): Record<string, string> {
  return {
    dvisvgm: 'dvisvgm',
    'standalone.cls': 'standalone',
    'amsmath.sty': 'amsmath',
    'amssymb.sty': 'amsfonts',
    'tikz.sty': 'pgf',
    'pgfplots.sty': 'pgfplots',
    'tikz-cd.sty': 'tikz-cd',
    'circuitikz.sty': 'circuitikz',
    'chemfig.sty': 'chemfig',
    'simplekv.tex': 'simplekv',
    'siunitx.sty': 'siunitx',
    'cmr10.pfb': 'amsfonts',
    'tex.pro': 'dvips',
    'mathtools.sty': 'mathtools',
    'preview.sty': 'preview',
    'mylatexformat.ltx': 'mylatexformat',
  }
}

/** Every requirement a family installs, in order (the whole set: what a host with no TeX at all needs). */
const ALL = [...TEX_COMMANDS, ...TEX_FILES].map(one => one.name)

/**
 * The whole set as a host with no TeX installs it, where a shorter list
 * brings the rest as dependencies (each installed as is in a fresh container:
 * Arch, Debian 13 and Ubuntu 24.04 without recommends; the README gives the
 * same lines).
 */
const FULL: Partial<Record<InstallFamily, readonly string[]>> = {
  arch: ['texlive-basic', 'texlive-latex', 'texlive-latexrecommended', 'texlive-latexextra', 'texlive-pictures', 'texlive-mathscience', 'texlive-plaingeneric', 'dvisvgm', 'bubblewrap'],
  debian: ['texlive-latex-extra', 'texlive-pictures', 'texlive-science', 'texlive-plain-generic', 'preview-latex-style', 'dvisvgm', 'bubblewrap'],
}

/** The install advice: a heading and the commands, or nothing when nothing is missing. */
export interface InstallAdvice {
  family: InstallFamily
  /** The OS as the heading names it. */
  label: string
  /** Only confinement is missing (diagrams already draw). */
  confineOnly: boolean
  /** Shell commands, one per line, in order. */
  commands: string[]
  /** A line after them (another way, a caveat), as markdown, when there is one. */
  note?: string
}

/**
 * What to install for the requirements `missing` (names from TEX_COMMANDS,
 * CONFINE_COMMANDS, TEX_FILES): everything when `latex` is missing, else the
 * packages that ship what is missing. Undefined when nothing is.
 */
export function installAdvice(os: OsFacts, missing: readonly string[], latexPath?: string): InstallAdvice | undefined {
  if (missing.length === 0) return undefined
  const family = installFamily(os, latexPath)
  const linux = os.platform !== 'darwin'
  const noTex = missing.includes('latex')
  // With latex, everything (its own package brings kpsewhich); bubblewrap with it on Linux.
  const names = noTex ? [...new Set([...ALL.filter(name => name !== 'kpsewhich'), ...missing, ...(linux ? ['bwrap'] : [])])] : [...missing]
  const confineOnly = names.every(name => name === 'bwrap' || name === 'prlimit')
  const map = PACKAGES[family]
  const full = noTex ? FULL[family] : undefined
  const packages = full ? [...full] : [...new Set(names.map(name => map[name]).filter((one): one is string => one !== undefined))]
  const label = family === 'macos' ? 'macOS' : family === 'texlive' && !os.name ? 'TeX Live' : (os.name ?? family)
  const base = { family, label, confineOnly }
  switch (family) {
    case 'arch':
      return { ...base, commands: [`sudo pacman -S --needed ${packages.join(' ')}`] }
    case 'debian':
      return { ...base, commands: [`sudo apt install ${packages.join(' ')}`] }
    case 'fedora':
      return { ...base, commands: [`sudo dnf install ${packages.join(' ')}`] }
    case 'macos': {
      if (!noTex) return { ...base, commands: [`sudo tlmgr install ${packages.join(' ')}`] }
      return {
        ...base,
        commands: ['brew install --cask basictex', 'sudo /Library/TeX/texbin/tlmgr update --self', `sudo /Library/TeX/texbin/tlmgr install ${packages.join(' ')}`],
        note: 'Or the full MacTeX, everything included (about 6 GB): `brew install --cask mactex-no-gui`.',
      }
    }
    case 'texlive': {
      const confine = linux ? [...new Set(names.filter(name => name === 'bwrap' || name === 'prlimit').map(name => (name === 'bwrap' ? 'bubblewrap' : 'util-linux')))] : []
      const notes = [
        noTex ? 'Install TeX Live first (https://tug.org/texlive, its basic scheme is enough), then run the line above.' : packages.length > 0 ? 'With sudo where TeX Live is installed system-wide.' : '',
        confine.length > 0 ? `Also install ${confine.map(code).join(' and ')} from your distribution, so TeX runs confined.` : '',
      ].filter(Boolean)
      return { ...base, commands: packages.length > 0 ? [`tlmgr install ${packages.join(' ')}`] : [], ...(notes.length > 0 ? { note: notes.join(' ') } : {}) }
    }
  }
}

// ─── The probes ──────────────────────────────────────────────────────────────

/** What the probes need from the host: TexHost's commands and files, and a path's existence and size. */
export interface DoctorHost extends TexHost {
  exists(path: string): Promise<boolean>
  /** A file's size in bytes, or undefined when it isn't there. */
  size(path: string): Promise<number | undefined>
}

/** A command as found: where on PATH, and its `--version` line. */
export interface ToolFacts {
  path?: string
  version?: string
}

/** The trial picture's compile. */
export type TrialFacts = { ok: true; ms: number; format: boolean } | { ok: false; ms: number; error: string } | { skipped: string }

export interface DiagramFacts {
  /** The `latex` option. */
  option: 'auto' | 'off'
  /** Whether kittex draws diagrams here at all: images on this terminal, block math as images. */
  drawn: boolean
  /** Whether this session's kittex found TeX when it started (it looks once, at session start). */
  found: boolean
  latex: ToolFacts
  dvisvgm: ToolFacts
  kpsewhich: ToolFacts
  tlmgr: ToolFacts
  /** Each TEX_FILES name with the path kpsewhich gave; undefined when kpsewhich couldn't run. */
  files?: { name: string; path?: string }[]
  /** Linux only: bubblewrap found and whether its trial namespace runs (else its first error line). */
  /** Linux only: bubblewrap found, whether TeX runs in its namespace (else why not), and what it binds back. */
  bwrap?: ToolFacts & { usable: boolean; error?: string; sandbox?: Sandbox }
  prlimit?: ToolFacts
  /** Without prlimit (macOS): whether sh's ulimit sets the CPU-time and file-size limits. */
  ulimit?: boolean
  /** The dumped format for this TeX (prepareFormat), when latex and dvisvgm answered. */
  format?: { path: string; bytes?: number }
  /** Whether dvisvgm takes --libgs (false: kittex leaves it out). */
  libgs?: boolean
  /** dvisvgm runs PostScript specials through a Ghostscript it links, whatever kittex asks (3.5 to 3.6.1). */
  postscript?: boolean
  trial: TrialFacts
}

export interface CacheFacts {
  /** ~/.cache/kittex (XDG_CACHE_HOME's kittex). */
  dir?: string
  bytes?: number
  files?: number
  /** Its parts: the images of resumed replies (`v<n>/`), what TeX drew (`tex/`), the TeX format (`tex/fmt/`). */
  images?: CachePart
  tex?: CachePart
  format?: CachePart
}

export interface CachePart {
  bytes?: number
  files: number
}

/** What the probes start from. */
export interface ProbeInput {
  option: 'auto' | 'off'
  drawn: boolean
  found: boolean
  os: OsFacts
  env: { PATH?: string; HOME?: string; TMPDIR?: string; XDG_CACHE_HOME?: string }
  /** The directories a confined job can't see (tex.ts hiddenDirs). */
  hide: readonly string[]
}

/** The first non-empty line of a command's output. */
function firstLine(text: string | undefined): string | undefined {
  return text?.split('\n').map(line => line.trim()).find(line => line !== '') || undefined
}

/** The first directory on PATH holding `name`. */
export async function which(host: Pick<DoctorHost, 'exists'>, name: string, path: string | undefined): Promise<string | undefined> {
  const dirs = (path ?? '').split(':').filter(dir => dir.startsWith('/'))
  const found = await Promise.all(dirs.map(dir => host.exists(`${dir.replace(/\/+$/, '')}/${name}`).catch(() => false)))
  const at = found.indexOf(true)
  return at < 0 ? undefined : `${dirs[at]!.replace(/\/+$/, '')}/${name}`
}

/**
 * Probes the local TeX: the commands (PATH and `--version`), the files
 * (kpsewhich), the confinement (Linux), the format, and once latex and
 * dvisvgm answer, the trial picture. The commands run at once; only the
 * trial waits for them. TeX never sees anything but TRIAL_PICTURE.
 */
export async function probeDiagrams(given: DoctorHost, input: ProbeInput): Promise<DiagramFacts> {
  // On macOS, MacTeX's folder too (as the session's TeX finds it: texPath).
  const texPATH = texPath(input.env.PATH, input.os.platform)
  const host = onPath(given, texPATH)
  const run = (argv: readonly string[], timeoutMs = DOCTOR_PROBE_MS) =>
    host.run(argv, { timeoutMs }).then(
      result => result,
      () => undefined,
    )
  const version = async (name: string, path: string | undefined): Promise<ToolFacts> => {
    if (!path) return {}
    const out = await run([name, '--version'])
    const line = out?.exitCode === 0 ? firstLine(out.stdout) : undefined
    return { path, ...(line ? { version: line } : {}) }
  }
  const linux = input.os.platform !== 'darwin'
  const PATH = texPATH ?? input.env.PATH
  const [latexAt, dvisvgmAt, kpsewhichAt, tlmgrAt, bwrapAt, prlimitAt] = await Promise.all(
    ['latex', 'dvisvgm', 'kpsewhich', 'tlmgr', 'bwrap', 'prlimit'].map(name => (linux || (name !== 'bwrap' && name !== 'prlimit') ? which(host, name, PATH) : Promise.resolve(undefined))),
  )
  const [latex, dvisvgm, kpsewhich, prlimit, help, extended, kpse, bwrapRun] = await Promise.all([
    version('latex', latexAt),
    version('dvisvgm', dvisvgmAt),
    version('kpsewhich', kpsewhichAt),
    linux ? version('prlimit', prlimitAt) : Promise.resolve(undefined),
    dvisvgmAt ? run(['dvisvgm', '--help']) : Promise.resolve(undefined),
    dvisvgmAt ? run(['dvisvgm', '-V1']) : Promise.resolve(undefined),
    kpsewhichAt ? run(['kpsewhich', ...TEX_FILES.map(file => file.name)]) : Promise.resolve(undefined),
    // The sandbox's own trial (latex and dvisvgm inside it), not run where Local LaTeX is off.
    linux && bwrapAt && latexAt && dvisvgmAt && input.hide.length > 0 && input.option === 'auto'
      ? probeSandbox(host, { hide: input.hide, tmpdir: input.env.TMPDIR, path: PATH, prlimit: prlimitAt !== undefined })
      : Promise.resolve(undefined as SandboxProbe | undefined),
  ])
  // No prlimit (always on macOS): sh's ulimit sets the same limits, where it runs.
  const ulimit = prlimitAt === undefined ? (await run(ulimitProbe()))?.exitCode === 0 : undefined
  const tlmgr: ToolFacts = tlmgrAt ? { path: tlmgrAt } : {}
  // kpsewhich prints the path of each file it finds (exit 1 when any is missing).
  const found = kpse?.stdout.split('\n').map(line => line.trim()).filter(Boolean) ?? []
  const files = kpse ? TEX_FILES.map(({ name }) => ({ name, path: found.find(path => path === name || path.endsWith(`/${name}`)) })).map(({ name, path }) => (path ? { name, path } : { name })) : undefined
  const bwrap: DiagramFacts['bwrap'] = linux
    ? {
        ...(bwrapAt ? { path: bwrapAt } : {}),
        usable: bwrapRun?.ok === true,
        ...(bwrapRun?.ok ? { sandbox: bwrapRun.sandbox } : bwrapRun ? { error: bwrapRun.error } : bwrapAt && input.option === 'auto' && latexAt && dvisvgmAt ? { error: 'not tried' } : {}),
      }
    : undefined
  const libgs = help?.exitCode === 0 ? takesLibgs(help.stdout) : undefined
  const postscript = libgs === false && dvisvgm.version !== undefined && runsPostScript(dvisvgm.version, extended?.exitCode === 0 ? extended.stdout : undefined)
  const facts: DiagramFacts = {
    option: input.option,
    drawn: input.drawn,
    found: input.found,
    latex,
    dvisvgm,
    kpsewhich,
    tlmgr,
    ...(files ? { files } : {}),
    ...(bwrap ? { bwrap } : {}),
    ...(prlimit ? { prlimit } : {}),
    ...(ulimit !== undefined ? { ulimit } : {}),
    ...(libgs !== undefined ? { libgs } : {}),
    ...(postscript ? { postscript } : {}),
    trial: { skipped: '' },
  }
  // The format kittex dumps for this TeX (named by the versions, as tex.ts's probeTex reads them).
  const cacheDir = texCacheDir(input.env)
  let format: TexSetup['format']
  if (latex.version && dvisvgm.version && cacheDir) {
    const name = formatName(`${latex.version}\n${dvisvgm.version}`)
    const path = `${cacheDir}/fmt/${name}.fmt`
    const bytes = await host.size(path).catch(() => undefined)
    facts.format = { path, ...(bytes !== undefined ? { bytes } : {}) }
    if (bytes !== undefined && bytes > 0) format = { name, dir: `${cacheDir}/fmt` }
  }
  if (!latex.version || !dvisvgm.version) {
    facts.trial = { skipped: !latex.path ? 'no latex' : !dvisvgm.path ? 'no dvisvgm' : `${latex.version ? 'dvisvgm' : 'latex'} does not answer` }
  } else if (input.option === 'off') {
    facts.trial = { skipped: 'Local LaTeX is off' }
  } else {
    const setup: TexSetup = {
      versions: `${latex.version}\n${dvisvgm.version}`,
      confinement: { prlimit: !linux ? false : prlimit?.path !== undefined, ...(ulimit ? { ulimit: true as const } : {}), ...(bwrap?.usable ? { bwrap: { hide: input.hide } } : {}) },
      tmpdir: input.env.TMPDIR,
      ...(format ? { format } : {}),
      ...(libgs === false ? { libgs: false as const } : {}),
      ...(postscript ? { postscript: true as const } : {}),
      ...(bwrap?.sandbox ? { sandbox: bwrap.sandbox } : {}),
    }
    const started = Date.now()
    const outcome = await compileTrial(host, setup, diagramDocument(TRIAL_PICTURE, 'tikz'), DOCTOR_TRIAL_MS)
    const ms = Date.now() - started
    facts.trial = outcome.ok ? { ok: true, ms, format: format !== undefined } : { ok: false, ms, error: outcome.error }
  }
  return facts
}

/**
 * The cache directory's size and file count (du, find), or just its path
 * when it isn't there, with its parts apart: the images (pruned past 50 MB),
 * what TeX drew (past 20 MB) and the TeX format (never pruned, replaced for
 * a new TeX).
 */
export async function probeCache(host: DoctorHost, env: ProbeInput['env']): Promise<CacheFacts> {
  const tex = texCacheDir(env)
  if (!tex) return {}
  const dir = tex.replace(/\/tex$/, '')
  if (!(await host.exists(dir).catch(() => false))) return { dir }
  const [du, find] = await Promise.all([
    host.run(['du', '-sk', dir, `${dir}/tex`, `${dir}/tex/fmt`], { timeoutMs: DOCTOR_PROBE_MS }).catch(() => undefined),
    host.run(['find', dir, '-type', 'f'], { timeoutMs: DOCTOR_PROBE_MS }).catch(() => undefined),
  ])
  // du prints a line per path it could read (a missing one only on stderr): kB, a tab, the path.
  const kb = new Map<string, number>()
  for (const line of du?.stdout.split('\n') ?? []) {
    const match = /^(\d+)\s+(.+)$/.exec(line.trim())
    if (match) kb.set(match[2]!.replace(/\/+$/, ''), Number(match[1]) * 1024)
  }
  const files = find?.exitCode === 0 || (find && find.stdout.trim() !== '') ? find.stdout.split('\n').filter(line => line.trim() !== '') : undefined
  const all = kb.get(dir)
  const texAll = kb.get(`${dir}/tex`)
  const fmt = kb.get(`${dir}/tex/fmt`)
  const facts: CacheFacts = { dir, ...(all !== undefined ? { bytes: all } : {}), ...(files ? { files: files.length } : {}) }
  if (files) {
    const formats = files.filter(path => path.startsWith(`${dir}/tex/fmt/`)).length
    const drawn = files.filter(path => path.startsWith(`${dir}/tex/`)).length - formats
    const images = files.length - formats - drawn
    const texOnly = texAll !== undefined ? texAll - (fmt ?? 0) : undefined
    facts.images = { files: images, ...(all !== undefined && texAll !== undefined ? { bytes: all - texAll } : {}) }
    facts.tex = { files: drawn, ...(texOnly !== undefined ? { bytes: texOnly } : {}) }
    facts.format = { files: formats, ...(fmt !== undefined ? { bytes: fmt } : {}) }
  }
  return facts
}

// ─── The report ──────────────────────────────────────────────────────────────

export interface TerminalFacts {
  kind: 'kitty' | 'ghostty' | 'wezterm' | 'iterm2' | 'other'
  images: boolean
  multiplexer?: string
  ssh?: boolean
  /** TERM, and TERM_PROGRAM with its version, as the environment says. */
  term?: string
  program?: string
  /** The cell in pixels, and whether it was measured (else the fallback). */
  cell?: { width: number; height: number; measured: boolean }
  /** The text font as the terminal's config names it, and its metrics as kittex read them. */
  font?: { family?: string; style?: string; sizePt?: number; file?: string; source?: 'kitty' | 'fontconfig' | 'ghostty'; metrics: boolean }
  /** The formulas' ink and the background, as #rrggbb, and where they came from. */
  ink?: string
  background?: string
  colors: 'terminal' | 'theme'
  /**
   * Claude Code's own decision on drawing pictures (its probe of the
   * terminal), as a blit to one of kittex's Images read it: `unknown` before
   * kittex drew one, `pending` while Claude Code hasn't asked the terminal.
   */
  claude?: { state: 'unknown' | 'pending' | 'yes' | 'no'; source?: string }
}

export interface StreamingFacts {
  /** kittex is off (block and inline both raw): no hook rewrites anything. */
  off: boolean
  /** Text blocks that streamed through kittex's MessageDisplay hook this session (the last few). */
  streamed: number
  /** Replies that landed with no stream through that hook (the last few). */
  unstreamed: number
  /** Whether kittex's system-prompt section was in the composed prompt; undefined when not asked (kittex off, not a terminal). */
  section?: boolean
  /** Whether managed settings (policy) are present. */
  managed: boolean
}

export interface DoctorFacts {
  kittex: { version?: string; build?: string }
  claudeCode?: string
  /** Where the session draws: `terminal`, a remote surface, or `none` (a -p run or the SDK with no client attached). */
  surface?: string
  /** The remote surfaces drawing beside the terminal (a phone attached), when there are any. */
  clients?: readonly string[]
  terminal?: TerminalFacts
  streaming: StreamingFacts
  /** The options as set, by name, shown as given. */
  options: Readonly<Record<string, string>>
  diagrams: DiagramFacts
  cache: CacheFacts
  os: OsFacts
  /** The home directory, written as ~ in paths. */
  home?: string
}

const OK = '✓'
const NO = '✗'
const INFO = '–'

/** Free text from the host (a font's name, a TeX error) as markdown that draws as written. */
export function plain(text: string): string {
  return text.replace(/`/g, "'").replace(/([\\*_[\]<>#|~])/g, '\\$1').replace(/\s+/g, ' ').trim()
}

/** A path or command as a code span (backticks in it, none expected, become quotes). */
function code(text: string): string {
  return `\`${text.replace(/`/g, "'")}\``
}

function bytes(n: number): string {
  if (n < 1000) return `${n} B`
  if (n < 1_000_000) return `${(n / 1000).toFixed(0)} kB`
  return `${(n / 1_000_000).toFixed(1)} MB`
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)} s`
}

const TERMINAL_NAMES: Record<TerminalFacts['kind'], string> = { kitty: 'kitty', ghostty: 'Ghostty', wezterm: 'WezTerm', iterm2: 'iTerm2', other: 'an unknown terminal' }

/** The report, as the command's markdown text. */
export function formatDoctor(facts: DoctorFacts): string {
  const home = facts.home && facts.home !== '/' ? facts.home.replace(/\/+$/, '') : undefined
  const path = (p: string) => code(home && (p === home || p.startsWith(`${home}/`)) ? `~${p.slice(home.length)}` : p)
  const out: string[] = []
  const line = (mark: string, text: string) => out.push(`${mark} ${text}`)
  const section = (title: string) => {
    if (out.length > 0) out.push('')
    out.push(`**${title}**`)
  }

  // The row reads `kittex: ` first (the engine names the plugin that answered).
  const head = [`${facts.kittex.version ?? 'version unknown'}${facts.kittex.build ? ` (build ${facts.kittex.build})` : ''}`]
  if (facts.claudeCode) head.push(`Claude Code ${plain(facts.claudeCode)}`)
  if (facts.surface) head.push(facts.surface === 'none' ? 'no surface' : `${facts.surface} surface`)
  out.push(head.join(' · '))

  // Terminal
  section('Terminal')
  const t = facts.terminal
  const elsewhere = facts.surface !== undefined && facts.surface !== 'terminal'
  if (facts.surface === 'none') {
    line(INFO, 'no terminal (a -p run or the SDK): kittex leaves replies as Claude wrote them (images need kitty or Ghostty, in a terminal).')
  } else if (elsewhere) {
    line(INFO, `the ${facts.surface} surface: kittex leaves replies to its own drawing here (images need kitty or Ghostty, in a terminal).`)
  } else if (t) {
    const name = TERMINAL_NAMES[t.kind]
    const program = t.program && t.program.toLowerCase() !== name.toLowerCase() ? (t.program.toLowerCase().startsWith(`${name.toLowerCase()} `) ? t.program.slice(name.length + 1) : t.program) : undefined
    const where = [program ? plain(program) : t.kind === 'other' && t.term ? `TERM=${plain(t.term)}` : undefined, t.multiplexer ? `inside ${t.multiplexer}` : undefined, t.ssh ? 'over ssh' : undefined].filter(Boolean).join(', ')
    if (t.images) {
      line(OK, `${name}${where ? ` (${where})` : ''}: kitty graphics with Unicode placeholders`)
      const c = t.claude
      const said = c?.source ? ` (${plain(c.source)})` : ''
      if (c?.state === 'yes') line(OK, 'Claude Code draws the pictures: kitty answered its graphics query')
      else if (c?.state === 'no') {
        line(NO, `Claude Code draws no pictures here${said}, so kittex shows math as Unicode text. Where this terminal does show kitty graphics and only answered late (ssh, a busy machine), start Claude Code with ${code('CLAUDE_CODE_FORCE_TERMINAL_IMAGES=1')} to skip its check.`)
      } else if (c?.state === 'pending') line(INFO, `Claude Code hasn't asked the terminal about pictures yet${said}: run this again in a moment`)
      else if (c) line(INFO, "Claude Code's own check on pictures: known once kittex has drawn an image (run this again after a reply with math)")
    } else {
      const why = t.multiplexer ? `${t.multiplexer} doesn't pass kitty graphics through` : t.kind === 'other' ? 'no kitty graphics detected' : `${name} has no kitty Unicode placeholders`
      line(NO, `${name}${where ? ` (${where})` : ''}: ${why}. kittex shows math as Unicode text instead; images work in kitty (0.28 or newer) and Ghostty${t.multiplexer ? `, outside ${t.multiplexer}` : ''}.`)
    }
    if (t.cell) line(t.cell.measured ? OK : NO, t.cell.measured ? `cell ${t.cell.width}×${t.cell.height} px, measured` : `cell not measured: drawing for ${t.cell.width}×${t.cell.height} px (perl or python3 reads the size from the terminal)`)
    if (t.images || t.font) {
      const f = t.font
      const base = f?.file?.split('/').pop()
      const named = [f?.family ? plain(f.family) : base ? plain(base) : undefined, f?.style ? plain(f.style) : undefined, f?.sizePt ? `${f.sizePt} pt` : undefined].filter(Boolean).join(' ')
      const source = f?.source === 'kitty' ? 'kitty names it' : f?.source === 'fontconfig' ? 'fontconfig matched it' : undefined
      const size = f?.sizePt ? ` ${f.sizePt} pt` : ''
      if (f?.metrics && f.source === 'ghostty' && !f.file) {
        if (f.family) line(INFO, `font ${plain(f.family)}${size}: fontconfig doesn't know it, so the math follows Ghostty's built-in JetBrains Mono`)
        else line(OK, `font Ghostty's built-in JetBrains Mono${size}: metrics built in`)
      }
      else if (f?.metrics) line(OK, `font ${named || 'as configured'}: metrics read from ${f.file ? path(f.file) : 'its file'}${source ? ` (${source})` : ''}`)
      else line(INFO, `font ${named || 'not named by the terminal'}: metrics not read${t.ssh ? ' (over ssh the font is on the other machine)' : ''}; math is sized from the cell`)
    }
    const colors = [t.ink ? `text ${t.ink}` : undefined, t.background ? `on ${t.background}` : undefined].filter(Boolean).join(' ')
    if (colors) line(t.colors === 'terminal' ? OK : INFO, `colours: ${colors} (${t.colors === 'terminal' ? "the terminal's" : "the Claude theme's default: the terminal's colours couldn't be read"})`)
  } else {
    line(INFO, 'not set up (kittex is off)')
  }
  if (!elsewhere && facts.clients?.length) line(INFO, `also drawn on ${facts.clients.join(', ')}: kittex leaves replies to that surface's own drawing there`)

  // Streaming
  section('Drawing while streaming')
  const s = facts.streaming
  const fix = "Fix: ask an admin to deploy kittex through Claude Code's managed settings."
  if (s.off) {
    line(INFO, 'kittex is off: Block math and Inline math are both raw')
  } else if (elsewhere) {
    line(INFO, 'not a terminal: replies pass as Claude wrote them, and Claude gets no instructions about math')
  } else if (s.streamed > 0) {
    line(OK, 'live: replies reach kittex as they stream')
  } else if (s.unstreamed > 0) {
    line(NO, `bypassed: ${s.unstreamed === 1 ? 'a reply' : `${s.unstreamed} replies`} streamed without reaching kittex (cc-plugin-sec-default${s.managed ? ', seated by managed settings,' : ' on Team and Enterprise plans'} skips plugins' streaming hooks): equations stay LaTeX until each part lands. ${fix}`)
  } else if (s.section === false) {
    line(NO, `likely bypassed: kittex's system-prompt section is skipped here (cc-plugin-sec-default on Team and Enterprise plans${s.managed ? ', or managed settings' : ''}), which skips the streaming hook too. ${fix}`)
  } else {
    line(INFO, 'no reply has streamed yet this session: run this again after one to confirm')
  }
  if (!s.off && s.section === false && (s.streamed > 0 || s.unstreamed > 0)) line(INFO, "instructions to Claude ride your first message (the system-prompt hook is skipped here)")
  else if (!s.off && s.section === true) line(OK, "instructions to Claude: in the system prompt")

  // Options
  section('Options')
  out.push(Object.entries(facts.options).map(([key, value]) => `${key} ${code(value)}`).join(' · '))

  // Diagrams
  section('Diagrams (local TeX)')
  const d = facts.diagrams
  const os = facts.os
  const linux = os.platform !== 'darwin'
  if (d.option === 'off') line(INFO, 'Local LaTeX is off: TeX never runs, diagrams stay code blocks (set it to auto in /config)')
  else if (!d.drawn) line(INFO, 'diagrams are drawn only where equations are images (kitty or Ghostty, Block math image)')
  const tool = (name: string, facts: ToolFacts, missing: string) => {
    if (facts.path) line(facts.version ? OK : NO, `${name}: ${path(facts.path)}${facts.version ? `, ${plain(facts.version)}` : ' does not answer --version'}`)
    else line(name === 'kpsewhich' ? INFO : NO, `${name}: not found on PATH${missing}`)
  }
  tool('latex', d.latex, '')
  tool('dvisvgm', d.dvisvgm, '')
  tool('kpsewhich', d.kpsewhich, ": the packages can't be checked")
  if (d.files) {
    const missing = d.files.filter(file => !file.path).map(file => file.name)
    if (missing.length === 0) {
      line(OK, `packages: all ${d.files.length} found (TikZ, pgfplots, tikz-cd, circuitikz, chemfig, siunitx...)`)
    } else {
      const need = (name: string) => TEX_FILES.find(file => file.name === name)?.need
      const pictures = missing.filter(name => need(name) === 'pictures')
      const math = missing.filter(name => need(name) === 'math')
      const speed = missing.filter(name => need(name) === 'speed')
      if (pictures.length > 0) line(NO, `missing ${pictures.map(code).join(', ')}: no diagram compiles without ${pictures.length === 1 ? 'it' : 'them'} (one preamble loads every picture package)`)
      if (math.length > 0) line(NO, `missing ${math.map(code).join(', ')}: math MathJax refuses can't be drawn by TeX`)
      if (speed.length > 0) line(NO, `missing ${speed.map(code).join(', ')}: no format, so each picture loads its packages (about twice as slow)`)
      const ps = missing.filter(name => need(name) === 'postscript')
      if (ps.length > 0) line(INFO, `missing ${ps.map(code).join(', ')}: a whole document that rotates or scales (graphicx) can't be drawn where dvisvgm runs Ghostscript`)
      const present = d.files.length - missing.length
      if (present > 0) line(OK, `${present} of ${d.files.length} packages found`)
    }
  }
  if (linux) {
    const b = d.bwrap
    const p = d.prlimit
    const bound = b?.sandbox?.binds ?? []
    if (b?.usable) line(OK, `bubblewrap: TeX runs with your home, /tmp and /run hidden${bound.length > 0 ? ` (but for ${bound.map(path).join(', ')}, bound read-only)` : ''}, and no network`)
    else if (b?.path && d.option === 'auto' && b.error !== undefined) line(NO, `bubblewrap can't run TeX here (${plain(b.error)}): kittex runs TeX without it, so TeX can read any file you can (kittex still refuses diagrams that read a file by its path)`)
    else if (b?.path) line(INFO, 'bubblewrap: found (not tried: Local LaTeX is off or TeX is missing)')
    else line(NO, 'bubblewrap: not found: TeX can read any file you can (kittex still refuses diagrams that read a file by its path)')
    if (p?.path) line(OK, 'prlimit: TeX runs under a CPU-time and a file-size limit')
    else if (d.ulimit) line(OK, "prlimit: not found: sh's ulimit sets the CPU-time and file-size limits instead")
    else line(NO, 'prlimit: not found: no CPU or file-size limit, only the time limit')
  } else {
    const limits = d.ulimit ? "a CPU-time and a file-size limit (sh's ulimit)" : 'no CPU-time or file-size limit'
    line(INFO, `confinement: no bubblewrap on macOS. TeX runs as you, with its shell escape off, writes kept to its job folder, a time limit, and ${limits}; kittex refuses diagrams that read a file by its path, but nothing hides your files from TeX.`)
  }
  if (d.libgs === false) line(INFO, 'dvisvgm has no --libgs option here: kittex leaves it out')
  if (d.postscript) line(INFO, `this dvisvgm runs PostScript through its own Ghostscript, without -dSAFER, whatever it is told (3.5 to 3.6.1): kittex's pictures hold none; a document that rotates or scales ${d.bwrap?.usable ? 'runs inside bubblewrap' : 'is refused, as there is no sandbox'}`)
  if (d.format) {
    if (d.format.bytes !== undefined && d.format.bytes > 0) line(OK, `format: built, ${path(d.format.path)} (${bytes(d.format.bytes)})`)
    else line(INFO, `format: not built yet${d.files?.some(file => file.name === 'mylatexformat.ltx' && !file.path) ? ' (needs mylatexformat)' : ': kittex dumps it in the background once a session finds TeX'}`)
  }
  const trial = d.trial
  if ('skipped' in trial) line(INFO, `trial picture: skipped${trial.skipped ? ` (${plain(trial.skipped)})` : ''}`)
  else if (trial.ok) line(OK, `trial picture: drawn in ${seconds(trial.ms)}${trial.format ? '' : ' (without the format)'}`)
  else line(NO, `trial picture: failed after ${seconds(trial.ms)}: ${plain(trial.error)}`)
  const ready = d.latex.version !== undefined && d.dvisvgm.version !== undefined
  if (ready && !d.found && d.option === 'auto' && d.drawn) line(INFO, 'this session started before TeX was there: restart Claude Code to draw diagrams')

  // Cache
  section('Cache')
  const c = facts.cache
  if (!c.dir) line(INFO, 'no cache directory (neither XDG_CACHE_HOME nor HOME is set)')
  else if (c.bytes === undefined && c.files === undefined) line(INFO, `${path(c.dir)}: empty`)
  else {
    line(INFO, `${path(c.dir)}: ${c.bytes !== undefined ? bytes(c.bytes) : 'size unknown'}${c.files !== undefined ? ` in ${c.files} ${c.files === 1 ? 'file' : 'files'}` : ''}`)
    const part = (p: CachePart) => `${p.bytes !== undefined ? bytes(p.bytes) : 'size unknown'} in ${p.files} ${p.files === 1 ? 'file' : 'files'}`
    if (c.images) line(INFO, `images of resumed replies: ${c.images.files === 0 ? 'none' : part(c.images)} (the oldest go past ${CACHE_LIMIT_BYTES / 2 ** 20} MiB)`)
    if (c.tex) line(INFO, `pictures TeX drew: ${c.tex.files === 0 ? 'none' : part(c.tex)} (the oldest go past ${TEX_CACHE_LIMIT_BYTES / 2 ** 20} MiB)`)
    if (c.format) line(INFO, `TeX format: ${c.format.files === 0 ? 'none' : part(c.format)} (kept; replaced when TeX changes)`)
  }

  // What to install
  const missing = [
    ...(d.latex.path ? [] : ['latex']),
    ...(d.dvisvgm.path ? [] : ['dvisvgm']),
    ...(d.kpsewhich.path || !d.latex.path ? [] : ['kpsewhich']),
    ...(d.files ?? []).filter(file => !file.path).map(file => file.name),
    ...(linux && !d.bwrap?.path ? ['bwrap'] : []),
    ...(linux && !d.prlimit?.path && !d.ulimit ? ['prlimit'] : []),
  ]
  const advice = d.option === 'off' ? undefined : installAdvice(os, missing, d.latex.path)
  if (advice && advice.commands.length + (advice.note ? 1 : 0) > 0) {
    section(`${advice.confineOnly ? 'To confine TeX' : 'To enable diagrams'} (${plain(advice.label)})`)
    if (advice.commands.length > 0) out.push('```sh', ...advice.commands, '```')
    if (advice.note) out.push(advice.note)
    out.push('Then restart Claude Code and run /kittex-doctor again.')
  }
  return out.join('\n')
}
