// Emoji sequences next to inline math: a paragraph the replay can't lay out
// streams its formulas unpadded, and where the terminal draws emoji sequences
// as the engine counts them (kitty, Ghostty with grapheme-width-method=unicode)
// a paragraph holding them gets its images. The user's reply that went wrong
// (it stayed Unicode in kitty, with blank pads left after `σ²=4` and
// `σ²≈0.8`) is the fixture; its landing was checked live (research/lab runs
// ESQ-L-user-tex-*).

import { describe, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { cellProbe, init, measureDisplay, renderDisplay, renderInline } from '../hooks/core.js'
import { inlineEnvFor, MessageStream, placeable, planLanded, proseWidthFor, renderEnvFor } from '../hooks/math.ts'
import type { KittexEnv, PreviewRecord, StreamEnv } from '../hooks/math.ts'
import { CELL, COLUMNS, kittyEnv, test } from './support.ts'

const REPLY =
  "🚀 The rocket's Kalman filter predicts its state with $\\hat{x}_{k|k-1} = F_k \\hat{x}_{k-1|k-1}$ 🛰️, then uses the gain " +
  '$K_k = P_{k|k-1} H_k^\\top S_k^{-1}$ to blend in the GPS reading $z_k$ 📡, so the uncertainty drops from $\\sigma^2 = 4$ ' +
  'to $\\sigma^2 \\approx 0.8$ 🎯 and everyone at mission control can relax 😌☕.\n'

const env = (emojiSequences: boolean): KittexEnv => ({ ...kittyEnv(), cellHeight: 26, emojiSequences })

function streamed(text: string, stream: StreamEnv): { shown: string; records: PreviewRecord[] } {
  const messages = new MessageStream()
  const flush = messages.push(text, true, stream)
  return { shown: flush.text, records: flush.records }
}

function plan(text: string, records: readonly PreviewRecord[], kittex: KittexEnv) {
  const renderEnv = renderEnvFor(kittex)
  const inlineEnv = inlineEnvFor(kittex)
  return planLanded(text, records, {
    maxColumns: renderEnv.maxColumns,
    draw: (tex, rows) => renderDisplay(tex, renderEnv, rows ?? measureDisplay(tex, renderEnv).rows),
    inline: {
      env: inlineEnv,
      width: proseWidthFor(kittex),
      draw: (tex, columns) => renderInline(tex, inlineEnv, columns),
      emojiSequences: kittex.emojiSequences,
    },
  })
}

const images = (pieces: ReturnType<typeof plan>['pieces']) => pieces.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []) : []))

describe('a paragraph the replay refuses streams its formulas unpadded', () => {
  test('placeable lays out the paragraph written so far', () => {
    expect(placeable('Take the state ', 98)).toBe(true)
    expect(placeable('The orbit 🛰️ and ', 98)).toBe(false)
    expect(placeable('The orbit 🛰️ and ', 98, 100, { emojiSequences: true })).toBe(true)
    expect(placeable('The flag 🏴󠁧󠁢󠁥󠁮󠁧󠁿 and ', 98, 100, { emojiSequences: true })).toBe(false)
    expect(placeable('Wide 中 text ', 98)).toBe(false)
    expect(placeable('Some <b>bold</b> text ', 98)).toBe(false)
    // A refused paragraph before a blank line leaves the next one placeable.
    expect(placeable('The orbit 🛰️.\n\nThen ', 98)).toBe(true)
  })

  test('the user reply where sequences are refused: the formula before 🛰️ is padded and lands as its image, none after it is padded', async () => {
    await init()
    const { shown, records } = streamed(REPLY, { ...env(false), inline: true })
    expect(records.map(record => record.tex)).toEqual(['\\hat{x}_{k|k-1} = F_k \\hat{x}_{k-1|k-1}'])
    expect(shown).toContain('σ² = 4 to σ² ≈ 0.8 🎯')
    expect(shown).not.toMatch(/σ²=4⠀|σ²≈0\.8⠀/)
    // The paragraph is laid out up to 🛰️ (what comes before it is drawn the same whatever follows): its pad is never left behind.
    expect(images(plan(shown, records, env(false)).pieces).map(image => [image.tex, image.row, image.col])).toEqual([['\\hat{x}_{k|k-1} = F_k \\hat{x}_{k-1|k-1}', 0, 54]])
  })
})

