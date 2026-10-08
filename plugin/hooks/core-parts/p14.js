import{__esm,init_MmlNode,AbstractMmlTokenNode,TEXCLASS,AbstractMmlNode,AbstractMmlBaseNode,init_Attributes,AbstractMmlLayoutNode,INHERIT,init_string,indentAttributes,split,init_mo,MmlMo,XMLNode,init_math,init_mi,init_mn,init_mtext,MmlMath,MmlMi,MmlMn,MmlMtext,TextNode,init_NodeFactory,AbstractNodeFactory,init_Options,lookup,TEXCLASSNAMES,toEntity,init_PrioritizedList,PrioritizedList,userOptions,defaultOptions}from'./p13.js';export*from'./p13.js';
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mspace.js
var MmlMspace;
var init_mspace = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mspace.js"() {
    init_MmlNode();
    MmlMspace = class _MmlMspace extends AbstractMmlTokenNode {
      constructor() {
        super(...arguments);
        this.texclass = TEXCLASS.NONE;
      }
      setTeXclass(prev) {
        return prev;
      }
      get kind() {
        return "mspace";
      }
      get arity() {
        return 0;
      }
      get isSpacelike() {
        return !this.attributes.hasExplicit("linebreak") && this.canBreak;
      }
      get hasNewline() {
        const linebreak = this.attributes.get("linebreak");
        return this.canBreak && (linebreak === "newline" || linebreak === "indentingnewline");
      }
      get canBreak() {
        return !this.attributes.hasOneOf(_MmlMspace.NONSPACELIKE) && String(this.attributes.get("width")).trim().charAt(0) !== "-";
      }
    };
    MmlMspace.NONSPACELIKE = [
      "height",
      "depth",
      "style",
      "mathbackground",
      "background"
    ];
    MmlMspace.defaults = Object.assign(Object.assign({}, AbstractMmlTokenNode.defaults), { width: "0em", height: "0ex", depth: "0ex", linebreak: "auto", indentshift: "auto", indentalign: "auto", indenttarget: "", indentalignfirst: "indentalign", indentshiftfirst: "indentshift", indentalignlast: "indentalign", indentshiftlast: "indentshift" });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/ms.js
var MmlMs;
var init_ms = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/ms.js"() {
    init_MmlNode();
    MmlMs = class extends AbstractMmlTokenNode {
      constructor() {
        super(...arguments);
        this.texclass = TEXCLASS.ORD;
      }
      get kind() {
        return "ms";
      }
    };
    MmlMs.defaults = Object.assign(Object.assign({}, AbstractMmlTokenNode.defaults), { lquote: '"', rquote: '"' });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mrow.js
var MmlMrow;
var MmlInferredMrow;
var init_mrow = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mrow.js"() {
    init_MmlNode();
    MmlMrow = class extends AbstractMmlNode {
      constructor() {
        super(...arguments);
        this._core = null;
      }
      get kind() {
        return "mrow";
      }
      get isSpacelike() {
        for (const child of this.childNodes) {
          if (!child.isSpacelike) {
            return false;
          }
        }
        return true;
      }
      get isEmbellished() {
        let embellished = false;
        let i2 = 0;
        for (const child of this.childNodes) {
          if (child) {
            if (child.isEmbellished) {
              if (embellished) {
                return false;
              }
              embellished = true;
              this._core = i2;
            } else if (!child.isSpacelike) {
              return false;
            }
          }
          i2++;
        }
        return embellished;
      }
      core() {
        if (!this.isEmbellished || this._core == null) {
          return this;
        }
        return this.childNodes[this._core];
      }
      coreMO() {
        if (!this.isEmbellished || this._core == null) {
          return this;
        }
        return this.childNodes[this._core].coreMO();
      }
      nonSpaceLength() {
        let n = 0;
        for (const child of this.childNodes) {
          if (child && !child.isSpacelike) {
            n++;
          }
        }
        return n;
      }
      firstNonSpace() {
        for (const child of this.childNodes) {
          if (child && !child.isSpacelike) {
            return child;
          }
        }
        return null;
      }
      lastNonSpace() {
        let i2 = this.childNodes.length;
        while (--i2 >= 0) {
          const child = this.childNodes[i2];
          if (child && !child.isSpacelike) {
            return child;
          }
        }
        return null;
      }
      setTeXclass(prev) {
        if (this.getProperty("open") != null || this.getProperty("close") != null) {
          this.getPrevClass(prev);
          prev = null;
          for (const child of this.childNodes) {
            prev = child.setTeXclass(prev);
          }
          if (this.texClass == null) {
            this.texClass = TEXCLASS.INNER;
          }
          return this;
        }
        for (const child of this.childNodes) {
          prev = child.setTeXclass(prev);
        }
        if (this.childNodes[0]) {
          this.updateTeXclass(this.childNodes[0]);
        }
        return prev;
      }
    };
    MmlMrow.defaults = Object.assign({}, AbstractMmlNode.defaults);
    MmlInferredMrow = class extends MmlMrow {
      get kind() {
        return "inferredMrow";
      }
      get isInferred() {
        return true;
      }
      get notParent() {
        return true;
      }
      toString() {
        return "[" + this.childNodes.join(",") + "]";
      }
    };
    MmlInferredMrow.defaults = MmlMrow.defaults;
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mfrac.js
var MmlMfrac;
var init_mfrac = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mfrac.js"() {
    init_MmlNode();
    MmlMfrac = class extends AbstractMmlBaseNode {
      get kind() {
        return "mfrac";
      }
      get arity() {
        return 2;
      }
      get linebreakContainer() {
        return true;
      }
      get linebreakAlign() {
        return "";
      }
      setTeXclass(prev) {
        this.getPrevClass(prev);
        for (const child of this.childNodes) {
          child.setTeXclass(null);
        }
        return this;
      }
      setChildInheritedAttributes(attributes, display, level, prime) {
        if (!display || level > 0) {
          level++;
        }
        const numalign = this.attributes.get("numalign");
        const denalign = this.attributes.get("denomalign");
        const numAttributes = this.addInheritedAttributes(Object.assign({}, attributes), {
          numalign,
          indentshift: "0",
          indentalignfirst: numalign,
          indentshiftfirst: "0",
          indentalignlast: "indentalign",
          indentshiftlast: "indentshift"
        });
        const denAttributes = this.addInheritedAttributes(Object.assign({}, attributes), {
          denalign,
          indentshift: "0",
          indentalignfirst: denalign,
          indentshiftfirst: "0",
          indentalignlast: "indentalign",
          indentshiftlast: "indentshift"
        });
        this.childNodes[0].setInheritedAttributes(numAttributes, false, level, prime);
        this.childNodes[1].setInheritedAttributes(denAttributes, false, level, true);
      }
    };
    MmlMfrac.defaults = Object.assign(Object.assign({}, AbstractMmlBaseNode.defaults), { linethickness: "medium", numalign: "center", denomalign: "center", bevelled: false });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/msqrt.js
