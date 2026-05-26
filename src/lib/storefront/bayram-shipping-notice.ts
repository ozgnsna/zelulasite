/** Bayram dönemi kargo duyurusu — İstanbul takvimine göre 1 Haziran’a kadar. */

const ISTANBUL = "Europe/Istanbul";

/** Kargo çıkışlarının yeniden başlayacağı gün (dahil). */
export const BAYRAM_SHIPPING_RESUME_DATE = "2026-06-01";

export const BAYRAM_POLICY_LINE =
  "Bayram nedeniyle kargolar 1 Haziran Pazartesi itibarıyla çalışacak. Bu tarihten önce verilen siparişler sırayla kargoya verilir.";

export function isBayramShippingPause(now = new Date()): boolean {
  const resumeAt = new Date(`${BAYRAM_SHIPPING_RESUME_DATE}T00:00:00+03:00`);
  return now < resumeAt;
}

function istanbulYmd(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ISTANBUL, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    now,
  );
}

/** Üst şerit (marquee) mesajları — bayram döneminde. */
export function getBayramAnnouncementMessages(freeShippingLine: string): string[] {
  return [
    "İyi bayramlar — Zelula ailesi olarak bayramınızı en içten dileklerimizle kutluyoruz",
    "Bayram nedeniyle kargolar 1 Haziran Pazartesi itibarıyla çalışacak",
    freeShippingLine,
    "Güvenli ödeme · Kolay iade",
    "Türkiye geneli teslimat",
  ];
}

/** PDP / geri sayım şeridi için kısa bayram metni. */
export function formatBayramShippingBanner(now = new Date()): string {
  if (!isBayramShippingPause(now)) return "";
  const today = istanbulYmd(now);
  if (today < BAYRAM_SHIPPING_RESUME_DATE) {
    return "Bayram nedeniyle kargolar 1 Haziran Pazartesi itibarıyla çalışacak · İyi bayramlar";
  }
  return "Kargolarımız yeniden çalışıyor · İyi bayramlar";
}
