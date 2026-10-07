import { describe, expect, test } from 'vitest'
import { maths, scanned, view } from './helpers.js'

const raw = String.raw

describe('segments', () => {
  test('empty input has no segments', () => {
    expect(scanned('')).toEqual([])
  })

  test('prose without math is one text segment', () => {
    const text = 'Hello world.\n\nA second paragraph\nwith two lines.\n'
    expect(scanned(text)).toEqual([{ kind: 'text', text, start: 0, end: text.length }])
  })

  test('offsets, raw and tex of inline math', () => {
    const text = 'Let $ x^2 $ be... no: let $x^2 + 1$ be positive.'
    expect(scanned(text)).toEqual([
      { kind: 'text', text: 'Let $ x^2 $ be... no: let ', start: 0, end: 26 },
      { kind: 'math', display: false, tex: 'x^2 + 1', raw: '$x^2 + 1$', delimiter: '$', start: 26, end: 35 },
      { kind: 'text', text: ' be positive.', start: 35, end: 48 },
    ])
  })

  test('offsets, raw and tex of display math', () => {
    const text = 'Euler:\n\n$$\n  e^{i\\pi} + 1 = 0\n$$\n\nDone.'
    expect(scanned(text)).toEqual([
      { kind: 'text', text: 'Euler:\n\n', start: 0, end: 8 },
      { kind: 'math', display: true, tex: 'e^{i\\pi} + 1 = 0', raw: '$$\n  e^{i\\pi} + 1 = 0\n$$', delimiter: '$$', start: 8, end: 32 },
      { kind: 'text', text: '\n\nDone.', start: 32, end: 39 },
    ])
  })

  test('CRLF line endings', () => {
    expect(view('a $x$ b\r\n$$\r\ny\r\n$$\r\n')).toEqual(['a ', ['$', false, 'x'], ' b\r\n', ['$$', true, 'y'], '\r\n'])
  })
})

describe('inline $', () => {
  test.each([
    ['$x$', ['x']],
    ['$x$.', ['x']],
    ['($x$)', ['x']],
    ['$x$ and $y$', ['x', 'y']],
    ['$a+b=c$, so', ['a+b=c']],
    ['$|x|$', ['|x|']],
    ['| $a$ | $b$ |', ['a', 'b']],
    ['# Heading with $h$', ['h']],
    ['- item $i$', ['i']],
  ])('%j is math', (text, tex) => {
    expect(maths(text).map(m => [m.tex, m.delimiter, m.display])).toEqual(tex.map(t => [t, '$', false]))
  })

  test.each([
    '$ x $',
    '$ x$',
    '$x $',
    '$',
    'a $ b',
    '$x$5',
    '$$x$',
  ])('%j is text', text => {
    expect(maths(text)).toEqual([])
  })

  describe('currency', () => {
    test.each([
      'It costs $5 and $10.',
      'between $5 and $10',
      'from $5-$10 a month',
      '$5, $10, and $20',
      'prices: $3.50, $4.25',
      'US$5 and US$10',
      'It costs $5.',
      '$100 or more',
      'save $5 today, $10 tomorrow',
      'the $PATH and $HOME variables',
    ])('%j has no math', text => {
      expect(maths(text)).toEqual([])
    })

    test('currency next to math', () => {
      expect(maths('It costs $5, while $y = 2$ holds.').map(m => m.tex)).toEqual(['y = 2'])
      expect(maths('$x$ costs $5').map(m => m.tex)).toEqual(['x'])
      expect(maths('pay $5 or $x$').map(m => m.tex)).toEqual(['x'])
    })

    test('a dollar never pairs past another dollar', () => {
      // TeX would end the math at the second `$`, which here cannot close.
      expect(maths('costs $5 and the $x$ thing').map(m => m.tex)).toEqual(['x'])
    })
  })

  describe('escaped dollars', () => {
    test('outside math', () => {
      expect(maths(raw`It costs \$5 and \$10.`)).toEqual([])
      expect(maths(raw`\$x\$`)).toEqual([])
      expect(maths(raw`\$x$`)).toEqual([])
    })

    test('inside math', () => {
      expect(view(raw`a $\$5 + x$ b`)).toEqual(['a ', ['$', false, raw`\$5 + x`], ' b'])
      expect(maths(raw`$a\$$`).map(m => m.tex)).toEqual([raw`a\$`])
    })

    test('an escaped backslash does not escape the dollar', () => {
      expect(maths(raw`\\$x$`).map(m => m.tex)).toEqual(['x'])
      expect(maths(raw`$a \\$`).map(m => m.tex)).toEqual([raw`a \\`])
    })
  })

  test('spans lines of one paragraph', () => {
    expect(view('Let $a +\nb$ be.')).toEqual(['Let ', ['$', false, 'a +\nb'], ' be.'])
  })

  test('never spans a blank line', () => {
    expect(maths('Let $a\n\nb$ be.')).toEqual([])
    expect(maths('Let $a\n   \nb$ be.')).toEqual([])
  })

  test('never spans list items, headings or table rows', () => {
    expect(maths('- one $a\n- two b$')).toEqual([])
    expect(maths('# Title $a\nb$ text')).toEqual([])
    expect(maths('| $a | b |\n| c$ | d |')).toEqual([])
  })

  test('spans lines of a blockquote, without the markers in tex', () => {
    const [m] = maths('> Let $a +\n> b$ be.')
    expect(m).toMatchObject({ tex: 'a +\nb', raw: '$a +\n> b$' })
  })
})

