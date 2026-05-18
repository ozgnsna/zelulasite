import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractCategoryAttributesForPicker,
  type TrendyolCategoryAttributePickerRow,
} from "@/lib/marketplaces/trendyol/categories";
import type { Product } from "@/lib/types";

export type PdpTraitOption = { id: string; label: string };

export type PdpTraitGroup = {
  key: string;
  label: string;
  options: PdpTraitOption[];
  selectedId: string;
};

const TECHNICAL_ATTR = /(menşe|mense|origin|ağırlık|weight|desi|ean|gtin|web\s*color|renk\s*kodu|fatura|invoice|ambalaj|package|gönderi|shipment|sku\s*tip|varyant\s*kod)/i;

const LABEL_RULES: { key: string; label: string; test: RegExp }[] = [
  { key: "size", label: "Beden", test: /beden|boyut|ebat|ölçü|uzunluk|çap|size|cm\b/i },
  { key: "color", label: "Renk", test: /^renk|rengi|color/i },
  { key: "material", label: "Materyal", test: /materyal|material/i },
];

function classifyAttrName(name: string): { key: string; label: string } | null {
  const trimmed = name.trim();
  if (!trimmed || TECHNICAL_ATTR.test(trimmed)) return null;
  for (const rule of LABEL_RULES) {
    if (rule.test.test(trimmed)) return { key: rule.key, label: rule.label };
  }
  return null;
}

function parseProductAttrs(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === "object") as Array<Record<string, unknown>>;
}

function resolveAttrLabel(
  row: TrendyolCategoryAttributePickerRow,
  productAttr: Record<string, unknown>,
): string | null {
  const custom = productAttr.customAttributeValue;
  if (custom != null && String(custom).trim()) return String(custom).trim();

  const valueId = Number(productAttr.attributeValueId ?? 0);
  if (!valueId) return null;
  const match = row.values.find((v) => v.id === valueId);
  return match?.name?.trim() || null;
}

async function loadCategoryPickerRows(
  admin: SupabaseClient,
  categoryId: string,
): Promise<TrendyolCategoryAttributePickerRow[]> {
  const trimmed = categoryId.trim();
  if (!trimmed) return [];

  const { data: integration } = await admin
    .from("marketplace_integrations")
    .select("id")
    .eq("marketplace", "trendyol")
    .maybeSingle();
  if (!integration?.id) return [];

  const { data: cache } = await admin
    .from("marketplace_category_attribute_cache")
    .select("payload")
    .eq("integration_id", integration.id)
    .eq("category_id", trimmed)
    .maybeSingle();

  if (!cache?.payload) return [];
  return extractCategoryAttributesForPicker(cache.payload);
}

function upsertGroup(groups: Map<string, PdpTraitGroup>, key: string, label: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  const id = `${key}:${trimmed.toLocaleLowerCase("tr-TR")}`;
  const existing = groups.get(key);
  if (existing) {
    if (!existing.options.some((o) => o.id === id)) {
      existing.options.push({ id, label: trimmed });
    }
    return;
  }
  groups.set(key, {
    key,
    label,
    options: [{ id, label: trimmed }],
    selectedId: id,
  });
}

/** Vitrin seçenekleri: renk, materyal, beden (Trendyol öznitelikleri + ürün alanları). */
export async function resolvePdpTraitGroups(
  product: Pick<Product, "color" | "material" | "trendyol_category_id" | "trendyol_category_attributes">,
  admin: SupabaseClient,
): Promise<PdpTraitGroup[]> {
  const groups = new Map<string, PdpTraitGroup>();
  const productAttrs = parseProductAttrs(product.trendyol_category_attributes);
  const categoryId = String(product.trendyol_category_id ?? "").trim();

  let pickerRows: TrendyolCategoryAttributePickerRow[] = [];
  if (categoryId && productAttrs.length > 0) {
    pickerRows = await loadCategoryPickerRows(admin, categoryId);
  }

  const rowById = new Map(pickerRows.map((r) => [r.attributeId, r]));

  for (const attr of productAttrs) {
    const attributeId = Number(attr.attributeId ?? 0);
    if (!attributeId) continue;
    const row = rowById.get(attributeId);
    if (!row) continue;
    const classified = classifyAttrName(row.name);
    if (!classified) continue;
    const label = resolveAttrLabel(row, attr);
    if (!label) continue;
    upsertGroup(groups, classified.key, classified.label, label);
  }

  if (product.color?.trim() && !groups.has("color")) {
    upsertGroup(groups, "color", "Renk", product.color);
  }
  if (product.material?.trim() && !groups.has("material")) {
    upsertGroup(groups, "material", "Materyal", product.material);
  }

  const order = ["size", "color", "material"];
  return order
    .map((key) => groups.get(key))
    .filter((g): g is PdpTraitGroup => Boolean(g));
}
