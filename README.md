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

Type this in Claude Code (2.1.290 or newer), answer `y` to add the marketplace, and that's it:

```
/plugin install kittex --marketplace brenocq/kittex
```

No TeX, no Python, nothing to configure. kittex typesets inside Claude Code
itself, and tells Claude to write its math as LaTeX, so you never have to ask.
Then ask Claude something with math in it:

```
Derive the quadratic formula step by step
```

> [!NOTE]
> **On Team and Enterprise plans**, Claude Code doesn't let plugins change a
> reply while it streams, so you'll see Claude's raw LaTeX until each part is
> done, then the typeset equations. To get the live previews too, ask an admin
> to deploy kittex for your organization through Claude Code's managed settings.

## What you get

<p align="center">
  <img alt="Live: readable while Claude writes, typeset when each part is done. Nothing jumps." src="https://github.com/brenocq/kittex/raw/assets/feature-live.svg" width="49%">
  <img alt="Real TeX: the font of LaTeX papers, in your terminal's colours." src="https://github.com/brenocq/kittex/raw/assets/feature-tex.svg" width="49%">
  <img alt="Inline too: math inside a sentence sits on the line, at your text's size." src="https://github.com/brenocq/kittex/raw/assets/feature-inline.svg" width="49%">
  <img alt="Copy: hover an equation to copy its LaTeX." src="https://github.com/brenocq/kittex/raw/assets/feature-copy.svg" width="49%">
</p>

## Terminals

<p align="center">
  <img alt="kitty and Ghostty show typeset images; every other terminal (WezTerm, iTerm2, Terminal.app, Windows Terminal, Alacritty, tmux) shows Unicode math." src="https://github.com/brenocq/kittex/raw/assets/terminals.svg" width="100%">
</p>

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

[MIT](LICENSE). Bundled libraries keep their own licenses: see the [third-party notices](plugin/THIRD-PARTY-NOTICES).
