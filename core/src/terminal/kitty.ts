import type { Probe, RGB, TerminalColors } from '../types.js'
import type { Env } from './detect.js'
import { type ConfigReadOptions, dirname, type FileReader, homeOf, parseColorValue, resolvePath, tryRead, xdgConfigHome } from './color.js'
import { fontWeightOf } from './font.js'

// kitty's built-in colours (kitty/options/types.py defaults, 0.49.1).
export const KITTY_DEFAULT_FOREGROUND: RGB = { r: 0xdd, g: 0xdd, b: 0xdd }
export const KITTY_DEFAULT_BACKGROUND: RGB = { r: 0x00, g: 0x00, b: 0x00 }
export const KITTY_DEFAULT_PALETTE: readonly RGB[] = [
  0x000000, 0xcc0403, 0x19cb00, 0xcecb00, 0x0d73cc, 0xcb1ed1, 0x0dcdcd, 0xdddddd,
  0x767676, 0xf2201f, 0x23fd00, 0xfffd00, 0x1a8fff, 0xfd28ff, 0x14ffff, 0xffffff,
].map(n => ({ r: n >> 16, g: (n >> 8) & 0xff, b: n & 0xff }))

type Scheme = ConfigReadOptions['scheme']
const AUTO_THEMES = { dark: 'dark-theme.auto.conf', light: 'light-theme.auto.conf' } as const

// Loads the configuration exactly as kitty does (kitty.conf from the usual
// directories, includes, themes, geninclude, -o is not visible), then prints
// its colours as "name #rrggbb" lines. kitty's automatic light/dark themes
// (dark-theme.auto.conf, light-theme.auto.conf, no-preference-theme.auto.conf
// next to kitty.conf) replace all colours when the desktop is in that mode; the
// GUI picks one from the desktop's appearance, which a child can't ask, so each
// existing one is printed too, prefixed "dark:", "light:" or "no_preference:".
// Then the text font as configured (font_family: its family, style, names and
// variation axes) as a "font_spec" line holding a JSON list of strings.
// Needs no terminal and no window; takes about 50 ms.
const KITTY_COLORS_PY = String.raw`
from kitty.cli import create_default_opts
def h(v):
    return '#%06x' % (int(v) & 0xffffff)
keys = ['foreground', 'background'] + ['color%d' % i for i in range(16)]
o = create_default_opts()
print('foreground', h(o.foreground))
print('background', h(o.background))
for i in range(16):
    print('color%d' % i, h(o.color_table[i]))
try:
    import json
    f = o.font_family
    if isinstance(f, str):
        names = [f]
    else:
        names = [str(a) for a in (getattr(f, 'axes', None) or ())]
        names += [getattr(f, k, None) for k in ('style', 'full_name', 'postscript_name', 'family', 'created_from_string')]
    print('font_spec', json.dumps([n for n in names if isinstance(n, str) and n]))
except Exception:
    pass
try:
    from kitty.colors import theme_colors
    theme_colors.refresh()
    for name in ('dark', 'light', 'no_preference'):
        if getattr(theme_colors, 'has_%s_theme' % name):
            spec = getattr(theme_colors, '%s_spec' % name)
            for k in keys:
                if spec.get(k) is not None:
                    print('%s:%s' % (name, k), h(spec[k]))
except Exception:
    pass
`

/**
 * Reads "name #rrggbb" lines (foreground, background, color0-15): the output of
 * the kitty probe, and also of `kitten @ get-colors`. Lines prefixed "dark:" or
 * "light:" are kitty's automatic themes; the one matching `scheme` replaces the
 * base colours. Undefined when no foreground or background was found.
 */
export function parseKittyColors(stdout: string, scheme?: Scheme): TerminalColors | undefined {
  const base = new Map<string, RGB>()
  const variants = new Map<string, Map<string, RGB>>()
  let fontWeight: number | undefined
  for (const line of stdout.split('\n')) {
    if (line.startsWith('font_spec ')) {
      fontWeight = fontWeightOf(fontNames(line.slice(10)))
      continue
    }
    const m = /^\s*(?:(dark|light|no_preference):)?([a-z_0-9]+)\s+(\S+)\s*$/.exec(line)
    if (!m) continue
    const color = parseColorValue(m[3]!)
    if (!color) continue
    const into = m[1] ? (variants.get(m[1]) ?? variants.set(m[1], new Map()).get(m[1])!) : base
    into.set(m[2]!, color)
  }
  const chosen = (scheme && variants.get(scheme)) || base
  if (!chosen.has('foreground') && !chosen.has('background')) return undefined
  return { ...kittyColors(chosen), ...(fontWeight ? { fontWeight } : {}) }
}

/** The names in a font_spec line's JSON list, axes first, as the probe prints them. */
function fontNames(json: string): string[] {
  try {
    const names: unknown = JSON.parse(json)
    return Array.isArray(names) ? names.filter((n): n is string => typeof n === 'string') : []
  } catch {
    return []
  }
}

function kittyColors(values: ReadonlyMap<string, RGB>): TerminalColors {
  return {
    foreground: values.get('foreground') ?? KITTY_DEFAULT_FOREGROUND,
    background: values.get('background') ?? KITTY_DEFAULT_BACKGROUND,
    palette: KITTY_DEFAULT_PALETTE.map((c, i) => values.get(`color${i}`) ?? c),
  }
}

/**
 * Commands that load kitty's configuration with kitty's own parser. `kitty` is
 * on PATH in kitty's children on macOS and in the binary builds (kitty puts its
 * own directory there); the launcher under KITTY_INSTALLATION_DIR and the macOS
 * app bundle are the fallbacks.
 */
