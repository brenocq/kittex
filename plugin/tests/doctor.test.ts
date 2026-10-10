// /kittex-doctor: the OS and the install commands it maps to, the probes on a
// fake host (each missing piece), the report's lines, and the command through
// the engine.

import { describe, expect } from 'claude-code/testing'

import {
  DOCTOR_COMMAND,
  formatDoctor,
  installAdvice,
  installFamily,
  osFacts,
  parseOsRelease,
  plain,
  probeCache,
  probeDiagrams,
  TEX_FILES,
  TRIAL_PICTURE,
} from '../hooks/doctor.ts'
import type { DiagramFacts, DoctorFacts, DoctorHost, OsFacts } from '../hooks/doctor.ts'
import { formatName } from '../hooks/core.js'
import { startSession, test } from './support.ts'
import { TIKZ_DVI } from './fixtures/dvi.ts'

const ARCH = osFacts('Linux\n', 'NAME="Arch Linux"\nPRETTY_NAME="Arch Linux"\nID=arch\n')
const DEBIAN = osFacts('Linux', 'PRETTY_NAME="Debian GNU/Linux 13 (trixie)"\nID=debian\n')
const UBUNTU = osFacts('Linux', 'PRETTY_NAME="Ubuntu 24.04.5 LTS"\nID=ubuntu\nID_LIKE=debian\n')
const FEDORA = osFacts('Linux', 'PRETTY_NAME="Fedora Linux 44 (Workstation Edition)"\nID=fedora\n')
const MACOS = osFacts('Darwin', undefined)
const NIXOS = osFacts('Linux', 'PRETTY_NAME="NixOS 25.05"\nID=nixos\n')

/** Every requirement a host with no TeX lacks, as the report computes them. */
const NOTHING = ['latex', 'dvisvgm', ...TEX_FILES.map(file => file.name), 'bwrap']

