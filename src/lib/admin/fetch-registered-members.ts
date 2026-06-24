import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin/auth";

export type RegisteredMemberRow = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  registeredAt: string;
  paidOrders: number;
  totalOrders: number;
  giftCardBalanceTry: number;
  isAdminAccount: boolean;
};

function normalizeSearch(q: string) {
  return q.trim().toLowerCase();
}

function matchesQuery(row: RegisteredMemberRow, q: string): boolean {
  const needle = normalizeSearch(q);
  if (!needle) return true;
  return (
    row.email.toLowerCase().includes(needle) ||
    row.fullName.toLowerCase().includes(needle) ||
    (row.phone ?? "").toLowerCase().includes(needle)
  );
}

type GiftCardBalanceRow = {
  recipient_user_id?: string | null;
  recipient_email: string | null;
  balance_remaining: number | null;
  status: string | null;
};

export async function fetchRegisteredMembers(
  admin: SupabaseClient,
  opts?: { q?: string; limit?: number },
): Promise<{ members: RegisteredMemberRow[]; totalUsers: number; loadError?: string }> {
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500);
  const q = String(opts?.q ?? "");

  const authUsers: Array<{
    id: string;
    email?: string;
    created_at?: string;
    user_metadata?: Record<string, unknown>;
  }> = [];

  try {
    let page = 1;
    while (authUsers.length < 2000) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        return { members: [], totalUsers: 0, loadError: error.message };
      }
      authUsers.push(...(data.users ?? []));
      if ((data.users ?? []).length < 1000) break;
      page += 1;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Auth kullanıcı listesi alınamadı.";
    return { members: [], totalUsers: 0, loadError: message };
  }

  const ids = authUsers.map((u) => u.id);
  if (ids.length === 0) return { members: [], totalUsers: 0 };

  async function fetchInChunks<T>(
    table: string,
    select: string,
    column: string,
    values: string[],
  ): Promise<T[]> {
    const chunkSize = 80;
    const rows: T[] = [];
    for (let i = 0; i < values.length; i += chunkSize) {
      const chunk = values.slice(i, i + chunkSize);
      const { data, error } = await admin.from(table).select(select).in(column, chunk);
      if (error) throw new Error(error.message);
      rows.push(...((data ?? []) as T[]));
    }
    return rows;
  }

  let profiles: Array<{ id: string; full_name: string | null; phone: string | null }> = [];
  let orders: Array<{
    user_id: string | null;
    payment_status: string;
    order_status: string;
    email: string | null;
  }> = [];
  let giftCards: GiftCardBalanceRow[] = [];

  try {
    [profiles, orders] = await Promise.all([
      fetchInChunks<{ id: string; full_name: string | null; phone: string | null }>(
        "profiles",
        "id,full_name,phone",
        "id",
        ids,
      ),
      fetchInChunks<{
        user_id: string | null;
        payment_status: string;
        order_status: string;
        email: string | null;
      }>("orders", "user_id,payment_status,order_status,email", "user_id", ids),
    ]);

    const giftCardsResult = await admin
      .from("gift_cards")
      .select("recipient_user_id,recipient_email,balance_remaining,status")
      .in("status", ["active"]);

    giftCards = (giftCardsResult.data ?? []) as GiftCardBalanceRow[];
    if (giftCardsResult.error?.message?.includes("recipient_user_id")) {
      const fallback = await admin
        .from("gift_cards")
        .select("recipient_email,balance_remaining,status")
        .in("status", ["active"]);
      if (fallback.error) throw new Error(fallback.error.message);
      giftCards = (fallback.data ?? []) as GiftCardBalanceRow[];
    } else if (giftCardsResult.error) {
      throw new Error(giftCardsResult.error.message);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Üye verileri yüklenemedi.";
    return { members: [], totalUsers: authUsers.length, loadError: message };
  }

  const profileById = new Map(profiles.map((p) => [String(p.id), p]));
  const paidOrdersByUser = new Map<string, number>();
  const totalOrdersByUser = new Map<string, number>();

  for (const o of orders) {
    const uid = String(o.user_id ?? "").trim();
    if (!uid) continue;
    totalOrdersByUser.set(uid, (totalOrdersByUser.get(uid) ?? 0) + 1);
    if (o.payment_status === "paid" && String(o.order_status ?? "") !== "cancelled") {
      paidOrdersByUser.set(uid, (paidOrdersByUser.get(uid) ?? 0) + 1);
    }
  }

  const giftBalanceByUser = new Map<string, number>();
  for (const g of giftCards) {
    const uid = g.recipient_user_id ? String(g.recipient_user_id) : null;
    const email = String(g.recipient_email ?? "").trim().toLowerCase();
    const balance = Math.max(0, Number(g.balance_remaining ?? 0));
    if (uid) {
      giftBalanceByUser.set(uid, (giftBalanceByUser.get(uid) ?? 0) + balance);
    } else if (email) {
      giftBalanceByUser.set(`e:${email}`, (giftBalanceByUser.get(`e:${email}`) ?? 0) + balance);
    }
  }

  const members: RegisteredMemberRow[] = authUsers
    .map((u) => {
      const email = String(u.email ?? "").trim();
      const profile = profileById.get(u.id);
      const metaName = String(u.user_metadata?.full_name ?? "").trim();
      const fullName = String(profile?.full_name ?? metaName).trim() || email || "—";
      const giftById = giftBalanceByUser.get(u.id) ?? 0;
      const giftByEmail = giftBalanceByUser.get(`e:${email.toLowerCase()}`) ?? 0;

      return {
        id: u.id,
        email,
        fullName,
        phone: profile?.phone ? String(profile.phone) : null,
        registeredAt: String(u.created_at ?? ""),
        paidOrders: paidOrdersByUser.get(u.id) ?? 0,
        totalOrders: totalOrdersByUser.get(u.id) ?? 0,
        giftCardBalanceTry: Math.max(giftById, giftByEmail),
        isAdminAccount: isAdminEmail(email),
      };
    })
    .filter((row) => matchesQuery(row, q))
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
    .slice(0, limit);

  return { members, totalUsers: authUsers.length };
}
