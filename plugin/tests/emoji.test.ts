// Emoji next to inline math: a paragraph the replay can't lay out streams its
// formulas unpadded. The user's reply that went wrong (it stayed Unicode in
// kitty, with blank pads left after `σ²=4` and `σ²≈0.8`, since 🛰️ was refused)
// is the fixture.

import { describe, expect } from 'claude-code/testing'

import { init, measureDisplay, renderDisplay, renderInline } from '../hooks/core.js'
import { inlineEnvFor, MessageStream, placeable, planLanded, proseWidthFor, renderEnvFor } from '../hooks/math.ts'
import type { KittexEnv, PreviewRecord, StreamEnv } from '../hooks/math.ts'
import { kittyEnv, test } from './support.ts'

const REPLY =
  "🚀 The rocket's Kalman filter predicts its state with $\\hat{x}_{k|k-1} = F_k \\hat{x}_{k-1|k-1}$ 🛰️, then uses the gain " +
  '$K_k = P_{k|k-1} H_k^\\top S_k^{-1}$ to blend in the GPS reading $z_k$ 📡, so the uncertainty drops from $\\sigma^2 = 4$ ' +
  'to $\\sigma^2 \\approx 0.8$ 🎯 and everyone at mission control can relax 😌☕.\n'

const env = (): KittexEnv => ({ ...kittyEnv(), cellHeight: 26 })

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
    inline: { env: inlineEnv, width: proseWidthFor(kittex), draw: (tex, columns) => renderInline(tex, inlineEnv, columns) },
  })
}

const images = (pieces: ReturnType<typeof plan>['pieces']) => pieces.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []) : []))

describe('a paragraph the replay refuses streams its formulas unpadded', () => {
  test('placeable lays out the paragraph written so far', () => {
    expect(placeable('Take the state ', 98)).toBe(true)
    expect(placeable('The orbit 🛰️ and ', 98)).toBe(false)
    expect(placeable('Wide 中 text ', 98)).toBe(false)
    expect(placeable('Some <b>bold</b> text ', 98)).toBe(false)
    // A refused paragraph before a blank line leaves the next one placeable.
    expect(placeable('The orbit 🛰️.\n\nThen ', 98)).toBe(true)
  })

  test('the user reply: the formula before 🛰️ is padded (the stream cannot see ahead), none after it', async () => {
    await init()
    const { shown, records } = streamed(REPLY, { ...env(), inline: true })
    expect(records.map(record => record.tex)).toEqual(['\\hat{x}_{k|k-1} = F_k \\hat{x}_{k-1|k-1}'])
    expect(shown).toContain('σ² = 4 to σ² ≈ 0.8 🎯')
    expect(shown).not.toMatch(/σ²=4⠀|σ²≈0\.8⠀/)
    expect(images(plan(shown, records, env()).pieces)).toEqual([])
  })
})
