import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sendReviewReminderEmail,
  type ReviewReminderProduct,
} from "@/lib/notifications/review-reminder-email";

export const REVIEW_REMINDER_LOOKBACK_DAYS = 60;
export const REVIEW_REMINDER_SHIPPED_DELAY_DAYS = 7;
export const REVIEW_REMINDER_DELIVERED_DELAY_DAYS = 2;
export const REVIEW_REMINDER_MAX_PER_RUN = 30;

export type ReviewReminderCandidate = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  userId: string | null;
  orderStatus: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  products: ReviewReminderProduct[];
  trigger: "shipped_7d" | "delivered_2d";
};

export type ReviewReminderRunResult = {
  ok: boolean;
  dryRun: boolean;
  candidates: number;
  eligibleAfterProductFilter: number;
  sent: number;
  errors: number;
  skippedNoEmail: number;
  skippedAllReviewed: number;
  capped: boolean;
  samples: Array<{
    orderNumber: string;
    trigger: string;
    productCount: number;
    email: string;
    action: "would_send" | "sent" | "error" | "skipped";
    error?: string;
  }>;
  message?: string;
};

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function isDue(iso: string | null | undefined, delayDays: number, now: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return t + delayDays * 24 * 60 * 60 * 1000 <= now;
}

function resolveTrigger(row: {
  order_status: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}): "shipped_7d" | "delivered_2d" | null {
  const now = Date.now();
  const status = String(row.order_status ?? "").trim();

  // shipped_at / delivered_at null → aday değil (backfill yok; eski siparişler atlanır)
  if (status === "shipped") {
    if (!row.shipped_at) return null;
    if (isDue(row.shipped_at, REVIEW_REMINDER_SHIPPED_DELAY_DAYS, now)) return "shipped_7d";
    return null;
  }
  if (status === "hand_delivered") {
    if (!row.delivered_at) return null;
    if (isDue(row.delivered_at, REVIEW_REMINDER_DELIVERED_DELAY_DAYS, now)) return "delivered_2d";
    return null;
  }
  return null;
}

/**
 * Aday siparişleri bulur, ürün filtreler, (dryRun değilse) e-posta gönderir.
 */
