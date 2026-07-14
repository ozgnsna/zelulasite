export const TARGET_AUDIENCES = ["kadin", "erkek", "unisex"] as const;

export type TargetAudience = (typeof TARGET_AUDIENCES)[number];

export const TARGET_AUDIENCE_LABELS: Record<TargetAudience, string> = {
  kadin: "Kadın",
  erkek: "Erkek",
  unisex: "Unisex",
};

/** Erkek hub'da listelenecek DB kategori slug'ları (Faz 1). */
export const ERKEK_CATEGORY_SLUGS = ["bileklik", "yuzuk"] as const;

export type ErkekCategorySlug = (typeof ERKEK_CATEGORY_SLUGS)[number];

export const ERKEK_HUB_HREF = "/erkek";

export function isErkekCategorySlug(slug: string): slug is ErkekCategorySlug {
  return (ERKEK_CATEGORY_SLUGS as readonly string[]).includes(slug);
}

export function erkekCategoryHref(slug: ErkekCategorySlug): string {
  return `${ERKEK_HUB_HREF}/${slug}`;
}

export function erkekCategoryLabel(slug: ErkekCategorySlug): string {
  if (slug === "bileklik") return "Bileklik";
  if (slug === "yuzuk") return "Yüzük";
  return slug;
}

export function parseTargetAudience(raw: unknown): TargetAudience {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "erkek" || v === "unisex") return v;
  return "kadin";
}

/** Filtre: unisex her iki tarafta da görünür. */
export function audienceMatchValues(audience: TargetAudience): TargetAudience[] {
  if (audience === "erkek") return ["erkek", "unisex"];
  if (audience === "kadin") return ["kadin", "unisex"];
  return [audience];
}
