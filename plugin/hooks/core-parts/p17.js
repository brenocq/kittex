import{__esm,init_TokenMap,init_PrioritizedList,init_FunctionList,PrioritizedList,FunctionList,CharacterMap,init_HandlerTypes,init_Options,init_Tags,ConfigurationType,HandlerType,TagsFactory,defaultOptions,userOptions,init_Entities,init_MmlNode,init_TexError,init_ParseUtil,init_UnitUtil,init_NodeUtil,init_StackItem,init_Styles,init_TexConstants,BaseItem,NodeUtil_default,TexError_default,ParseUtil,TexConstant,TEXCLASS,entities,TRBL,UnitUtil,TexParser,init_TexParser,init_mo,init_string,MmlMo,replaceUnicode,lookup,Label,__kittexLate}from'./p16.js';export*from'./p16.js';
__kittexLate.init_MapHandler=()=>init_MapHandler;__kittexLate.MapHandler=()=>MapHandler;
// node_modules/@mathjax/src/mjs/input/tex/MapHandler.js
var maps;
var MapHandler;
var SubHandler;
var SubHandlers;
var init_MapHandler = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/MapHandler.js"() {
    init_TokenMap();
    init_PrioritizedList();
    init_FunctionList();
    maps = /* @__PURE__ */ new Map();
    MapHandler = {
      register(map) {
        maps.set(map.name, map);
      },
      getMap(name) {
        return maps.get(name);
      }
    };
    SubHandler = class _SubHandler {
      constructor() {
        this._configuration = new PrioritizedList();
        this._fallback = new FunctionList();
      }
      add(maps3, fallback, priority = PrioritizedList.DEFAULTPRIORITY) {
        for (const name of maps3.slice().reverse()) {
          const map = MapHandler.getMap(name);
          if (!map) {
            this.warn(`Configuration '${name}' not found! Omitted.`);
            return;
          }
          this._configuration.add(map, priority);
        }
        if (fallback) {
          this._fallback.add(fallback, priority);
        }
      }
      remove(maps3, fallback = null) {
        for (const name of maps3) {
          const map = this.retrieve(name);
          if (map) {
            this._configuration.remove(map);
          }
        }
        if (fallback) {
          this._fallback.remove(fallback);
        }
      }
      parse(input) {
        for (const { item: map } of this._configuration) {
          const result = map.parse(input);
          if (result === _SubHandler.FALLBACK) {
            break;
          }
          if (result) {
            return result;
          }
        }
        const [env, token2] = input;
        Array.from(this._fallback)[0].item(env, token2);
        return;
      }
      lookup(token2) {
        const map = this.applicable(token2);
        return map ? map.lookup(token2) : null;
      }
      contains(token2) {
        const map = this.applicable(token2);
        return !!map && !(map instanceof CharacterMap && map.lookup(token2).char === null);
      }
      toString() {
        const names = [];
        for (const { item: map } of this._configuration) {
          names.push(map.name);
        }
        return names.join(", ");
      }
      applicable(token2) {
        for (const { item: map } of this._configuration) {
          if (map.contains(token2)) {
            return map;
          }
        }
        return null;
      }
      retrieve(name) {
        for (const { item: map } of this._configuration) {
          if (map.name === name) {
            return map;
          }
        }
        return null;
      }
      warn(message) {
        console.log("TexParser Warning: " + message);
      }
    };
    SubHandler.FALLBACK = /* @__PURE__ */ Symbol("fallback");
    SubHandlers = class {
      constructor() {
        this.map = /* @__PURE__ */ new Map();
      }
      add(handlers, fallbacks, priority = PrioritizedList.DEFAULTPRIORITY) {
        for (const key of Object.keys(handlers)) {
          const name = key;
          let subHandler = this.get(name);
          if (!subHandler) {
            subHandler = new SubHandler();
            this.set(name, subHandler);
          }
          subHandler.add(handlers[name], fallbacks[name], priority);
        }
      }
      remove(handlers, fallbacks) {
        for (const name of Object.keys(handlers)) {
          const subHandler = this.get(name);
          if (subHandler) {
            subHandler.remove(handlers[name], fallbacks[name]);
          }
        }
      }
      set(name, subHandler) {
        this.map.set(name, subHandler);
      }
      get(name) {
        return this.map.get(name);
      }
      retrieve(name) {
        for (const handler of this.map.values()) {
          const map = handler.retrieve(name);
          if (map) {
            return map;
          }
        }
        return null;
      }
      keys() {
        return this.map.keys();
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/Configuration.js
var Configuration;
var maps2;
var ConfigurationHandler;
var ParserConfiguration;
var init_Configuration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/Configuration.js"() {
    init_HandlerTypes();
    init_Options();
    init_MapHandler();
    init_FunctionList();
    init_PrioritizedList();
    init_Tags();
    Configuration = class _Configuration {
      static makeProcessor(func, priority) {
        return Array.isArray(func) ? func : [func, priority];
      }
      static _create(name, config2 = {}) {
        var _a2;
        const priority = (_a2 = config2.priority) !== null && _a2 !== void 0 ? _a2 : PrioritizedList.DEFAULTPRIORITY;
        const init2 = config2.init ? this.makeProcessor(config2.init, priority) : null;
        const conf = config2.config ? this.makeProcessor(config2.config, priority) : null;
        const preprocessors = (config2.preprocessors || []).map((pre) => this.makeProcessor(pre, priority));
        const postprocessors = (config2.postprocessors || []).map((post) => this.makeProcessor(post, priority));
        const parser2 = config2.parser || "tex";
        return new _Configuration(name, config2[ConfigurationType.HANDLER] || {}, config2[ConfigurationType.FALLBACK] || {}, config2[ConfigurationType.ITEMS] || {}, config2[ConfigurationType.TAGS] || {}, config2[ConfigurationType.OPTIONS] || {}, config2[ConfigurationType.NODES] || {}, preprocessors, postprocessors, init2, conf, priority, parser2);
      }
      static create(name, config2 = {}) {
        const configuration = _Configuration._create(name, config2);
        ConfigurationHandler.set(name, configuration);
        return configuration;
      }
      static local(config2 = {}) {
        return _Configuration._create("", config2);
      }
      constructor(name, handler = {}, fallback = {}, items = {}, tags = {}, options3 = {}, nodes = {}, preprocessors = [], postprocessors = [], initMethod = null, configMethod = null, priority, parser2) {
        this.name = name;
        this.handler = handler;
        this.fallback = fallback;
        this.items = items;
        this.tags = tags;
        this.options = options3;
        this.nodes = nodes;
        this.preprocessors = preprocessors;
        this.postprocessors = postprocessors;
        this.initMethod = initMethod;
        this.configMethod = configMethod;
        this.priority = priority;
        this.parser = parser2;
        this.handler = Object.assign({
          [HandlerType.CHARACTER]: [],
          [HandlerType.DELIMITER]: [],
          [HandlerType.MACRO]: [],
          [HandlerType.ENVIRONMENT]: []
        }, handler);
      }
      get init() {
        return this.initMethod ? this.initMethod[0] : null;
      }
      get config() {
        return this.configMethod ? this.configMethod[0] : null;
      }
    };
    maps2 = /* @__PURE__ */ new Map();
    ConfigurationHandler = {
      set(name, map) {
        maps2.set(name, map);
      },
      get(name) {
        return maps2.get(name);
      },
      keys() {
        return maps2.keys();
      }
    };
    ParserConfiguration = class {
      constructor(packages, parsers = ["tex"]) {
        this.initMethod = new FunctionList();
        this.configMethod = new FunctionList();
        this.configurations = new PrioritizedList();
        this.parsers = [];
        this.handlers = new SubHandlers();
        this.items = {};
        this.tags = {};
        this.options = {};
        this.nodes = {};
        this.parsers = parsers;
        for (const pkg of packages.slice().reverse()) {
          this.addPackage(pkg);
        }
        for (const { item: config2, priority } of this.configurations) {
          this.append(config2, priority);
        }
      }
      init() {
        this.initMethod.execute(this);
      }
      config(jax) {
        this.configMethod.execute(this, jax);
        for (const config2 of this.configurations) {
          this.addFilters(jax, config2.item);
        }
      }
      addPackage(pkg) {
        const name = typeof pkg === "string" ? pkg : pkg[0];
        const conf = this.getPackage(name);
        if (conf) {
          this.configurations.add(conf, typeof pkg === "string" ? conf.priority : pkg[1]);
        }
      }
      add(name, jax, options3 = {}) {
        const config2 = this.getPackage(name);
        this.append(config2);
        this.configurations.add(config2, config2.priority);
        this.init();
        const parser2 = jax.parseOptions;
        parser2.nodeFactory.setCreators(config2.nodes);
        for (const kind of Object.keys(config2.items)) {
          parser2.itemFactory.setNodeClass(kind, config2.items[kind]);
        }
        TagsFactory.addTags(config2.tags);
        defaultOptions(parser2.options, config2.options);
        userOptions(parser2.options, options3);
        this.addFilters(jax, config2);
        if (config2.config) {
          config2.config(this, jax);
        }
      }
      getPackage(name) {
        const config2 = ConfigurationHandler.get(name);
        if (config2 && !this.parsers.includes(config2.parser)) {
          throw Error(`Package '${name}' doesn't target the proper parser`);
        }
        if (!config2) {
          this.warn(`Package '${name}' not found.  Omitted.`);
        }
        return config2;
      }
      append(config2, priority) {
        priority = priority || config2.priority;
        if (config2.initMethod) {
          this.initMethod.add(config2.initMethod[0], config2.initMethod[1]);
        }
        if (config2.configMethod) {
          this.configMethod.add(config2.configMethod[0], config2.configMethod[1]);
        }
        this.handlers.add(config2.handler, config2.fallback, priority);
        Object.assign(this.items, config2.items);
        Object.assign(this.tags, config2.tags);
        defaultOptions(this.options, config2.options);
        Object.assign(this.nodes, config2.nodes);
      }
      addFilters(jax, config2) {
        for (const [pre, priority] of config2.preprocessors) {
          jax.preFilters.add(pre, priority);
        }
        for (const [post, priority] of config2.postprocessors) {
          jax.postFilters.add(post, priority);
        }
      }
      warn(message) {
        console.warn("MathJax Warning: " + message);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/base/BaseItems.js
var StartItem;
var StopItem;
var OpenItem;
var CloseItem;
var NullItem;
var PrimeItem;
var SubsupItem;
var OverItem;
var LeftItem;
var Middle;
var RightItem;
var BreakItem;
var BeginItem;
var EndItem;
var StyleItem;
var PositionItem;
var CellItem;
var MmlItem;
var FnItem;
var NotItem;
var NonscriptItem;
var DotsItem;
var ArrayItem;
var EqnArrayItem;
var MstyleItem;
var EquationItem;
var init_BaseItems = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/base/BaseItems.js"() {
    init_MapHandler();
    init_Entities();
    init_MmlNode();
    init_TexError();
    init_ParseUtil();
    init_UnitUtil();
    init_NodeUtil();
    init_StackItem();
    init_Styles();
    init_TexConstants();
    StartItem = class extends BaseItem {
      constructor(factory, global) {
        super(factory);
        this.global = global;
      }
      get kind() {
        return "start";
      }
      get isOpen() {
        return true;
      }
      checkItem(item) {
        if (item.isKind("stop")) {
          let node = this.toMml();
          if (!this.global.isInner) {
            node = this.factory.configuration.tags.finalize(node, this.env);
          }
          return [[this.factory.create("mml", node)], true];
        }
        return super.checkItem(item);
      }
    };
    StopItem = class extends BaseItem {
      get kind() {
        return "stop";
      }
      get isClose() {
        return true;
      }
    };
    OpenItem = class extends BaseItem {
      get kind() {
        return "open";
      }
      get isOpen() {
        return true;
      }
      checkItem(item) {
        if (item.isKind("close")) {
          const mml = this.toMml();
          const node = this.create("node", "TeXAtom", [mml]);
          item.addLatexItem(node);
          return [[this.factory.create("mml", node)], true];
        }
        return super.checkItem(item);
      }
    };
    OpenItem.errors = Object.assign(Object.create(BaseItem.errors), {
      stop: ["ExtraOpenMissingClose", "Extra open brace or missing close brace"]
    });
    CloseItem = class extends BaseItem {
      get kind() {
        return "close";
      }
      get isClose() {
        return true;
      }
    };
    NullItem = class extends BaseItem {
      get kind() {
        return "null";
      }
    };
    PrimeItem = class extends BaseItem {
      get kind() {
        return "prime";
      }
      checkItem(item) {
        const [top0, top1] = this.Peek(2);
        const isSup = (NodeUtil_default.isType(top0, "msubsup") || NodeUtil_default.isType(top0, "msup")) && !NodeUtil_default.getChildAt(top0, top0.sup);
        const isOver = (NodeUtil_default.isType(top0, "munderover") || NodeUtil_default.isType(top0, "mover")) && !NodeUtil_default.getChildAt(top0, top0.over) && !NodeUtil_default.getProperty(top0, "subsupOK");
        if (!isSup && !isOver) {
          const node = this.create("node", top0.getProperty("movesupsub") ? "mover" : "msup", [top0, top1]);
          return [[node, item], true];
        }
        const pos = isSup ? top0.sup : top0.over;
        NodeUtil_default.setChild(top0, pos, top1);
        return [[top0, item], true];
      }
    };
    SubsupItem = class extends BaseItem {
      get kind() {
        return "subsup";
      }
      checkItem(item) {
        if (item.isKind("open") || item.isKind("left")) {
          return BaseItem.success;
        }
        const top = this.First;
        const position = this.getProperty("position");
        if (item.isKind("mml")) {
          if (this.getProperty("primes")) {
            if (position !== 2) {
              NodeUtil_default.setChild(top, 2, this.getProperty("primes"));
            } else {
              NodeUtil_default.setProperty(this.getProperty("primes"), "variantForm", true);
              const node = this.create("node", "mrow", [
                this.getProperty("primes"),
                item.First
              ]);
              item.First = node;
            }
          }
          NodeUtil_default.setChild(top, position, item.First);
          if (this.getProperty("movesupsub") != null) {
            NodeUtil_default.setProperty(top, "movesupsub", this.getProperty("movesupsub"));
          }
          const result = this.factory.create("mml", top);
          return [[result], true];
        }
        super.checkItem(item);
        const error = this.getErrors(["", "sub", "sup"][position]);
        throw new TexError_default(error[0], error[1], ...error.splice(2));
      }
    };
    SubsupItem.errors = Object.assign(Object.create(BaseItem.errors), {
      stop: ["MissingScript", "Missing superscript or subscript argument"],
      sup: ["MissingOpenForSup", "Missing open brace for superscript"],
      sub: ["MissingOpenForSub", "Missing open brace for subscript"]
    });
    OverItem = class extends BaseItem {
      constructor(factory) {
        super(factory);
        this.setProperty("name", "\\over");
      }
      get kind() {
        return "over";
      }
      get isClose() {
        return true;
      }
      checkItem(item) {
        if (item.isKind("over")) {
          throw new TexError_default("AmbiguousUseOf", "Ambiguous use of %1", item.getName());
        }
        if (item.isClose) {
          let mml = this.create("node", "mfrac", [
            this.getProperty("num"),
            this.toMml(false)
          ]);
          if (this.getProperty("thickness") != null) {
            NodeUtil_default.setAttribute(mml, "linethickness", this.getProperty("thickness"));
          }
          if (this.getProperty("ldelim") || this.getProperty("rdelim")) {
            NodeUtil_default.setProperty(mml, "withDelims", true);
            mml = ParseUtil.fixedFence(this.factory.configuration, this.getProperty("ldelim"), mml, this.getProperty("rdelim"));
          }
          mml.attributes.set(TexConstant.Attr.LATEXITEM, this.getProperty("name"));
          return [[this.factory.create("mml", mml), item], true];
        }
        return super.checkItem(item);
      }
      toString() {
        return "over[" + this.getProperty("num") + " / " + this.nodes.join("; ") + "]";
      }
    };
    LeftItem = class extends BaseItem {
      constructor(factory, delim) {
        super(factory);
        this.setProperty("delim", delim);
      }
      get kind() {
        return "left";
      }
      get isOpen() {
        return true;
      }
      checkItem(item) {
        if (item.isKind("right")) {
          const fenced = ParseUtil.fenced(this.factory.configuration, this.getProperty("delim"), this.toMml(), item.getProperty("delim"), "", item.getProperty("color"));
          const left = fenced.childNodes[0];
          const right = fenced.childNodes[fenced.childNodes.length - 1];
          const mrow = this.factory.create("mml", fenced);
          this.addLatexItem(left, "\\left");
          item.addLatexItem(right, "\\right");
          mrow.Peek()[0].attributes.set(TexConstant.Attr.LATEXITEM, "\\left" + item.startStr.slice(this.startI, item.stopI));
          return [[mrow], true];
        }
        if (item.isKind("middle")) {
          const def2 = { stretchy: true, symmetric: true };
          if (item.getProperty("color")) {
            def2.mathcolor = item.getProperty("color");
          }
          const middle = this.create("token", "mo", def2, item.getProperty("delim"));
          item.addLatexItem(middle, "\\middle");
          this.Push(this.create("node", "TeXAtom", [], { texClass: TEXCLASS.CLOSE }), middle, this.create("node", "TeXAtom", [], { texClass: TEXCLASS.OPEN }));
          this.env = {};
          return [[this], true];
        }
        return super.checkItem(item);
      }
    };
    LeftItem.errors = Object.assign(Object.create(BaseItem.errors), {
      stop: ["ExtraLeftMissingRight", "Extra \\left or missing \\right"]
    });
    Middle = class extends BaseItem {
      constructor(factory, delim, color) {
        super(factory);
        this.setProperty("delim", delim);
        if (color) {
          this.setProperty("color", color);
        }
      }
      get kind() {
        return "middle";
      }
      get isClose() {
        return true;
      }
    };
    RightItem = class extends BaseItem {
      constructor(factory, delim, color) {
        super(factory);
        this.setProperty("delim", delim);
        if (color) {
          this.setProperty("color", color);
        }
      }
      get kind() {
        return "right";
      }
      get isClose() {
        return true;
      }
    };
    BreakItem = class extends BaseItem {
      get kind() {
        return "break";
      }
      constructor(factory, linebreak, insert2) {
        super(factory);
        this.setProperty("linebreak", linebreak);
        this.setProperty("insert", insert2);
      }
      checkItem(item) {
        var _a2, _b2;
        const linebreak = this.getProperty("linebreak");
        if (item.isKind("mml")) {
          const mml2 = item.First;
          if (mml2.isKind("mo")) {
            const style = ((_b2 = (_a2 = NodeUtil_default.getOp(mml2)) === null || _a2 === void 0 ? void 0 : _a2[3]) === null || _b2 === void 0 ? void 0 : _b2.linebreakstyle) || NodeUtil_default.getAttribute(mml2, "linebreakstyle");
            if (style !== "after") {
              NodeUtil_default.setAttribute(mml2, "linebreak", linebreak);
              return [[item], true];
            }
            if (!this.getProperty("insert")) {
              return [[item], true];
            }
          }
        }
        const mml = this.create("token", "mspace", { linebreak });
        return [[this.factory.create("mml", mml), item], true];
      }
    };
    BeginItem = class extends BaseItem {
      get kind() {
        return "begin";
      }
      get isOpen() {
        return true;
      }
      checkItem(item) {
        if (item.isKind("end")) {
          if (item.getName() !== this.getName()) {
            throw new TexError_default("EnvBadEnd", "\\begin{%1} ended with \\end{%2}", this.getName(), item.getName());
          }
          const node = this.toMml();
          item.addLatexItem(node);
          return [[this.factory.create("mml", node)], true];
        }
        if (item.isKind("stop")) {
          throw new TexError_default("EnvMissingEnd", "Missing \\end{%1}", this.getName());
        }
        return super.checkItem(item);
      }
    };
    EndItem = class extends BaseItem {
      get kind() {
        return "end";
      }
      get isClose() {
        return true;
      }
    };
    StyleItem = class extends BaseItem {
      get kind() {
        return "style";
      }
      checkItem(item) {
        if (!item.isClose) {
          return super.checkItem(item);
        }
        const mml = this.create("node", "mstyle", this.nodes, this.getProperty("styles"));
        return [[this.factory.create("mml", mml), item], true];
      }
    };
    PositionItem = class extends BaseItem {
      get kind() {
        return "position";
      }
      checkItem(item) {
        if (item.isClose) {
          throw new TexError_default("MissingBoxFor", "Missing box for %1", this.getName());
        }
        if (item.isFinal) {
          let mml = item.toMml();
          switch (this.getProperty("move")) {
            case "vertical":
              mml = this.create("node", "mpadded", [mml], {
                height: this.getProperty("dh"),
                depth: this.getProperty("dd"),
                voffset: this.getProperty("dh")
              });
              return [[this.factory.create("mml", mml)], true];
            case "horizontal":
              return [
                [
                  this.factory.create("mml", this.getProperty("left")),
                  item,
                  this.factory.create("mml", this.getProperty("right"))
                ],
                true
              ];
          }
        }
        return super.checkItem(item);
      }
    };
    CellItem = class extends BaseItem {
      get kind() {
        return "cell";
      }
      get isClose() {
        return true;
      }
    };
    MmlItem = class extends BaseItem {
      get isFinal() {
        return true;
      }
      get kind() {
        return "mml";
      }
    };
    FnItem = class extends BaseItem {
      get kind() {
        return "fn";
      }
      checkItem(item) {
        const top = this.First;
        if (top) {
          if (item.isOpen) {
            return BaseItem.success;
          }
          if (!item.isKind("fn")) {
            let mml = item.First;
            if (!item.isKind("mml") || !mml) {
              return [[top, item], true];
            }
            if (NodeUtil_default.isType(mml, "mstyle") && mml.childNodes.length && NodeUtil_default.isType(mml.childNodes[0].childNodes[0], "mspace") || NodeUtil_default.isType(mml, "mspace")) {
              return [[top, item], true];
            }
            if (NodeUtil_default.isEmbellished(mml)) {
              mml = NodeUtil_default.getCoreMO(mml);
            }
            const form = NodeUtil_default.getForm(mml);
            if (form != null && [0, 0, 1, 1, 0, 1, 1, 0, 0, 0][form[2]]) {
              return [[top, item], true];
            }
          }
          if (top.isKind("TeXAtom") && top.isEmpty) {
            return [[top, item], true];
          }
          const node = this.create("token", "mo", { texClass: TEXCLASS.NONE }, entities.ApplyFunction);
          return [[top, node, item], true];
        }
        return super.checkItem(item);
      }
    };
    NotItem = class extends BaseItem {
      constructor() {
        super(...arguments);
        this.remap = MapHandler.getMap("not_remap");
      }
      get kind() {
        return "not";
      }
      checkItem(item) {
        let mml;
        let c;
        let textNode;
        if (item.isKind("open") || item.isKind("left")) {
          return BaseItem.success;
        }
        if (item.isKind("mml") && (NodeUtil_default.isType(item.First, "mo") || NodeUtil_default.isType(item.First, "mi") || NodeUtil_default.isType(item.First, "mtext"))) {
          mml = item.First;
          c = NodeUtil_default.getText(mml);
          if (c.length === 1 && !NodeUtil_default.getProperty(mml, "movesupsub") && NodeUtil_default.getChildren(mml).length === 1) {
            if (this.remap.contains(c)) {
              textNode = this.create("text", this.remap.lookup(c).char);
              NodeUtil_default.setChild(mml, 0, textNode);
            } else {
              textNode = this.create("text", "\u0338");
              NodeUtil_default.appendChildren(mml, [textNode]);
            }
            return [[item], true];
          }
        }
        textNode = this.create("text", "⧸");
        const mtextNode = this.create("node", "mtext", [], {}, textNode);
        const paddedNode = this.create("node", "mpadded", [mtextNode], {
          width: 0
        });
        mml = this.create("node", "TeXAtom", [paddedNode], {
          texClass: TEXCLASS.REL
        });
        return [[mml, item], true];
      }
    };
    NonscriptItem = class extends BaseItem {
      get kind() {
        return "nonscript";
      }
      checkItem(item) {
        if (item.isKind("mml") && item.Size() === 1) {
          let mml = item.First;
          if (mml.isKind("mstyle") && mml.notParent) {
            mml = NodeUtil_default.getChildren(NodeUtil_default.getChildren(mml)[0])[0];
          }
          if (mml.isKind("mspace")) {
            if (mml !== item.First) {
              const mrow = this.create("node", "mrow", [item.Pop()]);
              item.Push(mrow);
            }
            this.factory.configuration.addNode("nonscript", item.First);
          }
        }
        return [[item], true];
      }
    };
    DotsItem = class extends BaseItem {
      get kind() {
        return "dots";
      }
      checkItem(item) {
        if (item.isKind("open") || item.isKind("left")) {
          return BaseItem.success;
        }
        let dots = this.getProperty("ldots");
        const top = item.First;
        if (item.isKind("mml") && NodeUtil_default.isEmbellished(top)) {
          const tclass = NodeUtil_default.getTexClass(NodeUtil_default.getCoreMO(top));
          if (tclass === TEXCLASS.BIN || tclass === TEXCLASS.REL) {
            dots = this.getProperty("cdots");
          }
        }
        return [[dots, item], true];
      }
    };
    ArrayItem = class extends BaseItem {
      constructor() {
        super(...arguments);
        this.table = [];
        this.row = [];
        this.frame = [];
        this.hfill = [];
        this.arraydef = {};
        this.cstart = [];
        this.cend = [];
        this.cextra = [];
        this.atEnd = false;
        this.ralign = [];
        this.breakAlign = {
          cell: "",
          row: "",
          table: ""
        };
        this.templateSubs = 0;
      }
      get kind() {
        return "array";
      }
      get isOpen() {
        return true;
      }
      get copyEnv() {
        return false;
      }
      checkItem(item) {
        if (item.isClose && !item.isKind("over")) {
          if (item.getProperty("isEntry")) {
            this.EndEntry();
            this.clearEnv();
            this.StartEntry();
            return BaseItem.fail;
          }
          if (item.getProperty("isCR")) {
            this.EndEntry();
            this.EndRow();
            this.clearEnv();
            this.StartEntry();
            return BaseItem.fail;
          }
          this.EndTable();
          this.clearEnv();
          const newItem = this.factory.create("mml", this.createMml());
          if (this.getProperty("requireClose")) {
            if (item.isKind("close")) {
              return [[newItem], true];
            }
            throw new TexError_default("MissingCloseBrace", "Missing close brace");
          }
          return [[newItem, item], true];
        }
        return super.checkItem(item);
      }
      createMml() {
        const scriptlevel = this.arraydef["scriptlevel"];
        delete this.arraydef["scriptlevel"];
        let mml = this.create("node", "mtable", this.table, this.arraydef);
        if (scriptlevel) {
          mml.setProperty("smallmatrix", true);
        }
        if (this.breakAlign.table) {
          NodeUtil_default.setAttribute(mml, "data-break-align", this.breakAlign.table);
        }
        if (this.getProperty("arrayPadding")) {
          NodeUtil_default.setAttribute(mml, "data-frame-styles", "");
          NodeUtil_default.setAttribute(mml, "framespacing", this.getProperty("arrayPadding"));
        }
        mml = this.handleFrame(mml);
        if (scriptlevel !== void 0) {
          mml = this.create("node", "mstyle", [mml], { scriptlevel });
        }
        if (this.getProperty("open") || this.getProperty("close")) {
          mml = ParseUtil.fenced(this.factory.configuration, this.getProperty("open"), mml, this.getProperty("close"));
        }
        return mml;
      }
      handleFrame(mml) {
        if (!this.frame.length)
          return mml;
        const sides2 = new Map(this.frame);
        const fstyle = this.frame.reduce((fstyle2, [, style]) => style === fstyle2 ? style : "", this.frame[0][1]);
        if (fstyle) {
          if (this.frame.length === 4) {
            NodeUtil_default.setAttribute(mml, "frame", fstyle);
            NodeUtil_default.removeAttribute(mml, "data-frame-styles");
            return mml;
          }
          if (fstyle === "solid") {
            NodeUtil_default.setAttribute(mml, "data-frame-styles", "");
            mml = this.create("node", "menclose", [mml], {
              notation: Array.from(sides2.keys()).join(" "),
              "data-padding": 0
            });
            return mml;
          }
        }
        const styles = TRBL.map((side) => sides2.get(side) || "none").join(" ");
        NodeUtil_default.setAttribute(mml, "data-frame-styles", styles);
        return mml;
      }
      StartEntry() {
        const n = this.row.length;
        let start = this.cstart[n];
        let end = this.cend[n];
        const ralign = this.ralign[n];
        const cextra = this.cextra;
        if (!start && !end && !ralign && !cextra[n] && !cextra[n + 1])
          return;
        let [prefix, entry, term, found] = this.getEntry();
        if (cextra[n] && (!this.atEnd || cextra[n + 1])) {
          start += "&";
        }
        if (term !== "&") {
          found = !!entry.trim() || !!(n || term && term.substring(0, 4) !== "\\end");
          if (cextra[n + 1] && !cextra[n]) {
            end = (end || "") + "&";
            this.atEnd = true;
          }
        }
        if (!found && !prefix)
          return;
        const parser2 = this.parser;
        if (found) {
          if (start) {
            entry = ParseUtil.addArgs(parser2, start, entry);
          }
          if (end) {
            entry = ParseUtil.addArgs(parser2, entry, end);
          }
          if (ralign) {
            entry = "\\text{" + entry.trim() + "}";
          }
          if (start || end || ralign) {
            if (++this.templateSubs > parser2.configuration.options.maxTemplateSubtitutions) {
              throw new TexError_default("MaxTemplateSubs", "Maximum template substitutions exceeded; is there an invalid use of \\\\ in the template?");
            }
          }
        }
        if (prefix) {
          entry = ParseUtil.addArgs(parser2, prefix, entry);
        }
        parser2.string = ParseUtil.addArgs(parser2, entry, parser2.string);
        parser2.i = 0;
      }
      getEntry() {
        const parser2 = this.parser;
        const pattern = /^([^]*?)([&{}]|\\\\|\\(?:begin|end)\s*\{array\}|\\cr|\\)/;
        let braces = 0;
        let envs = 0;
        let i2 = parser2.i;
        let match;
        const fail2 = ["", "", "", false];
        while ((match = parser2.string.slice(i2).match(pattern)) !== null) {
          i2 += match[0].length;
          switch (match[2]) {
            case "\\":
              i2++;
              break;
            case "{":
              braces++;
              break;
            case "}":
              if (!braces)
                return fail2;
              braces--;
              break;
            case "\\begin{array}":
              if (!braces) {
                envs++;
              }
              break;
            case "\\end{array}":
              if (!braces && envs) {
                envs--;
                break;
              }
            default: {
              if (braces || envs)
                continue;
              i2 -= match[2].length;
              let entry = parser2.string.slice(parser2.i, i2).trim();
              const prefix = entry.match(/^(?:\s*\\(?:h(?:dash)?line|hfil{1,3}|rowcolor\s*\{.*?\}))+/);
              if (prefix) {
                entry = entry.slice(prefix[0].length);
              }
              parser2.string = parser2.string.slice(i2);
              parser2.i = 0;
              return [(prefix === null || prefix === void 0 ? void 0 : prefix[0]) || "", entry, match[2], true];
            }
          }
        }
        return fail2;
      }
      EndEntry() {
        const mtd = this.create("node", "mtd", this.nodes);
        if (this.hfill.length) {
          if (this.hfill[0] === 0) {
            NodeUtil_default.setAttribute(mtd, "columnalign", "right");
          }
          if (this.hfill[this.hfill.length - 1] === this.Size()) {
            NodeUtil_default.setAttribute(mtd, "columnalign", NodeUtil_default.getAttribute(mtd, "columnalign") ? "center" : "left");
          }
        }
        const ralign = this.ralign[this.row.length];
        if (ralign) {
          const [valign, cwidth, calign] = ralign;
          const box = this.create("node", "mpadded", mtd.childNodes[0].childNodes, {
            width: cwidth,
            "data-overflow": "auto",
            "data-align": calign,
            "data-vertical-align": valign
          });
          box.setProperty("vbox", valign);
          mtd.childNodes[0].childNodes = [];
          mtd.appendChild(box);
        } else if (this.breakAlign.cell) {
          NodeUtil_default.setAttribute(mtd, "data-vertical-align", this.breakAlign.cell);
        }
        this.breakAlign.cell = "";
        this.row.push(mtd);
        this.Clear();
        this.hfill = [];
      }
      EndRow() {
        let type = "mtr";
        if (this.getProperty("isNumbered") && this.row.length === 3) {
          this.row.unshift(this.row.pop());
          type = "mlabeledtr";
        } else if (this.getProperty("isLabeled")) {
          type = "mlabeledtr";
          this.setProperty("isLabeled", false);
        }
        const node = this.create("node", type, this.row);
        if (this.breakAlign.row) {
          NodeUtil_default.setAttribute(node, "data-break-align", this.breakAlign.row);
          this.breakAlign.row = "";
        }
        this.addLatexItem(node);
        this.table.push(node);
        this.row = [];
        this.atEnd = false;
      }
      EndTable() {
        if (this.Size() || this.row.length) {
          this.EndEntry();
          this.EndRow();
        }
        this.checkLines();
      }
      checkLines() {
        if (this.arraydef.rowlines) {
          const lines2 = this.arraydef.rowlines.split(/ /);
          if (lines2.length === this.table.length) {
            this.frame.push(["bottom", lines2.pop()]);
            if (lines2.length) {
              this.arraydef.rowlines = lines2.join(" ");
            } else {
              delete this.arraydef.rowlines;
            }
          } else if (lines2.length < this.table.length - 1) {
            this.arraydef.rowlines += " none";
          }
        }
        if (this.getProperty("rowspacing")) {
          const rows = this.arraydef.rowspacing.split(/ /);
          while (rows.length < this.table.length) {
            rows.push(this.getProperty("rowspacing") + "em");
          }
          this.arraydef.rowspacing = rows.join(" ");
        }
      }
      addRowSpacing(spacing) {
        if (this.arraydef["rowspacing"]) {
          const rows = this.arraydef["rowspacing"].split(/ /);
          if (!this.getProperty("rowspacing")) {
            const dimem = UnitUtil.dimen2em(rows[0]);
            this.setProperty("rowspacing", dimem);
          }
          const rowspacing = this.getProperty("rowspacing");
          while (rows.length < this.table.length) {
            rows.push(UnitUtil.em(rowspacing));
          }
          rows[this.table.length - 1] = UnitUtil.em(Math.max(0, rowspacing + UnitUtil.dimen2em(spacing)));
          this.arraydef["rowspacing"] = rows.join(" ");
        }
      }
    };
    EqnArrayItem = class extends ArrayItem {
      constructor(factory, ...args) {
        super(factory);
        this.maxrow = 0;
        this.factory.configuration.tags.start(args[0], args[2], args[1]);
      }
      get kind() {
        return "eqnarray";
      }
      EndEntry() {
        const calign = this.arraydef.columnalign.split(/ /);
        const align = this.row.length && calign.length ? calign[this.row.length % calign.length] : "right";
        if (align !== "right") {
          ParseUtil.fixInitialMO(this.factory.configuration, this.nodes);
        }
        super.EndEntry();
      }
      EndRow() {
        if (this.row.length > this.maxrow) {
          this.maxrow = this.row.length;
        }
        const tag3 = this.factory.configuration.tags.getTag();
        if (tag3) {
          this.row = [tag3].concat(this.row);
          this.setProperty("isLabeled", true);
        }
        this.factory.configuration.tags.clearTag();
        super.EndRow();
      }
      EndTable() {
        super.EndTable();
        this.factory.configuration.tags.end();
        this.extendArray("columnalign", this.maxrow);
        this.extendArray("columnwidth", this.maxrow);
        this.extendArray("columnspacing", this.maxrow - 1);
        this.extendArray("data-break-align", this.maxrow);
        this.addIndentshift();
      }
      extendArray(name, max2) {
        if (!this.arraydef[name])
          return;
        const repeat = this.arraydef[name].split(/ /);
        const columns = [...repeat];
        if (columns.length > 1) {
          while (columns.length < max2) {
            columns.push(...repeat);
          }
          this.arraydef[name] = columns.slice(0, max2).join(" ");
        }
      }
      addIndentshift() {
        const align = this.arraydef.columnalign.split(/ /);
        let prev = "";
        for (const i2 of align.keys()) {
          if (align[i2] === "left" && i2 > 0) {
            const indentshift = prev === "center" ? ".7em" : "2em";
            for (const row of this.table) {
              const cell = row.childNodes[row.isKind("mlabeledtr") ? i2 + 1 : i2];
              if (cell) {
                const mstyle = this.create("node", "mstyle", cell.childNodes[0].childNodes, { indentshift });
                cell.childNodes[0].childNodes = [];
                cell.appendChild(mstyle);
              }
            }
          }
          prev = align[i2];
        }
      }
    };
    MstyleItem = class extends BeginItem {
      get kind() {
        return "mstyle";
      }
      constructor(factory, attr, name) {
        super(factory);
        this.attrList = attr;
        this.setProperty("name", name);
      }
      checkItem(item) {
        if (item.isKind("end") && item.getName() === this.getName()) {
          const mml = this.create("node", "mstyle", [this.toMml()], this.attrList);
          return [[mml], true];
        }
        return super.checkItem(item);
      }
    };
    EquationItem = class extends BaseItem {
      constructor(factory, ...args) {
        super(factory);
        this.factory.configuration.tags.start("equation", true, args[0]);
      }
      get kind() {
        return "equation";
      }
      get isOpen() {
        return true;
      }
      checkItem(item) {
        if (item.isKind("end")) {
          const mml = this.toMml();
          const tag3 = this.factory.configuration.tags.getTag();
          this.factory.configuration.tags.end();
          return [
            [tag3 ? this.factory.configuration.tags.enTag(mml, tag3) : mml, item],
            true
          ];
        }
        if (item.isKind("stop")) {
          throw new TexError_default("EnvMissingEnd", "Missing \\end{%1}", this.getName());
        }
        return super.checkItem(item);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/util/lengths.js
function length2em(length4, size = 0, scale2 = 1, em2 = 16) {
  if (typeof length4 !== "string") {
    length4 = String(length4);
  }
  if (length4 === "" || length4 == null) {
    return size;
  }
  if (MATHSPACE[length4]) {
    return MATHSPACE[length4];
  }
  const match = length4.match(/^\s*([-+]?(?:\.\d+|\d+(?:\.\d*)?))?(pt|em|ex|mu|px|pc|in|mm|cm|%)?/);
  if (!match || match[0] === "") {
    return size;
  }
  const m = parseFloat(match[1] || "1");
  const unit = match[2];
  if (Object.hasOwn(UNITS, unit)) {
    return m * UNITS[unit] / em2 / scale2;
  }
  if (Object.hasOwn(RELUNITS, unit)) {
    return m * RELUNITS[unit];
  }
  if (unit === "%") {
    return m / 100 * size;
  }
  return m * size;
}
function percent(m) {
  return (100 * m).toFixed(1).replace(/\.?0+$/, "") + "%";
}
function em(m) {
  if (Math.abs(m) < 1e-3)
    return "0";
  return m.toFixed(3).replace(/\.?0+$/, "") + "em";
}
function px(m, M = -BIGDIMEN, em2 = 16) {
  m *= em2;
  if (M && m < M)
    m = M;
  if (Math.abs(m) < 0.1)
    return "0";
  return m.toFixed(1).replace(/\.0$/, "") + "px";
}
var BIGDIMEN;
var UNITS;
var RELUNITS;
var MATHSPACE;
var init_lengths = __esm({
  "node_modules/@mathjax/src/mjs/util/lengths.js"() {
    BIGDIMEN = 1e6;
    UNITS = {
      px: 1,
      "in": 96,
      cm: 96 / 2.54,
      mm: 96 / 25.4
    };
    RELUNITS = {
      em: 1,
      ex: 0.431,
      pt: 1 / 10,
      pc: 12 / 10,
      mu: 1 / 18
    };
    MATHSPACE = {
      veryverythinmathspace: 1 / 18,
      verythinmathspace: 2 / 18,
      thinmathspace: 3 / 18,
      mediummathspace: 4 / 18,
      thickmathspace: 5 / 18,
      verythickmathspace: 6 / 18,
      veryverythickmathspace: 7 / 18,
      negativeveryverythinmathspace: -1 / 18,
      negativeverythinmathspace: -2 / 18,
      negativethinmathspace: -3 / 18,
      negativemediummathspace: -4 / 18,
      negativethickmathspace: -5 / 18,
      negativeverythickmathspace: -6 / 18,
      negativeveryverythickmathspace: -7 / 18,
      thin: 0.04,
      medium: 0.06,
      thick: 0.1,
      normal: 1,
      big: 2,
      small: 1 / Math.sqrt(2),
      infinity: BIGDIMEN
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/base/BaseMethods.js
function splitAlignArray(align, n = Infinity) {
  const list3 = align.replace(/\s+/g, "").split("").map((s) => {
    const name = { t: "top", b: "bottom", m: "middle", c: "center" }[s];
    if (!name) {
      throw new TexError_default("BadBreakAlign", "Invalid alignment character: %1", s);
    }
    return name;
  });
  if (list3.length > n) {
    throw new TexError_default("TooManyAligns", "Too many alignment characters: %1", align);
  }
  return n === 1 ? list3[0] : list3.join(" ");
}
function parseRoot(parser2, n) {
  const env = parser2.stack.env;
  const inRoot = env["inRoot"];
  env["inRoot"] = true;
  const newParser = new TexParser(n, env, parser2.configuration);
  let node = newParser.mml();
  const global = newParser.stack.global;
  if (global["leftRoot"] || global["upRoot"]) {
    const def2 = {};
    if (global["leftRoot"]) {
      def2["width"] = global["leftRoot"];
    }
    if (global["upRoot"]) {
      def2["voffset"] = global["upRoot"];
      def2["height"] = global["upRoot"];
    }
    node = parser2.create("node", "mpadded", [node], def2);
  }
  env["inRoot"] = inRoot;
  return node;
}
var P_HEIGHT;
var MmlTokenAllow;
var BaseMethods;
var BaseMethods_default;
var init_BaseMethods = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/base/BaseMethods.js"() {
    init_HandlerTypes();
    init_BaseItems();
    init_NodeUtil();
    init_TexError();
    init_TexParser();
    init_TexConstants();
    init_ParseUtil();
    init_UnitUtil();
    init_MmlNode();
    init_mo();
    init_Tags();
    init_lengths();
    init_Entities();
    init_Options();
    init_string();
    P_HEIGHT = 1.2 / 0.85;
    MmlTokenAllow = {
      fontfamily: 1,
      fontsize: 1,
      fontweight: 1,
      fontstyle: 1,
      color: 1,
      background: 1,
      id: 1,
      class: 1,
      href: 1,
      style: 1
    };
    BaseMethods = {
      Open(parser2, _c) {
        parser2.Push(parser2.itemFactory.create("open"));
      },
      Close(parser2, _c) {
        parser2.Push(parser2.itemFactory.create("close"));
      },
      Bar(parser2, c) {
        const mo = parser2.create("token", "mo", { stretchy: false, texClass: TEXCLASS.ORD }, c);
        mo.setProperty("keep-attrs", "stretchy");
        parser2.Push(mo);
      },
      Tilde(parser2, _c) {
        parser2.Push(parser2.create("token", "mtext", {}, entities.nbsp));
      },
      Space(_parser, _c) {
      },
      Superscript(parser2, _c) {
        if (parser2.GetNext().match(/\d/)) {
          parser2.string = parser2.string.substring(0, parser2.i + 1) + " " + parser2.string.substring(parser2.i + 1);
        }
        let primes;
        let base;
        const top = parser2.stack.Top();
        if (top.isKind("prime")) {
          [base, primes] = top.Peek(2);
          parser2.stack.Pop();
        } else {
          base = parser2.stack.Prev();
          if (!base) {
            base = parser2.create("token", "mi", {}, "");
          }
        }
        const movesupsub = NodeUtil_default.getProperty(base, "movesupsub");
        let position = NodeUtil_default.isType(base, "msubsup") ? base.sup : base.over;
        if (NodeUtil_default.isType(base, "msubsup") && !NodeUtil_default.isType(base, "msup") && NodeUtil_default.getChildAt(base, base.sup) || NodeUtil_default.isType(base, "munderover") && !NodeUtil_default.isType(base, "mover") && NodeUtil_default.getChildAt(base, base.over) && !NodeUtil_default.getProperty(base, "subsupOK")) {
          throw new TexError_default("DoubleExponent", "Double exponent: use braces to clarify");
        }
        if (!NodeUtil_default.isType(base, "msubsup") || NodeUtil_default.isType(base, "msup")) {
          if (movesupsub) {
            if (!NodeUtil_default.isType(base, "munderover") || NodeUtil_default.isType(base, "mover") || NodeUtil_default.getChildAt(base, base.over)) {
              base = parser2.create("node", "munderover", [base], {
                movesupsub: true
              });
            }
            position = base.over;
          } else {
            base = parser2.create("node", "msubsup", [base]);
            position = base.sup;
          }
        }
        parser2.Push(parser2.itemFactory.create("subsup", base).setProperties({
          position,
          primes,
          movesupsub
        }));
      },
      Subscript(parser2, _c) {
        if (parser2.GetNext().match(/\d/)) {
          parser2.string = parser2.string.substring(0, parser2.i + 1) + " " + parser2.string.substring(parser2.i + 1);
        }
        let primes, base;
        const top = parser2.stack.Top();
        if (top.isKind("prime")) {
          [base, primes] = top.Peek(2);
          parser2.stack.Pop();
        } else {
          base = parser2.stack.Prev();
          if (!base) {
            base = parser2.create("token", "mi", {}, "");
          }
        }
        const movesupsub = NodeUtil_default.getProperty(base, "movesupsub");
        let position = NodeUtil_default.isType(base, "msubsup") ? base.sub : base.under;
        if (NodeUtil_default.isType(base, "msubsup") && !NodeUtil_default.isType(base, "msup") && NodeUtil_default.getChildAt(base, base.sub) || NodeUtil_default.isType(base, "munderover") && !NodeUtil_default.isType(base, "mover") && NodeUtil_default.getChildAt(base, base.under) && !NodeUtil_default.getProperty(base, "subsupOK")) {
          throw new TexError_default("DoubleSubscripts", "Double subscripts: use braces to clarify");
        }
        if (!NodeUtil_default.isType(base, "msubsup") || NodeUtil_default.isType(base, "msup")) {
          if (movesupsub) {
            if (!NodeUtil_default.isType(base, "munderover") || NodeUtil_default.isType(base, "mover") || NodeUtil_default.getChildAt(base, base.under)) {
              base = parser2.create("node", "munderover", [base], {
                movesupsub: true
              });
            }
            position = base.under;
          } else {
            base = parser2.create("node", "msubsup", [base]);
            position = base.sub;
          }
        }
        parser2.Push(parser2.itemFactory.create("subsup", base).setProperties({
          position,
          primes,
          movesupsub
        }));
      },
      Prime(parser2, c) {
        let base = parser2.stack.Prev();
        if (!base) {
          base = parser2.create("token", "mi");
        }
        if (NodeUtil_default.isType(base, "msubsup") && !NodeUtil_default.isType(base, "msup") && NodeUtil_default.getChildAt(base, base.sup) || NodeUtil_default.isType(base, "munderover") && !NodeUtil_default.isType(base, "mover") && NodeUtil_default.getChildAt(base, base.over) && !NodeUtil_default.getProperty(base, "subsupOK")) {
          throw new TexError_default("DoubleExponentPrime", "Prime causes double exponent: use braces to clarify");
        }
        let sup = "";
        parser2.i--;
        do {
          sup += entities.prime;
          parser2.i++;
          c = parser2.GetNext();
        } while (c === "'" || c === entities.rsquo);
        sup = ["", "′", "″", "‴", "⁗"][sup.length] || sup;
        const node = parser2.create("token", "mo", { variantForm: true }, sup);
        parser2.Push(parser2.itemFactory.create("prime", base, node));
      },
      Comment(parser2, _c) {
        while (parser2.i < parser2.string.length && parser2.string.charAt(parser2.i) !== "\n") {
          parser2.i++;
        }
      },
      Hash(_parser, _c) {
        throw new TexError_default("CantUseHash1", "You can't use 'macro parameter character #' in math mode");
      },
      MathFont(parser2, name, variant, italic2 = "") {
        const text = parser2.GetArgument(name);
        const mml = new TexParser(text, Object.assign(Object.assign({ multiLetterIdentifiers: parser2.options.identifierPattern }, parser2.stack.env), { font: variant, italicFont: italic2, noAutoOP: true }), parser2.configuration).mml();
        parser2.Push(parser2.create("node", "TeXAtom", [mml]));
      },
      SetFont(parser2, _name, font) {
        parser2.stack.env["font"] = font;
        parser2.Push(parser2.itemFactory.create("null"));
      },
      SetStyle(parser2, _name, texStyle, style, level) {
        parser2.stack.env["style"] = texStyle;
        parser2.stack.env["level"] = level;
        parser2.Push(parser2.itemFactory.create("style").setProperty("styles", { displaystyle: style, scriptlevel: level }));
      },
      SetSize(parser2, _name, size) {
        parser2.stack.env["size"] = size;
        parser2.Push(parser2.itemFactory.create("style").setProperty("styles", { mathsize: em(size) }));
      },
      Spacer(parser2, _name, space) {
        const node = parser2.create("node", "mspace", [], { width: em(space) });
        const style = parser2.create("node", "mstyle", [node], { scriptlevel: 0 });
        parser2.Push(style);
      },
      DiscretionaryTimes(parser2, _name) {
        parser2.Push(parser2.create("token", "mo", { linebreakmultchar: "×" }, "\u2062"));
      },
      AllowBreak(parser2, _name) {
        parser2.Push(parser2.create("token", "mspace"));
      },
      Break(parser2, _name) {
        parser2.Push(parser2.create("token", "mspace", {
          linebreak: TexConstant.LineBreak.NEWLINE
        }));
      },
      Linebreak(parser2, _name, linebreak) {
        let insert2 = true;
        const prev = parser2.stack.Prev(true);
        if (prev && prev.isKind("mo")) {
          const style = NodeUtil_default.getMoAttribute(prev, "linebreakstyle");
          if (style !== TexConstant.LineBreakStyle.BEFORE) {
            prev.attributes.set("linebreak", linebreak);
            insert2 = false;
          }
        }
        parser2.Push(parser2.itemFactory.create("break", linebreak, insert2));
      },
      LeftRight(parser2, name) {
        const first = name.substring(1);
        parser2.Push(parser2.itemFactory.create(first, parser2.GetDelimiter(name), parser2.stack.env.color));
      },
      NamedFn(parser2, name, id) {
        if (!id) {
          id = name.substring(1);
        }
        const mml = parser2.create("token", "mi", { texClass: TEXCLASS.OP }, id);
        parser2.Push(parser2.itemFactory.create("fn", mml));
      },
      NamedOp(parser2, name, id) {
        if (!id) {
          id = name.substring(1);
        }
        id = id.replace(/&thinsp;/, "\u2006");
        const mml = parser2.create("token", "mo", {
          movablelimits: true,
          movesupsub: true,
          form: TexConstant.Form.PREFIX,
          texClass: TEXCLASS.OP
        }, id);
        parser2.Push(mml);
      },
      Limits(parser2, _name, limits) {
        let op = parser2.stack.Prev(true);
        if (!op || NodeUtil_default.getTexClass(NodeUtil_default.getCoreMO(op)) !== TEXCLASS.OP && NodeUtil_default.getProperty(op, "movesupsub") == null) {
          throw new TexError_default("MisplacedLimits", "%1 is allowed only on operators", parser2.currentCS);
        }
        const top = parser2.stack.Top();
        let node;
        if (NodeUtil_default.isType(op, "munderover") && !limits) {
          node = parser2.create("node", "msubsup");
          NodeUtil_default.copyChildren(op, node);
          op = top.First = node;
        } else if (NodeUtil_default.isType(op, "msubsup") && limits) {
          node = parser2.create("node", "munderover");
          NodeUtil_default.copyChildren(op, node);
          op = top.First = node;
        }
        NodeUtil_default.setProperty(op, "movesupsub", limits ? true : false);
        NodeUtil_default.setProperties(NodeUtil_default.getCoreMO(op), { movablelimits: false });
        if ((NodeUtil_default.isType(op, "mo") ? NodeUtil_default.getMoAttribute(op, "movableLimits") : NodeUtil_default.getAttribute(op, "movablelimits")) || NodeUtil_default.getProperty(op, "movablelimits")) {
          NodeUtil_default.setProperties(op, { movablelimits: false });
        }
      },
      Over(parser2, name, open, close) {
        const mml = parser2.itemFactory.create("over").setProperty("name", parser2.currentCS);
        if (open || close) {
          mml.setProperty("ldelim", open);
          mml.setProperty("rdelim", close);
        } else if (name.match(/withdelims$/)) {
          mml.setProperty("ldelim", parser2.GetDelimiter(name));
          mml.setProperty("rdelim", parser2.GetDelimiter(name));
        }
        if (name.match(/^\\above/)) {
          mml.setProperty("thickness", parser2.GetDimen(name));
        } else if (name.match(/^\\atop/) || open || close) {
          mml.setProperty("thickness", 0);
        }
        parser2.Push(mml);
      },
      Frac(parser2, name) {
        const num3 = parser2.ParseArg(name);
        const den = parser2.ParseArg(name);
        const node = parser2.create("node", "mfrac", [num3, den]);
        parser2.Push(node);
      },
      Sqrt(parser2, name) {
        const n = parser2.GetBrackets(name);
        let arg = parser2.GetArgument(name);
        if (arg === "\\frac") {
          arg += "{" + parser2.GetArgument(arg) + "}{" + parser2.GetArgument(arg) + "}";
        }
        let mml = new TexParser(arg, parser2.stack.env, parser2.configuration).mml();
        if (!n) {
          mml = parser2.create("node", "msqrt", [mml]);
        } else {
          mml = parser2.create("node", "mroot", [mml, parseRoot(parser2, n)]);
        }
        parser2.Push(mml);
      },
      Root(parser2, name) {
        const n = parser2.GetUpTo(name, "\\of");
        const arg = parser2.ParseArg(name);
        const node = parser2.create("node", "mroot", [arg, parseRoot(parser2, n)]);
        parser2.Push(node);
      },
      MoveRoot(parser2, name, id) {
        if (!parser2.stack.env["inRoot"]) {
          throw new TexError_default("MisplacedMoveRoot", "%1 can appear only within a root", parser2.currentCS);
        }
        if (parser2.stack.global[id]) {
          throw new TexError_default("MultipleMoveRoot", "Multiple use of %1", parser2.currentCS);
        }
        let n = parser2.GetArgument(name);
        if (!n.match(/-?[0-9]+/)) {
          throw new TexError_default("IntegerArg", "The argument to %1 must be an integer", parser2.currentCS);
        }
        n = parseInt(n, 10) / 15 + "em";
        if (n.substring(0, 1) !== "-") {
          n = "+" + n;
        }
        parser2.stack.global[id] = n;
      },
      Accent(parser2, name, accent, stretchy) {
        const c = parser2.ParseArg(name);
        const def2 = Object.assign(Object.assign({}, ParseUtil.getFontDef(parser2)), { accent: true, mathaccent: stretchy === void 0 ? true : stretchy });
        const entity = NodeUtil_default.createEntity(accent);
        const mml = parser2.create("token", "mo", def2, entity);
        NodeUtil_default.setAttribute(mml, "stretchy", stretchy ? true : false);
        const mo = NodeUtil_default.isEmbellished(c) ? NodeUtil_default.getCoreMO(c) : c;
        if (NodeUtil_default.isType(mo, "mo") || NodeUtil_default.getProperty(mo, "movablelimits")) {
          NodeUtil_default.setProperties(mo, { movablelimits: false });
        }
        const muoNode = parser2.create("node", "munderover");
        NodeUtil_default.setChild(muoNode, 0, c);
        NodeUtil_default.setChild(muoNode, 1, null);
        NodeUtil_default.setChild(muoNode, 2, mml);
        const texAtom = parser2.create("node", "TeXAtom", [muoNode]);
        parser2.Push(texAtom);
      },
      UnderOver(parser2, name, c, stack2) {
        const entity = NodeUtil_default.createEntity(c);
        const mo = parser2.create("token", "mo", { stretchy: true, accent: true }, entity);
        if (entity.match(MmlMo.mathaccentsWithWidth)) {
          mo.setProperty("mathaccent", false);
        }
        const pos = name.charAt(1) === "o" ? "over" : "under";
        const base = parser2.ParseArg(name);
        parser2.Push(ParseUtil.underOver(parser2, base, mo, pos, stack2));
      },
      Overset(parser2, name) {
        const top = parser2.ParseArg(name);
        const base = parser2.ParseArg(name);
        const topMo = top.coreMO();
        const accent = topMo.isKind("mo") && NodeUtil_default.getMoAttribute(topMo, "accent") === true;
        ParseUtil.checkMovableLimits(base);
        const node = parser2.create("node", "mover", [base, top], { accent });
        parser2.Push(node);
      },
      Underset(parser2, name) {
        const bot = parser2.ParseArg(name);
        const base = parser2.ParseArg(name);
        const botMo = bot.coreMO();
        const accentunder = botMo.isKind("mo") && NodeUtil_default.getMoAttribute(botMo, "accent") === true;
        ParseUtil.checkMovableLimits(base);
        const node = parser2.create("node", "munder", [base, bot], { accentunder });
        parser2.Push(node);
      },
      Overunderset(parser2, name) {
        const top = parser2.ParseArg(name);
        const bot = parser2.ParseArg(name);
        const base = parser2.ParseArg(name);
        const topMo = top.coreMO();
        const botMo = bot.coreMO();
        const accent = topMo.isKind("mo") && NodeUtil_default.getMoAttribute(topMo, "accent") === true;
        const accentunder = botMo.isKind("mo") && NodeUtil_default.getMoAttribute(botMo, "accent") === true;
        ParseUtil.checkMovableLimits(base);
        const node = parser2.create("node", "munderover", [base, bot, top], {
          accent,
          accentunder
        });
        parser2.Push(node);
      },
      TeXAtom(parser2, name, mclass) {
        const def2 = { texClass: mclass };
        let mml;
        let node;
        if (mclass === TEXCLASS.OP) {
          def2["movesupsub"] = def2["movablelimits"] = true;
          const arg = parser2.GetArgument(name);
          const match = arg.match(/^\s*\\rm\s+([a-zA-Z0-9 ]+)$/);
          if (match) {
            def2["mathvariant"] = TexConstant.Variant.NORMAL;
            node = parser2.create("token", "mi", def2, match[1]);
          } else {
            const parsed = new TexParser(arg, parser2.stack.env, parser2.configuration).mml();
            node = parser2.create("node", "TeXAtom", [parsed], def2);
          }
          mml = parser2.itemFactory.create("fn", node);
        } else {
          mml = parser2.create("node", "TeXAtom", [parser2.ParseArg(name)], def2);
        }
        parser2.Push(mml);
      },
      VBox(parser2, name, align) {
        const arg = new TexParser(parser2.GetArgument(name), parser2.stack.env, parser2.configuration);
        const def2 = {
          "data-vertical-align": align,
          texClass: TEXCLASS.ORD
        };
        if (arg.stack.env.hsize) {
          def2.width = arg.stack.env.hsize;
          def2["data-overflow"] = "linebreak";
        }
        const mml = parser2.create("node", "mpadded", [arg.mml()], def2);
        mml.setProperty("vbox", align);
        parser2.Push(mml);
      },
      Hsize(parser2, name) {
        if (parser2.GetNext() === "=") {
          parser2.i++;
        }
        parser2.stack.env.hsize = parser2.GetDimen(name);
        parser2.Push(parser2.itemFactory.create("null"));
      },
      ParBox(parser2, name) {
        const c = parser2.GetBrackets(name, "c");
        const width = parser2.GetDimen(name);
        const text = ParseUtil.internalMath(parser2, parser2.GetArgument(name));
        const align = splitAlignArray(c, 1);
        const mml = parser2.create("node", "mpadded", text, {
          width,
          "data-overflow": "linebreak",
          "data-vertical-align": align
        });
        mml.setProperty("vbox", align);
        parser2.Push(mml);
      },
      BreakAlign(parser2, name) {
        const top = parser2.stack.Top();
        if (!(top instanceof ArrayItem)) {
          throw new TexError_default("BreakNotInArray", "%1 must be used in an alignment environment", parser2.currentCS);
        }
        const type = parser2.GetArgument(name).trim();
        switch (type) {
          case "c":
            if (top.First) {
              throw new TexError_default("BreakFirstInEntry", "%1 must be at the beginning of an alignment entry", parser2.currentCS + "{c}");
            }
            top.breakAlign.cell = splitAlignArray(parser2.GetArgument(name), 1);
            break;
          case "r":
            if (top.row.length || top.First) {
              throw new TexError_default("BreakFirstInRow", "%1 must be at the beginning of an alignment row", parser2.currentCS + "{r}");
            }
            top.breakAlign.row = splitAlignArray(parser2.GetArgument(name));
            break;
          case "t":
            if (top.table.length || top.row.length || top.First) {
              throw new TexError_default("BreakFirstInTable", "%1 must be at the beginning of an alignment", parser2.currentCS + "{t}");
            }
            top.breakAlign.table = splitAlignArray(parser2.GetArgument(name));
            break;
          default:
            throw new TexError_default("BreakType", "First argument to %1 must be one of c, r, or t", parser2.currentCS);
        }
      },
      MmlToken(parser2, name) {
        const kind = parser2.GetArgument(name);
        let attr = parser2.GetBrackets(name, "").replace(/^\s+/, "");
        const text = parser2.GetArgument(name);
        const def2 = {};
        const keep = [];
        let node;
        try {
          node = parser2.create("node", kind);
        } catch (_e) {
          node = null;
        }
        if (!node || !node.isToken) {
          throw new TexError_default("NotMathMLToken", "%1 is not a token element", kind);
        }
        while (attr !== "") {
          const match = attr.match(/^([a-z]+)\s*=\s*('[^'\n]*'|"[^"\n]*"|[^ ,\n]*)[\s\n]*,?[\s\n]*/i);
          if (!match) {
            throw new TexError_default("InvalidMathMLAttr", "Invalid MathML attribute: %1", attr.split(/[\s\n=]/)[0]);
          }
          if (!node.attributes.hasDefault(match[1]) && !MmlTokenAllow[match[1]]) {
            throw new TexError_default("UnknownAttrForElement", "%1 is not a recognized attribute for %2", match[1], kind);
          }
          let value = ParseUtil.mmlFilterAttribute(parser2, match[1], match[2].replace(/^(['"])(.*)\1$/, "$2"));
          if (value) {
            if (value.toLowerCase() === "true") {
              value = true;
            } else if (value.toLowerCase() === "false") {
              value = false;
            }
            def2[match[1]] = value;
            keep.push(match[1]);
          }
          attr = attr.substring(match[0].length);
        }
        if (keep.length) {
          node.setProperty("keep-attrs", keep.join(" "));
        }
        const textNode = parser2.create("text", replaceUnicode(text));
        node.appendChild(textNode);
        NodeUtil_default.setProperties(node, def2);
        parser2.Push(node);
      },
      Strut(parser2, _name) {
        const row = parser2.create("node", "mrow");
        const padded2 = parser2.create("node", "mpadded", [row], {
          height: "8.6pt",
          depth: "3pt",
          width: 0
        });
        parser2.Push(padded2);
      },
      Phantom(parser2, name, v, h) {
        let box = parser2.create("node", "mphantom", [parser2.ParseArg(name)]);
        if (v || h) {
          box = parser2.create("node", "mpadded", [box]);
          if (h) {
            NodeUtil_default.setAttribute(box, "height", 0);
            NodeUtil_default.setAttribute(box, "depth", 0);
          }
          if (v) {
            NodeUtil_default.setAttribute(box, "width", 0);
          }
        }
        const atom = parser2.create("node", "TeXAtom", [box]);
        parser2.Push(atom);
      },
      Smash(parser2, name) {
        const bt = UnitUtil.trimSpaces(parser2.GetBrackets(name, ""));
        const smash = parser2.create("node", "mpadded", [parser2.ParseArg(name)]);
        switch (bt) {
          case "b":
            NodeUtil_default.setAttribute(smash, "depth", 0);
            break;
          case "t":
            NodeUtil_default.setAttribute(smash, "height", 0);
            break;
          default:
            NodeUtil_default.setAttribute(smash, "height", 0);
            NodeUtil_default.setAttribute(smash, "depth", 0);
        }
        const atom = parser2.create("node", "TeXAtom", [smash]);
        parser2.Push(atom);
      },
      Lap(parser2, name) {
        const mml = parser2.create("node", "mpadded", [parser2.ParseArg(name)], {
          width: 0
        });
        if (name === "\\llap") {
          NodeUtil_default.setAttribute(mml, "lspace", "-1width");
        }
        const atom = parser2.create("node", "TeXAtom", [mml]);
        parser2.Push(atom);
      },
      RaiseLower(parser2, name) {
        let h = parser2.GetDimen(name);
        const item = parser2.itemFactory.create("position").setProperties({ name: parser2.currentCS, move: "vertical" });
        if (h.charAt(0) === "-") {
          h = h.slice(1);
          name = name.substring(1) === "raise" ? "\\lower" : "\\raise";
        }
        if (name === "\\lower") {
          item.setProperty("dh", "-" + h);
          item.setProperty("dd", "+" + h);
        } else {
          item.setProperty("dh", "+" + h);
          item.setProperty("dd", "-" + h);
        }
        parser2.Push(item);
      },
      MoveLeftRight(parser2, name) {
        let h = parser2.GetDimen(name);
        let nh = h.charAt(0) === "-" ? h.slice(1) : "-" + h;
        if (name === "\\moveleft") {
          const tmp = h;
          h = nh;
          nh = tmp;
        }
        parser2.Push(parser2.itemFactory.create("position").setProperties({
          name: parser2.currentCS,
          move: "horizontal",
          left: parser2.create("node", "mspace", [], { width: h }),
          right: parser2.create("node", "mspace", [], { width: nh })
        }));
      },
      Hskip(parser2, name, nobreak = false) {
        const node = parser2.create("node", "mspace", [], {
          width: parser2.GetDimen(name)
        });
        if (nobreak) {
          NodeUtil_default.setAttribute(node, "linebreak", "nobreak");
        }
        parser2.Push(node);
      },
      Nonscript(parser2, _name) {
        parser2.Push(parser2.itemFactory.create("nonscript"));
      },
      Rule(parser2, name, style) {
        const w = parser2.GetDimen(name), h = parser2.GetDimen(name), d = parser2.GetDimen(name);
        const def2 = { width: w, height: h, depth: d };
        if (style !== "blank") {
          def2["mathbackground"] = parser2.stack.env["color"] || "black";
        }
        const node = parser2.create("node", "mspace", [], def2);
        parser2.Push(node);
      },
      rule(parser2, name) {
        const v = parser2.GetBrackets(name), w = parser2.GetDimen(name), h = parser2.GetDimen(name);
        let mml = parser2.create("node", "mspace", [], {
          width: w,
          height: h,
          mathbackground: parser2.stack.env["color"] || "black"
        });
        if (v) {
          mml = parser2.create("node", "mpadded", [mml], { voffset: v });
          if (v.match(/^-/)) {
            NodeUtil_default.setAttribute(mml, "height", v);
            NodeUtil_default.setAttribute(mml, "depth", "+" + v.substring(1));
          } else {
            NodeUtil_default.setAttribute(mml, "height", "+" + v);
          }
        }
        parser2.Push(mml);
      },
      MakeBig(parser2, name, mclass, size) {
        size *= P_HEIGHT;
        const sizeStr = String(size).replace(/(\.\d\d\d).+/, "$1") + "em";
        const delim = parser2.GetDelimiter(name, true);
        const mo = parser2.create("token", "mo", {
          minsize: sizeStr,
          maxsize: sizeStr,
          fence: true,
          stretchy: true,
          symmetric: true
        }, delim);
        const node = parser2.create("node", "TeXAtom", [mo], { texClass: mclass });
        parser2.Push(node);
      },
      BuildRel(parser2, name) {
        const top = parser2.ParseUpTo(name, "\\over");
        const bot = parser2.ParseArg(name);
        const node = parser2.create("node", "munderover");
        NodeUtil_default.setChild(node, 0, bot);
        NodeUtil_default.setChild(node, 1, null);
        NodeUtil_default.setChild(node, 2, top);
        const atom = parser2.create("node", "TeXAtom", [node], {
          texClass: TEXCLASS.REL
        });
        parser2.Push(atom);
      },
      HBox(parser2, name, style, font) {
        parser2.PushAll(ParseUtil.internalMath(parser2, parser2.GetArgument(name), style, font));
      },
      FBox(parser2, name) {
        const internal = ParseUtil.internalMath(parser2, parser2.GetArgument(name));
        const node = parser2.create("node", "menclose", internal, {
          notation: "box"
        });
        parser2.Push(node);
      },
      FrameBox(parser2, name) {
        const width = parser2.GetBrackets(name);
        const pos = parser2.GetBrackets(name) || "c";
        let mml = ParseUtil.internalMath(parser2, parser2.GetArgument(name));
        if (width) {
          mml = [
            parser2.create("node", "mpadded", mml, {
              width,
              "data-align": lookup(pos, { l: "left", r: "right" }, "center")
            })
          ];
        }
        const node = parser2.create("node", "TeXAtom", [parser2.create("node", "menclose", mml, { notation: "box" })], { texClass: TEXCLASS.ORD });
        parser2.Push(node);
      },
      MakeBox(parser2, name) {
        const width = parser2.GetBrackets(name);
        const pos = parser2.GetBrackets(name, "c");
        const mml = parser2.create("node", "mpadded", ParseUtil.internalMath(parser2, parser2.GetArgument(name)));
        if (width) {
          NodeUtil_default.setAttribute(mml, "width", width);
        }
        const align = lookup(pos.toLowerCase(), { c: "center", r: "right" }, "");
        if (align) {
          NodeUtil_default.setAttribute(mml, "data-align", align);
        }
        if (pos.toLowerCase() !== pos) {
          NodeUtil_default.setAttribute(mml, "data-overflow", "linebreak");
        }
        parser2.Push(mml);
      },
      Not(parser2, _name) {
        parser2.Push(parser2.itemFactory.create("not"));
      },
      Dots(parser2, _name) {
        const ldotsEntity = NodeUtil_default.createEntity("2026");
        const cdotsEntity = NodeUtil_default.createEntity("22EF");
        const ldots = parser2.create("token", "mo", { stretchy: false }, ldotsEntity);
        const cdots = parser2.create("token", "mo", { stretchy: false }, cdotsEntity);
        parser2.Push(parser2.itemFactory.create("dots").setProperties({
          ldots,
          cdots
        }));
      },
      Matrix(parser2, _name, open, close, align, spacing, vspacing, style, cases, numbered) {
        const c = parser2.GetNext();
        if (c === "") {
          throw new TexError_default("MissingArgFor", "Missing argument for %1", parser2.currentCS);
        }
        if (c === "{") {
          parser2.i++;
        } else {
          parser2.string = c + "}" + parser2.string.slice(parser2.i + 1);
          parser2.i = 0;
        }
        const array = parser2.itemFactory.create("array").setProperty("requireClose", true);
        if (open || !align) {
          array.setProperty("arrayPadding", ".2em .125em");
        }
        array.arraydef = {
          rowspacing: vspacing || "4pt",
          columnspacing: spacing || "1em"
        };
        if (cases) {
          array.setProperty("isCases", true);
        }
        if (numbered) {
          array.setProperty("isNumbered", true);
          array.arraydef.side = numbered;
        }
        if (open || close) {
          array.setProperty("open", open);
          array.setProperty("close", close);
        }
        if (style === "D") {
          array.arraydef.displaystyle = true;
        }
        if (align != null) {
          array.arraydef.columnalign = align;
        }
        parser2.Push(array);
      },
      Entry(parser2, name) {
        parser2.Push(parser2.itemFactory.create("cell").setProperties({ isEntry: true, name }));
        const top = parser2.stack.Top();
        const env = top.getProperty("casesEnv");
        const cases = top.getProperty("isCases");
        if (!cases && !env)
          return;
        const str = parser2.string;
        let braces = 0;
        let close = -1;
        let i2 = parser2.i;
        let m = str.length;
        const end = env ? new RegExp(`^\\\\end\\s*\\{${env.replace(/\*/, "\\*")}\\}`) : null;
        while (i2 < m) {
          const c = str.charAt(i2);
          if (c === "{") {
            braces++;
            i2++;
          } else if (c === "}") {
            if (braces === 0) {
              m = 0;
            } else {
              braces--;
              if (braces === 0 && close < 0) {
                close = i2 - parser2.i;
              }
              i2++;
            }
          } else if (c === "&" && braces === 0) {
            throw new TexError_default("ExtraAlignTab", "Extra alignment tab in \\cases text");
          } else if (c === "\\") {
            const rest = str.substring(i2);
            if (rest.match(/^((\\cr)[^a-zA-Z]|\\\\)/) || end && rest.match(end)) {
              m = 0;
            } else {
              i2 += 2;
            }
          } else {
            i2++;
          }
        }
        const text = str.substring(parser2.i, i2);
        if (!text.match(/^\s*\\text[^a-zA-Z]/) || close !== text.replace(/\s+$/, "").length - 1) {
          const internal = ParseUtil.internalMath(parser2, UnitUtil.trimSpaces(text), 0);
          parser2.PushAll(internal);
          parser2.i = i2;
        }
      },
      Cr(parser2, name) {
        parser2.Push(parser2.itemFactory.create("cell").setProperties({ isCR: true, name }));
      },
      CrLaTeX(parser2, name, nobrackets = false) {
        let n;
        if (!nobrackets) {
          if (parser2.string.charAt(parser2.i) === "*") {
            parser2.i++;
          }
          if (parser2.string.charAt(parser2.i) === "[") {
            const dim = parser2.GetBrackets(name, "");
            const [value, unit] = UnitUtil.matchDimen(dim);
            if (dim && !value) {
              throw new TexError_default("BracketMustBeDimension", "Bracket argument to %1 must be a dimension", parser2.currentCS);
            }
            n = value + unit;
          }
        }
        parser2.Push(parser2.itemFactory.create("cell").setProperties({ isCR: true, name, linebreak: true }));
        const top = parser2.stack.Top();
        let node;
        if (top instanceof ArrayItem) {
          if (n) {
            top.addRowSpacing(n);
          }
        } else {
          node = parser2.create("node", "mspace", [], {
            linebreak: TexConstant.LineBreak.NEWLINE
          });
          if (n) {
            NodeUtil_default.setAttribute(node, "data-lineleading", n);
          }
          parser2.Push(node);
        }
      },
      HLine(parser2, _name, style) {
        if (style == null) {
          style = "solid";
        }
        const top = parser2.stack.Top();
        if (!(top instanceof ArrayItem) || top.Size()) {
          throw new TexError_default("Misplaced", "Misplaced %1", parser2.currentCS);
        }
        if (!top.table.length) {
          top.frame.push(["top", style]);
        } else {
          const lines2 = top.arraydef["rowlines"] ? top.arraydef["rowlines"].split(/ /) : [];
          while (lines2.length < top.table.length) {
            lines2.push("none");
          }
          lines2[top.table.length - 1] = style;
          top.arraydef["rowlines"] = lines2.join(" ");
        }
      },
      HFill(parser2, _name) {
        const top = parser2.stack.Top();
        if (top instanceof ArrayItem) {
          top.hfill.push(top.Size());
        } else {
          throw new TexError_default("UnsupportedHFill", "Unsupported use of %1", parser2.currentCS);
        }
      },
      NewColumnType(parser2, name) {
        const c = parser2.GetArgument(name);
        const n = parser2.GetBrackets(name, "0");
        const macro = parser2.GetArgument(name);
        if (c.length !== 1) {
          throw new TexError_default("BadColumnName", "Column specifier must be exactly one character: %1", c);
        }
        if (!n.match(/^\d+$/)) {
          throw new TexError_default("PositiveIntegerArg", "Argument to %1 must be a positive integer", n);
        }
        const cparser = parser2.configuration.columnParser;
        cparser.columnHandler[c] = (state) => cparser.macroColumn(state, macro, parseInt(n));
        parser2.Push(parser2.itemFactory.create("null"));
      },
      BeginEnd(parser2, name) {
        const env = parser2.GetArgument(name);
        if (env.match(/\\/)) {
          throw new TexError_default("InvalidEnv", "Invalid environment name '%1'", env);
        }
        const macro = parser2.configuration.handlers.get(HandlerType.ENVIRONMENT).lookup(env);
        if (macro && name === "\\end") {
          if (!macro.args[0]) {
            const mml = parser2.itemFactory.create("end").setProperty("name", env);
            parser2.Push(mml);
            return;
          }
          parser2.stack.env["closing"] = env;
        }
        ParseUtil.checkMaxMacros(parser2, false);
        parser2.parse(HandlerType.ENVIRONMENT, [parser2, env]);
      },
      Array(parser2, begin, open, close, align, spacing, vspacing, style, raggedHeight) {
        if (!align) {
          align = parser2.GetArgument("\\begin{" + begin.getName() + "}");
        }
        const array = parser2.itemFactory.create("array");
        if (begin.getName() === "array") {
          array.setProperty("arrayPadding", ".5em .125em");
        }
        array.parser = parser2;
        array.arraydef = {
          columnspacing: spacing || "1em",
          rowspacing: vspacing || "4pt"
        };
        parser2.configuration.columnParser.process(parser2, align, array);
        if (open) {
          array.setProperty("open", parser2.convertDelimiter(open));
        }
        if (close) {
          array.setProperty("close", parser2.convertDelimiter(close));
        }
        if ((style || "").charAt(1) === "'") {
          array.arraydef["data-cramped"] = true;
          style = style.charAt(0);
        }
        if (style === "D") {
          array.arraydef["displaystyle"] = true;
        } else if (style) {
          array.arraydef["displaystyle"] = false;
        }
        array.arraydef["scriptlevel"] = style === "S" ? 1 : 0;
        if (raggedHeight) {
          array.arraydef["useHeight"] = false;
        }
        parser2.Push(begin);
        array.StartEntry();
        return array;
      },
      AlignedArray(parser2, begin, style = "") {
        const align = parser2.GetBrackets("\\begin{" + begin.getName() + "}");
        const item = BaseMethods.Array(parser2, begin, null, null, null, null, null, style);
        return ParseUtil.setArrayAlign(item, align);
      },
      IndentAlign(parser2, begin) {
        const name = `\\begin{${begin.getName()}}`;
        const first = parser2.GetBrackets(name, "");
        const shift = parser2.GetBrackets(name, "");
        const last = parser2.GetBrackets(name, "");
        if (first && !UnitUtil.matchDimen(first)[0] || shift && !UnitUtil.matchDimen(shift)[0] || last && !UnitUtil.matchDimen(last)[0]) {
          throw new TexError_default("BracketMustBeDimension", "Bracket argument to %1 must be a dimension", name);
        }
        const lcr = parser2.GetArgument(name);
        if (lcr && !lcr.match(/^([lcr]{1,3})?$/)) {
          throw new TexError_default("BadAlignment", "Alignment must be one to three copies of l, c, or r");
        }
        const align = [...lcr].map((c) => ({ l: "left", c: "center", r: "right" })[c]);
        if (align.length === 1) {
          align.push(align[0]);
        }
        const attr = {};
        for (const [name2, value] of [
          ["indentshiftfirst", first],
          ["indentshift", shift || first],
          ["indentshiftlast", last],
          ["indentalignfirst", align[0]],
          ["indentalign", align[1]],
          ["indentalignlast", align[2]]
        ]) {
          if (value) {
            attr[name2] = value;
          }
        }
        parser2.Push(parser2.itemFactory.create("mstyle", attr, begin.getName()));
      },
      Equation(parser2, begin, numbered, display = true) {
        parser2.configuration.mathItem.display = display;
        parser2.stack.env.display = display;
        ParseUtil.checkEqnEnv(parser2);
        parser2.Push(begin);
        return parser2.itemFactory.create("equation", numbered).setProperty("name", begin.getName());
      },
      EqnArray(parser2, begin, numbered, taggable, align, balign, spacing) {
        const name = begin.getName();
        const isGather = name === "gather" || name === "gather*";
        if (taggable) {
          ParseUtil.checkEqnEnv(parser2, !isGather);
        }
        parser2.Push(begin);
        align = align.replace(/[^clr]/g, "").split("").join(" ");
        align = align.replace(/l/g, "left").replace(/r/g, "right").replace(/c/g, "center");
        balign = splitAlignArray(balign);
        const newItem = parser2.itemFactory.create("eqnarray", name, numbered, taggable, parser2.stack.global);
        newItem.arraydef = {
          displaystyle: true,
          columnalign: align,
          columnspacing: spacing || "1em",
          rowspacing: "3pt",
          "data-break-align": balign,
          side: parser2.options["tagSide"],
          minlabelspacing: parser2.options["tagIndent"]
        };
        if (isGather) {
          newItem.setProperty("nestable", true);
        }
        return newItem;
      },
      HandleNoTag(parser2, _name) {
        parser2.tags.notag();
      },
      HandleLabel(parser2, name) {
        const label = parser2.GetArgument(name);
        if (label === "") {
          return;
        }
        if (parser2.tags.label) {
          throw new TexError_default("MultipleCommand", "Multiple %1", parser2.currentCS);
        }
        parser2.tags.label = label;
        if (!parser2.tags.refUpdate) {
          if ((parser2.tags.allLabels[label] || parser2.tags.labels[label]) && !parser2.options["ignoreDuplicateLabels"]) {
            throw new TexError_default("MultipleLabel", "Label '%1' multiply defined", label);
          }
          parser2.tags.labels[label] = new Label();
        }
      },
      HandleRef(parser2, name, eqref) {
        const label = parser2.GetArgument(name);
        let ref = parser2.tags.allLabels[label] || parser2.tags.labels[label];
        if (!ref) {
          if (!parser2.tags.refUpdate) {
            parser2.tags.redo = true;
          }
          ref = new Label();
        }
        let tag3 = ref.tag;
        if (eqref) {
          tag3 = parser2.tags.formatRef(tag3);
        }
        const node = parser2.create("node", "mrow", ParseUtil.internalMath(parser2, Array.isArray(tag3) ? tag3.join("") : tag3), {
          href: parser2.tags.formatUrl(ref.id, parser2.options.baseURL),
          class: "MathJax_ref"
        });
        parser2.Push(node);
      },
      Macro(parser2, name, macro, argcount, def2) {
        if (argcount) {
          const args = [];
          if (def2 != null) {
            const optional = parser2.GetBrackets(name);
            args.push(optional == null ? def2 : optional);
          }
          for (let i2 = args.length; i2 < argcount; i2++) {
            args.push(parser2.GetArgument(name));
          }
          macro = ParseUtil.substituteArgs(parser2, args, macro);
        }
        parser2.string = ParseUtil.addArgs(parser2, macro, parser2.string.slice(parser2.i));
        parser2.i = 0;
        ParseUtil.checkMaxMacros(parser2);
      },
      MathChoice(parser2, name) {
        const D = parser2.ParseArg(name);
        const T = parser2.ParseArg(name);
        const S = parser2.ParseArg(name);
        const SS = parser2.ParseArg(name);
        parser2.Push(parser2.create("node", "MathChoice", [D, T, S, SS]));
      }
    };
    BaseMethods_default = BaseMethods;
  }
});
export{init_BaseMethods,init_lengths,em,MATHSPACE,BaseMethods_default,MapHandler,init_Configuration,init_MapHandler,init_BaseItems,Configuration,StartItem,StopItem,OpenItem,CloseItem,NullItem,PrimeItem,SubsupItem,OverItem,LeftItem,Middle,RightItem,BreakItem,BeginItem,EndItem,StyleItem,PositionItem,CellItem,MmlItem,FnItem,NotItem,NonscriptItem,DotsItem,ArrayItem,EqnArrayItem,EquationItem,MstyleItem,ParserConfiguration,BIGDIMEN,percent,length2em,px,SubHandler,splitAlignArray};
