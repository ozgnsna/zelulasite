"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ProductVariant } from "@/lib/types";

type VariantSelection = {
  variants: ProductVariant[];
  requiresVariant: boolean;
  selectedVariantId: string | null;
  setSelectedVariantId: (id: string | null) => void;
  selectedVariant: ProductVariant | null;
};

const VariantSelectionContext = createContext<VariantSelection | null>(null);

export function ProductVariantProvider({
  variants,
  children,
}: {
  variants: ProductVariant[];
  children: ReactNode;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const value = useMemo<VariantSelection>(() => {
    const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;
    return {
      variants,
      requiresVariant: variants.length > 0,
      selectedVariantId,
      setSelectedVariantId,
      selectedVariant,
    };
  }, [variants, selectedVariantId]);

  return <VariantSelectionContext.Provider value={value}>{children}</VariantSelectionContext.Provider>;
}

/** Provider yoksa null döner; bu sayede AddToCartButton varyantsız sayfalarda da çalışır. */
export function useOptionalVariantSelection(): VariantSelection | null {
  return useContext(VariantSelectionContext);
}

export const VARIANT_SELECTOR_ANCHOR_ID = "urun-olcu-secimi";
