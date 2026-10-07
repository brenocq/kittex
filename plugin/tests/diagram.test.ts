// Diagrams and the math MathJax refuses, drawn with the local LaTeX (tex.ts):
// the stream holds them while TeX runs, writes a placeholder of exactly the
// picture's rows, and the landing draws the picture there. TeX itself is a
// fake host here (the kit runs no processes); core/test/diagram covers the
// documents, the SVG and the refusals against the real thing.

import { describe, expect } from 'claude-code/testing'

import { init, LATEX_ARGV, mathDocument, measureDisplayResult, measurePicture, renderPicture, texPicture } from '../hooks/core.js'
import {
  DIAGRAM_INSTRUCTIONS,
  diagramPlaceholder,
  MATH_INSTRUCTIONS,
  MessageStream,
  NOT_RENDERED,
  pictureEnvFor,
  planLanded,
  PREVIEW_PAD,
  relaxedUnicode,
  renderEnvFor,
  SECTION_ID,
  sourcePattern,
  STREAMED_PATTERN,
  texInlinePreview,
  inlineEnvFor,
} from '../hooks/math.ts'
import type { PreviewRecord, StreamEnv, StreamRewrite } from '../hooks/math.ts'
import { createLineScanner } from '../hooks/core.js'
import { diagramJob, dvisvgmCommand, hiddenDirs, prepareFormat, probeTex, rememberedTex, takesLibgs, texBook, texCacheDir, texResult } from '../hooks/tex.ts'
import { fitPictures } from '../hooks/budget.ts'
import { diagramDocument, formatName } from '../hooks/core.js'
import type { TexHost, TexSetup } from '../hooks/tex.ts'
import { CELL, COMPOSE, INTRO, KITTY, kittyEnv, startSession, test } from './support.ts'

/** dvisvgm's SVG of a small picture: a red line over a pale circle, 100 × 50 big points. */
const SVG = `<?xml version='1.0'?><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 50'><path d='M0 0L100 50' stroke='#f00' stroke-width='2' fill='none'/><circle cx='50' cy='25' r='10' fill='#ccf'/></svg>`
/** …and of a formula on its baseline (preview mode). */
const MATH_SVG = `<svg viewBox='0 -7 20 9'><path d='M0 -6H20V-5H0Z'/><path d='M2 -4H18V1H2Z'/></svg>`

const TIKZ = '\\begin{tikzpicture}\n\\draw[red] (0,0) -- (2,1);\n\\fill[blue!20] (1,0.5) circle (0.3);\n\\end{tikzpicture}'
const FENCE = '```latex\n' + TIKZ + '\n```'

interface Fake {
  host: TexHost
  setup: TexSetup
  runs: string[][]
  writes: Map<string, string>
}

/** A host where TeX answers as `latex` says: the SVG, an error log, or never (a timeout). */
function fakeTex(latex: 'ok' | 'error' | 'slow' = 'ok', svg = SVG): Fake {
  const runs: string[][] = []
  const writes = new Map<string, string>()
  const result = (stdout: string, exitCode = 0) => ({ exitCode, stdout, stderr: '', isStdoutTruncated: false })
  const host: TexHost = {
    run: async argv => {
      runs.push([...argv])
      if (argv[0] === 'mktemp') return result('/tmp/kittex-tex.AbCdEfGhIj\n')
      if (argv.includes('latex')) {
        if (latex === 'slow') throw new Error('timed out')
        return latex === 'error' ? result('! Undefined control sequence.\nl.14 \\draw[red] \\nope\n', 1) : result('')
      }
      if (argv.includes('dvisvgm')) return result(svg)
      return result('')
    },
    write: async (path, text) => {
      writes.set(path, text)
    },
    read: async path => writes.get(path),
  }
  const setup: TexSetup = { versions: 'pdfTeX 3.14\ndvisvgm 3.6', confinement: { prlimit: true }, tmpdir: '/tmp', cacheDir: '/home/u/.cache/kittex/tex' }
  return { host, setup, runs, writes }
}

