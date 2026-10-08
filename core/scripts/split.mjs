// Cuts one bundled ES module into a chain of small modules, for the engine's
// load-time scan. Claude Code parses every file of a mod (acorn, with node
// locations) and indexes every node on its main thread, one import level at a
// time with no pause inside a level; the cost follows the number of AST nodes,
// not bytes. A bundle whose parts all sit one import away from the entry is
// one long stall that holds up the prompt box. Here each part imports only the
// part before it (`export *` passes the earlier names on), so every part is a
// level of its own and the engine reads files (and yields) between them.
//
// The cuts keep the bundle's meaning: a part never refers to a name a later
// part declares (that would need a cyclic import, which reorders evaluation)
// and never assigns a name an earlier part declares (imports are read-only),
// so evaluation order and every binding stay as in the one module. Large
// literal tables (font metrics and glyph paths) also become JSON.parse of
// their JSON text, laid out one entry per line: the same value, a single node
// to scan. The text of a large table is a top-level constant of its own, in
// pieces, so no part needs to hold more than its share of bytes.
//
// The parts are written for a reader too (the plugin directory reviews them):
// each statement keeps the comment esbuild put above it (the source file it
// came from), and every character a reader cannot see in a string, template,
// regular expression or comment is written as an escape (escapeHidden).
import { parse } from 'acorn'

/** The object through which a part reads a name a later part declares. */
const LATE = '__kittexLate'

/** Literal objects and arrays with at least this many nodes become JSON.parse(`…`). */
const JSON_MIN_NODES = 64
/** A table whose JSON text is longer than this becomes top-level constants (JSON_PIECE characters each, cut at line ends). */
const JSON_HOIST = 16 * 1024
const JSON_PIECE = 64 * 1024
/** The names of those constants: `${JSON_NAME}<n>`. */
const JSON_NAME = '__kittexJson'

/**
 * Splits `code` (one ES module, no imports, ending with an `export { … }`
 * list) into parts of about `budget` AST nodes (and at most `maxBytes`
 * bytes where a cut allows it). Returns the entry module's source and the
 * parts' sources, in evaluation order; the entry imports `${dir}/<last>`,
 * each part the one before it.
 */
