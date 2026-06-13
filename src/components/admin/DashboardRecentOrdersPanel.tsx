"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type DashboardOrderRow = {
  id: string;
  total: number;
  payment_status: string;
  order_status: string;
  order_number: string;
  customer_name: string;
  created_at: string;
};

import {
  fulfillmentStageListChipClasses,
  fulfillmentStageLabelTr,
  resolveOrderFulfillmentStage,
} from "@/lib/orders/fulfillment-stage";

type FilterId = "all" | "new" | "payment_pending" | "today";

function shortenOrderNumberDisplay(orderNumber: string): string {
  const s = String(orderNumber ?? "").trim();
  if (s.length <= 18) return s;
  return `${s.slice(0, 10)}…${s.slice(-4)}`;
}

function formatOrderRelativeTimeTr(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diffMs = Math.max(0, Date.now() - t);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Az önce";
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.floor(hours / 24);
  if (days < 8) return `${days} gün`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function formatTryCompact(n: number): string {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

function isNewOrdersQueue(o: DashboardOrderRow): boolean {
  return resolveOrderFulfillmentStage(o.payment_status, o.order_status) === "new";
}

function isPaymentPending(o: DashboardOrderRow): boolean {
  if (String(o.order_status ?? "") === "cancelled") return false;
  return o.payment_status === "pending";
}

function isTodayOrder(o: DashboardOrderRow, dayStartMs: number, dayEndMs: number): boolean {
  const t = new Date(o.created_at).getTime();
  return Number.isFinite(t) && t >= dayStartMs && t <= dayEndMs;
}

/** Tek operasyon chip’i: dört aşamalı akış + ödeme/iptal. */
function operationsChip(o: DashboardOrderRow): { label: string; className: string } {
  const stage = resolveOrderFulfillmentStage(o.payment_status, o.order_status);
  return {
    label: fulfillmentStageLabelTr(stage),
    className: fulfillmentStageListChipClasses(stage),
  };
}

const chipBase =
  "inline-flex max-w-full shrink-0 items-center truncate rounded-full border px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide ring-1 ring-inset";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "new", label: "Yeni gelen" },
  { id: "payment_pending", label: "Ödeme bekleyen" },
  { id: "today", label: "Bugün" },
];

export function DashboardRecentOrdersPanel({
  orders,
  dayStartIso,
  dayEndIso,
}: {
  orders: DashboardOrderRow[];
  dayStartIso: string;
  dayEndIso: string;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const dayStartMs = useMemo(() => new Date(dayStartIso).getTime(), [dayStartIso]);
  const dayEndMs = useMemo(() => new Date(dayEndIso).getTime(), [dayEndIso]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filter === "all") return true;
      if (filter === "new") return isNewOrdersQueue(o);
      if (filter === "payment_pending") return isPaymentPending(o);
      if (filter === "today") return isTodayOrder(o, dayStartMs, dayEndMs);
      return true;
    });
  }, [orders, filter, dayStartMs, dayEndMs]);

  return (
    <section className="rounded-2xl border border-stone-200/70 bg-white p-3 shadow-[0_2px_14px_-6px_rgba(28,25,23,0.06)] sm:p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-100/90 pb-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-stone-900">Son siparişler</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-stone-200/80 bg-stone-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-stone-500">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/60 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
              </span>
              Canlı
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-stone-500">Operasyon kuyruğu · son {orders.length} kayıt</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Link
            href="/admin/orders?queue=ship"
            className="rounded-lg border border-stone-800/15 bg-stone-900 px-2 py-1 text-[10px] font-semibold text-white shadow-sm transition hover:bg-stone-800"
          >
            Kuyruk
          </Link>
          <Link
            href="/admin/products/new"
            className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[10px] font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Ürün ekle
          </Link>
        </div>
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition",
              filter === f.id
                ? "border-stone-800 bg-stone-900 text-white shadow-sm"
                : "border-stone-200/90 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-1.5 hidden rounded-md bg-stone-50/80 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-stone-500 sm:grid sm:grid-cols-[minmax(0,1fr)_6.5rem_auto_5.5rem_3.25rem] sm:gap-2">
        <span>Müşteri</span>
        <span className="font-mono normal-case">No</span>
        <span>Durum</span>
        <span className="text-right">Tutar</span>
        <span className="text-center normal-case">İşlem</span>
      </div>

      <ul className="mt-1">
        {filtered.length === 0 ? (
          <li className="py-6 text-center">
            <p className="text-[13px] font-medium text-stone-700">{orders.length === 0 ? "Henüz sipariş yok." : "Bu filtrede kayıt yok."}</p>
            {orders.length === 0 ? (
              <p className="mx-auto mt-1 max-w-sm text-[11px] leading-snug text-stone-500">
                Vitrin ve fiyatları netleştirin; yeni siparişler burada listelenir.
              </p>
            ) : null}
          </li>
        ) : (
          filtered.map((o) => {
            const chip = operationsChip(o);
            const isLead = filter === "all" && o.id === orders[0]?.id;
            return (
              <li
                key={o.id}
                className={cn(
                  "border-b border-stone-100/90 last:border-b-0",
                  isLead && "rounded-md border-l-[3px] border-l-[#b0a08c]/70 bg-stone-50/40 pl-2 sm:rounded-none sm:border-l-[3px] sm:border-l-[#b0a08c]/70 sm:bg-stone-50/25 sm:pl-2",
                )}
              >
                <div className="flex flex-col gap-1 py-2 sm:hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold leading-tight text-stone-900">{o.customer_name || "—"}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-stone-500" title={o.order_number}>
                        {shortenOrderNumberDisplay(o.order_number)}
                      </p>
                    </div>
                    <span className={cn(chipBase, chip.className)} title="Operasyon durumu">
                      {chip.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] tabular-nums text-stone-400">{formatOrderRelativeTimeTr(o.created_at)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold tabular-nums text-stone-900">{formatTryCompact(o.total)}</span>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="inline-flex min-h-[36px] min-w-[2.75rem] items-center justify-center rounded-md border border-stone-200/90 bg-white px-2.5 text-[10px] font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-stone-50"
                      >
                        Aç
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="hidden py-1.5 sm:grid sm:grid-cols-[minmax(0,1fr)_6.5rem_auto_5.5rem_3.25rem] sm:items-center sm:gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold leading-tight text-stone-900">{o.customer_name || "—"}</p>
                  </div>
                  <p className="font-mono text-[10px] text-stone-500" title={o.order_number}>
                    {shortenOrderNumberDisplay(o.order_number)}
                  </p>
                  <span className={cn(chipBase, chip.className, "w-fit")} title="Operasyon durumu">
                    {chip.label}
                  </span>
                  <div className="text-right">
                    <p className="text-[12px] font-semibold tabular-nums text-stone-900">{formatTryCompact(o.total)}</p>
                    <p className="text-[9px] tabular-nums text-stone-400">{formatOrderRelativeTimeTr(o.created_at)}</p>
                  </div>
                  <div className="flex justify-center">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="inline-flex items-center justify-center rounded-md border border-stone-200/90 bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-stone-50"
                    >
                      Aç
                    </Link>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <div className="mt-1.5 flex justify-end border-t border-stone-100/90 pt-1.5">
        <Link href="/admin/orders" className="text-[11px] font-semibold text-[#6b5b45] underline-offset-2 hover:underline">
          Tüm siparişler →
        </Link>
      </div>
    </section>
  );
}
