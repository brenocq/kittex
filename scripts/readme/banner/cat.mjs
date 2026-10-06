// The kitty: a flat, rounded tuxedo kitten sitting on the ground, drawn in its
// own coordinates (origin on the ground under the middle of its body, y down,
// about 190 units tall), with the New Computer Modern integral sign as its tail.
// Kitten proportions: a big head and eyes on a small body.
//
// The parts that move carry classes the banner's stylesheet animates:
// `tail` (swishes around its root), `j1`…`j3` with `tip` and `flick` inside
// (the ∫ is cut at three joints up its stem, and each bends a little, so the
// upper tail curls behind the swish and flicks), `eye` and `lids`
// (blink), `ear-l` (twitches) and `pupils` (glance toward the formula).

/**
 * The fur follows the page: a true near-black on a light page; on GitHub's
 * dark page (where black would vanish) a soft charcoal with a lighter rim, so
 * the silhouette reads. `line` draws the folds inside the fur.
 */
export const FUR = {
  light: { fur: '#1c1d21', rim: '#3a3d45', line: '#4a4e57' },
  dark: { fur: '#2c3139', rim: '#5a6370', line: '#59626e' },
}

const C = {
  white: '#f8f6f1',
  pink: '#f2a5ad',
  nose: '#ec7f8a',
  iris: '#a6d15a',
  irisRim: '#6f9a2c',
  pupil: '#141414',
  mouth: '#3a2a2a',
  lid: '#c3c8cf',
}

/** Where the tail's root is, in cat units: the pivot it sways around. */
export const TAIL_ROOT = [51, -6]
/**
 * The tail's motion, in degrees (clockwise swings it away from the cat): the
 * whole tail swishes between `base`; each joint bends between `tip`, a little
 * later than the one below it (a wave up the tail), and flicks to `flick` and
 * back. The curl leans outward, so the hook never reaches back to the head.
 */
export const TAIL_MOTION = { base: [-2, 14], tip: [-1.5, 5.5], flick: [8, -1.5] }
/** The horizontal reach of the drawing (whiskers) either side of its middle, for layout. */
export const CAT_REACH = 84

const TAIL_HEIGHT = 80
const TAIL_THICKEN = 4.6 // extra stroke around the glyph, in units
const RIM = 2.2

// Whiskers: two a side, cubic curves starting on the cheeks.
const WHISKERS = [
  [[54, -101], [64, -104], [73, -106], [84, -109]],
  [[54, -94], [64, -95], [73, -96], [83, -97]],
]

/**
 * The cat as SVG markup. `integral` is the ∫ glyph `{ d, box: [x0, y0, x1, y1] }`
 * in font units with y up; `theme` picks the fur; `whisker` is the whiskers'
 * colour (they show against the page, so they follow it).
 */
