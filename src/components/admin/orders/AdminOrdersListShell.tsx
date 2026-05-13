"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { updateOrderStatus } from "@/app/actions/admin";
import { paymentStatusLabelTr } from "@/lib/account/order-status";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type AdminOrderListRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  total: number;
  created_at: string;
  order_status: string;
  payment_status: string;
  shipping_status: string | null;
  shipping_provider: string | null;
  shipping_tracking_number: string | null;
};

const FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "today", label: "Bugün" },
  { id: "ship_ready", label: "Kargoya hazır" },
  { id: "payment_pending", label: "Ödeme bekleyen" },
  { id: "processing", label: "Hazırlanıyor" },
  { id: "done", label: "Tamamlanan" },
];

function shortenOrderNumberDisplay(orderNumber: string): string {
  const s = String(orderNumber ?? "").trim();
  if (s.length <= 18) return s;
  return `${s.slice(0, 10)}…${s.slice(-4)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Operasyon satırı: sipariş yaşam döngüsü (görsel hiyerarşi). */
function opsStatusChip(o: AdminOrderListRow): { label: string; className: string } {
  const os = String(o.order_status ?? "");
  const pay = String(o.payment_status ?? "");
  if (os === "cancelled") {
    return {
      label: "İptal",
      className: "border-rose-200/70 bg-rose-50/80 text-rose-800/90 ring-rose-400/12",
    };
  }
  if (pay !== "paid") {
    return {
      label: "Beklemede",
      className: "border-amber-200/80 bg-amber-50/85 text-amber-900/85 ring-amber-300/15",
    };
  }
  if (os === "shipped" || os === "hand_delivered") {
    return {
      label: "Tamamlandı",
      className: "border-emerald-300/70 bg-emerald-50/90 text-emerald-900 ring-emerald-600/10",
    };
  }
  if (os === "processing") {
    return {
      label: "Hazırlanıyor",
      className: "border-slate-400/45 bg-slate-100/90 text-slate-800 ring-slate-500/12",
    };
  }
  if (os === "pending" || os === "confirmed") {
    return {
      label: "Kargoya hazır",
      className: "border-emerald-600/35 bg-emerald-100/95 text-emerald-950 ring-emerald-700/18",
    };
  }
  return { label: os || "—", className: "border-stone-200 bg-stone-50 text-stone-700" };
}

function paymentChipClass(paymentStatus: string): string {
  if (paymentStatus === "paid") return "border-emerald-300/70 bg-emerald-50/90 text-emerald-950";
  if (paymentStatus === "failed") return "border-rose-300/80 bg-rose-50 text-rose-900";
  return "border-stone-300/80 bg-stone-50 text-stone-800";
}

function cargoShort(o: AdminOrderListRow): string {
  const tr = String(o.shipping_tracking_number ?? "").trim();
  if (tr) return "Takip var";
  const st = String(o.shipping_status ?? "").trim();
  if (st) return st.length > 14 ? `${st.slice(0, 12)}…` : st;
  const os = String(o.order_status ?? "");
  if (os === "shipped" || os === "hand_delivered") return "Sevk";
  return "—";
}

function ordersListHref(filter: string): string {
  if (!filter || filter === "all") return "/admin/orders";
  return `/admin/orders?filter=${encodeURIComponent(filter)}`;
}

function printOrderLabels(selected: AdminOrderListRow[]) {
  if (selected.length === 0) return;
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    toast.error("Pop-up engellendi — yazdırmak için izin verin.");
    return;
  }
  const rows = selected
    .map(
      (o) => `
    <div class="row">
      <div class="no">${escapeHtml(String(o.order_number ?? ""))}</div>
      <div class="sub">${escapeHtml(String(o.customer_name ?? "—"))}</div>
    </div>`,
    )
    .join("");
  const endScript = "<" + "/script>";
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Sipariş etiketleri</title>
    <style>
      body { font-family: ui-monospace, monospace; padding: 12px; }
      .row { break-inside: avoid; padding: 10px 0; border-bottom: 1px solid #ddd; }
      .no { font-size: 22px; font-weight: 800; letter-spacing: 0.02em; }
      .sub { font-size: 11px; color: #555; margin-top: 4px; }
      @media print { body { padding: 0; } .row { border-color: #ccc; } }
    </style></head><body>${rows}<script>window.onload=function(){window.print();setTimeout(function(){window.close();},250);}${endScript}</body></html>`);
  w.document.close();
}