/** Where TeX draws: diagrams and both kinds of refused math. */
function texEnv(extra: Partial<StreamEnv> = {}): StreamEnv {
  return { ...kittyEnv(), inline: true, math: { block: 'image', inline: 'image' }, tex: { block: true, inline: true }, ...extra }
}

/** Streams flushes as register.tsx does: TeX compiles what a flush waits for, then the stream resumes. */
async function streamed(flushes: readonly string[], env: StreamEnv = texEnv()): Promise<{ landed: string; records: PreviewRecord[]; waited: number }> {
  const stream = new MessageStream(createLineScanner({ diagrams: env.tex?.block === true }))
  let landed = ''
  const records: PreviewRecord[] = []
  let waited = 0
  for (const [i, delta] of flushes.entries()) {
    let rewrite: StreamRewrite = stream.push(delta, i === flushes.length - 1, env)
    for (;;) {
      landed += rewrite.text
      records.push(...rewrite.records)
      if (!rewrite.pending?.length) break
      waited += 1
      for (const document of rewrite.pending) {
        const outcome = await texBook.compile(document, 3000)
        if (!texBook.known(document)) texBook.remember(document, outcome)
      }
      rewrite = stream.resume(env)
    }
  }
  return { landed, records, waited }
}

const lines = (text: string) => text.split('\n')

