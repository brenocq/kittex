/*
 * Running the user's own TeX on what the model wrote: the documents, the
 * commands and their environment, and what is refused before TeX ever sees it.
 *
 * Threat model. The source is model output, so treat it as written by
 * whoever last got text into the conversation (a web page, a file, a tool
 * result): it may try to run commands, read the user's files into the
 * picture, write files, or just never stop. TeX can do all of that:
 * \write18 and \immediate\write18 run shell commands; \openout/\write write
 * files; \input, \include, \openin/\read, \usepackage, \includegraphics,
 * pgfplots' tables and font loading read any file by path; LuaTeX's
 * \directlua is a whole language with os.execute; dvisvgm runs Ghostscript
 * over PostScript specials; kpathsea's mktex* scripts run when a font or
 * file is missing; and a loop never ends or fills the disk. The defences,
 * each enough against a different part:
 *
 * - Commands: `latex` (pdfTeX in DVI mode, never LuaTeX) with
 *   `-no-shell-escape` and `shell_escape=f` in its environment, mktex*
 *   generation off (flags and MKTEX* variables), dvisvgm with PostScript, PDF
 *   and HTML specials off, its font generation and cache off. Argument vectors
 *   only, never a shell; the source is a file in the job's directory, never an
 *   argument.
 * - Writes: `openout_any=p` (no absolute paths, no `..`, no dot files) with
 *   the job's own fresh directory as the working directory and TEXMFOUTPUT,
 *   removed after the job; a file-size limit (prlimit, where there is one).
 * - Reads: `openin_any=p` is set as asked, but TeX Live 2026 made it a no-op
 *   (texmf.cnf: "as of 2026, openin_any no longer has any effect"), so reads
 *   are confined two other ways: where bubblewrap runs, TeX and dvisvgm run
 *   in a mount namespace with the home directory, /tmp, /var/tmp and /run
 *   hidden (empty) and no network; and everywhere, unsafeTex refuses
 *   sources that read a file by an absolute, home or parent path, or that
 *   could build such a command or path out of sight of this check (\csname,
 *   \catcode, ^^ notation, \scantokens, expl3 syntax, @-names, LaTeX's
 *   \UseName and etoolbox's \cs… family).
 * - Time and size: a hard time limit per command (the child is killed), a
 *   CPU-time limit (prlimit), the SVG capped at what $.process.run returns
 *   and the picture at MAX_PICTURE_OPS shapes.
 *
 * What a refused or failing source gets: it stays the code block it was,
 * with a `not rendered:` note.
 */

/** Bump when a document below changes what any picture looks like: it keys the disk cache. */
export const PREAMBLE_VERSION = 3

/** The job file's name in the job directory, and its outputs'. */
export const JOB_NAME = 'kittex'

/** Sources longer than this are not compiled. */
export const MAX_TEX_SOURCE = 24_000

/** A diagram's language, from its fence or its environment. */
export type DiagramLang = 'latex' | 'tikz' | 'env'

/** The environments whose bare `\begin{…}` at the start of a line is a diagram. */
export const DIAGRAM_ENVS: readonly string[] = ['tikzpicture', 'tikzcd', 'circuitikz']

/** A fence's language as a diagram's: ```latex and ```tex, ```tikz; undefined for any other. */
export function diagramFence(info: string): DiagramLang | undefined {
  const lang = info.trim().split(/\s+/, 1)[0]!.toLowerCase()
  if (lang === 'latex' || lang === 'tex') return 'latex'
  if (lang === 'tikz') return 'tikz'
  return undefined
}

/**
 * Whether a ```latex block is a drawing: a whole document, or a fragment with
 * a picture in it (TikZ, pgfplots, chemfig, circuitikz, tikz-cd, picture mode,
 * siunitx). Any other LaTeX (a formula, a table, a preamble shown as an
 * example) is code the reader is meant to read, and stays code.
 */
export function drawsPicture(source: string, lang: DiagramLang): boolean {
  if (lang !== 'latex') return true
  if (isDocument(source)) return true
  return /\\begin\{(?:tikzpicture|tikzcd|circuitikz|axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis|ternaryaxis|picture|forest|chemfig)\}|\\(?:tikz|chemfig|schemestart|chemname|ctikzset|draw|SI|qty|si|unit|num)\b/.test(source)
}