describe('inline $$ and \\(', () => {
  test('$$ with other text on its line is inline', () => {
    expect(view('a $$x$$ b')).toEqual(['a ', ['$$', false, 'x'], ' b'])
    expect(view('$$x$$ is a formula')).toEqual([['$$', false, 'x'], ' is a formula'])
    expect(view('Euler: $$e^{i\\pi} + 1 = 0$$ done.')).toEqual(['Euler: ', ['$$', false, 'e^{i\\pi} + 1 = 0'], ' done.'])
    expect(maths('$$a$$ and $$b$$').map(m => m.tex)).toEqual(['a', 'b'])
  })

  test('$$ allows spaces inside', () => {
    expect(maths('a $$ x $$ b').map(m => m.tex)).toEqual(['x'])
  })

  test('empty $$ is text', () => {
    expect(maths('a $$ $$ b')).toEqual([])
    expect(maths('a $$$$ b')).toEqual([])
    expect(maths('$$ $$')).toEqual([])
  })

  test('$$ is not closed by a single $', () => {
    expect(maths('a $$x$ b')).toEqual([])
  })

  test('\\( \\)', () => {
    expect(view(raw`Let \(x^2\) be.`)).toEqual(['Let ', ['\\(', false, 'x^2'], ' be.'])
    expect(maths(raw`\( a \) and \(b\)`).map(m => m.tex)).toEqual(['a', 'b'])
    expect(maths(raw`\(\)`)).toEqual([])
    expect(maths(raw`\( \)`)).toEqual([])
    expect(maths(raw`\\(x\\)`)).toEqual([])
    expect(maths(raw`\(x`)).toEqual([])
  })

  test('\\( spans lines of a paragraph', () => {
    expect(maths('a \\(x\ny\\) b').map(m => m.tex)).toEqual(['x\ny'])
  })
})

