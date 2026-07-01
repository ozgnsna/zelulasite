import { Fragment, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  Check,
  CreditCard,
  Eye,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminProductListThumbnail } from "@/components/admin/products/AdminProductListThumbnail";
import type { DashboardAnalyticsMetrics } from "@/lib/admin/analytics-dashboard";
import {
  buildAnalyticsFilterHref,
  type AnalyticsRangeKey,
} from "@/lib/admin/analytics-range";
import type { AnalyticsSectionData } from "@/lib/admin/fetch-analytics-section";

const ANALYTICS_THEME = {
  "--surface-1": "var(--surface)",
  "--text-primary": "#2d2521",
  "--text-secondary": "#57534e",
  "--text-muted": "#a8a29e",
  "--c-blue": "#378ADD",
  "--c-amber": "#BA7517",
  "--c-red": "#e5484d",
  "--c-green": "#30a46c",
  "--accent-bg": "color-mix(in srgb, #378ADD 14%, transparent)",
  "--accent-text": "#2563b3",
  "--warning-bg": "color-mix(in srgb, #f59e0b 18%, transparent)",
  "--warning-text": "#b45309",
  "--danger-bg": "color-mix(in srgb, #ef4444 14%, transparent)",
  "--danger-text": "#b91c1c",
} as CSSProperties;

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
      <span className="text-[0.62em] font-medium" style={{ color: "var(--text-muted)" }}>
        ,{decimals}
      </span>
      <span className="ml-0.5 text-[0.55em] font-semibold" style={{ color: "var(--text-muted)" }}>
        ₺
      </span>
    </span>
  );
}

function buildSparklineValues(previous: number, current: number, count = 8): number[] {
  if (count <= 1) return [current];
  if (previous <= 0 && current <= 0) return Array.from({ length: count }, () => 0);
  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1);
    return previous + (current - previous) * t;
  });
}

function buildSparklinePolyline(values: number[], width: number, height: number, padding = 4): string {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  return values
    .map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * innerW;
      const y = padding + innerH - ((value - min) / span) * innerH;
      return `${x},${y}`;
    })
    .join(" ");
}

function revenuePercentTrend(current: number, previous: number, compareLabel: string): ReactNode {
  if (previous <= 0 && current <= 0) {
    return <span style={{ color: "var(--text-muted)" }}>Henüz ciro verisi yok</span>;
  }
  if (previous <= 0) {
    return (
      <span className="font-semibold tabular-nums" style={{ color: "var(--c-green)" }}>
        ↑ geçen döneme göre yeni ciro
      </span>
    );
  }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  if (pct === 0) {
    return (
      <span style={{ color: "var(--text-muted)" }}>
        {compareLabel === "dün" ? "Dünle aynı" : "Geçen dönemle aynı"}
      </span>
    );
  }
  const up = pct > 0;
  const tone = up ? "var(--c-green)" : "var(--c-red)";
  return (
    <span className="inline-flex items-center gap-0.5 font-semibold tabular-nums" style={{ color: tone }}>
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      <span>
        geçen döneme göre {up ? "+" : ""}
        {pct.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
      </span>
    </span>
  );
}

function funnelConversionRate(funnel: DashboardAnalyticsMetrics["funnel"]): number {
  if (funnel.site_visit <= 0) return 0;
  return Math.round((funnel.purchase / funnel.site_visit) * 10000) / 100;
}

function stepTransitionRate(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  const rate = Math.round((current / previous) * 100);
  return Number.isFinite(rate) ? rate : null;
}

type FunnelStepConfig = {
  key: keyof DashboardAnalyticsMetrics["funnel"];
  label: string;
  icon: LucideIcon;
  barColor: string;
};

const FUNNEL_STEP_CONFIG: FunnelStepConfig[] = [
  { key: "site_visit", label: "Site ziyareti", icon: Users, barColor: "var(--c-blue)" },
  { key: "view_item", label: "Ürün görüntüleme", icon: Eye, barColor: "var(--c-blue)" },
  { key: "add_to_cart", label: "Sepete ekleme", icon: ShoppingCart, barColor: "var(--c-amber)" },
  { key: "begin_checkout", label: "Ödeme", icon: CreditCard, barColor: "var(--c-red)" },
  { key: "purchase", label: "Satış", icon: Check, barColor: "var(--c-green)" },
];

const TRANSITION_HINTS: Record<string, string> = {
  "site_visit→view_item": "Ziyaretçiler ürün sayfalarına yönlendirilmiyor olabilir.",
  "view_item→add_to_cart": "Ürün sayfaları sepete ekleme konusunda zayıf kalıyor.",
  "add_to_cart→begin_checkout": "Sepet terk oranı yüksek olabilir.",
  "begin_checkout→purchase": "Ödeme adımında kayıp yaşanıyor.",
};

function transitionBadgeTone(rate: number): { bg: string; text: string } {
  if (rate > 50) return { bg: "var(--accent-bg)", text: "var(--accent-text)" };
  if (rate >= 25) return { bg: "var(--warning-bg)", text: "var(--warning-text)" };
  return { bg: "var(--danger-bg)", text: "var(--danger-text)" };
}

function findWorstFunnelTransition(
  steps: Array<{ key: string; label: string; value: number }>,
): { from: (typeof steps)[number]; to: (typeof steps)[number]; rate: number } | null {
  let worst: { from: (typeof steps)[number]; to: (typeof steps)[number]; rate: number } | null = null;
  for (let index = 1; index < steps.length; index += 1) {
    const prev = steps[index - 1]!;
    const curr = steps[index]!;
    if (prev.value <= 0) continue;
    const rate = stepTransitionRate(curr.value, prev.value);
    if (rate == null) continue;
    if (!worst || rate < worst.rate) {
      worst = { from: prev, to: curr, rate };
    }
  }
  return worst;
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
      className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition"
      style={
        active
          ? { background: "var(--text-primary)", color: "#fffdfb" }
          : {
              border: "1px solid color-mix(in srgb, var(--text-muted) 35%, transparent)",
              background: "var(--surface-1)",
              color: "var(--text-secondary)",
            }
      }
    >
      {children}
    </Link>
  );
}

