import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTry } from "@/lib/money";
import { getSupportPhoneDisplay } from "@/lib/support-contact";

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ pm?: string }>;
};

export default async function OrderSuccessBankTransferPage({ params, searchParams }: Props) {
  const { orderId } = await params;
  const sp = await searchParams;
  const paymentMethod = sp.pm ?? "bank_transfer";

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,order_number,payment_status,order_status,payment_provider,total,currency,email")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-semibold text-stone-900">Sipariş kaydı bulunamadı</h1>
        <p className="mt-2 text-sm text-stone-600">Sipariş başarıyla oluşturulduysa birkaç saniye sonra tekrar deneyin.</p>
        <Link href="/sepet" className="mt-6 inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50">
          Sepete dön
        </Link>
      </main>
    );
  }

  const bankName = process.env.BANK_TRANSFER_BANK_NAME ?? "Banka Adı";
  const iban = process.env.BANK_TRANSFER_IBAN ?? "TR00 0000 0000 0000 0000 0000 00";
  const accountHolder = process.env.BANK_TRANSFER_ACCOUNT_HOLDER ?? "Zelula";
  const paymentProvider = String(order.payment_provider ?? paymentMethod ?? "bank_transfer");

  return (
    <main className="mx-auto max-w-2xl px-4 py-14">
      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Sipariş alındı</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950">Siparişiniz alındı</h1>
        <p className="mt-3 text-sm text-stone-700">
          Havale/EFT siparişiniz oluşturuldu. Ödemeniz onaylandıktan sonra siparişiniz işleme alınacak.
        </p>
      </div>

      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-500">Sipariş Bilgisi</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-stone-500">Sipariş numarası</dt>
            <dd className="mt-1 font-mono text-stone-950">{order.order_number}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Ödeme yöntemi</dt>
            <dd className="mt-1 font-medium text-stone-950">Havale / EFT</dd>
          </div>
          <div>
            <dt className="text-stone-500">Ödeme durumu</dt>
            <dd className="mt-1 font-medium text-amber-700">Ödeme bekleniyor</dd>
          </div>
          <div>
            <dt className="text-stone-500">Sipariş durumu</dt>
            <dd className="mt-1 font-medium text-stone-950">{String(order.order_status ?? "pending")}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Toplam tutar</dt>
            <dd className="mt-1 text-lg font-semibold text-stone-950">
              {formatTry(Number.isFinite(Number(order.total)) ? Number(order.total) : 0)}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Müşteri e-posta</dt>
            <dd className="mt-1 font-medium text-stone-950">{order.email}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-stone-500">Sağlayıcı</dt>
            <dd className="mt-1 font-medium text-stone-950">{paymentProvider}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-800">Banka transfer bilgileri</h2>
        <dl className="mt-4 space-y-2 text-sm text-amber-950">
          <div className="flex flex-col gap-0.5">
            <dt className="text-amber-700">Banka adı</dt>
            <dd className="font-medium">{bankName}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-amber-700">Hesap sahibi</dt>
            <dd className="font-medium">{accountHolder}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-amber-700">IBAN</dt>
            <dd className="font-mono">{iban}</dd>
          </div>
          <div className="mt-3 rounded-lg border border-amber-300 bg-white/60 px-3 py-2">
            <p className="text-xs font-semibold text-amber-900">
              Açıklama: <span className="font-mono">{order.order_number}</span>
            </p>
          </div>
        </dl>
      </section>

      <p className="mt-6 text-sm text-stone-600">
        Destek:{" "}
        <a className="underline" href="mailto:destek@zeluladesign.com">
          destek@zeluladesign.com
        </a>{" "}
        • {getSupportPhoneDisplay()}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/urunler" className="inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800">
          Alışverişe devam et
        </Link>
      </div>
    </main>
  );
}
