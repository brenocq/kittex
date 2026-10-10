import{FLATNESS,MAX_ELEMENTS,MAX_DEPTH,ENTITIES,BLACK,MAX_PATH_DATA,MAX_PICTURE_NUMBERS,MAX_PICTURE_OPS,MAX_USE_DEPTH,MAX_SERVER_CLIPS,IDENTITY,MAX_PATTERN_OPS,MAX_VISITS,PATTERN_OPACITY,GRADIENT_BANDS,NAMED,__kittexLate}from'./p30.js';export*from'./p30.js';
// core/src/raster/path.ts
function flattenPath(d, m) {
  const contours = [];
  walkPath(d, m, FLATNESS, (points) => {
    if (points.length >= 6) contours.push(points);
  });
  return contours;
}
function flattenSubpaths(d, m, flatness = FLATNESS) {
  const out = [];
  walkPath(d, m, flatness, (points, closed) => {
    if (points.length >= 4) out.push({ points, closed });
  });
  return out;
}
function walkPath(d, m, flatness, emit2) {
  let contour = [];
  const [a, b, c, dd, e, f] = m;
  const px2 = (x3, y2) => a * x3 + c * y2 + e;
  const py = (x3, y2) => b * x3 + dd * y2 + f;
  let x2 = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let ctrlX = 0;
  let ctrlY = 0;
  let prev = "";
  const finish = (closed = false) => {
    if (contour.length > 0) emit2(contour, closed);
    contour = [];
  };
  const begin = () => {
    if (contour.length === 0) contour.push(px2(x2, y), py(x2, y));
  };
  const lineTo = (nx, ny) => {
    begin();
    contour.push(px2(nx, ny), py(nx, ny));
    x2 = nx;
    y = ny;
  };
  const quadTo = (x1, y1, nx, ny) => {
    begin();
    const p0x = px2(x2, y), p0y = py(x2, y);
    const p1x = px2(x1, y1), p1y = py(x1, y1);
    const p2x = px2(nx, ny), p2y = py(nx, ny);
    const ddx = p0x - 2 * p1x + p2x;
    const ddy = p0y - 2 * p1y + p2y;
    const n = Math.min(100, Math.ceil(Math.sqrt(Math.hypot(ddx, ddy) / (4 * flatness))));
    for (let i2 = 1; i2 < n; i2++) {
      const t = i2 / n;
      const u = 1 - t;
      contour.push(u * u * p0x + 2 * u * t * p1x + t * t * p2x, u * u * p0y + 2 * u * t * p1y + t * t * p2y);
    }
    contour.push(p2x, p2y);
    x2 = nx;
    y = ny;
  };
  const cubicTo = (x1, y1, x22, y2, nx, ny) => {
    begin();
    const p0x = px2(x2, y), p0y = py(x2, y);
    const p1x = px2(x1, y1), p1y = py(x1, y1);
    const p2x = px2(x22, y2), p2y = py(x22, y2);
    const p3x = px2(nx, ny), p3y = py(nx, ny);
    const dd1 = Math.hypot(p0x - 2 * p1x + p2x, p0y - 2 * p1y + p2y);
    const dd2 = Math.hypot(p1x - 2 * p2x + p3x, p1y - 2 * p2y + p3y);
    const n = Math.min(100, Math.ceil(Math.sqrt(0.75 * Math.max(dd1, dd2) / flatness)));
    for (let i2 = 1; i2 < n; i2++) {
      const t = i2 / n;
      const u = 1 - t;
      const w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
      contour.push(w0 * p0x + w1 * p1x + w2 * p2x + w3 * p3x, w0 * p0y + w1 * p1y + w2 * p2y + w3 * p3y);
    }
    contour.push(p3x, p3y);
    x2 = nx;
    y = ny;
  };
  const arcTo = (rx, ry, angle, large, sweep, nx, ny) => {
    for (const seg of arcToCubics(x2, y, rx, ry, angle, large, sweep, nx, ny)) cubicTo(...seg);
    x2 = nx;
    y = ny;
  };
  const s = new Scanner(d);
  let cmd = "";
  for (; ; ) {
    s.skip();
    if (s.done()) break;
    const next = s.command();
    if (next) cmd = next;
    else if (!cmd || cmd === "Z" || cmd === "z") break;
    else if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x2 : 0;
    const oy = rel ? y : 0;
    const upper = cmd.toUpperCase();
    let cx = NaN;
    let cy = NaN;
    if (upper === "Z") {
      finish(true);
      x2 = startX;
      y = startY;
    } else if (upper === "M") {
      const nx = s.number() + ox;
      const ny = s.number() + oy;
      if (Number.isNaN(nx + ny)) break;
      finish();
      x2 = startX = nx;
      y = startY = ny;
    } else if (upper === "L") {
      const nx = s.number() + ox;
      const ny = s.number() + oy;
      if (Number.isNaN(nx + ny)) break;
      lineTo(nx, ny);
    } else if (upper === "H") {
      const nx = s.number() + ox;
      if (Number.isNaN(nx)) break;
      lineTo(nx, y);
    } else if (upper === "V") {
      const ny = s.number() + oy;
      if (Number.isNaN(ny)) break;
      lineTo(x2, ny);
    } else if (upper === "C" || upper === "S") {
      let x1;
      let y1;
      if (upper === "C") {
        x1 = s.number() + ox;
        y1 = s.number() + oy;
      } else if (prev === "C" || prev === "S") {
        x1 = 2 * x2 - ctrlX;
        y1 = 2 * y - ctrlY;
      } else {
        x1 = x2;
        y1 = y;
      }
      const x22 = s.number() + ox;
      const y2 = s.number() + oy;
      const nx = s.number() + ox;
      const ny = s.number() + oy;
      if (Number.isNaN(x1 + y1 + x22 + y2 + nx + ny)) break;
      cubicTo(x1, y1, x22, y2, nx, ny);
      cx = x22;
      cy = y2;
    } else if (upper === "Q" || upper === "T") {
      let x1;
      let y1;
      if (upper === "Q") {
        x1 = s.number() + ox;
        y1 = s.number() + oy;
      } else if (prev === "Q" || prev === "T") {
        x1 = 2 * x2 - ctrlX;
        y1 = 2 * y - ctrlY;
      } else {
        x1 = x2;
        y1 = y;
      }
      const nx = s.number() + ox;
      const ny = s.number() + oy;
      if (Number.isNaN(x1 + y1 + nx + ny)) break;
      quadTo(x1, y1, nx, ny);
      cx = x1;
      cy = y1;
    } else if (upper === "A") {
      const rx = s.number();
      const ry = s.number();
      const angle = s.number();
      const large = s.flag();
      const sweep = s.flag();
      const nx = s.number() + ox;
      const ny = s.number() + oy;
      if (Number.isNaN(rx + ry + angle + large + sweep + nx + ny)) break;
      arcTo(rx, ry, angle, large === 1, sweep === 1, nx, ny);
    } else {
      break;
    }
    ctrlX = cx;
    ctrlY = cy;
    prev = upper;
  }
  finish();
}
var Scanner = class {
  constructor(s) {
    this.s = s;
  }
  s;
  i = 0;
  done() {
    return this.i >= this.s.length;
  }
  /** Skips whitespace and commas. */
  skip() {
    while (this.i < this.s.length) {
      const ch = this.s.charCodeAt(this.i);
      if (ch === 32 || ch === 44 || ch === 9 || ch === 10 || ch === 13 || ch === 12) this.i++;
      else break;
    }
  }
  /** The command letter at the cursor, consumed, or '' when a number is next. */
  command() {
    const ch = this.s[this.i];
    if ("MmLlHhVvCcSsQqTtAaZz".includes(ch)) {
      this.i++;
      return ch;
    }
    return "";
  }
  /** The next number, or NaN when there is none. */
  number() {
    this.skip();
    const s = this.s;
    const start = this.i;
    let i2 = start;
    if (s[i2] === "+" || s[i2] === "-") i2++;
    const digitsFrom = i2;
    while (i2 < s.length && s.charCodeAt(i2) >= 48 && s.charCodeAt(i2) <= 57) i2++;
    if (s[i2] === ".") {
      i2++;
      while (i2 < s.length && s.charCodeAt(i2) >= 48 && s.charCodeAt(i2) <= 57) i2++;
    }
    if (i2 === digitsFrom || i2 === digitsFrom + 1 && s[digitsFrom] === ".") return NaN;
    if (s[i2] === "e" || s[i2] === "E") {
      let j = i2 + 1;
      if (s[j] === "+" || s[j] === "-") j++;
      const expFrom = j;
      while (j < s.length && s.charCodeAt(j) >= 48 && s.charCodeAt(j) <= 57) j++;
      if (j > expFrom) i2 = j;
    }
    this.i = i2;
    return Number(s.slice(start, i2));
  }
  /** An arc flag: a single 0 or 1, which may be packed against what follows. */
  flag() {
    this.skip();
    const ch = this.s[this.i];
    if (ch === "0" || ch === "1") {
      this.i++;
      return ch === "1" ? 1 : 0;
    }
    return NaN;
  }
};
function arcToCubics(x1, y1, rx, ry, angle, large, sweep, x2, y2) {
  if (x1 === x2 && y1 === y2) return [];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]];
  const phi = angle * Math.PI / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const hx = (x1 - x2) / 2;
  const hy = (y1 - y2) / 2;
  const x1p = cos * hx + sin * hy;
  const y1p = -sin * hx + cos * hy;
  const lambda = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num3 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let k = Math.sqrt(Math.max(0, num3 / den));
  if (large === sweep) k = -k;
  const cxp = k * rx * y1p / ry;
  const cyp = -k * ry * x1p / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const vecAngle = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const theta = vecAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = vecAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9));
  const step = delta / n;
  const t = 4 / 3 * Math.tan(step / 4);
  const point = (u) => {
    const cu = Math.cos(u);
    const su = Math.sin(u);
    return [
      cx + rx * cu * cos - ry * su * sin,
      cy + rx * cu * sin + ry * su * cos,
      -rx * su * cos - ry * cu * sin,
      -rx * su * sin + ry * cu * cos
    ];
  };
  const out = [];
  let [ax, ay, adx, ady] = point(theta);
  for (let i2 = 1; i2 <= n; i2++) {
    const [bx, by, bdx, bdy] = point(theta + i2 * step);
    const endX = i2 === n ? x2 : bx;
    const endY = i2 === n ? y2 : by;
    out.push([ax + t * adx, ay + t * ady, endX - t * bdx, endY - t * bdy, endX, endY]);
    ax = endX;
    ay = endY;
    adx = bdx;
    ady = bdy;
  }
  return out;
}
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
    const box2 = pathBox(d);
    if (stops.length < 2 || !box2) return false;
    const attr = (name) => inheritedAttr(el, name, ids);
    const bounding = (attr("gradientUnits") ?? "objectBoundingBox") !== "userSpaceOnUse";
    if (bounding && !(box2.width > 0 && box2.height > 0)) return false;
    const units = bounding ? [box2.width, 0, 0, box2.height, box2.x, box2.y] : IDENTITY;
    const space = multiply(units, transformOf(attr("gradientTransform")));
    const back = invert(space);
    if (!back) return false;
    const corners = [
      apply(back, box2.x, box2.y),
      apply(back, box2.x + box2.width, box2.y),
      apply(back, box2.x, box2.y + box2.height),
      apply(back, box2.x + box2.width, box2.y + box2.height)
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
      const x1 = coord("x1", bounding ? 0 : box2.x);
      const y1 = coord("y1", bounding ? 0 : box2.y);
      const x2 = coord("x2", bounding ? 1 : box2.x + box2.width);
      const y2 = coord("y2", bounding ? 0 : box2.y);
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
      const at = (t, s2) => `${fmt(x1 + t * vx - s2 * vy)} ${fmt(y1 + t * vy + s2 * vx)}`;
      bands.forEach((band, k) => {
        const from = k === 0 ? tMin : band.from;
        const to = opaque || k === bands.length - 1 ? tMax : band.to;
        shapes.push({ d: `M${at(from, sMin)}L${at(to, sMin)}L${at(to, sMax)}L${at(from, sMax)}Z`, paint: band.paint, rule: "nonzero" });
      });
    } else {
      const cx = coord("cx", bounding ? 0.5 : box2.x + box2.width / 2);
      const cy = coord("cy", bounding ? 0.5 : box2.y + box2.height / 2);
      const r = coord("r", bounding ? 0.5 : Math.hypot(box2.width, box2.height) / 2);
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
    const box2 = pathBox(d);
    if (content.length === 0 || !box2 || patternDepth > 0) return false;
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
      x2 = box2.x + x2 * box2.width;
      y = box2.y + y * box2.height;
      w *= box2.width;
      h *= box2.height;
    }
    if (!(w > 0 && h > 0)) return false;
    const tileSpace = transformOf(attr("patternTransform"));
    const back = invert(tileSpace);
    if (!back) return false;
    const corners = [apply(back, box2.x, box2.y), apply(back, box2.x + box2.width, box2.y), apply(back, box2.x, box2.y + box2.height), apply(back, box2.x + box2.width, box2.y + box2.height)];
    const i0 = Math.floor((Math.min(...corners.map(([cx]) => cx)) - x2) / w) - 1;
    const i1 = Math.ceil((Math.max(...corners.map(([cx]) => cx)) - x2) / w) + 1;
    const j0 = Math.floor((Math.min(...corners.map(([, cy]) => cy)) - y) / h) - 1;
    const j1 = Math.ceil((Math.max(...corners.map(([, cy]) => cy)) - y) / h) + 1;
    const perTile = shapesIn(content, ids);
    const total = (i1 - i0 + 1) * (j1 - j0 + 1) * perTile;
    if (!(perTile > 0) || !(total <= MAX_PATTERN_OPS) || ops.length + total > MAX_PICTURE_OPS / 2) return false;
    const contentUnits = attr("patternContentUnits") === "objectBoundingBox" ? [box2.width, 0, 0, box2.height, 0, 0] : IDENTITY;
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
  let visits = 0;
  const walk2 = (stack2) => {
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
  };
  walk2([{ el: root2, ctm: IDENTITY, inherited: { ...INITIAL }, root: true, glyph: false, uses: 0 }]);
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
  style.fillOpacity = (__kittexLate.clamp01?.())(number("fill-opacity", inherited.fillOpacity));
  style.strokeOpacity = (__kittexLate.clamp01?.())(number("stroke-opacity", inherited.strokeOpacity));
  style.opacity = inherited.opacity * (__kittexLate.clamp01?.())(number("opacity", 1));
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
    const offset = (__kittexLate.clamp01?.())(raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw) || 0);
    const color = parseColor(declared(stop, "stop-color") ?? "black", BLACK) ?? BLACK;
    const opacity = (__kittexLate.clamp01?.())(parseFloat(declared(stop, "stop-opacity") ?? "1"));
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
    const paint = colorAt(stops, (from + to) / 2);
    const before = bands[bands.length - 1];
    if (before && sameRgb(before.paint.color, paint.color) && Math.abs(before.paint.opacity - paint.opacity) < 2e-3) before.to = to;
    else bands.push({ from, to, paint });
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
var sameRgb = (a, b) => a.r === b.r && a.g === b.g && a.b === b.b;
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
export{readSvg,flattenPath,flattenSubpaths,SvgError,XmlError};
