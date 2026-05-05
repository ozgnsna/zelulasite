import Link from "next/link";

type Tone = "emerald" | "amber" | "rose";

function Metric({ title, value, tone }: { title: string; value: number; tone: Tone }) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-800 border-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-800 border-amber-100"
        : "bg-rose-50 text-rose-800 border-rose-100";
  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-wide">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function AdminStatsCards({
  fromIso,
  toIso,
  davetOnly,
  successfulPayments,
  pendingPayments,
  failedPayments,
  rejectedCallbacks,
  orphanCallbacks,
  problematicOrders,
}: {
  fromIso: string;
  toIso: string;
  davetOnly: boolean;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  rejectedCallbacks: number;
  orphanCallbacks: number;
  problematicOrders: Array<{ id: string; order_number: string; customer_name: string; payment_status: string }>;
}) {
  return (
    <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium">Ödeme Operasyon Dashboard</h2>
        <form className="flex flex-wrap gap-2 text-xs" method="get">
          <input type="date" name="from" defaultValue={fromIso.slice(0, 10)} className="rounded border p-2" />
          <input type="date" name="to" defaultValue={toIso.slice(0, 10)} className="rounded border p-2" />
          {davetOnly ? <input type="hidden" name="davet" value="1" /> : null}
          <button className="rounded bg-stone-900 px-3 py-2 text-white">Filtrele</button>
        </form>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-5">
        <Metric title="Başarılı Ödeme" value={successfulPayments} tone="emerald" />
        <Metric title="Bekleyen Ödeme" value={pendingPayments} tone="amber" />
        <Metric title="Başarısız Ödeme" value={failedPayments} tone="rose" />
        <Metric title="Rejected Callback" value={rejectedCallbacks} tone="rose" />
        <Metric title="Orphan Callback" value={orphanCallbacks} tone="amber" />
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-medium">Problemli Siparişler</h3>
        <ul className="mt-2 space-y-2">
          {problematicOrders.slice(0, 8).map((o) => (
            <li key={o.id} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-xs">
              <span>
                {o.order_number} • {o.customer_name} • {o.payment_status}
              </span>
              <Link href={`/admin/orders/${o.id}`} className="font-medium text-amber-900 hover:underline">
                Detay
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
