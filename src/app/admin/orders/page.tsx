import { redirect } from "next/navigation";
import {
  AdminOrdersListShell,
  type AdminOrderListRow,
} from "@/components/admin/orders/AdminOrdersListShell";
import {
  ADMIN_ORDERS_LIST_LIMIT_ALL,
  ADMIN_ORDERS_LIST_LIMIT_NARROW,
  ADMIN_ORDERS_LIST_SELECT,
  istanbulDayUtcRange,
} from "@/lib/admin/admin-orders-list";
import { ADMIN_OPERATIONS_MAIN } from "@/lib/admin/admin-shell-layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FILTER_IDS = new Set([
  "all",
  "today",
  "ship_ready",
  "payment_pending",
  "processing",
  "done",
]);

export default async function AdminOrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string; filter?: string }>;
}) {
  const sp = await searchParams;
  const queue = String(sp.queue ?? "").trim();
  const filterRaw = String(sp.filter ?? "").trim();
  if (queue === "ship" && !filterRaw) {
    redirect("/admin/orders?filter=ship_ready");
  }

  const activeFilter = FILTER_IDS.has(filterRaw) ? filterRaw : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? "")) redirect("/admin/login");

  const admin = createAdminClient();
  let req = admin.from("orders").select(ADMIN_ORDERS_LIST_SELECT).order("created_at", { ascending: false });

  if (activeFilter === "today") {
    const { start, end } = istanbulDayUtcRange();
    req = req
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .limit(ADMIN_ORDERS_LIST_LIMIT_NARROW);
  } else if (activeFilter === "ship_ready") {
    req = req
      .eq("payment_status", "paid")
      .in("order_status", ["pending", "confirmed", "processing"])
      .limit(ADMIN_ORDERS_LIST_LIMIT_NARROW);
  } else if (activeFilter === "payment_pending") {
    req = req.eq("payment_status", "pending").limit(ADMIN_ORDERS_LIST_LIMIT_NARROW);
  } else if (activeFilter === "processing") {
    req = req.eq("order_status", "processing").limit(ADMIN_ORDERS_LIST_LIMIT_NARROW);
  } else if (activeFilter === "done") {
    req = req.in("order_status", ["shipped", "hand_delivered"]).limit(ADMIN_ORDERS_LIST_LIMIT_NARROW);
  } else {
    req = req.limit(ADMIN_ORDERS_LIST_LIMIT_ALL);
  }

  const { data: rows } = await req;
  const orders = (rows ?? []) as AdminOrderListRow[];

  return (
    <main className={`${ADMIN_OPERATIONS_MAIN} pb-3 pt-2 sm:pb-4 sm:pt-2.5`}>
      <header className="mb-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-0.5 border-b border-stone-200/55 pb-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <h1 className="font-serif text-base font-light tracking-tight text-stone-900 sm:text-lg">Siparişler</h1>
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-400">Operasyon</span>
          </div>
          <p className="mt-0.5 max-w-xl text-[10px] leading-tight text-stone-600">
            Ara, filtrele, toplu işlem — kargo ve etiket için satıra girin.
          </p>
        </div>
      </header>

      <AdminOrdersListShell orders={orders} activeFilter={activeFilter} />
    </main>
  );
}
