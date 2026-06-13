import { notFound, redirect } from "next/navigation";
import {
  loyaltyReferralEarnDescription,
  loyaltyReferralReversalDescription,
} from "@/lib/loyalty/ledger-descriptions";
import { buildAdminOrderTimeline } from "@/lib/admin/order-timeline";
import { ADMIN_OPERATIONS_MAIN } from "@/lib/admin/admin-shell-layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  AdminOrderDetailView,
  type AdminCustomerOrderInsight,
  type AdminOrderLine,
} from "@/components/admin/orders/AdminOrderDetailView";
import { AdminOrderInvoicePanel } from "@/components/admin/orders/AdminOrderInvoicePanel";

export const dynamic = "force-dynamic";

function normalizeOrderLines(raw: unknown[] | null): AdminOrderLine[] {
  if (!raw?.length) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    let products = r.products as AdminOrderLine["products"];
    if (Array.isArray(products)) {
      products = (products[0] as AdminOrderLine["products"]) ?? null;
    }
    const variantRaw = r.variant_label ?? r.variant_title;
    const variantLabel =
      variantRaw != null && String(variantRaw).trim() ? String(variantRaw).trim() : null;

    return {
      id: String(r.id),
      quantity: Number(r.quantity),
      unit_price: Number(r.unit_price),
      total_price: Number(r.total_price),
      variant_label: variantLabel,
      products,
    };
  });
}

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invoiceOk?: string; invoiceError?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? "")) redirect("/admin/login");

  const admin = createAdminClient();
  const [{ data: order }, { data: logs }, { data: referralLedger }, { data: lineRows }] = await Promise.all([
    admin.from("orders").select("*").eq("id", id).maybeSingle(),
    admin
      .from("payment_logs")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
    admin.from("loyalty_points_ledger").select("points,type,description").eq("order_id", id),
    admin
      .from("order_items")
      .select(
        `
        id,
        quantity,
        unit_price,
        total_price,
        variant_label,
        products (
          id,
          name,
          slug,
          material,
          color,
          product_images ( image_url, is_cover, sort_order )
        )
      `,
      )
      .eq("order_id", id),
  ]);
  if (!order) notFound();

  const lines = normalizeOrderLines(lineRows ?? []);

  const SUM_ROWS_CAP = 2500;
  let customerInsight: AdminCustomerOrderInsight | null = null;
  const orderUserId = order.user_id as string | null | undefined;
  const orderEmail = String(order.email ?? "").trim();
  if (orderUserId || orderEmail) {
    const filterCol = orderUserId ? "user_id" : "email";
    const filterVal = (orderUserId ?? orderEmail) as string;
    const [countRes, sumRes] = await Promise.all([
      admin.from("orders").select("id", { count: "exact", head: true }).eq(filterCol, filterVal),
      admin.from("orders").select("total").eq(filterCol, filterVal).limit(SUM_ROWS_CAP),
    ]);
    const sumRows = sumRes.data ?? [];
    const lifetimeTotalTry = sumRows.reduce((acc, r) => acc + Number((r as { total?: unknown }).total ?? 0), 0);
    customerInsight = {
      orderCount: countRes.count ?? sumRows.length,
      lifetimeTotalTry,
      matchBy: orderUserId ? "user" : "email",
      sumCapped: sumRows.length >= SUM_ROWS_CAP,
    };
  }

  const timeline = buildAdminOrderTimeline({
    created_at: String(order.created_at),
    payment_status: String(order.payment_status ?? "pending"),
    order_status: String(order.order_status ?? "pending"),
  });

  const referralCode = order.referral_code as string | null | undefined;
  const referrerUserId = order.referrer_user_id as string | null | undefined;
  const hasReferralAttribution = Boolean(referrerUserId || referralCode);

  let referrerName: string | null = null;
  let referrerEmail: string | null = null;
  if (referrerUserId) {
    const { data: refProfile } = await admin.from("profiles").select("full_name").eq("id", referrerUserId).maybeSingle();
    referrerName = refProfile?.full_name?.trim() || null;
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(referrerUserId);
    if (!authErr) referrerEmail = authUser.user?.email ?? null;
  }

  const earnDesc = loyaltyReferralEarnDescription(id);
  const reverseDesc = loyaltyReferralReversalDescription(id);
  const referralEarnRow = (referralLedger ?? []).find((r) => r.type === "referral_earned" && r.description === earnDesc);
  const referralReverseRow = (referralLedger ?? []).find((r) => r.type === "reversed" && r.description === reverseDesc);
  const referralPointsAwarded = referralEarnRow ? Number(referralEarnRow.points) : 0;

  let referralRewardStatus = "—";
  if (hasReferralAttribution) {
    if (referralReverseRow) {
      referralRewardStatus = "Geri alındı (iptal / iade)";
    } else if (referralEarnRow) {
      referralRewardStatus = "Ödül işlendi";
    } else if (order.payment_status === "paid" && String(order.order_status ?? "") !== "cancelled") {
      referralRewardStatus = "Beklemede (ledger senkronu)";
    } else {
      referralRewardStatus = "Beklemede (ödeme tamamlanınca)";
    }
  }

  const referralSlot = hasReferralAttribution ? (
    <section className="rounded-[20px] border border-[#e8dfd3]/90 bg-white p-5 shadow-[0_2px_24px_-6px_rgba(62,52,38,0.07)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Davet</h2>
        <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-950 ring-1 ring-amber-500/25">
          Davet ile geldi
        </span>
      </div>
      <dl className="mt-5 space-y-4 text-sm">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-stone-400">Referral kodu</dt>
          <dd className="mt-1 font-mono text-sm font-medium text-stone-900">{referralCode ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-stone-400">Davet eden</dt>
          <dd className="mt-1 text-stone-900">
            {referrerName ?? referrerEmail ?? (referrerUserId ? `${referrerUserId.slice(0, 8)}…` : "—")}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-stone-400">Davet eden e-posta</dt>
          <dd className="mt-1 text-stone-900">{referrerEmail ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-stone-400">Verilen davet puanı</dt>
          <dd className="mt-1 font-medium text-stone-900">
            {referralPointsAwarded > 0 ? String(referralPointsAwarded) : referralEarnRow ? "0" : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-stone-400">Davet ödül durumu</dt>
          <dd className="mt-1 text-stone-900">{referralRewardStatus}</dd>
        </div>
      </dl>
    </section>
  ) : null;

  return (
    <main className="min-h-dvh bg-[#eceae6] py-8 sm:py-10">
      <div className={ADMIN_OPERATIONS_MAIN}>
        <AdminOrderDetailView
          order={order}
          lines={lines}
          logs={logs ?? []}
          referralSlot={referralSlot}
          invoiceSlot={
            <AdminOrderInvoicePanel
              orderId={String(order.id)}
              orderNumber={String(order.order_number ?? "")}
              invoicePdfUrl={order.invoice_pdf_url ? String(order.invoice_pdf_url) : null}
              invoiceUploadedAt={order.invoice_uploaded_at ? String(order.invoice_uploaded_at) : null}
              invoiceOk={String(sp.invoiceOk ?? "").trim() === "1"}
              invoiceError={sp.invoiceError ? decodeURIComponent(String(sp.invoiceError)) : null}
            />
          }
          timeline={timeline ?? []}
          customerInsight={customerInsight ?? null}
        />
      </div>
    </main>
  );
}