describe('code is never math', () => {
  test('code spans', () => {
    expect(maths('Run `echo $HOME$` now')).toEqual([])
    expect(maths('use `$x$` and $y$').map(m => m.tex)).toEqual(['y'])
    expect(maths('``a ` $x$ ``')).toEqual([])
    expect(maths('`a\n$x$ b`')).toEqual([])
    expect(maths('`$x$` `$y$`')).toEqual([])
  })

  test('a backslash does not escape the backtick that closes a code span', () => {
    expect(maths('`a\\` $x$')).toMatchObject([{ tex: 'x' }])
    expect(maths('`$a\\` $x$`')).toMatchObject([{ tex: 'x' }])
  })

  test('an unclosed backtick is literal', () => {
    expect(maths('a ` b $x$').map(m => m.tex)).toEqual(['x'])
    expect(maths('\\`$x$\\`').map(m => m.tex)).toEqual(['x'])
  })

  test('math never crosses a backtick', () => {
    expect(maths('$a `b$` c$')).toEqual([])
    expect(maths('$a ` b$')).toEqual([])
  })

  test('fenced code', () => {
    expect(maths('```\n$x$\n$$\ny\n$$\n```\n')).toEqual([])
    expect(maths('~~~sh\necho $x$\n~~~')).toEqual([])
    expect(maths('```python\nprint("$x$")\n```\n$y$').map(m => m.tex)).toEqual(['y'])
  })

  test('a fence closes only with a run of its character at least as long', () => {
    expect(maths('````\n```\n$x$\n````\n$y$').map(m => m.tex)).toEqual(['y'])
    expect(maths('```\n~~~\n$x$\n```\n$y$').map(m => m.tex)).toEqual(['y'])
    expect(maths('```\n``` not a closer\n$x$\n```\n$y$').map(m => m.tex)).toEqual(['y'])
  })

  test('an unclosed fence runs to the end', () => {
    expect(maths('```\n$x$\n\n$$\ny\n$$\n')).toEqual([])
  })

  test('fences indented up to 3 spaces, or nested in a list', () => {
    expect(maths('   ```\n$x$\n   ```')).toEqual([])
    expect(maths('- item\n\n      ```\n      $x$\n      ```')).toEqual([])
  })

  test('a fence inside a blockquote ends with the blockquote', () => {
    expect(maths('> ```\n> $x$\n> ```\n$y$').map(m => m.tex)).toEqual(['y'])
    expect(maths('> ```\n> $x$\n\n$y$').map(m => m.tex)).toEqual(['y'])
  })

  test('```latex and ```tex stay code', () => {
    expect(maths('```latex\n\\frac{a}{b}\n```')).toEqual([])
    expect(maths('```tex\n$x$\n```')).toEqual([])
  })

  test('backticks inside an info string make no fence', () => {
    expect(maths('``` a`b\n$x$')).toMatchObject([{ tex: 'x' }])
  })

  test('indented code after a blank line', () => {
    expect(maths('Text:\n\n    $x$ = 1\n\n    $$\n    y\n    $$\n')).toEqual([])
    expect(maths('    $x$')).toEqual([])
  })

  test('4-space indentation is not code inside a paragraph or a list', () => {
    expect(maths('Text\n    $x$').map(m => m.tex)).toEqual(['x'])
    expect(maths('- item\n\n    $x$').map(m => m.tex)).toEqual(['x'])
  })
})