function RevenueSparklineCard({
  revenue,
  previousRevenue,
  compareLabel,
  title,
}: {
  revenue: number;
  previousRevenue: number;
  compareLabel: string;
  title: string;
}) {
  const showSparkline = Number(revenue) > 0;
  const sparkValues = buildSparklineValues(previousRevenue, revenue);
  const sparkPoints = buildSparklinePolyline(sparkValues, 120, 36);

  return (
    <article
      className="rounded-[12px] p-3"
      style={{ background: "var(--surface-1)", border: "1px solid color-mix(in srgb, var(--text-muted) 22%, transparent)" }}
    >
      <p
        className="text-[9px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: "var(--text-secondary)" }}
      >
        {title}
      </p>
      <div className="mt-1 font-serif text-2xl font-semibold tabular-nums tracking-tight" style={{ color: "var(--text-primary)" }}>
        <TryPriceSplit n={revenue} />
      </div>
      {showSparkline ? (
        <svg
          viewBox="0 0 120 36"
          className="mt-2 h-9 w-full max-w-[10rem]"
          aria-hidden
          role="presentation"
        >
          <polyline
            points={sparkPoints}
            fill="none"
            stroke="var(--c-blue)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 3"
          />
        </svg>
      ) : null}
      {showSparkline ? (
        <p className="mt-1.5 text-[10px] leading-snug">{revenuePercentTrend(revenue, previousRevenue, compareLabel)}</p>
      ) : null}
    </article>
  );
}

function ConversionGaugeCard({ rate }: { rate: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(rate, 100));
  const dash = (clamped / 100) * circumference;

  return (
    <article
      className="flex flex-col items-center justify-center rounded-[12px] p-3"
      style={{ background: "var(--surface-1)", border: "1px solid color-mix(in srgb, var(--text-muted) 22%, transparent)" }}
    >
      <p
        className="w-full text-[9px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: "var(--text-secondary)" }}
      >
        Dönüşüm oranı
      </p>
      <div className="relative mt-1 flex h-[5.5rem] w-[5.5rem] items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden role="presentation">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="color-mix(in srgb, var(--text-muted) 28%, transparent)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--c-green)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <span
          className="absolute font-serif text-xl font-semibold tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {rate.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
        </span>
      </div>
      <p className="mt-1 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
        Ziyaretçi → satış
      </p>
    </article>
  );
}

