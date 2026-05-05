"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ToggleFavoriteResult = { ok: true; favorited: boolean } | { ok: false; error: string };

function revalidateFavoriteSurfaces(productSlug: string) {
  revalidatePath("/hesabim");
  revalidatePath("/urunler");
  revalidatePath("/cok-satanlar");
  revalidatePath("/");
  revalidatePath(`/urunler/${productSlug}`);
}

export async function toggleProductFavorite(productId: string, productSlug: string): Promise<ToggleFavoriteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "Giriş yapmalısın." };

  const { data: existing } = await supabase
    .from("customer_product_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("customer_product_favorites").delete().eq("id", existing.id);
    if (error) return { ok: false, error: "Favori kaldırılamadı." };
    revalidateFavoriteSurfaces(productSlug);
    return { ok: true, favorited: false };
  }

  const { error } = await supabase.from("customer_product_favorites").insert({
    user_id: user.id,
    product_id: productId,
  });
  if (error) return { ok: false, error: "Favori eklenemedi." };
  revalidateFavoriteSurfaces(productSlug);
  return { ok: true, favorited: true };
}
