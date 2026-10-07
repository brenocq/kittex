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

<table>
  <tr>
    <td width="50%"><b>Live.</b> Readable math while Claude writes, real equations the moment each part is done. Nothing jumps around.</td>
    <td width="50%"><b>Real TeX.</b> Typeset like a LaTeX paper, in your terminal's own colours.</td>
  </tr>
  <tr>
    <td><b>Inline too.</b> Math in the middle of a sentence sits right on the line, at the size of your text.</td>
    <td><b>Copy.</b> Hover an equation to copy its LaTeX.</td>
  </tr>
</table>

## Terminals

| Terminal | Equations appear as |
| --- | --- |
| kitty, Ghostty | typeset images |
| everything else (WezTerm, iTerm2, Terminal.app, Windows Terminal, tmux) | Unicode math: `∑ᵢ xᵢ²`, stacked fractions, aligned matrices |

## Options

Two pickers in `/config`, one for each kind of math:

- **Block math**: equations on their own line (`$$…$$`).
- **Inline math**: math inside a sentence (`$…$`).

Each one is `image` (the default), `unicode` or `raw`:

| Choice | You see |
| --- | --- |
| `image` | typeset equations, or Unicode math in terminals that can't show images |
| `unicode` | Unicode math, never images |
| `raw` | Claude's LaTeX, as written |

Set both to `raw` to turn kittex off.

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
