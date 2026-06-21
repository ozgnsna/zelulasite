import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderInvoiceSection } from "@/components/account/OrderInvoiceSection";
import { OrderLegalAgreementsSection } from "@/components/account/OrderLegalAgreementsSection";
import { OrderLineReviewPrompts } from "@/components/reviews/OrderLineReviewPrompts";
import { createClient } from "@/lib/supabase/server";
import { orderStatusLabel } from "@/lib/account/order-status";
import { parseLegalContractSnapshot } from "@/lib/legal/legal-snapshot";

type Props = { params: Promise<{ id: string }> };

function formatMoney(n: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(n);
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Sipariş detayı" };
}

const CORE_ORDER_SELECT =
  "id, order_number, created_at, customer_name, email, phone, subtotal, discount_amount, discount_label, total, currency, payment_status, order_status, shipping_address_json, invoice_pdf_url, invoice_uploaded_at";

function isMissingColumnError(message: string) {
  const msgLower = message.toLowerCase();
  return (
    (/column/i.test(message) && /does not exist|undefined column/i.test(message)) ||
    /could not find.*column/i.test(msgLower) ||
    /schema cache/i.test(msgLower)
  );
}

async function fetchOrderForAccount(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const withLegal = `${CORE_ORDER_SELECT}, legal_contract_snapshot, legal_contract_hash`;
  let { data, error } = await supabase.from("orders").select(withLegal).eq("id", id).maybeSingle();
  if (!error && data) return data;
  if (error && isMissingColumnError(error.message ?? "")) {
    ({ data, error } = await supabase.from("orders").select(CORE_ORDER_SELECT).eq("id", id).maybeSingle());
  }
  if (error || !data) return null;
  return { ...data, legal_contract_snapshot: null, legal_contract_hash: null };
}

export default async function SiparisDetayPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/giris?next=${encodeURIComponent(`/hesabim/siparis/${id}`)}`);
  }

  const order = await fetchOrderForAccount(supabase, id);

  if (!order) notFound();

  const { data: lines } = await supabase
    .from("order_items")
    .select("id, quantity, unit_price, total_price, product_id, products ( name, slug )")
    .eq("order_id", id);

  const addr = order.shipping_address_json as Record<string, string> | null;
  const legalSnapshot = parseLegalContractSnapshot(order.legal_contract_snapshot);
  const legalHash =
    typeof order.legal_contract_hash === "string" && order.legal_contract_hash.trim()
      ? order.legal_contract_hash.trim()
      : null;

  return (
    <main className="container-premium py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/hesabim"
          className="text-sm font-medium text-[color:var(--brand-gold)] underline-offset-2 hover:underline"
        >
          ← Hesabıma dön
        </Link>
        <h1 className="mt-6 font-serif text-3xl text-stone-900">Sipariş {order.order_number}</h1>
        <p className="mt-1 text-sm text-stone-600">
          {order.created_at
            ? new Date(order.created_at).toLocaleString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </p>
        <p className="mt-3 inline-flex rounded-full border border-[#e8dfd3] bg-[#f9f6f2] px-3 py-1 text-xs font-medium text-stone-700">
          {orderStatusLabel({
            payment_status: order.payment_status ?? "",
            order_status: order.order_status ?? "",
          })}
        </p>

        <div className="mt-8 space-y-6 rounded-2xl border border-[#e8dfd3] bg-[color:var(--surface)] p-6 shadow-sm">
          <div className="space-y-3 border-b border-[#eadfce] pb-4">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Ara toplam</p>
                <p className="font-medium text-stone-900">
                  {formatMoney(Number(order.subtotal), order.currency ?? "TRY")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-stone-500">Toplam</p>
                <p className="text-lg font-semibold text-stone-900">
                  {formatMoney(Number(order.total), order.currency ?? "TRY")}
                </p>
              </div>
            </div>
            {Number(order.discount_amount ?? 0) > 0 ? (
              <p className="text-xs text-emerald-800">
                İndirim (−{formatMoney(Number(order.discount_amount), order.currency ?? "TRY")}
                {order.discount_label === "instagram_takipci" ? ", Instagram takipçisi" : ""})
              </p>
            ) : null}
          </div>

          <div>
            <h2 className="text-sm font-medium text-stone-800">Ürünler</h2>
            <ul className="mt-3 divide-y divide-[#eadfce]">
              {(lines ?? []).map((row) => {
                const p = row.products as { name?: string; slug?: string } | null;
                const name = p?.name ?? "Ürün";
                return (
                  <li key={row.id} className="flex justify-between gap-4 py-3 text-sm">
                    <span className="text-stone-800">
                      {name}
                      <span className="text-stone-500"> × {row.quantity}</span>
                    </span>
                    <span className="shrink-0 text-stone-700">
                      {formatMoney(Number(row.total_price), order.currency ?? "TRY")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="grid gap-4 border-t border-[#eadfce] pt-4 text-sm sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wide text-stone-500">Teslimat</h2>
              <p className="mt-1 text-stone-800">{order.customer_name}</p>
              <p className="text-stone-600">{order.phone}</p>
              <p className="text-stone-600">{order.email}</p>
            </div>
            {addr ? (
              <div>
                <h2 className="text-xs font-medium uppercase tracking-wide text-stone-500">Adres</h2>
                <p className="mt-1 text-stone-700">{addr.address_line}</p>
                <p className="text-stone-600">
                  {addr.district}, {addr.city} {addr.postal_code}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <OrderLegalAgreementsSection snapshot={legalSnapshot} hash={legalHash} />

        <OrderInvoiceSection
          orderNumber={String(order.order_number ?? "")}
          invoicePdfUrl={order.invoice_pdf_url ? String(order.invoice_pdf_url) : null}
          invoiceUploadedAt={order.invoice_uploaded_at ? String(order.invoice_uploaded_at) : null}
          paymentStatus={String(order.payment_status ?? "")}
        />

        <OrderLineReviewPrompts
          supabase={supabase}
          userId={user.id}
          paymentStatus={String(order.payment_status ?? "")}
          orderStatus={String(order.order_status ?? "")}
          lines={(lines ?? []).map((row) => ({
            product_id: String(row.product_id ?? ""),
            products: row.products as { name?: string | null; slug?: string | null } | null,
          }))}
        />
      </div>
    </main>
  );
}
