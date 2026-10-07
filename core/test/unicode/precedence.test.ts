import { describe, expect, test } from 'vitest'
import { toUnicode } from '../../src/unicode/index.js'
import { OVER_ACCENTS, styleText, SUBSCRIPTS, SUPERSCRIPTS, UNDER_ACCENTS, VULGAR } from '../../src/unicode/chars.js'
import { operatorClass } from '../../src/unicode/classes.js'
import { type Element, elements, parseXml, tokenText } from '../../src/unicode/xml.js'
import { FUZZ_DISPLAY } from '../fuzz/corpus.js'
import { INLINE } from '../../../plugin/tests/fuzz/formulas.ts'
import { CORPUS } from './corpus.js'
import { mathml } from './mathml.js'

// The one-line Unicode forms (inline, tight, compact) read back with the
// precedence a reader gives them, against the MathML they were made from:
// every fraction's numerator and denominator, every radicand and every script
// must hold the same symbols in both. A form that drops a grouping, as
// a^(p−1/2) did for a^{\frac{p-1}{2}}, reads as a different fraction.
//
// The reading: a slash takes the juxtaposed run on its left (2x/3, f(x)/2)
// and one factor on its right (a/b, with a call g(x), a differential dx or a
// factorial n!; anything juxtaposed after that is ambiguous and fails); a
// root takes a parenthesized group or the run after it; `_` and `^` take a
// parenthesized group, a word of letters and digits, or one character; a
// run of script characters is one script (a bar or comma between two of
// them included). Symbols are compared as written, without brackets, bars,
// spaces, primes and other marks that only sit beside a script.

// ─── the Unicode side ────────────────────────────────────────────────────────

interface Node {
  kind: 'frac' | 'root' | 'sub' | 'sup'
  parts: string[]
}

const SELF = new Set(['′', '″', '‴', '⁗', '*', '∗', '†', '‡', '°', ',', '.', ';', ':', ' '])
const SUP_CHARS = new Set([...SUPERSCRIPTS.values()].filter(c => !SELF.has(c)))
const SUB_CHARS = new Set([...SUBSCRIPTS.values()].filter(c => !SELF.has(c)))
const OPENS = new Set(['(', '[', '{', '⟨', '⌊', '⌈', '⟦', '⦃', '⟮'])
const CLOSES = new Set([')', ']', '}', '⟩', '⌋', '⌉', '⟧', '⦄', '⟯'])
const BARS = new Set(['|', '‖'])
const ROOTS = new Set(['√', '∛', '∜'])
const DIFFERENTIALS = new Set(['d', '∂', 'δ', 'Δ', '∇', 'D'])
const SCRIPT_NEUTRAL = new Set([',', '.', ';', ':', '|', ' '])
/** Marks that sit beside a letter as part of it (f′, a*, A†). */
const PRIMES = new Set(['′', '″', '‴', '⁗', '*', '∗', '†', '‡', '°'])
const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '⟨': '⟩', '⌊': '⌋', '⌈': '⌉', '⟦': '⟧', '⦃': '⦄', '⟮': '⟯' }

type Kind = 'sup' | 'sub' | 'mark' | 'slash' | 'root' | 'open' | 'close' | 'bar' | 'space' | 'op' | 'bigop' | 'num' | 'atom' | 'prime'

interface Token {
  text: string
  kind: Kind
}

function classify(cluster: string): Kind {
  const ch = [...cluster][0]!
  if (SUP_CHARS.has(ch)) return 'sup'
  if (SUB_CHARS.has(ch)) return 'sub'
  if (ch === '_' || ch === '^') return 'mark'
  if (ch === '/') return 'slash'
  if (ROOTS.has(ch)) return 'root'
  if (OPENS.has(ch)) return 'open'
  if (CLOSES.has(ch)) return 'close'
  if (BARS.has(ch)) return 'bar'
  if (/\s/u.test(ch)) return 'space'
  if (/[\p{N}.]/u.test(ch) && !/[\p{No}]/u.test(ch)) return 'num'
  if (ch === '!' || PRIMES.has(ch)) return 'prime'
  if (/[\p{L}\p{N}]/u.test(ch)) return 'atom'
  if (operatorClass(ch, 'prefix') === 'OP') return 'bigop'
  const cls = operatorClass(ch, 'infix')
  return cls === 'BIN' || cls === 'REL' || cls === 'PUNCT' || cls === 'INNER' ? 'op' : 'atom'
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  for (const m of text.matchAll(/\P{M}\p{M}*/gu)) {
    const cluster = m[0]
    const kind = classify(cluster)
    const last = tokens.at(-1)
    // A number is one factor: 1/23 is 1 over 23.
    if (kind === 'num' && last?.kind === 'num') last.text += cluster
    else tokens.push({ text: cluster, kind })
  }
  return tokens
}

