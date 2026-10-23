// The commands a PDF image runs: mutool draw, or dvisvgm --pdf with Ghostscript,
// on the job's copy, and the copy that brings the PDF in, under the job's limits.

import { describe, expect, test } from 'vitest'
import { confined, MAX_CPU_SECONDS, MAX_OUTPUT_BYTES, PDF_NAME, pdfArgv, pdfCopyArgv } from '../../src/diagram/index.ts'

const DIR = '/tmp/kittex-tex.abcdefghij'
const HIDE = ['/home/u', '/tmp']

describe('the PDF commands', () => {
  test('mutool draw: the first page of the job\'s copy as SVG on stdout, text as outlines', () => {
    expect(pdfArgv('mutool', DIR)).toEqual(['mutool', 'draw', '-q', '-F', 'svg', '-O', 'text=path', '-o', '-', PDF_NAME, '1'])
  })

  test('dvisvgm --pdf, the Ghostscript fallback: the first page, glyphs as paths, on stdout, nothing cached', () => {
    expect(pdfArgv('ghostscript', DIR)).toEqual(['dvisvgm', '--pdf', '--page=1', '--no-fonts', '--cache=none', `--tmpdir=${DIR}`, '--stdout', '--verbosity=1', PDF_NAME])
    // The PDF's name is the job's own, never the user's path.
    expect(PDF_NAME).toBe('kittex-image.pdf')
  })

  test('confined as a TeX job: limits outside, the namespace hiding home and /tmp but binding the job directory', () => {
    const argv = confined(pdfArgv('ghostscript', DIR), DIR, { prlimit: true, bwrap: { hide: HIDE } })
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
