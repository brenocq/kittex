// The images kittex draws, and the caches that keep them: formulas through
// MathJax (or TeX's drawing where MathJax refused one), diagrams and image
// files as TexBook and ImageBook have them, each PNG's base64 and signature,
// and the reserved options of a block off screen. Nothing here takes `$`;
// register.tsx composes these images into what Claude Code draws.

import { blockImages, measureDisplay, measureDisplayResult, renderDisplay, renderDisplayResult, renderImageBlock, renderInline, renderInlineResult, renderPicture, TexError, toBase64 } from './core.js'
import type { ImageBlock, InkPlace, InlineEnv, PictureEnv, RenderedImage, RenderEnv } from './core.js'
import { imageBlockOf, imageBook } from './image.ts'
import { IMAGE_LIMIT } from './math.ts'
import type { PlanOptions } from './math.ts'
import { diagramJob, mathJob, texBook, texResult } from './tex.ts'
import type { DiagramKind } from './tex.ts'

/**
 * Images drawn, by formula and geometry (cells, column, ink, rows or columns),
 * least recently used first. Each keeps one PNG object, so its base64 and its
 * signature are computed once, and a re-render of a landed block sends the
 * same source (no new transmission).
 */
const drawnImages = new Map<string, RenderedImage>()

function cachedImage(key: string, draw: () => RenderedImage): RenderedImage {
  let image = drawnImages.get(key)
  if (image) {
    drawnImages.delete(key)
  } else {
    image = draw()
    while (drawnImages.size >= IMAGE_LIMIT) drawnImages.delete(drawnImages.keys().next().value!)
  }
  drawnImages.set(key, image)
  return image
}

function geometryKey(env: RenderEnv): string {
  const over = env.inkOver ? [env.inkOver.r, env.inkOver.g, env.inkOver.b, env.inkCurve?.gamma ?? '', env.inkCurve?.contrast ?? ''] : []
  return [env.cellWidth, env.cellHeight, env.maxColumns, env.emPx, env.weight ?? '', env.ink.r, env.ink.g, env.ink.b, ...over].join(',')
}

/** A display formula's image, `rows` tall (measured when not given). Throws TexError. */
export function displayImage(tex: string, env: RenderEnv, rows?: number): RenderedImage {
  let height: number
  try {
    height = rows ?? measureDisplay(tex, env).rows
    return cachedImage(`d\n${geometryKey(env)}\n${height}\n${tex}`, () => renderDisplay(tex, env, height))
  } catch (error) {
    // MathJax refused it: TeX's drawing where the local LaTeX made one.
    const result = error instanceof TexError ? texDrawn(tex, true) : undefined
    if (!result) throw texRefusal(tex, true) ?? error
    height = rows ?? measureDisplayResult(result, env).rows
    return cachedImage(`t\n${geometryKey(env)}\n${height}\n${tex}`, () => renderDisplayResult(result, env, height))
  }
}

/** The rows a display formula's image takes: MathJax's, or TeX's where MathJax refused it. Throws TexError. */
export function displayRows(tex: string, env: RenderEnv): number {
  try {
    return measureDisplay(tex, env).rows
  } catch (error) {
    const result = error instanceof TexError ? texDrawn(tex, true) : undefined
    if (!result) throw texRefusal(tex, true) ?? error
    return measureDisplayResult(result, env).rows
  }
}

/** An inline formula's image, `columns` wide, its ink where `place` says. Throws TexError. */
export function inlineImage(tex: string, env: InlineEnv, columns: number, place: InkPlace = 'center'): RenderedImage {
  const key = `${geometryKey(env)},${env.baselinePx}\n${columns},${place}\n${tex}`
  try {
    return cachedImage(`i\n${key}`, () => renderInline(tex, env, columns, place))
  } catch (error) {
    // MathJax refused it: TeX's drawing where the local LaTeX made one.
    const result = error instanceof TexError ? texDrawn(tex, false) : undefined
    if (!result) throw error
    return cachedImage(`ti\n${key}`, () => renderInlineResult(result, env, columns, place))
  }
}

export const base64Cache = new WeakMap<Uint8Array, string>()
const signatureCache = new WeakMap<Uint8Array, string>()

/**
 * A PNG's FNV-1a hash, for the key of the Box that holds its Image: an image
 * whose pixels change (new cells, width or ink) is a new element, which the
 * engine sends under a new image id, deleting the old one. Sent again under
 * the same id, Ghostty keeps drawing an earlier transmission.
 */
export function signatureOf(png: Uint8Array): string {
  let signature = signatureCache.get(png)
  if (signature === undefined) {
    let hash = 0x811c9dc5
    for (const byte of png) hash = Math.imul(hash ^ byte, 0x01000193)
    signature = (hash >>> 0).toString(36)
    signatureCache.set(png, signature)
  }
  return signature
}

export function base64Of(png: Uint8Array): string {
  let base64 = base64Cache.get(png)
  if (base64 === undefined) {
    base64 = toBase64(png)
    base64Cache.set(png, base64)
  }
  return base64
}

