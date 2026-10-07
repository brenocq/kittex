// The job's sandbox and Ghostscript: what bubblewrap binds back (a TeX
// installed in a hidden folder), its trial, and the DVI check that keeps
// PostScript from a dvisvgm that would hand it to Ghostscript unconfined.

import { describe, expect } from 'claude-code/testing'

import { compileTrial, dviSpecials, hasPostScript, probeSandbox, probeTex, rememberedTex, runsPostScript, sandboxBinds } from '../hooks/tex.ts'
import type { TexHost, TexSetup } from '../hooks/tex.ts'
import { diagramDocument, mathDocument } from '../hooks/core.js'
import { ROTATED_DVI, TIKZ_DVI } from './fixtures/dvi.ts'
import { test } from './support.ts'

const HIDE = ['/home/u', '/tmp', '/var/tmp', '/run']
const TL = '/home/u/texlive/2026'
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20pt" height="10pt" viewBox="0 0 20 10"><path d="M0 0L20 10" stroke="#000"/></svg>'
const bytes = (base64: string) => (Uint8Array as unknown as { fromBase64(text: string): Uint8Array }).fromBase64(base64)

/** A host with TeX Live in the home folder, found through `~/bin` links; the sandbox trial fails with `trialError`. */
function homeTex(options: { trialError?: string; dvi?: string } = {}) {
  const runs: string[][] = []
  const result = (stdout: string, exitCode = 0, stderr = '') => ({ exitCode, stdout, stderr, isStdoutTruncated: false })
  const host: TexHost = {
    run: async argv => {
      runs.push([...argv])
      const inside = argv[0] === 'bwrap' || argv[0] === 'prlimit'
      const name = inside ? argv.find(arg => arg === 'latex' || arg === 'dvisvgm')! : argv[0]!
      switch (name) {
        case 'realpath':
          if (argv[1] === '-m') return result(`${argv.slice(3).join('\n')}\n`)
          // The links resolve into TeX Live; the trees that aren't there are left out.
          return result(
            `${[
              ...new Set(
                argv.slice(3).flatMap(arg => (arg === '/home/u/bin/latex' ? [`${TL}/bin/x86_64-linux/pdftex`] : arg === '/home/u/bin/dvisvgm' ? [`${TL}/bin/x86_64-linux/dvisvgm`] : arg.startsWith('/usr/bin/') || arg.includes('/.config/') ? [] : [arg])),
              ),
            ].join('\n')}\n`,
          )
        case 'kpsewhich':
          return result(`${TL}:/tmp/kittex-tex.probe/.config/texlive/texmf:!!/home/u/texlive/texmf-local:!!${TL}/texmf-dist:${TL}/texmf-var\n`)
        case 'ldd':
          return result('\tlinux-vdso.so.1 (0x7fff)\n\tlibc.so.6 => /usr/lib/libc.so.6 (0x7f00)\n')
        case 'mktemp':
          return result('/tmp/kittex-tex.AbCdEfGhIj\n')
        case 'latex':
          if (argv.includes('--version')) return result('pdfTeX 3.141592653-2.6-1.40.29 (TeX Live 2026)\n')
          if (options.trialError && argv.at(-1) === '\\stop') return result('', 1, `bwrap: ${options.trialError}\n`)
          return result('')
        case 'dvisvgm':
          if (argv.includes('--version')) return result('dvisvgm 3.6.1\n')
          if (argv.includes('--help')) return result('  -S, --no-specials[=prefixes]\n')
          if (argv.includes('-V1')) return result('dvisvgm 3.6.1\nGhostscript: 10.08.0\n')
          return result(SVG)
        case 'prlimit':
          return result('prlimit from util-linux 2.41\n')
        default:
          return result('')
      }
    },
    write: async () => undefined,
    read: async () => undefined,
    readBytes: async () => (options.dvi ? bytes(options.dvi) : undefined),
  }
  return { host, runs }
}

const OPTIONS = { hide: HIDE, tmpdir: undefined, path: '/home/u/bin:/usr/bin', prlimit: true }

