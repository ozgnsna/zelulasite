/**
 * Sipariş fulfillment zaman damgaları (yorum hatırlatma tetikleyicisi).
 * shipped_at / delivered_at yalnızca ilk kez set edilir (overwrite yok).
 */

export type FulfillmentTimestampFields = {
  shipped_at?: string | null;
  delivered_at?: string | null;
};

export function buildFulfillmentTimestampPatch(
  nextStatus: string,
  existing: FulfillmentTimestampFields,
  nowIso: string = new Date().toISOString(),
): Partial<{ shipped_at: string; delivered_at: string }> {
  const status = String(nextStatus ?? "").trim();
  const patch: Partial<{ shipped_at: string; delivered_at: string }> = {};

  if (status === "shipped" && !existing.shipped_at) {
    patch.shipped_at = nowIso;
  }
  if (status === "hand_delivered") {
    if (!existing.delivered_at) patch.delivered_at = nowIso;
  }
  return patch;
}
