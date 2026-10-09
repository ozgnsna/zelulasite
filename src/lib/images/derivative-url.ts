/** İstemciye güvenli: sharp yok. srcset yalnızca DB'de doğrulanmış genişliklerle kurulur. */

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const CARD_DERIVATIVE_WIDTH = 400;
export const PDP_DERIVATIVE_WIDTH = 800;
export const DERIVATIVE_WIDTHS = [CARD_DERIVATIVE_WIDTH, PDP_DERIVATIVE_WIDTH] as const;

export type DerivativeWidth = (typeof DERIVATIVE_WIDTHS)[number];

const RASTER_EXT = /\.(jpe?g|png|webp)$/i;

export function isDerivativeObjectPath(objectPath: string): boolean {
  return /__w\d+\.webp$/i.test(objectPath);
}

export function storageObjectPathFromPublicUrl(
  publicUrl: string,
  bucket = PRODUCT_IMAGE_BUCKET,
): string | null {
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

export function derivativeObjectPath(objectPath: string, width: number): string | null {
  const clean = objectPath.split("?")[0]?.split("#")[0] ?? "";
  if (!clean || isDerivativeObjectPath(clean) || !RASTER_EXT.test(clean)) return null;
  const dot = clean.lastIndexOf(".");
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  return `${stem}__w${width}.webp`;
}

export function siblingDerivativePaths(objectPath: string): string[] {
  return DERIVATIVE_WIDTHS.map((width) => derivativeObjectPath(objectPath, width)).filter(
    (path): path is string => Boolean(path),
  );
}

export function derivativePublicUrl(publicUrl: string, width: number): string | null {
  const objectPath = storageObjectPathFromPublicUrl(publicUrl);
  if (!objectPath) return null;
  const nextPath = derivativeObjectPath(objectPath, width);
  if (!nextPath) return null;
  try {
    const url = new URL(publicUrl);
    const marker = `/object/public/${PRODUCT_IMAGE_BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    const encoded = nextPath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    url.pathname = `${url.pathname.slice(0, index + marker.length)}${encoded}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeDerivativeWidths(value: unknown): DerivativeWidth[] {
  if (!Array.isArray(value)) return [];
  const set = new Set<number>();
  for (const item of value) {
    const n = Number(item);
    if (n === CARD_DERIVATIVE_WIDTH || n === PDP_DERIVATIVE_WIDTH) set.add(n);
  }
  return DERIVATIVE_WIDTHS.filter((width) => set.has(width));
}

export function buildDerivativeSrcSet(
  publicUrl: string,
  widths: readonly number[],
  use: "card" | "gallery",
): string | undefined {
  const wanted = use === "card" ? [CARD_DERIVATIVE_WIDTH] : [CARD_DERIVATIVE_WIDTH, PDP_DERIVATIVE_WIDTH];
  const parts = wanted
    .filter((width) => widths.includes(width))
    .map((width) => {
      const url = derivativePublicUrl(publicUrl, width);
      return url ? `${url} ${width}w` : null;
    })
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : undefined;
}