function isDocument(source: string): boolean {
  return /^(?:\s|%[^\n]*\n)*\\documentclass\b/.test(source) || /\\begin\{document\}/.test(source)
}

/** A document ready for TeX, and how its SVG reads back. */
export interface TexDocument {
  text: string
  /** Written on the fragment preamble (FORMAT_SOURCE), so TeX may start from its dumped format (formatArgv) instead of loading it. */
  format?: true
  /** Lines of `text` before the source's first line (TeX's line numbers less this are the source's). */
  offset: number
  /** Where the picture's baseline is in dvisvgm's SVG (see readSvg). */
  baseline: 'origin' | 'bottom'
  /** The document's font size, in TeX points (its em). */
  fontSize: number
}

/**
 * standalone's \sa@papersize without its `ps::%%HiResBoundingBox` special
 * (the papersize specials and the offset kept): a PostScript special is
 * handed to Ghostscript by a dvisvgm that has it linked in and can't be told
 * to ignore PostScript (dvisvgm 3.5 to 3.6.1 read `--no-specials=<list>`
 * wrongly and ignore nothing), and a page's bounding-box comment draws
 * nothing. So kittex's own documents carry no PostScript at all.
 */
const STANDALONE_NO_PS =
  '\\def\\sa@papersize{\\global\\let\\sa@papersize\\relax\\global\\sa@yoffset=\\paperheight\\global\\setbox\\@begindvibox\\vbox{\\special{papersize=\\the\\paperwidth,\\the\\paperheight}\\unvbox\\@begindvibox\\special{papersize=\\the\\paperwidth,\\the\\paperheight}}}'

/** The TikZ libraries a fragment gets. */
const TIKZ_LIBRARIES = 'arrows.meta,positioning,calc,shapes.geometric,shapes.misc,shapes.arrows,decorations.pathmorphing,decorations.markings,patterns,matrix,fit,backgrounds,automata,trees,intersections,angles,quotes,3d,shadows,chains'

/**
 * A fragment's preamble: the picture packages, and Computer Modern, the
 * design kittex's math font (New Computer Modern) continues: that package
 * itself needs fontspec and LuaLaTeX or XeLaTeX, which are slower and (Lua)
 * unsafe for this input. `dvisvgm` makes TikZ write its drawing as SVG
 * (pgfsys-dvisvgm.def) instead of PostScript.
 */
const FRAGMENT_PREAMBLE = [
  '\\documentclass[dvisvgm,border=1pt]{standalone}',
  `\\makeatletter${STANDALONE_NO_PS}\\makeatother`,
  '\\usepackage{amsmath,amssymb}',
  '\\usepackage{tikz}',
  `\\usetikzlibrary{${TIKZ_LIBRARIES}}`,
  '\\usepackage{pgfplots}',
  '\\pgfplotsset{compat=1.18}',
  '\\usepgfplotslibrary{fillbetween}',
  '\\usepackage{chemfig}',
  '\\usepackage{circuitikz}',
  '\\usepackage{tikz-cd}',
  '\\usepackage{siunitx}',
]

/** Lines a fragment may carry that belong in the preamble (they are moved there). */
const PREAMBLE_LINE = /^[ \t]*\\(?:usepackage|RequirePackage|usetikzlibrary|usepgfplotslibrary|usepgflibrary|usegdlibrary)\b[^\n]*$/gm

/**
 * The document a diagram is compiled as. A whole document (`\documentclass`)
 * compiles as written, with TikZ's SVG driver chosen before its class loads
 * and its pages' heads and feet emptied (dvisvgm then crops the first page to
 * what is drawn); preamble lines and a body without a class get the
 * fragment's class. A fragment (```tikz content is wrapped in a
 * tikzpicture when it has none) goes in the fragment's preamble, its own
 * \usepackage lines moved up there.
 */
