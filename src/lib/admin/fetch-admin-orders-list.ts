import type { AdminOrderListRow } from "@/components/admin/orders/AdminOrdersListShell";
import {
  ADMIN_ORDERS_LIST_LIMIT_ALL,
  ADMIN_ORDERS_LIST_LIMIT_NARROW,
  ADMIN_ORDERS_LIST_SELECT,
  ADMIN_ORDERS_LIST_SELECT_FALLBACK,
  istanbulDayUtcRange,
} from "@/lib/admin/admin-orders-list";
import { normalizeOrdersListFilter } from "@/lib/orders/fulfillment-stage";
import type { SupabaseClient } from "@supabase/supabase-js";

function withShippingNulls(rows: Record<string, unknown>[]): AdminOrderListRow[] {
  return rows.map((r) => ({
    id: String(r.id),
    order_number: String(r.order_number ?? ""),
    customer_name: (r.customer_name as string | null) ?? null,
    total: Number(r.total ?? 0),
    created_at: String(r.created_at ?? ""),
    order_status: String(r.order_status ?? ""),
    payment_status: String(r.payment_status ?? ""),
    shipping_status: (r.shipping_status as string | null) ?? null,
    shipping_provider: (r.shipping_provider as string | null) ?? null,
    shipping_tracking_number: (r.shipping_tracking_number as string | null) ?? null,
  }));
}

function applyListFilter(admin: SupabaseClient, activeFilter: string, select: string) {
  const filter = normalizeOrdersListFilter(activeFilter);
  let req = admin.from("orders").select(select).order("created_at", { ascending: false });

  if (filter === "today") {
    const { start, end } = istanbulDayUtcRange();
    req = req
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .limit(ADMIN_ORDERS_LIST_LIMIT_NARROW);
  } else if (filter === "new") {
    req = req
      .eq("payment_status", "paid")
      .in("order_status", ["pending", "confirmed"])
      .limit(ADMIN_ORDERS_LIST_LIMIT_NARROW);
  } else if (filter === "payment_pending") {
    req = req.eq("payment_status", "pending").limit(ADMIN_ORDERS_LIST_LIMIT_NARROW);
  } else if (filter === "preparing") {
    req = req.eq("order_status", "processing").limit(ADMIN_ORDERS_LIST_LIMIT_NARROW);
  } else if (filter === "in_transit") {
    req = req.eq("order_status", "shipped").limit(ADMIN_ORDERS_LIST_LIMIT_NARROW);
  } else if (filter === "delivered") {
    req = req.eq("order_status", "hand_delivered").limit(ADMIN_ORDERS_LIST_LIMIT_NARROW);
  } else {
    req = req.limit(ADMIN_ORDERS_LIST_LIMIT_ALL);
  }

  return req;
}

export async function fetchAdminOrdersList(
  admin: SupabaseClient,
  activeFilter: string,
): Promise<{ orders: AdminOrderListRow[]; loadError: string | null }> {
  const full = await applyListFilter(admin, activeFilter, ADMIN_ORDERS_LIST_SELECT);
  if (!full.error && full.data) {
    return { orders: withShippingNulls(full.data as unknown as Record<string, unknown>[]), loadError: null };
  }

  const fallback = await applyListFilter(admin, activeFilter, ADMIN_ORDERS_LIST_SELECT_FALLBACK);
  if (!fallback.error && fallback.data) {
    return { orders: withShippingNulls(fallback.data as unknown as Record<string, unknown>[]), loadError: null };
  }

  const msg = full.error?.message ?? fallback.error?.message ?? "Sipariş listesi yüklenemedi.";
  console.error("[admin/orders] list query failed", { full: full.error, fallback: fallback.error });
  return { orders: [], loadError: msg };
}
