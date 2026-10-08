import{TEXCLASS,__esm,init_MmlNode,AbstractMmlTokenNode}from'./p12.js';export*from'./p12.js';
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
// node_modules/@mathjax/src/mjs/util/string.js
function sortLength(a, b) {
  return a.length !== b.length ? b.length - a.length : a === b ? 0 : a < b ? -1 : 1;
}
function quotePattern(text) {
  return text.replace(/([\^$(){}.+*?\-|[\]:\\])/g, "\\$1");
}
function unicodeChars(text) {
  return Array.from(text).map((c) => c.codePointAt(0));
}
function unicodeString(data) {
  return String.fromCodePoint(...data);
}
function isPercent(x2) {
  return !!x2.match(/%\s*$/);
}
function split(x2) {
  return x2.trim().split(/\s+/);
}
function replaceUnicode(text) {
  return text.replace(/\\U(?:([0-9A-Fa-f]{4})|\{\s*([0-9A-Fa-f]{1,6})\s*\})|\\./g, (m, h1, h2) => m === "\\\\" ? "\\" : String.fromCodePoint(parseInt(h1 || h2, 16)));
}
function toEntity(c) {
  return `&#x${c.codePointAt(0).toString(16).toUpperCase()};`;
}
var init_string = __esm({
  "node_modules/@mathjax/src/mjs/util/string.js"() {
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mo.js
var MmlMo;
var init_mo = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mo.js"() {
    init_MmlNode();
    init_OperatorDictionary();
    init_string();
    MmlMo = class extends AbstractMmlTokenNode {
      constructor() {
        super(...arguments);
        this._texClass = null;
        this.lspace = 5 / 18;
        this.rspace = 5 / 18;
      }
      get texClass() {
        if (this._texClass === null) {
          return this.getOperatorDef(this.getText())[2];
        }
        return this._texClass;
      }
      set texClass(value) {
        this._texClass = value;
      }
      get kind() {
        return "mo";
      }
      get isEmbellished() {
        return true;
      }
      coreParent() {
        let embellished = null;
        let parent = this;
        const math = this.factory.getNodeClass("math");
        while (parent && parent.isEmbellished && parent.coreMO() === this && !(parent instanceof math)) {
          embellished = parent;
          parent = parent.parent;
        }
        return embellished || this;
      }
      coreText(parent) {
        if (!parent) {
          return "";
        }
        if (parent.isEmbellished) {
          return parent.coreMO().getText();
        }
        while (((parent.isKind("mrow") || parent.isKind("TeXAtom") || parent.isKind("mstyle") || parent.isKind("mphantom")) && parent.childNodes.length === 1 || parent.isKind("munderover")) && parent.childNodes[0]) {
          parent = parent.childNodes[0];
        }
        return parent.isToken ? parent.getText() : "";
      }
      hasSpacingAttributes() {
        return this.attributes.isSet("lspace") || this.attributes.isSet("rspace");
      }
      get isAccent() {
        let accent = false;
        const node = this.coreParent().parent;
        if (node) {
          const key = node.isKind("mover") ? node.childNodes[node.over].coreMO() ? "accent" : "" : node.isKind("munder") ? node.childNodes[node.under].coreMO() ? "accentunder" : "" : node.isKind("munderover") ? this === node.childNodes[node.over].coreMO() ? "accent" : this === node.childNodes[node.under].coreMO() ? "accentunder" : "" : "";
          if (key) {
            const value = node.attributes.getExplicit(key);
            accent = value !== void 0 ? accent : this.attributes.get("accent");
          }
        }
        return accent;
      }
      setTeXclass(prev) {
        const { form, fence } = this.attributes.getList("form", "fence");
        if (this.getProperty("texClass") === void 0 && this.hasSpacingAttributes()) {
          return null;
        }
        if (fence && this.texClass === TEXCLASS.REL) {
          if (form === "prefix") {
            this.texClass = TEXCLASS.OPEN;
          }
          if (form === "postfix") {
            this.texClass = TEXCLASS.CLOSE;
          }
        }
        return this.adjustTeXclass(prev);
      }
      adjustTeXclass(prev) {
        const texClass = this.texClass;
        let prevClass = this.prevClass;
        if (texClass === TEXCLASS.NONE) {
          return prev;
        }
        if (prev) {
          if (prev.getProperty("autoOP") && (texClass === TEXCLASS.BIN || texClass === TEXCLASS.REL)) {
            prevClass = prev.texClass = TEXCLASS.ORD;
          }
          prevClass = this.prevClass = prev.texClass || TEXCLASS.ORD;
          this.prevLevel = this.attributes.getInherited("scriptlevel");
        } else {
          prevClass = this.prevClass = TEXCLASS.NONE;
        }
        if (texClass === TEXCLASS.BIN && (prevClass === TEXCLASS.NONE || prevClass === TEXCLASS.BIN || prevClass === TEXCLASS.OP || prevClass === TEXCLASS.REL || prevClass === TEXCLASS.OPEN || prevClass === TEXCLASS.PUNCT)) {
          this.texClass = TEXCLASS.ORD;
        } else if (prevClass === TEXCLASS.BIN && (texClass === TEXCLASS.REL || texClass === TEXCLASS.CLOSE || texClass === TEXCLASS.PUNCT)) {
          prev.texClass = this.prevClass = TEXCLASS.ORD;
        } else if (texClass === TEXCLASS.BIN) {
          let child = null;
          let parent = this.parent;
          while (parent && parent.parent && parent.isEmbellished && (parent.childNodes.length === 1 || !parent.isKind("mrow") && parent.core() === child)) {
            child = parent;
            parent = parent.parent;
          }
          child = child || this;
          if (parent.childNodes[parent.childNodes.length - 1] === child) {
            this.texClass = TEXCLASS.ORD;
          }
        }
        return this;
      }
      setInheritedAttributes(attributes = {}, display = false, level = 0, prime = false) {
        super.setInheritedAttributes(attributes, display, level, prime);
        const mo = this.getText();
        this.checkOperatorTable(mo);
        this.checkPseudoScripts(mo);
        this.checkPrimes(mo);
        this.checkMathAccent(mo);
      }
      getOperatorDef(mo) {
        const [form1, form2, form3] = this.handleExplicitForm(this.getForms());
        this.attributes.setInherited("form", form1);
        const CLASS = this.constructor;
        const OPTABLE2 = CLASS.OPTABLE;
        const def2 = OPTABLE2[form1][mo] || OPTABLE2[form2][mo] || OPTABLE2[form3][mo];
        if (def2) {
          return def2;
        }
        this.setProperty("noDictDef", true);
        const limits = this.attributes.get("movablelimits");
        const isOP = !!mo.match(CLASS.opPattern);
        if ((isOP || limits) && this.getProperty("texClass") === void 0) {
          return OPDEF(1, 2, TEXCLASS.OP);
        }
        const range = getRange(mo);
        const [l, r] = CLASS.MMLSPACING[range[2]];
        return OPDEF(l, r, range[2]);
      }
      checkOperatorTable(mo) {
        const def2 = this.getOperatorDef(mo);
        if (this.getProperty("texClass") === void 0) {
          this.texClass = def2[2];
        }
        for (const name of Object.keys(def2[3] || {})) {
          this.attributes.setInherited(name, def2[3][name]);
        }
        this.lspace = def2[0] / 18;
        this.rspace = def2[1] / 18;
      }
      getForms() {
        let core = null;
        let parent = this.parent;
        let Parent = this.Parent;
        while (Parent && Parent.isEmbellished) {
          core = parent;
          parent = Parent.parent;
          Parent = Parent.Parent;
        }
        core = core || this;
        if (parent && parent.isKind("mrow") && parent.nonSpaceLength() !== 1) {
          if (parent.firstNonSpace() === core) {
            return ["prefix", "infix", "postfix"];
          }
          if (parent.lastNonSpace() === core) {
            return ["postfix", "infix", "prefix"];
          }
        }
        return ["infix", "prefix", "postfix"];
      }
      handleExplicitForm(forms) {
        if (this.attributes.isSet("form")) {
          const form = this.attributes.get("form");
          forms = [form].concat(forms.filter((name) => name !== form));
        }
        return forms;
      }
      checkPseudoScripts(mo) {
        const PSEUDOSCRIPTS = this.constructor.pseudoScripts;
        if (!mo.match(PSEUDOSCRIPTS))
          return;
        const parent = this.coreParent().Parent;
        const isPseudo = !parent || !(parent.isKind("msubsup") && !parent.isKind("msub"));
        this.setProperty("pseudoscript", isPseudo);
        if (isPseudo) {
          this.attributes.setInherited("lspace", 0);
          this.attributes.setInherited("rspace", 0);
        }
      }
      checkPrimes(mo) {
        const PRIMES = this.constructor.primes;
        if (!mo.match(PRIMES))
          return;
        const REMAP = this.constructor.remapPrimes;
        const primes = unicodeString(unicodeChars(mo).map((c) => REMAP[c]));
        this.setProperty("primes", primes);
      }
      checkMathAccent(mo) {
        const parent = this.Parent;
        if (this.getProperty("mathaccent") !== void 0 || !parent || !parent.isKind("munderover")) {
          return;
        }
        const [base, under, over] = parent.childNodes;
        if (base.isEmbellished && base.coreMO() === this)
          return;
        const isUnder = !!(under && under.isEmbellished && under.coreMO() === this);
        const isOver = !!(over && over.isEmbellished && under.coreMO() === this);
        if (!isUnder && !isOver)
          return;
        if (this.isMathAccent(mo)) {
          this.setProperty("mathaccent", true);
        } else if (this.isMathAccentWithWidth(mo)) {
          this.setProperty("mathaccent", false);
        }
      }
      isMathAccent(mo = this.getText()) {
        const MATHACCENT = this.constructor.mathaccents;
        return !!mo.match(MATHACCENT);
      }
      isMathAccentWithWidth(mo = this.getText()) {
        const MATHACCENT = this.constructor.mathaccentsWithWidth;
        return !!mo.match(MATHACCENT);
      }
    };
    MmlMo.defaults = Object.assign(Object.assign({}, AbstractMmlTokenNode.defaults), JSON.parse(`{
 "form":"infix","fence":false,"separator":false,"lspace":"thickmathspace","rspace":"thickmathspace","stretchy":false,"symmetric":false,"maxsize":"infinity","minsize":"0em","largeop":false,
 "movablelimits":false,"accent":false,"linebreak":"auto","lineleading":"100%","linebreakstyle":"before","indentalign":"auto","indentshift":"0","indenttarget":"","indentalignfirst":"indentalign",
 "indentshiftfirst":"indentshift","indentalignlast":"indentalign","indentshiftlast":"indentshift"
}`));
    MmlMo.MMLSPACING = MMLSPACING;
    MmlMo.OPTABLE = OPTABLE;
    MmlMo.pseudoScripts = new RegExp([
      "^[\"'*`",
      "ª",
      "°",
      "²-´",
      "¹",
      "º",
      "‘-‟",
      "′-‷⁗",
      "⁰ⁱ",
      "⁴-ⁿ",
      "₀-₎",
      "]+$"
    ].join(""));
    MmlMo.primes = new RegExp([
      `^["'`,
      "‘-‟",
      "]+$"
    ].join(""));
    MmlMo.opPattern = /^[a-zA-Z]{2,}$/;
    MmlMo.remapPrimes = {
      34: 8243,
      39: 8242,
      8216: 8245,
      8217: 8242,
      8218: 8242,
      8219: 8245,
      8220: 8246,
      8221: 8243,
      8222: 8243,
      8223: 8246
    };
    MmlMo.mathaccents = new RegExp([
      "^[",
      "´\u0301ˊ",
      "`\u0300ˋ",
      "¨\u0308",
      "~\u0303˜",
      "¯\u0304ˉ",
      "˘\u0306",
      "ˇ\u030C",
      "^\u0302ˆ",
      "\u20D0\u20D1",
      "\u20D6\u20D7\u20E1",
      "˙\u0307",
      "˚\u030A",
      "\u20DB",
      "\u20DC",
      "]$"
    ].join(""));
    MmlMo.mathaccentsWithWidth = new RegExp([
      "^[",
      "←→↔",
      "⏜⏝",
      "⏞⏟",
      "]$"
    ].join(""));
  }
});
// node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mtext.js
var MmlMtext;
var init_mtext = __esm({
  "node_modules/@mathjax/src/mjs/core/MmlTree/MmlNodes/mtext.js"() {
    init_MmlNode();
    MmlMtext = class _MmlMtext extends AbstractMmlTokenNode {
      constructor() {
        super(...arguments);
        this.texclass = TEXCLASS.ORD;
      }
      get kind() {
        return "mtext";
      }
      get isSpacelike() {
        return !!this.getText().match(/^\s*$/) && !this.attributes.hasOneOf(_MmlMtext.NONSPACELIKE);
      }
    };
    MmlMtext.NONSPACELIKE = ["style", "mathbackground", "background"];
    MmlMtext.defaults = Object.assign({}, AbstractMmlTokenNode.defaults);
  }
});
export{init_string,split,init_mo,MmlMo,init_mtext,MmlMtext,toEntity,sortLength,quotePattern,replaceUnicode,getRange,init_OperatorDictionary,OPTABLE,unicodeChars,isPercent};
