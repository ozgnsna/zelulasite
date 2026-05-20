/** Ürün görseli: kirli beyaz/gri zemin → #FFFFFF. Ürün gölgesi asla silinmez. */

import { exportCanvasAsJpegFile, PRODUCT_IMAGE_MAX_BYTES } from "@/lib/images/product-image-upload";

const TARGET_WHITE = 255;
/** Bundan koyu piksellere dokunulmaz (stüdyo gölgesi). */
const ABSOLUTE_SHADOW_FLOOR = 238;

function pixelLightness(r: number, g: number, b: number) {
  return (r + g + b) / 3;
}

function pixelSaturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max <= 0) return 0;
  return (max - min) / max;
}

function colorDistance(r: number, g: number, b: number, tr: number, tg: number, tb: number) {
  return Math.hypot(r - tr, g - tg, b - tb);
}

/** Köşe bölgelerinden referans arka plan rengi (zemin). */
function sampleCornerReferenceRgb(data: Uint8ClampedArray, w: number, h: number) {
  const padX = Math.max(2, Math.floor(w * 0.05));
  const padY = Math.max(2, Math.floor(h * 0.05));
  const samples: [number, number, number][] = [];

  const corners = [
    [padX, padY],
    [w - 1 - padX, padY],
    [padX, h - 1 - padY],
    [w - 1 - padX, h - 1 - padY],
  ] as const;

  for (const [x, y] of corners) {
    const i = (y * w + x) * 4;
    samples.push([data[i]!, data[i + 1]!, data[i + 2]!]);
  }

  let r = 0;
  let g = 0;
  let b = 0;
  for (const [sr, sg, sb] of samples) {
    r += sr;
    g += sg;
    b += sb;
  }
  const n = samples.length;
  return { r: r / n, g: g / n, b: b / n, lightness: pixelLightness(r / n, g / n, b / n) };
}

type FloodOpts = {
  refR: number;
  refG: number;
  refB: number;
  maxColorDist: number;
  minLightness: number;
  shadowFloor: number;
  maxSaturation: number;
  maxLightnessStep: number;
};

function isFloodCandidate(r: number, g: number, b: number, opts: FloodOpts) {
  const L = pixelLightness(r, g, b);
  if (L < opts.shadowFloor) return false;
  if (L < opts.minLightness) return false;
  if (pixelSaturation(r, g, b) > opts.maxSaturation) return false;
  return colorDistance(r, g, b, opts.refR, opts.refG, opts.refB) <= opts.maxColorDist;
}

/**
 * Yalnızca köşe + üst kenardan erişilen neredeyse beyaz zemin.
 * Alt kenar tohumlanmaz — ürün altı gölgesi korunur.
 */
function floodFillBackgroundMask(data: Uint8ClampedArray, w: number, h: number, opts: FloodOpts): Uint8Array {
  const mask = new Uint8Array(w * h);
  const queue: number[] = [];

  const seed = (x: number, y: number) => {
    const idx = y * w + x;
    if (mask[idx]) return;
    const i = idx * 4;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (!isFloodCandidate(r, g, b, opts)) return;
    mask[idx] = 1;
    queue.push(idx);
  };

  const padX = Math.max(2, Math.floor(w * 0.05));
  const padY = Math.max(2, Math.floor(h * 0.05));
  /* Yalnızca üst köşeler — alt köşe/kenar gölgeye uzanmasın */
  seed(padX, padY);
  seed(w - 1 - padX, padY);

  const topRow = Math.min(3, Math.floor(h * 0.03));
  const stepX = Math.max(1, Math.floor(w / 20));
  for (let x = 0; x < w; x += stepX) {
    for (let y = 0; y <= topRow; y++) seed(x, y);
  }

  while (queue.length > 0) {
    const idx = queue.pop()!;
    const x = idx % w;
    const y = (idx - x) / w;
    const i = idx * 4;
    const curL = pixelLightness(data[i]!, data[i + 1]!, data[i + 2]!);

    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as const;

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nidx = ny * w + nx;
      if (mask[nidx]) continue;
      const ni = nidx * 4;
      const nr = data[ni]!;
      const ng = data[ni + 1]!;
      const nb = data[ni + 2]!;
      const nL = pixelLightness(nr, ng, nb);
      if (Math.abs(nL - curL) > opts.maxLightnessStep) continue;
      if (!isFloodCandidate(nr, ng, nb, opts)) continue;
      mask[nidx] = 1;
      queue.push(nidx);
    }
  }

  return mask;
}

/** Maske içinde kalan gölge adalarını çıkar. */
function removeShadowPixelsFromMask(data: Uint8ClampedArray, mask: Uint8Array, shadowFloor: number) {
  for (let idx = 0; idx < mask.length; idx++) {
    if (!mask[idx]) continue;
    const i = idx * 4;
    if (pixelLightness(data[i]!, data[i + 1]!, data[i + 2]!) < shadowFloor) {
      mask[idx] = 0;
    }
  }
}

function applyWhiteFromMask(data: Uint8ClampedArray, mask: Uint8Array) {
  for (let idx = 0; idx < mask.length; idx++) {
    if (!mask[idx]) continue;
    const i = idx * 4;
    data[i] = TARGET_WHITE;
    data[i + 1] = TARGET_WHITE;
    data[i + 2] = TARGET_WHITE;
  }
}

function loadImageSource(file: File): Promise<CanvasImageSource> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Görsel okunamadı."));
    };
    img.src = url;
  });
}

export async function flattenProductImageBackground(
  file: File,
  opts?: { maxEdge?: number },
): Promise<File> {
  const source = await loadImageSource(file);
  const srcW = "naturalWidth" in source ? source.naturalWidth : (source as ImageBitmap).width;
  const srcH = "naturalHeight" in source ? source.naturalHeight : (source as ImageBitmap).height;
  const maxEdge = opts?.maxEdge ?? 2400;
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas desteklenmiyor.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const { data } = imageData;
  const ref = sampleCornerReferenceRgb(data, w, h);

  const shadowFloor = Math.max(ABSOLUTE_SHADOW_FLOOR, ref.lightness - 8);
  const floodOpts: FloodOpts = {
    refR: ref.r,
    refG: ref.g,
    refB: ref.b,
    maxColorDist: 28,
    minLightness: Math.max(246, ref.lightness - 3),
    shadowFloor,
    maxSaturation: 0.08,
    maxLightnessStep: 10,
  };

  const mask = floodFillBackgroundMask(data, w, h, floodOpts);
  removeShadowPixelsFromMask(data, mask, shadowFloor);
  applyWhiteFromMask(data, mask);
  ctx.putImageData(imageData, 0, 0);

  const baseName = file.name.replace(/\.[^.]+$/, "") || "product";
  return exportCanvasAsJpegFile(canvas, baseName, PRODUCT_IMAGE_MAX_BYTES);
}
