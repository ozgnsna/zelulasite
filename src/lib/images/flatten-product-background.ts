/** Ürün görseli: açık gri / kirli beyaz arka planı #FFFFFF yapar (Trendyol / Gemini uyumu). */

import { exportCanvasAsJpegFile, PRODUCT_IMAGE_MAX_BYTES } from "@/lib/images/product-image-upload";

const TARGET_WHITE = 255;
const DEFAULT_LIGHTNESS_MIN = 208;
const DEFAULT_SATURATION_MAX = 0.14;

function pixelLightness(r: number, g: number, b: number) {
  return (r + g + b) / 3;
}

function pixelSaturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max <= 0) return 0;
  return (max - min) / max;
}

function isBackgroundLikePixel(r: number, g: number, b: number, lightnessMin: number, saturationMax: number) {
  return pixelLightness(r, g, b) >= lightnessMin && pixelSaturation(r, g, b) <= saturationMax;
}

function sampleCornerLightness(data: Uint8ClampedArray, w: number, h: number) {
  const corners = [
    0,
    (w - 1) * 4,
    (h - 1) * w * 4,
    ((h - 1) * w + (w - 1)) * 4,
  ];
  let sum = 0;
  for (const i of corners) {
    sum += pixelLightness(data[i]!, data[i + 1]!, data[i + 2]!);
  }
  return sum / corners.length;
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
  const cornerAvg = sampleCornerLightness(data, w, h);
  const lightnessMin = Math.min(250, Math.max(DEFAULT_LIGHTNESS_MIN, cornerAvg - 18));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (isBackgroundLikePixel(r, g, b, lightnessMin, DEFAULT_SATURATION_MAX)) {
      data[i] = TARGET_WHITE;
      data[i + 1] = TARGET_WHITE;
      data[i + 2] = TARGET_WHITE;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const baseName = file.name.replace(/\.[^.]+$/, "") || "product";
  return exportCanvasAsJpegFile(canvas, baseName, PRODUCT_IMAGE_MAX_BYTES);
}
