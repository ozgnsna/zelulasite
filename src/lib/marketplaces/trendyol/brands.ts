import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveTrendyolIntegration, trendyolHasCredentials, trendyolRequest, TrendyolRequestError } from "./client";

export type TrendyolBrandHit = {
  id: number;
  name: string;
};

function parseBrandsByNameResponse(parsed: unknown): TrendyolBrandHit[] {
  if (!Array.isArray(parsed)) return [];
  const out: TrendyolBrandHit[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = Number(o.id);
    const name = String(o.name ?? "").trim();
    if (!Number.isFinite(id) || id <= 0 || !name) continue;
    out.push({ id, name });
  }
  return out;
}

/**
 * Trendyol getBrandsName — isim eşleşmesi API tarafında büyük/küçük harfe duyarlı olabilir.
 * @see https://developers.trendyol.com/docs/trendyol-marka-listesi-getbrands
 */
export async function fetchTrendyolBrandsByName(
  admin: SupabaseClient,
  name: string,
): Promise<{ ok: true; brands: TrendyolBrandHit[] } | { ok: false; message: string }> {
  const integration = await getActiveTrendyolIntegration(admin);
  if (!integration || !trendyolHasCredentials(integration)) {
    return {
      ok: false,
      message: "Trendyol entegrasyonu eksik veya pasif. API anahtarı, seller_id ve aktif işaretini kontrol edin.",
    };
  }
  const q = String(name ?? "").trim();
  if (q.length < 2) {
    return { ok: false, message: "En az 2 karakter yazın." };
  }
  try {
    const path = `/integration/product/brands/by-name?name=${encodeURIComponent(q)}`;
    const parsed = await trendyolRequest<unknown>({ integration, method: "GET", path });
    return { ok: true, brands: parseBrandsByNameResponse(parsed) };
  } catch (error) {
    const msg =
      error instanceof TrendyolRequestError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Marka araması başarısız.";
    return { ok: false, message: msg };
  }
}
