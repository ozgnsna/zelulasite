"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ShippingCarrierId } from "@/lib/shipping/types";

const CARRIER_OPTIONS: { id: ShippingCarrierId; label: string }[] = [
  { id: "navlungo", label: "Navlungo" },
  { id: "dhl", label: "DHL" },
];

export function AdminCreateShipmentButton({
  orderId,
  paymentStatus,
  shippingTrackingNumber,
  shippingStatus,
  navlungoAvailable,
  dhlAvailable,
}: {
  orderId: string;
  paymentStatus: string;
  shippingTrackingNumber: string | null | undefined;
  shippingStatus: string | null | undefined;
  navlungoAvailable: boolean;
  dhlAvailable: boolean;
}) {
  const router = useRouter();
  const [pendingCarrier, setPendingCarrier] = useState<ShippingCarrierId | null>(null);
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

  const available = CARRIER_OPTIONS.filter((c) =>
    c.id === "navlungo" ? navlungoAvailable : dhlAvailable,
  );

  if (available.length === 0) return null;

  return (
    <div className="mt-4 w-full border-t border-[#e8dfd3] pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Otomatik kargo</p>
      {hint ? <p className="mt-1.5 text-xs text-stone-500">{hint}</p> : null}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {available.map((carrier) => (
          <button
            key={carrier.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              setError(null);
              setMessage(null);
              setPendingCarrier(carrier.id);
              start(async () => {
                const res = await fetch(
                  `/api/admin/orders/${orderId}/create-shipment?carrier=${carrier.id}`,
                  { method: "POST" },
                );
                const data = (await res.json().catch(() => ({}))) as {
                  ok?: boolean;
                  error?: string;
                  trackingNumber?: string;
                };
                setPendingCarrier(null);
                if (!res.ok || !data.ok) {
                  setError(data.error ?? `İşlem başarısız (${res.status})`);
                  return;
                }
                setMessage(`${carrier.label} kargo oluşturuldu. Takip: ${data.trackingNumber ?? "—"}`);
                router.refresh();
              });
            }}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white shadow-md transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
          >
            {pending && pendingCarrier === carrier.id
              ? "Oluşturuluyor…"
              : `${carrier.label} ile kargo oluştur`}
          </button>
        ))}
      </div>
      {message ? <p className="mt-2 text-xs font-medium text-emerald-800">{message}</p> : null}
      {error ? (
        <p className="mt-2 text-xs font-medium text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
