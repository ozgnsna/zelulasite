"use client";

import { Package, Search } from "lucide-react";
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

/** Operasyon satırı: sipariş yaşam döngüsü (kompakt, tarama hiyerarşisi). */
function opsStatusChip(o: AdminOrderListRow): { label: string; className: string } {
  const os = String(o.order_status ?? "");
  const pay = String(o.payment_status ?? "");
  if (os === "cancelled") {
    return {
      label: "İptal",
      className: "border-rose-200/55 bg-rose-50/65 text-rose-800/80 ring-rose-300/12",
    };
  }
  if (pay !== "paid") {
    return {
      label: "Beklemede",
      className: "border-amber-300/55 bg-amber-50/90 text-amber-950/90 ring-amber-400/14",
    };
  }
  if (os === "shipped" || os === "hand_delivered") {
    return {
      label: "Tamamlandı",
      className: "border-emerald-200/70 bg-emerald-50/55 text-emerald-900/85 ring-emerald-400/10",
    };
  }
  if (os === "processing") {
    return {
      label: "Hazırlanıyor",
      className: "border-slate-400/45 bg-slate-200/40 text-slate-800 ring-slate-500/12",
    };
  }
  if (os === "pending" || os === "confirmed") {
    return {
      label: "Kargoya hazır",
      className: "border-emerald-500/40 bg-emerald-100/70 text-emerald-950 ring-emerald-600/14",
    };
  }
  return { label: os || "—", className: "border-stone-200 bg-stone-50 text-stone-700" };
}