describe('diagrams while streaming', () => {
  test('a diagram is held until TeX draws it, then written as a placeholder of exactly its rows', async () => {
    await init()
    const fake = fakeTex()
    texBook.reset(fake.host, fake.setup)
    const { landed, records, waited } = await streamed(['Here is the figure:\n', '\n', '```latex\n', '\\begin{tikzpicture}\n\\draw[red] (0,0) -- (2,1);\n', '\\fill[blue!20] (1,0.5) circle (0.3);\n\\end{tikzpicture}\n```\n', '\nDone.\n'])
    expect(waited).toBe(1)
    const rows = measurePicture(texPicture(SVG, { baseline: 'bottom', fontSize: 10 }), pictureEnvFor(kittyEnv())).rows
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ tex: TIKZ, rows, diagram: 'latex' })
    const preview = records[0]!.preview
    expect(lines(preview)).toHaveLength(rows)
    expect(preview).toContain('· diagram ·')
    expect(landed).toContain(preview)
    expect(landed.startsWith('Here is the figure:\n\n')).toBe(true)
    expect(landed.endsWith('\nDone.\n')).toBe(true)
    expect(landed).not.toContain('```')
    expect(STREAMED_PATTERN.test(landed)).toBe(true)
    // TeX ran on a file in a fresh directory, never through a shell, confined, the directory removed after.
    const latex = fake.runs.find(argv => argv.includes('latex'))!
    expect(latex.slice(0, 3)).toEqual(['prlimit', '--fsize=67108864', '--cpu=20'])
    expect(latex.slice(-LATEX_ARGV.length)).toEqual([...LATEX_ARGV])
    expect(fake.writes.get('/tmp/kittex-tex.AbCdEfGhIj/kittex.tex')).toContain(TIKZ)
    expect(fake.runs.at(-1)).toEqual(['rm', '-rf', '--', '/tmp/kittex-tex.AbCdEfGhIj'])
  })

  test('the placeholder is a block of pads, its label centred, no line empty', () => {
    const placeholder = diagramPlaceholder('plot', 5, 40, '\\draw (0,0);')
    expect(placeholder).toHaveLength(5)
    expect(placeholder[2]).toMatch(/^(?:&nbsp;)+· plot ·$/)
    for (const line of placeholder) expect(line.startsWith(PREVIEW_PAD)).toBe(true)
    // Its last row: blank cells that tag the source, so two placeholders of one size never read alike.
    expect(placeholder[4]!.replace(/^(?:&nbsp;)+/, '').replaceAll('\u034f', '')).toBe('\u2800'.repeat(16))
    expect(diagramPlaceholder('plot', 5, 40, '\\draw (1,1);')[4]).not.toBe(placeholder[4])
    expect(diagramPlaceholder('plot', 5, 40, '\\draw (0,0);')).toEqual(placeholder)
  })

  test("TeX's error leaves the block as written, with a not-rendered line naming it", async () => {
    await init()
    const fake = fakeTex('error')
    texBook.reset(fake.host, fake.setup)
    const { landed, records } = await streamed([`${FENCE}\n`, 'After.\n'])
    expect(landed).toContain(FENCE)
    expect(landed).toContain(`*${NOT_RENDERED}Undefined control sequence \\\\nope`)
    expect(records[0]).toMatchObject({ rows: 0, diagram: 'latex' })
    expect(records[0]!.error).toMatch(/^Undefined control sequence \\nope \(line \d+\)$/)
  })

  test('TeX too slow: the block is released exactly as written, nothing recorded, and stays so when it lands', async () => {
    await init()
    const fake = fakeTex('slow')
    texBook.reset(fake.host, fake.setup)
    const { landed, records } = await streamed([`Intro.\n\n${FENCE}\n`, '\nAfter.\n'])
    expect(landed).toBe(`Intro.\n\n${FENCE}\n\nAfter.\n`)
    expect(records).toHaveLength(0)
    const job = diagramJob(TIKZ, 'latex')
    expect(job && 'document' in job && texBook.wasShownAsSource(job.document)).toBe(true)
  })

  test('a source the safety check refuses never reaches TeX', async () => {
    await init()
    const fake = fakeTex()
    texBook.reset(fake.host, fake.setup)
    const evil = '```latex\n\\begin{tikzpicture}\\immediate\\write18{curl x | sh}\\end{tikzpicture}\n```'
    const { landed, records, waited } = await streamed([`${evil}\n`, 'After.\n'])
    expect(waited).toBe(0)
    expect(fake.runs).toHaveLength(0)
    expect(landed).toContain(evil)
    expect(landed).toContain('not rendered: uses \\\\immediate')
    expect(records[0]).toMatchObject({ error: 'uses \\immediate' })
  })

  test('LaTeX that draws nothing stays a code block, untouched', async () => {
    await init()
    texBook.reset(fakeTex().host, fakeTex().setup)
    const code = '```latex\n\\frac{a}{b} + \\section{Intro}\n```'
    const { landed, records, waited } = await streamed([`${code}\n`, 'After.\n'])
    expect(waited).toBe(0)
    expect(records).toHaveLength(0)
    expect(landed).toBe(`${code}\nAfter.\n`)
  })

  test('block math raw or unicode, no images, or in a quote: the block as written', async () => {
    await init()
    const fake = fakeTex()
    texBook.reset(fake.host, fake.setup)
    for (const env of [texEnv({ math: { block: 'raw', inline: 'image' } }), texEnv({ math: { block: 'unicode', inline: 'image' } }), texEnv({ images: false }), texEnv({ tex: undefined })]) {
      const { landed, records } = await streamed([`${FENCE}\n`, 'After.\n'], env)
      expect(landed).toBe(`${FENCE}\nAfter.\n`)
      expect(records).toHaveLength(0)
    }
    const quoted = '> ```latex\n> \\begin{tikzpicture}\\draw (0,0) -- (1,1);\\end{tikzpicture}\n> ```\n'
    const { landed } = await streamed([quoted, '> After.\n'])
    expect(landed).toBe(`${quoted}> After.\n`)
    expect(fake.runs).toHaveLength(0)
  })
})