describe('the OS and its install commands', () => {
  test('os-release is read, quotes and all', () => {
    expect(parseOsRelease('NAME="Linux Mint"\nID=linuxmint\nID_LIKE="ubuntu debian"\n# comment\n')).toEqual({ NAME: 'Linux Mint', ID: 'linuxmint', ID_LIKE: 'ubuntu debian' })
    expect(osFacts('Linux', 'ID=linuxmint\nID_LIKE="ubuntu debian"')).toEqual({ platform: 'linux', id: 'linuxmint', idLike: ['ubuntu', 'debian'] })
    expect(osFacts(undefined, undefined)).toEqual({})
  })

  test('each OS gets its own way to install TeX', () => {
    expect(installFamily(ARCH)).toBe('arch')
    expect(installFamily(osFacts('Linux', 'ID=manjaro\nID_LIKE=arch'))).toBe('arch')
    expect(installFamily(DEBIAN)).toBe('debian')
    expect(installFamily(UBUNTU)).toBe('debian')
    expect(installFamily(osFacts('Linux', 'ID=pop\nID_LIKE="ubuntu debian"'))).toBe('debian')
    expect(installFamily(FEDORA)).toBe('fedora')
    // RHEL and its rebuilds lack several of the packages: TeX Live's way.
    expect(installFamily(osFacts('Linux', 'ID=rocky\nID_LIKE="rhel centos fedora"'))).toBe('texlive')
    expect(installFamily(MACOS)).toBe('macos')
    expect(installFamily(NIXOS)).toBe('texlive')
    // TeX Live from its own installer, on any distribution: tlmgr.
    expect(installFamily(DEBIAN, '/usr/local/texlive/2026/bin/x86_64-linux/latex')).toBe('texlive')
    expect(installFamily(DEBIAN, '/usr/bin/latex')).toBe('debian')
  })

  test('no TeX at all: everything the documents load, dvisvgm and bubblewrap, in one command per OS', () => {
    expect(installAdvice(ARCH, NOTHING)?.commands).toEqual([
      'sudo pacman -S --needed texlive-basic texlive-latex texlive-latexrecommended texlive-latexextra texlive-pictures texlive-mathscience texlive-plaingeneric dvisvgm bubblewrap',
    ])
    expect(installAdvice(DEBIAN, NOTHING)?.commands).toEqual([
      'sudo apt install texlive-latex-extra texlive-pictures texlive-science texlive-plain-generic preview-latex-style dvisvgm bubblewrap',
    ])
    expect(installAdvice(UBUNTU, NOTHING)).toMatchObject({ label: 'Ubuntu 24.04.5 LTS', commands: [expect.stringMatching(/^sudo apt install /)] })
    expect(installAdvice(FEDORA, NOTHING)?.commands).toEqual([
      'sudo dnf install texlive-latex texlive-dvisvgm texlive-standalone texlive-amsmath texlive-amsfonts texlive-pgf texlive-pgfplots texlive-tikz-cd texlive-circuitikz texlive-chemfig texlive-simplekv texlive-siunitx texlive-dvips texlive-mathtools texlive-preview texlive-mylatexformat bubblewrap',
    ])
    const mac = installAdvice(MACOS, NOTHING.filter(name => name !== 'bwrap'))
    expect(mac?.commands).toEqual([
      'brew install --cask basictex',
      'sudo /Library/TeX/texbin/tlmgr update --self',
      'sudo /Library/TeX/texbin/tlmgr install dvisvgm standalone amsmath amsfonts pgf pgfplots tikz-cd circuitikz chemfig simplekv siunitx dvips mathtools preview mylatexformat',
    ])
    expect(mac?.note).toContain('brew install --cask mactex-no-gui')
    const nix = installAdvice(NIXOS, NOTHING)
    expect(nix?.commands).toEqual(['tlmgr install dvisvgm standalone amsmath amsfonts pgf pgfplots tikz-cd circuitikz chemfig simplekv siunitx dvips mathtools preview mylatexformat'])
    expect(nix?.note).toMatch(/Install TeX Live first.*`bubblewrap`/)
  })

  test('a partial install gets only the packages that ship what is missing', () => {
    expect(installAdvice(DEBIAN, ['chemfig.sty', 'simplekv.tex'])).toMatchObject({ confineOnly: false, commands: ['sudo apt install texlive-pictures texlive-plain-generic'] })
    expect(installAdvice(ARCH, ['siunitx.sty'])?.commands).toEqual(['sudo pacman -S --needed texlive-mathscience'])
    expect(installAdvice(FEDORA, ['tex.pro'])?.commands).toEqual(['sudo dnf install texlive-dvips'])
    expect(installAdvice(MACOS, ['mylatexformat.ltx'])?.commands).toEqual(['sudo tlmgr install mylatexformat'])
    expect(installAdvice(DEBIAN, ['latex'], undefined)?.commands[0]).toContain('texlive-latex-extra')
    // An installer's TeX Live: tlmgr, and bubblewrap from the distribution.
    const tl = installAdvice(DEBIAN, ['pgfplots.sty', 'bwrap'], '/opt/texlive/2026/bin/x86_64-linux/latex')
    expect(tl?.commands).toEqual(['tlmgr install pgfplots'])
    expect(tl?.note).toContain('`bubblewrap`')
  })

  test('only confinement missing: the confinement package, under its own heading', () => {
    expect(installAdvice(UBUNTU, ['bwrap'])).toMatchObject({ confineOnly: true, commands: ['sudo apt install bubblewrap'] })
    expect(installAdvice(ARCH, ['bwrap', 'prlimit'])?.commands).toEqual(['sudo pacman -S --needed bubblewrap util-linux'])
    expect(installAdvice(ARCH, [])).toBeUndefined()
  })
})

// ─── The probes, on a fake host ───────────────────────────────────────────────

interface FakeOptions {
  /** Commands not on PATH. */
  missing?: string[]
  /** Files kpsewhich doesn't find. */
  noFiles?: string[]
  /** bubblewrap's trial namespace fails with this. */
  bwrapError?: string
  /** dvisvgm's --help lists --libgs. */
  libgs?: boolean
  /** The dumped format is there. */
  format?: boolean
  /** latex fails on the trial with this log line. */
  texError?: string
  /** TeX Live installed here (its programs found through /usr/bin links). */
  texRoot?: string
  /** dvisvgm -V1 names a Ghostscript it links. */
  linkedGs?: boolean
}

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20pt" height="10pt" viewBox="0 0 20 10"><path d="M0 0L20 10" stroke="#000" stroke-width="1"/></svg>'
const LATEX_VERSION = 'pdfTeX 3.141592653-2.6-1.40.29 (TeX Live 2026)'
const DVISVGM_VERSION = 'dvisvgm 3.6'
const ENV = { PATH: '/usr/local/bin:/usr/bin', HOME: '/home/u', TMPDIR: undefined, XDG_CACHE_HOME: undefined }
const HIDE = ['/home/u', '/tmp', '/var/tmp', '/run']