export function diagramDocument(source: string, lang: DiagramLang): TexDocument {
  // pgfplots' interpolated shading needs PostScript or PDF, which the SVG driver has neither of: drawn flat (a colour
  // per facet), and `faceted interp` as `faceted` (the same, with the facets' edges). A colorbar is drawn with that
  // shading too (one flat colour here), so it is drawn sampled, pgfplots' own way for such drivers.
  const trimmed = source
    .replace(/^\s*\n/, '')
    .replace(/\s+$/, '')
    .replace(/shader\s*=\s*(\{\s*)?(faceted\s+)?interp\b/g, (_, brace?: string, faceted?: string) => `shader=${brace ? '{' : ''}${faceted ? 'faceted' : 'flat'}`)
    .replace(/\bcolorbar(\s+(?:horizontal|left|right))?(?=\s*[,\]])/g, (_, side?: string) => (side ? `colorbar${side}, colorbar sampled` : 'colorbar sampled'))
  if (lang === 'latex' && isDocument(trimmed)) {
    const hasClass = /^(?:\s|%[^\n]*\n)*\\documentclass\b/.test(trimmed)
    const body = hasClass ? trimmed : `\\documentclass[dvisvgm,border=1pt]{standalone}\n${trimmed}`
    // TikZ's and graphicx's SVG drivers; the class's (and so every package's) backend dvisvgm, not dvips, whose
    // l3backend writes a PostScript header; standalone without its PostScript special (STANDALONE_NO_PS).
    const head = `\\def\\pgfsysdriver{pgfsys-dvisvgm.def}\\PassOptionsToPackage{dvisvgm}{graphicx}\\makeatletter\\AddToHook{class/standalone/after}{${STANDALONE_NO_PS}}\\makeatother`
    const classed = body.replace(/\\documentclass\s*(?:\[([^\]]*)\])?\s*\{/, (_, options: string | undefined) =>
      options === undefined ? '\\documentclass[dvisvgm]{' : /(?:^|,)\s*dvisvgm\s*(?:,|$)/.test(options) ? `\\documentclass[${options}]{` : `\\documentclass[${options},dvisvgm]{`,
    )
    const text = `${head}\n${classed.replace(/\\begin\{document\}/, '\\begin{document}\\pagestyle{empty}\\thispagestyle{empty}')}\n`
    return { text, offset: hasClass ? 1 : 2, baseline: 'bottom', fontSize: documentFontSize(body) }
  }
  const moved = [...trimmed.matchAll(PREAMBLE_LINE)].map(match => match[0].trim())
  let body = moved.length > 0 ? trimmed.replace(PREAMBLE_LINE, '') : trimmed
  if (lang === 'tikz' && !/\\begin\{tikzpicture\}|\\tikz\b/.test(body)) body = `\\begin{tikzpicture}\n${body}\n\\end{tikzpicture}`
  // The format's dump point: with the format TeX starts here; without it, it is \relax.
  const head = [...FRAGMENT_PREAMBLE, DUMP_POINT, ...moved, '\\begin{document}']
  // Moved lines leave blank ones behind, so the source's line numbers still hold.
  const wrapped = lang === 'tikz' && body !== trimmed && body.startsWith('\\begin{tikzpicture}\n') && !trimmed.startsWith('\\begin{tikzpicture}')
  const offset = head.length + (wrapped ? 1 : 0)
  return { text: `${head.join('\n')}\n${body}\n\\end{document}\n`, offset, baseline: 'bottom', fontSize: 10, format: true }
}

/** Where mylatexformat stops dumping, and where TeX resumes in a document that uses the format. */
const DUMP_POINT = '\\csname endofdump\\endcsname'

/**
 * The document a format is dumped from (mylatexformat): the fragment
 * preamble up to its dump point. A fragment then starts from the format, the
 * picture packages already loaded (about 0.25 s of TeX instead of 0.5 s).
 */
export const FORMAT_SOURCE = `${[...FRAGMENT_PREAMBLE, DUMP_POINT, '\\begin{document}', '\\end{document}'].join('\n')}\n`

