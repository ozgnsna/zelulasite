/** PDP kargo vaadi — İstanbul saati; kesim 13:00, hafta sonu pazartesi. */

const ISTANBUL = "Europe/Istanbul";
const CUTOFF_HOUR = 13;
const CUTOFF_MINUTE = 0;

export const SHIPPING_POLICY_LINE =
  "Saat 13:00'a kadar verilen siparişler aynı gün kargoya verilir. Cumartesi ve pazar verilen siparişler pazartesi kargoya teslim edilir.";

export type ShippingCountdownUrgency = "same-day" | "next-window";

export type ShippingCountdownState = {
  hours: number;
  minutes: number;
  tail: string;
  urgency: ShippingCountdownUrgency;
};

export type PdpShippingPromise = {
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

/** Her PDP’de gösterilecek geri sayım (13:00 kesimine veya sonraki iş günü 13:00’e). */
export function getShippingCountdownState(now = new Date()): ShippingCountdownState {
  const { weekday, hour, minute } = istanbulDateParts(now);
  const nowMins = hour * 60 + minute;
  const cutoffMins = CUTOFF_HOUR * 60 + CUTOFF_MINUTE;

  if (isWeekday(weekday) && nowMins < cutoffMins) {
    const total = cutoffMins - nowMins;
    return {
      hours: Math.floor(total / 60),
      minutes: total % 60,
      tail: "içinde sipariş verirsen bugün DHL Kargo'ya teslim edilir.",
      urgency: "same-day",
    };
  }

  const minsToMidnight = 24 * 60 - nowMins;
  let extraFullDays = 0;
  let tail = "içinde sipariş verirsen yarın DHL Kargo'ya teslim edilir.";

  if (weekday === 5) {
    extraFullDays = 2;
    tail = "içinde sipariş verirsen pazartesi DHL Kargo'ya teslim edilir.";
  } else if (weekday === 6) {
    extraFullDays = 1;
    tail = "içinde sipariş verirsen pazartesi DHL Kargo'ya teslim edilir.";
  } else if (weekday === 0) {
    extraFullDays = 0;
    tail = "içinde sipariş verirsen pazartesi DHL Kargo'ya teslim edilir.";
  }

  const total = minsToMidnight + extraFullDays * 24 * 60 + cutoffMins;
  return {
    hours: Math.floor(total / 60),
    minutes: total % 60,
    tail,
    urgency: "next-window",
  };
}

/** Geri sayım şeridi / duyuru metni — “13:00'e kadar verilen siparişler … kargoda”. */
export function formatShippingCountdownBanner(state: ShippingCountdownState): string {
  const timeLabel =
    state.hours > 0 ? `${state.hours} sa ${state.minutes} dk` : `${state.minutes} dk`;

  if (state.urgency === "same-day") {
    return `13:00'e kadar verilen siparişler aynı gün kargoda · ${timeLabel} kaldı`;
  }

  const dispatchDay = state.tail.includes("pazartesi") ? "pazartesi" : "yarın";
  return `13:00'e kadar verilen siparişler ${dispatchDay} kargoda · ${timeLabel} kaldı`;
}

/** Mağaza vitrininde gösterilecek kargo özeti. */
export function buildPdpShippingPromise(): PdpShippingPromise {
  return {
    carrierLabel: "DHL Kargo",
    deliveryLine: "Tahmini teslimat: 2–4 iş günü içinde kapında",
    policyLine: SHIPPING_POLICY_LINE,
  };
}
