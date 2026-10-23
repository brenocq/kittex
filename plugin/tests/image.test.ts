// Image blocks: a ```latex block holding one \includegraphics is drawn as the
// file it names (image.ts, core's image/). The stream holds the block while
// the file is read, writes a placeholder of exactly the image's rows, and the
// landing draws the image there. The files are fakes here (the kit has no
// disk); core/test/image covers detection and sizing, and the decoders theirs.

import { describe, expect } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { createLineScanner, imageBlock, init, measureImage, readImageFile, renderImage } from '../hooks/core.js'
import type { ImageSource, ImageSpec } from '../hooks/core.js'
import { DIAGRAM_INSTRUCTIONS, IMAGE_LABEL, imageInstructions, MATH_INSTRUCTIONS, MessageStream, NOT_RENDERED, pictureEnvFor, planLanded, renderEnvFor, SECTION_ID, STREAMED_PATTERN } from '../hooks/math.ts'
import type { PreviewRecord, StreamEnv, StreamRewrite } from '../hooks/math.ts'
import { ImageBook, imageBook, imageSpecOf } from '../hooks/image.ts'
import type { ImageHost } from '../hooks/image.ts'
import { texBook } from '../hooks/tex.ts'
import type { TexHost } from '../hooks/tex.ts'
import { COLUMNS, COMPOSE, KITTY, kittyEnv, startSession, test } from './support.ts'

const fromBase64 = (text: string) => (Uint8Array as unknown as { fromBase64(text: string): Uint8Array }).fromBase64(text)

/** A 60 × 30 PNG, red to blue from left to right. */
const GRADIENT_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAADwAAAAeCAIAAAD/+uoYAAAA7UlEQVR42u3OQUcDAACG4fewQ4cOUTSKolhsLBaLRbHY2GgUi42iKIqiWBRFsbFRbBSNRVEsNhZFsbFYFIuiKBaNoujQocMO9Su6fc8vePiFGoYf6r6p/6Lhg6Y3jK+0Vmh/ovOBrjssZbqv6SnRW6Qvz8A5g6e4c3gz+NKMHDK6TzDF+C6T20zHmd1kPspimKV1VlZZW2YjRGSB2BxbMySm2JkgOcZegAM/R8McD5H1cOLizMlFPwUHl3aubNxYuTVzb+Kxg+c2XlqoNvPeyCdKK6200korrbTSSiuttNJKK6200korrbTS/5X+AztqAWI5zjdaAAAAAElFTkSuQmCC'
const GRADIENT = fromBase64(GRADIENT_B64)
/** A 60 × 30 PNG, all green: the same plot written again. */
const GREEN = fromBase64('iVBORw0KGgoAAAANSUhEUgAAADwAAAAeCAIAAAD/+uoYAAAAMklEQVR42u3OQQkAAAgAseufzFim8CEMFmA1/SMtLS0tLS0tLS0tLS0tLS0tLS0tfWUBcAF+jIsC4Z4AAAAASUVORK5CYII=')

const PLOT = '\\includegraphics[width=0.5\\linewidth]{out/plot.png}'
const FENCE = '```latex\n' + PLOT + '\n```'

interface FakeFiles {
  host: ImageHost
  /** Paths read, in order. */
  reads: string[]
  files: Map<string, { bytes: Uint8Array; mtimeMs: number }>
}

/** A host whose files are `files` (by absolute path). */
function fakeFiles(files: Record<string, Uint8Array> = { '/w/out/plot.png': GRADIENT }): FakeFiles {
  const reads: string[] = []
  const map = new Map(Object.entries(files).map(([path, bytes]) => [path, { bytes, mtimeMs: 1000 }]))
  const host: ImageHost = {
    stat: async path => {
      const file = map.get(path)
      return file ? { kind: 'file', size: file.bytes.length, mtimeMs: file.mtimeMs, realPath: path } : undefined
    },
    readBytes: async path => {
      reads.push(path)
      return map.get(path)?.bytes
    },
  }
  return { host, reads, files: map }
}