describe('display $$', () => {
  test('multi-line block', () => {
    expect(view('$$\na^2 + b^2 = c^2\n$$')).toEqual([['$$', true, 'a^2 + b^2 = c^2']])
  })

  test('content on the delimiter lines', () => {
    expect(view('$$ x\ny $$')).toEqual([['$$', true, 'x\ny']])
    expect(view('$$\nx = 1 $$\n')).toEqual([['$$', true, 'x = 1'], '\n'])
  })

  test('one line that is the whole line', () => {
    expect(view('$$x^2$$')).toEqual([['$$', true, 'x^2']])
    expect(view('$$ x^2 $$  \n')).toEqual([['$$', true, 'x^2'], '  \n'])
    expect(view('Before\n$$x$$\nafter')).toEqual(['Before\n', ['$$', true, 'x'], '\nafter'])
  })

  test('interrupts a paragraph', () => {
    expect(view('We have\n$$\nx\n$$\nso it holds.')).toEqual(['We have\n', ['$$', true, 'x'], '\nso it holds.'])
  })

  test('indented up to 3 spaces', () => {
    expect(view('   $$\n   x\n   $$')).toEqual(['   ', ['$$', true, 'x']])
  })

  test('in a list', () => {
    const text = '1. First:\n\n   $$\n   x\n   $$\n\n   - nested\n\n         $$y$$\n'
    expect(maths(text).map(m => [m.tex, m.display])).toEqual([
      ['x', true],
      ['y', true],
    ])
  })

  test('in a blockquote', () => {
    const text = '> Note:\n> $$\n> a\n> = b\n> $$\n> end'
    expect(view(text)).toEqual(['> Note:\n> ', ['$$', true, 'a\n= b'], '\n> end'])
    expect(maths(text)[0]!.raw).toBe('$$\n> a\n> = b\n> $$')
    expect(view('> > $$x$$')).toEqual(['> > ', ['$$', true, 'x']])
  })

  test('the blockquote must last the whole block', () => {
    expect(maths('> $$\n> a\n$$')).toEqual([])
  })

  test('aligned and other inner environments', () => {
    const text = '$$\n\\begin{aligned}\na &= b \\\\\nc &= d\n\\end{aligned}\n$$'
    expect(maths(text)).toMatchObject([{ delimiter: '$$', display: true, tex: '\\begin{aligned}\na &= b \\\\\nc &= d\n\\end{aligned}' }])
  })

  test('empty blocks are text', () => {
    expect(maths('$$\n$$')).toEqual([])
    expect(maths('$$\n  \n$$')).toEqual([])
    expect(maths('$$ $$')).toEqual([])
  })

  test('a blank line gives up the block', () => {
    expect(view('$$\nx\n\ny $z$')).toEqual(['$$\nx\n\ny ', ['$', false, 'z']])
  })

  test('a fence gives up the block', () => {
    const text = '$$ marks display math, like:\n```\n$$\nx^2\n$$\n```\n'
    expect(maths(text)).toEqual([])
  })

  test('a closing $$ followed by text makes the pair inline', () => {
    expect(view('$$\nE = mc^2\n$$ where E is energy.')).toEqual([['$$', false, 'E = mc^2'], ' where E is energy.'])
  })

  test('a $$ line with text after its closer is not display', () => {
    expect(view('$$a$$ is nice.\n\nLater: $$b$$')).toEqual([['$$', false, 'a'], ' is nice.\n\nLater: ', ['$$', false, 'b']])
  })

  test('unclosed $$ is text', () => {
    expect(maths('$$\nx^2')).toEqual([])
    expect(maths('Intro\n\n$$\n\\frac{a}{b}\n')).toEqual([])
  })

  test('unclosed $$ does not hide inline math after it', () => {
    expect(maths('$$ is for display; $x$ is inline.').map(m => [m.tex, m.display])).toEqual([['x', false]])
    expect(maths('$$\nthen $x$').map(m => m.tex)).toEqual(['x'])
  })

  test('$$$ opens nothing', () => {
    expect(maths('$$$\nx\n$$$')).toEqual([])
  })

  test('escaped dollars inside a block', () => {
    expect(maths('$$\n\\text{cost: } \\$5\n$$')).toMatchObject([{ tex: '\\text{cost: } \\$5' }])
  })

  test('single dollars inside a block are content', () => {
    expect(maths('$$\na $ b\n$$')).toMatchObject([{ tex: 'a $ b' }])
  })
})

describe('a blank line inside a display block', () => {
  test('is held while an environment in the block is open', () => {
    const tex = '\\begin{aligned}\na &= b \\\\\n\nc &= d\n\\end{aligned}'
    expect(maths(`$$\n${tex}\n$$`)).toMatchObject([{ tex, display: true, delimiter: '$$' }])
    expect(maths(`\\[\n${tex}\n\\]`)).toMatchObject([{ tex, display: true }])
    expect(maths(tex)).toMatchObject([{ tex, display: true, delimiter: 'env' }])
  })

  test('ends the block otherwise: no environment open, or two blank lines', () => {
    expect(maths('$$\na = b\n\nc = d\n$$')).toEqual([])
    expect(maths('$$\n\\begin{aligned}\na &= b\n\n\nc &= d\n\\end{aligned}\n$$')).toEqual([])
    // The $$ block gives up; the aligned on lines of its own is still display math.
    expect(maths('$$\n\\begin{aligned}\na &= b\n\\end{aligned}\n\nc\n$$')).toMatchObject([{ delimiter: 'env', tex: '\\begin{aligned}\na &= b\n\\end{aligned}' }])
  })
})

