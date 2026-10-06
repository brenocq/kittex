// Shrinks a failing case to a minimal reply and terminal: drops blocks, then
// lines, then words, then simplifies the terminal, keeping each step that
// still fails the same check with the same cause.

import { runCase } from './drive.js'
import type { CheckName, Failure, Shape } from './drive.js'
import type { Reply } from '../../../plugin/tests/fuzz/generate.ts'
import { writeReply } from '../../../plugin/tests/fuzz/generate.ts'

export interface Repro {
  markdown: string
  shape: Shape
  failure: Failure
}

/** Whether a reply fails `check` with `cause` in `shape`. */
function failsWith(markdown: string, shape: Shape, check: CheckName, cause: string): Failure | undefined {
  try {
    return runCase(markdown, shape).failures.find(failure => failure.check === check && failure.cause === cause)
  } catch {
    return undefined
  }
}

/** Removes pieces one at a time (larger chunks first), keeping removals that still fail. */
function shrinkList<T>(items: T[], fails: (items: T[]) => boolean): T[] {
  let current = items
  for (let size = Math.max(1, Math.floor(current.length / 2)); size >= 1; size = Math.floor(size / 2)) {
    for (let i = 0; i + size <= current.length; ) {
      const candidate = [...current.slice(0, i), ...current.slice(i + size)]
      if (candidate.length > 0 && fails(candidate)) current = candidate
      else i += size
    }
    if (size === 1) break
  }
  return current
}

export function shrink(reply: Reply, shape: Shape, failure: Failure, budget = 400): Repro {
  const { check, cause } = failure
  let tries = 0
  const fails = (markdown: string, s: Shape = shape) => {
    if (tries++ > budget) return false
    return failsWith(markdown, s, check, cause) !== undefined
  }
  // Blocks.
  let blocks = reply.blocks.map((block, i) => ({ block, join: reply.joins[i] ?? '\n\n' }))
  const write = (list: typeof blocks, crlf = reply.crlf, trailing = reply.trailingNewline) =>
    writeReply({ blocks: list.map(b => b.block), joins: list.map((b, i) => (i === 0 ? '' : b.join)), crlf, trailingNewline: trailing })
  blocks = shrinkList(blocks, list => fails(write(list)))
  let crlf = reply.crlf
  let trailing = reply.trailingNewline
  if (crlf && fails(write(blocks, false, trailing))) crlf = false
  if (fails(write(blocks, crlf, !trailing))) trailing = !trailing
  // Lines of each block.
  for (let b = 0; b < blocks.length; b++) {
    const lines = blocks[b]!.block.split('\n')
    if (lines.length < 2) continue
    const kept = shrinkList(lines, list => {
      const copy = blocks.map(x => ({ ...x }))
      copy[b]!.block = list.join('\n')
      return fails(write(copy, crlf, trailing))
    })
    blocks[b]!.block = kept.join('\n')
  }
  // Words of each line (split at spaces, formulas kept whole as far as spaces allow).
  for (let b = 0; b < blocks.length; b++) {
    const lines = blocks[b]!.block.split('\n')
    for (let l = 0; l < lines.length; l++) {
      const words = lines[l]!.split(/(?<= )/)
      if (words.length < 2) continue
      const kept = shrinkList(words, list => {
        const copy = blocks.map(x => ({ ...x }))
        const next = [...lines]
        next[l] = list.join('')
        copy[b]!.block = next.join('\n')
        return fails(write(copy, crlf, trailing))
      })
      lines[l] = kept.join('')
      blocks[b]!.block = lines.join('\n')
    }
  }
  // Indentation: dedent lines where the failure holds without it.
  for (let b = 0; b < blocks.length; b++) {
    const lines = blocks[b]!.block.split('\n')
    for (let l = 0; l < lines.length; l++) {
      if (!/^[ \t]/.test(lines[l]!)) continue
      const next = [...lines]
      next[l] = lines[l]!.replace(/^[ \t]+/, '')
      const copy = blocks.map(x => ({ ...x }))
      copy[b]!.block = next.join('\n')
      if (fails(write(copy, crlf, trailing))) {
        lines[l] = next[l]!
        blocks[b]!.block = lines.join('\n')
      }
    }
  }
  const markdown = write(blocks, crlf, trailing)
  // The terminal: plain options first, then a narrower window.
  let s = shape
  const tryShape = (next: Shape) => {
    if (fails(markdown, next)) s = next
  }
  if (s.maxProseWidth !== undefined) tryShape({ ...s, maxProseWidth: undefined } as Shape)
  if (s.links !== 'osc8') tryShape({ ...s, links: 'osc8' })
  if (s.trimLanded) tryShape({ ...s, trimLanded: false })
  if (s.cellWidth !== 13 || s.cellHeight !== 26) tryShape({ ...s, cellWidth: 13, cellHeight: 26 })
  for (const columns of [80, 100, 120, 60, 40]) {
    if (s.columns === columns) break
    const before = s
    tryShape({ ...s, columns })
    if (s !== before) break
  }
  tryShape({ ...s, flushSeed: 1 })
  const final = failsWith(markdown, s, check, cause) ?? failure
  return { markdown, shape: s, failure: final }
}
