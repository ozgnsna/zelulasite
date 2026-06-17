"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminCreateShipmentButton({
  orderId,
  paymentStatus,
  shippingTrackingNumber,
  shippingStatus,
  carrierLabel,
}: {
  orderId: string;
  paymentStatus: string;
  shippingTrackingNumber: string | null | undefined;
  shippingStatus: string | null | undefined;
  carrierLabel: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paid = paymentStatus === "paid";
  const already =
    Boolean(String(shippingTrackingNumber ?? "").trim()) || String(shippingStatus ?? "").trim() === "created";
  const disabled = !paid || already || pending;

  const hint = !paid
    ? "Ödeme alındıktan sonra kargo oluşturulabilir."
    : already
      ? "Bu sipariş için kargo zaten oluşturulmuş."
      : null;

  return (
    <div className="mt-4 w-full border-t border-[#e8dfd3] pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">{carrierLabel} kargo</p>
      {hint ? <p className="mt-1.5 text-xs text-stone-500">{hint}</p> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setError(null);
          setMessage(null);
          start(async () => {
            const res = await fetch(`/api/admin/orders/${orderId}/create-shipment`, { method: "POST" });
            const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; trackingNumber?: string };
            if (!res.ok || !data.ok) {
              setError(data.error ?? `İşlem başarısız (${res.status})`);
              return;
            }
            setMessage(`Kargo oluşturuldu. Takip: ${data.trackingNumber ?? "—"}`);
            router.refresh();
          });
        }}
        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white shadow-md transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        {pending ? "Oluşturuluyor…" : `${carrierLabel} ile kargo oluştur`}
      </button>
      {message ? <p className="mt-2 text-xs font-medium text-emerald-800">{message}</p> : null}
      {error ? (
        <p className="mt-2 text-xs font-medium text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
