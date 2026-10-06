// The replay of Claude Code's table drawing. The fixtures are the engine's own
// drawing of the same markdown, measured live on Claude Code 2.1.291
// (research/lab runs TB-lab1-c{120,80,60,45,35,28},
// TB-lab2-c{120,70,50,40,30,24} and TB-lab3-c{40,38,37,30,24,14,12}; every
// table below is one of lab 3's): bordered tables, shared and hard-wrapped
// column widths, overflowing no-break words, and the list form the engine
// falls back to, row for row.

import { describe, expect, test } from 'vitest'

import { readFileSync } from 'node:fs'

import { layoutTable, proseBlocks } from '../../src/layout/index.js'

const NB = ' '
const PAD = '⠀'

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')

/** The replay's rows of a table, as a terminal shows them (a zero-width mark folds into its cell, pyte drops it). */
const rows = (markdown: string, columns: number) => layoutTable(markdown, columns)?.lines.map(line => line.replace(/͏/g, ''))

describe('layoutTable: the engine, live', () => {
  for (const lab of ['table-lab1', 'table-lab2', 'table-lab3']) {
    test(`draws ${lab} row for row as the engine did, at every width measured`, () => {
      const markdown = fixture(`${lab}.md`).replace(/\n$/, '')
      const screens = JSON.parse(fixture(`${lab}-screens.json`)) as Record<string, Record<string, string[]>>
      const blocks = proseBlocks(markdown)!
      for (const [width, tables] of Object.entries(screens)) {
        for (const [start, screen] of Object.entries(tables)) {
          const block = blocks.find(one => one.start === Number(start))!
          expect(block.table).toBe(true)
          expect({ width, start, rows: rows(markdown.slice(block.start, block.end), Number(width)) }).toEqual({ width, start, rows: screen })
        }
      }
    })
  }
})

describe('layoutTable: columns', () => {
  test('ideal widths when they fit; the header centred, cells aligned by the delimiter row', () => {
    expect(rows('| a | bb | c |\n|:--|:-:|--:|\n| x | y | zzzz |', 40)).toEqual([
      '┌─────┬─────┬──────┐',
      '│  a  │ bb  │  c   │',
      '├─────┼─────┼──────┤',
      '│ x   │  y  │ zzzz │',
      '└─────┴─────┴──────┘',
    ])
  })

  test('too wide: each column its widest word and a share of the room left, cells wrapped and centred in their row', () => {
    const markdown = '| k | text |\n|---|---|\n| a | one two three four five six seven |'
    expect(rows(markdown, 30)).toEqual([
      '┌─────┬──────────────────┐',
      '│  k  │       text       │',
      '├─────┼──────────────────┤',
      '│     │ one two three    │',
      '│ a   │ four five six    │',
      '│     │ seven            │',
      '└─────┴──────────────────┘',
    ])
  })

  test('narrower than the widest words: words are cut', () => {
    expect(rows('| A | B |\n|---|---|\n| abcdefghijkl | mnopqrstuvwx |', 24)).toEqual([
      '┌────────┬────────┐',
      '│   A    │   B    │',
      '├────────┼────────┤',
      '│ abcdef │ mnopqr │',
      '│ ghijkl │ stuvwx │',
      '└────────┴────────┘',
    ])
  })

  test('a cell of more than four rows, or a line too wide, makes it the list form', () => {
    const long = '| A | B |\n|---|---|\n| one two three four five six seven eight nine ten | b |'
    expect(rows(long, 24)).toEqual(['A: one two three four', 'five six seven eight', 'nine ten', 'B: b'])
    expect(rows(`| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |`, 12)).toEqual(['a: 1', 'b: 2', '──────────', '─', 'a: 3', 'b: 4'])
  })

  test('the room is the terminal width less eight for one column, whatever the prose width', () => {
    const markdown = `| x |\n|---|\n| ${'w'.repeat(30)} |`
    expect(layoutTable(markdown, 38, [], 20)?.lines.slice(2, 4)).toEqual([`├${'─'.repeat(32)}┤`, `│ ${'w'.repeat(30)} │`])
    expect(layoutTable(markdown, 37, [], 20)?.lines.slice(3, 5)).toEqual([`│ ${'w'.repeat(29)} │`, `│ w${' '.repeat(28)} │`])
  })
})

