// Shared pieces of kittex's tests: the world beneath the plugin for a session
// in kitty.

import { mock, test as kitTest } from 'claude-code/testing'
import type { Engine, TestRest } from 'claude-code/testing'
import type { On } from 'claude-code'

import { blockParts, cellProbe, chooseInk, emPxForCell, layoutHeading, layoutList, layoutProse, layoutQuote, layoutTable } from '../hooks/core.js'
import type { LinkMode } from '../hooks/core.js'
import { INK_PREFER, readAsMarkdown } from '../hooks/math.ts'
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
  cell: { cellWidth: number; cellHeight: number } = CELL,
  /** How the host answers a command other than the cell probe (by default it fails). */
  command: (argv: readonly string[]) => { exitCode: number; stdout: string } | undefined = () => undefined,
): Promise<{ cellProbes: () => number; screen: Screen; renders: () => number }> {
  mock.env(on, terminal)
  const screen: Screen = { rows: 50, columns: COLUMNS, ...cell }
  let cellProbes = 0
  on('process.run', ($, e) => {
    const isCellProbe = e.argv.join('\0') === cellProbe.argv.join('\0')
    if (isCellProbe) cellProbes += 1
    const { rows, columns, cellWidth, cellHeight } = screen
    const stdout = isCellProbe ? `${rows} ${columns} ${columns * cellWidth} ${rows * cellHeight}\n` : ''
    const other = isCellProbe ? undefined : command(e.argv)
    if (other) return { value: { ...other, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    return { value: { exitCode: isCellProbe ? 0 : 1, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('config.list', () => ({
    value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: theme, provider: { plugin: 'engine', tier: 'core' }, isLocked: false }],
  }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('prompt.compose', () => ({ sections: [INTRO] }))
  on('classic.MessageDisplay', () => ({}))
  // The engine's drawing of a reply's text: each one a round trip from kittex's hook (counted).
  let renders = 0
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
    renders += 1
    return { type: 'Text' as const, children: [e.props.text] }
  })
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  return { cellProbes: () => cellProbes, screen, renders: () => renders }
}

/**
 * A landed prose piece's rows as the engine draws it, by the replays: its
 * parts (blockParts) one under the other, a blank row between two where the
 * engine puts one; a paragraph of display preview lines a row a line (their
 * pads as blanks), a paragraph with no markdown of its own read as markdown
 * where the piece is. Null where a part isn't followed.
 */
export function pieceLines(text: string, width: number, columns: number, mode: LinkMode = {}, code = false): string[] | null {
  const parts = blockParts(text)
  if (!parts) return null
  const markdown = readAsMarkdown(text)
  const lines: string[] = []
  for (const [k, part] of parts.entries()) {
    if (k > 0 && part.gap) lines.push('')
    const block = text.slice(part.start, part.end)
    let rows: string[] | undefined
    if (part.paragraph && block.split('\n').every(line => /^[ \t]{0,3}&nbsp;/.test(line))) rows = block.split('\n').map(line => line.replaceAll('&nbsp;', ' ').replace(/\\(.)/g, '$1'))
    else if (part.table) rows = layoutTable(block, columns, [], width, mode)?.lines
    else if (part.heading) rows = layoutHeading(block, width, [], mode)?.lines
    else if (part.quote) rows = layoutQuote(block, width, [], mode)?.lines
    else if (part.list) rows = layoutList(block, width, [], mode)?.lines
    else if (part.paragraph) rows = markdown && !readAsMarkdown(block) ? layoutProse(`${block}\n\nx`, width, [], mode)?.lines.slice(0, -2) : layoutProse(block, width, [], mode)?.lines
    // A code block (with `code`): its lines inside the fences, as the tests take the engine to draw a short one.
    else if (part.type === 'code' && code) rows = block.split('\n').slice(1, -1)
    if (!rows) return null
    lines.push(...rows)
  }
  return lines
}
