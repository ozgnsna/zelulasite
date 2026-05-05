import Link from "next/link";

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  payment_status: string;
  order_status: string;
  referrer_user_id?: string | null;
  referral_code?: string | null;
};

function isReferralOrder(o: { referrer_user_id?: string | null; referral_code?: string | null }) {
  return Boolean(o.referrer_user_id ?? o.referral_code);
}

export function AdminOrdersOverview({
  baseQueryParams,
  davetOnly,
  orders,
  updateOrderStatus,
  reconcileOrderStatus,
  retryPaymentInit,
  markOrderPaidManually,
}: {
  baseQueryParams: string;
  davetOnly: boolean;
  orders: OrderRow[];
  updateOrderStatus: (formData: FormData) => Promise<void>;
  reconcileOrderStatus: (formData: FormData) => Promise<void>;
  retryPaymentInit: (formData: FormData) => Promise<void>;
  markOrderPaidManually: (formData: FormData) => Promise<void>;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">Siparişler</h2>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <Link
            href={`/admin?${baseQueryParams}&davet=1`}
            className={`rounded-full border px-3 py-1 ${davetOnly ? "border-[#c6a15b]/50 bg-[#faf6ef] text-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
          >
            Davetten gelen siparişler
          </Link>
          <Link href={`/admin?${baseQueryParams}`} className="rounded-full border border-stone-200 px-3 py-1 text-stone-600 hover:bg-stone-50">
            Tümü
          </Link>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {orders.map((o) => (
          <form key={o.id} action={updateOrderStatus} className="grid items-center gap-2 rounded-xl border p-3 md:grid-cols-7">
            <input type="hidden" name="id" value={o.id} />
            <div className="flex flex-col gap-1">
              <Link className="text-xs font-medium text-amber-900 hover:underline" href={`/admin/orders/${o.id}`}>{o.order_number}</Link>
              {isReferralOrder(o) ? (
                <span className="w-fit rounded-full bg-[#f5ede1] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#8a6a3d]">
                  Davet ile geldi
                </span>
              ) : null}
            </div>
            <p className="text-xs">{o.customer_name}</p>
            <select name="payment_status" defaultValue={o.payment_status} className="rounded border p-1 text-xs">
              <option value="pending">pending</option>
              <option value="paid">paid</option>
              <option value="failed">failed</option>
            </select>
            <select name="order_status" defaultValue={o.order_status} className="rounded border p-1 text-xs">
              <option value="pending">pending</option>
              <option value="confirmed">confirmed</option>
              <option value="shipped">shipped</option>
              <option value="cancelled">cancelled</option>
            </select>
            <p className="text-xs">{o.total} TRY</p>
            <button className="rounded bg-stone-900 px-3 py-1.5 text-xs text-white">Güncelle</button>
          </form>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {orders.slice(0, 6).map((o) => (
          <div key={o.id} className="rounded-xl border border-stone-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium">{o.order_number}</p>
              {isReferralOrder(o) ? (
                <span className="rounded-full bg-[#f5ede1] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#8a6a3d]">
                  Davet ile geldi
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-stone-500">{o.payment_status} / {o.order_status}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <form action={reconcileOrderStatus}>
                <input type="hidden" name="id" value={o.id} />
                <button className="rounded bg-amber-100 px-2 py-1 text-[11px]">Reconcile</button>
              </form>
              <form action={retryPaymentInit}>
                <input type="hidden" name="id" value={o.id} />
                <button className="rounded bg-stone-100 px-2 py-1 text-[11px]">Retry</button>
              </form>
              <form action={markOrderPaidManually}>
                <input type="hidden" name="id" value={o.id} />
                <input name="confirm" placeholder="ONAYLIYORUM" className="w-24 rounded border px-1 py-1 text-[10px]" />
                <button className="rounded bg-emerald-100 px-2 py-1 text-[11px]">Manuel Paid</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