function paymentChipClass(paymentStatus: string): string {
  if (paymentStatus === "paid") return "border-emerald-200/60 bg-emerald-50/70 text-emerald-900/90";
  if (paymentStatus === "failed") return "border-rose-300/70 bg-rose-50/80 text-rose-900/90";
  return "border-stone-300/70 bg-stone-50/90 text-stone-800";
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

  const [searchQuery, setSearchQuery] = useState("");
  const queryNorm = searchQuery.trim().toLowerCase();

  const displayOrders = useMemo(() => {
    if (!queryNorm) return orders;
    return orders.filter((o) => {
      const num = String(o.order_number ?? "").toLowerCase();
      const cust = String(o.customer_name ?? "").toLowerCase();
      const pay = paymentStatusLabelTr(String(o.payment_status ?? "")).toLowerCase();
      const opsLabel = opsStatusChip(o).label.toLowerCase();
      return (
        num.includes(queryNorm) ||
        cust.includes(queryNorm) ||
        pay.includes(queryNorm) ||
        opsLabel.includes(queryNorm)
      );
    });
  }, [orders, queryNorm]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const toggleAllOnPage = useCallback(() => {
    if (displayOrders.length === 0) return;
    const allIds = displayOrders.map((o) => o.id);
    const allSelected = allIds.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(allIds));
  }, [displayOrders, selected]);

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
  const hasServerRows = orders.length > 0;
  const hasVisibleRows = displayOrders.length > 0;
  const searchActive = queryNorm.length > 0;

  const gridCols =
    "sm:grid sm:grid-cols-[1.75rem_6.25rem_minmax(0,1fr)_7.25rem_5.5rem_3.75rem_5.5rem_3.25rem] sm:items-center sm:gap-x-1.5 sm:px-1.5";

  return (
    <div className="min-w-0">
      <div className="overflow-hidden rounded-md border border-stone-200/70 bg-white/[0.38] ring-1 ring-stone-950/[0.035]">
        <div className="sticky top-0 z-30 border-b border-stone-300/50 border-l-2 border-l-amber-400/45 bg-[#f1efe9]/96 backdrop-blur-sm supports-[backdrop-filter]:bg-[#f1efe9]/90">
          <div className="flex flex-col gap-1.5 px-2 py-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
            <div className="relative w-full min-w-0 sm:w-[13.75rem] sm:max-w-[40%] sm:flex-none">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-stone-400"
                strokeWidth={2}
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sipariş no, müşteri, durum…"
                className="w-full rounded-md border border-stone-200/90 bg-white py-1 pl-8 pr-2 text-[11px] text-stone-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] placeholder:text-stone-400 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-300/40"
                aria-label="Siparişlerde ara"
              />
            </div>
            <div className="hidden h-5 w-px shrink-0 self-stretch bg-stone-300/75 sm:block" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FILTERS.map((f) => (
                <Link
                  key={f.id}
                  href={ordersListHref(f.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-1.5 py-px text-[10px] font-semibold leading-tight transition",
                    activeFilter === f.id
                      ? "border-stone-900 bg-stone-900 text-white shadow-sm"
                      : "border-stone-200/90 bg-white text-stone-700 hover:border-amber-300/60 hover:bg-amber-50/40",
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </div>
            <div className="hidden h-5 w-px shrink-0 self-stretch bg-stone-300/75 sm:block" aria-hidden />
            <div
              className={cn(
                "flex flex-wrap items-center gap-0.5 rounded-md py-px sm:px-1",
                count > 0 ? "bg-amber-50/90 ring-1 ring-amber-200/55" : "",
              )}
            >
              <span className="px-0.5 text-[10px] font-bold tabular-nums text-stone-800">{count} seçili</span>
              <button
                type="button"
                disabled={pending || count === 0}
                onClick={() => runBulk("prepare")}
                className="rounded border border-amber-700/70 bg-white px-1.5 py-px text-[10px] font-bold text-amber-950 hover:bg-amber-100/80 disabled:opacity-40"
              >
                Toplu hazırla
              </button>
              <button
                type="button"
                disabled={pending || count === 0}
                onClick={() => runBulk("ship")}
                className="rounded border border-stone-800/20 bg-stone-900 px-1.5 py-px text-[10px] font-bold text-white hover:bg-stone-800 disabled:opacity-40"
              >
                Toplu kargola
              </button>
              <button
                type="button"
                disabled={pending || count === 0}
                onClick={() => printOrderLabels(selectedRows)}
                className="rounded border border-stone-300/90 bg-white px-1.5 py-px text-[10px] font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-40"
              >
                Barkod yazdır
              </button>
              {count > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="px-0.5 text-[10px] font-semibold text-stone-600 underline-offset-2 hover:underline"
                >
                  Temizle
                </button>
              ) : null}
            </div>
            <span className="shrink-0 text-[10px] font-semibold tabular-nums text-stone-500 sm:ml-auto">
              {searchActive ? (
                <>
                  {displayOrders.length} / {orders.length} kayıt
                </>
              ) : (
                <>{orders.length} kayıt</>
              )}
            </span>
          </div>
        </div>

        <div
          className={cn(
            gridCols,
            "hidden border-b border-stone-300/55 bg-gradient-to-b from-stone-100/95 to-stone-100/75 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-stone-700",
            !hasVisibleRows && "sm:hidden",
          )}
        >
          <label className="inline-flex cursor-pointer items-center gap-1 justify-self-start text-[10px] font-semibold normal-case tracking-normal text-stone-800">
            <input
              type="checkbox"
              checked={displayOrders.length > 0 && displayOrders.every((o) => selected.has(o.id))}
              onChange={toggleAllOnPage}
              className="size-3 rounded border-stone-400 text-stone-900"
            />
            <span className="hidden lg:inline">Sayfadakiler</span>
            <span className="lg:hidden">Tümü</span>
          </label>
          <span className="font-bold text-stone-800">Sipariş</span>
          <span className="font-bold text-stone-800">Müşteri</span>
          <span className="font-bold text-stone-800">Durum</span>
          <span className="font-bold text-stone-800">Ödeme</span>
          <span className="font-bold text-stone-800">Kargo</span>
          <span className="text-right font-bold text-stone-800">Tutar</span>
          <span className="text-right font-bold text-stone-800">İşlem</span>
        </div>

        <div
          className={cn(
            "flex items-center justify-between gap-2 border-b border-stone-300/40 bg-stone-50/85 px-2 py-0.5 text-[10px] font-semibold text-stone-700 sm:hidden",
            !hasVisibleRows && "hidden",
          )}
        >
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={displayOrders.length > 0 && displayOrders.every((o) => selected.has(o.id))}
              onChange={toggleAllOnPage}
              className="size-3 rounded border-stone-400"
            />
            <span className="text-stone-800">Sayfadakiler</span>
          </label>
          <span className="tabular-nums text-stone-600">
            {searchActive ? `${displayOrders.length}/${orders.length}` : orders.length} kayıt
          </span>
        </div>

        <ul className="divide-y divide-stone-200/55">
          {!hasVisibleRows ? (
            <li className="px-3 py-4 sm:py-5">
              <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:justify-center sm:gap-4 sm:text-left">
                <Package className="size-7 shrink-0 text-stone-300" strokeWidth={1.5} aria-hidden />
                <div className="min-w-0 space-y-1">
                  <p className="text-[12px] font-semibold text-stone-800">
                    {!hasServerRows
                      ? activeFilter === "all"
                        ? "Henüz sipariş yok"
                        : "Bu filtrede sipariş yok"
                      : "Eşleşen sipariş yok"}
                  </p>
                  <p className="text-[10px] leading-snug text-stone-500">
                    {!hasServerRows ? (
                      activeFilter === "all" ? (
                        <>Yeni siparişler burada listelenir.</>
                      ) : (
                        <>Koşulları genişleterek tüm listeyi görebilirsiniz.</>
                      )
                    ) : (
                      <>Arama terimini veya filtreyi değiştirin.</>
                    )}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
                    {searchActive ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="rounded-md border border-stone-300/90 bg-white px-2.5 py-1 text-[10px] font-semibold text-stone-800 shadow-sm hover:bg-stone-50"
                      >
                        Aramayı temizle
                      </button>
                    ) : null}
                    {activeFilter !== "all" ? (
                      <Link
                        href="/admin/orders"
                        className="rounded-md border border-amber-600/25 bg-amber-50/95 px-2.5 py-1 text-[10px] font-semibold text-amber-950 shadow-sm hover:bg-amber-100/90"
                      >
                        Tüm siparişleri göster
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ) : (
            displayOrders.map((o) => {
              const ops = opsStatusChip(o);
              const payLabel = paymentStatusLabelTr(String(o.payment_status ?? ""));
              const when = new Date(o.created_at).toLocaleString("tr-TR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li key={o.id} className={cn(gridCols, "py-1 sm:py-0.5")}>
                  <div className="flex flex-col gap-0.5 sm:contents">
                    <div className="flex items-start gap-1.5 sm:contents">
                      <div className="flex shrink-0 items-center pt-0.5 sm:block sm:justify-self-center sm:pt-0">
                        <input
                          type="checkbox"
                          checked={selected.has(o.id)}
                          onChange={() => toggle(o.id)}
                          className="size-3 rounded border-stone-400"
                          aria-label={`Sipariş seç: ${o.order_number}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1 sm:block sm:min-w-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 sm:block">
                          <p className="font-mono text-[10.5px] font-semibold tabular-nums tracking-tight text-stone-900 sm:text-[10px]">
                            {shortenOrderNumberDisplay(String(o.order_number ?? ""))}
                          </p>
                          <p className="text-[10px] tabular-nums text-stone-500 sm:hidden">{when}</p>
                        </div>
                        <p className="mt-0 hidden text-[9px] tabular-nums text-stone-500 sm:block">{when}</p>
                      </div>
                    </div>
                    <div className="min-w-0 pl-6 sm:pl-0">
                      <p className="truncate text-[11px] font-semibold leading-tight text-stone-900">
                        {o.customer_name || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-0.5 flex flex-wrap items-center gap-0.5 sm:mt-0 sm:contents">
                    <span
                      className={cn(
                        "inline-flex w-fit max-w-full shrink-0 rounded-full border px-1 py-px text-[8px] font-bold uppercase tracking-wide ring-1 ring-inset",
                        ops.className,
                      )}
                    >
                      {ops.label}
                    </span>
                    <span
                      className={cn(
                        "inline-flex w-fit max-w-full shrink-0 rounded-full border px-1 py-px text-[8px] font-semibold ring-1 ring-inset",
                        paymentChipClass(String(o.payment_status ?? "")),
                      )}
                    >
                      {payLabel}
                    </span>
                    <span
                      className="inline-flex max-w-full truncate text-[10px] text-stone-600 sm:justify-self-start"
                      title={[o.shipping_provider, o.shipping_tracking_number].filter(Boolean).join(" · ") || undefined}
                    >
                      {cargoShort(o)}
                    </span>
                    <span className="text-[10.5px] font-semibold tabular-nums tracking-tight text-stone-900 sm:text-right">
                      {Number(o.total ?? 0).toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ₺
                    </span>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="inline-flex min-h-[30px] min-w-[2.25rem] items-center justify-center rounded border border-stone-800/12 bg-stone-900 px-1.5 text-[10px] font-semibold text-white hover:bg-stone-800 sm:min-h-0 sm:justify-self-end sm:py-0.5"
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
    </div>
  );
}
