import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  orderStatusLabel,
  orderStatusLabelTr,
  paymentStatusLabelTr,
} from "@/lib/account/order-status";

function formatMoney(n: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(n);
}

function formatOrderDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function OrdersList() {
  const supabase = await createClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, created_at, total, currency, payment_status, order_status")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="rounded-xl border border-stone-200/80 bg-stone-50/80 px-4 py-3 text-sm text-stone-700" role="alert">
        Siparişler yüklenemedi. Sayfayı yenileyin veya biraz sonra tekrar deneyin.
      </p>
    );
  }

  if (!orders?.length) {
    return (
      <div className="rounded-2xl border border-[#e8dfd3]/80 bg-[linear-gradient(180deg,#ffffff_0%,#faf8f5_100%)] px-6 py-10 text-center shadow-[0_12px_28px_rgba(63,53,40,0.06)]">
        <p className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e8dfd3] bg-white/70 text-lg text-stone-500">
          ◇
        </p>
        <p className="font-serif text-lg text-stone-800">Henüz siparişin yok.</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
          Zelula koleksiyonunu keşfederek ilk seçimini yapabilirsin.
        </p>
        <Link
          href="/koleksiyonlar"
          className="mt-6 inline-flex rounded-full border border-[#e8dfd3] bg-white px-6 py-2.5 text-sm font-medium text-stone-800 transition duration-200 hover:-translate-y-0.5 hover:border-[#c6a15b]/60 hover:text-[#7b5f32]"
        >
          Koleksiyonu keşfet
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li
          key={o.id}
          className="hesabim-tile rounded-xl p-5 sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="font-medium text-stone-900">{o.order_number}</p>
              <p className="text-xs text-stone-500">{formatOrderDate(o.created_at)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex rounded-full border border-[#e8dfd3] bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                  Ödeme: {paymentStatusLabelTr(o.payment_status ?? "")}
                </span>
                <span className="inline-flex rounded-full border border-[#e8dfd3] bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                  Sipariş: {orderStatusLabelTr(o.order_status ?? "")}
                </span>
                <span className="inline-flex rounded-full border border-[#e8dfd3]/80 bg-[#faf8f5] px-2.5 py-0.5 text-[11px] font-medium text-stone-700">
                  {orderStatusLabel({
                    payment_status: o.payment_status ?? "",
                    order_status: o.order_status ?? "",
                  })}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              <p className="text-base font-medium tabular-nums text-stone-900 sm:text-right">
                {formatMoney(Number(o.total), o.currency ?? "TRY")}
              </p>
              <Link
                href={`/hesabim/siparis/${o.id}`}
                className="hesabim-btn-lux inline-flex justify-center rounded-full px-5 py-2 text-center text-sm font-medium shadow-sm sm:min-w-[10rem]"
              >
                Siparişi görüntüle
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
