import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  const [{ data: order }, { data: logs }] = await Promise.all([
    admin.from("orders").select("*").eq("id", id).maybeSingle(),
    admin
      .from("payment_logs")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!order) notFound();

  return (
    <main className="container-premium py-10">
      <Link href="/admin" className="text-sm text-stone-600 hover:underline">
        ← Admina dön
      </Link>
      <h1 className="mt-3 font-serif text-3xl">Sipariş Detayı</h1>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium">Sipariş Özeti</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <Row label="Sipariş no" value={order.order_number} />
          <Row label="Müşteri" value={order.customer_name} />
          <Row label="E-posta" value={order.email} />
          <Row label="Telefon" value={order.phone} />
          <Row label="Ödeme durumu" value={order.payment_status} />
          <Row label="Sipariş durumu" value={order.order_status} />
          <Row label="Sağlayıcı" value={order.payment_provider ?? "-"} />
          <Row label="Referans" value={order.payment_reference ?? "-"} />
          <Row label="Toplam" value={`${order.total} ${order.currency}`} />
          <Row label="Oluşturulma" value={new Date(order.created_at).toLocaleString("tr-TR")} />
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium">Callback Geçmişi</h2>
        {!logs || logs.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">Henüz callback kaydı yok.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {logs.map((log) => (
              <li key={log.id} className="rounded-xl border border-stone-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium">{log.event_type ?? "callback"}</span>
                  <span>{new Date(log.created_at).toLocaleString("tr-TR")}</span>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-stone-600 sm:grid-cols-2">
                  <span>Durum: {log.status}</span>
                  <span>Doğrulama: {log.verification_status ?? "-"}</span>
                  <span>Referans: {log.reference ?? "-"}</span>
                  <span>Hash: {log.callback_hash ?? "-"}</span>
                </div>
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-stone-700">Ham callback payload</summary>
                  <pre className="mt-2 overflow-auto rounded-lg bg-stone-50 p-2">
                    {JSON.stringify(log.callback_payload ?? log.request_payload ?? {}, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-3">
      <dt className="text-xs uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm text-stone-900">{value}</dd>
    </div>
  );
}
