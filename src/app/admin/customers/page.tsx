import Link from "next/link";
import { redirect } from "next/navigation";
import { ADMIN_OPERATIONS_MAIN } from "@/lib/admin/admin-shell-layout";
import { isAdminEmail } from "@/lib/admin/auth";
import { fetchRegisteredMembers } from "@/lib/admin/fetch-registered-members";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AdminRegisteredMembersPanel } from "@/components/admin/customers/AdminRegisteredMembersPanel";

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

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const errorCode = String(sp.err ?? "").trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  if (!isAdminEmail(user.email)) redirect("/admin/login");

  const admin = createAdminClient();
  const [{ members, totalUsers }, { data: orderRows }] = await Promise.all([
    fetchRegisteredMembers(admin, { q, limit: 100 }),
    admin
      .from("orders")
      .select("id,customer_name,email,created_at,payment_status,order_status")
      .order("created_at", { ascending: false })
      .limit(800),
  ]);

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
  const registeredWithOrders = members.filter((m) => m.totalOrders > 0).length;

  return (
    <main className={`${ADMIN_OPERATIONS_MAIN} py-3 sm:py-4`}>
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-stone-200/70 pb-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-500">Operasyon</p>
          <h1 className="font-serif text-lg font-light tracking-tight text-stone-900 sm:text-xl">Müşteriler</h1>
          <p className="mt-0.5 max-w-xl text-[11px] leading-snug text-stone-600">
            Kayıtlı üyeler ve sipariş geçmişi. Hata ayıklamak için üye satırından{" "}
            <span className="font-medium text-stone-700">Hesaba gir</span> ile müşteri oturumu açılır.
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="shrink-0 rounded-md border border-stone-800/15 bg-stone-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-stone-800"
        >
          Siparişler
        </Link>
      </header>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <div className="rounded-lg border border-stone-200/60 bg-white px-2 py-1.5 shadow-sm">
          <p className="text-[8px] font-semibold uppercase tracking-tight text-stone-500">Kayıtlı üye</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums leading-none text-stone-950">
            {totalUsers.toLocaleString("tr-TR")}
          </p>
        </div>
        <div className="rounded-lg border border-stone-200/60 bg-white px-2 py-1.5 shadow-sm">
          <p className="text-[8px] font-semibold uppercase tracking-tight text-stone-500">Sipariş veren üye</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums leading-none text-stone-950">
            {registeredWithOrders.toLocaleString("tr-TR")}
          </p>
        </div>
        <div className="rounded-lg border border-stone-200/60 bg-white px-2 py-1.5 shadow-sm">
          <p className="text-[8px] font-semibold uppercase tracking-tight text-stone-500">Sipariş alıcısı</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums leading-none text-stone-950">
            {totalCustomers.toLocaleString("tr-TR")}
          </p>
          <p className="mt-0.5 text-[9px] leading-tight text-stone-500">Misafir dahil</p>
        </div>
        <div className="rounded-lg border border-stone-200/60 bg-white px-2 py-1.5 shadow-sm">
          <p className="text-[8px] font-semibold uppercase tracking-tight text-stone-500">Tekrar satın alma</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums leading-none text-stone-950">
            {repeatCustomers.toLocaleString("tr-TR")}
          </p>
        </div>
      </div>

      <AdminRegisteredMembersPanel members={members} totalUsers={totalUsers} q={q} errorCode={errorCode} />

      <section className="mt-3 rounded-xl border border-stone-200/60 bg-white/90 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-stone-100/90 px-2.5 py-1.5">
          <h2 className="text-[11px] font-semibold text-stone-800">Son hareket (sipariş)</h2>
          <span className="text-[9px] tabular-nums text-stone-400">Son {rows.length} kayıt</span>
        </div>
        {!hasAnyIdentity ? (
          <div className="px-2.5 py-4 text-center">
            <p className="text-[12px] font-medium text-stone-700">Henüz sipariş kaydı yok</p>
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
        Müşteri görünümünden çıkmak için üst banttaki{" "}
        <span className="font-medium text-stone-600">Admin oturumuna dön</span> bağlantısını kullanın.
      </p>
    </main>
  );
}
