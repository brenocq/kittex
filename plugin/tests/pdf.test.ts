// PDF images through a fake host: the copy into a job directory, the check
// that it is a PDF, dvisvgm --pdf confined as TeX's jobs are (Ghostscript only
// inside bubblewrap), the refusals, and the trial that sets setup.pdf.

import { describe, expect } from 'claude-code/testing'

import { pdfPicture, pdfRefusal, probePdf, probeTex } from '../hooks/tex.ts'
import type { TexHost, TexSetup } from '../hooks/tex.ts'
import { TRIAL_PDF } from '../hooks/core.js'
import { test } from './support.ts'

const DIR = '/tmp/kittex-tex.PdFpDfPdFp'
const COPY = `${DIR}/kittex-image.pdf`
const HIDE = ['/home/u', '/tmp']
/** What dvisvgm --pdf writes for a 50 × 40 pt page with a blue square. */
const PAGE = '<svg xmlns="http://www.w3.org/2000/svg" width="50pt" height="40pt" viewBox="0 0 50 40"><path d="M10 10H40V30H10Z" fill="#00f"/></svg>'
const EM = 72.27 / 72 / 10

const LINUX: TexSetup = { versions: 'v', confinement: { prlimit: true, bwrap: { hide: HIDE } }, tmpdir: '/tmp', pdf: true }
const MAC: TexSetup = { versions: 'v', confinement: { prlimit: false, ulimit: true }, tmpdir: '/tmp', pdf: true }

interface Run {
  argv: string[]
  cwd?: string
  env?: Record<string, string>
}

/** A host where the file copied in starts with `head`, and dvisvgm answers `dvisvgm`. */
function host(options: { head?: string; copy?: { exitCode: number; stderr: string }; dvisvgm?: { exitCode: number; stdout: string; stderr?: string } } = {}) {
  const runs: Run[] = []
  const writes = new Map<string, string>()
  const result = (stdout: string, exitCode = 0, stderr = '') => ({ exitCode, stdout, stderr, isStdoutTruncated: false })
  const fake: TexHost = {
    run: async (argv, init) => {
      runs.push({ argv: [...argv], ...(init.cwd !== undefined ? { cwd: init.cwd } : {}), ...(init.env !== undefined ? { env: init.env } : {}) })
      const name = ['cp', 'dvisvgm', 'latex', 'mktemp', 'head', 'rm'].find(command => argv.includes(command)) ?? argv[0]
      switch (name) {
        case 'mktemp':
          return result(`${DIR}\n`)
        case 'cp':
          return options.copy ? result('', options.copy.exitCode, options.copy.stderr) : result('')
        case 'head':
          return result(options.head ?? '%PDF-1.7\n%âã\n')
        case 'dvisvgm': {
          if (argv.includes('--version')) return result('dvisvgm 3.6\n')
          const answer = options.dvisvgm ?? { exitCode: 0, stdout: PAGE }
          return result(answer.stdout, answer.exitCode, answer.stderr ?? '')
        }
        case 'latex':
          return result('pdfTeX 3.14\n')
        default:
          return result('')
      }
    },
    write: async (path, text) => void writes.set(path, text),
    read: async () => undefined,
  }
  const commands = () => runs.map(run => ['cp', 'dvisvgm', 'mktemp', 'head', 'rm'].find(command => run.argv.includes(command)) ?? run.argv[0])
  const find = (command: string) => runs.find(run => run.argv.includes(command))
  return { host: fake, runs, writes, commands, find }
}