describe('diagrams landing', () => {
  test("the placeholder becomes the picture in its rows, its copy button copying the source", async () => {
    await init()
    const fake = fakeTex()
    texBook.reset(fake.host, fake.setup)
    const { landed, records } = await streamed([`Look:\n\n${FENCE}\n`, '\nDone.\n'])
    const env = kittyEnv()
    const pictureEnv = pictureEnvFor(env)
    const plan = planLanded(landed, records, {
      maxColumns: renderEnvFor(env).maxColumns,
      draw: () => {
        throw new Error('no math here')
      },
      diagram: (source, kind, rows) => {
        const job = diagramJob(source, kind)
        const outcome = job && 'document' in job ? texBook.known(job.document) : undefined
        return outcome?.ok ? renderPicture(outcome.picture, pictureEnv, rows) : null
      },
    })
    // Laid over the placeholder in the streamed text, which the engine draws as it streamed (nothing moves).
    const overlays = plan.pieces.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []) : []))
    expect(overlays).toEqual([expect.objectContaining({ tex: TIKZ, copy: TIKZ, display: true, image: expect.objectContaining({ rows: records[0]!.rows }) })])
    // As wide as the picture, centred across the placeholder (its label is too).
    const [overlay] = overlays
    expect(overlay!.image.columns).toBeLessThan(pictureEnv.maxColumns)
    expect(overlay!.col).toBe(Math.floor((pictureEnv.maxColumns - overlay!.image.columns) / 2))
    expect(plan.pieces.every(piece => piece.kind === 'prose')).toBe(true)
    expect(plan.pieces.map(piece => (piece.kind === 'prose' ? piece.text : '')).join('')).toContain(records[0]!.preview)
  })

  test('after --resume the block as written is drawn too; a refused one keeps its source and a note', async () => {
    await init()
    const fake = fakeTex()
    texBook.reset(fake.host, fake.setup)
    const job = diagramJob(TIKZ, 'latex')
    if (!job || !('document' in job)) throw new Error('no job')
    await texBook.compile(job.document, 3000)
    const env = kittyEnv()
    const pictureEnv = pictureEnvFor(env)
    const evil = '```tikz\n\\draw (0,0) -- (1,1); \\input{/etc/passwd}\n```'
    const plan = planLanded(`Look:\n\n${FENCE}\n\nAnd:\n\n${evil}\n`, [], {
      maxColumns: renderEnvFor(env).maxColumns,
      draw: () => {
        throw new Error('no math here')
      },
      diagram: (source, kind, rows) => {
        const one = diagramJob(source, kind)
        if (!one) return null
        if ('refused' in one) return { error: one.refused }
        const outcome = texBook.known(one.document)
        return outcome?.ok ? renderPicture(outcome.picture, pictureEnv, rows) : null
      },
    })
    expect(plan.changed).toBe(true)
    // The drawn one: the placeholder streaming would have written, its picture over it.
    const overlays = plan.pieces.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []) : []))
    expect(overlays).toEqual([expect.objectContaining({ tex: TIKZ, copy: TIKZ, display: true })])
    const text = plan.pieces.map(piece => (piece.kind === 'prose' ? piece.text : '')).join('')
    expect(text).toContain('· diagram ·')
    expect(text).not.toContain(FENCE)
    // The refused one: as written, and its note.
    expect(text).toContain(evil)
    expect(plan.pieces.at(-1)).toMatchObject({ kind: 'note', text: `${NOT_RENDERED}uses \\input` })
  })

  test('a resumed reply with only a diagram fence reaches the landing hook', () => {
    expect(sourcePattern({ block: 'image', inline: 'image' }, true).test('Look:\n\n```tikz\n\\draw (0,0) -- (1,0);\n```\n')).toBe(true)
    expect(sourcePattern({ block: 'image', inline: 'image' }, false).test('Look:\n\n```tikz\n\\draw (0,0) -- (1,0);\n```\n')).toBe(false)
    expect(sourcePattern({ block: 'raw', inline: 'image' }, true).test('```tikz\n\\draw (0,0) -- (1,0);\n```\n')).toBe(false)
  })
})

