// Links in the replay of Claude Code's prose and list layout. Every drawing
// below was measured on the live engine (Claude Code 2.1.291, research/lab
// runs LK1 and LK2 for the forms, LKe2-* for the fixture, LKr* for random
// labs), with hyperlinks on (TERM=xterm-kitty) and off (FORCE_HYPERLINK=0).

import { describe, expect, test } from 'vitest'

import { readFileSync } from 'node:fs'

import { engineHyperlinks, layoutList, layoutProse, proseBlocks, visibleProse } from '../../src/layout/index.js'
import type { LinkMode } from '../../src/layout/index.js'

const ON: LinkMode = { hyperlinks: true }
const OFF: LinkMode = { hyperlinks: false }

const lines = (layout: { lines: string[] } | null) => layout?.lines.map(line => line.trimEnd()) ?? null

const drawn = (markdown: string, mode: LinkMode) => visibleProse(markdown, mode)?.text ?? null

function replyRows(markdown: string, width: number, mode: LinkMode): string[] | null {
  const rows: string[] = []
  for (const [k, block] of (proseBlocks(markdown) ?? []).entries()) {
    const text = markdown.slice(block.start, block.end)
    const layout = block.list ? layoutList(text, width, [], mode) : block.paragraph ? layoutProse(text, width, [], mode) : null
    if (!layout) return null
    if (k > 0) rows.push('')
    rows.push(...layout.lines.map(line => line.trimEnd()))
  }
  return rows
}

describe('what the engine draws for each link form', () => {
  test('[text](url): the text alone with hyperlinks, `text (url)` without', () => {
    const md = 'see [the docs](https://example.com/docs) here'
    expect(drawn(md, ON)).toBe('see the docs here')
    expect(drawn(md, OFF)).toBe('see the docs (https://example.com/docs) here')
  })

  test("a link's text is drawn as inline markdown, but its plain text keeps entities as written", () => {
    expect(drawn('[`run()` and *em*](https://example.com/x) and **[bold](https://example.com/y)**', ON)).toBe('run() and em and bold')
    expect(drawn('[a&nbsp;b](https://example.com/n) and [a\\*b](https://example.com/m)', ON)).toBe('a&nbsp;b and a*b')
    expect(drawn('[a&nbsp;b](https://example.com/n)', OFF)).toBe('a&nbsp;b (https://example.com/n)')
  })

  test('<https://…> and bare urls: the url as written, trailing punctuation outside it', () => {
    const md = 'at <https://example.com/a?b=1> and https://example.com/p). and (https://example.com/q) and https://example.com/r?. end'
    const want = 'at https://example.com/a?b=1 and https://example.com/p). and (https://example.com/q) and https://example.com/r?. end'
    expect(drawn(md, ON)).toBe(want)
    expect(drawn(md, OFF)).toBe(want)
    expect(drawn('url https://example.com/s&amp; x', ON)).toBe('url https://example.com/s&amp; x')
  })

  test('a bare www. url gains http:// without hyperlinks', () => {
    expect(drawn('then www.example.org. end', ON)).toBe('then www.example.org. end')
    expect(drawn('then www.example.org. end', OFF)).toBe('then http://www.example.org. end')
  })

  test('an empty text, or one equal to the url, draws the url; without hyperlinks so does a bare host', () => {
    expect(drawn('a [](https://example.com/e) b', ON)).toBe('a https://example.com/e b')
    expect(drawn('[https://example.com/s](https://example.com/s) and [example.com](https://example.com)', ON)).toBe('https://example.com/s and example.com')
    expect(drawn('[https://example.com/s](https://example.com/s) and [example.com](https://example.com)', OFF)).toBe(
      'https://example.com/s and https://example.com',
    )
  })

  test('a title follows the link in parentheses', () => {
    expect(drawn('[t](https://example.com "Title") ok', ON)).toBe('t ("Title") ok')
    expect(drawn('[t](https://example.com "Title") ok', OFF)).toBe('t (https://example.com) ("Title") ok')
  })

  test('mail links are never hyperlinks: the address, or the text as written and the address', () => {
    const md = '[write](mailto:a@b.com) and [a@b.com](mailto:a@b.com) and <c@d.org> and [**hi**](mailto:e@f.io) and me@example.com.'
    const want = 'write (a@b.com) and a@b.com and c@d.org and **hi** (e@f.io) and me@example.com.'
    expect(drawn(md, ON)).toBe(want)
    expect(drawn(md, OFF)).toBe(want)
  })

  test('owner/repo#12 and @user are drawn as written', () => {
    const md = 'issue anthropics/claude-code#123 and @someone *and a/b#4*'
    expect(drawn(md, ON)).toBe('issue anthropics/claude-code#123 and @someone and a/b#4')
    expect(drawn(md, OFF)).toBe('issue anthropics/claude-code#123 and @someone and a/b#4')
    expect(drawn('only acme/repo#12 here', {})).toBe('only acme/repo#12 here')
  })

  test('a plain relative path links as written; reference links are not read', () => {
    expect(drawn('[the file](core/src/layout/prose.ts#L12) end', ON)).toBe('the file end')
    expect(drawn('[rel](foo/bar.md) and [ftp](ftp://x.org/f)', OFF)).toBe('rel (foo/bar.md) and ftp (ftp://x.org/f)')
    expect(drawn('ref [ref link][r] and [r] end.', ON)).toBe('ref [ref link][r] and [r] end.')
  })
})

