/** PDP kargo vaadi — İstanbul saati; kesim 13:00, hafta sonu pazartesi. */
const ISTANBUL = "Europe/Istanbul";
const CUTOFF_HOUR = 13;
const CUTOFF_MINUTE = 0;

export const SHIPPING_POLICY_LINE =
  "Saat 13:00'a kadar verilen siparişler aynı gün kargoya verilir. Cumartesi ve pazar verilen siparişler pazartesi kargoya teslim edilir.";

export type PdpShippingPromise = {
  /** Yalnızca 13:00 öncesi geri sayım için yeşil şerit */
  showGreenBanner: boolean;
  cutoffCountdown: { hours: number; minutes: number } | null;
  greenTail: string;
  /** Bu sipariş için kısa not (genel kuraldan farklı); yeşil şerit yokken gösterilir */
  dispatchHint: string | null;
  carrierLabel: string;
  deliveryLine: string;
  policyLine: string;
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

  const beforeCutoff = untilCutoff != null && untilCutoff > 0;

  return {
    showGreenBanner: beforeCutoff,
    cutoffCountdown: beforeCutoff
      ? { hours: Math.floor(untilCutoff / 60), minutes: untilCutoff % 60 }
      : null,
    greenTail: "içinde sipariş verirsen bugün DHL Kargo'ya teslim edilir.",
    dispatchHint:
      !beforeCutoff && isWeekday(weekday)
        ? `Bu sipariş en geç ${dispatch} DHL Kargo'ya teslim edilir.`
        : null,
    carrierLabel: "DHL Kargo",
    deliveryLine: "Tahmini teslimat: 2–4 iş günü içinde kapında",
    policyLine: SHIPPING_POLICY_LINE,
  };
}