/** Where image files are drawn: kitty, display math as images, no TeX. */
function filesEnv(extra: Partial<StreamEnv> = {}): StreamEnv {
  return { ...kittyEnv(), inline: true, math: { block: 'image', inline: 'image' }, imageFiles: true, ...extra }
}

/** Streams flushes as register.tsx does: the book reads what a flush waits for, then the stream resumes. */
async function streamed(flushes: readonly string[], env: StreamEnv = filesEnv()): Promise<{ landed: string; records: PreviewRecord[]; waited: number }> {
  const stream = new MessageStream(createLineScanner({ diagrams: env.tex?.block === true || env.imageFiles === true }))
  let landed = ''
  const records: PreviewRecord[] = []
  let waited = 0
  for (const [i, delta] of flushes.entries()) {
    let rewrite: StreamRewrite = stream.push(delta, i === flushes.length - 1, env)
    for (;;) {
      landed += rewrite.text
      records.push(...rewrite.records)
      if (!rewrite.images?.length && !rewrite.pending?.length) break
      waited += 1
      for (const spec of rewrite.images ?? []) await imageBook.load(spec, 3000)
      for (const document of rewrite.pending ?? []) await texBook.compile(document, 3000)
      rewrite = stream.resume(env)
    }
  }
  return { landed, records, waited }
}

/** The landing's drawing of an image block, as register.tsx's fileImage does it. */
function drawFile(source: string, kind: 'latex' | 'tikz' | 'env', rows?: number) {
  const spec = imageSpecOf(source, kind)
  const outcome = spec ? imageBook.known(spec) : undefined
  if (!spec || !outcome) return null
  return outcome.ok ? renderImage(outcome.source, spec, pictureEnvFor(kittyEnv()), rows) : { error: outcome.error }
}

const source = (bytes: Uint8Array): ImageSource => {
  const read = readImageFile(bytes)
  if (read === 'pdf') throw new Error('not a PDF')
  return read
}

const lines = (text: string) => text.split('\n')

