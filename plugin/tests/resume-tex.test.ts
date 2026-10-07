// A resumed reply's diagrams keep their rows when TeX is found: the engine
// asks for the transcript's drawings before session.start, and kittex draws
// the pictures the last session's TeX cached from that first render (the
// setup it found is remembered in $.store), so finding TeX later, or not
// finding it, changes nothing on screen. With `latex: off` nothing is read.

import { describe, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { diagramJob, texBook } from '../hooks/tex.ts'
import type { TexHost, TexSetup } from '../hooks/tex.ts'
import { COLUMNS, KITTY, kittyEnv, test } from './support.ts'

const SVG = `<?xml version='1.0'?><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 50'><path d='M0 0L100 50' stroke='#f00' stroke-width='2' fill='none'/><circle cx='50' cy='25' r='10' fill='#ccf'/></svg>`
const CACHED = '\\begin{tikzpicture}\n\\draw[red] (0,0) -- (2,1);\n\\fill[blue!20] (1,0.5) circle (0.3);\n\\end{tikzpicture}'
const UNCACHED = '\\begin{tikzpicture}\n\\draw (0,0) circle (1);\n\\end{tikzpicture}'
const fence = (tikz: string) => '```latex\n' + tikz + '\n```'
const REPLY = `Look:\n\n${fence(CACHED)}\n\nAnd:\n\n${fence(UNCACHED)}\n\nDone.\n`

const ENV = { ...KITTY, HOME: '/home/u', XDG_CACHE_HOME: '/c' }
const SETUP: TexSetup = { versions: 'pdfTeX 3.14\ndvisvgm 3.6', confinement: { prlimit: true }, tmpdir: '/tmp', cacheDir: '/c/kittex/tex' }

/** The TeX cache an earlier session left: CACHED's picture, compiled through a fake host. */
async function cacheFiles(): Promise<Map<string, string>> {
  const files = new Map<string, string>()
  const host: TexHost = {
    run: async argv => ({ exitCode: 0, stdout: argv[0] === 'mktemp' ? '/tmp/kittex-tex.AbCdEfGhIj\n' : argv.includes('dvisvgm') ? SVG : '', stderr: '', isStdoutTruncated: false }),
    write: async (path, text) => void files.set(path, text),
    read: async path => files.get(path),
  }
  texBook.reset(host, SETUP)
  const job = diagramJob(CACHED, 'latex')
  if (!job || !('document' in job)) throw new Error('no job')
  await texBook.compile(job.document, 3000)
  texBook.reset()
  for (const path of [...files.keys()]) if (!path.startsWith('/c/kittex/tex/')) files.delete(path)
  return files
}

/** The world before session.start: the variables, the store the last session left, the disk, the engine's drawing. */
function world(on: On, files: Map<string, string>, tex: TexSetup | null) {
  mock.env(on, ENV)
  const reads: string[] = []
  const stored: Record<string, unknown> = { env: { id: 'xterm-kitty|||', env: kittyEnv() }, tex }
  on('store.get', ($, e) => ({ value: stored[e.key] }))
  on('store.set', ($, e) => {
    stored[e.key] = e.value
    return { value: undefined }
  })
  on('fs.exists', ($, e) => ({ value: files.has(e.path) }))
  on('fs.read', ($, e) => {
    reads.push(e.path)
    const text = files.get(e.path)
    return text === undefined ? { deny: 'ENOENT' } : { value: text }
  })
  on('fs.write', ($, e) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  on('config.list', () => ({ value: [] }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('prompt.compose', () => ({ sections: [] }))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => ({ type: 'Text' as const, children: [e.props.text] }))
  return { reads, stored }
}

/** The process runs as found now: the cell probe, and TeX there or not. */
function processes(on: On, texThere: boolean) {
  on('process.run', ($, e) => {
    const cell = e.argv.join(' ').includes('TIOCGWINSZ') || e.argv[0] === 'perl' || e.argv[0] === 'python3'
    const tex = (e.argv[0] === 'latex' || e.argv[0] === 'dvisvgm') && texThere
    const stdout = cell ? `50 ${COLUMNS} ${COLUMNS * 13} ${50 * 20}\n` : tex ? `${e.argv[0]} 1.0\n` : ''
    return { value: { exitCode: cell || tex ? 0 : 1, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
}

const mountResumed = ($: Engine) =>
  $.ui.mount({ plugin: 'kittex', surface: 'terminal', component: 'AssistantMessage', props: { text: REPLY, isFirstOfReply: true }, viewport: { columns: COLUMNS, rows: 50, isFullscreen: false } })

type Node = { type?: unknown; props?: Record<string, unknown>; children?: unknown[] }
/** What decides the rows: every text drawn, and every Image's cells. */
function layout(node: unknown): string[] {
  if (typeof node === 'string') return [node]
  if (typeof node !== 'object' || node === null) return []
  const element = node as Node
  const own = element.type === 'Image' ? [`image ${element.props?.columns}x${element.props?.rows}`] : []
  return [...own, ...(element.children ?? []).flatMap(layout)]
}

describe('a resumed diagram keeps its rows', () => {
  test('drawn from the TeX cache before session.start, unchanged once TeX is found', async ($, on) => {
    const files = await cacheFiles()
    const { stored } = world(on, files, SETUP)
    processes(on, true)
    const ui = await mountResumed($)
    const before = layout(await ui.drawn())
    // CACHED is its picture from the first render; UNCACHED stays code (nothing to read for it yet).
    expect(before.filter(line => line.startsWith('image'))).toHaveLength(1)
    expect(before.join('\n')).toContain(fence(UNCACHED).split('\n')[1])
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
    // The plugin's probe finds TeX (it stores the setup it found: its own module's book, not this file's).
    for (let i = 0; i < 20 && (stored.tex as TexSetup | null)?.versions === SETUP.versions; i++) await $.prompt.compose({ model: 'claude', promptModel: 'claude', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] })
    const after = layout(await ui.redraw().then(() => ui.drawn()))
    expect(after.filter(line => line.startsWith('image'))).toEqual(before.filter(line => line.startsWith('image')))
    // The setup found now is remembered for the next session.
    expect(stored.tex).toMatchObject({ versions: 'latex 1.0\ndvisvgm 1.0', cacheDir: '/c/kittex/tex' })
  })

  test('TeX there last session, gone now: the cached picture stays, the rest is code, nothing left as a placeholder', async ($, on) => {
    const files = await cacheFiles()
    const { stored } = world(on, files, SETUP)
    processes(on, false)
    const ui = await mountResumed($)
    const before = layout(await ui.drawn())
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
    for (let i = 0; i < 20 && stored.tex !== null; i++) await $.prompt.compose({ model: 'claude', promptModel: 'claude', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] })
    expect(stored.tex).toBeNull()
    const after = layout(await ui.redraw().then(() => ui.drawn()))
    expect(after).toEqual(before)
    expect(after.filter(line => line.startsWith('image'))).toHaveLength(1)
    // The uncached one is its source; the one placeholder is the cached picture's, under it.
    expect(after.join('\n')).toContain('\\draw (0,0) circle (1);')
    expect(after.join('\n').split('· diagram ·').length - 1).toBe(1)
  })

  test('with `latex: off` no TeX cache is read: both stay code', { options: { latex: 'off' } }, async ($, on) => {
    const files = await cacheFiles()
    const { reads } = world(on, files, SETUP)
    processes(on, true)
    const ui = await mountResumed($)
    const drawn = layout(await ui.drawn())
    expect(drawn.filter(line => line.startsWith('image'))).toHaveLength(0)
    expect(reads.filter(path => path.startsWith('/c/kittex/tex'))).toEqual([])
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
    expect(layout(await ui.redraw().then(() => ui.drawn())).filter(line => line.startsWith('image'))).toHaveLength(0)
  })
})
