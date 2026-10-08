import{layoutMath,parseXml2,lines,NAMED2,ADJUST_KEYS,GHOSTTY_DEFAULT_FOREGROUND,GHOSTTY_DEFAULT_BACKGROUND,KITTY_DEFAULT_FOREGROUND,KITTY_DEFAULT_BACKGROUND,AUTO_THEMES,X_HEIGHT_RATIO,MATH_X_HEIGHT,CLAUDE_THEME_TEXT,ANSI_NAMES,MAX_IMAGE_SIDE,initTypeset,GlyphError,measure,MIN_DISPLAY_SCALE,TexError,TOO_LARGE,MAX_PIXELS,rasterize,encodePng,recolorPng,MIN_INLINE_SCALE,INK_EDGE,CLIPPED_RUN_PX,MAX_TEX_LENGTH,typeset,texToMathML2,INLINE_OVERFLOW,CACHE_LIMIT,assumedBackground,MAX_PICTURE_ROWS,adaptColor,measurePicture,MIN_PICTURE_SCALE,rasterizePicture,encodePicturePng,pictureOutlines}from'./p34.js';export*from'./p34.js';
// core/src/unicode/index.ts
function toUnicode(mathml, options3) {
  try {
    const breakWidth = options3.breakLines ? options3.maxWidth : void 0;
    const box = layoutMath(parseXml2(mathml), options3.display, { compact: options3.display && options3.compact === true, breakWidth, tight: options3.tight });
    if (!options3.display && box.rows.length !== 1 && breakWidth === void 0) return null;
    if (options3.maxWidth !== void 0 && box.width > options3.maxWidth) return null;
    return { lines: lines(box), baseline: box.base, width: box.width };
  } catch {
    return null;
  }
}
// core/src/terminal/color.ts
function toHex(c) {
  return "#" + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function parseColorValue(value) {
  const v = value.trim().toLowerCase();
  const named = NAMED2[v.replace(/\s+/g, "")];
  if (named) return named;
  const hex = /^#?([0-9a-f]+)$/.exec(v);
  if (hex) {
    const digits2 = hex[1];
    if (!v.startsWith("#") && digits2.length !== 3 && digits2.length !== 6) return void 0;
    if (digits2.length % 3 !== 0 || digits2.length > 12) return void 0;
    const n = digits2.length / 3;
    const [r, g, b] = [0, 1, 2].map((i2) => scaleHex(digits2.slice(i2 * n, (i2 + 1) * n)));
    return { r, g, b };
  }
  const x11 = /^rgb:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})$/.exec(v);
  if (x11) return { r: scaleHex(x11[1]), g: scaleHex(x11[2]), b: scaleHex(x11[3]) };
  return void 0;
}
function scaleHex(digits2) {
  if (digits2.length === 2) return parseInt(digits2, 16);
  const max2 = 16 ** digits2.length - 1;
  return Math.round(parseInt(digits2, 16) / max2 * 255);
}
function luminance(c) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}
function isDark(background) {
  return luminance(background) < 0.18;
}
function xterm256(n) {
  if (!Number.isInteger(n) || n < 16 || n > 255) return void 0;
  if (n >= 232) {
    const v = 8 + (n - 232) * 10;
    return { r: v, g: v, b: v };
  }
  const level = (i3) => i3 === 0 ? 0 : 55 + i3 * 40;
  const i2 = n - 16;
  return { r: level(Math.floor(i2 / 36)), g: level(Math.floor(i2 / 6) % 6), b: level(i2 % 6) };
}
function homeOf(env) {
  return env.HOME || void 0;
}
function resolvePath(path, env, base) {
  let p = path.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (whole, a, b) => env[a ?? b] ?? whole);
  if (p === "~" || p.startsWith("~/")) {
    const home = homeOf(env);
    if (!home) return void 0;
    p = home + p.slice(1);
  }
  if (!p.startsWith("/")) {
    if (!base) return void 0;
    p = base.replace(/\/+$/, "") + "/" + p;
  }
  return normalize2(p);
}
function dirname(path) {
  const i2 = path.replace(/\/+$/, "").lastIndexOf("/");
  return i2 <= 0 ? "/" : path.slice(0, i2);
}
function normalize2(path) {
  const out = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return "/" + out.join("/");
}
function xdgConfigHome(env) {
  if (env.XDG_CONFIG_HOME?.startsWith("/")) return env.XDG_CONFIG_HOME.replace(/\/+$/, "");
  const home = homeOf(env);
  return home ? `${home}/.config` : void 0;
}
async function tryRead(read, path) {
  if (!path) return void 0;
  try {
    return await read(path);
  } catch {
    return void 0;
  }
}
// core/src/terminal/font.ts
var WEIGHT_WORDS = [
  [/(?:extra|ultra)[-_\s]?light/i, 200],
  [/(?:semi|demi)[-_\s]?bold/i, 600],
  [/(?:extra|ultra)[-_\s]?bold/i, 800],
  [/thin|hairline/i, 100],
  [/black|heavy/i, 900],
  [/light/i, 300],
  [/retina/i, 450],
  [/medium/i, 500],
  [/bold/i, 700],
  [/regular|normal|book|roman/i, 400]
];
function fontWeightOf(names) {
  for (const name of names) {
    if (!name) continue;
    const axis = /\bwght\s*[=:]\s*(\d{3})\b/i.exec(name);
    if (axis) return clampWeight(Number(axis[1]));
    if (/^\s*\d{3}\s*$/.test(name)) return clampWeight(Number(name));
    for (const [word, weight] of WEIGHT_WORDS) if (word.test(name)) return weight;
  }
  return void 0;
}
function clampWeight(weight) {
  return Math.min(900, Math.max(100, weight));
}
// core/src/terminal/ghostty.ts
var GHOSTTY_DEFAULT_PALETTE = [
  1908513,
  13395558,
  11910504,
  15779444,
  8495806,
  11703483,
  9092791,
  12961990,
  6710886,
  13979219,
  12175946,
  15189319,
  8038106,
  12818392,
  7389361,
  15395562
].map((n) => ({ r: n >> 16, g: n >> 8 & 255, b: n & 255 }));
function ghosttyEntries(text) {
  const entries = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    entries.push([key, value]);
  }
  return entries;
}
function parseGhosttyTheme(value) {
  const v = value.trim();
  if (!v) return void 0;
  if (!/[,:=]/.test(v)) return { light: v, dark: v };
  let light;
  let dark;
  for (const part of v.split(",")) {
    const m = /^\s*(light|dark)\s*[:=]\s*(.+?)\s*$/.exec(part);
    if (m?.[1] === "light") light = m[2];
    else if (m?.[1] === "dark") dark = m[2];
  }
  return light && dark ? { light, dark } : void 0;
}
function parseMetricAdjust(value) {
  const v = value.trim();
  if (v.endsWith("%")) {
    const percent2 = Number(v.slice(0, -1));
    if (v.length < 2 || !Number.isFinite(percent2)) return void 0;
    return { factor: Math.max(0, 1 + percent2 / 100) };
  }
  return /^[+-]?\d+$/.test(v) ? { px: Number(v) } : void 0;
}
function emptyColors() {
  return { values: /* @__PURE__ */ new Map(), palette: /* @__PURE__ */ new Map(), adjust: {}, font: {} };
}
function parseAlphaBlending(value) {
  const v = value.trim();
  return v === "native" || v === "linear" || v === "linear-corrected" ? v : void 0;
}
function ghosttyDefaultAlphaBlending(platform) {
  return platform === "darwin" ? "native" : "linear-corrected";
}
function applyColor(into, key, value) {
  if (Object.prototype.hasOwnProperty.call(ADJUST_KEYS, key)) {
    const field = ADJUST_KEYS[key];
    const adjust = value ? parseMetricAdjust(value) : void 0;
    if (adjust) into.adjust[field] = adjust;
    else delete into.adjust[field];
  } else if (key === "font-family" || key === "font-style" || key === "font-variation") {
    const field = key === "font-family" ? "family" : key === "font-style" ? "style" : "variation";
    if (!value) delete into.font[field];
    else if (field !== "family" || into.font.family === void 0) into.font[field] = value;
  } else if (key === "font-size") {
    const size = Number(value);
    if (value && size > 0 && Number.isFinite(size)) into.font.size = size;
    else delete into.font.size;
  } else if (key === "alpha-blending") {
    into.alphaBlending = parseAlphaBlending(value);
  } else if (key === "foreground" || key === "background") {
    if (!value) {
      into.values.delete(key);
      return;
    }
    const color = parseColorValue(value);
    if (color) into.values.set(key, color);
  } else if (key === "palette") {
    const m = /^\s*(0x[0-9a-f]+|0o[0-7]+|0b[01]+|\d+)\s*=\s*(.+)$/i.exec(value);
    if (!m) return;
    const index = Number(m[1].toLowerCase());
    const color = parseColorValue(m[2]);
    if (color && index >= 0 && index < 16) into.palette.set(index, color);
  }
}
function graphemeWidthOf(value) {
  return value === "unicode" || value === "legacy" ? value : void 0;
}
function toTerminalColors(...layers) {
  const pick2 = (key) => layers.reduce((c, l) => l.values.get(key) ?? c, void 0);
  const colors = {
    foreground: pick2("foreground") ?? GHOSTTY_DEFAULT_FOREGROUND,
    background: pick2("background") ?? GHOSTTY_DEFAULT_BACKGROUND,
    palette: GHOSTTY_DEFAULT_PALETTE.map((c, i2) => layers.reduce((acc, l) => l.palette.get(i2) ?? acc, c))
  };
  const blending = layers.reduce((b, l) => l.alphaBlending ?? b, void 0);
  if (blending) colors.alphaBlending = blending;
  const adjust = Object.assign({}, ...layers.map((l) => l.adjust));
  if (Object.keys(adjust).length > 0) colors.cellAdjust = adjust;
  const font = Object.assign({}, ...layers.map((l) => l.font));
  const style = font.style === void 0 || ["default", "true", "false"].includes(font.style) ? void 0 : font.style;
  const fontWeight = fontWeightOf([font.variation, style, font.family]) ?? (font.family === void 0 && style === void 0 ? 400 : void 0);
  if (fontWeight) colors.fontWeight = fontWeight;
  const named = {};
  if (font.family) named.family = font.family;
  if (font.family && style) named.style = style;
  if (font.size) named.sizePt = font.size;
  if (Object.keys(named).length > 0) colors.font = named;
  return colors;
}
function parseGhosttyConfig(stdout, scheme) {
  const colors = emptyColors();
  let theme;
  let graphemeWidth;
  for (const [key, value] of ghosttyEntries(stdout)) {
    if (key === "theme") theme = parseGhosttyTheme(value);
    else if (key === "grapheme-width-method") graphemeWidth = graphemeWidthOf(value);
    else applyColor(colors, key, value);
  }
  if (!colors.values.has("foreground") && !colors.values.has("background")) return void 0;
  if (scheme === "dark" && theme && theme.light !== theme.dark) return void 0;
  return { ...toTerminalColors(colors), ...graphemeWidth ? { graphemeWidth } : {} };
}
function ghosttyColorProbes(env, scheme) {
  const commands = [];
  if (env.GHOSTTY_BIN_DIR?.startsWith("/")) commands.push(`${env.GHOSTTY_BIN_DIR.replace(/\/+$/, "")}/ghostty`);
  commands.push("ghostty", "/Applications/Ghostty.app/Contents/MacOS/ghostty");
  return commands.map((cmd) => ({ argv: [cmd, "+show-config", "--changes-only=false"], parse: (out) => parseGhosttyConfig(out, scheme) }));
}
function ghosttyConfigFiles(env, platform) {
  const files = [];
  const xdg = xdgConfigHome(env);
  if (xdg) files.push(`${xdg}/ghostty/config`, `${xdg}/ghostty/config.ghostty`);
  const home = homeOf(env);
  if (home && (platform === void 0 || platform === "darwin")) {
    const support = `${home}/Library/Application Support/com.mitchellh.ghostty`;
    files.push(`${support}/config`, `${support}/config.ghostty`);
  }
  return files;
}
function ghosttyThemeDirs(env) {
  const dirs = [];
  const xdg = xdgConfigHome(env);
  if (xdg) dirs.push(`${xdg}/ghostty/themes`);
  if (env.GHOSTTY_RESOURCES_DIR?.startsWith("/")) dirs.push(`${env.GHOSTTY_RESOURCES_DIR.replace(/\/+$/, "")}/themes`);
  else {
    if (env.GHOSTTY_BIN_DIR?.startsWith("/")) dirs.push(resolvePath("../share/ghostty/themes", env, env.GHOSTTY_BIN_DIR));
    dirs.push("/Applications/Ghostty.app/Contents/Resources/ghostty/themes", "/usr/share/ghostty/themes", "/usr/local/share/ghostty/themes");
  }
  return dirs;
}
async function readGhosttyColors(read, options3) {
  const { env } = options3;
  const user = emptyColors();
  let theme;
  let graphemeWidth;
  const queue = ghosttyConfigFiles(env, options3.platform);
  const seen = /* @__PURE__ */ new Set();
  for (let i2 = 0; i2 < queue.length && i2 < 64; i2++) {
    const path = queue[i2];
    if (seen.has(path)) continue;
    seen.add(path);
    const text = await tryRead(read, path);
    if (text === void 0) continue;
    for (const [key, value] of ghosttyEntries(text)) {
      if (key === "config-file") {
        if (!value) continue;
        const target = resolvePath(value.startsWith("?") ? value.slice(1) : value, env, dirname(path));
        if (target) queue.push(target);
      } else if (key === "theme") theme = parseGhosttyTheme(value);
      else if (key === "grapheme-width-method") graphemeWidth = graphemeWidthOf(value);
      else applyColor(user, key, value);
    }
  }
  const themeColors = emptyColors();
  const name = theme && (options3.scheme === "dark" ? theme.dark : theme.light);
  if (name) {
    const candidates = name.startsWith("/") || name.startsWith("~/") ? [resolvePath(name, env)] : name.includes("/") ? [] : ghosttyThemeDirs(env).map((d) => `${d}/${name}`);
    for (const path of candidates) {
      const text = await tryRead(read, path);
      if (text === void 0) continue;
      for (const [key, value] of ghosttyEntries(text)) applyColor(themeColors, key, value);
      break;
    }
  }
  const colors = toTerminalColors(themeColors, user);
  if (!colors.alphaBlending && options3.platform !== void 0) colors.alphaBlending = ghosttyDefaultAlphaBlending(options3.platform);
  return { ...colors, ...graphemeWidth ? { graphemeWidth } : {} };
}
// core/src/terminal/kitty.ts
var KITTY_DEFAULT_PALETTE = [
  0,
  13370371,
  1690368,
  13552384,
  881612,
  13311697,
  904653,
  14540253,
  7763574,
  15867935,
  2358528,
  16776448,
  1740799,
  16591103,
  1376255,
  16777215
].map((n) => ({ r: n >> 16, g: n >> 8 & 255, b: n & 255 }));
var KITTY_COLORS_PY = String.raw`
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
    print('font_size', float(o.font_size))
    for k, m in o.modify_font.items():
        if k in ('cell_width', 'cell_height', 'baseline'):
            v, u = m.mod_value
            print('modify_font', k, float(v), getattr(u, 'name', u))
    print('text_composition', o.text_composition_strategy)
except Exception:
    pass
try:
    from kitty.fonts.render import get_font_files
    f = get_font_files(o)['medium']
    if isinstance(f, dict) and f.get('path'):
        print('font_file', int(f.get('index') or 0), f['path'])
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
`;
function parseKittyColors(stdout, scheme) {
  const base = /* @__PURE__ */ new Map();
  const variants = /* @__PURE__ */ new Map();
  let fontWeight;
  const font = {};
  const kittyAdjust = {};
  let textComposition;
  for (const line of stdout.split("\n")) {
    if (line.startsWith("font_spec ")) {
      fontWeight = fontWeightOf(fontNames(line.slice(10)));
      continue;
    }
    const fontLine = /^(font_size|font_file|modify_font|text_composition) (.*)$/.exec(line);
    if (fontLine) {
      const [, key, value] = fontLine;
      if (key === "font_size") {
        const size = Number(value);
        if (size > 0 && Number.isFinite(size)) font.sizePt = size;
      } else if (key === "font_file") {
        const m2 = /^(\d+) (\/.+)$/.exec(value);
        if (m2) [font.index, font.file] = [Number(m2[1]), m2[2]];
      } else if (key === "modify_font") {
        const m2 = /^(cell_width|cell_height|baseline) (-?[\d.]+) (pt|pixel|percent)$/.exec(value);
        const field = m2 && { cell_width: "cellWidth", cell_height: "cellHeight", baseline: "baseline" }[m2[1]];
        if (m2 && field && Number.isFinite(Number(m2[2]))) kittyAdjust[field] = { value: Number(m2[2]), unit: m2[3] === "pixel" ? "px" : m2[3] === "percent" ? "%" : "pt" };
      } else {
        textComposition = parseTextComposition(value);
      }
      continue;
    }
    const m = /^\s*(?:(dark|light|no_preference):)?([a-z_0-9]+)\s+(\S+)\s*$/.exec(line);
    if (!m) continue;
    const color = parseColorValue(m[3]);
    if (!color) continue;
    const into = m[1] ? variants.get(m[1]) ?? variants.set(m[1], /* @__PURE__ */ new Map()).get(m[1]) : base;
    into.set(m[2], color);
  }
  const chosen = scheme && variants.get(scheme) || base;
  if (!chosen.has("foreground") && !chosen.has("background")) return void 0;
  return {
    ...kittyColors(chosen),
    ...fontWeight ? { fontWeight } : {},
    ...Object.keys(font).length > 0 ? { font } : {},
    ...Object.keys(kittyAdjust).length > 0 ? { kittyAdjust } : {},
    ...textComposition ? { textComposition } : {}
  };
}
function parseTextComposition(value) {
  const v = value.trim();
  if (v === "platform" || v === "legacy") return v;
  const m = /^(\d+(?:\.\d+)?|\.\d+)(?:\s+(\d+(?:\.\d+)?))?$/.exec(v);
  if (!m) return void 0;
  const gamma = Number(m[1]);
  const contrast = m[2] === void 0 ? 0 : Number(m[2]);
  return gamma >= 0.01 && contrast <= 100 ? { gamma, contrast } : void 0;
}
function fontNames(json) {
  try {
    const names = JSON.parse(json);
    return Array.isArray(names) ? names.filter((n) => typeof n === "string") : [];
  } catch {
    return [];
  }
}
function kittyColors(values) {
  return {
    foreground: values.get("foreground") ?? KITTY_DEFAULT_FOREGROUND,
    background: values.get("background") ?? KITTY_DEFAULT_BACKGROUND,
    palette: KITTY_DEFAULT_PALETTE.map((c, i2) => values.get(`color${i2}`) ?? c)
  };
}
function kittyColorProbes(env, scheme) {
  const commands = ["kitty"];
  if (env.KITTY_INSTALLATION_DIR?.startsWith("/")) commands.push(`${env.KITTY_INSTALLATION_DIR.replace(/\/+$/, "")}/kitty/launcher/kitty`);
  commands.push("/Applications/kitty.app/Contents/MacOS/kitty");
  return commands.map((cmd) => ({ argv: [cmd, "+runpy", KITTY_COLORS_PY], parse: (out) => parseKittyColors(out, scheme) }));
}
function kittyConfigDirs(env, platform) {
  const dirs = [];
  const add = (d) => {
    if (d?.startsWith("/") && !dirs.includes(d)) dirs.push(d.replace(/\/+$/, ""));
  };
  if (env.KITTY_CONFIG_DIRECTORY) return [resolvePath(env.KITTY_CONFIG_DIRECTORY, env) ?? env.KITTY_CONFIG_DIRECTORY];
  const xdg = xdgConfigHome(env);
  add(xdg && `${xdg}/kitty`);
  const home = homeOf(env);
  add(home && `${home}/.config/kitty`);
  if (platform === void 0 || platform === "darwin") add(home && `${home}/Library/Preferences/kitty`);
  for (const d of (env.XDG_CONFIG_DIRS ?? "/etc/xdg").split(":")) add(d && `${d}/kitty`);
  return dirs;
}
async function readKittyColors(read, options3) {
  const { env } = options3;
  const values = /* @__PURE__ */ new Map();
  const ctx = { read, env, platform: options3.platform, seen: /* @__PURE__ */ new Set(), values, lines: [] };
  let found = await loadKittyFile(ctx, "/etc/xdg/kitty/kitty.conf");
  let configDir;
  for (const dir of kittyConfigDirs(env, options3.platform)) {
    if (await loadKittyFile(ctx, `${dir}/kitty.conf`)) {
      configDir = dir;
      found = true;
      break;
    }
  }
  configDir ??= kittyConfigDirs(env, options3.platform)[0];
  if (options3.scheme && configDir) {
    const theme = /* @__PURE__ */ new Map();
    if (await loadKittyFile({ ...ctx, seen: /* @__PURE__ */ new Set(), values: theme }, `${configDir}/${AUTO_THEMES[options3.scheme]}`)) return kittyColors(theme);
  }
  if (!found) return void 0;
  const style = ctx.font === void 0 ? void 0 : /\bstyle\s*=\s*"([^"]*)"/.exec(ctx.font)?.[1];
  const fontWeight = ctx.font === void 0 ? void 0 : fontWeightOf([style, ctx.font]);
  const family = ctx.font === void 0 ? void 0 : /\bfamily\s*=\s*"([^"]*)"/.exec(ctx.font)?.[1] ?? (/=/.test(ctx.font) ? void 0 : ctx.font);
  const probeLines = ctx.lines.flatMap(([key, value]) => {
    if (key === "font_size") return [`font_size ${value}`];
    if (key === "text_composition_strategy") return [`text_composition ${value}`];
    const m = /^(cell_width|cell_height|baseline)\s+(-?[\d.]+)(%|px)?$/.exec(value);
    return m ? [`modify_font ${m[1]} ${m[2]} ${m[3] === "%" ? "percent" : m[3] === "px" ? "pixel" : "pt"}`] : [];
  });
  const parsed = parseKittyColors(["foreground #000000", ...probeLines].join("\n"));
  const font = { ...parsed?.font, ...family && family !== "monospace" ? { family } : {}, ...family && style ? { style } : {} };
  return {
    ...kittyColors(values),
    ...fontWeight ? { fontWeight } : {},
    ...Object.keys(font).length > 0 ? { font } : {},
    ...parsed?.kittyAdjust ? { kittyAdjust: parsed.kittyAdjust } : {},
    // kitty's default when the files don't set it.
    textComposition: parsed?.textComposition ?? "platform"
  };
}
var KITTY_COLOR_KEY = /^(foreground|background|color(?:[0-9]|1[0-5]))$/;
async function loadKittyFile(ctx, path, depth = 0) {
  if (ctx.seen.has(path) || depth > 16) return false;
  const text = await tryRead(ctx.read, path);
  if (text === void 0) return false;
  ctx.seen.add(path);
  await loadKittyLines(ctx, text, dirname(path), depth);
  return true;
}
async function loadKittyLines(ctx, text, base, depth) {
  const vars = { ...ctx.env, KITTY_OS: ctx.platform === "darwin" ? "macos" : ctx.platform ?? "linux" };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^([a-zA-Z][a-zA-Z0-9_-]*)\s+(.+)$/.exec(line);
    if (!m) continue;
    const [, key, value] = m;
    if (key === "include") {
      const path = resolvePath(value.trim(), vars, base);
      if (path) await loadKittyFile(ctx, path, depth + 1);
    } else if (key === "envinclude") {
      const pattern = globToRegExp(value.trim());
      for (const [name, content] of Object.entries(ctx.env)) {
        if (content !== void 0 && pattern.test(name)) await loadKittyLines(ctx, content, base, depth + 1);
      }
    } else if (KITTY_COLOR_KEY.test(key)) {
      const color = parseColorValue(value);
      if (color) ctx.values.set(key, color);
    } else if (key === "font_family") {
      ctx.font = value.trim();
    } else if (key === "font_size" || key === "modify_font" || key === "text_composition_strategy") {
      ctx.lines.push([key, value.trim()]);
    }
  }
}
function globToRegExp(glob) {
  const body = glob.replace(/[.+^${}()|\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${body}$`);
}
// core/src/terminal/cell.ts
var CELL_PROBE_PERL = String.raw`
use strict;
use Fcntl qw(O_RDONLY O_NOCTTY);
my $req = ($^O eq 'darwin' || $^O =~ /bsd/i) ? 0x40087468 : 0x5413;
my $proc = -d '/proc/self/fd';
sub tty_path {
  my ($t) = @_;
  return unless defined $t && $t =~ m{^(?:/dev/)?(pts/\d+|tty\w+|s\d+)$};
  my $n = $1;
  return '/dev/' . ($n =~ /^s\d/ ? "tty$n" : $n);
}
sub try_size {
  my $t = tty_path($_[0]) or return;
  sysopen(my $h, $t, O_RDONLY | O_NOCTTY) or return;
  my $ws = "\0" x 8;
  ioctl($h, $req, $ws) or return;
  my ($r, $c, $x, $y) = unpack('S4', $ws);
  print "$r $c $x $y\n";
  exit 0;
}
my $p = getppid();
for (1 .. 64) {
  last if !$p || $p <= 1;
  my $next;
  if ($proc) {
    try_size(readlink("/proc/$p/fd/$_")) for 0 .. 2;
    open(my $s, '<', "/proc/$p/stat") or last;
    my ($rest) = (scalar(<$s>) =~ /\)\s+(.*)/s);
    last unless defined $rest;
    $next = (split ' ', $rest)[1];
  } else {
    open(my $ps, '-|', 'ps', '-o', 'ppid=,tty=', '-p', $p) or last;
    my $line = <$ps>;
    close $ps;
    last unless defined $line && $line =~ /^\s*(\d+)\s+(\S+)/;
    $next = $1;
    try_size($2);
  }
  $p = $next;
}
exit 1;
`;
var CELL_PROBE_PYTHON = String.raw`
import fcntl, os, re, struct, subprocess, sys, termios
def tty_path(t):
    m = re.fullmatch(r'(?:/dev/)?(pts/\d+|tty\w+|s\d+)', t or '')
    if not m:
        return None
    n = m.group(1)
    return '/dev/' + ('tty' + n if re.match(r's\d', n) else n)
def try_size(t):
    t = tty_path(t)
    if not t:
        return
    try:
        fd = os.open(t, os.O_RDONLY | os.O_NOCTTY)
    except OSError:
        return
    try:
        r, c, x, y = struct.unpack('4H', fcntl.ioctl(fd, termios.TIOCGWINSZ, b'\0' * 8))
    except OSError:
        return
    finally:
        os.close(fd)
    print(r, c, x, y)
    sys.exit(0)
proc = os.path.isdir('/proc/self/fd')
p = os.getppid()
for _ in range(64):
    if p <= 1:
        break
    if proc:
        for fd in (0, 1, 2):
            try:
                try_size(os.readlink('/proc/%d/fd/%d' % (p, fd)))
            except OSError:
                pass
        try:
            with open('/proc/%d/stat' % p) as f:
                p = int(f.read().rsplit(')', 1)[1].split()[1])
        except (OSError, ValueError, IndexError):
            break
    else:
        try:
            out = subprocess.run(['ps', '-o', 'ppid=,tty=', '-p', str(p)], capture_output=True, text=True).stdout.split()
            p = int(out[0])
        except (OSError, ValueError, IndexError):
            break
        if len(out) > 1:
            try_size(out[1])
sys.exit(1)
`;
function parseWinsize(stdout) {
  const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/m.exec(stdout);
  if (!match) return void 0;
  const [rows, columns, xpixels, ypixels] = match.slice(1).map(Number);
  if (!(rows > 0 && columns > 0 && xpixels > 0 && ypixels > 0)) return void 0;
  const cellWidth = Math.floor(xpixels / columns);
  const cellHeight = Math.floor(ypixels / rows);
  if (cellWidth < 1 || cellHeight < 1) return void 0;
  return { cellWidth, cellHeight, columns, rows };
}
var cellProbe = {
  argv: ["perl", "-e", CELL_PROBE_PERL],
  parse: parseWinsize
};
var cellProbePython = {
  argv: ["python3", "-I", "-c", CELL_PROBE_PYTHON],
  parse: parseWinsize
};
var cellProbes = [cellProbe, cellProbePython];
function emPxForCell(cell, emScale = 1.15) {
  return cell.cellWidth / 0.6 * emScale;
}
function fontCell(cell, adjust) {
  return { cellWidth: unadjust(cell.cellWidth, adjust?.width), cellHeight: unadjust(cell.cellHeight, adjust?.height) };
}
function unadjust(n, adjust) {
  if (!adjust) return n;
  const font = "factor" in adjust ? adjust.factor > 0 ? n / adjust.factor : n : n - adjust.px;
  return Number.isFinite(font) ? Math.max(1, Math.round(font)) : n;
}
function textBaseline(cellHeight, fraction, adjust) {
  const font = unadjust(cellHeight, adjust?.height);
  return adjustedBaseline(cellHeight, Math.round(font * fraction), font, adjust);
}
function adjustedBaseline(cellHeight, fontTop, font, adjust) {
  let top = fontTop + Math.ceil((cellHeight - font) / 2);
  const shift = adjust?.baseline;
  if (shift) {
    const fromBottom = cellHeight - top;
    top = cellHeight - ("factor" in shift ? Math.round(fromBottom * shift.factor) : fromBottom + shift.px);
  }
  return Math.min(cellHeight, Math.max(0, top));
}
function dpis(platform) {
  const bases = platform === void 0 ? [96, 72] : platform === "darwin" ? [72] : [96];
  return bases.flatMap((base) => [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 4].map((scale2) => base * scale2));
}
function textLayout(kind, font, cell, options3 = {}) {
  const upm = font.unitsPerEm;
  const height2 = (font.ascender - font.descender + font.lineGap) / upm;
  if (!(upm > 0 && height2 > 0.5 && height2 < 4 && cell.cellHeight >= 2)) return void 0;
  const layout2 = kind === "kitty" ? kittyLayout(font, height2, cell, options3) : kind === "ghostty" ? ghosttyLayout(font, height2, cell, options3) : void 0;
  if (!layout2 || !Number.isFinite(layout2.emPx) || layout2.emPx <= 0) return void 0;
  if (font.xHeight) layout2.xHeightPx = font.xHeight / upm * layout2.emPx;
  layout2.baselinePx = Math.min(cell.cellHeight, Math.max(1, layout2.baselinePx));
  return layout2;
}
function mathEmPx(layout2, cell) {
  const byCell = emPxForCell(cell);
  const byFont = layout2.xHeightPx ? X_HEIGHT_RATIO * layout2.xHeightPx / MATH_X_HEIGHT : layout2.emPx * 1.15;
  return Math.min(byCell * 1.35, Math.max(byCell * 0.75, byFont));
}
function kittyLayout(font, height2, cell, options3) {
  const upm = font.unitsPerEm;
  const adjust = options3.kittyAdjust;
  const ceilPx = (units, em3) => Math.ceil(Math.round(units / upm * em3 * 64) / 64);
  const lineUnits = font.ascender - font.descender + font.lineGap;
  const wide = (em3) => !font.advance || adjust?.cellWidth !== void 0 || Math.abs(ceilPx(font.advance, em3) - cell.cellWidth) <= 1;
  let em2;
  let own;
  let dpi = 96;
  if (options3.sizePt && options3.sizePt > 0) {
    search: for (const extra of [0, 1, 2]) {
      for (const d of dpis(options3.platform)) {
        const e = options3.sizePt * d / 72;
        const h = ceilPx(lineUnits, e) + extra;
        if (wide(e) && kittyMetric(h, adjust?.cellHeight, d) === cell.cellHeight) {
          ;
          [em2, own, dpi] = [e, h, d];
          break search;
        }
      }
    }
  }
  if (em2 === void 0 || own === void 0) {
    own = adjust?.cellHeight ? unkittyMetric(cell.cellHeight, adjust.cellHeight, dpi) : cell.cellHeight;
    let low = (own - 1) / height2;
    let high = own / height2;
    if (font.advance && !adjust?.cellWidth) {
      const advance = font.advance / upm;
      const [l, h] = [(cell.cellWidth - 1.5) / advance, (cell.cellWidth + 0.5) / advance];
      if (Math.max(low, l) < Math.min(high, h)) [low, high] = [Math.max(low, l), Math.min(high, h)];
    }
    em2 = (low + high) / 2;
  }
  const cellHeight = cell.cellHeight;
  let baseline = ceilPx(font.ascender, em2);
  if (adjust?.baseline) {
    const moved = kittyMetric(baseline, adjust.baseline, dpi) - baseline;
    const shift = moved >= 0 ? Math.min(moved, baseline - 1) : Math.max(moved, baseline - cellHeight + 1);
    baseline -= shift;
  }
  const added = cellHeight - own;
  if (added > 1) baseline += Math.min(cellHeight - 1, Math.floor(added / 2));
  return { emPx: em2, baselinePx: baseline };
}
function kittyMetric(value, metric, dpi) {
  if (!metric || metric.value === 0) return value;
  if (metric.unit === "%") return Math.round(Math.abs(metric.value) * value / 100);
  const add = metric.unit === "px" ? Math.round(metric.value) : Math.round(metric.value * dpi / 72);
  return add < 0 && -add > value ? 0 : value + add;
}
function unkittyMetric(value, metric, dpi) {
  if (metric.value === 0) return value;
  if (metric.unit === "%") return Math.max(1, Math.round(value * 100 / Math.abs(metric.value)));
  const add = metric.unit === "px" ? Math.round(metric.value) : Math.round(metric.value * dpi / 72);
  return Math.max(1, value - add);
}
function ghosttyLayout(font, height2, cell, options3) {
  const upm = font.unitsPerEm;
  const own = unadjust(cell.cellHeight, options3.adjust?.height);
  const ownWidth = unadjust(cell.cellWidth, options3.adjust?.width);
  const fits2 = (ppem2) => Math.round(height2 * ppem2) === own && (!font.advance || Math.abs(Math.round(font.advance / upm * ppem2) - ownWidth) <= 1);
  let ppem;
  let em2;
  if (options3.sizePt && options3.sizePt > 0) {
    for (const d of dpis(options3.platform)) {
      const p = Math.round(Math.round(options3.sizePt * 64) * d / 72 / 64);
      if (p > 0 && fits2(p)) {
        ppem = p;
        em2 = options3.sizePt * d / 72;
        break;
      }
    }
  }
  ppem ??= Math.max(1, Math.round(own / height2));
  em2 ??= ppem;
  const faceHeight = height2 * ppem;
  const fromBottom = Math.round((font.lineGap / 2 - font.descender) / upm * ppem - (own - faceHeight) / 2);
  return { emPx: em2, baselinePx: adjustedBaseline(cell.cellHeight, own - fromBottom, own, options3.adjust) };
}
// core/src/terminal/fontfile.ts
var tag2 = (b, at) => String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);
var u162 = (b, at) => b[at] << 8 | b[at + 1];
var i16 = (b, at) => u162(b, at) << 16 >> 16;
var u32 = (b, at) => (b[at] << 24 >>> 0) + (b[at + 1] << 16 | b[at + 2] << 8 | b[at + 3]);
async function readFontMetrics(read, index = 0) {
  const exact = async (offset, length4) => {
    const bytes = await read(offset, length4);
    return bytes && bytes.length >= length4 ? bytes : void 0;
  };
  let start = 0;
  let header = await exact(0, 12);
  if (!header) return void 0;
  if (tag2(header, 0) === "ttcf") {
    const count = u32(header, 8);
    if (index < 0 || index >= count || count > 4096) return void 0;
    const at = await exact(12 + 4 * index, 4);
    if (!at) return void 0;
    start = u32(at, 0);
    header = await exact(start, 12);
    if (!header) return void 0;
  }
  const version = u32(header, 0);
  if (version !== 65536 && tag2(header, 0) !== "OTTO" && tag2(header, 0) !== "true") return void 0;
  const numTables = u162(header, 4);
  if (numTables === 0 || numTables > 1024) return void 0;
  const dir = await exact(start + 12, 16 * numTables);
  if (!dir) return void 0;
  const tables = /* @__PURE__ */ new Map();
  for (let i2 = 0; i2 < numTables; i2++) tables.set(tag2(dir, 16 * i2), { offset: u32(dir, 16 * i2 + 8), length: u32(dir, 16 * i2 + 12) });
  const table2 = async (name, min, max2 = min) => {
    const t = tables.get(name);
    if (!t || t.length < min) return void 0;
    return exact(t.offset, Math.min(t.length, max2));
  };
  const head = await table2("head", 54);
  const hhea = await table2("hhea", 36);
  if (!head || !hhea) return void 0;
  const unitsPerEm = u162(head, 18);
  if (unitsPerEm < 16 || unitsPerEm > 16384) return void 0;
  const os2 = await table2("OS/2", 78, 96);
  const hheaMetrics = [i16(hhea, 4), i16(hhea, 6), i16(hhea, 8)];
  let vertical = hheaMetrics;
  let xHeight;
  let weight;
  if (os2) {
    const typo = [i16(os2, 68), i16(os2, 70), i16(os2, 72)];
    const useTypo = (u162(os2, 62) & 128) !== 0;
    if (useTypo) vertical = typo;
    else if (hheaMetrics[0] === 0 && hheaMetrics[1] === 0) vertical = typo[0] !== 0 || typo[1] !== 0 ? typo : [u162(os2, 74), -u162(os2, 76), 0];
    weight = u162(os2, 4) || void 0;
    if (u162(os2, 0) >= 2 && os2.length >= 88) xHeight = i16(os2, 86) || void 0;
  }
  const metrics = { unitsPerEm, ascender: vertical[0], descender: vertical[1], lineGap: Math.max(0, vertical[2]) };
  if (weight) metrics.weight = weight;
  const glyphs = await glyphReader(tables, exact, u162(hhea, 34), i16(head, 50));
  if (glyphs) {
    if (xHeight === void 0) xHeight = await glyphs.top(120);
    const advance = await glyphs.maxAdvance(32, 126);
    if (advance) metrics.advance = advance;
  }
  if (xHeight !== void 0 && xHeight > 0) metrics.xHeight = xHeight;
  return metrics;
}
async function glyphReader(tables, exact, numberOfHMetrics, locFormat) {
  const cmapTable = tables.get("cmap");
  if (!cmapTable || cmapTable.length < 4) return void 0;
  const cmapHead = await exact(cmapTable.offset, Math.min(cmapTable.length, 4 + 8 * 64));
  if (!cmapHead) return void 0;
  const count = Math.min(u162(cmapHead, 2), Math.floor((cmapHead.length - 4) / 8));
  let best;
  for (let i2 = 0; i2 < count; i2++) {
    const platform = u162(cmapHead, 4 + 8 * i2);
    const encoding = u162(cmapHead, 6 + 8 * i2);
    const offset = u32(cmapHead, 8 + 8 * i2);
    const rank = platform === 3 && encoding === 10 ? 4 : platform === 0 && encoding >= 4 ? 3 : platform === 3 && encoding === 1 ? 2 : platform === 0 ? 1 : 0;
    if (rank > 0 && (!best || rank > best.rank)) best = { offset, rank };
  }
  if (!best || best.offset >= cmapTable.length) return void 0;
  const subAt = cmapTable.offset + best.offset;
  const sub = await exact(subAt, 8);
  if (!sub) return void 0;
  const format = u162(sub, 0);
  const subLength = format === 12 ? u32(sub, 4) : u162(sub, 2);
  if (subLength > 1 << 20 || best.offset + subLength > cmapTable.length) return void 0;
  const cmap = await exact(subAt, subLength);
  if (!cmap) return void 0;
  const glyphOf = (cp) => {
    if (format === 4) {
      const segs = u162(cmap, 6) / 2;
      for (let s = 0; s < segs; s++) {
        const end = u162(cmap, 14 + 2 * s);
        if (cp > end) continue;
        const startAt = 16 + 2 * segs + 2 * s;
        const begin = u162(cmap, startAt);
        if (cp < begin) return 0;
        const delta = u162(cmap, startAt + 2 * segs);
        const rangeAt = startAt + 4 * segs;
        const range = u162(cmap, rangeAt);
        if (range === 0) return cp + delta & 65535;
        const at = rangeAt + range + 2 * (cp - begin);
        if (at + 2 > cmap.length) return 0;
        const g = u162(cmap, at);
        return g === 0 ? 0 : g + delta & 65535;
      }
      return 0;
    }
    if (format === 12) {
      const groups = u32(cmap, 12);
      for (let i2 = 0; i2 < groups && 16 + 12 * i2 + 12 <= cmap.length; i2++) {
        const begin = u32(cmap, 16 + 12 * i2);
        const end = u32(cmap, 20 + 12 * i2);
        if (cp >= begin && cp <= end) return u32(cmap, 24 + 12 * i2) + (cp - begin);
      }
    }
    return 0;
  };
  const hmtx = tables.get("hmtx");
  const loca = tables.get("loca");
  const glyf = tables.get("glyf");
  return {
    async top(cp) {
      const id = glyphOf(cp);
      if (!id || !loca || !glyf) return void 0;
      const long = locFormat === 1;
      const entry = await exact(loca.offset + id * (long ? 4 : 2), long ? 8 : 4);
      if (!entry) return void 0;
      const from = long ? u32(entry, 0) : 2 * u162(entry, 0);
      const to = long ? u32(entry, 4) : 2 * u162(entry, 2);
      if (to - from < 10 || from + 10 > glyf.length) return void 0;
      const glyph = await exact(glyf.offset + from, 10);
      return glyph ? i16(glyph, 8) : void 0;
    },
    async maxAdvance(from, to) {
      if (!hmtx || numberOfHMetrics === 0) return void 0;
      let max2 = 0;
      for (let cp = from; cp <= to; cp++) {
        const id = glyphOf(cp);
        if (!id) continue;
        const at = Math.min(id, numberOfHMetrics - 1) * 4;
        if (at + 2 > hmtx.length) continue;
        const bytes = await exact(hmtx.offset + at, 2);
        if (bytes) max2 = Math.max(max2, u162(bytes, 0));
      }
      return max2 || void 0;
    }
  };
}
function fontPattern(family, style) {
  const escape2 = (name) => name.replace(/[\\:,-]/g, (c) => `\\${c}`);
  return style ? `${escape2(family)}:style=${escape2(style)}` : escape2(family);
}
function fontFileArgv(family, style) {
  return ["fc-match", "--format=%{file}\\n%{index}\\n%{family}\\n", fontPattern(family, style)];
}
function parseFontFile(stdout) {
  const [file, index, families] = stdout.split("\n");
  if (!file?.startsWith("/")) return void 0;
  const n = Number(index);
  return { file, index: Number.isInteger(n) && n >= 0 ? n : 0, families: (families ?? "").split(",").map((f) => f.trim()).filter(Boolean) };
}
function matchesFamily(match, family) {
  const want = family.trim().toLowerCase();
  return match.families.some((f) => f.toLowerCase() === want);
}
function odArgv(path, offset, length4) {
  return ["od", "-An", "-v", "-tu1", "-j", String(offset), "-N", String(length4), path];
}
function parseOd(stdout) {
  const words2 = stdout.split(/\s+/).filter(Boolean);
  const bytes = new Uint8Array(words2.length);
  for (let i2 = 0; i2 < words2.length; i2++) {
    const v = Number(words2[i2]);
    if (!Number.isInteger(v) || v < 0 || v > 255) return void 0;
    bytes[i2] = v;
  }
  return bytes;
}
// core/src/terminal/claude-theme.ts
function isBuiltin(theme) {
  return typeof theme === "string" && Object.hasOwn(CLAUDE_THEME_TEXT, theme);
}
function parseClaudeColor(value, palette2) {
  if (typeof value !== "string") return void 0;
  const rgb = /^rgb\(\s?(\d{1,3}),\s?(\d{1,3}),\s?(\d{1,3})\s?\)$/.exec(value);
  if (rgb) {
    const [r, g, b] = rgb.slice(1).map(Number);
    return r <= 255 && g <= 255 && b <= 255 ? { r, g, b } : void 0;
  }
  const hex6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (hex6) return { r: parseInt(hex6[1], 16), g: parseInt(hex6[2], 16), b: parseInt(hex6[3], 16) };
  const hex3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  if (hex3) return { r: parseInt(hex3[1] + hex3[1], 16), g: parseInt(hex3[2] + hex3[2], 16), b: parseInt(hex3[3] + hex3[3], 16) };
  const n256 = /^ansi256\((\d{1,3})\)$/.exec(value);
  if (n256) {
    const n = Number(n256[1]);
    return n < 16 ? palette2?.[n] : xterm256(n);
  }
  if (value.startsWith("ansi:")) {
    const m = /^([a-z]+?)(Bright)?$/.exec(value.slice(5));
    const index = m ? ANSI_NAMES.indexOf(m[1]) : -1;
    return index < 0 ? void 0 : palette2?.[index + (m[2] ? 8 : 0)];
  }
  return void 0;
}
function isClaudeColor(value) {
  return parseClaudeColor(value, Array(16).fill({ r: 0, g: 0, b: 0 })) !== void 0;
}
function parseClaudeCustomTheme(json) {
  let value = json;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return void 0;
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
  const raw = value;
  const theme = { base: isBuiltin(raw.base) ? raw.base : "dark", overrides: {} };
  if (typeof raw.name === "string") theme.name = raw.name;
  if (typeof raw.overrides === "object" && raw.overrides !== null) {
    for (const [key, v] of Object.entries(raw.overrides)) if (isClaudeColor(v)) theme.overrides[key] = v;
  }
  return theme;
}
function claudeCustomThemePath(theme, claudeConfigDir) {
  const slug = theme?.startsWith("custom:") ? theme.slice(7) : void 0;
  if (!slug || slug.includes(":") || slug.includes("/") || slug.startsWith(".")) return void 0;
  return `${claudeConfigDir.replace(/\/+$/, "")}/themes/${slug}.json`;
}
function resolveClaudeTheme(theme, customTheme, terminal) {
  if (isBuiltin(theme)) return theme;
  if (theme === "auto") return terminal?.background && !isDark(terminal.background) ? "light" : "dark";
  if (theme?.startsWith("custom:")) {
    const base = parseClaudeCustomTheme(customTheme)?.base;
    if (isBuiltin(base)) return base;
  }
  return "dark";
}
function claudeThemeScheme(theme, customTheme, terminal) {
  return resolveClaudeTheme(theme, customTheme, terminal).startsWith("light") ? "light" : "dark";
}
function claudeThemeInk(theme, customTheme, terminal) {
  const override = theme?.startsWith("custom:") ? parseClaudeCustomTheme(customTheme)?.overrides?.text : void 0;
  const value = override ?? CLAUDE_THEME_TEXT[resolveClaudeTheme(theme, customTheme, terminal)];
  return parseClaudeColor(value, terminal?.palette);
}
function chooseInk(sources) {
  const { theme, customTheme, terminal } = sources;
  const fromTheme = () => sources.themeInk ?? (theme === void 0 ? void 0 : claudeThemeInk(theme, customTheme, terminal));
  const fromTerminal = () => terminal?.foreground;
  let ink;
  if (sources.prefer === "theme") ink = fromTheme() ?? fromTerminal();
  else if (sources.prefer === "terminal") ink = fromTerminal() ?? fromTheme();
  else {
    const override = theme?.startsWith("custom:") ? parseClaudeCustomTheme(customTheme)?.overrides?.text : void 0;
    ink = sources.themeInk ?? (override === void 0 ? void 0 : parseClaudeColor(override, terminal?.palette)) ?? fromTerminal() ?? fromTheme();
  }
  return ink ?? (claudeThemeScheme(theme, customTheme, terminal) === "light" ? { r: 34, g: 34, b: 34 } : { r: 230, g: 230, b: 230 });
}
// core/src/terminal/detect.ts
function detectTerminal(env) {
  const multiplexer = detectMultiplexer(env);
  const kind = detectKind(env);
  const forced = isSet(env.CLAUDE_CODE_FORCE_TERMINAL_IMAGES);
  const background = env.CLAUDE_CODE_SESSION_KIND === "bg";
  const images = forced || !background && multiplexer === void 0 && (kind === "kitty" || kind === "ghostty");
  const info = { kind, images, multiplexed: multiplexer !== void 0 };
  if (multiplexer) info.multiplexer = multiplexer;
  if (isSet(env.SSH_CONNECTION) || isSet(env.SSH_CLIENT) || isSet(env.SSH_TTY)) info.ssh = true;
  return info;
}
function detectKind(env) {
  const term = env.TERM ?? "";
  if (term === "xterm-ghostty") return "ghostty";
  if (term.includes("kitty")) return "kitty";
  switch (env.TERM_PROGRAM) {
    case "ghostty":
      return "ghostty";
    case "kitty":
      return "kitty";
    case "WezTerm":
      return "wezterm";
    case "iTerm.app":
      return "iterm2";
  }
  if (term === "wezterm") return "wezterm";
  if (env.LC_TERMINAL === "iTerm2") return "iterm2";
  if (isSet(env.KITTY_WINDOW_ID) || isSet(env.KITTY_PID)) return "kitty";
  if (isSet(env.GHOSTTY_RESOURCES_DIR) || isSet(env.GHOSTTY_BIN_DIR)) return "ghostty";
  if (isSet(env.WEZTERM_PANE) || isSet(env.WEZTERM_EXECUTABLE)) return "wezterm";
  if (isSet(env.ITERM_SESSION_ID)) return "iterm2";
  return "other";
}
function detectMultiplexer(env) {
  const term = env.TERM ?? "";
  if (isSet(env.TMUX) || env.TERM_PROGRAM === "tmux" || /^tmux(-|$)/.test(term)) return "tmux";
  if (isSet(env.STY) || /^screen(\.|-|$)/.test(term)) return "screen";
  if (isSet(env.ZELLIJ) || isSet(env.ZELLIJ_SESSION_NAME)) return "zellij";
  return void 0;
}
function isSet(value) {
  return value !== void 0 && value !== "";
}
// core/src/terminal/index.ts
function colorProbes(terminal, options3 = {}) {
  if (terminal.ssh) return [];
  const env = options3.env ?? {};
  switch (terminal.kind) {
    case "kitty":
      return kittyColorProbes(env, options3.scheme);
    case "ghostty":
      return ghosttyColorProbes(env, options3.scheme);
    default:
      return [];
  }
}
function drawsEmojiSequences(terminal, colors) {
  if (terminal.ssh || terminal.multiplexed) return false;
  if (terminal.kind === "kitty") return true;
  return terminal.kind === "ghostty" && colors?.graphemeWidth !== "legacy";
}
async function readTerminalColors(terminal, read, options3) {
  if (terminal.ssh) return void 0;
  switch (terminal.kind) {
    case "kitty":
      return readKittyColors(read, options3);
    case "ghostty":
      return readGhosttyColors(read, options3);
    default:
      return void 0;
  }
}
function imageInkBackground(kind, colors, platform) {
  if (kind === "ghostty") return colors?.alphaBlending === "linear-corrected" ? colors.background : void 0;
  if (kind !== "kitty" || !colors) return void 0;
  return colors.textComposition === "legacy" || imageInkCurve(kind, colors, platform) ? colors.background : void 0;
}
function imageInkCurve(kind, colors, platform) {
  if (kind !== "kitty" || !colors || colors.textComposition === "legacy") return void 0;
  const strategy = colors.textComposition ?? "platform";
  const curve = strategy === "platform" ? platform === "darwin" ? { gamma: 1.7, contrast: 30 } : void 0 : strategy;
  return curve && (Math.abs(curve.gamma - 1) > 1e-6 || curve.contrast !== 0) ? curve : void 0;
}
// core/src/index.ts
var MAX_IMAGE_BYTES = 2 * 1024 * 1024;
function imageColumns(env) {
  return Math.max(1, Math.min(255, Math.floor(env.maxColumns), Math.floor(MAX_IMAGE_SIDE / env.cellWidth)));
}
var ready2;
function init() {
  return ready2 ??= initTypeset();
}
var typesetCache = /* @__PURE__ */ new Map();
var imageCache = /* @__PURE__ */ new Map();
function previewWidth(maxColumns) {
  return Math.max(1, Math.min(255, maxColumns) - 2);
}
function measureDisplay(tex, env) {
  let result;
  try {
    result = typesetDisplay(tex, env);
  } catch (error) {
    const form = error instanceof GlyphError ? previewForms(tex, previewWidth(env.maxColumns))[0] : void 0;
    if (form) return { columns: Math.max(1, Math.min(255, env.maxColumns)), rows: Math.min(255, form.lines.length), scale: 1 };
    throw error;
  }
  const box = measure(result, rasterOptions(env));
  if (box.scale < MIN_DISPLAY_SCALE) throw new TexError(tooSmall(box.scale));
  const forms = previewForms(tex, previewWidth(env.maxColumns));
  const reserved = forms.length === 0 || forms.some((form) => form.lines.length <= box.rows) ? box : measure(result, rasterOptions(env, Math.min(255, ...forms.map((form) => form.lines.length))));
  if (reserved.rows * env.cellHeight > MAX_IMAGE_SIDE) throw new TexError(TOO_LARGE);
  return reserved;
}
function tooSmall(scale2) {
  return `formula too wide to draw legibly (it would be drawn at ${Math.round(scale2 * 100)}% size)`;
}
function renderDisplay(tex, env, minRows) {
  const key = [env.cellWidth, env.cellHeight, env.maxColumns, env.emPx, env.weight ?? "", minRows ?? 0, tex].join("\n");
  let image = remember(imageCache, key);
  if (!image) {
    const result = typesetDisplay(tex, env);
    const options3 = rasterOptions(env, minRows);
    const box = measure(result, options3);
    if (box.scale < MIN_DISPLAY_SCALE) throw new TexError(tooSmall(box.scale));
    if (box.columns * env.cellWidth * box.rows * env.cellHeight > MAX_PIXELS || box.rows * env.cellHeight > MAX_IMAGE_SIDE) throw new TexError(TOO_LARGE);
    const raster = rasterize(result, options3);
    const png = encodePng(raster, env.ink, env.inkOver, env.inkCurve);
    if (png.length > MAX_IMAGE_BYTES) throw new TexError(TOO_LARGE);
    image = store(imageCache, key, { columns: raster.columns, rows: raster.rows, scale: raster.scale, png });
  }
  return { ...image, png: recolorPng(image.png, env.ink, env.inkOver, env.inkCurve) };
}
function previewDisplay(tex, env, rows) {
  const result = previewForms(tex, env.maxColumns).find((form) => rows === void 0 || form.lines.length <= rows);
  if (!result) return null;
  if (rows === void 0 || result.lines.length === rows) return result.lines;
  const blank2 = " ".repeat(result.width);
  const above2 = Math.floor((rows - result.lines.length) / 2);
  return [...Array(above2).fill(blank2), ...result.lines, ...Array(rows - result.lines.length - above2).fill(blank2)];
}
function measureInline(tex, env, columns = 255) {
  let result;
  try {
    result = typesetInline(tex);
  } catch (error) {
    if (error instanceof TexError) return null;
    throw error;
  }
  return measureInlineResult(result, env, columns);
}
function measureInlineResult(result, env, columns = 255) {
  const options3 = inlineOptions(env, columns, "left");
  const box = measure(result, options3);
  if (box.scale < MIN_INLINE_SCALE) return null;
  const strict = measure(result, { ...options3, overflowPx: 0 });
  if (strict.scale < MIN_INLINE_SCALE && !clipsOnlyThinInk(result, options3)) return null;
  return box;
}
function clipsOnlyThinInk(result, options3) {
  const slack = Math.max(0, Math.ceil(options3.overflowPx ?? 0));
  const top = slack + Math.ceil(INK_EDGE);
  const placed = rasterize(result, options3);
  const tall = rasterize(result, {
    ...options3,
    emPx: options3.emPx * placed.scale,
    cellHeight: options3.cellHeight + top + slack,
    baselinePx: placed.baselinePx + top,
    minColumns: placed.columns,
    minScale: 0,
    overflowPx: 0
  });
  if (Math.abs(tall.scale - 1) > 1e-6) return false;
  const { alpha, widthPx, heightPx } = tall;
  for (let y = 0; y < heightPx; y++) {
    if (y >= top && y < heightPx - slack) continue;
    let run2 = 0;
    for (let x2 = 0; x2 < widthPx; x2++) {
      run2 = alpha[y * widthPx + x2] >= 64 ? run2 + 1 : 0;
      if (run2 > CLIPPED_RUN_PX) return false;
    }
  }
  return true;
}
function renderInline(tex, env, columns, place = "center") {
  const key = ["inline", env.cellWidth, env.cellHeight, env.emPx, env.weight ?? "", env.baselinePx, columns, place, tex].join("\n");
  let image = remember(imageCache, key);
  if (!image) {
    const drawn = drawInline(typesetInline(tex), env, columns, place);
    if (drawn.png.length > MAX_IMAGE_BYTES) throw new TexError(TOO_LARGE);
    image = store(imageCache, key, drawn);
  }
  return { ...image, png: recolorPng(image.png, env.ink, env.inkOver, env.inkCurve) };
}
function renderInlineResult(result, env, columns, place = "center") {
  return drawInline(result, env, columns, place);
}
function drawInline(result, env, columns, place) {
  const options3 = { ...inlineOptions(env, columns, "left"), minColumns: columns, inkPlace: place };
  const raster = rasterize(result, options3);
  const png = encodePng(raster, env.ink, env.inkOver, env.inkCurve);
  if (png.length > MAX_IMAGE_BYTES) throw new TexError(TOO_LARGE);
  return { columns: raster.columns, rows: raster.rows, scale: raster.scale, png };
}
function previewInline(tex, maxWidth, options3 = {}) {
  const result = unicodeFor(tex, options3.tight === false ? "inline" : "tight", maxWidth);
  return result && result.lines.length === 1 ? result.lines[0] : null;
}
function toBase64(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i2 = 0; i2 < bytes.length; i2 += 3) {
    const n = bytes[i2] << 16 | (bytes[i2 + 1] ?? 0) << 8 | (bytes[i2 + 2] ?? 0);
    out += alphabet[n >> 18 & 63] + alphabet[n >> 12 & 63];
    out += i2 + 1 < bytes.length ? alphabet[n >> 6 & 63] : "=";
    out += i2 + 2 < bytes.length ? alphabet[n & 63] : "=";
  }
  return out;
}
function typesetDisplay(tex, env) {
  if (tex.length > MAX_TEX_LENGTH) throw new TexError(`formula longer than ${MAX_TEX_LENGTH} characters`);
  const lineWidth = previewWidth(imageColumns(env)) * env.cellWidth / env.emPx;
  const key = `${lineWidth.toFixed(3)}
${tex}`;
  return remember(typesetCache, key) ?? store(typesetCache, key, typeset(tex, { display: true, lineWidth }));
}
function previewForms(tex, maxWidth) {
  return ["stacked", "compact", "lines"].flatMap((form) => unicodeFor(tex, form, maxWidth) ?? []);
}
var unicodeCache = /* @__PURE__ */ new Map();
function unicodeFor(tex, form, maxWidth) {
  if (tex.length > MAX_TEX_LENGTH) return null;
  const key = `${form}${maxWidth ?? ""}
${tex}`;
  if (unicodeCache.has(key)) return remember(unicodeCache, key) ?? null;
  const display = form === "stacked" || form === "compact";
  const breakLines = form !== "inline" && form !== "tight";
  let result;
  try {
    result = toUnicode(texToMathML2(tex, { display }), { display, maxWidth, compact: form === "compact", breakLines, tight: form === "tight" });
  } catch {
    result = null;
  }
  return store(unicodeCache, key, result);
}
function typesetInline(tex) {
  if (tex.length > MAX_TEX_LENGTH) throw new TexError(`formula longer than ${MAX_TEX_LENGTH} characters`);
  const key = `inline
${tex}`;
  return remember(typesetCache, key) ?? store(typesetCache, key, typeset(tex, { display: false }));
}
function inlineOptions(env, columns, align) {
  return {
    emPx: env.emPx,
    cellWidth: env.cellWidth,
    cellHeight: env.cellHeight,
    maxColumns: imageColumns({ cellWidth: env.cellWidth, maxColumns: columns }),
    align,
    minRows: 1,
    baselinePx: env.baselinePx,
    // Fitted to its ink, which renderInline places in its slot.
    centerInk: align === "left",
    minScale: MIN_INLINE_SCALE,
    overflowPx: Math.max(1, Math.round(env.cellHeight * INLINE_OVERFLOW)),
    ...env.weight !== void 0 ? { weight: env.weight } : {}
  };
}
function rasterOptions(env, minRows) {
  return {
    emPx: env.emPx,
    cellWidth: env.cellWidth,
    cellHeight: env.cellHeight,
    maxColumns: imageColumns(env),
    align: "center",
    minRows,
    ...env.weight !== void 0 ? { weight: env.weight } : {}
  };
}
function remember(cache, key) {
  const value = cache.get(key);
  if (value !== void 0) {
    cache.delete(key);
    cache.set(key, value);
  }
  return value;
}
function store(cache, key, value) {
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return value;
}
function pictureOptions(env, minRows) {
  const paper = { ink: env.ink, background: env.background ?? assumedBackground(env.ink) };
  return {
    emPx: env.emPx,
    cellWidth: env.cellWidth,
    cellHeight: env.cellHeight,
    // Never a side past MAX_IMAGE_SIDE pixels: at large cells, fewer columns and rows.
    maxColumns: imageColumns(env),
    maxRows: Math.max(1, Math.min(255, env.maxRows ?? MAX_PICTURE_ROWS, Math.floor(MAX_IMAGE_SIDE / env.cellHeight))),
    ...minRows !== void 0 ? { minRows } : {},
    ...env.weight !== void 0 ? { weight: env.weight } : {},
    ...env.inkOver ? { over: env.inkOver } : {},
    color: (color, line) => adaptColor(color, paper, line)
  };
}
function measurePicture2(picture, env) {
  const box = measurePicture(picture, pictureOptions(env));
  if (box.scale < MIN_PICTURE_SCALE) throw new TexError(`picture too large to draw legibly (it would be drawn at ${Math.round(box.scale * 100)}% size)`);
  return box;
}
function renderPicture(picture, env, minRows, density = 1) {
  const box = measurePicture(picture, pictureOptions(env, minRows));
  const d = Math.min(1, Math.max(0.1, density));
  const options3 = d === 1 ? pictureOptions(env, minRows) : { ...pictureOptions({ ...env, cellWidth: env.cellWidth * d, cellHeight: env.cellHeight * d, emPx: env.emPx * d }, box.rows), minColumns: box.columns };
  if (box.scale < MIN_PICTURE_SCALE) throw new TexError(`picture too large to draw legibly (it would be drawn at ${Math.round(box.scale * 100)}% size)`);
  if (box.columns * env.cellWidth * box.rows * env.cellHeight > MAX_PIXELS) throw new TexError("picture too large to draw");
  const raster = rasterizePicture(picture, options3);
  const png = encodePicturePng(raster);
  if (png.length > MAX_IMAGE_BYTES) throw new TexError("picture too large to send to the terminal");
  return { columns: raster.columns, rows: raster.rows, scale: raster.scale, png };
}
function texFormula(picture) {
  return pictureOutlines(picture);
}
function measureDisplayResult(result, env) {
  const box = measure(result, rasterOptions(env));
  if (box.scale < MIN_DISPLAY_SCALE) throw new TexError(tooSmall(box.scale));
  return box;
}
function renderDisplayResult(result, env, minRows) {
  const options3 = rasterOptions(env, minRows);
  const box = measure(result, options3);
  if (box.scale < MIN_DISPLAY_SCALE) throw new TexError(tooSmall(box.scale));
  if (box.columns * env.cellWidth * box.rows * env.cellHeight > MAX_PIXELS || box.rows * env.cellHeight > MAX_IMAGE_SIDE) throw new TexError(TOO_LARGE);
  const raster = rasterize(result, options3);
  const png = encodePng(raster, env.ink, env.inkOver, env.inkCurve);
  if (png.length > MAX_IMAGE_BYTES) throw new TexError(TOO_LARGE);
  return { columns: raster.columns, rows: raster.rows, scale: raster.scale, png };
}
export{MAX_IMAGE_BYTES,cellProbe,cellProbes,chooseInk,claudeCustomThemePath,claudeThemeInk,claudeThemeScheme,colorProbes,detectTerminal,drawsEmojiSequences,emPxForCell,fontCell,fontFileArgv,imageColumns,imageInkBackground,imageInkCurve,init,matchesFamily,mathEmPx,measureDisplay,measureDisplayResult,measureInline,measureInlineResult,measurePicture2,odArgv,parseFontFile,parseOd,previewDisplay,previewInline,previewWidth,readFontMetrics,readTerminalColors,renderDisplay,renderDisplayResult,renderInline,renderInlineResult,renderPicture,texFormula,textBaseline,textLayout,toBase64,toHex,toUnicode};