describe('what is not followed', () => {
  test('links when the link mode is unknown', () => {
    for (const md of ['see [x](https://a.b)', 'see https://a.b', 'see <https://a.b>', 'mail *me@example.com*.']) expect(visibleProse(md)).toBeNull()
    // A text with no markdown at all is drawn as written, a bare email included.
    expect(drawn('mail me@example.com.', {})).toBe('mail me@example.com.')
  })

  test('urls the engine resolves as files, or marks as artifacts', () => {
    for (const href of ['file:///etc/x', '/abs/path', '../up.md', 'a/../b', 'foo bar', 'a%20b', 'C:\\x', 'https://claude.ai/code/artifact/x']) {
      expect(visibleProse(`[x](<${href}>)`, ON)).toBeNull()
    }
    // Without hyperlinks the url is drawn as written beside the text.
    expect(drawn('[x](/abs/path)', OFF)).toBe('x (/abs/path)')
  })

  test('a block holding ⧉ with a link in it (the engine moves urls around it), images and HTML', () => {
    expect(visibleProse('⧉ [x](https://a.b)', ON)).toBeNull()
    expect(visibleProse('⧉ acme/repo#1', ON)).toBeNull()
    expect(drawn('⧉ alone', ON)).toBe('⧉ alone')
    expect(visibleProse('an ![image](https://a.b/i.png)', ON)).toBeNull()
    expect(visibleProse('a <b>c</b> <https://a.b>', ON)).toBeNull()
  })
})

describe('wrapping', () => {
  test('a link wraps at the spaces of its drawn text, inside it or not', () => {
    expect(lines(layoutProse('x [a link whose text wraps](https://example.com/w) tail', 14, [], ON))).toEqual(['x a link whose', 'text wraps', 'tail'])
    expect(lines(layoutProse('x [a](https://example.com/w) tail', 14, [], OFF))).toEqual(['x a (https://e', 'xample.com/w)', 'tail'])
  })

  test('a url wider than the row is cut into rows', () => {
    const url = `https://example.com/${'a'.repeat(30)}`
    expect(lines(layoutProse(`see ${url} end`, 20, [], ON))).toEqual(['see https://example.', `com/${'a'.repeat(16)}`, `${'a'.repeat(14)} end`])
  })

  test('formulas in and after links keep their places', () => {
    const md = '[𝑓(𝑥)⠀⠀ the map](https://example.com/f) and [write](mailto:a@b.co) then 𝑥ₖ⠀ here'
    const f = md.indexOf('𝑓')
    const x = md.indexOf('𝑥ₖ')
    const spans = [
      { start: f, end: f + '𝑓(𝑥)⠀⠀'.length, width: 6 },
      { start: x, end: x + '𝑥ₖ⠀'.length, width: 3 },
    ]
    expect(layoutProse(md, 80, spans, ON)?.places).toEqual([
      { row: 0, col: 0, columns: 6 },
      { row: 0, col: 39, columns: 3 }, // after 'write (a@b.co) then '
    ])
    expect(layoutProse(md, 80, spans, OFF)?.places).toEqual([
      { row: 0, col: 0, columns: 6 },
      { row: 0, col: 63, columns: 3 }, // after ' (https://example.com/f)'
    ])
  })
})

