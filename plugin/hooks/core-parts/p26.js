import{__esm,init_TokenMap,init_PhysicsMethods,init_TexConstants,init_ParseMethods,init_MmlNode,CommandMap,PhysicsMethods_default,TexConstant,CharacterMap,ParseMethods_default,EnvironmentMap,MacroMap,TEXCLASS,init_HandlerTypes,init_Configuration,init_PhysicsItems,Configuration,ConfigurationType,HandlerType,AutoOpen,init_TexParser,init_TexError,init_ParseUtil,init_NodeUtil,init_BaseItems,TexParser,ParseUtil,StopItem,StyleItem,AbstractMmlNode,NodeUtil_default,TexError_default,init_Retries,init_BaseMethods,retryAfter,BaseMethods_default,init_lengths,MATHSPACE,init_ParseOptions,init_Tags,StartItem,MmlItem,ParserConfiguration,ParseOptions_default,TagsFactory,init_UnitUtil,init_Entities,init_BaseConfiguration,UnitUtil,numeric,Other}from'./p25.js';export*from'./p25.js';
// node_modules/@mathjax/src/mjs/input/tex/physics/PhysicsMappings.js
var init_PhysicsMappings = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/physics/PhysicsMappings.js"() {
    init_TokenMap();
    init_PhysicsMethods();
    init_TexConstants();
    init_ParseMethods();
    init_MmlNode();
    new CommandMap("Physics-automatic-bracing-macros", {
      quantity: PhysicsMethods_default.Quantity,
      qty: PhysicsMethods_default.Quantity,
      pqty: [PhysicsMethods_default.Quantity, "(", ")", true],
      bqty: [PhysicsMethods_default.Quantity, "[", "]", true],
      vqty: [PhysicsMethods_default.Quantity, "|", "|", true],
      Bqty: [PhysicsMethods_default.Quantity, "\\{", "\\}", true],
      absolutevalue: [PhysicsMethods_default.Quantity, "|", "|", true],
      abs: [PhysicsMethods_default.Quantity, "|", "|", true],
      norm: [PhysicsMethods_default.Quantity, "\\|", "\\|", true],
      evaluated: PhysicsMethods_default.Eval,
      eval: PhysicsMethods_default.Eval,
      order: [
        PhysicsMethods_default.Quantity,
        "(",
        ")",
        true,
        "O",
        TexConstant.Variant.CALLIGRAPHIC
      ],
      commutator: PhysicsMethods_default.Commutator,
      comm: PhysicsMethods_default.Commutator,
      anticommutator: [PhysicsMethods_default.Commutator, "\\{", "\\}"],
      acomm: [PhysicsMethods_default.Commutator, "\\{", "\\}"],
      poissonbracket: [PhysicsMethods_default.Commutator, "\\{", "\\}"],
      pb: [PhysicsMethods_default.Commutator, "\\{", "\\}"]
    });
    new CharacterMap("Physics-vector-mo", ParseMethods_default.mathchar0mo, {
      dotproduct: ["⋅", { mathvariant: TexConstant.Variant.BOLD }],
      vdot: ["⋅", { mathvariant: TexConstant.Variant.BOLD }],
      crossproduct: "×",
      cross: "×",
      cp: "×",
      gradientnabla: ["∇", { mathvariant: TexConstant.Variant.BOLD }],
      divsymbol: "÷",
      divisionsymbol: "÷"
    });
    new CharacterMap("Physics-vector-mi", ParseMethods_default.mathchar0mi, {
      real: ["ℜ", { mathvariant: TexConstant.Variant.NORMAL }],
      imaginary: ["ℑ", { mathvariant: TexConstant.Variant.NORMAL }]
    });
    new CommandMap("Physics-vector-macros", {
      vnabla: PhysicsMethods_default.Vnabla,
      vectorbold: PhysicsMethods_default.VectorBold,
      vb: PhysicsMethods_default.VectorBold,
      vectorarrow: [PhysicsMethods_default.StarMacro, 1, "\\vec{\\vb", "{#1}}"],
      va: [PhysicsMethods_default.StarMacro, 1, "\\vec{\\vb", "{#1}}"],
      vectorunit: [PhysicsMethods_default.StarMacro, 1, "\\hat{\\vb", "{#1}}"],
      vu: [PhysicsMethods_default.StarMacro, 1, "\\hat{\\vb", "{#1}}"],
      gradient: [PhysicsMethods_default.OperatorApplication, "\\vnabla", "(", "["],
      grad: [PhysicsMethods_default.OperatorApplication, "\\vnabla", "(", "["],
      divergence: [PhysicsMethods_default.VectorOperator, "\\vnabla\\vdot", "(", "["],
      div: [PhysicsMethods_default.VectorOperator, "\\vnabla\\vdot", "(", "["],
      curl: [PhysicsMethods_default.VectorOperator, "\\vnabla\\crossproduct", "(", "["],
      laplacian: [PhysicsMethods_default.OperatorApplication, "\\nabla^2", "(", "["]
    });
    new CommandMap("Physics-expressions-macros", {
      sin: PhysicsMethods_default.Expression,
      sinh: PhysicsMethods_default.Expression,
      arcsin: PhysicsMethods_default.Expression,
      asin: PhysicsMethods_default.Expression,
      cos: PhysicsMethods_default.Expression,
      cosh: PhysicsMethods_default.Expression,
      arccos: PhysicsMethods_default.Expression,
      acos: PhysicsMethods_default.Expression,
      tan: PhysicsMethods_default.Expression,
      tanh: PhysicsMethods_default.Expression,
      arctan: PhysicsMethods_default.Expression,
      atan: PhysicsMethods_default.Expression,
      csc: PhysicsMethods_default.Expression,
      csch: PhysicsMethods_default.Expression,
      arccsc: PhysicsMethods_default.Expression,
      acsc: PhysicsMethods_default.Expression,
      sec: PhysicsMethods_default.Expression,
      sech: PhysicsMethods_default.Expression,
      arcsec: PhysicsMethods_default.Expression,
      asec: PhysicsMethods_default.Expression,
      cot: PhysicsMethods_default.Expression,
      coth: PhysicsMethods_default.Expression,
      arccot: PhysicsMethods_default.Expression,
      acot: PhysicsMethods_default.Expression,
      exp: [PhysicsMethods_default.Expression, false],
      log: PhysicsMethods_default.Expression,
      ln: PhysicsMethods_default.Expression,
      det: [PhysicsMethods_default.Expression, false],
      Pr: [PhysicsMethods_default.Expression, false],
      tr: [PhysicsMethods_default.Expression, false],
      trace: [PhysicsMethods_default.Expression, false, "tr"],
      Tr: [PhysicsMethods_default.Expression, false],
      Trace: [PhysicsMethods_default.Expression, false, "Tr"],
      rank: PhysicsMethods_default.NamedFn,
      erf: [PhysicsMethods_default.Expression, false],
      Residue: [PhysicsMethods_default.Macro, "\\mathrm{Res}"],
      Res: [PhysicsMethods_default.OperatorApplication, "\\Residue", "(", "[", "{"],
      principalvalue: [PhysicsMethods_default.OperatorApplication, "{\\cal P}"],
      pv: [PhysicsMethods_default.OperatorApplication, "{\\cal P}"],
      PV: [PhysicsMethods_default.OperatorApplication, "{\\rm P.V.}"],
      Re: [PhysicsMethods_default.OperatorApplication, "\\mathrm{Re}", "{"],
      Im: [PhysicsMethods_default.OperatorApplication, "\\mathrm{Im}", "{"],
      sine: [PhysicsMethods_default.NamedFn, "sin"],
      hypsine: [PhysicsMethods_default.NamedFn, "sinh"],
      arcsine: [PhysicsMethods_default.NamedFn, "arcsin"],
      asine: [PhysicsMethods_default.NamedFn, "asin"],
      cosine: [PhysicsMethods_default.NamedFn, "cos"],
      hypcosine: [PhysicsMethods_default.NamedFn, "cosh"],
      arccosine: [PhysicsMethods_default.NamedFn, "arccos"],
      acosine: [PhysicsMethods_default.NamedFn, "acos"],
      tangent: [PhysicsMethods_default.NamedFn, "tan"],
      hyptangent: [PhysicsMethods_default.NamedFn, "tanh"],
      arctangent: [PhysicsMethods_default.NamedFn, "arctan"],
      atangent: [PhysicsMethods_default.NamedFn, "atan"],
      cosecant: [PhysicsMethods_default.NamedFn, "csc"],
      hypcosecant: [PhysicsMethods_default.NamedFn, "csch"],
      arccosecant: [PhysicsMethods_default.NamedFn, "arccsc"],
      acosecant: [PhysicsMethods_default.NamedFn, "acsc"],
      secant: [PhysicsMethods_default.NamedFn, "sec"],
      hypsecant: [PhysicsMethods_default.NamedFn, "sech"],
      arcsecant: [PhysicsMethods_default.NamedFn, "arcsec"],
      asecant: [PhysicsMethods_default.NamedFn, "asec"],
      cotangent: [PhysicsMethods_default.NamedFn, "cot"],
      hypcotangent: [PhysicsMethods_default.NamedFn, "coth"],
      arccotangent: [PhysicsMethods_default.NamedFn, "arccot"],
      acotangent: [PhysicsMethods_default.NamedFn, "acot"],
      exponential: [PhysicsMethods_default.NamedFn, "exp"],
      logarithm: [PhysicsMethods_default.NamedFn, "log"],
      naturallogarithm: [PhysicsMethods_default.NamedFn, "ln"],
      determinant: [PhysicsMethods_default.NamedFn, "det"],
      Probability: [PhysicsMethods_default.NamedFn, "Pr"]
    });
    new CommandMap("Physics-quick-quad-macros", {
      qqtext: PhysicsMethods_default.Qqtext,
      qq: PhysicsMethods_default.Qqtext,
      qcomma: [PhysicsMethods_default.Macro, "\\qqtext*{,}"],
      qc: [PhysicsMethods_default.Macro, "\\qqtext*{,}"],
      qcc: [PhysicsMethods_default.Qqtext, "c.c."],
      qif: [PhysicsMethods_default.Qqtext, "if"],
      qthen: [PhysicsMethods_default.Qqtext, "then"],
      qelse: [PhysicsMethods_default.Qqtext, "else"],
      qotherwise: [PhysicsMethods_default.Qqtext, "otherwise"],
      qunless: [PhysicsMethods_default.Qqtext, "unless"],
      qgiven: [PhysicsMethods_default.Qqtext, "given"],
      qusing: [PhysicsMethods_default.Qqtext, "using"],
      qassume: [PhysicsMethods_default.Qqtext, "assume"],
      qsince: [PhysicsMethods_default.Qqtext, "since"],
      qlet: [PhysicsMethods_default.Qqtext, "let"],
      qfor: [PhysicsMethods_default.Qqtext, "for"],
      qall: [PhysicsMethods_default.Qqtext, "all"],
      qeven: [PhysicsMethods_default.Qqtext, "even"],
      qodd: [PhysicsMethods_default.Qqtext, "odd"],
      qinteger: [PhysicsMethods_default.Qqtext, "integer"],
      qand: [PhysicsMethods_default.Qqtext, "and"],
      qor: [PhysicsMethods_default.Qqtext, "or"],
      qas: [PhysicsMethods_default.Qqtext, "as"],
      qin: [PhysicsMethods_default.Qqtext, "in"]
    });
    new CommandMap("Physics-derivative-macros", {
      diffd: PhysicsMethods_default.DiffD,
      flatfrac: [PhysicsMethods_default.Macro, "\\left.#1\\middle/#2\\right.", 2],
      differential: [PhysicsMethods_default.Differential, "\\diffd"],
      dd: [PhysicsMethods_default.Differential, "\\diffd"],
      variation: [PhysicsMethods_default.Differential, "\\delta"],
      var: [PhysicsMethods_default.Differential, "\\delta"],
      derivative: [PhysicsMethods_default.Derivative, 2, "\\diffd"],
      dv: [PhysicsMethods_default.Derivative, 2, "\\diffd"],
      partialderivative: [PhysicsMethods_default.Derivative, 3, "\\partial"],
      pderivative: [PhysicsMethods_default.Derivative, 3, "\\partial"],
      pdv: [PhysicsMethods_default.Derivative, 3, "\\partial"],
      functionalderivative: [PhysicsMethods_default.Derivative, 2, "\\delta"],
      fderivative: [PhysicsMethods_default.Derivative, 2, "\\delta"],
      fdv: [PhysicsMethods_default.Derivative, 2, "\\delta"]
    });
    new CommandMap("Physics-bra-ket-macros", {
      bra: PhysicsMethods_default.Bra,
      ket: PhysicsMethods_default.Ket,
      innerproduct: PhysicsMethods_default.BraKet,
      ip: PhysicsMethods_default.BraKet,
      braket: PhysicsMethods_default.BraKet,
      outerproduct: PhysicsMethods_default.KetBra,
      dyad: PhysicsMethods_default.KetBra,
      ketbra: PhysicsMethods_default.KetBra,
      op: PhysicsMethods_default.KetBra,
      expectationvalue: PhysicsMethods_default.Expectation,
      expval: PhysicsMethods_default.Expectation,
      ev: PhysicsMethods_default.Expectation,
      matrixelement: PhysicsMethods_default.MatrixElement,
      matrixel: PhysicsMethods_default.MatrixElement,
      mel: PhysicsMethods_default.MatrixElement
    });
    new CommandMap("Physics-matrix-macros", {
      matrixquantity: PhysicsMethods_default.MatrixQuantity,
      mqty: PhysicsMethods_default.MatrixQuantity,
      pmqty: [PhysicsMethods_default.Macro, "\\mqty(#1)", 1],
      Pmqty: [PhysicsMethods_default.Macro, "\\mqty*(#1)", 1],
      bmqty: [PhysicsMethods_default.Macro, "\\mqty[#1]", 1],
      vmqty: [PhysicsMethods_default.Macro, "\\mqty|#1|", 1],
      smallmatrixquantity: [PhysicsMethods_default.MatrixQuantity, true],
      smqty: [PhysicsMethods_default.MatrixQuantity, true],
      spmqty: [PhysicsMethods_default.Macro, "\\smqty(#1)", 1],
      sPmqty: [PhysicsMethods_default.Macro, "\\smqty*(#1)", 1],
      sbmqty: [PhysicsMethods_default.Macro, "\\smqty[#1]", 1],
      svmqty: [PhysicsMethods_default.Macro, "\\smqty|#1|", 1],
      matrixdeterminant: [PhysicsMethods_default.Macro, "\\vmqty{#1}", 1],
      mdet: [PhysicsMethods_default.Macro, "\\vmqty{#1}", 1],
      smdet: [PhysicsMethods_default.Macro, "\\svmqty{#1}", 1],
      identitymatrix: PhysicsMethods_default.IdentityMatrix,
      imat: PhysicsMethods_default.IdentityMatrix,
      xmatrix: PhysicsMethods_default.XMatrix,
      xmat: PhysicsMethods_default.XMatrix,
      zeromatrix: [PhysicsMethods_default.Macro, "\\xmat{0}{#1}{#2}", 2],
      zmat: [PhysicsMethods_default.Macro, "\\xmat{0}{#1}{#2}", 2],
      paulimatrix: PhysicsMethods_default.PauliMatrix,
      pmat: PhysicsMethods_default.PauliMatrix,
      diagonalmatrix: PhysicsMethods_default.DiagonalMatrix,
      dmat: PhysicsMethods_default.DiagonalMatrix,
      antidiagonalmatrix: [PhysicsMethods_default.DiagonalMatrix, true],
      admat: [PhysicsMethods_default.DiagonalMatrix, true]
    });
    new EnvironmentMap("Physics-aux-envs", ParseMethods_default.environment, {
      smallmatrix: [
        PhysicsMethods_default.Array,
        null,
        null,
        null,
        "c",
        "0.333em",
        ".2em",
        "S",
        1
      ]
    });
    new MacroMap("Physics-characters", {
      "|": [PhysicsMethods_default.AutoClose, TEXCLASS.ORD],
      ")": PhysicsMethods_default.AutoClose,
      "]": PhysicsMethods_default.AutoClose
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/physics/PhysicsConfiguration.js
var PhysicsConfiguration;
var init_PhysicsConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/physics/PhysicsConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_PhysicsItems();
    init_PhysicsMappings();
    PhysicsConfiguration = Configuration.create("physics", {
      [ConfigurationType.HANDLER]: {
        macro: [
          "Physics-automatic-bracing-macros",
          "Physics-vector-macros",
          "Physics-vector-mo",
          "Physics-vector-mi",
          "Physics-derivative-macros",
          "Physics-expressions-macros",
          "Physics-quick-quad-macros",
          "Physics-bra-ket-macros",
          "Physics-matrix-macros"
        ],
        [HandlerType.CHARACTER]: ["Physics-characters"],
        [HandlerType.ENVIRONMENT]: ["Physics-aux-envs"]
      },
      [ConfigurationType.ITEMS]: {
        [AutoOpen.prototype.kind]: AutoOpen
      },
      [ConfigurationType.OPTIONS]: {
        physics: {
          italicdiff: false,
          arrowdel: false
        }
      }
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/textmacros/TextParser.js
var TextParser;
var init_TextParser = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/textmacros/TextParser.js"() {
    init_TexParser();
    init_TexError();
    init_ParseUtil();
    init_MmlNode();
    init_NodeUtil();
    init_BaseItems();
    TextParser = class _TextParser extends TexParser {
      get texParser() {
        return this.configuration.packageData.get("textmacros").texParser;
      }
      get tags() {
        return this.texParser.tags;
      }
      constructor(text, env, configuration, level) {
        super(text, env, configuration);
        this.level = level;
      }
      mml() {
        this.copyLists();
        this.configuration.popParser();
        return this.level != null ? this.create("node", "mstyle", this.nodes, {
          displaystyle: false,
          scriptlevel: this.level
        }) : this.nodes.length === 1 ? this.nodes[0] : this.create("node", "mrow", this.nodes);
      }
      copyLists() {
        const parseOptions = this.texParser.configuration;
        for (const [name, list3] of Object.entries(this.configuration.nodeLists)) {
          for (const node of list3) {
            parseOptions.addNode(name, node);
          }
        }
        this.configuration.nodeLists = {};
      }
      Parse() {
        this.text = "";
        this.nodes = [];
        this.envStack = [];
        super.Parse();
      }
      saveText() {
        if (this.text) {
          const mathvariant = this.stack.env.mathvariant;
          const text = ParseUtil.internalText(this, this.text, mathvariant ? { mathvariant } : {});
          this.text = "";
          this.Push(text);
        }
      }
      Push(mml) {
        if (this.text) {
          this.saveText();
        }
        if (mml instanceof StopItem) {
          return super.Push(mml);
        }
        if (mml instanceof StyleItem) {
          this.stack.env.mathcolor = this.stack.env.color;
          return;
        }
        if (mml instanceof AbstractMmlNode) {
          this.addAttributes(mml);
          this.nodes.push(mml);
        }
      }
      PushMath(mml) {
        const env = this.stack.env;
        for (const name of ["mathsize", "mathcolor"]) {
          if (env[name] && !mml.attributes.hasExplicit(name)) {
            if (!mml.isToken && !mml.isKind("mstyle")) {
              mml = this.create("node", "mstyle", [mml]);
            }
            NodeUtil_default.setAttribute(mml, name, env[name]);
          }
        }
        if (mml.isInferred) {
          mml = this.create("node", "mrow", mml.childNodes);
        }
        if (!mml.isKind("TeXAtom")) {
          mml = this.create("node", "TeXAtom", [mml]);
        }
        this.nodes.push(mml);
      }
      addAttributes(mml) {
        const env = this.stack.env;
        if (!mml.isToken)
          return;
        for (const name of ["mathsize", "mathcolor", "mathvariant"]) {
          if (env[name] && !mml.attributes.hasExplicit(name)) {
            NodeUtil_default.setAttribute(mml, name, env[name]);
          }
        }
      }
      ParseTextArg(name, env) {
        const text = this.GetArgument(name);
        env = Object.assign(Object.assign({}, this.stack.env), env);
        return new _TextParser(text, env, this.configuration).mml();
      }
      ParseArg(name) {
        return new _TextParser(this.GetArgument(name), this.stack.env, this.configuration).mml();
      }
      Error(id, message, ...args) {
        throw new TexError_default(id, message, ...args);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/textmacros/TextMacrosMethods.js
var TextMacrosMethods;
var init_TextMacrosMethods = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/textmacros/TextMacrosMethods.js"() {
    init_HandlerTypes();
    init_TexParser();
    init_Retries();
    init_BaseMethods();
    TextMacrosMethods = {
      Comment(parser2, _c) {
        while (parser2.i < parser2.string.length && parser2.string.charAt(parser2.i) !== "\n") {
          parser2.i++;
        }
        parser2.i++;
      },
      Math(parser2, open) {
        parser2.saveText();
        const i2 = parser2.i;
        let j, c;
        let braces = 0;
        while (c = parser2.GetNext()) {
          j = parser2.i++;
          switch (c) {
            case "\\": {
              const cs = parser2.GetCS();
              if (cs === ")")
                c = "\\(";
            }
            case "$":
              if (braces === 0 && open === c) {
                const config2 = parser2.texParser.configuration;
                const mml = new TexParser(parser2.string.substring(i2, j), parser2.stack.env, config2).mml();
                parser2.PushMath(mml);
                return;
              }
              break;
            case "{":
              braces++;
              break;
            case "}":
              if (braces === 0) {
                parser2.Error("ExtraCloseMissingOpen", "Extra close brace or missing open brace");
              }
              braces--;
              break;
          }
        }
        parser2.Error("MathNotTerminated", "Math mode is not properly terminated");
      },
      MathModeOnly(parser2, c) {
        parser2.Error("MathModeOnly", "'%1' allowed only in math mode", c);
      },
      Misplaced(parser2, c) {
        parser2.Error("Misplaced", "Misplaced '%1'", c);
      },
      OpenBrace(parser2, _c) {
        const env = parser2.stack.env;
        parser2.envStack.push(env);
        parser2.stack.env = Object.assign({}, env);
      },
      CloseBrace(parser2, _c) {
        if (parser2.envStack.length) {
          parser2.saveText();
          parser2.stack.env = parser2.envStack.pop();
        } else {
          parser2.Error("ExtraCloseMissingOpen", "Extra close brace or missing open brace");
        }
      },
      OpenQuote(parser2, c) {
        if (parser2.string.charAt(parser2.i) === c) {
          parser2.text += "“";
          parser2.i++;
        } else {
          parser2.text += "‘";
        }
      },
      CloseQuote(parser2, c) {
        if (parser2.string.charAt(parser2.i) === c) {
          parser2.text += "”";
          parser2.i++;
        } else {
          parser2.text += "’";
        }
      },
      Tilde(parser2, _c) {
        parser2.text += "\u00A0";
      },
      Space(parser2, _c) {
        parser2.text += " ";
        parser2.GetNext();
      },
      SelfQuote(parser2, name) {
        parser2.text += name.substring(1);
      },
      Insert(parser2, _name, c) {
        parser2.text += c;
      },
      Accent(parser2, name, c) {
        const base = parser2.ParseArg(name);
        const accent = parser2.create("token", "mo", {}, c);
        parser2.addAttributes(accent);
        parser2.Push(parser2.create("node", "mover", [base, accent]));
      },
      Emph(parser2, name) {
        const variant = parser2.stack.env.mathvariant === "-tex-mathit" ? "normal" : "-tex-mathit";
        parser2.Push(parser2.ParseTextArg(name, { mathvariant: variant }));
      },
      TextFont(parser2, name, variant) {
        parser2.saveText();
        parser2.Push(parser2.ParseTextArg(name, { mathvariant: variant }));
      },
      SetFont(parser2, _name, variant) {
        parser2.saveText();
        parser2.stack.env.mathvariant = variant;
      },
      SetSize(parser2, _name, size) {
        parser2.saveText();
        parser2.stack.env.mathsize = size;
      },
      CheckAutoload(parser2, name) {
        const autoload = parser2.configuration.packageData.get("autoload");
        const texParser = parser2.texParser;
        name = name.slice(1);
        const macro = texParser.lookup(HandlerType.MACRO, name);
        if (!macro || autoload && macro._func === autoload.Autoload) {
          texParser.parse(HandlerType.MACRO, [texParser, name]);
          if (!macro)
            return;
          retryAfter(Promise.resolve());
        }
        texParser.parse(HandlerType.MACRO, [parser2, name]);
      },
      Macro: BaseMethods_default.Macro,
      Spacer: BaseMethods_default.Spacer,
      Hskip: BaseMethods_default.Hskip,
      rule: BaseMethods_default.rule,
      Rule: BaseMethods_default.Rule,
      HandleRef: BaseMethods_default.HandleRef,
      UnderOver: BaseMethods_default.UnderOver,
      Lap: BaseMethods_default.Lap,
      Phantom: BaseMethods_default.Phantom,
      Smash: BaseMethods_default.Smash,
      MmlToken: BaseMethods_default.MmlToken
    };
  }
});
// node_modules/@mathjax/src/mjs/input/tex/textmacros/TextMacrosMappings.js
var VARIANT2;
var init_TextMacrosMappings = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/textmacros/TextMacrosMappings.js"() {
    init_TokenMap();
    init_TexConstants();
    init_TextMacrosMethods();
    init_lengths();
    VARIANT2 = TexConstant.Variant;
    new MacroMap("text-special", {
      $: TextMacrosMethods.Math,
      "%": TextMacrosMethods.Comment,
      "^": TextMacrosMethods.MathModeOnly,
      _: TextMacrosMethods.MathModeOnly,
      "&": TextMacrosMethods.Misplaced,
      "#": TextMacrosMethods.Misplaced,
      "~": TextMacrosMethods.Tilde,
      " ": TextMacrosMethods.Space,
      "	": TextMacrosMethods.Space,
      "\r": TextMacrosMethods.Space,
      "\n": TextMacrosMethods.Space,
      "\u00A0": TextMacrosMethods.Tilde,
      "{": TextMacrosMethods.OpenBrace,
      "}": TextMacrosMethods.CloseBrace,
      "`": TextMacrosMethods.OpenQuote,
      "'": TextMacrosMethods.CloseQuote
    });
    new CommandMap("text-macros", {
      "(": TextMacrosMethods.Math,
      $: TextMacrosMethods.SelfQuote,
      _: TextMacrosMethods.SelfQuote,
      "%": TextMacrosMethods.SelfQuote,
      "{": TextMacrosMethods.SelfQuote,
      "}": TextMacrosMethods.SelfQuote,
      " ": TextMacrosMethods.SelfQuote,
      "&": TextMacrosMethods.SelfQuote,
      "#": TextMacrosMethods.SelfQuote,
      "\\": [TextMacrosMethods.Macro, "$\\\\$"],
      "'": [TextMacrosMethods.Accent, "´"],
      "’": [TextMacrosMethods.Accent, "´"],
      "`": [TextMacrosMethods.Accent, "`"],
      "‘": [TextMacrosMethods.Accent, "`"],
      "^": [TextMacrosMethods.Accent, "^"],
      '"': [TextMacrosMethods.Accent, "¨"],
      "~": [TextMacrosMethods.Accent, "~"],
      "=": [TextMacrosMethods.Accent, "¯"],
      ".": [TextMacrosMethods.Accent, "˙"],
      u: [TextMacrosMethods.Accent, "˘"],
      v: [TextMacrosMethods.Accent, "ˇ"],
      emph: TextMacrosMethods.Emph,
      rm: [TextMacrosMethods.SetFont, VARIANT2.NORMAL],
      mit: [TextMacrosMethods.SetFont, VARIANT2.ITALIC],
      oldstyle: [TextMacrosMethods.SetFont, VARIANT2.OLDSTYLE],
      cal: [TextMacrosMethods.SetFont, VARIANT2.CALLIGRAPHIC],
      it: [TextMacrosMethods.SetFont, "-tex-mathit"],
      bf: [TextMacrosMethods.SetFont, VARIANT2.BOLD],
      sf: [TextMacrosMethods.SetFont, VARIANT2.SANSSERIF],
      tt: [TextMacrosMethods.SetFont, VARIANT2.MONOSPACE],
      frak: [TextMacrosMethods.TextFont, VARIANT2.FRAKTUR],
      Bbb: [TextMacrosMethods.TextFont, VARIANT2.DOUBLESTRUCK],
      Tiny: [TextMacrosMethods.SetSize, 0.5],
      tiny: [TextMacrosMethods.SetSize, 0.6],
      scriptsize: [TextMacrosMethods.SetSize, 0.7],
      SMALL: [TextMacrosMethods.SetSize, 0.7],
      Small: [TextMacrosMethods.SetSize, 0.8],
      footnotesize: [TextMacrosMethods.SetSize, 0.8],
      small: [TextMacrosMethods.SetSize, 0.9],
      normalsize: [TextMacrosMethods.SetSize, 1],
      large: [TextMacrosMethods.SetSize, 1.095],
      Large: [TextMacrosMethods.SetSize, 1.2],
      LARGE: [TextMacrosMethods.SetSize, 1.44],
      huge: [TextMacrosMethods.SetSize, 1.73],
      Huge: [TextMacrosMethods.SetSize, 2.07],
      HUGE: [TextMacrosMethods.SetSize, 2.49],
      textnormal: [TextMacrosMethods.Macro, "{\\rm #1}", 1],
      textup: [TextMacrosMethods.Macro, "{\\rm #1}", 1],
      textrm: [TextMacrosMethods.Macro, "{\\rm #1}", 1],
      textit: [TextMacrosMethods.Macro, "{\\it #1}", 1],
      textbf: [TextMacrosMethods.Macro, "{\\bf #1}", 1],
      textsf: [TextMacrosMethods.Macro, "{\\sf #1}", 1],
      texttt: [TextMacrosMethods.Macro, "{\\tt #1}", 1],
      dagger: [TextMacrosMethods.Insert, "†"],
      ddagger: [TextMacrosMethods.Insert, "‡"],
      S: [TextMacrosMethods.Insert, "§"],
      AA: [TextMacrosMethods.Insert, "Å"],
      ldots: [TextMacrosMethods.Insert, "…"],
      vdots: [TextMacrosMethods.Insert, "⋮"],
      ",": [TextMacrosMethods.Spacer, MATHSPACE.thinmathspace],
      ":": [TextMacrosMethods.Spacer, MATHSPACE.mediummathspace],
      ">": [TextMacrosMethods.Spacer, MATHSPACE.mediummathspace],
      ";": [TextMacrosMethods.Spacer, MATHSPACE.thickmathspace],
      "!": [TextMacrosMethods.Spacer, MATHSPACE.negativethinmathspace],
      enspace: [TextMacrosMethods.Spacer, 0.5],
      quad: [TextMacrosMethods.Spacer, 1],
      qquad: [TextMacrosMethods.Spacer, 2],
      thinspace: [TextMacrosMethods.Spacer, MATHSPACE.thinmathspace],
      negthinspace: [TextMacrosMethods.Spacer, MATHSPACE.negativethinmathspace],
      hskip: TextMacrosMethods.Hskip,
      hspace: TextMacrosMethods.Hskip,
      kern: TextMacrosMethods.Hskip,
      mskip: TextMacrosMethods.Hskip,
      mspace: TextMacrosMethods.Hskip,
      mkern: TextMacrosMethods.Hskip,
      rule: TextMacrosMethods.rule,
      Rule: [TextMacrosMethods.Rule],
      Space: [TextMacrosMethods.Rule, "blank"],
      color: TextMacrosMethods.CheckAutoload,
      textcolor: TextMacrosMethods.CheckAutoload,
      colorbox: TextMacrosMethods.CheckAutoload,
      fcolorbox: TextMacrosMethods.CheckAutoload,
      href: TextMacrosMethods.CheckAutoload,
      style: TextMacrosMethods.CheckAutoload,
      class: TextMacrosMethods.CheckAutoload,
      data: TextMacrosMethods.CheckAutoload,
      cssId: TextMacrosMethods.CheckAutoload,
      unicode: TextMacrosMethods.CheckAutoload,
      U: TextMacrosMethods.CheckAutoload,
      char: TextMacrosMethods.CheckAutoload,
      ref: [TextMacrosMethods.HandleRef, false],
      eqref: [TextMacrosMethods.HandleRef, true],
      underline: [TextMacrosMethods.UnderOver, "2015"],
      llap: TextMacrosMethods.Lap,
      rlap: TextMacrosMethods.Lap,
      phantom: TextMacrosMethods.Phantom,
      vphantom: [TextMacrosMethods.Phantom, 1, 0],
      hphantom: [TextMacrosMethods.Phantom, 0, 1],
      smash: TextMacrosMethods.Smash,
      mmlToken: TextMacrosMethods.MmlToken
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/textmacros/TextMacrosConfiguration.js
function internalMath(parser2, text, level, mathvariant) {
  const config2 = parser2.configuration.packageData.get("textmacros");
  if (!(parser2 instanceof TextParser)) {
    config2.texParser = parser2;
  }
  config2.parseOptions.clear();
  return [
    new TextParser(text, mathvariant ? { mathvariant } : {}, config2.parseOptions, level).mml()
  ];
}
var TextBaseConfiguration;
var TextMacrosConfiguration;
var init_TextMacrosConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/textmacros/TextMacrosConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_ParseOptions();
    init_Tags();
    init_BaseItems();
    init_TextParser();
    init_TextMacrosMethods();
    init_TextMacrosMappings();
    TextBaseConfiguration = Configuration.create("text-base", {
      [ConfigurationType.PARSER]: "text",
      [ConfigurationType.PRIORITY]: 1,
      [ConfigurationType.HANDLER]: {
        [HandlerType.CHARACTER]: ["command", "text-special"],
        [HandlerType.MACRO]: ["text-macros"]
      },
      [ConfigurationType.FALLBACK]: {
        [HandlerType.CHARACTER]: (parser2, c) => {
          parser2.text += c;
        },
        [HandlerType.MACRO]: (parser2, name) => {
          const texParser = parser2.texParser;
          const macro = texParser.lookup(HandlerType.MACRO, name);
          if (macro && macro._func !== TextMacrosMethods.Macro) {
            parser2.Error("MathMacro", "%1 is only supported in math mode", "\\" + name);
          }
          texParser.parse(HandlerType.MACRO, [parser2, name]);
        }
      },
      [ConfigurationType.ITEMS]: {
        [StartItem.prototype.kind]: StartItem,
        [StopItem.prototype.kind]: StopItem,
        [MmlItem.prototype.kind]: MmlItem,
        [StyleItem.prototype.kind]: StyleItem
      }
    });
    TextMacrosConfiguration = Configuration.create("textmacros", {
      [ConfigurationType.PRIORITY]: 1,
      [ConfigurationType.CONFIG]: (_config, jax) => {
        const textConf = new ParserConfiguration(jax.parseOptions.options.textmacros.packages, ["tex", "text"]);
        textConf.init();
        const parseOptions = new ParseOptions_default(textConf, []);
        parseOptions.options = jax.parseOptions.options;
        textConf.config(jax);
        TagsFactory.addTags(textConf.tags);
        parseOptions.tags = TagsFactory.getDefault();
        parseOptions.tags.configuration = parseOptions;
        parseOptions.packageData = jax.parseOptions.packageData;
        parseOptions.packageData.set("textmacros", {
          textConf,
          parseOptions,
          jax,
          texParser: null
        });
        parseOptions.options.internalMath = internalMath;
      },
      [ConfigurationType.PREPROCESSORS]: [
        (data) => {
          const config2 = data.data.packageData.get("textmacros");
          config2.parseOptions.nodeFactory.setMmlFactory(config2.jax.mmlFactory);
          config2.parseOptions.clear();
        }
      ],
      [ConfigurationType.OPTIONS]: {
        textmacros: {
          packages: ["text-base"]
        }
      }
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex/unicode/UnicodeConfiguration.js
var UnicodeCache;
var UnicodeMethods;
var UnicodeConfiguration;
var init_UnicodeConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/unicode/UnicodeConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_TexError();
    init_TokenMap();
    init_UnitUtil();
    init_NodeUtil();
    init_Entities();
    init_BaseConfiguration();
    UnicodeCache = {};
    UnicodeMethods = {
      Unicode(parser2, name) {
        const HD = parser2.GetBrackets(name);
        let HDsplit = null;
        let font = "";
        if (HD) {
          if (HD.replace(/ /g, "").match(/^(\d+(\.\d*)?|\.\d+),(\d+(\.\d*)?|\.\d+)$/)) {
            HDsplit = HD.replace(/ /g, "").split(/,/);
            font = parser2.GetBrackets(name) || "";
          } else {
            font = HD;
          }
        }
        if (font.match(/;/)) {
          throw new TexError_default("BadFont", "Font name for %1 can't contain semicolons", parser2.currentCS);
        }
        const n = UnitUtil.trimSpaces(parser2.GetArgument(name)).replace(/^0x/, "x");
        if (!n.match(/^(x[0-9A-Fa-f]+|[0-9]+)$/)) {
          throw new TexError_default("BadUnicode", "Argument to %1 must be a number", parser2.currentCS);
        }
        const N = parseInt(n.match(/^x/) ? "0" + n : n);
        if (!UnicodeCache[N]) {
          UnicodeCache[N] = [800, 200, font, N];
        } else if (!font) {
          font = UnicodeCache[N][2];
        }
        if (HDsplit) {
          UnicodeCache[N][0] = Math.floor(parseFloat(HDsplit[0]) * 1e3);
          UnicodeCache[N][1] = Math.floor(parseFloat(HDsplit[1]) * 1e3);
        }
        const variant = parser2.stack.env.font;
        const def2 = {};
        if (font) {
          UnicodeCache[N][2] = def2.fontfamily = font.replace(/'/g, "'");
          if (variant) {
            if (variant.match(/bold/)) {
              def2.fontweight = "bold";
            }
            if (variant.match(/italic|-mathit/)) {
              def2.fontstyle = "italic";
            }
          }
        } else if (variant) {
          def2.mathvariant = variant;
        }
        const node = parser2.create("token", "mtext", def2, numeric(n));
        NodeUtil_default.setProperty(node, "unicode", true);
        parser2.Push(node);
      },
      RawUnicode(parser2, name) {
        const hex = parser2.GetArgument(name).trim();
        if (!hex.match(/^[0-9A-F]{1,6}$/)) {
          throw new TexError_default("BadRawUnicode", "Argument to %1 must a hexadecimal number with 1 to 6 digits", parser2.currentCS);
        }
        const n = parseInt(hex, 16);
        parser2.string = String.fromCodePoint(n) + parser2.string.substring(parser2.i);
        parser2.i = 0;
      },
      Char(parser2, _name) {
        let match;
        const next = parser2.GetNext();
        let c = "";
        const text = parser2.string.substring(parser2.i);
        if (next === "'") {
          match = text.match(/^'([0-7]{1,7}) ?/u);
          if (match) {
            c = String.fromCodePoint(parseInt(match[1], 8));
          }
        } else if (next === '"') {
          match = text.match(/^"([0-9A-F]{1,6}) ?/);
          if (match) {
            c = String.fromCodePoint(parseInt(match[1], 16));
          }
        } else if (next === "`") {
          match = text.match(/^`(?:(\\\S)|(.))/u);
          if (match) {
            if (match[2]) {
              c = match[2];
            } else {
              parser2.i += 2;
              const cs = [...parser2.GetCS()];
              if (cs.length > 1) {
                throw new TexError_default("InvalidAlphanumeric", "Invalid alphanumeric constant for %1", parser2.currentCS);
              }
              c = cs[0];
              match = [""];
            }
          }
        } else {
          match = text.match(/^([0-9]{1,7}) ?/);
          if (match) {
            c = String.fromCodePoint(parseInt(match[1]));
          }
        }
        if (!c) {
          throw new TexError_default("MissingNumber", "Missing numeric constant for %1", parser2.currentCS);
        }
        parser2.i += match[0].length;
        if (c >= "0" && c <= "9") {
          parser2.Push(parser2.create("token", "mn", {}, c));
        } else if (c.match(/[A-Za-z]/)) {
          parser2.Push(parser2.create("token", "mi", {}, c));
        } else {
          Other(parser2, c);
        }
      }
    };
    new CommandMap("unicode", {
      unicode: UnicodeMethods.Unicode,
      U: UnicodeMethods.RawUnicode,
      char: UnicodeMethods.Char
    });
    UnicodeConfiguration = Configuration.create("unicode", {
      [ConfigurationType.HANDLER]: { [HandlerType.MACRO]: ["unicode"] }
    });
  }
});
// node_modules/mhchemparser/esm/mhchemParser.js
function _mhchemCreateTransitions(o) {
  let pattern, state;
  let transitions = {};
  for (pattern in o) {
    for (state in o[pattern]) {
      let stateArray = state.split("|");
      o[pattern][state].stateArray = stateArray;
      for (let i2 = 0; i2 < stateArray.length; i2++) {
        transitions[stateArray[i2]] = [];
      }
    }
  }
  for (pattern in o) {
    for (state in o[pattern]) {
      let stateArray = o[pattern][state].stateArray || [];
      for (let i2 = 0; i2 < stateArray.length; i2++) {
        const p = o[pattern][state];
        p.action_ = [].concat(p.action_);
        for (let k = 0; k < p.action_.length; k++) {
          if (typeof p.action_[k] === "string") {
            p.action_[k] = { type_: p.action_[k] };
          }
        }
        const patternArray = pattern.split("|");
        for (let j = 0; j < patternArray.length; j++) {
          if (stateArray[i2] === "*") {
            let t;
            for (t in transitions) {
              transitions[t].push({ pattern: patternArray[j], task: p });
            }
          } else {
            transitions[stateArray[i2]].push({ pattern: patternArray[j], task: p });
          }
        }
      }
    }
  }
  return transitions;
}
function assertNever(a) {
}
var mhchemParser;
var _mhchemParser;
var _mhchemTexify;
var init_mhchemParser = __esm({
  "node_modules/mhchemparser/esm/mhchemParser.js"() {
    mhchemParser = class {
      static toTex(input, type) {
        return _mhchemTexify.go(_mhchemParser.go(input, type), type !== "tex");
      }
    };
    _mhchemParser = {
      go: function(input, stateMachine) {
        if (!input) {
          return [];
        }
        if (stateMachine === void 0) {
          stateMachine = "ce";
        }
        let state = "0";
        let buffer = {};
        buffer["parenthesisLevel"] = 0;
        input = input.replace(/\n/g, " ");
        input = input.replace(/[\u2212\u2013\u2014\u2010]/g, "-");
        input = input.replace(/[\u2026]/g, "...");
        let lastInput;
        let watchdog = 10;
        let output = [];
        while (true) {
          if (lastInput !== input) {
            watchdog = 10;
            lastInput = input;
          } else {
            watchdog--;
          }
          let machine = _mhchemParser.stateMachines[stateMachine];
          let t = machine.transitions[state] || machine.transitions["*"];
          iterateTransitions: for (let i2 = 0; i2 < t.length; i2++) {
            let matches = _mhchemParser.patterns.match_(t[i2].pattern, input);
            if (matches) {
              const task = t[i2].task;
              for (let iA = 0; iA < task.action_.length; iA++) {
                let o;
                if (machine.actions[task.action_[iA].type_]) {
                  o = machine.actions[task.action_[iA].type_](buffer, matches.match_, task.action_[iA].option);
                } else if (_mhchemParser.actions[task.action_[iA].type_]) {
                  o = _mhchemParser.actions[task.action_[iA].type_](buffer, matches.match_, task.action_[iA].option);
                } else {
                  throw ["MhchemBugA", "mhchem bug A. Please report. (" + task.action_[iA].type_ + ")"];
                }
                _mhchemParser.concatArray(output, o);
              }
              state = task.nextState || state;
              if (input.length > 0) {
                if (!task.revisit) {
                  input = matches.remainder;
                }
                if (!task.toContinue) {
                  break iterateTransitions;
                }
              } else {
                return output;
              }
            }
          }
          if (watchdog <= 0) {
            throw ["MhchemBugU", "mhchem bug U. Please report."];
          }
        }
      },
      concatArray: function(a, b) {
        if (b) {
          if (Array.isArray(b)) {
            for (let iB = 0; iB < b.length; iB++) {
              a.push(b[iB]);
            }
          } else {
            a.push(b);
          }
        }
      },
      patterns: {
        patterns: {
          "empty": /^$/,
          "else": /^./,
          "else2": /^./,
          "space": /^\s/,
          "space A": /^\s(?=[A-Z\\$])/,
          "space$": /^\s$/,
          "a-z": /^[a-z]/,
          "x": /^x/,
          "x$": /^x$/,
          "i$": /^i$/,
          "letters": /^(?:[a-zA-Z\u03B1-\u03C9\u0391-\u03A9?@]|(?:\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)(?:\s+|\{\}|(?![a-zA-Z]))))+/,
          "\\greek": /^\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)(?:\s+|\{\}|(?![a-zA-Z]))/,
          "one lowercase latin letter $": /^(?:([a-z])(?:$|[^a-zA-Z]))$/,
          "$one lowercase latin letter$ $": /^\$(?:([a-z])(?:$|[^a-zA-Z]))\$$/,
          "one lowercase greek letter $": /^(?:\$?[\u03B1-\u03C9]\$?|\$?\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)\s*\$?)(?:\s+|\{\}|(?![a-zA-Z]))$/,
          "digits": /^[0-9]+/,
          "-9.,9": /^[+\-]?(?:[0-9]+(?:[,.][0-9]+)?|[0-9]*(?:\.[0-9]+))/,
          "-9.,9 no missing 0": /^[+\-]?[0-9]+(?:[.,][0-9]+)?/,
          "(-)(9.,9)(e)(99)": function(input) {
            const match = input.match(/^(\+\-|\+\/\-|\+|\-|\\pm\s?)?([0-9]+(?:[,.][0-9]+)?|[0-9]*(?:\.[0-9]+))?(\((?:[0-9]+(?:[,.][0-9]+)?|[0-9]*(?:\.[0-9]+))\))?(?:(?:([eE])|\s*(\*|x|\\times|\u00D7)\s*10\^)([+\-]?[0-9]+|\{[+\-]?[0-9]+\}))?/);
            if (match && match[0]) {
              return { match_: match.slice(1), remainder: input.substr(match[0].length) };
            }
            return null;
          },
          "(-)(9)^(-9)": /^(\+\-|\+\/\-|\+|\-|\\pm\s?)?([0-9]+(?:[,.][0-9]+)?|[0-9]*(?:\.[0-9]+)?)\^([+\-]?[0-9]+|\{[+\-]?[0-9]+\})/,
          "state of aggregation $": function(input) {
            const a = _mhchemParser.patterns.findObserveGroups(input, "", /^\([a-z]{1,3}(?=[\),])/, ")", "");
            if (a && a.remainder.match(/^($|[\s,;\)\]\}])/)) {
              return a;
            }
            const match = input.match(/^(?:\((?:\\ca\s?)?\$[amothc]\$\))/);
            if (match) {
              return { match_: match[0], remainder: input.substr(match[0].length) };
            }
            return null;
          },
          "_{(state of aggregation)}$": /^_\{(\([a-z]{1,3}\))\}/,
          "{[(": /^(?:\\\{|\[|\()/,
          ")]}": /^(?:\)|\]|\\\})/,
          ", ": /^[,;]\s*/,
          ",": /^[,;]/,
          ".": /^[.]/,
          ". __* ": /^([.\u22C5\u00B7\u2022]|[*])\s*/,
          "...": /^\.\.\.(?=$|[^.])/,
          "^{(...)}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "^{", "", "", "}");
          },
          "^($...$)": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "^", "$", "$", "");
          },
          "^a": /^\^([0-9]+|[^\\_])/,
          "^\\x{}{}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "^", /^\\[a-zA-Z]+\{/, "}", "", "", "{", "}", "", true);
          },
          "^\\x{}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "^", /^\\[a-zA-Z]+\{/, "}", "");
          },
          "^\\x": /^\^(\\[a-zA-Z]+)\s*/,
          "^(-1)": /^\^(-?\d+)/,
          "'": /^'/,
          "_{(...)}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "_{", "", "", "}");
          },
          "_($...$)": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "_", "$", "$", "");
          },
          "_9": /^_([+\-]?[0-9]+|[^\\])/,
          "_\\x{}{}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "_", /^\\[a-zA-Z]+\{/, "}", "", "", "{", "}", "", true);
          },
          "_\\x{}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "_", /^\\[a-zA-Z]+\{/, "}", "");
          },
          "_\\x": /^_(\\[a-zA-Z]+)\s*/,
          "^_": /^(?:\^(?=_)|\_(?=\^)|[\^_]$)/,
          "{}^": /^\{\}(?=\^)/,
          "{}": /^\{\}/,
          "{...}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "", "{", "}", "");
          },
          "{(...)}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "{", "", "", "}");
          },
          "$...$": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "", "$", "$", "");
          },
          "${(...)}$__$(...)$": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "${", "", "", "}$") || _mhchemParser.patterns.findObserveGroups(input, "$", "", "", "$");
          },
          "=<>": /^[=<>]/,
          "#": /^[#\u2261]/,
          "+": /^\+/,
          "-$": /^-(?=[\s_},;\]/]|$|\([a-z]+\))/,
          "-9": /^-(?=[0-9])/,
          "- orbital overlap": /^-(?=(?:[spd]|sp)(?:$|[\s,;\)\]\}]))/,
          "-": /^-/,
          "pm-operator": /^(?:\\pm|\$\\pm\$|\+-|\+\/-)/,
          "operator": /^(?:\+|(?:[\-=<>]|<<|>>|\\approx|\$\\approx\$)(?=\s|$|-?[0-9]))/,
          "arrowUpDown": /^(?:v|\(v\)|\^|\(\^\))(?=$|[\s,;\)\]\}])/,
          "\\bond{(...)}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "\\bond{", "", "", "}");
          },
          "->": /^(?:<->|<-->|->|<-|<=>>|<<=>|<=>|[\u2192\u27F6\u21CC])/,
          "CMT": /^[CMT](?=\[)/,
          "[(...)]": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "[", "", "", "]");
          },
          "1st-level escape": /^(&|\\\\|\\hline)\s*/,
          "\\,": /^(?:\\[,\ ;:])/,
          "\\x{}{}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "", /^\\[a-zA-Z]+\{/, "}", "", "", "{", "}", "", true);
          },
          "\\x{}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "", /^\\[a-zA-Z]+\{/, "}", "");
          },
          "\\ca": /^\\ca(?:\s+|(?![a-zA-Z]))/,
          "\\x": /^(?:\\[a-zA-Z]+\s*|\\[_&{}%])/,
          "orbital": /^(?:[0-9]{1,2}[spdfgh]|[0-9]{0,2}sp)(?=$|[^a-zA-Z])/,
          "others": /^[\/~|]/,
          "\\frac{(...)}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "\\frac{", "", "", "}", "{", "", "", "}");
          },
          "\\overset{(...)}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "\\overset{", "", "", "}", "{", "", "", "}");
          },
          "\\underset{(...)}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "\\underset{", "", "", "}", "{", "", "", "}");
          },
          "\\underbrace{(...)}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "\\underbrace{", "", "", "}_", "{", "", "", "}");
          },
          "\\color{(...)}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "\\color{", "", "", "}");
          },
          "\\color{(...)}{(...)}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "\\color{", "", "", "}", "{", "", "", "}") || _mhchemParser.patterns.findObserveGroups(input, "\\color", "\\", "", /^(?=\{)/, "{", "", "", "}");
          },
          "\\ce{(...)}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "\\ce{", "", "", "}");
          },
          "\\pu{(...)}": function(input) {
            return _mhchemParser.patterns.findObserveGroups(input, "\\pu{", "", "", "}");
          },
          "oxidation$": /^(?:[+-][IVX]+|(?:\\pm|\$\\pm\$|\+-|\+\/-)\s*0)$/,
          "d-oxidation$": /^(?:[+-]?[IVX]+|(?:\\pm|\$\\pm\$|\+-|\+\/-)\s*0)$/,
          "1/2$": /^[+\-]?(?:[0-9]+|\$[a-z]\$|[a-z])\/[0-9]+(?:\$[a-z]\$|[a-z])?$/,
          "amount": function(input) {
            let match;
            match = input.match(/^(?:(?:(?:\([+\-]?[0-9]+\/[0-9]+\)|[+\-]?(?:[0-9]+|\$[a-z]\$|[a-z])\/[0-9]+|[+\-]?[0-9]+[.,][0-9]+|[+\-]?\.[0-9]+|[+\-]?[0-9]+)(?:[a-z](?=\s*[A-Z]))?)|[+\-]?[a-z](?=\s*[A-Z])|\+(?!\s))/);
            if (match) {
              return { match_: match[0], remainder: input.substr(match[0].length) };
            }
            const a = _mhchemParser.patterns.findObserveGroups(input, "", "$", "$", "");
            if (a) {
              match = a.match_.match(/^\$(?:\(?[+\-]?(?:[0-9]*[a-z]?[+\-])?[0-9]*[a-z](?:[+\-][0-9]*[a-z]?)?\)?|\+|-)\$$/);
              if (match) {
                return { match_: match[0], remainder: input.substr(match[0].length) };
              }
            }
            return null;
          },
          "amount2": function(input) {
            return this["amount"](input);
          },
          "(KV letters),": /^(?:[A-Z][a-z]{0,2}|i)(?=,)/,
          "formula$": function(input) {
            if (input.match(/^\([a-z]+\)$/)) {
              return null;
            }
            const match = input.match(/^(?:[a-z]|(?:[0-9\ \+\-\,\.\(\)]+[a-z])+[0-9\ \+\-\,\.\(\)]*|(?:[a-z][0-9\ \+\-\,\.\(\)]+)+[a-z]?)$/);
            if (match) {
              return { match_: match[0], remainder: input.substr(match[0].length) };
            }
            return null;
          },
          "uprightEntities": /^(?:pH|pOH|pC|pK|iPr|iBu)(?=$|[^a-zA-Z])/,
          "/": /^\s*(\/)\s*/,
          "//": /^\s*(\/\/)\s*/,
          "*": /^\s*[*.]\s*/
        },
        findObserveGroups: function(input, begExcl, begIncl, endIncl, endExcl, beg2Excl, beg2Incl, end2Incl, end2Excl, combine) {
          const _match = function(input2, pattern) {
            if (typeof pattern === "string") {
              if (input2.indexOf(pattern) !== 0) {
                return null;
              }
              return pattern;
            } else {
              const match2 = input2.match(pattern);
              if (!match2) {
                return null;
              }
              return match2[0];
            }
          };
          const _findObserveGroups = function(input2, i2, endChars) {
            let braces = 0;
            while (i2 < input2.length) {
              let a = input2.charAt(i2);
              const match2 = _match(input2.substr(i2), endChars);
              if (match2 !== null && braces === 0) {
                return { endMatchBegin: i2, endMatchEnd: i2 + match2.length };
              } else if (a === "{") {
                braces++;
              } else if (a === "}") {
                if (braces === 0) {
                  throw ["ExtraCloseMissingOpen", "Extra close brace or missing open brace"];
                } else {
                  braces--;
                }
              }
              i2++;
            }
            if (braces > 0) {
              return null;
            }
            return null;
          };
          let match = _match(input, begExcl);
          if (match === null) {
            return null;
          }
          input = input.substr(match.length);
          match = _match(input, begIncl);
          if (match === null) {
            return null;
          }
          const e = _findObserveGroups(input, match.length, endIncl || endExcl);
          if (e === null) {
            return null;
          }
          const match1 = input.substring(0, endIncl ? e.endMatchEnd : e.endMatchBegin);
          if (!(beg2Excl || beg2Incl)) {
            return {
              match_: match1,
              remainder: input.substr(e.endMatchEnd)
            };
          } else {
            const group2 = this.findObserveGroups(input.substr(e.endMatchEnd), beg2Excl, beg2Incl, end2Incl, end2Excl);
            if (group2 === null) {
              return null;
            }
            const matchRet = [match1, group2.match_];
            return {
              match_: combine ? matchRet.join("") : matchRet,
              remainder: group2.remainder
            };
          }
        },
        match_: function(m, input) {
          const pattern = _mhchemParser.patterns.patterns[m];
          if (pattern === void 0) {
            throw ["MhchemBugP", "mhchem bug P. Please report. (" + m + ")"];
          } else if (typeof pattern === "function") {
            return _mhchemParser.patterns.patterns[m](input);
          } else {
            const match = input.match(pattern);
            if (match) {
              if (match.length > 2) {
                return { match_: match.slice(1), remainder: input.substr(match[0].length) };
              } else {
                return { match_: match[1] || match[0], remainder: input.substr(match[0].length) };
              }
            }
            return null;
          }
        }
      },
      actions: {
        "a=": function(buffer, m) {
          buffer.a = (buffer.a || "") + m;
          return void 0;
        },
        "b=": function(buffer, m) {
          buffer.b = (buffer.b || "") + m;
          return void 0;
        },
        "p=": function(buffer, m) {
          buffer.p = (buffer.p || "") + m;
          return void 0;
        },
        "o=": function(buffer, m) {
          buffer.o = (buffer.o || "") + m;
          return void 0;
        },
        "o=+p1": function(buffer, _m, a) {
          buffer.o = (buffer.o || "") + a;
          return void 0;
        },
        "q=": function(buffer, m) {
          buffer.q = (buffer.q || "") + m;
          return void 0;
        },
        "d=": function(buffer, m) {
          buffer.d = (buffer.d || "") + m;
          return void 0;
        },
        "rm=": function(buffer, m) {
          buffer.rm = (buffer.rm || "") + m;
          return void 0;
        },
        "text=": function(buffer, m) {
          buffer.text_ = (buffer.text_ || "") + m;
          return void 0;
        },
        "insert": function(_buffer, _m, a) {
          return { type_: a };
        },
        "insert+p1": function(_buffer, m, a) {
          return { type_: a, p1: m };
        },
        "insert+p1+p2": function(_buffer, m, a) {
          return { type_: a, p1: m[0], p2: m[1] };
        },
        "copy": function(_buffer, m) {
          return m;
        },
        "write": function(_buffer, _m, a) {
          return a;
        },
        "rm": function(_buffer, m) {
          return { type_: "rm", p1: m };
        },
        "text": function(_buffer, m) {
          return _mhchemParser.go(m, "text");
        },
        "tex-math": function(_buffer, m) {
          return _mhchemParser.go(m, "tex-math");
        },
        "tex-math tight": function(_buffer, m) {
          return _mhchemParser.go(m, "tex-math tight");
        },
        "bond": function(_buffer, m, k) {
          return { type_: "bond", kind_: k || m };
        },
        "color0-output": function(_buffer, m) {
          return { type_: "color0", color: m };
        },
        "ce": function(_buffer, m) {
          return _mhchemParser.go(m, "ce");
        },
        "pu": function(_buffer, m) {
          return _mhchemParser.go(m, "pu");
        },
        "1/2": function(_buffer, m) {
          let ret = [];
          if (m.match(/^[+\-]/)) {
            ret.push(m.substr(0, 1));
            m = m.substr(1);
          }
          const n = m.match(/^([0-9]+|\$[a-z]\$|[a-z])\/([0-9]+)(\$[a-z]\$|[a-z])?$/);
          n[1] = n[1].replace(/\$/g, "");
          ret.push({ type_: "frac", p1: n[1], p2: n[2] });
          if (n[3]) {
            n[3] = n[3].replace(/\$/g, "");
            ret.push({ type_: "tex-math", p1: n[3] });
          }
          return ret;
        },
        "9,9": function(_buffer, m) {
          return _mhchemParser.go(m, "9,9");
        }
      },
      stateMachines: {
        "tex": {
          transitions: _mhchemCreateTransitions(JSON.parse(`{
 "empty":{"0":{"action_":"copy"}},
 "\\\\ce{(...)}":{"0":{"action_":[{"type_":"write","option":"{"},"ce",{"type_":"write","option":"}"}]}},
 "\\\\pu{(...)}":{"0":{"action_":[{"type_":"write","option":"{"},"pu",{"type_":"write","option":"}"}]}},
 "else":{"0":{"action_":"copy"}}
}`)),
          actions: {}
        },
        "ce": {
          transitions: _mhchemCreateTransitions(JSON.parse(`{
 "empty":{"*":{"action_":"output"}},
 "else":{"0|1|2":{"action_":"beginsWithBond=false","revisit":true,"toContinue":true}},
 "oxidation$":{"0":{"action_":"oxidation-output"}},
 "CMT":{"r":{"action_":"rdt=","nextState":"rt"},"rd":{"action_":"rqt=","nextState":"rdt"}},
 "arrowUpDown":{"0|1|2|as":{"action_":["sb=false","output","operator"],"nextState":"1"}},
 "uprightEntities":{"0|1|2":{"action_":["o=","output"],"nextState":"1"}},
 "orbital":{"0|1|2|3":{"action_":"o=","nextState":"o"}},
 "->":{"0|1|2|3":{"action_":"r=","nextState":"r"},"a|as":{"action_":["output","r="],"nextState":"r"},"*":{"action_":["output","r="],"nextState":"r"}},
 "+":{
  "3":{"action_":["sb=false","output","operator"],"nextState":"0"},
  "o":{"action_":"d= kv","nextState":"d"},
  "d|D":{"action_":"d=","nextState":"d"},
  "q":{"action_":"d=","nextState":"qd"},
  "qd|qD":{"action_":"d=","nextState":"qd"},
  "dq":{"action_":["output","d="],"nextState":"d"}
 },
 "amount":{"0|2":{"action_":"a=","nextState":"a"}},
 "pm-operator":{"0|1|2|a|as":{"action_":["sb=false","output",{"type_":"operator","option":"\\\\pm"}],"nextState":"0"}},
 "operator":{"0|1|2|a|as":{"action_":["sb=false","output","operator"],"nextState":"0"}},
 "-$":{
  "o|q":{"action_":["charge or bond","output"],"nextState":"qd"},
  "d":{"action_":"d=","nextState":"d"},
  "D":{"action_":["output",{"type_":"bond","option":"-"}],"nextState":"3"},
  "q":{"action_":"d=","nextState":"qd"},
  "qd":{"action_":"d=","nextState":"qd"},
  "qD|dq":{"action_":["output",{"type_":"bond","option":"-"}],"nextState":"3"}
 },
 "-9":{"3|o":{"action_":["output",{"type_":"insert","option":"hyphen"}],"nextState":"3"}},
 "- orbital overlap":{"o":{"action_":["output",{"type_":"insert","option":"hyphen"}],"nextState":"2"},"d":{"action_":["output",{"type_":"insert","option":"hyphen"}],"nextState":"2"}},
 "-":{
  "3":{"action_":{"type_":"bond","option":"-"}},
  "0|1|2":{"action_":[{"type_":"output","option":1},"beginsWithBond=true",{"type_":"bond","option":"-"}],"nextState":"3"},
  "a":{"action_":["output",{"type_":"insert","option":"hyphen"}],"nextState":"2"},
  "as":{"action_":[{"type_":"output","option":2},{"type_":"bond","option":"-"}],"nextState":"3"},
  "b":{"action_":"b="},
  "o":{"action_":{"type_":"- after o/d","option":false},"nextState":"2"},
  "q":{"action_":{"type_":"- after o/d","option":false},"nextState":"2"},
  "d|qd|dq":{"action_":{"type_":"- after o/d","option":true},"nextState":"2"},
  "D|qD|p":{"action_":["output",{"type_":"bond","option":"-"}],"nextState":"3"}
 },
 "amount2":{"1|3":{"action_":"a=","nextState":"a"}},
 "letters":{"0|1|2|3|a|as|b|p|bp|o":{"action_":"o=","nextState":"o"},"q|dq":{"action_":["output","o="],"nextState":"o"},"d|D|qd|qD":{"action_":"o after d","nextState":"o"}},
 "digits":{"o":{"action_":"q=","nextState":"q"},"d|D":{"action_":"q=","nextState":"dq"},"q":{"action_":["output","o="],"nextState":"o"},"a":{"action_":"o=","nextState":"o"}},
 "space A":{"b|p|bp":{"action_":[]}},
 "space":{"0":{"action_":"sb=false"},"a":{"action_":[],"nextState":"as"},"1|2":{"action_":"sb=true"},"r|rt|rd|rdt|rdq":{"action_":"output","nextState":"0"},"*":{"action_":["output","sb=true"],"nextState":"1"}},
 "1st-level escape":{"1|2":{"action_":["output",{"type_":"insert+p1","option":"1st-level escape"}]},"*":{"action_":["output",{"type_":"insert+p1","option":"1st-level escape"}],"nextState":"0"}},
 "[(...)]":{"r|rt":{"action_":"rd=","nextState":"rd"},"rd|rdt":{"action_":"rq=","nextState":"rdq"}},
 "...":{"o|d|D|dq|qd|qD":{"action_":["output",{"type_":"bond","option":"..."}],"nextState":"3"},"*":{"action_":[{"type_":"output","option":1},{"type_":"insert","option":"ellipsis"}],"nextState":"1"}},
 ". __* ":{"*":{"action_":["output",{"type_":"insert","option":"addition compound"}],"nextState":"1"}},
 "state of aggregation $":{"*":{"action_":["output","state of aggregation"],"nextState":"1"}},
 "{[(":{
  "a|as|o":{"action_":["o=","output","parenthesisLevel++"],"nextState":"2"},
  "0|1|2|3":{"action_":["o=","output","parenthesisLevel++"],"nextState":"2"},
  "*":{"action_":["output","o=","output","parenthesisLevel++"],"nextState":"2"}
 },
 ")]}":{"0|1|2|3|b|p|bp|o":{"action_":["o=","parenthesisLevel--"],"nextState":"o"},"a|as|d|D|q|qd|qD|dq":{"action_":["output","o=","parenthesisLevel--"],"nextState":"o"}},
 ", ":{"*":{"action_":["output","comma"],"nextState":"0"}},
 "^_":{"*":{"action_":[]}},
 "^{(...)}|^($...$)":{
  "0|1|2|as":{"action_":"b=","nextState":"b"},
  "p":{"action_":"b=","nextState":"bp"},
  "3|o":{"action_":"d= kv","nextState":"D"},
  "q":{"action_":"d=","nextState":"qD"},
  "d|D|qd|qD|dq":{"action_":["output","d="],"nextState":"D"}
 },
 "^a|^\\\\x{}{}|^\\\\x{}|^\\\\x|'":{
  "0|1|2|as":{"action_":"b=","nextState":"b"},
  "p":{"action_":"b=","nextState":"bp"},
  "3|o":{"action_":"d= kv","nextState":"d"},
  "q":{"action_":"d=","nextState":"qd"},
  "d|qd|D|qD":{"action_":"d="},
  "dq":{"action_":["output","d="],"nextState":"d"}
 },
 "_{(state of aggregation)}$":{"d|D|q|qd|qD|dq":{"action_":["output","q="],"nextState":"q"}},
 "_{(...)}|_($...$)|_9|_\\\\x{}{}|_\\\\x{}|_\\\\x":{
  "0|1|2|as":{"action_":"p=","nextState":"p"},
  "b":{"action_":"p=","nextState":"bp"},
  "3|o":{"action_":"q=","nextState":"q"},
  "d|D":{"action_":"q=","nextState":"dq"},
  "q|qd|qD|dq":{"action_":["output","q="],"nextState":"q"}
 },
 "=<>":{"0|1|2|3|a|as|o|q|d|D|qd|qD|dq":{"action_":[{"type_":"output","option":2},"bond"],"nextState":"3"}},
 "#":{"0|1|2|3|a|as|o":{"action_":[{"type_":"output","option":2},{"type_":"bond","option":"#"}],"nextState":"3"}},
 "{}^":{"*":{"action_":[{"type_":"output","option":1},{"type_":"insert","option":"tinySkip"}],"nextState":"1"}},
 "{}":{"*":{"action_":{"type_":"output","option":1},"nextState":"1"}},
 "{...}":{"0|1|2|3|a|as|b|p|bp":{"action_":"o=","nextState":"o"},"o|d|D|q|qd|qD|dq":{"action_":["output","o="],"nextState":"o"}},
 "$...$":{"a":{"action_":"a="},"0|1|2|3|as|b|p|bp|o":{"action_":"o=","nextState":"o"},"as|o":{"action_":"o="},"q|d|D|qd|qD|dq":{"action_":["output","o="],"nextState":"o"}},
 "\\\\bond{(...)}":{"*":{"action_":[{"type_":"output","option":2},"bond"],"nextState":"3"}},
 "\\\\frac{(...)}":{"*":{"action_":[{"type_":"output","option":1},"frac-output"],"nextState":"3"}},
 "\\\\overset{(...)}":{"*":{"action_":[{"type_":"output","option":2},"overset-output"],"nextState":"3"}},
 "\\\\underset{(...)}":{"*":{"action_":[{"type_":"output","option":2},"underset-output"],"nextState":"3"}},
 "\\\\underbrace{(...)}":{"*":{"action_":[{"type_":"output","option":2},"underbrace-output"],"nextState":"3"}},
 "\\\\color{(...)}{(...)}":{"*":{"action_":[{"type_":"output","option":2},"color-output"],"nextState":"3"}},
 "\\\\color{(...)}":{"*":{"action_":[{"type_":"output","option":2},"color0-output"]}},
 "\\\\ce{(...)}":{"*":{"action_":[{"type_":"output","option":2},"ce"],"nextState":"3"}},
 "\\\\,":{"*":{"action_":[{"type_":"output","option":1},"copy"],"nextState":"1"}},
 "\\\\pu{(...)}":{"*":{"action_":["output",{"type_":"write","option":"{"},"pu",{"type_":"write","option":"}"}],"nextState":"3"}},
 "\\\\x{}{}|\\\\x{}|\\\\x":{"0|1|2|3|a|as|b|p|bp|o|c0":{"action_":["o=","output"],"nextState":"3"},"*":{"action_":["output","o=","output"],"nextState":"3"}},
 "others":{"*":{"action_":[{"type_":"output","option":1},"copy"],"nextState":"3"}},
 "else2":{
  "a":{"action_":"a to o","nextState":"o","revisit":true},
  "as":{"action_":["output","sb=true"],"nextState":"1","revisit":true},
  "r|rt|rd|rdt|rdq":{"action_":["output"],"nextState":"0","revisit":true},
  "*":{"action_":["output","copy"],"nextState":"3"}
 }
}`)),
          actions: {
            "o after d": function(buffer, m) {
              let ret;
              if ((buffer.d || "").match(/^[1-9][0-9]*$/)) {
                const tmp = buffer.d;
                buffer.d = void 0;
                ret = this["output"](buffer);
                ret.push({ type_: "tinySkip" });
                buffer.b = tmp;
              } else {
                ret = this["output"](buffer);
              }
              _mhchemParser.actions["o="](buffer, m);
              return ret;
            },
            "d= kv": function(buffer, m) {
              buffer.d = m;
              buffer.dType = "kv";
              return void 0;
            },
            "charge or bond": function(buffer, m) {
              if (buffer["beginsWithBond"]) {
                let ret = [];
                _mhchemParser.concatArray(ret, this["output"](buffer));
                _mhchemParser.concatArray(ret, _mhchemParser.actions["bond"](buffer, m, "-"));
                return ret;
              } else {
                buffer.d = m;
                return void 0;
              }
            },
            "- after o/d": function(buffer, m, isAfterD) {
              let c1 = _mhchemParser.patterns.match_("orbital", buffer.o || "");
              const c2 = _mhchemParser.patterns.match_("one lowercase greek letter $", buffer.o || "");
              const c3 = _mhchemParser.patterns.match_("one lowercase latin letter $", buffer.o || "");
              const c4 = _mhchemParser.patterns.match_("$one lowercase latin letter$ $", buffer.o || "");
              const hyphenFollows = m === "-" && (c1 && c1.remainder === "" || c2 || c3 || c4);
              if (hyphenFollows && !buffer.a && !buffer.b && !buffer.p && !buffer.d && !buffer.q && !c1 && c3) {
                buffer.o = "$" + buffer.o + "$";
              }
              let ret = [];
              if (hyphenFollows) {
                _mhchemParser.concatArray(ret, this["output"](buffer));
                ret.push({ type_: "hyphen" });
              } else {
                c1 = _mhchemParser.patterns.match_("digits", buffer.d || "");
                if (isAfterD && c1 && c1.remainder === "") {
                  _mhchemParser.concatArray(ret, _mhchemParser.actions["d="](buffer, m));
                  _mhchemParser.concatArray(ret, this["output"](buffer));
                } else {
                  _mhchemParser.concatArray(ret, this["output"](buffer));
                  _mhchemParser.concatArray(ret, _mhchemParser.actions["bond"](buffer, m, "-"));
                }
              }
              return ret;
            },
            "a to o": function(buffer) {
              buffer.o = buffer.a;
              buffer.a = void 0;
              return void 0;
            },
            "sb=true": function(buffer) {
              buffer.sb = true;
              return void 0;
            },
            "sb=false": function(buffer) {
              buffer.sb = false;
              return void 0;
            },
            "beginsWithBond=true": function(buffer) {
              buffer["beginsWithBond"] = true;
              return void 0;
            },
            "beginsWithBond=false": function(buffer) {
              buffer["beginsWithBond"] = false;
              return void 0;
            },
            "parenthesisLevel++": function(buffer) {
              buffer["parenthesisLevel"]++;
              return void 0;
            },
            "parenthesisLevel--": function(buffer) {
              buffer["parenthesisLevel"]--;
              return void 0;
            },
            "state of aggregation": function(_buffer, m) {
              return { type_: "state of aggregation", p1: _mhchemParser.go(m, "o") };
            },
            "comma": function(buffer, m) {
              const a = m.replace(/\s*$/, "");
              const withSpace = a !== m;
              if (withSpace && buffer["parenthesisLevel"] === 0) {
                return { type_: "comma enumeration L", p1: a };
              } else {
                return { type_: "comma enumeration M", p1: a };
              }
            },
            "output": function(buffer, _m, entityFollows) {
              let ret;
              if (!buffer.r) {
                ret = [];
                if (!buffer.a && !buffer.b && !buffer.p && !buffer.o && !buffer.q && !buffer.d && !entityFollows) {
                } else {
                  if (buffer.sb) {
                    ret.push({ type_: "entitySkip" });
                  }
                  if (!buffer.o && !buffer.q && !buffer.d && !buffer.b && !buffer.p && entityFollows !== 2) {
                    buffer.o = buffer.a;
                    buffer.a = void 0;
                  } else if (!buffer.o && !buffer.q && !buffer.d && (buffer.b || buffer.p)) {
                    buffer.o = buffer.a;
                    buffer.d = buffer.b;
                    buffer.q = buffer.p;
                    buffer.a = buffer.b = buffer.p = void 0;
                  } else {
                    if (buffer.o && buffer.dType === "kv" && _mhchemParser.patterns.match_("d-oxidation$", buffer.d || "")) {
                      buffer.dType = "oxidation";
                    } else if (buffer.o && buffer.dType === "kv" && !buffer.q) {
                      buffer.dType = void 0;
                    }
                  }
                  ret.push({
                    type_: "chemfive",
                    a: _mhchemParser.go(buffer.a, "a"),
                    b: _mhchemParser.go(buffer.b, "bd"),
                    p: _mhchemParser.go(buffer.p, "pq"),
                    o: _mhchemParser.go(buffer.o, "o"),
                    q: _mhchemParser.go(buffer.q, "pq"),
                    d: _mhchemParser.go(buffer.d, buffer.dType === "oxidation" ? "oxidation" : "bd"),
                    dType: buffer.dType
                  });
                }
              } else {
                let rd;
                if (buffer.rdt === "M") {
                  rd = _mhchemParser.go(buffer.rd, "tex-math");
                } else if (buffer.rdt === "T") {
                  rd = [{ type_: "text", p1: buffer.rd || "" }];
                } else {
                  rd = _mhchemParser.go(buffer.rd, "ce");
                }
                let rq;
                if (buffer.rqt === "M") {
                  rq = _mhchemParser.go(buffer.rq, "tex-math");
                } else if (buffer.rqt === "T") {
                  rq = [{ type_: "text", p1: buffer.rq || "" }];
                } else {
                  rq = _mhchemParser.go(buffer.rq, "ce");
                }
                ret = {
                  type_: "arrow",
                  r: buffer.r,
                  rd,
                  rq
                };
              }
              for (const p in buffer) {
                if (p !== "parenthesisLevel" && p !== "beginsWithBond") {
                  delete buffer[p];
                }
              }
              return ret;
            },
            "oxidation-output": function(_buffer, m) {
              let ret = ["{"];
              _mhchemParser.concatArray(ret, _mhchemParser.go(m, "oxidation"));
              ret.push("}");
              return ret;
            },
            "frac-output": function(_buffer, m) {
              return { type_: "frac-ce", p1: _mhchemParser.go(m[0], "ce"), p2: _mhchemParser.go(m[1], "ce") };
            },
            "overset-output": function(_buffer, m) {
              return { type_: "overset", p1: _mhchemParser.go(m[0], "ce"), p2: _mhchemParser.go(m[1], "ce") };
            },
            "underset-output": function(_buffer, m) {
              return { type_: "underset", p1: _mhchemParser.go(m[0], "ce"), p2: _mhchemParser.go(m[1], "ce") };
            },
            "underbrace-output": function(_buffer, m) {
              return { type_: "underbrace", p1: _mhchemParser.go(m[0], "ce"), p2: _mhchemParser.go(m[1], "ce") };
            },
            "color-output": function(_buffer, m) {
              return { type_: "color", color1: m[0], color2: _mhchemParser.go(m[1], "ce") };
            },
            "r=": function(buffer, m) {
              buffer.r = m;
              return void 0;
            },
            "rdt=": function(buffer, m) {
              buffer.rdt = m;
              return void 0;
            },
            "rd=": function(buffer, m) {
              buffer.rd = m;
              return void 0;
            },
            "rqt=": function(buffer, m) {
              buffer.rqt = m;
              return void 0;
            },
            "rq=": function(buffer, m) {
              buffer.rq = m;
              return void 0;
            },
            "operator": function(_buffer, m, p1) {
              return { type_: "operator", kind_: p1 || m };
            }
          }
        },
        "a": {
          transitions: _mhchemCreateTransitions(JSON.parse(`{
 "empty":{"*":{"action_":[]}},
 "1/2$":{"0":{"action_":"1/2"}},
 "else":{"0":{"action_":[],"nextState":"1","revisit":true}},
 "\${(...)}$__$(...)$":{"*":{"action_":"tex-math tight","nextState":"1"}},
 ",":{"*":{"action_":{"type_":"insert","option":"commaDecimal"}}},
 "else2":{"*":{"action_":"copy"}}
}`)),
          actions: {}
        },
        "o": {
          transitions: _mhchemCreateTransitions(JSON.parse(`{
 "empty":{"*":{"action_":[]}},
 "1/2$":{"0":{"action_":"1/2"}},
 "else":{"0":{"action_":[],"nextState":"1","revisit":true}},
 "letters":{"*":{"action_":"rm"}},
 "\\\\ca":{"*":{"action_":{"type_":"insert","option":"circa"}}},
 "\\\\pu{(...)}":{"*":{"action_":[{"type_":"write","option":"{"},"pu",{"type_":"write","option":"}"}]}},
 "\\\\x{}{}|\\\\x{}|\\\\x":{"*":{"action_":"copy"}},
 "\${(...)}$__$(...)$":{"*":{"action_":"tex-math"}},
 "{(...)}":{"*":{"action_":[{"type_":"write","option":"{"},"text",{"type_":"write","option":"}"}]}},
 "else2":{"*":{"action_":"copy"}}
}`)),
          actions: {}
        },
        "text": {
          transitions: _mhchemCreateTransitions(JSON.parse(`{
 "empty":{"*":{"action_":"output"}},
 "{...}":{"*":{"action_":"text="}},
 "\${(...)}$__$(...)$":{"*":{"action_":"tex-math"}},
 "\\\\greek":{"*":{"action_":["output","rm"]}},
 "\\\\pu{(...)}":{"*":{"action_":["output",{"type_":"write","option":"{"},"pu",{"type_":"write","option":"}"}]}},
 "\\\\,|\\\\x{}{}|\\\\x{}|\\\\x":{"*":{"action_":["output","copy"]}},
 "else":{"*":{"action_":"text="}}
}`)),
          actions: {
            "output": function(buffer) {
              if (buffer.text_) {
                let ret = { type_: "text", p1: buffer.text_ };
                for (const p in buffer) {
                  delete buffer[p];
                }
                return ret;
              }
              return void 0;
            }
          }
        },
        "pq": {
          transitions: _mhchemCreateTransitions(JSON.parse(`{
 "empty":{"*":{"action_":[]}},
 "state of aggregation $":{"*":{"action_":"state of aggregation"}},
 "i$":{"0":{"action_":[],"nextState":"!f","revisit":true}},
 "(KV letters),":{"0":{"action_":"rm","nextState":"0"}},
 "formula$":{"0":{"action_":[],"nextState":"f","revisit":true}},
 "1/2$":{"0":{"action_":"1/2"}},
 "else":{"0":{"action_":[],"nextState":"!f","revisit":true}},
 "\${(...)}$__$(...)$":{"*":{"action_":"tex-math"}},
 "{(...)}":{"*":{"action_":"text"}},
 "a-z":{"f":{"action_":"tex-math"}},
 "letters":{"*":{"action_":"rm"}},
 "-9.,9":{"*":{"action_":"9,9"}},
 ",":{"*":{"action_":{"type_":"insert+p1","option":"comma enumeration S"}}},
 "\\\\color{(...)}{(...)}":{"*":{"action_":"color-output"}},
 "\\\\color{(...)}":{"*":{"action_":"color0-output"}},
 "\\\\ce{(...)}":{"*":{"action_":"ce"}},
 "\\\\pu{(...)}":{"*":{"action_":[{"type_":"write","option":"{"},"pu",{"type_":"write","option":"}"}]}},
 "\\\\,|\\\\x{}{}|\\\\x{}|\\\\x":{"*":{"action_":"copy"}},
 "else2":{"*":{"action_":"copy"}}
}`)),
          actions: {
            "state of aggregation": function(_buffer, m) {
              return { type_: "state of aggregation subscript", p1: _mhchemParser.go(m, "o") };
            },
            "color-output": function(_buffer, m) {
              return { type_: "color", color1: m[0], color2: _mhchemParser.go(m[1], "pq") };
            }
          }
        },
        "bd": {
          transitions: _mhchemCreateTransitions(JSON.parse(`{
 "empty":{"*":{"action_":[]}},
 "x$":{"0":{"action_":[],"nextState":"!f","revisit":true}},
 "formula$":{"0":{"action_":[],"nextState":"f","revisit":true}},
 "else":{"0":{"action_":[],"nextState":"!f","revisit":true}},
 "-9.,9 no missing 0":{"*":{"action_":"9,9"}},
 ".":{"*":{"action_":{"type_":"insert","option":"electron dot"}}},
 "a-z":{"f":{"action_":"tex-math"}},
 "x":{"*":{"action_":{"type_":"insert","option":"KV x"}}},
 "letters":{"*":{"action_":"rm"}},
 "'":{"*":{"action_":{"type_":"insert","option":"prime"}}},
 "\${(...)}$__$(...)$":{"*":{"action_":"tex-math"}},
 "{(...)}":{"*":{"action_":"text"}},
 "\\\\color{(...)}{(...)}":{"*":{"action_":"color-output"}},
 "\\\\color{(...)}":{"*":{"action_":"color0-output"}},
 "\\\\ce{(...)}":{"*":{"action_":"ce"}},
 "\\\\pu{(...)}":{"*":{"action_":[{"type_":"write","option":"{"},"pu",{"type_":"write","option":"}"}]}},
 "\\\\,|\\\\x{}{}|\\\\x{}|\\\\x":{"*":{"action_":"copy"}},
 "else2":{"*":{"action_":"copy"}}
}`)),
          actions: {
            "color-output": function(_buffer, m) {
              return { type_: "color", color1: m[0], color2: _mhchemParser.go(m[1], "bd") };
            }
          }
        },
        "oxidation": {
          transitions: _mhchemCreateTransitions({
            "empty": {
              "*": { action_: "roman-numeral" }
            },
            "pm-operator": {
              "*": { action_: { type_: "o=+p1", option: "\\pm" } }
            },
            "else": {
              "*": { action_: "o=" }
            }
          }),
          actions: {
            "roman-numeral": function(buffer) {
              return { type_: "roman numeral", p1: buffer.o || "" };
            }
          }
        },
        "tex-math": {
          transitions: _mhchemCreateTransitions(JSON.parse(`{
 "empty":{"*":{"action_":"output"}},
 "\\\\ce{(...)}":{"*":{"action_":["output","ce"]}},
 "\\\\pu{(...)}":{"*":{"action_":["output",{"type_":"write","option":"{"},"pu",{"type_":"write","option":"}"}]}},
 "{...}|\\\\,|\\\\x{}{}|\\\\x{}|\\\\x":{"*":{"action_":"o="}},
 "else":{"*":{"action_":"o="}}
}`)),
          actions: {
            "output": function(buffer) {
              if (buffer.o) {
                let ret = { type_: "tex-math", p1: buffer.o };
                for (const p in buffer) {
                  delete buffer[p];
                }
                return ret;
              }
              return void 0;
            }
          }
        },
        "tex-math tight": {
          transitions: _mhchemCreateTransitions(JSON.parse(`{
 "empty":{"*":{"action_":"output"}},
 "\\\\ce{(...)}":{"*":{"action_":["output","ce"]}},
 "\\\\pu{(...)}":{"*":{"action_":["output",{"type_":"write","option":"{"},"pu",{"type_":"write","option":"}"}]}},
 "{...}|\\\\,|\\\\x{}{}|\\\\x{}|\\\\x":{"*":{"action_":"o="}},
 "-|+":{"*":{"action_":"tight operator"}},
 "else":{"*":{"action_":"o="}}
}`)),
          actions: {
            "tight operator": function(buffer, m) {
              buffer.o = (buffer.o || "") + "{" + m + "}";
              return void 0;
            },
            "output": function(buffer) {
              if (buffer.o) {
                let ret = { type_: "tex-math", p1: buffer.o };
                for (const p in buffer) {
                  delete buffer[p];
                }
                return ret;
              }
              return void 0;
            }
          }
        },
        "9,9": {
          transitions: _mhchemCreateTransitions({
            "empty": {
              "*": { action_: [] }
            },
            ",": {
              "*": { action_: "comma" }
            },
            "else": {
              "*": { action_: "copy" }
            }
          }),
          actions: {
            "comma": function() {
              return { type_: "commaDecimal" };
            }
          }
        },
        "pu": {
          transitions: _mhchemCreateTransitions(JSON.parse(`{
 "empty":{"*":{"action_":"output"}},
 "space$":{"*":{"action_":["output","space"]}},
 "{[(|)]}":{"0|a":{"action_":"copy"}},
 "(-)(9)^(-9)":{"0":{"action_":"number^","nextState":"a"}},
 "(-)(9.,9)(e)(99)":{"0":{"action_":"enumber","nextState":"a"}},
 "space":{"0|a":{"action_":[]}},
 "pm-operator":{"0|a":{"action_":{"type_":"operator","option":"\\\\pm"},"nextState":"0"}},
 "operator":{"0|a":{"action_":"copy","nextState":"0"}},
 "//":{"d":{"action_":"o=","nextState":"/"}},
 "/":{"d":{"action_":"o=","nextState":"/"}},
 "{...}|else":{"0|d":{"action_":"d=","nextState":"d"},"a":{"action_":["space","d="],"nextState":"d"},"/|q":{"action_":"q=","nextState":"q"}}
}`)),
          actions: {
            "enumber": function(_buffer, m) {
              let ret = [];
              if (m[0] === "+-" || m[0] === "+/-") {
                ret.push("\\pm ");
              } else if (m[0]) {
                ret.push(m[0]);
              }
              if (m[1]) {
                _mhchemParser.concatArray(ret, _mhchemParser.go(m[1], "pu-9,9"));
                if (m[2]) {
                  if (m[2].match(/[,.]/)) {
                    _mhchemParser.concatArray(ret, _mhchemParser.go(m[2], "pu-9,9"));
                  } else {
                    ret.push(m[2]);
                  }
                }
                if (m[3] || m[4]) {
                  if (m[3] === "e" || m[4] === "*") {
                    ret.push({ type_: "cdot" });
                  } else {
                    ret.push({ type_: "times" });
                  }
                }
              }
              if (m[5]) {
                ret.push("10^{" + m[5] + "}");
              }
              return ret;
            },
            "number^": function(_buffer, m) {
              let ret = [];
              if (m[0] === "+-" || m[0] === "+/-") {
                ret.push("\\pm ");
              } else if (m[0]) {
                ret.push(m[0]);
              }
              _mhchemParser.concatArray(ret, _mhchemParser.go(m[1], "pu-9,9"));
              ret.push("^{" + m[2] + "}");
              return ret;
            },
            "operator": function(_buffer, m, p1) {
              return { type_: "operator", kind_: p1 || m };
            },
            "space": function() {
              return { type_: "pu-space-1" };
            },
            "output": function(buffer) {
              let ret;
              const md = _mhchemParser.patterns.match_("{(...)}", buffer.d || "");
              if (md && md.remainder === "") {
                buffer.d = md.match_;
              }
              const mq = _mhchemParser.patterns.match_("{(...)}", buffer.q || "");
              if (mq && mq.remainder === "") {
                buffer.q = mq.match_;
              }
              if (buffer.d) {
                buffer.d = buffer.d.replace(/\u00B0C|\^oC|\^{o}C/g, "{}^{\\circ}C");
                buffer.d = buffer.d.replace(/\u00B0F|\^oF|\^{o}F/g, "{}^{\\circ}F");
              }
              if (buffer.q) {
                buffer.q = buffer.q.replace(/\u00B0C|\^oC|\^{o}C/g, "{}^{\\circ}C");
                buffer.q = buffer.q.replace(/\u00B0F|\^oF|\^{o}F/g, "{}^{\\circ}F");
                const b5 = {
                  d: _mhchemParser.go(buffer.d, "pu"),
                  q: _mhchemParser.go(buffer.q, "pu")
                };
                if (buffer.o === "//") {
                  ret = { type_: "pu-frac", p1: b5.d, p2: b5.q };
                } else {
                  ret = b5.d;
                  if (b5.d.length > 1 || b5.q.length > 1) {
                    ret.push({ type_: " / " });
                  } else {
                    ret.push({ type_: "/" });
                  }
                  _mhchemParser.concatArray(ret, b5.q);
                }
              } else {
                ret = _mhchemParser.go(buffer.d, "pu-2");
              }
              for (const p in buffer) {
                delete buffer[p];
              }
              return ret;
            }
          }
        },
        "pu-2": {
          transitions: _mhchemCreateTransitions(JSON.parse(`{
 "empty":{"*":{"action_":"output"}},
 "*":{"*":{"action_":["output","cdot"],"nextState":"0"}},
 "\\\\x":{"*":{"action_":"rm="}},
 "space":{"*":{"action_":["output","space"],"nextState":"0"}},
 "^{(...)}|^(-1)":{"1":{"action_":"^(-1)"}},
 "-9.,9":{"0":{"action_":"rm=","nextState":"0"},"1":{"action_":"^(-1)","nextState":"0"}},
 "{...}|else":{"*":{"action_":"rm=","nextState":"1"}}
}`)),
          actions: {
            "cdot": function() {
              return { type_: "tight cdot" };
            },
            "^(-1)": function(buffer, m) {
              buffer.rm += "^{" + m + "}";
              return void 0;
            },
            "space": function() {
              return { type_: "pu-space-2" };
            },
            "output": function(buffer) {
              let ret = [];
              if (buffer.rm) {
                const mrm = _mhchemParser.patterns.match_("{(...)}", buffer.rm || "");
                if (mrm && mrm.remainder === "") {
                  ret = _mhchemParser.go(mrm.match_, "pu");
                } else {
                  ret = { type_: "rm", p1: buffer.rm };
                }
              }
              for (const p in buffer) {
                delete buffer[p];
              }
              return ret;
            }
          }
        },
        "pu-9,9": {
          transitions: _mhchemCreateTransitions({
            "empty": {
              "0": { action_: "output-0" },
              "o": { action_: "output-o" }
            },
            ",": {
              "0": { action_: ["output-0", "comma"], nextState: "o" }
            },
            ".": {
              "0": { action_: ["output-0", "copy"], nextState: "o" }
            },
            "else": {
              "*": { action_: "text=" }
            }
          }),
          actions: {
            "comma": function() {
              return { type_: "commaDecimal" };
            },
            "output-0": function(buffer) {
              let ret = [];
              buffer.text_ = buffer.text_ || "";
              if (buffer.text_.length > 4) {
                let a = buffer.text_.length % 3;
                if (a === 0) {
                  a = 3;
                }
                for (let i2 = buffer.text_.length - 3; i2 > 0; i2 -= 3) {
                  ret.push(buffer.text_.substr(i2, 3));
                  ret.push({ type_: "1000 separator" });
                }
                ret.push(buffer.text_.substr(0, a));
                ret.reverse();
              } else {
                ret.push(buffer.text_);
              }
              for (const p in buffer) {
                delete buffer[p];
              }
              return ret;
            },
            "output-o": function(buffer) {
              let ret = [];
              buffer.text_ = buffer.text_ || "";
              if (buffer.text_.length > 4) {
                const a = buffer.text_.length - 3;
                let i2;
                for (i2 = 0; i2 < a; i2 += 3) {
                  ret.push(buffer.text_.substr(i2, 3));
                  ret.push({ type_: "1000 separator" });
                }
                ret.push(buffer.text_.substr(i2));
              } else {
                ret.push(buffer.text_);
              }
              for (const p in buffer) {
                delete buffer[p];
              }
              return ret;
            }
          }
        }
      }
    };
    _mhchemTexify = {
      go: function(input, addOuterBraces) {
        if (!input) {
          return "";
        }
        let res = "";
        let cee = false;
        for (let i2 = 0; i2 < input.length; i2++) {
          const inputi = input[i2];
          if (typeof inputi === "string") {
            res += inputi;
          } else {
            res += _mhchemTexify._go2(inputi);
            if (inputi.type_ === "1st-level escape") {
              cee = true;
            }
          }
        }
        if (addOuterBraces && !cee && res) {
          res = "{" + res + "}";
        }
        return res;
      },
      _goInner: function(input) {
        return _mhchemTexify.go(input, false);
      },
      _go2: function(buf) {
        let res;
        switch (buf.type_) {
          case "chemfive":
            res = "";
            const b5 = {
              a: _mhchemTexify._goInner(buf.a),
              b: _mhchemTexify._goInner(buf.b),
              p: _mhchemTexify._goInner(buf.p),
              o: _mhchemTexify._goInner(buf.o),
              q: _mhchemTexify._goInner(buf.q),
              d: _mhchemTexify._goInner(buf.d)
            };
            if (b5.a) {
              if (b5.a.match(/^[+\-]/)) {
                b5.a = "{" + b5.a + "}";
              }
              res += b5.a + "\\,";
            }
            if (b5.b || b5.p) {
              res += "{\\vphantom{A}}";
              res += "^{\\hphantom{" + (b5.b || "") + "}}_{\\hphantom{" + (b5.p || "") + "}}";
              res += "\\mkern-1.5mu";
              res += "{\\vphantom{A}}";
              res += "^{\\smash[t]{\\vphantom{2}}\\llap{" + (b5.b || "") + "}}";
              res += "_{\\vphantom{2}\\llap{\\smash[t]{" + (b5.p || "") + "}}}";
            }
            if (b5.o) {
              if (b5.o.match(/^[+\-]/)) {
                b5.o = "{" + b5.o + "}";
              }
              res += b5.o;
            }
            if (buf.dType === "kv") {
              if (b5.d || b5.q) {
                res += "{\\vphantom{A}}";
              }
              if (b5.d) {
                res += "^{" + b5.d + "}";
              }
              if (b5.q) {
                res += "_{\\smash[t]{" + b5.q + "}}";
              }
            } else if (buf.dType === "oxidation") {
              if (b5.d) {
                res += "{\\vphantom{A}}";
                res += "^{" + b5.d + "}";
              }
              if (b5.q) {
                res += "{\\vphantom{A}}";
                res += "_{\\smash[t]{" + b5.q + "}}";
              }
            } else {
              if (b5.q) {
                res += "{\\vphantom{A}}";
                res += "_{\\smash[t]{" + b5.q + "}}";
              }
              if (b5.d) {
                res += "{\\vphantom{A}}";
                res += "^{" + b5.d + "}";
              }
            }
            break;
          case "rm":
            res = "\\mathrm{" + buf.p1 + "}";
            break;
          case "text":
            if (buf.p1.match(/[\^_]/)) {
              buf.p1 = buf.p1.replace(" ", "~").replace("-", "\\text{-}");
              res = "\\mathrm{" + buf.p1 + "}";
            } else {
              res = "\\text{" + buf.p1 + "}";
            }
            break;
          case "roman numeral":
            res = "\\mathrm{" + buf.p1 + "}";
            break;
          case "state of aggregation":
            res = "\\mskip2mu " + _mhchemTexify._goInner(buf.p1);
            break;
          case "state of aggregation subscript":
            res = "\\mskip1mu " + _mhchemTexify._goInner(buf.p1);
            break;
          case "bond":
            res = _mhchemTexify._getBond(buf.kind_);
            if (!res) {
              throw ["MhchemErrorBond", "mhchem Error. Unknown bond type (" + buf.kind_ + ")"];
            }
            break;
          case "frac":
            const c = "\\frac{" + buf.p1 + "}{" + buf.p2 + "}";
            res = "\\mathchoice{\\textstyle" + c + "}{" + c + "}{" + c + "}{" + c + "}";
            break;
          case "pu-frac":
            const d = "\\frac{" + _mhchemTexify._goInner(buf.p1) + "}{" + _mhchemTexify._goInner(buf.p2) + "}";
            res = "\\mathchoice{\\textstyle" + d + "}{" + d + "}{" + d + "}{" + d + "}";
            break;
          case "tex-math":
            res = buf.p1 + " ";
            break;
          case "frac-ce":
            res = "\\frac{" + _mhchemTexify._goInner(buf.p1) + "}{" + _mhchemTexify._goInner(buf.p2) + "}";
            break;
          case "overset":
            res = "\\overset{" + _mhchemTexify._goInner(buf.p1) + "}{" + _mhchemTexify._goInner(buf.p2) + "}";
            break;
          case "underset":
            res = "\\underset{" + _mhchemTexify._goInner(buf.p1) + "}{" + _mhchemTexify._goInner(buf.p2) + "}";
            break;
          case "underbrace":
            res = "\\underbrace{" + _mhchemTexify._goInner(buf.p1) + "}_{" + _mhchemTexify._goInner(buf.p2) + "}";
            break;
          case "color":
            res = "{\\color{" + buf.color1 + "}{" + _mhchemTexify._goInner(buf.color2) + "}}";
            break;
          case "color0":
            res = "\\color{" + buf.color + "}";
            break;
          case "arrow":
            const b6 = {
              rd: _mhchemTexify._goInner(buf.rd),
              rq: _mhchemTexify._goInner(buf.rq)
            };
            let arrow = _mhchemTexify._getArrow(buf.r);
            if (b6.rd || b6.rq) {
              if (buf.r === "<=>" || buf.r === "<=>>" || buf.r === "<<=>" || buf.r === "<-->") {
                arrow = "\\long" + arrow;
                if (b6.rd) {
                  arrow = "\\overset{" + b6.rd + "}{" + arrow + "}";
                }
                if (b6.rq) {
                  if (buf.r === "<-->") {
                    arrow = "\\underset{\\lower2mu{" + b6.rq + "}}{" + arrow + "}";
                  } else {
                    arrow = "\\underset{\\lower6mu{" + b6.rq + "}}{" + arrow + "}";
                  }
                }
                arrow = " {}\\mathrel{" + arrow + "}{} ";
              } else {
                if (b6.rq) {
                  arrow += "[{" + b6.rq + "}]";
                }
                arrow += "{" + b6.rd + "}";
                arrow = " {}\\mathrel{\\x" + arrow + "}{} ";
              }
            } else {
              arrow = " {}\\mathrel{\\long" + arrow + "}{} ";
            }
            res = arrow;
            break;
          case "operator":
            res = _mhchemTexify._getOperator(buf.kind_);
            break;
          case "1st-level escape":
            res = buf.p1 + " ";
            break;
          case "space":
            res = " ";
            break;
          case "tinySkip":
            res = "\\mkern2mu";
            break;
          case "entitySkip":
            res = "~";
            break;
          case "pu-space-1":
            res = "~";
            break;
          case "pu-space-2":
            res = "\\mkern3mu ";
            break;
          case "1000 separator":
            res = "\\mkern2mu ";
            break;
          case "commaDecimal":
            res = "{,}";
            break;
          case "comma enumeration L":
            res = "{" + buf.p1 + "}\\mkern6mu ";
            break;
          case "comma enumeration M":
            res = "{" + buf.p1 + "}\\mkern3mu ";
            break;
          case "comma enumeration S":
            res = "{" + buf.p1 + "}\\mkern1mu ";
            break;
          case "hyphen":
            res = "\\text{-}";
            break;
          case "addition compound":
            res = "\\,{\\cdot}\\,";
            break;
          case "electron dot":
            res = "\\mkern1mu \\bullet\\mkern1mu ";
            break;
          case "KV x":
            res = "{\\times}";
            break;
          case "prime":
            res = "\\prime ";
            break;
          case "cdot":
            res = "\\cdot ";
            break;
          case "tight cdot":
            res = "\\mkern1mu{\\cdot}\\mkern1mu ";
            break;
          case "times":
            res = "\\times ";
            break;
          case "circa":
            res = "{\\sim}";
            break;
          case "^":
            res = "uparrow";
            break;
          case "v":
            res = "downarrow";
            break;
          case "ellipsis":
            res = "\\ldots ";
            break;
          case "/":
            res = "/";
            break;
          case " / ":
            res = "\\,/\\,";
            break;
          default:
            assertNever(buf);
            throw ["MhchemBugT", "mhchem bug T. Please report."];
        }
        return res;
      },
      _getArrow: function(a) {
        switch (a) {
          case "->":
            return "rightarrow";
          case "→":
            return "rightarrow";
          case "⟶":
            return "rightarrow";
          case "<-":
            return "leftarrow";
          case "<->":
            return "leftrightarrow";
          case "<-->":
            return "leftrightarrows";
          case "<=>":
            return "rightleftharpoons";
          case "⇌":
            return "rightleftharpoons";
          case "<=>>":
            return "Rightleftharpoons";
          case "<<=>":
            return "Leftrightharpoons";
          default:
            assertNever(a);
            throw ["MhchemBugT", "mhchem bug T. Please report."];
        }
      },
      _getBond: function(a) {
        switch (a) {
          case "-":
            return "{-}";
          case "1":
            return "{-}";
          case "=":
            return "{=}";
          case "2":
            return "{=}";
          case "#":
            return "{\\equiv}";
          case "3":
            return "{\\equiv}";
          case "~":
            return "{\\tripledash}";
          case "~-":
            return "{\\rlap{\\lower.1em{-}}\\raise.1em{\\tripledash}}";
          case "~=":
            return "{\\rlap{\\lower.2em{-}}\\rlap{\\raise.2em{\\tripledash}}-}";
          case "~--":
            return "{\\rlap{\\lower.2em{-}}\\rlap{\\raise.2em{\\tripledash}}-}";
          case "-~-":
            return "{\\rlap{\\lower.2em{-}}\\rlap{\\raise.2em{-}}\\tripledash}";
          case "...":
            return "{{\\cdot}{\\cdot}{\\cdot}}";
          case "....":
            return "{{\\cdot}{\\cdot}{\\cdot}{\\cdot}}";
          case "->":
            return "{\\rightarrow}";
          case "<-":
            return "{\\leftarrow}";
          case "<":
            return "{<}";
          case ">":
            return "{>}";
          default:
            assertNever(a);
            throw ["MhchemBugT", "mhchem bug T. Please report."];
        }
      },
      _getOperator: function(a) {
        switch (a) {
          case "+":
            return " {}+{} ";
          case "-":
            return " {}-{} ";
          case "=":
            return " {}={} ";
          case "<":
            return " {}<{} ";
          case ">":
            return " {}>{} ";
          case "<<":
            return " {}\\ll{} ";
          case ">>":
            return " {}\\gg{} ";
          case "\\pm":
            return " {}\\pm{} ";
          case "\\approx":
            return " {}\\approx{} ";
          case "$\\approx$":
            return " {}\\approx{} ";
          case "v":
            return " \\downarrow{} ";
          case "(v)":
            return " \\downarrow{} ";
          case "^":
            return " \\uparrow{} ";
          case "(^)":
            return " \\uparrow{} ";
          default:
            assertNever(a);
            throw ["MhchemBugT", "mhchem bug T. Please report."];
        }
      }
    };
  }
});
export{init_mhchemParser,mhchemParser,TextParser,TextMacrosMethods,init_TextMacrosMethods,init_TextParser,init_PhysicsConfiguration,init_TextMacrosConfiguration,init_UnicodeConfiguration};
