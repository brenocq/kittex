import{__esm,init_string,init_Wrapper3,init_semantics2,init_semantics,init_MmlNode,CommonSemanticsMixin,SvgWrapper,MmlSemantics,MmlAnnotation,MmlAnnotationXML,CommonXmlNodeMixin,XMLNode,init_mglyph,MmlMglyph,init_TeXAtom,TEXCLASSNAMES,TeXAtom,TextNode,init_HtmlNode,HtmlNode,init_math3,init_mrow3,init_mi3,init_mo3,init_mn3,init_ms3,init_mtext3,init_merror2,init_mspace3,init_mpadded3,init_mphantom2,init_mfrac3,init_msqrt3,init_mroot3,init_mfenced3,init_msubsup3,init_munderover3,init_mmultiscripts3,init_mtable3,init_mtr3,init_mtd3,init_maction3,init_menclose3,SvgMath,SvgMrow,SvgInferredMrow,SvgMi,SvgMo,SvgMn,SvgMs,SvgMtext,SvgMerror,SvgMspace,SvgMpadded,SvgMphantom,SvgMfrac,SvgMsqrt,SvgMroot,SvgMfenced,SvgMsub,SvgMsup,SvgMsubsup,SvgMunder,SvgMover,SvgMunderover,SvgMmultiscripts,SvgMtable,SvgMtr,SvgMlabeledtr,SvgMtd,SvgMaction,SvgMenclose,init_WrapperFactory2,CommonWrapperFactory,FontData,init_FontData,__kittexJson0,__kittexJson1,__kittexJson2,__kittexJson3,__kittexJson4,__kittexJson5,__kittexJson6,__kittexJson7,__kittexJson8,__kittexJson9,__kittexJson10,__kittexJson11,__kittexJson12,__kittexJson13,__kittexJson14,__kittexJson15,__kittexJson16,__kittexJson17,init_Direction,V,H}from'./p22.js';export*from'./p22.js';
var init_XmlNode = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/XmlNode.js"() {
    init_string();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/semantics.js
