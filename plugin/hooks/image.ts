// Image files shown in place of an image block (a ```latex block holding one
// \includegraphics: core's imageBlock). Nothing here takes `$`: register.tsx
// hands an ImageHost of closures over session.start's `$`, as it does TeX's.
// The book reads and decodes each file once per version of it (its real
// path, size and modification time), and the stream and the landing read
// what it holds synchronously, as they read TeX's outcomes (tex.ts).

import { ImageError, imageBlock, MAX_IMAGE_FILE_BYTES, pictureSource, readImageFile, resolveImagePath, SvgError, XmlError } from './core.js'
import type { ImageSource, ImageSpec } from './core.js'
import type { DiagramKind, TexOutcome } from './tex.ts'

/** What an image block's file gave: what to draw (`id`: the file's version), or why there is nothing. */
export type ImageOutcome =
  | { ok: true; source: ImageSource; id: string }
  /** `lasting`: the file's own answer (missing, not an image), shown as a note; else (a PDF conversion that ran out of time) it may be tried again. */
  | { ok: false; error: string; lasting: boolean }

/** What reading image files needs from the host (register.tsx backs it with `$`). */
export interface ImageHost {
  /** A path's kind, size and modification time, and where it lands (links followed); undefined when it isn't there. */
  stat(path: string): Promise<{ kind: 'file' | 'dir' | 'other'; size: number; mtimeMs: number; realPath?: string } | undefined>
  readBytes(path: string): Promise<Uint8Array | undefined>
  /** A PDF's first page as a picture, where the local TeX converts PDF (tex.ts pdfPicture); absent where nothing does. */
  pdf?: (path: string, timeoutMs: number) => Promise<TexOutcome>
}

/** Why a PDF file stays code where nothing converts it. */
export const NO_PDF = 'PDF files are drawn with the local TeX, which is not there or reads no PDF'

/** The image a diagram segment shows: a ```latex block that is an image block (imageBlock); undefined for any other. */
export function imageSpecOf(source: string, kind: DiagramKind): ImageSpec | undefined {
  return kind === 'latex' ? imageBlock(source) : undefined
}

/** Files the book keeps decoded, at most, and their kept pixels in all (KEPT_IMAGE_PIXELS each at most). */
const BOOK_LIMIT = 8
const BOOK_PIXELS = 24_000_000

interface Entry {
  outcome: ImageOutcome
  /** The file's version it was read from: real path, size and modification time. */
  stamp?: string
  /** When the file was last looked at (Date.now()). */
  checkedAt: number
}

/**
 * Image files read and decoded, by the path they resolve to: the stream and
 * the landing read outcomes here synchronously (`known`), and ask for the
 * ones missing (`load`). Each load looks at the file again, and decodes it
 * again only when it changed.
 */
export class ImageBook {
  private readonly entries = new Map<string, Entry>()
  private readonly running = new Map<string, Promise<ImageOutcome>>()
  private readonly asked = new Map<string, ImageSpec>()
  /** Blocks the stream showed as written (the file took too long): left so when their block lands. */
  private readonly shownAsSource = new Set<string>()
  host: ImageHost | undefined
  /** The session's working directory and the home directory, which relative and `~/` paths resolve against. */
  cwd: string | undefined
  home: string | undefined

  /** Forgets everything (a new session, tests). */
  reset(host?: ImageHost, where: { cwd?: string; home?: string } = {}): void {
    this.entries.clear()
    this.running.clear()
    this.asked.clear()
    this.shownAsSource.clear()
    this.host = host
    this.cwd = where.cwd
    this.home = where.home
  }

  /** Files can be read. */
  get ready(): boolean {
    return this.host !== undefined
  }

  /** The book's key for a block's file: the path it resolves to (or as written, where it resolves to none). */
  key(spec: ImageSpec): string {
    return resolveImagePath(spec.path, this.cwd, this.home) ?? `unplaced:${spec.path}`
  }

  /** What a block's file gave, when it was read in this process; a passing failure included. */
  known(spec: ImageSpec): ImageOutcome | undefined {
    const key = this.key(spec)
    const entry = this.entries.get(key)
    if (!entry) return undefined
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.outcome
  }

  /** Whether the file was looked at since `since` (Date.now()): a new reply's stream looks again, so a plot written since shows. */
  checkedSince(spec: ImageSpec, since: number): boolean {
    const entry = this.entries.get(this.key(spec))
    return entry !== undefined && entry.checkedAt >= since
  }