describe('math MathJax refuses', () => {
  test('a display formula waits for TeX and reserves the rows of its image', async () => {
    await init()
    const fake = fakeTex('ok', MATH_SVG)
    texBook.reset(fake.host, fake.setup)
    const tex = '\\unit{kg.m/s^2}'
    const { records, waited } = await streamed(['Units:\n\n$$\n', `${tex}\n$$\n`, '\nDone.\n'])
    expect(waited).toBe(1)
    const outcome = texBook.known(mathDocument(tex, true))
    expect(outcome?.ok).toBe(true)
    if (!outcome?.ok) throw new Error('not drawn')
    const rows = measureDisplayResult(texResult(outcome.picture), renderEnvFor(kittyEnv())).rows
    expect(records).toEqual([expect.objectContaining({ tex, rows })])
    expect(records[0]!.error).toBeUndefined()
  })

  test('a formula MathJax draws never goes to TeX', async () => {
    await init()
    const fake = fakeTex()
    texBook.reset(fake.host, fake.setup)
    const { waited } = await streamed(['$$\nE = mc^2\n$$\n', 'And $x^2$ too.\n'])
    expect(waited).toBe(0)
    expect(fake.runs).toHaveLength(0)
  })

  test("an inline one: padded to TeX's image, its Unicode read without the unknown macro", async () => {
    await init()
    const fake = fakeTex('ok', MATH_SVG)
    texBook.reset(fake.host, fake.setup)
    expect(relaxedUnicode('\\unit{m/s^2}')).toBe('m/s²')
    const { records, waited } = await streamed(['The speed is $\\unit{m/s^2}$ here.\n', '\n'])
    expect(waited).toBe(1)
    const inline = records.find(record => record.inline)
    expect(inline).toMatchObject({ tex: '\\unit{m/s^2}', rows: 1 })
    const preview = texInlinePreview('\\unit{m/s^2}', inlineEnvFor(kittyEnv()))
    expect(preview?.columns).toBe(inline!.columns)
  })

  test('read back after --resume, an inline one TeX has yet to draw is asked for (then the block redraws)', async () => {
    await init()
    const fake = fakeTex('ok', MATH_SVG)
    texBook.reset(fake.host, fake.setup)
    const env = kittyEnv()
    const inlineEnv = inlineEnvFor(env)
    const options = {
      maxColumns: renderEnvFor(env).maxColumns,
      inline: { env: inlineEnv, width: 98, draw: () => ({ columns: 1, rows: 1, scale: 1, png: new Uint8Array(0) }) },
    }
    planLanded('The speed is $\\unit{m/s^2}$ here.\n', [], options)
    const asked = texBook.takeAsked()
    expect(asked.map(document => document.text)).toEqual([mathDocument('\\unit{m/s^2}', false).text])
    await texBook.compile(asked[0]!, 3000)
    const plan = planLanded('The speed is $\\unit{m/s^2}$ here.\n', [], options)
    expect(plan.pieces.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []) : [])).map(image => image.tex)).toEqual(['\\unit{m/s^2}'])
    expect(texBook.takeAsked()).toEqual([])
  })

  test('TeX failing too leaves the formula refused, with its error', async () => {
    await init()
    const fake = fakeTex('error')
    texBook.reset(fake.host, fake.setup)
    const { records } = await streamed(['$$\n\\nope{x}\n$$\n', 'After.\n'])
    expect(records[0]).toMatchObject({ rows: 0 })
    expect(records[0]!.error).toMatch(/^Undefined control sequence/)
  })
})