interface Factor {
  leaves: string
  /** A large operator (∑, ∫): a run of factors stops at it. */
  bigop?: boolean
  /** A single letter, digit run or symbol, which may head a call (g(x)) or a differential (dx). */
  atom?: string
  group?: boolean
}

type Piece = { factor: Factor } | { sep: string } | { slash: true }

class Reader {
  nodes: Node[] = []
  problems: string[] = []
  private i = 0
  /** The brackets open around the sequence being read, innermost last. */
  private opened: string[] = []
  constructor(private readonly tokens: Token[]) {}

  readAll(): string {
    const leaves = this.sequence(false)
    if (this.i < this.tokens.length) this.problems.push(`unread from ${this.i}`)
    return leaves
  }

  private peek(k = 0): Token | undefined {
    return this.tokens[this.i + k]
  }

  /**
   * A sequence up to the close of the bracket it is in, or the bar that
   * closes it (`inBar`), or the end. A close that matches no open bracket
   * ([0, 1)) closes the innermost one; at the top it is read as a symbol.
   */
  private sequence(inBar: boolean): string {
    const pieces: Piece[] = []
    for (;;) {
      const t = this.peek()
      if (!t) break
      if (t.kind === 'close') {
        if (this.opened.length > 0) break
        this.i++
        pieces.push({ sep: t.text })
        continue
      }
      if (t.kind === 'bar') {
        const prev = pieces.at(-1)
        const afterFactor = prev !== undefined && 'factor' in prev && !prev.factor.bigop
        if (inBar && afterFactor) break
        this.i++
        if (!afterFactor) {
          // |x|, |ψ⟩ (closed by its angle).
          const inner = this.sequence(true)
          const end = this.peek()
          if (end?.kind === 'bar' || (end?.kind === 'close' && end.text === '⟩')) this.i++
          pieces.push({ factor: this.scripts({ leaves: inner, group: true }) })
        } else {
          pieces.push({ sep: t.text })
        }
        continue
      }
      if (t.kind === 'space' || t.kind === 'op') {
        this.i++
        pieces.push({ sep: t.text })
        continue
      }
      if (t.kind === 'slash') {
        this.i++
        pieces.push({ slash: true })
        continue
      }
      const factor = this.factor()
      if (!factor) {
        this.problems.push(`stray ${t.kind} '${t.text}'`)
        this.i++
        continue
      }
      pieces.push({ factor })
    }
    return this.resolve(pieces)
  }

  /** A bracketed group: its sequence and its close (the matching one, or a stray one no outer bracket takes). */
  private bracket(): string {
    const open = this.tokens[this.i++]!.text
    this.opened.push(open)
    const inner = this.sequence(false)
    this.opened.pop()
    const close = this.peek()
    if (close?.kind === 'close' && (PAIRS[open] === close.text || !this.opened.some(o => PAIRS[o] === close.text))) this.i++
    return inner
  }

  /** Slashes: the run of factors before, one factor (a call, differential, factorial) after. */
  private resolve(pieces: Piece[]): string {
    const out: Piece[] = []
    for (let k = 0; k < pieces.length; k++) {
      const p = pieces[k]!
      if (!('slash' in p)) {
        out.push(p)
        continue
      }
      const run: Factor[] = []
      while (out.length > 0) {
        const last = out.at(-1)!
        if (!('factor' in last) || last.factor.bigop) break
        run.unshift(last.factor)
        out.pop()
      }
      const next = pieces[k + 1]
      if (!next || !('factor' in next)) {
        this.problems.push('slash without a denominator')
        continue
      }
      const den: Factor[] = [next.factor]
      k++
      const after = () => pieces[k + 1]
      let head = next.factor.atom
      // A function's name (Var(X)): its letters, then its argument.
      while (head !== undefined && /^\p{L}+$/u.test(head) && den.length === 1) {
        const c = after()
        if (!c || !('factor' in c) || c.factor.atom === undefined || !/^\p{L}$/u.test(c.factor.atom) || c.factor.leaves !== c.factor.atom) break
        const g = pieces.slice(k + 2).find(q => !('factor' in q) || q.factor.atom === undefined || !/^\p{L}$/u.test(q.factor.atom))
        if (!g || !('factor' in g) || !g.factor.group) break
        head += c.factor.atom
        next.factor.leaves += c.factor.leaves
        k++
      }
      const a = after()
      if (head !== undefined && a && 'factor' in a && a.factor.group && /^\p{L}+$/u.test(head)) {
        den.push(a.factor)
        k++
      } else if (head !== undefined && DIFFERENTIALS.has(head) && a && 'factor' in a && a.factor.atom !== undefined) {
        den.push(a.factor)
        k++
      }
      const b = after()
      if (b && 'factor' in b) this.problems.push(`ambiguous denominator: '${den.map(f => f.leaves).join('')}' then '${b.factor.leaves}'`)
      if (run.length === 0) this.problems.push('slash without a numerator')
      const num = run.map(f => f.leaves).join('')
      const d = den.map(f => f.leaves).join('')
      this.nodes.push({ kind: 'frac', parts: [num, d] })
      out.push({ factor: { leaves: num + d } })
    }
    return out.map(p => ('factor' in p ? p.factor.leaves : 'sep' in p ? p.sep : '')).join('')
  }

