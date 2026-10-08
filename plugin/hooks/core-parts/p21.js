import{__esm,init_FontData,init_Wrapper3,init_mfrac,CommonMfracMixin,SvgWrapper,MmlMfrac,DIRECTION,BBox,init_BBox,init_msqrt,MmlMsqrt,init_mroot,MmlMroot,init_mfenced,MmlMfenced,LineBBox,init_LineBBox,init_msubsup,MmlMsub,MmlMsup,MmlMsubsup,init_munderover,MmlMunder,MmlMover,MmlMunderover,init_mmultiscripts,init_string,split,MmlMmultiscripts,isPercent,Styles,TRBL,__kittexLate}from'./p20.js';export*from'./p20.js';
var init_mfrac2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mfrac.js"() {
    init_FontData();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mfrac.js
var SvgMfrac;
var init_mfrac3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mfrac.js"() {
    init_Wrapper3();
    init_mfrac2();
    init_mfrac();
    SvgMfrac = (function() {
      var _a2;
      const Base2 = CommonMfracMixin(SvgWrapper);
      return _a2 = class SvgMfrac extends Base2 {
        toSVG(parents) {
          if (this.toEmbellishedSVG(parents))
            return;
          this.standardSvgNodes(parents);
          const { linethickness, bevelled } = this.node.attributes.getList("linethickness", "bevelled");
          const display = this.isDisplay();
          if (bevelled) {
            this.makeBevelled(display);
          } else {
            const thickness = this.length2em(String(linethickness), 0.06);
            if (thickness === 0) {
              this.makeAtop(display);
            } else {
              this.makeFraction(display, thickness);
            }
          }
        }
        makeFraction(display, t) {
          const svg = this.dom;
          const { numalign, denomalign } = this.node.attributes.getList("numalign", "denomalign");
          const [num3, den] = this.childNodes;
          const nbox = num3.getOuterBBox();
          const dbox = den.getOuterBBox();
          const tex = this.font.params;
          const a = tex.axis_height;
          const d = 0.1;
          const pad2 = this.node.getProperty("withDelims") ? 0 : tex.nulldelimiterspace;
          const W = Math.max((nbox.L + nbox.w + nbox.R) * nbox.rscale, (dbox.L + dbox.w + dbox.R) * dbox.rscale);
          const nx = this.getAlignX(W, nbox, numalign) + d + pad2;
          const dx = this.getAlignX(W, dbox, denomalign) + d + pad2;
          const { T, u, v } = this.getTUV(display, t);
          num3.toSVG(svg);
          num3.place(nx, a + T + Math.max(nbox.d * nbox.rscale, u));
          den.toSVG(svg);
          den.place(dx, a - T - Math.max(dbox.h * dbox.rscale, v));
          this.adaptor.append(svg[0], this.svg("rect", {
            width: this.fixed(W + 2 * d),
            height: this.fixed(t),
            x: this.fixed(pad2),
            y: this.fixed(a - t / 2)
          }));
        }
        makeAtop(display) {
          const svg = this.dom;
          const { numalign, denomalign } = this.node.attributes.getList("numalign", "denomalign");
          const [num3, den] = this.childNodes;
          const nbox = num3.getOuterBBox();
          const dbox = den.getOuterBBox();
          const tex = this.font.params;
          const pad2 = this.node.getProperty("withDelims") ? 0 : tex.nulldelimiterspace;
          const W = Math.max((nbox.L + nbox.w + nbox.R) * nbox.rscale, (dbox.L + dbox.w + dbox.R) * dbox.rscale);
          const nx = this.getAlignX(W, nbox, numalign) + pad2;
          const dx = this.getAlignX(W, dbox, denomalign) + pad2;
          const { u, v } = this.getUVQ(display);
          num3.toSVG(svg);
          num3.place(nx, u);
          den.toSVG(svg);
          den.place(dx, -v);
        }
        makeBevelled(display) {
          const svg = this.dom;
          const [num3, den] = this.childNodes;
          const { u, v, delta, nbox, dbox } = this.getBevelData(display);
          const w = (nbox.L + nbox.w + nbox.R) * nbox.rscale;
          num3.toSVG(svg);
          this.bevel.toSVG(svg);
          den.toSVG(svg);
          num3.place(nbox.L * nbox.rscale, u);
          this.bevel.place(w - delta / 2, 0);
          den.place(w + this.bevel.getOuterBBox().w + dbox.L * dbox.rscale - delta, v);
        }
      }, _a2.kind = MmlMfrac.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/msqrt.js
function CommonMsqrtMixin(Base2) {
  return class CommonMsqrtMixin extends Base2 {
    get base() {
      return 0;
    }
    get root() {
      return null;
    }
    combineRootBBox(_bbox, _sbox, _H) {
    }
    getPQ(sbox) {
      const t = this.font.params.rule_thickness;
      const s = this.font.params.surd_height;
      const p = this.node.attributes.get("displaystyle") ? this.font.params.x_height : t;
      const q = sbox.h + sbox.d > this.surdH ? (sbox.h + sbox.d - (this.surdH - t - s - p / 2)) / 2 : s + p / 4;
      return [p, q];
    }
    getRootDimens(_sbox, _H) {
      return [0, 0, 0, 0];
    }
    rootWidth() {
      return 1.25;
    }
    getStretchedSurd() {
      const t = this.font.params.rule_thickness;
      const s = this.font.params.surd_height;
      const p = this.node.attributes.get("displaystyle") ? this.font.params.x_height : t;
      const { h, d } = this.childNodes[this.base].getOuterBBox();
      this.surdH = h + d + t + s + p / 4;
      this.surd.getStretchedVariant([this.surdH - d, d], true);
    }
    constructor(factory, node, parent = null) {
      super(factory, node, parent);
      this.surd = this.createMo("√");
      this.surd.canStretch(DIRECTION.Vertical);
      this.getStretchedSurd();
    }
    computeBBox(bbox, recompute = false) {
      bbox.empty();
      const surdbox = this.surd.getBBox();
      const basebox = new BBox(this.childNodes[this.base].getOuterBBox());
      const q = this.getPQ(surdbox)[1];
      const t = this.font.params.rule_thickness;
      const s = this.font.params.surd_height;
      const H2 = basebox.h + q + t;
      const [x2] = this.getRootDimens(surdbox, H2);
      bbox.h = H2 + s;
      this.combineRootBBox(bbox, surdbox, H2);
      bbox.combine(surdbox, x2, H2 - surdbox.h);
      bbox.combine(basebox, x2 + surdbox.w, 0);
      bbox.clean();
      this.setChildPWidths(recompute);
    }
    invalidateBBox() {
      super.invalidateBBox();
      this.surd.childNodes[0].invalidateBBox();
    }
  };
}
var init_msqrt2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/msqrt.js"() {
    init_BBox();
    init_FontData();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/msqrt.js
var SvgMsqrt;
var init_msqrt3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/msqrt.js"() {
    init_Wrapper3();
    init_msqrt2();
    init_msqrt();
    SvgMsqrt = (function() {
      var _a2;
      const Base2 = CommonMsqrtMixin(SvgWrapper);
      return _a2 = class SvgMsqrt extends Base2 {
        constructor() {
          super(...arguments);
          this.dx = 0;
        }
        addRoot(_ROOT, _root, _sbox, _H) {
          return 0;
        }
        toSVG(parents) {
          const surd = this.surd;
          const base = this.childNodes[this.base];
          const root2 = this.root ? this.childNodes[this.root] : null;
          const sbox = surd.getBBox();
          const bbox = base.getOuterBBox();
          const q = this.getPQ(sbox)[1];
          const t = this.font.params.surd_height * this.bbox.scale;
          const H2 = bbox.h + q + t;
          const SVG2 = this.standardSvgNodes(parents);
          surd.toSVG(SVG2);
          const dx = this.addRoot(SVG2, root2, sbox, H2);
          const BASE = this.adaptor.append(SVG2[0], this.svg("g"));
          base.toSVG([BASE]);
          surd.place(dx, H2 - sbox.h);
          base.place(dx + sbox.w, 0);
          this.adaptor.append(SVG2[SVG2.length - 1], this.svg("rect", {
            width: this.fixed(bbox.w),
            height: this.fixed(t),
            x: this.fixed(dx + sbox.w),
            y: this.fixed(H2 - t)
          }));
        }
      }, _a2.kind = MmlMsqrt.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mroot.js
function CommonMrootMixin(Base2) {
  return class CommonMrootMixin extends Base2 {
    get root() {
      return 1;
    }
    combineRootBBox(BBOX, sbox, H2) {
      const bbox = this.childNodes[this.root].getOuterBBox();
      const h = this.getRootDimens(sbox, H2)[1];
      BBOX.combine(bbox, 0, h);
    }
    getRootDimens(sbox, H2) {
      const surd = this.surd;
      const bbox = this.childNodes[this.root].getOuterBBox();
      const offset = (surd.size < 0 ? 0.5 : 0.6) * sbox.w;
      const { w, rscale } = bbox;
      const W = Math.max(w, offset / rscale);
      const dx = Math.max(0, W - w);
      const h = this.rootHeight(bbox, sbox, surd.size, H2);
      const x2 = W * rscale - offset;
      return [x2, h, dx];
    }
    rootHeight(rbox, sbox, size, H2) {
      const h = sbox.h + sbox.d;
      const b = (size < 0 ? 1.9 : 0.55 * h) - (h - H2);
      return b + Math.max(0, rbox.d * rbox.rscale);
    }
    rootWidth() {
      const bbox = this.childNodes[this.root].getOuterBBox();
      return 0.4 + bbox.w * bbox.rscale;
    }
  };
}
var init_mroot2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mroot.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mroot.js
var SvgMroot;
var init_mroot3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mroot.js"() {
    init_mroot2();
    init_mroot();
    init_msqrt3();
    SvgMroot = (function() {
      var _a2;
      const Base2 = CommonMrootMixin(SvgMsqrt);
      return _a2 = class SvgMroot extends Base2 {
        addRoot(ROOT, root2, sbox, H2) {
          root2.toSVG(ROOT);
          const [x2, h, dx] = this.getRootDimens(sbox, H2);
          const bbox = root2.getOuterBBox();
          root2.place(dx * bbox.rscale, h);
          return x2;
        }
      }, _a2.kind = MmlMroot.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mfenced.js
function CommonMfencedMixin(Base2) {
  return class CommonMfencedMixin extends Base2 {
    createMrow() {
      const mmlFactory = this.node.factory;
      const mrow = mmlFactory.create("inferredMrow");
      mrow.inheritAttributesFrom(this.node);
      this.mrow = this.wrap(mrow);
      this.mrow.parent = this;
    }
    addMrowChildren() {
      const mfenced = this.node;
      const mrow = this.mrow;
      this.addMo(mfenced.open);
      if (this.childNodes.length) {
        mrow.childNodes.push(this.childNodes[0]);
      }
      let i2 = 0;
      for (const child of this.childNodes.slice(1)) {
        this.addMo(mfenced.separators[i2++]);
        mrow.childNodes.push(child);
      }
      this.addMo(mfenced.close);
      mrow.stretchChildren();
    }
    addMo(node) {
      if (!node)
        return;
      const mo = this.wrap(node);
      this.mrow.childNodes.push(mo);
      mo.parent = this.mrow;
    }
    constructor(factory, node, parent = null) {
      super(factory, node, parent);
      this.mrow = null;
      this.createMrow();
      this.addMrowChildren();
    }
    computeBBox(bbox, recompute = false) {
      bbox.updateFrom(this.mrow.getOuterBBox());
      this.setChildPWidths(recompute);
    }
    get breakCount() {
      return this.mrow.breakCount;
    }
    computeLineBBox(i2) {
      return this.mrow.getLineBBox(i2);
    }
  };
}
var init_mfenced2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mfenced.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mfenced.js
var SvgMfenced;
var init_mfenced3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mfenced.js"() {
    init_Wrapper3();
    init_mfenced2();
    init_mfenced();
    SvgMfenced = (function() {
      var _a2;
      const Base2 = CommonMfencedMixin(SvgWrapper);
      return _a2 = class SvgMfenced extends Base2 {
        toSVG(parents) {
          const svg = this.standardSvgNodes(parents);
          this.setChildrenParent(this.mrow);
          this.mrow.toSVG(svg);
          this.setChildrenParent(this);
        }
        setChildrenParent(parent) {
          for (const child of this.childNodes) {
            child.parent = parent;
          }
        }
      }, _a2.kind = MmlMfenced.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/msubsup.js
function CommonMsubMixin(Base2) {
  var _a2;
  return _a2 = class CommonMsubMixin extends Base2 {
    get scriptChild() {
      return this.childNodes[this.node.sub];
    }
    getOffset() {
      const x2 = this.baseIsChar ? 0 : this.getAdjustedIc();
      return [x2, -this.getV()];
    }
  }, _a2.useIC = false, _a2;
}
function CommonMsupMixin(Base2) {
  return class CommonMsupMixin extends Base2 {
    get scriptChild() {
      return this.childNodes[this.node.sup];
    }
    getOffset() {
      const x2 = this.getAdjustedIc() - (this.baseRemoveIc ? 0 : this.baseIc);
      return [x2, this.getU()];
    }
  };
}
function CommonMsubsupMixin(Base2) {
  var _a2;
  return _a2 = class CommonMsubsupMixin extends Base2 {
    constructor() {
      super(...arguments);
      this.UVQ = null;
    }
    get subChild() {
      return this.childNodes[this.node.sub];
    }
    get supChild() {
      return this.childNodes[this.node.sup];
    }
    get scriptChild() {
      return this.supChild;
    }
    getUVQ(subbox = this.subChild.getOuterBBox(), supbox = this.supChild.getOuterBBox()) {
      const base = this.baseCore;
      const bbox = base.getLineBBox(base.breakCount);
      if (this.UVQ)
        return this.UVQ;
      const tex = this.font.params;
      const t = 3 * tex.rule_thickness;
      const subscriptshift = this.length2em(this.node.attributes.get("subscriptshift"), tex.sub2);
      const drop = this.baseCharZero(bbox.d * this.baseScale + tex.sub_drop * subbox.rscale);
      const supd = supbox.d * supbox.rscale;
      const subh = subbox.h * subbox.rscale;
      let [u, v] = [this.getU(), Math.max(drop, subscriptshift)];
      let q = u - supd - (subh - v);
      if (q < t) {
        v += t - q;
        const p = 4 / 5 * tex.x_height - (u - supd);
        if (p > 0) {
          u += p;
          v -= p;
        }
      }
      u = Math.max(this.length2em(this.node.attributes.get("superscriptshift"), u), u);
      v = Math.max(this.length2em(this.node.attributes.get("subscriptshift"), v), v);
      q = u - supd - (subh - v);
      this.UVQ = [u, -v, q];
      return this.UVQ;
    }
    appendScripts(bbox) {
      const [subbox, supbox] = [
        this.subChild.getOuterBBox(),
        this.supChild.getOuterBBox()
      ];
      const w = this.getBaseWidth();
      const x2 = this.getAdjustedIc();
      const [u, v] = this.getUVQ();
      const y = bbox.d - this.baseChild.getLineBBox(this.baseChild.breakCount).d;
      bbox.combine(subbox, w + (this.baseIsChar ? 0 : x2), v - y);
      bbox.combine(supbox, w + x2, u - y);
      bbox.w += this.font.params.scriptspace;
      return bbox;
    }
  }, _a2.useIC = false, _a2;
}
var init_msubsup2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/msubsup.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/scriptbase.js
function CommonScriptbaseMixin(Base2) {
  var _a2;
  return _a2 = class CommonScriptbaseMixin extends Base2 {
    get baseChild() {
      return this.childNodes[this.node.base];
    }
    get scriptChild() {
      return this.childNodes[1];
    }
    getBaseCore() {
      let core = this.getSemanticBase() || this.childNodes[0];
      let node = core === null || core === void 0 ? void 0 : core.node;
      while (core && (core.childNodes.length === 1 && (node.isKind("mrow") || node.isKind("TeXAtom") || node.isKind("mstyle") || node.isKind("mpadded") && !node.getProperty("vbox") || node.isKind("mphantom") || node.isKind("semantics")) || node.isKind("munderover") && core.isMathAccent)) {
        this.setBaseAccentsFor(core);
        core = core.childNodes[0];
        node = core === null || core === void 0 ? void 0 : core.node;
      }
      if (!core) {
        this.baseHasAccentOver = this.baseHasAccentUnder = false;
      }
      return core || this.childNodes[0];
    }
    setBaseAccentsFor(core) {
      if (core.node.isKind("munderover")) {
        if (this.baseHasAccentOver === null) {
          this.baseHasAccentOver = !!core.node.attributes.get("accent");
        }
        if (this.baseHasAccentUnder === null) {
          this.baseHasAccentUnder = !!core.node.attributes.get("accentunder");
        }
      }
    }
    getSemanticBase() {
      const fence = this.node.attributes.getExplicit("data-semantic-fencepointer");
      return this.getBaseFence(this.baseChild, fence);
    }
    getBaseFence(fence, id) {
      if (!fence || !fence.node.attributes || !id) {
        return null;
      }
      if (fence.node.attributes.getExplicit("data-semantic-id") === id) {
        return fence;
      }
      for (const child of fence.childNodes) {
        const result = this.getBaseFence(child, id);
        if (result) {
          return result;
        }
      }
      return null;
    }
    getBaseScale() {
      let child = this.baseCore;
      let scale2 = 1;
      while (child && child !== this) {
        const bbox = child.getOuterBBox();
        scale2 *= bbox.rscale;
        child = child.parent;
      }
      return scale2;
    }
    getBaseIc() {
      return this.baseCore.getOuterBBox().ic * this.baseScale;
    }
    getAdjustedIc() {
      return this.baseIc ? 1.05 * this.baseIc + 0.05 : 0;
    }
    isCharBase() {
      const base = this.baseCore;
      return (base.node.isKind("mo") && base.size === null || base.node.isKind("mi") || base.node.isKind("mn")) && base.bbox.rscale === 1 && Array.from(base.getText()).length === 1;
    }
    checkLineAccents() {
      if (!this.node.isKind("munderover"))
        return;
      if (this.node.isKind("mover")) {
        this.isLineAbove = this.isLineAccent(this.scriptChild);
      } else if (this.node.isKind("munder")) {
        this.isLineBelow = this.isLineAccent(this.scriptChild);
      } else {
        const mml = this;
        this.isLineAbove = this.isLineAccent(mml.overChild);
        this.isLineBelow = this.isLineAccent(mml.underChild);
      }
    }
    isLineAccent(script2) {
      const node = script2.coreMO().node;
      return node.isToken && node.getText() === "―";
    }
    getBaseWidth() {
      const bbox = this.baseChild.getLineBBox(this.baseChild.breakCount);
      return bbox.w * bbox.rscale - (this.baseRemoveIc ? this.baseIc : 0) + this.font.params.extra_ic;
    }
    getOffset() {
      return [0, 0];
    }
    baseCharZero(n) {
      const largeop2 = !!this.baseCore.node.attributes.get("largeop");
      const sized = !!(this.baseCore.node.isKind("mo") && this.baseCore.size);
      const scale2 = this.baseScale;
      return this.baseIsChar && !largeop2 && !sized && scale2 === 1 ? 0 : n;
    }
    getV() {
      const base = this.baseCore;
      const bbox = base.getLineBBox(base.breakCount);
      const sbox = this.scriptChild.getOuterBBox();
      const tex = this.font.params;
      const subscriptshift = this.length2em(this.node.attributes.get("subscriptshift"), tex.sub1);
      return Math.max(this.baseCharZero(bbox.d * this.baseScale + tex.sub_drop * sbox.rscale), subscriptshift, sbox.h * sbox.rscale - 4 / 5 * tex.x_height);
    }
    getU() {
      const base = this.baseCore;
      const bbox = base.getLineBBox(base.breakCount);
      const sbox = this.scriptChild.getOuterBBox();
      const tex = this.font.params;
      const attr = this.node.attributes.getList("displaystyle", "superscriptshift");
      const prime = this.node.getProperty("texprimestyle");
      const p = prime ? tex.sup3 : attr.displaystyle ? tex.sup1 : tex.sup2;
      const superscriptshift = this.length2em(attr.superscriptshift, p);
      return Math.max(this.baseCharZero(bbox.h * this.baseScale - tex.sup_drop * sbox.rscale), superscriptshift, sbox.d * sbox.rscale + 1 / 4 * tex.x_height);
    }
    hasMovableLimits() {
      const display = this.node.attributes.get("displaystyle");
      const mo = this.baseChild.coreMO().node;
      return !display && !!mo.attributes.get("movablelimits");
    }
    getOverKU(basebox, overbox) {
      const accent = this.node.attributes.get("accent");
      const tex = this.font.params;
      const d = overbox.d * overbox.rscale;
      const t = tex.rule_thickness * tex.separation_factor;
      const delta = this.baseHasAccentOver ? t : 0;
      const T = this.isLineAbove ? 3 * tex.rule_thickness : t;
      const k = (accent ? T : Math.max(tex.big_op_spacing1, tex.big_op_spacing3 - Math.max(0, d))) - delta;
      return [k, basebox.h * basebox.rscale + k + d];
    }
    getUnderKV(basebox, underbox) {
      const accent = this.node.attributes.get("accentunder");
      const tex = this.font.params;
      const h = underbox.h * underbox.rscale;
      const t = tex.rule_thickness * tex.separation_factor;
      const delta = this.baseHasAccentUnder ? t : 0;
      const T = this.isLineBelow ? 3 * tex.rule_thickness : t;
      const k = (accent ? T : Math.max(tex.big_op_spacing2, tex.big_op_spacing4 - h)) - delta;
      return [k, -(basebox.d * basebox.rscale + k + h)];
    }
    getDeltaW(boxes, delta = [0, 0, 0]) {
      const align = this.node.attributes.get("align");
      const widths = boxes.map((box) => box.w * box.rscale);
      widths[0] -= this.baseRemoveIc && !this.baseCore.node.attributes.get("largeop") ? this.baseIc : 0;
      const w = Math.max(...widths);
      const dw = [];
      let m = 0;
      for (const i2 of widths.keys()) {
        dw[i2] = (align === "center" ? (w - widths[i2]) / 2 : align === "right" ? w - widths[i2] : 0) + delta[i2];
        if (dw[i2] < m) {
          m = -dw[i2];
        }
      }
      if (m) {
        for (const i2 of dw.keys()) {
          dw[i2] += m;
        }
      }
      [1, 2].map((i2) => dw[i2] += boxes[i2] ? boxes[i2].dx * boxes[0].rscale : 0);
      return dw;
    }
    getDelta(script2, noskew = false) {
      const accent = this.node.attributes.get("accent");
      let { sk, ic } = this.baseCore.getOuterBBox();
      if (accent) {
        sk -= script2.getOuterBBox().sk;
      }
      return ((accent && !noskew ? sk : 0) + this.font.skewIcFactor * ic) * this.baseScale;
    }
    stretchChildren() {
      const stretchy = [];
      for (const child of this.childNodes) {
        if (child.canStretch(DIRECTION.Horizontal)) {
          stretchy.push(child);
        }
      }
      const count = stretchy.length;
      const nodeCount = this.childNodes.length;
      if (count && nodeCount > 1) {
        let W = 0;
        const all = count > 1 && count === nodeCount;
        for (const child of this.childNodes) {
          const noStretch = child.stretch.dir === DIRECTION.None;
          if (all || noStretch) {
            const { w, rscale } = child.getOuterBBox(noStretch);
            if (w * rscale > W)
              W = w * rscale;
          }
        }
        for (const child of stretchy) {
          const core = child.coreMO();
          if (core.size === null) {
            core.getStretchedVariant([W / child.coreRScale()]);
          }
        }
      }
    }
    constructor(factory, node, parent = null) {
      super(factory, node, parent);
      this.baseScale = 1;
      this.baseIc = 0;
      this.baseRemoveIc = false;
      this.baseIsChar = false;
      this.baseHasAccentOver = null;
      this.baseHasAccentUnder = null;
      this.isLineAbove = false;
      this.isLineBelow = false;
      this.isMathAccent = false;
      const core = this.baseCore = this.getBaseCore();
      if (!core)
        return;
      this.setBaseAccentsFor(core);
      this.baseScale = this.getBaseScale();
      this.baseIc = this.getBaseIc();
      this.baseIsChar = this.isCharBase();
      this.isMathAccent = this.baseIsChar && this.scriptChild && this.scriptChild.coreMO().node.getProperty("mathaccent") !== void 0;
      this.checkLineAccents();
      this.baseRemoveIc = !this.isLineAbove && !this.isLineBelow && (!this.constructor.useIC || this.isMathAccent);
    }
    computeBBox(bbox, recompute = false) {
      bbox.empty();
      bbox.append(this.baseChild.getOuterBBox());
      this.appendScripts(bbox);
      bbox.clean();
      this.setChildPWidths(recompute);
    }
    appendScripts(bbox) {
      const w = this.getBaseWidth();
      const [x2, y] = this.getOffset();
      bbox.combine(this.scriptChild.getOuterBBox(), w + x2, y);
      bbox.w += this.font.params.scriptspace;
      return bbox;
    }
    get breakCount() {
      if (this._breakCount < 0) {
        this._breakCount = this.node.isEmbellished ? this.coreMO().embellishedBreakCount : !this.node.linebreakContainer ? this.childNodes[0].breakCount : 0;
      }
      return this._breakCount;
    }
    breakTop(mrow, child) {
      return this.node.linebreakContainer || !this.parent || this.node.childIndex(child.node) ? mrow : this.parent.breakTop(mrow, this);
    }
    computeLineBBox(i2) {
      const n = this.breakCount;
      if (!n)
        return LineBBox.from(this.getOuterBBox(), this.linebreakOptions.lineleading);
      const bbox = this.baseChild.getLineBBox(i2).copy();
      if (i2 < n) {
        if (i2 === 0) {
          this.addLeftBorders(bbox);
        }
        this.addMiddleBorders(bbox);
      } else {
        this.appendScripts(bbox);
        this.addMiddleBorders(bbox);
        this.addRightBorders(bbox);
      }
      return bbox;
    }
  }, _a2.useIC = true, _a2;
}
var init_scriptbase = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/scriptbase.js"() {
    init_LineBBox();
    init_FontData();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/scriptbase.js
var SvgScriptbase;
var init_scriptbase2 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/scriptbase.js"() {
    init_Wrapper3();
    init_scriptbase();
    SvgScriptbase = (function() {
      var _a2;
      const Base2 = CommonScriptbaseMixin(SvgWrapper);
      return _a2 = class SvgScriptbase extends Base2 {
        toSVG(parents) {
          if (this.toEmbellishedSVG(parents))
            return;
          const svg = this.standardSvgNodes(parents);
          const w = this.getBaseWidth();
          const [x2, v] = this.getOffset();
          this.baseChild.toSVG(svg);
          this.baseChild.place(0, 0);
          this.scriptChild.toSVG([svg[svg.length - 1]]);
          this.scriptChild.place(w + x2, v);
        }
      }, _a2.kind = "scriptbase", _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/msubsup.js
var SvgMsub;
var SvgMsup;
var SvgMsubsup;
var init_msubsup3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/msubsup.js"() {
    init_msubsup2();
    init_scriptbase2();
    init_msubsup();
    SvgMsub = (function() {
      var _a2;
      const Base2 = CommonMsubMixin(SvgScriptbase);
      return _a2 = class SvgMsub extends Base2 {
      }, _a2.kind = MmlMsub.prototype.kind, _a2;
    })();
    SvgMsup = (function() {
      var _a2;
      const Base2 = CommonMsupMixin(SvgScriptbase);
      return _a2 = class SvgMsup extends Base2 {
      }, _a2.kind = MmlMsup.prototype.kind, _a2;
    })();
    SvgMsubsup = (function() {
      var _a2;
      const Base2 = CommonMsubsupMixin(SvgScriptbase);
      return _a2 = class SvgMsubsup extends Base2 {
        toSVG(parents) {
          if (this.toEmbellishedSVG(parents))
            return;
          const svg = this.standardSvgNodes(parents);
          const [base, sup, sub] = [this.baseChild, this.supChild, this.subChild];
          const w = this.getBaseWidth();
          const x2 = this.getAdjustedIc();
          const [u, v] = this.getUVQ();
          base.toSVG(svg);
          const tail = [svg[svg.length - 1]];
          sup.toSVG(tail);
          sub.toSVG(tail);
          base.place(0, 0);
          sub.place(w + (this.baseIsChar ? 0 : x2), v);
          sup.place(w + x2, u);
        }
      }, _a2.kind = MmlMsubsup.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/munderover.js
function CommonMunderMixin(Base2) {
  return class CommonMunderMixin extends Base2 {
    get scriptChild() {
      return this.childNodes[this.node.under];
    }
    constructor(...args) {
      super(...args);
      this.stretchChildren();
    }
    computeBBox(bbox, recompute = false) {
      if (this.hasMovableLimits()) {
        super.computeBBox(bbox, recompute);
        return;
      }
      bbox.empty();
      const basebox = this.baseChild.getOuterBBox();
      const underbox = this.scriptChild.getOuterBBox();
      const v = this.getUnderKV(basebox, underbox)[1];
      const delta = this.isLineBelow ? 0 : this.getDelta(this.scriptChild, true);
      const [bw, uw] = this.getDeltaW([basebox, underbox], [0, -delta]);
      bbox.combine(basebox, bw, 0);
      bbox.combine(underbox, uw, v);
      bbox.d += this.font.params.big_op_spacing5;
      bbox.clean();
      this.setChildPWidths(recompute);
    }
  };
}
function CommonMoverMixin(Base2) {
  return class CommonMoverMixin extends Base2 {
    get scriptChild() {
      return this.childNodes[this.node.over];
    }
    constructor(...args) {
      super(...args);
      this.stretchChildren();
    }
    computeBBox(bbox) {
      if (this.hasMovableLimits()) {
        super.computeBBox(bbox);
        return;
      }
      bbox.empty();
      const basebox = this.baseChild.getOuterBBox();
      const overbox = this.scriptChild.getOuterBBox();
      if (this.node.attributes.get("accent")) {
        basebox.h = Math.max(basebox.h, this.font.params.x_height * this.baseScale);
      }
      const u = this.getOverKU(basebox, overbox)[1];
      const delta = this.isLineAbove ? 0 : this.getDelta(this.scriptChild);
      const [bw, ow] = this.getDeltaW([basebox, overbox], [0, delta]);
      bbox.combine(basebox, bw, 0);
      bbox.combine(overbox, ow, u);
      bbox.h += this.font.params.big_op_spacing5;
      bbox.clean();
    }
  };
}
function CommonMunderoverMixin(Base2) {
  return class CommonMunderoverMixin extends Base2 {
    get underChild() {
      return this.childNodes[this.node.under];
    }
    get overChild() {
      return this.childNodes[this.node.over];
    }
    get subChild() {
      return this.underChild;
    }
    get supChild() {
      return this.overChild;
    }
    constructor(...args) {
      super(...args);
      this.stretchChildren();
    }
    computeBBox(bbox) {
      if (this.hasMovableLimits()) {
        super.computeBBox(bbox);
        return;
      }
      bbox.empty();
      const overbox = this.overChild.getOuterBBox();
      const basebox = this.baseChild.getOuterBBox();
      const underbox = this.underChild.getOuterBBox();
      if (this.node.attributes.get("accent")) {
        basebox.h = Math.max(basebox.h, this.font.params.x_height * this.baseScale);
      }
      const u = this.getOverKU(basebox, overbox)[1];
      const v = this.getUnderKV(basebox, underbox)[1];
      const odelta = this.getDelta(this.overChild);
      const udelta = this.getDelta(this.underChild, true);
      const [bw, uw, ow] = this.getDeltaW([basebox, underbox, overbox], [0, this.isLineBelow ? 0 : -udelta, this.isLineAbove ? 0 : odelta]);
      bbox.combine(basebox, bw, 0);
      bbox.combine(overbox, ow, u);
      bbox.combine(underbox, uw, v);
      const z = this.font.params.big_op_spacing5;
      bbox.h += z;
      bbox.d += z;
      bbox.clean();
    }
  };
}
var init_munderover2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/munderover.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/munderover.js
var SvgMunder;
var SvgMover;
var SvgMunderover;
var init_munderover3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/munderover.js"() {
    init_msubsup3();
    init_munderover2();
    init_munderover();
    SvgMunder = (function() {
      var _a2;
      const Base2 = CommonMunderMixin(SvgMsub);
      return _a2 = class SvgMunder extends Base2 {
        toSVG(parents) {
          if (this.toEmbellishedSVG(parents))
            return;
          if (this.hasMovableLimits()) {
            super.toSVG(parents);
            return;
          }
          const svg = this.standardSvgNodes(parents);
          const [base, script2] = [this.baseChild, this.scriptChild];
          const [bbox, sbox] = [base.getOuterBBox(), script2.getOuterBBox()];
          base.toSVG(svg);
          script2.toSVG(svg);
          const delta = this.isLineBelow ? 0 : this.getDelta(this.scriptChild, true);
          const v = this.getUnderKV(bbox, sbox)[1];
          const [bx, sx] = this.getDeltaW([bbox, sbox], [0, -delta]);
          base.place(bx, 0);
          script2.place(sx, v);
        }
      }, _a2.kind = MmlMunder.prototype.kind, _a2;
    })();
    SvgMover = (function() {
      var _a2;
      const Base2 = CommonMoverMixin(SvgMsup);
      return _a2 = class SvgMover extends Base2 {
        toSVG(parents) {
          if (this.toEmbellishedSVG(parents))
            return;
          if (this.hasMovableLimits()) {
            super.toSVG(parents);
            return;
          }
          const svg = this.standardSvgNodes(parents);
          const [base, script2] = [this.baseChild, this.scriptChild];
          const [bbox, sbox] = [base.getOuterBBox(), script2.getOuterBBox()];
          base.toSVG(svg);
          script2.toSVG(svg);
          const delta = this.isLineAbove ? 0 : this.getDelta(this.scriptChild);
          const u = this.getOverKU(bbox, sbox)[1];
          const [bx, sx] = this.getDeltaW([bbox, sbox], [0, delta]);
          base.place(bx, 0);
          script2.place(sx, u);
        }
      }, _a2.kind = MmlMover.prototype.kind, _a2;
    })();
    SvgMunderover = (function() {
      var _a2;
      const Base2 = CommonMunderoverMixin(SvgMsubsup);
      return _a2 = class SvgMunderover extends Base2 {
        toSVG(parents) {
          if (this.toEmbellishedSVG(parents))
            return;
          if (this.hasMovableLimits()) {
            super.toSVG(parents);
            return;
          }
          const svg = this.standardSvgNodes(parents);
          const [base, over, under] = [
            this.baseChild,
            this.overChild,
            this.underChild
          ];
          const [bbox, obox, ubox] = [
            base.getOuterBBox(),
            over.getOuterBBox(),
            under.getOuterBBox()
          ];
          base.toSVG(svg);
          under.toSVG(svg);
          over.toSVG(svg);
          const odelta = this.getDelta(this.overChild);
          const udelta = this.getDelta(this.underChild, true);
          const u = this.getOverKU(bbox, obox)[1];
          const v = this.getUnderKV(bbox, ubox)[1];
          const [bx, ux, ox] = this.getDeltaW([bbox, ubox, obox], [0, this.isLineBelow ? 0 : -udelta, this.isLineAbove ? 0 : odelta]);
          base.place(bx, 0);
          under.place(ux, v);
          over.place(ox, u);
        }
      }, _a2.kind = MmlMunderover.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mmultiscripts.js
function CommonMmultiscriptsMixin(Base2) {
  return class CommonMmultiscriptsMixin extends Base2 {
    combinePrePost(pre, post) {
      const bbox = new BBox(pre);
      bbox.combine(post, 0, 0);
      return bbox;
    }
    getScriptData() {
      const data = this.scriptData = {
        base: null,
        sub: BBox.empty(),
        sup: BBox.empty(),
        psub: BBox.empty(),
        psup: BBox.empty(),
        numPrescripts: 0,
        numScripts: 0
      };
      const lists = this.getScriptBBoxLists();
      this.combineBBoxLists(data.sub, data.sup, lists.subList, lists.supList);
      this.combineBBoxLists(data.psub, data.psup, lists.psubList, lists.psupList);
      data.base = lists.base[0];
      data.numPrescripts = lists.psubList.length;
      data.numScripts = lists.subList.length;
    }
    getScriptBBoxLists() {
      const lists = {
        base: [],
        subList: [],
        supList: [],
        psubList: [],
        psupList: []
      };
      let script2 = "base";
      for (const child of this.childNodes) {
        if (child.node.isKind("mprescripts")) {
          script2 = "psubList";
        } else {
          lists[script2].push(child.getOuterBBox());
          script2 = NextScript[script2];
        }
      }
      this.firstPrescript = lists.subList.length + lists.supList.length + 2;
      this.padLists(lists.subList, lists.supList);
      this.padLists(lists.psubList, lists.psupList);
      return lists;
    }
    padLists(list1, list22) {
      if (list1.length > list22.length) {
        list22.push(BBox.empty());
      }
    }
    combineBBoxLists(bbox1, bbox2, list1, list22) {
      for (let i2 = 0; i2 < list1.length; i2++) {
        const [w1, h1, d1] = this.getScaledWHD(list1[i2]);
        const [w2, h2, d2] = this.getScaledWHD(list22[i2]);
        const w = Math.max(w1, w2);
        bbox1.w += w;
        bbox2.w += w;
        if (h1 > bbox1.h)
          bbox1.h = h1;
        if (d1 > bbox1.d)
          bbox1.d = d1;
        if (h2 > bbox2.h)
          bbox2.h = h2;
        if (d2 > bbox2.d)
          bbox2.d = d2;
      }
    }
    getScaledWHD(bbox) {
      const { w, h, d, rscale } = bbox;
      return [w * rscale, h * rscale, d * rscale];
    }
    getCombinedUV() {
      const data = this.scriptData;
      const sub = this.combinePrePost(data.sub, data.psub);
      const sup = this.combinePrePost(data.sup, data.psup);
      return this.getUVQ(sub, sup);
    }
    addPrescripts(bbox, u, v) {
      const data = this.scriptData;
      if (data.numPrescripts) {
        const scriptspace = this.font.params.scriptspace;
        bbox.combine(data.psup, scriptspace, u);
        bbox.combine(data.psub, scriptspace, v);
      }
      return bbox;
    }
    addPostscripts(bbox, u, v) {
      const data = this.scriptData;
      if (data.numScripts) {
        const x2 = bbox.w;
        bbox.combine(data.sup, x2, u);
        bbox.combine(data.sub, x2, v);
        bbox.w += this.font.params.scriptspace;
      }
      return bbox;
    }
    constructor(...args) {
      super(...args);
      this.scriptData = null;
      this.firstPrescript = 0;
      this.getScriptData();
    }
    appendScripts(bbox) {
      bbox.empty();
      const [u, v] = this.getCombinedUV();
      this.addPrescripts(bbox, u, v);
      bbox.append(this.scriptData.base);
      this.addPostscripts(bbox, u, v);
      bbox.clean();
      return bbox;
    }
    computeLineBBox(i2) {
      const n = this.baseChild.breakCount;
      const cbox = this.baseChild.getLineBBox(i2).copy();
      let bbox = cbox;
      const [u, v] = this.getCombinedUV();
      if (i2 === 0) {
        bbox = LineBBox.from(this.addPrescripts(BBox.zero(), u, v), this.linebreakOptions.lineleading);
        bbox.append(cbox);
        this.addLeftBorders(bbox);
        bbox.L = this.bbox.L;
      } else if (i2 === n) {
        bbox = this.addPostscripts(bbox, u, v);
        this.addRightBorders(bbox);
        bbox.R = this.bbox.R;
      }
      this.addMiddleBorders(bbox);
      return bbox;
    }
    getUVQ(subbox, supbox) {
      if (!this.UVQ) {
        let [u, v, q] = [0, 0, 0];
        if (subbox.w === 0) {
          u = this.getU();
        } else if (supbox.w === 0) {
          u = -this.getV();
        } else {
          [u, v, q] = super.getUVQ(subbox, supbox);
        }
        this.UVQ = [u, v, q];
      }
      return this.UVQ;
    }
  };
}
var NextScript;
var init_mmultiscripts2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mmultiscripts.js"() {
    init_BBox();
    init_LineBBox();
    NextScript = {
      base: "subList",
      subList: "supList",
      supList: "subList",
      psubList: "psupList",
      psupList: "psubList"
    };
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mmultiscripts.js
function AlignX(align) {
  return {
    left: (_w, _W) => 0,
    center: (w, W) => (W - w) / 2,
    right: (w, W) => W - w
  }[align] || ((_w, _W) => 0);
}
var SvgMmultiscripts;
var init_mmultiscripts3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mmultiscripts.js"() {
    init_mmultiscripts2();
    init_msubsup3();
    init_mmultiscripts();
    init_string();
    SvgMmultiscripts = (function() {
      var _a2;
      const Base2 = CommonMmultiscriptsMixin(SvgMsubsup);
      return _a2 = class SvgMmultiscripts extends Base2 {
        toSVG(parents) {
          if (this.toEmbellishedSVG(parents))
            return;
          const svg = this.standardSvgNodes(parents);
          const data = this.scriptData;
          const scriptalign = this.node.getProperty("scriptalign") || "right left";
          const [preAlign, postAlign] = split(scriptalign + " " + scriptalign);
          const [u, v] = this.getCombinedUV();
          let x2 = 0;
          if (data.numPrescripts) {
            x2 = this.addScripts(this.dom[0], this.font.params.scriptspace, u, v, this.firstPrescript, data.numPrescripts, preAlign);
          }
          const base = this.baseChild;
          base.toSVG(svg);
          base.place(x2, 0);
          if (this.breakCount)
            x2 = 0;
          x2 += base.getLineBBox(base.breakCount).w;
          if (data.numScripts) {
            this.addScripts(this.dom[this.dom.length - 1], x2, u, v, 1, data.numScripts, postAlign);
          }
        }
        addScripts(svg, x2, u, v, i2, n, align) {
          const adaptor = this.adaptor;
          const alignX = AlignX(align);
          const supRow = adaptor.append(svg, this.svg("g"));
          const subRow = adaptor.append(svg, this.svg("g"));
          this.place(x2, u, supRow);
          this.place(x2, v, subRow);
          const m = i2 + 2 * n;
          let dx = 0;
          while (i2 < m) {
            const [sub, sup] = [this.childNodes[i2++], this.childNodes[i2++]];
            const [subbox, supbox] = [sub.getOuterBBox(), sup.getOuterBBox()];
            const [subr, supr] = [subbox.rscale, supbox.rscale];
            const w = Math.max(subbox.w * subr, supbox.w * supr);
            sub.toSVG([subRow]);
            sup.toSVG([supRow]);
            sub.place(dx + alignX(subbox.w * subr, w), 0);
            sup.place(dx + alignX(supbox.w * supr, w), 0);
            dx += w;
          }
          return x2 + dx;
        }
      }, _a2.kind = MmlMmultiscripts.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/util/numeric.js
function sum(A) {
  return A.reduce((a, b) => a + b, 0);
}
function max(A) {
  return A.reduce((a, b) => Math.max(a, b), 0);
}
var init_numeric = __esm({
  "node_modules/@mathjax/src/mjs/util/numeric.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mtable.js
function CommonMtableMixin(Base2) {
  return class CommonMtableMixin extends Base2 {
    get tableRows() {
      return this.childNodes;
    }
    findContainer() {
      let node = this;
      let parent = node.parent;
      while (parent && (parent.node.notParent || parent.node.isKind("mrow"))) {
        node = parent;
        parent = parent.parent;
      }
      this.container = parent;
      this.containerI = node.node.childPosition();
    }
    getPercentageWidth() {
      if (this.hasLabels) {
        this.bbox.pwidth = BBox.fullWidth;
      } else {
        const width = this.node.attributes.get("width");
        if (isPercent(width)) {
          this.bbox.pwidth = width;
        }
      }
    }
    stretchRows() {
      const equal = this.node.attributes.get("equalrows");
      const HD = equal ? this.getEqualRowHeight() : 0;
      const { H: H2, D } = equal ? this.getTableData() : { H: [0], D: [0] };
      const rows = this.tableRows;
      for (let i2 = 0; i2 < this.numRows; i2++) {
        const hd = equal ? [(HD + H2[i2] - D[i2]) / 2, (HD - H2[i2] + D[i2]) / 2] : null;
        rows[i2].stretchChildren(hd);
      }
    }
    stretchColumns() {
      const swidths = this.getColumnAttributes("columnwidth", 0);
      for (let i2 = 0; i2 < this.numCols; i2++) {
        const width = typeof this.cWidths[i2] === "number" ? this.cWidths[i2] : null;
        this.stretchColumn(i2, width);
        if (width !== null) {
          this.breakColumn(i2, width, swidths[i2]);
        }
      }
    }
    stretchColumn(i2, W) {
      const stretchy = [];
      for (const row of this.tableRows) {
        const cell = row.getChild(i2);
        if (cell) {
          const child = cell.childNodes[0];
          if (child.stretch.dir === DIRECTION.None && child.canStretch(DIRECTION.Horizontal)) {
            stretchy.push(child);
          }
        }
      }
      const count = stretchy.length;
      if (count && W === null) {
        W = 0;
        const all = count === this.childNodes.length;
        for (const row of this.tableRows) {
          const cell = row.getChild(i2);
          if (cell) {
            const child = cell.childNodes[0];
            const noStretch = child.stretch.dir === DIRECTION.None;
            if (all || noStretch) {
              const { w } = child.getBBox(noStretch);
              if (w > W) {
                W = w;
              }
            }
          }
        }
      }
      if (W !== null) {
        const TW = this.getTableData().W;
        for (const child of stretchy) {
          let w = child.getBBox().w;
          child.coreMO().getStretchedVariant([Math.max(W, w) / child.coreRScale()]);
          w = child.getBBox().w;
          if (w > TW[i2]) {
            TW[i2] = w;
          }
        }
      }
    }
    breakColumn(i2, W, type) {
      if (this.jax.math.root.attributes.get("overflow") !== "linebreak" || !this.jax.math.display) {
        return;
      }
      const { H: H2, D } = this.getTableData();
      let j = 0;
      let w = 0;
      for (const row of this.tableRows) {
        const cell = row.getChild(i2);
        if (cell) {
          const r = row.getBBox().rscale;
          const bbox2 = cell.getBBox();
          if (cell && bbox2.w * r > W) {
            cell.childNodes[0].breakToWidth(W);
            const align = row.node.attributes.get("rowalign");
            this.updateHDW(cell, i2, j, align, H2, D);
          }
          if (bbox2.w * r > w) {
            w = bbox2.w * r;
          }
        }
        const bbox = row.getBBox();
        bbox.h = H2[j];
        bbox.d = D[j];
        j++;
      }
      if (type === "fit" || type === "auto" || isPercent(type) || w > this.cWidths[i2]) {
        this.cWidths[i2] = w;
      }
    }
    getTableData() {
      if (this.data) {
        return this.data;
      }
      const H2 = new Array(this.numRows).fill(0);
      const D = new Array(this.numRows).fill(0);
      const W = new Array(this.numCols).fill(0);
      const NH = new Array(this.numRows);
      const ND = new Array(this.numRows);
      const LW = [0];
      const rows = this.tableRows;
      for (let j = 0; j < rows.length; j++) {
        const row = rows[j];
        const align = row.node.attributes.get("rowalign");
        for (let i2 = 0; i2 < row.numCells; i2++) {
          const cell = row.getChild(i2);
          this.updateHDW(cell, i2, j, align, H2, D, W);
          this.recordPWidthCell(cell, i2);
        }
        NH[j] = H2[j];
        ND[j] = D[j];
        if (row.labeled) {
          this.updateHDW(row.childNodes[0], 0, j, align, H2, D, LW);
        }
        row.bbox.h = H2[j];
        row.bbox.d = D[j];
      }
      const L = LW[0];
      this.data = { H: H2, D, W, NH, ND, L };
      return this.data;
    }
    updateHDW(cell, i2, j, align, H2, D, W = null) {
      let { h, d, w } = cell.getBBox();
      const scale2 = cell.parent.bbox.rscale;
      if (cell.parent.bbox.rscale !== 1) {
        h *= scale2;
        d *= scale2;
        w *= scale2;
      }
      if (this.node.getProperty("useHeight")) {
        if (h < 0.75)
          h = 0.75;
        if (d < 0.25)
          d = 0.25;
      }
      align = cell.node.attributes.get("rowalign") || align;
      if (!Object.hasOwn(this.adjustHD, align)) {
        align = "other";
      }
      this.adjustHD[align](h, d, H2, D, j);
      if (W && w > W[i2])
        W[i2] = w;
    }
    recordPWidthCell(cell, i2) {
      if (cell.childNodes[0] && cell.childNodes[0].getBBox().pwidth) {
        this.pwidthCells.push([cell, i2]);
      }
    }
    setColumnPWidths() {
      const W = this.cWidths;
      for (const [cell, i2] of this.pwidthCells) {
        if (cell.setChildPWidths(false, W[i2])) {
          cell.invalidateBBox();
          cell.getBBox();
        }
      }
    }
    getBBoxHD(height2) {
      const [align, row] = this.getAlignmentRow();
      if (row === null) {
        const a = this.font.params.axis_height;
        const h2 = height2 / 2;
        const HD = {
          top: [0, height2],
          center: [h2, h2],
          bottom: [height2, 0],
          baseline: [h2, h2],
          axis: [h2 + a, h2 - a]
        };
        return HD[align] || [h2, h2];
      } else {
        const y = this.getVerticalPosition(row, align);
        return [y, height2 - y];
      }
    }
    getBBoxLR() {
      var _a2;
      if (this.hasLabels) {
        const attributes = this.node.attributes;
        const side = attributes.get("side");
        let [pad2, align] = this.getPadAlignShift(side);
        const labels = this.hasLabels && !!attributes.get("data-width-includes-label");
        if (labels && this.frame && this.fSpace[0]) {
          pad2 -= this.fSpace[0];
        }
        return align === "center" && !labels ? [pad2, pad2] : side === "left" ? [pad2, 0] : [0, pad2];
      }
      return [((_a2 = this.bbox) === null || _a2 === void 0 ? void 0 : _a2.L) || 0, 0];
    }
    getPadAlignShift(side) {
      const { L } = this.getTableData();
      const sep = this.length2em(this.node.attributes.get("minlabelspacing"));
      let pad2 = L + sep;
      const [lpad, rpad] = this.styles == null ? ["", ""] : [this.styles.get("padding-left"), this.styles.get("padding-right")];
      if (lpad || rpad) {
        pad2 = Math.max(pad2, this.length2em(lpad || "0"), this.length2em(rpad || "0"));
      }
      let [align, shift] = this.getAlignShift();
      if (align === side) {
        shift = side === "left" ? Math.max(pad2, shift) - pad2 : Math.min(-pad2, shift) + pad2;
      }
      return [pad2, align, shift];
    }
    getWidth() {
      return this.pWidth || this.getBBox().w;
    }
    adjustWideTable() {
      const attributes = this.node.attributes;
      if (attributes.get("width") !== "auto")
        return;
      const [pad2, align] = this.getPadAlignShift(attributes.get("side"));
      const W = Math.max(this.containerWidth / 10, this.containerWidth - pad2 - (align === "center" ? pad2 : 0));
      if (this.naturalWidth() > W) {
        this.adjustColumnWidths(W);
      }
    }
    naturalWidth() {
      const CW = this.getComputedWidths();
      return sum(CW.concat(this.cLines, this.cSpace)) + 2 * this.fLine + this.fSpace[0] + this.fSpace[2];
    }
    getEqualRowHeight() {
      const { H: H2, D } = this.getTableData();
      const HD = Array.from(H2.keys()).map((i2) => H2[i2] + D[i2]);
      return Math.max(...HD);
    }
    getComputedWidths() {
      const W = this.getTableData().W;
      let CW = Array.from(W.keys()).map((i2) => {
        return typeof this.cWidths[i2] === "number" ? this.cWidths[i2] : W[i2];
      });
      if (this.node.attributes.get("equalcolumns")) {
        CW = Array(CW.length).fill(max(CW));
      }
      return CW;
    }
    getColumnWidths() {
      const width = this.node.attributes.get("width");
      if (this.node.attributes.get("equalcolumns")) {
        return this.getEqualColumns(width);
      }
      const swidths = this.getColumnAttributes("columnwidth", 0);
      if (width === "auto") {
        return this.getColumnWidthsAuto(swidths);
      }
      if (isPercent(width)) {
        return this.getColumnWidthsPercent(swidths);
      }
      return this.getColumnWidthsFixed(swidths, this.length2em(width));
    }
    getEqualColumns(width) {
      const n = Math.max(1, this.numCols);
      let cwidth;
      if (width === "auto") {
        const { W } = this.getTableData();
        cwidth = max(W);
      } else if (isPercent(width)) {
        cwidth = this.percent(1 / n);
      } else {
        const w = sum([].concat(this.cLines, this.cSpace)) + this.fSpace[0] + this.fSpace[2];
        cwidth = Math.max(0, this.length2em(width) - w) / n;
      }
      return Array(this.numCols).fill(cwidth);
    }
    getColumnWidthsAuto(swidths) {
      return swidths.map((x2) => {
        if (x2 === "auto" || x2 === "fit")
          return null;
        if (isPercent(x2))
          return x2;
        return this.length2em(x2);
      });
    }
    getColumnWidthsPercent(swidths) {
      const hasFit = swidths.includes("fit");
      const { W } = hasFit ? this.getTableData() : { W: null };
      return Array.from(swidths.keys()).map((i2) => {
        const x2 = swidths[i2];
        if (x2 === "fit")
          return null;
        if (x2 === "auto")
          return hasFit ? W[i2] : null;
        if (isPercent(x2))
          return x2;
        return this.length2em(x2);
      });
    }
    getColumnWidthsFixed(swidths, width) {
      const indices = Array.from(swidths.keys());
      const fit = indices.filter((i2) => swidths[i2] === "fit");
      const auto = indices.filter((i2) => swidths[i2] === "auto");
      const n = fit.length || auto.length;
      const { W } = n ? this.getTableData() : { W: null };
      const cwidth = width - sum([].concat(this.cLines, this.cSpace)) - this.fSpace[0] - this.fSpace[2];
      let dw = cwidth;
      indices.forEach((i2) => {
        const x2 = swidths[i2];
        dw -= x2 === "fit" || x2 === "auto" ? W[i2] : this.length2em(x2, cwidth);
      });
      const fw = n && dw > 0 ? dw / n : 0;
      return indices.map((i2) => {
        const x2 = swidths[i2];
        if (x2 === "fit")
          return W[i2] + fw;
        if (x2 === "auto")
          return W[i2] + (fit.length === 0 ? fw : 0);
        return this.length2em(x2, cwidth);
      });
    }
    adjustColumnWidths(width) {
      const { W } = this.getTableData();
      const swidths = this.getColumnAttributes("columnwidth", 0);
      const indices = Array.from(swidths.keys());
      const fit = indices.filter((i2) => swidths[i2] === "fit").sort((a, b) => W[b] - W[a]);
      const auto = indices.filter((i2) => swidths[i2] === "auto").sort((a, b) => W[b] - W[a]);
      const percent2 = indices.filter((i2) => isPercent(swidths[i2])).sort((a, b) => W[b] - W[a]);
      const fixed = indices.filter((i2) => swidths[i2] !== "fit" && swidths[i2] !== "auto" && !isPercent(swidths[i2])).sort((a, b) => W[b] - W[a]);
      const columns = [...fit, ...auto, ...percent2, ...fixed];
      if (!columns.length)
        return;
      this.cWidths = indices.map((i2) => typeof this.cWidths[i2] === "number" ? this.cWidths[i2] : W[i2]);
      const cwidth = width - sum([].concat(this.cLines, this.cSpace)) - this.fSpace[0] - this.fSpace[2];
      let dw = sum(this.cWidths) - cwidth;
      let w = 0;
      let n = 0;
      while (n < columns.length) {
        w += W[columns[n++]];
        if (w && dw / w < (__kittexLate.BREAK_BELOW?.()))
          break;
      }
      dw = 1 - dw / w;
      columns.slice(0, n).forEach((i2) => this.cWidths[i2] *= dw);
    }
    getVerticalPosition(i2, align) {
      const equal = this.node.attributes.get("equalrows");
      const { H: H2, D } = this.getTableData();
      const HD = equal ? this.getEqualRowHeight() : 0;
      const space = this.getRowHalfSpacing();
      let y = this.fLine;
      for (let j = 0; j < i2; j++) {
        y += space[j] + (equal ? HD : H2[j] + D[j]) + space[j + 1] + this.rLines[j];
      }
      const [h, d] = equal ? [(HD + H2[i2] - D[i2]) / 2, (HD - H2[i2] + D[i2]) / 2] : [H2[i2], D[i2]];
      const offset = {
        top: 0,
        center: space[i2] + (h + d) / 2,
        bottom: space[i2] + h + d + space[i2 + 1],
        baseline: space[i2] + h,
        axis: space[i2] + h - 0.25
      };
      y += offset[align] || 0;
      return y;
    }
    getFrameSpacing() {
      const fspace = this.fframe ? this.convertLengths(this.getAttributeArray("framespacing")) : [0, 0];
      fspace[2] = fspace[0];
      const padding2 = this.node.attributes.get("data-array-padding");
      if (padding2) {
        const [L, R] = this.convertLengths(split(padding2));
        fspace[0] = L;
        fspace[2] = R;
      }
      return fspace;
    }
    getEmHalfSpacing(fspace, space, scale2 = 1) {
      const spaceEm = this.addEm(space, 2 / scale2);
      spaceEm.unshift(this.em(fspace[0] * scale2));
      spaceEm.push(this.em(fspace[1] * scale2));
      return spaceEm;
    }
    getRowHalfSpacing() {
      const space = this.rSpace.map((x2) => x2 / 2);
      space.unshift(this.fSpace[1]);
      space.push(this.fSpace[1]);
      return space;
    }
    getColumnHalfSpacing() {
      const space = this.cSpace.map((x2) => x2 / 2);
      space.unshift(this.fSpace[0]);
      space.push(this.fSpace[2]);
      return space;
    }
    getAlignmentRow() {
      const [align, row] = split(this.node.attributes.get("align"));
      if (row == null)
        return [align, null];
      let i2 = parseInt(row);
      if (i2 < 0)
        i2 += this.numRows + 1;
      return [align, i2 < 1 || i2 > this.numRows ? null : i2 - 1];
    }
    getColumnAttributes(name, i2 = 1) {
      const n = this.numCols - i2;
      const columns = this.getAttributeArray(name);
      if (columns.length === 0)
        return null;
      while (columns.length < n) {
        columns.push(columns[columns.length - 1]);
      }
      if (columns.length > n) {
        columns.splice(n);
      }
      return columns;
    }
    getRowAttributes(name, i2 = 1) {
      const n = this.numRows - i2;
      const rows = this.getAttributeArray(name);
      if (rows.length === 0)
        return null;
      while (rows.length < n) {
        rows.push(rows[rows.length - 1]);
      }
      if (rows.length > n) {
        rows.splice(n);
      }
      return rows;
    }
    getAttributeArray(name) {
      const value = this.node.attributes.get(name);
      if (!value)
        return [this.node.attributes.getDefault(name)];
      return split(value);
    }
    addEm(list3, n = 1) {
      if (!list3)
        return null;
      return list3.map((x2) => this.em(x2 / n));
    }
    convertLengths(list3) {
      if (!list3)
        return null;
      return list3.map((x2) => this.length2em(x2));
    }
    constructor(factory, node, parent = null) {
      super(factory, node, parent);
      this.numCols = 0;
      this.numRows = 0;
      this.data = null;
      this.pwidthCells = [];
      this.pWidth = 0;
      this.adjustHD = {
        top: (h, d, H2, D, j) => {
          if (h > H2[j]) {
            D[j] -= h - H2[j];
            H2[j] = h;
          }
          if (h + d > H2[j] + D[j]) {
            D[j] = h + d - H2[j];
          }
        },
        bottom: (h, d, H2, D, j) => {
          if (d > D[j]) {
            H2[j] -= d - D[j];
            D[j] = d;
          }
          if (h + d > H2[j] + D[j]) {
            H2[j] = h + d - D[j];
          }
        },
        center: (h, d, H2, D, j) => {
          if (h + d > H2[j] + D[j]) {
            H2[j] = D[j] = (h + d) / 2;
          }
        },
        other: (h, d, H2, D, j) => {
          if (h > H2[j]) {
            H2[j] = h;
          }
          if (d > D[j]) {
            D[j] = d;
          }
        }
      };
      this.numCols = max(this.tableRows.map((row) => row.numCells));
      this.numRows = this.childNodes.length;
      this.hasLabels = this.childNodes.reduce((value, row) => value || row.node.isKind("mlabeledtr"), false);
      this.findContainer();
      this.isTop = !this.container || this.container.node.isKind("math") && !this.container.parent;
      if (this.isTop) {
        this.jax.table = this;
      }
      this.getPercentageWidth();
      const attributes = this.node.attributes;
      const frame2 = attributes.get("frame");
      this.frame = frame2 !== "none";
      this.fframe = this.frame || attributes.get("data-frame-styles") !== void 0;
      this.fLine = this.frame ? 0.07 : 0;
      this.fSpace = this.getFrameSpacing();
      this.cSpace = this.convertLengths(this.getColumnAttributes("columnspacing"));
      this.rSpace = this.convertLengths(this.getRowAttributes("rowspacing"));
      this.cLines = this.getColumnAttributes("columnlines").map((x2) => x2 === "none" ? 0 : 0.07);
      this.rLines = this.getRowAttributes("rowlines").map((x2) => x2 === "none" ? 0 : 0.07);
      this.cWidths = this.getColumnWidths();
      this.adjustWideTable();
      this.stretchColumns();
      this.stretchRows();
    }
    getStyles() {
      super.getStyles();
      const frame2 = this.node.attributes.get("data-frame-styles");
      if (!frame2)
        return;
      if (!this.styles) {
        this.styles = new Styles("");
      }
      const fstyles = frame2.split(/ /);
      for (const i2 of TRBL.keys()) {
        const style = fstyles[i2];
        if (style === "none")
          continue;
        this.styles.set(`border-${TRBL[i2]}`, `.07em ${style}`);
      }
    }
    computeBBox(bbox, _recompute = false) {
      const { H: H2, D } = this.getTableData();
      let height2, width;
      if (this.node.attributes.get("equalrows")) {
        const HD = this.getEqualRowHeight();
        height2 = sum([].concat(this.rLines, this.rSpace)) + HD * this.numRows;
      } else {
        height2 = sum(H2.concat(D, this.rLines, this.rSpace));
      }
      height2 += 2 * (this.fLine + this.fSpace[1]);
      width = this.naturalWidth();
      const w = this.node.attributes.get("width");
      if (w !== "auto") {
        width = Math.max(this.length2em(w, 0) + 2 * this.fLine, width);
      }
      const [h, d] = this.getBBoxHD(height2);
      bbox.h = h;
      bbox.d = d;
      bbox.w = width;
      const [L, R] = this.getBBoxLR();
      bbox.L = L;
      bbox.R = R;
      if (!isPercent(w)) {
        this.setColumnPWidths();
      }
    }
    setChildPWidths(_recompute, cwidth, _clear) {
      const width = this.node.attributes.get("width");
      if (!isPercent(width))
        return false;
      if (!this.hasLabels) {
        this.bbox.pwidth = "";
        this.container.bbox.pwidth = "";
      }
      const { w, L, R } = this.bbox;
      const labelInWidth = this.node.attributes.get("data-width-includes-label");
      const W = Math.max(w, this.length2em(width, Math.max(cwidth, L + w + R))) - (labelInWidth ? L + R : 0);
      const cols = this.node.attributes.get("equalcolumns") ? Array(this.numCols).fill(this.percent(1 / Math.max(1, this.numCols))) : this.getColumnAttributes("columnwidth", 0);
      this.cWidths = this.getColumnWidthsFixed(cols, W);
      this.pWidth = this.naturalWidth();
      if (this.isTop) {
        this.bbox.w = this.pWidth;
      }
      this.setColumnPWidths();
      if (this.pWidth !== w) {
        this.parent.invalidateBBox();
      }
      return this.pWidth !== w;
    }
    getAlignShift() {
      return this.isTop ? super.getAlignShift() : [this.container.getChildAlign(this.containerI), 0];
    }
  };
}
export{init_numeric,CommonMtableMixin,init_mfrac3,init_msqrt3,init_mroot3,init_mfenced3,init_msubsup3,init_munderover3,init_mmultiscripts3,SvgMfrac,SvgMsqrt,SvgMroot,SvgMfenced,SvgMsub,SvgMsup,SvgMsubsup,SvgMunder,SvgMover,SvgMunderover,SvgMmultiscripts};
