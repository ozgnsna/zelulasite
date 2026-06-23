"use client";

import { useState } from "react";
import Link from "next/link";
import type { AccountGiftCard } from "@/lib/account/gift-cards";
import { formatTry } from "@/lib/money";

function extractCodeFromMessage(message: string | null): string | null {
  if (!message) return null;
  const match = message.match(/\bKod:\s*([A-Z0-9]{8,24})\b/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function formatExpiry(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function GiftCardCodeRow({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-[#e8dcc8]/90 bg-white/70 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#7a6a58]">Kupon kodun</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <code className="font-mono text-base tracking-[0.18em] text-[#2c241c]">{code}</code>
        <button
          type="button"
          onClick={copyCode}
          className="rounded-full border border-[#d4c4a8]/80 bg-[#fcf8f1] px-3 py-1 text-[11px] font-medium text-[#6b5d4a] transition hover:bg-[#f5ecdf]"
        >
          {copied ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#7d6f60]">
        Ödeme adımında bu kodu girerek bakiyeni kullanabilirsin.
      </p>
    </div>
  );
}

export function AccountGiftCardsSection({ cards }: { cards: AccountGiftCard[] }) {
  if (cards.length === 0) return null;

  const activeCards = cards.filter((c) => c.status === "active" && c.balanceRemaining > 0);
  const totalBalance = activeCards.reduce((sum, c) => sum + c.balanceRemaining, 0);

  return (
    <section
      id="kuponlarim"
      className="scroll-mt-28 rounded-2xl border border-[#e2d5c4]/90 bg-gradient-to-b from-[#fcf8f1] via-[#f8f1e7] to-[#f2e8db] p-6 shadow-[inset_0_0_44px_rgba(232,201,139,0.12),0_16px_40px_rgba(62,52,38,0.06)] sm:p-8"
      aria-labelledby="account-gift-cards-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#7a6a58]">Kuponlarım</p>
          <h2 id="account-gift-cards-heading" className="mt-2 font-serif text-2xl text-[#2c241c] sm:text-[1.65rem]">
            {totalBalance > 0 ? formatTry(totalBalance) : "Kupon bakiyen"}
          </h2>
        </div>
        {totalBalance > 0 ? (
          <Link
            href="/urunler"
            className="mt-2 inline-flex items-center rounded-full border border-[#d4c4a8]/80 bg-white/50 px-3 py-1 text-[11px] font-medium tracking-wide text-[#6b5d4a] transition hover:bg-white/80 sm:mt-0"
          >
            Alışverişe başla
          </Link>
        ) : null}
      </div>

      <p className="mt-4 text-sm font-light leading-relaxed text-[#5a4f42]">
        Barter ve iş birliği kuponların burada listelenir. Bakiyeni sepette ödeme adımında kullanabilirsin.
      </p>

      <ul className="mt-6 space-y-4">
        {cards.map((card) => {
          const expiry = formatExpiry(card.expiresAt);
          const isActive = card.status === "active" && card.balanceRemaining > 0;
          const code = card.accountVisibleCode ?? extractCodeFromMessage(card.personalMessage);
          const displayMessage = card.personalMessage?.replace(/\s*·?\s*Kod:\s*[A-Z0-9]{8,24}\s*/i, "").trim();

          return (
            <li
              key={card.id}
              className="rounded-2xl border border-[#eadfcf]/90 bg-white/55 p-5 shadow-[0_8px_24px_rgba(62,52,38,0.05)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[#2c241c]">
                    {isActive ? formatTry(card.balanceRemaining) : "Kullanıldı"}
                    {!isActive && card.initialBalance > 0 ? (
                      <span className="ml-2 text-sm font-normal text-stone-500">
                        (başlangıç {formatTry(card.initialBalance)})
                      </span>
                    ) : null}
                  </p>
                  {displayMessage ? (
                    <p className="mt-1 text-sm text-stone-600">{displayMessage}</p>
                  ) : null}
                </div>
                <span
                  className={
                    isActive
                      ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800"
                      : "inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600"
                  }
                >
                  {isActive ? "Aktif" : "Tükendi"}
                </span>
              </div>

              {isActive && code ? <GiftCardCodeRow code={code} /> : null}

              {isActive && !code && card.codeLast4 ? (
                <p className="mt-3 text-xs text-stone-600">
                  Kod son hanesi: <span className="font-mono">{card.codeLast4}</span>. Tam kod için destek ile iletişime geç.
                </p>
              ) : null}

              {expiry ? (
                <p className="mt-3 text-[11px] text-[#8a7d6f]">Geçerlilik: {expiry} tarihine kadar</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
