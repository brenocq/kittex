// The New Computer Modern dynamic character ranges kittex carries. Importing a
// range registers its glyphs with MathJaxNewcmFont (dynamicSetup); initTypeset
// then defines them in the font, since nothing may be fetched at run time.
//
// The font's static part (always bundled) already has ASCII, basic Greek in
// every math style, bold/italic/bold-italic, the big operators, the delimiters
// and their stretchy parts, and the common TeX symbols. These ranges add what
// ordinary math still reaches, chosen by typesetting every macro of the bundled
// TeX packages (plain, under \boldsymbol, and as a \left delimiter): about 1.7 MB
// of source. Left out (about 11 MB): accented Latin in bold, italic, sans-serif
// and monospace, extended Greek (polytonic, Coptic; \digamma), Cyrillic, Hebrew,
// Arabic, Devanagari, Cherokee, phonetics, Braille, bold/italic symbols and
// accents, the supplemental arrows and shapes, and the private-use glyphs.
// Their characters are unknown to the font, and typeset() reports a TexError.
import '@mathjax/mathjax-newcm-font/js/svg/dynamic/accents.js' // combining accents, modifier letters
import '@mathjax/mathjax-newcm-font/js/svg/dynamic/arrows.js' // arrows and their stretchy parts
import '@mathjax/mathjax-newcm-font/js/svg/dynamic/calligraphic.js' // \mathcal
import '@mathjax/mathjax-newcm-font/js/svg/dynamic/double-struck.js' // \mathbb, \Bbbk
import '@mathjax/mathjax-newcm-font/js/svg/dynamic/fraktur.js' // \mathfrak, \Re, \Im
import '@mathjax/mathjax-newcm-font/js/svg/dynamic/latin.js' // accented Latin (é, ö, ñ) in upright text
import '@mathjax/mathjax-newcm-font/js/svg/dynamic/math.js' // further relations and operators (\Cap, \lll, ⩽)
import '@mathjax/mathjax-newcm-font/js/svg/dynamic/monospace.js' // \mathtt
import '@mathjax/mathjax-newcm-font/js/svg/dynamic/sans-serif.js' // \mathsf, \Game
import '@mathjax/mathjax-newcm-font/js/svg/dynamic/script.js' // \mathscr, \ell
import '@mathjax/mathjax-newcm-font/js/svg/dynamic/shapes.js' // \bigstar, ✓, ★, box drawing
import '@mathjax/mathjax-newcm-font/js/svg/dynamic/symbols.js' // ©, ½, ‰, ™, ℃ and other symbols
import '@mathjax/mathjax-newcm-font/js/svg/dynamic/variants.js' // TeX variant forms (°, superscript digits)