function TransitionBadge({ rate }: { rate: number }) {
  if (!Number.isFinite(rate)) return null;
  const tone = transitionBadgeTone(rate);
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
      style={{ background: tone.bg, color: tone.text }}
    >
      %
      {Math.round(rate).toLocaleString("tr-TR", { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
    </span>
  );
}

function VisualConversionFunnel({ funnel }: { funnel: DashboardAnalyticsMetrics["funnel"] }) {
  const steps = FUNNEL_STEP_CONFIG.map((config) => ({
    key: config.key,
    label: config.label,
    icon: config.icon,
    barColor: config.barColor,
    value: funnel[config.key],
  }));
  const siteVisit = Math.max(funnel.site_visit, 1);

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const barWidthPct = funnel.site_visit > 0 ? Math.round((step.value / siteVisit) * 1000) / 10 : 0;
        const prevValue = index > 0 ? steps[index - 1]!.value : null;
        const transitionRate =
          index > 0 && prevValue != null && prevValue > 0
            ? stepTransitionRate(step.value, prevValue)
            : null;

        return (
          <Fragment key={step.key}>
            {index > 0 && transitionRate != null ? (
              <div className="flex justify-center py-1.5">
                <TransitionBadge rate={transitionRate} />
              </div>
            ) : null}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{
                      background: "color-mix(in srgb, var(--text-muted) 12%, transparent)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </span>
                  <p className="truncate text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    {step.label}
                  </p>
                </div>
                <span
                  className="shrink-0 font-serif text-base font-semibold tabular-nums"
                  style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}
                >
                  {step.value.toLocaleString("tr-TR")}
                </span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-[4px]"
                style={{
                  height: "12px",
                  background: "var(--surface-1)",
                  boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--text-muted) 22%, transparent)",
                }}
              >
                <div
                  className="admin-analytics-funnel-bar h-full rounded-[4px]"
                  style={
                    {
                      width: `${barWidthPct}%`,
                      background: step.barColor,
                      animationDelay: `${index * 0.15}s`,
                    } as CSSProperties
                  }
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
    revenue,
    previousRevenue,
    productImages,
    customFromYmd,
    customToYmd,
  } = data;
  const compareLabel = range.compareLabel;
  const topViewedMaxViews =
    metrics.topViewedProducts.length > 0 ? Math.max(...metrics.topViewedProducts.map((r) => r.views)) : 1;
  const conversionRate = funnelConversionRate(metrics.funnel);
  const funnelSteps = FUNNEL_STEP_CONFIG.map((config) => ({
    key: config.key,
    label: config.label,
    value: metrics.funnel[config.key],
  }));
  const allFunnelZero = funnelSteps.every((step) => step.value === 0);
  const worstTransition = allFunnelZero ? null : findWorstFunnelTransition(funnelSteps);
  const worstHintKey = worstTransition ? `${worstTransition.from.key}→${worstTransition.to.key}` : "";
  const worstHint = TRANSITION_HINTS[worstHintKey] ?? "Bu adımda ziyaretçi kaybı en yüksek.";

  const filterOptions: Array<{ key: AnalyticsRangeKey; label: string }> = [
    { key: "today", label: "Bugün" },
    { key: "week", label: "Hafta" },
    { key: "month", label: "Ay" },
  ];

  return (
    <section
      id="analytics-detail"
      aria-label="Analitik özeti"
      className="admin-analytics-dashboard rounded-2xl border p-3 shadow-sm sm:p-4"
      style={{
        ...ANALYTICS_THEME,
        borderColor: "color-mix(in srgb, var(--text-muted) 28%, transparent)",
        background: "color-mix(in srgb, var(--surface-1) 72%, var(--background))",
      }}
    >
      <style>{`
        @keyframes admin-analytics-bar-grow {
          from { width: 0; }
        }
        .admin-analytics-dashboard .admin-analytics-funnel-bar {
          animation: admin-analytics-bar-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .admin-analytics-dashboard .admin-analytics-funnel-bar {
            animation: none;
          }
        }
      `}</style>

      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((opt) => (
          <TimeFilterButton key={opt.key} href={buildAnalyticsFilterHref(opt.key)} active={range.key === opt.key}>
            {opt.label}
          </TimeFilterButton>
        ))}
        <TimeFilterButton
          href={buildAnalyticsFilterHref("custom", { from: customFromYmd, to: customToYmd })}
          active={range.key === "custom"}
        >
          Özel
        </TimeFilterButton>
      </div>

      {range.key === "custom" ? (
        <form method="get" action="/admin#analytics-detail" className="mt-2 flex flex-wrap items-end gap-2">
          <input type="hidden" name="analyticsRange" value="custom" />
          <label className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
            Başlangıç
            <input
              type="date"
              name="analyticsFrom"
              defaultValue={customFromYmd}
              className="mt-1 block rounded-lg border px-2 py-1.5 text-xs"
              style={{
                borderColor: "color-mix(in srgb, var(--text-muted) 35%, transparent)",
                background: "var(--surface-1)",
                color: "var(--text-primary)",
              }}
            />
          </label>
          <label className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
            Bitiş
            <input
              type="date"
              name="analyticsTo"
              defaultValue={customToYmd}
              className="mt-1 block rounded-lg border px-2 py-1.5 text-xs"
              style={{
                borderColor: "color-mix(in srgb, var(--text-muted) 35%, transparent)",
                background: "var(--surface-1)",
                color: "var(--text-primary)",
              }}
            />
          </label>
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 text-[10px] font-semibold text-white"
            style={{ background: "var(--text-primary)" }}
          >
            Uygula
          </button>
        </form>
      ) : null}

      {bestSellersToday.length > 0 ? (
        <p className="mt-3 truncate text-[11px] leading-snug" style={{ color: "var(--text-secondary)" }}>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Bugün çok satanlar:
          </span>{" "}
          {bestSellersToday.slice(0, 3).map((row, index) => (
            <Fragment key={row.productId}>
              {index > 0 ? (
                <span style={{ color: "var(--text-muted)" }}> · </span>
              ) : null}
              <Link
                href={`/admin/products/${encodeURIComponent(row.productId)}/edit`}
                className="font-medium underline-offset-2 hover:underline"
                style={{ color: "var(--text-primary)" }}
              >
                {row.name}
              </Link>
              <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
                {" "}
                · {row.qty.toLocaleString("tr-TR")} adet
              </span>
            </Fragment>
          ))}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <RevenueSparklineCard
          title={range.key === "today" ? "Ciro (bugün)" : "Ciro"}
          revenue={revenue}
          previousRevenue={previousRevenue}
          compareLabel={compareLabel}
        />
        <ConversionGaugeCard rate={conversionRate} />
      </div>

      <div className="mt-4">
        <p
          className="text-[9px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--text-muted)" }}
        >
          Dönüşüm hunisi · {range.periodLabel} · benzersiz ziyaretçi
        </p>
        <div
          className="mt-3 rounded-[12px] p-3"
          style={{
            background: "var(--surface-1)",
            border: "1px solid color-mix(in srgb, var(--text-muted) 22%, transparent)",
          }}
        >
          <VisualConversionFunnel funnel={metrics.funnel} />
        </div>

        {worstTransition ? (
          <div
            className="mt-3 rounded-[12px] px-3 py-2.5 text-[12px] leading-snug"
            style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}
          >
            <p className="font-semibold">
              En büyük kayıp: {worstTransition.from.label} → {worstTransition.to.label} (%
              {worstTransition.rate.toLocaleString("tr-TR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              )
            </p>
            <p className="mt-0.5 font-medium opacity-90">{worstHint}</p>
          </div>
        ) : null}
      </div>

      {metrics.topViewedProducts.length > 0 ? (
        <div className="mt-4">
          <p
            className="text-[9px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--text-muted)" }}
          >
            En çok görüntülenen ürünler
          </p>
          <ul
            className="mt-2 divide-y overflow-visible rounded-[12px] border"
            style={{
              borderColor: "color-mix(in srgb, var(--text-muted) 22%, transparent)",
              background: "var(--surface-1)",
            }}
          >
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
                      className="block truncate text-[12px] font-medium underline-offset-2 hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {row.productName}
                    </Link>
                    <div
                      className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span>{row.views.toLocaleString("tr-TR")} görüntülenme</span>
                      <span className="font-semibold" style={{ color: "var(--accent-text)" }}>
                        Sepete ekleme %
                        {row.addToCartRate.toLocaleString("tr-TR", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1 w-full max-w-[10rem] overflow-hidden rounded-full"
                      style={{ background: "color-mix(in srgb, var(--text-muted) 28%, transparent)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((row.views / topViewedMaxViews) * 100)}%`,
                          background: "var(--text-muted)",
                        }}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/admin/products/${encodeURIComponent(row.productId)}/edit`}
                    className="shrink-0 text-[10px] font-semibold underline-offset-2 hover:underline"
                    style={{ color: "var(--accent-text)" }}
                  >
                    Ürün →
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
