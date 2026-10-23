import { describe, expect, test } from 'vitest'
import { type BlockImage, fitImage, fitImageBlock, IMAGE_GAP, imageBlock, type ImageBlock, type ImageSpec, LINE_WIDTH_PT, MAX_BLOCK_IMAGES, parseLength, resolveImagePath } from '../../src/image/block.ts'

/** A block of one image. */
const one = (spec: ImageSpec): ImageBlock => ({ rows: [[spec]] })

describe('imageBlock: which ```latex blocks are an image', () => {
  test('a lone \\includegraphics, with or without options', () => {
    expect(imageBlock('\\includegraphics{/tmp/plot.png}')).toEqual(one({ path: '/tmp/plot.png' }))
    expect(imageBlock('  \\includegraphics[width=0.8\\linewidth]{figures/a.pdf}\n')).toEqual(one({ path: 'figures/a.pdf', width: { kind: 'line', fraction: 0.8 } }))
    expect(imageBlock('\\includegraphics*[scale=0.5]{"/my dir/a b.jpg"}')).toEqual(one({ path: '/my dir/a b.jpg', scale: 0.5 }))
  })

  test('inside figure or center, with \\centering, a caption, a label and comments', () => {
    const figure = [
      '\\begin{figure}[htbp]',
      '  \\centering % the plot',
      '  \\includegraphics[width=\\textwidth, height=5cm, keepaspectratio]{~/out/loss.svg}',
      '  \\caption{Loss over {epochs}, $\\alpha = 0.1$}',
      '  \\label{fig:loss}',
      '\\end{figure}',
    ].join('\n')
    expect(imageBlock(figure)).toEqual(one({ path: '~/out/loss.svg', width: { kind: 'line', fraction: 1 }, height: { kind: 'absolute', pt: (5 * 72.27) / 2.54 } }))
    expect(imageBlock('\\begin{center}\n\\includegraphics{a.png}\n\\end{center}')).toEqual(one({ path: 'a.png' }))
    expect(imageBlock('\\begin{figure*}\\begin{center}\\includegraphics{a.png}\\end{center}\\end{figure*}')).toEqual(one({ path: 'a.png' }))
    // Blank lines and \par around a lone image start no row of their own.
    expect(imageBlock('\\begin{figure}\n\n\\centering\n\n\\includegraphics{a.png}\n\n\\caption{A}\\par\n\\end{figure}')).toEqual(one({ path: 'a.png' }))
  })

  test('several \\includegraphics side by side, whatever spacing stands between them', () => {
    const half = { kind: 'line', fraction: 0.45 } as const
    const row = { rows: [[{ path: 'a.png', width: half }, { path: 'b.png', width: half }]] }
    expect(imageBlock('\\includegraphics[width=0.45\\linewidth]{a.png} \\includegraphics[width=0.45\\linewidth]{b.png}')).toEqual(row)
    for (const between of ['~', '\\hfill', '\\quad', '\\qquad', '\\hspace{1cm}', '\\hspace*{2em}', '\n', '%\n']) {
      expect(imageBlock(`\\includegraphics[width=0.45\\linewidth]{a.png}${between}\\includegraphics[width=0.45\\linewidth]{b.png}`)).toEqual(row)
    }
    // Each sized by its own options, in a figure with a caption.
    expect(imageBlock('\\begin{figure}\\centering\n\\includegraphics[scale=0.5]{a.png}\\hfill\\includegraphics[height=3cm]{b.svg}\n\\caption{Both}\\end{figure}')).toEqual({
      rows: [[{ path: 'a.png', scale: 0.5 }, { path: 'b.svg', height: { kind: 'absolute', pt: 3 * (72.27 / 2.54) } }]],
    })
  })

  test('subfigure and minipage, each holding one image and its caption, the box its width', () => {
    const figure = [
      '\\begin{figure}[t]',
      '  \\centering',
      '  \\begin{subfigure}[b]{0.48\\textwidth}',
      '    \\centering',
      '    \\includegraphics[width=\\linewidth]{loss.png}',
      '    \\caption{Loss}\\label{fig:loss}',
      '  \\end{subfigure}%',
      '  \\hfill',
      '  \\begin{minipage}[t][4cm][c]{5cm}',
      '    \\includegraphics[width=0.8\\linewidth]{acc.pdf}',
      '    \\subcaption{Accuracy}',
      '  \\end{minipage}',
      '  \\caption{Training}',
      '\\end{figure}',
    ].join('\n')
    expect(imageBlock(figure)).toEqual({
      rows: [
        [
          { path: 'loss.png', width: { kind: 'line', fraction: 1 }, box: { kind: 'line', fraction: 0.48 } },
          { path: 'acc.pdf', width: { kind: 'line', fraction: 0.8 }, box: { kind: 'absolute', pt: (5 * 72.27) / 2.54 } },
        ],
      ],
    })
  })

  test('\\\\, \\par or a blank line between images starts the next row; a comment line does not', () => {
    const grid = { rows: [[{ path: 'a.png' }, { path: 'b.png' }], [{ path: 'c.png' }]] }
    expect(imageBlock('\\includegraphics{a.png}\\includegraphics{b.png}\\\\\n\\includegraphics{c.png}')).toEqual(grid)
    expect(imageBlock('\\includegraphics{a.png}\\includegraphics{b.png}\\\\[2mm]\\includegraphics{c.png}')).toEqual(grid)
    expect(imageBlock('\\includegraphics{a.png}\\includegraphics{b.png}\\par\\includegraphics{c.png}')).toEqual(grid)
    expect(imageBlock('\\includegraphics{a.png}\n\\includegraphics{b.png}\n\n\\includegraphics{c.png}')).toEqual(grid)
    expect(imageBlock('\\includegraphics{a.png}\n\\includegraphics{b.png}\n% the third\n\\includegraphics{c.png}')).toEqual({ rows: [[{ path: 'a.png' }, { path: 'b.png' }, { path: 'c.png' }]] })
    // A blank line inside a subfigure is its own, not the row's.
    expect(imageBlock('\\begin{subfigure}{0.5\\linewidth}\n\\includegraphics{a.png}\n\n\\caption{A}\n\\end{subfigure}\\begin{subfigure}{0.5\\linewidth}\\includegraphics{b.png}\\end{subfigure}')?.rows).toHaveLength(1)
  })

  test(`at most ${MAX_BLOCK_IMAGES} images`, () => {
    const images = (n: number) => Array.from({ length: n }, (_, i) => `\\includegraphics{${i}.png}`).join('\n')
    expect(imageBlock(images(MAX_BLOCK_IMAGES))?.rows[0]).toHaveLength(MAX_BLOCK_IMAGES)
    expect(imageBlock(images(MAX_BLOCK_IMAGES + 1))).toBeUndefined()
  })

  test('mixed content that is not images side by side stays code', () => {
    // Text between two images, an image beside a drawing.
    expect(imageBlock('\\includegraphics{a.png} and \\includegraphics{b.png}')).toBeUndefined()
    expect(imageBlock('\\includegraphics{a.png}\\hfill\\begin{tikzpicture}\\draw (0,0) -- (1,1);\\end{tikzpicture}')).toBeUndefined()
    // A subfigure holding two images, or none; one with no width, or a height for a width; one inside another.
    expect(imageBlock('\\begin{subfigure}{0.5\\linewidth}\\includegraphics{a.png}\\includegraphics{b.png}\\end{subfigure}')).toBeUndefined()
    expect(imageBlock('\\begin{subfigure}{0.5\\linewidth}\\caption{empty}\\end{subfigure}\\includegraphics{a.png}')).toBeUndefined()
    expect(imageBlock('\\begin{subfigure}\\includegraphics{a.png}\\end{subfigure}')).toBeUndefined()
    expect(imageBlock('\\begin{minipage}{0.3\\textheight}\\includegraphics{a.png}\\end{minipage}')).toBeUndefined()
    expect(imageBlock('\\begin{subfigure}{0.5\\linewidth}\\begin{minipage}{\\linewidth}\\includegraphics{a.png}\\end{minipage}\\end{subfigure}')).toBeUndefined()
    // A subfigure closed as a minipage, a figure inside a subfigure, a subfigure never closed.
    expect(imageBlock('\\begin{subfigure}{0.5\\linewidth}\\includegraphics{a.png}\\end{minipage}')).toBeUndefined()
    expect(imageBlock('\\begin{subfigure}{0.5\\linewidth}\\begin{figure}\\includegraphics{a.png}\\end{figure}\\end{subfigure}')).toBeUndefined()
    expect(imageBlock('\\begin{subfigure}{0.5\\linewidth}\\includegraphics{a.png}')).toBeUndefined()
    // The old subfig package's \subfloat is not read.
    expect(imageBlock('\\subfloat[A]{\\includegraphics{a.png}}\\subfloat[B]{\\includegraphics{b.png}}')).toBeUndefined()
  })

  test('anything else is not an image block', () => {
    // A drawing, which TeX draws (or which stays code).
    expect(imageBlock('\\begin{tikzpicture}\n\\draw (0,0) -- (1,1);\n\\end{tikzpicture}')).toBeUndefined()
    // Text beside an image, a commented-out image, an empty path, an unbalanced environment.
    expect(imageBlock('Here is the plot: \\includegraphics{a.png}')).toBeUndefined()
    expect(imageBlock('% \\includegraphics{a.png}')).toBeUndefined()
    expect(imageBlock('\\includegraphics{ }')).toBeUndefined()
    expect(imageBlock('\\begin{figure}\\includegraphics{a.png}')).toBeUndefined()
    expect(imageBlock('\\begin{figure}\\includegraphics{a.png}\\end{center}')).toBeUndefined()
    // An image inside a picture, a caption that never closes, a whole document.
    expect(imageBlock('\\begin{tikzpicture}\\node {\\includegraphics{a.png}};\\end{tikzpicture}')).toBeUndefined()
    expect(imageBlock('\\includegraphics{a.png}\\caption{open')).toBeUndefined()
    expect(imageBlock('\\documentclass{article}\\begin{document}\\includegraphics{a.png}\\end{document}')).toBeUndefined()
    expect(imageBlock('')).toBeUndefined()
  })
})

