import{init_svg,STANDALONE_NO_PS,DUMP_POINT,PREAMBLE_VERSION,MATH_PREAMBLE,REFUSED_COMMANDS,MAX_TEX_SOURCE,MAX_CPU_SECONDS,JOB_NAME,PDF_NAME,NEAR,SATURATED,KEEP_CENTER,KEEP_BAND,MIN_CONTRAST,WHITE,BLACK2,init_svg_text,init_xml,readSvg,MAX_BLOCK_IMAGES,LINE_WIDTH_PT,TEXT_HEIGHT_PT,IMAGE_GAP,PNG_SIGNATURE,__toESM,require_decoder,MAX_JPEG_SCANS,VISITS_PER_COEFFICIENT}from'./p31.js';export*from'./p31.js';
// core/src/diagram/index.ts
init_svg();
// core/src/diagram/tex.ts
function diagramFence(info) {
  const lang = info.trim().split(/\s+/, 1)[0].toLowerCase();
  if (lang === "latex" || lang === "tex") return "latex";
  if (lang === "tikz") return "tikz";
  return void 0;
}
function drawsPicture(source, lang) {
  if (lang !== "latex") return true;
  if (isDocument(source)) return hasBody(source);
  return PICTURE.test(source) || IMPLIED_PACKAGES.some((implied) => implied.drawing && implied.use.test(source));
}
var PICTURE = /\\begin\{(?:tikzpicture|tikzcd|circuitikz|axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis|ternaryaxis|picture|forest|chemfig)\}|\\(?:tikz|chemfig|schemestart|chemname|ctikzset|draw|SI|qty|si|unit|num)\b/;
var IMPLIED_PACKAGES = [
  { use: /\\begin\{quantikz\}/, line: "\\usepackage{quantikz}", name: "quantikz", drawing: true },
  { use: /\\feynmandiagram\b|\\begin\{feynman\}/, line: "\\usepackage{tikz-feynman}", name: "tikz-feynman", drawing: true },
  { use: /\\begin\{ganttchart\}/, line: "\\usepackage{pgfgantt}", name: "pgfgantt", drawing: true },
  { use: /\\smartdiagram\b/, line: "\\usepackage{smartdiagram}", name: "smartdiagram", drawing: true },
  { use: /\\begin\{karnaugh-map\}/, line: "\\usepackage{karnaugh-map}", name: "karnaugh-map", drawing: true },
  { use: /\\begin\{tikztimingtable\}|\\texttiming\b/, line: "\\usepackage{tikz-timing}", name: "tikz-timing", drawing: true },
  { use: /\\begin\{neuralnetwork\}/, line: "\\usepackage{neuralnetwork}", name: "neuralnetwork", drawing: true },
  { use: /\\begin\{sequencediagram\}/, line: "\\usepackage{pgf-umlsd}", name: "pgf-umlsd", drawing: true },
  { use: /\\begin\{dependency\}/, line: "\\usepackage{tikz-dependency}", name: "tikz-dependency", drawing: true },
  { use: /\\begin\{(?:BodeMagPlot|BodePhPlot|BodePlot|NyquistPlot|NicholsChart)\}/, line: "\\usepackage{bodeplot}", name: "bodeplot", drawing: true },
  { use: /\\xymatrix\b|\\begin\{xy\}/, line: "\\usepackage[all]{xy}", name: "xy", drawing: true },
  { use: /\\Qcircuit\b/, line: "\\usepackage[braket,qm]{qcircuit}", name: "qcircuit", drawing: true },
  { use: /\\pie\s*[[{]/, line: "\\usepackage{pgf-pie}", name: "pgf-pie", drawing: true },
  { use: /\\Tree\s*\[/, line: "\\usepackage{tikz-qtree}", name: "tikz-qtree", drawing: true },
  { use: /\\begin\{forest\}/, line: "\\usepackage{forest}", name: "forest" },
  { use: /\\tkz[A-Z]/, line: "\\usepackage{tkz-euclide}", name: "tkz-euclide" },
  { use: /\\tdplotsetmaincoords\b|\btdplot_main_coords\b/, line: "\\usepackage{tikz-3dplot}", name: "tikz-3dplot" },
  { use: /\\ce\s*\{/, line: "\\usepackage[version=4]{mhchem}", name: "mhchem" },
  { use: /\\bm\s*\{/, line: "\\usepackage{bm}", name: "bm" },
  { use: /\\mathscr\s*\{/, line: "\\usepackage{mathrsfs}", name: "mathrsfs" },
  { use: /\\(?:toprule|midrule|bottomrule)\b/, line: "\\usepackage{booktabs}", name: "booktabs" },
  { use: /\\multirow\b/, line: "\\usepackage{multirow}", name: "multirow" },
  // A TikZ library from spath3, which a basic TeX Live (BasicTeX, the README's lists) lacks: loaded only when used.
  { use: /\\(?:calligraphy|pen)\b|calligraphic|copperplate|nib style|pen colou?r/, line: "\\usetikzlibrary{calligraphy}", name: "calligraphy" }
];
function impliedPackages(body, moved) {
  const loaded2 = new Set(moved.flatMap((line) => /^\\(?:usepackage|RequirePackage)\s*(?:\[[^\]]*\]\s*)?\{([^}]*)\}/.exec(line)?.[1]?.split(",").map((name) => name.trim()) ?? []));
  return IMPLIED_PACKAGES.filter((implied) => implied.use.test(body) && !loaded2.has(implied.name)).map((implied) => implied.line);
}
function isDocument(source) {
  return /^(?:\s|%[^\n]*\n)*\\documentclass\b/.test(source) || /\\begin\{document\}/.test(source);
}
function hasBody(source) {
  const start = /\\begin\{document\}/.exec(source);
  if (!start) return false;
  const end = source.indexOf("\\end{document}", start.index);
  const body = source.slice(start.index + start[0].length, end < 0 ? void 0 : end);
  return body.replace(/(^|[^\\])((?:\\\\)*)%[^\n]*/g, "$1$2").trim() !== "";
}
var TIKZ_LIBRARIES = [
  "arrows.meta,positioning,calc,shapes.geometric,shapes.misc,shapes.arrows,decorations.pathmorphing,decorations.markings,patterns,matrix,fit,backgrounds,automata,trees,intersections,angles,quotes,3d,shadows,chains",
  // What replies use and often don't load: braces, text along a path, the old arrow tips (stealth', latex'), shapes'
  // other families, fadings, magnified insets, \graph, \tikzmath, mindmaps, petri nets, plot marks, bent tips.
  "arrows,decorations.pathreplacing,decorations.text,decorations.shapes,shapes.symbols,shapes.multipart,shapes.callouts,fadings,shadings,spy,through,graphs,math,mindmap,petri,plotmarks,patterns.meta,bending,perspective"
].join(",");
var FRAGMENT_PREAMBLE = [
  "\\documentclass[dvisvgm,border=1pt]{standalone}",
  `\\makeatletter${STANDALONE_NO_PS}\\makeatother`,
  "\\usepackage{amsmath,amssymb}",
  "\\usepackage{tikz}",
  `\\usetikzlibrary{${TIKZ_LIBRARIES}}`,
  "\\usepackage{pgfplots}",
  "\\pgfplotsset{compat=1.18}",
  // pgfplots' own libraries: polar axes, groups of plots, box plots, more colormaps, patch plots, ternary axes and dates.
  "\\usepgfplotslibrary{fillbetween,polar,groupplots,statistics,colormaps,patchplots,ternary,dateplot}",
  "\\usepackage{chemfig}",
  "\\usepackage{circuitikz}",
  "\\usepackage{tikz-cd}",
  "\\usepackage{siunitx}"
];
var PREAMBLE_LINE = /^[ \t]*\\(?:usepackage|RequirePackage|usetikzlibrary|usepgfplotslibrary|usepgflibrary|usegdlibrary)\b[^\n]*$/gm;
function curvesSampledOnce(source) {
  const start = /\\addplot3\s*\+?/g;
  let out = "";
  let from = 0;
  for (let match = start.exec(source); match; match = start.exec(source)) {
    let at = skipBlanks(source, match.index + match[0].length);
    let options3;
    if (source[at] === "[") {
      const close2 = matchingBracket(source, at, "[", "]");
      if (close2 < 0) continue;
      options3 = { open: at, close: close2 };
      at = skipBlanks(source, close2 + 1);
    }
    if (source[at] !== "(") continue;
    const close = matchingBracket(source, at, "(", ")");
    if (close < 0) continue;
    const triple = source.slice(at + 1, close);
    const optionText = options3 ? source.slice(options3.open + 1, options3.close) : "";
    if (/(?:^|[^A-Za-z\\])y(?![A-Za-z])|\\y(?![A-Za-z])/.test(triple) || /samples\s+y|y\s+domain|variable\s+y/.test(optionText)) continue;
    if (options3) {
      const separator = optionText.trim() === "" ? "" : ", ";
      out += `${source.slice(from, options3.close)}${separator}samples y=0`;
      from = options3.close;
    } else {
      const end = match.index + match[0].length;
      out += `${source.slice(from, end)}[samples y=0]`;
      from = end;
    }
  }
  return out + source.slice(from);
}
function inlineTables(source) {
  const read = /\\pgfplotstableread\s*/g;
  const tables = /* @__PURE__ */ new Map();
  let blanked = "";
  let from = 0;
  for (let match = read.exec(source); match; match = read.exec(source)) {
    let at = match.index + match[0].length;
    let options3 = "";
    if (source[at] === "[") {
      const close2 = matchingBracket(source, at, "[", "]");
      if (close2 < 0) return source;
      options3 = source.slice(at + 1, close2).trim();
      at = skipBlanks(source, close2 + 1);
    }
    if (source[at] !== "{") return source;
    const close = matchingBracket(source, at, "{", "}");
    if (close < 0) return source;
    const rows = source.slice(at + 1, close).split("\n").map((line) => line.replace(/(?<!\\)%.*$/, "").trim()).filter((line) => line !== "");
    if (rows.length < 2 || !source.slice(at + 1, close).includes("\n") || /\\\\/.test(source.slice(at + 1, close))) return source;
    at = skipBlanks(source, close + 1);
    const name = /^(?:\{\s*(\\[A-Za-z]+)\s*\}|(\\[A-Za-z]+)(?![A-Za-z]))/.exec(source.slice(at));
    if (!name) return source;
    const end = at + name[0].length;
    tables.set(name[1] ?? name[2], { options: options3, rows: rows.map((row) => `${row}\\\\`).join("") });
    blanked += source.slice(from, match.index) + source.slice(match.index, end).replace(/[^\n]/g, "");
    from = end;
  }
  if (tables.size === 0) return source;
  blanked += source.slice(from);
  let inlined = blanked.replace(/^([ \t]*\\usepackage\s*(?:\[[^\]]*\]\s*)?\{)([^}]*)\}/gm, (_, head, names) => {
    const kept = names.split(",").filter((name) => name.trim() !== "pgfplotstable");
    return kept.length === 0 ? "" : `${head}${kept.join(",")}}`;
  });
  for (const [name, table2] of tables) {
    const use2 = new RegExp(String.raw`\btable\s*(?:\[([^\]]*)\])?\s*\{\s*\\${name.slice(1)}\s*\}`, "g");
    inlined = inlined.replace(use2, (_, options3) => {
      const all = ["row sep=\\\\", table2.options, options3?.trim() ?? ""].filter((option) => option !== "").join(", ");
      return `table[${all}]{${table2.rows}}`;
    });
    if (new RegExp(String.raw`\\${name.slice(1)}(?![A-Za-z])`).test(inlined)) return source;
  }
  return inlined;
}
function skipBlanks(text, at) {
  while (at < text.length && /\s/.test(text[at])) at++;
  return at;
}
function matchingBracket(text, open, opening, closing) {
  let depth = 0;
  for (let at = open; at < text.length; at++) {
    if (text[at] === opening) depth++;
    else if (text[at] === closing && --depth === 0) return at;
  }
  return -1;
}
function diagramDocument(source, lang) {
  const trimmed2 = curvesSampledOnce(
    source.replace(/^\s*\n/, "").replace(/\s+$/, "").replace(/shader\s*=\s*(\{\s*)?(faceted\s+)?interp\b/g, (_, brace, faceted) => `shader=${brace ? "{" : ""}${faceted ? "faceted" : "flat"}`).replace(/\bcolorbar(\s+(?:horizontal|left|right))?(?=\s*[,\]])/g, (_, side) => side ? `colorbar${side}, colorbar sampled` : "colorbar sampled")
  );
  if (lang === "latex" && isDocument(trimmed2)) {
    const hasClass = /^(?:\s|%[^\n]*\n)*\\documentclass\b/.test(trimmed2);
    const body2 = hasClass ? trimmed2 : `\\documentclass[dvisvgm,border=1pt]{standalone}
${trimmed2}`;
    const head2 = `\\def\\pgfsysdriver{pgfsys-dvisvgm.def}\\PassOptionsToPackage{dvisvgm}{graphicx}\\makeatletter\\AddToHook{class/standalone/after}{${STANDALONE_NO_PS}}\\makeatother`;
    const classed = body2.replace(
      /\\documentclass\s*(?:\[([^\]]*)\])?\s*\{/,
      (_, options3) => options3 === void 0 ? "\\documentclass[dvisvgm]{" : /(?:^|,)\s*dvisvgm\s*(?:,|$)/.test(options3) ? `\\documentclass[${options3}]{` : `\\documentclass[${options3},dvisvgm]{`
    );
    const text = `${head2}
${classed.replace(/\\begin\{document\}/, "\\begin{document}\\pagestyle{empty}\\thispagestyle{empty}")}
`;
    return { text, offset: hasClass ? 1 : 2, baseline: "bottom", fontSize: documentFontSize(body2) };
  }
  const moved = [...trimmed2.matchAll(PREAMBLE_LINE)].map((match) => match[0].trim());
  let body = moved.length > 0 ? trimmed2.replace(PREAMBLE_LINE, "") : trimmed2;
  body = body.replace(/(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g, "$\\displaystyle $1$").replace(/\$\$([\s\S]*?)\$\$/g, "$\\displaystyle $1$");
  if (lang === "tikz" && !/\\begin\{tikzpicture\}|\\tikz\b/.test(body)) body = `\\begin{tikzpicture}
${body}
\\end{tikzpicture}`;
  const head = [...FRAGMENT_PREAMBLE, DUMP_POINT, ...moved, ...impliedPackages(body, moved), "\\begin{document}"];
  const wrapped = lang === "tikz" && body !== trimmed2 && body.startsWith("\\begin{tikzpicture}\n") && !trimmed2.startsWith("\\begin{tikzpicture}");
  const offset = head.length + (wrapped ? 1 : 0);
  return { text: `${head.join("\n")}
${body}
\\end{document}
`, offset, baseline: "bottom", fontSize: 10, format: true };
}
var FORMAT_SOURCE = `${[...FRAGMENT_PREAMBLE, DUMP_POINT, "\\begin{document}", "\\end{document}"].join("\n")}
`;
function formatName(versions) {
  let hash = 2166136261;
  for (const char of `${PREAMBLE_VERSION}
${versions}
${FORMAT_SOURCE}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `kittex-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
function formatArgv(name) {
  return ["latex", "-ini", "-no-shell-escape", "-interaction=nonstopmode", "-halt-on-error", "-no-mktex=tex", "-no-mktex=tfm", "-no-mktex=pk", `-jobname=${name}`, "&latex", "mylatexformat.ltx", `${name}.tex`];
}
function latexArgv(format) {
  return format === void 0 ? [...LATEX_ARGV] : [...LATEX_ARGV.slice(0, -2), `-fmt=${format}`, ...LATEX_ARGV.slice(-2)];
}
var DISPLAY_ENV = /^\\begin\{(equation|align|gather|multline|flalign|alignat|eqnarray)\*?\}/;
function mathDocument(tex, display) {
  const body = tex.trim();
  if (!display) {
    const head2 = [...MATH_PREAMBLE.slice(0, 3), "\\usepackage[active]{preview}", "\\begin{document}"];
    return { text: `${head2.join("\n")}
\\begin{preview}$${body}$\\end{preview}
\\end{document}
`, offset: head2.length, baseline: "origin", fontSize: 10 };
  }
  const head = [...MATH_PREAMBLE, "\\begin{document}"];
  const math = DISPLAY_ENV.test(body) ? body : `\\[
${body}
\\]`;
  return { text: `${head.join("\n")}
${math}
\\end{document}
`, offset: head.length + (DISPLAY_ENV.test(body) ? 0 : 1), baseline: "bottom", fontSize: 10 };
}
function documentFontSize(source) {
  const options3 = /\\documentclass\s*\[([^\]]*)\]/.exec(source)?.[1] ?? "";
  const size = /(?:^|,)\s*(\d{1,2}(?:\.\d+)?)pt\s*(?:,|$)/.exec(options3)?.[1];
  const n = size === void 0 ? 10 : Number(size);
  return n >= 5 && n <= 25 ? n : 10;
}
function emPerUnit(document) {
  return 72.27 / 72 / document.fontSize;
}
var REFUSED_PATTERN = new RegExp(String.raw`\\(?:${REFUSED_COMMANDS.map((name) => name.replace(/[*]/g, "\\*")).join("|")})(?![A-Za-z@])`);
var REFUSED_PACKAGES = /* @__PURE__ */ new Set([
  "shellesc",
  "minted",
  "pythontex",
  "sagetex",
  "bashful",
  "gnuplottex",
  "asymptote",
  "svg",
  "epstopdf",
  "auto-pst-pdf",
  "pst-pdf",
  "luacode",
  "luatextra",
  "luapackageloader",
  "fontspec",
  "filecontents",
  "catchfile",
  "verbatim",
  "fancyvrb",
  "listings",
  "import",
  "standalone",
  "datatool",
  "csvsimple",
  "readarray",
  "pgfplotstable",
  "xstring",
  "docmute",
  "subfiles",
  "embedfile",
  "attachfile",
  "attachfile2",
  "write18",
  "pstricks",
  "pst-node"
]);
var FILE_COMMAND = /\\(?:usepackage|RequirePackage|documentclass|LoadClass|usetikzlibrary|usepgfplotslibrary|usepgflibrary)\s*(?:\[[^\]]*\]\s*)?(?:\{([^}]*)\}|([^\s{\\][^\s\\]*))/g;
var PLOT_FILE = /\b(?:table|file|graphics)\s*(?:\[[^\]]*\]\s*)?\{([^}\\\n]*)\}/g;
var PLOT_FILE_MACRO = /\b(?:table|file|graphics)\s*(?:\[[^\]]*\]\s*)?\{\s*\\[A-Za-z]/;
function unsafeTex(source) {
  if (source.length > MAX_TEX_SOURCE) return `source longer than ${MAX_TEX_SOURCE} characters`;
  if (source.includes("^^")) return "uses ^^ character notation";
  if (/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(source)) return "holds control characters";
  const refused = REFUSED_PATTERN.exec(source);
  if (refused) return `uses ${refused[0]}`;
  const internal = /\\[A-Za-z]*@[A-Za-z@]*/.exec(source);
  if (internal) return `uses ${internal[0]}`;
  if (/\\begin\{(?:luacode\*?|filecontents\*?|verbatimwrite|VerbatimOut|lstlisting|minted|pycode|sagesilent|sageblock|bash|asy|asydef)\}/.test(source)) return "uses an environment that runs code or writes files";
  for (const match of source.matchAll(FILE_COMMAND)) {
    const names = (match[1] ?? match[2] ?? "").split(",");
    for (const raw of names) {
      const name = raw.trim();
      if (unsafePath(name)) return `reads ${name}`;
      if (/^\\(?:usepackage|RequirePackage)/.test(match[0]) && REFUSED_PACKAGES.has(name)) return `uses the ${name} package`;
    }
  }
  for (const match of source.matchAll(PLOT_FILE)) {
    const name = match[1].trim();
    if (name !== "" && unsafePath(name)) return `reads ${name}`;
  }
  if (PLOT_FILE_MACRO.test(source)) return "reads a plot file named by a macro";
  if (/\bgnuplot\b|\\addplot[^;]*\bshell\b/.test(source)) return "runs gnuplot or a shell";
  const path = /(?:^|[\s{=,(])((?:~|\$HOME|\$\{HOME\})\/|\.\.[/\\]|\/+(?:home|root|etc|Users|private|var|tmp|proc|sys|dev|run|mnt|media|srv|opt|usr|Library|Volumes|System|boot|snap|nix)\b)/.exec(source);
  if (path) return `names a path outside the picture (${path[1]})`;
  return void 0;
}
function unsafePath(name) {
  return /^[/\\~]|^[A-Za-z]:|\.\.|^\.|\$|\||[`"'<>]|^\s*-/.test(name) || /[/\\]\./.test(name);
}
var MAX_OUTPUT_BYTES = 64 * 1024 * 1024;
function bwrapProbe(hide) {
  return ["bwrap", ...bwrapMounts(hide, void 0), "true"];
}
function bwrapMounts(hide, dir, readable = []) {
  const args = ["--ro-bind", "/", "/", "--dev", "/dev", "--proc", "/proc"];
  for (const path of hide) args.push("--tmpfs", path);
  for (const path of readable) args.push("--ro-bind", path, path);
  if (dir !== void 0) args.push("--bind", dir, dir, "--chdir", dir);
  args.push("--unshare-all", "--die-with-parent", "--new-session");
  return args;
}
var ULIMIT_SCRIPT = `ulimit -f ${MAX_OUTPUT_BYTES / 1024} && ulimit -t ${MAX_CPU_SECONDS} && exec "$@"`;
function ulimited(argv) {
  return ["/bin/sh", "-c", ULIMIT_SCRIPT, "kittex-tex", ...argv];
}
function ulimitProbe() {
  return ulimited(["true"]);
}
function confined(argv, dir, confinement, readable = []) {
  let out = [...argv];
  if (confinement.bwrap) out = ["bwrap", ...bwrapMounts(confinement.bwrap.hide, dir, readable), ...out];
  if (confinement.prlimit) out = ["prlimit", `--fsize=${MAX_OUTPUT_BYTES}`, `--cpu=${MAX_CPU_SECONDS}`, ...out];
  else if (confinement.ulimit) out = ulimited(out);
  return out;
}
var LATEX_ARGV = [
  "latex",
  "-no-shell-escape",
  "-interaction=nonstopmode",
  "-halt-on-error",
  "-no-mktex=tex",
  "-no-mktex=tfm",
  "-no-mktex=pk",
  `-jobname=${JOB_NAME}`,
  `${JOB_NAME}.tex`
];
function dvisvgmArgv(dir) {
  return ["dvisvgm", "--no-fonts", "--exact-bbox", "--no-specials=ps,pdf,html", `--libgs=${dir}/no-ghostscript`, "--no-mktexmf", "--cache=none", `--tmpdir=${dir}`, "--page=1", "--stdout", "--verbosity=1", `${JOB_NAME}.dvi`];
}
function pdfArgv(converter2, dir) {
  if (converter2 === "mutool") return ["mutool", "draw", "-q", "-F", "svg", "-O", "text=path", "-o", "-", PDF_NAME, "1"];
  return ["dvisvgm", "--pdf", "--page=1", "--no-fonts", "--cache=none", `--tmpdir=${dir}`, "--stdout", "--verbosity=1", PDF_NAME];
}
function pdfCopyArgv(path, dir, confinement) {
  return confined(["cp", "--", path, `${dir}/${PDF_NAME}`], dir, { prlimit: confinement.prlimit, ...confinement.ulimit ? { ulimit: true } : {} });
}
var TRIAL_PDF = (() => {
  const content = "0 0 1 rg 10 10 30 20 re f\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 50 40] /Contents 4 0 R /Resources << >> >>",
    `<< /Length ${content.length} >>
stream
${content}endstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i2) => {
    offsets.push(pdf.length);
    pdf += `${i2 + 1} 0 obj
${body}
endobj
`;
  });
  const xref = pdf.length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n 
`).join("")}`;
  return `${pdf}trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xref}
%%EOF
`;
})();
function texEnvironment(dir) {
  return {
    shell_escape: "f",
    openin_any: "p",
    openout_any: "p",
    TEXMFOUTPUT: dir,
    HOME: dir,
    MKTEXTEX: "0",
    MKTEXTFM: "0",
    MKTEXPK: "0",
    MKTEXMF: "0",
    MKTEXFMT: "0",
    max_print_line: "1000",
    error_line: "254",
    half_error_line: "238"
  };
}
function jobDirTemplate(tmpdir) {
  const base = (tmpdir && tmpdir.startsWith("/") ? tmpdir : "/tmp").replace(/\/+$/, "");
  return `${base}/kittex-tex.XXXXXXXXXX`;
}
function isJobDir(path) {
  return /^\/(?:[^\n/]+\/)*kittex-tex\.[A-Za-z0-9]{10}$/.test(path) && !path.includes("/../") && !path.includes("/./");
}
function texError(log, offset = 0) {
  const lines2 = log.split(/\r?\n/);
  const at = lines2.findIndex((line2) => line2.startsWith("! "));
  if (at < 0) {
    if (/No pages of output/.test(log)) return "the picture is empty";
    return /Emergency stop|Fatal error/.test(log) ? "TeX stopped" : "TeX failed";
  }
  let message = lines2[at].slice(2).trim().replace(/\.$/, "");
  message = message.replace(/^(?:LaTeX|Package \S+|Class \S+) Error:\s*/, "");
  let line;
  if (/^Undefined control sequence$/.test(message)) {
    const first = (lines2[at + 1] ?? "").replace(/^l\.\d+ /, "");
    const token2 = /(\\[A-Za-z@]+|\\.)\s*$/.exec(first)?.[1];
    if (token2) message += ` ${token2}`;
  }
  for (const next of lines2.slice(at + 1, at + 12)) {
    const context2 = /^l\.(\d+) (.*)$/.exec(next);
    if (context2) {
      const n = Number(context2[1]) - offset;
      if (n >= 1) line = n;
      break;
    }
  }
  return line === void 0 ? message : `${message} (line ${line})`;
}
// core/src/diagram/color.ts
function assumedBackground(ink) {
  return oklab(ink).l > 0.5 ? { r: 24, g: 24, b: 24 } : { r: 255, g: 255, b: 255 };
}
function adaptColor(color, paper, line) {
  if (color.r <= NEAR && color.g <= NEAR && color.b <= NEAR) return paper.ink;
  if (color.r >= 255 - NEAR && color.g >= 255 - NEAR && color.b >= 255 - NEAR) return "erase";
  const lab = oklab(color);
  const inkL = oklab(paper.ink).l;
  const backL = oklab(paper.background).l;
  let l = lab.l;
  if (backL < 0.5) {
    const flipped = inkL + lab.l * (backL - inkL);
    const chroma = Math.hypot(lab.a, lab.b);
    const keep = clamp012(chroma / SATURATED) * clamp012(1 - Math.abs(lab.l - KEEP_CENTER) / KEEP_BAND);
    l = flipped + (lab.l - flipped) * keep;
  }
  if (l === lab.l && !(line && Math.abs(l - backL) < MIN_CONTRAST)) return { ...color };
  if (line && Math.abs(l - backL) < MIN_CONTRAST) {
    const towards = inkL >= backL ? 1 : -1;
    l = clamp012(backL + towards * MIN_CONTRAST);
  }
  return fromOklab(l, lab.a, lab.b);
}
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function legible(color, against, floor) {
  if (contrast(color, against) >= floor) return color;
  const lab = oklab(color);
  const lighter = contrast(WHITE, against) >= contrast(BLACK2, against);
  let near = lab.l;
  let far = lighter ? 1 : 0;
  if (contrast(fromOklab(far, lab.a, lab.b), against) < floor) return fromOklab(far, lab.a, lab.b);
  for (let i2 = 0; i2 < 20; i2++) {
    const mid = (near + far) / 2;
    if (contrast(fromOklab(mid, lab.a, lab.b), against) >= floor) far = mid;
    else near = mid;
  }
  return fromOklab(far, lab.a, lab.b);
}
var luminance = (c) => 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b);
var toLinear = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
var fromLinear = (v) => (v <= 31308e-7 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255;
function oklab(c) {
  const r = toLinear(c.r), g = toLinear(c.g), b = toLinear(c.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  };
}
function linearOf(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
}
function fromOklab(L, a, b) {
  const inside = (k2) => linearOf(L, a * k2, b * k2).every((v) => v >= -1e-6 && v <= 1 + 1e-6);
  let k = 1;
  if (!inside(1)) {
    let lo = 0;
    let hi = 1;
    for (let i2 = 0; i2 < 20; i2++) {
      const mid = (lo + hi) / 2;
      if (inside(mid)) lo = mid;
      else hi = mid;
    }
    k = lo;
  }
  const [r, g, bl] = linearOf(L, a * k, b * k);
  const byte = (v) => Math.min(255, Math.max(0, Math.round(fromLinear(Math.min(1, Math.max(0, v))))));
  return { r: byte(r), g: byte(g), b: byte(bl) };
}
var clamp012 = (v) => Math.min(1, Math.max(0, v));
// core/src/diagram/index.ts
init_svg();
init_svg_text();
init_xml();
function texPicture(svg, document, text) {
  return readSvg(svg, { baseline: document.baseline, emPerUnit: emPerUnit(document), ...text ? { text } : {} });
}
// core/src/image/block.ts
function blockImages(block2) {
  return block2.rows.flat();
}
var UNIT_PT = {
  pt: 1,
  bp: 72.27 / 72,
  px: 72.27 / 72,
  in: 72.27,
  cm: 72.27 / 2.54,
  mm: 72.27 / 25.4,
  pc: 12,
  dd: 1238 / 1157,
  cc: 12 * 1238 / 1157,
  sp: 1 / 65536,
  em: 10,
  ex: 4.31
};
var WIDTHS = /* @__PURE__ */ new Set(["linewidth", "textwidth", "columnwidth", "hsize", "paperwidth"]);
var HEIGHTS = /* @__PURE__ */ new Set(["textheight", "vsize", "paperheight"]);
function parseLength(text) {
  const m = /^\s*(\d*\.?\d*)\s*(?:\\([A-Za-z]+)|([a-z]{2}))\s*$/.exec(text);
  if (!m) return void 0;
  const number = m[1] === "" ? 1 : Number(m[1]);
  if (!Number.isFinite(number) || number <= 0) return void 0;
  if (m[2] !== void 0) {
    if (WIDTHS.has(m[2])) return { kind: "line", fraction: number };
    if (HEIGHTS.has(m[2])) return { kind: "page", fraction: number };
    return void 0;
  }
  const unit = m[1] === "" ? void 0 : UNIT_PT[m[3]];
  return unit === void 0 ? void 0 : { kind: "absolute", pt: number * unit };
}
function parseOptions(text) {
  const out = {};
  for (const item of text.split(",")) {
    const eq = item.indexOf("=");
    if (eq < 0) continue;
    const key = item.slice(0, eq).trim();
    const value = item.slice(eq + 1).trim().replace(/^\{(.*)\}$/, "$1");
    if (key === "width" || key === "height") {
      const length4 = parseLength(value);
      if (length4) out[key] = length4;
    } else if (key === "scale") {
      const scale2 = Number(value);
      if (Number.isFinite(scale2) && scale2 > 0) out.scale = scale2;
    }
  }
  return out;
}
function groupEnd(text, open) {
  let depth = 0;
  for (let at = open; at < text.length; at++) {
    const c = text[at];
    if (c === "\\") at++;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return at + 1;
  }
  return -1;
}
var SPACING = /^\\(?:centering|noindent|smallskip|medskip|bigskip)(?![A-Za-z])/;
var GAP = /^(?:~|\\(?:hfill|hfil|quad|qquad)(?![A-Za-z])|\\[,;: ]|\\hspace\*?\s*\{[^{}\n]*\})/;
var ROW_BREAK = /^(?:\\\\\*?(?:\s*\[[^\]\n]*\])?|\\par(?![A-Za-z]))/;
function imageBlock(source) {
  let rest = source.replace(/(?<=(?:^|[^\\])(?:\\\\)*)%[^\n]*(?:\n[ \t]*)?/g, "");
  const open = [];
  const rows = [[]];
  let count = 0;
  const inBox = () => open.some((one) => one.box !== void 0);
  const breakRow2 = () => {
    if (!inBox() && rows.at(-1).length > 0) rows.push([]);
  };
  for (; ; ) {
    const space = /^\s*/.exec(rest)[0];
    if (/\n[ \t]*\n/.test(space)) breakRow2();
    rest = rest.slice(space.length);
    if (rest === "") break;
    let m;
    if (m = /^\\begin\s*\{(figure\*?|center)\}\s*(?:\[[^\]\n]*\])?/.exec(rest)) {
      if (inBox()) return void 0;
      open.push({ name: m[1] });
    } else if (m = /^\\begin\s*\{(subfigure|minipage)\}\s*(?:\[[^\]\n]*\]\s*){0,3}\{([^{}\n]*)\}/.exec(rest)) {
      const box2 = parseLength(m[2]);
      if (inBox() || !box2 || box2.kind === "page") return void 0;
      open.push({ name: m[1], box: box2 });
    } else if (m = /^\\end\s*\{(figure\*?|center|subfigure|minipage)\}/.exec(rest)) {
      const closed = open.pop();
      if (!closed || closed.name !== m[1] || closed.box !== void 0 && !closed.filled) return void 0;
    } else if ((m = SPACING.exec(rest)) || (m = GAP.exec(rest))) {
    } else if (m = ROW_BREAK.exec(rest)) {
      breakRow2();
    } else if (m = /^\\(?:caption|subcaption|label)\s*(?:\[[^\]\n]*\]\s*)?(?=\{)/.exec(rest)) {
      const end = groupEnd(rest, m[0].length);
      if (end < 0) return void 0;
      rest = rest.slice(end);
      continue;
    } else if (m = /^\\includegraphics\*?\s*(?:\[([^\]]*)\]\s*)?\{([^{}\n]*)\}/.exec(rest)) {
      const path = m[2].trim().replace(/^"(.*)"$/, "$1");
      const box2 = open.findLast((one) => one.box !== void 0);
      if (path === "" || box2?.filled || ++count > MAX_BLOCK_IMAGES) return void 0;
      if (box2) box2.filled = true;
      rows.at(-1).push({ path, ...parseOptions(m[1] ?? ""), ...box2?.box ? { box: box2.box } : {} });
    } else {
      return void 0;
    }
    rest = rest.slice(m[0].length);
  }
  if (rows.at(-1).length === 0) rows.pop();
  return open.length === 0 && rows.length > 0 ? { rows } : void 0;
}
function resolveImagePath(path, cwd, home) {
  let full;
  if (path.startsWith("/")) full = path;
  else if (path === "~" || path.startsWith("~/")) {
    if (home === void 0 || !home.startsWith("/")) return void 0;
    full = `${home}/${path.slice(2)}`;
  } else if (path.startsWith("~")) return void 0;
  else {
    if (cwd === void 0 || !cwd.startsWith("/")) return void 0;
    full = `${cwd}/${path}`;
  }
  const parts = [];
  for (const part of full.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return `/${parts.join("/")}`;
}
function fitImage(own, spec, box2) {
  const { columnPx, rowsPx } = boxPixels(box2);
  const { width, height: height2 } = imageSize(own, spec, columnPx, columnPx, rowsPx);
  const widthPx = Math.max(1, Math.round(width));
  const heightPx = Math.max(1, Math.min(Math.round(rowsPx), Math.round(height2)));
  return { ...cellsFor(widthPx, heightPx, box2), widthPx, heightPx };
}
function boxPixels(box2) {
  return { columnPx: Math.max(1, Math.floor(box2.maxColumns)) * box2.cellWidth, rowsPx: Math.max(1, Math.floor(box2.maxRows)) * box2.cellHeight };
}
function cellsFor(widthPx, heightPx, box2) {
  return {
    columns: Math.min(Math.max(1, Math.floor(box2.maxColumns)), Math.max(1, Math.ceil(widthPx / box2.cellWidth - 1e-9))),
    rows: Math.min(Math.max(1, Math.floor(box2.maxRows)), Math.max(1, Math.ceil(heightPx / box2.cellHeight - 1e-9)))
  };
}
function imageSize(own, spec, linePx, columnPx, rowsPx) {
  const ownWidth = Math.max(1, own.width);
  const aspect = Math.max(1, own.height) / ownWidth;
  const along = (length4, axis) => {
    if (length4.kind === "line") return length4.fraction * linePx;
    if (length4.kind === "page") return length4.fraction * rowsPx;
    return axis === "width" ? length4.pt / LINE_WIDTH_PT * columnPx : length4.pt / TEXT_HEIGHT_PT * rowsPx;
  };
  let width;
  if (spec.width && spec.height) width = Math.min(along(spec.width, "width"), along(spec.height, "height") / aspect);
  else if (spec.width) width = along(spec.width, "width");
  else if (spec.height) width = along(spec.height, "height") / aspect;
  else if (spec.scale !== void 0) width = ownWidth * spec.scale;
  else width = linePx;
  width = Math.min(width, linePx, rowsPx / aspect, ownWidth);
  return { width, height: width * aspect };
}
function fitImageBlock(own, block2, box2) {
  const { columnPx, rowsPx } = boxPixels(box2);
  const gap2 = IMAGE_GAP * columnPx;
  let next = 0;
  const rows = block2.rows.map((row) => {
    const items = row.map((image) => {
      const boxPx = image.box && Math.min(columnPx, image.box.kind === "absolute" ? image.box.pt / LINE_WIDTH_PT * columnPx : image.box.fraction * columnPx);
      const size = imageSize(own[next++] ?? { width: 1, height: 1 }, image, boxPx ?? columnPx, columnPx, rowsPx);
      return { ...size, slot: Math.max(boxPx ?? 0, size.width) };
    });
    const width2 = items.reduce((sum2, item) => sum2 + item.slot, 0) + gap2 * (items.length - 1);
    return { items, width: width2, height: Math.max(...items.map((item) => item.height)) };
  });
  const width = Math.max(...rows.map((row) => row.width));
  const height2 = rows.reduce((sum2, row) => sum2 + row.height, 0) + gap2 * (rows.length - 1);
  const k = Math.min(1, columnPx / width, rowsPx / height2);
  const images = [];
  let y = 0;
  for (const row of rows) {
    let x2 = (width - row.width) / 2;
    for (const item of row.items) {
      const left = x2 + (item.slot - item.width) / 2;
      const top = y + (row.height - item.height) / 2;
      images.push({ x: Math.round(left * k), y: Math.round(top * k), widthPx: Math.max(1, Math.round(item.width * k)), heightPx: Math.max(1, Math.round(item.height * k)) });
      x2 += item.slot + gap2;
    }
    y += row.height + gap2;
  }
  const widthPx = Math.max(1, Math.round(width * k));
  const heightPx = Math.max(1, Math.round(height2 * k));
  return { ...cellsFor(widthPx, heightPx, box2), widthPx, heightPx, images };
}
function blockCells(fit, box2, rows = fit.rows) {
  const left = (fit.columns * box2.cellWidth - fit.widthPx) / 2;
  const top = (rows * box2.cellHeight - fit.heightPx) / 2;
  const span = (from, size, cell, count) => {
    const start = Math.min(count - 1, Math.max(0, Math.round(from / cell)));
    const end = Math.min(count, Math.max(start + 1, Math.round((from + size) / cell)));
    return [start, end - start];
  };
  return fit.images.map((place) => {
    const [column, columns] = span(left + place.x, place.widthPx, box2.cellWidth, fit.columns);
    const [row, height2] = span(top + place.y, place.heightPx, box2.cellHeight, rows);
    return { column, row, columns, rows: height2 };
  });
}
// core/src/image/bitmap.ts
var ImageError = class extends Error {
  name = "ImageError";
};
function checkSize(width, height2, maxPixels) {
  if (!(width > 0 && height2 > 0)) throw new ImageError(`image has no pixels (${width}×${height2})`);
  if (width * height2 > maxPixels) throw new ImageError(`image is ${width}×${height2}, over the ${maxPixels}-pixel cap`);
}
// core/src/image/header.ts
function imageHeader(bytes) {
  if (PNG_SIGNATURE.every((b, i2) => bytes[i2] === b)) {
    if (bytes.length < 24 || ascii(bytes, 12, 16) !== "IHDR") return { format: "png" };
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { format: "png", width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    const info = jpegInfo(bytes);
    if (!info) return { format: "jpeg" };
    const turned = info.orientation >= 5;
    return { format: "jpeg", width: turned ? info.height : info.width, height: turned ? info.width : info.height };
  }
  const head = ascii(bytes, 0, Math.min(bytes.length, 4096));
  if (head.slice(0, 1024).includes("%PDF-")) return { format: "pdf" };
  if (SVG_START.test(head.replace(/^\xef\xbb\xbf/, ""))) return { format: "svg" };
  return void 0;
}
var SVG_START = /^(?:\s|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?\s*>)*<svg[\s>/]/i;
function jpegInfo(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let orientation = 1;
  let at = 2;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 255) return void 0;
    const marker = bytes[at + 1];
    if (marker === 255) {
      at++;
      continue;
    }
    if (marker === 1 || marker >= 208 && marker <= 215) {
      at += 2;
      continue;
    }
    if (marker === 217 || marker === 218) return void 0;
    const length4 = view.getUint16(at + 2);
    const end = at + 2 + length4;
    if (length4 < 2 || end > bytes.length) return void 0;
    const isFrame = marker >= 192 && marker <= 207 && marker !== 196 && marker !== 200 && marker !== 204;
    if (isFrame) {
      if (length4 < 7) return void 0;
      return { width: view.getUint16(at + 7), height: view.getUint16(at + 5), orientation };
    }
    if (marker === 225 && length4 >= 8 && ascii(bytes, at + 4, at + 10) === "Exif\0\0") orientation = exifOrientation(view, at + 10, end) ?? orientation;
    at = end;
  }
  return void 0;
}
function exifOrientation(view, start, end) {
  if (start + 8 > end) return void 0;
  const order = view.getUint16(start);
  if (order !== 18761 && order !== 19789) return void 0;
  const little = order === 18761;
  if (view.getUint16(start + 2, little) !== 42) return void 0;
  const ifd = start + view.getUint32(start + 4, little);
  if (ifd + 2 > end) return void 0;
  const count = view.getUint16(ifd, little);
  for (let i2 = 0; i2 < count; i2++) {
    const entry = ifd + 2 + i2 * 12;
    if (entry + 12 > end) return void 0;
    if (view.getUint16(entry, little) !== 274) continue;
    const value = view.getUint16(entry + 8, little);
    return value >= 1 && value <= 8 ? value : void 0;
  }
  return void 0;
}
function ascii(bytes, from, to) {
  let s = "";
  for (let i2 = from; i2 < to && i2 < bytes.length; i2++) s += String.fromCharCode(bytes[i2]);
  return s;
}
// core/src/image/jpeg.ts
var import_decoder = __toESM(require_decoder(), 1);
// core/src/image/jpeg-scans.ts
var isRestart = (byte) => byte >= 208 && byte <= 215;
function checkScans(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u163 = (at2) => at2 + 2 <= bytes.length ? view.getUint16(at2) : -1;
  let frame2;
  let resetInterval = 0;
  let scans = 0;
  let visits = 0;
  let recovered = false;
  let at = 2;
  for (; ; ) {
    const marker = u163(at);
    if (marker === -1 || marker === 65497) return;
    if (marker === 65280) {
      at += 2;
      continue;
    }
    if (marker === 65535) {
      at += bytes[at + 2] === 255 ? 2 : 1;
      continue;
    }
    const length4 = u163(at + 2);
    if (length4 === -1) throw new ImageError("JPEG is truncated");
    const end = at + 2 + length4;
    if (marker >= 65504 && marker <= 65519 || marker === 65534) {
      at = at + 2 + Math.max(length4, 2);
      continue;
    }
    if (marker === 65499 || marker === 65476) {
      if (tablesEnd(bytes, marker, at + 4, end) !== end) throw new ImageError("JPEG table segment length disagrees with its tables");
      at = end;
      continue;
    }
    if (marker === 65501 || marker === 65500) {
      if (length4 !== 4) throw new ImageError("JPEG DRI or DNL segment has the wrong length");
      if (marker === 65501) resetInterval = u163(at + 4);
      at = end;
      continue;
    }
    if (marker >= 65472 && marker <= 65474) {
      if (frame2) throw new ImageError("JPEG has more than one frame");
      frame2 = parseFrame(bytes, at, marker === 65474);
      at = end;
      continue;
    }
    if (marker === 65498) {
      if (!frame2) throw new ImageError("JPEG scan comes before its frame");
      if (++scans > MAX_JPEG_SCANS) throw new ImageError(`JPEG has more than ${MAX_JPEG_SCANS} scans`);
      const scan2 = parseScan(bytes, at, frame2, resetInterval);
      visits += scan2.visits;
      if (visits > frame2.budget) throw new ImageError(`JPEG scans ask for more than ${VISITS_PER_COEFFICIENT} decoding passes over the frame`);
      at = skipEntropy(bytes, at + 2 + length4, scan2.intervals);
      continue;
    }
    if (bytes[at - 1] === 255 && bytes[at] >= 192 && bytes[at] <= 254) {
      at -= 1;
      continue;
    }
    if ((marker === 224 || marker === 225) && !recovered && bytes[end] === 255) {
      recovered = true;
      at = end;
      continue;
    }
    throw new ImageError(`JPEG has an unknown marker 0x${marker.toString(16)}`);
  }
}
function tablesEnd(bytes, marker, start, end) {
  let at = start;
  while (at < end && at < bytes.length) {
    if (marker === 65499) {
      const precision = bytes[at] >> 4;
      if (precision > 1) throw new ImageError("JPEG DQT has an invalid table spec");
      at += 1 + 64 * (precision + 1);
    } else {
      let count = 0;
      for (let i2 = 1; i2 <= 16; i2++) count += bytes[at + i2] ?? 0;
      at += 17 + count;
    }
  }
  return at;
}
function parseFrame(bytes, at, progressive) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = bytes[at + 9] ?? 0;
  if (at + 10 + 3 * count > bytes.length || view.getUint16(at + 2) !== 8 + 3 * count) throw new ImageError("JPEG frame header length disagrees with its components");
  const height2 = view.getUint16(at + 5);
  const width = view.getUint16(at + 7);
  const sampling = /* @__PURE__ */ new Map();
  for (let i2 = 0; i2 < count; i2++) {
    const hv = bytes[at + 11 + 3 * i2];
    if (hv >> 4 === 0 || (hv & 15) === 0) throw new ImageError("JPEG component has a zero sampling factor");
    sampling.set(bytes[at + 10 + 3 * i2], { h: hv >> 4, v: hv & 15 });
  }
  const values = [...sampling.values()];
  const maxH = Math.max(1, ...values.map((c) => c.h));
  const maxV = Math.max(1, ...values.map((c) => c.v));
  const mcusPerLine = Math.ceil(width / 8 / maxH);
  const mcusPerColumn = Math.ceil(height2 / 8 / maxV);
  const components = /* @__PURE__ */ new Map();
  let blocks = 0;
  for (const [id, { h, v }] of sampling) {
    components.set(id, {
      h,
      v,
      blocksPerLine: Math.ceil(Math.ceil(width / 8) * h / maxH),
      blocksPerColumn: Math.ceil(Math.ceil(height2 / 8) * v / maxV)
    });
    blocks += mcusPerLine * h * mcusPerColumn * v;
  }
  return { progressive, mcusPerLine, mcusPerColumn, components, budget: VISITS_PER_COEFFICIENT * 64 * blocks };
}
function parseScan(bytes, at, frame2, resetInterval) {
  const count = bytes[at + 4] ?? 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (at + 8 + 2 * count > bytes.length) throw new ImageError("JPEG scan header is truncated");
  if (view.getUint16(at + 2) !== 6 + 2 * count) throw new ImageError("JPEG scan header length disagrees with its components");
  const listed = [];
  for (let i2 = 0; i2 < count; i2++) {
    const component = frame2.components.get(bytes[at + 5 + 2 * i2]);
    if (!component) throw new ImageError("JPEG scan names a component its frame lacks");
    listed.push(component);
  }
  const ss = bytes[at + 5 + 2 * count];
  const se = bytes[at + 6 + 2 * count];
  const single2 = listed.length === 1 ? listed[0] : void 0;
  const mcus = single2 ? single2.blocksPerLine * single2.blocksPerColumn : frame2.mcusPerLine * frame2.mcusPerColumn;
  const blocks = single2 ? mcus : mcus * listed.reduce((n, c) => n + c.h * c.v, 0);
  const perBlock = !frame2.progressive ? 64 : ss === 0 ? 1 : Math.max(1, se - ss + 1);
  return { visits: blocks * perBlock, intervals: resetInterval > 0 ? Math.ceil(mcus / resetInterval) : 1 };
}
function skipEntropy(bytes, start, intervals) {
  let restarts = 0;
  for (let at = start; at + 1 < bytes.length; at++) {
    if (bytes[at] !== 255) continue;
    const next = bytes[at + 1];
    if (next === 0) continue;
    if (!isRestart(next)) return at;
    if (++restarts >= intervals) throw new ImageError("JPEG scan has more restart markers than restart intervals");
    at++;
  }
  return bytes.length;
}
// core/src/image/jpeg.ts
function decodeJpeg(bytes, maxPixels) {
  const info = jpegInfo(bytes);
  if (!info) throw new ImageError("JPEG has no frame header");
  checkSize(info.width, info.height, maxPixels);
  checkScans(bytes);
  let decoded;
  try {
    decoded = (0, import_decoder.default)(bytes, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: maxPixels / 1e6 });
  } catch (error) {
    throw new ImageError(`JPEG is corrupt or unsupported (${error instanceof Error ? error.message : String(error)})`);
  }
  const { width, height: height2, data } = decoded;
  if (width !== info.width || height2 !== info.height || data.length !== width * height2 * 4) throw new ImageError("JPEG decoded to an unexpected size");
  return orient({ width, height: height2, rgba: data }, info.orientation);
}
function orient(bitmap, orientation) {
  if (orientation <= 1 || orientation > 8) return bitmap;
  const { width: w, height: h, rgba } = bitmap;
  const turned = orientation >= 5;
  const outW = turned ? h : w;
  const outH = turned ? w : h;
  const out = new Uint8Array(rgba.length);
  const pixels = new Uint32Array(rgba.buffer, rgba.byteOffset, w * h);
  const target = new Uint32Array(out.buffer);
  const last = (h - 1) * w;
  const [origin, dx, dy] = {
    2: [w - 1, -1, w],
    3: [last + w - 1, -1, -w],
    4: [last, 1, -w],
    5: [0, w, 1],
    6: [last, -w, 1],
    7: [last + w - 1, -w, -1],
    8: [w - 1, w, -1]
  }[orientation];
  for (let y = 0; y < outH; y++) {
    let from = origin + y * dy;
    for (let x2 = 0; x2 < outW; x2++, from += dx) target[y * outW + x2] = pixels[from];
  }
  return { width: outW, height: outH, rgba: out };
}
// node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b[i2] = start += 1 << eb[i2 - 1];
  }
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j = b[i2]; j < b[i2 + 1]; ++j) {
      r[j] = j - b[i2] << 5 | i2;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v = le[cd[i2] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
export{u8,u16,shft,clim,flt,fdt,hMap,flm,fdm,fleb,fdeb,i32,revfl,revfd,slc,err,inflt,ImageError,checkSize,imageHeader,decodeJpeg,assumedBackground,contrast,adaptColor,legible,texPicture,fitImage,blockImages,fitImageBlock,blockCells,FORMAT_SOURCE,LATEX_ARGV,TRIAL_PDF,bwrapProbe,confined,diagramDocument,diagramFence,drawsPicture,dvisvgmArgv,formatArgv,formatName,imageBlock,inlineTables,isJobDir,jobDirTemplate,latexArgv,mathDocument,parseLength,pdfArgv,pdfCopyArgv,resolveImagePath,texEnvironment,texError,ulimitProbe,unsafeTex};
