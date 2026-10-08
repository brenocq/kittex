import{u16,shft,wbits,hTree,clim,flt,fdt,hMap,flm,fdm,wbits16,fleb,fdeb,i32,u8,revfl,revfd,slc,PLTE_AT,SOLID,MAX_INKS,SOLID_COLOURS,MAX_LEVELS,FLATNESS,MIN_DASH_PERIOD,MAX_DASHES,SAME_POINT,NO_JOIN,ROUND_AS_BEVEL,ARC_FLATNESS,__kittexLate}from'./p31.js';export*from'./p31.js';
__kittexLate.et=()=>et;__kittexLate.ln=()=>ln;
var ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
  var s = c.length;
  while (s && !c[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c[0], cls = 1;
  var w = function(v) {
    cl[cli++] = v;
  };
  for (var i2 = 1; i2 <= s; ++i2) {
    if (c[i2] == cln && i2 != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c[i2];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};
var clen = function(cf, cl) {
  var l = 0;
  for (var i2 = 0; i2 < cl.length; ++i2)
    l += cf[i2] * cl[i2];
  return l;
};
var wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i2 = 0; i2 < s; ++i2)
    out[o + i2 + 4] = dat[i2];
  return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i2 = 0; i2 < lclt.length; ++i2)
    ++lcfreq[lclt[i2] & 31];
  for (var i2 = 0; i2 < lcdt.length; ++i2)
    ++lcfreq[lcdt[i2] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i2 = 0; i2 < nlcc; ++i2)
      wbits(out, p + 3 * i2, lct[clim[i2]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i2 = 0; i2 < clct.length; ++i2) {
        var len = clct[i2] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i2] >> 5 & 127), p += clct[i2] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i2 = 0; i2 < li; ++i2) {
    var sym = syms[i2];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i3) {
      return (dat[i3] ^ dat[i3 + 1] << bs1_1 ^ dat[i3 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i2 = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i2 + 2 < s; ++i2) {
      var hv = hsh(i2);
      var imod = i2 & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i2) {
        var rem = s - i2;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i2 - bs, pos);
          li = lc_1 = eb = 0, bs = i2;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i2 - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i2);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i2 + l] == dat[i2 + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i2 + nl] == dat[i2 + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i2 - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i2 + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i2];
          ++lf[dat[i2]];
        }
      }
    }
    for (i2 = Math.max(i2, wi); i2 < s; ++i2) {
      syms[li++] = dat[i2];
      ++lf[dat[i2]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i2 - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i2, st.w = wi;
    }
  } else {
    for (var i2 = st.w || 0; i2 < s + lst; i2 += 65535) {
      var e = i2 + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i2, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var adler = function() {
  var a = 1, b = 0;
  return {
    p: function(d) {
      var n = a, m = b;
      var l = d.length | 0;
      for (var i2 = 0; i2 != l; ) {
        var e = Math.min(i2 + 2655, l);
        for (; i2 < e; ++i2)
          m += n += d[i2];
        n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
      }
      a = n, b = m;
    },
    d: function() {
      a %= 65521, b %= 65521;
      return (a & 255) << 24 | (a & 65280) << 8 | (b & 255) << 8 | b >> 8;
    }
  };
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var wbytes = function(d, b, v) {
  for (; v; ++b)
    d[b] = v, v >>>= 8;
};
var zlh = function(c, o) {
  var lv = o.level, fl2 = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
  c[0] = 120, c[1] = fl2 << 6 | (o.dictionary && 32);
  c[1] |= 31 - (c[0] << 8 | c[1]) % 31;
  if (o.dictionary) {
    var h = adler();
    h.p(o.dictionary);
    wbytes(c, 2, h.d());
  }
};
function zlibSync(data, opts) {
  if (!opts)
    opts = {};
  var a = adler();
  a.p(data);
  var d = dopt(data, opts, opts.dictionary ? 6 : 2, 4);
  return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
// core/src/raster/png.ts
var SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
var TRNS_AT = PLTE_AT + 12 + 768;
function encodeAlphaPng(alpha, width, height2, ink, over, curve) {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height2);
  ihdr.set([8, 3, 0, 0, 0], 8);
  return concat2([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("PLTE", palette(ink)),
    chunk("tRNS", alphaTable(ink, over, curve)),
    chunk("IDAT", zlibSync(filter(alpha, width, height2), { level: 6 })),
    chunk("IEND", new Uint8Array(0))
  ]);
}
function encodeQuantizedPng(rgba, width, height2) {
  const n = width * height2;
  const pairs3 = /* @__PURE__ */ new Map();
  const weight = /* @__PURE__ */ new Map();
  for (let i2 = 0; i2 < n; i2++) {
    const a = rgba[4 * i2 + 3];
    if (a === 0) continue;
    const rgb = rgba[4 * i2] << 16 | rgba[4 * i2 + 1] << 8 | rgba[4 * i2 + 2];
    if (pairs3.size <= 256) pairs3.set(rgb * 256 + a, 0);
    weight.set(rgb, (weight.get(rgb) ?? 0) + a);
  }
  const index = new Uint8Array(n);
  let plte = [0, 0, 0];
  let trns = [0];
  if (pairs3.size <= 255) {
    const slot = /* @__PURE__ */ new Map();
    for (const key of pairs3.keys()) {
      slot.set(key, slot.size + 1);
      const rgb = Math.floor(key / 256);
      plte.push(rgb >> 16 & 255, rgb >> 8 & 255, rgb & 255);
      trns.push(key % 256);
    }
    for (let i2 = 0; i2 < n; i2++) {
      const a = rgba[4 * i2 + 3];
      if (a === 0) continue;
      const rgb = rgba[4 * i2] << 16 | rgba[4 * i2 + 1] << 8 | rgba[4 * i2 + 2];
      index[i2] = slot.get(rgb * 256 + a);
    }
  } else {
    const solidWeight = /* @__PURE__ */ new Map();
    for (let i2 = 0; i2 < n; i2++) {
      if (rgba[4 * i2 + 3] < SOLID) continue;
      const rgb = rgba[4 * i2] << 16 | rgba[4 * i2 + 1] << 8 | rgba[4 * i2 + 2];
      solidWeight.set(rgb, (solidWeight.get(rgb) ?? 0) + 1);
    }
    const pick2 = (weights, most, apart) => {
      const chosen = [];
      for (const [rgb] of [...weights].sort((a, b) => b[1] - a[1])) {
        const c = [rgb >> 16 & 255, rgb >> 8 & 255, rgb & 255];
        if (chosen.every((one) => distance(one, c) > apart)) chosen.push(c);
        if (chosen.length >= most) break;
      }
      return chosen;
    };
    const inks = pick2(weight, MAX_INKS, INK_DISTANCE);
    const solids = pick2(solidWeight, SOLID_COLOURS, SOLID_DISTANCE);
    const levels = Math.min(MAX_LEVELS, Math.floor((255 - solids.length) / inks.length));
    plte = [0, 0, 0];
    trns = [0];
    for (const ink of inks) {
      for (let l = 1; l <= levels; l++) {
        plte.push(...ink);
        trns.push(Math.round(255 * l / levels));
      }
    }
    const solidAt = plte.length / 3;
    for (const solid of solids) {
      plte.push(...solid);
      trns.push(255);
    }
    const nearest = (set, memo, rgb) => {
      let k = memo.get(rgb);
      if (k === void 0) {
        const c = [rgb >> 16 & 255, rgb >> 8 & 255, rgb & 255];
        k = 0;
        for (let j = 1; j < set.length; j++) if (distance(set[j], c) < distance(set[k], c)) k = j;
        memo.set(rgb, k);
      }
      return k;
    };
    const inkMemo = /* @__PURE__ */ new Map();
    const solidMemo = /* @__PURE__ */ new Map();
    for (let i2 = 0; i2 < n; i2++) {
      const a = rgba[4 * i2 + 3];
      if (a === 0) continue;
      const rgb = rgba[4 * i2] << 16 | rgba[4 * i2 + 1] << 8 | rgba[4 * i2 + 2];
      if (a >= SOLID && solids.length > 0) {
        index[i2] = solidAt + nearest(solids, solidMemo, rgb);
        continue;
      }
      const level = Math.max(1, Math.round(a * levels / 255));
      index[i2] = 1 + nearest(inks, inkMemo, rgb) * levels + level - 1;
    }
  }
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height2);
  ihdr.set([8, 3, 0, 0, 0], 8);
  return concat2([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("PLTE", Uint8Array.from(plte)),
    chunk("tRNS", Uint8Array.from(trns)),
    chunk("IDAT", zlibSync(filterBytes(index, width, height2, 1), { level: 9 })),
    chunk("IEND", new Uint8Array(0))
  ]);
}
var INK_DISTANCE = 40 * 40;
var SOLID_DISTANCE = 6 * 6;
function distance(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}
function filterBytes(rgba, w, h, bpp) {
  const stride = w * bpp;
  const out = new Uint8Array(h * (stride + 1));
  const trial = [new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride)];
  const cost = (row) => {
    let sum2 = 0;
    for (let i2 = 0; i2 < row.length; i2++) sum2 += row[i2] < 128 ? row[i2] : 256 - row[i2];
    return sum2;
  };
  for (let y = 0; y < h; y++) {
    const at = y * stride;
    const up = y > 0 ? at - stride : -1;
    const [none, sub, upRow, paeth] = trial;
    for (let i2 = 0; i2 < stride; i2++) {
      const x2 = rgba[at + i2];
      const a = i2 >= bpp ? rgba[at + i2 - bpp] : 0;
      const b = up >= 0 ? rgba[up + i2] : 0;
      const c = up >= 0 && i2 >= bpp ? rgba[up + i2 - bpp] : 0;
      none[i2] = x2;
      sub[i2] = x2 - a & 255;
      upRow[i2] = x2 - b & 255;
      const p = a + b - c;
      const pa = p > a ? p - a : a - p;
      const pb = p > b ? p - b : b - p;
      const pc = p > c ? p - c : c - p;
      paeth[i2] = x2 - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) & 255;
    }
    let best = 0;
    let bestCost = Infinity;
    for (let f = 0; f < 4; f++) {
      const c = cost(trial[f]);
      if (c < bestCost) {
        bestCost = c;
        best = f;
      }
    }
    const filterType = [0, 1, 2, 4][best];
    out[y * (stride + 1)] = filterType;
    out.set(trial[best], y * (stride + 1) + 1);
  }
  return out;
}
function recolorPng(png, ink, over, curve) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const isPlte = png.length > TRNS_AT + 12 + 256 && view.getUint32(PLTE_AT) === 768 && png[PLTE_AT + 4] === 80 && png[PLTE_AT + 5] === 76 && png[PLTE_AT + 6] === 84 && png[PLTE_AT + 7] === 69 && view.getUint32(TRNS_AT) === 256 && png[TRNS_AT + 4] === 116 && png[TRNS_AT + 5] === 82 && png[TRNS_AT + 6] === 78 && png[TRNS_AT + 7] === 83;
  if (!isPlte) throw new Error("recolorPng: not a kittex palette PNG");
  const out = png.slice();
  out.set(chunk("PLTE", palette(ink)), PLTE_AT);
  out.set(chunk("tRNS", alphaTable(ink, over, curve)), TRNS_AT);
  return out;
}
function inkAlpha(alpha, ink, over) {
  const fg = linearLuminance(ink);
  const bg = linearLuminance(over);
  if (!(Math.abs(fg - bg) > 1e-3)) return alpha;
  const blend = linearize(unlinearize(fg) * alpha + unlinearize(bg) * (1 - alpha));
  return Math.min(1, Math.max(0, (blend - bg) / (fg - bg)));
}
function curvedAlpha(alpha, ink, over, curve) {
  const gamma = curve.gamma < 0.01 ? 1 : 1 / curve.gamma;
  const t = (1 - linearLuminance(ink) + linearLuminance(over)) * 0.5;
  const moved = alpha + (alpha ** gamma - alpha) * t;
  return Math.min(1, Math.max(0, moved * (1 + curve.contrast * 0.01)));
}
function alphaTable(ink, over, curve) {
  const trns = new Uint8Array(256);
  for (let i2 = 0; i2 < 256; i2++) {
    if (!over || i2 === 0 || i2 === 255 && !curve) trns[i2] = i2;
    else trns[i2] = Math.round(255 * (curve ? curvedAlpha(i2 / 255, ink, over, curve) : inkAlpha(i2 / 255, ink, over)));
  }
  return trns;
}
var linearize = (v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
var unlinearize = (v) => v <= 31308e-7 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
var linearLuminance = (c) => 0.2126 * linearize(clampByte(c.r) / 255) + 0.7152 * linearize(clampByte(c.g) / 255) + 0.0722 * linearize(clampByte(c.b) / 255);
function palette(ink) {
  const plte = new Uint8Array(768);
  const r = clampByte(ink.r), g = clampByte(ink.g), b = clampByte(ink.b);
  for (let i2 = 0; i2 < 768; i2 += 3) {
    plte[i2] = r;
    plte[i2 + 1] = g;
    plte[i2 + 2] = b;
  }
  return plte;
}
var clampByte = (v) => Math.min(255, Math.max(0, Math.round(v))) || 0;
function filter(alpha, w, h) {
  const out = new Uint8Array(h * (w + 1));
  for (let y = 0; y < h; y++) out.set(alpha.subarray(y * w, y * w + w), y * (w + 1) + 1);
  return out;
}
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i2 = 0; i2 < 4; i2++) out[4 + i2] = type.charCodeAt(i2);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}
var crcTable;
function crc32(bytes, from, to) {
  const table2 = crcTable ??= Uint32Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    return c >>> 0;
  });
  let crc = 4294967295;
  for (let i2 = from; i2 < to; i2++) crc = table2[(crc ^ bytes[i2]) & 255] ^ crc >>> 8;
  return (crc ^ 4294967295) >>> 0;
}
function concat2(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
// core/src/raster/paint.ts
var Canvas2 = class {
  constructor(width, height2) {
    this.width = width;
    this.height = height2;
    this.pixels = new Uint8Array(width * height2 * 4);
  }
  width;
  height;
  /** Premultiplied RGBA, row-major. */
  pixels;
  /**
   * Paints `coverage` (w × h bytes, its top-left at x0, y0 in the canvas) in
   * `color` at `opacity`, through `mask` (the canvas's size, a clip) when given.
   */
  paint(coverage, x0, y0, w, h, color, opacity, mask) {
    const px2 = this.pixels;
    const W = this.width;
    const erase = color === "erase";
    const r = erase ? 0 : color.r;
    const g = erase ? 0 : color.g;
    const b = erase ? 0 : color.b;
    const k = Math.min(1, Math.max(0, opacity)) / 255;
    for (let y = 0; y < h; y++) {
      const cy = y0 + y;
      if (cy < 0 || cy >= this.height) continue;
      for (let x2 = 0; x2 < w; x2++) {
        const c = coverage[y * w + x2];
        if (c === 0) continue;
        const cx = x0 + x2;
        if (cx < 0 || cx >= W) continue;
        const at = cy * W + cx;
        let a = c * k;
        if (mask) {
          const m = mask[at];
          if (m === 0) continue;
          a = a * m / 255;
        }
        const keep = 1 - a;
        const i2 = at * 4;
        if (erase) {
          px2[i2] = px2[i2] * keep + 0.5;
          px2[i2 + 1] = px2[i2 + 1] * keep + 0.5;
          px2[i2 + 2] = px2[i2 + 2] * keep + 0.5;
          px2[i2 + 3] = px2[i2 + 3] * keep + 0.5;
        } else {
          px2[i2] = r * a + px2[i2] * keep + 0.5;
          px2[i2 + 1] = g * a + px2[i2 + 1] * keep + 0.5;
          px2[i2 + 2] = b * a + px2[i2 + 2] * keep + 0.5;
          px2[i2 + 3] = 255 * a + px2[i2 + 3] * keep + 0.5;
        }
      }
    }
  }
  /**
   * The pixels with straight alpha, for a PNG; with `over`, each pixel's
   * alpha corrected for its colour as the terminal corrects text blended over
   * that background (inkAlpha: Ghostty's linear-corrected blending).
   */
  straight(over) {
    const px2 = this.pixels;
    const out = new Uint8Array(px2.length);
    const tables = /* @__PURE__ */ new Map();
    for (let i2 = 0; i2 < px2.length; i2 += 4) {
      const a = px2[i2 + 3];
      if (a === 0) continue;
      const half = a >> 1;
      const r0 = (px2[i2] * 255 + half) / a | 0;
      const g0 = (px2[i2 + 1] * 255 + half) / a | 0;
      const b0 = (px2[i2 + 2] * 255 + half) / a | 0;
      const r = r0 > 255 ? 255 : r0;
      const g = g0 > 255 ? 255 : g0;
      const b = b0 > 255 ? 255 : b0;
      out[i2] = r;
      out[i2 + 1] = g;
      out[i2 + 2] = b;
      if (!over || a === 255) {
        out[i2 + 3] = a;
        continue;
      }
      const key = r << 16 | g << 8 | b;
      let table2 = tables.get(key);
      if (!table2) {
        if (tables.size >= 4096) {
          out[i2 + 3] = Math.round(255 * inkAlpha(a / 255, { r, g, b }, over));
          continue;
        }
        table2 = correctionTable({ r, g, b }, over);
        tables.set(key, table2);
      }
      out[i2 + 3] = table2[a];
    }
    return out;
  }
};
function correctionTable(color, over) {
  const table2 = new Uint8Array(256);
  for (let a = 0; a < 256; a++) table2[a] = a === 0 || a === 255 ? a : Math.round(255 * inkAlpha(a / 255, color, over));
  return table2;
}
// core/src/raster/path.ts
function flattenPath(d, m) {
  const contours = [];
  walkPath(d, m, FLATNESS, (points) => {
    if (points.length >= 6) contours.push(points);
  });
  return contours;
}
function flattenSubpaths(d, m, flatness = FLATNESS) {
  const out = [];
  walkPath(d, m, flatness, (points, closed) => {
    if (points.length >= 4) out.push({ points, closed });
  });
  return out;
}
function walkPath(d, m, flatness, emit2) {
  let contour = [];
  const [a, b, c, dd, e, f] = m;
  const px2 = (x3, y2) => a * x3 + c * y2 + e;
  const py = (x3, y2) => b * x3 + dd * y2 + f;
  let x2 = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let ctrlX = 0;
  let ctrlY = 0;
  let prev = "";
  const finish = (closed = false) => {
    if (contour.length > 0) emit2(contour, closed);
    contour = [];
  };
  const begin = () => {
    if (contour.length === 0) contour.push(px2(x2, y), py(x2, y));
  };
  const lineTo = (nx, ny) => {
    begin();
    contour.push(px2(nx, ny), py(nx, ny));
    x2 = nx;
    y = ny;
  };
  const quadTo = (x1, y1, nx, ny) => {
    begin();
    const p0x = px2(x2, y), p0y = py(x2, y);
    const p1x = px2(x1, y1), p1y = py(x1, y1);
    const p2x = px2(nx, ny), p2y = py(nx, ny);
    const ddx = p0x - 2 * p1x + p2x;
    const ddy = p0y - 2 * p1y + p2y;
    const n = Math.min(100, Math.ceil(Math.sqrt(Math.hypot(ddx, ddy) / (4 * flatness))));
    for (let i2 = 1; i2 < n; i2++) {
      const t = i2 / n;
      const u = 1 - t;
      contour.push(u * u * p0x + 2 * u * t * p1x + t * t * p2x, u * u * p0y + 2 * u * t * p1y + t * t * p2y);
    }
    contour.push(p2x, p2y);
    x2 = nx;
    y = ny;
  };
  const cubicTo = (x1, y1, x22, y2, nx, ny) => {
    begin();
    const p0x = px2(x2, y), p0y = py(x2, y);
    const p1x = px2(x1, y1), p1y = py(x1, y1);
    const p2x = px2(x22, y2), p2y = py(x22, y2);
    const p3x = px2(nx, ny), p3y = py(nx, ny);
    const dd1 = Math.hypot(p0x - 2 * p1x + p2x, p0y - 2 * p1y + p2y);
    const dd2 = Math.hypot(p1x - 2 * p2x + p3x, p1y - 2 * p2y + p3y);
    const n = Math.min(100, Math.ceil(Math.sqrt(0.75 * Math.max(dd1, dd2) / flatness)));
    for (let i2 = 1; i2 < n; i2++) {
      const t = i2 / n;
      const u = 1 - t;
      const w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
      contour.push(w0 * p0x + w1 * p1x + w2 * p2x + w3 * p3x, w0 * p0y + w1 * p1y + w2 * p2y + w3 * p3y);
    }
    contour.push(p3x, p3y);
    x2 = nx;
    y = ny;
  };
  const arcTo = (rx, ry, angle, large, sweep, nx, ny) => {
    for (const seg of arcToCubics(x2, y, rx, ry, angle, large, sweep, nx, ny)) cubicTo(...seg);
    x2 = nx;
    y = ny;
  };
  const s = new Scanner(d);
  let cmd = "";
  for (; ; ) {
    s.skip();
    if (s.done()) break;
    const next = s.command();
    if (next) cmd = next;
    else if (!cmd || cmd === "Z" || cmd === "z") break;
    else if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x2 : 0;
    const oy = rel ? y : 0;
    const upper = cmd.toUpperCase();
    let cx = NaN;
    let cy = NaN;
    if (upper === "Z") {
      finish(true);
      x2 = startX;
      y = startY;
    } else if (upper === "M") {
      const nx = s.number() + ox;
      const ny = s.number() + oy;
      if (Number.isNaN(nx + ny)) break;
      finish();
      x2 = startX = nx;
      y = startY = ny;
    } else if (upper === "L") {
      const nx = s.number() + ox;
      const ny = s.number() + oy;
      if (Number.isNaN(nx + ny)) break;
      lineTo(nx, ny);
    } else if (upper === "H") {
      const nx = s.number() + ox;
      if (Number.isNaN(nx)) break;
      lineTo(nx, y);
    } else if (upper === "V") {
      const ny = s.number() + oy;
      if (Number.isNaN(ny)) break;
      lineTo(x2, ny);
    } else if (upper === "C" || upper === "S") {
      let x1;
      let y1;
      if (upper === "C") {
        x1 = s.number() + ox;
        y1 = s.number() + oy;
      } else if (prev === "C" || prev === "S") {
        x1 = 2 * x2 - ctrlX;
        y1 = 2 * y - ctrlY;
      } else {
        x1 = x2;
        y1 = y;
      }
      const x22 = s.number() + ox;
      const y2 = s.number() + oy;
      const nx = s.number() + ox;
      const ny = s.number() + oy;
      if (Number.isNaN(x1 + y1 + x22 + y2 + nx + ny)) break;
      cubicTo(x1, y1, x22, y2, nx, ny);
      cx = x22;
      cy = y2;
    } else if (upper === "Q" || upper === "T") {
      let x1;
      let y1;
      if (upper === "Q") {
        x1 = s.number() + ox;
        y1 = s.number() + oy;
      } else if (prev === "Q" || prev === "T") {
        x1 = 2 * x2 - ctrlX;
        y1 = 2 * y - ctrlY;
      } else {
        x1 = x2;
        y1 = y;
      }
      const nx = s.number() + ox;
      const ny = s.number() + oy;
      if (Number.isNaN(x1 + y1 + nx + ny)) break;
      quadTo(x1, y1, nx, ny);
      cx = x1;
      cy = y1;
    } else if (upper === "A") {
      const rx = s.number();
      const ry = s.number();
      const angle = s.number();
      const large = s.flag();
      const sweep = s.flag();
      const nx = s.number() + ox;
      const ny = s.number() + oy;
      if (Number.isNaN(rx + ry + angle + large + sweep + nx + ny)) break;
      arcTo(rx, ry, angle, large === 1, sweep === 1, nx, ny);
    } else {
      break;
    }
    ctrlX = cx;
    ctrlY = cy;
    prev = upper;
  }
  finish();
}
var Scanner = class {
  constructor(s) {
    this.s = s;
  }
  s;
  i = 0;
  done() {
    return this.i >= this.s.length;
  }
  /** Skips whitespace and commas. */
  skip() {
    while (this.i < this.s.length) {
      const ch = this.s.charCodeAt(this.i);
      if (ch === 32 || ch === 44 || ch === 9 || ch === 10 || ch === 13 || ch === 12) this.i++;
      else break;
    }
  }
  /** The command letter at the cursor, consumed, or '' when a number is next. */
  command() {
    const ch = this.s[this.i];
    if ("MmLlHhVvCcSsQqTtAaZz".includes(ch)) {
      this.i++;
      return ch;
    }
    return "";
  }
  /** The next number, or NaN when there is none. */
  number() {
    this.skip();
    const s = this.s;
    const start = this.i;
    let i2 = start;
    if (s[i2] === "+" || s[i2] === "-") i2++;
    const digitsFrom = i2;
    while (i2 < s.length && s.charCodeAt(i2) >= 48 && s.charCodeAt(i2) <= 57) i2++;
    if (s[i2] === ".") {
      i2++;
      while (i2 < s.length && s.charCodeAt(i2) >= 48 && s.charCodeAt(i2) <= 57) i2++;
    }
    if (i2 === digitsFrom || i2 === digitsFrom + 1 && s[digitsFrom] === ".") return NaN;
    if (s[i2] === "e" || s[i2] === "E") {
      let j = i2 + 1;
      if (s[j] === "+" || s[j] === "-") j++;
      const expFrom = j;
      while (j < s.length && s.charCodeAt(j) >= 48 && s.charCodeAt(j) <= 57) j++;
      if (j > expFrom) i2 = j;
    }
    this.i = i2;
    return Number(s.slice(start, i2));
  }
  /** An arc flag: a single 0 or 1, which may be packed against what follows. */
  flag() {
    this.skip();
    const ch = this.s[this.i];
    if (ch === "0" || ch === "1") {
      this.i++;
      return ch === "1" ? 1 : 0;
    }
    return NaN;
  }
};
function arcToCubics(x1, y1, rx, ry, angle, large, sweep, x2, y2) {
  if (x1 === x2 && y1 === y2) return [];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]];
  const phi = angle * Math.PI / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const hx = (x1 - x2) / 2;
  const hy = (y1 - y2) / 2;
  const x1p = cos * hx + sin * hy;
  const y1p = -sin * hx + cos * hy;
  const lambda = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num3 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let k = Math.sqrt(Math.max(0, num3 / den));
  if (large === sweep) k = -k;
  const cxp = k * rx * y1p / ry;
  const cyp = -k * ry * x1p / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const vecAngle = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const theta = vecAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = vecAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9));
  const step = delta / n;
  const t = 4 / 3 * Math.tan(step / 4);
  const point = (u) => {
    const cu = Math.cos(u);
    const su = Math.sin(u);
    return [
      cx + rx * cu * cos - ry * su * sin,
      cy + rx * cu * sin + ry * su * cos,
      -rx * su * cos - ry * cu * sin,
      -rx * su * sin + ry * cu * cos
    ];
  };
  const out = [];
  let [ax, ay, adx, ady] = point(theta);
  for (let i2 = 1; i2 <= n; i2++) {
    const [bx, by, bdx, bdy] = point(theta + i2 * step);
    const endX = i2 === n ? x2 : bx;
    const endY = i2 === n ? y2 : by;
    out.push([ax + t * adx, ay + t * ady, endX - t * bdx, endY - t * bdy, endX, endY]);
    ax = endX;
    ay = endY;
    adx = bdx;
    ady = bdy;
  }
  return out;
}
// core/src/raster/stroke.ts
function strokeOutlines(subpaths, g) {
  const hw = g.width / 2;
  if (!(hw > 0)) return [];
  const out = [];
  for (const piece of dashed(subpaths, g)) strokePiece(piece, hw, g, out);
  for (const c of out) if (area(c) < 0) reverse(c);
  return out;
}
function dashed(subpaths, g) {
  const dash = g.dash;
  if (!dash || dash.length === 0) return [...subpaths];
  const period = dash.reduce((sum2, n) => sum2 + n, 0);
  if (!(period >= MIN_DASH_PERIOD)) return [...subpaths];
  const pieces = [];
  for (const sub of subpaths) {
    const pts = sub.points.slice();
    if (sub.closed) pts.push(pts[0], pts[1]);
    let phase = ((g.dashOffset ?? 0) % period + period) % period;
    let k = 0;
    while (phase >= dash[k]) {
      phase -= dash[k];
      k = (k + 1) % dash.length;
    }
    let left = dash[k] - phase;
    let on = k % 2 === 0;
    let current = on ? [pts[0], pts[1]] : [];
    for (let i2 = 0; i2 + 3 < pts.length; i2 += 2) {
      const x0 = pts[i2], y0 = pts[i2 + 1], x1 = pts[i2 + 2], y1 = pts[i2 + 3];
      const len = Math.hypot(x1 - x0, y1 - y0);
      let at = 0;
      while (len - at > left) {
        at += left;
        const t = at / len;
        const x2 = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        if (on) {
          current.push(x2, y);
          pieces.push({ points: current, closed: false });
          if (pieces.length > MAX_DASHES) return [...subpaths];
          current = [];
        } else {
          current = [x2, y];
        }
        on = !on;
        k = (k + 1) % dash.length;
        left = dash[k];
      }
      left -= len - at;
      if (on) current.push(x1, y1);
    }
    if (on && current.length >= 4) pieces.push({ points: current, closed: false });
  }
  return pieces;
}
function strokePiece(sub, hw, g, out) {
  const pts = [];
  for (let i2 = 0; i2 + 1 < sub.points.length; i2 += 2) {
    const x2 = sub.points[i2];
    const y = sub.points[i2 + 1];
    const n2 = pts.length;
    if (n2 >= 2 && Math.abs(x2 - pts[n2 - 2]) < SAME_POINT && Math.abs(y - pts[n2 - 1]) < SAME_POINT) continue;
    pts.push(x2, y);
  }
  let closed = sub.closed;
  if (closed && pts.length >= 4 && Math.abs(pts[0] - pts[pts.length - 2]) < SAME_POINT && Math.abs(pts[1] - pts[pts.length - 1]) < SAME_POINT) pts.length -= 2;
  const n = pts.length / 2;
  if (n < 2) {
    if (n === 1 && g.cap !== "butt" && sub.points.length >= 4) {
      const x2 = pts[0], y = pts[1];
      out.push(g.cap === "round" ? circle(x2, y, hw) : [x2 - hw, y - hw, x2 + hw, y - hw, x2 + hw, y + hw, x2 - hw, y + hw]);
    }
    return;
  }
  if (n === 2) closed = false;
  const segments = closed ? n : n - 1;
  const dx = new Float64Array(segments);
  const dy = new Float64Array(segments);
  for (let i2 = 0; i2 < segments; i2++) {
    const j = (i2 + 1) % n;
    const ex = pts[2 * j] - pts[2 * i2];
    const ey = pts[2 * j + 1] - pts[2 * i2 + 1];
    const len = Math.hypot(ex, ey);
    dx[i2] = ex / len;
    dy[i2] = ey / len;
  }
  for (let i2 = 0; i2 < segments; i2++) {
    const j = (i2 + 1) % n;
    const nx = -dy[i2] * hw;
    const ny = dx[i2] * hw;
    const ax = pts[2 * i2], ay = pts[2 * i2 + 1], bx = pts[2 * j], by = pts[2 * j + 1];
    out.push([ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny]);
  }
  const first = closed ? 0 : 1;
  const last = closed ? n - 1 : n - 2;
  for (let v = first; v <= last; v++) {
    const into = (v - 1 + segments) % segments;
    const from = v % segments;
    join(pts[2 * v], pts[2 * v + 1], dx[into], dy[into], dx[from], dy[from], hw, g, out);
  }
  if (!closed) {
    cap(pts[0], pts[1], -dx[0], -dy[0], hw, g.cap, out);
    cap(pts[2 * n - 2], pts[2 * n - 1], dx[segments - 1], dy[segments - 1], hw, g.cap, out);
  }
}
function join(x2, y, ix, iy, ox, oy, hw, g, out) {
  const cross = ix * oy - iy * ox;
  const dot = ix * ox + iy * oy;
  const turn = Math.atan2(Math.abs(cross), dot);
  if (hw * turn < NO_JOIN) return;
  const s = cross > 0 ? -1 : 1;
  const ax = x2 + s * -iy * hw;
  const ay = y + s * ix * hw;
  const bx = x2 + s * -oy * hw;
  const by = y + s * ox * hw;
  if (g.join === "round" && hw * turn > ROUND_AS_BEVEL) {
    out.push(circle(x2, y, hw));
    return;
  }
  if (g.join === "miter") {
    const ratio = 1 / Math.sqrt(Math.max(1e-12, (1 + dot) / 2));
    if (ratio <= g.miterLimit) {
      let mx = -iy - oy;
      let my = ix + ox;
      const len = Math.hypot(mx, my);
      if (len > 1e-9) {
        mx = mx / len * s * hw * ratio;
        my = my / len * s * hw * ratio;
        out.push([x2, y, ax, ay, x2 + mx, y + my, bx, by]);
        return;
      }
    }
  }
  out.push([x2, y, ax, ay, bx, by]);
}
function cap(x2, y, dx, dy, hw, kind, out) {
  if (kind === "round") {
    out.push(circle(x2, y, hw));
  } else if (kind === "square") {
    const nx = -dy * hw;
    const ny = dx * hw;
    const ex = x2 + dx * hw;
    const ey = y + dy * hw;
    out.push([x2 + nx, y + ny, ex + nx, ey + ny, ex - nx, ey - ny, x2 - nx, y - ny]);
  }
}
function circle(x2, y, r) {
  const k = r <= ARC_FLATNESS ? 6 : Math.min(128, Math.max(6, Math.ceil(Math.PI / Math.acos(1 - ARC_FLATNESS / r))));
  const c = [];
  for (let i2 = 0; i2 < k; i2++) {
    const t = 2 * Math.PI * i2 / k;
    c.push(x2 + r * Math.cos(t), y + r * Math.sin(t));
  }
  return c;
}
function area(c) {
  let sum2 = 0;
  const n = c.length;
  let x0 = c[n - 2];
  let y0 = c[n - 1];
  for (let i2 = 0; i2 < n; i2 += 2) {
    sum2 += x0 * c[i2 + 1] - c[i2] * y0;
    x0 = c[i2];
    y0 = c[i2 + 1];
  }
  return sum2 / 2;
}
function reverse(c) {
  for (let i2 = 0, j = c.length - 2; i2 < j; i2 += 2, j -= 2) {
    const x2 = c[i2];
    const y = c[i2 + 1];
    c[i2] = c[j];
    c[i2 + 1] = c[j + 1];
    c[j] = x2;
    c[j + 1] = y;
  }
}
function snapStroke(subpaths, width) {
  const whole = Math.max(1, Math.round(width));
  const at = (v) => whole % 2 === 1 ? Math.floor(v) + 0.5 : Math.round(v);
  let snapped = false;
  for (const sub of subpaths) {
    const p = sub.points;
    if (sub.closed && p.length >= 6 && Math.abs(p[0] - p[p.length - 2]) < SAME_POINT && Math.abs(p[1] - p[p.length - 1]) < SAME_POINT) p.length -= 2;
    const n = p.length / 2;
    const segments = sub.closed ? n : n - 1;
    const snapX = new Uint8Array(n);
    const snapY = new Uint8Array(n);
    for (let i2 = 0; i2 < segments; i2++) {
      const j = (i2 + 1) % n;
      const ex = p[2 * j] - p[2 * i2];
      const ey = p[2 * j + 1] - p[2 * i2 + 1];
      const len = Math.hypot(ex, ey);
      if (!(len > 0)) continue;
      if (Math.abs(ey) < 1e-3 * len) snapY[i2] = snapY[j] = 1;
      else if (Math.abs(ex) < 1e-3 * len) snapX[i2] = snapX[j] = 1;
    }
    for (let i2 = 0; i2 < n; i2++) {
      if (snapX[i2]) p[2 * i2] = at(p[2 * i2]);
      if (snapY[i2]) p[2 * i2 + 1] = at(p[2 * i2 + 1]);
      if (snapX[i2] || snapY[i2]) snapped = true;
    }
  }
  return snapped ? whole : width;
}
export{encodeAlphaPng,flattenPath,Canvas2,flattenSubpaths,snapStroke,strokeOutlines,encodeQuantizedPng,recolorPng,inkAlpha};