describe('parseLength', () => {
  test('fractions of the line or the text height, and absolute units', () => {
    expect(parseLength('0.5\\linewidth')).toEqual({ kind: 'line', fraction: 0.5 })
    expect(parseLength('.3\\columnwidth')).toEqual({ kind: 'line', fraction: 0.3 })
    expect(parseLength('0.4\\textheight')).toEqual({ kind: 'page', fraction: 0.4 })
    expect(parseLength('72.27pt')).toEqual({ kind: 'absolute', pt: 72.27 })
    expect(parseLength('1in')).toEqual({ kind: 'absolute', pt: 72.27 })
    expect(parseLength('10mm')?.kind).toBe('absolute')
  })

  test('what it does not read', () => {
    expect(parseLength('5')).toBeUndefined()
    expect(parseLength('5furlongs')).toBeUndefined()
    expect(parseLength('2\\baselineskip')).toBeUndefined()
    expect(parseLength('-1cm')).toBeUndefined()
    expect(parseLength('0\\linewidth')).toBeUndefined()
  })
})

describe('resolveImagePath', () => {
  test('absolute, home and working-directory paths, dots folded', () => {
    expect(resolveImagePath('/data/./a/../plot.png', '/w', '/home/u')).toBe('/data/plot.png')
    expect(resolveImagePath('~/fig.png', '/w', '/home/u')).toBe('/home/u/fig.png')
    expect(resolveImagePath('out/fig.png', '/w/project', '/home/u')).toBe('/w/project/out/fig.png')
    expect(resolveImagePath('../fig.png', '/w/project', '/home/u')).toBe('/w/fig.png')
  })

  test('what cannot be placed', () => {
    expect(resolveImagePath('~other/fig.png', '/w', '/home/u')).toBeUndefined()
    expect(resolveImagePath('~/fig.png', '/w', undefined)).toBeUndefined()
    expect(resolveImagePath('fig.png', undefined, '/home/u')).toBeUndefined()
  })
})

