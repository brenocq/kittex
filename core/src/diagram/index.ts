import type { Picture } from '../types.js'
import { readSvg } from './svg.js'
import type { SvgTextTypesetter } from './svg-text.js'
import { emPerUnit, type TexDocument } from './tex.js'

export { adaptColor, assumedBackground, contrast, legible, type Adapted, type PaperColors } from './color.js'
export { countNumbers, MAX_PATH_DATA, MAX_PICTURE_NUMBERS, MAX_PICTURE_OPS, readSvg, SvgError, type BaselineAt, type SvgReadOptions } from './svg.js'
export {
  bwrapProbe,
  confined,
  DIAGRAM_ENVS,
  diagramDocument,
  diagramFence,
  drawsPicture,
  dvisvgmArgv,
  emPerUnit,
  FORMAT_SOURCE,
  formatArgv,
  formatName,
  inlineTables,
  latexArgv,
  isJobDir,
  JOB_NAME,
  jobDirTemplate,
  LATEX_ARGV,
  mathDocument,
  MAX_CPU_SECONDS,
  MAX_OUTPUT_BYTES,
  MAX_TEX_SOURCE,
  PDF_NAME,
  pdfArgv,
  pdfCopyArgv,
  PREAMBLE_VERSION,
  TRIAL_PDF,
  texEnvironment,
  texError,
  ulimitProbe,
  unsafeTex,
  type Confinement,
  type DiagramLang,
  type PdfConverter,
  type TexDocument,
} from './tex.js'
export { MAX_TEXT_CHARS, svgTextTex, type SvgTextRun, type SvgTextTypesetter } from './svg-text.js'
export { XmlError } from './xml.js'

/**
 * dvisvgm's SVG of a compiled document (or a PDF page's) as a Picture, in the
 * document's em, its `<text>` set by `text` (none without it). Throws SvgError
 * or XmlError.
 */
export function texPicture(svg: string, document: Pick<TexDocument, 'baseline' | 'fontSize'>, text?: SvgTextTypesetter): Picture {
  return readSvg(svg, { baseline: document.baseline, emPerUnit: emPerUnit(document), ...(text ? { text } : {}) })
}
