/** Europe/Istanbul calendar day as UTC range (hosting UTC vs “bugün” skew). */
export function istanbulDayUtcRange(): { start: Date; end: Date } {
  const ymd = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  return {
    start: new Date(`${ymd}T00:00:00+03:00`),
    end: new Date(`${ymd}T23:59:59.999+03:00`),
  };
}

/** Same projection for dashboard “Son siparişler” and /admin/orders (avoids silent select drift). */
export const ADMIN_ORDERS_LIST_SELECT =
  "id,order_number,total,customer_name,user_id,created_at,order_status,payment_status,shipping_status,shipping_provider,shipping_tracking_number";

/** Prod DB’de kargo kolonları migration’sız kalırsa tam select boş döner; bu yedek çalışır. */
export const ADMIN_ORDERS_LIST_SELECT_FALLBACK =
  "id,order_number,total,customer_name,user_id,created_at,order_status,payment_status";

/** “Tümü”: include deep backlog (pending bank / QNB) not pushed out by recent paid volume. */
export const ADMIN_ORDERS_LIST_LIMIT_ALL = 500;

/** Narrow filters: bounded list. */
export const ADMIN_ORDERS_LIST_LIMIT_NARROW = 200;
