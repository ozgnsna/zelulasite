import type { SupabaseClient } from "@supabase/supabase-js";

export type PurgeAllOrdersResult =
  | { ok: true; ordersDeleted: number }
  | { ok: false; message: string };

/**
 * Tüm siparişleri ve bağlı operasyon kayıtlarını siler; ZLL sayacını 0001’e alır.
 * Yalnızca test ortamı / bilinçli sıfırlama için.
 */
export async function purgeAllOrdersAndResetCounter(admin: SupabaseClient): Promise<PurgeAllOrdersResult> {
  const { count: orderCount, error: countError } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true });
  if (countError) {
    return { ok: false, message: countError.message };
  }

  const { error: ledgerErr } = await admin.from("loyalty_points_ledger").delete().not("order_id", "is", null);
  if (ledgerErr) return { ok: false, message: ledgerErr.message };

  const { error: gcLedgerErr } = await admin.from("gift_card_ledger").delete().not("order_id", "is", null);
  if (gcLedgerErr) return { ok: false, message: gcLedgerErr.message };

  const { error: payLogErr } = await admin.from("payment_logs").delete().not("id", "is", null);
  if (payLogErr) return { ok: false, message: payLogErr.message };

  const { error: deleteErr } = await admin.from("orders").delete().not("id", "is", null);
  if (deleteErr) return { ok: false, message: deleteErr.message };

  const { error: resetErr } = await admin.rpc("reset_order_public_number_sequence");
  if (resetErr) {
    return {
      ok: false,
      message: `Siparişler silindi ancak sayaç sıfırlanamadı: ${resetErr.message}. Supabase migration reset_order_public_number_sequence çalıştırın.`,
    };
  }

  return { ok: true, ordersDeleted: orderCount ?? 0 };
}
