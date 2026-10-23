// The commands a PDF image runs: dvisvgm --pdf on the job's copy, Ghostscript
// on or off, and the copy that brings the PDF in, under the job's limits.

import { describe, expect, test } from 'vitest'
import { confined, MAX_CPU_SECONDS, MAX_OUTPUT_BYTES, PDF_NAME, pdfArgv, pdfCopyArgv } from '../../src/diagram/index.ts'

const DIR = '/tmp/kittex-tex.abcdefghij'
const HIDE = ['/home/u', '/tmp']

describe('the PDF commands', () => {
  test('dvisvgm --pdf: the first page of the job\'s copy, glyphs as paths, on stdout, nothing cached; Ghostscript off unless allowed', () => {
    expect(pdfArgv(DIR, true)).toEqual(['dvisvgm', '--pdf', '--page=1', '--no-fonts', '--cache=none', `--tmpdir=${DIR}`, '--stdout', '--verbosity=1', PDF_NAME])
    const off = pdfArgv(DIR, false)
    expect(off).toContain(`--libgs=${DIR}/no-ghostscript`)
    expect(off.filter(arg => !arg.startsWith('--libgs='))).toEqual(pdfArgv(DIR, true))
    // The PDF's name is the job's own, never the user's path.
    expect(off.at(-1)).toBe('kittex-image.pdf')
  })

  test('confined as a TeX job: limits outside, the namespace hiding home and /tmp but binding the job directory', () => {
    const argv = confined(pdfArgv(DIR, true), DIR, { prlimit: true, bwrap: { hide: HIDE } })
    expect(argv.slice(0, 4)).toEqual(['prlimit', `--fsize=${MAX_OUTPUT_BYTES}`, `--cpu=${MAX_CPU_SECONDS}`, 'bwrap'])
    const text = argv.join(' ')
    expect(text).toContain('--tmpfs /home/u --tmpfs /tmp')
    expect(text).toContain(`--bind ${DIR} ${DIR} --chdir ${DIR}`)
    expect(text).toContain('--unshare-all')
  })

  test('the copy runs under the limits (prlimit, or ulimit) and never in the namespace, which hides the file it reads', () => {
    expect(pdfCopyArgv('/home/u/fig.pdf', DIR, { prlimit: true, bwrap: { hide: HIDE } })).toEqual(['prlimit', `--fsize=${MAX_OUTPUT_BYTES}`, `--cpu=${MAX_CPU_SECONDS}`, 'cp', '--', '/home/u/fig.pdf', `${DIR}/${PDF_NAME}`])
    expect(pdfCopyArgv('/Users/u/fig.pdf', DIR, { prlimit: false, ulimit: true })).toEqual([
      '/bin/sh',
      '-c',
      `ulimit -f ${MAX_OUTPUT_BYTES / 1024} && ulimit -t ${MAX_CPU_SECONDS} && exec "$@"`,
      'kittex-tex',
      'cp',
      '--',
      '/Users/u/fig.pdf',
      `${DIR}/${PDF_NAME}`,
    ])
    // A path that looks like an option stays the source: `--` ends cp's options.
    expect(pdfCopyArgv('/-rf', DIR, { prlimit: false })).toEqual(['cp', '--', '/-rf', `${DIR}/${PDF_NAME}`])
  })
})
