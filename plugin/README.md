# kittex

kittex typesets the LaTeX in Claude's replies right in your terminal. In kitty and Ghostty, display and inline math become real TeX images that follow your font and theme. While Claude writes, they show as readable Unicode, and nothing jumps when they land. Other terminals get clean Unicode math. With a local LaTeX install, TikZ, pgfplots, tikz-cd, circuitikz and chemfig diagrams are drawn as pictures too, compiled in a sandbox. Hover an equation to copy its LaTeX, and run `/kittex-doctor` to check your setup.

kittex runs entirely on your machine: it makes no network requests and sends nothing anywhere. It keeps rendered images in `~/.cache/kittex` (the Cache option turns this off).

Options, setup for diagrams and the FAQ: https://github.com/brenocq/kittex

License: MIT.