/** The format's name for these TeX versions (its file is `<name>.fmt`): a new preamble or a new TeX dumps a new one. */
export function formatName(versions: string): string {
  let hash = 0x811c9dc5
  for (const char of `${PREAMBLE_VERSION}\n${versions}\n${FORMAT_SOURCE}`) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193)
  return `kittex-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

/** TeX dumping the format `name` from FORMAT_SOURCE (written as `<name>.tex`): no shell, no prompts, the first error ends it. */
export function formatArgv(name: string): string[] {
  return ['latex', '-ini', '-no-shell-escape', '-interaction=nonstopmode', '-halt-on-error', '-no-mktex=tex', '-no-mktex=tfm', '-no-mktex=pk', `-jobname=${name}`, '&latex', 'mylatexformat.ltx', `${name}.tex`]
}

/** LATEX_ARGV starting from the dumped format `name` (found through TEXFORMATS). */
export function latexArgv(format?: string): string[] {
  return format === undefined ? [...LATEX_ARGV] : [...LATEX_ARGV.slice(0, -2), `-fmt=${format}`, ...LATEX_ARGV.slice(-2)]
}

/** The math preamble: what MathJax lacks that formulas reach for (siunitx's \unit, \qty, \ang...). */
// dvisvgm's backend, not dvips's (whose l3backend writes a PostScript header): no PostScript in the DVI.
const MATH_PREAMBLE = ['\\documentclass[dvisvgm]{article}', '\\usepackage{amsmath,amssymb,mathtools}', '\\usepackage{siunitx}', '\\pagestyle{empty}']

/** Display environments a formula may be written as on its own (amsmath's), set as they are. */
const DISPLAY_ENV = /^\\begin\{(equation|align|gather|multline|flalign|alignat|eqnarray)\*?\}/

/**
 * The document a formula MathJax refused is compiled as: inline in a preview
 * box (`$…$`, its baseline at the SVG's origin, its depth below), display as
 * a display (`\[…\]`, or its own amsmath environment), cropped to its ink.
 */
export function mathDocument(tex: string, display: boolean): TexDocument {
  const body = tex.trim()
  if (!display) {
    // No tightpage: in DVI mode it is PostScript, and dvisvgm crops to the ink anyway (the same SVG).
    const head = [...MATH_PREAMBLE.slice(0, 3), '\\usepackage[active]{preview}', '\\begin{document}']
    return { text: `${head.join('\n')}\n\\begin{preview}$${body}$\\end{preview}\n\\end{document}\n`, offset: head.length, baseline: 'origin', fontSize: 10 }
  }
  const head = [...MATH_PREAMBLE, '\\begin{document}']
  const math = DISPLAY_ENV.test(body) ? body : `\\[\n${body}\n\\]`
  return { text: `${head.join('\n')}\n${math}\n\\end{document}\n`, offset: head.length + (DISPLAY_ENV.test(body) ? 0 : 1), baseline: 'bottom', fontSize: 10 }
}

/** The document class's size option (`11pt`, `12pt`...), 10 when it has none. */
function documentFontSize(source: string): number {
  const options = /\\documentclass\s*\[([^\]]*)\]/.exec(source)?.[1] ?? ''
  const size = /(?:^|,)\s*(\d{1,2}(?:\.\d+)?)pt\s*(?:,|$)/.exec(options)?.[1]
  const n = size === undefined ? 10 : Number(size)
  return n >= 5 && n <= 25 ? n : 10
}

/** Em per SVG user unit (a big point) for a document: 72.27 TeX points make 72 big points. */
export function emPerUnit(document: Pick<TexDocument, 'fontSize'>): number {
  return 72.27 / 72 / document.fontSize
}

// ─── What is refused ─────────────────────────────────────────────────────────

/**
 * Control sequences refused wherever they appear (see the threat model):
 * shell and Lua, file writes and raw reads, specials, pdfTeX's file
 * primitives, and every way to make a control sequence or a file name out of
 * plain characters. Matched as whole names (`\writefoo` is another name).
 */
const REFUSED_COMMANDS = [
  // Shell, Lua, specials.
  'write18', 'immediate', 'write', 'ShellEscape', 'directlua', 'luaexec', 'latelua', 'luadirect', 'luacode', 'luacode*', 'special',
  'pdfliteral', 'pdfobj', 'pdfrefobj', 'pdffiledump', 'pdfmdfivesum', 'pdffilesize', 'pdffilemoddate', 'pdfximage', 'pdfrefximage',
  'pdfprimitive', 'primitive', 'openout', 'closeout', 'openin', 'read', 'readline', 'closein', 'outputdirectory',
  // Raw and indirect reads.
  'input', 'include', 'includeonly', 'InputIfFileExists', 'VerbatimInput', 'BVerbatimInput', 'LVerbatimInput', 'includepdf', 'pgfplotstabletypeset', 'IfFileExists', 'verbatiminput', 'lstinputlisting', 'inputminted', 'includegraphics',
  'includestandalone', 'import', 'subimport', 'inputfrom', 'subinputfrom', 'graphicspath', 'pgfimage', 'pgfdeclareimage', 'filecontents',
  // \font loads a file by any path (a TFM, or a probe for whether a file exists); \fontsize, \selectfont... are other names.
  'font',
  'tikzexternalize', 'pgfplotstableread', 'DTLloaddb', 'DTLloadrawdb', 'csvreader', 'csvautotabular', 'detokenize',
  // Names out of characters.
  'csname', 'ifcsname', 'catcode', 'scantokens', 'everyeof', 'endlinechar', 'ExplSyntaxOn', 'makeatletter', 'UseName', 'ExpandArgs',
  'NewCommandCopy', 'csuse', 'csdef', 'csgdef', 'csedef', 'csxdef', 'cslet', 'letcs', 'csletcs', 'ifcsdef', 'ifcsundef', 'ifcsmacro',
  'cspreto', 'csappto', 'csgappto', 'csepreto', 'pgfkeysvalueof', 'pgfutilifcsname', 'lowercase', 'uppercase', 'uccode', 'lccode',
]

const REFUSED_PATTERN = new RegExp(String.raw`\\(?:${REFUSED_COMMANDS.map(name => name.replace(/[*]/g, '\\*')).join('|')})(?![A-Za-z@])`)

/** Packages that run programs, read files or switch catcodes for the source (refused in \usepackage). */
const REFUSED_PACKAGES = new Set([
  'shellesc', 'minted', 'pythontex', 'sagetex', 'bashful', 'gnuplottex', 'asymptote', 'svg', 'epstopdf', 'auto-pst-pdf', 'pst-pdf', 'luacode', 'luatextra',
  'luapackageloader', 'fontspec', 'filecontents', 'catchfile', 'verbatim', 'fancyvrb', 'listings', 'import', 'standalone', 'datatool', 'csvsimple',
  'readarray', 'pgfplotstable', 'xstring', 'docmute', 'subfiles', 'embedfile', 'attachfile', 'attachfile2', 'write18', 'pstricks', 'pst-node',
])

/** The commands that take a file name: their name argument is checked as a path. */
const FILE_COMMAND = /\\(?:usepackage|RequirePackage|documentclass|LoadClass|usetikzlibrary|usepgfplotslibrary|usepgflibrary)\s*(?:\[[^\]]*\]\s*)?(?:\{([^}]*)\}|([^\s{\\][^\s\\]*))/g

/** pgfplots reads data files and images: `table {file}`, `file {file}`, `graphics {file}`, `table[...] {file}`. */
const PLOT_FILE = /\b(?:table|file|graphics)\s*(?:\[[^\]]*\]\s*)?\{([^}\\\n]*)\}/g
/** …or a file whose name a macro holds. */
const PLOT_FILE_MACRO = /\b(?:table|file|graphics)\s*(?:\[[^\]]*\]\s*)?\{\s*\\[A-Za-z]/

/**
 * Why a source is refused (see the threat model), or undefined: it may go to
 * TeX. Conservative: a diagram has no use for any of this, so a false
 * refusal only leaves it as code.
 */
export function unsafeTex(source: string): string | undefined {
  if (source.length > MAX_TEX_SOURCE) return `source longer than ${MAX_TEX_SOURCE} characters`
  // TeX's ^^ notation writes any character, a control sequence's letters included.
  if (source.includes('^^')) return 'uses ^^ character notation'
  if (/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(source)) return 'holds control characters'
  const refused = REFUSED_PATTERN.exec(source)
  if (refused) return `uses ${refused[0]}`
  // @-names are LaTeX's internals (\input@path, \@input, \@@input): out of reach without \makeatletter, refused anyway.
  const internal = /\\[A-Za-z]*@[A-Za-z@]*/.exec(source)
  if (internal) return `uses ${internal[0]}`
  if (/\\begin\{(?:luacode\*?|filecontents\*?|verbatimwrite|VerbatimOut|lstlisting|minted|pycode|sagesilent|sageblock|bash|asy|asydef)\}/.test(source)) return 'uses an environment that runs code or writes files'
  for (const match of source.matchAll(FILE_COMMAND)) {
    const names = (match[1] ?? match[2] ?? '').split(',')
    for (const raw of names) {
      const name = raw.trim()
      if (unsafePath(name)) return `reads ${name}`
      if (/^\\(?:usepackage|RequirePackage)/.test(match[0]) && REFUSED_PACKAGES.has(name)) return `uses the ${name} package`
    }
  }
  for (const match of source.matchAll(PLOT_FILE)) {
    const name = match[1]!.trim()
    if (name !== '' && unsafePath(name)) return `reads ${name}`
  }
  if (PLOT_FILE_MACRO.test(source)) return 'reads a plot file named by a macro'
  if (/\bgnuplot\b|\\addplot[^;]*\bshell\b/.test(source)) return 'runs gnuplot or a shell'
  // A path anywhere else that names the user's files or leaves the job's directory.
  const path = /(?:^|[\s{=,(])((?:~|\$HOME|\$\{HOME\})\/|\.\.[/\\]|\/+(?:home|root|etc|Users|private|var|tmp|proc|sys|dev|run|mnt|media|srv|opt|usr|Library|Volumes|System|boot|snap|nix)\b)/.exec(source)
  if (path) return `names a path outside the picture (${path[1]})`
  return undefined
}

/** Whether a file name reaches outside the job's directory and TeX's own trees. */
function unsafePath(name: string): boolean {
  return /^[/\\~]|^[A-Za-z]:|\.\.|^\.|\$|\||[`"'<>]|^\s*-/.test(name) || /[/\\]\./.test(name)
}