describe('fitImage', () => {
  // 80 columns of 10 px (800 px), 30 rows of 20 px (600 px).
  const box = { maxColumns: 80, maxRows: 30, cellWidth: 10, cellHeight: 20 }

  test('without options: as wide as the column, never past its own pixels', () => {
    expect(fitImage({ width: 1600, height: 400 }, {}, box)).toEqual({ columns: 80, rows: 10, widthPx: 800, heightPx: 200 })
    expect(fitImage({ width: 200, height: 100 }, {}, box)).toEqual({ columns: 20, rows: 5, widthPx: 200, heightPx: 100 })
  })

  test('the rows cap a tall image, its aspect ratio kept', () => {
    expect(fitImage({ width: 1000, height: 2000 }, {}, box)).toEqual({ columns: 30, rows: 30, widthPx: 300, heightPx: 600 })
  })

  test('width and height as fractions and absolute lengths', () => {
    const big = { width: 4000, height: 2000 }
    expect(fitImage(big, { width: { kind: 'line', fraction: 0.5 } }, box)).toEqual({ columns: 40, rows: 10, widthPx: 400, heightPx: 200 })
    expect(fitImage(big, { width: { kind: 'absolute', pt: LINE_WIDTH_PT / 4 } }, box)).toEqual({ columns: 20, rows: 5, widthPx: 200, heightPx: 100 })
    expect(fitImage(big, { height: { kind: 'page', fraction: 0.5 } }, box)).toEqual({ columns: 60, rows: 15, widthPx: 600, heightPx: 300 })
    // Both: the image fits inside both, as with keepaspectratio.
    expect(fitImage(big, { width: { kind: 'line', fraction: 1 }, height: { kind: 'page', fraction: 0.25 } }, box)).toEqual({ columns: 30, rows: 8, widthPx: 300, heightPx: 150 })
    // Wider than the column is the column.
    expect(fitImage(big, { width: { kind: 'line', fraction: 2 } }, box).widthPx).toBe(800)
  })

  test('scale is against its own pixels, and never upscales', () => {
    expect(fitImage({ width: 400, height: 200 }, { scale: 0.5 }, box)).toEqual({ columns: 20, rows: 5, widthPx: 200, heightPx: 100 })
    expect(fitImage({ width: 400, height: 200 }, { scale: 3 }, box).widthPx).toBe(400)
    expect(fitImage({ width: 100, height: 50 }, { width: { kind: 'line', fraction: 1 } }, box).widthPx).toBe(100)
  })

  test('partial cells round up, and a one-pixel image takes a cell', () => {
    expect(fitImage({ width: 205, height: 41 }, {}, box)).toEqual({ columns: 21, rows: 3, widthPx: 205, heightPx: 41 })
    expect(fitImage({ width: 1, height: 1 }, {}, box)).toEqual({ columns: 1, rows: 1, widthPx: 1, heightPx: 1 })
  })

  test('fitImageBlock sizes a lone image as fitImage does', () => {
    for (const [own, spec] of [[{ width: 1600, height: 400 }, {}], [{ width: 4000, height: 2000 }, { height: { kind: 'page', fraction: 0.5 } }], [{ width: 205, height: 41 }, {}]] as const) {
      const fit = fitImage(own, spec, box)
      expect(fitImageBlock([own], one({ path: 'a.png', ...spec }), box)).toEqual({ ...fit, images: [{ x: 0, y: 0, widthPx: fit.widthPx, heightPx: fit.heightPx }] })
    }
  })

  test('fractional cells: a width of exactly thirty cells takes thirty, not thirty-one', () => {
    // 291 / 9.7 is 30.000000000000004 in floating point.
    expect(fitImage({ width: 291, height: 20 }, {}, { maxColumns: 80, maxRows: 30, cellWidth: 9.7, cellHeight: 20 })).toEqual({ columns: 30, rows: 1, widthPx: 291, heightPx: 20 })
  })
})

