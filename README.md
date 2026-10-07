<div align="center">
  <img alt="kittex: a tuxedo kitten with an integral sign for a tail, next to raw LaTeX turning into typeset equations" src="https://github.com/brenocq/kittex/raw/assets/banner.svg" width="880">

  <a href="#install">Install</a> · <a href="#what-you-get">What you get</a> · <a href="#terminals">Terminals</a> · <a href="#config">Config</a> · <a href="#faq">FAQ</a>

  <a href="https://github.com/brenocq/kittex/actions/workflows/tests.yml"><img src="https://github.com/brenocq/kittex/actions/workflows/tests.yml/badge.svg" alt="🧪 Tests"/></a>
</div>

<br>

<p align="center">
  <img alt="Claude Code with kittex in kitty: one key equation each for pretraining, RLHF and DPO appears typeset as it lands; then Claude draws the RLHF pipeline and plots the DPO loss, and both come out as pictures" src="https://github.com/brenocq/kittex/raw/assets/demo.webp" width="992">
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

<details>
<summary><b>Diagrams</b> (optional): install LaTeX to draw TikZ, pgfplots, tikz-cd, circuitikz and chemfig</summary>
<br>

Diagrams are drawn by your own TeX. Install it with your system's packages:

**Arch Linux**

```
sudo pacman -S --needed texlive-basic texlive-latex texlive-latexrecommended texlive-latexextra texlive-pictures texlive-mathscience texlive-plaingeneric dvisvgm bubblewrap
```

**Debian, Ubuntu**

```
sudo apt install texlive-latex-extra texlive-pictures texlive-science texlive-plain-generic preview-latex-style dvisvgm bubblewrap
```

**Fedora**

```
sudo dnf install texlive-latex texlive-dvisvgm texlive-standalone texlive-amsmath texlive-amsfonts texlive-pgf texlive-pgfplots texlive-tikz-cd texlive-circuitikz texlive-chemfig texlive-simplekv texlive-siunitx texlive-dvips texlive-mathtools texlive-preview texlive-mylatexformat bubblewrap
```

**macOS**

```
brew install --cask basictex
sudo /Library/TeX/texbin/tlmgr update --self
sudo /Library/TeX/texbin/tlmgr install dvisvgm standalone amsmath amsfonts pgf pgfplots tikz-cd circuitikz chemfig simplekv siunitx dvips mathtools preview mylatexformat
```