  private factor(): Factor | undefined {
    const t = this.peek()
    if (!t) return undefined
    if (t.kind === 'open') return this.scripts({ leaves: this.bracket(), group: true })
    if (t.kind === 'sup' && this.rootAfterRun()) {
      // A root's index: ⁿ√x.
      let index = ''
      while (this.peek()?.kind === 'sup') index += this.tokens[this.i++]!.text
      return this.root(index)
    }
    if (t.kind === 'root') return this.root('')
    if (t.kind === 'prime') {
      // A mark on its own (f ∗ g, a lone †) is a symbol.
      this.i++
      return this.scripts({ leaves: t.text, atom: t.text })
    }
    if (t.kind === 'atom' || t.kind === 'num' || t.kind === 'bigop') {
      this.i++
      return this.scripts({ leaves: t.text, atom: t.text, bigop: t.kind === 'bigop' })
    }
    // Scripts on nothing ({}^{a}).
    if (t.kind === 'sup' || t.kind === 'sub' || t.kind === 'mark') return this.scripts({ leaves: '' })
    return undefined
  }

  private rootAfterRun(): boolean {
    let k = 0
    while (this.peek(k)?.kind === 'sup') k++
    return k > 0 && this.peek(k)?.kind === 'root'
  }

  private root(index: string): Factor {
    const sign = this.tokens[this.i++]!.text
    let radicand = ''
    if (this.peek()?.kind === 'open') {
      radicand = this.bracket()
    } else {
      // The juxtaposed run after it: √2x is the root of 2x.
      while (this.peek() && ['atom', 'num', 'open', 'root', 'sup', 'sub', 'mark'].includes(this.peek()!.kind)) {
        const f = this.factor()
        if (!f) break
        radicand += f.leaves
      }
    }
    this.nodes.push({ kind: 'root', parts: [radicand] })
    return this.scripts({ leaves: index + sign + radicand })
  }

  /** Scripts after a factor: runs of script characters, `_x`, `_word`, `_(…)`. */
  private scripts(base: Factor): Factor {
    let leaves = base.leaves
    for (;;) {
      const t = this.peek()
      if (!t) break
      if ((t.kind === 'sup' || t.kind === 'sub') && !(t.kind === 'sup' && this.rootAfterRun())) {
        const kind = t.kind
        let run = ''
        for (let c = this.peek(); c; c = this.peek()) {
          const neutral = SCRIPT_NEUTRAL.has(c.text) && run !== '' && this.peek(1)?.kind === kind
          if (c.kind !== kind && !neutral) break
          run += c.text
          this.i++
        }
        this.nodes.push({ kind, parts: [run] })
        leaves += run
        continue
      }
      if (t.kind === 'prime') {
        // f′, n!: part of what they follow.
        leaves += t.text
        this.i++
        continue
      }
      if (t.kind === 'mark') {
        this.i++
        const kind = t.text === '_' ? 'sub' : 'sup'
        const next = this.peek()
        if (!next) {
          this.problems.push('mark at the end')
          break
        }
        let content = ''
        if (next.kind === 'open') {
          content = this.bracket()
        } else {
          // A word: letters and digits up to anything else; or one character.
          const wordy = (k: Token | undefined) => k !== undefined && (k.kind === 'num' || (k.kind === 'atom' && /^[\p{L}\p{N}]/u.test(k.text)))
          while (wordy(this.peek())) content += this.tokens[this.i++]!.text
          if (content === '') content = this.tokens[this.i++]!.text
        }
        this.nodes.push({ kind, parts: [content] })
        leaves += content
        continue
      }
      break
    }
    return { ...base, leaves }
  }
}

