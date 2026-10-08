// The kitty: a flat, rounded kitten sitting on the ground, drawn in its own
// coordinates (origin on the ground under the middle of its body, y down,
// about 190 units tall), with the New Computer Modern integral sign as its tail.
// Kitten proportions: a big head and eyes on a small body.
//
// Its coat is the author's cat's: a brown-grey mackerel tabby with white
// below, marked as she is (sides as the viewer sees them): an M on the
// forehead, dark-rimmed eyes, a white blaze over the nose bridge rising to a
// point between the eyes, the white muzzle reaching out under the right eye
// while the left cheek stays tabby down to the mouth; a white chest, belly,
// legs and paws, the darker tabby of the right flank biting into the belly;
// and a ringed tabby tail, dark towards its end, with a white tip.
//
// The parts that move carry classes the banner's stylesheet animates:
// `tail` (swishes around its root), `j1`…`j3` with `tip` and `flick` inside
// (the ∫ is cut at three joints up its stem, and each bends a little, so the
// upper tail curls behind the swish and flicks), `eye` and `lids`
// (blink), `ear-l` (twitches) and `pupils` (glance toward the formula).

/**
 * The colours that follow the page, as CSS custom properties. The tabby is a
 * warm brown-grey that reads on both pages (`fur` on the head and tail,
 * `flank` a shade darker on the body); `rim` outlines the head and body, so
 * the white parts hold their shape on a white page; `stripe` draws the tabby's
 * stripes and rings and `line` the folds in the fur. The tail's dark end
 * (`tail`) is a true near-black on a light page and, on GitHub's dark page
 * (where black would vanish), a soft charcoal with a lighter rim. `whisker`
 * shows against the page itself.
 */
export const CAT_THEMES = {
  light: { fur: '#796b5f', flank: '#594b40', rim: '#3d3229', stripe: '#2a211b', line: '#43382f', tail: '#211b17', 'tail-rim': '#3d3229', whisker: '#59636e' },
  dark: { fur: '#796b5f', flank: '#594b40', rim: '#3a3029', stripe: '#2a211b', line: '#43382f', tail: '#2e2a28', 'tail-rim': '#625a55', whisker: '#8b949e' },
}

/**
 * The classes that paint with those colours (presentation attributes cannot
 * take var()): fur filled and rimmed, fur, flank or rim alone, stripes and
 * folds, and the tail's dark end and its rim as fill or stroke.
 */
export const CAT_CSS = [
  `.fr{fill:var(--fur);stroke:var(--rim)}.ff{fill:var(--fur)}.fs{stroke:var(--fur)}.fl{fill:var(--flank)}.rf{fill:var(--rim)}.rs{stroke:var(--rim)}`,
  `.st{stroke:var(--stripe)}.ln{stroke:var(--line)}.wh{stroke:var(--whisker)}`,
  `.tf{fill:var(--tail)}.ts{stroke:var(--tail)}.trf{fill:var(--tail-rim)}.trs{stroke:var(--tail-rim)}`,
].join('')

