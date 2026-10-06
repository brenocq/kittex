// A small, strict XML reader for the MathML MathJax serializes: elements,
// attributes, text, character references and the five predefined entities.
// Anything malformed throws.

import { fail } from './box.js'

export interface Element {
  name: string
  attrs: Record<string, string>
  children: Node[]
}

export type Node = Element | string

const MAX_DEPTH = 200

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: '\u00a0' }

const NAME = /[A-Za-z_][-A-Za-z0-9_.:]*/y
const SPACE = /\s*/y

/** Parses one XML document whose root is an element. */
export function parseXml(source: string): Element {
  let pos = 0

  const skipSpace = () => {
    SPACE.lastIndex = pos
    SPACE.exec(source)
    pos = SPACE.lastIndex
  }

  const readName = (): string => {
    NAME.lastIndex = pos
    const match = NAME.exec(source)
    if (!match) fail(`XML: name expected at ${pos}`)
    pos = NAME.lastIndex
    // Namespace prefixes (m:mi) are dropped; MathML has no clashing names.
    const colon = match[0].lastIndexOf(':')
    return colon >= 0 ? match[0].slice(colon + 1) : match[0]
  }

  const decode = (raw: string): string =>
    raw.indexOf('&') < 0
      ? raw
      : raw.replace(/&([#\w]*)(;?)/g, (_whole, ref: string, semi: string) => {
          if (!semi) fail('XML: unterminated reference')
          if (ref.startsWith('#')) {
            const code = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10)
            if (!/^#(x[0-9a-fA-F]+|X[0-9a-fA-F]+|[0-9]+)$/.test(ref) || !(code >= 0 && code <= 0x10ffff)) fail(`XML: bad reference &${ref};`)
            return String.fromCodePoint(code)
          }
          const value = ENTITIES[ref]
          return value ?? fail(`XML: unknown entity &${ref};`)
        })

  const skipMisc = () => {
    for (;;) {
      skipSpace()
      if (source.startsWith('<?', pos)) {
        const end = source.indexOf('?>', pos)
        if (end < 0) fail('XML: unterminated processing instruction')
        pos = end + 2
      } else if (source.startsWith('<!--', pos)) {
        const end = source.indexOf('-->', pos)
        if (end < 0) fail('XML: unterminated comment')
        pos = end + 3
      } else if (source.startsWith('<!DOCTYPE', pos)) {
        const end = source.indexOf('>', pos)
        if (end < 0) fail('XML: unterminated doctype')
        pos = end + 1
      } else return
    }
  }

  const readElement = (depth: number): Element => {
    if (depth > MAX_DEPTH) fail('XML: too deep')
    if (source[pos] !== '<') fail(`XML: element expected at ${pos}`)
    pos++
    const name = readName()
    const attrs: Record<string, string> = {}
    for (;;) {
      skipSpace()
      const ch = source[pos]
      if (ch === '/' && source[pos + 1] === '>') {
        pos += 2
        return { name, attrs, children: [] }
      }
      if (ch === '>') {
        pos++
        break
      }
      const key = readName()
      skipSpace()
      if (source[pos] !== '=') fail('XML: = expected')
      pos++
      skipSpace()
      const quote = source[pos]
      if (quote !== '"' && quote !== "'") fail('XML: quoted value expected')
      const end = source.indexOf(quote, pos + 1)
      if (end < 0) fail('XML: unterminated attribute')
      const raw = source.slice(pos + 1, end)
      if (raw.includes('<')) fail('XML: < in attribute')
      if (key in attrs) fail(`XML: duplicate attribute ${key}`)
      attrs[key] = decode(raw)
      pos = end + 1
    }
    const children: Node[] = []
    for (;;) {
      if (pos >= source.length) fail(`XML: unclosed <${name}>`)
      if (source.startsWith('</', pos)) {
        pos += 2
        const close = readName()
        if (close !== name) fail(`XML: </${close}> closes <${name}>`)
        skipSpace()
        if (source[pos] !== '>') fail('XML: > expected')
        pos++
        return { name, attrs, children }
      }
      if (source.startsWith('<!--', pos)) {
        const end = source.indexOf('-->', pos)
        if (end < 0) fail('XML: unterminated comment')
        pos = end + 3
      } else if (source.startsWith('<![CDATA[', pos)) {
        const end = source.indexOf(']]>', pos)
        if (end < 0) fail('XML: unterminated CDATA')
        pushText(children, source.slice(pos + 9, end))
        pos = end + 3
      } else if (source[pos] === '<') {
        children.push(readElement(depth + 1))
      } else {
        let end = source.indexOf('<', pos)
        if (end < 0) end = source.length
        pushText(children, decode(source.slice(pos, end)))
        pos = end
      }
    }
  }

  skipMisc()
  const root = readElement(0)
  skipMisc()
  if (pos !== source.length) fail('XML: content after the root element')
  return root
}

function pushText(children: Node[], text: string): void {
  if (text === '') return
  const last = children.length - 1
  if (typeof children[last] === 'string') children[last] += text
  else children.push(text)
}

/** The element children, ignoring whitespace between them; text there throws. */
export function elements(el: Element): Element[] {
  const out: Element[] = []
  for (const child of el.children) {
    if (typeof child !== 'string') out.push(child)
    else if (/[^ \t\r\n]/.test(child)) fail(`text inside <${el.name}>`)
  }
  return out
}

/** A token element's text, trimmed and with whitespace runs collapsed as MathML says. */
export function tokenText(el: Element): string {
  let text = ''
  for (const child of el.children) {
    if (typeof child === 'string') text += child
    else if (child.name === 'mglyph' || child.name === 'malignmark') fail(`<${child.name}>`)
    else fail(`<${child.name}> inside <${el.name}>`)
  }
  return text.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '').replace(/[ \t\r\n]+/g, ' ')
}