function fakeHost(options: FakeOptions = {}) {
  const runs: string[][] = []
  const writes = new Map<string, string>()
  const missing = new Set(options.missing ?? [])
  const result = (exitCode: number, stdout = '', stderr = '') => ({ exitCode, stdout, stderr, isStdoutTruncated: false })
  const host: DoctorHost = {
    run: async argv => {
      runs.push([...argv])
      // Confined commands: past bwrap's and prlimit's own arguments.
      const at = argv.findIndex(arg => arg === 'latex' || arg === 'dvisvgm' || arg === 'mktemp' || arg === 'rm')
      const name = at >= 0 && (argv[0] === 'bwrap' || argv[0] === 'prlimit' || argv[0] === '/bin/sh') ? argv[at]! : argv[0]!
      if (missing.has(name) || (argv.includes('bwrap') && missing.has('bwrap'))) throw new Error('not found')
      const args = argv.slice(at >= 0 && name === argv[at] ? at + 1 : 1)
      // The sandbox's trial (latex \stop inside bubblewrap).
      if (argv[0] === 'bwrap' || argv.includes('bwrap')) {
        if (options.bwrapError && name === 'latex') return result(1, '', `bwrap: ${options.bwrapError}\n`)
      }
      switch (name) {
        case 'realpath':
          if (options.texRoot && args[0] === '-e') {
            const real = args.slice(2).flatMap(arg => (/\/(latex|dvisvgm)$/.test(arg) ? [`${options.texRoot}/bin/x86_64-linux/${arg.split('/').pop()}`] : arg.includes('/.config/') ? [] : [arg]))
            return result(0, `${[...new Set(real)].join('\n')}\n`)
          }
          return result(0, args.filter(arg => arg.startsWith('/') && !(arg.startsWith('/usr/local/bin/') || [...missing].some(gone => arg.endsWith(`/${gone}`)))).join('\n') + '\n')
        case 'ldd':
          return result(0, '\tlibc.so.6 => /usr/lib/libc.so.6 (0x7f00)\n\t/lib64/ld-linux-x86-64.so.2 (0x7f01)\n')
        case 'latex':
          if (args[0] === '--version') return result(0, `${LATEX_VERSION}\nkpathsea version 6.4.2\n`)
          if (args.at(-1) === '\\stop') return result(0, 'No pages of output.')
          return options.texError ? result(1, `! ${options.texError}.\nl.12 x\n`) : result(0, 'Output written on kittex.dvi')
        case 'dvisvgm':
          if (args[0] === '--version') return result(0, `${DVISVGM_VERSION}\n`)
          if (args[0] === '--help') return result(0, `  -S, --no-specials[=prefixes]  don't process specials\n${options.libgs ? '      --libgs=filename  set name of Ghostscript shared library\n' : ''}`)
          if (args[0] === '-V1') return result(0, `${DVISVGM_VERSION}\n${options.linkedGs ? 'Ghostscript: 10.08.0\n' : ''}`)
          return args.includes('--libgs=/tmp/kittex-tex.ABCDEFGHIJ/no-ghostscript') && !options.libgs ? result(1, '', 'ERROR: unknown option --libgs') : result(0, SVG)
        case 'kpsewhich':
          if (args[0] === '--version') return result(0, 'kpathsea version 6.4.2\n')
          if (args[0]?.startsWith('-expand-braces=')) return result(0, options.texRoot ? `${options.texRoot}:/tmp/kittex-tex.probe/.config/texlive/texmf:!!${options.texRoot}/texmf-dist\n` : '!!/usr/share/texmf-dist:/usr/share/texmf\n')
          return result(options.noFiles?.length ? 1 : 0, args.filter(file => !options.noFiles?.includes(file)).map(file => `/usr/share/texmf-dist/tex/${file}`).join('\n') + '\n')
        case 'prlimit':
          return result(0, 'prlimit from util-linux 2.41\n')
        case '/bin/sh':
          return result(0)
        case 'mktemp':
          return result(0, '/tmp/kittex-tex.ABCDEFGHIJ\n')
        case 'rm':
          return result(0)
        case 'du':
          return result(0, args.slice(1).map(path => `${path.endsWith('/fmt') ? 1024 : path.endsWith('/tex') ? 1536 : 2048}\t${path}\n`).join(''))
        case 'find':
          return result(0, `${args[0]}/tex/a.json\n${args[0]}/tex/fmt/x.fmt\n${args[0]}/b.json\n`)
        default:
          return result(1)
      }
    },
    write: async (path, text) => void writes.set(path, text),
    read: async () => undefined,
    exists: async path => {
      const name = path.split('/').pop()!
      if (path.startsWith('/usr/bin/')) return !missing.has(name) && ['latex', 'dvisvgm', 'kpsewhich', 'bwrap', 'prlimit'].includes(name)
      return path === '/home/u/.cache/kittex'
    },
    size: async path => (options.format && path.endsWith('.fmt') ? 10_800_000 : undefined),
    readBytes: async () => (Uint8Array as unknown as { fromBase64(text: string): Uint8Array }).fromBase64(TIKZ_DVI),
  }
  return { host, runs, writes }
}