export function readUnicode(text: string): { nodes: Node[]; problems: string[] } {
  const reader = new Reader(tokenize(text))
  reader.readAll()
  return { nodes: reader.nodes, problems: reader.problems }
}

// ─── the MathML side ─────────────────────────────────────────────────────────

class Skip extends Error {}

const INVISIBLE = /[\u2061-\u2064\u200b]/gu

function mathmlNodes(root: Element): Node[] {
  const nodes: Node[] = []
  const walk = (el: Element): string => {
    switch (el.name) {
      case 'mi':
      case 'mn':
      case 'mo':
      case 'mtext': {
        const text = tokenText(el)
        // Math written in script characters (x², from a model that wrote Unicode) has no scripts to compare.
        if ([...text].some(c => SUP_CHARS.has(c) || SUB_CHARS.has(c))) throw new Skip('script characters')
        return styleText(text, el.attrs.mathvariant).replace(INVISIBLE, '')
      }
      case 'ms':
        return tokenText(el)
      case 'mspace':
      case 'mphantom':
      case 'none':
        return ''
      case 'semantics': {
        const first = elements(el)[0]
        return first ? walk(first) : ''
      }
      case 'maction': {
        const kids = elements(el)
        const chosen = kids[parseInt(el.attrs.selection ?? '1', 10) - 1]
        return chosen ? walk(chosen) : ''
      }
      case 'mrow': {
        const kids = elements(el)
        const frac = kids[1]
        const fence = (e: Element | undefined, ch: string) => e?.name === 'mo' && tokenText(e) === ch
        if (kids.length === 3 && fence(kids[0], '(') && fence(kids[2], ')') && frac?.name === 'mfrac' && noBar(frac)) {
          const [n, k] = elements(frac)
          return 'C' + walk(n!) + walk(k!)
        }
        return kids.map(walk).join('')
      }
      case 'math':
      case 'mstyle':
      case 'mpadded':
      case 'menclose':
        return elements(el).map(walk).join('')
      case 'mfrac': {
        const [n, d] = elements(el) as [Element, Element]
        const num = walk(n)
        const den = walk(d)
        if (noBar(el)) return num + den
        const vulgar = VULGAR.get(`${numeral(n)}/${numeral(d)}`)
        if (vulgar) return vulgar
        nodes.push({ kind: 'frac', parts: [num, den] })
        return num + den
      }
      case 'msqrt': {
        const r = elements(el).map(walk).join('')
        nodes.push({ kind: 'root', parts: [r] })
        return '√' + r
      }
      case 'mroot': {
        const [base, index] = elements(el) as [Element, Element]
        const r = walk(base)
        const i = walk(index)
        nodes.push({ kind: 'root', parts: [r] })
        return (i === '3' ? '∛' : i === '4' ? '∜' : i + '√') + r
      }
      case 'msub':
      case 'msup':
      case 'msubsup':
      case 'munder':
      case 'mover':
      case 'munderover': {
        const kids = elements(el)
        const base = walk(kids[0]!)
        const under = el.name === 'msub' || el.name === 'msubsup' || el.name === 'munder' || el.name === 'munderover' ? kids[1] : undefined
        const over = el.name === 'msup' ? kids[1] : el.name === 'msubsup' || el.name === 'munderover' ? kids[2] : el.name === 'mover' ? kids[1] : undefined
        if (el.name === 'munder' || el.name === 'mover') {
          const mark = (under ?? over)!
          const table = el.name === 'mover' ? OVER_ACCENTS : UNDER_ACCENTS
          if (mark.name === 'mo' && table.has(tokenText(mark)) && el.attrs[el.name === 'mover' ? 'accent' : 'accentunder'] !== 'false' && mark.attrs.accent !== 'false') return base
        }
        let leaves = base
        for (const [kind, script] of [['sub', under], ['sup', over]] as const) {
          if (!script) continue
          const text = walk(script)
          nodes.push({ kind, parts: [text] })
          leaves += text
        }
        return leaves
      }
    }
    throw new Skip(el.name)
  }
  walk(root)
  return nodes
}