describe('image blocks while streaming', () => {
  test('an image block is held until its file is read, then written as a placeholder of exactly its rows', async () => {
    await init()
    texBook.reset()
    const fake = fakeFiles()
    imageBook.reset(fake.host, { cwd: '/w', home: '/home/u' })
    const { landed, records, waited } = await streamed(['Here is the plot:\n', '\n', '```latex\n', `${PLOT}\n`, '```\n', '\nDone.\n'])
    expect(waited).toBe(1)
    // Relative to the session's working directory, read once.
    expect(fake.reads).toEqual(['/w/out/plot.png'])
    const spec = imageBlock(PLOT)!
    const box = measureImage(source(GRADIENT), spec, pictureEnvFor(kittyEnv()))
    // Its own 60 pixels: half the column is wider, and an image is never drawn past its own pixels.
    expect(box.columns).toBe(Math.ceil(60 / kittyEnv().cellWidth))
    expect(records).toEqual([expect.objectContaining({ tex: PLOT, rows: box.rows, diagram: 'latex' })])
    const preview = records[0]!.preview
    expect(lines(preview)).toHaveLength(box.rows)
    expect(landed).toContain(preview)
    expect(landed.startsWith('Here is the plot:\n\n')).toBe(true)
    expect(landed.endsWith('\nDone.\n')).toBe(true)
    expect(landed).not.toContain('```')
    expect(STREAMED_PATTERN.test(landed)).toBe(true)
  })

  test("the placeholder shows the word image where it has room", async () => {
    await init()
    texBook.reset()
    imageBook.reset(fakeFiles({ '/w/wide.png': GRADIENT }).host, { cwd: '/w' })
    // Drawn at its 60 pixels: about eight cells, too narrow for `· image ·`, so the shorter `image`.
    const { records } = await streamed(['```latex\n\\includegraphics{wide.png}\n```\n'])
    expect(records[0]!.preview).toContain(IMAGE_LABEL)
  })

  test('a file missing, or not an image, leaves the block as written with a note naming why', async () => {
    await init()
    texBook.reset()
    imageBook.reset(fakeFiles({ '/w/notes.txt': new TextEncoder().encode('hello, world\n') }).host, { cwd: '/w' })
    const missing = '```latex\n\\includegraphics{missing.png}\n```'
    const text = '```latex\n\\includegraphics{notes.txt}\n```'
    const { landed, records } = await streamed([`${missing}\n`, '\n', `${text}\n`])
    expect(landed).toContain(missing)
    expect(landed).toContain(text)
    expect(landed).toContain('no file at /w/missing.png')
    expect(landed).toContain('not a PNG, JPEG, SVG or PDF file')
    expect(records.map(record => record.error)).toEqual(['no file at /w/missing.png', 'not a PNG, JPEG, SVG or PDF file'])
  })

  test('with TeX there too, an image block goes to its file and never to TeX', async () => {
    await init()
    const runs: string[][] = []
    const tex: TexHost = {
      run: async argv => {
        runs.push([...argv])
        return { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false }
      },
      write: async () => undefined,
      read: async () => undefined,
    }
    texBook.reset(tex, { versions: 'pdfTeX\ndvisvgm', confinement: { prlimit: true }, tmpdir: '/tmp' })
    imageBook.reset(fakeFiles().host, { cwd: '/w' })
    const { records } = await streamed([`${FENCE}\n`], filesEnv({ tex: { block: true, inline: true } }))
    expect(records).toEqual([expect.objectContaining({ tex: PLOT, diagram: 'latex' })])
    expect(records[0]!.error).toBeUndefined()
    expect(runs).toEqual([])
    texBook.reset()
  })

  test('a ```latex block that is no image stays code where there is no TeX, and is not held', async () => {
    await init()
    texBook.reset()
    const fake = fakeFiles()
    imageBook.reset(fake.host, { cwd: '/w' })
    const tikz = '```latex\n\\begin{tikzpicture}\n\\draw (0,0) -- (1,1);\n\\end{tikzpicture}\n```\n'
    const { landed, records, waited } = await streamed([tikz])
    expect(landed).toBe(tikz)
    expect(records).toEqual([])
    expect(waited).toBe(0)
    expect(fake.reads).toEqual([])
  })

  test('no image files (display math as Unicode, no images, in a quote): the block as written, the file never read', async () => {
    await init()
    texBook.reset()
    const fake = fakeFiles()
    imageBook.reset(fake.host, { cwd: '/w' })
    for (const env of [filesEnv({ imageFiles: false }), filesEnv({ math: { block: 'unicode', inline: 'image' } }), filesEnv({ images: false })]) {
      const { landed, records } = await streamed([`${FENCE}\n`], env)
      expect(landed).toBe(`${FENCE}\n`)
      expect(records).toEqual([])
    }
    const quoted = `> ${FENCE.split('\n').join('\n> ')}\n`
    const { records } = await streamed([quoted])
    expect(records).toEqual([])
    expect(fake.reads).toEqual([])
  })
})