describe('the TeX book', () => {
  test('one compile per document, however many ask; the outcome cached on disk and read back', async () => {
    await init()
    const fake = fakeTex()
    texBook.reset(fake.host, fake.setup)
    const job = diagramJob(TIKZ, 'latex')
    if (!job || !('document' in job)) throw new Error('no job')
    const [a, b] = await Promise.all([texBook.compile(job.document, 3000), texBook.compile(job.document, 3000)])
    expect(a).toBe(b)
    expect(fake.runs.filter(argv => argv.includes('latex'))).toHaveLength(1)
    const cached = [...fake.writes.keys()].find(path => path.startsWith('/home/u/.cache/kittex/tex/') && path.endsWith('.json'))
    expect(cached).toMatch(/\/[0-9a-f]{64}\.json$/)
    // A new process: read from disk, no TeX run.
    texBook.reset(fake.host, fake.setup)
    const before = fake.runs.length
    expect((await texBook.load(job.document))?.ok).toBe(true)
    expect(fake.runs.length).toBe(before)
  })

  test('a timeout is not kept: the next ask compiles again', async () => {
    const fake = fakeTex('slow')
    texBook.reset(fake.host, fake.setup)
    const job = diagramJob(TIKZ, 'tikz')
    if (!job || !('document' in job)) throw new Error('no job')
    expect(await texBook.compile(job.document, 3000)).toMatchObject({ ok: false, lasting: false })
    await texBook.compile(job.document, 3000)
    expect(fake.runs.filter(argv => argv.includes('latex'))).toHaveLength(2)
    expect([...fake.writes.keys()].some(path => path.includes('.cache'))).toBe(false)
  })

  test('probing: latex and dvisvgm required; prlimit and bubblewrap used where they run', async () => {
    const answering = (missing: string[]): TexHost => ({
      run: async argv => {
        if (missing.includes(argv[0]!)) throw new Error('not found')
        return { exitCode: 0, stdout: `${argv[0]} 1.0\n`, stderr: '', isStdoutTruncated: false }
      },
      write: async () => undefined,
      read: async () => undefined,
    })
    expect(await probeTex(answering(['latex']), { tmpdir: undefined, hide: [] })).toBeUndefined()
    expect(await probeTex(answering(['dvisvgm']), { tmpdir: undefined, hide: [] })).toBeUndefined()
    const full = await probeTex(answering([]), { tmpdir: '/tmp', hide: ['/home/u', '/tmp'] })
    expect(full?.confinement).toEqual({ prlimit: true, bwrap: { hide: ['/home/u', '/tmp'] } })
    const bare = await probeTex(answering(['prlimit', 'bwrap']), { tmpdir: '/tmp', hide: ['/home/u'] })
    expect(bare?.confinement).toEqual({ prlimit: false })
  })

  test("a dvisvgm without --libgs (Arch's, Debian's, Fedora's builds refuse it) runs without the option", async () => {
    const help = (libgs: boolean) => `  -S, --no-specials[=prefixes]  don't process specials\n${libgs ? '      --libgs=filename  set name of Ghostscript shared library\n' : ''}`
    expect(takesLibgs(help(true))).toBe(true)
    expect(takesLibgs(help(false))).toBe(false)
    // A help that isn't dvisvgm's says nothing: the option stays.
    expect(takesLibgs('')).toBe(true)
    const answering = (libgs: boolean): TexHost => ({
      run: async argv => ({ exitCode: 0, stdout: argv[1] === '--help' ? help(libgs) : `${argv[0]} 1.0\n`, stderr: '', isStdoutTruncated: false }),
      write: async () => undefined,
      read: async () => undefined,
    })
    const without = await probeTex(answering(false), { tmpdir: '/tmp', hide: [] })
    expect(without?.libgs).toBe(false)
    expect((await probeTex(answering(true), { tmpdir: '/tmp', hide: [] }))?.libgs).toBeUndefined()
    expect(dvisvgmCommand('/tmp/kittex-tex.ABCDEFGHIJ', { libgs: false }).some(arg => arg.startsWith('--libgs'))).toBe(false)
    expect(dvisvgmCommand('/tmp/kittex-tex.ABCDEFGHIJ', {})).toContain('--libgs=/tmp/kittex-tex.ABCDEFGHIJ/no-ghostscript')
    // Remembered for the next session with the rest of the setup.
    expect(rememberedTex({ ...without, cacheDir: '/home/u/.cache/kittex/tex' })?.libgs).toBe(false)
  })

  test('the directories hidden from TeX and the cache directory', () => {
    expect(hiddenDirs('/home/u', '/tmp/')).toEqual(['/home/u', '/tmp', '/var/tmp', '/run'])
    expect(hiddenDirs('/', undefined)).toEqual(['/tmp', '/var/tmp', '/run'])
    expect(texCacheDir({ XDG_CACHE_HOME: '/x/cache', HOME: '/home/u' })).toBe('/x/cache/kittex/tex')
    expect(texCacheDir({ HOME: '/home/u' })).toBe('/home/u/.cache/kittex/tex')
    expect(texCacheDir({})).toBeUndefined()
  })
})