const NO_PNG = new Uint8Array(0)

/**
 * A plan's options for a block off screen: every formula measured (its rows
 * and its slot reserved, as the full drawing has them) and none drawn; an
 * image with no PNG is drawn as its Unicode (budget.ts's fallback), and an
 * inline one leaves its preview, until the block comes on screen.
 */
export function reservedOptions(options: PlanOptions, renderEnv: RenderEnv): PlanOptions {
  return {
    ...options,
    ...(options.draw
      ? {
          draw: (tex: string, rows?: number, maxColumns?: number) => {
            const box = measureDisplay(tex, maxColumns === undefined ? renderEnv : { ...renderEnv, maxColumns })
            return { columns: box.columns, rows: rows ?? box.rows, scale: box.scale, png: NO_PNG }
          },
        }
      : {}),
    ...(options.inline ? { inline: { ...options.inline, draw: (_tex: string, columns: number) => ({ columns, rows: 1, scale: 1, png: NO_PNG }) } } : {}),
  }
}

/** How each picture's image is drawn again at fewer pixels (fitPictures). */
export const pictureRedraws = new WeakMap<RenderedImage, (density: number) => RenderedImage>()

/**
 * A diagram's image `rows` tall (its own when not given), for the landing: as
 * TexBook has it, or null / { error } (see PlanOptions.diagram). An image
 * block's relative path resolves against `cwd`, its reply's own working
 * directory where kept (ImageBook.place).
 */
export function diagramImage(source: string, kind: DiagramKind, env: PictureEnv, rows?: number, tex = true, cwd?: string): RenderedImage | { error: string } | null {
  const files = imageBlockOf(source, kind)
  if (files) return filesImage(imageBook.place(files, cwd), env, rows)
  if (!tex) return null
  const job = diagramJob(source, kind)
  if (!job) return null
  if ('refused' in job) return { error: job.refused }
  const outcome = texBook.known(job.document)
  if (!outcome || (!outcome.ok && !outcome.lasting)) {
    texBook.ask(job.document)
    return null
  }
  if (!outcome.ok) return { error: outcome.error }
  try {
    const key = `p\n${geometryKey(env)},${env.background ? [env.background.r, env.background.g, env.background.b].join(',') : ''}\n${rows ?? ''}\n${job.document.text}`
    const image = cachedImage(key, () => renderPicture(outcome.picture, env, rows))
    if (!pictureRedraws.has(image)) pictureRedraws.set(image, density => cachedImage(`${key}\n${density}`, () => renderPicture(outcome.picture, env, image.rows, density)))
    return image
  } catch (error) {
    if (error instanceof TexError) return { error: error.message }
    throw error
  }
}

/** An image block's files drawn `rows` tall (their own when not given): as ImageBook has them, or null (those unread asked for, drawn once read) or { error }. */
function filesImage(block: ImageBlock, env: PictureEnv, rows?: number): RenderedImage | { error: string } | null {
  const outcome = imageBook.knownBlock(block)
  if (!outcome) {
    for (const image of blockImages(block)) {
      const known = imageBook.known(image)
      if (!known || (!known.ok && !known.lasting)) imageBook.ask(image)
    }
    return null
  }
  if (!outcome.ok) return { error: outcome.error }
  try {
    const background = env.background ? [env.background.r, env.background.g, env.background.b].join(',') : ''
    const key = `f\n${geometryKey(env)},${background},${env.maxRows ?? ''}\n${rows ?? ''}\n${outcome.id}\n${JSON.stringify(block)}`
    const image = cachedImage(key, () => renderImageBlock(outcome.sources, block, env, rows))
    // Drawn again at fewer pixels (fitPictures) relative to the density it was drawn at: a photo is already below 1.
    const drawnAt = 'density' in image && typeof image.density === 'number' ? image.density : 1
    if (!pictureRedraws.has(image)) pictureRedraws.set(image, density => cachedImage(`${key}\n${density}`, () => renderImageBlock(outcome.sources, block, env, image.rows, density * drawnAt)))
    return image
  } catch (error) {
    if (error instanceof TexError) return { error: error.message }
    throw error
  }
}

/** A formula MathJax refused, as TeX drew it (TexBook), or undefined: then wanted for the next draw. */
function texDrawn(tex: string, display: boolean): ReturnType<typeof texResult> | undefined {
  const document = mathJob(tex, display)
  if (!document) return undefined
  const outcome = texBook.known(document)
  if (outcome?.ok) return texResult(outcome.picture)
  if (!outcome || !outcome.lasting) texBook.ask(document)
  return undefined
}

/** TeX's own error for a formula MathJax refused and TeX failed on for good (the note shows it, as the stream did). */
function texRefusal(tex: string, display: boolean): TexError | undefined {
  const document = mathJob(tex, display)
  const outcome = document ? texBook.known(document) : undefined
  return outcome && !outcome.ok && outcome.lasting ? new TexError(outcome.error) : undefined
}
