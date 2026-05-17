"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCartItems, setCartItems } from "@/lib/cart";
import { normalizeEmailInput } from "@/lib/account/email-input";
import { unwrapSupabaseRelation } from "@/lib/gift-cards/unwrap-relation";
import type { CartItem } from "@/lib/types";

const giftCardPurchaseSchema = z.object({
  denominationId: z.string().uuid("Geçersiz hediye kartı seçimi."),
  recipientEmail: z
    .string()
    .transform((s) => normalizeEmailInput(s))
    .pipe(z.string().email("Geçerli bir alıcı e-postası girin.")),
  recipientName: z
    .string()
    .max(120)
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : null)),
  personalMessage: z
    .string()
    .max(500)
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : null)),
});

export type AddGiftCardToCartResult =
  | { ok: true }
  | { ok: false; error: string };

export async function addGiftCardToCart(
  _prev: AddGiftCardToCartResult | undefined,
  formData: FormData,
): Promise<AddGiftCardToCartResult> {
  const parsed = giftCardPurchaseSchema.safeParse({
    denominationId: formData.get("denomination_id"),
    recipientEmail: formData.get("recipient_email"),
    recipientName: formData.get("recipient_name") ?? undefined,
    personalMessage: formData.get("personal_message") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin." };
  }

  const supabase = await createClient();
  const { data: denom, error: denomError } = await supabase
    .from("gift_card_denominations")
    .select("id, amount, is_active, product_id, products:product_id ( id, is_active, product_kind )")
    .eq("id", parsed.data.denominationId)
    .eq("is_active", true)
    .maybeSingle();

  if (denomError || !denom) {
    return { ok: false, error: "Seçilen hediye kartı bulunamadı." };
  }

  const product = unwrapSupabaseRelation(denom.products);
  const productId = denom.product_id ?? product?.id;
  if (!productId || product?.is_active === false) {
    return {
      ok: false,
      error: "Bu tutar şu an satışa hazır değil. Lütfen daha sonra tekrar deneyin veya destek ile iletişime geçin.",
    };
  }

  const giftMeta = {
    denominationId: parsed.data.denominationId,
    recipientEmail: parsed.data.recipientEmail,
    recipientName: parsed.data.recipientName,
    personalMessage: parsed.data.personalMessage,
  };

  const cart = await getCartItems();
  const withoutOtherGiftCards = cart.filter((line) => !line.giftCard);
  const existingIdx = withoutOtherGiftCards.findIndex((line) => line.productId === productId);

  const nextLine: CartItem = {
    productId,
    quantity: 1,
    giftCard: giftMeta,
  };

  let next: CartItem[];
  if (existingIdx >= 0) {
    next = [...withoutOtherGiftCards];
    next[existingIdx] = nextLine;
  } else {
    next = [...withoutOtherGiftCards, nextLine];
  }

  await setCartItems(next);
  revalidatePath("/sepet");
  revalidatePath("/hediye-karti");
  revalidatePath("/");
  return { ok: true };
}