var MmlMsqrt;
var init_msqrt = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/msqrt.js"() {
    init_MmlNode();
    MmlMsqrt = class extends AbstractMmlNode {
      constructor() {
        super(...arguments);
        this.texclass = TEXCLASS.ORD;
      }
      get kind() {
        return "msqrt";
      }
      get arity() {
        return -1;
      }
      get linebreakContainer() {
        return true;
      }
      setTeXclass(prev) {
        this.getPrevClass(prev);
        this.childNodes[0].setTeXclass(null);
        return this;
      }
      setChildInheritedAttributes(attributes, display, level, _prime) {
        this.childNodes[0].setInheritedAttributes(attributes, display, level, true);
      }
    };
    MmlMsqrt.defaults = Object.assign(Object.assign({}, AbstractMmlNode.defaults), { "data-vertical-align": "bottom" });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mroot.js
var MmlMroot;
var init_mroot = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mroot.js"() {
    init_MmlNode();
    MmlMroot = class extends AbstractMmlNode {
      constructor() {
        super(...arguments);
        this.texclass = TEXCLASS.ORD;
      }
      get kind() {
        return "mroot";
      }
      get arity() {
        return 2;
      }
      get linebreakContainer() {
        return true;
      }
      setTeXclass(prev) {
        this.getPrevClass(prev);
        this.childNodes[0].setTeXclass(null);
        this.childNodes[1].setTeXclass(null);
        return this;
      }
      setChildInheritedAttributes(attributes, display, level, prime) {
        this.childNodes[0].setInheritedAttributes(attributes, display, level, true);
        this.childNodes[1].setInheritedAttributes(attributes, false, level + 2, prime);
      }
    };
    MmlMroot.defaults = Object.assign(Object.assign({}, AbstractMmlNode.defaults), { "data-vertical-align": "bottom" });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mstyle.js
var MmlMstyle;
var init_mstyle = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mstyle.js"() {
    init_MmlNode();
    init_Attributes();
    MmlMstyle = class extends AbstractMmlLayoutNode {
      get kind() {
        return "mstyle";
      }
      get notParent() {
        return this.childNodes[0] && this.childNodes[0].childNodes.length === 1;
      }
      setInheritedAttributes(attributes = {}, display = false, level = 0, prime = false) {
        this.attributes.setInherited("displaystyle", display);
        this.attributes.setInherited("scriptlevel", level);
        super.setInheritedAttributes(attributes, display, level, prime);
      }
      setChildInheritedAttributes(attributes, display, level, prime) {
        let scriptlevel = this.attributes.getExplicit("scriptlevel");
        if (scriptlevel != null) {
          scriptlevel = scriptlevel.toString();
          if (scriptlevel.match(/^\s*[-+]/)) {
            level += parseInt(scriptlevel);
          } else {
            level = parseInt(scriptlevel);
          }
          prime = false;
        }
        const displaystyle = this.attributes.getExplicit("displaystyle");
        if (displaystyle != null) {
          display = displaystyle === true;
          prime = false;
        }
        const cramped = this.attributes.getExplicit("data-cramped");
        if (cramped != null) {
          prime = cramped;
        }
        attributes = this.addInheritedAttributes(attributes, this.attributes.getAllAttributes());
        this.childNodes[0].setInheritedAttributes(attributes, display, level, prime);
      }
    };
    MmlMstyle.defaults = Object.assign(Object.assign({}, AbstractMmlLayoutNode.defaults), { scriptlevel: INHERIT, displaystyle: INHERIT, scriptsizemultiplier: 1 / Math.sqrt(2), scriptminsize: ".4em", mathbackground: INHERIT, mathcolor: INHERIT, dir: INHERIT, infixlinebreakstyle: "before" });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/merror.js
var MmlMerror;
var init_merror = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/merror.js"() {
    init_MmlNode();
    MmlMerror = class extends AbstractMmlNode {
      constructor() {
        super(...arguments);
        this.texclass = TEXCLASS.ORD;
      }
      get kind() {
        return "merror";
      }
      get arity() {
        return -1;
      }
      get linebreakContainer() {
        return true;
      }
    };
    MmlMerror.defaults = Object.assign({}, AbstractMmlNode.defaults);
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mpadded.js
var MmlMpadded;
var init_mpadded = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mpadded.js"() {
    init_MmlNode();
    MmlMpadded = class extends AbstractMmlLayoutNode {
      get kind() {
        return "mpadded";
      }
      get linebreakContainer() {
        return true;
      }
      setTeXclass(prev) {
        if (!this.getProperty("vbox")) {
          return super.setTeXclass(prev);
        }
        this.getPrevClass(prev);
        this.texClass = TEXCLASS.ORD;
        this.childNodes[0].setTeXclass(null);
        return this;
      }
    };
    MmlMpadded.defaults = Object.assign(Object.assign({}, AbstractMmlLayoutNode.defaults), { width: "", height: "", depth: "", lspace: 0, voffset: 0 });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mphantom.js
