// Where a picture's hover buttons go. The terminal draws an Image through
// the cells it covers, so a button painted over any of them takes the picture
// off the screen while the pointer is there: the buttons go in cells no
// Image covers, beside their own picture. The pointer over them is still
// over the picture's hover scope (an absolute box is part of its parent's).

/** A box of terminal cells: its top-left cell, and its size. */
export interface CellBox {
  row: number
  column: number
  rows: number
  columns: number
}

/**
 * Where a picture's buttons are drawn, from its top-left cell, and how they
 * are laid out. The Box starts against its Image, the gap between them being
 * its own `padding`: a cell between the two would be in neither hover scope,
 * and a pointer moving slowly from the picture to its buttons would stop
 * there, hiding them before it reached them.
 */
export interface ButtonSpot {
  top: number
  left: number
  /** Stacked one under another (beside the picture), or side by side in one row (above or below it). */
  direction: 'column' | 'row'
  /** Blank columns inside the Box, between its Image and the buttons. */
  padding: { left: number; right: number }
}

/** The cells the buttons may take: columns from `left` up to `right` (exclusive), rows from `top` up to `bottom` (exclusive). */
export interface ButtonBounds {
  left: number
  right: number
  top: number
  bottom: number
}

/** Where a picture is drawn, in the cells its buttons are placed in. */
export interface ButtonPicture {
  /** The picture's own cells. */
  own: CellBox
  /** The Image it is drawn in: `own`, or an image block's whole drawing. */
  frame: CellBox
  /** The other pictures of that Image (an image block's other images). */
  siblings: readonly CellBox[]
}

/** A picture, every Image drawn in its cells' coordinates, and the cells its buttons may take there. */
export interface ButtonPlace {
  picture: ButtonPicture
  images: readonly CellBox[]
  bounds: ButtonBounds
}

/** A picture that is its whole Image, among `images` and within `bounds`. */
export function lonePlace(own: CellBox, images: readonly CellBox[], bounds: ButtonBounds): ButtonPlace {
  return { picture: { own, frame: own, siblings: [] }, images, bounds }
}

/** The place of each image of a block drawn at `frame`, from its `cells` (counted from the frame's top-left cell). */
export function blockPlaces(frame: CellBox, cells: readonly CellBox[], images: readonly CellBox[], bounds: ButtonBounds): ButtonPlace[] {
  const boxes = cells.map(cell => ({ ...cell, row: frame.row + cell.row, column: frame.column + cell.column }))
  return boxes.map((own, j) => ({ picture: { own, frame, siblings: boxes.filter((_, i) => i !== j) }, images, bounds }))
}

/**
 * An image piece's place, from its own top-left cell: the piece starts
 * `indent` columns in, the drawing ends at `right`, and its buttons may take
 * the blank row the pieces leave above it and below it.
 */
export function piecePlace(image: { rows: number; columns: number }, indent: number, right: number, blank: { above: boolean; below: boolean }): ButtonPlace {
  const own = { row: 0, column: 0, rows: image.rows, columns: image.columns }
  return lonePlace(own, [own], { left: -indent, right, top: blank.above ? -1 : 0, bottom: image.rows + (blank.below ? 1 : 0) })
}

/**
 * The cells a prose piece's buttons may take, among its `images` (from the
 * piece's top-left cell, which starts `indent` columns in): its columns up
 * to `right`, and its own rows, from its top row where a blank row opens it
 * (`openRow`, else from `firstRow`) down to its last picture's, below which
 * the next piece may draw one.
 */
export function proseBounds(images: readonly CellBox[], indent: number, right: number, openRow: boolean, firstRow: number): ButtonBounds {
  return { left: -indent, right, top: openRow ? 0 : firstRow, bottom: Math.max(...images.map(box => box.row + box.rows)) }
}

/** Cells between a picture and its buttons, and between two buttons in a row. */
export const BUTTON_GAP = 1

function overlaps(a: CellBox, b: CellBox): boolean {
  return a.column < b.column + b.columns && b.column < a.column + a.columns && a.row < b.row + b.rows && b.row < a.row + a.rows
}

const rowsMeet = (a: CellBox, b: CellBox) => a.row < b.row + b.rows && b.row < a.row + a.rows
const columnsMeet = (a: CellBox, b: CellBox) => a.column < b.column + b.columns && b.column < a.column + a.columns

/**
 * Where the buttons labeled `labels` go for `picture`, from its top-left
 * cell, among `images` (every Image drawn in the same coordinates, its own
 * among them) and within `bounds`:
 * stacked to the right of its Image, else to its left, else in one row above
 * it (right-aligned with the picture), else below it. Each side only where no
 * other picture of the same Image stands between, so the buttons sit by the
 * picture they act on; the first that stays in bounds and covers no Image.
 * Where none does, above it, so the picture itself stays whole.
 */
export function buttonSpot(picture: ButtonPicture, images: readonly CellBox[], labels: readonly string[], bounds: ButtonBounds): ButtonSpot {
  const { own, frame, siblings } = picture
  const width = (label: string) => [...label].length
  const stacked = { rows: labels.length, columns: Math.max(0, ...labels.map(width)) }
  const inRow = { rows: 1, columns: labels.reduce((sum, label) => sum + width(label), 0) + BUTTON_GAP * Math.max(0, labels.length - 1) }
  const aligned = (columns: number) => Math.max(bounds.left, Math.min(own.column + own.columns - columns, bounds.right - columns))
  const padded = { rows: stacked.rows, columns: stacked.columns + BUTTON_GAP }
  const none = { left: 0, right: 0 }
  const sides = [
    {
      box: { row: own.row, column: frame.column + frame.columns, ...padded },
      clear: !siblings.some(other => rowsMeet(other, own) && other.column >= own.column + own.columns),
      direction: 'column' as const,
      padding: { left: BUTTON_GAP, right: 0 },
    },
    {
      box: { row: own.row, column: frame.column - padded.columns, ...padded },
      clear: !siblings.some(other => rowsMeet(other, own) && other.column + other.columns <= own.column),
      direction: 'column' as const,
      padding: { left: 0, right: BUTTON_GAP },
    },
    {
      box: { row: frame.row - inRow.rows, column: aligned(inRow.columns), ...inRow },
      clear: !siblings.some(other => columnsMeet(other, own) && other.row + other.rows <= own.row),
      direction: 'row' as const,
      padding: none,
    },
    {
      box: { row: frame.row + frame.rows, column: aligned(inRow.columns), ...inRow },
      clear: !siblings.some(other => columnsMeet(other, own) && other.row >= own.row + own.rows),
      direction: 'row' as const,
      padding: none,
    },
  ]
  const fits = ({ box, clear }: (typeof sides)[number]) =>
    clear &&
    box.column >= bounds.left &&
    box.column + box.columns <= bounds.right &&
    box.row >= bounds.top &&
    box.row + box.rows <= bounds.bottom &&
    !images.some(image => overlaps(box, image))
  const above = { box: { row: frame.row - inRow.rows, column: aligned(inRow.columns), ...inRow }, direction: 'row' as const, padding: none }
  const chosen = sides.find(fits) ?? above
  return { top: chosen.box.row - own.row, left: chosen.box.column - own.column, direction: chosen.direction, padding: chosen.padding }
}
