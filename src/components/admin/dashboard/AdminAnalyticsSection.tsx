import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ChevronRight } from "lucide-react";
import { AdminProductListThumbnail } from "@/components/admin/products/AdminProductListThumbnail";
import type { DashboardAnalyticsMetrics } from "@/lib/admin/analytics-dashboard";
import {
  buildAnalyticsFilterHref,
  type AnalyticsRangeKey,
} from "@/lib/admin/analytics-range";
import type { AnalyticsSectionData } from "@/lib/admin/fetch-analytics-section";

function splitTryParts(n: number): { main: string; decimals: string } {
  const full = n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const i = full.lastIndexOf(",");
  if (i === -1) return { main: full, decimals: "00" };
  return { main: full.slice(0, i), decimals: full.slice(i + 1) };
}

function TryPriceSplit({ n, className }: { n: number; className?: string }) {
  const { main, decimals } = splitTryParts(n);
  return (
    <span className={`inline-flex items-baseline gap-0 tabular-nums ${className ?? ""}`}>
      <span>{main}</span>
      <span className="text-[0.62em] font-medium text-stone-500">,{decimals}</span>
      <span className="ml-0.5 text-[0.55em] font-semibold text-stone-400">₺</span>
    </span>
  );
}

function funnelDropOffPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((previous - current) / previous) * 1000) / 10;
}

function countTrend(current: number, previous: number, compareLabel: string): ReactNode {
  const d = current - previous;
  if (d === 0) {
    return (
      <span className="font-medium text-stone-500">
        {compareLabel === "dün" ? "Dünle aynı" : "Önceki dönemle aynı"}
      </span>
    );
  }
  const up = d > 0;
  const abs = Math.abs(d).toLocaleString("tr-TR");
  const tone = up ? "text-emerald-700" : "text-rose-700";
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${tone}`}>
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      <span>
        {up ? "+" : "−"}
        {abs} {compareLabel === "dün" ? "dünden" : "önceki dönemden"}
      </span>
    </span>
  );
}

function revenueTrend(current: number, previous: number, compareLabel: string): ReactNode {
  const d = Math.round((current - previous) * 100) / 100;
  if (d === 0) {
    return (
      <span className="font-medium text-stone-500">
        {compareLabel === "dün" ? "Dünle aynı" : "Önceki dönemle aynı"}
      </span>
    );
  }
  const up = d > 0;
  const abs = Math.abs(d);
  const tone = up ? "text-emerald-700" : "text-rose-700";
  const { main, decimals } = splitTryParts(abs);
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${tone}`}>
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      <span>
        {up ? "+" : "−"}
        {main},{decimals} ₺ {compareLabel === "dün" ? "dünden" : "önceki dönemden"}
      </span>
    </span>
  );
}

function percentTrend(current: number, previous: number, compareLabel: string): ReactNode {
  const d = Math.round((current - previous) * 100) / 100;
  if (d === 0) {
    return (
      <span className="font-medium text-stone-500">
        {compareLabel === "dün" ? "Dünle aynı" : "Önceki dönemle aynı"}
      </span>
    );
  }
  const up = d > 0;
  const tone = up ? "text-emerald-700" : "text-rose-700";
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${tone}`}>
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      <span>
        {up ? "+" : "−"}
        {Math.abs(d).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} puan{" "}
        {compareLabel === "dün" ? "dünden" : "önceki dönemden"}
      </span>
    </span>
  );
}

function AnalyticsMetricCard({
  title,
  value,
  valueNode,
  trend,
}: {
  title: string;
  value?: string;
  valueNode?: ReactNode;
  trend?: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-stone-200/60 bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] px-3 py-2.5 shadow-[0_2px_14px_-6px_rgba(28,25,23,0.05)]">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-stone-600">{title}</p>
      <div className="mt-1 font-serif text-xl font-semibold tabular-nums tracking-tight text-stone-950">
        {valueNode ?? value}
      </div>
      {trend ? <p className="mt-1 text-[10px] leading-snug text-stone-600">{trend}</p> : null}
    </article>
  );
}

function TimeFilterButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${
        active
          ? "bg-stone-900 text-white shadow-sm"
          : "border border-stone-200/70 bg-white/80 text-stone-700 hover:border-stone-300 hover:bg-white"
      }`}
    >
      {children}
    </Link>
  );
}

