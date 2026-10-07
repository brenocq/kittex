// kittex's image cache (the `cache` option): the drawing of a landed block
// read back as LaTeX (a resumed session) kept on disk, so the next resume
// draws it without typesetting: no MathJax at all when every block hits.
//
// Claude Code's $.store holds 4 MiB of JSON in all, too little, so the
// entries are files: `<dir>/<key>.json` under
// `${XDG_CACHE_HOME:-~/.cache}/kittex/v<CACHE_VERSION>/`, written with
// $.fs.write (text: the PNGs go in base64) and read with $.fs.read. An entry's
// key is a hash of everything that changes its pixels or its layout: the
// block's text, the options, the cells and the reply's width, the ink and its
// blending, the stroke weight, the baseline, how the engine draws links and
// emoji, and kittex's build. Its text carries its own key and length, so a
// file cut short by a concurrent write or a crash reads as a miss (and every
// writer of one key writes the same bytes). This module is pure: register.tsx
// does the I/O.
import type { RenderedImage } from './core.js'
import type { InlineImage, KittexEnv, MathOptions, Piece } from './math.ts'

/** Bumped when an entry's layout changes: older entries live in another folder and are never read. */
export const CACHE_VERSION = 1

/** The cache's size cap, in bytes: past it, session.start removes the oldest entries. */
export const CACHE_LIMIT_BYTES = 50 * 1024 * 1024

/** What pruning keeps of the cap, so a session does not prune again at once. */
export const CACHE_PRUNE_TO = 0.8

/** How long a render waits for a cache read before it draws without it. */
export const CACHE_READ_MS = 150

/** An entry's file name: its key and `.json`; nothing else in the folder is ever read or removed. */
export const ENTRY_NAME = /^[0-9a-z]{26}\.json$/
/**
 * What TeX drew (tex.ts): `<cache>/kittex/tex/<sha-256>.json`, pruned on its
 * own past TEX_CACHE_LIMIT_BYTES. Its `fmt/` folder (the TeX format, about
 * 11 MB) is neither counted nor removed here: prepareFormat replaces it when
 * TeX's version changes.
 */
export const TEX_ENTRY_NAME = /^[0-9a-f]{64}\.json$/
export const TEX_CACHE_LIMIT_BYTES = 20 * 1024 * 1024

/** The folder entries go in: XDG_CACHE_HOME (absolute), else ~/.cache; undefined without either. */
export function cacheDir(env: { XDG_CACHE_HOME?: string | undefined; HOME?: string | undefined }): string | undefined {
  const xdg = env.XDG_CACHE_HOME
  const base = xdg && xdg.startsWith('/') ? xdg : env.HOME && env.HOME.startsWith('/') ? `${env.HOME}/.cache` : undefined
  return base ? `${base.replace(/\/+$/, '')}/kittex/v${CACHE_VERSION}` : undefined
}

/**
 * The key of a block's drawing: a 128-bit hash (26 base-36 digits) of its
 * text and of `facts`, everything else its drawing depends on (any JSON).
 */
export function entryKey(text: string, facts: unknown): string {
  return hash128(`${CACHE_VERSION}\n${JSON.stringify(facts)}\n${text}`)
}

/** What a resumed block's drawing depends on besides its text (the key's facts): the build, the options, the reply's width, the cells and the text font, the ink and its blending, the weight, the prose width, links and emoji. */
export function cacheFacts(env: KittexEnv, columns: number, math: MathOptions, build: string): unknown {
  return {
    build,
    math,
    columns,
    cell: [env.cellWidth, env.cellHeight, env.emPx],
    adjust: env.cellAdjust ?? null,
    kitty: env.kittyAdjust ?? null,
    font: env.font ?? null,
    curve: env.inkCurve ?? null,
    ink: [env.ink.r, env.ink.g, env.ink.b],
    over: env.inkOver ? [env.inkOver.r, env.inkOver.g, env.inkOver.b] : null,
    weight: env.weight ?? null,
    prose: env.maxProseWidth ?? null,
    links: env.hyperlinks ?? null,
    emoji: env.emojiSequences ?? null,
  }
}

/** An entry's file path. */
export function entryPath(dir: string, key: string): string {
  return `${dir}/${key}.json`
}

type StoredImage = { columns: number; rows: number; scale: number; png: string }
type StoredPiece =
  | { kind: 'prose'; text: string; gap: boolean; inline?: { tex: string; row: number; col: number; display?: true; image: StoredImage }[] }
  | { kind: 'image'; tex: string; gap: boolean; image: StoredImage }
  | { kind: 'note'; text: string; gap: boolean }

/** A drawing as an entry's text. `base64` gives a PNG's base64 (the one the Image is sent with). */
export function encodeEntry(key: string, pieces: readonly Piece[], base64: (png: Uint8Array) => string): string {
  const image = (one: RenderedImage): StoredImage => ({ columns: one.columns, rows: one.rows, scale: one.scale, png: base64(one.png) })
  const stored: StoredPiece[] = pieces.map(piece =>
    piece.kind === 'image'
      ? { kind: 'image', tex: piece.tex, gap: piece.gap, image: image(piece.image) }
      : piece.kind === 'note'
        ? { kind: 'note', text: piece.text, gap: piece.gap }
        : { kind: 'prose', text: piece.text, gap: piece.gap, ...(piece.inline ? { inline: piece.inline.map(one => ({ tex: one.tex, row: one.row, col: one.col, ...(one.display ? { display: true as const } : {}), image: image(one.image) })) } : {}) },
  )
  const body = JSON.stringify(stored)
  return `${JSON.stringify({ kittex: CACHE_VERSION, key, length: body.length })}\n${body}`
}

