import { redirect } from "next/navigation";
import Link from "next/link";
import {
  reconcileOrderStatus,
  retryPaymentInit,
  saveCategory,
  saveCollection,
  saveProduct,
  signOutAdmin,
  markOrderPaidManually,
  uploadProductImage,
  updateOrderStatus,
} from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? "")) redirect("/admin/login");

  const admin = createAdminClient();
  const defaultTo = new Date();
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setDate(defaultFrom.getDate() - 7);
  const from = sp.from ? new Date(sp.from) : defaultFrom;
  const to = sp.to ? new Date(sp.to) : defaultTo;
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const [products, categories, collections, orders, logs] = await Promise.all([
    admin.from("products").select("*").order("created_at", { ascending: false }).limit(30),
    admin.from("categories").select("*").order("name"),
    admin.from("collections").select("*").order("name"),
    admin
      .from("orders")
      .select("*")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("payment_logs")
      .select("*")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  const { data: analytics } = await admin
    .from("analytics_events")
    .select("event_name,occurred_at,ecommerce")
    .gte("occurred_at", fromIso)
    .lte("occurred_at", toIso)
    .order("occurred_at", { ascending: false })
    .limit(5000);
  const successfulPayments = (orders.data ?? []).filter((o) => o.payment_status === "paid").length;
  const pendingPayments = (orders.data ?? []).filter((o) => o.payment_status === "pending").length;
  const failedPayments = (orders.data ?? []).filter((o) => o.payment_status === "failed").length;
  const rejectedCallbacks = (logs.data ?? []).filter((l) => l.event_type === "callback_rejected").length;
  const orphanCallbacks = (logs.data ?? []).filter((l) => l.status === "orphaned").length;
  const problematicOrders = (orders.data ?? []).filter(
    (o) => o.payment_status !== "paid" || o.order_status === "cancelled",
  );
  const productViews = (analytics ?? []).filter((e) => e.event_name === "view_item").length;
  const addToCartCount = (analytics ?? []).filter((e) => e.event_name === "add_to_cart").length;
  const beginCheckoutCount = (analytics ?? []).filter((e) => e.event_name === "begin_checkout").length;
  const purchaseCount = (analytics ?? []).filter((e) => e.event_name === "purchase").length;

  const viewToAtc = productViews > 0 ? ((addToCartCount / productViews) * 100).toFixed(1) : "0.0";
  const atcToCheckout =
    addToCartCount > 0 ? ((beginCheckoutCount / addToCartCount) * 100).toFixed(1) : "0.0";
  const checkoutToPurchase =
    beginCheckoutCount > 0 ? ((purchaseCount / beginCheckoutCount) * 100).toFixed(1) : "0.0";

  const byProduct = new Map<
    string,
    { name: string; views: number; atc: number; checkout: number; purchase: number }
  >();
  for (const event of analytics ?? []) {
    const rawItems = ((event.ecommerce as { items?: unknown[] } | null)?.items ?? []) as Array<
      Record<string, unknown>
    >;
    for (const item of rawItems) {
      const id = String(item.item_id ?? "");
      if (!id) continue;
      const name = String(item.item_name ?? "Ürün");
      const row = byProduct.get(id) ?? { name, views: 0, atc: 0, checkout: 0, purchase: 0 };
      if (event.event_name === "view_item") row.views += 1;
      if (event.event_name === "add_to_cart") row.atc += 1;
      if (event.event_name === "begin_checkout") row.checkout += 1;
      if (event.event_name === "purchase") row.purchase += 1;
      byProduct.set(id, row);
    }
  }
  const productRows = Array.from(byProduct.entries()).map(([id, row]) => ({
    id,
    ...row,
    viewToAtc: row.views > 0 ? (row.atc / row.views) * 100 : 0,
    atcToPurchase: row.atc > 0 ? (row.purchase / row.atc) * 100 : 0,
  }));
  const topViewedProducts = [...productRows].sort((a, b) => b.views - a.views).slice(0, 8);
  const topAtcProducts = [...productRows].sort((a, b) => b.atc - a.atc).slice(0, 8);
  const topPurchasedProducts = [...productRows].sort((a, b) => b.purchase - a.purchase).slice(0, 8);
  const highViewLowAtcProducts = [...productRows]
    .filter((p) => p.views >= 5)
    .sort((a, b) => a.viewToAtc - b.viewToAtc)
    .slice(0, 8);
  const highAtcLowPurchaseProducts = [...productRows]
    .filter((p) => p.atc >= 3)
    .sort((a, b) => a.atcToPurchase - b.atcToPurchase)
    .slice(0, 8);

  return (
    <main className="container-premium py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-3xl">Zelula Admin</h1>
        <form action={signOutAdmin}>
          <button className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm">Çıkış Yap</button>
        </form>
      </div>

      <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Ödeme Operasyon Dashboard</h2>
          <form className="flex flex-wrap gap-2 text-xs">
            <input type="date" name="from" defaultValue={fromIso.slice(0, 10)} className="rounded border p-2" />
            <input type="date" name="to" defaultValue={toIso.slice(0, 10)} className="rounded border p-2" />
            <button className="rounded bg-stone-900 px-3 py-2 text-white">Filtrele</button>
          </form>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <Metric title="Başarılı Ödeme" value={successfulPayments} tone="emerald" />
          <Metric title="Bekleyen Ödeme" value={pendingPayments} tone="amber" />
          <Metric title="Başarısız Ödeme" value={failedPayments} tone="rose" />
          <Metric title="Rejected Callback" value={rejectedCallbacks} tone="rose" />
          <Metric title="Orphan Callback" value={orphanCallbacks} tone="amber" />
        </div>
        <div className="mt-5">
          <h3 className="text-sm font-medium">Problemli Siparişler</h3>
          <ul className="mt-2 space-y-2">
            {problematicOrders.slice(0, 8).map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-xs">
                <span>{o.order_number} • {o.customer_name} • {o.payment_status}</span>
                <Link href={`/admin/orders/${o.id}`} className="font-medium text-amber-900 hover:underline">
                  Detay
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Analytics Funnel</h2>
        {!analytics || analytics.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-600">
            Seçilen tarih aralığında analytics event bulunamadı. Trafik oluşunca funnel raporu burada görünecek.
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Metric title="Product Views" value={productViews} tone="amber" />
          <Metric title="Add To Cart" value={addToCartCount} tone="emerald" />
          <Metric title="Checkout Start" value={beginCheckoutCount} tone="amber" />
          <Metric title="Purchases" value={purchaseCount} tone="emerald" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-xl border border-stone-200 p-3">
            <p className="text-stone-500">View → Add to Cart</p>
            <p className="mt-1 text-2xl font-semibold">{viewToAtc}%</p>
          </div>
          <div className="rounded-xl border border-stone-200 p-3">
            <p className="text-stone-500">Add to Cart → Checkout</p>
            <p className="mt-1 text-2xl font-semibold">{atcToCheckout}%</p>
          </div>
          <div className="rounded-xl border border-stone-200 p-3">
            <p className="text-stone-500">Checkout → Purchase</p>
            <p className="mt-1 text-2xl font-semibold">{checkoutToPurchase}%</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ProductListCard
            title="Top Viewed Products"
            rows={topViewedProducts}
            metric={(p) => `${p.views} view`}
          />
          <ProductListCard
            title="Top Add-to-Cart Products"
            rows={topAtcProducts}
            metric={(p) => `${p.atc} ATC`}
          />
          <ProductListCard
            title="Top Purchased Products"
            rows={topPurchasedProducts}
            metric={(p) => `${p.purchase} purchase`}
          />
          <ProductListCard
            title="High View, Low Add-to-Cart"
            rows={highViewLowAtcProducts}
            metric={(p) => `${p.viewToAtc.toFixed(1)}% V→ATC`}
          />
          <ProductListCard
            title="High Add-to-Cart, Low Purchase"
            rows={highAtcLowPurchaseProducts}
            metric={(p) => `${p.atcToPurchase.toFixed(1)}% ATC→Purchase`}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form action={saveProduct} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-medium">Ürün Ekle / Güncelle</h2>
          <input name="id" placeholder="id (güncellemek için)" className="w-full rounded-lg border p-2" />
          <input name="name" placeholder="Ad" required className="w-full rounded-lg border p-2" />
          <input name="slug" placeholder="slug" required className="w-full rounded-lg border p-2" />
          <input name="short_description" placeholder="Kısa açıklama" required className="w-full rounded-lg border p-2" />
          <textarea name="full_description" placeholder="Detaylı açıklama" required className="w-full rounded-lg border p-2" />
          <div className="grid grid-cols-2 gap-2">
            <input name="price" type="number" step="0.01" placeholder="Fiyat" required className="w-full rounded-lg border p-2" />
            <input name="compare_at_price" type="number" step="0.01" placeholder="İndirim öncesi" className="w-full rounded-lg border p-2" />
            <input name="sku" placeholder="SKU" required className="w-full rounded-lg border p-2" />
            <input name="stock_quantity" type="number" placeholder="Stok" required className="w-full rounded-lg border p-2" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select name="category_id" className="w-full rounded-lg border p-2">
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select name="collection_id" className="w-full rounded-lg border p-2">
              <option value="">Koleksiyon yok</option>
              {collections.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <input name="material" placeholder="Materyal" className="w-full rounded-lg border p-2" />
          <input name="color" placeholder="Renk" className="w-full rounded-lg border p-2" />
          <div className="flex gap-4 text-sm">
            <label><input type="checkbox" name="featured" /> Öne çıkan</label>
            <label><input type="checkbox" name="new_arrival" /> Yeni</label>
            <label><input type="checkbox" name="is_active" defaultChecked /> Aktif</label>
          </div>
          <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Kaydet</button>
        </form>

        <div className="space-y-6">
          <form action={saveCategory} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-medium">Kategori Yönetimi</h2>
            <input name="id" placeholder="id (opsiyonel)" className="w-full rounded-lg border p-2" />
            <input name="name" placeholder="Kategori adı" required className="w-full rounded-lg border p-2" />
            <input name="slug" placeholder="slug" required className="w-full rounded-lg border p-2" />
            <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Kaydet</button>
          </form>
          <form action={saveCollection} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-medium">Koleksiyon Yönetimi</h2>
            <input name="id" placeholder="id (opsiyonel)" className="w-full rounded-lg border p-2" />
            <input name="name" placeholder="Koleksiyon adı" required className="w-full rounded-lg border p-2" />
            <input name="slug" placeholder="slug" required className="w-full rounded-lg border p-2" />
            <input name="description" placeholder="Açıklama" className="w-full rounded-lg border p-2" />
            <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Kaydet</button>
          </form>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Siparişler</h2>
        <div className="mt-4 space-y-3">
          {orders.data?.map((o) => (
            <form key={o.id} action={updateOrderStatus} className="grid items-center gap-2 rounded-xl border p-3 md:grid-cols-7">
              <input type="hidden" name="id" value={o.id} />
              <Link className="text-xs font-medium text-amber-900 hover:underline" href={`/admin/orders/${o.id}`}>{o.order_number}</Link>
              <p className="text-xs">{o.customer_name}</p>
              <select name="payment_status" defaultValue={o.payment_status} className="rounded border p-1 text-xs">
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="failed">failed</option>
              </select>
              <select name="order_status" defaultValue={o.order_status} className="rounded border p-1 text-xs">
                <option value="pending">pending</option>
                <option value="confirmed">confirmed</option>
                <option value="shipped">shipped</option>
                <option value="cancelled">cancelled</option>
              </select>
              <p className="text-xs">{o.total} TRY</p>
              <button className="rounded bg-stone-900 px-3 py-1.5 text-xs text-white">Güncelle</button>
            </form>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(orders.data ?? []).slice(0, 6).map((o) => (
            <div key={o.id} className="rounded-xl border border-stone-200 p-3">
              <p className="text-xs font-medium">{o.order_number}</p>
              <p className="mt-1 text-xs text-stone-500">{o.payment_status} / {o.order_status}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <form action={reconcileOrderStatus}>
                  <input type="hidden" name="id" value={o.id} />
                  <button className="rounded bg-amber-100 px-2 py-1 text-[11px]">Reconcile</button>
                </form>
                <form action={retryPaymentInit}>
                  <input type="hidden" name="id" value={o.id} />
                  <button className="rounded bg-stone-100 px-2 py-1 text-[11px]">Retry</button>
                </form>
                <form action={markOrderPaidManually}>
                  <input type="hidden" name="id" value={o.id} />
                  <input name="confirm" placeholder="ONAYLIYORUM" className="w-24 rounded border px-1 py-1 text-[10px]" />
                  <button className="rounded bg-emerald-100 px-2 py-1 text-[11px]">Manuel Paid</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Görsel Yükleme (Supabase Storage)</h2>
        <form action={uploadProductImage} className="mt-3 grid gap-2 sm:grid-cols-3">
          <select name="product_id" className="rounded-lg border p-2 text-sm">
            {products.data?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input type="file" name="image" accept="image/*" className="rounded-lg border p-2 text-sm" />
          <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Yükle</button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Son Ürünler</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {products.data?.map((p) => (
            <li key={p.id} className="flex justify-between border-b py-2">
              <span>{p.name}</span>
              <span>{p.price} TRY • stok {p.stock_quantity}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Metric({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "emerald" | "amber" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-800 border-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-800 border-amber-100"
        : "bg-rose-50 text-rose-800 border-rose-100";
  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-wide">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ProductListCard({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: Array<{
    id: string;
    name: string;
    views: number;
    atc: number;
    purchase: number;
    viewToAtc: number;
    atcToPurchase: number;
  }>;
  metric: (row: {
    id: string;
    name: string;
    views: number;
    atc: number;
    purchase: number;
    viewToAtc: number;
    atcToPurchase: number;
  }) => string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 rounded border border-dashed border-stone-200 bg-stone-50 px-2 py-3 text-xs text-stone-500">
          Bu aralıkta yeterli veri yok.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-xs">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded border border-stone-100 px-2 py-1.5">
              <span className="truncate pr-2">{p.name}</span>
              <span className="whitespace-nowrap">{metric(p)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