describe('image blocks landing', () => {
  test('the placeholder becomes the image in its rows, centred, the PNG its cells exactly', async () => {
    await init()
    texBook.reset()
    imageBook.reset(fakeFiles().host, { cwd: '/w' })
    const { landed, records } = await streamed([`Look:\n\n${FENCE}\n`, '\nDone.\n'])
    const env = kittyEnv()
    const pictureEnv = pictureEnvFor(env)
    const plan = planLanded(landed, records, {
      maxColumns: renderEnvFor(env).maxColumns,
      draw: () => {
        throw new Error('no math here')
      },
      diagram: drawFile,
    })
    const overlays = plan.pieces.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []) : []))
    expect(overlays).toEqual([expect.objectContaining({ tex: PLOT, copy: PLOT, display: true, image: expect.objectContaining({ rows: records[0]!.rows }) })])
    const [overlay] = overlays
    expect(overlay!.col).toBe(Math.floor((pictureEnv.maxColumns - overlay!.image.columns) / 2))
    // The PNG covers its cells exactly, the image's pixels centred in them.
    const drawn = source(overlay!.image.png)
    if (drawn.kind !== 'bitmap') throw new Error('not a bitmap')
    expect([drawn.width, drawn.height]).toEqual([Math.round(overlay!.image.columns * env.cellWidth), Math.round(overlay!.image.rows * env.cellHeight)])
  })

  test('after --resume the block as written asks for its file, and is drawn once it is read', async () => {
    await init()
    texBook.reset()
    imageBook.reset(fakeFiles().host, { cwd: '/w' })
    const env = kittyEnv()
    const text = `Look:\n\n${FENCE}\n`
    const options = { maxColumns: renderEnvFor(env).maxColumns, draw: () => ({ columns: 1, rows: 1, scale: 1, png: new Uint8Array() }), diagram: (src: string, kind: 'latex' | 'tikz' | 'env', rows?: number) => {
      const spec = imageSpecOf(src, kind)
      if (spec && !imageBook.known(spec)) imageBook.ask(spec)
      return drawFile(src, kind, rows)
    } }
    imageBook.takeAsked()
    expect(planLanded(text, [], options).changed).toBe(false)
    const asked = imageBook.takeAsked()
    expect(asked).toEqual([imageBlock(PLOT)])
    for (const spec of asked) await imageBook.load(spec, 3000)
    const plan = planLanded(text, [], options)
    expect(plan.changed).toBe(true)
    const joined = plan.pieces.map(piece => (piece.kind === 'prose' ? piece.text : '')).join('')
    expect(joined).toContain(IMAGE_LABEL)
    expect(joined).not.toContain(FENCE)
  })
})

describe('the image book', () => {
  const spec: ImageSpec = { path: 'out/plot.png' }

  test('a file is decoded once per version: unchanged it is reused, a rewritten plot is read again', async () => {
    const fake = fakeFiles()
    const book = new ImageBook()
    book.reset(fake.host, { cwd: '/w' })
    const first = await book.load(spec, 3000)
    const again = await book.load(spec, 3000)
    expect(first.ok && again.ok).toBe(true)
    expect(again).toBe(first)
    expect(fake.reads).toHaveLength(1)
    // The script writes the plot again: new bytes, a new modification time.
    fake.files.set('/w/out/plot.png', { bytes: GREEN, mtimeMs: 2000 })
    const after = await book.load(spec, 3000)
    expect(fake.reads).toHaveLength(2)
    if (!after.ok || !first.ok) throw new Error('not read')
    expect(after.id).not.toBe(first.id)
    if (after.source.kind !== 'bitmap') throw new Error('not a bitmap')
    expect([...after.source.bitmap.rgba.subarray(0, 4)]).toEqual([0, 200, 0, 255])
  })

  test('each stream looks at the file again (checkedSince)', async () => {
    const book = new ImageBook()
    book.reset(fakeFiles().host, { cwd: '/w' })
    const before = Date.now()
    expect(book.checkedSince(spec, before)).toBe(false)
    await book.load(spec, 3000)
    expect(book.checkedSince(spec, before)).toBe(true)
    expect(book.checkedSince(spec, Date.now() + 1)).toBe(false)
  })

  test('paths: relative to the working directory, ~/ to the home directory; one it cannot place is a note', async () => {
    const fake = fakeFiles({ '/w/a.png': GRADIENT, '/home/u/b.png': GRADIENT })
    const book = new ImageBook()
    book.reset(fake.host, { cwd: '/w', home: '/home/u' })
    expect((await book.load({ path: 'a.png' }, 3000)).ok).toBe(true)
    expect((await book.load({ path: '~/b.png' }, 3000)).ok).toBe(true)
    expect(fake.reads).toEqual(['/w/a.png', '/home/u/b.png'])
    expect(await book.load({ path: '~bob/c.png' }, 3000)).toEqual({ ok: false, error: "can't tell where ~bob/c.png is", lasting: true })
  })

  test('a file over the read limit is refused before it is read', async () => {
    const fake = fakeFiles()
    fake.files.set('/w/big.png', { bytes: new Uint8Array(5 * 1024 * 1024), mtimeMs: 1 })
    const book = new ImageBook()
    book.reset(fake.host, { cwd: '/w' })
    expect(await book.load({ path: 'big.png' }, 3000)).toEqual({ ok: false, error: '/w/big.png is larger than 4 MiB', lasting: true })
    expect(fake.reads).toEqual([])
  })

  test('a PDF goes to the host converter; without one it is a note', async () => {
    const pdf = new TextEncoder().encode('%PDF-1.7\n%...\n')
    const fake = fakeFiles({ '/w/fig.pdf': pdf })
    const book = new ImageBook()
    book.reset(fake.host, { cwd: '/w' })
    const without = await book.load({ path: 'fig.pdf' }, 3000)
    expect(without).toMatchObject({ ok: false, lasting: true })
    const converted: string[] = []
    book.reset({ ...fake.host, pdf: async path => {
      converted.push(path)
      return { ok: true, picture: { width: 2, height: 1, depth: 0, ops: [{ type: 'fill', d: 'M0 0H2V-1H0Z', transform: [1, 0, 0, 1, 0, 0], rule: 'nonzero', paint: { color: { r: 0, g: 0, b: 0 }, opacity: 1 } }], clips: [] } }
    } }, { cwd: '/w' })
    const drawn = await book.load({ path: 'fig.pdf' }, 3000)
    expect(converted).toEqual(['/w/fig.pdf'])
    expect(drawn).toMatchObject({ ok: true, source: { kind: 'picture' } })
  })
})