describe('pdfPicture', () => {
  test('Linux with bubblewrap: copied in under the limits only, checked, converted in the namespace with Ghostscript allowed, the job removed', async () => {
    const h = host()
    const outcome = await pdfPicture(h.host, LINUX, '/home/u/paper/figure.pdf', 5000)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    // The page's natural size, in em at 10 pt.
    expect(Math.abs(outcome.picture.width - 50 * EM) < 1e-9).toBe(true)
    expect(Math.abs(outcome.picture.height - 40 * EM) < 1e-9).toBe(true)
    expect(outcome.picture.ops).toHaveLength(1)
    expect(h.commands()).toEqual(['mktemp', 'cp', 'head', 'dvisvgm', 'rm'])
    // The copy reads the user's file, which the namespace hides: limits, no bubblewrap.
    expect(h.find('cp')!.argv).toEqual(['prlimit', '--fsize=67108864', '--cpu=20', 'cp', '--', '/home/u/paper/figure.pdf', COPY])
    expect(h.find('head')!.argv).toEqual(['head', '-c', '1024', '--', COPY])
    const convert = h.find('dvisvgm')!
    expect(convert.argv.slice(0, 4)).toEqual(['prlimit', '--fsize=67108864', '--cpu=20', 'bwrap'])
    expect(convert.argv).toContain('--unshare-all')
    expect(convert.argv.slice(convert.argv.indexOf('dvisvgm'))).toEqual(['dvisvgm', '--pdf', '--page=1', '--no-fonts', '--cache=none', `--tmpdir=${DIR}`, '--stdout', '--verbosity=1', 'kittex-image.pdf'])
    expect(convert.cwd).toBe(DIR)
    expect(convert.env?.HOME).toBe(DIR)
    expect(convert.env?.TEXMFOUTPUT).toBe(DIR)
    expect(h.runs.at(-1)!.argv).toEqual(['rm', '-rf', '--', DIR])
  })

  test('macOS (no bubblewrap): ulimit, and Ghostscript kept off so only mutool converts', async () => {
    const h = host()
    expect((await pdfPicture(h.host, MAC, '/Users/u/figure.pdf', 5000)).ok).toBe(true)
    expect(h.find('cp')!.argv.slice(0, 3)).toEqual(['/bin/sh', '-c', 'ulimit -f 65536 && ulimit -t 20 && exec "$@"'])
    const convert = h.find('dvisvgm')!.argv
    expect(convert.slice(0, 2)).toEqual(['/bin/sh', '-c'])
    expect(convert).not.toContain('bwrap')
    expect(convert).toContain(`--libgs=${DIR}/no-ghostscript`)
  })

  test('refused before anything runs: no trial success here, a relative path, a dvisvgm with Ghostscript built in and no sandbox', async () => {
    const untried: TexSetup = { versions: 'v', confinement: MAC.confinement, tmpdir: '/tmp' }
    const cases: [TexSetup, string, RegExp][] = [
      [untried, '/Users/u/figure.pdf', /converts no PDF here/],
      [MAC, 'figure.pdf', /not absolute/],
      [{ ...MAC, libgs: false }, '/Users/u/figure.pdf', /Ghostscript built in/],
    ]
    for (const [setup, path, why] of cases) {
      const h = host()
      const outcome = await pdfPicture(h.host, setup, path, 5000)
      expect(outcome.ok).toBe(false)
      if (!outcome.ok) expect(outcome.error).toMatch(why)
      expect(h.runs).toHaveLength(0)
    }
  })

  test('a file that is not a PDF never reaches dvisvgm, and the job is still removed', async () => {
    const h = host({ head: '%!PS-Adobe-3.0\n(%pipe%id) (w) file\n' })
    const outcome = await pdfPicture(h.host, LINUX, '/home/u/evil.pdf', 5000)
    expect(outcome).toEqual({ ok: false, error: 'PDF not drawn: the file is not a PDF', lasting: true })
    expect(h.commands()).toEqual(['mktemp', 'cp', 'head', 'rm'])
  })

  test('failures say why: an unreadable file, dvisvgm\'s first error line, a page the reader refuses', async () => {
    const unreadable = await pdfPicture(host({ copy: { exitCode: 1, stderr: 'cp: /home/u/x.pdf: Permission denied\n' } }).host, LINUX, '/home/u/x.pdf', 5000)
    expect(unreadable).toEqual({ ok: false, error: 'PDF not drawn: cp: /home/u/x.pdf: Permission denied', lasting: false })
    const failed = await pdfPicture(host({ dvisvgm: { exitCode: 1, stdout: '', stderr: 'ERROR: mutool not found\n' } }).host, LINUX, '/home/u/x.pdf', 5000)
    expect(failed).toEqual({ ok: false, error: 'mutool not found', lasting: true })
    const bitmap = await pdfPicture(host({ dvisvgm: { exitCode: 0, stdout: PAGE.replace('<path', '<image href="data:image/png;base64,AA" width="1" height="1"/><path') } }).host, LINUX, '/home/u/x.pdf', 5000)
    expect(bitmap.ok === false && bitmap.error).toMatch(/embedded bitmaps/)
  })
})