describe('lists', () => {
  test('item text holding links is laid out, glue outside the links only', () => {
    const md = '- [the docs](https://example.com/docs) step 3. holds, then [step 4. inside](https://example.com/s) 5. done'
    expect(layoutList(md, 40, [], ON)?.lines).toEqual(['- the docs step\u00a03. holds, then step 4.', '  inside\u00a05. done'])
    expect(layoutList(md, 40, [], {})).toBeNull()
  })

  test('a number glued before an issue link (its escape) is refused with hyperlinks, plain without', () => {
    const md = '- aaaa bbbb cccc dddd glue 5)acme/repo#1 here'
    expect(layoutList(md, 30, [], ON)).toBeNull()
    expect(layoutList(md, 30, [], OFF)?.lines).toEqual(['- aaaa bbbb cccc dddd glue', '  5)acme/repo#1 here'])
    expect(layoutList('- see acme/repo#1 and 5. more', 30, [], ON)?.lines).toEqual(['- see acme/repo#1 and\u00a05. more'])
  })
})

describe('the live fixture', () => {
  const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')

  test('paragraphs and lists full of links, row for row as the engine drew them (research/lab runs LKe2-*)', () => {
    const markdown = fixture('links-edge.md').replace(/\n$/, '')
    const screens = JSON.parse(fixture('links-edge-screens.json')) as Record<string, string[]>
    expect(Object.keys(screens)).toHaveLength(8)
    for (const [key, screen] of Object.entries(screens)) {
      const [width, mode] = key.split('-')
      expect(replyRows(markdown, Number(width), mode === 'on' ? ON : OFF)).toEqual(screen)
    }
  })
})

describe('engineHyperlinks', () => {
  test('kitty and Ghostty draw hyperlinks; FORCE_HYPERLINK decides first', () => {
    expect(engineHyperlinks({ TERM: 'xterm-kitty' })).toBe(true)
    expect(engineHyperlinks({ TERM: 'xterm-ghostty', TERM_PROGRAM: 'ghostty' })).toBe(true)
    expect(engineHyperlinks({ TERM: 'xterm-kitty', FORCE_HYPERLINK: '0' })).toBe(false)
    expect(engineHyperlinks({ TERM: 'xterm-256color', FORCE_HYPERLINK: '1' })).toBe(true)
    expect(engineHyperlinks({ TERM: 'xterm-256color', FORCE_HYPERLINK: '' })).toBeUndefined()
  })

  test('other terminals by their variables; unknown where colour support decides', () => {
    expect(engineHyperlinks({ TERM: 'xterm-256color' })).toBe(false)
    expect(engineHyperlinks({ TERM_PROGRAM: 'tmux', TERM_PROGRAM_VERSION: '3.4' })).toBe(true)
    expect(engineHyperlinks({ TERM_PROGRAM: 'tmux', TERM_PROGRAM_VERSION: '3.3a' })).toBe(false)
    expect(engineHyperlinks({ LC_TERMINAL: 'iTerm2' })).toBe(true)
    expect(engineHyperlinks({ TERM_PROGRAM: 'WezTerm' })).toBeUndefined()
    expect(engineHyperlinks({ TERM_PROGRAM: 'WezTerm', CI: '1' })).toBe(false)
  })
})
