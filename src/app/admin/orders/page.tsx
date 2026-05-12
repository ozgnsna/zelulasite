import Link from "next/link";
import { redirect } from "next/navigation";
import { orderStatusLabel } from "@/lib/account/order-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function shortenOrderNumberDisplay(orderNumber: string): string {
  const s = String(orderNumber ?? "").trim();
  if (s.length <= 18) return s;
  return `${s.slice(0, 10)}…${s.slice(-4)}`;
}

export default async function AdminOrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  const sp = await searchParams;
  const queue = String(sp.queue ?? "").trim();

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
    .select("id,order_number,total,customer_name,created_at,order_status,payment_status")
    .order("created_at", { ascending: false })
    .limit(100);

  if (queue === "ship") {
    req = req.eq("payment_status", "paid").in("order_status", ["pending", "confirmed", "processing"]);
  }

  const { data: rows } = await req;
  const orders = rows ?? [];

  return (
    <div className="min-h-dvh bg-[#eceae6]">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Operasyon</p>
            <h1 className="mt-1 font-serif text-2xl font-light tracking-tight text-stone-900 sm:text-3xl">Siparişler</h1>
            <p className="mt-1 max-w-xl text-sm text-stone-600">
              {queue === "ship"
                ? "Ödemesi tamamlanmış, kargoya / hazırlığa bekleyen siparişler."
                : "Son siparişler. Detaydan etiket, kargo ve durum güncellemesi yapılır."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/orders"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                queue !== "ship" ? "bg-stone-900 text-white shadow-sm" : "border border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
              }`}
            >
              Tümü
            </Link>
            <Link
              href="/admin/orders?queue=ship"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                queue === "ship" ? "bg-stone-900 text-white shadow-sm" : "border border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
              }`}
            >
              Kargoya hazır
            </Link>
          </div>
        </div>

        <ul className="mt-8 space-y-2">
          {orders.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-stone-300/80 bg-white/60 px-6 py-14 text-center text-sm text-stone-600">
              Bu görünümde sipariş yok.
            </li>
          ) : (
            orders.map((o) => {
              const badge = orderStatusLabel(o);
              const total = Number(o.total ?? 0);
              return (
                <li
                  key={o.id}
                  className="flex flex-col gap-3 rounded-2xl border border-stone-200/60 bg-white/90 p-4 shadow-sm transition hover:border-stone-300/80 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-stone-500">{shortenOrderNumberDisplay(String(o.order_number ?? ""))}</p>
                    <p className="mt-0.5 truncate font-medium text-stone-900">{o.customer_name}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {new Date(o.created_at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-800 ring-1 ring-stone-200/80">
                      {badge}
                    </span>
                    <span className="text-lg font-semibold tabular-nums text-stone-900">
                      {total.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                    </span>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                    >
                      Aç
                    </Link>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </main>
    </div>
  );
}