var MmlMphantom;
var init_mphantom = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mphantom.js"() {
    init_MmlNode();
    MmlMphantom = class extends AbstractMmlLayoutNode {
      constructor() {
        super(...arguments);
        this.texclass = TEXCLASS.ORD;
      }
      get kind() {
        return "mphantom";
      }
    };
    MmlMphantom.defaults = Object.assign({}, AbstractMmlLayoutNode.defaults);
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mfenced.js
var MmlMfenced;
var init_mfenced = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mfenced.js"() {
    init_MmlNode();
    MmlMfenced = class extends AbstractMmlNode {
      constructor() {
        super(...arguments);
        this.texclass = TEXCLASS.INNER;
        this.separators = [];
        this.open = null;
        this.close = null;
      }
      get kind() {
        return "mfenced";
      }
      setTeXclass(prev) {
        this.getPrevClass(prev);
        if (this.open) {
          prev = this.open.setTeXclass(prev);
        }
        if (this.childNodes[0]) {
          prev = this.childNodes[0].setTeXclass(prev);
        }
        for (let i2 = 1, m = this.childNodes.length; i2 < m; i2++) {
          if (this.separators[i2 - 1]) {
            prev = this.separators[i2 - 1].setTeXclass(prev);
          }
          if (this.childNodes[i2]) {
            prev = this.childNodes[i2].setTeXclass(prev);
          }
        }
        if (this.close) {
          prev = this.close.setTeXclass(prev);
        }
        if (!this.open || !this.close) {
          this.updateTeXclass(this.open || this.childNodes[0] || this.close);
        }
        return prev;
      }
      setChildInheritedAttributes(attributes, display, level, prime) {
        this.addFakeNodes();
        for (const child of [this.open, this.close].concat(this.separators)) {
          if (child) {
            child.setInheritedAttributes(attributes, display, level, prime);
          }
        }
        super.setChildInheritedAttributes(attributes, display, level, prime);
      }
      addFakeNodes() {
        let { open, close, separators } = this.attributes.getList("open", "close", "separators");
        open = open.replace(/[ \t\n\r]/g, "");
        close = close.replace(/[ \t\n\r]/g, "");
        separators = separators.replace(/[ \t\n\r]/g, "");
        if (open) {
          this.open = this.fakeNode(open, { fence: true, form: "prefix" }, TEXCLASS.OPEN);
        }
        if (separators) {
          while (separators.length < this.childNodes.length - 1) {
            separators += separators.charAt(separators.length - 1);
          }
          let i2 = 0;
          for (const child of this.childNodes.slice(1)) {
            if (child) {
              this.separators.push(this.fakeNode(separators.charAt(i2++)));
            }
          }
        }
        if (close) {
          this.close = this.fakeNode(close, { fence: true, form: "postfix" }, TEXCLASS.CLOSE);
        }
      }
      fakeNode(c, properties = {}, texClass = null) {
        const text = this.factory.create("text").setText(c);
        const node = this.factory.create("mo", properties, [text]);
        node.texClass = texClass;
        node.parent = this;
        return node;
      }
    };
    MmlMfenced.defaults = Object.assign(Object.assign({}, AbstractMmlNode.defaults), { open: "(", close: ")", separators: "," });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/menclose.js
var MmlMenclose;
var init_menclose = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/menclose.js"() {
    init_MmlNode();
    MmlMenclose = class extends AbstractMmlNode {
      constructor() {
        super(...arguments);
        this.texclass = TEXCLASS.ORD;
      }
      get kind() {
        return "menclose";
      }
      get arity() {
        return -1;
      }
      get linebreakContainer() {
        return true;
      }
      setTeXclass(prev) {
        prev = this.childNodes[0].setTeXclass(prev);
        this.updateTeXclass(this.childNodes[0]);
        return prev;
      }
    };
    MmlMenclose.defaults = Object.assign(Object.assign({}, AbstractMmlNode.defaults), { notation: "longdiv" });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/maction.js
var MmlMaction;
var init_maction = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/maction.js"() {
    init_MmlNode();
    MmlMaction = class extends AbstractMmlNode {
      get kind() {
        return "maction";
      }
      get arity() {
        return 1;
      }
      get selected() {
        const selection = this.attributes.get("selection");
        const i2 = Math.max(1, Math.min(this.childNodes.length, selection)) - 1;
        return this.childNodes[i2] || this.factory.create("mrow");
      }
      get isEmbellished() {
        return this.selected.isEmbellished;
      }
      get isSpacelike() {
        return this.selected.isSpacelike;
      }
      core() {
        return this.selected.core();
      }
      coreMO() {
        return this.selected.coreMO();
      }
      verifyAttributes(options3) {
        super.verifyAttributes(options3);
        if (this.attributes.get("actiontype") !== "toggle" && this.attributes.hasExplicit("selection")) {
          this.attributes.unset("selection");
        }
      }
      setTeXclass(prev) {
        if (this.attributes.get("actiontype") === "tooltip" && this.childNodes[1]) {
          this.childNodes[1].setTeXclass(null);
        }
        const selected = this.selected;
        prev = selected.setTeXclass(prev);
        this.updateTeXclass(selected);
        return prev;
      }
      nextToggleSelection() {
        let selection = Math.max(1, parseInt(this.attributes.get("selection")) + 1);
        if (selection > this.childNodes.length) {
          selection = 1;
        }
        this.attributes.set("selection", selection);
      }
      setChildInheritedAttributes(attributes, display, level, prime) {
        var _a2, _b2;
        if (this.attributes.get("actiontype").toLowerCase() !== "tooltip") {
          super.setChildInheritedAttributes(attributes, display, level, prime);
          return;
        }
        (_a2 = this.childNodes[0]) === null || _a2 === void 0 ? void 0 : _a2.setInheritedAttributes(attributes, display, level, prime);
        (_b2 = this.childNodes[1]) === null || _b2 === void 0 ? void 0 : _b2.setInheritedAttributes(attributes, false, 1, false);
      }
    };
    MmlMaction.defaults = Object.assign(Object.assign({}, AbstractMmlNode.defaults), { actiontype: "toggle", selection: 1 });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/msubsup.js
