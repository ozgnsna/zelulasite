import Link from "next/link";
import type { BankTransferDetails } from "@/lib/bank-transfer";
import { getSupportWhatsAppHref } from "@/lib/support-contact";
import { CopyValueButton } from "@/components/payments/CopyValueButton";

export function BankTransferInstructions({
  bank,
  orderNumber,
  totalFormatted,
}: {
  bank: BankTransferDetails;
  orderNumber: string;
  totalFormatted: string;
}) {
  const whatsappText = `Merhaba, ${orderNumber} numaralı siparişim için havale/EFT yaptım. Tutar: ${totalFormatted}.`;
  const whatsappHref = getSupportWhatsAppHref(whatsappText);

  if (!bank.configured) {
    return (
      <section className="mt-5 rounded-2xl border border-amber-300 bg-amber-50/90 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-900">
          Havale / EFT bilgileri
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-amber-950">
          Banka hesap bilgileri kısa süre içinde güncellenecek. Lütfen ödeme yapmadan önce{" "}
          <a className="font-medium underline" href="mailto:destek@zeluladesign.com">
            destek@zeluladesign.com
          </a>{" "}
          veya WhatsApp üzerinden IBAN isteyin; sipariş numaranızı yazmayı unutmayın:{" "}
          <span className="font-mono font-semibold">{orderNumber}</span>.
        </p>
        <Link
          href={whatsappHref}
          className="mt-4 inline-flex rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
        >
          WhatsApp ile yaz
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-800">
        Havale / EFT bilgileri
      </h2>
      <p className="mt-2 text-sm text-amber-950/90">
        Aşağıdaki hesaba <span className="font-semibold">{totalFormatted}</span> transfer edin. Açıklama
        alanına yalnızca sipariş numaranızı yazın.
      </p>

      <dl className="mt-4 space-y-3 text-sm text-amber-950">
        <div>
          <dt className="text-amber-700">Banka</dt>
          <dd className="mt-0.5 font-medium">{bank.bankName}</dd>
        </div>
        <div>
          <dt className="text-amber-700">Hesap sahibi</dt>
          <dd className="mt-0.5 font-medium">{bank.accountHolder}</dd>
        </div>
        <div>
          <dt className="text-amber-700">IBAN</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] leading-snug tracking-wide">{bank.ibanDisplay}</span>
            <CopyValueButton value={bank.ibanCompact} label="IBAN kopyala" />
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/80 bg-white/70 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Açıklama (zorunlu)</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-stone-950">{orderNumber}</p>
        </div>
        <CopyValueButton value={orderNumber} label="Kopyala" />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-amber-900/85">
        Ödemeniz 1–2 iş günü içinde kontrol edilir; onay sonrası siparişiniz hazırlanmaya alınır. Dekontu
        WhatsApp ile iletebilirsiniz.
      </p>
      <Link
        href={whatsappHref}
        className="mt-3 inline-flex rounded-full border border-[#25D366]/40 bg-white px-4 py-2 text-sm font-medium text-[#128C7E] hover:bg-[#f0faf4]"
      >
        Ödeme bildirimi — WhatsApp
      </Link>
    </section>
  );
}
