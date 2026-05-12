import { redirect } from "next/navigation";
import {
  AdminOrdersListShell,
  type AdminOrderListRow,
} from "@/components/admin/orders/AdminOrdersListShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Europe/Istanbul takvim günü (hosting UTC iken “bugün” sapmasını önler) */
function istanbulDayUtcRange(): { start: Date; end: Date } {
  const ymd = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  return {
    start: new Date(`${ymd}T00:00:00+03:00`),
    end: new Date(`${ymd}T23:59:59.999+03:00`),
  };
}

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
  let req = admin
    .from("orders")
    .select(
      "id,order_number,total,customer_name,created_at,order_status,payment_status,shipping_status,shipping_provider,shipping_tracking_number",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (activeFilter === "today") {
    const { start, end } = istanbulDayUtcRange();
    req = req.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
  } else if (activeFilter === "ship_ready") {
    req = req.eq("payment_status", "paid").in("order_status", ["pending", "confirmed", "processing"]);
  } else if (activeFilter === "payment_pending") {
    req = req.eq("payment_status", "pending");
  } else if (activeFilter === "processing") {
    req = req.eq("order_status", "processing");
  } else if (activeFilter === "done") {
    req = req.in("order_status", ["shipped", "hand_delivered"]);
  }

  const { data: rows } = await req;
  const orders = (rows ?? []) as AdminOrderListRow[];

  return (
    <main className="mx-auto min-w-0 max-w-6xl px-3 py-4 sm:px-5 sm:py-5">
      <header className="mb-3 border-b border-stone-200/70 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">Operasyon</p>
        <h1 className="mt-0.5 font-serif text-xl font-light tracking-tight text-stone-900 sm:text-2xl">Siparişler</h1>
        <p className="mt-0.5 max-w-2xl text-[12px] leading-snug text-stone-600">
          Hızlı filtreler, yoğun liste ve toplu işlemler — detay sayfasından etiket ve kargo güncellenir.
        </p>
      </header>

      <AdminOrdersListShell orders={orders} activeFilter={activeFilter} />
    </main>
  );
}
