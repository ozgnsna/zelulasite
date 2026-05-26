import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PurchaseTracker } from "@/components/analytics/PurchaseTracker";
import { OrderSuccessReferralShare } from "@/components/referral/OrderSuccessReferralShare";
import { zelulaPuanEarnedFromPaidOrderTotalTry } from "@/lib/loyalty/compute";
import { ensureUserReferralCode } from "@/lib/referral/server";
import { siteBaseUrl, withReferralQuery } from "@/lib/referral/share-url";
import { getSupportPhoneDisplay } from "@/lib/support-contact";
import { getBankTransferDetails } from "@/lib/bank-transfer";
import { formatTry } from "@/lib/money";
import { BankTransferInstructions } from "@/components/payments/BankTransferInstructions";

type Props = { searchParams: Promise<{ oid?: string; pm?: string }> };

export const dynamic = "force-dynamic";

/** Geçici: canlıda yeni dağıtımın gerçekten bu dosyayı sunduğunu doğrulamak için. Doğrulama sonrası kaldırın. */
function DebugBuildStripe() {
  return (
    <div className="mb-4 w-full border-2 border-yellow-400 bg-black py-2.5 text-center text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">
      DEBUG BUILD ACTIVE
    </div>
  );
}

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const sp = await searchParams;
  const orderId = sp.oid;
  const paymentMethod = sp.pm;

  if (!orderId) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <DebugBuildStripe />
        <h1 className="font-serif text-2xl text-stone-900">Oturum bulunamadı</h1>
        <p className="mt-3 text-stone-600">Geçerli bir ödeme kaydı bulunamadı.</p>
        <Link href="/sepet" className="mt-8 inline-block text-sm font-medium text-stone-700 hover:underline">
          Sepete dön
        </Link>
      </main>
    );
  }

  try {
    const admin = createAdminClient();
    const oidParam = orderId.trim();
    const orderSelect =
      "id,order_number,payment_status,order_status,payment_provider,total,currency,customer_name,email,user_id" as const;

    let { data: order } = await admin.from("orders").select(orderSelect).eq("id", oidParam).maybeSingle();
    if (!order && /^ZLL\d+$/i.test(oidParam)) {
      const byNo = await admin.from("orders").select(orderSelect).eq("order_number", oidParam).maybeSingle();
      order = byNo.data ?? null;
    }

    const { data: items } = order
      ? await admin
          .from("order_items")
          .select(
            "quantity,total_price,unit_price,product_id,product:products(name,slug,category:categories(name),collection:collections(name))",
          )
          .eq("order_id", order.id)
      : { data: null };

    const firstItem = (items ?? [])[0];
    const firstProductSlug = firstItem?.product?.[0]?.slug ?? null;
    const base = siteBaseUrl();
    const path = firstProductSlug ? `/urunler/${firstProductSlug}` : "/";
    const cleanShareUrl = `${base}${path === "/" ? "/" : path}`;
    let paidShareUrl = cleanShareUrl;
    if (order?.user_id) {
      const refCode = await ensureUserReferralCode(admin, order.user_id);
      if (refCode) paidShareUrl = withReferralQuery(cleanShareUrl, refCode);
    }
    const isBankTransferFlow = paymentMethod === "bank_transfer" || order?.payment_provider === "bank_transfer";
    const bank = getBankTransferDetails();

    const prematureCardOrder =
      order &&
      !isBankTransferFlow &&
      order.payment_status === "pending" &&
      order.payment_provider === "qnb_finansbank"
        ? order
        : null;

    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <DebugBuildStripe />
      {prematureCardOrder ? (
        <div className="mb-6 rounded-xl border-2 border-rose-500 bg-rose-50 px-4 py-3 text-left text-sm text-rose-950 shadow-sm">
          <p className="font-semibold text-rose-900">Bu sayfa ödeme tamamlanmadan açıldı</p>
          <p className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed text-rose-900/95">
            <span className="block">oid (URL): {oidParam}</span>
            <span className="block">order id: {prematureCardOrder.id}</span>
            <span className="block">order_number: {prematureCardOrder.order_number}</span>
            <span className="block">payment_provider: {prematureCardOrder.payment_provider ?? "—"}</span>
            <span className="block">payment_status: {prematureCardOrder.payment_status ?? "—"}</span>
          </p>
          <p className="mt-3 text-xs leading-relaxed text-rose-900">
            Kart ile ödeme için önce{" "}
            <Link
              href={`/odeme/qnb-baslat/${prematureCardOrder.id}`}
              className="font-semibold underline underline-offset-2"
            >
              güvenli ödeme adımına
            </Link>{" "}
            gitmeniz gerekir. Bu adres normalde yalnızca bankanın <code className="rounded bg-white/80 px-1">qnb-return</code>{" "}
            yönlendirmesiyle açılır; doğrudan açıldıysa tarayıcı eklentisi, eski sekme veya dış bir bağlantı olabilir.
          </p>
        </div>
      ) : null}
      {order?.payment_status === "paid" ? (
        <PurchaseTracker
          transactionId={order.order_number}
          value={Number(order.total)}
          items={(items ?? []).map((i) => ({
            product_id: i.product_id,
            product_name: i.product?.[0]?.name ?? "Ürün",
            price: Number(i.unit_price ?? i.total_price),
            quantity: i.quantity,
            category: i.product?.[0]?.category?.[0]?.name,
            collection: i.product?.[0]?.collection?.[0]?.name ?? null,
          }))}
        />
      ) : null}
      <p className="text-sm font-medium uppercase tracking-wide text-stone-600">Teşekkürler</p>
      <h1 className="mt-3 font-serif text-3xl text-stone-900">
        {order?.payment_status === "paid"
          ? "Ödeme onaylandı"
          : isBankTransferFlow
            ? "Sipariş alındı — Havale/EFT bekleniyor"
            : "Ödeme doğrulaması bekleniyor"}
      </h1>
      <p className="mt-4 text-stone-600">
        Sipariş numaranız: <span className="font-mono text-stone-800">{order?.order_number ?? orderId}</span>
        <br />
        {order?.payment_status === "paid"
          ? "Onay e-postası (gerçek ortamda) buraya gönderilir."
          : isBankTransferFlow
            ? "Havale/EFT dekontu sonrası admin onayı ile siparişiniz ödemesi tamamlandı durumuna alınır."
            : "Ödeme sağlayıcısından onay bildirimi gelince siparişiniz otomatik olarak ödendi olarak güncellenir; sayfayı bir süre sonra yenileyebilirsin."}
      </p>
      <p className="mt-2 text-sm text-stone-500">
        {order?.payment_status === "paid"
          ? "Siparişiniz alındı ve hazırlık sürecine geçti."
          : isBankTransferFlow
            ? "Lütfen aşağıdaki IBAN bilgisine ödeme yaparken açıklama kısmına sipariş numaranızı yazın."
            : "Siparişiniz alındı. Banka doğrulaması nedeniyle kısa bir gecikme olabilir, endişelenmeyin."}
      </p>
      {isBankTransferFlow && order?.payment_status !== "paid" ? (
        <div className="mx-auto mt-5 max-w-md text-left">
          <BankTransferInstructions
            bank={bank}
            orderNumber={String(order?.order_number ?? orderId)}
            totalFormatted={formatTry(Number(order?.total ?? 0))}
          />
        </div>
      ) : null}
      {order?.payment_status === "paid" && order.user_id ? (
        <p className="mt-5 text-sm font-light text-stone-700">
          Bu alışverişinden {zelulaPuanEarnedFromPaidOrderTotalTry(Number(order.total))} Zelula Puan kazandın{" "}
          <span aria-hidden>✨</span>
        </p>
      ) : null}
      <div className="mx-auto mt-6 max-w-md rounded-xl border border-stone-200 bg-white p-4 text-left text-sm">
        <p className="font-medium">Sipariş Özeti</p>
        <p className="mt-1 text-stone-600">{order?.customer_name} • {order?.email}</p>
        <ul className="mt-3 space-y-1 text-stone-600">
          {(items ?? []).slice(0, 3).map((i, idx) => (
            <li key={idx} className="flex justify-between">
              <span>{i.product?.[0]?.name ?? "Ürün"} x{i.quantity}</span>
              <span>{i.total_price} {order?.currency ?? "TRY"}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t pt-2">
          <span>Toplam</span>
          <strong>{order?.total} {order?.currency ?? "TRY"}</strong>
        </div>
      </div>
      {order?.payment_status === "paid" ? <OrderSuccessReferralShare shareUrl={paidShareUrl} /> : null}
      <p className="mt-4 text-sm text-stone-600">
        Destek:{" "}
        <a className="text-stone-700 underline" href="mailto:destek@zeluladesign.com">
          destek@zeluladesign.com
        </a>{" "}
        • {getSupportPhoneDisplay()}
      </p>
      <Link
        href="/urunler"
        className="mt-10 inline-flex rounded-full bg-stone-900 px-8 py-3 text-sm font-medium text-white hover:bg-stone-800"
      >
        Alışverişe devam et
      </Link>
    </main>
    );
  } catch {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <DebugBuildStripe />
        <h1 className="font-serif text-2xl text-stone-900">Geçici bir sorun oluştu</h1>
        <p className="mt-3 text-sm text-stone-600">
          Sipariş referansı: <span className="font-mono">{orderId}</span>
        </p>
        <p className="mt-2 text-sm text-stone-600">
          Ödeme onaylandıysa bilgiler e-posta ile de iletilebilir. Birkaç dakika sonra sayfayı yenileyin.
        </p>
        <Link href="/urunler" className="mt-8 inline-flex rounded-full bg-stone-900 px-8 py-3 text-sm font-medium text-white hover:bg-stone-800">
          Alışverişe devam et
        </Link>
      </main>
    );
  }
}
