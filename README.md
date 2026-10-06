<div align="center">
  <img alt="kittex: a tuxedo kitten with an integral sign for a tail, next to raw LaTeX turning into typeset equations" src="https://github.com/brenocq/kittex/raw/assets/banner.svg" width="880">

  <a href="#install">Install</a> · <a href="#what-you-get">What you get</a> · <a href="#terminals">Terminals</a> · <a href="#options">Options</a>

  <a href="https://github.com/brenocq/kittex/actions/workflows/tests.yml"><img src="https://github.com/brenocq/kittex/actions/workflows/tests.yml/badge.svg" alt="🧪 Tests"/></a>
</div>

<br>

<p align="center">
  <img alt="Claude Code with kittex in kitty: Claude explains how language models are trained, and every equation appears typeset as it lands" src="https://github.com/brenocq/kittex/raw/assets/demo.webp" width="992">
</p>

## Install

Type this in Claude Code, answer `y` to add the marketplace, and that's it:

```
/plugin install kittex --marketplace brenocq/kittex
```

No TeX, no Python, nothing to configure. kittex typesets inside Claude Code
itself, and tells Claude to write its math as LaTeX, so you never have to ask.

## What you get

<table>
  <tr>
    <td width="50%"><b>Live.</b> Readable previews while Claude streams; real equations the moment each block lands, and not one line jumps.</td>
    <td width="50%"><b>Real TeX.</b> MathJax 4 with New Computer Modern, the font of LaTeX papers, drawn in your terminal's own colours.</td>
  </tr>
  <tr>
    <td><b>Inline too.</b> <code>$x_k$</code> in a sentence, a list, a heading, a quote or a table sits on the text's baseline, sized to the font around it.</td>
    <td><b>Copy.</b> Hover an equation and click <code>⧉ copy LaTeX</code> to grab its source.</td>
  </tr>
</table>

## Terminals

| Terminal | Equations appear as |
| --- | --- |
| kitty, Ghostty | typeset images |
| everything else (WezTerm, iTerm2, Terminal.app, Windows Terminal, tmux) | Unicode math: `∑ᵢ xᵢ²`, stacked fractions, aligned matrices |

## Options

Both are rows in `/config`, on by default.

- **Render LaTeX math.** Off: replies show Claude's raw LaTeX.
- **Render inline math as images.** Off: inline math stays Unicode text.

<details>
<summary><b>How it works</b></summary>
<br>

While a reply streams, kittex rewrites each line's math into a Unicode preview
padded to exactly the size of the image that will replace it. When the block
lands, the typeset images are laid over those previews, which is why nothing
moves. Everything runs inside Claude Code's mod sandbox: MathJax 4 typesets the
formula, and a small rasterizer draws its glyphs at the terminal's own cell
size and colours.

</details>

<details>
<summary><b>Using it with other mods</b></summary>
<br>

Install kittex before any mod that redraws whole replies, such as prismantis:
the first plugin installed is the outermost one, and kittex only sees a reply
when it sits outside such a mod (it then hands each piece of prose to it). If
prismantis is already installed, reinstall it after kittex.

</details>

## License

[MIT](LICENSE). kittex bundles MathJax and its New Computer Modern font
(Apache 2.0), marked and fflate (MIT); their licenses are in
[plugin/THIRD-PARTY-NOTICES](plugin/THIRD-PARTY-NOTICES).
