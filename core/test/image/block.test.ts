import { describe, expect, test } from 'vitest'
import { fitImage, imageBlock, LINE_WIDTH_PT, parseLength, resolveImagePath } from '../../src/image/block.ts'

describe('imageBlock: which ```latex blocks are an image', () => {
  test('a lone \\includegraphics, with or without options', () => {
    expect(imageBlock('\\includegraphics{/tmp/plot.png}')).toEqual({ path: '/tmp/plot.png' })
    expect(imageBlock('  \\includegraphics[width=0.8\\linewidth]{figures/a.pdf}\n')).toEqual({ path: 'figures/a.pdf', width: { kind: 'line', fraction: 0.8 } })
    expect(imageBlock('\\includegraphics*[scale=0.5]{"/my dir/a b.jpg"}')).toEqual({ path: '/my dir/a b.jpg', scale: 0.5 })
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
    expect(imageBlock(figure)).toEqual({ path: '~/out/loss.svg', width: { kind: 'line', fraction: 1 }, height: { kind: 'absolute', pt: (5 * 72.27) / 2.54 } })
    expect(imageBlock('\\begin{center}\n\\includegraphics{a.png}\n\\end{center}')).toEqual({ path: 'a.png' })
    expect(imageBlock('\\begin{figure*}\\begin{center}\\includegraphics{a.png}\\end{center}\\end{figure*}')).toEqual({ path: 'a.png' })
  })

  test('anything else is not an image block', () => {
    // A drawing, which TeX draws (or which stays code).
    expect(imageBlock('\\begin{tikzpicture}\n\\draw (0,0) -- (1,1);\n\\end{tikzpicture}')).toBeUndefined()
    // Two images, text beside one, a commented-out image, an empty path, an unbalanced environment.
    expect(imageBlock('\\includegraphics{a.png}\n\\includegraphics{b.png}')).toBeUndefined()
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

  test('fractional cells: a width of exactly thirty cells takes thirty, not thirty-one', () => {
    // 291 / 9.7 is 30.000000000000004 in floating point.
    expect(fitImage({ width: 291, height: 20 }, {}, { maxColumns: 80, maxRows: 30, cellWidth: 9.7, cellHeight: 20 })).toEqual({ columns: 30, rows: 1, widthPx: 291, heightPx: 20 })
  })
})