export function splitModule(code, { budget = 9000, maxBytes = 240 * 1024, dir = './core-parts', name = i => `p${String(i).padStart(2, '0')}.js`, report } = {}) {
  code = jsonTables(code)
  const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
  const body = ast.body
  const exportsAt = body.findIndex(node => node.type === 'ExportNamedDeclaration' && !node.declaration && !node.source)
  if (exportsAt !== body.length - 1) throw new Error('split: the bundle must end with its one `export { … }` list')
  if (body.some(node => node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration' || (node.type.startsWith('Export') && node !== body[exportsAt]))) {
    throw new Error('split: the bundle may hold no import and no export but its final list')
  }
  const exportList = body[exportsAt]

  // Units: top-level statements, a declaration of several names taken one
  // name at a time (`var a = 1, b = f()` runs as `var a = 1; var b = f()`).
  // `base`: where the unit's text starts, in `code` coordinates.
  // `lead`: the comments above the statement (esbuild's `// <source file>`).
  let units = []
  let previousEnd = 0
  for (const node of body.slice(0, exportsAt)) {
    const lead = code.slice(previousEnd, node.start).trim()
    previousEnd = node.end
    if (node.type === 'VariableDeclaration' && node.declarations.length > 1) {
      for (const [i, d] of node.declarations.entries()) {
        units.push({ node: { type: 'VariableDeclaration', kind: node.kind, declarations: [d] }, text: `${node.kind} ${code.slice(d.start, d.end)};`, base: d.start - node.kind.length - 1, lead: i === 0 ? lead : '' })
      }
    } else units.push({ node, text: code.slice(node.start, node.end), base: node.start, lead })
  }
  // A constant (a declaration whose value refers to nothing and runs nothing)
  // moves to the front: earlier parts may then read it.
  // Only one no other unit assigns (a counter starting at 0 stays where it is).
  const names = new Map()
  for (const unit of units) for (const n of topLevelNames(unit.node)) names.set(n, true)
  const written = new Set()
  for (const unit of units) {
    const own = new Set(topLevelNames(unit.node))
    for (const w of topLevelUses(unit.node, names).writes) if (!own.has(w)) written.add(w)
  }
  const isConstant = unit =>
    unit.node.type === 'VariableDeclaration' &&
    unit.node.declarations.every(d => d.id.type === 'Identifier' && !written.has(d.id.name) && (d.init === null ? unit.node.kind !== 'var' : constantExpression(d.init)))
  // A constant leaves its comments to the next statement that stays in place.
  let pending = ''
  for (const unit of units) {
    const lead = [pending, unit.lead].filter(Boolean).join('\n')
    if (isConstant(unit)) {
      pending = lead
    } else {
      pending = ''
      if (lead) {
        unit.text = `${lead}\n${unit.text}`
        unit.base -= lead.length + 1
      }
    }
  }
  units = [...units.filter(isConstant), ...units.filter(unit => !isConstant(unit))]

  // Top-level names and where each is declared; what each unit reads and writes of them.
  const declaredAt = new Map()
  for (const [i, unit] of units.entries()) for (const n of topLevelNames(unit.node)) declaredAt.set(n, i)
  const uses = units.map(unit => topLevelUses(unit.node, declaredAt))
  const sizes = units.map(unit => countNodes(unit.node))
  const bytes = units.map(unit => Buffer.byteLength(unit.text) + 1)

  // Cuts are between units: cut k separates units < k from units >= k. A
  // write of another unit's name keeps the two together (an import is
  // read-only), and so does a read of a function declared later (it is
  // hoisted: callable before its unit runs). A read of any other later name
  // goes through LATE, a function the later part sets as it starts that
  // returns the name's current value (`(LATE.name?.())`, a call, so reading
  // LATE runs nothing by itself): before that the name reads as undefined, as
  // an unassigned var does (and as a let,
  // const or class it could not have been read then without a TDZ error).
  const n = units.length
  const hoisted = new Set(units.flatMap(unit => (unit.node.type === 'FunctionDeclaration' ? topLevelNames(unit.node) : [])))
  if (declaredAt.has(LATE)) throw new Error(`split: the bundle declares ${LATE}`)
  const blocked = new Int32Array(n + 2)
  const spans = []
  const block = (from, to, why) => {
    if (from > to) return
    blocked[from] += 1
    blocked[to + 1] -= 1
    spans.push([from, to, ...why])
  }
  for (const [i, { reads, writes }] of uses.entries()) {
    for (const r of reads) {
      const d = declaredAt.get(r)
      if (d > i && (hoisted.has(r) || writes.has(r))) block(i + 1, d, [r, 'read'])
    }
    for (const w of writes) {
      const d = declaredAt.get(w)
      if (d < i) block(d + 1, i, [w, 'write'])
    }
  }
  report?.({ units, sizes, spans })
  const cuts = []
  let run = 0
  let runBytes = 0
  let open = 0
  for (let k = 1; k < n; k++) {
    open += blocked[k]
    run += sizes[k - 1]
    runBytes += bytes[k - 1]
    if (open === 0 && (run >= budget || runBytes + bytes[k] > maxBytes)) {
      cuts.push(k)
      run = 0
      runBytes = 0
    }
  }
  // A last part too small to stand alone joins the one before.
  if (cuts.length > 0 && sizes.slice(cuts.at(-1)).reduce((a, b) => a + b, 0) < budget / 4 && bytes.slice(cuts.at(-2) ?? 0).reduce((a, b) => a + b, 0) < maxBytes) cuts.pop()
  const bounds = [0, ...cuts, n]

  const partOf = new Int32Array(n)
  for (let p = 0; p + 1 < bounds.length; p++) for (let i = bounds[p]; i < bounds[p + 1]; i++) partOf[i] = p
  // Names each part exports: read by a later part, or by the entry's list;
  // names each part sets on LATE: read by an earlier part.
  const exported = bounds.slice(1).map(() => new Set())
  const late = bounds.slice(1).map(() => new Set())
  const texts = units.map(unit => unit.text)
  for (const [i, { reads, sites }] of uses.entries()) {
    for (const r of reads) {
      const d = declaredAt.get(r)
      if (partOf[d] < partOf[i]) exported[partOf[d]].add(r)
      if (partOf[d] > partOf[i]) late[partOf[d]].add(r)
    }
    // The unit's reads of later parts' names, rewritten (from its end, so offsets hold).
    const forward = sites.filter(site => partOf[declaredAt.get(site.name)] > partOf[i]).sort((a, b) => b.start - a.start)
    let text = texts[i]
    for (const site of forward) {
      const at = site.start - units[i].base
      const replacement = `(${LATE}.${site.name}?.())`
      text = text.slice(0, at) + (site.shorthand ? `${site.name}:${replacement}` : replacement) + text.slice(site.end - units[i].base)
    }
    texts[i] = text
  }
  for (const spec of exportList.specifiers) exported[partOf[declaredAt.get(spec.local.name)]].add(spec.local.name)
  const usesLate = bounds.slice(1).map((_, p) => late[p].size > 0 || uses.some((u, i) => partOf[i] === p && u.sites.some(site => partOf[declaredAt.get(site.name)] > p)))

  const parts = []
  for (let p = 0; p + 1 < bounds.length; p++) {
    const from = bounds[p]
    const to = bounds[p + 1]
    const imports = new Set()
    for (let i = from; i < to; i++) for (const r of uses[i].reads) if (partOf[declaredAt.get(r)] < p) imports.add(r)
    if (p > 0 && usesLate[p]) imports.add(LATE)
    let source = ''
    if (p > 0) {
      const previous = `./${name(p - 1)}`
      if (imports.size > 0) source += `import{${[...imports].join(',')}}from'${previous}';`
      source += `export*from'${previous}';\n`
    } else {
      source += `var ${LATE}={};export{${LATE}};\n`
    }
    for (const r of late[p]) source += `${LATE}.${r}=()=>${r};`
    if (late[p].size > 0) source += '\n'
    for (let i = from; i < to; i++) source += texts[i] + '\n'
    if (exported[p].size > 0) source += `export{${[...exported[p]].join(',')}};\n`
    parts.push({ file: name(p), source, nodes: sizes.slice(from, to).reduce((a, b) => a + b, 0) })
  }
  const last = `${dir}/${name(parts.length - 1)}`
  const locals = [...new Set(exportList.specifiers.map(spec => spec.local.name))]
  const entry = `import{${locals.join(',')}}from'${last}';\n${code.slice(exportList.start, exportList.end)}\n`
  for (const part of parts) part.source = escapeHidden(part.source)
  return { entry: escapeHidden(entry), parts }
}

// ─── Characters a reader cannot see ──────────────────────────────────────────

/**
 * Characters that show as nothing, or as something else, where they stand:
 * controls but tab and line ends, format characters (zero-width, bidi,
 * invisible operators), separators but the space, combining marks, private
 * use, unassigned code points, lone surrogates, and the blank letters.
 */
const HIDDEN = /(?![\t\n\r ])[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Zs}\p{Mn}\p{Me}\p{Co}\p{Cn}\p{Cs}\u115F\u1160\u3164\uFFA0\u2800]/gu

