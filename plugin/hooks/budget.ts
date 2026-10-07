// The images one landed block may draw. Claude Code takes at most 2 MiB of
// Image source (decoded PNG bytes) in one ui.render answer, all its Images
// together; past it, it throws the whole answer away and draws its own text
// (measured live on 2.1.291: "more than 2097152 bytes of Image source in one
// tree"). A long block of large formulas could get there, so its images are
// counted in reading order and those that no longer fit are left out: each
// keeps the Unicode its rows already hold, so nothing moves.
import { MAX_IMAGE_BYTES } from './core.js'
import type { RenderedImage } from './core.js'
import type { Piece } from './math.ts'

/** The PNG bytes one drawing may hold: the engine's limit for all its Images together. */
export const TREE_IMAGE_BYTES = MAX_IMAGE_BYTES

/**
 * The images of `pieces` that do not fit in `limit` bytes, in reading order
 * (a piece's display image, then a prose piece's inline images row by row):
 * each one taken while it fits, the rest left out.
 */
export function overBudget(pieces: readonly Piece[], limit = TREE_IMAGE_BYTES): Set<RenderedImage> {
  const left = new Set<RenderedImage>()
  let used = 0
  const take = (image: RenderedImage) => {
    if (used + image.png.length <= limit) used += image.png.length
    else left.add(image)
  }
  for (const piece of pieces) {
    if (piece.kind === 'image') take(piece.image)
    else if (piece.kind === 'prose' && piece.inline) for (const one of [...piece.inline].sort((a, b) => a.row - b.row || a.col - b.col)) take(one.image)
  }
  return left
}

/**
 * A display formula left out of the budget, as text in its image's box:
 * `lines` (its Unicode preview, from core's previewDisplay) centred across
 * `columns`, padded with blank lines to `rows`; its source on one line when
 * there is no preview.
 */
export function fallbackLines(lines: readonly string[] | null, tex: string, columns: number, rows: number): string[] {
  const body = lines && lines.length <= rows ? [...lines] : [oneLine(tex, columns)]
  const width = Math.max(...body.map(line => [...line].length))
  const pad = ' '.repeat(Math.max(0, Math.floor((columns - width) / 2)))
  const above = Math.floor((rows - body.length) / 2)
  const out = [...Array<string>(Math.max(0, above)).fill(''), ...body.map(line => (pad + line).trimEnd())]
  while (out.length < rows) out.push('')
  return out.slice(0, rows)
}

function oneLine(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const chars = [...flat]
  return chars.length <= max ? flat : `${chars.slice(0, Math.max(1, max - 1)).join('')}…`
}

/**
 * An Image's alt as the engine takes it: a control character in it (a form
 * feed, a newline in a formula's source) fails the whole drawing, so each
 * becomes a space; never empty.
 */
export function altText(text: string): string {
  // eslint-disable-next-line no-control-regex
  const clean = text.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
  return clean === '' ? ' ' : clean
}

/** The densities a picture is drawn again at, in turn, to fit a drawing's budget (its pixels each way: 1/2, then 1/3). */
export const PICTURE_DENSITIES: readonly number[] = [0.5, 1 / 3]

/**
 * A drawing's pieces with its pictures (TeX diagrams) drawn at fewer pixels,
 * largest first, while all its images together pass `limit`: a picture keeps
 * its cells (the terminal scales an image to them), so nothing moves, and
 * it is drawn after all instead of being left out. `redraw` gives a
 * picture's image drawn again at a density (undefined for anything else: a
 * formula is small and keeps its pixels).
 */
export function fitPictures(pieces: readonly Piece[], redraw: (image: RenderedImage, density: number) => RenderedImage | undefined, limit = TREE_IMAGE_BYTES): Piece[] {
  const images = pieces.flatMap(piece => (piece.kind === 'image' ? [piece.image] : piece.kind === 'prose' ? (piece.inline ?? []).map(one => one.image) : []))
  let total = images.reduce((sum, image) => sum + image.png.length, 0)
  if (total <= limit) return [...pieces]
  const swap = new Map<RenderedImage, RenderedImage>()
  for (const density of PICTURE_DENSITIES) {
    for (const image of [...images].sort((a, b) => b.png.length - a.png.length)) {
      if (total <= limit) break
      const now = swap.get(image) ?? image
      const smaller = redraw(image, density)
      if (!smaller || smaller.png.length >= now.png.length) continue
      total += smaller.png.length - now.png.length
      swap.set(image, smaller)
    }
    if (total <= limit) break
  }
  if (swap.size === 0) return [...pieces]
  return pieces.map(piece => {
    if (piece.kind === 'image') return swap.has(piece.image) ? { ...piece, image: swap.get(piece.image)! } : piece
    if (piece.kind === 'prose' && piece.inline) return { ...piece, inline: piece.inline.map(one => (swap.has(one.image) ? { ...one, image: swap.get(one.image)! } : one)) }
    return piece
  })
}
