import type { SupabaseClient } from "@supabase/supabase-js";

const CHUNK_SIZE = 200;

/**
 * Bugün görünen client_id'lerden, verilen tarihten önce en az bir olayı olanları döner.
 */
export async function fetchClientIdsSeenBefore(
  admin: SupabaseClient,
  clientIds: string[],
  before: Date,
): Promise<Set<string>> {
  const unique = [...new Set(clientIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return new Set();

  const seen = new Set<string>();
  const beforeIso = before.toISOString();

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    const { data, error } = await admin
      .from("analytics_events")
      .select("client_id")
      .in("client_id", chunk)
      .lt("occurred_at", beforeIso)
      .not("client_id", "is", null)
      .limit(5000);

    if (error) break;

    for (const row of data ?? []) {
      const id = String(row.client_id ?? "").trim();
      if (id) seen.add(id);
    }
  }

  return seen;
}