// ─── The commands ────────────────────────────────────────────────────────────

/** The file-size limit (bytes) TeX and dvisvgm run under, where prlimit exists. */
export const MAX_OUTPUT_BYTES = 64 * 1024 * 1024
/** The CPU seconds each command may use, where prlimit exists (the wall-clock limit is $.process.run's). */
export const MAX_CPU_SECONDS = 20

/** What the job's commands run inside: prlimit's limits, bubblewrap's namespace (both when the host has them). */
export interface Confinement {
  prlimit: boolean
  /** Bubblewrap, with the directories hidden from TeX (the home directory and the temporary ones). */
  bwrap?: { hide: readonly string[] }
}

/** The bubblewrap probe: runs `true` with the mounts a job uses; exit 0 means jobs can be confined (see texArgv). */
export function bwrapProbe(hide: readonly string[]): string[] {
  return ['bwrap', ...bwrapMounts(hide, undefined), 'true']
}

function bwrapMounts(hide: readonly string[], dir: string | undefined, readable: readonly string[] = []): string[] {
  const args = ['--ro-bind', '/', '/', '--dev', '/dev', '--proc', '/proc']
  for (const path of hide) args.push('--tmpfs', path)
  // Read-only, and only these: the dumped format's directory.
  for (const path of readable) args.push('--ro-bind', path, path)
  if (dir !== undefined) args.push('--bind', dir, dir, '--chdir', dir)
  args.push('--unshare-all', '--die-with-parent', '--new-session')
  return args
}

