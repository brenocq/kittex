import{__esm,init_HandlerTypes,init_NodeUtil,init_TexConstants,init_ParseUtil,TexConstant,ParseUtil,HandlerType,NodeUtil_default,init_TokenMap,init_BaseMethods,init_MmlNode,init_lengths,em,MATHSPACE,RegExpMap,MacroMap,BaseMethods_default,CharacterMap,TEXCLASS,DelimiterMap,CommandMap,EnvironmentMap,MapHandler,getRange,TexError_default,init_Configuration,init_MapHandler,init_TexError,init_BaseItems,init_Tags,init_OperatorDictionary,init_context,AbstractTags,Configuration,ConfigurationType,StartItem,StopItem,OpenItem,CloseItem,NullItem,PrimeItem,SubsupItem,OverItem,LeftItem,Middle,RightItem,BreakItem,BeginItem,EndItem,StyleItem,PositionItem,CellItem,MmlItem,FnItem,NotItem,NonscriptItem,DotsItem,ArrayItem,EqnArrayItem,EquationItem,MstyleItem,context,init_InputJax,init_Options,init_FindTeX,init_FilterUtil,init_TexParser,init_ParseOptions,AbstractInputJax,ParserConfiguration,TagsFactory,separateOptions,FindTeX,ParseOptions_default,userOptions,FilterUtil_default,TexParser,defaultOptions,init_mathjax,init_AsyncLoad,init_Retries,asyncLoad,mathjax,retryAfter,BIGDIMEN,init_Visitor,AbstractVisitor,OPTABLE}from'./p17.js';export*from'./p17.js';
// node_modules/@mathjax/src/mjs/input/tex/ParseMethods.js
var MATHVARIANT2;
var ParseMethods;
var ParseMethods_default;
var init_ParseMethods = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/ParseMethods.js"() {
    init_HandlerTypes();
    init_NodeUtil();
    init_TexConstants();
    init_ParseUtil();
    MATHVARIANT2 = TexConstant.Variant;
    ParseMethods = {
      variable(parser2, c) {
        var _a2;
        const def2 = ParseUtil.getFontDef(parser2);
        const env = parser2.stack.env;
        if (env.multiLetterIdentifiers && env.font !== "") {
          c = ((_a2 = parser2.string.substring(parser2.i - 1).match(env.multiLetterIdentifiers)) === null || _a2 === void 0 ? void 0 : _a2[0]) || c;
          parser2.i += c.length - 1;
          if (def2.mathvariant === MATHVARIANT2.NORMAL && env.noAutoOP && c.length > 1) {
            def2.autoOP = false;
          }
        }
        if (!def2.mathvariant && ParseUtil.isLatinOrGreekChar(c)) {
          const variant = parser2.configuration.mathStyle(c);
          if (variant) {
            def2.mathvariant = variant;
          }
        }
        const node = parser2.create("token", "mi", def2, c);
        parser2.Push(node);
      },
      digit(parser2, _c) {
        const pattern = parser2.configuration.options["numberPattern"];
        const n = parser2.string.slice(parser2.i - 1).match(pattern);
        if (!n) {
          return false;
        }
        const def2 = ParseUtil.getFontDef(parser2);
        const mml = parser2.create("token", "mn", def2, n[0].replace(/[{}]/g, ""));
        parser2.i += n[0].length - 1;
        parser2.Push(mml);
        return true;
      },
      controlSequence(parser2, _c) {
        const name = parser2.GetCS();
        parser2.parse(HandlerType.MACRO, [parser2, name]);
      },
      lcGreek(parser2, mchar) {
        const def2 = {
          mathvariant: parser2.configuration.mathStyle(mchar.char) || MATHVARIANT2.ITALIC
        };
        const node = parser2.create("token", "mi", def2, mchar.char);
        parser2.Push(node);
      },
      ucGreek(parser2, mchar) {
        const def2 = {
          mathvariant: parser2.stack.env["font"] || parser2.configuration.mathStyle(mchar.char, true) || MATHVARIANT2.NORMAL
        };
        const node = parser2.create("token", "mi", def2, mchar.char);
        parser2.Push(node);
      },
      mathchar0mi(parser2, mchar) {
        const def2 = mchar.attributes || { mathvariant: MATHVARIANT2.ITALIC };
        const node = parser2.create("token", "mi", def2, mchar.char);
        parser2.Push(node);
      },
      mathchar0mo(parser2, mchar) {
        const def2 = mchar.attributes || {};
        def2["stretchy"] = false;
        const node = parser2.create("token", "mo", def2, mchar.char);
        NodeUtil_default.setProperty(node, "fixStretchy", true);
        parser2.configuration.addNode("fixStretchy", node);
        parser2.Push(node);
      },
      mathchar7(parser2, mchar) {
        const def2 = mchar.attributes || { mathvariant: MATHVARIANT2.NORMAL };
        if (parser2.stack.env["font"]) {
          def2["mathvariant"] = parser2.stack.env["font"];
        }
        const node = parser2.create("token", "mi", def2, mchar.char);
        parser2.Push(node);
      },
      delimiter(parser2, delim) {
        let def2 = delim.attributes || {};
        def2 = Object.assign({ fence: false, stretchy: false }, def2);
        const node = parser2.create("token", "mo", def2, delim.char);
        if (delim.char === "|") {
          node.setProperty("keep-attrs", "stretchy");
        }
        parser2.Push(node);
      },
      environment(parser2, env, func, args) {
        const mml = parser2.itemFactory.create("begin").setProperty("name", env);
        parser2.Push(func(parser2, mml, ...args.slice(1)));
      }
    };
    ParseMethods_default = ParseMethods;
  }
});
// node_modules/@mathjax/src/mjs/input/tex/base/BaseMappings.js
var THICKMATHSPACE;
var VARIANT;
var init_BaseMappings = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/base/BaseMappings.js"() {
    init_TokenMap();
    init_TexConstants();
    init_BaseMethods();
    init_ParseMethods();
    init_ParseUtil();
    init_MmlNode();
    init_lengths();
    THICKMATHSPACE = em(MATHSPACE.thickmathspace);
    VARIANT = TexConstant.Variant;
    new RegExpMap("letter", ParseMethods_default.variable, /[a-z]/i);
    new RegExpMap("digit", ParseMethods_default.digit, /[0-9.,]/);
    new RegExpMap("command", ParseMethods_default.controlSequence, /^\\/);
    new MacroMap("special", {
      "{": BaseMethods_default.Open,
      "}": BaseMethods_default.Close,
      "~": BaseMethods_default.Tilde,
      "^": BaseMethods_default.Superscript,
      _: BaseMethods_default.Subscript,
      "|": BaseMethods_default.Bar,
      " ": BaseMethods_default.Space,
      "	": BaseMethods_default.Space,
      "\r": BaseMethods_default.Space,
      "\n": BaseMethods_default.Space,
      "'": BaseMethods_default.Prime,
      "%": BaseMethods_default.Comment,
      "&": BaseMethods_default.Entry,
      "#": BaseMethods_default.Hash,
      "\u00A0": BaseMethods_default.Space,
      "’": BaseMethods_default.Prime
    });
    new CharacterMap("lcGreek", ParseMethods_default.lcGreek, JSON.parse(`{
 "alpha":"α","beta":"β","gamma":"γ","delta":"δ","epsilon":"ϵ","zeta":"ζ","eta":"η","theta":"θ","iota":"ι","kappa":"κ","lambda":"λ","mu":"μ","nu":"ν","xi":"ξ","omicron":"ο","pi":"π","rho":"ρ",
 "sigma":"σ","tau":"τ","upsilon":"υ","phi":"ϕ","chi":"χ","psi":"ψ","omega":"ω","varepsilon":"ε","vartheta":"ϑ","varpi":"ϖ","varrho":"ϱ","varsigma":"ς","varphi":"φ"
}`));
    new CharacterMap("ucGreek", ParseMethods_default.ucGreek, {
      Gamma: "Γ",
      Delta: "Δ",
      Theta: "Θ",
      Lambda: "Λ",
      Xi: "Ξ",
      Pi: "Π",
      Sigma: "Σ",
      Upsilon: "Υ",
      Phi: "Φ",
      Psi: "Ψ",
      Omega: "Ω"
    });
    new CharacterMap("mathchar0mi", ParseMethods_default.mathchar0mi, {
      AA: "Å",
      S: ["§", { mathvariant: VARIANT.NORMAL }],
      aleph: ["ℵ", { mathvariant: VARIANT.NORMAL }],
      hbar: ["ℏ", { variantForm: true }],
      imath: "ı",
      jmath: "ȷ",
      ell: "ℓ",
      wp: ["℘", { mathvariant: VARIANT.NORMAL }],
      Re: ["ℜ", { mathvariant: VARIANT.NORMAL }],
      Im: ["ℑ", { mathvariant: VARIANT.NORMAL }],
      partial: ["∂", { mathvariant: VARIANT.ITALIC }],
      infty: ["∞", { mathvariant: VARIANT.NORMAL }],
      prime: ["′", { variantForm: true }],
      emptyset: ["∅", { mathvariant: VARIANT.NORMAL }],
      nabla: ["∇", { mathvariant: VARIANT.NORMAL }],
      top: ["⊤", { mathvariant: VARIANT.NORMAL }],
      bot: ["⊥", { mathvariant: VARIANT.NORMAL }],
      angle: ["∠", { mathvariant: VARIANT.NORMAL }],
      triangle: ["△", { mathvariant: VARIANT.NORMAL }],
      backslash: ["\\", { mathvariant: VARIANT.NORMAL }],
      forall: ["∀", { mathvariant: VARIANT.NORMAL }],
      exists: ["∃", { mathvariant: VARIANT.NORMAL }],
      neg: ["¬", { mathvariant: VARIANT.NORMAL }],
      lnot: ["¬", { mathvariant: VARIANT.NORMAL }],
      flat: ["♭", { mathvariant: VARIANT.NORMAL }],
      natural: ["♮", { mathvariant: VARIANT.NORMAL }],
      sharp: ["♯", { mathvariant: VARIANT.NORMAL }],
      clubsuit: ["♣", { mathvariant: VARIANT.NORMAL }],
      diamondsuit: ["♢", { mathvariant: VARIANT.NORMAL }],
      heartsuit: ["♡", { mathvariant: VARIANT.NORMAL }],
      spadesuit: ["♠", { mathvariant: VARIANT.NORMAL }]
    });
    new CharacterMap("mathchar0mo", ParseMethods_default.mathchar0mo, {
      surd: ["√", { symmetric: true }],
      coprod: ["∐", { movesupsub: true }],
      bigvee: ["⋁", { movesupsub: true }],
      bigwedge: ["⋀", { movesupsub: true }],
      biguplus: ["⨄", { movesupsub: true }],
      bigcap: ["⋂", { movesupsub: true }],
      bigcup: ["⋃", { movesupsub: true }],
      int: "∫",
      intop: ["∫", { movesupsub: true, movablelimits: true }],
      iint: "∬",
      iiint: "∭",
      prod: ["∏", { movesupsub: true }],
      sum: ["∑", { movesupsub: true }],
      bigotimes: ["⨂", { movesupsub: true }],
      bigoplus: ["⨁", { movesupsub: true }],
      bigodot: ["⨀", { movesupsub: true }],
      oint: "∮",
      ointop: ["∮", { movesupsub: true, movablelimits: true }],
      oiint: "∯",
      oiiint: "∰",
      bigsqcup: ["⨆", { movesupsub: true }],
      smallint: ["∫", { largeop: false }],
      triangleleft: "◃",
      triangleright: "▹",
      bigtriangleup: "△",
      bigtriangledown: "▽",
      wedge: "∧",
      land: "∧",
      vee: "∨",
      lor: "∨",
      cap: "∩",
      cup: "∪",
      ddagger: "‡",
      dagger: "†",
      sqcap: "⊓",
      sqcup: "⊔",
      uplus: "⊎",
      amalg: "⨿",
      diamond: "⋄",
      bullet: "∙",
      wr: "≀",
      div: "÷",
      odot: ["⊙", { largeop: false }],
      oslash: ["⊘", { largeop: false }],
      otimes: ["⊗", { largeop: false }],
      ominus: ["⊖", { largeop: false }],
      oplus: ["⊕", { largeop: false }],
      mp: "∓",
      pm: "±",
      circ: "∘",
      bigcirc: "◯",
      setminus: "∖",
      cdot: "⋅",
      ast: "∗",
      times: "×",
      star: "⋆",
      propto: "∝",
      sqsubseteq: "⊑",
      sqsupseteq: "⊒",
      parallel: "∥",
      mid: "∣",
      dashv: "⊣",
      vdash: "⊢",
      leq: "≤",
      le: "≤",
      geq: "≥",
      ge: "≥",
      lt: "<",
      gt: ">",
      succ: "≻",
      prec: "≺",
      approx: "≈",
      succeq: "⪰",
      preceq: "⪯",
      supset: "⊃",
      subset: "⊂",
      supseteq: "⊇",
      subseteq: "⊆",
      in: "∈",
      ni: "∋",
      notin: "∉",
      owns: "∋",
      gg: "≫",
      ll: "≪",
      sim: "∼",
      simeq: "≃",
      perp: "⟂",
      equiv: "≡",
      asymp: "≍",
      smile: "⌣",
      frown: "⌢",
      ne: "≠",
      neq: "≠",
      cong: "≅",
      doteq: "≐",
      bowtie: "⋈",
      models: "⊧",
      notChar: "⧸",
      Leftrightarrow: "⇔",
      Leftarrow: "⇐",
      Rightarrow: "⇒",
      leftrightarrow: "↔",
      leftarrow: "←",
      gets: "←",
      rightarrow: "→",
      to: ["→", { accent: false }],
      mapsto: "↦",
      leftharpoonup: "↼",
      leftharpoondown: "↽",
      rightharpoonup: "⇀",
      rightharpoondown: "⇁",
      nearrow: "↗",
      searrow: "↘",
      nwarrow: "↖",
      swarrow: "↙",
      rightleftharpoons: "⇌",
      hookrightarrow: "↪",
      hookleftarrow: "↩",
      longleftarrow: "⟵",
      Longleftarrow: "⟸",
      longrightarrow: "⟶",
      Longrightarrow: "⟹",
      Longleftrightarrow: "⟺",
      longleftrightarrow: "⟷",
      longmapsto: "⟼",
      ldots: "…",
      cdots: "⋯",
      vdots: "⋮",
      ddots: "⋱",
      iddots: "⋰",
      dotsc: "…",
      dotsb: "⋯",
      dotsm: "⋯",
      dotsi: "⋯",
      dotso: "…",
      ldotp: [".", { texClass: TEXCLASS.PUNCT }],
      cdotp: ["⋅", { texClass: TEXCLASS.PUNCT }],
      colon: [":", { texClass: TEXCLASS.PUNCT }]
    });
    new CharacterMap("mathchar7", ParseMethods_default.mathchar7, {
      _: "_",
      "#": "#",
      $: "$",
      "%": "%",
      "&": "&",
      And: "&"
    });
    new DelimiterMap("delimiter", ParseMethods_default.delimiter, {
      "(": "(",
      ")": ")",
      "[": "[",
      "]": "]",
      "<": "⟨",
      ">": "⟩",
      "\\lt": "⟨",
      "\\gt": "⟩",
      "/": "/",
      "|": ["|", { texClass: TEXCLASS.ORD }],
      ".": "",
      "\\lmoustache": "⎰",
      "\\rmoustache": "⎱",
      "\\lgroup": "⟮",
      "\\rgroup": "⟯",
      "\\arrowvert": "⏐",
      "\\Arrowvert": "‖",
      "\\bracevert": "⎪",
      "\\Vert": ["‖", { texClass: TEXCLASS.ORD }],
      "\\|": ["‖", { texClass: TEXCLASS.ORD }],
      "\\vert": ["|", { texClass: TEXCLASS.ORD }],
      "\\uparrow": "↑",
      "\\downarrow": "↓",
      "\\updownarrow": "↕",
      "\\Uparrow": "⇑",
      "\\Downarrow": "⇓",
      "\\Updownarrow": "⇕",
      "\\backslash": "\\",
      "\\rangle": "⟩",
      "\\langle": "⟨",
      "\\rbrace": "}",
      "\\lbrace": "{",
      "\\}": "}",
      "\\{": "{",
      "\\rceil": "⌉",
      "\\lceil": "⌈",
      "\\rfloor": "⌋",
      "\\lfloor": "⌊",
      "\\lbrack": "[",
      "\\rbrack": "]"
    });
    new CommandMap("macros", {
      displaystyle: [BaseMethods_default.SetStyle, "D", true, 0],
      textstyle: [BaseMethods_default.SetStyle, "T", false, 0],
      scriptstyle: [BaseMethods_default.SetStyle, "S", false, 1],
      scriptscriptstyle: [BaseMethods_default.SetStyle, "SS", false, 2],
      rm: [BaseMethods_default.SetFont, VARIANT.NORMAL],
      mit: [BaseMethods_default.SetFont, VARIANT.ITALIC],
      oldstyle: [BaseMethods_default.SetFont, VARIANT.OLDSTYLE],
      cal: [BaseMethods_default.SetFont, VARIANT.CALLIGRAPHIC],
      it: [BaseMethods_default.SetFont, VARIANT.MATHITALIC],
      bf: [BaseMethods_default.SetFont, VARIANT.BOLD],
      sf: [BaseMethods_default.SetFont, VARIANT.SANSSERIF],
      tt: [BaseMethods_default.SetFont, VARIANT.MONOSPACE],
      frak: [BaseMethods_default.MathFont, VARIANT.FRAKTUR],
      Bbb: [BaseMethods_default.MathFont, VARIANT.DOUBLESTRUCK],
      mathrm: [BaseMethods_default.MathFont, VARIANT.NORMAL],
      mathup: [BaseMethods_default.MathFont, VARIANT.NORMAL],
      mathnormal: [BaseMethods_default.MathFont, ""],
      mathbf: [BaseMethods_default.MathFont, VARIANT.BOLD],
      mathbfup: [BaseMethods_default.MathFont, VARIANT.BOLD],
      mathit: [BaseMethods_default.MathFont, VARIANT.MATHITALIC],
      mathbfit: [BaseMethods_default.MathFont, VARIANT.BOLDITALIC],
      mathbb: [BaseMethods_default.MathFont, VARIANT.DOUBLESTRUCK],
      mathfrak: [BaseMethods_default.MathFont, VARIANT.FRAKTUR],
      mathbffrak: [BaseMethods_default.MathFont, VARIANT.BOLDFRAKTUR],
      mathscr: [BaseMethods_default.MathFont, VARIANT.SCRIPT],
      mathbfscr: [BaseMethods_default.MathFont, VARIANT.BOLDSCRIPT],
      mathsf: [BaseMethods_default.MathFont, VARIANT.SANSSERIF],
      mathsfup: [BaseMethods_default.MathFont, VARIANT.SANSSERIF],
      mathbfsf: [BaseMethods_default.MathFont, VARIANT.BOLDSANSSERIF],
      mathbfsfup: [BaseMethods_default.MathFont, VARIANT.BOLDSANSSERIF],
      mathsfit: [BaseMethods_default.MathFont, VARIANT.SANSSERIFITALIC],
      mathbfsfit: [BaseMethods_default.MathFont, VARIANT.SANSSERIFBOLDITALIC],
      mathtt: [BaseMethods_default.MathFont, VARIANT.MONOSPACE],
      mathcal: [BaseMethods_default.MathFont, VARIANT.CALLIGRAPHIC],
      mathbfcal: [BaseMethods_default.MathFont, VARIANT.BOLDCALLIGRAPHIC],
      symrm: [BaseMethods_default.MathFont, VARIANT.NORMAL],
      symup: [BaseMethods_default.MathFont, VARIANT.NORMAL],
      symnormal: [BaseMethods_default.MathFont, ""],
      symbf: [BaseMethods_default.MathFont, VARIANT.BOLD, VARIANT.BOLDITALIC],
      symbfup: [BaseMethods_default.MathFont, VARIANT.BOLD],
      symit: [BaseMethods_default.MathFont, VARIANT.ITALIC],
      symbfit: [BaseMethods_default.MathFont, VARIANT.BOLDITALIC],
      symbb: [BaseMethods_default.MathFont, VARIANT.DOUBLESTRUCK],
      symfrak: [BaseMethods_default.MathFont, VARIANT.FRAKTUR],
      symbffrak: [BaseMethods_default.MathFont, VARIANT.BOLDFRAKTUR],
      symscr: [BaseMethods_default.MathFont, VARIANT.SCRIPT],
      symbfscr: [BaseMethods_default.MathFont, VARIANT.BOLDSCRIPT],
      symsf: [BaseMethods_default.MathFont, VARIANT.SANSSERIF, VARIANT.SANSSERIFITALIC],
      symsfup: [BaseMethods_default.MathFont, VARIANT.SANSSERIF],
      symbfsf: [BaseMethods_default.MathFont, VARIANT.BOLDSANSSERIF],
      symbfsfup: [BaseMethods_default.MathFont, VARIANT.BOLDSANSSERIF],
      symsfit: [BaseMethods_default.MathFont, VARIANT.SANSSERIFITALIC],
      symbfsfit: [BaseMethods_default.MathFont, VARIANT.SANSSERIFBOLDITALIC],
      symtt: [BaseMethods_default.MathFont, VARIANT.MONOSPACE],
      symcal: [BaseMethods_default.MathFont, VARIANT.CALLIGRAPHIC],
      symbfcal: [BaseMethods_default.MathFont, VARIANT.BOLDCALLIGRAPHIC],
      textrm: [BaseMethods_default.HBox, null, VARIANT.NORMAL],
      textup: [BaseMethods_default.HBox, null, VARIANT.NORMAL],
      textnormal: [BaseMethods_default.HBox],
      textit: [BaseMethods_default.HBox, null, VARIANT.ITALIC],
      textbf: [BaseMethods_default.HBox, null, VARIANT.BOLD],
      textsf: [BaseMethods_default.HBox, null, VARIANT.SANSSERIF],
      texttt: [BaseMethods_default.HBox, null, VARIANT.MONOSPACE],
      Tiny: [BaseMethods_default.SetSize, 0.5],
      tiny: [BaseMethods_default.SetSize, 0.6],
      scriptsize: [BaseMethods_default.SetSize, 0.7],
      SMALL: [BaseMethods_default.SetSize, 0.7],
      Small: [BaseMethods_default.SetSize, 0.8],
      footnotesize: [BaseMethods_default.SetSize, 0.8],
      small: [BaseMethods_default.SetSize, 0.9],
      normalsize: [BaseMethods_default.SetSize, 1],
      large: [BaseMethods_default.SetSize, 1.095],
      Large: [BaseMethods_default.SetSize, 1.2],
      LARGE: [BaseMethods_default.SetSize, 1.44],
      huge: [BaseMethods_default.SetSize, 1.728],
      Huge: [BaseMethods_default.SetSize, 2.074],
      HUGE: [BaseMethods_default.SetSize, 2.49],
      arcsin: BaseMethods_default.NamedFn,
      arccos: BaseMethods_default.NamedFn,
      arctan: BaseMethods_default.NamedFn,
      arg: BaseMethods_default.NamedFn,
      cos: BaseMethods_default.NamedFn,
      cosh: BaseMethods_default.NamedFn,
      cot: BaseMethods_default.NamedFn,
      coth: BaseMethods_default.NamedFn,
      csc: BaseMethods_default.NamedFn,
      deg: BaseMethods_default.NamedFn,
      det: BaseMethods_default.NamedOp,
      dim: BaseMethods_default.NamedFn,
      exp: BaseMethods_default.NamedFn,
      gcd: BaseMethods_default.NamedOp,
      hom: BaseMethods_default.NamedFn,
      inf: BaseMethods_default.NamedOp,
      ker: BaseMethods_default.NamedFn,
      lg: BaseMethods_default.NamedFn,
      lim: BaseMethods_default.NamedOp,
      liminf: [BaseMethods_default.NamedOp, "lim&thinsp;inf"],
      limsup: [BaseMethods_default.NamedOp, "lim&thinsp;sup"],
      ln: BaseMethods_default.NamedFn,
      log: BaseMethods_default.NamedFn,
      max: BaseMethods_default.NamedOp,
      min: BaseMethods_default.NamedOp,
      Pr: BaseMethods_default.NamedOp,
      sec: BaseMethods_default.NamedFn,
      sin: BaseMethods_default.NamedFn,
      sinh: BaseMethods_default.NamedFn,
      sup: BaseMethods_default.NamedOp,
      tan: BaseMethods_default.NamedFn,
      tanh: BaseMethods_default.NamedFn,
      limits: [BaseMethods_default.Limits, true],
      nolimits: [BaseMethods_default.Limits, false],
      overline: [BaseMethods_default.UnderOver, "2015"],
      underline: [BaseMethods_default.UnderOver, "2015"],
      overbrace: [BaseMethods_default.UnderOver, "23DE", true],
      underbrace: [BaseMethods_default.UnderOver, "23DF", true],
      overparen: [BaseMethods_default.UnderOver, "23DC"],
      underparen: [BaseMethods_default.UnderOver, "23DD"],
      overrightarrow: [BaseMethods_default.UnderOver, "2192"],
      underrightarrow: [BaseMethods_default.UnderOver, "2192"],
      overleftarrow: [BaseMethods_default.UnderOver, "2190"],
      underleftarrow: [BaseMethods_default.UnderOver, "2190"],
      overleftrightarrow: [BaseMethods_default.UnderOver, "2194"],
      underleftrightarrow: [BaseMethods_default.UnderOver, "2194"],
      overset: BaseMethods_default.Overset,
      underset: BaseMethods_default.Underset,
      overunderset: BaseMethods_default.Overunderset,
      stackrel: [BaseMethods_default.Macro, "\\mathrel{\\mathop{#2}\\limits^{#1}}", 2],
      stackbin: [BaseMethods_default.Macro, "\\mathbin{\\mathop{#2}\\limits^{#1}}", 2],
      over: BaseMethods_default.Over,
      overwithdelims: BaseMethods_default.Over,
      atop: BaseMethods_default.Over,
      atopwithdelims: BaseMethods_default.Over,
      above: BaseMethods_default.Over,
      abovewithdelims: BaseMethods_default.Over,
      brace: [BaseMethods_default.Over, "{", "}"],
      brack: [BaseMethods_default.Over, "[", "]"],
      choose: [BaseMethods_default.Over, "(", ")"],
      frac: BaseMethods_default.Frac,
      sqrt: BaseMethods_default.Sqrt,
      root: BaseMethods_default.Root,
      uproot: [BaseMethods_default.MoveRoot, "upRoot"],
      leftroot: [BaseMethods_default.MoveRoot, "leftRoot"],
      left: BaseMethods_default.LeftRight,
      right: BaseMethods_default.LeftRight,
      middle: BaseMethods_default.LeftRight,
      llap: BaseMethods_default.Lap,
      rlap: BaseMethods_default.Lap,
      raise: BaseMethods_default.RaiseLower,
      lower: BaseMethods_default.RaiseLower,
      moveleft: BaseMethods_default.MoveLeftRight,
      moveright: BaseMethods_default.MoveLeftRight,
      ",": [BaseMethods_default.Spacer, MATHSPACE.thinmathspace],
      ":": [BaseMethods_default.Spacer, MATHSPACE.mediummathspace],
      ">": [BaseMethods_default.Spacer, MATHSPACE.mediummathspace],
      ";": [BaseMethods_default.Spacer, MATHSPACE.thickmathspace],
      "!": [BaseMethods_default.Spacer, MATHSPACE.negativethinmathspace],
      enspace: [BaseMethods_default.Spacer, 0.5],
      quad: [BaseMethods_default.Spacer, 1],
      qquad: [BaseMethods_default.Spacer, 2],
      thinspace: [BaseMethods_default.Spacer, MATHSPACE.thinmathspace],
      negthinspace: [BaseMethods_default.Spacer, MATHSPACE.negativethinmathspace],
      "*": BaseMethods_default.DiscretionaryTimes,
      allowbreak: BaseMethods_default.AllowBreak,
      goodbreak: [BaseMethods_default.Linebreak, TexConstant.LineBreak.GOODBREAK],
      badbreak: [BaseMethods_default.Linebreak, TexConstant.LineBreak.BADBREAK],
      nobreak: [BaseMethods_default.Linebreak, TexConstant.LineBreak.NOBREAK],
      break: BaseMethods_default.Break,
      hskip: BaseMethods_default.Hskip,
      hspace: BaseMethods_default.Hskip,
      kern: [BaseMethods_default.Hskip, true],
      mskip: BaseMethods_default.Hskip,
      mspace: BaseMethods_default.Hskip,
      mkern: [BaseMethods_default.Hskip, true],
      rule: BaseMethods_default.rule,
      Rule: [BaseMethods_default.Rule],
      Space: [BaseMethods_default.Rule, "blank"],
      nonscript: BaseMethods_default.Nonscript,
      big: [BaseMethods_default.MakeBig, TEXCLASS.ORD, 0.85],
      Big: [BaseMethods_default.MakeBig, TEXCLASS.ORD, 1.15],
      bigg: [BaseMethods_default.MakeBig, TEXCLASS.ORD, 1.45],
      Bigg: [BaseMethods_default.MakeBig, TEXCLASS.ORD, 1.75],
      bigl: [BaseMethods_default.MakeBig, TEXCLASS.OPEN, 0.85],
      Bigl: [BaseMethods_default.MakeBig, TEXCLASS.OPEN, 1.15],
      biggl: [BaseMethods_default.MakeBig, TEXCLASS.OPEN, 1.45],
      Biggl: [BaseMethods_default.MakeBig, TEXCLASS.OPEN, 1.75],
      bigr: [BaseMethods_default.MakeBig, TEXCLASS.CLOSE, 0.85],
      Bigr: [BaseMethods_default.MakeBig, TEXCLASS.CLOSE, 1.15],
      biggr: [BaseMethods_default.MakeBig, TEXCLASS.CLOSE, 1.45],
      Biggr: [BaseMethods_default.MakeBig, TEXCLASS.CLOSE, 1.75],
      bigm: [BaseMethods_default.MakeBig, TEXCLASS.REL, 0.85],
      Bigm: [BaseMethods_default.MakeBig, TEXCLASS.REL, 1.15],
      biggm: [BaseMethods_default.MakeBig, TEXCLASS.REL, 1.45],
      Biggm: [BaseMethods_default.MakeBig, TEXCLASS.REL, 1.75],
      mathord: [BaseMethods_default.TeXAtom, TEXCLASS.ORD],
      mathop: [BaseMethods_default.TeXAtom, TEXCLASS.OP],
      mathopen: [BaseMethods_default.TeXAtom, TEXCLASS.OPEN],
      mathclose: [BaseMethods_default.TeXAtom, TEXCLASS.CLOSE],
      mathbin: [BaseMethods_default.TeXAtom, TEXCLASS.BIN],
      mathrel: [BaseMethods_default.TeXAtom, TEXCLASS.REL],
      mathpunct: [BaseMethods_default.TeXAtom, TEXCLASS.PUNCT],
      mathinner: [BaseMethods_default.TeXAtom, TEXCLASS.INNER],
      vtop: [BaseMethods_default.VBox, "top"],
      vcenter: [BaseMethods_default.VBox, "center"],
      vbox: [BaseMethods_default.VBox, "bottom"],
      hsize: BaseMethods_default.Hsize,
      parbox: BaseMethods_default.ParBox,
      breakAlign: BaseMethods_default.BreakAlign,
      buildrel: BaseMethods_default.BuildRel,
      hbox: [BaseMethods_default.HBox, 0],
      text: BaseMethods_default.HBox,
      mbox: [BaseMethods_default.HBox, 0],
      fbox: BaseMethods_default.FBox,
      boxed: [BaseMethods_default.Macro, "\\fbox{$\\displaystyle{#1}$}", 1],
      framebox: BaseMethods_default.FrameBox,
      makebox: BaseMethods_default.MakeBox,
      strut: BaseMethods_default.Strut,
      mathstrut: [BaseMethods_default.Macro, "\\vphantom{(}"],
      phantom: BaseMethods_default.Phantom,
      vphantom: [BaseMethods_default.Phantom, 1, 0],
      hphantom: [BaseMethods_default.Phantom, 0, 1],
      smash: BaseMethods_default.Smash,
      acute: [BaseMethods_default.Accent, "00B4"],
      grave: [BaseMethods_default.Accent, "0060"],
      ddot: [BaseMethods_default.Accent, "00A8"],
      dddot: [BaseMethods_default.Accent, "20DB"],
      ddddot: [BaseMethods_default.Accent, "20DC"],
      tilde: [BaseMethods_default.Accent, "007E"],
      bar: [BaseMethods_default.Accent, "00AF"],
      breve: [BaseMethods_default.Accent, "02D8"],
      check: [BaseMethods_default.Accent, "02C7"],
      hat: [BaseMethods_default.Accent, "005E"],
      vec: [BaseMethods_default.Accent, "2192", false],
      dot: [BaseMethods_default.Accent, "02D9"],
      widetilde: [BaseMethods_default.Accent, "007E", true],
      widehat: [BaseMethods_default.Accent, "005E", true],
      matrix: BaseMethods_default.Matrix,
      array: BaseMethods_default.Matrix,
      pmatrix: [BaseMethods_default.Matrix, "(", ")"],
      cases: [BaseMethods_default.Matrix, "{", "", "left left", null, ".2em", null, true],
      eqalign: [
        BaseMethods_default.Matrix,
        null,
        null,
        "right left",
        THICKMATHSPACE,
        ".5em",
        "D"
      ],
      displaylines: [BaseMethods_default.Matrix, null, null, "center", null, ".5em", "D"],
      cr: BaseMethods_default.Cr,
      "\\": BaseMethods_default.CrLaTeX,
      newline: [BaseMethods_default.CrLaTeX, true],
      hline: BaseMethods_default.HLine,
      hdashline: [BaseMethods_default.HLine, "dashed"],
      eqalignno: [
        BaseMethods_default.Matrix,
        null,
        null,
        "right left",
        THICKMATHSPACE,
        ".5em",
        "D",
        null,
        "right"
      ],
      leqalignno: [
        BaseMethods_default.Matrix,
        null,
        null,
        "right left",
        THICKMATHSPACE,
        ".5em",
        "D",
        null,
        "left"
      ],
      hfill: BaseMethods_default.HFill,
      hfil: BaseMethods_default.HFill,
      hfilll: BaseMethods_default.HFill,
      bmod: [
        BaseMethods_default.Macro,
        `\\mmlToken{mo}[lspace="${THICKMATHSPACE}" rspace="${THICKMATHSPACE}"]{mod}`
      ],
      pmod: [BaseMethods_default.Macro, "\\pod{\\mmlToken{mi}{mod}\\kern 6mu #1}", 1],
      mod: [
        BaseMethods_default.Macro,
        "\\mathchoice{\\kern18mu}{\\kern12mu}{\\kern12mu}{\\kern12mu}\\mmlToken{mi}{mod}\\,\\,#1",
        1
      ],
      pod: [
        BaseMethods_default.Macro,
        "\\mathchoice{\\kern18mu}{\\kern8mu}{\\kern8mu}{\\kern8mu}(#1)",
        1
      ],
      iff: [BaseMethods_default.Macro, "\\;\\Longleftrightarrow\\;"],
      skew: [BaseMethods_default.Macro, "{{#2{#3\\mkern#1mu}\\mkern-#1mu}{}}", 3],
      pmb: [BaseMethods_default.Macro, "\\rlap{#1}\\kern1px{#1}", 1],
      TeX: [BaseMethods_default.Macro, "T\\kern-.14em\\lower.5ex{E}\\kern-.115em X"],
      LaTeX: [
        BaseMethods_default.Macro,
        "L\\kern-.325em\\raise.21em{\\scriptstyle{A}}\\kern-.17em\\TeX"
      ],
      not: BaseMethods_default.Not,
      dots: BaseMethods_default.Dots,
      space: BaseMethods_default.Tilde,
      "\u00A0": BaseMethods_default.Tilde,
      " ": BaseMethods_default.Tilde,
      begin: BaseMethods_default.BeginEnd,
      end: BaseMethods_default.BeginEnd,
      label: BaseMethods_default.HandleLabel,
      ref: BaseMethods_default.HandleRef,
      nonumber: BaseMethods_default.HandleNoTag,
      newcolumntype: BaseMethods_default.NewColumnType,
      mathchoice: BaseMethods_default.MathChoice,
      mmlToken: BaseMethods_default.MmlToken
    });
    new EnvironmentMap("environment", ParseMethods_default.environment, {
      displaymath: [BaseMethods_default.Equation, null, false],
      math: [BaseMethods_default.Equation, null, false, false],
      array: [BaseMethods_default.AlignedArray],
      darray: [BaseMethods_default.AlignedArray, null, "D"],
      equation: [BaseMethods_default.Equation, null, true],
      eqnarray: [
        BaseMethods_default.EqnArray,
        null,
        true,
        true,
        "rcl",
        "bmt",
        ParseUtil.cols(0, MATHSPACE.thickmathspace),
        ".5em"
      ],
      indentalign: [BaseMethods_default.IndentAlign]
    });
    new CharacterMap("not_remap", null, JSON.parse(`{
 "←":"↚","→":"↛","↔":"↮","⇐":"⇍","⇒":"⇏","⇔":"⇎","∈":"∉","∋":"∌","∣":"∤","∥":"∦","∼":"≁","~":"≁","≃":"≄","≅":"≇","≈":"≉","≍":"≭","=":"≠","≡":"≢","<":"≮",">":"≯","≤":"≰","≥":"≱","≲":"≴","≳":"≵","≶":"≸",
 "≷":"≹","≺":"⊀","≻":"⊁","⊂":"⊄","⊃":"⊅","⊆":"⊈","⊇":"⊉","⊢":"⊬","⊨":"⊭","⊩":"⊮","⊫":"⊯","≼":"⋠","≽":"⋡","⊑":"⋢","⊒":"⋣","⊲":"⋪","⊳":"⋫","⊴":"⋬","⊵":"⋭","∃":"∄"
}`));
  }
});
// node_modules/@mathjax/src/mjs/input/tex/base/BaseConfiguration.js
function Other(parser2, char) {
  const font = parser2.stack.env["font"];
  const ifont = parser2.stack.env["italicFont"];
  const def2 = font ? { mathvariant: font } : {};
  const remap = MapHandler.getMap("remap").lookup(char);
  const range = getRange(char);
  const type = range[3];
  const mo = parser2.create("token", type, def2, remap ? remap.char : char);
  const style = ParseUtil.isLatinOrGreekChar(char) ? parser2.configuration.mathStyle(char, true) || ifont : "";
  const variant = range[4] || (font && style === MATHVARIANT3.NORMAL ? "" : style);
  if (variant) {
    mo.attributes.set("mathvariant", variant);
  }
  if (type === "mo") {
    NodeUtil_default.setProperty(mo, "fixStretchy", true);
    parser2.configuration.addNode("fixStretchy", mo);
  }
  parser2.Push(mo);
}
function csUndefined(_parser, name) {
  throw new TexError_default("UndefinedControlSequence", "Undefined control sequence %1", "\\" + name);
}
function envUndefined(_parser, env) {
  throw new TexError_default("UnknownEnv", "Unknown environment '%1'", env);
}
function filterNonscript({ data }) {
  for (const mml of data.getList("nonscript")) {
    if (mml.attributes.get("scriptlevel") > 0) {
      const parent = mml.parent;
      parent.childNodes.splice(parent.childIndex(mml), 1);
      data.removeFromList(mml.kind, [mml]);
      if (mml.isKind("mrow")) {
        const mstyle = mml.childNodes[0];
        data.removeFromList("mstyle", [mstyle]);
        data.removeFromList("mspace", mstyle.childNodes[0].childNodes);
      }
    } else if (mml.isKind("mrow")) {
      mml.parent.replaceChild(mml.childNodes[0], mml);
      data.removeFromList("mrow", [mml]);
    }
  }
}
var MATHVARIANT3;
var BaseTags;
var BaseConfiguration;
var init_BaseConfiguration = __esm({
  "node_modules/@mathjax/src/mjs/input/tex/base/BaseConfiguration.js"() {
    init_HandlerTypes();
    init_Configuration();
    init_MapHandler();
    init_TexError();
    init_NodeUtil();
    init_TokenMap();
    init_BaseItems();
    init_Tags();
    init_BaseMappings();
    init_OperatorDictionary();
    init_ParseMethods();
    init_ParseUtil();
    init_TexConstants();
    init_context();
    MATHVARIANT3 = TexConstant.Variant;
    new CharacterMap("remap", null, {
      "-": "−",
      "*": "∗",
      "`": "‘"
    });
    BaseTags = class extends AbstractTags {
    };
    BaseConfiguration = Configuration.create("base", {
      [ConfigurationType.CONFIG]: function(config2, jax) {
        const options3 = jax.parseOptions.options;
        if (options3.digits) {
          options3.numberPattern = options3.digits;
        }
        new RegExpMap("digit", ParseMethods_default.digit, options3.initialDigit);
        new RegExpMap("letter", ParseMethods_default.variable, options3.initialLetter);
        const handler = config2.handlers.get(HandlerType.CHARACTER);
        handler.add(["letter", "digit"], null, 4);
      },
      [ConfigurationType.HANDLER]: {
        [HandlerType.CHARACTER]: ["command", "special"],
        [HandlerType.DELIMITER]: ["delimiter"],
        [HandlerType.MACRO]: [
          "delimiter",
          "macros",
          "lcGreek",
          "ucGreek",
          "mathchar0mi",
          "mathchar0mo",
          "mathchar7"
        ],
        [HandlerType.ENVIRONMENT]: ["environment"]
      },
      [ConfigurationType.FALLBACK]: {
        [HandlerType.CHARACTER]: Other,
        [HandlerType.MACRO]: csUndefined,
        [HandlerType.ENVIRONMENT]: envUndefined
      },
      [ConfigurationType.ITEMS]: {
        [StartItem.prototype.kind]: StartItem,
        [StopItem.prototype.kind]: StopItem,
        [OpenItem.prototype.kind]: OpenItem,
        [CloseItem.prototype.kind]: CloseItem,
        [NullItem.prototype.kind]: NullItem,
        [PrimeItem.prototype.kind]: PrimeItem,
        [SubsupItem.prototype.kind]: SubsupItem,
        [OverItem.prototype.kind]: OverItem,
        [LeftItem.prototype.kind]: LeftItem,
        [Middle.prototype.kind]: Middle,
        [RightItem.prototype.kind]: RightItem,
        [BreakItem.prototype.kind]: BreakItem,
        [BeginItem.prototype.kind]: BeginItem,
        [EndItem.prototype.kind]: EndItem,
        [StyleItem.prototype.kind]: StyleItem,
        [PositionItem.prototype.kind]: PositionItem,
        [CellItem.prototype.kind]: CellItem,
        [MmlItem.prototype.kind]: MmlItem,
        [FnItem.prototype.kind]: FnItem,
        [NotItem.prototype.kind]: NotItem,
        [NonscriptItem.prototype.kind]: NonscriptItem,
        [DotsItem.prototype.kind]: DotsItem,
        [ArrayItem.prototype.kind]: ArrayItem,
        [EqnArrayItem.prototype.kind]: EqnArrayItem,
        [EquationItem.prototype.kind]: EquationItem,
        [MstyleItem.prototype.kind]: MstyleItem
      },
      [ConfigurationType.OPTIONS]: {
        maxMacros: 1e3,
        digits: "",
        numberPattern: /^(?:[0-9]+(?:\{,\}[0-9]{3})*(?:\.[0-9]*)?|\.[0-9]+)/,
        initialDigit: /[0-9.,]/,
        identifierPattern: /^[a-zA-Z]+/,
        initialLetter: /[a-zA-Z]/,
        baseURL: !context.document || context.document.getElementsByTagName("base").length === 0 ? "" : String(context.document.location).replace(/#.*$/, "")
      },
      [ConfigurationType.TAGS]: {
        base: BaseTags
      },
      [ConfigurationType.POSTPROCESSORS]: [[filterNonscript, -4]]
    });
  }
});
// node_modules/@mathjax/src/mjs/input/tex.js
var TeX;
var init_tex = __esm({
  "node_modules/@mathjax/src/mjs/input/tex.js"() {
    init_InputJax();
    init_Options();
    init_FindTeX();
    init_FilterUtil();
    init_NodeUtil();
    init_TexParser();
    init_TexError();
    init_ParseOptions();
    init_Tags();
    init_Configuration();
    init_TexConstants();
    init_BaseConfiguration();
    TeX = class _TeX extends AbstractInputJax {
      static configure(packages) {
        const configuration = new ParserConfiguration(packages, ["tex"]);
        configuration.init();
        return configuration;
      }
      static tags(options3, configuration) {
        TagsFactory.addTags(configuration.tags);
        TagsFactory.setDefault(options3.options.tags);
        options3.tags = TagsFactory.getDefault();
        options3.tags.configuration = options3;
      }
      constructor(options3 = {}) {
        const [rest, tex, find] = separateOptions(options3, _TeX.OPTIONS, FindTeX.OPTIONS);
        super(tex);
        this.findTeX = this.options["FindTeX"] || new FindTeX(find);
        const packages = this.options.packages;
        const configuration = this.configuration = _TeX.configure(packages);
        const parseOptions = this._parseOptions = new ParseOptions_default(configuration, [
          this.options,
          TagsFactory.OPTIONS
        ]);
        userOptions(parseOptions.options, rest);
        configuration.config(this);
        _TeX.tags(parseOptions, configuration);
        this.postFilters.addList([
          [FilterUtil_default.cleanSubSup, -7],
          [FilterUtil_default.setInherited, -6],
          [FilterUtil_default.checkScriptlevel, -5],
          [FilterUtil_default.moveLimits, -4],
          [FilterUtil_default.cleanStretchy, -3],
          [FilterUtil_default.cleanAttributes, -2],
          [FilterUtil_default.combineRelations, -1]
        ]);
      }
      setMmlFactory(mmlFactory) {
        super.setMmlFactory(mmlFactory);
        this._parseOptions.nodeFactory.setMmlFactory(mmlFactory);
      }
      get parseOptions() {
        return this._parseOptions;
      }
      reset(tag3 = 0) {
        this.parseOptions.clear();
        this.parseOptions.tags.reset(tag3);
      }
      compile(math, document) {
        this.parseOptions.clear();
        this.parseOptions.mathItem = math;
        this.executeFilters(this.preFilters, math, document, this.parseOptions);
        this.latex = math.math;
        let node;
        this.parseOptions.tags.startEquation(math);
        let parser2;
        try {
          parser2 = new TexParser(this.latex, { display: math.display, isInner: false }, this.parseOptions);
          node = parser2.mml();
        } catch (err) {
          if (!(err instanceof TexError_default)) {
            throw err;
          }
          this.parseOptions.error = true;
          node = this.options.formatError(this, err);
        }
        node = this.parseOptions.nodeFactory.create("node", "math", [node]);
        node.attributes.set(TexConstant.Attr.LATEX, this.latex);
        if (math.display) {
          NodeUtil_default.setAttribute(node, "display", "block");
        }
        this.parseOptions.tags.finishEquation(math);
        this.parseOptions.root = node;
        this.executeFilters(this.postFilters, math, document, this.parseOptions);
        if (parser2 && parser2.stack.env.hsize) {
          NodeUtil_default.setAttribute(node, "maxwidth", parser2.stack.env.hsize);
          NodeUtil_default.setAttribute(node, "overflow", "linebreak");
        }
        this.mathNode = this.parseOptions.root;
        return this.mathNode;
      }
      findMath(strings) {
        return this.findTeX.findMath(strings);
      }
      formatError(err) {
        const message = err.message.replace(/\n.*/, "");
        return this.parseOptions.nodeFactory.create("error", message, err.id, this.latex);
      }
    };
    TeX.NAME = "TeX";
    TeX.OPTIONS = Object.assign(Object.assign({}, AbstractInputJax.OPTIONS), { FindTeX: null, packages: ["base"], maxBuffer: 5 * 1024, maxTemplateSubtitutions: 1e4, mathStyle: "TeX", formatError: (jax, err) => jax.formatError(err) });
  }
});
// node_modules/@mathjax/src/mjs/output/common/Direction.js
var DIRECTION;
var V;
var H;
var init_Direction = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Direction.js"() {
    DIRECTION = { None: "", Vertical: "v", Horizontal: "h" };
    V = DIRECTION.Vertical;
    H = DIRECTION.Horizontal;
  }
});
// node_modules/@mathjax/src/mjs/output/common/FontData.js
function mergeOptions(obj, dst, src) {
  return src ? defaultOptions(obj, { [dst]: src })[dst] : obj[dst];
}
var __awaiter4;
var VFUZZ;
var HFUZZ;
var NOSTRETCH;
var FontData;
var init_FontData = __esm({
  "node_modules/@mathjax/src/mjs/output/common/FontData.js"() {
    init_mathjax();
    init_Options();
    init_AsyncLoad();
    init_Retries();
    init_Direction();
    init_Direction();
    __awaiter4 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    VFUZZ = 0.07;
    HFUZZ = 0.07;
    NOSTRETCH = { dir: DIRECTION.None };
    FontData = class {
      get CLASS() {
        return this.constructor;
      }
      static charOptions(font, n) {
        const char = font[n];
        if (!Array.isArray(char)) {
          throw Error(`Character data hasn't been loaded for 0x${n.toString(16).toUpperCase()}`);
        }
        if (char.length === 3) {
          char[3] = {};
        }
        return char[3];
      }
      static defineDynamicFiles(dynamicFiles, extension = "") {
        const list3 = {};
        (dynamicFiles || []).forEach(([file, variants, delimiters2]) => {
          list3[file] = {
            extension,
            file,
            variants,
            delimiters: delimiters2 || [],
            promise: null,
            failed: false,
            setup: (_font) => {
              list3[file].failed = true;
            }
          };
        });
        return list3;
      }
      static dynamicSetup(extension, file, variants, delimiters2 = {}, fonts = null) {
        const data = extension ? this.dynamicExtensions.get(extension) : null;
        const files = extension ? data.files : this.dynamicFiles;
        files[file].setup = (font) => {
          Object.keys(variants).forEach((name) => font.defineChars(name, variants[name]));
          font.defineDelimiters(delimiters2);
          if (extension) {
            this.adjustDelimiters(font.delimiters, Object.keys(delimiters2), data.sizeN, data.stretchN);
          }
          if (fonts) {
            font.addDynamicFontCss(fonts);
          }
        };
      }
      static adjustDelimiters(delimiters2, keys2, sizeN, stretchN) {
        keys2.forEach((id) => {
          const delim = delimiters2[parseInt(id)];
          if ("dir" in delim) {
            if (delim.variants) {
              delim.variants = this.adjustArrayIndices(delim.variants, sizeN);
            }
            if (delim.stretchv) {
              delim.stretchv = this.adjustArrayIndices(delim.stretchv, stretchN);
            }
          }
        });
      }
      static adjustArrayIndices(list3, N) {
        return list3.map((n) => n < 0 ? N - 1 - n : n);
      }
      static addExtension(data, prefix = "") {
        const extension = {
          name: data.name,
          prefix: prefix || `[${data.name}-extension]/${this.JAX.toLowerCase()}/dynamic`,
          files: this.defineDynamicFiles(data.ranges, data.name),
          sizeN: this.defaultSizeVariants.length,
          stretchN: this.defaultStretchVariants.length
        };
        this.dynamicExtensions.set(data.name, extension);
        for (const [src, dst] of [
          ["options", "OPTIONS"],
          ["variants", "defaultVariants"],
          ["variantSmp", "VariantSmp"],
          ["cssFonts", "defaultCssFonts"],
          ["accentMap", "defaultAccentMap"],
          ["moMap", "defaultMoMap"],
          ["mnMap", "defaultMnMap"],
          ["parameters", "defaultParams"],
          ["chars", "defaultChars"],
          ["sizeVariants", "defaultSizeVariants"],
          ["stretchVariants", "defaultStretchVariants"]
        ]) {
          mergeOptions(this, dst, data[src]);
        }
        if (data.delimiters) {
          Object.assign(this.defaultDelimiters, data.delimiters);
          this.adjustDelimiters(this.defaultDelimiters, Object.keys(data.delimiters), extension.sizeN, extension.stretchN);
        }
      }
      constructor(options3 = null) {
        this.variant = {};
        this.delimiters = {};
        this.cssFontMap = {};
        this.cssFontPrefix = "";
        this.remapChars = {};
        this.skewIcFactor = 0.75;
        const CLASS = this.CLASS;
        this.options = userOptions(defaultOptions({}, CLASS.OPTIONS), options3);
        this.params = Object.assign({}, CLASS.defaultParams);
        this.sizeVariants = [...CLASS.defaultSizeVariants];
        this.stretchVariants = [...CLASS.defaultStretchVariants];
        this.defineCssFonts(CLASS.defaultCssFonts);
        this.cssFamilyPrefix = CLASS.defaultCssFamilyPrefix;
        this.createVariants(CLASS.defaultVariants);
        this.defineDelimiters(CLASS.defaultDelimiters);
        Object.keys(CLASS.defaultChars).forEach((name) => this.defineChars(name, CLASS.defaultChars[name]));
        this.defineRemap("accent", CLASS.defaultAccentMap);
        this.defineRemap("mo", CLASS.defaultMoMap);
        this.defineRemap("mn", CLASS.defaultMnMap);
        this.defineDynamicCharacters(CLASS.dynamicFiles);
        CLASS.dynamicExtensions.forEach((data) => this.defineDynamicCharacters(data.files));
      }
      setOptions(options3) {
        defaultOptions(this.options, options3);
      }
      addExtension(data, prefix = "") {
        const jax = this.constructor.JAX.toLowerCase();
        const dynamicFont = {
          name: data.name,
          prefix: prefix || `[${data.name}-extension]/${jax}/dynamic`,
          files: this.CLASS.defineDynamicFiles(data.ranges, prefix),
          sizeN: this.sizeVariants.length,
          stretchN: this.stretchVariants.length
        };
        this.CLASS.dynamicExtensions.set(data.name, dynamicFont);
        defaultOptions(this.options, data.options || {});
        defaultOptions(this.params, data.parameters || {});
        mergeOptions(this, "sizeVariants", data.sizeVariants);
        mergeOptions(this, "stretchVariants", data.stretchVariants);
        mergeOptions(this.constructor, "VariantSmp", data.variantSmp);
        this.defineCssFonts(mergeOptions({ cssFonts: {} }, "cssFonts", data.cssFonts));
        this.createVariants(mergeOptions({ variants: [] }, "variants", data.variants));
        if (data.delimiters) {
          this.defineDelimiters(mergeOptions({ delimiters: {} }, "delimiters", data.delimiters));
          this.CLASS.adjustDelimiters(this.delimiters, Object.keys(data.delimiters), dynamicFont.sizeN, dynamicFont.stretchN);
        }
        for (const name of Object.keys(data.chars || {})) {
          this.defineChars(name, data.chars[name]);
        }
        this.defineRemap("accent", data.accentMap);
        this.defineRemap("mo", data.moMap);
        this.defineRemap("mn", data.mnMap);
        if (data.ranges) {
          this.defineDynamicCharacters(dynamicFont.files);
        }
        return [];
      }
      get styles() {
        return this._styles;
      }
      set styles(style) {
        this._styles = style;
      }
      createVariant(name, inherit = null, link2 = null) {
        const variant = {
          linked: [],
          chars: Object.create(inherit ? this.variant[inherit].chars : {})
        };
        if (this.variant[link2]) {
          Object.assign(variant.chars, this.variant[link2].chars);
          this.variant[link2].linked.push(variant.chars);
          variant.chars = Object.create(variant.chars);
        }
        this.remapSmpChars(variant.chars, name);
        this.variant[name] = variant;
      }
      remapSmpChars(chars, name) {
        const CLASS = this.CLASS;
        let remap = CLASS.VariantSmp[name];
        if (typeof remap === "string") {
          remap = CLASS.VariantSmp[remap];
        }
        if (!remap)
          return;
        const SmpRemap = CLASS.SmpRemap;
        const SmpGreek = [null, null, CLASS.SmpRemapGreekU, CLASS.SmpRemapGreekL];
        for (const [i2, lo, hi] of CLASS.SmpRanges) {
          const base = remap[i2];
          if (!base)
            continue;
          for (let n = lo; n <= hi; n++) {
            if (n === 930)
              continue;
            const smp = base + n - lo;
            chars[n] = this.smpChar(SmpRemap[smp] || smp);
          }
          if (SmpGreek[i2]) {
            for (const n of Object.keys(SmpGreek[i2]).map((x2) => parseInt(x2))) {
              chars[n] = this.smpChar(base + SmpGreek[i2][n]);
            }
          }
        }
        const extra = remap[5] || {};
        for (const n of Object.keys(extra)) {
          chars[n] = this.smpChar(remap[5][n]);
        }
      }
      smpChar(n) {
        return [, , , { smp: n }];
      }
      createVariants(variants) {
        for (const variant of variants) {
          this.createVariant(variant[0], variant[1], variant[2]);
        }
      }
      defineChars(name, chars) {
        const variant = this.variant[name];
        Object.assign(variant.chars, chars);
        for (const link2 of variant.linked) {
          Object.assign(link2, chars);
        }
      }
      defineCssFonts(fonts) {
        Object.assign(this.cssFontMap, fonts);
        for (const name of Object.keys(fonts)) {
          if (this.cssFontMap[name][0] === "unknown") {
            this.cssFontMap[name][0] = this.options.unknownFamily;
          }
        }
      }
      defineDelimiters(delims) {
        Object.assign(this.delimiters, delims);
      }
      defineRemap(name, remap) {
        if (remap) {
          if (!Object.hasOwn(this.remapChars, name)) {
            this.remapChars[name] = {};
          }
          Object.assign(this.remapChars[name], remap);
        }
      }
      defineDynamicCharacters(dynamicFiles) {
        for (const file of Object.keys(dynamicFiles)) {
          const dynamic = dynamicFiles[file];
          for (const name of Object.keys(dynamic.variants)) {
            this.defineChars(name, this.flattenRanges(dynamic.variants[name], dynamic));
          }
          this.defineDelimiters(this.flattenRanges(dynamic.delimiters, dynamic));
        }
      }
      flattenRanges(ranges, dynamic) {
        const chars = {};
        for (const n of ranges) {
          if (Array.isArray(n)) {
            for (let j = n[0]; j <= n[1]; j++) {
              chars[j] = dynamic;
            }
          } else {
            chars[n] = dynamic;
          }
        }
        return chars;
      }
      dynamicFileName(dynamic) {
        const prefix = !dynamic.extension ? this.options.dynamicPrefix : this.CLASS.dynamicExtensions.get(dynamic.extension).prefix;
        return dynamic.file.match(/^(?:[/[]|[a-z]+:\/\/|[a-z]:)/i) ? dynamic.file : prefix + "/" + dynamic.file.replace(/(\.js)?$/, ".js");
      }
      loadDynamicFile(dynamic) {
        return __awaiter4(this, void 0, void 0, function* () {
          if (dynamic.failed)
            return Promise.reject(new Error(`dynamic file '${dynamic.file}' failed to load`));
          if (!dynamic.promise) {
            dynamic.promise = asyncLoad(this.dynamicFileName(dynamic)).catch((err) => {
              dynamic.failed = true;
              console.warn(err);
            });
          }
          return dynamic.promise.then(() => dynamic.setup(this));
        });
      }
      loadDynamicFiles() {
        const dynamicFiles = this.CLASS.dynamicFiles;
        const promises = Object.keys(dynamicFiles).map((name) => this.loadDynamicFile(dynamicFiles[name]));
        for (const data of this.CLASS.dynamicExtensions.values()) {
          promises.push(...Object.keys(data.files).map((name) => this.loadDynamicFile(data.files[name])));
        }
        return Promise.all(promises);
      }
      loadDynamicFilesSync() {
        if (!mathjax.asyncIsSynchronous) {
          throw Error("MathJax(loadDynamicFilesSync): mathjax.asyncLoad must be specified and synchronous\n    Try importing #js/../components/require.mjs and #js/util/asyncLoad/node.js");
        }
        const dynamicFiles = this.CLASS.dynamicFiles;
        Object.keys(dynamicFiles).forEach((name) => this.loadDynamicFileSync(dynamicFiles[name]));
        for (const data of this.CLASS.dynamicExtensions.values()) {
          Object.keys(data.files).forEach((name) => this.loadDynamicFileSync(data.files[name]));
        }
      }
      loadDynamicFileSync(dynamic) {
        if (!dynamic.promise) {
          dynamic.promise = Promise.resolve();
          try {
            mathjax.asyncLoad(this.dynamicFileName(dynamic));
          } catch (err) {
            dynamic.failed = true;
            console.warn(err);
          }
          dynamic.setup(this);
        }
      }
      addDynamicFontCss(_fonts, _root) {
      }
      getDelimiter(n) {
        const delim = this.delimiters[n];
        if (delim && !("dir" in delim)) {
          this.delimiters[n] = null;
          if (mathjax.asyncIsSynchronous) {
            this.loadDynamicFileSync(delim);
            return this.getDelimiter(n);
          }
          retryAfter(this.loadDynamicFile(delim));
          return null;
        }
        return delim;
      }
      getSizeVariant(n, i2) {
        const delim = this.getDelimiter(n);
        if (delim && delim.variants) {
          i2 = delim.variants[i2];
        }
        return this.sizeVariants[i2];
      }
      getStretchVariant(n, i2) {
        const delim = this.getDelimiter(n);
        return this.stretchVariants[delim.stretchv ? delim.stretchv[i2] : 0];
      }
      getStretchVariants(n) {
        return [0, 1, 2, 3].map((i2) => this.getStretchVariant(n, i2));
      }
      getChar(name, n) {
        const char = this.variant[name].chars[n];
        if (char && !Array.isArray(char)) {
          const variant = this.variant[name];
          delete variant.chars[n];
          variant.linked.forEach((link2) => delete link2[n]);
          if (mathjax.asyncIsSynchronous) {
            this.loadDynamicFileSync(char);
            return this.getChar(name, n);
          }
          retryAfter(this.loadDynamicFile(char));
          return null;
        }
        return char;
      }
      getVariant(name) {
        return this.variant[name];
      }
      getCssFont(variant) {
        return this.cssFontMap[variant] || ["serif", false, false];
      }
      getFamily(family) {
        return this.cssFamilyPrefix ? this.cssFamilyPrefix + ", " + family : family;
      }
      getRemappedChar(name, c) {
        const map = this.remapChars[name] || {};
        return map[c];
      }
    };
    FontData.OPTIONS = {
      unknownFamily: "serif",
      dynamicPrefix: "."
    };
    FontData.JAX = "common";
    FontData.NAME = "";
    FontData.defaultVariants = JSON.parse(`[
 ["normal"],
 ["bold","normal"],
 ["italic","normal"],
 ["bold-italic","italic","bold"],
 ["double-struck","bold"],
 ["fraktur","normal"],
 ["bold-fraktur","bold","fraktur"],
 ["script","italic"],
 ["bold-script","bold-italic","script"],
 ["sans-serif","normal"],
 ["bold-sans-serif","bold","sans-serif"],
 ["sans-serif-italic","italic","sans-serif"],
 ["sans-serif-bold-italic","bold-italic","bold-sans-serif"],
 ["monospace","normal"],
 ["-smallop","normal"],
 ["-largeop","normal"],
 ["-tex-calligraphic","italic"],
 ["-tex-bold-calligraphic","bold-italic"],
 ["-tex-oldstyle","normal"],
 ["-tex-bold-oldstyle","bold"],
 ["-tex-mathit","italic"],
 ["-tex-variant","normal"]
]`);
    FontData.defaultCssFonts = JSON.parse(`{
 "normal":["unknown",false,false],
 "bold":["unknown",false,true],
 "italic":["unknown",true,false],
 "bold-italic":["unknown",true,true],
 "double-struck":["unknown",false,true],
 "fraktur":["unknown",false,false],
 "bold-fraktur":["unknown",false,true],
 "script":["cursive",false,false],
 "bold-script":["cursive",false,true],
 "sans-serif":["sans-serif",false,false],
 "bold-sans-serif":["sans-serif",false,true],
 "sans-serif-italic":["sans-serif",true,false],
 "sans-serif-bold-italic":["sans-serif",true,true],
 "monospace":["monospace",false,false],
 "-smallop":["unknown",false,false],
 "-largeop":["unknown",false,false],
 "-tex-calligraphic":["cursive",true,false],
 "-tex-bold-calligraphic":["cursive",true,true],
 "-tex-oldstyle":["unknown",false,false],
 "-tex-bold-oldstyle":["unknown",false,true],
 "-tex-mathit":["unknown",true,false],
 "-tex-variant":["unknown",false,false]
}`);
    FontData.defaultCssFamilyPrefix = "";
    FontData.VariantSmp = {
      bold: [
        119808,
        119834,
        120488,
        120514,
        120782,
        { 988: 120778, 989: 120779 }
      ],
      italic: [119860, 119886, 120546, 120572],
      "bold-italic": [119912, 119938, 120604, 120630],
      script: [119964, 119990],
      "bold-script": [120016, 120042],
      fraktur: [120068, 120094],
      "double-struck": [120120, 120146, , , 120792],
      "bold-fraktur": [120172, 120198],
      "sans-serif": [120224, 120250, , , 120802],
      "bold-sans-serif": [120276, 120302, 120662, 120688, 120812],
      "sans-serif-italic": [120328, 120354],
      "sans-serif-bold-italic": [120380, 120406, 120720, 120746],
      monospace: [120432, 120458, , , 120822]
    };
    FontData.SmpRanges = [
      [0, 65, 90],
      [1, 97, 122],
      [2, 913, 937],
      [3, 945, 969],
      [4, 48, 57]
    ];
    FontData.SmpRemap = JSON.parse(`{
 "119893":8462,"119965":8492,"119968":8496,"119969":8497,"119971":8459,"119972":8464,"119975":8466,"119976":8499,"119981":8475,"119994":8495,"119996":8458,"120004":8500,"120070":8493,"120075":8460,
 "120076":8465,"120085":8476,"120093":8488,"120122":8450,"120127":8461,"120133":8469,"120135":8473,"120136":8474,"120137":8477,"120145":8484
}`);
    FontData.SmpRemapGreekU = {
      8711: 25,
      1012: 17
    };
    FontData.SmpRemapGreekL = {
      977: 27,
      981: 29,
      982: 31,
      1008: 28,
      1009: 30,
      1013: 26,
      8706: 25
    };
    FontData.defaultAccentMap = {
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
    };
    FontData.defaultMoMap = {
      45: "−"
    };
    FontData.defaultMnMap = {
      45: "−"
    };
    FontData.defaultParams = JSON.parse(`{
 "x_height":0.442,"quad":1,"num1":0.676,"num2":0.394,"num3":0.444,"denom1":0.686,"denom2":0.345,"sup1":0.413,"sup2":0.363,"sup3":0.289,"sub1":0.15,"sub2":0.247,"sup_drop":0.386,"sub_drop":0.05,
 "delim1":2.39,"delim2":1,"axis_height":0.25,"rule_thickness":0.06,"big_op_spacing1":0.111,"big_op_spacing2":0.167,"big_op_spacing3":0.2,"big_op_spacing4":0.6,"big_op_spacing5":0.1,"surd_height":0.06,
 "scriptspace":0.05,"nulldelimiterspace":0.12,"delimiterfactor":901,"delimitershortfall":0.3,"rule_factor":1.25,"min_rule_thickness":1.25,"separation_factor":1.75,"extra_ic":0.033,
 "extender_factor":0.333
}`);
    FontData.defaultDelimiters = {};
    FontData.defaultChars = {};
    FontData.defaultSizeVariants = [];
    FontData.defaultStretchVariants = [];
    FontData.dynamicFiles = {};
    FontData.dynamicExtensions = /* @__PURE__ */ new Map();
  }
});
// node_modules/@mathjax/src/mjs/util/BBox.js
var BBox;
var init_BBox = __esm({
  "node_modules/@mathjax/src/mjs/util/BBox.js"() {
    init_lengths();
    BBox = class _BBox {
      static zero() {
        return new _BBox({ h: 0, d: 0, w: 0 });
      }
      static empty() {
        return new _BBox();
      }
      constructor(def2 = { w: 0, h: -BIGDIMEN, d: -BIGDIMEN }) {
        this.w = def2.w || 0;
        this.h = "h" in def2 ? def2.h : -BIGDIMEN;
        this.d = "d" in def2 ? def2.d : -BIGDIMEN;
        this.L = this.R = this.ic = this.oc = this.sk = this.dx = 0;
        this.scale = this.rscale = 1;
        this.pwidth = "";
      }
      empty() {
        this.w = 0;
        this.h = this.d = -BIGDIMEN;
        return this;
      }
      clean() {
        if (this.w === -BIGDIMEN)
          this.w = 0;
        if (this.h === -BIGDIMEN)
          this.h = 0;
        if (this.d === -BIGDIMEN)
          this.d = 0;
      }
      rescale(scale2) {
        this.w *= scale2;
        this.h *= scale2;
        this.d *= scale2;
      }
      combine(cbox, x2 = 0, y = 0) {
        const rscale = cbox.rscale;
        const w = x2 + rscale * (cbox.w + cbox.L + cbox.R);
        const h = y + rscale * cbox.h;
        const d = rscale * cbox.d - y;
        if (w > this.w)
          this.w = w;
        if (h > this.h)
          this.h = h;
        if (d > this.d)
          this.d = d;
      }
      append(cbox) {
        const scale2 = cbox.rscale;
        this.w += scale2 * (cbox.w + cbox.L + cbox.R);
        if (scale2 * cbox.h > this.h) {
          this.h = scale2 * cbox.h;
        }
        if (scale2 * cbox.d > this.d) {
          this.d = scale2 * cbox.d;
        }
      }
      updateFrom(cbox) {
        this.h = cbox.h;
        this.d = cbox.d;
        this.w = cbox.w;
        if (cbox.pwidth) {
          this.pwidth = cbox.pwidth;
        }
      }
      copy() {
        const bbox = new _BBox();
        Object.assign(bbox, this);
        return bbox;
      }
    };
    BBox.fullWidth = "100%";
    BBox.boxSides = [
      ["Top", 0, "h"],
      ["Right", 1, "w"],
      ["Bottom", 2, "d"],
      ["Left", 3, "w"]
    ];
  }
});
// node_modules/@mathjax/src/mjs/output/common/LineBBox.js
var LineBBox;
var init_LineBBox = __esm({
  "node_modules/@mathjax/src/mjs/output/common/LineBBox.js"() {
    init_BBox();
    LineBBox = class _LineBBox extends BBox {
      static from(bbox, leading, indent = null) {
        const nbox = new this();
        Object.assign(nbox, bbox);
        nbox.lineLeading = leading;
        if (indent) {
          nbox.indentData = indent;
        }
        return nbox;
      }
      constructor(def2, start = null) {
        super(def2);
        this.indentData = null;
        this.isFirst = false;
        this.originalL = this.L;
        if (start) {
          this.start = start;
        }
      }
      append(cbox) {
        if (this.isFirst) {
          cbox.originalL += cbox.L;
          cbox.L = 0;
        }
        if (cbox.indentData) {
          this.indentData = cbox.indentData;
        }
        this.lineLeading = cbox.lineLeading;
        super.append(cbox);
        this.isFirst = cbox.isFirst;
      }
      copy() {
        const bbox = _LineBBox.from(this, this.lineLeading);
        bbox.indentData = this.indentData;
        bbox.lineLeading = this.lineLeading;
        return bbox;
      }
      getIndentData(node) {
        let { indentalign, indentshift, indentalignfirst, indentshiftfirst, indentalignlast, indentshiftlast } = node.attributes.getAllAttributes();
        if (indentalignfirst === "indentalign") {
          indentalignfirst = node.attributes.getInherited("indentalign");
        }
        if (indentshiftfirst === "indentshift") {
          indentshiftfirst = node.attributes.getInherited("indentshift");
        }
        if (indentalignlast === "indentalign") {
          indentalignlast = indentalign;
        }
        if (indentshiftlast === "indentshift") {
          indentshiftlast = indentshift;
        }
        this.indentData = [
          [indentalignfirst, indentshiftfirst],
          [indentalign, indentshift],
          [indentalignlast, indentshiftlast]
        ];
      }
      copyIndentData(bbox) {
        return bbox.indentData.map(([align, indent]) => [align, indent]);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/output/common/LinebreakVisitor.js
var NOBREAK;
var Linebreaks;
var LinebreakVisitor;
var init_LinebreakVisitor = __esm({
  "node_modules/@mathjax/src/mjs/output/common/LinebreakVisitor.js"() {
    init_Visitor();
    init_LineBBox();
    init_MmlNode();
    init_OperatorDictionary();
    NOBREAK = 1e6;
    Linebreaks = class extends AbstractVisitor {
      breakToWidth(_wrapper, _W) {
      }
    };
    LinebreakVisitor = class extends Linebreaks {
      constructor() {
        super(...arguments);
        this.PENALTY = {
          newline: (_p) => 0,
          nobreak: (_p) => NOBREAK,
          goodbreak: (p) => p - 200 * this.state.depth,
          badbreak: (p) => p + 200 * this.state.depth,
          auto: (p) => p
        };
        this.FACTORS = {
          depth: (p) => p + 800 * this.state.depth,
          width: (p) => p + Math.floor((this.state.width - this.state.w) / this.state.width * 2500),
          tail: (p) => p + Math.floor(this.state.width / Math.max(1e-4, this.state.mathLeft - this.state.w) * 500),
          open: (p, mo) => {
            const prevClass = mo.node.prevClass;
            if (prevClass === TEXCLASS.BIN || prevClass === TEXCLASS.REL || prevClass === TEXCLASS.OP) {
              return p + 5e3;
            }
            const prev = this.getPrevious(mo);
            if (prev && (prev.attributes.get("form") !== "postfix" || prev.attributes.get("linebreak") === "nobreak")) {
              return p + 5e3;
            }
            const parent = mo.node.Parent;
            if ((parent === null || parent === void 0 ? void 0 : parent.isKind("mmultiscripts")) && mo.node === this.getFirstToken(parent)) {
              const prescripts = !!parent.childNodes.filter((node) => node.isKind("mprescripts")).length;
              if (prescripts)
                return NOBREAK;
            }
            return p - 500;
          },
          close: (p, mo) => {
            var _a2;
            const parent = mo.node.Parent;
            if ((parent === null || parent === void 0 ? void 0 : parent.isKind("msubsup")) && !(parent.isKind("mmultiscripts") && ((_a2 = parent.childNodes[1]) === null || _a2 === void 0 ? void 0 : _a2.isKind("mprescripts"))) && mo.node === this.getLastToken(parent.childNodes[0])) {
              return NOBREAK;
            }
            return p + 500;
          },
          space: (p, node) => {
            const mspace = node;
            if (!mspace.canBreak)
              return NOBREAK;
            const w = mspace.getBBox().w;
            return w < 0 ? NOBREAK : w < 1 ? p : p - 100 * (w + 4);
          },
          separator: (p) => p + 500,
          fuzz: (p) => p * 0.99
        };
        this.TEXCLASS = {
          [TEXCLASS.BIN]: (p) => p - 250,
          [TEXCLASS.REL]: (p) => p - 500
        };
      }
      breakToWidth(wrapper, W) {
        const state = this.state;
        this.state = this.createState(wrapper);
        this.state.width = W;
        const n = wrapper.breakCount;
        for (let i2 = 0; i2 <= n; i2++) {
          const line = wrapper.lineBBox[i2] || wrapper.getLineBBox(i2);
          if (line.w > W) {
            this.breakLineToWidth(wrapper, i2);
          }
        }
        for (const [ww, ij] of this.state.breaks) {
          if (ij === null) {
            const mo = ww.coreMO();
            mo.setBreakStyle(mo.node.attributes.get("linebreakstyle") || "before");
          } else {
            ww.setBreakAt(ij);
          }
          ww.invalidateBBox();
        }
        this.state = state;
      }
      createState(wrapper) {
        const mathWidth = wrapper.getBBox().w;
        return {
          breaks: /* @__PURE__ */ new Set(),
          potential: [],
          width: 0,
          w: 0,
          prevWidth: 0,
          prevBreak: null,
          depth: 0,
          mathWidth,
          mathLeft: mathWidth
        };
      }
      breakLineToWidth(wrapper, i2) {
        const state = this.state;
        state.potential = [];
        state.w = 0;
        state.prevWidth = 0;
        state.prevBreak = null;
        state.depth = 0;
        this.visitNode(wrapper, i2);
      }
      addWidth(bbox, w = null) {
        if (w === null) {
          w = bbox.L + bbox.w + bbox.R;
        }
        if (!w)
          return;
        w *= bbox.rscale;
        this.state.w += w;
        if (this.state.potential.length) {
          this.state.potential[0][4] += w;
        }
        this.processBreak();
      }
      processBreak() {
        const state = this.state;
        while (state.potential.length && state.w > this.state.width) {
          const br2 = state.potential.pop();
          const [ww, , pw, dw, w] = br2;
          state.breaks.add(ww);
          state.w = state.potential.reduce((w2, brk) => w2 + brk[4], dw + w);
          if (state.prevBreak && state.prevWidth + pw <= state.width) {
            state.breaks.delete(state.prevBreak[0]);
            state.prevWidth += pw;
          } else {
            state.prevWidth = pw + dw;
          }
          state.potential.forEach((data) => data[2] -= pw);
          state.prevBreak = br2;
          state.mathLeft -= pw;
        }
      }
      pushBreak(wrapper, penalty, w, ij) {
        var _a2;
        const state = this.state;
        if (penalty >= NOBREAK || state.w === 0 && state.prevWidth === 0)
          return;
        while (state.potential.length && state.potential[0][1] > this.FACTORS.fuzz(penalty)) {
          const data = state.potential.shift();
          if (state.potential.length) {
            state.potential[0][4] += data[4];
          }
        }
        state.potential.unshift([
          [wrapper, ij],
          penalty,
          state.w - (((_a2 = state.prevBreak) === null || _a2 === void 0 ? void 0 : _a2[3]) || 0),
          w,
          0
        ]);
      }
      getBorderLR(wrapper) {
        var _a2;
        const data = wrapper.styleData;
        if (!data)
          return [0, 0];
        const border = ((_a2 = data === null || data === void 0 ? void 0 : data.border) === null || _a2 === void 0 ? void 0 : _a2.width) || [0, 0, 0, 0];
        const padding2 = (data === null || data === void 0 ? void 0 : data.padding) || [0, 0, 0, 0];
        return [border[3] + padding2[3], border[1] + padding2[1]];
      }
      getFirstToken(node) {
        return node.isToken ? node : this.getFirstToken(node.childNodes[0]);
      }
      getLastToken(node) {
        return node.isToken ? node : this.getLastToken(node.childNodes[node.childNodes.length - 1]);
      }
      visitNode(wrapper, i2) {
        if (!wrapper)
          return;
        this.state.depth++;
        if (wrapper.node.isEmbellished && !wrapper.node.isKind("mo")) {
          this.visitEmbellishedOperator(wrapper, i2);
        } else {
          super.visitNode(wrapper, i2);
        }
        this.state.depth--;
      }
      visitDefault(wrapper, i2) {
        var _a2;
        const bbox = wrapper.getLineBBox(i2);
        if (wrapper.node.isToken || wrapper.node.linebreakContainer || !((_a2 = wrapper.childNodes) === null || _a2 === void 0 ? void 0 : _a2[0])) {
          this.addWidth(bbox);
        } else {
          const [L, R] = this.getBorderLR(wrapper);
          if (i2 === 0) {
            this.addWidth(bbox, bbox.L + L);
          }
          this.visitNode(wrapper.childNodes[0], i2);
          if (i2 === wrapper.breakCount) {
            this.addWidth(bbox, bbox.R + R);
          }
        }
      }
      visitEmbellishedOperator(wrapper, _i) {
        const mo = wrapper.coreMO();
        const bbox = LineBBox.from(wrapper.getOuterBBox(), wrapper.linebreakOptions.lineleading);
        bbox.getIndentData(mo.node);
        const style = mo.getBreakStyle(mo.node.attributes.get("linebreakstyle"));
        const dw = mo.processIndent("", bbox.indentData[1][1], "", bbox.indentData[0][1], this.state.width)[1];
        const penalty = this.moPenalty(mo);
        if (style === "before") {
          this.pushBreak(wrapper, penalty, dw - bbox.L, null);
          this.addWidth(bbox);
        } else {
          this.addWidth(bbox);
          const w = (style === "after" ? 0 : mo.multChar ? mo.multChar.getBBox().w : bbox.w) + dw;
          this.pushBreak(wrapper, penalty, w, null);
        }
      }
      visitMoNode(wrapper, _i) {
        const mo = wrapper;
        const bbox = LineBBox.from(mo.getOuterBBox(), mo.linebreakOptions.lineleading);
        bbox.getIndentData(mo.node);
        const style = mo.getBreakStyle(mo.node.attributes.get("linebreakstyle"));
        const dw = mo.processIndent("", bbox.indentData[1][1], "", bbox.indentData[0][1], this.state.width)[1];
        const penalty = this.moPenalty(mo);
        if (style === "before") {
          this.pushBreak(wrapper, penalty, dw - bbox.L, null);
          this.addWidth(bbox);
        } else {
          this.addWidth(bbox);
          const w = (style === "after" ? 0 : mo.multChar ? mo.multChar.getBBox().w : bbox.w) + dw;
          this.pushBreak(wrapper, penalty, w, null);
        }
      }
      moPenalty(mo) {
        const { linebreak, fence, form } = mo.node.attributes.getList("linebreak", "fence", "form");
        const FACTORS = this.FACTORS;
        let penalty = FACTORS.tail(FACTORS.width(0));
        const isOpen = fence && form === "prefix" || mo.node.texClass === TEXCLASS.OPEN;
        const isClose = fence && form === "postfix" || mo.node.texClass === TEXCLASS.CLOSE;
        if (isOpen) {
          penalty = FACTORS.open(penalty, mo);
          this.state.depth++;
        }
        if (isClose) {
          penalty = FACTORS.close(penalty, mo);
          this.state.depth--;
        }
        penalty = (this.TEXCLASS[mo.node.texClass] || ((p) => p))(penalty);
        return (this.PENALTY[linebreak] || ((p) => p))(FACTORS.depth(penalty));
      }
      getPrevious(mo) {
        let child = mo.node;
        let parent = child.parent;
        let i2 = parent.childIndex(child);
        while (parent && (parent.notParent || parent.isKind("mrow")) && i2 === 0) {
          child = parent;
          parent = child.parent;
          i2 = parent.childIndex(child);
        }
        if (!parent || !i2)
          return null;
        const prev = parent.childNodes[i2 - 1];
        return prev.isEmbellished ? prev.coreMO() : null;
      }
      visitMspaceNode(wrapper, i2) {
        const bbox = wrapper.getLineBBox(i2);
        const mspace = wrapper;
        if (mspace.canBreak) {
          const penalty = this.mspacePenalty(mspace);
          bbox.getIndentData(wrapper.node);
          const dw = wrapper.processIndent("", bbox.indentData[1][1], "", bbox.indentData[0][1], this.state.width)[1];
          this.pushBreak(wrapper, penalty, dw - bbox.w, null);
        }
        this.addWidth(bbox);
      }
      mspacePenalty(mspace) {
        const linebreak = mspace.node.attributes.get("linebreak");
        const FACTORS = this.FACTORS;
        const penalty = FACTORS.space(FACTORS.tail(FACTORS.width(0)), mspace);
        return (this.PENALTY[linebreak] || ((p) => p))(FACTORS.depth(penalty));
      }
      visitMtextNode(wrapper, i2) {
        if (!wrapper.getText().match(/ /)) {
          this.visitDefault(wrapper, i2);
          return;
        }
        const mtext = wrapper;
        mtext.clearBreakPoints();
        const space = mtext.textWidth(" ");
        const bbox = wrapper.getBBox();
        const [L, R] = this.getBorderLR(wrapper);
        this.addWidth(bbox, bbox.L + L);
        const children = mtext.childNodes;
        for (const j of children.keys()) {
          const child = children[j];
          if (child.node.isKind("text")) {
            const words2 = child.node.getText().split(/ /);
            const last = words2.pop();
            for (const k of words2.keys()) {
              this.addWidth(bbox, mtext.textWidth(words2[k]));
              this.pushBreak(wrapper, this.mtextPenalty(), -space, [j, k + 1]);
              this.addWidth(bbox, space);
            }
            this.addWidth(bbox, mtext.textWidth(last));
          } else {
            this.addWidth(child.getBBox());
          }
        }
        this.addWidth(bbox, bbox.R + R);
      }
      mtextPenalty() {
        const FACTORS = this.FACTORS;
        return FACTORS.depth(FACTORS.tail(FACTORS.width(0)));
      }
      visitMrowNode(wrapper, i2) {
        const line = wrapper.lineBBox[i2] || wrapper.getLineBBox(i2);
        const [start, startL] = line.start || [0, 0];
        const [end, endL] = line.end || [wrapper.childNodes.length - 1, 0];
        const [L, R] = this.getBorderLR(wrapper);
        this.addWidth(line, line.L + L);
        for (let i3 = start; i3 <= end; i3++) {
          this.visitNode(wrapper.childNodes[i3], i3 === start ? startL : i3 === end ? endL : 0);
        }
        this.addWidth(line, line.R + R);
      }
      visitInferredMrowNode(wrapper, i2) {
        this.state.depth--;
        this.visitMrowNode(wrapper, i2);
        this.state.depth++;
      }
      visitMfracNode(wrapper, i2) {
        const mfrac = wrapper;
        if (!mfrac.node.attributes.get("bevelled") && mfrac.getOuterBBox().w > this.state.width) {
          this.breakToWidth(mfrac.childNodes[0], this.state.width);
          this.breakToWidth(mfrac.childNodes[1], this.state.width);
        }
        this.visitDefault(wrapper, i2);
      }
      visitMsqrtNode(wrapper, i2) {
        if (wrapper.getOuterBBox().w > this.state.width) {
          const msqrt = wrapper;
          const base = msqrt.childNodes[msqrt.base];
          this.breakToWidth(base, this.state.width - msqrt.rootWidth());
          msqrt.getStretchedSurd();
        }
        this.visitDefault(wrapper, i2);
      }
      visitMrootNode(wrapper, i2) {
        this.visitMsqrtNode(wrapper, i2);
      }
      visitMsubNode(wrapper, i2) {
        this.visitDefault(wrapper, i2);
        const msub = wrapper;
        const x2 = msub.getOffset()[0];
        const sbox = msub.scriptChild.getOuterBBox();
        const [L, R] = this.getBorderLR(wrapper);
        this.addWidth(msub.getLineBBox(i2), x2 + L + sbox.rscale * sbox.w + msub.font.params.scriptspace + R);
      }
      visitMsupNode(wrapper, i2) {
        this.visitDefault(wrapper, i2);
        const msup = wrapper;
        const x2 = msup.getOffset()[0];
        const sbox = msup.scriptChild.getOuterBBox();
        const [L, R] = this.getBorderLR(wrapper);
        this.addWidth(msup.getLineBBox(i2), x2 + L + sbox.rscale * sbox.w + msup.font.params.scriptspace + R);
      }
      visitMsubsupNode(wrapper, i2) {
        this.visitDefault(wrapper, i2);
        const msubsup = wrapper;
        const subbox = msubsup.subChild.getOuterBBox();
        const supbox = msubsup.supChild.getOuterBBox();
        const x2 = msubsup.getAdjustedIc();
        const w = Math.max(subbox.rscale * subbox.w, x2 + supbox.rscale * supbox.w) + msubsup.font.params.scriptspace;
        const [L, R] = this.getBorderLR(wrapper);
        this.addWidth(wrapper.getLineBBox(i2), L + w + R);
      }
      visitMmultiscriptsNode(wrapper, i2) {
        const mmultiscripts = wrapper;
        const data = mmultiscripts.scriptData;
        if (data.numPrescripts) {
          const w = Math.max(data.psup.rscale * data.psup.w, data.psub.rscale * data.psub.w);
          this.addWidth(wrapper.getLineBBox(i2), w + mmultiscripts.font.params.scriptspace);
        }
        this.visitDefault(wrapper, i2);
        if (data.numScripts) {
          const w = Math.max(data.sup.rscale * data.sup.w, data.sub.rscale * data.sub.w);
          this.addWidth(wrapper.getLineBBox(i2), w + mmultiscripts.font.params.scriptspace);
        }
      }
      visitMfencedNode(wrapper, i2) {
        const mfenced = wrapper;
        const bbox = wrapper.getLineBBox(i2);
        const [L, R] = this.getBorderLR(wrapper);
        if (i2 === 0) {
          this.addWidth(bbox, bbox.L + L);
        }
        this.visitNode(mfenced.mrow, i2);
        if (i2 === wrapper.breakCount) {
          this.addWidth(bbox, bbox.R + R);
        }
      }
      visitMactionNode(wrapper, i2) {
        const maction = wrapper;
        const bbox = wrapper.getLineBBox(i2);
        const [L, R] = this.getBorderLR(wrapper);
        if (i2 === 0) {
          this.addWidth(bbox, bbox.L + L);
        }
        this.visitNode(maction.selected, i2);
        if (i2 === wrapper.breakCount) {
          this.addWidth(bbox, bbox.R + R);
        }
      }
    };
    (function() {
      for (const op of Object.keys(OPTABLE.postfix)) {
        const data = OPTABLE.postfix[op][3];
        if (data && data.fence) {
          data.linebreakstyle = "after";
        }
      }
      OPTABLE.infix["\u2061"] = [...OPTABLE.infix["\u2061"]];
      OPTABLE.infix["\u2061"][3] = { linebreak: "nobreak" };
    })();
  }
});
export{init_FontData,init_LinebreakVisitor,FontData,LinebreakVisitor,init_BBox,init_LineBBox,NOSTRETCH,BBox,LineBBox,DIRECTION,mergeOptions,VFUZZ,HFUZZ,init_Direction,V,H,init_ParseMethods,ParseMethods_default,init_BaseConfiguration,Other,TeX,init_tex,NOBREAK};
