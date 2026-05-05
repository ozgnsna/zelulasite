"use client";

import { useFormStatus } from "react-dom";
import { markOrderHandDelivered, reconcileOrderStatus, updateOrderStatus } from "@/app/actions/admin";

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
  const cancelled = orderStatus === "cancelled";
  const handDelivered = orderStatus === "hand_delivered";
  const confirmDisabled =
    cancelled || handDelivered || ["confirmed", "shipped", "processing"].includes(orderStatus);

  return (
    <div className={`flex flex-wrap items-center justify-end gap-2 ${className ?? ""}`}>
      <form action={updateOrderStatus}>
        <input type="hidden" name="id" value={orderId} />
        <input type="hidden" name="payment_status" value={paymentStatus} />
        <input type="hidden" name="order_status" value="confirmed" />
        <PendingButton
          pendingLabel="Onaylanıyor…"
          disabled={confirmDisabled}
          className={`${btnBase} bg-stone-900 text-white shadow-md shadow-stone-900/25 hover:bg-stone-800`}
        >
          Siparişi Onayla
        </PendingButton>
      </form>

      <form action={updateOrderStatus}>
        <input type="hidden" name="id" value={orderId} />
        <input type="hidden" name="payment_status" value={paymentStatus} />
        <input type="hidden" name="order_status" value="cancelled" />
        <PendingButton
          pendingLabel="İptal ediliyor…"
          disabled={cancelled}
          className={`${btnBase} border-2 border-rose-200 bg-white text-rose-800 shadow-sm hover:border-rose-300 hover:bg-rose-50`}
        >
          Siparişi İptal Et
        </PendingButton>
      </form>

      <form action={markOrderHandDelivered}>
        <input type="hidden" name="id" value={orderId} />
        <input type="hidden" name="payment_status" value={paymentStatus} />
        <PendingButton
          pendingLabel="İşleniyor…"
          disabled={cancelled || handDelivered}
          className={`${btnBase} border border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm hover:bg-emerald-100`}
        >
          Elden Teslim Edildi
        </PendingButton>
      </form>

      <form action={reconcileOrderStatus}>
        <input type="hidden" name="id" value={orderId} />
        <PendingButton
          pendingLabel="Kontrol ediliyor…"
          className={`${btnBase} border border-[#e8dfd3] bg-white text-stone-700 shadow-sm hover:border-stone-300 hover:bg-[#fffdfb]`}
        >
          Ödemeyi Kontrol Et
        </PendingButton>
      </form>
    </div>
  );
}