/**
 * Writes every HIDDEN character of a module as an escape: `\uXXXX` (a
 * surrogate pair beyond the BMP) in a string, a template or a regular
 * expression, the same in a comment. Each value stays as it was (checked:
 * the strings and templates read the same after); one anywhere else, in a
 * tagged template, or after a backslash is an error.
 */
export function escapeHidden(source) {
  if (!HIDDEN.test(source)) return source
  HIDDEN.lastIndex = 0
  const spans = []
  const comments = []
  const before = []
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', onComment: (block, text, start, end) => comments.push([start, end]) })
  const tagged = new Set()
  const walk = node => {
    if (node.type === 'TaggedTemplateExpression') for (const q of node.quasi.quasis) tagged.add(q)
    if (node.type === 'Literal' && (typeof node.value === 'string' || node.regex)) {
      spans.push([node.start, node.end])
      if (typeof node.value === 'string') before.push(node.value)
    }
    if (node.type === 'TemplateElement') {
      spans.push([node.start, node.end, tagged.has(node)])
      before.push(node.value.cooked)
    }
    for (const key in node) {
      const child = node[key]
      if (child === null || typeof child !== 'object') continue
      if (Array.isArray(child)) {
        for (const c of child) if (c !== null && typeof c?.type === 'string') walk(c)
      } else if (typeof child.type === 'string') walk(child)
    }
  }
  walk(ast)
  spans.push(...comments)
  spans.sort((a, b) => a[0] - b[0])
  const where = at => {
    let lo = 0
    let hi = spans.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (spans[mid][1] <= at) lo = mid + 1
      else if (spans[mid][0] > at) hi = mid - 1
      else return spans[mid]
    }
    return undefined
  }
  const out = source.replace(HIDDEN, (char, at) => {
    const span = where(at)
    const code = char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
    if (!span) throw new Error(`split: U+${code} outside a string, template, regular expression or comment`)
    if (span[2]) throw new Error(`split: U+${code} in a tagged template`)
    let slashes = 0
    while (source[at - 1 - slashes] === '\\') slashes += 1
    if (slashes % 2 === 1) throw new Error(`split: U+${code} after a backslash`)
    return [...char].length === 1 && char.length === 2
      ? `\\u${char.charCodeAt(0).toString(16).toUpperCase()}\\u${char.charCodeAt(1).toString(16).toUpperCase()}`
      : `\\u${code}`
  })
  const after = []
  const check = node => {
    if (node.type === 'Literal' && typeof node.value === 'string') after.push(node.value)
    if (node.type === 'TemplateElement') after.push(node.value.cooked)
    for (const key in node) {
      const child = node[key]
      if (child === null || typeof child !== 'object') continue
      if (Array.isArray(child)) {
        for (const c of child) if (c !== null && typeof c?.type === 'string') check(c)
      } else if (typeof child.type === 'string') check(child)
    }
  }
  check(parse(out, { ecmaVersion: 'latest', sourceType: 'module' }))
  if (after.length !== before.length || after.some((value, i) => value !== before[i])) throw new Error('split: escaping hidden characters changed a string')
  return out
}

