import type { CellSize, Probe, RGB, TerminalColors, TerminalInfo } from '../types.js'

// STUB, replaced by feat/terminal: environment-only detection, a Linux-only cell
// probe, no colour probes.

/** What the environment says about the terminal Claude Code runs in. */
export function detectTerminal(env: Readonly<Record<string, string | undefined>>): TerminalInfo {
  const multiplexed = env.TMUX !== undefined || env.STY !== undefined || env.ZELLIJ !== undefined
  const kind =
    env.KITTY_WINDOW_ID !== undefined || env.TERM === 'xterm-kitty'
      ? 'kitty'
      : env.TERM_PROGRAM === 'ghostty'
        ? 'ghostty'
        : env.TERM_PROGRAM === 'WezTerm'
          ? 'wezterm'
          : env.TERM_PROGRAM === 'iTerm.app'
            ? 'iterm2'
            : 'other'
  return { kind, images: !multiplexed && (kind === 'kitty' || kind === 'ghostty'), multiplexed }
}

// Walks up from the probe's parent to the first process whose stdin, stdout or
// stderr is a terminal, and asks that terminal its size (TIOCGWINSZ), which
// includes pixels where the terminal reports them. Prints "rows cols xpixels ypixels".
const CELL_PROBE_PERL = String.raw`
use Fcntl;
my $p = getppid();
for (1 .. 32) {
  for my $fd (0, 1, 2) {
    my $t = readlink("/proc/$p/fd/$fd");
    next unless defined $t && $t =~ m{^/dev/(pts/\d+|tty\w*)$};
    sysopen(my $h, $t, O_RDONLY | O_NOCTTY) or next;
    my $ws = "\0" x 8;
    if (ioctl($h, 0x5413, $ws)) { my ($r, $c, $x, $y) = unpack('S4', $ws); print "$r $c $x $y\n"; exit 0 }
  }
  open(my $s, '<', "/proc/$p/stat") or last;
  my ($rest) = (scalar(<$s>) =~ /\)\s+(.*)/);
  $p = (split ' ', $rest)[1];
  last if !$p || $p <= 1;
}
exit 1;
`

/** Measures the terminal's cells in pixels. */
export const cellProbe: Probe<CellSize> = {
  argv: ['perl', '-e', CELL_PROBE_PERL],
  parse(stdout) {
    const [rows, columns, xpixels, ypixels] = stdout.trim().split(/\s+/).map(Number)
    if (!rows || !columns || !xpixels || !ypixels) return undefined
    return { cellWidth: xpixels / columns, cellHeight: ypixels / rows, columns, rows }
  },
}

/** Commands that read the terminal's configured colours, most reliable first. */
export function colorProbes(_terminal: TerminalInfo): Probe<TerminalColors>[] {
  return []
}

/** The ink colour for formulas: the colour reply text is drawn in, as best known. */
export function chooseInk(sources: { theme?: string; themeInk?: RGB; terminal?: TerminalColors }): RGB {
  if (sources.themeInk) return sources.themeInk
  if (sources.terminal?.foreground) return sources.terminal.foreground
  return sources.theme?.startsWith('light') ? { r: 0x22, g: 0x22, b: 0x22 } : { r: 0xe6, g: 0xe6, b: 0xe6 }
}

/** Pixels per em for math next to text in cells of this size. */
export function emPxForCell(cell: Pick<CellSize, 'cellWidth' | 'cellHeight'>, emScale = 1.15): number {
  return (cell.cellWidth / 0.6) * emScale
}