var SvgSemantics;
var SvgAnnotation;
var SvgAnnotationXML;
var SvgXmlNode;
var init_semantics3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/semantics.js"() {
    init_Wrapper3();
    init_semantics2();
    init_XmlNode();
    init_semantics();
    init_MmlNode();
    SvgSemantics = (function() {
      var _a2;
      const Base2 = CommonSemanticsMixin(SvgWrapper);
      return _a2 = class SvgSemantics extends Base2 {
        toSVG(parents) {
          if (this.toEmbellishedSVG(parents))
            return;
          const svg = this.standardSvgNodes(parents);
          if (this.childNodes.length) {
            this.childNodes[0].toSVG(svg);
          }
        }
      }, _a2.kind = MmlSemantics.prototype.kind, _a2;
    })();
    SvgAnnotation = (function() {
      var _a2;
      return _a2 = class SvgAnnotation extends SvgWrapper {
        toSVG(parents) {
          super.toSVG(parents);
        }
        computeBBox() {
          return this.bbox;
        }
      }, _a2.kind = MmlAnnotation.prototype.kind, _a2;
    })();
    SvgAnnotationXML = (function() {
      var _a2;
      return _a2 = class SvgAnnotationXML extends SvgWrapper {
      }, _a2.kind = MmlAnnotationXML.prototype.kind, _a2.styles = {
        "foreignObject[data-mjx-xml]": {
          "font-family": "initial",
          "line-height": "normal",
          overflow: "visible"
        }
      }, _a2;
    })();
    SvgXmlNode = (function() {
      var _a2;
      const Base2 = CommonXmlNodeMixin(SvgWrapper);
      return _a2 = class SvgXmlNode extends Base2 {
        toSVG(parents) {
          const metrics = this.jax.math.metrics;
          const em2 = metrics.em * metrics.scale * this.rscale;
          const scale2 = this.fixed(1 / em2, 3);
          const { w, h, d } = this.getBBox();
          this.dom = [
            this.adaptor.append(parents[0], this.svg("foreignObject", {
              "data-mjx-xml": true,
              y: this.jax.fixed(-h * em2) + "px",
              width: this.jax.fixed(w * em2) + "px",
              height: this.jax.fixed((h + d) * em2) + "px",
              transform: `scale(${scale2}) matrix(1 0 0 -1 0 0)`
            }, [this.getHTML()]))
          ];
        }
        addHDW(html2, styles) {
          html2 = this.html("mjx-html-holder", { style: styles }, [html2]);
          const { h, d, w } = this.getBBox();
          const scale2 = this.metrics.scale;
          styles.height = this.em((h + d) * scale2);
          styles.width = this.em(w * scale2);
          styles["vertical-align"] = this.em(-d * scale2);
          delete styles["font-size"];
          delete styles["font-family"];
          return html2;
        }
      }, _a2.kind = XMLNode.prototype.kind, _a2.styles = Object.assign({ "foreignObject[data-mjx-html]": {
        overflow: "visible"
      } }, Base2.styles), _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mglyph.js
function CommonMglyphMixin(Base2) {
  return class CommonMglyphMixin extends Base2 {
    constructor(factory, node, parent = null) {
      super(factory, node, parent);
      this.getParameters();
    }
    getParameters() {
      const { width, height: height2, valign, src, index } = this.node.attributes.getList("width", "height", "valign", "src", "index");
      if (src) {
        this.width = width === "auto" ? 1 : this.length2em(width);
        this.height = height2 === "auto" ? 1 : this.length2em(height2);
        this.valign = this.length2em(valign || "0");
      } else {
        const text = String.fromCodePoint(parseInt(index));
        const mmlFactory = this.node.factory;
        this.charWrapper = this.wrap(mmlFactory.create("text").setText(text));
        this.charWrapper.parent = this;
      }
    }
    computeBBox(bbox, _recompute = false) {
      if (this.charWrapper) {
        bbox.updateFrom(this.charWrapper.getBBox());
      } else {
        bbox.w = this.width;
        bbox.h = this.height + this.valign;
        bbox.d = -this.valign;
      }
    }
  };
}
var init_mglyph2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mglyph.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mglyph.js
var SvgMglyph;
var init_mglyph3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mglyph.js"() {
    init_Wrapper3();
    init_mglyph2();
    init_mglyph();
    SvgMglyph = (function() {
      var _a2;
      const Base2 = CommonMglyphMixin(SvgWrapper);
      return _a2 = class SvgMglyph extends Base2 {
        toSVG(parents) {
          const svg = this.standardSvgNodes(parents);
          if (this.charWrapper) {
            this.charWrapper.toSVG(svg);
            return;
          }
          const { src, alt } = this.node.attributes.getList("src", "alt");
          const h = this.fixed(this.height);
          const w = this.fixed(this.width);
          const y = this.fixed(this.height + (this.valign || 0));
          const properties = {
            width: w,
            height: h,
            transform: "translate(0 " + y + ") matrix(1 0 0 -1 0 0)",
            preserveAspectRatio: "none",
            "aria-label": alt,
            href: src
          };
          const img = this.svg("image", properties);
          this.adaptor.append(svg[0], img);
        }
      }, _a2.kind = MmlMglyph.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/TeXAtom.js
function CommonTeXAtomMixin(Base2) {
  return class CommonTeXAtomMixin extends Base2 {
    computeBBox(bbox, recompute = false) {
      super.computeBBox(bbox, recompute);
      if (this.childNodes[0] && this.childNodes[0].bbox.ic) {
        bbox.ic = this.childNodes[0].bbox.ic;
      }
    }
  };
}
var init_TeXAtom2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/TeXAtom.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/TeXAtom.js
var SvgTeXAtom;
var init_TeXAtom3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/TeXAtom.js"() {
    init_Wrapper3();
    init_TeXAtom2();
    init_TeXAtom();
    init_MmlNode();
    SvgTeXAtom = (function() {
      var _a2;
      const Base2 = CommonTeXAtomMixin(SvgWrapper);
      return _a2 = class SvgTeXAtom extends Base2 {
        toSVG(parents) {
          super.toSVG(parents);
          this.adaptor.setAttribute(this.dom[0], "data-mjx-texclass", TEXCLASSNAMES[this.node.texClass]);
        }
      }, _a2.kind = TeXAtom.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/TextNode.js
function CommonTextNodeMixin(Base2) {
  return class CommonTextNodeMixin extends Base2 {
    remappedText(text, variant) {
      const c = this.parent.stretch.c;
      return c ? [c] : this.parent.remapChars(this.unicodeChars(text, variant));
    }
    computeBBox(bbox, _recompute = false) {
      const variant = this.parent.variant;
      const text = this.node.getText();
      if (variant === "-explicitFont") {
        const font = this.jax.getFontData(this.parent.styles);
        const { w, h, d } = this.jax.measureText(text, variant, font);
        bbox.h = h;
        bbox.d = d;
        bbox.w = w;
      } else {
        const chars = this.remappedText(text, variant);
        let utext = "";
        bbox.empty();
        for (let i2 = 0; i2 < chars.length; i2++) {
          const [h, d, w, data] = this.getVariantChar(variant, chars[i2]);
          if (data.unknown) {
            utext += String.fromCodePoint(chars[i2]);
          } else {
            utext = this.addUtextBBox(bbox, utext, variant);
            this.updateBBox(bbox, h, d, w);
            bbox.ic = data.ic || 0;
            bbox.sk = data.sk || 0;
            bbox.dx = data.dx || 0;
            if (!data.oc || i2 < chars.length - 1)
              continue;
            const children = this.parent.childNodes;
            if (this.node !== children[children.length - 1].node)
              continue;
            const parent = this.parent.parent.node;
            let next = parent.isKind("mrow") || parent.isInferred ? parent.childNodes[parent.childIndex(this.parent.node) + 1] : null;
            if ((next === null || next === void 0 ? void 0 : next.isKind("mo")) && next.getText() === "\u2062") {
              next = parent.childNodes[parent.childIndex(next) + 1];
            }
            if (!next || next.attributes.get("mathvariant") !== variant) {
              bbox.ic = data.oc;
            } else {
              bbox.oc = data.oc;
            }
          }
        }
        this.addUtextBBox(bbox, utext, variant);
        if (chars.length > 1) {
          bbox.sk = 0;
        }
        bbox.clean();
      }
    }
    addUtextBBox(bbox, utext, variant) {
      if (utext) {
        const { h, d, w } = this.jax.measureText(utext, variant);
        this.updateBBox(bbox, h, d, w);
      }
      return "";
    }
    updateBBox(bbox, h, d, w) {
      bbox.w += w;
      if (h > bbox.h) {
        bbox.h = h;
      }
      if (d > bbox.d) {
        bbox.d = d;
      }
    }
    getStyles() {
    }
    getVariant() {
    }
    getScale() {
    }
    getSpace() {
    }
  };
}
var init_TextNode = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/TextNode.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/TextNode.js
var SvgTextNode;
var init_TextNode2 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/TextNode.js"() {
    init_Wrapper3();
    init_TextNode();
    init_MmlNode();
    SvgTextNode = (function() {
      var _a2;
      const Base2 = CommonTextNodeMixin(SvgWrapper);
      return _a2 = class SvgTextNode extends Base2 {
        static addStyles(styles, jax) {
          styles.addStyles({
            'mjx-container[jax="SVG"] path[data-c], mjx-container[jax="SVG"] use[data-c]': {
              "stroke-width": jax.options.blacker
            }
          });
        }
        toSVG(parents) {
          const adaptor = this.adaptor;
          const variant = this.parent.variant;
          const text = this.node.getText();
          if (text.length === 0)
            return;
          if (variant === "-explicitFont") {
            this.dom = [
              adaptor.append(parents[0], this.jax.unknownText(text, variant))
            ];
          } else {
            const chars = this.remappedText(text, variant);
            if (this.parent.childNodes.length > 1) {
              parents = this.dom = [
                adaptor.append(parents[0], this.svg("g", { "data-mml-node": "text" }))
              ];
            } else {
              this.dom = parents;
            }
            let x2 = 0;
            for (const n of chars) {
              x2 += this.placeChar(n, x2, 0, parents[0], variant, true);
            }
            this.addUtext(x2, 0, parents[0], variant);
          }
        }
      }, _a2.kind = TextNode.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/HtmlNode.js
var SvgHtmlNode;
var init_HtmlNode2 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/HtmlNode.js"() {
    init_semantics3();
    init_HtmlNode();
    SvgHtmlNode = (function() {
      var _a2;
      return _a2 = class SvgHtmlNode extends SvgXmlNode {
      }, _a2.kind = HtmlNode.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers.js
var SvgWrappers;
var init_Wrappers = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers.js"() {
    init_Wrapper3();
    init_math3();
    init_mrow3();
    init_mi3();
    init_mo3();
    init_mn3();
    init_ms3();
    init_mtext3();
    init_merror2();
    init_mspace3();
    init_mpadded3();
    init_mphantom2();
    init_mfrac3();
    init_msqrt3();
    init_mroot3();
    init_mfenced3();
    init_msubsup3();
    init_munderover3();
    init_mmultiscripts3();
    init_mtable3();
    init_mtr3();
    init_mtd3();
    init_maction3();
    init_menclose3();
    init_semantics3();
    init_mglyph3();
    init_TeXAtom3();
    init_TextNode2();
    init_HtmlNode2();
    SvgWrappers = {
      [SvgMath.kind]: SvgMath,
      [SvgMrow.kind]: SvgMrow,
      [SvgInferredMrow.kind]: SvgInferredMrow,
      [SvgMi.kind]: SvgMi,
      [SvgMo.kind]: SvgMo,
      [SvgMn.kind]: SvgMn,
      [SvgMs.kind]: SvgMs,
      [SvgMtext.kind]: SvgMtext,
      [SvgMerror.kind]: SvgMerror,
      [SvgMspace.kind]: SvgMspace,
      [SvgMpadded.kind]: SvgMpadded,
      [SvgMphantom.kind]: SvgMphantom,
      [SvgMfrac.kind]: SvgMfrac,
      [SvgMsqrt.kind]: SvgMsqrt,
      [SvgMroot.kind]: SvgMroot,
      [SvgMfenced.kind]: SvgMfenced,
      [SvgMsub.kind]: SvgMsub,
      [SvgMsup.kind]: SvgMsup,
      [SvgMsubsup.kind]: SvgMsubsup,
      [SvgMunder.kind]: SvgMunder,
      [SvgMover.kind]: SvgMover,
      [SvgMunderover.kind]: SvgMunderover,
      [SvgMmultiscripts.kind]: SvgMmultiscripts,
      [SvgMtable.kind]: SvgMtable,
      [SvgMtr.kind]: SvgMtr,
      [SvgMlabeledtr.kind]: SvgMlabeledtr,
      [SvgMtd.kind]: SvgMtd,
      [SvgMaction.kind]: SvgMaction,
      [SvgMenclose.kind]: SvgMenclose,
      [SvgSemantics.kind]: SvgSemantics,
      [SvgAnnotation.kind]: SvgAnnotation,
      [SvgAnnotationXML.kind]: SvgAnnotationXML,
      [SvgXmlNode.kind]: SvgXmlNode,
      [SvgMglyph.kind]: SvgMglyph,
      [SvgTeXAtom.kind]: SvgTeXAtom,
      [SvgTextNode.kind]: SvgTextNode,
      [SvgHtmlNode.kind]: SvgHtmlNode,
      [SvgWrapper.kind]: SvgWrapper
    };
  }
});
// node_modules/@mathjax/src/mjs/output/svg/WrapperFactory.js
var SvgWrapperFactory;
var init_WrapperFactory3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/WrapperFactory.js"() {
    init_WrapperFactory2();
    init_Wrappers();
    SvgWrapperFactory = class extends CommonWrapperFactory {
    };
    SvgWrapperFactory.defaultNodes = SvgWrappers;
  }
});
// node_modules/@mathjax/src/mjs/output/svg/FontCache.js
var FontCache;
var init_FontCache = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/FontCache.js"() {
    FontCache = class {
      constructor(jax) {
        this.cache = /* @__PURE__ */ new Map();
        this.defs = null;
        this.localID = "";
        this.nextID = 0;
        this.jax = jax;
      }
      cachePath(variant, C, path) {
        const id = "MJX-" + this.localID + (this.jax.font.getVariant(variant).cacheID || "") + "-" + C;
        if (!this.cache.has(id)) {
          this.cache.set(id, path);
          this.jax.adaptor.append(this.defs, this.jax.svg("path", { id, d: path }));
        }
        return id;
      }
      clearLocalID() {
        this.localID = "";
      }
      useLocalID(id = null) {
        this.localID = (id == null ? ++this.nextID : id) + (id === "" ? "" : "-");
      }
      clearCache() {
        this.cache = /* @__PURE__ */ new Map();
        this.defs = this.jax.svg("defs");
      }
      getCache() {
        return this.defs;
      }
    };
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/common.js
function CommonMathJaxNewcmFontMixin(Base2) {
  var _a2;
  return _a2 = class extends Base2 {
  }, _a2.defaultVariants = [
    ...FontData.defaultVariants,
    ["-size3", "normal"],
    ["-size4", "normal"],
    ["-size5", "normal"],
    ["-size6", "normal"],
    ["-size7", "normal"],
    ["-lf-tp", "normal"],
    ["-rt-bt", "normal"],
    ["-ex-md", "normal"],
    ["-bbold", "normal"],
    ["-upsmall", "normal"],
    ["-uplarge", "normal"]
  ], _a2.VariantSmp = Object.assign(Object.assign({}, FontData.VariantSmp), { "-bbold": [120120, 120146, , , 120792] }), _a2.defaultCssFonts = Object.assign(Object.assign({}, FontData.defaultCssFonts), JSON.parse(`{
 "-size3":["serif",false,false],"-size4":["serif",false,false],"-size5":["serif",false,false],"-size6":["serif",false,false],"-size7":["serif",false,false],"-lf-tp":["serif",false,false],
 "-rt-bt":["serif",false,false],"-ex-md":["serif",false,false],"-bbold":["serif",false,false],"-upsmall":["serif",false,false],"-uplarge":["serif",false,false]
}`)), _a2.defaultAccentMap = {
    94: "ˆ",
    126: "˜",
    768: "ˋ",
    769: "ˊ",
    770: "ˆ",
    771: "˜",
    772: "ˉ",
    774: "˘",
    775: "˙",
    776: "¨",
    778: "˚",
    780: "ˇ",
    8594: "\u20D7"
  }, _a2.defaultParams = Object.assign(Object.assign({}, FontData.defaultParams), { x_height: 0.442 }), _a2.defaultSizeVariants = [
    "normal",
    "-smallop",
    "-largeop",
    "-size3",
    "-size4",
    "-size5",
    "-size6",
    "-size7"
  ], _a2.defaultStretchVariants = [
    "normal",
    "-ex-md",
    "-size3",
    "-lf-tp",
    "-rt-bt"
  ], _a2;
}
var init_common2 = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/common.js"() {
    init_FontData();
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/normal.js
var normal;
var init_normal = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/normal.js"() {
    normal = JSON.parse(__kittexJson0 + __kittexJson1 + __kittexJson2 + __kittexJson3 + __kittexJson4 + __kittexJson5 + __kittexJson6 + __kittexJson7);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/bold.js
var bold;
var init_bold = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/bold.js"() {
    bold = JSON.parse(__kittexJson8);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/italic.js
var italic;
var init_italic = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/italic.js"() {
    italic = JSON.parse(__kittexJson9);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/bold-italic.js
var boldItalic;
var init_bold_italic = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/bold-italic.js"() {
    boldItalic = JSON.parse(__kittexJson10);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/double-struck.js
var doubleStruck;
var init_double_struck = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/double-struck.js"() {
    doubleStruck = {};
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/fraktur.js
var fraktur;
var init_fraktur = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/fraktur.js"() {
    fraktur = {};
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/fraktur-bold.js
var frakturBold;
var init_fraktur_bold = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/fraktur-bold.js"() {
    frakturBold = {};
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/sans-serif.js
var sansSerif;
var init_sans_serif = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/sans-serif.js"() {
    sansSerif = JSON.parse(`{
 "717":[-0.208,0.286,0.333,{"ic":0.038,"p":"371-247C371-221 354-208 320-208L11-208C-17-208-38-224-38-247C-38-270-17-286 11-286L321-286C350-286 371-271 371-247"}],
 "767":[-0.023,0.277,0,{"dx":0.274,"p":"2-127L-444-127C-413-93-399-66-390-26L-389-25C-389-24-391-23-392-23L-432-23C-433-23-434-23-434-24C-444-61-460-87-478-105C-502-129-531-141-551-148C-552-148-552-149-552-150C-552-151-552-152-551-152C-531-159-502-171-478-195C-460-213-444-239-434-276C-434-277-433-277-432-277L-392-277C-391-277-389-276-389-275L-390-274C-400-234-413-206-444-172L2-172C3-172 4-171 4-170L4-130C4-129 3-127 2-127"}],
 "824":[0.749,0.25,0,{"p":"-411-250C-395-250-383-239-376-218L-64 686C-59 700-57 710-57 715C-57 738-68 749-90 749C-107 749-118 739-125 718L-435-181C-441-198-444-210-444-215C-444-233-430-250-411-250"}],
 "8192":[0,0,0.5,{"p":""}],
 "8193":[0,0,1,{"p":""}],
 "8194":[0,0,0.5,{"p":""}],
 "8195":[0,0,1,{"p":""}],
 "8196":[0,0,0.333,{"p":""}],
 "8197":[0,0,0.25,{"p":""}],
 "8198":[0,0,0.167,{"p":""}],
 "8199":[0,0,0.5,{"p":""}],
 "8200":[0,0,0.278,{"p":""}],
 "8201":[0,0,0.2,{"p":""}],
 "8202":[0,0,0.028,{"p":""}],
 "8203":[0,0,0,{"p":""}],
 "8204":[0,0,0,{"p":""}],
 "8205":[0,0,0,{"p":""}],
 "8356":[0.694,0.022,0.667,{"p":"600 154L515 154C515 109 499 63 459 63C438 63 410 68 374 77C309 94 257 102 220 103C249 152 266 200 271 246L271 247L403 247L403 318L270 318C268 340 260 361 256 376L403 376L403 447L229 447C226 462 224 475 224 487C224 552 274 609 339 609C404 609 449 552 449 485L534 485C534 542 516 591 479 632C442 673 396 694 339 694C275 694 223 668 184 617C154 578 139 534 139 487C139 474 140 460 142 447L67 447L67 376L166 376L178 344C182 333 184 324 185 318L67 318L67 247L186 247C177 191 139 124 73 45L139-10C152 6 172 15 197 17C224 19 247 18 268 14C322 2 401-22 459-22C547-22 600 63 600 154"}],
 "8599":[0.718,-0.001,0.778,{"p":"724 423L757 457C746 476 739 489 734 496C717 526 708 563 708 606C708 633 714 663 725 698C686 683 653 676 624 676C576 676 530 690 486 718L482 718L451 685C508 650 566 632 624 632L629 632L80 59C64 42 56 30 56 23C56 8 64 1 79 1C87 1 95 5 102 13L663 599C666 536 687 477 724 423"}],
 "8600":[0.694,0.024,0.778,{"p":"628 63L624 63C567 63 509 45 451 9L482-24L486-24C531 5 577 19 624 19C653 19 686 12 725-3C714 30 708 61 708 88C708 137 724 187 757 238L724 271C686 218 666 159 663 96L115 668C98 685 86 694 79 694C64 694 56 686 56 671C56 664 60 656 67 649"}],
 "8710":[0.694,0,0.833,{"p":"39 0L792 0L463 694L368 694M405 610L642 91L167 91L335 449C358 503 385 553 405 610"}],
 "8902":[0.491,0.006,0.5,{"ic":0.023,"p":"251 167L420-6L308 209L523 314L286 275L254 491L247 491L215 275L-24 317L193 209L82-6"}],
 "8994":[0.363,-0.133,0.778,{"p":"98 133C103 133 108 134 111 135C126 146 137 156 143 164C200 243 282 288 388 288C498 288 586 233 635 166C646 151 654 141 660 138C666 135 673 133 682 133C709 137 722 151 722 175C722 198 694 234 637 282C573 336 490 363 388 363C289 363 192 328 138 281C83 234 55 199 55 175C55 152 75 133 98 133"}],
 "9675":[0.772,0.272,1.111,{"p":"1054 250C1054 407 988 539 904 623C806 722 690 772 555 772C466 772 384 749 307 704C167 621 55 460 55 250C55 194 58 153 64 126C73 87 93 40 124-15C203-153 351-272 554-272C643-272 725-249 802-204C942-122 1054 41 1054 250M969 439C994 379 1006 316 1006 250C1006 163 986 83 945 10C874-117 738-224 553-224C474-224 400-204 331-163C204-88 103 60 103 250C103 379 146 490 232 582C320 677 428 724 556 724C614 724 671 712 726 688C839 638 920 555 969 439"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/sans-serif-bold.js
var sansSerifBold;
var init_sans_serif_bold = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/sans-serif-bold.js"() {
    sansSerifBold = JSON.parse(`{
 "717":[-0.253,0.389,0.367,{"ic":0.067,"p":"-68-321C-68-338-59-389 11-389L358-389C420-389 434-345 434-321C434-301 424-253 357-253L10-253C-55-253-68-299-68-321"}],
 "767":[-0.025,0.319,0,{"dx":0.294,"p":"2-214L2-130L-450-130C-417-94-401-66-392-25L-462-25C-485-113-555-159-590-172C-555-185-485-231-462-319L-392-319C-402-278-417-250-450-214"}],
 "824":[0.759,0.257,0,{"p":"-435-257L-495-233L-113 759L-53 735"}],
 "8192":[0,0,0.55,{"p":""}],
 "8193":[0,0,1.1,{"p":""}],
 "8194":[0,0,0.55,{"p":""}],
 "8195":[0,0,1.1,{"p":""}],
 "8196":[0,0,0.367,{"p":""}],
 "8197":[0,0,0.275,{"p":""}],
 "8198":[0,0,0.183,{"p":""}],
 "8199":[0,0,0.55,{"p":""}],
 "8200":[0,0,0.305,{"p":""}],
 "8201":[0,0,0.22,{"p":""}],
 "8202":[0,0,0.031,{"p":""}],
 "8203":[0,0,0,{"p":""}],
 "8204":[0,0,0,{"p":""}],
 "8205":[0,0,0,{"p":""}],
 "8356":[0.694,0.047,0.733,{"p":"162 197C130 129 84 84 48 46L137-47C148-36 182 14 243 14C320 14 402-22 482-22C580-22 658 34 658 201L525 201C525 119 505 114 482 114C456 114 431 119 406 125C367 134 328 142 289 147C300 169 307 190 309 197L440 197L440 297L335 297L339 357L440 357L440 457L345 457C348 505 355 558 398 558C446 558 484 467 484 391L611 391C611 561 516 694 398 694C288 694 217 583 210 464L209 457L73 457L73 357L200 357L195 297L73 297L73 197"}],
 "8599":[0.734,0.023,0.856,{"p":"128-23L674 524C674 452 703 316 765 254L825 314C735 425 742 605 801 664L755 710C696 651 516 644 405 734L345 674C407 612 543 583 615 583L68 37"}],
 "8600":[0.72,0.037,0.856,{"p":"67 660L127 720L673 173C673 245 702 381 764 443L824 383C734 272 741 92 800 33L754-13C695 46 515 53 404-37L344 23C406 85 542 114 614 114"}],
 "8710":[0.694,0,0.916,{"p":"243 128L448 577L449 577L655 128M363 694L47 0L873 0L551 694"}],
 "8902":[0.519,0.031,0.55,{"ic":0.015,"p":"371 195L565 286L544 348L335 306L307 519L242 518L217 306L6 346L-13 284L181 195L78 7L131-31L275 126L276 126L423-30L475 9"}],
 "8994":[0.381,-0.095,0.856,{"p":"424 276C556 276 646 236 722 95L809 154C743 301 598 381 424 381C250 381 105 301 39 154L126 95C202 236 292 276 424 276"}],
 "9675":[0.772,0.272,1.222,{"p":"60 251C60-10 170-272 609-272C1049-272 1159-11 1159 249C1159 513 1049 772 609 772C170 772 60 510 60 251M143 250C143 576 327 689 610 689C860 689 1075 601 1075 252C1075-101 865-189 609-189C359-189 143-101 143 250"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/sans-serif-italic.js
var sansSerifItalic;
var init_sans_serif_italic = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/sans-serif-italic.js"() {
    sansSerifItalic = JSON.parse(`{
 "717":[-0.208,0.286,0.333,{"p":"319-247C319-221 302-208 268-208L-41-208C-69-208-90-224-90-247C-90-270-69-286-41-286L269-286C298-286 319-271 319-247"}],
 "767":[-0.023,0.277,0,{"dx":0.272,"p":"7-127L-439-127C-401-93-382-66-364-26L-362-25C-362-24-364-23-365-23L-405-23C-406-23-407-23-407-24C-425-61-446-87-468-105C-497-129-530-141-551-148C-552-148-552-149-552-150C-552-151-552-152-551-152C-532-159-507-171-488-195C-474-213-463-239-461-276C-461-277-460-277-459-277L-419-277C-418-277-416-276-416-275L-416-274C-417-234-425-206-449-172L-3-172C-2-172 0-171 0-170L8-130C8-129 8-127 7-127"}],
 "824":[0.749,0.25,0,{"p":"62 749C48 749 36 740 25 721L-475-176C-486-195-491-208-491-215C-491-234-476-250-457-250C-436-248-431-240-419-218L82 681C91 698 96 709 96 716C96 735 81 749 62 749"}],
 "8192":[0,0,0.5,{"p":""}],
 "8193":[0,0,0.5,{"p":""}],
 "8194":[0,0,0.333,{"p":""}],
 "8195":[0,0,0.25,{"p":""}],
 "8196":[0,0,0.167,{"p":""}],
 "8197":[0,0,0.5,{"p":""}],
 "8198":[0,0,0.278,{"p":""}],
 "8199":[0,0,0.2,{"p":""}],
 "8200":[0,0,0.028,{"p":""}],
 "8201":[0,0,0,{"p":""}],
 "8202":[0,0,0,{"p":""}],
 "8203":[0,0,0,{"p":""}],
 "8204":[0,0,0,{"p":""}],
 "8205":[0,0,0,{"p":""}],
 "8356":[0.694,0.022,0.667,{"p":"632 154L547 154C540 113 513 63 471 63C450 63 423 68 390 77C329 94 280 102 242 103C281 153 308 201 322 246L323 247L455 247L470 318L338 318L338 346C338 355 337 364 335 372L335 376L483 376L497 447L323 447L323 452C323 492 337 529 366 561C395 593 429 609 468 609C521 609 555 571 555 519C555 508 554 497 551 485L636 485C640 503 642 520 642 536C642 573 632 605 611 634C582 674 540 694 485 694C421 694 364 669 314 619C264 569 239 511 236 447L161 447L146 376L245 376C250 346 252 329 252 326L252 318L134 318L119 247L237 247C216 191 164 124 82 45L137-10C153 6 174 15 201 17C228 19 251 18 271 14C323 2 399-22 455-22C548-22 615 71 632 154"}],
 "8599":[0.718,-0.001,0.778,{"ic":0.095,"p":"831 554C831 593 845 642 873 699C834 684 799 676 767 676C720 676 677 690 638 718L634 718L596 685C647 650 702 632 760 632L84 53C68 40 60 29 60 21C60 8 66 1 78 1C86 1 95 6 106 15L789 598C786 581 785 563 785 544C785 506 795 466 814 423L854 457C839 490 831 523 831 554"}],
 "8600":[0.694,0.025,0.778,{"ic":0.029,"p":"199 665C200 660 203 654 208 647L643 63L636 63C573 63 512 45 453 10L478-25C535 4 585 19 628 19C656 19 688 12 723-2C723 5 720 30 720 37C720 105 749 171 807 236L781 272C732 221 700 162 683 96L249 679C241 689 233 694 226 694C210 691 199 683 199 665"}],
 "8710":[0.694,0,0.833,{"p":"37 0L791 0L610 694L514 694M534 609L661 91L186 91L423 439C478 520 515 576 534 609"}],
 "8902":[0.515,0.008,0.5,{"ic":0.09,"p":"351 208L590 315L343 275L358 515L273 275L43 316L236 209L77-8L286 167L416-4"}],
 "8994":[0.364,-0.133,0.778,{"p":"759 180C759 201 743 230 711 268C671 315 613 344 537 357C510 362 486 364 465 363C324 359 208 309 118 214C100 195 91 180 91 167C91 147 103 136 128 133C141 133 153 140 166 153C231 226 325 288 450 288C552 288 624 249 666 171C678 147 682 133 708 133C732 133 759 156 759 180"}],
 "9675":[0.772,0.272,1.111,{"ic":0.008,"p":"1066 122C1101 199 1119 278 1119 358C1119 478 1081 577 1006 655C931 733 833 772 713 772C636 772 560 754 485 719C332 648 220 534 149 378C114 301 96 222 96 142C96 22 134-77 209-155C284-233 382-272 501-272C578-272 655-254 730-219C883-148 995-34 1066 122M714 724C820 724 906 690 972 621C1038 552 1071 465 1071 358C1071 285 1055 213 1023 141C958-2 855-108 712-175C643-208 572-224 501-224C395-224 309-190 243-121C177-52 144 35 144 142C144 215 160 288 192 359C258 504 362 609 503 675C573 708 643 724 714 724"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/sans-serif-bold-italic.js
var sansSerifBoldItalic;
var init_sans_serif_bold_italic = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/sans-serif-bold-italic.js"() {
    sansSerifBoldItalic = JSON.parse(`{
 "717":[-0.253,0.389,0.367,{"ic":0.003,"p":"-136-321C-140-338-142-389-72-389L275-389C337-389 361-345 366-321C370-301 370-253 303-253L-44-253C-109-253-131-299-136-321"}],
 "767":[-0.025,0.319,0,{"dx":0.327,"p":"-43-214L-26-130L-478-130C-437-94-415-66-397-25L-467-25C-509-113-589-159-627-172C-595-185-534-231-530-319L-460-319C-461-278-470-250-495-214"}],
 "824":[0.759,0.257,0,{"p":"-490-257L-545-233L48 759L103 735"}],
 "8192":[0,0,0.55,{"p":""}],
 "8193":[0,0,1.1,{"p":""}],
 "8194":[0,0,0.55,{"p":""}],
 "8195":[0,0,1.1,{"p":""}],
 "8196":[0,0,0.367,{"p":""}],
 "8197":[0,0,0.275,{"p":""}],
 "8198":[0,0,0.183,{"p":""}],
 "8199":[0,0,0.55,{"p":""}],
 "8200":[0,0,0.305,{"p":""}],
 "8201":[0,0,0.22,{"p":""}],
 "8202":[0,0,0.031,{"p":""}],
 "8203":[0,0,0,{"p":""}],
 "8204":[0,0,0,{"p":""}],
 "8205":[0,0,0,{"p":""}],
 "8356":[0.694,0.047,0.733,{"p":"204 197C158 129 102 84 58 46L127-47C140-36 185 14 246 14C323 14 397-22 477-22C575-22 666 34 701 201L568 201C551 119 529 114 506 114C480 114 457 119 433 125C396 134 358 142 320 147C336 169 348 190 351 197L482 197L503 297L398 297L415 357L516 357L537 457L442 457C455 505 474 558 517 558C565 558 583 467 567 391L694 391C730 561 664 694 546 694C436 694 341 583 309 464L306 457L170 457L149 357L276 357L258 297L136 297L115 197"}],
 "8599":[0.734,0.023,0.856,{"ic":0.086,"p":"123-23L785 524C770 452 770 316 819 254L892 314C826 425 870 605 942 664L906 710C834 651 653 644 561 734L488 674C537 612 667 583 739 583L76 37"}],
 "8600":[0.72,0.037,0.856,{"ic":0.049,"p":"207 660L280 720L710 173C725 245 783 381 858 443L905 383C791 272 761 92 807 33L751-13C705 46 526 53 396-37L349 23C424 85 566 114 638 114"}],
 "8710":[0.694,0,0.916,{"p":"270 128L571 577L572 577L682 128M511 694L47 0L873 0L699 694"}],
 "8902":[0.519,0.031,0.55,{"ic":0.076,"p":"412 195L626 286L618 348L400 306L417 519L352 518L282 306L80 346L47 284L222 195L79 7L124-31L302 126L303 126L417-30L477 9"}],
 "8994":[0.381,-0.095,0.856,{"p":"483 276C615 276 696 236 742 95L842 154C807 301 679 381 505 381C331 381 169 301 72 154L146 95C252 236 351 276 483 276"}],
 "9675":[0.772,0.272,1.222,{"ic":0.046,"p":"113 251C58-10 112-272 551-272C991-272 1157-11 1212 249C1268 513 1213 772 773 772C334 772 168 510 113 251M196 250C265 576 473 689 756 689C1006 689 1203 601 1129 252C1054-101 825-189 569-189C319-189 121-101 196 250"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/monospace.js
var monospace;
var init_monospace = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/monospace.js"() {
    monospace = JSON.parse(`{
 "717":[-0.025,0.095,0.525,{"ic":0.035,"p":"11-95L517-95C546-95 560-83 560-60C560-37 545-25 516-25L15-25C-18-25-34-37-34-60C-34-82-14-95 11-95"}],
 "767":[-0.008,0.359,0.525,{"p":"16-184C16-199 26-211 42-219C79-248 99-280 103-313C106-344 120-359 145-359C170-359 182-348 182-326C182-295 170-260 145-221L456-221C469-221 478-221 481-220C499-215 508-203 508-184C508-165 499-152 481-147C478-146 469-146 456-146L145-146C170-107 182-72 182-42C182-19 170-8 145-8C120-8 110-21 105-45C96-88 79-119 54-138C29-157 16-172 16-184"}],
 "824":[0.694,0.083,0.525,{"p":"92-83C107-83 118-74 127-55L458 635C463 645 465 653 465 660C465 683 454 694 432 694C418 694 407 685 398 667L67-21C61-34 58-43 58-49C58-68 73-83 92-83"}],
 "8193":[0,0,0.525,{"p":""}],
 "8195":[0,0,0.525,{"p":""}],
 "8199":[0,0,0.525,{"p":""}],
 "8200":[0,0,0.525,{"p":""}],
 "8356":[0.611,0.011,0.525,{"p":"507 146C507 167 490 184 469 184C448 184 430 167 430 146C430 93 417 66 392 66C378 66 364 69 349 75C328 84 304 99 275 120C274 146 267 174 254 205L284 205C305 205 322 223 322 244C322 264 304 282 284 282L217 282C209 299 202 315 195 330L284 330C305 330 322 347 322 368C322 389 304 407 284 407L173 407C172 416 171 423 171 429C171 487 218 534 276 534C324 534 356 516 373 479C365 470 361 460 361 449C361 423 383 402 409 402C434 402 456 424 456 449C456 542 372 611 276 611C175 611 95 530 95 429C95 423 95 416 96 407L86 407C65 407 48 389 48 368C48 347 65 330 86 330L118 330C124 315 131 299 140 282L86 282C65 282 48 264 48 244C48 223 65 205 86 205L177 205C181 195 185 185 188 174C174 179 160 182 146 182C82 182 18 145 18 85C18 31 63-11 116-11C183-11 230 11 258 54C297 25 321 8 329 5L348-3C360-8 375-11 392-11C466-11 507 67 507 146M146 105C162 105 178 101 195 94C184 75 158 66 116 66C102 66 95 72 95 85C95 98 112 105 146 105"}],
 "8599":[0.619,0,0.525,{"ic":0.035,"p":"75 0C88 0 101 8 113 25L415 456C420 463 425 469 428 474C442 439 485 358 521 358C540 358 560 381 560 400C560 409 555 419 545 429C505 469 486 510 488 553C490 592 479 611 456 611C449 611 436 608 416 602C396 596 381 594 369 594C354 594 334 598 310 606C286 614 270 619 263 619C244 619 224 597 224 578C224 559 242 544 277 533C309 524 338 519 365 518L52 73C42 58 37 47 37 39C37 18 55 0 75 0"}],
 "8600":[0.611,0.008,0.525,{"ic":0.035,"p":"263-8C270-8 286-4 310 4C334 12 354 17 369 17C380 17 396 14 416 8C436 2 449 0 456 0C477 0 487 13 487 39C487 97 504 139 538 175C553 191 560 203 560 211C560 230 540 253 521 253C486 253 440 171 429 138L113 586C101 603 88 611 75 611C50 611 37 598 37 573C37 564 42 554 51 541L365 93C342 92 314 88 280 79C243 69 224 54 224 33C224 14 244-8 263-8"}],
 "8710":[0.651,0,0.525,{"p":"459 0C480 0 490 9 490 26C490 31 489 38 486 47L319 617C312 640 296 651 271 651L254 651C228 651 211 637 202 609L36 40C35 35 34 30 34 26C34 9 45 0 68 0M262 551L397 75L127 75"}],
 "8902":[0.555,-0.057,0.525,{"p":"1 357C1 342 12 331 35 323C104 298 156 280 191 267L202 264C165 209 126 157 91 100L89 93L89 84C92 70 101 61 117 57L127 58L135 60L261 220C335 123 375 72 381 66C387 60 395 58 406 57C421 60 431 69 434 84L434 94L322 263C345 271 362 277 374 282L489 323C511 331 522 342 522 357C522 378 512 389 491 389C486 389 473 386 452 380C359 352 308 337 299 335C298 367 298 397 297 425L297 501C294 537 282 555 262 555C248 555 239 549 234 537C232 532 229 465 225 335C157 354 106 369 72 380C52 386 38 389 31 389C15 389 1 373 1 357"}],
 "8994":[0.414,-0.195,0.525,{"p":"486 233C486 239 483 249 477 263C462 295 438 327 405 358C364 395 317 414 262 414C191 414 127 374 93 332C56 286 37 253 37 233C37 212 55 195 75 195C91 195 105 207 117 232C154 306 202 343 262 343C311 343 354 316 389 261C391 259 397 249 406 230C414 216 420 207 425 202C430 197 438 195 449 195C469 195 486 212 486 233"}],
 "9675":[0.705,0.233,0.525,{"ic":0.075,"p":"264-233C370-233 455-179 519-71C573 20 600 123 600 236C600 349 573 452 519 543C454 651 369 705 263 705C200 705 143 684 91 641C-8 560-75 412-75 236C-75 121-48 19 7-72C71-179 157-233 264-233M263 629C346 629 413 582 462 487C503 410 523 326 523 235C523 144 503 60 462-17C412-110 345-157 262-157C178-157 111-110 62-16C22 61 2 145 2 237C2 328 22 412 63 489C113 582 180 629 263 629"}],
 "64263":[0,0,0.525,{"p":""}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/smallop.js
var smallop;
var init_smallop = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/smallop.js"() {
    smallop = JSON.parse(__kittexJson11);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/largeop.js
var largeop;
var init_largeop = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/largeop.js"() {
    largeop = JSON.parse(__kittexJson12);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/size3.js
var size3;
var init_size3 = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/size3.js"() {
    size3 = JSON.parse(`{
 "40":[0.972,0.472,0.523,{"p":"444-472C455-472 461-466 461-455C461-449 459-445 454-442C382-387 325-294 282-164C245-53 226 57 226 164L226 336C226 443 245 552 282 664C325 793 382 886 454 942C459 945 461 949 461 955C461 966 455 972 444 972C440 972 437 971 434 968C353 905 285 809 232 681C181 560 156 445 156 336L156 164C156 55 181-60 232-181C285-310 353-405 434-468C437-471 440-472 444-472"}],
 "41":[0.972,0.472,0.523,{"p":"89-468C170-405 238-310 291-181C342-60 367 55 367 164L367 336C367 445 342 560 291 681C238 810 170 905 89 968C85 971 82 972 79 972C68 972 62 966 62 955C62 950 64 945 68 942C140 887 198 795 241 664C278 552 297 443 297 336L297 164C297 57 278-52 241-164C198-295 140-387 68-442C64-445 62-450 62-455C62-466 68-472 79-472C82-472 86-471 89-468"}],
 "47":[1.374,0.874,0.964,{"p":"907 1333C908 1337 909 1341 909 1344C909 1364 899 1374 878 1374C864 1374 855 1367 850 1354L58-833C57-835 57-839 57-844C57-864 67-874 87-874C101-874 110-867 115-854"}],
 "91":[0.975,0.475,0.444,{"p":"387-475C405-475 414-466 414-447C414-428 405-419 387-419L280-419L280 919L387 919C405 919 414 928 414 947C414 966 405 975 387 975L226 975L226-475"}],
 "92":[1.374,0.874,0.964,{"p":"877-874C898-874 908-864 908-844C908-841 907-837 906-833L114 1354C109 1367 100 1374 86 1374C66 1374 56 1364 56 1344C56 1339 56 1335 57 1333L849-854C854-867 863-874 877-874"}],
 "93":[0.975,0.475,0.444,{"p":"57-475L218-475L218 975L57 975C39 975 30 966 30 947C30 928 39 919 57 919L164 919L164-419L57-419C39-419 30-428 30-447C30-466 39-475 57-475"}],
 "123":[0.975,0.475,0.624,{"p":"196 250C270 279 353 341 353 431L353 790C353 865 436 925 507 935C518 937 524 944 524 955C524 968 517 975 504 975L502 975C447 966 398 947 353 918C298 881 271 839 271 790L271 431C271 347 192 281 117 270C106 268 100 261 100 250C100 239 106 232 117 230C160 223 196 204 226 172C256 140 271 105 271 69L271-290C271-339 298-381 353-418C398-447 447-466 502-475L504-475C517-475 524-468 524-455C524-444 518-437 507-435C436-425 353-365 353-290L353 69C353 159 270 221 196 250"}],
 "125":[0.975,0.475,0.624,{"p":"427 250C354 221 271 159 271 69L271-290C271-366 188-425 116-435C105-437 100-444 100-455C100-468 107-475 120-475L122-475C177-466 226-447 271-418C326-381 353-339 353-290L353 69C353 152 431 219 507 230C518 232 524 239 524 250C524 261 518 268 507 270C431 281 353 348 353 431L353 790C353 839 326 881 271 918C226 947 177 966 122 975L120 975C107 975 100 968 100 955C100 944 105 937 116 935C188 925 271 866 271 790L271 431C271 341 354 279 427 250"}],
 "770":[0.747,-0.571,0.919,{"ic":0.001,"p":"911 571L920 601C772 654 619 703 460 747C299 702 145 653-1 601L8 571C155 602 306 639 460 680C612 639 762 602 911 571"}],
 "771":[0.757,-0.543,0.931,{"p":"928 732C930 735 931 738 931 741C931 752 925 757 914 757C908 757 904 754 901 749C879 718 852 695 821 680C764 652 708 638 655 638C616 638 556 652 477 681C392 711 324 726 274 726C143 726 64 654 3 568C1 565 0 562 0 559C0 548 6 543 17 543C23 543 28 545 31 550C52 581 79 605 110 620C167 648 223 662 276 662C316 662 376 648 455 619C540 589 608 574 657 574C788 574 867 646 928 732"}],
 "774":[0.743,-0.577,0.937,{"ic":0.001,"p":"866 641C899 660 923 691 938 733L906 743C895 715 876 695 847 683C809 668 773 658 740 654C667 644 627 641 536 641L400 641C343 641 297 643 261 647L197 654C164 658 128 668 90 683C60 696 40 716 31 743L-1 733C14 690 38 660 70 641C109 618 148 603 185 596C291 578 360 577 468 577C575 577 646 578 752 596C789 603 827 618 866 641"}],
 "780":[0.741,-0.565,0.919,{"ic":0.001,"p":"460 565C619 609 772 658 920 711L911 741C762 710 612 673 460 632C306 673 155 710 8 741L-1 711C145 659 299 610 460 565"}],
 "8260":[1.374,0.874,0.964,{"p":"907 1333C908 1337 909 1341 909 1344C909 1364 899 1374 878 1374C864 1374 855 1367 850 1354L58-833C57-835 57-839 57-844C57-864 67-874 87-874C101-874 110-867 115-854"}],
 "8725":[0.61,0.109,0.581,{"p":"520 563C524 569 526 574 526 579C526 600 516 610 496 610C485 610 477 605 471 595L62-63C59-67 57-72 57-79C57-99 67-109 86-109C97-109 106-104 111-95"}],
 "8726":[0.61,0.109,0.581,{"p":"496-109C516-109 526-99 526-79C526-74 524-69 520-63L111 595C105 605 97 610 86 610C67 610 57 600 57 579C57 572 59 567 62 563L470-95C475-104 483-109 496-109"}],
 "8730":[1.45,0.951,1,{"ic":0.02,"p":"467-733L254 260L119 47C114 40 111 36 111 33C111 29 117 22 130 11L194 113L422-950C461-950 464-951 471-921L1016 1404C1019 1416 1020 1423 1020 1426C1020 1442 1012 1450 996 1450C984 1450 976 1440 971 1420"}],
 "8739":[1.117,0.617,0.333,{"p":"145-580C145-596 145-617 166-617C188-617 189-597 189-580L189 1080C189 1096 188 1117 167 1117C145 1117 145 1097 145 1080"}],
 "8741":[1.117,0.617,0.555,{"p":"203-595L203 1095C203 1107 190 1117 178 1117C166 1117 153 1107 153 1095L153-595C153-607 166-617 178-617C190-617 203-607 203-595M401-595L401 1095C401 1107 388 1117 376 1117C364 1117 351 1107 351 1095L351-595C351-607 364-617 376-617C388-617 401-607 401-595"}],
 "8968":[0.975,0.475,0.499,{"p":"444 919C462 919 471 928 471 947C471 966 462 975 444 975L189 975L189-447C189-466 198-475 216-475C234-475 243-466 243-447L243 919"}],
 "8969":[0.975,0.475,0.499,{"p":"283-475C301-475 310-466 310-447L310 975L55 975C37 975 28 966 28 947C28 928 37 919 55 919L256 919L256-447C256-466 265-475 283-475"}],
 "8970":[0.975,0.475,0.499,{"p":"444-475C462-475 471-466 471-447C471-428 462-419 444-419L243-419L243 947C243 966 234 975 216 975C198 975 189 966 189 947L189-475"}],
 "8971":[0.975,0.475,0.499,{"p":"55-475L310-475L310 947C310 966 301 975 283 975C265 975 256 966 256 947L256-419L55-419C37-419 28-428 28-447C28-466 37-475 55-475"}],
 "9140":[0.742,-0.535,1.485,{"p":"1457 535C1476 535 1485 544 1485 562L1485 742L0 742L0 562C0 544 9 535 28 535C47 535 56 544 56 562L56 688L1429 688L1429 562C1429 544 1438 535 1457 535"}],
 "9141":[-0.105,0.312,1.485,{"p":"0-312L1485-312L1485-132C1485-114 1476-105 1457-105C1438-105 1429-114 1429-132L1429-258L56-258L56-132C56-114 47-105 28-105C9-105 0-114 0-132"}],
 "9180":[0.767,-0.509,2.012,{"p":"1992 509C2005 509 2012 515 2012 528C2012 533 2010 538 2006 542C1932 614 1798 672 1603 715C1446 750 1297 767 1158 767L854 767C715 767 566 750 409 715C214 672 80 614 6 542C2 538 0 533 0 528C0 515 7 509 20 509C25 509 30 511 34 515C99 578 229 627 425 660C570 685 713 697 854 697L1158 697C1299 697 1442 685 1587 660C1783 627 1913 578 1978 515C1982 511 1987 509 1992 509"}],
 "9181":[-0.079,0.337,2.012,{"p":"2006-112C2010-108 2012-103 2012-98C2012-85 2005-79 1992-79C1987-79 1982-81 1978-85C1913-148 1783-197 1587-230C1442-255 1299-267 1158-267L854-267C713-267 570-255 425-230C229-197 99-148 34-85C30-81 25-79 20-79C7-79 0-85 0-98C0-103 2-108 6-112C80-184 214-242 409-285C566-320 715-337 854-337L1158-337C1297-337 1446-320 1603-285C1798-242 1932-184 2006-112"}],
 "9182":[0.825,-0.506,1.996,{"p":"1984 506C1992 506 1996 510 1996 518L1996 520C1976 573 1934 617 1870 652C1811 684 1751 700 1690 700L1292 700C1231 700 1176 706 1126 719C1049 739 1010 770 1010 813C1010 821 1006 825 998 825C990 825 986 821 986 813C986 770 947 739 870 719C820 706 765 700 704 700L306 700C245 700 185 684 126 652C62 617 20 573 0 520L0 518C0 510 4 506 12 506C17 506 21 508 24 513C39 554 79 585 146 606C197 622 250 630 306 630L704 630C762 630 817 640 870 661C933 686 976 720 998 765C1020 720 1063 686 1126 661C1179 640 1234 630 1292 630L1690 630C1746 630 1799 622 1850 606C1917 585 1957 554 1972 513C1975 508 1979 506 1984 506"}],
 "9183":[-0.075,0.394,1.996,{"p":"1690-270C1751-270 1811-254 1870-222C1934-187 1976-143 1996-90L1996-87C1996-79 1992-75 1984-75C1980-75 1976-78 1972-83C1957-124 1917-155 1850-176C1799-192 1746-200 1690-200L1292-200C1234-200 1179-210 1126-231C1063-256 1020-290 998-335C976-290 933-256 870-231C817-210 762-200 704-200L306-200C250-200 197-192 146-176C79-155 39-124 24-83C20-78 16-75 12-75C4-75 0-79 0-87L0-90C20-143 62-187 126-222C185-254 245-270 306-270L704-270C764-270 819-276 870-289C947-308 986-339 986-382C986-390 990-394 998-394C1006-394 1010-390 1010-382C1010-339 1049-308 1126-289C1177-276 1232-270 1292-270"}],
 "9184":[0.858,-0.61,2.056,{"ic":0.006,"p":"1975 610L2062 610L1807 858L249 858L-6 610L81 610L253 777L1803 777"}],
 "9185":[-0.18,0.428,2.056,{"ic":0.006,"p":"1807-428L2062-180L1975-180L1803-347L253-347L81-180L-6-180L249-428"}],
 "10214":[0.975,0.475,0.555,{"p":"505-475C523-475 532-466 532-447C532-428 523-419 505-419L390-419L390 919L505 919C523 919 532 928 532 947C532 966 523 975 505 975L170 975L170-475M335 919L335-419L225-419L225 919"}],
 "10215":[0.975,0.475,0.555,{"p":"50-475L385-475L385 975L50 975C32 975 23 966 23 947C23 928 32 919 50 919L165 919L165-419L50-419C32-419 23-428 23-447C23-466 32-475 50-475M330 919L330-419L220-419L220 919"}],
 "10216":[0.975,0.475,0.537,{"p":"449-475C467-475 476-466 476-447C476-444 475-441 474-437L211 250L474 937C475 941 476 944 476 947C476 966 467 975 449 975C436 975 428 969 424 958L156 260C155 257 154 253 154 250C154 247 155 243 156 240L424-458C428-469 436-475 449-475"}],
 "10217":[0.975,0.475,0.537,{"p":"381 240C382 243 383 247 383 250C383 253 382 257 381 260L113 958C109 969 101 975 88 975C70 975 61 966 61 947C61 944 62 941 63 937L326 250L63-437C62-441 61-444 61-447C61-466 70-475 88-475C101-475 109-469 113-458"}],
 "10218":[0.975,0.475,0.781,{"p":"692-475C711-475 720-466 720-447C720-444 719-441 718-437L452 250L718 937C719 941 720 944 720 947C720 966 711 975 692 975C679 975 671 969 666 958L396 260C395 258 395 255 395 250C395 245 395 242 396 240L666-458C671-469 679-475 692-475M452-475C470-475 479-466 479-447C479-444 478-441 477-437L211 250L477 937C478 941 479 944 479 947C479 966 470 975 452 975C439 975 431 969 426 958L156 260C155 257 154 253 154 250C154 247 155 243 156 240L426-458C431-469 439-475 452-475"}],
 "10219":[0.975,0.475,0.781,{"p":"625 240C626 243 627 247 627 250C627 253 626 257 625 260L355 958C350 969 342 975 329 975C311 975 302 966 302 947C302 942 302 939 303 937L570 250L303-437C302-439 302-442 302-447C302-466 311-475 329-475C342-475 350-469 355-458M384 240C385 243 386 247 386 250C386 253 385 257 384 260L114 958C109 969 101 975 89 975C70 975 61 966 61 947C61 944 62 941 63 937L329 250L63-437C62-441 61-444 61-447C61-466 70-475 89-475C101-475 109-469 114-458"}],
 "10222":[0.991,0.491,0.37,{"p":"295-491C308-491 314-484 314-471C314-466 312-461 308-457C272-420 245-329 228-184C217-87 211 12 211 113L211 387C211 488 217 587 228 684C245 829 272 920 308 957C312 961 314 966 314 971C314 984 308 991 295 991C290 991 286 989 282 985C237 938 200 843 173 700C152 587 142 483 142 387L142 113C142 17 152-87 173-200C200-343 237-438 282-485C286-489 290-491 295-491"}],
 "10223":[0.991,0.491,0.37,{"p":"88-485C133-438 170-343 197-200C218-87 228 17 228 113L228 387C228 483 218 587 197 700C170 843 133 938 88 985C84 989 80 991 75 991C62 991 56 984 56 971C56 966 58 961 62 957C98 920 125 829 142 684C153 587 159 488 159 387L159 113C159 12 153-87 142-184C125-329 98-420 62-457C58-461 56-466 56-471C56-484 62-491 75-491C80-491 84-489 88-485"}],
 "10627":[0.975,0.475,0.624,{"p":"486-431L486 931C501 935 524 936 524 955C524 968 517 975 504 975L502 975C447 966 398 947 353 918C298 881 271 839 271 790L271 431C271 347 192 281 117 270C106 268 100 261 100 250C100 239 106 232 117 230C160 223 196 204 226 172C256 140 271 105 271 69L271-290C271-329 289-364 326-396C370-436 428-462 502-475L504-475C517-475 524-468 524-455C524-435 509-435 486-431M196 250C270 279 353 341 353 431L353 790C353 835 379 874 431 907L431-407C379-374 353-335 353-290L353 69C353 159 270 221 196 250"}],
 "10628":[0.975,0.475,0.624,{"p":"138 931L138-431C121-435 100-435 100-455C100-468 107-475 120-475L122-475C145-472 168-466 191-458C263-432 353-374 353-290L353 69C353 152 431 219 507 230C518 232 524 239 524 250C524 261 518 268 507 270C431 281 353 348 353 431L353 790C353 839 326 881 271 918C226 947 177 966 122 975L120 975C107 975 100 968 100 955C100 936 123 935 138 931M428 250C354 221 271 159 271 69L271-290C271-335 245-374 193-407L193 907C245 874 271 835 271 790L271 431C271 341 354 279 428 250"}],
 "10629":[0.972,0.472,0.523,{"p":"444-472C455-472 461-466 461-455C461-449 459-445 454-442C419-415 387-377 357-328L357 828C387 877 419 915 454 942C459 945 461 949 461 955C461 966 455 972 444 972C440 972 437 971 434 968C353 905 285 809 232 681C181 560 156 445 156 336L156 164C156 55 181-60 232-181C285-310 353-405 434-468C437-471 440-472 444-472M302 718L302-218C251-95 226 33 226 164L226 336C226 467 251 595 302 718"}],
 "10630":[0.972,0.472,0.523,{"p":"183-468C264-405 332-309 385-181C436-60 461 55 461 164L461 336C461 445 436 560 385 681C332 809 264 905 183 968C180 971 177 972 173 972C162 972 156 966 156 955C156 950 158 945 162 942C197 916 229 878 260 828L260-328C230-377 198-415 163-442C158-445 156-449 156-455C156-466 162-472 173-472C177-472 180-471 183-468M391 336L391 164C391 33 366-95 315-218L315 718C366 595 391 467 391 336"}],
 "10748":[0.966,0.466,0.467,{"p":"408-436C395-341 357-219 296-68C236 79 180 185 127 250C180 315 236 421 296 568C357 719 395 841 408 936C408 948 393 966 381 966C371 966 351 953 350 944C338 849 301 731 239 589C183 463 124 353 62 259C59 256 58 253 58 250C58 247 59 244 62 241C124 147 183 37 239-89C301-231 338-349 350-444C351-453 371-466 381-466C393-466 408-448 408-436"}],
 "10749":[0.966,0.466,0.467,{"p":"58 936C71 841 109 719 170 568C230 421 286 315 339 250C286 185 230 79 170-68C109-219 71-341 58-436C58-448 73-466 85-466C95-466 115-453 116-444C122-397 135-343 154-282C204-124 311 98 404 241C407 244 408 247 408 250C408 253 407 256 404 259C342 353 283 463 227 589C165 731 128 849 116 944C115 953 95 966 85 966C73 966 58 948 58 936"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/size4.js
var size4;
var init_size4 = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/size4.js"() {
    size4 = JSON.parse(`{
 "40":[1.146,0.646,0.597,{"p":"521-646C533-646 539-640 539-628C539-622 537-617 533-613C446-546 376-432 324-271C279-134 257 1 257 133L257 367C257 499 279 634 324 771C376 932 446 1046 533 1113C537 1117 539 1122 539 1128C539 1140 533 1146 521 1146C519 1146 516 1145 511 1144C412 1068 331 950 267 791C208 644 179 502 179 367L179 133C179-2 208-144 267-291C331-450 412-568 511-644C516-645 519-646 521-646"}],
 "41":[1.146,0.646,0.597,{"p":"86-644C185-568 266-450 330-291C389-144 418-2 418 133L418 367C418 502 389 644 330 791C266 950 185 1068 86 1144C81 1145 78 1146 76 1146C64 1146 58 1140 58 1128C58 1122 60 1117 64 1113C151 1046 221 932 273 771C318 634 340 499 340 367L340 133C340 1 318-134 273-271C221-432 151-546 64-613C60-617 58-622 58-628C58-640 64-646 76-646C78-646 81-645 86-644"}],
 "47":[1.722,1.222,1.222,{"p":"1164 1677C1165 1681 1166 1685 1166 1688C1166 1711 1155 1722 1132 1722C1117 1722 1106 1715 1101 1700L58-1177C57-1181 56-1185 56-1188C56-1211 67-1222 90-1222C105-1222 116-1215 121-1200"}],
 "91":[1.15,0.65,0.472,{"p":"448-620C448-601 434-590 419-590L284-590L284 1090L419 1090C434 1090 448 1105 448 1120C448 1135 434 1150 419 1150L226 1150L226-650L419-650C435-650 448-636 448-620"}],
 "92":[1.722,1.222,1.222,{"p":"1132-1222C1155-1222 1166-1211 1166-1188C1166-1185 1165-1181 1164-1177L121 1700C116 1715 105 1722 90 1722C67 1722 56 1711 56 1688C56 1685 57 1681 58 1677L1101-1200C1106-1215 1117-1222 1132-1222"}],
 "93":[1.15,0.65,0.472,{"p":"24 1120C24 1105 38 1090 53 1090L188 1090L188-590L53-590C38-590 24-605 24-620C24-635 38-650 53-650L246-650L246 1150L53 1150C38 1150 24 1135 24 1120"}],
 "123":[1.15,0.65,0.667,{"p":"192 250C277 285 378 367 378 474L378 922C378 1014 470 1089 552 1106C563 1109 569 1116 569 1128C569 1143 562 1150 547 1150L543 1150C431 1126 288 1041 288 922L288 474C288 373 200 290 114 272C103 269 97 262 97 250C97 238 103 231 114 228C200 210 288 127 288 26L288-422C288-541 431-626 543-650L547-650C562-650 569-643 569-628C569-616 563-609 552-606C470-589 378-514 378-422L378 26C378 134 278 215 192 250"}],
 "125":[1.15,0.65,0.667,{"p":"124 1150L120 1150C105 1150 98 1143 98 1128C98 1116 104 1109 115 1106C197 1089 289 1014 289 922L289 474C289 366 389 285 475 250C390 215 289 133 289 26L289-422C289-514 197-589 115-606C104-609 98-616 98-628C98-643 105-650 120-650L124-650C236-626 379-541 379-422L379 26C379 127 467 210 553 228C564 231 570 238 570 250C570 262 564 269 553 272C467 290 379 373 379 474L379 922C379 1041 236 1126 124 1150"}],
 "770":[0.747,-0.57,1.1,{"ic":0.001,"p":"1093 570L1101 602C921 656 737 704 550 747C367 706 184 657-1 602L7 570C189 602 370 639 550 680C727 639 908 603 1093 570"}],
 "771":[0.762,-0.539,1.115,{"p":"1111 734C1114 738 1115 742 1115 745C1115 756 1109 762 1098 762C1093 762 1089 760 1084 756C1056 723 1019 697 972 679C942 668 897 657 837 646C820 643 801 641 780 641C731 641 660 655 567 682C466 711 388 725 333 725C185 725 78 656 4 566C1 562 0 558 0 555C0 544 6 539 18 539C23 539 27 541 31 544C87 611 162 633 278 654C295 657 314 659 335 659C384 659 455 645 548 618C649 589 727 575 782 575C930 575 1037 644 1111 734"}],
 "774":[0.743,-0.576,1.12,{"ic":0.001,"p":"1121 733L1088 743C1081 721 1063 703 1036 690C1007 677 939 659 887 653C816 647 733 642 642 642L478 642C367 642 226 648 157 666C121 676 97 684 84 690C57 703 39 721 32 743L-1 733C19 676 65 641 121 621C144 614 164 607 182 602C250 582 374 576 483 576L637 576C774 576 890 584 999 621C1055 641 1101 676 1121 733"}],
 "780":[0.742,-0.565,1.1,{"ic":0.001,"p":"550 565C737 608 921 656 1101 710L1093 742C908 709 727 673 550 632C370 673 189 710 7 742L-1 710C184 655 367 606 550 565"}],
 "8260":[1.722,1.222,1.222,{"p":"1164 1677C1165 1681 1166 1685 1166 1688C1166 1711 1155 1722 1132 1722C1117 1722 1106 1715 1101 1700L58-1177C57-1181 56-1185 56-1188C56-1211 67-1222 90-1222C105-1222 116-1215 121-1200"}],
 "8725":[0.613,0.113,0.588,{"p":"526 561C530 567 532 573 532 579C532 602 521 613 499 613C486 613 477 608 471 597L62-61C58-67 56-73 56-79C56-102 67-113 89-113C102-113 111-108 117-97"}],
 "8726":[0.613,0.113,0.588,{"p":"499-113C521-113 532-102 532-79C532-73 530-67 526-61L117 597C111 608 102 613 89 613C67 613 56 602 56 579C56 573 58 567 62 561L471-97C477-108 486-113 499-113"}],
 "8730":[1.75,1.25,1,{"ic":0.02,"p":"467-982L254 263L117-8C114-14 112-19 111-22C111-26 117-34 130-45L194 81L422-1250C459-1250 465-1250 471-1221L1020 1726C1020 1742 1012 1750 996 1750C983 1750 975 1739 971 1717"}],
 "8739":[1.292,0.792,0.333,{"p":"145-755C145-771 145-792 166-792C188-792 189-772 189-755L189 1255C189 1271 188 1292 167 1292C145 1292 145 1272 145 1255"}],
 "8741":[1.292,0.792,0.555,{"p":"203-770L203 1270C203 1282 190 1292 178 1292C166 1292 153 1282 153 1270L153-770C153-782 166-792 178-792C190-792 203-782 203-770M401-770L401 1270C401 1282 388 1292 376 1292C364 1292 351 1282 351 1270L351-770C351-782 364-792 376-792C388-792 401-782 401-770"}],
 "8968":[1.15,0.65,0.528,{"p":"502 1120C502 1139 488 1150 473 1150L196 1150L196-620C196-635 210-650 225-650C241-650 254-636 254-620L254 1090L473 1090C487 1090 502 1106 502 1120"}],
 "8969":[1.15,0.65,0.528,{"p":"332-620L332 1150L55 1150C40 1150 26 1135 26 1120C26 1105 40 1090 55 1090L274 1090L274-620C274-636 287-650 303-650C318-650 332-635 332-620"}],
 "8970":[1.15,0.65,0.528,{"p":"502-620C502-601 488-590 473-590L254-590L254 1120C254 1136 241 1150 225 1150C210 1150 196 1135 196 1120L196-650L473-650C488-650 502-635 502-620"}],
 "8971":[1.15,0.65,0.528,{"p":"303 1150C287 1150 274 1136 274 1120L274-590L55-590C40-590 26-605 26-620C26-635 40-650 55-650L332-650L332 1120C332 1135 318 1150 303 1150"}],
 "9140":[0.75,-0.527,1.86,{"p":"1830 527C1850 527 1860 537 1860 556L1860 750L0 750L0 556C0 537 10 527 30 527C50 527 60 537 60 556L60 692L1800 692L1800 556C1800 537 1810 527 1830 527"}],
 "9141":[-0.097,0.32,1.86,{"p":"0-320L1860-320L1860-126C1860-107 1850-97 1830-97C1810-97 1800-107 1800-126L1800-262L60-262L60-126C60-107 50-97 30-97C10-97 0-107 0-126"}],
 "9180":[0.774,-0.506,2.516,{"p":"2494 506C2509 506 2516 513 2516 527C2516 534 2514 539 2510 543C2431 620 2267 680 2017 724C1826 757 1646 774 1478 774L1038 774C870 774 690 757 499 724C249 680 85 620 6 543C2 539 0 534 0 527C0 513 7 506 22 506C28 506 33 508 38 513C106 580 266 629 517 662C691 685 865 696 1038 696L1478 696C1651 696 1825 685 1999 662C2250 629 2410 580 2478 513C2483 508 2488 506 2494 506"}],
 "9181":[-0.076,0.344,2.516,{"p":"2510-113C2514-109 2516-104 2516-97C2516-83 2509-76 2494-76C2488-76 2483-78 2478-83C2410-150 2250-199 1999-232C1825-255 1651-266 1478-266L1038-266C865-266 691-255 517-232C266-199 106-150 38-83C33-78 28-76 22-76C7-76 0-83 0-97C0-104 2-109 6-113C85-190 249-250 499-294C690-327 870-344 1038-344L1478-344C1646-344 1826-327 2017-294C2267-250 2431-190 2510-113"}],
 "9182":[0.833,-0.502,2.498,{"p":"2485 502C2494 502 2498 506 2498 515C2498 517 2498 519 2497 520C2480 567 2436 609 2365 648C2294 687 2216 706 2132 706L1602 706C1505 706 1424 716 1359 736C1294 756 1262 784 1262 820C1262 829 1258 833 1249 833C1240 833 1236 829 1236 820C1236 784 1204 756 1139 736C1074 716 993 706 896 706L366 706C282 706 204 687 133 648C62 609 18 567 1 520C0 519 0 517 0 515C0 506 4 502 13 502C19 502 23 504 25 509C41 552 91 585 176 606C236 621 299 628 366 628L896 628C963 628 1029 639 1092 660C1171 687 1223 724 1249 772C1275 724 1327 687 1406 660C1469 639 1535 628 1602 628L2132 628C2199 628 2262 621 2322 606C2407 585 2457 552 2473 509C2475 504 2479 502 2485 502"}],
 "9183":[-0.071,0.402,2.498,{"p":"2497-90C2498-88 2498-86 2498-84C2498-75 2494-71 2485-71C2479-71 2475-74 2473-79C2458-122 2407-155 2322-176C2261-191 2198-198 2132-198L1602-198C1535-198 1469-209 1406-230C1327-257 1275-294 1249-342C1223-294 1171-257 1092-230C1029-209 963-198 896-198L366-198C300-198 237-191 176-176C91-155 40-122 25-79C23-74 19-71 13-71C4-71 0-75 0-84C0-86 0-88 1-90C23-147 75-193 156-230C226-261 296-276 366-276L896-276C993-276 1074-286 1139-306C1204-326 1236-354 1236-389C1236-398 1240-402 1249-402C1258-402 1262-398 1262-389C1262-354 1294-326 1359-306C1424-286 1505-276 1602-276L2132-276C2202-276 2272-261 2342-230C2423-193 2475-147 2497-90"}],
 "9184":[0.863,-0.607,2.564,{"ic":0.006,"p":"2475 607L2570 607L2306 863L258 863L-6 607L89 607L261 774L2303 774"}],
 "9185":[-0.177,0.433,2.564,{"ic":0.006,"p":"2306-433L2570-177L2475-177L2303-344L261-344L89-177L-6-177L258-433"}],
 "10214":[1.15,0.65,0.66,{"p":"608-590L466-590L466 1090L608 1090C627 1090 637 1100 637 1120C637 1140 627 1150 608 1150L211 1150L211-650L608-650C627-650 637-640 637-620C637-600 624-590 608-590M407 1090L407-590L270-590L270 1090"}],
 "10215":[1.15,0.65,0.66,{"p":"52-650L449-650L449 1150L52 1150C33 1150 23 1140 23 1120C23 1100 33 1090 52 1090L194 1090L194-590L52-590C33-590 23-600 23-620C23-640 33-650 52-650M390 1090L390-590L253-590L253 1090"}],
 "10216":[1.15,0.65,0.611,{"p":"526-650C545-650 555-640 555-620C555-616 554-612 553-609L220 250L553 1109C554 1112 555 1116 555 1120C555 1140 545 1150 526 1150C513 1150 503 1144 498 1132L161 261C160 258 159 254 159 250C159 246 160 242 161 239L498-632C503-644 513-650 526-650"}],
 "10217":[1.15,0.65,0.611,{"p":"56 1120C56 1116 57 1112 58 1109L391 250L58-609C57-612 56-616 56-620C56-635 70-650 85-650C98-650 108-644 113-632L450 239C451 242 452 246 452 250C452 254 451 258 450 261L113 1132C108 1144 98 1150 85 1150C70 1150 56 1135 56 1120"}],
 "10218":[1.15,0.65,0.905,{"p":"819-650C839-650 849-640 849-620C849-615 848-611 847-608L511 250L847 1108C848 1111 849 1115 849 1120C849 1140 839 1150 819 1150C806 1150 797 1144 792 1132L452 261C451 258 450 254 450 250C450 246 451 242 452 239L792-632C797-644 806-650 819-650M529-650C548-650 558-640 558-620C558-616 557-612 556-609L221 250L556 1109C557 1112 558 1116 558 1120C558 1140 548 1150 529 1150C516 1150 506 1144 501 1132L161 261C160 258 159 254 159 250C159 246 160 242 161 239L501-632C506-644 516-650 529-650"}],
 "10219":[1.15,0.65,0.905,{"p":"347 1120C347 1116 348 1112 349 1109L684 250L349-609C348-612 347-616 347-620C347-635 361-650 376-650C389-650 399-644 404-632L744 238C745 241 746 245 746 250C746 255 745 259 744 262L404 1132C399 1144 389 1150 376 1150C361 1150 347 1135 347 1120M56 1120C56 1116 57 1112 58 1109L394 250L58-609C57-612 56-616 56-620C56-636 70-650 86-650C99-650 108-644 113-632L453 239C454 242 455 246 455 250C455 254 454 258 453 261L113 1132C108 1144 99 1150 86 1150C70 1150 56 1136 56 1120"}],
 "10222":[1.168,0.668,0.432,{"p":"355-668C369-668 376-661 376-646C376-641 374-636 370-631C327-586 295-478 274-306C260-191 253-73 253 47L253 453C253 573 260 691 274 806C295 978 327 1086 370 1131C374 1136 376 1141 376 1146C376 1161 369 1168 355 1168C350 1168 345 1166 340 1162C287 1106 244 993 213 823C188 690 176 566 176 453L176 47C176-66 188-190 213-323C244-493 287-606 340-662C345-666 350-668 355-668"}],
 "10223":[1.168,0.668,0.432,{"p":"92-662C145-606 188-493 219-323C244-190 256-66 256 47L256 453C256 566 244 690 219 823C188 993 145 1106 92 1162C87 1166 82 1168 77 1168C63 1168 56 1161 56 1146C56 1141 58 1136 62 1131C105 1086 137 978 158 806C172 691 179 573 179 453L179 47C179-73 172-191 158-306C137-478 105-586 62-631C58-636 56-641 56-646C56-661 63-668 77-668C82-668 87-666 92-662"}],
 "10627":[1.15,0.65,0.667,{"p":"530-600L530 1100C545 1105 569 1108 569 1128C569 1143 562 1150 547 1150L543 1150C431 1126 288 1041 288 922L288 474C288 373 200 290 114 272C103 269 97 262 97 250C97 238 103 231 114 228C200 210 288 127 288 26L288-422C288-541 431-626 543-650L547-650C562-650 569-643 569-628C569-608 545-605 530-600M192 250C277 285 378 367 378 474L378 922C378 988 427 1043 471 1072L471-572C426-543 378-487 378-422L378 26C378 134 278 215 192 250"}],
 "10628":[1.15,0.65,0.667,{"p":"123 1150L119 1150C104 1150 97 1143 97 1128C97 1108 121 1105 136 1100L136-600C121-605 97-608 97-628C97-643 104-650 119-650L123-650C235-626 378-541 378-422L378 26C378 127 466 210 552 228C563 231 569 238 569 250C569 262 563 269 552 272C466 290 378 373 378 474L378 922C378 1041 235 1126 123 1150M474 250C389 215 288 133 288 26L288-422C288-488 239-543 195-572L195 1072C239 1043 288 988 288 922L288 474C288 366 388 285 474 250"}],
 "10629":[1.146,0.646,0.597,{"p":"521-646C533-646 539-640 539-628C539-622 537-617 533-613C493-583 456-540 421-484L421 984C454 1039 492 1082 533 1113C537 1117 539 1122 539 1128C539 1140 533 1146 521 1146C519 1146 516 1145 511 1144C412 1068 331 950 267 791C208 644 179 502 179 367L179 133C179-2 208-144 267-291C331-450 412-568 511-644C516-645 519-646 521-646M362 871L362-371C292-211 257-43 257 133L257 367C257 543 292 711 362 871"}],
 "10630":[1.146,0.646,0.597,{"p":"207-644C306-568 387-450 451-291C510-144 539-2 539 133L539 367C539 502 510 644 451 791C387 950 306 1068 207 1144C202 1145 199 1146 197 1146C185 1146 179 1140 179 1128C179 1122 181 1117 185 1113C225 1083 262 1040 297 984L297-484C262-540 225-583 185-613C181-617 179-622 179-628C179-640 185-646 197-646C199-646 202-645 207-644M461 367L461 133C461-43 426-211 356-371L356 871C426 711 461 543 461 367"}],
 "10748":[1.146,0.646,0.467,{"ic":0.023,"p":"490-616C477-521 427-370 342-163C259 40 190 178 136 250C213 345 286 482 357 659C422 824 466 973 489 1108C490 1112 490 1115 490 1116C490 1128 474 1146 462 1146C452 1146 431 1133 430 1124C409 992 362 842 289 673C218 508 141 370 60 259C57 256 56 253 56 250C56 247 57 244 60 241C125 143 198 2 279-181C368-382 419-529 430-624C431-634 451-646 462-646C474-646 490-629 490-616"}],
 "10749":[1.146,0.646,0.467,{"ic":0.023,"p":"56 1116C56 1115 56 1112 57 1108C80 973 124 824 189 659C260 482 333 345 410 250C356 178 287 40 204-163C119-370 69-521 56-616C56-628 72-646 84-646C95-646 115-634 116-624C127-529 178-382 267-181C348 2 421 143 486 241C489 244 490 247 490 250C490 253 489 256 486 259C405 370 328 508 257 673C184 842 137 992 116 1124C115 1133 94 1146 84 1146C72 1146 56 1129 56 1116"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/size5.js
var size5;
var init_size5 = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/size5.js"() {
    size5 = JSON.parse(`{
 "40":[1.296,0.796,0.663,{"p":"588-796C601-796 608-789 608-776C608-770 606-765 601-760C500-684 420-552 361-365C310-206 285-51 285 101L285 399C285 551 310 706 361 865C420 1052 500 1184 601 1260C606 1265 608 1270 608 1276C608 1289 601 1296 588 1296C583 1296 579 1295 576 1292C464 1207 372 1071 300 886C234 717 201 554 201 399L201 101C201-54 234-217 300-386C372-571 464-707 576-792C579-795 583-796 588-796"}],
 "41":[1.296,0.796,0.663,{"p":"86-792C198-707 290-571 363-386C429-217 462-54 462 101L462 399C462 554 429 717 363 886C290 1071 198 1207 86 1292C83 1295 80 1296 75 1296C62 1296 55 1289 55 1276C55 1269 57 1264 62 1260C163 1183 243 1052 302 865C353 707 378 552 378 399L378 101C378-51 353-206 302-365C243-552 163-684 62-760C57-764 55-769 55-776C55-789 62-796 75-796C80-796 83-795 86-792"}],
 "47":[2.179,1.679,1.557,{"p":"1465 2179C1448 2179 1436 2171 1431 2155L58-1630C57-1633 57-1637 57-1642C57-1662 73-1679 93-1679C110-1679 122-1671 127-1655L1500 2130C1501 2136 1502 2140 1502 2142C1502 2162 1485 2179 1465 2179"}],
 "91":[1.3,0.8,0.499,{"p":"448-738L290-738L290 1238L448 1238C468 1238 478 1248 478 1269C478 1290 468 1300 448 1300L230 1300L230-800L448-800C468-800 478-790 478-769C478-753 464-738 448-738"}],
 "92":[2.179,1.679,1.557,{"p":"56 2142C56 2137 56 2133 57 2130L1430-1655C1435-1671 1447-1679 1464-1679C1489-1679 1501-1667 1501-1642C1501-1640 1500-1636 1499-1630L126 2155C121 2171 109 2179 92 2179C72 2179 56 2162 56 2142"}],
 "93":[1.3,0.8,0.499,{"p":"51-800L269-800L269 1300L51 1300C31 1300 21 1290 21 1269C21 1248 31 1238 51 1238L209 1238L209-738L51-738C31-738 21-748 21-769C21-790 31-800 51-800"}],
 "123":[1.3,0.8,0.707,{"p":"196 250C291 293 401 389 401 511L401 1035C401 1084 421 1131 460 1174C497 1215 541 1241 590 1253C602 1256 608 1264 608 1276C608 1292 600 1300 584 1300C581 1300 579 1300 578 1299C511 1286 447 1252 387 1195C334 1144 307 1091 307 1035L307 511C307 458 288 408 251 362C214 316 169 286 118 273C106 270 100 262 100 250C100 238 106 230 118 227C169 214 214 184 251 138C288 92 307 42 307-11L307-535C307-591 334-644 387-695C447-752 511-786 578-799C579-800 581-800 584-800C600-800 608-792 608-776C608-764 602-756 590-753C541-741 497-715 460-674C421-631 401-584 401-535L401-11C401 111 291 207 196 250"}],
 "125":[1.3,0.8,0.707,{"p":"512 250C417 207 306 111 306-11L306-535C306-584 286-631 247-674C210-714 166-740 117-753C105-756 99-764 99-776C99-792 107-800 123-800C126-800 128-800 129-799C197-786 261-751 320-695C373-644 400-591 400-535L400-11C400 42 419 92 456 138C493 184 538 214 589 227C601 230 607 238 607 250C607 262 601 270 589 273C538 286 493 316 456 362C419 408 400 458 400 511L400 1035C400 1091 373 1144 320 1195C261 1251 197 1286 129 1299C128 1300 126 1300 123 1300C107 1300 99 1292 99 1276C99 1264 105 1256 117 1253C166 1240 210 1214 247 1174C286 1131 306 1084 306 1035L306 511C306 389 417 293 512 250"}],
 "770":[0.748,-0.569,1.32,{"ic":0.001,"p":"1313 569L1321 603C1101 658 881 706 660 748C439 706 219 658-1 603L7 569L660 679"}],
 "771":[0.766,-0.534,1.335,{"p":"1330 736C1333 739 1335 744 1335 749C1335 760 1329 766 1317 766C1314 766 1310 764 1305 761C1271 726 1224 700 1163 681C1128 671 1074 660 1000 649C975 645 951 643 929 643C875 643 791 657 676 684C557 711 467 725 405 725C306 725 218 705 140 664C91 638 46 605 5 564C2 561 0 556 0 551C0 540 6 534 18 534C23 534 28 536 31 539C65 574 112 600 172 619C207 629 261 640 335 651C360 655 384 657 406 657C460 657 544 643 659 616C778 589 868 575 931 575C1029 575 1117 595 1195 636C1244 662 1289 695 1330 736"}],
 "774":[0.743,-0.575,1.341,{"ic":0.001,"p":"1248 639C1295 659 1327 690 1342 733L1308 743C1300 721 1281 705 1252 694C1213 679 1176 669 1141 664C1080 656 1030 651 992 649L913 645C878 644 824 643 749 643L512 643C477 644 449 644 428 645L348 649C311 651 261 656 200 664C165 669 128 679 89 694C60 705 41 721 33 743L-1 733C14 690 46 659 93 639C150 616 205 601 258 594C412 576 520 575 670 575C820 575 928 576 1083 594C1136 601 1191 616 1248 639"}],
 "780":[0.743,-0.564,1.32,{"ic":0.001,"p":"660 564C881 606 1101 654 1321 709L1313 743L660 633L7 743L-1 709C219 654 439 606 660 564"}],
 "8260":[2.179,1.679,1.557,{"p":"1465 2179C1448 2179 1436 2171 1431 2155L58-1630C57-1633 57-1637 57-1642C57-1662 73-1679 93-1679C110-1679 122-1671 127-1655L1500 2130C1501 2136 1502 2140 1502 2142C1502 2162 1485 2179 1465 2179"}],
 "8725":[0.616,0.115,0.593,{"p":"502 616C489 616 478 610 471 598L62-60C59-65 57-72 57-79C57-98 73-115 92-115C106-115 116-109 123-98L532 560C536 566 538 572 538 579C538 598 521 616 502 616"}],
 "8726":[0.616,0.115,0.593,{"p":"538-79C538-72 536-66 532-60L123 598C116 610 105 616 92 616C72 616 57 599 57 579C57 572 59 565 62 560L471-98C478-109 488-115 502-115C522-115 538-99 538-79"}],
 "8739":[1.502,1.002,0.333,{"p":"145-965C145-981 145-1002 166-1002C188-1002 189-982 189-965L189 1465C189 1481 188 1502 167 1502C145 1502 145 1482 145 1465"}],
 "8741":[1.501,1.001,0.555,{"p":"203-979L203 1479C203 1491 190 1501 178 1501C166 1501 153 1491 153 1479L153-979C153-991 166-1001 178-1001C190-1001 203-991 203-979M401-979L401 1479C401 1491 388 1501 376 1501C364 1501 351 1491 351 1479L351-979C351-991 364-1001 376-1001C388-1001 401-991 401-979"}],
 "8968":[1.3,0.8,0.555,{"p":"498 1300L203 1300L203-769C203-790 213-800 233-800C254-800 264-790 264-769L264 1238L498 1238C518 1238 528 1248 528 1269C528 1286 514 1300 498 1300"}],
 "8969":[1.3,0.8,0.555,{"p":"322-800C342-800 352-790 352-769L352 1300L57 1300C37 1300 27 1290 27 1269C27 1248 37 1238 57 1238L291 1238L291-769C291-790 301-800 322-800"}],
 "8970":[1.3,0.8,0.555,{"p":"498-738L264-738L264 1269C264 1290 254 1300 233 1300C213 1300 203 1290 203 1269L203-800L498-800C518-800 528-790 528-769C528-753 514-738 498-738"}],
 "8971":[1.3,0.8,0.555,{"p":"57-800L352-800L352 1269C352 1290 342 1300 322 1300C301 1300 291 1290 291 1269L291-738L57-738C37-738 27-748 27-769C27-790 37-800 57-800"}],
 "9140":[0.757,-0.521,2.235,{"p":"2204 521C2225 521 2235 531 2235 551L2235 757L0 757L0 551C0 531 10 521 31 521C52 521 62 531 62 551L62 697L2173 697L2173 551C2173 531 2183 521 2204 521"}],
 "9141":[-0.091,0.327,2.235,{"p":"0-327L2235-327L2235-121C2235-101 2225-91 2204-91C2183-91 2173-101 2173-121L2173-267L62-267L62-121C62-101 52-91 31-91C10-91 0-101 0-121"}],
 "9180":[0.78,-0.506,3.02,{"p":"2996 506C3012 506 3020 514 3020 529C3020 536 3018 541 3013 546C2932 625 2740 686 2437 731C2212 764 2004 780 1811 780L1209 780C1016 780 808 764 583 731C280 686 88 625 7 546C2 541 0 536 0 529C0 514 8 506 24 506C31 506 36 508 41 513C110 580 296 631 601 664C806 685 1008 696 1209 696L1811 696C2012 696 2215 685 2418 664C2722 631 2909 581 2979 513C2982 508 2988 506 2996 506"}],
 "9181":[-0.076,0.35,3.02,{"p":"2996-76C2988-76 2982-78 2979-83C2909-151 2722-201 2418-234C2215-255 2012-266 1811-266L1209-266C1008-266 806-255 602-234C297-201 110-150 41-83C36-78 31-76 24-76C8-76 0-84 0-99C0-106 2-111 7-116C88-195 280-256 583-301C808-334 1016-350 1209-350L1811-350C2004-350 2212-334 2437-301C2740-256 2932-195 3013-116C3018-111 3020-106 3020-99C3020-87 3009-76 2996-76"}],
 "9182":[0.838,-0.5,3,{"p":"2986 500C2995 500 3000 505 3000 514C3000 516 3000 518 2999 519C2982 566 2933 610 2850 650C2767 690 2677 711 2579 711L1907 711C1793 711 1699 720 1625 740C1551 760 1514 788 1514 824C1514 833 1509 838 1500 838C1491 838 1486 833 1486 824C1486 788 1449 760 1375 740C1301 720 1207 711 1093 711L421 711C323 711 233 690 150 650C67 610 18 566 1 519C0 518 0 516 0 514C0 505 5 500 14 500C20 500 24 503 27 509C43 554 102 586 205 607C272 620 344 627 421 627L1093 627C1168 627 1243 638 1316 660C1409 687 1470 727 1500 778C1530 727 1591 687 1684 660C1757 638 1832 627 1907 627L2579 627C2656 627 2728 620 2795 607C2898 586 2957 554 2973 509C2976 503 2980 500 2986 500"}],
 "9183":[-0.07,0.408,3,{"p":"2999-89C3000-88 3000-86 3000-84C3000-75 2995-70 2986-70C2980-70 2976-73 2973-79C2957-124 2898-156 2795-177C2728-190 2656-197 2579-197L1907-197C1832-197 1757-208 1684-230C1591-257 1530-297 1500-348C1470-297 1409-257 1316-230C1243-208 1168-197 1093-197L421-197C344-197 272-190 205-177C102-156 43-124 27-79C24-73 20-70 14-70C5-70 0-75 0-84C0-86 0-88 1-89C18-136 67-180 150-220C233-260 323-281 421-281L1093-281C1207-281 1301-290 1375-310C1449-330 1486-358 1486-394C1486-403 1491-408 1500-408C1509-408 1514-403 1514-394C1514-358 1551-330 1625-310C1699-290 1793-281 1907-281L2579-281C2677-281 2767-260 2850-220C2933-180 2982-136 2999-89"}],
 "9184":[0.866,-0.607,3.068,{"ic":0.006,"p":"2975 607L3074 607L2807 866L261 866L-6 607L93 607L264 773L2804 773"}],
 "9185":[-0.177,0.436,3.068,{"ic":0.006,"p":"2807-436L3074-177L2975-177L2804-343L264-343L93-177L-6-177L261-436"}],
 "10214":[1.3,0.8,0.75,{"p":"697-738L531-738L531 1238L697 1238C717 1238 727 1248 727 1269C727 1290 717 1300 697 1300L247 1300L247-800L697-800C717-800 727-790 727-769C727-753 713-738 697-738M470 1238L470-738L308-738L308 1238"}],
 "10215":[1.3,0.8,0.75,{"p":"53-800L503-800L503 1300L53 1300C33 1300 23 1290 23 1269C23 1248 33 1238 53 1238L219 1238L219-738L53-738C33-738 23-748 23-769C23-790 33-800 53-800M442 1238L442-738L280-738L280 1238"}],
 "10216":[1.3,0.8,0.677,{"p":"593-800C613-800 623-790 623-769C623-765 622-761 621-758L228 250L621 1258C622 1261 623 1265 623 1269C623 1290 613 1300 593 1300C579 1300 569 1294 564 1281L167 261C166 258 165 254 165 250C165 246 166 242 167 239L564-781C569-794 579-800 593-800"}],
 "10217":[1.3,0.8,0.677,{"p":"510 239C511 242 512 246 512 250C512 254 511 258 510 261L113 1281C108 1294 98 1300 84 1300C64 1300 54 1290 54 1269C54 1265 55 1261 56 1258L449 250L56-758C55-761 54-765 54-769C54-790 64-800 84-800C98-800 108-794 113-781"}],
 "10218":[1.3,0.8,1.011,{"p":"926-800C947-800 957-790 957-769C957-765 956-761 955-758L559 250L955 1258C956 1261 957 1265 957 1269C957 1290 947 1300 926 1300C913 1300 903 1294 898 1281L498 262C497 259 496 255 496 250C496 245 497 241 498 238L898-781C903-794 913-800 926-800M596-800C616-800 626-790 626-769C626-765 625-761 624-758L229 250L624 1258C625 1261 626 1265 626 1269C626 1290 616 1300 596 1300C582 1300 572 1294 567 1281L167 261C166 258 165 254 165 250C165 246 166 242 167 239L567-781C572-794 582-800 596-800"}],
 "10219":[1.3,0.8,1.011,{"p":"844 239C845 242 846 246 846 250C846 254 845 258 844 261L444 1281C439 1294 429 1300 415 1300C395 1300 385 1290 385 1269C385 1264 386 1260 387 1257L782 250L387-757C386-760 385-764 385-769C385-790 395-800 415-800C429-800 439-794 444-781M513 239C514 242 515 246 515 250C515 254 514 258 513 261L113 1281C108 1294 98 1300 85 1300C64 1300 54 1290 54 1269C54 1265 55 1261 56 1258L452 250L56-758C55-761 54-765 54-769C54-790 64-800 85-800C98-800 108-794 113-781"}],
 "10222":[1.32,0.82,0.485,{"p":"406-820C421-820 429-812 429-796C429-788 427-782 422-779C373-728 336-608 313-417C297-288 289-157 289-24L289 524C289 657 297 788 313 917C336 1108 373 1228 422 1279C427 1282 429 1288 429 1296C429 1312 421 1320 406 1320C400 1320 395 1318 390 1313C329 1251 282 1125 247 936C220 789 206 652 206 524L206-24C206-151 220-289 247-436C282-626 329-752 389-813C393-818 399-820 406-820"}],
 "10223":[1.32,0.82,0.485,{"p":"96-813C155-751 203-625 238-436C265-288 279-151 279-24L279 524C279 651 265 788 238 936C203 1125 155 1251 96 1313C93 1318 87 1320 79 1320C64 1320 56 1312 56 1296C56 1288 58 1282 63 1279C112 1228 149 1108 172 917C188 788 196 657 196 524L196-24C196-157 188-288 172-417C149-608 112-728 63-779C58-782 56-788 56-796C56-812 64-820 79-820C87-820 93-818 96-813"}],
 "10627":[1.3,0.8,0.707,{"p":"565-745L565 1245C581 1251 608 1255 608 1276C608 1292 600 1300 584 1300C581 1300 579 1300 578 1299C511 1286 447 1252 387 1195C334 1144 307 1091 307 1035L307 511C307 458 288 408 251 362C214 316 169 286 118 273C106 270 100 262 100 250C100 238 106 230 118 227C169 214 214 184 251 138C288 92 307 42 307-11L307-535C307-591 334-644 387-695C447-752 511-786 578-799C579-800 581-800 584-800C600-800 608-792 608-776C608-754 583-751 565-745M196 250C291 293 401 389 401 511L401 1035C401 1111 455 1177 504 1213L504-713C455-677 401-611 401-535L401-11C401 111 291 207 196 250"}],
 "10628":[1.3,0.8,0.707,{"p":"143 1245L143-745C125-751 100-754 100-776C100-792 108-800 124-800C127-800 129-800 130-799C197-786 261-752 321-695C374-644 401-591 401-535L401-11C401 42 420 92 457 138C494 184 539 214 590 227C602 230 608 238 608 250C608 262 602 270 590 273C539 286 494 316 457 362C420 408 401 458 401 511L401 1035C401 1091 374 1144 321 1195C261 1252 197 1286 130 1299C129 1300 127 1300 124 1300C108 1300 100 1292 100 1276C100 1255 127 1251 143 1245M512 250C417 207 307 111 307-11L307-535C307-611 253-677 204-713L204 1213C253 1177 307 1111 307 1035L307 511C307 389 417 293 512 250"}],
 "10629":[1.296,0.796,0.663,{"p":"588-796C601-796 608-789 608-776C608-770 606-765 601-760C563-731 527-692 492-641L492 1141C527 1192 563 1231 601 1260C606 1265 608 1270 608 1276C608 1289 601 1296 588 1296C583 1296 579 1295 576 1292C464 1207 372 1071 300 886C234 717 201 554 201 399L201 101C201-54 234-217 300-386C372-571 464-707 576-792C579-795 583-796 588-796M431 1038L431-538C349-374 285-134 285 101L285 399C285 635 349 873 431 1038"}],
 "10630":[1.296,0.796,0.663,{"p":"233-792C344-707 436-571 509-386C575-217 608-55 608 101L608 399C608 555 575 717 509 886C437 1071 345 1207 233 1292C229 1295 225 1296 221 1296C208 1296 201 1289 201 1276C201 1270 203 1265 208 1260C246 1231 282 1192 317 1141L317-641C282-692 246-731 208-760C203-765 201-770 201-776C201-789 208-796 221-796C225-796 229-795 233-792M378-538L378 1038C460 874 524 634 524 399L524 101C524-135 460-373 378-538"}],
 "10748":[1.296,0.796,0.467,{"ic":0.077,"p":"544-766C535-703 505-599 453-454C324-91 219 144 140 250C216 345 297 506 384 733C464 943 516 1118 539 1259L540 1259C543 1261 544 1263 544 1266C544 1279 526 1296 513 1296C502 1296 481 1284 480 1274C471 1217 452 1144 424 1054C360 853 284 665 196 488C148 394 103 318 60 259C57 256 56 253 56 250C56 247 57 244 60 241C99 184 150 86 214-53C373-398 462-638 480-774C481-783 503-796 513-796C526-796 544-779 544-766"}],
 "10749":[1.296,0.796,0.467,{"ic":0.077,"p":"460 250C381 144 277-91 147-454C95-599 65-703 56-766C56-779 74-796 86-796C97-796 119-783 120-774C128-713 158-612 211-471C338-134 447 104 540 241C543 244 544 247 544 250C544 253 543 256 540 259C447 396 338 634 211 971C158 1112 128 1213 120 1274C119 1283 97 1296 86 1296C74 1296 56 1279 56 1266C65 1203 95 1099 147 954C276 591 381 356 460 250"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/size6.js
var size6;
var init_size6 = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/size6.js"() {
    size6 = JSON.parse(`{
 "40":[1.446,0.946,0.736,{"p":"660-946C675-946 682-939 682-924C682-917 679-911 674-907C606-856 545-777 490-670C393-480 320-209 320 65L320 435C320 560 335 686 364 813C416 1043 523 1293 674 1407C679 1411 682 1417 682 1424C682 1439 675 1446 660 1446C656 1446 652 1444 647 1441C574 1386 505 1304 440 1195C327 1005 226 718 226 435L226 65C226-202 320-477 422-664C490-787 565-880 647-941C652-944 656-946 660-946"}],
 "41":[1.446,0.946,0.736,{"p":"89-941C162-886 231-804 296-695C409-506 510-218 510 65L510 435C510 702 416 977 314 1164C246 1287 171 1380 89 1441C84 1444 80 1446 76 1446C61 1446 54 1439 54 1424C54 1417 57 1411 62 1407C130 1356 191 1277 246 1170C343 980 416 709 416 435L416 65C416-60 401-186 372-313C320-543 213-793 62-907C57-911 54-917 54-924C54-939 61-946 76-946C80-946 84-944 89-941"}],
 "47":[2.777,2.277,1.997,{"p":"1901 2777C1882 2777 1870 2768 1864 2750L58-2224C57-2228 56-2232 56-2237C56-2260 73-2277 96-2277C115-2277 127-2268 133-2250L1939 2724C1940 2728 1941 2732 1941 2737C1941 2760 1924 2777 1901 2777"}],
 "91":[1.45,0.95,0.528,{"p":"477-884L297-884L297 1384L477 1384C498 1384 509 1395 509 1417C509 1439 498 1450 477 1450L233 1450L233-950L477-950C498-950 509-939 509-917C509-899 495-884 477-884"}],
 "92":[2.777,2.277,1.997,{"p":"1941-2237C1941-2232 1940-2228 1939-2224L133 2750C127 2768 115 2777 96 2777C73 2777 56 2760 56 2737C56 2732 57 2728 58 2724L1864-2250C1870-2268 1882-2277 1901-2277C1924-2277 1941-2260 1941-2237"}],
 "93":[1.45,0.95,0.528,{"p":"51-950L295-950L295 1450L51 1450C30 1450 19 1439 19 1417C19 1395 30 1384 51 1384L231 1384L231-884L51-884C30-884 19-895 19-917C19-939 30-950 51-950"}],
 "123":[1.45,0.95,0.75,{"p":"197 250C300 300 425 413 425 549L425 1147C425 1201 446 1253 489 1303C529 1350 576 1382 629 1399C642 1403 648 1411 648 1424C648 1441 639 1450 622 1450C619 1450 617 1450 615 1449C543 1426 479 1389 423 1338C358 1277 325 1214 325 1147L325 549C325 490 305 434 265 381C225 328 177 292 121 275C108 271 102 263 102 250C102 237 108 229 121 225C177 208 225 172 265 119C305 66 325 10 325-49L325-647C325-714 358-777 423-838C479-889 543-926 615-949C617-950 619-950 622-950C639-950 648-941 648-924C648-911 642-903 629-899C576-882 529-850 489-803C446-753 425-701 425-647L425-49C425 87 300 200 197 250"}],
 "125":[1.45,0.95,0.75,{"p":"553 250C450 200 325 87 325-49L325-647C325-701 304-753 261-803C221-850 174-882 121-899C108-903 102-911 102-924C102-941 111-950 128-950C131-950 133-950 135-949C207-926 271-889 327-838C392-777 425-714 425-647L425-49C425 10 445 66 485 119C525 172 573 208 629 225C642 229 648 237 648 250C648 263 642 271 629 275C573 292 525 328 485 381C445 434 425 490 425 549L425 1147C425 1214 392 1277 327 1338C271 1389 207 1426 135 1449C133 1450 131 1450 128 1450C111 1450 102 1441 102 1424C102 1411 108 1403 121 1399C174 1382 221 1350 261 1303C304 1253 325 1201 325 1147L325 549C325 413 450 300 553 250"}],
 "770":[0.748,-0.57,1.581,{"ic":0.001,"p":"1575 570L1582 604L790 748L-1 604L6 570L790 679"}],
 "771":[0.769,-0.532,1.599,{"p":"1594 737C1597 742 1599 747 1599 751C1599 763 1593 769 1581 769C1576 769 1572 767 1568 764C1529 729 1470 701 1392 682C1347 671 1201 644 1109 644C1041 644 940 657 807 684C669 711 563 725 488 725C455 725 423 723 393 719C226 697 97 645 6 563C2 559 0 554 0 549C0 538 6 532 19 532C24 532 28 533 31 536C70 571 129 599 207 618C246 627 312 638 403 650C432 654 461 656 490 656C558 656 659 643 792 616C930 589 1036 576 1111 576C1144 576 1176 578 1206 581C1372 603 1501 655 1594 737"}],
 "774":[0.744,-0.574,1.604,{"ic":0.001,"p":"1528 652C1567 670 1592 697 1605 732L1570 744C1564 727 1548 712 1524 700C1500 688 1462 678 1409 670C1386 666 1345 661 1288 655C1169 643 1122 644 963 643L640 643C486 644 378 648 315 655C192 668 113 684 78 701C55 712 40 727 34 744L-1 732C14 689 50 658 107 638C175 615 241 600 306 593C492 575 625 574 802 574L900 574C989 574 1057 575 1104 578L1203 584C1250 587 1311 594 1386 607C1431 614 1478 629 1528 652"}],
 "780":[0.742,-0.564,1.581,{"ic":0.001,"p":"790 564L1582 708L1575 742L790 633L6 742L-1 708"}],
 "8260":[2.777,2.277,1.997,{"p":"1901 2777C1882 2777 1870 2768 1864 2750L58-2224C57-2228 56-2232 56-2237C56-2260 73-2277 96-2277C115-2277 127-2268 133-2250L1939 2724C1940 2728 1941 2732 1941 2737C1941 2760 1924 2777 1901 2777"}],
 "8725":[0.619,0.119,0.6,{"p":"505 619C490 619 478 613 471 600L62-59C58-64 56-71 56-79C56-101 73-119 95-119C110-119 122-113 129-100L538 559C542 564 544 571 544 579C544 601 527 619 505 619"}],
 "8726":[0.619,0.119,0.6,{"p":"544-79C544-71 542-64 538-59L129 600C122 613 110 619 95 619C73 619 56 601 56 579C56 571 58 564 62 559L471-100C478-113 490-119 505-119C527-119 544-101 544-79"}],
 "8739":[1.752,1.252,0.333,{"p":"145-1215C145-1231 145-1252 166-1252C188-1252 189-1232 189-1215L189 1715C189 1731 188 1752 167 1752C145 1752 145 1732 145 1715"}],
 "8741":[1.751,1.252,0.555,{"p":"203-1230L203 1729C203 1741 190 1751 178 1751C166 1751 153 1741 153 1729L153-1230C153-1242 166-1252 178-1252C190-1252 203-1242 203-1230M401-1230L401 1729C401 1741 388 1751 376 1751C364 1751 351 1741 351 1729L351-1230C351-1242 364-1252 376-1252C388-1252 401-1242 401-1230"}],
 "8968":[1.45,0.95,0.583,{"p":"523 1450L210 1450L210-917C210-939 221-950 242-950C264-950 275-939 275-917L275 1384L523 1384C544 1384 555 1395 555 1417C555 1435 541 1450 523 1450"}],
 "8969":[1.45,0.95,0.583,{"p":"341-950C362-950 373-939 373-917L373 1450L60 1450C39 1450 28 1439 28 1417C28 1395 39 1384 60 1384L308 1384L308-917C308-939 319-950 341-950"}],
 "8970":[1.45,0.95,0.583,{"p":"523-884L275-884L275 1417C275 1439 264 1450 242 1450C221 1450 210 1439 210 1417L210-950L523-950C544-950 555-939 555-917C555-899 541-884 523-884"}],
 "8971":[1.45,0.95,0.583,{"p":"60-950L373-950L373 1417C373 1439 362 1450 341 1450C319 1450 308 1439 308 1417L308-884L60-884C39-884 28-895 28-917C28-939 39-950 60-950"}],
 "9140":[0.764,-0.513,2.61,{"p":"2577 513C2599 513 2610 524 2610 545L2610 764L0 764L0 545C0 524 11 513 33 513C55 513 66 524 66 545L66 700L2544 700L2544 545C2544 524 2555 513 2577 513"}],
 "9141":[-0.083,0.334,2.61,{"p":"0-334L2610-334L2610-115C2610-94 2599-83 2577-83C2555-83 2544-94 2544-115L2544-270L66-270L66-115C66-94 55-83 33-83C11-83 0-94 0-115"}],
 "9180":[0.787,-0.505,3.524,{"p":"3498 505C3515 505 3524 513 3524 530C3524 538 3522 544 3517 549C3434 630 3216 693 2863 738C2607 771 2371 787 2155 787L1369 787C1153 787 917 771 661 738C308 693 90 630 7 549C2 544 0 538 0 530C0 513 9 505 26 505C34 505 40 507 45 512C115 581 327 631 681 663C908 684 1137 694 1369 694L2155 694C2387 694 2616 684 2842 663C3197 631 3409 581 3479 512C3484 507 3490 505 3498 505"}],
 "9181":[-0.075,0.357,3.524,{"p":"3517-119C3522-114 3524-108 3524-100C3524-83 3515-75 3498-75C3490-75 3484-77 3479-82C3409-151 3197-201 2843-233C2616-254 2387-264 2155-264L1369-264C1137-264 908-254 681-233C327-201 115-151 45-82C40-77 34-75 26-75C9-75 0-83 0-100C0-108 2-114 7-119C90-200 308-263 661-308C917-341 1153-357 1369-357L2155-357C2371-357 2607-341 2863-308C3216-263 3434-200 3517-119"}],
 "9182":[0.845,-0.498,3.502,{"p":"3487 498C3497 498 3502 503 3502 513C3502 515 3501 517 3500 518C3483 567 3428 612 3336 654C3244 696 3143 718 3032 718L2206 718C2077 718 1971 727 1889 746C1807 765 1766 793 1766 830C1766 840 1761 845 1751 845C1741 845 1736 840 1736 830C1736 793 1695 765 1613 746C1531 727 1425 718 1296 718L470 718C359 718 258 697 167 655C74 612 18 567 1 518C0 517 0 515 0 513C0 503 5 498 15 498C22 498 26 501 29 507C46 553 113 586 230 605C303 618 383 624 470 624L1296 624C1379 624 1462 635 1543 658C1648 687 1718 729 1751 783C1784 729 1854 687 1959 658C2040 635 2123 624 2206 624L3032 624C3119 624 3199 618 3272 606C3388 586 3455 553 3473 508C3475 501 3480 498 3487 498"}],
 "9183":[-0.067,0.414,3.502,{"p":"3501-88C3502-86 3502-84 3502-82C3502-72 3497-67 3487-67C3480-67 3475-71 3473-78C3455-123 3388-156 3272-175C3199-188 3119-194 3032-194L2206-194C2123-194 2040-205 1959-228C1854-257 1784-299 1751-353C1718-299 1648-257 1543-228C1462-205 1379-194 1296-194L470-194C383-194 303-188 230-175C114-156 47-123 29-78C27-71 22-67 15-67C5-67 0-72 0-82C0-84 0-86 1-88C25-151 94-202 207-241C298-272 386-288 470-288L1296-288C1425-288 1531-297 1613-316C1695-335 1736-362 1736-399C1736-409 1741-414 1751-414C1761-414 1766-409 1766-399C1766-362 1807-335 1889-316C1971-297 2077-288 2206-288L3032-288C3116-288 3204-272 3295-241C3408-202 3477-151 3501-88"}],
 "9184":[0.869,-0.606,3.574,{"ic":0.006,"p":"3475 606L3580 606L3309 869L265 869L-6 606L99 606L268 770L3306 770"}],
 "9185":[-0.176,0.439,3.574,{"ic":0.006,"p":"3309-439L3580-176L3475-176L3306-340L268-340L99-176L-6-176L265-439"}],
 "10214":[1.45,0.95,0.838,{"p":"783-884L596-884L596 1384L783 1384C805 1384 816 1395 816 1417C816 1439 805 1450 783 1450L282 1450L282-950L783-950C805-950 816-939 816-917C816-898 802-884 783-884M531 1384L531-884L347-884L347 1384"}],
 "10215":[1.45,0.95,0.838,{"p":"55-950L556-950L556 1450L55 1450C33 1450 22 1439 22 1417C22 1395 33 1384 55 1384L242 1384L242-884L55-884C33-884 22-895 22-917C22-939 33-950 55-950M491 1384L491-884L307-884L307 1384"}],
 "10216":[1.45,0.95,0.75,{"p":"664-950C686-950 697-939 697-917C697-915 696-911 695-905L240 250L695 1405C696 1411 697 1415 697 1417C697 1439 686 1450 664 1450C649 1450 639 1443 634 1430L175 262C174 256 173 252 173 250C173 248 174 244 175 238L634-930C639-943 649-950 664-950"}],
 "10217":[1.45,0.95,0.75,{"p":"575 238C576 244 577 248 577 250C577 252 576 256 575 262L116 1430C111 1443 101 1450 86 1450C64 1450 53 1439 53 1417C53 1415 54 1411 55 1405L510 250L55-905C54-911 53-915 53-917C53-939 64-950 86-950C101-950 111-943 116-930"}],
 "10218":[1.45,0.95,1.124,{"p":"1038-950C1060-950 1071-939 1071-917C1071-912 1070-908 1069-905L612 250L1069 1405C1070 1408 1071 1412 1071 1417C1071 1439 1060 1450 1038 1450C1023 1450 1013 1443 1008 1430L546 262C545 256 544 252 544 250C544 248 545 244 546 238L1008-930C1013-943 1023-950 1038-950M668-950C689-950 700-939 700-917C700-915 699-911 698-905L241 250L698 1405C699 1411 700 1415 700 1417C700 1439 689 1450 668 1450C653 1450 642 1443 637 1430L175 262C174 256 173 252 173 250C173 248 174 244 175 238L637-930C642-943 653-950 668-950"}],
 "10219":[1.45,0.95,1.124,{"p":"949 238C950 241 951 245 951 250C951 255 950 259 949 262L487 1430C482 1443 471 1450 456 1450C435 1450 424 1439 424 1417C424 1415 425 1411 426 1405L883 250L426-905C425-911 424-915 424-917C424-939 435-950 456-950C471-950 482-943 487-930M578 238C579 244 580 248 580 250C580 252 579 256 578 262L116 1430C111 1443 101 1450 86 1450C64 1450 53 1439 53 1417C53 1415 54 1411 55 1405L513 250L55-905C54-911 53-915 53-917C53-939 64-950 86-950C101-950 111-943 116-930"}],
 "10222":[1.472,0.972,0.541,{"p":"460-972C477-972 485-963 485-946C485-938 483-932 478-927C423-871 382-740 355-534C337-393 328-251 328-106L328 606C328 751 337 893 355 1034C382 1240 423 1371 478 1427C483 1432 485 1438 485 1446C485 1463 477 1472 460 1472C452 1472 446 1470 442 1465C389 1410 340 1297 298 1128C256 959 235 785 235 606L235-106C235-285 256-459 298-628C340-797 389-910 442-965C446-970 452-972 460-972"}],
 "10223":[1.472,0.972,0.541,{"p":"99-965C152-910 200-797 242-628C284-459 306-285 306-106L306 606C306 785 284 959 242 1128C200 1297 152 1410 99 1465C95 1470 89 1472 81 1472C64 1472 56 1463 56 1446C56 1438 58 1432 63 1427C118 1371 159 1240 186 1034C204 893 213 751 213 606L213-106C213-251 204-393 186-534C159-740 118-871 63-927C58-932 56-938 56-946C56-963 64-972 81-972C89-972 95-970 99-965"}],
 "10627":[1.45,0.95,0.75,{"p":"602-889L602 1389C619 1395 648 1402 648 1424C648 1441 639 1450 622 1450C619 1450 617 1450 615 1449C543 1426 479 1389 423 1338C358 1277 325 1214 325 1147L325 549C325 490 305 434 265 381C225 328 177 292 121 275C108 271 102 263 102 250C102 237 108 229 121 225C177 208 225 172 265 119C305 66 325 10 325-49L325-647C325-714 358-777 423-838C479-889 543-926 615-949C617-950 619-950 622-950C639-950 648-941 648-924C648-902 619-895 602-889M197 250C300 300 425 413 425 549L425 1147C425 1231 484 1308 537 1349L537-849C484-808 425-730 425-647L425-49C425 87 300 200 197 250"}],
 "10628":[1.45,0.95,0.75,{"p":"148 1389L148-889C131-895 102-902 102-924C102-941 111-950 128-950C131-950 133-950 135-949C207-926 271-889 327-838C392-777 425-714 425-647L425-49C425 10 445 66 485 119C525 172 573 208 629 225C642 229 648 237 648 250C648 263 642 271 629 275C573 292 525 328 485 381C445 434 425 490 425 549L425 1147C425 1214 392 1277 327 1338C271 1389 207 1426 135 1449C133 1450 131 1450 128 1450C111 1450 102 1441 102 1424C102 1402 131 1395 148 1389M553 250C450 200 325 87 325-49L325-647C325-731 266-808 213-849L213 1349C266 1308 325 1230 325 1147L325 549C325 413 450 300 553 250"}],
 "10629":[1.446,0.946,0.736,{"p":"660-946C675-946 682-939 682-924C682-917 679-911 674-907C621-867 572-810 527-735L527 1235C572 1310 621 1367 674 1407C679 1411 682 1417 682 1424C682 1439 675 1446 660 1446C656 1446 652 1444 647 1441C574 1386 505 1304 440 1195C327 1005 226 718 226 435L226 65C226-202 320-477 422-664C490-787 565-880 647-941C652-944 656-946 660-946M462 1110L462-610C367-398 320-173 320 65L320 435C320 673 367 898 462 1110"}],
 "10630":[1.446,0.946,0.736,{"p":"261-941C334-886 403-804 468-695C581-506 682-218 682 65L682 435C682 702 588 977 486 1164C418 1287 343 1380 261 1441C256 1444 252 1446 248 1446C233 1446 226 1439 226 1424C226 1417 229 1411 234 1407C287 1367 336 1310 381 1235L381-735C336-810 287-867 234-907C229-911 226-917 226-924C226-939 233-946 248-946C252-946 256-944 261-941M588 435L588 65C588-173 541-398 446-610L446 1110C541 898 588 673 588 435"}],
 "10748":[1.447,0.936,0.467,{"ic":0.131,"p":"598-906C589-841 558-735 505-587C480-515 444-421 399-305C282-7 197 178 144 250C251 373 350 569 441 839C522 1080 574 1270 597 1408C598 1412 598 1415 598 1416C598 1429 582 1445 570 1446C554 1447 533 1437 530 1424C509 1296 455 1110 366 866C269 599 167 396 60 259C57 256 56 253 56 250C56 247 57 244 60 241C98 184 153 74 226-88C410-496 511-771 530-914C531-923 553-936 564-936C577-936 598-919 598-906"}],
 "10749":[1.447,0.936,0.467,{"ic":0.131,"p":"594 241C597 244 598 247 598 250C598 253 597 256 594 259C487 396 385 599 288 866C199 1109 145 1295 124 1424C121 1437 100 1447 84 1446C72 1445 56 1429 56 1416C56 1415 56 1412 57 1408C80 1270 132 1080 213 839C304 569 403 373 510 250C457 178 372-7 255-305C136-609 69-809 56-906C56-919 77-936 90-936C101-936 123-923 124-914C133-843 161-744 208-619C228-566 431-71 446-38C499 79 548 172 594 241"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/size7.js
var size7;
var init_size7 = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/size7.js"() {
    size7 = JSON.parse(`{
 "40":[1.745,1.245,0.875,{"p":"798-1245C815-1245 823-1237 823-1220C823-1212 820-1205 813-1200C732-1139 659-1043 592-910C473-673 385-340 385 1L385 499C385 654 403 810 438 967C500 1247 630 1562 813 1700C820 1705 823 1712 823 1720C823 1737 815 1745 798 1745C793 1745 788 1743 784 1740C697 1673 614 1574 536 1441C398 1205 277 850 277 499L277 1C277-329 388-667 512-899C594-1050 685-1164 784-1240C788-1243 793-1245 798-1245"}],
 "41":[1.745,1.245,0.875,{"p":"598 1L598 499C598 829 487 1167 363 1399C281 1550 190 1664 91 1740C87 1743 82 1745 77 1745C60 1745 52 1737 52 1720C52 1712 55 1705 62 1700C143 1639 216 1543 283 1410C402 1173 490 840 490 499L490 1C490-154 472-310 437-467C375-747 245-1062 62-1200C55-1205 52-1212 52-1220C52-1237 60-1245 77-1245C82-1245 87-1243 91-1240C178-1173 261-1074 339-941C477-705 598-350 598 1"}],
 "47":[3.56,3.06,2.572,{"p":"2473 3560C2453 3560 2439 3550 2432 3531L59-3001C58-3004 57-3010 57-3017C57-3041 76-3060 100-3060C120-3060 133-3050 140-3031L2514 3501C2516 3506 2517 3511 2517 3517C2517 3541 2497 3560 2473 3560"}],
 "91":[1.75,1.25,0.667,{"p":"614-1182L387-1182L387 1682L614 1682C636 1682 647 1693 647 1716C647 1739 636 1750 614 1750L321 1750L321-1250L614-1250C636-1250 647-1239 647-1216C647-1197 633-1182 614-1182"}],
 "92":[3.56,3.06,2.572,{"p":"2515-3017C2515-3010 2514-3004 2513-3001L139 3531C132 3550 119 3560 99 3560C75 3560 55 3541 55 3517C55 3511 56 3506 58 3502L2431-3031C2438-3050 2452-3060 2472-3060C2496-3060 2515-3041 2515-3017"}],
 "93":[1.75,1.25,0.667,{"p":"53-1250L346-1250L346 1750L53 1750C31 1750 20 1739 20 1716C20 1693 31 1682 53 1682L280 1682L280-1182L53-1182C31-1182 20-1193 20-1216C20-1239 31-1250 53-1250"}],
 "123":[1.75,1.25,0.902,{"p":"248 250C368 314 505 458 505 624L505 1372C505 1438 528 1502 574 1565C620 1628 673 1670 736 1692C749 1697 755 1706 755 1720C755 1740 745 1750 725 1750C722 1750 719 1749 715 1748C634 1718 562 1670 500 1603C431 1528 397 1451 397 1372L397 624C397 553 375 484 331 417C286 348 231 301 166 278C153 273 147 264 147 250C147 236 153 227 166 222C231 199 286 152 330 84C374 16 397-53 397-124L397-872C397-951 431-1028 500-1103C562-1170 634-1218 715-1248C719-1249 722-1250 725-1250C745-1250 755-1240 755-1220C755-1206 749-1197 736-1192C673-1170 620-1128 574-1065C528-1002 505-938 505-872L505-124C505 42 368 185 248 250"}],
 "125":[1.75,1.25,0.902,{"p":"654 250C534 186 397 42 397-124L397-872C397-938 374-1002 328-1065C282-1128 229-1170 166-1192C153-1197 147-1206 147-1220C147-1240 157-1250 177-1250C180-1250 183-1249 187-1248C268-1218 340-1170 402-1103C471-1028 505-951 505-872L505-124C505-53 528 16 572 84C616 152 671 199 736 222C749 227 755 236 755 250C755 264 749 273 736 278C671 301 616 348 571 417C527 484 505 553 505 624L505 1372C505 1451 471 1528 402 1603C340 1670 268 1718 187 1748C183 1749 180 1750 177 1750C157 1750 147 1740 147 1720C147 1706 153 1697 166 1692C229 1670 282 1628 328 1565C374 1502 397 1438 397 1372L397 624C397 458 534 315 654 250"}],
 "770":[0.749,-0.569,1.896,{"p":"1891 569L1896 605L948 749L0 605L5 569L948 678"}],
 "771":[0.773,-0.527,1.915,{"p":"1909 740C1913 744 1915 749 1915 755C1915 767 1909 773 1896 773C1891 773 1888 772 1885 769C1840 733 1768 705 1668 685C1618 675 1434 647 1323 647C1245 647 1125 660 963 686C801 712 677 725 591 725C554 725 515 723 474 718C265 695 109 642 6 560C2 556 0 551 0 545C0 533 6 527 19 527C23 527 27 528 31 531C76 567 148 595 248 615C299 626 482 653 592 653C670 653 790 640 952 614C1114 588 1238 575 1324 575C1361 575 1400 577 1441 582C1650 605 1806 658 1909 740"}],
 "774":[0.744,-0.573,1.92,{"ic":0.001,"p":"1796 638C1864 658 1906 689 1921 732L1886 744C1880 727 1863 712 1834 701C1803 689 1757 679 1694 671C1519 648 1380 645 1154 644L766 644C579 645 447 649 372 656C224 669 129 684 86 701C57 712 40 727 34 744L-1 732C14 689 56 658 124 638C203 614 282 599 363 592C591 574 748 573 960 573C1172 573 1331 574 1557 592C1638 599 1717 614 1796 638"}],
 "780":[0.743,-0.563,1.896,{"p":"948 563L1896 707L1891 743L948 634L5 743L0 707"}],
 "8260":[3.56,3.06,2.572,{"p":"2473 3560C2453 3560 2439 3550 2432 3531L59-3001C58-3004 57-3010 57-3017C57-3041 76-3060 100-3060C120-3060 133-3050 140-3031L2514 3501C2516 3506 2517 3511 2517 3517C2517 3541 2497 3560 2473 3560"}],
 "8725":[0.623,0.122,0.607,{"p":"509 623C493 623 481 616 472 602L62-57C59-64 57-72 57-79C57-104 75-122 99-122C116-122 128-115 136-102L546 557C550 566 552 573 552 579C552 604 533 623 509 623"}],
 "8726":[0.623,0.122,0.607,{"p":"552-79C552-73 550-66 546-57L136 602C127 616 115 623 99 623C75 623 57 604 57 579C57 572 59 564 62 557L472-102C480-115 492-122 509-122C533-122 552-103 552-79"}],
 "8739":[2.052,1.552,0.333,{"p":"145-1515C145-1531 145-1552 166-1552C188-1552 189-1532 189-1515L189 2015C189 2031 188 2052 167 2052C145 2052 145 2032 145 2015"}],
 "8741":[2.053,1.553,0.555,{"p":"203-1531L203 2031C203 2043 190 2053 178 2053C166 2053 153 2043 153 2031L153-1531C153-1543 166-1553 178-1553C190-1553 203-1543 203-1531M401-1531L401 2031C401 2043 388 2053 376 2053C364 2053 351 2043 351 2031L351-1531C351-1543 364-1553 376-1553C388-1553 401-1543 401-1531"}],
 "8968":[1.75,1.25,0.623,{"p":"562 1750L221 1750L221-1216C221-1239 232-1250 254-1250C277-1250 288-1239 288-1216L288 1682L562 1682C584 1682 595 1693 595 1716C595 1735 581 1750 562 1750"}],
 "8969":[1.75,1.25,0.623,{"p":"369-1250C391-1250 402-1239 402-1216L402 1750L61 1750C39 1750 28 1739 28 1716C28 1693 39 1682 61 1682L335 1682L335-1216C335-1239 346-1250 369-1250"}],
 "8970":[1.75,1.25,0.623,{"p":"562-1182L288-1182L288 1716C288 1739 277 1750 254 1750C232 1750 221 1739 221 1716L221-1250L562-1250C584-1250 595-1239 595-1216C595-1197 581-1182 562-1182"}],
 "8971":[1.75,1.25,0.623,{"p":"61-1250L402-1250L402 1716C402 1739 391 1750 369 1750C346 1750 335 1739 335 1716L335-1182L61-1182C39-1182 28-1193 28-1216C28-1239 39-1250 61-1250"}],
 "9140":[0.772,-0.504,2.985,{"p":"2951 504C2974 504 2985 515 2985 537L2985 772L0 772L0 537C0 515 11 504 34 504C57 504 68 515 68 537L68 706L2917 706L2917 537C2917 515 2928 504 2951 504"}],
 "9141":[-0.074,0.342,2.985,{"p":"0-342L2985-342L2985-107C2985-85 2974-74 2951-74C2928-74 2917-85 2917-107L2917-276L68-276L68-107C68-85 57-74 34-74C11-74 0-85 0-107"}],
 "9180":[0.796,-0.502,4.032,{"p":"4032 531C4032 540 4029 547 4023 552C3938 635 3697 699 3298 746C3010 779 2748 796 2513 796L1519 796C1284 796 1022 779 734 746C335 699 94 635 9 552C3 547 0 540 0 531C0 516 15 502 30 502C39 502 46 505 51 511C122 580 357 629 758 660C1006 679 1260 689 1519 689L2513 689C2772 689 3026 679 3274 660C3675 629 3910 580 3981 511C3986 505 3993 502 4002 502C4017 502 4032 516 4032 531"}],
 "9181":[-0.072,0.366,4.032,{"p":"4002-72C3993-72 3986-75 3981-81C3910-150 3675-199 3274-230C3026-249 2772-259 2513-259L1519-259C1260-259 1006-249 758-230C357-199 122-150 51-81C46-75 39-72 30-72C15-72 0-86 0-101C0-110 3-117 9-122C94-205 335-269 734-316C1022-349 1284-366 1519-366L2513-366C2748-366 3010-349 3298-316C3697-269 3938-205 4023-122C4029-117 4032-110 4032-101C4032-86 4017-72 4002-72"}],
 "9182":[0.854,-0.493,4.006,{"p":"3989 493C4000 493 4006 499 4006 510C4006 512 4006 514 4005 515C3980 582 3904 636 3779 677C3679 710 3584 727 3493 727L2499 727C2356 727 2239 736 2150 754C2063 771 2020 799 2020 837C2020 848 2014 854 2003 854C1992 854 1986 848 1986 837C1986 799 1942 772 1854 754C1766 736 1650 727 1507 727L513 727C422 727 327 710 227 677C102 636 26 582 1 515C0 514 0 512 0 510C0 499 6 493 17 493C25 493 30 496 33 503C47 542 99 571 189 590C279 609 387 619 513 619L1507 619C1597 619 1686 631 1775 656C1889 687 1965 731 2003 788C2041 731 2117 687 2231 656C2320 631 2409 619 2499 619L3493 619C3619 619 3727 609 3817 590C3907 571 3959 542 3973 503C3976 496 3981 493 3989 493"}],
 "9183":[-0.062,0.423,4.006,{"p":"4005-85C4006-84 4006-82 4006-79C4006-68 4000-62 3989-62C3982-62 3976-66 3973-73C3958-112 3907-141 3818-160C3727-179 3619-189 3493-189L2499-189C2409-189 2320-201 2231-226C2117-257 2041-301 2003-358C1965-301 1889-257 1775-226C1686-201 1597-189 1507-189L513-189C387-189 280-179 190-160C100-141 48-112 33-73C30-66 24-62 17-62C6-62 0-68 0-79C0-82 0-84 1-85C26-152 101-206 227-247C327-280 422-297 513-297L1507-297C1650-297 1766-306 1854-324C1942-342 1986-369 1986-406C1986-417 1992-423 2003-423C2014-423 2020-417 2020-406C2020-369 2063-341 2150-324C2239-306 2356-297 2499-297L3493-297C3584-297 3679-280 3779-247C3905-206 3980-152 4005-85"}],
 "9184":[0.873,-0.605,4.082,{"ic":0.006,"p":"3975 605L4088 605L3812 873L270 873L-6 605L107 605L273 766L3809 766"}],
 "9185":[-0.175,0.443,4.082,{"ic":0.006,"p":"3812-443L4088-175L3975-175L3809-336L273-336L107-175L-6-175L270-443"}],
 "10214":[1.75,1.25,1.007,{"p":"951-1182L717-1182L717 1682L951 1682C974 1682 985 1693 985 1716C985 1739 974 1750 951 1750L353 1750L353-1250L951-1250C974-1250 985-1239 985-1216C985-1196 971-1182 951-1182M650 1682L650-1182L420-1182L420 1682"}],
 "10215":[1.75,1.25,1.007,{"p":"56-1250L654-1250L654 1750L56 1750C33 1750 22 1739 22 1716C22 1693 33 1682 56 1682L290 1682L290-1182L56-1182C33-1182 22-1193 22-1216C22-1239 33-1250 56-1250M587 1682L587-1182L357-1182L357 1682"}],
 "10216":[1.75,1.25,0.908,{"p":"818-1250C841-1250 852-1239 852-1216C852-1211 851-1207 850-1204L273 250L850 1704C851 1707 852 1711 852 1716C852 1739 841 1750 818 1750C803 1750 793 1743 787 1729L206 262C205 259 204 255 204 250C204 245 205 241 206 238L787-1229C793-1243 803-1250 818-1250"}],
 "10217":[1.75,1.25,0.908,{"p":"702 238C703 241 704 245 704 250C704 255 703 259 702 262L121 1729C115 1743 105 1750 90 1750C67 1750 56 1739 56 1716C56 1711 57 1707 58 1704L635 250L58-1204C57-1207 56-1211 56-1216C56-1239 67-1250 90-1250C105-1250 115-1243 121-1229"}],
 "10218":[1.75,1.25,1.362,{"p":"1272-1250C1295-1250 1306-1239 1306-1216C1306-1211 1305-1207 1303-1203L725 250L1303 1703C1305 1707 1306 1711 1306 1716C1306 1739 1295 1750 1272 1750C1257 1750 1246 1743 1241 1729L657 263C656 260 655 256 655 250C655 244 656 240 657 237L1241-1229C1246-1243 1257-1250 1272-1250M822-1250C844-1250 855-1239 855-1216C855-1211 854-1207 853-1204L274 250L853 1704C854 1707 855 1711 855 1716C855 1739 844 1750 822 1750C807 1750 796 1743 790 1729L206 262C205 259 204 255 204 250C204 245 205 241 206 238L790-1229C796-1243 807-1250 822-1250"}],
 "10219":[1.75,1.25,1.362,{"p":"1155 237C1157 240 1158 245 1158 250C1158 255 1157 259 1155 263L571 1729C565 1743 555 1750 540 1750C518 1750 507 1739 507 1716C507 1710 508 1706 509 1703L1087 250L509-1203C508-1206 507-1210 507-1216C507-1239 518-1250 540-1250C555-1250 565-1243 571-1229M705 238C706 241 707 245 707 250C707 255 706 259 705 262L121 1729C116 1743 105 1750 90 1750C67 1750 56 1739 56 1716C56 1711 57 1707 58 1704L637 250L58-1204C57-1207 56-1211 56-1216C56-1239 67-1250 90-1250C105-1250 116-1243 121-1229"}],
 "10222":[1.776,1.276,0.647,{"p":"562-1276C581-1276 591-1266 591-1246C591-1237 588-1230 582-1225C516-1156 467-1000 435-757C412-589 401-420 401-249L401 749C401 920 412 1089 435 1257C467 1500 516 1656 582 1725C588 1730 591 1737 591 1746C591 1766 581 1776 562 1776C553 1776 546 1773 541 1767C461 1684 397 1522 350 1281C313 1090 294 913 294 749L294-249C294-413 313-590 350-781C397-1022 461-1184 541-1267C546-1273 553-1276 562-1276"}],
 "10223":[1.776,1.276,0.647,{"p":"56 1746C56 1737 59 1730 65 1725C131 1656 180 1500 212 1257C235 1089 246 920 246 749L246-249C246-420 235-589 212-757C180-1000 131-1156 65-1225C59-1230 56-1237 56-1246C56-1261 70-1276 85-1276C94-1276 101-1273 106-1267C186-1184 250-1023 297-782C334-591 353-413 353-249L353 749C353 913 334 1090 297 1281C250 1522 186 1684 106 1767C101 1773 94 1776 85 1776C70 1776 56 1761 56 1746"}],
 "10627":[1.75,1.25,0.902,{"p":"725-1250C745-1250 755-1240 755-1220C755-1206 749-1196 736-1192C723-1188 708-1181 692-1172L692 1672C708 1681 723 1688 736 1692C749 1696 755 1706 755 1720C755 1740 745 1750 725 1750C722 1750 719 1749 715 1748C634 1718 562 1670 500 1603C431 1528 397 1451 397 1372L397 624C397 553 375 484 331 417C286 348 231 301 166 278C153 273 147 264 147 250C147 236 153 227 166 222C231 199 286 152 330 84C374 16 397-53 397-124L397-872C397-951 431-1028 500-1103C562-1170 634-1218 715-1248C719-1249 722-1250 725-1250M248 250C368 314 505 458 505 624L505 1372C505 1474 566 1568 625 1622L625-1122C566-1068 505-974 505-872L505-124C505 42 368 185 248 250"}],
 "10628":[1.75,1.25,0.902,{"p":"736 222C749 227 755 236 755 250C755 264 749 273 736 278C671 301 616 348 571 417C527 484 505 553 505 624L505 1372C505 1451 471 1528 402 1603C340 1670 268 1718 187 1748C183 1749 180 1750 177 1750C157 1750 147 1740 147 1720C147 1706 153 1696 166 1692C179 1688 194 1681 210 1672L210-1172L170-1190C155-1198 147-1208 147-1220C147-1240 157-1250 177-1250C180-1250 183-1249 187-1248C268-1218 340-1170 402-1103C471-1028 505-951 505-872L505-124C505-53 528 16 572 84C616 152 671 199 736 222M654 250C534 186 397 42 397-124L397-872C397-974 336-1068 277-1122L277 1622C336 1566 397 1475 397 1372L397 624C397 458 534 315 654 250"}],
 "10629":[1.745,1.245,0.875,{"p":"798-1245C815-1245 823-1237 823-1220C823-1212 820-1205 813-1200C748-1151 686-1077 629-979L629 1479C686 1577 748 1651 813 1700C820 1705 823 1712 823 1720C823 1737 815 1745 798 1745C793 1745 788 1743 784 1740C697 1673 614 1574 536 1441C398 1205 277 850 277 499L277 1C277-329 388-667 512-899C594-1050 685-1164 784-1240C788-1243 793-1245 798-1245M562 1347L562-847C462-623 385-309 385 1L385 499C385 809 462 1122 562 1347"}],
 "10630":[1.745,1.245,0.875,{"p":"823 1L823 499C823 829 712 1167 588 1399C506 1550 415 1664 316 1740C312 1743 307 1745 302 1745C285 1745 277 1737 277 1720C277 1712 280 1705 287 1700C352 1651 414 1577 471 1479L471-979C414-1077 352-1151 287-1200C280-1205 277-1212 277-1220C277-1237 285-1245 302-1245C307-1245 312-1243 316-1240C403-1173 486-1074 564-941C702-705 823-350 823 1M538-847L538 1347C638 1124 715 808 715 499L715 1C715-309 638-622 538-847"}],
 "10748":[1.751,1.251,0.467,{"ic":0.257,"p":"724-1216C724-1215 724-1212 723-1208C696-1051 636-828 543-541C454-265 305 62 154 250C305 438 454 765 543 1041C636 1328 696 1551 723 1708C724 1712 724 1715 724 1716C724 1731 708 1747 694 1748C675 1751 653 1740 650 1724C636 1643 610 1536 571 1404C468 1060 335 713 188 453C145 379 103 314 60 259C57 256 56 253 56 250C56 247 57 244 60 241C119 165 177 70 236-43C337-236 430-464 515-725C588-948 633-1115 650-1224C653-1240 675-1251 694-1248C708-1247 724-1231 724-1216"}],
 "10749":[1.751,1.251,0.467,{"ic":0.592,"p":"1055 241C1058 244 1059 247 1059 250C1059 253 1058 256 1055 259C996 335 938 430 879 543C778 736 685 964 600 1225C527 1448 482 1615 465 1724C462 1740 440 1751 421 1748C407 1747 391 1731 391 1716C391 1715 391 1712 392 1708C419 1551 479 1328 572 1041C661 765 810 438 961 250C810 62 661-265 572-541C479-828 419-1051 392-1208C391-1212 391-1215 391-1216C391-1231 407-1247 421-1248C440-1251 462-1240 465-1224C479-1143 505-1036 544-904C647-560 780-213 927 47C970 121 1012 186 1055 241"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/tex-mathit.js
var texMathit;
var init_tex_mathit = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/tex-mathit.js"() {
    texMathit = JSON.parse(__kittexJson13);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/tex-calligraphic.js
var texCalligraphic;
var init_tex_calligraphic = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/tex-calligraphic.js"() {
    texCalligraphic = {};
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/tex-calligraphic-bold.js
var texCalligraphicBold;
var init_tex_calligraphic_bold = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/tex-calligraphic-bold.js"() {
    texCalligraphicBold = {};
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/tex-oldstyle.js
var texOldstyle;
var init_tex_oldstyle = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/tex-oldstyle.js"() {
    texOldstyle = JSON.parse(`{
 "48":[0.472,0.022,0.57,{"p":"496 225C496 291 486 359 443 410C404 455 344 472 285 472C226 472 166 455 127 410C84 359 74 291 74 225C74 159 84 91 127 40C166-5 226-22 285-22C344-22 404-5 443 40C486 91 496 159 496 225M412 225C412 167 409 107 380 57C360 22 325 0 285 0C245 0 210 22 190 57C161 107 158 167 158 225C158 283 161 343 190 393C210 428 245 450 285 450C325 450 360 428 380 393C409 343 412 283 412 225"}],
 "49":[0.472,0,0.404,{"p":"367 0L367 31L322 31C286 31 242 34 242 79L242 438C242 451 242 472 227 472C215 472 197 458 186 452C139 432 87 428 37 428L37 397C79 397 128 397 167 414L167 80C167 37 125 31 90 31L42 31L42 0L208 4"}],
 "50":[0.472,0,0.554,{"p":"480 138L464 138C444 138 449 80 427 76C415 73 402 73 386 73L180 73L357 174C420 210 480 255 480 332C480 443 352 472 261 472C194 472 86 440 86 349C86 322 104 307 126 307C150 307 165 326 165 346C165 369 149 382 128 386C156 425 202 441 249 441C314 441 388 406 388 333C388 258 313 194 260 157L102 47C89 37 74 32 74 14C74 9 75 4 75 0L443 0C450 0 453 6 455 13"}],
 "51":[0.472,0.216,0.563,{"p":"489-23C489 59 426 137 322 158C404 185 462 255 462 334C462 416 374 472 278 472C177 472 101 412 101 336C101 303 123 284 152 284C183 284 203 306 203 335C203 385 156 385 141 385C172 434 238 447 274 447C315 447 370 425 370 335C370 323 368 265 342 221C312 173 278 170 253 169C245 168 221 166 214 166C206 165 199 164 199 154C199 143 206 143 223 143L267 143C349 143 386 75 386-23C386-159 317-188 273-188C230-188 155-171 120-112C155-117 186-95 186-57C186-21 159-1 130-1C106-1 74-15 74-59C74-150 167-216 276-216C398-216 489-125 489-23"}],
 "52":[0.485,0.194,0.517,{"p":"480 0L480 31L380 31L380 459C380 479 380 485 364 485C355 485 352 485 344 473L37 31L37 0L303 0L303-116C303-152 301-163 227-163L206-163L206-194C247-191 299-191 341-191C383-191 436-191 477-194L477-163L456-163C382-163 380-152 380-116L380 0M309 31L65 31L309 377"}],
 "53":[0.472,0.216,0.547,{"p":"473 7C473 126 391 226 283 226C235 226 192 210 156 175L156 370C176 364 209 357 241 357C364 357 434 448 434 461C434 467 431 472 424 472C424 472 421 472 416 469C396 460 347 440 280 440C240 440 194 447 147 468C139 471 135 471 135 471C125 471 125 463 125 447L125 151C125 133 125 125 139 125C146 125 148 128 152 134C163 150 200 204 281 204C333 204 358 158 366 140C382 103 384 64 384 14C384-21 384-81 360-123C336-162 299-188 253-188C180-188 123-135 106-76C109-77 112-78 123-78C156-78 173-53 173-29C173-5 156 20 123 20C109 20 74 13 74-33C74-119 143-216 255-216C371-216 473-120 473 7"}],
 "54":[0.666,0.022,0.563,{"p":"489 204C489 331 400 427 289 427C221 427 184 376 164 328L164 352C164 605 288 641 339 641C363 641 405 635 427 601C412 601 372 601 372 556C372 525 396 510 418 510C434 510 464 519 464 558C464 618 420 666 337 666C209 666 74 537 74 316C74 49 190-22 283-22C394-22 489 72 489 204M399 205C399 157 399 107 382 71C352 11 306 6 283 6C220 6 190 66 184 81C166 128 166 208 166 226C166 304 198 404 288 404C304 404 350 404 381 342C399 305 399 254 399 205"}],
 "55":[0.485,0.213,0.503,{"p":"466 453L223 453C101 453 99 466 95 485L70 485L37 279L62 279C65 295 74 358 87 370C94 376 172 376 185 376L392 376L280 218C190 83 157-56 157-158C157-168 157-213 203-213C249-213 249-168 249-158L249-107C249-52 252 3 260 57C264 80 278 166 322 228L457 418C466 430 466 432 466 453"}],
 "56":[0.666,0.022,0.563,{"p":"489 168C489 204 478 249 440 291C421 312 405 322 341 362C413 399 462 451 462 517C462 609 373 666 282 666C182 666 101 592 101 499C101 481 103 436 145 389C156 377 193 352 218 335C160 306 74 250 74 151C74 45 176-22 281-22C394-22 489 61 489 168M418 517C418 460 379 412 319 377L195 457C149 487 145 521 145 538C145 599 210 641 281 641C354 641 418 589 418 517M439 132C439 58 364 6 282 6C196 6 124 68 124 151C124 209 156 273 241 320L364 242C392 223 439 193 439 132"}],
 "57":[0.472,0.216,0.563,{"p":"489 135C489 404 374 472 285 472C230 472 181 454 138 409C97 364 74 322 74 247C74 122 162 24 274 24C335 24 376 66 399 124L399 92C399-142 295-188 237-188C220-188 166-186 139-152C183-152 191-123 191-106C191-75 167-60 145-60C129-60 99-69 99-108C99-175 153-216 238-216C367-216 489-80 489 135M397 227C397 144 363 47 275 47C259 47 213 47 182 110C164 147 164 197 164 246C164 300 164 347 185 384C212 434 250 447 285 447C331 447 364 413 381 368C393 336 397 273 397 227"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/tex-oldstyle-bold.js
var texOldstyleBold;
var init_tex_oldstyle_bold = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/tex-oldstyle-bold.js"() {
    texOldstyleBold = JSON.parse(`{
 "48":[0.461,0.011,0.654,{"p":"569 225C569 291 557 358 511 404C463 450 394 461 327 461C260 461 191 450 143 404C97 358 85 291 85 225C85 159 97 92 143 46C191 0 260-11 327-11C394-11 463 0 511 46C557 92 569 159 569 225M441 225C441 173 439 119 413 73C396 43 362 25 327 25C292 25 258 43 241 73C215 119 213 173 213 225C213 277 215 331 241 377C258 407 292 425 327 425C362 425 396 407 413 377C439 331 441 277 441 225"}],
 "49":[0.461,0,0.494,{"p":"452 0L452 47L312 47L312 437C312 451 309 461 288 461C270 461 263 454 249 449C183 419 113 417 43 417L43 370C93 370 144 370 193 383L193 47L54 47L54 0L257 4"}],
 "50":[0.461,0,0.636,{"p":"551 182L504 182L492 139C488 123 477 117 461 117L271 117L436 195C496 223 551 253 551 323C551 445 395 461 296 461C226 461 98 456 98 357C98 325 122 302 154 302C185 302 207 326 207 356C207 374 200 389 186 401C213 408 236 414 265 414C320 414 413 399 413 317C413 251 350 212 289 173L110 58C97 50 85 46 85 25L85 0L520 0"}],
 "51":[0.461,0.205,0.648,{"p":"563-14C563 41 534 127 389 158C458 179 531 236 531 322C531 399 455 461 314 461C195 461 117 397 117 317C117 274 148 247 186 247C231 247 256 279 256 316C256 374 202 385 198 386C233 414 277 422 308 422C391 422 394 358 394 325C394 312 393 181 289 175C248 173 246 172 241 171C231 170 229 160 229 154C229 136 239 136 257 136L301 136C410 136 410 38 410-13C410-60 410-162 306-162C280-162 228-158 180-128C213-119 238-94 238-53C238-8 206 23 162 23C120 23 85-4 85-55C85-145 182-205 311-205C490-205 563-105 563-14"}],
 "52":[0.488,0.194,0.595,{"p":"553-194L553-147L456-147L456 0L553 0L553 47L456 47L456 456C456 483 454 488 426 488C405 488 405 487 392 472L43 47L43 0L331 0L331-147L219-147L219-194C257-191 348-191 391-191C431-191 518-191 553-194M342 47L95 47L342 345"}],
 "53":[0.461,0.205,0.63,{"p":"545 7C545 122 466 215 318 215C289 215 236 212 189 180L189 312C217 307 228 305 262 305C408 305 500 418 500 443C500 450 498 461 486 461C483 461 482 461 471 457C414 435 361 429 318 429C242 429 189 448 163 457C154 460 153 461 150 461C136 461 136 450 136 434L136 142C136 124 136 111 158 111C171 111 173 115 180 123C219 169 273 179 314 179C403 179 403 91 403 11C403-62 403-162 283-162C259-162 196-157 154-100C190-98 219-74 219-33C219 20 176 35 152 35C137 35 85 26 85-35C85-120 163-205 287-205C447-205 545-115 545 7"}],
 "54":[0.655,0.011,0.648,{"p":"563 205C563 345 462 418 341 418C319 418 263 418 221 342L221 361C221 475 242 518 249 533C273 580 327 616 388 616C406 616 440 613 463 590C427 585 409 558 409 528C409 494 432 466 471 466C510 466 534 492 534 530C534 592 492 655 386 655C250 655 85 569 85 317C85 238 94 158 135 89C182 13 258-11 328-11C467-11 563 71 563 205M427 207C427 106 427 32 326 32C274 32 247 71 239 87C223 119 223 192 223 210C223 335 277 382 332 382C427 382 427 307 427 207"}],
 "55":[0.488,0.199,0.579,{"p":"537 456L333 456C310 456 163 461 149 465C128 469 127 478 125 488L78 488L43 234L90 234C100 310 113 323 117 325C128 331 209 331 226 331L395 331C377 309 358 288 340 266C244 154 172 19 172-129C172-199 228-199 234-199C250-199 297-194 297-128L297-82C297 34 312 158 372 228L527 408C537 419 537 421 537 456"}],
 "56":[0.655,0.011,0.648,{"p":"563 187C563 295 479 342 430 370C500 406 531 450 531 508C531 610 440 655 326 655C187 655 117 576 117 480C117 436 135 373 213 329C129 292 85 235 85 161C85 40 193-11 322-11C482-11 563 77 563 187M456 507C456 458 430 424 386 395L236 479C220 488 192 505 192 539C192 609 282 616 322 616C406 616 456 575 456 507M477 132C477 48 383 32 326 32C228 32 171 83 171 161C171 239 224 282 259 302L396 226C440 201 477 180 477 132"}],
 "57":[0.461,0.205,0.648,{"p":"563 135C563 202 563 461 326 461C184 461 85 380 85 246C85 108 184 33 307 33C342 33 389 40 427 110L427 88C427 15 418-44 403-78C386-117 343-162 274-162C256-162 220-160 190-140C202-137 239-123 239-78C239-44 216-16 177-16C138-16 114-42 114-80C114-148 165-205 276-205C406-205 563-121 563 135M426 234C426 171 400 69 316 69C221 69 221 144 221 244C221 342 221 422 328 422C387 422 410 369 414 359C426 326 426 268 426 234"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/tex-variant.js
var texVariant;
var init_tex_variant = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/tex-variant.js"() {
    texVariant = JSON.parse(__kittexJson14);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/lf-tp.js
var lfTp;
var init_lf_tp = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/lf-tp.js"() {
    lfTp = JSON.parse(`{
 "8400":[0.711,-0.601,0.208,{"p":"18 601L208 601L208 636L85 636C110 660 123 679 123 693C123 705 117 711 105 711C98 711 92 708 88 701C73 668 48 646 12 635C4 632 0 627 0 619C0 607 6 601 18 601"}],
 "8406":[0.711,-0.521,0.205,{"p":"85 598L205 598L205 634L85 634C110 659 123 678 123 693C123 705 117 711 105 711C98 711 92 707 88 700C73 667 48 645 12 633C4 630 0 625 0 616C0 607 4 602 12 599C48 587 73 565 88 532C92 525 98 521 105 521C117 521 123 527 123 539C123 554 110 573 85 598"}],
 "8429":[-0.171,0.281,0.208,{"p":"85-206L208-206L208-171L18-171C6-171 0-177 0-189C0-197 4-202 12-205C48-216 73-238 88-271C92-278 98-281 105-281C117-281 123-275 123-263C123-249 110-230 85-206"}],
 "8430":[-0.091,0.281,0.205,{"p":"85-204L205-204L205-168L85-168C110-143 123-124 123-109C123-97 117-91 105-91C98-91 92-95 88-102C73-135 48-157 12-169C4-172 0-177 0-186C0-195 4-200 12-203C48-215 73-237 88-270C92-277 98-281 105-281C117-281 123-275 123-263C123-248 110-229 85-204"}],
 "8592":[0.51,0.01,0.507,{"p":"114 226L507 226L507 274L114 274C185 325 230 395 247 482L247 486C247 502 239 510 223 510C211 510 204 504 201 491C190 444 171 403 144 368C103 316 59 282 11 266C4 263 0 257 0 250C0 243 4 237 11 234C59 218 103 184 144 132C171 97 190 56 201 9C204-4 211-10 223-10C239-10 247-2 247 14L247 18C230 105 185 175 114 226"}],
 "8593":[0.505,0,0.5,{"p":"456 243C472 243 480 251 480 267C480 278 474 286 463 289C420 302 383 324 351 355C306 400 278 445 267 492C265 501 259 505 250 505C241 505 235 501 233 492C222 445 194 400 149 355C117 324 80 302 37 289C26 286 20 278 20 267C20 251 28 243 44 243C47 243 49 243 51 244C123 266 181 310 226 375L226 0L274 0L274 375C319 310 377 266 449 244C451 243 453 243 456 243"}],
 "8602":[0.51,0.01,0.386,{"p":"113 226L386 226L386 274L113 274C184 325 229 395 246 482L246 486C246 502 238 510 222 510C210 510 203 504 200 491C189 444 170 403 143 368C103 316 59 282 11 266C4 263 0 257 0 250C0 243 4 237 11 234C59 218 103 184 143 132C170 97 189 56 200 9C203-4 210-10 222-10C238-10 246-2 246 14L246 18C229 105 184 175 113 226"}],
 "8606":[0.51,0.01,0.507,{"p":"252 226L507 226L507 274L252 274C323 325 367 395 385 482L385 486C385 502 377 510 361 510C349 510 342 504 339 491C317 397 249 310 168 274L114 274C185 325 230 395 247 482L247 486C247 502 239 510 223 510C211 510 204 504 201 491C190 444 171 403 144 368C103 316 59 282 11 266C4 263 0 257 0 250C0 243 4 237 11 234C59 218 103 184 144 132C171 97 190 56 201 9C204-4 211-10 223-10C239-10 247-2 247 14L247 18C230 105 185 175 114 226L168 226C249 190 317 102 339 9C342-4 349-10 361-10C377-10 385-2 385 14L385 18C367 105 323 175 252 226"}],
 "8607":[0.505,0,0.572,{"p":"492 95C508 95 516 103 516 119C516 131 510 139 499 142C416 166 338 241 310 321L310 375C355 310 413 266 485 244C487 243 489 243 492 243C508 243 516 251 516 267C516 278 510 286 499 289C456 302 419 324 387 355C342 400 314 445 303 492C301 501 295 505 286 505C277 505 271 501 269 492C258 445 230 400 185 355C153 324 116 302 73 289C62 286 56 278 56 267C56 251 64 243 80 243C83 243 85 243 87 244C159 266 217 310 262 375L262 321C234 241 156 166 73 142C62 139 56 131 56 119C56 103 64 95 80 95C83 95 85 96 87 97C159 118 217 162 262 227L262 0L310 0L310 227C355 162 413 118 485 97C487 96 489 95 492 95"}],
 "8611":[0.51,0.01,0.58,{"p":"234 226L580 226L580 274L234 274C141 306 69 388 47 491C44 504 37 510 24 510C8 510 0 502 0 486L0 482C22 377 79 299 172 250C79 201 22 123 0 18L0 14C0-2 8-10 24-10C37-10 44-4 47 9C69 112 141 194 234 226"}],
 "8614":[0.51,0.011,0.499,{"p":"47 226L499 226L499 274L47 274L47 486C47 502 39 510 24 510C8 510 0 502 0 486L0 14C0-3 8-11 24-11C39-10 47-2 47 14"}],
 "8615":[0.498,0,0.632,{"p":"552 451C568 451 576 459 576 474C576 490 568 498 552 498L80 498C63 498 55 490 55 474C55 459 63 451 80 451L292 451L292 0L340 0L340 451"}],
 "8618":[0.546,-0.226,0.507,{"p":"47 386C47 449 98 499 161 499L201 499C216 499 224 507 224 523C224 538 216 546 201 546L161 546C73 546 0 474 0 386C0 298 73 226 161 226L507 226L507 274L161 274C98 274 47 323 47 386"}],
 "8620":[0.55,0.05,0.507,{"p":"161 550C72 550 0 477 0 388C0 299 72 226 161 226L276 226L276-26C276-42 284-50 299-50C315-50 323-42 323-26L323 226L507 226L507 274L323 274L323 388C323 477 250 550 161 550M47 388C47 452 97 503 161 503C225 503 276 452 276 388L276 274L161 274C97 274 47 324 47 388"}],
 "8636":[0.499,-0.226,0.513,{"p":"18 226L513 226L513 273L107 273C173 318 219 383 246 468C247 470 247 473 247 476C247 491 239 499 224 499C212 499 204 494 201 483C173 392 92 296 10 258C3 255 0 250 0 243C0 232 6 226 18 226"}],
 "8637":[0.273,0,0.512,{"p":"107 226L512 226L512 273L17 273C6 273 0 267 0 256C0 249 3 244 10 241C51 222 90 191 126 148C162 105 187 61 201 16C204 5 212 0 224 0C239 0 247 8 247 23C247 26 247 29 246 31C219 116 173 181 107 226"}],
 "8638":[0.513,0,0.441,{"p":"362 265C377 265 385 273 385 288C385 300 380 308 369 311C321 326 278 351 239 385C194 426 162 465 144 503C141 510 136 513 129 513C118 513 112 507 112 495L112 0L159 0L159 406C204 340 269 293 355 266C356 266 357 266 358 265"}],
 "8639":[0.513,0,0.441,{"p":"282 0L329 0L329 495C329 507 323 513 312 513C305 513 300 510 297 503C280 466 249 426 202 385C164 351 121 326 72 311C61 308 56 300 56 288C56 273 64 265 79 265C106 265 144 283 191 318C234 349 264 379 282 406"}],
 "8644":[0.432,0.172,0.515,{"p":"24 385L515 385L515 432L24 432C8 432 0 424 0 408C0 393 8 385 24 385M135 65L515 65L515 112L135 112C207 165 251 234 268 321L268 323L269 324C269 341 261 349 245 349C232 349 224 343 222 330C213 283 194 242 165 206C124 155 79 121 32 105C25 102 21 96 21 89C21 81 25 75 32 72C79 57 124 23 165-29C194-65 213-106 222-153C224-166 232-172 245-172C261-172 269-164 269-147L268-145L268-144C251-57 207 13 135 65"}],
 "8645":[0.514,0,0.896,{"p":"583 0L630 0L630 490C630 506 622 514 606 514C591 514 583 506 583 490M497 228C513 228 521 236 521 252C521 264 515 272 504 275C461 288 423 310 391 341C346 385 317 430 306 477C304 486 299 490 290 490C281 490 275 486 273 477C262 430 234 385 188 341C157 310 119 288 76 275C65 272 59 264 59 252C59 236 67 228 83 228C86 228 88 229 90 230C163 251 221 295 266 360L266 0L313 0L313 360C358 295 417 251 490 230C491 229 494 228 497 228"}],
 "8646":[0.669,-0.065,0.514,{"p":"135 385L514 385L514 432L135 432C207 484 251 554 268 641L268 642L269 644C269 661 261 669 245 669C232 669 224 663 222 650C213 603 194 562 165 526C124 474 79 440 32 425C25 422 21 416 21 408C21 401 25 395 32 392C79 376 124 342 165 291C194 255 213 214 222 167C224 154 232 148 245 148C261 148 269 156 269 173L268 174L268 176C251 263 207 332 135 385M24 65L514 65L514 112L24 112C8 112 0 104 0 89C0 73 8 65 24 65"}],
 "8647":[0.75,0.25,0.507,{"p":"114-12L507-12L507 36L114 36C185 88 230 159 247 250C230 341 185 412 114 464L507 464L507 512L114 512C185 564 230 634 247 722C247 741 239 750 223 750C211 750 204 744 201 731C190 684 171 642 144 607C103 555 59 521 11 505C4 502 0 496 0 488C0 481 4 475 11 471C59 455 103 421 144 370C171 334 190 294 200 250C190 206 171 166 144 130C103 79 59 45 11 28C4 25 0 19 0 12C0 4 4-2 11-5C59-21 103-55 144-107C171-142 190-184 201-231C204-244 211-250 223-250C239-250 247-241 247-222C230-134 185-64 114-12"}],
 "8648":[0.505,0,0.992,{"p":"910 243C926 243 934 251 934 267C934 278 928 286 917 289C874 302 836 324 804 355C758 400 730 445 719 492C717 501 712 505 703 505C694 505 688 501 686 492C675 445 648 399 602 355C571 325 535 304 496 292C457 304 421 325 390 355C344 399 317 445 306 492C304 501 298 505 289 505C280 505 275 501 273 492C262 445 234 400 188 355C156 324 118 302 75 289C64 286 58 278 58 267C58 251 66 243 82 243C85 243 87 243 89 244C162 266 221 310 266 375L266 0L313 0L313 375C358 309 419 265 496 243C573 265 634 309 679 375L679 0L726 0L726 375C771 310 830 266 903 244C905 243 907 243 910 243"}],
 "8651":[0.598,-0.131,0.515,{"p":"24 322L515 322L515 369L113 369C179 414 226 481 253 568C253 569 253 570 254 571L254 574C254 590 246 598 230 598C219 598 211 592 208 581C194 534 169 490 134 450C93 404 54 372 16 354C9 351 6 345 6 338C6 327 12 322 24 322M24 131L515 131L515 178L24 178C8 178 0 170 0 155C0 139 8 131 24 131"}],
 "8652":[0.369,0.098,0.514,{"p":"24 322L514 322L514 369L24 369C8 369 0 361 0 345C0 330 8 322 24 322M113 131L514 131L514 178L24 178C12 178 6 173 6 162C6 155 9 149 16 146C58 126 96 95 132 52C168 9 193-36 208-81C210-92 217-98 230-98C246-98 254-90 254-74C254-47 236-9 201 38C169 81 140 112 113 131"}],
 "8653":[0.52,0.02,0.384,{"p":"260 131L384 131L384 178L209 178C174 207 134 231 89 250C134 269 174 293 209 322L384 322L384 369L260 369C294 405 321 444 341 486C343 488 344 491 344 496C344 512 336 520 320 520C313 520 307 517 302 511C297 505 281 481 253 440C234 411 214 388 194 371C134 318 74 284 13 267C4 264 0 259 0 250C0 241 4 236 13 233C74 216 134 182 194 129C238 90 273 45 300-7C305-16 311-20 320-20C336-20 344-12 344 4C344 9 343 12 341 14C321 56 294 95 260 131"}],
 "8656":[0.52,0.02,0.504,{"p":"261 131L504 131L504 178L210 178C174 207 134 231 90 250C134 269 174 293 210 322L504 322L504 369L261 369C295 405 322 444 343 486C345 488 346 491 346 496C346 512 338 520 322 520C315 520 309 517 305 512C298 503 281 479 254 440C234 411 214 388 195 371C134 318 74 284 13 267C4 264 0 259 0 250C0 241 4 236 13 233C74 216 134 182 195 129C240 90 275 45 302-7C306-16 313-20 322-20C338-20 346-12 346 4C346 9 345 12 343 14C322 56 295 95 261 131"}],
 "8657":[0.504,0,0.652,{"p":"572 158C588 158 596 166 596 182C596 192 592 199 583 203C531 229 486 264 447 309C394 370 359 431 343 493C339 500 333 504 326 504C319 504 313 500 309 493C293 431 258 370 205 309C166 264 121 229 69 203C60 199 56 192 56 182C56 166 64 158 80 158C82 158 85 159 90 161C134 184 173 211 207 243L207 0L254 0L254 294C284 331 308 372 326 415C344 372 368 331 398 294L398 0L445 0L445 243C479 211 518 184 562 161C567 159 570 158 572 158"}],
 "8666":[0.617,0.117,0.506,{"p":"120 226L506 226L506 274L120 274C185 313 237 359 285 418L506 418L506 466L320 466C345 502 365 542 381 585C382 587 382 590 382 593C382 609 374 617 358 617C348 617 341 612 337 602C311 534 273 473 224 419C157 346 87 295 12 266C4 264 0 259 0 250C0 241 4 236 12 234C87 205 157 154 224 81C273 27 311-34 337-102C341-112 348-117 358-117C374-117 382-109 382-93C382-90 382-87 381-85C365-42 345-2 320 34L506 34L506 82L285 82C238 141 185 187 120 226"}],
 "8693":[0.515,0,0.896,{"p":"813 229C829 229 837 237 837 253C837 265 831 273 820 276C777 289 739 311 708 342C662 386 634 431 623 478C621 487 615 491 606 491C597 491 592 487 590 478C579 431 550 386 505 342C473 311 435 289 392 276C381 273 375 265 375 253C375 237 383 229 399 229C402 229 405 230 406 231C479 252 538 296 583 361L583 0L630 0L630 361C675 296 733 252 806 231C808 230 810 229 813 229M266 0L313 0L313 491C313 507 305 515 290 515C274 515 266 507 266 491"}],
 "8730":[0.62,0,1.056,{"ic":0.013,"p":"695 581L695 0L742 0L742 573L1069 573L1069 620L734 620C700 620 695 615 695 581"}],
 "9140":[0.772,-0.504,1.493,{"p":"68 706L1493 706L1493 772L0 772L0 537C0 515 11 504 34 504C57 504 68 515 68 537"}],
 "9141":[-0.074,0.342,1.493,{"p":"0-342L1493-342L1493-276L68-276L68-107C68-85 57-74 34-74C11-74 0-85 0-107"}],
 "9180":[0.796,-0.502,2.016,{"p":"30 502C39 502 46 505 51 511C122 580 357 629 756 660C1004 679 1257 689 1516 689L2016 689L2016 796L1516 796C1281 796 1020 779 733 746C335 699 94 635 9 552C3 547 0 540 0 531C0 516 15 502 30 502"}],
 "9181":[-0.072,0.366,2.016,{"p":"0-101C0-110 3-117 9-122C94-205 335-269 733-316C1020-349 1281-366 1516-366L2016-366L2016-259L1516-259C1257-259 1004-249 756-230C357-199 122-150 51-81C46-75 39-72 30-72C15-72 0-86 0-101"}],
 "9182":[0.724,-0.493,1.002,{"p":"510 618L1002 618L1002 724L510 724C420 724 325 708 226 675C101 634 26 581 1 515C0 514 0 512 0 509C0 498 6 493 17 493C25 493 30 496 33 503C47 542 99 571 188 590C277 609 385 618 510 618"}],
 "9183":[-0.062,0.294,1.002,{"p":"510-294L1002-294L1002-188L510-188C385-188 277-179 188-160C99-141 47-112 32-73C29-66 24-62 17-62C6-62 0-67 0-78C0-81 0-84 1-85C26-151 100-204 225-245C325-278 420-294 510-294"}],
 "9184":[0.873,-0.605,2.041,{"p":"273 766L2041 766L2041 873L269 873L-6 605L107 605"}],
 "9185":[-0.175,0.443,2.041,{"p":"269-443L2041-443L2041-336L273-336L107-175L-6-175"}],
 "10214":[1,0,1.007,{"p":"951 1000L353 1000L353 0L420 0L420 933L650 933L650 0L717 0L717 933L951 933C974 933 985 944 985 966C985 986 971 1000 951 1000"}],
 "10215":[1,0,1.007,{"p":"587 0L654 0L654 1000L56 1000C33 1000 22 989 22 966C22 944 33 933 56 933L290 933L290 0L357 0L357 933L587 933"}],
 "10222":[1.526,0,0.647,{"p":"582 1475C588 1480 591 1487 591 1496C591 1516 581 1526 562 1526C553 1526 546 1523 541 1517C461 1435 397 1274 350 1033C313 842 294 665 294 501L294 0L401 0L401 501C401 672 412 841 435 1009C467 1252 516 1407 582 1475"}],
 "10223":[1.526,0,0.647,{"p":"56 1496C56 1487 59 1480 65 1475C131 1407 180 1252 212 1009C235 841 246 672 246 501L246 0L353 0L353 501C353 665 334 842 297 1033C250 1274 186 1435 106 1517C101 1523 94 1526 85 1526C70 1526 56 1511 56 1496"}],
 "10572":[0.513,0,0.616,{"p":"537 265C552 265 560 273 560 288C560 300 555 308 544 311C496 326 453 351 414 385C369 426 337 465 319 503C316 510 311 513 304 513C293 513 287 507 287 495L287 0L334 0L334 406C379 340 444 293 530 266C531 266 532 266 533 265"}],
 "10573":[0.513,0,0.616,{"p":"282 0L329 0L329 495C329 507 323 513 312 513C305 513 300 510 297 503C280 466 249 426 202 385C164 351 121 326 72 311C61 308 56 300 56 288C56 273 64 265 79 265C106 265 144 283 191 318C234 349 264 379 282 406"}],
 "11057":[0.99,0.49,0.507,{"p":"114-251L507-251L507-203L114-203C185-150 230-80 247 11C230 102 185 174 114 226L507 226L507 274L114 274C185 326 230 398 247 489C230 580 185 650 114 703L507 703L507 751L114 751C185 804 230 874 247 962C247 981 239 990 223 990C211 990 204 984 201 971C190 924 171 882 144 846C103 794 59 760 11 744C4 741 0 735 0 727C0 720 4 714 11 711C59 695 103 661 144 609C171 573 190 533 200 489C190 445 171 405 144 369C103 317 59 283 11 267C4 264 0 258 0 250C0 242 4 236 11 233C59 217 103 183 144 131C171 95 190 55 200 11C190-33 171-73 144-109C103-161 59-195 11-211C4-214 0-220 0-227C0-235 4-241 11-244C59-260 103-294 144-346C171-382 190-424 201-471C204-484 211-490 223-490C239-490 247-481 247-462C230-374 185-304 114-251"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/rt-bt.js
var rtBt;
var init_rt_bt = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/rt-bt.js"() {
    rtBt = JSON.parse(`{
 "8401":[0.711,-0.601,0.208,{"p":"190 601C202 601 208 607 208 619C208 627 204 632 195 635C160 646 135 668 120 701C116 708 110 711 103 711C91 711 85 705 85 693C85 679 98 660 123 636L0 636L0 601"}],
 "8407":[0.711,-0.521,0.205,{"p":"193 599C201 602 205 607 205 616C205 625 201 630 193 633C158 644 132 667 117 700C114 707 108 711 100 711C88 711 82 705 82 693C82 692 83 689 84 685C92 666 104 649 121 634L0 634L0 598L121 598C104 583 92 566 84 547C83 543 82 540 82 539C82 527 88 521 100 521C108 521 114 525 117 532C132 565 158 588 193 599"}],
 "8428":[-0.171,0.281,0.208,{"p":"195-205C204-202 208-197 208-189C208-177 202-171 190-171L0-171L0-206L123-206C98-230 85-249 85-263C85-275 91-281 103-281C110-281 116-278 120-271C135-238 160-216 195-205"}],
 "8431":[-0.091,0.281,0.205,{"p":"193-203C201-200 205-195 205-186C205-177 201-172 193-169C158-158 132-135 117-102C114-95 108-91 100-91C88-91 82-97 82-109C82-110 83-113 84-117C92-136 104-153 121-168L0-168L0-204L121-204C104-219 92-236 84-255C83-259 82-262 82-263C82-275 88-281 100-281C108-281 114-277 117-270C132-237 158-214 193-203"}],
 "8594":[0.51,0.01,0.507,{"p":"496 234C503 237 507 243 507 250C507 257 503 263 496 266C448 282 403 316 362 368C334 403 315 444 306 491C303 504 296 510 283 510C267 510 259 502 259 485L260 483L260 482C277 395 321 326 393 274L0 274L0 226L393 226C321 174 277 105 260 18L260 17L259 15C259-2 267-10 283-10C296-10 303-4 306 9C315 56 334 97 362 132C403 184 448 218 496 234"}],
 "8595":[0.505,0,0.5,{"p":"463 216C474 219 480 227 480 238C480 254 472 262 456 262C453 262 451 262 449 261C377 239 319 195 274 130L274 505L226 505L226 130C181 195 123 239 51 261C49 262 47 262 44 262C28 262 20 254 20 238C20 227 26 219 37 216C80 203 117 181 149 150C194 105 222 60 233 13C235 4 241 0 250 0C259 0 265 4 267 13C278 60 306 105 351 150C383 181 420 203 463 216"}],
 "8603":[0.51,0.01,0.386,{"p":"375 234C382 237 386 243 386 250C386 257 382 263 375 266C328 282 283 316 242 368C214 403 195 444 186 491C183 504 176 510 163 510C147 510 139 502 139 486L139 483L140 481C157 395 201 326 273 274L0 274L0 226L273 226C201 174 157 105 140 19L139 17L139 14C139-2 147-10 163-10C176-10 183-4 186 9C195 56 214 97 242 132C283 184 328 218 375 234"}],
 "8608":[0.51,0.01,0.507,{"p":"496 234C503 237 507 243 507 250C507 257 503 263 496 266C448 282 403 316 362 368C334 403 315 444 306 491C303 504 296 510 283 510C267 510 259 502 259 485L260 483L260 482C277 395 321 326 393 274L338 274C259 308 187 399 168 491C166 504 158 510 145 510C129 510 121 502 121 485L122 483L122 482C139 395 183 326 255 274L0 274L0 226L255 226C183 174 139 105 122 18L122 17L121 15C121-2 129-10 145-10C158-10 166-4 168 9C187 101 259 192 338 226L393 226C321 174 277 105 260 18L260 17L259 15C259-2 267-10 283-10C296-10 303-4 306 9C315 56 334 97 362 132C403 184 448 218 496 234"}],
 "8609":[0.505,0,0.572,{"p":"499 216C510 219 516 227 516 238C516 254 508 262 492 262C489 262 487 262 485 261C413 239 355 195 310 130L310 184C338 264 416 339 499 363C510 366 516 374 516 386C516 402 508 410 492 410C489 410 487 409 485 408C413 387 355 343 310 278L310 505L262 505L262 278C217 343 159 387 87 408C85 409 83 410 80 410C64 410 56 402 56 386C56 374 62 366 73 363C156 339 234 264 262 184L262 130C217 195 159 239 87 261C85 262 83 262 80 262C64 262 56 254 56 238C56 227 62 219 73 216C116 203 153 181 185 150C230 105 258 60 269 13C271 4 277 0 286 0C295 0 301 4 303 13C314 60 342 105 387 150C419 181 456 203 499 216"}],
 "8610":[0.51,0.01,0.58,{"p":"556-10C572-10 580-2 580 14L580 18C558 123 501 201 408 250C501 299 558 377 580 482L580 486C580 502 572 510 556 510C543 510 536 504 534 491C514 390 437 306 346 274L0 274L0 226L346 226C437 194 514 110 534 9C536-4 543-10 556-10"}],
 "8612":[0.51,0.011,0.499,{"p":"475-11C491-11 499-3 499 14L499 486C499 502 491 510 475 510C460 510 452 502 452 486L452 274L0 274L0 226L452 226L452 14C452-3 460-11 475-11"}],
 "8613":[0.498,0,0.632,{"p":"552 0C568 0 576 8 576 24C576 39 568 47 552 47L340 47L340 498L292 498L292 47L80 47C63 47 55 39 55 24C55 8 63 0 80 0"}],
 "8617":[0.546,-0.226,0.507,{"p":"507 386C507 411 505 430 501 441C495 458 481 478 460 499C428 530 390 546 346 546L306 546C291 546 283 538 283 523C283 507 291 499 306 499L346 499C408 499 460 448 460 386C460 324 408 274 346 274L0 274L0 226L346 226C434 226 507 298 507 386"}],
 "8619":[0.55,0.05,0.507,{"p":"507 388C507 414 505 433 501 444C495 461 481 481 460 502C428 534 390 550 346 550C256 550 184 478 184 388L184 274L0 274L0 226L184 226L184-26C184-42 192-50 208-50C223-50 231-42 231-26L231 226L346 226C435 226 507 299 507 388M460 388C460 343 451 332 426 307C403 285 377 274 346 274L231 274L231 388C231 452 282 503 346 503C409 503 460 451 460 388"}],
 "8640":[0.499,-0.226,0.513,{"p":"495 226C507 226 513 232 513 243C513 250 510 255 503 258C465 276 426 308 385 353C351 392 326 435 311 483C308 494 300 499 288 499C273 499 265 491 265 476C265 449 283 411 318 364C350 321 379 291 406 273L0 273L0 226"}],
 "8641":[0.273,0,0.513,{"p":"503 241C510 244 513 249 513 256C513 267 507 273 495 273L0 273L0 226L406 226C340 181 293 116 266 30C266 29 266 28 265 27L265 23C265 8 273 0 288 0C300 0 308 5 311 16C326 64 351 107 385 146C426 191 465 223 503 241"}],
 "8642":[0.513,0,0.441,{"p":"369 201C380 204 385 212 385 224C385 239 377 247 362 247C359 247 356 247 354 246C269 219 204 173 159 107L159 513L112 513L112 18C112 6 118 0 129 0C136 0 141 3 144 10C163 52 194 90 237 126C280 162 324 187 369 201"}],
 "8643":[0.513,0,0.441,{"p":"312 0C323 0 329 6 329 17L329 513L282 513L282 107C237 174 172 220 87 246C85 247 82 247 79 247C64 247 56 239 56 224C56 212 61 204 72 201C121 186 165 161 202 128C250 85 282 45 297 10C300 3 305 0 312 0"}],
 "8644":[0.669,-0.065,0.514,{"p":"482 392C489 395 493 401 493 408C493 416 489 422 482 425C435 440 390 474 349 526C320 562 301 603 292 650C290 663 282 669 269 669C253 669 245 661 245 644L246 642L246 641C263 554 307 484 379 432L0 432L0 385L379 385C307 332 263 263 246 176L246 174L245 173C245 156 253 148 269 148C282 148 290 154 292 167C301 214 320 255 349 291C390 342 435 376 482 392M490 112L0 112L0 65L490 65C506 65 514 73 514 89C514 101 503 112 490 112"}],
 "8645":[0.515,0,0.896,{"p":"820 239C831 242 837 250 837 262C837 278 829 286 813 286C810 286 808 285 806 284C733 263 675 219 630 154L630 515L583 515L583 154C538 219 479 263 406 284C405 285 402 286 399 286C383 286 375 278 375 262C375 250 381 242 392 239C435 226 473 204 505 173C550 129 579 84 590 37C592 28 597 24 606 24C615 24 621 28 623 37C634 84 662 129 708 173C739 204 777 226 820 239M290 0C305 0 313 8 313 24L313 515L266 515L266 24C266 8 274 0 290 0"}],
 "8646":[0.432,0.172,0.515,{"p":"491 432L0 432L0 385L491 385C507 385 515 393 515 408C515 421 504 432 491 432M483 72C490 75 494 81 494 89C494 96 490 102 483 105C436 121 391 155 350 206C321 242 302 283 293 330C291 343 283 349 270 349C254 349 246 341 246 325L246 323L247 320C264 233 308 164 380 112L0 112L0 65L380 65C308 13 264-56 247-143L246-145L246-148C246-164 254-172 270-172C283-172 291-166 293-153C302-106 321-65 350-29C391 23 436 57 483 72"}],
 "8649":[0.75,0.25,0.507,{"p":"496-5C503-2 507 4 507 12C507 19 503 25 496 28C449 44 404 78 362 130C335 164 317 204 307 250C317 296 335 336 362 370C404 422 449 456 496 471C503 475 507 481 507 488C507 496 503 502 496 505C448 520 403 554 362 607C334 642 315 684 306 731C303 744 296 750 283 750C266 750 258 741 260 722C277 635 321 565 393 512L0 512L0 464L393 464C320 411 275 339 260 250C275 161 320 89 393 36L0 36L0-12L393-12C321-65 277-135 260-222C258-241 266-250 283-250C296-250 303-244 306-231C315-184 334-142 362-107C403-54 448-20 496-5"}],
 "8650":[0.505,0,0.992,{"p":"917 216C928 219 934 227 934 238C934 254 926 262 910 262C907 262 905 262 903 261C830 239 771 195 726 130L726 505L679 505L679 130C634 196 573 240 496 262C419 240 358 196 313 130L313 505L266 505L266 130C221 195 162 239 89 261C87 262 85 262 82 262C66 262 58 254 58 238C58 227 64 219 75 216C118 203 156 181 188 150C234 105 262 60 273 13C275 4 280 0 289 0C298 0 304 4 306 13C317 60 344 106 390 150C421 180 457 201 496 213C535 201 571 180 602 150C648 106 675 60 686 13C688 4 694 0 703 0C712 0 717 4 719 13C730 60 758 105 804 150C836 181 874 203 917 216"}],
 "8651":[0.369,0.098,0.514,{"p":"490 369L0 369L0 322L490 322C506 322 514 330 514 345C514 358 503 369 490 369M498 146C505 149 508 155 508 162C508 173 502 178 490 178L0 178L0 131L401 131C335 86 288 19 261-68C261-69 261-70 260-71L260-74C260-90 268-98 284-98C296-98 303-92 306-81C321-36 346 9 382 52C418 95 456 126 498 146"}],
 "8652":[0.598,-0.131,0.515,{"p":"491 322C503 322 509 327 509 338C509 345 506 351 499 354C461 372 422 404 381 450C347 489 322 533 307 581C304 592 296 598 285 598C269 598 261 590 261 574C261 547 279 509 314 462C346 419 375 388 402 369L0 369L0 322M491 178L0 178L0 131L491 131C507 131 515 139 515 155C515 167 504 178 491 178"}],
 "8654":[0.52,0.02,0.406,{"p":"393 233C402 236 406 241 406 250C406 259 402 264 393 267C332 284 272 318 211 371C168 410 133 455 106 507C102 516 95 520 85 520C70 520 62 512 62 496C62 494 63 491 64 486C87 442 114 403 146 369L0 369L0 322L197 322C234 292 274 268 316 250C274 232 234 208 197 178L0 178L0 131L146 131C114 97 87 58 64 14C63 9 62 6 62 4C62-12 70-20 85-20C95-20 102-16 106-7C133 45 168 90 211 129C272 182 332 216 393 233"}],
 "8658":[0.52,0.02,0.504,{"p":"493 233C500 237 504 243 504 250C504 257 500 263 493 267C431 283 370 318 309 371C264 410 229 455 203 507C199 516 192 520 182 520C166 520 158 512 158 496C158 494 159 491 161 486C184 442 211 403 243 369L0 369L0 322L294 322C331 292 372 268 415 250C372 232 331 208 294 178L0 178L0 131L243 131C211 97 184 58 161 14C159 9 158 6 158 4C158-12 166-20 182-20C192-20 199-16 203-7C229 45 264 90 309 129C370 182 431 217 493 233"}],
 "8659":[0.504,0,0.652,{"p":"583 301C592 305 596 312 596 322C596 338 588 346 572 346C570 346 567 345 562 343C518 320 479 293 445 261L445 504L398 504L398 210C368 173 344 132 326 89C308 132 284 173 254 210L254 504L207 504L207 261C173 293 134 320 90 343C85 345 82 346 80 346C64 346 56 338 56 322C56 312 60 305 69 301C121 275 166 240 205 195C258 134 293 73 309 11C313 4 319 0 326 0C333 0 339 4 343 11C359 73 394 134 447 195C486 240 531 275 583 301"}],
 "8667":[0.617,0.117,0.506,{"p":"386 274L0 274L0 226L386 226C321 187 269 141 221 82L0 82L0 34L186 34C161-2 141-42 125-85C124-87 124-90 124-93C124-109 132-117 148-117C159-117 166-112 169-101C196-34 233 27 282 81C349 154 419 205 494 234C502 236 506 241 506 250C506 259 502 264 494 266C419 295 349 346 282 419C233 473 196 534 169 601C166 612 159 617 148 617C132 617 124 609 124 593C124 590 124 587 125 585C141 542 161 502 186 466L0 466L0 418L221 418C268 359 321 313 386 274"}],
 "8693":[0.514,0,0.896,{"p":"606 0C622 0 630 8 630 24L630 514L583 514L583 24C583 8 591 0 606 0M504 239C515 242 521 250 521 262C521 278 513 286 497 286C494 286 491 285 490 284C417 263 358 219 313 154L313 514L266 514L266 154C221 219 163 263 90 284C88 285 86 286 83 286C67 286 59 278 59 262C59 250 65 242 76 239C119 226 157 204 188 173C234 129 262 84 273 37C275 28 281 24 290 24C299 24 304 28 306 37C317 84 346 129 391 173C423 204 461 226 504 239"}],
 "8694":[0.99,0.49,0.507,{"p":"496-244C503-241 507-235 507-227C507-220 503-214 496-211C449-195 404-161 362-109C334-73 316-33 307 11C316 56 334 96 362 131C404 184 449 218 496 233C503 236 507 242 507 250C507 258 503 264 496 267C449 282 404 316 362 369C334 404 316 444 307 489C316 533 334 573 362 609C404 661 449 695 496 711C503 714 507 720 507 727C507 735 503 741 496 744C448 760 403 794 362 846C334 882 315 924 306 971C303 984 296 990 283 990C266 990 258 981 260 962C277 874 321 804 393 751L0 751L0 703L393 703C320 649 275 578 260 489C275 399 320 327 393 274L0 274L0 226L393 226C320 173 275 101 260 11C275-78 320-149 393-203L0-203L0-251L393-251C321-304 277-374 260-462C258-481 266-490 283-490C296-490 303-484 306-471C315-424 334-382 362-346C403-294 448-260 496-244"}],
 "9140":[0.772,-0.504,1.492,{"p":"1458 504C1481 504 1492 515 1492 537L1492 772L0 772L0 706L1424 706L1424 537C1424 515 1435 504 1458 504"}],
 "9141":[-0.074,0.342,1.492,{"p":"0-342L1492-342L1492-107C1492-85 1481-74 1458-74C1435-74 1424-85 1424-107L1424-276L0-276"}],
 "9180":[0.796,-0.502,2.016,{"p":"2016 531C2016 540 2013 547 2007 552C1922 635 1681 699 1283 746C996 779 735 796 500 796L0 796L0 689L500 689C759 689 1012 679 1260 660C1659 629 1894 580 1965 511C1970 505 1977 502 1986 502C2001 502 2016 516 2016 531"}],
 "9181":[-0.072,0.366,2.016,{"p":"1986-72C1977-72 1970-75 1965-81C1894-150 1659-199 1260-230C1012-249 759-259 500-259L0-259L0-366L500-366C735-366 996-349 1283-316C1681-269 1922-205 2007-122C2013-117 2016-110 2016-101C2016-86 2001-72 1986-72"}],
 "9182":[0.724,-0.493,1.001,{"p":"984 493C995 493 1001 498 1001 509C1001 512 1001 514 1000 515C975 581 900 634 775 675C676 708 581 724 491 724L0 724L0 618L491 618C616 618 724 609 813 590C902 571 954 542 968 503C971 496 976 493 984 493"}],
 "9183":[-0.062,0.294,1.001,{"p":"1000-85C1001-84 1001-81 1001-78C1001-67 995-62 984-62C977-62 971-66 968-73C954-112 902-141 813-160C724-179 616-188 491-188L0-188L0-294L491-294C581-294 676-278 776-245C901-204 975-151 1000-85"}],
 "9184":[0.873,-0.605,2.041,{"ic":0.006,"p":"1934 605L2047 605L1772 873L0 873L0 766L1768 766"}],
 "9185":[-0.175,0.443,2.041,{"ic":0.006,"p":"1772-443L2047-175L1934-175L1768-336L0-336L0-443"}],
 "10214":[1,0,1.007,{"p":"951 67L717 67L717 1000L650 1000L650 67L420 67L420 1000L353 1000L353 0L951 0C974 0 985 11 985 34C985 53 970 67 951 67"}],
 "10215":[1,0,1.007,{"p":"56 0L654 0L654 1000L587 1000L587 67L357 67L357 1000L290 1000L290 67L56 67C33 67 22 56 22 34C22 11 33 0 56 0"}],
 "10222":[1.526,0,0.647,{"p":"562 0C581 0 591 10 591 30C591 39 588 46 582 51C516 119 467 274 435 517C412 685 401 854 401 1025L401 1526L294 1526L294 1025C294 861 313 684 350 493C397 252 461 91 541 9C546 3 553 0 562 0"}],
 "10223":[1.526,0,0.647,{"p":"85 0C94 0 101 3 106 9C186 91 250 252 297 493C334 684 353 861 353 1025L353 1526L246 1526L246 1025C246 854 235 685 212 517C180 274 131 119 65 51C59 46 56 39 56 30C56 15 70 0 85 0"}],
 "10572":[0.513,0,0.616,{"p":"312 0C323 0 329 6 329 17L329 513L282 513L282 107C237 174 172 220 87 246C85 247 82 247 79 247C64 247 56 239 56 224C56 212 61 204 72 201C121 186 165 161 202 128C250 85 282 45 297 10C300 3 305 0 312 0"}],
 "10573":[0.513,0,0.616,{"p":"544 201C555 204 560 212 560 224C560 239 552 247 537 247C534 247 531 247 529 246C444 219 379 173 334 107L334 513L287 513L287 18C287 6 293 0 304 0C311 0 316 3 319 10C338 52 369 90 412 126C455 162 499 187 544 201"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/ex-md.js
var exMd;
var init_ex_md = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/ex-md.js"() {
    exMd = JSON.parse(`{
 "95":[-0.188,0.294,0.994,{"p":"0-294L994-294L994-188L0-188"}],
 "123":[0.748,0,0.902,{"p":"397 0L505 0L505 748L397 748"}],
 "175":[0.724,-0.618,0.994,{"p":"0 618L994 618L994 724L0 724"}],
 "773":[0.67,-0.63,0.19,{"p":"0 630L190 630L190 670L0 670"}],
 "8400":[0.631,-0.601,0.139,{"p":"0 601L139 601L139 631L0 631"}],
 "8592":[0.274,-0.226,0.337,{"p":"0 226L337 226L337 274L0 274"}],
 "8593":[0.337,0,0.5,{"p":"226 0L274 0L274 337L226 337"}],
 "8602":[0.51,0.01,0.386,{"p":"209 226L386 226L386 274L226 274L301 478C302 480 302 483 302 486C302 502 294 510 278 510C267 510 259 505 256 495L177 274L0 274L0 226L159 226L84 21L84 17C83 16 83 15 83 14C83-2 91-10 107-10C118-10 125-5 129 5"}],
 "8617":[0.274,-0.226,0.337,{"p":"0 226L337 226L337 274L0 274"}],
 "8636":[0.273,-0.226,0.341,{"p":"0 226L341 226L341 273L0 273"}],
 "8638":[0.341,0,0.441,{"p":"112 0L159 0L159 341L112 341"}],
 "8639":[0.341,0,0.441,{"p":"282 0L329 0L329 341L282 341"}],
 "8644":[0.432,-0.065,0.343,{"p":"0 385L343 385L343 432L0 432M0 65L343 65L343 112L0 112"}],
 "8645":[0.343,0,0.896,{"p":"583 0L630 0L630 343L583 343M266 0L313 0L313 343L266 343"}],
 "8647":[0.512,0.012,0.337,{"p":"0 464L337 464L337 512L0 512M0-12L337-12L337 36L0 36"}],
 "8648":[0.337,0,0.992,{"p":"679 0L726 0L726 337L679 337M266 0L313 0L313 337L266 337"}],
 "8651":[0.369,-0.131,0.343,{"p":"0 322L343 322L343 369L0 369M0 131L343 131L343 178L0 178"}],
 "8653":[0.52,0.02,0.384,{"p":"173 131L384 131L384 178L191 178L243 322L384 322L384 369L260 369L304 489L304 493C305 494 305 495 305 496C305 512 297 520 281 520C270 520 262 515 259 505L210 369L0 369L0 322L192 322L140 178L0 178L0 131L124 131L81 12C80 10 79 7 79 4C79-12 87-20 103-20C114-20 122-15 125-5"}],
 "8654":[0.369,-0.131,0.102,{"p":"0 322L102 322L102 369L0 369M0 131L102 131L102 178L0 178"}],
 "8656":[0.369,-0.131,0.336,{"p":"0 322L336 322L336 369L0 369M0 131L336 131L336 178L0 178"}],
 "8657":[0.336,0,0.652,{"p":"398 0L445 0L445 336L398 336M207 0L254 0L254 336L207 336"}],
 "8666":[0.466,-0.034,0.337,{"p":"0 418L337 418L337 466L0 466M0 226L337 226L337 274L0 274M0 34L337 34L337 82L0 82"}],
 "8694":[0.751,0.251,0.337,{"p":"0 703L337 703L337 751L0 751M0 226L337 226L337 274L0 274M0-251L337-251L337-203L0-203"}],
 "8730":[0.64,0,1.056,{"p":"695 0L742 0L742 640L695 640"}],
 "9140":[0.772,-0.706,0.995,{"p":"0 706L995 706L995 772L0 772"}],
 "9141":[-0.276,0.342,0.995,{"p":"0-342L995-342L995-276L0-276"}],
 "9180":[0.796,-0.689,0.994,{"p":"0 689L994 689L994 796L0 796"}],
 "9181":[-0.259,0.366,0.994,{"p":"0-366L994-366L994-259L0-259"}],
 "9182":[0.85,-0.618,2.003,{"p":"1496 618L2003 618L2003 724L1496 724C1353 724 1238 732 1150 750C1062 768 1018 796 1018 834C1018 845 1012 850 1001 850C990 850 984 845 984 834C984 796 941 768 854 751C765 733 649 724 506 724L0 724L0 618L506 618C595 618 685 630 774 654C887 685 963 728 1001 785C1039 728 1115 685 1228 654C1317 630 1407 618 1496 618"}],
 "9183":[-0.188,0.419,2.003,{"p":"1496-294L2003-294L2003-188L1496-188C1407-188 1317-200 1228-224C1115-255 1039-298 1001-355C963-298 887-255 774-224C685-200 595-188 506-188L0-188L0-294L506-294C649-294 765-303 854-321C941-338 984-366 984-403C984-414 990-419 1001-419C1012-419 1018-414 1018-403C1018-366 1062-338 1150-320C1238-302 1353-294 1496-294"}],
 "9184":[0.873,-0.766,1.36,{"p":"0 766L1360 766L1360 873L0 873"}],
 "9185":[-0.336,0.443,1.36,{"p":"0-443L1360-443L1360-336L0-336"}],
 "10214":[1,0,1.007,{"p":"650 0L717 0L717 1000L650 1000M353 0L420 0L420 1000L353 1000"}],
 "10215":[1,0,1.007,{"p":"587 0L654 0L654 1000L587 1000M290 0L357 0L357 1000L290 1000"}],
 "10222":[0.998,0,0.647,{"p":"294 0L401 0L401 998L294 998"}],
 "10223":[0.998,0,0.647,{"p":"246 0L353 0L353 998L246 998"}],
 "10572":[0.337,0,0.616,{"p":"284 0L332 0L332 337L284 337"}]
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/bbold.js
var bbold;
var init_bbold = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/bbold.js"() {
    bbold = JSON.parse(__kittexJson15);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/upsmall.js
var upsmall;
var init_upsmall = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/upsmall.js"() {
    upsmall = JSON.parse(__kittexJson16);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/uplarge.js
var uplarge;
var init_uplarge = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/uplarge.js"() {
    uplarge = JSON.parse(__kittexJson17);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/script.js
var script;
var init_script = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/script.js"() {
    script = {};
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/script-bold.js
var scriptBold;
var init_script_bold = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/script-bold.js"() {
    scriptBold = {};
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/delimiters.js
var delimiters;
var init_delimiters = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/delimiters.js"() {
    init_Direction();
    delimiters = {
      40: {
        dir: V,
        sizes: [0.997, 1.095, 1.195, 1.445, 1.793, 2.093, 2.393, 2.991],
        stretch: [9115, 9116, 9117],
        HDW: [0.748, 0.248, 0.875]
      },
      41: {
        dir: V,
        sizes: [0.997, 1.095, 1.195, 1.445, 1.793, 2.093, 2.393, 2.991],
        stretch: [9118, 9119, 9120],
        HDW: [0.748, 0.248, 0.875]
      },
      45: {
        c: 8722,
        dir: H,
        stretch: [0, 8722],
        HDW: [0.583, 0.083, 0.778],
        hd: [0.583, 0.083]
      },
      47: {
        dir: V,
        sizes: [1.001, 1.311, 1.717, 2.249, 2.945, 3.859, 5.055, 6.621]
      },
      61: {
        dir: H,
        stretch: [0, 61],
        HDW: [0.367, -0.133, 0.778],
        hd: [0.367, -0.133]
      },
      91: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001],
        stretch: [9121, 9122, 9123],
        HDW: [0.75, 0.25, 0.667]
      },
      92: {
        dir: V,
        sizes: [1.001, 1.311, 1.717, 2.249, 2.945, 3.859, 5.055, 6.621]
      },
      93: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001],
        stretch: [9124, 9125, 9126],
        HDW: [0.75, 0.25, 0.667]
      },
      94: {
        c: 770,
        dir: H,
        sizes: [0.5, 0.644, 0.768, 0.919, 1.1, 1.32, 1.581, 1.896]
      },
      95: {
        c: 8211,
        dir: H,
        stretch: [0, 8211],
        HDW: [0.277, -0.255, 0.5],
        hd: [0.277, -0.255]
      },
      123: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001],
        stretch: [9127, 123, 9129, 9128],
        stretchv: [0, 1, 0, 0],
        HDW: [0.75, 0.25, 0.902]
      },
      124: {
        dir: V,
        sizes: [1.001, 1.203, 1.443, 1.735, 2.085, 2.505, 3.005, 3.605],
        schar: [124, 8739],
        stretch: [0, 8739],
        stretchv: [0, 2],
        HDW: [0.75, 0.25, 0.333]
      },
      125: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001],
        stretch: [9131, 123, 9133, 9132],
        stretchv: [0, 1, 0, 0],
        HDW: [0.75, 0.25, 0.902]
      },
      126: {
        c: 771,
        dir: H,
        sizes: [0.5, 0.652, 0.778, 0.931, 1.115, 1.335, 1.599, 1.915]
      },
      175: {
        c: 773,
        dir: H,
        sizes: [0.392, 0.568],
        stretch: [0, 773],
        stretchv: [0, 1],
        HDW: [0.67, -0.63, 0],
        hd: [0.67, -0.63]
      },
      710: {
        c: 770,
        dir: H,
        sizes: [0.5, 0.644, 0.768, 0.919, 1.1, 1.32, 1.581, 1.896]
      },
      711: {
        c: 780,
        dir: H,
        sizes: [0.366, 0.644, 0.768, 0.919, 1.1, 1.32, 1.581, 1.896]
      },
      713: {
        c: 773,
        dir: H,
        sizes: [0.392, 0.568],
        stretch: [0, 773],
        stretchv: [0, 1],
        HDW: [0.67, -0.63, 0],
        hd: [0.67, -0.63]
      },
      728: {
        c: 774,
        dir: H,
        sizes: [0.376, 0.658, 0.784, 0.937, 1.12, 1.341, 1.604, 1.92]
      },
      732: {
        c: 771,
        dir: H,
        sizes: [0.5, 0.652, 0.778, 0.931, 1.115, 1.335, 1.599, 1.915]
      },
      770: {
        dir: H,
        sizes: [0.5, 0.644, 0.768, 0.919, 1.1, 1.32, 1.581, 1.896]
      },
      771: {
        dir: H,
        sizes: [0.5, 0.652, 0.778, 0.931, 1.115, 1.335, 1.599, 1.915]
      },
      773: {
        dir: H,
        sizes: [0.392, 0.568],
        stretch: [0, 773],
        stretchv: [0, 1],
        HDW: [0.67, -0.63, 0],
        hd: [0.67, -0.63]
      },
      774: {
        dir: H,
        sizes: [0.376, 0.658, 0.784, 0.937, 1.12, 1.341, 1.604, 1.92]
      },
      780: {
        dir: H,
        sizes: [0.366, 0.644, 0.768, 0.919, 1.1, 1.32, 1.581, 1.896]
      },
      8211: {
        dir: H,
        stretch: [0, 8211],
        HDW: [0.277, -0.255, 0.5],
        hd: [0.277, -0.255]
      },
      8212: {
        dir: H,
        stretch: [0, 8212],
        HDW: [0.277, -0.255, 1],
        hd: [0.277, -0.255]
      },
      8213: {
        dir: H,
        stretch: [0, 8213],
        HDW: [0.27, -0.23, 1.152],
        hd: [0.27, -0.23]
      },
      8214: {
        dir: V,
        sizes: [1.001, 1.203, 1.443, 1.735, 2.085, 2.503, 3.004, 3.607],
        schar: [8214, 8741],
        stretch: [0, 8741],
        stretchv: [0, 2],
        HDW: [0.75, 0.25, 0.555]
      },
      8254: {
        c: 175,
        dir: H,
        sizes: [0.392, 0.568],
        stretch: [0, 773],
        stretchv: [0, 1],
        HDW: [0.67, -0.63, 0],
        hd: [0.67, -0.63]
      },
      8260: {
        dir: V,
        sizes: [1.001, 1.311, 1.717, 2.249, 2.945, 3.859, 5.055, 6.621]
      },
      8400: {
        dir: H,
        sizes: [0.422, 0.667],
        stretch: [8400, 8400],
        stretchv: [3, 1],
        HDW: [0.711, -0.601, 0],
        hd: [0.631, -0.601]
      },
      8401: {
        dir: H,
        sizes: [0.422, 0.667],
        stretch: [0, 8400, 8401],
        stretchv: [0, 1, 4],
        HDW: [0.711, -0.601, 0],
        hd: [0.631, -0.601]
      },
      8406: {
        dir: H,
        sizes: [0.416, 0.659],
        stretch: [8406, 8400],
        stretchv: [3, 1],
        HDW: [0.711, -0.521, 0],
        hd: [0.631, -0.601]
      },
      8407: {
        dir: H,
        sizes: [0.416, 0.659],
        stretch: [0, 8400, 8407],
        stretchv: [0, 1, 4],
        HDW: [0.711, -0.521, 0],
        hd: [0.631, -0.601]
      },
      8417: {
        dir: H,
        sizes: [0.47, 0.715],
        stretch: [8406, 8400, 8407],
        stretchv: [3, 1, 4],
        HDW: [0.711, -0.521, 0],
        hd: [0.631, -0.601]
      },
      8428: {
        dir: H,
        sizes: [0.422, 0.667],
        stretch: [0, 845, 8428],
        stretchv: [0, 1, 4],
        HDW: [-0.171, 0.281, 0],
        hd: [-0.171, 0.201]
      },
      8429: {
        dir: H,
        sizes: [0.422, 0.667],
        stretch: [8429, 845],
        stretchv: [3, 1],
        HDW: [-0.171, 0.281, 0],
        hd: [-0.171, 0.201]
      },
      8430: {
        dir: H,
        sizes: [0.416, 0.659],
        stretch: [8430, 845],
        stretchv: [3, 1],
        HDW: [-0.091, 0.281, 0],
        hd: [-0.171, 0.201]
      },
      8431: {
        dir: H,
        sizes: [0.416, 0.659],
        stretch: [0, 845, 8431],
        stretchv: [0, 1, 4],
        HDW: [-0.091, 0.281, 0],
        hd: [-0.171, 0.201]
      },
      8512: {
        dir: V,
        sizes: [0.684, 1.401],
        variants: [0, 2]
      },
      8592: {
        dir: H,
        sizes: [1, 1.463],
        variants: [0, 0],
        schar: [8592, 10229],
        stretch: [8592, 8592],
        stretchv: [3, 1],
        HDW: [0.51, 0.01, 1],
        hd: [0.274, -0.226]
      },
      8593: {
        dir: V,
        sizes: [0.883, 1.349],
        variants: [0, 2],
        stretch: [8593, 8593],
        stretchv: [3, 1],
        HDW: [0.679, 0.203, 0.5]
      },
      8594: {
        dir: H,
        sizes: [1, 1.463],
        variants: [0, 0],
        schar: [8594, 10230],
        stretch: [0, 8592, 8594],
        stretchv: [0, 1, 4],
        HDW: [0.51, 0.01, 1],
        hd: [0.274, -0.226]
      },
      8595: {
        dir: V,
        sizes: [0.883, 1.349],
        variants: [0, 2],
        stretch: [0, 8593, 8595],
        stretchv: [0, 1, 4],
        HDW: [0.703, 0.179, 0.5]
      },
      8596: {
        dir: H,
        sizes: [1, 1.442],
        variants: [0, 0],
        schar: [8596, 10231],
        stretch: [8592, 8592, 8594],
        stretchv: [3, 1, 4],
        HDW: [0.51, 0.01, 1],
        hd: [0.274, -0.226]
      },
      8597: {
        dir: V,
        sizes: [1.015, 1.015],
        variants: [0, 2],
        stretch: [8593, 8593, 8595],
        stretchv: [3, 1, 4],
        HDW: [0.757, 0.257, 0.5]
      },
      8598: {
        dir: V,
        sizes: [0.918, 1.384],
        variants: [0, 2]
      },
      8599: {
        dir: V,
        sizes: [0.918, 1.384],
        variants: [0, 2]
      },
      8600: {
        dir: V,
        sizes: [0.918, 1.384],
        variants: [0, 2]
      },
      8601: {
        dir: V,
        sizes: [0.918, 1.384],
        variants: [0, 2]
      },
      8602: {
        dir: H,
        sizes: [0.997, 1.463],
        variants: [0, 2],
        stretch: [8602, 8592, 0, 8602],
        stretchv: [3, 1, 0, 1],
        HDW: [0.51, 0.01, 0.997],
        hd: [0.274, -0.226]
      },
      8603: {
        dir: H,
        sizes: [0.997, 1.463],
        variants: [0, 2],
        stretch: [0, 8592, 8603, 8602],
        stretchv: [0, 1, 4, 1],
        HDW: [0.51, 0.01, 0.997],
        hd: [0.274, -0.226]
      },
      8606: {
        dir: H,
        sizes: [1.017, 1.463],
        variants: [0, 2],
        stretch: [8606, 8592],
        stretchv: [3, 1],
        HDW: [0.51, 0.01, 1.017],
        hd: [0.274, -0.226]
      },
      8608: {
        dir: H,
        sizes: [1.017, 1.463],
        variants: [0, 2],
        stretch: [0, 8592, 8608],
        stretchv: [0, 1, 4],
        HDW: [0.51, 0.01, 1.017],
        hd: [0.274, -0.226]
      },
      8610: {
        dir: H,
        sizes: [1.192, 1.658],
        variants: [0, 2],
        stretch: [8592, 8592, 8610],
        stretchv: [3, 1, 4],
        HDW: [0.51, 0.01, 1.192],
        hd: [0.274, -0.226]
      },
      8611: {
        dir: H,
        sizes: [1.192, 1.658],
        variants: [0, 2],
        stretch: [8611, 8592, 8594],
        stretchv: [3, 1, 4],
        HDW: [0.51, 0.01, 1.192],
        hd: [0.274, -0.226]
      },
      8612: {
        dir: H,
        sizes: [0.977, 1.443],
        variants: [0, 0],
        schar: [8612, 10235],
        stretch: [8592, 8592, 8612],
        stretchv: [3, 1, 4],
        HDW: [0.51, 0.011, 0.977],
        hd: [0.274, -0.226]
      },
      8614: {
        dir: H,
        sizes: [0.977, 1.443],
        variants: [0, 0],
        schar: [8614, 10236],
        stretch: [8614, 8592, 8594],
        stretchv: [3, 1, 4],
        HDW: [0.51, 0.011, 0.977],
        hd: [0.274, -0.226]
      },
      8617: {
        dir: H,
        sizes: [0.997, 1.463],
        variants: [0, 2],
        stretch: [8592, 8617, 8617],
        stretchv: [3, 1, 4],
        HDW: [0.546, 0.01, 0.997],
        hd: [0.274, -0.226]
      },
      8618: {
        dir: H,
        sizes: [0.997, 1.463],
        variants: [0, 2],
        stretch: [8618, 8617, 8594],
        stretchv: [3, 1, 4],
        HDW: [0.546, 0.01, 0.997],
        hd: [0.274, -0.226]
      },
      8619: {
        dir: H,
        sizes: [0.997, 1.463],
        variants: [0, 2],
        stretch: [8592, 8617, 8619],
        stretchv: [3, 1, 4],
        HDW: [0.55, 0.05, 0.997],
        hd: [0.274, -0.226]
      },
      8620: {
        dir: H,
        sizes: [0.997, 1.463],
        variants: [0, 2],
        stretch: [8620, 8617, 8594],
        stretchv: [3, 1, 4],
        HDW: [0.55, 0.05, 0.997],
        hd: [0.274, -0.226]
      },
      8630: {
        dir: H,
        sizes: [0.98, 1.33],
        variants: [0, 2]
      },
      8631: {
        dir: H,
        sizes: [0.98, 1.33],
        variants: [0, 2]
      },
      8636: {
        dir: H,
        sizes: [1, 1.478],
        variants: [0, 2],
        stretch: [8636, 8636],
        stretchv: [3, 1],
        HDW: [0.499, -0.226, 1],
        hd: [0.273, -0.226]
      },
      8637: {
        dir: H,
        sizes: [1.012, 1.478],
        variants: [0, 2],
        stretch: [8637, 8636],
        stretchv: [3, 1],
        HDW: [0.273, 0, 1.012],
        hd: [0.273, -0.226]
      },
      8638: {
        dir: V,
        sizes: [0.901, 1.367],
        variants: [0, 2],
        stretch: [8638, 8638],
        stretchv: [3, 1],
        HDW: [0.697, 0.203, 0.441]
      },
      8639: {
        dir: V,
        sizes: [0.901, 1.367],
        variants: [0, 2],
        stretch: [8639, 8639],
        stretchv: [3, 1],
        HDW: [0.697, 0.203, 0.441]
      },
      8640: {
        dir: H,
        sizes: [1, 1.478],
        variants: [0, 2],
        stretch: [0, 8636, 8640],
        stretchv: [0, 1, 4],
        HDW: [0.499, -0.226, 1],
        hd: [0.273, -0.226]
      },
      8641: {
        dir: H,
        sizes: [1.012, 1.478],
        variants: [0, 2],
        stretch: [0, 8636, 8641],
        stretchv: [0, 1, 4],
        HDW: [0.273, 0, 1.012],
        hd: [0.273, -0.226]
      },
      8642: {
        dir: V,
        sizes: [0.901, 1.367],
        variants: [0, 2],
        stretch: [0, 8638, 8642],
        stretchv: [0, 1, 4],
        HDW: [0.703, 0.197, 0.441]
      },
      8643: {
        dir: V,
        sizes: [0.901, 1.367],
        variants: [0, 2],
        stretch: [0, 8639, 8643],
        stretchv: [0, 1, 4],
        HDW: [0.703, 0.197, 0.441]
      },
      8644: {
        dir: H,
        sizes: [1.018, 1.484],
        variants: [0, 2],
        stretch: [8644, 8644, 8644],
        stretchv: [3, 1, 4],
        HDW: [0.669, 0.172, 1.018],
        hd: [0.432, -0.065]
      },
      8645: {
        dir: V,
        sizes: [0.907, 1.373],
        variants: [0, 2],
        stretch: [8645, 8645, 8645],
        stretchv: [3, 1, 4],
        HDW: [0.703, 0.203, 0.896]
      },
      8646: {
        dir: H,
        sizes: [1.018, 1.484],
        variants: [0, 2],
        stretch: [8646, 8644, 8646],
        stretchv: [3, 1, 4],
        HDW: [0.669, 0.172, 1.018],
        hd: [0.432, -0.065]
      },
      8647: {
        dir: H,
        sizes: [0.997, 1.463],
        variants: [0, 2],
        stretch: [8647, 8647],
        stretchv: [3, 1],
        HDW: [0.75, 0.25, 0.997],
        hd: [0.512, 0.012]
      },
      8648: {
        dir: V,
        sizes: [0.883, 1.349],
        variants: [0, 2],
        stretch: [8648, 8648],
        stretchv: [3, 1],
        HDW: [0.679, 0.203, 0.992]
      },
      8649: {
        dir: H,
        sizes: [0.997, 1.463],
        variants: [0, 2],
        stretch: [0, 8647, 8649],
        stretchv: [0, 1, 4],
        HDW: [0.75, 0.25, 0.997],
        hd: [0.512, 0.012]
      },
      8650: {
        dir: V,
        sizes: [0.883, 1.349],
        variants: [0, 2],
        stretch: [0, 8648, 8650],
        stretchv: [0, 1, 4],
        HDW: [0.703, 0.179, 0.992]
      },
      8651: {
        dir: H,
        sizes: [1.018, 1.484],
        variants: [0, 2],
        stretch: [8651, 8651, 8651],
        stretchv: [3, 1, 4],
        HDW: [0.598, 0.098, 1.018],
        hd: [0.369, -0.131]
      },
      8652: {
        dir: H,
        sizes: [1.018, 1.484],
        variants: [0, 2],
        stretch: [8652, 8651, 8652],
        stretchv: [3, 1, 4],
        HDW: [0.598, 0.098, 1.018],
        hd: [0.369, -0.131]
      },
      8653: {
        dir: H,
        sizes: [0.991, 1.457],
        variants: [0, 2],
        stretch: [8653, 8654, 0, 8653],
        stretchv: [3, 1, 0, 1],
        HDW: [0.52, 0.02, 0.991],
        hd: [0.369, -0.131]
      },
      8654: {
        dir: H,
        sizes: [1.068, 1.534],
        variants: [0, 2],
        stretch: [8656, 8654, 8658, 8653],
        stretchv: [3, 1, 4, 1],
        HDW: [0.52, 0.02, 1.068],
        hd: [0.369, -0.131]
      },
      8655: {
        dir: H,
        sizes: [0.991, 1.457],
        variants: [0, 2],
        stretch: [0, 8654, 8658, 8653],
        stretchv: [0, 1, 4, 1],
        HDW: [0.52, 0.02, 0.991],
        hd: [0.369, -0.131]
      },
      8656: {
        dir: H,
        sizes: [1, 1.457],
        variants: [0, 0],
        schar: [8656, 10232],
        stretch: [8656, 8656],
        stretchv: [3, 1],
        HDW: [0.52, 0.02, 1],
        hd: [0.369, -0.131]
      },
      8657: {
        dir: V,
        sizes: [0.88, 1.346],
        variants: [0, 2],
        stretch: [8657, 8657],
        stretchv: [3, 1],
        HDW: [0.676, 0.203, 0.652]
      },
      8658: {
        dir: H,
        sizes: [1, 1.457],
        variants: [0, 0],
        schar: [8658, 10233],
        stretch: [0, 8656, 8658],
        stretchv: [0, 1, 4],
        HDW: [0.52, 0.02, 1],
        hd: [0.369, -0.131]
      },
      8659: {
        dir: V,
        sizes: [0.88, 1.346],
        variants: [0, 2],
        stretch: [0, 8657, 8659],
        stretchv: [0, 1, 4],
        HDW: [0.703, 0.176, 0.652]
      },
      8660: {
        dir: H,
        sizes: [1, 1.534],
        variants: [0, 0],
        schar: [8660, 10234],
        stretch: [8656, 8656, 8658],
        stretchv: [3, 1, 4],
        HDW: [0.52, 0.02, 1],
        hd: [0.369, -0.131]
      },
      8661: {
        dir: V,
        sizes: [0.957, 1.423],
        variants: [0, 2],
        stretch: [8657, 8657, 8659],
        stretchv: [3, 1, 4],
        HDW: [0.728, 0.228, 0.652]
      },
      8666: {
        dir: H,
        sizes: [1.015, 1.461],
        variants: [0, 2],
        stretch: [8666, 8666],
        stretchv: [3, 1],
        HDW: [0.617, 0.117, 1.015],
        hd: [0.466, -0.034]
      },
      8667: {
        dir: H,
        sizes: [1.015, 1.461],
        variants: [0, 2],
        stretch: [0, 8666, 8667],
        stretchv: [0, 1, 4],
        HDW: [0.617, 0.117, 1.015],
        hd: [0.466, -0.034]
      },
      8693: {
        dir: V,
        sizes: [0.907, 1.373],
        variants: [0, 2],
        stretch: [8693, 8645, 8693],
        stretchv: [3, 1, 4],
        HDW: [0.703, 0.203, 0.896]
      },
      8694: {
        dir: H,
        sizes: [0.997, 1.463],
        variants: [0, 2],
        stretch: [0, 8694, 8694],
        stretchv: [0, 1, 4],
        HDW: [0.99, 0.49, 0.997],
        hd: [0.751, 0.251]
      },
      8719: {
        dir: V,
        sizes: [1.001, 1.401],
        variants: [0, 2]
      },
      8720: {
        dir: V,
        sizes: [1.001, 1.401],
        variants: [0, 2]
      },
      8721: {
        dir: V,
        sizes: [1.001, 1.401],
        variants: [0, 2]
      },
      8722: {
        dir: H,
        stretch: [0, 8722],
        HDW: [0.583, 0.083, 0.778],
        hd: [0.583, 0.083]
      },
      8725: {
        c: 47,
        dir: V,
        sizes: [1.001, 1.311, 1.717, 2.249, 2.945, 3.859, 5.055, 6.621]
      },
      8730: {
        dir: V,
        sizes: [1.001, 1.201, 1.801, 2.401, 3.001],
        stretch: [8730, 8730, 9143],
        stretchv: [3, 1, 0],
        HDW: [0.04, 0.96, 1.056],
        fullExt: [0.64, 2.44]
      },
      8739: {
        dir: V,
        sizes: [1.001, 1.203, 1.443, 1.735, 2.085, 2.505, 3.005, 3.605],
        stretch: [0, 8739],
        stretchv: [0, 2],
        HDW: [0.75, 0.25, 0.333]
      },
      8741: {
        dir: V,
        sizes: [1.001, 1.203, 1.443, 1.735, 2.085, 2.503, 3.004, 3.607],
        stretch: [0, 8741],
        stretchv: [0, 2],
        HDW: [0.75, 0.25, 0.555]
      },
      8747: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2],
        stretch: [8992, 9134, 8993],
        HDW: [0.805, 0.306, 1.185]
      },
      8748: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      8749: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      8750: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      8751: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      8752: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      8753: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      8754: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      8755: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      8801: {
        dir: H,
        stretch: [0, 8801],
        HDW: [0.464, -0.036, 0.778],
        hd: [0.464, -0.036]
      },
      8803: {
        dir: H,
        stretch: [0, 8803],
        HDW: [0.561, 0.061, 0.778],
        hd: [0.561, 0.061]
      },
      8866: {
        dir: V,
        sizes: [0.685, 0.869],
        variants: [0, 0],
        schar: [8866, 10205]
      },
      8867: {
        dir: V,
        sizes: [0.685, 0.869],
        variants: [0, 0],
        schar: [8867, 10206]
      },
      8868: {
        dir: V,
        sizes: [0.685, 0.869],
        variants: [0, 0],
        schar: [8868, 10201]
      },
      8869: {
        dir: V,
        sizes: [0.685, 0.869],
        variants: [0, 0],
        schar: [8869, 10200]
      },
      8896: {
        dir: V,
        sizes: [1.045, 1.394],
        variants: [0, 2]
      },
      8897: {
        dir: V,
        sizes: [1.045, 1.394],
        variants: [0, 2]
      },
      8898: {
        dir: V,
        sizes: [1.023, 1.357],
        variants: [0, 2]
      },
      8899: {
        dir: V,
        sizes: [1.023, 1.357],
        variants: [0, 2]
      },
      8968: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001],
        stretch: [9121, 9122],
        HDW: [0.75, 0.25, 0.667]
      },
      8969: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001],
        stretch: [9124, 9125],
        HDW: [0.75, 0.25, 0.667]
      },
      8970: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001],
        stretch: [0, 9122, 9123],
        HDW: [0.75, 0.25, 0.667]
      },
      8971: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001],
        stretch: [0, 9125, 9126],
        HDW: [0.75, 0.25, 0.667]
      },
      8978: {
        c: 9180,
        dir: H,
        sizes: [0.504, 1.006, 1.508, 2.012, 2.516, 3.02, 3.524, 4.032],
        stretch: [9180, 9180, 9180],
        stretchv: [3, 1, 4],
        HDW: [0.796, -0.502, 0.504],
        hd: [0.796, -0.689]
      },
      8994: {
        c: 9180,
        dir: H,
        sizes: [0.504, 1.006, 1.508, 2.012, 2.516, 3.02, 3.524, 4.032],
        stretch: [9180, 9180, 9180],
        stretchv: [3, 1, 4],
        HDW: [0.796, -0.502, 0.504],
        hd: [0.796, -0.689]
      },
      8995: {
        c: 9181,
        dir: H,
        sizes: [0.504, 1.006, 1.508, 2.012, 2.516, 3.02, 3.524, 4.032],
        stretch: [9181, 9181, 9181],
        stretchv: [3, 1, 4],
        HDW: [-0.072, 0.366, 0.504],
        hd: [-0.259, 0.366]
      },
      9001: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001],
        schar: [9001, 10216]
      },
      9002: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001],
        schar: [9002, 10217]
      },
      9130: {
        dir: V,
        sizes: [0.748],
        stretch: [0, 9130],
        HDW: [0.748, 0, 0.902]
      },
      9135: {
        c: 8211,
        dir: H,
        stretch: [0, 8211],
        HDW: [0.277, -0.255, 0.5],
        hd: [0.277, -0.255]
      },
      9136: {
        dir: V,
        sizes: [1.125],
        stretch: [9127, 9130, 9133],
        HDW: [0.75, 0.375, 0.902]
      },
      9137: {
        dir: V,
        sizes: [1.125],
        stretch: [9131, 9130, 9129],
        HDW: [0.75, 0.375, 0.902]
      },
      9140: {
        dir: H,
        sizes: [0.36, 0.735, 1.11, 1.485, 1.86, 2.235, 2.61, 2.985],
        stretch: [9140, 9140, 9140],
        stretchv: [3, 1, 4],
        HDW: [0.772, -0.504, 0.36],
        hd: [0.772, -0.706]
      },
      9141: {
        dir: H,
        sizes: [0.36, 0.735, 1.11, 1.485, 1.86, 2.235, 2.61, 2.985],
        stretch: [9141, 9141, 9141],
        stretchv: [3, 1, 4],
        HDW: [-0.074, 0.342, 0.36],
        hd: [-0.276, 0.342]
      },
      9168: {
        dir: V,
        sizes: [0.642],
        stretch: [0, 9168],
        HDW: [0.642, 0, 0.333]
      },
      9180: {
        dir: H,
        sizes: [0.504, 1.006, 1.508, 2.012, 2.516, 3.02, 3.524, 4.032],
        stretch: [9180, 9180, 9180],
        stretchv: [3, 1, 4],
        HDW: [0.796, -0.502, 0.504],
        hd: [0.796, -0.689]
      },
      9181: {
        dir: H,
        sizes: [0.504, 1.006, 1.508, 2.012, 2.516, 3.02, 3.524, 4.032],
        stretch: [9181, 9181, 9181],
        stretchv: [3, 1, 4],
        HDW: [-0.072, 0.366, 0.504],
        hd: [-0.259, 0.366]
      },
      9182: {
        dir: H,
        sizes: [0.492, 0.993, 1.494, 1.996, 2.498, 3, 3.502, 4.006],
        stretch: [9182, 175, 9182, 9182],
        stretchv: [3, 1, 4, 1],
        HDW: [0.85, -0.493, 0.492],
        hd: [0.724, -0.618]
      },
      9183: {
        dir: H,
        sizes: [0.492, 0.993, 1.494, 1.996, 2.498, 3, 3.502, 4.006],
        stretch: [9183, 95, 9183, 9183],
        stretchv: [3, 1, 4, 1],
        HDW: [-0.062, 0.419, 0.492],
        hd: [-0.188, 0.294]
      },
      9184: {
        dir: H,
        sizes: [0.546, 1.048, 1.55, 2.056, 2.564, 3.068, 3.574, 4.082],
        stretch: [9184, 9184, 9184],
        stretchv: [3, 1, 4],
        HDW: [0.873, -0.605, 0.546],
        hd: [0.873, -0.766]
      },
      9185: {
        dir: H,
        sizes: [0.546, 1.048, 1.55, 2.056, 2.564, 3.068, 3.574, 4.082],
        stretch: [9185, 9185, 9185],
        stretchv: [3, 1, 4],
        HDW: [-0.175, 0.443, 0.546],
        hd: [-0.336, 0.443]
      },
      9472: {
        c: 8211,
        dir: H,
        stretch: [0, 8211],
        HDW: [0.277, -0.255, 0.5],
        hd: [0.277, -0.255]
      },
      10072: {
        c: 8739,
        dir: V,
        sizes: [1.001, 1.203, 1.443, 1.735, 2.085, 2.505, 3.005, 3.605],
        stretch: [0, 8739],
        stretchv: [0, 2],
        HDW: [0.75, 0.25, 0.333]
      },
      10197: {
        dir: V,
        sizes: [0.511, 0.628],
        variants: [0, 2]
      },
      10198: {
        dir: V,
        sizes: [0.511, 0.628],
        variants: [0, 2]
      },
      10199: {
        dir: V,
        sizes: [0.511, 0.628],
        variants: [0, 2]
      },
      10214: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001],
        stretch: [10214, 10214, 10214],
        stretchv: [3, 1, 4],
        HDW: [0.75, 0.25, 1.007]
      },
      10215: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001],
        stretch: [10215, 10215, 10215],
        stretchv: [3, 1, 4],
        HDW: [0.75, 0.25, 1.007]
      },
      10216: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001]
      },
      10217: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001]
      },
      10218: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001]
      },
      10219: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001]
      },
      10222: {
        dir: V,
        sizes: [1.025, 1.127, 1.229, 1.483, 1.837, 2.141, 2.445, 3.053],
        stretch: [10222, 10222, 10222],
        stretchv: [3, 1, 4],
        HDW: [0.762, 0.262, 0.647]
      },
      10223: {
        dir: V,
        sizes: [1.025, 1.127, 1.229, 1.483, 1.837, 2.141, 2.445, 3.053],
        stretch: [10223, 10223, 10223],
        stretchv: [3, 1, 4],
        HDW: [0.762, 0.262, 0.647]
      },
      10229: {
        c: 8592,
        dir: H,
        sizes: [1, 1.463],
        variants: [0, 0],
        schar: [8592, 10229],
        stretch: [8592, 8592],
        stretchv: [3, 1],
        HDW: [0.51, 0.01, 1],
        hd: [0.274, -0.226]
      },
      10230: {
        c: 8594,
        dir: H,
        sizes: [1, 1.463],
        variants: [0, 0],
        schar: [8594, 10230],
        stretch: [0, 8592, 8594],
        stretchv: [0, 1, 4],
        HDW: [0.51, 0.01, 1],
        hd: [0.274, -0.226]
      },
      10231: {
        c: 8596,
        dir: H,
        sizes: [1, 1.442],
        variants: [0, 0],
        schar: [8596, 10231],
        stretch: [8592, 8592, 8594],
        stretchv: [3, 1, 4],
        HDW: [0.51, 0.01, 1],
        hd: [0.274, -0.226]
      },
      10232: {
        c: 8656,
        dir: H,
        sizes: [1, 1.457],
        variants: [0, 0],
        schar: [8656, 10232],
        stretch: [8656, 8656],
        stretchv: [3, 1],
        HDW: [0.52, 0.02, 1],
        hd: [0.369, -0.131]
      },
      10233: {
        c: 8658,
        dir: H,
        sizes: [1, 1.457],
        variants: [0, 0],
        schar: [8658, 10233],
        stretch: [0, 8656, 8658],
        stretchv: [0, 1, 4],
        HDW: [0.52, 0.02, 1],
        hd: [0.369, -0.131]
      },
      10234: {
        c: 8660,
        dir: H,
        sizes: [1, 1.534],
        variants: [0, 0],
        schar: [8660, 10234],
        stretch: [8656, 8656, 8658],
        stretchv: [3, 1, 4],
        HDW: [0.52, 0.02, 1],
        hd: [0.369, -0.131]
      },
      10235: {
        c: 8612,
        dir: H,
        sizes: [0.977, 1.443],
        variants: [0, 0],
        schar: [8612, 10235],
        stretch: [8592, 8592, 8612],
        stretchv: [3, 1, 4],
        HDW: [0.51, 0.011, 0.977],
        hd: [0.274, -0.226]
      },
      10236: {
        c: 8614,
        dir: H,
        sizes: [0.977, 1.443],
        variants: [0, 0],
        schar: [8614, 10236],
        stretch: [8614, 8592, 8594],
        stretchv: [3, 1, 4],
        HDW: [0.51, 0.011, 0.977],
        hd: [0.274, -0.226]
      },
      10570: {
        dir: H,
        sizes: [1.012],
        stretch: [8636, 8636, 8641],
        stretchv: [3, 1, 4],
        HDW: [0.499, 0, 1.012],
        hd: [0.273, -0.226]
      },
      10571: {
        dir: H,
        sizes: [1.012],
        stretch: [8637, 8636, 8640],
        stretchv: [3, 1, 4],
        HDW: [0.499, 0, 1.012],
        hd: [0.273, -0.226]
      },
      10574: {
        dir: H,
        sizes: [1],
        stretch: [8636, 8636, 8640],
        stretchv: [3, 1, 4],
        HDW: [0.499, -0.226, 1],
        hd: [0.273, -0.226]
      },
      10576: {
        dir: H,
        sizes: [1],
        stretch: [8637, 8636, 8641],
        stretchv: [3, 1, 4],
        HDW: [0.273, 0, 1],
        hd: [0.273, -0.226]
      },
      10586: {
        dir: H,
        sizes: [1],
        stretch: [8636, 8636, 8612],
        stretchv: [3, 1, 4],
        HDW: [0.51, 0.011, 1],
        hd: [0.273, -0.226]
      },
      10587: {
        dir: H,
        sizes: [1],
        stretch: [8614, 8636, 8640],
        stretchv: [3, 1, 4],
        HDW: [0.51, 0.011, 1],
        hd: [0.273, -0.226]
      },
      10590: {
        dir: H,
        sizes: [1],
        stretch: [8637, 8636, 8612],
        stretchv: [3, 1, 4],
        HDW: [0.51, 0.011, 1],
        hd: [0.273, -0.226]
      },
      10591: {
        dir: H,
        sizes: [1],
        stretch: [8614, 8636, 8641],
        stretchv: [3, 1, 4],
        HDW: [0.51, 0.011, 1],
        hd: [0.273, -0.226]
      },
      10627: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001]
      },
      10628: {
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001]
      },
      10629: {
        dir: V,
        sizes: [0.997, 1.095, 1.195, 1.445, 1.793, 2.093, 2.393, 2.991]
      },
      10630: {
        dir: V,
        sizes: [0.997, 1.095, 1.195, 1.445, 1.793, 2.093, 2.393, 2.991]
      },
      10744: {
        dir: V,
        sizes: [1.076, 1.917],
        variants: [0, 2]
      },
      10745: {
        dir: V,
        sizes: [1.076, 1.917],
        variants: [0, 2]
      },
      10748: {
        dir: V,
        sizes: [1.001, 1.083, 1.185, 1.433, 1.793, 2.093, 2.383, 2.997]
      },
      10749: {
        dir: V,
        sizes: [1.001, 1.083, 1.185, 1.433, 1.793, 2.093, 2.383, 2.997]
      },
      10752: {
        dir: V,
        sizes: [0.987, 1.305],
        variants: [0, 2]
      },
      10753: {
        dir: V,
        sizes: [0.987, 1.305],
        variants: [0, 2]
      },
      10754: {
        dir: V,
        sizes: [0.987, 1.305],
        variants: [0, 2]
      },
      10755: {
        dir: V,
        sizes: [1.023, 1.357],
        variants: [0, 2]
      },
      10756: {
        dir: V,
        sizes: [1.023, 1.357],
        variants: [0, 2]
      },
      10757: {
        dir: V,
        sizes: [1.029, 1.373],
        variants: [0, 2]
      },
      10758: {
        dir: V,
        sizes: [1.029, 1.373],
        variants: [0, 2]
      },
      10759: {
        dir: V,
        sizes: [1.045, 1.907],
        variants: [0, 2]
      },
      10760: {
        dir: V,
        sizes: [1.045, 1.907],
        variants: [0, 2]
      },
      10761: {
        dir: V,
        sizes: [0.981, 1.261],
        variants: [0, 2]
      },
      10762: {
        dir: V,
        sizes: [1.001, 1.401],
        variants: [0, 2]
      },
      10763: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10764: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10765: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10766: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10767: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10768: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10769: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10770: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10771: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10772: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10773: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10774: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10775: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10776: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10777: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10778: {
        dir: V,
        sizes: [1.112, 2.223],
        variants: [0, 2]
      },
      10779: {
        dir: V,
        sizes: [1.274, 2.464],
        variants: [0, 2]
      },
      10780: {
        dir: V,
        sizes: [1.274, 2.486],
        variants: [0, 2]
      },
      10781: {
        dir: V,
        sizes: [0.767, 1.073],
        variants: [0, 2]
      },
      10782: {
        dir: V,
        sizes: [0.767, 1.074],
        variants: [0, 2]
      },
      10784: {
        dir: V,
        sizes: [0.595, 0.835],
        variants: [0, 2]
      },
      10785: {
        dir: V,
        sizes: [0.901, 1.261],
        variants: [0, 2]
      },
      11004: {
        dir: V,
        sizes: [1.001, 1.915],
        variants: [0, 2]
      },
      11007: {
        dir: V,
        sizes: [1.241, 1.915],
        variants: [0, 2]
      },
      12296: {
        c: 10216,
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001]
      },
      12297: {
        c: 10217,
        dir: V,
        sizes: [1.001, 1.101, 1.201, 1.451, 1.801, 2.101, 2.401, 3.001]
      },
      65079: {
        c: 9182,
        dir: H,
        sizes: [0.492, 0.993, 1.494, 1.996, 2.498, 3, 3.502, 4.006],
        stretch: [9182, 175, 9182, 9182],
        stretchv: [3, 1, 4, 1],
        HDW: [0.85, -0.493, 0.492],
        hd: [0.724, -0.618]
      },
      65080: {
        c: 9183,
        dir: H,
        sizes: [0.492, 0.993, 1.494, 1.996, 2.498, 3, 3.502, 4.006],
        stretch: [9183, 95, 9183, 9183],
        stretchv: [3, 1, 4, 1],
        HDW: [-0.062, 0.419, 0.492],
        hd: [-0.188, 0.294]
      },
      126704: {
        dir: V,
        sizes: [0.527, 0.738]
      },
      126705: {
        dir: V,
        sizes: [0.531, 0.744]
      }
    };
  }
});
export{init_common2,init_normal,init_bold,init_italic,init_bold_italic,init_double_struck,init_fraktur,init_fraktur_bold,init_sans_serif,init_sans_serif_bold,init_sans_serif_italic,init_sans_serif_bold_italic,init_monospace,init_smallop,init_largeop,init_size3,init_size4,init_size5,init_size6,init_size7,init_tex_mathit,init_tex_calligraphic,init_tex_calligraphic_bold,init_tex_oldstyle,init_tex_oldstyle_bold,init_tex_variant,init_lf_tp,init_rt_bt,init_ex_md,init_bbold,init_upsmall,init_uplarge,init_script,init_script_bold,init_delimiters,CommonMathJaxNewcmFontMixin,delimiters,normal,bold,italic,boldItalic,doubleStruck,fraktur,frakturBold,sansSerif,sansSerifBold,sansSerifItalic,sansSerifBoldItalic,monospace,smallop,largeop,size3,size4,size5,size6,size7,texMathit,texCalligraphic,texCalligraphicBold,texOldstyle,texOldstyleBold,texVariant,lfTp,rtBt,exMd,bbold,upsmall,uplarge,script,scriptBold,init_WrapperFactory3,init_FontCache,SvgWrapperFactory,FontCache};
