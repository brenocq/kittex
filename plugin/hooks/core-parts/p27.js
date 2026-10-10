import{__esm,init_HandlerTypes,init_Configuration,init_TokenMap,init_TexError,init_BaseMethods,init_AmsMethods,init_mhchemParser,init_MmlNode,TEXCLASS,mhchemParser,TexError_default,BaseMethods_default,AmsMethods,CommandMap,CharacterMap,Configuration,ConfigurationType,HandlerType,init_TexParser,init_BaseConfiguration,init_NodeUtil,Other,TexParser,NodeUtil_default,init_ParseMethods,EnvironmentMap,ParseMethods_default,MacroMap,init_ParseUtil,ParseUtil,TexConstant,init_TexConstants,TextParser,TextMacrosMethods,init_TextMacrosMethods,init_TextParser,init_svg,init_Direction,MathJaxNewcmFont,__kittexJson19,__kittexJson20,H,__kittexJson21,__kittexJson22,__kittexJson23,__kittexJson24,V,__kittexJson25,__kittexJson26,__kittexJson27,__kittexJson28,__kittexJson29,__kittexJson30,__kittexJson31,__kittexJson32,__kittexJson33,__kittexJson34,__kittexJson35,__kittexJson36,__kittexJson37,__kittexJson38,__kittexJson39,__kittexJson40,__kittexJson41,__kittexJson42,__kittexJson43,__kittexJson44,__kittexJson45,__kittexJson46,__kittexJson47,__kittexJson48,__kittexJson49,__kittexJson50,__kittexJson51,__kittexJson52,__kittexLate}from'./p26.js';export*from'./p26.js';
// node_modules/@mathjax/src/mjs/input/tex/mhchem/MhchemConfiguration.js
var MhchemUtils;
var MhchemReplacements;
var MhchemMethods;
var mhchemMacros;
var mhchemChars;
var MhchemConfiguration;
var init_MhchemConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/mhchem/MhchemConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_TokenMap();
    init_TexError();
    init_BaseMethods();
    init_AmsMethods();
    init_mhchemParser();
    init_MmlNode();
    MhchemUtils = {
      relmo(parser2, mchar) {
        const def2 = Object.assign({ stretchy: true, texClass: TEXCLASS.REL, mathvariant: "-mhchem" }, mchar.attributes || {});
        const node = parser2.create("token", "mo", def2, mchar.char);
        parser2.Push(node);
      }
    };
    MhchemReplacements = /* @__PURE__ */ new Map([
      [
        "\\mhchemx$3[$1]{$2}",
        /\\underset{\\lower2mu{(.*?)}}{\\overset{(.*?)}{\\long(.*?)}}/g
      ],
      ["\\mhchemx$2{$1}", /\\overset{(.*?)}{\\long(.*?)}/g],
      [
        "\\mhchemBondTD",
        /\\rlap\{\\lower\.1em\{-\}\}\\raise\.1em\{\\tripledash\}/g
      ],
      [
        "\\mhchemBondTDD",
        /\\rlap\{\\lower\.2em\{-\}\}\\rlap\{\\raise\.2em\{\\tripledash\}\}-/g
      ],
      [
        "\\mhchemBondDTD",
        /\\rlap\{\\lower\.2em\{-\}\}\\rlap\{\\raise.2em\{-\}\}\\tripledash/g
      ],
      [
        (match, arrow) => {
          const mharrow = `mhchem${arrow}`;
          return mhchemChars.lookup(mharrow) || mhchemMacros.lookup(mharrow) ? `\\${mharrow}` : match;
        },
        /\\(x?(?:long)?(?:left|right|[Ll]eftright|[Rr]ightleft)(?:arrow|harpoons))/g
      ]
    ]);
    MhchemMethods = {
      Machine(parser2, name, machine) {
        const arg = parser2.GetArgument(name);
        let tex;
        try {
          tex = mhchemParser.toTex(arg, machine);
          for (const [name2, pattern] of MhchemReplacements.entries()) {
            tex = tex.replace(pattern, name2);
          }
        } catch (err) {
          throw new TexError_default(err[0], err[1]);
        }
        parser2.string = tex + parser2.string.substring(parser2.i);
        parser2.i = 0;
      },
      Macro: BaseMethods_default.Macro,
      xArrow: AmsMethods.xArrow
    };
    mhchemMacros = new CommandMap("mhchem", {
      ce: [MhchemMethods.Machine, "ce"],
      pu: [MhchemMethods.Machine, "pu"],
      mhchemxrightarrow: [MhchemMethods.xArrow, 58409, 5, 9],
      mhchemxleftarrow: [MhchemMethods.xArrow, 58408, 9, 5],
      mhchemxleftrightarrow: [MhchemMethods.xArrow, 58410, 9, 9],
      mhchemxleftrightarrows: [MhchemMethods.xArrow, 58411, 9, 9],
      mhchemxrightleftharpoons: [MhchemMethods.xArrow, 58376, 5, 9],
      mhchemxRightleftharpoons: [MhchemMethods.xArrow, 58377, 5, 9],
      mhchemxLeftrightharpoons: [MhchemMethods.xArrow, 58378, 9, 11]
    });
    mhchemChars = new CharacterMap("mhchem-chars", MhchemUtils.relmo, {
      tripledash: ["\uE410", { stretchy: false }],
      mhchemBondTD: ["\uE411", { stretchy: false }],
      mhchemBondTDD: ["\uE412", { stretchy: false }],
      mhchemBondDTD: ["\uE413", { stretchy: false }],
      mhchemlongleftarrow: "\uE428",
      mhchemlongrightarrow: "\uE429",
      mhchemlongleftrightarrow: "\uE42A",
      mhchemlongrightleftharpoons: "\uE408",
      mhchemlongRightleftharpoons: "\uE409",
      mhchemlongLeftrightharpoons: "\uE40A",
      mhchemlongleftrightarrows: "\uE42B",
      mhchemrightarrow: "\uE42D",
      mhchemleftarrow: "\uE42C",
      mhchemleftrightarrow: "\uE42E"
    });
    MhchemConfiguration = Configuration.create("mhchem", {
      [ConfigurationType.HANDLER]: {
        [HandlerType.MACRO]: ["mhchem", "mhchem-chars"]
      }
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/amscd/AmsCdMethods.js
var AmsCdMethods;
var AmsCdMethods_default;
var init_AmsCdMethods = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/amscd/AmsCdMethods.js"() {
    init_TexParser();
    init_BaseConfiguration();
    init_MmlNode();
    init_NodeUtil();
    AmsCdMethods = {
      CD(parser2, begin) {
        parser2.Push(begin);
        const item = parser2.itemFactory.create("array");
        const options3 = parser2.configuration.options.amscd;
        item.setProperties({
          minw: parser2.stack.env.CD_minw || options3.harrowsize,
          minh: parser2.stack.env.CD_minh || options3.varrowsize
        });
        item.arraydef = {
          columnalign: "center",
          columnspacing: options3.colspace,
          rowspacing: options3.rowspace,
          displaystyle: true
        };
        return item;
      },
      arrow(parser2, name) {
        const i2 = parser2.i;
        const c = parser2.GetNext();
        if (!c.match(/[><VA.|=]/)) {
          parser2.i = i2;
          return Other(parser2, name);
        } else {
          parser2.i++;
        }
        let first = parser2.stack.Top();
        if (!first.isKind("array") || first.Size()) {
          AmsCdMethods.cell(parser2, name);
          first = parser2.stack.Top();
        }
        const top = first;
        const arrowRow2 = top.table.length % 2 === 1;
        let n = (top.row.length + (arrowRow2 ? 0 : 1)) % 2;
        while (n) {
          AmsCdMethods.cell(parser2, name);
          n--;
        }
        let mml;
        const hdef = { minsize: top.getProperty("minw"), stretchy: true };
        const vdef = {
          minsize: top.getProperty("minh"),
          stretchy: true,
          symmetric: true,
          lspace: 0,
          rspace: 0
        };
        if (c === "|") {
          mml = parser2.create("token", "mo", vdef, "∥");
        } else if (c === "=") {
          mml = parser2.create("token", "mo", hdef, "=");
        } else if (c !== ".") {
          const arrow = {
            ">": "→",
            "<": "←",
            V: "↓",
            A: "↑"
          }[c];
          let a = parser2.GetUpTo(name + c, c);
          const b = parser2.GetUpTo(name + c, c);
          if (c === ">" || c === "<") {
            mml = parser2.create("token", "mo", hdef, arrow);
            if (!a) {
              a = "\\kern " + top.getProperty("minw");
            }
            const pad2 = { width: "+.67em", lspace: ".33em" };
            mml = parser2.create("node", "munderover", [mml]);
            const nodeA = new TexParser(a, parser2.stack.env, parser2.configuration).mml();
            const mpadded = parser2.create("node", "mpadded", [nodeA], pad2);
            NodeUtil_default.setAttribute(mpadded, "voffset", ".1em");
            NodeUtil_default.setChild(mml, mml.over, mpadded);
            if (b) {
              const nodeB = new TexParser(b, parser2.stack.env, parser2.configuration).mml();
              NodeUtil_default.setChild(mml, mml.under, parser2.create("node", "mpadded", [nodeB], pad2));
            }
            if (parser2.configuration.options.amscd.hideHorizontalLabels) {
              mml = parser2.create("node", "mpadded", [mml], {
                depth: 0,
                height: ".67em"
              });
            }
          } else {
            const arrowNode = parser2.create("token", "mo", vdef, arrow);
            mml = arrowNode;
            if (a || b) {
              mml = parser2.create("node", "mrow");
              if (a) {
                NodeUtil_default.appendChildren(mml, [
                  new TexParser("\\scriptstyle\\raise.125em{\\vcenter{\\llap{" + a + "}}}", parser2.stack.env, parser2.configuration).mml()
                ]);
              }
              arrowNode.texClass = TEXCLASS.ORD;
              NodeUtil_default.appendChildren(mml, [arrowNode]);
              if (b) {
                NodeUtil_default.appendChildren(mml, [
                  new TexParser("\\scriptstyle\\raise.125em{\\vcenter{\\rlap{" + b + "}}}", parser2.stack.env, parser2.configuration).mml()
                ]);
              }
            }
          }
        }
        if (mml) {
          parser2.Push(mml);
        }
        AmsCdMethods.cell(parser2, name);
      },
      cell(parser2, name) {
        const top = parser2.stack.Top();
        if ((top.table || []).length % 2 === 0 && (top.row || []).length === 0) {
          parser2.Push(parser2.create("node", "mpadded", [], { height: "8.5pt", depth: "2pt" }));
        }
        parser2.Push(parser2.itemFactory.create("cell").setProperties({ isEntry: true, name }));
      },
      minCDarrowwidth(parser2, name) {
        parser2.stack.env.CD_minw = parser2.GetDimen(name);
      },
      minCDarrowheight(parser2, name) {
        parser2.stack.env.CD_minh = parser2.GetDimen(name);
      }
    };
    AmsCdMethods_default = AmsCdMethods;
  }
});
// node_modules/@mathjax/src/mjs/input/tex/amscd/AmsCdMappings.js
var init_AmsCdMappings = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/amscd/AmsCdMappings.js"() {
    init_TokenMap();
    init_ParseMethods();
    init_AmsCdMethods();
    new EnvironmentMap("amscd_environment", ParseMethods_default.environment, {
      CD: AmsCdMethods_default.CD
    });
    new CommandMap("amscd_macros", {
      minCDarrowwidth: AmsCdMethods_default.minCDarrowwidth,
      minCDarrowheight: AmsCdMethods_default.minCDarrowheight
    });
    new MacroMap("amscd_special", { "@": AmsCdMethods_default.arrow });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/amscd/AmsCdConfiguration.js