/** A command of the job, wrapped in its confinement: `dir` is the job's directory (also its working directory); `readable`, directories it may read in a namespace that hides them (the format's). */
export function confined(argv: readonly string[], dir: string, confinement: Confinement, readable: readonly string[] = []): string[] {
  let out = [...argv]
  if (confinement.bwrap) out = ['bwrap', ...bwrapMounts(confinement.bwrap.hide, dir, readable), ...out]
  if (confinement.prlimit) out = ['prlimit', `--fsize=${MAX_OUTPUT_BYTES}`, `--cpu=${MAX_CPU_SECONDS}`, ...out]
  return out
}

/** TeX on the job file: DVI out, no shell, no prompts, the first error ends it, no file generation. */
export const LATEX_ARGV: readonly string[] = [
  'latex',
  '-no-shell-escape',
  '-interaction=nonstopmode',
  '-halt-on-error',
  '-no-mktex=tex',
  '-no-mktex=tfm',
  '-no-mktex=pk',
  `-jobname=${JOB_NAME}`,
  `${JOB_NAME}.tex`,
]

/** dvisvgm on the job's DVI: glyphs as paths, the box cropped to the ink, SVG on stdout, no PostScript (no Ghostscript at all), PDF or HTML specials, nothing generated or cached. */
export function dvisvgmArgv(dir: string): string[] {
  // A libgs that isn't there: dvisvgm never loads Ghostscript (it would on every run, PostScript specials off or not: 35 ms, and code that reads PostScript).
  return ['dvisvgm', '--no-fonts', '--exact-bbox', '--no-specials=ps,pdf,html', `--libgs=${dir}/no-ghostscript`, '--no-mktexmf', '--cache=none', `--tmpdir=${dir}`, '--page=1', '--stdout', '--verbosity=1', `${JOB_NAME}.dvi`]
}

