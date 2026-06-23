import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountGiftCard = {
  id: string;
  initialBalance: number;
  balanceRemaining: number;
  currency: string;
  status: string;
  codeLast4: string;
  accountVisibleCode: string | null;
  personalMessage: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export async function listGiftCardsForAccount(
  admin: SupabaseClient,
  userId: string,
  email: string,
): Promise<AccountGiftCard[]> {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!normalizedEmail) return [];

  const fullSelect =
    "id,initial_balance,balance_remaining,currency,status,code_last4,account_visible_code,personal_message,expires_at,created_at,recipient_user_id,recipient_email";
  const baseSelect =
    "id,initial_balance,balance_remaining,currency,status,code_last4,personal_message,expires_at,created_at,recipient_email";

  let rows: Record<string, unknown>[] | null = null;

  const full = await admin
    .from("gift_cards")
    .select(fullSelect)
    .or(`recipient_user_id.eq.${userId},recipient_email.ilike.${normalizedEmail}`)
    .in("status", ["active", "depleted"])
    .order("created_at", { ascending: false });

  if (full.error?.message?.includes("account_visible_code") || full.error?.message?.includes("recipient_user_id")) {
    const basic = await admin
      .from("gift_cards")
      .select(baseSelect)
      .ilike("recipient_email", normalizedEmail)
      .in("status", ["active", "depleted"])
      .order("created_at", { ascending: false });
    if (basic.error) {
      console.warn("[account/gift-cards]", basic.error.message);
      return [];
    }
    rows = (basic.data ?? []) as Record<string, unknown>[];
  } else if (full.error) {
    console.warn("[account/gift-cards]", full.error.message);
    return [];
  } else {
    rows = (full.data ?? []) as Record<string, unknown>[];
  }

  return rows.map((row) => ({
    id: String(row.id),
    initialBalance: Number(row.initial_balance ?? 0),
    balanceRemaining: Number(row.balance_remaining ?? 0),
    currency: String(row.currency ?? "TRY"),
    status: String(row.status ?? "active"),
    codeLast4: String(row.code_last4 ?? ""),
    accountVisibleCode: row.account_visible_code ? String(row.account_visible_code) : null,
    personalMessage: row.personal_message ? String(row.personal_message) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    createdAt: String(row.created_at ?? ""),
  }));
}
