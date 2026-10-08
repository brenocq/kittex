import{DEFAULT_WEIGHT,INK_MARGIN,BASELINE_SHIFT,INK_EDGE,Coverage,RULE_MIN_SNAP,encodeAlphaPng,flattenPath,RULE_MIN_FILL,Canvas2,flattenSubpaths,snapStroke,MIN_STROKE_PX,strokeOutlines,OUTLINE_EM_PX,encodeQuantizedPng,BACKSLASH,DOLLAR,TICK,DOLLAR2,CLOSE_PAREN,OPEN_PAREN,NORMAL}from'./p32.js';export*from'./p32.js';
// core/src/raster/index.ts
var WEIGHT_STEPS = [
  [300, 12],
  [400, DEFAULT_WEIGHT],
  [500, 20],
  [600, 23],
  [700, 26]
];
function strokeWeight(fontWeight) {
  if (fontWeight === void 0 || !Number.isFinite(fontWeight)) return DEFAULT_WEIGHT;
  const first = WEIGHT_STEPS[0];
  const last = WEIGHT_STEPS.at(-1);
  if (fontWeight <= first[0]) return first[1];
  if (fontWeight >= last[0]) return last[1];
  const i2 = WEIGHT_STEPS.findIndex(([w]) => w >= fontWeight);
  const [w0, s0] = WEIGHT_STEPS[i2 - 1];
  const [w1, s1] = WEIGHT_STEPS[i2];
  return Math.round(s0 + (s1 - s0) * (fontWeight - w0) / (w1 - w0));
}
function layout(result, options3) {
  const { emPx, cellWidth, cellHeight } = options3;
  if (!(emPx > 0 && cellWidth > 0 && cellHeight > 0)) throw new RangeError("raster: emPx and cell sizes must be positive");
  const maxColumns = Math.max(1, Math.min(255, Math.floor(options3.maxColumns) || 1));
  const minRows = Math.max(1, Math.min(255, Math.ceil(options3.minRows ?? 1)));
  const weight = Math.max(0, options3.weight ?? DEFAULT_WEIGHT);
  const width = Math.max(0, result.width);
  const boxHeight = Math.max(0, result.height + result.depth);
  const dilation0 = weight / 1e3 * emPx;
  const pad2 = Math.ceil(dilation0 - 1e-9);
  const span = options3.align === "left" && options3.centerInk ? inkSpan(result, emPx, dilation0, pad2) : void 0;
  const fullWidth = span ?? width * emPx;
  const availWidth = maxColumns * cellWidth - (span === void 0 ? 2 * pad2 : 0);
  const availHeight = 255 * cellHeight - 2 * pad2;
  const inline3 = options3.baselinePx !== void 0;
  let scale2 = 1;
  let inlineBaseline = 0;
  if (fullWidth > availWidth) scale2 = Math.max(0, availWidth - (span === void 0 ? 0 : INK_MARGIN)) / fullWidth;
  if (inline3) {
    const heightPx2 = Math.max(1, Math.round(minRows * cellHeight));
    const baseline = Math.min(heightPx2, Math.max(0, Math.round(options3.baselinePx)));
    const above2 = Math.max(0, result.height) * emPx + dilation0;
    const below2 = Math.max(0, result.depth) * emPx + dilation0;
    const shift = Math.max(1, Math.round(cellHeight * BASELINE_SHIFT));
    const floor = options3.minScale ?? 0;
    const fitAt = (edge) => (at) => Math.min(scale2, above2 > 0 ? Math.max(0, at - edge) / above2 : Infinity, below2 > 0 ? (heightPx2 - at) / below2 : Infinity);
    const place = (fit) => {
      let best = baseline;
      for (let d = 1; d <= shift; d++) {
        for (const at of [baseline - d, baseline + d]) {
          if (at >= 0 && at <= heightPx2 && fit(at) > fit(best) + 1e-9) best = at;
        }
      }
      return { at: best, scale: fit(best) };
    };
    let placed = place(fitAt(INK_EDGE));
    if (placed.scale < floor) placed = place(fitAt(0));
    inlineBaseline = placed.at;
    scale2 = placed.scale;
    const slack = Math.max(0, options3.overflowPx ?? 0);
    if (scale2 < floor && slack > 0) {
      const fitWith = (at) => Math.min(above2 > 0 ? (at + slack) / above2 : Infinity, below2 > 0 ? (heightPx2 - at + slack) / below2 : Infinity);
      let rescue = baseline;
      for (let d = 1; d <= shift; d++) {
        for (const at of [baseline - d, baseline + d]) {
          if (at >= 0 && at <= heightPx2 && fitWith(at) > fitWith(rescue) + 1e-9) rescue = at;
        }
      }
      if (fitWith(rescue) >= floor - 1e-9 && (fullWidth * floor <= availWidth || availWidth <= 0)) {
        inlineBaseline = rescue;
        scale2 = floor;
      }
    }
  } else if (boxHeight * emPx * scale2 > availHeight) {
    scale2 = Math.max(0, availHeight) / (boxHeight * emPx);
  }
  const k = emPx * scale2;
  const inkWidth = span === void 0 ? width * k + 2 * pad2 : scale2 === 1 ? span : span * scale2 + INK_MARGIN;
  const inkHeight = boxHeight * k + 2 * pad2;
  const minColumns = Math.max(1, Math.floor(options3.minColumns ?? 1));
  const columns = options3.align === "center" ? maxColumns : Math.min(maxColumns, Math.max(minColumns, Math.ceil(inkWidth / cellWidth - 1e-9)));
  const rows = inline3 ? minRows : Math.min(255, Math.max(minRows, Math.ceil(inkHeight / cellHeight - 1e-9)));
  const widthPx = Math.max(1, Math.round(columns * cellWidth));
  const heightPx = Math.max(1, Math.round(rows * cellHeight));
  const originX = options3.align === "center" ? Math.round((widthPx - width * k) / 2) : pad2;
  const baselinePx = inline3 ? inlineBaseline : Math.round((heightPx - inkHeight) / 2 + pad2 + Math.max(0, result.height) * k);
  return { columns, rows, scale: scale2, widthPx, heightPx, k, dilation: dilation0 * scale2, originX, baselinePx };
}
function measure(result, options3) {
  const { columns, rows, scale: scale2 } = layout(result, options3);
  return { columns, rows, scale: scale2 };
}
function rasterize(result, options3) {
  const box = layout(result, options3);
  const { widthPx, heightPx, k, dilation, originX, baselinePx } = box;
  const coverage = new Coverage(widthPx, heightPx);
  const toPx = [k, 0, 0, k, originX, baselinePx];
  const ruleMax = Math.max(RULE_MIN_SNAP, 0.15 * k);
  const shapes = result.ops.flatMap((op) => outline(op, toPx, dilation, ruleMax) ?? []);
  const dx = options3.align === "left" && options3.centerInk ? inkShift(shapes, widthPx, options3.inkPlace ?? "center") : 0;
  for (const { contours, sign } of shapes) {
    for (const c of contours) {
      if (dx !== 0) for (let i2 = 0; i2 < c.length; i2 += 2) c[i2] = c[i2] + dx;
      coverage.fill(c, sign);
    }
  }
  return {
    columns: box.columns,
    rows: box.rows,
    scale: box.scale,
    alpha: coverage.toAlpha(),
    widthPx,
    heightPx,
    baselinePx
  };
}
function encodePng(raster, ink, over, curve) {
  return encodeAlphaPng(raster.alpha, raster.widthPx, raster.heightPx, ink, over, curve);
}
function inkSpan(result, emPx, dilation, originX) {
  const toPx = [emPx, 0, 0, emPx, originX, 0];
  const shapes = result.ops.flatMap((op) => outline(op, toPx, dilation, Math.max(RULE_MIN_SNAP, 0.15 * emPx)) ?? []);
  const { x0, x1 } = extent(shapes);
  return x1 > x0 ? Math.ceil(x1 - 1e-9) - Math.floor(x0 + 1e-9) : void 0;
}
function extent(shapes) {
  let x0 = Infinity;
  let x1 = -Infinity;
  for (const { contours } of shapes) {
    for (const c of contours) {
      for (let i2 = 0; i2 < c.length; i2 += 2) {
        if (c[i2] < x0) x0 = c[i2];
        if (c[i2] > x1) x1 = c[i2];
      }
    }
  }
  return { x0, x1 };
}
function inkShift(shapes, widthPx, place) {
  const { x0, x1 } = extent(shapes);
  if (!(x1 > x0) || x1 - x0 > widthPx) return 0;
  const slack = widthPx - (x1 - x0);
  const dx = Math.round((place === "start" ? 0 : place === "end" ? slack : slack / 2) - x0);
  return Math.min(Math.max(dx, Math.ceil(-x0 - 1e-9)), Math.floor(widthPx - x1 + 1e-9));
}
function outline(op, toPx, dilation, ruleMax) {
  let contours;
  if (op.type === "rect") {
    const [k, , , , e, f] = toPx;
    const x0 = e + k * Math.min(op.x, op.x + op.width);
    const x1 = e + k * Math.max(op.x, op.x + op.width);
    const y0 = f + k * Math.min(op.y, op.y + op.height);
    const y1 = f + k * Math.max(op.y, op.y + op.height);
    if (!(x1 > x0 && y1 > y0)) return void 0;
    contours = [[x0, y0, x1, y0, x1, y1, x0, y1]];
  } else {
    contours = flattenPath(op.d, compose(toPx, op.transform));
  }
  let area2 = 0;
  for (const c of contours) area2 += signedArea(c);
  if (!(Math.abs(area2) > 1e-9)) return void 0;
  const sign = area2 > 0 ? 1 : -1;
  const out = [];
  for (let c of contours) {
    if (dilation > 0) c = dilate(c, dilation, sign);
    snapRule(c, ruleMax);
    out.push(c);
  }
  return { contours: out, sign };
}
function compose(p, t) {
  return [
    p[0] * t[0] + p[2] * t[1],
    p[1] * t[0] + p[3] * t[1],
    p[0] * t[2] + p[2] * t[3],
    p[1] * t[2] + p[3] * t[3],
    p[0] * t[4] + p[2] * t[5] + p[4],
    p[1] * t[4] + p[3] * t[5] + p[5]
  ];
}
function signedArea(c) {
  let sum2 = 0;
  const n = c.length;
  let x0 = c[n - 2];
  let y0 = c[n - 1];
  for (let i2 = 0; i2 < n; i2 += 2) {
    const x1 = c[i2];
    const y1 = c[i2 + 1];
    sum2 += x0 * y1 - x1 * y0;
    x0 = x1;
    y0 = y1;
  }
  return sum2 / 2;
}
function dilate(c, d, sign) {
  const pts = [];
  for (let i2 = 0; i2 < c.length; i2 += 2) {
    const x2 = c[i2];
    const y = c[i2 + 1];
    const n2 = pts.length;
    if (n2 >= 2 && Math.abs(x2 - pts[n2 - 2]) < 1e-6 && Math.abs(y - pts[n2 - 1]) < 1e-6) continue;
    pts.push(x2, y);
  }
  while (pts.length >= 4 && Math.abs(pts[0] - pts[pts.length - 2]) < 1e-6 && Math.abs(pts[1] - pts[pts.length - 1]) < 1e-6) {
    pts.length -= 2;
  }
  const n = pts.length / 2;
  if (n < 3) return c;
  const nx = new Float64Array(n);
  const ny = new Float64Array(n);
  for (let i2 = 0; i2 < n; i2++) {
    const j = (i2 + 1) % n;
    const dx = pts[2 * j] - pts[2 * i2];
    const dy = pts[2 * j + 1] - pts[2 * i2 + 1];
    const len = Math.hypot(dx, dy);
    nx[i2] = sign * dy / len;
    ny[i2] = -sign * dx / len;
  }
  const out = new Array(2 * n);
  for (let i2 = 0; i2 < n; i2++) {
    const p = (i2 + n - 1) % n;
    const sx = nx[p] + nx[i2];
    const sy = ny[p] + ny[i2];
    const cos1 = 1 + nx[p] * nx[i2] + ny[p] * ny[i2];
    let mx = 0;
    let my = 0;
    if (cos1 >= 0.5) {
      mx = sx / cos1;
      my = sy / cos1;
    } else {
      const len = Math.hypot(sx, sy);
      if (len > 1e-9) {
        mx = 2 * sx / len;
        my = 2 * sy / len;
      }
    }
    out[2 * i2] = pts[2 * i2] + d * mx;
    out[2 * i2 + 1] = pts[2 * i2 + 1] + d * my;
  }
  return out;
}
function snapRule(c, maxThickness = RULE_MIN_SNAP) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i2 = 0; i2 < c.length; i2 += 2) {
    const x2 = c[i2];
    const y = c[i2 + 1];
    if (x2 < x0) x0 = x2;
    if (x2 > x1) x1 = x2;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const w = x1 - x0;
  const h = y1 - y0;
  if (!(w > 0 && h > 0) || Math.abs(signedArea(c)) < RULE_MIN_FILL * w * h) return;
  const axis = h <= maxThickness && w >= 2 * h ? 1 : w <= maxThickness && h >= 2 * w ? 0 : -1;
  if (axis < 0) return;
  const lo = axis === 1 ? y0 : x0;
  const size = axis === 1 ? h : w;
  const t = Math.max(1, Math.round(size));
  const to = Math.round(lo + size / 2 - t / 2);
  const f = t / size;
  for (let i2 = axis; i2 < c.length; i2 += 2) c[i2] = to + (c[i2] - lo) * f;
}
function pictureLayout(picture, options3) {
  const maxRows = Math.max(1, Math.min(255, Math.floor(options3.maxRows) || 1));
  const weight = Math.max(0, options3.weight ?? DEFAULT_WEIGHT);
  const box = { width: picture.width, height: picture.height, depth: picture.depth, ops: [] };
  const boxHeight = Math.max(0, picture.height + picture.depth);
  let emPx = options3.emPx;
  const pad2 = Math.ceil(weight / 1e3 * emPx - 1e-9);
  const room = maxRows * options3.cellHeight - 2 * pad2;
  if (boxHeight * emPx > room) emPx = Math.max(1e-6, room) / boxHeight;
  const placed = layout(box, { emPx, cellWidth: options3.cellWidth, cellHeight: options3.cellHeight, maxColumns: options3.maxColumns, align: "left", minRows: options3.minRows, ...options3.minColumns !== void 0 ? { minColumns: options3.minColumns } : {}, weight });
  const originX = Math.round((placed.widthPx - box.width * placed.k) / 2);
  return { ...placed, originX, scale: placed.scale * emPx / options3.emPx };
}
function measurePicture(picture, options3) {
  const { columns, rows, scale: scale2 } = pictureLayout(picture, options3);
  return { columns, rows, scale: scale2 };
}
function rasterizePicture(picture, options3) {
  const box = pictureLayout(picture, options3);
  const { widthPx, heightPx, k, dilation, originX, baselinePx } = box;
  const toPx = [k, 0, 0, k, originX, baselinePx];
  const canvas = new Canvas2(widthPx, heightPx);
  const ruleMax = Math.max(RULE_MIN_SNAP, 0.15 * k);
  const masks = /* @__PURE__ */ new Map();
  const maskOf = (index) => {
    const known = masks.get(index);
    if (known) return known;
    const clip = picture.clips[index];
    if (!clip) return void 0;
    const mask = new Uint8Array(widthPx * heightPx);
    for (const path of clip.paths) {
      const coverage = new Coverage(widthPx, heightPx);
      const contours = flattenPath(path.d, compose(toPx, path.transform));
      let area2 = 0;
      for (const c of contours) area2 += signedArea(c);
      for (const c of contours) coverage.fill(c, area2 >= 0 ? 1 : -1);
      const alpha = path.rule === "evenodd" ? coverage.toAlphaEvenOdd() : coverage.toAlpha();
      for (let i2 = 0; i2 < mask.length; i2++) if (alpha[i2] > mask[i2]) mask[i2] = alpha[i2];
    }
    const outer = clip.within !== void 0 && clip.within < index ? maskOf(clip.within) : void 0;
    if (outer) for (let i2 = 0; i2 < mask.length; i2++) mask[i2] = (mask[i2] * outer[i2] + 127) / 255;
    masks.set(index, mask);
    return mask;
  };
  for (const op of picture.ops) {
    const m = compose(toPx, op.transform);
    let contours;
    let sign = 1;
    let evenOdd = false;
    if (op.type === "fill") {
      contours = flattenPath(op.d, m);
      if (op.rule === "evenodd") {
        evenOdd = true;
      } else {
        let area2 = 0;
        for (const c of contours) area2 += signedArea(c);
        if (!(Math.abs(area2) > 1e-9)) continue;
        sign = area2 > 0 ? 1 : -1;
        contours = contours.map((c) => {
          const grown = dilation > 0 ? dilate(c, dilation, sign) : c;
          snapRule(grown, ruleMax);
          return grown;
        });
      }
    } else {
      const unit = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
      const subpaths = flattenSubpaths(op.d, m);
      const width = snapStroke(subpaths, Math.max(MIN_STROKE_PX, op.style.width * unit) + 2 * dilation);
      contours = strokeOutlines(subpaths, {
        width,
        cap: op.style.cap,
        join: op.style.join,
        miterLimit: op.style.miterLimit,
        ...op.style.dash ? { dash: op.style.dash.map((n) => n * unit), dashOffset: (op.style.dashOffset ?? 0) * unit } : {}
      });
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of contours) {
      for (let i2 = 0; i2 < c.length; i2 += 2) {
        if (c[i2] < x0) x0 = c[i2];
        if (c[i2] > x1) x1 = c[i2];
        if (c[i2 + 1] < y0) y0 = c[i2 + 1];
        if (c[i2 + 1] > y1) y1 = c[i2 + 1];
      }
    }
    const left = Math.max(0, Math.floor(x0));
    const top = Math.max(0, Math.floor(y0));
    const right = Math.min(widthPx, Math.ceil(x1));
    const bottom = Math.min(heightPx, Math.ceil(y1));
    if (!(right > left && bottom > top)) continue;
    const w = right - left;
    const h = bottom - top;
    const coverage = new Coverage(w, h);
    for (const c of contours) {
      for (let i2 = 0; i2 < c.length; i2 += 2) {
        c[i2] = c[i2] - left;
        c[i2 + 1] = c[i2 + 1] - top;
      }
      coverage.fill(c, sign);
    }
    const alpha = evenOdd ? coverage.toAlphaEvenOdd() : coverage.toAlpha();
    const color = options3.color(op.paint.color, op.type === "stroke" || op.glyph === true);
    canvas.paint(alpha, left, top, w, h, color, op.paint.opacity, op.clip !== void 0 ? maskOf(op.clip) : void 0);
  }
  return { columns: box.columns, rows: box.rows, scale: box.scale, rgba: canvas.straight(options3.over), widthPx, heightPx };
}
function pictureOutlines(picture) {
  const ops = [];
  const back = [1 / OUTLINE_EM_PX, 0, 0, 1 / OUTLINE_EM_PX, 0, 0];
  for (const op of picture.ops) {
    if (op.type === "fill") {
      ops.push({ type: "path", d: op.d, transform: op.transform });
      continue;
    }
    const m = compose([OUTLINE_EM_PX, 0, 0, OUTLINE_EM_PX, 0, 0], op.transform);
    const unit = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
    const contours = strokeOutlines(flattenSubpaths(op.d, m), {
      width: op.style.width * unit,
      cap: op.style.cap,
      join: op.style.join,
      miterLimit: op.style.miterLimit,
      ...op.style.dash ? { dash: op.style.dash.map((n) => n * unit), dashOffset: (op.style.dashOffset ?? 0) * unit } : {}
    });
    if (contours.length > 0) ops.push({ type: "path", d: contours.map(contourPath).join(""), transform: back });
  }
  return { width: picture.width, height: picture.height, depth: picture.depth, ops };
}
function contourPath(c) {
  const n = (v) => (Math.round(v * 1e3) / 1e3).toString();
  let d = `M${n(c[0])} ${n(c[1])}`;
  for (let i2 = 2; i2 < c.length; i2 += 2) d += `L${n(c[i2])} ${n(c[i2 + 1])}`;
  return d + "Z";
}
function encodePicturePng(raster) {
  return encodeQuantizedPng(raster.rgba, raster.widthPx, raster.heightPx);
}
// core/src/scan/blocks.ts
var FENCE = /^(`{3,}|~{3,})(.*)$/;
function fenceOpen(body) {
  const m = FENCE.exec(body);
  if (!m) return null;
  const run2 = m[1];
  const info = m[2];
  if (run2[0] === "`" && info.includes("`")) return null;
  const lang = info.trim().split(/\s+/, 1)[0].toLowerCase();
  const diagram = lang === "latex" || lang === "tex" ? "latex" : lang === "tikz" ? "tikz" : void 0;
  return { ch: run2[0], len: run2.length, math: lang === "math", ...diagram ? { diagram } : {} };
}
function closesFence(body, ch, len) {
  let n = 0;
  while (body[n] === ch) n++;
  if (n < len) return false;
  for (let i2 = n; i2 < body.length; i2++) {
    const c = body.charCodeAt(i2);
    if (c !== 32 && c !== 9 && c !== 13) return false;
  }
  return true;
}
function looksLikeFence(body) {
  return body.startsWith("```") || body.startsWith("~~~");
}
var ENVS = /* @__PURE__ */ new Set([
  "equation",
  "align",
  "gather",
  "multline",
  "flalign",
  "alignat",
  "eqnarray",
  "displaymath",
  "subequations",
  "matrix",
  "pmatrix",
  "bmatrix",
  "Bmatrix",
  "vmatrix",
  "Vmatrix",
  "smallmatrix",
  "cases",
  "dcases",
  "rcases",
  "aligned",
  "alignedat",
  "gathered",
  "split",
  "multlined",
  "array",
  "CD",
  "empheq"
]);
var BEGIN = /^\\begin\{([A-Za-z]+)(\*?)\}/;
var DIAGRAM_ENVS2 = /* @__PURE__ */ new Set(["tikzpicture", "tikzcd", "circuitikz"]);
function displayOpen(body, diagrams = false) {
  let kind;
  let delimiter;
  let from;
  if (body.startsWith("$$")) {
    if (body[2] === "$") return null;
    kind = delimiter = "$$";
    from = 2;
  } else if (body.startsWith("\\[")) {
    kind = delimiter = "\\[";
    from = 2;
  } else {
    const m = BEGIN.exec(body);
    if (!m || !(ENVS.has(m[1]) || diagrams && DIAGRAM_ENVS2.has(m[1]))) return null;
    kind = m[1] + m[2];
    delimiter = "env";
    from = m[0].length;
  }
  const close = findClose(kind, body, from);
  if (!close) return { kind, delimiter, from };
  if (!close.ok || !onlySpaceAfter(body, close.end)) return null;
  if (isBlankRange(body, from, close.pos)) return null;
  const tex = (delimiter === "env" ? body.slice(0, close.end) : body.slice(from, close.pos)).trim();
  return { kind, delimiter, from, oneLine: { end: close.end, tex } };
}
function findClose(kind, s, from) {
  if (kind === "$$") {
    for (let i2 = from; i2 < s.length; ) {
      const c = s.charCodeAt(i2);
      if (c === BACKSLASH) {
        i2 += 2;
      } else if (c === DOLLAR) {
        let j = i2 + 1;
        while (s.charCodeAt(j) === DOLLAR) j++;
        if (j - i2 >= 2) return { pos: i2, end: j, ok: j - i2 === 2 };
        i2 = j;
      } else {
        i2++;
      }
    }
    return null;
  }
  const token2 = kind === "\\[" ? "]" : `end{${kind}}`;
  for (let i2 = from; i2 < s.length; i2++) {
    if (s.charCodeAt(i2) !== BACKSLASH) continue;
    if (s.startsWith(token2, i2 + 1)) return { pos: i2, end: i2 + 1 + token2.length, ok: true };
    i2++;
  }
  return null;
}
function onlySpaceAfter(s, from) {
  return isBlankRange(s, from, s.length);
}
function isBlankRange(s, from, to) {
  return s.slice(from, to).trim() === "";
}
var LIST_ITEM = /^(?:[-+*]|\d{1,9}[.)])(?:[ \t]|$)/;
var HEADING = /^#{1,6}(?:[ \t]|$)/;
var THEMATIC_OR_SETEXT = /^(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|=+[ \t]*)\r?$/;
function isListItem(body) {
  return LIST_ITEM.test(body);
}
function standsAlone(body) {
  return HEADING.test(body) || body.startsWith("|");
}
function startsBlock(body) {
  return HEADING.test(body) || LIST_ITEM.test(body) || body.startsWith("|") || THEMATIC_OR_SETEXT.test(body);
}
var DELIMITER_ROW = /^ {0,3}((?:\| *)?:?-+:? *(?:\| *:?-+:? *)*(?:\| *)?)$/;
function delimitsTable(header, body) {
  const delimiter = DELIMITER_ROW.exec(body.replace(/[ \t\r]+$/, ""))?.[1];
  if (!delimiter || !/[:|]/.test(delimiter) || header.trim() === "") return false;
  return cellCount(header) === delimiter.replace(/^\||\| *$/g, "").split("|").length;
}
function cellCount(line) {
  const cells2 = line.replace(/\|/g, (_match, offset, all) => {
    let escaped = false;
    for (let p = offset - 1; p >= 0 && all[p] === "\\"; p--) escaped = !escaped;
    return escaped ? "|" : " |";
  }).split(/ \|/);
  if (!cells2[0]?.trim()) cells2.shift();
  if (cells2.length > 0 && !cells2.at(-1)?.trim()) cells2.pop();
  return cells2.length;
}
function endsTable(body) {
  return HEADING.test(body) || LIST_ITEM.test(body) || THEMATIC_OR_SETEXT.test(body) || looksLikeFence(body) || body.startsWith("<");
}
// core/src/scan/lines.ts
function makeLine(raw, start) {
  const text = raw.endsWith("\n") ? raw.slice(0, -1) : raw;
  const prefixEnds = [0];
  let p = 0;
  for (let q = quoteMarkerEnd(text, p); q >= 0; q = quoteMarkerEnd(text, p)) {
    p = q;
    prefixEnds.push(p);
  }
  let indent = 0;
  let i2 = p;
  for (; i2 < text.length; i2++) {
    const c = text.charCodeAt(i2);
    if (c === 32) indent++;
    else if (c === 9) indent += 4 - indent % 4;
    else break;
  }
  const body = text.slice(i2);
  return {
    raw,
    text,
    start,
    end: start + raw.length,
    depth: prefixEnds.length - 1,
    prefixEnds,
    indent,
    bodyStart: i2,
    body,
    blank: isBlank(body)
  };
}
function restAt(line, depth) {
  return line.text.slice(line.prefixEnds[depth] ?? 0);
}
function stripQuotes(text, depth) {
  let p = 0;
  for (let d = 0; d < depth; d++) {
    const q = quoteMarkerEnd(text, p);
    if (q < 0) break;
    p = q;
  }
  return text.slice(p);
}
function quoteMarkerEnd(text, p) {
  let q = p;
  while (q - p < 3 && text.charCodeAt(q) === 32) q++;
  if (text.charCodeAt(q) !== 62) return -1;
  q++;
  const c = text.charCodeAt(q);
  if (c === 32 || c === 9) q++;
  return q;
}
function isBlank(s) {
  for (let i2 = 0; i2 < s.length; i2++) if (!isSpace(s.charCodeAt(i2))) return false;
  return true;
}
function isSpace(c) {
  if (c <= 32) return c === 32 || c >= 9 && c <= 13;
  return c >= 128 && /\s/.test(String.fromCharCode(c));
}
function trimEndLength(s) {
  let n = s.length;
  while (n > 0 && isSpace(s.charCodeAt(n - 1))) n--;
  return n;
}
// core/src/scan/inline.ts
function scanInline(lines2, open, isRow = () => false) {
  const first = lines2[0];
  const base = first.start;
  const depth = first.depth;
  const s = lines2.length === 1 ? first.raw : lines2.map((l) => l.raw).join("");
  const tokens = tokenize(s);
  const n = tokens.length;
  let pending = Infinity;
  const closeTick = new Int32Array(n).fill(-1);
  {
    const nextByLen = /* @__PURE__ */ new Map();
    const nextSame = new Int32Array(n).fill(-1);
    for (let k = n - 1; k >= 0; k--) {
      const t = tokens[k];
      if (t.type !== TICK) continue;
      if (t.open > 0) nextSame[k] = nextByLen.get(t.open) ?? -1;
      nextByLen.set(t.len, k);
    }
    for (let k = 0; k < n; k++) {
      const t = tokens[k];
      if (t.type !== TICK || t.open === 0) continue;
      const m = nextSame[k];
      if (m >= 0) {
        closeTick[k] = m;
        k = m;
      } else if (open) {
        pending = t.pos;
        break;
      }
    }
  }
  const nextDollar = new Int32Array(n).fill(-1);
  const nextParen = new Int32Array(n).fill(-1);
  for (let k = n - 1, dollar = -1, paren = -1; k >= 0; k--) {
    nextDollar[k] = dollar;
    nextParen[k] = paren;
    const t = tokens[k];
    if (t.type === TICK) dollar = paren = k;
    else if (t.type === DOLLAR2) dollar = k;
    else if (t.type === CLOSE_PAREN) paren = k;
  }
  const spans = [];
  for (let k = 0; k < n; k++) {
    const t = tokens[k];
    if (t.pos >= pending) break;
    if (t.type === TICK) {
      const m2 = closeTick[k];
      if (m2 >= 0) {
        spans.push({ start: t.pos, end: tokens[m2].pos + tokens[m2].len });
        k = m2;
      }
      continue;
    }
    if (t.type === CLOSE_PAREN || t.type === DOLLAR2 && (t.len > 2 || t.len === 1 && !t.canOpen)) continue;
    const m = t.type === DOLLAR2 ? nextDollar[k] : nextParen[k];
    if (m < 0) {
      if (open) {
        pending = t.pos;
        break;
      }
      continue;
    }
    const c = tokens[m];
    if (c.type === TICK) continue;
    let delimiter;
    if (t.type === OPEN_PAREN) delimiter = "\\(";
    else if (t.len === 1 && c.len === 1 && c.canClose) delimiter = "$";
    else if (t.len === 2 && c.len === 2) delimiter = "$$";
    else continue;
    k = m;
    const tex = texOf(s.slice(t.pos + t.len, c.pos), depth);
    spans.push({ start: t.pos, end: c.pos + c.len, math: tex === "" ? void 0 : { tex, delimiter } });
  }
  const starts = lineStarts(lines2, base);
  const rows = lines2.map(isRow);
  let cut = s.length;
  if (pending < Infinity) cut = lineStartAt(starts, pending);
  const last = lines2.length - 1;
  if (open && !rows[last] && lines2[last].raw.includes("\\|")) cut = Math.min(cut, starts[last]);
  if (cut < s.length) {
    for (let j = spans.length - 1; j >= 0; j--) {
      const span = spans[j];
      if (span.end <= cut) break;
      if (span.start < cut) cut = lineStartAt(starts, span.start);
    }
  }
  const segments = [];
  let pos = 0;
  const text = (to) => {
    if (to > pos) segments.push({ kind: "text", text: s.slice(pos, to), start: base + pos, end: base + to });
  };
  for (const span of spans) {
    if (span.start >= cut) break;
    if (!span.math) continue;
    text(span.start);
    const row = rows[lineIndexAt(starts, span.start)];
    segments.push({
      kind: "math",
      display: false,
      tex: row ? tablePipes(span.math.tex) : span.math.tex,
      raw: s.slice(span.start, span.end),
      delimiter: span.math.delimiter,
      start: base + span.start,
      end: base + span.end
    });
    pos = span.end;
  }
  text(cut);
  return { segments, cut: base + cut };
}
function tablePipes(tex) {
  return tex.replace(/\\\\\\\||\\\|/g, (match) => match.length === 4 ? "\\|" : "|");
}
function texOf(content, depth) {
  if (depth > 0 && content.includes("\n")) content = content.split("\n").map((l, i2) => i2 === 0 ? l : stripQuotes(l, depth)).join("\n");
  return content.trim();
}
function tokenize(s) {
  const tokens = [];
  const n = s.length;
  const push = (type, pos, len, open = 0, canOpen = false, canClose = false) => tokens.push({ type, pos, len, open, canOpen, canClose });
  for (let i2 = 0; i2 < n; ) {
    const c = s.charCodeAt(i2);
    if (c === 92) {
      let k = i2 + 1;
      while (s.charCodeAt(k) === 92) k++;
      const escaped = (k - i2) % 2 === 1;
      const d = s.charCodeAt(k);
      if (d === 96) {
        const j = runEnd(s, k, 96);
        push(TICK, k, j - k, escaped ? j - k - 1 : j - k);
        i2 = j;
      } else if (escaped && (d === 40 || d === 41)) {
        push(d === 40 ? OPEN_PAREN : CLOSE_PAREN, k - 1, 2);
        i2 = k + 1;
      } else {
        i2 = escaped && k < n ? k + 1 : k;
      }
    } else if (c === 96) {
      const j = runEnd(s, i2, 96);
      push(TICK, i2, j - i2, j - i2);
      i2 = j;
    } else if (c === 36) {
      const j = runEnd(s, i2, 36);
      const single2 = j - i2 === 1;
      const canOpen = single2 && j < n && !isSpace(s.charCodeAt(j));
      const next = s.charCodeAt(j);
      const canClose = single2 && i2 > 0 && !isSpace(s.charCodeAt(i2 - 1)) && !(next >= 48 && next <= 57);
      push(DOLLAR2, i2, j - i2, 0, canOpen, canClose);
      i2 = j;
    } else {
      i2++;
    }
  }
  return tokens;
}
function runEnd(s, i2, code) {
  let j = i2;
  while (s.charCodeAt(j) === code) j++;
  return j;
}
function lineStarts(lines2, base) {
  return lines2.map((l) => l.start - base);
}
function lineStartAt(starts, pos) {
  return starts[lineIndexAt(starts, pos)];
}
function lineIndexAt(starts, pos) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = lo + hi + 1 >> 1;
    if (starts[mid] <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
// core/src/scan/scanner.ts
var Output = class {
  segments = [];
  parts = [];
  textStart = 0;
  textEnd = 0;
  text(text, start) {
    if (text === "") return;
    if (this.parts.length === 0) this.textStart = start;
    this.parts.push(text);
    this.textEnd = start + text.length;
  }
  line(line) {
    this.text(line.raw, line.start);
  }
  lines(lines2) {
    for (const line of lines2) this.line(line);
  }
  segment(segment) {
    if (segment.kind === "text") return this.text(segment.text, segment.start);
    this.flushText();
    this.segments.push(segment);
  }
  take() {
    this.flushText();
    const segments = this.segments;
    this.segments = [];
    return segments;
  }
  flushText() {
    if (this.parts.length === 0) return;
    const text = this.parts.length === 1 ? this.parts[0] : this.parts.join("");
    this.segments.push({ kind: "text", text, start: this.textStart, end: this.textEnd });
    this.parts = [];
  }
};
function openEnvironment(lines2) {
  let depth = 0;
  for (const line of lines2) {
    depth += line.text.split("\\begin{").length - 1;
    depth -= line.text.split("\\end{").length - 1;
  }
  return depth > 0;
}
var Scanner2 = class {
  constructor(maxHeldLines, diagrams = false, maxDiagramLines = 400) {
    this.maxHeldLines = maxHeldLines;
    this.diagrams = diagrams;
    this.maxDiagramLines = maxDiagramLines;
  }
  maxHeldLines;
  diagrams;
  maxDiagramLines;
  state = NORMAL;
  flags = { prevBlank: true, prevCode: false, inList: false };
  /** Prose lines of the open paragraph not yet returned. */
  para = [];
  /** The paragraph's last line while a paragraph is open (its lines may already be returned). */
  paraLast = null;
  /** Display kinds whose openers are ignored on lines starting before the given offset. */
  ignore = /* @__PURE__ */ new Map();
  /** Lines waiting to be processed; a display block that gives up pushes its lines back on top. */
  frames = [];
  out = new Output();
  partial = "";
  offset = 0;
  /** The start offsets of the lines read as rows of a GFM table (its header included). */
  rows = /* @__PURE__ */ new Set();
  /** The table whose rows go on, at its blockquote depth (null outside a table). */
  table = null;
  isRow = (line) => this.rows.has(line.start);
  /** Lines a held block may hold before it is released as text. */
  holdLimit(st) {
    const diagram = st.t === "mathfence" ? st.diagram !== void 0 : DIAGRAM_ENVS2.has(st.kind);
    return diagram ? this.maxDiagramLines : this.maxHeldLines;
  }
  push(delta, final) {
    const text = this.partial + delta;
    const lines2 = [];
    let from = 0;
    for (let nl = text.indexOf("\n"); nl >= 0; nl = text.indexOf("\n", from)) {
      lines2.push(this.line(text.slice(from, nl + 1)));
      from = nl + 1;
    }
    this.partial = text.slice(from);
    if (final && this.partial !== "") {
      lines2.push(this.line(this.partial));
      this.partial = "";
    }
    this.frames.push({ lines: lines2, i: 0 });
    this.drain();
    if (final) this.finish();
    else this.settle();
    return this.out.take();
  }
  line(raw) {
    const line = makeLine(raw, this.offset);
    this.offset = line.end;
    return line;
  }
  drain() {
    while (this.frames.length > 0) {
      const frame2 = this.frames[this.frames.length - 1];
      if (frame2.i >= frame2.lines.length) this.frames.pop();
      else this.process(frame2.lines[frame2.i++]);
    }
  }
  /** End of a streaming batch: return what is settled, release what was held too long. */
  settle() {
    const st = this.state;
    if (st.t === "display" && st.lines.length > this.holdLimit(st)) {
      this.out.lines(st.lines);
      this.state = { t: "released", kind: st.kind, depth: st.depth };
    } else if (st.t === "mathfence" && st.lines.length > this.holdLimit(st)) {
      this.out.lines(st.lines);
      this.state = { t: "fence", ch: st.ch, len: st.len, indent: st.indent, depth: st.depth };
    }
    if (this.para.length > 0) {
      const { segments, cut } = scanInline(this.para, true, this.isRow);
      for (const segment of segments) this.out.segment(segment);
      let keep = 0;
      while (keep < this.para.length && this.para[keep].start < cut) keep++;
      this.para = this.para.slice(keep);
      if (this.para.length > this.maxHeldLines) this.endParagraph();
    }
  }
  /** End of the input: open display blocks give up, an open math fence is text. */
  finish() {
    for (; ; ) {
      const st = this.state;
      if (st.t === "display") {
        this.giveUp(st, Infinity, []);
        this.drain();
        continue;
      }
      if (st.t === "mathfence") this.out.lines(st.lines);
      this.state = NORMAL;
      break;
    }
    this.endParagraph();
  }
  process(line) {
    const st = this.state;
    switch (st.t) {
      case "fence":
        if (line.depth < st.depth) break;
        this.out.line(line);
        if (this.closesFence(line, st)) this.state = NORMAL;
        this.after(line);
        return;
      case "mathfence":
        if (line.depth < st.depth) {
          this.out.lines(st.lines);
          break;
        }
        st.lines.push(line);
        if (this.closesFence(line, st)) this.closeMathFence(st);
        this.after(line);
        return;
      case "display": {
        const rest = line.depth === st.depth ? restAt(line, st.depth) : null;
        if (rest !== null && line.blank && !st.lines.at(-1).blank && openEnvironment(st.lines)) {
          st.lines.push(line);
          return;
        }
        if (rest === null || line.blank || looksLikeFence(rest.trimStart())) return this.giveUp(st, line.start, [line]);
        const close = findClose(st.kind, rest, 0);
        if (!close) {
          st.lines.push(line);
          return;
        }
        if (close.ok && onlySpaceAfter(rest, close.end)) return this.closeDisplay(st, line, close.pos, close.end);
        return this.giveUp(st, line.end, [line]);
      }
      case "released": {
        const rest = line.depth === st.depth ? restAt(line, st.depth) : null;
        if (rest === null || line.blank || looksLikeFence(rest.trimStart())) break;
        const close = findClose(st.kind, rest, 0);
        if (close && !(close.ok && onlySpaceAfter(rest, close.end))) break;
        this.out.line(line);
        if (close) this.state = NORMAL;
        this.after(line);
        return;
      }
      case "normal":
        break;
    }
    this.state = NORMAL;
    this.normal(line);
  }
  normal(line) {
    const flags = this.flags;
    const before = { ...flags };
    this.tableRow(line);
    if (line.blank) {
      this.endParagraph();
      this.out.line(line);
      this.after(line);
      return;
    }
    const listItem = (line.indent <= 3 || flags.inList) && isListItem(line.body);
    if (listItem) flags.inList = true;
    else if (line.indent < 2 && flags.prevBlank) flags.inList = false;
    if (line.indent >= 4 && !flags.inList && (flags.prevBlank || flags.prevCode)) {
      this.endParagraph();
      this.out.line(line);
      this.after(line, true);
      return;
    }
    if (line.indent <= 3 || flags.inList) {
      const fence = fenceOpen(line.body.slice(0, trimEndLength(line.body)));
      if (fence) {
        this.endParagraph();
        const common = { ch: fence.ch, len: fence.len, indent: line.indent, depth: line.depth };
        if (fence.math || this.diagrams && fence.diagram) {
          this.state = { t: "mathfence", ...common, lines: [line], ...fence.math ? {} : { diagram: fence.diagram } };
        } else {
          this.state = { t: "fence", ...common };
          this.out.line(line);
        }
        this.after(line);
        return;
      }
      const open = displayOpen(line.body, this.diagrams);
      if (open && line.start >= (this.ignore.get(open.kind) ?? -1)) {
        this.endParagraph();
        if (open.oneLine) {
          const start = line.start + line.bodyStart;
          const end = start + open.oneLine.end;
          this.out.text(line.raw.slice(0, line.bodyStart), line.start);
          this.math(open.delimiter, open.oneLine.tex, line.raw.slice(line.bodyStart, line.bodyStart + open.oneLine.end), start, end, this.diagrams && DIAGRAM_ENVS2.has(open.kind) ? "env" : void 0);
          this.out.text(line.raw.slice(line.bodyStart + open.oneLine.end), end);
          this.after(line);
        } else {
          this.state = { t: "display", kind: open.kind, delimiter: open.delimiter, from: open.from, depth: line.depth, lines: [line], flags: before };
        }
        return;
      }
    }
    if (!(this.paraLast && this.continues(this.paraLast, line))) this.endParagraph();
    this.para.push(line);
    this.paraLast = line;
    this.after(line);
  }
  continues(prev, line) {
    if (line.depth !== prev.depth) return false;
    if (prev.indent <= 3 && standsAlone(prev.body)) return false;
    return !((line.indent <= 3 || this.flags.inList) && startsBlock(line.body));
  }
  /**
   * Follows GFM tables (marked's reading), before the line joins a paragraph:
   * a delimiter row right under a prose line makes that line a header and
   * starts a table; its rows go on until a blank line, a change of quote
   * depth or a line that starts another block.
   */
  tableRow(line) {
    if (this.table && (line.blank || line.depth !== this.table.depth || endsTable(line.body))) this.table = null;
    if (this.table) {
      this.rows.add(line.start);
      return;
    }
    const header = this.paraLast;
    if (header && header.depth === line.depth && delimitsTable(header.body, line.body)) {
      this.rows.add(header.start);
      this.rows.add(line.start);
      this.table = { depth: line.depth };
    }
  }
  endParagraph() {
    if (this.para.length > 0) {
      for (const segment of scanInline(this.para, false, this.isRow).segments) this.out.segment(segment);
      this.para = [];
    }
    this.paraLast = null;
  }
  after(line, code = false) {
    this.flags.prevBlank = line.blank;
    this.flags.prevCode = code;
  }
  closesFence(line, fence) {
    const rest = restAt(line, fence.depth);
    let i2 = 0;
    let cols = 0;
    for (; i2 < rest.length; i2++) {
      const c = rest.charCodeAt(i2);
      if (c === 32) cols++;
      else if (c === 9) cols += 4 - cols % 4;
      else break;
    }
    return cols <= Math.max(3, fence.indent) && closesFence(rest.slice(i2), fence.ch, fence.len);
  }
  closeMathFence(st) {
    this.state = NORMAL;
    const lines2 = st.lines;
    const first = lines2[0];
    const last = lines2[lines2.length - 1];
    const tex = lines2.slice(1, -1).map((l) => restAt(l, st.depth)).join("\n").trim();
    if (tex === "") return this.out.lines(lines2);
    const start = first.start + first.bodyStart;
    const lastRest = restAt(last, st.depth);
    const end = last.start + (last.prefixEnds[st.depth] ?? 0) + trimEndLength(lastRest);
    this.emitBlock(lines2, start, end, "fence", tex, st.diagram);
  }
  closeDisplay(st, line, closePos, closeEnd) {
    const lines2 = [...st.lines, line];
    const first = lines2[0];
    const inner = [first.body.slice(st.from), ...lines2.slice(1, -1).map((l) => restAt(l, st.depth)), restAt(line, st.depth).slice(0, closePos)];
    if (inner.join("\n").trim() === "") return this.giveUp(st, line.end, [line]);
    let tex;
    if (st.delimiter === "env") {
      inner[0] = first.body;
      inner[inner.length - 1] = restAt(line, st.depth).slice(0, closeEnd);
      tex = inner.join("\n").trim();
    } else {
      tex = inner.join("\n").trim();
    }
    this.state = NORMAL;
    const start = first.start + first.bodyStart;
    const end = line.start + (line.prefixEnds[st.depth] ?? 0) + closeEnd;
    this.emitBlock(lines2, start, end, st.delimiter, tex, this.diagrams && DIAGRAM_ENVS2.has(st.kind) ? "env" : void 0);
    this.after(line);
  }
  /** Emits a closed block: the text before its opening delimiter, the math, the rest of its last line. */
  emitBlock(lines2, start, end, delimiter, tex, diagram) {
    const first = lines2[0];
    const last = lines2[lines2.length - 1];
    const source = lines2.map((l) => l.raw).join("");
    this.out.text(source.slice(0, start - first.start), first.start);
    this.math(delimiter, tex, source.slice(start - first.start, end - first.start), start, end, diagram);
    this.out.text(last.raw.slice(end - last.start), end);
  }
  math(delimiter, tex, raw, start, end, diagram) {
    this.out.segment({ kind: "math", display: true, tex, raw, delimiter, start, end, ...diagram ? { diagram } : {} });
  }
  /**
   * A display block that was not one: its lines (and `more`) are processed again
   * as ordinary lines, its kind of opener ignored on lines starting before `until`.
   */
  giveUp(st, until, more) {
    this.ignore.set(st.kind, Math.max(this.ignore.get(st.kind) ?? -1, until));
    this.flags = st.flags;
    this.state = NORMAL;
    this.frames.push({ lines: [...st.lines, ...more], i: 0 });
  }
};
export{Scanner2,measure,rasterize,encodePng,measurePicture,rasterizePicture,encodePicturePng,pictureOutlines,strokeWeight};
