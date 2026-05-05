"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const addressFields = z.object({
  label: z.preprocess((v) => String(v ?? "").trim().slice(0, 64) || "Adres", z.string().max(64)),
  recipient_name: z.string().min(2, "Ad soyad en az 2 karakter olmalı."),
  phone: z.string().min(10, "Telefon en az 10 hane olmalı."),
  address_line: z.string().min(5, "Açık adres en az 5 karakter olmalı."),
  city: z.string().min(2, "İl gerekli."),
  district: z.string().min(2, "İlçe gerekli."),
  postal_code: z.string().min(4, "Posta kodu en az 4 karakter olmalı."),
});

async function clearOtherDefaults(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, keepId?: string) {
  let q = supabase.from("customer_saved_addresses").update({ is_default: false, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (keepId) q = q.neq("id", keepId);
  await q;
}

export type AddressActionState = { ok: true } | { ok: false; error: string };

export async function createSavedAddress(_prev: AddressActionState | undefined, formData: FormData): Promise<AddressActionState> {
  const parsed = addressFields.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Giriş yapmalısın." };

  const setDefault = String(formData.get("is_default") ?? "") === "on";
  const { count } = await supabase
    .from("customer_saved_addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const isFirst = (count ?? 0) === 0;

  if (setDefault || isFirst) {
    await clearOtherDefaults(supabase, user.id);
  }

  const { error } = await supabase.from("customer_saved_addresses").insert({
    user_id: user.id,
    label: parsed.data.label,
    recipient_name: parsed.data.recipient_name,
    phone: parsed.data.phone,
    address_line: parsed.data.address_line,
    city: parsed.data.city,
    district: parsed.data.district,
    postal_code: parsed.data.postal_code,
    is_default: setDefault || isFirst,
  });
  if (error) return { ok: false, error: "Adres kaydedilemedi." };
  revalidatePath("/hesabim");
  revalidatePath("/sepet");
  return { ok: true };
}

export async function deleteSavedAddress(addressId: string): Promise<AddressActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Giriş yapmalısın." };
  const { error } = await supabase.from("customer_saved_addresses").delete().eq("id", addressId).eq("user_id", user.id);
  if (error) return { ok: false, error: "Adres silinemedi." };
  revalidatePath("/hesabim");
  revalidatePath("/sepet");
  return { ok: true };
}

export async function setDefaultSavedAddress(addressId: string): Promise<AddressActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Giriş yapmalısın." };
  await clearOtherDefaults(supabase, user.id, addressId);
  const { error } = await supabase
    .from("customer_saved_addresses")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", addressId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Varsayılan güncellenemedi." };
  revalidatePath("/hesabim");
  revalidatePath("/sepet");
  return { ok: true };
}