/**
 * The drawing an entry's text holds, or null when the text is not a whole
 * entry for `key` (another version, cut short, garbled). `remember` is told
 * each PNG with its base64, so the Image is sent without encoding it again.
 */
export function decodeEntry(text: string, key: string, remember?: (png: Uint8Array, base64: string) => void): Piece[] | null {
  try {
    const cut = text.indexOf('\n')
    if (cut < 0) return null
    const head = JSON.parse(text.slice(0, cut)) as { kittex?: unknown; key?: unknown; length?: unknown }
    const body = text.slice(cut + 1)
    if (head.kittex !== CACHE_VERSION || head.key !== key || head.length !== body.length) return null
    const stored = JSON.parse(body) as StoredPiece[]
    if (!Array.isArray(stored)) return null
    const image = (one: StoredImage): RenderedImage => {
      if (!isCells(one.columns) || !isCells(one.rows) || typeof one.scale !== 'number' || typeof one.png !== 'string') throw new Error('bad image')
      const png = fromBase64(one.png)
      // The engine refuses a whole drawing over one PNG without its signature and IHDR.
      if (!isPng(png)) throw new Error('not a PNG')
      remember?.(png, one.png)
      return { columns: one.columns, rows: one.rows, scale: one.scale, png }
    }
    return stored.map((piece): Piece => {
      if (typeof piece?.gap !== 'boolean') throw new Error('bad piece')
      if (piece.kind === 'image') {
        if (typeof piece.tex !== 'string') throw new Error('bad piece')
        return { kind: 'image', tex: piece.tex, gap: piece.gap, image: image(piece.image) }
      }
      if (typeof piece.text !== 'string') throw new Error('bad piece')
      if (piece.kind === 'note') return { kind: 'note', text: piece.text, gap: piece.gap }
      if (piece.kind !== 'prose') throw new Error('bad piece')
      if (piece.inline === undefined) return { kind: 'prose', text: piece.text, gap: piece.gap }
      if (!Array.isArray(piece.inline)) throw new Error('bad piece')
      const inline: InlineImage[] = piece.inline.map(one => {
        if (typeof one?.tex !== 'string' || !Number.isInteger(one.row) || !Number.isInteger(one.col)) throw new Error('bad inline')
        return { tex: one.tex, row: one.row, col: one.col, ...(one.display === true ? { display: true as const } : {}), image: image(one.image) }
      })
      return { kind: 'prose', text: piece.text, gap: piece.gap, inline }
    })
  } catch {
    return null
  }
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const isPng = (png: Uint8Array) => png.length >= 33 && SIGNATURE.every((byte, i) => png[i] === byte) && String.fromCharCode(...png.subarray(12, 16)) === 'IHDR'

const isCells = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 255

/** One file of the cache folder, as $.fs.list gives it. */
export interface CacheFile {
  name: string
  kind: string
  size: number
  mtimeMs: number
}

/**
 * The entries to remove so the folder holds at most `limit` bytes: none
 * while it fits, else the oldest (by mtime) until it holds CACHE_PRUNE_TO of
 * it. Only entry files (`name`: ENTRY_NAME, or TEX_ENTRY_NAME in TeX's
 * folder) count and are ever named: never a folder, never the TeX format.
 */
export function pruneList(files: readonly CacheFile[], limit = CACHE_LIMIT_BYTES, name: RegExp = ENTRY_NAME): string[] {
  const entries = files.filter(file => file.kind === 'file' && name.test(file.name))
  let total = entries.reduce((sum, file) => sum + file.size, 0)
  if (total <= limit) return []
  const out: string[] = []
  for (const file of [...entries].sort((a, b) => a.mtimeMs - b.mtimeMs || (a.name < b.name ? -1 : 1))) {
    if (total <= limit * CACHE_PRUNE_TO) break
    out.push(file.name)
    total -= file.size
  }
  return out
}

/** A 128-bit hash of `text` as 26 base-36 digits: four 32-bit FNV-1a lanes, each seeded apart and mixed. */
export function hash128(text: string): string {
  const bytes = new TextEncoder().encode(text)
  const seeds = [0x811c9dc5, 0x01000193 ^ 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35]
  const lanes = seeds.map(seed => {
    let h = seed >>> 0
    for (let i = 0; i < bytes.length; i++) h = Math.imul(h ^ bytes[i]!, 0x01000193)
    // A final mix, so the lanes differ in every bit.
    h ^= h >>> 16
    h = Math.imul(h, 0x85ebca6b)
    h ^= h >>> 13
    h = Math.imul(h, seed | 1)
    h ^= h >>> 16
    return BigInt(h >>> 0)
  })
  const value = (lanes[0]! << 96n) | (lanes[1]! << 64n) | (lanes[2]! << 32n) | lanes[3]!
  return value.toString(36).padStart(26, '0')
}

function fromBase64(text: string): Uint8Array {
  return (Uint8Array as unknown as { fromBase64(text: string): Uint8Array }).fromBase64(text)
}