export async function runReviewReminders(
  admin: SupabaseClient,
  opts?: { dryRun?: boolean; limit?: number },
): Promise<ReviewReminderRunResult> {
  const dryRun = Boolean(opts?.dryRun);
  const limit = Math.min(
    Math.max(1, Math.floor(opts?.limit ?? REVIEW_REMINDER_MAX_PER_RUN)),
    REVIEW_REMINDER_MAX_PER_RUN,
  );
  const since = daysAgoIso(REVIEW_REMINDER_LOOKBACK_DAYS);

  type OrderRow = {
    id: string;
    order_number: string | null;
    customer_name: string | null;
    email: string | null;
    user_id: string | null;
    order_status: string | null;
    payment_status: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    created_at: string | null;
    review_reminder_sent_at: string | null;
  };

  const { data: ordersRaw, error: ordersErr } = await admin
    .from("orders")
    .select(
      "id,order_number,customer_name,email,user_id,order_status,payment_status,shipped_at,delivered_at,created_at,review_reminder_sent_at",
    )
    .eq("payment_status", "paid")
    .in("order_status", ["shipped", "hand_delivered"])
    .is("review_reminder_sent_at", null)
    .gte("created_at", since)
    // Null timestamp'ler aday değil (backfill yok)
    .or(
      "and(order_status.eq.shipped,shipped_at.not.is.null),and(order_status.eq.hand_delivered,delivered_at.not.is.null)",
    )
    .order("created_at", { ascending: true })
    .limit(200);

  if (ordersErr) {
    return {
      ok: false,
      dryRun,
      candidates: 0,
      eligibleAfterProductFilter: 0,
      sent: 0,
      errors: 0,
      skippedNoEmail: 0,
      skippedAllReviewed: 0,
      capped: false,
      samples: [],
      message: ordersErr.message,
    };
  }

  const orders = (ordersRaw ?? []) as OrderRow[];

  const dueRows = orders.filter((o) => resolveTrigger(o) != null);
  const candidates = dueRows.length;

  if (dueRows.length === 0) {
    return {
      ok: true,
      dryRun,
      candidates: 0,
      eligibleAfterProductFilter: 0,
      sent: 0,
      errors: 0,
      skippedNoEmail: 0,
      skippedAllReviewed: 0,
      capped: false,
      samples: [],
      message: "No due orders",
    };
  }

  const orderIds = dueRows.map((o) => String(o.id));
  const { data: items } = await admin
    .from("order_items")
    .select("order_id,product_id,product:products(id,name,slug)")
    .in("order_id", orderIds)
    .limit(2000);

  const productsByOrder = new Map<string, Array<{ productId: string; name: string; slug: string }>>();
  for (const row of items ?? []) {
    const oid = String(row.order_id ?? "");
    const product = row.product as
      | { id?: string; name?: string; slug?: string }
      | { id?: string; name?: string; slug?: string }[]
      | null;
    const p = Array.isArray(product) ? product[0] : product;
    const productId = String(p?.id ?? row.product_id ?? "").trim();
    const slug = String(p?.slug ?? "").trim();
    const name = String(p?.name ?? "Ürün").trim();
    if (!oid || !productId || !slug) continue;
    const list = productsByOrder.get(oid) ?? [];
    if (!list.some((x) => x.productId === productId)) {
      list.push({ productId, name, slug });
    }
    productsByOrder.set(oid, list);
  }

  const userIds = [
    ...new Set(dueRows.map((o) => String(o.user_id ?? "").trim()).filter(Boolean)),
  ];
  const reviewedByUser = new Map<string, Set<string>>();
  if (userIds.length > 0) {
    const { data: reviews } = await admin
      .from("customer_product_reviews")
      .select("user_id,product_id,status")
      .in("user_id", userIds)
      .in("status", ["pending", "approved"]);
    for (const r of reviews ?? []) {
      const uid = String(r.user_id ?? "");
      const pid = String(r.product_id ?? "");
      if (!uid || !pid) continue;
      const set = reviewedByUser.get(uid) ?? new Set();
      set.add(pid);
      reviewedByUser.set(uid, set);
    }
  }

  let skippedAllReviewed = 0;
  let skippedNoEmail = 0;
  const queue: ReviewReminderCandidate[] = [];

  for (const o of dueRows) {
    const trigger = resolveTrigger(o);
    if (!trigger) continue;
    const email = String(o.email ?? "").trim();
    if (!email) {
      skippedNoEmail += 1;
      continue;
    }
    const uid = String(o.user_id ?? "").trim() || null;
    const allProducts = productsByOrder.get(String(o.id)) ?? [];
    const reviewed = uid ? reviewedByUser.get(uid) : undefined;
    const pendingProducts = allProducts.filter((p) => !reviewed?.has(p.productId));
    if (pendingProducts.length === 0) {
      skippedAllReviewed += 1;
      continue;
    }
    queue.push({
      orderId: String(o.id),
      orderNumber: String(o.order_number ?? ""),
      customerName: String(o.customer_name ?? ""),
      customerEmail: email,
      userId: uid,
      orderStatus: String(o.order_status ?? ""),
      shippedAt: o.shipped_at ? String(o.shipped_at) : null,
      deliveredAt: o.delivered_at ? String(o.delivered_at) : null,
      createdAt: String(o.created_at ?? ""),
      products: pendingProducts.map((p) => ({ name: p.name, slug: p.slug })),
      trigger,
    });
  }

  const eligibleAfterProductFilter = queue.length;
  const capped = queue.length > limit;
  const batch = queue.slice(0, limit);

  let sent = 0;
  let errors = 0;
  const samples: ReviewReminderRunResult["samples"] = [];

  for (const c of batch) {
    if (dryRun) {
      samples.push({
        orderNumber: c.orderNumber,
        trigger: c.trigger,
        productCount: c.products.length,
        email: c.customerEmail.replace(/(.{2}).+(@.+)/, "$1***$2"),
        action: "would_send",
      });
      continue;
    }

    const result = await sendReviewReminderEmail({
      customerName: c.customerName,
      customerEmail: c.customerEmail,
      orderNumber: c.orderNumber,
      products: c.products,
    });

    if (result.ok) {
      const now = new Date().toISOString();
      const { error: markErr } = await admin
        .from("orders")
        .update({ review_reminder_sent_at: now, updated_at: now })
        .eq("id", c.orderId)
        .is("review_reminder_sent_at", null);
      if (markErr) {
        errors += 1;
        samples.push({
          orderNumber: c.orderNumber,
          trigger: c.trigger,
          productCount: c.products.length,
          email: c.customerEmail.replace(/(.{2}).+(@.+)/, "$1***$2"),
          action: "error",
          error: markErr.message,
        });
        continue;
      }
      sent += 1;
      samples.push({
        orderNumber: c.orderNumber,
        trigger: c.trigger,
        productCount: c.products.length,
        email: c.customerEmail.replace(/(.{2}).+(@.+)/, "$1***$2"),
        action: "sent",
      });
    } else {
      errors += 1;
      samples.push({
        orderNumber: c.orderNumber,
        trigger: c.trigger,
        productCount: c.products.length,
        email: c.customerEmail.replace(/(.{2}).+(@.+)/, "$1***$2"),
        action: "error",
        error: result.error ?? result.skippedReason,
      });
    }
  }

  return {
    ok: errors === 0 || sent > 0 || dryRun,
    dryRun,
    candidates,
    eligibleAfterProductFilter,
    sent: dryRun ? 0 : sent,
    errors,
    skippedNoEmail,
    skippedAllReviewed,
    capped,
    samples: samples.slice(0, 15),
    message: dryRun
      ? `dry-run would_send=${batch.length}`
      : `sent=${sent} errors=${errors}`,
  };
}