const C = {
  white: '#f8f6f1',
  shade: '#cdc7bf', // creases in the white fur
  pink: '#efa3a8',
  bean: '#e58f98',
  nose: '#e9939b',
  iris: '#c2b84a',
  irisRim: '#221b16',
  pupil: '#141414',
  mouth: '#3a2a2a',
  lid: '#2f2b27',
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

const HEAD = 'M0 -170 C40 -170 70 -154 73 -124 C76 -94 54 -70 0 -70 C-54 -70 -76 -94 -73 -124 C-70 -154 -40 -170 0 -170 Z'
const BODY = 'M-27 -76 C-39 -60 -48 -36 -48 -17 C-48 -5 -41 0 -31 0 L31 0 C41 0 48 -5 48 -17 C48 -36 39 -60 27 -76 Z'

/**
 * The cat as SVG markup. `integral` is the ∫ glyph `{ d, box: [x0, y0, x1, y1] }`
 * in font units with y up. Colours that follow the page are classes from
 * CAT_CSS, painted by the custom properties in CAT_THEMES. `id` prefixes the
 * clip paths' ids, for pages that hold more than one cat.
 */
export function cat({ integral, id = 'cat' }) {
  const furred = `class="fr" stroke-width="${RIM}" stroke-linejoin="round"`
  const outline = d => `<path d="${d}" class="rs" fill="none" stroke-width="${RIM}" stroke-linejoin="round"/>`
  const stripes = (d, width) => `<path d="${d}" class="st" fill="none" stroke-width="${width}" stroke-linecap="round"/>`

  // The tail: the ∫ outline about 80 units tall, its lower end tucked behind
  // the body and its upper hook curling away from the cat. It is cut into
  // segments at joints up the stem; each segment turns around the joint below
  // it, carried by the ones lower down, and a disc centred on each joint (the
  // same at every angle) closes the seam. Rims first, then the fur over them.
  // It is a tabby tail: dark rings up the stem, and dark from the last joint
  // to the end of the hook, with a white dot at the very tip.
  const t = tailGeometry(integral)
  const last = t.joints.length
  const place = `d="${integral.d}" transform="matrix(${r(t.s, 5)} 0 0 ${r(-t.s, 5)} ${r(t.x)} ${r(t.y)})"`
  const glyph = (cls, width) => `<path class="${cls}" ${place} stroke-width="${r(width / t.s, 0)}" stroke-linejoin="round"/>`
  const [tipX, tipY, tipR] = t.tip
  const whiteTip = `<circle cx="${r(tipX)}" cy="${r(tipY)}" r="${r(tipR + 1.4)}" class="ts" fill="${C.white}" stroke-width="2.4"/>`
  // The rings, square to the stem, kept to the tail's shape by a mask (it
  // rides with each segment, so the rings bend with the tail).
  const ringsOn = k => {
    const lines = t.rings.filter(ring => ring.segment === k).map(({ x, y, halfWidth, normal: [nx, ny] }) => {
      const h = halfWidth + 2
      return `M${r(x - nx * h)} ${r(y - ny * h)}L${r(x + nx * h)} ${r(y + ny * h)}`
    })
    return lines.length ? `<path d="${lines.join('')}" class="st" stroke-width="3.6" mask="url(#${id}-tail-shape)"/>` : ''
  }
  // `rim` is the rim layer (drawn first and wider) or 0 for the fur over it.
  const layer = (width, rim) => {
    let markup = ''
    for (let k = last; k >= 0; k--) {
      const dark = k === last
      const cls = rim ? (dark ? 'tf trs' : 'ff rs') : dark ? 'tf ts' : 'ff fs'
      let segment = `<g clip-path="url(#${id}-tail-${k})">${glyph(cls, width)}${rim ? '' : ringsOn(k)}</g>`
      if (dark && rim === 0) segment += whiteTip
      const above = k < last ? `<g class="j${k + 1}"><g class="tip"><g class="flick">${markup}</g></g></g>` : ''
      const discClass = rim ? (k === last - 1 ? 'trf' : 'rf') : k === last - 1 ? 'tf' : 'ff'
      const disc = k < last ? `<circle cx="${r(t.joints[k].x)}" cy="${r(t.joints[k].y)}" r="${r(t.joints[k].halfWidth + rim)}" class="${discClass}"/>` : ''
      markup = segment + above + disc
    }
    return markup
  }
  // Segment k lies between joint k-1 and joint k (y grows downward).
  const bands = [Infinity, ...t.joints.map(j => j.y), -Infinity]
  const clips = bands.slice(0, -1).map((lower, k) => {
    const y0 = Math.max(bands[k + 1] - 0.5, -300)
    const y1 = Math.min(lower + 0.5, 300)
    return `<clipPath id="${id}-tail-${k}"><rect x="-100" y="${r(y0)}" width="300" height="${r(y1 - y0)}"/></clipPath>`
  })
  clips.push(`<clipPath id="${id}-head"><path d="${HEAD}"/></clipPath>`, `<clipPath id="${id}-body"><path d="${BODY}"/></clipPath>`)
  const mask = `<mask id="${id}-tail-shape" maskUnits="userSpaceOnUse" x="-100" y="-300" width="400" height="400"><path ${place} fill="#fff" stroke="#fff" stroke-width="${r(TAIL_THICKEN / t.s, 0)}" stroke-linejoin="round"/></mask>`
  const tail = `<defs>${clips.join('')}${mask}</defs><g class="tail">${layer(TAIL_THICKEN + 2 * RIM, RIM)}${layer(TAIL_THICKEN, 0)}</g>`

  const ear = (k, cls) => {
    const outer = `M${k * 64} -122 C${k * 66} -152 ${k * 64} -174 ${k * 57} -187 C${k * 54} -193 ${k * 48} -193 ${k * 44} -189 C${k * 34} -178 ${k * 22} -167 ${k * 10} -158 Z`
    const inner = `M${k * 55} -139 C${k * 56} -155 ${k * 55} -168 ${k * 52} -176 C${k * 51} -179 ${k * 48} -179 ${k * 46} -177 C${k * 40} -171 ${k * 33} -166 ${k * 26} -160 Z`
    return `<g class="${cls}"><path d="${outer}" ${furred}/><path d="${inner}" fill="${C.pink}"/></g>`
  }

  // The body: tabby sides with mackerel stripes, then the white front over
  // them (chest, belly and front legs; the right side's tabby bites into the
  // belly), the white haunches and back feet, and the outline on top.
  const body = [
    `<path d="${BODY}" class="fl"/>`,
    `<g clip-path="url(#${id}-body)">`,
    stripes('M-47 -58 C-41 -56 -35 -53 -29 -48 M-49 -52 C-44 -50 -39 -47 -33 -42 M-51 -36 C-45 -34 -39 -31 -34 -26 M-51 -21 C-46 -19 -42 -16 -38 -12 M47 -58 C41 -56 34 -52 28 -47 M50 -43 C42 -41 33 -38 24 -36 M50 -28 C44 -26 38 -23 33 -18', 3.2),
    // Haunch folds.
    `<path d="M-43 -8 C-45 -22 -40 -34 -30 -40 M43 -8 C45 -22 40 -34 30 -40" class="ln" fill="none" stroke-width="2.4" stroke-linecap="round"/>`,
    `<path d="M-26 -82 L24 -82 C29 -68 30 -58 27 -51 C22 -45 15 -42 15 -33 C15 -24 22 -17 30 -11 L31 2 L-29 2 C-30 -12 -32 -28 -31 -42 C-30 -56 -26 -68 -22 -82 Z" fill="${C.white}"/>`,
    `<path d="M-50 2 C-50 -9 -45 -19 -36 -21 C-31 -22 -28 -16 -28 2 Z M48 2 C49 -7 44 -15 37 -16 C31 -17 28 -10 28 2 Z" fill="${C.white}"/>`,
    `<ellipse cx="-40" cy="-3.4" rx="3.4" ry="2.3" fill="${C.bean}"/><ellipse cx="40" cy="-3.4" rx="3.4" ry="2.3" fill="${C.bean}"/>`,
    `</g>`,
    outline(BODY),
    // The front paws, outlined softly on the white legs, the legs parted by a crease.
    `<path d="M0 -46 L0 -17" stroke="${C.shade}" stroke-width="1.8" stroke-linecap="round"/>`,
    `<path d="M-27 -1 C-29 -12 -23 -18 -14.5 -18 C-6 -18 -1 -12 -2 -1 Z M27 -1 C29 -12 23 -18 14.5 -18 C6 -18 1 -12 2 -1 Z" fill="${C.white}" stroke="${C.shade}" stroke-width="1.8" stroke-linejoin="round"/>`,
    `<path d="M-18.5 -2.5 L-18.5 -7.5 M-10.5 -2.5 L-10.5 -7.5 M18.5 -2.5 L18.5 -7.5 M10.5 -2.5 L10.5 -7.5" stroke="${C.shade}" stroke-width="2" stroke-linecap="round"/>`,
    outline('M-31 0 L31 0'),
  ].join('')

  const eye = x =>
    `<circle cx="${x}" cy="-118" r="13" fill="${C.irisRim}"/><circle cx="${x}" cy="-118" r="10.6" fill="${C.iris}"/>` +
    `<ellipse cx="${x}" cy="-117" rx="6.2" ry="8.2" fill="${C.pupil}"/>` +
    `<circle cx="${x + 3.6}" cy="-122.6" r="3.6" fill="#fff"/><circle cx="${x - 3.8}" cy="-112.6" r="1.6" fill="#fff" opacity=".85"/>`

  const head = [
    // A big, soft head: flat-ish crown, full cheeks.
    `<path d="${HEAD}" class="ff"/>`,
    `<g clip-path="url(#${id}-head)">`,
    // Tabby stripes: an M of bars on the forehead converging on the blaze, and
    // dark lines sweeping back from the outer corners of the eyes.
    stripes('M-34 -163 Q-28 -153 -21 -144 M-20 -170 Q-14 -159 -6 -150 M-6 -172 Q-4 -162 -1 -153 M7 -172 Q7 -162 5 -153 M20 -170 Q15 -159 10 -150 M34 -163 Q28 -153 22 -144', 3),
    stripes('M-41 -116 C-50 -116 -58 -114 -68 -109 M-40 -103 C-47 -98 -55 -95 -66 -95 M-46 -86 C-51 -82 -56 -80 -64 -80 M41 -116 C50 -116 58 -114 68 -109 M47 -101 C54 -98 61 -97 70 -98', 3.4),
    // The white: a blaze filling the nose bridge between the eyes and rising
    // to a point, the muzzle and chin, reaching out under the right eye.
    `<path d="M2 -147 C6 -141 11 -133 13 -125 C15 -117 15 -108 19 -102 C28 -98 44 -98 56 -95 C62 -90 62 -80 56 -72 L40 -62 L-50 -62 C-44 -70 -36 -78 -26 -84 C-18 -89 -15 -95 -14 -102 C-13 -108 -13 -116 -12 -124 C-10 -133 -4 -141 2 -147 Z" fill="${C.white}"/>`,
    `</g>`,
    outline(HEAD),
    // Eyes: olive-amber irises ringed in black, round kitten pupils, highlights.
    `<g class="eye"><g class="pupils">${eye(-29)}${eye(29)}</g></g>`,
    // Closed lids, shown only mid-blink.
    `<path class="lids" d="M-40 -119 Q-29 -110 -18 -119 M18 -119 Q29 -110 40 -119" fill="none" stroke="${C.lid}" stroke-width="2.8" stroke-linecap="round" opacity="0"/>`,
    // Nose and mouth.
    `<path d="M-5.2 -103.6 C-5.2 -106 5.2 -106 5.2 -103.6 C5.2 -101.6 1.8 -98.6 0 -98.6 C-1.8 -98.6 -5.2 -101.6 -5.2 -103.6 Z" fill="${C.nose}"/>`,
    `<path d="M0 -98.6 L0 -95 M-7.5 -93.5 C-5.5 -90.5 -1 -90.5 0 -95 C1 -90.5 5.5 -90.5 7.5 -93.5" fill="none" stroke="${C.mouth}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].join('')

  const curves = WHISKERS.flatMap(w => [w, w.map(([x, y]) => [-x, y])])
  const whiskers = `<path d="${curves.map(([a, b, c, d]) => `M${a.join(' ')}C${[b, c, d].map(p => p.join(' ')).join(' ')}`).join('')}" class="wh" fill="none" stroke-width="1.6" stroke-linecap="round"/>`

  return `${tail}${body}${ear(-1, 'ear-l')}${ear(1, 'ear-r')}${head}${whiskers}`
}

/** The joints, as fractions of the tail's height from the ground: the tail bends at each. */
export const JOINTS = [0.4, 0.56, 0.72]
/** The tabby tail's dark rings, as fractions of its height; above the last joint it is dark to the tip. */
const RINGS = [0.17, 0.28, 0.48, 0.64]

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
  // A point on the stem's centre line at a fraction of the tail's height,
  // with the stem's half width there.
  const across = fraction => {
    // The stem crosses that height twice (its two edges): the point is between them.
    const jy = y - (gy0 + fraction * (gy1 - gy0)) * s
    const crossings = []
    for (let i = 0; i + 1 < outline.length; i++) {
      const [ax, ay] = outline[i]
      const [bx, by] = outline[i + 1]
      if (ay === by || (ay - jy) * (by - jy) > 0) continue
      crossings.push(ax + ((jy - ay) / (by - ay)) * (bx - ax))
    }
    if (crossings.length !== 2) throw new Error(`the tail at ${fraction} of its height should cross the stem twice, not ${crossings.length} times`)
    const [left, right] = crossings.sort((a, b) => a - b)
    return { x: (left + right) / 2, y: jy, halfWidth: (right - left) / 2 + TAIL_THICKEN / 2 }
  }
  const joints = JOINTS.map(across)
  // The rings: across the stem, square to its centre line there; `segment`
  // is the piece of the tail each lies on (segment k is above k joints).
  const rings = RINGS.map(fraction => {
    const c = across(fraction)
    const [a, b] = [across(fraction - 0.02), across(fraction + 0.02)]
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    const normal = [-(b.y - a.y) / length, (b.x - a.x) / length]
    return { ...c, normal, segment: JOINTS.filter(j => j < fraction).length }
  })
  // The upper terminal is a ball at the glyph's right end: from its rightmost
  // point, across to its left side at the same height.
  const glyphPoints = flattenOutline(integral.d)
  const [xr, yr] = glyphPoints.reduce((a, b) => (b[0] > a[0] ? b : a))
  const xl = Math.min(...glyphPoints.filter(([px, py]) => Math.abs(py - yr) < 8 && px > xr - 150).map(([px]) => px))
  const ball = (xr - xl) / 2
  if (!(ball > 25 && ball < 80)) throw new Error(`the ∫'s upper terminal is not where it should be (radius ${ball})`)
  const tip = [x + (xr - ball) * s, y - yr * s, ball * s + TAIL_THICKEN / 2]
  return { s, x, y, outline, joints, rings, tip }
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
