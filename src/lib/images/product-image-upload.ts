/** Admin ürün görseli: boyut sınırı ve istemci tarafı sıkıştırma. */

export const PRODUCT_IMAGE_MAX_BYTES = 3_500_000;

const DEFAULT_MAX_EDGE = 2400;

function loadImageSource(file: File): Promise<HTMLImageElement> {
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

function drawImageToCanvas(img: HTMLImageElement, maxEdge: number): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas desteklenmiyor.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function downscaleCanvas(canvas: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const w = Math.max(1, Math.round(canvas.width * factor));
  const h = Math.max(1, Math.round(canvas.height * factor));
  const next = document.createElement("canvas");
  next.width = w;
  next.height = h;
  const ctx = next.getContext("2d");
  if (!ctx) throw new Error("Canvas desteklenmiyor.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(canvas, 0, 0, w, h);
  return next;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Görsel dışa aktarılamadı."))),
      "image/jpeg",
      quality,
    );
  });
}

/** JPEG olarak dışa aktarır; gerekirse kalite ve çözünürlüğü düşürür. */
export async function exportCanvasAsJpegFile(
  canvas: HTMLCanvasElement,
  baseName: string,
  maxBytes: number = PRODUCT_IMAGE_MAX_BYTES,
): Promise<File> {
  const qualities = [0.94, 0.88, 0.82, 0.76, 0.7, 0.64, 0.58, 0.52];
  let working = canvas;

  for (let pass = 0; pass < 4; pass++) {
    for (const q of qualities) {
      const blob = await canvasToBlob(working, q);
      if (blob.size <= maxBytes) {
        return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
      }
    }
    working = downscaleCanvas(working, 0.82);
  }

  throw new Error("Görsel sıkıştırılamadı; daha küçük bir dosya deneyin.");
}

/** Büyük ham dosyaları yükleme öncesi JPEG + boyut sınırına indirir. */
export async function compressProductImageForUpload(
  file: File,
  opts?: { maxEdge?: number; maxBytes?: number },
): Promise<File> {
  const img = await loadImageSource(file);
  const canvas = drawImageToCanvas(img, opts?.maxEdge ?? DEFAULT_MAX_EDGE);
  const baseName = file.name.replace(/\.[^.]+$/, "") || "product";
  return exportCanvasAsJpegFile(canvas, baseName, opts?.maxBytes ?? PRODUCT_IMAGE_MAX_BYTES);
}

/** Beyaz arka plan kapalıyken küçük JPEG/WebP dosyalarına dokunulmaz. */
export function shouldCompressBeforeUpload(file: File, flattenBackground: boolean): boolean {
  if (flattenBackground) return true;
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return true;
  const type = file.type.toLowerCase();
  if (type === "image/png" || type === "image/bmp" || type === "image/heic" || type === "image/heif") {
    return file.size > 900_000;
  }
  return false;
}

export async function prepareProductImageForUpload(
  file: File,
  opts: { flattenBackground: boolean; flattenFn: (file: File) => Promise<File> },
): Promise<File> {
  if (opts.flattenBackground) {
    return opts.flattenFn(file);
  }
  if (!shouldCompressBeforeUpload(file, false)) {
    return file;
  }
  return compressProductImageForUpload(file);
}
