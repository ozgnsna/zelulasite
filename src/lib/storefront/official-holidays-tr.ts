/**
 * Kaynak: Diyanet / resmi tatiller (Türkiye).
 * Yıllık kontrol et — dini bayramlar her yıl kayar; arife iş günü sayılır (listeye eklenmez).
 */

export const OFFICIAL_HOLIDAYS_TR: readonly string[] = [
  // 2026 — Eylül sonrası kalan (arife hariç)
  "2026-10-29", // Cumhuriyet Bayramı

  // 2027 — sivil
  "2027-01-01", // Yılbaşı
  "2027-04-23", // Ulusal Egemenlik ve Çocuk Bayramı
  "2027-05-01", // Emek ve Dayanışma Günü
  "2027-05-19", // Atatürk'ü Anma, Gençlik ve Spor Bayramı (+ Kurban 4. gün)
  "2027-07-15", // Demokrasi ve Millî Birlik Günü
  "2027-08-30", // Zafer Bayramı
  "2027-10-29", // Cumhuriyet Bayramı

  // 2027 — dini (Ramazan / Kurban tam günler; arife yok)
  "2027-03-09", // Ramazan Bayramı 1
  "2027-03-10", // Ramazan Bayramı 2
  "2027-03-11", // Ramazan Bayramı 3
  "2027-05-16", // Kurban Bayramı 1
  "2027-05-17", // Kurban Bayramı 2
  "2027-05-18", // Kurban Bayramı 3
  // 2027-05-19 zaten sivil listede
] as const;

const HOLIDAY_SET = new Set<string>(OFFICIAL_HOLIDAYS_TR);

/** Europe/Istanbul takvim günü → YYYY-MM-DD */
export function getIstanbulYmd(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isOfficialHolidayTr(ymd: string): boolean {
  return HOLIDAY_SET.has(ymd);
}
