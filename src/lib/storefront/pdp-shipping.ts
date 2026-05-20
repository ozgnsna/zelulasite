/** PDP kargo vaadi — İstanbul saati; kesim 13:00, hafta sonu pazartesi. */
const ISTANBUL = "Europe/Istanbul";
const CUTOFF_HOUR = 13;
const CUTOFF_MINUTE = 0;

const POLICY_LINE =
  "Saat 13:00'a kadar verilen siparişler aynı gün kargoya verilir. Cumartesi ve pazar verilen siparişler pazartesi kargoya teslim edilir.";

export type PdpShippingPromise = {
  /** Pazartesi–Cuma, 13:00 öncesi: geri sayım */
  cutoffCountdown: { hours: number; minutes: number } | null;
  /** Yeşil kutu metni (geri sayım varsa süre sonrası kısım) */
  urgencyTail: string;
  carrierLabel: string;
  deliveryLine: string;
  noteLine: string;
};

function istanbulDateParts(now: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ISTANBUL,
    weekday: "short",
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

function isWeekday(weekday: number) {
  return weekday >= 1 && weekday <= 5;
}

function isWeekend(weekday: number) {
  return weekday === 0 || weekday === 6;
}

function minutesUntilCutoff(hour: number, minute: number, weekday: number): number | null {
  if (!isWeekday(weekday)) return null;
  const nowMins = hour * 60 + minute;
  const cutoffMins = CUTOFF_HOUR * 60 + CUTOFF_MINUTE;
  if (nowMins >= cutoffMins) return null;
  return cutoffMins - nowMins;
}

function weekdayDispatchLabel(weekday: number, hour: number, minute: number): string {
  if (isWeekend(weekday)) return "pazartesi";
  const beforeCutoff = hour * 60 + minute < CUTOFF_HOUR * 60 + CUTOFF_MINUTE;
  if (beforeCutoff) return "bugün";
  if (weekday === 5) return "pazartesi";
  return "yarın";
}

/** Mağaza vitrininde gösterilecek kargo özeti. */
export function buildPdpShippingPromise(now = new Date()): PdpShippingPromise {
  const { weekday, hour, minute } = istanbulDateParts(now);
  const untilCutoff = minutesUntilCutoff(hour, minute, weekday);
  const dispatch = weekdayDispatchLabel(weekday, hour, minute);

  let urgencyTail: string;
  if (isWeekend(weekday)) {
    urgencyTail = "Cumartesi ve pazar verilen siparişler pazartesi kargoya teslim edilir.";
  } else if (untilCutoff != null && untilCutoff > 0) {
    urgencyTail = "içinde sipariş verirsen bugün DHL Kargo'ya teslim edilir.";
  } else if (isWeekday(weekday)) {
    urgencyTail = `Bu sipariş en geç ${dispatch} DHL Kargo'ya teslim edilir.`;
  } else {
    urgencyTail = POLICY_LINE;
  }

  return {
    cutoffCountdown:
      untilCutoff != null && untilCutoff > 0
        ? { hours: Math.floor(untilCutoff / 60), minutes: untilCutoff % 60 }
        : null,
    urgencyTail,
    carrierLabel: "DHL Kargo",
    deliveryLine: "Tahmini teslimat: 2–4 iş günü içinde kapında",
    noteLine: POLICY_LINE,
  };
}
