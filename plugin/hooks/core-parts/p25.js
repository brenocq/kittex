import{__esm,init_StackItem,init_MmlNode,init_ParseUtil,init_lengths,em,MATHSPACE,BaseItem,ParseUtil,TEXCLASS,init_BaseMethods,BaseMethods_default,init_TokenMap,CommandMap,MacroMap,init_HandlerTypes,init_Configuration,Configuration,ConfigurationType,HandlerType,init_TexConstants,TexConstant,init_NodeUtil,NodeUtil_default,init_TexError,TexError_default,init_BaseItems,init_UnitUtil,init_TexParser,init_Options,init_NewcommandUtil,lookup,EqnArrayItem,NewcommandUtil,UnitUtil,TexParser,init_AmsMethods,init_Token,init_NewcommandMethods,init_PrioritizedList,PrioritizedList,length2em,NewcommandTables,Macro,AmsMethods,NewcommandMethods_default,init_ParseMethods,EnvironmentMap,ParseMethods_default,DelimiterMap,TagsFactory,init_Tags,init_AmsItems,MultlineItem,NewcommandConfig,init_NewcommandConfiguration,expandable,NodeFactory,init_NodeFactory2}from'./p24.js';export*from'./p24.js';
// node_modules/@mathjax/src/mjs/input/tex/braket/BraketItems.js
var THINSPACE;
var BraketItem;
var init_BraketItems = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/braket/BraketItems.js"() {
    init_StackItem();
    init_MmlNode();
    init_ParseUtil();
    init_lengths();
    THINSPACE = em(MATHSPACE.thinmathspace);
    BraketItem = class extends BaseItem {
      constructor() {
        super(...arguments);
        this.barNodes = [];
      }
      get kind() {
        return "braket";
      }
      get isOpen() {
        return true;
      }
      checkItem(item) {
        if (item.isKind("close")) {
          if (item.getProperty("braketbar")) {
            this.barNodes.push(...super.toMml(true, true).childNodes);
            this.Clear();
            return BaseItem.fail;
          }
          return [[this.factory.create("mml", this.toMml())], true];
        }
        if (item.isKind("mml")) {
          this.Push(item.toMml());
          if (this.getProperty("single")) {
            return [[this.toMml()], true];
          }
          return BaseItem.fail;
        }
        return super.checkItem(item);
      }
      toMml(inferred = true, forceRow) {
        let inner = super.toMml(inferred, forceRow);
        if (!inferred) {
          return inner;
        }
        const open = this.getProperty("open");
        const close = this.getProperty("close");
        if (this.barNodes.length) {
          inner = this.create("node", "inferredMrow", [...this.barNodes, inner]);
        }
        if (this.getProperty("stretchy")) {
          if (this.getProperty("space")) {
            inner = this.create("node", "inferredMrow", [
              this.create("token", "mspace", { width: THINSPACE }),
              inner,
              this.create("token", "mspace", { width: THINSPACE })
            ]);
          }
          return ParseUtil.fenced(this.factory.configuration, open, inner, close);
        }
        const attrs = {
          fence: true,
          stretchy: false,
          symmetric: true,
          texClass: TEXCLASS.OPEN
        };
        const openNode = this.create("token", "mo", attrs, open);
        attrs.texClass = TEXCLASS.CLOSE;
        const closeNode = this.create("token", "mo", attrs, close);
        const mrow = this.create("node", "mrow", [openNode, inner, closeNode], {
          open,
          close
        });
        return mrow;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/braket/BraketMethods.js
var BraketMethods;
var BraketMethods_default;
var init_BraketMethods = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/braket/BraketMethods.js"() {
    init_BaseMethods();
    init_MmlNode();
    BraketMethods = {
      Braket(parser2, name, open, close, stretchy, barmax, space = false) {
        const i2 = parser2.i;
        parser2.GetArgument(name);
        parser2.i = i2;
        const next = parser2.GetNext();
        let single2 = true;
        if (next === "{") {
          parser2.i++;
          single2 = false;
        }
        const node = parser2.itemFactory.create("braket");
        node.setProperties({
          barcount: 0,
          barmax,
          open,
          close,
          stretchy,
          single: single2,
          space
        });
        parser2.Push(node);
        node.env.braketItem = parser2.stack.height - 1;
      },
      Bar(parser2, name) {
        let c = name === "|" ? "|" : "‖";
        const n = parser2.stack.height - parser2.stack.env.braketItem;
        const top = parser2.stack.Top(n);
        if (!top || !top.isKind("braket") || top.getProperty("barcount") >= top.getProperty("barmax")) {
          return false;
        }
        if (c === "|" && parser2.GetNext() === "|") {
          parser2.i++;
          c = "‖";
        }
        if (!top.getProperty("stretchy")) {
          const node = parser2.create("token", "mo", { stretchy: false, "data-braketbar": true, texClass: TEXCLASS.ORD }, c);
          parser2.Push(node);
          return true;
        }
        const close = parser2.itemFactory.create("close").setProperty("braketbar", true);
        parser2.Push(close);
        top.barNodes.push(parser2.create("node", "TeXAtom", [], { texClass: TEXCLASS.CLOSE }), parser2.create("token", "mo", { stretchy: true, "data-braketbar": true, texClass: TEXCLASS.BIN }, c), parser2.create("node", "TeXAtom", [], { texClass: TEXCLASS.OPEN }));
        top.setProperty("barcount", top.getProperty("barcount") + 1);
        return true;
      },
      Macro: BaseMethods_default.Macro
    };
    BraketMethods_default = BraketMethods;
  }
});
// node_modules/@mathjax/src/mjs/input/tex/braket/BraketMappings.js
var init_BraketMappings = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/braket/BraketMappings.js"() {
    init_TokenMap();
    init_BraketMethods();
    new CommandMap("Braket-macros", {
      bra: [BraketMethods_default.Macro, "{\\langle {#1} \\vert}", 1],
      ket: [BraketMethods_default.Macro, "{\\vert {#1} \\rangle}", 1],
      braket: [BraketMethods_default.Braket, "⟨", "⟩", false, Infinity],
      set: [BraketMethods_default.Braket, "{", "}", false, 1],
      Bra: [BraketMethods_default.Macro, "{\\left\\langle {#1} \\right\\vert}", 1],
      Ket: [BraketMethods_default.Macro, "{\\left\\vert {#1} \\right\\rangle}", 1],
      Braket: [BraketMethods_default.Braket, "⟨", "⟩", true, Infinity],
      Set: [BraketMethods_default.Braket, "{", "}", true, 1, true],
      ketbra: [
        BraketMethods_default.Macro,
        "{\\vert {#1} \\rangle\\langle {#2} \\vert}",
        2
      ],
      Ketbra: [
        BraketMethods_default.Macro,
        "{\\left\\vert {#1} \\right\\rangle\\left\\langle {#2} \\right\\vert}",
        2
      ],
      "|": BraketMethods_default.Bar
    });
    new MacroMap("Braket-characters", {
      "|": BraketMethods_default.Bar
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/braket/BraketConfiguration.js
var BraketConfiguration;
var init_BraketConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/braket/BraketConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_BraketItems();
    init_BraketMappings();
    BraketConfiguration = Configuration.create("braket", {
      [ConfigurationType.HANDLER]: {
        [HandlerType.CHARACTER]: ["Braket-characters"],
        [HandlerType.MACRO]: ["Braket-macros"]
      },
      [ConfigurationType.ITEMS]: {
        [BraketItem.prototype.kind]: BraketItem
      },
      [ConfigurationType.PRIORITY]: 3
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/enclose/EncloseConfiguration.js
var ENCLOSE_OPTIONS;
var EncloseMethods;
var EncloseConfiguration;
var init_EncloseConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/enclose/EncloseConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_TokenMap();
    init_ParseUtil();
    ENCLOSE_OPTIONS = {
      "data-arrowhead": 1,
      color: 1,
      mathcolor: 1,
      background: 1,
      mathbackground: 1,
      "data-padding": 1,
      "data-thickness": 1
    };
    EncloseMethods = {
      Enclose(parser2, name) {
        const notation = parser2.GetArgument(name).replace(/,/g, " ");
        const attr = parser2.GetBrackets(name, "");
        const math = parser2.ParseArg(name);
        const def2 = ParseUtil.keyvalOptions(attr, ENCLOSE_OPTIONS);
        def2.notation = notation;
        parser2.Push(parser2.create("node", "menclose", [math], def2));
      }
    };
    new CommandMap("enclose", { enclose: EncloseMethods.Enclose });
    EncloseConfiguration = Configuration.create("enclose", {
      [ConfigurationType.HANDLER]: { [HandlerType.MACRO]: ["enclose"] }
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/cancel/CancelConfiguration.js
var CancelMethods;
var CancelConfiguration;
var init_CancelConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/cancel/CancelConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_TexConstants();
    init_TokenMap();
    init_ParseUtil();
    init_EncloseConfiguration();
    CancelMethods = {
      Cancel(parser2, name, notation) {
        const attr = parser2.GetBrackets(name, "");
        const math = parser2.ParseArg(name);
        const def2 = ParseUtil.keyvalOptions(attr, ENCLOSE_OPTIONS);
        def2["notation"] = notation;
        parser2.Push(parser2.create("node", "menclose", [math], def2));
      },
      CancelTo(parser2, name) {
        const attr = parser2.GetBrackets(name, "");
        let value = parser2.ParseArg(name);
        const math = parser2.ParseArg(name);
        const def2 = ParseUtil.keyvalOptions(attr, ENCLOSE_OPTIONS);
        def2["notation"] = [
          TexConstant.Notation.UPDIAGONALSTRIKE,
          TexConstant.Notation.UPDIAGONALARROW,
          TexConstant.Notation.NORTHEASTARROW
        ].join(" ");
        value = parser2.create("node", "mpadded", [value], {
          depth: "-.1em",
          height: "+.1em",
          voffset: ".1em"
        });
        parser2.Push(parser2.create("node", "msup", [
          parser2.create("node", "menclose", [math], def2),
          value
        ]));
      }
    };
    new CommandMap("cancel", {
      cancel: [CancelMethods.Cancel, TexConstant.Notation.UPDIAGONALSTRIKE],
      bcancel: [CancelMethods.Cancel, TexConstant.Notation.DOWNDIAGONALSTRIKE],
      xcancel: [
        CancelMethods.Cancel,
        TexConstant.Notation.UPDIAGONALSTRIKE + " " + TexConstant.Notation.DOWNDIAGONALSTRIKE
      ],
      cancelto: CancelMethods.CancelTo
    });
    CancelConfiguration = Configuration.create("cancel", {
      [ConfigurationType.HANDLER]: { [HandlerType.MACRO]: ["cancel"] }
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/color/ColorMethods.js
function padding(colorPadding) {
  const pad2 = `+${colorPadding}`;
  const unit = colorPadding.replace(/^.*?([a-z]*)$/, "$1");
  const pad22 = 2 * parseFloat(pad2);
  return {
    width: `+${pad22}${unit}`,
    height: pad2,
    depth: pad2,
    lspace: colorPadding
  };
}
var ColorMethods;
var init_ColorMethods = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/color/ColorMethods.js"() {
    init_NodeUtil();
    init_ParseUtil();
    ColorMethods = {
      Color(parser2, name) {
        const model = parser2.GetBrackets(name, "");
        const colorDef = parser2.GetArgument(name);
        const colorModel = parser2.configuration.packageData.get("color").model;
        const color = colorModel.getColor(model, colorDef);
        const style = parser2.itemFactory.create("style").setProperties({ styles: { mathcolor: color } });
        parser2.stack.env["color"] = color;
        parser2.Push(style);
      },
      TextColor(parser2, name) {
        const model = parser2.GetBrackets(name, "");
        const colorDef = parser2.GetArgument(name);
        const colorModel = parser2.configuration.packageData.get("color").model;
        const color = colorModel.getColor(model, colorDef);
        const old = parser2.stack.env["color"];
        parser2.stack.env["color"] = color;
        const math = parser2.ParseArg(name);
        if (old) {
          parser2.stack.env["color"] = old;
        } else {
          delete parser2.stack.env["color"];
        }
        const node = parser2.create("node", "mstyle", [math], { mathcolor: color });
        parser2.Push(node);
      },
      DefineColor(parser2, name) {
        const cname = parser2.GetArgument(name);
        const model = parser2.GetArgument(name);
        const def2 = parser2.GetArgument(name);
        const colorModel = parser2.configuration.packageData.get("color").model;
        colorModel.defineColor(model, cname, def2);
        parser2.Push(parser2.itemFactory.create("null"));
      },
      ColorBox(parser2, name) {
        const model = parser2.GetBrackets(name, "");
        const cdef = parser2.GetArgument(name);
        const math = ParseUtil.internalMath(parser2, parser2.GetArgument(name));
        const colorModel = parser2.configuration.packageData.get("color").model;
        const node = parser2.create("node", "mpadded", math, {
          mathbackground: colorModel.getColor(model, cdef)
        });
        NodeUtil_default.setProperties(node, padding(parser2.options.color.padding));
        parser2.Push(node);
      },
      FColorBox(parser2, name) {
        const fmodel = parser2.GetBrackets(name, "");
        const fname = parser2.GetArgument(name);
        const cmodel = parser2.GetBrackets(name, fmodel);
        const cname = parser2.GetArgument(name);
        const math = ParseUtil.internalMath(parser2, parser2.GetArgument(name));
        const options3 = parser2.options.color;
        const colorModel = parser2.configuration.packageData.get("color").model;
        const node = parser2.create("node", "mpadded", math, {
          mathbackground: colorModel.getColor(cmodel, cname),
          style: `border: ${options3.borderWidth} solid ${colorModel.getColor(fmodel, fname)}`
        });
        NodeUtil_default.setProperties(node, padding(options3.padding));
        parser2.Push(node);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/color/ColorConstants.js
var COLORS;
var init_ColorConstants = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/color/ColorConstants.js"() {
    COLORS = /* @__PURE__ */ new Map(JSON.parse(`[
 ["Apricot","#FBB982"],["Aquamarine","#00B5BE"],["Bittersweet","#C04F17"],["Black","#221E1F"],["Blue","#2D2F92"],["BlueGreen","#00B3B8"],["BlueViolet","#473992"],["BrickRed","#B6321C"],
 ["Brown","#792500"],["BurntOrange","#F7921D"],["CadetBlue","#74729A"],["CarnationPink","#F282B4"],["Cerulean","#00A2E3"],["CornflowerBlue","#41B0E4"],["Cyan","#00AEEF"],["Dandelion","#FDBC42"],
 ["DarkOrchid","#A4538A"],["Emerald","#00A99D"],["ForestGreen","#009B55"],["Fuchsia","#8C368C"],["Goldenrod","#FFDF42"],["Gray","#949698"],["Green","#00A64F"],["GreenYellow","#DFE674"],
 ["JungleGreen","#00A99A"],["Lavender","#F49EC4"],["LimeGreen","#8DC73E"],["Magenta","#EC008C"],["Mahogany","#A9341F"],["Maroon","#AF3235"],["Melon","#F89E7B"],["MidnightBlue","#006795"],
 ["Mulberry","#A93C93"],["NavyBlue","#006EB8"],["OliveGreen","#3C8031"],["Orange","#F58137"],["OrangeRed","#ED135A"],["Orchid","#AF72B0"],["Peach","#F7965A"],["Periwinkle","#7977B8"],
 ["PineGreen","#008B72"],["Plum","#92268F"],["ProcessBlue","#00B0F0"],["Purple","#99479B"],["RawSienna","#974006"],["Red","#ED1B23"],["RedOrange","#F26035"],["RedViolet","#A1246B"],
 ["Rhodamine","#EF559F"],["RoyalBlue","#0071BC"],["RoyalPurple","#613F99"],["RubineRed","#ED017D"],["Salmon","#F69289"],["SeaGreen","#3FBC9D"],["Sepia","#671800"],["SkyBlue","#46C5DD"],
 ["SpringGreen","#C6DC67"],["Tan","#DA9D76"],["TealBlue","#00AEB3"],["Thistle","#D883B7"],["Turquoise","#00B4CE"],["Violet","#58429B"],["VioletRed","#EF58A0"],["White","#FFFFFF"],
 ["WildStrawberry","#EE2967"],["Yellow","#FFF200"],["YellowGreen","#98CC70"],["YellowOrange","#FAA21A"]
]`));
  }
});
// node_modules/@mathjax/src/mjs/input/tex/color/ColorUtil.js
var ColorModelProcessors;
var ColorModel;
var init_ColorUtil = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/color/ColorUtil.js"() {
    init_TexError();
    init_ColorConstants();
    ColorModelProcessors = /* @__PURE__ */ new Map();
    ColorModel = class {
      constructor() {
        this.userColors = /* @__PURE__ */ new Map();
      }
      normalizeColor(model, def2) {
        if (!model || model === "named") {
          if (def2.match(/;/)) {
            throw new TexError_default("BadColorValue", "Invalid color value");
          }
          return def2;
        }
        if (ColorModelProcessors.has(model)) {
          const modelProcessor = ColorModelProcessors.get(model);
          return modelProcessor(def2);
        }
        throw new TexError_default("UndefinedColorModel", "Color model '%1' not defined", model);
      }
      getColor(model, def2) {
        if (!model || model === "named") {
          return this.getColorByName(def2);
        }
        return this.normalizeColor(model, def2);
      }
      getColorByName(name) {
        if (this.userColors.has(name)) {
          return this.userColors.get(name);
        }
        if (COLORS.has(name)) {
          return COLORS.get(name);
        }
        if (name.match(/;/)) {
          throw new TexError_default("BadColorValue", "Invalid color value");
        }
        return name;
      }
      defineColor(model, name, def2) {
        const normalized = this.normalizeColor(model, def2);
        this.userColors.set(name, normalized);
      }
    };
    ColorModelProcessors.set("rgb", function(rgb) {
      const rgbParts = rgb.trim().split(/\s*,\s*/);
      let RGB = "#";
      if (rgbParts.length !== 3) {
        throw new TexError_default("ModelArg1", "Color values for the %1 model require 3 numbers", "rgb");
      }
      for (const rgbPart of rgbParts) {
        if (!rgbPart.match(/^(\d+(\.\d*)?|\.\d+)$/)) {
          throw new TexError_default("InvalidDecimalNumber", "Invalid decimal number");
        }
        const n = parseFloat(rgbPart);
        if (n < 0 || n > 1) {
          throw new TexError_default("ModelArg2", "Color values for the %1 model must be between %2 and %3", "rgb", "0", "1");
        }
        let pn = Math.floor(n * 255).toString(16);
        if (pn.length < 2) {
          pn = "0" + pn;
        }
        RGB += pn;
      }
      return RGB;
    });
    ColorModelProcessors.set("RGB", function(rgb) {
      const rgbParts = rgb.trim().split(/\s*,\s*/);
      let RGB = "#";
      if (rgbParts.length !== 3) {
        throw new TexError_default("ModelArg1", "Color values for the %1 model require 3 numbers", "RGB");
      }
      for (const rgbPart of rgbParts) {
        if (!rgbPart.match(/^\d+$/)) {
          throw new TexError_default("InvalidNumber", "Invalid number");
        }
        const n = parseInt(rgbPart);
        if (n > 255) {
          throw new TexError_default("ModelArg2", "Color values for the %1 model must be between %2 and %3", "RGB", "0", "255");
        }
        let pn = n.toString(16);
        if (pn.length < 2) {
          pn = "0" + pn;
        }
        RGB += pn;
      }
      return RGB;
    });
    ColorModelProcessors.set("gray", function(gray) {
      if (!gray.match(/^\s*(\d+(\.\d*)?|\.\d+)\s*$/)) {
        throw new TexError_default("InvalidDecimalNumber", "Invalid decimal number");
      }
      const n = parseFloat(gray);
      if (n < 0 || n > 1) {
        throw new TexError_default("ModelArg2", "Color values for the %1 model must be between %2 and %3", "gray", "0", "1");
      }
      let pn = Math.floor(n * 255).toString(16);
      if (pn.length < 2) {
        pn = "0" + pn;
      }
      return `#${pn}${pn}${pn}`;
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/color/ColorConfiguration.js
var config;
var ColorConfiguration;
var init_ColorConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/color/ColorConfiguration.js"() {
    init_HandlerTypes();
    init_TokenMap();
    init_Configuration();
    init_ColorMethods();
    init_ColorUtil();
    new CommandMap("color", {
      color: ColorMethods.Color,
      textcolor: ColorMethods.TextColor,
      definecolor: ColorMethods.DefineColor,
      colorbox: ColorMethods.ColorBox,
      fcolorbox: ColorMethods.FColorBox
    });
    config = function(_config, jax) {
      jax.parseOptions.packageData.set("color", { model: new ColorModel() });
    };
    ColorConfiguration = Configuration.create("color", {
      [ConfigurationType.HANDLER]: {
        [HandlerType.MACRO]: ["color"]
      },
      [ConfigurationType.OPTIONS]: {
        color: {
          padding: "5px",
          borderWidth: "2px"
        }
      },
      [ConfigurationType.CONFIG]: config
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/mathtools/MathtoolsUtil.js
var MathtoolsUtil;
var init_MathtoolsUtil = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/mathtools/MathtoolsUtil.js"() {
    init_BaseItems();
    init_UnitUtil();
    init_TexParser();
    init_TexError();
    init_Options();
    init_HandlerTypes();
    init_NewcommandUtil();
    init_MathtoolsMethods();
    MathtoolsUtil = {
      setDisplayLevel(mml, style) {
        if (!style)
          return;
        const [display, script2] = lookup(style, {
          "\\displaystyle": [true, 0],
          "\\textstyle": [false, 0],
          "\\scriptstyle": [false, 1],
          "\\scriptscriptstyle": [false, 2]
        }, [null, null]);
        if (display !== null) {
          mml.attributes.set("displaystyle", display);
          mml.attributes.set("scriptlevel", script2);
        }
      },
      checkAlignment(parser2, name) {
        const top = parser2.stack.Top();
        if (top.kind !== EqnArrayItem.prototype.kind) {
          throw new TexError_default("NotInAlignment", "%1 can only be used in aligment environments", name);
        }
        return top;
      },
      addPairedDelims(parser2, cs, args) {
        if (parser2.configuration.handlers.get(HandlerType.MACRO).contains(cs)) {
          throw new TexError_default("CommadExists", "Command %1 already defined", `\\${cs}`);
        }
        NewcommandUtil.addMacro(parser2, cs, MathtoolsMethods.PairedDelimiters, args);
      },
      spreadLines(mtable, spread) {
        if (!mtable.isKind("mtable"))
          return;
        let rowspacing = mtable.attributes.get("rowspacing");
        const add = UnitUtil.dimen2em(spread);
        rowspacing = rowspacing.split(/ /).map((s) => UnitUtil.em(Math.max(0, UnitUtil.dimen2em(s) + add))).join(" ");
        mtable.attributes.set("rowspacing", rowspacing);
      },
      plusOrMinus(name, n) {
        n = n.trim();
        if (!n.match(/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/)) {
          throw new TexError_default("NotANumber", "Argument to %1 is not a number", name);
        }
        return n.match(/^[-+]/) ? n : "+" + n;
      },
      getScript(parser2, name, pos) {
        let arg = UnitUtil.trimSpaces(parser2.GetArgument(name));
        if (arg === "") {
          return parser2.create("node", "none");
        }
        const format = parser2.options.mathtools[`prescript-${pos}-format`];
        if (format) {
          arg = `${format}{${arg}}`;
        }
        const mml = new TexParser(arg, parser2.stack.env, parser2.configuration).mml();
        return mml.isKind("TeXAtom") && mml.isEmpty ? parser2.create("node", "none") : mml;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/mathtools/MathtoolsMethods.js
var LEGACYCONFIG;
var LEGACYPRIORITY;
var MathtoolsMethods;
var init_MathtoolsMethods = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/mathtools/MathtoolsMethods.js"() {
    init_ParseUtil();
    init_UnitUtil();
    init_AmsMethods();
    init_BaseMethods();
    init_TexParser();
    init_TexError();
    init_NodeUtil();
    init_MmlNode();
    init_lengths();
    init_Options();
    init_HandlerTypes();
    init_Token();
    init_NewcommandUtil();
    init_NewcommandMethods();
    init_PrioritizedList();
    init_MathtoolsUtil();
    LEGACYCONFIG = {
      [HandlerType.MACRO]: ["mathtools-legacycolonsymbols"]
    };
    LEGACYPRIORITY = PrioritizedList.DEFAULTPRIORITY - 1;
    MathtoolsMethods = {
      MtMatrix(parser2, begin, open, close) {
        const align = parser2.GetBrackets(`\\begin{${begin.getName()}}`, "c");
        return MathtoolsMethods.Array(parser2, begin, open, close, align);
      },
      MtSmallMatrix(parser2, begin, open, close, align) {
        if (!align) {
          align = parser2.GetBrackets(`\\begin{${begin.getName()}}`, parser2.options.mathtools["smallmatrix-align"]);
        }
        return MathtoolsMethods.Array(parser2, begin, open, close, align, UnitUtil.em(1 / 3), ".2em", "S", 1);
      },
      MtMultlined(parser2, begin) {
        const name = `\\begin{${begin.getName()}}`;
        let pos = parser2.options.mathtools["multlined-pos"] || "c";
        let width = parser2.options.mathtools["multlined-width"] || "";
        if (!parser2.nextIsSpace()) {
          const arg = parser2.GetBrackets(name, pos);
          if (arg.match(/^[ctb]$/)) {
            pos = arg;
            width = !parser2.nextIsSpace() ? parser2.GetBrackets(name, "") : "";
          } else {
            width = arg;
          }
          if (width && !UnitUtil.matchDimen(width)[0]) {
            throw new TexError_default("BadWidth", "Width for %1 must be a dimension", name);
          }
        }
        parser2.Push(begin);
        const item = parser2.itemFactory.create("multlined", parser2, begin);
        item.arraydef = {
          displaystyle: true,
          rowspacing: ".5em",
          width: width || "auto",
          columnwidth: "100%"
        };
        return ParseUtil.setArrayAlign(item, pos);
      },
      HandleShove(parser2, name, shove) {
        const top = parser2.stack.Top();
        if (top.kind !== "multline" && top.kind !== "multlined") {
          throw new TexError_default("CommandInMultlined", "%1 can only appear within the multline or multlined environments", name);
        }
        if (top.Size()) {
          throw new TexError_default("CommandAtTheBeginingOfLine", "%1 must come at the beginning of the line", name);
        }
        top.setProperty("shove", shove);
        const shift = parser2.GetBrackets(name);
        let mml = parser2.ParseArg(name);
        if (shift) {
          const mrow = parser2.create("node", "mrow", []);
          const mspace = parser2.create("node", "mspace", [], { width: shift });
          if (shove === "left") {
            mrow.appendChild(mspace);
            mrow.appendChild(mml);
          } else {
            mrow.appendChild(mml);
            mrow.appendChild(mspace);
          }
          mml = mrow;
        }
        parser2.Push(mml);
      },
      SpreadLines(parser2, begin) {
        if (parser2.stack.env.closing === begin.getName()) {
          delete parser2.stack.env.closing;
          const top = parser2.stack.Pop();
          const mml = top.toMml();
          const spread = top.getProperty("spread");
          if (mml.isInferred) {
            for (const child of NodeUtil_default.getChildren(mml)) {
              MathtoolsUtil.spreadLines(child, spread);
            }
          } else {
            MathtoolsUtil.spreadLines(mml, spread);
          }
          parser2.Push(mml);
        } else {
          const spread = parser2.GetDimen(`\\begin{${begin.getName()}}`);
          begin.setProperty("spread", spread);
          begin.setProperty("nestStart", true);
          ParseUtil.checkEqnEnv(parser2);
          parser2.Push(begin);
        }
      },
      Cases(parser2, begin, open, close, style) {
        const array = parser2.itemFactory.create("array").setProperty("casesEnv", begin.getName());
        array.arraydef = {
          rowspacing: ".2em",
          columnspacing: "1em",
          columnalign: "left"
        };
        if (style === "D") {
          array.arraydef.displaystyle = true;
        }
        array.setProperties({ open, close });
        parser2.Push(begin);
        return array;
      },
      MathLap(parser2, name, pos, cramped) {
        const style = parser2.GetBrackets(name, "").trim();
        const mml = parser2.create("node", "mstyle", [
          parser2.create("node", "mpadded", [parser2.ParseArg(name)], Object.assign({ width: 0 }, pos === "r" ? {} : { lspace: pos === "l" ? "-1width" : "-.5width" }))
        ], { "data-cramped": cramped });
        MathtoolsUtil.setDisplayLevel(mml, style);
        parser2.Push(parser2.create("node", "TeXAtom", [mml]));
      },
      Cramped(parser2, name) {
        const style = parser2.GetBrackets(name, "").trim();
        const arg = parser2.ParseArg(name);
        const mml = parser2.create("node", "mstyle", [arg], {
          "data-cramped": true
        });
        MathtoolsUtil.setDisplayLevel(mml, style);
        parser2.Push(mml);
      },
      MtLap(parser2, name, pos) {
        const content = ParseUtil.internalMath(parser2, parser2.GetArgument(name), 0);
        const mml = parser2.create("node", "mpadded", content, { width: 0 });
        if (pos !== "r") {
          NodeUtil_default.setAttribute(mml, "lspace", pos === "l" ? "-1width" : "-.5width");
        }
        parser2.Push(mml);
      },
      MathMakeBox(parser2, name) {
        const width = parser2.GetBrackets(name);
        const pos = parser2.GetBrackets(name, "c");
        const mml = parser2.create("node", "mpadded", [parser2.ParseArg(name)]);
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
      MathMBox(parser2, name) {
        parser2.Push(parser2.create("node", "mrow", [parser2.ParseArg(name)]));
      },
      UnderOverBracket(parser2, name) {
        const thickness = length2em(parser2.GetBrackets(name, ".1em"), 0.1);
        const height2 = parser2.GetBrackets(name, ".2em");
        const arg = parser2.GetArgument(name);
        const [pos, accent, border] = name.charAt(1) === "o" ? ["over", "accent", "bottom"] : ["under", "accentunder", "top"];
        const t = em(thickness);
        const base = new TexParser(arg, parser2.stack.env, parser2.configuration).mml();
        const copy2 = new TexParser(arg, parser2.stack.env, parser2.configuration).mml();
        const script2 = parser2.create("node", "mpadded", [parser2.create("node", "mphantom", [copy2])], {
          style: `border: ${t} solid; border-${border}: none`,
          height: height2,
          depth: 0
        });
        const node = ParseUtil.underOver(parser2, base, script2, pos, true);
        const munderover = NodeUtil_default.getChildAt(NodeUtil_default.getChildAt(node, 0), 0);
        NodeUtil_default.setAttribute(munderover, accent, true);
        parser2.Push(node);
      },
      Aboxed(parser2, name, box = "boxed", math = true) {
        const top = MathtoolsUtil.checkAlignment(parser2, name);
        if (top.row.length % 2 === 1) {
          top.row.push(parser2.create("node", "mtd", []));
        }
        const arg = parser2.GetArgument(name);
        const rest = parser2.string.substring(parser2.i);
        parser2.string = arg + "&&\\endAboxed";
        parser2.i = 0;
        const left = parser2.GetUpTo(name, "&");
        const right = parser2.GetUpTo(name, "&");
        parser2.GetUpTo(name, "\\endAboxed");
        const [bmath, emath] = math ? ["", ""] : ["$\\displaystyle{", "}$"];
        const tex = ParseUtil.substituteArgs(parser2, [left, right], `\\rlap{\\${box}{${bmath}#1{}#2${emath}}}\\kern.267em\\phantom{#1}&\\phantom{{}#2}\\kern.267em`);
        parser2.string = tex + rest;
        parser2.i = 0;
      },
      MakeAboxedCommand(parser2, name) {
        const star = parser2.GetStar();
        const cs = NewcommandUtil.GetCSname(parser2, name);
        const box = NewcommandUtil.GetCSname(parser2, name + "\\" + cs);
        const handlers = parser2.configuration.handlers;
        if (handlers.get(HandlerType.MACRO).lookup(cs)) {
          throw new TexError_default("AlreadyDefined", "%1 is already defined", "\\" + cs);
        }
        const handler = handlers.retrieve(NewcommandTables.NEW_COMMAND);
        handler.add(cs, new Macro(cs, MathtoolsMethods.Aboxed, [box, star]));
        parser2.Push(parser2.itemFactory.create("null"));
      },
      ArrowBetweenLines(parser2, name) {
        const top = MathtoolsUtil.checkAlignment(parser2, name);
        if (top.Size() || top.row.length) {
          throw new TexError_default("BetweenLines", "%1 must be on a row by itself", name);
        }
        const star = parser2.GetStar();
        const symbol = parser2.GetBrackets(name, "\\Updownarrow");
        if (star) {
          top.EndEntry();
          top.EndEntry();
        }
        const tex = star ? "\\quad" + symbol : symbol + "\\quad";
        const mml = new TexParser(tex, parser2.stack.env, parser2.configuration).mml();
        parser2.Push(mml);
        top.EndEntry();
        top.EndRow();
      },
      VDotsWithin(parser2, name) {
        const arg = "\\mmlToken{mi}{}" + parser2.GetArgument(name) + "\\mmlToken{mi}{}";
        const base = new TexParser(arg, parser2.stack.env, parser2.configuration).mml();
        const mml = parser2.create("node", "mpadded", [
          parser2.create("node", "mpadded", [parser2.create("node", "mo", [parser2.create("text", "⋮")])], { width: 0, lspace: "-.5width" }),
          parser2.create("node", "mphantom", [base])
        ], {
          lspace: ".5width"
        });
        parser2.Push(mml);
      },
      ShortVDotsWithin(parser2, _name) {
        const top = parser2.stack.Top();
        const star = parser2.GetStar();
        if (top.EndEntry) {
          MathtoolsMethods.FlushSpaceAbove(parser2, "\\MTFlushSpaceAbove");
          if (!star) {
            top.EndEntry();
          }
        }
        MathtoolsMethods.VDotsWithin(parser2, "\\vdotswithin");
        if (top.EndEntry) {
          if (star) {
            top.EndEntry();
          }
          MathtoolsMethods.FlushSpaceBelow(parser2, "\\MTFlushSpaceBelow");
        }
      },
      FlushSpaceAbove(parser2, name) {
        const top = MathtoolsUtil.checkAlignment(parser2, name);
        if (top.table) {
          top.setProperty("flushspaceabove", top.table.length);
          top.addRowSpacing("-" + parser2.options.mathtools["shortvdotsadjustabove"]);
        }
      },
      FlushSpaceBelow(parser2, name) {
        const top = MathtoolsUtil.checkAlignment(parser2, name);
        if (top.table) {
          if (top.Size()) {
            top.EndEntry();
          }
          top.EndRow();
          top.addRowSpacing("-" + parser2.options.mathtools["shortvdotsadjustbelow"]);
        }
      },
      PairedDelimiters(parser2, name, open, close, body = "#1", n = 1, pre = "", post = "") {
        const star = parser2.GetStar();
        const size = star ? "" : parser2.GetBrackets(name);
        const [left, right, after] = star ? ["\\mathopen{\\left", "\\right", "}\\mathclose{}"] : size ? [size + "l", size + "r", ""] : ["", "", ""];
        const delim = star ? "\\middle" : size || "";
        if (n) {
          const args = [];
          for (let i2 = args.length; i2 < n; i2++) {
            args.push(parser2.GetArgument(name));
          }
          pre = ParseUtil.substituteArgs(parser2, args, pre);
          body = ParseUtil.substituteArgs(parser2, args, body);
          post = ParseUtil.substituteArgs(parser2, args, post);
        }
        body = body.replace(/\\delimsize/g, delim);
        parser2.string = [
          pre,
          left,
          open,
          body,
          right,
          close,
          after,
          post,
          parser2.string.substring(parser2.i)
        ].reduce((s, part) => ParseUtil.addArgs(parser2, s, part), "");
        parser2.i = 0;
        ParseUtil.checkMaxMacros(parser2);
      },
      DeclarePairedDelimiter(parser2, name) {
        const cs = NewcommandUtil.GetCsNameArgument(parser2, name);
        const open = parser2.GetArgument(name);
        const close = parser2.GetArgument(name);
        MathtoolsUtil.addPairedDelims(parser2, cs, [open, close]);
        parser2.Push(parser2.itemFactory.create("null"));
      },
      DeclarePairedDelimiterX(parser2, name) {
        const cs = NewcommandUtil.GetCsNameArgument(parser2, name);
        const n = NewcommandUtil.GetArgCount(parser2, name);
        const open = parser2.GetArgument(name);
        const close = parser2.GetArgument(name);
        const body = parser2.GetArgument(name);
        MathtoolsUtil.addPairedDelims(parser2, cs, [open, close, body, n]);
        parser2.Push(parser2.itemFactory.create("null"));
      },
      DeclarePairedDelimiterXPP(parser2, name) {
        const cs = NewcommandUtil.GetCsNameArgument(parser2, name);
        const n = NewcommandUtil.GetArgCount(parser2, name);
        const pre = parser2.GetArgument(name);
        const open = parser2.GetArgument(name);
        const close = parser2.GetArgument(name);
        const post = parser2.GetArgument(name);
        const body = parser2.GetArgument(name);
        MathtoolsUtil.addPairedDelims(parser2, cs, [
          open,
          close,
          body,
          n,
          pre,
          post
        ]);
        parser2.Push(parser2.itemFactory.create("null"));
      },
      CenterColon(parser2, _name, center, force = false, thin = false) {
        const options3 = parser2.options.mathtools;
        let mml = parser2.create("token", "mo", {}, ":");
        if (center && (options3["centercolon"] || force)) {
          const dy = options3["centercolon-offset"];
          mml = parser2.create("node", "mpadded", [mml], Object.assign({ voffset: dy, height: `+${dy}`, depth: `-${dy}` }, thin ? { width: options3["thincolon-dw"], lspace: options3["thincolon-dx"] } : {}));
        }
        parser2.Push(mml);
      },
      Relation(parser2, _name, tex, unicode) {
        const options3 = parser2.options.mathtools;
        if (options3["use-unicode"] && unicode) {
          parser2.Push(parser2.create("token", "mo", { texClass: TEXCLASS.REL }, unicode));
        } else {
          tex = "\\mathrel{" + tex.replace(/:/g, "\\MTThinColon").replace(/-/g, "\\mathrel{-}") + "}";
          parser2.string = ParseUtil.addArgs(parser2, tex, parser2.string.substring(parser2.i));
          parser2.i = 0;
        }
      },
      NArrow(parser2, _name, c, dy) {
        parser2.Push(parser2.create("node", "TeXAtom", [
          parser2.create("token", "mtext", {}, c),
          parser2.create("node", "mpadded", [
            parser2.create("node", "mpadded", [
              parser2.create("node", "menclose", [
                parser2.create("node", "mspace", [], {
                  height: ".2em",
                  depth: 0,
                  width: ".4em"
                })
              ], {
                notation: "updiagonalstrike",
                "data-thickness": ".05em",
                "data-padding": 0
              })
            ], { width: 0, lspace: "-.5width", voffset: dy }),
            parser2.create("node", "mphantom", [
              parser2.create("token", "mtext", {}, c)
            ])
          ], { width: 0, lspace: "-.5width" })
        ], { texClass: TEXCLASS.REL }));
      },
      SplitFrac(parser2, name, display) {
        const num3 = parser2.ParseArg(name);
        const den = parser2.ParseArg(name);
        parser2.Push(parser2.create("node", "mstyle", [
          parser2.create("node", "mfrac", [
            parser2.create("node", "mstyle", [
              num3,
              parser2.create("token", "mi"),
              parser2.create("token", "mspace", { width: "1em" })
            ], { scriptlevel: 0 }),
            parser2.create("node", "mstyle", [
              parser2.create("token", "mspace", { width: "1em" }),
              parser2.create("token", "mi"),
              den
            ], { scriptlevel: 0 })
          ], { linethickness: 0, numalign: "left", denomalign: "right" })
        ], { displaystyle: display, scriptlevel: 0 }));
      },
      XMathStrut(parser2, name) {
        let dd = parser2.GetBrackets(name);
        let dh = parser2.GetArgument(name);
        dh = MathtoolsUtil.plusOrMinus(name, dh);
        dd = MathtoolsUtil.plusOrMinus(name, dd || dh);
        parser2.Push(parser2.create("node", "TeXAtom", [
          parser2.create("node", "mpadded", [
            parser2.create("node", "mphantom", [
              parser2.create("token", "mo", { stretchy: false }, "(")
            ])
          ], { width: 0, height: dh + "height", depth: dd + "depth" })
        ], { texClass: TEXCLASS.ORD }));
      },
      Prescript(parser2, name) {
        const sup = MathtoolsUtil.getScript(parser2, name, "sup");
        const sub = MathtoolsUtil.getScript(parser2, name, "sub");
        const base = MathtoolsUtil.getScript(parser2, name, "arg");
        if (NodeUtil_default.isType(sup, "none") && NodeUtil_default.isType(sub, "none")) {
          parser2.Push(base);
          return;
        }
        const mml = parser2.create("node", "mmultiscripts", [base]);
        NodeUtil_default.getChildren(mml).push(null, null);
        NodeUtil_default.appendChildren(mml, [
          parser2.create("node", "mprescripts"),
          sub,
          sup
        ]);
        mml.setProperty("fixPrescript", true);
        parser2.Push(mml);
      },
      NewTagForm(parser2, name, renew = false) {
        const tags = parser2.tags;
        if (!("mtFormats" in tags)) {
          throw new TexError_default("TagsNotMT", "%1 can only be used with ams or mathtools tags", name);
        }
        const id = parser2.GetArgument(name).trim();
        if (!id) {
          throw new TexError_default("InvalidTagFormID", "Tag form name can't be empty");
        }
        const format = parser2.GetBrackets(name, "");
        const left = parser2.GetArgument(name);
        const right = parser2.GetArgument(name);
        if (!renew && tags.mtFormats.has(id)) {
          throw new TexError_default("DuplicateTagForm", "Duplicate tag form: %1", id);
        }
        tags.mtFormats.set(id, [left, right, format]);
        parser2.Push(parser2.itemFactory.create("null"));
      },
      UseTagForm(parser2, name) {
        const tags = parser2.tags;
        if (!("mtFormats" in tags)) {
          throw new TexError_default("TagsNotMT", "%1 can only be used with ams or mathtools tags", name);
        }
        const id = parser2.GetArgument(name).trim();
        if (!id) {
          tags.mtCurrent = null;
          parser2.Push(parser2.itemFactory.create("null"));
          return;
        }
        if (!tags.mtFormats.has(id)) {
          throw new TexError_default("UndefinedTagForm", "Undefined tag form: %1", id);
        }
        tags.mtCurrent = tags.mtFormats.get(id);
        parser2.Push(parser2.itemFactory.create("null"));
      },
      SetOptions(parser2, name) {
        const options3 = parser2.options.mathtools;
        if (!options3["allow-mathtoolsset"]) {
          throw new TexError_default("ForbiddenMathtoolsSet", "%1 is disabled", name);
        }
        const allowed = {};
        Object.keys(options3).forEach((id) => {
          if (id !== "pariedDelimiters" && id !== "tagforms" && id !== "allow-mathtoolsset") {
            allowed[id] = 1;
          }
        });
        const args = parser2.GetArgument(name);
        const keys2 = ParseUtil.keyvalOptions(args, allowed, true);
        for (const id of Object.keys(keys2)) {
          if (id === "legacycolonsymbols" && options3[id] !== keys2[id]) {
            if (options3[id]) {
              parser2.configuration.handlers.remove(LEGACYCONFIG, {});
            } else {
              parser2.configuration.handlers.add(LEGACYCONFIG, {}, LEGACYPRIORITY);
            }
          }
          options3[id] = keys2[id];
        }
        parser2.Push(parser2.itemFactory.create("null"));
      },
      Array: BaseMethods_default.Array,
      Macro: BaseMethods_default.Macro,
      xArrow: AmsMethods.xArrow,
      HandleRef: AmsMethods.HandleRef,
      AmsEqnArray: AmsMethods.AmsEqnArray,
      MacroWithTemplate: NewcommandMethods_default.MacroWithTemplate
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/mathtools/MathtoolsMappings.js
var init_MathtoolsMappings = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/mathtools/MathtoolsMappings.js"() {
    init_ParseMethods();
    init_TokenMap();
    init_TexConstants();
    init_MathtoolsMethods();
    new CommandMap("mathtools-macros", {
      shoveleft: [MathtoolsMethods.HandleShove, TexConstant.Align.LEFT],
      shoveright: [MathtoolsMethods.HandleShove, TexConstant.Align.RIGHT],
      xleftrightarrow: [MathtoolsMethods.xArrow, 8596, 10, 10],
      xLeftarrow: [MathtoolsMethods.xArrow, 8656, 12, 7],
      xRightarrow: [MathtoolsMethods.xArrow, 8658, 7, 12],
      xLeftrightarrow: [MathtoolsMethods.xArrow, 8660, 12, 12],
      xhookleftarrow: [MathtoolsMethods.xArrow, 8617, 10, 5],
      xhookrightarrow: [MathtoolsMethods.xArrow, 8618, 5, 10],
      xmapsto: [MathtoolsMethods.xArrow, 8614, 10, 10],
      xrightharpoondown: [MathtoolsMethods.xArrow, 8641, 5, 10],
      xleftharpoondown: [MathtoolsMethods.xArrow, 8637, 10, 5],
      xrightleftharpoons: [MathtoolsMethods.xArrow, 8652, 10, 10],
      xrightharpoonup: [MathtoolsMethods.xArrow, 8640, 5, 10],
      xleftharpoonup: [MathtoolsMethods.xArrow, 8636, 10, 5],
      xleftrightharpoons: [MathtoolsMethods.xArrow, 8651, 10, 10],
      xlongrightarrow: [MathtoolsMethods.xArrow, 10230, 7, 12, 1.45],
      xlongleftarrow: [MathtoolsMethods.xArrow, 10229, 12, 7, 1.45],
      xLongrightarrow: [MathtoolsMethods.xArrow, 10233, 7, 12, 1.45],
      xLongleftarrow: [MathtoolsMethods.xArrow, 10232, 12, 7, 1.45],
      mathllap: [MathtoolsMethods.MathLap, "l", false],
      mathrlap: [MathtoolsMethods.MathLap, "r", false],
      mathclap: [MathtoolsMethods.MathLap, "c", false],
      clap: [MathtoolsMethods.MtLap, "c"],
      textllap: [MathtoolsMethods.MtLap, "l"],
      textrlap: [MathtoolsMethods.MtLap, "r"],
      textclap: [MathtoolsMethods.MtLap, "c"],
      cramped: MathtoolsMethods.Cramped,
      crampedllap: [MathtoolsMethods.MathLap, "l", true],
      crampedrlap: [MathtoolsMethods.MathLap, "r", true],
      crampedclap: [MathtoolsMethods.MathLap, "c", true],
      crampedsubstack: [
        MathtoolsMethods.Macro,
        "\\begin{crampedsubarray}{c}#1\\end{crampedsubarray}",
        1
      ],
      mathmbox: MathtoolsMethods.MathMBox,
      mathmakebox: MathtoolsMethods.MathMakeBox,
      overbracket: MathtoolsMethods.UnderOverBracket,
      underbracket: MathtoolsMethods.UnderOverBracket,
      refeq: MathtoolsMethods.HandleRef,
      MoveEqLeft: [
        MathtoolsMethods.Macro,
        "\\hspace{#1em}&\\hspace{-#1em}",
        1,
        "2"
      ],
      Aboxed: MathtoolsMethods.Aboxed,
      MakeAboxedCommand: MathtoolsMethods.MakeAboxedCommand,
      ArrowBetweenLines: MathtoolsMethods.ArrowBetweenLines,
      vdotswithin: MathtoolsMethods.VDotsWithin,
      shortvdotswithin: MathtoolsMethods.ShortVDotsWithin,
      MTFlushSpaceAbove: MathtoolsMethods.FlushSpaceAbove,
      MTFlushSpaceBelow: MathtoolsMethods.FlushSpaceBelow,
      DeclarePairedDelimiter: MathtoolsMethods.DeclarePairedDelimiter,
      DeclarePairedDelimiterX: MathtoolsMethods.DeclarePairedDelimiterX,
      DeclarePairedDelimiterXPP: MathtoolsMethods.DeclarePairedDelimiterXPP,
      DeclarePairedDelimiters: MathtoolsMethods.DeclarePairedDelimiter,
      DeclarePairedDelimitersX: MathtoolsMethods.DeclarePairedDelimiterX,
      DeclarePairedDelimitersXPP: MathtoolsMethods.DeclarePairedDelimiterXPP,
      vcentercolon: [MathtoolsMethods.CenterColon, true, true],
      ordinarycolon: [MathtoolsMethods.CenterColon, false],
      MTThinColon: [MathtoolsMethods.CenterColon, true, true, true],
      coloneqq: [MathtoolsMethods.Relation, ":=", "≔"],
      Coloneqq: [MathtoolsMethods.Relation, "::=", "⩴"],
      coloneq: [MathtoolsMethods.Relation, ":=", "≔"],
      Coloneq: [MathtoolsMethods.Relation, "::=", "⩺"],
      eqqcolon: [MathtoolsMethods.Relation, "=:", "≕"],
      Eqqcolon: [MathtoolsMethods.Relation, "=::"],
      eqcolon: [MathtoolsMethods.Relation, "=:", "≕"],
      Eqcolon: [MathtoolsMethods.Relation, "=::"],
      colonapprox: [MathtoolsMethods.Relation, ":\\approx"],
      Colonapprox: [MathtoolsMethods.Relation, "::\\approx"],
      colonsim: [MathtoolsMethods.Relation, ":\\sim"],
      Colonsim: [MathtoolsMethods.Relation, "::\\sim"],
      dblcolon: [MathtoolsMethods.Relation, "::", "∷"],
      approxcolon: [MathtoolsMethods.Relation, "\\approx:"],
      Approxcolon: [MathtoolsMethods.Relation, "\\approx::"],
      simcolon: [MathtoolsMethods.Relation, "\\sim:"],
      Simcolon: [MathtoolsMethods.Relation, "\\sim::"],
      colondash: [MathtoolsMethods.Relation, ":-"],
      Colondash: [MathtoolsMethods.Relation, "::-"],
      dashcolon: [MathtoolsMethods.Relation, "-:", "∹"],
      Dashcolon: [MathtoolsMethods.Relation, "-::"],
      nuparrow: [MathtoolsMethods.NArrow, "↑", ".06em"],
      ndownarrow: [MathtoolsMethods.NArrow, "↓", ".25em"],
      bigtimes: [
        MathtoolsMethods.Macro,
        "\\mathop{\\Large\\kern-.1em\\boldsymbol{\\times}\\kern-.1em}"
      ],
      splitfrac: [MathtoolsMethods.SplitFrac, false],
      splitdfrac: [MathtoolsMethods.SplitFrac, true],
      xmathstrut: MathtoolsMethods.XMathStrut,
      prescript: MathtoolsMethods.Prescript,
      newtagform: [MathtoolsMethods.NewTagForm, false],
      renewtagform: [MathtoolsMethods.NewTagForm, true],
      usetagform: MathtoolsMethods.UseTagForm,
      adjustlimits: [
        MathtoolsMethods.MacroWithTemplate,
        "\\mathop{{#1}\\vphantom{{#3}}}_{{#2}\\vphantom{{#4}}}\\mathop{{#3}\\vphantom{{#1}}}_{{#4}\\vphantom{{#2}}}",
        4,
        ,
        "_",
        ,
        "_"
      ],
      mathtoolsset: MathtoolsMethods.SetOptions
    });
    new CommandMap("mathtools-legacycolonsymbols", {
      coloneq: [MathtoolsMethods.Relation, ":-"],
      Coloneq: [MathtoolsMethods.Relation, "::-"],
      eqcolon: [MathtoolsMethods.Relation, "-:", "∹"],
      Eqcolon: [MathtoolsMethods.Relation, "-::"]
    });
    new EnvironmentMap("mathtools-environments", ParseMethods_default.environment, {
      dcases: [MathtoolsMethods.Array, null, "\\{", "", "ll", null, ".2em", "D"],
      rcases: [MathtoolsMethods.Array, null, "", "\\}", "ll", null, ".2em"],
      drcases: [MathtoolsMethods.Array, null, "", "\\}", "ll", null, ".2em", "D"],
      "dcases*": [MathtoolsMethods.Cases, null, "{", "", "D"],
      "rcases*": [MathtoolsMethods.Cases, null, "", "}"],
      "drcases*": [MathtoolsMethods.Cases, null, "", "}", "D"],
      "cases*": [MathtoolsMethods.Cases, null, "{", ""],
      "matrix*": [MathtoolsMethods.MtMatrix, null, null, null],
      "pmatrix*": [MathtoolsMethods.MtMatrix, null, "(", ")"],
      "bmatrix*": [MathtoolsMethods.MtMatrix, null, "[", "]"],
      "Bmatrix*": [MathtoolsMethods.MtMatrix, null, "\\{", "\\}"],
      "vmatrix*": [MathtoolsMethods.MtMatrix, null, "\\vert", "\\vert"],
      "Vmatrix*": [MathtoolsMethods.MtMatrix, null, "\\Vert", "\\Vert"],
      "smallmatrix*": [MathtoolsMethods.MtSmallMatrix, null, null, null],
      psmallmatrix: [MathtoolsMethods.MtSmallMatrix, null, "(", ")", "c"],
      "psmallmatrix*": [MathtoolsMethods.MtSmallMatrix, null, "(", ")"],
      bsmallmatrix: [MathtoolsMethods.MtSmallMatrix, null, "[", "]", "c"],
      "bsmallmatrix*": [MathtoolsMethods.MtSmallMatrix, null, "[", "]"],
      Bsmallmatrix: [MathtoolsMethods.MtSmallMatrix, null, "\\{", "\\}", "c"],
      "Bsmallmatrix*": [MathtoolsMethods.MtSmallMatrix, null, "\\{", "\\}"],
      vsmallmatrix: [MathtoolsMethods.MtSmallMatrix, null, "\\vert", "\\vert", "c"],
      "vsmallmatrix*": [MathtoolsMethods.MtSmallMatrix, null, "\\vert", "\\vert"],
      Vsmallmatrix: [MathtoolsMethods.MtSmallMatrix, null, "\\Vert", "\\Vert", "c"],
      "Vsmallmatrix*": [MathtoolsMethods.MtSmallMatrix, null, "\\Vert", "\\Vert"],
      crampedsubarray: [
        MathtoolsMethods.Array,
        null,
        null,
        null,
        null,
        "0em",
        "0.1em",
        "S'",
        1
      ],
      multlined: MathtoolsMethods.MtMultlined,
      spreadlines: [MathtoolsMethods.SpreadLines, true],
      lgathered: [
        MathtoolsMethods.AmsEqnArray,
        null,
        null,
        null,
        "l",
        "t",
        null,
        ".5em",
        "D"
      ],
      rgathered: [
        MathtoolsMethods.AmsEqnArray,
        null,
        null,
        null,
        "r",
        "t",
        null,
        ".5em",
        "D"
      ]
    });
    new DelimiterMap("mathtools-delimiters", ParseMethods_default.delimiter, {
      "\\lparen": "(",
      "\\rparen": ")"
    });
    new CommandMap("mathtools-characters", {
      ":": [MathtoolsMethods.CenterColon, true]
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/mathtools/MathtoolsTags.js
function MathtoolsTagFormat(config2, jax) {
  const tags = jax.parseOptions.options.tags;
  if (tags !== "base" && Object.hasOwn(config2.tags, tags)) {
    TagsFactory.add(tags, config2.tags[tags]);
  }
  const TagClass = TagsFactory.create(jax.parseOptions.options.tags).constructor;
  class TagFormat extends TagClass {
    constructor() {
      super();
      this.mtFormats = /* @__PURE__ */ new Map();
      this.mtCurrent = null;
      const forms = jax.parseOptions.options.mathtools.tagforms;
      for (const form of Object.keys(forms)) {
        if (!Array.isArray(forms[form]) || forms[form].length !== 3) {
          throw new TexError_default("InvalidTagFormDef", 'The tag form definition for "%1" should be an array of three strings', form);
        }
        this.mtFormats.set(form, forms[form]);
      }
    }
    formatTag(tag3) {
      if (this.mtCurrent) {
        const [left, right, format] = this.mtCurrent;
        return [left, format ? `${format}{${tag3}}` : tag3, right];
      }
      return super.formatTag(tag3);
    }
  }
  tagID++;
  const tagName = "MathtoolsTags-" + tagID;
  TagsFactory.add(tagName, TagFormat);
  jax.parseOptions.options.tags = tagName;
}
var tagID;
var init_MathtoolsTags = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/mathtools/MathtoolsTags.js"() {
    init_TexError();
    init_Tags();
    tagID = 0;
  }
});
// node_modules/@mathjax/src/mjs/input/tex/mathtools/MathtoolsItems.js
var MultlinedItem;
var init_MathtoolsItems = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/mathtools/MathtoolsItems.js"() {
    init_AmsItems();
    init_NodeUtil();
    init_TexConstants();
    MultlinedItem = class extends MultlineItem {
      get kind() {
        return "multlined";
      }
      EndTable() {
        if (this.Size() || this.row.length) {
          this.EndEntry();
          this.EndRow();
        }
        if (this.table.length > 1) {
          const options3 = this.factory.configuration.options.mathtools;
          const gap2 = options3["multlined-gap"];
          const firstskip = options3["firstline-afterskip"] || gap2;
          const lastskip = options3["lastline-preskip"] || gap2;
          const first = NodeUtil_default.getChildren(this.table[0])[0];
          if (NodeUtil_default.getAttribute(first, "columnalign") !== TexConstant.Align.RIGHT) {
            first.appendChild(this.create("node", "mspace", [], { width: firstskip }));
          }
          const last = NodeUtil_default.getChildren(this.table[this.table.length - 1])[0];
          if (NodeUtil_default.getAttribute(last, "columnalign") !== TexConstant.Align.LEFT) {
            const top = NodeUtil_default.getChildren(last)[0];
            top.childNodes.unshift(null);
            const space = this.create("node", "mspace", [], { width: lastskip });
            NodeUtil_default.setChild(top, 0, space);
          }
        }
        super.EndTable.call(this);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/mathtools/MathtoolsConfiguration.js
function configMathtools(config2, jax) {
  NewcommandConfig(config2, jax);
  const parser2 = jax.parseOptions;
  const pairedDelims = parser2.options.mathtools.pairedDelimiters;
  const handler = config2.handlers.retrieve(NewcommandTables.NEW_COMMAND);
  for (const [cs, args] of Object.entries(pairedDelims)) {
    handler.add(cs, new Macro(cs, MathtoolsMethods.PairedDelimiters, args));
  }
  if (parser2.options.mathtools.legacycolonsymbols) {
    config2.handlers.add(LEGACYCONFIG, {}, LEGACYPRIORITY);
  }
  MathtoolsTagFormat(config2, jax);
}
function fixPrescripts({ data }) {
  for (const node of data.getList("mmultiscripts")) {
    if (!node.getProperty("fixPrescript"))
      continue;
    const childNodes = NodeUtil_default.getChildren(node);
    let n = 0;
    for (const i2 of [1, 2]) {
      if (!childNodes[i2]) {
        NodeUtil_default.setChild(node, i2, data.nodeFactory.create("node", "none"));
        n++;
      }
    }
    if (n === 2) {
      childNodes.splice(1, 2);
    }
  }
}
var MathtoolsConfiguration;
var init_MathtoolsConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/mathtools/MathtoolsConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_Token();
    init_NodeUtil();
    init_Options();
    init_NewcommandConfiguration();
    init_NewcommandUtil();
    init_MathtoolsMappings();
    init_MathtoolsMethods();
    init_MathtoolsTags();
    init_MathtoolsItems();
    MathtoolsConfiguration = Configuration.create("mathtools", {
      [ConfigurationType.HANDLER]: {
        macro: ["mathtools-macros", "mathtools-delimiters"],
        [HandlerType.ENVIRONMENT]: ["mathtools-environments"],
        [HandlerType.DELIMITER]: ["mathtools-delimiters"],
        [HandlerType.CHARACTER]: ["mathtools-characters"]
      },
      [ConfigurationType.ITEMS]: {
        [MultlinedItem.prototype.kind]: MultlinedItem
      },
      [ConfigurationType.CONFIG]: configMathtools,
      [ConfigurationType.POSTPROCESSORS]: [[fixPrescripts, -6]],
      [ConfigurationType.OPTIONS]: {
        mathtools: {
          "multlined-gap": "1em",
          "multlined-pos": "c",
          "multlined-width": "",
          "firstline-afterskip": "",
          "lastline-preskip": "",
          "smallmatrix-align": "c",
          "shortvdotsadjustabove": ".2em",
          "shortvdotsadjustbelow": ".2em",
          "centercolon": false,
          "centercolon-offset": ".04em",
          "thincolon-dx": "-.04em",
          "thincolon-dw": "-.08em",
          "use-unicode": false,
          "legacycolonsymbols": false,
          "prescript-sub-format": "",
          "prescript-sup-format": "",
          "prescript-arg-format": "",
          "allow-mathtoolsset": true,
          pairedDelimiters: expandable({}),
          tagforms: expandable({})
        }
      }
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/physics/PhysicsItems.js
var AutoOpen;
var init_PhysicsItems = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/physics/PhysicsItems.js"() {
    init_StackItem();
    init_ParseUtil();
    init_NodeUtil();
    init_TexParser();
    AutoOpen = class extends BaseItem {
      constructor() {
        super(...arguments);
        this.openCount = 0;
      }
      get kind() {
        return "auto open";
      }
      get isOpen() {
        return true;
      }
      toMml(inferred = true, forceRow) {
        if (!inferred) {
          return super.toMml(inferred, forceRow);
        }
        const parser2 = this.factory.configuration.parser;
        const right = this.getProperty("right");
        if (this.getProperty("smash")) {
          const mml2 = super.toMml();
          const smash = parser2.create("node", "mpadded", [mml2], {
            height: 0,
            depth: 0
          });
          this.Clear();
          this.Push(parser2.create("node", "TeXAtom", [smash]));
        }
        if (right) {
          this.Push(new TexParser(right, parser2.stack.env, parser2.configuration).mml());
        }
        const mml = ParseUtil.fenced(this.factory.configuration, this.getProperty("open"), super.toMml(), this.getProperty("close"), this.getProperty("big"));
        NodeUtil_default.removeProperties(mml, "open", "close", "texClass");
        return mml;
      }
      closing(fence) {
        return fence === this.getProperty("close") && !this.openCount--;
      }
      checkItem(item) {
        if (item.getProperty("pre-autoclose")) {
          return BaseItem.fail;
        }
        if (item.getProperty("autoclose")) {
          if (this.getProperty("ignore")) {
            this.Clear();
            return [[], true];
          }
          return [[this.toMml()], true];
        }
        if (item.isKind("mml") && item.Size() === 1) {
          const mml = item.toMml();
          if (mml.isKind("mo") && mml.getText() === this.getProperty("open")) {
            this.openCount++;
          }
        }
        return super.checkItem(item);
      }
    };
    AutoOpen.errors = Object.assign(Object.create(BaseItem.errors), {
      stop: ["ExtraOrMissingDelims", "Extra open or missing close delimiter"]
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/physics/PhysicsMethods.js
function inRange(value, range) {
  return value >= range[0] && value <= range[1];
}
function createVectorToken(factory, kind, def2, text) {
  const parser2 = factory.configuration.parser;
  const token2 = NodeFactory.createToken(factory, kind, def2, text);
  const code = text.codePointAt(0);
  if (text.length === 1 && !parser2.stack.env.font && parser2.stack.env.vectorFont && (inRange(code, latinCap) || inRange(code, latinSmall) || inRange(code, greekCap) || inRange(code, digits) || inRange(code, greekSmall) && parser2.stack.env.vectorStar || NodeUtil_default.getAttribute(token2, "accent"))) {
    NodeUtil_default.setAttribute(token2, "mathvariant", parser2.stack.env.vectorFont);
  }
  return token2;
}
function vectorApplication(parser2, kind, name, operator2, fences2) {
  const op = new TexParser(operator2, parser2.stack.env, parser2.configuration).mml();
  parser2.Push(parser2.itemFactory.create(kind, op));
  const left = parser2.GetNext();
  const right = pairs[left];
  if (!right) {
    return;
  }
  let lfence = "", rfence = "", arg = "";
  const enlarge = fences2.includes(left);
  if (left === "{") {
    arg = parser2.GetArgument(name);
    lfence = enlarge ? "\\left\\{" : "";
    rfence = enlarge ? "\\right\\}" : "";
    const macro = `${lfence} ${arg} ${rfence}`;
    parser2.string = macro + parser2.string.slice(parser2.i);
    parser2.i = 0;
    return;
  }
  if (!enlarge) {
    return;
  }
  parser2.i++;
  parser2.Push(parser2.itemFactory.create("auto open").setProperties({ open: left, close: right }));
}
function outputBraket([arg1, arg2, arg3], star1, star2) {
  return star1 && star2 ? `\\left\\langle{${arg1}}\\middle\\vert{${arg2}}\\middle\\vert{${arg3}}\\right\\rangle` : star1 ? `\\langle{${arg1}}\\vert{${arg2}}\\vert{${arg3}}\\rangle` : `\\left\\langle{${arg1}}\\right\\vert{${arg2}}\\left\\vert{${arg3}}\\right\\rangle`;
}
function makeDiagMatrix(elements2, anti) {
  const length4 = elements2.length;
  const matrix = [];
  for (let i2 = 0; i2 < length4; i2++) {
    matrix.push(Array(anti ? length4 - i2 : i2 + 1).join("&") + `\\mqty{${elements2[i2]}}`);
  }
  return matrix.join("\\\\ ");
}
var pairs;
var biggs;
var latinCap;
var latinSmall;
var greekCap;
var greekSmall;
var digits;
var PhysicsMethods;
var PhysicsMethods_default;
var init_PhysicsMethods = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/physics/PhysicsMethods.js"() {
    init_HandlerTypes();
    init_BaseMethods();
    init_TexParser();
    init_TexError();
    init_MmlNode();
    init_ParseUtil();
    init_NodeUtil();
    init_NodeFactory2();
    pairs = {
      "(": ")",
      "[": "]",
      "{": "}",
      "|": "|"
    };
    biggs = /^(b|B)i(g{1,2})$/;
    latinCap = [65, 90];
    latinSmall = [97, 122];
    greekCap = [913, 937];
    greekSmall = [945, 969];
    digits = [48, 57];
    PhysicsMethods = {
      Quantity(parser2, name, open = "(", close = ")", arg = false, named = "", variant = "") {
        const star = arg ? parser2.GetStar() : false;
        let next = parser2.GetNext();
        const position = parser2.i;
        let big = null;
        if (next === "\\") {
          parser2.i++;
          big = parser2.GetCS();
          if (!big.match(biggs)) {
            const empty = parser2.create("node", "mrow");
            parser2.Push(ParseUtil.fenced(parser2.configuration, open, empty, close));
            parser2.i = position;
            return;
          }
          next = parser2.GetNext();
        }
        let right = pairs[next];
        if (arg && next !== "{") {
          throw new TexError_default("MissingArgFor", "Missing argument for %1", parser2.currentCS);
        }
        if (!right) {
          const empty = parser2.create("node", "mrow");
          parser2.Push(ParseUtil.fenced(parser2.configuration, open, empty, close));
          parser2.i = position;
          return;
        }
        if (named) {
          const mml = parser2.create("token", "mi", { texClass: TEXCLASS.OP }, named);
          if (variant) {
            NodeUtil_default.setAttribute(mml, "mathvariant", variant);
          }
          parser2.Push(parser2.itemFactory.create("fn", mml));
        }
        if (next === "{") {
          let argument = parser2.GetArgument(name);
          next = arg ? open : "\\{";
          right = arg ? close : "\\}";
          argument = star ? `${next} ${argument} ${right}` : big ? `\\${big}l${next} ${argument} \\${big}r${right}` : `\\left${next} ${argument} \\right${right}`;
          parser2.Push(new TexParser(argument, parser2.stack.env, parser2.configuration).mml());
          return;
        }
        parser2.i++;
        parser2.Push(parser2.itemFactory.create("auto open").setProperties({ open: next, close: right, big }));
      },
      Eval(parser2, name) {
        const star = parser2.GetStar();
        const next = parser2.GetNext();
        if (next === "(" || next === "[") {
          parser2.i++;
          parser2.Push(parser2.itemFactory.create("auto open").setProperties({
            open: next,
            close: "|",
            smash: star,
            right: "\\vphantom{\\int}"
          }));
          return;
        }
        let replace2 = "\\left.\\vphantom{\\int}\\right|";
        if (next === "{") {
          const arg = parser2.GetArgument(name);
          replace2 = `\\left.${star ? `\\smash{${arg}}` : arg}\\vphantom{\\int}\\right|`;
        }
        parser2.string = parser2.string.substring(0, parser2.i) + replace2 + parser2.string.slice(parser2.i);
      },
      Commutator(parser2, name, open = "[", close = "]") {
        const star = parser2.GetStar();
        let next = parser2.GetNext();
        let big = null;
        if (next === "\\") {
          parser2.i++;
          big = parser2.GetCS();
          if (!big.match(biggs)) {
            throw new TexError_default("MissingArgFor", "Missing argument for %1", parser2.currentCS);
          }
          next = parser2.GetNext();
        }
        if (next !== "{") {
          throw new TexError_default("MissingArgFor", "Missing argument for %1", parser2.currentCS);
        }
        const arg1 = parser2.GetArgument(name);
        const arg2 = parser2.GetArgument(name);
        let argument = arg1 + "," + arg2;
        argument = star ? `${open} ${argument} ${close}` : big ? `\\${big}l${open} ${argument} \\${big}r${close}` : `\\left${open} ${argument} \\right${close}`;
        parser2.Push(new TexParser(argument, parser2.stack.env, parser2.configuration).mml());
      },
      VectorBold(parser2, name) {
        const star = parser2.GetStar();
        const arg = parser2.GetArgument(name);
        const oldToken = parser2.configuration.nodeFactory.get("token");
        const oldFont = parser2.stack.env.font;
        delete parser2.stack.env.font;
        parser2.configuration.nodeFactory.set("token", createVectorToken);
        parser2.stack.env.vectorFont = star ? "bold-italic" : "bold";
        parser2.stack.env.vectorStar = star;
        const node = new TexParser(arg, parser2.stack.env, parser2.configuration).mml();
        if (oldFont) {
          parser2.stack.env.font = oldFont;
        }
        delete parser2.stack.env.vectorFont;
        delete parser2.stack.env.vectorStar;
        parser2.configuration.nodeFactory.set("token", oldToken);
        parser2.Push(node);
      },
      StarMacro(parser2, name, argcount, ...parts) {
        const star = parser2.GetStar();
        const args = [];
        if (argcount) {
          for (let i2 = args.length; i2 < argcount; i2++) {
            args.push(parser2.GetArgument(name));
          }
        }
        let macro = parts.join(star ? "*" : "");
        macro = ParseUtil.substituteArgs(parser2, args, macro);
        parser2.string = ParseUtil.addArgs(parser2, macro, parser2.string.slice(parser2.i));
        parser2.i = 0;
        ParseUtil.checkMaxMacros(parser2);
      },
      OperatorApplication(parser2, name, operator2, ...fences2) {
        vectorApplication(parser2, "fn", name, operator2, fences2);
      },
      VectorOperator(parser2, name, operator2, ...fences2) {
        vectorApplication(parser2, "mml", name, operator2, fences2);
      },
      Expression(parser2, name, opt = true, id = "") {
        id = id || name.slice(1);
        const exp = opt ? parser2.GetBrackets(name) : null;
        let mml = parser2.create("token", "mi", { texClass: TEXCLASS.OP }, id);
        if (exp) {
          const sup = new TexParser(exp, parser2.stack.env, parser2.configuration).mml();
          mml = parser2.create("node", "msup", [mml, sup]);
        }
        parser2.Push(parser2.itemFactory.create("fn", mml));
        if (parser2.GetNext() !== "(") {
          return;
        }
        parser2.i++;
        parser2.Push(parser2.itemFactory.create("auto open").setProperties({ open: "(", close: ")" }));
      },
      Qqtext(parser2, name, text) {
        const star = parser2.GetStar();
        const arg = text ? text : parser2.GetArgument(name);
        const replace2 = (star ? "" : "\\quad") + "\\text{" + arg + "}\\quad ";
        parser2.string = parser2.string.slice(0, parser2.i) + replace2 + parser2.string.slice(parser2.i);
      },
      Differential(parser2, name, op) {
        const optArg = parser2.GetBrackets(name);
        const power = optArg != null ? "^{" + optArg + "}" : " ";
        const parens2 = parser2.GetNext() === "(";
        const braces = parser2.GetNext() === "{";
        let macro = op + power;
        if (!(parens2 || braces)) {
          macro += parser2.GetArgument(name, true) || "";
          const mml = new TexParser(macro, parser2.stack.env, parser2.configuration).mml();
          parser2.Push(mml);
          return;
        }
        if (braces) {
          macro += parser2.GetArgument(name);
          const mml = new TexParser(macro, parser2.stack.env, parser2.configuration).mml();
          parser2.Push(parser2.create("node", "TeXAtom", [mml], { texClass: TEXCLASS.OP }));
          return;
        }
        parser2.Push(new TexParser(macro, parser2.stack.env, parser2.configuration).mml());
        parser2.i++;
        parser2.Push(parser2.itemFactory.create("auto open").setProperties({ open: "(", close: ")" }));
      },
      Derivative(parser2, name, argMax, op) {
        const star = parser2.GetStar();
        const optArg = parser2.GetBrackets(name);
        let argCounter = 1;
        const args = [];
        args.push(parser2.GetArgument(name));
        while (parser2.GetNext() === "{" && argCounter < argMax) {
          args.push(parser2.GetArgument(name));
          argCounter++;
        }
        let ignore = false;
        let power1 = " ";
        let power2 = " ";
        if (argMax > 2 && args.length > 2) {
          power1 = "^{" + (args.length - 1) + "}";
          ignore = true;
        } else if (optArg != null) {
          if (argMax > 2 && args.length > 1) {
            ignore = true;
          }
          power1 = `^{${optArg}}`;
          power2 = power1;
        }
        const frac = star ? "\\flatfrac" : "\\frac";
        const first = args.length > 1 ? args[0] : "";
        const second = args.length > 1 ? args[1] : args[0];
        let rest = "";
        for (let i2 = 2, arg; arg = args[i2]; i2++) {
          rest += op + " " + arg;
        }
        const macro = `${frac}{${op}${power1}${first}}{${op} ${second}${power2} ${rest}}`;
        parser2.Push(new TexParser(macro, parser2.stack.env, parser2.configuration).mml());
        if (parser2.GetNext() === "(") {
          parser2.i++;
          parser2.Push(parser2.itemFactory.create("auto open").setProperties({ open: "(", close: ")", ignore }));
        }
      },
      Bra(parser2, name) {
        const starBra = parser2.GetStar();
        const bra = parser2.GetArgument(name);
        let ket = "";
        let hasKet = false;
        let starKet = false;
        if (parser2.GetNext() === "\\") {
          let saveI = parser2.i;
          parser2.i++;
          const cs = parser2.GetCS();
          const token2 = parser2.lookup(HandlerType.MACRO, cs);
          if (token2 && token2.token === "ket") {
            hasKet = true;
            saveI = parser2.i;
            starKet = parser2.GetStar();
            if (parser2.GetNext() === "{") {
              ket = parser2.GetArgument(cs, true);
            } else {
              parser2.i = saveI;
              starKet = false;
            }
          } else {
            parser2.i = saveI;
          }
        }
        let macro = "";
        if (hasKet) {
          macro = starBra || starKet ? `\\langle{${bra}}\\vert{${ket}}\\rangle` : `\\left\\langle{${bra}}\\middle\\vert{${ket}}\\right\\rangle`;
        } else {
          macro = starBra ? `\\langle{${bra}}\\vert` : `\\left\\langle{${bra}}\\right\\vert{${ket}}`;
        }
        parser2.Push(new TexParser(macro, parser2.stack.env, parser2.configuration).mml());
      },
      Ket(parser2, name) {
        const star = parser2.GetStar();
        const ket = parser2.GetArgument(name);
        const macro = star ? `\\vert{${ket}}\\rangle` : `\\left\\vert{${ket}}\\right\\rangle`;
        parser2.Push(new TexParser(macro, parser2.stack.env, parser2.configuration).mml());
      },
      BraKet(parser2, name) {
        const star = parser2.GetStar();
        const bra = parser2.GetArgument(name);
        let ket = null;
        if (parser2.GetNext() === "{") {
          ket = parser2.GetArgument(name, true);
        }
        let macro = "";
        if (ket == null) {
          macro = star ? `\\langle{${bra}}\\vert{${bra}}\\rangle` : `\\left\\langle{${bra}}\\middle\\vert{${bra}}\\right\\rangle`;
        } else {
          macro = star ? `\\langle{${bra}}\\vert{${ket}}\\rangle` : `\\left\\langle{${bra}}\\middle\\vert{${ket}}\\right\\rangle`;
        }
        parser2.Push(new TexParser(macro, parser2.stack.env, parser2.configuration).mml());
      },
      KetBra(parser2, name) {
        const star = parser2.GetStar();
        const ket = parser2.GetArgument(name);
        let bra = null;
        if (parser2.GetNext() === "{") {
          bra = parser2.GetArgument(name, true);
        }
        let macro = "";
        if (bra == null) {
          macro = star ? `\\vert{${ket}}\\rangle\\!\\langle{${ket}}\\vert` : `\\left\\vert{${ket}}\\middle\\rangle\\!\\middle\\langle{${ket}}\\right\\vert`;
        } else {
          macro = star ? `\\vert{${ket}}\\rangle\\!\\langle{${bra}}\\vert` : `\\left\\vert{${ket}}\\middle\\rangle\\!\\middle\\langle{${bra}}\\right\\vert`;
        }
        parser2.Push(new TexParser(macro, parser2.stack.env, parser2.configuration).mml());
      },
      Expectation(parser2, name) {
        const star1 = parser2.GetStar();
        const star2 = star1 && parser2.GetStar();
        const arg1 = parser2.GetArgument(name);
        let arg2 = null;
        if (parser2.GetNext() === "{") {
          arg2 = parser2.GetArgument(name, true);
        }
        const macro = arg1 && arg2 ? outputBraket([arg2, arg1, arg2], star1, star2) : star1 ? `\\langle {${arg1}} \\rangle` : `\\left\\langle {${arg1}} \\right\\rangle`;
        parser2.Push(new TexParser(macro, parser2.stack.env, parser2.configuration).mml());
      },
      MatrixElement(parser2, name) {
        const star1 = parser2.GetStar();
        const star2 = star1 && parser2.GetStar();
        const arg1 = parser2.GetArgument(name);
        const arg2 = parser2.GetArgument(name);
        const arg3 = parser2.GetArgument(name);
        const macro = outputBraket([arg1, arg2, arg3], star1, star2);
        parser2.Push(new TexParser(macro, parser2.stack.env, parser2.configuration).mml());
      },
      MatrixQuantity(parser2, name, small) {
        const star = parser2.GetStar();
        const next = parser2.GetNext();
        const array = small ? "smallmatrix" : "array";
        let arg = "";
        let open = "";
        let close = "";
        switch (next) {
          case "{":
            arg = parser2.GetArgument(name);
            break;
          case "(":
            parser2.i++;
            open = star ? "\\lgroup" : "(";
            close = star ? "\\rgroup" : ")";
            arg = parser2.GetUpTo(name, ")");
            break;
          case "[":
            parser2.i++;
            open = "[";
            close = "]";
            arg = parser2.GetUpTo(name, "]");
            break;
          case "|":
            parser2.i++;
            open = "|";
            close = "|";
            arg = parser2.GetUpTo(name, "|");
            break;
          default:
            open = "(";
            close = ")";
            break;
        }
        const macro = (open ? "\\left" : "") + `${open}\\begin{${array}}{} ${arg}\\end{${array}}` + (open ? "\\right" : "") + close;
        parser2.Push(new TexParser(macro, parser2.stack.env, parser2.configuration).mml());
      },
      IdentityMatrix(parser2, name) {
        const arg = parser2.GetArgument(name);
        const size = parseInt(arg, 10);
        if (isNaN(size)) {
          throw new TexError_default("InvalidNumber", "Invalid number");
        }
        if (size <= 1) {
          parser2.string = "1" + parser2.string.slice(parser2.i);
          parser2.i = 0;
          return;
        }
        const zeros = Array(size).fill("0");
        const columns = [];
        for (let i2 = 0; i2 < size; i2++) {
          const row = zeros.slice();
          row[i2] = "1";
          columns.push(row.join(" & "));
        }
        parser2.string = columns.join("\\\\ ") + parser2.string.slice(parser2.i);
        parser2.i = 0;
      },
      XMatrix(parser2, name) {
        const star = parser2.GetStar();
        const arg1 = parser2.GetArgument(name);
        const arg2 = parser2.GetArgument(name);
        const arg3 = parser2.GetArgument(name);
        let n = parseInt(arg2, 10);
        let m = parseInt(arg3, 10);
        if (isNaN(n) || isNaN(m) || m.toString() !== arg3 || n.toString() !== arg2) {
          throw new TexError_default("InvalidNumber", "Invalid number");
        }
        n = n < 1 ? 1 : n;
        m = m < 1 ? 1 : m;
        if (!star) {
          const row = Array(m).fill(arg1).join(" & ");
          const matrix2 = Array(n).fill(row).join("\\\\ ");
          parser2.string = matrix2 + parser2.string.slice(parser2.i);
          parser2.i = 0;
          return;
        }
        let matrix = "";
        if (n === 1 && m === 1) {
          matrix = arg1;
        } else if (n === 1) {
          const row = [];
          for (let i2 = 1; i2 <= m; i2++) {
            row.push(`${arg1}_{${i2}}`);
          }
          matrix = row.join(" & ");
        } else if (m === 1) {
          const row = [];
          for (let i2 = 1; i2 <= n; i2++) {
            row.push(`${arg1}_{${i2}}`);
          }
          matrix = row.join("\\\\ ");
        } else {
          const rows = [];
          for (let i2 = 1; i2 <= n; i2++) {
            const row = [];
            for (let j = 1; j <= m; j++) {
              row.push(`${arg1}_{{${i2}}{${j}}}`);
            }
            rows.push(row.join(" & "));
          }
          matrix = rows.join("\\\\ ");
        }
        parser2.string = matrix + parser2.string.slice(parser2.i);
        parser2.i = 0;
        return;
      },
      PauliMatrix(parser2, name) {
        const arg = parser2.GetArgument(name);
        let matrix = arg.slice(1);
        switch (arg[0]) {
          case "0":
            matrix += " 1 & 0\\\\ 0 & 1";
            break;
          case "1":
          case "x":
            matrix += " 0 & 1\\\\ 1 & 0";
            break;
          case "2":
          case "y":
            matrix += " 0 & -i\\\\ i & 0";
            break;
          case "3":
          case "z":
            matrix += " 1 & 0\\\\ 0 & -1";
            break;
          default:
        }
        parser2.string = matrix + parser2.string.slice(parser2.i);
        parser2.i = 0;
      },
      DiagonalMatrix(parser2, name, anti) {
        if (parser2.GetNext() !== "{") {
          return;
        }
        const startI = parser2.i;
        parser2.GetArgument(name);
        const endI = parser2.i;
        parser2.i = startI + 1;
        const elements2 = [];
        let element = "";
        let currentI = parser2.i;
        while (currentI < endI) {
          try {
            element = parser2.GetUpTo(name, ",");
          } catch (_e) {
            parser2.i = endI;
            elements2.push(parser2.string.slice(currentI, endI - 1));
            break;
          }
          currentI = parser2.i;
          elements2.push(element);
        }
        parser2.string = makeDiagMatrix(elements2, anti) + parser2.string.slice(endI);
        parser2.i = 0;
      },
      AutoClose(parser2, fence, texclass) {
        let top = parser2.stack.Top();
        if (top.isKind("over")) {
          top = parser2.stack.Top(2);
        }
        if (!top.isKind("auto open") || !top.closing(fence)) {
          return false;
        }
        const mo = parser2.create("token", "mo", { texClass: texclass }, fence);
        parser2.Push(parser2.itemFactory.create("close").setProperties({ "pre-autoclose": true }));
        parser2.Push(parser2.itemFactory.create("mml", mo).setProperties({ autoclose: true }));
        return true;
      },
      Vnabla(parser2, _name) {
        const argument = parser2.options.physics.arrowdel ? "\\vec{\\gradientnabla}" : "{\\gradientnabla}";
        return parser2.Push(new TexParser(argument, parser2.stack.env, parser2.configuration).mml());
      },
      DiffD(parser2, _name) {
        const argument = parser2.options.physics.italicdiff ? "d" : "{\\rm d}";
        return parser2.Push(new TexParser(argument, parser2.stack.env, parser2.configuration).mml());
      },
      Macro: BaseMethods_default.Macro,
      NamedFn: BaseMethods_default.NamedFn,
      Array: BaseMethods_default.Array
    };
    PhysicsMethods_default = PhysicsMethods;
  }
});
export{init_PhysicsMethods,PhysicsMethods_default,init_PhysicsItems,AutoOpen,MathtoolsUtil,MathtoolsMethods,init_BraketConfiguration,init_CancelConfiguration,init_ColorConfiguration,init_MathtoolsConfiguration,init_MathtoolsUtil,init_MathtoolsMethods};
