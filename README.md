# kittex

Typesets the LaTeX math in Claude Code's replies as real TeX (New Computer
Modern), drawn as images in terminals with the kitty graphics protocol (kitty,
Ghostty) and as Unicode everywhere else. Nothing else to install.

Work in progress.

## Install

```
/plugin install kittex --marketplace brenocq/kittex
```

Install kittex before any mod that redraws whole replies, such as prismantis:
the first plugin installed is the outermost one, and kittex only sees a reply
when it sits outside such a mod (it then hands each piece of prose to it). If
prismantis is already installed, reinstall it after kittex.
