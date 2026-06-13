"use client";

import { useFormStatus } from "react-dom";
import { markOrderHandDelivered, reconcileOrderStatus, updateOrderStatus } from "@/app/actions/admin";
import { resolveOrderFulfillmentStage } from "@/lib/orders/fulfillment-stage";

function PendingButton({
  children,
  pendingLabel,
  className,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}

const btnBase =
  "inline-flex min-h-[40px] items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.99]";

export function AdminOrderActionBar({
  orderId,
  paymentStatus,
  orderStatus,
  className,
}: {
  orderId: string;
  paymentStatus: string;
  orderStatus: string;
  className?: string;
}) {
  const stage = resolveOrderFulfillmentStage(paymentStatus, orderStatus);
  const cancelled = stage === "cancelled";
  const delivered = stage === "delivered";
  const showPaymentReconcile = !cancelled && paymentStatus !== "paid";

  return (
    <div className={`flex flex-wrap items-center justify-start gap-2 ${className ?? ""}`}>
      {stage === "new" ? (
        <form action={updateOrderStatus}>
          <input type="hidden" name="id" value={orderId} />
          <input type="hidden" name="payment_status" value={paymentStatus} />
          <input type="hidden" name="order_status" value="processing" />
          <PendingButton
            pendingLabel="Alınıyor…"
            className={`${btnBase} bg-stone-900 text-white shadow-md shadow-stone-900/25 hover:bg-stone-800`}
          >
            Hazırlamaya al
          </PendingButton>
        </form>
      ) : null}

      {stage === "preparing" ? (
        <form action={updateOrderStatus}>
          <input type="hidden" name="id" value={orderId} />
          <input type="hidden" name="payment_status" value={paymentStatus} />
          <input type="hidden" name="order_status" value="shipped" />
          <PendingButton
            pendingLabel="İşleniyor…"
            className={`${btnBase} bg-stone-900 text-white shadow-md shadow-stone-900/25 hover:bg-stone-800`}
          >
            Kargoya ver
          </PendingButton>
        </form>
      ) : null}

      {stage === "in_transit" ? (
        <form action={markOrderHandDelivered}>
          <input type="hidden" name="id" value={orderId} />
          <input type="hidden" name="payment_status" value={paymentStatus} />
          <PendingButton
            pendingLabel="Kaydediliyor…"
            className={`${btnBase} border border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm hover:bg-emerald-100`}
          >
            Teslim edildi
          </PendingButton>
        </form>
      ) : null}

      {delivered ? (
        <span className={`${btnBase} border border-emerald-200 bg-emerald-50/80 text-emerald-900`}>
          ✓ Teslim edildi
        </span>
      ) : null}

      {!cancelled && !delivered ? (
        <form action={updateOrderStatus}>
          <input type="hidden" name="id" value={orderId} />
          <input type="hidden" name="payment_status" value={paymentStatus} />
          <input type="hidden" name="order_status" value="cancelled" />
          <PendingButton
            pendingLabel="İptal ediliyor…"
            className={`${btnBase} border-2 border-rose-200 bg-white text-rose-800 shadow-sm hover:border-rose-300 hover:bg-rose-50`}
          >
            Siparişi iptal et
          </PendingButton>
        </form>
      ) : null}

      {showPaymentReconcile ? (
        <form action={reconcileOrderStatus}>
          <input type="hidden" name="id" value={orderId} />
          <PendingButton
            pendingLabel="Kontrol ediliyor…"
            className={`${btnBase} border border-[#e8dfd3] bg-white text-stone-700 shadow-sm hover:border-stone-300 hover:bg-[#fffdfb]`}
          >
            Ödemeyi kontrol et
          </PendingButton>
        </form>
      ) : null}
    </div>
  );
}