export function cat({ integral, theme, whisker }) {
  const f = FUR[theme]
  const furred = `fill="${f.fur}" stroke="${f.rim}" stroke-width="${RIM}" stroke-linejoin="round"`

  // The tail: the ∫ outline about 80 units tall, its lower end tucked behind
  // the body and its upper hook curling away from the cat. It is cut into
  // segments at joints up the stem; each segment turns around the joint below
  // it, carried by the ones lower down, and a disc centred on each joint (the
  // same at every angle) closes the seam. Rims first, then the fur over them.
  const t = tailGeometry(integral)
  const glyph = (stroke, width) => `<path d="${integral.d}" transform="matrix(${r(t.s, 5)} 0 0 ${r(-t.s, 5)} ${r(t.x)} ${r(t.y)})" fill="${f.fur}" stroke="${stroke}" stroke-width="${r(width / t.s, 0)}" stroke-linejoin="round"/>`
  const layer = (stroke, width, rim) => {
    let markup = ''
    for (let k = t.joints.length; k >= 0; k--) {
      const segment = `<g clip-path="url(#tail-${k})">${glyph(stroke, width)}</g>`
      const above = k < t.joints.length ? `<g class="j${k + 1}"><g class="tip"><g class="flick">${markup}</g></g></g>` : ''
      const disc = k < t.joints.length ? `<circle cx="${r(t.joints[k].x)}" cy="${r(t.joints[k].y)}" r="${r(t.joints[k].halfWidth + rim)}" fill="${stroke}"/>` : ''
      markup = segment + above + disc
    }
    return markup
  }
  // Segment k lies between joint k-1 and joint k (y grows downward).
  const bands = [Infinity, ...t.joints.map(j => j.y), -Infinity]
  const clips = bands.slice(0, -1).map((lower, k) => {
    const y0 = Math.max(bands[k + 1] - 0.5, -300)
    const y1 = Math.min(lower + 0.5, 300)
    return `<clipPath id="tail-${k}"><rect x="-100" y="${r(y0)}" width="300" height="${r(y1 - y0)}"/></clipPath>`
  })
  const tail = `<defs>${clips.join('')}</defs><g class="tail">${layer(f.rim, TAIL_THICKEN + 2 * RIM, RIM)}${layer(f.fur, TAIL_THICKEN, 0)}</g>`

  const ear = (k, cls) => {
    const outer = `M${k * 64} -122 C${k * 66} -152 ${k * 64} -174 ${k * 57} -187 C${k * 54} -193 ${k * 48} -193 ${k * 44} -189 C${k * 34} -178 ${k * 22} -167 ${k * 10} -158 Z`
    const inner = `M${k * 55} -139 C${k * 56} -155 ${k * 55} -168 ${k * 52} -176 C${k * 51} -179 ${k * 48} -179 ${k * 46} -177 C${k * 40} -171 ${k * 33} -166 ${k * 26} -160 Z`
    return `<g class="${cls}"><path d="${outer}" ${furred}/><path d="${inner}" fill="${C.pink}"/></g>`
  }

  const body = [
    // A small pear of a body.
    `<path d="M-27 -76 C-39 -60 -48 -36 -48 -17 C-48 -5 -41 0 -31 0 L31 0 C41 0 48 -5 48 -17 C48 -36 39 -60 27 -76 Z" ${furred}/>`,
    // Haunch folds.
    `<path d="M-43 -8 C-45 -22 -40 -34 -30 -40 M43 -8 C45 -22 40 -34 30 -40" fill="none" stroke="${f.line}" stroke-width="2.4" stroke-linecap="round"/>`,
    // White shirt front.
    `<path d="M-17 -74 C-25 -56 -23 -36 -15 -24 C-8 -15 8 -15 15 -24 C23 -36 25 -56 17 -74 Z" fill="${C.white}"/>`,
    // White socks, rimmed in fur so they hold their shape on a white page.
    `<path d="M-27 -1 C-29 -12 -23 -18 -14.5 -18 C-6 -18 -1 -12 -2 -1 Z M27 -1 C29 -12 23 -18 14.5 -18 C6 -18 1 -12 2 -1 Z" fill="${C.white}" stroke="${f.fur}" stroke-width="2.4" stroke-linejoin="round"/>`,
    `<path d="M-18.5 -2.5 L-18.5 -7.5 M-10.5 -2.5 L-10.5 -7.5 M18.5 -2.5 L18.5 -7.5 M10.5 -2.5 L10.5 -7.5" stroke="#c4c2bc" stroke-width="2" stroke-linecap="round"/>`,
  ].join('')

  const eye = x =>
    `<circle cx="${x}" cy="-118" r="12.2" fill="${C.irisRim}"/><circle cx="${x}" cy="-118" r="11" fill="${C.iris}"/>` +
    `<ellipse cx="${x}" cy="-117" rx="6.4" ry="8.4" fill="${C.pupil}"/>` +
    `<circle cx="${x + 3.6}" cy="-122.6" r="3.6" fill="#fff"/><circle cx="${x - 3.8}" cy="-112.6" r="1.6" fill="#fff" opacity=".85"/>`

  const head = [
    // A big, soft head: flat-ish crown, full cheeks.
    `<path d="M0 -170 C40 -170 70 -154 73 -124 C76 -94 54 -70 0 -70 C-54 -70 -76 -94 -73 -124 C-70 -154 -40 -170 0 -170 Z" ${furred}/>`,
    // White blaze up the nose, muzzle and chin.
    `<path d="M0 -146 C3 -146 5 -136 8 -124 C10 -116 12 -110 13 -105 L-13 -105 C-12 -110 -10 -116 -8 -124 C-5 -136 -3 -146 0 -146 Z" fill="${C.white}"/>`,
    `<path d="M0 -105 C8 -113 28 -113 30 -98 C31 -88 24 -81 14 -80 C10 -74 -10 -74 -14 -80 C-24 -81 -31 -88 -30 -98 C-28 -113 -8 -113 0 -105 Z" fill="${C.white}"/>`,
    // Blush.
    `<ellipse cx="-47" cy="-97" rx="8.5" ry="5" fill="${C.pink}" opacity=".6"/><ellipse cx="47" cy="-97" rx="8.5" ry="5" fill="${C.pink}" opacity=".6"/>`,
    // Eyes: green irises, round kitten pupils, highlights.
    `<g class="eye"><g class="pupils">${eye(-29)}${eye(29)}</g></g>`,
    // Closed lids, shown only mid-blink.
    `<path class="lids" d="M-40 -119 Q-29 -110 -18 -119 M18 -119 Q29 -110 40 -119" fill="none" stroke="${C.lid}" stroke-width="2.8" stroke-linecap="round" opacity="0"/>`,
    // Nose and mouth.
    `<path d="M-5.2 -103.6 C-5.2 -106 5.2 -106 5.2 -103.6 C5.2 -101.6 1.8 -98.6 0 -98.6 C-1.8 -98.6 -5.2 -101.6 -5.2 -103.6 Z" fill="${C.nose}"/>`,
    `<path d="M0 -98.6 L0 -95 M-7.5 -93.5 C-5.5 -90.5 -1 -90.5 0 -95 C1 -90.5 5.5 -90.5 7.5 -93.5" fill="none" stroke="${C.mouth}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].join('')

  const curves = WHISKERS.flatMap(w => [w, w.map(([x, y]) => [-x, y])])
  const whiskers = `<path d="${curves.map(([a, b, c, d]) => `M${a.join(' ')}C${[b, c, d].map(p => p.join(' ')).join(' ')}`).join('')}" fill="none" stroke="${whisker}" stroke-width="1.6" stroke-linecap="round"/>`

  return `${tail}${body}${ear(-1, 'ear-l')}${ear(1, 'ear-r')}${head}${whiskers}`
}

/** The joints, as fractions of the tail's height from the ground: the tail bends at each. */
export const JOINTS = [0.4, 0.56, 0.72]

/**
 * Where the ∫ goes (its lower-left terminal at the tail's root, behind the
 * body), and its joints: points on the stem's centre line with the stem's half
 * width there, thickening included. `outline` is the glyph's outline as
 * points in cat units.
 */
export function tailGeometry(integral) {
  const [gx0, gy0, , gy1] = integral.box
  const s = TAIL_HEIGHT / (gy1 - gy0)
  const x = TAIL_ROOT[0] - 6 - gx0 * s
  const y = TAIL_ROOT[1] + 5 + gy0 * s
  const outline = flattenOutline(integral.d).map(([px, py]) => [x + px * s, y - py * s])
  const joints = JOINTS.map(fraction => {
    // The stem crosses the joint's height twice (its two edges): the joint is between them.
    const jy = y - (gy0 + fraction * (gy1 - gy0)) * s
    const crossings = []
    for (let i = 0; i + 1 < outline.length; i++) {
      const [ax, ay] = outline[i]
      const [bx, by] = outline[i + 1]
      if (ay === by || (ay - jy) * (by - jy) > 0) continue
      crossings.push(ax + ((jy - ay) / (by - ay)) * (bx - ax))
    }
    if (crossings.length !== 2) throw new Error(`a tail joint should cross the stem twice, not ${crossings.length} times`)
    const [left, right] = crossings.sort((a, b) => a - b)
    return { x: (left + right) / 2, y: jy, halfWidth: (right - left) / 2 + TAIL_THICKEN / 2 }
  })
  return { s, x, y, outline, joints }
}

/** The glyph's outline (absolute M, L, C and Z only, as MathJax's fonts write them) as points in font units. */
function flattenOutline(d) {
  const points = []
  let cur = [0, 0]
  for (const [, op, args] of d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
    const n = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number)
    if (op === 'M' || op === 'L') for (let i = 0; i < n.length; i += 2) points.push((cur = [n[i], n[i + 1]]))
    if (op === 'C') {
      for (let i = 0; i < n.length; i += 6) {
        const [a, b, c, e] = [cur, [n[i], n[i + 1]], [n[i + 2], n[i + 3]], [n[i + 4], n[i + 5]]]
        for (let k = 1; k <= 12; k++) {
          const u = k / 12
          const w = [(1 - u) ** 3, 3 * u * (1 - u) ** 2, 3 * u * u * (1 - u), u ** 3]
          points.push([w[0] * a[0] + w[1] * b[0] + w[2] * c[0] + w[3] * e[0], w[0] * a[1] + w[1] * b[1] + w[2] * c[1] + w[3] * e[1]])
        }
        cur = e
      }
    }
  }
  return points
}

/**
 * Over every pose the tail can take (any swish angle, any curl of the hook):
 * the closest it comes to a whisker and to the head, and how far right it
 * reaches, in cat units, its thickness included. The banner refuses to build
 * if it would touch any of them or the wordmark.
 */
export function tailReach(integral) {
  const t = tailGeometry(integral)
  const whisker = []
  for (const [a, b, c, d] of WHISKERS) {
    for (let k = 0; k <= 24; k++) {
      const u = k / 24
      const w = [(1 - u) ** 3, 3 * u * (1 - u) ** 2, 3 * u * u * (1 - u), u ** 3]
      whisker.push([w[0] * a[0] + w[1] * b[0] + w[2] * c[0] + w[3] * d[0], w[0] * a[1] + w[1] * b[1] + w[2] * c[1] + w[3] * d[1]])
    }
  }
  const rotate = ([x, y], c, deg) => {
    const [cx, cy] = Array.isArray(c) ? c : [c.x, c.y]
    const a = (deg * Math.PI) / 180
    return [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]
  }
  const { base, tip, flick } = TAIL_MOTION
  const tipRange = [tip[0] + Math.min(0, ...flick), tip[1] + Math.max(0, ...flick)]
  const pad = TAIL_THICKEN / 2 + RIM
  let closest = Infinity
  let head = Infinity
  let right = -Infinity
  for (let b = base[0]; b <= base[1]; b += 1) {
    for (let k = tipRange[0]; k <= tipRange[1]; k += 1) {
      for (const p of t.outline) {
        let q = p
        for (let j = t.joints.length - 1; j >= 0; j--) if (p[1] < t.joints[j].y) q = rotate(q, t.joints[j], k)
        const [x, y] = rotate(q, TAIL_ROOT, b)
        right = Math.max(right, x + pad)
        // The head is close to an ellipse 146 by 100 around (0, -120).
        if (y < -66) head = Math.min(head, (Math.hypot(x / 73, (y + 120) / 50) - 1) * 50 - pad)
        for (const [wx, wy] of whisker) closest = Math.min(closest, Math.hypot(x - wx, y - wy) - pad)
      }
    }
  }
  return { whiskers: closest, head, right }
}

function r(n, digits = 2) {
  const f = 10 ** digits
  return String(Math.round(n * f) / f)
}