describe('display \\[ \\]', () => {
  test('multi-line and one-line', () => {
    expect(view('\\[\nx\n\\]')).toEqual([['\\[', true, 'x']])
    expect(view('\\[ x \\]')).toEqual([['\\[', true, 'x']])
    expect(view('\\[ x\ny \\]\nafter')).toEqual([['\\[', true, 'x\ny'], '\nafter'])
  })

  test('in a blockquote', () => {
    expect(view('> \\[\n> x\n> \\]')).toEqual(['> ', ['\\[', true, 'x']])
  })

  test('\\\\[2pt] is a line break, not an opener or closer', () => {
    expect(maths('\\\\[2pt] a')).toEqual([])
    expect(maths('\\[\na \\\\[2pt]\nb\n\\]')).toMatchObject([{ tex: 'a \\\\[2pt]\nb' }])
  })

  test('escaped brackets in prose are text', () => {
    expect(maths('\\[1\\] Smith et al.')).toEqual([])
    expect(maths('see \\[1\\]')).toEqual([])
  })

  test('unclosed or empty is text', () => {
    expect(maths('\\[\nx\n')).toEqual([])
    expect(maths('\\[\\]')).toEqual([])
    expect(maths('\\[\n\\]')).toEqual([])
  })
})

describe('display environments', () => {
  test.each(['equation', 'align', 'gather', 'multline', 'flalign', 'eqnarray', 'displaymath', 'equation*', 'align*', 'gather*'])(
    '%s',
    env => {
      const text = `\\begin{${env}}\na &= b\n\\end{${env}}`
      expect(scanned(text)).toEqual([{ kind: 'math', display: true, tex: text, raw: text, delimiter: 'env', start: 0, end: text.length }])
    },
  )

  test('alignat with its argument', () => {
    const text = '\\begin{alignat}{2}\na &= b & c &= d\n\\end{alignat}'
    expect(maths(text)).toMatchObject([{ delimiter: 'env', tex: text }])
  })

  test('one line', () => {
    expect(view('\\begin{equation} x \\end{equation}\n')).toEqual([['env', true, '\\begin{equation} x \\end{equation}'], '\n'])
  })

  test('closes only with its own \\end', () => {
    const text = '\\begin{align*}\nx \\\\\n\\end{align}\ny\n\\end{align*}'
    expect(maths(text)).toMatchObject([{ tex: text }])
  })

  test('in a blockquote, tex without the markers', () => {
    expect(maths('> \\begin{equation}\n> x\n> \\end{equation}')).toMatchObject([
      { tex: '\\begin{equation}\nx\n\\end{equation}', raw: '\\begin{equation}\n> x\n> \\end{equation}' },
    ])
  })

  test('bare matrices, cases, aligned, array and CD are display math, their \\\\ kept', () => {
    for (const env of ['pmatrix', 'bmatrix', 'vmatrix', 'Bmatrix', 'cases', 'aligned', 'gathered', 'CD']) {
      const tex = `\\begin{${env}}\na & b \\\\\nc & d\n\\end{${env}}`
      expect(maths(`Text.\n\n${tex}\n\nMore.`), env).toMatchObject([{ tex, display: true, delimiter: 'env' }])
    }
    const array = '\\begin{array}{cc}\n1 & 2 \\\\\n3 & 4\n\\end{array}'
    expect(maths(array)).toMatchObject([{ tex: array, display: true, delimiter: 'env' }])
  })

  test('other environments are text', () => {
    expect(maths('\\begin{itemize}\n\\item x\n\\end{itemize}')).toEqual([])
    expect(maths('\\begin{tikzcd}\nA \\arrow[r] & B\n\\end{tikzcd}')).toEqual([])
  })

  test('mid-line \\begin is text', () => {
    expect(maths('see \\begin{equation} x \\end{equation}')).toEqual([])
  })

  test('unclosed or empty is text', () => {
    expect(maths('\\begin{equation}\nx\n')).toEqual([])
    expect(maths('\\begin{equation}\n\\end{equation}')).toEqual([])
    expect(maths('\\begin{equation}\nx\n\nmore')).toEqual([])
  })

  test('an unclosed environment does not hide others inside it', () => {
    const text = '\\begin{equation}\n\\begin{align}\nx\n\\end{align}\n'
    expect(maths(text)).toMatchObject([{ tex: '\\begin{align}\nx\n\\end{align}' }])
  })
})

