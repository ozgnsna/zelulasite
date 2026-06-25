/** Ürün medyası URL / dosya türü (görsel vs video). */

export const PRODUCT_VIDEO_MAX_BYTES = 40 * 1024 * 1024;

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogg"] as const;

export function isProductVideoUrl(url: string | null | undefined): boolean {
  const raw = String(url ?? "").trim().toLowerCase();
  if (!raw) return false;
  const withoutQuery = raw.split("?")[0]?.split("#")[0] ?? raw;
  return VIDEO_EXTENSIONS.some((ext) => withoutQuery.endsWith(ext));
}

export function isProductVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);
}

export function isProductImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp)$/i.test(file.name);
}

export function isAllowedProductMediaFile(file: File): boolean {
  return isProductImageFile(file) || isProductVideoFile(file);
}

export function productVideoMimeType(file: File): string {
  if (file.type.startsWith("video/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "webm") return "video/webm";
  if (ext === "mov") return "video/quicktime";
  if (ext === "ogg") return "video/ogg";
  return "video/mp4";
}
