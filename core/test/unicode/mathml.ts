// TeX -> presentation MathML the way MathJax 4 serializes it (the typeset
// module's texToMathML does the same), for the Unicode renderer's tests.
import { mathjax } from '@mathjax/src/js/mathjax.js'
import { TeX } from '@mathjax/src/js/input/tex.js'
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js'
import { STATE } from '@mathjax/src/js/core/MathItem.js'
import { SerializedMmlVisitor } from '@mathjax/src/js/core/MmlTree/SerializedMmlVisitor.js'
import type { MmlNode } from '@mathjax/src/js/core/MmlTree/MmlNode.js'
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js'
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js'
import '@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js'
import '@mathjax/src/js/input/tex/boldsymbol/BoldsymbolConfiguration.js'
import '@mathjax/src/js/input/tex/mathtools/MathtoolsConfiguration.js'
import '@mathjax/src/js/input/tex/cancel/CancelConfiguration.js'
import '@mathjax/src/js/input/tex/braket/BraketConfiguration.js'
import '@mathjax/src/js/input/tex/textmacros/TextMacrosConfiguration.js'
import '@mathjax/src/js/input/tex/color/ColorConfiguration.js'
import '@mathjax/src/js/input/tex/noundefined/NoUndefinedConfiguration.js'

const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)
const tex = new TeX({
  packages: ['base', 'ams', 'newcommand', 'boldsymbol', 'mathtools', 'cancel', 'braket', 'color', 'noundefined'],
})
const doc = mathjax.document('', { InputJax: tex })
const visitor = new SerializedMmlVisitor()

/** The MathML MathJax 4 makes of a TeX formula. */
export function mathml(source: string, display: boolean): string {
  const node = doc.convert(source, { display, end: STATE.CONVERT }) as MmlNode
  return visitor.visitTree(node)
}
