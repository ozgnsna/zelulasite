const TR_WORD_CHARS = "a-z0-9çğıöşüâîû";

export function normalizeAdminProductSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase("tr-TR");
}

/**
 * Admin ürün listesi araması — «inci» sorgusunun «zincir» içinde yanlış eşleşmesini engeller.
 * Kelime başı veya kelime sınırı sonrası eşleşme kullanır (tr-TR).
 */
export function productMatchesAdminSearch(name: string, sku: string, query: string): boolean {
  const q = normalizeAdminProductSearchQuery(query);
  if (!q) return true;

  const text = `${name ?? ""} ${sku ?? ""}`.toLocaleLowerCase("tr-TR");
  const words = text.split(new RegExp(`[^${TR_WORD_CHARS}]+`, "iu")).filter(Boolean);
  if (words.some((w) => w === q || w.startsWith(q))) return true;

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundary = new RegExp(`(?:^|[^${TR_WORD_CHARS}])${escaped}`, "iu");
  return boundary.test(text);
}