export function kittyColorProbes(env: Env, scheme?: Scheme): Probe<TerminalColors>[] {
  const commands = ['kitty']
  if (env.KITTY_INSTALLATION_DIR?.startsWith('/')) commands.push(`${env.KITTY_INSTALLATION_DIR.replace(/\/+$/, '')}/kitty/launcher/kitty`)
  commands.push('/Applications/kitty.app/Contents/MacOS/kitty')
  return commands.map(cmd => ({ argv: [cmd, '+runpy', KITTY_COLORS_PY], parse: (out: string) => parseKittyColors(out, scheme) }))
}

// ─── config files ────────────────────────────────────────────────────────────

/** The directories kitty looks in for kitty.conf, in order (the first that has one wins). */
export function kittyConfigDirs(env: Env, platform?: string): string[] {
  const dirs: string[] = []
  const add = (d: string | undefined) => {
    if (d?.startsWith('/') && !dirs.includes(d)) dirs.push(d.replace(/\/+$/, ''))
  }
  if (env.KITTY_CONFIG_DIRECTORY) return [resolvePath(env.KITTY_CONFIG_DIRECTORY, env) ?? env.KITTY_CONFIG_DIRECTORY]
  const xdg = xdgConfigHome(env)
  add(xdg && `${xdg}/kitty`)
  const home = homeOf(env)
  add(home && `${home}/.config/kitty`)
  if (platform === undefined || platform === 'darwin') add(home && `${home}/Library/Preferences/kitty`)
  for (const d of (env.XDG_CONFIG_DIRS ?? '/etc/xdg').split(':')) add(d && `${d}/kitty`)
  return dirs
}

/**
 * kitty's configured colours, read from its config files through `read`:
 * /etc/xdg/kitty/kitty.conf, then kitty.conf from the first config directory
 * that has one, following `include` (relative to the including file, with `~`
 * and $VARS expanded; `kitten themes` writes current-theme.conf and includes it)
 * and `envinclude`, then the automatic theme for `scheme` if there is one.
 * `geninclude` and `globinclude` can't be followed (they run a program or list
 * a directory). Prefer the kitty probe, which uses kitty's own parser; this is
 * for when kitty can't be run.
 */
export async function readKittyColors(read: FileReader, options: ConfigReadOptions): Promise<TerminalColors | undefined> {
  const { env } = options
  const values = new Map<string, RGB>()
  const ctx: KittyParse = { read, env, platform: options.platform, seen: new Set(), values }
  let found = await loadKittyFile(ctx, '/etc/xdg/kitty/kitty.conf')
  let configDir: string | undefined
  for (const dir of kittyConfigDirs(env, options.platform)) {
    if (await loadKittyFile(ctx, `${dir}/kitty.conf`)) {
      configDir = dir
      found = true
      break
    }
  }
  configDir ??= kittyConfigDirs(env, options.platform)[0]
  if (options.scheme && configDir) {
    const theme = new Map<string, RGB>()
    if (await loadKittyFile({ ...ctx, seen: new Set(), values: theme }, `${configDir}/${AUTO_THEMES[options.scheme]}`)) return kittyColors(theme)
  }
  if (!found) return undefined
  // font_family as written: `family="Roboto Mono" style="Medium"` or a bare name (`Roboto Mono Medium`).
  const fontWeight = ctx.font === undefined ? undefined : fontWeightOf([/\bstyle\s*=\s*"([^"]*)"/.exec(ctx.font)?.[1], ctx.font])
  return { ...kittyColors(values), ...(fontWeight ? { fontWeight } : {}) }
}

interface KittyParse {
  read: FileReader
  env: Env
  platform: string | undefined
  seen: Set<string>
  values: Map<string, RGB>
  /** The last font_family value. */
  font?: string
}

const KITTY_COLOR_KEY = /^(foreground|background|color(?:[0-9]|1[0-5]))$/

async function loadKittyFile(ctx: KittyParse, path: string, depth = 0): Promise<boolean> {
  if (ctx.seen.has(path) || depth > 16) return false
  const text = await tryRead(ctx.read, path)
  if (text === undefined) return false
  ctx.seen.add(path)
  await loadKittyLines(ctx, text, dirname(path), depth)
  return true
}

async function loadKittyLines(ctx: KittyParse, text: string, base: string, depth: number): Promise<void> {
  const vars = { ...ctx.env, KITTY_OS: ctx.platform === 'darwin' ? 'macos' : (ctx.platform ?? 'linux') }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = /^([a-zA-Z][a-zA-Z0-9_-]*)\s+(.+)$/.exec(line)
    if (!m) continue
    const [, key, value] = m as unknown as [string, string, string]
    if (key === 'include') {
      const path = resolvePath(value.trim(), vars, base)
      if (path) await loadKittyFile(ctx, path, depth + 1)
    } else if (key === 'envinclude') {
      const pattern = globToRegExp(value.trim())
      for (const [name, content] of Object.entries(ctx.env)) {
        if (content !== undefined && pattern.test(name)) await loadKittyLines(ctx, content, base, depth + 1)
      }
    } else if (KITTY_COLOR_KEY.test(key)) {
      const color = parseColorValue(value)
      if (color) ctx.values.set(key, color)
    } else if (key === 'font_family') {
      ctx.font = value.trim()
    }
  }
}

function globToRegExp(glob: string): RegExp {
  const body = glob.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
  return new RegExp(`^${body}$`)
}