describe('the format, the shading retry, the budget', () => {
  test('the fragment format is dumped once into the cache directory, then reused', async () => {
    const fake = fakeTex()
    // The cache holds the format once it was moved there.
    let stored = false
    const run = fake.host.run
    fake.host.run = async (argv, init) => {
      if (argv[0] === 'test') return { exitCode: stored ? 0 : 1, stdout: '', stderr: '', isStdoutTruncated: false }
      if (argv[0] === 'mv') stored = true
      return run(argv, init)
    }
    const setup = { ...fake.setup }
    const name = formatName(setup.versions)
    await prepareFormat(fake.host, setup)
    expect(setup.format).toEqual({ name, dir: '/home/u/.cache/kittex/tex/fmt' })
    const dump = fake.runs.find(argv => argv.includes('-ini'))!
    // Confined like any job, no shell, from kittex's own preamble (no source of the model's).
    expect(dump.slice(0, 3)).toEqual(['prlimit', '--fsize=67108864', '--cpu=20'])
    expect(dump).toEqual(expect.arrayContaining(['-no-shell-escape', '&latex', 'mylatexformat.ltx', `${name}.tex`]))
    expect(fake.writes.get(`/tmp/kittex-tex.AbCdEfGhIj/${name}.tex`)).toContain('\\usepackage{pgfplots}')
    expect(fake.runs.some(argv => argv[0] === 'mv' && argv.at(-1) === `/home/u/.cache/kittex/tex/fmt/${name}.fmt`)).toBe(true)
    // The next session finds it: no TeX run.
    const before = fake.runs.length
    const again = { ...fake.setup }
    await prepareFormat(fake.host, again)
    expect(again.format).toEqual(setup.format)
    expect(fake.runs.length).toBe(before)
  })

  test('a fragment compiles from the format, read-only where the namespace hides the cache', async () => {
    await init()
    const fake = fakeTex()
    const setup = { ...fake.setup, confinement: { prlimit: true, bwrap: { hide: ['/home/u', '/tmp'] } }, format: { name: 'kittex-0', dir: '/home/u/.cache/kittex/tex/fmt' } }
    texBook.reset(fake.host, setup)
    let env: Record<string, string> | undefined
    const run = fake.host.run
    fake.host.run = async (argv, init) => {
      if (argv.includes('latex')) env = init.env
      return run(argv, init)
    }
    expect((await texBook.compile(diagramDocument(TIKZ, 'latex'), 3000)).ok).toBe(true)
    const latex = fake.runs.find(argv => argv.includes('latex'))!
    expect(latex).toContain('-fmt=kittex-0')
    expect(latex.join(' ')).toContain('--ro-bind /home/u/.cache/kittex/tex/fmt /home/u/.cache/kittex/tex/fmt')
    expect(env?.TEXFORMATS).toBe('/home/u/.cache/kittex/tex/fmt:')
  })

  test("pgfplots' shader=interp, which the SVG driver can't draw, is compiled as shader=flat", () => {
    const job = diagramJob('\\begin{tikzpicture}\\begin{axis}\\addplot3[surf, shader = interp] {x*y};\\end{axis}\\end{tikzpicture}', 'latex')
    if (!job || !('document' in job)) throw new Error('no job')
    expect(job.document.text).toContain('\\addplot3[surf, shader=flat]')
    expect(job.document.text).not.toContain('interp')
  })

  test('pictures past the drawing budget are drawn at fewer pixels, largest first, before any is left out', () => {
    const image = (bytes: number) => ({ columns: 40, rows: 10, scale: 1, png: new Uint8Array(bytes) })
    const [a, b, c] = [image(900), image(600), image(100)]
    const pieces = [{ kind: 'prose' as const, text: 'x', gap: false, inline: [{ tex: 'a', image: a, row: 0, col: 0, display: true as const }, { tex: 'b', image: b, row: 10, col: 0, display: true as const }, { tex: 'c', image: c, row: 20, col: 0 }] }]
    const redrawn: string[] = []
    const fitted = fitPictures(pieces, (one, density) => {
      if (one === c) return undefined
      redrawn.push(`${one === a ? 'a' : 'b'}@${density}`)
      return image(Math.round(one.png.length * density * density))
    }, 1000)
    expect(redrawn).toEqual(['a@0.5'])
    const sizes = fitted.flatMap(piece => (piece.kind === 'prose' ? (piece.inline ?? []).map(one => one.image.png.length) : []))
    expect(sizes).toEqual([225, 600, 100])
    expect(fitPictures(pieces, () => undefined, 10_000)[0]).toEqual(pieces[0])
  })
})

