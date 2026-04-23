import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PurchaseTracker } from "@/components/analytics/PurchaseTracker";

type Props = { searchParams: Promise<{ oid?: string }> };

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const sp = await searchParams;
  const orderId = sp.oid;

  if (!orderId) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-serif text-2xl text-stone-900">Oturum bulunamadı</h1>
        <p className="mt-3 text-stone-600">Geçerli bir ödeme kaydı bulunamadı.</p>
        <Link href="/sepet" className="mt-8 inline-block text-sm font-medium text-amber-900 hover:underline">
          Sepete dön
        </Link>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id,order_number,payment_status,order_status,total,currency,customer_name,email")
    .eq("id", orderId)
    .maybeSingle();
  const { data: items } = await admin
    .from("order_items")
    .select("quantity,total_price,unit_price,product_id,product:products(name,category:categories(name),collection:collections(name))")
    .eq("order_id", orderId);

  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
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
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-800">Teşekkürler</p>
      <h1 className="mt-3 font-serif text-3xl text-stone-900">
        {order?.payment_status === "paid" ? "Ödeme onaylandı" : "Ödeme doğrulaması bekleniyor"}
      </h1>
      <p className="mt-4 text-stone-600">
        Sipariş numaranız: <span className="font-mono text-stone-800">{order?.order_number ?? orderId}</span>
        <br />
        {order?.payment_status === "paid"
          ? "Onay e-postası (gerçek ortamda) buraya gönderilir."
          : "Callback doğrulaması tamamlanınca siparişiniz otomatik olarak onaylanır."}
      </p>
      <p className="mt-2 text-sm text-stone-500">
        {order?.payment_status === "paid"
          ? "Siparişiniz alındı ve hazırlık sürecine geçti."
          : "Siparişiniz alındı. Banka doğrulaması nedeniyle kısa bir gecikme olabilir, endişelenmeyin."}
      </p>
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
      <p className="mt-4 text-sm text-stone-600">
        Destek: <a className="text-amber-900 underline" href="mailto:hello@zelula.com">hello@zelula.com</a> • +90 555 000 00 00
      </p>
      <Link
        href="/urunler"
        className="mt-10 inline-flex rounded-full bg-stone-900 px-8 py-3 text-sm font-medium text-white hover:bg-stone-800"
      >
        Alışverişe devam
      </Link>
    </main>
  );
}