/** The variables TeX and dvisvgm run with, over the host's: the restrictions above, and no wrapped log lines. */
export function texEnvironment(dir: string): Record<string, string> {
  return {
    shell_escape: 'f',
    openin_any: 'p',
    openout_any: 'p',
    TEXMFOUTPUT: dir,
    HOME: dir,
    MKTEXTEX: '0',
    MKTEXTFM: '0',
    MKTEXPK: '0',
    MKTEXMF: '0',
    MKTEXFMT: '0',
    max_print_line: '1000',
    error_line: '254',
    half_error_line: '238',
  }
}

/** The job directory's template for mktemp, under the host's temporary directory. */
export function jobDirTemplate(tmpdir: string | undefined): string {
  const base = (tmpdir && tmpdir.startsWith('/') ? tmpdir : '/tmp').replace(/\/+$/, '')
  return `${base}/kittex-tex.XXXXXXXXXX`
}

/** Whether a path is one mktemp made from jobDirTemplate (and so safe to remove whole). */
export function isJobDir(path: string): boolean {
  return /^\/(?:[^\n/]+\/)*kittex-tex\.[A-Za-z0-9]{10}$/.test(path) && !path.includes('/../') && !path.includes('/./')
}

/**
 * The first error TeX reported, as one line: its message (`Undefined control
 * sequence \foo`), and the source's line it was on when that is known. TeX's
 * log has it as `! message.`, then `l.N text-before<break>text-after`.
 */
export function texError(log: string, offset = 0): string {
  const lines = log.split(/\r?\n/)
  const at = lines.findIndex(line => line.startsWith('! '))
  if (at < 0) {
    if (/No pages of output/.test(log)) return 'the picture is empty'
    return /Emergency stop|Fatal error/.test(log) ? 'TeX stopped' : 'TeX failed'
  }
  let message = lines[at]!.slice(2).trim().replace(/\.$/, '')
  // A LaTeX or package error's own prefix says little the message doesn't.
  message = message.replace(/^(?:LaTeX|Package \S+|Class \S+) Error:\s*/, '')
  let line: number | undefined
  for (const next of lines.slice(at + 1, at + 12)) {
    const context = /^l\.(\d+) (.*)$/.exec(next)
    if (context) {
      const n = Number(context[1]) - offset
      if (n >= 1) line = n
      if (/^Undefined control sequence$/.test(message)) {
        const token = /(\\[A-Za-z@]+|\\.)\s*$/.exec(context[2]!)?.[1]
        if (token) message += ` ${token}`
      }
      break
    }
  }
  return line === undefined ? message : `${message} (line ${line})`
}
