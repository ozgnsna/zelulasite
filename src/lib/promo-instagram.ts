/**
 * Instagram’da “takip eden” indirimi: Meta API bireysel takip ilişkisini doğrulamaz;
 * takipçilere paylaştığınız gizli kodu sunucuda doğrularız.
 */
export type InstagramFollowerPromoConfig = { code: string; percent: number };

export function getInstagramFollowerPromo(): InstagramFollowerPromoConfig | null {
  const raw = process.env.INSTAGRAM_FOLLOWER_PROMO_CODE?.trim();
  if (!raw) return null;
  const pct = Number(process.env.INSTAGRAM_FOLLOWER_PROMO_PERCENT ?? 10);
  const percent = Number.isFinite(pct) && pct > 0 && pct <= 100 ? pct : 10;
  return { code: raw.toUpperCase(), percent };
}

export function normalizePromoCodeInput(raw: string | undefined): string {
  return raw?.trim().toUpperCase() ?? "";
}

export function computeInstagramFollowerDiscount(
  subtotal: number,
  rawCode: string,
): { ok: true; discountAmount: number; percent: number; label: "instagram_takipci" } | { ok: false; error: string } {
  const cfg = getInstagramFollowerPromo();
  if (!cfg) return { ok: false, error: "Bu kampanya şu an aktif değil." };
  if (!(subtotal > 0)) return { ok: false, error: "Sepet tutarı geçersiz." };
  const entered = normalizePromoCodeInput(rawCode);
  if (!entered) return { ok: false, error: "İndirim kodunu girin." };
  if (entered !== cfg.code) return { ok: false, error: "Kod geçersiz veya süresi dolmuş olabilir." };
  const rawDiscount = (subtotal * cfg.percent) / 100;
  const discountAmount = Math.min(subtotal, Math.round(rawDiscount * 100) / 100);
  return { ok: true, discountAmount, percent: cfg.percent, label: "instagram_takipci" };
}
