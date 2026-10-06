import { flatten, parsePath } from '../../src/typeset/geometry.js'
import type { TypesetResult } from '../../src/types.js'

/** The bounding box of all ink (path outlines and rules), in em. */
export function inkBox(result: TypesetResult): { minX: number; minY: number; maxX: number; maxY: number } {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity]
  const add = (x: number, y: number) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  for (const op of result.ops) {
    if (op.type === 'rect') {
      add(op.x, op.y)
      add(op.x + op.width, op.y + op.height)
    } else {
      for (const line of flatten(parsePath(op.d), op.transform)) for (const [x, y] of line.points) add(x, y)
    }
  }
  return { minX, minY, maxX, maxY }
}
