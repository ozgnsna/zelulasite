import { Fragment, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDown,
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
  "--border": "color-mix(in srgb, var(--text-muted) 28%, transparent)",
  "--radius": "8px",
  "--bg-accent": "color-mix(in srgb, #2a78d6 14%, transparent)",
  "--text-accent": "#1e5fad",
  "--bg-warning": "color-mix(in srgb, #f59e0b 16%, transparent)",
  "--text-warning": "#b45309",
  "--border-warning": "#d97706",
} as CSSProperties;

const GAUGE_CIRCUMFERENCE = 239;

function splitTryParts(n: number): { main: string; decimals: string } {
  const full = n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const i = full.lastIndexOf(",");
  if (i === -1) return { main: full, decimals: "00" };
  return { main: full.slice(0, i), decimals: full.slice(i + 1) };
}

function TryPriceSplit({ n }: { n: number }) {
  const { main, decimals } = splitTryParts(n);
  return (
    <span className="inline-flex items-baseline gap-0 tabular-nums" style={{ lineHeight: 1 }}>
      <span>{main}</span>
      <span className="text-[0.5em] font-medium" style={{ color: "var(--text-muted)" }}>
        ,{decimals}
      </span>
      <span className="ml-0.5 text-[0.45em] font-medium" style={{ color: "var(--text-muted)" }}>
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
      <span className="font-medium tabular-nums" style={{ color: "#1baf7a" }}>
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
  const tone = up ? "#1baf7a" : "#e34948";
  return (
    <span className="inline-flex items-center gap-0.5 font-medium tabular-nums" style={{ color: tone }}>
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
  return Math.round((funnel.purchase / funnel.site_visit) * 100);
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
  iconColor: string;
  barColor: string;
};

const FUNNEL_STEP_CONFIG: FunnelStepConfig[] = [
  { key: "site_visit", label: "Site ziyareti", icon: Users, iconColor: "#2a78d6", barColor: "#2a78d6" },
  { key: "view_item", label: "Ürün görüntüleme", icon: Eye, iconColor: "#2a78d6", barColor: "#2a78d6" },
  { key: "add_to_cart", label: "Sepete ekleme", icon: ShoppingCart, iconColor: "#eda100", barColor: "#eda100" },
  { key: "begin_checkout", label: "Ödeme", icon: CreditCard, iconColor: "#e34948", barColor: "#e34948" },
  { key: "purchase", label: "Satış", icon: Check, iconColor: "#1baf7a", barColor: "#1baf7a" },
];

const TRANSITION_HINTS: Record<string, string> = {
  "site_visit→view_item": "Ziyaretçiler ürün sayfalarına yönlendirilmiyor olabilir.",
  "view_item→add_to_cart": "Ürün sayfaları sepete ekleme konusunda zayıf kalıyor.",
  "add_to_cart→begin_checkout": "Sepet terk oranı yüksek olabilir.",
  "begin_checkout→purchase": "Ödeme adımında kayıp yaşanıyor.",
};

function transitionBadgeStyle(rate: number): { bg: string; text: string; label: string } {
  if (rate === 0) {
    return { bg: "var(--border)", text: "var(--text-muted)", label: "%0 devam etti" };
  }
  if (rate > 50) {
    return {
      bg: "var(--bg-accent)",
      text: "var(--text-accent)",
      label: `%${rate.toLocaleString("tr-TR")}`,
    };
  }
  return {
    bg: "var(--border)",
    text: "var(--text-muted)",
    label: `%${rate.toLocaleString("tr-TR")}`,
  };
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
      className="px-2.5 py-1.5 text-[10px] font-semibold transition"
      style={
        active
          ? {
              background: "var(--text-primary)",
              color: "#fffdfb",
              borderRadius: "var(--radius)",
            }
          : {
              border: "1px solid var(--border)",
              background: "var(--surface-1)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius)",
            }
      }
    >
      {children}
    </Link>
  );
}

function RevenueCard({
  revenue,
  previousRevenue,
  compareLabel,
}: {
  revenue: number;
  previousRevenue: number;
  compareLabel: string;
}) {
  const hasRevenue = revenue > 0;
  const sparkValues = buildSparklineValues(previousRevenue, revenue);
  const sparkPoints = buildSparklinePolyline(sparkValues, 120, 36);

  return (
    <article
      className="rounded-[12px]"
      style={{ background: "var(--surface-1)", padding: "16px 18px" }}
    >
      <p
        className="text-[11px] font-medium uppercase"
        style={{ color: "var(--text-muted)", letterSpacing: "0.06em" }}
      >
        CİRO
      </p>
      <div
        className="mt-2 text-[32px] font-medium tabular-nums"
        style={{ color: "var(--text-primary)", lineHeight: 1 }}
      >
        <TryPriceSplit n={revenue} />
      </div>
      {hasRevenue ? (
        <>
          <p className="mt-2 text-[11px] leading-snug">{revenuePercentTrend(revenue, previousRevenue, compareLabel)}</p>
          <svg
            viewBox="0 0 120 36"
            className="mt-2 h-9 w-full max-w-[10rem]"
            aria-hidden
            role="presentation"
          >
            <polyline
              points={sparkPoints}
              fill="none"
              stroke="#2a78d6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </>
      ) : (
        <p className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
          Ay başlangıcı — veri birikirken
        </p>
      )}
    </article>
  );
}

function ConversionGaugeCard({ rate }: { rate: number }) {
  const clamped = Math.max(0, Math.min(rate, 100));
  const dashOffset = GAUGE_CIRCUMFERENCE - (clamped / 100) * GAUGE_CIRCUMFERENCE;

  return (
    <article
      className="flex flex-col items-center justify-center rounded-[12px]"
      style={{ background: "var(--surface-1)", padding: "16px 18px" }}
    >
      <div className="relative flex h-[72px] w-[72px] items-center justify-center">
        <svg viewBox="0 0 96 96" className="h-[72px] w-[72px]" aria-hidden role="presentation">
          <circle
            cx="48"
            cy="48"
            r="38"
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
          />
          <circle
            cx="48"
            cy="48"
            r="38"
            fill="none"
            stroke="#2a78d6"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={GAUGE_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 48 48)"
          />
          <text
            x="48"
            y="48"
            textAnchor="middle"
            dominantBaseline="central"
            className="tabular-nums"
            style={{ fontSize: 15, fontWeight: 500, fill: "var(--text-primary)" }}
          >
            %{Math.round(clamped).toLocaleString("tr-TR")}
          </text>
        </svg>
      </div>
      <p className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
        Ziyaretçi → satış
      </p>
    </article>
  );
}

function TransitionRow({ rate }: { rate: number }) {
  const style = transitionBadgeStyle(rate);
  return (
    <div
      className="flex items-center"
      style={{ gap: 6, padding: "3px 0 3px 4px" }}
    >
      <ArrowDown className="h-[13px] w-[13px] shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden />
      <span
        className="text-[11px] font-medium tabular-nums"
        style={{
          padding: "2px 8px",
          borderRadius: "var(--radius)",
          background: style.bg,
          color: style.text,
        }}
      >
        {style.label}
      </span>
    </div>
  );
}

function VisualConversionFunnel({ funnel }: { funnel: DashboardAnalyticsMetrics["funnel"] }) {
  const steps = FUNNEL_STEP_CONFIG.map((config) => ({
    key: config.key,
    label: config.label,
    icon: config.icon,
    iconColor: config.iconColor,
    barColor: config.barColor,
    value: funnel[config.key],
  }));

  return (
    <div>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const barWidthPct = funnel.site_visit > 0 ? (step.value / funnel.site_visit) * 100 : 0;
        const isLast = index === steps.length - 1;
        const prevValue = index > 0 ? steps[index - 1]!.value : null;
        const transitionRate =
          index > 0 && prevValue != null && prevValue > 0
            ? stepTransitionRate(step.value, prevValue)
            : null;

        return (
          <Fragment key={step.key}>
            {index > 0 && transitionRate != null ? <TransitionRow rate={transitionRate} /> : null}
            <div
              className="admin-analytics-funnel-step grid items-center"
              style={
                {
                  gridTemplateColumns: "130px 1fr 32px",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: isLast ? "none" : "0.5px solid var(--border)",
                  animationDelay: `${index * 0.12}s`,
                } as CSSProperties
              }
            >
              <div className="flex min-w-0 items-center" style={{ gap: 7 }}>
                <Icon className="h-[15px] w-[15px] shrink-0" style={{ color: step.iconColor }} strokeWidth={2} aria-hidden />
                <span className="truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  {step.label}
                </span>
              </div>
              <div
                className="overflow-hidden"
                style={{
                  background: "var(--border)",
                  borderRadius: 4,
                  height: 8,
                }}
              >
                <div
                  className="admin-analytics-funnel-bar h-full"
                  style={
                    {
                      width: `${barWidthPct}%`,
                      background: step.barColor,
                      borderRadius: 4,
                      animationDelay: `${index * 0.1}s`,
                    } as CSSProperties
                  }
                />
              </div>
              <span
                className="text-right text-[15px] font-medium tabular-nums"
                style={{ color: step.value === 0 ? "var(--text-muted)" : "var(--text-primary)" }}
              >
                {step.value.toLocaleString("tr-TR")}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function FunnelWarningBox({
  funnel,
  worstTransition,
}: {
  funnel: DashboardAnalyticsMetrics["funnel"];
  worstTransition: { from: { key: string; label: string }; to: { key: string; label: string }; rate: number } | null;
}) {
  const allZero = FUNNEL_STEP_CONFIG.every((c) => funnel[c.key] === 0);
  if (allZero) return null;

  let title: string;
  let hint: string;

  if (funnel.site_visit > 0 && funnel.view_item === 0) {
    title = "En büyük kayıp: Site ziyareti → Ürün görüntüleme (%0)";
    hint = TRANSITION_HINTS["site_visit→view_item"]!;
  } else if (worstTransition) {
    const hintKey = `${worstTransition.from.key}→${worstTransition.to.key}`;
    title = `En büyük kayıp: ${worstTransition.from.label} → ${worstTransition.to.label} (%${worstTransition.rate.toLocaleString("tr-TR")})`;
    hint = TRANSITION_HINTS[hintKey] ?? "Bu adımda ziyaretçi kaybı en yüksek.";
  } else {
    return null;
  }

  return (
    <div
      className="mt-3"
      style={{
        background: "var(--bg-warning)",
        borderRadius: "var(--radius)",
        borderLeft: "3px solid var(--border-warning)",
        padding: "12px 14px",
      }}
    >
      <p className="text-[12px] font-medium" style={{ color: "var(--text-warning)", marginBottom: 2 }}>
        {title}
      </p>
      <p className="text-[11px]" style={{ color: "var(--text-warning)" }}>
        {hint}
      </p>
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
  const worstTransition = findWorstFunnelTransition(funnelSteps);

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
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--surface-1) 72%, var(--background))",
      }}
    >
      <style>{`
        @keyframes admin-analytics-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes admin-analytics-bar-grow {
          from { width: 0; }
        }
        .admin-analytics-dashboard .admin-analytics-funnel-step {
          animation: admin-analytics-fadein 0.6s ease both;
        }
        .admin-analytics-dashboard .admin-analytics-funnel-bar {
          animation: admin-analytics-bar-grow 1s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .admin-analytics-dashboard .admin-analytics-funnel-step,
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
                borderColor: "var(--border)",
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
                borderColor: "var(--border)",
                background: "var(--surface-1)",
                color: "var(--text-primary)",
              }}
            />
          </label>
          <button
            type="submit"
            className="px-3 py-1.5 text-[10px] font-semibold text-white"
            style={{ background: "var(--text-primary)", borderRadius: "var(--radius)" }}
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

      <div className="mt-4 grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <RevenueCard revenue={revenue} previousRevenue={previousRevenue} compareLabel={compareLabel} />
        <ConversionGaugeCard rate={conversionRate} />
      </div>

      <div className="mt-4">
        <p
          className="text-[11px] font-medium uppercase"
          style={{ color: "var(--text-muted)", letterSpacing: "0.07em" }}
        >
          Dönüşüm hunisi · {range.periodLabel} · benzersiz ziyaretçi
        </p>
        <div className="mt-3">
          <VisualConversionFunnel funnel={metrics.funnel} />
        </div>
        <FunnelWarningBox funnel={metrics.funnel} worstTransition={worstTransition} />
      </div>

      {metrics.topViewedProducts.length > 0 ? (
        <div className="mt-4">
          <p
            className="text-[11px] font-medium uppercase"
            style={{ color: "var(--text-muted)", letterSpacing: "0.07em" }}
          >
            En çok görüntülenen ürünler
          </p>
          <ul
            className="mt-2 divide-y overflow-visible rounded-[12px] border"
            style={{
              borderColor: "var(--border)",
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
                      <span className="font-semibold" style={{ color: "var(--text-accent)" }}>
                        Sepete ekleme %
                        {row.addToCartRate.toLocaleString("tr-TR", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1 w-full max-w-[10rem] overflow-hidden rounded-full"
                      style={{ background: "var(--border)" }}
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
                    style={{ color: "var(--text-accent)" }}
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
