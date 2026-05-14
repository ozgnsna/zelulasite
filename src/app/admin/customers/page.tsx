import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { ADMIN_OPERATIONS_MAIN } from "@/lib/admin/admin-shell-layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  customer_name: string | null;
  email: string | null;
  created_at: string;
  payment_status: string;
  order_status: string;
};

function identityKey(row: OrderRow): string | null {
  const e = String(row.email ?? "").trim().toLowerCase();
  if (e) return `e:${e}`;
  const n = String(row.customer_name ?? "").trim().toLowerCase();
  if (n) return `n:${n}`;
  return null;
}

function displayName(row: OrderRow): string {
  const n = String(row.customer_name ?? "").trim();
  if (n) return n;
  const e = String(row.email ?? "").trim();
  if (e) return e;
  return "—";
}

function isPaidNonCancelled(o: OrderRow): boolean {
  return o.payment_status === "paid" && String(o.order_status ?? "") !== "cancelled";
}

export default async function AdminCustomersPage() {
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
  const { data: orderRows } = await admin
    .from("orders")
    .select("id,customer_name,email,created_at,payment_status,order_status")
    .order("created_at", { ascending: false })
    .limit(800);

  const rows = (orderRows ?? []) as OrderRow[];

  const keysAll = new Set<string>();
  for (const o of rows) {
    const k = identityKey(o);
    if (k) keysAll.add(k);
  }

  const paidCountByKey = new Map<string, number>();
  for (const o of rows) {
    if (!isPaidNonCancelled(o)) continue;
    const k = identityKey(o);
    if (!k) continue;
    paidCountByKey.set(k, (paidCountByKey.get(k) ?? 0) + 1);
  }

  const payingKeys = new Set([...paidCountByKey.keys()]);
  const repeatKeys = new Set([...paidCountByKey.entries()].filter(([, c]) => c >= 2).map(([k]) => k));

  const totalCustomers = keysAll.size;
  const payingCustomers = payingKeys.size;
  const repeatCustomers = repeatKeys.size;

  type RecentRow = {
    key: string;
    name: string;
    lastAt: string;
    lastOrderId: string;
    ordersInSample: number;
    paidOrdersInSample: number;
  };

  const recentMap = new Map<string, RecentRow>();
  const ordersInSampleByKey = new Map<string, number>();
  const paidInSampleByKey = new Map<string, number>();

  for (const o of rows) {
    const k = identityKey(o);
    if (!k) continue;
    ordersInSampleByKey.set(k, (ordersInSampleByKey.get(k) ?? 0) + 1);
    if (isPaidNonCancelled(o)) {
      paidInSampleByKey.set(k, (paidInSampleByKey.get(k) ?? 0) + 1);
    }
    const existing = recentMap.get(k);
    if (!existing) {
      recentMap.set(k, {
        key: k,
        name: displayName(o),
        lastAt: String(o.created_at ?? ""),
        lastOrderId: String(o.id),
        ordersInSample: 0,
        paidOrdersInSample: 0,
      });
    }
  }
  for (const [k, r] of recentMap) {
    r.ordersInSample = ordersInSampleByKey.get(k) ?? 0;
    r.paidOrdersInSample = paidInSampleByKey.get(k) ?? 0;
  }

  const recentList = [...recentMap.values()]
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
    .slice(0, 14);

  const hasAnyIdentity = recentList.length > 0;

  return (
    <main className={`${ADMIN_OPERATIONS_MAIN} py-3 sm:py-4`}>
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-stone-200/70 pb-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-500">Operasyon</p>
          <h1 className="font-serif text-lg font-light tracking-tight text-stone-900 sm:text-xl">Müşteriler</h1>
          <p className="mt-0.5 max-w-xl text-[11px] leading-snug text-stone-600">
            Sipariş kayıtlarından özet — detay ve segmentasyon için sipariş ekranını kullanın.
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="shrink-0 rounded-md border border-stone-800/15 bg-stone-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-stone-800"
        >
          Siparişler
        </Link>
      </header>

      <div className="mt-2.5">
        <label className="block text-[9px] font-semibold uppercase tracking-wide text-stone-500">Arama</label>
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-stone-200/80 bg-white px-2 py-1.5 shadow-sm ring-1 ring-stone-900/[0.02]">
          <Search className="size-3.5 shrink-0 text-stone-400" aria-hidden />
          <input
            type="search"
            name="customer_q"
            placeholder="İsim veya e-posta…"
            disabled
            title="CRM araması yakında"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-stone-800 placeholder:text-stone-400 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <div className="rounded-lg border border-stone-200/60 bg-white px-2 py-1.5 shadow-sm">
          <p className="text-[8px] font-semibold uppercase tracking-tight text-stone-500">Toplam müşteri</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums leading-none text-stone-950">
            {totalCustomers.toLocaleString("tr-TR")}
          </p>
          <p className="mt-0.5 text-[9px] leading-tight text-stone-500">Benzersiz alıcı (sipariş)</p>
        </div>
        <div className="rounded-lg border border-stone-200/60 bg-white px-2 py-1.5 shadow-sm">
          <p className="text-[8px] font-semibold uppercase tracking-tight text-stone-500">Sipariş veren</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums leading-none text-stone-950">
            {payingCustomers.toLocaleString("tr-TR")}
          </p>
          <p className="mt-0.5 text-[9px] leading-tight text-stone-500">Ödenmiş, iptal dışı</p>
        </div>
        <div className="rounded-lg border border-stone-200/60 bg-white px-2 py-1.5 shadow-sm">
          <p className="text-[8px] font-semibold uppercase tracking-tight text-stone-500">Tekrar satın alma</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums leading-none text-stone-950">
            {repeatCustomers.toLocaleString("tr-TR")}
          </p>
          <p className="mt-0.5 text-[9px] leading-tight text-stone-500">2+ ödemeli sipariş</p>
        </div>
      </div>

      <section className="mt-3 rounded-xl border border-stone-200/60 bg-white/90 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-stone-100/90 px-2.5 py-1.5">
          <h2 className="text-[11px] font-semibold text-stone-800">Son hareket (sipariş)</h2>
          <span className="text-[9px] tabular-nums text-stone-400">Son {rows.length} kayıt</span>
        </div>
        {!hasAnyIdentity ? (
          <div className="px-2.5 py-4 text-center">
            <p className="text-[12px] font-medium text-stone-700">Henüz müşteri kimliği yok</p>
            <p className="mx-auto mt-1 max-w-sm text-[10px] leading-snug text-stone-500">
              Checkout’ta ad veya e-posta girildiğinde burada listelenir. İlk siparişten sonra özet dolacaktır.
            </p>
            <Link href="/admin" className="mt-2 inline-block text-[10px] font-semibold text-[#6b5b45] underline-offset-2 hover:underline">
              Panele dön
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100/90">
            {recentList.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-2 px-2 py-1.5 sm:px-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-stone-900">{r.name}</p>
                  <p className="text-[9px] tabular-nums text-stone-500">
                    {new Date(r.lastAt).toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    <span className="text-stone-400">
                      {" "}
                      · {r.ordersInSample} sipariş
                      {r.paidOrdersInSample > 0 ? ` · ${r.paidOrdersInSample} ödendi` : ""}
                    </span>
                  </p>
                </div>
                <Link
                  href={`/admin/orders/${r.lastOrderId}`}
                  className="shrink-0 rounded-md border border-stone-200/90 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-800 hover:bg-stone-100"
                >
                  Aç
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-2 text-center text-[9px] text-stone-500">
        Özet son 800 sipariş dilimine göredir. <span className="font-medium text-stone-400">CRM özellikleri yakında.</span>
      </p>
    </main>
  );
}
