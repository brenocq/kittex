import{NORMAL,DIAGRAM_ENVS2,makeLine,scanInline,restAt,looksLikeFence,findClose,onlySpaceAfter,isListItem,fenceOpen,trimEndLength,displayOpen,standsAlone,startsBlock,endsTable,delimitsTable,closesFence,init_errors,init_engine,__toCommonJS,engine_exports,GlyphError,WIDE,BOLD,DOUBLE_HOLES,SCRIPT_HOLES,FRAKTUR_HOLES,SANS,SANS_BOLD,OPERATORS,ORDERS,RANGES2,ORDER,TEXSPACE2,ENTITIES2,MAX_DEPTH2,DOT_PRIMES}from'./p33.js';export*from'./p33.js';
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
// core/src/scan/index.ts
function scan(markdown, options3 = {}) {
  return new Scanner2(Infinity, options3.diagrams === true, Infinity).push(markdown, true);
}
function createLineScanner(options3 = {}) {
  const scanner = new Scanner2(Math.max(1, options3.maxHeldLines ?? 40), options3.diagrams === true, Math.max(1, options3.maxDiagramLines ?? 400));
  return { push: (delta, final) => scanner.push(delta, final) };
}
// core/src/typeset/index.ts
init_errors();
// core/src/typeset/load.ts
var engine2;
function loadEngine() {
  return engine2 ??= (init_engine(), __toCommonJS(engine_exports));
}
function engineLoaded() {
  return engine2 !== void 0;
}
// core/src/typeset/index.ts
init_errors();
var SUPERSCRIPT_TEX = Object.fromEntries(
  [..."⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ"].map((c, i2) => [c, "0123456789+-=()ni"[i2]])
);
var SUBSCRIPT_TEX = Object.fromEntries(
  [..."₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₕₖₗₘₙₚₛₜ"].map((c, i2) => [c, "0123456789+-=()aeoxhklmnpst"[i2]])
);
var SCRIPT_RUN = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]+|[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₕₖₗₘₙₚₛₜ]+/g;
function texScripts(tex) {
  return tex.replace(SCRIPT_RUN, (run2) => {
    const sup = SUPERSCRIPT_TEX[run2[0]] !== void 0;
    const table2 = sup ? SUPERSCRIPT_TEX : SUBSCRIPT_TEX;
    return `${sup ? "^" : "_"}{${[...run2].map((c) => table2[c]).join("")}}`;
  });
}
function initTypeset() {
  try {
    loadEngine().prepare();
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
}
function typesetLoaded() {
  return engineLoaded();
}
function typeset(tex, options3) {
  const engine3 = loadEngine();
  try {
    return engine3.typesetOnce(tex, options3);
  } catch (error) {
    if (!(error instanceof GlyphError)) throw error;
    const scripted = texScripts(tex);
    if (scripted === tex) throw error;
    return engine3.typesetOnce(scripted, options3);
  }
}
function texToMathML2(tex, options3) {
  return loadEngine().texToMathML(tex, options3);
}
// core/src/unicode/box.ts
var Unsupported = class extends Error {
  name = "Unsupported";
};
function fail(what) {
  throw new Unsupported(what);
}
var ZERO_WIDTH = /^[\p{Mn}\p{Me}\p{Cf}]$/u;
function charWidth(cp) {
  if (cp < 768) return cp < 32 || cp >= 127 && cp < 160 ? 0 : 1;
  if (ZERO_WIDTH.test(String.fromCodePoint(cp)) || cp >= 4448 && cp <= 4607) return 0;
  if (cp < 4352) return 1;
  let lo = 0;
  let hi = WIDE.length - 1;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    const [start, end] = WIDE[mid];
    if (cp < start) hi = mid - 1;
    else if (cp > end) lo = mid + 1;
    else return 2;
  }
  return 1;
}
function toCells(text) {
  const cells2 = [];
  let last = -1;
  for (const ch of text) {
    const width = charWidth(ch.codePointAt(0));
    if (width === 0) {
      if (last < 0) {
        if (/\p{Cf}/u.test(ch)) continue;
        cells2.push(" ");
        last = 0;
      }
      cells2[last] += ch;
    } else {
      last = cells2.length;
      cells2.push(ch);
      if (width === 2) cells2.push("");
    }
  }
  return cells2;
}
function textBox(text) {
  const cells2 = toCells(text);
  return { rows: [cells2], width: cells2.length, base: 0 };
}
function blank(width, height2 = 1, base = 0) {
  return { rows: Array.from({ length: height2 }, () => Array(width).fill(" ")), width, base };
}
function height(box) {
  return box.rows.length;
}
function above(box) {
  return box.base;
}
function below(box) {
  return box.rows.length - box.base - 1;
}
function hcat(boxes) {
  if (boxes.length === 1) return boxes[0];
  const up = Math.max(0, ...boxes.map(above));
  const down = Math.max(0, ...boxes.map(below));
  const rows = Array.from({ length: up + down + 1 }, () => []);
  let width = 0;
  for (const box of boxes) {
    const top = up - box.base;
    for (let r = 0; r < rows.length; r++) {
      const row = box.rows[r - top];
      if (row) rows[r].push(...row);
      else for (let c = 0; c < box.width; c++) rows[r].push(" ");
    }
    width += box.width;
  }
  return { rows, width, base: up };
}
function widen(box, width, align) {
  if (box.width >= width) return box;
  const extra = width - box.width;
  const left = align === "left" ? 0 : align === "right" ? extra : Math.floor(extra / 2);
  return pad(box, left, extra - left);
}
function pad(box, left, right) {
  if (left === 0 && right === 0) return box;
  const l = Array(left).fill(" ");
  const r = Array(right).fill(" ");
  return { rows: box.rows.map((row) => [...l, ...row, ...r]), width: box.width + left + right, base: box.base };
}
function vstack(boxes, align, base) {
  const width = Math.max(0, ...boxes.map((b) => b.width));
  const rows = boxes.flatMap((b) => widen(b, width, align).rows);
  return { rows, width, base };
}
function extend(box, up, down) {
  const addUp = Math.max(0, up - above(box));
  const addDown = Math.max(0, down - below(box));
  if (addUp === 0 && addDown === 0) return box;
  const blankRow = () => Array(box.width).fill(" ");
  return {
    rows: [...Array.from({ length: addUp }, blankRow), ...box.rows, ...Array.from({ length: addDown }, blankRow)],
    width: box.width,
    base: box.base + addUp
  };
}
function phantom(box) {
  return blank(box.width, box.rows.length, box.base);
}
function isBlank2(box) {
  return box.rows.every((row) => row.every((cell) => cell === " " || cell === ""));
}
function lines(box) {
  return box.rows.map((row) => row.join(""));
}
// core/src/unicode/chars.ts
var SUPERSCRIPTS = pairs2(
  "0⁰1¹2²3³4⁴5⁵6⁶7⁷8⁸9⁹+⁺−⁻-⁻=⁼(⁽)⁾aᵃbᵇcᶜdᵈeᵉfᶠgᵍhʰiⁱjʲkᵏlˡmᵐnⁿoᵒpᵖrʳsˢtᵗuᵘvᵛwʷxˣyʸzᶻAᴬBᴮDᴰEᴱGᴳHᴴIᴵJᴶKᴷLᴸMᴹNᴺOᴼPᴾRᴿTᵀUᵁVⱽWᵂαᵅβᵝγᵞδᵟεᵋϵᵋθᶿιᶥφᵠϕᵠχᵡ′′″″‴‴⁗⁗∗***††‡‡⊤ᵀ⊺ᵀ∘°°°  "
);
var SUBSCRIPTS = pairs2(
  "0₀1₁2₂3₃4₄5₅6₆7₇8₈9₉+₊−₋-₋=₌(₍)₎aₐeₑhₕiᵢjⱼkₖlₗmₘnₙoₒpₚrᵣsₛtₜuᵤvᵥxₓβᵦγᵧρᵨφᵩϕᵩχᵪ  "
);
function pairs2(spec) {
  const chars = [...spec];
  const map = /* @__PURE__ */ new Map();
  for (let i2 = 0; i2 + 1 < chars.length; i2 += 2) map.set(chars[i2], chars[i2 + 1]);
  for (const ch of ",.;:") map.set(ch, ch);
  return map;
}
var SCRIPT_BARS = /* @__PURE__ */ new Map([
  ["|", "|"],
  ["∣", "|"]
]);
function mapScript(cells2, table2) {
  const chars = cells2.filter((cell) => cell !== "");
  let out = "";
  for (const [i2, cell] of chars.entries()) {
    const mapped = table2.get(cell) ?? table2.get(plainLetter(cell));
    if (mapped !== void 0) {
      out += mapped;
      continue;
    }
    const bar = SCRIPT_BARS.get(cell);
    const next = chars[i2 + 1];
    if (bar === void 0 || out === "" || next === void 0 || (table2.get(next) ?? table2.get(plainLetter(next))) === void 0) return void 0;
    out += bar;
  }
  return out;
}
function plainLetter(ch) {
  const cp = ch.codePointAt(0);
  for (const start of [120224, 120432]) {
    if (cp >= start && cp < start + 52) return String.fromCharCode((cp - start < 26 ? 65 : 97 - 26) + cp - start);
  }
  return ch;
}
var ALPHABETS = {
  bold: BOLD,
  "bold-italic": BOLD,
  "double-struck": { latin: 120120, digits: 120792, holes: DOUBLE_HOLES },
  script: { latin: 119964, holes: SCRIPT_HOLES },
  "bold-script": { latin: 120016 },
  fraktur: { latin: 120068, holes: FRAKTUR_HOLES },
  "bold-fraktur": { latin: 120172 },
  "sans-serif": SANS,
  "sans-serif-italic": SANS,
  "bold-sans-serif": SANS_BOLD,
  "sans-serif-bold-italic": SANS_BOLD,
  monospace: { latin: 120432, digits: 120822 }
};
var GREEK_INDEX = /* @__PURE__ */ new Map();
for (let cp = 913; cp <= 937; cp++) if (cp !== 930) GREEK_INDEX.set(cp, cp - 913);
GREEK_INDEX.set(1012, 17);
GREEK_INDEX.set(8711, 25);
for (let cp = 945; cp <= 969; cp++) GREEK_INDEX.set(cp, cp - 945 + 26);
for (const [i2, cp] of [8706, 1013, 977, 1008, 981, 1009, 982].entries()) GREEK_INDEX.set(cp, 51 + i2);
function styleChar(ch, variant) {
  const alphabet = ALPHABETS[variant];
  if (!alphabet) return ch;
  const hole = alphabet.holes?.[ch];
  if (hole) return hole;
  const cp = ch.codePointAt(0);
  if (alphabet.latin !== void 0) {
    if (cp >= 65 && cp <= 90) return String.fromCodePoint(alphabet.latin + cp - 65);
    if (cp >= 97 && cp <= 122) return String.fromCodePoint(alphabet.latin + 26 + cp - 97);
  }
  if (alphabet.digits !== void 0 && cp >= 48 && cp <= 57) return String.fromCodePoint(alphabet.digits + cp - 48);
  const greek = GREEK_INDEX.get(cp);
  if (alphabet.greek !== void 0 && greek !== void 0) return String.fromCodePoint(alphabet.greek + greek);
  return ch;
}
function styleText(text, variant) {
  if (!variant || !ALPHABETS[variant]) return text;
  let out = "";
  for (const ch of text) out += styleChar(ch, variant);
  return out;
}
var OVER_ACCENTS = /* @__PURE__ */ new Map(JSON.parse(`[
 ["^",{"mark":"\u0302","glyph":"^"}],
 ["ˆ",{"mark":"\u0302","glyph":"^"}],
 ["ˇ",{"mark":"\u030C","glyph":"ˇ"}],
 ["~",{"mark":"\u0303","glyph":"~"}],
 ["˜",{"mark":"\u0303","glyph":"~"}],
 ["¯",{"mark":"\u0304","glyph":"_","wide":true}],
 ["ˉ",{"mark":"\u0304","glyph":"_","wide":true}],
 ["‾",{"mark":"\u0305","glyph":"_","wide":true}],
 ["―",{"mark":"\u0305","glyph":"_","wide":true}],
 ["─",{"mark":"\u0305","glyph":"_","wide":true}],
 ["_",{"mark":"\u0305","glyph":"_","wide":true}],
 ["˙",{"mark":"\u0307","glyph":"˙"}],
 ["¨",{"mark":"\u0308","glyph":"¨"}],
 ["\u20DB",{"mark":"\u20DB","glyph":"⋯"}],
 ["\u20DC",{"mark":"\u20DC","glyph":"⋯"}],
 ["´",{"mark":"\u0301","glyph":"´"}],
 ["ˊ",{"mark":"\u0301","glyph":"´"}],
 ["\`",{"mark":"\u0300","glyph":"\`"}],
 ["ˋ",{"mark":"\u0300","glyph":"\`"}],
 ["˘",{"mark":"\u0306","glyph":"˘"}],
 ["˚",{"mark":"\u030A","glyph":"°"}],
 ["→",{"mark":"\u20D7","glyph":"→","arrow":"right"}],
 ["\u20D7",{"mark":"\u20D7","glyph":"→","arrow":"right"}],
 ["←",{"mark":"\u20D6","glyph":"←","arrow":"left"}],
 ["↔",{"mark":"\u20E1","glyph":"↔","arrow":"both"}]
]`));
var UNDER_ACCENTS = /* @__PURE__ */ new Map(JSON.parse(`[
 ["―",{"mark":"\u0332","glyph":"‾","wide":true}],
 ["_",{"mark":"\u0332","glyph":"‾","wide":true}],
 ["‾",{"mark":"\u0332","glyph":"‾","wide":true}],
 ["¯",{"mark":"\u0332","glyph":"‾","wide":true}],
 ["─",{"mark":"\u0332","glyph":"‾","wide":true}],
 ["~",{"mark":"\u0330","glyph":"~"}],
 ["˜",{"mark":"\u0330","glyph":"~"}],
 ["→",{"mark":"\u20EF","glyph":"→","arrow":"right"}],
 ["←",{"mark":"\u20EE","glyph":"←","arrow":"left"}],
 ["↔",{"mark":"\u034D","glyph":"↔","arrow":"both"}]
]`));
function arrowRow(kind, width, double = false) {
  const line = double ? "═" : "─";
  const [l, r] = double ? ["⇐", "⇒"] : ["←", "→"];
  if (width <= 1) return kind === "right" ? r : kind === "left" ? l : double ? "⇔" : "↔";
  if (kind === "right") return line.repeat(width - 1) + r;
  if (kind === "left") return l + line.repeat(width - 1);
  return l + line.repeat(Math.max(0, width - 2)) + r;
}
var STRETCHY_ARROWS = /* @__PURE__ */ new Map([
  ["→", (w) => arrowRow("right", w)],
  ["⟶", (w) => arrowRow("right", w)],
  ["←", (w) => arrowRow("left", w)],
  ["⟵", (w) => arrowRow("left", w)],
  ["↔", (w) => arrowRow("both", w)],
  ["⟷", (w) => arrowRow("both", w)],
  ["⇒", (w) => arrowRow("right", w, true)],
  ["⟹", (w) => arrowRow("right", w, true)],
  ["⇐", (w) => arrowRow("left", w, true)],
  ["⟸", (w) => arrowRow("left", w, true)],
  ["⇔", (w) => arrowRow("both", w, true)],
  ["⟺", (w) => arrowRow("both", w, true)],
  ["↦", (w) => w <= 1 ? "↦" : "├" + "─".repeat(Math.max(0, w - 2)) + "→"],
  ["⟼", (w) => w <= 1 ? "↦" : "├" + "─".repeat(Math.max(0, w - 2)) + "→"]
]);
function braceRow(ch, width) {
  const w = Math.max(1, width);
  const span = (l, mid, r, tip) => {
    if (w === 1) return tip;
    if (w === 2) return l + r;
    if (!mid) return l + "─".repeat(w - 2) + r;
    const left = Math.floor((w - 3) / 2);
    return l + "─".repeat(left) + mid + "─".repeat(w - 3 - left) + r;
  };
  switch (ch) {
    case "⏞":
      return span("╭", "┴", "╮", "┴");
    case "⏟":
      return span("╰", "┬", "╯", "┬");
    case "⏜":
      return span("╭", "", "╮", "⌒");
    case "⏝":
      return span("╰", "", "╯", "‿");
    case "⎴":
      return span("┌", "", "┐", "┬");
    case "⎵":
      return span("└", "", "┘", "┴");
  }
  return void 0;
}
var FENCES = /* @__PURE__ */ new Set(["(", ")", "[", "]", "{", "}", "|", "‖", "∥", "⌊", "⌋", "⌈", "⌉", "⟨", "⟩", "⟦", "⟧", "/", "\\", ""]);
function tallDelimiter(ch, rows, base) {
  if (rows <= 1) return [ch === "∥" ? "‖" : ch];
  const column = (top, mid, bottom) => [top, ...Array(rows - 2).fill(mid), bottom];
  switch (ch) {
    case "(":
      return column("⎛", "⎜", "⎝");
    case ")":
      return column("⎞", "⎟", "⎠");
    case "[":
      return column("⎡", "⎢", "⎣");
    case "]":
      return column("⎤", "⎥", "⎦");
    case "⌈":
      return column("⎡", "⎢", "⎢");
    case "⌉":
      return column("⎤", "⎥", "⎥");
    case "⌊":
      return column("⎢", "⎢", "⎣");
    case "⌋":
      return column("⎥", "⎥", "⎦");
    case "⟦":
      return column("╓", "║", "╙");
    case "⟧":
      return column("╖", "║", "╜");
    case "|":
      return Array(rows).fill("│");
    case "‖":
    case "∥":
      return Array(rows).fill("║");
    case "{":
    case "}": {
      const [top, mid, bottom, ext] = ch === "{" ? ["⎧", "⎨", "⎩", "⎪"] : ["⎫", "⎬", "⎭", "⎪"];
      if (rows === 2) return ch === "{" ? ["⎰", "⎱"] : ["⎱", "⎰"];
      const middle = base > 0 && base < rows - 1 ? base : Math.floor(rows / 2);
      return Array.from({ length: rows }, (_, r) => r === 0 ? top : r === rows - 1 ? bottom : r === middle ? mid : ext);
    }
    case "⟨":
    case "⟩": {
      const [up, down] = ch === "⟨" ? ["╱", "╲"] : ["╲", "╱"];
      const half = rows / 2;
      return Array.from({ length: rows }, (_, r) => r < Math.floor(half) ? up : r >= Math.ceil(half) ? down : ch);
    }
    case "/":
      return Array(rows).fill("╱");
    case "\\":
      return Array(rows).fill("╲");
    case "":
      return Array(rows).fill("");
  }
  return Array.from({ length: rows }, (_, r) => r === base ? ch : " ");
}
function tallIntegral(rows) {
  if (rows <= 1) return ["∫"];
  return ["⌠", ...Array(rows - 2).fill("⎮"), "⌡"];
}
var VULGAR = /* @__PURE__ */ new Map([
  ["1/2", "½"],
  ["1/3", "⅓"],
  ["2/3", "⅔"],
  ["1/4", "¼"],
  ["3/4", "¾"],
  ["1/5", "⅕"],
  ["2/5", "⅖"],
  ["3/5", "⅗"],
  ["4/5", "⅘"],
  ["1/6", "⅙"],
  ["5/6", "⅚"],
  ["1/7", "⅐"],
  ["1/8", "⅛"],
  ["3/8", "⅜"],
  ["5/8", "⅝"],
  ["7/8", "⅞"],
  ["1/9", "⅑"],
  ["1/10", "⅒"]
]);
// core/src/unicode/opclass.ts
// core/src/unicode/classes.ts
var CLASS_NAMES = /* @__PURE__ */ new Set(["ORD", "OP", "BIN", "REL", "OPEN", "CLOSE", "PUNCT", "INNER", "NONE"]);
function parseClass(name) {
  return name !== void 0 && CLASS_NAMES.has(name) ? name : void 0;
}
var TABLES = Object.fromEntries(
  Object.keys(OPERATORS).map((form) => {
    const map = /* @__PURE__ */ new Map();
    for (const [cls, chars] of Object.entries(OPERATORS[form])) for (const ch of chars) map.set(ch, cls);
    return [form, map];
  })
);
function operatorClass(text, form) {
  for (const f of ORDERS[form]) {
    const cls = TABLES[f].get(text);
    if (cls) return cls;
  }
  if (/^[a-zA-Z]{2,}$/.test(text)) return "OP";
  const cp = text.codePointAt(0);
  if (cp === void 0) return "ORD";
  for (const [start, end, cls] of RANGES2) {
    if (cp <= end) return cp >= start ? cls : "REL";
  }
  return "REL";
}
function inForm(text, form) {
  return TABLES[form].has(text);
}
function texSpace(left, right, script2) {
  const l = ORDER.indexOf(left);
  const r = ORDER.indexOf(right);
  if (l < 0 || r < 0) return 0;
  const space = TEXSPACE2[l][r];
  if (space < 0) return -space;
  return script2 ? 0 : space;
}
// core/src/unicode/xml.ts
var NAME2 = /[A-Za-z_][-A-Za-z0-9_.:]*/y;
var SPACE4 = /\s*/y;
function parseXml2(source) {
  let pos = 0;
  const skipSpace = () => {
    SPACE4.lastIndex = pos;
    SPACE4.exec(source);
    pos = SPACE4.lastIndex;
  };
  const readName = () => {
    NAME2.lastIndex = pos;
    const match = NAME2.exec(source);
    if (!match) fail(`XML: name expected at ${pos}`);
    pos = NAME2.lastIndex;
    const colon = match[0].lastIndexOf(":");
    return colon >= 0 ? match[0].slice(colon + 1) : match[0];
  };
  const decode2 = (raw) => raw.indexOf("&") < 0 ? raw : raw.replace(/&([#\w]*)(;?)/g, (_whole, ref, semi) => {
    if (!semi) fail("XML: unterminated reference");
    if (ref.startsWith("#")) {
      const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      if (!/^#(x[0-9a-fA-F]+|X[0-9a-fA-F]+|[0-9]+)$/.test(ref) || !(code >= 0 && code <= 1114111)) fail(`XML: bad reference &${ref};`);
      return String.fromCodePoint(code);
    }
    const value = ENTITIES2[ref];
    return value ?? fail(`XML: unknown entity &${ref};`);
  });
  const skipMisc = () => {
    for (; ; ) {
      skipSpace();
      if (source.startsWith("<?", pos)) {
        const end = source.indexOf("?>", pos);
        if (end < 0) fail("XML: unterminated processing instruction");
        pos = end + 2;
      } else if (source.startsWith("<!--", pos)) {
        const end = source.indexOf("-->", pos);
        if (end < 0) fail("XML: unterminated comment");
        pos = end + 3;
      } else if (source.startsWith("<!DOCTYPE", pos)) {
        const end = source.indexOf(">", pos);
        if (end < 0) fail("XML: unterminated doctype");
        pos = end + 1;
      } else return;
    }
  };
  const readElement = (depth) => {
    if (depth > MAX_DEPTH2) fail("XML: too deep");
    if (source[pos] !== "<") fail(`XML: element expected at ${pos}`);
    pos++;
    const name = readName();
    const attrs = {};
    for (; ; ) {
      skipSpace();
      const ch = source[pos];
      if (ch === "/" && source[pos + 1] === ">") {
        pos += 2;
        return { name, attrs, children: [] };
      }
      if (ch === ">") {
        pos++;
        break;
      }
      const key = readName();
      skipSpace();
      if (source[pos] !== "=") fail("XML: = expected");
      pos++;
      skipSpace();
      const quote = source[pos];
      if (quote !== '"' && quote !== "'") fail("XML: quoted value expected");
      const end = source.indexOf(quote, pos + 1);
      if (end < 0) fail("XML: unterminated attribute");
      const raw = source.slice(pos + 1, end);
      if (raw.includes("<")) fail("XML: < in attribute");
      if (key in attrs) fail(`XML: duplicate attribute ${key}`);
      attrs[key] = decode2(raw);
      pos = end + 1;
    }
    const children = [];
    for (; ; ) {
      if (pos >= source.length) fail(`XML: unclosed <${name}>`);
      if (source.startsWith("</", pos)) {
        pos += 2;
        const close = readName();
        if (close !== name) fail(`XML: </${close}> closes <${name}>`);
        skipSpace();
        if (source[pos] !== ">") fail("XML: > expected");
        pos++;
        return { name, attrs, children };
      }
      if (source.startsWith("<!--", pos)) {
        const end = source.indexOf("-->", pos);
        if (end < 0) fail("XML: unterminated comment");
        pos = end + 3;
      } else if (source.startsWith("<![CDATA[", pos)) {
        const end = source.indexOf("]]>", pos);
        if (end < 0) fail("XML: unterminated CDATA");
        pushText(children, source.slice(pos + 9, end));
        pos = end + 3;
      } else if (source[pos] === "<") {
        children.push(readElement(depth + 1));
      } else {
        let end = source.indexOf("<", pos);
        if (end < 0) end = source.length;
        pushText(children, decode2(source.slice(pos, end)));
        pos = end;
      }
    }
  };
  skipMisc();
  const root2 = readElement(0);
  skipMisc();
  if (pos !== source.length) fail("XML: content after the root element");
  return root2;
}
function pushText(children, text) {
  if (text === "") return;
  const last = children.length - 1;
  if (typeof children[last] === "string") children[last] += text;
  else children.push(text);
}
function elements(el) {
  const out = [];
  for (const child of el.children) {
    if (typeof child !== "string") out.push(child);
    else if (/[^ \t\r\n]/.test(child)) fail(`text inside <${el.name}>`);
  }
  return out;
}
function tokenText(el) {
  let text = "";
  for (const child of el.children) {
    if (typeof child === "string") text += child;
    else if (child.name === "mglyph" || child.name === "malignmark") fail(`<${child.name}>`);
    else fail(`<${child.name}> inside <${el.name}>`);
  }
  return text.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "").replace(/[ \t\r\n]+/g, " ");
}
// core/src/unicode/layout.ts
var tight = false;
var tableWidth;
function layoutMath(root2, display, compact = false) {
  if (root2.name !== "math") fail(`root <${root2.name}>`);
  const options3 = typeof compact === "boolean" ? { compact } : compact;
  const ctx = options3.compact ? { twoD: false, display: false, level: 0, compact: true } : { twoD: display, display, level: 0 };
  tight = options3.tight === true;
  try {
    const row = layoutRow(elements(root2), ctx);
    const width = options3.breakWidth;
    if (width === void 0 || row.box.width <= width) return row.box;
    let inner = row;
    for (let solid = inner.items.filter((item) => item.box.width > 0); solid.length === 1 && solid[0].row && solid[0].kind !== "fence"; ) {
      inner = solid[0].row;
      solid = inner.items.filter((item) => item.box.width > 0);
    }
    const broken = breakRow(inner, width);
    if (broken || !options3.breakTables) return broken ?? row.box;
    let room = width;
    for (let attempt = 0; attempt < 3 && room > 0; attempt++) {
      tableWidth = room;
      const box = layoutRow(elements(root2), ctx).box;
      if (box.width <= width) return box;
      room -= box.width - width;
    }
    return row.box;
  } finally {
    tight = false;
    tableWidth = void 0;
  }
}
function breakRow(row, width, indent = 0, sums = false) {
  const { parts, breaks } = row;
  if (!parts || !breaks || breaks.length === 0) return void 0;
  const lines2 = [];
  const stops = [...breaks.filter((b) => b > 0 && b < parts.length && (!sums || !multiplies(parts, b))), parts.length];
  let start = 0;
  while (start < parts.length) {
    let end = -1;
    const room = lines2.length === 0 ? width : width - indent;
    for (const stop of stops) {
      if (stop <= start) continue;
      if (trimmed(parts.slice(start, stop), lines2.length === 0).width <= room) end = stop;
      else break;
    }
    if (end < 0) return void 0;
    const line = lines2.length === 0 ? trimmed(parts.slice(start, end), true) : trimmed(parts.slice(start, end));
    lines2.push(lines2.length === 0 || indent === 0 ? line : hcat([blank(indent, height(line), line.base), line]));
    start = end;
  }
  if (lines2.length < 2) return void 0;
  return vstack(lines2, "left", lines2[0].base);
}
function multiplies(parts, at) {
  let i2 = at;
  while (i2 < parts.length && isBlank2(parts[i2])) i2++;
  const part = parts[i2];
  return part !== void 0 && PRODUCT.test(part.rows[part.base].join("").trimStart());
}
function trimmed(parts, keepStart = false) {
  let from = 0;
  let to = parts.length;
  while (!keepStart && from < to && isBlank2(parts[from])) from++;
  while (to > from && isBlank2(parts[to - 1])) to--;
  return from < to ? hcat(parts.slice(from, to)) : blank(0);
}
var SCRIPTED = /* @__PURE__ */ new Set(["msub", "msup", "msubsup", "munder", "mover", "munderover"]);
function flatten2(children, ctx, out = []) {
  for (const el of children) {
    if (el.name === "mrow" && el.attrs["data-mjx-texclass"] === void 0) flatten2(elements(el), ctx, out);
    else if (el.name === "mstyle") flatten2(elements(el), styleCtx(el, ctx), out);
    else if (el.name === "semantics") {
      const first = elements(el)[0];
      if (first) flatten2([first], ctx, out);
    } else out.push({ el, ctx });
  }
  return out;
}
function styleCtx(el, ctx) {
  const next = { twoD: ctx.twoD, display: ctx.display, level: ctx.level, compact: ctx.compact };
  const display = el.attrs.displaystyle;
  if (display === "true") next.display = true;
  if (display === "false") next.display = false;
  const level = el.attrs.scriptlevel;
  if (level !== void 0) {
    const n = parseInt(level, 10);
    if (Number.isNaN(n)) fail("scriptlevel");
    next.level = /^[+-]/.test(level) ? Math.max(0, ctx.level + n) : Math.max(0, n);
  }
  return next;
}
function isNewline(el) {
  return el.name === "mspace" && el.attrs.linebreak === "newline";
}
function layoutRow(children, ctx) {
  const flat = flatten2(children, ctx);
  if (!flat.some((f) => isNewline(f.el))) return buildRow(flat, ctx);
  if (!ctx.twoD && !ctx.compact) fail("line break in inline math");
  const parts = [[]];
  for (const f of flat) {
    if (isNewline(f.el)) parts.push([]);
    else parts.at(-1).push(f);
  }
  const rows = parts.map((part) => buildRow(part, ctx));
  const box = vstack(rows.map((r) => r.box), "center", rows[0].box.base);
  return { box, items: rows.flatMap((r) => r.items), spaced: true };
}
function buildRow(flat, rowCtx) {
  const solid = flat.map((f, i2) => f.el.name === "mspace" ? -1 : i2).filter((i2) => i2 >= 0);
  const first = solid[0];
  const last = solid.at(-1);
  const formOf = (i2) => solid.length > 1 && i2 === first ? "prefix" : solid.length > 1 && i2 === last ? "postfix" : "infix";
  const items = flat.map(() => void 0);
  const stretchy = flat.map((f) => stretches(f.el, f.ctx));
  flat.forEach((f, i2) => {
    if (!stretchy[i2]) items[i2] = makeItem(f.el, strip(f.ctx), formOf(i2));
  });
  const extentOf = (from, to) => {
    const extent2 = { up: rowCtx.stretch?.up ?? 0, down: rowCtx.stretch?.down ?? 0 };
    for (let i2 = from; i2 < to; i2++) {
      const box2 = items[i2]?.box;
      if (!box2 || stretchy[i2]) continue;
      extent2.up = Math.max(extent2.up, above(box2));
      extent2.down = Math.max(extent2.down, below(box2));
    }
    return extent2;
  };
  const whole = extentOf(0, flat.length);
  flat.forEach((f, i2) => {
    if (!stretchy[i2]) return;
    let extent2 = whole;
    const core = coreMo(f.el);
    if (isIntegral(tokenText(core))) {
      let end = i2 + 1;
      while (end < flat.length && !["REL", "PUNCT"].includes(items[end] ? items[end].cls : "ORD")) end++;
      extent2 = extentOf(i2 + 1, end);
    } else if (core.attrs.minsize !== void 0 || core.attrs.maxsize !== void 0) {
      const text = tokenText(core);
      const given = classOf(f.el, formOf(i2));
      const opens = inForm(text, "prefix") && !inForm(text, "postfix");
      const closes = inForm(text, "postfix") && !inForm(text, "prefix");
      const cls = given === "OPEN" || given === "CLOSE" ? given : opens ? "OPEN" : closes ? "CLOSE" : given;
      const next = stretchy.indexOf(true, i2 + 1);
      const prevIndex = stretchy.lastIndexOf(true, i2 - 1);
      if (cls === "OPEN") extent2 = extentOf(i2 + 1, next < 0 ? flat.length : next);
      else if (cls === "CLOSE") extent2 = extentOf(prevIndex + 1, i2);
    }
    items[i2] = makeItem(f.el, { ...strip(f.ctx), stretch: extent2 }, formOf(i2));
  });
  const list3 = items;
  overlays(list3);
  adjustClasses(list3);
  middleBars(list3);
  const solidItems = list3.filter((item) => item.cls !== "NONE");
  solidItems.forEach((item, k) => {
    if (!item.wrapped) return;
    const prev2 = solidItems[k - 1];
    const next = solidItems[k + 1];
    const touches = prev2 !== void 0 && !prev2.unary && (prev2.cls === "ORD" || prev2.cls === "INNER" || prev2.cls === "CLOSE" || prev2.cls === "OP" && (functionName(prev2.el) || tight && functionName(prev2.el, true))) || next !== void 0 && (next.cls === "ORD" || next.cls === "INNER" || next.cls === "OPEN" || next.cls === "OP" || postfixMark(next));
    if (touches) {
      item.box = item.wrapped;
      item.kind = "fence";
    }
  });
  const script2 = rowCtx.level > 0;
  list3.forEach((item, i2) => {
    const joined = JOINED.get(item.box);
    if (!joined) return;
    let j = i2 + 1;
    while (j < list3.length && list3[j].box.width === 0) j++;
    const next = list3[j];
    if (!next || next.cls === "NONE" || gap(item, next, script2) > 0) return;
    const cell = next.box.rows[next.box.base]?.find((c) => c !== "") ?? "";
    item.box = joined(cell) ?? item.box;
  });
  const boxes = [];
  const breaks = [];
  let prev;
  let spaced = false;
  let depth = 0;
  let pending = 0;
  const flush = (space) => {
    if (space > 0) {
      boxes.push(blank(space));
      if (depth === 0) spaced = true;
    }
    pending = 0;
  };
  for (const item of list3) {
    if (item.cls === "NONE") {
      if (item.el.name === "mspace") {
        pending += item.box.width;
        continue;
      }
      if (item.box.width > 0 || item.lspace) flush(pending + (item.lspace ?? 0));
      boxes.push(item.box);
      pending += item.rspace ?? 0;
      continue;
    }
    if (item.cls === "CLOSE") depth = Math.max(0, depth - 1);
    if (prev && depth === 0 && (item.cls === "REL" || item.cls === "BIN" && !item.unary || pending >= 2)) breaks.push(boxes.length);
    flush(Math.max(prev ? gap(prev, item, script2) : 0, pending));
    if (item.cls === "OPEN") depth++;
    if (depth === 0 && item.el.name === "mtext" && height(item.box) === 1 && item.box.rows[0].includes(" ")) {
      for (const [k, word] of words(item.box.rows[0]).entries()) {
        if (k > 0 && word[0] !== " ") breaks.push(boxes.length);
        boxes.push({ rows: [word], width: word.length, base: 0 });
      }
    } else {
      boxes.push(item.box);
    }
    prev = item;
  }
  flush(pending);
  const box = boxes.length ? hcat(boxes) : blank(0);
  const tail = list3.findLast((item) => item.box.width > 0);
  const tailJoined = tail && boxes.at(-1) === tail.box ? JOINED.get(tail.box) : void 0;
  if (tailJoined) {
    JOINED.set(box, (cell) => {
      const last2 = tailJoined(cell);
      return last2 && hcat([...boxes.slice(0, -1), last2]);
    });
  }
  return { box, items: list3, spaced, parts: boxes, breaks };
}
function postfixMark(item) {
  return item.el.name === "mo" && /^[!′″‴']+$/u.test(tokenText(item.el));
}
function functionName(el, words2 = false) {
  if (el.name === "mi") return true;
  if (words2 && el.name === "mo" && /^\p{L}{2,}$/u.test(tokenText(el))) return true;
  const base = SCRIPTED.has(el.name) ? elements(el)[0] : void 0;
  return base !== void 0 && functionName(base, words2);
}
function overlays(items) {
  items.forEach((item, i2) => {
    const el = item.el;
    if (el.name !== "mpadded" || el.attrs.width !== "0" || !el.attrs.lspace?.startsWith("-")) return;
    const [over, ghost] = elements(el);
    if (!over || ghost?.name !== "mphantom" || over.name !== "mpadded") return;
    const mark = elements(over);
    const text = mark.length === 1 ? tokenText(mark[0]) : "";
    const prev = items.slice(0, i2).reverse().find((other2) => other2.box.width > 0);
    if (!prev || !["/", "⧸", "∕"].includes(text)) return;
    prev.box = { ...prev.box, rows: prev.box.rows.map((row) => row.map((c) => c === " " || c === "" ? c : c + "\u0338")) };
    item.box = blank(0);
    item.cls = "NONE";
  });
}
function words(cells2) {
  const runs = [];
  for (const cell of cells2) {
    const space = cell === " ";
    const last = runs.at(-1);
    if (last && last[0] === " " === space) last.push(cell);
    else runs.push([cell]);
  }
  return runs;
}
function adjustClasses(items) {
  let prev;
  for (const item of items) {
    if (item.cls === "NONE") continue;
    if (prev?.autoOP && (item.cls === "BIN" || item.cls === "REL")) prev.cls = "ORD";
    const before = prev?.cls;
    if (item.cls === "BIN" && (!before || before === "BIN" || before === "OP" || before === "REL" || before === "OPEN" || before === "PUNCT")) {
      item.cls = "ORD";
      item.unary = true;
    } else if (before === "BIN" && (item.cls === "REL" || item.cls === "CLOSE" || item.cls === "PUNCT")) {
      prev.cls = "ORD";
    }
    prev = item;
  }
  if (prev?.cls === "BIN") prev.cls = "ORD";
}
function middleBars(items) {
  for (let i2 = 1; i2 + 1 < items.length; i2++) {
    const [l, m, r] = [items[i2 - 1], items[i2], items[i2 + 1]];
    if (l.cls === "CLOSE" && l.box.width === 0 && r.cls === "OPEN" && r.box.width === 0 && m.el.name === "mo") {
      l.cls = "NONE";
      r.cls = "NONE";
      m.cls = "REL";
    }
  }
}
function gap(left, right, script2) {
  if (tight) return 0;
  const space = texSpace(left.cls, right.cls, script2);
  if (space === 0) return 0;
  if (space >= 2) return 1;
  if (left.unary || right.cls === "PUNCT") return 0;
  if (left.cls === "PUNCT") return 1;
  if (left.cls === "OP" && right.kind === "fence") return functionName(left.el) ? 0 : 1;
  if (left.cls === "OP" || right.cls === "OP") return 1;
  if (left.kind === "frac" || right.kind === "frac") return 1;
  return 0;
}
function makeItem(el, ctx, form) {
  if (el.name === "mfrac") {
    const frac = layoutFraction(el, ctx);
    return { el, box: frac.box, cls: frac.plain ? "ORD" : "INNER", kind: frac.plain ? void 0 : "frac", wrapped: frac.wrapped };
  }
  if (el.name === "mrow") {
    const binom = ctx.twoD && ctx.level === 0 ? void 0 : binomial(el, ctx);
    if (binom) return { el, box: binom, cls: "ORD" };
    const row = layoutRow(elements(el), ctx);
    const cls = parseClass(el.attrs["data-mjx-texclass"]) ?? "ORD";
    return { el, box: row.box, cls, kind: cls === "INNER" ? "fence" : void 0, row };
  }
  const box = layoutNode(el, ctx);
  const item = { el, box, cls: classOf(el, form) };
  if (el.name === "mi" && item.cls === "OP" && el.attrs["data-mjx-texclass"] === void 0) item.autoOP = true;
  if (el.name === "mo" && el.attrs["data-mjx-texclass"] === void 0 && (el.attrs.lspace !== void 0 || el.attrs.rspace !== void 0)) {
    item.cls = "NONE";
    item.lspace = spaceCells(length3(el.attrs.lspace ?? "0"));
    item.rspace = spaceCells(length3(el.attrs.rspace ?? "0"));
  }
  return item;
}
function classOf(el, form) {
  const explicit = parseClass(el.attrs["data-mjx-texclass"]);
  if (explicit) return explicit;
  switch (el.name) {
    case "mo": {
      const text = tokenText(el);
      const given = el.attrs.form;
      let cls = operatorClass(text, given === "prefix" || given === "infix" || given === "postfix" ? given : form);
      if (el.attrs.fence === "true" && cls === "REL") {
        if (form === "prefix") cls = "OPEN";
        if (form === "postfix") cls = "CLOSE";
      }
      return cls;
    }
    case "mi": {
      const text = tokenText(el);
      const variant = el.attrs.mathvariant ?? ([...text].length > 1 ? "normal" : "italic");
      const auto = el.attrs["data-mjx-auto-op"] !== "false";
      return auto && [...text].length > 1 && /^[a-z][a-z0-9]*$/i.test(text) && variant === "normal" ? "OP" : "ORD";
    }
    case "mspace":
      return "NONE";
    default:
      if (SCRIPTED.has(el.name)) {
        const base = elements(el)[0];
        if (base && (base.name === "mo" || base.name === "mi" || SCRIPTED.has(base.name) || base.name === "mrow" && base.attrs["data-mjx-texclass"] !== void 0)) {
          return classOf(base, form);
        }
      }
      return "ORD";
  }
}
function coreMo(el) {
  if (el.name === "mo") return el;
  if (el.name === "mrow" || el.name === "mstyle") {
    const kids = elements(el);
    return kids.length === 1 ? coreMo(kids[0]) : void 0;
  }
  if (SCRIPTED.has(el.name)) {
    const base = elements(el)[0];
    return base && coreMo(base);
  }
  return void 0;
}
var INTEGRAL_SIGNS = /* @__PURE__ */ new Map([
  ["∫", 1],
  ["∬", 2],
  ["∭", 3]
]);
function isIntegral(text) {
  return INTEGRAL_SIGNS.has(text);
}
function stretches(el, ctx) {
  if (!ctx.twoD && !ctx.compact) return false;
  const mo = coreMo(el);
  if (!mo) return false;
  const text = tokenText(mo);
  if (isIntegral(text)) return ctx.display && !el.name.startsWith("munder") && el.name !== "mover";
  if (!FENCES.has(text)) return false;
  const stretchy = mo.attrs.stretchy;
  if (stretchy === "true") return true;
  if (stretchy === "false") return false;
  if (mo.attrs.minsize !== void 0 || mo.attrs.maxsize !== void 0) return true;
  return text !== "/" && text !== "\\" && (inForm(text, "prefix") || inForm(text, "postfix"));
}
function layoutNode(el, ctx) {
  switch (el.name) {
    case "mi":
    case "mn":
    case "mtext":
      return token(el);
    case "ms": {
      const text = token(el);
      return hcat([textBox(el.attrs.lquote ?? '"'), text, textBox(el.attrs.rquote ?? '"')]);
    }
    case "mo":
      return operator(el, ctx);
    case "mspace":
      return blank(spaceCells(length3(el.attrs.width ?? "0")));
    case "mrow":
    case "mstyle":
      return layoutRow([el], ctx).box;
    case "semantics": {
      const first = elements(el)[0];
      return first ? layoutNode(first, ctx) : blank(0);
    }
    case "maction": {
      const kids = elements(el);
      const chosen = kids[parseInt(el.attrs.selection ?? "1", 10) - 1];
      return chosen ? layoutNode(chosen, ctx) : fail("maction");
    }
    case "mphantom":
      return phantom(layoutRow(elements(el), strip(ctx)).box);
    case "mpadded":
      return padded(el, ctx);
    case "mfrac":
      return layoutFraction(el, ctx).box;
    case "msqrt":
      return root(layoutRow(elements(el), strip(ctx)), void 0, ctx);
    case "mroot": {
      const kids = elements(el);
      if (kids.length !== 2) fail("mroot");
      return root(layoutRow([kids[0]], strip(ctx)), kids[1], ctx);
    }
    case "msub":
    case "msup":
    case "msubsup":
      return scripts(el, ctx);
    case "mmultiscripts":
      return multiscripts(el, ctx);
    case "munder":
    case "mover":
    case "munderover":
      return underOver(el, ctx);
    case "menclose":
      return enclose(el, ctx);
    case "mtable":
      return table(el, ctx);
  }
  return fail(`<${el.name}>`);
}
function strip(ctx) {
  return ctx.stretch ? { twoD: ctx.twoD, display: ctx.display, level: ctx.level, compact: ctx.compact } : ctx;
}
function scriptCtx(ctx) {
  return { twoD: ctx.twoD, display: false, level: ctx.level + 1, compact: ctx.compact };
}
function normalize(text) {
  return text.replace(/[\u00a0\u2000-\u200a\u202f\u205f]/g, " ");
}
function token(el) {
  const text = normalize(tokenText(el));
  if (el.name === "mtext" && el.attrs.mathcolor === "red" && text.startsWith("\\")) fail("undefined macro");
  const variant = el.attrs.mathvariant;
  return textBox(styleText(text, variant));
}
function operator(el, ctx) {
  const text = normalize(tokenText(el));
  const stretch = ctx.stretch;
  if (stretch && (stretch.up > 0 || stretch.down > 0)) {
    const rows = stretch.up + stretch.down + 1;
    const count = INTEGRAL_SIGNS.get(text);
    const column = count ? tallIntegral(rows).map((c) => c.repeat(count)) : tallDelimiter(text, rows, stretch.up);
    const cellRows = column.map((c) => toCells(c));
    return { rows: cellRows, width: cellRows[0].length, base: stretch.up };
  }
  return textBox(styleText(text, el.attrs.mathvariant));
}
function length3(value) {
  const named = {
    veryverythinmathspace: 1,
    verythinmathspace: 2,
    thinmathspace: 3,
    mediummathspace: 4,
    thickmathspace: 5,
    verythickmathspace: 6,
    veryverythickmathspace: 7
  };
  const v = value.trim();
  const negative = v.startsWith("negative");
  const name = negative ? v.slice(8) : v;
  if (named[name] !== void 0) return (negative ? -1 : 1) * named[name] / 18;
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+))\s*(em|ex|pt|px|mu|in|cm|mm|pc)?$/.exec(v);
  if (!m) return fail(`length ${value}`);
  const n = parseFloat(m[1]);
  const unit = m[2] ?? "em";
  const per = { em: 1, ex: 0.43, pt: 0.1, px: 1 / 16, mu: 1 / 18, in: 7.2, cm: 2.835, mm: 0.2835, pc: 1.2 };
  return n * per[unit];
}
function cells(em2) {
  return em2 <= 0.05 ? 0 : Math.max(1, Math.round(em2 * 2));
}
function spaceCells(em2) {
  if (!tight) return cells(em2);
  return em2 < 0.25 ? 0 : 1;
}
function padded(el, ctx) {
  const inner = layoutRow(elements(el), ctx).box;
  if (!isBlank2(inner)) return inner;
  let box = inner;
  if (el.attrs.width === "0") box = { rows: box.rows.map(() => []), width: 0, base: box.base };
  if (el.attrs.height === "0" && el.attrs.depth === "0") box = blank(box.width);
  return box;
}
function layoutFraction(el, ctx) {
  const kids = elements(el);
  if (kids.length !== 2) fail("mfrac");
  const [num3, den] = kids;
  const noBar = /^0+(\.0*)?([a-z]+)?$/.test(el.attrs.linethickness ?? "");
  const inner = strip(ctx);
  const vulgar = noBar ? void 0 : VULGAR.get(`${numeral(num3)}/${numeral(den)}`);
  if (vulgar && (!ctx.twoD || !ctx.display)) return { box: textBox(vulgar), plain: true };
  if (ctx.twoD && ctx.level === 0 && el.attrs.bevelled !== "true") {
    const partCtx = { twoD: true, display: false, level: ctx.display ? ctx.level : ctx.level + 1 };
    const top2 = layoutRow([num3], partCtx).box;
    const bottom2 = layoutRow([den], partCtx).box;
    const overhang = height(top2) > 1 || height(bottom2) > 1 ? 1 : 0;
    const width = Math.max(top2.width, bottom2.width) + 2 * overhang;
    const bar = noBar ? blank(width) : textBox("─".repeat(width));
    return { box: vstack([top2, bar, bottom2], "center", height(top2)) };
  }
  if (vulgar) return { box: textBox(vulgar), plain: true };
  const top = layoutRow([num3], inner);
  const bottom = layoutRow([den], inner);
  if (noBar) {
    return { box: hcat([top.box, blank(1), bottom.box]), plain: true };
  }
  const box = hcat([parens(top.box, needsParens(top, "num")), textBox("/"), parens(bottom.box, needsParens(bottom, "den"))]);
  return { box, wrapped: parens(box, true) };
}
function binomial(el, ctx) {
  const kids = elements(el);
  if (kids.length !== 3) return void 0;
  const [open, frac, close] = kids;
  const fence = (e, ch) => {
    const mo = coreMo(e);
    return mo !== void 0 && tokenText(mo) === ch;
  };
  if (!fence(open, "(") || !fence(close, ")") || frac.name !== "mfrac") return void 0;
  if (!/^0+(\.0*)?([a-z]+)?$/.test(frac.attrs.linethickness ?? "")) return void 0;
  const [n, k] = elements(frac);
  if (!n || !k) return void 0;
  return hcat([textBox("C("), layoutRow([n], ctx).box, textBox(", "), layoutRow([k], ctx).box, textBox(")")]);
}
function numeral(el) {
  if (el.name === "mn") return tokenText(el);
  if (el.name === "mrow" || el.name === "mstyle") {
    const kids = elements(el);
    return kids.length === 1 ? numeral(kids[0]) : "";
  }
  return "";
}
function parens(box, wrap) {
  if (!wrap) return box;
  if (height(box) === 1) return hcat([textBox("("), box, textBox(")")]);
  const delim = (ch) => ({ rows: tallDelimiter(ch, height(box), box.base).map((c) => toCells(c)), width: 1, base: box.base });
  return hcat([delim("("), box, delim(")")]);
}
function atoms(row) {
  let items = row.items.filter((item) => item.box.width > 0);
  let spaced = row.spaced;
  while (items.length === 1 && items[0].row && items[0].kind !== "fence") {
    const inner = items[0].row;
    items = inner.items.filter((item) => item.box.width > 0);
    spaced = inner.spaced;
  }
  return { items, spaced };
}
var DIFFERENTIALS = /* @__PURE__ */ new Set(["d", "∂", "δ", "Δ", "∇", "D"]);
function needsParens(row, side) {
  const { items, spaced } = atoms(row);
  if (items.length === 0) return false;
  if (items.some((item) => item.wrapped && item.kind === "frac")) return true;
  if (items.length === 1) {
    const only = items[0];
    return only.el.name === "mtext" && tokenText(only.el).includes(" ");
  }
  if (spaced) return true;
  if (side === "num") return looseAtTop(items);
  const [head, second] = items;
  const lastItem = items.at(-1);
  const single2 = (item) => ["mi", "mn", "msub", "msup", "msubsup"].includes(item.el.name);
  if (items.length === 2 && DIFFERENTIALS.has(plainText(head)) && single2(second)) return false;
  const args = items.slice(2, -1);
  const plainArgs = args.every((item) => single2(item) || item.cls === "PUNCT");
  if (single2(head) && second.cls === "OPEN" && lastItem.cls === "CLOSE" && plainArgs) return false;
  if (items.length === 2 && single2(head) && plainText(second) === "!") return false;
  return true;
}
function looser(item, first, next) {
  if (item.unary) return !first;
  if (item.cls === "NONE") return item.box.width > 0 && (item.lspace !== void 0 || item.rspace !== void 0);
  if (item.el.name === "mtext") return plainText(item).includes(" ");
  if (item.cls === "OP" && functionName(item.el) && next?.cls === "OPEN") return false;
  return item.cls === "BIN" || item.cls === "REL" || item.cls === "PUNCT" || item.cls === "OP";
}
function looseAtTop(items) {
  let depth = 0;
  const bars = [];
  for (const [i2, item] of items.entries()) {
    const text = item.el.name === "mo" ? tokenText(item.el) : "";
    if (BARS.has(text)) {
      const prev = items[i2 - 1];
      if (bars.at(-1) === depth && (!prev || !["BIN", "REL", "OPEN", "PUNCT"].includes(prev.cls))) {
        bars.pop();
        depth--;
      } else if (!prev || prev.unary || ["BIN", "REL", "OPEN", "PUNCT", "OP"].includes(prev.cls)) {
        depth++;
        bars.push(depth);
      } else if (depth === 0) {
        return true;
      }
      continue;
    }
    if (item.cls === "CLOSE") depth = Math.max(0, depth - 1);
    else if (item.cls === "OPEN") depth++;
    else if (depth === 0 && looser(item, i2 === 0, items[i2 + 1])) return true;
  }
  return false;
}
var BARS = /* @__PURE__ */ new Set(["|", "‖", "∥", "∣"]);
function plainText(item) {
  return item.box.rows.length === 1 ? item.box.rows[0].join("") : "";
}
function isAtom(row) {
  const { items } = atoms(row);
  if (items.length === 0) return true;
  if (items.length !== 1) return false;
  const only = items[0];
  if (only.kind === "fence") return true;
  const scripted = only.el.name === "msub" && ["mi", "mn", "mover", "munder"].includes(elements(only.el)[0]?.name ?? "") && /^[^\s_^()]+$/u.test(plainText(only));
  return scripted || (only.el.name === "mi" || only.el.name === "mn" || only.el.name === "mtext") && !plainText(only).includes(" ");
}
function root(radicand, indexEl, ctx) {
  let index;
  let mapped;
  if (indexEl) {
    index = layoutRow([indexEl], { twoD: ctx.twoD, display: false, level: ctx.level + 2, compact: ctx.compact }).box;
    mapped = height(index) === 1 ? mapScript(index.rows[0], SUPERSCRIPTS) : void 0;
  }
  const sign = mapped === "³" ? "∛" : mapped === "⁴" ? "∜" : "√";
  const prefix = sign === "√" && mapped !== void 0 ? mapped : "";
  if (index && sign === "√" && mapped === void 0 && !ctx.twoD) fail("root index");
  const r = radicand.box;
  if (height(r) === 1 && (isAtom(radicand) || !ctx.twoD)) {
    const atom = isAtom(radicand);
    const body2 = atom ? r : parens(r, true);
    const box2 = hcat([textBox(prefix + sign), body2]);
    if (index && mapped === void 0) return hangIndex(box2, index, 0);
    const bare = atom && !atoms(radicand).items.some((item) => item.kind === "fence") && r.width > 0;
    if (bare) JOINED.set(box2, (cell) => JOINS_RADICAND.test(cell) ? hcat([box2, blank(1)]) : void 0);
    return box2;
  }
  if (height(r) === 1) {
    const bar = textBox(" ".repeat(toCells(prefix).length + 1) + "_".repeat(r.width));
    const box2 = vstack([bar, hcat([textBox(prefix + sign), r])], "left", 1);
    return index && mapped === void 0 ? hangIndex(box2, index, 1) : box2;
  }
  const rows = height(r) + 1;
  const leadCells = toCells(prefix);
  const left = Array.from({ length: rows }, (_, i2) => [
    ...i2 === rows - 2 ? leadCells : Array(leadCells.length).fill(" "),
    i2 === rows - 1 ? "╲" : " ",
    i2 === 0 ? "┌" : "│"
  ]);
  const leftBox = { rows: left, width: left[0].length, base: r.base + 1 };
  const body = { rows: [Array(r.width + 1).fill("─"), ...r.rows.map((row) => [" ", ...row])], width: r.width + 1, base: r.base + 1 };
  const box = hcat([leftBox, body]);
  return index && mapped === void 0 ? hangIndex(box, index, box.rows.length - 1) : box;
}
function hangIndex(box, index, signRow) {
  const indent = index.width;
  const shifted = pad(box, indent, 0);
  return compose2([
    { box: shifted, row: -shifted.base, col: 0 },
    { box: index, row: signRow - shifted.base - height(index), col: 0 }
  ]);
}
function compose2(parts) {
  const top = Math.min(...parts.map((p) => p.row));
  const bottom = Math.max(...parts.map((p) => p.row + height(p.box) - 1));
  const left = Math.min(0, ...parts.map((p) => p.col));
  const width = Math.max(0, ...parts.map((p) => p.col + p.box.width)) - left;
  const out = blank(width, bottom - top + 1, -top);
  for (const p of parts) {
    p.box.rows.forEach((row, r) => {
      row.forEach((cell, c) => {
        out.rows[p.row - top + r][p.col - left + c] = cell;
      });
    });
  }
  return out;
}
function group(box, word = false) {
  const text = box.rows[0].join("");
  const cellsCount = box.rows[0].filter((c) => c !== "").length;
  if (cellsCount <= 1) return text;
  if (/^\(.*\)$/.test(text) && balanced(text.slice(1, -1))) return text;
  if (word && WORD.test(text)) return text;
  return `(${text})`;
}
var WORD = /^(?:(?![\u00b2\u00b3\u00b9\u02b0-\u02ff\u1d2c-\u1dbf\u2070-\u209f\u2c7c\u2c7d])[\p{L}\p{N}]\p{M}*)+$/u;
var JOINED = /* @__PURE__ */ new WeakMap();
var JOINS_SCRIPT = /^[\p{L}\p{N}\p{M}]/u;
var JOINS_RADICAND = /^[\p{L}\p{N}\p{M}(]/u;
function balanced(text) {
  let depth = 0;
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")" && --depth < 0) return false;
  }
  return depth === 0;
}
function scripts(el, ctx) {
  const kids = elements(el);
  const expected = el.name === "msubsup" ? 3 : 2;
  if (kids.length !== expected) fail(el.name);
  const base = kids[0];
  const sub = el.name === "msup" ? void 0 : kids[1];
  const sup = el.name === "msub" ? void 0 : el.name === "msup" ? kids[1] : kids[2];
  return attach(base, sub, sup, ctx);
}
function attach(baseEl, subEl, supEl, ctx) {
  const sctx = scriptCtx(ctx);
  const scripts2 = makeScripts(subEl && layoutRow([subEl], sctx).box, supEl && layoutRow([supEl], sctx).box);
  const core = coreMo(baseEl);
  const integral = core !== void 0 && isIntegral(tokenText(core)) && ctx.twoD && ctx.display;
  let baseCtx = ctx;
  if (integral) {
    const { sub, sup, subMapped, supMapped } = scripts2;
    const target = ctx.stretch ?? { up: 0, down: 0 };
    const unmappedSup = sup !== void 0 && supMapped === void 0;
    const unmappedSub = sub !== void 0 && subMapped === void 0;
    if (unmappedSup || unmappedSub && sup !== void 0 || target.up + target.down > 0) {
      baseCtx = {
        ...ctx,
        stretch: {
          up: Math.max(target.up, sup ? supMapped !== void 0 ? 1 : height(sup) : 0, 1),
          down: Math.max(target.down, sub ? subMapped !== void 0 ? 1 : height(sub) : 0, sub ? 1 : 0)
        }
      };
    }
  }
  const base = groupedBase(baseEl, baseScriptBox(baseEl, baseCtx), scripts2);
  if (!ctx.twoD) return oneLineScripts(base, scripts2);
  return compose2([{ box: base, row: -base.base, col: 0 }, ...placeScripts(base, scripts2, "right", integral)]);
}
function makeScripts(sub, sup) {
  return {
    sub,
    sup,
    subMapped: sub && height(sub) === 1 ? mapScript(sub.rows[0], SUBSCRIPTS) : void 0,
    supMapped: sup && height(sup) === 1 ? mapScript(sup.rows[0], SUPERSCRIPTS) : void 0
  };
}
function scriptText({ sub, sup, subMapped, supMapped }) {
  let text = "";
  if (sub) text += subMapped ?? "_" + group(sub, tight && (!sup || supMapped === void 0));
  const head = text;
  if (sup) text += supMapped ?? "^" + group(sup, tight);
  const last = sup ? supMapped === void 0 ? sup : void 0 : subMapped === void 0 ? sub : void 0;
  if (!last) return { text, bare: false };
  const written = group(last, tight);
  if (written.startsWith("(") || !JOINS_SCRIPT.test([...written].at(-1) ?? "")) return { text, bare: false };
  return { text, bare: true, word: last.rows[0].filter((c) => c !== "").length > 1 };
}
function placeScripts(base, { sub, sup, subMapped, supMapped }, side, integral = false) {
  const tall = height(base) > 1;
  const top = -above(base);
  const bottom = below(base);
  const subBox = subMapped !== void 0 ? textBox(subMapped) : sub;
  const supBox = supMapped !== void 0 ? textBox(supMapped) : sup;
  const at = (box, row, width2) => ({
    box: side === "right" ? box : widen(box, width2, "right"),
    row,
    col: side === "right" ? base.width : -width2
  });
  if (!tall && subMapped !== void 0 && supMapped !== void 0) {
    const both = textBox(subMapped + supMapped);
    return [at(both, 0, both.width)];
  }
  const width = Math.max(subBox?.width ?? 0, supBox?.width ?? 0);
  const parts = [];
  if (supBox) {
    const row = integral && tall ? top : supMapped !== void 0 ? top : tall ? top - height(supBox) + 1 : top - height(supBox);
    parts.push(at(supBox, row, width));
  }
  if (subBox) {
    const row = integral && tall ? bottom - height(subBox) + 1 : subMapped !== void 0 ? bottom : tall ? bottom : bottom + 1;
    parts.push(at(subBox, row, width));
  }
  return parts;
}
function multiscripts(el, ctx) {
  const kids = elements(el);
  if (kids.length === 0) fail("mmultiscripts");
  const sctx = scriptCtx(ctx);
  const sides2 = [
    { sub: [], sup: [] },
    { sub: [], sup: [] }
  ];
  let side = 0;
  for (let i2 = 1; i2 < kids.length; ) {
    if (kids[i2].name === "mprescripts") {
      side = 1;
      i2++;
      continue;
    }
    const pair = [kids[i2], kids[i2 + 1]];
    if (!pair[1]) fail("mmultiscripts pair");
    const [subEl, supEl] = pair;
    if (subEl.name !== "none") sides2[side].sub.push(layoutRow([subEl], sctx).box);
    if (supEl.name !== "none") sides2[side].sup.push(layoutRow([supEl], sctx).box);
    i2 += 2;
  }
  const join2 = (boxes) => boxes.length ? hcat(boxes) : void 0;
  const [post, pre] = sides2.map((s) => makeScripts(join2(s.sub), join2(s.sup)));
  const base = layoutNode(kids[0], strip(ctx));
  if (!ctx.twoD) return oneLineScripts(hcat([textBox(scriptText(pre).text), base]), post);
  return compose2([{ box: base, row: -base.base, col: 0 }, ...placeScripts(base, post, "right"), ...placeScripts(base, pre, "left")]);
}
function oneLineScripts(base, scripts2) {
  const { text, bare, word } = scriptText(scripts2);
  const box = hcat([base, textBox(text)]);
  if (bare) {
    JOINED.set(box, (cell) => JOINS_SCRIPT.test(cell) || cell === "(" && word ? hcat([box, blank(1)]) : void 0);
  }
  return box;
}
function groupedBase(el, base, { sub, sup }) {
  let core = el;
  while (core.name === "mrow" && elements(core).length === 1) core = elements(core)[0];
  const radical = core.name === "msqrt" || core.name === "mroot";
  const above2 = sup !== void 0 && (core.name === "msup" || core.name === "msubsup" || core.name === "mover" || core.name === "munderover");
  const beneath = sub !== void 0 && sup === void 0 && (core.name === "msub" || core.name === "msubsup" || core.name === "munder" || core.name === "munderover");
  if (!radical && !above2 && !beneath) return base;
  if (above2 && (core.name === "mover" || core.name === "munderover") && !scriptedLimits(core)) return base;
  return height(base) === 1 ? parens(base, true) : base;
}
function scriptedLimits(el) {
  const kids = elements(el);
  const mark = el.name === "munder" ? kids[1] : kids.at(-1);
  return !(mark?.name === "mo" && (OVER_ACCENTS.has(tokenText(mark)) || UNDER_ACCENTS.has(tokenText(mark)) || braceRow(tokenText(mark), 1) !== void 0));
}
function baseScriptBox(el, ctx) {
  if (el.name === "mfrac") {
    const frac = layoutFraction(el, ctx);
    return frac.wrapped ?? frac.box;
  }
  return layoutNode(el, ctx);
}
var INTEGRALS = /^[\u222b-\u2233\u2a0b-\u2a1c]$/;
function movable(base) {
  const mo = coreMo(base);
  if (mo) {
    if (mo.attrs.movablelimits === "true") return true;
    if (mo.attrs.movablelimits === "false") return false;
    const text = tokenText(mo);
    return operatorClass(text, "prefix") === "OP" && !INTEGRALS.test(text);
  }
  return base.name === "mi" && [...tokenText(base)].length > 1;
}
function underOver(el, ctx) {
  const kids = elements(el);
  const expected = el.name === "munderover" ? 3 : 2;
  if (kids.length !== expected) fail(el.name);
  const baseEl = kids[0];
  const underEl = el.name === "mover" ? void 0 : kids[1];
  const overEl = el.name === "munder" ? void 0 : el.name === "mover" ? kids[1] : kids[2];
  const overText = overEl?.name === "mo" ? tokenText(overEl) : void 0;
  const underText = underEl?.name === "mo" ? tokenText(underEl) : void 0;
  if (el.name !== "munderover") {
    const mark = overText ?? underText;
    const isOver = overText !== void 0;
    if (mark !== void 0) {
      const brace = braceRow(mark, 1);
      if (brace !== void 0) {
        if (!ctx.twoD) fail("brace in inline math");
        const base2 = layoutNode(baseEl, strip(ctx));
        const row = textBox(braceRow(mark, base2.width));
        return isOver ? vstack([row, base2], "center", base2.base + 1) : vstack([base2, row], "center", base2.base);
      }
      const accent = (isOver ? OVER_ACCENTS : UNDER_ACCENTS).get(mark);
      const markEl = isOver ? overEl : underEl;
      if (accent && el.attrs[isOver ? "accent" : "accentunder"] !== "false" && markEl.attrs.accent !== "false") {
        return applyAccent(layoutNode(baseEl, strip(ctx)), accent, isOver, ctx);
      }
    }
  }
  const draw = baseEl.name === "mo" && baseEl.attrs.stretchy !== "false" ? STRETCHY_ARROWS.get(tokenText(baseEl)) : void 0;
  if (draw && ctx.twoD) {
    const sctx2 = scriptCtx(ctx);
    const over2 = overEl && layoutRow([overEl], sctx2).box;
    const under2 = underEl && layoutRow([underEl], sctx2).box;
    const width = Math.max(over2?.width ?? 0, under2?.width ?? 0) + 2;
    const arrow = textBox(draw(width));
    return stack(arrow, over2, under2);
  }
  if (!ctx.twoD || !ctx.display && movable(baseEl)) return attach(baseEl, underEl, overEl, ctx);
  const sctx = scriptCtx(ctx);
  const base = layoutNode(baseEl, strip(ctx));
  const over = overEl && layoutRow([overEl], sctx).box;
  const under = underEl && layoutRow([underEl], sctx).box;
  return stack(base, over, under);
}
function stack(base, over, under) {
  const parts = [over, base, under].filter((b) => b !== void 0);
  return vstack(parts, "center", (over ? height(over) : 0) + base.base);
}
function marked3(cell, mark) {
  return cell === "" ? cell : cell + mark;
}
function applyAccent(base, accent, over, ctx) {
  if (height(base) === 1) {
    const row2 = base.rows[0];
    const filled = row2.filter((c) => c !== "");
    if (filled.length === 1 && row2.length === 1) {
      const prime = DOT_PRIMES[accent.mark];
      const cell = row2[0];
      if (over && prime && [...(cell + accent.mark).normalize("NFC")].length > 1) return textBox(cell + prime);
      return { ...base, rows: [[marked3(cell, accent.mark)]] };
    }
    if (accent.wide) return { ...base, rows: [row2.map((c) => marked3(c, accent.mark))] };
    if (!ctx.twoD) {
      if (accent.arrow) {
        const lastIndex = row2.reduce((at, c, i2) => c !== "" && c !== " " ? i2 : at, -1);
        return { ...base, rows: [row2.map((c, i2) => i2 === lastIndex ? marked3(c, accent.mark) : c)] };
      }
      return { ...base, rows: [row2.map((c) => c === " " ? c : marked3(c, accent.mark))] };
    }
  }
  if (!ctx.twoD) fail("accent over a tall base");
  const width = Math.max(1, base.width);
  const glyph = accent.arrow ? arrowRow(accent.arrow, width) : accent.wide ? accent.glyph.repeat(width) : accent.glyph;
  const row = widen(textBox(glyph), width, "center");
  return over ? vstack([row, base], "center", base.base + 1) : vstack([base, row], "center", base.base);
}
function enclose(el, ctx) {
  const inner = layoutRow(elements(el), strip(ctx)).box;
  const notations = (el.attrs.notation ?? "longdiv").trim().split(/\s+/);
  let box = inner;
  for (const notation of notations) {
    switch (notation) {
      case "updiagonalstrike":
      case "downdiagonalstrike":
      case "updiagonalarrow":
      // \cancelto: the value it goes to is a superscript
      case "northeastarrow":
      case "horizontalstrike": {
        const mark = notation === "horizontalstrike" ? "\u0336" : "\u0338";
        if (box.rows.some((row) => row.some((c) => c.includes(mark)))) break;
        box = { ...box, rows: box.rows.map((row) => row.map((c) => c === " " || c === "" ? c : c + mark)) };
        break;
      }
      case "box":
      case "roundedbox": {
        if (!ctx.twoD) break;
        const [tl, tr, bl, br2] = notation === "box" ? ["┌", "┐", "└", "┘"] : ["╭", "╮", "╰", "╯"];
        const w = box.width + 2;
        const side = (ch) => ({ rows: box.rows.map(() => [ch]), width: 1, base: box.base });
        const middle = hcat([side("│"), pad(box, 1, 1), side("│")]);
        box = vstack([textBox(tl + "─".repeat(w) + tr), middle, textBox(bl + "─".repeat(w) + br2)], "left", box.base + 1);
        break;
      }
      case "left":
      case "right":
      case "top":
      case "bottom":
        break;
      default:
        fail(`menclose ${notation}`);
    }
  }
  return sides(box, new Set(notations), ctx);
}
function sides(box, notations, ctx) {
  const [left, right, top, bottom] = ["left", "right", "top", "bottom"].map((n) => notations.has(n));
  if (!left && !right && !top && !bottom) return box;
  if (height(box) === 1) {
    let row = box.rows[0];
    if (top) row = row.map((c) => marked3(c, "\u0305"));
    if (bottom) row = row.map((c) => marked3(c, "\u0332"));
    const bar = ctx.twoD ? "│" : "|";
    const cellsRow = [...left ? [bar] : [], ...row, ...right ? [bar] : []];
    return { rows: [cellsRow], width: cellsRow.length, base: 0 };
  }
  const rule = (ch) => ({ rows: box.rows.map(() => [ch]), width: 1, base: box.base });
  let out = hcat([...left ? [rule("│"), blank(1, height(box), box.base)] : [], box, ...right ? [blank(1, height(box), box.base), rule("│")] : []]);
  const line = (l, r) => textBox((left ? l : "") + "─".repeat(out.width - (left ? 1 : 0) - (right ? 1 : 0)) + (right ? r : ""));
  if (top) out = vstack([line("┌", "┐"), out], "left", out.base + 1);
  if (bottom) out = vstack([out, line("└", "┘")], "left", out.base);
  return out;
}
function list2(value, fallback) {
  const parts = (value ?? fallback).trim().split(/\s+/);
  return parts.length ? parts : [fallback];
}
function pick(values, i2) {
  return values[Math.min(i2, values.length - 1)];
}
function alignOf(value) {
  if (value === "left" || value === "right" || value === "center") return value;
  if (value === "decimalpoint") return "center";
  return fail(`columnalign ${value}`);
}
function oneLineTable(el, rowEls, ctx) {
  const cellCtx = { twoD: false, display: false, level: ctx.level };
  const spacing = list2(el.attrs.columnspacing, "0.8em").map((v) => v.endsWith("%") ? 0 : cells(length3(v)));
  const rows = [];
  for (const rowEl of rowEls) {
    if (rowEl.name !== "mtr" && rowEl.name !== "mlabeledtr") fail(`<${rowEl.name}> in mtable`);
    const cellEls = elements(rowEl);
    if (rowEl.name === "mlabeledtr") cellEls.shift();
    let row = "";
    for (const [c, cellEl] of cellEls.entries()) {
      if (cellEl.name !== "mtd") fail(`<${cellEl.name}> in mtr`);
      const box = layoutRow(elements(cellEl), cellCtx).box;
      if (height(box) !== 1) fail("tall cell in a one-line table");
      const text = lines(box)[0].trim();
      if (c > 0 && text !== "" && row !== "") {
        row += pick(spacing, c - 1) > 0 ? /[,;:]$/.test(row) ? " " : ", " : /^[\p{L}\p{N}]/u.test(text) ? "" : " ";
      }
      row += text;
    }
    if (row !== "") rows.push(row);
  }
  return textBox(rows.map((row, r) => r < rows.length - 1 ? row.replace(/[,;]$/, "") : row).join("; "));
}
function breakCells(rows, widths, gaps, room) {
  const total = () => widths.reduce((n, w) => n + w, 0) + gaps.reduce((n, g) => n + g.space, 0);
  const order = widths.map((_, c) => c).sort((a, b) => widths[b] - widths[a]);
  for (const c of order) {
    const over = total() - room;
    if (over <= 0) return;
    for (let target = Math.max(1, widths[c] - over); target < widths[c]; target++) {
      const broken = rows.map((r) => {
        const cell = r[c];
        return !cell || cell.box.width <= target ? cell?.box : breakCell(cell, target);
      });
      if (broken.some((box, r) => rows[r][c] && !box)) continue;
      broken.forEach((box, r) => {
        if (box) rows[r][c].box = box;
      });
      widths[c] = Math.max(0, ...rows.map((r) => r[c]?.box.width ?? 0));
      break;
    }
  }
  if (total() > room) fail("table too wide to break");
}
function breakCell(cell, width) {
  const first = cell.row?.items.find((item) => item.box.width > 0);
  const parts = cell.row?.parts ?? [];
  let lead = 0;
  for (let i2 = 0; i2 < parts.length && isBlank2(parts[i2]); i2++) lead += parts[i2].width;
  const indent = first?.cls === "REL" ? lead + first.box.width + 1 : 0;
  const row = cell.row;
  return row && (breakRow(row, width, indent, true) ?? breakRow(row, width, indent)) || (height(cell.box) === 1 ? breakText(cell.box, width, indent, true) ?? breakText(cell.box, width, indent) : void 0);
}
var PRODUCT = /^[⋅×÷∘∗·]/u;
var CONTINUES = /^[-+−±∓=<>≤≥≠≈≡∼≃≅∝→←↔⇒⇐⇔↦⋅×÷∘∪∩∧∨⊂⊃⊆⊇∈∉≺≻⪯⪰≼≽∣]/u;
function breakText(box, width, indent, sums = false) {
  const words2 = [[]];
  for (const cell of box.rows[0]) {
    if (cell === " " && words2.at(-1).some((c) => c !== " ")) words2.push([]);
    else words2.at(-1).push(cell);
  }
  const lines2 = [];
  let line = [];
  const size = (ws) => ws.reduce((n, w2) => n + w2.length, 0) + Math.max(0, ws.length - 1);
  const room = () => lines2.length === 0 ? width : width - indent;
  for (const word of words2.filter((w2) => w2.length > 0)) {
    line.push(word);
    while (size(line) > room()) {
      let at = line.length - 1;
      while (at > 0 && !(CONTINUES.test(line[at].join("")) && !(sums && PRODUCT.test(line[at].join(""))))) at--;
      if (at === 0) return void 0;
      lines2.push(line.slice(0, at));
      line = line.slice(at);
    }
  }
  lines2.push(line);
  if (lines2.length < 2) return void 0;
  const rows = lines2.map((ws, i2) => [...Array(i2 === 0 ? 0 : indent).fill(" "), ...ws.flatMap((w2, k) => k === 0 ? w2 : [" ", ...w2])]);
  const w = Math.max(...rows.map((r) => r.length));
  return { rows: rows.map((r) => [...r, ...Array(w - r.length).fill(" ")]), width: w, base: 0 };
}
function table(el, ctx) {
  const cellCtx = ctx.compact ? { twoD: false, display: false, level: ctx.level, compact: true } : { twoD: ctx.twoD, display: el.attrs.displaystyle === "true", level: ctx.level };
  const rowEls = elements(el);
  if (!ctx.twoD && !ctx.compact && rowEls.length > 1) return oneLineTable(el, rowEls, ctx);
  const tableAligns = list2(el.attrs.columnalign, "center");
  const spacing = list2(el.attrs.columnspacing, "0.8em").map((v) => v.endsWith("%") ? 0 : cells(length3(v)));
  const columnLines = list2(el.attrs.columnlines, "none");
  const rowLines = list2(el.attrs.rowlines, "none");
  const rows = [];
  const labels = [];
  for (const rowEl of rowEls) {
    if (rowEl.name !== "mtr" && rowEl.name !== "mlabeledtr") fail(`<${rowEl.name}> in mtable`);
    const cellEls = elements(rowEl);
    let label;
    if (rowEl.name === "mlabeledtr") {
      const labelEl = cellEls.shift();
      if (!labelEl) fail("mlabeledtr");
      label = layoutRow(elements(labelEl), { ...cellCtx, display: false }).box;
    }
    const rowAligns = rowEl.attrs.columnalign ? list2(rowEl.attrs.columnalign, "center") : void 0;
    rows.push(
      cellEls.map((cellEl, c) => {
        if (cellEl.name !== "mtd") fail(`<${cellEl.name}> in mtr`);
        if ((cellEl.attrs.rowspan ?? "1") !== "1" || (cellEl.attrs.columnspan ?? "1") !== "1") fail("spanning cell");
        const align = alignOf(cellEl.attrs.columnalign ?? pick(rowAligns ?? tableAligns, c));
        const row = layoutRow(elements(cellEl), cellCtx);
        return { box: row.box, align, row };
      })
    );
    labels.push(label);
  }
  if (rows.length === 0) return blank(0);
  const columns = Math.max(...rows.map((r) => r.length));
  const widths = Array.from({ length: columns }, (_, c) => Math.max(0, ...rows.map((r) => r[c]?.box.width ?? 0)));
  const gaps = Array.from({ length: Math.max(0, columns - 1) }, (_, c) => {
    const line = pick(columnLines, c);
    const space = pick(spacing, c);
    return line === "none" ? { space, line: "" } : { space: Math.max(3, space | 1), line: line === "dashed" ? "┆" : "│" };
  });
  const tall = rows.some((r) => r.some((cell) => height(cell.box) > 1));
  if (tableWidth !== void 0 && ctx.level === 0) breakCells(rows, widths, gaps, tableWidth);
  const rowBoxes = rows.map((r) => {
    const up = Math.max(0, ...r.map((cell) => above(cell.box)));
    const down = Math.max(0, ...r.map((cell) => below(cell.box)));
    const parts = [];
    for (let c = 0; c < columns; c++) {
      const cell = r[c] ?? { box: blank(0), align: "center" };
      parts.push(widen(extend(cell.box, up, down), widths[c], cell.align));
      const g = gaps[c];
      if (g && c < columns - 1) {
        const left = g.line ? (g.space - 1) / 2 : g.space;
        const right = g.line ? g.space - 1 - left : 0;
        parts.push(blank(left, up + down + 1, up));
        if (g.line) parts.push({ rows: Array.from({ length: up + down + 1 }, () => [g.line]), width: 1, base: up });
        if (right) parts.push(blank(right, up + down + 1, up));
      }
    }
    return extend(hcat(parts), up, down);
  });
  const width = Math.max(...rowBoxes.map((b) => b.width));
  const lineCols = [];
  let col = 0;
  for (let c = 0; c < columns - 1; c++) {
    col += widths[c];
    const g = gaps[c];
    if (g.line) lineCols.push(col + (g.space - 1) / 2);
    col += g.space;
  }
  const separator = (r) => {
    const line = pick(rowLines, r);
    if (line !== "none") {
      const cellsRow = Array(width).fill(line === "dashed" ? "┄" : "─");
      for (const x2 of lineCols) cellsRow[x2] = "┼";
      return { rows: [cellsRow], width, base: 0 };
    }
    return tall ? blank(width) : void 0;
  };
  const stacked = [];
  const ruled = /* @__PURE__ */ new Set();
  let at = 0;
  rowBoxes.forEach((box, r) => {
    if (r > 0) {
      const sep = separator(r - 1);
      if (sep) {
        if (pick(rowLines, r - 1) !== "none") ruled.add(at);
        stacked.push(sep);
        at += height(sep);
      }
    }
    stacked.push(widen(box, width, "left"));
    at += height(box);
  });
  let body = vstack(stacked, "left", Math.floor((at - 1) / 2));
  const frame2 = el.attrs.frame;
  if (frame2 !== void 0 && frame2 !== "none") {
    const [h, v] = frame2 === "dashed" ? ["┄", "┆"] : ["─", "│"];
    const edge = (l, r, tee) => {
      const row = [l, ...Array(body.width + 2).fill(h), r];
      for (const x2 of lineCols) row[x2 + 2] = tee;
      return row;
    };
    const middle = body.rows.map((row, y) => ruled.has(y) ? ["├", h, ...row, h, "┤"] : [v, " ", ...row, " ", v]);
    body = { rows: [edge("┌", "┐", "┬"), ...middle, edge("└", "┘", "┴")], width: body.width + 4, base: body.base + 1 };
  }
  if (labels.some((l) => l !== void 0)) {
    const labelWidth = Math.max(...labels.map((l) => l?.width ?? 0));
    const column = [];
    rowBoxes.forEach((box, r) => {
      if (r > 0) {
        const sep = separator(r - 1);
        if (sep) column.push(blank(labelWidth, height(sep)));
      }
      const label = labels[r];
      column.push(label ? widen(extend(label, box.base, below(box)), labelWidth, "right") : blank(labelWidth, height(box)));
    });
    if (frame2 !== void 0 && frame2 !== "none") {
      column.unshift(blank(labelWidth));
      column.push(blank(labelWidth));
    }
    const labelBox = vstack(column, "left", body.base);
    body = hcat([body, blank(2, height(body), body.base), labelBox]);
  }
  return body;
}
export{layoutMath,parseXml2,lines,initTypeset,typeset,texToMathML2,createLineScanner,scan,typesetLoaded};
