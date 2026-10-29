import{__esm,textChars,MAX_TEXT_CHARS,textSetter,setText,parseStylesheet,RuleIndex,FONT_PROPERTIES,fontOf,flattenSubpaths,NAMED_COLORS,init_path,init_css,init_svg_text,INITIAL_FONT,__commonJS}from'./p11.js';export*from'./p11.js';
// core/src/diagram/xml.ts
function parseXml(source) {
  let pos = 0;
  let count = 0;
  let styleText2 = 0;
  const keep = (el, text) => {
    styleText2 += text.length;
    if (styleText2 > MAX_STYLE_TEXT) fail2("style sheet too long");
    el.text = (el.text ?? "") + text;
  };
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
      if (top.name === "style") {
        keep(top, decode(source.slice(pos, lt)));
        if (source.startsWith("<![CDATA[", lt)) {
          const end = source.indexOf("]]>", lt);
          if (end >= 0) keep(top, source.slice(lt + 9, end));
        }
      } else if (top.content !== void 0) {
        const data = decode(source.slice(pos, lt));
        if (data !== "") top.content.push(data);
        if (source.startsWith("<![CDATA[", lt)) {
          const end = source.indexOf("]]>", lt);
          if (end >= 0 && end > lt + 9) top.content.push(source.slice(lt + 9, end));
        }
      }
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
      if (top.content !== void 0) top.content.push(child.el);
      if (top.content !== void 0 || child.el.name === "text") child.el.content = [];
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
var MAX_STYLE_TEXT;
var MAX_DEPTH;
var MAX_ELEMENTS;
var ENTITIES;
var NAME;
var SPACE;
var XmlError;
var init_xml = __esm({
  "core/src/diagram/xml.ts"() {
    "use strict";
    MAX_STYLE_TEXT = 256 * 1024;
    MAX_DEPTH = 2e4;
    MAX_ELEMENTS = 2e5;
    ENTITIES = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };
    NAME = /[A-Za-z_:][-A-Za-z0-9_.:]*/y;
    SPACE = /[ \t\r\n]*/y;
    XmlError = class extends Error {
    };
  }
});
// core/src/diagram/svg.ts
function readSvg(source, options3) {
  const root2 = parseXml(source);
  if (root2.name !== "svg") throw new SvgError("not an SVG document");
  const box2 = viewBox(root2, options3.userUnit === "document");
  const ids = /* @__PURE__ */ new Map();
  const all = [];
  const pending = [root2];
  for (let el = pending.pop(); el; el = pending.pop()) {
    all.push(el);
    const id = el.attrs.id;
    if (id !== void 0 && !ids.has(id)) ids.set(id, el);
    for (let i2 = el.children.length - 1; i2 >= 0; i2--) pending.push(el.children[i2]);
  }
  applyStyleSheets(all);
  const [sx, sy] = options3.userUnit === "document" ? documentScale(root2, box2) : [1, 1];
  const ex = options3.emPerUnit * sx;
  const ey = options3.emPerUnit * sy;
  const baselineY = options3.baseline === "origin" ? 0 : box2.y + box2.height;
  const toEm = [ex, 0, 0, ey, -box2.x * ex, -baselineY * ey];
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
    const alpha = source2.alpha ?? 1;
    if (!(alpha > 0)) return null;
    return { color: { r: source2.r, g: source2.g, b: source2.b }, opacity: opacity * alpha };
  };
  const draw = (d, ctm, style, glyph, canFill = true) => {
    if (d.trim() === "") return;
    const transform = multiply(toEm, ctm);
    const server = canFill && style.fill !== null && "ref" in style.fill ? style.fill.ref : void 0;
    const opacity = style.fillOpacity * style.opacity;
    const served = server !== void 0 && opacity > 0 && !glyph && serverFill(server, d, ctm, style, opacity);
    const fill = canFill && !served ? paintOf(style.fill, opacity, style) : null;
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
  let serverClips = 0;
  let patternDepth = 0;
  const shapeClip = (d, ctm, rule, within2) => {
    account(d);
    clips.push({ paths: [{ d, transform: multiply(toEm, ctm), rule }], ...within2 !== void 0 ? { within: within2 } : {} });
    serverClips++;
    return clips.length - 1;
  };
  const serverFill = (ref, d, ctm, style, opacity) => {
    const el = ids.get(ref);
    if (!el || serverClips >= MAX_SERVER_CLIPS) return false;
    if (el.name === "linearGradient" || el.name === "radialGradient") return gradientFill(el, d, ctm, style, opacity);
    if (el.name === "pattern") return patternFill(el, d, ctm, style, opacity);
    return false;
  };
  const gradientFill = (el, d, ctm, style, opacity) => {
    const stops = gradientStops(el, ids, 0);
    const box3 = pathBox(d);
    if (stops.length < 2 || !box3) return false;
    const attr = (name) => inheritedAttr(el, name, ids);
    const bounding = (attr("gradientUnits") ?? "objectBoundingBox") !== "userSpaceOnUse";
    if (bounding && !(box3.width > 0 && box3.height > 0)) return false;
    const units = bounding ? [box3.width, 0, 0, box3.height, box3.x, box3.y] : IDENTITY;
    const space = multiply(units, transformOf(attr("gradientTransform")));
    const back = invert(space);
    if (!back) return false;
    const corners = [
      apply(back, box3.x, box3.y),
      apply(back, box3.x + box3.width, box3.y),
      apply(back, box3.x, box3.y + box3.height),
      apply(back, box3.x + box3.width, box3.y + box3.height)
    ];
    const coord = (name, fallback) => {
      const value = attr(name);
      const n = value === void 0 ? NaN : value.endsWith("%") ? parseFloat(value) / 100 : parseFloat(value);
      return Number.isFinite(n) ? n : fallback;
    };
    const bands = gradientBands(stops);
    const opaque = stops.every((stop) => stop.paint.opacity >= 1);
    const shapes = [];
    if (el.name === "linearGradient") {
      const x1 = coord("x1", bounding ? 0 : box3.x);
      const y1 = coord("y1", bounding ? 0 : box3.y);
      const x2 = coord("x2", bounding ? 1 : box3.x + box3.width);
      const y2 = coord("y2", bounding ? 0 : box3.y);
      const vx = x2 - x1;
      const vy = y2 - y1;
      const length22 = vx * vx + vy * vy;
      if (!(length22 > 0)) return false;
      const ts = corners.map(([x3, y]) => ((x3 - x1) * vx + (y - y1) * vy) / length22);
      const ss = corners.map(([x3, y]) => ((y - y1) * vx - (x3 - x1) * vy) / length22);
      const tMin = Math.min(0, ...ts) - 0.01;
      const tMax = Math.max(1, ...ts) + 0.01;
      const sMin = Math.min(...ss) - 0.01;
      const sMax = Math.max(...ss) + 0.01;
      const at = (t, s) => `${fmt(x1 + t * vx - s * vy)} ${fmt(y1 + t * vy + s * vx)}`;
      bands.forEach((band, k) => {
        const from = k === 0 ? tMin : band.from;
        const to = opaque || k === bands.length - 1 ? tMax : band.to;
        shapes.push({ d: `M${at(from, sMin)}L${at(to, sMin)}L${at(to, sMax)}L${at(from, sMax)}Z`, paint: band.paint, rule: "nonzero" });
      });
    } else {
      const cx = coord("cx", bounding ? 0.5 : box3.x + box3.width / 2);
      const cy = coord("cy", bounding ? 0.5 : box3.y + box3.height / 2);
      const r = coord("r", bounding ? 0.5 : Math.hypot(box3.width, box3.height) / 2);
      const fx = coord("fx", cx);
      const fy = coord("fy", cy);
      if (!(r > 0)) return false;
      const circle2 = (t) => {
        const x2 = fx + t * (cx - fx);
        const y = fy + t * (cy - fy);
        const rt = Math.max(t * r, 1e-6);
        return `M${fmt(x2 + rt)} ${fmt(y)}A${fmt(rt)} ${fmt(rt)} 0 1 1 ${fmt(x2 - rt)} ${fmt(y)}A${fmt(rt)} ${fmt(rt)} 0 1 1 ${fmt(x2 + rt)} ${fmt(y)}Z`;
      };
      const xs = [...corners.map(([x2]) => x2), cx - r, cx + r];
      const ys = [...corners.map(([, y]) => y), cy - r, cy + r];
      const x0 = Math.min(...xs) - 0.01;
      const x1 = Math.max(...xs) + 0.01;
      const y0 = Math.min(...ys) - 0.01;
      const y1 = Math.max(...ys) + 0.01;
      const outside = `M${fmt(x0)} ${fmt(y0)}H${fmt(x1)}V${fmt(y1)}H${fmt(x0)}Z`;
      const last = bands[bands.length - 1].paint;
      if (opaque) {
        shapes.push({ d: outside, paint: last, rule: "nonzero" });
        for (let k = bands.length - 1; k >= 0; k--) shapes.push({ d: circle2(bands[k].to), paint: bands[k].paint, rule: "nonzero" });
      } else {
        shapes.push({ d: outside + circle2(1), paint: last, rule: "evenodd" });
        for (const band of bands) shapes.push({ d: band.from > 0 ? circle2(band.to) + circle2(band.from) : circle2(band.to), paint: band.paint, rule: "evenodd" });
      }
    }
    const clip = shapeClip(d, ctm, style.fillRule, style.clip);
    const transform = multiply(toEm, multiply(ctm, space));
    for (const shape of shapes) push({ type: "fill", d: shape.d, transform, rule: shape.rule, paint: { color: shape.paint.color, opacity: shape.paint.opacity * opacity }, clip });
    return true;
  };
  const patternFill = (el, d, ctm, style, opacity) => {
    const content = patternContent(el, ids);
    const box3 = pathBox(d);
    if (content.length === 0 || !box3 || patternDepth > 0) return false;
    const attr = (name) => inheritedAttr(el, name, ids);
    if (attr("viewBox") !== void 0) return false;
    const number = (name) => {
      const value = attr(name);
      const n = value === void 0 ? 0 : value.endsWith("%") ? parseFloat(value) / 100 : parseFloat(value);
      return Number.isFinite(n) ? n : 0;
    };
    let x2 = number("x");
    let y = number("y");
    let w = number("width");
    let h = number("height");
    if ((attr("patternUnits") ?? "objectBoundingBox") !== "userSpaceOnUse") {
      x2 = box3.x + x2 * box3.width;
      y = box3.y + y * box3.height;
      w *= box3.width;
      h *= box3.height;
    }
    if (!(w > 0 && h > 0)) return false;
    const tileSpace = transformOf(attr("patternTransform"));
    const back = invert(tileSpace);
    if (!back) return false;
    const corners = [apply(back, box3.x, box3.y), apply(back, box3.x + box3.width, box3.y), apply(back, box3.x, box3.y + box3.height), apply(back, box3.x + box3.width, box3.y + box3.height)];
    const i0 = Math.floor((Math.min(...corners.map(([cx]) => cx)) - x2) / w) - 1;
    const i1 = Math.ceil((Math.max(...corners.map(([cx]) => cx)) - x2) / w) + 1;
    const j0 = Math.floor((Math.min(...corners.map(([, cy]) => cy)) - y) / h) - 1;
    const j1 = Math.ceil((Math.max(...corners.map(([, cy]) => cy)) - y) / h) + 1;
    const perTile = shapesIn(content, ids);
    const total = (i1 - i0 + 1) * (j1 - j0 + 1) * perTile;
    if (!(perTile > 0) || !(total <= MAX_PATTERN_OPS) || ops.length + total > MAX_PICTURE_OPS / 2) return false;
    const contentUnits = attr("patternContentUnits") === "objectBoundingBox" ? [box3.width, 0, 0, box3.height, 0, 0] : IDENTITY;
    const inherited = { ...styleOf(el, INITIAL), clip: shapeClip(d, ctm, style.fillRule, style.clip), opacity };
    const frames = [];
    for (let j = j1; j >= j0; j--) {
      for (let i2 = i1; i2 >= i0; i2--) {
        const m = multiply(ctm, multiply(tileSpace, multiply([1, 0, 0, 1, x2 + i2 * w, y + j * h], contentUnits)));
        for (let k = content.length - 1; k >= 0; k--) frames.push({ el: content[k], ctm: m, inherited, root: false, glyph: false, uses: 0 });
      }
    }
    patternDepth++;
    try {
      walk2(frames);
    } finally {
      patternDepth--;
    }
    return true;
  };
  const typesetter = options3.text;
  let setter;
  let textCount = 0;
  const fonts = /* @__PURE__ */ new Map();
  const spanOf = (style, hidden) => ({ font: style.font, paint: paintOf(style.fill, style.fillOpacity * style.opacity, style), hidden, style });
  const childSpan = (el, parent) => {
    if (declared(el, "display") === "none") return void 0;
    const style = styleOf(el, parent.style);
    fonts.set(el, style.font);
    const visibility = declared(el, "visibility");
    return spanOf(style, visibility === void 0 || visibility === "inherit" ? parent.hidden : visibility !== "visible");
  };
  const drawText = (el, ctm, style, hidden, typeset2) => {
    fonts.set(el, style.font);
    let chars;
    try {
      chars = textChars(el, spanOf(style, hidden), childSpan);
    } catch (error) {
      if (error instanceof RangeError) throw new SvgError(`picture too complex (${error.message})`);
      throw error;
    }
    textCount += chars.length;
    if (textCount > MAX_TEXT_CHARS) throw new SvgError(`picture too complex (more than ${MAX_TEXT_CHARS} characters of text)`);
    setter ??= textSetter(typeset2);
    const transform = multiply(toEm, ctm);
    for (const fill of setText(chars, setter, (owner) => (fonts.get(owner) ?? style.font).size)) {
      push({ type: "fill", d: fill.d, transform: multiply(transform, fill.transform), rule: "nonzero", paint: fill.paint, glyph: true, ...style.clip !== void 0 ? { clip: style.clip } : {} });
    }
  };
  let visits = 0;
  const walk2 = (stack2) => {
    while (stack2.length > 0) {
      const { el, ctm, inherited, root: isRoot, glyph, uses } = stack2.pop();
      if (++visits > MAX_VISITS) throw new SvgError("picture too complex");
      if (SKIPPED.has(el.name)) continue;
      const refused = isRoot ? void 0 : REFUSED.get(el.name);
      if (refused !== void 0) throw new SvgError(refused);
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
          for (let k = el.children.length - 1; k >= 0; k--) stack2.push({ el: el.children[k], ctm: m, inherited: style, root: false, glyph, uses });
          continue;
        case "switch": {
          const chosen = el.children.find((child) => child.name !== "foreignObject" && (child.attrs.requiredExtensions ?? "").trim() === "");
          if (chosen) stack2.push({ el: chosen, ctm: m, inherited: style, root: false, glyph, uses });
          continue;
        }
        case "text":
          if (typesetter !== void 0) drawText(el, m, style, hidden || declared(el, "visibility") === "collapse", typesetter);
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
  };
  walk2([{ el: root2, ctm: IDENTITY, inherited: { ...INITIAL }, root: true, glyph: false, uses: 0 }]);
  const height2 = (baselineY - box2.y) * ey;
  const depth = (box2.y + box2.height - baselineY) * ey;
  return { width: box2.width * ex, height: Math.max(0, height2), depth: Math.max(0, depth), ops, clips };
}
function applyStyleSheets(elements2) {
  const rules = [];
  for (const el of elements2) {
    if (el.name !== "style" || el.text === void 0) continue;
    const type = el.attrs.type?.trim().toLowerCase();
    if (type === void 0 || type === "" || type === "text/css") rules.push(...parseStylesheet(el.text, rules.length));
  }
  if (rules.length === 0) return;
  const index = new RuleIndex(rules);
  const parents = /* @__PURE__ */ new Map();
  for (const el of elements2) for (const child of el.children) parents.set(child, el);
  const parentOf = (el) => parents.get(el);
  let folded = 0;
  for (const el of elements2) {
    let declarations;
    try {
      declarations = index.declarationsFor(el, parentOf);
    } catch (error) {
      if (error instanceof RangeError) throw new SvgError("picture too complex (its style sheet)");
      throw error;
    }
    if (declarations === "") continue;
    folded += declarations.length;
    if (folded > MAX_FOLDED_STYLE) throw new SvgError("picture too complex (its style sheet)");
    el.attrs.style = el.attrs.style === void 0 ? declarations : `${declarations};${el.attrs.style}`;
  }
}
function bigPoints(value) {
  const match = value === void 0 ? null : /^\s*(\+?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(px|pt|pc|mm|cm|in|q)?\s*$/i.exec(value);
  if (!match) return void 0;
  const n = Number(match[1]) * BP_PER[(match[2] ?? "px").toLowerCase()];
  return Number.isFinite(n) && n > 0 ? n : void 0;
}
function documentScale(root2, box2) {
  const width = bigPoints(root2.attrs.width);
  const height2 = bigPoints(root2.attrs.height);
  const sx = width === void 0 ? void 0 : width / box2.width;
  const sy = height2 === void 0 ? void 0 : height2 / box2.height;
  let scale2;
  if (sx === void 0 || sy === void 0) {
    const s = sx ?? sy ?? BP_PER.px;
    scale2 = [s, s];
  } else if (/^\s*none\b/.test(root2.attrs.preserveAspectRatio ?? "")) {
    scale2 = [sx, sy];
  } else {
    const s = Math.min(sx, sy);
    scale2 = [s, s];
  }
  if (!scale2.every((s) => Number.isFinite(s) && s > 0 && Number.isFinite(s * Math.max(box2.width, box2.height)))) throw new SvgError("the picture has no drawable size");
  return scale2;
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
function viewBox(root2, document) {
  const numbers2 = (root2.attrs.viewBox ?? "").trim().split(/[\s,]+/).map(Number);
  if (numbers2.length === 4 && numbers2.every(Number.isFinite) && numbers2[2] > 0 && numbers2[3] > 0) {
    const [x2, y, width2, height3] = numbers2;
    return { x: x2, y, width: width2, height: height3 };
  }
  const pixels = (value) => {
    const bp = bigPoints(value);
    return bp === void 0 ? void 0 : bp / BP_PER.px;
  };
  const width = document ? pixels(root2.attrs.width) : length(root2.attrs.width);
  const height2 = document ? pixels(root2.attrs.height) : length(root2.attrs.height);
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
    let found;
    for (const declaration of style.split(";")) {
      const colon = declaration.indexOf(":");
      if (colon > 0 && declaration.slice(0, colon).trim() === name) found = declaration.slice(colon + 1).trim();
    }
    if (found !== void 0) return found;
  }
  const value = el.attrs[name];
  return value === void 0 ? void 0 : value.trim();
}
function styleOf(el, inherited) {
  const style = { ...inherited };
  const color = declared(el, "color");
  if (color !== void 0 && color !== "inherit") style.color = parseColor(color, inherited.color) ?? inherited.color;
  const paint2 = (value, current) => {
    if (value === void 0 || value === "inherit") return current;
    if (value === "none") return null;
    const ref = urlOf(value);
    if (ref !== void 0) return { ref };
    if (value === "currentColor") return style.color;
    return parseTint(value, style.color) ?? current;
  };
  style.fill = paint2(declared(el, "fill"), inherited.fill);
  style.stroke = paint2(declared(el, "stroke"), inherited.stroke);
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
  const css = el.attrs.style;
  if (FONT_PROPERTIES.some((name) => el.attrs[name] !== void 0) || css !== void 0 && /font|text-|baseline|space/.test(css)) {
    style.font = fontOf((name) => declared(el, name), inherited.font);
  }
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
    const tint2 = parseTint(declared(stop, "stop-color") ?? "black", BLACK) ?? BLACK;
    const opacity = clamp01(parseFloat(declared(stop, "stop-opacity") ?? "1")) * (tint2.alpha ?? 1);
    return { offset, paint: { color: { r: tint2.r, g: tint2.g, b: tint2.b }, opacity } };
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
function inheritedAttr(el, name, ids) {
  let at = el;
  for (let depth = 0; at && depth <= MAX_USE_DEPTH; depth++) {
    const value = at.attrs[name];
    if (value !== void 0) return value.trim();
    at = ids.get(hrefOf(at) ?? "");
  }
  return void 0;
}
function patternContent(el, ids) {
  let at = el;
  for (let depth = 0; at && depth <= MAX_USE_DEPTH; depth++) {
    if (at.children.length > 0) return at.children;
    at = ids.get(hrefOf(at) ?? "");
  }
  return [];
}
function shapesIn(nodes, ids, depth = 0) {
  if (depth > MAX_USE_DEPTH) return 1e3;
  let n = 0;
  for (const node of nodes) {
    if (SKIPPED.has(node.name)) continue;
    if (node.name === "use") {
      const target = ids.get(hrefOf(node) ?? "");
      if (target) n += target.name === "g" || target.name === "symbol" ? shapesIn(target.children, ids, depth + 1) : shapesIn([target], ids, depth + 1);
    } else if (shapePath(node) !== void 0) n += 2;
    else n += shapesIn(node.children, ids, depth + 1);
    if (n >= 1e3) return 1e3;
  }
  return n;
}
function gradientBands(stops) {
  const cuts = [.../* @__PURE__ */ new Set([0, 1, ...stops.map((stop) => stop.offset), ...Array.from({ length: GRADIENT_BANDS }, (_, k) => k / GRADIENT_BANDS)])].sort((a, b) => a - b);
  const bands = [];
  for (let k = 0; k + 1 < cuts.length; k++) {
    const from = cuts[k];
    const to = cuts[k + 1];
    if (!(to > from)) continue;
    const paint2 = colorAt(stops, (from + to) / 2);
    const before = bands[bands.length - 1];
    if (before && sameRgb(before.paint.color, paint2.color) && Math.abs(before.paint.opacity - paint2.opacity) < 2e-3) before.to = to;
    else bands.push({ from, to, paint: paint2 });
  }
  return bands;
}
function colorAt(stops, t) {
  let previous = stops[0];
  if (t <= previous.offset) return previous.paint;
  for (const stop of stops.slice(1)) {
    const offset = Math.max(stop.offset, previous.offset);
    if (t <= offset) {
      const f = offset > previous.offset ? (t - previous.offset) / (offset - previous.offset) : 1;
      const mix = (a2, b2) => Math.round(a2 + (b2 - a2) * f);
      const a = previous.paint;
      const b = stop.paint;
      return { color: { r: mix(a.color.r, b.color.r), g: mix(a.color.g, b.color.g), b: mix(a.color.b, b.color.b) }, opacity: a.opacity + (b.opacity - a.opacity) * f };
    }
    previous = { offset, paint: stop.paint };
  }
  return previous.paint;
}
function pathBox(d) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const subpath of flattenSubpaths(d, IDENTITY, 0.01)) {
    const p = subpath.points;
    for (let i2 = 0; i2 + 1 < p.length; i2 += 2) {
      if (p[i2] < x0) x0 = p[i2];
      if (p[i2] > x1) x1 = p[i2];
      if (p[i2 + 1] < y0) y0 = p[i2 + 1];
      if (p[i2 + 1] > y1) y1 = p[i2 + 1];
    }
  }
  return x1 >= x0 && y1 >= y0 && Number.isFinite(x1 - x0 + y1 - y0) ? { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } : void 0;
}
function fmt(v) {
  return (Math.round(v * 1e5) / 1e5).toFixed(5).replace(/\.?0+$/, "");
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
function invert(m) {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  if (!(Math.abs(det) > 1e-12)) return void 0;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}
function apply(m, x2, y) {
  return [m[0] * x2 + m[2] * y + m[4], m[1] * x2 + m[3] * y + m[5]];
}
function parseColor(value, current) {
  const tint2 = parseTint(value, current);
  return tint2 && { r: tint2.r, g: tint2.g, b: tint2.b };
}
function parseTint(value, current) {
  const v = value.trim().toLowerCase();
  if (v === "currentcolor") return current;
  const pair = /^light-dark\((.*)\)$/.exec(v);
  if (pair) {
    const first = /^((?:[^,(]|\([^)]*\))*),/.exec(pair[1]);
    return first ? parseTint(first[1], current) : void 0;
  }
  if (v === "transparent") return { r: 0, g: 0, b: 0, alpha: 0 };
  const byte = (x2) => Math.min(255, Math.max(0, Math.round(x2)));
  const withAlpha = (rgb, alpha) => {
    if (alpha === void 0 || alpha >= 1) return rgb;
    return Number.isFinite(alpha) ? { ...rgb, alpha: Math.max(0, alpha) } : void 0;
  };
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(v);
  if (hex) {
    const digits2 = hex[1];
    const full = digits2.length <= 4 ? [...digits2].map((d) => d + d).join("") : digits2;
    const channel = (at) => parseInt(full.slice(at, at + 2), 16);
    return withAlpha({ r: channel(0), g: channel(2), b: channel(4) }, full.length === 8 ? channel(6) / 255 : void 0);
  }
  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(v);
  if (fn) {
    const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3 || parts.length > 4) return void 0;
    const fraction = (p) => p.endsWith("%") ? parseFloat(p) / 100 : parseFloat(p);
    const alpha = parts[3] === void 0 ? void 0 : fraction(parts[3]);
    if (fn[1].startsWith("rgb")) {
      const [r, g, b] = parts.slice(0, 3).map((p) => p.endsWith("%") ? fraction(p) * 255 : parseFloat(p));
      if (![r, g, b].every(Number.isFinite)) return void 0;
      return withAlpha({ r: byte(r), g: byte(g), b: byte(b) }, alpha);
    }
    const h = parseFloat(parts[0].replace(/deg$/, ""));
    const s = Math.min(1, Math.max(0, fraction(parts[1])));
    const l = Math.min(1, Math.max(0, fraction(parts[2])));
    if (![h, s, l].every(Number.isFinite)) return void 0;
    const at = (n) => {
      const k = ((n + h / 30) % 12 + 12) % 12;
      return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return withAlpha({ r: byte(at(0) * 255), g: byte(at(8) * 255), b: byte(at(4) * 255) }, alpha);
  }
  return NAMED_COLORS.get(v);
}
var SvgError;
var MAX_PICTURE_OPS;
var MAX_PATH_DATA;
var MAX_PICTURE_NUMBERS;
var MAX_VISITS;
var MAX_USE_DEPTH;
var PATTERN_OPACITY;
var GRADIENT_BANDS;
var MAX_PATTERN_OPS;
var MAX_SERVER_CLIPS;
var BLACK;
var INITIAL;
var IDENTITY;
var SKIPPED;
var REFUSED;
var MAX_FOLDED_STYLE;
var BP_PER;
var sameRgb;
var clamp01;
var init_svg = __esm({
  "core/src/diagram/svg.ts"() {
    "use strict";
    init_path();
    init_css();
    init_svg_text();
    init_xml();
    SvgError = class extends Error {
    };
    MAX_PICTURE_OPS = 6e4;
    MAX_PATH_DATA = 1e6;
    MAX_PICTURE_NUMBERS = 2e6;
    MAX_VISITS = 4e5;
    MAX_USE_DEPTH = 8;
    PATTERN_OPACITY = 0.35;
    GRADIENT_BANDS = 64;
    MAX_PATTERN_OPS = 6e3;
    MAX_SERVER_CLIPS = 64;
    BLACK = { r: 0, g: 0, b: 0 };
    INITIAL = {
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
      clip: void 0,
      font: INITIAL_FONT
    };
    IDENTITY = [1, 0, 0, 1, 0, 0];
    SKIPPED = /* @__PURE__ */ new Set(["defs", "clipPath", "linearGradient", "radialGradient", "pattern", "symbol", "marker", "mask", "filter", "title", "desc", "metadata", "style", "script", "foreignObject"]);
    REFUSED = /* @__PURE__ */ new Map([
      ["image", "embedded bitmaps (<image>) are not drawn"],
      ["svg", "nested <svg> documents are not drawn"],
      ["video", "<video> is not drawn"],
      ["iframe", "<iframe> is not drawn"]
    ]);
    MAX_FOLDED_STYLE = 8 * 1024 * 1024;
    BP_PER = { px: 0.75, pt: 1, pc: 12, mm: 72 / 25.4, cm: 72 / 2.54, in: 72, q: 72 / 101.6 };
    sameRgb = (a, b) => a.r === b.r && a.g === b.g && a.b === b.b;
    clamp01 = (v) => Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
  }
});
// node_modules/jpeg-js/lib/decoder.js
var require_decoder = __commonJS({
  "node_modules/jpeg-js/lib/decoder.js"(exports2, module) {
    var JpegImage = (function jpegImage() {
      "use strict";
      var dctZigZag = new Int32Array(JSON.parse(`[0,1,8,16,9,2,3,10,17,24,32,25,18,11,4,5,12,19,26,33,40,48,41,34,27,20,13,6,7,14,21,28,35,42,49,56,57,50,43,36,29,22,15,23,30,37,44,51,58,59,52,45,38,31,39,46,53,60,61,54,47,55,62,63]`));
      var dctCos1 = 4017;
      var dctSin1 = 799;
      var dctCos3 = 3406;
      var dctSin3 = 2276;
      var dctCos6 = 1567;
      var dctSin6 = 3784;
      var dctSqrt2 = 5793;
      var dctSqrt1d2 = 2896;
      function constructor() {
      }
      function buildHuffmanTable(codeLengths, values) {
        var k = 0, code = [], i2, j, length4 = 16;
        while (length4 > 0 && !codeLengths[length4 - 1])
          length4--;
        code.push({ children: [], index: 0 });
        var p = code[0], q;
        for (i2 = 0; i2 < length4; i2++) {
          for (j = 0; j < codeLengths[i2]; j++) {
            p = code.pop();
            p.children[p.index] = values[k];
            while (p.index > 0) {
              if (code.length === 0)
                throw new Error("Could not recreate Huffman Table");
              p = code.pop();
            }
            p.index++;
            code.push(p);
            while (code.length <= i2) {
              code.push(q = { children: [], index: 0 });
              p.children[p.index] = q.children;
              p = q;
            }
            k++;
          }
          if (i2 + 1 < length4) {
            code.push(q = { children: [], index: 0 });
            p.children[p.index] = q.children;
            p = q;
          }
        }
        return code[0].children;
      }
      function decodeScan(data, offset, frame2, components, resetInterval, spectralStart, spectralEnd, successivePrev, successive, opts) {
        var precision = frame2.precision;
        var samplesPerLine = frame2.samplesPerLine;
        var scanLines = frame2.scanLines;
        var mcusPerLine = frame2.mcusPerLine;
        var progressive = frame2.progressive;
        var maxH = frame2.maxH, maxV = frame2.maxV;
        var startOffset = offset, bitsData = 0, bitsCount = 0;
        function readBit() {
          if (bitsCount > 0) {
            bitsCount--;
            return bitsData >> bitsCount & 1;
          }
          bitsData = data[offset++];
          if (bitsData == 255) {
            var nextByte = data[offset++];
            if (nextByte) {
              throw new Error("unexpected marker: " + (bitsData << 8 | nextByte).toString(16));
            }
          }
          bitsCount = 7;
          return bitsData >>> 7;
        }
        function decodeHuffman(tree) {
          var node = tree, bit;
          while ((bit = readBit()) !== null) {
            node = node[bit];
            if (typeof node === "number")
              return node;
            if (typeof node !== "object")
              throw new Error("invalid huffman sequence");
          }
          return null;
        }
        function receive(length4) {
          var n2 = 0;
          while (length4 > 0) {
            var bit = readBit();
            if (bit === null) return;
            n2 = n2 << 1 | bit;
            length4--;
          }
          return n2;
        }
        function receiveAndExtend(length4) {
          var n2 = receive(length4);
          if (n2 >= 1 << length4 - 1)
            return n2;
          return n2 + (-1 << length4) + 1;
        }
        function decodeBaseline(component2, zz) {
          var t = decodeHuffman(component2.huffmanTableDC);
          var diff = t === 0 ? 0 : receiveAndExtend(t);
          zz[0] = component2.pred += diff;
          var k2 = 1;
          while (k2 < 64) {
            var rs = decodeHuffman(component2.huffmanTableAC);
            var s = rs & 15, r = rs >> 4;
            if (s === 0) {
              if (r < 15)
                break;
              k2 += 16;
              continue;
            }
            k2 += r;
            var z = dctZigZag[k2];
            zz[z] = receiveAndExtend(s);
            k2++;
          }
        }
        function decodeDCFirst(component2, zz) {
          var t = decodeHuffman(component2.huffmanTableDC);
          var diff = t === 0 ? 0 : receiveAndExtend(t) << successive;
          zz[0] = component2.pred += diff;
        }
        function decodeDCSuccessive(component2, zz) {
          zz[0] |= readBit() << successive;
        }
        var eobrun = 0;
        function decodeACFirst(component2, zz) {
          if (eobrun > 0) {
            eobrun--;
            return;
          }
          var k2 = spectralStart, e = spectralEnd;
          while (k2 <= e) {
            var rs = decodeHuffman(component2.huffmanTableAC);
            var s = rs & 15, r = rs >> 4;
            if (s === 0) {
              if (r < 15) {
                eobrun = receive(r) + (1 << r) - 1;
                break;
              }
              k2 += 16;
              continue;
            }
            k2 += r;
            var z = dctZigZag[k2];
            zz[z] = receiveAndExtend(s) * (1 << successive);
            k2++;
          }
        }
        var successiveACState = 0, successiveACNextValue;
        function decodeACSuccessive(component2, zz) {
          var k2 = spectralStart, e = spectralEnd, r = 0;
          while (k2 <= e) {
            var z = dctZigZag[k2];
            var direction = zz[z] < 0 ? -1 : 1;
            switch (successiveACState) {
              case 0:
                var rs = decodeHuffman(component2.huffmanTableAC);
                var s = rs & 15, r = rs >> 4;
                if (s === 0) {
                  if (r < 15) {
                    eobrun = receive(r) + (1 << r);
                    successiveACState = 4;
                  } else {
                    r = 16;
                    successiveACState = 1;
                  }
                } else {
                  if (s !== 1)
                    throw new Error("invalid ACn encoding");
                  successiveACNextValue = receiveAndExtend(s);
                  successiveACState = r ? 2 : 3;
                }
                continue;
              case 1:
              // skipping r zero items
              case 2:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                else {
                  r--;
                  if (r === 0)
                    successiveACState = successiveACState == 2 ? 3 : 0;
                }
                break;
              case 3:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                else {
                  zz[z] = successiveACNextValue << successive;
                  successiveACState = 0;
                }
                break;
              case 4:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                break;
            }
            k2++;
          }
          if (successiveACState === 4) {
            eobrun--;
            if (eobrun === 0)
              successiveACState = 0;
          }
        }
        function decodeMcu(component2, decode4, mcu2, row, col) {
          var mcuRow = mcu2 / mcusPerLine | 0;
          var mcuCol = mcu2 % mcusPerLine;
          var blockRow = mcuRow * component2.v + row;
          var blockCol = mcuCol * component2.h + col;
          if (component2.blocks[blockRow] === void 0 && opts.tolerantDecoding)
            return;
          decode4(component2, component2.blocks[blockRow][blockCol]);
        }
        function decodeBlock(component2, decode4, mcu2) {
          var blockRow = mcu2 / component2.blocksPerLine | 0;
          var blockCol = mcu2 % component2.blocksPerLine;
          if (component2.blocks[blockRow] === void 0 && opts.tolerantDecoding)
            return;
          decode4(component2, component2.blocks[blockRow][blockCol]);
        }
        var componentsLength = components.length;
        var component, i2, j, k, n;
        var decodeFn;
        if (progressive) {
          if (spectralStart === 0)
            decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
          else
            decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
        } else {
          decodeFn = decodeBaseline;
        }
        var mcu = 0, marker;
        var mcuExpected;
        if (componentsLength == 1) {
          mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
        } else {
          mcuExpected = mcusPerLine * frame2.mcusPerColumn;
        }
        if (!resetInterval) resetInterval = mcuExpected;
        var h, v;
        while (mcu < mcuExpected) {
          for (i2 = 0; i2 < componentsLength; i2++)
            components[i2].pred = 0;
          eobrun = 0;
          if (componentsLength == 1) {
            component = components[0];
            for (n = 0; n < resetInterval; n++) {
              decodeBlock(component, decodeFn, mcu);
              mcu++;
            }
          } else {
            for (n = 0; n < resetInterval; n++) {
              for (i2 = 0; i2 < componentsLength; i2++) {
                component = components[i2];
                h = component.h;
                v = component.v;
                for (j = 0; j < v; j++) {
                  for (k = 0; k < h; k++) {
                    decodeMcu(component, decodeFn, mcu, j, k);
                  }
                }
              }
              mcu++;
              if (mcu === mcuExpected) break;
            }
          }
          if (mcu === mcuExpected) {
            do {
              if (data[offset] === 255) {
                if (data[offset + 1] !== 0) {
                  break;
                }
              }
              offset += 1;
            } while (offset < data.length - 2);
          }
          bitsCount = 0;
          marker = data[offset] << 8 | data[offset + 1];
          if (marker < 65280) {
            throw new Error("marker was not found");
          }
          if (marker >= 65488 && marker <= 65495) {
            offset += 2;
          } else
            break;
        }
        return offset - startOffset;
      }
      function buildComponentData(frame2, component) {
        var lines2 = [];
        var blocksPerLine = component.blocksPerLine;
        var blocksPerColumn = component.blocksPerColumn;
        var samplesPerLine = blocksPerLine << 3;
        var R = new Int32Array(64), r = new Uint8Array(64);
        function quantizeAndInverse(zz, dataOut, dataIn) {
          var qt = component.quantizationTable;
          var v0, v1, v2, v3, v4, v5, v6, v7, t;
          var p = dataIn;
          var i3;
          for (i3 = 0; i3 < 64; i3++)
            p[i3] = zz[i3] * qt[i3];
          for (i3 = 0; i3 < 8; ++i3) {
            var row = 8 * i3;
            if (p[1 + row] == 0 && p[2 + row] == 0 && p[3 + row] == 0 && p[4 + row] == 0 && p[5 + row] == 0 && p[6 + row] == 0 && p[7 + row] == 0) {
              t = dctSqrt2 * p[0 + row] + 512 >> 10;
              p[0 + row] = t;
              p[1 + row] = t;
              p[2 + row] = t;
              p[3 + row] = t;
              p[4 + row] = t;
              p[5 + row] = t;
              p[6 + row] = t;
              p[7 + row] = t;
              continue;
            }
            v0 = dctSqrt2 * p[0 + row] + 128 >> 8;
            v1 = dctSqrt2 * p[4 + row] + 128 >> 8;
            v2 = p[2 + row];
            v3 = p[6 + row];
            v4 = dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128 >> 8;
            v7 = dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128 >> 8;
            v5 = p[3 + row] << 4;
            v6 = p[5 + row] << 4;
            t = v0 - v1 + 1 >> 1;
            v0 = v0 + v1 + 1 >> 1;
            v1 = t;
            t = v2 * dctSin6 + v3 * dctCos6 + 128 >> 8;
            v2 = v2 * dctCos6 - v3 * dctSin6 + 128 >> 8;
            v3 = t;
            t = v4 - v6 + 1 >> 1;
            v4 = v4 + v6 + 1 >> 1;
            v6 = t;
            t = v7 + v5 + 1 >> 1;
            v5 = v7 - v5 + 1 >> 1;
            v7 = t;
            t = v0 - v3 + 1 >> 1;
            v0 = v0 + v3 + 1 >> 1;
            v3 = t;
            t = v1 - v2 + 1 >> 1;
            v1 = v1 + v2 + 1 >> 1;
            v2 = t;
            t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
            v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
            v7 = t;
            t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
            v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
            v6 = t;
            p[0 + row] = v0 + v7;
            p[7 + row] = v0 - v7;
            p[1 + row] = v1 + v6;
            p[6 + row] = v1 - v6;
            p[2 + row] = v2 + v5;
            p[5 + row] = v2 - v5;
            p[3 + row] = v3 + v4;
            p[4 + row] = v3 - v4;
          }
          for (i3 = 0; i3 < 8; ++i3) {
            var col = i3;
            if (p[1 * 8 + col] == 0 && p[2 * 8 + col] == 0 && p[3 * 8 + col] == 0 && p[4 * 8 + col] == 0 && p[5 * 8 + col] == 0 && p[6 * 8 + col] == 0 && p[7 * 8 + col] == 0) {
              t = dctSqrt2 * dataIn[i3 + 0] + 8192 >> 14;
              p[0 * 8 + col] = t;
              p[1 * 8 + col] = t;
              p[2 * 8 + col] = t;
              p[3 * 8 + col] = t;
              p[4 * 8 + col] = t;
              p[5 * 8 + col] = t;
              p[6 * 8 + col] = t;
              p[7 * 8 + col] = t;
              continue;
            }
            v0 = dctSqrt2 * p[0 * 8 + col] + 2048 >> 12;
            v1 = dctSqrt2 * p[4 * 8 + col] + 2048 >> 12;
            v2 = p[2 * 8 + col];
            v3 = p[6 * 8 + col];
            v4 = dctSqrt1d2 * (p[1 * 8 + col] - p[7 * 8 + col]) + 2048 >> 12;
            v7 = dctSqrt1d2 * (p[1 * 8 + col] + p[7 * 8 + col]) + 2048 >> 12;
            v5 = p[3 * 8 + col];
            v6 = p[5 * 8 + col];
            t = v0 - v1 + 1 >> 1;
            v0 = v0 + v1 + 1 >> 1;
            v1 = t;
            t = v2 * dctSin6 + v3 * dctCos6 + 2048 >> 12;
            v2 = v2 * dctCos6 - v3 * dctSin6 + 2048 >> 12;
            v3 = t;
            t = v4 - v6 + 1 >> 1;
            v4 = v4 + v6 + 1 >> 1;
            v6 = t;
            t = v7 + v5 + 1 >> 1;
            v5 = v7 - v5 + 1 >> 1;
            v7 = t;
            t = v0 - v3 + 1 >> 1;
            v0 = v0 + v3 + 1 >> 1;
            v3 = t;
            t = v1 - v2 + 1 >> 1;
            v1 = v1 + v2 + 1 >> 1;
            v2 = t;
            t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
            v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
            v7 = t;
            t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
            v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
            v6 = t;
            p[0 * 8 + col] = v0 + v7;
            p[7 * 8 + col] = v0 - v7;
            p[1 * 8 + col] = v1 + v6;
            p[6 * 8 + col] = v1 - v6;
            p[2 * 8 + col] = v2 + v5;
            p[5 * 8 + col] = v2 - v5;
            p[3 * 8 + col] = v3 + v4;
            p[4 * 8 + col] = v3 - v4;
          }
          for (i3 = 0; i3 < 64; ++i3) {
            var sample2 = 128 + (p[i3] + 8 >> 4);
            dataOut[i3] = sample2 < 0 ? 0 : sample2 > 255 ? 255 : sample2;
          }
        }
        requestMemoryAllocation(samplesPerLine * blocksPerColumn * 8);
        var i2, j;
        for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
          var scanLine = blockRow << 3;
          for (i2 = 0; i2 < 8; i2++)
            lines2.push(new Uint8Array(samplesPerLine));
          for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
            quantizeAndInverse(component.blocks[blockRow][blockCol], r, R);
            var offset = 0, sample = blockCol << 3;
            for (j = 0; j < 8; j++) {
              var line = lines2[scanLine + j];
              for (i2 = 0; i2 < 8; i2++)
                line[sample + i2] = r[offset++];
            }
          }
        }
        return lines2;
      }
      function clampTo8bit(a) {
        return a < 0 ? 0 : a > 255 ? 255 : a;
      }
      constructor.prototype = {
        load: function load(path) {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", path, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = (function() {
            var data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
            this.parse(data);
            if (this.onload)
              this.onload();
          }).bind(this);
          xhr.send(null);
        },
        parse: function parse(data) {
          var maxResolutionInPixels = this.opts.maxResolutionInMP * 1e3 * 1e3;
          var offset = 0, length4 = data.length;
          function readUint16() {
            var value = data[offset] << 8 | data[offset + 1];
            offset += 2;
            return value;
          }
          function readDataBlock() {
            var length5 = readUint16();
            var array = data.subarray(offset, offset + length5 - 2);
            offset += array.length;
            return array;
          }
          function prepareComponents(frame3) {
            var maxH2 = 1, maxV2 = 1;
            var component2, componentId2;
            for (componentId2 in frame3.components) {
              if (frame3.components.hasOwnProperty(componentId2)) {
                component2 = frame3.components[componentId2];
                if (maxH2 < component2.h) maxH2 = component2.h;
                if (maxV2 < component2.v) maxV2 = component2.v;
              }
            }
            var mcusPerLine = Math.ceil(frame3.samplesPerLine / 8 / maxH2);
            var mcusPerColumn = Math.ceil(frame3.scanLines / 8 / maxV2);
            for (componentId2 in frame3.components) {
              if (frame3.components.hasOwnProperty(componentId2)) {
                component2 = frame3.components[componentId2];
                var blocksPerLine = Math.ceil(Math.ceil(frame3.samplesPerLine / 8) * component2.h / maxH2);
                var blocksPerColumn = Math.ceil(Math.ceil(frame3.scanLines / 8) * component2.v / maxV2);
                var blocksPerLineForMcu = mcusPerLine * component2.h;
                var blocksPerColumnForMcu = mcusPerColumn * component2.v;
                var blocksToAllocate = blocksPerColumnForMcu * blocksPerLineForMcu;
                var blocks = [];
                requestMemoryAllocation(blocksToAllocate * 256);
                for (var i3 = 0; i3 < blocksPerColumnForMcu; i3++) {
                  var row = [];
                  for (var j2 = 0; j2 < blocksPerLineForMcu; j2++)
                    row.push(new Int32Array(64));
                  blocks.push(row);
                }
                component2.blocksPerLine = blocksPerLine;
                component2.blocksPerColumn = blocksPerColumn;
                component2.blocks = blocks;
              }
            }
            frame3.maxH = maxH2;
            frame3.maxV = maxV2;
            frame3.mcusPerLine = mcusPerLine;
            frame3.mcusPerColumn = mcusPerColumn;
          }
          var jfif = null;
          var adobe = null;
          var pixels = null;
          var frame2, resetInterval;
          var quantizationTables = [], frames = [];
          var huffmanTablesAC = [], huffmanTablesDC = [];
          var fileMarker = readUint16();
          var malformedDataOffset = -1;
          this.comments = [];
          if (fileMarker != 65496) {
            throw new Error("SOI not found");
          }
          fileMarker = readUint16();
          while (fileMarker != 65497) {
            var i2, j, l;
            switch (fileMarker) {
              case 65280:
                break;
              case 65504:
              // APP0 (Application Specific)
              case 65505:
              // APP1
              case 65506:
              // APP2
              case 65507:
              // APP3
              case 65508:
              // APP4
              case 65509:
              // APP5
              case 65510:
              // APP6
              case 65511:
              // APP7
              case 65512:
              // APP8
              case 65513:
              // APP9
              case 65514:
              // APP10
              case 65515:
              // APP11
              case 65516:
              // APP12
              case 65517:
              // APP13
              case 65518:
              // APP14
              case 65519:
              // APP15
              case 65534:
                var appData = readDataBlock();
                if (fileMarker === 65534) {
                  var comment = String.fromCharCode.apply(null, appData);
                  this.comments.push(comment);
                }
                if (fileMarker === 65504) {
                  if (appData[0] === 74 && appData[1] === 70 && appData[2] === 73 && appData[3] === 70 && appData[4] === 0) {
                    jfif = {
                      version: { major: appData[5], minor: appData[6] },
                      densityUnits: appData[7],
                      xDensity: appData[8] << 8 | appData[9],
                      yDensity: appData[10] << 8 | appData[11],
                      thumbWidth: appData[12],
                      thumbHeight: appData[13],
                      thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
                    };
                  }
                }
                if (fileMarker === 65505) {
                  if (appData[0] === 69 && appData[1] === 120 && appData[2] === 105 && appData[3] === 102 && appData[4] === 0) {
                    this.exifBuffer = appData.subarray(5, appData.length);
                  }
                }
                if (fileMarker === 65518) {
                  if (appData[0] === 65 && appData[1] === 100 && appData[2] === 111 && appData[3] === 98 && appData[4] === 101 && appData[5] === 0) {
                    adobe = {
                      version: appData[6],
                      flags0: appData[7] << 8 | appData[8],
                      flags1: appData[9] << 8 | appData[10],
                      transformCode: appData[11]
                    };
                  }
                }
                break;
              case 65499:
                var quantizationTablesLength = readUint16();
                var quantizationTablesEnd = quantizationTablesLength + offset - 2;
                while (offset < quantizationTablesEnd) {
                  var quantizationTableSpec = data[offset++];
                  requestMemoryAllocation(64 * 4);
                  var tableData = new Int32Array(64);
                  if (quantizationTableSpec >> 4 === 0) {
                    for (j = 0; j < 64; j++) {
                      var z = dctZigZag[j];
                      tableData[z] = data[offset++];
                    }
                  } else if (quantizationTableSpec >> 4 === 1) {
                    for (j = 0; j < 64; j++) {
                      var z = dctZigZag[j];
                      tableData[z] = readUint16();
                    }
                  } else
                    throw new Error("DQT: invalid table spec");
                  quantizationTables[quantizationTableSpec & 15] = tableData;
                }
                break;
              case 65472:
              // SOF0 (Start of Frame, Baseline DCT)
              case 65473:
              // SOF1 (Start of Frame, Extended DCT)
              case 65474:
                readUint16();
                frame2 = {};
                frame2.extended = fileMarker === 65473;
                frame2.progressive = fileMarker === 65474;
                frame2.precision = data[offset++];
                frame2.scanLines = readUint16();
                frame2.samplesPerLine = readUint16();
                frame2.components = {};
                frame2.componentsOrder = [];
                var pixelsInFrame = frame2.scanLines * frame2.samplesPerLine;
                if (pixelsInFrame > maxResolutionInPixels) {
                  var exceededAmount = Math.ceil((pixelsInFrame - maxResolutionInPixels) / 1e6);
                  throw new Error(`maxResolutionInMP limit exceeded by ${exceededAmount}MP`);
                }
                var componentsCount = data[offset++], componentId;
                var maxH = 0, maxV = 0;
                for (i2 = 0; i2 < componentsCount; i2++) {
                  componentId = data[offset];
                  var h = data[offset + 1] >> 4;
                  var v = data[offset + 1] & 15;
                  var qId = data[offset + 2];
                  if (h <= 0 || v <= 0) {
                    throw new Error("Invalid sampling factor, expected values above 0");
                  }
                  frame2.componentsOrder.push(componentId);
                  frame2.components[componentId] = {
                    h,
                    v,
                    quantizationIdx: qId
                  };
                  offset += 3;
                }
                prepareComponents(frame2);
                frames.push(frame2);
                break;
              case 65476:
                var huffmanLength = readUint16();
                for (i2 = 2; i2 < huffmanLength; ) {
                  var huffmanTableSpec = data[offset++];
                  var codeLengths = new Uint8Array(16);
                  var codeLengthSum = 0;
                  for (j = 0; j < 16; j++, offset++) {
                    codeLengthSum += codeLengths[j] = data[offset];
                  }
                  requestMemoryAllocation(16 + codeLengthSum);
                  var huffmanValues = new Uint8Array(codeLengthSum);
                  for (j = 0; j < codeLengthSum; j++, offset++)
                    huffmanValues[j] = data[offset];
                  i2 += 17 + codeLengthSum;
                  (huffmanTableSpec >> 4 === 0 ? huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] = buildHuffmanTable(codeLengths, huffmanValues);
                }
                break;
              case 65501:
                readUint16();
                resetInterval = readUint16();
                break;
              case 65500:
                readUint16();
                readUint16();
                break;
              case 65498:
                var scanLength = readUint16();
                var selectorsCount = data[offset++];
                var components = [], component;
                for (i2 = 0; i2 < selectorsCount; i2++) {
                  component = frame2.components[data[offset++]];
                  var tableSpec = data[offset++];
                  component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
                  component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
                  components.push(component);
                }
                var spectralStart = data[offset++];
                var spectralEnd = data[offset++];
                var successiveApproximation = data[offset++];
                var processed = decodeScan(
                  data,
                  offset,
                  frame2,
                  components,
                  resetInterval,
                  spectralStart,
                  spectralEnd,
                  successiveApproximation >> 4,
                  successiveApproximation & 15,
                  this.opts
                );
                offset += processed;
                break;
              case 65535:
                if (data[offset] !== 255) {
                  offset--;
                }
                break;
              default:
                if (data[offset - 3] == 255 && data[offset - 2] >= 192 && data[offset - 2] <= 254) {
                  offset -= 3;
                  break;
                } else if (fileMarker === 224 || fileMarker == 225) {
                  if (malformedDataOffset !== -1) {
                    throw new Error(`first unknown JPEG marker at offset ${malformedDataOffset.toString(16)}, second unknown JPEG marker ${fileMarker.toString(16)} at offset ${(offset - 1).toString(16)}`);
                  }
                  malformedDataOffset = offset - 1;
                  const nextOffset = readUint16();
                  if (data[offset + nextOffset - 2] === 255) {
                    offset += nextOffset - 2;
                    break;
                  }
                }
                throw new Error("unknown JPEG marker " + fileMarker.toString(16));
            }
            fileMarker = readUint16();
          }
          if (frames.length != 1)
            throw new Error("only single frame JPEGs supported");
          for (var i2 = 0; i2 < frames.length; i2++) {
            var cp = frames[i2].components;
            for (var j in cp) {
              cp[j].quantizationTable = quantizationTables[cp[j].quantizationIdx];
              delete cp[j].quantizationIdx;
            }
          }
          this.width = frame2.samplesPerLine;
          this.height = frame2.scanLines;
          this.jfif = jfif;
          this.adobe = adobe;
          this.components = [];
          for (var i2 = 0; i2 < frame2.componentsOrder.length; i2++) {
            var component = frame2.components[frame2.componentsOrder[i2]];
            this.components.push({
              lines: buildComponentData(frame2, component),
              scaleX: component.h / frame2.maxH,
              scaleY: component.v / frame2.maxV
            });
          }
        },
        getData: function getData(width, height2) {
          var scaleX = this.width / width, scaleY = this.height / height2;
          var component1, component2, component3, component4;
          var component1Line, component2Line, component3Line, component4Line;
          var x2, y;
          var offset = 0;
          var Y, Cb, Cr, K, C, M, Ye, R, G, B;
          var colorTransform;
          var dataLength = width * height2 * this.components.length;
          requestMemoryAllocation(dataLength);
          var data = new Uint8Array(dataLength);
          switch (this.components.length) {
            case 1:
              component1 = this.components[0];
              for (y = 0; y < height2; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                for (x2 = 0; x2 < width; x2++) {
                  Y = component1Line[0 | x2 * component1.scaleX * scaleX];
                  data[offset++] = Y;
                }
              }
              break;
            case 2:
              component1 = this.components[0];
              component2 = this.components[1];
              for (y = 0; y < height2; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                for (x2 = 0; x2 < width; x2++) {
                  Y = component1Line[0 | x2 * component1.scaleX * scaleX];
                  data[offset++] = Y;
                  Y = component2Line[0 | x2 * component2.scaleX * scaleX];
                  data[offset++] = Y;
                }
              }
              break;
            case 3:
              colorTransform = true;
              if (this.adobe && this.adobe.transformCode)
                colorTransform = true;
              else if (typeof this.opts.colorTransform !== "undefined")
                colorTransform = !!this.opts.colorTransform;
              component1 = this.components[0];
              component2 = this.components[1];
              component3 = this.components[2];
              for (y = 0; y < height2; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
                for (x2 = 0; x2 < width; x2++) {
                  if (!colorTransform) {
                    R = component1Line[0 | x2 * component1.scaleX * scaleX];
                    G = component2Line[0 | x2 * component2.scaleX * scaleX];
                    B = component3Line[0 | x2 * component3.scaleX * scaleX];
                  } else {
                    Y = component1Line[0 | x2 * component1.scaleX * scaleX];
                    Cb = component2Line[0 | x2 * component2.scaleX * scaleX];
                    Cr = component3Line[0 | x2 * component3.scaleX * scaleX];
                    R = clampTo8bit(Y + 1.402 * (Cr - 128));
                    G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                    B = clampTo8bit(Y + 1.772 * (Cb - 128));
                  }
                  data[offset++] = R;
                  data[offset++] = G;
                  data[offset++] = B;
                }
              }
              break;
            case 4:
              if (!this.adobe)
                throw new Error("Unsupported color mode (4 components)");
              colorTransform = false;
              if (this.adobe && this.adobe.transformCode)
                colorTransform = true;
              else if (typeof this.opts.colorTransform !== "undefined")
                colorTransform = !!this.opts.colorTransform;
              component1 = this.components[0];
              component2 = this.components[1];
              component3 = this.components[2];
              component4 = this.components[3];
              for (y = 0; y < height2; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
                component4Line = component4.lines[0 | y * component4.scaleY * scaleY];
                for (x2 = 0; x2 < width; x2++) {
                  if (!colorTransform) {
                    C = component1Line[0 | x2 * component1.scaleX * scaleX];
                    M = component2Line[0 | x2 * component2.scaleX * scaleX];
                    Ye = component3Line[0 | x2 * component3.scaleX * scaleX];
                    K = component4Line[0 | x2 * component4.scaleX * scaleX];
                  } else {
                    Y = component1Line[0 | x2 * component1.scaleX * scaleX];
                    Cb = component2Line[0 | x2 * component2.scaleX * scaleX];
                    Cr = component3Line[0 | x2 * component3.scaleX * scaleX];
                    K = component4Line[0 | x2 * component4.scaleX * scaleX];
                    C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
                    M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                    Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
                  }
                  data[offset++] = 255 - C;
                  data[offset++] = 255 - M;
                  data[offset++] = 255 - Ye;
                  data[offset++] = 255 - K;
                }
              }
              break;
            default:
              throw new Error("Unsupported color mode");
          }
          return data;
        },
        copyToImageData: function copyToImageData(imageData, formatAsRGBA) {
          var width = imageData.width, height2 = imageData.height;
          var imageDataArray = imageData.data;
          var data = this.getData(width, height2);
          var i2 = 0, j = 0, x2, y;
          var Y, K, C, M, R, G, B;
          switch (this.components.length) {
            case 1:
              for (y = 0; y < height2; y++) {
                for (x2 = 0; x2 < width; x2++) {
                  Y = data[i2++];
                  imageDataArray[j++] = Y;
                  imageDataArray[j++] = Y;
                  imageDataArray[j++] = Y;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            case 3:
              for (y = 0; y < height2; y++) {
                for (x2 = 0; x2 < width; x2++) {
                  R = data[i2++];
                  G = data[i2++];
                  B = data[i2++];
                  imageDataArray[j++] = R;
                  imageDataArray[j++] = G;
                  imageDataArray[j++] = B;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            case 4:
              for (y = 0; y < height2; y++) {
                for (x2 = 0; x2 < width; x2++) {
                  C = data[i2++];
                  M = data[i2++];
                  Y = data[i2++];
                  K = data[i2++];
                  R = 255 - clampTo8bit(C * (1 - K / 255) + K);
                  G = 255 - clampTo8bit(M * (1 - K / 255) + K);
                  B = 255 - clampTo8bit(Y * (1 - K / 255) + K);
                  imageDataArray[j++] = R;
                  imageDataArray[j++] = G;
                  imageDataArray[j++] = B;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            default:
              throw new Error("Unsupported color mode");
          }
        }
      };
      var totalBytesAllocated = 0;
      var maxMemoryUsageBytes = 0;
      function requestMemoryAllocation(increaseAmount = 0) {
        var totalMemoryImpactBytes = totalBytesAllocated + increaseAmount;
        if (totalMemoryImpactBytes > maxMemoryUsageBytes) {
          var exceededAmount = Math.ceil((totalMemoryImpactBytes - maxMemoryUsageBytes) / 1024 / 1024);
          throw new Error(`maxMemoryUsageInMB limit exceeded by at least ${exceededAmount}MB`);
        }
        totalBytesAllocated = totalMemoryImpactBytes;
      }
      constructor.resetMaxMemoryUsage = function(maxMemoryUsageBytes_) {
        totalBytesAllocated = 0;
        maxMemoryUsageBytes = maxMemoryUsageBytes_;
      };
      constructor.getBytesAllocated = function() {
        return totalBytesAllocated;
      };
      constructor.requestMemoryAllocation = requestMemoryAllocation;
      return constructor;
    })();
    if (typeof module !== "undefined") {
      module.exports = decode3;
    } else if (false) {
      (void 0)["jpeg-js"] = (void 0)["jpeg-js"] || {};
      (void 0)["jpeg-js"].decode = decode3;
    }
    function decode3(jpegData, userOpts = {}) {
      var defaultOpts = {
        // "undefined" means "Choose whether to transform colors based on the image’s color model."
        colorTransform: void 0,
        useTArray: false,
        formatAsRGBA: true,
        tolerantDecoding: true,
        maxResolutionInMP: 100,
        // Don't decode more than 100 megapixels
        maxMemoryUsageInMB: 512
        // Don't decode if memory footprint is more than 512MB
      };
      var opts = { ...defaultOpts, ...userOpts };
      var arr = new Uint8Array(jpegData);
      var decoder = new JpegImage();
      decoder.opts = opts;
      JpegImage.resetMaxMemoryUsage(opts.maxMemoryUsageInMB * 1024 * 1024);
      decoder.parse(arr);
      var channels = opts.formatAsRGBA ? 4 : 3;
      var bytesNeeded = decoder.width * decoder.height * channels;
      try {
        JpegImage.requestMemoryAllocation(bytesNeeded);
        var image = {
          width: decoder.width,
          height: decoder.height,
          exifBuffer: decoder.exifBuffer,
          data: opts.useTArray ? new Uint8Array(bytesNeeded) : Buffer.alloc(bytesNeeded)
        };
        if (decoder.comments.length > 0) {
          image["comments"] = decoder.comments;
        }
      } catch (err2) {
        if (err2 instanceof RangeError) {
          throw new Error("Could not allocate enough memory for the image. Required: " + bytesNeeded);
        }
        if (err2 instanceof ReferenceError) {
          if (err2.message === "Buffer is not defined") {
            throw new Error("Buffer is not globally defined in this environment. Consider setting useTArray to true");
          }
        }
        throw err2;
      }
      decoder.copyToImageData(image, opts.formatAsRGBA);
      return image;
    }
  }
});
export{parseColor,init_svg,init_xml,readSvg,require_decoder,SvgError,XmlError};
