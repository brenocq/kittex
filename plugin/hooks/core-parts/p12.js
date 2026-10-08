import{__esm,init_Element,init_Document,init_List,init_Parser,LiteParser,LiteList,LiteElement,LiteDocument,init_DOMAdaptor,init_NodeMixin,init_Text,AbstractDOMAdaptor,LiteText,LiteComment,NodeMixin}from'./p11.js';export*from'./p11.js';
// node_modules/@mathjax/src/mjs/adaptors/lite/Window.js
var LiteWindow;
var init_Window = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/lite/Window.js"() {
    init_Element();
    init_Document();
    init_List();
    init_Parser();
    LiteWindow = class {
      constructor() {
        this.DOMParser = LiteParser;
        this.NodeList = LiteList;
        this.HTMLCollection = LiteList;
        this.HTMLElement = LiteElement;
        this.DocumentFragment = LiteList;
        this.Document = LiteDocument;
        this.document = new LiteDocument(this);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/util/Styles.js
function splitSpaces(text) {
  const parts = text.split(/((?:'[^'\n]*'|"[^"\n]*"|,[\s\n]|[^\s\n])*)/g);
  const split2 = [];
  while (parts.length > 1) {
    parts.shift();
    split2.push(parts.shift());
  }
  return split2;
}
function splitTRBL(name) {
  const parts = splitSpaces(this.styles[name]);
  if (parts.length === 0) {
    parts.push("");
  }
  if (parts.length === 1) {
    parts.push(parts[0]);
  }
  if (parts.length === 2) {
    parts.push(parts[0]);
  }
  if (parts.length === 3) {
    parts.push(parts[1]);
  }
  for (const child of Styles.connect[name].children) {
    this.setStyle(this.childName(name, child), parts.shift());
  }
}
function combineTRBL(name) {
  const children = Styles.connect[name].children;
  const parts = [];
  for (const child of children) {
    const part = this.styles[this.childName(name, child)];
    if (!part) {
      delete this.styles[name];
      return;
    }
    parts.push(part);
  }
  if (parts[3] === parts[1]) {
    parts.pop();
    if (parts[2] === parts[0]) {
      parts.pop();
      if (parts[1] === parts[0]) {
        parts.pop();
      }
    }
  }
  this.styles[name] = parts.join(" ");
}
function combinePart(name) {
  combineTRBL.call(this, name);
  this.combineChildren(name);
  combineSame.call(this, name);
  this.combineParent(name);
}
function splitSame(name) {
  for (const child of Styles.connect[name].children) {
    this.setStyle(this.childName(name, child), this.styles[name]);
  }
}
function combineSame(name) {
  if (!Styles.connect[name])
    return;
  const children = [...Styles.connect[name].children];
  const value = this.styles[this.childName(name, children.shift())];
  for (const child of children) {
    if (this.styles[this.childName(name, child)] !== value) {
      delete this.styles[name];
      return;
    }
  }
  if (value) {
    this.styles[name] = value;
  }
}
function splitWSC(name) {
  const parts = { width: "", style: "", color: "" };
  for (const part of splitSpaces(this.styles[name])) {
    if (part.match(BORDER.width) && parts.width === "") {
      parts.width = part;
    } else if (part.match(BORDER.style) && parts.style === "") {
      parts.style = part;
    } else {
      parts.color = part;
    }
  }
  for (const child of Styles.connect[name].children) {
    this.setStyle(this.childName(name, child), parts[child]);
  }
}
function combineWSC(name) {
  const parts = [];
  for (const child of Styles.connect[name].children) {
    const value = this.styles[this.childName(name, child)];
    if (value) {
      parts.push(value);
    }
  }
  if (parts.length > 1) {
    this.styles[name] = parts.join(" ");
  } else {
    delete this.styles[name];
  }
}
function splitFont(name) {
  const parts = splitSpaces(this.styles[name]);
  const value = {
    style: "",
    variant: [],
    weight: "",
    stretch: "",
    size: "",
    family: "",
    "line-height": ""
  };
  for (const part of parts) {
    if (!value.family) {
      value.family = part;
    }
    for (const name2 of Object.keys(FONT)) {
      if ((Array.isArray(value[name2]) || value[name2] === "") && part.match(FONT[name2])) {
        if (value.family === part) {
          value.family = "";
        }
        if (name2 === "size") {
          const [size, height2] = part.split(/\//);
          value[name2] = size;
          if (height2) {
            value["line-height"] = height2;
          }
        } else if (value.size === "") {
          if (Array.isArray(value[name2])) {
            value[name2].push(part);
          } else if (value[name2] === "") {
            value[name2] = part;
          }
        }
      }
    }
  }
  saveFontParts.call(this, name, value);
  delete this.styles[name];
}
function saveFontParts(name, value) {
  for (const child of Styles.connect[name].children) {
    const cname = this.childName(name, child);
    if (Array.isArray(value[child])) {
      const values = value[child];
      if (values.length) {
        this.styles[cname] = values.join(" ");
      }
    } else if (value[child] !== "") {
      this.styles[cname] = value[child];
    }
  }
}
function combineFont(_name) {
}
var TRBL;
var WSC;
var BORDER;
var FONT;
var Styles;
var init_Styles = __esm({
  "node_modules/@mathjax/src/mjs/util/Styles.js"() {
    TRBL = ["top", "right", "bottom", "left"];
    WSC = ["width", "style", "color"];
    BORDER = {
      width: /^(?:[\d.]+(?:[a-z]+)|thin|medium|thick|inherit|initial|unset)$/,
      style: /^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset|inherit|initial|unset)$/
    };
    FONT = {
      style: /^(?:normal|italic|oblique|inherit|initial|unset)$/,
      variant: new RegExp("^(?:" + [
        "normal|none",
        "inherit|initial|unset",
        "common-ligatures|no-common-ligatures",
        "discretionary-ligatures|no-discretionary-ligatures",
        "historical-ligatures|no-historical-ligatures",
        "contextual|no-contextual",
        "(?:stylistic|character-variant|swash|ornaments|annotation)\\([^)]*\\)",
        "small-caps|all-small-caps|petite-caps|all-petite-caps|unicase|titling-caps",
        "lining-nums|oldstyle-nums|proportional-nums|tabular-nums",
        "diagonal-fractions|stacked-fractions",
        "ordinal|slashed-zero",
        "jis78|jis83|jis90|jis04|simplified|traditional",
        "full-width|proportional-width",
        "ruby"
      ].join("|") + ")$"),
      weight: /^(?:normal|bold|bolder|lighter|[1-9]00|inherit|initial|unset)$/,
      stretch: new RegExp("^(?:" + [
        "normal",
        "(?:(?:ultra|extra|semi)-)?(?:condensed|expanded)",
        "inherit|initial|unset"
      ].join("|") + ")$"),
      size: new RegExp("^(?:" + [
        "xx-small|x-small|small|medium|large|x-large|xx-large|larger|smaller",
        "[\\d.]+%|[\\d.]+[a-z]+",
        "inherit|initial|unset"
      ].join("|") + ")(?:/(?:normal|[\\d.]+(?:%|[a-z]+)?))?$")
    };
    Styles = class _Styles {
      constructor(cssText = "") {
        this.parse(cssText);
      }
      sanitizeValue(text) {
        const PATTERN = this.constructor.pattern;
        if (!text.match(PATTERN.sanitize)) {
          return text;
        }
        text = text.replace(PATTERN.value, "$1");
        const test = text.replace(/\\./g, "").replace(/(['"]).*?\1/g, "").replace(/[^'"]/g, "");
        if (test.length) {
          text += test.charAt(0);
        }
        return text;
      }
      get cssText() {
        var _a2, _b2;
        const styles = [];
        for (const name of Object.keys(this.styles)) {
          const parent = this.parentName(name);
          const cname = name.replace(/.*-/, "");
          const pname = this.childName(this.parentName(parent), cname);
          if (this.styles[name] && !this.styles[pname] && (!this.styles[parent] || !((_b2 = (_a2 = _Styles.connect[parent]) === null || _a2 === void 0 ? void 0 : _a2.children) === null || _b2 === void 0 ? void 0 : _b2.includes(cname)))) {
            styles.push(`${name}: ${this.styles[name]};`);
          }
        }
        return styles.join(" ");
      }
      get styleList() {
        return Object.assign({}, this.styles);
      }
      set(name, value) {
        name = this.normalizeName(name);
        this.setStyle(name, String(value));
        const connect = _Styles.connect[name];
        if (connect === null || connect === void 0 ? void 0 : connect.subPart) {
          connect.combine.call(this, name);
          return;
        }
        this.combineParent(name);
        if (name.match(/-.*-/)) {
          const pname = name.replace(/-.*-/, "-");
          combineSame.call(this, pname);
        }
      }
      combineParent(name) {
        var _a2;
        while (name.match(/-/)) {
          const cname = name;
          name = this.parentName(name);
          const connect2 = _Styles.connect[name];
          if (!_Styles.connect[cname] && !((_a2 = connect2 === null || connect2 === void 0 ? void 0 : connect2.children) === null || _a2 === void 0 ? void 0 : _a2.includes(cname.substring(name.length + 1)))) {
            break;
          }
          connect2.combine.call(this, name);
        }
        if (!this.styles[name]) {
          return;
        }
        const connect = _Styles.connect[name];
        for (const cname of (connect === null || connect === void 0 ? void 0 : connect.parts) || []) {
          delete this.styles[this.childName(name, cname)];
        }
      }
      get(name) {
        name = this.normalizeName(name);
        return Object.hasOwn(this.styles, name) ? this.styles[name] : "";
      }
      setStyle(name, value) {
        var _a2;
        this.styles[name] = this.sanitizeValue(value);
        if ((_a2 = _Styles.connect[name]) === null || _a2 === void 0 ? void 0 : _a2.children) {
          _Styles.connect[name].split.call(this, name);
        }
        if (value === "") {
          delete this.styles[name];
        }
      }
      combineChildren(name) {
        const parent = this.parentName(name);
        for (const child of _Styles.connect[name].children) {
          const cname = this.childName(parent, child);
          _Styles.connect[cname].combine.call(this, cname);
        }
      }
      parentName(name) {
        const parent = name.replace(/-[^-]*$/, "");
        return name === parent ? "" : parent;
      }
      childName(name, child) {
        var _a2;
        if (child.match(/-/)) {
          return child;
        }
        if ((_a2 = _Styles.connect[name]) === null || _a2 === void 0 ? void 0 : _a2.subPart) {
          child += name.replace(/.*-/, "-");
          name = this.parentName(name);
        }
        return name + "-" + child;
      }
      normalizeName(name) {
        return name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
      }
      parse(cssText = "") {
        const PATTERN = this.constructor.pattern;
        this.styles = {};
        const parts = cssText.replace(/\n/g, " ").replace(PATTERN.comment, "").split(PATTERN.style);
        while (parts.length > 1) {
          const [space, name, value] = parts.splice(0, 3);
          if (space.match(/[^\s\n;]/))
            return;
          this.set(name, value);
        }
      }
    };
    Styles.pattern = {
      sanitize: /['";]/,
      value: /^((:?'(?:\\.|[^'])*(?:'|$)|"(?:\\.|[^"])*(?:"|$)|\n|\\.|[^'";])*?)[\s\n]*(?:;|$).*/,
      style: /([-a-z]+)[\s\n]*:[\s\n]*((?:'(?:\\.|[^'])*(?:'|$)|"(?:\\.|[^"])*(?:"|$)|\n|\\.|[^'";])*?)[\s\n]*(?:;|$)/g,
      comment: /\/\*[^]*?\*\//g
    };
    Styles.connect = {
      padding: {
        children: TRBL,
        split: splitTRBL,
        combine: combineTRBL
      },
      margin: {
        children: TRBL,
        split: splitTRBL,
        combine: combineTRBL
      },
      border: {
        children: TRBL,
        parts: WSC,
        split: splitSame,
        combine: combineSame
      },
      "border-top": {
        children: WSC,
        split: splitWSC,
        combine: combineWSC
      },
      "border-right": {
        children: WSC,
        split: splitWSC,
        combine: combineWSC
      },
      "border-bottom": {
        children: WSC,
        split: splitWSC,
        combine: combineWSC
      },
      "border-left": {
        children: WSC,
        split: splitWSC,
        combine: combineWSC
      },
      "border-width": {
        children: TRBL,
        split: splitTRBL,
        combine: combinePart,
        subPart: true
      },
      "border-style": {
        children: TRBL,
        split: splitTRBL,
        combine: combinePart,
        subPart: true
      },
      "border-color": {
        children: TRBL,
        split: splitTRBL,
        combine: combinePart,
        subPart: true
      },
      font: {
        children: [
          "style",
          "variant",
          "weight",
          "stretch",
          "line-height",
          "size",
          "family"
        ],
        split: splitFont,
        combine: combineFont
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/adaptors/liteAdaptor.js
function liteAdaptor(options3 = null) {
  return new LiteAdaptor(null, options3);
}
var __awaiter2;
var LiteBase;
var LiteAdaptor;
var init_liteAdaptor = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/liteAdaptor.js"() {
    init_DOMAdaptor();
    init_NodeMixin();
    init_Document();
    init_Element();
    init_Text();
    init_Window();
    init_Parser();
    init_Styles();
    __awaiter2 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    LiteBase = class extends AbstractDOMAdaptor {
      constructor() {
        super();
        this.parser = new LiteParser();
        this.window = new LiteWindow();
      }
      parse(text, format) {
        return this.parser.parseFromString(text, format, this);
      }
      create(kind, _ns = null) {
        return new LiteElement(kind);
      }
      text(text) {
        return new LiteText(text);
      }
      comment(text) {
        return new LiteComment(text);
      }
      createDocument() {
        return new LiteDocument();
      }
      head(doc = this.document) {
        return doc.head;
      }
      body(doc = this.document) {
        return doc.body;
      }
      root(doc = this.document) {
        return doc.root;
      }
      doctype(doc = this.document) {
        return doc.type;
      }
      tags(node, name, ns = null, stop = null) {
        let stack2 = [];
        const tags = [];
        if (ns) {
          return tags;
        }
        let n = node;
        while (n) {
          const kind = n.kind;
          if (kind !== "#text" && kind !== "#comment") {
            n = n;
            if (kind === name) {
              tags.push(n);
              if (tags.length === stop) {
                return tags;
              }
            }
            if (n.children.length) {
              stack2 = n.children.concat(stack2);
            }
          }
          n = stack2.shift();
        }
        return tags;
      }
      elementById(node, id) {
        let stack2 = [];
        let n = node;
        while (n) {
          if (n.kind !== "#text" && n.kind !== "#comment") {
            n = n;
            if (n.attributes["id"] === id) {
              return n;
            }
            if (n.children.length) {
              stack2 = n.children.concat(stack2);
            }
          }
          n = stack2.shift();
        }
        return null;
      }
      elementsByClass(node, name, stop = null) {
        let stack2 = [];
        const tags = [];
        let n = node;
        while (n) {
          if (n.kind !== "#text" && n.kind !== "#comment") {
            n = n;
            const classes = (n.attributes["class"] || "").trim().split(/ +/);
            if (classes.includes(name)) {
              tags.push(n);
              if (tags.length === stop) {
                return tags;
              }
            }
            if (n.children.length) {
              stack2 = n.children.concat(stack2);
            }
          }
          n = stack2.shift();
        }
        return tags;
      }
      elementsByAttribute(node, name, value, stop = null) {
        let stack2 = [];
        const tags = [];
        let n = node;
        while (n) {
          if (n.kind !== "#text" && n.kind !== "#comment") {
            n = n;
            const attribute = n.attributes[name];
            if (attribute === value) {
              tags.push(n);
              if (tags.length === stop) {
                return tags;
              }
            }
            if (n.children.length) {
              stack2 = n.children.concat(stack2);
            }
          }
          n = stack2.shift();
        }
        return tags;
      }
      getElements(nodes, document) {
        let containers = [];
        const body = this.body(document);
        for (const node of nodes) {
          if (typeof node === "string") {
            if (node.charAt(0) === "#") {
              const n = this.elementById(body, node.slice(1));
              if (n) {
                containers.push(n);
              }
            } else if (node.charAt(0) === ".") {
              containers = containers.concat(this.elementsByClass(body, node.slice(1)));
            } else if (node.match(/^[-a-z][-a-z0-9]*$/i)) {
              containers = containers.concat(this.tags(body, node));
            } else {
              const match = node.match(/^\[(.*?)="(.*?)"\]$/);
              if (match) {
                containers = containers.concat(this.elementsByAttribute(body, match[1], match[2]));
              }
            }
          } else if (Array.isArray(node)) {
            containers = containers.concat(node);
          } else if (node instanceof this.window.NodeList || node instanceof this.window.HTMLCollection) {
            containers = containers.concat(node.nodes);
          } else {
            containers.push(node);
          }
        }
        return containers;
      }
      getElement(selector, node = this.document) {
        if (node instanceof LiteDocument) {
          node = this.body(node);
        }
        if (selector.charAt(0) === "#") {
          return this.elementById(node, selector.slice(1));
        }
        if (selector.charAt(0) === ".") {
          return this.elementsByClass(node, selector.slice(1), 1)[0];
        }
        if (selector.match(/^[-a-z][-a-z0-9]*$/i)) {
          return this.tags(node, selector, null, 1)[0];
        }
        const match = selector.match(/^\[(.*?)="(.*?)"\]$/);
        if (match) {
          return this.elementsByAttribute(node, match[1], match[2], 1)[0];
        }
        return null;
      }
      contains(container, node) {
        while (node && node !== container) {
          node = this.parent(node);
        }
        return !!node;
      }
      parent(node) {
        return node.parent;
      }
      childIndex(node) {
        return node.parent ? node.parent.children.findIndex((n) => n === node) : -1;
      }
      append(node, child) {
        if (child.parent) {
          this.remove(child);
        }
        node.children.push(child);
        child.parent = node;
        return child;
      }
      insert(nchild, ochild) {
        if (nchild.parent) {
          this.remove(nchild);
        }
        if (ochild && ochild.parent) {
          const i2 = this.childIndex(ochild);
          ochild.parent.children.splice(i2, 0, nchild);
          nchild.parent = ochild.parent;
        }
      }
      remove(child) {
        const i2 = this.childIndex(child);
        if (i2 >= 0) {
          child.parent.children.splice(i2, 1);
        }
        child.parent = null;
        return child;
      }
      replace(nnode, onode) {
        const i2 = this.childIndex(onode);
        if (i2 >= 0) {
          onode.parent.children[i2] = nnode;
          nnode.parent = onode.parent;
          onode.parent = null;
        }
        return onode;
      }
      clone(node, deep = true) {
        const nnode = new LiteElement(node.kind);
        nnode.attributes = Object.assign({}, node.attributes);
        nnode.children = !deep ? [] : node.children.map((n) => {
          if (n.kind === "#text") {
            return new LiteText(n.value);
          } else if (n.kind === "#comment") {
            return new LiteComment(n.value);
          } else {
            const m = this.clone(n);
            m.parent = nnode;
            return m;
          }
        });
        return nnode;
      }
      split(node, n) {
        const text = new LiteText(node.value.slice(n));
        node.value = node.value.slice(0, n);
        node.parent.children.splice(this.childIndex(node) + 1, 0, text);
        text.parent = node.parent;
        return text;
      }
      next(node) {
        const parent = node.parent;
        if (!parent)
          return null;
        const i2 = this.childIndex(node) + 1;
        return i2 >= 0 && i2 < parent.children.length ? parent.children[i2] : null;
      }
      previous(node) {
        const parent = node.parent;
        if (!parent)
          return null;
        const i2 = this.childIndex(node) - 1;
        return i2 >= 0 ? parent.children[i2] : null;
      }
      firstChild(node) {
        return node.children[0];
      }
      lastChild(node) {
        return node.children[node.children.length - 1];
      }
      childNodes(node) {
        return [...node.children];
      }
      childNode(node, i2) {
        return node.children[i2];
      }
      kind(node) {
        return node.kind;
      }
      value(node) {
        return node.kind === "#text" ? node.value : node.kind === "#comment" ? node.value.replace(/^<!(--)?((?:.|\n)*)\1>$/, "$2") : "";
      }
      textContent(node) {
        return node.children.reduce((s, n) => {
          return s + (n.kind === "#text" ? n.value : n.kind === "#comment" ? "" : this.textContent(n));
        }, "");
      }
      innerHTML(node) {
        return this.parser.serializeInner(this, node);
      }
      outerHTML(node) {
        return this.parser.serialize(this, node);
      }
      serializeXML(node) {
        return this.parser.serialize(this, node, true);
      }
      setAttribute(node, name, value, ns = null) {
        if (typeof value !== "string") {
          value = String(value);
        }
        if (ns) {
          name = ns.replace(/.*\//, "") + ":" + name.replace(/^.*:/, "");
        }
        node.attributes[name] = value;
        if (name === "style") {
          node.styles = null;
        }
      }
      getAttribute(node, name) {
        return node.attributes[name];
      }
      removeAttribute(node, name) {
        delete node.attributes[name];
      }
      hasAttribute(node, name) {
        return Object.hasOwn(node.attributes, name);
      }
      allAttributes(node) {
        const attributes = node.attributes;
        const list3 = [];
        for (const name of Object.keys(attributes)) {
          list3.push({ name, value: attributes[name] });
        }
        return list3;
      }
      addClass(node, name) {
        const classString = node.attributes["class"];
        const classes = (classString === null || classString === void 0 ? void 0 : classString.split(/ /)) || [];
        if (!classes.includes(name)) {
          classes.push(name);
          node.attributes["class"] = classes.join(" ");
        }
      }
      removeClass(node, name) {
        const classString = node.attributes["class"];
        const classes = (classString === null || classString === void 0 ? void 0 : classString.split(/ /)) || [];
        const i2 = classes.indexOf(name);
        if (i2 >= 0) {
          classes.splice(i2, 1);
          node.attributes["class"] = classes.join(" ");
        }
      }
      hasClass(node, name) {
        const classes = (node.attributes["class"] || "").split(/ /);
        return classes.includes(name);
      }
      setStyle(node, name, value) {
        if (!node.styles) {
          node.styles = new Styles(this.getAttribute(node, "style"));
        }
        node.styles.set(name, value);
        node.attributes["style"] = node.styles.cssText;
      }
      getStyle(node, name) {
        if (!node.styles) {
          const style = this.getAttribute(node, "style");
          if (!style) {
            return "";
          }
          node.styles = new Styles(style);
        }
        return node.styles.get(name);
      }
      allStyles(node) {
        return this.getAttribute(node, "style");
      }
      insertRules(node, rules) {
        node.children = [
          this.text(this.textContent(node) + "\n\n" + rules.join("\n\n"))
        ];
      }
      fontSize(_node) {
        return 0;
      }
      fontFamily(_node) {
        return "";
      }
      nodeSize(_node, _em = 1, _local = null) {
        return [0, 0];
      }
      nodeBBox(_node) {
        return { left: 0, right: 0, top: 0, bottom: 0 };
      }
      createWorker() {
        return __awaiter2(this, void 0, void 0, function* () {
          return null;
        });
      }
    };
    LiteAdaptor = class extends NodeMixin(LiteBase) {
    };
  }
});
// node_modules/@mathjax/src/mjs/core/MathItem.js
function protoItem(open, math, close, n, start, end, display = null) {
  const item = {
    open,
    math,
    close,
    n,
    start: { n: start },
    end: { n: end },
    display
  };
  return item;
}
function newState(name, state) {
  if (name in STATE) {
    throw Error("State " + name + " already exists");
  }
  STATE[name] = state;
}
var AbstractMathItem;
var STATE;
var init_MathItem = __esm({
  "node_modules/@mathjax/src/mjs/core/MathItem.js"() {
    AbstractMathItem = class {
      get isEscaped() {
        return this.display === null;
      }
      constructor(math, jax, display = true, start = { i: 0, n: 0, delim: "" }, end = { i: 0, n: 0, delim: "" }) {
        this.root = null;
        this.typesetRoot = null;
        this.metrics = {};
        this.inputData = {};
        this.outputData = {};
        this._state = STATE.UNPROCESSED;
        this.math = math;
        this.inputJax = jax;
        this.display = display;
        this.start = start;
        this.end = end;
        this.root = null;
        this.typesetRoot = null;
        this.metrics = {};
        this.inputData = {};
        this.outputData = {};
      }
      render(document) {
        document.renderActions.renderMath(this, document);
      }
      rerender(document, start = STATE.RERENDER) {
        if (this.state() >= start) {
          this.state(start - 1);
        }
        document.renderActions.renderMath(this, document, start);
      }
      convert(document, end = STATE.LAST) {
        document.renderActions.renderConvert(this, document, end);
      }
      compile(document) {
        if (this.state() < STATE.COMPILED) {
          this.root = this.inputJax.compile(this, document);
          this.state(STATE.COMPILED);
        }
      }
      typeset(document) {
        if (this.state() < STATE.TYPESET) {
          this.typesetRoot = document.outputJax[this.isEscaped ? "escaped" : "typeset"](this, document);
          this.state(STATE.TYPESET);
        }
      }
      updateDocument(_document) {
      }
      removeFromDocument(_restore = false) {
        this.clear();
      }
      setMetrics(em2, ex, cwidth, scale2) {
        this.metrics = {
          em: em2,
          ex,
          containerWidth: cwidth,
          scale: scale2
        };
      }
      state(state = null, restore = false) {
        if (state != null) {
          if (state < STATE.INSERTED && this._state >= STATE.INSERTED) {
            this.removeFromDocument(restore);
          }
          if (state < STATE.TYPESET && this._state >= STATE.TYPESET) {
            this.outputData = {};
          }
          if (state < STATE.COMPILED && this._state >= STATE.COMPILED) {
            this.inputData = {};
          }
          this._state = state;
        }
        return this._state;
      }
      reset(restore = false) {
        this.state(STATE.UNPROCESSED, restore);
      }
      clear() {
      }
    };
    STATE = {
      UNPROCESSED: 0,
      FINDMATH: 10,
      COMPILED: 20,
      CONVERT: 100,
      METRICS: 110,
      RERENDER: 125,
      TYPESET: 150,
      INSERTED: 200,
      LAST: 1e4
    };
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/Attributes.js
var INHERIT;
var Attributes;
var init_Attributes = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/Attributes.js"() {
    INHERIT = "_inherit_";
    Attributes = class {
      constructor(defaults, global) {
        this.global = global;
        this.defaults = Object.create(global);
        this.inherited = Object.create(this.defaults);
        this.attributes = Object.create(this.inherited);
        Object.assign(this.defaults, defaults);
      }
      set(name, value) {
        this.attributes[name] = value;
      }
      setList(list3) {
        Object.assign(this.attributes, list3);
      }
      unset(name) {
        delete this.attributes[name];
      }
      get(name) {
        let value = this.attributes[name];
        if (value === INHERIT) {
          value = this.global[name];
        }
        return value;
      }
      getExplicit(name) {
        return this.hasExplicit(name) ? this.attributes[name] : void 0;
      }
      hasExplicit(name) {
        return Object.hasOwn(this.attributes, name);
      }
      hasOneOf(names) {
        for (const name of names) {
          if (this.hasExplicit(name)) {
            return true;
          }
        }
        return false;
      }
      getList(...names) {
        const values = {};
        for (const name of names) {
          values[name] = this.get(name);
        }
        return values;
      }
      setInherited(name, value) {
        this.inherited[name] = value;
      }
      getInherited(name) {
        return this.inherited[name];
      }
      getDefault(name) {
        return this.defaults[name];
      }
      isSet(name) {
        return Object.hasOwn(this.attributes, name) || Object.hasOwn(this.inherited, name);
      }
      hasDefault(name) {
        return name in this.defaults;
      }
      getExplicitNames() {
        return Object.keys(this.attributes);
      }
      getInheritedNames() {
        return Object.keys(this.inherited);
      }
      getDefaultNames() {
        return Object.keys(this.defaults);
      }
      getGlobalNames() {
        return Object.keys(this.global);
      }
      getAllAttributes() {
        return this.attributes;
      }
      getAllInherited() {
        return this.inherited;
      }
      getAllDefaults() {
        return this.defaults;
      }
      getAllGlobals() {
        return this.global;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/core/Tree/Node.js
var AbstractNode;
var AbstractEmptyNode;
var init_Node = __esm({
  "node_modules/@mathjax/src/mjs/core/Tree/Node.js"() {
    AbstractNode = class {
      constructor(factory, properties = {}, children = []) {
        this.factory = factory;
        this.parent = null;
        this.properties = {};
        this.childNodes = [];
        for (const name of Object.keys(properties)) {
          this.setProperty(name, properties[name]);
        }
        if (children.length) {
          this.setChildren(children);
        }
      }
      get kind() {
        return "unknown";
      }
      setProperty(name, value) {
        this.properties[name] = value;
      }
      getProperty(name) {
        return this.properties[name];
      }
      getPropertyNames() {
        return Object.keys(this.properties);
      }
      getAllProperties() {
        return this.properties;
      }
      removeProperty(...names) {
        for (const name of names) {
          delete this.properties[name];
        }
      }
      isKind(kind) {
        return this.factory.nodeIsKind(this, kind);
      }
      setChildren(children) {
        this.childNodes = [];
        for (const child of children) {
          this.appendChild(child);
        }
      }
      appendChild(child) {
        this.childNodes.push(child);
        child.parent = this;
        return child;
      }
      replaceChild(newChild, oldChild) {
        const i2 = this.childIndex(oldChild);
        if (i2 !== null) {
          this.childNodes[i2] = newChild;
          newChild.parent = this;
          if (oldChild.parent === this) {
            oldChild.parent = null;
          }
        }
        return newChild;
      }
      removeChild(child) {
        const i2 = this.childIndex(child);
        if (i2 !== null) {
          this.childNodes.splice(i2, 1);
          child.parent = null;
        }
        return child;
      }
      childIndex(node) {
        const i2 = this.childNodes.indexOf(node);
        return i2 === -1 ? null : i2;
      }
      copy() {
        const node = this.factory.create(this.kind);
        node.properties = Object.assign({}, this.properties);
        for (const child of this.childNodes || []) {
          if (child) {
            node.appendChild(child.copy());
          }
        }
        return node;
      }
      findNodes(kind) {
        const nodes = [];
        this.walkTree((node) => {
          if (node.isKind(kind)) {
            nodes.push(node);
          }
        });
        return nodes;
      }
      walkTree(func, data) {
        func(this, data);
        for (const child of this.childNodes) {
          if (child) {
            child.walkTree(func, data);
          }
        }
        return data;
      }
      toString() {
        return this.kind + "(" + this.childNodes.join(",") + ")";
      }
    };
    AbstractEmptyNode = class extends AbstractNode {
      setChildren(_children) {
      }
      appendChild(child) {
        return child;
      }
      replaceChild(_newChild, oldChild) {
        return oldChild;
      }
      childIndex(_node) {
        return null;
      }
      walkTree(func, data) {
        func(this, data);
        return data;
      }
      toString() {
        return this.kind;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNode.js
var TEXCLASS;
var TEXCLASSNAMES;
var TEXSPACELENGTH;
var TEXSPACE;
var MATHVARIANTS;
var indentAttributes;
var AbstractMmlNode;
var AbstractMmlTokenNode;
var AbstractMmlLayoutNode;
var AbstractMmlBaseNode;
var AbstractMmlEmptyNode;
var TextNode;
var XMLNode;
var init_MmlNode = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNode.js"() {
    init_Attributes();
    init_Node();
    TEXCLASS = {
      ORD: 0,
      OP: 1,
      BIN: 2,
      REL: 3,
      OPEN: 4,
      CLOSE: 5,
      PUNCT: 6,
      INNER: 7,
      NONE: -1
    };
    TEXCLASSNAMES = [
      "ORD",
      "OP",
      "BIN",
      "REL",
      "OPEN",
      "CLOSE",
      "PUNCT",
      "INNER"
    ];
    TEXSPACELENGTH = [
      "",
      "thinmathspace",
      "mediummathspace",
      "thickmathspace"
    ];
    TEXSPACE = JSON.parse(`[[0,-1,2,3,0,0,0,1],[-1,-1,0,3,0,0,0,1],[2,2,0,0,2,0,0,2],[3,3,0,0,3,0,0,3],[0,0,0,0,0,0,0,0],[0,-1,2,3,0,0,0,1],[1,1,0,1,1,1,1,1],[1,-1,2,3,1,0,1,1]]`);
    MATHVARIANTS = /* @__PURE__ */ new Set([
      "normal",
      "bold",
      "italic",
      "bold-italic",
      "double-struck",
      "fraktur",
      "bold-fraktur",
      "script",
      "bold-script",
      "sans-serif",
      "bold-sans-serif",
      "sans-serif-italic",
      "sans-serif-bold-italic",
      "monospace",
      "inital",
      "tailed",
      "looped",
      "stretched"
    ]);
    indentAttributes = [
      "indentalign",
      "indentalignfirst",
      "indentshift",
      "indentshiftfirst"
    ];
    AbstractMmlNode = class _AbstractMmlNode extends AbstractNode {
      constructor(factory, attributes = {}, children = []) {
        super(factory);
        this.prevClass = null;
        this.prevLevel = null;
        this.texclass = null;
        if (this.arity < 0) {
          this.childNodes = [factory.create("inferredMrow")];
          this.childNodes[0].parent = this;
        }
        this.setChildren(children);
        this.attributes = new Attributes(factory.getNodeClass(this.kind).defaults, factory.getNodeClass("math").defaults);
        this.attributes.setList(attributes);
      }
      copy(keepIds = false) {
        const node = this.factory.create(this.kind);
        node.properties = Object.assign({}, this.properties);
        if (this.attributes) {
          const attributes = this.attributes.getAllAttributes();
          for (const name of Object.keys(attributes)) {
            if (name !== "id" || keepIds) {
              node.attributes.set(name, attributes[name]);
            }
          }
        }
        if (this.childNodes && this.childNodes.length) {
          let children = this.childNodes;
          if (children.length === 1 && children[0].isInferred) {
            children = children[0].childNodes;
          }
          for (const child of children) {
            if (child) {
              node.appendChild(child.copy());
            } else {
              node.childNodes.push(null);
            }
          }
        }
        return node;
      }
      get texClass() {
        return this.texclass;
      }
      set texClass(texClass) {
        this.texclass = texClass;
      }
      get isToken() {
        return false;
      }
      get isEmbellished() {
        return false;
      }
      get isSpacelike() {
        return false;
      }
      get linebreakContainer() {
        return false;
      }
      get linebreakAlign() {
        return "data-align";
      }
      get isEmpty() {
        for (const child of this.childNodes) {
          if (child && !child.isEmpty)
            return false;
        }
        return true;
      }
      get arity() {
        return Infinity;
      }
      get isInferred() {
        return false;
      }
      get Parent() {
        let parent = this.parent;
        while (parent && parent.notParent) {
          parent = parent.Parent;
        }
        return parent;
      }
      get notParent() {
        return false;
      }
      setChildren(children) {
        if (this.arity < 0) {
          return this.childNodes[0].setChildren(children);
        }
        return super.setChildren(children);
      }
      appendChild(child) {
        if (this.arity < 0) {
          this.childNodes[0].appendChild(child);
          return child;
        }
        if (child.isInferred) {
          if (this.arity === Infinity) {
            child.childNodes.forEach((node) => super.appendChild(node));
            return child;
          }
          const original = child;
          child = this.factory.create("mrow");
          child.setChildren(original.childNodes);
          child.attributes = original.attributes;
          for (const name of original.getPropertyNames()) {
            child.setProperty(name, original.getProperty(name));
          }
        }
        return super.appendChild(child);
      }
      replaceChild(newChild, oldChild) {
        if (this.arity < 0) {
          this.childNodes[0].replaceChild(newChild, oldChild);
          return newChild;
        }
        return super.replaceChild(newChild, oldChild);
      }
      core() {
        return this;
      }
      coreMO() {
        return this;
      }
      coreIndex() {
        return 0;
      }
      childPosition() {
        let child = null;
        let parent = this.parent;
        while (parent && parent.notParent) {
          child = parent;
          parent = parent.parent;
        }
        child = child || this;
        if (parent) {
          let i2 = 0;
          for (const node of parent.childNodes) {
            if (node === child) {
              return i2;
            }
            i2++;
          }
        }
        return null;
      }
      setTeXclass(prev) {
        this.getPrevClass(prev);
        return this.texClass != null ? this : prev;
      }
      updateTeXclass(core) {
        if (core) {
          this.prevClass = core.prevClass;
          this.prevLevel = core.prevLevel;
          core.prevClass = core.prevLevel = null;
          this.texClass = core.texClass;
        }
      }
      getPrevClass(prev) {
        if (prev) {
          this.prevClass = prev.texClass;
          this.prevLevel = prev.attributes.get("scriptlevel");
        }
      }
      texSpacing() {
        const prevClass = this.prevClass != null ? this.prevClass : TEXCLASS.NONE;
        const texClass = this.texClass || TEXCLASS.ORD;
        if (prevClass === TEXCLASS.NONE || texClass === TEXCLASS.NONE) {
          return "";
        }
        const space = TEXSPACE[prevClass][texClass];
        if ((this.prevLevel > 0 || this.attributes.get("scriptlevel") > 0) && space >= 0) {
          return "";
        }
        return TEXSPACELENGTH[Math.abs(space)];
      }
      hasSpacingAttributes() {
        return this.isEmbellished && this.coreMO().hasSpacingAttributes();
      }
      setInheritedAttributes(attributes = {}, display = false, level = 0, prime = false) {
        var _a2, _b2, _c;
        const defaults = this.attributes.getAllDefaults();
        for (const key of Object.keys(attributes)) {
          if (Object.hasOwn(defaults, key) || Object.hasOwn(_AbstractMmlNode.alwaysInherit, key)) {
            const [node, value] = attributes[key];
            if (!((_b2 = (_a2 = _AbstractMmlNode.noInherit[node]) === null || _a2 === void 0 ? void 0 : _a2[this.kind]) === null || _b2 === void 0 ? void 0 : _b2[key])) {
              this.attributes.setInherited(key, value);
            }
          }
          if ((_c = _AbstractMmlNode.stopInherit[this.kind]) === null || _c === void 0 ? void 0 : _c[key]) {
            attributes = Object.assign({}, attributes);
            delete attributes[key];
          }
        }
        const displaystyle = this.attributes.getExplicit("displaystyle");
        if (displaystyle === void 0) {
          this.attributes.setInherited("displaystyle", display);
        }
        const scriptlevel = this.attributes.getExplicit("scriptlevel");
        if (scriptlevel === void 0) {
          this.attributes.setInherited("scriptlevel", level);
        }
        if (prime) {
          this.setProperty("texprimestyle", prime);
        }
        const arity = this.arity;
        if (arity >= 0 && arity !== Infinity && (arity === 1 && this.childNodes.length === 0 || arity !== 1 && this.childNodes.length !== arity)) {
          if (arity < this.childNodes.length) {
            this.childNodes = this.childNodes.slice(0, arity);
          } else {
            while (this.childNodes.length < arity) {
              this.appendChild(this.factory.create("mrow"));
            }
          }
        }
        if (this.linebreakContainer && !this.isEmbellished) {
          const align = this.linebreakAlign;
          if (align) {
            const indentalign = this.attributes.get(align) || "left";
            attributes = this.addInheritedAttributes(attributes, {
              indentalign,
              indentshift: "0",
              indentalignfirst: indentalign,
              indentshiftfirst: "0",
              indentalignlast: "indentalign",
              indentshiftlast: "indentshift"
            });
          }
        }
        this.setChildInheritedAttributes(attributes, display, level, prime);
      }
      setChildInheritedAttributes(attributes, display, level, prime) {
        for (const child of this.childNodes) {
          child.setInheritedAttributes(attributes, display, level, prime);
        }
      }
      addInheritedAttributes(current, attributes) {
        const updated = Object.assign({}, current);
        for (const name of Object.keys(attributes)) {
          if (name !== "displaystyle" && name !== "scriptlevel" && name !== "style") {
            updated[name] = [this.kind, attributes[name]];
          }
        }
        return updated;
      }
      inheritAttributesFrom(node) {
        const attributes = node.attributes;
        const display = attributes.get("displaystyle");
        const scriptlevel = attributes.get("scriptlevel");
        const defaults = !attributes.isSet("mathsize") ? {} : { mathsize: ["math", attributes.get("mathsize")] };
        const prime = node.getProperty("texprimestyle") || false;
        this.setInheritedAttributes(defaults, display, scriptlevel, prime);
      }
      verifyTree(options3 = null) {
        if (options3 === null) {
          return;
        }
        this.verifyAttributes(options3);
        const arity = this.arity;
        if (options3["checkArity"]) {
          if (arity >= 0 && arity !== Infinity && (arity === 1 && this.childNodes.length === 0 || arity !== 1 && this.childNodes.length !== arity)) {
            this.mError('Wrong number of children for "' + this.kind + '" node', options3, true);
          }
        }
        this.verifyChildren(options3);
      }
      verifyAttributes(options3) {
        if (options3.checkAttributes) {
          const attributes = this.attributes;
          const bad = [];
          for (const name of attributes.getExplicitNames()) {
            if (name.substring(0, 5) !== "data-" && attributes.getDefault(name) === void 0 && !name.match(/^(?:class|style|id|(?:xlink:)?href)$/)) {
              bad.push(name);
            }
          }
          if (bad.length) {
            this.mError("Unknown attributes for " + this.kind + " node: " + bad.join(", "), options3);
          }
        }
        if (options3.checkMathvariants) {
          const variant = this.attributes.getExplicit("mathvariant");
          if (variant && !MATHVARIANTS.has(variant) && !this.getProperty("ignore-variant")) {
            this.mError(`Invalid mathvariant: ${variant}`, options3, true);
          }
        }
      }
      verifyChildren(options3) {
        for (const child of this.childNodes) {
          child.verifyTree(options3);
        }
      }
      mError(message, options3, short = false) {
        if (this.parent && this.parent.isKind("merror")) {
          return null;
        }
        const merror = this.factory.create("merror");
        merror.attributes.set("data-mjx-message", message);
        if (options3.fullErrors || short) {
          const mtext = this.factory.create("mtext");
          const text = this.factory.create("text");
          text.setText(options3.fullErrors ? message : this.kind);
          mtext.appendChild(text);
          merror.appendChild(mtext);
          this.parent.replaceChild(merror, this);
          if (!options3.fullErrors) {
            merror.attributes.set("title", message);
          }
        } else {
          this.parent.replaceChild(merror, this);
          merror.appendChild(this);
        }
        return merror;
      }
    };
    AbstractMmlNode.defaults = {
      mathbackground: INHERIT,
      mathcolor: INHERIT,
      mathsize: INHERIT,
      dir: INHERIT
    };
    AbstractMmlNode.noInherit = JSON.parse(`{
 "mstyle":{"mpadded":{"width":true,"height":true,"depth":true,"lspace":true,"voffset":true},"mtable":{"width":true,"height":true,"depth":true,"align":true}},
 "maligngroup":{"mrow":{"groupalign":true},"mtable":{"groupalign":true}},
 "mtr":{"msqrt":{"data-vertical-align":true},"mroot":{"data-vertical-align":true}},
 "mlabeledtr":{"msqrt":{"data-vertical-align":true},"mroot":{"data-vertical-align":true}}
}`);
    AbstractMmlNode.stopInherit = {
      mtd: { columnalign: true, rowalign: true, groupalign: true }
    };
    AbstractMmlNode.alwaysInherit = {
      scriptminsize: true,
      scriptsizemultiplier: true,
      infixlinebreakstyle: true
    };
    AbstractMmlNode.verifyDefaults = {
      checkArity: true,
      checkAttributes: false,
      checkMathvariants: true,
      fullErrors: false,
      fixMmultiscripts: true,
      fixMtables: true
    };
    AbstractMmlTokenNode = class extends AbstractMmlNode {
      get isToken() {
        return true;
      }
      get isEmpty() {
        for (const child of this.childNodes) {
          if (!(child instanceof TextNode) || child.getText().length) {
            return false;
          }
        }
        return true;
      }
      getText() {
        let text = "";
        for (const child of this.childNodes) {
          if (child instanceof TextNode) {
            text += child.getText();
          } else if ("textContent" in child) {
            text += child.textContent();
          }
        }
        return text;
      }
      setChildInheritedAttributes(attributes, display, level, prime) {
        for (const child of this.childNodes) {
          if (child instanceof AbstractMmlNode) {
            child.setInheritedAttributes(attributes, display, level, prime);
          }
        }
      }
      walkTree(func, data) {
        func(this, data);
        for (const child of this.childNodes) {
          if (child instanceof AbstractMmlNode) {
            child.walkTree(func, data);
          }
        }
        return data;
      }
    };
    AbstractMmlTokenNode.defaults = Object.assign(Object.assign({}, AbstractMmlNode.defaults), { mathvariant: "normal", mathsize: INHERIT });
    AbstractMmlLayoutNode = class extends AbstractMmlNode {
      get isSpacelike() {
        return this.childNodes[0].isSpacelike;
      }
      get isEmbellished() {
        return this.childNodes[0].isEmbellished;
      }
      get arity() {
        return -1;
      }
      core() {
        return this.childNodes[0];
      }
      coreMO() {
        return this.childNodes[0].coreMO();
      }
      setTeXclass(prev) {
        prev = this.childNodes[0].setTeXclass(prev);
        this.updateTeXclass(this.childNodes[0]);
        return prev;
      }
    };
    AbstractMmlLayoutNode.defaults = AbstractMmlNode.defaults;
    AbstractMmlBaseNode = class extends AbstractMmlNode {
      get isEmbellished() {
        return this.childNodes[0].isEmbellished;
      }
      core() {
        return this.childNodes[0];
      }
      coreMO() {
        return this.childNodes[0].coreMO();
      }
      setTeXclass(prev) {
        this.getPrevClass(prev);
        this.texClass = TEXCLASS.ORD;
        const base = this.childNodes[0];
        let result = null;
        if (base) {
          if (this.isEmbellished || base.isKind("mi")) {
            result = base.setTeXclass(prev);
            this.updateTeXclass(this.core());
          } else {
            base.setTeXclass(null);
            if (base.isKind("TeXAtom")) {
              this.texClass = base.texClass;
            }
          }
        }
        for (const child of this.childNodes.slice(1)) {
          if (child) {
            child.setTeXclass(null);
          }
        }
        return result || this;
      }
    };
    AbstractMmlBaseNode.defaults = AbstractMmlNode.defaults;
    AbstractMmlEmptyNode = class extends AbstractEmptyNode {
      get isToken() {
        return false;
      }
      get isEmpty() {
        return true;
      }
      get isEmbellished() {
        return false;
      }
      get isSpacelike() {
        return false;
      }
      get linebreakContainer() {
        return false;
      }
      get linebreakAlign() {
        return "";
      }
      get arity() {
        return 0;
      }
      get isInferred() {
        return false;
      }
      get notParent() {
        return false;
      }
      get Parent() {
        return this.parent;
      }
      get texClass() {
        return TEXCLASS.NONE;
      }
      get prevClass() {
        return TEXCLASS.NONE;
      }
      get prevLevel() {
        return 0;
      }
      hasSpacingAttributes() {
        return false;
      }
      get attributes() {
        return null;
      }
      core() {
        return this;
      }
      coreMO() {
        return this;
      }
      coreIndex() {
        return 0;
      }
      childPosition() {
        return 0;
      }
      setTeXclass(prev) {
        return prev;
      }
      texSpacing() {
        return "";
      }
      setInheritedAttributes(_attributes, _display, _level, _prime) {
      }
      inheritAttributesFrom(_node) {
      }
      verifyTree(_options) {
      }
      mError(_message, _options, _short = false) {
        return null;
      }
    };
    TextNode = class extends AbstractMmlEmptyNode {
      constructor() {
        super(...arguments);
        this.text = "";
      }
      get kind() {
        return "text";
      }
      getText() {
        return this.text;
      }
      setText(text) {
        this.text = text;
        return this;
      }
      copy() {
        return this.factory.create(this.kind).setText(this.getText());
      }
      toString() {
        return this.text;
      }
    };
    XMLNode = class extends AbstractMmlEmptyNode {
      constructor() {
        super(...arguments);
        this.xml = null;
        this.adaptor = null;
      }
      get kind() {
        return "XML";
      }
      getXML() {
        return this.xml;
      }
      setXML(xml, adaptor = null) {
        this.xml = xml;
        this.adaptor = adaptor;
        return this;
      }
      getSerializedXML() {
        return this.adaptor.serializeXML(this.xml);
      }
      copy() {
        return this.factory.create(this.kind).setXML(this.adaptor.clone(this.xml));
      }
      toString() {
        return "XML data";
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/math.js
var MmlMath;
var init_math = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/math.js"() {
    init_MmlNode();
    MmlMath = class extends AbstractMmlLayoutNode {
      get kind() {
        return "math";
      }
      get linebreakContainer() {
        return true;
      }
      get linebreakAlign() {
        return "";
      }
      setChildInheritedAttributes(attributes, display, level, prime) {
        if (this.attributes.get("mode") === "display") {
          this.attributes.setInherited("display", "block");
        }
        attributes = this.addInheritedAttributes(attributes, this.attributes.getAllAttributes());
        display = !!this.attributes.get("displaystyle") || !this.attributes.get("displaystyle") && this.attributes.get("display") === "block";
        this.attributes.setInherited("displaystyle", display);
        level = this.attributes.get("scriptlevel") || this.constructor.defaults["scriptlevel"];
        super.setChildInheritedAttributes(attributes, display, level, prime);
      }
      verifyTree(options3 = null) {
        super.verifyTree(options3);
        if (this.parent) {
          this.mError("Improper nesting of math tags", options3, true);
        }
      }
    };
    MmlMath.defaults = Object.assign(Object.assign({}, AbstractMmlLayoutNode.defaults), { mathvariant: "normal", mathsize: "normal", mathcolor: "", mathbackground: "transparent", dir: "ltr", scriptlevel: 0, displaystyle: false, display: "inline", maxwidth: "", overflow: "linebreak", altimg: "", "altimg-width": "", "altimg-height": "", "altimg-valign": "", alttext: "", cdgroup: "", scriptsizemultiplier: 1 / Math.sqrt(2), scriptminsize: ".4em", infixlinebreakstyle: "before", lineleading: "100%", linebreakmultchar: "\u2062", indentshift: "auto", indentalign: "auto", indenttarget: "", indentalignfirst: "indentalign", indentshiftfirst: "indentshift", indentalignlast: "indentalign", indentshiftlast: "indentshift" });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mi.js
var MmlMi;
var init_mi = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mi.js"() {
    init_MmlNode();
    MmlMi = class _MmlMi extends AbstractMmlTokenNode {
      constructor() {
        super(...arguments);
        this.texclass = TEXCLASS.ORD;
      }
      get kind() {
        return "mi";
      }
      setInheritedAttributes(attributes = {}, display = false, level = 0, prime = false) {
        super.setInheritedAttributes(attributes, display, level, prime);
        const text = this.getText();
        if (text.match(_MmlMi.singleCharacter) && !attributes.mathvariant) {
          this.attributes.setInherited("mathvariant", "italic");
        }
      }
      setTeXclass(prev) {
        this.getPrevClass(prev);
        const name = this.getText();
        if (name.length > 1 && name.match(_MmlMi.operatorName) && this.attributes.get("mathvariant") === "normal" && this.getProperty("autoOP") === void 0 && this.getProperty("texClass") === void 0) {
          this.texClass = TEXCLASS.OP;
          this.setProperty("autoOP", true);
        }
        return this;
      }
    };
    MmlMi.defaults = Object.assign({}, AbstractMmlTokenNode.defaults);
    MmlMi.operatorName = /^[a-z][a-z0-9]*$/i;
    MmlMi.singleCharacter = /^[\uD800-\uDBFF]?.[\u0300-\u036F\u1AB0-\u1ABE\u1DC0-\u1DFF\u20D0-\u20EF]*$/;
  }
});
// node_modules/@mathjax/src/mjs/core/Tree/Factory.js
var AbstractFactory;
var init_Factory = __esm({
  "node_modules/@mathjax/src/mjs/core/Tree/Factory.js"() {
    AbstractFactory = class {
      constructor(nodes = null) {
        this.defaultKind = "unknown";
        this.nodeMap = /* @__PURE__ */ new Map();
        this.node = {};
        if (nodes === null) {
          nodes = this.constructor.defaultNodes;
        }
        for (const kind of Object.keys(nodes)) {
          this.setNodeClass(kind, nodes[kind]);
        }
      }
      create(kind, ...args) {
        return (this.node[kind] || this.node[this.defaultKind])(...args);
      }
      setNodeClass(kind, nodeClass) {
        this.nodeMap.set(kind, nodeClass);
        const KIND = this.nodeMap.get(kind);
        this.node[kind] = (...args) => {
          return new KIND(this, ...args);
        };
      }
      getNodeClass(kind) {
        return this.nodeMap.get(kind);
      }
      deleteNodeClass(kind) {
        this.nodeMap.delete(kind);
        delete this.node[kind];
      }
      nodeIsKind(node, kind) {
        return node instanceof this.getNodeClass(kind);
      }
      getKinds() {
        return Array.from(this.nodeMap.keys());
      }
    };
    AbstractFactory.defaultNodes = {};
  }
});
// node_modules/@mathjax/src/mjs/core/Tree/NodeFactory.js
var AbstractNodeFactory;
var init_NodeFactory = __esm({
  "node_modules/@mathjax/src/mjs/core/Tree/NodeFactory.js"() {
    init_Factory();
    AbstractNodeFactory = class extends AbstractFactory {
      create(kind, properties = {}, children = []) {
        return this.node[kind](properties, children);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mn.js
var MmlMn;
var init_mn = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mn.js"() {
    init_MmlNode();
    MmlMn = class extends AbstractMmlTokenNode {
      constructor() {
        super(...arguments);
        this.texclass = TEXCLASS.ORD;
      }
      get kind() {
        return "mn";
      }
    };
    MmlMn.defaults = Object.assign({}, AbstractMmlTokenNode.defaults);
  }
});
export{TEXCLASS,init_MmlNode,AbstractMmlTokenNode,AbstractMmlNode,AbstractMmlBaseNode,init_Attributes,AbstractMmlLayoutNode,INHERIT,indentAttributes,XMLNode,init_math,init_mi,init_mn,MmlMath,MmlMi,MmlMn,TextNode,init_NodeFactory,AbstractNodeFactory,TEXCLASSNAMES,init_MathItem,STATE,AbstractMathItem,newState,protoItem,AbstractMmlEmptyNode,init_Factory,AbstractFactory,init_Styles,TRBL,Styles,liteAdaptor,init_liteAdaptor};
