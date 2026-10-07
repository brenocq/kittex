import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { cellProbe, cellProbePython, cellProbes, emPxForCell, fontCell, parseWinsize, textBaseline } from '../../src/terminal/index.js'
import type { Probe } from '../../src/types.js'

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')

describe('parseWinsize', () => {
  test('kitty on this machine: 13×26 px cells', () => {
    // Captured from the perl probe under Claude Code in kitty 0.49.1 (Roboto Mono 11 pt).
    expect(parseWinsize(fixture('winsize-kitty.txt'))).toEqual({ cellWidth: 13, cellHeight: 26, columns: 102, rows: 79 })
    // Ghostty reports its whole area, padding included: the cells are whole pixels underneath.
    expect(parseWinsize('48 68 681 1014\n')).toEqual({ cellWidth: 10, cellHeight: 21, columns: 68, rows: 48 })
    expect(parseWinsize('65 90 1726 2746\n')).toEqual({ cellWidth: 19, cellHeight: 42, columns: 90, rows: 65 })
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

  test('ignores noise on other lines and rounds cells down to whole pixels', () => {
    expect(parseWinsize('warning: something\n24 80 1000 600\n')).toEqual({ cellWidth: 12, cellHeight: 25, columns: 80, rows: 24 })
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

describe('fontCell and textBaseline (Ghostty adjust-cell-width / -height / adjust-font-baseline)', () => {
  test('no adjustment: the cell itself, and the baseline at round(height × fraction)', () => {
    expect(fontCell({ cellWidth: 10, cellHeight: 21 })).toEqual({ cellWidth: 10, cellHeight: 21 })
    for (const h of [16, 18, 20, 21, 26, 28, 29]) expect(textBaseline(h, 20 / 26)).toBe(Math.round(h * (20 / 26)))
  })

  test('undoes the adjustments to the nearest pixel', () => {
    // Measured live: Ghostty 1.3.1, JetBrains Mono 12 pt, 10×21 px cells; 20% wider and 30% taller is 12×27.
    expect(fontCell({ cellWidth: 12, cellHeight: 27 }, { width: { factor: 1.2 }, height: { factor: 1.3 } })).toEqual({ cellWidth: 10, cellHeight: 21 })
    expect(fontCell({ cellWidth: 12, cellHeight: 19 }, { width: { px: 2 }, height: { px: -2 } })).toEqual({ cellWidth: 10, cellHeight: 21 })
    expect(fontCell({ cellWidth: 3, cellHeight: 3 }, { width: { px: 9 }, height: { factor: 0 } })).toEqual({ cellWidth: 1, cellHeight: 3 })
    expect(emPxForCell(fontCell({ cellWidth: 12, cellHeight: 27 }, { width: { factor: 1.2 } }))).toBeCloseTo(emPxForCell({ cellWidth: 10, cellHeight: 21 }), 12)
  })

  test('rows added to the cell are split above and below the text', () => {
    // The same window: the text's baseline measured 19 px down the 27 px cell (16 px down the 21 px one).
    expect(textBaseline(21, 20 / 26)).toBe(16)
    expect(textBaseline(27, 20 / 26, { height: { factor: 1.3 } })).toBe(19)
    expect(textBaseline(19, 20 / 26, { height: { px: -2 } })).toBe(15)
  })

  test('adjust-font-baseline moves the baseline away from the bottom', () => {
    expect(textBaseline(21, 20 / 26, { baseline: { px: 2 } })).toBe(14)
    expect(textBaseline(21, 20 / 26, { baseline: { px: -2 } })).toBe(18)
    // 5 px from the bottom, 20% more: 6.
    expect(textBaseline(21, 20 / 26, { baseline: { factor: 1.2 } })).toBe(15)
    expect(textBaseline(21, 20 / 26, { baseline: { px: 40 } })).toBe(0)
  })
})