describe('```math fences', () => {
  test('body is display math', () => {
    expect(view('```math\n\\frac{a}{b}\n```\n')).toEqual([['fence', true, '\\frac{a}{b}'], '\n'])
    expect(maths('~~~math\nx\n~~~')).toMatchObject([{ delimiter: 'fence', raw: '~~~math\nx\n~~~' }])
    expect(maths('```Math\nx\n```')).toMatchObject([{ tex: 'x' }])
  })

  test('blank lines and dollars inside are content', () => {
    expect(maths('```math\na\n\n$b$\n```')).toMatchObject([{ tex: 'a\n\n$b$' }])
  })

  test('in a blockquote and a list', () => {
    expect(view('> ```math\n> x\n> ```')).toEqual(['> ', ['fence', true, 'x']])
    expect(maths('- a\n\n  ```math\n  x\n  ```')).toMatchObject([{ tex: 'x', raw: '```math\n  x\n  ```' }])
  })

  test('empty or unclosed is text', () => {
    expect(maths('```math\n```')).toEqual([])
    expect(maths('```math\n\n```')).toEqual([])
    expect(maths('```math\nx\n\n$y$')).toEqual([])
  })
})

describe('mixed replies', () => {
  test('a reply with every kind of math and code', () => {
    const text = [
      '# Results',
      '',
      'The cost is \\$5 per unit, or $5 to $10 in bulk. Let $f(x) = x^2$ and \\(g\\) be given.',
      '',
      '$$',
      '\\int_0^1 f(x)\\,dx = \\frac{1}{3}',
      '$$',
      '',
      '> Quote: $$a$$ inline, then',
      '> \\[ b \\]',
      '',
      '```python',
      'cost = "$5"  # $x$',
      '```',
      '',
      '- Item with `$code$` and $y$.',
      '',
      '\\begin{align*}',
      'u &= v',
      '\\end{align*}',
      '',
      '```math',
      'w',
      '```',
    ].join('\n')
    expect(maths(text).map(m => [m.delimiter, m.display, m.tex])).toEqual([
      ['$', false, 'f(x) = x^2'],
      ['\\(', false, 'g'],
      ['$$', true, '\\int_0^1 f(x)\\,dx = \\frac{1}{3}'],
      ['$$', false, 'a'],
      ['\\[', true, 'b'],
      ['$', false, 'y'],
      ['env', true, '\\begin{align*}\nu &= v\n\\end{align*}'],
      ['fence', true, 'w'],
    ])
  })
})

describe('pipes in table cells', () => {
  // GFM reads `\|` in a table row as a pipe before anything else (the cell's
  // math included): models write |x| in a cell as `$\|x\|$`.
  test('math in a table row reads `\\|` as a pipe', () => {
    const table = raw`| Concept | Formula |` + '\n|---|---|\n' + raw`| abs | $\|x\|$ |` + '\n' + raw`| cond | $P(A\|B)$ and $\|{-3}\| = 3$ |` + '\n'
    expect(maths(table).map(m => [m.tex, m.raw])).toEqual([
      ['|x|', raw`$\|x\|$`],
      ['P(A|B)', raw`$P(A\|B)$`],
      ['|{-3}| = 3', raw`$\|{-3}\| = 3$`],
    ])
  })

  test('the header row is a table row too, and a table may interrupt a paragraph', () => {
    const text = 'Some text above\n' + raw`| $\|v\|$ | b |` + '\n| :-- | --: |\n| 1 | 2 |\n'
    expect(maths(text).map(m => m.tex)).toEqual(['|v|'])
  })

  test('in prose, and in a table-like line with no delimiter row, `\\|` stays a norm', () => {
    expect(maths(raw`The norm $\|x\|_2$ of $x$.` + '\n').map(m => m.tex)).toEqual([raw`\|x\|_2`, 'x'])
    expect(maths(raw`| a | $\|x\|$ |` + '\n| b | c |\n').map(m => m.tex)).toEqual([raw`\|x\|`])
    // A delimiter row with another number of cells than the header makes no table (marked's rule).
    expect(maths(raw`| a | $\|x\|$ |` + '\n|---|---|---|\n').map(m => m.tex)).toEqual([raw`\|x\|`])
  })
})
