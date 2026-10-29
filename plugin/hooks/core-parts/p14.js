import{__esm,init_Attributes,Attributes,INHERIT}from'./p13.js';export*from'./p13.js';
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
// node_modules/@mathjax/src/mjs/core/MmlTree/OperatorDictionary.js
function OPDEF(lspace, rspace, texClass = TEXCLASS.BIN, properties = null) {
  return [lspace, rspace, texClass, properties];
}
function getRange(text) {
  const def2 = OPTABLE.infix[text] || OPTABLE.prefix[text] || OPTABLE.postfix[text];
  if (def2) {
    return [0, 0, def2[2], "mo"];
  }
  const n = text.codePointAt(0);
  for (const range of RANGES) {
    if (n <= range[1]) {
      if (n >= range[0]) {
        return range;
      }
      break;
    }
  }
  return [0, 0, TEXCLASS.REL, "mo"];
}
var MO;
var RANGES;
var MMLSPACING;
var OPTABLE;
var init_OperatorDictionary = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/OperatorDictionary.js"() {
    init_MmlNode();
    MO = {
      REL: OPDEF(5, 5, TEXCLASS.REL),
      WIDEREL: OPDEF(5, 5, TEXCLASS.REL, { accent: true, stretchy: true }),
      BIN4: OPDEF(4, 4, TEXCLASS.BIN),
      RELSTRETCH: OPDEF(5, 5, TEXCLASS.REL, { stretchy: true }),
      ORD: OPDEF(0, 0, TEXCLASS.ORD),
      BIN3: OPDEF(3, 3, TEXCLASS.BIN),
      OPEN: OPDEF(0, 0, TEXCLASS.OPEN, {
        fence: true,
        stretchy: true,
        symmetric: true
      }),
      CLOSE: OPDEF(0, 0, TEXCLASS.CLOSE, {
        fence: true,
        stretchy: true,
        symmetric: true
      }),
      INTEGRAL: OPDEF(3, 3, TEXCLASS.OP, { largeop: true, symmetric: true }),
      ACCENT: OPDEF(0, 0, TEXCLASS.ORD, { accent: true }),
      WIDEACCENT: OPDEF(0, 0, TEXCLASS.ORD, { accent: true, stretchy: true }),
      OP: OPDEF(3, 3, TEXCLASS.OP, {
        largeop: true,
        movablelimits: true,
        symmetric: true
      }),
      RELACCENT: OPDEF(5, 5, TEXCLASS.REL, { accent: true }),
      BIN0: OPDEF(0, 0, TEXCLASS.BIN),
      BIN5: OPDEF(5, 5, TEXCLASS.BIN),
      FENCE: OPDEF(0, 0, TEXCLASS.ORD, {
        fence: true,
        stretchy: true,
        symmetric: true
      }),
      INNER: OPDEF(1, 1, TEXCLASS.INNER),
      ORD30: OPDEF(3, 0, TEXCLASS.ORD),
      NONE: OPDEF(0, 0, TEXCLASS.NONE),
      ORDSTRETCH0: OPDEF(0, 0, TEXCLASS.ORD, { stretchy: true }),
      BINSTRETCH0: OPDEF(0, 0, TEXCLASS.BIN, { stretchy: true }),
      RELSTRETCH0: OPDEF(0, 0, TEXCLASS.REL, { stretchy: true }),
      CLOSE0: OPDEF(0, 0, TEXCLASS.CLOSE, { fence: true }),
      ORD3: OPDEF(3, 3, TEXCLASS.ORD),
      PUNCT03: OPDEF(0, 3, TEXCLASS.PUNCT, { linebreakstyle: "after" }),
      OPEN0: OPDEF(0, 0, TEXCLASS.OPEN, { fence: true }),
      STRETCH4: OPDEF(4, 4, TEXCLASS.BIN, { stretchy: true })
    };
    RANGES = [
      [32, 127, TEXCLASS.REL, "mo"],
      [160, 191, TEXCLASS.ORD, "mo"],
      [192, 591, TEXCLASS.ORD, "mi"],
      [688, 879, TEXCLASS.ORD, "mo"],
      [880, 6688, TEXCLASS.ORD, "mi"],
      [6832, 6911, TEXCLASS.ORD, "mo"],
      [6912, 7615, TEXCLASS.ORD, "mi"],
      [7616, 7679, TEXCLASS.ORD, "mo"],
      [7680, 8191, TEXCLASS.ORD, "mi"],
      [8192, 8303, TEXCLASS.ORD, "mo"],
      [8304, 8351, TEXCLASS.ORD, "mo"],
      [8448, 8527, TEXCLASS.ORD, "mi"],
      [8528, 8591, TEXCLASS.ORD, "mn"],
      [8592, 8703, TEXCLASS.REL, "mo"],
      [8704, 8959, TEXCLASS.BIN, "mo"],
      [8960, 9215, TEXCLASS.ORD, "mo"],
      [9312, 9471, TEXCLASS.ORD, "mn"],
      [9472, 10223, TEXCLASS.ORD, "mo"],
      [10224, 10239, TEXCLASS.REL, "mo"],
      [10240, 10495, TEXCLASS.ORD, "mtext"],
      [10496, 10623, TEXCLASS.REL, "mo"],
      [10624, 10751, TEXCLASS.ORD, "mo"],
      [10752, 11007, TEXCLASS.BIN, "mo"],
      [11008, 11055, TEXCLASS.ORD, "mo"],
      [11056, 11087, TEXCLASS.REL, "mo"],
      [11088, 11263, TEXCLASS.ORD, "mo"],
      [11264, 11744, TEXCLASS.ORD, "mi"],
      [11776, 11903, TEXCLASS.ORD, "mo"],
      [11904, 12255, TEXCLASS.ORD, "mi", "normal"],
      [12272, 12351, TEXCLASS.ORD, "mo"],
      [12352, 42143, TEXCLASS.ORD, "mi", "normal"],
      [42192, 43055, TEXCLASS.ORD, "mi"],
      [43056, 43071, TEXCLASS.ORD, "mn"],
      [43072, 55295, TEXCLASS.ORD, "mi"],
      [63744, 64255, TEXCLASS.ORD, "mi", "normal"],
      [64256, 65023, TEXCLASS.ORD, "mi"],
      [65024, 65135, TEXCLASS.ORD, "mo"],
      [65136, 65791, TEXCLASS.ORD, "mi"],
      [65792, 65935, TEXCLASS.ORD, "mn"],
      [65936, 74751, TEXCLASS.ORD, "mi", "normal"],
      [74752, 74879, TEXCLASS.ORD, "mn"],
      [74880, 113823, TEXCLASS.ORD, "mi", "normal"],
      [113824, 119391, TEXCLASS.ORD, "mo"],
      [119648, 119679, TEXCLASS.ORD, "mn"],
      [119808, 120781, TEXCLASS.ORD, "mi"],
      [120782, 120831, TEXCLASS.ORD, "mn"],
      [122624, 129023, TEXCLASS.ORD, "mo"],
      [129024, 129279, TEXCLASS.REL, "mo"],
      [129280, 129535, TEXCLASS.ORD, "mo"],
      [131072, 195103, TEXCLASS.ORD, "mi", "normal"]
    ];
    MMLSPACING = [
      [0, 0],
      [1, 2],
      [3, 3],
      [4, 4],
      [0, 0],
      [0, 0],
      [0, 3],
      [1, 1]
    ];
    OPTABLE = {
      prefix: {
        "!": MO.ORD,
        "(": MO.OPEN,
        "+": MO.BIN0,
        "-": MO.BIN0,
        "[": MO.OPEN,
        "{": MO.OPEN,
        "|": MO.OPEN,
        "||": MO.BIN0,
        "¬": MO.ORD,
        "±": MO.BIN0,
        "‖": MO.FENCE,
        "‘": MO.OPEN0,
        "“": MO.OPEN0,
        "ⅅ": MO.ORD30,
        "ⅆ": MO.ORD30,
        "∀": MO.ORD,
        "∁": MO.ORD,
        "∂": MO.ORD30,
        "∃": MO.ORD,
        "∄": MO.ORD,
        "∇": MO.ORD,
        "∏": MO.OP,
        "∐": MO.OP,
        "∑": MO.OP,
        "−": MO.BIN0,
        "∓": MO.BIN0,
        "√": [3, 0, TEXCLASS.ORD, { stretchy: true }],
        "∛": MO.ORD30,
        "∜": MO.ORD30,
        "∟": MO.ORD,
        "∠": MO.ORD,
        "∡": MO.ORD,
        "∢": MO.ORD,
        "∫": MO.INTEGRAL,
        "∬": MO.INTEGRAL,
        "∭": MO.INTEGRAL,
        "∮": MO.INTEGRAL,
        "∯": MO.INTEGRAL,
        "∰": MO.INTEGRAL,
        "∱": MO.INTEGRAL,
        "∲": MO.INTEGRAL,
        "∳": MO.INTEGRAL,
        "∴": MO.REL,
        "∵": MO.REL,
        "∼": [0, 0, TEXCLASS.REL, {}],
        "⊾": MO.ORD,
        "⊿": MO.ORD,
        "⋀": MO.OP,
        "⋁": MO.OP,
        "⋂": MO.OP,
        "⋃": MO.OP,
        "⌈": MO.OPEN,
        "⌊": MO.OPEN,
        "⌐": MO.ORD,
        "⌙": MO.ORD,
        "❲": MO.OPEN,
        "➕": MO.ORD,
        "➖": MO.ORD,
        "⟀": MO.ORD,
        "⟦": MO.OPEN,
        "⟨": MO.OPEN,
        "⟪": MO.OPEN,
        "⟬": MO.OPEN,
        "⟮": MO.OPEN,
        "⦀": MO.FENCE,
        "⦃": MO.OPEN,
        "⦅": MO.OPEN,
        "⦇": MO.OPEN,
        "⦉": MO.OPEN,
        "⦋": MO.OPEN,
        "⦍": MO.OPEN,
        "⦏": MO.OPEN,
        "⦑": MO.OPEN,
        "⦓": MO.OPEN,
        "⦕": MO.OPEN,
        "⦗": MO.OPEN,
        "⦙": MO.FENCE,
        "⦛": MO.ORD,
        "⦜": MO.ORD,
        "⦝": MO.ORD,
        "⦞": MO.ORD,
        "⦟": MO.ORD,
        "⦠": MO.ORD,
        "⦡": MO.ORD,
        "⦢": MO.ORD,
        "⦣": MO.ORD,
        "⦤": MO.ORD,
        "⦥": MO.ORD,
        "⦦": MO.ORD,
        "⦧": MO.ORD,
        "⦨": MO.ORD,
        "⦩": MO.ORD,
        "⦪": MO.ORD,
        "⦫": MO.ORD,
        "⦬": MO.ORD,
        "⦭": MO.ORD,
        "⦮": MO.ORD,
        "⦯": MO.ORD,
        "⧘": MO.OPEN,
        "⧚": MO.OPEN,
        "⧼": MO.OPEN,
        "⨀": MO.OP,
        "⨁": MO.OP,
        "⨂": MO.OP,
        "⨃": MO.OP,
        "⨄": MO.OP,
        "⨅": MO.OP,
        "⨆": MO.OP,
        "⨇": MO.OP,
        "⨈": MO.OP,
        "⨉": MO.OP,
        "⨊": MO.OP,
        "⨋": MO.INTEGRAL,
        "⨌": MO.INTEGRAL,
        "⨍": MO.INTEGRAL,
        "⨎": MO.INTEGRAL,
        "⨏": MO.INTEGRAL,
        "⨐": MO.INTEGRAL,
        "⨑": MO.INTEGRAL,
        "⨒": MO.INTEGRAL,
        "⨓": MO.INTEGRAL,
        "⨔": MO.INTEGRAL,
        "⨕": MO.INTEGRAL,
        "⨖": MO.INTEGRAL,
        "⨗": MO.INTEGRAL,
        "⨘": MO.INTEGRAL,
        "⨙": MO.INTEGRAL,
        "⨚": MO.INTEGRAL,
        "⨛": MO.INTEGRAL,
        "⨜": MO.INTEGRAL,
        "⨝": MO.OP,
        "⨞": MO.OP,
        "⫬": MO.ORD,
        "⫭": MO.ORD,
        "⫼": MO.OP,
        "⫿": MO.OP,
        "〈": MO.OPEN
      },
      postfix: {
        "!!": MO.BIN0,
        "!": MO.CLOSE0,
        '"': MO.ORD,
        "%": MO.ORD,
        "&": MO.ORD,
        "'": MO.ACCENT,
        ")": MO.CLOSE,
        "++": MO.BIN0,
        "--": MO.BIN0,
        "]": MO.CLOSE,
        "^": MO.WIDEACCENT,
        "_": MO.WIDEACCENT,
        "`": MO.ACCENT,
        "|": MO.CLOSE,
        "||": MO.BIN0,
        "}": MO.CLOSE,
        "~": MO.WIDEACCENT,
        "¨": MO.ACCENT,
        "¯": MO.WIDEACCENT,
        "°": MO.ACCENT,
        "²": MO.ORD,
        "³": MO.ORD,
        "´": MO.ACCENT,
        "¸": MO.ACCENT,
        "¹": MO.ORD,
        "ˆ": MO.WIDEACCENT,
        "ˇ": MO.WIDEACCENT,
        "ˉ": MO.WIDEACCENT,
        "ˊ": MO.ACCENT,
        "ˋ": MO.ACCENT,
        "ˍ": MO.WIDEACCENT,
        "˘": MO.ACCENT,
        "˙": MO.ACCENT,
        "˚": MO.ACCENT,
        "˜": MO.WIDEACCENT,
        "˝": MO.ACCENT,
        "˷": MO.WIDEACCENT,
        "\u0302": MO.WIDEACCENT,
        "\u0311": MO.ACCENT,
        "‖": MO.FENCE,
        "’": MO.CLOSE0,
        "‚": MO.ORD,
        "‛": MO.ORD,
        "”": MO.CLOSE0,
        "„": MO.ORD,
        "‟": MO.ORD,
        "′": MO.ORD,
        "″": MO.ORD,
        "‴": MO.ORD,
        "‵": MO.ORD,
        "‶": MO.ORD,
        "‷": MO.ORD,
        "‾": MO.WIDEACCENT,
        "⁗": MO.ORD,
        "\u20DB": MO.ACCENT,
        "\u20DC": MO.ACCENT,
        "⌉": MO.CLOSE,
        "⌋": MO.CLOSE,
        "⌢": MO.RELSTRETCH0,
        "⌣": MO.RELSTRETCH0,
        "⎴": MO.WIDEACCENT,
        "⎵": MO.WIDEACCENT,
        "⏍": MO.ORD,
        "⏜": MO.WIDEACCENT,
        "⏝": MO.WIDEACCENT,
        "⏞": MO.WIDEACCENT,
        "⏟": MO.WIDEACCENT,
        "⏠": MO.WIDEACCENT,
        "⏡": MO.WIDEACCENT,
        "❳": MO.CLOSE,
        "⟧": MO.CLOSE,
        "⟩": MO.CLOSE,
        "⟫": MO.CLOSE,
        "⟭": MO.CLOSE,
        "⟯": MO.CLOSE,
        "⦀": MO.FENCE,
        "⦄": MO.CLOSE,
        "⦆": MO.CLOSE,
        "⦈": MO.CLOSE,
        "⦊": MO.CLOSE,
        "⦌": MO.CLOSE,
        "⦎": MO.CLOSE,
        "⦐": MO.CLOSE,
        "⦒": MO.CLOSE,
        "⦔": MO.CLOSE,
        "⦖": MO.CLOSE,
        "⦘": MO.CLOSE,
        "⦙": MO.FENCE,
        "⧙": MO.CLOSE,
        "⧛": MO.CLOSE,
        "⧽": MO.CLOSE,
        "〉": MO.CLOSE,
        "𞻰": MO.BINSTRETCH0,
        "𞻱": MO.BINSTRETCH0
      },
      infix: {
        "!": MO.ORD,
        "!=": MO.BIN5,
        "#": MO.ORD,
        "$": MO.ORD,
        "%": MO.ORD3,
        "&&": MO.BIN4,
        "**": MO.BIN3,
        "*": MO.BIN3,
        "*=": MO.BIN5,
        "+": MO.BIN4,
        "+=": MO.BIN5,
        ",": MO.PUNCT03,
        "": MO.ORD,
        "-": MO.BIN4,
        "-=": MO.BIN5,
        "->": MO.BIN5,
        ".": MO.ORD3,
        "..": MO.BIN3,
        "...": MO.INNER,
        "/": [4, 4, TEXCLASS.ORD, {}],
        "//": MO.BIN5,
        "/=": MO.BIN5,
        ":": [0, 3, TEXCLASS.REL, {}],
        ":=": MO.BIN5,
        ";": MO.PUNCT03,
        "<": MO.REL,
        "<=": MO.REL,
        "<>": [3, 3, TEXCLASS.REL, {}],
        "=": MO.REL,
        "==": MO.REL,
        ">": MO.REL,
        ">=": MO.REL,
        "?": [3, 3, TEXCLASS.CLOSE, { fence: true }],
        "@": MO.ORD3,
        "\\": MO.ORD,
        "^": [3, 3, TEXCLASS.ORD, { accent: true, stretchy: true }],
        "_": MO.WIDEACCENT,
        "|": [5, 5, TEXCLASS.ORD, {}],
        "||": MO.BIN5,
        "±": MO.BIN4,
        "·": MO.BIN3,
        "×": MO.BIN3,
        "÷": MO.BIN4,
        "ʹ": MO.ORD,
        "\u0300": MO.ACCENT,
        "\u0301": MO.ACCENT,
        "\u0303": MO.WIDEACCENT,
        "\u0304": MO.ACCENT,
        "\u0306": MO.ACCENT,
        "\u0307": MO.ACCENT,
        "\u0308": MO.ACCENT,
        "\u030C": MO.ACCENT,
        "\u0332": MO.WIDEACCENT,
        "\u0338": MO.REL,
        "϶": MO.REL,
        "―": MO.ORDSTRETCH0,
        "‗": MO.ORDSTRETCH0,
        "†": MO.BIN3,
        "‡": MO.BIN3,
        "•": MO.BIN3,
        "…": MO.INNER,
        "⁃": MO.BIN3,
        "⁄": MO.STRETCH4,
        "\u2061": MO.NONE,
        "\u2062": MO.NONE,
        "\u2063": [0, 0, TEXCLASS.NONE, { linebreakstyle: "after" }],
        "\u2064": MO.NONE,
        "\u20D7": MO.ACCENT,
        "ℑ": MO.ORD,
        "ℓ": MO.ORD,
        "℘": MO.ORD,
        "ℜ": MO.ORD,
        "←": MO.WIDEREL,
        "↑": MO.RELSTRETCH,
        "→": MO.WIDEREL,
        "↓": MO.RELSTRETCH,
        "↔": MO.WIDEREL,
        "↕": MO.RELSTRETCH,
        "↖": MO.REL,
        "↗": MO.REL,
        "↘": MO.REL,
        "↙": MO.REL,
        "↚": MO.WIDEREL,
        "↛": MO.WIDEREL,
        "↜": MO.WIDEREL,
        "↝": MO.WIDEREL,
        "↞": MO.WIDEREL,
        "↟": MO.RELSTRETCH,
        "↠": MO.WIDEREL,
        "↡": MO.RELSTRETCH,
        "↢": MO.WIDEREL,
        "↣": MO.WIDEREL,
        "↤": MO.WIDEREL,
        "↥": MO.RELSTRETCH,
        "↦": MO.WIDEREL,
        "↧": MO.RELSTRETCH,
        "↨": MO.RELSTRETCH,
        "↩": MO.WIDEREL,
        "↪": MO.WIDEREL,
        "↫": MO.WIDEREL,
        "↬": MO.WIDEREL,
        "↭": MO.WIDEREL,
        "↮": MO.WIDEREL,
        "↯": MO.REL,
        "↰": MO.RELSTRETCH,
        "↱": MO.RELSTRETCH,
        "↲": MO.RELSTRETCH,
        "↳": MO.RELSTRETCH,
        "↴": MO.RELSTRETCH,
        "↵": MO.RELSTRETCH,
        "↶": MO.REL,
        "↷": MO.REL,
        "↸": MO.REL,
        "↹": MO.WIDEREL,
        "↺": MO.REL,
        "↻": MO.REL,
        "↼": MO.WIDEREL,
        "↽": MO.WIDEREL,
        "↾": MO.RELSTRETCH,
        "↿": MO.RELSTRETCH,
        "⇀": MO.WIDEREL,
        "⇁": MO.WIDEREL,
        "⇂": MO.RELSTRETCH,
        "⇃": MO.RELSTRETCH,
        "⇄": MO.WIDEREL,
        "⇅": MO.RELSTRETCH,
        "⇆": MO.WIDEREL,
        "⇇": MO.WIDEREL,
        "⇈": MO.RELSTRETCH,
        "⇉": MO.WIDEREL,
        "⇊": MO.RELSTRETCH,
        "⇋": MO.WIDEREL,
        "⇌": MO.WIDEREL,
        "⇍": MO.WIDEREL,
        "⇎": MO.WIDEREL,
        "⇏": MO.WIDEREL,
        "⇐": MO.WIDEREL,
        "⇑": MO.RELSTRETCH,
        "⇒": MO.WIDEREL,
        "⇓": MO.RELSTRETCH,
        "⇔": MO.WIDEREL,
        "⇕": MO.RELSTRETCH,
        "⇖": MO.REL,
        "⇗": MO.REL,
        "⇘": MO.REL,
        "⇙": MO.REL,
        "⇚": MO.WIDEREL,
        "⇛": MO.WIDEREL,
        "⇜": MO.WIDEREL,
        "⇝": MO.WIDEREL,
        "⇞": MO.RELSTRETCH,
        "⇟": MO.RELSTRETCH,
        "⇠": MO.WIDEREL,
        "⇡": MO.RELSTRETCH,
        "⇢": MO.WIDEREL,
        "⇣": MO.RELSTRETCH,
        "⇤": MO.WIDEREL,
        "⇥": MO.WIDEREL,
        "⇦": MO.WIDEREL,
        "⇧": MO.RELSTRETCH,
        "⇨": MO.WIDEREL,
        "⇩": MO.RELSTRETCH,
        "⇪": MO.RELSTRETCH,
        "⇫": MO.RELSTRETCH,
        "⇬": MO.RELSTRETCH,
        "⇭": MO.RELSTRETCH,
        "⇮": MO.RELSTRETCH,
        "⇯": MO.RELSTRETCH,
        "⇰": MO.WIDEREL,
        "⇱": MO.REL,
        "⇲": MO.REL,
        "⇳": MO.RELSTRETCH,
        "⇴": MO.WIDEREL,
        "⇵": MO.RELSTRETCH,
        "⇶": MO.WIDEREL,
        "⇷": MO.WIDEREL,
        "⇸": MO.WIDEREL,
        "⇹": MO.WIDEREL,
        "⇺": MO.WIDEREL,
        "⇻": MO.WIDEREL,
        "⇼": MO.WIDEREL,
        "⇽": MO.WIDEREL,
        "⇾": MO.WIDEREL,
        "⇿": MO.WIDEREL,
        "∅": MO.ORD,
        "∆": MO.ORD,
        "∈": MO.REL,
        "∉": MO.REL,
        "∊": MO.REL,
        "∋": MO.REL,
        "∌": MO.REL,
        "∍": MO.REL,
        "−": MO.BIN4,
        "∓": MO.BIN4,
        "∔": MO.BIN4,
        "∕": MO.STRETCH4,
        "∖": MO.BIN4,
        "∗": MO.BIN3,
        "∘": MO.BIN3,
        "∙": MO.BIN3,
        "∝": MO.REL,
        "∞": MO.ORD,
        "∣": MO.REL,
        "∤": MO.REL,
        "∥": MO.REL,
        "∦": MO.REL,
        "∧": MO.BIN4,
        "∨": MO.BIN4,
        "∩": MO.BIN4,
        "∪": MO.BIN4,
        "∶": MO.BIN4,
        "∷": MO.REL,
        "∸": MO.BIN4,
        "∹": MO.REL,
        "∺": MO.REL,
        "∻": MO.REL,
        "∼": MO.REL,
        "∽": MO.REL,
        "∾": MO.REL,
        "≀": MO.BIN3,
        "≁": MO.REL,
        "≂": MO.REL,
        "≂\u0338": MO.REL,
        "≃": MO.REL,
        "≄": MO.REL,
        "≅": MO.REL,
        "≆": MO.REL,
        "≇": MO.REL,
        "≈": MO.REL,
        "≉": MO.REL,
        "≊": MO.REL,
        "≋": MO.REL,
        "≌": MO.REL,
        "≍": MO.REL,
        "≎": MO.REL,
        "≏": MO.REL,
        "≐": MO.REL,
        "≑": MO.REL,
        "≒": MO.REL,
        "≓": MO.REL,
        "≔": MO.REL,
        "≕": MO.REL,
        "≖": MO.REL,
        "≗": MO.REL,
        "≘": MO.REL,
        "≙": MO.REL,
        "≚": MO.REL,
        "≛": MO.REL,
        "≜": MO.REL,
        "≝": MO.REL,
        "≞": MO.REL,
        "≟": MO.REL,
        "≠": MO.REL,
        "≡": MO.REL,
        "≢": MO.REL,
        "≣": MO.REL,
        "≤": MO.REL,
        "≥": MO.REL,
        "≦": MO.REL,
        "≦\u0338": MO.REL,
        "≧": MO.REL,
        "≧\u0338": MO.REL,
        "≨": MO.REL,
        "≩": MO.REL,
        "≪": MO.REL,
        "≪\u0338": MO.REL,
        "≫": MO.REL,
        "≫\u0338": MO.REL,
        "≬": MO.REL,
        "≭": MO.REL,
        "≮": MO.REL,
        "≯": MO.REL,
        "≰": MO.REL,
        "≱": MO.REL,
        "≲": MO.REL,
        "≳": MO.REL,
        "≴": MO.REL,
        "≵": MO.REL,
        "≶": MO.REL,
        "≷": MO.REL,
        "≸": MO.REL,
        "≹": MO.REL,
        "≺": MO.REL,
        "≻": MO.REL,
        "≼": MO.REL,
        "≽": MO.REL,
        "≾": MO.REL,
        "≾\u0338": MO.REL,
        "≿": MO.REL,
        "≿\u0338": MO.REL,
        "⊀": MO.REL,
        "⊁": MO.REL,
        "⊂": MO.REL,
        "⊃": MO.REL,
        "⊄": MO.REL,
        "⊅": MO.REL,
        "⊆": MO.REL,
        "⊇": MO.REL,
        "⊈": MO.REL,
        "⊉": MO.REL,
        "⊊": MO.REL,
        "⊋": MO.REL,
        "⊌": MO.BIN4,
        "⊍": MO.BIN4,
        "⊎": MO.BIN4,
        "⊏": MO.REL,
        "⊏\u0338": MO.REL,
        "⊐": MO.REL,
        "⊐\u0338": MO.REL,
        "⊑": MO.REL,
        "⊒": MO.REL,
        "⊓": MO.BIN4,
        "⊔": MO.BIN4,
        "⊕": MO.BIN4,
        "⊖": MO.BIN4,
        "⊗": MO.BIN3,
        "⊘": MO.BIN4,
        "⊙": MO.BIN3,
        "⊚": MO.BIN3,
        "⊛": MO.BIN3,
        "⊜": MO.REL,
        "⊝": MO.BIN4,
        "⊞": MO.BIN4,
        "⊟": MO.BIN4,
        "⊠": MO.BIN3,
        "⊡": MO.BIN3,
        "⊢": MO.REL,
        "⊣": MO.REL,
        "⊤": MO.ORD,
        "⊥": MO.ORD,
        "⊦": MO.REL,
        "⊧": MO.REL,
        "⊨": MO.REL,
        "⊩": MO.REL,
        "⊪": MO.REL,
        "⊫": MO.REL,
        "⊬": MO.REL,
        "⊭": MO.REL,
        "⊮": MO.REL,
        "⊯": MO.REL,
        "⊰": MO.REL,
        "⊱": MO.REL,
        "⊲": MO.REL,
        "⊳": MO.REL,
        "⊴": MO.REL,
        "⊵": MO.REL,
        "⊶": MO.REL,
        "⊷": MO.REL,
        "⊸": MO.REL,
        "⊺": MO.BIN3,
        "⊻": MO.BIN4,
        "⊼": MO.BIN4,
        "⊽": MO.BIN4,
        "⋄": MO.BIN3,
        "⋅": MO.BIN3,
        "⋆": MO.BIN3,
        "⋇": MO.BIN3,
        "⋈": MO.REL,
        "⋉": MO.BIN3,
        "⋊": MO.BIN3,
        "⋋": MO.BIN3,
        "⋌": MO.BIN3,
        "⋍": MO.REL,
        "⋎": MO.BIN4,
        "⋏": MO.BIN4,
        "⋐": MO.REL,
        "⋑": MO.REL,
        "⋒": MO.BIN4,
        "⋓": MO.BIN4,
        "⋔": MO.REL,
        "⋕": MO.REL,
        "⋖": MO.REL,
        "⋗": MO.REL,
        "⋘": MO.REL,
        "⋙": MO.REL,
        "⋚": MO.REL,
        "⋛": MO.REL,
        "⋜": MO.REL,
        "⋝": MO.REL,
        "⋞": MO.REL,
        "⋟": MO.REL,
        "⋠": MO.REL,
        "⋡": MO.REL,
        "⋢": MO.REL,
        "⋣": MO.REL,
        "⋤": MO.REL,
        "⋥": MO.REL,
        "⋦": MO.REL,
        "⋧": MO.REL,
        "⋨": MO.REL,
        "⋩": MO.REL,
        "⋪": MO.REL,
        "⋫": MO.REL,
        "⋬": MO.REL,
        "⋭": MO.REL,
        "⋮": MO.ORD,
        "⋯": MO.INNER,
        "⋰": MO.INNER,
        "⋱": MO.INNER,
        "⋲": MO.REL,
        "⋳": MO.REL,
        "⋴": MO.REL,
        "⋵": MO.REL,
        "⋶": MO.REL,
        "⋷": MO.REL,
        "⋸": MO.REL,
        "⋹": MO.REL,
        "⋺": MO.REL,
        "⋻": MO.REL,
        "⋼": MO.REL,
        "⋽": MO.REL,
        "⋾": MO.REL,
        "⋿": MO.REL,
        "⌁": MO.REL,
        "⌅": MO.BIN3,
        "⌆": MO.BIN3,
        "〈": MO.OPEN,
        "〉": MO.CLOSE,
        "⍼": MO.REL,
        "⎋": MO.REL,
        "⎪": MO.ORD,
        "⎯": MO.ORDSTRETCH0,
        "⎰": MO.OPEN,
        "⎱": MO.CLOSE,
        "─": MO.ORD,
        "△": MO.BIN3,
        "▵": MO.BIN3,
        "▹": MO.BIN3,
        "▽": MO.BIN3,
        "▿": MO.BIN3,
        "◃": MO.BIN3,
        "◯": MO.BIN3,
        "♠": MO.ORD,
        "♡": MO.ORD,
        "♢": MO.ORD,
        "♣": MO.ORD,
        "♭": MO.ORD,
        "♮": MO.ORD,
        "♯": MO.ORD,
        "❘": [5, 5, TEXCLASS.REL, { stretchy: true, symmetric: true }],
        "➔": MO.WIDEREL,
        "➕": MO.BIN4,
        "➖": MO.BIN4,
        "➗": MO.BIN4,
        "➘": MO.REL,
        "➙": MO.WIDEREL,
        "➚": MO.REL,
        "➛": MO.WIDEREL,
        "➜": MO.WIDEREL,
        "➝": MO.WIDEREL,
        "➞": MO.WIDEREL,
        "➟": MO.WIDEREL,
        "➠": MO.WIDEREL,
        "➡": MO.WIDEREL,
        "➥": MO.WIDEREL,
        "➦": MO.WIDEREL,
        "➧": MO.RELACCENT,
        "➨": MO.WIDEREL,
        "➩": MO.WIDEREL,
        "➪": MO.WIDEREL,
        "➫": MO.WIDEREL,
        "➬": MO.WIDEREL,
        "➭": MO.WIDEREL,
        "➮": MO.WIDEREL,
        "➯": MO.WIDEREL,
        "➱": MO.WIDEREL,
        "➲": MO.RELACCENT,
        "➳": MO.WIDEREL,
        "➴": MO.REL,
        "➵": MO.WIDEREL,
        "➶": MO.REL,
        "➷": MO.REL,
        "➸": MO.WIDEREL,
        "➹": MO.REL,
        "➺": MO.WIDEREL,
        "➻": MO.WIDEREL,
        "➼": MO.WIDEREL,
        "➽": MO.WIDEREL,
        "➾": MO.WIDEREL,
        "⟂": MO.REL,
        "⟂\u0338": MO.REL,
        "⟋": MO.BIN3,
        "⟍": MO.BIN3,
        "⟰": MO.RELSTRETCH,
        "⟱": MO.RELSTRETCH,
        "⟲": MO.REL,
        "⟳": MO.REL,
        "⟴": MO.RELSTRETCH,
        "⟵": MO.WIDEREL,
        "⟶": MO.WIDEREL,
        "⟷": MO.WIDEREL,
        "⟸": MO.WIDEREL,
        "⟹": MO.WIDEREL,
        "⟺": MO.WIDEREL,
        "⟻": MO.WIDEREL,
        "⟼": MO.WIDEREL,
        "⟽": MO.WIDEREL,
        "⟾": MO.WIDEREL,
        "⟿": MO.WIDEREL,
        "⤀": MO.WIDEREL,
        "⤁": MO.WIDEREL,
        "⤂": MO.WIDEREL,
        "⤃": MO.WIDEREL,
        "⤄": MO.WIDEREL,
        "⤅": MO.WIDEREL,
        "⤆": MO.WIDEREL,
        "⤇": MO.WIDEREL,
        "⤈": MO.RELSTRETCH,
        "⤉": MO.RELSTRETCH,
        "⤊": MO.RELSTRETCH,
        "⤋": MO.RELSTRETCH,
        "⤌": MO.WIDEREL,
        "⤍": MO.WIDEREL,
        "⤎": MO.WIDEREL,
        "⤏": MO.WIDEREL,
        "⤐": MO.WIDEREL,
        "⤑": MO.WIDEREL,
        "⤒": MO.RELSTRETCH,
        "⤓": MO.RELSTRETCH,
        "⤔": MO.WIDEREL,
        "⤕": MO.WIDEREL,
        "⤖": MO.WIDEREL,
        "⤗": MO.WIDEREL,
        "⤘": MO.WIDEREL,
        "⤙": MO.WIDEREL,
        "⤚": MO.WIDEREL,
        "⤛": MO.WIDEREL,
        "⤜": MO.WIDEREL,
        "⤝": MO.WIDEREL,
        "⤞": MO.WIDEREL,
        "⤟": MO.WIDEREL,
        "⤠": MO.WIDEREL,
        "⤡": MO.REL,
        "⤢": MO.REL,
        "⤣": MO.REL,
        "⤤": MO.REL,
        "⤥": MO.REL,
        "⤦": MO.REL,
        "⤧": MO.REL,
        "⤨": MO.REL,
        "⤩": MO.REL,
        "⤪": MO.REL,
        "⤫": MO.REL,
        "⤬": MO.REL,
        "⤭": MO.REL,
        "⤮": MO.REL,
        "⤯": MO.REL,
        "⤰": MO.REL,
        "⤱": MO.REL,
        "⤲": MO.REL,
        "⤳": MO.RELACCENT,
        "⤴": MO.RELSTRETCH,
        "⤵": MO.RELSTRETCH,
        "⤶": MO.RELSTRETCH,
        "⤷": MO.RELSTRETCH,
        "⤸": MO.REL,
        "⤹": MO.REL,
        "⤺": MO.RELACCENT,
        "⤻": MO.RELACCENT,
        "⤼": MO.RELACCENT,
        "⤽": MO.RELACCENT,
        "⤾": MO.REL,
        "⤿": MO.REL,
        "⥀": MO.REL,
        "⥁": MO.REL,
        "⥂": MO.WIDEREL,
        "⥃": MO.WIDEREL,
        "⥄": MO.WIDEREL,
        "⥅": MO.RELSTRETCH,
        "⥆": MO.RELSTRETCH,
        "⥇": MO.WIDEREL,
        "⥈": MO.WIDEREL,
        "⥉": MO.RELSTRETCH,
        "⥊": MO.WIDEREL,
        "⥋": MO.WIDEREL,
        "⥌": MO.RELSTRETCH,
        "⥍": MO.RELSTRETCH,
        "⥎": MO.WIDEREL,
        "⥏": MO.RELSTRETCH,
        "⥐": MO.WIDEREL,
        "⥑": MO.RELSTRETCH,
        "⥒": MO.WIDEREL,
        "⥓": MO.WIDEREL,
        "⥔": MO.RELSTRETCH,
        "⥕": MO.RELSTRETCH,
        "⥖": MO.WIDEREL,
        "⥗": MO.WIDEREL,
        "⥘": MO.RELSTRETCH,
        "⥙": MO.RELSTRETCH,
        "⥚": MO.WIDEREL,
        "⥛": MO.WIDEREL,
        "⥜": MO.RELSTRETCH,
        "⥝": MO.RELSTRETCH,
        "⥞": MO.WIDEREL,
        "⥟": MO.WIDEREL,
        "⥠": MO.RELSTRETCH,
        "⥡": MO.RELSTRETCH,
        "⥢": MO.WIDEREL,
        "⥣": MO.RELSTRETCH,
        "⥤": MO.WIDEREL,
        "⥥": MO.RELSTRETCH,
        "⥦": MO.WIDEREL,
        "⥧": MO.WIDEREL,
        "⥨": MO.WIDEREL,
        "⥩": MO.WIDEREL,
        "⥪": MO.WIDEREL,
        "⥫": MO.WIDEREL,
        "⥬": MO.WIDEREL,
        "⥭": MO.WIDEREL,
        "⥮": MO.RELSTRETCH,
        "⥯": MO.RELSTRETCH,
        "⥰": MO.WIDEREL,
        "⥱": MO.WIDEREL,
        "⥲": MO.WIDEREL,
        "⥳": MO.WIDEREL,
        "⥴": MO.WIDEREL,
        "⥵": MO.WIDEREL,
        "⥶": MO.RELACCENT,
        "⥷": MO.RELACCENT,
        "⥸": MO.RELACCENT,
        "⥹": MO.RELACCENT,
        "⥺": MO.RELACCENT,
        "⥻": MO.RELACCENT,
        "⥼": MO.WIDEREL,
        "⥽": MO.WIDEREL,
        "⥾": MO.RELSTRETCH,
        "⥿": MO.RELSTRETCH,
        "⦁": MO.REL,
        "⦂": MO.REL,
        "⦶": MO.REL,
        "⦷": MO.REL,
        "⦸": MO.BIN4,
        "⦹": MO.REL,
        "⦼": MO.BIN4,
        "⧀": MO.REL,
        "⧁": MO.REL,
        "⧄": MO.BIN4,
        "⧅": MO.BIN4,
        "⧆": MO.BIN3,
        "⧇": MO.BIN3,
        "⧈": MO.BIN3,
        "⧎": MO.REL,
        "⧏": MO.REL,
        "⧐": MO.REL,
        "⧑": MO.REL,
        "⧒": MO.REL,
        "⧓": MO.REL,
        "⧔": MO.BIN3,
        "⧕": MO.BIN3,
        "⧖": MO.BIN3,
        "⧗": MO.BIN3,
        "⧟": MO.REL,
        "⧡": MO.REL,
        "⧢": MO.BIN3,
        "⧣": MO.REL,
        "⧤": MO.REL,
        "⧥": MO.REL,
        "⧦": MO.REL,
        "⧴": MO.REL,
        "⧵": MO.BIN4,
        "⧶": MO.BIN4,
        "⧷": MO.BIN4,
        "⧸": MO.BIN4,
        "⧹": MO.BIN4,
        "⧺": MO.BIN4,
        "⧻": MO.BIN4,
        "⨝": MO.BIN3,
        "⨞": MO.BIN3,
        "⨟": MO.BIN4,
        "⨠": MO.BIN4,
        "⨡": MO.BIN4,
        "⨢": MO.BIN4,
        "⨣": MO.BIN4,
        "⨤": MO.BIN4,
        "⨥": MO.BIN4,
        "⨦": MO.BIN4,
        "⨧": MO.BIN4,
        "⨨": MO.BIN4,
        "⨩": MO.BIN4,
        "⨪": MO.BIN4,
        "⨫": MO.BIN4,
        "⨬": MO.BIN4,
        "⨭": MO.BIN4,
        "⨮": MO.BIN4,
        "⨯": MO.BIN3,
        "⨰": MO.BIN3,
        "⨱": MO.BIN3,
        "⨲": MO.BIN3,
        "⨳": MO.BIN3,
        "⨴": MO.BIN3,
        "⨵": MO.BIN3,
        "⨶": MO.BIN3,
        "⨷": MO.BIN3,
        "⨸": MO.BIN4,
        "⨹": MO.BIN4,
        "⨺": MO.BIN4,
        "⨻": MO.BIN3,
        "⨼": MO.BIN3,
        "⨽": MO.BIN3,
        "⨾": MO.BIN4,
        "⨿": MO.BIN3,
        "⩀": MO.BIN4,
        "⩁": MO.BIN4,
        "⩂": MO.BIN4,
        "⩃": MO.BIN4,
        "⩄": MO.BIN4,
        "⩅": MO.BIN4,
        "⩆": MO.BIN4,
        "⩇": MO.BIN4,
        "⩈": MO.BIN4,
        "⩉": MO.BIN4,
        "⩊": MO.BIN4,
        "⩋": MO.BIN4,
        "⩌": MO.BIN4,
        "⩍": MO.BIN4,
        "⩎": MO.BIN4,
        "⩏": MO.BIN4,
        "⩐": MO.BIN3,
        "⩑": MO.BIN4,
        "⩒": MO.BIN4,
        "⩓": MO.BIN4,
        "⩔": MO.BIN4,
        "⩕": MO.BIN4,
        "⩖": MO.BIN4,
        "⩗": MO.BIN4,
        "⩘": MO.BIN4,
        "⩙": MO.BIN4,
        "⩚": MO.BIN4,
        "⩛": MO.BIN4,
        "⩜": MO.BIN4,
        "⩝": MO.BIN4,
        "⩞": MO.BIN4,
        "⩟": MO.BIN4,
        "⩠": MO.BIN4,
        "⩡": MO.BIN4,
        "⩢": MO.BIN4,
        "⩣": MO.BIN4,
        "⩤": MO.BIN3,
        "⩥": MO.BIN3,
        "⩦": MO.REL,
        "⩧": MO.REL,
        "⩨": MO.REL,
        "⩩": MO.REL,
        "⩪": MO.REL,
        "⩫": MO.REL,
        "⩬": MO.REL,
        "⩭": MO.REL,
        "⩮": MO.REL,
        "⩯": MO.REL,
        "⩰": MO.REL,
        "⩱": MO.REL,
        "⩲": MO.REL,
        "⩳": MO.REL,
        "⩴": MO.REL,
        "⩵": MO.REL,
        "⩶": MO.REL,
        "⩷": MO.REL,
        "⩸": MO.REL,
        "⩹": MO.REL,
        "⩺": MO.REL,
        "⩻": MO.REL,
        "⩼": MO.REL,
        "⩽": MO.REL,
        "⩽\u0338": MO.REL,
        "⩾": MO.REL,
        "⩾\u0338": MO.REL,
        "⩿": MO.REL,
        "⪀": MO.REL,
        "⪁": MO.REL,
        "⪂": MO.REL,
        "⪃": MO.REL,
        "⪄": MO.REL,
        "⪅": MO.REL,
        "⪆": MO.REL,
        "⪇": MO.REL,
        "⪈": MO.REL,
        "⪉": MO.REL,
        "⪊": MO.REL,
        "⪋": MO.REL,
        "⪌": MO.REL,
        "⪍": MO.REL,
        "⪎": MO.REL,
        "⪏": MO.REL,
        "⪐": MO.REL,
        "⪑": MO.REL,
        "⪒": MO.REL,
        "⪓": MO.REL,
        "⪔": MO.REL,
        "⪕": MO.REL,
        "⪖": MO.REL,
        "⪗": MO.REL,
        "⪘": MO.REL,
        "⪙": MO.REL,
        "⪚": MO.REL,
        "⪛": MO.REL,
        "⪜": MO.REL,
        "⪝": MO.REL,
        "⪞": MO.REL,
        "⪟": MO.REL,
        "⪠": MO.REL,
        "⪡": MO.REL,
        "⪢": MO.REL,
        "⪣": MO.REL,
        "⪤": MO.REL,
        "⪥": MO.REL,
        "⪦": MO.REL,
        "⪧": MO.REL,
        "⪨": MO.REL,
        "⪩": MO.REL,
        "⪪": MO.REL,
        "⪫": MO.REL,
        "⪬": MO.REL,
        "⪭": MO.REL,
        "⪮": MO.REL,
        "⪯": MO.REL,
        "⪯\u0338": MO.REL,
        "⪰": MO.REL,
        "⪰\u0338": MO.REL,
        "⪱": MO.REL,
        "⪲": MO.REL,
        "⪳": MO.REL,
        "⪴": MO.REL,
        "⪵": MO.REL,
        "⪶": MO.REL,
        "⪷": MO.REL,
        "⪸": MO.REL,
        "⪹": MO.REL,
        "⪺": MO.REL,
        "⪻": MO.REL,
        "⪼": MO.REL,
        "⪽": MO.REL,
        "⪾": MO.REL,
        "⪿": MO.REL,
        "⫀": MO.REL,
        "⫁": MO.REL,
        "⫂": MO.REL,
        "⫃": MO.REL,
        "⫄": MO.REL,
        "⫅": MO.REL,
        "⫆": MO.REL,
        "⫇": MO.REL,
        "⫈": MO.REL,
        "⫉": MO.REL,
        "⫊": MO.REL,
        "⫋": MO.REL,
        "⫌": MO.REL,
        "⫍": MO.REL,
        "⫎": MO.REL,
        "⫏": MO.REL,
        "⫐": MO.REL,
        "⫑": MO.REL,
        "⫒": MO.REL,
        "⫓": MO.REL,
        "⫔": MO.REL,
        "⫕": MO.REL,
        "⫖": MO.REL,
        "⫗": MO.REL,
        "⫘": MO.REL,
        "⫙": MO.REL,
        "⫚": MO.REL,
        "⫛": MO.BIN4,
        "⫝": MO.BIN3,
        "⫝\u0338": MO.REL,
        "⫞": MO.REL,
        "⫟": MO.REL,
        "⫠": MO.REL,
        "⫡": MO.REL,
        "⫢": MO.REL,
        "⫣": MO.REL,
        "⫤": MO.REL,
        "⫥": MO.REL,
        "⫦": MO.REL,
        "⫧": MO.REL,
        "⫨": MO.REL,
        "⫩": MO.REL,
        "⫪": MO.REL,
        "⫫": MO.REL,
        "⫮": MO.REL,
        "⫲": MO.REL,
        "⫳": MO.REL,
        "⫴": MO.REL,
        "⫵": MO.REL,
        "⫶": MO.BIN4,
        "⫷": MO.REL,
        "⫸": MO.REL,
        "⫹": MO.REL,
        "⫺": MO.REL,
        "⫻": MO.BIN4,
        "⫽": MO.BIN4,
        "⫾": MO.BIN3,
        "⬀": MO.REL,
        "⬁": MO.REL,
        "⬂": MO.REL,
        "⬃": MO.REL,
        "⬄": MO.WIDEREL,
        "⬅": MO.WIDEREL,
        "⬆": MO.RELSTRETCH,
        "⬇": MO.RELSTRETCH,
        "⬈": MO.REL,
        "⬉": MO.REL,
        "⬊": MO.REL,
        "⬋": MO.REL,
        "⬌": MO.WIDEREL,
        "⬍": MO.RELSTRETCH,
        "⬎": MO.RELSTRETCH,
        "⬏": MO.RELSTRETCH,
        "⬐": MO.RELSTRETCH,
        "⬑": MO.RELSTRETCH,
        "⬰": MO.WIDEREL,
        "⬱": MO.WIDEREL,
        "⬲": MO.RELSTRETCH,
        "⬳": MO.WIDEREL,
        "⬴": MO.WIDEREL,
        "⬵": MO.WIDEREL,
        "⬶": MO.WIDEREL,
        "⬷": MO.WIDEREL,
        "⬸": MO.WIDEREL,
        "⬹": MO.WIDEREL,
        "⬺": MO.WIDEREL,
        "⬻": MO.WIDEREL,
        "⬼": MO.WIDEREL,
        "⬽": MO.WIDEREL,
        "⬾": MO.WIDEREL,
        "⬿": MO.RELACCENT,
        "⭀": MO.WIDEREL,
        "⭁": MO.WIDEREL,
        "⭂": MO.WIDEREL,
        "⭃": MO.WIDEREL,
        "⭄": MO.WIDEREL,
        "⭅": MO.WIDEREL,
        "⭆": MO.WIDEREL,
        "⭇": MO.WIDEREL,
        "⭈": MO.WIDEREL,
        "⭉": MO.WIDEREL,
        "⭊": MO.WIDEREL,
        "⭋": MO.WIDEREL,
        "⭌": MO.WIDEREL,
        "⭍": MO.REL,
        "⭎": MO.REL,
        "⭏": MO.REL,
        "⭚": MO.REL,
        "⭛": MO.REL,
        "⭜": MO.REL,
        "⭝": MO.REL,
        "⭞": MO.REL,
        "⭟": MO.REL,
        "⭠": MO.WIDEREL,
        "⭡": MO.RELSTRETCH,
        "⭢": MO.WIDEREL,
        "⭣": MO.RELSTRETCH,
        "⭤": MO.WIDEREL,
        "⭥": MO.RELSTRETCH,
        "⭦": MO.REL,
        "⭧": MO.REL,
        "⭨": MO.REL,
        "⭩": MO.REL,
        "⭪": MO.WIDEREL,
        "⭫": MO.RELSTRETCH,
        "⭬": MO.WIDEREL,
        "⭭": MO.RELSTRETCH,
        "⭮": MO.REL,
        "⭯": MO.REL,
        "⭰": MO.WIDEREL,
        "⭱": MO.RELSTRETCH,
        "⭲": MO.WIDEREL,
        "⭳": MO.RELSTRETCH,
        "⭶": MO.REL,
        "⭷": MO.REL,
        "⭸": MO.REL,
        "⭹": MO.REL,
        "⭺": MO.WIDEREL,
        "⭻": MO.RELSTRETCH,
        "⭼": MO.WIDEREL,
        "⭽": MO.RELSTRETCH,
        "⮀": MO.WIDEREL,
        "⮁": MO.RELSTRETCH,
        "⮂": MO.WIDEREL,
        "⮃": MO.RELSTRETCH,
        "⮄": MO.WIDEREL,
        "⮅": MO.RELSTRETCH,
        "⮆": MO.WIDEREL,
        "⮇": MO.RELSTRETCH,
        "⮈": MO.RELACCENT,
        "⮉": MO.REL,
        "⮊": MO.RELACCENT,
        "⮋": MO.REL,
        "⮌": MO.REL,
        "⮍": MO.REL,
        "⮎": MO.REL,
        "⮏": MO.REL,
        "⮔": MO.REL,
        "⮕": MO.WIDEREL,
        "⮠": MO.RELSTRETCH,
        "⮡": MO.RELSTRETCH,
        "⮢": MO.RELSTRETCH,
        "⮣": MO.RELSTRETCH,
        "⮤": MO.RELSTRETCH,
        "⮥": MO.RELSTRETCH,
        "⮦": MO.RELSTRETCH,
        "⮧": MO.RELSTRETCH,
        "⮨": MO.WIDEREL,
        "⮩": MO.WIDEREL,
        "⮪": MO.WIDEREL,
        "⮫": MO.WIDEREL,
        "⮬": MO.RELSTRETCH,
        "⮭": MO.RELSTRETCH,
        "⮮": MO.RELSTRETCH,
        "⮯": MO.RELSTRETCH,
        "⮰": MO.REL,
        "⮱": MO.REL,
        "⮲": MO.REL,
        "⮳": MO.REL,
        "⮴": MO.REL,
        "⮵": MO.REL,
        "⮶": MO.REL,
        "⮷": MO.REL,
        "⮸": MO.RELSTRETCH,
        "⯑": MO.REL,
        "㫜": MO.BIN3,
        "︷": MO.WIDEACCENT,
        "︸": MO.WIDEACCENT
      }
    };
  }
});
export{init_MmlNode,init_OperatorDictionary,AbstractMmlTokenNode,TEXCLASS,OPDEF,getRange,MMLSPACING,OPTABLE,AbstractMmlNode,AbstractMmlBaseNode,AbstractMmlLayoutNode,indentAttributes,XMLNode,init_math,init_mi,init_mn,MmlMath,MmlMi,MmlMn,TextNode,init_NodeFactory,AbstractNodeFactory,TEXCLASSNAMES,AbstractMmlEmptyNode,init_Factory,AbstractFactory};
