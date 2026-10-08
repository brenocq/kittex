# kittex

kittex typesets the LaTeX in Claude's replies right in your terminal. In kitty and Ghostty, display and inline math become real TeX images that follow your font and theme. While Claude writes, they show as readable Unicode, and nothing jumps when they land. Other terminals get clean Unicode math. With a local LaTeX install, TikZ, pgfplots, tikz-cd, circuitikz and chemfig diagrams are drawn as pictures too, compiled in a sandbox. Hover an equation to copy its LaTeX, and run `/kittex-doctor` to check your setup.

kittex runs entirely on your machine: it makes no network requests and sends nothing anywhere. It keeps rendered images in `~/.cache/kittex` (the Cache option turns this off).

Options, setup for diagrams and the FAQ: https://github.com/brenocq/kittex

License: MIT.

## What kittex does on your machine

**Network.** None. kittex never opens a connection, and nothing it reads leaves your machine: what it learns about your terminal stays in Claude Code's plugin storage and in the cache below.

**Programs it runs**, each with a time limit, only in a terminal session (not under `claude -p` or the SDK):

- `uname -s`, once per session: macOS and Linux draw the reply bullet differently.
- `perl -e …`, or `python3 -I -c …` where perl is missing: asks the terminal Claude Code runs in for its cell size in pixels (the `TIOCGWINSZ` ioctl on that terminal, opened read-only), so images fit the text rows. On macOS the python probe runs `ps` to find that terminal. The scripts are fixed text in `core/src/terminal/cell.ts`.
- In kitty, `kitty +runpy …`; in Ghostty, `ghostty +show-config --changes-only=false`: each prints the terminal's own colours and font from its config, so formulas take your text colour and weight. Without them kittex reads `kitty.conf` or Ghostty's config file itself.
- `fc-match` finds your terminal font's file, and `od` reads byte ranges of it where Claude Code can't read the file whole: the font's metrics set the size of the math.
- `rm -f` on old entries of kittex's own cache, when it passes its size limit (the mod's file API has no delete).
- Diagrams, only with the Local LaTeX option on `auto` and TeX installed: `latex` and `dvisvgm` (version checks, then the compile of each diagram, with shell escape off), `kpsewhich`, `realpath` and `ldd` (to find what TeX needs, so the sandbox can show it), `prlimit` (CPU time and file size limits) and on Linux `bwrap` (bubblewrap: TeX runs without your home folder or the temporary folders, only its own job folder), `mktemp -d`, `mkdir -p`, `cp`, `mv`, `find … -delete` and `rm -rf` on that job folder and on kittex's TeX cache. The commands are built in `core/src/diagram/tex.ts` and `hooks/tex.ts`.
- `/kittex-doctor` runs the same checks again, plus `du` and `find` on kittex's cache folder to report its size.

**Files it writes**, none of them read or run by any other tool:

- `~/.cache/kittex/v<n>/` (or under `$XDG_CACHE_HOME`): rendered equations, so a resumed session draws them at once. The Cache option turns it off.
- `~/.cache/kittex/tex/`: drawn diagrams, and in `tex/fmt/` the LaTeX format kittex precompiles for them.
- `$TMPDIR/kittex-tex.XXXXXXXXXX/`: one job folder per compile, removed after it.

**What it reads.** Environment variables, by name and never written: `TERM`, `TERM_PROGRAM`, `TERM_PROGRAM_VERSION`, `LC_TERMINAL`, `VTE_VERSION`, `TERMINAL_EMULATOR`, `KITTY_WINDOW_ID`, `KITTY_PID`, `KITTY_INSTALLATION_DIR`, `KITTY_CONFIG_DIRECTORY`, `GHOSTTY_RESOURCES_DIR`, `GHOSTTY_BIN_DIR`, `WEZTERM_PANE`, `WEZTERM_EXECUTABLE`, `ITERM_SESSION_ID`, `WT_SESSION`, `TMUX`, `STY`, `ZELLIJ`, `ZELLIJ_SESSION_NAME` (which terminal draws, and whether a multiplexer sits in between); `SSH_CONNECTION`, `SSH_CLIENT`, `SSH_TTY` (only whether they are set: over SSH the terminal's files are on another machine); `HOME`, `XDG_CONFIG_HOME`, `XDG_CONFIG_DIRS`, `XDG_CACHE_HOME`, `TMPDIR`, `PATH`, `CLAUDE_CONFIG_DIR` (where configs, the cache and TeX are); `CLAUDE_CODE_FORCE_TERMINAL_IMAGES`, `CLAUDE_CODE_SESSION_KIND`, `FORCE_HYPERLINK`, `CI`, `TEAMCITY_VERSION`, `NETLIFY` (what Claude Code itself decides by). Files: the terminal's config, your terminal font, a custom Claude theme's file (`<config dir>/themes/<name>.json`), and for the doctor `/etc/os-release` and kittex's own `plugin.json`. Settings: the `theme` and `maxProseWidth` values, kittex's own options, and (for the doctor) only whether managed settings exist. kittex reads no credentials, tokens or keys, and has none to ask for.

**Settings and storage it sets.** Once, if you set the Cache option to `false` in kittex 0.1.0 (when it was a switch), kittex writes it again as `off`, the value `/config` now offers, through Claude Code's own `/config` path. Nothing else in your settings, and no environment variable. In Claude Code's plugin storage it keeps the terminal facts it measured (for the next session's first drawing), where TeX was found, and which conversations already have its current instructions.

**What it adds to the conversation.** In a terminal where it draws math, a system prompt section (`kittex:math`) tells Claude to write math as LaTeX (`$…$` inline, `$$` on lines of their own) and, with TeX, diagrams as TikZ in a `latex` code block; the text is `MATH_INSTRUCTIONS` and `DIAGRAM_INSTRUCTIONS` in `hooks/math.ts`. Where that section can't be added (a policy plugin drops it) or a conversation holds an older version, the same text rides once as context with the next prompt you send. `$.prompt.compose`, which kittex calls once at start, is Claude Code's own call: it checks whether the section reached the system prompt.

**Hooks.** `/kittex-doctor` is kittex's own command, answered by its `command.run` hook; no other command is hooked, and kittex never decides a permission. The `config.set` hooks on `theme` and `maxProseWidth` pass each change on unchanged and only redraw the math to match. The reply hooks change what you see, not what Claude wrote: while a reply streams, its formulas show as Unicode, and once it lands they are drawn as images in the same place. The session hooks (start, end, compaction, appended replies) only note when a conversation starts over.

**The bundled code.** `hooks/core.js` and `hooks/core-parts/` are built from the TypeScript in [`core/src`](https://github.com/brenocq/kittex/tree/main/core/src) by `npm run build` (`core/scripts/build.mjs`): esbuild, not minified, each statement under a comment naming its source file, cut into parts that each import the one before (so Claude Code reads the mod without holding up the prompt). It bundles MathJax 4 with its New Computer Modern font (Apache-2.0), marked and fflate (MIT), as `THIRD-PARTY-NOTICES` lists. The long JSON texts at the start of the parts (`__kittexJson…`) are that font's tables, glyph metrics and SVG outlines, parsed only when the first formula is drawn. The getters and the `Object.getOwnPropertyNames` and `Object.getOwnPropertyDescriptor` calls (`__export`, `__copyProps`) are esbuild's module helpers, which give `import * as` its live bindings; the `setTimeout` in MathJax's `maction` tooltips never runs in the mod.
