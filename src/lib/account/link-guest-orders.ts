import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmailInput } from "@/lib/account/email-input";

export type LinkGuestOrdersResult = {
  linked: number;
  orderIds: string[];
};

/**
 * Misafir checkout siparişlerini (user_id IS NULL), giriş/kayıt yapan kullanıcıya bağlar.
 * Yalnızca normalize edilmiş email tam eşleşmesinde günceller.
 */
export async function linkGuestOrdersToUser(
  admin: SupabaseClient,
  userId: string,
  email: string,
): Promise<LinkGuestOrdersResult> {
  const uid = String(userId ?? "").trim();
  const norm = normalizeEmailInput(email);
  if (!uid || !norm) return { linked: 0, orderIds: [] };

  const { data: rows, error: selectError } = await admin
    .from("orders")
    .select("id,email")
    .is("user_id", null);

  if (selectError) {
    console.error("[linkGuestOrdersToUser] select failed", { userId: uid, message: selectError.message });
    return { linked: 0, orderIds: [] };
  }

  const orderIds = (rows ?? [])
    .filter((r) => normalizeEmailInput(String((r as { email?: string | null }).email ?? "")) === norm)
    .map((r) => String((r as { id: string }).id));

  if (orderIds.length === 0) return { linked: 0, orderIds: [] };

  const { error: updateError } = await admin.from("orders").update({ user_id: uid }).in("id", orderIds);
  if (updateError) {
    console.error("[linkGuestOrdersToUser] update failed", {
      userId: uid,
      orderIds,
      message: updateError.message,
    });
    return { linked: 0, orderIds: [] };
  }

  return { linked: orderIds.length, orderIds };
}
