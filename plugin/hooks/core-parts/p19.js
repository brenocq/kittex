import{__esm,init_OutputJax,init_MathItem,init_MmlNode,init_FontData,init_Options,init_LinebreakVisitor,init_lengths,init_Styles,AbstractOutputJax,FontData,separateOptions,LinebreakVisitor,percent,length2em,TEXCLASS,STATE,Styles,init_Factory,AbstractFactory,init_string,init_BBox,init_LineBBox,em,NOSTRETCH,BBox,LineBBox,TextNode,DIRECTION,BIGDIMEN,px,lookup,unicodeChars,split,__kittexLate}from'./p18.js';export*from'./p18.js';
// node_modules/@mathjax/src/mjs/util/StyleJson.js
var StyleJsonSheet;
var init_StyleJson = __esm({
  "node_modules/@mathjax/src/mjs/util/StyleJson.js"() {
    StyleJsonSheet = class {
      get cssText() {
        return this.getStyleString();
      }
      constructor(styles = null) {
        this.styles = {};
        this.addStyles(styles);
      }
      addStyles(styles) {
        if (!styles)
          return;
        for (const style of Object.keys(styles)) {
          if (!this.styles[style]) {
            this.styles[style] = {};
          }
          Object.assign(this.styles[style], styles[style]);
        }
      }
      removeStyles(...selectors) {
        for (const selector of selectors) {
          delete this.styles[selector];
        }
      }
      clear() {
        this.styles = {};
      }
      getStyleString() {
        return this.getStyleRules().join("\n\n");
      }
      getStyleRules(styles = this.styles, spaces = "") {
        const selectors = Object.keys(styles);
        const defs = new Array(selectors.length);
        let i2 = 0;
        for (const selector of selectors) {
          const data = styles[selector];
          defs[i2++] = `${spaces}${selector} {
${this.getStyleDefString(data, spaces)}
${spaces}}`;
        }
        return defs;
      }
      getStyleDefString(styles, spaces) {
        const properties = Object.keys(styles);
        const values = new Array(properties.length);
        let i2 = 0;
        for (const property of properties) {
          values[i2++] = styles[property] instanceof Object ? spaces + this.getStyleRules({
            [property]: styles[property]
          }, spaces + "  ").join("\n" + spaces) : "  " + spaces + property + ": " + styles[property] + ";";
        }
        return values.join("\n" + spaces);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/output/common.js
var FONTPATH;
var CommonOutputJax;
var init_common = __esm({
  "node_modules/@mathjax/src/mjs/output/common.js"() {
    init_OutputJax();
    init_MathItem();
    init_MmlNode();
    init_FontData();
    init_Options();
    init_LinebreakVisitor();
    init_lengths();
    init_lengths();
    init_Styles();
    init_StyleJson();
    FONTPATH = "@mathjax/%%FONT%%-font";
    CommonOutputJax = class extends AbstractOutputJax {
      get forceInlineBreaks() {
        return false;
      }
      constructor(options3 = {}, defaultFactory = null, defaultFont = null) {
        const [fontClass, font] = options3.fontData instanceof FontData ? [options3.fontData.constructor, options3.fontData] : [options3.fontData || defaultFont, null];
        const [jaxOptions, fontOptions] = separateOptions(options3, fontClass.OPTIONS);
        super(jaxOptions);
        this.factory = this.options.wrapperFactory || new defaultFactory();
        this.factory.jax = this;
        this.styleJson = this.options.styleJson || new StyleJsonSheet();
        this.font = font || new fontClass(fontOptions);
        this.font.setOptions({ mathmlSpacing: this.options.mathmlSpacing });
        this.constructor.genericFont = fontClass;
        this.unknownCache = /* @__PURE__ */ new Map();
        const linebreaks = this.options.linebreaks.LinebreakVisitor || LinebreakVisitor;
        this.linebreaks = new linebreaks(this.factory);
      }
      setAdaptor(adaptor) {
        super.setAdaptor(adaptor);
        if (this.options.htmlHDW === "auto") {
          this.options.htmlHDW = adaptor.canMeasureNodes ? "ignore" : "force";
        }
      }
      addExtension(font, prefix = "") {
        return this.font.addExtension(font, prefix);
      }
      typeset(math, html2) {
        const CLASS = this.constructor;
        const generic = CLASS.genericFont;
        CLASS.genericFont = this.font.constructor;
        this.setDocument(html2);
        const node = this.createNode();
        try {
          this.toDOM(math, node, html2);
        } finally {
          CLASS.genericFont = generic;
        }
        return node;
      }
      createNode() {
        const jax = this.constructor.NAME;
        return this.html("mjx-container", { class: "MathJax", jax });
      }
      setScale(node, wrapper) {
        let scale2 = this.getInitialScale() * this.options.scale;
        if (wrapper.node.attributes.get("overflow") === "scale" && this.math.display) {
          const w = wrapper.getOuterBBox().w;
          const W = Math.max(0, this.math.metrics.containerWidth - 4) / this.pxPerEm;
          if (w > W && w) {
            scale2 *= W / w;
          }
        }
        if (scale2 !== 1) {
          this.adaptor.setStyle(node, "fontSize", percent(scale2));
        }
      }
      getInitialScale() {
        return this.math.metrics.scale;
      }
      toDOM(math, node, html2 = null) {
        var _a2;
        this.setDocument(html2);
        this.math = math;
        this.container = node;
        this.pxPerEm = math.metrics.ex / this.font.params.x_height;
        this.executeFilters(this.preFilters, math, html2, node);
        this.nodeMap = /* @__PURE__ */ new Map();
        math.root.attributes.getAllInherited().overflow = this.options.displayOverflow;
        const overflow = math.root.attributes.get("overflow");
        this.adaptor.setAttribute(node, "overflow", overflow);
        const linebreak = overflow === "linebreak";
        if (linebreak) {
          this.getLinebreakWidth();
        }
        const makeBreaks = this.options.linebreaks.inline && !math.display;
        let inlineMarked = !!math.root.getProperty("inlineMarked");
        if (inlineMarked && (!makeBreaks || this.forceInlineBreaks !== math.root.getProperty("inlineForced"))) {
          this.unmarkInlineBreaks(math.root);
          math.root.removeProperty("inlineMarked");
          math.root.removeProperty("inlineForced");
          inlineMarked = false;
        }
        if (makeBreaks && !inlineMarked) {
          this.markInlineBreaks((_a2 = math.root.childNodes) === null || _a2 === void 0 ? void 0 : _a2[0]);
          math.root.setProperty("inlineMarked", true);
          math.root.setProperty("inlineForced", this.forceInlineBreaks);
        }
        math.root.setTeXclass(null);
        const wrapper = this.factory.wrap(math.root);
        this.setScale(node, wrapper);
        this.processMath(wrapper, node);
        this.nodeMap = null;
        this.executeFilters(this.postFilters, math, html2, node);
      }
      getBBox(math, html2) {
        this.setDocument(html2);
        this.math = math;
        math.root.setTeXclass(null);
        this.nodeMap = /* @__PURE__ */ new Map();
        const bbox = this.factory.wrap(math.root).getOuterBBox();
        this.nodeMap = null;
        return bbox;
      }
      getLinebreakWidth() {
        const W = this.math.metrics.containerWidth / this.pxPerEm;
        const width = this.math.root.attributes.get("maxwidth") || this.options.linebreaks.width;
        this.containerWidth = length2em(width, W, 1, this.pxPerEm);
      }
      markInlineBreaks(node) {
        if (!node)
          return;
        const forcebreak = this.forceInlineBreaks;
        let postbreak = false;
        let marked4 = false;
        let markNext = "";
        for (const child of node.childNodes) {
          if (markNext) {
            marked4 = this.markInlineBreak(marked4, forcebreak, markNext, node, child);
            markNext = "";
            postbreak = false;
          } else if (child.isEmbellished) {
            if (child === node.childNodes[0]) {
              continue;
            }
            const mo = child.coreMO();
            const texClass = mo.texClass;
            const linebreak = mo.attributes.get("linebreak");
            const linebreakstyle = mo.attributes.get("linebreakstyle");
            if ((texClass === TEXCLASS.BIN || texClass === TEXCLASS.REL || texClass === TEXCLASS.ORD && mo.hasSpacingAttributes() || linebreak !== "auto") && linebreak !== "nobreak") {
              if (linebreakstyle === "before") {
                if (!postbreak || linebreak !== "auto") {
                  marked4 = this.markInlineBreak(marked4, forcebreak, linebreak, node, child, mo);
                }
              } else {
                markNext = linebreak;
              }
            }
            postbreak = linebreak === "newline" && linebreakstyle === "after";
          } else if (child.isKind("mspace")) {
            const linebreak = child.attributes.get("linebreak");
            if (linebreak !== "nobreak" && child.canBreak) {
              marked4 = this.markInlineBreak(marked4, forcebreak, linebreak, node, child);
            }
            postbreak = linebreak === "newline";
          } else {
            postbreak = false;
            if (child.isKind("mstyle") && !child.attributes.get("style") && !child.attributes.hasExplicit("mathbackground") || child.isKind("semantics")) {
              this.markInlineBreaks(child.childNodes[0]);
              if (child.getProperty("process-breaks")) {
                child.setProperty("inline-breaks", true);
                child.childNodes[0].setProperty("inline-breaks", true);
                node.parent.setProperty("process-breaks", "true");
              }
            } else if (child.isKind("mrow") && child.attributes.get("data-semantic-added")) {
              this.markInlineBreaks(child);
              if (child.getProperty("process-breaks")) {
                child.setProperty("inline-breaks", true);
                node.parent.setProperty("process-breaks", "true");
              }
            }
          }
        }
      }
      markInlineBreak(marked4, forcebreak, linebreak, node, child, mo = null) {
        child.setProperty("breakable", true);
        if (forcebreak && linebreak !== "newline") {
          child.setProperty("forcebreak", true);
          mo === null || mo === void 0 ? void 0 : mo.setProperty("forcebreak", true);
        } else {
          child.removeProperty("forcebreak");
          mo === null || mo === void 0 ? void 0 : mo.removeProperty("forcebreak");
          if (linebreak === "newline") {
            child.setProperty("newline", true);
          }
        }
        if (!marked4) {
          node.setProperty("process-breaks", true);
          node.parent.setProperty("process-breaks", true);
          marked4 = true;
        }
        return marked4;
      }
      unmarkInlineBreaks(node) {
        if (!node)
          return;
        node.removeProperty("forcebreak");
        node.removeProperty("breakable");
        node.coreMO().removeProperty("forcebreak");
        if (node.getProperty("process-breaks")) {
          node.removeProperty("process-breaks");
          for (const child of node.childNodes) {
            this.unmarkInlineBreaks(child);
          }
        }
      }
      getMetrics(html2) {
        this.setDocument(html2);
        const adaptor = this.adaptor;
        const maps3 = this.getMetricMaps(html2);
        for (const math of html2.math) {
          const parent = adaptor.parent(math.start.node);
          if (math.state() < STATE.METRICS && parent) {
            const map = maps3[math.display ? 1 : 0];
            const { em: em2, ex, containerWidth, scale: scale2, family } = map.get(parent);
            math.setMetrics(em2, ex, containerWidth, scale2);
            if (this.options.mtextInheritFont) {
              math.outputData.mtextFamily = family;
            }
            if (this.options.merrorInheritFont) {
              math.outputData.merrorFamily = family;
            }
            math.state(STATE.METRICS);
          }
        }
      }
      getMetricsFor(node, display) {
        const getFamily = this.options.mtextInheritFont || this.options.merrorInheritFont;
        const test = this.getTestElement(node, display);
        const metrics = Object.assign(Object.assign({}, this.measureMetrics(test, getFamily)), { display });
        this.adaptor.remove(test);
        return metrics;
      }
      getMetricMaps(html2) {
        const adaptor = this.adaptor;
        const domMaps = [
          /* @__PURE__ */ new Map(),
          /* @__PURE__ */ new Map()
        ];
        for (const math of html2.math) {
          const node = adaptor.parent(math.start.node);
          if (node && math.state() < STATE.METRICS) {
            const map = domMaps[math.display ? 1 : 0];
            if (!map.has(node)) {
              map.set(node, this.getTestElement(node, math.display));
            }
          }
        }
        const getFamily = this.options.mtextInheritFont || this.options.merrorInheritFont;
        const maps3 = [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
        for (const i2 of maps3.keys()) {
          for (const node of domMaps[i2].keys()) {
            maps3[i2].set(node, this.measureMetrics(domMaps[i2].get(node), getFamily));
          }
        }
        for (const i2 of maps3.keys()) {
          for (const node of domMaps[i2].values()) {
            adaptor.remove(node);
          }
        }
        return maps3;
      }
      getTestElement(node, display) {
        const adaptor = this.adaptor;
        if (!this.testInline) {
          this.testInline = this.html("mjx-test", {
            style: {
              display: "inline-block",
              width: "100%",
              "font-style": "normal",
              "font-weight": "normal",
              "font-size": "100%",
              "font-size-adjust": "none",
              "text-indent": 0,
              "text-transform": "none",
              "letter-spacing": "normal",
              "word-spacing": "normal",
              overflow: "hidden",
              height: "1px",
              "margin-right": "-1px"
            }
          }, [
            this.html("mjx-left-box", {
              style: {
                display: "inline-block",
                width: 0,
                float: "left"
              }
            }),
            this.html("mjx-ex-box", {
              style: {
                position: "absolute",
                overflow: "hidden",
                width: "1px",
                height: "60ex"
              }
            }),
            this.html("mjx-right-box", {
              style: {
                display: "inline-block",
                width: 0,
                float: "right"
              }
            })
          ]);
          this.testDisplay = adaptor.clone(this.testInline);
          adaptor.setStyle(this.testDisplay, "display", "table");
          adaptor.setStyle(this.testDisplay, "margin-right", "");
          adaptor.setStyle(adaptor.firstChild(this.testDisplay), "display", "none");
          const right = adaptor.lastChild(this.testDisplay);
          adaptor.setStyle(right, "display", "table-cell");
          adaptor.setStyle(right, "width", "10000em");
          adaptor.setStyle(right, "float", "");
        }
        return adaptor.append(node, adaptor.clone(display ? this.testDisplay : this.testInline));
      }
      measureMetrics(node, getFamily) {
        const adaptor = this.adaptor;
        const family = getFamily ? adaptor.fontFamily(node) : "";
        const em2 = adaptor.fontSize(node);
        const [w, h] = adaptor.nodeSize(adaptor.childNode(node, 1));
        const ex = w ? h / 60 : em2 * this.options.exFactor;
        const containerWidth = !w ? 1e6 : adaptor.getStyle(node, "display") === "table" ? adaptor.nodeSize(adaptor.lastChild(node))[0] - 1 : adaptor.nodeBBox(adaptor.lastChild(node)).left - adaptor.nodeBBox(adaptor.firstChild(node)).left - 2;
        const scale2 = Math.max(this.options.minScale, this.options.matchFontHeight ? ex / this.font.params.x_height / em2 : 1);
        return { em: em2, ex, containerWidth, scale: scale2, family };
      }
      styleSheet(html2) {
        this.setDocument(html2);
        this.styleJson.clear();
        this.styleJson.addStyles(this.constructor.commonStyles);
        if ("getStyles" in html2) {
          for (const styles of html2.getStyles()) {
            this.styleJson.addStyles(styles);
          }
        }
        this.addWrapperStyles(this.styleJson);
        this.addFontStyles(this.styleJson);
        const sheet = this.html("style", { id: "MJX-styles" }, [
          this.text("\n" + this.styleJson.cssText + "\n")
        ]);
        return sheet;
      }
      addFontStyles(styles) {
        styles.addStyles(this.font.styles);
      }
      addWrapperStyles(styles) {
        for (const kind of this.factory.getKinds()) {
          this.addClassStyles(this.factory.getNodeClass(kind), styles);
        }
      }
      addClassStyles(CLASS, styles) {
        CLASS.addStyles(styles, this);
      }
      insertStyles(_styles) {
      }
      setDocument(html2) {
        if (html2) {
          this.document = html2;
          this.adaptor.document = html2.document;
        }
      }
      html(type, def2 = {}, content = [], ns) {
        return this.adaptor.node(type, def2, content, ns);
      }
      text(text) {
        return this.adaptor.text(text);
      }
      fixed(m, n = 3) {
        if (Math.abs(m) < 6e-4) {
          return "0";
        }
        return m.toFixed(n).replace(/\.?0+$/, "");
      }
      measureText(text, variant, font = ["", false, false]) {
        const node = this.unknownText(text, variant);
        if (variant === "-explicitFont") {
          const styles = this.cssFontStyles(font);
          this.adaptor.setAttributes(node, { style: styles });
        }
        return this.measureTextNodeWithCache(node, text, variant, font);
      }
      measureTextNodeWithCache(text, chars, variant, font = ["", false, false]) {
        if (variant === "-explicitFont") {
          variant = [font[0], font[1] ? "T" : "F", font[2] ? "T" : "F", ""].join("-");
        }
        if (!this.unknownCache.has(variant)) {
          this.unknownCache.set(variant, /* @__PURE__ */ new Map());
        }
        const map = this.unknownCache.get(variant);
        const cached = map.get(chars);
        if (cached)
          return cached;
        const bbox = this.measureTextNode(text);
        map.set(chars, bbox);
        return bbox;
      }
      cssFontStyles(font, styles = {}) {
        const [family, italic2, bold2] = font;
        styles["font-family"] = this.font.getFamily(family);
        if (italic2)
          styles["font-style"] = "italic";
        if (bold2)
          styles["font-weight"] = "bold";
        return styles;
      }
      getFontData(styles) {
        if (!styles) {
          styles = new Styles();
        }
        return [
          this.font.getFamily(styles.get("font-family")),
          styles.get("font-style") === "italic",
          styles.get("font-weight") === "bold"
        ];
      }
    };
    CommonOutputJax.NAME = "Common";
    CommonOutputJax.OPTIONS = Object.assign(Object.assign({}, AbstractOutputJax.OPTIONS), { scale: 1, minScale: 0.5, mtextInheritFont: false, merrorInheritFont: false, mtextFont: "", merrorFont: "serif", mathmlSpacing: false, skipAttributes: {}, exFactor: 0.5, displayAlign: "center", displayIndent: "0", displayOverflow: "overflow", linebreaks: {
      inline: true,
      width: "100%",
      lineleading: 0.2,
      LinebreakVisitor: null
    }, font: "", fontExtensions: [], htmlHDW: "auto", wrapperFactory: null, fontData: null, fontPath: FONTPATH, styleJson: null });
    CommonOutputJax.commonStyles = {
      'mjx-container[overflow="scroll"][display]': {
        overflow: "auto clip",
        "min-width": "initial !important"
      },
      'mjx-container[overflow="truncate"][display]': {
        overflow: "hidden clip",
        "min-width": "initial !important"
      },
      "mjx-container[display]": {
        display: "block",
        "text-align": "center",
        "justify-content": "center",
        margin: ".7em 0",
        padding: ".3em 2px"
      },
      'mjx-container[display][width="full"]': {
        display: "flex"
      },
      'mjx-container[justify="left"]': {
        "text-align": "left",
        "justify-content": "left"
      },
      'mjx-container[justify="right"]': {
        "text-align": "right",
        "justify-content": "right"
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/core/Tree/WrapperFactory.js
var AbstractWrapperFactory;
var init_WrapperFactory = __esm({
  "node_modules/@mathjax/src/mjs/core/Tree/WrapperFactory.js"() {
    init_Factory();
    AbstractWrapperFactory = class extends AbstractFactory {
      wrap(node, ...args) {
        return this.create(node.kind, node, ...args);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/output/common/WrapperFactory.js
var CommonWrapperFactory;
var init_WrapperFactory2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/WrapperFactory.js"() {
    init_WrapperFactory();
    CommonWrapperFactory = class extends AbstractWrapperFactory {
      constructor() {
        super(...arguments);
        this.jax = null;
      }
      get Wrappers() {
        return this.node;
      }
    };
    CommonWrapperFactory.defaultNodes = {};
  }
});
// node_modules/@mathjax/src/mjs/core/Tree/Wrapper.js
var AbstractWrapper;
var init_Wrapper = __esm({
  "node_modules/@mathjax/src/mjs/core/Tree/Wrapper.js"() {
    AbstractWrapper = class {
      get kind() {
        return this.node.kind;
      }
      constructor(factory, node) {
        this.factory = factory;
        this.node = node;
      }
      wrap(node) {
        return this.factory.wrap(node);
      }
      walkTree(func, data) {
        func(this, data);
        if ("childNodes" in this) {
          for (const child of this.childNodes) {
            if (child) {
              child.walkTree(func, data);
            }
          }
        }
        return data;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrapper.js
function MathMLSpace(script2, nodict, size) {
  return nodict ? script2 ? SMALLSIZE : MOSPACE : script2 ? size < SMALLSIZE ? 0 : SMALLSIZE : size;
}
var SMALLSIZE;
var MOSPACE;
var SPACE3;
var CommonWrapper;
var init_Wrapper2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrapper.js"() {
    init_Wrapper();
    init_MmlNode();
    init_string();
    init_lengths();
    init_Styles();
    init_Options();
    init_BBox();
    init_LineBBox();
    init_FontData();
    SMALLSIZE = 2 / 18;
    MOSPACE = 5 / 18;
    SPACE3 = {
      [em(0)]: "0",
      [em(2 / 18)]: "1",
      [em(3 / 18)]: "2",
      [em(4 / 18)]: "3",
      [em(5 / 18)]: "4",
      [em(6 / 18)]: "5"
    };
    CommonWrapper = class _CommonWrapper extends AbstractWrapper {
      static addStyles(styles, _jax) {
        styles.addStyles(this.styles);
      }
      get jax() {
        return this.factory.jax;
      }
      get adaptor() {
        return this.factory.jax.adaptor;
      }
      get metrics() {
        return this.factory.jax.math.metrics;
      }
      get containerWidth() {
        return this.parent ? this.parent.containerWidth : this.jax.containerWidth;
      }
      get linebreaks() {
        return this.jax.linebreaks;
      }
      get linebreakOptions() {
        return this.jax.options.linebreaks;
      }
      get fixesPWidth() {
        return !this.node.notParent && !this.node.isToken;
      }
      get breakCount() {
        if (this._breakCount < 0) {
          const node = this.node;
          this._breakCount = node.isEmbellished ? this.coreMO().embellishedBreakCount : node.arity < 0 && !node.linebreakContainer && this.childNodes[0].isStack ? this.childNodes[0].breakCount : 0;
        }
        return this._breakCount;
      }
      breakTop(mrow, _child) {
        return this.node.linebreakContainer || !this.parent ? mrow : this.parent.breakTop(mrow, this);
      }
      constructor(factory, node, parent = null) {
        super(factory, node);
        this.parent = null;
        this.dom = null;
        this.removedStyles = null;
        this.styles = null;
        this.styleData = null;
        this.variant = "";
        this.bboxComputed = false;
        this._breakCount = -1;
        this.lineBBox = [];
        this.stretch = NOSTRETCH;
        this.font = null;
        this.parent = parent;
        this.font = factory.jax.font;
        this.bbox = BBox.zero();
        this.getStyles();
        this.getStyleData();
        this.getVariant();
        this.getScale();
        this.getSpace();
        this.childNodes = node.childNodes.map((child) => {
          const wrapped = this.wrap(child);
          if (wrapped.bbox.pwidth && (node.notParent || node.isKind("math"))) {
            this.bbox.pwidth = BBox.fullWidth;
          }
          return wrapped;
        });
      }
      wrap(node, parent = null) {
        const wrapped = this.factory.wrap(node, parent || this);
        if (parent) {
          parent.childNodes.push(wrapped);
        }
        this.jax.nodeMap.set(node, wrapped);
        return wrapped;
      }
      getBBox(save = true) {
        if (this.bboxComputed) {
          return this.bbox;
        }
        const bbox = save ? this.bbox : BBox.zero();
        this.computeBBox(bbox);
        this.bboxComputed = save;
        return bbox;
      }
      getOuterBBox(save = true) {
        var _a2;
        const bbox = this.getBBox(save);
        if (!this.styleData)
          return bbox;
        const padding2 = this.styleData.padding;
        const border = ((_a2 = this.styleData.border) === null || _a2 === void 0 ? void 0 : _a2.width) || [0, 0, 0, 0];
        const margin = this.styleData.margin || [0, 0, 0, 0];
        const obox = bbox.copy();
        for (const [, i2, side] of BBox.boxSides) {
          obox[side] += padding2[i2] + border[i2] + margin[i2];
        }
        return obox;
      }
      getUnbrokenHD() {
        const n = this.breakCount + 1;
        let H2 = 0;
        let D = 0;
        for (let i2 = 0; i2 < n; i2++) {
          const { h, d } = this.getLineBBox(i2);
          if (h > H2) {
            H2 = h;
          }
          if (d > D) {
            D = d;
          }
        }
        return [H2, D];
      }
      computeBBox(bbox, recompute = false) {
        bbox.empty();
        for (const child of this.childNodes) {
          bbox.append(child.getOuterBBox());
        }
        bbox.clean();
        if (this.fixesPWidth && this.setChildPWidths(recompute)) {
          this.computeBBox(bbox, true);
        }
      }
      getLineBBox(i2) {
        if (!this.lineBBox[i2]) {
          const n = this.breakCount;
          if (n) {
            const line = this.embellishedBBox(i2) || this.computeLineBBox(i2);
            this.lineBBox[i2] = line;
            if (i2 === 0) {
              if (!this.node.isKind("mo") && this.node.isEmbellished) {
                line.originalL = this.getBBox().L;
              } else {
                line.L = this.getBBox().L;
              }
            }
            if (i2 === n) {
              line.R = this.getBBox().R;
            }
          } else {
            const obox = this.getOuterBBox();
            this.lineBBox[i2] = LineBBox.from(obox, this.linebreakOptions.lineleading);
          }
        }
        return this.lineBBox[i2];
      }
      embellishedBBox(i2) {
        if (!this.node.isEmbellished || this.node.isKind("mo"))
          return null;
        const mo = this.coreMO();
        return mo.moLineBBox(i2, mo.embellishedBreakStyle, this.getOuterBBox());
      }
      computeLineBBox(i2) {
        return this.getChildLineBBox(this.childNodes[0], i2);
      }
      getBreakNode(bbox) {
        var _a2, _b2;
        if (!bbox.start) {
          return [this, null];
        }
        const [i2, j] = bbox.start;
        if (this.node.isEmbellished) {
          return [this, this.coreMO()];
        }
        const childNodes = ((_b2 = (_a2 = this.childNodes[0]) === null || _a2 === void 0 ? void 0 : _a2.node) === null || _b2 === void 0 ? void 0 : _b2.isInferred) || this.node.isKind("semantics") ? this.childNodes[0].childNodes : this.childNodes;
        if (this.node.isToken || !childNodes[i2]) {
          return [this, null];
        }
        return childNodes[i2].getBreakNode(childNodes[i2].getLineBBox(j));
      }
      getChildLineBBox(child, i2) {
        const n = this.breakCount;
        let cbox = child.getLineBBox(i2);
        if (this.styleData || this.bbox.L || this.bbox.R) {
          cbox = cbox.copy();
        }
        this.addMiddleBorders(cbox);
        if (i2 === 0) {
          cbox.L += this.bbox.L;
          this.addLeftBorders(cbox);
        } else if (i2 === n) {
          cbox.R += this.bbox.R;
          this.addRightBorders(cbox);
        }
        return cbox;
      }
      sideStyleSize(n) {
        var _a2;
        const border = this.styleData.border;
        const padding2 = this.styleData.padding;
        const margin = this.styleData.margin;
        return (((_a2 = border === null || border === void 0 ? void 0 : border.width) === null || _a2 === void 0 ? void 0 : _a2[n]) || 0) + ((padding2 === null || padding2 === void 0 ? void 0 : padding2[n]) || 0) + ((margin === null || margin === void 0 ? void 0 : margin[n]) || 0);
      }
      addLeftBorders(bbox) {
        if (!this.styleData)
          return;
        bbox.w += this.sideStyleSize(3);
      }
      addMiddleBorders(bbox) {
        if (!this.styleData)
          return;
        bbox.h += this.sideStyleSize(0);
        bbox.d += this.sideStyleSize(2);
      }
      addRightBorders(bbox) {
        if (!this.styleData)
          return;
        bbox.w += this.sideStyleSize(1);
      }
      setChildPWidths(recompute, w = null, clear = true) {
        if (recompute) {
          return false;
        }
        if (clear) {
          this.bbox.pwidth = "";
        }
        let changed = false;
        for (const child of this.childNodes) {
          const cbox = child.getBBox();
          if (cbox.pwidth && child.setChildPWidths(recompute, w === null ? cbox.w : w, clear)) {
            changed = true;
          }
        }
        return changed;
      }
      breakToWidth(_W) {
      }
      invalidateBBox(bubble = true) {
        if (this.bboxComputed || this._breakCount >= 0) {
          this.bboxComputed = false;
          this.lineBBox = [];
          this._breakCount = -1;
          if (this.parent && bubble) {
            this.parent.invalidateBBox();
          }
        }
      }
      copySkewIC(bbox) {
        var _a2, _b2, _c;
        const first = this.childNodes[0];
        if ((_a2 = first === null || first === void 0 ? void 0 : first.bbox) === null || _a2 === void 0 ? void 0 : _a2.sk) {
          bbox.sk = first.bbox.sk;
        }
        if ((_b2 = first === null || first === void 0 ? void 0 : first.bbox) === null || _b2 === void 0 ? void 0 : _b2.dx) {
          bbox.dx = first.bbox.dx;
        }
        const last = this.childNodes[this.childNodes.length - 1];
        if ((_c = last === null || last === void 0 ? void 0 : last.bbox) === null || _c === void 0 ? void 0 : _c.ic) {
          bbox.ic = last.bbox.ic;
          bbox.w += bbox.ic;
        }
      }
      getStyles() {
        const styleString = this.node.attributes.getExplicit("style");
        if (!styleString)
          return;
        const style = this.styles = new Styles(styleString);
        for (let i2 = 0, m = _CommonWrapper.removeStyles.length; i2 < m; i2++) {
          const id = _CommonWrapper.removeStyles[i2];
          if (style.get(id)) {
            if (!this.removedStyles)
              this.removedStyles = {};
            this.removedStyles[id] = style.get(id);
            style.set(id, "");
          }
        }
      }
      getStyleData() {
        if (!this.styles)
          return;
        const padding2 = Array(4).fill(0);
        const margin = Array(4).fill(0);
        const width = Array(4).fill(0);
        const style = Array(4);
        const color = Array(4);
        let hasPadding = false;
        let hasBorder = false;
        let hasMargin = false;
        for (const [name, i2] of BBox.boxSides) {
          const key = "border" + name;
          const w = this.styles.get(key + "Width");
          if (w) {
            hasBorder = true;
            width[i2] = Math.max(0, this.length2em(w, 1));
            style[i2] = this.styles.get(key + "Style") || "solid";
            color[i2] = this.styles.get(key + "Color");
          }
          const p = this.styles.get("padding" + name);
          if (p) {
            hasPadding = true;
            padding2[i2] = Math.max(0, this.length2em(p, 1));
          }
          const m = this.styles.get("margin" + name);
          if (m) {
            hasMargin = true;
            margin[i2] = this.length2em(m, 1);
          }
        }
        this.styleData = hasPadding || hasBorder || hasMargin ? {
          padding: padding2,
          margin,
          border: hasBorder ? { width, style, color } : null
        } : null;
      }
      getVariant() {
        if (!this.node.isToken)
          return;
        const attributes = this.node.attributes;
        let variant = attributes.get("mathvariant");
        if (attributes.hasExplicit("mathvariant")) {
          if (!this.font.getVariant(variant)) {
            console.warn(`Invalid variant: ${variant}`);
            variant = "normal";
          }
        } else {
          const values = attributes.getList("fontfamily", "fontweight", "fontstyle");
          if (this.removedStyles) {
            const style = this.removedStyles;
            if (style.fontFamily)
              values.family = style.fontFamily;
            if (style.fontWeight)
              values.weight = style.fontWeight;
            if (style.fontStyle)
              values.style = style.fontStyle;
          }
          if (values.fontfamily)
            values.family = values.fontfamily;
          if (values.fontweight)
            values.weight = values.fontweight;
          if (values.fontstyle)
            values.style = values.fontstyle;
          if (values.weight && values.weight.match(/^\d+$/)) {
            values.weight = parseInt(values.weight) > 600 ? "bold" : "normal";
          }
          if (values.family) {
            variant = this.explicitVariant(values.family, values.weight, values.style);
          } else {
            if (this.node.getProperty("variantForm"))
              variant = "-tex-variant";
            variant = (_CommonWrapper.BOLDVARIANTS[values.weight] || {})[variant] || variant;
            variant = (_CommonWrapper.ITALICVARIANTS[values.style] || {})[variant] || variant;
          }
        }
        this.variant = variant;
      }
      explicitVariant(fontFamily, fontWeight, fontStyle) {
        let style = this.styles;
        if (!style)
          style = this.styles = new Styles();
        style.set("fontFamily", fontFamily);
        if (fontWeight)
          style.set("fontWeight", fontWeight);
        if (fontStyle)
          style.set("fontStyle", fontStyle);
        return "-explicitFont";
      }
      getScale() {
        let scale2 = 1;
        const parent = this.parent;
        const pscale = parent ? parent.bbox.scale : 1;
        const attributes = this.node.attributes;
        const scriptlevel = Math.min(attributes.get("scriptlevel"), 2);
        let fontsize = attributes.get("fontsize");
        let mathsize = this.node.isToken || this.node.isKind("mstyle") ? attributes.get("mathsize") : attributes.getInherited("mathsize");
        if (scriptlevel !== 0) {
          scale2 = Math.pow(attributes.get("scriptsizemultiplier"), scriptlevel);
        }
        if (this.removedStyles && this.removedStyles.fontSize && !fontsize) {
          fontsize = this.removedStyles.fontSize;
        }
        if (fontsize && !attributes.hasExplicit("mathsize")) {
          mathsize = fontsize;
        }
        if (mathsize !== "1") {
          scale2 *= this.length2em(mathsize, 1, 1);
        }
        if (scriptlevel !== 0) {
          const scriptminsize = this.length2em(attributes.get("scriptminsize"), 0.4, 1);
          if (scale2 < scriptminsize)
            scale2 = scriptminsize;
        }
        this.bbox.scale = scale2;
        this.bbox.rscale = scale2 / pscale;
      }
      getSpace() {
        const isTop = this.isTopEmbellished();
        const hasSpacing = this.node.hasSpacingAttributes();
        if (this.jax.options.mathmlSpacing || hasSpacing) {
          if (isTop) {
            this.getMathMLSpacing();
          }
        } else {
          this.getTeXSpacing(isTop, hasSpacing);
        }
      }
      getMathMLSpacing() {
        const node = this.node.coreMO();
        const child = node.coreParent();
        const parent = child.parent;
        if (!parent || !parent.isKind("mrow") || parent.childNodes.length === 1) {
          return;
        }
        const n = parent.childIndex(child);
        if (n === null)
          return;
        const noDictDef = node.getProperty("noDictDef");
        const attributes = node.attributes;
        const isScript = attributes.get("scriptlevel") > 0;
        this.bbox.L = attributes.isSet("lspace") ? Math.max(0, this.length2em(attributes.get("lspace"))) : MathMLSpace(isScript, noDictDef, node.lspace);
        this.bbox.R = attributes.isSet("rspace") ? Math.max(0, this.length2em(attributes.get("rspace"))) : MathMLSpace(isScript, noDictDef, node.rspace);
        if (!n)
          return;
        const prev = parent.childNodes[n - 1];
        if (!prev.isEmbellished)
          return;
        const bbox = this.jax.nodeMap.get(prev).getBBox();
        if (bbox.R) {
          this.bbox.L = Math.max(0, this.bbox.L - bbox.R);
        }
      }
      getTeXSpacing(isTop, hasSpacing) {
        if (!hasSpacing) {
          const space = this.node.texSpacing();
          if (space) {
            this.bbox.L = this.length2em(space);
          }
        }
        if (isTop || hasSpacing) {
          const attributes = this.node.coreMO().attributes;
          if (attributes.isSet("lspace")) {
            this.bbox.L = Math.max(0, this.length2em(attributes.get("lspace")));
          }
          if (attributes.isSet("rspace")) {
            this.bbox.R = Math.max(0, this.length2em(attributes.get("rspace")));
          }
        }
      }
      isTopEmbellished() {
        return this.node.isEmbellished && !(this.node.parent && this.node.parent.isEmbellished);
      }
      core() {
        return this.jax.nodeMap.get(this.node.core());
      }
      coreMO() {
        return this.jax.nodeMap.get(this.node.coreMO());
      }
      coreRScale() {
        let rscale = this.bbox.rscale;
        let node = this.coreMO();
        while (node !== this && node) {
          rscale *= node.bbox.rscale;
          node = node.parent;
        }
        return rscale;
      }
      getRScale() {
        let rscale = 1;
        let node = this;
        while (node) {
          rscale *= node.bbox.rscale;
          node = node.parent;
        }
        return rscale;
      }
      getText() {
        let text = "";
        if (this.node.isToken) {
          for (const child of this.node.childNodes) {
            if (child instanceof TextNode) {
              text += child.getText();
            }
          }
        }
        return text;
      }
      canStretch(direction) {
        this.stretch = NOSTRETCH;
        if (this.node.isEmbellished) {
          const core = this.core();
          if (core && core.node !== this.node) {
            if (core.canStretch(direction)) {
              this.stretch = core.stretch;
            }
          }
        }
        return this.stretch.dir !== DIRECTION.None;
      }
      getAlignShift() {
        let { indentalign, indentshift, indentalignfirst, indentshiftfirst } = this.node.attributes.getAllAttributes();
        if (indentalignfirst !== "indentalign") {
          indentalign = indentalignfirst;
        }
        if (indentshiftfirst !== "indentshift") {
          indentshift = indentshiftfirst;
        }
        return this.processIndent(indentalign, indentshift);
      }
      processIndent(indentalign, indentshift, align = "", shift = "", width = this.metrics.containerWidth) {
        if (!this.jax.math.display) {
          return ["left", 0];
        }
        if (!align || align === "auto") {
          align = this.jax.math.root.getProperty("inlineMarked") ? "left" : this.jax.options.displayAlign;
        }
        if (!shift || shift === "auto") {
          shift = this.jax.math.root.getProperty("inlineMarked") ? "0" : this.jax.options.displayIndent;
        }
        if (indentalign === "auto") {
          indentalign = align;
        }
        if (indentshift === "auto") {
          indentshift = shift;
          if (indentalign === "right" && !indentshift.match(/^\s*0[a-z]*\s*$/)) {
            indentshift = ("-" + indentshift.trim()).replace(/^--/, "");
          }
        }
        const indent = this.length2em(indentshift, width);
        return [indentalign, indent];
      }
      getAlignX(W, bbox, align) {
        return align === "right" ? W - (bbox.w + bbox.R) * bbox.rscale : align === "left" ? bbox.L * bbox.rscale : (W - bbox.w * bbox.rscale) / 2;
      }
      getAlignY(H2, D, h, d, align) {
        return align === "top" ? H2 - h : align === "bottom" ? d - D : align === "center" ? (H2 - h - (D - d)) / 2 : 0;
      }
      getWrapWidth(i2) {
        return this.childNodes[i2].getBBox().w;
      }
      getChildAlign(_i) {
        return "left";
      }
      percent(m) {
        return percent(m);
      }
      em(m) {
        return em(m);
      }
      px(m, M = -BIGDIMEN) {
        return px(m, M, this.metrics.em);
      }
      length2em(length4, size = 1, scale2 = null) {
        if (scale2 === null) {
          scale2 = this.bbox.scale;
        }
        const t = this.font.params.rule_thickness;
        const factor = lookup(length4, { medium: 1, thin: 2 / 3, thick: 5 / 3 }, 0);
        return factor ? factor * t : length2em(length4, size, scale2, this.jax.pxPerEm);
      }
      unicodeChars(text, name = this.variant) {
        let chars = unicodeChars(text);
        const variant = this.font.getVariant(name);
        if (variant && variant.chars) {
          const map = variant.chars;
          chars = chars.map((n) => {
            var _a2, _b2;
            return ((_b2 = (_a2 = map[n]) === null || _a2 === void 0 ? void 0 : _a2[3]) === null || _b2 === void 0 ? void 0 : _b2.smp) || n;
          });
        }
        return chars;
      }
      remapChars(chars) {
        return chars;
      }
      mmlText(text) {
        return this.node.factory.create("text").setText(text);
      }
      mmlNode(kind, properties = {}, children = []) {
        return this.node.factory.create(kind, properties, children);
      }
      createMo(text) {
        const mmlFactory = this.node.factory;
        const textNode = mmlFactory.create("text").setText(text);
        const mml = mmlFactory.create("mo", { stretchy: true }, [textNode]);
        mml.inheritAttributesFrom(this.node);
        mml.parent = this.node.parent;
        const node = this.wrap(mml);
        node.parent = this;
        return node;
      }
      getVariantChar(variant, n) {
        const char = this.font.getChar(variant, n) || [0, 0, 0, { unknown: true }];
        if (char.length === 3) {
          char[3] = {};
        }
        return char;
      }
      html(type, def2 = {}, content = []) {
        return this.jax.html(type, def2, content);
      }
    };
    CommonWrapper.kind = "unknown";
    CommonWrapper.styles = {};
    CommonWrapper.removeStyles = [
      "fontSize",
      "fontFamily",
      "fontWeight",
      "fontStyle",
      "fontVariant",
      "font"
    ];
    CommonWrapper.skipAttributes = {
      fontfamily: true,
      fontsize: true,
      fontweight: true,
      fontstyle: true,
      color: true,
      background: true,
      class: true,
      href: true,
      style: true,
      xmlns: true
    };
    CommonWrapper.BOLDVARIANTS = {
      bold: {
        normal: "bold",
        italic: "bold-italic",
        fraktur: "bold-fraktur",
        script: "bold-script",
        "sans-serif": "bold-sans-serif",
        "sans-serif-italic": "sans-serif-bold-italic"
      },
      normal: {
        bold: "normal",
        "bold-italic": "italic",
        "bold-fraktur": "fraktur",
        "bold-script": "script",
        "bold-sans-serif": "sans-serif",
        "sans-serif-bold-italic": "sans-serif-italic"
      }
    };
    CommonWrapper.ITALICVARIANTS = {
      italic: {
        normal: "italic",
        bold: "bold-italic",
        "sans-serif": "sans-serif-italic",
        "bold-sans-serif": "sans-serif-bold-italic"
      },
      normal: {
        italic: "normal",
        "bold-italic": "bold",
        "sans-serif-italic": "sans-serif",
        "sans-serif-bold-italic": "bold-sans-serif"
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrapper.js
var SvgWrapper;
var init_Wrapper3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrapper.js"() {
    init_string();
    init_Wrapper2();
    (__kittexLate.init_svg2?.())();
    SvgWrapper = class _SvgWrapper extends CommonWrapper {
      constructor() {
        super(...arguments);
        this.dx = 0;
        this.utext = "";
      }
      toSVG(parents) {
        if (this.toEmbellishedSVG(parents))
          return;
        this.addChildren(this.standardSvgNodes(parents));
      }
      toEmbellishedSVG(parents) {
        if (parents.length <= 1 || !this.node.isEmbellished || this.node.parent.isEmbellished) {
          return false;
        }
        const style = this.coreMO().embellishedBreakStyle;
        const dom = [];
        for (const [parent, STYLE] of [
          [parents[0], "before"],
          [parents[1], "after"]
        ]) {
          if (style !== STYLE) {
            this.toSVG([parent]);
            dom.push(this.dom[0]);
            this.place(0, 0);
          } else {
            dom.push(this.createSvgNodes([parent])[0]);
          }
        }
        this.dom = dom;
        return true;
      }
      addChildren(parents) {
        let x2 = 0;
        for (const child of this.childNodes) {
          child.toSVG(parents);
          const bbox = child.getOuterBBox();
          if (child.dom) {
            child.place(x2 + bbox.L * bbox.rscale, 0);
          }
          x2 += (bbox.L + bbox.w + bbox.R) * bbox.rscale;
        }
      }
      standardSvgNodes(parents) {
        const svg = this.createSvgNodes(parents);
        this.handleStyles();
        this.handleScale();
        this.handleBorder();
        this.handleColor();
        this.handleAttributes();
        return svg;
      }
      createSvgNodes(parents) {
        this.dom = parents.map((_parent) => this.svg("g", { "data-mml-node": this.node.kind }));
        parents = this.handleHref(parents);
        for (const i2 of parents.keys()) {
          this.adaptor.append(parents[i2], this.dom[i2]);
        }
        return this.dom;
      }
      handleHref(parents) {
        const href = this.node.attributes.get("href");
        if (!href)
          return parents;
        let i2 = 0;
        const isEmbellished = this.node.isEmbellished && !this.node.isKind("mo");
        return parents.map((parent) => {
          parent = this.adaptor.append(parent, this.svg("a", { href }));
          const { h, d, w } = isEmbellished ? this.getOuterBBox() : this.getLineBBox(i2);
          this.adaptor.append(this.dom[i2++], this.svg("rect", {
            "data-hitbox": true,
            fill: "none",
            stroke: "none",
            "pointer-events": "all",
            width: this.fixed(w),
            height: this.fixed(h + d),
            x: i2 === 1 || isEmbellished ? this.fixed(-this.dx) : 0,
            y: this.fixed(-d)
          }));
          return parent;
        });
      }
      handleStyles() {
        var _a2, _b2, _c, _d;
        if (!this.styles)
          return;
        const styles = this.styles.cssText;
        if (styles) {
          this.dom.forEach((node) => this.adaptor.setAttribute(node, "style", styles));
        }
        const padding2 = (((_a2 = this.styleData) === null || _a2 === void 0 ? void 0 : _a2.padding) || [0, 0, 0, 0])[3];
        const margin = (((_b2 = this.styleData) === null || _b2 === void 0 ? void 0 : _b2.margin) || [0, 0, 0, 0])[3];
        const border = (((_d = (_c = this.styleData) === null || _c === void 0 ? void 0 : _c.border) === null || _d === void 0 ? void 0 : _d.width) || [0, 0, 0, 0])[3];
        if (padding2 || border) {
          this.dx = padding2 + border;
        }
        if (margin) {
          const transform = `translate(${this.fixed(margin)},0)`;
          this.dom.forEach((node) => this.adaptor.setAttribute(node, "transform", transform));
        }
      }
      handleScale() {
        if (this.bbox.rscale !== 1) {
          const scale2 = "scale(" + this.fixed(this.bbox.rscale / 1e3, 3) + ")";
          this.dom.forEach((node) => this.adaptor.setAttribute(node, "transform", scale2));
        }
      }
      handleColor() {
        var _a2;
        const adaptor = this.adaptor;
        const attributes = this.node.attributes;
        const color = attributes.getExplicit("mathcolor") || attributes.getExplicit("color");
        const background = attributes.getExplicit("mathbackground") || attributes.getExplicit("background") || ((_a2 = this.styles) === null || _a2 === void 0 ? void 0 : _a2.get("background-color"));
        if (color) {
          this.dom.forEach((node) => {
            adaptor.setAttribute(node, "fill", color);
            adaptor.setAttribute(node, "stroke", color);
          });
        }
        if (background) {
          let i2 = 0;
          const isEmbellished = this.node.isEmbellished && !this.node.isKind("mo");
          this.dom.forEach((node) => {
            const { h, d, w } = isEmbellished ? this.getOuterBBox() : this.getLineBBox(i2++);
            const rect = this.svg("rect", {
              fill: background,
              x: i2 === 1 || isEmbellished ? this.fixed(-this.dx) : 0,
              y: this.fixed(-d),
              width: this.fixed(w),
              height: this.fixed(h + d),
              "data-bgcolor": true
            });
            const child = adaptor.firstChild(node);
            if (child) {
              adaptor.insert(rect, child);
            } else {
              adaptor.append(node, rect);
            }
          });
        }
      }
      handleBorder() {
        var _a2, _b2, _c;
        const border = (_a2 = this.styleData) === null || _a2 === void 0 ? void 0 : _a2.border;
        if (!border)
          return;
        const margin = (_c = (_b2 = this.styleData) === null || _b2 === void 0 ? void 0 : _b2.margin) !== null && _c !== void 0 ? _c : [0, 0, 0, 0];
        const f = _SvgWrapper.borderFuzz;
        const adaptor = this.adaptor;
        let k = 0;
        const n = this.dom.length - 1;
        const isEmbellished = this.node.isEmbellished && !this.node.isKind("mo");
        for (const dom of this.dom) {
          const L = !n || !k ? 1 : 0;
          const R = !n || k === n ? 1 : 0;
          const bbox = isEmbellished ? this.getOuterBBox() : this.getLineBBox(k++);
          const h = bbox.h - margin[0] + f;
          const d = bbox.d - margin[2] + f;
          const w = bbox.w - margin[1] - margin[3] + f;
          const outerRT = [w, h];
          const outerLT = [-f, h];
          const outerRB = [w, -d];
          const outerLB = [-f, -d];
          const innerRT = [w - R * border.width[1], h - border.width[0]];
          const innerLT = [-f + L * border.width[3], h - border.width[0]];
          const innerRB = [w - R * border.width[1], -d + border.width[2]];
          const innerLB = [-f + L * border.width[3], -d + border.width[2]];
          const paths = [
            [outerLT, outerRT, innerRT, innerLT],
            [outerRB, outerRT, innerRT, innerRB],
            [outerLB, outerRB, innerRB, innerLB],
            [outerLB, outerLT, innerLT, innerLB]
          ];
          const child = adaptor.firstChild(dom);
          const dx = L * this.dx;
          for (const i2 of [0, 1, 2, 3]) {
            if (!border.width[i2] || i2 === 3 && !L || i2 === 1 && !R)
              continue;
            const path = paths[i2];
            if (border.style[i2] === "dashed" || border.style[i2] === "dotted") {
              this.addBorderBroken(path, border.color[i2], border.style[i2], border.width[i2], i2, dom, dx);
            } else {
              this.addBorderSolid(path, border.color[i2], child, dom, dx);
            }
          }
        }
      }
      addBorderSolid(path, color, child, parent, dx) {
        const border = this.svg("polygon", {
          points: path.map(([x2, y]) => `${this.fixed(x2 - dx)},${this.fixed(y)}`).join(" "),
          stroke: "none"
        });
        if (color) {
          this.adaptor.setAttribute(border, "fill", color);
        }
        if (child) {
          this.adaptor.insert(border, child);
        } else {
          this.adaptor.append(parent, border);
        }
      }
      addBorderBroken(path, color, style, t, i2, parent, dx) {
        const dot = style === "dotted";
        const t2 = t / 2;
        const [tx1, ty1, tx2, ty2] = [
          [t2, -t2, -t2, -t2],
          [-t2, t2, -t2, -t2],
          [t2, t2, -t2, t2],
          [t2, t2, t2, -t2]
        ][i2];
        const [A, B] = path;
        const x1 = A[0] + tx1 - dx;
        const y1 = A[1] + ty1;
        const x2 = B[0] + tx2 - dx;
        const y2 = B[1] + ty2;
        const W = Math.abs(i2 % 2 ? y2 - y1 : x2 - x1);
        const n = dot ? Math.ceil(W / (2 * t)) : Math.ceil((W - t) / (4 * t));
        const m = W / (4 * n + 1);
        const line = this.svg("line", {
          x1: this.fixed(x1),
          y1: this.fixed(y1),
          x2: this.fixed(x2),
          y2: this.fixed(y2),
          "stroke-width": this.fixed(t),
          stroke: color,
          "stroke-linecap": dot ? "round" : "square",
          "stroke-dasharray": dot ? [1, this.fixed(W / n - 2e-3)].join(" ") : [this.fixed(m), this.fixed(3 * m)].join(" ")
        });
        const adaptor = this.adaptor;
        const child = adaptor.firstChild(parent);
        if (child) {
          adaptor.insert(line, child);
        } else {
          adaptor.append(parent, line);
        }
      }
      handleAttributes() {
        const adaptor = this.adaptor;
        const attributes = this.node.attributes;
        const defaults = attributes.getAllDefaults();
        const skip = _SvgWrapper.skipAttributes;
        for (const name of attributes.getExplicitNames()) {
          if (skip[name] === false || !(name in defaults) && !skip[name] && !adaptor.hasAttribute(this.dom[0], name)) {
            this.dom.forEach((dom) => adaptor.setAttribute(dom, name, attributes.getExplicit(name)));
          }
        }
        if (attributes.get("class")) {
          for (const name of split(attributes.get("class"))) {
            this.dom.forEach((node) => adaptor.addClass(node, name));
          }
        }
      }
      place(x2, y, element = null) {
        if (!element) {
          x2 += this.dx * this.bbox.rscale;
        }
        if (!(x2 || y))
          return;
        if (!element) {
          element = this.dom[0];
          y = this.handleId(y);
        }
        const translate3 = `translate(${this.fixed(x2)},${this.fixed(y)})`;
        const transform = this.adaptor.getAttribute(element, "transform") || "";
        this.adaptor.setAttribute(element, "transform", translate3 + (transform ? " " + transform : ""));
      }
      handleId(y) {
        if (!this.node.attributes || !this.node.attributes.get("id")) {
          return y;
        }
        const adaptor = this.adaptor;
        const { h, rscale } = this.getBBox();
        const children = adaptor.childNodes(this.dom[0]);
        children.forEach((child) => adaptor.remove(child));
        const g = this.svg("g", { "data-idbox": true, transform: `translate(0,${this.fixed(-h)})` }, children);
        adaptor.append(this.dom[0], this.svg("text", { "data-id-align": true }, [this.text("")]));
        adaptor.append(this.dom[0], g);
        return y + h * rscale;
      }
      firstChild(dom = this.dom[0]) {
        const adaptor = this.adaptor;
        let child = adaptor.firstChild(dom);
        if (child && adaptor.kind(child) === "text" && adaptor.getAttribute(child, "data-id-align")) {
          child = adaptor.firstChild(adaptor.next(child));
        }
        if (child && adaptor.kind(child) === "rect" && adaptor.getAttribute(child, "data-hitbox")) {
          child = adaptor.next(child);
        }
        return child;
      }
      placeChar(n, x2, y, parent, variant = null, buffer = false) {
        if (variant === null) {
          variant = this.variant;
        }
        const C = n.toString(16).toUpperCase();
        const [, , w, data] = this.getVariantChar(variant, n);
        if (data.unknown) {
          this.utext += String.fromCodePoint(n);
          return buffer ? 0 : this.addUtext(x2, y, parent, variant);
        }
        const dx = this.addUtext(x2, y, parent, variant);
        if ("p" in data) {
          x2 += dx;
          const path = data.p ? "M" + data.p + "Z" : "";
          this.place(x2, y, this.adaptor.append(parent, this.charNode(variant, C, path)));
          return w + dx;
        }
        if ("c" in data) {
          const g = this.adaptor.append(parent, this.svg("g", { "data-c": C }));
          this.place(x2 + dx, y, g);
          x2 = 0;
          for (const n2 of this.unicodeChars(data.c, variant)) {
            x2 += this.placeChar(n2, x2, y, g, variant);
          }
          return x2 + dx;
        }
        return w;
      }
      addUtext(x2, y, parent, variant) {
        const c = this.utext;
        if (!c) {
          return 0;
        }
        this.utext = "";
        const text = this.adaptor.append(parent, this.jax.unknownText(c, variant));
        this.place(x2, y, text);
        return this.jax.measureTextNodeWithCache(text, c, variant).w;
      }
      charNode(variant, C, path) {
        const cache = this.jax.options.fontCache;
        return cache !== "none" ? this.useNode(variant, C, path) : this.pathNode(C, path);
      }
      pathNode(C, path) {
        return this.svg("path", { "data-c": C, d: path });
      }
      useNode(variant, C, path) {
        const use2 = this.svg("use", { "data-c": C });
        const id = "#" + this.jax.fontCache.cachePath(variant, C, path);
        this.adaptor.setAttribute(use2, "href", id, this.jax.options.useXlink ? (__kittexLate.XLINKNS?.()) : null);
        return use2;
      }
      drawBBox() {
        var _a2, _b2;
        const { w, h, d } = this.getOuterBBox();
        const L = (((_b2 = (_a2 = this.styleData) === null || _a2 === void 0 ? void 0 : _a2.border) === null || _b2 === void 0 ? void 0 : _b2.width) || [0, 0, 0, 0])[3];
        const def2 = { style: { opacity: 0.25 } };
        if (L) {
          def2.transform = `translate(${this.fixed(-L)}, 0)`;
        }
        const box = this.svg("g", def2, [
          this.svg("rect", {
            fill: "red",
            height: this.fixed(h),
            width: this.fixed(w)
          }),
          this.svg("rect", {
            fill: "green",
            height: this.fixed(d),
            width: this.fixed(w),
            y: this.fixed(-d)
          })
        ]);
        const node = this.dom[0] || this.parent.dom[0];
        this.adaptor.append(node, box);
      }
      html(type, def2 = {}, content = []) {
        return this.jax.html(type, def2, content);
      }
      svg(type, def2 = {}, content = []) {
        return this.jax.svg(type, def2, content);
      }
      text(text) {
        return this.jax.text(text);
      }
      fixed(x2, n = 1) {
        return this.jax.fixed(x2 * 1e3, n);
      }
    };
    SvgWrapper.kind = "unknown";
    SvgWrapper.borderFuzz = 5e-3;
  }
});
export{init_Wrapper3,SvgWrapper,init_WrapperFactory2,CommonWrapperFactory,init_common,init_StyleJson,init_Wrapper2,CommonOutputJax,StyleJsonSheet,SPACE3};
