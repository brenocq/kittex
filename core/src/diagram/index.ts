import type { Picture } from '../types.js'
import { readSvg } from './svg.js'
import { emPerUnit, type TexDocument } from './tex.js'

export { adaptColor, assumedBackground, type Adapted, type PaperColors } from './color.js'
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
  latexArgv,
  isJobDir,
  JOB_NAME,
  jobDirTemplate,
  LATEX_ARGV,
  mathDocument,
  MAX_CPU_SECONDS,
  MAX_OUTPUT_BYTES,
  MAX_TEX_SOURCE,
  PREAMBLE_VERSION,
  texEnvironment,
  texError,
  unsafeTex,
  type Confinement,
  type DiagramLang,
  type TexDocument,
} from './tex.js'
export { XmlError } from './xml.js'

/** dvisvgm's SVG of a compiled document as a Picture, in the document's em. Throws SvgError or XmlError. */
export function texPicture(svg: string, document: Pick<TexDocument, 'baseline' | 'fontSize'>): Picture {
  return readSvg(svg, { baseline: document.baseline, emPerUnit: emPerUnit(document) })
}
