import { orderStatusLabel } from "@/lib/account/order-status";
import { CopyValueButton } from "@/components/payments/CopyValueButton";

export function OrderReceivedSummary({
  orderNumber,
  customerName,
  email,
  totalFormatted,
  paymentStatus,
  orderStatus,
  createdAt,
}: {
  orderNumber: string;
  customerName: string | null;
  email: string;
  totalFormatted: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt?: string | null;
}) {
  const statusLine = orderStatusLabel({ payment_status: paymentStatus, order_status: orderStatus });
  const dateLabel = createdAt
    ? new Date(createdAt).toLocaleString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <section className="rounded-[20px] border border-[#e8dfd3]/90 bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-6 shadow-[0_12px_36px_-8px_rgba(62,53,42,0.08)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-stone-500">Siparişiniz</p>
          <p className="mt-2 font-serif text-2xl font-light tracking-tight text-stone-900 sm:text-[1.65rem]">
            Ödeme bekleniyor
          </p>
          {dateLabel ? <p className="mt-1.5 text-xs text-stone-500">{dateLabel}</p> : null}
        </div>
        <span className="inline-flex rounded-full border border-amber-200/90 bg-amber-50/90 px-3 py-1 text-xs font-medium text-amber-900">
          {statusLine}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-[#e8dfd3]/80 bg-white/80 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Sipariş no</p>
          <p className="mt-0.5 font-mono text-lg font-semibold tracking-tight text-stone-950">{orderNumber}</p>
        </div>
        <CopyValueButton value={orderNumber} label="Kopyala" />
      </div>

      <dl className="mt-5 divide-y divide-[#ebe6df]/90 text-sm">
        {customerName?.trim() ? (
          <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
            <dt className="text-stone-500">Ad soyad</dt>
            <dd className="text-right font-medium text-stone-900">{customerName.trim()}</dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="shrink-0 text-stone-500">E-posta</dt>
          <dd className="min-w-0 break-all text-right font-medium text-stone-900">{email}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-stone-500">Ödeme</dt>
          <dd className="font-medium text-stone-900">Havale / EFT</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3.5">
          <dt className="text-base font-medium text-stone-800">Ödenecek tutar</dt>
          <dd className="font-serif text-2xl font-light tabular-nums text-stone-950">{totalFormatted}</dd>
        </div>
      </dl>

      <ol className="mt-5 space-y-2 border-t border-[#ebe6df]/90 pt-5 text-xs leading-relaxed text-stone-600">
        <li className="flex gap-2">
          <span className="font-semibold text-emerald-700">1.</span>
          <span>Aşağıdaki IBAN’a transfer yapın; açıklamaya sipariş numaranızı yazın.</span>
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-stone-500">2.</span>
          <span>Ödemeniz onaylandığında e-posta ile bilgilendirilirsiniz.</span>
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-stone-500">3.</span>
          <span>Siparişiniz hazırlanmaya alınır ve kargoya verilir.</span>
        </li>
      </ol>
    </section>
  );
}