describe('emoji sequences where the terminal agrees with the engine', () => {
  test('the user reply: every formula streams padded and lands as an image over its preview', async () => {
    await init()
    const { shown, records } = streamed(REPLY, { ...env(true), inline: true })
    expect(records).toHaveLength(5)
    const placed = images(plan(shown, records, env(true)).pieces)
    expect(placed.map(image => [image.tex, image.row, image.col])).toEqual([
      ['\\hat{x}_{k|k-1} = F_k \\hat{x}_{k-1|k-1}', 0, 54],
      ['K_k = P_{k|k-1} H_k^\\top S_k^{-1}', 1, 5],
      ['z_k', 1, 53],
      ['\\sigma^2 = 4', 1, 90],
      ['\\sigma^2 \\approx 0.8', 2, 3],
    ])
    for (const [k, image] of placed.entries()) expect(image.image.columns).toBe(records[k]!.columns)
    // Read back after --resume, the LaTeX is laid out the same way.
    expect(images(plan(REPLY, [], env(true)).pieces).map(image => [image.row, image.col])).toEqual(placed.map(image => [image.row, image.col]))
  })
})

/** A session in Ghostty (cells of 13×26 px) whose `ghostty +show-config` prints `config`: kittex reads its colours, and its grapheme width method, from it. */
async function ghosttySession($: Engine, on: On, config: string): Promise<void> {
  mock.env(on, { TERM: 'xterm-ghostty', TERM_PROGRAM: 'ghostty' })
  on('process.run', ($, e) => {
    const cell = e.argv.join('\0') === cellProbe.argv.join('\0')
    const ghostty = e.argv[0] === 'ghostty' && e.argv[1] === '+show-config'
    const stdout = cell ? `50 ${COLUMNS} ${COLUMNS * CELL.cellWidth} ${50 * 26}\n` : ghostty ? config : ''
    return { value: { exitCode: cell || ghostty ? 0 : 1, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('config.list', () => ({ value: [] }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('prompt.compose', () => ({ sections: [] }))
  on('classic.MessageDisplay', () => ({}))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => ({ type: 'Text' as const, children: [e.props.text] }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
}

async function streamAndLand($: Engine): Promise<{ shown: string; images: number }> {
  const result = await $.classic.MessageDisplay({ turn_id: 't', message_id: 'm', index: 0, final: true, delta: REPLY })
  const shown = result.displayContent ?? REPLY
  const ui = await $.ui.mount({
    plugin: 'kittex',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: shown, isFirstOfReply: true },
    viewport: { columns: COLUMNS, rows: 50, isFullscreen: false },
  })
  const count = (node: unknown): number => {
    if (typeof node !== 'object' || node === null) return 0
    const element = node as { type?: unknown; children?: unknown[] }
    return (element.type === 'Image' ? 1 : 0) + (element.children ?? []).reduce<number>((sum, child) => sum + count(child), 0)
  }
  return { shown, images: count(await ui.drawn()) }
}

describe('Ghostty: by its grapheme-width-method', () => {
  const COLORS = 'foreground = #ffffff\nbackground = #000000\n'

  test('unicode (its default, the key printed): the sequences are laid out, every formula gets its image', async ($, on) => {
    await ghosttySession($, on, `${COLORS}grapheme-width-method = unicode\n`)
    await init()
    expect((await streamAndLand($)).images).toBe(5)
  })

  test('legacy: they draw at other widths, so the paragraph keeps its Unicode past 🛰️ and pads nothing there', async ($, on) => {
    await ghosttySession($, on, `${COLORS}grapheme-width-method = legacy\n`)
    await init()
    const { shown, images: count } = await streamAndLand($)
    // The formula before 🛰️, laid out exactly, gets its image.
    expect(count).toBe(1)
    expect(shown).toContain('σ² = 4 to σ² ≈ 0.8 🎯')
  })
})