const probe = (host: DoctorHost, os: OsFacts = ARCH, option: 'auto' | 'off' = 'auto') => probeDiagrams(host, { option, drawn: true, found: true, os, env: ENV, hide: HIDE })

describe('the probes', () => {
  test('everything there: paths, versions, every file, confinement, the format and the trial picture', async () => {
    const { host, runs, writes } = fakeHost({ libgs: true, format: true })
    const facts = await probe(host)
    expect(facts.latex).toEqual({ path: '/usr/bin/latex', version: LATEX_VERSION })
    expect(facts.dvisvgm).toEqual({ path: '/usr/bin/dvisvgm', version: DVISVGM_VERSION })
    expect(facts.files?.every(file => file.path !== undefined)).toBe(true)
    expect(facts.bwrap).toEqual({ path: '/usr/bin/bwrap', usable: true, sandbox: { binds: [], path: '/usr/bin:/usr/local/bin' } })
    expect(facts.prlimit?.path).toBe('/usr/bin/prlimit')
    expect(facts.libgs).toBe(true)
    const name = formatName(`${LATEX_VERSION}\n${DVISVGM_VERSION}`)
    expect(facts.format).toEqual({ path: `/home/u/.cache/kittex/tex/fmt/${name}.fmt`, bytes: 10_800_000 })
    expect(facts.trial).toMatchObject({ ok: true, format: true })
    // The trial runs confined, from the format, and TeX sees only the fixed picture.
    const latex = runs.find(argv => argv.includes('-jobname=kittex'))!
    expect(latex.slice(0, 2)).toEqual(['prlimit', expect.stringMatching(/^--fsize=/)])
    expect(latex).toContain('bwrap')
    expect(latex).toContain(`-fmt=${name}`)
    expect([...writes.values()]).toHaveLength(1)
    expect([...writes.values()][0]).toContain(TRIAL_PICTURE)
  })

  test('no TeX: nothing compiles and nothing is looked up', async () => {
    const { host, runs } = fakeHost({ missing: ['latex', 'dvisvgm', 'kpsewhich'] })
    const facts = await probe(host)
    expect(facts.latex).toEqual({})
    expect(facts.files).toBeUndefined()
    expect(facts.trial).toEqual({ skipped: 'no latex' })
    expect(runs.some(argv => argv[0] === 'mktemp')).toBe(false)
  })

  test('missing packages are named; the trial says what TeX said', async () => {
    const { host } = fakeHost({ noFiles: ['chemfig.sty', 'simplekv.tex'], texError: "LaTeX Error: File `chemfig.sty' not found" })
    const facts = await probe(host)
    expect(facts.files?.filter(file => !file.path).map(file => file.name)).toEqual(['chemfig.sty', 'simplekv.tex'])
    expect(facts.trial).toMatchObject({ ok: false, error: expect.stringContaining('chemfig.sty') })
  })

  test("a dvisvgm without --libgs runs without it (Arch's, Debian's, Fedora's)", async () => {
    const { host, runs } = fakeHost({ libgs: false })
    const facts = await probe(host)
    expect(facts.libgs).toBe(false)
    expect(facts.trial).toMatchObject({ ok: true, format: false })
    const dvisvgm = runs.find(argv => argv.includes('dvisvgm') && argv.includes('--stdout'))!
    expect(dvisvgm.some(arg => arg.startsWith('--libgs'))).toBe(false)
  })

  test("bubblewrap that cannot run, and no prlimit: the trial runs outside any namespace, under sh's ulimit", async () => {
    const { host, runs } = fakeHost({ missing: ['prlimit'], bwrapError: 'setting up uid map: Permission denied', libgs: true })
    const facts = await probe(host)
    expect(facts.bwrap).toEqual({ path: '/usr/bin/bwrap', usable: false, error: 'latex in the sandbox: bwrap: setting up uid map: Permission denied' })
    expect(facts.prlimit).toEqual({})
    const latex = runs.find(argv => argv.includes('-jobname=kittex'))!
    expect(latex.includes('bwrap')).toBe(false)
    expect(latex.slice(0, 2)).toEqual(['/bin/sh', '-c'])
    // Without sh either: unconfined.
    const bare = fakeHost({ missing: ['prlimit', '/bin/sh'], bwrapError: 'setting up uid map: Permission denied', libgs: true })
    await probe(bare.host)
    expect(bare.runs.find(argv => argv.includes('-jobname=kittex'))![0]).toBe('latex')
  })

  test("macOS: no bubblewrap or prlimit is looked for; sh's ulimit sets the limits, the trial runs under them", async () => {
    const { host, runs } = fakeHost({ libgs: true })
    const facts = await probe(host, MACOS)
    expect(facts.bwrap).toBeUndefined()
    expect(facts.prlimit).toBeUndefined()
    expect(facts.ulimit).toBe(true)
    expect(runs.some(argv => argv[0] === 'bwrap' || argv[0] === 'prlimit')).toBe(false)
    const latex = runs.find(argv => argv.includes('-jobname=kittex'))!
    expect(latex.slice(0, 2)).toEqual(['/bin/sh', '-c'])
    expect(latex.slice(4, 5)).toEqual(['latex'])
    // Where sh can't set them: said.
    const without = await probe(fakeHost({ libgs: true, missing: ['/bin/sh'] }).host, MACOS)
    expect(without.ulimit).toBe(false)
  })

  test("Linux without prlimit: sh's ulimit sets the limits instead, and util-linux isn't asked for", async () => {
    const diagrams = await probe(fakeHost({ libgs: true, missing: ['prlimit'] }).host)
    expect(diagrams.ulimit).toBe(true)
    const text = formatDoctor(facts(diagrams))
    expect(text).toContain("✓ prlimit: not found: sh's ulimit sets the CPU-time and file-size limits instead")
    expect(text).not.toContain('To confine TeX')
  })

  test("macOS: MacTeX's /Library/TeX/texbin is looked in when PATH lacks it (a terminal from the Dock, a shell that resets PATH)", async () => {
    const { host: base, runs } = fakeHost({ libgs: true })
    const TEXBIN = '/Library/TeX/texbin'
    const tex = ['latex', 'dvisvgm', 'kpsewhich', 'tlmgr']
    // TeX is only in texbin: a command finds it only on a PATH that holds it (as $.process.run looks a command up).
    const host: DoctorHost = {
      ...base,
      run: async (argv, init) => {
        if (tex.includes(argv[0]!) && !(init.env?.PATH ?? ENV.PATH).split(':').includes(TEXBIN)) throw new Error('ENOENT: Executable not found in $PATH')
        return base.run(argv, init)
      },
      exists: async path => (path.startsWith(`${TEXBIN}/`) ? tex.includes(path.split('/').pop()!) : path.startsWith('/usr/bin/') ? false : base.exists(path)),
    }
    const facts = await probe(host, MACOS)
    expect(facts.latex).toEqual({ path: `${TEXBIN}/latex`, version: LATEX_VERSION })
    expect(facts.dvisvgm).toEqual({ path: `${TEXBIN}/dvisvgm`, version: DVISVGM_VERSION })
    expect(facts.kpsewhich.path).toBe(`${TEXBIN}/kpsewhich`)
    expect(facts.files?.every(file => file.path)).toBe(true)
    expect(facts.trial).toMatchObject({ ok: true })
    expect(runs.some(argv => argv.includes('latex') && argv.includes('-jobname=kittex'))).toBe(true)
    // Linux has no such folder: PATH as it is.
    const linux = await probe(host, ARCH)
    expect(linux.latex).toEqual({})
  })

  test('Local LaTeX off: TeX is looked for, never run', async () => {
    const { host, runs } = fakeHost({ libgs: true })
    const facts = await probe(host, ARCH, 'off')
    expect(facts.trial).toEqual({ skipped: 'Local LaTeX is off' })
    expect(runs.some(argv => argv.includes('latex') && !argv.includes('--version'))).toBe(false)
  })

  test('the cache: its size and files', async () => {
    const { host } = fakeHost()
    expect(await probeCache(host, ENV)).toEqual({
      dir: '/home/u/.cache/kittex',
      bytes: 2048 * 1024,
      files: 3,
      images: { bytes: 512 * 1024, files: 1 },
      tex: { bytes: 512 * 1024, files: 1 },
      format: { bytes: 1024 * 1024, files: 1 },
    })
    expect(await probeCache(host, { HOME: '/home/v' })).toEqual({ dir: '/home/v/.cache/kittex' })
    expect(await probeCache(host, {})).toEqual({})
  })
})

