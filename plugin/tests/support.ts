// Shared pieces of kittex's tests: a line scanner that keeps the LineScanner
// contract (core's own may still be a stub that finds no math), and the world
// beneath the plugin for a session in kitty.

import { mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { cellProbe, chooseInk, emPxForCell } from '../hooks/core.js'
import type { LineScanner, Segment } from '../hooks/core.js'
import { INK_PREFER } from '../hooks/math.ts'
import type { KittexEnv } from '../hooks/math.ts'

/**
 * A LineScanner for `$…$` inline math and `$$` blocks whose delimiters stand on
 * lines of their own: prose comes back as it arrives, an open block is held
 * until its closing line (or `final`) and then comes back whole.
 */
export function contractScanner(): LineScanner {
  let offset = 0
  let held: { start: number; text: string } | undefined
  return {
    push(delta, final) {
      const out: Segment[] = []
      let pos = 0
      while (pos < delta.length) {
        const newline = delta.indexOf('\n', pos)
        const end = newline === -1 ? delta.length : newline + 1
        const line = delta.slice(pos, end)
        const start = offset + pos
        if (held) {
          held.text += line
          if (line.trim() === '$$') {
            const raw = held.text.replace(/\s+$/, '')
            const tex = raw.slice(2, -2).trim()
            out.push({ kind: 'math', display: true, tex, raw, delimiter: '$$', start: held.start, end: held.start + raw.length })
            if (raw.length < held.text.length) out.push({ kind: 'text', text: held.text.slice(raw.length), start: held.start + raw.length, end: held.start + held.text.length })
            held = undefined
          }
        } else if (line.trim() === '$$') {
          const indent = line.length - line.trimStart().length
          if (indent > 0) out.push({ kind: 'text', text: line.slice(0, indent), start, end: start + indent })
          held = { start: start + indent, text: line.slice(indent) }
        } else {
          out.push(...inline(line, start))
        }
        pos = end
      }
      offset += delta.length
      if (final && held) {
        out.push({ kind: 'text', text: held.text, start: held.start, end: held.start + held.text.length })
        held = undefined
      }
      return out
    },
  }
}

/** The whole text at once, through contractScanner. */
export function contractScan(markdown: string): Segment[] {
  return contractScanner().push(markdown, true)
}

function inline(line: string, start: number): Segment[] {
  const out: Segment[] = []
  let last = 0
  for (const match of line.matchAll(/\$([^$\n]+)\$/g)) {
    if (match.index > last) out.push({ kind: 'text', text: line.slice(last, match.index), start: start + last, end: start + match.index })
    const end = match.index + match[0].length
    out.push({ kind: 'math', display: false, tex: match[1]!.trim(), raw: match[0], delimiter: '$', start: start + match.index, end: start + end })
    last = end
  }
  if (last < line.length) out.push({ kind: 'text', text: line.slice(last), start: start + last, end: start + line.length })
  return out
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
export async function startSession($: Engine, on: On, terminal: Record<string, string> = KITTY, theme = 'dark'): Promise<{ cellProbes: () => number }> {
  mock.env(on, terminal)
  const rows = 50
  let cellProbes = 0
  on('process.run', ($, e) => {
    const isCellProbe = e.argv.join('\0') === cellProbe.argv.join('\0')
    if (isCellProbe) cellProbes += 1
    const stdout = isCellProbe ? `${rows} ${COLUMNS} ${COLUMNS * CELL.cellWidth} ${rows * CELL.cellHeight}\n` : ''
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
  return { cellProbes: () => cellProbes }
}
