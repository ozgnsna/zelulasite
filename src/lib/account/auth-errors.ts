import type { AuthError } from "@supabase/supabase-js";

/** Turkish messages for common Supabase Auth errors (keep copy calm and clear). */
export function mapAuthError(error: AuthError | { message: string }): string {
  const code = "code" in error ? error.code : undefined;
  const msg = (error.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || msg.includes("invalid login")) {
    return "E-posta veya şifre hatalı. Bilgilerinizi kontrol edip tekrar deneyin.";
  }
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "E-posta adresiniz henüz onaylanmamış. Gelen kutunuzdaki bağlantıyı kullanın.";
  }
  if (code === "user_already_registered" || msg.includes("user already registered")) {
    return "Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.";
  }
  if (code === "weak_password" || (msg.includes("password") && !msg.includes("reset"))) {
    return "Şifre yeterince güçlü değil. En az 8 karakter ve harf ile rakam kullanın.";
  }
  if (
    code === "otp_expired" ||
    msg.includes("expired") ||
    (msg.includes("invalid") && msg.includes("token"))
  ) {
    return "Şifre sıfırlama bağlantısının süresi dolmuş veya geçersiz. Lütfen yeniden bağlantı isteyin.";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Bağlantı sorunu oluştu. İnternetinizi kontrol edip tekrar deneyin.";
  }

  return "İşlem tamamlanamadı. Birkaç dakika sonra tekrar deneyin veya farklı bir e-posta kullanın.";
}
