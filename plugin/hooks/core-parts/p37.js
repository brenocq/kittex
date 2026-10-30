import{assumedBackground,imageColumns,MAX_PICTURE_ROWS,MAX_IMAGE_SIDE,adaptColor,measurePicture,MIN_PICTURE_SCALE,TexError,MAX_PIXELS,rasterizePicture,encodePicturePng,MAX_IMAGE_BYTES,pictureOutlines,measure,rasterOptions,MIN_DISPLAY_SCALE,tooSmall,ImageError,imageHeader,readSvg,MAX_IMAGE_PIXELS,decodeImage,KEPT_IMAGE_PIXELS,scaleBitmap,encodeRgbaPng2,svgTextTex,remember,typeset,GlyphError,store,texPicture,fitImage,MIN_IMAGE_DENSITY,blockImages,fitImageBlock,blockCells,TOO_LARGE,drawnImage,rasterize}from'./p36.js';export*from'./p36.js';
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
  const box2 = measurePicture(picture, pictureOptions(env));
  if (box2.scale < MIN_PICTURE_SCALE) throw new TexError(`picture too large to draw legibly (it would be drawn at ${Math.round(box2.scale * 100)}% size)`);
  return box2;
}
function renderPicture(picture, env, minRows, density = 1) {
  const box2 = measurePicture(picture, pictureOptions(env, minRows));
  const d = Math.min(1, Math.max(0.1, density));
  const options3 = d === 1 ? pictureOptions(env, minRows) : { ...pictureOptions({ ...env, cellWidth: env.cellWidth * d, cellHeight: env.cellHeight * d, emPx: env.emPx * d }, box2.rows), minColumns: box2.columns };
  if (box2.scale < MIN_PICTURE_SCALE) throw new TexError(`picture too large to draw legibly (it would be drawn at ${Math.round(box2.scale * 100)}% size)`);
  if (box2.columns * env.cellWidth * box2.rows * env.cellHeight > MAX_PIXELS) throw new TexError("picture too large to draw");
  const raster = rasterizePicture(picture, options3);
  const png = encodePicturePng(raster);
  if (png.length > MAX_IMAGE_BYTES) throw new TexError("picture too large to send to the terminal");
  return { columns: raster.columns, rows: raster.rows, scale: raster.scale, png };
}
function texFormula(picture) {
  return pictureOutlines(picture);
}
function measureDisplayResult(result, env) {
  const box2 = measure(result, rasterOptions(env));
  if (box2.scale < MIN_DISPLAY_SCALE) throw new TexError(tooSmall(box2.scale));
  return box2;
}
var MAX_IMAGE_FILE_BYTES = 4 * 1024 * 1024;
var IMAGE_FILE_BYTES = MAX_IMAGE_BYTES / 2;
var VECTOR_PX_PER_EM = 2 * (72 / 72.27) * 10;
var SVG_EM_PER_UNIT = 72.27 / 72 / 10;
function readImageFile(bytes) {
  if (bytes.length > MAX_IMAGE_FILE_BYTES) throw new ImageError(`file larger than ${MAX_IMAGE_FILE_BYTES / 1024 / 1024} MiB`);
  const header = imageHeader(bytes);
  if (!header) throw new ImageError("not a PNG, JPEG, SVG or PDF file");
  if (header.format === "pdf") return "pdf";
  if (header.format === "svg") return pictureSource(readSvg(svgString(bytes), { baseline: "bottom", emPerUnit: SVG_EM_PER_UNIT, userUnit: "document", text: typesetSvgText }));
  if (header.width !== void 0 && header.height !== void 0 && header.width * header.height > MAX_IMAGE_PIXELS) {
    throw new ImageError(`image too large to draw (${header.width} × ${header.height} pixels)`);
  }
  const bitmap = decodeImage(bytes, { maxPixels: MAX_IMAGE_PIXELS });
  const pixels = bitmap.width * bitmap.height;
  const k = pixels > KEPT_IMAGE_PIXELS ? Math.sqrt(KEPT_IMAGE_PIXELS / pixels) : 1;
  const kept = k < 1 ? scaleBitmap(bitmap, Math.max(1, Math.round(bitmap.width * k)), Math.max(1, Math.round(bitmap.height * k))) : bitmap;
  return { kind: "bitmap", width: bitmap.width, height: bitmap.height, bitmap: kept, format: header.format };
}
function originalPng(source) {
  if (source.kind === "bitmap") return encodeRgbaPng2(source.bitmap);
  const k = Math.min(1, Math.sqrt(MAX_IMAGE_PIXELS / Math.max(1, source.width * source.height)));
  const width = Math.max(1, Math.floor(source.width * k));
  const height2 = Math.max(1, Math.floor(source.height * k));
  const raster = rasterizePicture(source.picture, { emPx: width / source.picture.width, cellWidth: width, cellHeight: height2, maxColumns: 1, maxRows: 1, weight: 0, color: (color) => color });
  return encodeRgbaPng2({ width: raster.widthPx, height: raster.heightPx, rgba: raster.rgba });
}
function svgString(bytes) {
  return new TextDecoder().decode(bytes);
}
var svgTextCache = /* @__PURE__ */ new Map();
function typesetSvgText(run2) {
  const tex = svgTextTex(run2);
  if (svgTextCache.has(tex)) return remember(svgTextCache, tex) ?? void 0;
  let result;
  try {
    result = typeset(tex, { display: false });
  } catch (error) {
    if (!(error instanceof GlyphError || error instanceof TexError)) throw error;
    result = null;
  }
  return store(svgTextCache, tex, result) ?? void 0;
}
function texPicture2(svg, document) {
  return texPicture(svg, document, typesetSvgText);
}
function pictureSource(picture) {
  const width = picture.width * VECTOR_PX_PER_EM;
  const height2 = (picture.height + picture.depth) * VECTOR_PX_PER_EM;
  if (!(width > 0 && height2 > 0)) throw new ImageError("the picture is empty");
  return { kind: "picture", width, height: height2, picture };
}
function imageBox(env) {
  return {
    maxColumns: imageColumns(env),
    maxRows: Math.max(1, Math.min(255, env.maxRows ?? MAX_PICTURE_ROWS, Math.floor(MAX_IMAGE_SIDE / env.cellHeight))),
    cellWidth: env.cellWidth,
    cellHeight: env.cellHeight
  };
}
function pictureImageEnv(source, spec, env) {
  const box2 = imageBox(env);
  const fit = fitImage(source, spec, box2);
  return { ...env, emPx: fit.widthPx / source.picture.width, maxRows: box2.maxRows };
}
function measureImage(source, spec, env) {
  if (source.kind === "picture") return measurePicture2(source.picture, pictureImageEnv(source, spec, env));
  const fit = fitImage(source, spec, imageBox(env));
  return { columns: fit.columns, rows: fit.rows, scale: 1 };
}
function renderImage(source, spec, env, minRows, density = 1) {
  if (source.kind === "picture") return { ...renderPicture(source.picture, pictureImageEnv(source, spec, env), minRows, density), density };
  const fit = fitImage(source, spec, imageBox(env));
  const rows = Math.max(fit.rows, minRows ?? 0);
  const fullWidth = fit.columns * env.cellWidth;
  const fullHeight = rows * env.cellHeight;
  let d = Math.min(1, Math.max(MIN_IMAGE_DENSITY, density), Math.sqrt(IMAGE_FILE_BYTES / (fullWidth * fullHeight)));
  for (; ; ) {
    const png = drawBitmap(source.bitmap, fit.widthPx * d, fit.heightPx * d, fullWidth * d, fullHeight * d);
    if (png.length <= IMAGE_FILE_BYTES) return { columns: fit.columns, rows, scale: 1, png, density: d };
    if (d <= MIN_IMAGE_DENSITY) throw new TexError("image too large to send to the terminal");
    d = Math.max(MIN_IMAGE_DENSITY, d * 0.7);
  }
}
function drawBitmap(bitmap, width, height2, boxWidth, boxHeight) {
  const W = Math.max(1, Math.round(boxWidth));
  const H2 = Math.max(1, Math.round(boxHeight));
  const w = Math.min(W, bitmap.width, Math.max(1, Math.round(width)));
  const h = Math.min(H2, bitmap.height, Math.max(1, Math.round(height2)));
  const scaled = w === bitmap.width && h === bitmap.height ? bitmap : scaleBitmap(bitmap, w, h);
  if (w === W && h === H2) return encodeRgbaPng2(scaled);
  const rgba = new Uint8Array(W * H2 * 4);
  const x0 = Math.floor((W - w) / 2);
  const y0 = Math.floor((H2 - h) / 2);
  for (let y = 0; y < h; y++) rgba.set(scaled.rgba.subarray(y * w * 4, (y + 1) * w * 4), ((y0 + y) * W + x0) * 4);
  return encodeRgbaPng2({ width: W, height: H2, rgba });
}
function soleImage(block2) {
  const [row, ...more] = block2.rows;
  const image = row?.length === 1 && more.length === 0 ? row[0] : void 0;
  return image?.box === void 0 ? image : void 0;
}
function checkSources(sources, block2) {
  const count = blockImages(block2).length;
  if (sources.length !== count) throw new RangeError(`image block: ${sources.length} sources for ${count} images`);
}
function measureImageBlock(sources, block2, env) {
  checkSources(sources, block2);
  const sole = soleImage(block2);
  if (sole) return measureImage(sources[0], sole, env);
  const fit = fitImageBlock(sources, block2, imageBox(env));
  return { columns: fit.columns, rows: fit.rows, scale: 1 };
}
function renderImageBlock(sources, block2, env, minRows, density = 1) {
  checkSources(sources, block2);
  const sole = soleImage(block2);
  if (sole) {
    const image = renderImage(sources[0], sole, env, minRows, density);
    return { ...image, cells: [{ column: 0, row: 0, columns: image.columns, rows: image.rows }] };
  }
  const fit = fitImageBlock(sources, block2, imageBox(env));
  const rows = Math.max(fit.rows, minRows ?? 0);
  const cells2 = blockCells(fit, env, rows);
  const fullWidth = fit.columns * env.cellWidth;
  const fullHeight = rows * env.cellHeight;
  const photo = sources.some((source) => source.kind === "bitmap");
  let d = Math.min(1, Math.max(MIN_IMAGE_DENSITY, density), photo ? Math.sqrt(IMAGE_FILE_BYTES / (fullWidth * fullHeight)) : 1);
  for (; ; ) {
    const png = encodeRgbaPng2(composeBlock(sources, fit, env, fullWidth, fullHeight, d));
    if (png.length <= IMAGE_FILE_BYTES) return { columns: fit.columns, rows, scale: 1, png, density: d, cells: cells2 };
    if (d <= MIN_IMAGE_DENSITY) throw new TexError("images too large to send to the terminal");
    d = Math.max(MIN_IMAGE_DENSITY, d * 0.7);
  }
}
function composeBlock(sources, fit, env, fullWidth, fullHeight, density) {
  const width = Math.max(1, Math.round(fullWidth * density));
  const height2 = Math.max(1, Math.round(fullHeight * density));
  const canvas = { width, height: height2, rgba: new Uint8Array(width * height2 * 4) };
  const left = (fullWidth - fit.widthPx) / 2;
  const top = (fullHeight - fit.heightPx) / 2;
  for (const [i2, place] of fit.images.entries()) {
    const source = sources[i2];
    const w = Math.max(1, Math.round(place.widthPx * density));
    const h = Math.max(1, Math.round(place.heightPx * density));
    const drawn = source.kind === "bitmap" ? scaleBitmap(source.bitmap, w, h) : pictureBitmap(source.picture, w, h, env);
    paintOver(canvas, drawn, Math.round((left + place.x) * density) + Math.floor((w - drawn.width) / 2), Math.round((top + place.y) * density) + Math.floor((h - drawn.height) / 2));
  }
  return canvas;
}
function pictureBitmap(picture, width, height2, env) {
  const raster = rasterizePicture(picture, { ...pictureOptions(env), emPx: width / picture.width, cellWidth: width, cellHeight: height2, maxColumns: 1, maxRows: 1 });
  return { width: raster.widthPx, height: raster.heightPx, rgba: raster.rgba };
}
function paintOver(dst, src, x0, y0) {
  const to = dst.rgba;
  const from = src.rgba;
  for (let y = Math.max(0, -y0); y < src.height && y0 + y < dst.height; y++) {
    for (let x2 = Math.max(0, -x0); x2 < src.width && x0 + x2 < dst.width; x2++) {
      const s = (y * src.width + x2) * 4;
      const t = ((y0 + y) * dst.width + x0 + x2) * 4;
      const a = from[s + 3];
      if (a === 0) continue;
      const b = to[t + 3];
      if (a === 255 || b === 0) {
        to[t] = from[s];
        to[t + 1] = from[s + 1];
        to[t + 2] = from[s + 2];
        to[t + 3] = a;
        continue;
      }
      const under = b * (255 - a) / 255;
      const out = a + under;
      for (let c = 0; c < 3; c++) to[t + c] = Math.round((from[s + c] * a + to[t + c] * under) / out);
      to[t + 3] = Math.round(out);
    }
  }
}
function renderDisplayResult(result, env, minRows) {
  const options3 = rasterOptions(env, minRows);
  const box2 = measure(result, options3);
  if (box2.scale < MIN_DISPLAY_SCALE) throw new TexError(tooSmall(box2.scale));
  if (box2.columns * env.cellWidth * box2.rows * env.cellHeight > MAX_PIXELS || box2.rows * env.cellHeight > MAX_IMAGE_SIDE) throw new TexError(TOO_LARGE);
  const { theme: _, ...image } = drawnImage(rasterize(result, options3), env);
  return image;
}
export{IMAGE_FILE_BYTES,MAX_IMAGE_FILE_BYTES,VECTOR_PX_PER_EM,measureDisplayResult,measureImage,measureImageBlock,measurePicture2,originalPng,pictureSource,readImageFile,renderDisplayResult,renderImage,renderImageBlock,renderPicture,texFormula,texPicture2};