var MmlMsubsup;
var MmlMsub;
var MmlMsup;
var init_msubsup = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/msubsup.js"() {
    init_MmlNode();
    MmlMsubsup = class extends AbstractMmlBaseNode {
      get kind() {
        return "msubsup";
      }
      get arity() {
        return 3;
      }
      get base() {
        return 0;
      }
      get sub() {
        return 1;
      }
      get sup() {
        return 2;
      }
      setChildInheritedAttributes(attributes, display, level, prime) {
        const nodes = this.childNodes;
        nodes[0].setInheritedAttributes(attributes, display, level, prime);
        nodes[1].setInheritedAttributes(attributes, false, level + 1, prime || this.sub === 1);
        if (!nodes[2]) {
          return;
        }
        nodes[2].setInheritedAttributes(attributes, false, level + 1, prime || this.sub === 2);
      }
    };
    MmlMsubsup.defaults = Object.assign(Object.assign({}, AbstractMmlBaseNode.defaults), { subscriptshift: "", superscriptshift: "" });
    MmlMsub = class extends MmlMsubsup {
      get kind() {
        return "msub";
      }
      get arity() {
        return 2;
      }
    };
    MmlMsub.defaults = Object.assign({}, MmlMsubsup.defaults);
    MmlMsup = class extends MmlMsubsup {
      get kind() {
        return "msup";
      }
      get arity() {
        return 2;
      }
      get sup() {
        return 1;
      }
      get sub() {
        return 2;
      }
    };
    MmlMsup.defaults = Object.assign({}, MmlMsubsup.defaults);
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/munderover.js
var MmlMunderover;
var MmlMunder;
var MmlMover;
var init_munderover = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/munderover.js"() {
    init_MmlNode();
    MmlMunderover = class extends AbstractMmlBaseNode {
      get kind() {
        return "munderover";
      }
      get arity() {
        return 3;
      }
      get base() {
        return 0;
      }
      get under() {
        return 1;
      }
      get over() {
        return 2;
      }
      get linebreakContainer() {
        return true;
      }
      setChildInheritedAttributes(attributes, display, level, prime) {
        const nodes = this.childNodes;
        nodes[0].setInheritedAttributes(attributes, display, level, prime || !!nodes[this.over]);
        const force = !!(!display && nodes[0].coreMO().attributes.get("movablelimits"));
        const ACCENTS = this.constructor.ACCENTS;
        nodes[1].setInheritedAttributes(attributes, false, this.getScriptlevel(ACCENTS[1], force, level), prime || this.under === 1);
        this.setInheritedAccent(1, ACCENTS[1], display, level, prime, force);
        if (!nodes[2]) {
          return;
        }
        nodes[2].setInheritedAttributes(attributes, false, this.getScriptlevel(ACCENTS[2], force, level), prime || this.under === 2);
        this.setInheritedAccent(2, ACCENTS[2], display, level, prime, force);
      }
      getScriptlevel(accent, force, level) {
        if (force || !this.attributes.get(accent)) {
          level++;
        }
        return level;
      }
      setInheritedAccent(n, accent, display, level, prime, force) {
        const node = this.childNodes[n];
        if (!this.attributes.hasExplicit(accent) && node.isEmbellished) {
          const value = node.coreMO().attributes.get("accent");
          this.attributes.setInherited(accent, value);
          if (value !== this.attributes.getDefault(accent)) {
            node.setInheritedAttributes({}, display, this.getScriptlevel(accent, force, level), prime);
          }
        }
      }
    };
    MmlMunderover.defaults = Object.assign(Object.assign({}, AbstractMmlBaseNode.defaults), { accent: false, accentunder: false, align: "center" });
    MmlMunderover.ACCENTS = ["", "accentunder", "accent"];
    MmlMunder = class extends MmlMunderover {
      get kind() {
        return "munder";
      }
      get arity() {
        return 2;
      }
    };
    MmlMunder.defaults = Object.assign({}, MmlMunderover.defaults);
    MmlMover = class extends MmlMunderover {
      get kind() {
        return "mover";
      }
      get arity() {
        return 2;
      }
      get over() {
        return 1;
      }
      get under() {
        return 2;
      }
    };
    MmlMover.defaults = Object.assign({}, MmlMunderover.defaults);
    MmlMover.ACCENTS = ["", "accent", "accentunder"];
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mmultiscripts.js
var MmlMmultiscripts;
var MmlMprescripts;
var MmlNone;
var init_mmultiscripts = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mmultiscripts.js"() {
    init_MmlNode();
    init_msubsup();
    MmlMmultiscripts = class extends MmlMsubsup {
      get kind() {
        return "mmultiscripts";
      }
      get arity() {
        return 1;
      }
      setChildInheritedAttributes(attributes, display, level, prime) {
        this.childNodes[0].setInheritedAttributes(attributes, display, level, prime);
        let prescripts = false;
        for (let i2 = 1, n = 0; i2 < this.childNodes.length; i2++) {
          const child = this.childNodes[i2];
          if (child.isKind("mprescripts")) {
            if (!prescripts) {
              prescripts = true;
              if (i2 % 2 === 0) {
                const none = this.factory.create("none");
                this.childNodes.splice(i2, 0, none);
                none.parent = this;
                i2++;
              }
            }
          } else {
            const primestyle = prime || n % 2 === 0;
            child.setInheritedAttributes(attributes, false, level + 1, primestyle);
            n++;
          }
        }
        if (this.childNodes.length % 2 === (prescripts ? 1 : 0)) {
          this.appendChild(this.factory.create("none"));
          this.childNodes[this.childNodes.length - 1].setInheritedAttributes(attributes, false, level + 1, prime);
        }
      }
      verifyChildren(options3) {
        let prescripts = false;
        const fix = options3["fixMmultiscripts"];
        for (let i2 = 0; i2 < this.childNodes.length; i2++) {
          const child = this.childNodes[i2];
          if (child.isKind("mprescripts")) {
            if (prescripts) {
              child.mError(child.kind + " can only appear once in " + this.kind, options3, true);
            } else {
              prescripts = true;
              if (i2 % 2 === 0 && !fix) {
                this.mError("There must be an equal number of prescripts of each type", options3);
              }
            }
          }
        }
        if (this.childNodes.length % 2 === (prescripts ? 1 : 0) && !fix) {
          this.mError("There must be an equal number of scripts of each type", options3);
        }
        super.verifyChildren(options3);
      }
    };
    MmlMmultiscripts.defaults = Object.assign({}, MmlMsubsup.defaults);
    MmlMprescripts = class extends AbstractMmlNode {
      get kind() {
        return "mprescripts";
      }
      get arity() {
        return 0;
      }
      verifyTree(options3) {
        super.verifyTree(options3);
        if (this.parent && !this.parent.isKind("mmultiscripts")) {
          this.mError(this.kind + " must be a child of mmultiscripts", options3, true);
        }
      }
    };
    MmlMprescripts.defaults = Object.assign({}, AbstractMmlNode.defaults);
    MmlNone = class extends AbstractMmlNode {
      get kind() {
        return "none";
      }
      get arity() {
        return 0;
      }
      verifyTree(options3) {
        super.verifyTree(options3);
        if (this.parent && !this.parent.isKind("mmultiscripts")) {
          this.mError(this.kind + " must be a child of mmultiscripts", options3, true);
        }
      }
    };
    MmlNone.defaults = Object.assign({}, AbstractMmlNode.defaults);
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mtable.js
var MmlMtable;
var init_mtable = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mtable.js"() {
    init_MmlNode();
    init_string();
    MmlMtable = class extends AbstractMmlNode {
      constructor() {
        super(...arguments);
        this.properties = {
          useHeight: true
        };
        this.texclass = TEXCLASS.ORD;
      }
      get kind() {
        return "mtable";
      }
      get linebreakContainer() {
        return true;
      }
      get linebreakAlign() {
        return "";
      }
      setInheritedAttributes(attributes, display, level, prime) {
        for (const name of indentAttributes) {
          if (attributes[name]) {
            this.attributes.setInherited(name, attributes[name][1]);
          }
          if (this.attributes.hasExplicit(name)) {
            this.attributes.unset(name);
          }
        }
        super.setInheritedAttributes(attributes, display, level, prime);
      }
      setChildInheritedAttributes(attributes, display, level, _prime) {
        for (const child of this.childNodes) {
          if (!child.isKind("mtr")) {
            this.replaceChild(this.factory.create("mtr"), child).appendChild(child);
          }
        }
        display = !!(this.attributes.getExplicit("displaystyle") || this.attributes.getDefault("displaystyle"));
        attributes = this.addInheritedAttributes(attributes, {
          columnalign: this.attributes.get("columnalign"),
          rowalign: "center",
          "data-break-align": this.attributes.get("data-break-align")
        });
        const cramped = this.attributes.getExplicit("data-cramped");
        const ralign = split(this.attributes.get("rowalign"));
        for (const child of this.childNodes) {
          attributes.rowalign[1] = ralign.shift() || attributes.rowalign[1];
          child.setInheritedAttributes(attributes, display, level, !!cramped);
        }
      }
      verifyChildren(options3) {
        let mtr = null;
        const factory = this.factory;
        for (let i2 = 0; i2 < this.childNodes.length; i2++) {
          const child = this.childNodes[i2];
          if (child.isKind("mtr")) {
            mtr = null;
          } else {
            const isMtd = child.isKind("mtd");
            if (mtr) {
              this.removeChild(child);
              i2--;
            } else {
              mtr = this.replaceChild(factory.create("mtr"), child);
            }
            mtr.appendChild(isMtd ? child : factory.create("mtd", {}, [child]));
            if (!options3["fixMtables"]) {
              child.parent.removeChild(child);
              child.parent = this;
              if (isMtd) {
                mtr.appendChild(factory.create("mtd"));
              }
              const merror = child.mError("Children of " + this.kind + " must be mtr or mlabeledtr", options3, isMtd);
              mtr.childNodes[mtr.childNodes.length - 1].appendChild(merror);
            }
          }
        }
        super.verifyChildren(options3);
      }
      setTeXclass(prev) {
        this.getPrevClass(prev);
        for (const child of this.childNodes) {
          child.setTeXclass(null);
        }
        return this;
      }
    };
    MmlMtable.defaults = Object.assign(Object.assign({}, AbstractMmlNode.defaults), { align: "axis", rowalign: "baseline", columnalign: "center", groupalign: "{left}", alignmentscope: true, columnwidth: "auto", width: "auto", rowspacing: "1ex", columnspacing: ".8em", rowlines: "none", columnlines: "none", frame: "none", framespacing: "0.4em 0.5ex", equalrows: false, equalcolumns: false, displaystyle: false, side: "right", minlabelspacing: "0.8em", "data-break-align": "top" });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mtr.js
