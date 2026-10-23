import{u16,shft,wbits,hTree,clim,flt,fdt,hMap,flm,fdm,wbits16,fleb,fdeb,i32,u8,revfl,revfd,slc,err,inflt,SIGNATURE,ImageError,COLOR_TYPES,checkSize,ADAM7,INFLATE_STEP,PLTE_AT,SOLID,CANDIDATES,FARTHEST_SLOTS,COVER_TAIL,MAX_INKS,SOLID_COLOURS,MAX_LEVELS,MAX_IMAGE_PIXELS,imageHeader,decodeJpeg,__kittexLate}from'./p33.js';export*from'./p33.js';
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
var zls = function(d, dict) {
  if ((d[0] & 15) != 8 || d[0] >> 4 > 7 || (d[0] << 8 | d[1]) % 31)
    err(6, "invalid zlib data");
  if ((d[1] >> 5 & 1) == +!dict)
    err(6, "invalid zlib data: " + (d[1] & 32 ? "need" : "unexpected") + " dictionary");
  return (d[1] >> 3 & 4) + 2;
};
var Inflate = /* @__PURE__ */ (function() {
  function Inflate2(opts, cb) {
    if (typeof opts == "function")
      cb = opts, opts = {};
    this.ondata = cb;
    var dict = opts && opts.dictionary && opts.dictionary.subarray(-32768);
    this.s = { i: 0, b: dict ? dict.length : 0 };
    this.o = new u8(32768);
    this.p = new u8(0);
    if (dict)
      this.o.set(dict);
  }
  Inflate2.prototype.e = function(c) {
    if (!this.ondata)
      err(5);
    if (this.d)
      err(4);
    if (!this.p.length)
      this.p = c;
    else if (c.length) {
      var n = new u8(this.p.length + c.length);
      n.set(this.p), n.set(c, this.p.length), this.p = n;
    }
  };
  Inflate2.prototype.c = function(final) {
    this.s.i = +(this.d = final || false);
    var bts = this.s.b;
    var dt = inflt(this.p, this.s, this.o);
    this.ondata(slc(dt, bts, this.s.b), this.d);
    this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
    this.p = slc(this.p, this.s.p / 8 | 0), this.s.p &= 7;
  };
  Inflate2.prototype.push = function(chunk2, final) {
    this.e(chunk2), this.c(final);
  };
  return Inflate2;
})();
function zlibSync(data, opts) {
  if (!opts)
    opts = {};
  var a = adler();
  a.p(data);
  var d = dopt(data, opts, opts.dictionary ? 6 : 2, 4);
  return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
}
var Unzlib = /* @__PURE__ */ (function() {
  function Unzlib2(opts, cb) {
    Inflate.call(this, opts, cb);
    this.v = opts && opts.dictionary ? 2 : 1;
  }
  Unzlib2.prototype.push = function(chunk2, final) {
    Inflate.prototype.e.call(this, chunk2);
    if (this.v) {
      if (this.p.length < 6 && !final)
        return;
      this.p = this.p.subarray(zls(this.p, this.v - 1)), this.v = 0;
    }
    if (final) {
      if (this.p.length < 4)
        err(6, "invalid zlib data");
      this.p = this.p.subarray(0, -4);
    }
    Inflate.prototype.c.call(this, final);
  };
  return Unzlib2;
})();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
// core/src/image/png.ts
function decodePng(bytes, maxPixels) {
  if (!SIGNATURE.every((b, i2) => bytes[i2] === b)) throw new ImageError("not a PNG");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let header;
  let palette2;
  let trns;
  const idat = [];
  let at = 8;
  for (; ; ) {
    if (at + 8 > bytes.length) {
      if (header && idat.length > 0) break;
      throw new ImageError("PNG is truncated");
    }
    const length4 = view.getUint32(at);
    const type = String.fromCharCode(bytes[at + 4], bytes[at + 5], bytes[at + 6], bytes[at + 7]);
    if (header && type === "IEND") break;
    if (at + 12 + length4 > bytes.length) throw new ImageError(`PNG ${type} chunk is truncated`);
    const data = bytes.subarray(at + 8, at + 8 + length4);
    at += 12 + length4;
    if (!header) {
      if (type !== "IHDR") throw new ImageError("PNG does not start with IHDR");
      header = parseHeader(data, maxPixels);
      continue;
    }
    if (type === "PLTE") palette2 = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
  }
  if (idat.length === 0) throw new ImageError("PNG has no IDAT");
  if (header.colorType === 3 && !palette2) throw new ImageError("palette PNG has no PLTE");
  const raw = inflate(idat, header);
  return toRgba(raw, header, palette2, trns);
}
function parseHeader(data, maxPixels) {
  if (data.length < 13) throw new ImageError("PNG IHDR is short");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = view.getUint32(0);
  const height2 = view.getUint32(4);
  const depth = data[8];
  const colorType = data[9];
  const kind = COLOR_TYPES[colorType];
  if (!kind || !kind.depths.includes(depth)) throw new ImageError(`PNG colour type ${colorType} at ${depth} bits is not valid`);
  if (data[10] !== 0 || data[11] !== 0 || data[12] !== 0 && data[12] !== 1) throw new ImageError("PNG uses an unknown compression, filter or interlace method");
  checkSize(width, height2, maxPixels);
  return { width, height: height2, depth, colorType, channels: kind.channels, interlaced: data[12] === 1 };
}
function stride(width, h) {
  return Math.ceil(width * h.channels * h.depth / 8);
}
function passes(h) {
  if (!h.interlaced) return [[0, 0, 1, 1, h.width, h.height]];
  return ADAM7.map(([x0, y0, dx, dy]) => [x0, y0, dx, dy, Math.ceil((h.width - x0) / dx), Math.ceil((h.height - y0) / dy)]).filter(
    ([, , , , w, rows]) => w > 0 && rows > 0
  );
}
function inflate(idat, h) {
  const expected = passes(h).reduce((n, [, , , , w, rows]) => n + rows * (1 + stride(w, h)), 0);
  const out = new Uint8Array(expected);
  let length4 = 0;
  const stream = new Unzlib((chunk2) => {
    if (length4 + chunk2.length > expected) throw new ImageError(`PNG image data inflates to more than the ${expected} bytes its header allows`);
    out.set(chunk2, length4);
    length4 += chunk2.length;
  });
  try {
    for (const data of idat) for (let at = 0; at < data.length; at += INFLATE_STEP) stream.push(data.subarray(at, at + INFLATE_STEP));
    stream.push(new Uint8Array(0), true);
  } catch (error) {
    if (error instanceof ImageError) throw error;
    throw new ImageError(`PNG image data is corrupt or truncated (${error instanceof Error ? error.message : String(error)})`);
  }
  if (length4 !== expected) throw new ImageError(`PNG image data inflates to ${length4} bytes, not ${expected}`);
  return out;
}
function toRgba(raw, h, palette2, trns) {
  const rgba = new Uint8Array(h.width * h.height * 4);
  const bpp = Math.max(1, h.channels * h.depth >> 3);
  const convert = converter(h, palette2, trns);
  let at = 0;
  for (const [x0, y0, dx, dy, w, rows] of passes(h)) {
    const n = stride(w, h);
    let previous = new Uint8Array(n);
    let line = new Uint8Array(n);
    const pixels = new Uint8Array(w * 4);
    for (let row = 0; row < rows; row++) {
      unfilter(raw[at], raw.subarray(at + 1, at + 1 + n), previous, line, bpp);
      at += 1 + n;
      const y = y0 + row * dy;
      if (dx === 1) convert(line, w, rgba.subarray(y * h.width * 4, (y + 1) * h.width * 4));
      else {
        convert(line, w, pixels);
        for (let i2 = 0; i2 < w; i2++) rgba.set(pixels.subarray(i2 * 4, i2 * 4 + 4), (y * h.width + x0 + i2 * dx) * 4);
      }
      ;
      [previous, line] = [line, previous];
    }
  }
  return { width: h.width, height: h.height, rgba };
}
function unfilter(type, src, up, out, bpp) {
  const n = src.length;
  switch (type) {
    case 0:
      out.set(src);
      return;
    case 1:
      for (let i2 = 0; i2 < n; i2++) out[i2] = src[i2] + (i2 >= bpp ? out[i2 - bpp] : 0);
      return;
    case 2:
      for (let i2 = 0; i2 < n; i2++) out[i2] = src[i2] + up[i2];
      return;
    case 3:
      for (let i2 = 0; i2 < n; i2++) out[i2] = src[i2] + ((i2 >= bpp ? out[i2 - bpp] : 0) + up[i2] >> 1);
      return;
    case 4:
      for (let i2 = 0; i2 < n; i2++) {
        const a = i2 >= bpp ? out[i2 - bpp] : 0;
        const b = up[i2];
        const c = i2 >= bpp ? up[i2 - bpp] : 0;
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        out[i2] = src[i2] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      return;
    default:
      throw new ImageError(`PNG row has unknown filter type ${type}`);
  }
}
function converter(h, palette2, trns) {
  const { depth, colorType } = h;
  const sample = sampleReader(depth);
  const to8 = depth === 16 ? (v) => (v * 255 + 32767) / 65535 | 0 : depth === 8 ? (v) => v : (v) => v * 255 / ((1 << depth) - 1);
  const key = (i2) => trns && trns.length >= i2 * 2 + 2 ? trns[i2 * 2] << 8 | trns[i2 * 2 + 1] : -1;
  switch (colorType) {
    case 0: {
      const gray = key(0);
      return (line, width, out) => {
        for (let x2 = 0; x2 < width; x2++) {
          const v = sample(line, x2);
          const g = to8(v);
          out[x2 * 4] = out[x2 * 4 + 1] = out[x2 * 4 + 2] = g;
          out[x2 * 4 + 3] = v === gray ? 0 : 255;
        }
      };
    }
    case 2: {
      const [kr, kg, kb] = [key(0), key(1), key(2)];
      return (line, width, out) => {
        for (let x2 = 0; x2 < width; x2++) {
          const r = sample(line, x2 * 3);
          const g = sample(line, x2 * 3 + 1);
          const b = sample(line, x2 * 3 + 2);
          out[x2 * 4] = to8(r);
          out[x2 * 4 + 1] = to8(g);
          out[x2 * 4 + 2] = to8(b);
          out[x2 * 4 + 3] = r === kr && g === kg && b === kb ? 0 : 255;
        }
      };
    }
    case 3: {
      const plte = palette2 ?? new Uint8Array(0);
      const table2 = new Uint8Array(256 * 4);
      for (let i2 = 0; i2 < 256; i2++) {
        if (i2 * 3 + 2 < plte.length) table2.set(plte.subarray(i2 * 3, i2 * 3 + 3), i2 * 4);
        table2[i2 * 4 + 3] = trns && i2 < trns.length ? trns[i2] : 255;
      }
      return (line, width, out) => {
        for (let x2 = 0; x2 < width; x2++) {
          const at = sample(line, x2) * 4;
          out[x2 * 4] = table2[at];
          out[x2 * 4 + 1] = table2[at + 1];
          out[x2 * 4 + 2] = table2[at + 2];
          out[x2 * 4 + 3] = table2[at + 3];
        }
      };
    }
    case 4:
      return (line, width, out) => {
        for (let x2 = 0; x2 < width; x2++) {
          out[x2 * 4] = out[x2 * 4 + 1] = out[x2 * 4 + 2] = to8(sample(line, x2 * 2));
          out[x2 * 4 + 3] = to8(sample(line, x2 * 2 + 1));
        }
      };
    default:
      return (line, width, out) => {
        if (depth === 8) out.set(line.subarray(0, width * 4));
        else for (let i2 = 0; i2 < width * 4; i2++) out[i2] = to8(sample(line, i2));
      };
  }
}
function sampleReader(depth) {
  if (depth === 8) return (line, i2) => line[i2];
  if (depth === 16) return (line, i2) => line[i2 * 2] << 8 | line[i2 * 2 + 1];
  const mask = (1 << depth) - 1;
  return (line, i2) => {
    const bit = i2 * depth;
    return line[bit >> 3] >> 8 - depth - (bit & 7) & mask;
  };
}
// core/src/raster/png.ts
var SIGNATURE2 = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
var TRNS_AT = PLTE_AT + 12 + 768;
function encodeAlphaPng(alpha, width, height2, ink, over, curve) {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height2);
  ihdr.set([8, 3, 0, 0, 0], 8);
  return concat2([
    SIGNATURE2,
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
    const cover = (weights, most, apart) => {
      const sorted = [...weights].sort((a, b) => b[1] - a[1]).slice(0, CANDIDATES);
      const chosen = pick2(new Map(sorted), most - FARTHEST_SLOTS, apart);
      const total = sorted.reduce((sum3, [, w]) => sum3 + w, 0);
      let kept = 0;
      let sum2 = 0;
      while (kept < sorted.length && sum2 < total * (1 - COVER_TAIL)) sum2 += sorted[kept++][1];
      const candidates = sorted.slice(0, kept).map(([rgb]) => [rgb >> 16 & 255, rgb >> 8 & 255, rgb & 255]);
      const gap2 = candidates.map((c) => Math.min(Infinity, ...chosen.map((one) => distance(one, c))));
      while (chosen.length < most) {
        let far = -1;
        for (let k = 0; k < candidates.length; k++) if (gap2[k] > apart && (far < 0 || gap2[k] > gap2[far])) far = k;
        if (far < 0) break;
        const c = candidates[far];
        chosen.push(c);
        for (let k = 0; k < candidates.length; k++) gap2[k] = Math.min(gap2[k], distance(c, candidates[k]));
      }
      return chosen;
    };
    const inks = pick2(weight, MAX_INKS, INK_DISTANCE);
    const solids = cover(solidWeight, SOLID_COLOURS, SOLID_DISTANCE);
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
    SIGNATURE2,
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
  const stride2 = w * bpp;
  const out = new Uint8Array(h * (stride2 + 1));
  const trial = [new Uint8Array(stride2), new Uint8Array(stride2), new Uint8Array(stride2), new Uint8Array(stride2)];
  const cost = (row) => {
    let sum2 = 0;
    for (let i2 = 0; i2 < row.length; i2++) sum2 += row[i2] < 128 ? row[i2] : 256 - row[i2];
    return sum2;
  };
  for (let y = 0; y < h; y++) {
    const at = y * stride2;
    const up = y > 0 ? at - stride2 : -1;
    const [none, sub, upRow, paeth] = trial;
    for (let i2 = 0; i2 < stride2; i2++) {
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
    out[y * (stride2 + 1)] = filterType;
    out.set(trial[best], y * (stride2 + 1) + 1);
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
// core/src/image/encode.ts
var SIGNATURE3 = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
function encodeRgbaPng(bitmap) {
  const { width, height: height2, rgba } = bitmap;
  if (rgba.length !== width * height2 * 4 || width < 1 || height2 < 1) throw new RangeError(`encodeRgbaPng: ${rgba.length} bytes is not a ${width}×${height2} RGBA bitmap`);
  let opaque = true;
  for (let i2 = 3; i2 < rgba.length; i2 += 4) {
    if (rgba[i2] !== 255) {
      opaque = false;
      break;
    }
  }
  let pixels = rgba;
  if (opaque) {
    pixels = new Uint8Array(width * height2 * 3);
    for (let i2 = 0, j = 0; i2 < rgba.length; i2 += 4, j += 3) {
      pixels[j] = rgba[i2];
      pixels[j + 1] = rgba[i2 + 1];
      pixels[j + 2] = rgba[i2 + 2];
    }
  }
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height2);
  ihdr.set([8, opaque ? 2 : 6, 0, 0, 0], 8);
  const filtered = filterBytes(pixels, width, height2, opaque ? 3 : 4);
  return concat2([SIGNATURE3, chunk("IHDR", ihdr), chunk("IDAT", zlibSync(filtered, { level: 6 })), chunk("IEND", new Uint8Array(0))]);
}
// core/src/image/scale.ts
function spans(from, to) {
  const scale2 = from / to;
  const first = new Int32Array(to);
  const offsets = new Int32Array(to + 1);
  const weights = [];
  for (let o = 0; o < to; o++) {
    const start = o * scale2;
    const end = Math.min(from, (o + 1) * scale2);
    const lo = Math.min(from - 1, Math.floor(start));
    first[o] = lo;
    for (let i2 = lo; i2 < end && i2 < from; i2++) {
      const w = Math.min(i2 + 1, end) - Math.max(i2, start);
      if (w > 1e-9 || i2 === lo) weights.push(Math.max(w, 0) / (end - start));
      else break;
    }
    offsets[o + 1] = weights.length;
  }
  return { first, offsets, weights: Float64Array.from(weights) };
}
function scaleBitmap(bitmap, widthPx, heightPx) {
  const { width: w, height: h, rgba } = bitmap;
  if (!Number.isInteger(widthPx) || !Number.isInteger(heightPx) || widthPx < 1 || heightPx < 1) {
    throw new RangeError(`scaleBitmap: target size ${widthPx}×${heightPx} is not a positive whole size`);
  }
  if (rgba.length !== w * h * 4 || w < 1 || h < 1) throw new RangeError(`scaleBitmap: ${rgba.length} bytes is not a ${w}×${h} RGBA bitmap`);
  if (widthPx === w && heightPx === h) return { width: w, height: h, rgba: rgba.slice() };
  const xs = spans(w, widthPx);
  const ys = spans(h, heightPx);
  const out = new Uint8Array(widthPx * heightPx * 4);
  const row = new Float64Array(w * 4);
  for (let oy = 0; oy < heightPx; oy++) {
    row.fill(0);
    for (let k = ys.offsets[oy], sy = ys.first[oy]; k < ys.offsets[oy + 1]; k++, sy++) {
      const wy = ys.weights[k];
      const base = sy * w * 4;
      for (let x2 = 0, i2 = base; x2 < w * 4; x2 += 4, i2 += 4) {
        const a = rgba[i2 + 3] * wy;
        row[x2] = row[x2] + rgba[i2] * a;
        row[x2 + 1] = row[x2 + 1] + rgba[i2 + 1] * a;
        row[x2 + 2] = row[x2 + 2] + rgba[i2 + 2] * a;
        row[x2 + 3] = row[x2 + 3] + a;
      }
    }
    for (let ox = 0; ox < widthPx; ox++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let k = xs.offsets[ox], sx = xs.first[ox] * 4; k < xs.offsets[ox + 1]; k++, sx += 4) {
        const wx = xs.weights[k];
        r += row[sx] * wx;
        g += row[sx + 1] * wx;
        b += row[sx + 2] * wx;
        a += row[sx + 3] * wx;
      }
      const at = (oy * widthPx + ox) * 4;
      if (a > 0) {
        out[at] = Math.round(r / a);
        out[at + 1] = Math.round(g / a);
        out[at + 2] = Math.round(b / a);
        out[at + 3] = Math.round(a);
      }
    }
  }
  return { width: widthPx, height: heightPx, rgba: out };
}
// core/src/image/index.ts
function decodeImage(bytes, limits) {
  const maxPixels = limits?.maxPixels ?? MAX_IMAGE_PIXELS;
  const format = imageHeader(bytes)?.format;
  if (format === "png") return decodePng(bytes, maxPixels);
  if (format === "jpeg") return decodeJpeg(bytes, maxPixels);
  throw new ImageError(format ? `decodeImage does not decode ${format}` : "not an image kittex knows");
}
// core/src/raster/fill.ts
var Coverage = class {
  width;
  height;
  /** Row stride of `acc`: two spare cells right of the image take the deltas of edges at x = width. */
  stride;
  acc;
  constructor(width, height2) {
    this.width = width;
    this.height = height2;
    this.stride = width + 2;
    this.acc = new Float32Array(this.stride * height2);
  }
  /** Adds a closed contour. `sign` is +1 or -1: the winding that counts as ink for this contour's shape. */
  fill(contour, sign) {
    const n = contour.length;
    let x0 = contour[n - 2];
    let y0 = contour[n - 1];
    for (let i2 = 0; i2 < n; i2 += 2) {
      const x1 = contour[i2];
      const y1 = contour[i2 + 1];
      this.line(x0, y0, x1, y1, sign);
      x0 = x1;
      y0 = y1;
    }
  }
  /** Adds one edge, clipped to the image: the parts left of x = 0 or right of x = width run along that side. */
  line(x0, y0, x1, y1, sign) {
    if (y0 === y1) return;
    const w = this.width;
    if (x0 >= 0 && x1 >= 0 && x0 <= w && x1 <= w) {
      this.edge(x0, y0, x1, y1, sign);
      return;
    }
    const ts = [0, 1];
    for (const bound of [0, w]) {
      if ((x0 - bound) * (x1 - bound) < 0) ts.push((bound - x0) / (x1 - x0));
    }
    ts.sort((a, b) => a - b);
    for (let i2 = 1; i2 < ts.length; i2++) {
      const ta = ts[i2 - 1];
      const tb = ts[i2];
      const ax = x0 + (x1 - x0) * ta;
      const bx = x0 + (x1 - x0) * tb;
      const ay = y0 + (y1 - y0) * ta;
      const by = y0 + (y1 - y0) * tb;
      this.edge(Math.min(w, Math.max(0, ax)), ay, Math.min(w, Math.max(0, bx)), by, sign);
    }
  }
  /** Adds one edge with 0 ≤ x ≤ width; rows outside the image are skipped. */
  edge(px0, py0, px1, py1, sign) {
    if (py0 === py1) return;
    let dir = sign;
    let x0 = px0, y0 = py0, x1 = px1, y1 = py1;
    if (y0 > y1) {
      dir = -sign;
      x0 = px1;
      y0 = py1;
      x1 = px0;
      y1 = py0;
    }
    const h = this.height;
    if (y1 <= 0 || y0 >= h) return;
    const acc = this.acc;
    const stride2 = this.stride;
    const dxdy = (x1 - x0) / (y1 - y0);
    let x2 = x0;
    if (y0 < 0) x2 -= y0 * dxdy;
    const rowFrom = Math.max(0, Math.floor(y0));
    const rowTo = Math.min(h, Math.ceil(y1));
    for (let row = rowFrom; row < rowTo; row++) {
      const base = row * stride2;
      const dy = Math.min(row + 1, y1) - Math.max(row, y0);
      const xnext = x2 + dxdy * dy;
      const d = dy * dir;
      const xa = x2 < xnext ? x2 : xnext;
      const xb = x2 < xnext ? xnext : x2;
      const xaFloor = Math.floor(xa);
      const xai = xaFloor;
      const xbCeil = Math.ceil(xb);
      const xbi = xbCeil;
      if (xbi <= xai + 1) {
        const xmf = 0.5 * (x2 + xnext) - xaFloor;
        acc[base + xai] += d - d * xmf;
        acc[base + xai + 1] += d * xmf;
      } else {
        const s = 1 / (xb - xa);
        const xaf = xa - xaFloor;
        const a0 = 0.5 * s * (1 - xaf) * (1 - xaf);
        const xbf = xb - xbCeil + 1;
        const am = 0.5 * s * xbf * xbf;
        acc[base + xai] += d * a0;
        if (xbi === xai + 2) {
          acc[base + xai + 1] += d * (1 - a0 - am);
        } else {
          const a1 = s * (1.5 - xaf);
          acc[base + xai + 1] += d * (a1 - a0);
          for (let xi = xai + 2; xi < xbi - 1; xi++) acc[base + xi] += d * s;
          const a2 = a1 + (xbi - xai - 3) * s;
          acc[base + xbi - 1] += d * (1 - a2 - am);
        }
        acc[base + xbi] += d * am;
      }
      x2 = xnext;
    }
  }
  /**
   * The coverage under the even-odd rule, as bytes: a winding of 2 is a hole,
   * and the accumulated area w covers |w| folded into [0, 1] (the distance to
   * the nearest even number), which is exact for areas no two edges of a
   * pixel overlap in.
   */
  toAlphaEvenOdd() {
    const { width: w, height: h, stride: stride2, acc } = this;
    const out = new Uint8Array(w * h);
    for (let row = 0; row < h; row++) {
      let sum2 = 0;
      const from = row * stride2;
      const to = row * w;
      for (let x2 = 0; x2 < w; x2++) {
        sum2 += acc[from + x2];
        let c = (sum2 < 0 ? -sum2 : sum2) % 2;
        if (c > 1) c = 2 - c;
        out[to + x2] = c * 255 + 0.5 | 0;
      }
    }
    return out;
  }
  /** The coverage as bytes (0 to 255), row-major, through `curve` (256 entries) when given. */
  toAlpha(curve) {
    const { width: w, height: h, stride: stride2, acc } = this;
    const out = new Uint8Array(w * h);
    for (let row = 0; row < h; row++) {
      let sum2 = 0;
      const from = row * stride2;
      const to = row * w;
      for (let x2 = 0; x2 < w; x2++) {
        sum2 += acc[from + x2];
        const c = sum2 < 0 ? -sum2 : sum2;
        const byte = c >= 1 ? 255 : c * 255 + 0.5 | 0;
        out[to + x2] = curve ? curve[byte] : byte;
      }
    }
    return out;
  }
};
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
export{Coverage,encodeAlphaPng,Canvas2,encodeQuantizedPng,recolorPng,decodeImage,scaleBitmap,encodeRgbaPng,inkAlpha};
