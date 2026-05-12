import type { ProductRowPriority } from "@/lib/admin/products-list-sales";
import { isListedOnTrendyol } from "@/lib/admin/products-list-sales";

export type ProductListOptRow = {
  id: string;
  name: string | null;
  sku: string | null;
  price: number | null;
  compare_at_price?: number | null;
  stock_quantity: number | null;
  is_active: boolean | null;
  category_id?: string | null;
  trendyol_active: boolean | null;
  trendyol_category_id: string | null;
  trendyol_barcode: string | null;
  trendyol_stock_code: string | null;
  product_images?: { image_url?: string | null; is_cover?: boolean | null }[] | null;
};

export type ProblemLabel = { key: string; label: string; tone: "rose" | "amber" | "stone" };

export function problemLabelsForProduct(input: {
  isActive: boolean;
  listedOnMarketplace: boolean;
  salesQty: number;
  stock: number;
  /** Trafik var ama satış yok → “optimize” sinyali */
  views?: number;
  hasCoverImage?: boolean;
  name?: string;
}): ProblemLabel[] {
  const out: ProblemLabel[] = [];
  const { isActive, listedOnMarketplace, salesQty, stock } = input;
  const views = Number(input.views ?? 0);
  const hasCoverImage = Boolean(input.hasCoverImage);
  const nameLen = String(input.name ?? "").trim().length;

  if (isActive && !listedOnMarketplace) {
    out.push({ key: "marketplace", label: "Pazaryerinde listelenmemiş", tone: "amber" });
  }
  if (stock === 0) {
    out.push({ key: "out_stock", label: "Stoksuz", tone: "rose" });
  } else if (stock > 0 && stock <= 3) {
    out.push({ key: "low_stock", label: "Düşük stok", tone: "amber" });
  }
  if (isActive && listedOnMarketplace && salesQty === 0 && stock > 3 && views >= 8) {
    out.push({
      key: "not_optimized",
      label: "Trafik var, dönüşüm yok — optimize edin",
      tone: "amber",
    });
  } else if (
    isActive &&
    listedOnMarketplace &&
    salesQty === 0 &&
    stock > 3 &&
    (!hasCoverImage || nameLen < 18)
  ) {
    out.push({
      key: "not_optimized",
      label: "Vitrin içeriği zayıf — optimize edin",
      tone: "stone",
    });
  }
  if (isActive && salesQty === 0 && stock > 0) {
    out.push({ key: "no_sales", label: "Bu ürün satmıyor", tone: "stone" });
  }
  return out;
}

const DOMINANT_ISSUE_ORDER = ["out_stock", "marketplace", "not_optimized", "no_sales", "low_stock"] as const;

export function dominantAndSecondaryIssues(labels: ProblemLabel[]): {
  dominant: ProblemLabel | null;
  secondary: ProblemLabel[];
} {
  const byKey = new Map(labels.map((l) => [l.key, l]));
  for (const k of DOMINANT_ISSUE_ORDER) {
    const d = byKey.get(k);
    if (d) {
      return { dominant: d, secondary: labels.filter((l) => l.key !== k) };
    }
  }
  if (labels.length === 0) return { dominant: null, secondary: [] };
  return { dominant: labels[0], secondary: labels.slice(1) };
}

export function problemDominantBadgeClass(tone: ProblemLabel["tone"]): string {
  if (tone === "rose") {
    return "rounded-lg border-2 border-rose-500/90 bg-rose-100/95 px-2.5 py-1.5 text-sm font-extrabold leading-snug text-rose-950 shadow-sm ring-1 ring-rose-600/15";
  }
  if (tone === "amber") {
    return "rounded-lg border-2 border-amber-600/90 bg-amber-100/95 px-2.5 py-1.5 text-sm font-extrabold leading-snug text-amber-950 shadow-sm ring-1 ring-amber-600/15";
  }
  return "rounded-lg border-2 border-stone-500/70 bg-stone-100/95 px-2.5 py-1.5 text-sm font-extrabold leading-snug text-stone-900 shadow-sm ring-1 ring-stone-600/10";
}

export function problemSecondaryPillClass(tone: ProblemLabel["tone"]): string {
  const shell =
    tone === "rose"
      ? "border-rose-200/85 bg-rose-50/90 text-rose-800"
      : tone === "amber"
        ? "border-amber-200/85 bg-amber-50/90 text-amber-900"
        : "border-stone-200/85 bg-stone-50/95 text-stone-600";
  return `rounded-md border px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal ${shell}`;
}

function problemToneClass(tone: ProblemLabel["tone"]): string {
  if (tone === "rose") return "border-rose-300/80 bg-rose-50/95 text-rose-950";
  if (tone === "amber") return "border-amber-300/80 bg-amber-50/95 text-amber-950";
  return "border-stone-300/80 bg-stone-100/90 text-stone-800";
}

export function problemLabelPillClass(tone: ProblemLabel["tone"]): string {
  return `rounded-full border px-2 py-0.5 text-[10px] font-bold leading-tight ${problemToneClass(tone)}`;
}

export type PriorityBlockEntry = {
  product: ProductListOptRow;
  score: number;
  labels: ProblemLabel[];
};

