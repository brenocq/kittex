// The math on the text font's own baseline and at its x-height: kittex reads
// the font's metrics from its file once set up (kitty names the file, Ghostty
// the family, found with fontconfig; Ghostty's built-in JetBrains Mono when it
// names none), with kitty's modify_font and text_composition_strategy.
// Measured live on kitty 0.49.1 and Ghostty 1.3.1 (see core/src/terminal/cell.ts).

import { describe, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { cellProbe, emPxForCell, GHOSTTY_BUILTIN_FONT, init, measureDisplay, renderDisplay, textLayout, toBase64 } from '../hooks/core.js'
import { MATH_INK_DEPTH, mathBaseline, mathEmPxFor, renderEnvFor, TEXT_BASELINE } from '../hooks/math.ts'
import type { KittexEnv } from '../hooks/math.ts'
import { COLUMNS, test } from './support.ts'

/** Liberation Mono's metrics, as readFontMetrics reads LiberationMono-Regular.ttf. */
const LIBERATION = { unitsPerEm: 2048, ascender: 1705, descender: -615, lineGap: 0, xHeight: 1082, advance: 1229 }

const be16 = (v: number) => [(v >> 8) & 0xff, v & 0xff]
const be32 = (v: number) => [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]

/** A font file of head, hhea and OS/2 (version 4, sxHeight) with these metrics. */
function fontFile(m: { unitsPerEm: number; ascender: number; descender: number; lineGap: number; xHeight: number }): Uint8Array {
  const head = new Array(54).fill(0)
  head.splice(18, 2, ...be16(m.unitsPerEm))
  const hhea = new Array(36).fill(0)
  hhea.splice(4, 6, ...be16(m.ascender & 0xffff), ...be16(m.descender & 0xffff), ...be16(m.lineGap))
  const os2 = new Array(96).fill(0)
  os2.splice(0, 2, ...be16(4))
  os2.splice(4, 2, ...be16(400))
  os2.splice(86, 2, ...be16(m.xHeight))
  const tables: [string, number[]][] = [['head', head], ['hhea', hhea], ['OS/2', os2]]
  let offset = 12 + 16 * tables.length
  const dir: number[] = []
  for (const [tag, data] of tables) {
    dir.push(...[...tag].map(c => c.charCodeAt(0)), 0, 0, 0, 0, ...be32(offset), ...be32(data.length))
    offset += data.length
  }
  return Uint8Array.from([...be32(0x00010000), ...be16(tables.length), 0, 0, 0, 0, 0, 0, ...dir, ...tables.flatMap(([, d]) => d)])
}

const KITTY = { TERM: 'xterm-kitty', KITTY_WINDOW_ID: '1' }
const GHOSTTY = { TERM: 'xterm-ghostty', TERM_PROGRAM: 'ghostty', GHOSTTY_BIN_DIR: '/usr/bin' }

interface World {
  terminal: Record<string, string>
  cell: { cellWidth: number; cellHeight: number }
  /** What kittex's terminal probe prints (kitty +runpy, ghostty +show-config). */
  probe: string
  uname?: string
  /** fc-match's answer. */
  match?: string
  /** CoreText's answer (osascript, on macOS). */
  coretext?: string
  files?: Record<string, Uint8Array>
}

/** A session in this terminal; the clock is mocked, so the font is read only when it advances. */
async function start($: Engine, on: On, world: World) {
  const clock = mock.clock(on)
  mock.env(on, world.terminal)
  const ran: string[] = []
  const read: string[] = []
  on('process.run', ($, e) => {
    ran.push(e.argv[0]!)
    const { cellWidth, cellHeight } = world.cell
    const answers: [boolean, string | undefined][] = [
      [e.argv.join('\0') === cellProbe.argv.join('\0'), `50 ${COLUMNS} ${COLUMNS * cellWidth} ${50 * cellHeight}\n`],
      [e.argv[0] === 'uname', world.uname],
      [e.argv[1] === '+runpy' || e.argv[1] === '+show-config', world.probe],
      [e.argv[0] === 'fc-match', world.match],
      [e.argv[0] === 'osascript', world.coretext],
    ]
    const stdout = answers.find(([hit]) => hit)?.[1]
    return { value: { exitCode: stdout === undefined ? 1 : 0, stdout: stdout ?? '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('fs.read', ($, e) => {
    read.push(e.path)
    const bytes = world.files?.[e.path]
    return bytes && e.as === 'bytes' ? ({ value: { base64: toBase64(bytes) } } as never) : { deny: 'no such file' }
  })
  on('config.list', () => ({
    value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: 'dark', provider: { plugin: 'engine', tier: 'core' }, isLocked: false }],
  }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('prompt.compose', () => ({ sections: [] }))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => ({ type: 'Text' as const, children: [e.props.text] }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  return { clock, ran, read }
}

const TEX = '\\frac{1}{n}\\sum_{i=1}^{n} x_i'
const REPLY = `The mean:\n\n$$${TEX}$$\n\nof the samples.`

/** The display formula's PNG (base64) as the landed reply draws it now. */
async function drawn($: Engine): Promise<string> {
  const ui = await $.ui.mount({
    plugin: 'kittex',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: REPLY, isFirstOfReply: true },
    viewport: { columns: COLUMNS, rows: 50, isFullscreen: false },
  })
  const image = await ui.find({ type: 'Image' })
  await ui.unmount()
  return (image!.props as { source: { png: string } }).source.png
}

/** The PNG kittex should draw for TEX in `env`. */
async function expected(env: KittexEnv): Promise<string> {
  await init()
  const renderEnv = renderEnvFor(env, COLUMNS)
  return toBase64(renderDisplay(TEX, renderEnv, measureDisplay(TEX, renderEnv).rows).png)
}

/** kittex.env for these cells and ink before the font is read. */
function envFor(kind: 'kitty' | 'ghostty', cell: { cellWidth: number; cellHeight: number }, extra: Partial<KittexEnv> = {}): KittexEnv {
  return { kind, images: true, ...cell, columns: COLUMNS, emPx: emPxForCell(cell), ink: { r: 0xeb, g: 0xdb, b: 0xb2 }, measured: true, ...extra }
}

const kittyProbe = (lines: string[]) => ['foreground #ebdbb2', 'background #282828', ...lines, ''].join('\n')

describe('the text font', () => {
  test('kitty: the file its probe names is read after setup, then the math takes its x-height', async ($, on) => {
    const cell = { cellWidth: 14, cellHeight: 28 }
    const { clock, read } = await start($, on, {
      terminal: KITTY,
      cell,
      uname: 'Linux\n',
      probe: kittyProbe(['font_size 18.0', 'text_composition platform', 'font_file 0 /fonts/LiberationMono-Regular.ttf']),
      files: { '/fonts/LiberationMono-Regular.ttf': fontFile(LIBERATION) },
    })
    expect(await drawn($)).toBe(await expected(envFor('kitty', cell)))
    expect(read).not.toContain('/fonts/LiberationMono-Regular.ttf')
    await clock.advance(1)
    expect(read).toContain('/fonts/LiberationMono-Regular.ttf')
    // The file holds no hmtx: no advance.
    const font = { unitsPerEm: 2048, ascender: 1705, descender: -615, lineGap: 0, xHeight: 1082, sizePt: 18, platform: 'linux' }
    const env = envFor('kitty', cell, { font })
    env.emPx = mathEmPxFor(cell, env)
    expect(env.emPx).not.toBe(emPxForCell(cell))
    expect(await drawn($)).toBe(await expected(env))
    // kitty sets Liberation Mono 18 pt (24 px per em) 20 px down its 28 px cell, where the old rule put the math at 22.
    expect(textLayout('kitty', LIBERATION, cell, { sizePt: 18, platform: 'linux' })!.baselinePx).toBe(20)
    expect(mathBaseline(env)).toBe(20 - Math.round(MATH_INK_DEPTH.kitty * env.emPx))
    expect(mathBaseline({ ...env, font: undefined })).toBe(Math.round(28 * TEXT_BASELINE))
  })

  test('kitty modify_font: the baseline moved as kitty moves it (3 pt up is 4 px at 96 DPI)', () => {
    const cell = { cellWidth: 11, cellHeight: 22 }
    const kittyAdjust = { baseline: { value: 3, unit: 'pt' as const } }
    // Liberation Mono 14 pt: 16 px down its 22 px cell, and 12 with the baseline 3 pt up (both measured live).
    expect(textLayout('kitty', LIBERATION, cell, { sizePt: 14 })!.baselinePx).toBe(16)
    const env = envFor('kitty', cell, { kittyAdjust, font: { ...LIBERATION, sizePt: 14 } })
    expect(mathBaseline(env)).toBe(12 - Math.round(MATH_INK_DEPTH.kitty * env.emPx))
    // 130% taller cells (29 px): the rows added go half above the text.
    const tall = envFor('kitty', { cellWidth: 11, cellHeight: 29 }, { kittyAdjust: { cellHeight: { value: 130, unit: '%' } }, font: { ...LIBERATION, sizePt: 14 } })
    expect(mathBaseline(tall)).toBe(16 + 3 - Math.round(MATH_INK_DEPTH.kitty * tall.emPx))
  })

  test("Ghostty with no font-family: the built-in JetBrains Mono's metrics, no process run for them", async ($, on) => {
    const { clock, ran } = await start($, on, {
      terminal: GHOSTTY,
      cell: { cellWidth: 9, cellHeight: 20 },
      uname: 'Linux\n',
      probe: 'foreground = #ebdbb2\nbackground = #282828\nfont-family = \nfont-size = 11\nalpha-blending = linear-corrected\n',
    })
    await clock.advance(1)
    const { weight: _, ...metrics } = GHOSTTY_BUILTIN_FONT
    const cell = { cellWidth: 9, cellHeight: 20 }
    const env = envFor('ghostty', cell, { font: { ...metrics, sizePt: 11, platform: 'linux' }, inkOver: { r: 0x28, g: 0x28, b: 0x28 } })
    env.emPx = mathEmPxFor(cell, env)
    expect(await drawn($)).toBe(await expected(env))
    expect(ran).not.toContain('fc-match')
    // JetBrains Mono 11 pt: Ghostty's 20 px cell holds the baseline 16 px down.
    expect(textLayout('ghostty', GHOSTTY_BUILTIN_FONT, { cellWidth: 9, cellHeight: 20 }, { sizePt: 11 })!.baselinePx).toBe(16)
    expect(mathBaseline(env)).toBe(16 - Math.round(MATH_INK_DEPTH.ghostty * env.emPx))
  })

  test('Ghostty with a family: the file fontconfig finds, unless fontconfig has no such family', async ($, on) => {
    const { clock, ran, read } = await start($, on, {
      terminal: GHOSTTY,
      cell: { cellWidth: 11, cellHeight: 22 },
      probe: 'foreground = #ebdbb2\nbackground = #282828\nfont-family = Liberation Mono\nfont-size = 14\n',
      match: '/fonts/LiberationMono-Regular.ttf\n0\nLiberation Mono\n',
      files: { '/fonts/LiberationMono-Regular.ttf': fontFile(LIBERATION) },
    })
    await clock.advance(1)
    expect(ran).toContain('fc-match')
    expect(read).toContain('/fonts/LiberationMono-Regular.ttf')
  })

  test("a family fontconfig doesn't have: Ghostty draws its built-in JetBrains Mono, and so do the metrics", async ($, on) => {
    const { clock, read } = await start($, on, {
      terminal: GHOSTTY,
      cell: { cellWidth: 11, cellHeight: 22 },
      probe: 'foreground = #ebdbb2\nbackground = #282828\nfont-family = Nonexistent Mono\nfont-size = 14\nalpha-blending = native\n',
      match: '/fonts/DejaVuSans.ttf\n0\nDejaVu Sans\n',
    })
    await clock.advance(1)
    expect(read).not.toContain('/fonts/DejaVuSans.ttf')
    const { weight: _, ...metrics } = GHOSTTY_BUILTIN_FONT
    const cell = { cellWidth: 11, cellHeight: 22 }
    const env = envFor('ghostty', cell, { font: { ...metrics, sizePt: 14 } })
    env.emPx = mathEmPxFor(cell, env)
    expect(await drawn($)).toBe(await expected(env))
  })

  test('Ghostty on macOS with a family and no fontconfig: the file CoreText finds, its metrics drawn with', async ($, on) => {
    const cell = { cellWidth: 11, cellHeight: 22 }
    const { clock, ran, read } = await start($, on, {
      terminal: GHOSTTY,
      cell,
      uname: 'Darwin\n',
      probe: 'foreground = #ebdbb2\nbackground = #282828\nfont-family = Liberation Mono\nfont-size = 14\n',
      coretext: '/Library/Fonts/LiberationMono-Regular.ttf\nLiberationMono\nLiberation Mono\n',
      files: { '/Library/Fonts/LiberationMono-Regular.ttf': fontFile(LIBERATION) },
    })
    await clock.advance(1)
    expect(ran).toContain('osascript')
    expect(read).toContain('/Library/Fonts/LiberationMono-Regular.ttf')
    const { advance: _, ...metrics } = LIBERATION
    const env = envFor('ghostty', cell, { font: { ...metrics, sizePt: 14, platform: 'darwin' } })
    env.emPx = mathEmPxFor(cell, env)
    expect(await drawn($)).toBe(await expected(env))
    const { weight: __, ...builtin } = GHOSTTY_BUILTIN_FONT
    const jetbrains = envFor('ghostty', cell, { font: { ...builtin, sizePt: 14, platform: 'darwin' } })
    jetbrains.emPx = mathEmPxFor(cell, jetbrains)
    expect(await drawn($)).not.toBe(await expected(jetbrains))
  })

  test("kitty's text curve: on macOS `platform` is 1.7 30, and the ink's alpha follows it", async ($, on) => {
    const cell = { cellWidth: 13, cellHeight: 26 }
    await start($, on, { terminal: KITTY, cell, uname: 'Darwin\n', probe: kittyProbe(['text_composition platform']) })
    const env = envFor('kitty', cell, { inkOver: { r: 0x28, g: 0x28, b: 0x28 }, inkCurve: { gamma: 1.7, contrast: 30 } })
    expect(renderEnvFor(env, COLUMNS).inkCurve).toEqual({ gamma: 1.7, contrast: 30 })
    expect(await drawn($)).toBe(await expected(env))
    expect(await drawn($)).not.toBe(await expected(envFor('kitty', cell)))
  })

  test('kitty legacy: the gamma correction, no curve', async ($, on) => {
    const cell = { cellWidth: 13, cellHeight: 26 }
    await start($, on, { terminal: KITTY, cell, uname: 'Linux\n', probe: kittyProbe(['text_composition legacy']) })
    expect(await drawn($)).toBe(await expected(envFor('kitty', cell, { inkOver: { r: 0x28, g: 0x28, b: 0x28 } })))
  })

  test('kitty platform on Linux: the alpha as it is', async ($, on) => {
    const cell = { cellWidth: 13, cellHeight: 26 }
    await start($, on, { terminal: KITTY, cell, uname: 'Linux\n', probe: kittyProbe(['text_composition platform']) })
    expect(await drawn($)).toBe(await expected(envFor('kitty', cell)))
  })
})
