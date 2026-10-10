import{STANDALONE_NO_PS,TIKZ_LIBRARIES,DUMP_POINT,PREAMBLE_VERSION,MATH_PREAMBLE,REFUSED_COMMANDS,MAX_TEX_SOURCE,MAX_CPU_SECONDS,JOB_NAME,NEAR,SATURATED,KEEP_CENTER,KEEP_BAND,MIN_CONTRAST,readSvg,PLTE_AT,SOLID,CANDIDATES,FARTHEST_SLOTS,COVER_TAIL,MAX_INKS,SOLID_COLOURS,MAX_LEVELS,__kittexLate}from'./p31.js';export*from'./p31.js';
__kittexLate.clamp01=()=>clamp01;
var clamp01 = (v) => Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
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
  return /\\begin\{(?:tikzpicture|tikzcd|circuitikz|axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis|ternaryaxis|picture|forest|chemfig)\}|\\(?:tikz|chemfig|schemestart|chemname|ctikzset|draw|SI|qty|si|unit|num)\b/.test(source);
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
var FRAGMENT_PREAMBLE = [
  "\\documentclass[dvisvgm,border=1pt]{standalone}",
  `\\makeatletter${STANDALONE_NO_PS}\\makeatother`,
  "\\usepackage{amsmath,amssymb}",
  "\\usepackage{tikz}",
  `\\usetikzlibrary{${TIKZ_LIBRARIES}}`,
  "\\usepackage{pgfplots}",
  "\\pgfplotsset{compat=1.18}",
  // pgfplots' own libraries: polar axes, groups of plots, box plots, more colormaps, patch plots and ternary axes.
  "\\usepgfplotslibrary{fillbetween,polar,groupplots,statistics,colormaps,patchplots,ternary}",
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
  if (lang === "tikz" && !/\\begin\{tikzpicture\}|\\tikz\b/.test(body)) body = `\\begin{tikzpicture}
${body}
\\end{tikzpicture}`;
  const head = [...FRAGMENT_PREAMBLE, DUMP_POINT, ...moved, "\\begin{document}"];
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
function texPicture(svg, document) {
  return readSvg(svg, { baseline: document.baseline, emPerUnit: emPerUnit(document) });
}
// core/src/raster/fill.ts
var Coverage = class {
  width;
  height;
  /** Row stride of `acc`: two spare cells right of the image take the deltas of edges at x = width. */
  stride;
  acc;
  constructor(width, height2) {
    this.width = width;
    this.height = height2;
    this.stride = width + 2;
    this.acc = new Float32Array(this.stride * height2);
  }
  /** Adds a closed contour. `sign` is +1 or -1: the winding that counts as ink for this contour's shape. */
  fill(contour, sign) {
    const n = contour.length;
    let x0 = contour[n - 2];
    let y0 = contour[n - 1];
    for (let i2 = 0; i2 < n; i2 += 2) {
      const x1 = contour[i2];
      const y1 = contour[i2 + 1];
      this.line(x0, y0, x1, y1, sign);
      x0 = x1;
      y0 = y1;
    }
  }
  /** Adds one edge, clipped to the image: the parts left of x = 0 or right of x = width run along that side. */
  line(x0, y0, x1, y1, sign) {
    if (y0 === y1) return;
    const w = this.width;
    if (x0 >= 0 && x1 >= 0 && x0 <= w && x1 <= w) {
      this.edge(x0, y0, x1, y1, sign);
      return;
    }
    const ts = [0, 1];
    for (const bound of [0, w]) {
      if ((x0 - bound) * (x1 - bound) < 0) ts.push((bound - x0) / (x1 - x0));
    }
    ts.sort((a, b) => a - b);
    for (let i2 = 1; i2 < ts.length; i2++) {
      const ta = ts[i2 - 1];
      const tb = ts[i2];
      const ax = x0 + (x1 - x0) * ta;
      const bx = x0 + (x1 - x0) * tb;
      const ay = y0 + (y1 - y0) * ta;
      const by = y0 + (y1 - y0) * tb;
      this.edge(Math.min(w, Math.max(0, ax)), ay, Math.min(w, Math.max(0, bx)), by, sign);
    }
  }
  /** Adds one edge with 0 ≤ x ≤ width; rows outside the image are skipped. */
  edge(px0, py0, px1, py1, sign) {
    if (py0 === py1) return;
    let dir = sign;
    let x0 = px0, y0 = py0, x1 = px1, y1 = py1;
    if (y0 > y1) {
      dir = -sign;
      x0 = px1;
      y0 = py1;
      x1 = px0;
      y1 = py0;
    }
    const h = this.height;
    if (y1 <= 0 || y0 >= h) return;
    const acc = this.acc;
    const stride = this.stride;
    const dxdy = (x1 - x0) / (y1 - y0);
    let x2 = x0;
    if (y0 < 0) x2 -= y0 * dxdy;
    const rowFrom = Math.max(0, Math.floor(y0));
    const rowTo = Math.min(h, Math.ceil(y1));
    for (let row = rowFrom; row < rowTo; row++) {
      const base = row * stride;
      const dy = Math.min(row + 1, y1) - Math.max(row, y0);
      const xnext = x2 + dxdy * dy;
      const d = dy * dir;
      const xa = x2 < xnext ? x2 : xnext;
      const xb = x2 < xnext ? xnext : x2;
      const xaFloor = Math.floor(xa);
      const xai = xaFloor;
      const xbCeil = Math.ceil(xb);
      const xbi = xbCeil;
      if (xbi <= xai + 1) {
        const xmf = 0.5 * (x2 + xnext) - xaFloor;
        acc[base + xai] += d - d * xmf;
        acc[base + xai + 1] += d * xmf;
      } else {
        const s = 1 / (xb - xa);
        const xaf = xa - xaFloor;
        const a0 = 0.5 * s * (1 - xaf) * (1 - xaf);
        const xbf = xb - xbCeil + 1;
        const am = 0.5 * s * xbf * xbf;
        acc[base + xai] += d * a0;
        if (xbi === xai + 2) {
          acc[base + xai + 1] += d * (1 - a0 - am);
        } else {
          const a1 = s * (1.5 - xaf);
          acc[base + xai + 1] += d * (a1 - a0);
          for (let xi = xai + 2; xi < xbi - 1; xi++) acc[base + xi] += d * s;
          const a2 = a1 + (xbi - xai - 3) * s;
          acc[base + xbi - 1] += d * (1 - a2 - am);
        }
        acc[base + xbi] += d * am;
      }
      x2 = xnext;
    }
  }
  /**
   * The coverage under the even-odd rule, as bytes: a winding of 2 is a hole,
   * and the accumulated area w covers |w| folded into [0, 1] (the distance to
   * the nearest even number), which is exact for areas no two edges of a
   * pixel overlap in.
   */
  toAlphaEvenOdd() {
    const { width: w, height: h, stride, acc } = this;
    const out = new Uint8Array(w * h);
    for (let row = 0; row < h; row++) {
      let sum2 = 0;
      const from = row * stride;
      const to = row * w;
      for (let x2 = 0; x2 < w; x2++) {
        sum2 += acc[from + x2];
        let c = (sum2 < 0 ? -sum2 : sum2) % 2;
        if (c > 1) c = 2 - c;
        out[to + x2] = c * 255 + 0.5 | 0;
      }
    }
    return out;
  }
  /** The coverage as bytes (0 to 255), row-major, through `curve` (256 entries) when given. */
  toAlpha(curve) {
    const { width: w, height: h, stride, acc } = this;
    const out = new Uint8Array(w * h);
    for (let row = 0; row < h; row++) {
      let sum2 = 0;
      const from = row * stride;
      const to = row * w;
      for (let x2 = 0; x2 < w; x2++) {
        sum2 += acc[from + x2];
        const c = sum2 < 0 ? -sum2 : sum2;
        const byte = c >= 1 ? 255 : c * 255 + 0.5 | 0;
        out[to + x2] = curve ? curve[byte] : byte;
      }
    }
    return out;
  }
};
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
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
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
var wbits = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
  var t = [];
  for (var i2 = 0; i2 < d.length; ++i2) {
    if (d[i2])
      t.push({ s: i2, f: d[i2] });
  }
  var s = t.length;
  var t2 = t.slice();
  if (!s)
    return { t: et, l: 0 };
  if (s == 1) {
    var v = new u8(t[0].s + 1);
    v[t[0].s] = 1;
    return { t: v, l: 1 };
  }
  t.sort(function(a, b) {
    return a.f - b.f;
  });
  t.push({ s: -1, f: 25001 });
  var l = t[0], r = t[1], i0 = 0, i1 = 1, i22 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i22].f ? i0++ : i22++];
    r = t[i0 != i1 && t[i0].f < t[i22].f ? i0++ : i22++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  var maxSym = t2[0].s;
  for (var i2 = 1; i2 < s; ++i2) {
    if (t2[i2].s > maxSym)
      maxSym = t2[i2].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i2 = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t2.sort(function(a, b) {
      return tr[b.s] - tr[a.s] || a.f - b.f;
    });
    for (; i2 < s; ++i2) {
      var i2_1 = t2[i2].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t2[i2].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i2;
    }
    for (; i2 >= 0 && dt; --i2) {
      var i2_3 = t2[i2].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
};
var ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
  var s = c.length;
  while (s && !c[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c[0], cls = 1;
  var w = function(v) {
    cl[cli++] = v;
  };
  for (var i2 = 1; i2 <= s; ++i2) {
    if (c[i2] == cln && i2 != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c[i2];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};
var clen = function(cf, cl) {
  var l = 0;
  for (var i2 = 0; i2 < cl.length; ++i2)
    l += cf[i2] * cl[i2];
  return l;
};
var wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i2 = 0; i2 < s; ++i2)
    out[o + i2 + 4] = dat[i2];
  return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i2 = 0; i2 < lclt.length; ++i2)
    ++lcfreq[lclt[i2] & 31];
  for (var i2 = 0; i2 < lcdt.length; ++i2)
    ++lcfreq[lcdt[i2] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i2 = 0; i2 < nlcc; ++i2)
      wbits(out, p + 3 * i2, lct[clim[i2]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i2 = 0; i2 < clct.length; ++i2) {
        var len = clct[i2] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i2] >> 5 & 127), p += clct[i2] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i2 = 0; i2 < li; ++i2) {
    var sym = syms[i2];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i3) {
      return (dat[i3] ^ dat[i3 + 1] << bs1_1 ^ dat[i3 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i2 = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i2 + 2 < s; ++i2) {
      var hv = hsh(i2);
      var imod = i2 & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i2) {
        var rem = s - i2;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i2 - bs, pos);
          li = lc_1 = eb = 0, bs = i2;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i2 - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i2);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i2 + l] == dat[i2 + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i2 + nl] == dat[i2 + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i2 - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i2 + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i2];
          ++lf[dat[i2]];
        }
      }
    }
    for (i2 = Math.max(i2, wi); i2 < s; ++i2) {
      syms[li++] = dat[i2];
      ++lf[dat[i2]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i2 - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i2, st.w = wi;
    }
  } else {
    for (var i2 = st.w || 0; i2 < s + lst; i2 += 65535) {
      var e = i2 + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i2, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var adler = function() {
  var a = 1, b = 0;
  return {
    p: function(d) {
      var n = a, m = b;
      var l = d.length | 0;
      for (var i2 = 0; i2 != l; ) {
        var e = Math.min(i2 + 2655, l);
        for (; i2 < e; ++i2)
          m += n += d[i2];
        n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
      }
      a = n, b = m;
    },
    d: function() {
      a %= 65521, b %= 65521;
      return (a & 255) << 24 | (a & 65280) << 8 | (b & 255) << 8 | b >> 8;
    }
  };
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var wbytes = function(d, b, v) {
  for (; v; ++b)
    d[b] = v, v >>>= 8;
};
var zlh = function(c, o) {
  var lv = o.level, fl2 = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
  c[0] = 120, c[1] = fl2 << 6 | (o.dictionary && 32);
  c[1] |= 31 - (c[0] << 8 | c[1]) % 31;
  if (o.dictionary) {
    var h = adler();
    h.p(o.dictionary);
    wbytes(c, 2, h.d());
  }
};
function zlibSync(data, opts) {
  if (!opts)
    opts = {};
  var a = adler();
  a.p(data);
  var d = dopt(data, opts, opts.dictionary ? 6 : 2, 4);
  return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
// core/src/raster/png.ts
var SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
var TRNS_AT = PLTE_AT + 12 + 768;
function encodeAlphaPng(alpha, width, height2, ink, over, curve) {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height2);
  ihdr.set([8, 3, 0, 0, 0], 8);
  return concat2([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("PLTE", palette(ink)),
    chunk("tRNS", alphaTable(ink, over, curve)),
    chunk("IDAT", zlibSync(filter(alpha, width, height2), { level: 6 })),
    chunk("IEND", new Uint8Array(0))
  ]);
}
function encodeQuantizedPng(rgba, width, height2) {
  const n = width * height2;
  const pairs3 = /* @__PURE__ */ new Map();
  const weight = /* @__PURE__ */ new Map();
  for (let i2 = 0; i2 < n; i2++) {
    const a = rgba[4 * i2 + 3];
    if (a === 0) continue;
    const rgb = rgba[4 * i2] << 16 | rgba[4 * i2 + 1] << 8 | rgba[4 * i2 + 2];
    if (pairs3.size <= 256) pairs3.set(rgb * 256 + a, 0);
    weight.set(rgb, (weight.get(rgb) ?? 0) + a);
  }
  const index = new Uint8Array(n);
  let plte = [0, 0, 0];
  let trns = [0];
  if (pairs3.size <= 255) {
    const slot = /* @__PURE__ */ new Map();
    for (const key of pairs3.keys()) {
      slot.set(key, slot.size + 1);
      const rgb = Math.floor(key / 256);
      plte.push(rgb >> 16 & 255, rgb >> 8 & 255, rgb & 255);
      trns.push(key % 256);
    }
    for (let i2 = 0; i2 < n; i2++) {
      const a = rgba[4 * i2 + 3];
      if (a === 0) continue;
      const rgb = rgba[4 * i2] << 16 | rgba[4 * i2 + 1] << 8 | rgba[4 * i2 + 2];
      index[i2] = slot.get(rgb * 256 + a);
    }
  } else {
    const solidWeight = /* @__PURE__ */ new Map();
    for (let i2 = 0; i2 < n; i2++) {
      if (rgba[4 * i2 + 3] < SOLID) continue;
      const rgb = rgba[4 * i2] << 16 | rgba[4 * i2 + 1] << 8 | rgba[4 * i2 + 2];
      solidWeight.set(rgb, (solidWeight.get(rgb) ?? 0) + 1);
    }
    const pick2 = (weights, most, apart) => {
      const chosen = [];
      for (const [rgb] of [...weights].sort((a, b) => b[1] - a[1])) {
        const c = [rgb >> 16 & 255, rgb >> 8 & 255, rgb & 255];
        if (chosen.every((one) => distance(one, c) > apart)) chosen.push(c);
        if (chosen.length >= most) break;
      }
      return chosen;
    };
    const cover = (weights, most, apart) => {
      const sorted = [...weights].sort((a, b) => b[1] - a[1]).slice(0, CANDIDATES);
      const chosen = pick2(new Map(sorted), most - FARTHEST_SLOTS, apart);
      const total = sorted.reduce((sum3, [, w]) => sum3 + w, 0);
      let kept = 0;
      let sum2 = 0;
      while (kept < sorted.length && sum2 < total * (1 - COVER_TAIL)) sum2 += sorted[kept++][1];
      const candidates = sorted.slice(0, kept).map(([rgb]) => [rgb >> 16 & 255, rgb >> 8 & 255, rgb & 255]);
      const gap2 = candidates.map((c) => Math.min(Infinity, ...chosen.map((one) => distance(one, c))));
      while (chosen.length < most) {
        let far = -1;
        for (let k = 0; k < candidates.length; k++) if (gap2[k] > apart && (far < 0 || gap2[k] > gap2[far])) far = k;
        if (far < 0) break;
        const c = candidates[far];
        chosen.push(c);
        for (let k = 0; k < candidates.length; k++) gap2[k] = Math.min(gap2[k], distance(c, candidates[k]));
      }
      return chosen;
    };
    const inks = pick2(weight, MAX_INKS, INK_DISTANCE);
    const solids = cover(solidWeight, SOLID_COLOURS, SOLID_DISTANCE);
    const levels = Math.min(MAX_LEVELS, Math.floor((255 - solids.length) / inks.length));
    plte = [0, 0, 0];
    trns = [0];
    for (const ink of inks) {
      for (let l = 1; l <= levels; l++) {
        plte.push(...ink);
        trns.push(Math.round(255 * l / levels));
      }
    }
    const solidAt = plte.length / 3;
    for (const solid of solids) {
      plte.push(...solid);
      trns.push(255);
    }
    const nearest = (set, memo, rgb) => {
      let k = memo.get(rgb);
      if (k === void 0) {
        const c = [rgb >> 16 & 255, rgb >> 8 & 255, rgb & 255];
        k = 0;
        for (let j = 1; j < set.length; j++) if (distance(set[j], c) < distance(set[k], c)) k = j;
        memo.set(rgb, k);
      }
      return k;
    };
    const inkMemo = /* @__PURE__ */ new Map();
    const solidMemo = /* @__PURE__ */ new Map();
    for (let i2 = 0; i2 < n; i2++) {
      const a = rgba[4 * i2 + 3];
      if (a === 0) continue;
      const rgb = rgba[4 * i2] << 16 | rgba[4 * i2 + 1] << 8 | rgba[4 * i2 + 2];
      if (a >= SOLID && solids.length > 0) {
        index[i2] = solidAt + nearest(solids, solidMemo, rgb);
        continue;
      }
      const level = Math.max(1, Math.round(a * levels / 255));
      index[i2] = 1 + nearest(inks, inkMemo, rgb) * levels + level - 1;
    }
  }
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height2);
  ihdr.set([8, 3, 0, 0, 0], 8);
  return concat2([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("PLTE", Uint8Array.from(plte)),
    chunk("tRNS", Uint8Array.from(trns)),
    chunk("IDAT", zlibSync(filterBytes(index, width, height2, 1), { level: 9 })),
    chunk("IEND", new Uint8Array(0))
  ]);
}
var INK_DISTANCE = 40 * 40;
var SOLID_DISTANCE = 6 * 6;
function distance(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}
function filterBytes(rgba, w, h, bpp) {
  const stride = w * bpp;
  const out = new Uint8Array(h * (stride + 1));
  const trial = [new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride)];
  const cost = (row) => {
    let sum2 = 0;
    for (let i2 = 0; i2 < row.length; i2++) sum2 += row[i2] < 128 ? row[i2] : 256 - row[i2];
    return sum2;
  };
  for (let y = 0; y < h; y++) {
    const at = y * stride;
    const up = y > 0 ? at - stride : -1;
    const [none, sub, upRow, paeth] = trial;
    for (let i2 = 0; i2 < stride; i2++) {
      const x2 = rgba[at + i2];
      const a = i2 >= bpp ? rgba[at + i2 - bpp] : 0;
      const b = up >= 0 ? rgba[up + i2] : 0;
      const c = up >= 0 && i2 >= bpp ? rgba[up + i2 - bpp] : 0;
      none[i2] = x2;
      sub[i2] = x2 - a & 255;
      upRow[i2] = x2 - b & 255;
      const p = a + b - c;
      const pa = p > a ? p - a : a - p;
      const pb = p > b ? p - b : b - p;
      const pc = p > c ? p - c : c - p;
      paeth[i2] = x2 - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) & 255;
    }
    let best = 0;
    let bestCost = Infinity;
    for (let f = 0; f < 4; f++) {
      const c = cost(trial[f]);
      if (c < bestCost) {
        bestCost = c;
        best = f;
      }
    }
    const filterType = [0, 1, 2, 4][best];
    out[y * (stride + 1)] = filterType;
    out.set(trial[best], y * (stride + 1) + 1);
  }
  return out;
}
function recolorPng(png, ink, over, curve) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const isPlte = png.length > TRNS_AT + 12 + 256 && view.getUint32(PLTE_AT) === 768 && png[PLTE_AT + 4] === 80 && png[PLTE_AT + 5] === 76 && png[PLTE_AT + 6] === 84 && png[PLTE_AT + 7] === 69 && view.getUint32(TRNS_AT) === 256 && png[TRNS_AT + 4] === 116 && png[TRNS_AT + 5] === 82 && png[TRNS_AT + 6] === 78 && png[TRNS_AT + 7] === 83;
  if (!isPlte) throw new Error("recolorPng: not a kittex palette PNG");
  const out = png.slice();
  out.set(chunk("PLTE", palette(ink)), PLTE_AT);
  out.set(chunk("tRNS", alphaTable(ink, over, curve)), TRNS_AT);
  return out;
}
function inkAlpha(alpha, ink, over) {
  const fg = linearLuminance(ink);
  const bg = linearLuminance(over);
  if (!(Math.abs(fg - bg) > 1e-3)) return alpha;
  const blend = linearize(unlinearize(fg) * alpha + unlinearize(bg) * (1 - alpha));
  return Math.min(1, Math.max(0, (blend - bg) / (fg - bg)));
}
function curvedAlpha(alpha, ink, over, curve) {
  const gamma = curve.gamma < 0.01 ? 1 : 1 / curve.gamma;
  const t = (1 - linearLuminance(ink) + linearLuminance(over)) * 0.5;
  const moved = alpha + (alpha ** gamma - alpha) * t;
  return Math.min(1, Math.max(0, moved * (1 + curve.contrast * 0.01)));
}
function alphaTable(ink, over, curve) {
  const trns = new Uint8Array(256);
  for (let i2 = 0; i2 < 256; i2++) {
    if (!over || i2 === 0 || i2 === 255 && !curve) trns[i2] = i2;
    else trns[i2] = Math.round(255 * (curve ? curvedAlpha(i2 / 255, ink, over, curve) : inkAlpha(i2 / 255, ink, over)));
  }
  return trns;
}
var linearize = (v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
var unlinearize = (v) => v <= 31308e-7 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
var linearLuminance = (c) => 0.2126 * linearize(clampByte(c.r) / 255) + 0.7152 * linearize(clampByte(c.g) / 255) + 0.0722 * linearize(clampByte(c.b) / 255);
function palette(ink) {
  const plte = new Uint8Array(768);
  const r = clampByte(ink.r), g = clampByte(ink.g), b = clampByte(ink.b);
  for (let i2 = 0; i2 < 768; i2 += 3) {
    plte[i2] = r;
    plte[i2 + 1] = g;
    plte[i2 + 2] = b;
  }
  return plte;
}
var clampByte = (v) => Math.min(255, Math.max(0, Math.round(v))) || 0;
function filter(alpha, w, h) {
  const out = new Uint8Array(h * (w + 1));
  for (let y = 0; y < h; y++) out.set(alpha.subarray(y * w, y * w + w), y * (w + 1) + 1);
  return out;
}
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i2 = 0; i2 < 4; i2++) out[4 + i2] = type.charCodeAt(i2);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}
var crcTable;
function crc32(bytes, from, to) {
  const table2 = crcTable ??= Uint32Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    return c >>> 0;
  });
  let crc = 4294967295;
  for (let i2 = from; i2 < to; i2++) crc = table2[(crc ^ bytes[i2]) & 255] ^ crc >>> 8;
  return (crc ^ 4294967295) >>> 0;
}
function concat2(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
export{inkAlpha,Coverage,encodeAlphaPng,encodeQuantizedPng,recolorPng,assumedBackground,adaptColor,FORMAT_SOURCE,LATEX_ARGV,bwrapProbe,confined,diagramDocument,diagramFence,drawsPicture,dvisvgmArgv,formatArgv,formatName,isJobDir,jobDirTemplate,latexArgv,mathDocument,texEnvironment,texError,texPicture,ulimitProbe,unsafeTex};