function noBar(el: Element): boolean {
  return /^0+(\.0*)?([a-z]+)?$/.test(el.attrs.linethickness ?? '')
}

function numeral(el: Element): string {
  if (el.name === 'mn') return tokenText(el)
  if (el.name === 'mrow' || el.name === 'mstyle') {
    const kids = elements(el)
    return kids.length === 1 ? numeral(kids[0]!) : ''
  }
  return ''
}

// ─── comparing ───────────────────────────────────────────────────────────────

const FIXES: Record<string, string> = { '-': '−', ϵ: 'ε', ϕ: 'φ', '⊤': 'T', '⊺': 'T', ɑ: 'α', ɛ: 'ε', ɩ: 'ι', ɸ: 'φ', '∣': '|', '∘': '°', '∗': '*' }

/** The symbols of a part as they read: script characters as their letters, without brackets, bars, spaces, marks and primes. */
function symbols(text: string, numerator = false): string {
  let s = ''
  for (const ch of text.normalize('NFKD')) s += FIXES[ch] ?? ch
  s = s.replace(/[\p{M}\s()[\]{}⟨⟩⌊⌋⌈⌉⟦⟧|‖_^,;.!′″‴⁗*†‡°\u2061-\u2064]/gu, '').replace(/'/g, '')
  return numerator ? s.replace(/^[−+±∓]/u, '') : s
}

function signature(node: Node): string {
  return `${node.kind}:${node.parts.map((p, i) => symbols(p, node.kind === 'frac' && i === 0)).join('|')}`
}

function signatures(nodes: readonly Node[]): string[] {
  return nodes
    .map(signature)
    .filter(s => !/^(sub|sup):$/.test(s))
    .sort()
}

const FORMS = {
  tight: (tex: string) => toUnicode(mathml(tex, false), { display: false, tight: true }),
  inline: (tex: string) => toUnicode(mathml(tex, false), { display: false }),
  compact: (tex: string) => toUnicode(mathml(tex, true), { display: true, compact: true }),
} as const

interface Check {
  tex: string
  form: string
  text: string
  problem: string
}

/** Every one-line form of `tex` that reads differently from its MathML (null: nothing to check). */
function check(source: string): { checked: number; failures: Check[] } {
  // A slash the author wrote binds as the author meant: read it as ÷ so the slashes left are fractions'.
  const tex = source.replace(/(?<!\\)\//g, '\\div ')
  // A literal underscore or caret reads as a script whatever is done.
  if (/\\[_^]/.test(tex)) return { checked: 0, failures: [] }
  let expected: string[]
  try {
    const root = parseXml(mathml(tex, false))
    expected = signatures(mathmlNodes(root))
  } catch (error) {
    if (error instanceof Skip) return { checked: 0, failures: [] }
    return { checked: 0, failures: [] }
  }
  let checked = 0
  const failures: Check[] = []
  for (const [form, render] of Object.entries(FORMS)) {
    let result
    try {
      result = render(tex)
    } catch {
      continue
    }
    if (!result || result.lines.length !== 1) continue
    const text = result.lines[0]!.trim()
    checked++
    const read = readUnicode(text)
    const got = signatures(read.nodes)
    if (read.problems.length > 0) failures.push({ tex: source, form, text, problem: read.problems.join('; ') })
    else if (got.join('\n') !== expected.join('\n')) {
      const missing = expected.filter(s => !got.includes(s))
      const extra = got.filter(s => !expected.includes(s))
      failures.push({ tex: source, form, text, problem: `reads ${extra.join(', ') || '(nothing more)'} for ${missing.join(', ') || '(nothing less)'}` })
    }
  }
  return { checked, failures }
}

/** Seeded nestings of fractions, roots and scripts around sums, products, signs and calls. */
function nestings(count: number): string[] {
  let seed = 4242
  const rand = (n: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed % n
  }
  const leaf = () => ['x', 'a', 'b', '2', 'n', '\\pi', 'k', '1', 'y_i', 'e', '\\alpha', 'n!', "f'(x)", 'x_{ab}', '\\hat{x}_{k|k-1}', 'x_y'][rand(16)]!
  const gen = (depth: number): string => {
    const parts: string[] = []
    for (let i = 1 + rand(3); i > 0; i--) {
      const pick = depth > 0 ? rand(12) : 11
      if (i < 3 && parts.length > 0) parts.push(['+', '-', '', '', '\\cdot ', '=', ','][rand(7)]!)
      if (pick === 0) parts.push(`\\frac{${gen(depth - 1)}}{${gen(depth - 1)}}`)
      else if (pick === 1) parts.push(`${leaf()}^{${gen(depth - 1)}}`)
      else if (pick === 2) parts.push(`${leaf()}_{${gen(depth - 1)}}`)
      else if (pick === 3) parts.push(`\\sqrt{${gen(depth - 1)}}`)
      else if (pick === 4) parts.push(`(${gen(depth - 1)})`)
      else if (pick === 5) parts.push(`\\sin ${gen(depth - 1)}`)
      else if (pick === 6) parts.push(`f(${gen(depth - 1)})`)
      else if (pick === 7) parts.push(`{${gen(depth - 1)} \\over ${gen(depth - 1)}}`)
      else if (pick === 8) parts.push(`\\sum_{${gen(depth - 1)}} ${leaf()}`)
      else if (pick === 9) parts.push(`\\tfrac{${gen(depth - 1)}}{${leaf()}}`)
      else if (pick === 10) parts.push(`\\sqrt[3]{${gen(depth - 1)}}`)
      else parts.push(leaf())
    }
    return parts.join(' ')
  }
  return Array.from({ length: count }, () => gen(3))
}

describe('one-line Unicode keeps the precedence of its MathML', () => {
  test('the reading itself', () => {
    const read = (text: string) => signatures(readUnicode(text).nodes)
    expect(read('a^(p−1/2)')).toEqual(['frac:1|2', 'sup:p−12'])
    expect(read('a^((p−1)/2)')).toEqual(['frac:p−1|2', 'sup:p−12'])
    expect(read('2x/3 + f(x)/g(y)')).toEqual(['frac:2x|3', 'frac:fx|gy'])
    expect(read('√2x')).toEqual(['root:2x'])
    expect(read('x̂ₖ|ₖ₋₁')).toEqual(['sub:kk−1'])
    expect(read('π_ref x')).toEqual(['sub:ref'])
    expect(readUnicode('1/2x').problems).not.toEqual([])
  })

  test('FUZZ-13: a fraction keeps its numerator in scripts, under roots and in tight forms', () => {
    for (const tex of [String.raw`a^{\frac{p-1}{2}}`, String.raw`e^{\frac{a+b}{c}}`, String.raw`(-1)^{\frac{p-1}{2}}`, String.raw`\sqrt{\frac{a+b}{2}}`, String.raw`{a+b \over c}`]) {
      expect(check(tex).failures).toEqual([])
    }
    expect(FORMS.tight(String.raw`a^{\frac{p-1}{2}}`)?.lines).toEqual(['a^((p−1)/2)'])
    expect(FORMS.tight(String.raw`\frac{a+b}{c}`)?.lines).toEqual(['(a+b)/c'])
    expect(FORMS.tight(String.raw`\sqrt{x}^2`)?.lines).toEqual(['(√x)²'])
    expect(FORMS.tight(String.raw`\sqrt{2}x`)?.lines).toEqual(['√2 x'])
    expect(FORMS.tight(String.raw`x_y z`)?.lines).toEqual(['x_y z'])
    expect(FORMS.tight(String.raw`D_{KL}(p \| q)`)?.lines).toEqual(['D_KL (p‖q)'])
    expect(FORMS.tight(String.raw`\frac{n(n+1)}{2}`)?.lines).toEqual(['n(n+1)/2'])
    expect(FORMS.tight(String.raw`\frac{x}{2}!`)?.lines).toEqual(['(x/2)!'])
    expect(FORMS.inline(String.raw`\log_2\frac{a+b}{c}`)?.lines).toEqual(['log₂((a + b)/c)'])
  })

  test('over the corpora: the stress and fuzz formulas, the inline pool, the renderer corpus and random nestings', { timeout: 60_000 }, () => {
    const pool = [...new Set([...FUZZ_DISPLAY, ...Object.values(INLINE).flat(), ...CORPUS, ...nestings(1500)])]
    let checked = 0
    let formulas = 0
    const failures: Check[] = []
    for (const tex of pool) {
      const result = check(tex)
      checked += result.checked
      if (result.checked > 0) formulas++
      failures.push(...result.failures)
    }
    // Most of the pool is read (tables, multiscripts and what Unicode can't write are left out).
    expect(formulas).toBeGreaterThan(pool.length / 2)
    expect(checked).toBeGreaterThan(1500)
    expect(failures.map(f => `${f.form}: ${f.tex}\n    ${f.text}\n    ${f.problem}`)).toEqual([])
  })
})
