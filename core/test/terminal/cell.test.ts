import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { cellProbe, cellProbePython, cellProbes, emPxForCell, parseWinsize } from '../../src/terminal/index.js'
import type { Probe } from '../../src/types.js'

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')

describe('parseWinsize', () => {
  test('kitty on this machine: 13×26 px cells', () => {
    // Captured from the perl probe under Claude Code in kitty 0.49.1 (Roboto Mono 11 pt).
    expect(parseWinsize(fixture('winsize-kitty.txt'))).toEqual({ cellWidth: 13, cellHeight: 26, columns: 102, rows: 79 })
  })

  test('rejects terminals that report no pixels', () => {
    expect(parseWinsize('50 200 0 0\n')).toBeUndefined() // tmux, screen, Terminal.app
    expect(parseWinsize('50 200 1600 0\n')).toBeUndefined()
    expect(parseWinsize('0 0 0 0\n')).toBeUndefined()
  })

  test('rejects anything that is not four numbers', () => {
    expect(parseWinsize('')).toBeUndefined()
    expect(parseWinsize('50 200 1600\n')).toBeUndefined()
    expect(parseWinsize('Can\'t locate Fcntl.pm\n')).toBeUndefined()
    expect(parseWinsize('-1 2 3 4')).toBeUndefined()
  })

  test('ignores noise on other lines and keeps fractional cells', () => {
    expect(parseWinsize('warning: something\n24 80 1000 600\n')).toEqual({ cellWidth: 12.5, cellHeight: 25, columns: 80, rows: 24 })
  })
})

test('probes are fixed argv arrays, perl first', () => {
  expect(cellProbes).toEqual([cellProbe, cellProbePython])
  expect(cellProbe.argv.slice(0, 2)).toEqual(['perl', '-e'])
  expect(cellProbePython.argv.slice(0, 3)).toEqual(['python3', '-I', '-c'])
  for (const probe of cellProbes) expect(probe.argv.join(' ')).not.toContain('ioctl.ph')
})

// The probes for real: from vitest the parent chain is vitest -> npm -> shell ->
// ... -> Claude Code or a terminal, so a terminal is found when the tests run
// from one, and both probes must then agree; without one both exit 1.
function run(probe: Probe<unknown>) {
  const result = spawnSync(probe.argv[0]!, probe.argv.slice(1), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000 })
  return result.error ? undefined : { status: result.status, stdout: result.stdout }
}

describe('the probes on this machine', () => {
  const perl = run(cellProbe)
  const python = run(cellProbePython)

  test.skipIf(!perl)('perl runs and prints a size or exits 1', () => {
    expect([0, 1]).toContain(perl!.status)
    if (perl!.status === 0) expect(perl!.stdout).toMatch(/^\d+ \d+ \d+ \d+\n$/)
  })

  test.skipIf(!python)('python3 runs and prints a size or exits 1', () => {
    expect([0, 1]).toContain(python!.status)
    if (python!.status === 0) expect(python!.stdout).toMatch(/^\d+ \d+ \d+ \d+\n$/)
  })

  test.skipIf(!perl || !python)('perl and python3 agree', () => {
    expect(python!.status).toBe(perl!.status)
    expect(python!.stdout).toBe(perl!.stdout)
  })
})

test('emPxForCell: 0.6 em monospace advance, emScale 1.15', () => {
  expect(emPxForCell({ cellWidth: 12, cellHeight: 24 })).toBeCloseTo(23)
  expect(emPxForCell({ cellWidth: 13, cellHeight: 26 })).toBeCloseTo((13 / 0.6) * 1.15)
  expect(emPxForCell({ cellWidth: 12, cellHeight: 24 }, 1)).toBeCloseTo(20)
})
