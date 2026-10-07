// A small XML reader for the SVG dvisvgm writes: elements, attributes, text
// (dropped: an SVG drawn with --no-fonts holds none that draws), comments,
// processing instructions, a doctype, CDATA, character references and the
// predefined entities. Bounded in depth and size, and malformed input throws:
// the SVG comes from a TeX run over the model's source, so it is read as
// untrusted.

export interface XmlElement {
  name: string
  attrs: Record<string, string>
  children: XmlElement[]
}

/** Elements nested deeper than this are refused (dvisvgm nests a group per TikZ scope, and per pgfplots patch). */
const MAX_DEPTH = 20_000
/** Elements in one document, at most. */
const MAX_ELEMENTS = 200_000

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }

const NAME = /[A-Za-z_:][-A-Za-z0-9_.:]*/y
const SPACE = /[ \t\r\n]*/y

export class XmlError extends Error {}

/** Parses one XML document whose root is an element. Throws XmlError. */
export function parseXml(source: string): XmlElement {
  let pos = 0
  let count = 0

  const fail = (what: string): never => {
    throw new XmlError(`XML: ${what} at ${pos}`)
  }
  const skipSpace = () => {
    SPACE.lastIndex = pos
    SPACE.exec(source)
    pos = SPACE.lastIndex
  }
  const readName = (): string => {
    NAME.lastIndex = pos
    const match = NAME.exec(source)
    if (!match) fail('name expected')
    pos = NAME.lastIndex
    return match![0]
  }
  const skipPast = (end: string) => {
    const at = source.indexOf(end, pos)
    if (at < 0) fail(`unclosed ${end}`)
    pos = at + end.length
  }
  /** Comments, processing instructions, doctypes and CDATA sections, which hold nothing drawn. */
  const skipMarkup = (): boolean => {
    if (source.startsWith('<!--', pos)) skipPast('-->')
    else if (source.startsWith('<?', pos)) skipPast('?>')
    else if (source.startsWith('<![CDATA[', pos)) skipPast(']]>')
    else if (source.startsWith('<!', pos)) skipPast('>')
    else return false
    return true
  }

  /** An open tag at `pos` read up to its `>`: the element, and whether it closed itself (`/>`). */
  const openTag = (): { el: XmlElement; closed: boolean } => {
    if (++count > MAX_ELEMENTS) fail('too many elements')
    pos++ // <
    const name = readName()
    const attrs: Record<string, string> = Object.create(null) as Record<string, string>
    for (;;) {
      skipSpace()
      const c = source[pos]
      if (c === '/' && source[pos + 1] === '>') {
        pos += 2
        return { el: { name, attrs, children: [] }, closed: true }
      }
      if (c === '>') {
        pos++
        return { el: { name, attrs, children: [] }, closed: false }
      }
      if (c === undefined) fail('unclosed tag')
      const key = readName()
      skipSpace()
      if (source[pos] !== '=') fail('= expected')
      pos++
      skipSpace()
      const quote = source[pos]
      if (quote !== '"' && quote !== "'") fail('quote expected')
      const end = source.indexOf(quote!, pos + 1)
      if (end < 0) fail('unclosed attribute')
      attrs[key] = decode(source.slice(pos + 1, end))
      pos = end + 1
    }
  }

  /** An element and everything in it, with a stack of the open ones (dvisvgm nests a group per pgfplots patch: thousands deep). */
  const element = (): XmlElement => {
    const first = openTag()
    if (first.closed) return first.el
    const open: XmlElement[] = [first.el]
    for (;;) {
      const lt = source.indexOf('<', pos)
      const top = open[open.length - 1]!
      if (lt < 0) fail(`unclosed <${top.name}>`)
      pos = lt
      if (skipMarkup()) continue
      if (source[pos + 1] === '/') {
        pos += 2
        const closing = readName()
        if (closing !== top.name) fail(`</${closing}> closes <${top.name}>`)
        skipSpace()
        if (source[pos] !== '>') fail('> expected')
        pos++
        open.pop()
        if (open.length === 0) return top
        continue
      }
      const child = openTag()
      top.children.push(child.el)
      if (child.closed) continue
      if (open.length >= MAX_DEPTH) fail('nested too deep')
      open.push(child.el)
    }
  }

  for (;;) {
    skipSpace()
    if (pos >= source.length) fail('no root element')
    if (source[pos] !== '<') fail('< expected')
    if (skipMarkup()) continue
    const root = element()
    return root
  }
}

/** An attribute value with its character references and entities resolved. */
function decode(value: string): string {
  if (!value.includes('&')) return value
  return value.replace(/&(#x[0-9A-Fa-f]{1,6}|#[0-9]{1,7}|[A-Za-z]+);/g, (whole, ref: string) => {
    if (ref[0] === '#') {
      const code = ref[1] === 'x' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
    }
    return ENTITIES[ref] ?? whole
  })
}