/** An expression that refers to no name and runs nothing: a literal, a template without holes, a literal table, JSON.parse of a string or such a template. */
function constantExpression(node) {
  if (node.type === 'TemplateLiteral') return node.expressions.length === 0
  if (node.type === 'CallExpression') {
    const { callee, arguments: args } = node
    return (
      callee.type === 'MemberExpression' &&
      !callee.computed &&
      callee.object.type === 'Identifier' &&
      callee.object.name === 'JSON' &&
      callee.property.name === 'parse' &&
      args.length === 1 &&
      ((args[0].type === 'Literal' && typeof args[0].value === 'string') || (args[0].type === 'TemplateLiteral' && args[0].expressions.length === 0))
    )
  }
  return literalValue(node) !== NOT_LITERAL
}

/** AST nodes under `node`, itself included. */
export function countNodes(node) {
  let count = 0
  const stack = [node]
  while (stack.length > 0) {
    const x = stack.pop()
    count += 1
    for (const key in x) {
      const value = x[key]
      if (value === null || typeof value !== 'object') continue
      if (Array.isArray(value)) {
        for (const child of value) if (child !== null && typeof child?.type === 'string') stack.push(child)
      } else if (typeof value.type === 'string') stack.push(value)
    }
  }
  return count
}

// ─── Literal tables as JSON ──────────────────────────────────────────────────

/**
 * Rewrites every object or array literal of only literal values (strings,
 * finite numbers, booleans, null, and such literals nested), at least
 * JSON_MIN_NODES nodes, as JSON.parse of its JSON text (a template literal,
 * one entry per line: jsonLayout): the same value, built the same way each
 * time it is evaluated (a fresh object), with the same key order. A text
 * longer than JSON_HOIST is a top-level constant (in pieces of about
 * JSON_PIECE characters, joined where it is parsed), declared at the start.
 * Left alone: `__proto__` keys (a prototype in a literal, a plain key in
 * JSON), -0 (JSON writes 0), anything computed, spread, shorthand or a method.
 */
