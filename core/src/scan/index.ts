import type { LineScanner, LineScannerOptions, Segment } from '../types.js'
import { Scanner } from './scanner.js'

/**
 * Splits a markdown reply into prose and math segments, in order, covering the
 * whole text, with adjacent prose merged into one text segment.
 *
 * Code (fences, code spans, indented code blocks) is never math. Display math is
 * `$$…$$` or `\[…\]` starting a line (one line or several), a bare
 * `\begin{env}…\end{env}` for the usual display environments, or a ```math
 * fence. Inline math is `$…$` by Pandoc's rules (so `$5 and $10` is prose),
 * `$$…$$` with other text on its line, or `\(…\)`. `\$` is a literal dollar.
 * With `diagrams`, ```latex, ```tex and ```tikz fences and bare tikzpicture,
 * tikzcd and circuitikz environments are display segments marked `diagram`.
 */
export function scan(markdown: string, options: Pick<LineScannerOptions, 'diagrams'> = {}): Segment[] {
  return new Scanner(Infinity, options.diagrams === true, Infinity).push(markdown, true)
}

/**
 * A scanner for a reply that streams in as batches of whole lines. Each push
 * returns the segments it completes, with offsets over everything pushed so far.
 * Prose comes back as it arrives, a line at a time; a line where an inline
 * opener (`$`, `$$`, `\(` or a backtick run) is still waiting for its closer is
 * held until the paragraph closes it or ends. An open display block is held
 * until it closes, and released as text when a batch ends with it holding more
 * than `maxHeldLines` lines (the rest of that block then passes as text too).
 * `final` flushes everything: a display block still open was not one, and its
 * lines come back as prose, like any block that gives up (on a blank line, say).
 * A trailing partial line is kept until the next push. Don't push after `final`.
 *
 * Joined (adjacent text merged), the segments equal `scan` of the whole reply,
 * however it was split into batches, unless the hold limit released something.
 */
export function createLineScanner(options: LineScannerOptions = {}): LineScanner {
  const scanner = new Scanner(Math.max(1, options.maxHeldLines ?? 40), options.diagrams === true, Math.max(1, options.maxDiagramLines ?? 400))
  return { push: (delta, final) => scanner.push(delta, final) }
}
