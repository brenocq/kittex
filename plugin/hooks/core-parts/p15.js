import{__esm,init_Options,init_InputJax,init_OutputJax,init_MathList,init_MathItem,init_MmlFactory,init_BitField,init_PrioritizedList,init_Retries,PrioritizedList,STATE,AbstractInputJax,AbstractOutputJax,AbstractMathList,AbstractMathItem,userOptions,defaultOptions,MmlFactory,handleRetriesFor,expandable,BitFieldClass,makeArray,newState,separateOptions,mathjax,init_mathjax,init_string,sortLength,quotePattern,protoItem,init_MmlNode,init_mo,AbstractMmlNode,AbstractMmlEmptyNode,MmlMo,TEXCLASS}from'./p14.js';export*from'./p14.js';
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
        } catch (err) {
          if (err.retry || err.restart) {
            throw err;
          }
          this.options["compileError"](this, math, err);
          math.inputData["error"] = err;
        }
      }
      compileError(math, err) {
        math.root = this.mmlFactory.create("math", null, [
          this.mmlFactory.create("merror", { "data-mjx-error": err.message, title: err.message }, [
            this.mmlFactory.create("mtext", null, [
              this.mmlFactory.create("text").setText("Math input error")
            ])
          ])
        ]);
        if (math.display) {
          math.root.attributes.set("display", "block");
        }
        math.inputData.error = err.message;
      }
      typeset() {
        if (!this.processed.isSet("typeset")) {
          for (const math of this.math) {
            try {
              math.typeset(this);
            } catch (err) {
              if (err.retry || err.restart) {
                throw err;
              }
              this.options["typesetError"](this, math, err);
              math.outputData["error"] = err;
            }
          }
          this.processed.set("typeset");
        }
        return this;
      }
      typesetError(math, err) {
        math.typesetRoot = this.adaptor.node("mjx-container", {
          class: "MathJax mjx-output-error",
          jax: this.outputJax.name
        }, [
          this.adaptor.node("span", {
            "data-mjx-error": err.message,
            title: err.message,
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
        math.outputData.error = err.message;
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
      compileError: (doc, math, err) => {
        doc.compileError(math, err);
      },
      typesetError: (doc, math, err) => {
        doc.typesetError(math, err);
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
// node_modules/@mathjax/src/mjs/input/tex/HandlerTypes.js
var ConfigurationType;
var HandlerType;
var init_HandlerTypes = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/HandlerTypes.js"() {
    (function(ConfigurationType2) {
      ConfigurationType2["HANDLER"] = "handler";
      ConfigurationType2["FALLBACK"] = "fallback";
      ConfigurationType2["ITEMS"] = "items";
      ConfigurationType2["TAGS"] = "tags";
      ConfigurationType2["OPTIONS"] = "options";
      ConfigurationType2["NODES"] = "nodes";
      ConfigurationType2["PREPROCESSORS"] = "preprocessors";
      ConfigurationType2["POSTPROCESSORS"] = "postprocessors";
      ConfigurationType2["INIT"] = "init";
      ConfigurationType2["CONFIG"] = "config";
      ConfigurationType2["PRIORITY"] = "priority";
      ConfigurationType2["PARSER"] = "parser";
    })(ConfigurationType || (ConfigurationType = {}));
    (function(HandlerType2) {
      HandlerType2["DELIMITER"] = "delimiter";
      HandlerType2["MACRO"] = "macro";
      HandlerType2["CHARACTER"] = "character";
      HandlerType2["ENVIRONMENT"] = "environment";
    })(HandlerType || (HandlerType = {}));
  }
});
// node_modules/@mathjax/src/mjs/input/tex/UnitUtil.js
function muReplace([value, unit, length4]) {
  if (unit !== "mu") {
    return [value, unit, length4];
  }
  const em2 = UnitUtil.em(UnitUtil.UNIT_CASES.get(unit) * parseFloat(value));
  return [em2.slice(0, -2), "em", length4];
}
var UnitMap;
var emPerInch;
var pxPerInch;
var UnitUtil;
var init_UnitUtil = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/UnitUtil.js"() {
    UnitMap = class {
      constructor(map) {
        this.num = "([-+]?([.,]\\d+|\\d+([.,]\\d*)?))";
        this.unit = "";
        this.dimenEnd = /./;
        this.dimenRest = /./;
        this.map = new Map(map);
        this.updateDimen();
      }
      updateDimen() {
        this.unit = `(${Array.from(this.map.keys()).join("|")})`;
        this.dimenEnd = RegExp("^\\s*" + this.num + "\\s*" + this.unit + "\\s*$");
        this.dimenRest = RegExp("^\\s*" + this.num + "\\s*" + this.unit + " ?");
      }
      set(name, ems) {
        this.map.set(name, ems);
        this.updateDimen();
        return this;
      }
      get(name) {
        return this.map.get(name) || this.map.get("pt");
      }
      delete(name) {
        if (this.map.delete(name)) {
          this.updateDimen();
          return true;
        }
        return false;
      }
    };
    emPerInch = 7.2;
    pxPerInch = 72;
    UnitUtil = {
      UNIT_CASES: new UnitMap([
        ["em", 1],
        ["ex", 0.43],
        ["pt", 1 / 10],
        ["pc", 1.2],
        ["px", emPerInch / pxPerInch],
        ["in", emPerInch],
        ["cm", emPerInch / 2.54],
        ["mm", emPerInch / 25.4],
        ["mu", 1 / 18]
      ]),
      matchDimen(dim, rest = false) {
        const match = dim.match(rest ? UnitUtil.UNIT_CASES.dimenRest : UnitUtil.UNIT_CASES.dimenEnd);
        return match ? muReplace([match[1].replace(/,/, "."), match[4], match[0].length]) : [null, null, 0];
      },
      dimen2em(dim) {
        const [value, unit] = UnitUtil.matchDimen(dim);
        const m = parseFloat(value || "1");
        const factor = UnitUtil.UNIT_CASES.get(unit);
        return factor * m;
      },
      em(m) {
        if (Math.abs(m) < 6e-4) {
          return "0em";
        }
        return m.toFixed(3).replace(/\.?0+$/, "") + "em";
      },
      trimSpaces(text) {
        if (typeof text !== "string") {
          return text;
        }
        let TEXT = text.trim();
        if (TEXT.match(/\\$/) && text.match(/ $/)) {
          TEXT += " ";
        }
        return TEXT;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/Stack.js
var Stack;
var init_Stack = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/Stack.js"() {
    init_NodeUtil();
    Stack = class {
      constructor(_factory, _env, inner) {
        this._factory = _factory;
        this._env = _env;
        this.global = {};
        this.stack = [];
        this.global = { isInner: inner };
        this.stack = [this._factory.create("start", this.global)];
        if (_env) {
          this.stack[0].env = _env;
        }
        this.env = this.stack[0].env;
      }
      set env(env) {
        this._env = env;
      }
      get env() {
        return this._env;
      }
      Push(...args) {
        for (const node of args) {
          if (!node) {
            continue;
          }
          const item = NodeUtil_default.isNode(node) ? this._factory.create("mml", node) : node;
          item.global = this.global;
          const [top, success] = this.stack.length ? this.Top().checkItem(item) : [null, true];
          if (!success) {
            continue;
          }
          if (top) {
            this.Pop();
            this.Push(...top);
            continue;
          }
          if (!item.isKind("null")) {
            this.stack.push(item);
          }
          if (item.env) {
            if (item.copyEnv) {
              Object.assign(item.env, this.env);
            }
            this.env = item.env;
          } else {
            item.env = this.env;
          }
        }
      }
      Pop() {
        const item = this.stack.pop();
        if (!item.isOpen) {
          delete item.env;
        }
        this.env = this.stack.length ? this.Top().env : {};
        return item;
      }
      Top(n = 1) {
        return this.stack.length < n ? null : this.stack[this.stack.length - n];
      }
      Prev(noPop) {
        const top = this.Top();
        return noPop ? top.First : top.Pop();
      }
      get height() {
        return this.stack.length;
      }
      toString() {
        return "stack[\n  " + this.stack.join("\n  ") + "\n]";
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/TexError.js
var TexError2;
var TexError_default;
var init_TexError = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/TexError.js"() {
    TexError2 = class _TexError {
      static processString(str, args) {
        const parts = str.split(_TexError.pattern);
        for (let i2 = 1, m = parts.length; i2 < m; i2 += 2) {
          let c = parts[i2].charAt(0);
          if (c >= "0" && c <= "9") {
            parts[i2] = args[parseInt(parts[i2], 10) - 1];
            if (typeof parts[i2] === "number") {
              parts[i2] = parts[i2].toString();
            }
          } else if (c === "{") {
            c = parts[i2].substring(1);
            if (c >= "0" && c <= "9") {
              parts[i2] = args[parseInt(parts[i2].substring(1, parts[i2].length - 1), 10) - 1];
              if (typeof parts[i2] === "number") {
                parts[i2] = parts[i2].toString();
              }
            } else {
              const match = parts[i2].match(/^\{([a-z]+):%(\d+)\|(.*)\}$/);
              if (match) {
                parts[i2] = "%" + parts[i2];
              }
            }
          }
        }
        return parts.join("");
      }
      constructor(id, message, ...rest) {
        this.id = id;
        this.message = _TexError.processString(message, rest);
      }
    };
    TexError2.pattern = /%(\d+|\{\d+\}|\{[a-z]+:%\d+(?:\|(?:%\{\d+\}|%.|[^}])*)+\}|.)/g;
    TexError_default = TexError2;
  }
});
// node_modules/@mathjax/src/mjs/input/tex/StackItem.js
var MmlStack;
var BaseItem;
var init_StackItem = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/StackItem.js"() {
    init_TexError();
    init_TexConstants();
    MmlStack = class {
      constructor(_nodes) {
        this._nodes = _nodes;
        this.startStr = "";
        this.startI = 0;
        this.stopI = 0;
      }
      get nodes() {
        return this._nodes;
      }
      Push(...nodes) {
        this._nodes.push(...nodes);
      }
      Pop() {
        return this._nodes.pop();
      }
      get First() {
        return this._nodes[this.Size() - 1];
      }
      set First(node) {
        this._nodes[this.Size() - 1] = node;
      }
      get Last() {
        return this._nodes[0];
      }
      set Last(node) {
        this._nodes[0] = node;
      }
      Peek(n) {
        if (n == null) {
          n = 1;
        }
        return this._nodes.slice(this.Size() - n);
      }
      Size() {
        return this._nodes.length;
      }
      Clear() {
        this._nodes = [];
      }
      toMml(inferred = true, forceRow) {
        if (this._nodes.length === 1 && !forceRow) {
          return this.First;
        }
        return this.create("node", inferred ? "inferredMrow" : "mrow", this._nodes, {});
      }
      create(kind, ...rest) {
        return this.factory.configuration.nodeFactory.create(kind, ...rest);
      }
    };
    BaseItem = class _BaseItem extends MmlStack {
      constructor(factory, ...nodes) {
        super(nodes);
        this.factory = factory;
        this.global = {};
        this._properties = {};
        if (this.isOpen) {
          this._env = {};
        }
      }
      get kind() {
        return "base";
      }
      get env() {
        return this._env;
      }
      set env(value) {
        this._env = value;
      }
      get copyEnv() {
        return true;
      }
      getProperty(key) {
        return this._properties[key];
      }
      setProperty(key, value) {
        this._properties[key] = value;
        return this;
      }
      get isOpen() {
        return false;
      }
      get isClose() {
        return false;
      }
      get isFinal() {
        return false;
      }
      isKind(kind) {
        return kind === this.kind;
      }
      checkItem(item) {
        if (item.isKind("over") && this.isOpen) {
          item.setProperty("num", this.toMml(false));
          this.Clear();
        }
        if (item.isKind("cell") && this.isOpen) {
          if (item.getProperty("linebreak")) {
            return _BaseItem.fail;
          }
          throw new TexError_default("Misplaced", "Misplaced %1", item.getName());
        }
        if (item.isClose && this.getErrors(item.kind)) {
          const [id, message] = this.getErrors(item.kind);
          throw new TexError_default(id, message, item.getName());
        }
        if (!item.isFinal) {
          return _BaseItem.success;
        }
        this.Push(item.First);
        return _BaseItem.fail;
      }
      clearEnv() {
        for (const id of Object.keys(this.env)) {
          delete this.env[id];
        }
      }
      setProperties(def2) {
        Object.assign(this._properties, def2);
        return this;
      }
      getName() {
        return this.getProperty("name");
      }
      toString() {
        return this.kind + "[" + this.nodes.join("; ") + "]";
      }
      getErrors(kind) {
        const CLASS = this.constructor;
        return CLASS.errors[kind] || _BaseItem.errors[kind];
      }
      addLatexItem(node, prefix = "") {
        const str = this.startStr.slice(this.startI, this.stopI);
        if (str) {
          const tex = prefix ? prefix + str : str;
          node.attributes.set(TexConstant.Attr.LATEXITEM, tex);
          if (tex !== "}") {
            node.attributes.set(TexConstant.Attr.LATEX, tex);
          }
        }
      }
    };
    BaseItem.fail = [null, false];
    BaseItem.success = [null, true];
    BaseItem.errors = {
      end: ["MissingBeginExtraEnd", "Missing \\begin{%1} or extra \\end{%1}"],
      close: ["ExtraCloseMissingOpen", "Extra close brace or missing open brace"],
      right: ["MissingLeftExtraRight", "Missing \\left or extra \\right"],
      middle: ["ExtraMiddle", "Extra \\middle"]
    };
  }
});
export{init_HandlerTypes,init_UnitUtil,init_Stack,init_TexError,init_StackItem,init_TexConstants,Stack,HandlerType,BaseItem,TexConstant,TexError_default,UnitUtil,init_NodeUtil,NodeUtil_default,ConfigurationType,init_FindTeX,init_FilterUtil,FindTeX,FilterUtil_default,RegisterHTMLHandler,init_html};