describe('image blocks in a session', () => {
  /** Files the engine answers $.fs.stat and $.fs.read with, and the session's working directory. */
  function serveFiles(on: On, files: Record<string, string>) {
    on('fs.stat', ($, e) => {
      const base64 = files[e.path]
      if (base64 === undefined) throw new Error(`ENOENT: ${e.path}`)
      return { value: { kind: 'file' as const, size: fromBase64(base64).length, mtimeMs: 1, isLink: false, realPath: e.path } }
    })
    on('fs.read', ($, e) => {
      const base64 = files[e.path]
      if (base64 === undefined) throw new Error(`ENOENT: ${e.path}`)
      return { value: { base64 } }
    })
    on('session.cwd', () => ({ value: '/w' }))
  }

  function mount($: Engine, text: string) {
    return $.ui.mount({ plugin: 'kittex', surface: 'terminal', component: 'AssistantMessage', props: { text, isFirstOfReply: true }, viewport: { columns: COLUMNS, rows: 50, isFullscreen: false } })
  }

  function sources(node: unknown): string[] {
    if (typeof node !== 'object' || node === null) return []
    const element = node as { type?: unknown; props?: { source?: { png?: unknown } }; children?: unknown[] }
    const own = element.type === 'Image' && typeof element.props?.source?.png === 'string' ? [element.props.source.png] : []
    return [...own, ...(element.children ?? []).flatMap(sources)]
  }

  test('a streamed image block lands as an Image of the file', async ($, on) => {
    serveFiles(on, { '/w/out/plot.png': GRADIENT_B64 })
    await startSession($, on)
    await init()
    const text = `Here:\n\n${FENCE}\n\nDone.\n`
    let shown = ''
    for (const [index, delta] of text.split(/(?<=\n)/).entries()) {
      const result = await $.classic.MessageDisplay({ turn_id: 't', message_id: 'm', index, final: index === text.split(/(?<=\n)/).length - 1, delta })
      shown += result.displayContent ?? delta
    }
    expect(shown).not.toContain('```')
    const images = sources(await (await mount($, shown)).drawn())
    expect(images).toHaveLength(1)
    const drawn = source(fromBase64(images[0]!))
    expect(drawn.kind).toBe('bitmap')
  })

  test('a reply read back after --resume draws its image block', async ($, on) => {
    serveFiles(on, { '/w/out/plot.png': GRADIENT_B64 })
    await startSession($, on)
    await init()
    const images = sources(await (await mount($, `Here:\n\n${FENCE}\n`)).drawn())
    expect(images).toHaveLength(1)
  })

  test('the instructions tell the model how to show a file, PDF left out without TeX', async ($, on) => {
    await startSession($, on)
    const { sections } = await $.prompt.compose(COMPOSE)
    const text = sections.find(one => one.id === SECTION_ID)?.text
    expect(text).toBe(`${MATH_INSTRUCTIONS} ${imageInstructions(false)}`)
    expect(text).not.toContain(DIAGRAM_INSTRUCTIONS)
    expect(imageInstructions(false)).not.toContain('PDF')
    expect(imageInstructions(true)).toContain('PDF')
    // Asked to show an image, a model otherwise reads it with the Read tool, which shows it to the model alone.
    expect(imageInstructions(false)).toContain('the Read tool shows it to you alone')
    // The block draws local files only: an image URL is fetched to one first.
    expect(imageInstructions(false)).toContain('downloaded to a temporary file first')
    // Told that a hook was skipped, a model hedges under the image though it draws; kittex notes a failure itself.
    expect(imageInstructions(false)).toContain('add no fallback advice after the block')
  })

  test('where the local TeX converts PDF: the instructions offer PDFs, and a PDF block is drawn from its first page', async ($, on) => {
    // mutool's page: 50 × 40 pt, a blue square.
    const page = '<svg xmlns="http://www.w3.org/2000/svg" width="50pt" height="40pt" viewBox="0 0 50 40"><path d="M10 10H40V30H10Z" fill="#00f"/></svg>'
    serveFiles(on, { '/w/fig.pdf': btoa('%PDF-1.7\n%...\n') })
    const converted: string[][] = []
    // The probe writes its trial PDF into the job directory.
    on('fs.write', () => ({ value: undefined }))
    await startSession($, on, KITTY, 'dark', undefined, argv => {
      if ((argv[0] === 'latex' || argv[0] === 'dvisvgm') && argv[1] === '--version') return { exitCode: 0, stdout: `${argv[0]} 1.0\n` }
      if (argv.includes('mktemp')) return { exitCode: 0, stdout: '/tmp/kittex-tex.PdFpDfPdFp\n' }
      if (argv.includes('head')) return { exitCode: 0, stdout: '%PDF-1.7\n%...\n' }
      if (argv.includes('mutool') && argv.includes('draw')) {
        converted.push([...argv])
        return { exitCode: 0, stdout: page }
      }
      return argv.includes('cp') || argv.includes('rm') ? { exitCode: 0, stdout: '' } : undefined
    })
    const { sections } = await $.prompt.compose(COMPOSE)
    const text = sections.find(one => one.id === SECTION_ID)?.text
    expect(text).toContain(imageInstructions(true))
    const trials = converted.length
    expect(trials).toBeGreaterThan(0)
    await init()
    const images = sources(await (await mount($, 'Here:\n\n```latex\n\\includegraphics{fig.pdf}\n```\n')).drawn())
    expect(images).toHaveLength(1)
    expect(converted.length).toBe(trials + 1)
  })

  test('a terminal kittex draws no images in: no image instructions', async ($, on) => {
    await startSession($, on, { TERM: 'xterm-256color', TERM_PROGRAM: 'Apple_Terminal' })
    const { sections } = await $.prompt.compose(COMPOSE)
    expect(sections.find(one => one.id === SECTION_ID)?.text).toBe(MATH_INSTRUCTIONS)
  })
})

// Keep the fixtures honest: both decode to 60 × 30.
describe('fixtures', () => {
  test('the PNGs are what they say', () => {
    for (const bytes of [GRADIENT, GREEN]) {
      const read = source(bytes)
      expect([read.width, read.height]).toEqual([60, 30])
    }
    expect(KITTY).toBeDefined()
  })
})
