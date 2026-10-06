// Shared pieces of kittex's tests: the world beneath the plugin for a session
// in kitty.

import { mock, test as kitTest } from 'claude-code/testing'
import type { Engine, TestRest } from 'claude-code/testing'
import type { On } from 'claude-code'

import { cellProbe, chooseInk, emPxForCell } from '../hooks/core.js'
import { INK_PREFER } from '../hooks/math.ts'
import type { KittexEnv } from '../hooks/math.ts'

/**
 * The kit's `test`, with a 30 s default timeout in place of its 5 s: a test
 * that typesets and rasterizes takes a few seconds on a CI runner. A test's
 * own `timeoutMs` still wins.
 */
export function test(name: string, ...rest: TestRest): void {
  const [options, body] = rest.length === 1 ? [{}, rest[0]] : rest
  kitTest(name, { timeoutMs: 30_000, ...options }, body)
}

/** A kitty window of 100×50 cells of 13×20 px. */
export const KITTY = { TERM: 'xterm-kitty', KITTY_WINDOW_ID: '1' }
export const CELL = { cellWidth: 13, cellHeight: 20 }
export const COLUMNS = 100

/** The env session.start stores for KITTY (dark theme, no terminal colours readable). */
export function kittyEnv(): KittexEnv {
  return {
    kind: 'kitty',
    images: true,
    ...CELL,
    columns: COLUMNS,
    emPx: emPxForCell(CELL),
    ink: chooseInk({ theme: 'dark', prefer: INK_PREFER }),
    measured: true,
  }
}

/** The terminal window the cell probe measures: a test changes it to resize the window or zoom its font. */
export interface Screen {
  rows: number
  columns: number
  cellWidth: number
  cellHeight: number
}

/** The system prompt beneath the plugins: one section. */
export const INTRO = { id: 'intro', text: 'You are Claude Code.', scope: 'shared' as const }

/** Every fact of a prompt.compose input, for calls made from a test. */
export const COMPOSE = { model: 'claude', promptModel: 'claude', surfaces: ['terminal'] as const, tools: [], outputStyle: null, traits: [] }

/**
 * The world beneath the plugins for a session started in `terminal`: its
 * environment, the cell probe's answer, the theme row, the engine's own
 * session.start, system prompt, MessageDisplay and reply drawing (a Text of the
 * reply's text), then session.start itself.
 */
export async function startSession(
  $: Engine,
  on: On,
  terminal: Record<string, string> = KITTY,
  theme = 'dark',
): Promise<{ cellProbes: () => number; screen: Screen }> {
  mock.env(on, terminal)
  const screen: Screen = { rows: 50, columns: COLUMNS, ...CELL }
  let cellProbes = 0
  on('process.run', ($, e) => {
    const isCellProbe = e.argv.join('\0') === cellProbe.argv.join('\0')
    if (isCellProbe) cellProbes += 1
    const { rows, columns, cellWidth, cellHeight } = screen
    const stdout = isCellProbe ? `${rows} ${columns} ${columns * cellWidth} ${rows * cellHeight}\n` : ''
    return { value: { exitCode: isCellProbe ? 0 : 1, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('config.list', () => ({
    value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: theme, provider: { plugin: 'engine', tier: 'core' }, isLocked: false }],
  }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('prompt.compose', () => ({ sections: [INTRO] }))
  on('classic.MessageDisplay', () => ({}))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => ({ type: 'Text' as const, children: [e.props.text] }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  return { cellProbes: () => cellProbes, screen }
}
