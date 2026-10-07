// The image cache (the `cache` option): a resumed block's drawing kept as a
// file under XDG_CACHE_HOME, read back by the next session's render without
// typesetting; keys, hits, misses, corrupt files, pruning, the option off.

import { describe, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { BUILD_ID, detectTerminal, drawsEmojiSequences } from '../hooks/core.js'
import { linkEnv, mathOptions } from '../hooks/math.ts'
import type { KittexEnv } from '../hooks/math.ts'
import { cacheDir, cacheFacts, CACHE_LIMIT_BYTES, CACHE_VERSION, decodeEntry, encodeEntry, entryKey, ENTRY_NAME, hash128, pruneList } from '../hooks/cache.ts'
import type { Piece } from '../hooks/math.ts'
import { CELL, COLUMNS, KITTY, kittyEnv, startSession, test } from './support.ts'

const FOLDER = `/cache/kittex/v${CACHE_VERSION}`
/** A whole 1×1 PNG. */
const PNG = (Uint8Array as unknown as { fromBase64(s: string): Uint8Array }).fromBase64('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
const b64 = (bytes: Uint8Array) => (bytes as unknown as { toBase64(): string }).toBase64()

/** A file system of its own beneath the plugin: reads, writes and lists of /cache, `rm` through process.run. */
function fakeDisk(on: On) {
  const files = new Map<string, { text: string; mtimeMs: number }>()
  const writes: string[] = []
  const reads: string[] = []
  let clock = 1000
  on('fs.read', ($, e) => {
    reads.push(e.path)
    const file = files.get(e.path)
    return file ? { value: file.text } : { deny: 'ENOENT: no such file' }
  })
  on('fs.write', ($, e) => {
    writes.push(e.path)
    files.set(e.path, { text: e.text, mtimeMs: (clock += 1) })
    return { value: undefined }
  })
  on('fs.list', ($, e) => {
    const prefix = `${e.path ?? ''}/`
    const entries = [...files].filter(([path]) => path.startsWith(prefix)).map(([path, file]) => ({ name: path.slice(prefix.length), kind: 'file', size: file.text.length, mtimeMs: file.mtimeMs, isLink: false }))
    return (entries.length > 0 ? { value: entries } : { deny: 'ENOENT: no such directory' }) as never
  })
  return { files, writes, reads }
}

const resumedMount = ($: Engine, text: string) =>
  $.ui.mount({ plugin: 'kittex', surface: 'terminal', component: 'AssistantMessage', props: { text, isFirstOfReply: true }, viewport: { columns: COLUMNS, rows: 50, isFullscreen: false } })

function images(node: unknown): string[] {
  if (typeof node !== 'object' || node === null) return []
  const element = node as { type?: unknown; props?: { source?: { png?: unknown } }; children?: unknown[] }
  const own = element.type === 'Image' && typeof element.props?.source?.png === 'string' ? [element.props.source.png] : []
  return [...own, ...(element.children ?? []).flatMap(images)]
}

const PIECES: Piece[] = [
  { kind: 'prose', text: 'Take x', gap: false, inline: [{ tex: 'x', row: 0, col: 5, image: { columns: 1, rows: 1, scale: 1, png: PNG } }] },
  { kind: 'image', tex: 'e^{i\\pi}', gap: true, image: { columns: 40, rows: 3, scale: 0.9, png: PNG } },
  { kind: 'note', text: 'not rendered: x', gap: true },
]

describe('cache entries', () => {
  test('a key follows the text and every fact, and nothing else', () => {
    const facts = { cell: [13, 26, 25], ink: [1, 2, 3], math: { block: 'image', inline: 'image' } }
    const key = entryKey('$x$', facts)
    expect(key).toMatch(/^[0-9a-z]{26}$/)
    expect(ENTRY_NAME.test(`${key}.json`)).toBe(true)
    expect(entryKey('$x$', { ...facts })).toBe(key)
    expect(entryKey('$y$', facts)).not.toBe(key)
    expect(entryKey('$x$', { ...facts, ink: [1, 2, 4] })).not.toBe(key)
    expect(entryKey('$x$', { ...facts, cell: [13, 27, 25] })).not.toBe(key)
    expect(hash128('a')).not.toBe(hash128('b'))
  })

  test('an entry reads back as the same drawing', () => {
    const text = encodeEntry('k1', PIECES, b64)
    const remembered: string[] = []
    const back = decodeEntry(text, 'k1', (_png, base64) => remembered.push(base64))
    expect(back).toEqual(PIECES)
    expect(remembered).toEqual([b64(PNG), b64(PNG)])
  })

  test('a cut, garbled, foreign or older entry is a miss', () => {
    const text = encodeEntry('k1', PIECES, b64)
    expect(decodeEntry(text.slice(0, -5), 'k1')).toBeNull()
    expect(decodeEntry(text, 'k2')).toBeNull()
    expect(decodeEntry(text.replace(`"kittex":${CACHE_VERSION}`, '"kittex":0'), 'k1')).toBeNull()
    expect(decodeEntry('not json at all', 'k1')).toBeNull()
    expect(decodeEntry(text.replace(b64(PNG), 'AAAA'), 'k1')).toBeNull()
    // A PNG signature with no IHDR (the engine would refuse the whole drawing over it).
    expect(decodeEntry(text.replaceAll(b64(PNG), b64(PNG.slice(0, 12))), 'k1')).toBeNull()
    expect(decodeEntry('', 'k1')).toBeNull()
  })

  test('the folder: XDG_CACHE_HOME when absolute, else ~/.cache, else none', () => {
    expect(cacheDir({ XDG_CACHE_HOME: '/x/', HOME: '/home/me' })).toBe(`/x/kittex/v${CACHE_VERSION}`)
    expect(cacheDir({ XDG_CACHE_HOME: 'relative', HOME: '/home/me' })).toBe(`/home/me/.cache/kittex/v${CACHE_VERSION}`)
    expect(cacheDir({})).toBeUndefined()
  })

  test('pruning removes the oldest entries past the cap, and only entries', () => {
    const name = (n: number) => `${String(n).padStart(26, '0')}.json`
    const files = [
      { name: name(1), kind: 'file', size: 40, mtimeMs: 3 },
      { name: name(2), kind: 'file', size: 40, mtimeMs: 1 },
      { name: name(3), kind: 'file', size: 40, mtimeMs: 2 },
      { name: 'notes.txt', kind: 'file', size: 500, mtimeMs: 0 },
      { name: name(4), kind: 'directory', size: 0, mtimeMs: 0 },
    ]
    expect(pruneList(files, 120)).toEqual([])
    // 120 bytes against a cap of 100: down to 80, the oldest goes; against 70, down to 56, two go.
    expect(pruneList(files, 100)).toEqual([name(2)])
    expect(pruneList(files, 70)).toEqual([name(2), name(3)])
    expect(CACHE_LIMIT_BYTES).toBe(50 * 1024 * 1024)
  })
})

describe('the cache through the engine', () => {
  const ENV = { ...KITTY, XDG_CACHE_HOME: '/cache' }

  test('a resumed block is written once, with the PNGs it draws', async ($, on) => {
    const disk = fakeDisk(on)
    await startSession($, on, ENV)
    const text = 'Cache me: $a^2 + b^2 = c^2$ and\n\n$$\n\\int_0^1 t\\,dt = \\tfrac12\n$$\n'
    const first = images(await (await resumedMount($, text)).drawn())
    expect(first.length).toBeGreaterThan(0)
    const written = disk.writes.filter(path => path.startsWith(`${FOLDER}/`))
    expect(written).toHaveLength(1)
    expect(ENTRY_NAME.test(written[0]!.slice(FOLDER.length + 1))).toBe(true)
    // The entry holds the very PNGs drawn.
    const entry = disk.files.get(written[0]!)!.text
    for (const png of first) expect(entry).toContain(png)
  })

  test('a file another session wrote is a hit (nothing typeset); a corrupt one a miss, drawn and written again', async ($, on) => {
    const disk = fakeDisk(on)
    await startSession($, on, ENV)
    // The env session.start stores in this kitty, and the key it gives a text.
    const env: KittexEnv = { ...kittyEnv(), ...linkEnv(ENV), emojiSequences: drawsEmojiSequences(detectTerminal(ENV), undefined) }
    const keyOf = (text: string) => entryKey(text, cacheFacts(env, COLUMNS, mathOptions({}), `${BUILD_ID}|tex:false`))
    // Another session's entry for this text: its drawing, whatever it holds, is what is drawn.
    const hit = 'Hit: $\\frac{1}{2}$ and $\\alpha$ here.\n'
    const path = `${FOLDER}/${keyOf(hit)}.json`
    disk.files.set(path, { text: encodeEntry(keyOf(hit), [{ kind: 'prose', text: 'FROM THE CACHE', gap: false, inline: [{ tex: 'x', row: 0, col: 0, image: { columns: 2, rows: 1, scale: 1, png: PNG } }] }], b64), mtimeMs: 1 })
    const drawn = await (await resumedMount($, hit)).drawn()
    expect(JSON.stringify(drawn)).toContain('FROM THE CACHE')
    expect(images(drawn)).toEqual([b64(PNG)])
    expect(disk.writes).not.toContain(path)
    // A corrupt file under a text's key: drawn as if there were none, then written whole.
    const miss = 'Miss:\n\n$$\n\\sum_{k=1}^{n} k^2 = \\frac{n(n+1)(2n+1)}{6}\n$$\n'
    const garbled = `${FOLDER}/${keyOf(miss)}.json`
    disk.files.set(garbled, { text: `{"kittex":${CACHE_VERSION},"key":"${keyOf(miss)}","length":99}\ngarbage`, mtimeMs: 1 })
    const again = await (await resumedMount($, miss)).drawn()
    expect(images(again).length).toBeGreaterThan(0)
    expect(decodeEntry(disk.files.get(garbled)!.text, keyOf(miss))).not.toBeNull()
  })

  test('the oldest entries are pruned at session start, by rm', async ($, on) => {
    const disk = fakeDisk(on)
    const clock = mock.clock(on)
    const removed: string[][] = []
    const big = 'x'.repeat(1024 * 1024)
    for (let i = 0; i < 60; i++) disk.files.set(`${FOLDER}/${String(i).padStart(26, '0')}.json`, { text: big, mtimeMs: i })
    disk.files.set(`${FOLDER}/keep.txt`, { text: big, mtimeMs: 0 })
    await startSession($, on, ENV, 'dark', CELL, argv => {
      if (argv[0] !== 'rm') return undefined
      removed.push([...argv])
      for (const path of argv.slice(3)) disk.files.delete(path)
      return { exitCode: 0, stdout: '' }
    })
    // The pruning runs on session.start's clock, after the dispatch.
    for (let k = 0; k < 10 && removed.length === 0; k++) await clock.advance(0)
    const gone = removed.flatMap(argv => argv.slice(3))
    // 60 MiB of entries against 50: down to 40, the 20 oldest.
    expect(gone).toHaveLength(20)
    expect(gone[0]).toBe(`${FOLDER}/${'0'.padStart(26, '0')}.json`)
    expect(removed[0]!.slice(0, 3)).toEqual(['rm', '-f', '--'])
    expect(disk.files.has(`${FOLDER}/keep.txt`)).toBe(true)
  })

  test('with the option off nothing is read, written or pruned', { options: { cache: false } }, async ($, on) => {
    const disk = fakeDisk(on)
    await startSession($, on, ENV)
    const drawn = images(await (await resumedMount($, 'Off: $x_1 + x_2$ now.\n')).drawn())
    expect(drawn).toHaveLength(1)
    expect(disk.reads.filter(path => path.startsWith('/cache'))).toEqual([])
    expect(disk.writes.filter(path => path.startsWith('/cache'))).toEqual([])
  })

  test("what TeX drew is pruned on its own cap; the TeX format is never counted or removed", async ($, on) => {
    const disk = fakeDisk(on)
    const clock = mock.clock(on)
    const removed: string[][] = []
    const big = 'x'.repeat(1024 * 1024)
    const TEX = '/cache/kittex/tex'
    for (let i = 0; i < 30; i++) disk.files.set(`${TEX}/${String(i).padStart(64, 'a')}.json`, { text: big, mtimeMs: i })
    // The format: older than every outcome, and as big as eleven of them.
    disk.files.set(`${TEX}/fmt/kittex-0123abcd.fmt`, { text: 'x'.repeat(11 * 1024 * 1024), mtimeMs: -1 })
    // The images: well under their own cap, so none goes.
    for (let i = 0; i < 5; i++) disk.files.set(`${FOLDER}/${String(i).padStart(26, '0')}.json`, { text: big, mtimeMs: -2 })
    await startSession($, on, ENV, 'dark', CELL, argv => {
      if (argv[0] !== 'rm') return undefined
      removed.push([...argv])
      for (const path of argv.slice(3)) disk.files.delete(path)
      return { exitCode: 0, stdout: '' }
    })
    for (let k = 0; k < 10 && removed.length === 0; k++) await clock.advance(0)
    for (let k = 0; k < 5; k++) await clock.advance(0)
    const gone = removed.flatMap(argv => argv.slice(3))
    // 30 MiB against 20: down to 16, the 14 oldest.
    expect(gone).toHaveLength(14)
    expect(gone.every(path => /^\/cache\/kittex\/tex\/a+\d+\.json$/.test(path))).toBe(true)
    expect(disk.files.has(`${TEX}/fmt/kittex-0123abcd.fmt`)).toBe(true)
    expect([...disk.files.keys()].filter(path => path.startsWith(FOLDER))).toHaveLength(5)
  })
})
