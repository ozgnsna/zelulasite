import Link from "next/link";

const messages: Record<string, string> = {
  card_declined: "Kart işlemi banka tarafından onaylanmadı.",
  timeout: "Ödeme sırasında zaman aşımı oluştu.",
  verify_failed: "Ödeme doğrulaması tamamlanamadı.",
  generic: "Ödeme işlemi tamamlanamadı.",
};

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; code?: string; bank?: string; oid?: string }>;
}) {
  const sp = await searchParams;
  const message = messages[sp.msg ?? ""] ?? messages.generic;
  const bankHint = sp.bank?.trim();
  const bankCode = sp.code?.trim();
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-stone-600">Ödeme tamamlanamadı</p>
      <h1 className="mt-3 font-serif text-3xl text-stone-900">İşlem tamamlanamadı</h1>
      <p className="mt-4 text-stone-600">{message}</p>
      {bankCode || bankHint ? (
        <p className="mt-3 text-sm text-stone-500">
          {bankCode ? (
            <>
              Banka kodu: <span className="font-mono">{bankCode}</span>
              {bankCode !== "00" ? " (00 = başarılı)" : null}
            </>
          ) : null}
          {bankHint ? <span className={bankCode ? " mt-1 block" : ""}>{bankHint}</span> : null}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-stone-500">Sepetiniz korunur, bilgilerinizi güncelleyip yeniden deneyebilirsiniz.</p>
      <Link
        href={`/sepet?iptal=1&msg=${encodeURIComponent(sp.msg ?? "generic")}`}
        className="mt-10 inline-flex rounded-full bg-stone-900 px-8 py-3 text-sm font-medium text-white hover:bg-stone-800"
      >
        Sepete dön
      </Link>
    </main>
  );
}