Or the full MacTeX, everything included (about 6 GB): `brew install --cask mactex-no-gui`.
macOS has no bubblewrap, so TeX runs unconfined there (see [Local LaTeX](#config)).

**Other (TeX Live)**

Install [TeX Live](https://tug.org/texlive/) (its basic scheme is enough), then:

```
tlmgr install dvisvgm standalone amsmath amsfonts pgf pgfplots tikz-cd circuitikz chemfig simplekv siunitx dvips mathtools preview mylatexformat
```

On Linux, also install `bubblewrap` from your distribution.

Then restart Claude Code and run `/kittex-doctor` to check.

</details>

> [!NOTE]
> **On Team and Enterprise plans**, Claude Code doesn't let plugins change a
> reply while it streams, so you'll see Claude's raw LaTeX until each part is
> done, then the typeset equations. To get the live previews too, ask an admin
> to deploy kittex for your organization through Claude Code's managed settings.

## What you get

<p align="center">
  <img alt="Live: readable while Claude writes, typeset when each part is done. Nothing jumps." src="https://github.com/brenocq/kittex/raw/assets/feature-live.svg" width="49%">
  <img alt="Diagrams: TikZ, plots, circuits and molecules, drawn by your own LaTeX." src="https://github.com/brenocq/kittex/raw/assets/feature-diagrams.svg" width="49%">
</p>
<p align="center">
  <img alt="Real TeX: the font of LaTeX papers, in your terminal's colours." src="https://github.com/brenocq/kittex/raw/assets/feature-tex.svg" width="49%">
  <img alt="Inline too: math inside a sentence sits on the line, at your text's size." src="https://github.com/brenocq/kittex/raw/assets/feature-inline.svg" width="49%">
</p>
<p align="center">
  <img alt="Reflow: resize the window and equations break to fit it, then join back as it widens." src="https://github.com/brenocq/kittex/raw/assets/feature-reflow.svg" width="49%">
  <img alt="Copy: hover an equation to copy its LaTeX." src="https://github.com/brenocq/kittex/raw/assets/feature-copy.svg" width="49%">
</p>

## Terminals

<p align="center">
  <img alt="kitty and Ghostty show typeset images; every other terminal (WezTerm, iTerm2, Terminal.app, Windows Terminal, Alacritty, tmux) shows Unicode math." src="https://github.com/brenocq/kittex/raw/assets/terminals.svg" width="100%">
</p>

## Config

Change these in `/config`.

<details>
<summary><b>Block math</b>: equations on their own line (<code>$$…$$</code>)</summary>
<br>

- `image` (default): typeset equations, or Unicode math in terminals that can't show images.
- `unicode`: Unicode math, never images.
- `raw`: Claude's LaTeX, as written. Set both to `raw` to turn kittex off.

</details>

<details>
<summary><b>Inline math</b>: math inside a sentence (<code>$…$</code>)</summary>
<br>

- `image` (default): typeset equations, or Unicode math in terminals that can't show images.
- `unicode`: Unicode math, never images.
- `raw`: Claude's LaTeX, as written. Set both to `raw` to turn kittex off.

</details>

<details>
<summary><b>Local LaTeX</b>: diagrams and math MathJax can't render, with your TeX install</summary>
<br>

- `auto` (default): TikZ, pgfplots, tikz-cd, chemfig and circuitikz diagrams, and math MathJax can't render, drawn with your TeX once it is [installed](#install).
- `off`: never runs TeX; diagrams stay code blocks.

TeX runs with its shell escape off and a time limit, and kittex refuses any diagram that reads a file by its path.
On Linux, bubblewrap also hides your home folder and the network from it (a TeX installed in your home folder stays readable, nothing else there), and prlimit caps its CPU time and file sizes.
macOS has neither, so there TeX can read the files you can: choose `off` if that matters to you.
`/kittex-doctor` shows which of these apply on your machine.

</details>

<details>
<summary><b>Cache equation images</b>: keep rendered equations on disk for instant resumes</summary>
<br>

- `on` (default): resumed sessions draw their equations from the cache, in `~/.cache/kittex` (or `$XDG_CACHE_HOME/kittex`), at most 50 MiB, the oldest removed first.
- `off`: every equation is typeset again on each resume; nothing is written.

With your TeX, the same folder also keeps the pictures it drew (at most 20 MiB) and its format (about 11 MB, replaced when TeX is updated).

</details>

## FAQ

<details>
<summary><b>How does it work?</b></summary>
<br>

While a reply streams, kittex rewrites each line's math into a Unicode preview
padded to exactly the size of the image that will replace it. When the block
lands, the typeset images are laid over those previews, which is why nothing
moves. Everything runs inside Claude Code's mod sandbox: MathJax 4 typesets the
formula, and a small rasterizer draws its glyphs at the terminal's own cell
size and colours.

</details>

<details>
<summary><b>Does it work with other mods?</b></summary>
<br>

Yes. Install kittex before any mod that redraws whole replies, such as prismantis:
the first plugin installed is the outermost one, and kittex only sees a reply
when it sits outside such a mod (it then hands each piece of prose to it). If
prismantis is already installed, reinstall it after kittex.

</details>

<details>
<summary><b>Do I need to change my CLAUDE.md?</b></summary>
<br>

No. kittex adds a short note to Claude's system prompt asking it to write math
as LaTeX: `$…$` inside a sentence and `$$…$$` on a line of its own. Where Claude
Code doesn't let plugins change the system prompt (Team and Enterprise plans),
kittex sends the same note along with your first message instead, and again
after `/clear` or a compaction. Either way Claude writes LaTeX without being
asked, and nothing is added to your CLAUDE.md. Setting both Block math and
Inline math to `raw` stops the note too.

</details>

<details>
<summary><b>Something isn't rendering. How do I check?</b></summary>
<br>

Run `/kittex-doctor` in Claude Code. It checks your terminal (images, cell
size, font, colours), whether replies reach kittex while they stream, your
options, and the TeX behind diagrams (commands, packages, confinement and a
test picture), and prints the install command for anything missing.

</details>

## License

[MIT](LICENSE). Bundled libraries keep their own licenses: see the [third-party notices](plugin/THIRD-PARTY-NOTICES).