export function jsonTables(code) {
  if (code.includes(JSON_NAME)) throw new Error(`split: the bundle already holds ${JSON_NAME}`)
  const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
  const edits = []
  const constants = []
  const visit = node => {
    if (node.type === 'ObjectExpression' || node.type === 'ArrayExpression') {
      const value = literalValue(node)
      if (value !== NOT_LITERAL && countNodes(node) >= JSON_MIN_NODES) {
        const text = jsonLayout(value.value)
        if (text.length <= JSON_HOIST) {
          edits.push([node.start, node.end, `JSON.parse(${templateText(text)})`])
        } else {
          const names = []
          for (const piece of pieces(text, JSON_PIECE)) {
            const id = `${JSON_NAME}${constants.length}`
            constants.push(`var ${id} = ${templateText(piece)};`)
            names.push(id)
          }
          edits.push([node.start, node.end, `JSON.parse(${names.join(' + ')})`])
        }
        return
      }
    }
    for (const key in node) {
      const child = node[key]
      if (child === null || typeof child !== 'object') continue
      if (Array.isArray(child)) {
        for (const c of child) if (c !== null && typeof c?.type === 'string') visit(c)
      } else if (typeof child.type === 'string') visit(child)
    }
  }
  visit(ast)
  edits.sort((a, b) => b[0] - a[0])
  let out = code
  for (const [start, end, text] of edits) out = out.slice(0, start) + text + out.slice(end)
  return constants.length > 0 ? `${constants.join('\n')}\n${out}` : out
}

/** A JSON text longer than this is laid out on several lines (jsonLayout). */
const JSON_WIDTH = 200
/** An entry longer than this is a large one: a container with two of them takes a line per entry. */
const JSON_LARGE = 40

/**
 * `value` as JSON text for a reader: a container that holds two or more
 * large entries (a font's glyphs, a table of tables), or one large entry laid
 * out that way itself, puts each entry on a line of its own, indented by
 * depth, and lays out each the same way; one of only small entries (a list of
 * ranges, a map of names) fills lines of about JSON_WIDTH characters;
 * anything else (a glyph: its metrics and its one long path), or anything
 * short, stays on one line.
 */
export function jsonLayout(value, depth = 0) {
  const shape = jsonShape(value)
  if (shape.kind === 'flat') return shape.flat
  let lines
  if (shape.kind === 'lines') {
    lines = shape.items.map(([key, v]) => entryText(key, jsonLayout(v, depth + 1)))
  } else {
    lines = []
    let line = ''
    for (const text of shape.flats) {
      if (line !== '' && line.length + text.length + 1 > JSON_WIDTH) {
        lines.push(line)
        line = ''
      }
      line += (line === '' ? '' : ',') + text
    }
    lines.push(line)
  }
  const pad = ' '.repeat(depth + 1)
  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}']
  return `${open}\n${lines.map(line => pad + line).join(',\n')}\n${' '.repeat(depth)}${close}`
}

const entryText = (key, text) => (key === undefined ? text : `${JSON.stringify(key)}:${text}`)

/** How jsonLayout lays `value` out: on one line, a line per entry, or its small entries filling lines. */
function jsonShape(value) {
  const flat = JSON.stringify(value)
  if (value === null || typeof value !== 'object' || flat.length <= JSON_WIDTH) return { kind: 'flat', flat }
  const items = Array.isArray(value) ? value.map(v => [undefined, v]) : Object.entries(value)
  const flats = items.map(([key, v]) => entryText(key, JSON.stringify(v)))
  const large = items.filter((_, i) => flats[i].length > JSON_LARGE)
  if (large.length === 0) return { kind: 'wrap', flats }
  if (large.length >= 2 || jsonShape(large[0][1]).kind !== 'flat') return { kind: 'lines', items }
  return { kind: 'flat', flat }
}

/** `text` cut after a line end every `size` characters or so (a line longer than that stays whole). */
function pieces(text, size) {
  const out = []
  let start = 0
  while (start < text.length) {
    let end = start + size
    if (end >= text.length) end = text.length
    else {
      const cut = text.indexOf('\n', end)
      end = cut < 0 ? text.length : cut + 1
    }
    out.push(text.slice(start, end))
    start = end
  }
  return out
}

/** A template literal whose value is `text`: its backslashes, backquotes and `${` escaped. */
function templateText(text) {
  return `\`${text.replace(/[\\`]/g, '\\$&').replace(/\$\{/g, '\\${')}\``
}

