// The kitty: a flat, rounded orange tabby sitting on the ground, drawn in its
// own coordinates (origin on the ground under the middle of its body, y down,
// about 180 units tall), with the New Computer Modern integral sign as its tail.
//
// The parts that move carry classes the banner's stylesheet animates:
// `tail` (sways around its root), `eye` and `lids` (blink), `ear-l`
// (twitches) and `pupils` (glance toward the formula).

export const CAT_COLORS = {
  fur: '#fe8019',
  shade: '#d65d0e',
  stripe: '#c24e0b',
  cream: '#fdf0d5',
  pink: '#f4a3a8',
  nose: '#e8737a',
  eye: '#2b211c',
  mouth: '#6b2f12',
}

/** Where the tail's root is, in cat units: the pivot it sways around. */
export const TAIL_ROOT = [56, -6]

/**
 * The cat as SVG markup. `integral` is the ∫ glyph `{ d, box: [x0, y0, x1, y1] }`
 * in font units with y up; `whisker` is the whiskers' colour (it shows against
 * the page background, so it follows the theme).
 */
export function cat({ integral, whisker }) {
  const c = CAT_COLORS

  // The tail: the ∫ outline, scaled to about 112 units tall, its lower end
  // tucked behind the body and its upper hook curling away from the cat.
  const [gx0, gy0, gx1, gy1] = integral.box
  const tailHeight = 116
  const s = tailHeight / (gy1 - gy0)
  // Lower terminal (left end of the glyph's bottom) at the root, behind the body.
  const tx = TAIL_ROOT[0] - 6 - gx0 * s
  const ty = TAIL_ROOT[1] + 5 + gy0 * s
  const tail = `<g class="tail"><path d="${integral.d}" transform="matrix(${r(s, 5)} 0 0 ${r(-s, 5)} ${r(tx)} ${r(ty)})" fill="${c.fur}" stroke="${c.fur}" stroke-width="${r(5 / s, 0)}" stroke-linejoin="round"/></g>`

  const ear = (side, cls) => {
    const k = side // -1 left, +1 right
    const outer = `M${k * 58} -118 C${k * 60} -146 ${k * 58} -166 ${k * 52} -178 C${k * 49} -184 ${k * 44} -184 ${k * 40} -180 C${k * 31} -170 ${k * 20} -160 ${k * 10} -150 Z`
    const inner = `M${k * 49} -134 C${k * 50} -150 ${k * 49} -162 ${k * 47} -170 C${k * 46} -173 ${k * 44} -173 ${k * 42} -171 C${k * 36} -164 ${k * 28} -156 ${k * 21} -148 Z`
    return `<g class="${cls}"><path d="${outer}" fill="${c.fur}"/><path d="${inner}" fill="${c.pink}"/></g>`
  }

  const body = [
    // Back and haunches: a pear that widens to the ground.
    `<path d="M-30 -86 C-44 -70 -56 -40 -56 -18 C-56 -6 -48 0 -36 0 L36 0 C48 0 56 -6 56 -18 C56 -40 44 -70 30 -86 Z" fill="${c.fur}"/>`,
    // Haunch lines.
    `<path d="M-51 -9 C-53 -27 -46 -42 -33 -48 M51 -9 C53 -27 46 -42 33 -48" fill="none" stroke="${c.shade}" stroke-width="3" stroke-linecap="round"/>`,
    // Shoulder stripes.
    `<path d="M-46 -64 C-41 -66 -37 -65 -34 -61 M-50 -52 C-46 -54 -43 -53 -41 -50 M46 -64 C41 -66 37 -65 34 -61 M50 -52 C46 -54 43 -53 41 -50" fill="none" stroke="${c.stripe}" stroke-width="3.2" stroke-linecap="round"/>`,
    // Cream bib.
    `<path d="M-20 -84 C-28 -64 -26 -40 -17 -27 C-9 -17 9 -17 17 -27 C26 -40 28 -64 20 -84 Z" fill="${c.cream}"/>`,
    // Front paws, with toes.
    `<path d="M-31 -.5 C-33 -14 -26 -21 -16.5 -21 C-7 -21 -1 -14 -2 -.5 Z M31 -.5 C33 -14 26 -21 16.5 -21 C7 -21 1 -14 2 -.5 Z" fill="${c.fur}" stroke="${c.shade}" stroke-width="2.4" stroke-linejoin="round"/>`,
    `<path d="M-21 -1.5 L-21 -7 M-12 -1.5 L-12 -7 M21 -1.5 L21 -7 M12 -1.5 L12 -7" stroke="${c.shade}" stroke-width="2.2" stroke-linecap="round"/>`,
  ].join('')

  const head = [
    // A wide, soft head: flat-ish crown, full cheeks.
    `<path d="M0 -164 C36 -164 62 -150 66 -122 C70 -94 50 -72 0 -72 C-50 -72 -70 -94 -66 -122 C-62 -150 -36 -164 0 -164 Z" fill="${c.fur}"/>`,
    // Forehead stripes.
    `<path d="M0 -162 L0 -148 M-12 -160 L-10 -150 M12 -160 L10 -150" stroke="${c.stripe}" stroke-width="3.6" stroke-linecap="round"/>`,
    // Cheek stripes.
    `<path d="M-66 -114 L-56 -113 M-65 -104 L-57 -105 M66 -114 L56 -113 M65 -104 L57 -105" stroke="${c.stripe}" stroke-width="3.2" stroke-linecap="round"/>`,
    // Muzzle.
    `<path d="M0 -99 C6 -106 22 -106 24 -94 C26 -82 14 -78 0 -84 C-14 -78 -26 -82 -24 -94 C-22 -106 -6 -106 0 -99 Z" fill="${c.cream}"/>`,
    // Blush.
    `<ellipse cx="-38" cy="-94" rx="8" ry="4.6" fill="${c.pink}" opacity=".75"/><ellipse cx="38" cy="-94" rx="8" ry="4.6" fill="${c.pink}" opacity=".75"/>`,
    // Eyes, each with a highlight.
    `<g class="eye"><g class="pupils">`,
    `<ellipse cx="-24" cy="-114" rx="7.6" ry="9.4" fill="${c.eye}"/><ellipse cx="24" cy="-114" rx="7.6" ry="9.4" fill="${c.eye}"/>`,
    `<circle cx="-21.4" cy="-117.6" r="2.8" fill="#fff"/><circle cx="26.6" cy="-117.6" r="2.8" fill="#fff"/>`,
    `<circle cx="-26" cy="-110" r="1.2" fill="#fff" opacity=".8"/><circle cx="22" cy="-110" r="1.2" fill="#fff" opacity=".8"/>`,
    `</g></g>`,
    // Closed lids, shown only mid-blink.
    `<path class="lids" d="M-32 -115 Q-24 -108 -16 -115 M16 -115 Q24 -108 32 -115" fill="none" stroke="${c.eye}" stroke-width="2.6" stroke-linecap="round" opacity="0"/>`,
    // Nose and mouth.
    `<path d="M-4.6 -98.4 C-4.6 -100.6 4.6 -100.6 4.6 -98.4 C4.6 -96.6 1.6 -94 0 -94 C-1.6 -94 -4.6 -96.6 -4.6 -98.4 Z" fill="${c.nose}"/>`,
    `<path d="M0 -94 L0 -91 M-7 -90 C-5 -87 -1 -87 0 -91 C1 -87 5 -87 7 -90" fill="none" stroke="${c.mouth}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].join('')

  // Whiskers: two a side, starting on the cheeks.
  const whiskers = `<path d="M-46 -100 C-58 -102 -68 -102 -80 -99 M-46 -94 C-58 -93 -68 -91 -78 -87 M46 -100 C58 -102 68 -102 80 -99 M46 -94 C58 -93 68 -91 78 -87" fill="none" stroke="${whisker}" stroke-width="1.6" stroke-linecap="round"/>`

  return `${tail}${body}${ear(-1, 'ear-l')}${ear(1, 'ear-r')}${head}${whiskers}`
}

function r(n, digits = 2) {
  const f = 10 ** digits
  return String(Math.round(n * f) / f)
}
