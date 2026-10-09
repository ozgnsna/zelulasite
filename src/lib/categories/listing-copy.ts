/**
 * Kategori / vitrin SEO metinleri.
 * Yaprak kategoriler: `categories.seo_*` (admin). Boşsa aşağıdaki şablon.
 * Hub, erkek ve çok satanlar: bu dosyadaki CODE_LISTING_COPY (DB satırı yok).
 *
 * seo_title / titleSegment tam `<title>` değildir. Layout şablonu sonuna
 * " | Zelula" ekler. Alana "| Zelula" yazılırsa kırpılır.
 */

export type ListingCopy = {
  /** `<title>` parçası. Şablon: `${titleSegment} | Zelula` */
  titleSegment?: string;
  description?: string;
  /** H1 altı kısa metin */
  intro?: string;
  /** Ürün gridinin altındaki uzun metin. Paragraflar boş satırla ayrılır. */
  body?: string;
};

export const CODE_LISTING_COPY: Record<string, ListingCopy> = {
  takilar: {},
  aksesuar: {},
  erkek: {},
  "erkek-bileklik": {},
  "erkek-yuzuk": {},
  "cok-satanlar": {},
};

export type DbListingSeo = {
  seo_title?: string | null;
  seo_description?: string | null;
  seo_intro?: string | null;
  seo_body?: string | null;
};

export type ResolvedListingCopy = {
  titleSegment: string;
  description: string;
  intro: string | null;
  body: string | null;
};

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

/** Tam başlık yapıştırılırsa marka son ekini at. */
export function asTitleSegment(raw: string, fallback: string): string {
  const stripped = raw
    .trim()
    .replace(/\s*\|\s*Zelula(?:\s+Design)?\s*$/i, "")
    .trim();
  return stripped || fallback;
}

export function resolveListingCopy(input: {
  db?: DbListingSeo | null;
  codeKey?: string | null;
  fallbackTitle: string;
  fallbackDescription: string;
}): ResolvedListingCopy {
  const code = input.codeKey ? CODE_LISTING_COPY[input.codeKey] : undefined;
  const titleRaw = clean(input.db?.seo_title) || clean(code?.titleSegment);
  const description = clean(input.db?.seo_description) || clean(code?.description) || input.fallbackDescription;
  const intro = clean(input.db?.seo_intro) || clean(code?.intro) || null;
  const body = clean(input.db?.seo_body) || clean(code?.body) || null;
  return {
    titleSegment: asTitleSegment(titleRaw, input.fallbackTitle),
    description,
    intro,
    body,
  };
}

export function categoryFallbackDescription(name: string): string {
  return `${name} modelleri — paslanmaz çelik ve zamansız Zelula Design takı seçkisi. 650₺ üzeri ücretsiz kargo.`;
}

export function erkekHubFallbackDescription(): string {
  return "Erkek çelik bileklik ve yüzük modelleri — maskülen, günlük ve statement Zelula Design seçkisi. 650₺ üzeri ücretsiz kargo.";
}

export function erkekLeafFallbackDescription(name: string): string {
  const lower = name.toLocaleLowerCase("tr-TR");
  return `Erkek ${lower} modelleri — paslanmaz çelik Zelula Design seçkisi. 650₺ üzeri ücretsiz kargo.`;
}

export const BESTSELLERS_FALLBACK_TITLE = "Çok satanlar";
export const BESTSELLERS_FALLBACK_DESCRIPTION =
  "Zelula’da en çok tercih edilen öne çıkan parçalar.";
