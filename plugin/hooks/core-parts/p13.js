import{__esm}from'./p12.js';export*from'./p12.js';
// core/src/typeset/errors.ts
var TexError;
var GlyphError;
var init_errors = __esm({
  "core/src/typeset/errors.ts"() {
    "use strict";
    TexError = class extends Error {
      name = "TexError";
    };
    GlyphError = class extends TexError {
      name = "GlyphError";
    };
  }
});
// node_modules/@mathjax/src/mjs/core/DOMAdaptor.js
var AbstractDOMAdaptor;
var init_DOMAdaptor = __esm({
  "node_modules/@mathjax/src/mjs/core/DOMAdaptor.js"() {
    AbstractDOMAdaptor = class {
      constructor(document = null) {
        this.canMeasureNodes = true;
        this.document = document;
      }
      node(kind, def2 = {}, children = [], ns) {
        const node = this.create(kind, ns);
        this.setAttributes(node, def2);
        for (const child of children) {
          this.append(node, child);
        }
        return node;
      }
      setProperty(node, name, value) {
        node[name] = value;
      }
      getProperty(node, name) {
        return node[name];
      }
      setAttributes(node, def2) {
        if (def2.style && typeof def2.style !== "string") {
          for (const key of Object.keys(def2.style)) {
            this.setStyle(node, key.replace(/-([a-z])/g, (_m, c) => c.toUpperCase()), def2.style[key]);
          }
        }
        if (def2.properties) {
          for (const key of Object.keys(def2.properties)) {
            node[key] = def2.properties[key];
          }
        }
        for (const key of Object.keys(def2)) {
          if ((key !== "style" || typeof def2.style === "string") && key !== "properties") {
            this.setAttribute(node, key, def2[key]);
          }
        }
      }
      replace(nnode, onode) {
        this.insert(nnode, onode);
        this.remove(onode);
        return onode;
      }
      childNode(node, i2) {
        return this.childNodes(node)[i2];
      }
      allClasses(node) {
        const classes = this.getAttribute(node, "class");
        return !classes ? [] : classes.replace(/  +/g, " ").replace(/^ /, "").replace(/ $/, "").split(/ /);
      }
      cssText(node) {
        return this.kind(node) === "style" ? this.textContent(node) : "";
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/util/Options.js
function isObject(obj) {
  return typeof obj === "object" && obj !== null && (obj.constructor === OBJECT || obj.constructor === Expandable);
}
function expandable(def2) {
  return Object.assign(Object.create(Expandable.prototype), def2);
}
function makeArray(x2) {
  return Array.isArray(x2) ? x2 : [x2];
}
function keys(def2) {
  if (!def2) {
    return [];
  }
  return Object.keys(def2).concat(Object.getOwnPropertySymbols(def2));
}
function copy(def2) {
  const props = {};
  for (const key of keys(def2)) {
    const prop = Object.getOwnPropertyDescriptor(def2, key);
    const value = prop.value;
    if (Array.isArray(value)) {
      prop.value = insert([], value, false);
    } else if (isObject(value)) {
      prop.value = copy(value);
    }
    if (prop.enumerable) {
      props[key] = prop;
    }
  }
  return Object.defineProperties(def2.constructor === Expandable ? expandable({}) : {}, props);
}
function insert(dst, src, warn = true) {
  for (let key of keys(src)) {
    if (warn && dst[key] === void 0 && dst.constructor !== Expandable) {
      if (typeof key === "symbol") {
        key = key.toString();
      }
      OPTIONS.optionError(`Invalid option "${key}" (no default value).`, key);
      continue;
    }
    const sval = src[key];
    let dval = dst[key];
    if (isObject(sval) && dval !== null && (typeof dval === "object" || typeof dval === "function")) {
      const ids = keys(sval);
      if (Array.isArray(dval) && (ids.length === 1 && (ids[0] === APPEND || ids[0] === REMOVE) && Array.isArray(sval[ids[0]]) || ids.length === 2 && ids.sort().join(",") === APPEND + "," + REMOVE && Array.isArray(sval[APPEND]) && Array.isArray(sval[REMOVE]))) {
        if (sval[REMOVE]) {
          dval = dst[key] = dval.filter((x2) => sval[REMOVE].indexOf(x2) < 0);
        }
        if (sval[APPEND]) {
          dst[key] = [...dval, ...sval[APPEND]];
        }
      } else {
        insert(dval, sval, warn);
      }
    } else if (Array.isArray(sval)) {
      dst[key] = [];
      insert(dst[key], sval, false);
    } else if (isObject(sval)) {
      dst[key] = copy(sval);
    } else {
      dst[key] = sval;
    }
  }
  return dst;
}
function defaultOptions(options3, ...defs) {
  defs.forEach((def2) => insert(options3, def2, false));
  return options3;
}
function userOptions(options3, ...defs) {
  defs.forEach((def2) => insert(options3, def2, true));
  return options3;
}
function separateOptions(options3, ...objects) {
  const results = [];
  for (const object of objects) {
    const exists = {}, missing = {};
    for (const key of Object.keys(options3 || {})) {
      (object[key] === void 0 ? missing : exists)[key] = options3[key];
    }
    results.push(exists);
    options3 = missing;
  }
  results.unshift(options3);
  return results;
}
function lookup(name, lookup2, def2 = null) {
  return Object.hasOwn(lookup2, name) ? lookup2[name] : def2;
}
var OBJECT;
var APPEND;
var REMOVE;
var OPTIONS;
var Expandable;
var init_Options = __esm({
  "node_modules/@mathjax/src/mjs/util/Options.js"() {
    OBJECT = {}.constructor;
    APPEND = "[+]";
    REMOVE = "[-]";
    OPTIONS = {
      invalidOption: "warn",
      optionError: (message, _key) => {
        if (OPTIONS.invalidOption === "fatal") {
          throw new Error(message);
        }
        console.warn("MathJax: " + message);
      }
    };
    Expandable = class {
    };
  }
});
// node_modules/@mathjax/src/mjs/components/version.js
var VERSION;
var init_version = __esm({
  "node_modules/@mathjax/src/mjs/components/version.js"() {
    VERSION = "4.1.3";
  }
});
// node_modules/@mathjax/src/mjs/util/PrioritizedList.js
var PrioritizedList;
var init_PrioritizedList = __esm({
  "node_modules/@mathjax/src/mjs/util/PrioritizedList.js"() {
    PrioritizedList = class _PrioritizedList {
      constructor() {
        this.items = [];
        this.items = [];
      }
      [Symbol.iterator]() {
        let i2 = 0;
        const items = this.items;
        return {
          next() {
            return { value: items[i2++], done: i2 > items.length };
          }
        };
      }
      add(item, priority = _PrioritizedList.DEFAULTPRIORITY) {
        let i2 = this.items.length;
        do {
          i2--;
        } while (i2 >= 0 && priority < this.items[i2].priority);
        this.items.splice(i2 + 1, 0, { item, priority });
        return item;
      }
      remove(item) {
        let i2 = this.items.length;
        do {
          i2--;
        } while (i2 >= 0 && this.items[i2].item !== item);
        if (i2 >= 0) {
          this.items.splice(i2, 1);
        }
        return this;
      }
    };
    PrioritizedList.DEFAULTPRIORITY = 5;
  }
});
// node_modules/@mathjax/src/mjs/core/HandlerList.js
var HandlerList;
var init_HandlerList = __esm({
  "node_modules/@mathjax/src/mjs/core/HandlerList.js"() {
    init_PrioritizedList();
    HandlerList = class extends PrioritizedList {
      register(handler) {
        return this.add(handler, handler.priority);
      }
      unregister(handler) {
        this.remove(handler);
      }
      handlesDocument(document) {
        for (const item of this) {
          const handler = item.item;
          if (handler.handlesDocument(document)) {
            return handler;
          }
        }
        throw new Error(`Can't find handler for document`);
      }
      document(document, options3 = null) {
        return this.handlesDocument(document).create(document, options3);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/util/Retries.js
function handleRetriesFor(code) {
  return new Promise(function run2(ok, fail2) {
    const handleRetry = (err2) => {
      var _a2;
      if (err2.retry instanceof Promise) {
        err2.retry.then(() => run2(ok, fail2)).catch((e) => fail2(e));
      } else if ((_a2 = err2.restart) === null || _a2 === void 0 ? void 0 : _a2.isCallback) {
        MathJax.Callback.After(() => run2(ok, fail2), err2.restart);
      } else {
        fail2(err2);
      }
    };
    try {
      const result = code();
      if (result instanceof Promise) {
        result.then((value) => ok(value)).catch((err2) => handleRetry(err2));
      } else {
        ok(result);
      }
    } catch (err2) {
      handleRetry(err2);
    }
  });
}
function retryAfter(promise) {
  const err2 = new Error("MathJax retry -- an asynchronous action is required; try using one of the promise-based functions and await its resolution.");
  err2.retry = promise;
  throw err2;
}
var init_Retries = __esm({
  "node_modules/@mathjax/src/mjs/util/Retries.js"() {
  }
});
// node_modules/@mathjax/src/mjs/util/context.js
var hasWindow;
var isCJS;
var context;
var init_context = __esm({
  "node_modules/@mathjax/src/mjs/util/context.js"() {
    hasWindow = false;
    isCJS = false;
    context = {
      window: hasWindow ? void 0 : null,
      document: hasWindow ? (void 0).document : null,
      os: (() => {
        if (hasWindow && (void 0).navigator) {
          const app = (void 0).navigator.appVersion;
          const osNames = [
            ["Win", "Windows"],
            ["Mac", "MacOS"],
            ["X11", "Unix"],
            ["Linux", "Unix"]
          ];
          for (const [key, os] of osNames) {
            if (app.includes(key)) {
              return os;
            }
          }
          if ((void 0).navigator.userAgent.includes("Android")) {
            return "Unix";
          }
        } else if (false) {
          return {
            linux: "Unix",
            android: "Unix",
            aix: "Unix",
            freebsd: "Unix",
            netbsd: "Unix",
            openbsd: "Unix",
            sunos: "Unix",
            darwin: "MacOS",
            win32: "Windows",
            cygwin: "Windows"
          }[(void 0).platform] || (void 0).platform;
        }
        return "unknown";
      })(),
      path: (file) => file
    };
    if (context.os === "Windows") {
      context.path = (file) => file.match(/^[/\\]?[a-zA-Z]:[/\\]/) ? (isCJS ? "" : "file://") + file.replace(/\\/g, "/").replace(/^\//, "") : file.replace(/^\//, "file:///");
    }
  }
});
// node_modules/@mathjax/src/mjs/mathjax.js
var mathjax;
var init_mathjax = __esm({
  "node_modules/@mathjax/src/mjs/mathjax.js"() {
    init_version();
    init_HandlerList();
    init_Retries();
    init_context();
    mathjax = {
      version: VERSION,
      context,
      handlers: new HandlerList(),
      document: function(document, options3) {
        return mathjax.handlers.document(document, options3);
      },
      handleRetriesFor,
      retryAfter,
      asyncLoad: null,
      asyncIsSynchronous: false
    };
  }
});
// node_modules/@mathjax/src/mjs/util/AsyncLoad.js
function asyncLoad(name) {
  if (!mathjax.asyncLoad) {
    return Promise.reject(`Can't load '${name}': No mathjax.asyncLoad method specified`);
  }
  return new Promise((ok, fail2) => {
    const result = mathjax.asyncLoad(name);
    if (result instanceof Promise) {
      result.then((value) => ok(value)).catch((err2) => fail2(err2));
    } else {
      ok(result);
    }
  });
}
var init_AsyncLoad = __esm({
  "node_modules/@mathjax/src/mjs/util/AsyncLoad.js"() {
    init_mathjax();
  }
});
// node_modules/@mathjax/src/mjs/adaptors/NodeMixin.js
function NodeMixin(Base2, options3 = {}) {
  var _a2;
  options3 = userOptions(defaultOptions({}, NodeMixinOptions), options3);
  return _a2 = class NodeAdaptor extends Base2 {
    constructor(...args) {
      super(args[0]);
      this.canMeasureNodes = false;
      const CLASS = this.constructor;
      this.options = userOptions(defaultOptions({}, CLASS.OPTIONS), args[1]);
    }
    fontSize(node) {
      return options3.badCSS ? this.options.fontSize : super.fontSize(node);
    }
    fontFamily(node) {
      return options3.badCSS ? this.options.fontFamily : super.fontFamily(node);
    }
    nodeSize(node, em2 = 1, local = null) {
      if (!options3.badSizes) {
        return super.nodeSize(node, em2, local);
      }
      const text = this.textContent(node);
      const non = Array.from(text.replace(_a2.cjkPattern, "")).length;
      const CJK = Array.from(text).length - non;
      return [
        CJK * this.options.cjkCharWidth + non * this.options.unknownCharWidth,
        this.options.unknownCharHeight
      ];
    }
    nodeBBox(node) {
      return options3.badSizes ? { left: 0, right: 0, top: 0, bottom: 0 } : super.nodeBBox(node);
    }
    createWorker(listener, options4) {
      return __awaiter(this, void 0, void 0, function* () {
        const { Worker: Worker2 } = yield asyncLoad("node:worker_threads");
        class LiteWorker {
          constructor(url2, options5 = {}) {
            this.worker = new Worker2(url2, options5);
          }
          addEventListener(kind, listener2) {
            this.worker.on(kind, listener2);
          }
          postMessage(msg) {
            this.worker.postMessage({ data: msg });
          }
          terminate() {
            this.worker.terminate();
          }
        }
        const { path, maps: maps3 } = options4;
        const url = `${path}/${options4.worker}`;
        const worker = new LiteWorker(url, {
          type: "module",
          workerData: { maps: maps3 }
        });
        worker.addEventListener("message", listener);
        return worker;
      });
    }
  }, _a2.OPTIONS = Object.assign(Object.assign({}, options3.badCSS ? {
    fontSize: 16,
    fontFamily: "Times"
  } : {}), options3.badSizes ? {
    cjkCharWidth: 1,
    unknownCharWidth: 0.6,
    unknownCharHeight: 0.8
  } : {}), _a2.cjkPattern = new RegExp([
    "[",
    "ᄀ-\u115F",
    "〈〉",
    "⺀-〾",
    "\u3040-㉇",
    "㉐-䶿",
    "一-꓆",
    "ꥠ-ꥼ",
    "가-힣",
    "豈-\uFAFF",
    "︐-︙",
    "︰-﹫",
    "！-｠￠-￦",
    "𛀀-𛀁",
    "🈀-🉑",
    "𠀀-\uD8BF\uDFFD",
    "]"
  ].join(""), "gu"), _a2;
}
var __awaiter;
var NodeMixinOptions;
var init_NodeMixin = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/NodeMixin.js"() {
    init_Options();
    init_AsyncLoad();
    __awaiter = function(thisArg, _arguments, P, generator) {
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
    NodeMixinOptions = {
      badCSS: true,
      badSizes: true
    };
  }
});
// node_modules/@mathjax/src/mjs/adaptors/lite/Element.js
var LiteElement;
var init_Element = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/lite/Element.js"() {
    LiteElement = class {
      constructor(kind, attributes = {}, children = []) {
        this.kind = kind;
        this.attributes = Object.assign({}, attributes);
        this.children = [...children];
        for (const child of this.children) {
          child.parent = this;
        }
        this.styles = null;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/adaptors/lite/Document.js
var LiteDocument;
var init_Document = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/lite/Document.js"() {
    init_Element();
    LiteDocument = class {
      get kind() {
        return "#document";
      }
      constructor(window2 = null) {
        this.defaultView = null;
        this.root = new LiteElement("html", {}, [
          this.head = new LiteElement("head"),
          this.body = new LiteElement("body")
        ]);
        this.type = "";
        this.defaultView = window2;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/adaptors/lite/Text.js
var LiteText;
var LiteComment;
var init_Text = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/lite/Text.js"() {
    LiteText = class {
      get kind() {
        return "#text";
      }
      constructor(text = "") {
        this.value = text;
      }
    };
    LiteComment = class extends LiteText {
      get kind() {
        return "#comment";
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/adaptors/lite/List.js
var LiteList;
var init_List = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/lite/List.js"() {
    LiteList = class {
      constructor(children) {
        this.nodes = [];
        this.nodes = [...children];
      }
      append(node) {
        this.nodes.push(node);
      }
      [Symbol.iterator]() {
        let i2 = 0;
        return {
          next() {
            return i2 === this.nodes.length ? { value: null, done: true } : { value: this.nodes[i2++], done: false };
          }
        };
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/util/Entities.js
function translate(text) {
  return text.replace(/&([a-z][a-z0-9]*|#(?:[0-9]+|x[0-9a-f]+));/gi, replace);
}
function replace(match, entity) {
  if (entity.charAt(0) === "#") {
    return numeric(entity.slice(1));
  }
  if (entities[entity]) {
    return entities[entity];
  }
  if (options2["loadMissingEntities"]) {
    const file = entity.match(/^[a-zA-Z](fr|scr|opf)$/) ? RegExp.$1 : entity.charAt(0).toLowerCase();
    if (!loaded[file]) {
      loaded[file] = true;
      retryAfter(asyncLoad("./util/entities/" + file + ".js"));
    }
  }
  return match;
}
function numeric(entity) {
  const n = entity.charAt(0) === "x" ? parseInt(entity.slice(1), 16) : parseInt(entity);
  return String.fromCodePoint(n);
}
var options2;
var entities;
var loaded;
var init_Entities = __esm({
  "node_modules/@mathjax/src/mjs/util/Entities.js"() {
    init_Retries();
    init_AsyncLoad();
    options2 = {
      loadMissingEntities: true
    };
    entities = JSON.parse(`{
 "ApplyFunction":"\u2061","Backslash":"∖","Because":"∵","Breve":"˘","Cap":"⋒","CenterDot":"·","CircleDot":"⊙","CircleMinus":"⊖","CirclePlus":"⊕","CircleTimes":"⊗","Congruent":"≡","ContourIntegral":"∮",
 "Coproduct":"∐","Cross":"⨯","Cup":"⋓","CupCap":"≍","Dagger":"‡","Del":"∇","Delta":"Δ","Diamond":"⋄","DifferentialD":"ⅆ","DotEqual":"≐","DoubleDot":"¨","DoubleRightTee":"⊨","DoubleVerticalBar":"∥",
 "DownArrow":"↓","DownLeftVector":"↽","DownRightVector":"⇁","DownTee":"⊤","Downarrow":"⇓","Element":"∈","EqualTilde":"≂","Equilibrium":"⇌","Exists":"∃","ExponentialE":"ⅇ","FilledVerySmallSquare":"▪",
 "ForAll":"∀","Gamma":"Γ","Gg":"⋙","GreaterEqual":"≥","GreaterEqualLess":"⋛","GreaterFullEqual":"≧","GreaterLess":"≷","GreaterSlantEqual":"⩾","GreaterTilde":"≳","Hacek":"ˇ","Hat":"^","HumpDownHump":"≎",
 "HumpEqual":"≏","Im":"ℑ","ImaginaryI":"ⅈ","Integral":"∫","Intersection":"⋂","InvisibleComma":"\u2063","InvisibleTimes":"\u2062","Lambda":"Λ","Larr":"↞","LeftAngleBracket":"⟨","LeftArrow":"←",
 "LeftArrowRightArrow":"⇆","LeftCeiling":"⌈","LeftDownVector":"⇃","LeftFloor":"⌊","LeftRightArrow":"↔","LeftTee":"⊣","LeftTriangle":"⊲","LeftTriangleEqual":"⊴","LeftUpVector":"↿","LeftVector":"↼",
 "Leftarrow":"⇐","Leftrightarrow":"⇔","LessEqualGreater":"⋚","LessFullEqual":"≦","LessGreater":"≶","LessSlantEqual":"⩽","LessTilde":"≲","Ll":"⋘","Lleftarrow":"⇚","LongLeftArrow":"⟵",
 "LongLeftRightArrow":"⟷","LongRightArrow":"⟶","Longleftarrow":"⟸","Longleftrightarrow":"⟺","Longrightarrow":"⟹","Lsh":"↰","MinusPlus":"∓","NestedGreaterGreater":"≫","NestedLessLess":"≪",
 "NotDoubleVerticalBar":"∦","NotElement":"∉","NotEqual":"≠","NotExists":"∄","NotGreater":"≯","NotGreaterEqual":"≱","NotLeftTriangle":"⋪","NotLeftTriangleEqual":"⋬","NotLess":"≮","NotLessEqual":"≰",
 "NotPrecedes":"⊀","NotPrecedesSlantEqual":"⋠","NotRightTriangle":"⋫","NotRightTriangleEqual":"⋭","NotSubsetEqual":"⊈","NotSucceeds":"⊁","NotSucceedsSlantEqual":"⋡","NotSupersetEqual":"⊉",
 "NotTilde":"≁","NotVerticalBar":"∤","Omega":"Ω","OverBar":"‾","OverBrace":"⏞","PartialD":"∂","Phi":"Φ","Pi":"Π","PlusMinus":"±","Precedes":"≺","PrecedesEqual":"⪯","PrecedesSlantEqual":"≼",
 "PrecedesTilde":"≾","Product":"∏","Proportional":"∝","Psi":"Ψ","Rarr":"↠","Re":"ℜ","ReverseEquilibrium":"⇋","RightAngleBracket":"⟩","RightArrow":"→","RightArrowLeftArrow":"⇄","RightCeiling":"⌉",
 "RightDownVector":"⇂","RightFloor":"⌋","RightTee":"⊢","RightTeeArrow":"↦","RightTriangle":"⊳","RightTriangleEqual":"⊵","RightUpVector":"↾","RightVector":"⇀","Rightarrow":"⇒","Rrightarrow":"⇛",
 "Rsh":"↱","Sigma":"Σ","SmallCircle":"∘","Sqrt":"√","Square":"□","SquareIntersection":"⊓","SquareSubset":"⊏","SquareSubsetEqual":"⊑","SquareSuperset":"⊐","SquareSupersetEqual":"⊒","SquareUnion":"⊔",
 "Star":"⋆","Subset":"⋐","SubsetEqual":"⊆","Succeeds":"≻","SucceedsEqual":"⪰","SucceedsSlantEqual":"≽","SucceedsTilde":"≿","SuchThat":"∋","Sum":"∑","Superset":"⊃","SupersetEqual":"⊇","Supset":"⋑",
 "Therefore":"∴","Theta":"Θ","Tilde":"∼","TildeEqual":"≃","TildeFullEqual":"≅","TildeTilde":"≈","UnderBar":"_","UnderBrace":"⏟","Union":"⋃","UnionPlus":"⊎","UpArrow":"↑","UpDownArrow":"↕","UpTee":"⊥",
 "Uparrow":"⇑","Updownarrow":"⇕","Upsilon":"Υ","Vdash":"⊩","Vee":"⋁","VerticalBar":"∣","VerticalTilde":"≀","Vvdash":"⊪","Wedge":"⋀","Xi":"Ξ","amp":"&","acute":"´","aleph":"ℵ","alpha":"α","amalg":"⨿",
 "and":"∧","ang":"∠","angmsd":"∡","angsph":"∢","ape":"≊","backprime":"‵","backsim":"∽","backsimeq":"⋍","beta":"β","beth":"ℶ","between":"≬","bigcirc":"◯","bigodot":"⨀","bigoplus":"⨁","bigotimes":"⨂",
 "bigsqcup":"⨆","bigstar":"★","bigtriangledown":"▽","bigtriangleup":"△","biguplus":"⨄","blacklozenge":"⧫","blacktriangle":"▴","blacktriangledown":"▾","blacktriangleleft":"◂","bowtie":"⋈","boxdl":"┐",
 "boxdr":"┌","boxminus":"⊟","boxplus":"⊞","boxtimes":"⊠","boxul":"┘","boxur":"└","bsol":"\\\\","bull":"•","cap":"∩","check":"✓","chi":"χ","circ":"ˆ","circeq":"≗","circlearrowleft":"↺",
 "circlearrowright":"↻","circledR":"®","circledS":"Ⓢ","circledast":"⊛","circledcirc":"⊚","circleddash":"⊝","clubs":"♣","colon":":","comp":"∁","ctdot":"⋯","cuepr":"⋞","cuesc":"⋟","cularr":"↶","cup":"∪",
 "curarr":"↷","curlyvee":"⋎","curlywedge":"⋏","dagger":"†","daleth":"ℸ","ddarr":"⇊","deg":"°","delta":"δ","digamma":"ϝ","div":"÷","divideontimes":"⋇","dot":"˙","doteqdot":"≑","dotplus":"∔",
 "dotsquare":"⊡","dtdot":"⋱","ecir":"≖","efDot":"≒","egs":"⪖","ell":"ℓ","els":"⪕","empty":"∅","epsi":"ε","epsiv":"ϵ","erDot":"≓","eta":"η","eth":"ð","flat":"♭","fork":"⋔","frown":"⌢","gEl":"⪌",
 "gamma":"γ","gap":"⪆","gimel":"ℷ","gnE":"≩","gnap":"⪊","gne":"⪈","gnsim":"⋧","gt":">","gtdot":"⋗","harrw":"↭","hbar":"ℏ","hellip":"…","hookleftarrow":"↩","hookrightarrow":"↪","imath":"ı","infin":"∞",
 "intcal":"⊺","iota":"ι","jmath":"ȷ","kappa":"κ","kappav":"ϰ","lEg":"⪋","lambda":"λ","lap":"⪅","larrlp":"↫","larrtl":"↢","lbrace":"{","lbrack":"[","le":"≤","leftleftarrows":"⇇","leftthreetimes":"⋋",
 "lessdot":"⋖","lmoust":"⎰","lnE":"≨","lnap":"⪉","lne":"⪇","lnsim":"⋦","longmapsto":"⟼","looparrowright":"↬","lowast":"∗","loz":"◊","lt":"<","ltimes":"⋉","ltri":"◃","macr":"¯","malt":"✠","mho":"℧",
 "mu":"μ","multimap":"⊸","nLeftarrow":"⇍","nLeftrightarrow":"⇎","nRightarrow":"⇏","nVDash":"⊯","nVdash":"⊮","natur":"♮","nearr":"↗","nharr":"↮","nlarr":"↚","not":"¬","nrarr":"↛","nu":"ν","nvDash":"⊭",
 "nvdash":"⊬","nwarr":"↖","omega":"ω","omicron":"ο","or":"∨","osol":"⊘","period":".","phi":"φ","phiv":"ϕ","pi":"π","piv":"ϖ","prap":"⪷","precnapprox":"⪹","precneqq":"⪵","precnsim":"⋨","prime":"′",
 "psi":"ψ","quot":"\\"","rarrtl":"↣","rbrace":"}","rbrack":"]","rho":"ρ","rhov":"ϱ","rightrightarrows":"⇉","rightthreetimes":"⋌","ring":"˚","rmoust":"⎱","rtimes":"⋊","rtri":"▹","scap":"⪸","scnE":"⪶",
 "scnap":"⪺","scnsim":"⋩","sdot":"⋅","searr":"↘","sect":"§","sharp":"♯","sigma":"σ","sigmav":"ς","simne":"≆","smile":"⌣","spades":"♠","sub":"⊂","subE":"⫅","subnE":"⫋","subne":"⊊","supE":"⫆","supnE":"⫌",
 "supne":"⊋","swarr":"↙","tau":"τ","theta":"θ","thetav":"ϑ","tilde":"˜","times":"×","triangle":"▵","triangleq":"≜","upsi":"υ","upuparrows":"⇈","veebar":"⊻","vellip":"⋮","weierp":"℘","xi":"ξ","yen":"¥",
 "zeta":"ζ","zigrarr":"⇝","nbsp":"\u00A0","rsquo":"’","lsquo":"‘"
}`);
    loaded = {};
  }
});
// node_modules/@mathjax/src/mjs/adaptors/lite/Parser.js
var SPACE2;
var OPTIONALSPACE;
var TAGNAME;
var ATTNAME;
var VALUE;
var VALUESPLIT;
var ATTRIBUTE;
var ATTRIBUTESPLIT;
var TAG;
var PATTERNS;
var LiteParser;
var init_Parser = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/lite/Parser.js"() {
    init_Entities();
    init_Element();
    init_Text();
    SPACE2 = "[ \\n]+";
    OPTIONALSPACE = "[ \\n]*";
    TAGNAME = `[A-Za-z][^\0-\u001F "'>/=\u007F-\u009F]*`;
    ATTNAME = `[^\0-\u001F "'>/=\u007F-\u009F]+`;
    VALUE = `(?:'[^']*'|"[^"]*"|${SPACE2})`;
    VALUESPLIT = `(?:'([^']*)'|"([^"]*)"|(${SPACE2}))`;
    ATTRIBUTE = `${ATTNAME}(?:${OPTIONALSPACE}=${OPTIONALSPACE}${VALUE})?`;
    ATTRIBUTESPLIT = `(${ATTNAME})(?:${OPTIONALSPACE}=${OPTIONALSPACE}${VALUESPLIT})?`;
    TAG = `(<(?:${TAGNAME}(?:${SPACE2}${ATTRIBUTE})*${OPTIONALSPACE}/?|/${TAGNAME}|!--[^]*?--|![^]*?)(?:>|$))`;
    PATTERNS = {
      tag: new RegExp(TAG, "u"),
      attr: new RegExp(ATTRIBUTE, "u"),
      attrsplit: new RegExp(ATTRIBUTESPLIT, "u")
    };
    LiteParser = class {
      parseFromString(text, _format = "text/html", adaptor = null) {
        const root2 = adaptor.createDocument();
        let node = adaptor.body(root2);
        const parts = text.replace(/<\?.*?\?>/g, "").split(PATTERNS.tag);
        while (parts.length) {
          const text2 = parts.shift();
          const tag3 = parts.shift();
          if (text2) {
            this.addText(adaptor, node, text2);
          }
          if (tag3 && tag3.charAt(tag3.length - 1) === ">") {
            if (tag3.charAt(1) === "!") {
              this.addComment(adaptor, node, tag3);
            } else if (tag3.charAt(1) === "/") {
              node = this.closeTag(adaptor, node, tag3);
            } else {
              node = this.openTag(adaptor, node, tag3, parts);
            }
          }
        }
        this.checkDocument(adaptor, root2);
        return root2;
      }
      addText(adaptor, node, text) {
        text = translate(text);
        return adaptor.append(node, adaptor.text(text));
      }
      addComment(adaptor, node, comment) {
        return adaptor.append(node, new LiteComment(comment));
      }
      closeTag(adaptor, node, tag3) {
        const kind = tag3.slice(2, tag3.length - 1).toLowerCase();
        while (adaptor.parent(node) && adaptor.kind(node) !== kind) {
          node = adaptor.parent(node);
        }
        return adaptor.parent(node);
      }
      openTag(adaptor, node, tag3, parts) {
        const PCDATA = this.constructor.PCDATA;
        const SELF_CLOSING = this.constructor.SELF_CLOSING;
        const kind = tag3.match(/<(.*?)[\s\n>/]/)[1].toLowerCase();
        const child = adaptor.node(kind);
        const attributes = tag3.replace(/^<.*?[\s\n>]/, "").split(PATTERNS.attrsplit);
        if (attributes.pop().match(/>$/) || attributes.length < 5) {
          this.addAttributes(adaptor, child, attributes);
          adaptor.append(node, child);
          if (!SELF_CLOSING[kind] && !tag3.match(/\/>$/)) {
            if (PCDATA[kind]) {
              this.handlePCDATA(adaptor, child, kind, parts);
            } else {
              node = child;
            }
          }
        }
        return node;
      }
      addAttributes(adaptor, node, attributes) {
        while (attributes.length) {
          const [, name, v1, v2, v3] = attributes.splice(0, 5);
          const value = translate(v1 || v2 || v3 || "");
          adaptor.setAttribute(node, name, value);
        }
      }
      handlePCDATA(adaptor, node, kind, parts) {
        const pcdata = [];
        const etag = "</" + kind + ">";
        let ptag = "";
        while (parts.length && ptag !== etag) {
          pcdata.push(ptag);
          pcdata.push(parts.shift());
          ptag = parts.shift();
        }
        adaptor.append(node, adaptor.text(pcdata.join("")));
      }
      checkDocument(adaptor, root2) {
        const node = this.getOnlyChild(adaptor, adaptor.body(root2));
        if (!node)
          return;
        for (const child of adaptor.childNodes(adaptor.body(root2))) {
          if (child === node) {
            break;
          }
          if (child instanceof LiteComment && child.value.match(/^<!DOCTYPE/)) {
            root2.type = child.value;
          }
        }
        switch (adaptor.kind(node)) {
          case "html":
            for (const child of node.children) {
              switch (adaptor.kind(child)) {
                case "head":
                  root2.head = child;
                  break;
                case "body":
                  root2.body = child;
                  break;
              }
            }
            root2.root = node;
            adaptor.remove(node);
            if (adaptor.parent(root2.body) !== node) {
              adaptor.append(node, root2.body);
            }
            if (adaptor.parent(root2.head) !== node) {
              adaptor.insert(root2.head, root2.body);
            }
            break;
          case "head":
            root2.head = adaptor.replace(node, root2.head);
            break;
          case "body":
            root2.body = adaptor.replace(node, root2.body);
            break;
        }
      }
      getOnlyChild(adaptor, body) {
        let node = null;
        for (const child of adaptor.childNodes(body)) {
          if (child instanceof LiteElement) {
            if (node)
              return null;
            node = child;
          }
        }
        return node;
      }
      serialize(adaptor, node, xml = false) {
        const SELF_CLOSING = this.constructor.SELF_CLOSING;
        const tag3 = adaptor.kind(node);
        const attributes = this.allAttributes(adaptor, node, xml).map((x2) => x2.name + '="' + this.protectAttribute(x2.value, xml) + '"').join(" ");
        const content = this.serializeInner(adaptor, node, xml);
        const html2 = `<${tag3}` + (attributes ? " " + attributes : "") + ((!xml || content) && !SELF_CLOSING[tag3] ? `>${content}</${tag3}>` : xml ? "/>" : ">");
        return html2;
      }
      serializeInner(adaptor, node, xml = false) {
        const PCDATA = this.constructor.PCDATA;
        if (Object.hasOwn(PCDATA, node.kind)) {
          return adaptor.childNodes(node).map((x2) => adaptor.value(x2)).join("");
        }
        return adaptor.childNodes(node).map((x2) => {
          const kind = adaptor.kind(x2);
          return kind === "#text" ? this.protectHTML(adaptor.value(x2)) : kind === "#comment" ? x2.value : this.serialize(adaptor, x2, xml);
        }).join("");
      }
      allAttributes(adaptor, node, xml) {
        const attributes = adaptor.allAttributes(node);
        if (!xml) {
          return attributes;
        }
        const kind = adaptor.kind(node);
        const xmlns = this.constructor.XMLNS;
        if (!Object.hasOwn(xmlns, kind)) {
          return attributes;
        }
        for (const { name } of attributes) {
          if (name === "xmlns") {
            return attributes;
          }
        }
        attributes.push({ name: "xmlns", value: xmlns[kind] });
        return attributes;
      }
      protectAttribute(text, xml) {
        if (typeof text !== "string") {
          text = String(text);
        }
        text = text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
        if (xml) {
          text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
        return text;
      }
      protectHTML(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
    };
    LiteParser.SELF_CLOSING = {
      area: true,
      base: true,
      br: true,
      col: true,
      command: true,
      embed: true,
      hr: true,
      img: true,
      input: true,
      keygen: true,
      link: true,
      menuitem: true,
      meta: true,
      param: true,
      source: true,
      track: true,
      wbr: true
    };
    LiteParser.PCDATA = {
      option: true,
      textarea: true,
      fieldset: true,
      title: true,
      style: true,
      script: true
    };
    LiteParser.XMLNS = {
      svg: "http://www.w3.org/2000/svg",
      math: "http://www.w3.org/1998/Math/MathML",
      html: "http://www.w3.org/1999/xhtml"
    };
  }
});
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
export{init_Attributes,Attributes,INHERIT,init_Options,lookup,init_PrioritizedList,PrioritizedList,userOptions,defaultOptions,init_MathItem,init_Retries,STATE,AbstractMathItem,handleRetriesFor,expandable,makeArray,newState,separateOptions,mathjax,init_mathjax,protoItem,init_Entities,entities,init_Styles,TRBL,init_context,context,init_AsyncLoad,asyncLoad,retryAfter,Styles,numeric,liteAdaptor,TexError,GlyphError,init_liteAdaptor,init_errors};
