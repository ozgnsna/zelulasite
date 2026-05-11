import Link from "next/link";

export const metadata = {
  title: "Ödeme test modu",
};

type Props = { searchParams: Promise<{ oid?: string }> };

/**
 * QNB_USE_MOCK veya geliştirme ortamında kart adımı atlanır; kullanıcıyı yanıltmamak için ayrı sayfa.
 */
export default async function QnbMockPaymentPage({ searchParams }: Props) {
  const sp = await searchParams;
  const oid = sp.oid?.trim() ?? "";

  return (
    <main className="mx-auto max-w-lg px-4 py-16 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Test / kurulum modu</p>
      <h1 className="mt-2 font-serif text-2xl text-stone-900">Gerçek kart ödemesi çalıştırılmadı</h1>
      <p className="mt-4 text-sm leading-relaxed text-stone-700">
        Şu an ortamda <strong>QNB sahte (mock) ödeme</strong> açık veya sunucu geliştirme modunda. Bu yüzden banka / kart
        ekranına gitmediniz; sipariş oluşmuş olsa bile ödeme <strong>beklemede</strong> kalır — “doğrulama bekleniyor”
        sayfası bundandır.
      </p>
      <div className="mt-6 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">Canlıda bankaya kadar gitmek için</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-[13px] leading-relaxed">
          <li>
            Barındırma ayarlarında <code className="rounded bg-white/80 px-1 py-px">QNB_USE_MOCK=false</code> yapın.
          </li>
          <li>
            <code className="rounded bg-white/80 px-1 py-px">QNB_MBR_ID</code>,{" "}
            <code className="rounded bg-white/80 px-1 py-px">QNB_MERCHANT_ID</code>, kullanıcı/şifre ve{" "}
            <code className="rounded bg-white/80 px-1 py-px">QNB_MERCHANT_PASS</code> değerlerini bankanın verdiği gibi
            doldurun.
          </li>
          <li>
            <code className="rounded bg-white/80 px-1 py-px">NEXT_PUBLIC_SITE_URL</code> canlı site adresiniz olsun
            (ör. https://www.zeluladesign.com).
          </li>
        </ul>
      </div>
      {oid ? (
        <p className="mt-4 text-xs text-stone-500">
          Sipariş referansı (UUID): <span className="font-mono text-stone-700">{oid}</span>
        </p>
      ) : null}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/sepet"
          className="inline-flex justify-center rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
        >
          Sepete dön
        </Link>
        {oid ? (
          <Link
            href={`/odeme/basarili?oid=${encodeURIComponent(oid)}`}
            className="inline-flex justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
          >
            Sipariş durumunu gör
          </Link>
        ) : null}
      </div>
    </main>
  );
}
