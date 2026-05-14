import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { paymentStatusLabelTr, orderStatusLabelTr } from "@/lib/account/order-status";
import {
  formatAdminMoney,
  orderBadgeClasses,
  paymentBadgeClasses,
  pickCoverImageUrl,
} from "@/lib/admin/order-detail-ui";
import { callbackLogStatusLabelTr, callbackVerificationLabelTr } from "@/lib/admin/order-callback-copy";
import type { AdminOrderTimelineStep } from "@/lib/admin/order-timeline";
import { AdminOrderActionBar } from "@/components/admin/orders/AdminOrderActionBar";
import { AdminDhlCreateShipmentButton } from "@/components/admin/orders/AdminDhlCreateShipmentButton";
import { AdminOrderCallbackHistory } from "@/components/admin/orders/AdminOrderCallbackHistory";
import { AdminCopyableSecret } from "@/components/admin/orders/AdminCopyableSecret";

export type AdminOrderLine = {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant_label?: string | null;
  products: {
    id: string;
    name: string | null;
    slug: string | null;
    material?: string | null;
    color?: string | null;
    product_images?: { image_url: string; is_cover?: boolean | null; sort_order?: number | null }[] | null;
  } | null;
};

export type AdminCustomerOrderInsight = {
  orderCount: number;
  lifetimeTotalTry: number;
  matchBy: "email" | "user";
  sumCapped: boolean;
};

type PaymentLogRow = {
  id: string;
  event_type: string | null;
  status: string;
  verification_status: string | null;
  reference: string | null;
  callback_hash: string | null;
  created_at: string;
  callback_payload: unknown;
  request_payload: unknown;
};

type OrderRow = Record<string, unknown> & {
  id: string;
  order_number: string;
  customer_name: string;
  email: string;
  phone: string;
  subtotal: string | number;
  discount_amount?: string | number | null;
  discount_label?: string | null;
  total: string | number;
  currency: string;
  payment_status: string;
  order_status: string;
  payment_provider?: string | null;
  payment_reference?: string | null;
  created_at: string;
  updated_at?: string | null;
  loyalty_redeem_points?: number | null;
  shipping_address_json?: unknown;
  shipping_provider?: string | null;
  shipping_tracking_number?: string | null;
  shipping_label_url?: string | null;
  shipping_status?: string | null;
  shipping_created_at?: string | null;
};

const card =
  "rounded-[20px] border border-[#dfd2c4]/95 bg-white p-5 shadow-[0_2px_28px_-6px_rgba(45,37,33,0.08)] sm:p-5";

const controlBar =
  "rounded-[20px] border border-[#dfd2c4]/95 bg-white px-5 py-5 shadow-[0_4px_36px_-8px_rgba(45,37,33,0.1)] sm:px-6 sm:py-5";

const kicker = "text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500";

function InfoCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`${card} ${className ?? ""}`}>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function parseAddress(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v == null) continue;
    out[k] = typeof v === "string" ? v : String(v);
  }
  return Object.keys(out).length ? out : null;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.38 4.5h2.4c.2 0 .38.12.46.3l1.52 3.36c.08.18.02.4-.14.52l-1.58 1.26a12.12 12.12 0 005.22 5.22l1.26-1.58c.12-.16.34-.22.52-.14l3.36 1.52c.18.08.3.26.3.46v2.4c0 1.1-.9 2-2 2h-.4C9.5 20 4 14.5 4 7.9V7.5c0-1.1.9-2 2-2z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16v12H4V6zm0 0l8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function productAttributeRows(row: AdminOrderLine): { label: string; value: string }[] {
  const p = row.products;
  const rows: { label: string; value: string }[] = [];
  const v = row.variant_label?.trim();
  if (v) rows.push({ label: "Varyant", value: v });
  const m = p?.material?.trim();
  if (m) rows.push({ label: "Malzeme", value: m });
  const c = p?.color?.trim();
  if (c) rows.push({ label: "Renk", value: c });
  const slug = p?.slug?.trim();
  if (slug) rows.push({ label: "Ürün tipi", value: slug });
  return rows;
}