// ─── The report ───────────────────────────────────────────────────────────────

function facts(diagrams: DiagramFacts, overrides: Partial<DoctorFacts> = {}): DoctorFacts {
  return {
    kittex: { version: '0.1.0', build: '0123456789abcdef' },
    claudeCode: '2.1.292',
    surface: 'terminal',
    terminal: {
      kind: 'kitty',
      images: true,
      program: 'kitty 0.39.1',
      cell: { width: 13, height: 26, measured: true },
      font: { file: '/usr/share/fonts/TTF/RobotoMono-Medium.ttf', sizePt: 11, source: 'kitty', metrics: true },
      ink: '#ebdbb2',
      background: '#282828',
      colors: 'terminal',
    },
    streaming: { off: false, streamed: 2, unstreamed: 0, section: true, managed: false },
    options: { block: 'image', inline: 'image', latex: 'auto', cache: 'on' },
    diagrams,
    cache: { dir: '/home/u/.cache/kittex', bytes: 3_100_000, files: 154 },
    os: ARCH,
    home: '/home/u',
    ...overrides,
  }
}

const allThere = async (os: OsFacts = ARCH) => probe(fakeHost({ libgs: true, format: true }).host, os)
const noTex = async (os: OsFacts = ARCH) => probe(fakeHost({ missing: ['latex', 'dvisvgm', 'kpsewhich'] }).host, os)

