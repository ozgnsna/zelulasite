import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBankTransferDetails } from "@/lib/bank-transfer";
import { orderStatusLabelTr, paymentStatusLabelTr } from "@/lib/account/order-status";
import { formatTry } from "@/lib/money";
import { getSupportPhoneDisplay } from "@/lib/support-contact";
import { BankTransferInstructions } from "@/components/payments/BankTransferInstructions";

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ pm?: string }>;
};

export default async function OrderSuccessBankTransferPage({ params, searchParams }: Props) {
  try {
    const { orderId } = await params;
    await searchParams;

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

    const bank = getBankTransferDetails();
    const total = Number.isFinite(Number(order.total)) ? Number(order.total) : 0;
    const totalFormatted = formatTry(total);
    const paymentStatus = String(order.payment_status ?? "pending");
    const orderStatus = String(order.order_status ?? "pending");

    return (
      <main className="mx-auto max-w-2xl px-4 py-14">
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Sipariş alındı</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950">Siparişiniz alındı</h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-700">
            Havale/EFT siparişiniz oluşturuldu. Ödemeniz onaylandıktan sonra siparişiniz hazırlanmaya alınacak.
          </p>
        </div>

        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-500">Sipariş özeti</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-stone-500">Sipariş numarası</dt>
              <dd className="mt-1 font-mono font-semibold text-stone-950">{order.order_number}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Ödeme yöntemi</dt>
              <dd className="mt-1 font-medium text-stone-950">Havale / EFT</dd>
            </div>
            <div>
              <dt className="text-stone-500">Ödeme durumu</dt>
              <dd className="mt-1 font-medium text-amber-700">{paymentStatusLabelTr(paymentStatus)}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Sipariş durumu</dt>
              <dd className="mt-1 font-medium text-stone-950">{orderStatusLabelTr(orderStatus)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-stone-500">Ödenecek tutar</dt>
              <dd className="mt-1 text-2xl font-semibold text-stone-950">{totalFormatted}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-stone-500">E-posta</dt>
              <dd className="mt-1 font-medium text-stone-950">{order.email}</dd>
            </div>
          </dl>
        </section>

        <BankTransferInstructions
          bank={bank}
          orderNumber={String(order.order_number)}
          totalFormatted={totalFormatted}
        />

        <p className="mt-6 text-sm text-stone-600">
          Sorularınız için{" "}
          <a className="underline" href="mailto:destek@zeluladesign.com">
            destek@zeluladesign.com
          </a>{" "}
          · {getSupportPhoneDisplay()}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/urunler" className="inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800">
            Alışverişe devam et
          </Link>
          <Link href="/hesabim" className="inline-flex rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50">
            Hesabım
          </Link>
        </div>
      </main>
    );
  } catch {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-stone-900">Geçici bir sorun oluştu</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Siparişiniz kaydedildiyse özet ve havale bilgileri e-posta ile de iletilebilir. Birkaç dakika sonra bu
          sayfayı yenileyin veya destek ile iletişime geçin.
        </p>
        <Link
          href="/urunler"
          className="mt-8 inline-flex rounded-full bg-stone-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
        >
          Alışverişe devam et
        </Link>
      </main>
    );
  }
}
