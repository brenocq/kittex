import{__esm,init_HandlerTypes,init_UnitUtil,init_Stack,init_TexError,init_MmlNode,init_StackItem,init_TexConstants,Stack,HandlerType,BaseItem,AbstractMmlNode,TexConstant,TexError_default,UnitUtil,init_Factory,AbstractFactory,init_NodeUtil,NodeUtil_default,init_Entities,TEXCLASS,entities,init_Options,lookup,defaultOptions,__kittexLate}from'./p15.js';export*from'./p15.js';
// node_modules/@mathjax/src/mjs/input/tex/TexParser.js
var TexParser;
var init_TexParser = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/TexParser.js"() {
    init_HandlerTypes();
    init_UnitUtil();
    init_Stack();
    init_TexError();
    init_MmlNode();
    init_StackItem();
    init_TexConstants();
    TexParser = class _TexParser {
      constructor(_string, env, configuration) {
        this._string = _string;
        this.configuration = configuration;
        this.macroCount = 0;
        this.i = 0;
        this.currentCS = "";
        this.saveI = 0;
        const inner = Object.hasOwn(env, "isInner");
        const isInner = env["isInner"];
        delete env["isInner"];
        let ENV;
        if (env) {
          ENV = {};
          for (const id of Object.keys(env)) {
            ENV[id] = env[id];
          }
        }
        this.configuration.pushParser(this);
        this.stack = new Stack(this.itemFactory, ENV, inner ? isInner : true);
        this.Parse();
        this.Push(this.itemFactory.create("stop"));
        this.stack.env = ENV;
      }
      get options() {
        return this.configuration.options;
      }
      get itemFactory() {
        return this.configuration.itemFactory;
      }
      get tags() {
        return this.configuration.tags;
      }
      set string(str) {
        this._string = str;
      }
      get string() {
        return this._string;
      }
      parse(kind, input) {
        const i2 = this.saveI;
        this.saveI = this.i - (kind === "character" && input[1] !== "&" ? input[1].length : 0);
        const result = this.configuration.handlers.get(kind).parse(input);
        if (kind !== "macro") {
          this.updateResult(input[1], i2);
        }
        this.saveI = i2;
        return result;
      }
      lookup(kind, token2) {
        return this.configuration.handlers.get(kind).lookup(token2);
      }
      contains(kind, token2) {
        return this.configuration.handlers.get(kind).contains(token2);
      }
      toString() {
        let str = "";
        for (const config2 of Array.from(this.configuration.handlers.keys())) {
          str += config2 + ": " + this.configuration.handlers.get(config2) + "\n";
        }
        return str;
      }
      Parse() {
        let c;
        while (this.i < this.string.length) {
          c = this.getCodePoint();
          this.i += c.length;
          this.parse(HandlerType.CHARACTER, [this, c]);
        }
      }
      Push(arg) {
        if (arg instanceof BaseItem) {
          arg.startI = this.saveI;
          arg.stopI = this.i;
          arg.startStr = this.string;
        }
        if (arg instanceof AbstractMmlNode && arg.isInferred) {
          this.PushAll(arg.childNodes);
        } else {
          this.stack.Push(arg);
        }
      }
      PushAll(args) {
        for (const arg of args) {
          this.stack.Push(arg);
        }
      }
      mml() {
        this.configuration.popParser();
        if (!this.stack.Top().isKind("mml")) {
          return null;
        }
        const node = this.stack.Top().First;
        const latex = this.trimTex(this.string);
        if (latex) {
          node.attributes.set(TexConstant.Attr.LATEX, latex);
        }
        return node;
      }
      convertDelimiter(c) {
        var _a2;
        const token2 = this.lookup(HandlerType.DELIMITER, c);
        return (_a2 = token2 === null || token2 === void 0 ? void 0 : token2.char) !== null && _a2 !== void 0 ? _a2 : null;
      }
      getCodePoint() {
        const code = this.string.codePointAt(this.i);
        return code === void 0 ? "" : String.fromCodePoint(code);
      }
      nextIsSpace() {
        return !!this.string.charAt(this.i).match(/\s/);
      }
      GetNext() {
        while (this.nextIsSpace()) {
          this.i++;
        }
        return this.getCodePoint();
      }
      GetCS() {
        const CS = this.string.slice(this.i).match(/^(([a-z]+) ?|[\uD800-\uDBFF].|.)/i);
        if (CS) {
          this.i += CS[0].length;
          return CS[2] || CS[1];
        } else {
          this.i++;
          return " ";
        }
      }
      GetArgument(_name, noneOK = false) {
        switch (this.GetNext()) {
          case "":
            if (!noneOK) {
              throw new TexError_default("MissingArgFor", "Missing argument for %1", this.currentCS);
            }
            return null;
          case "}":
            if (!noneOK) {
              throw new TexError_default("ExtraCloseMissingOpen", "Extra close brace or missing open brace");
            }
            return null;
          case "\\":
            this.i++;
            return "\\" + this.GetCS();
          case "{": {
            const j = ++this.i;
            let parens2 = 1;
            while (this.i < this.string.length) {
              switch (this.string.charAt(this.i++)) {
                case "\\":
                  this.i++;
                  break;
                case "{":
                  parens2++;
                  break;
                case "}":
                  if (--parens2 === 0) {
                    return this.string.slice(j, this.i - 1);
                  }
                  break;
              }
            }
            throw new TexError_default("MissingCloseBrace", "Missing close brace");
          }
        }
        const c = this.getCodePoint();
        this.i += c.length;
        return c;
      }
      GetBrackets(_name, def2, matchBrackets = false) {
        if (this.GetNext() !== "[") {
          return def2;
        }
        const j = ++this.i;
        let braces = 0;
        let brackets = 0;
        while (this.i < this.string.length) {
          switch (this.string.charAt(this.i++)) {
            case "{":
              braces++;
              break;
            case "\\":
              this.i++;
              break;
            case "}":
              if (braces-- <= 0) {
                throw new TexError_default("ExtraCloseLooking", "Extra close brace while looking for %1", "']'");
              }
              break;
            case "[":
              if (braces === 0)
                brackets++;
              break;
            case "]":
              if (braces === 0) {
                if (!matchBrackets || brackets === 0) {
                  return this.string.slice(j, this.i - 1);
                }
                brackets--;
              }
              break;
          }
        }
        throw new TexError_default("MissingCloseBracket", "Could not find closing ']' for argument to %1", this.currentCS);
      }
      GetDelimiter(name, braceOK = false) {
        let c = this.GetNext();
        this.i += c.length;
        if (this.i <= this.string.length) {
          if (c === "\\") {
            c += this.GetCS();
          } else if (c === "{" && braceOK) {
            this.i--;
            c = this.GetArgument(name).trim();
          }
          if (this.contains(HandlerType.DELIMITER, c)) {
            return this.convertDelimiter(c);
          }
        }
        throw new TexError_default("MissingOrUnrecognizedDelim", "Missing or unrecognized delimiter for %1", this.currentCS);
      }
      GetDimen(name) {
        if (this.GetNext() === "{") {
          const dimen = this.GetArgument(name);
          const [value, unit] = UnitUtil.matchDimen(dimen);
          if (value) {
            return value + unit;
          }
        } else {
          const dimen = this.string.slice(this.i);
          const [value, unit, length4] = UnitUtil.matchDimen(dimen, true);
          if (value) {
            this.i += length4;
            return value + unit;
          }
        }
        throw new TexError_default("MissingDimOrUnits", "Missing dimension or its units for %1", this.currentCS);
      }
      GetUpTo(_name, token2) {
        while (this.nextIsSpace()) {
          this.i++;
        }
        const j = this.i;
        let braces = 0;
        while (this.i < this.string.length) {
          const k = this.i;
          let c = this.GetNext();
          this.i += c.length;
          switch (c) {
            case "\\":
              c += this.GetCS();
              break;
            case "{":
              braces++;
              break;
            case "}":
              if (braces === 0) {
                throw new TexError_default("ExtraCloseLooking", "Extra close brace while looking for %1", token2);
              }
              braces--;
              break;
          }
          if (braces === 0 && c === token2) {
            return this.string.slice(j, k);
          }
        }
        throw new TexError_default("TokenNotFoundForCommand", "Could not find %1 for %2", token2, this.currentCS);
      }
      ParseArg(name) {
        return new _TexParser(this.GetArgument(name), this.stack.env, this.configuration).mml();
      }
      ParseUpTo(name, token2) {
        return new _TexParser(this.GetUpTo(name, token2), this.stack.env, this.configuration).mml();
      }
      GetDelimiterArg(name) {
        const c = UnitUtil.trimSpaces(this.GetArgument(name));
        if (c === "") {
          return null;
        }
        if (this.contains(HandlerType.DELIMITER, c)) {
          return c;
        }
        throw new TexError_default("MissingOrUnrecognizedDelim", "Missing or unrecognized delimiter for %1", this.currentCS);
      }
      GetStar() {
        const star = this.GetNext() === "*";
        if (star) {
          this.i++;
        }
        return star;
      }
      create(kind, ...rest) {
        const node = this.configuration.nodeFactory.create(kind, ...rest);
        if (node.isToken && node.attributes.hasExplicit("mathvariant")) {
          if (node.attributes.get("mathvariant").charAt(0) === "-") {
            node.setProperty("ignore-variant", true);
          }
        }
        return node;
      }
      trimTex(tex) {
        return tex.trim() + (tex.match(/(?:^|[^\\])(?:\\\\)*\\\s+$/) ? " " : "");
      }
      updateResult(input, old) {
        const node = this.stack.Prev(true);
        if (!node) {
          return;
        }
        const LATEX = TexConstant.Attr.LATEX;
        const latex = node.attributes.get(LATEX);
        const existing = node.attributes.get(TexConstant.Attr.LATEXITEM);
        if (existing !== void 0) {
          if (!latex) {
            if (input === "}" || existing === "}") {
              this.composeBraces(node);
            } else {
              node.attributes.set(LATEX, existing);
            }
          }
          return;
        }
        old = old < this.saveI ? this.saveI : old;
        const str = this.trimTex(old !== this.i ? this.string.slice(old, this.i) : input);
        if (!str || str === latex || input === "\\" && str === "\\") {
          return;
        }
        if (str === "_" || str === "^") {
          node.setProperty("sub-sup", str);
        } else {
          switch (node.getProperty("sub-sup")) {
            case "^":
              if (node.childNodes[2]) {
                if (str === "}") {
                  this.composeBraces(node.childNodes[2]);
                } else if (!node.childNodes[2].attributes.hasExplicit(LATEX)) {
                  node.childNodes[2].attributes.set(LATEX, str);
                }
              }
              if (node.childNodes[1]) {
                const sub = node.childNodes[1].attributes.get(LATEX);
                this.composeLatex(node, `_${sub}^`, 0, 2);
              } else {
                this.composeLatex(node, "^", 0, 2);
              }
              return;
            case "_":
              if (node.childNodes[1]) {
                if (str === "}") {
                  this.composeBraces(node.childNodes[1]);
                } else if (!node.childNodes[1].attributes.hasExplicit(LATEX)) {
                  node.childNodes[1].attributes.set(LATEX, str);
                }
              }
              if (node.childNodes[2]) {
                const sup = node.childNodes[2].attributes.get(LATEX);
                this.composeLatex(node, `^${sup}_`, 0, 1);
              } else {
                this.composeLatex(node, "_", 0, 1);
              }
              return;
          }
          if (str === "}") {
            this.composeBraces(node);
            return;
          }
        }
        node.attributes.set(LATEX, str);
      }
      composeLatex(node, comp, pos1, pos2) {
        if (!node.childNodes[pos1] || !node.childNodes[pos2])
          return;
        const LATEX = TexConstant.Attr.LATEX;
        const expr = (node.childNodes[pos1].attributes.get(LATEX) || "") + comp + node.childNodes[pos2].attributes.get(LATEX);
        node.attributes.set(LATEX, expr);
      }
      composeBraces(atom) {
        const str = this.composeBracedContent(atom);
        atom.attributes.set(TexConstant.Attr.LATEX, `{${str}}`);
      }
      composeBracedContent(atom) {
        var _a2, _b2;
        const children = ((_a2 = atom.childNodes[0]) === null || _a2 === void 0 ? void 0 : _a2.childNodes) || [];
        let expr = "";
        for (const child of children) {
          const att = ((_b2 = child === null || child === void 0 ? void 0 : child.attributes) === null || _b2 === void 0 ? void 0 : _b2.get(TexConstant.Attr.LATEX)) || "";
          if (!att)
            continue;
          expr += expr && expr.match(/[a-zA-Z]$/) && att.match(/^[a-zA-Z]/) ? " " + att : att;
        }
        return expr;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/StackItemFactory.js
var DummyItem;
var StackItemFactory;
var StackItemFactory_default;
var init_StackItemFactory = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/StackItemFactory.js"() {
    init_StackItem();
    init_Factory();
    DummyItem = class extends BaseItem {
    };
    StackItemFactory = class extends AbstractFactory {
      constructor() {
        super(...arguments);
        this.defaultKind = "dummy";
        this.configuration = null;
      }
    };
    StackItemFactory.DefaultStackItems = {
      [DummyItem.prototype.kind]: DummyItem
    };
    StackItemFactory_default = StackItemFactory;
  }
});
// node_modules/@mathjax/src/mjs/input/tex/NodeFactory.js
var NodeFactory;
var init_NodeFactory2 = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/NodeFactory.js"() {
    init_NodeUtil();
    NodeFactory = class _NodeFactory {
      constructor() {
        this.mmlFactory = null;
        this.factory = {
          node: _NodeFactory.createNode,
          token: _NodeFactory.createToken,
          text: _NodeFactory.createText,
          error: _NodeFactory.createError
        };
      }
      static createNode(factory, kind, children = [], def2 = {}, text) {
        const node = factory.mmlFactory.create(kind);
        node.setChildren(children);
        if (text) {
          node.appendChild(text);
        }
        NodeUtil_default.setProperties(node, def2);
        return node;
      }
      static createToken(factory, kind, def2 = {}, text = "") {
        const textNode = factory.create("text", text);
        return factory.create("node", kind, [], def2, textNode);
      }
      static createText(factory, text) {
        if (text == null) {
          return null;
        }
        return factory.mmlFactory.create("text").setText(text);
      }
      static createError(factory, message) {
        const text = factory.create("text", message);
        const mtext = factory.create("node", "mtext", [], {}, text);
        const error = factory.create("node", "merror", [mtext], {
          "data-mjx-error": message
        });
        return error;
      }
      setMmlFactory(mmlFactory) {
        this.mmlFactory = mmlFactory;
      }
      set(kind, func) {
        this.factory[kind] = func;
      }
      setCreators(maps3) {
        for (const kind in maps3) {
          this.set(kind, maps3[kind]);
        }
      }
      create(kind, ...rest) {
        const func = this.factory[kind] || this.factory["node"];
        const node = func(this, rest[0], ...rest.slice(1));
        if (kind === "node") {
          this.configuration.addNode(rest[0], node);
        }
        return node;
      }
      get(kind) {
        return this.factory[kind];
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/ParseUtil.js
function readKeyval(text, l3keys = false) {
  const options3 = {};
  let rest = text;
  let end, key, val;
  let dropBrace = true;
  while (rest) {
    [key, end, rest] = readValue(rest, ["=", ","], l3keys, dropBrace);
    dropBrace = false;
    if (end === "=") {
      [val, end, rest] = readValue(rest, [","], l3keys);
      val = val === "false" || val === "true" ? JSON.parse(val) : val;
      options3[key] = val;
    } else if (key) {
      options3[key] = true;
    }
  }
  return options3;
}
function removeBraces(text, count) {
  if (count === 0) {
    return text.replace(/^\s+/, "").replace(/([^\\\s]|^)((?:\\\\)*(?:\\\s)?)?\s+$/, "$1$2");
  }
  while (count > 0) {
    text = text.trim().slice(1, -1);
    count--;
  }
  return text;
}
function readValue(text, end, l3keys = false, dropBrace = false) {
  const length4 = text.length;
  let braces = 0;
  let value = "";
  let index = 0;
  let start = 0;
  let countBraces = true;
  while (index < length4) {
    const c = text[index++];
    switch (c) {
      case "\\":
        value += c + (text[index++] || "");
        countBraces = false;
        continue;
      case " ":
        break;
      case "{":
        if (countBraces) {
          start++;
        }
        braces++;
        break;
      case "}":
        if (!braces) {
          throw new TexError_default("ExtraCloseMissingOpen", "Extra close brace or missing open brace");
        }
        braces--;
        countBraces = false;
        break;
      default:
        if (!braces && end.includes(c)) {
          return [
            removeBraces(value, l3keys ? Math.min(1, start) : start),
            c,
            text.slice(index)
          ];
        }
        if (start > braces) {
          start = braces;
        }
        countBraces = false;
    }
    value += c;
  }
  if (braces) {
    throw new TexError_default("ExtraOpenMissingClose", "Extra open brace or missing close brace");
  }
  return dropBrace && start ? ["", "", removeBraces(value, 1)] : [
    removeBraces(value, l3keys ? Math.min(1, start) : start),
    "",
    text.slice(index)
  ];
}
var KeyValueDef;
var KeyValueTypes;
var ParseUtil;
var init_ParseUtil = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/ParseUtil.js"() {
    init_MmlNode();
    init_NodeUtil();
    init_TexParser();
    init_TexError();
    init_Entities();
    init_UnitUtil();
    KeyValueDef = class {
      static oneof(...values) {
        return new this("string", (value) => values.includes(value), (value) => value);
      }
      constructor(name, verify, convert) {
        this.name = name;
        this.verify = verify;
        this.convert = convert;
      }
    };
    KeyValueTypes = {
      boolean: new KeyValueDef("boolean", (value) => value === "true" || value === "false", (value) => value === "true"),
      number: new KeyValueDef("number", (value) => !!value.match(/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/), (value) => parseFloat(value)),
      integer: new KeyValueDef("integer", (value) => !!value.match(/^[-+]?\d+$/), (value) => parseInt(value)),
      string: new KeyValueDef("string", (_value) => true, (value) => value),
      dimen: new KeyValueDef("dimen", (value) => UnitUtil.matchDimen(value)[0] !== null, (value) => value)
    };
    ParseUtil = {
      cols(...W) {
        return W.map((n) => UnitUtil.em(n)).join(" ");
      },
      fenced(configuration, open, mml, close, big = "", color = "") {
        const nf = configuration.nodeFactory;
        const mrow = nf.create("node", "mrow", [], {
          open,
          close,
          texClass: TEXCLASS.INNER
        });
        let mo;
        if (big) {
          mo = new TexParser("\\" + big + "l" + open, configuration.parser.stack.env, configuration).mml();
        } else {
          const openNode = nf.create("text", open);
          mo = nf.create("node", "mo", [], {
            fence: true,
            stretchy: true,
            symmetric: true,
            texClass: TEXCLASS.OPEN
          }, openNode);
        }
        NodeUtil_default.appendChildren(mrow, [mo, mml]);
        if (big) {
          mo = new TexParser("\\" + big + "r" + close, configuration.parser.stack.env, configuration).mml();
        } else {
          const closeNode = nf.create("text", close);
          mo = nf.create("node", "mo", [], {
            fence: true,
            stretchy: true,
            symmetric: true,
            texClass: TEXCLASS.CLOSE
          }, closeNode);
        }
        if (color) {
          mo.attributes.set("mathcolor", color);
        }
        NodeUtil_default.appendChildren(mrow, [mo]);
        return mrow;
      },
      fixedFence(configuration, open, mml, close) {
        const mrow = configuration.nodeFactory.create("node", "mrow", [], {
          open,
          close,
          texClass: TEXCLASS.ORD
        });
        if (open) {
          NodeUtil_default.appendChildren(mrow, [
            ParseUtil.mathPalette(configuration, open, "l")
          ]);
        }
        if (NodeUtil_default.isType(mml, "mrow")) {
          NodeUtil_default.appendChildren(mrow, NodeUtil_default.getChildren(mml));
        } else {
          NodeUtil_default.appendChildren(mrow, [mml]);
        }
        if (close) {
          NodeUtil_default.appendChildren(mrow, [
            ParseUtil.mathPalette(configuration, close, "r")
          ]);
        }
        return mrow;
      },
      mathPalette(configuration, fence, side) {
        if (fence === "{" || fence === "}") {
          fence = "\\" + fence;
        }
        const D = "{\\bigg" + side + " " + fence + "}";
        const T = "{\\big" + side + " " + fence + "}";
        return new TexParser("\\mathchoice" + D + T + T + T, {}, configuration).mml();
      },
      fixInitialMO(configuration, nodes) {
        for (let i2 = 0, m = nodes.length; i2 < m; i2++) {
          const child = nodes[i2];
          if (child && !NodeUtil_default.isType(child, "mspace") && (!NodeUtil_default.isType(child, "TeXAtom") || NodeUtil_default.getChildren(child)[0] && NodeUtil_default.getChildren(NodeUtil_default.getChildren(child)[0]).length)) {
            if (NodeUtil_default.isEmbellished(child) || NodeUtil_default.isType(child, "TeXAtom") && NodeUtil_default.getTexClass(child) === TEXCLASS.REL) {
              const mi = configuration.nodeFactory.create("node", "mi");
              nodes.unshift(mi);
            }
            break;
          }
        }
      },
      internalMath(parser2, text, level, font) {
        text = text.replace(/ +/g, " ");
        if (parser2.configuration.options.internalMath) {
          return parser2.configuration.options.internalMath(parser2, text, level, font);
        }
        const mathvariant = font || parser2.stack.env.font;
        const def2 = mathvariant ? { mathvariant } : {};
        let mml = [], i2 = 0, k = 0, c, node, match = "", braces = 0;
        if (text.match(/\\?[${}\\]|\\\(|\\(?:eq)?ref\s*\{|\\U/)) {
          while (i2 < text.length) {
            c = text.charAt(i2++);
            if (c === "$") {
              if (match === "$" && braces === 0) {
                node = parser2.create("node", "TeXAtom", [
                  new TexParser(text.slice(k, i2 - 1), {}, parser2.configuration).mml()
                ]);
                mml.push(node);
                match = "";
                k = i2;
              } else if (match === "") {
                if (k < i2 - 1) {
                  mml.push(ParseUtil.internalText(parser2, text.slice(k, i2 - 1), def2));
                }
                match = "$";
                k = i2;
              }
            } else if (c === "{" && match !== "") {
              braces++;
            } else if (c === "}") {
              if (match === "}" && braces === 0) {
                const atom = new TexParser(text.slice(k, i2), {}, parser2.configuration).mml();
                node = parser2.create("node", "TeXAtom", [atom], def2);
                mml.push(node);
                match = "";
                k = i2;
              } else if (match !== "") {
                if (braces) {
                  braces--;
                }
              }
            } else if (c === "\\") {
              if (match === "" && text.substring(i2).match(/^(eq)?ref\s*\{/)) {
                const len = RegExp["$&"].length;
                if (k < i2 - 1) {
                  mml.push(ParseUtil.internalText(parser2, text.slice(k, i2 - 1), def2));
                }
                match = "}";
                k = i2 - 1;
                i2 += len;
              } else {
                c = text.charAt(i2++);
                if (c === "(" && match === "") {
                  if (k < i2 - 2) {
                    mml.push(ParseUtil.internalText(parser2, text.slice(k, i2 - 2), def2));
                  }
                  match = ")";
                  k = i2;
                } else if (c === ")" && match === ")" && braces === 0) {
                  node = parser2.create("node", "TeXAtom", [
                    new TexParser(text.slice(k, i2 - 2), {}, parser2.configuration).mml()
                  ]);
                  mml.push(node);
                  match = "";
                  k = i2;
                } else if (c.match(/[${}\\]/) && match === "") {
                  i2--;
                  text = text.substring(0, i2 - 1) + text.substring(i2);
                } else if (c === "U") {
                  const arg = text.substring(i2).match(/^\s*(?:([0-9A-F])|\{\s*([0-9A-F]+)\s*\})/);
                  if (!arg) {
                    throw new TexError_default("BadRawUnicode", "Argument to %1 must a hexadecimal number with 1 to 6 digits", "\\U");
                  }
                  const c2 = String.fromCodePoint(parseInt(arg[1] || arg[2], 16));
                  text = text.substring(0, i2 - 2) + c2 + text.substring(i2 + arg[0].length);
                  i2 = i2 - 2 + c2.length;
                }
              }
            }
          }
          if (match !== "") {
            throw new TexError_default("MathNotTerminated", "Math mode is not properly terminated");
          }
        }
        if (k < text.length) {
          mml.push(ParseUtil.internalText(parser2, text.slice(k), def2));
        }
        if (level != null) {
          mml = [
            parser2.create("node", "mstyle", mml, {
              displaystyle: false,
              scriptlevel: level
            })
          ];
        } else if (mml.length > 1) {
          mml = [parser2.create("node", "mrow", mml)];
        }
        return mml;
      },
      internalText(parser2, text, def2) {
        text = text.replace(/\n+/g, " ").replace(/^ +/, entities.nbsp).replace(/ +$/, entities.nbsp);
        const textNode = parser2.create("text", text);
        return parser2.create("node", "mtext", [], def2, textNode);
      },
      underOver(parser2, base, script2, pos, stack2) {
        ParseUtil.checkMovableLimits(base);
        if (NodeUtil_default.isType(base, "munderover") && NodeUtil_default.isEmbellished(base)) {
          NodeUtil_default.setProperties(NodeUtil_default.getCoreMO(base), {
            lspace: 0,
            rspace: 0
          });
          const mo = parser2.create("node", "mo", [], { rspace: 0 });
          base = parser2.create("node", "mrow", [mo, base]);
        }
        const mml = parser2.create("node", "munderover", [base]);
        NodeUtil_default.setChild(mml, pos === "over" ? mml.over : mml.under, script2);
        let node = mml;
        if (stack2) {
          node = parser2.create("node", "TeXAtom", [
            parser2.create("node", "mstyle", [mml], {
              displaystyle: true,
              scriptlevel: 0
            })
          ], {
            texClass: TEXCLASS.OP,
            movesupsub: true
          });
        }
        NodeUtil_default.setProperty(node, "subsupOK", true);
        return node;
      },
      checkMovableLimits(base) {
        const symbol = NodeUtil_default.isType(base, "mo") ? NodeUtil_default.getForm(base) : null;
        if (NodeUtil_default.getProperty(base, "movablelimits") || symbol && symbol[3] && symbol[3].movablelimits) {
          NodeUtil_default.setProperties(base, { movablelimits: false });
        }
      },
      setArrayAlign(array, align, parser2) {
        if (!parser2) {
          align = UnitUtil.trimSpaces(align || "");
        }
        if (align === "t") {
          array.arraydef.align = "baseline 1";
        } else if (align === "b") {
          array.arraydef.align = "baseline -1";
        } else if (align === "c") {
          array.arraydef.align = "axis";
        } else if (align) {
          if (parser2) {
            parser2.string = `[${align}]` + parser2.string.slice(parser2.i);
            parser2.i = 0;
          } else {
            array.arraydef.align = align;
          }
        }
        return array;
      },
      substituteArgs(parser2, args, str) {
        let text = "";
        let newstring = "";
        let i2 = 0;
        while (i2 < str.length) {
          let c = str.charAt(i2++);
          if (c === "\\") {
            text += c + str.charAt(i2++);
          } else if (c === "#") {
            c = str.charAt(i2++);
            if (c === "#") {
              text += c;
            } else {
              if (!c.match(/[1-9]/) || parseInt(c, 10) > args.length) {
                throw new TexError_default("IllegalMacroParam", "Illegal macro parameter reference");
              }
              newstring = ParseUtil.addArgs(parser2, ParseUtil.addArgs(parser2, newstring, text), args[parseInt(c, 10) - 1]);
              text = "";
            }
          } else {
            text += c;
          }
        }
        return ParseUtil.addArgs(parser2, newstring, text);
      },
      addArgs(parser2, s1, s2) {
        if (s2.match(/^[a-z]/i) && s1.match(/(^|[^\\])(\\\\)*\\[a-z]+$/i)) {
          s1 += " ";
        }
        if (s1.length + s2.length > parser2.configuration.options["maxBuffer"]) {
          throw new TexError_default("MaxBufferSize", "MathJax internal buffer size exceeded; is there a recursive macro call?");
        }
        return s1 + s2;
      },
      checkMaxMacros(parser2, isMacro = true) {
        if (++parser2.macroCount <= parser2.configuration.options["maxMacros"]) {
          return;
        }
        if (isMacro) {
          throw new TexError_default("MaxMacroSub1", "MathJax maximum macro substitution count exceeded; is here a recursive macro call?");
        } else {
          throw new TexError_default("MaxMacroSub2", "MathJax maximum substitution count exceeded; is there a recursive latex environment?");
        }
      },
      checkEqnEnv(parser2, nestable = true) {
        const top = parser2.stack.Top();
        const first = top.First;
        if (top.getProperty("nestable") && nestable && !first || top.getProperty("nestStart")) {
          return;
        }
        if (!top.isKind("start") || first) {
          throw new TexError_default("ErroneousNestingEq", "Erroneous nesting of equation structures");
        }
      },
      copyNode(node, parser2) {
        const tree = node.copy();
        const options3 = parser2.configuration;
        tree.walkTree((n) => {
          options3.addNode(n.kind, n);
          const lists = (n.getProperty("in-lists") || "").split(/,/);
          for (const list3 of lists) {
            if (list3) {
              options3.addNode(list3, n);
            }
          }
        });
        return tree;
      },
      mmlFilterAttribute(_parser, _name, value) {
        return value;
      },
      getFontDef(parser2) {
        const font = parser2.stack.env["font"];
        return font ? { mathvariant: font } : {};
      },
      keyvalOptions(attrib, allowed = null, error = false, l3keys = false) {
        const def2 = readKeyval(attrib, l3keys);
        if (allowed) {
          for (const key of Object.keys(def2)) {
            if (Object.hasOwn(allowed, key)) {
              if (allowed[key] instanceof KeyValueDef) {
                const type = allowed[key];
                const value = String(def2[key]);
                if (!type.verify(value)) {
                  throw new TexError_default("InvalidValue", "Value for key '%1' is not of the expected type", key);
                }
                def2[key] = type.convert(value);
              }
            } else {
              if (error) {
                throw new TexError_default("InvalidOption", "Invalid option: %1", key);
              }
              delete def2[key];
            }
          }
        }
        return def2;
      },
      isLatinOrGreekChar(c) {
        return !!c.normalize("NFD").match(/[a-zA-Z\u0370-\u03F0]/);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/ColumnParser.js
var ColumnParser;
var init_ColumnParser = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/ColumnParser.js"() {
    init_TexError();
    init_Options();
    init_ParseUtil();
    init_UnitUtil();
    ColumnParser = class {
      constructor() {
        this.columnHandler = {
          l: (state) => state.calign[state.j++] = "left",
          c: (state) => state.calign[state.j++] = "center",
          r: (state) => state.calign[state.j++] = "right",
          p: (state) => this.getColumn(state, "top"),
          m: (state) => this.getColumn(state, "middle"),
          b: (state) => this.getColumn(state, "bottom"),
          w: (state) => this.getColumn(state, "top", ""),
          W: (state) => this.getColumn(state, "top", ""),
          "|": (state) => this.addRule(state, "solid"),
          ":": (state) => this.addRule(state, "dashed"),
          ">": (state) => state.cstart[state.j] = this.getBraces(state) + (state.cstart[state.j] || ""),
          "<": (state) => state.cend[state.j - 1] = this.getBraces(state) + (state.cend[state.j - 1] || ""),
          "@": (state) => this.addAt(state, this.getBraces(state)),
          "!": (state) => this.addBang(state, this.getBraces(state)),
          "*": (state) => this.repeat(state),
          "{": (state) => this.brace(state),
          P: (state) => this.macroColumn(state, ">{$}p{#1}<{$}", 1),
          M: (state) => this.macroColumn(state, ">{$}m{#1}<{$}", 1),
          B: (state) => this.macroColumn(state, ">{$}b{#1}<{$}", 1),
          " ": (_state) => {
          },
          "\n": (_state_) => {
          }
        };
        this.MAXCOLUMNS = 1e4;
      }
      process(parser2, template, array) {
        const state = {
          parser: parser2,
          template,
          i: 0,
          j: 0,
          c: "",
          cwidth: [],
          calign: [],
          cspace: [],
          clines: [],
          cstart: array.cstart,
          cend: array.cend,
          ralign: array.ralign,
          cextra: array.cextra
        };
        if (template.charAt(0) === "{" && template.slice(-1) === "}") {
          const braced = this.getBraces(state);
          if (braced.length === template.length - 2) {
            state.template = braced;
          }
          state.i = 0;
        }
        let n = 0;
        while (state.i < state.template.length) {
          if (n++ > this.MAXCOLUMNS) {
            throw new TexError_default("MaxColumns", "Too many column specifiers (perhaps looping column definitions?)");
          }
          const code = state.template.codePointAt(state.i);
          const c = state.c = String.fromCodePoint(code);
          state.i += c.length;
          this.processColumn(state, c);
        }
        this.setColumnAlign(state, array);
        this.setColumnWidths(state, array);
        this.setColumnSpacing(state, array);
        this.setColumnLines(state, array);
        this.setPadding(state, array);
      }
      processColumn(state, c) {
        if (!Object.hasOwn(this.columnHandler, c)) {
          throw new TexError_default("BadPreamToken", "Illegal pream-token (%1)", c);
        }
        this.columnHandler[c](state);
      }
      setColumnAlign(state, array) {
        array.arraydef.columnalign = state.calign.join(" ");
      }
      setColumnWidths(state, array) {
        if (!state.cwidth.length)
          return;
        const cwidth = [...state.cwidth];
        if (cwidth.length < state.calign.length) {
          cwidth.push("auto");
        }
        array.arraydef.columnwidth = cwidth.map((w) => w || "auto").join(" ");
      }
      setColumnSpacing(state, array) {
        if (!state.cspace.length)
          return;
        const cspace = [...state.cspace];
        if (cspace.length < state.calign.length) {
          cspace.push("1em");
        }
        array.arraydef.columnspacing = cspace.slice(1).map((d) => d || "1em").join(" ");
      }
      setColumnLines(state, array) {
        if (!state.clines.length)
          return;
        const clines = [...state.clines];
        if (clines[0]) {
          array.frame.push(["left", clines[0]]);
        }
        if (clines.length > state.calign.length) {
          array.frame.push(["right", clines.pop()]);
        } else if (clines.length < state.calign.length) {
          clines.push("none");
        }
        if (clines.length > 1) {
          array.arraydef.columnlines = clines.slice(1).map((l) => l || "none").join(" ");
        }
      }
      setPadding(state, array) {
        if (!state.cextra[0] && !state.cextra[state.calign.length - 1])
          return;
        const i2 = state.calign.length - 1;
        const cspace = state.cspace;
        const space = !state.cextra[i2] ? null : cspace[i2];
        array.arraydef["data-array-padding"] = `${cspace[0] || ".5em"} ${space || ".5em"}`;
      }
      getColumn(state, ralign, calign = "left") {
        state.calign[state.j] = calign || this.getAlign(state);
        state.cwidth[state.j] = this.getDimen(state);
        state.ralign[state.j] = [
          ralign,
          state.cwidth[state.j],
          state.calign[state.j]
        ];
        state.j++;
      }
      getDimen(state) {
        const dim = this.getBraces(state);
        if (!UnitUtil.matchDimen(dim)[0]) {
          throw new TexError_default("MissingColumnDimOrUnits", "Missing dimension or its units for %1 column declaration", state.c);
        }
        return dim;
      }
      getAlign(state) {
        const align = this.getBraces(state);
        return lookup(align.toLowerCase(), { l: "left", c: "center", r: "right" }, "");
      }
      getBraces(state) {
        while (state.template[state.i] === " ")
          state.i++;
        if (state.i >= state.template.length) {
          throw new TexError_default("MissingArgForColumn", "Missing argument for %1 column declaration", state.c);
        }
        if (state.template[state.i] !== "{") {
          return state.template[state.i++];
        }
        const i2 = ++state.i;
        let braces = 1;
        while (state.i < state.template.length) {
          switch (state.template.charAt(state.i++)) {
            case "\\":
              state.i++;
              break;
            case "{":
              braces++;
              break;
            case "}":
              if (--braces === 0) {
                return state.template.slice(i2, state.i - 1);
              }
              break;
          }
        }
        throw new TexError_default("MissingCloseBrace", "Missing close brace");
      }
      macroColumn(state, macro, n) {
        const args = [];
        while (n > 0 && n--) {
          args.push(this.getBraces(state));
        }
        state.template = ParseUtil.substituteArgs(state.parser, args, macro) + state.template.slice(state.i);
        state.i = 0;
      }
      addRule(state, rule) {
        if (state.clines[state.j]) {
          this.addAt(state, "\\,");
        }
        state.clines[state.j] = rule;
        if (state.cspace[state.j] === "0") {
          state.cstart[state.j] = "\\hspace{.5em}";
        }
      }
      addAt(state, macro) {
        const { cstart, cspace, j } = state;
        state.cextra[j] = true;
        state.calign[j] = "center";
        if (state.clines[j]) {
          if (cspace[j] === ".5em") {
            cstart[j - 1] += "\\hspace{.25em}";
          } else if (!cspace[j]) {
            state.cend[j - 1] = (state.cend[j - 1] || "") + "\\hspace{.5em}";
          }
        }
        cstart[j] = macro;
        cspace[j] = "0";
        cspace[++state.j] = "0";
      }
      addBang(state, macro) {
        const { cstart, cspace, j } = state;
        state.cextra[j] = true;
        state.calign[j] = "center";
        cstart[j] = (cspace[j] === "0" && state.clines[j] ? "\\hspace{.25em}" : "") + macro;
        if (!cspace[j]) {
          cspace[j] = ".5em";
        }
        cspace[++state.j] = ".5em";
      }
      repeat(state) {
        const num3 = this.getBraces(state);
        const cols = this.getBraces(state);
        const n = parseInt(num3);
        if (String(n) !== num3) {
          throw new TexError_default("ColArgNotNum", "First argument to %1 column specifier must be a number", "*");
        }
        state.template = new Array(n).fill(cols).join("") + state.template.substring(state.i);
        state.i = 0;
      }
      brace(state) {
        state.i--;
        this.processColumn(state, this.getBraces(state));
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/ParseOptions.js
var MATHVARIANT;
var ParseOptions;
var ParseOptions_default;
var init_ParseOptions = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/ParseOptions.js"() {
    init_StackItemFactory();
    init_NodeFactory2();
    init_NodeUtil();
    init_TexConstants();
    init_Options();
    init_ColumnParser();
    MATHVARIANT = TexConstant.Variant;
    ParseOptions = class _ParseOptions {
      constructor(configuration, options3 = []) {
        this.options = {};
        this.columnParser = new ColumnParser();
        this.packageData = /* @__PURE__ */ new Map();
        this.parsers = [];
        this.root = null;
        this.nodeLists = {};
        this.error = false;
        this.handlers = configuration.handlers;
        this.nodeFactory = new NodeFactory();
        this.nodeFactory.configuration = this;
        this.nodeFactory.setCreators(configuration.nodes);
        this.itemFactory = new StackItemFactory_default(configuration.items);
        this.itemFactory.configuration = this;
        defaultOptions(this.options, ...options3);
        defaultOptions(this.options, configuration.options);
        this.mathStyle = _ParseOptions.getVariant.get(this.options.mathStyle) || _ParseOptions.getVariant.get("TeX");
      }
      pushParser(parser2) {
        this.parsers.unshift(parser2);
      }
      popParser() {
        this.parsers.shift();
      }
      get parser() {
        return this.parsers[0];
      }
      clear() {
        this.parsers = [];
        this.root = null;
        this.nodeLists = {};
        this.error = false;
        this.tags.resetTag();
      }
      addNode(property, node) {
        let list3 = this.nodeLists[property];
        if (!list3) {
          list3 = this.nodeLists[property] = [];
        }
        list3.push(node);
        if (node.kind !== property) {
          const inlists = NodeUtil_default.getProperty(node, "in-lists") || "";
          const lists = (inlists ? inlists.split(/,/) : []).concat(property).join(",");
          NodeUtil_default.setProperty(node, "in-lists", lists);
        }
      }
      getList(property) {
        const list3 = this.nodeLists[property] || [];
        const result = [];
        for (const node of list3) {
          if (this.inTree(node)) {
            result.push(node);
          }
        }
        this.nodeLists[property] = result;
        return result;
      }
      removeFromList(property, nodes) {
        const list3 = this.nodeLists[property] || [];
        for (const node of nodes) {
          const i2 = list3.indexOf(node);
          if (i2 >= 0) {
            list3.splice(i2, 1);
          }
        }
      }
      inTree(node) {
        while (node && node !== this.root) {
          node = node.parent;
        }
        return !!node;
      }
    };
    ParseOptions.getVariant = /* @__PURE__ */ new Map([
      [
        "TeX",
        (c, b) => b ? c.match(/^[\u0391-\u03A9\u03F4]/) ? MATHVARIANT.NORMAL : "" : ""
      ],
      ["ISO", (_c) => MATHVARIANT.ITALIC],
      [
        "French",
        (c) => c.normalize("NFD").match(/^[a-z]/) ? MATHVARIANT.ITALIC : MATHVARIANT.NORMAL
      ],
      ["upright", (_c) => MATHVARIANT.NORMAL]
    ]);
    ParseOptions_default = ParseOptions;
  }
});
// node_modules/@mathjax/src/mjs/input/tex/Tags.js
var Label;
var TagInfo;
var AbstractTags;
var NoTags;
var AllTags;
var tagsMapping;
var defaultTags;
var TagsFactory;
var init_Tags = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/Tags.js"() {
    init_TexParser();
    Label = class {
      constructor(tag3 = "???", id = "") {
        this.tag = tag3;
        this.id = id;
      }
    };
    TagInfo = class {
      constructor(env = "", taggable = false, defaultTags2 = false, tag3 = null, tagId = "", tagFormat = "", noTag = false, labelId = "") {
        this.env = env;
        this.taggable = taggable;
        this.defaultTags = defaultTags2;
        this.tag = tag3;
        this.tagId = tagId;
        this.tagFormat = tagFormat;
        this.noTag = noTag;
        this.labelId = labelId;
      }
    };
    AbstractTags = class {
      constructor() {
        this.counter = 0;
        this.allCounter = 0;
        this.configuration = null;
        this.ids = {};
        this.allIds = {};
        this.labels = {};
        this.allLabels = {};
        this.redo = false;
        this.refUpdate = false;
        this.currentTag = new TagInfo();
        this.history = [];
        this.stack = [];
        this.enTag = function(node, tag3) {
          const nf = this.configuration.nodeFactory;
          const cell = nf.create("node", "mtd", [node]);
          const row = nf.create("node", "mlabeledtr", [tag3, cell]);
          const table2 = nf.create("node", "mtable", [row], {
            side: this.configuration.options["tagSide"],
            minlabelspacing: this.configuration.options["tagIndent"],
            displaystyle: true
          });
          return table2;
        };
      }
      start(env, taggable, defaultTags2) {
        if (this.currentTag) {
          this.stack.push(this.currentTag);
        }
        const label = this.label;
        this.currentTag = new TagInfo(env, taggable, defaultTags2);
        this.label = label;
      }
      get env() {
        return this.currentTag.env;
      }
      end() {
        this.history.push(this.currentTag);
        const label = this.label;
        this.currentTag = this.stack.pop();
        if (label && !this.label) {
          this.label = label;
        }
      }
      tag(tag3, noFormat) {
        this.currentTag.tag = tag3;
        this.currentTag.tagFormat = noFormat ? tag3 : this.formatTag(tag3);
        this.currentTag.noTag = false;
      }
      notag() {
        this.tag("", true);
        this.currentTag.noTag = true;
      }
      get noTag() {
        return this.currentTag.noTag;
      }
      set label(label) {
        this.currentTag.labelId = label;
      }
      get label() {
        return this.currentTag.labelId;
      }
      formatUrl(id, base) {
        return base + "#" + encodeURIComponent(id);
      }
      formatTag(tag3) {
        return ["(", tag3, ")"];
      }
      formatRef(tag3) {
        return this.formatTag(tag3);
      }
      formatId(id) {
        return "mjx-eqn:" + id.replace(/\s/g, "_");
      }
      formatNumber(n) {
        return n.toString();
      }
      autoTag() {
        if (this.currentTag.tag == null) {
          this.counter++;
          this.tag(this.formatNumber(this.counter), false);
        }
      }
      clearTag() {
        this.tag(null, true);
        this.currentTag.tagId = "";
      }
      getTag(force = false) {
        if (force) {
          this.autoTag();
          return this.makeTag();
        }
        const ct = this.currentTag;
        if (ct.taggable && !ct.noTag) {
          if (ct.defaultTags) {
            this.autoTag();
          }
          if (ct.tag) {
            return this.makeTag();
          }
        }
        return null;
      }
      resetTag() {
        this.history = [];
        this.redo = false;
        this.refUpdate = false;
        this.clearTag();
      }
      reset(offset = 0) {
        this.resetTag();
        this.counter = this.allCounter = offset;
        this.allLabels = {};
        this.allIds = {};
        this.label = "";
      }
      startEquation(math) {
        this.history = [];
        this.stack = [];
        this.clearTag();
        this.currentTag = new TagInfo("", void 0, void 0);
        this.labels = {};
        this.ids = {};
        this.counter = this.allCounter;
        this.redo = false;
        const recompile = math.inputData.recompile;
        if (recompile) {
          this.refUpdate = true;
          this.counter = recompile.counter;
        }
      }
      finishEquation(math) {
        if (this.redo) {
          math.inputData.recompile = {
            state: math.state(),
            counter: this.allCounter
          };
        }
        if (!this.refUpdate) {
          this.allCounter = this.counter;
        }
        Object.assign(this.allIds, this.ids);
        Object.assign(this.allLabels, this.labels);
      }
      finalize(node, env) {
        if (!env.display || this.currentTag.env || this.currentTag.tag == null) {
          return node;
        }
        const tag3 = this.makeTag();
        const table2 = this.enTag(node, tag3);
        return table2;
      }
      makeId() {
        this.currentTag.tagId = this.formatId(this.configuration.options["useLabelIds"] ? this.label || this.currentTag.tag : this.currentTag.tag);
      }
      makeTag() {
        var _a2;
        this.makeId();
        if (this.label) {
          this.labels[this.label] = new Label(this.currentTag.tag, this.currentTag.tagId);
          this.label = "";
        }
        const format = this.currentTag.tagFormat;
        const tag3 = Array.isArray(format) ? format : ((_a2 = format.match(/^(\(|\[|\{)(.*)(\}|\]|\))$/)) === null || _a2 === void 0 ? void 0 : _a2.slice(1)) || [format];
        const mml = new TexParser(tag3.map((part) => part ? `\\text{${part}}` : "").join(""), {}, this.configuration).mml();
        return this.configuration.nodeFactory.create("node", "mtd", [mml], {
          id: this.currentTag.tagId,
          rowalign: this.configuration.options.tagAlign
        });
      }
    };
    NoTags = class extends AbstractTags {
      autoTag() {
      }
      getTag() {
        return !this.currentTag.tag ? null : super.getTag();
      }
    };
    AllTags = class extends AbstractTags {
      finalize(node, env) {
        if (!env.display || this.history.find(function(x2) {
          return x2.taggable;
        })) {
          return node;
        }
        const tag3 = this.getTag(true);
        return this.enTag(node, tag3);
      }
    };
    tagsMapping = /* @__PURE__ */ new Map([
      ["none", NoTags],
      ["all", AllTags]
    ]);
    defaultTags = "none";
    TagsFactory = {
      OPTIONS: {
        tags: defaultTags,
        tagSide: "right",
        tagIndent: "0.8em",
        useLabelIds: true,
        ignoreDuplicateLabels: false,
        tagAlign: "baseline"
      },
      add(name, constr) {
        tagsMapping.set(name, constr);
      },
      addTags(tags) {
        for (const key of Object.keys(tags)) {
          TagsFactory.add(key, tags[key]);
        }
      },
      create(name) {
        const constr = tagsMapping.get(name) || tagsMapping.get(defaultTags);
        if (!constr) {
          throw Error("Unknown tags class");
        }
        return new constr();
      },
      setDefault(name) {
        defaultTags = name;
      },
      getDefault() {
        return TagsFactory.create(defaultTags);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/Token.js
var Token;
var Macro;
var init_Token = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/Token.js"() {
    Token = class {
      constructor(_token, _char, _attributes) {
        this._token = _token;
        this._char = _char;
        this._attributes = _attributes;
      }
      get token() {
        return this._token;
      }
      get char() {
        return this._char;
      }
      get attributes() {
        return this._attributes;
      }
    };
    Macro = class {
      constructor(_token, _func, _args = []) {
        this._token = _token;
        this._func = _func;
        this._args = _args;
      }
      get token() {
        return this._token;
      }
      get func() {
        return this._func;
      }
      get args() {
        return this._args;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/TokenMap.js
function parseResult(result) {
  return result === void 0 ? true : result;
}
var AbstractTokenMap;
var RegExpMap;
var AbstractParseMap;
var CharacterMap;
var DelimiterMap;
var MacroMap;
var CommandMap;
var EnvironmentMap;
var init_TokenMap = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/TokenMap.js"() {
    init_Token();
    (__kittexLate.init_MapHandler?.())();
    AbstractTokenMap = class {
      constructor(_name, _parser) {
        this._name = _name;
        this._parser = _parser;
        (__kittexLate.MapHandler?.()).register(this);
      }
      get name() {
        return this._name;
      }
      parserFor(token2) {
        return this.contains(token2) ? this.parser : null;
      }
      parse([env, token2]) {
        const parser2 = this.parserFor(token2);
        const mapped = this.lookup(token2);
        return parser2 && mapped ? parseResult(parser2(env, mapped)) : null;
      }
      set parser(parser2) {
        this._parser = parser2;
      }
      get parser() {
        return this._parser;
      }
    };
    RegExpMap = class extends AbstractTokenMap {
      constructor(name, parser2, _regExp) {
        super(name, parser2);
        this._regExp = _regExp;
      }
      contains(token2) {
        return this._regExp.test(token2);
      }
      lookup(token2) {
        return this.contains(token2) ? token2 : null;
      }
    };
    AbstractParseMap = class extends AbstractTokenMap {
      constructor() {
        super(...arguments);
        this.map = /* @__PURE__ */ new Map();
      }
      lookup(token2) {
        return this.map.get(token2);
      }
      contains(token2) {
        return this.map.has(token2);
      }
      add(token2, object) {
        this.map.set(token2, object);
      }
      remove(token2) {
        this.map.delete(token2);
      }
    };
    CharacterMap = class extends AbstractParseMap {
      constructor(name, parser2, json) {
        super(name, parser2);
        for (const key of Object.keys(json)) {
          const value = json[key];
          const [char, attrs] = typeof value === "string" ? [value, null] : value;
          const character = new Token(key, char, attrs);
          this.add(key, character);
        }
      }
    };
    DelimiterMap = class extends CharacterMap {
      parse([env, token2]) {
        return super.parse([env, "\\" + token2]);
      }
    };
    MacroMap = class extends AbstractParseMap {
      constructor(name, json, functionMap = {}) {
        super(name, null);
        const getMethod = (func) => typeof func === "string" ? functionMap[func] : func;
        for (const [key, value] of Object.entries(json)) {
          let func;
          let args;
          if (Array.isArray(value)) {
            func = getMethod(value[0]);
            args = value.slice(1);
          } else {
            func = getMethod(value);
            args = [];
          }
          const character = new Macro(key, func, args);
          this.add(key, character);
        }
      }
      parserFor(token2) {
        const macro = this.lookup(token2);
        return macro ? macro.func : null;
      }
      parse([env, token2]) {
        const macro = this.lookup(token2);
        const parser2 = this.parserFor(token2);
        if (!macro || !parser2) {
          return null;
        }
        return parseResult(parser2(env, macro.token, ...macro.args));
      }
    };
    CommandMap = class extends MacroMap {
      parse([env, token2]) {
        const macro = this.lookup(token2);
        const parser2 = this.parserFor(token2);
        if (!macro || !parser2) {
          return null;
        }
        const saveCommand = env.currentCS;
        env.currentCS = "\\" + token2;
        const result = parser2(env, "\\" + macro.token, ...macro.args);
        env.currentCS = saveCommand;
        return parseResult(result);
      }
    };
    EnvironmentMap = class extends MacroMap {
      constructor(name, parser2, json, functionMap = {}) {
        super(name, json, functionMap);
        this.parser = parser2;
      }
      parse([env, token2]) {
        const macro = this.lookup(token2);
        const envParser = this.parserFor(token2);
        if (!macro || !envParser) {
          return null;
        }
        return parseResult(this.parser(env, macro.token, envParser, macro.args));
      }
    };
  }
});
export{init_TokenMap,CharacterMap,init_Tags,TagsFactory,init_ParseUtil,ParseUtil,TexParser,init_TexParser,Label,RegExpMap,MacroMap,DelimiterMap,CommandMap,EnvironmentMap,AbstractTags,init_ParseOptions,ParseOptions_default,init_Token,Token,Macro,NodeFactory,init_NodeFactory2};
