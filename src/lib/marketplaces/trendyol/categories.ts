import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getActiveTrendyolIntegration,
  logMarketplaceSync,
  trendyolHasCredentials,
  trendyolRequest,
} from "@/lib/marketplaces/trendyol/client";

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Trendyol product integration: category attribute list (official path pattern). */
const CATEGORY_ATTRIBUTES_PATH = (categoryId: string) =>
  `/integration/product/product-categories/${encodeURIComponent(categoryId)}/attributes`;

export type CategoryAttributeDefinition = {
  attributeId: number;
  name: string;
  required: boolean;
};

export function extractCategoryAttributeDefinitions(payload: unknown): CategoryAttributeDefinition[] {
  const list = extractAttributesArray(payload);
  const out: CategoryAttributeDefinition[] = [];
  for (const row of list) {
    const attributeId = Number(row.attributeId ?? row.id ?? 0);
    if (!attributeId) continue;
    const required =
      row.required === true || row.isRequired === true || row.mandatory === true;
    const name = String(row.name ?? row.attributeName ?? `Özellik ${attributeId}`);
    out.push({ attributeId, name, required });
  }
  return out;
}

function extractAttributesArray(payload: unknown): Array<Record<string, unknown>> {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  if (typeof payload !== "object") return [];
  const o = payload as Record<string, unknown>;
  if (Array.isArray(o.categoryAttributes)) return o.categoryAttributes as Array<Record<string, unknown>>;
  if (Array.isArray(o.attributes)) return o.attributes as Array<Record<string, unknown>>;
  return [];
}

export function getRequiredDefinitions(defs: CategoryAttributeDefinition[]) {
  return defs.filter((d) => d.required);
}

/** Product `trendyol_category_attributes` JSON: [{ attributeId, attributeValueId? , customAttributeValue? }, ...] */
export function getSatisfiedAttributeIdsFromProduct(productAttributes: unknown): Set<number> {
  const set = new Set<number>();
  if (!Array.isArray(productAttributes)) return set;
  for (const row of productAttributes) {
    if (row == null || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const attributeId = Number(r.attributeId ?? 0);
    if (!attributeId) continue;
    const valueId = r.attributeValueId;
    const custom = r.customAttributeValue;
    const hasValueId = valueId != null && valueId !== "" && Number(valueId) > 0;
    const hasCustom = custom != null && String(custom).trim().length > 0;
    if (hasValueId || hasCustom) set.add(attributeId);
  }
  return set;
}

export function computeMissingRequiredAttributes(
  definitions: CategoryAttributeDefinition[],
  productAttributes: unknown,
) {
  const required = getRequiredDefinitions(definitions);
  const satisfied = getSatisfiedAttributeIdsFromProduct(productAttributes);
  const missing = required.filter((d) => !satisfied.has(d.attributeId));
  return {
    requiredCount: required.length,
    missing,
  };
}

export type CachedCategoryRow = {
  category_id: string;
  payload: unknown;
  fetched_at: string;
};

export function buildCategoryReadinessFromCache(
  cache: CachedCategoryRow | undefined,
  productAttributes: unknown,
): {
  resolved: boolean;
  requiredCount: number;
  missingRequired: { attributeId: number; name: string }[];
} {
  if (!cache?.payload) {
    return { resolved: false, requiredCount: 0, missingRequired: [] };
  }
  const defs = extractCategoryAttributeDefinitions(cache.payload);
  const requiredDefs = getRequiredDefinitions(defs);
  if (requiredDefs.length === 0) {
    return { resolved: true, requiredCount: 0, missingRequired: [] };
  }
  const { missing } = computeMissingRequiredAttributes(defs, productAttributes);
  return {
    resolved: true,
    requiredCount: requiredDefs.length,
    missingRequired: missing.map((m) => ({ attributeId: m.attributeId, name: m.name })),
  };
}

export function isCategoryCacheFresh(fetchedAt: string) {
  const t = new Date(fetchedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= CACHE_MAX_AGE_MS;
}

export async function fetchTrendyolCategoryAttributesCached(
  admin: SupabaseClient,
  categoryId: string,
  options?: { forceRefresh?: boolean },
) {
  const trimmed = categoryId.trim();
  if (!trimmed) {
    return { ok: false as const, message: "category_id boş." };
  }

  const integration = await getActiveTrendyolIntegration(admin);
  if (!integration?.id) {
    await logMarketplaceSync(admin, {
      integrationId: null,
      entityType: "category",
      entityId: trimmed,
      action: "category_attributes_fetch",
      status: "skipped",
      message: "Trendyol entegrasyon kaydı yok.",
    });
    return { ok: false as const, message: "Entegrasyon kaydı yok." };
  }

  if (!trendyolHasCredentials(integration)) {
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "category",
      entityId: trimmed,
      action: "category_attributes_fetch",
      status: "skipped",
      message: "Trendyol kimlik bilgileri eksik; kategori özellikleri çekilmedi.",
    });
    return { ok: false as const, message: "Kimlik bilgileri eksik." };
  }

  if (!options?.forceRefresh) {
    const { data: cached } = await admin
      .from("marketplace_category_attribute_cache")
      .select("payload,fetched_at")
      .eq("integration_id", integration.id)
      .eq("category_id", trimmed)
      .maybeSingle();
    if (cached?.payload != null && isCategoryCacheFresh(String(cached.fetched_at))) {
      return { ok: true as const, fromCache: true, payload: cached.payload };
    }
  }

  try {
    const payload = await trendyolRequest<unknown>({
      integration,
      method: "GET",
      path: CATEGORY_ATTRIBUTES_PATH(trimmed),
    });
    const now = new Date().toISOString();
    await admin.from("marketplace_category_attribute_cache").upsert(
      {
        integration_id: integration.id,
        marketplace: "trendyol",
        category_id: trimmed,
        payload,
        fetched_at: now,
      },
      { onConflict: "integration_id,category_id" },
    );
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "category",
      entityId: trimmed,
      action: "category_attributes_fetch",
      status: "success",
      message: "Kategori özellikleri çekildi ve önbelleğe alındı.",
      responsePayload: { categoryId: trimmed },
    });
    return { ok: true as const, fromCache: false, payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kategori özellikleri alınamadı.";
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "category",
      entityId: trimmed,
      action: "category_attributes_fetch",
      status: "error",
      message,
      requestPayload: { path: CATEGORY_ATTRIBUTES_PATH(trimmed) },
    });
    return { ok: false as const, message };
  }
}
