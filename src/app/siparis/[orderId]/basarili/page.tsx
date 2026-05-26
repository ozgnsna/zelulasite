import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBankTransferDetails } from "@/lib/bank-transfer";
import { formatTry } from "@/lib/money";
import { getSupportPhoneDisplay } from "@/lib/support-contact";
import { BankTransferInstructions } from "@/components/payments/BankTransferInstructions";
import { OrderReceivedSummary } from "@/components/payments/OrderReceivedSummary";

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
      .select(
        "id,order_number,customer_name,payment_status,order_status,payment_provider,total,currency,email,created_at",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return (
        <main className="mx-auto max-w-2xl px-4 py-16">
          <h1 className="text-2xl font-semibold text-stone-900">Sipariş kaydı bulunamadı</h1>
          <p className="mt-2 text-sm text-stone-600">Sipariş başarıyla oluşturulduysa birkaç saniye sonra tekrar deneyin.</p>
          <Link
            href="/sepet"
            className="mt-6 inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            Sepete dön
          </Link>
        </main>
      );
    }

    const bank = getBankTransferDetails();
    const total = Number.isFinite(Number(order.total)) ? Number(order.total) : 0;
    const totalFormatted = formatTry(total);

    return (
      <main className="bg-[#faf8f5] pb-16 pt-10 sm:pt-14">
        <div className="container-premium mx-auto max-w-xl">
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.32em] text-stone-500">
            Teşekkürler
          </p>
          <h1 className="mt-3 text-center font-serif text-3xl font-light tracking-tight text-stone-900 sm:text-4xl">
            Siparişiniz alındı
          </h1>
          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-stone-600">
            Havale veya EFT ile ödemenizi tamamladığınızda siparişiniz işleme alınacak.
          </p>

          <div className="mt-8 space-y-5">
            <OrderReceivedSummary
              orderNumber={String(order.order_number)}
              customerName={order.customer_name}
              email={String(order.email ?? "")}
              totalFormatted={totalFormatted}
              paymentStatus={String(order.payment_status ?? "pending")}
              orderStatus={String(order.order_status ?? "pending")}
              createdAt={order.created_at}
            />

            <BankTransferInstructions
              bank={bank}
              orderNumber={String(order.order_number)}
              totalFormatted={totalFormatted}
            />
          </div>

          <p className="mt-8 text-center text-sm text-stone-600">
            <a className="underline underline-offset-2" href="mailto:destek@zeluladesign.com">
              destek@zeluladesign.com
            </a>
            <span className="mx-2 text-stone-300">·</span>
            {getSupportPhoneDisplay()}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href="/urunler"
              className="inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
            >
              Alışverişe devam et
            </Link>
            <Link
              href="/hesabim"
              className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
            >
              Hesabım
            </Link>
          </div>
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
