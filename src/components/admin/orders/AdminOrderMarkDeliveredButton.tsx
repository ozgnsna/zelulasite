"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const btnBase =
  "inline-flex min-h-[40px] items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.99]";

export function AdminOrderMarkDeliveredButton({
  orderId,
  label,
  pendingLabel,
  className,
}: {
  orderId: string;
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await fetch(`/api/admin/orders/${orderId}/mark-delivered`, { method: "POST" });
            const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
            if (!res.ok || !data.ok) {
              setError(data.error ?? `İşlem başarısız (${res.status})`);
              return;
            }
            router.refresh();
          });
        }}
        className={`${btnBase} ${className}`}
      >
        {pending ? pendingLabel : label}
      </button>
      {error ? (
        <p className="max-w-xs text-xs font-medium text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
