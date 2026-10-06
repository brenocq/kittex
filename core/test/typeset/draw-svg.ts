import type { DrawOp, TypesetResult } from '../../src/types.js'

/**
 * Draws a typeset formula's ops as a standalone SVG, in em (scaled by `px` per em),
 * with its box (red: above the baseline, blue: below) and the baseline, for
 * checking the geometry by eye.
 */
export function opsToSvg(result: TypesetResult, px = 60, pad = 0.25): string {
  const { width, height, depth } = result
  const w = (width + 2 * pad) * px
  const h = (height + depth + 2 * pad) * px
  const ops = result.ops.map(op => opToSvg(op)).join('\n')
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(1)}" height="${h.toFixed(1)}" viewBox="${-pad} ${-height - pad} ${width + 2 * pad} ${height + depth + 2 * pad}">`,
    `<rect x="${-pad}" y="${-height - pad}" width="${width + 2 * pad}" height="${height + depth + 2 * pad}" fill="white"/>`,
    `<rect x="0" y="${-height}" width="${width}" height="${height}" fill="#fdd"/>`,
    `<rect x="0" y="0" width="${width}" height="${depth}" fill="#ddf"/>`,
    `<g fill="black" fill-rule="nonzero">`,
    ops,
    `</g>`,
    `<line x1="${-pad}" y1="0" x2="${width + pad}" y2="0" stroke="green" stroke-width="${1 / px}"/>`,
    `</svg>`,
  ].join('\n')
}

function opToSvg(op: DrawOp): string {
  if (op.type === 'rect') return `<rect x="${op.x}" y="${op.y}" width="${op.width}" height="${op.height}"/>`
  return `<path transform="matrix(${op.transform.join(' ')})" d="${op.d}"/>`
}
