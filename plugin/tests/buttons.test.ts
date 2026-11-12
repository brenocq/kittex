// Where a picture's hover buttons go (buttons.ts): beside it, never over the
// cells of any Image, so hovering never takes a picture off the screen; and
// against its Image, so the pointer never leaves the hover on its way to them.

import { describe, expect } from 'claude-code/testing'

import { BUTTON_GAP, buttonSpot } from '../hooks/buttons.ts'
import type { ButtonBounds, CellBox } from '../hooks/buttons.ts'
import { test } from './support.ts'

const LABELS = ['⧉ copy path', '⧉ copy image']
const WIDE = 12
const ROW = 11 + BUTTON_GAP + 12
const NONE = { left: 0, right: 0 }

const box = (row: number, column: number, rows: number, columns: number): CellBox => ({ row, column, rows, columns })
const alone = (own: CellBox) => ({ own, frame: own, siblings: [] })
const open: ButtonBounds = { left: 0, right: 100, top: 0, bottom: 40 }

/** The cells the buttons' Box takes (its padding included), from where buttonSpot puts it. */
function taken(own: CellBox, spot: ReturnType<typeof buttonSpot>): CellBox {
  const size = spot.direction === 'column' ? { rows: LABELS.length, columns: WIDE } : { rows: 1, columns: ROW }
  return { row: own.row + spot.top, column: own.column + spot.left, rows: size.rows, columns: size.columns + spot.padding.left + spot.padding.right }
}

/** The cells the buttons themselves take, inside the Box's padding. */
function labels(own: CellBox, spot: ReturnType<typeof buttonSpot>): CellBox {
  const cells = taken(own, spot)
  return { ...cells, column: cells.column + spot.padding.left, columns: cells.columns - spot.padding.left - spot.padding.right }
}

const meets = (a: CellBox, b: CellBox) => a.column < b.column + b.columns && b.column < a.column + a.columns && a.row < b.row + b.rows && b.row < a.row + a.rows

/** Whether `a` shares an edge with `frame`, side by side or one over the other, with no cell between. */
const touches = (a: CellBox, frame: CellBox) =>
  ((a.column + a.columns === frame.column || frame.column + frame.columns === a.column) && a.row < frame.row + frame.rows && frame.row < a.row + a.rows) ||
  ((a.row + a.rows === frame.row || frame.row + frame.rows === a.row) && a.column < frame.column + frame.columns && frame.column < a.column + a.columns)

describe('button spot', () => {
  test('a picture with room to its right gets its buttons stacked there, off its cells', async () => {
    const own = box(2, 4, 6, 30)
    const spot = buttonSpot(alone(own), [own], LABELS, open)
    expect(spot).toEqual({ top: 0, left: 30, direction: 'column', padding: { left: BUTTON_GAP, right: 0 } })
    expect(meets(taken(own, spot), own)).toBe(false)
    expect(labels(own, spot).column).toBe(own.column + own.columns + BUTTON_GAP)
  })

  test('the Box holding the buttons touches its Image on every side it can sit, the gap inside it, so no cell between them ends the hover', async () => {
    const own = box(2, 20, 6, 30)
    const right = buttonSpot(alone(own), [own], LABELS, open)
    const left = buttonSpot(alone(own), [own], LABELS, { ...open, right: 50 + WIDE })
    const above = buttonSpot(alone(own), [own], LABELS, { ...open, left: 20, right: 50 })
    const below = buttonSpot(alone(own), [own], LABELS, { ...open, left: 20, right: 50, top: 2 })
    expect([right, left, above, below].map(spot => [spot.direction, spot.top])).toEqual([
      ['column', 0],
      ['column', 0],
      ['row', -1],
      ['row', 6],
    ])
    expect(left.padding).toEqual({ left: 0, right: BUTTON_GAP })
    expect(above.padding).toEqual(NONE)
    for (const spot of [right, left, above, below]) {
      expect(touches(taken(own, spot), own)).toBe(true)
      expect(meets(taken(own, spot), own)).toBe(false)
    }
  })

  test('a picture as wide as the reply gets them in one row above it, or below where the row above is not free', async () => {
    const own = box(2, 0, 6, 100)
    expect(buttonSpot(alone(own), [own], LABELS, open)).toEqual({ top: -1, left: 100 - ROW, direction: 'row', padding: NONE })
    expect(buttonSpot(alone(own), [own], LABELS, { ...open, top: 2 })).toEqual({ top: 6, left: 100 - ROW, direction: 'row', padding: NONE })
  })

  test('two images side by side in one block: each gets its buttons on its own side, never over the other', async () => {
    const frame = box(1, 20, 8, 60)
    const first = box(1, 20, 8, 29)
    const second = box(1, 51, 8, 29)
    const one = buttonSpot({ own: first, frame, siblings: [second] }, [frame], LABELS, open)
    const two = buttonSpot({ own: second, frame, siblings: [first] }, [frame], LABELS, open)
    expect(one.direction).toBe('column')
    expect(labels(first, one).column + WIDE).toBeLessThanOrEqual(frame.column - BUTTON_GAP)
    expect(two.direction).toBe('column')
    expect(labels(second, two).column).toBeGreaterThanOrEqual(frame.column + frame.columns + BUTTON_GAP)
    for (const [own, spot] of [[first, one], [second, two]] as const) {
      expect(meets(taken(own, spot), frame)).toBe(false)
      expect(touches(taken(own, spot), frame)).toBe(true)
    }
  })

  test("a block as wide as the reply puts each image's buttons above the block, by that image", async () => {
    const frame = box(1, 0, 8, 100)
    const first = box(1, 0, 8, 49)
    const second = box(1, 51, 8, 49)
    const one = buttonSpot({ own: first, frame, siblings: [second] }, [frame], LABELS, open)
    const two = buttonSpot({ own: second, frame, siblings: [first] }, [frame], LABELS, open)
    expect(one).toEqual({ top: -1, left: 49 - ROW, direction: 'row', padding: NONE })
    expect(two).toEqual({ top: -1, left: 49 - ROW, direction: 'row', padding: NONE })
  })

  test('another Image in the way is skipped: the buttons go to the next free side', async () => {
    const own = box(4, 0, 4, 40)
    const neighbour = box(4, 41, 1, 20)
    const spot = buttonSpot(alone(own), [own, neighbour], LABELS, open)
    expect(spot.direction).toBe('row')
    expect(meets(taken(own, spot), neighbour)).toBe(false)
    expect(meets(taken(own, spot), own)).toBe(false)
  })
})
