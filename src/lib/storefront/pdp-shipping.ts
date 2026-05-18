/** PDP kargo vaadi — kargo-iade sayfasıyla uyumlu, İstanbul saati. */
const ISTANBUL = "Europe/Istanbul";
const CUTOFF_HOUR = 16;
const CUTOFF_MINUTE = 0;

const TR_WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"] as const;

export type PdpShippingPromise = {
  /** İş günü ve cutoff öncesi: geri sayım metni için */
  cutoffCountdown: { hours: number; minutes: number } | null;
  /** Geri sayım kutusunda süre sonrası kısım */
  urgencyTail: string;
  carrierLabel: string;
  deliveryLine: string;
  noteLine: string;
};

function istanbulDateParts(now: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ISTANBUL,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    weekday: weekdayMap[parts.weekday ?? "Mon"] ?? 1,
    hour: Number(parts.hour ?? 0),
    minute: Number(parts.minute ?? 0),
  };
}

function isBusinessDay(weekday: number) {
  return weekday >= 1 && weekday <= 5;
}

function nextBusinessDayIndex(fromWeekday: number): number {
  let d = fromWeekday;
  do {
    d = (d + 1) % 7;
  } while (!isBusinessDay(d));
  return d;
}

function minutesUntilCutoff(hour: number, minute: number, weekday: number): number | null {
  if (!isBusinessDay(weekday)) return null;
  const nowMins = hour * 60 + minute;
  const cutoffMins = CUTOFF_HOUR * 60 + CUTOFF_MINUTE;
  if (nowMins >= cutoffMins) return null;
  return cutoffMins - nowMins;
}

function dispatchDayLabel(weekday: number, hour: number, minute: number): string {
  const beforeCutoff = isBusinessDay(weekday) && hour * 60 + minute < CUTOFF_HOUR * 60 + CUTOFF_MINUTE;
  if (beforeCutoff && weekday >= 1 && weekday <= 4) return "yarın";
  if (beforeCutoff && weekday === 5) return TR_WEEKDAYS[1]; // Cuma → Pazartesi
  const next = nextBusinessDayIndex(weekday);
  if (next === (weekday + 1) % 7 && weekday !== 5) return "yarın";
  return TR_WEEKDAYS[next];
}

/** Mağaza vitrininde gösterilecek kargo özeti. */
export function buildPdpShippingPromise(now = new Date()): PdpShippingPromise {
  const { weekday, hour, minute } = istanbulDateParts(now);
  const untilCutoff = minutesUntilCutoff(hour, minute, weekday);
  const dispatch = dispatchDayLabel(weekday, hour, minute);

  let urgencyTail: string;
  if (untilCutoff != null && untilCutoff > 0) {
    urgencyTail = `en geç ${dispatch} DHL Kargo’ya teslim edilir.`;
  } else if (isBusinessDay(weekday)) {
    urgencyTail = `Bugünkü kesim doldu; yeni siparişler en geç ${dispatch} kargoya verilir.`;
  } else {
    urgencyTail = `Hafta sonu siparişleri en geç ${dispatch} DHL Kargo’ya teslim edilir.`;
  }

  return {
    cutoffCountdown:
      untilCutoff != null && untilCutoff > 0
        ? { hours: Math.floor(untilCutoff / 60), minutes: untilCutoff % 60 }
        : null,
    urgencyTail,
    carrierLabel: "DHL Kargo",
    deliveryLine: "Tahmini teslimat: 2–4 iş günü içinde kapında",
    noteLine: "Siparişler cumartesi ve pazar hariç 1 iş günü içinde kargoya verilir.",
  };
}
