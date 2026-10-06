import type { RGB } from '../types.js'
import type { Env } from './detect.js'

/** Reads a text file, or undefined when it is missing or unreadable (the mod backs it with `$.fs.read`). */
export type FileReader = (path: string) => Promise<string | undefined>

/** Options shared by the config-file readers. */
export interface ConfigReadOptions {
  /** Claude Code's environment (HOME, XDG_CONFIG_HOME, KITTY_CONFIG_DIRECTORY, GHOSTTY_RESOURCES_DIR...). */
  env: Env
  /** `darwin`, `linux`... Undefined: try the locations of both. */
  platform?: string
  /** The desktop's light/dark appearance, for terminals that switch themes with it. */
  scheme?: 'dark' | 'light'
}

/** `#rrggbb`, lowercase. */
export function toHex(c: RGB): string {
  return '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('')
}

/**
 * A colour as terminal config files write it: `#rgb`, `#rrggbb`, `#rrrgggbbb`,
 * `#rrrrggggbbbb`, X11 `rgb:r/g/b` (1-4 hex digits per channel), bare
 * `rrggbb`/`rgb` hex (Ghostty) or a basic colour name. Undefined otherwise.
 */
export function parseColorValue(value: string): RGB | undefined {
  const v = value.trim().toLowerCase()
  const named = NAMED[v.replace(/\s+/g, '')]
  if (named) return named
  const hex = /^#?([0-9a-f]+)$/.exec(v)
  if (hex) {
    const digits = hex[1]!
    if (!v.startsWith('#') && digits.length !== 3 && digits.length !== 6) return undefined
    if (digits.length % 3 !== 0 || digits.length > 12) return undefined
    const n = digits.length / 3
    const [r, g, b] = [0, 1, 2].map(i => scaleHex(digits.slice(i * n, (i + 1) * n)))
    return { r: r!, g: g!, b: b! }
  }
  const x11 = /^rgb:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})$/.exec(v)
  if (x11) return { r: scaleHex(x11[1]!), g: scaleHex(x11[2]!), b: scaleHex(x11[3]!) }
  return undefined
}

// A channel of 1-4 hex digits scaled to 0-255 (X11 semantics: "f" is 255, "fff" is 255).
function scaleHex(digits: string): number {
  if (digits.length === 2) return parseInt(digits, 16)
  const max = 16 ** digits.length - 1
  return Math.round((parseInt(digits, 16) / max) * 255)
}

const NAMED: Record<string, RGB> = {
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 255, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  cyan: { r: 0, g: 255, b: 255 },
  magenta: { r: 255, g: 0, b: 255 },
  gray: { r: 190, g: 190, b: 190 },
  grey: { r: 190, g: 190, b: 190 },
  lightgray: { r: 211, g: 211, b: 211 },
  lightgrey: { r: 211, g: 211, b: 211 },
  darkgray: { r: 169, g: 169, b: 169 },
  darkgrey: { r: 169, g: 169, b: 169 },
}

/** Relative luminance (WCAG), 0 for black to 1 for white. */
export function luminance(c: RGB): number {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
}

/** Whether a background reads as dark: luminance under 0.18, which is CIE L* under about 50. */
export function isDark(background: RGB): boolean {
  return luminance(background) < 0.18
}

/** xterm's 256-colour palette entry 16-255 (the 6×6×6 cube and the grey ramp); 0-15 belong to the terminal. */
export function xterm256(n: number): RGB | undefined {
  if (!Number.isInteger(n) || n < 16 || n > 255) return undefined
  if (n >= 232) {
    const v = 8 + (n - 232) * 10
    return { r: v, g: v, b: v }
  }
  const level = (i: number) => (i === 0 ? 0 : 55 + i * 40)
  const i = n - 16
  return { r: level(Math.floor(i / 36)), g: level(Math.floor(i / 6) % 6), b: level(i % 6) }
}

// ─── paths ───────────────────────────────────────────────────────────────────

export function homeOf(env: Env): string | undefined {
  return env.HOME || undefined
}

/** `~` and `$VAR`/`${VAR}` expanded, then made absolute against `base`. Undefined when `~` has no HOME. */
export function resolvePath(path: string, env: Env, base?: string): string | undefined {
  let p = path.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (whole, a?: string, b?: string) => env[(a ?? b)!] ?? whole)
  if (p === '~' || p.startsWith('~/')) {
    const home = homeOf(env)
    if (!home) return undefined
    p = home + p.slice(1)
  }
  if (!p.startsWith('/')) {
    if (!base) return undefined
    p = base.replace(/\/+$/, '') + '/' + p
  }
  return normalize(p)
}

export function dirname(path: string): string {
  const i = path.replace(/\/+$/, '').lastIndexOf('/')
  return i <= 0 ? '/' : path.slice(0, i)
}

function normalize(path: string): string {
  const out: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return '/' + out.join('/')
}

/** XDG_CONFIG_HOME, or ~/.config. */
export function xdgConfigHome(env: Env): string | undefined {
  if (env.XDG_CONFIG_HOME?.startsWith('/')) return env.XDG_CONFIG_HOME.replace(/\/+$/, '')
  const home = homeOf(env)
  return home ? `${home}/.config` : undefined
}

/** Reads a file through `read`, never throwing. */
export async function tryRead(read: FileReader, path: string | undefined): Promise<string | undefined> {
  if (!path) return undefined
  try {
    return await read(path)
  } catch {
    return undefined
  }
}