describe("fitImageBlock: a block's images in rows", () => {
  // 80 columns of 10 px (800 px), 30 rows of 20 px (600 px): images stand 24 px apart.
  const box = { maxColumns: 80, maxRows: 30, cellWidth: 10, cellHeight: 20 }
  const gap = IMAGE_GAP * 800
  const row = (...images: BlockImage[]): ImageBlock => ({ rows: [images] })

  test('side by side, each by its own options, a gap between them', () => {
    const half = { kind: 'line', fraction: 0.45 } as const
    const fit = fitImageBlock([{ width: 400, height: 200 }, { width: 900, height: 900 }], row({ path: 'a', width: half }, { path: 'b', scale: 0.2 }), box)
    // 360 × 180 and 180 × 180, 24 px apart: 564 px across, both 180 tall.
    expect(gap).toBe(24)
    expect(fit).toEqual({ columns: 57, rows: 9, widthPx: 564, heightPx: 180, images: [{ x: 0, y: 0, widthPx: 360, heightPx: 180 }, { x: 384, y: 0, widthPx: 180, heightPx: 180 }] })
  })

  test('a shorter image is centred on the row, and a row too wide for the column shrinks as a whole', () => {
    // Each as wide as the column (800 × 400, 800 × 200): 1624 px across, scaled by 800 / 1624.
    const fit = fitImageBlock([{ width: 1000, height: 500 }, { width: 1600, height: 400 }], row({ path: 'a' }, { path: 'b' }), box)
    const k = 800 / 1624
    expect(fit).toEqual({
      columns: 80,
      rows: 10,
      widthPx: 800,
      heightPx: Math.round(400 * k),
      images: [
        { x: 0, y: 0, widthPx: Math.round(800 * k), heightPx: Math.round(400 * k) },
        { x: Math.round(824 * k), y: Math.round(100 * k), widthPx: Math.round(800 * k), heightPx: Math.round(200 * k) },
      ],
    })
  })

  test("in a subfigure, \\linewidth is the box's, and the image is centred in the box", () => {
    const fit = fitImageBlock(
      [{ width: 100, height: 100 }, { width: 1000, height: 500 }],
      row({ path: 'a', box: { kind: 'line', fraction: 0.45 } }, { path: 'b', width: { kind: 'line', fraction: 1 }, box: { kind: 'line', fraction: 0.45 } }),
      box,
    )
    // Two 360 px boxes: a at its own 100 px in the middle of the first, b at the second box's width.
    expect(fit.widthPx).toBe(360 + gap + 360)
    expect(fit.images).toEqual([{ x: 130, y: 40, widthPx: 100, heightPx: 100 }, { x: 384, y: 0, widthPx: 360, heightPx: 180 }])
    // An absolute box is measured against the column, as an absolute width is.
    const absolute = fitImageBlock([{ width: 1000, height: 500 }], row({ path: 'a', box: { kind: 'absolute', pt: LINE_WIDTH_PT / 4 } }), box)
    expect(absolute.images).toEqual([{ x: 0, y: 0, widthPx: 200, heightPx: 100 }])
  })

  test('rows stack a gap apart, each centred across the widest; too tall, all of it shrinks', () => {
    const small = { width: 200, height: 100 }
    const fit = fitImageBlock([small, small, small], { rows: [[{ path: 'a' }, { path: 'b' }], [{ path: 'c' }]] }, box)
    expect(fit).toMatchObject({ widthPx: 424, heightPx: 224 })
    expect(fit.images).toEqual([
      { x: 0, y: 0, widthPx: 200, heightPx: 100 },
      { x: 224, y: 0, widthPx: 200, heightPx: 100 },
      { x: 112, y: 124, widthPx: 200, heightPx: 100 },
    ])
    // Two squares as tall as the rows allow (600 px each): 1224 px down, scaled to 600.
    const tall = fitImageBlock([{ width: 1000, height: 1000 }, { width: 1000, height: 1000 }], { rows: [[{ path: 'a' }], [{ path: 'b' }]] }, box)
    expect(tall).toMatchObject({ rows: 30, heightPx: 600, widthPx: Math.round(600 * (600 / 1224)) })
  })
})
