import{__esm,init_FontData2,init_common2,init_normal,init_bold,init_italic,init_bold_italic,init_double_struck,init_fraktur,init_fraktur_bold,init_sans_serif,init_sans_serif_bold,init_sans_serif_italic,init_sans_serif_bold_italic,init_monospace,init_smallop,init_largeop,init_size3,init_size4,init_size5,init_size6,init_size7,init_tex_mathit,init_tex_calligraphic,init_tex_calligraphic_bold,init_tex_oldstyle,init_tex_oldstyle_bold,init_tex_variant,init_lf_tp,init_rt_bt,init_ex_md,init_bbold,init_upsmall,init_uplarge,init_script,init_script_bold,init_delimiters,CommonMathJaxNewcmFontMixin,SvgFontData,delimiters,normal,bold,italic,boldItalic,doubleStruck,fraktur,frakturBold,sansSerif,sansSerifBold,sansSerifItalic,sansSerifBoldItalic,monospace,smallop,largeop,size3,size4,size5,size6,size7,texMathit,texCalligraphic,texCalligraphicBold,texOldstyle,texOldstyleBold,texVariant,lfTp,rtBt,exMd,bbold,upsmall,uplarge,script,scriptBold,__kittexJson18,init_common,init_WrapperFactory3,init_StyleJson,init_FontCache,init_string,init_lengths,init_Wrapper2,CommonOutputJax,SvgWrapperFactory,FontCache,StyleJsonSheet,em,SPACE3,unicodeChars,init_BaseItems,init_ParseUtil,init_NodeUtil,init_TexError,init_TexConstants,ArrayItem,ParseUtil,TexError_default,NodeUtil_default,TexConstant,EqnArrayItem,init_HandlerTypes,init_MapHandler,init_UnitUtil,init_Token,UnitUtil,Token,Macro,HandlerType,SubHandler,init_ParseMethods,init_TexParser,init_BaseMethods,init_MmlNode,BaseMethods_default,splitAlignArray,TexParser,TEXCLASS,ParseMethods_default,init_TokenMap,CharacterMap,RegExpMap,CommandMap,MATHSPACE,EnvironmentMap,DelimiterMap,init_StackItem,BaseItem,MacroMap,init_Configuration,Configuration,ConfigurationType,init_Tags,AbstractTags,NodeFactory,init_NodeFactory2,__kittexLate}from'./p23.js';export*from'./p23.js';
__kittexLate.init_svg2=()=>init_svg2;__kittexLate.XLINKNS=()=>XLINKNS;
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg.js
var Base;
var MathJaxNewcmFont;
var init_svg = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg.js"() {
    init_FontData2();
    init_common2();
    init_normal();
    init_bold();
    init_italic();
    init_bold_italic();
    init_double_struck();
    init_fraktur();
    init_fraktur_bold();
    init_sans_serif();
    init_sans_serif_bold();
    init_sans_serif_italic();
    init_sans_serif_bold_italic();
    init_monospace();
    init_smallop();
    init_largeop();
    init_size3();
    init_size4();
    init_size5();
    init_size6();
    init_size7();
    init_tex_mathit();
    init_tex_calligraphic();
    init_tex_calligraphic_bold();
    init_tex_oldstyle();
    init_tex_oldstyle_bold();
    init_tex_variant();
    init_lf_tp();
    init_rt_bt();
    init_ex_md();
    init_bbold();
    init_upsmall();
    init_uplarge();
    init_script();
    init_script_bold();
    init_delimiters();
    Base = CommonMathJaxNewcmFontMixin(SvgFontData);
    MathJaxNewcmFont = class extends Base {
      constructor(options3 = {}) {
        super(options3);
        const CLASS = this.constructor;
        for (const variant of Object.keys(this.variant)) {
          this.variant[variant].cacheID = "NCM-" + (CLASS.variantCacheIds[variant] || "N");
        }
      }
    };
    MathJaxNewcmFont.NAME = "MathJaxNewcm";
    MathJaxNewcmFont.OPTIONS = Object.assign(Object.assign({}, Base.OPTIONS), { dynamicPrefix: "@mathjax/mathjax-newcm-font/js/svg/dynamic" });
    MathJaxNewcmFont.defaultDelimiters = delimiters;
    MathJaxNewcmFont.defaultChars = {
      "normal": normal,
      "bold": bold,
      "italic": italic,
      "bold-italic": boldItalic,
      "double-struck": doubleStruck,
      "fraktur": fraktur,
      "bold-fraktur": frakturBold,
      "sans-serif": sansSerif,
      "bold-sans-serif": sansSerifBold,
      "sans-serif-italic": sansSerifItalic,
      "sans-serif-bold-italic": sansSerifBoldItalic,
      "monospace": monospace,
      "-smallop": smallop,
      "-largeop": largeop,
      "-size3": size3,
      "-size4": size4,
      "-size5": size5,
      "-size6": size6,
      "-size7": size7,
      "-tex-mathit": texMathit,
      "-tex-calligraphic": texCalligraphic,
      "-tex-bold-calligraphic": texCalligraphicBold,
      "-tex-oldstyle": texOldstyle,
      "-tex-bold-oldstyle": texOldstyleBold,
      "-tex-variant": texVariant,
      "-lf-tp": lfTp,
      "-rt-bt": rtBt,
      "-ex-md": exMd,
      "-bbold": bbold,
      "-upsmall": upsmall,
      "-uplarge": uplarge,
      "script": script,
      "bold-script": scriptBold
    };
    MathJaxNewcmFont.dynamicFiles = SvgFontData.defineDynamicFiles(JSON.parse(__kittexJson18));
    MathJaxNewcmFont.variantCacheIds = JSON.parse(`{
 "normal":"N","bold":"B","italic":"I","bold-italic":"BI","double-struck":"DS","fraktur":"F","bold-fraktur":"FB","sans-serif":"SS","bold-sans-serif":"SSB","sans-serif-italic":"SSI",
 "sans-serif-bold-italic":"SSBI","monospace":"M","-smallop":"SO","-largeop":"LO","-size3":"S3","-size4":"S4","-size5":"S5","-size6":"S6","-size7":"S7","-tex-mathit":"MI","-tex-calligraphic":"C",
 "-tex-bold-calligraphic":"CB","-tex-oldstyle":"OS","-tex-bold-oldstyle":"OB","-tex-variant":"V","-lf-tp":"LT","-rt-bt":"RB","-ex-md":"EM","-bbold":"B-a","-upsmall":"U","-uplarge":"U-a","script":"S",
 "bold-script":"SB"
}`);
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/default.js
var Font;
var init_default = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/default.js"() {
    init_svg();
    Font = {
      fontName: "mathjax-newcm",
      DefaultFont: MathJaxNewcmFont
    };
  }
});
// node_modules/@mathjax/src/mjs/output/svg/DefaultFont.js
var fontName;
var DefaultFont;
var init_DefaultFont = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/DefaultFont.js"() {
    init_default();
    fontName = Font.fontName;
    DefaultFont = Font.DefaultFont;
  }
});
// node_modules/@mathjax/src/mjs/output/svg.js
var SVGNS;
var XLINKNS;
var SVG;
var init_svg2 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg.js"() {
    init_common();
    init_WrapperFactory3();
    init_StyleJson();
    init_FontCache();
    init_string();
    init_lengths();
    init_Wrapper2();
    init_DefaultFont();
    SVGNS = "http://www.w3.org/2000/svg";
    XLINKNS = "http://www.w3.org/1999/xlink";
    SVG = class _SVG extends CommonOutputJax {
      get forceInlineBreaks() {
        return this.options.linebreaks.inline;
      }
      constructor(options3 = {}) {
        super(options3, SvgWrapperFactory, DefaultFont);
        this.minwidth = 0;
        this.shift = 0;
        this.svgStyles = null;
        this.fontCache = new FontCache(this);
        this.options.matchFontHeight = true;
      }
      initialize() {
        if (this.options.fontCache === "global") {
          this.fontCache.clearCache();
        }
      }
      clearFontCache() {
        this.fontCache.clearCache();
      }
      reset() {
        this.clearFontCache();
      }
      escaped(math, html2) {
        this.setDocument(html2);
        return this.html("span", {}, [this.text(math.math)]);
      }
      styleSheet(html2) {
        if (this.svgStyles) {
          return this.svgStyles;
        }
        const sheet = this.svgStyles = super.styleSheet(html2);
        this.adaptor.setAttribute(sheet, "id", _SVG.STYLESHEETID);
        return sheet;
      }
      insertStyles(styles) {
        if (this.svgStyles) {
          this.adaptor.insertRules(this.svgStyles, new StyleJsonSheet(styles).getStyleRules());
        }
      }
      pageElements(html2) {
        if (this.options.fontCache === "global" && !this.findCache(html2)) {
          return this.svg("svg", {
            xmlns: SVGNS,
            id: _SVG.FONTCACHEID,
            style: { display: "none" }
          }, [this.fontCache.getCache()]);
        }
        return null;
      }
      findCache(html2) {
        const adaptor = this.adaptor;
        const svgs = adaptor.tags(adaptor.body(html2.document), "svg");
        for (let i2 = svgs.length - 1; i2 >= 0; i2--) {
          if (this.adaptor.getAttribute(svgs[i2], "id") === _SVG.FONTCACHEID) {
            return true;
          }
        }
        return false;
      }
      getInitialScale() {
        return 1;
      }
      processMath(wrapper, parent) {
        const container = this.container;
        this.container = parent;
        const [svg, g] = this.createRoot(wrapper);
        this.typesetSvg(wrapper, svg, g);
        if (wrapper.node.getProperty("process-breaks")) {
          this.handleInlineBreaks(wrapper, svg, g);
        }
        this.container = container;
      }
      createRoot(wrapper) {
        const { w, h, d, pwidth } = wrapper.getOuterBBox();
        const [svg, g] = this.createSVG(h, d, w);
        if (pwidth) {
          const adaptor = this.adaptor;
          adaptor.setStyle(svg, "min-width", adaptor.getStyle(svg, "width"));
          adaptor.setAttribute(svg, "width", pwidth);
          adaptor.setAttribute(svg, "data-mjx-viewBox", adaptor.getAttribute(svg, "viewBox"));
          adaptor.removeAttribute(svg, "viewBox");
          const scale2 = this.fixed(wrapper.metrics.ex / (this.font.params.x_height * 1e3), 6);
          adaptor.setAttribute(g, "transform", `scale(${scale2},-${scale2}) translate(0, ${this.fixed(-h * 1e3, 1)})`);
        }
        return [svg, g];
      }
      createSVG(h, d, w) {
        const px2 = this.math.metrics.em / 1e3;
        const W = Math.max(w, px2);
        const H2 = Math.max(h + d, px2);
        const g = this.svg("g", {
          stroke: "currentColor",
          fill: "currentColor",
          "stroke-width": 0,
          transform: "scale(1,-1)"
        });
        const adaptor = this.adaptor;
        const svg = adaptor.append(this.container, this.svg("svg", {
          xmlns: SVGNS,
          width: this.ex(W),
          height: this.ex(H2),
          role: "img",
          focusable: false,
          style: { "vertical-align": this.ex(-d) },
          viewBox: [
            0,
            this.fixed(-h * 1e3, 1),
            this.fixed(W * 1e3, 1),
            this.fixed(H2 * 1e3, 1)
          ].join(" ")
        }, [g]));
        if (W === 1e-3) {
          adaptor.setAttribute(svg, "preserveAspectRatio", "xMidYMid slice");
          if (w < 0) {
            adaptor.setStyle(this.container, "margin-right", this.ex(w));
          }
        }
        if (this.options.fontCache !== "none" && this.options.useXlink) {
          adaptor.setAttribute(svg, "xmlns:xlink", XLINKNS);
        }
        return [svg, g];
      }
      typesetSvg(wrapper, svg, g) {
        const adaptor = this.adaptor;
        this.minwidth = this.shift = 0;
        if (this.options.fontCache === "local") {
          this.fontCache.clearCache();
          this.fontCache.useLocalID(this.options.localID);
          adaptor.insert(this.fontCache.getCache(), g);
        }
        wrapper.toSVG([g]);
        this.fontCache.clearLocalID();
        if (this.minwidth) {
          adaptor.setStyle(svg, "minWidth", this.ex(this.minwidth));
          adaptor.setStyle(this.container, "minWidth", this.ex(this.minwidth));
        } else if (this.shift) {
          const align = adaptor.getAttribute(this.container, "justify") || "center";
          this.setIndent(svg, align, this.shift);
        }
      }
      setIndent(svg, align, shift) {
        if (align === "center" || align === "left") {
          this.adaptor.setStyle(svg, "margin-left", this.ex(shift));
        }
        if (align === "center" || align === "right") {
          this.adaptor.setStyle(svg, "margin-right", this.ex(-shift));
        }
      }
      handleInlineBreaks(wrapper, svg, g) {
        const n = wrapper.childNodes[0].breakCount;
        if (!n)
          return;
        const adaptor = this.adaptor;
        const math = adaptor.firstChild(g);
        const lines2 = adaptor.childNodes(adaptor.firstChild(math));
        const lineBBox = wrapper.childNodes[0].lineBBox;
        adaptor.remove(g);
        for (let i2 = 0; i2 <= n; i2++) {
          const line = lineBBox[i2] || wrapper.childNodes[0].getLineBBox(i2);
          const { h, d, w } = line;
          const [mml, mo] = wrapper.childNodes[0].getBreakNode(line);
          const { scale: scale2 } = mml.getBBox();
          const [nsvg, ng] = this.createSVG(h * scale2, d * scale2, w * scale2);
          const nmath = adaptor.append(ng, adaptor.clone(math, false));
          for (const child of adaptor.childNodes(lines2[i2])) {
            adaptor.append(nmath, child);
          }
          adaptor.insert(nsvg, svg);
          const forced = !!(mo && mo.node.getProperty("forcebreak"));
          if (forced && mo.node.attributes.get("linebreakstyle") === "after") {
            const k = mml.parent.node.childIndex(mml.node) + 1;
            const next = mml.parent.childNodes[k];
            const dimen = next ? next.getLineBBox(0).originalL * scale2 : 0;
            if (dimen) {
              this.addInlineBreak(nsvg, dimen, forced);
            }
          } else if (forced || i2) {
            const dimen = mml && i2 ? mml.getLineBBox(0).originalL * scale2 : 0;
            if (dimen || !forced) {
              this.addInlineBreak(nsvg, dimen, forced || !!mml.node.getProperty("forcebreak"));
            }
          }
        }
        if (adaptor.childNodes(svg).length) {
          adaptor.append(adaptor.firstChild(adaptor.parent(svg)), adaptor.firstChild(svg));
        }
        adaptor.remove(svg);
      }
      addInlineBreak(nsvg, dimen, forced) {
        const adaptor = this.adaptor;
        const space = em(dimen);
        if (!forced) {
          adaptor.insert(adaptor.node("mjx-break", { prebreak: true }, [adaptor.text(" ")]), nsvg);
        }
        adaptor.insert(adaptor.node("mjx-break", !forced ? { newline: true } : SPACE3[space] ? { size: SPACE3[space] } : { style: `letter-spacing: ${em(dimen - 1)}` }, [adaptor.text(" ")]), nsvg);
      }
      ex(m) {
        m /= this.font.params.x_height;
        return Math.abs(m) < 1e-3 ? "0" : m.toFixed(3).replace(/\.?0+$/, "") + "ex";
      }
      svg(kind, properties = {}, children = []) {
        return this.html(kind, properties, children, SVGNS);
      }
      unknownText(text, variant) {
        const metrics = this.math.metrics;
        const scale2 = this.font.params.x_height / metrics.ex * metrics.em * 1e3;
        const svg = this.svg("text", {
          "data-variant": variant,
          transform: "scale(1,-1)",
          "font-size": this.fixed(scale2, 1) + "px"
        }, [this.text(text)]);
        const adaptor = this.adaptor;
        if (variant !== "-explicitFont") {
          const c = unicodeChars(text);
          if (c.length !== 1 || c[0] < 119808 || c[0] > 120831) {
            const [family, italic2, bold2] = this.font.getCssFont(variant);
            adaptor.setAttribute(svg, "font-family", family);
            if (italic2) {
              adaptor.setAttribute(svg, "font-style", "italic");
            }
            if (bold2) {
              adaptor.setAttribute(svg, "font-weight", "bold");
            }
          }
        }
        return svg;
      }
      measureTextNode(text) {
        const adaptor = this.adaptor;
        text = adaptor.clone(text);
        adaptor.removeAttribute(text, "transform");
        const ex = this.fixed(this.font.params.x_height * 1e3, 1);
        const svg = this.svg("svg", {
          position: "absolute",
          visibility: "hidden",
          width: "1ex",
          height: "1ex",
          top: 0,
          left: 0,
          viewBox: [0, 0, ex, ex].join(" ")
        }, [text]);
        adaptor.append(adaptor.body(adaptor.document), svg);
        const w = adaptor.nodeSize(text, 1e3, true)[0];
        adaptor.remove(svg);
        return { w, h: 0.75, d: 0.2 };
      }
    };
    SVG.NAME = "SVG";
    SVG.OPTIONS = Object.assign(Object.assign({}, CommonOutputJax.OPTIONS), { blacker: 3, fontCache: "local", localID: null, useXlink: true });
    SVG.commonStyles = Object.assign(Object.assign({}, CommonOutputJax.commonStyles), { 'mjx-container[jax="SVG"]': {
      direction: "ltr",
      "white-space": "nowrap"
    }, 'mjx-container[jax="SVG"] > svg': {
      overflow: "visible",
      "min-height": "1px",
      "min-width": "1px"
    }, 'mjx-container[jax="SVG"] > svg a': {
      fill: "blue",
      stroke: "blue"
    }, [[
      "rect[data-sre-highlighter-added]:has(+ .mjx-selected)",
      "rect[data-sre-highlighter-bbox].mjx-selected"
    ].join(", ")]: {
      stroke: "black",
      "stroke-width": "80px"
    }, "@media (prefers-color-scheme: dark)": {
      [[
        "rect[data-sre-highlighter-added]:has(+ .mjx-selected)",
        "rect[data-sre-highlighter-bbox].mjx-selected"
      ].join(", ")]: {
        stroke: "#C8C8C8"
      }
    } });
    SVG.FONTCACHEID = "MJX-SVG-global-cache";
    SVG.STYLESHEETID = "MJX-SVG-styles";
  }
});
// node_modules/@mathjax/src/mjs/input/tex/ams/AmsItems.js
var MultlineItem;
var FlalignItem;
var init_AmsItems = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/ams/AmsItems.js"() {
    init_BaseItems();
    init_ParseUtil();
    init_NodeUtil();
    init_TexError();
    init_TexConstants();
    MultlineItem = class extends ArrayItem {
      constructor(factory, ...args) {
        super(factory);
        this.factory.configuration.tags.start("multline", true, args[0]);
      }
      get kind() {
        return "multline";
      }
      EndEntry() {
        if (this.table.length) {
          ParseUtil.fixInitialMO(this.factory.configuration, this.nodes);
        }
        const shove = this.getProperty("shove");
        const mtd = this.create("node", "mtd", this.nodes, shove ? { columnalign: shove } : {});
        this.setProperty("shove", null);
        this.row.push(mtd);
        this.Clear();
      }
      EndRow() {
        if (this.row.length !== 1) {
          throw new TexError_default("MultlineRowsOneCol", "The rows within the %1 environment must have exactly one column", "multline");
        }
        const row = this.create("node", "mtr", this.row);
        this.table.push(row);
        this.row = [];
      }
      EndTable() {
        super.EndTable();
        if (this.table.length) {
          const m = this.table.length - 1;
          let label = -1;
          if (!NodeUtil_default.getAttribute(NodeUtil_default.getChildren(this.table[0])[0], "columnalign")) {
            NodeUtil_default.setAttribute(NodeUtil_default.getChildren(this.table[0])[0], "columnalign", TexConstant.Align.LEFT);
          }
          if (!NodeUtil_default.getAttribute(NodeUtil_default.getChildren(this.table[m])[0], "columnalign")) {
            NodeUtil_default.setAttribute(NodeUtil_default.getChildren(this.table[m])[0], "columnalign", TexConstant.Align.RIGHT);
          }
          const tag3 = this.factory.configuration.tags.getTag();
          if (tag3) {
            label = this.arraydef.side === TexConstant.Align.LEFT ? 0 : this.table.length - 1;
            const mtr = this.table[label];
            const mlabel = this.create("node", "mlabeledtr", [tag3].concat(NodeUtil_default.getChildren(mtr)));
            NodeUtil_default.copyAttributes(mtr, mlabel);
            this.table[label] = mlabel;
          }
        }
        this.factory.configuration.tags.end();
      }
    };
    FlalignItem = class extends EqnArrayItem {
      get kind() {
        return "flalign";
      }
      constructor(factory, name, numbered, padded2, center) {
        super(factory);
        this.name = name;
        this.numbered = numbered;
        this.padded = padded2;
        this.center = center;
        this.factory.configuration.tags.start(name, numbered, numbered);
      }
      EndEntry() {
        super.EndEntry();
        const n = this.getProperty("xalignat");
        if (!n)
          return;
        if (this.row.length > n) {
          throw new TexError_default("XalignOverflow", "Extra %1 in row of %2", "&", this.name);
        }
      }
      EndRow() {
        let cell;
        const row = this.row;
        const n = this.getProperty("xalignat");
        while (row.length < n) {
          row.push(this.create("node", "mtd"));
        }
        this.row = [];
        if (this.padded) {
          this.row.push(this.create("node", "mtd"));
        }
        while (cell = row.shift()) {
          this.row.push(cell);
          cell = row.shift();
          if (cell)
            this.row.push(cell);
          if (row.length || this.padded) {
            this.row.push(this.create("node", "mtd"));
          }
        }
        if (this.row.length > this.maxrow) {
          this.maxrow = this.row.length;
        }
        super.EndRow();
        const mtr = this.table[this.table.length - 1];
        if (this.getProperty("zeroWidthLabel") && mtr.isKind("mlabeledtr")) {
          const mtd = NodeUtil_default.getChildren(mtr)[0];
          const side = this.factory.configuration.options["tagSide"];
          const def2 = Object.assign({ width: 0 }, side === "right" ? { lspace: "-1width" } : {});
          const mpadded = this.create("node", "mpadded", NodeUtil_default.getChildren(mtd), def2);
          mtd.setChildren([mpadded]);
        }
      }
      EndTable() {
        super.EndTable();
        if (this.center) {
          if (this.maxrow <= 2) {
            const def2 = this.arraydef;
            delete def2.width;
            delete this.global.indentalign;
          }
        }
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/newcommand/NewcommandUtil.js
var NewcommandTables;
var NewcommandPriority;
var NewcommandUtil;
var init_NewcommandUtil = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/newcommand/NewcommandUtil.js"() {
    init_HandlerTypes();
    init_MapHandler();
    init_UnitUtil();
    init_TexError();
    init_Token();
    (function(NewcommandTables2) {
      NewcommandTables2["NEW_DELIMITER"] = "new-Delimiter";
      NewcommandTables2["NEW_COMMAND"] = "new-Command";
      NewcommandTables2["NEW_ENVIRONMENT"] = "new-Environment";
    })(NewcommandTables || (NewcommandTables = {}));
    NewcommandPriority = -100;
    NewcommandUtil = {
      GetCSname(parser2, cmd) {
        const c = parser2.GetNext();
        if (c !== "\\") {
          throw new TexError_default("MissingCS", "%1 must be followed by a control sequence", cmd);
        }
        const cs = UnitUtil.trimSpaces(parser2.GetArgument(cmd)).substring(1);
        this.checkProtectedMacros(parser2, cs);
        return cs;
      },
      GetCsNameArgument(parser2, name) {
        let cs = UnitUtil.trimSpaces(parser2.GetArgument(name));
        if (cs.charAt(0) === "\\") {
          cs = cs.substring(1);
        }
        if (!cs.match(/^(.|[a-z]+)$/i)) {
          throw new TexError_default("IllegalControlSequenceName", "Illegal control sequence name for %1", name);
        }
        this.checkProtectedMacros(parser2, cs);
        return cs;
      },
      GetArgCount(parser2, name) {
        let n = parser2.GetBrackets(name);
        if (n) {
          n = UnitUtil.trimSpaces(n);
          if (!n.match(/^[0-9]+$/)) {
            throw new TexError_default("IllegalParamNumber", "Illegal number of parameters specified in %1", name);
          }
        }
        return n;
      },
      GetTemplate(parser2, cmd, cs) {
        let c = parser2.GetNext();
        const params = [];
        let n = 0;
        let i2 = parser2.i;
        while (parser2.i < parser2.string.length) {
          c = parser2.GetNext();
          if (c === "#") {
            if (i2 !== parser2.i) {
              params[n] = parser2.string.substring(i2, parser2.i);
            }
            c = parser2.string.charAt(++parser2.i);
            if (!c.match(/^[1-9]$/)) {
              throw new TexError_default("CantUseHash2", "Illegal use of # in template for %1", cs);
            }
            if (parseInt(c) !== ++n) {
              throw new TexError_default("SequentialParam", "Parameters for %1 must be numbered sequentially", cs);
            }
            i2 = parser2.i + 1;
          } else if (c === "{") {
            if (i2 !== parser2.i) {
              params[n] = parser2.string.substring(i2, parser2.i);
              if (params[n].replace(/^ +/, "") === "" && params.slice(0, n).join("") === "") {
                return n;
              }
            }
            if (params.length > 0) {
              return [n.toString()].concat(params);
            } else {
              return n;
            }
          }
          parser2.i++;
        }
        throw new TexError_default("MissingReplacementString", "Missing replacement string for definition of %1", cmd);
      },
      GetParameter(parser2, name, param) {
        if (param == null) {
          return parser2.GetArgument(name);
        }
        let i2 = parser2.i;
        let j = 0;
        let hasBraces = false;
        while (parser2.i < parser2.string.length) {
          const c = parser2.string.charAt(parser2.i);
          if (c === "{") {
            hasBraces = parser2.i === i2;
            parser2.GetArgument(name);
            j = parser2.i - i2;
          } else if (this.MatchParam(parser2, param)) {
            if (hasBraces) {
              i2++;
              j -= 2;
            }
            return parser2.string.substring(i2, i2 + j);
          } else if (c === "\\") {
            parser2.i++;
            j++;
            hasBraces = false;
            const match = parser2.string.substring(parser2.i).match(/[a-z]+|./i);
            if (match) {
              parser2.i += match[0].length;
              j = parser2.i - i2;
            }
          } else {
            parser2.i++;
            j++;
            hasBraces = false;
          }
        }
        throw new TexError_default("RunawayArgument", "Runaway argument for %1?", name);
      },
      MatchParam(parser2, param) {
        if (parser2.string.substring(parser2.i, parser2.i + param.length) !== param) {
          return 0;
        }
        if (param.match(/\\[a-z]+$/i) && parser2.string.charAt(parser2.i + param.length).match(/[a-z]/i)) {
          return 0;
        }
        parser2.i += param.length;
        return 1;
      },
      checkGlobal(parser2, tokens, maps3) {
        return parser2.stack.env.isGlobal ? parser2.configuration.packageData.get("begingroup").stack.checkGlobal(tokens, maps3) : maps3.map((name) => parser2.configuration.handlers.retrieve(name));
      },
      checkProtectedMacros(parser2, cs) {
        var _a2;
        if ((_a2 = parser2.options.protectedMacros) === null || _a2 === void 0 ? void 0 : _a2.includes(cs)) {
          throw new TexError_default("ProtectedMacro", "The control sequence %1 can't be redefined", `\\${cs}`);
        }
      },
      addDelimiter(parser2, cs, char, attr) {
        const name = cs.substring(1);
        this.checkProtectedMacros(parser2, name);
        const [macros, delims] = NewcommandUtil.checkGlobal(parser2, [name, cs], [NewcommandTables.NEW_COMMAND, NewcommandTables.NEW_DELIMITER]);
        if (name !== cs) {
          macros.remove(name);
        }
        delims.add(cs, new Token(cs, char, attr));
        delete parser2.stack.env.isGlobal;
      },
      addMacro(parser2, cs, func, attr, token2 = "") {
        this.checkProtectedMacros(parser2, cs);
        const macros = NewcommandUtil.checkGlobal(parser2, [cs], [NewcommandTables.NEW_COMMAND])[0];
        this.undefineDelimiter(parser2, "\\" + cs);
        macros.add(cs, new Macro(token2 ? token2 : cs, func, attr));
        delete parser2.stack.env.isGlobal;
      },
      addEnvironment(parser2, env, func, attr) {
        const envs = NewcommandUtil.checkGlobal(parser2, [env], [NewcommandTables.NEW_ENVIRONMENT])[0];
        envs.add(env, new Macro(env, func, attr));
        delete parser2.stack.env.isGlobal;
      },
      undefineMacro(parser2, cs) {
        const macros = NewcommandUtil.checkGlobal(parser2, [cs], [NewcommandTables.NEW_COMMAND])[0];
        macros.remove(cs);
        if (parser2.configuration.handlers.get(HandlerType.MACRO).applicable(cs)) {
          macros.add(cs, new Macro(cs, () => SubHandler.FALLBACK, []));
          this.undefineDelimiter(parser2, "\\" + cs);
        }
        delete parser2.stack.env.isGlobal;
      },
      undefineDelimiter(parser2, cs) {
        const delims = NewcommandUtil.checkGlobal(parser2, [cs], [NewcommandTables.NEW_DELIMITER])[0];
        delims.remove(cs);
        if (parser2.configuration.handlers.get(HandlerType.DELIMITER).applicable(cs)) {
          delims.add(cs, new Token(cs, null, {}));
        }
        delete parser2.stack.env.isGlobal;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/ams/AmsMethods.js
function splitSideSet(mml) {
  if (!mml || mml.isInferred && mml.childNodes.length === 0) {
    return [null, null];
  }
  if (mml.isKind("msubsup") && checkSideSetBase(mml)) {
    return [mml, null];
  }
  const child = NodeUtil_default.getChildAt(mml, 0);
  if (!(mml.isInferred && child && checkSideSetBase(child))) {
    return [null, mml];
  }
  mml.childNodes.splice(0, 1);
  return [child, mml];
}
function checkSideSetBase(mml) {
  const base = mml.childNodes[0];
  return base && base.isKind("mi") && base.getText() === "";
}
var AmsMethods;
var init_AmsMethods = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/ams/AmsMethods.js"() {
    init_ParseUtil();
    init_UnitUtil();
    init_ParseMethods();
    init_NodeUtil();
    init_TexConstants();
    init_TexParser();
    init_TexError();
    init_BaseMethods();
    init_BaseMethods();
    init_MmlNode();
    init_NewcommandUtil();
    AmsMethods = {
      AmsEqnArray(parser2, begin, numbered, taggable, align, balign, spacing, style) {
        const args = parser2.GetBrackets("\\begin{" + begin.getName() + "}");
        const array = BaseMethods_default.EqnArray(parser2, begin, numbered, taggable, align, balign, spacing, style);
        return ParseUtil.setArrayAlign(array, args, parser2);
      },
      AlignAt(parser2, begin, numbered, taggable) {
        const name = begin.getName();
        let valign;
        let align = "";
        let balign = "";
        const spacing = [];
        if (!taggable) {
          valign = parser2.GetBrackets("\\begin{" + name + "}");
        }
        const n = parser2.GetArgument("\\begin{" + name + "}");
        if (n.match(/[^0-9]/)) {
          throw new TexError_default("PositiveIntegerArg", "Argument to %1 must be a positive integer", "\\begin{" + name + "}");
        }
        let count = parseInt(n, 10);
        while (count > 0) {
          align += "rl";
          balign += "bt";
          spacing.push("0em 0em");
          count--;
        }
        const spaceStr = spacing.join(" ");
        if (taggable) {
          return AmsMethods.EqnArray(parser2, begin, numbered, taggable, align, balign, spaceStr);
        }
        const array = AmsMethods.EqnArray(parser2, begin, numbered, taggable, align, balign, spaceStr);
        return ParseUtil.setArrayAlign(array, valign, parser2);
      },
      Multline(parser2, begin, numbered) {
        ParseUtil.checkEqnEnv(parser2);
        parser2.Push(begin);
        const padding2 = parser2.options.ams["multlineIndent"];
        const item = parser2.itemFactory.create("multline", numbered, parser2.stack);
        item.arraydef = {
          displaystyle: true,
          rowspacing: ".5em",
          columnspacing: "100%",
          width: parser2.options.ams["multlineWidth"],
          side: parser2.options["tagSide"],
          minlabelspacing: parser2.options["tagIndent"],
          "data-array-padding": `${padding2} ${padding2}`,
          "data-width-includes-label": true
        };
        return item;
      },
      XalignAt(parser2, begin, numbered, padded2) {
        const n = parser2.GetArgument("\\begin{" + begin.getName() + "}");
        if (n.match(/[^0-9]/)) {
          throw new TexError_default("PositiveIntegerArg", "Argument to %1 must be a positive integer", "\\begin{" + begin.getName() + "}");
        }
        const align = padded2 ? "crl" : "rlc";
        const balign = padded2 ? "mbt" : "btm";
        const width = padded2 ? "fit auto auto" : "auto auto fit";
        const item = AmsMethods.FlalignArray(parser2, begin, numbered, padded2, false, align, balign, width, true);
        item.setProperty("xalignat", 2 * parseInt(n));
        return item;
      },
      FlalignArray(parser2, begin, numbered, padded2, center, align, balign, width, zeroWidthLabel = false) {
        ParseUtil.checkEqnEnv(parser2);
        parser2.Push(begin);
        align = align.split("").join(" ").replace(/r/g, "right").replace(/l/g, "left").replace(/c/g, "center");
        balign = splitAlignArray(balign);
        const item = parser2.itemFactory.create("flalign", begin.getName(), numbered, padded2, center, parser2.stack);
        item.arraydef = {
          width: "100%",
          displaystyle: true,
          columnalign: align,
          columnspacing: "0em",
          columnwidth: width,
          rowspacing: "3pt",
          "data-break-align": balign,
          side: parser2.options["tagSide"],
          minlabelspacing: zeroWidthLabel ? "0" : parser2.options["tagIndent"],
          "data-width-includes-label": true
        };
        item.setProperty("zeroWidthLabel", zeroWidthLabel);
        return item;
      },
      HandleDeclareOp(parser2, name) {
        const star = parser2.GetStar() ? "*" : "";
        const cs = NewcommandUtil.GetCsNameArgument(parser2, name);
        const op = parser2.GetArgument(name);
        NewcommandUtil.addMacro(parser2, cs, AmsMethods.Macro, [
          `\\operatorname${star}{${op}}`
        ]);
        parser2.Push(parser2.itemFactory.create("null"));
      },
      HandleOperatorName(parser2, name) {
        const star = parser2.GetStar();
        const op = UnitUtil.trimSpaces(parser2.GetArgument(name));
        let mml = new TexParser(op, Object.assign(Object.assign({}, parser2.stack.env), { font: TexConstant.Variant.NORMAL, multiLetterIdentifiers: parser2.options.ams.operatornamePattern, operatorLetters: true, noAutoOP: true }), parser2.configuration).mml();
        if (mml.isKind("mi")) {
          mml.removeProperty("autoOP");
        } else {
          mml = parser2.create("node", "TeXAtom", [mml]);
        }
        NodeUtil_default.setProperties(mml, {
          movesupsub: star,
          movablelimits: true,
          texClass: TEXCLASS.OP
        });
        if (!star) {
          const c = parser2.GetNext();
          const i2 = parser2.i;
          if (c === "\\" && ++parser2.i && parser2.GetCS() !== "limits") {
            parser2.i = i2;
          }
        }
        parser2.Push(parser2.itemFactory.create("fn", mml));
      },
      SideSet(parser2, name) {
        const [preScripts, preRest] = splitSideSet(parser2.ParseArg(name));
        const [postScripts, postRest] = splitSideSet(parser2.ParseArg(name));
        const base = parser2.ParseArg(name);
        let mml = base;
        if (preScripts) {
          if (preRest) {
            preScripts.replaceChild(parser2.create("node", "mphantom", [
              parser2.create("node", "mpadded", [ParseUtil.copyNode(base, parser2)], { width: 0 })
            ]), NodeUtil_default.getChildAt(preScripts, 0));
          } else {
            mml = parser2.create("node", "mmultiscripts", [base]);
            if (postScripts) {
              NodeUtil_default.appendChildren(mml, [
                NodeUtil_default.getChildAt(postScripts, 1) || parser2.create("node", "none"),
                NodeUtil_default.getChildAt(postScripts, 2) || parser2.create("node", "none")
              ]);
            }
            NodeUtil_default.setProperty(mml, "scriptalign", "left");
            NodeUtil_default.appendChildren(mml, [
              parser2.create("node", "mprescripts"),
              NodeUtil_default.getChildAt(preScripts, 1) || parser2.create("node", "none"),
              NodeUtil_default.getChildAt(preScripts, 2) || parser2.create("node", "none")
            ]);
          }
        }
        if (postScripts && mml === base) {
          postScripts.replaceChild(base, NodeUtil_default.getChildAt(postScripts, 0));
          mml = postScripts;
        }
        const mrow = parser2.create("node", "TeXAtom", [], {
          texClass: TEXCLASS.OP,
          movesupsub: true,
          movablelimits: true
        });
        if (preRest) {
          if (preScripts) {
            mrow.appendChild(preScripts);
          }
          mrow.appendChild(preRest);
        }
        mrow.appendChild(mml);
        if (postRest) {
          mrow.appendChild(postRest);
        }
        parser2.Push(mrow);
      },
      operatorLetter(parser2, c) {
        return parser2.stack.env.operatorLetters ? ParseMethods_default.variable(parser2, c) : false;
      },
      MultiIntegral(parser2, name, integral) {
        let next = parser2.GetNext();
        if (next === "\\") {
          const i2 = parser2.i;
          next = parser2.GetArgument(name);
          parser2.i = i2;
          if (next === "\\limits") {
            integral = "\\!\\!\\mathop{\\,\\," + integral + "}";
          }
        }
        parser2.string = integral + " " + parser2.string.slice(parser2.i);
        parser2.i = 0;
      },
      xArrow(parser2, name, chr, l, r, m = 0) {
        const def2 = {
          width: "+" + UnitUtil.em((l + r) / 18),
          lspace: UnitUtil.em(l / 18)
        };
        const bot = parser2.GetBrackets(name);
        const first = parser2.ParseArg(name);
        const dstrut = parser2.create("node", "mspace", [], { depth: ".2em" });
        let arrow = parser2.create("token", "mo", { stretchy: true, texClass: TEXCLASS.ORD }, String.fromCodePoint(chr));
        if (m) {
          arrow.attributes.set("minsize", UnitUtil.em(m));
        }
        arrow = parser2.create("node", "mstyle", [arrow], { scriptlevel: 0 });
        const mml = parser2.create("node", "munderover", [arrow]);
        let mpadded = parser2.create("node", "mpadded", [first, dstrut], def2);
        NodeUtil_default.setAttribute(mpadded, "voffset", "-.2em");
        NodeUtil_default.setAttribute(mpadded, "height", "-.2em");
        NodeUtil_default.setChild(mml, mml.over, mpadded);
        if (bot) {
          const bottom = new TexParser(bot, parser2.stack.env, parser2.configuration).mml();
          const bstrut = parser2.create("node", "mspace", [], { height: ".75em" });
          mpadded = parser2.create("node", "mpadded", [bottom, bstrut], def2);
          NodeUtil_default.setAttribute(mpadded, "voffset", ".15em");
          NodeUtil_default.setAttribute(mpadded, "depth", "-.15em");
          NodeUtil_default.setChild(mml, mml.under, mpadded);
        }
        NodeUtil_default.setProperty(mml, "subsupOK", true);
        parser2.Push(parser2.create("node", "TeXAtom", [
          parser2.create("node", "TeXAtom", [], {
            texClass: TEXCLASS.NONE
          }),
          mml
        ], { texClass: TEXCLASS.REL }));
      },
      HandleShove(parser2, _name, shove) {
        const top = parser2.stack.Top();
        if (top.kind !== "multline") {
          throw new TexError_default("CommandOnlyAllowedInEnv", "%1 only allowed in %2 environment", parser2.currentCS, "multline");
        }
        if (top.Size()) {
          throw new TexError_default("CommandAtTheBeginingOfLine", "%1 must come at the beginning of the line", parser2.currentCS);
        }
        top.setProperty("shove", shove);
      },
      CFrac(parser2, name) {
        let lr = UnitUtil.trimSpaces(parser2.GetBrackets(name, ""));
        const num3 = parser2.GetArgument(name);
        const den = parser2.GetArgument(name);
        const lrMap = {
          l: TexConstant.Align.LEFT,
          r: TexConstant.Align.RIGHT,
          "": ""
        };
        const numNode = new TexParser("\\strut\\textstyle{" + num3 + "}", parser2.stack.env, parser2.configuration).mml();
        const denNode = new TexParser("\\strut\\textstyle{" + den + "}", parser2.stack.env, parser2.configuration).mml();
        const frac = parser2.create("node", "mfrac", [numNode, denNode]);
        lr = lrMap[lr];
        if (lr == null) {
          throw new TexError_default("IllegalAlign", "Illegal alignment specified in %1", parser2.currentCS);
        }
        if (lr) {
          NodeUtil_default.setProperties(frac, { numalign: lr, denomalign: lr });
        }
        parser2.Push(frac);
      },
      Genfrac(parser2, name, left, right, thick, style) {
        if (left == null) {
          left = parser2.GetDelimiterArg(name);
        }
        if (right == null) {
          right = parser2.GetDelimiterArg(name);
        }
        if (thick == null) {
          thick = parser2.GetArgument(name);
        }
        if (style == null) {
          style = UnitUtil.trimSpaces(parser2.GetArgument(name));
        }
        const num3 = parser2.ParseArg(name);
        const den = parser2.ParseArg(name);
        let frac = parser2.create("node", "mfrac", [num3, den]);
        if (thick !== "") {
          NodeUtil_default.setAttribute(frac, "linethickness", thick);
        }
        if (left || right) {
          NodeUtil_default.setProperty(frac, "withDelims", true);
          frac = ParseUtil.fixedFence(parser2.configuration, left, frac, right);
        }
        if (style !== "") {
          const styleDigit = parseInt(style, 10);
          const styleAlpha = ["D", "T", "S", "SS"][styleDigit];
          if (styleAlpha == null) {
            throw new TexError_default("BadMathStyleFor", "Bad math style for %1", parser2.currentCS);
          }
          frac = parser2.create("node", "mstyle", [frac]);
          if (styleAlpha === "D") {
            NodeUtil_default.setProperties(frac, { displaystyle: true, scriptlevel: 0 });
          } else {
            NodeUtil_default.setProperties(frac, {
              displaystyle: false,
              scriptlevel: styleDigit - 1
            });
          }
        }
        parser2.Push(frac);
      },
      HandleTag(parser2, name) {
        if (!parser2.tags.currentTag.taggable && parser2.tags.env) {
          throw new TexError_default("CommandNotAllowedInEnv", "%1 not allowed in %2 environment", parser2.currentCS, parser2.tags.env);
        }
        if (parser2.tags.currentTag.tag) {
          throw new TexError_default("MultipleCommand", "Multiple %1", parser2.currentCS);
        }
        const star = parser2.GetStar();
        const tagId = UnitUtil.trimSpaces(parser2.GetArgument(name));
        parser2.tags.tag(tagId, star);
        parser2.Push(parser2.itemFactory.create("null"));
      },
      HandleNoTag: BaseMethods_default.HandleNoTag,
      HandleRef: BaseMethods_default.HandleRef,
      Macro: BaseMethods_default.Macro,
      Accent: BaseMethods_default.Accent,
      Tilde: BaseMethods_default.Tilde,
      Array: BaseMethods_default.Array,
      Spacer: BaseMethods_default.Spacer,
      NamedOp: BaseMethods_default.NamedOp,
      EqnArray: BaseMethods_default.EqnArray,
      Equation: BaseMethods_default.Equation
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/ams/AmsMappings.js
var init_AmsMappings = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/ams/AmsMappings.js"() {
    init_AmsMethods();
    init_TokenMap();
    init_TexConstants();
    init_ParseMethods();
    init_ParseUtil();
    init_MmlNode();
    init_lengths();
    new CharacterMap("AMSmath-mathchar0mo", ParseMethods_default.mathchar0mo, {
      iiiint: ["⨌", { texClass: TEXCLASS.OP }]
    });
    new RegExpMap("AMSmath-operatorLetter", AmsMethods.operatorLetter, /[-*]/i);
    new CommandMap("AMSmath-macros", {
      mathring: [AmsMethods.Accent, "02DA"],
      nobreakspace: AmsMethods.Tilde,
      negmedspace: [AmsMethods.Spacer, MATHSPACE.negativemediummathspace],
      negthickspace: [AmsMethods.Spacer, MATHSPACE.negativethickmathspace],
      idotsint: [AmsMethods.MultiIntegral, "\\int\\cdots\\int"],
      dddot: [AmsMethods.Accent, "20DB"],
      ddddot: [AmsMethods.Accent, "20DC"],
      sideset: AmsMethods.SideSet,
      boxed: [AmsMethods.Macro, "\\fbox{$\\displaystyle{#1}$}", 1],
      tag: AmsMethods.HandleTag,
      notag: AmsMethods.HandleNoTag,
      eqref: [AmsMethods.HandleRef, true],
      substack: [AmsMethods.Macro, "\\begin{subarray}{c}#1\\end{subarray}", 1],
      injlim: [AmsMethods.NamedOp, "inj&thinsp;lim"],
      projlim: [AmsMethods.NamedOp, "proj&thinsp;lim"],
      varliminf: [AmsMethods.Macro, "\\mathop{\\underline{\\mmlToken{mi}{lim}}}"],
      varlimsup: [AmsMethods.Macro, "\\mathop{\\overline{\\mmlToken{mi}{lim}}}"],
      varinjlim: [
        AmsMethods.Macro,
        "\\mathop{\\underrightarrow{\\mmlToken{mi}{lim}}}"
      ],
      varprojlim: [
        AmsMethods.Macro,
        "\\mathop{\\underleftarrow{\\mmlToken{mi}{lim}}}"
      ],
      DeclareMathOperator: AmsMethods.HandleDeclareOp,
      operatorname: AmsMethods.HandleOperatorName,
      genfrac: AmsMethods.Genfrac,
      frac: [AmsMethods.Genfrac, "", "", "", ""],
      tfrac: [AmsMethods.Genfrac, "", "", "", "1"],
      dfrac: [AmsMethods.Genfrac, "", "", "", "0"],
      binom: [AmsMethods.Genfrac, "(", ")", "0", ""],
      tbinom: [AmsMethods.Genfrac, "(", ")", "0", "1"],
      dbinom: [AmsMethods.Genfrac, "(", ")", "0", "0"],
      cfrac: AmsMethods.CFrac,
      shoveleft: [AmsMethods.HandleShove, TexConstant.Align.LEFT],
      shoveright: [AmsMethods.HandleShove, TexConstant.Align.RIGHT],
      xrightarrow: [AmsMethods.xArrow, 8594, 5, 10],
      xleftarrow: [AmsMethods.xArrow, 8592, 10, 5]
    });
    new EnvironmentMap("AMSmath-environment", ParseMethods_default.environment, {
      "equation*": [AmsMethods.Equation, null, false],
      "eqnarray*": [
        AmsMethods.EqnArray,
        null,
        false,
        true,
        "rcl",
        "bmt",
        ParseUtil.cols(0, MATHSPACE.thickmathspace),
        ".5em"
      ],
      align: [
        AmsMethods.EqnArray,
        null,
        true,
        true,
        "rl",
        "bt",
        ParseUtil.cols(0, 2)
      ],
      "align*": [
        AmsMethods.EqnArray,
        null,
        false,
        true,
        "rl",
        "bt",
        ParseUtil.cols(0, 2)
      ],
      multline: [AmsMethods.Multline, null, true],
      "multline*": [AmsMethods.Multline, null, false],
      split: [
        AmsMethods.EqnArray,
        null,
        false,
        false,
        "rl",
        "bt",
        ParseUtil.cols(0)
      ],
      gather: [AmsMethods.EqnArray, null, true, true, "c", "m"],
      "gather*": [AmsMethods.EqnArray, null, false, true, "c", "m"],
      alignat: [AmsMethods.AlignAt, null, true, true],
      "alignat*": [AmsMethods.AlignAt, null, false, true],
      alignedat: [AmsMethods.AlignAt, null, false, false],
      aligned: [
        AmsMethods.AmsEqnArray,
        null,
        null,
        null,
        "rl",
        "bt",
        ParseUtil.cols(0, 2),
        ".5em",
        "D"
      ],
      gathered: [
        AmsMethods.AmsEqnArray,
        null,
        null,
        null,
        "c",
        "m",
        null,
        ".5em",
        "D"
      ],
      xalignat: [AmsMethods.XalignAt, null, true, true],
      "xalignat*": [AmsMethods.XalignAt, null, false, true],
      xxalignat: [AmsMethods.XalignAt, null, false, false],
      flalign: [
        AmsMethods.FlalignArray,
        null,
        true,
        false,
        true,
        "rlc",
        "btm",
        "auto auto fit"
      ],
      "flalign*": [
        AmsMethods.FlalignArray,
        null,
        false,
        false,
        true,
        "rlc",
        "btm",
        "auto auto fit"
      ],
      subarray: [
        AmsMethods.Array,
        null,
        null,
        null,
        null,
        ParseUtil.cols(0),
        "0.1em",
        "S",
        true
      ],
      smallmatrix: [
        AmsMethods.Array,
        null,
        null,
        null,
        "c",
        ParseUtil.cols(1 / 3),
        ".2em",
        "S",
        true
      ],
      matrix: [AmsMethods.Array, null, null, null, "c"],
      pmatrix: [AmsMethods.Array, null, "(", ")", "c"],
      bmatrix: [AmsMethods.Array, null, "[", "]", "c"],
      Bmatrix: [AmsMethods.Array, null, "\\{", "\\}", "c"],
      vmatrix: [AmsMethods.Array, null, "\\vert", "\\vert", "c"],
      Vmatrix: [AmsMethods.Array, null, "\\Vert", "\\Vert", "c"],
      cases: [AmsMethods.Array, null, "\\{", ".", "ll", null, ".2em", "T"]
    });
    new DelimiterMap("AMSmath-delimiter", ParseMethods_default.delimiter, {
      "\\lvert": ["|", { texClass: TEXCLASS.OPEN }],
      "\\rvert": ["|", { texClass: TEXCLASS.CLOSE }],
      "\\lVert": ["‖", { texClass: TEXCLASS.OPEN }],
      "\\rVert": ["‖", { texClass: TEXCLASS.CLOSE }]
    });
    new CharacterMap("AMSsymbols-mathchar0mi", ParseMethods_default.mathchar0mi, {
      digamma: "ϝ",
      varkappa: "ϰ",
      varGamma: ["Γ", { mathvariant: TexConstant.Variant.ITALIC }],
      varDelta: ["Δ", { mathvariant: TexConstant.Variant.ITALIC }],
      varTheta: ["Θ", { mathvariant: TexConstant.Variant.ITALIC }],
      varLambda: ["Λ", { mathvariant: TexConstant.Variant.ITALIC }],
      varXi: ["Ξ", { mathvariant: TexConstant.Variant.ITALIC }],
      varPi: ["Π", { mathvariant: TexConstant.Variant.ITALIC }],
      varSigma: ["Σ", { mathvariant: TexConstant.Variant.ITALIC }],
      varUpsilon: ["Υ", { mathvariant: TexConstant.Variant.ITALIC }],
      varPhi: ["Φ", { mathvariant: TexConstant.Variant.ITALIC }],
      varPsi: ["Ψ", { mathvariant: TexConstant.Variant.ITALIC }],
      varOmega: ["Ω", { mathvariant: TexConstant.Variant.ITALIC }],
      beth: "ℶ",
      gimel: "ℷ",
      daleth: "ℸ",
      backprime: ["‵", { variantForm: true }],
      hslash: "ℏ",
      varnothing: ["∅", { variantForm: true }],
      blacktriangle: "▴",
      triangledown: ["▽", { variantForm: true }],
      blacktriangledown: "▾",
      square: "◻",
      Box: "◻",
      blacksquare: "◼",
      lozenge: "◊",
      Diamond: "◊",
      blacklozenge: "⧫",
      circledS: ["Ⓢ", { mathvariant: TexConstant.Variant.NORMAL }],
      bigstar: "★",
      sphericalangle: "∢",
      measuredangle: "∡",
      nexists: "∄",
      complement: "∁",
      mho: "℧",
      eth: ["ð", { mathvariant: TexConstant.Variant.NORMAL }],
      Finv: "Ⅎ",
      diagup: "╱",
      Game: "⅁",
      diagdown: "╲",
      Bbbk: ["k", { mathvariant: TexConstant.Variant.DOUBLESTRUCK }],
      yen: "¥",
      circledR: "®",
      checkmark: "✓",
      maltese: "✠"
    });
    new CharacterMap("AMSsymbols-mathchar0mo", ParseMethods_default.mathchar0mo, JSON.parse(`{
 "dotplus":"∔",
 "ltimes":"⋉",
 "smallsetminus":["∖",{"variantForm":true}],
 "rtimes":"⋊",
 "Cap":"⋒",
 "doublecap":"⋒",
 "leftthreetimes":"⋋",
 "Cup":"⋓",
 "doublecup":"⋓",
 "rightthreetimes":"⋌",
 "barwedge":"⊼",
 "curlywedge":"⋏",
 "veebar":"⊻",
 "curlyvee":"⋎",
 "doublebarwedge":"⩞",
 "boxminus":"⊟",
 "circleddash":"⊝",
 "boxtimes":"⊠",
 "circledast":"⊛",
 "boxdot":"⊡",
 "circledcirc":"⊚",
 "boxplus":"⊞",
 "centerdot":["⋅",{"variantForm":true}],
 "divideontimes":"⋇",
 "intercal":"⊺",
 "leqq":"≦",
 "geqq":"≧",
 "leqslant":"⩽",
 "geqslant":"⩾",
 "eqslantless":"⪕",
 "eqslantgtr":"⪖",
 "lesssim":"≲",
 "gtrsim":"≳",
 "lessapprox":"⪅",
 "gtrapprox":"⪆",
 "approxeq":"≊",
 "lessdot":"⋖",
 "gtrdot":"⋗",
 "lll":"⋘",
 "llless":"⋘",
 "ggg":"⋙",
 "gggtr":"⋙",
 "lessgtr":"≶",
 "gtrless":"≷",
 "lesseqgtr":"⋚",
 "gtreqless":"⋛",
 "lesseqqgtr":"⪋",
 "gtreqqless":"⪌",
 "doteqdot":"≑",
 "Doteq":"≑",
 "eqcirc":"≖",
 "risingdotseq":"≓",
 "circeq":"≗",
 "fallingdotseq":"≒",
 "triangleq":"≜",
 "backsim":"∽",
 "thicksim":["∼",{"variantForm":true}],
 "backsimeq":"⋍",
 "thickapprox":["≈",{"variantForm":true}],
 "subseteqq":"⫅",
 "supseteqq":"⫆",
 "Subset":"⋐",
 "Supset":"⋑",
 "sqsubset":"⊏",
 "sqsupset":"⊐",
 "preccurlyeq":"≼",
 "succcurlyeq":"≽",
 "curlyeqprec":"⋞",
 "curlyeqsucc":"⋟",
 "precsim":"≾",
 "succsim":"≿",
 "precapprox":"⪷",
 "succapprox":"⪸",
 "vartriangleleft":"⊲",
 "lhd":"⊲",
 "vartriangleright":"⊳",
 "rhd":"⊳",
 "trianglelefteq":"⊴",
 "unlhd":"⊴",
 "trianglerighteq":"⊵",
 "unrhd":"⊵",
 "vDash":"⊨",
 "Vdash":"⊩",
 "Vvdash":"⊪",
 "smallsmile":["⌣",{"variantForm":true}],
 "shortmid":["∣",{"variantForm":true}],
 "smallfrown":["⌢",{"variantForm":true}],
 "shortparallel":["∥",{"variantForm":true}],
 "bumpeq":"≏",
 "between":"≬",
 "Bumpeq":"≎",
 "pitchfork":"⋔",
 "varpropto":["∝",{"variantForm":true}],
 "backepsilon":"∍",
 "blacktriangleleft":"◂",
 "blacktriangleright":"▸",
 "therefore":"∴",
 "because":"∵",
 "eqsim":"≂",
 "vartriangle":["△",{"variantForm":true}],
 "Join":"⋈",
 "nless":"≮",
 "ngtr":"≯",
 "nleq":"≰",
 "ngeq":"≱",
 "nleqslant":["⪇",{"variantForm":true}],
 "ngeqslant":["⪈",{"variantForm":true}],
 "nleqq":["≰",{"variantForm":true}],
 "ngeqq":["≱",{"variantForm":true}],
 "lneq":"⪇",
 "gneq":"⪈",
 "lneqq":"≨",
 "gneqq":"≩",
 "lvertneqq":["≨",{"variantForm":true}],
 "gvertneqq":["≩",{"variantForm":true}],
 "lnsim":"⋦",
 "gnsim":"⋧",
 "lnapprox":"⪉",
 "gnapprox":"⪊",
 "nprec":"⊀",
 "nsucc":"⊁",
 "npreceq":["⋠",{"variantForm":true}],
 "nsucceq":["⋡",{"variantForm":true}],
 "precneqq":"⪵",
 "succneqq":"⪶",
 "precnsim":"⋨",
 "succnsim":"⋩",
 "precnapprox":"⪹",
 "succnapprox":"⪺",
 "nsim":"≁",
 "ncong":"≇",
 "nshortmid":["∤",{"variantForm":true}],
 "nshortparallel":["∦",{"variantForm":true}],
 "nmid":"∤",
 "nparallel":"∦",
 "nvdash":"⊬",
 "nvDash":"⊭",
 "nVdash":"⊮",
 "nVDash":"⊯",
 "ntriangleleft":"⋪",
 "ntriangleright":"⋫",
 "ntrianglelefteq":"⋬",
 "ntrianglerighteq":"⋭",
 "nsubseteq":"⊈",
 "nsupseteq":"⊉",
 "nsubseteqq":["⊈",{"variantForm":true}],
 "nsupseteqq":["⊉",{"variantForm":true}],
 "subsetneq":"⊊",
 "supsetneq":"⊋",
 "varsubsetneq":["⊊",{"variantForm":true}],
 "varsupsetneq":["⊋",{"variantForm":true}],
 "subsetneqq":"⫋",
 "supsetneqq":"⫌",
 "varsubsetneqq":["⫋",{"variantForm":true}],
 "varsupsetneqq":["⫌",{"variantForm":true}],
 "leftleftarrows":"⇇",
 "rightrightarrows":"⇉",
 "leftrightarrows":"⇆",
 "rightleftarrows":"⇄",
 "Lleftarrow":"⇚",
 "Rrightarrow":"⇛",
 "twoheadleftarrow":"↞",
 "twoheadrightarrow":"↠",
 "leftarrowtail":"↢",
 "rightarrowtail":"↣",
 "looparrowleft":"↫",
 "looparrowright":"↬",
 "leftrightharpoons":"⇋",
 "rightleftharpoons":["⇌",{"variantForm":true}],
 "curvearrowleft":"↶",
 "curvearrowright":"↷",
 "circlearrowleft":"↺",
 "circlearrowright":"↻",
 "Lsh":"↰",
 "Rsh":"↱",
 "upuparrows":"⇈",
 "downdownarrows":"⇊",
 "upharpoonleft":"↿",
 "upharpoonright":"↾",
 "downharpoonleft":"⇃",
 "restriction":"↾",
 "multimap":"⊸",
 "downharpoonright":"⇂",
 "leftrightsquigarrow":"↭",
 "rightsquigarrow":"⇝",
 "leadsto":"⇝",
 "dashrightarrow":"⇢",
 "dashleftarrow":"⇠",
 "nleftarrow":"↚",
 "nrightarrow":"↛",
 "nLeftarrow":"⇍",
 "nRightarrow":"⇏",
 "nleftrightarrow":"↮",
 "nLeftrightarrow":"⇎"
}`));
    new DelimiterMap("AMSsymbols-delimiter", ParseMethods_default.delimiter, {
      "\\ulcorner": "⌜",
      "\\urcorner": "⌝",
      "\\llcorner": "⌞",
      "\\lrcorner": "⌟"
    });
    new CommandMap("AMSsymbols-macros", {
      implies: [AmsMethods.Macro, "\\;\\Longrightarrow\\;"],
      impliedby: [AmsMethods.Macro, "\\;\\Longleftarrow\\;"]
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/newcommand/NewcommandItems.js
var BeginEnvItem;
var init_NewcommandItems = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/newcommand/NewcommandItems.js"() {
    init_TexError();
    init_StackItem();
    BeginEnvItem = class extends BaseItem {
      get kind() {
        return "beginEnv";
      }
      get isOpen() {
        return true;
      }
      checkItem(item) {
        if (item.isKind("end")) {
          if (item.getName() !== this.getName()) {
            throw new TexError_default("EnvBadEnd", "\\begin{%1} ended with \\end{%2}", this.getName(), item.getName());
          }
          return [[this.factory.create("mml", this.toMml())], true];
        }
        if (item.isKind("stop")) {
          throw new TexError_default("EnvMissingEnd", "Missing \\end{%1}", this.getName());
        }
        return super.checkItem(item);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/newcommand/NewcommandMethods.js
var NewcommandMethods;
var NewcommandMethods_default;
var init_NewcommandMethods = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/newcommand/NewcommandMethods.js"() {
    init_HandlerTypes();
    init_TexError();
    init_TokenMap();
    init_BaseMethods();
    init_ParseUtil();
    init_UnitUtil();
    init_NewcommandUtil();
    NewcommandMethods = {
      NewCommand(parser2, name) {
        const cs = NewcommandUtil.GetCsNameArgument(parser2, name);
        const n = NewcommandUtil.GetArgCount(parser2, name);
        const opt = parser2.GetBrackets(name);
        const def2 = parser2.GetArgument(name);
        NewcommandUtil.addMacro(parser2, cs, NewcommandMethods.Macro, [def2, n, opt]);
        parser2.Push(parser2.itemFactory.create("null"));
      },
      NewEnvironment(parser2, name) {
        const env = UnitUtil.trimSpaces(parser2.GetArgument(name));
        const n = NewcommandUtil.GetArgCount(parser2, name);
        const opt = parser2.GetBrackets(name);
        const bdef = parser2.GetArgument(name);
        const edef = parser2.GetArgument(name);
        NewcommandUtil.addEnvironment(parser2, env, NewcommandMethods.BeginEnv, [
          true,
          bdef,
          edef,
          n,
          opt
        ]);
        parser2.Push(parser2.itemFactory.create("null"));
      },
      MacroDef(parser2, name) {
        const cs = NewcommandUtil.GetCSname(parser2, name);
        const params = NewcommandUtil.GetTemplate(parser2, name, "\\" + cs);
        const def2 = parser2.GetArgument(name);
        !(params instanceof Array) ? NewcommandUtil.addMacro(parser2, cs, NewcommandMethods.Macro, [
          def2,
          params
        ]) : NewcommandUtil.addMacro(parser2, cs, NewcommandMethods.MacroWithTemplate, [def2].concat(params));
        parser2.Push(parser2.itemFactory.create("null"));
      },
      Let(parser2, name) {
        const cs = NewcommandUtil.GetCSname(parser2, name);
        let c = parser2.GetNext();
        if (c === "=") {
          parser2.i++;
          c = parser2.GetNext();
        }
        const handlers = parser2.configuration.handlers;
        parser2.Push(parser2.itemFactory.create("null"));
        if (c === "\\") {
          name = NewcommandUtil.GetCSname(parser2, name);
          if (cs === name) {
            return;
          }
          const map = handlers.get(HandlerType.MACRO).applicable(name);
          if (map instanceof MacroMap) {
            const macro3 = map.lookup(name);
            NewcommandUtil.addMacro(parser2, cs, macro3.func, macro3.args, macro3.token);
            return;
          }
          if (map instanceof CharacterMap && !(map instanceof DelimiterMap)) {
            const macro3 = map.lookup(name);
            const method = (p) => map.parser(p, macro3);
            NewcommandUtil.addMacro(parser2, cs, method, [cs, macro3.char]);
            return;
          }
          const macro2 = handlers.get(HandlerType.DELIMITER).lookup("\\" + name);
          if (macro2) {
            NewcommandUtil.addDelimiter(parser2, "\\" + cs, macro2.char, macro2.attributes);
            return;
          }
          NewcommandUtil.checkProtectedMacros(parser2, cs);
          NewcommandUtil.undefineMacro(parser2, cs);
          NewcommandUtil.undefineDelimiter(parser2, "\\" + cs);
          return;
        }
        parser2.i++;
        const macro = handlers.get(HandlerType.DELIMITER).lookup(c);
        if (macro) {
          NewcommandUtil.addDelimiter(parser2, "\\" + cs, macro.char, macro.attributes);
          return;
        }
        NewcommandUtil.addMacro(parser2, cs, NewcommandMethods.Macro, [c]);
      },
      MacroWithTemplate(parser2, name, text, n, ...params) {
        const argCount = parseInt(n, 10);
        if (params.length) {
          const args = [];
          parser2.GetNext();
          if (params[0] && !NewcommandUtil.MatchParam(parser2, params[0])) {
            throw new TexError_default("MismatchUseDef", "Use of %1 doesn't match its definition", name);
          }
          if (argCount) {
            for (let i2 = 0; i2 < argCount; i2++) {
              args.push(NewcommandUtil.GetParameter(parser2, name, params[i2 + 1]));
            }
            text = ParseUtil.substituteArgs(parser2, args, text);
          }
        }
        parser2.string = ParseUtil.addArgs(parser2, text, parser2.string.slice(parser2.i));
        parser2.i = 0;
        ParseUtil.checkMaxMacros(parser2);
      },
      BeginEnv(parser2, begin, bdef, edef, n, def2) {
        const name = begin.getName();
        if (parser2.stack.env["closing"] === name) {
          delete parser2.stack.env["closing"];
          const beginN = parser2.stack.global["beginEnv"];
          if (beginN) {
            parser2.stack.global["beginEnv"]--;
            if (edef) {
              const rest = parser2.string.slice(parser2.i);
              parser2.string = ParseUtil.addArgs(parser2, parser2.string.substring(0, parser2.i), edef);
              parser2.Parse();
              parser2.string = rest;
              parser2.i = 0;
            }
          }
          return parser2.itemFactory.create("end").setProperty("name", name);
        }
        if (n) {
          const args = [];
          if (def2 != null) {
            const optional = parser2.GetBrackets(`\\begin{${name}}`);
            args.push(optional == null ? def2 : optional);
          }
          for (let i2 = args.length; i2 < n; i2++) {
            args.push(parser2.GetArgument(`\\begin{${name}}`));
          }
          bdef = ParseUtil.substituteArgs(parser2, args, bdef);
          edef = ParseUtil.substituteArgs(parser2, [], edef);
        }
        parser2.string = ParseUtil.addArgs(parser2, bdef, parser2.string.slice(parser2.i));
        parser2.i = 0;
        parser2.stack.global["beginEnv"] = (parser2.stack.global["beginEnv"] || 0) + 1;
        return parser2.itemFactory.create("beginEnv").setProperty("name", name);
      },
      Macro: BaseMethods_default.Macro
    };
    NewcommandMethods_default = NewcommandMethods;
  }
});
// node_modules/@mathjax/src/mjs/input/tex/newcommand/NewcommandMappings.js
var init_NewcommandMappings = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/newcommand/NewcommandMappings.js"() {
    init_NewcommandMethods();
    init_TokenMap();
    new CommandMap("Newcommand-macros", {
      newcommand: NewcommandMethods_default.NewCommand,
      renewcommand: NewcommandMethods_default.NewCommand,
      newenvironment: NewcommandMethods_default.NewEnvironment,
      renewenvironment: NewcommandMethods_default.NewEnvironment,
      def: NewcommandMethods_default.MacroDef,
      let: NewcommandMethods_default.Let
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/newcommand/NewcommandConfiguration.js
function NewcommandConfig(_config, jax) {
  if (jax.parseOptions.packageData.has("newcommand")) {
    return;
  }
  jax.parseOptions.packageData.set("newcommand", {});
  new DelimiterMap(NewcommandTables.NEW_DELIMITER, ParseMethods_default.delimiter, {});
  new CommandMap(NewcommandTables.NEW_COMMAND, {});
  new EnvironmentMap(NewcommandTables.NEW_ENVIRONMENT, ParseMethods_default.environment, {});
  jax.parseOptions.handlers.add({
    [HandlerType.CHARACTER]: [],
    [HandlerType.DELIMITER]: [NewcommandTables.NEW_DELIMITER],
    [HandlerType.MACRO]: [
      NewcommandTables.NEW_DELIMITER,
      NewcommandTables.NEW_COMMAND
    ],
    [HandlerType.ENVIRONMENT]: [NewcommandTables.NEW_ENVIRONMENT]
  }, {}, NewcommandPriority);
}
var NewcommandConfiguration;
var init_NewcommandConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/newcommand/NewcommandConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_NewcommandItems();
    init_NewcommandUtil();
    init_NewcommandMappings();
    init_ParseMethods();
    init_TokenMap();
    NewcommandConfiguration = Configuration.create("newcommand", {
      [ConfigurationType.HANDLER]: {
        macro: ["Newcommand-macros"]
      },
      [ConfigurationType.ITEMS]: {
        [BeginEnvItem.prototype.kind]: BeginEnvItem
      },
      [ConfigurationType.OPTIONS]: {
        maxMacros: 1e3,
        protectedMacros: ["begingroupSandbox"]
      },
      [ConfigurationType.CONFIG]: NewcommandConfig
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/ams/AmsConfiguration.js
var AmsTags;
var AmsConfiguration;
var init_AmsConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/ams/AmsConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_AmsItems();
    init_Tags();
    init_AmsMappings();
    init_NewcommandConfiguration();
    AmsTags = class extends AbstractTags {
    };
    AmsConfiguration = Configuration.create("ams", {
      [ConfigurationType.HANDLER]: {
        [HandlerType.CHARACTER]: ["AMSmath-operatorLetter"],
        [HandlerType.DELIMITER]: ["AMSsymbols-delimiter", "AMSmath-delimiter"],
        [HandlerType.MACRO]: [
          "AMSsymbols-mathchar0mi",
          "AMSsymbols-mathchar0mo",
          "AMSsymbols-delimiter",
          "AMSsymbols-macros",
          "AMSmath-mathchar0mo",
          "AMSmath-macros",
          "AMSmath-delimiter"
        ],
        [HandlerType.ENVIRONMENT]: ["AMSmath-environment"]
      },
      [ConfigurationType.ITEMS]: {
        [MultlineItem.prototype.kind]: MultlineItem,
        [FlalignItem.prototype.kind]: FlalignItem
      },
      [ConfigurationType.TAGS]: { ams: AmsTags },
      [ConfigurationType.OPTIONS]: {
        multlineWidth: "",
        ams: {
          operatornamePattern: /^[-*a-zA-Z0-9]+/,
          multlineWidth: "100%",
          multlineIndent: "1em"
        }
      },
      [ConfigurationType.CONFIG]: NewcommandConfig
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/boldsymbol/BoldsymbolConfiguration.js
function createBoldToken(factory, kind, def2, text) {
  const token2 = NodeFactory.createToken(factory, kind, def2, text);
  if (kind !== "mtext" && factory.configuration.parser.stack.env["boldsymbol"]) {
    NodeUtil_default.setProperty(token2, "fixBold", true);
    factory.configuration.addNode("fixBold", token2);
  }
  return token2;
}
function rewriteBoldTokens(arg) {
  for (const node of arg.data.getList("fixBold")) {
    if (NodeUtil_default.getProperty(node, "fixBold")) {
      const variant = NodeUtil_default.getAttribute(node, "mathvariant");
      NodeUtil_default.setAttribute(node, "mathvariant", BOLDVARIANT[variant] || variant);
      NodeUtil_default.removeProperties(node, "fixBold");
    }
  }
}
var BOLDVARIANT;
var BoldsymbolMethods;
var BoldsymbolConfiguration;
var init_BoldsymbolConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/boldsymbol/BoldsymbolConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_NodeUtil();
    init_TexConstants();
    init_TokenMap();
    init_NodeFactory2();
    BOLDVARIANT = {};
    BOLDVARIANT[TexConstant.Variant.NORMAL] = TexConstant.Variant.BOLD;
    BOLDVARIANT[TexConstant.Variant.ITALIC] = TexConstant.Variant.BOLDITALIC;
    BOLDVARIANT[TexConstant.Variant.FRAKTUR] = TexConstant.Variant.BOLDFRAKTUR;
    BOLDVARIANT[TexConstant.Variant.SCRIPT] = TexConstant.Variant.BOLDSCRIPT;
    BOLDVARIANT[TexConstant.Variant.SANSSERIF] = TexConstant.Variant.BOLDSANSSERIF;
    BOLDVARIANT["-tex-calligraphic"] = "-tex-bold-calligraphic";
    BOLDVARIANT["-tex-oldstyle"] = "-tex-bold-oldstyle";
    BOLDVARIANT["-tex-mathit"] = TexConstant.Variant.BOLDITALIC;
    BoldsymbolMethods = {
      Boldsymbol(parser2, name) {
        const boldsymbol = parser2.stack.env["boldsymbol"];
        parser2.stack.env["boldsymbol"] = true;
        const mml = parser2.ParseArg(name);
        parser2.stack.env["boldsymbol"] = boldsymbol;
        parser2.Push(mml);
      }
    };
    new CommandMap("boldsymbol", { boldsymbol: BoldsymbolMethods.Boldsymbol });
    BoldsymbolConfiguration = Configuration.create("boldsymbol", {
      [ConfigurationType.HANDLER]: { [HandlerType.MACRO]: ["boldsymbol"] },
      [ConfigurationType.NODES]: { token: createBoldToken },
      [ConfigurationType.POSTPROCESSORS]: [rewriteBoldTokens]
    });
  }
});
export{init_NewcommandUtil,NewcommandUtil,init_AmsMethods,init_NewcommandMethods,NewcommandTables,AmsMethods,NewcommandMethods_default,init_AmsItems,MultlineItem,NewcommandConfig,init_NewcommandConfiguration,init_svg,MathJaxNewcmFont,SVG,init_svg2,init_AmsConfiguration,init_BoldsymbolConfiguration};
