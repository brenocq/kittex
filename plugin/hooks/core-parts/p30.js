import{wrapLine,codeWidth,unfollowableFrom,marked2,linksHold,MAX_ITEMS,MAX_INDENT,MIN_TEXT,inline2,cutPartial,LEADING_SPACE,textWidth,ROMAN,QUOTE_TEXT,QUOTE_BAR,MAX_NESTING,MAX_ITEMS2,MAX_INDENT2,REPLY_INDENT,unfollowable,visibleProse,MAX_ROWS,MIN_COLUMN,TABLE_MARGIN,MAX_CELL_ROWS,RULE_MAX,EMPTY,proseBlocks}from'./p29.js';export*from'./p29.js';
function wrapRows(line, columns, sequences = false) {
  const wrapped = wrapLine(line, columns, true, sequences);
  if (!wrapped) return null;
  const rows = Array.from({ length: wrapped.rows }, () => "");
  for (let i2 = 0; i2 < line.length; i2++) {
    const at = wrapped.row[i2];
    if (!wrapped.hidden[i2]) rows[at] = rows[at] + line[i2];
  }
  return rows;
}
// core/src/layout/list.ts
var Canvas = class {
  /** `sequences`: emoji sequences are characters (charAt). `partial`: draw up to what can't be followed (see stop). */
  constructor(width, sequences = false, partial = false) {
    this.width = width;
    this.sequences = sequences;
    this.partial = partial;
  }
  width;
  sequences;
  partial;
  text = [];
  source = [];
  row = [];
  col = [];
  /** Whether the character is the last of a text the engine trims at its end (the end of an item's text or a paragraph). */
  end = [];
  cells = [];
  rows = 0;
  /**
   * A partial drawing (`partial`): the markdown offset from which nothing is
   * drawn, once something the replay doesn't follow was met (Infinity until
   * then). Everything drawn before it is where the engine draws it.
   */
  stop = Infinity;
  /** Stops the drawing at a markdown offset (a partial drawing; see stop). */
  halt(offset) {
    this.stop = Math.min(this.stop, offset);
  }
  /** Puts text that isn't from a span (a marker) at a cell. */
  put(text, row, col) {
    this.grow(row + 1);
    for (const [k, char] of [...text].entries()) this.cells[row][col + k] = char;
  }
  /**
   * Draws a text (the engine's prose, after its trims) from `top`, wrapped in
   * a box `width` cells wide whose left edge is `left`. False when a line
   * can't be laid out.
   */
  draw(visible, top, left, width) {
    let r = top;
    let at = 0;
    for (const line of visible.text.split("\n")) {
      const wrapped = wrapLine(line, width, true, this.sequences, this.partial);
      if (!wrapped) return false;
      this.grow(r + wrapped.rows);
      const known = wrapped.known ?? line.length;
      for (let i2 = 0; i2 < known; i2++) {
        this.unit(line[i2], visible.source[at + i2], r + wrapped.row[i2], left + wrapped.col[i2], !wrapped.hidden[i2], wrapped.cells[i2]);
      }
      if (known < line.length) {
        for (let i2 = at + known; i2 < visible.source.length; i2++) if (visible.source[i2] >= 0) this.halt(visible.source[i2]);
        if (visible.stop !== void 0) this.halt(visible.stop);
        return false;
      }
      this.text.push("\n");
      this.source.push(-1);
      this.row.push(r + wrapped.rows - 1);
      this.col.push(-1);
      this.end.push(false);
      r += wrapped.rows;
      at += line.length + 1;
    }
    this.text.pop();
    this.source.pop();
    this.row.pop();
    this.col.pop();
    this.end.pop();
    if (visible.stop !== void 0) {
      this.halt(visible.stop);
      return false;
    }
    if (this.end.length > 0) this.end[this.end.length - 1] = true;
    return true;
  }
  /**
   * Puts one UTF-16 unit of drawn text at a cell (its column as wrapLine
   * gives it); `drawn: false` counts it without drawing it (a space the
   * engine hides at a row's start). `cells`: the cells of the character the
   * unit starts, as wrapLine gives them (-1: the unit continues the character
   * before it, in its cell); by default, its code point's.
   */
  unit(unit, source, row, col, drawn = true, cells2) {
    this.grow(row + 1);
    this.text.push(unit);
    this.source.push(source);
    this.row.push(row);
    this.col.push(col);
    this.end.push(false);
    if (!drawn) return;
    const line = this.cells[row];
    const code = unit.charCodeAt(0);
    let width;
    if (cells2 === void 0 ? code >= 56320 && code <= 57343 : cells2 < 0) {
      line[col] = (line[col] ?? "") + unit;
      width = cells2 === void 0 ? codeWidth(line[col].codePointAt(0)) : 0;
    } else if (code < 55296 && codeWidth(code) === 0) {
      const at = Math.max(0, col - 1);
      line[at] = (line[at] ?? "") + unit;
      return;
    } else {
      line[col] = unit;
      width = cells2 ?? codeWidth(code);
    }
    if (width === 2) line[col + 1] = "";
  }
  lines() {
    this.grow(this.rows);
    return this.cells.slice(0, this.rows).map((cells2) => Array.from(cells2, (cell) => cell ?? " ").join("").replace(/ +$/, ""));
  }
  grow(rows) {
    while (this.cells.length < rows) this.cells.push([]);
    this.rows = Math.max(this.rows, rows);
  }
};
function drawList(markdown, width, mode = {}, partial = false) {
  if (!(width >= 1)) return null;
  const cut = unfollowableFrom(markdown);
  if (cut !== void 0) {
    if (!partial || cut === 0) return null;
    const canvas2 = drawList(markdown.slice(0, cut), width, mode, true);
    canvas2?.halt(cut);
    return canvas2;
  }
  const links = { hyperlinks: mode.hyperlinks, linked: { value: false } };
  let tokens;
  try {
    tokens = marked2.lexer(markdown);
  } catch {
    return null;
  }
  const canvas = new Canvas(width, mode.emojiSequences === true, partial);
  const stopped = () => partial && canvas.stop < Infinity && linksHold(markdown, links) ? canvas : null;
  let at = 0;
  let listed = false;
  let after = "";
  for (const token2 of tokens) {
    if (!markdown.startsWith(token2.raw, at)) return null;
    const mapped = { text: token2.raw, map: Array.from({ length: token2.raw.length }, (_, k) => at + k) };
    if (token2.type === "paragraph" && !listed && at === 0) {
      const paragraph2 = token2;
      const visible = textOf([{ tokens: paragraph2.tokens ?? [], text: paragraph2.text, at: 0 }], mapped, false, links, partial);
      if (!visible || !fits(visible, width, partial) || !canvas.draw(visible, 0, 0, width)) return stopped();
    } else if (token2.type === "list" && (!listed || after === "list")) {
      listed = true;
      if (!drawItems(canvas, token2, mapped, 0, 0, links)) return stopped();
    } else if (token2.type !== "space" || !listed) {
      if (!partial || !listed) return null;
      canvas.halt(at);
      return stopped();
    }
    at += token2.raw.length;
    after = token2.type;
  }
  return listed && at === markdown.length && linksHold(markdown, links) ? canvas : null;
}
function drawItems(canvas, list3, raw, indent, depth, links) {
  if (list3.items.length === 0 || list3.items.length > MAX_ITEMS) return false;
  const first = list3.start === "" || list3.start === void 0 ? 1 : Number(list3.start);
  const last = first + list3.items.length - 1;
  let at = 0;
  for (const [u, item] of list3.items.entries()) {
    if (!raw.text.startsWith(item.raw, at)) return false;
    const marker = list3.ordered ? markerOf(depth, first + u, first, last) : "-";
    const blank2 = u > 0 && endsInBlank(list3.items[u - 1]);
    const itemRaw = { text: item.raw, map: raw.map.slice(at, at + item.raw.length) };
    if (!drawItem(canvas, item, itemRaw, marker, indent, depth, blank2, links)) {
      if (canvas.stop === Infinity) canvas.halt(itemRaw.map[0] ?? 0);
      return false;
    }
    at += item.raw.length;
  }
  return /^\s*$/.test(raw.text.slice(at));
}
function drawItem(canvas, item, raw, marker, indent, depth, blank2, links) {
  if (item.task) return false;
  const text = itemText(item, raw);
  if (!text) return false;
  const parts = [];
  let at = 0;
  let halt;
  for (const token2 of item.tokens) {
    if (token2.type === "list") {
      const list3 = token2;
      if (list3.ordered && list3.items.every((one) => one.tokens.length === 0)) return false;
      const start = text.text.indexOf(list3.raw, at);
      if (start < 0) return false;
      parts.push({ kind: "list", list: list3, raw: { text: list3.raw, map: text.map.slice(start, start + list3.raw.length) } });
      at = start + list3.raw.length;
      continue;
    }
    let part = parts.at(-1);
    if (part?.kind !== "inline") parts.push(part = { kind: "inline", runs: [], newlines: "" });
    if (token2.type === "space") {
      part.runs.push({ space: true });
    } else if (token2.type === "text") {
      const run2 = token2;
      const start = text.text.indexOf(run2.text, at);
      if (start < 0 || !run2.tokens) return false;
      part.runs.push({ tokens: run2.tokens, text: run2.text, at: start });
      at = start + run2.text.length;
    } else {
      const start = text.text.indexOf(token2.raw.trimStart(), at);
      halt = text.map[start < 0 ? at : start] ?? raw.map[0] ?? 0;
      break;
    }
  }
  if (parts[0]?.kind !== "inline") return false;
  const box = Math.max(2, textWidthOf(marker) + 1);
  const nested = Math.min(indent + box, MAX_INDENT);
  const left = indent + box;
  const room = canvas.width - left;
  let gap2 = blank2;
  for (const [m, part] of parts.entries()) {
    if (part.kind === "list") {
      const top2 = canvas.rows + (gap2 ? 1 : 0);
      canvas.rows = top2;
      if (!drawItems(canvas, part.list, part.raw, nested, depth + 1, links)) return false;
      gap2 = false;
      continue;
    }
    const drawn = textOf(part.runs, text, true, links, canvas.partial);
    if (!drawn) return false;
    const opens = drawn.lead;
    if (drawn.text === "" && m > 0 && drawn.stop === void 0) {
      gap2 ||= drawn.newline;
      continue;
    }
    if (room < MIN_TEXT) return false;
    const shown = fits(drawn, room, canvas.partial);
    if (!shown || shown.text === "" && (m === 0 || shown.stop === void 0)) {
      if (shown?.stop !== void 0) canvas.halt(shown.stop);
      return false;
    }
    const top = canvas.rows + (gap2 || m > 0 && opens ? 1 : 0);
    if (m === 0) canvas.put(marker, top, indent);
    if (!canvas.draw(shown, top, left, room)) return false;
    gap2 = drawn.blankAfter;
  }
  if (halt === void 0) return true;
  canvas.halt(halt);
  return false;
}
function textOf(runs, owner, glue, links, partial = false) {
  const out = { text: "", source: [] };
  for (const run2 of runs) {
    if (run2.space) {
      out.text += "\n";
      out.source.push(-1);
      continue;
    }
    const drawn = { text: "", source: [] };
    const followed = inline2(drawn, run2.tokens, run2.text, run2.at, glue, links);
    if (!followed && (!partial || drawn.stop === void 0)) return null;
    out.text += drawn.text + (followed ? "\n" : "");
    for (const offset of drawn.source) out.source.push(offset < 0 ? -1 : owner.map[offset] ?? -1);
    if (followed) {
      out.source.push(-1);
      continue;
    }
    out.stop = owner.map[drawn.stop] ?? owner.map.at(-1) ?? 0;
    break;
  }
  const raw = out.text;
  const lead = /^\n*/.exec(raw)[0].length;
  const kept = out.stop === void 0 ? raw.slice(lead).trimEnd().length : raw.length - lead;
  const text = raw.slice(lead, lead + kept);
  const source = out.source.slice(lead, lead + kept);
  const shown = out.stop === void 0 ? { text, source } : cutPartial({ text, source }, out.stop);
  return {
    ...shown,
    lead: raw.startsWith("\n"),
    blankAfter: out.stop === void 0 && /\n\s*\n$/.test(raw) && raw.endsWith("\n"),
    newline: raw.includes("\n")
  };
}
function fits(visible, width, partial) {
  let at = 0;
  for (const line of visible.text.split("\n")) {
    if (LEADING_SPACE.test(line) && !(textWidth(line) >= 0 && textWidth(line) <= width)) {
      if (!partial) return null;
      return { ...visible, ...cutPartial(visible, visible.stop ?? Infinity, at === 0 ? 0 : at) };
    }
    at += line.length + 1;
  }
  return visible;
}
function itemText(item, raw) {
  const lines2 = item.text.split("\n");
  const rawLines = raw.text.split("\n");
  if (lines2.length > rawLines.length) return null;
  const map = [];
  let rawAt = 0;
  for (const [k, line] of lines2.entries()) {
    const rawLine = rawLines[k];
    if (!rawLine.endsWith(line)) return null;
    const start = rawAt + rawLine.length - line.length;
    for (let i2 = 0; i2 < line.length; i2++) map.push(raw.map[start + i2]);
    if (k < lines2.length - 1) map.push(raw.map[rawAt + rawLine.length] ?? -1);
    rawAt += rawLine.length + 1;
  }
  return { text: item.text, map };
}
function endsInBlank(item) {
  const last = item.tokens.at(-1);
  if (last?.type === "space") return true;
  if (last?.type === "list") {
    const inner = last.items.at(-1);
    return inner ? endsInBlank(inner) : false;
  }
  return false;
}
function markerOf(depth, number, first, last) {
  if (depth === 1 && first >= 1) return `${letters(number)}.`;
  if (depth === 2 && first >= 1 && last <= 3999) return `${roman(number)}.`;
  return `${number}.`;
}
function letters(n) {
  let out = "";
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(97 + n % 26) + out;
    n = Math.floor(n / 26);
  }
  return out;
}
function roman(n) {
  let out = "";
  for (const [value, digits2] of ROMAN) while (n >= value) out += digits2, n -= value;
  return out;
}
function textWidthOf(text) {
  let cells2 = 0;
  for (const char of text) cells2 += Math.max(0, codeWidth(char.codePointAt(0)));
  return cells2;
}
// core/src/layout/heading.ts
function drawHeading(markdown, width, mode = {}, partial = false) {
  const visible = visibleHeading(markdown, mode, partial);
  if (!visible || !(width >= 1)) return null;
  const canvas = new Canvas(width, mode.emojiSequences === true, partial);
  return canvas.draw(visible, 0, 0, width) || canvas.stop < Infinity ? canvas : null;
}
function visibleHeading(markdown, mode = {}, partial = false) {
  const cut = unfollowableFrom(markdown);
  if (cut !== void 0) {
    if (!partial || cut === 0) return null;
    const before = visibleHeading(markdown.slice(0, cut - 1), mode, true);
    return before && { ...before, stop: Math.min(before.stop ?? Infinity, cut) };
  }
  const links = { hyperlinks: mode.hyperlinks, linked: { value: false } };
  let tokens;
  try {
    tokens = marked2.lexer(markdown);
  } catch {
    return null;
  }
  const heading2 = tokens[0];
  if (heading2?.type !== "heading") return null;
  const trailing = tokens.slice(1).some((token2) => token2.type !== "space");
  if (trailing && !partial) return null;
  const { text, raw } = heading2;
  if (!markdown.startsWith(raw) || text === "") return null;
  const at = /^ {0,3}(?:#{1,6}[ \t]+)?/.exec(raw)[0].length;
  if (!raw.startsWith(text, at)) return null;
  const out = { text: "", source: [] };
  const followed = inline2(out, heading2.tokens, text, at, false, links);
  if (!followed && !(partial && out.stop !== void 0) || !linksHold(markdown, links)) return null;
  const kept = followed ? out.text.trimEnd().length : out.text.length;
  let visible = { text: out.text.slice(0, kept), source: out.source.slice(0, kept) };
  if (!followed) visible = cutPartial(visible, out.stop);
  if (followed && visible.text === "" || visible.text.startsWith("\n")) return null;
  const space = LEADING_SPACE.exec(visible.text);
  if (space) {
    if (!partial) return null;
    visible = cutPartial(visible, visible.stop ?? Infinity, space.index + 1);
  }
  return trailing && visible.stop === void 0 ? { ...visible, stop: raw.length } : visible;
}
// core/src/layout/quote.ts
var INNER_SPACES = /\S {2}/;
function drawQuote(markdown, width, mode = {}, partial = false) {
  if (!(width > QUOTE_TEXT)) return null;
  const upTo = (offset) => {
    const cut = markdown.lastIndexOf("\n", offset - 1) + 1;
    if (!partial || cut <= 0 || cut >= markdown.length) return null;
    const canvas2 = drawQuote(markdown.slice(0, cut - 1), width, mode, true);
    canvas2?.halt(cut);
    return canvas2;
  };
  const unfollowed = unfollowableFrom(markdown);
  if (unfollowed !== void 0) return upTo(unfollowed);
  const lexed = markdown.endsWith("\n") ? markdown : markdown + "\n";
  let tokens;
  try {
    tokens = marked2.lexer(lexed);
  } catch {
    return null;
  }
  const quote = tokens[0];
  if (quote?.type !== "blockquote" || !lexed.startsWith(quote.raw)) return null;
  if (tokens.slice(1).some((token2) => token2.type !== "space")) return upTo(quote.raw.length);
  const raw = { text: lexed, map: Array.from({ length: lexed.length }, (_, k) => k) };
  const links = { hyperlinks: mode.hyperlinks, linked: { value: false } };
  const failed = { at: Infinity };
  const inner = quoteText(quote, raw, 0, 0, links, failed);
  if (!inner) return failed.at < Infinity ? upTo(failed.at) : null;
  if (!linksHold(markdown, links)) return null;
  const lead = /^\n*/.exec(inner.text)[0].length;
  const kept = inner.text.slice(lead).trimEnd().length;
  const visible = { text: inner.text.slice(lead, lead + kept), source: inner.source.slice(lead, lead + kept) };
  if (visible.text === "") return null;
  const sequences = mode.emojiSequences === true;
  let at = 0;
  for (const line of visible.text.split("\n")) {
    const cells2 = textWidth(line, sequences);
    if (INNER_SPACES.test(line) && !(cells2 >= 0 && cells2 <= width - QUOTE_TEXT)) {
      const from = visible.source.slice(at, at + line.length).find((offset) => offset >= 0);
      return from === void 0 ? null : upTo(from);
    }
    at += line.length + 1;
  }
  const canvas = new Canvas(width, sequences, partial);
  if (!canvas.draw(visible, 0, QUOTE_TEXT, width - QUOTE_TEXT) && canvas.stop === Infinity) return null;
  for (let row = 0; row < canvas.rows; row++) canvas.put(QUOTE_BAR, row, 0);
  return canvas;
}
var Text = class {
  text = "";
  source = [];
  add(text, source = -1) {
    this.text += text;
    for (let i2 = 0; i2 < text.length; i2++) this.source.push(source < 0 ? -1 : source + i2);
    return this;
  }
  append(other2) {
    this.text += other2.text;
    this.source.push(...other2.source);
    return this;
  }
  /** Splits at newlines, as the engine's `split("\n")` does. */
  lines() {
    const out = [];
    let at = 0;
    for (const line of this.text.split("\n")) {
      out.push({ text: line, source: this.source.slice(at, at + line.length) });
      at += line.length + 1;
    }
    return out;
  }
};
function quoteText(quote, raw, at, depth, links, failed = { at: Infinity }) {
  if (depth >= MAX_NESTING) return null;
  const inner = stripQuote(raw, at, quote);
  if (!inner) {
    const lines2 = quote.raw.split("\n");
    const lazy = lines2.findIndex((line, k) => k > 0 && line.trim() !== "" && !/^ {0,3}>/.test(line));
    if (lazy > 0) failed.at = Math.min(failed.at, raw.map[at + lines2.slice(0, lazy).join("\n").length + 1] ?? Infinity);
    return null;
  }
  const out = new Text();
  let from = 0;
  const fail2 = (offset) => {
    if (failed.at === Infinity) failed.at = inner.map[offset] ?? Infinity;
    return null;
  };
  for (const token2 of quote.tokens) {
    const start = inner.text.indexOf(token2.raw, from);
    if (start < 0 || /\S/.test(inner.text.slice(from, start))) return fail2(from);
    const drawn = blockText2(token2, inner, start, depth, links, failed);
    if (!drawn) return fail2(start);
    out.append(drawn);
    from = start + token2.raw.length;
  }
  return /\S/.test(inner.text.slice(from)) ? fail2(from) : out;
}
function stripQuote(raw, at, quote) {
  if (!raw.text.startsWith(quote.raw, at)) return null;
  let text = "";
  const map = [];
  let offset = at;
  for (const [k, line] of quote.raw.split("\n").entries()) {
    if (k > 0) {
      text += "\n";
      map.push(raw.map[offset - 1] ?? -1);
    }
    const marker = /^ {0,3}>[ \t]?/.exec(line)?.[0].length ?? 0;
    text += line.slice(marker);
    for (let i2 = marker; i2 < line.length; i2++) map.push(raw.map[offset + i2] ?? -1);
    offset += line.length + 1;
  }
  if (text === quote.text) return { text, map };
  return text.endsWith("\n") && text.slice(0, -1) === quote.text ? { text: quote.text, map: map.slice(0, -1) } : null;
}
function blockText2(token2, owner, at, depth, links, failed) {
  switch (token2.type) {
    case "space":
      return new Text().add("\n");
    case "paragraph":
    case "heading": {
      const block2 = token2;
      const start = token2.type === "heading" ? at + /^ {0,3}(?:#{1,6}[ \t]+)?/.exec(block2.raw)[0].length : at;
      if (!owner.text.startsWith(block2.text, start) || block2.text === "") return null;
      const drawn = inlineText2(block2.tokens, block2.text, start, owner, false, links, failed);
      return drawn ? drawn.add(token2.type === "heading" ? "\n\n" : "\n") : null;
    }
    case "blockquote": {
      const inner = quoteText(token2, owner, at, depth + 1, links, failed);
      if (!inner) return null;
      const out = new Text();
      for (const [k, line] of inner.lines().entries()) {
        if (k > 0) out.add("\n");
        if (line.text.trim() !== "") out.add(QUOTE_BAR + " ");
        out.append(line);
      }
      return out;
    }
    case "list":
      return listText(token2, { text: token2.raw, map: owner.map.slice(at, at + token2.raw.length) }, 0, "", links, failed);
    default:
      return null;
  }
}
function inlineText2(tokens, src, at, owner, glue, links, failed) {
  const drawn = { text: "", source: [] };
  if (!inline2(drawn, tokens, src, at, glue, links)) {
    if (failed && failed.at === Infinity && drawn.stop !== void 0) failed.at = owner.map[drawn.stop] ?? Infinity;
    return null;
  }
  const out = new Text();
  out.text = drawn.text;
  out.source = drawn.source.map((offset) => offset < 0 ? -1 : owner.map[offset] ?? -1);
  return out;
}
function listText(list3, raw, depth, indent, links, failed) {
  if (depth >= MAX_NESTING || list3.items.length === 0 || list3.items.length > MAX_ITEMS2) return null;
  const first = list3.start === "" || list3.start === void 0 ? 1 : Number(list3.start);
  const last = first + list3.items.length - 1;
  const out = new Text();
  let at = 0;
  for (const [u, item] of list3.items.entries()) {
    if (!raw.text.startsWith(item.raw, at)) return null;
    const marker = list3.ordered ? markerOf(depth, first + u, first, last) : "-";
    const drawn = itemOf(item, { text: item.raw, map: raw.map.slice(at, at + item.raw.length) }, marker, depth, indent, links, failed);
    if (!drawn) return null;
    out.append(drawn);
    at += item.raw.length;
  }
  return /^\s*$/.test(raw.text.slice(at)) ? out : null;
}
function itemOf(item, raw, marker, depth, indent, links, failed) {
  if (item.task) return null;
  const text = itemText(item, raw);
  if (!text) return null;
  const hang = indent + " ".repeat(textWidthOf(marker) + 1);
  const nested = " ".repeat(Math.min(hang.length, MAX_INDENT2));
  const tokens = item.tokens.slice(Math.max(0, item.tokens.findIndex((token2) => token2.type !== "space")));
  if (tokens[0]?.type !== "text") return null;
  const out = new Text();
  let opened = false;
  let at = 0;
  for (const token2 of tokens) {
    if (token2.type === "space") {
      out.add("\n");
    } else if (token2.type === "list") {
      const list3 = token2;
      if (list3.ordered && list3.items.every((one) => one.tokens.length === 0)) return null;
      const start = text.text.indexOf(list3.raw, at);
      if (start < 0) return null;
      const drawn = listText(list3, { text: list3.raw, map: text.map.slice(start, start + list3.raw.length) }, depth + 1, nested, links, failed);
      if (!drawn) return null;
      out.append(drawn);
      at = start + list3.raw.length;
    } else if (token2.type === "text") {
      const run2 = token2;
      const start = text.text.indexOf(run2.text, at);
      if (start < 0 || !run2.tokens) return null;
      const drawn = inlineText2(run2.tokens, run2.text, start, text, true, links, failed);
      if (!drawn) return null;
      for (const [k, line] of drawn.add("\n").lines().entries()) {
        if (k > 0) out.add("\n");
        if (k === 0) out.add(opened ? hang : `${indent}${marker} `);
        else if (line.text !== "") out.add(hang);
        out.append(line);
      }
      opened = true;
      at = start + run2.text.length;
    } else {
      const start = text.text.indexOf(token2.raw.trimStart(), at);
      if (failed && failed.at === Infinity) failed.at = text.map[start < 0 ? at : start] ?? Infinity;
      return null;
    }
  }
  return out;
}
// core/src/layout/table.ts
function run(text, source = -1) {
  return { text, source: Array.from({ length: text.length }, () => source) };
}
function concat(...runs) {
  return { text: runs.map((one) => one.text).join(""), source: runs.flatMap((one) => one.source) };
}
function slice(of, start, end = of.text.length) {
  return { text: of.text.slice(start, end), source: of.source.slice(start, end) };
}
function trim(of) {
  const start = of.text.length - of.text.trimStart().length;
  return slice(of, start, start + of.text.trim().length);
}
function wrapCell(text, width, hard, sequences) {
  const trimmed2 = slice(text, 0, text.text.trimEnd().length);
  if (trimmed2.text === "") return [{ units: [], width: 0 }];
  const wrapped = wrapLine(trimmed2.text, width, hard, sequences);
  if (!wrapped) return null;
  const rows = Array.from({ length: wrapped.rows }, () => ({ units: [], width: 0 }));
  const shifted = new Uint8Array(wrapped.rows);
  for (let i2 = 0; i2 < trimmed2.text.length; i2++) if (wrapped.hidden[i2]) shifted[wrapped.row[i2]] = 1;
  for (let i2 = 0; i2 < trimmed2.text.length; i2++) {
    const row = rows[wrapped.row[i2]];
    const col = wrapped.hidden[i2] ? 0 : wrapped.col[i2] + shifted[wrapped.row[i2]];
    const cells2 = wrapped.cells[i2];
    row.units.push({ unit: trimmed2.text[i2], source: trimmed2.source[i2], col, cells: cells2 });
    row.width += Math.max(0, cells2);
  }
  const kept = rows.filter((row) => row.units.length > 0);
  return kept.length > 0 ? kept : [{ units: [], width: 0 }];
}
function rowRun(row) {
  return { text: row.units.map((one) => one.unit).join(""), source: row.units.map((one) => one.source) };
}
function drawTable(markdown, columns, proseWidth = columns - REPLY_INDENT, mode = {}) {
  if (unfollowable(markdown) || !(columns >= 1) || !(proseWidth >= 1)) return null;
  let tokens;
  try {
    tokens = marked2.lexer(markdown);
  } catch {
    return null;
  }
  const links = { hyperlinks: mode.hyperlinks, linked: { value: false } };
  const sequences = mode.emojiSequences === true;
  const canvas = new Canvas(columns, sequences);
  let at = 0;
  let table2;
  let top = 0;
  for (const token2 of tokens) {
    if (!markdown.startsWith(token2.raw, at)) return null;
    if (token2.type === "paragraph" && at === 0) {
      const visible = visibleProse(token2.raw, mode);
      if (!visible) return null;
      const rows = drawProse(canvas, visible, proseWidth);
      if (rows === null) return null;
      top = rows + 1;
    } else if (token2.type === "table" && !table2) {
      table2 = token2;
      if (!drawTableToken(canvas, table2, markdown.slice(at, at + token2.raw.length), at, top, columns, links, sequences)) return null;
    } else if (token2.type !== "space" || !table2) {
      return null;
    }
    at += token2.raw.length;
  }
  return table2 && at === markdown.length && linksHold(markdown, links) ? canvas : null;
}
function drawProse(canvas, visible, width, top = 0) {
  return canvas.draw(visible, top, 0, width) ? canvas.rows - top : null;
}
function splitCells2(line, base, count) {
  const segments = [];
  let start = 0;
  for (let i2 = 0; i2 < line.length; i2++) {
    if (line[i2] !== "|") continue;
    let escaped = false;
    for (let k = i2 - 1; k >= 0 && line[k] === "\\"; k--) escaped = !escaped;
    if (escaped) continue;
    segments.push([start, i2]);
    start = i2 + 1;
  }
  segments.push([start, line.length]);
  const blank2 = ([from, to]) => line.slice(from, to).trim() === "";
  if (segments.length > 0 && blank2(segments[0])) segments.shift();
  if (segments.length > 0 && blank2(segments.at(-1))) segments.pop();
  if (count !== void 0) {
    if (segments.length > count) segments.splice(count);
    while (segments.length < count) segments.push([line.length, line.length]);
  }
  return segments.map(([from, to]) => {
    const raw = line.slice(from, to);
    const lead = raw.length - raw.trimStart().length;
    const end = from + lead + raw.trim().length;
    let text = "";
    const map = [];
    for (let k = from + lead; k < end; k++) {
      if (line[k] === "\\" && line[k + 1] === "|" && k + 1 < end) {
        text += "|";
        map.push(base + k + 1);
        k += 1;
      } else {
        text += line[k];
        map.push(base + k);
      }
    }
    return { text, map };
  });
}
function codePipesAlike(line) {
  if (!line.includes("`") || !line.includes("|")) return true;
  const starts = [];
  const lengths = [];
  for (let c = 0; c < line.length; ) {
    if (line[c] !== "`") {
      c++;
      continue;
    }
    let d = 0;
    while (line[c + d] === "`") d++;
    starts.push(c);
    lengths.push(d);
    c += d;
  }
  const closes = new Array(starts.length).fill(-1);
  const next = /* @__PURE__ */ new Map();
  for (let c = starts.length - 1; c >= 0; c--) {
    const found = next.get(lengths[c]);
    if (found !== void 0) closes[c] = found;
    next.set(lengths[c], c);
  }
  for (let p = 0; p < starts.length; ) {
    const close = closes[p];
    if (close === -1) {
      p++;
      continue;
    }
    const code = line.slice(starts[p] + lengths[p], starts[close]);
    for (const pipe of code.matchAll(/(\\*)\|/g)) if (pipe[1].length % 2 === 0) return false;
    p = close + 1;
  }
  return true;
}
function engineCells(line) {
  const cells2 = line.replace(/\|/g, (_match, offset, all) => {
    let escaped = false;
    for (let p = offset - 1; p >= 0 && all[p] === "\\"; p--) escaped = !escaped;
    return escaped ? "|" : " |";
  }).split(/ \|/);
  if (!cells2[0]?.trim()) cells2.shift();
  if (cells2.length > 0 && !cells2.at(-1)?.trim()) cells2.pop();
  return cells2;
}
function drawTableToken(canvas, table2, raw, offset, top, columns, links, sequences) {
  const lines2 = raw.split("\n");
  if (!lines2.every(codePipesAlike)) return false;
  for (let n = 2; n < lines2.length; n++) {
    const cells2 = engineCells(lines2[n]);
    for (let s = table2.header.length; s < cells2.length; s++) if (cells2[s].trim()) return false;
  }
  if (table2.rows.length > MAX_ROWS || table2.header.length === 0) return false;
  const starts = [];
  for (let k = 0, p = offset; k < lines2.length; k++) {
    starts.push(p);
    p += lines2[k].length + 1;
  }
  const rowLines = lines2.slice(2);
  while (rowLines.length > 0 && rowLines.at(-1).trim() === "") rowLines.pop();
  if (rowLines.length !== table2.rows.length) return false;
  const cellRun = (cell, split2) => {
    if (!split2 || split2.text !== cell.text) return null;
    const out = { text: "", source: [] };
    if (!inline2(out, cell.tokens, cell.text, 0, false, links)) return null;
    if (textWidth(out.text, sequences) < 0 || /^\s|\s$/.test(out.text)) return null;
    return { text: out.text, source: out.source.map((k) => k < 0 ? -1 : split2.map[k] ?? -1) };
  };
  const headerSplit = splitCells2(lines2[0], starts[0]);
  if (headerSplit.length !== table2.header.length) return false;
  const header = [];
  for (const [c, cell] of table2.header.entries()) {
    const drawn = cellRun(cell, headerSplit[c]);
    if (!drawn) return false;
    header.push(drawn);
  }
  const body = [];
  for (const [r, row] of table2.rows.entries()) {
    const split2 = splitCells2(rowLines[r], starts[r + 2], table2.header.length);
    const cells2 = [];
    for (const [c, cell] of row.entries()) {
      const drawn = cellRun(cell, split2[c]);
      if (!drawn) return false;
      cells2.push(drawn);
    }
    if (cells2.length !== table2.header.length) return false;
    body.push(cells2);
  }
  const count = header.length;
  const all = [header, ...body];
  const widest = (text) => Math.max(MIN_COLUMN, ...text.split(/\s+/).filter((word) => word.length > 0).map((word) => textWidth(word, sequences)));
  const least = header.map((_, c) => Math.max(...all.map((cells2) => widest(cells2[c].text))));
  const ideal = header.map((_, c) => Math.max(...all.map((cells2) => Math.max(textWidth(cells2[c].text, sequences), MIN_COLUMN))));
  const room = Math.max(columns - (1 + count * 3) - TABLE_MARGIN, count * MIN_COLUMN);
  const sumLeast = least.reduce((a, b) => a + b, 0);
  const sumIdeal = ideal.reduce((a, b) => a + b, 0);
  let hard = false;
  let widths;
  if (sumIdeal <= room) {
    widths = ideal;
  } else if (sumLeast <= room) {
    const extra = room - sumLeast;
    const wants = ideal.map((w, c) => w - least[c]);
    const total = wants.reduce((a, b) => a + b, 0);
    widths = least.map((w, c) => total === 0 ? w : w + Math.floor(wants[c] / total * extra));
  } else {
    hard = true;
    const scale2 = room / sumLeast;
    widths = least.map((w) => Math.max(Math.floor(w * scale2), MIN_COLUMN));
  }
  const wrapped = [];
  for (const cells2 of all) {
    const rows = [];
    for (const [c, cell] of cells2.entries()) {
      const cellRows = wrapCell(cell, widths[c], hard, sequences);
      if (!cellRows) return false;
      rows.push(cellRows);
    }
    wrapped.push(rows);
  }
  const tall = Math.max(1, ...wrapped.flatMap((rows) => rows.map((cell) => cell.length)));
  if (tall > MAX_CELL_ROWS) return drawList2(canvas, header, body, top, columns, sequences);
  const border = (left, joint, right) => {
    let text = left;
    for (const [c, w] of widths.entries()) text += "─".repeat(w + 2) + (c < count - 1 ? joint : right);
    return { put: [[text, 0]], units: [], width: textWidth(text) };
  };
  const rowOfLines = (rows, isHeader) => {
    const height2 = Math.max(1, ...rows.map((cell) => cell.length));
    const out = [];
    for (let g = 0; g < height2; g++) {
      const line = { put: [["│", 0]], units: [], width: 0 };
      let x2 = 1;
      for (const [c, cell] of rows.entries()) {
        const k = g - Math.floor((height2 - cell.length) / 2);
        const content = k >= 0 && k < cell.length ? cell[k] : { units: [], width: 0 };
        const pad2 = Math.max(0, widths[c] - content.width);
        const align = isHeader ? "center" : table2.align[c] ?? "left";
        const left = align === "center" ? Math.floor(pad2 / 2) : align === "right" ? pad2 : 0;
        x2 += 1;
        for (const one of content.units) line.units.push({ ...one, col: x2 + left + one.col });
        x2 += content.width + pad2 + 1;
        line.put.push(["│", x2]);
        x2 += 1;
      }
      line.width = x2;
      out.push(line);
    }
    return out;
  };
  const drawnLines = [border("┌", "┬", "┐"), ...rowOfLines(wrapped[0], true), border("├", "┼", "┤")];
  for (const [r, rows] of wrapped.slice(1).entries()) {
    drawnLines.push(...rowOfLines(rows, false));
    if (r < body.length - 1) drawnLines.push(border("├", "┼", "┤"));
  }
  drawnLines.push(border("└", "┴", "┘"));
  if (Math.max(...drawnLines.map((line) => line.width)) > columns - TABLE_MARGIN) return drawList2(canvas, header, body, top, columns, sequences);
  for (const [k, line] of drawnLines.entries()) {
    canvas.grow(top + k + 1);
    for (const [text, col] of line.put) canvas.put(text, top + k, col);
    for (const one of line.units) canvas.unit(one.unit, one.source, top + k, one.col, true, one.cells);
  }
  return true;
}
function drawList2(canvas, header, body, top, columns, sequences) {
  const heads = header.map(trim);
  const rule = run("─".repeat(Math.max(0, Math.min(columns - 1, RULE_MAX))));
  const lines2 = [];
  for (const cells2 of body) {
    const rowLines = [];
    for (const [c, cell] of cells2.entries()) {
      const head = heads[c] ?? EMPTY;
      if (/\s\s/.test(cell.text)) return false;
      const text2 = trim({ text: cell.text.replace(/\s/g, " "), source: cell.source });
      if (head.text === "" && text2.text === "") continue;
      const first = head.text !== "" ? columns - textWidth(head.text, sequences) - 3 : columns - 1;
      const rest = columns - 3;
      const rows2 = wrapCell(text2, Math.max(first, 10), false, sequences);
      if (!rows2) return false;
      let parts = rows2.map(rowRun);
      if (parts.length > 1) {
        const joined = [];
        for (const [k, part] of parts.slice(1).entries()) {
          if (k > 0) joined.push(run(" "));
          joined.push(trim(part));
        }
        const more = wrapCell(concat(...joined), rest, false, sequences);
        if (!more) return false;
        parts = [parts[0], ...more.map(rowRun)];
      }
      rowLines.push(head.text !== "" ? concat(head, run(": "), parts[0] ?? EMPTY) : parts[0] ?? EMPTY);
      for (const part of parts.slice(1)) if (part.text.trim() !== "") rowLines.push(part);
    }
    if (rowLines.length === 0) continue;
    if (lines2.length > 0) lines2.push(rule);
    lines2.push(...rowLines);
  }
  const width = columns - REPLY_INDENT;
  if (width < 1) return false;
  for (const line of lines2) {
    if (LEADING_SPACE.test(line.text) && textWidth(line.text.trimEnd(), sequences) > width) return false;
  }
  const text = lines2.map((line) => line.text).join("\n");
  const rows = drawProse(canvas, { text, source: lines2.flatMap((line, k) => k > 0 ? [-1, ...line.source] : line.source) }, width, top);
  return rows !== null;
}
// core/src/layout/blocks.ts
var BLOCK_ELEMENTS = /* @__PURE__ */ new Set(["table", "blockquote"]);
var SPLITTABLE = /* @__PURE__ */ new Set(["paragraph", "list", "heading", "code", "table", "blockquote", "hr"]);
function blockParts(markdown) {
  const blocks = proseBlocks(markdown);
  if (!blocks) return null;
  const parts = [];
  for (const block2 of blocks) {
    const gap2 = parts.length > 0;
    const split2 = block2.paragraph || block2.quote ? null : splitBlock(markdown, block2.start, block2.end);
    if (split2) {
      parts.push(...split2.map((part, k) => ({ ...part, ...k === 0 ? { gap: gap2 } : {}, block: block2.start })));
    } else {
      const type = block2.paragraph ? "paragraph" : block2.list ? "list" : block2.quote ? "blockquote" : block2.heading ? "heading" : block2.table ? "table" : "block";
      parts.push({ ...block2, type, gap: gap2, block: block2.start });
    }
  }
  return parts;
}
function splitBlock(markdown, start, end) {
  const source = markdown.slice(start, /^\r?\n/.test(markdown.slice(end)) ? markdown.indexOf("\n", end) + 1 : end);
  let tokens;
  try {
    tokens = marked2.lexer(source);
  } catch {
    return null;
  }
  const parts = [];
  let at = 0;
  for (const token2 of tokens) {
    if (!source.startsWith(token2.raw, at)) return null;
    if (!SPLITTABLE.has(token2.type) || token2.type === "code" && token2.text === "") {
      const last2 = parts.at(-1);
      if (!last2) return null;
      last2.end = end;
      return parts;
    }
    const body = token2.raw.replace(/(?:\r?\n[ \t]*)+$/, "");
    const last = parts.at(-1);
    if (token2.type === "list" && last?.type === "list") {
      last.end = start + at + body.length;
    } else {
      parts.push({
        start: start + at,
        end: start + at + body.length,
        paragraph: token2.type === "paragraph",
        ...token2.type === "list" ? { list: true } : {},
        ...token2.type === "blockquote" ? { quote: true } : {},
        ...token2.type === "heading" ? { heading: true } : {},
        ...token2.type === "table" ? { table: true } : {},
        type: token2.type,
        gap: last !== void 0 && gapBetween(last.type, token2.type)
      });
    }
    at += token2.raw.length;
  }
  if (at !== source.length || parts.length === 0) return null;
  return parts;
}
function gapBetween(before, after) {
  return before === "heading" || BLOCK_ELEMENTS.has(before) || BLOCK_ELEMENTS.has(after);
}
// core/src/layout/index.ts
function layoutProse(markdown, width, spans = [], mode = {}, partial = false) {
  const visible = visibleProse(markdown, mode, partial);
  if (!visible) return null;
  let { text, source } = visible;
  let stop = visible.stop ?? Infinity;
  const rowOf = new Int32Array(text.length);
  const colOf = new Int32Array(text.length);
  const lines2 = [];
  let rows = 0;
  let lineStart = 0;
  for (const line of text.split("\n")) {
    const wrapped = wrapLine(line, width, true, mode.emojiSequences === true, partial);
    if (!wrapped) return null;
    const known = wrapped.known ?? line.length;
    const first = lines2.length;
    for (let r = 0; r < wrapped.rows; r++) lines2.push("");
    for (let i2 = 0; i2 < known; i2++) {
      rowOf[lineStart + i2] = rows + wrapped.row[i2];
      colOf[lineStart + i2] = wrapped.col[i2];
      const at = first + wrapped.row[i2];
      if (!wrapped.hidden[i2]) lines2[at] = lines2[at] + line[i2];
    }
    rows += wrapped.rows;
    if (known < line.length) {
      for (let i2 = lineStart + known; i2 < text.length; i2++) if (source[i2] >= 0) stop = Math.min(stop, source[i2]);
      text = text.slice(0, lineStart + known);
      source = source.slice(0, lineStart + known);
      break;
    }
    lineStart += line.length + 1;
  }
  const ends = stop < Infinity ? () => false : (i2) => i2 === text.length - 1;
  const drawn = drawnRange(source);
  const places = spans.map((span) => span.end > stop ? null : placeSpan(markdown, span, text, source, rowOf, colOf, width, ends, mode, drawn));
  return stop < Infinity ? { rows, places, lines: lines2, stop } : { rows, places, lines: lines2 };
}
function layoutList(markdown, width, spans = [], mode = {}, partial = false) {
  return layoutCanvas(markdown, drawList(markdown, width, mode, partial), width, spans, mode);
}
function layoutHeading(markdown, width, spans = [], mode = {}, partial = false) {
  return layoutCanvas(markdown, drawHeading(markdown, width, mode, partial), width, spans, mode);
}
function layoutQuote(markdown, width, spans = [], mode = {}, partial = false) {
  return layoutCanvas(markdown, drawQuote(markdown, width, mode, partial), width, spans, mode);
}
function layoutTable(markdown, columns, spans = [], proseWidth = columns - 2, mode = {}) {
  return layoutCanvas(markdown, drawTable(markdown, columns, proseWidth, mode), columns - 2, spans, mode, () => false);
}
function layoutCanvas(markdown, canvas, width, spans, mode, ends = (i2) => canvas?.end[i2] === true) {
  if (!canvas) return null;
  const text = canvas.text.join("");
  const { stop } = canvas;
  const at = stop < Infinity ? () => false : ends;
  const drawn = drawnRange(canvas.source);
  const places = spans.map((span) => span.end > stop ? null : placeSpan(markdown, span, text, canvas.source, canvas.row, canvas.col, width, at, mode, drawn));
  return stop < Infinity ? { rows: canvas.rows, places, lines: canvas.lines(), stop } : { rows: canvas.rows, places, lines: canvas.lines() };
}
function drawnRange(source) {
  let size = 0;
  for (const offset of source) if (offset >= size) size = offset + 1;
  const first = new Int32Array(size).fill(-1);
  const last = new Int32Array(size).fill(-1);
  for (let i2 = 0; i2 < source.length; i2++) {
    const offset = source[i2];
    if (offset < 0) continue;
    if (first[offset] < 0) first[offset] = i2;
    last[offset] = i2;
  }
  return { first, last };
}
function placeSpan(markdown, span, text, source, rowOf, colOf, width, ends, mode, drawn) {
  const inside = (i2) => source[i2] >= span.start && source[i2] < span.end;
  let first = -1;
  let last = -1;
  for (let offset = Math.max(0, span.start); offset < Math.min(span.end, drawn.first.length); offset++) {
    const at = drawn.first[offset];
    if (at < 0) continue;
    if (first < 0 || at < first) first = at;
    if (drawn.last[offset] > last) last = drawn.last[offset];
  }
  if (first < 0) return null;
  for (let i2 = first; i2 <= last; i2++) if (!inside(i2) || rowOf[i2] !== rowOf[first]) return null;
  let columns = Math.max(0, textWidth(text.slice(first, last + 1), mode.emojiSequences === true));
  if (span.width !== void 0 && span.width !== columns) {
    const rest = markdown.slice(source[last] + 1, span.end);
    if (!ends(last) || span.width < columns || !/^\s*$/.test(rest)) return null;
    columns = span.width;
  }
  if (colOf[first] + columns > width) return null;
  return { row: rowOf[first], col: colOf[first], columns };
}
export{blockParts,layoutHeading,layoutList,layoutProse,layoutQuote,layoutTable,wrapRows};
