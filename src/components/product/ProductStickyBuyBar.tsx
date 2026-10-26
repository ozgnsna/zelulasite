"use client";

import { useSyncExternalStore } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { CONSENT_UPDATED_EVENT, getCookieConsent } from "@/lib/cookies/consent";
import { formatTry } from "@/lib/money";
import { OOS_PDP_BADGE } from "@/lib/storefront/unique-piece-copy";

function subscribeConsent(onStoreChange: () => void) {
  window.addEventListener(CONSENT_UPDATED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CONSENT_UPDATED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

type ProductStickyBuyBarProps = {
  productId: string;
  productName: string;
  productSlug: string;
  price: number;
  stock: number;
  category?: string | null;
  collection?: string | null;
  isOutOfStock: boolean;
  isStockOne: boolean;
  isLowStockBand: boolean;
  stockQty: number;
};

/** Mobil PDP yapışkan sepet — çerez onayı gelmeden gizlenir. */
export function ProductStickyBuyBar({
  productId,
  productName,
  productSlug,
  price,
  stock,
  category,
  collection,
  isOutOfStock,
  isStockOne,
  isLowStockBand,
  stockQty,
}: ProductStickyBuyBarProps) {
  const consent = useSyncExternalStore(subscribeConsent, getCookieConsent, () => null);
  if (consent === null) return null;

  return (
    <div className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[110] mx-auto w-[calc(100%-1rem)] max-w-md rounded-2xl border border-brand-gold/25 bg-[#fffdfb]/95 p-3 shadow-[0_12px_32px_rgba(45,37,33,0.14)] backdrop-blur-md md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-stone-500">Toplam</p>
          <p className="text-lg font-semibold text-brand-gold">{formatTry(price)}</p>
          <p className="text-[11px] text-stone-500">
            {isOutOfStock
              ? OOS_PDP_BADGE
              : isStockOne
                ? "Son 1 adet"
                : isLowStockBand
                  ? `Son ${stockQty} ürün`
                  : "Stokta var"}
          </p>
        </div>
        <div className="min-w-[9.5rem] shrink-0">
          <AddToCartButton
            productId={productId}
            productName={productName}
            price={price}
            category={category ?? undefined}
            collection={collection ?? null}
            stock={stock}
            tone="luxury"
            label="Şimdi satın al"
            secondaryLabel="Sepete Ekle"
            redirectAfterAdd="/sepet"
            productSlug={productSlug}
            className="!space-y-2 [&_button]:!py-3 [&_button]:text-xs"
          />
        </div>
      </div>
    </div>
  );
}