function ConversionFunnel({
  funnel,
  maxValue,
}: {
  funnel: DashboardAnalyticsMetrics["funnel"];
  maxValue: number;
}) {
  const steps = [
    { key: "view", label: "Ürün Görüntüleme", value: funnel.view_item },
    { key: "cart", label: "Sepete Ekleme", value: funnel.add_to_cart },
    { key: "pay", label: "Ödeme Adımı", value: funnel.begin_checkout },
    { key: "buy", label: "Satın Alma", value: funnel.purchase },
  ] as const;

  const barMax = Math.max(maxValue, 1);

  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const prev = index > 0 ? steps[index - 1]!.value : null;
        const dropOff = prev != null ? funnelDropOffPct(step.value, prev) : null;
        const widthPct = Math.max(8, Math.round((step.value / barMax) * 100));

        return (
          <Fragment key={step.key}>
            {index > 0 ? (
              <div className="flex items-center gap-2 pl-1 text-[10px] text-stone-500">
                <ArrowDown className="size-3 shrink-0 text-stone-400" aria-hidden />
                {dropOff != null && dropOff > 0 ? (
                  <span className="font-semibold text-rose-700/90">−{dropOff.toLocaleString("tr-TR")}% düşüş</span>
                ) : dropOff === 0 ? (
                  <span className="font-medium text-stone-500">Adım kaybı yok</span>
                ) : (
                  <span className="font-medium text-stone-500">Önceki adım yok</span>
                )}
                {prev != null && prev > 0 ? (
                  <span className="text-stone-400">
                    ({step.value.toLocaleString("tr-TR")} / {prev.toLocaleString("tr-TR")})
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="rounded-lg border border-stone-200/55 bg-white px-3 py-2 shadow-[0_1px_0_0_rgba(28,25,23,0.03)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-stone-600">{step.label}</p>
                  <p className="mt-0.5 font-serif text-lg font-semibold tabular-nums text-stone-950">
                    {step.value.toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1 text-stone-300 sm:flex" aria-hidden>
                  {index < steps.length - 1 ? <ChevronRight className="size-4" /> : null}
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8a734f]/80 to-stone-700/70 transition-all"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

export type BestSellerTodayRow = {
  productId: string;
  name: string;
  qty: number;
};

export function AdminAnalyticsSection({
  data,
  bestSellersToday = [],
}: {
  data: AnalyticsSectionData;
  bestSellersToday?: BestSellerTodayRow[];
}) {
  const {
    range,
    metrics,
    previousMetrics,
    revenue,
    previousRevenue,
    averageOrderValue,
    previousAverageOrderValue,
    productImages,
    customFromYmd,
    customToYmd,
  } = data;
  const compareLabel = range.compareLabel;
  const topViewedMaxViews =
    metrics.topViewedProducts.length > 0 ? Math.max(...metrics.topViewedProducts.map((r) => r.views)) : 1;
  const funnelMax = Math.max(metrics.funnel.view_item, 1);

  const filterOptions: Array<{ key: AnalyticsRangeKey; label: string }> = [
    { key: "today", label: "Bugün" },
    { key: "week", label: "Bu hafta" },
    { key: "month", label: "Bu ay" },
  ];

  return (
    <section
      id="analytics-detail"
      aria-label="Analitik özeti"
      className="rounded-2xl border border-stone-200/45 bg-stone-50/35 p-3 shadow-sm ring-1 ring-stone-900/[0.02] sm:p-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div>
          <h2 className="font-serif text-lg font-light tracking-tight text-stone-900">Analitik özeti</h2>
          <p className="mt-0.5 text-[11px] text-stone-600">
            {range.periodLabel} · vitrin olayları · ziyaretçi = tarayıcı profili (client_id)
          </p>
        </div>
        <a href="#visitor-analytics" className="text-[10px] font-semibold text-[#8a734f] underline-offset-2 hover:underline">
          Ziyaretçi özeti ↑
        </a>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {filterOptions.map((opt) => (
          <TimeFilterButton key={opt.key} href={buildAnalyticsFilterHref(opt.key)} active={range.key === opt.key}>
            {opt.label}
          </TimeFilterButton>
        ))}
        <TimeFilterButton
          href={buildAnalyticsFilterHref("custom", { from: customFromYmd, to: customToYmd })}
          active={range.key === "custom"}
        >
          Özel aralık
        </TimeFilterButton>
      </div>

      {range.key === "custom" ? (
        <form method="get" action="/admin#analytics-detail" className="mt-2 flex flex-wrap items-end gap-2">
          <input type="hidden" name="analyticsRange" value="custom" />
          <label className="text-[10px] font-semibold text-stone-600">
            Başlangıç
            <input
              type="date"
              name="analyticsFrom"
              defaultValue={customFromYmd}
              className="mt-1 block rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900"
            />
          </label>
          <label className="text-[10px] font-semibold text-stone-600">
            Bitiş
            <input
              type="date"
              name="analyticsTo"
              defaultValue={customToYmd}
              className="mt-1 block rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-stone-800"
          >
            Uygula
          </button>
        </form>
      ) : null}

      {bestSellersToday.length > 0 ? (
        <p className="mt-3 truncate text-[11px] leading-snug text-stone-700">
          <span className="font-semibold text-stone-800">Bugün çok satanlar:</span>{" "}
          {bestSellersToday.slice(0, 3).map((row, index) => (
            <Fragment key={row.productId}>
              {index > 0 ? <span className="text-stone-400"> · </span> : null}
              <Link
                href={`/admin/products/${encodeURIComponent(row.productId)}/edit`}
                className="font-medium text-stone-800 underline-offset-2 hover:text-[#6b5430] hover:underline"
              >
                {row.name}
              </Link>
              <span className="tabular-nums text-stone-600"> · {row.qty.toLocaleString("tr-TR")} adet</span>
            </Fragment>
          ))}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <AnalyticsMetricCard
          title="Ürün Görüntüleme"
          value={metrics.productViews.toLocaleString("tr-TR")}
          trend={countTrend(metrics.productViews, previousMetrics.productViews, compareLabel)}
        />
        <AnalyticsMetricCard
          title="Sepete Ekleme"
          value={metrics.addToCarts.toLocaleString("tr-TR")}
          trend={countTrend(metrics.addToCarts, previousMetrics.addToCarts, compareLabel)}
        />
        <AnalyticsMetricCard
          title="Ödeme Adımı"
          value={metrics.checkoutStarts.toLocaleString("tr-TR")}
          trend={countTrend(metrics.checkoutStarts, previousMetrics.checkoutStarts, compareLabel)}
        />
        <AnalyticsMetricCard
          title="Satın Alma"
          value={metrics.purchases.toLocaleString("tr-TR")}
          trend={countTrend(metrics.purchases, previousMetrics.purchases, compareLabel)}
        />
        <AnalyticsMetricCard
          title="Dönüşüm"
          value={`${metrics.conversionRate.toLocaleString("tr-TR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}%`}
          trend={percentTrend(metrics.conversionRate, previousMetrics.conversionRate, compareLabel)}
        />
        <AnalyticsMetricCard
          title={range.key === "today" ? "Ciro (bugün)" : "Ciro"}
          valueNode={<TryPriceSplit n={revenue} />}
          trend={revenueTrend(revenue, previousRevenue, compareLabel)}
        />
        <AnalyticsMetricCard
          title="Ort. sipariş tutarı"
          valueNode={<TryPriceSplit n={averageOrderValue} />}
          trend={revenueTrend(averageOrderValue, previousAverageOrderValue, compareLabel)}
        />
      </div>

      <div className="mt-4 rounded-xl border border-stone-200/50 bg-white/70 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Dönüşüm hunisi</p>
        <p className="mt-0.5 text-[10px] text-stone-500">Her adımda bir öncekine göre kayıp yüzdesi</p>
        <div className="mt-3">
          <ConversionFunnel funnel={metrics.funnel} maxValue={funnelMax} />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">En çok görüntülenen ürünler</p>
        {metrics.topViewedProducts.length === 0 ? (
          <p className="mt-2 text-[11px] text-stone-500">Seçili dönemde görüntülenme yok.</p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-200/50 overflow-visible rounded-xl border border-stone-200/50 bg-white/80">
            {metrics.topViewedProducts.map((row) => {
              const imageUrl = productImages[row.productId];
              return (
                <li key={row.productId} className="flex items-center gap-3 overflow-visible px-3 py-2.5">
                  <Link
                    href={`/admin/products/${encodeURIComponent(row.productId)}/edit`}
                    className="shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a734f]"
                  >
                    <AdminProductListThumbnail src={imageUrl ?? null} alt={row.productName} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/products/${encodeURIComponent(row.productId)}/edit`}
                      className="block truncate text-[12px] font-medium text-stone-800 underline-offset-2 hover:text-[#6b5430] hover:underline"
                    >
                      {row.productName}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-stone-500">
                      <span>{row.views.toLocaleString("tr-TR")} görüntülenme</span>
                      <span className="font-semibold text-[#8a734f]">
                        Sepete ekleme %
                        {row.addToCartRate.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 w-full max-w-[10rem] overflow-hidden rounded-full bg-stone-200/90">
                      <div
                        className="h-full rounded-full bg-stone-400/90"
                        style={{ width: `${Math.round((row.views / topViewedMaxViews) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/admin/products/${encodeURIComponent(row.productId)}/edit`}
                    className="shrink-0 text-[10px] font-semibold text-[#8a734f] underline-offset-2 hover:underline"
                  >
                    Ürün →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