describe('the report', () => {
  test('all good: a mark per line, no install section, no markdown or math surprises', async () => {
    const text = formatDoctor(facts(await allThere()))
    expect(text.split('\n')[0]).toBe('0.1.0 (build 0123456789abcdef) · Claude Code 2.1.292 · terminal surface')
    expect(text).toContain('✓ kitty (0.39.1): kitty graphics with Unicode placeholders')
    expect(text).toContain('✓ cell 13×26 px, measured')
    expect(text).toContain('✓ font RobotoMono-Medium.ttf 11 pt: metrics read from `/usr/share/fonts/TTF/RobotoMono-Medium.ttf` (kitty names it)')
    expect(text).toContain('✓ live: replies reach kittex as they stream')
    expect(text).toContain('block `image` · inline `image` · latex `auto` · cache `on`')
    expect(text).toContain(`✓ latex: \`/usr/bin/latex\`, ${LATEX_VERSION}`)
    expect(text).toMatch(/✓ packages: all \d+ found/)
    expect(text).toContain('✓ bubblewrap: TeX runs with your home, /tmp and /run hidden, and no network')
    expect(text).toMatch(/✓ format: built, `~\/\.cache\/kittex\/tex\/fmt\/kittex-[0-9a-f]{8}\.fmt` \(10\.8 MB\)/)
    expect(text).toMatch(/✓ trial picture: drawn in \d\.\d\d s/)
    expect(text).toContain('– `~/.cache/kittex`: 3.1 MB in 154 files')
    expect(text).not.toContain('To enable diagrams')
    // The parts, when the probe tells them apart: the TeX format apart from the images it never counts against.
    const parts = formatDoctor(facts(await allThere(), {
      cache: { dir: '/home/u/.cache/kittex', bytes: 14_000_000, files: 160, images: { bytes: 2_900_000, files: 150 }, tex: { bytes: 300_000, files: 9 }, format: { bytes: 10_800_000, files: 1 } },
    }))
    expect(parts).toContain('– `~/.cache/kittex`: 14.0 MB in 160 files')
    expect(parts).toContain('– images of resumed replies: 2.9 MB in 150 files (the oldest go past 50 MiB)')
    expect(parts).toContain('– pictures TeX drew: 300 kB in 9 files (the oldest go past 20 MiB)')
    expect(parts).toContain('– TeX format: 10.8 MB in 1 file (kept; replaced when TeX changes)')
    expect(text).not.toContain('$')
    expect(text).not.toContain('✗')
  })

  test("Ghostty's font on macOS: found by CoreText, or not known to it", async () => {
    const d = await allThere(MACOS)
    const ghostty = (font: NonNullable<DoctorFacts['terminal']>['font']) =>
      formatDoctor(facts(d, { os: MACOS, home: '/Users/u', terminal: { kind: 'ghostty', images: true, program: 'ghostty 1.3.1', cell: { width: 7, height: 14, measured: true }, font, colors: 'terminal' } }))
    expect(ghostty({ family: 'Menlo', sizePt: 12, file: '/System/Library/Fonts/Menlo.ttc', source: 'coretext', metrics: true })).toContain('✓ font Menlo 12 pt: metrics read from `/System/Library/Fonts/Menlo.ttc` (CoreText matched it)')
    expect(ghostty({ family: 'Nonexistent', sizePt: 12, source: 'ghostty', metrics: true })).toContain("– font Nonexistent 12 pt: CoreText doesn't know it, so the math follows Ghostty's built-in JetBrains Mono")
  })

  test('no TeX: each missing command, then the command for this OS in a code block', async () => {
    const text = formatDoctor(facts(await noTex()))
    expect(text).toContain('✗ latex: not found on PATH')
    expect(text).toContain('✗ dvisvgm: not found on PATH')
    expect(text).toContain("– kpsewhich: not found on PATH: the packages can't be checked")
    expect(text).toContain('– trial picture: skipped (no latex)')
    expect(text).toContain('**To enable diagrams (Arch Linux)**\n```sh\nsudo pacman -S --needed texlive-basic texlive-latex ')
    expect(text).toContain('```\nThen restart Claude Code and run /kittex-doctor again.')
    expect(formatDoctor(facts(await noTex(UBUNTU), { os: UBUNTU }))).toContain('**To enable diagrams (Ubuntu 24.04.5 LTS)**\n```sh\nsudo apt install ')
    expect(formatDoctor(facts(await noTex(FEDORA), { os: FEDORA }))).toContain('```sh\nsudo dnf install texlive-latex ')
    const mac = formatDoctor(facts(await noTex(MACOS), { os: MACOS }))
    expect(mac).toContain('**To enable diagrams (macOS)**\n```sh\nbrew install --cask basictex\n')
    expect(mac).toContain('`brew install --cask mactex-no-gui`')
  })

  test('missing packages: what each costs, and only their packages to install', async () => {
    const diagrams = await probe(fakeHost({ noFiles: ['chemfig.sty', 'mylatexformat.ltx'], libgs: true }).host, DEBIAN)
    const text = formatDoctor(facts(diagrams, { os: DEBIAN }))
    expect(text).toContain('✗ missing `chemfig.sty`: no diagram compiles without it (one preamble loads every picture package)')
    expect(text).toContain('✗ missing `mylatexformat.ltx`: no format, so each picture loads its packages (about twice as slow)')
    expect(text).toContain('```sh\nsudo apt install texlive-pictures texlive-latex-extra\n```')
  })

  test('confinement: bubblewrap missing or refused, and macOS, said plainly', async () => {
    const missing = formatDoctor(facts(await probe(fakeHost({ missing: ['bwrap'], libgs: true }).host)))
    expect(missing).toContain('✗ bubblewrap: not found: TeX can read any file you can')
    expect(missing).toContain('**To confine TeX (Arch Linux)**\n```sh\nsudo pacman -S --needed bubblewrap\n```')
    const refused = formatDoctor(facts(await probe(fakeHost({ bwrapError: 'setting up uid map: Permission denied', libgs: true }).host)))
    expect(refused).toContain("✗ bubblewrap can't run TeX here (latex in the sandbox: bwrap: setting up uid map: Permission denied): kittex runs TeX without it")
    const mac = formatDoctor(facts(await allThere(MACOS), { os: MACOS }))
    expect(mac).toContain("– confinement: no bubblewrap on macOS. TeX runs as you, with its shell escape off, writes kept to its job folder, a time limit, and a CPU-time and a file-size limit (sh's ulimit)")
    expect(formatDoctor(facts({ ...(await allThere(MACOS)), ulimit: false }, { os: MACOS }))).toContain('a time limit, and no CPU-time or file-size limit')
    expect(mac).toContain('nothing hides your files from TeX')
    expect(mac).not.toContain('To confine TeX')
  })

  test('TeX Live inside the home folder: its tree, and only it, is bound back into the sandbox', async () => {
    const { host, runs } = fakeHost({ texRoot: '/home/u/texlive/2026', libgs: true })
    const diagrams = await probe(host)
    expect(diagrams.bwrap).toMatchObject({ usable: true, sandbox: { binds: ['/home/u/texlive/2026'], path: '/home/u/texlive/2026/bin/x86_64-linux:/usr/local/bin:/usr/bin' } })
    const latex = runs.find(argv => argv.includes('-jobname=kittex'))!
    expect(latex.join(' ')).toContain('--ro-bind /home/u/texlive/2026 /home/u/texlive/2026')
    expect(latex.join(' ')).not.toContain('--ro-bind /home/u /home/u')
    expect(formatDoctor(facts(diagrams))).toContain('✓ bubblewrap: TeX runs with your home, /tmp and /run hidden (but for `~/texlive/2026`, bound read-only), and no network')
  })

  test("a dvisvgm that can't keep Ghostscript out: said, and kittex's pictures still drawn", async () => {
    const diagrams = await probe(fakeHost({ linkedGs: true, missing: ['bwrap'] }).host)
    expect(diagrams.postscript).toBe(true)
    expect(diagrams.trial).toMatchObject({ ok: true })
    expect(formatDoctor(facts(diagrams))).toContain("this dvisvgm runs PostScript through its own Ghostscript, without -dSAFER, whatever it is told (3.5 to 3.6.1): kittex's pictures hold none; a document that rotates or scales is refused, as there is no sandbox")
  })

  test('streaming: live, bypassed, likely bypassed, not seen yet, off', async () => {
    const d = await allThere()
    const streaming = (s: Partial<DoctorFacts['streaming']>) => formatDoctor(facts(d, { streaming: { off: false, streamed: 0, unstreamed: 0, section: true, managed: false, ...s } }))
    expect(streaming({ unstreamed: 2, section: false, managed: true })).toMatch(/✗ bypassed: 2 replies streamed without reaching kittex \(cc-plugin-sec-default, seated by managed settings, .*Fix: ask an admin to deploy kittex through Claude Code's managed settings\./)
    expect(streaming({ unstreamed: 2, section: false })).toContain('– instructions to Claude ride your first message')
    expect(streaming({ section: false })).toMatch(/✗ likely bypassed: kittex's system-prompt section is skipped here.*Fix:/)
    expect(streaming({})).toContain('– no reply has streamed yet this session')
    expect(streaming({ off: true })).toContain('– kittex is off: Block math and Inline math are both raw')
  })

  test('a terminal without images: why, what kittex does instead, and where images work', async () => {
    const d = await allThere()
    const tmux = formatDoctor(facts(d, { terminal: { kind: 'kitty', images: false, multiplexer: 'tmux', colors: 'theme', ink: '#ffffff' } }))
    expect(tmux).toContain("✗ kitty (inside tmux): tmux doesn't pass kitty graphics through. kittex shows math as Unicode text instead; images work in kitty (0.28 or newer) and Ghostty, outside tmux.")
    expect(tmux).toContain("– colours: text #ffffff (the Claude theme's default: the terminal's colours couldn't be read)")
    const wez = formatDoctor(facts(d, { terminal: { kind: 'wezterm', images: false, program: 'WezTerm 20240203', colors: 'theme' } }))
    expect(wez).toContain('✗ WezTerm (20240203): WezTerm has no kitty Unicode placeholders.')
    // Terminal.app (TERM_PROGRAM Apple_Terminal) by its name.
    const terminalApp = formatDoctor(facts(d, { os: MACOS, terminal: { kind: 'other', images: false, term: 'xterm-256color', program: 'Apple_Terminal 470.2', colors: 'theme' } }))
    expect(terminalApp).toContain('✗ Terminal.app (470.2): Terminal.app has no kitty graphics. kittex shows math as Unicode text instead; images work in kitty (0.28 or newer) and Ghostty.')
    // No session there dumps the format: not promised.
    const unbuilt = formatDoctor(facts({ ...d, drawn: false, format: { path: '/home/u/.cache/kittex/tex/fmt/kittex-00000000.fmt' } }, { os: MACOS }))
    expect(unbuilt).toContain('– format: not built (kittex dumps it only where it draws diagrams)')
    const desktop = formatDoctor(facts(d, { surface: 'desktop' }))
    expect(desktop).toContain('– the desktop surface: kittex leaves replies to its own drawing here')
  })

  test("host text can't change the markdown", () => {
    expect(plain("File `x_y*.sty' not found <here>")).toBe("File 'x\\_y\\*.sty' not found \\<here\\>")
  })
})

/** /kittex-doctor as typed at the prompt. */
const RUN = { command: DOCTOR_COMMAND, args: '', origin: { kind: 'composer' as const }, presentation: { isFullscreen: true, columns: 100 } }

describe('the command through the engine', () => {
  test('session.start declares /kittex-doctor and the command answers with the report, without TeX', async ($, on) => {
    await startSession($, on)
    const { text } = await $.command.run(RUN)
    expect(text).toContain('**Diagrams (local TeX)**')
    expect(text).toContain('✗ latex: not found on PATH')
  })

  test('with kittex off (both raw), the doctor still answers', { options: { block: 'raw', inline: 'raw' } }, async ($, on) => {
    await startSession($, on)
    const { text } = await $.command.run(RUN)
    expect(text).toContain('– kittex is off')
  })
})