describe('the sandbox', () => {
  test('only paths inside a hidden folder are bound, never a hidden folder itself, each once', () => {
    expect(sandboxBinds([`${TL}/bin/x86_64-linux`, TL, `${TL}/texmf-dist`, '/usr/share/texmf-dist', '/home/u', '/home', '/tmp/x'], HIDE)).toEqual(['/home/u/texlive/2026', '/tmp/x'])
    expect(sandboxBinds(['/usr/bin', '/usr/share/texmf-dist'], HIDE)).toEqual([])
  })

  test('TeX Live in the home folder: its trees and programs bound read-only, its bin first on PATH, and the trial run inside', async () => {
    const { host, runs } = homeTex()
    const probe = await probeSandbox(host, OPTIONS)
    expect(probe).toEqual({ ok: true, sandbox: { binds: ['/home/u/texlive/2026', '/home/u/texlive/texmf-local'], path: `${TL}/bin/x86_64-linux:/home/u/bin:/usr/bin` } })
    // The trial: latex (its format loaded) and dvisvgm, inside the namespace, with the binds.
    const trial = runs.filter(argv => argv.includes('bwrap'))
    expect(trial.map(argv => argv.find(arg => arg === 'latex' || arg === 'dvisvgm'))).toEqual(['latex', 'dvisvgm'])
    expect(trial[0]!.join(' ')).toContain(`--ro-bind ${TL} ${TL}`)
    expect(trial[0]!.join(' ')).toContain('--tmpfs /home/u')
    expect(trial[0]!.at(-1)).toBe('\\stop')
  })

  test('a sandbox TeX cannot run in: no bubblewrap for jobs, and why', async () => {
    const { host } = homeTex({ trialError: "Can't mount proc on /newroot/proc: Operation not permitted" })
    expect(await probeSandbox(host, OPTIONS)).toEqual({ ok: false, error: "latex in the sandbox: bwrap: Can't mount proc on /newroot/proc: Operation not permitted" })
    const setup = await probeTex(host, { tmpdir: undefined, hide: HIDE, path: OPTIONS.path })
    expect(setup?.confinement).toEqual({ prlimit: true })
    expect(setup?.sandbox).toBeUndefined()
  })

  test('jobs bind what the probe found, and run with its PATH; the setup remembers it', async () => {
    const { host, runs } = homeTex()
    const setup = (await probeTex(host, { tmpdir: undefined, hide: HIDE, path: OPTIONS.path }))!
    expect(setup.confinement.bwrap).toEqual({ hide: HIDE })
    runs.length = 0
    const outcome = await compileTrial(host, setup, diagramDocument('\\draw (0,0) -- (1,1);', 'tikz'), 5000)
    expect(outcome.ok).toBe(true)
    for (const argv of runs.filter(argv => argv.includes('bwrap'))) expect(argv.join(' ')).toContain(`--ro-bind ${TL} ${TL}`)
    expect(rememberedTex({ ...setup, cacheDir: '/home/u/.cache/kittex/tex' })?.sandbox).toEqual(setup.sandbox)
  })
})

describe('PostScript and Ghostscript', () => {
  test('which dvisvgm runs PostScript through Ghostscript whatever --no-specials says (3.5 to 3.6.1, Ghostscript linked in)', () => {
    const gs = 'dvisvgm 3.6\nGhostscript: 10.06.0\n'
    expect(runsPostScript('dvisvgm 3.6.1', gs)).toBe(true)
    expect(runsPostScript('dvisvgm 3.6', gs)).toBe(true)
    expect(runsPostScript('dvisvgm 3.5', gs)).toBe(true)
    expect(runsPostScript('dvisvgm 3.4.4', gs)).toBe(false)
    expect(runsPostScript('dvisvgm 3.2.1', gs)).toBe(false)
    expect(runsPostScript('dvisvgm 3.6.2', gs)).toBe(false)
    expect(runsPostScript('dvisvgm 3.6.1', 'dvisvgm 3.6.1\n')).toBe(false)
  })

  test("a DVI's specials, and which are PostScript", () => {
    const tikz = dviSpecials(bytes(TIKZ_DVI))!
    expect(tikz.some(special => special.startsWith('dvisvgm:raw'))).toBe(true)
    expect(hasPostScript(tikz)).toBe(false)
    const rotated = dviSpecials(bytes(ROTATED_DVI))!
    expect(rotated.filter(special => special.startsWith('ps:'))).toHaveLength(4)
    expect(hasPostScript(rotated)).toBe(true)
    expect(hasPostScript(['header=tex.pro'])).toBe(true)
    expect(hasPostScript(['!userdict begin'])).toBe(true)
    expect(hasPostScript(['color push gray 0', 'papersize=1pt,1pt', 'dvisvgm:raw <g>'])).toBe(false)
    expect(dviSpecials(new Uint8Array([1, 2, 3]))).toBeUndefined()
  })

  test("where Ghostscript would run unconfined, a DVI with PostScript is refused and kittex's own pictures are drawn", async () => {
    const run = async (dvi: string, bwrap: boolean) => {
      const { host } = homeTex({ dvi })
      const setup: TexSetup = { versions: 'v', confinement: { prlimit: true, ...(bwrap ? { bwrap: { hide: HIDE } } : {}) }, tmpdir: undefined, libgs: false, postscript: true }
      return compileTrial(host, setup, diagramDocument('\\draw (0,0) -- (1,1);', 'tikz'), 5000)
    }
    expect((await run(TIKZ_DVI, false)).ok).toBe(true)
    expect(await run(ROTATED_DVI, false)).toMatchObject({ ok: false, lasting: true, error: expect.stringContaining('Ghostscript outside any sandbox') })
    // Inside bubblewrap Ghostscript is confined with the rest of the job.
    expect((await run(ROTATED_DVI, true)).ok).toBe(true)
  })

  test("kittex's own documents ask for no PostScript: dvisvgm's backend, standalone without its PostScript special, no tightpage", () => {
    const fragment = diagramDocument('\\draw (0,0) -- (1,1);', 'tikz').text
    expect(fragment).toContain('\\def\\sa@papersize{')
    expect(fragment).not.toContain('ps::')
    expect(mathDocument('x', true).text).toMatch(/^\\documentclass\[dvisvgm\]\{article\}/)
    expect(mathDocument('x', false).text).toContain('\\usepackage[active]{preview}')
    const whole = diagramDocument('\\documentclass[12pt]{article}\n\\usepackage{tikz}\n\\begin{document}\n\\tikz\\draw (0,0) -- (1,1);\n\\end{document}', 'latex').text
    expect(whole).toContain('\\documentclass[12pt,dvisvgm]{article}')
    expect(whole).toContain('\\AddToHook{class/standalone/after}')
  })
})