function TimelineVisual({ steps }: { steps: AdminOrderTimelineStep[] | undefined }) {
  const safe = steps ?? [];
  if (safe.length === 0) {
    return <p className="text-sm text-stone-500">Zaman çizelgesi yüklenemedi.</p>;
  }
  return (
    <ol className="relative space-y-0 pl-1">
      {safe.map((step, i) => {
        const isLast = i === safe.length - 1;
        const ring =
          step.state === "complete"
            ? "border-emerald-400 bg-emerald-50 text-emerald-800"
            : step.state === "active"
              ? "border-[#c6a15b] bg-[#fffdfb] text-[#8a6a3d]"
              : "border-stone-200 bg-stone-50 text-stone-400";
        return (
          <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast ? (
              <span
                className="absolute left-[11px] top-6 h-[calc(100%-0.5rem)] w-px bg-[#eadfce]"
                aria-hidden
              />
            ) : null}
            <span
              className={`relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${ring}`}
            >
              {step.state === "complete" ? "✓" : i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-stone-900">{step.label}</p>
              <p className="mt-0.5 text-xs text-stone-500">{step.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function AdminOrderDetailView({
  order,
  lines,
  logs,
  referralSlot,
  timeline = [],
  customerInsight = null,
}: {
  order: OrderRow;
  lines: AdminOrderLine[];
  logs: PaymentLogRow[];
  referralSlot?: ReactNode;
  timeline?: AdminOrderTimelineStep[];
  customerInsight?: AdminCustomerOrderInsight | null;
}) {
  const timelineSteps = timeline ?? [];
  const currency = order.currency ?? "TRY";
  const subtotal = Number(order.subtotal ?? 0);
  const discount = Number(order.discount_amount ?? 0);
  const total = Number(order.total ?? 0);
  const loyaltyRedeem = Number(order.loyalty_redeem_points ?? 0);
  const addr = parseAddress(order.shipping_address_json);
  const paymentStatus = order.payment_status ?? "";
  const orderStatus = order.order_status ?? "";
  const email = String(order.email ?? "").trim();
  const phone = String(order.phone ?? "").trim();
  const telHref = phone ? `tel:${phone.replace(/\s/g, "")}` : "";
  const mailHref = email ? `mailto:${encodeURIComponent(email)}` : "";
  const latestLog = logs[0];
  const ref = order.payment_reference?.trim() ? String(order.payment_reference) : "";

  const shippingRaw = total - subtotal + discount;
  const shipping = Math.max(0, Math.round(shippingRaw * 100) / 100);

  const paymentNote =
    paymentStatus === "paid"
      ? "Ödeme alındı"
      : paymentStatus === "pending"
        ? "Ödeme bekleniyor"
        : paymentStatus === "failed"
          ? "Ödeme başarısız"
          : paymentStatus === "refunded"
            ? "İade işlendi"
            : paymentStatusLabelTr(paymentStatus);

  const verRaw = latestLog?.verification_status?.trim() ?? "";
  const initials = initialsFromName(order.customer_name);

  const avgOrderTry =
    customerInsight && customerInsight.orderCount > 0
      ? customerInsight.lifetimeTotalTry / customerInsight.orderCount
      : null;

  return (
    <div className="mx-auto w-full min-w-0 space-y-6 pb-16">
      <Link
        href="/admin"
        className="inline-block text-sm font-medium text-stone-700 transition hover:text-stone-950"
      >
        ← Admina dön
      </Link>

      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight text-stone-950 sm:text-3xl">Sipariş Detayı</h1>
        <p className="mt-1.5 text-xs text-stone-600">
          {new Date(order.created_at).toLocaleString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className={controlBar}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div>
              <p className={kicker}>Sipariş no</p>
              <p className="mt-0.5 text-[11px] leading-snug text-stone-600">Tam numara: kopyala veya üzerine gel.</p>
              <div className="mt-2">
                <AdminCopyableSecret value={order.order_number} shortenStart={6} shortenEnd={4} />
              </div>
            </div>

            <div className="border-t border-[#e8dfd3] pt-5">
              <p className={kicker}>Sipariş tutarı</p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-stone-950 sm:text-[2rem] sm:leading-tight">
                {formatAdminMoney(total, currency)}
              </p>
              <p className="mt-2 text-xs font-medium text-stone-600">
                Ödeme:{" "}
                <span className={`inline-flex align-middle rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${paymentBadgeClasses(paymentStatus)}`}>
                  {paymentStatusLabelTr(paymentStatus)}
                </span>
              </p>
            </div>

            <div className="border-t border-[#e8dfd3] pt-5">
              <p className={kicker}>Sipariş durumu</p>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${orderBadgeClasses(orderStatus)}`}
                >
                  {orderStatusLabelTr(orderStatus)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-end border-t border-[#e8dfd3] pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <AdminOrderActionBar
              orderId={order.id}
              paymentStatus={paymentStatus}
              orderStatus={orderStatus}
              className="w-full lg:max-w-md lg:justify-end"
            />
            <AdminDhlCreateShipmentButton
              orderId={order.id}
              paymentStatus={paymentStatus}
              shippingTrackingNumber={order.shipping_tracking_number}
              shippingStatus={order.shipping_status}
            />
            {order.shipping_tracking_number || order.shipping_status ? (
              <dl className="mt-4 space-y-2 text-xs text-stone-700">
                {order.shipping_provider ? (
                  <div className="flex flex-wrap gap-2">
                    <dt className="font-medium text-stone-500">Sağlayıcı</dt>
                    <dd className="font-mono uppercase">{order.shipping_provider}</dd>
                  </div>
                ) : null}
                {order.shipping_tracking_number ? (
                  <div className="flex flex-wrap gap-2">
                    <dt className="font-medium text-stone-500">Takip</dt>
                    <dd className="font-mono">{order.shipping_tracking_number}</dd>
                  </div>
                ) : null}
                {order.shipping_status ? (
                  <div className="flex flex-wrap gap-2">
                    <dt className="font-medium text-stone-500">Kargo durumu</dt>
                    <dd>{order.shipping_status}</dd>
                  </div>
                ) : null}
                {order.shipping_label_url ? (
                  <div>
                    <a
                      href={order.shipping_label_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-amber-900 underline-offset-2 hover:underline"
                    >
                      Etiket bağlantısı
                    </a>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard title="Müşteri">
          <div className="flex gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#e8dfd3] bg-[linear-gradient(145deg,#fffdfb,#f5ede1)] text-base font-bold tracking-tight text-[#6b5344]"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className={kicker}>Ad soyad</p>
              <p className="mt-1 text-lg font-bold leading-snug text-stone-900">{order.customer_name}</p>
            </div>
          </div>

          <div className="space-y-5 border-t border-[#eadfce] pt-5">
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5ede1] text-[#8a6a3d]">
                <IconPhone />
              </span>
              <div className="min-w-0">
                <p className={kicker}>Telefon</p>
                {telHref ? (
                  <a
                    href={telHref}
                    className="mt-1 block text-sm font-semibold text-[#6b5a45] underline-offset-2 hover:underline"
                  >
                    {phone}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-stone-500">—</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5ede1] text-[#8a6a3d]">
                <IconMail />
              </span>
              <div className="min-w-0">
                <p className={kicker}>E-posta</p>
                {mailHref ? (
                  <a
                    href={mailHref}
                    className="mt-1 block break-all text-sm font-semibold text-[#6b5a45] underline-offset-2 hover:underline"
                  >
                    {email}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-stone-500">—</p>
                )}
              </div>
            </div>
          </div>

          {addr ? (
            <div className="border-t border-[#eadfce] pt-5">
              <p className={kicker}>Teslimat</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-800">
                {addr.address_line}
                <br />
                <span className="text-stone-600">
                  {[addr.district, addr.city].filter(Boolean).join(", ")}
                  {addr.postal_code ? ` · ${addr.postal_code}` : ""}
                </span>
              </p>
              {addr.delivery_note ? <p className="mt-2 text-xs text-stone-600">{addr.delivery_note}</p> : null}
            </div>
          ) : null}
        </InfoCard>

        <InfoCard title="Ödeme">
          <div className="space-y-5">
            <div>
              <p className={kicker}>Sipariş ödemesi</p>
              <div className="mt-2">
                <span
                  className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${paymentBadgeClasses(paymentStatus)}`}
                >
                  {paymentStatusLabelTr(paymentStatus)}
                </span>
              </div>
            </div>

            <div className="border-t border-[#eadfce] pt-5">
              <p className={kicker}>Sağlayıcı bildirimi</p>
              {latestLog ? (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-stone-600">
                    Son kayıt:{" "}
                    <span className="font-semibold text-stone-800">
                      {callbackLogStatusLabelTr(latestLog.status)}
                    </span>
                  </p>
                  <div>
                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
                        verRaw.toLowerCase() === "passed"
                          ? "bg-emerald-50 text-emerald-900 ring-emerald-600/25"
                          : verRaw.toLowerCase() === "failed"
                            ? "bg-rose-50 text-rose-900 ring-rose-600/25"
                            : "bg-stone-100 text-stone-700 ring-stone-500/12"
                      }`}
                    >
                      Doğrulama: {callbackVerificationLabelTr(verRaw)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-stone-500">Henüz bildirim yok.</p>
              )}
            </div>

            <div className="border-t border-[#eadfce] pt-5">
              <p className={kicker}>Sağlayıcı</p>
              <p className="mt-1 text-base font-semibold text-stone-900">{order.payment_provider ?? "—"}</p>
            </div>
            <div>
              <p className={kicker}>Referans</p>
              <div className="mt-1">
                {ref ? <AdminCopyableSecret value={ref} shortenStart={10} shortenEnd={6} /> : <span className="text-sm text-stone-400">—</span>}
              </div>
            </div>
          </div>
        </InfoCard>

        <InfoCard title="Sipariş" className="lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className={kicker}>Sipariş ID</p>
              <p className="mt-0.5 text-[10px] leading-snug text-stone-400">
                Veritabanı UUID’si; her sipariş için sabit uzunlukta.
              </p>
              <div className="mt-1">
                <AdminCopyableSecret value={order.id} shortenStart={6} shortenEnd={4} />
              </div>
            </div>
            <div>
              <p className={kicker}>Durum</p>
              <div className="mt-2">
                <span
                  className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${orderBadgeClasses(orderStatus)}`}
                >
                  {orderStatusLabelTr(orderStatus)}
                </span>
              </div>
            </div>
            <div>
              <p className={kicker}>Oluşturulma</p>
              <p className="mt-1 text-sm font-medium text-stone-900">
                {new Date(order.created_at).toLocaleString("tr-TR")}
              </p>
            </div>
            <div>
              <p className={kicker}>Son güncelleme</p>
              <p className="mt-1 text-sm font-medium text-stone-900">
                {order.updated_at ? new Date(order.updated_at).toLocaleString("tr-TR") : "—"}
              </p>
            </div>
          </div>
        </InfoCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard title="Durum akışı" className={customerInsight ? "" : "lg:col-span-2"}>
          <TimelineVisual steps={timelineSteps} />
        </InfoCard>
        {customerInsight ? (
          <InfoCard title="Müşteri özeti">
            <p className="text-[13px] leading-relaxed text-stone-700">
              Aynı {customerInsight.matchBy === "user" ? "hesap" : "e-posta adresi"} ile kayıtlı tüm siparişler.
            </p>
            <dl className="mt-5 space-y-0 divide-y divide-[#eadfce]/90 rounded-xl border border-[#eadfce]/80 bg-[#fffdfb]/60">
              <div className="flex items-baseline justify-between gap-4 px-4 py-3.5">
                <dt className="text-sm font-medium text-stone-700">Sipariş sayısı</dt>
                <dd className="text-lg font-bold tabular-nums text-stone-950">{customerInsight.orderCount}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-4 py-3.5">
                <dt className="text-sm font-medium text-stone-700">Toplam ciro</dt>
                <dd className="text-lg font-bold tabular-nums text-stone-950">
                  {formatAdminMoney(customerInsight.lifetimeTotalTry, currency)}
                </dd>
              </div>
              {avgOrderTry != null ? (
                <div className="flex items-baseline justify-between gap-4 px-4 py-3.5">
                  <dt className="text-sm font-medium text-stone-700">Ortalama sepet</dt>
                  <dd className="text-lg font-bold tabular-nums text-stone-950">{formatAdminMoney(avgOrderTry, currency)}</dd>
                </div>
              ) : null}
            </dl>
            {customerInsight.sumCapped ? (
              <p className="mt-3 text-[11px] leading-snug text-stone-600">Ciro, son kayıtlar üzerinden yaklaşık.</p>
            ) : null}
          </InfoCard>
        ) : null}
      </div>

      <section
        className={`${card} border-[#dfd2c4]/95 bg-[linear-gradient(165deg,#fffdfb_0%,#ffffff_48%)] shadow-[0_6px_40px_-10px_rgba(45,37,33,0.12)] ring-1 ring-[#c6a15b]/18`}
      >
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">Fiyat özeti</h2>
        <dl className="mt-5 space-y-3 text-[13px]">
          <div className="flex justify-between gap-4 text-stone-600">
            <dt className="font-medium">Ara toplam</dt>
            <dd className="font-semibold tabular-nums text-stone-900">{formatAdminMoney(subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-stone-600">
            <dt className="font-medium">Kargo</dt>
            <dd className="font-semibold tabular-nums text-stone-900">
              {shipping > 0 ? formatAdminMoney(shipping, currency) : "Ücretsiz"}
            </dd>
          </div>
          {discount > 0 ? (
            <div className="flex justify-between gap-4 text-emerald-800">
              <dt className="font-medium">İndirim{order.discount_label ? ` (${order.discount_label})` : ""}</dt>
              <dd className="font-bold tabular-nums">−{formatAdminMoney(discount, currency)}</dd>
            </div>
          ) : null}
          {loyaltyRedeem > 0 ? (
            <div className="flex justify-between gap-4 text-stone-600">
              <dt className="font-medium">Zelula puan</dt>
              <dd className="font-semibold text-stone-900">{loyaltyRedeem} puan</dd>
            </div>
          ) : null}
        </dl>

        <div className="my-6 border-t border-[#eadfce]" />

        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-stone-600">Toplam</dt>
          <dd className="text-[2.6rem] font-bold leading-none tracking-tight text-stone-950 tabular-nums sm:text-5xl">
            {formatAdminMoney(total, currency)}
          </dd>
        </div>

        <div className="mt-3 rounded-xl border border-[#dfd2c4]/90 bg-white/80 px-4 py-2.5 text-center sm:text-left">
          <p className="text-xs font-semibold text-stone-800">{paymentNote}</p>
        </div>
      </section>

      <section className={card}>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">Ürünler</h2>
          {lines.length > 0 ? <span className="text-xs text-stone-500">{lines.length} kalem</span> : null}
        </div>

        {lines.length === 0 ? (
          <p className="mt-8 pb-2 text-center text-sm text-stone-600">Bu sipariş için ürün bilgisi bulunamadı.</p>
        ) : (
          <ul className="mt-5 divide-y divide-[#eadfce]/90">
            {lines.map((row) => {
              const p = row.products;
              const name = p?.name ?? "Ürün";
              const attrs = productAttributeRows(row);
              const img = pickCoverImageUrl(p?.product_images ?? null);
              const editHref = p?.id ? `/admin/products/${p.id}/edit` : null;
              return (
                <li key={row.id} className="py-5 first:pt-2">
                  <div className="flex gap-4">
                    <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl border border-[#dfd2c4]/90 bg-[#f5ede1]">
                      {img ? (
                        <Image src={img} alt={name} fill className="object-cover" sizes="72px" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs text-stone-500">—</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {editHref ? (
                        <Link
                          href={editHref}
                          className="text-base font-bold text-stone-950 underline-offset-2 hover:text-[#8a6a3d] hover:underline"
                        >
                          {name}
                        </Link>
                      ) : (
                        <span className="text-base font-bold text-stone-950">{name}</span>
                      )}
                      {attrs.length > 0 ? (
                        <dl className="mt-3 grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                          {attrs.map((a) => (
                            <div key={a.label} className="contents">
                              <dt className="text-stone-500">{a.label}</dt>
                              <dd className="font-medium text-stone-900">{a.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#eadfce]/70 pt-3">
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-stone-600">
                          <span>
                            Adet: <span className="font-bold text-stone-900">{row.quantity}</span>
                          </span>
                          <span>
                            Birim:{" "}
                            <span className="font-semibold tabular-nums text-stone-900">
                              {formatAdminMoney(Number(row.unit_price), currency)}
                            </span>
                          </span>
                        </div>
                        <p className="text-lg font-bold tabular-nums tracking-tight text-stone-900">
                          {formatAdminMoney(Number(row.total_price), currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {referralSlot}

      <AdminOrderCallbackHistory logs={logs} paymentStatus={paymentStatus} />
    </div>
  );
}
