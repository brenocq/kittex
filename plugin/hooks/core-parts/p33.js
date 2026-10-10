import{inkAlpha,MIN_DASH_PERIOD,MAX_DASHES,SAME_POINT,NO_JOIN,ROUND_AS_BEVEL,ARC_FLATNESS,DEFAULT_WEIGHT,INK_MARGIN,BASELINE_SHIFT,INK_EDGE,Coverage,RULE_MIN_SNAP,encodeAlphaPng,flattenPath,RULE_MIN_FILL,flattenSubpaths,MIN_STROKE_PX,OUTLINE_EM_PX,encodeQuantizedPng,BACKSLASH,DOLLAR,TICK,DOLLAR2,CLOSE_PAREN,OPEN_PAREN}from'./p32.js';export*from'./p32.js';
// core/src/raster/paint.ts
var Canvas2 = class {
  constructor(width, height2) {
    this.width = width;
    this.height = height2;
    this.pixels = new Uint8Array(width * height2 * 4);
  }
  width;
  height;
  /** Premultiplied RGBA, row-major. */
  pixels;
  /**
   * Paints `coverage` (w × h bytes, its top-left at x0, y0 in the canvas) in
   * `color` at `opacity`, through `mask` (the canvas's size, a clip) when given.
   */
  paint(coverage, x0, y0, w, h, color, opacity, mask) {
    const px2 = this.pixels;
    const W = this.width;
    const erase = color === "erase";
    const r = erase ? 0 : color.r;
    const g = erase ? 0 : color.g;
    const b = erase ? 0 : color.b;
    const k = Math.min(1, Math.max(0, opacity)) / 255;
    for (let y = 0; y < h; y++) {
      const cy = y0 + y;
      if (cy < 0 || cy >= this.height) continue;
      for (let x2 = 0; x2 < w; x2++) {
        const c = coverage[y * w + x2];
        if (c === 0) continue;
        const cx = x0 + x2;
        if (cx < 0 || cx >= W) continue;
        const at = cy * W + cx;
        let a = c * k;
        if (mask) {
          const m = mask[at];
          if (m === 0) continue;
          a = a * m / 255;
        }
        const keep = 1 - a;
        const i2 = at * 4;
        if (erase) {
          px2[i2] = px2[i2] * keep + 0.5;
          px2[i2 + 1] = px2[i2 + 1] * keep + 0.5;
          px2[i2 + 2] = px2[i2 + 2] * keep + 0.5;
          px2[i2 + 3] = px2[i2 + 3] * keep + 0.5;
        } else {
          px2[i2] = r * a + px2[i2] * keep + 0.5;
          px2[i2 + 1] = g * a + px2[i2 + 1] * keep + 0.5;
          px2[i2 + 2] = b * a + px2[i2 + 2] * keep + 0.5;
          px2[i2 + 3] = 255 * a + px2[i2 + 3] * keep + 0.5;
        }
      }
    }
  }
  /**
   * The pixels with straight alpha, for a PNG; with `over`, each pixel's
   * alpha corrected for its colour as the terminal corrects text blended over
   * that background (inkAlpha: Ghostty's linear-corrected blending).
   */
  straight(over) {
    const px2 = this.pixels;
    const out = new Uint8Array(px2.length);
    const tables = /* @__PURE__ */ new Map();
    for (let i2 = 0; i2 < px2.length; i2 += 4) {
      const a = px2[i2 + 3];
      if (a === 0) continue;
      const half = a >> 1;
      const r0 = (px2[i2] * 255 + half) / a | 0;
      const g0 = (px2[i2 + 1] * 255 + half) / a | 0;
      const b0 = (px2[i2 + 2] * 255 + half) / a | 0;
      const r = r0 > 255 ? 255 : r0;
      const g = g0 > 255 ? 255 : g0;
      const b = b0 > 255 ? 255 : b0;
      out[i2] = r;
      out[i2 + 1] = g;
      out[i2 + 2] = b;
      if (!over || a === 255) {
        out[i2 + 3] = a;
        continue;
      }
      const key = r << 16 | g << 8 | b;
      let table2 = tables.get(key);
      if (!table2) {
        if (tables.size >= 4096) {
          out[i2 + 3] = Math.round(255 * inkAlpha(a / 255, { r, g, b }, over));
          continue;
        }
        table2 = correctionTable({ r, g, b }, over);
        tables.set(key, table2);
      }
      out[i2 + 3] = table2[a];
    }
    return out;
  }
};
function correctionTable(color, over) {
  const table2 = new Uint8Array(256);
  for (let a = 0; a < 256; a++) table2[a] = a === 0 || a === 255 ? a : Math.round(255 * inkAlpha(a / 255, color, over));
  return table2;
}
// core/src/raster/stroke.ts
function strokeOutlines(subpaths, g) {
  const hw = g.width / 2;
  if (!(hw > 0)) return [];
  const out = [];
  for (const piece of dashed(subpaths, g)) strokePiece(piece, hw, g, out);
  for (const c of out) if (area(c) < 0) reverse(c);
  return out;
}
function dashed(subpaths, g) {
  const dash = g.dash;
  if (!dash || dash.length === 0) return [...subpaths];
  const period = dash.reduce((sum2, n) => sum2 + n, 0);
  if (!(period >= MIN_DASH_PERIOD)) return [...subpaths];
  const pieces = [];
  for (const sub of subpaths) {
    const pts = sub.points.slice();
    if (sub.closed) pts.push(pts[0], pts[1]);
    let phase = ((g.dashOffset ?? 0) % period + period) % period;
    let k = 0;
    while (phase >= dash[k]) {
      phase -= dash[k];
      k = (k + 1) % dash.length;
    }
    let left = dash[k] - phase;
    let on = k % 2 === 0;
    let current = on ? [pts[0], pts[1]] : [];
    for (let i2 = 0; i2 + 3 < pts.length; i2 += 2) {
      const x0 = pts[i2], y0 = pts[i2 + 1], x1 = pts[i2 + 2], y1 = pts[i2 + 3];
      const len = Math.hypot(x1 - x0, y1 - y0);
      let at = 0;
      while (len - at > left) {
        at += left;
        const t = at / len;
        const x2 = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        if (on) {
          current.push(x2, y);
          pieces.push({ points: current, closed: false });
          if (pieces.length > MAX_DASHES) return [...subpaths];
          current = [];
        } else {
          current = [x2, y];
        }
        on = !on;
        k = (k + 1) % dash.length;
        left = dash[k];
      }
      left -= len - at;
      if (on) current.push(x1, y1);
    }
    if (on && current.length >= 4) pieces.push({ points: current, closed: false });
  }
  return pieces;
}
function strokePiece(sub, hw, g, out) {
  const pts = [];
  for (let i2 = 0; i2 + 1 < sub.points.length; i2 += 2) {
    const x2 = sub.points[i2];
    const y = sub.points[i2 + 1];
    const n2 = pts.length;
    if (n2 >= 2 && Math.abs(x2 - pts[n2 - 2]) < SAME_POINT && Math.abs(y - pts[n2 - 1]) < SAME_POINT) continue;
    pts.push(x2, y);
  }
  let closed = sub.closed;
  if (closed && pts.length >= 4 && Math.abs(pts[0] - pts[pts.length - 2]) < SAME_POINT && Math.abs(pts[1] - pts[pts.length - 1]) < SAME_POINT) pts.length -= 2;
  const n = pts.length / 2;
  if (n < 2) {
    if (n === 1 && g.cap !== "butt" && sub.points.length >= 4) {
      const x2 = pts[0], y = pts[1];
      out.push(g.cap === "round" ? circle(x2, y, hw) : [x2 - hw, y - hw, x2 + hw, y - hw, x2 + hw, y + hw, x2 - hw, y + hw]);
    }
    return;
  }
  if (n === 2) closed = false;
  const segments = closed ? n : n - 1;
  const dx = new Float64Array(segments);
  const dy = new Float64Array(segments);
  for (let i2 = 0; i2 < segments; i2++) {
    const j = (i2 + 1) % n;
    const ex = pts[2 * j] - pts[2 * i2];
    const ey = pts[2 * j + 1] - pts[2 * i2 + 1];
    const len = Math.hypot(ex, ey);
    dx[i2] = ex / len;
    dy[i2] = ey / len;
  }
  for (let i2 = 0; i2 < segments; i2++) {
    const j = (i2 + 1) % n;
    const nx = -dy[i2] * hw;
    const ny = dx[i2] * hw;
    const ax = pts[2 * i2], ay = pts[2 * i2 + 1], bx = pts[2 * j], by = pts[2 * j + 1];
    out.push([ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny]);
  }
  const first = closed ? 0 : 1;
  const last = closed ? n - 1 : n - 2;
  for (let v = first; v <= last; v++) {
    const into = (v - 1 + segments) % segments;
    const from = v % segments;
    join(pts[2 * v], pts[2 * v + 1], dx[into], dy[into], dx[from], dy[from], hw, g, out);
  }
  if (!closed) {
    cap(pts[0], pts[1], -dx[0], -dy[0], hw, g.cap, out);
    cap(pts[2 * n - 2], pts[2 * n - 1], dx[segments - 1], dy[segments - 1], hw, g.cap, out);
  }
}
function join(x2, y, ix, iy, ox, oy, hw, g, out) {
  const cross = ix * oy - iy * ox;
  const dot = ix * ox + iy * oy;
  const turn = Math.atan2(Math.abs(cross), dot);
  if (hw * turn < NO_JOIN) return;
  const s = cross > 0 ? -1 : 1;
  const ax = x2 + s * -iy * hw;
  const ay = y + s * ix * hw;
  const bx = x2 + s * -oy * hw;
  const by = y + s * ox * hw;
  if (g.join === "round" && hw * turn > ROUND_AS_BEVEL) {
    out.push(circle(x2, y, hw));
    return;
  }
  if (g.join === "miter") {
    const ratio = 1 / Math.sqrt(Math.max(1e-12, (1 + dot) / 2));
    if (ratio <= g.miterLimit) {
      let mx = -iy - oy;
      let my = ix + ox;
      const len = Math.hypot(mx, my);
      if (len > 1e-9) {
        mx = mx / len * s * hw * ratio;
        my = my / len * s * hw * ratio;
        out.push([x2, y, ax, ay, x2 + mx, y + my, bx, by]);
        return;
      }
    }
  }
  out.push([x2, y, ax, ay, bx, by]);
}
function cap(x2, y, dx, dy, hw, kind, out) {
  if (kind === "round") {
    out.push(circle(x2, y, hw));
  } else if (kind === "square") {
    const nx = -dy * hw;
    const ny = dx * hw;
    const ex = x2 + dx * hw;
    const ey = y + dy * hw;
    out.push([x2 + nx, y + ny, ex + nx, ey + ny, ex - nx, ey - ny, x2 - nx, y - ny]);
  }
}
function circle(x2, y, r) {
  const k = r <= ARC_FLATNESS ? 6 : Math.min(128, Math.max(6, Math.ceil(Math.PI / Math.acos(1 - ARC_FLATNESS / r))));
  const c = [];
  for (let i2 = 0; i2 < k; i2++) {
    const t = 2 * Math.PI * i2 / k;
    c.push(x2 + r * Math.cos(t), y + r * Math.sin(t));
  }
  return c;
}
function area(c) {
  let sum2 = 0;
  const n = c.length;
  let x0 = c[n - 2];
  let y0 = c[n - 1];
  for (let i2 = 0; i2 < n; i2 += 2) {
    sum2 += x0 * c[i2 + 1] - c[i2] * y0;
    x0 = c[i2];
    y0 = c[i2 + 1];
  }
  return sum2 / 2;
}
function reverse(c) {
  for (let i2 = 0, j = c.length - 2; i2 < j; i2 += 2, j -= 2) {
    const x2 = c[i2];
    const y = c[i2 + 1];
    c[i2] = c[j];
    c[i2 + 1] = c[j + 1];
    c[j] = x2;
    c[j + 1] = y;
  }
}
function snapStroke(subpaths, width) {
  const whole = Math.max(1, Math.round(width));
  const at = (v) => whole % 2 === 1 ? Math.floor(v) + 0.5 : Math.round(v);
  let snapped = false;
  for (const sub of subpaths) {
    const p = sub.points;
    if (sub.closed && p.length >= 6 && Math.abs(p[0] - p[p.length - 2]) < SAME_POINT && Math.abs(p[1] - p[p.length - 1]) < SAME_POINT) p.length -= 2;
    const n = p.length / 2;
    const segments = sub.closed ? n : n - 1;
    const snapX = new Uint8Array(n);
    const snapY = new Uint8Array(n);
    for (let i2 = 0; i2 < segments; i2++) {
      const j = (i2 + 1) % n;
      const ex = p[2 * j] - p[2 * i2];
      const ey = p[2 * j + 1] - p[2 * i2 + 1];
      const len = Math.hypot(ex, ey);
      if (!(len > 0)) continue;
      if (Math.abs(ey) < 1e-3 * len) snapY[i2] = snapY[j] = 1;
      else if (Math.abs(ex) < 1e-3 * len) snapX[i2] = snapX[j] = 1;
    }
    for (let i2 = 0; i2 < n; i2++) {
      if (snapX[i2]) p[2 * i2] = at(p[2 * i2]);
      if (snapY[i2]) p[2 * i2 + 1] = at(p[2 * i2 + 1]);
      if (snapX[i2] || snapY[i2]) snapped = true;
    }
  }
  return snapped ? whole : width;
}
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
export{DIAGRAM_ENVS2,makeLine,scanInline,restAt,looksLikeFence,findClose,onlySpaceAfter,isListItem,fenceOpen,trimEndLength,displayOpen,standsAlone,startsBlock,endsTable,delimitsTable,closesFence,measure,rasterize,encodePng,measurePicture,rasterizePicture,encodePicturePng,pictureOutlines,strokeWeight};
