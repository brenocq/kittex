import{MAX_ELEMENTS,MAX_DEPTH,ENTITIES,BLACK,MAX_PATH_DATA,MAX_PICTURE_NUMBERS,MAX_PICTURE_OPS,MAX_USE_DEPTH,IDENTITY,MAX_VISITS,PATTERN_OPACITY,NAMED,STANDALONE_NO_PS,TIKZ_LIBRARIES,DUMP_POINT,PREAMBLE_VERSION,MATH_PREAMBLE,REFUSED_COMMANDS,MAX_TEX_SOURCE,MAX_CPU_SECONDS,JOB_NAME,NEAR,SATURATED,KEEP_CENTER,KEEP_BAND,MIN_CONTRAST,__kittexLate}from'./p30.js';export*from'./p30.js';
// core/src/diagram/xml.ts
var NAME = /[A-Za-z_:][-A-Za-z0-9_.:]*/y;
var SPACE = /[ \t\r\n]*/y;
var XmlError = class extends Error {
};
function parseXml(source) {
  let pos = 0;
  let count = 0;
  const fail2 = (what) => {
    throw new XmlError(`XML: ${what} at ${pos}`);
  };
  const skipSpace = () => {
    SPACE.lastIndex = pos;
    SPACE.exec(source);
    pos = SPACE.lastIndex;
  };
  const readName = () => {
    NAME.lastIndex = pos;
    const match = NAME.exec(source);
    if (!match) fail2("name expected");
    pos = NAME.lastIndex;
    return match[0];
  };
  const skipPast = (end) => {
    const at = source.indexOf(end, pos);
    if (at < 0) fail2(`unclosed ${end}`);
    pos = at + end.length;
  };
  const skipMarkup = () => {
    if (source.startsWith("<!--", pos)) skipPast("-->");
    else if (source.startsWith("<?", pos)) skipPast("?>");
    else if (source.startsWith("<![CDATA[", pos)) skipPast("]]>");
    else if (source.startsWith("<!", pos)) skipPast(">");
    else return false;
    return true;
  };
  const openTag = () => {
    if (++count > MAX_ELEMENTS) fail2("too many elements");
    pos++;
    const name = readName();
    const attrs = /* @__PURE__ */ Object.create(null);
    for (; ; ) {
      skipSpace();
      const c = source[pos];
      if (c === "/" && source[pos + 1] === ">") {
        pos += 2;
        return { el: { name, attrs, children: [] }, closed: true };
      }
      if (c === ">") {
        pos++;
        return { el: { name, attrs, children: [] }, closed: false };
      }
      if (c === void 0) fail2("unclosed tag");
      const key = readName();
      skipSpace();
      if (source[pos] !== "=") fail2("= expected");
      pos++;
      skipSpace();
      const quote = source[pos];
      if (quote !== '"' && quote !== "'") fail2("quote expected");
      const end = source.indexOf(quote, pos + 1);
      if (end < 0) fail2("unclosed attribute");
      attrs[key] = decode(source.slice(pos + 1, end));
      pos = end + 1;
    }
  };
  const element = () => {
    const first = openTag();
    if (first.closed) return first.el;
    const open = [first.el];
    for (; ; ) {
      const lt = source.indexOf("<", pos);
      const top = open[open.length - 1];
      if (lt < 0) fail2(`unclosed <${top.name}>`);
      pos = lt;
      if (skipMarkup()) continue;
      if (source[pos + 1] === "/") {
        pos += 2;
        const closing = readName();
        if (closing !== top.name) fail2(`</${closing}> closes <${top.name}>`);
        skipSpace();
        if (source[pos] !== ">") fail2("> expected");
        pos++;
        open.pop();
        if (open.length === 0) return top;
        continue;
      }
      const child = openTag();
      top.children.push(child.el);
      if (child.closed) continue;
      if (open.length >= MAX_DEPTH) fail2("nested too deep");
      open.push(child.el);
    }
  };
  for (; ; ) {
    skipSpace();
    if (pos >= source.length) fail2("no root element");
    if (source[pos] !== "<") fail2("< expected");
    if (skipMarkup()) continue;
    const root2 = element();
    return root2;
  }
}
function decode(value) {
  if (!value.includes("&")) return value;
  return value.replace(/&(#x[0-9A-Fa-f]{1,6}|#[0-9]{1,7}|[A-Za-z]+);/g, (whole, ref) => {
    if (ref[0] === "#") {
      const code = ref[1] === "x" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return code > 0 && code <= 1114111 ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[ref] ?? whole;
  });
}
// core/src/diagram/svg.ts
var SvgError = class extends Error {
};
var INITIAL = {
  fill: BLACK,
  fillOpacity: 1,
  fillRule: "nonzero",
  stroke: null,
  strokeOpacity: 1,
  strokeWidth: 1,
  cap: "butt",
  join: "miter",
  miterLimit: 4,
  dash: void 0,
  dashOffset: 0,
  opacity: 1,
  color: BLACK,
  clip: void 0
};
var SKIPPED = /* @__PURE__ */ new Set(["defs", "clipPath", "linearGradient", "radialGradient", "pattern", "symbol", "marker", "title", "desc", "metadata", "style", "script"]);
var REFUSED = /* @__PURE__ */ new Set(["text", "image", "foreignObject", "mask", "svg", "video", "iframe"]);
function readSvg(source, options3) {
  const root2 = parseXml(source);
  if (root2.name !== "svg") throw new SvgError("not an SVG document");
  const box = viewBox(root2);
  const ids = /* @__PURE__ */ new Map();
  const pending = [root2];
  for (let el = pending.pop(); el; el = pending.pop()) {
    const id = el.attrs.id;
    if (id !== void 0 && !ids.has(id)) ids.set(id, el);
    for (let i2 = el.children.length - 1; i2 >= 0; i2--) pending.push(el.children[i2]);
  }
  const s = options3.emPerUnit;
  const baselineY = options3.baseline === "origin" ? 0 : box.y + box.height;
  const toEm = [s, 0, 0, s, -box.x * s, -baselineY * s];
  const ops = [];
  const clips = [];
  const clipIds = /* @__PURE__ */ new Map();
  const counted = /* @__PURE__ */ new Map();
  let numbers2 = 0;
  const account = (d) => {
    if (d.length > MAX_PATH_DATA) throw new SvgError(`picture too complex (a path of ${d.length} characters)`);
    let n = counted.get(d);
    if (n === void 0) {
      n = countNumbers(d);
      counted.set(d, n);
    }
    numbers2 += n;
    if (numbers2 > MAX_PICTURE_NUMBERS) throw new SvgError(`picture too complex (more than ${MAX_PICTURE_NUMBERS} path coordinates)`);
  };
  const push = (op) => {
    if (ops.length >= MAX_PICTURE_OPS) throw new SvgError("picture too complex");
    account(op.d);
    ops.push(op);
  };
  const paintOf = (source2, opacity, style) => {
    if (source2 === null || !(opacity > 0)) return null;
    if ("ref" in source2) {
      const resolved = referencedPaint(source2.ref, ids, style.color);
      if (!resolved) return null;
      return { color: resolved.color, opacity: opacity * resolved.opacity };
    }
    return { color: source2, opacity };
  };
  const draw = (d, ctm, style, glyph, canFill = true) => {
    if (d.trim() === "") return;
    const transform = multiply(toEm, ctm);
    const fill = canFill ? paintOf(style.fill, style.fillOpacity * style.opacity, style) : null;
    if (fill) push({ type: "fill", d, transform, rule: style.fillRule, paint: fill, ...glyph ? { glyph: true } : {}, ...style.clip !== void 0 ? { clip: style.clip } : {} });
    const stroke = paintOf(style.stroke, style.strokeOpacity * style.opacity, style);
    if (stroke && style.strokeWidth > 0) {
      const strokeStyle = { width: style.strokeWidth, cap: style.cap, join: style.join, miterLimit: style.miterLimit };
      if (style.dash) {
        strokeStyle.dash = style.dash;
        strokeStyle.dashOffset = style.dashOffset;
      }
      push({ type: "stroke", d, transform, style: strokeStyle, paint: stroke, ...style.clip !== void 0 ? { clip: style.clip } : {} });
    }
  };
  const clipFor = (ref, ctm, within2) => {
    const el = ids.get(ref);
    if (!el || el.name !== "clipPath") return within2;
    const key = `${ref}
${ctm.join(",")}
${within2 ?? ""}`;
    const known = clipIds.get(key);
    if (known !== void 0) return known;
    const own = multiply(ctm, transformOf(el.attrs.transform));
    const paths = [];
    const gather = (node, m, depth2) => {
      if (depth2 > MAX_USE_DEPTH) throw new SvgError("clip path nested too deep");
      const local = multiply(m, transformOf(node.attrs.transform));
      const rule = (declared(node, "clip-rule") ?? "nonzero") === "evenodd" ? "evenodd" : "nonzero";
      if (node.name === "use") {
        const target = ids.get(hrefOf(node) ?? "");
        if (target) gather(target, multiply(local, translation(node)), depth2 + 1);
        return;
      }
      const d = shapePath(node);
      if (d !== void 0) {
        account(d);
        paths.push({ d, transform: multiply(toEm, local), rule });
        return;
      }
      if (node.name === "g") for (const child of node.children) gather(child, local, depth2 + 1);
    };
    for (const child of el.children) gather(child, own, 0);
    clips.push({ paths, ...within2 !== void 0 ? { within: within2 } : {} });
    const index = clips.length - 1;
    clipIds.set(key, index);
    return index;
  };
  const stack2 = [{ el: root2, ctm: IDENTITY, inherited: { ...INITIAL }, root: true, glyph: false, uses: 0 }];
  let visits = 0;
  while (stack2.length > 0) {
    const { el, ctm, inherited, root: isRoot, glyph, uses } = stack2.pop();
    if (++visits > MAX_VISITS) throw new SvgError("picture too complex");
    if (SKIPPED.has(el.name)) continue;
    if (REFUSED.has(el.name) && !isRoot) throw new SvgError(`<${el.name}> is not drawn`);
    if (declared(el, "display") === "none") continue;
    const m = el.name === "svg" ? ctm : multiply(ctm, transformOf(el.attrs.transform));
    const style = styleOf(el, inherited);
    const clipRef = urlOf(declared(el, "clip-path"));
    if (clipRef !== void 0) style.clip = clipFor(clipRef, m, inherited.clip);
    if (declared(el, "mask") !== void 0 && declared(el, "mask") !== "none") throw new SvgError("masks are not drawn");
    const hidden = declared(el, "visibility") === "hidden";
    switch (el.name) {
      case "svg":
      case "g":
      case "a":
      case "switch":
        for (let k = el.children.length - 1; k >= 0; k--) stack2.push({ el: el.children[k], ctm: m, inherited: style, root: false, glyph, uses });
        continue;
      case "use": {
        const id = hrefOf(el);
        const target = id === void 0 ? void 0 : ids.get(id);
        if (!target || target === el) continue;
        if (uses >= MAX_USE_DEPTH || useDepth(el, ids) > MAX_USE_DEPTH) throw new SvgError("use nested too deep");
        const isGlyph = target.name === "path" && /^g\d*-/.test(id ?? "");
        stack2.push({ el: target.name === "symbol" ? { ...target, name: "g" } : target, ctm: multiply(m, translation(el)), inherited: style, root: false, glyph: glyph || isGlyph, uses: uses + 1 });
        continue;
      }
      default: {
        const d = shapePath(el);
        if (d === void 0 || hidden) continue;
        draw(d, m, style, glyph, el.name !== "line");
      }
    }
  }
  const height2 = (baselineY - box.y) * s;
  const depth = (box.y + box.height - baselineY) * s;
  return { width: box.width * s, height: Math.max(0, height2), depth: Math.max(0, depth), ops, clips };
}
function countNumbers(d) {
  let n = 0;
  let inNumber = false;
  let dot = false;
  let exponent = false;
  for (let i2 = 0; i2 < d.length; i2++) {
    const c = d.charCodeAt(i2);
    if (c >= 48 && c <= 57) {
      if (!inNumber) {
        n++;
        inNumber = true;
        dot = false;
        exponent = false;
      }
    } else if (c === 46) {
      if (!inNumber || dot || exponent) {
        n++;
        inNumber = true;
        exponent = false;
      }
      dot = true;
    } else if ((c === 101 || c === 69) && inNumber && !exponent) {
      exponent = true;
    } else if ((c === 43 || c === 45) && inNumber && exponent && (d.charCodeAt(i2 - 1) === 101 || d.charCodeAt(i2 - 1) === 69)) {
    } else {
      inNumber = false;
    }
  }
  return n;
}
function viewBox(root2) {
  const numbers2 = (root2.attrs.viewBox ?? "").trim().split(/[\s,]+/).map(Number);
  if (numbers2.length === 4 && numbers2.every(Number.isFinite) && numbers2[2] > 0 && numbers2[3] > 0) {
    const [x2, y, width2, height3] = numbers2;
    return { x: x2, y, width: width2, height: height3 };
  }
  const width = length(root2.attrs.width);
  const height2 = length(root2.attrs.height);
  if (width && height2 && width > 0 && height2 > 0) return { x: 0, y: 0, width, height: height2 };
  throw new SvgError("the picture is empty");
}
function length(value) {
  if (value === void 0) return void 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : void 0;
}
function hrefOf(el) {
  const href = el.attrs["xlink:href"] ?? el.attrs.href;
  return href?.startsWith("#") ? href.slice(1) : void 0;
}
function useDepth(el, ids) {
  let depth = 0;
  let at = el;
  const seen = /* @__PURE__ */ new Set();
  while (at && at.name === "use") {
    if (seen.has(at)) return Infinity;
    seen.add(at);
    depth++;
    const id = hrefOf(at);
    at = id === void 0 ? void 0 : ids.get(id);
  }
  return depth;
}
function translation(el) {
  return [1, 0, 0, 1, length(el.attrs.x) ?? 0, length(el.attrs.y) ?? 0];
}
function declared(el, name) {
  const style = el.attrs.style;
  if (style !== void 0) {
    for (const declaration of style.split(";")) {
      const colon = declaration.indexOf(":");
      if (colon > 0 && declaration.slice(0, colon).trim() === name) return declaration.slice(colon + 1).trim();
    }
  }
  const value = el.attrs[name];
  return value === void 0 ? void 0 : value.trim();
}
function styleOf(el, inherited) {
  const style = { ...inherited };
  const color = declared(el, "color");
  if (color !== void 0 && color !== "inherit") style.color = parseColor(color, inherited.color) ?? inherited.color;
  const paint = (value, current) => {
    if (value === void 0 || value === "inherit") return current;
    if (value === "none") return null;
    const ref = urlOf(value);
    if (ref !== void 0) return { ref };
    if (value === "currentColor") return style.color;
    return parseColor(value, style.color) ?? current;
  };
  style.fill = paint(declared(el, "fill"), inherited.fill);
  style.stroke = paint(declared(el, "stroke"), inherited.stroke);
  const number = (name, current) => {
    const value = declared(el, name);
    if (value === void 0 || value === "inherit") return current;
    const n = value.endsWith("%") ? parseFloat(value) / 100 : parseFloat(value);
    return Number.isFinite(n) ? n : current;
  };
  style.fillOpacity = clamp01(number("fill-opacity", inherited.fillOpacity));
  style.strokeOpacity = clamp01(number("stroke-opacity", inherited.strokeOpacity));
  style.opacity = inherited.opacity * clamp01(number("opacity", 1));
  style.strokeWidth = Math.max(0, number("stroke-width", inherited.strokeWidth));
  style.miterLimit = Math.max(1, number("stroke-miterlimit", inherited.miterLimit));
  style.dashOffset = number("stroke-dashoffset", inherited.dashOffset);
  const rule = declared(el, "fill-rule");
  if (rule === "evenodd" || rule === "nonzero") style.fillRule = rule;
  const cap2 = declared(el, "stroke-linecap");
  if (cap2 === "butt" || cap2 === "round" || cap2 === "square") style.cap = cap2;
  const join2 = declared(el, "stroke-linejoin");
  if (join2 === "miter" || join2 === "round" || join2 === "bevel") style.join = join2;
  else if (join2 === "miter-clip" || join2 === "arcs") style.join = "miter";
  const dash = declared(el, "stroke-dasharray");
  if (dash !== void 0 && dash !== "inherit") {
    const lengths = dash === "none" ? [] : dash.split(/[\s,]+/).filter(Boolean).map(Number);
    const valid = lengths.length > 0 && lengths.every((n) => Number.isFinite(n) && n >= 0) && lengths.some((n) => n > 0);
    style.dash = valid ? lengths.length % 2 === 1 ? [...lengths, ...lengths] : lengths : void 0;
  }
  return style;
}
function urlOf(value) {
  const match = value === void 0 ? null : /^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(value);
  return match ? match[1] : void 0;
}
function referencedPaint(id, ids, current) {
  const el = ids.get(id);
  if (!el) return null;
  if (el.name === "linearGradient" || el.name === "radialGradient") {
    const stops = gradientStops(el, ids, 0);
    if (stops.length === 0) return null;
    if (stops.length === 1) return stops[0].paint;
    let weight = 0;
    let r = 0, g = 0, b = 0, a = 0;
    for (let i2 = 0; i2 + 1 < stops.length; i2++) {
      const w = Math.max(0, stops[i2 + 1].offset - stops[i2].offset);
      for (const stop of [stops[i2], stops[i2 + 1]]) {
        r += stop.paint.color.r * w;
        g += stop.paint.color.g * w;
        b += stop.paint.color.b * w;
        a += stop.paint.opacity * w;
      }
      weight += 2 * w;
    }
    if (!(weight > 0)) return stops[0].paint;
    return { color: { r: Math.round(r / weight), g: Math.round(g / weight), b: Math.round(b / weight) }, opacity: a / weight };
  }
  if (el.name === "pattern") {
    const first = firstColor(el, current);
    return first ? { color: first, opacity: PATTERN_OPACITY } : null;
  }
  return null;
}
function gradientStops(el, ids, depth) {
  const stops = el.children.filter((child) => child.name === "stop").map((stop) => {
    const raw = declared(stop, "offset") ?? "0";
    const offset = clamp01(raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw) || 0);
    const color = parseColor(declared(stop, "stop-color") ?? "black", BLACK) ?? BLACK;
    const opacity = clamp01(parseFloat(declared(stop, "stop-opacity") ?? "1"));
    return { offset, paint: { color, opacity: Number.isFinite(opacity) ? opacity : 1 } };
  });
  if (stops.length > 0 || depth > MAX_USE_DEPTH) return stops;
  const parent = ids.get(hrefOf(el) ?? "");
  return parent ? gradientStops(parent, ids, depth + 1) : [];
}
function firstColor(el, current) {
  for (const child of el.children) {
    for (const name of ["fill", "stroke"]) {
      const value = declared(child, name);
      if (value && value !== "none" && urlOf(value) === void 0) {
        const color = value === "currentColor" ? current : parseColor(value, current);
        if (color) return color;
      }
    }
    const nested = firstColor(child, current);
    if (nested) return nested;
  }
  return void 0;
}
function shapePath(el) {
  const a = el.attrs;
  const n = (v) => length(v) ?? 0;
  switch (el.name) {
    case "path":
      return a.d ?? "";
    case "rect": {
      const w = n(a.width);
      const h = n(a.height);
      if (!(w > 0 && h > 0)) return "";
      const x2 = n(a.x);
      const y = n(a.y);
      let rx = length(a.rx);
      let ry = length(a.ry);
      if (rx === void 0) rx = ry;
      if (ry === void 0) ry = rx;
      rx = Math.min(Math.max(0, rx ?? 0), w / 2);
      ry = Math.min(Math.max(0, ry ?? 0), h / 2);
      if (!(rx > 0 && ry > 0)) return `M${x2} ${y}H${x2 + w}V${y + h}H${x2}Z`;
      return `M${x2 + rx} ${y}H${x2 + w - rx}A${rx} ${ry} 0 0 1 ${x2 + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x2 + w - rx} ${y + h}H${x2 + rx}A${rx} ${ry} 0 0 1 ${x2} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x2 + rx} ${y}Z`;
    }
    case "circle":
    case "ellipse": {
      const cx = n(a.cx);
      const cy = n(a.cy);
      const rx = el.name === "circle" ? n(a.r) : n(a.rx);
      const ry = el.name === "circle" ? n(a.r) : n(a.ry);
      if (!(rx > 0 && ry > 0)) return "";
      return `M${cx + rx} ${cy}A${rx} ${ry} 0 1 1 ${cx - rx} ${cy}A${rx} ${ry} 0 1 1 ${cx + rx} ${cy}Z`;
    }
    case "line":
      return `M${n(a.x1)} ${n(a.y1)}L${n(a.x2)} ${n(a.y2)}`;
    case "polyline":
    case "polygon": {
      const points = (a.points ?? "").trim().split(/[\s,]+/).filter(Boolean).map(Number);
      if (points.length < 4 || points.some((v) => !Number.isFinite(v))) return "";
      let d = `M${points[0]} ${points[1]}`;
      for (let i2 = 2; i2 + 1 < points.length; i2 += 2) d += `L${points[i2]} ${points[i2 + 1]}`;
      return el.name === "polygon" ? d + "Z" : d;
    }
    default:
      return void 0;
  }
}
function multiply(p, q) {
  return [
    p[0] * q[0] + p[2] * q[1],
    p[1] * q[0] + p[3] * q[1],
    p[0] * q[2] + p[2] * q[3],
    p[1] * q[2] + p[3] * q[3],
    p[0] * q[4] + p[2] * q[5] + p[4],
    p[1] * q[4] + p[3] * q[5] + p[5]
  ];
}
function transformOf(value) {
  if (value === void 0 || value.trim() === "") return IDENTITY;
  let m = IDENTITY;
  const pattern = /\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)\s*,?/gy;
  let at = 0;
  for (let match = pattern.exec(value); match; match = pattern.exec(value)) {
    at = pattern.lastIndex;
    const args = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (args.some((v) => !Number.isFinite(v))) throw new SvgError(`unreadable transform ${match[0]}`);
    m = multiply(m, single(match[1], args));
  }
  if (value.slice(at).trim() !== "") throw new SvgError(`unreadable transform ${value}`);
  return m;
}
function single(kind, args) {
  const [a = 0, b, c] = args;
  switch (kind) {
    case "matrix":
      if (args.length !== 6) throw new SvgError("matrix() takes six numbers");
      return args;
    case "translate":
      return [1, 0, 0, 1, a, b ?? 0];
    case "scale":
      return [a, 0, 0, b ?? a, 0, 0];
    case "rotate": {
      const r = a * Math.PI / 180;
      const cos = Math.cos(r);
      const sin = Math.sin(r);
      const rot = [cos, sin, -sin, cos, 0, 0];
      if (b === void 0 || c === void 0) return rot;
      return multiply(multiply([1, 0, 0, 1, b, c], rot), [1, 0, 0, 1, -b, -c]);
    }
    case "skewX":
      return [1, 0, Math.tan(a * Math.PI / 180), 1, 0, 0];
    case "skewY":
      return [1, Math.tan(a * Math.PI / 180), 0, 1, 0, 0];
    default:
      return IDENTITY;
  }
}
function parseColor(value, current) {
  const v = value.trim().toLowerCase();
  if (v === "currentcolor") return current;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  if (hex) {
    const digits2 = hex[1];
    const full = digits2.length === 3 ? [...digits2].map((d) => d + d).join("") : digits2;
    return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
  }
  const rgb = /^rgba?\(([^)]*)\)$/.exec(v);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return void 0;
    const channel = (p) => p.endsWith("%") ? parseFloat(p) / 100 * 255 : parseFloat(p);
    const [r, g, b] = parts.slice(0, 3).map(channel);
    if (![r, g, b].every(Number.isFinite)) return void 0;
    const byte = (x2) => Math.min(255, Math.max(0, Math.round(x2)));
    return { r: byte(r), g: byte(g), b: byte(b) };
  }
  return NAMED[v];
}
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
  if (isDocument(source)) return true;
  return /\\begin\{(?:tikzpicture|tikzcd|circuitikz|axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis|ternaryaxis|picture|forest|chemfig)\}|\\(?:tikz|chemfig|schemestart|chemname|ctikzset|draw|SI|qty|si|unit|num)\b/.test(source);
}
function isDocument(source) {
  return /^(?:\s|%[^\n]*\n)*\\documentclass\b/.test(source) || /\\begin\{document\}/.test(source);
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
function confined(argv, dir, confinement, readable = []) {
  let out = [...argv];
  if (confinement.bwrap) out = ["bwrap", ...bwrapMounts(confinement.bwrap.hide, dir, readable), ...out];
  if (confinement.prlimit) out = ["prlimit", `--fsize=${MAX_OUTPUT_BYTES}`, `--cpu=${MAX_CPU_SECONDS}`, ...out];
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
  for (const next of lines2.slice(at + 1, at + 12)) {
    const context2 = /^l\.(\d+) (.*)$/.exec(next);
    if (context2) {
      const n = Number(context2[1]) - offset;
      if (n >= 1) line = n;
      if (/^Undefined control sequence$/.test(message)) {
        const token2 = /(\\[A-Za-z@]+|\\.)\s*$/.exec(context2[2])?.[1];
        if (token2) message += ` ${token2}`;
      }
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
    return { t: (__kittexLate.et?.()), l: 0 };
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
  var mbt = (__kittexLate.ln?.())(t[i1 - 1], tr, 0);
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
export{u16,shft,wbits,hTree,clim,flt,fdt,hMap,flm,fdm,wbits16,fleb,fdeb,i32,u8,revfl,revfd,slc,Coverage,assumedBackground,adaptColor,FORMAT_SOURCE,LATEX_ARGV,SvgError,XmlError,bwrapProbe,confined,diagramDocument,diagramFence,drawsPicture,dvisvgmArgv,formatArgv,formatName,isJobDir,jobDirTemplate,latexArgv,mathDocument,texEnvironment,texError,texPicture,unsafeTex};