  /** A landing wants this file drawn (a reply read back after --resume): kept until takeAsked. Not one shown as source. */
  ask(spec: ImageSpec): void {
    const key = this.key(spec)
    if (this.host && !this.shownAsSource.has(key) && this.asked.size < 64) this.asked.set(key, spec)
  }

  takeAsked(): ImageSpec[] {
    const specs = [...this.asked.values()]
    this.asked.clear()
    return specs
  }

  markShownAsSource(spec: ImageSpec): void {
    this.shownAsSource.add(this.key(spec))
    if (this.shownAsSource.size > 256) this.shownAsSource.delete(this.shownAsSource.values().next().value!)
  }

  wasShownAsSource(spec: ImageSpec): boolean {
    return this.shownAsSource.has(this.key(spec))
  }

  /** Records an outcome (tests, and what load finds), keeping at most BOOK_LIMIT files and BOOK_PIXELS kept pixels. */
  remember(spec: ImageSpec, outcome: ImageOutcome, stamp?: string): void {
    const key = this.key(spec)
    this.entries.delete(key)
    this.entries.set(key, { outcome, ...(stamp !== undefined ? { stamp } : {}), checkedAt: Date.now() })
    const pixels = () => [...this.entries.values()].reduce((sum, entry) => sum + (entry.outcome.ok && entry.outcome.source.kind === 'bitmap' ? entry.outcome.source.bitmap.width * entry.outcome.source.bitmap.height : 0), 0)
    while (this.entries.size > BOOK_LIMIT || (this.entries.size > 1 && pixels() > BOOK_PIXELS)) this.entries.delete(this.entries.keys().next().value!)
  }

  /**
   * The block's file, looked at now: its outcome, decoded again only where
   * the file changed since it was last read. A PDF is converted within
   * `timeoutMs`; running out of time is an outcome that isn't kept.
   */
  load(spec: ImageSpec, timeoutMs: number): Promise<ImageOutcome> {
    const key = this.key(spec)
    const running = this.running.get(key)
    if (running) return running
    // Every load is recorded, a passing failure too: the stream that waited for it then goes on (checkedSince).
    const job = this.read(spec, timeoutMs).catch((error: unknown): ImageOutcome => {
      const outcome: ImageOutcome = { ok: false, error: String(error), lasting: false }
      this.remember(spec, outcome)
      return outcome
    })
    this.running.set(key, job)
    void job.finally(() => this.running.delete(key))
    return job
  }

  private async read(spec: ImageSpec, timeoutMs: number): Promise<ImageOutcome> {
    const failed = (error: string, lasting = true): ImageOutcome => {
      const outcome: ImageOutcome = { ok: false, error, lasting }
      this.remember(spec, outcome)
      return outcome
    }
    const host = this.host
    if (!host) return failed('no file access', false)
    const path = resolveImagePath(spec.path, this.cwd, this.home)
    if (path === undefined) return failed(`can't tell where ${spec.path} is`)
    const stat = await host.stat(path).catch(() => undefined)
    if (!stat) return failed(`no file at ${path}`)
    if (stat.kind !== 'file') return failed(`${path} is not a file`)
    if (stat.size === 0) return failed(`${path} is empty`)
    if (stat.size > MAX_IMAGE_FILE_BYTES) return failed(`${path} is larger than ${MAX_IMAGE_FILE_BYTES / 1024 / 1024} MiB`)
    const real = stat.realPath ?? path
    const stamp = `${real}\n${stat.size}\n${stat.mtimeMs}`
    const entry = this.entries.get(this.key(spec))
    if (entry?.stamp === stamp && (entry.outcome.ok || entry.outcome.lasting)) {
      entry.checkedAt = Date.now()
      return entry.outcome
    }
    const bytes = await host.readBytes(path)
    if (!bytes) return failed(`can't read ${path}`)
    let outcome: ImageOutcome
    try {
      const read = readImageFile(bytes)
      if (read !== 'pdf') outcome = { ok: true, source: read, id: stamp }
      else if (!host.pdf) outcome = { ok: false, error: NO_PDF, lasting: true }
      else {
        const converted = await host.pdf(real, timeoutMs)
        outcome = converted.ok ? { ok: true, source: pictureSource(converted.picture), id: stamp } : { ok: false, error: converted.error, lasting: converted.lasting }
      }
    } catch (error) {
      if (!(error instanceof ImageError || error instanceof SvgError || error instanceof XmlError)) throw error
      outcome = { ok: false, error: error.message, lasting: true }
    }
    this.remember(spec, outcome, outcome.ok || outcome.lasting ? stamp : undefined)
    return outcome
  }
}

/** The process's book: register.tsx gives it its host, math.ts reads it. */
export const imageBook = new ImageBook()
