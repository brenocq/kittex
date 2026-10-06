// MathJax 4 inside the mod sandbox: TeX input, SVG output with the New Computer
// Modern font and the lite adaptor (no DOM), read back as DrawOps in em.
//
// Nothing here may load anything at run time: the TeX packages are imported
// statically, and so are the font's dynamic character ranges kittex carries
// (fonts.ts). initTypeset() defines those ranges in the font through MathJax's
// synchronous loading path (asyncLoad is a no-op, since each file registered its
// data on import) and drops the ranges that are not bundled, so typeset() never
// meets a dynamic range, a promise or a retry: it is synchronous throughout.
import { liteAdaptor, type LiteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js'
import type { LiteElement } from '@mathjax/src/js/adaptors/lite/Element.js'
import type { MathDocument } from '@mathjax/src/js/core/MathDocument.js'
import { STATE } from '@mathjax/src/js/core/MathItem.js'
import type { MmlNode } from '@mathjax/src/js/core/MmlTree/MmlNode.js'
import { SerializedMmlVisitor } from '@mathjax/src/js/core/MmlTree/SerializedMmlVisitor.js'
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js'
import { TeX } from '@mathjax/src/js/input/tex.js'
import { MapHandler } from '@mathjax/src/js/input/tex/MapHandler.js'
import type TexParseError from '@mathjax/src/js/input/tex/TexError.js'
import { mathjax } from '@mathjax/src/js/mathjax.js'
import { SVG } from '@mathjax/src/js/output/svg.js'
import { MathJaxNewcmFont } from '@mathjax/mathjax-newcm-font/js/svg.js'

import '@mathjax/src/js/input/tex/base/BaseConfiguration.js'
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js'
import '@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js'
import '@mathjax/src/js/input/tex/boldsymbol/BoldsymbolConfiguration.js'
import '@mathjax/src/js/input/tex/braket/BraketConfiguration.js'
import '@mathjax/src/js/input/tex/cancel/CancelConfiguration.js'
import '@mathjax/src/js/input/tex/color/ColorConfiguration.js'
import '@mathjax/src/js/input/tex/mathtools/MathtoolsConfiguration.js'
import '@mathjax/src/js/input/tex/physics/PhysicsConfiguration.js'
import '@mathjax/src/js/input/tex/textmacros/TextMacrosConfiguration.js'
import '@mathjax/src/js/input/tex/unicode/UnicodeConfiguration.js'
import './fonts.js'

import type { DrawOp, TypesetOptions, TypesetResult } from '../types.js'
import { flatten, parsePath } from './geometry.js'
import { UndrawableError, walkSvg } from './walk.js'

/** A formula MathJax could not parse or lay out; `message` says why, for a "not rendered" note. */
export class TexError extends Error {
  override name = 'TexError'
}

/** The longest TeX source accepted, in characters (MathJax's own buffer limit is maxBuffer). */
const MAX_LENGTH = 4096
/** MathJax's limits: macro substitutions per formula, and the size the expanded source may grow to. */
const MAX_MACROS = 1000
const MAX_BUFFER = 5 * 1024
/** Pixels per em handed to MathJax; only used to express widths in its px-based metrics. */
const EM_PX = 16

const PACKAGES = ['base', 'ams', 'newcommand', 'boldsymbol', 'braket', 'cancel', 'color', 'mathtools', 'physics', 'textmacros', 'unicode']

interface Engine {
  adaptor: LiteAdaptor
  tex: TeX<any, any, any>
  /** The token maps \def, \newcommand and \let write to, with their contents after configuration. */
  definitions: [Map<string, unknown>, Map<string, unknown>][]
  doc: MathDocument<any, any, any>
  /** The size of 1ex in em: MathJax sizes its outer <svg> in ex. */
  exEm: number
  visitor: CompactMmlVisitor
}

let engine: Engine | undefined

/** Loads the font data and configures MathJax; resolves once `typeset` may be called. Called once per process. */
export function initTypeset(): Promise<void> {
  try {
    engine ??= createEngine()
    return Promise.resolve()
  } catch (error) {
    return Promise.reject(error)
  }
}

function createEngine(): Engine {
  // The bundled dynamic font files registered their setup on import; "loading" one
  // just runs it, and an unbundled one is marked failed.
  mathjax.asyncLoad = () => undefined
  mathjax.asyncIsSynchronous = true

  const adaptor = liteAdaptor()
  RegisterHTMLHandler(adaptor)
  const tex = new TeX({
    packages: PACKAGES,
    maxMacros: MAX_MACROS,
    maxBuffer: MAX_BUFFER,
    tags: 'none',
    formatError: (_jax: unknown, error: TexParseError) => {
      throw new TexError(error.message)
    },
  })
  const svg = new SVG({
    fontData: MathJaxNewcmFont,
    fontCache: 'none',
    displayOverflow: 'overflow',
    linebreaks: { inline: false },
  })
  const doc = mathjax.document('', { InputJax: tex, OutputJax: svg })
  // Set up every bundled character range now, so typeset() never meets a dynamic one.
  svg.font.loadDynamicFilesSync()
  // What is left are ranges that are not bundled: forget them, so their characters
  // are simply unknown. (getChar would otherwise delete the placeholder from one
  // variant, find it again through a variant it inherits from, and recurse.)
  const tables = svg.font as unknown as { variant: Record<string, { chars: Record<number, unknown> }>; delimiters: Record<number, unknown> }
  for (const variant of Object.values(tables.variant)) {
    for (const key of Object.keys(variant.chars)) {
      const char = variant.chars[Number(key)]
      if (char && !Array.isArray(char)) delete variant.chars[Number(key)]
    }
  }
  for (const key of Object.keys(tables.delimiters)) {
    const delimiter = tables.delimiters[Number(key)]
    if (delimiter && typeof delimiter === 'object' && !('dir' in delimiter)) delete tables.delimiters[Number(key)]
  }
  // MathJax keeps \def and \newcommand definitions for the rest of the document;
  // remember the maps' initial contents to restore them before every formula.
  const definitions = ['new-Delimiter', 'new-Command', 'new-Environment'].map(name => {
    const map = (MapHandler.getMap(name) as unknown as { map: Map<string, unknown> }).map
    return [map, new Map(map)] as [Map<string, unknown>, Map<string, unknown>]
  })
  return { adaptor, tex, doc, definitions, exEm: svg.font.params.x_height, visitor: new CompactMmlVisitor() }
}

function ready(tex: string): Engine {
  if (!engine) throw new TexError('typesetter not initialised (await initTypeset() first)')
  if (tex.trim() === '') throw new TexError('empty formula')
  if (tex.length > MAX_LENGTH) throw new TexError(`formula longer than ${MAX_LENGTH} characters`)
  // Each formula stands alone: no definitions, labels or tag numbers from earlier ones.
  for (const [map, initial] of engine.definitions) {
    map.clear()
    for (const [key, value] of initial) map.set(key, value)
  }
  engine.tex.reset()
  return engine
}

/** Typesets one formula; throws TexError when the TeX is invalid or exceeds the limits. */
export function typeset(tex: string, options: TypesetOptions): TypesetResult {
  const { adaptor, doc, exEm } = ready(tex)
  const lineWidth = options.lineWidth !== undefined && options.lineWidth > 0 ? options.lineWidth : 0
  const breaking = options.display && lineWidth > 0
  // Without a line width, a container wide enough that nothing is laid out against it.
  const containerWidth = lineWidth || 1000
  const output = doc.outputJax as SVG<any, any, any>
  output.options.displayOverflow = breaking ? 'linebreak' : 'overflow'
  let container: LiteElement
  try {
    container = doc.convert(tex, {
      display: options.display,
      em: EM_PX,
      ex: EM_PX * exEm,
      containerWidth: containerWidth * EM_PX,
    }) as LiteElement
  } catch (error) {
    throw asTexError(error)
  }
  const svg = adaptor.firstChild(container) as LiteElement | null
  if (!svg || adaptor.kind(svg) !== 'svg') throw new TexError('MathJax produced no SVG')
  // A tagged equation, or one with forced line breaks (\\), is 100% wide: its
  // height and depth are in data-mjx-viewBox, its width is the container's.
  const fullWidth = !adaptor.getAttribute(svg, 'viewBox')
  const viewBox = (adaptor.getAttribute(svg, fullWidth ? 'data-mjx-viewBox' : 'viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
  if (viewBox.length !== 4 || viewBox.some((n: number) => !Number.isFinite(n))) throw new TexError('MathJax produced an SVG without a viewBox')
  const [, vy, vw, vh] = viewBox as [number, number, number, number]
  const height = -vy / 1000
  const depth = (vh + vy) / 1000
  try {
    if (!fullWidth) return { width: vw / 1000, height, depth, ops: walkSvg(adaptor, svg, { exEm, emPx: EM_PX, width: vw / 1000, height }) }
    // The narrowest it may be: MathJax's min-width (a tagged table), else the ink.
    const minWidth = Number.parseFloat(adaptor.getStyle(svg, 'min-width') || '0') * exEm
    if (lineWidth || minWidth) {
      const width = Math.max(lineWidth, minWidth)
      return { width, height, depth, ops: walkSvg(adaptor, svg, { exEm, emPx: EM_PX, width, height }) }
    }
    const ops = walkSvg(adaptor, svg, { exEm, emPx: EM_PX, width: containerWidth, height })
    return { width: Math.max(0, ...ops.map(rightEdge)), height, depth, ops }
  } catch (error) {
    throw asTexError(error)
  }
}

/** How far right an op reaches, in em. */
function rightEdge(op: DrawOp): number {
  if (op.type === 'rect') return op.x + op.width
  let right = -Infinity
  for (const line of flatten(parsePath(op.d), op.transform, 2)) for (const [x] of line.points) right = Math.max(right, x)
  return right
}

/** The formula as presentation MathML (`<math>…</math>`), for the Unicode renderer. */
export function texToMathML(tex: string, options: Pick<TypesetOptions, 'display'>): string {
  const { doc, visitor } = ready(tex)
  let root: MmlNode
  try {
    root = doc.convert(tex, { display: options.display, end: STATE.CONVERT }) as MmlNode
  } catch (error) {
    throw asTexError(error)
  }
  return `<math display="${options.display ? 'block' : 'inline'}"${visitor.visitTree(root).slice('<math'.length)}`
}

/**
 * MathML on one line, without MathJax's data-* attributes (each node's data-latex
 * repeats its source, which makes deep nesting quadratic) and without the root's
 * display attribute, which texToMathML sets itself.
 */
class CompactMmlVisitor extends SerializedMmlVisitor {
  override visitTree(node: MmlNode): string {
    return this.visitNode(node, '')
  }

  override visitInferredMrowNode(node: MmlNode, _space: string): string {
    return node.childNodes.map(child => this.visitNode(child, '')).join('')
  }

  override visitDefault(node: MmlNode, _space: string): string {
    const kind = this.getKind(node)
    return `<${kind}${this.getAttributes(node)}>${this.childNodeMml(node, '', '')}</${kind}>`
  }

  protected override getAttributes(node: MmlNode): string {
    const attributes = this.getAttributeList(node)
    let out = ''
    for (const name of Object.keys(attributes)) {
      if (name.startsWith('data-') || (name === 'display' && node.isKind('math'))) continue
      const value = attributes[name]
      if (value === undefined) continue
      out += ` ${name}="${this.quoteHTML(String(value))}"`
    }
    return out
  }
}

function asTexError(error: unknown): TexError {
  if (error instanceof TexError) return error
  if (error instanceof UndrawableError) return new TexError(error.message)
  if (error instanceof RangeError) return new TexError(`formula too complex (${error.message})`)
  const message = error instanceof Error ? error.message : String(error)
  return new TexError(message.replace(/\n.*/s, '') || 'MathJax failed')
}
