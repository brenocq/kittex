import{signedArea2,__esm,scale,multiply2,parseTransform,flatten,parsePath,translate2,isAxisAligned,mapBox,intersect,apply,clipPolygon,__export,engine_exports,mathjax,liteAdaptor,RegisterHTMLHandler,MapHandler,MathtoolsUtil,NewcommandUtil,MathtoolsMethods,EmpheqUtil,ParseUtil,TeX,TexError,SVG,MathJaxNewcmFont,rememberLabels,MmlMath,STATE,GlyphError,init_liteAdaptor,init_MathItem,init_math,init_SerializedMmlVisitor,init_html,init_tex,init_MapHandler,init_mathjax,init_svg2,init_LinebreakVisitor,init_svg,init_BaseConfiguration,init_AmsConfiguration,init_NewcommandConfiguration,init_BoldsymbolConfiguration,init_BraketConfiguration,init_CancelConfiguration,init_ColorConfiguration,init_MathtoolsConfiguration,init_PhysicsConfiguration,init_TextMacrosConfiguration,init_UnicodeConfiguration,init_MhchemConfiguration,init_AmsCdConfiguration,init_EmpheqConfiguration,init_CenternotConfiguration,init_GensymbConfiguration,init_UpgreekConfiguration,init_TextcompConfiguration,init_MathtoolsUtil,init_MathtoolsMethods,init_NewcommandUtil,init_EmpheqUtil,init_ParseUtil,init_fonts,init_macros,init_errors,LinebreakVisitor,NOBREAK,SerializedMmlVisitor,_tag,emStrongRDelimAstCore,escapeReplacements,__kittexLate}from'./p27.js';export*from'./p27.js';
__kittexLate.IDENTITY2=()=>IDENTITY2;__kittexLate.ARG_COUNT=()=>ARG_COUNT;
function oriented(polygon, sign) {
  return Math.sign(signedArea2(polygon)) === -sign ? [...polygon].reverse() : polygon;
}
function strokeSegment(a, b, width, extend2 = 0) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len === 0) return [];
  const [ux, uy] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const [nx, ny] = [-uy * width / 2, ux * width / 2];
  const [ex, ey] = [ux * extend2, uy * extend2];
  return oriented(
    [
      [a[0] - ex + nx, a[1] - ey + ny],
      [b[0] + ex + nx, b[1] + ey + ny],
      [b[0] + ex - nx, b[1] + ey - ny],
      [a[0] - ex - nx, a[1] - ey - ny]
    ],
    1
  );
}
function disc(c, r, sides2 = 12) {
  const pts = [];
  for (let k = 0; k < sides2; k++) {
    const a = 2 * Math.PI * k / sides2;
    pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return oriented(pts, 1);
}
function ellipse(cx, cy, rx, ry, sides2 = 48) {
  const pts = [];
  for (let k = 0; k < sides2; k++) {
    const a = 2 * Math.PI * k / sides2;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}
function polygonsToPath(polygons) {
  let d = "";
  for (const p of polygons) {
    if (p.length < 3) continue;
    d += p.map(([x2, y], i2) => `${i2 ? "L" : "M"}${fmt(x2)} ${fmt(y)}`).join("") + "Z";
  }
  return d;
}
function fmt(n) {
  return String(Math.round(n * 1e5) / 1e5);
}
var IDENTITY2;
var ARG_COUNT;
var init_geometry = __esm({
  "core/src/typeset/geometry.ts"() {
    "use strict";
    IDENTITY2 = [1, 0, 0, 1, 0, 0];
    ARG_COUNT = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  }
});
// core/src/typeset/walk.ts
function walkSvg(adaptor, svg, options3) {
  const ops = [];
  const { emPx } = options3;
  const width = length2(adaptor.getAttribute(svg, "width"), options3.width * emPx, options3.exEm * emPx);
  const height2 = length2(adaptor.getAttribute(svg, "height"), 0, options3.exEm * emPx);
  const viewBox2 = numbers(adaptor.getAttribute(svg, "viewBox"));
  let m;
  let vw;
  let vh;
  if (viewBox2.length === 4) {
    m = scale(1 / 1e3, 1 / 1e3);
    [vw, vh] = [viewBox2[2], viewBox2[3]];
  } else {
    m = [1 / emPx, 0, 0, 1 / emPx, 0, -options3.height];
    [vw, vh] = [width, height2];
  }
  walkChildren(adaptor, svg, { m, clip: null, vw, vh }, ops);
  return ops;
}
function walkChildren(adaptor, node, state, ops) {
  for (const child of adaptor.childNodes(node)) {
    if (!("kind" in child) || child.kind === "#text" || child.kind === "#comment") continue;
    walk(adaptor, child, state, ops);
  }
}
function walk(adaptor, el, parent, ops) {
  const kind = adaptor.kind(el);
  const transform = adaptor.getAttribute(el, "transform");
  const state = transform ? { ...parent, m: multiply2(parent.m, parseTransform(transform)) } : parent;
  switch (kind) {
    case "g":
    case "a":
      walkChildren(adaptor, el, state, ops);
      return;
    case "svg":
      walkChildren(adaptor, el, nestedViewport(adaptor, el, state), ops);
      return;
    // Shapes are filled unless fill="none", and stroked when they have a stroke
    // width (the root sets stroke-width 0; glyphs' CSS "blacker" stroke is left
    // to the rasterizer's weight).
    case "path": {
      const d = adaptor.getAttribute(el, "d");
      if (!d) return;
      if (!isUnfilled(adaptor, el)) {
        if (state.clip) emitPolygons(flatten(parsePath(d)).map((l) => l.points), state, ops);
        else ops.push({ type: "path", d, transform: state.m });
      }
      const stroke = strokeWidth(adaptor, el);
      if (stroke > 0) emitPolygons(strokePath(d, stroke), state, ops);
      return;
    }
    case "rect": {
      if (adaptor.getAttribute(el, "data-bgcolor") != null) return;
      const x2 = num2(adaptor.getAttribute(el, "x"));
      const y = num2(adaptor.getAttribute(el, "y"));
      const w = num2(adaptor.getAttribute(el, "width"));
      const h = num2(adaptor.getAttribute(el, "height"));
      if (!isUnfilled(adaptor, el) && w > 0 && h > 0) emitRect([x2, y, x2 + w, y + h], state, ops);
      const stroke = strokeWidth(adaptor, el);
      if (stroke > 0) emitPolygons(frame(x2, y, w, h, stroke), state, ops);
      return;
    }
    case "line": {
      const stroke = strokeWidth(adaptor, el);
      if (stroke <= 0) return;
      const a = [num2(adaptor.getAttribute(el, "x1")), num2(adaptor.getAttribute(el, "y1"))];
      const b = [num2(adaptor.getAttribute(el, "x2")), num2(adaptor.getAttribute(el, "y2"))];
      const dashes = dashArray(adaptor, el, stroke);
      const square = adaptor.getAttribute(el, "stroke-linecap") === "square";
      emitPolygons(dashes ? dashedSegment(a, b, stroke, dashes) : [strokeSegment(a, b, stroke, square ? stroke / 2 : 0)], state, ops);
      return;
    }
    case "ellipse":
    case "circle": {
      const cx = num2(adaptor.getAttribute(el, "cx"));
      const cy = num2(adaptor.getAttribute(el, "cy"));
      const rx = num2(adaptor.getAttribute(el, kind === "circle" ? "r" : "rx"));
      const ry = kind === "circle" ? rx : num2(adaptor.getAttribute(el, "ry"));
      if (!isUnfilled(adaptor, el)) emitPolygons([ellipse(cx, cy, rx, ry)], state, ops);
      const t = strokeWidth(adaptor, el) / 2;
      if (t > 0) {
        const ring = [oriented(ellipse(cx, cy, rx + t, ry + t), 1), oriented(ellipse(cx, cy, Math.max(0, rx - t), Math.max(0, ry - t)), -1)];
        emitPolygons(ring, state, ops);
      }
      return;
    }
    case "polygon":
    case "polyline": {
      const v = numbers(adaptor.getAttribute(el, "points"));
      const pts = [];
      for (let i2 = 0; i2 + 1 < v.length; i2 += 2) pts.push([v[i2], v[i2 + 1]]);
      if (!isUnfilled(adaptor, el)) emitPolygons([pts], state, ops);
      const stroke = strokeWidth(adaptor, el);
      if (stroke > 0) emitPolygons(strokePolyline(pts, kind === "polygon", stroke), state, ops);
      return;
    }
    case "title":
    case "desc":
    case "defs":
    case "style":
      return;
    case "text": {
      const text = textContent(adaptor, el);
      if (text.trim() === "") return;
      const code = [...text].map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`).join(" ");
      throw new MissingGlyphError(`no glyph for "${text}" (${code}) in the bundled font`);
    }
    default:
      throw new UndrawableError(`cannot draw <${kind}>`);
  }
}
function nestedViewport(adaptor, el, parent) {
  const x2 = length2(adaptor.getAttribute(el, "x"), parent.vw, 0);
  const y = length2(adaptor.getAttribute(el, "y"), parent.vh, 0);
  const w = length2(adaptor.getAttribute(el, "width") ?? "100%", parent.vw, 0);
  const h = length2(adaptor.getAttribute(el, "height") ?? "100%", parent.vh, 0);
  const viewBox2 = numbers(adaptor.getAttribute(el, "viewBox"));
  let inner = translate2(x2, y);
  let [vw, vh] = [w, h];
  if (viewBox2.length === 4) {
    inner = viewBoxMatrix([x2, y, w, h], viewBox2, adaptor.getAttribute(el, "preserveAspectRatio"));
    [vw, vh] = [viewBox2[2], viewBox2[3]];
  }
  let clip = parent.clip;
  const overflow = adaptor.getAttribute(el, "overflow") ?? adaptor.getStyle(el, "overflow");
  const visible = overflow === "visible" || adaptor.getAttribute(el, "data-table") != null || adaptor.getAttribute(el, "data-labels") != null;
  if (!visible && isAxisAligned(parent.m)) {
    const box = mapBox(parent.m, [x2, y, x2 + w, y + h]);
    clip = clip ? intersect(clip, box) : box;
  }
  return { m: multiply2(parent.m, inner), clip, vw, vh };
}
function viewBoxMatrix([x2, y, w, h], [vx, vy, vw, vh], par) {
  let sx = vw ? w / vw : 1;
  let sy = vh ? h / vh : 1;
  const [align = "xMidYMid", mode = "meet"] = (par ?? "").trim().split(/\s+/).filter(Boolean);
  let tx = x2 - vx * sx;
  let ty = y - vy * sy;
  if (align !== "none") {
    const s = mode === "slice" ? Math.max(sx, sy) : Math.min(sx, sy);
    [sx, sy] = [s, s];
    const xAlign = align.slice(0, 4);
    const yAlign = align.slice(4);
    const dx = w - vw * s;
    const dy = h - vh * s;
    tx = x2 - vx * s + (xAlign === "xMid" ? dx / 2 : xAlign === "xMax" ? dx : 0);
    ty = y - vy * s + (yAlign === "YMid" ? dy / 2 : yAlign === "YMax" ? dy : 0);
  }
  return [sx, 0, 0, sy, tx, ty];
}
function emitRect(box, state, ops) {
  if (isAxisAligned(state.m)) {
    let r = mapBox(state.m, box);
    if (state.clip) r = intersect(r, state.clip);
    if (r[2] > r[0] && r[3] > r[1]) ops.push({ type: "rect", x: r[0], y: r[1], width: r[2] - r[0], height: r[3] - r[1] });
    return;
  }
  const [x0, y0, x1, y1] = box;
  emitPolygons(
    [
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1]
      ]
    ],
    state,
    ops
  );
}
function emitPolygons(polygons, state, ops) {
  let mapped = polygons.map((p) => p.map(([x2, y]) => apply(state.m, x2, y)));
  if (state.clip) {
    const clip = state.clip;
    mapped = mapped.map((p) => clipPolygon(p, clip));
  }
  const d = polygonsToPath(mapped);
  if (d) ops.push({ type: "path", d, transform: [1, 0, 0, 1, 0, 0] });
}
function frame(x2, y, w, h, t) {
  const o = t / 2;
  const outer = [
    [x2 - o, y - o],
    [x2 + w + o, y - o],
    [x2 + w + o, y + h + o],
    [x2 - o, y + h + o]
  ];
  if (w - t <= 0 || h - t <= 0) return [oriented(outer, 1)];
  const inner = [
    [x2 + o, y + o],
    [x2 + w - o, y + o],
    [x2 + w - o, y + h - o],
    [x2 + o, y + h - o]
  ];
  return [oriented(outer, 1), oriented(inner, -1)];
}
function strokePath(d, width) {
  return flatten(parsePath(d)).flatMap((line) => strokePolyline(line.points, line.closed, width));
}
function strokePolyline(points, closed, width) {
  const out = [];
  const n = points.length;
  for (let i2 = 0; i2 + 1 < n; i2++) out.push(strokeSegment(points[i2], points[i2 + 1], width));
  if (closed && n > 2) out.push(strokeSegment(points[n - 1], points[0], width));
  for (const p of points) out.push(disc(p, width / 2));
  return out.filter((p) => p.length > 2);
}
function isUnfilled(adaptor, el) {
  return (adaptor.getAttribute(el, "fill") ?? adaptor.getStyle(el, "fill")) === "none" || isTableRule(adaptor, el);
}
function strokeWidth(adaptor, el) {
  const value = adaptor.getAttribute(el, "stroke-width") ?? adaptor.getStyle(el, "stroke-width");
  if (value) return num2(value);
  if (isTableRule(adaptor, el)) {
    const thickness = adaptor.getAttribute(el, "stroke-thickness");
    return thickness ? num2(thickness) : TABLE_RULE;
  }
  return 0;
}
function isTableRule(adaptor, el) {
  return adaptor.getAttribute(el, "data-line") != null || adaptor.getAttribute(el, "data-frame") != null;
}
function dashArray(adaptor, el, stroke) {
  const explicit = adaptor.getAttribute(el, "stroke-dasharray");
  const classes = adaptor.getAttribute(el, "class") ?? "";
  if (explicit) {
    const v = numbers(explicit);
    if (v.length === 1 && v[0] > 0) return [v[0], v[0]];
    if (v.length >= 2 && v[0] + v[1] > 0) return [v[0], v[1]];
    return null;
  }
  if (/\bmjx-dashed\b/.test(classes)) return [2 * stroke, 2 * stroke];
  if (/\bmjx-dotted\b/.test(classes)) return [0, 2 * stroke];
  return null;
}
function dashedSegment(a, b, width, [dash, gap2]) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const period = dash + gap2;
  if (len === 0 || period <= 0) return [];
  const at = (t) => [a[0] + (b[0] - a[0]) * t / len, a[1] + (b[1] - a[1]) * t / len];
  const out = [];
  for (let t = 0; t < len && out.length < 1e3; t += period) {
    if (dash === 0) out.push(disc(at(t), width / 2, 8));
    else out.push(strokeSegment(at(t), at(Math.min(len, t + dash)), width));
  }
  return out.filter((p) => p.length > 2);
}
function textContent(adaptor, node) {
  if ("kind" in node && node.kind === "#text") return adaptor.value(node) ?? "";
  return (adaptor.childNodes(node) ?? []).map((child) => textContent(adaptor, child)).join("");
}
function length2(value, percentBase, exEm) {
  if (value === null || value === void 0 || value === "") return 0;
  const match = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*(%|ex|em|px)?\s*$/i.exec(value);
  if (!match) return 0;
  const n = Number(match[1]);
  switch (match[2]) {
    case "%":
      return n / 100 * percentBase;
    case "ex":
      return n * exEm;
    default:
      return n;
  }
}
function num2(value) {
  const n = value ? Number.parseFloat(value) : 0;
  return Number.isFinite(n) ? n : 0;
}
function numbers(value) {
  return (value?.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number);
}
var UndrawableError;
var MissingGlyphError;
var TABLE_RULE;
var init_walk = __esm({
  "core/src/typeset/walk.ts"() {
    "use strict";
    init_geometry();
    UndrawableError = class extends Error {
    };
    MissingGlyphError = class extends UndrawableError {
    };
    TABLE_RULE = 70;
  }
});
// core/src/typeset/engine.ts
__export(engine_exports, {
  prepare: () => prepare,
  texToMathML: () => texToMathML,
  typesetOnce: () => typesetOnce
});
function prepare() {
  engine ??= createEngine();
}
function createEngine() {
  mathjax.asyncLoad = () => void 0;
  mathjax.asyncIsSynchronous = true;
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  for (const [name, macros] of PHYSICS_OVERRIDES) {
    const map = MapHandler.getMap(name);
    for (const macro of macros) map?.map.delete(macro);
  }
  MathtoolsUtil.addPairedDelims = (parser2, cs, args) => NewcommandUtil.addMacro(parser2, cs, MathtoolsMethods.PairedDelimiters, args);
  EmpheqUtil.splitOptions = (text, allowed) => ParseUtil.keyvalOptions(text, allowed, false);
  const tex = new TeX({
    packages: PACKAGES,
    maxMacros: MAX_MACROS,
    maxBuffer: MAX_BUFFER,
    tags: "none",
    formatError: (_jax, error) => {
      throw new TexError(error.message);
    }
  });
  const svg = new SVG({
    fontData: MathJaxNewcmFont,
    fontCache: "none",
    displayOverflow: "overflow",
    linebreaks: { inline: false, LinebreakVisitor: SpaceFirstLinebreaks }
  });
  const doc = mathjax.document("", { InputJax: tex, OutputJax: svg });
  svg.font.loadDynamicFilesSync();
  const tables = svg.font;
  for (const variant of Object.values(tables.variant)) {
    for (const key of Object.keys(variant.chars)) {
      const char = variant.chars[Number(key)];
      if (char && !Array.isArray(char)) delete variant.chars[Number(key)];
    }
  }
  for (const key of Object.keys(tables.delimiters)) {
    const delimiter = tables.delimiters[Number(key)];
    if (delimiter && typeof delimiter === "object" && !("dir" in delimiter)) delete tables.delimiters[Number(key)];
  }
  const definitions = ["new-Delimiter", "new-Command", "new-Environment"].map((name) => {
    const map = MapHandler.getMap(name).map;
    return [map, new Map(map)];
  });
  return { adaptor, tex, doc, definitions, exEm: svg.font.params.x_height, visitor: new CompactMmlVisitor() };
}
function ready(tex) {
  engine ??= createEngine();
  if (tex.trim() === "") throw new TexError("empty formula");
  if (tex.length > MAX_LENGTH) throw new TexError(`formula longer than ${MAX_LENGTH} characters`);
  for (const [map, initial] of engine.definitions) {
    map.clear();
    for (const [key, value] of initial) map.set(key, value);
  }
  rememberLabels(engine.tex.parseOptions.tags.allLabels, MAX_LABELS);
  engine.tex.reset();
  return engine;
}
function typesetOnce(tex, options3) {
  const { adaptor, doc, exEm } = ready(tex);
  const lineWidth = options3.lineWidth !== void 0 && options3.lineWidth > 0 ? options3.lineWidth : 0;
  const breaking = options3.display && lineWidth > 0;
  const containerWidth = lineWidth || 1e3;
  MmlMath.defaults.scriptminsize = options3.display ? SCRIPT_MIN_SIZE : INLINE_SCRIPT_MIN_SIZE;
  const output = doc.outputJax;
  output.options.displayOverflow = breaking ? "linebreak" : "overflow";
  let container;
  try {
    container = doc.convert(tex, {
      display: options3.display,
      em: EM_PX,
      ex: EM_PX * exEm,
      containerWidth: containerWidth * EM_PX
    });
  } catch (error) {
    throw asTexError(error);
  }
  const svg = adaptor.firstChild(container);
  if (!svg || adaptor.kind(svg) !== "svg") throw new TexError("MathJax produced no SVG");
  const fullWidth = !adaptor.getAttribute(svg, "viewBox");
  const viewBox2 = (adaptor.getAttribute(svg, fullWidth ? "data-mjx-viewBox" : "viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  if (viewBox2.length !== 4 || viewBox2.some((n) => !Number.isFinite(n))) throw new TexError("MathJax produced an SVG without a viewBox");
  const [, vy, vw, vh] = viewBox2;
  const height2 = -vy / 1e3;
  const depth = (vh + vy) / 1e3;
  try {
    if (!fullWidth) return { width: vw / 1e3, height: height2, depth, ops: walkSvg(adaptor, svg, { exEm, emPx: EM_PX, width: vw / 1e3, height: height2 }) };
    const minWidth = Number.parseFloat(adaptor.getStyle(svg, "min-width") || "0") * exEm;
    if (lineWidth || minWidth) {
      const width = Math.max(lineWidth, minWidth);
      return { width, height: height2, depth, ops: walkSvg(adaptor, svg, { exEm, emPx: EM_PX, width, height: height2 }) };
    }
    const ops = walkSvg(adaptor, svg, { exEm, emPx: EM_PX, width: containerWidth, height: height2 });
    return { width: Math.max(0, ...ops.map(rightEdge)), height: height2, depth, ops };
  } catch (error) {
    throw asTexError(error);
  }
}
function rightEdge(op) {
  if (op.type === "rect") return op.x + op.width;
  let right = -Infinity;
  for (const line of flatten(parsePath(op.d), op.transform, 2)) for (const [x2] of line.points) right = Math.max(right, x2);
  return right;
}
function texToMathML(tex, options3) {
  const { doc, visitor } = ready(tex);
  let root2;
  try {
    root2 = doc.convert(tex, { display: options3.display, end: STATE.CONVERT });
  } catch (error) {
    throw asTexError(error);
  }
  return `<math display="${options3.display ? "block" : "inline"}"${visitor.visitTree(root2).slice("<math".length)}`;
}
function asTexError(error) {
  if (error instanceof TexError) return error;
  if (error instanceof MissingGlyphError) return new GlyphError(error.message);
  if (error instanceof UndrawableError) return new TexError(error.message);
  if (error instanceof RangeError) return new TexError(`formula too complex (${error.message})`);
  const message = error instanceof Error ? error.message : String(error);
  return new TexError(message.replace(/\n.*/s, "") || "MathJax failed");
}
var MAX_LENGTH;
var MAX_MACROS;
var MAX_BUFFER;
var EM_PX;
var PACKAGES;
var PHYSICS_OVERRIDES;
var SCRIPT_MIN_SIZE;
var INLINE_SCRIPT_MIN_SIZE;
var MAX_LABELS;
var SpaceFirstLinebreaks;
var engine;
var CompactMmlVisitor;
var init_engine = __esm({
  "core/src/typeset/engine.ts"() {
    "use strict";
    init_liteAdaptor();
    init_MathItem();
    init_math();
    init_SerializedMmlVisitor();
    init_html();
    init_tex();
    init_MapHandler();
    init_mathjax();
    init_svg2();
    init_LinebreakVisitor();
    init_svg();
    init_BaseConfiguration();
    init_AmsConfiguration();
    init_NewcommandConfiguration();
    init_BoldsymbolConfiguration();
    init_BraketConfiguration();
    init_CancelConfiguration();
    init_ColorConfiguration();
    init_MathtoolsConfiguration();
    init_PhysicsConfiguration();
    init_TextMacrosConfiguration();
    init_UnicodeConfiguration();
    init_MhchemConfiguration();
    init_AmsCdConfiguration();
    init_EmpheqConfiguration();
    init_CenternotConfiguration();
    init_GensymbConfiguration();
    init_UpgreekConfiguration();
    init_TextcompConfiguration();
    init_MathtoolsUtil();
    init_MathtoolsMethods();
    init_NewcommandUtil();
    init_EmpheqUtil();
    init_ParseUtil();
    init_fonts();
    init_macros();
    init_errors();
    init_geometry();
    init_walk();
    MAX_LENGTH = 4096;
    MAX_MACROS = 1e3;
    MAX_BUFFER = 5 * 1024;
    EM_PX = 16;
    PACKAGES = [
      "base",
      "ams",
      "newcommand",
      "boldsymbol",
      "braket",
      "cancel",
      "color",
      "mathtools",
      "physics",
      "textmacros",
      "unicode",
      "mhchem",
      "amscd",
      "empheq",
      "centernot",
      "gensymb",
      "upgreek",
      "textcomp",
      "kittex",
      "kittex-text"
    ];
    PHYSICS_OVERRIDES = [
      ["Physics-vector-macros", ["div"]],
      ["Physics-expressions-macros", ["Re", "Im"]]
    ];
    SCRIPT_MIN_SIZE = ".7em";
    INLINE_SCRIPT_MIN_SIZE = ".4em";
    MAX_LABELS = 256;
    SpaceFirstLinebreaks = class extends LinebreakVisitor {
      constructor(factory) {
        super(factory);
        const factors = this.FACTORS;
        const space = factors.space;
        factors.space = (p, node) => {
          const penalty = space(p, node);
          return penalty < NOBREAK && node.getBBox().w >= 0.9 ? penalty - 2e3 : penalty;
        };
      }
    };
    CompactMmlVisitor = class extends SerializedMmlVisitor {
      visitTree(node) {
        return this.visitNode(node, "");
      }
      visitInferredMrowNode(node, _space) {
        return node.childNodes.map((child) => this.visitNode(child, "")).join("");
      }
      visitDefault(node, _space) {
        const kind = this.getKind(node);
        return `<${kind}${this.getAttributes(node)}>${this.childNodeMml(node, "", "")}</${kind}>`;
      }
      getAttributes(node) {
        const attributes = this.getAttributeList(node);
        let out = "";
        for (const name of Object.keys(attributes)) {
          if (name.startsWith("data-latex") || name === "display" && node.isKind("math")) continue;
          const value = attributes[name];
          if (value === void 0) continue;
          out += ` ${name}="${this.quoteHTML(String(value))}"`;
        }
        return out;
      }
    };
  }
});
// node_modules/marked/lib/marked.esm.js
function _getDefaults() {
  return {
    async: false,
    breaks: false,
    extensions: null,
    gfm: true,
    hooks: null,
    pedantic: false,
    renderer: null,
    silent: false,
    tokenizer: null,
    walkTokens: null
  };
}
var _defaults = _getDefaults();
function changeDefaults(newDefaults) {
  _defaults = newDefaults;
}
var noopTest = { exec: () => null };
function edit(regex, opt = "") {
  let source = typeof regex === "string" ? regex : regex.source;
  const obj = {
    replace: (name, val) => {
      let valSource = typeof val === "string" ? val : val.source;
      valSource = valSource.replace(other.caret, "$1");
      source = source.replace(name, valSource);
      return obj;
    },
    getRegex: () => {
      return new RegExp(source, opt);
    }
  };
  return obj;
}
var other = {
  codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm,
  outputLinkReplace: /\\([\[\]])/g,
  indentCodeCompensation: /^(\s+)(?:```)/,
  beginningSpace: /^\s+/,
  endingHash: /#$/,
  startingSpaceChar: /^ /,
  endingSpaceChar: / $/,
  nonSpaceChar: /[^ ]/,
  newLineCharGlobal: /\n/g,
  tabCharGlobal: /\t/g,
  multipleSpaceGlobal: /\s+/g,
  blankLine: /^[ \t]*$/,
  doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
  blockquoteStart: /^ {0,3}>/,
  blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g,
  blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
  listReplaceTabs: /^\t+/,
  listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
  listIsTask: /^\[[ xX]\] /,
  listReplaceTask: /^\[[ xX]\] +/,
  anyLine: /\n.*\n/,
  hrefBrackets: /^<(.*)>$/,
  tableDelimiter: /[:|]/,
  tableAlignChars: /^\||\| *$/g,
  tableRowBlankLine: /\n[ \t]*$/,
  tableAlignRight: /^ *-+: *$/,
  tableAlignCenter: /^ *:-+: *$/,
  tableAlignLeft: /^ *:-+ *$/,
  startATag: /^<a /i,
  endATag: /^<\/a>/i,
  startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
  endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
  startAngleBracket: /^</,
  endAngleBracket: />$/,
  pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
  unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
  escapeTest: /[&<>"']/,
  escapeReplace: /[&<>"']/g,
  escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
  escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,
  caret: /(^|[^\[])\^/g,
  percentDecode: /%25/g,
  findPipe: /\|/g,
  splitPipe: / \|/,
  slashPipe: /\\\|/g,
  carriageReturn: /\r\n|\r/g,
  spaceLine: /^ +$/gm,
  notSpaceStart: /^\S*/,
  endingNewline: /\n$/,
  listItemRegex: (bull) => new RegExp(`^( {0,3}${bull})((?:[	 ][^\\n]*)?(?:\\n|$))`),
  nextBulletRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
  hrRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
  fencesBeginRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`),
  headingBeginRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`),
  htmlBeginRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}<(?:[a-z].*>|!--)`, "i")
};
var newline = /^(?:[ \t]*(?:\n|$))+/;
var blockCode = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var fences = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var hr = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var heading = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var bullet = /(?:[*+-]|\d{1,9}[.)])/;
var lheading = edit(/^(?!bull |blockCode|fences|blockquote|heading|html)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html))+?)\n {0,3}(=+|-+) *(?:\n+|$)/).replace(/bull/g, bullet).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).getRegex();
var _paragraph = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
var blockText = /^[^\n]+/;
var _blockLabel = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
var def = edit(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", _blockLabel).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
var list = edit(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, bullet).getRegex();
var _comment = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var html = edit("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", _comment).replace("tag", _tag).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
var paragraph = edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex();
var blockquote = edit(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", paragraph).getRegex();
var blockNormal = {
  blockquote,
  code: blockCode,
  def,
  fences,
  heading,
  hr,
  html,
  lheading,
  list,
  newline,
  paragraph,
  table: noopTest,
  text: blockText
};
var gfmTable = edit("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex();
var blockGfm = {
  ...blockNormal,
  table: gfmTable,
  paragraph: edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", gfmTable).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex()
};
var blockPedantic = {
  ...blockNormal,
  html: edit(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", _comment).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
  heading: /^(#{1,6})(.*)(?:\n+|$)/,
  fences: noopTest,
  // fences not supported
  lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  paragraph: edit(_paragraph).replace("hr", hr).replace("heading", " *#{1,6} *[^\n]").replace("lheading", lheading).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex()
};
var escape$1 = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var inlineCode = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var br = /^( {2,}|\\)\n(?!\s*$)/;
var inlineText = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var _punctuation = /[\p{P}\p{S}]/u;
var _punctuationOrSpace = /[\s\p{P}\p{S}]/u;
var _notPunctuationOrSpace = /[^\s\p{P}\p{S}]/u;
var punctuation = edit(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, _punctuationOrSpace).getRegex();
var _punctuationGfmStrongEm = /(?!~)[\p{P}\p{S}]/u;
var _punctuationOrSpaceGfmStrongEm = /(?!~)[\s\p{P}\p{S}]/u;
var _notPunctuationOrSpaceGfmStrongEm = /(?:[^\s\p{P}\p{S}]|~)/u;
var blockSkip = /\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g;
var emStrongLDelimCore = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/;
var emStrongLDelim = edit(emStrongLDelimCore, "u").replace(/punct/g, _punctuation).getRegex();
var emStrongLDelimGfm = edit(emStrongLDelimCore, "u").replace(/punct/g, _punctuationGfmStrongEm).getRegex();
var emStrongRDelimAst = edit(emStrongRDelimAstCore, "gu").replace(/notPunctSpace/g, _notPunctuationOrSpace).replace(/punctSpace/g, _punctuationOrSpace).replace(/punct/g, _punctuation).getRegex();
var emStrongRDelimAstGfm = edit(emStrongRDelimAstCore, "gu").replace(/notPunctSpace/g, _notPunctuationOrSpaceGfmStrongEm).replace(/punctSpace/g, _punctuationOrSpaceGfmStrongEm).replace(/punct/g, _punctuationGfmStrongEm).getRegex();
var emStrongRDelimUnd = edit("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, _notPunctuationOrSpace).replace(/punctSpace/g, _punctuationOrSpace).replace(/punct/g, _punctuation).getRegex();
var anyPunctuation = edit(/\\(punct)/, "gu").replace(/punct/g, _punctuation).getRegex();
var autolink = edit(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
var _inlineComment = edit(_comment).replace("(?:-->|$)", "-->").getRegex();
var tag = edit("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", _inlineComment).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
var _inlineLabel = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
var link = edit(/^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/).replace("label", _inlineLabel).replace("href", /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
var reflink = edit(/^!?\[(label)\]\[(ref)\]/).replace("label", _inlineLabel).replace("ref", _blockLabel).getRegex();
var nolink = edit(/^!?\[(ref)\](?:\[\])?/).replace("ref", _blockLabel).getRegex();
var reflinkSearch = edit("reflink|nolink(?!\\()", "g").replace("reflink", reflink).replace("nolink", nolink).getRegex();
var inlineNormal = {
  _backpedal: noopTest,
  // only used for GFM url
  anyPunctuation,
  autolink,
  blockSkip,
  br,
  code: inlineCode,
  del: noopTest,
  emStrongLDelim,
  emStrongRDelimAst,
  emStrongRDelimUnd,
  escape: escape$1,
  link,
  nolink,
  punctuation,
  reflink,
  reflinkSearch,
  tag,
  text: inlineText,
  url: noopTest
};
var inlinePedantic = {
  ...inlineNormal,
  link: edit(/^!?\[(label)\]\((.*?)\)/).replace("label", _inlineLabel).getRegex(),
  reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", _inlineLabel).getRegex()
};
var inlineGfm = {
  ...inlineNormal,
  emStrongRDelimAst: emStrongRDelimAstGfm,
  emStrongLDelim: emStrongLDelimGfm,
  url: edit(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, "i").replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),
  _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
  del: /^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/,
  text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
};
var inlineBreaks = {
  ...inlineGfm,
  br: edit(br).replace("{2,}", "*").getRegex(),
  text: edit(inlineGfm.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
};
var block = {
  normal: blockNormal,
  gfm: blockGfm,
  pedantic: blockPedantic
};
var inline = {
  normal: inlineNormal,
  gfm: inlineGfm,
  breaks: inlineBreaks,
  pedantic: inlinePedantic
};
var getEscapeReplacement = (ch) => escapeReplacements[ch];
function escape(html2, encode) {
  if (encode) {
    if (other.escapeTest.test(html2)) {
      return html2.replace(other.escapeReplace, getEscapeReplacement);
    }
  } else {
    if (other.escapeTestNoEncode.test(html2)) {
      return html2.replace(other.escapeReplaceNoEncode, getEscapeReplacement);
    }
  }
  return html2;
}
function cleanUrl(href) {
  try {
    href = encodeURI(href).replace(other.percentDecode, "%");
  } catch {
    return null;
  }
  return href;
}
function splitCells(tableRow, count) {
  const row = tableRow.replace(other.findPipe, (match, offset, str) => {
    let escaped = false;
    let curr = offset;
    while (--curr >= 0 && str[curr] === "\\")
      escaped = !escaped;
    if (escaped) {
      return "|";
    } else {
      return " |";
    }
  }), cells2 = row.split(other.splitPipe);
  let i2 = 0;
  if (!cells2[0].trim()) {
    cells2.shift();
  }
  if (cells2.length > 0 && !cells2.at(-1)?.trim()) {
    cells2.pop();
  }
  if (count) {
    if (cells2.length > count) {
      cells2.splice(count);
    } else {
      while (cells2.length < count)
        cells2.push("");
    }
  }
  for (; i2 < cells2.length; i2++) {
    cells2[i2] = cells2[i2].trim().replace(other.slashPipe, "|");
  }
  return cells2;
}
function rtrim(str, c, invert) {
  const l = str.length;
  if (l === 0) {
    return "";
  }
  let suffLen = 0;
  while (suffLen < l) {
    const currChar = str.charAt(l - suffLen - 1);
    if (currChar === c && true) {
      suffLen++;
    } else {
      break;
    }
  }
  return str.slice(0, l - suffLen);
}
function findClosingBracket(str, b) {
  if (str.indexOf(b[1]) === -1) {
    return -1;
  }
  let level = 0;
  for (let i2 = 0; i2 < str.length; i2++) {
    if (str[i2] === "\\") {
      i2++;
    } else if (str[i2] === b[0]) {
      level++;
    } else if (str[i2] === b[1]) {
      level--;
      if (level < 0) {
        return i2;
      }
    }
  }
  return -1;
}
function outputLink(cap2, link2, raw, lexer2, rules) {
  const href = link2.href;
  const title = link2.title || null;
  const text = cap2[1].replace(rules.other.outputLinkReplace, "$1");
  if (cap2[0].charAt(0) !== "!") {
    lexer2.state.inLink = true;
    const token2 = {
      type: "link",
      raw,
      href,
      title,
      text,
      tokens: lexer2.inlineTokens(text)
    };
    lexer2.state.inLink = false;
    return token2;
  }
  return {
    type: "image",
    raw,
    href,
    title,
    text
  };
}
function indentCodeCompensation(raw, text, rules) {
  const matchIndentToCode = raw.match(rules.other.indentCodeCompensation);
  if (matchIndentToCode === null) {
    return text;
  }
  const indentToCode = matchIndentToCode[1];
  return text.split("\n").map((node) => {
    const matchIndentInNode = node.match(rules.other.beginningSpace);
    if (matchIndentInNode === null) {
      return node;
    }
    const [indentInNode] = matchIndentInNode;
    if (indentInNode.length >= indentToCode.length) {
      return node.slice(indentToCode.length);
    }
    return node;
  }).join("\n");
}
var _Tokenizer = class {
  options;
  rules;
  // set by the lexer
  lexer;
  // set by the lexer
  constructor(options3) {
    this.options = options3 || _defaults;
  }
  space(src) {
    const cap2 = this.rules.block.newline.exec(src);
    if (cap2 && cap2[0].length > 0) {
      return {
        type: "space",
        raw: cap2[0]
      };
    }
  }
  code(src) {
    const cap2 = this.rules.block.code.exec(src);
    if (cap2) {
      const text = cap2[0].replace(this.rules.other.codeRemoveIndent, "");
      return {
        type: "code",
        raw: cap2[0],
        codeBlockStyle: "indented",
        text: !this.options.pedantic ? rtrim(text, "\n") : text
      };
    }
  }
  fences(src) {
    const cap2 = this.rules.block.fences.exec(src);
    if (cap2) {
      const raw = cap2[0];
      const text = indentCodeCompensation(raw, cap2[3] || "", this.rules);
      return {
        type: "code",
        raw,
        lang: cap2[2] ? cap2[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : cap2[2],
        text
      };
    }
  }
  heading(src) {
    const cap2 = this.rules.block.heading.exec(src);
    if (cap2) {
      let text = cap2[2].trim();
      if (this.rules.other.endingHash.test(text)) {
        const trimmed2 = rtrim(text, "#");
        if (this.options.pedantic) {
          text = trimmed2.trim();
        } else if (!trimmed2 || this.rules.other.endingSpaceChar.test(trimmed2)) {
          text = trimmed2.trim();
        }
      }
      return {
        type: "heading",
        raw: cap2[0],
        depth: cap2[1].length,
        text,
        tokens: this.lexer.inline(text)
      };
    }
  }
  hr(src) {
    const cap2 = this.rules.block.hr.exec(src);
    if (cap2) {
      return {
        type: "hr",
        raw: rtrim(cap2[0], "\n")
      };
    }
  }
  blockquote(src) {
    const cap2 = this.rules.block.blockquote.exec(src);
    if (cap2) {
      let lines2 = rtrim(cap2[0], "\n").split("\n");
      let raw = "";
      let text = "";
      const tokens = [];
      while (lines2.length > 0) {
        let inBlockquote = false;
        const currentLines = [];
        let i2;
        for (i2 = 0; i2 < lines2.length; i2++) {
          if (this.rules.other.blockquoteStart.test(lines2[i2])) {
            currentLines.push(lines2[i2]);
            inBlockquote = true;
          } else if (!inBlockquote) {
            currentLines.push(lines2[i2]);
          } else {
            break;
          }
        }
        lines2 = lines2.slice(i2);
        const currentRaw = currentLines.join("\n");
        const currentText = currentRaw.replace(this.rules.other.blockquoteSetextReplace, "\n    $1").replace(this.rules.other.blockquoteSetextReplace2, "");
        raw = raw ? `${raw}
${currentRaw}` : currentRaw;
        text = text ? `${text}
${currentText}` : currentText;
        const top = this.lexer.state.top;
        this.lexer.state.top = true;
        this.lexer.blockTokens(currentText, tokens, true);
        this.lexer.state.top = top;
        if (lines2.length === 0) {
          break;
        }
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "code") {
          break;
        } else if (lastToken?.type === "blockquote") {
          const oldToken = lastToken;
          const newText = oldToken.raw + "\n" + lines2.join("\n");
          const newToken = this.blockquote(newText);
          tokens[tokens.length - 1] = newToken;
          raw = raw.substring(0, raw.length - oldToken.raw.length) + newToken.raw;
          text = text.substring(0, text.length - oldToken.text.length) + newToken.text;
          break;
        } else if (lastToken?.type === "list") {
          const oldToken = lastToken;
          const newText = oldToken.raw + "\n" + lines2.join("\n");
          const newToken = this.list(newText);
          tokens[tokens.length - 1] = newToken;
          raw = raw.substring(0, raw.length - lastToken.raw.length) + newToken.raw;
          text = text.substring(0, text.length - oldToken.raw.length) + newToken.raw;
          lines2 = newText.substring(tokens.at(-1).raw.length).split("\n");
          continue;
        }
      }
      return {
        type: "blockquote",
        raw,
        tokens,
        text
      };
    }
  }
  list(src) {
    let cap2 = this.rules.block.list.exec(src);
    if (cap2) {
      let bull = cap2[1].trim();
      const isordered = bull.length > 1;
      const list3 = {
        type: "list",
        raw: "",
        ordered: isordered,
        start: isordered ? +bull.slice(0, -1) : "",
        loose: false,
        items: []
      };
      bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;
      if (this.options.pedantic) {
        bull = isordered ? bull : "[*+-]";
      }
      const itemRegex = this.rules.other.listItemRegex(bull);
      let endsWithBlankLine = false;
      while (src) {
        let endEarly = false;
        let raw = "";
        let itemContents = "";
        if (!(cap2 = itemRegex.exec(src))) {
          break;
        }
        if (this.rules.block.hr.test(src)) {
          break;
        }
        raw = cap2[0];
        src = src.substring(raw.length);
        let line = cap2[2].split("\n", 1)[0].replace(this.rules.other.listReplaceTabs, (t) => " ".repeat(3 * t.length));
        let nextLine = src.split("\n", 1)[0];
        let blankLine = !line.trim();
        let indent = 0;
        if (this.options.pedantic) {
          indent = 2;
          itemContents = line.trimStart();
        } else if (blankLine) {
          indent = cap2[1].length + 1;
        } else {
          indent = cap2[2].search(this.rules.other.nonSpaceChar);
          indent = indent > 4 ? 1 : indent;
          itemContents = line.slice(indent);
          indent += cap2[1].length;
        }
        if (blankLine && this.rules.other.blankLine.test(nextLine)) {
          raw += nextLine + "\n";
          src = src.substring(nextLine.length + 1);
          endEarly = true;
        }
        if (!endEarly) {
          const nextBulletRegex = this.rules.other.nextBulletRegex(indent);
          const hrRegex = this.rules.other.hrRegex(indent);
          const fencesBeginRegex = this.rules.other.fencesBeginRegex(indent);
          const headingBeginRegex = this.rules.other.headingBeginRegex(indent);
          const htmlBeginRegex = this.rules.other.htmlBeginRegex(indent);
          while (src) {
            const rawLine = src.split("\n", 1)[0];
            let nextLineWithoutTabs;
            nextLine = rawLine;
            if (this.options.pedantic) {
              nextLine = nextLine.replace(this.rules.other.listReplaceNesting, "  ");
              nextLineWithoutTabs = nextLine;
            } else {
              nextLineWithoutTabs = nextLine.replace(this.rules.other.tabCharGlobal, "    ");
            }
            if (fencesBeginRegex.test(nextLine)) {
              break;
            }
            if (headingBeginRegex.test(nextLine)) {
              break;
            }
            if (htmlBeginRegex.test(nextLine)) {
              break;
            }
            if (nextBulletRegex.test(nextLine)) {
              break;
            }
            if (hrRegex.test(nextLine)) {
              break;
            }
            if (nextLineWithoutTabs.search(this.rules.other.nonSpaceChar) >= indent || !nextLine.trim()) {
              itemContents += "\n" + nextLineWithoutTabs.slice(indent);
            } else {
              if (blankLine) {
                break;
              }
              if (line.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4) {
                break;
              }
              if (fencesBeginRegex.test(line)) {
                break;
              }
              if (headingBeginRegex.test(line)) {
                break;
              }
              if (hrRegex.test(line)) {
                break;
              }
              itemContents += "\n" + nextLine;
            }
            if (!blankLine && !nextLine.trim()) {
              blankLine = true;
            }
            raw += rawLine + "\n";
            src = src.substring(rawLine.length + 1);
            line = nextLineWithoutTabs.slice(indent);
          }
        }
        if (!list3.loose) {
          if (endsWithBlankLine) {
            list3.loose = true;
          } else if (this.rules.other.doubleBlankLine.test(raw)) {
            endsWithBlankLine = true;
          }
        }
        let istask = null;
        let ischecked;
        if (this.options.gfm) {
          istask = this.rules.other.listIsTask.exec(itemContents);
          if (istask) {
            ischecked = istask[0] !== "[ ] ";
            itemContents = itemContents.replace(this.rules.other.listReplaceTask, "");
          }
        }
        list3.items.push({
          type: "list_item",
          raw,
          task: !!istask,
          checked: ischecked,
          loose: false,
          text: itemContents,
          tokens: []
        });
        list3.raw += raw;
      }
      const lastItem = list3.items.at(-1);
      if (lastItem) {
        lastItem.raw = lastItem.raw.trimEnd();
        lastItem.text = lastItem.text.trimEnd();
      } else {
        return;
      }
      list3.raw = list3.raw.trimEnd();
      for (let i2 = 0; i2 < list3.items.length; i2++) {
        this.lexer.state.top = false;
        list3.items[i2].tokens = this.lexer.blockTokens(list3.items[i2].text, []);
        if (!list3.loose) {
          const spacers = list3.items[i2].tokens.filter((t) => t.type === "space");
          const hasMultipleLineBreaks = spacers.length > 0 && spacers.some((t) => this.rules.other.anyLine.test(t.raw));
          list3.loose = hasMultipleLineBreaks;
        }
      }
      if (list3.loose) {
        for (let i2 = 0; i2 < list3.items.length; i2++) {
          list3.items[i2].loose = true;
        }
      }
      return list3;
    }
  }
  html(src) {
    const cap2 = this.rules.block.html.exec(src);
    if (cap2) {
      const token2 = {
        type: "html",
        block: true,
        raw: cap2[0],
        pre: cap2[1] === "pre" || cap2[1] === "script" || cap2[1] === "style",
        text: cap2[0]
      };
      return token2;
    }
  }
  def(src) {
    const cap2 = this.rules.block.def.exec(src);
    if (cap2) {
      const tag3 = cap2[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " ");
      const href = cap2[2] ? cap2[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "";
      const title = cap2[3] ? cap2[3].substring(1, cap2[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : cap2[3];
      return {
        type: "def",
        tag: tag3,
        raw: cap2[0],
        href,
        title
      };
    }
  }
  table(src) {
    const cap2 = this.rules.block.table.exec(src);
    if (!cap2) {
      return;
    }
    if (!this.rules.other.tableDelimiter.test(cap2[2])) {
      return;
    }
    const headers = splitCells(cap2[1]);
    const aligns = cap2[2].replace(this.rules.other.tableAlignChars, "").split("|");
    const rows = cap2[3]?.trim() ? cap2[3].replace(this.rules.other.tableRowBlankLine, "").split("\n") : [];
    const item = {
      type: "table",
      raw: cap2[0],
      header: [],
      align: [],
      rows: []
    };
    if (headers.length !== aligns.length) {
      return;
    }
    for (const align of aligns) {
      if (this.rules.other.tableAlignRight.test(align)) {
        item.align.push("right");
      } else if (this.rules.other.tableAlignCenter.test(align)) {
        item.align.push("center");
      } else if (this.rules.other.tableAlignLeft.test(align)) {
        item.align.push("left");
      } else {
        item.align.push(null);
      }
    }
    for (let i2 = 0; i2 < headers.length; i2++) {
      item.header.push({
        text: headers[i2],
        tokens: this.lexer.inline(headers[i2]),
        header: true,
        align: item.align[i2]
      });
    }
    for (const row of rows) {
      item.rows.push(splitCells(row, item.header.length).map((cell, i2) => {
        return {
          text: cell,
          tokens: this.lexer.inline(cell),
          header: false,
          align: item.align[i2]
        };
      }));
    }
    return item;
  }
  lheading(src) {
    const cap2 = this.rules.block.lheading.exec(src);
    if (cap2) {
      return {
        type: "heading",
        raw: cap2[0],
        depth: cap2[2].charAt(0) === "=" ? 1 : 2,
        text: cap2[1],
        tokens: this.lexer.inline(cap2[1])
      };
    }
  }
  paragraph(src) {
    const cap2 = this.rules.block.paragraph.exec(src);
    if (cap2) {
      const text = cap2[1].charAt(cap2[1].length - 1) === "\n" ? cap2[1].slice(0, -1) : cap2[1];
      return {
        type: "paragraph",
        raw: cap2[0],
        text,
        tokens: this.lexer.inline(text)
      };
    }
  }
  text(src) {
    const cap2 = this.rules.block.text.exec(src);
    if (cap2) {
      return {
        type: "text",
        raw: cap2[0],
        text: cap2[0],
        tokens: this.lexer.inline(cap2[0])
      };
    }
  }
  escape(src) {
    const cap2 = this.rules.inline.escape.exec(src);
    if (cap2) {
      return {
        type: "escape",
        raw: cap2[0],
        text: cap2[1]
      };
    }
  }
  tag(src) {
    const cap2 = this.rules.inline.tag.exec(src);
    if (cap2) {
      if (!this.lexer.state.inLink && this.rules.other.startATag.test(cap2[0])) {
        this.lexer.state.inLink = true;
      } else if (this.lexer.state.inLink && this.rules.other.endATag.test(cap2[0])) {
        this.lexer.state.inLink = false;
      }
      if (!this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(cap2[0])) {
        this.lexer.state.inRawBlock = true;
      } else if (this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(cap2[0])) {
        this.lexer.state.inRawBlock = false;
      }
      return {
        type: "html",
        raw: cap2[0],
        inLink: this.lexer.state.inLink,
        inRawBlock: this.lexer.state.inRawBlock,
        block: false,
        text: cap2[0]
      };
    }
  }
  link(src) {
    const cap2 = this.rules.inline.link.exec(src);
    if (cap2) {
      const trimmedUrl = cap2[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(trimmedUrl)) {
        if (!this.rules.other.endAngleBracket.test(trimmedUrl)) {
          return;
        }
        const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), "\\");
        if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
          return;
        }
      } else {
        const lastParenIndex = findClosingBracket(cap2[2], "()");
        if (lastParenIndex > -1) {
          const start = cap2[0].indexOf("!") === 0 ? 5 : 4;
          const linkLen = start + cap2[1].length + lastParenIndex;
          cap2[2] = cap2[2].substring(0, lastParenIndex);
          cap2[0] = cap2[0].substring(0, linkLen).trim();
          cap2[3] = "";
        }
      }
      let href = cap2[2];
      let title = "";
      if (this.options.pedantic) {
        const link2 = this.rules.other.pedanticHrefTitle.exec(href);
        if (link2) {
          href = link2[1];
          title = link2[3];
        }
      } else {
        title = cap2[3] ? cap2[3].slice(1, -1) : "";
      }
      href = href.trim();
      if (this.rules.other.startAngleBracket.test(href)) {
        if (this.options.pedantic && !this.rules.other.endAngleBracket.test(trimmedUrl)) {
          href = href.slice(1);
        } else {
          href = href.slice(1, -1);
        }
      }
      return outputLink(cap2, {
        href: href ? href.replace(this.rules.inline.anyPunctuation, "$1") : href,
        title: title ? title.replace(this.rules.inline.anyPunctuation, "$1") : title
      }, cap2[0], this.lexer, this.rules);
    }
  }
  reflink(src, links) {
    let cap2;
    if ((cap2 = this.rules.inline.reflink.exec(src)) || (cap2 = this.rules.inline.nolink.exec(src))) {
      const linkString = (cap2[2] || cap2[1]).replace(this.rules.other.multipleSpaceGlobal, " ");
      const link2 = links[linkString.toLowerCase()];
      if (!link2) {
        const text = cap2[0].charAt(0);
        return {
          type: "text",
          raw: text,
          text
        };
      }
      return outputLink(cap2, link2, cap2[0], this.lexer, this.rules);
    }
  }
  emStrong(src, maskedSrc, prevChar = "") {
    let match = this.rules.inline.emStrongLDelim.exec(src);
    if (!match)
      return;
    if (match[3] && prevChar.match(this.rules.other.unicodeAlphaNumeric))
      return;
    const nextChar = match[1] || match[2] || "";
    if (!nextChar || !prevChar || this.rules.inline.punctuation.exec(prevChar)) {
      const lLength = [...match[0]].length - 1;
      let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
      const endReg = match[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      endReg.lastIndex = 0;
      maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
      while ((match = endReg.exec(maskedSrc)) != null) {
        rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
        if (!rDelim)
          continue;
        rLength = [...rDelim].length;
        if (match[3] || match[4]) {
          delimTotal += rLength;
          continue;
        } else if (match[5] || match[6]) {
          if (lLength % 3 && !((lLength + rLength) % 3)) {
            midDelimTotal += rLength;
            continue;
          }
        }
        delimTotal -= rLength;
        if (delimTotal > 0)
          continue;
        rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
        const lastCharLength = [...match[0]][0].length;
        const raw = src.slice(0, lLength + match.index + lastCharLength + rLength);
        if (Math.min(lLength, rLength) % 2) {
          const text2 = raw.slice(1, -1);
          return {
            type: "em",
            raw,
            text: text2,
            tokens: this.lexer.inlineTokens(text2)
          };
        }
        const text = raw.slice(2, -2);
        return {
          type: "strong",
          raw,
          text,
          tokens: this.lexer.inlineTokens(text)
        };
      }
    }
  }
  codespan(src) {
    const cap2 = this.rules.inline.code.exec(src);
    if (cap2) {
      let text = cap2[2].replace(this.rules.other.newLineCharGlobal, " ");
      const hasNonSpaceChars = this.rules.other.nonSpaceChar.test(text);
      const hasSpaceCharsOnBothEnds = this.rules.other.startingSpaceChar.test(text) && this.rules.other.endingSpaceChar.test(text);
      if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
        text = text.substring(1, text.length - 1);
      }
      return {
        type: "codespan",
        raw: cap2[0],
        text
      };
    }
  }
  br(src) {
    const cap2 = this.rules.inline.br.exec(src);
    if (cap2) {
      return {
        type: "br",
        raw: cap2[0]
      };
    }
  }
  del(src) {
    const cap2 = this.rules.inline.del.exec(src);
    if (cap2) {
      return {
        type: "del",
        raw: cap2[0],
        text: cap2[2],
        tokens: this.lexer.inlineTokens(cap2[2])
      };
    }
  }
  autolink(src) {
    const cap2 = this.rules.inline.autolink.exec(src);
    if (cap2) {
      let text, href;
      if (cap2[2] === "@") {
        text = cap2[1];
        href = "mailto:" + text;
      } else {
        text = cap2[1];
        href = text;
      }
      return {
        type: "link",
        raw: cap2[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text
          }
        ]
      };
    }
  }
  url(src) {
    let cap2;
    if (cap2 = this.rules.inline.url.exec(src)) {
      let text, href;
      if (cap2[2] === "@") {
        text = cap2[0];
        href = "mailto:" + text;
      } else {
        let prevCapZero;
        do {
          prevCapZero = cap2[0];
          cap2[0] = this.rules.inline._backpedal.exec(cap2[0])?.[0] ?? "";
        } while (prevCapZero !== cap2[0]);
        text = cap2[0];
        if (cap2[1] === "www.") {
          href = "http://" + cap2[0];
        } else {
          href = cap2[0];
        }
      }
      return {
        type: "link",
        raw: cap2[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text
          }
        ]
      };
    }
  }
  inlineText(src) {
    const cap2 = this.rules.inline.text.exec(src);
    if (cap2) {
      const escaped = this.lexer.state.inRawBlock;
      return {
        type: "text",
        raw: cap2[0],
        text: cap2[0],
        escaped
      };
    }
  }
};
export{_defaults,_Tokenizer,other,block,inline,escape,cleanUrl,_getDefaults,changeDefaults,init_engine};