var AmsCdConfiguration;
var init_AmsCdConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/amscd/AmsCdConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_AmsCdMappings();
    AmsCdConfiguration = Configuration.create("amscd", {
      [ConfigurationType.HANDLER]: {
        [HandlerType.CHARACTER]: ["amscd_special"],
        [HandlerType.MACRO]: ["amscd_macros"],
        [HandlerType.ENVIRONMENT]: ["amscd_environment"]
      },
      [ConfigurationType.OPTIONS]: {
        amscd: {
          colspace: "5pt",
          rowspace: "5pt",
          harrowsize: "2.75em",
          varrowsize: "1.75em",
          hideHorizontalLabels: false
        }
      }
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/empheq/EmpheqUtil.js
var EmpheqUtil;
var init_EmpheqUtil = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/empheq/EmpheqUtil.js"() {
    init_ParseUtil();
    init_TexParser();
    EmpheqUtil = {
      splitOptions(text, allowed = null) {
        return ParseUtil.keyvalOptions(text, allowed, true);
      },
      columnCount(table2) {
        let m = 0;
        for (const row of table2.childNodes) {
          const n = row.childNodes.length - (row.isKind("mlabeledtr") ? 1 : 0);
          if (n > m)
            m = n;
        }
        return m;
      },
      cellBlock(tex, table2, parser2, env) {
        const mpadded = parser2.create("node", "mpadded", [], {
          height: 0,
          depth: 0,
          voffset: "-1height"
        });
        const result = new TexParser(tex, parser2.stack.env, parser2.configuration);
        const mml = result.mml();
        if (env && result.configuration.tags.label) {
          result.configuration.tags.currentTag.env = env;
          result.configuration.tags.getTag(true);
        }
        for (const child of mml.isInferred ? mml.childNodes : [mml]) {
          mpadded.appendChild(child);
        }
        mpadded.appendChild(parser2.create("node", "mphantom", [
          parser2.create("node", "mpadded", [table2], { width: 0 })
        ]));
        return mpadded;
      },
      topRowTable(original, parser2) {
        const table2 = ParseUtil.copyNode(original, parser2);
        table2.setChildren(table2.childNodes.slice(0, 1));
        table2.attributes.set("align", "baseline 1");
        return original.factory.create("mphantom", {}, [
          parser2.create("node", "mpadded", [table2], { width: 0 })
        ]);
      },
      rowspanCell(mtd, tex, table2, parser2, env) {
        mtd.appendChild(parser2.create("node", "mpadded", [
          this.cellBlock(tex, ParseUtil.copyNode(table2, parser2), parser2, env),
          this.topRowTable(table2, parser2)
        ], { height: 0, depth: 0, voffset: "height" }));
      },
      left(table2, original, left, parser2, env = "") {
        table2.attributes.set("columnalign", "right " + table2.attributes.get("columnalign"));
        table2.attributes.set("columnspacing", "0em " + table2.attributes.get("columnspacing"));
        if (table2.childNodes.length === 0) {
          table2.appendChild(parser2.create("node", "mtr"));
        }
        let mtd;
        for (const row of table2.childNodes.slice(0).reverse()) {
          mtd = parser2.create("node", "mtd");
          row.childNodes.unshift(mtd);
          mtd.parent = row;
          if (row.isKind("mlabeledtr")) {
            row.childNodes[0] = row.childNodes[1];
            row.childNodes[1] = mtd;
          }
        }
        this.rowspanCell(mtd, left, original, parser2, env);
      },
      right(table2, original, right, parser2, env = "") {
        if (table2.childNodes.length === 0) {
          table2.appendChild(parser2.create("node", "mtr"));
        }
        const row = table2.childNodes[0];
        const m = EmpheqUtil.columnCount(table2) + (row.isKind("mlabeledtr") ? 1 : 0);
        while (row.childNodes.length < m) {
          row.appendChild(parser2.create("node", "mtd"));
        }
        const mtd = row.appendChild(parser2.create("node", "mtd"));
        EmpheqUtil.rowspanCell(mtd, right, original, parser2, env);
        table2.attributes.set("columnalign", (table2.attributes.get("columnalign") || "").split(/ /).slice(0, m).join(" ") + " left");
        table2.attributes.set("columnspacing", table2.attributes.get("columnspacing").split(/ /).slice(0, m - 1).join(" ") + " 0em");
      },
      adjustTable(empheq, parser2) {
        const left = empheq.getProperty("left");
        const right = empheq.getProperty("right");
        if (left || right) {
          const table2 = empheq.Last;
          const original = ParseUtil.copyNode(table2, parser2);
          if (left)
            this.left(table2, original, left, parser2);
          if (right)
            this.right(table2, original, right, parser2);
        }
      },
      allowEnv: {
        equation: true,
        align: true,
        gather: true,
        flalign: true,
        alignat: true,
        multline: true
      },
      checkEnv(env) {
        return Object.hasOwn(this.allowEnv, env.replace(/\*$/, "")) || false;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/empheq/EmpheqConfiguration.js
var EmpheqMethods;
var EmpheqConfiguration;
var init_EmpheqConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/empheq/EmpheqConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_TokenMap();
    init_ParseUtil();
    init_TexError();
    init_EmpheqUtil();
    init_ParseMethods();
    EmpheqMethods = {
      Empheq(parser2, begin) {
        if (parser2.stack.env.closing === begin.getName()) {
          delete parser2.stack.env.closing;
          parser2.Push(parser2.itemFactory.create("end").setProperty("name", parser2.stack.global.empheq));
          parser2.stack.global.empheq = "";
          const empheq = parser2.stack.Top();
          EmpheqUtil.adjustTable(empheq, parser2);
          parser2.Push(parser2.itemFactory.create("end").setProperty("name", "empheq"));
        } else {
          ParseUtil.checkEqnEnv(parser2);
          const opts = parser2.GetBrackets("\\begin{" + begin.getName() + "}") || "";
          const [env, n] = parser2.GetArgument("\\begin{" + begin.getName() + "}").split(/=/);
          if (!EmpheqUtil.checkEnv(env)) {
            throw new TexError_default("EmpheqInvalidEnv", 'Invalid environment "%1" for %2', env, begin.getName());
          }
          begin.setProperty("nestStart", true);
          if (opts) {
            begin.setProperties(EmpheqUtil.splitOptions(opts, { left: 1, right: 1 }));
          }
          parser2.stack.global.empheq = env;
          parser2.string = "\\begin{" + env + "}" + (n ? "{" + n + "}" : "") + parser2.string.slice(parser2.i);
          parser2.i = 0;
          parser2.Push(begin);
        }
      },
      EmpheqMO(parser2, _name, c) {
        parser2.Push(parser2.create("token", "mo", {}, c));
      },
      EmpheqDelim(parser2, name) {
        const c = parser2.GetDelimiter(name);
        parser2.Push(parser2.create("token", "mo", { stretchy: true, symmetric: true }, c));
      }
    };
    new EnvironmentMap("empheq-env", ParseMethods_default.environment, {
      empheq: [EmpheqMethods.Empheq, "empheq"]
    });
    new CommandMap("empheq-macros", {
      empheqlbrace: [EmpheqMethods.EmpheqMO, "{"],
      empheqrbrace: [EmpheqMethods.EmpheqMO, "}"],
      empheqlbrack: [EmpheqMethods.EmpheqMO, "["],
      empheqrbrack: [EmpheqMethods.EmpheqMO, "]"],
      empheqlangle: [EmpheqMethods.EmpheqMO, "⟨"],
      empheqrangle: [EmpheqMethods.EmpheqMO, "⟩"],
      empheqlparen: [EmpheqMethods.EmpheqMO, "("],
      empheqrparen: [EmpheqMethods.EmpheqMO, ")"],
      empheqlvert: [EmpheqMethods.EmpheqMO, "|"],
      empheqrvert: [EmpheqMethods.EmpheqMO, "|"],
      empheqlVert: [EmpheqMethods.EmpheqMO, "‖"],
      empheqrVert: [EmpheqMethods.EmpheqMO, "‖"],
      empheqlfloor: [EmpheqMethods.EmpheqMO, "⌊"],
      empheqrfloor: [EmpheqMethods.EmpheqMO, "⌋"],
      empheqlceil: [EmpheqMethods.EmpheqMO, "⌈"],
      empheqrceil: [EmpheqMethods.EmpheqMO, "⌉"],
      empheqbiglbrace: [EmpheqMethods.EmpheqMO, "{"],
      empheqbigrbrace: [EmpheqMethods.EmpheqMO, "}"],
      empheqbiglbrack: [EmpheqMethods.EmpheqMO, "["],
      empheqbigrbrack: [EmpheqMethods.EmpheqMO, "]"],
      empheqbiglangle: [EmpheqMethods.EmpheqMO, "⟨"],
      empheqbigrangle: [EmpheqMethods.EmpheqMO, "⟩"],
      empheqbiglparen: [EmpheqMethods.EmpheqMO, "("],
      empheqbigrparen: [EmpheqMethods.EmpheqMO, ")"],
      empheqbiglvert: [EmpheqMethods.EmpheqMO, "|"],
      empheqbigrvert: [EmpheqMethods.EmpheqMO, "|"],
      empheqbiglVert: [EmpheqMethods.EmpheqMO, "‖"],
      empheqbigrVert: [EmpheqMethods.EmpheqMO, "‖"],
      empheqbiglfloor: [EmpheqMethods.EmpheqMO, "⌊"],
      empheqbigrfloor: [EmpheqMethods.EmpheqMO, "⌋"],
      empheqbiglceil: [EmpheqMethods.EmpheqMO, "⌈"],
      empheqbigrceil: [EmpheqMethods.EmpheqMO, "⌉"],
      empheql: EmpheqMethods.EmpheqDelim,
      empheqr: EmpheqMethods.EmpheqDelim,
      empheqbigl: EmpheqMethods.EmpheqDelim,
      empheqbigr: EmpheqMethods.EmpheqDelim
    });
    EmpheqConfiguration = Configuration.create("empheq", {
      [ConfigurationType.HANDLER]: {
        [HandlerType.MACRO]: ["empheq-macros"],
        [HandlerType.ENVIRONMENT]: ["empheq-env"]
      }
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/centernot/CenternotConfiguration.js
function CenterOver(parser2, name) {
  const arg = "{" + parser2.GetArgument(name) + "}";
  const over = parser2.ParseArg(name);
  const base = new TexParser(arg, parser2.stack.env, parser2.configuration).mml();
  const mml = parser2.create("node", "TeXAtom", [
    new TexParser(arg, parser2.stack.env, parser2.configuration).mml(),
    parser2.create("node", "mpadded", [
      parser2.create("node", "mpadded", [over], {
        width: 0,
        lspace: "-.5width"
      }),
      parser2.create("node", "mphantom", [base])
    ], { width: 0, lspace: "-.5width" })
  ]);
  parser2.configuration.addNode("centerOver", base);
  parser2.Push(mml);
}
function filterCenterOver({ data }) {
  for (const base of data.getList("centerOver")) {
    const texClass = NodeUtil_default.getTexClass(base.childNodes[0].childNodes[0]);
    if (texClass !== null) {
      NodeUtil_default.setProperties(base.parent.parent.parent.parent.parent.parent, {
        texClass
      });
    }
  }
}
var CenternotConfiguration;
var init_CenternotConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/centernot/CenternotConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_TexParser();
    init_NodeUtil();
    init_TokenMap();
    init_BaseMethods();
    new CommandMap("centernot", {
      centerOver: CenterOver,
      centernot: [BaseMethods_default.Macro, "\\centerOver{#1}{{⧸}}", 1]
    });
    CenternotConfiguration = Configuration.create("centernot", {
      [ConfigurationType.HANDLER]: { macro: ["centernot"] },
      [ConfigurationType.POSTPROCESSORS]: [filterCenterOver]
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/gensymb/GensymbConfiguration.js
function mathcharUnit(parser2, mchar) {
  const def2 = mchar.attributes || {};
  def2.mathvariant = TexConstant.Variant.NORMAL;
  def2.class = "MathML-Unit";
  const node = parser2.create("token", "mi", def2, mchar.char);
  parser2.Push(node);
}
var GensymbConfiguration;
var init_GensymbConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/gensymb/GensymbConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_TexConstants();
    init_TokenMap();
    new CharacterMap("gensymb-symbols", mathcharUnit, {
      ohm: "Ω",
      degree: "°",
      celsius: "℃",
      perthousand: "‰",
      micro: "µ"
    });
    GensymbConfiguration = Configuration.create("gensymb", {
      [ConfigurationType.HANDLER]: { [HandlerType.MACRO]: ["gensymb-symbols"] }
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/upgreek/UpgreekConfiguration.js
function mathchar0miNormal(parser2, mchar) {
  const def2 = mchar.attributes || {};
  def2.mathvariant = TexConstant.Variant.NORMAL;
  const node = parser2.create("token", "mi", def2, mchar.char);
  parser2.Push(node);
}
var UpgreekConfiguration;
var init_UpgreekConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/upgreek/UpgreekConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_TokenMap();
    init_TexConstants();
    new CharacterMap("upgreek", mathchar0miNormal, JSON.parse(`{
 "upalpha":"α","upbeta":"β","upgamma":"γ","updelta":"δ","upepsilon":"ϵ","upzeta":"ζ","upeta":"η","uptheta":"θ","upiota":"ι","upkappa":"κ","uplambda":"λ","upmu":"μ","upnu":"ν","upxi":"ξ","upomicron":"ο",
 "uppi":"π","uprho":"ρ","upsigma":"σ","uptau":"τ","upupsilon":"υ","upphi":"ϕ","upchi":"χ","uppsi":"ψ","upomega":"ω","upvarepsilon":"ε","upvartheta":"ϑ","upvarpi":"ϖ","upvarrho":"ϱ","upvarsigma":"ς",
 "upvarphi":"φ","Upgamma":"Γ","Updelta":"Δ","Uptheta":"Θ","Uplambda":"Λ","Upxi":"Ξ","Uppi":"Π","Upsigma":"Σ","Upupsilon":"Υ","Upphi":"Φ","Uppsi":"Ψ","Upomega":"Ω"
}`));
    UpgreekConfiguration = Configuration.create("upgreek", {
      [ConfigurationType.HANDLER]: { [HandlerType.MACRO]: ["upgreek"] }
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/textcomp/TextcompMappings.js
function Insert(parser2, name, c, font) {
  if (parser2 instanceof TextParser) {
    if (!font) {
      TextMacrosMethods.Insert(parser2, name, c);
      return;
    }
    parser2.saveText();
  }
  parser2.Push(ParseUtil.internalText(parser2, c, font ? { mathvariant: font } : {}));
}
var init_TextcompMappings = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/textcomp/TextcompMappings.js"() {
    init_TokenMap();
    init_TexConstants();
    init_TextMacrosMethods();
    init_ParseUtil();
    init_TextParser();
    new CommandMap("textcomp-macros", {
      textasciicircum: [Insert, "^"],
      textasciitilde: [Insert, "~"],
      textasteriskcentered: [Insert, "*"],
      textbackslash: [Insert, "\\"],
      textbar: [Insert, "|"],
      textbraceleft: [Insert, "{"],
      textbraceright: [Insert, "}"],
      textbullet: [Insert, "•"],
      textdagger: [Insert, "†"],
      textdaggerdbl: [Insert, "‡"],
      textellipsis: [Insert, "…"],
      textemdash: [Insert, "—"],
      textendash: [Insert, "–"],
      textexclamdown: [Insert, "¡"],
      textgreater: [Insert, ">"],
      textless: [Insert, "<"],
      textordfeminine: [Insert, "ª"],
      textordmasculine: [Insert, "º"],
      textparagraph: [Insert, "¶"],
      textperiodcentered: [Insert, "·"],
      textquestiondown: [Insert, "¿"],
      textquotedblleft: [Insert, "“"],
      textquotedblright: [Insert, "”"],
      textquoteleft: [Insert, "‘"],
      textquoteright: [Insert, "’"],
      textsection: [Insert, "§"],
      textunderscore: [Insert, "_"],
      textvisiblespace: [Insert, "␣"],
      textacutedbl: [Insert, "˝"],
      textasciiacute: [Insert, "´"],
      textasciibreve: [Insert, "˘"],
      textasciicaron: [Insert, "ˇ"],
      textasciidieresis: [Insert, "¨"],
      textasciimacron: [Insert, "¯"],
      textgravedbl: [Insert, "˵"],
      texttildelow: [Insert, "˷"],
      textbaht: [Insert, "฿"],
      textcent: [Insert, "¢"],
      textcolonmonetary: [Insert, "₡"],
      textcurrency: [Insert, "¤"],
      textdollar: [Insert, "$"],
      textdong: [Insert, "₫"],
      texteuro: [Insert, "€"],
      textflorin: [Insert, "ƒ"],
      textguarani: [Insert, "₲"],
      textlira: [Insert, "₤"],
      textnaira: [Insert, "₦"],
      textpeso: [Insert, "₱"],
      textsterling: [Insert, "£"],
      textwon: [Insert, "₩"],
      textyen: [Insert, "¥"],
      textcircledP: [Insert, "℗"],
      textcompwordmark: [Insert, "\u200C"],
      textcopyleft: [Insert, "🄯"],
      textcopyright: [Insert, "©"],
      textregistered: [Insert, "®"],
      textservicemark: [Insert, "℠"],
      texttrademark: [Insert, "™"],
      textbardbl: [Insert, "‖"],
      textbigcircle: [Insert, "◯"],
      textblank: [Insert, "␢"],
      textbrokenbar: [Insert, "¦"],
      textdiscount: [Insert, "⁒"],
      textestimated: [Insert, "℮"],
      textinterrobang: [Insert, "‽"],
      textinterrobangdown: [Insert, "⸘"],
      textmusicalnote: [Insert, "♪"],
      textnumero: [Insert, "№"],
      textopenbullet: [Insert, "◦"],
      textpertenthousand: [Insert, "‱"],
      textperthousand: [Insert, "‰"],
      textrecipe: [Insert, "℞"],
      textreferencemark: [Insert, "※"],
      textlangle: [Insert, "〈"],
      textrangle: [Insert, "〉"],
      textlbrackdbl: [Insert, "⟦"],
      textrbrackdbl: [Insert, "⟧"],
      textlquill: [Insert, "⁅"],
      textrquill: [Insert, "⁆"],
      textcelsius: [Insert, "℃"],
      textdegree: [Insert, "°"],
      textdiv: [Insert, "÷"],
      textdownarrow: [Insert, "↓"],
      textfractionsolidus: [Insert, "⁄"],
      textleftarrow: [Insert, "←"],
      textlnot: [Insert, "¬"],
      textmho: [Insert, "℧"],
      textminus: [Insert, "−"],
      textmu: [Insert, "µ"],
      textohm: [Insert, "Ω"],
      textonehalf: [Insert, "½"],
      textonequarter: [Insert, "¼"],
      textonesuperior: [Insert, "¹"],
      textpm: [Insert, "±"],
      textrightarrow: [Insert, "→"],
      textsurd: [Insert, "√"],
      textthreequarters: [Insert, "¾"],
      textthreesuperior: [Insert, "³"],
      texttimes: [Insert, "×"],
      texttwosuperior: [Insert, "²"],
      textuparrow: [Insert, "↑"],
      textborn: [Insert, "*"],
      textdied: [Insert, "†"],
      textdivorced: [Insert, "⚮"],
      textmarried: [Insert, "⚭"],
      textcentoldstyle: [Insert, "¢", TexConstant.Variant.OLDSTYLE],
      textdollaroldstyle: [Insert, "$", TexConstant.Variant.OLDSTYLE],
      textzerooldstyle: [Insert, "0", TexConstant.Variant.OLDSTYLE],
      textoneoldstyle: [Insert, "1", TexConstant.Variant.OLDSTYLE],
      texttwooldstyle: [Insert, "2", TexConstant.Variant.OLDSTYLE],
      textthreeoldstyle: [Insert, "3", TexConstant.Variant.OLDSTYLE],
      textfouroldstyle: [Insert, "4", TexConstant.Variant.OLDSTYLE],
      textfiveoldstyle: [Insert, "5", TexConstant.Variant.OLDSTYLE],
      textsixoldstyle: [Insert, "6", TexConstant.Variant.OLDSTYLE],
      textsevenoldstyle: [Insert, "7", TexConstant.Variant.OLDSTYLE],
      texteightoldstyle: [Insert, "8", TexConstant.Variant.OLDSTYLE],
      textnineoldstyle: [Insert, "9", TexConstant.Variant.OLDSTYLE]
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/textcomp/TextcompConfiguration.js
var TextcompConfiguration;
var init_TextcompConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/textcomp/TextcompConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_TextcompMappings();
    Configuration.create("text-textcomp", {
      [ConfigurationType.PARSER]: "text",
      [ConfigurationType.HANDLER]: { [HandlerType.MACRO]: ["textcomp-macros"] }
    });
    TextcompConfiguration = Configuration.create("textcomp", {
      [ConfigurationType.HANDLER]: { macro: ["textcomp-macros"] },
      config(_config, jax) {
        const textmacros = jax.parseOptions.packageData.get("textmacros");
        if (textmacros) {
          textmacros.parseOptions.options.textmacros.packages.push("text-textcomp");
          textmacros.textConf.add("text-textcomp", jax, {});
        }
      }
    });
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/accents.js
var init_accents = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/accents.js"() {
    init_svg();
    init_Direction();
    MathJaxNewcmFont.dynamicSetup("", "accents", JSON.parse(__kittexJson19 + __kittexJson20), {
      785: {
        dir: H,
        sizes: [0.376, 0.658, 0.784, 0.937, 1.12, 1.341, 1.604, 1.92]
      },
      812: {
        dir: H,
        sizes: [0.366, 0.644, 0.768, 0.919, 1.1, 1.32, 1.581, 1.896]
      },
      813: {
        dir: H,
        sizes: [0.366, 0.644, 0.768, 0.919, 1.1, 1.32, 1.581, 1.896]
      },
      814: {
        dir: H,
        sizes: [0.376, 0.658, 0.784, 0.937, 1.12, 1.341, 1.604, 1.92]
      },
      815: {
        dir: H,
        sizes: [0.376, 0.658, 0.784, 0.937, 1.12, 1.341, 1.604, 1.92]
      },
      816: {
        dir: H,
        sizes: [0.37, 0.652, 0.778, 0.931, 1.115, 1.335, 1.599, 1.915]
      },
      818: {
        dir: H,
        sizes: [0.392, 0.568],
        stretch: [0, 818],
        stretchv: [0, 1],
        HDW: [-0.103, 0.143, 0],
        hd: [-0.103, 0.143]
      },
      819: {
        dir: H,
        sizes: [0.392, 0.568],
        stretch: [0, 819],
        stretchv: [0, 1],
        HDW: [-0.103, 0.293, 0],
        hd: [-0.103, 0.293]
      },
      831: {
        dir: H,
        sizes: [0.392, 0.568],
        stretch: [0, 831],
        stretchv: [0, 1],
        HDW: [0.82, -0.63, 0],
        hd: [0.82, -0.63]
      },
      8425: {
        dir: H,
        sizes: [0.36, 0.735, 1.11, 1.485, 1.86, 2.235, 2.61, 2.985],
        schar: [8425, 9140],
        stretch: [9140, 9140, 9140],
        stretchv: [3, 1, 4],
        HDW: [0.772, -0.504, 0],
        hd: [0.772, -0.706]
      },
      845: {
        dir: H,
        sizes: [0.47, 0.715],
        stretch: [8430, 845, 8431],
        stretchv: [3, 1, 4],
        HDW: [-0.091, 0.281, 0],
        hd: [-0.171, 0.201]
      }
    });
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/arrows.js
var init_arrows = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/arrows.js"() {
    init_svg();
    init_Direction();
    MathJaxNewcmFont.dynamicSetup("", "arrows", JSON.parse(__kittexJson21 + __kittexJson22 + __kittexJson23 + __kittexJson24), {
      10145: {
        dir: H,
        sizes: [0.977, 1.423],
        variants: [0, 2],
        stretch: [0, 11013, 11020],
        stretchv: [0, 1, 4],
        HDW: [0.469, -0.031, 0.977],
        hd: [0.349, -0.151]
      },
      10237: {
        c: 10502,
        dir: H,
        sizes: [0.991, 1.437],
        variants: [0, 0],
        schar: [10502, 10237],
        stretch: [8656, 8656, 10502],
        stretchv: [3, 1, 4],
        HDW: [0.52, 0.021, 0.991],
        hd: [0.369, -0.131]
      },
      10238: {
        c: 10503,
        dir: H,
        sizes: [0.991, 1.437],
        variants: [0, 0],
        schar: [10503, 10238],
        stretch: [10503, 8656, 8658],
        stretchv: [3, 1, 4],
        HDW: [0.52, 0.021, 0.991],
        hd: [0.369, -0.131]
      },
      10502: {
        dir: H,
        sizes: [0.991, 1.437],
        variants: [0, 0],
        schar: [10502, 10237],
        stretch: [8656, 8656, 10502],
        stretchv: [3, 1, 4],
        HDW: [0.52, 0.021, 0.991],
        hd: [0.369, -0.131]
      },
      10503: {
        dir: H,
        sizes: [0.991, 1.437],
        variants: [0, 0],
        schar: [10503, 10238],
        stretch: [10503, 8656, 8658],
        stretchv: [3, 1, 4],
        HDW: [0.52, 0.021, 0.991],
        hd: [0.369, -0.131]
      },
      10572: {
        dir: V,
        sizes: [0.911],
        stretch: [10572, 10572, 10572],
        stretchv: [3, 1, 4],
        HDW: [0.706, 0.206, 0.616]
      },
      10573: {
        dir: V,
        sizes: [0.911],
        stretch: [10573, 10572, 10573],
        stretchv: [3, 1, 4],
        HDW: [0.706, 0.206, 0.616]
      },
      10575: {
        dir: V,
        sizes: [0.922],
        stretch: [10572, 10572, 10573],
        stretchv: [3, 1, 4],
        HDW: [0.828, 0.095, 0.616]
      },
      10577: {
        dir: V,
        sizes: [0.922],
        stretch: [10573, 10572, 10572],
        stretchv: [3, 1, 4],
        HDW: [0.828, 0.095, 0.616]
      },
      10588: {
        dir: V,
        sizes: [0.909],
        stretch: [10572, 10572, 8613],
        stretchv: [3, 1, 4],
        HDW: [0.705, 0.205, 0.616]
      },
      10589: {
        dir: V,
        sizes: [0.909],
        stretch: [8615, 10572, 10573],
        stretchv: [3, 1, 4],
        HDW: [0.705, 0.205, 0.616]
      },
      10592: {
        dir: V,
        sizes: [0.909],
        stretch: [10573, 10572, 8613],
        stretchv: [3, 1, 4],
        HDW: [0.705, 0.205, 0.616]
      },
      10593: {
        dir: V,
        sizes: [0.909],
        stretch: [8615, 10572, 10572],
        stretchv: [3, 1, 4],
        HDW: [0.705, 0.205, 0.616]
      },
      11012: {
        dir: H,
        sizes: [1.062, 1.508],
        variants: [0, 2],
        stretch: [8678, 8678, 8680],
        stretchv: [3, 1, 4],
        HDW: [0.52, 0.02, 1.062],
        hd: [0.369, -0.131]
      },
      11013: {
        dir: H,
        sizes: [0.977, 1.423],
        variants: [0, 2],
        stretch: [11013, 11013],
        stretchv: [3, 1],
        HDW: [0.469, -0.031, 0.977],
        hd: [0.349, -0.151]
      },
      11014: {
        dir: V,
        sizes: [0.866, 1.312],
        variants: [0, 2],
        stretch: [11014, 11014],
        stretchv: [3, 1],
        HDW: [0.672, 0.193, 0.612]
      },
      11015: {
        dir: V,
        sizes: [0.866, 1.312],
        variants: [0, 2],
        stretch: [0, 11014, 11015],
        stretchv: [0, 1, 4],
        HDW: [0.693, 0.172, 0.612]
      },
      11020: {
        dir: H,
        sizes: [1.022, 1.468],
        variants: [0, 2],
        stretch: [0, 11013, 11020],
        stretchv: [0, 1, 4],
        HDW: [0.469, -0.031, 1.022],
        hd: [0.349, -0.151]
      },
      11021: {
        dir: V,
        sizes: [0.845, 1.291],
        variants: [0, 2],
        stretch: [11014, 11014, 11015],
        stretchv: [3, 1, 4],
        HDW: [0.672, 0.172, 0.612]
      },
      11057: {
        dir: H,
        sizes: [0.997, 1.463],
        variants: [0, 2],
        stretch: [11057, 8694],
        stretchv: [3, 1],
        HDW: [0.99, 0.49, 0.997],
        hd: [0.751, 0.251]
      },
      8607: {
        dir: V,
        sizes: [0.903, 1.349],
        variants: [0, 2],
        stretch: [8607, 8593],
        stretchv: [3, 1],
        HDW: [0.689, 0.213, 0.5]
      },
      8609: {
        dir: V,
        sizes: [0.903, 1.349],
        variants: [0, 2],
        stretch: [0, 8593, 8609],
        stretchv: [0, 1, 4],
        HDW: [0.713, 0.189, 0.5]
      },
      8613: {
        dir: V,
        sizes: [0.863, 1.329],
        variants: [0, 2],
        stretch: [8593, 8593, 8613],
        stretchv: [3, 1, 4],
        HDW: [0.679, 0.183, 0.5]
      },
      8615: {
        dir: V,
        sizes: [0.863, 1.329],
        variants: [0, 2],
        stretch: [8615, 8593, 8595],
        stretchv: [3, 1, 4],
        HDW: [0.683, 0.179, 0.5]
      },
      8621: {
        dir: H,
        sizes: [0.996, 1.442],
        variants: [0, 2]
      },
      8622: {
        dir: H,
        sizes: [0.996, 1.442],
        variants: [0, 2],
        stretch: [8602, 8592, 8603, 8602],
        stretchv: [3, 1, 4, 1],
        HDW: [0.51, 0.01, 0.996],
        hd: [0.274, -0.226]
      },
      8624: {
        dir: V,
        sizes: [0.859, 1.169],
        variants: [0, 2]
      },
      8625: {
        dir: V,
        sizes: [0.859, 1.169],
        variants: [0, 2]
      },
      8626: {
        dir: V,
        sizes: [0.859, 1.169],
        variants: [0, 2]
      },
      8627: {
        dir: V,
        sizes: [0.859, 1.169],
        variants: [0, 2]
      },
      8662: {
        dir: V,
        sizes: [0.955, 1.421],
        variants: [0, 2]
      },
      8663: {
        dir: V,
        sizes: [0.955, 1.421],
        variants: [0, 2]
      },
      8664: {
        dir: V,
        sizes: [0.955, 1.421],
        variants: [0, 2]
      },
      8665: {
        dir: V,
        sizes: [0.955, 1.421],
        variants: [0, 2]
      },
      8668: {
        dir: H,
        sizes: [0.997, 1.463],
        variants: [0, 0],
        schar: [8668, 11059]
      },
      8669: {
        dir: H,
        sizes: [0.997, 1.463],
        variants: [0, 0],
        schar: [8669, 10239]
      },
      8678: {
        dir: H,
        sizes: [1.05, 1.496],
        variants: [0, 2],
        stretch: [8678, 8678, 8678],
        stretchv: [3, 1, 4],
        HDW: [0.52, 0.02, 1.05],
        hd: [0.369, -0.131]
      },
      8679: {
        dir: V,
        sizes: [0.939, 1.385],
        variants: [0, 2],
        stretch: [8679, 8679, 8679],
        stretchv: [3, 1, 4],
        HDW: [0.725, 0.213, 0.652]
      },
      8680: {
        dir: H,
        sizes: [1.05, 1.496],
        variants: [0, 2],
        stretch: [8680, 8678, 8680],
        stretchv: [3, 1, 4],
        HDW: [0.52, 0.02, 1.05],
        hd: [0.369, -0.131]
      },
      8681: {
        dir: V,
        sizes: [0.939, 1.385],
        variants: [0, 2],
        stretch: [8681, 8679, 8681],
        stretchv: [3, 1, 4],
        HDW: [0.713, 0.225, 0.652]
      },
      8691: {
        dir: V,
        sizes: [0.951, 1.397],
        variants: [0, 2],
        stretch: [8679, 8679, 8681],
        stretchv: [3, 1, 4],
        HDW: [0.725, 0.225, 0.652]
      }
    });
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/calligraphic.js
var init_calligraphic = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/calligraphic.js"() {
    init_svg();
    MathJaxNewcmFont.dynamicSetup("", "calligraphic", JSON.parse(__kittexJson25));
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/double-struck.js
var init_double_struck2 = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/double-struck.js"() {
    init_svg();
    MathJaxNewcmFont.dynamicSetup("", "double-struck", JSON.parse(__kittexJson26));
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/fraktur.js
var init_fraktur2 = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/fraktur.js"() {
    init_svg();
    MathJaxNewcmFont.dynamicSetup("", "fraktur", JSON.parse(__kittexJson27 + __kittexJson28));
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/latin.js
var init_latin = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/latin.js"() {
    init_svg();
    MathJaxNewcmFont.dynamicSetup("", "latin", JSON.parse(__kittexJson29 + __kittexJson30 + __kittexJson31 + __kittexJson32 + __kittexJson33 + __kittexJson34));
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/math.js
var init_math4 = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/math.js"() {
    init_svg();
    MathJaxNewcmFont.dynamicSetup("", "math", JSON.parse(__kittexJson35 + __kittexJson36 + __kittexJson37 + __kittexJson38));
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/monospace.js
var init_monospace2 = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/monospace.js"() {
    init_svg();
    MathJaxNewcmFont.dynamicSetup("", "monospace", JSON.parse(__kittexJson39 + __kittexJson40));
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/sans-serif.js
var init_sans_serif2 = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/sans-serif.js"() {
    init_svg();
    MathJaxNewcmFont.dynamicSetup("", "sans-serif", JSON.parse(__kittexJson41 + __kittexJson42 + __kittexJson43 + __kittexJson44));
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/script.js
var init_script2 = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/script.js"() {
    init_svg();
    MathJaxNewcmFont.dynamicSetup("", "script", JSON.parse(__kittexJson45 + __kittexJson46));
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/shapes.js
var init_shapes = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/shapes.js"() {
    init_svg();
    MathJaxNewcmFont.dynamicSetup("", "shapes", JSON.parse(__kittexJson47 + __kittexJson48));
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/symbols.js
var init_symbols = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/symbols.js"() {
    init_svg();
    init_Direction();
    MathJaxNewcmFont.dynamicSetup("", "symbols", JSON.parse(__kittexJson49 + __kittexJson50 + __kittexJson51), {
      8215: {
        dir: H,
        stretch: [0, 8215],
        HDW: [-0.103, 0.293, 0.504],
        hd: [-0.103, 0.293]
      }
    });
  }
});
// node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/variants.js
var init_variants = __esm({
  "node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/variants.js"() {
    init_svg();
    MathJaxNewcmFont.dynamicSetup("", "variants", JSON.parse(__kittexJson52));
  }
});
// core/src/typeset/fonts.ts
var init_fonts = __esm({
  "core/src/typeset/fonts.ts"() {
    "use strict";
    init_accents();
    init_arrows();
    init_calligraphic();
    init_double_struck2();
    init_fraktur2();
    init_latin();
    init_math4();
    init_monospace2();
    init_sans_serif2();
    init_script2();
    init_shapes();
    init_symbols();
    init_variants();
  }
});
// core/src/typeset/macros.ts
function expand(parser2, tex) {
  parser2.string = ParseUtil.addArgs(parser2, tex, parser2.string.slice(parser2.i));
  parser2.i = 0;
  ParseUtil.checkMaxMacros(parser2);
}
function rememberLabels(labels, limit) {
  for (const [label, info] of Object.entries(labels)) {
    if (!info || info.tag === "???") continue;
    remembered.delete(label);
    remembered.set(label, info.tag);
  }
  while (remembered.size > limit) remembered.delete(remembered.keys().next().value);
}
function reference(parser2, name, eqref) {
  const label = parser2.GetArgument(name).trim();
  const tags = parser2.tags;
  const known = tags.labels[label] ?? tags.allLabels[label];
  const tag3 = known && known.tag !== "???" ? known.tag : remembered.get(label) ?? label;
  const text = eqref ? `(${tag3})` : tag3;
  parser2.Push(parser2.create("node", "mrow", ParseUtil.internalMath(parser2, text)));
}
function smallCaps(parser2, name) {
  const text = parser2.GetArgument(name);
  if (/[\\{}$]/.test(text)) return expand(parser2, `\\text{${text}}`);
  const runs = text.match(/[a-z]+|[^a-z]+/g) ?? [];
  expand(parser2, runs.map((run2) => /^[a-z]/.test(run2) ? `\\text{\\footnotesize ${run2.toUpperCase()}}` : `\\text{${run2}}`).join(""));
}
function siNumber(text) {
  const m = /^\s*([+-]?[\d.,]*)\s*(?:\+-\s*([\d.,]+)\s*)?(?:[eE]\s*([+-]?\d+))?\s*$/.exec(text);
  if (!m || m[1] === "" && m[3] === void 0) return text;
  let out = m[1].replace(/^-/, "-").replace(/,/g, ".");
  if (m[2] !== void 0) out = `(${out} \\pm ${m[2]})`;
  if (m[3] !== void 0) out += `${out === "" ? "" : " \\times "}10^{${m[3].replace(/^\+/, "")}}`;
  return out;
}
function siUnits(text) {
  if (!text.includes("\\")) return `\\mathrm{${text.replace(/\./g, "\\,").replace(/~/g, "\\,")}}`;
  const parts = [];
  let prefix = "";
  let per = false;
  let pre = 1;
  const tokens = text.match(/\\[A-Za-z]+|\{[^{}]*\}|[^\\\s{}]+/g) ?? [];
  for (let i2 = 0; i2 < tokens.length; i2++) {
    const token2 = tokens[i2];
    const cs = token2.startsWith("\\") ? token2.slice(1) : void 0;
    if (cs === void 0) {
      parts.push({ symbol: `\\mathrm{${token2.replace(/^\{|\}$/g, "")}}`, power: per ? -1 : 1 });
      per = false;
    } else if (cs in PREFIXES) {
      prefix += PREFIXES[cs];
    } else if (cs === "per") {
      per = true;
    } else if (cs === "square") {
      pre = 2;
    } else if (cs === "cubic") {
      pre = 3;
    } else if (cs === "squared" || cs === "cubed") {
      const last = parts.at(-1);
      if (last) last.power *= cs === "squared" ? 2 : 3;
    } else if (cs === "tothe" || cs === "raiseto") {
      const n = Number((tokens[++i2] ?? "").replace(/^\{|\}$/g, ""));
      const last = parts.at(-1);
      if (cs === "tothe" && last && Number.isFinite(n)) last.power *= n;
      else if (Number.isFinite(n)) pre = n;
    } else {
      const unit = UNITS2[cs];
      let symbol;
      if (unit === void 0) symbol = `\\${cs}`;
      else if (/^(?:\{|\\%|\\prime)/.test(unit)) symbol = unit;
      else symbol = `\\mathrm{${prefix}${unit}}`;
      parts.push({ symbol, power: (per ? -1 : 1) * pre });
      prefix = "";
      per = false;
      pre = 1;
    }
  }
  return parts.map((part) => part.power === 1 ? part.symbol : `${part.symbol}^{${part.power}}`).join("\\,");
}
function si(parser2, name, withNumber) {
  parser2.GetBrackets(name);
  const number = withNumber ? siNumber(parser2.GetArgument(name)) : "";
  const units = siUnits(parser2.GetArgument(name));
  expand(parser2, withNumber ? `{${number}\\,${units}}` : `{${units}}`);
}
function num(parser2, name) {
  parser2.GetBrackets(name);
  expand(parser2, `{${siNumber(parser2.GetArgument(name))}}`);
}
function relation(parser2, mchar) {
  parser2.Push(parser2.create("token", "mo", { stretchy: false, texClass: TEXCLASS.REL }, mchar.char));
}
var remembered;
var PREFIXES;
var UNITS2;
var ARROW_CHARS;
var ARROW_MACROS;
var MACROS;
var KittexConfiguration;
var KittexTextConfiguration;
var init_macros = __esm({
  "core/src/typeset/macros.ts"() {
    "use strict";
    init_Configuration();
    init_ParseUtil();
    init_TokenMap();
    init_ParseMethods();
    init_BaseMethods();
    init_AmsMethods();
    init_MmlNode();
    remembered = /* @__PURE__ */ new Map();
    PREFIXES = JSON.parse(`{
 "yocto":"y","zepto":"z","atto":"a","femto":"f","pico":"p","nano":"n","micro":"\\\\mu","milli":"m","centi":"c","deci":"d","deca":"da","deka":"da","hecto":"h","kilo":"k","mega":"M","giga":"G","tera":"T",
 "peta":"P","exa":"E","zetta":"Z","yotta":"Y"
}`);
    UNITS2 = JSON.parse(`{
 "meter":"m","metre":"m","second":"s","gram":"g","kilogram":"kg","ampere":"A","kelvin":"K","mole":"mol","candela":"cd","newton":"N","joule":"J","watt":"W","pascal":"Pa","hertz":"Hz","coulomb":"C",
 "volt":"V","ohm":"\\\\Omega","farad":"F","tesla":"T","henry":"H","weber":"Wb","siemens":"S","becquerel":"Bq","gray":"Gy","sievert":"Sv","lumen":"lm","lux":"lx","radian":"rad","steradian":"sr",
 "katal":"kat","liter":"L","litre":"L","minute":"min","hour":"h","day":"d","electronvolt":"eV","dalton":"Da","bar":"bar","angstrom":"\\\\unicode{x212B}","atomicmassunit":"u","astronomicalunit":"au",
 "degreeCelsius":"{}^{\\\\circ}\\\\mathrm{C}","celsius":"{}^{\\\\circ}\\\\mathrm{C}","degree":"{}^{\\\\circ}","arcminute":"\\\\prime","arcsecond":"\\\\prime\\\\prime","percent":"\\\\%","decibel":"dB","bel":"B",
 "neper":"Np","byte":"B","bit":"bit"
}`);
    ARROW_CHARS = {
      mhchemlongleftarrow: "⟵",
      mhchemlongrightarrow: "⟶",
      mhchemlongleftrightarrow: "⟷",
      mhchemlongrightleftharpoons: "⇌",
      mhchemlongRightleftharpoons: "⇌",
      mhchemlongLeftrightharpoons: "⇋",
      mhchemlongleftrightarrows: "⇄",
      mhchemrightarrow: "→",
      mhchemleftarrow: "←",
      mhchemleftrightarrow: "↔"
    };
    ARROW_MACROS = {
      mhchemxrightarrow: [AmsMethods.xArrow, 8594, 5, 10],
      mhchemxleftarrow: [AmsMethods.xArrow, 8592, 10, 5],
      mhchemxleftrightarrow: [AmsMethods.xArrow, 8596, 10, 10],
      mhchemxleftrightarrows: [AmsMethods.xArrow, 8644, 10, 10],
      mhchemxrightleftharpoons: [AmsMethods.xArrow, 8652, 10, 10],
      mhchemxRightleftharpoons: [AmsMethods.xArrow, 8652, 10, 10],
      mhchemxLeftrightharpoons: [AmsMethods.xArrow, 8651, 10, 10]
    };
    MACROS = {
      ref: [reference, false],
      eqref: [reference, true],
      textsc: smallCaps,
      SI: [si, true],
      si: [si, false],
      num,
      // A slash through the letter (centernot's \centerOver), not \not's slash beside it.
      slashed: [BaseMethods_default.Macro, "\\centerOver{#1}{/}", 1],
      bm: [BaseMethods_default.Macro, "\\boldsymbol{#1}", 1],
      mathbbm: [BaseMethods_default.Macro, "\\mathbb{#1}", 1],
      mathbbmss: [BaseMethods_default.Macro, "\\mathbb{#1}", 1],
      mathds: [BaseMethods_default.Macro, "\\mathbb{#1}", 1],
      // LaTeX's own, which work in math there: \emph as italic text, \ensuremath as its argument.
      emph: [BaseMethods_default.Macro, "\\textit{#1}", 1],
      ensuremath: [BaseMethods_default.Macro, "{#1}", 1],
      ...ARROW_MACROS
    };
    new CommandMap("kittex-macros", MACROS);
    new CharacterMap("kittex-chars", ParseMethods_default.mathchar0mo, {
      varointclockwise: ["∲", { largeop: true, symmetric: true }],
      ointctrclockwise: ["∳", { largeop: true, symmetric: true }],
      varointctrclockwise: ["∳", { largeop: true, symmetric: true }],
      ointclockwise: ["∲", { largeop: true, symmetric: true }]
    });
    new CharacterMap("kittex-arrows", relation, ARROW_CHARS);
    KittexConfiguration = Configuration.create("kittex", {
      handler: { macro: ["kittex-chars", "kittex-arrows", "kittex-macros"] },
      priority: 1
    });
    new CommandMap("kittex-text-macros", { ref: [reference, false], eqref: [reference, true] });
    Configuration.create("text-kittex", { parser: "text", handler: { macro: ["kittex-text-macros"] }, priority: 0 });
    KittexTextConfiguration = Configuration.create("kittex-text", {
      config(_config, jax) {
        const textmacros = jax.parseOptions.packageData.get("textmacros");
        if (!textmacros) return;
        textmacros.parseOptions.options.textmacros.packages.push("text-kittex");
        textmacros.textConf.add("text-kittex", jax, {});
      }
    });
  }
});
// core/src/typeset/geometry.ts
function multiply2(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5]
  ];
}
function apply2(m, x2, y) {
  return [m[0] * x2 + m[2] * y + m[4], m[1] * x2 + m[3] * y + m[5]];
}
function translate2(x2, y) {
  return [1, 0, 0, 1, x2, y];
}
function scale(sx, sy) {
  return [sx, 0, 0, sy, 0, 0];
}
function isAxisAligned(m) {
  return m[1] === 0 && m[2] === 0 || m[0] === 0 && m[3] === 0;
}
function mapBox(m, [x0, y0, x1, y1]) {
  const [ax, ay] = apply2(m, x0, y0);
  const [bx, by] = apply2(m, x1, y1);
  return [Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by)];
}
function intersect(a, b) {
  return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
}
function parseTransform(text) {
  let m = (__kittexLate.IDENTITY2?.());
  const re = /(\w+)\s*\(([^)]*)\)/g;
  for (let match = re.exec(text); match; match = re.exec(text)) {
    const name = match[1];
    const v = (match[2].trim().match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    let t;
    switch (name) {
      case "translate":
        t = translate2(v[0] ?? 0, v[1] ?? 0);
        break;
      case "scale":
        t = scale(v[0] ?? 1, v[1] ?? v[0] ?? 1);
        break;
      case "matrix":
        if (v.length !== 6) throw new Error(`bad matrix(${match[2]})`);
        t = v;
        break;
      case "rotate": {
        const a = (v[0] ?? 0) * Math.PI / 180;
        const [cx, cy] = [v[1] ?? 0, v[2] ?? 0];
        const r = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
        t = multiply2(translate2(cx, cy), multiply2(r, translate2(-cx, -cy)));
        break;
      }
      case "skewX":
        t = [1, 0, Math.tan((v[0] ?? 0) * Math.PI / 180), 1, 0, 0];
        break;
      case "skewY":
        t = [1, Math.tan((v[0] ?? 0) * Math.PI / 180), 0, 1, 0, 0];
        break;
      default:
        throw new Error(`unsupported transform ${name}()`);
    }
    m = multiply2(m, t);
  }
  return m;
}
function parsePath(d) {
  const tokens = d.match(/[a-df-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? [];
  const out = [];
  let i2 = 0;
  let cmd = "";
  let [x2, y, sx, sy] = [0, 0, 0, 0];
  let [cx, cy] = [0, 0];
  let last = "";
  while (i2 < tokens.length) {
    const token2 = tokens[i2];
    if (/[a-z]/i.test(token2)) {
      cmd = token2;
      i2++;
      if (cmd === "z" || cmd === "Z") {
        out.push({ c: "Z" });
        [x2, y] = [sx, sy];
        last = "Z";
        continue;
      }
    } else if (!cmd) {
      throw new Error("path data does not start with a command");
    }
    const upper = cmd.toUpperCase();
    const n = (__kittexLate.ARG_COUNT?.())[upper];
    if (n === void 0) throw new Error(`unsupported path command ${cmd}`);
    const v = tokens.slice(i2, i2 + n).map(Number);
    if (v.length < n || v.some(Number.isNaN)) throw new Error("truncated path data");
    i2 += n;
    const rel = cmd !== upper;
    const ax = (k) => v[k] + (rel ? x2 : 0);
    const ay = (k) => v[k] + (rel ? y : 0);
    switch (upper) {
      case "M":
        ;
        [x2, y] = [ax(0), ay(1)];
        [sx, sy] = [x2, y];
        out.push({ c: "M", x: x2, y });
        cmd = rel ? "l" : "L";
        break;
      case "L":
        ;
        [x2, y] = [ax(0), ay(1)];
        out.push({ c: "L", x: x2, y });
        break;
      case "H":
        x2 = v[0] + (rel ? x2 : 0);
        out.push({ c: "L", x: x2, y });
        break;
      case "V":
        y = v[0] + (rel ? y : 0);
        out.push({ c: "L", x: x2, y });
        break;
      case "C":
      case "S": {
        const [x1, y1] = upper === "C" ? [ax(0), ay(1)] : last === "C" ? [2 * x2 - cx, 2 * y - cy] : [x2, y];
        const k = upper === "C" ? 2 : 0;
        const [x22, y2, ex, ey] = [ax(k), ay(k + 1), ax(k + 2), ay(k + 3)];
        out.push({ c: "C", x1, y1, x2: x22, y2, x: ex, y: ey });
        [cx, cy, x2, y] = [x22, y2, ex, ey];
        last = "C";
        continue;
      }
      case "Q":
      case "T": {
        const [qx, qy] = upper === "Q" ? [ax(0), ay(1)] : last === "Q" ? [2 * x2 - cx, 2 * y - cy] : [x2, y];
        const k = upper === "Q" ? 2 : 0;
        const [ex, ey] = [ax(k), ay(k + 1)];
        out.push({ c: "C", x1: x2 + 2 / 3 * (qx - x2), y1: y + 2 / 3 * (qy - y), x2: ex + 2 / 3 * (qx - ex), y2: ey + 2 / 3 * (qy - ey), x: ex, y: ey });
        [cx, cy, x2, y] = [qx, qy, ex, ey];
        last = "Q";
        continue;
      }
      case "A":
        ;
        [x2, y] = [ax(5), ay(6)];
        out.push({ c: "L", x: x2, y });
        break;
    }
    last = upper;
  }
  return out;
}
function flatten(segments, m = (__kittexLate.IDENTITY2?.()), steps = 8) {
  const lines2 = [];
  let current;
  let [x2, y, sx, sy] = [0, 0, 0, 0];
  for (const s of segments) {
    if (s.c === "M") {
      current = { points: [apply2(m, s.x, s.y)], closed: false };
      lines2.push(current);
      [x2, y, sx, sy] = [s.x, s.y, s.x, s.y];
      continue;
    }
    if (!current) {
      current = { points: [apply2(m, x2, y)], closed: false };
      lines2.push(current);
    }
    if (s.c === "Z") {
      current.closed = true;
      current = void 0;
      [x2, y] = [sx, sy];
    } else if (s.c === "L") {
      current.points.push(apply2(m, s.x, s.y));
      [x2, y] = [s.x, s.y];
    } else {
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const u = 1 - t;
        const px2 = u * u * u * x2 + 3 * u * u * t * s.x1 + 3 * u * t * t * s.x2 + t * t * t * s.x;
        const py = u * u * u * y + 3 * u * u * t * s.y1 + 3 * u * t * t * s.y2 + t * t * t * s.y;
        current.points.push(apply2(m, px2, py));
      }
      ;
      [x2, y] = [s.x, s.y];
    }
  }
  return lines2;
}
function clipPolygon(polygon, [x0, y0, x1, y1]) {
  let pts = polygon;
  const edges = [
    [(p) => p[0] >= x0, (a, b) => lerpAt(a, b, 0, x0)],
    [(p) => p[0] <= x1, (a, b) => lerpAt(a, b, 0, x1)],
    [(p) => p[1] >= y0, (a, b) => lerpAt(a, b, 1, y0)],
    [(p) => p[1] <= y1, (a, b) => lerpAt(a, b, 1, y1)]
  ];
  for (const [inside, cross] of edges) {
    if (pts.length === 0) break;
    const next = [];
    for (let i2 = 0; i2 < pts.length; i2++) {
      const a = pts[(i2 + pts.length - 1) % pts.length];
      const b = pts[i2];
      if (inside(b)) {
        if (!inside(a)) next.push(cross(a, b));
        next.push(b);
      } else if (inside(a)) {
        next.push(cross(a, b));
      }
    }
    pts = next;
  }
  return pts;
}
function lerpAt(a, b, axis, value) {
  const t = (value - a[axis]) / (b[axis] - a[axis]);
  return axis === 0 ? [value, a[1] + t * (b[1] - a[1])] : [a[0] + t * (b[0] - a[0]), value];
}
function signedArea2(polygon) {
  let area2 = 0;
  for (let i2 = 0; i2 < polygon.length; i2++) {
    const [ax, ay] = polygon[i2];
    const [bx, by] = polygon[(i2 + 1) % polygon.length];
    area2 += ax * by - bx * ay;
  }
  return area2 / 2;
}
export{signedArea2,scale,multiply2,parseTransform,flatten,parsePath,translate2,isAxisAligned,mapBox,intersect,apply2,clipPolygon,EmpheqUtil,rememberLabels,init_MhchemConfiguration,init_AmsCdConfiguration,init_EmpheqConfiguration,init_CenternotConfiguration,init_GensymbConfiguration,init_UpgreekConfiguration,init_TextcompConfiguration,init_EmpheqUtil,init_fonts,init_macros};
