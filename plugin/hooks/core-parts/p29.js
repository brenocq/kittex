import{_defaults,_Tokenizer,other,block,inline,escape,cleanUrl,_getDefaults,changeDefaults,ARTIFACT_MARK,HYPERLINK_TERMINALS,NARROW,COMBINING,EMOJI,VS16,KEYCAP,ZWJ,TEXT_EMOJI,MODIFIER_BASE}from'./p28.js';export*from'./p28.js';
var _Lexer = class __Lexer {
  tokens;
  options;
  state;
  tokenizer;
  inlineQueue;
  constructor(options3) {
    this.tokens = [];
    this.tokens.links = /* @__PURE__ */ Object.create(null);
    this.options = options3 || _defaults;
    this.options.tokenizer = this.options.tokenizer || new _Tokenizer();
    this.tokenizer = this.options.tokenizer;
    this.tokenizer.options = this.options;
    this.tokenizer.lexer = this;
    this.inlineQueue = [];
    this.state = {
      inLink: false,
      inRawBlock: false,
      top: true
    };
    const rules = {
      other,
      block: block.normal,
      inline: inline.normal
    };
    if (this.options.pedantic) {
      rules.block = block.pedantic;
      rules.inline = inline.pedantic;
    } else if (this.options.gfm) {
      rules.block = block.gfm;
      if (this.options.breaks) {
        rules.inline = inline.breaks;
      } else {
        rules.inline = inline.gfm;
      }
    }
    this.tokenizer.rules = rules;
  }
  /**
   * Expose Rules
   */
  static get rules() {
    return {
      block,
      inline
    };
  }
  /**
   * Static Lex Method
   */
  static lex(src, options3) {
    const lexer2 = new __Lexer(options3);
    return lexer2.lex(src);
  }
  /**
   * Static Lex Inline Method
   */
  static lexInline(src, options3) {
    const lexer2 = new __Lexer(options3);
    return lexer2.inlineTokens(src);
  }
  /**
   * Preprocessing
   */
  lex(src) {
    src = src.replace(other.carriageReturn, "\n");
    this.blockTokens(src, this.tokens);
    for (let i2 = 0; i2 < this.inlineQueue.length; i2++) {
      const next = this.inlineQueue[i2];
      this.inlineTokens(next.src, next.tokens);
    }
    this.inlineQueue = [];
    return this.tokens;
  }
  blockTokens(src, tokens = [], lastParagraphClipped = false) {
    if (this.options.pedantic) {
      src = src.replace(other.tabCharGlobal, "    ").replace(other.spaceLine, "");
    }
    while (src) {
      let token2;
      if (this.options.extensions?.block?.some((extTokenizer) => {
        if (token2 = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token2.raw.length);
          tokens.push(token2);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token2 = this.tokenizer.space(src)) {
        src = src.substring(token2.raw.length);
        const lastToken = tokens.at(-1);
        if (token2.raw.length === 1 && lastToken !== void 0) {
          lastToken.raw += "\n";
        } else {
          tokens.push(token2);
        }
        continue;
      }
      if (token2 = this.tokenizer.code(src)) {
        src = src.substring(token2.raw.length);
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "paragraph" || lastToken?.type === "text") {
          lastToken.raw += "\n" + token2.raw;
          lastToken.text += "\n" + token2.text;
          this.inlineQueue.at(-1).src = lastToken.text;
        } else {
          tokens.push(token2);
        }
        continue;
      }
      if (token2 = this.tokenizer.fences(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.heading(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.hr(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.blockquote(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.list(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.html(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.def(src)) {
        src = src.substring(token2.raw.length);
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "paragraph" || lastToken?.type === "text") {
          lastToken.raw += "\n" + token2.raw;
          lastToken.text += "\n" + token2.raw;
          this.inlineQueue.at(-1).src = lastToken.text;
        } else if (!this.tokens.links[token2.tag]) {
          this.tokens.links[token2.tag] = {
            href: token2.href,
            title: token2.title
          };
        }
        continue;
      }
      if (token2 = this.tokenizer.table(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.lheading(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      let cutSrc = src;
      if (this.options.extensions?.startBlock) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startBlock.forEach((getStartIndex) => {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (this.state.top && (token2 = this.tokenizer.paragraph(cutSrc))) {
        const lastToken = tokens.at(-1);
        if (lastParagraphClipped && lastToken?.type === "paragraph") {
          lastToken.raw += "\n" + token2.raw;
          lastToken.text += "\n" + token2.text;
          this.inlineQueue.pop();
          this.inlineQueue.at(-1).src = lastToken.text;
        } else {
          tokens.push(token2);
        }
        lastParagraphClipped = cutSrc.length !== src.length;
        src = src.substring(token2.raw.length);
        continue;
      }
      if (token2 = this.tokenizer.text(src)) {
        src = src.substring(token2.raw.length);
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "text") {
          lastToken.raw += "\n" + token2.raw;
          lastToken.text += "\n" + token2.text;
          this.inlineQueue.pop();
          this.inlineQueue.at(-1).src = lastToken.text;
        } else {
          tokens.push(token2);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    this.state.top = true;
    return tokens;
  }
  inline(src, tokens = []) {
    this.inlineQueue.push({ src, tokens });
    return tokens;
  }
  /**
   * Lexing/Compiling
   */
  inlineTokens(src, tokens = []) {
    let maskedSrc = src;
    let match = null;
    if (this.tokens.links) {
      const links = Object.keys(this.tokens.links);
      if (links.length > 0) {
        while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
          if (links.includes(match[0].slice(match[0].lastIndexOf("[") + 1, -1))) {
            maskedSrc = maskedSrc.slice(0, match.index) + "[" + "a".repeat(match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
          }
        }
      }
    }
    while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index) + "[" + "a".repeat(match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    }
    while ((match = this.tokenizer.rules.inline.anyPunctuation.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index) + "++" + maskedSrc.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    }
    let keepPrevChar = false;
    let prevChar = "";
    while (src) {
      if (!keepPrevChar) {
        prevChar = "";
      }
      keepPrevChar = false;
      let token2;
      if (this.options.extensions?.inline?.some((extTokenizer) => {
        if (token2 = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token2.raw.length);
          tokens.push(token2);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token2 = this.tokenizer.escape(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.tag(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.link(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.reflink(src, this.tokens.links)) {
        src = src.substring(token2.raw.length);
        const lastToken = tokens.at(-1);
        if (token2.type === "text" && lastToken?.type === "text") {
          lastToken.raw += token2.raw;
          lastToken.text += token2.text;
        } else {
          tokens.push(token2);
        }
        continue;
      }
      if (token2 = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.codespan(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.br(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.del(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (token2 = this.tokenizer.autolink(src)) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      if (!this.state.inLink && (token2 = this.tokenizer.url(src))) {
        src = src.substring(token2.raw.length);
        tokens.push(token2);
        continue;
      }
      let cutSrc = src;
      if (this.options.extensions?.startInline) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startInline.forEach((getStartIndex) => {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (token2 = this.tokenizer.inlineText(cutSrc)) {
        src = src.substring(token2.raw.length);
        if (token2.raw.slice(-1) !== "_") {
          prevChar = token2.raw.slice(-1);
        }
        keepPrevChar = true;
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "text") {
          lastToken.raw += token2.raw;
          lastToken.text += token2.text;
        } else {
          tokens.push(token2);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    return tokens;
  }
};
var _Renderer = class {
  options;
  parser;
  // set by the parser
  constructor(options3) {
    this.options = options3 || _defaults;
  }
  space(token2) {
    return "";
  }
  code({ text, lang, escaped }) {
    const langString = (lang || "").match(other.notSpaceStart)?.[0];
    const code = text.replace(other.endingNewline, "") + "\n";
    if (!langString) {
      return "<pre><code>" + (escaped ? code : escape(code, true)) + "</code></pre>\n";
    }
    return '<pre><code class="language-' + escape(langString) + '">' + (escaped ? code : escape(code, true)) + "</code></pre>\n";
  }
  blockquote({ tokens }) {
    const body = this.parser.parse(tokens);
    return `<blockquote>
${body}</blockquote>
`;
  }
  html({ text }) {
    return text;
  }
  heading({ tokens, depth }) {
    return `<h${depth}>${this.parser.parseInline(tokens)}</h${depth}>
`;
  }
  hr(token2) {
    return "<hr>\n";
  }
  list(token2) {
    const ordered = token2.ordered;
    const start = token2.start;
    let body = "";
    for (let j = 0; j < token2.items.length; j++) {
      const item = token2.items[j];
      body += this.listitem(item);
    }
    const type = ordered ? "ol" : "ul";
    const startAttr = ordered && start !== 1 ? ' start="' + start + '"' : "";
    return "<" + type + startAttr + ">\n" + body + "</" + type + ">\n";
  }
  listitem(item) {
    let itemBody = "";
    if (item.task) {
      const checkbox = this.checkbox({ checked: !!item.checked });
      if (item.loose) {
        if (item.tokens[0]?.type === "paragraph") {
          item.tokens[0].text = checkbox + " " + item.tokens[0].text;
          if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === "text") {
            item.tokens[0].tokens[0].text = checkbox + " " + escape(item.tokens[0].tokens[0].text);
            item.tokens[0].tokens[0].escaped = true;
          }
        } else {
          item.tokens.unshift({
            type: "text",
            raw: checkbox + " ",
            text: checkbox + " ",
            escaped: true
          });
        }
      } else {
        itemBody += checkbox + " ";
      }
    }
    itemBody += this.parser.parse(item.tokens, !!item.loose);
    return `<li>${itemBody}</li>
`;
  }
  checkbox({ checked }) {
    return "<input " + (checked ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
  }
  paragraph({ tokens }) {
    return `<p>${this.parser.parseInline(tokens)}</p>
`;
  }
  table(token2) {
    let header = "";
    let cell = "";
    for (let j = 0; j < token2.header.length; j++) {
      cell += this.tablecell(token2.header[j]);
    }
    header += this.tablerow({ text: cell });
    let body = "";
    for (let j = 0; j < token2.rows.length; j++) {
      const row = token2.rows[j];
      cell = "";
      for (let k = 0; k < row.length; k++) {
        cell += this.tablecell(row[k]);
      }
      body += this.tablerow({ text: cell });
    }
    if (body)
      body = `<tbody>${body}</tbody>`;
    return "<table>\n<thead>\n" + header + "</thead>\n" + body + "</table>\n";
  }
  tablerow({ text }) {
    return `<tr>
${text}</tr>
`;
  }
  tablecell(token2) {
    const content = this.parser.parseInline(token2.tokens);
    const type = token2.header ? "th" : "td";
    const tag3 = token2.align ? `<${type} align="${token2.align}">` : `<${type}>`;
    return tag3 + content + `</${type}>
`;
  }
  /**
   * span level renderer
   */
  strong({ tokens }) {
    return `<strong>${this.parser.parseInline(tokens)}</strong>`;
  }
  em({ tokens }) {
    return `<em>${this.parser.parseInline(tokens)}</em>`;
  }
  codespan({ text }) {
    return `<code>${escape(text, true)}</code>`;
  }
  br(token2) {
    return "<br>";
  }
  del({ tokens }) {
    return `<del>${this.parser.parseInline(tokens)}</del>`;
  }
  link({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    const cleanHref = cleanUrl(href);
    if (cleanHref === null) {
      return text;
    }
    href = cleanHref;
    let out = '<a href="' + href + '"';
    if (title) {
      out += ' title="' + escape(title) + '"';
    }
    out += ">" + text + "</a>";
    return out;
  }
  image({ href, title, text }) {
    const cleanHref = cleanUrl(href);
    if (cleanHref === null) {
      return escape(text);
    }
    href = cleanHref;
    let out = `<img src="${href}" alt="${text}"`;
    if (title) {
      out += ` title="${escape(title)}"`;
    }
    out += ">";
    return out;
  }
  text(token2) {
    return "tokens" in token2 && token2.tokens ? this.parser.parseInline(token2.tokens) : "escaped" in token2 && token2.escaped ? token2.text : escape(token2.text);
  }
};
var _TextRenderer = class {
  // no need for block level renderers
  strong({ text }) {
    return text;
  }
  em({ text }) {
    return text;
  }
  codespan({ text }) {
    return text;
  }
  del({ text }) {
    return text;
  }
  html({ text }) {
    return text;
  }
  text({ text }) {
    return text;
  }
  link({ text }) {
    return "" + text;
  }
  image({ text }) {
    return "" + text;
  }
  br() {
    return "";
  }
};
var _Parser = class __Parser {
  options;
  renderer;
  textRenderer;
  constructor(options3) {
    this.options = options3 || _defaults;
    this.options.renderer = this.options.renderer || new _Renderer();
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;
    this.renderer.parser = this;
    this.textRenderer = new _TextRenderer();
  }
  /**
   * Static Parse Method
   */
  static parse(tokens, options3) {
    const parser2 = new __Parser(options3);
    return parser2.parse(tokens);
  }
  /**
   * Static Parse Inline Method
   */
  static parseInline(tokens, options3) {
    const parser2 = new __Parser(options3);
    return parser2.parseInline(tokens);
  }
  /**
   * Parse Loop
   */
  parse(tokens, top = true) {
    let out = "";
    for (let i2 = 0; i2 < tokens.length; i2++) {
      const anyToken = tokens[i2];
      if (this.options.extensions?.renderers?.[anyToken.type]) {
        const genericToken = anyToken;
        const ret = this.options.extensions.renderers[genericToken.type].call({ parser: this }, genericToken);
        if (ret !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(genericToken.type)) {
          out += ret || "";
          continue;
        }
      }
      const token2 = anyToken;
      switch (token2.type) {
        case "space": {
          out += this.renderer.space(token2);
          continue;
        }
        case "hr": {
          out += this.renderer.hr(token2);
          continue;
        }
        case "heading": {
          out += this.renderer.heading(token2);
          continue;
        }
        case "code": {
          out += this.renderer.code(token2);
          continue;
        }
        case "table": {
          out += this.renderer.table(token2);
          continue;
        }
        case "blockquote": {
          out += this.renderer.blockquote(token2);
          continue;
        }
        case "list": {
          out += this.renderer.list(token2);
          continue;
        }
        case "html": {
          out += this.renderer.html(token2);
          continue;
        }
        case "paragraph": {
          out += this.renderer.paragraph(token2);
          continue;
        }
        case "text": {
          let textToken = token2;
          let body = this.renderer.text(textToken);
          while (i2 + 1 < tokens.length && tokens[i2 + 1].type === "text") {
            textToken = tokens[++i2];
            body += "\n" + this.renderer.text(textToken);
          }
          if (top) {
            out += this.renderer.paragraph({
              type: "paragraph",
              raw: body,
              text: body,
              tokens: [{ type: "text", raw: body, text: body, escaped: true }]
            });
          } else {
            out += body;
          }
          continue;
        }
        default: {
          const errMsg = 'Token with "' + token2.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return "";
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
  /**
   * Parse Inline Tokens
   */
  parseInline(tokens, renderer = this.renderer) {
    let out = "";
    for (let i2 = 0; i2 < tokens.length; i2++) {
      const anyToken = tokens[i2];
      if (this.options.extensions?.renderers?.[anyToken.type]) {
        const ret = this.options.extensions.renderers[anyToken.type].call({ parser: this }, anyToken);
        if (ret !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(anyToken.type)) {
          out += ret || "";
          continue;
        }
      }
      const token2 = anyToken;
      switch (token2.type) {
        case "escape": {
          out += renderer.text(token2);
          break;
        }
        case "html": {
          out += renderer.html(token2);
          break;
        }
        case "link": {
          out += renderer.link(token2);
          break;
        }
        case "image": {
          out += renderer.image(token2);
          break;
        }
        case "strong": {
          out += renderer.strong(token2);
          break;
        }
        case "em": {
          out += renderer.em(token2);
          break;
        }
        case "codespan": {
          out += renderer.codespan(token2);
          break;
        }
        case "br": {
          out += renderer.br(token2);
          break;
        }
        case "del": {
          out += renderer.del(token2);
          break;
        }
        case "text": {
          out += renderer.text(token2);
          break;
        }
        default: {
          const errMsg = 'Token with "' + token2.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return "";
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
};
var _Hooks = class {
  options;
  block;
  constructor(options3) {
    this.options = options3 || _defaults;
  }
  static passThroughHooks = /* @__PURE__ */ new Set([
    "preprocess",
    "postprocess",
    "processAllTokens"
  ]);
  /**
   * Process markdown before marked
   */
  preprocess(markdown) {
    return markdown;
  }
  /**
   * Process HTML after marked is finished
   */
  postprocess(html2) {
    return html2;
  }
  /**
   * Process all tokens before walk tokens
   */
  processAllTokens(tokens) {
    return tokens;
  }
  /**
   * Provide function to tokenize markdown
   */
  provideLexer() {
    return this.block ? _Lexer.lex : _Lexer.lexInline;
  }
  /**
   * Provide function to parse tokens
   */
  provideParser() {
    return this.block ? _Parser.parse : _Parser.parseInline;
  }
};
var Marked = class {
  defaults = _getDefaults();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = _Parser;
  Renderer = _Renderer;
  TextRenderer = _TextRenderer;
  Lexer = _Lexer;
  Tokenizer = _Tokenizer;
  Hooks = _Hooks;
  constructor(...args) {
    this.use(...args);
  }
  /**
   * Run callback for every token
   */
  walkTokens(tokens, callback) {
    let values = [];
    for (const token2 of tokens) {
      values = values.concat(callback.call(this, token2));
      switch (token2.type) {
        case "table": {
          const tableToken = token2;
          for (const cell of tableToken.header) {
            values = values.concat(this.walkTokens(cell.tokens, callback));
          }
          for (const row of tableToken.rows) {
            for (const cell of row) {
              values = values.concat(this.walkTokens(cell.tokens, callback));
            }
          }
          break;
        }
        case "list": {
          const listToken = token2;
          values = values.concat(this.walkTokens(listToken.items, callback));
          break;
        }
        default: {
          const genericToken = token2;
          if (this.defaults.extensions?.childTokens?.[genericToken.type]) {
            this.defaults.extensions.childTokens[genericToken.type].forEach((childTokens) => {
              const tokens2 = genericToken[childTokens].flat(Infinity);
              values = values.concat(this.walkTokens(tokens2, callback));
            });
          } else if (genericToken.tokens) {
            values = values.concat(this.walkTokens(genericToken.tokens, callback));
          }
        }
      }
    }
    return values;
  }
  use(...args) {
    const extensions = this.defaults.extensions || { renderers: {}, childTokens: {} };
    args.forEach((pack) => {
      const opts = { ...pack };
      opts.async = this.defaults.async || opts.async || false;
      if (pack.extensions) {
        pack.extensions.forEach((ext) => {
          if (!ext.name) {
            throw new Error("extension name required");
          }
          if ("renderer" in ext) {
            const prevRenderer = extensions.renderers[ext.name];
            if (prevRenderer) {
              extensions.renderers[ext.name] = function(...args2) {
                let ret = ext.renderer.apply(this, args2);
                if (ret === false) {
                  ret = prevRenderer.apply(this, args2);
                }
                return ret;
              };
            } else {
              extensions.renderers[ext.name] = ext.renderer;
            }
          }
          if ("tokenizer" in ext) {
            if (!ext.level || ext.level !== "block" && ext.level !== "inline") {
              throw new Error("extension level must be 'block' or 'inline'");
            }
            const extLevel = extensions[ext.level];
            if (extLevel) {
              extLevel.unshift(ext.tokenizer);
            } else {
              extensions[ext.level] = [ext.tokenizer];
            }
            if (ext.start) {
              if (ext.level === "block") {
                if (extensions.startBlock) {
                  extensions.startBlock.push(ext.start);
                } else {
                  extensions.startBlock = [ext.start];
                }
              } else if (ext.level === "inline") {
                if (extensions.startInline) {
                  extensions.startInline.push(ext.start);
                } else {
                  extensions.startInline = [ext.start];
                }
              }
            }
          }
          if ("childTokens" in ext && ext.childTokens) {
            extensions.childTokens[ext.name] = ext.childTokens;
          }
        });
        opts.extensions = extensions;
      }
      if (pack.renderer) {
        const renderer = this.defaults.renderer || new _Renderer(this.defaults);
        for (const prop in pack.renderer) {
          if (!(prop in renderer)) {
            throw new Error(`renderer '${prop}' does not exist`);
          }
          if (["options", "parser"].includes(prop)) {
            continue;
          }
          const rendererProp = prop;
          const rendererFunc = pack.renderer[rendererProp];
          const prevRenderer = renderer[rendererProp];
          renderer[rendererProp] = (...args2) => {
            let ret = rendererFunc.apply(renderer, args2);
            if (ret === false) {
              ret = prevRenderer.apply(renderer, args2);
            }
            return ret || "";
          };
        }
        opts.renderer = renderer;
      }
      if (pack.tokenizer) {
        const tokenizer = this.defaults.tokenizer || new _Tokenizer(this.defaults);
        for (const prop in pack.tokenizer) {
          if (!(prop in tokenizer)) {
            throw new Error(`tokenizer '${prop}' does not exist`);
          }
          if (["options", "rules", "lexer"].includes(prop)) {
            continue;
          }
          const tokenizerProp = prop;
          const tokenizerFunc = pack.tokenizer[tokenizerProp];
          const prevTokenizer = tokenizer[tokenizerProp];
          tokenizer[tokenizerProp] = (...args2) => {
            let ret = tokenizerFunc.apply(tokenizer, args2);
            if (ret === false) {
              ret = prevTokenizer.apply(tokenizer, args2);
            }
            return ret;
          };
        }
        opts.tokenizer = tokenizer;
      }
      if (pack.hooks) {
        const hooks = this.defaults.hooks || new _Hooks();
        for (const prop in pack.hooks) {
          if (!(prop in hooks)) {
            throw new Error(`hook '${prop}' does not exist`);
          }
          if (["options", "block"].includes(prop)) {
            continue;
          }
          const hooksProp = prop;
          const hooksFunc = pack.hooks[hooksProp];
          const prevHook = hooks[hooksProp];
          if (_Hooks.passThroughHooks.has(prop)) {
            hooks[hooksProp] = (arg) => {
              if (this.defaults.async) {
                return Promise.resolve(hooksFunc.call(hooks, arg)).then((ret2) => {
                  return prevHook.call(hooks, ret2);
                });
              }
              const ret = hooksFunc.call(hooks, arg);
              return prevHook.call(hooks, ret);
            };
          } else {
            hooks[hooksProp] = (...args2) => {
              let ret = hooksFunc.apply(hooks, args2);
              if (ret === false) {
                ret = prevHook.apply(hooks, args2);
              }
              return ret;
            };
          }
        }
        opts.hooks = hooks;
      }
      if (pack.walkTokens) {
        const walkTokens2 = this.defaults.walkTokens;
        const packWalktokens = pack.walkTokens;
        opts.walkTokens = function(token2) {
          let values = [];
          values.push(packWalktokens.call(this, token2));
          if (walkTokens2) {
            values = values.concat(walkTokens2.call(this, token2));
          }
          return values;
        };
      }
      this.defaults = { ...this.defaults, ...opts };
    });
    return this;
  }
  setOptions(opt) {
    this.defaults = { ...this.defaults, ...opt };
    return this;
  }
  lexer(src, options3) {
    return _Lexer.lex(src, options3 ?? this.defaults);
  }
  parser(tokens, options3) {
    return _Parser.parse(tokens, options3 ?? this.defaults);
  }
  parseMarkdown(blockType) {
    const parse = (src, options3) => {
      const origOpt = { ...options3 };
      const opt = { ...this.defaults, ...origOpt };
      const throwError = this.onError(!!opt.silent, !!opt.async);
      if (this.defaults.async === true && origOpt.async === false) {
        return throwError(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      }
      if (typeof src === "undefined" || src === null) {
        return throwError(new Error("marked(): input parameter is undefined or null"));
      }
      if (typeof src !== "string") {
        return throwError(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(src) + ", string expected"));
      }
      if (opt.hooks) {
        opt.hooks.options = opt;
        opt.hooks.block = blockType;
      }
      const lexer2 = opt.hooks ? opt.hooks.provideLexer() : blockType ? _Lexer.lex : _Lexer.lexInline;
      const parser2 = opt.hooks ? opt.hooks.provideParser() : blockType ? _Parser.parse : _Parser.parseInline;
      if (opt.async) {
        return Promise.resolve(opt.hooks ? opt.hooks.preprocess(src) : src).then((src2) => lexer2(src2, opt)).then((tokens) => opt.hooks ? opt.hooks.processAllTokens(tokens) : tokens).then((tokens) => opt.walkTokens ? Promise.all(this.walkTokens(tokens, opt.walkTokens)).then(() => tokens) : tokens).then((tokens) => parser2(tokens, opt)).then((html2) => opt.hooks ? opt.hooks.postprocess(html2) : html2).catch(throwError);
      }
      try {
        if (opt.hooks) {
          src = opt.hooks.preprocess(src);
        }
        let tokens = lexer2(src, opt);
        if (opt.hooks) {
          tokens = opt.hooks.processAllTokens(tokens);
        }
        if (opt.walkTokens) {
          this.walkTokens(tokens, opt.walkTokens);
        }
        let html2 = parser2(tokens, opt);
        if (opt.hooks) {
          html2 = opt.hooks.postprocess(html2);
        }
        return html2;
      } catch (e) {
        return throwError(e);
      }
    };
    return parse;
  }
  onError(silent, async) {
    return (e) => {
      e.message += "\nPlease report this to https://github.com/markedjs/marked.";
      if (silent) {
        const msg = "<p>An error occurred:</p><pre>" + escape(e.message + "", true) + "</pre>";
        if (async) {
          return Promise.resolve(msg);
        }
        return msg;
      }
      if (async) {
        return Promise.reject(e);
      }
      throw e;
    };
  }
};
var markedInstance = new Marked();
function marked(src, opt) {
  return markedInstance.parse(src, opt);
}
marked.options = marked.setOptions = function(options3) {
  markedInstance.setOptions(options3);
  marked.defaults = markedInstance.defaults;
  changeDefaults(marked.defaults);
  return marked;
};
marked.getDefaults = _getDefaults;
marked.defaults = _defaults;
marked.use = function(...args) {
  markedInstance.use(...args);
  marked.defaults = markedInstance.defaults;
  changeDefaults(marked.defaults);
  return marked;
};
marked.walkTokens = function(tokens, callback) {
  return markedInstance.walkTokens(tokens, callback);
};
marked.parseInline = markedInstance.parseInline;
marked.Parser = _Parser;
marked.parser = _Parser.parse;
marked.Renderer = _Renderer;
marked.TextRenderer = _TextRenderer;
marked.Lexer = _Lexer;
marked.lexer = _Lexer.lex;
marked.Tokenizer = _Tokenizer;
marked.Hooks = _Hooks;
marked.parse = marked;
var options = marked.options;
var setOptions = marked.setOptions;
var use = marked.use;
var walkTokens = marked.walkTokens;
var parseInline = marked.parseInline;
var parser = _Parser.parse;
var lexer = _Lexer.lex;
// core/src/layout/links.ts
var ISSUE_REF_ALL = /(^|[^\w./-])([A-Za-z0-9][\w-]*\/[A-Za-z0-9][\w.-]*)#(\d+)\b/g;
var CONTROL = /[\x00-\x1f\x7f-\x9f]/;
var SCHEME = /^[a-z][a-z0-9+.-]*:/i;
var PLAIN_RELATIVE = /^(?!.*(?:^|\/)\.\.(?:\/|#|$))[A-Za-z0-9_][A-Za-z0-9._~/=&+@,!*'()$;-]*(?:#[A-Za-z0-9._~/=&+@,!*'()$;:-]*)?$/;
function linkedAsWritten(href) {
  if (CONTROL.test(href) || href !== href.trim()) return false;
  if (/^https:\/\/claude\.ai(?:[/?#]|$)/.test(href)) return false;
  if (SCHEME.test(href)) return !/^file:/i.test(href);
  return PLAIN_RELATIVE.test(href);
}
function plain(out, text) {
  out.text += text;
  for (let i2 = 0; i2 < text.length; i2++) out.source.push(-1);
}
function append(out, part) {
  out.text += part.text;
  out.source.push(...part.source);
}
function drawLink(out, link2, base, links, label) {
  const { hyperlinks } = links;
  if (hyperlinks === void 0) return false;
  const href = link2.href;
  const title = link2.title ? ` ("${link2.title}")` : "";
  if (CONTROL.test(href + title) || href.includes(ARTIFACT_MARK)) return false;
  const at = link2.raw.indexOf(link2.text);
  if (link2.text !== "" && at < 0) return false;
  if (href.startsWith("mailto:")) {
    const address = href.slice("mailto:".length);
    if (link2.text !== "") {
      const written = { text: link2.text, source: Array.from(link2.text, (_, k) => base + at + k) };
      append(out, written);
      if (link2.text !== address) plain(out, ` (${address})`);
    } else {
      plain(out, address);
    }
    plain(out, title);
    return true;
  }
  const text = { text: "", source: [] };
  if (!label(text, link2.tokens ?? [], link2.text, base + at)) return false;
  if (text.text.includes(ARTIFACT_MARK)) return false;
  const differs = text.text !== "" && text.text !== href;
  if (hyperlinks) {
    if (!linkedAsWritten(href)) return false;
    if (links.linked) links.linked.value = true;
    if (text.text !== "") append(out, text);
    else plain(out, href);
  } else {
    const same = text.text === href || href === `http://${text.text}` || href === `https://${text.text}`;
    if (differs && !same) {
      append(out, text);
      plain(out, ` (${href})`);
    } else {
      plain(out, href);
    }
  }
  plain(out, title);
  return true;
}
function refGlueAgrees(text, glue) {
  if (!text.includes("#")) return true;
  const marked4 = text.replace(ISSUE_REF_ALL, (_, before, repo, number) => `${before}\0${repo}#${number}\0`);
  if (marked4 === text) return true;
  return marked4.replace(glue, "\u00A0$1").replaceAll("\0", "") === text.replace(glue, "\u00A0$1");
}
function hasIssueRef(text) {
  ISSUE_REF_ALL.lastIndex = 0;
  return ISSUE_REF_ALL.test(text);
}
function engineHyperlinks(env) {
  const force = env.FORCE_HYPERLINK;
  if (force !== void 0) return force.length > 0 ? parseInt(force, 10) !== 0 : void 0;
  const program = env.TERM_PROGRAM;
  if (program !== void 0 && HYPERLINK_TERMINALS.includes(program)) return true;
  if (env.TERMINAL_EMULATOR === "JetBrains-JediTerm") return true;
  if (env.WT_SESSION && program !== "tmux" && !env.TMUX) return true;
  if (program === "tmux") {
    const [major, minor] = (env.TERM_PROGRAM_VERSION ?? "").split(".").map((part) => parseInt(part, 10));
    if (major > 3 || major === 3 && minor >= 4) return true;
  }
  if (env.LC_TERMINAL !== void 0 && HYPERLINK_TERMINALS.includes(env.LC_TERMINAL)) return true;
  if (env.TERM?.includes("kitty")) return true;
  if (env.NETLIFY) return true;
  if (env.CI || env.TEAMCITY_VERSION) return false;
  if (env.WT_SESSION || program === "WezTerm" || program === "vscode" || env.VTE_VERSION || env.TERM === "alacritty") return void 0;
  return false;
}
// core/src/layout/prose.ts
var marked2 = new Marked({
  gfm: true,
  tokenizer: {
    // The engine strikes through `~~text~~` only (marked's GFM also takes `~text~`).
    del(src) {
      const cap2 = /^~~(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))~~(?=[^~]|$)/.exec(src);
      const text = cap2?.[1];
      if (!cap2 || text === void 0) return void 0;
      return { type: "del", raw: cap2[0], text, tokens: this.lexer.inlineTokens(text) };
    },
    // Link reference definitions are not read: the line stays text.
    def() {
      return void 0;
    }
  }
});
var MARKDOWN_LIKE = /[#*`|[>\-_~]|\n[\r\n]|\r\r|\r\n[\r\n]|(?:^|[\r\n]) {0,3}(?:\d+[.)]|\+) |(?:^|[\r\n]) {0,3}=+ *(?:[\r\n]|$)|https?:\/\/|www\./;
var NBSP_ENTITY = /&(?:nbsp|#0{0,4}160|#[xX]0{0,4}[aA]0);/g;
var AUTOLINK = /^<(?:[a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\s\x00-\x1f<>]*|[a-zA-Z0-9.!#$%&'*+/=?_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_]))>/;
var GLUE = / (\d{1,9}[.)])(?!\w)/g;
function unfollowable(markdown) {
  return unfollowableFrom(markdown) !== void 0;
}
function unfollowableFrom(markdown) {
  let at = markdown.search(/[\t\r\u0000-\u0008\u000b-\u001f\u007f]/);
  for (const tag3 of markdown.matchAll(/<[A-Za-z/!?]/g)) {
    if (at >= 0 && tag3.index >= at) break;
    if (!AUTOLINK.test(markdown.slice(tag3.index))) {
      at = tag3.index;
      break;
    }
  }
  return at < 0 ? void 0 : markdown.lastIndexOf("\n", at - 1) + 1;
}
function linksHold(markdown, links) {
  if (!markdown.includes(ARTIFACT_MARK)) return true;
  return !links.linked?.value && !(links.hyperlinks !== false && hasIssueRef(markdown));
}
var LEADING_SPACE = / {2}|(?:^|\n) /;
function cutPartial(visible, stop, at = visible.text.length) {
  let end = at;
  while (end > 0 && visible.text[end - 1] !== " " && visible.text[end - 1] !== "\n") end--;
  if (end > 0) end--;
  for (let i2 = end; i2 < visible.text.length; i2++) if (visible.source[i2] >= 0) stop = Math.min(stop, visible.source[i2]);
  return { text: visible.text.slice(0, end), source: visible.source.slice(0, end), stop };
}
function visibleProse(markdown, mode = {}, partial = false) {
  const asWritten = !MARKDOWN_LIKE.test(markdown) && !markdown.includes("&nbsp;");
  const cut = unfollowableFrom(markdown);
  if (cut === void 0) return visibleOf(markdown, mode, partial, asWritten, markdown);
  if (!partial) return null;
  const before = visibleOf(markdown.slice(0, cut), mode, true, asWritten, markdown);
  return before && { ...before, stop: Math.min(before.stop ?? Infinity, cut) };
}
function visibleOf(markdown, mode, partial, asWritten, whole) {
  const links = { hyperlinks: mode.hyperlinks, linked: { value: false } };
  const out = { text: "", source: [] };
  if (asWritten) {
    emit(out, markdown, 0);
  } else {
    let tokens;
    try {
      tokens = marked2.lexer(markdown);
    } catch {
      return null;
    }
    let at = 0;
    for (const token2 of tokens) {
      const from = markdown.indexOf(token2.raw, at);
      if (from !== at) return null;
      if (token2.type === "space") {
        out.text += "\n";
        out.source.push(-1);
      } else if (token2.type === "paragraph") {
        const paragraph2 = token2;
        if (!markdown.startsWith(paragraph2.text, at)) return null;
        if (!inline2(out, paragraph2.tokens, paragraph2.text, at, false, links)) {
          if (!partial || out.stop === void 0) return null;
          break;
        }
        out.text += "\n";
        out.source.push(-1);
      } else {
        if (!partial) return null;
        out.stop = at;
        break;
      }
      at += token2.raw.length;
    }
    if (out.stop === void 0 && at !== markdown.length) return null;
  }
  if (!linksHold(whole, links)) return null;
  const lead = /^\n*/.exec(out.text)[0].length;
  const kept = out.text.slice(lead).trimEnd().length;
  let visible = { text: out.text.slice(lead, lead + kept), source: out.source.slice(lead, lead + kept) };
  if (out.stop !== void 0) visible = cutPartial(visible, out.stop);
  const space = LEADING_SPACE.exec(visible.text);
  if (space) {
    if (!partial) return null;
    visible = cutPartial(visible, visible.stop ?? Infinity, space.index + 1);
  }
  return visible;
}
function emit(out, text, offset) {
  out.text += text;
  for (let i2 = 0; i2 < text.length; i2++) out.source.push(offset + i2);
}
function inline2(out, tokens, src, offset, glue = false, links = {}) {
  let at = 0;
  for (const token2 of tokens) {
    if (!src.startsWith(token2.raw, at)) return stopAt(out, out.text.length, offset + at);
    const base = offset + at;
    const drawn = out.text.length;
    if (!inlineToken(out, token2, base, glue, links)) return stopAt(out, drawn, base);
    at += token2.raw.length;
  }
  return at === src.length || stopAt(out, out.text.length, offset + at);
}
function stopAt(out, drawn, offset) {
  out.text = out.text.slice(0, drawn);
  out.source.length = drawn;
  out.stop = Math.min(out.stop ?? Infinity, offset);
  return false;
}
function inlineToken(out, token2, base, glue, links) {
  {
    switch (token2.type) {
      case "text": {
        const text = token2;
        if (text.tokens) return false;
        if (text.text !== text.raw) return false;
        if (links.inside) {
          emit(out, text.raw, base);
          break;
        }
        const run2 = out.text.length;
        if (text.escaped === false) {
          let last = 0;
          for (const match of text.raw.matchAll(NBSP_ENTITY)) {
            emit(out, text.raw.slice(last, match.index), base + last);
            out.text += " ";
            out.source.push(base + match.index);
            last = match.index + match[0].length;
          }
          emit(out, text.raw.slice(last), base + last);
        } else {
          emit(out, text.raw, base);
        }
        if (glue) {
          const drawn = out.text.slice(run2);
          if (links.hyperlinks !== false && !refGlueAgrees(drawn, GLUE)) return false;
          out.text = out.text.slice(0, run2) + drawn.replace(GLUE, "\u00A0$1");
        }
        break;
      }
      case "escape": {
        const escape2 = token2;
        if (escape2.raw.length !== escape2.text.length + 1 || !escape2.raw.endsWith(escape2.text)) return false;
        emit(out, escape2.text, base + 1);
        break;
      }
      case "codespan": {
        const code = token2;
        out.text += code.text;
        for (let i2 = 0; i2 < code.text.length; i2++) out.source.push(-1);
        break;
      }
      case "em":
      case "strong":
      case "del": {
        const styled = token2;
        const lead = styled.raw.indexOf(styled.text);
        const trail = styled.raw.length - lead - styled.text.length;
        if (lead < 1 || lead !== trail) return false;
        if (!inline2(out, styled.tokens, styled.text, base + lead, glue, links)) return false;
        break;
      }
      case "link": {
        const link2 = token2;
        const label = (into, inner, text, at) => inline2(into, inner, text, at, false, { ...links, inside: true });
        if (!drawLink(out, link2, base, links, label)) return false;
        break;
      }
      case "br":
        out.text += "\n";
        out.source.push(-1);
        break;
      default:
        return false;
    }
  }
  return true;
}
function proseBlocks(markdown) {
  if (!MARKDOWN_LIKE.test(markdown) && !markdown.includes("&nbsp;")) {
    return markdown.trim() === "" ? [] : [{ start: 0, end: markdown.length, paragraph: true }];
  }
  let tokens;
  try {
    tokens = marked2.lexer(markdown);
  } catch {
    return null;
  }
  const blocks = [];
  let block2;
  const close = () => {
    if (!block2) return;
    const types = block2.types.join(",");
    blocks.push({
      start: block2.start,
      end: block2.end,
      paragraph: types === "paragraph",
      .../^(?:paragraph,)?list(?:,list)*$/.test(types) ? { list: true } : {},
      ...types === "blockquote" ? { quote: true } : {},
      ...types === "heading" ? { heading: true } : {},
      .../^(?:paragraph,)?table$/.test(types) ? { table: true } : {}
    });
    block2 = void 0;
  };
  let at = 0;
  for (const [k, token2] of tokens.entries()) {
    if (k === tokens.length - 1 && token2.raw === markdown.slice(at) + "\n") token2.raw = markdown.slice(at);
    if (!markdown.startsWith(token2.raw, at)) return null;
    if (token2.type === "space" && /\n[ \t]*\n/.test(markdown.slice(Math.max(0, at - 1), at + token2.raw.length))) {
      close();
    } else if (token2.type !== "space" || block2) {
      if (!block2) block2 = { start: at, end: at, types: [] };
      const body = token2.raw.replace(/(?:\r?\n[ \t]*)+$/, "");
      block2.end = at + (token2.type === "space" ? token2.raw.length : body.length);
      if (token2.type !== "space") block2.types.push(token2.type);
      if (token2.type !== "space" && /\n[ \t]*\n[ \t]*$/.test(token2.raw)) close();
    }
    at += token2.raw.length;
  }
  if (at !== markdown.length) return null;
  close();
  return blocks;
}
// core/src/layout/width.ts
function within(ranges, code) {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    const [from, to] = ranges[mid];
    if (code < from) hi = mid - 1;
    else if (code > to) lo = mid + 1;
    else return true;
  }
  return false;
}
function codeWidth(code) {
  if (within(NARROW, code)) return 1;
  if (within(COMBINING, code)) return 0;
  if (within(EMOJI, code)) return 2;
  return -1;
}
var isTone = (code) => code >= 127995 && code <= 127999;
var isRegional = (code) => code >= 127462 && code <= 127487;
var isKeycapBase = (code) => code === 35 || code === 42 || code >= 48 && code <= 57;
var unitsOf = (code) => code > 65535 ? 2 : 1;
function charAt(text, at, sequences = false) {
  const code = text.codePointAt(at);
  let end = at + unitsOf(code);
  let width = codeWidth(code);
  if (sequences) {
    const cluster = emojiEnd(text, at);
    if (cluster > end) {
      end = cluster;
      width = 2;
    }
  }
  while (end < text.length && within(COMBINING, text.charCodeAt(end))) {
    if (width === 2 || code === 32) width = -1;
    end += 1;
  }
  return { start: at, end, width };
}
function emojiEnd(text, at) {
  const code = text.codePointAt(at);
  const next = at + unitsOf(code);
  if (isRegional(code)) return isRegional(text.codePointAt(next) ?? 0) ? next + 2 : at;
  if (isKeycapBase(code)) return text.charCodeAt(next) === VS16 && text.charCodeAt(next + 1) === KEYCAP ? next + 2 : at;
  let end = emojiElement(text, at, true);
  while (end > at && text.charCodeAt(end) === ZWJ) {
    const joined = emojiElement(text, end + 1, false);
    if (joined < 0) break;
    end = joined;
  }
  return Math.max(at, end);
}
function emojiElement(text, at, first) {
  const code = text.codePointAt(at);
  if (code === void 0) return -1;
  const end = at + unitsOf(code);
  const pictured = within(EMOJI, code);
  if (!pictured && !within(TEXT_EMOJI, code)) return -1;
  const next = text.codePointAt(end) ?? 0;
  if (next === VS16) return end + 1;
  if (isTone(next) && within(MODIFIER_BASE, code)) return end + 2;
  return pictured || !first ? end : -1;
}
function charsOf(text, sequences = false) {
  const chars = [];
  for (let at = 0; at < text.length; ) {
    const char = charAt(text, at, sequences);
    chars.push(char);
    at = char.end;
  }
  return chars;
}
function textWidth(text, sequences = false) {
  let cells2 = 0;
  for (const char of charsOf(text, sequences)) {
    if (char.width < 0) return -1;
    cells2 += char.width;
  }
  return cells2;
}
// core/src/layout/wrap.ts
function wrapLine(line, columns, hard = true, sequences = false, partial = false) {
  if (!(columns >= 1)) return null;
  const row = new Int32Array(line.length);
  const col = new Int32Array(line.length);
  const hidden = new Uint8Array(line.length);
  const cells2 = new Int8Array(line.length).fill(-1);
  const chars = charsOf(line, sequences);
  const words2 = [];
  let first = 0;
  let width = 0;
  let known;
  for (let k = 0; k <= chars.length; k++) {
    const char = chars[k];
    if (char === void 0 || char.end - char.start === 1 && line.charCodeAt(char.start) === 32) {
      words2.push({ first, last: k, width });
      first = k + 1;
      width = 0;
    } else if (char.width < 0) {
      if (!partial) return null;
      known = first > 0 ? chars[first - 1].start : 0;
      break;
    } else {
      width += char.width;
    }
  }
  let r = 0;
  let length4 = 0;
  let shift = 0;
  const newRow = () => {
    r += 1;
    length4 = 0;
    shift = 0;
  };
  const place = (char) => {
    for (let i2 = char.start; i2 < char.end; i2++) {
      row[i2] = r;
      col[i2] = length4 - shift;
    }
    cells2[char.start] = char.width;
    length4 += char.width;
  };
  for (const [index, word] of words2.entries()) {
    if (index > 0) {
      const space = chars[word.first - 1].start;
      row[space] = r;
      col[space] = length4;
      cells2[space] = 1;
      if (length4 >= columns) {
        newRow();
        shift = 1;
        row[space] = r;
        col[space] = 0;
        hidden[space] = 1;
      }
      length4 += 1;
    }
    if (hard && word.width > columns) {
      const remaining = columns - length4;
      const breaksHere = 1 + Math.floor((word.width - remaining - 1) / columns);
      const breaksNext = Math.floor((word.width - 1) / columns);
      if (breaksNext < breaksHere) newRow();
      for (let k = word.first; k < word.last; k++) {
        const char = chars[k];
        if (char.width > 0 && length4 > 0 && length4 + char.width > columns) newRow();
        place(char);
        if (length4 === columns && k + 1 < word.last) newRow();
      }
      continue;
    }
    if (length4 + word.width > columns && length4 > 0 && word.width > 0) newRow();
    for (let k = word.first; k < word.last; k++) place(chars[k]);
  }
  return known === void 0 ? { rows: r + 1, row, col, hidden, cells: cells2 } : { rows: r + 1, row, col, hidden, cells: cells2, known };
}
export{wrapLine,codeWidth,unfollowableFrom,marked2,linksHold,inline2,cutPartial,LEADING_SPACE,textWidth,unfollowable,visibleProse,proseBlocks,charsOf,engineHyperlinks};
