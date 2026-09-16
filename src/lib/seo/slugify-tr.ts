/** Türkçe ürün adı → URL slug (TR karakter dönüşümü). */

export function slugifyTrFromName(name: string): string {
  let s = name.trim();
  const pairs: [string, string][] = [
    ["ğ", "g"],
    ["ü", "u"],
    ["ş", "s"],
    ["ı", "i"],
    ["ö", "o"],
    ["ç", "c"],
    ["Ğ", "g"],
    ["Ü", "u"],
    ["Ş", "s"],
    ["İ", "i"],
    ["I", "i"],
    ["Ö", "o"],
    ["Ç", "c"],
  ];
  for (const [a, b] of pairs) {
    s = s.split(a).join(b);
  }
  s = s.toLocaleLowerCase("tr-TR");
  // Latin aksanlar (é, è, â, î, û, …): NFD + birleşik işaretleri sil → e, a, i, u
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s || "urun";
}

export function sanitizeGeneratedSlug(slug: string): string {
  // Guard rail: historical source suffixes should never survive generation.
  let out = slug;
  // remove terminal tokens like -ig, -instagram, -source (single or repeated at end)
  out = out.replace(/(?:-(?:ig|instagram|source))+$/i, "");
  // remove patterns like -ig-123 or -instagram-abc at end
  out = out.replace(/-(?:ig|instagram|source)-[a-z0-9]+$/i, "");
  return out.replace(/-+/g, "-").replace(/^-|-$/g, "");
}
