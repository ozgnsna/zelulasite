"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { mapAuthError } from "@/lib/account/auth-errors";
import { normalizeEmailInput } from "@/lib/account/email-input";
import { normalizeTurkishFullName } from "@/lib/account/turkish-full-name";
import { buildAuthCallbackUrl } from "@/lib/account/site-url";
import { getSafeReturnPath } from "@/lib/account/safe-return-path";

export type AuthFormState = { ok: false; error: string } | { ok: true; message?: string } | undefined;

function normalizeBirthDateInput(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const trMatch = t.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (trMatch) {
    const [, dd, mm, yyyy] = trMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

const loginSchema = z.object({
  email: z
    .string()
    .transform((s) => normalizeEmailInput(s))
    .pipe(z.string().email("Geçerli bir email adresi gir")),
  password: z.string().min(1, "Şifrenizi girin."),
});

const registerSchema = z.object({
  email: z
    .string()
    .transform((s) => normalizeEmailInput(s))
    .pipe(z.string().email("Geçerli bir email adresi gir")),
  password: z.string().min(8, "Şifren en az 8 karakter olmalı."),
  full_name: z
    .string()
    .transform((s) => normalizeTurkishFullName(s))
    .refine((s) => s.length >= 2, "Ad soyad en az 2 karakter olmalı."),
  phone: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((d) => /^05\d{9}$/.test(d), "Geçerli bir telefon numarası gir"),
  birth_date: z
    .string()
    .optional()
    .transform((s) => normalizeBirthDateInput(typeof s === "string" ? s : ""))
    .refine((t) => t === null || /^\d{4}-\d{2}-\d{2}$/.test(t), "Tarihi kontrol edersen seviniriz."),
});

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: mapAuthError(error) };
  }

  const destination = getSafeReturnPath(String(formData.get("next") ?? ""));
  revalidatePath("/", "layout");
  if (destination !== "/") {
    revalidatePath(destination);
  }
  redirect(destination);
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };
  }

  const supabase = await createClient();
  const email = parsed.data.email;
  const full_name = parsed.data.full_name;
  const phone = parsed.data.phone;
  const birth_date = parsed.data.birth_date;

  const userMeta: Record<string, string> = { full_name, phone };
  if (birth_date) {
    userMeta.birth_date = birth_date;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: parsed.data.password,
    options: {
      data: userMeta,
    },
  });

  if (error) {
    return { ok: false, error: mapAuthError(error) };
  }

  if (data.session && data.user) {
    await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        full_name,
        phone,
        birth_date: birth_date ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  }

  if (!data.session) {
    return {
      ok: true,
      message:
        "Hesabınız oluşturuldu. E-postanızdaki onay bağlantısına tıkladıktan sonra giriş yapabilirsiniz.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .transform((s) => normalizeEmailInput(s))
    .pipe(z.string().email("Geçerli bir e-posta adresi girin.")),
});

const newPasswordSchema = z.object({
  password: z.string().min(8, "Şifren en az 8 karakter olmalı."),
});

/** Şifre sıfırlama e-postası gönderir (e-posta yoksa da aynı başarı mesajı — enumeration önlemi). */
export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "E-posta adresinizi kontrol edin." };
  }

  const redirectTo = buildAuthCallbackUrl("/sifre-yenile");
  if (!redirectTo) {
    return {
      ok: false,
      error: "Şifre sıfırlama şu an yapılandırılamıyor. Lütfen daha sonra tekrar deneyin.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  });

  if (error && process.env.NODE_ENV === "development") {
    console.warn("[requestPasswordReset]", error.message);
  }

  return {
    ok: true,
    message:
      "Bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve istenmeyen klasörünü kontrol edin (birkaç dakika sürebilir).",
  };
}

export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Şifrenizi kontrol edin." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error:
        "Oturum bulunamadı. Şifre sıfırlama bağlantısının süresi dolmuş olabilir; lütfen yeniden bağlantı isteyin.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { ok: false, error: mapAuthError(error) };
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/giris?reset=ok");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

const profileSchema = z.object({
  full_name: z
    .string()
    .transform((s) => normalizeTurkishFullName(s))
    .refine((s) => s.length >= 2, "Ad soyad en az 2 karakter olmalı."),
  phone: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((d) => d === "" || /^05\d{9}$/.test(d), "Geçerli bir telefon numarası gir"),
  birth_date: z
    .string()
    .optional()
    .transform((s) => normalizeBirthDateInput(typeof s === "string" ? s : ""))
    .refine((t) => t === null || /^\d{4}-\d{2}-\d{2}$/.test(t), "Tarihi kontrol edersen seviniriz."),
});

export type ProfileFormState = { ok: false; error: string } | { ok: true } | undefined;

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = profileSchema.safeParse({
    full_name: String(formData.get("full_name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    birth_date: String(formData.get("birth_date") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ad soyadı kontrol edin." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Oturumunuz sona ermiş. Lütfen tekrar giriş yapın." };
  }

  const phone = parsed.data.phone === "" ? null : parsed.data.phone;
  const birth_date = parsed.data.birth_date;

  const payload = {
    id: user.id,
    full_name: parsed.data.full_name,
    phone,
    birth_date,
    updated_at: new Date().toISOString(),
  };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) {
    return { ok: false, error: "Profil güncellenemedi. Lütfen tekrar deneyin." };
  }

  revalidatePath("/hesabim");
  return { ok: true };
}
