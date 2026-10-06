// A seeded generator of replies as Claude writes them, mixing everything
// kittex must survive: paragraphs (long and short, soft and hard breaks,
// emphasis, code spans, escapes, links, emoji, CJK, long words), headings
// (ATX 1-6 and setext), lists (bullet, numbered, nested, loose, with display
// math inside), blockquotes (nested, with lists and display math), tables
// (alignments, wide and narrow, math and pipes in cells), code fences, rules,
// display math in every delimiter, inline math of every kind, currency
// dollars, and blocks with no blank line between them. Deterministic per seed.

import { BARE_ENVS, DISPLAY, GIANT, INLINE } from './formulas.ts'
import type { InlineKind } from './formulas.ts'
import { Rng } from './rng.ts'

/** A reply: its blocks, and how each is joined to the one before (a blank line, or none). */
export interface Reply {
  blocks: string[]
  /** `joins[i]` goes between blocks[i-1] and blocks[i] (joins[0] is ''). */
  joins: string[]
  /** Whole-reply variants applied when it is written out. */
  crlf: boolean
  /** The reply ends with a newline. */
  trailingNewline: boolean
}

export function writeReply(reply: Reply): string {
  let out = ''
  for (const [i, block] of reply.blocks.entries()) out += (i > 0 ? reply.joins[i] : '') + block
  if (reply.trailingNewline) out += '\n'
  return reply.crlf ? out.replace(/\r?\n/g, '\r\n') : out
}

const WORDS = (
  'the of and to in is that for it as with on by this be are from at an we which or can not its has have so then thus ' +
  'value function matrix vector state estimate model error update step gradient loss term sum series bound proof ' +
  'where each since because therefore hence note gives yields equals becomes holds follows converges diverges ' +
  'Kalman filter covariance prior posterior likelihood sample mean variance eigenvalue determinant rank basis ' +
  'kernel space operator norm integral derivative limit sequence probability distribution entropy'
).split(' ')

const LONG_WORDS = [
  'electroencephalographically',
  'Pneumonoultramicroscopicsilicovolcanoconiosis',
  'supercalifragilisticexpialidocious_and_more',
  'averyveryveryveryveryveryveryveryveryveryverylongidentifierwithoutanybreaks',
  'https://example.com/a/very/long/path/that/keeps/going/and/going/index.html?query=1&other=2',
  'foo/bar/baz/qux/quux/corge/grault/garply/waldo/fred/plugh/xyzzy/thud.ts',
]

const EMOJI_SINGLE = ['🚀', '✅', '🎉', '🔥', '💡', '📌', '😀', '⭐', '❌', '⏳']
const EMOJI_SEQ = ['❤️', '⚠️', '🛰️', '👍🏽', '👨‍👩‍👧', '🇯🇵', '1️⃣', '✔️', '☺️']
const CJK = ['速度', '日本語のテキスト', '中文', '한국어', '数学', 'ｆｕｌｌｗｉｄｔｈ', 'カタカナ']

const URLS = ['https://example.com', 'https://en.wikipedia.org/wiki/Kalman_filter', 'http://arxiv.org/abs/1706.03762', 'https://github.com/owner/repo/issues/42']
const CODE_SPANS = ['`x = 1`', '`np.linalg.inv(A)`', '`$HOME`', '`a | b`', '`**not bold**`', '`$x$`', '``code with ` tick``', '`\\frac{a}{b}`', '`O(n)`']
const ESCAPES = ['\\*', '\\_', '\\#', '\\[', '\\]', '\\`', '\\|', '\\\\', '\\$', '\\<', '\\>']

export interface GenOptions {
  /** Scale of the reply: blocks drawn (default 1-12). */
  maxBlocks?: number
  /**
   * `real`: what Claude's replies hold, the exotic (emoji, CJK, tabs, HTML,
   * giant words) rare; `wild`: everything often. Default `real`.
   */
  profile?: 'real' | 'wild'
  /** The display formulas to draw from (formulas.ts's DISPLAY by default). */
  display?: readonly string[]
  /** Allow huge formulas and replies (a hook's time budget). */
  huge?: boolean
}

