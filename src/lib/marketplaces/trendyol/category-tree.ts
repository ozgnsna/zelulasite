import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getActiveTrendyolIntegration,
  logMarketplaceSync,
  trendyolHasCredentials,
  trendyolRequest,
} from "@/lib/marketplaces/trendyol/client";

const CATEGORY_TREE_PATH = "/integration/product/product-categories";
const TREE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type TrendyolCategoryLeaf = {
  id: string;
  name: string;
  path: string;
};

type RawNode = {
  id?: unknown;
  name?: unknown;
  subCategories?: unknown;
};

function isTreeCacheFresh(fetchedAt: string): boolean {
  const t = new Date(fetchedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= TREE_CACHE_MAX_AGE_MS;
}

function normalizeTreeRoots(response: unknown): RawNode[] {
  if (response == null) return [];
  if (Array.isArray(response)) return response as RawNode[];
  if (typeof response === "object") {
    const o = response as Record<string, unknown>;
    if (Array.isArray(o.categories)) return o.categories as RawNode[];
    if (Array.isArray(o.content)) return o.content as RawNode[];
    if (o.id != null || Array.isArray(o.subCategories)) return [response as RawNode];
  }
  return [];
}

/** Only leaf categories (no subcategories) are valid for createProduct. */
export function flattenTrendyolCategoryLeaves(node: RawNode, ancestorNames: string[]): TrendyolCategoryLeaf[] {
  const name = String(node.name ?? "").trim();
  const id = String(node.id ?? "").trim();
  const subs = Array.isArray(node.subCategories) ? (node.subCategories as RawNode[]) : [];
  const pathParts = [...ancestorNames, name].filter(Boolean);

  if (subs.length === 0) {
    if (!id) return [];
    return [{ id, name: name || id, path: pathParts.join(" › ") || name || id }];
  }

  let out: TrendyolCategoryLeaf[] = [];
  for (const child of subs) {
    out = out.concat(flattenTrendyolCategoryLeaves(child, pathParts));
  }
  return out;
}

export function flattenTrendyolCategoryTreePayload(payload: unknown): TrendyolCategoryLeaf[] {
  const roots = normalizeTreeRoots(payload);
  let all: TrendyolCategoryLeaf[] = [];
  for (const r of roots) {
    all = all.concat(flattenTrendyolCategoryLeaves(r, []));
  }
  return all;
}

function tokenizeSearchQuery(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[\s,;]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * Client-side filter over flattened leaves (tree loaded from cache or API).
 */
export function searchTrendyolCategoryLeaves(
  leaves: TrendyolCategoryLeaf[],
  query: string,
  limit = 25,
): TrendyolCategoryLeaf[] {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return [];

  const scored = leaves
    .map((leaf) => {
      const hay = `${leaf.name} ${leaf.path}`.toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (leaf.name.toLowerCase() === tok) score += 12;
        else if (leaf.name.toLowerCase().includes(tok)) score += 8;
        else if (hay.includes(tok)) score += 4;
      }
      return { leaf, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.leaf.name.localeCompare(b.leaf.name, "tr"));

  const seen = new Set<string>();
  const out: TrendyolCategoryLeaf[] = [];
  for (const { leaf } of scored) {
    if (seen.has(leaf.id)) continue;
    seen.add(leaf.id);
    out.push(leaf);
    if (out.length >= limit) break;
  }
  return out;
}

const TRENDYOL_STORE_HEADERS = {
  storeFrontCode: "TR",
  "Accept-Language": "tr-TR",
};

export async function fetchTrendyolCategoryTreeCached(
  admin: SupabaseClient,
  options?: { forceRefresh?: boolean },
): Promise<
  { ok: true; leaves: TrendyolCategoryLeaf[]; fromCache: boolean } | { ok: false; message: string; leaves: [] }
> {
  const integration = await getActiveTrendyolIntegration(admin);
  if (!integration?.id) {
    return { ok: false, message: "Trendyol entegrasyon kaydı yok.", leaves: [] };
  }
  if (!trendyolHasCredentials(integration)) {
    return { ok: false, message: "Trendyol kimlik bilgileri eksik.", leaves: [] };
  }

  if (!options?.forceRefresh) {
    const { data: row } = await admin
      .from("marketplace_category_tree_cache")
      .select("payload,fetched_at")
      .eq("integration_id", integration.id)
      .maybeSingle();
    if (row?.payload != null && isTreeCacheFresh(String(row.fetched_at))) {
      return { ok: true, leaves: flattenTrendyolCategoryTreePayload(row.payload), fromCache: true };
    }
  }

  try {
    const payload = await trendyolRequest<unknown>({
      integration,
      method: "GET",
      path: CATEGORY_TREE_PATH,
      headers: TRENDYOL_STORE_HEADERS,
    });
    const now = new Date().toISOString();
    await admin.from("marketplace_category_tree_cache").upsert(
      {
        integration_id: integration.id,
        marketplace: "trendyol",
        payload,
        fetched_at: now,
      },
      { onConflict: "integration_id" },
    );
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "category",
      entityId: "tree",
      action: "category_tree_fetch",
      status: "success",
      message: "Kategori ağacı çekildi ve önbelleğe alındı.",
      responsePayload: { path: CATEGORY_TREE_PATH },
    });
    return { ok: true, leaves: flattenTrendyolCategoryTreePayload(payload), fromCache: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kategori ağacı alınamadı.";
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "category",
      entityId: "tree",
      action: "category_tree_fetch",
      status: "error",
      message,
      requestPayload: { path: CATEGORY_TREE_PATH },
    });
    return { ok: false, message, leaves: [] };
  }
}
