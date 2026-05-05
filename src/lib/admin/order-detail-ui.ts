export function formatAdminMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency || "TRY" }).format(amount);
}

/**
 * Uzun kimlikleri tek satırda göstermek için: baş…son.
 * Ortada en az bir karakter “gizlenince” kısaltır (kısa sipariş no’ları olduğu gibi bırakır).
 */
export function shortenId(id: string, start = 6, end = 4): string {
  const s = String(id ?? "").trim();
  if (s.length <= start + end + 2) return s;
  return `${s.slice(0, start)}…${s.slice(-end)}`;
}

export function paymentBadgeClasses(status: string): string {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-950 ring-emerald-600/25";
    case "pending":
      return "bg-amber-50 text-amber-950 ring-amber-500/30";
    case "failed":
      return "bg-rose-50 text-rose-950 ring-rose-600/30";
    case "refunded":
      return "bg-violet-50 text-violet-950 ring-violet-600/25";
    default:
      return "bg-stone-100 text-stone-800 ring-stone-500/15";
  }
}

/** Son callback / doğrulama satırı için (passed / failed). */
export function verificationBadgeClasses(status: string | null | undefined): string {
  const t = String(status ?? "")
    .trim()
    .toLowerCase();
  if (t === "passed") return "bg-emerald-50 text-emerald-900 ring-emerald-600/25";
  if (t === "failed") return "bg-rose-50 text-rose-900 ring-rose-600/25";
  return "bg-stone-100 text-stone-700 ring-stone-500/12";
}

export function orderBadgeClasses(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-950 ring-emerald-600/25";
    case "processing":
    case "shipped":
      return "bg-emerald-50/80 text-emerald-900 ring-emerald-600/20";
    case "cancelled":
      return "bg-rose-50 text-rose-950 ring-rose-600/30";
    case "pending":
      return "bg-amber-50 text-amber-950 ring-amber-500/30";
    default:
      return "bg-stone-100 text-stone-800 ring-stone-500/15";
  }
}

export function pickCoverImageUrl(
  imgs: { image_url: string; is_cover?: boolean | null; sort_order?: number | null }[] | null | undefined,
): string | null {
  if (!imgs?.length) return null;
  const sorted = [...imgs].sort((a, b) => {
    const ac = Boolean(a.is_cover);
    const bc = Boolean(b.is_cover);
    if (ac !== bc) return ac ? -1 : 1;
    return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
  });
  const url = sorted[0]?.image_url;
  return url && url.length > 0 ? url : null;
}