describe('flushes dispatched together', () => {
  test("a message's flushes are rewritten in their order, whatever order their hooks start in", async ($, on) => {
    await startSession($, on)
    const flush = (index: number, delta: string, final = false) => $.classic.MessageDisplay({ turn_id: 't', message_id: 'm', index, final, delta })
    // The engine does not wait for one flush's hook before the next (measured live while one waited for TeX).
    const later = flush(1, 'E = mc^2\n$$\n')
    const first = flush(0, 'Energy:\n\n$$\n')
    const last = flush(2, '\nDone.\n', true)
    const [a, b, c] = await Promise.all([first, later, last])
    const shown = [a, b, c].map((result, i) => result.displayContent ?? ['Energy:\n\n$$\n', 'E = mc^2\n$$\n', '\nDone.\n'][i]).join('')
    expect(shown.startsWith('Energy:\n\n')).toBe(true)
    expect(shown).not.toContain('$$')
    expect(shown.endsWith('Done.\n')).toBe(true)
  })
})

describe('instructions to the model', () => {
  test('one line on diagrams, only where TeX was found', async ($, on) => {
    await startSession($, on, KITTY, 'dark', CELL, argv => ((argv[0] === 'latex' || argv[0] === 'dvisvgm') && argv[1] === '--version' ? { exitCode: 0, stdout: `${argv[0]} 1.0\n` } : undefined))
    const { sections } = await $.prompt.compose(COMPOSE)
    const section = sections.find(one => one.id === SECTION_ID)
    expect(section?.text).toBe(`${MATH_INSTRUCTIONS} ${DIAGRAM_INSTRUCTIONS}`)
    expect(sections[0]).toEqual(INTRO)
  })

  test('without TeX, the math instructions alone', async ($, on) => {
    await startSession($, on)
    const { sections } = await $.prompt.compose(COMPOSE)
    expect(sections.find(one => one.id === SECTION_ID)?.text).toBe(MATH_INSTRUCTIONS)
  })

  test('with the option off, TeX is never asked', { options: { latex: 'off' } }, async ($, on) => {
    const asked: string[] = []
    await startSession($, on, KITTY, 'dark', CELL, argv => {
      asked.push(argv[0]!)
      return { exitCode: 0, stdout: 'x 1.0\n' }
    })
    const { sections } = await $.prompt.compose(COMPOSE)
    expect(sections.find(one => one.id === SECTION_ID)?.text).toBe(MATH_INSTRUCTIONS)
    expect(asked).not.toContain('latex')
    expect(asked).not.toContain('dvisvgm')
  })
})
