import{__esm,init_Wrapper3,init_math,init_BBox,SvgWrapper,BBox,MmlMath,DIRECTION,LineBBox,init_LineBBox,init_FontData,init_mrow,MmlMrow,MmlInferredMrow,init_mi,MmlMi,FontData,mergeOptions,TEXCLASS,NOSTRETCH,unicodeChars,init_MmlNode,init_string,init_mo,VFUZZ,HFUZZ,MmlMo,init_mn,MmlMn,init_ms,MmlMs,init_mtext,MmlMtext,init_merror,MmlMerror,init_mspace,MmlMspace,init_mpadded,MmlMpadded,init_mphantom,MmlMphantom}from'./p19.js';export*from'./p19.js';
// node_modules/@mathjax/src/mjs/output/common/Wrappers/math.js
function CommonMathMixin(Base2) {
  return class CommonMathMixin extends Base2 {
    getWrapWidth(_i) {
      return this.parent ? this.getBBox().w : this.metrics.containerWidth / this.jax.pxPerEm;
    }
    computeBBox(bbox, recompute = false) {
      super.computeBBox(bbox, recompute);
      const attributes = this.node.attributes;
      if (!this.parent && this.jax.math.display && attributes.get("overflow") === "linebreak") {
        const W = this.containerWidth;
        if (bbox.w > W) {
          this.childNodes[0].breakToWidth(W);
        }
        bbox.updateFrom(this.childNodes[0].getBBox());
      }
    }
  };
}
var init_math2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/math.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/zero.js
var ZeroFontDataUrl;
var init_zero = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/zero.js"() {
    ZeroFontDataUrl = [
      "url(data:application/x-font-woff;charset=utf-8;base64,",
      "T1RUTwAJAIAAAwAQQ0ZGIGnFMZkAAARQAAAAlE9TLzJpUWOBAAABAAAAAGBjbWFwAAwAUwAABAQAAAAs",
      "aGVhZCFRvpAAAACcAAAANmhoZWEC8AD9AAAA1AAAACRobXR4A+gAAAAABOQAAAAIbWF4cAACUAAAAAD4",
      "AAAABm5hbWVNb8+2AAABYAAAAqNwb3N0AAMAAAAABDAAAAAgAAEAAAABAABVWOu4Xw889QADA+gAAAAA",
      "3ym+2AAAAADfKb7YAAAAAAPoAAAAAAADAAIAAAAAAAAAAQAAAu79EgAAA+gAAAAAAAAAAQAAAAAAAAAA",
      "AAAAAAAAAAIAAFAAAAIAAAADA+gB9AAFAAACigK7AAAAjAKKArsAAAHfADEBAgAAAAAAAAAAAAAAAAAA",
      "AAEAAAAAAAAAAAAAAABYWFhYAEAAIAAgAu79EgAAAu4C7gAAAAEAAAAAAXcAAAAgACAAAAAAACIBngAB",
      "AAAAAAAAAAEAQQABAAAAAAABAAsAAAABAAAAAAACAAcAIQABAAAAAAADABUAxgABAAAAAAAEABMANgAB",
      "AAAAAAAFAAsApQABAAAAAAAGABIAbwABAAAAAAAHAAEAQQABAAAAAAAIAAEAQQABAAAAAAAJAAEAQQAB",
      "AAAAAAAKAAEAQQABAAAAAAALAAEAQQABAAAAAAAMAAEAQQABAAAAAAANAAEAQQABAAAAAAAOAAEAQQAB",
      "AAAAAAAQAAsAAAABAAAAAAARAAcAIQADAAEECQAAAAIAXwADAAEECQABABYACwADAAEECQACAA4AKAAD",
      "AAEECQADACoA2wADAAEECQAEACYASQADAAEECQAFABYAsAADAAEECQAGACQAgQADAAEECQAHAAIAXwAD",
      "AAEECQAIAAIAXwADAAEECQAJAAIAXwADAAEECQAKAAIAXwADAAEECQALAAIAXwADAAEECQAMAAIAXwAD",
      "AAEECQANAAIAXwADAAEECQAOAAIAXwADAAEECQAQABYACwADAAEECQARAA4AKG1qeC1sbS16ZXJvAG0A",
      "agB4AC0AbABtAC0AegBlAHIAb1JlZ3VsYXIAUgBlAGcAdQBsAGEAcm1qeC1sbS16ZXJvIFJlZ3VsYXIA",
      "bQBqAHgALQBsAG0ALQB6AGUAcgBvACAAUgBlAGcAdQBsAGEAcm1qeC1sbS16ZXJvUmVndWxhcgBtAGoA",
      "eAAtAGwAbQAtAHoAZQByAG8AUgBlAGcAdQBsAGEAclZlcnNpb24gMC4xAFYAZQByAHMAaQBvAG4AIAAw",
      "AC4AMSA6bWp4LWxtLXplcm8gUmVndWxhcgAgADoAbQBqAHgALQBsAG0ALQB6AGUAcgBvACAAUgBlAGcA",
      "dQBsAGEAcgAAAAABAAMAAQAAAAwABAAgAAAABAAEAAEAAAAg//8AAAAg////4QABAAAAAAADAAAAAAAA",
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAEAQABAQETbWp4LWxtLXplcm9SZWd1bGFyAAEBASf4GwD4",
      "HAL4HQP4HgSLi/mC+nwFHQAAAIYPHQAAAIkRix0AAACUEgAFAQEMHyoxNlZlcnNpb24gMC4xbWp4LWxt",
      "LXplcm8gUmVndWxhcm1qeC1sbS16ZXJvUmVndWxhcnNwYWNlAAAAAYsAAgEBAwaLDvp8DgAAAAAD6AAA",
      ') format("woff")'
    ].join("");
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/math.js
var SvgMath;
var init_math3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/math.js"() {
    init_Wrapper3();
    init_math2();
    init_math();
    init_BBox();
    init_zero();
    SvgMath = (function() {
      var _a2;
      const Base2 = CommonMathMixin(SvgWrapper);
      return _a2 = class SvgMath extends Base2 {
        handleDisplay() {
          const [align, shift] = this.getAlignShift();
          if (align !== "center") {
            this.adaptor.setAttribute(this.jax.container, "justify", align);
          }
          if (this.bbox.pwidth === BBox.fullWidth) {
            this.adaptor.setAttribute(this.jax.container, "width", "full");
            if (this.jax.table) {
              let { L, w, R } = this.jax.table.getOuterBBox();
              if (align === "right") {
                R = Math.max(R || -shift, -shift);
              } else if (align === "left") {
                L = Math.max(L || shift, shift);
              } else if (align === "center") {
                w += 2 * Math.abs(shift);
              }
              this.jax.minwidth = Math.max(0, L + w + R);
            }
          } else {
            this.jax.shift = shift;
          }
        }
        toSVG(parents) {
          super.toSVG(parents);
          const adaptor = this.adaptor;
          const display = this.node.attributes.get("display") === "block";
          if (display) {
            adaptor.setAttribute(this.jax.container, "display", "true");
            this.handleDisplay();
          }
        }
        setChildPWidths(recompute, w = null, _clear = true) {
          return super.setChildPWidths(recompute, this.parent ? w : this.metrics.containerWidth / this.jax.pxPerEm, false);
        }
      }, _a2.kind = MmlMath.prototype.kind, _a2.styles = {
        'mjx-container[jax="SVG"] mjx-break': {
          "white-space": "normal",
          "line-height": "0",
          "clip-path": "rect(0 0 0 0)",
          "font-family": "MJX-ZERO ! important"
        },
        'mjx-break[size="0"]': {
          "letter-spacing": 1e-3 - 1 + "em"
        },
        'mjx-break[size="1"]': {
          "letter-spacing": 0.111 - 1 + "em"
        },
        'mjx-break[size="2"]': {
          "letter-spacing": 0.167 - 1 + "em"
        },
        'mjx-break[size="3"]': {
          "letter-spacing": 0.222 - 1 + "em"
        },
        'mjx-break[size="4"]': {
          "letter-spacing": 0.278 - 1 + "em"
        },
        'mjx-break[size="5"]': {
          "letter-spacing": 0.333 - 1 + "em"
        },
        'mjx-container[jax="SVG"] mjx-break[newline]::before': {
          "white-space": "pre",
          content: '"\\A"'
        },
        'mjx-break[newline] + svg[width="0.054ex"]': {
          "margin-right": "-1px"
        },
        "mjx-break[prebreak]": {
          "letter-spacing": "-.999em"
        },
        "@font-face /* zero */": {
          "font-family": "MJX-ZERO",
          src: ZeroFontDataUrl
        }
      }, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mrow.js
function CommonMrowMixin(Base2) {
  return class CommonMrowMixin extends Base2 {
    stretchChildren() {
      const stretchy = [];
      for (const child of this.childNodes) {
        if (child.canStretch(DIRECTION.Vertical)) {
          stretchy.push(child);
        }
      }
      const count = stretchy.length;
      const nodeCount = this.childNodes.length;
      if (count && nodeCount > 1) {
        let H2 = 0;
        let D = 0;
        const all = count > 1 && count === nodeCount;
        for (const child of this.childNodes) {
          const noStretch = child.stretch.dir === DIRECTION.None;
          if (all || noStretch) {
            const rscale = child.getBBox().rscale;
            let [h, d] = child.getUnbrokenHD();
            h *= rscale;
            d *= rscale;
            if (h > H2)
              H2 = h;
            if (d > D)
              D = d;
          }
        }
        for (const child of stretchy) {
          const rscale = child.coreRScale();
          child.coreMO().getStretchedVariant([H2 / rscale, D / rscale]);
        }
      }
    }
    get fixesPWidth() {
      return false;
    }
    get breakCount() {
      if (this._breakCount < 0) {
        this._breakCount = !this.childNodes.length ? 0 : this.childNodes.reduce((n, child) => n + child.breakCount, 0);
      }
      return this._breakCount;
    }
    breakTop(_mrow, _child) {
      const node = this;
      return this.isStack ? this.parent.breakTop(node, node) : node;
    }
    constructor(factory, node, parent = null) {
      super(factory, node, parent);
      this.dh = 0;
      const self = this;
      this.isStack = !this.parent || this.parent.node.isInferred || this.parent.breakTop(self, self) !== self;
      this.stretchChildren();
      for (const child of this.childNodes) {
        if (child.bbox.pwidth) {
          this.bbox.pwidth = BBox.fullWidth;
          break;
        }
      }
    }
    computeBBox(bbox, recompute = false) {
      const breaks = this.breakCount;
      this.lineBBox = breaks ? [new LineBBox({ h: 0.75, d: 0.25, w: 0 }, [0, 0])] : [];
      bbox.empty();
      for (const i2 of this.childNodes.keys()) {
        const child = this.childNodes[i2];
        bbox.append(child.getOuterBBox());
        if (breaks) {
          this.computeChildLineBBox(child, i2);
        }
      }
      bbox.clean();
      if (breaks && !this.coreMO().node.isEmbellished) {
        this.computeLinebreakBBox(bbox);
      }
      if (this.fixesPWidth && this.setChildPWidths(recompute)) {
        this.computeBBox(bbox, true);
      }
      this.vboxAdjust(bbox);
    }
    computeLinebreakBBox(bbox) {
      var _a2;
      bbox.empty();
      const isStack = this.isStack;
      const lines2 = this.lineBBox;
      const n = lines2.length - 1;
      if (isStack) {
        for (const k of lines2.keys()) {
          const line = lines2[k];
          this.addMiddleBorders(line);
          if (k === 0) {
            this.addLeftBorders(line);
          }
          if (k === n) {
            this.addRightBorders(line);
          }
        }
      }
      let y = 0;
      for (const k of lines2.keys()) {
        const line = lines2[k];
        bbox.combine(line, 0, y);
        y -= Math.max(0.25, line.d) + line.lineLeading + Math.max(0.75, ((_a2 = lines2[k + 1]) === null || _a2 === void 0 ? void 0 : _a2.h) || 0);
      }
      if (isStack) {
        lines2[0].L = this.bbox.L;
        lines2[n].R = this.bbox.R;
      } else {
        bbox.w = Math.max(...this.lineBBox.map((bbox2) => bbox2.w));
        this.shiftLines(bbox);
        if (!this.jax.math.display && !this.linebreakOptions.inline) {
          bbox.pwidth = BBox.fullWidth;
          if (this.node.isInferred) {
            this.parent.bbox.pwidth = BBox.fullWidth;
          }
        }
      }
      bbox.clean();
    }
    vboxAdjust(bbox) {
      if (!this.parent)
        return;
      const n = this.breakCount;
      const valign = this.parent.node.attributes.get("data-vertical-align");
      if (n && valign === "bottom") {
        this.dh = n ? bbox.d - this.lineBBox[n - 1].d : 0;
      } else if (valign === "center" || n && valign === "middle") {
        const { h, d } = bbox;
        const a = this.font.params.axis_height;
        this.dh = (h + d) / 2 + a - h;
      } else {
        this.dh = 0;
        return;
      }
      bbox.h += this.dh;
      bbox.d -= this.dh;
    }
    computeChildLineBBox(child, i2) {
      const lbox = this.lineBBox[this.lineBBox.length - 1];
      lbox.end = [i2, 0];
      lbox.append(child.getLineBBox(0));
      const parts = child.breakCount + 1;
      if (parts === 1)
        return;
      for (let l = 1; l < parts; l++) {
        const bbox = new LineBBox({ h: 0.75, d: 0.25, w: 0 });
        bbox.start = bbox.end = [i2, l];
        bbox.isFirst = true;
        bbox.append(child.getLineBBox(l));
        this.lineBBox.push(bbox);
      }
    }
    getLineBBox(i2) {
      this.getBBox();
      return this.isStack ? super.getLineBBox(i2) : LineBBox.from(this.getOuterBBox(), this.linebreakOptions.lineleading);
    }
    shiftLines(BBOX) {
      var _a2, _b2;
      const W = BBOX.w;
      const lines2 = this.lineBBox;
      const n = lines2.length - 1;
      const [alignfirst, shiftfirst] = ((_a2 = lines2[1].indentData) === null || _a2 === void 0 ? void 0 : _a2[0]) || [
        "left",
        "0"
      ];
      for (const i2 of lines2.keys()) {
        const bbox = lines2[i2];
        const [indentalign, indentshift] = i2 === 0 ? [alignfirst, shiftfirst] : ((_b2 = bbox.indentData) === null || _b2 === void 0 ? void 0 : _b2[i2 === n ? 2 : 1]) || ["left", "0"];
        const [align, shift] = this.processIndent(indentalign, indentshift, alignfirst, shiftfirst, W);
        bbox.L = 0;
        bbox.L = this.getAlignX(W, bbox, align) + shift;
        const w = bbox.L + bbox.w;
        if (w > BBOX.w) {
          BBOX.w = w;
        }
      }
    }
    setChildPWidths(recompute, w = null, clear = true) {
      if (!this.breakCount)
        return super.setChildPWidths(recompute, w, clear);
      if (recompute)
        return false;
      if (w !== null && this.bbox.w !== w) {
        this.bbox.w = w;
        this.shiftLines(this.bbox);
      }
      return true;
    }
    breakToWidth(W) {
      this.linebreaks.breakToWidth(this, W);
    }
  };
}
function CommonInferredMrowMixin(Base2) {
  return class CommonInferredMrowMixin extends Base2 {
    getScale() {
      this.bbox.scale = this.parent.bbox.scale;
      this.bbox.rscale = 1;
    }
  };
}
var init_mrow2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mrow.js"() {
    init_BBox();
    init_LineBBox();
    init_FontData();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mrow.js
var SvgMrow;
var SvgInferredMrow;
var init_mrow3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mrow.js"() {
    init_Wrapper3();
    init_mrow2();
    init_mrow();
    SvgMrow = (function() {
      var _a2;
      const Base2 = CommonMrowMixin(SvgWrapper);
      return _a2 = class SvgMrow extends Base2 {
        constructor() {
          super(...arguments);
          this.linebreakCount = 0;
        }
        toSVG(parents) {
          this.getBBox();
          const n = this.linebreakCount = this.isStack ? 0 : this.breakCount;
          parents = n || !this.node.isInferred ? this.standardSvgNodes(parents) : this.getSvgNodes(parents);
          this.addChildren(parents);
          if (n) {
            this.placeLines(parents);
          }
        }
        getSvgNodes(parents) {
          if (this.dh) {
            const g = this.svg("g", {
              transform: `translate(0 ${this.fixed(this.dh)})`
            });
            parents = [this.adaptor.append(parents[0], g)];
          }
          this.dom = parents;
          return parents;
        }
        placeLines(parents) {
          var _b2;
          const lines2 = this.lineBBox;
          const display = this.jax.math.display;
          let y = this.dh;
          for (const k of parents.keys()) {
            const lbox = lines2[k];
            this.place(lbox.L || 0, y, parents[k]);
            y -= Math.max(0.25, lbox.d) + (display ? lbox.lineLeading : 0) + Math.max(0.75, ((_b2 = lines2[k + 1]) === null || _b2 === void 0 ? void 0 : _b2.h) || 0);
          }
        }
        createSvgNodes(parents) {
          const n = this.linebreakCount;
          if (!n)
            return super.createSvgNodes(parents);
          const adaptor = this.adaptor;
          const def2 = this.node.isInferred ? { "data-mjx-linestack": true } : { "data-mml-node": this.node.kind };
          this.dom = [adaptor.append(parents[0], this.svg("g", def2))];
          this.dom = [
            adaptor.append(this.handleHref(parents)[0], this.dom[0])
          ];
          const svg = Array(n);
          for (let i2 = 0; i2 <= n; i2++) {
            svg[i2] = adaptor.append(this.dom[0], this.svg("g", { "data-mjx-linebox": true, "data-mjx-lineno": i2 }));
          }
          return svg;
        }
        addChildren(parents) {
          let x2 = 0;
          let i2 = 0;
          const isEmbellished = this.node.isEmbellished;
          for (const child of this.childNodes) {
            const n = isEmbellished ? 0 : child.breakCount;
            child.toSVG(parents.slice(i2, i2 + n + 1));
            if (child.dom) {
              let k = 0;
              for (const dom of child.dom) {
                if (dom) {
                  const dx = k ? 0 : child.dx;
                  const cbox = child.getLineBBox(k++);
                  x2 += (cbox.L + dx) * cbox.rscale;
                  this.place(x2, 0, dom);
                  x2 += (cbox.w + cbox.R - dx) * cbox.rscale;
                }
                if (n) {
                  x2 = 0;
                }
              }
              if (n) {
                const cbox = child.getLineBBox(n);
                x2 += (cbox.w + cbox.R) * cbox.rscale;
              }
            }
            i2 += n;
          }
        }
      }, _a2.kind = MmlMrow.prototype.kind, _a2;
    })();
    SvgInferredMrow = (function() {
      var _a2;
      const Base2 = CommonInferredMrowMixin(SvgMrow);
      return _a2 = class SvgInferredMrowNTD extends Base2 {
      }, _a2.kind = MmlInferredMrow.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mi.js
function CommonMiMixin(Base2) {
  return class CommonMiMixin extends Base2 {
    computeBBox(bbox, _recompute = false) {
      super.computeBBox(bbox);
      this.copySkewIC(bbox);
    }
  };
}
var init_mi2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mi.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mi.js
var SvgMi;
var init_mi3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mi.js"() {
    init_Wrapper3();
    init_mi2();
    init_mi();
    SvgMi = (function() {
      var _a2;
      const Base2 = CommonMiMixin(SvgWrapper);
      return _a2 = class SvgMi extends Base2 {
      }, _a2.kind = MmlMi.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/FontData.js
var SvgFontData;
var init_FontData2 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/FontData.js"() {
    init_FontData();
    init_FontData();
    SvgFontData = class extends FontData {
      static charOptions(font, n) {
        return super.charOptions(font, n);
      }
      static addExtension(data, prefix = "") {
        super.addExtension(data, prefix);
        mergeOptions(this, "variantCacheIds", data.cacheIds);
      }
    };
    SvgFontData.OPTIONS = Object.assign(Object.assign({}, FontData.OPTIONS), { dynamicPrefix: "./svg/dynamic" });
    SvgFontData.JAX = "SVG";
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mo.js
function CommonMoMixin(Base2) {
  return class CommonMoMixin extends Base2 {
    get breakCount() {
      return this.breakStyle ? 1 : 0;
    }
    get embellishedBreakCount() {
      return this.embellishedBreakStyle ? 1 : 0;
    }
    get embellishedBreakStyle() {
      return this.breakStyle || this.getBreakStyle();
    }
    protoBBox(bbox) {
      const stretchy = this.stretch.dir !== DIRECTION.None;
      if (stretchy && this.size === null) {
        this.getStretchedVariant([0]);
      }
      if (stretchy && this.size < 0)
        return;
      super.computeBBox(bbox);
      if (bbox.w === 0 && this.node.attributes.hasExplicit("fence") && this.node.getText() === "" && (this.node.texClass === TEXCLASS.OPEN || this.node.texClass === TEXCLASS.CLOSE) && !this.jax.options.mathmlSpacing) {
        bbox.R = this.font.params.nulldelimiterspace;
      }
      this.copySkewIC(bbox);
    }
    getAccentOffset() {
      const bbox = BBox.empty();
      this.protoBBox(bbox);
      return -bbox.w / 2;
    }
    getCenterOffset(bbox = null) {
      if (!bbox) {
        bbox = BBox.empty();
        super.computeBBox(bbox);
      }
      return (bbox.h + bbox.d) / 2 + this.font.params.axis_height - bbox.h;
    }
    getStretchedVariant(WH, exact = false) {
      if (this.stretch.dir === DIRECTION.None) {
        return;
      }
      let D = this.getWH(WH);
      const min = this.getSize("minsize", 0);
      const max2 = this.getSize("maxsize", Infinity);
      const mathaccent = this.node.getProperty("mathaccent");
      D = Math.max(min, Math.min(max2, D));
      const df = this.font.params.delimiterfactor / 1e3;
      const ds = this.font.params.delimitershortfall;
      const m = min || exact ? D : mathaccent ? Math.min(D / df, D + ds) : Math.max(D * df, D - ds);
      const C = this.getText().codePointAt(0);
      let delim = this.stretch;
      if (this.size) {
        this.stretch = delim = this.font.getDelimiter(C);
        this.size = null;
      }
      const c = delim.c || C;
      let i2 = 0;
      if (delim.sizes) {
        for (const d of delim.sizes) {
          if (d >= m) {
            if (mathaccent && i2) {
              i2--;
            }
            this.setDelimSize(c, i2);
            return;
          }
          i2++;
        }
      }
      if (delim.stretch) {
        this.size = -1;
        this.invalidateBBox();
        this.getStretchBBox(WH, this.checkExtendedHeight(D, delim), delim);
      } else {
        this.setDelimSize(c, i2 - 1);
      }
    }
    setDelimSize(c, i2) {
      const delim = this.stretch;
      this.variant = this.font.getSizeVariant(c, i2);
      this.size = i2;
      const schar = delim.schar ? delim.schar[Math.min(i2, delim.schar.length - 1)] || c : c;
      this.stretch = Object.assign(Object.assign({}, delim), { c: schar });
      this.childNodes[0].invalidateBBox();
    }
    getSize(name, value) {
      const attributes = this.node.attributes;
      if (attributes.isSet(name)) {
        value = this.length2em(attributes.get(name), 1, 1);
      }
      return value;
    }
    getWH(WH) {
      if (WH.length === 0)
        return 0;
      if (WH.length === 1)
        return WH[0];
      const [H2, D] = WH;
      const a = this.font.params.axis_height;
      return this.node.attributes.get("symmetric") ? 2 * Math.max(H2 - a, D + a) : H2 + D;
    }
    getStretchBBox(WHD, D, C) {
      if (Object.hasOwn(C, "min") && C.min > D) {
        D = C.min;
      }
      let [h, d, w] = C.HDW;
      if (this.stretch.dir === DIRECTION.Vertical) {
        [h, d] = this.getBaseline(WHD, D, C);
      } else {
        w = D;
        if (this.stretch.hd && !this.jax.options.mathmlSpacing) {
          const t = this.font.params.extender_factor;
          h = h * (1 - t) + this.stretch.hd[0] * t;
          d = d * (1 - t) + this.stretch.hd[1] * t;
        }
      }
      this.bbox.h = h;
      this.bbox.d = d;
      this.bbox.w = w;
    }
    getBaseline(WHD, HD, C) {
      const hasWHD = WHD.length === 2 && WHD[0] + WHD[1] === HD;
      const symmetric = this.node.attributes.get("symmetric");
      const [H2, D] = hasWHD ? WHD : [HD, 0];
      let [h, d] = [H2 + D, 0];
      if (symmetric) {
        const a = this.font.params.axis_height;
        if (hasWHD) {
          h = 2 * Math.max(H2 - a, D + a);
        }
        d = h / 2 - a;
      } else if (hasWHD) {
        d = D;
      } else {
        const [ch, cd] = C.HDW || [0.75, 0.25];
        d = cd * (h / (ch + cd));
      }
      return [h - d, d];
    }
    checkExtendedHeight(D, C) {
      if (C.fullExt) {
        const [extSize, endSize] = C.fullExt;
        const n = Math.ceil(Math.max(0, D - endSize) / extSize);
        D = endSize + n * extSize;
      }
      return D;
    }
    setBreakStyle(linebreak = "") {
      var _a2;
      this.breakStyle = ((_a2 = this.node.parent) === null || _a2 === void 0 ? void 0 : _a2.isEmbellished) && !linebreak ? "" : this.getBreakStyle(linebreak);
      if (!this.breakCount)
        return;
      if (this.multChar) {
        const i2 = this.parent.node.childIndex(this.node);
        const next = this.parent.node.childNodes[i2 + 1];
        if (next) {
          next.setTeXclass(this.multChar.node);
        }
      }
    }
    getBreakStyle(linebreak = "") {
      const attributes = this.node.attributes;
      let style = linebreak || (attributes.get("linebreak") === "newline" || this.node.getProperty("forcebreak") ? attributes.get("linebreakstyle") : "");
      if (style === "infixlinebreakstyle") {
        style = attributes.get(style);
      }
      return style;
    }
    getMultChar() {
      const multChar = this.node.attributes.get("linebreakmultchar");
      if (multChar && this.getText() === "\u2062" && multChar !== "\u2062") {
        this.multChar = this.createMo(multChar);
      }
    }
    constructor(factory, node, parent = null) {
      super(factory, node, parent);
      this.size = null;
      this.isAccent = this.node.isAccent;
      this.getMultChar();
      this.setBreakStyle();
    }
    computeBBox(bbox, _recompute = false) {
      this.protoBBox(bbox);
      if (this.node.attributes.get("symmetric") && this.stretch.dir !== DIRECTION.Horizontal) {
        const d = this.getCenterOffset(bbox);
        bbox.h += d;
        bbox.d -= d;
      }
      if (this.node.getProperty("mathaccent") && (this.stretch.dir === DIRECTION.None || this.size >= 0)) {
        bbox.w = 0;
      }
    }
    computeLineBBox(i2) {
      return this.moLineBBox(i2, this.breakStyle);
    }
    moLineBBox(i2, style, obox = null) {
      const leadingString = this.node.attributes.get("lineleading");
      const leading = this.length2em(leadingString, this.linebreakOptions.lineleading);
      if (i2 === 0 && style === "before") {
        const bbox2 = LineBBox.from(BBox.zero(), leading);
        bbox2.originalL = this.bbox.L;
        this.bbox.L = 0;
        return bbox2;
      }
      let bbox = LineBBox.from(obox || this.getOuterBBox(), leading);
      if (i2 === 1) {
        if (style === "after") {
          bbox.w = bbox.h = bbox.d = 0;
          bbox.isFirst = true;
          this.bbox.R = 0;
        } else if (style === "duplicate") {
          bbox.L = 0;
        } else if (this.multChar) {
          bbox = LineBBox.from(this.multChar.getOuterBBox(), leading);
        }
        bbox.getIndentData(this.node);
      }
      return bbox;
    }
    canStretch(direction) {
      if (this.stretch.dir !== DIRECTION.None) {
        return this.stretch.dir === direction;
      }
      const attributes = this.node.attributes;
      if (!attributes.get("stretchy"))
        return false;
      const c = this.getText();
      if (Array.from(c).length !== 1)
        return false;
      const delim = this.font.getDelimiter(c.codePointAt(0));
      this.stretch = delim && delim.dir === direction ? delim : NOSTRETCH;
      return this.stretch.dir !== DIRECTION.None;
    }
    getVariant() {
      if (this.node.attributes.get("largeop")) {
        this.variant = this.node.attributes.get("displaystyle") ? "-largeop" : "-smallop";
        return;
      }
      if (!this.node.attributes.hasExplicit("mathvariant") && this.node.getProperty("pseudoscript") === false) {
        this.variant = "-tex-variant";
        return;
      }
      super.getVariant();
    }
    remapChars(chars) {
      const primes = this.node.getProperty("primes");
      if (primes) {
        return unicodeChars(primes);
      }
      if (chars.length === 1) {
        const parent = this.node.coreParent().parent;
        const isAccent = this.isAccent && !parent.isKind("mrow");
        const map = isAccent ? "accent" : "mo";
        const text = this.font.getRemappedChar(map, chars[0]);
        if (text) {
          chars = this.unicodeChars(text, this.variant);
        }
      }
      return chars;
    }
  };
}
var init_mo2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mo.js"() {
    init_MmlNode();
    init_BBox();
    init_LineBBox();
    init_string();
    init_FontData();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mo.js
var SvgMo;
var init_mo3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mo.js"() {
    init_Wrapper3();
    init_FontData2();
    init_mo2();
    init_mo();
    init_FontData2();
    SvgMo = (function() {
      var _a2;
      const Base2 = CommonMoMixin(SvgWrapper);
      return _a2 = class SvgMo extends Base2 {
        toSVG(parents) {
          const attributes = this.node.attributes;
          const symmetric = attributes.get("symmetric") && this.stretch.dir !== DIRECTION.Horizontal;
          const stretchy = this.stretch.dir !== DIRECTION.None;
          if (stretchy && this.size === null) {
            this.getStretchedVariant([]);
          }
          const svg = this.standardSvgNodes(parents);
          if (svg.length > 1 && this.breakStyle !== "duplicate") {
            const i2 = this.breakStyle === "after" ? 1 : 0;
            this.adaptor.remove(svg[i2]);
            svg[i2] = null;
          }
          if (stretchy && this.size < 0) {
            this.stretchSvg();
          } else {
            const u = symmetric || attributes.get("largeop") ? this.fixed(this.getCenterOffset()) : "0";
            const v = this.node.getProperty("mathaccent") ? this.fixed(this.getAccentOffset()) : "0";
            if (u !== "0" || v !== "0") {
              if (svg[0]) {
                this.adaptor.setAttribute(svg[0], "transform", `translate(${v} ${u})`);
              }
              if (svg[1]) {
                this.adaptor.setAttribute(svg[1], "transform", `translate(${v} ${u})`);
              }
            }
            if (svg[0]) {
              this.addChildren([svg[0]]);
            }
            if (svg[1]) {
              (this.multChar || this).addChildren([svg[1]]);
            }
          }
        }
        stretchSvg() {
          const stretch = this.stretch.stretch;
          const variants = this.getStretchVariants();
          const bbox = this.getBBox();
          if (this.stretch.dir === DIRECTION.Vertical) {
            this.stretchVertical(stretch, variants, bbox);
          } else {
            this.stretchHorizontal(stretch, variants, bbox);
          }
        }
        getStretchVariants() {
          const c = this.stretch.c || this.getText().codePointAt(0);
          const variants = [];
          for (const i2 of this.stretch.stretch.keys()) {
            variants[i2] = this.font.getStretchVariant(c, i2);
          }
          return variants;
        }
        stretchVertical(stretch, variant, bbox) {
          const { h, d, w } = bbox;
          const T = this.addTop(stretch[0], variant[0], h, w);
          const B = this.addBot(stretch[2], variant[2], d, w);
          if (stretch.length === 4) {
            const [H2, D] = this.addMidV(stretch[3], variant[3], w);
            this.addExtV(stretch[1], variant[1], h, -H2, T, 0, w);
            this.addExtV(stretch[1], variant[1], -D, d, 0, B, w);
          } else {
            this.addExtV(stretch[1], variant[1], h, d, T, B, w);
          }
        }
        stretchHorizontal(stretch, variant, bbox) {
          const w = bbox.w;
          const L = this.addLeft(stretch[0], variant[0]);
          const R = this.addRight(stretch[2], variant[2], w);
          if (stretch.length === 4) {
            const [x1, x2] = this.addMidH(stretch[3], variant[3], w);
            const w2 = w / 2;
            this.addExtH(stretch[1], variant[1], w2, L, w2 - x1);
            this.addExtH(stretch[1], variant[1], w2, x2 - w2, R, w2);
          } else {
            this.addExtH(stretch[1], variant[1], w, L, R);
          }
        }
        getChar(n, variant) {
          const char = this.font.getChar(variant, n) || [0, 0, 0, null];
          return [char[0], char[1], char[2], char[3] || {}];
        }
        addGlyph(n, variant, x2, y, parent = null) {
          if (parent) {
            return this.placeChar(n, x2, y, parent, variant);
          }
          if (this.dom[0]) {
            const dx = this.placeChar(n, x2, y, this.dom[0], variant);
            if (!this.dom[1]) {
              return dx;
            }
          }
          return this.placeChar(n, x2, y, this.dom[1], variant);
        }
        addTop(n, v, H2, W) {
          if (!n)
            return 0;
          const [h, d, w] = this.getChar(n, v);
          this.addGlyph(n, v, (W - w) / 2, H2 - h);
          return h + d;
        }
        addExtV(n, v, H2, D, T, B, W) {
          if (!n)
            return;
          T = Math.max(0, T - VFUZZ);
          B = Math.max(0, B - VFUZZ);
          const adaptor = this.adaptor;
          const [h, d, w] = this.getChar(n, v);
          const Y = H2 + D - T - B;
          const s = 1.5 * Y / (h + d);
          const y = (s * (h - d) - Y) / 2;
          if (Y <= 0)
            return;
          const svg = this.svg("svg", {
            width: this.fixed(w),
            height: this.fixed(Y),
            y: this.fixed(B - D),
            x: this.fixed((W - w) / 2),
            viewBox: [0, y, w, Y].map((x2) => this.fixed(x2)).join(" ")
          });
          this.addGlyph(n, v, 0, 0, svg);
          const glyph = adaptor.lastChild(svg);
          adaptor.setAttribute(glyph, "transform", `scale(1,${this.jax.fixed(s)})`);
          if (this.dom[0]) {
            adaptor.append(this.dom[0], svg);
          }
          if (this.dom[1]) {
            adaptor.append(this.dom[1], this.dom[0] ? adaptor.clone(svg) : svg);
          }
        }
        addBot(n, v, D, W) {
          if (!n)
            return 0;
          const [h, d, w] = this.getChar(n, v);
          this.addGlyph(n, v, (W - w) / 2, d - D);
          return h + d;
        }
        addMidV(n, v, W) {
          if (!n)
            return [0, 0];
          const [h, d, w] = this.getChar(n, v);
          const y = (d - h) / 2 + this.font.params.axis_height;
          this.addGlyph(n, v, (W - w) / 2, y);
          return [h + y, d - y];
        }
        addLeft(n, v) {
          return n ? this.addGlyph(n, v, 0, 0) : 0;
        }
        addExtH(n, v, W, L, R, x2 = 0) {
          if (!n)
            return;
          R = Math.max(0, R - HFUZZ);
          L = Math.max(0, L - HFUZZ);
          const adaptor = this.adaptor;
          const [h, d, w] = this.getChar(n, v);
          const X = W - L - R;
          const Y = h + d + 2 * VFUZZ;
          const s = 1.5 * (X / w);
          const D = -(d + VFUZZ);
          if (X <= 0)
            return;
          const svg = this.svg("svg", {
            width: this.fixed(X),
            height: this.fixed(Y),
            x: this.fixed(x2 + L),
            y: this.fixed(D),
            viewBox: [(s * w - X) / 2, D, X, Y].map((x3) => this.fixed(x3)).join(" ")
          });
          this.addGlyph(n, v, 0, 0, svg);
          const glyph = adaptor.lastChild(svg);
          adaptor.setAttribute(glyph, "transform", `scale(${this.jax.fixed(s)},1)`);
          if (this.dom[0]) {
            adaptor.append(this.dom[0], svg);
          }
          if (this.dom[1]) {
            adaptor.append(this.dom[1], this.dom[0] ? adaptor.clone(svg) : svg);
          }
        }
        addRight(n, v, W) {
          if (!n)
            return 0;
          const w = this.getChar(n, v)[2];
          return this.addGlyph(n, v, W - w, 0);
        }
        addMidH(n, v, W) {
          if (!n)
            return [0, 0];
          const w = this.getChar(n, v)[2];
          this.addGlyph(n, v, (W - w) / 2, 0);
          return [(W - w) / 2, (W + w) / 2];
        }
      }, _a2.kind = MmlMo.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mn.js
function CommonMnMixin(Base2) {
  return class CommonMnMixin extends Base2 {
    remapChars(chars) {
      if (chars.length) {
        const text = this.font.getRemappedChar("mn", chars[0]);
        if (text) {
          const c = this.unicodeChars(text, this.variant);
          if (c.length === 1) {
            chars[0] = c[0];
          } else {
            chars = c.concat(chars.slice(1));
          }
        }
      }
      return chars;
    }
  };
}
var init_mn2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mn.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mn.js
var SvgMn;
var init_mn3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mn.js"() {
    init_Wrapper3();
    init_mn2();
    init_mn();
    SvgMn = (function() {
      var _a2;
      const Base2 = CommonMnMixin(SvgWrapper);
      return _a2 = class SvgMn extends Base2 {
      }, _a2.kind = MmlMn.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/ms.js
function CommonMsMixin(Base2) {
  return class CommonMsMixin extends Base2 {
    createText(text) {
      const node = this.wrap(this.mmlText(text));
      node.parent = this;
      return node;
    }
    constructor(factory, node, parent = null) {
      super(factory, node, parent);
      const attributes = this.node.attributes;
      const quotes = attributes.getList("lquote", "rquote");
      if (this.variant !== "monospace") {
        if (!attributes.isSet("lquote") && quotes.lquote === '"') {
          quotes.lquote = "“";
        }
        if (!attributes.isSet("rquote") && quotes.rquote === '"') {
          quotes.rquote = "”";
        }
      }
      this.childNodes.unshift(this.createText(quotes.lquote));
      this.childNodes.push(this.createText(quotes.rquote));
    }
  };
}
var init_ms2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/ms.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/ms.js
var SvgMs;
var init_ms3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/ms.js"() {
    init_Wrapper3();
    init_ms2();
    init_ms();
    SvgMs = (function() {
      var _a2;
      const Base2 = CommonMsMixin(SvgWrapper);
      return _a2 = class SvgMs extends Base2 {
      }, _a2.kind = MmlMs.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mtext.js
function CommonMtextMixin(Base2) {
  var _a2;
  return _a2 = class CommonMtextMixin extends Base2 {
    constructor() {
      super(...arguments);
      this.breakPoints = [];
    }
    textWidth(text) {
      let textNode = this.textNode;
      if (!textNode) {
        const text2 = this.node.factory.create("text");
        text2.parent = this.node;
        textNode = this.textNode = this.factory.wrap(text2);
        textNode.parent = this;
      }
      textNode.node.setText(text);
      textNode.invalidateBBox(false);
      return textNode.getBBox().w;
    }
    get breakCount() {
      return this.breakPoints.length;
    }
    getVariant() {
      const options3 = this.jax.options;
      const data = this.jax.math.outputData;
      const merror = (!!data.merrorFamily || !!options3.merrorFont) && this.node.Parent.isKind("merror");
      if (!!data.mtextFamily || !!options3.mtextFont || merror) {
        const variant = this.node.attributes.get("mathvariant");
        const font = this.constructor.INHERITFONTS[variant] || this.jax.font.getCssFont(variant);
        const family = font[0] || (merror ? data.merrorFamily || options3.merrorFont : data.mtextFamily || options3.mtextFont);
        this.variant = this.explicitVariant(family, font[2] ? "bold" : "", font[1] ? "italic" : "");
        return;
      }
      super.getVariant();
    }
    setBreakAt(ij) {
      this.breakPoints.push(ij);
    }
    clearBreakPoints() {
      this.breakPoints = [];
    }
    computeLineBBox(i2) {
      const bbox = LineBBox.from(this.getOuterBBox(), this.linebreakOptions.lineleading);
      if (!this.breakCount)
        return bbox;
      bbox.w = this.getBreakWidth(i2);
      if (i2 === 0) {
        bbox.R = 0;
        this.addLeftBorders(bbox);
      } else {
        bbox.L = 0;
        bbox.indentData = [
          ["left", "0"],
          ["left", "0"],
          ["left", "0"]
        ];
        if (i2 === this.breakCount) {
          this.addRightBorders(bbox);
        }
      }
      return bbox;
    }
    getBreakWidth(i2) {
      const childNodes = this.childNodes;
      let [si2, sj] = this.breakPoints[i2 - 1] || [0, 0];
      const [ei, ej] = this.breakPoints[i2] || [childNodes.length, 0];
      let words2 = childNodes[si2].node.getText().split(/ /);
      if (si2 === ei) {
        return this.textWidth(words2.slice(sj, ej).join(" "));
      }
      let w = this.textWidth(words2.slice(sj).join(" "));
      while (++si2 < ei && si2 < childNodes.length) {
        w += childNodes[si2].getBBox().w;
      }
      if (si2 < childNodes.length) {
        words2 = childNodes[si2].node.getText().split(/ /);
        w += this.textWidth(words2.slice(0, ej).join(" "));
      }
      return w;
    }
  }, _a2.INHERITFONTS = {
    normal: ["", false, false],
    bold: ["", false, true],
    italic: ["", true, false],
    "bold-italic": ["", true, true]
  }, _a2;
}
var init_mtext2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mtext.js"() {
    init_LineBBox();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mtext.js
var SvgMtext;
var init_mtext3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mtext.js"() {
    init_Wrapper3();
    init_mtext2();
    init_mtext();
    SvgMtext = (function() {
      var _a2;
      const Base2 = CommonMtextMixin(SvgWrapper);
      return _a2 = class SvgMtext extends Base2 {
        toSVG(parents) {
          if (!this.breakCount) {
            super.toSVG(parents);
            return;
          }
          const svg = this.standardSvgNodes(parents);
          const textNode = this.textNode.node;
          const childNodes = this.childNodes;
          for (const i2 of svg.keys()) {
            const DOM = [svg[i2]];
            let [si2, sj] = this.breakPoints[i2 - 1] || [0, 0];
            const [ei, ej] = this.breakPoints[i2] || [childNodes.length, 0];
            let words2 = childNodes[si2].node.getText().split(/ /);
            if (si2 === ei) {
              textNode.setText(words2.slice(sj, ej).join(" "));
              this.textNode.toSVG(DOM);
              continue;
            }
            textNode.setText(words2.slice(sj).join(" "));
            this.textNode.toSVG(DOM);
            let x2 = this.textNode.getBBox().w;
            while (++si2 < ei && si2 < childNodes.length) {
              const child = childNodes[si2];
              child.toSVG(DOM);
              if (child.dom) {
                child.place(x2, 0);
              }
              x2 += child.getBBox().w;
            }
            if (si2 < childNodes.length) {
              words2 = childNodes[si2].node.getText().split(/ /);
              textNode.setText(words2.slice(0, ej).join(" "));
              this.textNode.toSVG(DOM);
              this.textNode.place(x2, 0);
            }
          }
        }
      }, _a2.kind = MmlMtext.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/merror.js
var SvgMerror;
var init_merror2 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/merror.js"() {
    init_Wrapper3();
    init_merror();
    SvgMerror = (function() {
      var _a2;
      return _a2 = class SvgMerror extends SvgWrapper {
        toSVG(parents) {
          const svg = this.standardSvgNodes(parents);
          const { h, d, w } = this.getBBox();
          this.adaptor.append(this.dom[0], this.svg("rect", {
            "data-background": true,
            width: this.fixed(w),
            height: this.fixed(h + d),
            y: this.fixed(-d)
          }));
          const title = this.node.attributes.get("title");
          if (title) {
            this.adaptor.append(this.dom[0], this.svg("title", {}, [this.adaptor.text(title)]));
          }
          this.addChildren(svg);
        }
      }, _a2.kind = MmlMerror.prototype.kind, _a2.styles = {
        'g[data-mml-node="merror"] > g': {
          fill: "red",
          stroke: "red"
        },
        'g[data-mml-node="merror"] > rect[data-background]': {
          fill: "yellow",
          stroke: "none"
        }
      }, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mspace.js
function CommonMspaceMixin(Base2) {
  return class CommonMspaceMixin extends Base2 {
    get canBreak() {
      return this.node.canBreak;
    }
    get breakCount() {
      return this.breakStyle ? 1 : 0;
    }
    setBreakStyle(linebreak = "") {
      this.breakStyle = linebreak || (this.node.hasNewline || this.node.getProperty("forcebreak") ? "before" : "");
    }
    constructor(factory, node, parent = null) {
      super(factory, node, parent);
      this.setBreakStyle();
    }
    computeBBox(bbox, _recompute = false) {
      const attributes = this.node.attributes;
      bbox.w = this.length2em(attributes.get("width"), 0);
      bbox.h = this.length2em(attributes.get("height"), 0);
      bbox.d = this.length2em(attributes.get("depth"), 0);
    }
    computeLineBBox(i2) {
      const leadingString = this.node.attributes.get("data-lineleading");
      const leading = this.length2em(leadingString, this.linebreakOptions.lineleading);
      const bbox = LineBBox.from(BBox.zero(), leading);
      if (i2 === 1) {
        bbox.getIndentData(this.node);
        bbox.w = this.getBBox().w;
        bbox.isFirst = bbox.w === 0;
      }
      return bbox;
    }
  };
}
var init_mspace2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mspace.js"() {
    init_BBox();
    init_LineBBox();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mspace.js
var SvgMspace;
var init_mspace3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mspace.js"() {
    init_Wrapper3();
    init_mspace2();
    init_mspace();
    SvgMspace = (function() {
      var _a2;
      const Base2 = CommonMspaceMixin(SvgWrapper);
      return _a2 = class SvgMspace extends Base2 {
      }, _a2.kind = MmlMspace.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mpadded.js
function CommonMpaddedMixin(Base2) {
  return class CommonMpaddedMixin extends Base2 {
    get containerWidth() {
      const attributes = this.node.attributes;
      const w = attributes.get("width").toString();
      if (!w.match(/^[-+]|%$/) && attributes.get("data-overflow") === "linebreak") {
        return this.length2em(w);
      }
      return this.parent.containerWidth;
    }
    getDimens() {
      const values = this.node.attributes.getList("width", "height", "depth", "lspace", "voffset");
      const bbox = this.childNodes[0].getOuterBBox();
      let { w, h, d } = bbox;
      const W = w;
      const H2 = h;
      const D = d;
      let x2 = 0;
      let y = 0;
      let dx = 0;
      if (values.width !== "")
        w = this.dimen(values.width, bbox, "w", 0);
      if (values.height !== "")
        h = this.dimen(values.height, bbox, "h", 0);
      if (values.depth !== "")
        d = this.dimen(values.depth, bbox, "d", 0);
      if (values.voffset !== "")
        y = this.dimen(values.voffset, bbox);
      if (values.lspace !== "")
        x2 = this.dimen(values.lspace, bbox);
      const align = this.node.attributes.get("data-align");
      if (align) {
        dx = this.getAlignX(w, bbox, align);
      }
      return [H2, D, W, h - H2, d - D, w - W, x2, y, dx];
    }
    dimen(length4, bbox, d = "", m = null) {
      length4 = String(length4);
      const match = length4.match(/width|height|depth/);
      const size = match ? bbox[match[0].charAt(0)] : d ? bbox[d] : 0;
      let dimen = this.length2em(length4, size) || 0;
      if (length4.match(/^[-+]/) && d) {
        dimen += size;
      }
      if (m != null) {
        dimen = Math.max(m, dimen);
      }
      return dimen;
    }
    setBBoxDimens(bbox) {
      const [H2, D, W, dh, dd, dw] = this.getDimens();
      bbox.w = W + dw;
      bbox.h = H2 + dh;
      bbox.d = D + dd;
    }
    computeBBox(bbox, recompute = false) {
      this.setBBoxDimens(bbox);
      const w = this.childNodes[0].getOuterBBox().w;
      if (w > bbox.w) {
        const overflow = this.node.attributes.get("data-overflow");
        if (overflow === "linebreak" || overflow === "auto" && this.jax.math.root.attributes.get("overflow") === "linebreak") {
          this.childNodes[0].breakToWidth(bbox.w);
          this.setBBoxDimens(bbox);
        }
      }
      this.setChildPWidths(recompute, bbox.w);
    }
    getWrapWidth(_i) {
      return this.getBBox().w;
    }
    getChildAlign(_i) {
      return this.node.attributes.get("data-align") || "left";
    }
  };
}
var init_mpadded2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mpadded.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mpadded.js
var SvgMpadded;
var init_mpadded3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mpadded.js"() {
    init_Wrapper3();
    init_mpadded2();
    init_mpadded();
    SvgMpadded = (function() {
      var _a2;
      const Base2 = CommonMpaddedMixin(SvgWrapper);
      return _a2 = class SvgMpadded extends Base2 {
        toSVG(parents) {
          if (this.toEmbellishedSVG(parents))
            return;
          let svg = this.standardSvgNodes(parents);
          const [, , , , , dw, x2, y, dx] = this.getDimens();
          const align = this.node.attributes.get("data-align") || "left";
          const dW = dw < 0 && align !== "left" ? align === "center" ? dw / 2 : dw : 0;
          const X = x2 + dx - dW;
          if (X || y) {
            svg = [this.adaptor.append(svg[0], this.svg("g"))];
            this.place(X, y, svg[0]);
          }
          this.addChildren(svg);
        }
      }, _a2.kind = MmlMpadded.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mphantom.js
var SvgMphantom;
var init_mphantom2 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mphantom.js"() {
    init_Wrapper3();
    init_mphantom();
    SvgMphantom = (function() {
      var _a2;
      return _a2 = class SvgMphantom extends SvgWrapper {
        toSVG(parents) {
          this.standardSvgNodes(parents);
        }
      }, _a2.kind = MmlMphantom.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mfrac.js
function CommonMfracMixin(Base2) {
  return class CommonMfracMixin extends Base2 {
    getFractionBBox(bbox, display, t) {
      const nbox = this.childNodes[0].getOuterBBox();
      const dbox = this.childNodes[1].getOuterBBox();
      const tex = this.font.params;
      const a = tex.axis_height;
      const { T, u, v } = this.getTUV(display, t);
      bbox.combine(nbox, 0, a + T + Math.max(nbox.d * nbox.rscale, u));
      bbox.combine(dbox, 0, a - T - Math.max(dbox.h * dbox.rscale, v));
      bbox.w += 2 * this.pad + 0.2;
    }
    getTUV(display, t) {
      const tex = this.font.params;
      const a = tex.axis_height;
      const T = (display ? 3.5 : 1.5) * t;
      return {
        T: (display ? 3.5 : 1.5) * t,
        u: (display ? tex.num1 : tex.num2) - a - T,
        v: (display ? tex.denom1 : tex.denom2) + a - T
      };
    }
    getAtopBBox(bbox, display) {
      const { u, v, nbox, dbox } = this.getUVQ(display);
      bbox.combine(nbox, 0, u);
      bbox.combine(dbox, 0, -v);
      bbox.w += 2 * this.pad;
    }
    getUVQ(display) {
      const nbox = this.childNodes[0].getOuterBBox();
      const dbox = this.childNodes[1].getOuterBBox();
      const tex = this.font.params;
      let [u, v] = display ? [tex.num1, tex.denom1] : [tex.num3, tex.denom2];
      const p = (display ? 7 : 3) * tex.rule_thickness;
      let q = u - nbox.d * nbox.scale - (dbox.h * dbox.scale - v);
      if (q < p) {
        u += (p - q) / 2;
        v += (p - q) / 2;
        q = p;
      }
      return { u, v, q, nbox, dbox };
    }
    getBevelledBBox(bbox, display) {
      const { u, v, delta, nbox, dbox } = this.getBevelData(display);
      const lbox = this.bevel.getOuterBBox();
      bbox.combine(nbox, 0, u);
      bbox.combine(lbox, bbox.w - delta / 2, 0);
      bbox.combine(dbox, bbox.w - delta / 2, v);
    }
    getBevelData(display) {
      const nbox = this.childNodes[0].getOuterBBox();
      const dbox = this.childNodes[1].getOuterBBox();
      const delta = display ? 0.4 : 0.15;
      const H2 = Math.max(nbox.scale * (nbox.h + nbox.d), dbox.scale * (dbox.h + dbox.d)) + 2 * delta;
      const a = this.font.params.axis_height;
      const u = nbox.scale * (nbox.d - nbox.h) / 2 + a + delta;
      const v = dbox.scale * (dbox.d - dbox.h) / 2 + a - delta;
      return { H: H2, delta, u, v, nbox, dbox };
    }
    isDisplay() {
      const { displaystyle, scriptlevel } = this.node.attributes.getList("displaystyle", "scriptlevel");
      return displaystyle && scriptlevel === 0;
    }
    constructor(factory, node, parent = null) {
      super(factory, node, parent);
      this.bevel = null;
      this.pad = this.node.getProperty("withDelims") ? 0 : this.font.params.nulldelimiterspace;
      if (this.node.attributes.get("bevelled")) {
        const { H: H2 } = this.getBevelData(this.isDisplay());
        const bevel = this.bevel = this.createMo("/");
        bevel.node.attributes.set("symmetric", true);
        bevel.canStretch(DIRECTION.Vertical);
        bevel.getStretchedVariant([H2], true);
      }
    }
    computeBBox(bbox, recompute = false) {
      bbox.empty();
      const { linethickness, bevelled } = this.node.attributes.getList("linethickness", "bevelled");
      const display = this.isDisplay();
      let w = null;
      if (bevelled) {
        this.getBevelledBBox(bbox, display);
      } else {
        const thickness = this.length2em(String(linethickness), 0.06);
        w = -2 * this.pad;
        if (thickness === 0) {
          this.getAtopBBox(bbox, display);
        } else {
          this.getFractionBBox(bbox, display, thickness);
          w -= 0.2;
        }
        w += bbox.w;
      }
      bbox.clean();
      this.setChildPWidths(recompute, w);
    }
    canStretch(_direction) {
      return false;
    }
    getChildAlign(i2) {
      const attributes = this.node.attributes;
      return attributes.get("bevelled") ? "left" : attributes.get(["numalign", "denomalign"][i2]);
    }
    getWrapWidth(i2) {
      const attributes = this.node.attributes;
      if (attributes.get("bevelled")) {
        return this.childNodes[i2].getOuterBBox().w;
      }
      const w = this.getBBox().w;
      const thickness = this.length2em(attributes.get("linethickness"));
      return w - (thickness ? 0.2 : 0) - 2 * this.pad;
    }
  };
}
export{CommonMfracMixin,init_math3,init_mrow3,init_mi3,init_mo3,init_mn3,init_ms3,init_mtext3,init_merror2,init_mspace3,init_mpadded3,init_mphantom2,SvgMath,SvgMrow,SvgInferredMrow,SvgMi,SvgMo,SvgMn,SvgMs,SvgMtext,SvgMerror,SvgMspace,SvgMpadded,SvgMphantom,init_FontData2,SvgFontData};
