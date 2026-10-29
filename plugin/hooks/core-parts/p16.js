import{__esm,init_PrioritizedList,PrioritizedList,init_Options,userOptions,defaultOptions,init_MathItem,init_MmlFactory,init_Retries,STATE,AbstractMathItem,MmlFactory,handleRetriesFor,expandable,makeArray,newState,separateOptions,mathjax,init_mathjax,init_string,sortLength,quotePattern,protoItem,init_MmlNode,init_mo,AbstractMmlNode,AbstractMmlEmptyNode,MmlMo,TEXCLASS}from'./p15.js';export*from'./p15.js';
// node_modules/@mathjax/src/mjs/util/FunctionList.js
var FunctionList;
var init_FunctionList = __esm({
  "node_modules/@mathjax/src/mjs/util/FunctionList.js"() {
    init_PrioritizedList();
    FunctionList = class extends PrioritizedList {
      constructor(list3 = null) {
        super();
        if (list3) {
          this.addList(list3);
        }
      }
      addList(list3) {
        for (const item of list3) {
          if (Array.isArray(item)) {
            this.add(item[0], item[1]);
          } else {
            this.add(item);
          }
        }
      }
      execute(...data) {
        for (const item of this) {
          const result = item.item(...data);
          if (result === false) {
            return false;
          }
        }
        return true;
      }
      asyncExecute(...data) {
        let i2 = -1;
        const items = this.items;
        return new Promise((ok, fail2) => {
          (function execute() {
            while (++i2 < items.length) {
              const result = items[i2].item(...data);
              if (result instanceof Promise) {
                result.then(execute).catch((err2) => fail2(err2));
                return;
              }
              if (result === false) {
                ok(false);
                return;
              }
            }
            ok(true);
          })();
        });
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/core/InputJax.js
var AbstractInputJax;
var init_InputJax = __esm({
  "node_modules/@mathjax/src/mjs/core/InputJax.js"() {
    init_Options();
    init_FunctionList();
    AbstractInputJax = class {
      constructor(options3 = {}) {
        this.adaptor = null;
        this.mmlFactory = null;
        const CLASS = this.constructor;
        this.options = userOptions(defaultOptions({}, CLASS.OPTIONS), options3);
        this.preFilters = new FunctionList(this.options.preFilters);
        this.postFilters = new FunctionList(this.options.postFilters);
      }
      get name() {
        return this.constructor.NAME;
      }
      setAdaptor(adaptor) {
        this.adaptor = adaptor;
      }
      setMmlFactory(mmlFactory) {
        this.mmlFactory = mmlFactory;
      }
      initialize() {
      }
      reset(..._args) {
      }
      get processStrings() {
        return true;
      }
      findMath(_node, _options) {
        return [];
      }
      executeFilters(filters, math, document, data) {
        const args = { math, document, data };
        filters.execute(args);
        return args.data;
      }
    };
    AbstractInputJax.NAME = "generic";
    AbstractInputJax.OPTIONS = {
      preFilters: [],
      postFilters: []
    };
  }
});
// node_modules/@mathjax/src/mjs/core/OutputJax.js
var AbstractOutputJax;
var init_OutputJax = __esm({
  "node_modules/@mathjax/src/mjs/core/OutputJax.js"() {
    init_Options();
    init_FunctionList();
    AbstractOutputJax = class {
      constructor(options3 = {}) {
        this.adaptor = null;
        const CLASS = this.constructor;
        this.options = userOptions(defaultOptions({}, CLASS.OPTIONS), options3);
        this.preFilters = new FunctionList(this.options.preFilters);
        this.postFilters = new FunctionList(this.options.postFilters);
      }
      get name() {
        return this.constructor.NAME;
      }
      setAdaptor(adaptor) {
        this.adaptor = adaptor;
      }
      initialize() {
      }
      reset(..._args) {
      }
      getMetrics(_document) {
      }
      styleSheet(_document) {
        return null;
      }
      pageElements(_document) {
        return null;
      }
      executeFilters(filters, math, document, data) {
        const args = { math, document, data };
        filters.execute(args);
        return args.data;
      }
    };
    AbstractOutputJax.NAME = "generic";
    AbstractOutputJax.OPTIONS = {
      preFilters: [],
      postFilters: []
    };
  }
});
// node_modules/@mathjax/src/mjs/util/LinkedList.js
var END;
var ListItem;
var LinkedList;
var init_LinkedList = __esm({
  "node_modules/@mathjax/src/mjs/util/LinkedList.js"() {
    END = /* @__PURE__ */ Symbol();
    ListItem = class {
      constructor(data = null) {
        this.next = null;
        this.prev = null;
        this.data = data;
      }
    };
    LinkedList = class _LinkedList {
      constructor(...args) {
        this.list = new ListItem(END);
        this.list.next = this.list.prev = this.list;
        this.push(...args);
      }
      isBefore(a, b) {
        return a < b;
      }
      push(...args) {
        for (const data of args) {
          const item = new ListItem(data);
          item.next = this.list;
          item.prev = this.list.prev;
          this.list.prev = item;
          item.prev.next = item;
        }
        return this;
      }
      pop() {
        const item = this.list.prev;
        if (item.data === END) {
          return null;
        }
        this.list.prev = item.prev;
        item.prev.next = this.list;
        item.next = item.prev = null;
        return item.data;
      }
      unshift(...args) {
        for (const data of args.slice(0).reverse()) {
          const item = new ListItem(data);
          item.next = this.list.next;
          item.prev = this.list;
          this.list.next = item;
          item.next.prev = item;
        }
        return this;
      }
      shift() {
        const item = this.list.next;
        if (item.data === END) {
          return null;
        }
        this.list.next = item.next;
        item.next.prev = this.list;
        item.next = item.prev = null;
        return item.data;
      }
      remove(...items) {
        const map = /* @__PURE__ */ new Map();
        for (const item2 of items) {
          map.set(item2, true);
        }
        let item = this.list.next;
        while (item.data !== END) {
          const next = item.next;
          if (map.has(item.data)) {
            item.prev.next = item.next;
            item.next.prev = item.prev;
            item.next = item.prev = null;
          }
          item = next;
        }
        return this;
      }
      clear() {
        this.list.next.prev = this.list.prev.next = null;
        this.list.next = this.list.prev = this.list;
        return this;
      }
      *[Symbol.iterator]() {
        let current = this.list.next;
        while (current.data !== END) {
          yield current.data;
          current = current.next;
        }
      }
      *reversed() {
        let current = this.list.prev;
        while (current.data !== END) {
          yield current.data;
          current = current.prev;
        }
      }
      insert(data, isBefore = null) {
        if (isBefore === null) {
          isBefore = this.isBefore.bind(this);
        }
        const item = new ListItem(data);
        let cur = this.list.next;
        while (cur.data !== END && isBefore(cur.data, item.data)) {
          cur = cur.next;
        }
        item.prev = cur.prev;
        item.next = cur;
        cur.prev.next = cur.prev = item;
        return this;
      }
      sort(isBefore = null) {
        if (isBefore === null) {
          isBefore = this.isBefore.bind(this);
        }
        const lists = [];
        for (const item of this) {
          lists.push(new _LinkedList(item));
        }
        this.list.next = this.list.prev = this.list;
        while (lists.length > 1) {
          const l1 = lists.shift();
          const l2 = lists.shift();
          l1.merge(l2, isBefore);
          lists.push(l1);
        }
        if (lists.length) {
          this.list = lists[0].list;
        }
        return this;
      }
      merge(list3, isBefore = null) {
        if (isBefore === null) {
          isBefore = this.isBefore.bind(this);
        }
        let lcur = this.list.next;
        let mcur = list3.list.next;
        while (lcur.data !== END && mcur.data !== END) {
          if (isBefore(mcur.data, lcur.data)) {
            [mcur.prev.next, lcur.prev.next] = [lcur, mcur];
            [mcur.prev, lcur.prev] = [lcur.prev, mcur.prev];
            [this.list.prev.next, list3.list.prev.next] = [list3.list, this.list];
            [this.list.prev, list3.list.prev] = [list3.list.prev, this.list.prev];
            [lcur, mcur] = [mcur.next, lcur];
          } else {
            lcur = lcur.next;
          }
        }
        if (mcur.data !== END) {
          this.list.prev.next = list3.list.next;
          list3.list.next.prev = this.list.prev;
          list3.list.prev.next = this.list;
          this.list.prev = list3.list.prev;
          list3.list.next = list3.list.prev = list3.list;
        }
        return this;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/core/MathList.js
var AbstractMathList;
var init_MathList = __esm({
  "node_modules/@mathjax/src/mjs/core/MathList.js"() {
    init_LinkedList();
    AbstractMathList = class extends LinkedList {
      isBefore(a, b) {
        return a.start.i < b.start.i || a.start.i === b.start.i && a.start.n < b.start.n;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/util/BitField.js
function BitFieldClass(...names) {
  const bits2 = class extends BitField {
  };
  bits2.allocate(...names);
  return bits2;
}
var BitField;
var init_BitField = __esm({
  "node_modules/@mathjax/src/mjs/util/BitField.js"() {
    BitField = class _BitField {
      constructor() {
        this.bits = 0;
      }
      static allocate(...names) {
        for (const name of names) {
          if (this.has(name)) {
            throw new Error("Bit already allocated for " + name);
          }
          if (this.next === _BitField.MAXBIT) {
            throw new Error("Maximum number of bits already allocated");
          }
          this.names.set(name, this.next);
          this.next <<= 1;
        }
      }
      static has(name) {
        return this.names.has(name);
      }
      set(name) {
        this.bits |= this.getBit(name);
      }
      clear(name) {
        this.bits &= ~this.getBit(name);
      }
      isSet(name) {
        return !!(this.bits & this.getBit(name));
      }
      reset() {
        this.bits = 0;
      }
      getBit(name) {
        const bit = this.constructor.names.get(name);
        if (!bit) {
          throw new Error("Unknown bit-field name: " + name);
        }
        return bit;
      }
    };
    BitField.MAXBIT = 1 << 31;
    BitField.next = 1;
    BitField.names = /* @__PURE__ */ new Map();
  }
});
// node_modules/@mathjax/src/mjs/core/MathDocument.js
var __awaiter3;
var RenderList;
var resetOptions;
var resetAllOptions;
var DefaultInputJax;
var DefaultOutputJax;
var DefaultMathList;
var DefaultMathItem;
var AbstractMathDocument;
var init_MathDocument = __esm({
  "node_modules/@mathjax/src/mjs/core/MathDocument.js"() {
    init_Options();
    init_InputJax();
    init_OutputJax();
    init_MathList();
    init_MathItem();
    init_MmlFactory();
    init_BitField();
    init_PrioritizedList();
    init_Retries();
    __awaiter3 = function(thisArg, _arguments, P, generator) {
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
    RenderList = class extends PrioritizedList {
      static create(actions) {
        const list3 = new this();
        for (const id of Object.keys(actions)) {
          const [action, priority] = this.action(id, actions[id]);
          if (priority) {
            list3.add(action, priority);
          }
        }
        return list3;
      }
      static action(id, action) {
        let renderDoc, renderMath;
        let convert = true;
        const priority = action[0];
        if (action.length === 1 || typeof action[1] === "boolean") {
          if (action.length === 2) {
            convert = action[1];
          }
          [renderDoc, renderMath] = this.methodActions(id);
        } else if (typeof action[1] === "string") {
          if (typeof action[2] === "string") {
            if (action.length === 4) {
              convert = action[3];
            }
            const [method1, method2] = action.slice(1);
            [renderDoc, renderMath] = this.methodActions(method1, method2);
          } else {
            if (action.length === 3) {
              convert = action[2];
            }
            [renderDoc, renderMath] = this.methodActions(action[1]);
          }
        } else {
          if (action.length === 4) {
            convert = action[3];
          }
          [renderDoc, renderMath] = action.slice(1);
        }
        return [
          { id, renderDoc, renderMath, convert },
          priority
        ];
      }
      static methodActions(method1, method2 = method1) {
        return [
          (document) => {
            if (method1) {
              document[method1]();
            }
            return false;
          },
          (math, document) => {
            if (method2) {
              math[method2](document);
            }
            return false;
          }
        ];
      }
      renderDoc(document, start = STATE.UNPROCESSED) {
        for (const item of this.items) {
          if (item.priority >= start) {
            if (item.item.renderDoc(document))
              return;
          }
        }
      }
      renderMath(math, document, start = STATE.UNPROCESSED) {
        for (const item of this.items) {
          if (item.priority >= start) {
            if (item.item.renderMath(math, document))
              return;
          }
        }
      }
      renderConvert(math, document, end = STATE.LAST) {
        for (const item of this.items) {
          if (item.priority > end)
            return;
          if (item.item.convert) {
            if (item.item.renderMath(math, document))
              return;
          }
        }
      }
      findID(id) {
        for (const item of this.items) {
          if (item.item.id === id) {
            return item.item;
          }
        }
        return null;
      }
    };
    resetOptions = {
      all: false,
      processed: false,
      inputJax: null,
      outputJax: null
    };
    resetAllOptions = {
      all: true,
      processed: true,
      inputJax: [],
      outputJax: []
    };
    DefaultInputJax = class extends AbstractInputJax {
      compile(_math) {
        return null;
      }
    };
    DefaultOutputJax = class extends AbstractOutputJax {
      typeset(_math, _document = null) {
        return null;
      }
      escaped(_math, _document) {
        return null;
      }
    };
    DefaultMathList = class extends AbstractMathList {
    };
    DefaultMathItem = class extends AbstractMathItem {
    };
    AbstractMathDocument = class _AbstractMathDocument {
      constructor(document, adaptor, options3) {
        const CLASS = this.constructor;
        this.document = document;
        this.options = userOptions(defaultOptions({}, CLASS.OPTIONS), options3);
        this.math = new (this.options["MathList"] || DefaultMathList)();
        this.renderActions = RenderList.create(this.options["renderActions"]);
        this._actionPromises = [];
        this._readyPromise = Promise.resolve();
        this.processed = new _AbstractMathDocument.ProcessBits();
        this.outputJax = this.options["OutputJax"] || new DefaultOutputJax();
        let inputJax = this.options["InputJax"] || [new DefaultInputJax()];
        if (!Array.isArray(inputJax)) {
          inputJax = [inputJax];
        }
        this.inputJax = inputJax;
        this.adaptor = adaptor;
        this.outputJax.setAdaptor(adaptor);
        this.inputJax.map((jax) => jax.setAdaptor(adaptor));
        this.mmlFactory = this.options["MmlFactory"] || new MmlFactory();
        this.inputJax.map((jax) => jax.setMmlFactory(this.mmlFactory));
        this.outputJax.initialize();
        this.inputJax.map((jax) => jax.initialize());
      }
      get kind() {
        return this.constructor.KIND;
      }
      addRenderAction(id, ...action) {
        const [fn, p] = RenderList.action(id, action);
        this.renderActions.add(fn, p);
      }
      removeRenderAction(id) {
        const action = this.renderActions.findID(id);
        if (action) {
          this.renderActions.remove(action);
        }
      }
      render() {
        this.clearPromises();
        this.renderActions.renderDoc(this);
        return this;
      }
      renderPromise() {
        return this.whenReady(() => handleRetriesFor(() => __awaiter3(this, void 0, void 0, function* () {
          this.render();
          yield this.actionPromises();
          this.clearPromises();
          return this;
        })));
      }
      rerender(start = STATE.RERENDER) {
        this.state(start - 1);
        this.render();
        return this;
      }
      rerenderPromise(start = STATE.RERENDER) {
        return this.whenReady(() => handleRetriesFor(() => __awaiter3(this, void 0, void 0, function* () {
          this.rerender(start);
          yield this.actionPromises();
          this.clearPromises();
          return this;
        })));
      }
      convert(math, options3 = {}) {
        let { format, display, end, ex, em: em2, containerWidth, scale: scale2, family } = userOptions({
          format: this.inputJax[0].name,
          display: true,
          end: STATE.LAST,
          em: 16,
          ex: 8,
          containerWidth: null,
          scale: 1,
          family: ""
        }, options3);
        if (containerWidth === null) {
          containerWidth = 80 * ex;
        }
        const jax = this.inputJax.reduce((jax2, ijax) => ijax.name === format ? ijax : jax2, null);
        const mitem = new this.options.MathItem(math, jax, display);
        mitem.start.node = this.adaptor.body(this.document);
        mitem.setMetrics(em2, ex, containerWidth, scale2);
        if (family && this.outputJax.options.mtextInheritFont) {
          mitem.outputData.mtextFamily = family;
        }
        if (family && this.outputJax.options.merrorInheritFont) {
          mitem.outputData.merrorFamily = family;
        }
        this.clearPromises();
        mitem.convert(this, end);
        return mitem.typesetRoot || mitem.root;
      }
      convertPromise(math, options3 = {}) {
        return this.whenReady(() => handleRetriesFor(() => __awaiter3(this, void 0, void 0, function* () {
          const node = this.convert(math, options3);
          yield this.actionPromises();
          this.clearPromises();
          return node;
        })));
      }
      whenReady(action) {
        return this._readyPromise = this._readyPromise.catch((_) => {
        }).then(() => {
          const ready3 = this._readyPromise;
          this._readyPromise = Promise.resolve();
          const result = action();
          const promise = this._readyPromise.then(() => result);
          this._readyPromise = ready3;
          return promise;
        });
      }
      actionPromises() {
        return Promise.all(this._actionPromises);
      }
      clearPromises() {
        this._actionPromises = [];
      }
      savePromise(promise) {
        this._actionPromises.push(promise);
      }
      findMath(_options = null) {
        this.processed.set("findMath");
        return this;
      }
      compile() {
        if (!this.processed.isSet("compile")) {
          const recompile = [];
          for (const math of this.math) {
            this.compileMath(math);
            if (math.inputData.recompile !== void 0) {
              recompile.push(math);
            }
          }
          for (const math of recompile) {
            const data = math.inputData.recompile;
            math.state(data.state);
            math.inputData.recompile = data;
            this.compileMath(math);
          }
          this.processed.set("compile");
        }
        return this;
      }
      compileMath(math) {
        try {
          math.compile(this);
        } catch (err2) {
          if (err2.retry || err2.restart) {
            throw err2;
          }
          this.options["compileError"](this, math, err2);
          math.inputData["error"] = err2;
        }
      }
      compileError(math, err2) {
        math.root = this.mmlFactory.create("math", null, [
          this.mmlFactory.create("merror", { "data-mjx-error": err2.message, title: err2.message }, [
            this.mmlFactory.create("mtext", null, [
              this.mmlFactory.create("text").setText("Math input error")
            ])
          ])
        ]);
        if (math.display) {
          math.root.attributes.set("display", "block");
        }
        math.inputData.error = err2.message;
      }
      typeset() {
        if (!this.processed.isSet("typeset")) {
          for (const math of this.math) {
            try {
              math.typeset(this);
            } catch (err2) {
              if (err2.retry || err2.restart) {
                throw err2;
              }
              this.options["typesetError"](this, math, err2);
              math.outputData["error"] = err2;
            }
          }
          this.processed.set("typeset");
        }
        return this;
      }
      typesetError(math, err2) {
        math.typesetRoot = this.adaptor.node("mjx-container", {
          class: "MathJax mjx-output-error",
          jax: this.outputJax.name
        }, [
          this.adaptor.node("span", {
            "data-mjx-error": err2.message,
            title: err2.message,
            style: {
              color: "red",
              "background-color": "yellow",
              "line-height": "normal"
            }
          }, [this.adaptor.text("Math output error")])
        ]);
        if (math.display) {
          this.adaptor.setAttributes(math.typesetRoot, {
            style: {
              display: "block",
              margin: "1em 0",
              "text-align": "center"
            }
          });
        }
        math.outputData.error = err2.message;
      }
      getMetrics() {
        if (!this.processed.isSet("getMetrics")) {
          this.outputJax.getMetrics(this);
          this.processed.set("getMetrics");
        }
        return this;
      }
      updateDocument() {
        if (!this.processed.isSet("updateDocument")) {
          for (const math of this.math.reversed()) {
            math.updateDocument(this);
          }
          this.processed.set("updateDocument");
        }
        return this;
      }
      removeFromDocument(_restore = false) {
        return this;
      }
      state(state, restore = false) {
        for (const math of this.math) {
          math.state(state, restore);
        }
        if (state < STATE.INSERTED) {
          this.processed.clear("updateDocument");
        }
        if (state < STATE.TYPESET) {
          this.processed.clear("typeset");
          this.processed.clear("getMetrics");
        }
        if (state < STATE.COMPILED) {
          this.processed.clear("compile");
        }
        if (state < STATE.FINDMATH) {
          this.processed.clear("findMath");
        }
        return this;
      }
      reset(options3 = { processed: true }) {
        options3 = userOptions(Object.assign({}, resetOptions), options3);
        if (options3.all) {
          Object.assign(options3, resetAllOptions);
        }
        if (options3.processed) {
          this.processed.reset();
        }
        if (options3.inputJax) {
          this.inputJax.forEach((jax) => jax.reset(...options3.inputJax));
        }
        if (options3.outputJax) {
          this.outputJax.reset(...options3.outputJax);
        }
        return this;
      }
      clear() {
        this.reset();
        this.math.clear();
        return this;
      }
      done() {
        return Promise.resolve();
      }
      concat(list3) {
        this.math.merge(list3);
        return this;
      }
      clearMathItemsWithin(containers) {
        const items = this.getMathItemsWithin(containers);
        for (const item of items.slice(0).reverse()) {
          item.clear();
        }
        this.math.remove(...items);
        return items;
      }
      getMathItemsWithin(elements2) {
        if (!Array.isArray(elements2)) {
          elements2 = [elements2];
        }
        const adaptor = this.adaptor;
        const items = [];
        const containers = adaptor.getElements(elements2, this.document);
        ITEMS: for (const item of this.math) {
          for (const container of containers) {
            if (item.start.node && adaptor.contains(container, item.start.node)) {
              items.push(item);
              continue ITEMS;
            }
          }
        }
        return items;
      }
    };
    AbstractMathDocument.KIND = "MathDocument";
    AbstractMathDocument.OPTIONS = {
      OutputJax: null,
      InputJax: null,
      MmlFactory: null,
      MathList: DefaultMathList,
      MathItem: DefaultMathItem,
      compileError: (doc, math, err2) => {
        doc.compileError(math, err2);
      },
      typesetError: (doc, math, err2) => {
        doc.typesetError(math, err2);
      },
      renderActions: expandable({
        find: [STATE.FINDMATH, "findMath", "", false],
        compile: [STATE.COMPILED],
        metrics: [STATE.METRICS, "getMetrics", "", false],
        typeset: [STATE.TYPESET],
        update: [STATE.INSERTED, "updateDocument", false]
      })
    };
    AbstractMathDocument.ProcessBits = BitFieldClass("findMath", "compile", "getMetrics", "typeset", "updateDocument");
  }
});
// node_modules/@mathjax/src/mjs/core/Handler.js
var DefaultMathDocument;
var AbstractHandler;
var init_Handler = __esm({
  "node_modules/@mathjax/src/mjs/core/Handler.js"() {
    init_MathDocument();
    DefaultMathDocument = class extends AbstractMathDocument {
    };
    AbstractHandler = class {
      constructor(adaptor, priority = 5) {
        this.documentClass = DefaultMathDocument;
        this.adaptor = adaptor;
        this.priority = priority;
      }
      get name() {
        return this.constructor.NAME;
      }
      handlesDocument(_document) {
        return false;
      }
      create(document, options3) {
        return new this.documentClass(document, this.adaptor, options3);
      }
    };
    AbstractHandler.NAME = "generic";
  }
});
// node_modules/@mathjax/src/mjs/handlers/html/HTMLMathItem.js
var HTMLMathItem;
var init_HTMLMathItem = __esm({
  "node_modules/@mathjax/src/mjs/handlers/html/HTMLMathItem.js"() {
    init_MathItem();
    HTMLMathItem = class extends AbstractMathItem {
      get adaptor() {
        return this.inputJax.adaptor;
      }
      constructor(math, jax, display = true, start = { node: null, n: 0, delim: "" }, end = { node: null, n: 0, delim: "" }) {
        super(math, jax, display, start, end);
      }
      updateDocument(_html) {
        if (this.state() < STATE.INSERTED) {
          if (this.inputJax.processStrings) {
            let node = this.start.node;
            if (node === this.end.node) {
              if (this.end.n && this.end.n < this.adaptor.value(this.end.node).length) {
                this.adaptor.split(this.end.node, this.end.n);
              }
              if (this.start.n) {
                node = this.adaptor.split(this.start.node, this.start.n);
              }
              if (this.adaptor.parent(node)) {
                this.adaptor.replace(this.typesetRoot, node);
              }
            } else {
              if (this.start.n) {
                node = this.adaptor.split(node, this.start.n);
              }
              while (node !== this.end.node) {
                const next = this.adaptor.next(node);
                this.adaptor.remove(node);
                node = next;
              }
              this.adaptor.insert(this.typesetRoot, node);
              if (this.end.n < this.adaptor.value(node).length) {
                this.adaptor.split(node, this.end.n);
              }
              this.adaptor.remove(node);
            }
          } else {
            this.adaptor.replace(this.typesetRoot, this.start.node);
          }
          this.start.node = this.end.node = this.typesetRoot;
          this.start.n = this.end.n = 0;
          this.state(STATE.INSERTED);
        }
      }
      updateStyleSheet(document) {
        document.addStyleSheet();
      }
      removeFromDocument(restore = false) {
        super.removeFromDocument(restore);
        if (this.state() >= STATE.TYPESET) {
          const adaptor = this.adaptor;
          const node = this.start.node;
          let math = adaptor.text("");
          if (restore) {
            const text = this.start.delim + this.math + this.end.delim;
            if (this.inputJax.processStrings) {
              math = adaptor.text(text);
            } else {
              const doc = adaptor.parse(text, "text/html");
              math = adaptor.firstChild(adaptor.body(doc));
            }
          }
          if (adaptor.parent(node)) {
            adaptor.replace(math, node);
          }
          this.start.node = this.end.node = math;
          this.start.n = this.end.n = 0;
        }
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/handlers/html/HTMLMathList.js
var HTMLMathList;
var init_HTMLMathList = __esm({
  "node_modules/@mathjax/src/mjs/handlers/html/HTMLMathList.js"() {
    init_MathList();
    HTMLMathList = class extends AbstractMathList {
    };
  }
});
// node_modules/@mathjax/src/mjs/handlers/html/HTMLDomStrings.js
var HTMLDomStrings;
var init_HTMLDomStrings = __esm({
  "node_modules/@mathjax/src/mjs/handlers/html/HTMLDomStrings.js"() {
    init_Options();
    HTMLDomStrings = class {
      constructor(options3 = null) {
        const CLASS = this.constructor;
        this.options = userOptions(defaultOptions({}, CLASS.OPTIONS), options3);
        this.init();
        this.getPatterns();
      }
      init() {
        this.strings = [];
        this.string = "";
        this.snodes = [];
        this.nodes = [];
        this.stack = [];
      }
      getPatterns() {
        const skip = makeArray(this.options["skipHtmlTags"]);
        const ignore = makeArray(this.options["ignoreHtmlClass"]);
        const process2 = makeArray(this.options["processHtmlClass"]);
        this.skipHtmlTags = new RegExp("^(?:" + skip.join("|") + ")$", "i");
        this.ignoreHtmlClass = new RegExp("(?:^| )(?:" + ignore.join("|") + ")(?: |$)");
        this.processHtmlClass = new RegExp("(?:^| )(?:" + process2 + ")(?: |$)");
      }
      pushString() {
        if (this.string.match(/\S/)) {
          this.strings.push(this.string);
          this.nodes.push(this.snodes);
        }
        this.string = "";
        this.snodes = [];
      }
      extendString(node, text) {
        this.snodes.push([node, text.length]);
        this.string += text;
      }
      handleText(node, ignore) {
        if (!ignore) {
          this.extendString(node, this.adaptor.value(node));
        }
        return this.adaptor.next(node);
      }
      handleTag(node, ignore) {
        if (!ignore) {
          const text = this.options["includeHtmlTags"][this.adaptor.kind(node)];
          if (text instanceof Function) {
            this.extendString(node, text(node, this.adaptor));
          } else {
            this.extendString(node, text);
          }
        }
        return this.adaptor.next(node);
      }
      handleContainer(node, ignore) {
        this.pushString();
        const cname = this.adaptor.getAttribute(node, "class") || "";
        const tname = this.adaptor.kind(node) || "";
        const process2 = this.processHtmlClass.exec(cname);
        let next = node;
        if (this.adaptor.firstChild(node) && !this.adaptor.getAttribute(node, "data-MJX") && (process2 || !this.skipHtmlTags.exec(tname))) {
          if (this.adaptor.next(node)) {
            this.stack.push([this.adaptor.next(node), ignore]);
          }
          next = this.adaptor.firstChild(node);
          ignore = (ignore || this.ignoreHtmlClass.exec(cname)) && !process2;
        } else {
          next = this.adaptor.next(node);
        }
        return [next, ignore];
      }
      handleOther(node, _ignore) {
        this.pushString();
        return this.adaptor.next(node);
      }
      find(node) {
        this.init();
        const stop = this.adaptor.next(node);
        let ignore = false;
        const include = this.options["includeHtmlTags"];
        while (node && node !== stop) {
          const kind = this.adaptor.kind(node);
          if (kind === "#text") {
            node = this.handleText(node, ignore);
          } else if (Object.hasOwn(include, kind)) {
            node = this.handleTag(node, ignore);
          } else if (kind) {
            [node, ignore] = this.handleContainer(node, ignore);
          } else {
            node = this.handleOther(node, ignore);
          }
          if (!node && this.stack.length) {
            this.pushString();
            [node, ignore] = this.stack.pop();
          }
        }
        this.pushString();
        const result = [this.strings, this.nodes];
        this.init();
        return result;
      }
    };
    HTMLDomStrings.OPTIONS = {
      skipHtmlTags: [
        "script",
        "noscript",
        "style",
        "textarea",
        "pre",
        "code",
        "math",
        "select",
        "option",
        "mjx-container"
      ],
      includeHtmlTags: expandable({ br: "\n", wbr: "", "#comment": "" }),
      ignoreHtmlClass: "mathjax_ignore",
      processHtmlClass: "mathjax_process"
    };
  }
});
// node_modules/@mathjax/src/mjs/handlers/html/HTMLDocument.js
var HTMLDocument;
var init_HTMLDocument = __esm({
  "node_modules/@mathjax/src/mjs/handlers/html/HTMLDocument.js"() {
    init_MathDocument();
    init_Options();
    init_HTMLMathItem();
    init_HTMLMathList();
    init_HTMLDomStrings();
    init_MathItem();
    newState("STYLES", STATE.INSERTED + 1);
    HTMLDocument = class extends AbstractMathDocument {
      constructor(document, adaptor, options3) {
        const [html2, dom] = separateOptions(options3, HTMLDomStrings.OPTIONS);
        super(document, adaptor, html2);
        this.domStrings = this.options["DomStrings"] || new HTMLDomStrings(dom);
        this.domStrings.adaptor = adaptor;
        this.styles = [];
      }
      findPosition(N, index, delim, nodes) {
        const adaptor = this.adaptor;
        const inc = 1 / (nodes[N].length || 1);
        let i2 = N;
        for (const [node, n] of nodes[N]) {
          if (index <= n && adaptor.kind(node) === "#text") {
            return { i: i2, node, n: Math.max(index, 0), delim };
          }
          index -= n;
          i2 += inc;
        }
        return { node: null, n: 0, delim };
      }
      mathItem(item, jax, nodes) {
        const math = item.math;
        const start = this.findPosition(item.n, item.start.n, item.open, nodes);
        const end = this.findPosition(item.n, item.end.n, item.close, nodes);
        return new this.options.MathItem(math, jax, item.display, start, end);
      }
      findMath(options3) {
        if (!this.processed.isSet("findMath")) {
          this.adaptor.document = this.document;
          options3 = userOptions({
            elements: this.options.elements || [this.adaptor.body(this.document)]
          }, options3);
          const containers = this.adaptor.getElements(options3.elements, this.document);
          for (const jax of this.inputJax) {
            const list3 = jax.processStrings ? this.findMathFromStrings(jax, containers) : this.findMathFromDOM(jax, containers);
            this.math.merge(list3);
          }
          this.processed.set("findMath");
        }
        return this;
      }
      findMathFromStrings(jax, containers) {
        const strings = [];
        const nodes = [];
        for (const container of containers) {
          const [slist, nlist] = this.domStrings.find(container);
          strings.push(...slist);
          nodes.push(...nlist);
        }
        const list3 = new this.options.MathList();
        for (const math of jax.findMath(strings)) {
          list3.push(this.mathItem(math, jax, nodes));
        }
        return list3;
      }
      findMathFromDOM(jax, containers) {
        const items = [];
        for (const container of containers) {
          for (const math of jax.findMath(container)) {
            items.push(new this.options.MathItem(math.math, jax, math.display, math.start, math.end));
          }
        }
        return new this.options.MathList(...items);
      }
      updateDocument() {
        if (!this.processed.isSet("updateDocument")) {
          this.addPageElements();
          this.addStyleSheet();
          super.updateDocument();
          this.processed.set("updateDocument");
        }
        return this;
      }
      addPageElements() {
        const adaptor = this.adaptor;
        const body = adaptor.body(this.document);
        const node = this.documentPageElements();
        if (node) {
          const child = adaptor.firstChild(body);
          if (child) {
            adaptor.insert(node, child);
          } else {
            adaptor.append(body, node);
          }
        }
      }
      addStyleSheet() {
        const sheet = this.documentStyleSheet();
        const adaptor = this.adaptor;
        if (sheet && !adaptor.parent(sheet)) {
          const head = adaptor.head(this.document);
          const styles = this.findSheet(head, adaptor.getAttribute(sheet, "id"));
          if (styles) {
            adaptor.replace(sheet, styles);
          } else {
            adaptor.append(head, sheet);
          }
        }
      }
      findSheet(head, id) {
        if (id) {
          for (const sheet of this.adaptor.tags(head, "style")) {
            if (this.adaptor.getAttribute(sheet, "id") === id) {
              return sheet;
            }
          }
        }
        return null;
      }
      removeFromDocument(restore = false) {
        if (this.processed.isSet("updateDocument")) {
          for (const math of this.math) {
            if (math.state() >= STATE.INSERTED) {
              math.state(STATE.TYPESET, restore);
            }
          }
        }
        this.processed.clear("updateDocument");
        return this;
      }
      documentStyleSheet() {
        return this.outputJax.styleSheet(this);
      }
      documentPageElements() {
        return this.outputJax.pageElements(this);
      }
      addStyles(styles) {
        this.styles.push(styles);
        if ("insertStyles" in this.outputJax) {
          this.outputJax.insertStyles(styles);
        }
      }
      getStyles() {
        return this.styles;
      }
    };
    HTMLDocument.KIND = "HTML";
    HTMLDocument.OPTIONS = Object.assign(Object.assign({}, AbstractMathDocument.OPTIONS), { renderActions: expandable(Object.assign(Object.assign({}, AbstractMathDocument.OPTIONS.renderActions), { styles: [STATE.STYLES, "", "updateStyleSheet", false] })), MathList: HTMLMathList, MathItem: HTMLMathItem, DomStrings: null });
  }
});
// node_modules/@mathjax/src/mjs/handlers/html/HTMLHandler.js
var HTMLHandler;
var init_HTMLHandler = __esm({
  "node_modules/@mathjax/src/mjs/handlers/html/HTMLHandler.js"() {
    init_Handler();
    init_HTMLDocument();
    HTMLHandler = class extends AbstractHandler {
      constructor() {
        super(...arguments);
        this.documentClass = HTMLDocument;
      }
      handlesDocument(document) {
        const adaptor = this.adaptor;
        if (typeof document === "string") {
          try {
            document = adaptor.parse(document, "text/html");
          } catch (_err) {
          }
        }
        if (document instanceof adaptor.window.Document || document instanceof adaptor.window.HTMLElement || document instanceof adaptor.window.DocumentFragment) {
          return true;
        }
        return false;
      }
      create(document, options3) {
        const adaptor = this.adaptor;
        if (typeof document === "string") {
          document = adaptor.parse(document, "text/html");
        } else if (document instanceof adaptor.window.HTMLElement || document instanceof adaptor.window.DocumentFragment) {
          const child = document;
          document = adaptor.parse("", "text/html");
          adaptor.append(adaptor.body(document), child);
        }
        return super.create(document, options3);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/handlers/html.js
function RegisterHTMLHandler(adaptor) {
  const handler = new HTMLHandler(adaptor);
  mathjax.handlers.register(handler);
  return handler;
}
var init_html = __esm({
  "node_modules/@mathjax/src/mjs/handlers/html.js"() {
    init_mathjax();
    init_HTMLHandler();
  }
});
// node_modules/@mathjax/src/mjs/core/FindMath.js
var AbstractFindMath;
var init_FindMath = __esm({
  "node_modules/@mathjax/src/mjs/core/FindMath.js"() {
    init_Options();
    AbstractFindMath = class {
      constructor(options3) {
        const CLASS = this.constructor;
        this.options = userOptions(defaultOptions({}, CLASS.OPTIONS), options3);
      }
    };
    AbstractFindMath.OPTIONS = {};
  }
});
// node_modules/@mathjax/src/mjs/input/tex/FindTeX.js
var FindTeX;
var init_FindTeX = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/FindTeX.js"() {
    init_FindMath();
    init_string();
    init_MathItem();
    FindTeX = class extends AbstractFindMath {
      constructor(options3) {
        super(options3);
        this.getPatterns();
      }
      getPatterns() {
        const options3 = this.options;
        const starts = [];
        const parts = [];
        const subparts = [];
        this.end = {};
        this.env = this.sub = 0;
        let i2 = 1;
        options3["inlineMath"].forEach((delims) => this.addPattern(starts, delims, false));
        options3["displayMath"].forEach((delims) => this.addPattern(starts, delims, true));
        if (starts.length) {
          parts.push(starts.sort(sortLength).join("|"));
        }
        if (options3["processEnvironments"]) {
          parts.push("\\\\begin\\s*\\{([^}]*)\\}");
          this.env = i2;
          i2++;
        }
        if (options3["processEscapes"]) {
          subparts.push("\\\\([\\\\$])");
        }
        if (options3["processRefs"]) {
          subparts.push("(\\\\(?:eq)?ref\\s*\\{[^}]*\\})");
        }
        if (subparts.length) {
          parts.push("(" + subparts.join("|") + ")");
          this.sub = i2;
        }
        this.start = new RegExp(parts.join("|"), "g");
        this.hasPatterns = parts.length > 0;
      }
      addPattern(starts, delims, display) {
        const [open, close] = delims;
        starts.push(quotePattern(open));
        this.end[open] = [close, display, this.endPattern(close)];
      }
      endPattern(end, endp) {
        return new RegExp((endp || quotePattern(end)) + "|\\\\(?:[a-zA-Z]|.)|[{}]", "g");
      }
      findEnd(text, n, start, end) {
        const [close, display, pattern] = end;
        const i2 = pattern.lastIndex = start.index + start[0].length;
        let match, braces = 0;
        while (match = pattern.exec(text)) {
          if ((match[1] || match[0]) === close && braces === 0) {
            return protoItem(start[0], text.substring(i2, match.index), match[0], n, start.index, match.index + match[0].length, display);
          } else if (match[0] === "{") {
            braces++;
          } else if (match[0] === "}" && braces) {
            braces--;
          }
        }
        return null;
      }
      findMathInString(math, n, text) {
        let start, match;
        this.start.lastIndex = 0;
        while (start = this.start.exec(text)) {
          if (start[this.env] !== void 0 && this.env) {
            const end = "\\\\end\\s*(\\{" + quotePattern(start[this.env]) + "\\})";
            match = this.findEnd(text, n, start, [
              "{" + start[this.env] + "}",
              true,
              this.endPattern(null, end)
            ]);
            if (match) {
              match.math = match.open + match.math + match.close;
              match.open = match.close = "";
            }
          } else if (start[this.sub] !== void 0 && this.sub) {
            const math2 = start[this.sub];
            const end = start.index + start[this.sub].length;
            if (math2.length === 2) {
              match = protoItem("\\", math2.substring(1), "", n, start.index, end);
            } else {
              match = protoItem("", math2, "", n, start.index, end, false);
            }
          } else {
            match = this.findEnd(text, n, start, this.end[start[0]]);
          }
          if (match) {
            math.push(match);
            this.start.lastIndex = match.end.n;
          }
        }
      }
      findMath(strings) {
        const math = [];
        if (this.hasPatterns) {
          for (let i2 = 0, m = strings.length; i2 < m; i2++) {
            this.findMathInString(math, i2, strings[i2]);
          }
        }
        return math;
      }
    };
    FindTeX.OPTIONS = {
      inlineMath: [
        ["\\(", "\\)"]
      ],
      displayMath: [
        ["$$", "$$"],
        ["\\[", "\\]"]
      ],
      processEscapes: true,
      processEnvironments: true,
      processRefs: true
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/NodeUtil.js
var NodeUtil;
var NodeUtil_default;
var init_NodeUtil = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/NodeUtil.js"() {
    init_MmlNode();
    init_mo();
    NodeUtil = {
      attrs: /* @__PURE__ */ new Set([
        "autoOP",
        "fnOP",
        "movesupsub",
        "subsupOK",
        "texprimestyle",
        "useHeight",
        "variantForm",
        "withDelims",
        "mathaccent",
        "open",
        "close"
      ]),
      createEntity(code) {
        return String.fromCodePoint(parseInt(code, 16));
      },
      getChildren(node) {
        return node.childNodes;
      },
      getText(node) {
        return node.getText();
      },
      appendChildren(node, children) {
        for (const child of children) {
          node.appendChild(child);
        }
      },
      setAttribute(node, attribute, value) {
        node.attributes.set(attribute, value);
      },
      setProperty(node, property, value) {
        node.setProperty(property, value);
      },
      setProperties(node, properties) {
        for (const name of Object.keys(properties)) {
          const value = properties[name];
          if (name === "texClass") {
            node.texClass = value;
            node.setProperty(name, value);
          } else if (name === "movablelimits") {
            node.setProperty("movablelimits", value);
            if (node.isKind("mo") || node.isKind("mstyle")) {
              node.attributes.set("movablelimits", value);
            }
          } else if (name === "inferred") {
          } else if (NodeUtil.attrs.has(name)) {
            node.setProperty(name, value);
          } else {
            node.attributes.set(name, value);
          }
        }
      },
      getProperty(node, property) {
        return node.getProperty(property);
      },
      getAttribute(node, attr) {
        return node.attributes.get(attr);
      },
      removeAttribute(node, attr) {
        node.attributes.unset(attr);
      },
      removeProperties(node, ...properties) {
        node.removeProperty(...properties);
      },
      getChildAt(node, position) {
        return node.childNodes[position];
      },
      setChild(node, position, child) {
        const children = node.childNodes;
        children[position] = child;
        if (child) {
          child.parent = node;
        }
      },
      copyChildren(oldNode, newNode) {
        const children = oldNode.childNodes;
        for (let i2 = 0; i2 < children.length; i2++) {
          this.setChild(newNode, i2, children[i2]);
        }
      },
      copyAttributes(oldNode, newNode) {
        newNode.attributes = oldNode.attributes;
        for (const [prop, value] of Object.entries(oldNode.getAllProperties())) {
          newNode.setProperty(prop, value);
        }
      },
      isType(node, kind) {
        return node.isKind(kind);
      },
      isEmbellished(node) {
        return node.isEmbellished;
      },
      getTexClass(node) {
        return node.texClass;
      },
      getCoreMO(node) {
        return node.coreMO();
      },
      isNode(item) {
        return item instanceof AbstractMmlNode || item instanceof AbstractMmlEmptyNode;
      },
      isInferred(node) {
        return node.isInferred;
      },
      getForm(node) {
        if (!node.isKind("mo")) {
          return null;
        }
        const mo = node;
        const forms = mo.getForms();
        for (const form of forms) {
          const symbol = this.getOp(mo, form);
          if (symbol) {
            return symbol;
          }
        }
        return null;
      },
      getOp(mo, form = "infix") {
        return MmlMo.OPTABLE[form][mo.getText()] || null;
      },
      getMoAttribute(mo, attr) {
        var _a2, _b2;
        if (!mo.attributes.isSet(attr)) {
          for (const form of ["infix", "postfix", "prefix"]) {
            const value = (_b2 = (_a2 = this.getOp(mo, form)) === null || _a2 === void 0 ? void 0 : _a2[3]) === null || _b2 === void 0 ? void 0 : _b2[attr];
            if (value !== void 0) {
              return value;
            }
          }
        }
        return mo.attributes.get(attr);
      }
    };
    NodeUtil_default = NodeUtil;
  }
});
// node_modules/@mathjax/src/mjs/input/tex/TexConstants.js
var TexConstant;
var init_TexConstants = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/TexConstants.js"() {
    TexConstant = JSON.parse(`{
 "Variant":{
  "NORMAL":"normal",
  "BOLD":"bold",
  "ITALIC":"italic",
  "BOLDITALIC":"bold-italic",
  "DOUBLESTRUCK":"double-struck",
  "FRAKTUR":"fraktur",
  "BOLDFRAKTUR":"bold-fraktur",
  "SCRIPT":"script",
  "BOLDSCRIPT":"bold-script",
  "SANSSERIF":"sans-serif",
  "BOLDSANSSERIF":"bold-sans-serif",
  "SANSSERIFITALIC":"sans-serif-italic",
  "SANSSERIFBOLDITALIC":"sans-serif-bold-italic",
  "MONOSPACE":"monospace",
  "INITIAL":"inital",
  "TAILED":"tailed",
  "LOOPED":"looped",
  "STRETCHED":"stretched",
  "CALLIGRAPHIC":"-tex-calligraphic",
  "BOLDCALLIGRAPHIC":"-tex-bold-calligraphic",
  "OLDSTYLE":"-tex-oldstyle",
  "BOLDOLDSTYLE":"-tex-bold-oldstyle",
  "MATHITALIC":"-tex-mathit"
 },
 "Form":{"PREFIX":"prefix","INFIX":"infix","POSTFIX":"postfix"},
 "LineBreak":{"AUTO":"auto","NEWLINE":"newline","NOBREAK":"nobreak","GOODBREAK":"goodbreak","BADBREAK":"badbreak"},
 "LineBreakStyle":{"BEFORE":"before","AFTER":"after","DUPLICATE":"duplicate","INFIXLINBREAKSTYLE":"infixlinebreakstyle"},
 "IndentAlign":{"LEFT":"left","CENTER":"center","RIGHT":"right","AUTO":"auto","ID":"id","INDENTALIGN":"indentalign"},
 "IndentShift":{"INDENTSHIFT":"indentshift"},
 "LineThickness":{"THIN":"thin","MEDIUM":"medium","THICK":"thick"},
 "Notation":{"LONGDIV":"longdiv","ACTUARIAL":"actuarial","PHASORANGLE":"phasorangle","RADICAL":"radical","BOX":"box","ROUNDEDBOX":"roundedbox","CIRCLE":"circle","LEFT":"left","RIGHT":"right","TOP":"top","BOTTOM":"bottom","UPDIAGONALSTRIKE":"updiagonalstrike","DOWNDIAGONALSTRIKE":"downdiagonalstrike","VERTICALSTRIKE":"verticalstrike","HORIZONTALSTRIKE":"horizontalstrike","NORTHEASTARROW":"northeastarrow","MADRUWB":"madruwb","UPDIAGONALARROW":"updiagonalarrow"},
 "Align":{"TOP":"top","BOTTOM":"bottom","CENTER":"center","BASELINE":"baseline","AXIS":"axis","LEFT":"left","RIGHT":"right"},
 "Lines":{"NONE":"none","SOLID":"solid","DASHED":"dashed"},
 "Side":{"LEFT":"left","RIGHT":"right","LEFTOVERLAP":"leftoverlap","RIGHTOVERLAP":"rightoverlap"},
 "Width":{"AUTO":"auto","FIT":"fit"},
 "Actiontype":{"TOGGLE":"toggle","STATUSLINE":"statusline","TOOLTIP":"tooltip","INPUT":"input"},
 "Overflow":{"LINBREAK":"linebreak","SCROLL":"scroll","ELIDE":"elide","TRUNCATE":"truncate","SCALE":"scale"},
 "Unit":{"EM":"em","EX":"ex","PX":"px","IN":"in","CM":"cm","MM":"mm","PT":"pt","PC":"pc"},
 "Attr":{"LATEX":"data-latex","LATEXITEM":"data-latex-item"}
}`);
  }
});
// node_modules/@mathjax/src/mjs/input/tex/FilterUtil.js
function _copyExplicit(attrs, node1, node2) {
  const attr1 = node1.attributes;
  const attr2 = node2.attributes;
  attrs.forEach((x2) => {
    const attr = attr2.getExplicit(x2);
    if (attr != null) {
      attr1.set(x2, attr);
    }
  });
}
function _compareExplicit(node1, node2) {
  const filter2 = (attr, space) => {
    const exp = attr.getExplicitNames();
    return exp.filter((x2) => {
      return x2 !== space && (x2 !== "stretchy" || attr.getExplicit("stretchy")) && x2 !== "data-latex" && x2 !== "data-latex-item";
    });
  };
  const attr1 = node1.attributes;
  const attr2 = node2.attributes;
  const exp1 = filter2(attr1, "lspace");
  const exp2 = filter2(attr2, "rspace");
  if (exp1.length !== exp2.length) {
    return false;
  }
  for (const name of exp1) {
    if (attr1.getExplicit(name) !== attr2.getExplicit(name)) {
      return false;
    }
  }
  return true;
}
function _cleanSubSup(options3, low, up) {
  const remove = [];
  for (const mml of options3.getList("m" + low + up)) {
    const children = mml.childNodes;
    if (children[mml[low]] && children[mml[up]]) {
      continue;
    }
    const parent = mml.parent;
    const newNode = children[mml[low]] ? options3.nodeFactory.create("node", "m" + low, [
      children[mml.base],
      children[mml[low]]
    ]) : options3.nodeFactory.create("node", "m" + up, [
      children[mml.base],
      children[mml[up]]
    ]);
    NodeUtil_default.copyAttributes(mml, newNode);
    parent.replaceChild(newNode, mml);
    remove.push(mml);
  }
  options3.removeFromList("m" + low + up, remove);
}
function _moveLimits(options3, underover, subsup) {
  const remove = [];
  for (const mml of options3.getList(underover)) {
    if (mml.attributes.get("displaystyle")) {
      continue;
    }
    const base = mml.childNodes[mml.base];
    const mo = base.coreMO();
    if (base.getProperty("movablelimits") && !mo.attributes.hasExplicit("movablelimits")) {
      const node = options3.nodeFactory.create("node", subsup, mml.childNodes);
      NodeUtil_default.copyAttributes(mml, node);
      mml.parent.replaceChild(node, mml);
      remove.push(mml);
    }
  }
  options3.removeFromList(underover, remove);
}
var FilterUtil;
var FilterUtil_default;
var init_FilterUtil = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/FilterUtil.js"() {
    init_MmlNode();
    init_NodeUtil();
    init_TexConstants();
    FilterUtil = {
      cleanStretchy(arg) {
        var _a2;
        const options3 = arg.data;
        for (const mo of options3.getList("fixStretchy")) {
          if (NodeUtil_default.getProperty(mo, "fixStretchy")) {
            const symbol = NodeUtil_default.getForm(mo);
            if ((_a2 = symbol === null || symbol === void 0 ? void 0 : symbol[3]) === null || _a2 === void 0 ? void 0 : _a2["stretchy"]) {
              NodeUtil_default.setAttribute(mo, "stretchy", false);
            }
            NodeUtil_default.removeProperties(mo, "fixStretchy");
          }
        }
      },
      cleanAttributes(arg) {
        const node = arg.data.root;
        node.walkTree((mml) => {
          const keep = new Set((mml.getProperty("keep-attrs") || "").split(/ /));
          const attribs = mml.attributes;
          attribs.unset(TexConstant.Attr.LATEXITEM);
          for (const key of attribs.getExplicitNames()) {
            if (!keep.has(key) && attribs.get(key) === attribs.getInherited(key)) {
              attribs.unset(key);
            }
          }
        });
      },
      combineRelations(arg) {
        const remove = [];
        for (const mo of arg.data.getList("mo")) {
          if (mo.getProperty("relationsCombined") || !mo.parent || mo.parent && !NodeUtil_default.isType(mo.parent, "mrow") || NodeUtil_default.getTexClass(mo) !== TEXCLASS.REL) {
            continue;
          }
          const mml = mo.parent;
          let m2;
          const children = mml.childNodes;
          const next = children.indexOf(mo) + 1;
          const variantForm = NodeUtil_default.getProperty(mo, "variantForm");
          while (next < children.length && (m2 = children[next]) && NodeUtil_default.isType(m2, "mo") && NodeUtil_default.getTexClass(m2) === TEXCLASS.REL) {
            if (variantForm === NodeUtil_default.getProperty(m2, "variantForm") && _compareExplicit(mo, m2)) {
              NodeUtil_default.appendChildren(mo, NodeUtil_default.getChildren(m2));
              _copyExplicit(["stretchy", "rspace"], mo, m2);
              for (const name of m2.getPropertyNames()) {
                mo.setProperty(name, m2.getProperty(name));
              }
              if (m2.attributes.get("data-latex")) {
                mo.attributes.set("data-latex", mo.attributes.get("data-latex") + m2.attributes.get("data-latex"));
              }
              children.splice(next, 1);
              remove.push(m2);
              m2.parent = null;
              m2.setProperty("relationsCombined", true);
              mo.setProperty("texClass", TEXCLASS.REL);
            } else {
              if (!mo.attributes.hasExplicit("rspace")) {
                NodeUtil_default.setAttribute(mo, "rspace", "0pt");
              }
              if (!m2.attributes.hasExplicit("lspace")) {
                NodeUtil_default.setAttribute(m2, "lspace", "0pt");
              }
              break;
            }
          }
          mo.attributes.setInherited("form", mo.getForms()[0]);
        }
        arg.data.removeFromList("mo", remove);
      },
      cleanSubSup(arg) {
        const options3 = arg.data;
        if (options3.error) {
          return;
        }
        _cleanSubSup(options3, "sub", "sup");
        _cleanSubSup(options3, "under", "over");
      },
      moveLimits(arg) {
        const options3 = arg.data;
        _moveLimits(options3, "munderover", "msubsup");
        _moveLimits(options3, "munder", "msub");
        _moveLimits(options3, "mover", "msup");
      },
      setInherited(arg) {
        arg.data.root.setInheritedAttributes({}, arg.math["display"], 0, false);
      },
      checkScriptlevel(arg) {
        const options3 = arg.data;
        const remove = [];
        for (const mml of options3.getList("mstyle")) {
          if (mml.childNodes[0].childNodes.length !== 1) {
            continue;
          }
          const attributes = mml.attributes;
          for (const key of ["displaystyle", "scriptlevel"]) {
            if (attributes.getExplicit(key) === attributes.getInherited(key)) {
              attributes.unset(key);
            }
          }
          const names = attributes.getExplicitNames();
          if (names.filter((key) => key.substring(0, 10) !== "data-latex").length === 0) {
            const child = mml.childNodes[0].childNodes[0];
            names.forEach((key) => child.attributes.set(key, attributes.get(key)));
            mml.parent.replaceChild(child, mml);
            remove.push(mml);
          }
        }
        options3.removeFromList("mstyle", remove);
      }
    };
    FilterUtil_default = FilterUtil;
  }
});
export{init_NodeUtil,NodeUtil_default,init_TexConstants,TexConstant,init_FunctionList,FunctionList,init_InputJax,init_FindTeX,init_FilterUtil,AbstractInputJax,FindTeX,FilterUtil_default,init_OutputJax,AbstractOutputJax,RegisterHTMLHandler,init_html};
