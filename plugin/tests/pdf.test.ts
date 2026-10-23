// PDF images through a fake host: the copy into a job directory, the check
// that it is a PDF, the conversion confined as TeX's jobs are (mutool, or
// dvisvgm with Ghostscript only inside bubblewrap), the refusals, and the
// trial that picks setup.pdf's converter.

import { describe, expect } from 'claude-code/testing'

import { pdfConverters, pdfPicture, probePdf, probeTex } from '../hooks/tex.ts'
import type { TexHost, TexSetup } from '../hooks/tex.ts'
import { TRIAL_PDF } from '../hooks/core.js'
import { test } from './support.ts'

const DIR = '/tmp/kittex-tex.PdFpDfPdFp'
const COPY = `${DIR}/kittex-image.pdf`
const HIDE = ['/home/u', '/tmp']
/** What a converter writes for a 50 × 40 pt page with a blue square. */
const PAGE = '<svg xmlns="http://www.w3.org/2000/svg" width="50pt" height="40pt" viewBox="0 0 50 40"><path d="M10 10H40V30H10Z" fill="#00f"/></svg>'
const EM = 72.27 / 72 / 10
const MUTOOL = ['mutool', 'draw', '-q', '-F', 'svg', '-O', 'text=path', '-o', '-', 'kittex-image.pdf', '1']

const LINUX: TexSetup = { versions: 'v', confinement: { prlimit: true, bwrap: { hide: HIDE } }, tmpdir: '/tmp', pdf: 'mutool' }
const MAC: TexSetup = { versions: 'v', confinement: { prlimit: false, ulimit: true }, tmpdir: '/tmp', pdf: 'mutool' }

interface Run {
  argv: string[]
  cwd?: string
  env?: Record<string, string>
}

type Answer = { exitCode: number; stdout: string; stderr?: string }

/** A host where the file copied in starts with `head`, and mutool and dvisvgm --pdf answer as given (each draws PAGE by default). */
function host(options: { head?: string; copy?: { exitCode: number; stderr: string }; mutool?: Answer; dvisvgm?: Answer } = {}) {
  const runs: Run[] = []
  const writes = new Map<string, string>()
  const result = (stdout: string, exitCode = 0, stderr = '') => ({ exitCode, stdout, stderr, isStdoutTruncated: false })
  const answer = (given: Answer | undefined) => (given ? result(given.stdout, given.exitCode, given.stderr ?? '') : result(PAGE))
  const fake: TexHost = {
    run: async (argv, init) => {
      runs.push({ argv: [...argv], ...(init.cwd !== undefined ? { cwd: init.cwd } : {}), ...(init.env !== undefined ? { env: init.env } : {}) })
      const name = ['cp', 'dvisvgm', 'mutool', 'latex', 'mktemp', 'head', 'rm'].find(command => argv.includes(command)) ?? argv[0]
      switch (name) {
        case 'mktemp':
          return result(`${DIR}\n`)
        case 'cp':
          return options.copy ? result('', options.copy.exitCode, options.copy.stderr) : result('')
        case 'head':
          return result(options.head ?? '%PDF-1.7\n%âã\n')
        case 'mutool':
          return answer(options.mutool)
        case 'dvisvgm':
          if (argv.includes('--version')) return result('dvisvgm 3.6\n')
          return argv.includes('--pdf') ? answer(options.dvisvgm) : result('')
        case 'latex':
          return result('pdfTeX 3.14\n')
        default:
          return result('')
      }
    },
    write: async (path, text) => void writes.set(path, text),
    read: async () => undefined,
  }
  const commands = () => runs.map(run => ['cp', 'dvisvgm', 'mutool', 'mktemp', 'head', 'rm'].find(command => run.argv.includes(command)) ?? run.argv[0])
  const find = (command: string) => runs.find(run => run.argv.includes(command))
  return { host: fake, runs, writes, commands, find }
}

