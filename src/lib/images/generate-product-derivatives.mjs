/**
 * Ürün görseli türevleri: w400 (kart) ve w800 (PDP). Orijinal kalır.
 * sharp burada; istemci bundle'ına girmemeli.
 */
import sharp from "sharp";

/** derivative-url.ts ile aynı kurallar. Bu dosya Node script'lerinden de yüklenir, .ts import etmez. */
const PRODUCT_IMAGE_BUCKET = "product-images";
const DERIVATIVE_WIDTHS = [400, 800];
const QUALITY = { 400: 70, 800: 75 };
const RASTER_EXT = /\.(jpe?g|png|webp)$/i;

function isDerivativeObjectPath(objectPath) {
  return /__w\d+\.webp$/i.test(objectPath);
}

function storageObjectPathFromPublicUrl(publicUrl, bucket = PRODUCT_IMAGE_BUCKET) {
  try {
    const url = new URL(publicUrl);
    const marker = `/object/public/${bucket}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    const path = decodeURIComponent(url.pathname.slice(index + marker.length));
    return path.length > 0 ? path : null;
  } catch {
    return null;
  }
}

function derivativeObjectPath(objectPath, width) {
  const clean = String(objectPath).split("?")[0]?.split("#")[0] ?? "";
  if (!clean || isDerivativeObjectPath(clean) || !RASTER_EXT.test(clean)) return null;
  const dot = clean.lastIndexOf(".");
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  return `${stem}__w${width}.webp`;
}

function siblingDerivativePaths(objectPath) {
  return DERIVATIVE_WIDTHS.map((width) => derivativeObjectPath(objectPath, width)).filter(Boolean);
}

export { PRODUCT_IMAGE_BUCKET, siblingDerivativePaths, storageObjectPathFromPublicUrl };

export async function buildDerivativeBuffers(bytes) {
  const input = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (input.length < 32) return [];
  let meta;
  try {
    meta = await sharp(input, { failOn: "none" }).metadata();
  } catch {
    return [];
  }
  if (!meta.width || meta.format === "svg") return [];

  const out = [];
  for (const width of DERIVATIVE_WIDTHS) {
    if (meta.width < width) continue;
    try {
      const buffer = await sharp(input, { failOn: "none" })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: QUALITY[width], effort: 4 })
        .toBuffer();
      if (buffer.length >= input.length) continue;
      out.push({ width, buffer });
    } catch {
      /* bu genişlik atlanır, orijinal kalır */
    }
  }
  return out;
}

export async function uploadDerivativeBuffers(storage, objectPath, derivatives) {
  const uploaded = [];
  for (const item of derivatives) {
    const path = derivativeObjectPath(objectPath, item.width);
    if (!path) continue;
    const { error } = await storage.from(PRODUCT_IMAGE_BUCKET).upload(path, item.buffer, {
      contentType: "image/webp",
      upsert: true,
    });
    if (!error) uploaded.push(item.width);
  }
  return uploaded;
}

export async function removeDerivativeSiblings(storage, objectPathOrUrl) {
  const objectPath = String(objectPathOrUrl).includes("://")
    ? storageObjectPathFromPublicUrl(objectPathOrUrl)
    : objectPathOrUrl;
  const paths = siblingDerivativePaths(objectPath || "");
  if (paths.length === 0) return;
  await storage.from(PRODUCT_IMAGE_BUCKET).remove(paths);
}

export async function mirrorRemoteProductImage(storage, productId, remoteUrl) {
  let response;
  try {
    response = await fetch(remoteUrl, { redirect: "follow" });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("image/") || contentType.includes("svg")) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 32 || bytes.length > 8_000_000) return null;
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const objectPath = `products/${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await storage.from(PRODUCT_IMAGE_BUCKET).upload(objectPath, bytes, {
    contentType,
    upsert: false,
  });
  if (error) return null;
  const widths = await uploadDerivativeBuffers(storage, objectPath, await buildDerivativeBuffers(bytes));
  const { data } = storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(objectPath);
  return { publicUrl: data.publicUrl, derivativeWidths: widths };
}