const NOT_LITERAL = Symbol('not a literal')

function literalValue(node) {
  switch (node.type) {
    case 'Literal':
      if (node.regex || typeof node.value === 'bigint') return NOT_LITERAL
      if (typeof node.value === 'number' && (!Number.isFinite(node.value) || Object.is(node.value, -0))) return NOT_LITERAL
      return { value: node.value }
    case 'UnaryExpression': {
      if (node.operator === '-' && node.argument.type === 'Literal' && typeof node.argument.value === 'number') {
        const value = -node.argument.value
        return Number.isFinite(value) && !Object.is(value, -0) && !Object.is(value, 0) ? { value } : NOT_LITERAL
      }
      if (node.operator === '!' && node.argument.type === 'Literal' && typeof node.argument.value === 'number') return { value: !node.argument.value }
      return NOT_LITERAL
    }
    case 'ArrayExpression': {
      const out = []
      for (const element of node.elements) {
        if (element === null) return NOT_LITERAL
        const v = literalValue(element)
        if (v === NOT_LITERAL) return NOT_LITERAL
        out.push(v.value)
      }
      return { value: out }
    }
    case 'ObjectExpression': {
      const entries = []
      for (const property of node.properties) {
        if (property.type !== 'Property' || property.kind !== 'init' || property.computed || property.method || property.shorthand) return NOT_LITERAL
        const key = property.key.type === 'Identifier' ? property.key.name : property.key.value
        if (typeof key === 'number' ? !Number.isSafeInteger(key) || key < 0 : typeof key !== 'string') return NOT_LITERAL
        if (key === '__proto__') return NOT_LITERAL
        const v = literalValue(property.value)
        if (v === NOT_LITERAL) return NOT_LITERAL
        entries.push([String(key), v.value])
      }
      // Duplicate keys: the last one wins, in a literal as in JSON.parse.
      return { value: Object.fromEntries(entries) }
    }
    default:
      return NOT_LITERAL
  }
}

// ─── Top-level names and their uses ──────────────────────────────────────────

function topLevelNames(node) {
  switch (node.type) {
    case 'VariableDeclaration':
      return node.declarations.flatMap(d => patternNames(d.id))
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
      return node.id ? [node.id.name] : []
    default:
      return []
  }
}

function patternNames(pattern) {
  switch (pattern.type) {
    case 'Identifier':
      return [pattern.name]
    case 'ObjectPattern':
      return pattern.properties.flatMap(p => patternNames(p.type === 'RestElement' ? p.argument : p.value))
    case 'ArrayPattern':
      return pattern.elements.flatMap(e => (e ? patternNames(e) : []))
    case 'RestElement':
      return patternNames(pattern.argument)
    case 'AssignmentPattern':
      return patternNames(pattern.left)
    default:
      return []
  }
}

/**
 * The top-level names (keys of `topLevel`) a statement reads and writes: every
 * identifier in an expression position that no inner scope declares.
 */
