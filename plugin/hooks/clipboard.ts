// Putting an image itself on the system clipboard, for the "copy image" button
// of an image block. The engine's own copy takes text only, so this runs the
// system's clipboard tool: osascript on macOS, wl-copy under Wayland, xclip
// under X11. Every path goes to the tool as an argument of its own (to
// osascript as `argv`, to sh as a positional parameter), never spliced into
// script text, so no quote or backslash in it can break or inject anything.
// register.tsx backs ClipboardHost with `$.process.run`.

import { isJobDir, jobDirTemplate } from './core.js'

/** The label of the button under "copy path", which copies the image itself. */
export const COPY_IMAGE_LABEL = '⧉ copy image'

export const COPIED_IMAGE = 'Copied the image'

/** The toast of a failed copy: what went wrong, in a few words. */
export function failedCopy(reason: string): string {
  return `Could not copy the image: ${reason}`
}

/** How long a clipboard tool, or a step that writes the PNG, may run. */
export const CLIPBOARD_MS = 10_000

/** The file to copy as it is (a PNG or a JPEG), or a PNG drawn from an SVG or a PDF, as base64. */
export type ClipboardImage = { kind: 'file'; path: string; format: 'png' | 'jpeg' } | { kind: 'png'; base64: string }

/** Where the copy runs: `platform` is `uname -s` in lower case. */
export interface ClipboardSystem {
  platform: string | undefined
  /** WAYLAND_DISPLAY is set: wl-copy, not xclip. */
  wayland: boolean
  tmpdir: string | undefined
}

export interface ClipboardHost {
  run(argv: readonly string[], init: { stdin?: string; timeoutMs: number }): Promise<{ exitCode: number; stdout: string; stderr: string }>
}

export type ClipboardOutcome = { ok: true } | { ok: false; reason: string }

const MIME = { png: 'image/png', jpeg: 'image/jpeg' } as const

/**
 * The command that puts the file at `path` on the clipboard as `format`, or
 * undefined where kittex knows no clipboard tool. On Linux the tool runs
 * under sh with its output sent to /dev/null: wl-copy and xclip stay behind
 * to serve the clipboard, and must not hold the pipes the call waits on.
 */
export function clipboardArgv(system: Pick<ClipboardSystem, 'platform' | 'wayland'>, path: string, format: 'png' | 'jpeg'): string[] | undefined {
  if (system.platform === 'darwin') {
    const type = format === 'png' ? '«class PNGf»' : '«class JPEG»'
    return ['osascript', '-e', 'on run argv', '-e', `set the clipboard to (read (POSIX file (item 1 of argv)) as ${type})`, '-e', 'end run', path]
  }
  if (system.platform === 'linux') {
    const script = system.wayland ? 'wl-copy --type "$2" < "$1" >/dev/null 2>&1' : 'xclip -selection clipboard -t "$2" -i "$1" >/dev/null 2>&1'
    return ['sh', '-c', script, 'sh', path, MIME[format]]
  }
  return undefined
}

/** The tool clipboardArgv runs, by name, for a failure's reason. */
function toolOf(system: Pick<ClipboardSystem, 'platform' | 'wayland'>): string {
  return system.platform === 'darwin' ? 'osascript' : system.wayland ? 'wl-copy' : 'xclip'
}

/** Why a clipboard command failed, in a line: sh's 127 is a missing tool; osascript's error without its offsets. */
function failure(tool: string, result: { exitCode: number; stderr: string }): string {
  if (result.exitCode === 127) return `${tool} not found`
  const said = result.stderr.trim().split('\n')[0]?.replace(/^\d+:\d+: (?:execution error: )?/, '').trim()
  const short = said && said.length > 100 ? `${said.slice(0, 99)}…` : said
  return short || `${tool} failed (exit ${result.exitCode})`
}

/**
 * Puts the image on the clipboard. A drawn PNG is first written into a
 * directory of its own under TMPDIR, removed afterwards whatever happened.
 * Never throws: a command that can't start is a reason like any other.
 */
export async function copyImage(host: ClipboardHost, system: ClipboardSystem, image: ClipboardImage): Promise<ClipboardOutcome> {
  if (clipboardArgv(system, '', 'png') === undefined) return { ok: false, reason: `no clipboard tool known for ${system.platform ?? 'this system'}` }
  const run = (argv: readonly string[], stdin?: string) =>
    host.run(argv, stdin === undefined ? { timeoutMs: CLIPBOARD_MS } : { stdin, timeoutMs: CLIPBOARD_MS }).catch(() => undefined)
  const put = async (path: string, format: 'png' | 'jpeg'): Promise<ClipboardOutcome> => {
    const argv = clipboardArgv(system, path, format) ?? []
    const result = await run(argv)
    if (!result) return { ok: false, reason: `${toolOf(system)} could not run` }
    return result.exitCode === 0 ? { ok: true } : { ok: false, reason: failure(toolOf(system), result) }
  }
  if (image.kind === 'file') return put(image.path, image.format)
  const made = await run(['mktemp', '-d', jobDirTemplate(system.tmpdir)])
  const dir = made?.exitCode === 0 ? made.stdout.trim() : ''
  if (!isJobDir(dir)) return { ok: false, reason: 'no temporary directory for the PNG' }
  try {
    const path = `${dir}/image.png`
    const written = await run(['sh', '-c', 'base64 -d > "$1"', 'sh', path], image.base64)
    if (written?.exitCode !== 0) return { ok: false, reason: 'could not write the PNG' }
    return await put(path, 'png')
  } finally {
    await run(['rm', '-rf', '--', dir])
  }
}
