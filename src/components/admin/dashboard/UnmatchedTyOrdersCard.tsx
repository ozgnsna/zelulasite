import Link from "next/link";

export type UnmatchedTyOrderRow = {
  orderNumber: string;
  unmatchedLines: number;
  orderStatus: string;
  updatedAt: string;
};

type Props = {
  orders: UnmatchedTyOrderRow[];
};

export function UnmatchedTyOrdersCard({ orders }: Props) {
  const count = orders.length;
  const totalLines = orders.reduce((sum, o) => sum + o.unmatchedLines, 0);

  return (
    <section className="rounded-2xl border border-stone-200/60 bg-white/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">TY stok eşleşmedi</h2>
          <p className="mt-0.5 text-[11px] text-stone-500">Son 7 gün · barkod/SKU site kataloğunda yok</p>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">
              {count.toLocaleString("tr-TR")}
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
              Temiz
            </span>
          )}
          <Link
            href="/admin/trendyol"
            className="text-[11px] font-semibold text-[#8a734f] underline-offset-2 hover:underline"
          >
            Trendyol
          </Link>
        </div>
      </div>

      {count === 0 ? (
        <p className="mt-3 text-[13px] text-stone-600">Eşleşmeyen sipariş satırı yok.</p>
      ) : (
        <>
          <p className="mt-3 text-[13px] font-medium text-rose-900">
            {count.toLocaleString("tr-TR")} sipariş · {totalLines.toLocaleString("tr-TR")} satır stok düşmedi
          </p>
          <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto text-[12px] text-stone-700">
            {orders.slice(0, 12).map((o) => (
              <li key={o.orderNumber} className="flex items-baseline justify-between gap-2">
                <span className="font-mono font-semibold text-stone-900">{o.orderNumber}</span>
                <span className="shrink-0 text-stone-500">
                  {o.unmatchedLines} satır
                  {o.orderStatus ? ` · ${o.orderStatus}` : ""}
                </span>
              </li>
            ))}
          </ul>
          {orders.length > 12 ? (
            <p className="mt-1.5 text-[11px] text-stone-500">+{orders.length - 12} sipariş daha</p>
          ) : null}
          <Link
            href="/admin/trendyol"
            className="mt-3 inline-flex text-[12px] font-semibold text-stone-800 underline-offset-2 hover:underline"
          >
            Katalog / barkod kontrol →
          </Link>
        </>
      )}
    </section>
  );
}

/** marketplace_orders.raw_payload.stock_effect.unmatched_lines */
export function readUnmatchedLinesFromRawPayload(raw: unknown): number {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return 0;
  const stockEffect = (raw as Record<string, unknown>).stock_effect;
  if (!stockEffect || typeof stockEffect !== "object" || Array.isArray(stockEffect)) return 0;
  const n = Number((stockEffect as Record<string, unknown>).unmatched_lines ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