export function generateReply(seed: number, options: GenOptions = {}): Reply {
  const rng = new Rng(seed)
  const g = new Gen(rng, options)
  const huge = options.huge === true && rng.chance(0.5)
  const count = huge ? rng.int(30, 120) : rng.int(1, options.maxBlocks ?? 12)
  const blocks: string[] = []
  const joins: string[] = ['']
  for (let i = 0; i < count; i++) {
    blocks.push(g.block(0))
    if (i > 0) joins.push(rng.weighted([[8, '\n\n'], [2, '\n'], [1, '\n\n\n'], [0.5, '\n  \n']]))
  }
  if (options.huge && rng.chance(0.3)) {
    blocks.push(`$$\n${rng.pick(GIANT)}\n$$`)
    joins.push('\n\n')
  }
  return { blocks, joins, crlf: rng.chance(0.02 * g.exotic), trailingNewline: rng.chance(0.6) }
}

class Gen {
  constructor(
    readonly rng: Rng,
    readonly options: GenOptions,
  ) {}

  block(depth: number): string {
    const r = this.rng
    const kind = r.weighted<string>([
      [30, 'paragraph'],
      [10, 'heading'],
      [12, 'list'],
      [6, 'quote'],
      [7, 'table'],
      [5, 'code'],
      [2, 'rule'],
      [16, 'display'],
      [2, 'setext'],
    ])
    switch (kind) {
      case 'paragraph':
        return this.paragraph()
      case 'heading':
        return `${'#'.repeat(r.weighted([[3, 1], [5, 2], [5, 3], [2, 4], [1, 5], [1, 6]]))} ${this.sentence(r.int(1, 8), 0.3)}`
      case 'setext':
        return `${this.sentence(r.int(1, 6), 0.3)}\n${r.pick(['===', '---', '======'])}`
      case 'list':
        return this.list(depth, r.chance(0.4))
      case 'quote':
        return this.quote(depth)
      case 'table':
        return this.table()
      case 'code':
        return this.code()
      case 'rule':
        return r.pick(['---', '***', '___', '- - -'])
      default:
        return this.display('')
    }
  }

  /** An inline formula, written with its delimiters (or currency, or an escape). */
  inline(): string {
    const r = this.rng
    const kind = r.weighted<InlineKind | 'currency' | 'spaced' | 'paren'>([
      [40, 'short'],
      [14, 'clash'],
      [8, 'wide'],
      [10, 'tall'],
      [3 * this.exotic, 'refused'],
      [3, 'currency'],
      [1 * this.exotic, 'spaced'],
      [3, 'paren'],
    ])
    if (kind === 'currency') return r.pick(['$5', '$10 and $20', '\\$3.50', 'costs $100', '$1,000', 'US$5', '\\$x\\$'])
    if (kind === 'spaced') return `$ ${r.pick(INLINE.short)} $`
    if (kind === 'paren') return `\\(${r.pick(INLINE.short)}\\)`
    return `$${r.pick(INLINE[kind])}$`
  }

  /** Weight of the exotic: rare in a real reply. */
  get exotic(): number {
    return this.options.profile === 'wild' ? 1 : 0.15
  }

  word(): string {
    const r = this.rng
    const x = this.exotic
    const w = r.weighted<() => string>([
      [70, () => r.pick(WORDS)],
      [6, () => this.inline()],
      [2 * x, () => r.pick(LONG_WORDS)],
      [1.5 * x, () => r.pick(EMOJI_SINGLE)],
      [0.7 * x, () => r.pick(EMOJI_SEQ)],
      [0.8 * x, () => r.pick(CJK)],
      [2, () => r.pick(CODE_SPANS)],
      [1 * x, () => r.pick(ESCAPES)],
      [1.5, () => `[${r.pick(WORDS)} ${r.pick(WORDS)}](${r.pick(URLS)})`],
      [0.5, () => `[${this.inline()}](${r.pick(URLS)})`],
      [0.6 * x, () => `<${r.pick(URLS)}>`],
      [0.6 * x, () => r.pick(URLS)],
      [1.2, () => `**${r.pick(WORDS)} ${this.maybeInline()}**`],
      [1.2, () => `*${r.pick(WORDS)} ${this.maybeInline()}*`],
      [0.5, () => `_${r.pick(WORDS)}_`],
      [0.4, () => `~~${r.pick(WORDS)}~~`],
      [0.6, () => `${r.pick(WORDS)},`],
      [0.6, () => `(${r.pick(WORDS)})`],
      [0.3 * x, () => `${r.pick(WORDS)}\t${r.pick(WORDS)}`],
      [0.3, () => `${r.int(1, 99)}.`],
      [0.2 * x, () => '&amp;'],
      [0.2 * x, () => '<b>bold</b>'],
    ])
    return w()
  }