export function AdminOrdersListShell({
  orders,
  activeFilter,
}: {
  orders: AdminOrderListRow[];
  activeFilter: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const toggleAllOnPage = useCallback(() => {
    if (orders.length === 0) return;
    const allIds = orders.map((o) => o.id);
    const allSelected = allIds.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(allIds));
  }, [orders, selected]);

  const selectedRows = useMemo(() => orders.filter((o) => selected.has(o.id)), [orders, selected]);

  const runBulk = useCallback(
    async (intent: "prepare" | "ship") => {
      if (selectedRows.length === 0) return;
      const targets =
        intent === "prepare"
          ? selectedRows.filter(
              (o) =>
                o.payment_status === "paid" &&
                o.order_status !== "cancelled" &&
                (o.order_status === "pending" || o.order_status === "confirmed"),
            )
          : selectedRows.filter(
              (o) =>
                o.payment_status === "paid" &&
                o.order_status !== "cancelled" &&
                o.order_status !== "shipped" &&
                o.order_status !== "hand_delivered",
            );
      if (targets.length === 0) {
        toast.message("Bu işlem için uygun sipariş seçilmedi.");
        return;
      }
      startTransition(async () => {
        try {
          for (const o of targets) {
            const fd = new FormData();
            fd.set("id", o.id);
            fd.set("payment_status", o.payment_status);
            fd.set("order_status", intent === "prepare" ? "processing" : "shipped");
            await updateOrderStatus(fd);
          }
          toast.success(
            intent === "prepare"
              ? `${targets.length} sipariş hazırlanıyor olarak işlendi.`
              : `${targets.length} sipariş kargoda olarak işlendi.`,
          );
          setSelected(new Set());
          router.refresh();
        } catch {
          toast.error("İşlem sırasında hata oluştu.");
        }
      });
    },
    [router, selectedRows],
  );

  const count = selected.size;

  return (
    <div className="min-w-0">
      <div className="sticky top-0 z-30 -mx-1 border-b border-stone-200/80 bg-[#eceae6]/95 px-1 pb-1.5 pt-0.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:flex-wrap sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={ordersListHref(f.id)}
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                activeFilter === f.id
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div
          className={cn(
            "mt-1.5 flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1 shadow-sm",
            count > 0 ? "border-amber-200/60 bg-amber-50/90" : "border-stone-200/70 bg-white/80",
          )}
        >
          <span className="text-[10px] font-bold tabular-nums text-stone-800">{count} seçili</span>
          <button
            type="button"
            disabled={pending || count === 0}
            onClick={() => runBulk("prepare")}
            className="rounded-md border border-amber-700/80 bg-white px-2 py-0.5 text-[10px] font-bold text-amber-950 hover:bg-amber-100/80 disabled:opacity-40"
          >
            Toplu hazırla
          </button>
          <button
            type="button"
            disabled={pending || count === 0}
            onClick={() => runBulk("ship")}
            className="rounded-md border border-stone-800/20 bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-stone-800 disabled:opacity-40"
          >
            Toplu kargola
          </button>
          <button
            type="button"
            disabled={pending || count === 0}
            onClick={() => printOrderLabels(selectedRows)}
            className="rounded-md border border-stone-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-40"
          >
            Barkod yazdır
          </button>
          {count > 0 ? (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto text-[10px] font-semibold text-stone-600 underline-offset-2 hover:underline"
            >
              Seçimi temizle
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 border-b border-stone-200/60 pb-0.5 text-[9px] font-semibold uppercase tracking-wide text-stone-500">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-stone-600">
          <input
            type="checkbox"
            checked={orders.length > 0 && orders.every((o) => selected.has(o.id))}
            onChange={toggleAllOnPage}
            className="size-3.5 rounded border-stone-400"
          />
          <span className="normal-case">Sayfadakiler</span>
        </label>
        <span className="tabular-nums text-stone-400">{orders.length} kayıt</span>
      </div>

      <div
        className="mt-0.5 hidden gap-x-2 border-b border-stone-200/40 pb-0.5 text-[8px] font-bold uppercase tracking-wide text-stone-400 sm:grid sm:grid-cols-[2rem_6.5rem_minmax(0,1fr)_auto_auto_auto_5.25rem_auto] sm:items-end sm:pl-0.5"
        aria-hidden
      >
        <span />
        <span>Sipariş</span>
        <span>Müşteri</span>
        <span>Durum</span>
        <span>Ödeme</span>
        <span>Kargo</span>
        <span className="text-right">Tutar</span>
        <span className="text-right">İşlem</span>
      </div>

      <ul className="divide-y divide-stone-200/50">
        {orders.length === 0 ? (
          <li className="py-6 text-center text-[13px] text-stone-500">Bu görünümde sipariş yok.</li>
        ) : (
          orders.map((o) => {
            const ops = opsStatusChip(o);
            const payLabel = paymentStatusLabelTr(String(o.payment_status ?? ""));
            const when = new Date(o.created_at).toLocaleString("tr-TR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <li key={o.id} className="py-1.5 sm:grid sm:grid-cols-[2rem_6.5rem_minmax(0,1fr)_auto_auto_auto_5.25rem_auto] sm:items-center sm:gap-x-2 sm:py-1">
                <div className="flex flex-col gap-0.5 sm:contents">
                  <div className="flex items-start gap-2 sm:contents">
                    <div className="flex shrink-0 items-center pt-0.5 sm:block sm:justify-self-center sm:pt-0">
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggle(o.id)}
                        className="size-3.5 rounded border-stone-400"
                        aria-label={`Sipariş seç: ${o.order_number}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1 sm:block sm:min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 sm:block">
                        <p className="font-mono text-[11px] font-medium text-stone-800 sm:text-[10px]">
                          {shortenOrderNumberDisplay(String(o.order_number ?? ""))}
                        </p>
                        <p className="text-[10px] tabular-nums text-stone-400 sm:hidden">{when}</p>
                      </div>
                      <p className="mt-0.5 hidden text-[9px] tabular-nums text-stone-400 sm:block">{when}</p>
                    </div>
                  </div>
                  <div className="min-w-0 pl-7 sm:pl-0">
                    <p className="truncate text-[11px] font-semibold leading-tight text-stone-900 sm:text-[11px]">
                      {o.customer_name || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-0.5 sm:mt-0 sm:contents">
                  <span
                    className={cn(
                      "inline-flex w-fit shrink-0 rounded-full border px-1.5 py-[1px] text-[8.5px] font-bold uppercase tracking-wide ring-1 ring-inset",
                      ops.className,
                    )}
                  >
                    {ops.label}
                  </span>
                  <span
                    className={cn(
                      "inline-flex w-fit shrink-0 rounded-full border px-1.5 py-[1px] text-[8.5px] font-semibold ring-1 ring-inset",
                      paymentChipClass(String(o.payment_status ?? "")),
                    )}
                  >
                    {payLabel}
                  </span>
                  <span
                    className="inline-flex max-w-[5.5rem] truncate text-[10px] text-stone-600 sm:max-w-[4.5rem] sm:justify-self-start"
                    title={[o.shipping_provider, o.shipping_tracking_number].filter(Boolean).join(" · ") || undefined}
                  >
                    {cargoShort(o)}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-stone-900 sm:text-right">
                    {Number(o.total ?? 0).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ₺
                  </span>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="inline-flex min-h-[34px] min-w-[2.5rem] items-center justify-center rounded-md border border-stone-800/15 bg-stone-900 px-1.5 text-[10px] font-semibold text-white hover:bg-stone-800 sm:min-h-0 sm:justify-self-end sm:px-2 sm:py-px sm:text-[10px]"
                  >
                    Aç
                  </Link>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
