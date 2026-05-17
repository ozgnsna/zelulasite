"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getGiftCardProductImagePublicUrl } from "@/lib/gift-cards/product-image";
import { Gift, Mail, Sparkles } from "lucide-react";
import { addGiftCardToCart } from "@/app/actions/gift-cards";
import { EmailField } from "@/components/account/EmailField";
import { isBasicValidEmail, normalizeEmailInput } from "@/lib/account/email-input";
import { formatTry } from "@/lib/money";
import type { GiftCardDenomination } from "@/lib/gift-cards/types";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-[#e8dfd3]/90 bg-[linear-gradient(180deg,#ffffff_0%,#faf8f5_100%)] px-4 py-2.5 text-stone-900 outline-none transition-all duration-200 ease-out placeholder:text-stone-400 focus:border-[#C6A36D] focus:bg-white focus:shadow-[0_0_0_2px_rgba(198,163,109,0.15)] focus:ring-0 disabled:opacity-60";

type Props = {
  denominations: GiftCardDenomination[];
};

export function GiftCardPurchaseForm({ denominations }: Props) {
  const router = useRouter();
  const purchasable = useMemo(() => denominations.filter((d) => d.isConfigured), [denominations]);
  const [selectedId, setSelectedId] = useState<string>(purchasable[0]?.id ?? denominations[0]?.id ?? "");
  const [emailSubmitBlocked, setEmailSubmitBlocked] = useState(false);
  const [state, formAction, pending] = useActionState(addGiftCardToCart, undefined);

  const selected = denominations.find((d) => d.id === selectedId) ?? purchasable[0] ?? denominations[0];
  const canPurchase = Boolean(selected?.isConfigured);
  const coverImageUrl = selected?.imageUrl ?? getGiftCardProductImagePublicUrl();

  if (denominations.length === 0) {
    return (
      <p className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        Hediye kartları şu an yüklenemedi. Lütfen kısa süre sonra tekrar deneyin.
      </p>
    );
  }

  useEffect(() => {
    if (state?.ok) router.push("/sepet");
  }, [state, router]);

  if (state?.ok) {
    return (
      <p
        className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900"
        role="status"
      >
        Sepete eklendi — ödeme adımına yönlendiriliyorsunuz…
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-8"
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        const em = normalizeEmailInput(String(fd.get("recipient_email") ?? ""));
        if (!isBasicValidEmail(em)) {
          e.preventDefault();
          setEmailSubmitBlocked(true);
        }
        if (!selectedId) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="denomination_id" value={selectedId} readOnly />

      {coverImageUrl ? (
        <div className="relative mx-auto aspect-[16/10] w-full max-w-md overflow-hidden rounded-2xl border border-[#e8dfd3] bg-[#1a1512] shadow-md">
          <Image
            src={coverImageUrl}
            alt="Zelula dijital hediye kartı"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 28rem"
            priority
          />
        </div>
      ) : null}

      <section aria-labelledby="gift-amount-heading">
        <h2 id="gift-amount-heading" className="text-sm font-medium uppercase tracking-[0.14em] text-stone-500">
          Tutar seçin
        </h2>
        <GiftCardAmountGrid denominations={denominations} selectedId={selectedId} onSelect={setSelectedId} />
      </section>

      {!canPurchase ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 text-sm text-amber-950">
          Seçilen tutar henüz satışa bağlanmadı. Migration ve ürün seed adımlarını Supabase üzerinde uyguladığınızdan emin
          olun.
        </p>
      ) : null}

      <section
        aria-labelledby="gift-recipient-heading"
        className="rounded-2xl border border-[#e8dfd3] bg-[color:var(--surface)] p-6 shadow-sm sm:p-8"
      >
        <p className="editorial-kicker">Alıcı</p>
        <h2 id="gift-recipient-heading" className="mt-1 font-serif text-2xl text-stone-900">
          Kime gönderelim?
        </h2>
        <p className="mt-1 text-sm text-stone-600">E-posta adresi zorunludur; mesajınız kod ile birlikte iletilebilir.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="recipient-email" className="mb-1 flex items-center gap-1.5 text-sm font-medium text-stone-700">
              <Mail className="h-3.5 w-3.5 opacity-60" aria-hidden />
              Alıcı e-postası
            </label>
            <EmailField
              id="recipient-email"
              name="recipient_email"
              disabled={pending || !canPurchase}
              placeholder="sevdiginiz@ornek.com"
              inputClassName={fieldClass}
              submitBlocked={emailSubmitBlocked}
              onClearSubmitBlocked={() => setEmailSubmitBlocked(false)}
            />
            <p className="mt-1.5 text-xs text-stone-500">Benzersiz kod bu adrese gönderilir.</p>
          </div>
          <GiftCardRecipientFields pending={pending} canPurchase={canPurchase} />
        </div>
      </section>

      {state && !state.ok ? (
        <p className="rounded-xl border border-stone-200/80 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-700" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-600">
          Toplam:{" "}
          <span className="font-semibold text-stone-900">{selected ? formatTry(selected.amount) : "—"}</span>
          <span className="text-stone-400"> · Kargo yok</span>
        </p>
        <button
          type="submit"
          disabled={pending || !canPurchase || !selectedId}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--brand-gold)] px-8 py-3.5 text-sm font-medium text-stone-900 shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Gift className="h-4 w-4" aria-hidden />
          {pending ? "Sepete ekleniyor…" : "Sepete ekle ve ödemeye geç"}
        </button>
      </div>

      <p className="text-center text-xs leading-relaxed text-stone-500">
        Kod, ödeme onayından sonra e-posta ile iletilir. Sepette kısmi kullanılabilir.{" "}
        <Link href="/iade-ve-degisim" className="underline-offset-2 hover:underline">
          İade koşulları
        </Link>
      </p>
    </form>
  );
}

function GiftCardAmountGrid({
  denominations,
  selectedId,
  onSelect,
}: {
  denominations: GiftCardDenomination[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {denominations.map((d) => {
        const active = d.id === selectedId;
        const disabled = !d.isConfigured;
        return (
          <button
            key={d.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(d.id)}
            className={cn(
              "relative flex flex-col items-center rounded-2xl border px-4 py-6 text-center transition duration-200",
              active
                ? "border-[color:var(--brand-gold)] bg-[linear-gradient(165deg,#fffdfb_0%,#f8f1e6_100%)] shadow-[0_8px_28px_-12px_rgba(198,163,109,0.45)]"
                : "border-[#e8dfd3] bg-white hover:border-[color:var(--brand-gold)]/35 hover:shadow-sm",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {active ? (
              <span className="absolute right-3 top-3 text-[color:var(--brand-gold)]" aria-hidden>
                <Sparkles className="h-4 w-4" />
              </span>
            ) : null}
            <span className="font-serif text-3xl text-stone-900">{formatTry(d.amount)}</span>
            <span className="mt-2 text-xs text-stone-500">Dijital kart</span>
            {disabled ? <span className="mt-2 text-[11px] font-medium text-amber-800">Yakında</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function GiftCardRecipientFields({ pending, canPurchase }: { pending: boolean; canPurchase: boolean }) {
  return (
    <>
      <div>
        <label htmlFor="recipient-name" className="mb-1 block text-sm font-medium text-stone-700">
          Alıcı adı <span className="font-normal text-stone-400">(isteğe bağlı)</span>
        </label>
        <input
          id="recipient-name"
          name="recipient_name"
          type="text"
          autoComplete="name"
          maxLength={120}
          disabled={pending || !canPurchase}
          placeholder="Örn. Ayşe"
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="personal-message" className="mb-1 block text-sm font-medium text-stone-700">
          Kişisel mesaj <span className="font-normal text-stone-400">(isteğe bağlı)</span>
        </label>
        <textarea
          id="personal-message"
          name="personal_message"
          rows={4}
          maxLength={500}
          disabled={pending || !canPurchase}
          placeholder="Kısa bir not ekleyebilirsiniz…"
          className={cn(fieldClass, "min-h-[6rem] resize-y")}
        />
        <p className="mt-1 text-right text-xs text-stone-400">En fazla 500 karakter</p>
      </div>
    </>
  );
}
