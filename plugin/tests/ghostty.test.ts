// kittex in Ghostty: the formulas' alpha corrected the way Ghostty corrects
// its text (alpha-blending = linear-corrected). Measured live on Ghostty 1.3.1
// (see core/src/terminal).

import { describe, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { cellProbe, emPxForCell, init, measureDisplay, renderDisplay, toBase64 } from '../hooks/core.js'
import { renderEnvFor } from '../hooks/math.ts'
import type { KittexEnv } from '../hooks/math.ts'
import { COLUMNS, test } from './support.ts'

const GHOSTTY = { TERM: 'xterm-ghostty', TERM_PROGRAM: 'ghostty', GHOSTTY_BIN_DIR: '/usr/bin' }
const FOREGROUND = { r: 0x3c, g: 0x38, b: 0x36 }
const BACKGROUND = { r: 0xfb, g: 0xf1, b: 0xc7 }
const TEX = 'e^{i\\pi} + 1 = 0'
const REPLY = `Euler's identity:\n\n$$${TEX}$$\n\nis beautiful.`

/** `ghostty +show-config --changes-only=false` as Ghostty 1.3.1 prints it, cut to what kittex reads. */
function showConfig(lines: string[] = []): string {
  return ['theme = Gruvbox Light', 'background = #fbf1c7', 'foreground = #3c3836', 'alpha-blending = linear-corrected', ...lines, ''].join('\n')
}

/** A session in a Ghostty window of 100 columns of `cell` pixels, whose show-config prints `config`. */
async function startGhostty($: Engine, on: On, config: string, cell = { cellWidth: 10, cellHeight: 21 }): Promise<void> {
  mock.env(on, GHOSTTY)
  on('process.run', ($, e) => {
    const isCellProbe = e.argv.join('\0') === cellProbe.argv.join('\0')
    const isShowConfig = e.argv[0] === '/usr/bin/ghostty' && e.argv[1] === '+show-config'
    const stdout = isCellProbe ? `50 ${COLUMNS} ${COLUMNS * cell.cellWidth + 7} ${50 * cell.cellHeight + 5}\n` : isShowConfig ? config : ''
    return { value: { exitCode: isCellProbe || isShowConfig ? 0 : 1, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('config.list', () => ({
    value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: 'light', provider: { plugin: 'engine', tier: 'core' }, isLocked: false }],
  }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('prompt.compose', () => ({ sections: [] }))
  on('classic.MessageDisplay', () => ({}))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => ({ type: 'Text' as const, children: [e.props.text] }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
}

/** The formula's PNG (base64) as the landed reply draws it. */
async function landedPng($: Engine): Promise<string> {
  const ui = await $.ui.mount({
    plugin: 'kittex',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: REPLY, isFirstOfReply: true },
    viewport: { columns: COLUMNS, rows: 50, isFullscreen: false },
  })
  const image = await ui.find({ type: 'Image' })
  return (image!.props as { source: { png: string } }).source.png
}

/** kittex.env for a Ghostty window of `cell`, with `extra`. */
function ghosttyEnv(cell: { cellWidth: number; cellHeight: number }, extra: Partial<KittexEnv> = {}): KittexEnv {
  return { kind: 'ghostty', images: true, ...cell, columns: COLUMNS, emPx: emPxForCell(cell), ink: FOREGROUND, measured: true, ...extra }
}

/** The PNG kittex should draw for TEX in `env`. */
function expected(env: KittexEnv): string {
  const renderEnv = renderEnvFor(env, COLUMNS)
  return toBase64(renderDisplay(TEX, renderEnv, measureDisplay(TEX, renderEnv).rows).png)
}

describe('Ghostty', () => {
  test('linear-corrected blending: the ink alpha is corrected against the background, as Ghostty corrects text', async ($, on) => {
    await startGhostty($, on, showConfig())
    const png = await landedPng($)
    await init()
    const cell = { cellWidth: 10, cellHeight: 21 }
    expect(png).toBe(expected(ghosttyEnv(cell, { inkOver: BACKGROUND })))
    expect(png).not.toBe(expected(ghosttyEnv(cell)))
  })

  test('native or linear blending: images blend as text does, the alpha is left alone', async ($, on) => {
    await startGhostty($, on, showConfig(['alpha-blending = native']))
    const png = await landedPng($)
    await init()
    expect(png).toBe(expected(ghosttyEnv({ cellWidth: 10, cellHeight: 21 })))
  })
})