describe('the trial', () => {
  test('TRIAL_PDF is a well-formed PDF: every xref offset lands on its object', () => {
    expect(TRIAL_PDF.startsWith('%PDF-1.4\n')).toBe(true)
    const xref = Number(/startxref\n(\d+)\n/.exec(TRIAL_PDF)![1])
    expect(TRIAL_PDF.slice(xref).startsWith('xref\n0 5\n')).toBe(true)
    const offsets = [...TRIAL_PDF.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map(match => Number(match[1]))
    expect(offsets).toHaveLength(4)
    offsets.forEach((offset, i) => expect(TRIAL_PDF.slice(offset).startsWith(`${i + 1} 0 obj\n`)).toBe(true))
    const length = Number(/\/Length (\d+)/.exec(TRIAL_PDF)![1])
    expect(TRIAL_PDF.slice(TRIAL_PDF.indexOf('stream\n') + 7).indexOf('endstream')).toBe(length)
  })

  test('probePdf converts the trial PDF written into a job, and is ok only when its blue square is drawn', async () => {
    const drawn = host()
    expect(await probePdf(drawn.host, MAC)).toEqual({ ok: true })
    expect(drawn.writes.get(COPY)).toBe(TRIAL_PDF)
    expect(drawn.commands()).toEqual(['mktemp', 'dvisvgm', 'rm'])
    const blank = host({ dvisvgm: { exitCode: 0, stdout: PAGE.replace('#00f', '#000') } })
    expect(await probePdf(blank.host, MAC)).toEqual({ ok: false, error: 'the trial PDF drew nothing' })
    const failing = host({ dvisvgm: { exitCode: 1, stdout: '', stderr: 'ERROR: PDF support requires Ghostscript or mutool\n' } })
    expect(await probePdf(failing.host, MAC)).toEqual({ ok: false, error: 'PDF support requires Ghostscript or mutool' })
    const refused = host()
    expect((await probePdf(refused.host, { ...MAC, libgs: false })).ok).toBe(false)
    expect(refused.runs).toHaveLength(0)
  })

  test('probeTex sets pdf only where the trial draws', async () => {
    const works = await probeTex(host().host, { tmpdir: '/tmp', hide: [] })
    expect(works?.pdf).toBe(true)
    const fails = await probeTex(host({ dvisvgm: { exitCode: 1, stdout: '', stderr: 'ERROR: no mutool\n' } }).host, { tmpdir: '/tmp', hide: [] })
    expect(fails).toBeDefined()
    expect(fails?.pdf).toBeUndefined()
  })

  test('pdfRefusal: Ghostscript built in and no bubblewrap is the one refusal', () => {
    expect(pdfRefusal({ confinement: { prlimit: true, bwrap: { hide: HIDE } }, libgs: false })).toBeUndefined()
    expect(pdfRefusal({ confinement: { prlimit: false, ulimit: true } })).toBeUndefined()
    expect(pdfRefusal({ confinement: { prlimit: true }, libgs: false })).toMatch(/Ghostscript built in/)
  })
})