  maybeInline(): string {
    return this.rng.chance(0.5) ? this.inline() : this.rng.pick(WORDS)
  }

  /** Words and formulas; `math`: the chance of each extra formula. */
  sentence(words: number, math: number): string {
    const r = this.rng
    const out: string[] = []
    for (let i = 0; i < words; i++) out.push(r.chance(math / Math.max(1, words / 3)) ? this.inline() : this.word())
    let s = out.join(' ')
    if (r.chance(0.7)) s += r.pick(['.', '.', '.', ':', '?', '!', ';'])
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  paragraph(): string {
    const r = this.rng
    const lines: string[] = []
    const n = r.weighted([[5, 1], [3, 2], [2, 3], [1, 5]])
    for (let i = 0; i < n; i++) {
      let line = this.sentence(r.weighted([[3, r.int(2, 8)], [4, r.int(8, 25)], [1, r.int(25, 60)]]), 0.6)
      if (r.chance(0.05)) line += '  ' // a hard break
      else if (r.chance(0.05)) line += ' ' // a trailing space
      lines.push(line)
    }
    return lines.join('\n')
  }

  list(depth: number, ordered: boolean): string {
    const r = this.rng
    const marker = ordered ? r.pick(['1.', '1)']) : r.pick(['-', '-', '*', '+'])
    const loose = r.chance(0.25)
    const items: string[] = []
    const count = r.int(1, 6)
    const indent = ordered ? ' '.repeat(marker.length + 1) : '  '
    for (let i = 0; i < count; i++) {
      const lead = ordered ? `${marker === '1.' ? (r.chance(0.8) ? i + 1 : 1) : i + 1}${marker.slice(-1)} ` : `${marker} `
      let item = lead + this.sentence(r.int(1, 18), 0.6)
      if (r.chance(0.12)) item += '\n' + indent + this.sentence(r.int(2, 10), 0.4) // a lazy-free continuation line
      if (depth < 2 && r.chance(0.18)) item += '\n' + indentLines(this.list(depth + 1, r.chance(0.4)), indent)
      if (depth < 2 && r.chance(0.12)) item += '\n\n' + indentLines(this.display(''), indent) + (r.chance(0.5) ? '\n\n' + indent + this.sentence(r.int(2, 8), 0.4) : '')
      if (depth < 2 && r.chance(0.04)) item += '\n\n' + indentLines(this.code(), indent)
      items.push(item)
    }
    return items.join(loose ? '\n\n' : '\n')
  }

  quote(depth: number): string {
    const r = this.rng
    const parts: string[] = []
    const n = r.int(1, 3)
    for (let i = 0; i < n; i++) {
      const kind = r.weighted<string>([[6, 'p'], [2, 'list'], [2, 'display'], [depth < 2 ? 1.5 : 0, 'nested'], [0.5, 'heading']])
      if (kind === 'p') parts.push(this.paragraph())
      else if (kind === 'list') parts.push(this.list(1, r.chance(0.4)))
      else if (kind === 'display') parts.push(this.display(''))
      else if (kind === 'heading') parts.push(`### ${this.sentence(r.int(1, 5), 0.3)}`)
      else parts.push(this.quote(depth + 1))
    }
    const body = parts.join(r.chance(0.85) ? '\n\n' : '\n')
    const prefix = r.chance(0.9) ? '> ' : '>'
    return body
      .split('\n')
      .map(line => (line === '' ? (r.chance(0.9) ? '>' : '') : prefix + line))
      .join('\n')
  }

  cell(): string {
    const r = this.rng
    return r.weighted<() => string>([
      [6, () => r.pick(WORDS)],
      [3, () => `${r.pick(WORDS)} ${r.pick(WORDS)}`],
      [5, () => this.inline()],
      [1.5, () => `${r.pick(WORDS)} ${this.inline()}`],
      [1, () => r.pick(CODE_SPANS).replace('|', '\\|')],
      [1, () => `[${r.pick(WORDS)}](${r.pick(URLS)})`],
      [1, () => String(r.int(0, 100000))],
      [0.6, () => `$\\|x\\|$`],
      [0.6, () => `$|x|$`],
      [0.6, () => `$P(A \\mid B)$`],
      [0.5 * this.exotic, () => r.pick(LONG_WORDS)],
      [0.4 * this.exotic, () => r.pick(EMOJI_SINGLE)],
      [0.3 * this.exotic, () => r.pick(CJK)],
      [0.3, () => ''],
      [0.5, () => `**${r.pick(WORDS)}**`],
    ])()
  }

  table(): string {
    const r = this.rng
    const cols = r.weighted([[2, 2], [4, 3], [3, 4], [1, 6], [0.5, 9]])
    const rows = r.int(1, 6)
    const align = () => r.pick(['---', ':---', '---:', ':---:', '-', '--------'])
    const row = (cells: string[]) => (r.chance(0.9) ? `| ${cells.join(' | ')} |` : cells.join(' | '))
    const lines = [row(Array.from({ length: cols }, () => this.cell())), row(Array.from({ length: cols }, align))]
    for (let i = 0; i < rows; i++) lines.push(row(Array.from({ length: cols }, () => this.cell())))
    let out = lines.join('\n')
    if (r.chance(0.2)) out = this.sentence(r.int(2, 8), 0.4) + '\n' + out // a paragraph right above it
    return out
  }

  code(): string {
    const r = this.rng
    const lang = r.pick(['python', 'ts', 'bash', '', 'latex', 'text'])
    const body = r.pick([
      'x = np.linalg.solve(A, b)\nprint(f"cost: ${x:.2f}")',
      'echo $HOME\nexport PATH=$PATH:/usr/bin',
      '\\frac{a}{b} + $x$',
      'for i in range(10):\n    print(i ** 2)',
      'const total = items.reduce((a, b) => a + b, 0) // $5 per item',
      '| not | a table |\n|---|---|',
      'K = P @ H.T @ np.linalg.inv(H @ P @ H.T + R)',
      'x^2 + y^2 = r^2',
    ])
    // A ```math fence is display math (scan's fence delimiter).
    const fence = r.chance(0.9) ? '```' : '~~~'
    return `${fence}${lang}\n${body}\n${fence}`
  }

  display(indent: string): string {
    const r = this.rng
    const tex = r.chance(0.08) ? r.pick(BARE_ENVS) : r.pick(this.options.display ?? DISPLAY)
    const oneLine = tex.replace(/\s*\n\s*/g, ' ')
    const kind = r.weighted<string>([[14, '$$'], [3, '$$one'], [3, '\\['], [1, '\\[one'], [2, 'bare'], [1, 'fence'], [0.5, '$$text']])
    let block: string
    if (kind === '$$') block = `$$\n${tex}\n$$`
    else if (kind === '$$one') block = `$$${oneLine}$$`
    else if (kind === '\\[') block = `\\[\n${tex}\n\\]`
    else if (kind === '\\[one') block = `\\[${oneLine}\\]`
    else if (kind === 'fence') block = '```math\n' + tex + '\n```'
    else if (kind === '$$text') block = `$$\n${tex}\n$$ and then text`
    else block = /^\\begin\{/.test(tex) ? tex : `\\begin{aligned}\n${tex.replace(/=/, '&=')}\n\\end{aligned}`
    return indentLines(block, indent)
  }
}

function indentLines(text: string, indent: string): string {
  return text
    .split('\n')
    .map(line => (line === '' ? '' : indent + line))
    .join('\n')
}