/** En yüksek aciliyet: pazaryeri + stok + satış sinyalleri; varsayılan en fazla 5 benzersiz ürün. */
export function buildPriorityTopFive(
  products: ProductListOptRow[],
  salesByProduct: Map<string, number>,
  viewsByProduct?: Map<string, number>,
  maxEntries: number = 5,
): PriorityBlockEntry[] {
  const scored = products.map((p) => {
    const stock = Number(p.stock_quantity ?? 0);
    const isActive = Boolean(p.is_active);
    const listed = isListedOnTrendyol(p);
    const salesQty = salesByProduct.get(String(p.id)) ?? 0;
    const views = viewsByProduct?.get(String(p.id)) ?? 0;
    const hasCoverImage = Boolean(
      p.product_images?.some((img) => Boolean(img.is_cover) && String(img.image_url ?? "").trim()),
    );
    let score = 0;
    if (isActive && !listed) score += 120;
    if (stock === 0) score += 100;
    else if (stock > 0 && stock <= 3) score += 55;
    if (isActive && listed && salesQty === 0) score += 35;
    else if (isActive && !listed && salesQty === 0) score += 15;
    const labels = problemLabelsForProduct({
      isActive,
      listedOnMarketplace: listed,
      salesQty,
      stock,
      views,
      hasCoverImage,
      name: String(p.name ?? ""),
    });
    return { product: p, score, labels };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(50, maxEntries)));
}

export type PriceBenchmark = {
  /** Katalogdaki aynı kategorideki aktif ürünlerin ortalama fiyatı (en az 2 ürün). */
  categoryAvg: number | null;
  /** Tüm aktif ürünlerin ortalaması (en az 3 ürün). */
  catalogAvg: number | null;
};

export function computePriceBenchmarks(products: ProductListOptRow[]): {
  global: PriceBenchmark["catalogAvg"];
  byCategory: Map<string, number>;
} {
  const activePrices = products
    .filter((p) => Boolean(p.is_active))
    .map((p) => Number(p.price ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  const catalogAvg =
    activePrices.length >= 3 ? activePrices.reduce((a, b) => a + b, 0) / activePrices.length : null;

  const byCategory = new Map<string, number[]>();
  for (const p of products) {
    if (!Boolean(p.is_active)) continue;
    const pr = Number(p.price ?? 0);
    if (!Number.isFinite(pr) || pr <= 0) continue;
    const cid = String(p.category_id ?? "").trim();
    if (!cid) continue;
    const arr = byCategory.get(cid) ?? [];
    arr.push(pr);
    byCategory.set(cid, arr);
  }
  const map = new Map<string, number>();
  for (const [cid, arr] of byCategory) {
    if (arr.length >= 2) {
      map.set(cid, arr.reduce((a, b) => a + b, 0) / arr.length);
    }
  }
  return { global: catalogAvg, byCategory: map };
}

export function marketAvgHintForProduct(
  p: ProductListOptRow,
  benchmarks: ReturnType<typeof computePriceBenchmarks>,
): string | null {
  const cid = String(p.category_id ?? "").trim();
  const cat = cid ? benchmarks.byCategory.get(cid) ?? null : null;
  if (cat != null && Number.isFinite(cat)) {
    return `Kategori ort.: ${cat.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 })}`;
  }
  if (benchmarks.global != null) {
    return `Katalog ort.: ${benchmarks.global.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 })}`;
  }
  return null;
}

export function buildOptimizeHints(input: {
  name: string;
  price: number;
  compareAt: number | null;
  salesQty: number;
  views: number;
  listed: boolean;
  hasCoverImage: boolean;
  marketHint: string | null;
  categoryAvg: number | null;
  catalogAvg: number | null;
  priority: ProductRowPriority;
}): string[] {
  const { name, price, compareAt, salesQty, views, listed, hasCoverImage, categoryAvg, catalogAvg } = input;
  const ref = categoryAvg ?? catalogAvg;
  let priceHint =
    "Fiyat: Katalog / kategori bandına göre marjı ve kampanyayı netleştir (compare-at ile vitrin indirimi).";
  if (ref != null && ref > 0) {
    const ratio = price / ref;
    if (ratio > 1.12)
      priceHint =
        "Fiyat: Ortalamanın üstündesin — değer anlatımı veya kontrollü indirim düşün.";
    else if (ratio < 0.88)
      priceHint = "Fiyat: Ortalamanın altında — marjı koru; çok düşükse hafif yükselt.";
    else priceHint = "Fiyat: Bantta — compare-at ile ‘önce/sonra’ vitrin mesajı ver.";
  }
  const titleHint =
    name.trim().length < 20
      ? "Başlık: Arama niyeti + ürün tipi + malzeme + ana fayda ile uzat."
      : "Başlık: Ana anahtar kelimeyi başa al; faydayı net tek cümlede özetle.";
  const imageHint = hasCoverImage
    ? "Görsel: Kapak + iki ek açı; ışık ve arka planı ürünle uyumlu tut."
    : "Görsel: Kapak ekle — liste ve PDP’de güven ve tıklama oranı artar.";
  const hints = [priceHint, titleHint, imageHint];
  if (compareAt != null && compareAt > price * 1.05) {
    hints.push("Compare-at dolu — indirim algısı için iyi kullanımdasın.");
  }
  if (!listed) hints.push("Trendyol alanlarını tamamla ve gönder — ek satış kanalı.");
  if (views >= 12 && salesQty === 0) hints.push("Trafik yüksek, satış yok — fiyat veya başlıkta A/B test et.");
  if (salesQty === 0 && views < 4) hints.push("Trafik düşük — koleksiyon ve vitrin sıralamasını güncelle.");
  return hints.slice(0, 5);
}