var MmlMtr;
var MmlMlabeledtr;
var init_mtr = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mtr.js"() {
    init_MmlNode();
    init_Attributes();
    init_string();
    MmlMtr = class extends AbstractMmlNode {
      get kind() {
        return "mtr";
      }
      get linebreakContainer() {
        return true;
      }
      get linebreakAlign() {
        return "";
      }
      setChildInheritedAttributes(attributes, display, level, prime) {
        for (const child of this.childNodes) {
          if (!child.isKind("mtd")) {
            this.replaceChild(this.factory.create("mtd"), child).appendChild(child);
          }
        }
        const calign = split(this.attributes.get("columnalign"));
        const balign = split(this.attributes.get("data-break-align"));
        if (this.arity === 1) {
          calign.unshift(this.parent.attributes.get("side"));
          balign.unshift("top");
        }
        attributes = this.addInheritedAttributes(attributes, {
          rowalign: this.attributes.get("rowalign"),
          columnalign: "center",
          "data-break-align": "top"
        });
        for (const child of this.childNodes) {
          attributes.columnalign[1] = calign.shift() || attributes.columnalign[1];
          attributes["data-vertical-align"] = [
            this.kind,
            balign.shift() || attributes["data-break-align"][1]
          ];
          child.setInheritedAttributes(attributes, display, level, prime);
        }
      }
      verifyChildren(options3) {
        if (this.parent && !this.parent.isKind("mtable")) {
          this.mError(this.kind + " can only be a child of an mtable", options3, true);
          return;
        }
        for (const child of this.childNodes) {
          if (!child.isKind("mtd")) {
            const mtd = this.replaceChild(this.factory.create("mtd"), child);
            mtd.appendChild(child);
            if (!options3["fixMtables"]) {
              child.mError("Children of " + this.kind + " must be mtd", options3);
            }
          }
        }
        super.verifyChildren(options3);
      }
      setTeXclass(prev) {
        this.getPrevClass(prev);
        for (const child of this.childNodes) {
          child.setTeXclass(null);
        }
        return this;
      }
    };
    MmlMtr.defaults = Object.assign(Object.assign({}, AbstractMmlNode.defaults), { rowalign: INHERIT, columnalign: INHERIT, groupalign: INHERIT, "data-break-align": "top" });
    MmlMlabeledtr = class extends MmlMtr {
      get kind() {
        return "mlabeledtr";
      }
      get arity() {
        return 1;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mtd.js
var MmlMtd;
var init_mtd = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mtd.js"() {
    init_MmlNode();
    init_Attributes();
    MmlMtd = class extends AbstractMmlBaseNode {
      get kind() {
        return "mtd";
      }
      get arity() {
        return -1;
      }
      get linebreakContainer() {
        return true;
      }
      get linebreakAlign() {
        return "columnalign";
      }
      verifyChildren(options3) {
        if (this.parent && !this.parent.isKind("mtr")) {
          this.mError(this.kind + " can only be a child of an mtr or mlabeledtr", options3, true);
          return;
        }
        super.verifyChildren(options3);
      }
      setTeXclass(prev) {
        this.getPrevClass(prev);
        this.childNodes[0].setTeXclass(null);
        return this;
      }
    };
    MmlMtd.defaults = Object.assign(Object.assign({}, AbstractMmlBaseNode.defaults), { rowspan: 1, columnspan: 1, rowalign: INHERIT, columnalign: INHERIT, groupalign: INHERIT, "data-vertical-align": "top" });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/maligngroup.js
var MmlMaligngroup;
var init_maligngroup = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/maligngroup.js"() {
    init_MmlNode();
    init_Attributes();
    MmlMaligngroup = class extends AbstractMmlLayoutNode {
      get kind() {
        return "maligngroup";
      }
      get isSpacelike() {
        return true;
      }
      setChildInheritedAttributes(attributes, display, level, prime) {
        attributes = this.addInheritedAttributes(attributes, this.attributes.getAllAttributes());
        super.setChildInheritedAttributes(attributes, display, level, prime);
      }
    };
    MmlMaligngroup.defaults = Object.assign(Object.assign({}, AbstractMmlLayoutNode.defaults), { groupalign: INHERIT });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/malignmark.js
var MmlMalignmark;
var init_malignmark = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/malignmark.js"() {
    init_MmlNode();
    MmlMalignmark = class extends AbstractMmlNode {
      get kind() {
        return "malignmark";
      }
      get arity() {
        return 0;
      }
      get isSpacelike() {
        return true;
      }
    };
    MmlMalignmark.defaults = Object.assign(Object.assign({}, AbstractMmlNode.defaults), { edge: "left" });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mglyph.js
var MmlMglyph;
var init_mglyph = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mglyph.js"() {
    init_MmlNode();
    MmlMglyph = class extends AbstractMmlTokenNode {
      constructor() {
        super(...arguments);
        this.texclass = TEXCLASS.ORD;
      }
      get kind() {
        return "mglyph";
      }
      verifyAttributes(options3) {
        const { src, fontfamily, index } = this.attributes.getList("src", "fontfamily", "index");
        if (src === "" && (fontfamily === "" || index === "")) {
          this.mError("mglyph must have either src or fontfamily and index attributes", options3, true);
        } else {
          super.verifyAttributes(options3);
        }
      }
    };
    MmlMglyph.defaults = Object.assign(Object.assign({}, AbstractMmlTokenNode.defaults), { alt: "", src: "", index: "", width: "auto", height: "auto", valign: "0em" });
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/semantics.js
var MmlSemantics;
var MmlAnnotationXML;
var MmlAnnotation;
var init_semantics = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/semantics.js"() {
    init_MmlNode();
    MmlSemantics = class extends AbstractMmlBaseNode {
      get kind() {
        return "semantics";
      }
      get arity() {
        return 1;
      }
      get notParent() {
        return true;
      }
    };
    MmlSemantics.defaults = Object.assign(Object.assign({}, AbstractMmlBaseNode.defaults), { definitionUrl: null, encoding: null });
    MmlAnnotationXML = class extends AbstractMmlNode {
      get kind() {
        return "annotation-xml";
      }
      setChildInheritedAttributes() {
      }
    };
    MmlAnnotationXML.defaults = Object.assign(Object.assign({}, AbstractMmlNode.defaults), { definitionUrl: null, encoding: null, cd: "mathmlkeys", name: "", src: null });
    MmlAnnotation = class extends MmlAnnotationXML {
      constructor() {
        super(...arguments);
        this.properties = {
          isChars: true
        };
      }
      get kind() {
        return "annotation";
      }
    };
    MmlAnnotation.defaults = Object.assign({}, MmlAnnotationXML.defaults);
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/TeXAtom.js
var TeXAtom;
var init_TeXAtom = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/TeXAtom.js"() {
    init_MmlNode();
    init_mo();
    TeXAtom = class extends AbstractMmlBaseNode {
      get kind() {
        return "TeXAtom";
      }
      get arity() {
        return -1;
      }
      get notParent() {
        return true;
      }
      constructor(factory, attributes, children) {
        super(factory, attributes, children);
        this.texclass = TEXCLASS.ORD;
        this.setProperty("texClass", this.texClass);
      }
      setTeXclass(prev) {
        this.childNodes[0].setTeXclass(null);
        return this.adjustTeXclass(prev);
      }
      adjustTeXclass(prev) {
        return prev;
      }
    };
    TeXAtom.defaults = Object.assign({}, AbstractMmlBaseNode.defaults);
    TeXAtom.prototype.adjustTeXclass = MmlMo.prototype.adjustTeXclass;
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mathchoice.js
var MathChoice;
var init_mathchoice = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mathchoice.js"() {
    init_MmlNode();
    MathChoice = class extends AbstractMmlBaseNode {
      get kind() {
        return "MathChoice";
      }
      get arity() {
        return 4;
      }
      get notParent() {
        return true;
      }
      setInheritedAttributes(attributes, display, level, prime) {
        const selection = display ? 0 : Math.max(0, Math.min(level, 2)) + 1;
        const child = this.childNodes[selection] || this.factory.create("mrow");
        this.parent.replaceChild(child, this);
        child.setInheritedAttributes(attributes, display, level, prime);
      }
    };
    MathChoice.defaults = Object.assign({}, AbstractMmlBaseNode.defaults);
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/HtmlNode.js
var HtmlNode;
var init_HtmlNode = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/HtmlNode.js"() {
    init_MmlNode();
    HtmlNode = class extends XMLNode {
      get kind() {
        return "html";
      }
      getHTML() {
        return this.getXML();
      }
      setHTML(html2, adaptor = null) {
        try {
          adaptor.getAttribute(html2, "data-mjx-hdw");
        } catch (_error) {
          html2 = adaptor.node("span", {}, [html2]);
        }
        return this.setXML(html2, adaptor);
      }
      getSerializedHTML() {
        return this.adaptor.outerHTML(this.xml);
      }
      textContent() {
        return this.adaptor.textContent(this.xml);
      }
      toString() {
        const kind = this.adaptor.kind(this.xml);
        return `HTML=<${kind}>...</${kind}>`;
      }
      verifyTree(options3) {
        if (this.parent && !this.parent.isToken) {
          this.mError("HTML can only be a child of a token element", options3, true);
          return;
        }
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MML.js
var MML;
var init_MML = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MML.js"() {
    init_MmlNode();
    init_math();
    init_mi();
    init_mn();
    init_mo();
    init_mtext();
    init_mspace();
    init_ms();
    init_mrow();
    init_mfrac();
    init_msqrt();
    init_mroot();
    init_mstyle();
    init_merror();
    init_mpadded();
    init_mphantom();
    init_mfenced();
    init_menclose();
    init_maction();
    init_msubsup();
    init_munderover();
    init_mmultiscripts();
    init_mtable();
    init_mtr();
    init_mtd();
    init_maligngroup();
    init_malignmark();
    init_mglyph();
    init_semantics();
    init_TeXAtom();
    init_mathchoice();
    init_HtmlNode();
    MML = {
      [MmlMath.prototype.kind]: MmlMath,
      [MmlMi.prototype.kind]: MmlMi,
      [MmlMn.prototype.kind]: MmlMn,
      [MmlMo.prototype.kind]: MmlMo,
      [MmlMtext.prototype.kind]: MmlMtext,
      [MmlMspace.prototype.kind]: MmlMspace,
      [MmlMs.prototype.kind]: MmlMs,
      [MmlMrow.prototype.kind]: MmlMrow,
      [MmlInferredMrow.prototype.kind]: MmlInferredMrow,
      [MmlMfrac.prototype.kind]: MmlMfrac,
      [MmlMsqrt.prototype.kind]: MmlMsqrt,
      [MmlMroot.prototype.kind]: MmlMroot,
      [MmlMstyle.prototype.kind]: MmlMstyle,
      [MmlMerror.prototype.kind]: MmlMerror,
      [MmlMpadded.prototype.kind]: MmlMpadded,
      [MmlMphantom.prototype.kind]: MmlMphantom,
      [MmlMfenced.prototype.kind]: MmlMfenced,
      [MmlMenclose.prototype.kind]: MmlMenclose,
      [MmlMaction.prototype.kind]: MmlMaction,
      [MmlMsub.prototype.kind]: MmlMsub,
      [MmlMsup.prototype.kind]: MmlMsup,
      [MmlMsubsup.prototype.kind]: MmlMsubsup,
      [MmlMunder.prototype.kind]: MmlMunder,
      [MmlMover.prototype.kind]: MmlMover,
      [MmlMunderover.prototype.kind]: MmlMunderover,
      [MmlMmultiscripts.prototype.kind]: MmlMmultiscripts,
      [MmlMprescripts.prototype.kind]: MmlMprescripts,
      [MmlNone.prototype.kind]: MmlNone,
      [MmlMtable.prototype.kind]: MmlMtable,
      [MmlMlabeledtr.prototype.kind]: MmlMlabeledtr,
      [MmlMtr.prototype.kind]: MmlMtr,
      [MmlMtd.prototype.kind]: MmlMtd,
      [MmlMaligngroup.prototype.kind]: MmlMaligngroup,
      [MmlMalignmark.prototype.kind]: MmlMalignmark,
      [MmlMglyph.prototype.kind]: MmlMglyph,
      [MmlSemantics.prototype.kind]: MmlSemantics,
      [MmlAnnotation.prototype.kind]: MmlAnnotation,
      [MmlAnnotationXML.prototype.kind]: MmlAnnotationXML,
      [TeXAtom.prototype.kind]: TeXAtom,
      [MathChoice.prototype.kind]: MathChoice,
      [TextNode.prototype.kind]: TextNode,
      [XMLNode.prototype.kind]: XMLNode,
      [HtmlNode.prototype.kind]: HtmlNode
    };
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlFactory.js
var MmlFactory;
var init_MmlFactory = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlFactory.js"() {
    init_NodeFactory();
    init_MML();
    MmlFactory = class extends AbstractNodeFactory {
      get MML() {
        return this.node;
      }
    };
    MmlFactory.defaultNodes = MML;
  }
});
// node_modules/@mathjax/src/mjs/core/Tree/Visitor.js
var AbstractVisitor;
var init_Visitor = __esm({
  "node_modules/@mathjax/src/mjs/core/Tree/Visitor.js"() {
    AbstractVisitor = class _AbstractVisitor {
      static methodName(kind) {
        return "visit" + (kind.charAt(0).toUpperCase() + kind.substring(1)).replace(/[^a-z0-9_]/gi, "_") + "Node";
      }
      constructor(factory) {
        this.nodeHandlers = /* @__PURE__ */ new Map();
        for (const kind of factory.getKinds()) {
          const method = this[_AbstractVisitor.methodName(kind)];
          if (method) {
            this.nodeHandlers.set(kind, method);
          }
        }
      }
      visitTree(tree, ...args) {
        return this.visitNode(tree, ...args);
      }
      visitNode(node, ...args) {
        const handler = this.nodeHandlers.get(node.kind) || this.visitDefault;
        return handler.call(this, node, ...args);
      }
      visitDefault(node, ...args) {
        if ("childNodes" in node) {
          for (const child of node.childNodes) {
            this.visitNode(child, ...args);
          }
        }
      }
      setNodeHandler(kind, handler) {
        this.nodeHandlers.set(kind, handler);
      }
      removeNodeHandler(kind) {
        this.nodeHandlers.delete(kind);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlVisitor.js
var DATAMJX;
var MmlVisitor;
var init_MmlVisitor = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlVisitor.js"() {
    init_MmlNode();
    init_mi();
    init_MmlFactory();
    init_Visitor();
    init_Options();
    DATAMJX = "data-mjx-";
    MmlVisitor = class extends AbstractVisitor {
      constructor(factory = null) {
        if (!factory) {
          factory = new MmlFactory();
        }
        super(factory);
      }
      visitTextNode(_node, ..._args) {
      }
      visitXMLNode(_node, ..._args) {
      }
      visitHtmlNode(_node, ..._args) {
      }
      getKind(node) {
        const kind = node.kind;
        return lookup(kind, this.constructor.rename, kind);
      }
      getAttributeList(node) {
        const CLASS = this.constructor;
        const defaults = lookup(node.kind, CLASS.defaultAttributes, {});
        const attributes = Object.assign({}, defaults, this.getDataAttributes(node), node.attributes.getAllAttributes());
        const variants = CLASS.variants;
        if (Object.hasOwn(attributes, "mathvariant")) {
          if (Object.hasOwn(variants, attributes.mathvariant)) {
            attributes.mathvariant = variants[attributes.mathvariant];
          } else if (node.getProperty("ignore-variant")) {
            delete attributes.mathvariant;
          }
        }
        return attributes;
      }
      getDataAttributes(node) {
        const data = {};
        const variant = node.attributes.getExplicit("mathvariant");
        const variants = this.constructor.variants;
        if (variant && (node.getProperty("ignore-variant") || Object.hasOwn(variants, variant))) {
          this.setDataAttribute(data, "variant", variant);
        }
        if (node.getProperty("variantForm")) {
          this.setDataAttribute(data, "alternate", "1");
        }
        if (node.getProperty("pseudoscript")) {
          this.setDataAttribute(data, "pseudoscript", "true");
        }
        if (node.getProperty("autoOP") === false) {
          this.setDataAttribute(data, "auto-op", "false");
        }
        const vbox = node.getProperty("vbox");
        if (vbox) {
          this.setDataAttribute(data, "vbox", vbox);
        }
        const scriptalign = node.getProperty("scriptalign");
        if (scriptalign) {
          this.setDataAttribute(data, "script-align", scriptalign);
        }
        const accent = node.getProperty("mathaccent");
        if (accent !== void 0) {
          if (accent && !node.isMathAccent() || !accent && !node.isMathAccentWithWidth()) {
            this.setDataAttribute(data, "mathaccent", accent.toString());
          }
        }
        const texclass = node.getProperty("texClass");
        if (texclass !== void 0) {
          let setclass = true;
          if (texclass === TEXCLASS.OP && node.isKind("mi")) {
            const name = node.getText();
            setclass = !(name.length > 1 && name.match(MmlMi.operatorName));
          }
          if (setclass) {
            this.setDataAttribute(data, "texclass", texclass < 0 ? "NONE" : TEXCLASSNAMES[texclass]);
          }
        }
        if (node.getProperty("smallmatrix")) {
          this.setDataAttribute(data, "smallmatrix", "true");
        }
        return data;
      }
      setDataAttribute(data, name, value) {
        data[DATAMJX + name] = value;
      }
    };
    MmlVisitor.rename = {
      TeXAtom: "mrow"
    };
    MmlVisitor.variants = {
      "-tex-calligraphic": "script",
      "-tex-bold-calligraphic": "bold-script",
      "-tex-oldstyle": "normal",
      "-tex-bold-oldstyle": "bold",
      "-tex-mathit": "italic"
    };
    MmlVisitor.defaultAttributes = {
      math: {
        xmlns: "http://www.w3.org/1998/Math/MathML"
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/SerializedMmlVisitor.js
var SerializedMmlVisitor;
var init_SerializedMmlVisitor = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/SerializedMmlVisitor.js"() {
    init_MmlVisitor();
    init_string();
    SerializedMmlVisitor = class extends MmlVisitor {
      visitTree(node) {
        return this.visitNode(node, "");
      }
      visitTextNode(node, _space) {
        return this.quoteHTML(node.getText());
      }
      visitXMLNode(node, space) {
        return space + node.getSerializedXML();
      }
      visitHtmlNode(node, _space) {
        return node.getSerializedHTML();
      }
      visitInferredMrowNode(node, space) {
        const mml = [];
        for (const child of node.childNodes) {
          mml.push(this.visitNode(child, space));
        }
        return mml.join("\n");
      }
      visitAnnotationNode(node, space) {
        const children = this.childNodeMml(node, "", "");
        return `${space}<annotation${this.getAttributes(node)}>${children}</annotation>`;
      }
      visitDefault(node, space) {
        const kind = this.getKind(node);
        const [nl, endspace] = node.isToken || node.childNodes.length === 0 ? ["", ""] : ["\n", space];
        const children = this.childNodeMml(node, space + "  ", nl);
        const childNode = children.match(/\S/) ? nl + children + endspace : "";
        return `${space}<${kind}${this.getAttributes(node)}>${childNode}</${kind}>`;
      }
      childNodeMml(node, space, nl) {
        let mml = "";
        for (const child of node.childNodes) {
          mml += this.visitNode(child, space) + nl;
        }
        return mml;
      }
      getAttributes(node) {
        const attr = [];
        const attributes = this.getAttributeList(node);
        for (const name of Object.keys(attributes)) {
          const value = String(attributes[name]);
          if (value === void 0)
            continue;
          attr.push(name + '="' + this.quoteHTML(value) + '"');
        }
        return attr.length ? " " + attr.join(" ") : "";
      }
      quoteHTML(value) {
        return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\uD800-\uDBFF]./g, this.toEntity).replace(/[\u0080-\uD7FF\uE000-\uFFFF]/g, this.toEntity);
      }
      toEntity(c) {
        return toEntity(c);
      }
    };
  }
});
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
                result.then(execute).catch((err) => fail2(err));
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
  const bits = class extends BitField {
  };
  bits.allocate(...names);
  return bits;
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
export{init_InputJax,init_OutputJax,init_MathList,init_MmlFactory,init_BitField,AbstractInputJax,AbstractOutputJax,AbstractMathList,MmlFactory,BitFieldClass,init_FunctionList,FunctionList,init_Visitor,AbstractVisitor,init_mrow,MmlMrow,MmlInferredMrow,init_ms,MmlMs,init_merror,MmlMerror,init_mspace,MmlMspace,init_mpadded,MmlMpadded,init_mphantom,MmlMphantom,init_mfrac,MmlMfrac,init_msqrt,MmlMsqrt,init_mroot,MmlMroot,init_mfenced,MmlMfenced,init_msubsup,MmlMsub,MmlMsup,MmlMsubsup,init_munderover,MmlMunder,MmlMover,MmlMunderover,init_mmultiscripts,MmlMmultiscripts,init_mtable,MmlMtable,init_mtr,MmlMtr,MmlMlabeledtr,init_mtd,MmlMtd,init_maction,MmlMaction,init_menclose,MmlMenclose,init_semantics,MmlSemantics,MmlAnnotation,MmlAnnotationXML,init_mglyph,MmlMglyph,init_TeXAtom,TeXAtom,init_HtmlNode,HtmlNode,init_SerializedMmlVisitor,SerializedMmlVisitor};