function topLevelUses(statement, topLevel) {
  const reads = new Set()
  const writes = new Set()
  const scopes = []
  const resolves = name => {
    for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].has(name)) return false
    return topLevel.has(name)
  }
  /** Where each top-level name is read: the identifier, and whether it stands for a shorthand property ({ name }). */
  const sites = []
  const read = (id, shorthand = false) => {
    if (resolves(id.name)) {
      reads.add(id.name)
      sites.push({ name: id.name, start: id.start, end: id.end, shorthand })
    }
  }
  const write = id => {
    if (resolves(id.name)) {
      writes.add(id.name)
      reads.add(id.name)
    }
  }
  const withScope = (names, fn) => {
    scopes.push(new Set(names))
    try {
      fn()
    } finally {
      scopes.pop()
    }
  }
  /** Names a block or a function body declares in its own scope (let, const, class, functions; var only for a function body). */
  const blockNames = (statements, isFunction) => {
    const names = []
    for (const s of statements) {
      if (s.type === 'VariableDeclaration' && s.kind !== 'var') names.push(...s.declarations.flatMap(d => patternNames(d.id)))
      else if ((s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') && s.id) names.push(s.id.name)
    }
    if (isFunction) for (const s of statements) collectVars(s, names)
    return names
  }
  const collectVars = (node, names) => {
    if (!node || typeof node.type !== 'string') return
    if (node.type === 'VariableDeclaration' && node.kind === 'var') {
      names.push(...node.declarations.flatMap(d => patternNames(d.id)))
    }
    if (isFunctionNode(node) || node.type === 'ClassDeclaration' || node.type === 'ClassExpression') return
    for (const key in node) {
      if (key === 'type' || key === 'start' || key === 'end') continue
      const child = node[key]
      if (child === null || typeof child !== 'object') continue
      if (Array.isArray(child)) for (const c of child) collectVars(c, names)
      else collectVars(child, names)
    }
  }
  /** A binding pattern: its defaults and computed keys are read; its names are declared elsewhere. */
  const bindPattern = pattern => {
    switch (pattern.type) {
      case 'Identifier':
        return
      case 'ObjectPattern':
        for (const p of pattern.properties) {
          if (p.type === 'RestElement') bindPattern(p.argument)
          else {
            if (p.computed) expr(p.key)
            bindPattern(p.value)
          }
        }
        return
      case 'ArrayPattern':
        for (const e of pattern.elements) if (e) bindPattern(e)
        return
      case 'RestElement':
        bindPattern(pattern.argument)
        return
      case 'AssignmentPattern':
        bindPattern(pattern.left)
        expr(pattern.right)
        return
      default:
        expr(pattern)
    }
  }
  /** An assignment target: identifiers in it are written. */
  const assignTarget = target => {
    switch (target.type) {
      case 'Identifier':
        write(target)
        return
      case 'ObjectPattern':
        for (const p of target.properties) {
          if (p.type === 'RestElement') assignTarget(p.argument)
          else {
            if (p.computed) expr(p.key)
            assignTarget(p.value)
          }
        }
        return
      case 'ArrayPattern':
        for (const e of target.elements) if (e) assignTarget(e)
        return
      case 'RestElement':
        assignTarget(target.argument)
        return
      case 'AssignmentPattern':
        assignTarget(target.left)
        expr(target.right)
        return
      default:
        expr(target) // a member expression
    }
  }
  const fn = node => {
    const params = node.params.flatMap(patternNames)
    const own = node.type === 'FunctionExpression' && node.id ? [node.id.name] : []
    withScope([...own, 'arguments'], () =>
      withScope(params, () => {
        for (const p of node.params) bindPattern(p)
        if (node.body.type === 'BlockStatement') withScope(blockNames(node.body.body, true), () => node.body.body.forEach(stmt))
        else expr(node.body)
      }),
    )
  }
  const cls = node => {
    const own = node.type === 'ClassExpression' && node.id ? [node.id.name] : []
    withScope(own, () => {
      if (node.superClass) expr(node.superClass)
      for (const member of node.body.body) {
        if (member.type === 'StaticBlock') {
          withScope(blockNames(member.body, true), () => member.body.forEach(stmt))
          continue
        }
        if (member.computed) expr(member.key)
        if (member.value) {
          if (member.type === 'MethodDefinition') fn(member.value)
          else expr(member.value)
        }
      }
    })
  }
  const stmt = node => {
    switch (node.type) {
      case 'VariableDeclaration':
        for (const d of node.declarations) {
          bindPattern(d.id)
          if (d.init) expr(d.init)
        }
        return
      case 'FunctionDeclaration':
        fn(node)
        return
      case 'ClassDeclaration':
        cls(node)
        return
      case 'BlockStatement':
        withScope(blockNames(node.body, false), () => node.body.forEach(stmt))
        return
      case 'StaticBlock':
        withScope(blockNames(node.body, true), () => node.body.forEach(stmt))
        return
      case 'ExpressionStatement':
        expr(node.expression)
        return
      case 'IfStatement':
        expr(node.test)
        stmt(node.consequent)
        if (node.alternate) stmt(node.alternate)
        return
      case 'ForStatement':
        withScope(node.init?.type === 'VariableDeclaration' && node.init.kind !== 'var' ? node.init.declarations.flatMap(d => patternNames(d.id)) : [], () => {
          if (node.init) node.init.type === 'VariableDeclaration' ? stmt(node.init) : expr(node.init)
          if (node.test) expr(node.test)
          if (node.update) expr(node.update)
          stmt(node.body)
        })
        return
      case 'ForInStatement':
      case 'ForOfStatement':
        withScope(node.left.type === 'VariableDeclaration' && node.left.kind !== 'var' ? node.left.declarations.flatMap(d => patternNames(d.id)) : [], () => {
          if (node.left.type === 'VariableDeclaration') stmt(node.left)
          else assignTarget(node.left)
          expr(node.right)
          stmt(node.body)
        })
        return
      case 'WhileStatement':
      case 'DoWhileStatement':
        expr(node.test)
        stmt(node.body)
        return
      case 'ReturnStatement':
      case 'ThrowStatement':
        if (node.argument) expr(node.argument)
        return
      case 'TryStatement':
        stmt(node.block)
        if (node.handler) {
          const names = node.handler.param ? patternNames(node.handler.param) : []
          withScope(names, () => {
            if (node.handler.param) bindPattern(node.handler.param)
            stmt(node.handler.body)
          })
        }
        if (node.finalizer) stmt(node.finalizer)
        return
      case 'SwitchStatement':
        expr(node.discriminant)
        withScope(
          blockNames(
            node.cases.flatMap(c => c.consequent),
            false,
          ),
          () => {
            for (const c of node.cases) {
              if (c.test) expr(c.test)
              c.consequent.forEach(stmt)
            }
          },
        )
        return
      case 'LabeledStatement':
        stmt(node.body)
        return
      case 'BreakStatement':
      case 'ContinueStatement':
      case 'EmptyStatement':
      case 'DebuggerStatement':
        return
      case 'WithStatement':
        throw new Error('split: `with` is not allowed')
      default:
        throw new Error(`split: unknown statement ${node.type}`)
    }
  }
  const expr = node => {
    switch (node.type) {
      case 'Identifier':
        read(node)
        return
      case 'Literal':
      case 'ThisExpression':
      case 'Super':
      case 'MetaProperty':
        return
      case 'TemplateLiteral':
        node.expressions.forEach(expr)
        return
      case 'TaggedTemplateExpression':
        expr(node.tag)
        node.quasi.expressions.forEach(expr)
        return
      case 'ArrayExpression':
        for (const e of node.elements) if (e) expr(e)
        return
      case 'ObjectExpression':
        for (const p of node.properties) {
          if (p.type === 'SpreadElement') {
            expr(p.argument)
            continue
          }
          if (p.computed) expr(p.key)
          if (p.shorthand) read(p.value, true)
          else if (p.kind === 'get' || p.kind === 'set' || p.method) fn(p.value)
          else expr(p.value)
        }
        return
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        fn(node)
        return
      case 'ClassExpression':
        cls(node)
        return
      case 'UnaryExpression':
      case 'AwaitExpression':
      case 'SpreadElement':
        expr(node.argument)
        return
      case 'YieldExpression':
        if (node.argument) expr(node.argument)
        return
      case 'UpdateExpression':
        assignTarget(node.argument)
        return
      case 'BinaryExpression':
      case 'LogicalExpression':
        expr(node.left)
        expr(node.right)
        return
      case 'AssignmentExpression':
        assignTarget(node.left)
        expr(node.right)
        return
      case 'ConditionalExpression':
        expr(node.test)
        expr(node.consequent)
        expr(node.alternate)
        return
      case 'CallExpression':
      case 'NewExpression':
        expr(node.callee)
        node.arguments.forEach(expr)
        return
      case 'MemberExpression':
        expr(node.object)
        if (node.computed) expr(node.property)
        return
      case 'ChainExpression':
      case 'ParenthesizedExpression':
        expr(node.expression)
        return
      case 'SequenceExpression':
        node.expressions.forEach(expr)
        return
      case 'ImportExpression':
        throw new Error('split: dynamic import() in the bundle')
      case 'PrivateIdentifier':
        return
      default:
        throw new Error(`split: unknown expression ${node.type}`)
    }
  }
  stmt(statement)
  return { reads, writes, sites }
}

function isFunctionNode(node) {
  return node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression'
}
