// Replies that put math in hard places, for the markdown stress runner
// (markdown.test.ts). Each says what a correct scan finds (`inline`, `display`:
// how many math segments of each kind), so mis-scans show up as a count that
// differs; `note` says what to look at in the rewrite.

export interface MarkdownCase {
  name: string
  markdown: string
  inline?: number
  display?: number
  note?: string
  /** Reply column for this case (default 98). */
  columns?: number
}

const t = String.raw

const manyFormulas = (() => {
  const out: string[] = ['Here are 300 formulas.', '']
  for (let i = 0; i < 300; i++) {
    if (i % 3 === 0) out.push(`Step ${i}: with $x_{${i}} = ${i}^2$ we get`, '', '$$', t`\sum_{k=1}^{${i + 1}} k^2 = \frac{n(n+1)(2n+1)}{6}`, '$$', '')
    else out.push(`Item ${i}: $a_{${i}} + b_{${i}} = \frac{${i}}{2}$ and $\alpha^{${i}}$.`, '')
  }
  return out.join('\n')
})()

export const MARKDOWN_CASES: readonly MarkdownCase[] = [
  {
    name: 'table with | inside inline math',
    markdown: ['| quantity | value |', '|---|---|', '| norm | $|x|$ |', '| conditional | $P(A | B)$ |', '| double bar | $\\|v\\|_2$ |', '| mid | $P(A \\mid B)$ |', '', 'After the table.'].join('\n'),
    inline: 4,
    note: 'a `|` in math splits the table cell before scan sees it (GFM); the Unicode of \\mid and \\| also holds `|`',
  },
  {
    name: 'table with ordinary inline math',
    markdown: ['| $n$ | $x_n$ | $f(x_n)$ |', '|---|---|---|', '| 0 | $1.0$ | $\\frac{1}{2}$ |', '| 1 | $x^2$ | $e^{-x}$ |', '', 'Done.'].join('\n'),
    inline: 7,
  },
  {
    name: 'table cell with display math',
    markdown: ['| case | formula |', '|---|---|', '| a | $$x^2 + y^2 = r^2$$ |', '| b | $$\\int_0^1 f$$ |', '', 'End.'].join('\n'),
    note: '$$…$$ inside a table row: inline by the rules (other text on the line)',
  },
  {
    name: 'list with inline and display math',
    markdown: ['Steps:', '', '1. Write $f(x) = x^2$.', '2. Differentiate:', '', '   $$', "   f'(x) = 2x", '   $$', '', '3. Evaluate at $x = 3$: $f\'(3) = 6$.', '', 'Done.'].join('\n'),
    inline: 3,
    display: 1,
    note: 'the display preview must stay inside item 2 (indented)',
  },
  {
    name: 'nested list with display',
    markdown: ['- Outer item with $a$', '  - Inner item:', '', '    $$', '    \\frac{a}{b} = c', '    $$', '', '  - Another inner $b$', '- Last outer', ''].join('\n'),
    inline: 2,
    display: 1,
  },
  {
    name: 'blockquote with inline and display',
    markdown: ['> Recall that $e^{i\\pi} = -1$, and', '>', '> $$', '> \\sum_{n=0}^\\infty \\frac{x^n}{n!} = e^x', '> $$', '>', '> holds for all $x$.', '', 'Outside.'].join('\n'),
    inline: 2,
    display: 1,
    note: 'display math in a quote: `> $$` lines',
  },
  {
    name: 'headings with math',
    markdown: ['## The case $n = 1$', '', 'Text.', '', '### Why $\\frac{1}{2}$?', '', '# $$E = mc^2$$', '', 'End.'].join('\n'),
    inline: 3,
  },
  {
    name: 'bold and italic around math',
    markdown: ['This is **$x^2$** bold, *the value $a_i$ here* italic, _$y$_ and __$z$__, ***$w$***.', '', '**Theorem.** *For all $n \\ge 1$, $\\sum_{k=1}^n k = \\frac{n(n+1)}{2}$.*'].join('\n'),
    inline: 7,
  },
  {
    name: '* and _ inside inline math',
    markdown: ['Products $a*b$ and $c*d$ are commutative. Adjoint $f^*$ and $g^*$, and $A^* B^*$.', '', 'Indices $x_1$, $y_2$, $a_{ij}$ and $b_{kl}$; also $T_{\\mu\\nu}$ and $F_{\\rho\\sigma}$ and $\\Gamma^\\lambda_{\\mu\\nu}$.', '', 'Convolution $f * g$ and $h * k$.'].join('\n'),
    inline: 14,
    note: 'Unicode of Greek subscripts falls back to _(…): two in a paragraph may pair as emphasis',
  },
  {
    name: '< and > inside inline math',
    markdown: ['If $a<b$ and $c>d$ then $0<x<1$. Also $i<j>k$ and $x <y$ and $\\langle x, y\\rangle$. Then $a<b>c$ might look like HTML, as might $<div>$.'].join('\n'),
    inline: 8,
  },
  {
    name: 'text with escaped dollar',
    markdown: ['The price is $\\text{costs \\$5}$ per unit.', '', '$$', '\\text{Total} = \\$5 \\times 3 = \\$15', '$$', '', 'It costs \\$5 and $x$ items.'].join('\n'),
    inline: 2,
    display: 1,
  },
  {
    name: 'shell variables in prose and code',
    markdown: ['Run `echo $HOME` and then check `$PATH`.', '', 'Set $HOME and $PATH before you start.', '', 'It costs $5 and $10 per seat.', '', 'In bash, `for f in $(ls); do echo "$f"; done`, then use $x$ as usual.', '', '```bash', 'export PATH=$HOME/bin:$PATH', 'echo "$$ is the pid"', '```'].join('\n'),
    inline: 1,
    note: '$HOME and $PATH in prose: `$HOME and $` must not pair',
  },
  {
    name: 'dollars across a code span',
    markdown: ['Use $5 for the `$x$` variable and $10 otherwise.', '', 'A formula $a$ next to `code $b$` and $c$.'].join('\n'),
    inline: 2,
  },
  {
    name: 'backslash delimiters',
    markdown: ['Inline \\(x^2 + y^2\\) and display:', '', '\\[', '\\int_0^1 x\\,dx = \\frac{1}{2}', '\\]', '', 'and one-line \\[a = b\\] then more.'].join('\n'),
    inline: 1,
    display: 2,
  },
  {
    name: 'bare environments',
    markdown: ['The system:', '', '\\begin{align}', 'a &= b + c \\\\', 'd &= e + f', '\\end{align}', '', 'A matrix:', '', '\\begin{pmatrix}', '1 & 2 \\\\', '3 & 4', '\\end{pmatrix}', '', 'Cases:', '', '\\begin{cases}', 'x & x > 0 \\\\', '-x & x \\le 0', '\\end{cases}', '', 'Diagram:', '', '\\begin{CD}', 'A @>f>> B', '\\end{CD}', '', 'equation*:', '', '\\begin{equation*}', 'E = mc^2', '\\end{equation*}', '', 'gather*:', '', '\\begin{gather*}', 'x = 1', '\\end{gather*}'].join('\n'),
    display: 6,
    note: 'bare pmatrix/cases/CD are not display envs in the scanner',
  },
  {
    name: 'display with no blank lines',
    markdown: ['The energy is', '$$', 'E = mc^2', '$$', 'which is famous.', '$$', 'F = ma', '$$', '$$', 'p = mv', '$$', 'End.'].join('\n'),
    display: 3,
  },
  {
    name: 'one-line $$ inline in a sentence',
    markdown: ['We know $$x = 1$$ holds, and', '$$y = 2$$', 'on its own line.'].join('\n'),
    inline: 1,
    display: 1,
  },
  {
    name: 'closing $$ with trailing text',
    markdown: ['$$', 'a + b = c', '$$ and then text continues here.', '', 'Next paragraph.'].join('\n'),
    display: 1,
  },
  {
    name: 'opening $$ glued to the environment',
    markdown: ['$$\\begin{aligned}', 'a &= b \\\\', 'c &= d', '\\end{aligned}$$', '', 'Then text.'].join('\n'),
    display: 1,
  },
  {
    name: 'blank line inside a display block',
    markdown: ['$$', '\\begin{aligned}', 'a &= b \\\\', '', 'c &= d', '\\end{aligned}', '$$', '', 'Then text.'].join('\n'),
    display: 1,
    note: 'models sometimes leave a blank line inside aligned',
  },
  {
    name: 'refused formula then more displays',
    markdown: ['First:', '', '$$', '\\foo{x} + 1', '$$', '', 'Second:', '', '$$', 'x^2', '$$', '', 'Third $y$.'].join('\n'),
    inline: 1,
    display: 2,
  },
  {
    name: 'math fence',
    markdown: ['Here:', '', '```math', '\\frac{a}{b}', '```', '', 'After.'].join('\n'),
    display: 1,
  },
  {
    name: 'link text with math',
    markdown: ['See [the $L^2$ norm](https://example.com) and [$\\alpha$](https://example.com/a).'].join('\n'),
    inline: 2,
  },
  {
    name: 'math next to punctuation',
    markdown: ["Let $x$, $y$; and ($z$). The $n$'s are $1$-indexed, $k$-th, $f$: done. 5$x$ and $x$5."].join('\n'),
    inline: 8,
    note: 'Pandoc rule: a closing $ followed by a digit does not close, so $x$5 stays raw',
  },
  {
    name: 'dollar inside inline math',
    markdown: ['A price $\\$5$ and $p = \\$10$.'].join('\n'),
    inline: 2,
  },
  {
    name: 'inline formula longer than a line',
    markdown: [
      'The expansion $' + Array.from({ length: 40 }, (_, i) => `a_{${i}}x^{${i}}`).join(' + ') + '$ converges for small $x$.',
      '',
      'Tall inline: $\\frac{\\sum_{i=1}^n x_i}{\\prod_{j=1}^m y_j}$ and $\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$ inline.',
    ].join('\n'),
    inline: 4,
  },
  {
    name: 'display wider than 40 columns at 42-column window',
    markdown: ['Navier–Stokes:', '', '$$', '\\rho\\left(\\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u}\\cdot\\nabla)\\mathbf{u}\\right) = -\\nabla p + \\mu\\nabla^2\\mathbf{u} + \\rho\\mathbf{g}', '$$', '', 'A matrix:', '', '$$', 'T = \\begin{bmatrix} \\cos\\theta & -\\sin\\theta & 0 & x \\\\ \\sin\\theta & \\cos\\theta & 0 & y \\\\ 0 & 0 & 1 & z \\\\ 0 & 0 & 0 & 1 \\end{bmatrix}', '$$', ''].join('\n'),
    display: 2,
    columns: 40,
  },
  {
    name: '4-space indented display',
    markdown: ['Paragraph.', '', '    $$', '    x^2', '    $$', '', 'After.'].join('\n'),
    note: 'an indented code block in CommonMark: not math',
  },
  {
    name: 'display in a list item with 2-space continuation and no blank lines',
    markdown: ['- Item one:', '  $$', '  a = b', '  $$', '- Item two'].join('\n'),
    display: 1,
  },
  {
    name: 'numbered steps with displays between',
    markdown: ['**Step 1.** Expand:', '$$(a+b)^2 = a^2 + 2ab + b^2$$', '**Step 2.** Substitute $a = 1$:', '$$(1+b)^2 = 1 + 2b + b^2$$', '**Step 3.** Done.'].join('\n'),
    inline: 1,
    display: 2,
  },
  {
    name: 'inline math with markdown-special Unicode',
    markdown: ['Norms $\\|x\\|$, absolute $|x|$, sets $\\{x \\mid x > 0\\}$, floor $\\lfloor x \\rfloor$, $[0, 1]$, $[a](b)$, $x \\# y$, $a \\& b$, $\\sim x$, $\\tilde{x}$, $a^{*}$ done.'].join('\n'),
    inline: 11,
  },
  { name: '300 formulas in one reply', markdown: manyFormulas, inline: 500, display: 100 },
]
