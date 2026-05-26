/** Ödeme log `status` — teknik değerleri Türkçe, kısa etiketlere çevir (UI only). */
export function callbackLogStatusLabelTr(status: string): string {
  const s = String(status ?? "")
    .trim()
    .toLowerCase();
  switch (s) {
    case "success":
      return "Başarılı bildirim";
    case "failed":
      return "Başarısız bildirim";
    case "duplicate_success":
      return "Yinelenen başarı";
    case "duplicate":
      return "Yinelenen kayıt";
    case "updated":
      return "Manuel güncelleme";
    case "resolved_paid":
      return "Ödeme eşleştirildi";
    case "checked_no_success":
      return "Başarı kaydı yok";
    case "paid_override":
      return "Manuel ödeme işareti";
    case "queued":
      return "Kuyrukta";
    case "orphaned":
      return "Eşleşmeyen bildirim";
    default:
      return s ? s.replace(/_/g, " ") : "Kayıt";
  }
}

/** `payment_logs.event_type` — kısa Türkçe özet. */
export function callbackEventKindLabelTr(eventType: string | null | undefined): string {
  const e = String(eventType ?? "callback")
    .trim()
    .toLowerCase();
  switch (e) {
    case "callback":
      return "Ödeme bildirimi";
    case "manual_status_update":
      return "Manuel durum";
    case "manual_reconcile":
      return "Manuel kontrol";
    case "manual_mark_paid":
      return "Manuel ödeme";
    case "manual_retry_init":
      return "Ödeme yeniden deneme";
    case "admin_notify":
      return "Admin bildirimi (e-posta / WhatsApp)";
    default:
      return e.replace(/_/g, " ");
  }
}

export function callbackVerificationLabelTr(v: string | null | undefined): string {
  const t = String(v ?? "")
    .trim()
    .toLowerCase();
  if (t === "passed") return "Doğrulandı";
  if (t === "failed") return "Doğrulanamadı";
  if (!t) return "—";
  return String(v).trim();
}

export type LatestLogShape = {
  status: string;
  verification_status: string | null;
  created_at: string;
};

/**
 * Özet kutusu: ödeme satırı ile callback’i karıştırmaz.
 * Örn. log "success" iken sipariş hâlâ pending → uyarı tonu.
 */
export function callbackPublicSummary(args: {
  paymentStatus: string;
  latest: LatestLogShape | undefined;
}): { title: string; body: string; tone: "ok" | "warn" | "neutral" } {
  const { paymentStatus, latest } = args;
  const paid = paymentStatus === "paid";

  if (!latest) {
    return {
      title: "Henüz bildirim yok",
      body: "Sağlayıcıdan kayıt gelince burada görünür.",
      tone: "neutral",
    };
  }

  const logStatus = String(latest.status ?? "").toLowerCase();
  const ver = String(latest.verification_status ?? "").trim().toLowerCase();
  const verLabel = callbackVerificationLabelTr(latest.verification_status);
  const logLabel = callbackLogStatusLabelTr(latest.status);

  if (paid && ver === "passed") {
    return {
      title: "Ödeme satırı uyumlu",
      body: "Bildirim doğrulandı; ek işlem gerekmez.",
      tone: "ok",
    };
  }

  if (!paid && (logStatus === "success" || ver === "passed")) {
    return {
      title: "Bildirim var, ödeme bekliyor",
      body: "«Ödemeyi Kontrol Et» ile satırı güncelleyin.",
      tone: "warn",
    };
  }

  if (logStatus === "failed" || ver === "failed") {
    return {
      title: "Bildirim sorunu",
      body: "Sağlayıcı veya imza hatası olabilir; kayıt detayına bakın.",
      tone: "warn",
    };
  }

  return {
    title: "Son bildirim",
    body: `${logLabel} · ${verLabel}`,
    tone: "neutral",
  };
}