describe('layoutTable: spans', () => {
  const span = (markdown: string, text: string) => {
    const start = markdown.indexOf(text)
    return { start, end: start + text.length, width: [...text].length }
  }

  test('finds a preview in a cell and in the header', () => {
    const cell = `𝛼${PAD}${PAD}`
    const head = `𝑥${NB}+${NB}𝑦${PAD}`
    const markdown = `| Symbol | ${head} |\n|---|---:|\n| ${cell} | learning rate |`
    const layout = layoutTable(markdown, 60, [span(markdown, cell), span(markdown, head)])!
    expect(layout.lines[3]).toBe(`│ ${cell}    │ learning rate │`)
    expect(layout.places).toEqual([
      { row: 3, col: 2, columns: 3 },
      { row: 1, col: 14, columns: 6 },
    ])
  })

  test('finds it after an escaped bar, and in the list form where it is whole on a row', () => {
    const preview = `\\|𝑥\\|${PAD}`
    const markdown = `| norm | value |\n|---|---|\n| ${preview} | 1 |`
    const at = { ...span(markdown, preview), width: 4 }
    const layout = layoutTable(markdown, 40, [at])!
    expect(layout.lines[3]).toBe('│ |𝑥|⠀ │ 1     │')
    expect(layout.places[0]).toEqual({ row: 3, col: 2, columns: 4 })
    expect(layoutTable(markdown, 12, [at])?.places[0]).toEqual({ row: 0, col: 6, columns: 4 })
  })

  test('a preview split over two rows of its cell is not placed', () => {
    const preview = `a${NB}+${NB}b${NB}+${NB}c${NB}+${NB}d${PAD}`
    const markdown = `| k | v |\n|---|---|\n| x | ${preview} words |`
    expect(layoutTable(markdown, 120, [span(markdown, preview)])?.places[0]).not.toBeNull()
    // In the list form no-break spaces become spaces, so the preview may wrap.
    const narrow = layoutTable(markdown, 14, [span(markdown, preview)])!
    // A trailing space past a full row takes a blank row of its own.
    expect(narrow.lines).toEqual(['k: x', 'v: a + b + c', '', '+ d⠀ words'])
    expect(narrow.places[0]).toBeNull()
  })

  test('a paragraph right before the table wraps at the prose width, a blank row above the table', () => {
    const markdown = 'Here are the symbols used below:\n| a | b |\n|---|---|\n| 1 | 2 |'
    expect(layoutTable(markdown, 60, [], 20)?.lines).toEqual(['Here are the symbols', 'used below:', '', '┌─────┬─────┐', '│  a  │  b  │', '├─────┼─────┤', '│ 1   │ 2   │', '└─────┴─────┘'])
    expect(proseBlocks(markdown)).toEqual([{ start: 0, end: markdown.length, paragraph: false, table: true }])
  })
})

describe('layoutTable: what it does not follow', () => {
  test('a bar inside a code span, a row with more cells than the header, links, HTML, unknown widths', () => {
    expect(layoutTable('| a | b |\n|---|---|\n| `x|y` | 2 |', 60)).toBeNull()
    expect(layoutTable('| a | b |\n|---|---|\n| 1 | 2 | 3 |', 60)).toBeNull()
    expect(layoutTable('| a | b |\n|---|---|\n| [x](y) | 2 |', 60)).toBeNull()
    expect(layoutTable('| a | b |\n|---|---|\n| <b>x</b> | 2 |', 60)).toBeNull()
    expect(layoutTable('| a | b |\n|---|---|\n| ❤️ | 2 |', 60)).toBeNull()
    expect(layoutTable('| a | b |\n|---|---|\n| `x ` | 2 |', 60)).toBeNull()
  })

  test('more rows than the engine draws, and anything that is not a table', () => {
    const many = `| a |\n|---|\n${Array.from({ length: 201 }, (_, k) => `| ${k} |`).join('\n')}`
    expect(layoutTable(many, 60)).toBeNull()
    expect(layoutTable('just a paragraph', 60)).toBeNull()
    expect(layoutTable('| a |\n|---|\n| 1 |\n\n- then a list', 60)).toBeNull()
  })

  test('a row with fewer cells than the header is padded with empty ones', () => {
    expect(rows('| a | b |\n|---|---|\n| 1 |', 30)).toEqual(['┌─────┬─────┐', '│  a  │  b  │', '├─────┼─────┤', '│ 1   │     │', '└─────┴─────┘'])
  })
})
