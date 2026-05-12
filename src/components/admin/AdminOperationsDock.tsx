"use client";

import Link from "next/link";

export function AdminOperationsDock({
  pendingShipmentCount,
}: {
  pendingShipmentCount: number;
}) {
  if (pendingShipmentCount <= 0) return null;

  const label =
    pendingShipmentCount === 1
      ? "1 sipariş kargoya hazır bekliyor"
      : `${pendingShipmentCount.toLocaleString("tr-TR")} sipariş kargoya hazır bekliyor`;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
      <div className="pointer-events-auto flex w-full max-w-lg items-center justify-between gap-4 rounded-2xl border border-stone-200/80 bg-[#141413]/95 px-4 py-3 text-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md ring-1 ring-white/10">
        <p className="min-w-0 text-sm font-medium leading-snug text-zinc-100">{label}</p>
        <Link
          href="/admin/orders?queue=ship"
          className="shrink-0 rounded-xl bg-[#c9a06e] px-4 py-2.5 text-sm font-semibold text-stone-950 shadow-md transition hover:bg-[#d4ad7a] active:scale-[0.99]"
        >
          Siparişlere git
        </Link>
      </div>
    </div>
  );
}
