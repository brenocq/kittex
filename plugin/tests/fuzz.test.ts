// The fuzz suite's driver against the mod itself: a few seeded replies
// (fuzz/generate.ts) streamed through register.tsx's own
// MessageDisplay hook in their terminal (its env, cells, link mode and
// maxProseWidth, as session.start reads them) and landed through its own
// AssistantMessage hook, each under one setting of the `block` and `inline`
// options. What streamed must be what the driver's MessageStream writes, and
// the landing must draw as many images as the driver's plan: the offline suite
// (core/test/fuzz, run by npm test) then speaks for register.tsx.

import { describe, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { cellProbe, init, measureDisplay, renderDisplay, renderInline } from '../hooks/core.js'
import { inlineEnvFor, MessageStream, planLanded, proseWidthFor, renderEnvFor, streamEnvFor } from '../hooks/math.ts'
import type { MathMode, PreviewRecord } from '../hooks/math.ts'
import { generateReply, writeReply } from './fuzz/generate.ts'
import { envFor, flushesOf, mathOf, remember, shapeFor, variablesFor } from './fuzz/shape.ts'
import type { Shape } from './fuzz/shape.ts'
import { test } from './support.ts'

/** The world beneath the plugin for a session in this terminal (support.ts's startSession, sized and set). */
async function startIn($: Engine, on: On, shape: Shape): Promise<void> {
  mock.env(on, variablesFor(shape))
  on('process.run', ($, e) => {
    const isCellProbe = e.argv.join('\0') === cellProbe.argv.join('\0')
    const stdout = isCellProbe ? `50 ${shape.columns} ${shape.columns * shape.cellWidth} ${50 * shape.cellHeight}\n` : ''
    return { value: { exitCode: isCellProbe ? 0 : 1, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('config.list', () => ({
    value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: 'dark', provider: { plugin: 'engine', tier: 'core' }, isLocked: false }],
  }) as never)
  on('settings.read', () => ({ value: shape.maxProseWidth === undefined ? {} : { maxProseWidth: shape.maxProseWidth } }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('prompt.compose', () => ({ sections: [] }))
  on('classic.MessageDisplay', () => ({}))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => ({ type: 'Text' as const, children: [e.props.text] }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
}

function images(node: unknown): number {
  if (typeof node !== 'object' || node === null) return 0
  const element = node as { type?: unknown; children?: unknown[] }
  return (element.type === 'Image' ? 1 : 0) + (element.children ?? []).reduce<number>((sum, child) => sum + images(child), 0)
}

/** The driver's plan of a landed text: drawLanded's options, the real renderers. */
function planned(text: string, records: readonly PreviewRecord[], shape: Shape): number {
  const env = envFor(shape)
  const renderEnv = renderEnvFor(env, shape.columns)
  const inlineEnv = inlineEnvFor(env, shape.columns)
  if (shape.block === 'raw' && shape.inline === 'raw') return 0
  const plan = planLanded(text, records, {
    maxColumns: renderEnv.maxColumns,
    draw: shape.block !== 'image' ? undefined : (tex, rows, maxColumns) => {
      const at = maxColumns === undefined ? renderEnv : { ...renderEnv, maxColumns }
      return renderDisplay(tex, at, rows ?? measureDisplay(tex, at).rows)
    },
    width: proseWidthFor(env, shape.columns),
    measure: (tex, maxColumns) => measureDisplay(tex, { ...renderEnv, maxColumns }).rows,
    math: mathOf(shape),
    inline: shape.inline === 'image' ? { env: inlineEnv, width: proseWidthFor(env, shape.columns), columns: shape.columns, draw: (tex, cells, place) => renderInline(tex, inlineEnv, cells, place), hyperlinks: env.hyperlinks, emojiSequences: env.emojiSequences } : undefined,
  })
  if (!plan.changed || plan.pieces.every(piece => piece.kind === 'prose' && !piece.inline?.length)) return 0
  return plan.pieces.reduce((sum, piece) => sum + (piece.kind === 'image' ? 1 : piece.kind === 'prose' ? (piece.inline?.length ?? 0) : 0), 0)
}

describe('the fuzz driver against register.tsx', () => {
  const runs: [number, MathMode, MathMode][] = [
    [11, 'image', 'image'],
    [23, 'image', 'image'],
    [42, 'unicode', 'image'],
    [77, 'raw', 'unicode'],
    [108, 'image', 'raw'],
    [131, 'unicode', 'unicode'],
    [150, 'raw', 'raw'],
  ]
  for (const [seed, block, inline] of runs) {
    test(`seed ${seed}, block ${block}, inline ${inline}: streamed and landed as the driver does`, { timeoutMs: 60_000, options: { block, inline } }, async ($, on) => {
      // Ghostty's config (cell adjustments, grapheme width) isn't in this world: the plain terminal.
      const { cellAdjust: _adjust, graphemeLegacy: _legacy, ...plain } = shapeFor(seed)
      const shape: Shape = { ...plain, block, inline }
      await startIn($, on, shape)
      await init()
      const reply = writeReply(generateReply(seed))
      const flushes = flushesOf(reply, shape.flushSeed)
      const stream = new MessageStream()
      let shown = ''
      let expected = ''
      let records: PreviewRecord[] = []
      for (const [index, delta] of flushes.entries()) {
        const final = index === flushes.length - 1
        if (index === 0 && delta === '' && final) break
        const result = await $.classic.MessageDisplay({ turn_id: 't', message_id: `m${seed}`, index, final, delta })
        shown += result.displayContent ?? delta
        // With both kinds raw kittex registers no hook: every flush shows as written.
        const off = block === 'raw' && inline === 'raw'
        const rewrite = off ? { text: delta, records: [] } : stream.push(delta, final, streamEnvFor(envFor(shape), mathOf(shape)))
        expected += rewrite.text
        records = remember(records, rewrite.records)
      }
      expect(shown).toBe(expected)
      const ui = await $.ui.mount({
        plugin: 'kittex',
        surface: 'terminal',
        component: 'AssistantMessage',
        props: { text: shown, isFirstOfReply: true },
        viewport: { columns: shape.columns, rows: 50, isFullscreen: false },
      })
      expect(images(await ui.drawn())).toBe(planned(shown, records, shape))
    })
  }
})