describe('pdfPicture', () => {
  test('Linux with bubblewrap: copied in under the limits only, checked, converted by mutool in the namespace, the job removed', async () => {
    const h = host()
    const outcome = await pdfPicture(h.host, LINUX, '/home/u/paper/figure.pdf', 5000)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    // The page's natural size, in em at 10 pt.
    expect(Math.abs(outcome.picture.width - 50 * EM) < 1e-9).toBe(true)
    expect(Math.abs(outcome.picture.height - 40 * EM) < 1e-9).toBe(true)
    expect(outcome.picture.ops).toHaveLength(1)
    expect(h.commands()).toEqual(['mktemp', 'cp', 'head', 'mutool', 'rm'])
    // The copy reads the user's file, which the namespace hides: limits, no bubblewrap.
    expect(h.find('cp')!.argv).toEqual(['prlimit', '--fsize=67108864', '--cpu=20', 'cp', '--', '/home/u/paper/figure.pdf', COPY])
    expect(h.find('head')!.argv).toEqual(['head', '-c', '1024', '--', COPY])
    const convert = h.find('mutool')!
    expect(convert.argv.slice(0, 4)).toEqual(['prlimit', '--fsize=67108864', '--cpu=20', 'bwrap'])
    expect(convert.argv).toContain('--unshare-all')
    expect(convert.argv.slice(convert.argv.indexOf('mutool'))).toEqual(MUTOOL)
    expect(convert.cwd).toBe(DIR)
    expect(convert.env?.HOME).toBe(DIR)
    expect(h.runs.at(-1)!.argv).toEqual(['rm', '-rf', '--', DIR])
  })

  test('Linux with the Ghostscript fallback: dvisvgm --pdf in the namespace, Ghostscript allowed there', async () => {
    const h = host()
    expect((await pdfPicture(h.host, { ...LINUX, pdf: 'ghostscript' }, '/home/u/figure.pdf', 5000)).ok).toBe(true)
    expect(h.commands()).toEqual(['mktemp', 'cp', 'head', 'dvisvgm', 'rm'])
    const convert = h.find('dvisvgm')!
    expect(convert.argv.slice(0, 4)).toEqual(['prlimit', '--fsize=67108864', '--cpu=20', 'bwrap'])
    expect(convert.argv.slice(convert.argv.indexOf('dvisvgm'))).toEqual(['dvisvgm', '--pdf', '--page=1', '--no-fonts', '--cache=none', `--tmpdir=${DIR}`, '--stdout', '--verbosity=1', 'kittex-image.pdf'])
    expect(convert.env?.TEXMFOUTPUT).toBe(DIR)
  })

  test('macOS (no bubblewrap): ulimit, and mutool alone converts, whatever Ghostscript dvisvgm has built in', async () => {
    for (const setup of [MAC, { ...MAC, libgs: false as const }]) {
      const h = host()
      expect((await pdfPicture(h.host, setup, '/Users/u/figure.pdf', 5000)).ok).toBe(true)
      expect(h.find('cp')!.argv.slice(0, 3)).toEqual(['/bin/sh', '-c', 'ulimit -f 65536 && ulimit -t 20 && exec "$@"'])
      const convert = h.find('mutool')!.argv
      expect(convert.slice(0, 2)).toEqual(['/bin/sh', '-c'])
      expect(convert).not.toContain('bwrap')
      expect(convert.slice(convert.indexOf('mutool'))).toEqual(MUTOOL)
      expect(h.commands()).not.toContain('dvisvgm')
    }
  })

  test('refused before anything runs: no converter found by the trial, a relative path', async () => {
    const untried: TexSetup = { versions: 'v', confinement: MAC.confinement, tmpdir: '/tmp' }
    const cases: [TexSetup, string, RegExp][] = [
      [untried, '/Users/u/figure.pdf', /nothing converts PDF here/],
      [MAC, 'figure.pdf', /not absolute/],
    ]
    for (const [setup, path, why] of cases) {
      const h = host()
      const outcome = await pdfPicture(h.host, setup, path, 5000)
      expect(outcome.ok).toBe(false)
      if (!outcome.ok) expect(outcome.error).toMatch(why)
      expect(h.runs).toHaveLength(0)
    }
  })

  test('a file that is not a PDF never reaches the converter, and the job is still removed', async () => {
    for (const setup of [LINUX, { ...LINUX, pdf: 'ghostscript' as const }]) {
      const h = host({ head: '%!PS-Adobe-3.0\n(%pipe%id) (w) file\n' })
      const outcome = await pdfPicture(h.host, setup, '/home/u/evil.pdf', 5000)
      expect(outcome).toEqual({ ok: false, error: 'PDF not drawn: the file is not a PDF', lasting: true })
      expect(h.commands()).toEqual(['mktemp', 'cp', 'head', 'rm'])
    }
  })

  test("failures say why: an unreadable file, the converter's first error line, a page the reader refuses", async () => {
    const unreadable = await pdfPicture(host({ copy: { exitCode: 1, stderr: 'cp: /home/u/x.pdf: Permission denied\n' } }).host, LINUX, '/home/u/x.pdf', 5000)
    expect(unreadable).toEqual({ ok: false, error: 'PDF not drawn: cp: /home/u/x.pdf: Permission denied', lasting: false })
    const failed = await pdfPicture(host({ mutool: { exitCode: 1, stdout: '', stderr: 'error: cannot recognize version marker\n' } }).host, LINUX, '/home/u/x.pdf', 5000)
    expect(failed).toEqual({ ok: false, error: 'cannot recognize version marker', lasting: true })
    const silent = await pdfPicture(host({ mutool: { exitCode: 1, stdout: '' } }).host, LINUX, '/home/u/x.pdf', 5000)
    expect(silent).toEqual({ ok: false, error: 'mutool failed', lasting: true })
    const bitmap = await pdfPicture(host({ mutool: { exitCode: 0, stdout: PAGE.replace('<path', '<image href="data:image/png;base64,AA" width="1" height="1"/><path') } }).host, LINUX, '/home/u/x.pdf', 5000)
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

  test('the converters a host may try: mutool everywhere, dvisvgm with Ghostscript only inside bubblewrap', () => {
    expect(pdfConverters(LINUX)).toEqual(['mutool', 'ghostscript'])
    expect(pdfConverters(MAC)).toEqual(['mutool'])
    expect(pdfConverters({ confinement: { prlimit: true } })).toEqual(['mutool'])
  })

  test('probePdf converts the trial PDF written into a job with mutool, and is ok only when its blue square is drawn', async () => {
    const drawn = host()
    expect(await probePdf(drawn.host, MAC)).toEqual({ ok: true, converter: 'mutool' })
    expect(drawn.writes.get(COPY)).toBe(TRIAL_PDF)
    expect(drawn.commands()).toEqual(['mktemp', 'mutool', 'rm'])
    const blank = host({ mutool: { exitCode: 0, stdout: PAGE.replace('#00f', '#000') } })
    expect(await probePdf(blank.host, MAC)).toEqual({ ok: false, error: 'the trial PDF drew nothing' })
    // Without bubblewrap a failing mutool is the answer: Ghostscript is never tried.
    const failing = host({ mutool: { exitCode: 127, stdout: '', stderr: 'kittex-tex: exec: mutool: not found\n' } })
    expect(await probePdf(failing.host, MAC)).toEqual({ ok: false, error: 'kittex-tex: exec: mutool: not found' })
    expect(failing.commands()).toEqual(['mktemp', 'mutool', 'rm'])
  })

  test('inside bubblewrap, dvisvgm with Ghostscript is tried where mutool fails, and both errors are named when it fails too', async () => {
    const fallback = host({ mutool: { exitCode: 127, stdout: '', stderr: 'bwrap: execvp mutool: No such file or directory\n' } })
    expect(await probePdf(fallback.host, LINUX)).toEqual({ ok: true, converter: 'ghostscript' })
    expect(fallback.commands()).toEqual(['mktemp', 'mutool', 'rm', 'mktemp', 'dvisvgm', 'rm'])
    expect(fallback.find('dvisvgm')!.argv).toContain('bwrap')
    const neither = host({ mutool: { exitCode: 127, stdout: '', stderr: 'bwrap: execvp mutool: No such file or directory\n' }, dvisvgm: { exitCode: 1, stdout: '', stderr: 'ERROR: To process PDF files, either Ghostscript < 10.01.0 or mutool is required.\n' } })
    expect(await probePdf(neither.host, LINUX)).toEqual({
      ok: false,
      error: 'mutool: bwrap: execvp mutool: No such file or directory; dvisvgm with Ghostscript: To process PDF files, either Ghostscript < 10.01.0 or mutool is required.',
    })
  })

  test('probeTex sets the converter only where the trial draws', async () => {
    const works = await probeTex(host().host, { tmpdir: '/tmp', hide: [] })
    expect(works?.pdf).toBe('mutool')
    const fails = await probeTex(host({ mutool: { exitCode: 1, stdout: '', stderr: 'no mutool\n' } }).host, { tmpdir: '/tmp', hide: [] })
    expect(fails).toBeDefined()
    expect(fails?.pdf).toBeUndefined()
  })
})
