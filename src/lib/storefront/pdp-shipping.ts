/** PDP kargo vaadi — İstanbul saati; kesim 13:00, hafta sonu + resmi tatil atlanır. */

import {
  BAYRAM_POLICY_LINE,
  formatBayramShippingBanner,
  isBayramShippingPause,
} from "@/lib/storefront/bayram-shipping-notice";
import { getIstanbulYmd, isOfficialHolidayTr } from "@/lib/storefront/official-holidays-tr";

const ISTANBUL = "Europe/Istanbul";
const CUTOFF_HOUR = 13;
const CUTOFF_MINUTE = 0;

const TR_WEEKDAY = ["pazar", "pazartesi", "salı", "çarşamba", "perşembe", "cuma", "cumartesi"] as const;

export const SHIPPING_POLICY_LINE =
  "Saat 13:00'a kadar verilen siparişler aynı gün kargoya verilir. Cumartesi ve pazar verilen siparişler pazartesi kargoya teslim edilir.";

/** SSR / ilk boyama — canlı geri sayım yok (hydration uyumu). */
export const SHIPPING_BANNER_SSR_NEUTRAL =
  "13:00'a kadar verilen siparişler aynı gün kargoda";

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

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function weekdayFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

function isBusinessYmd(ymd: string): boolean {
  const wd = weekdayFromYmd(ymd);
  return wd >= 1 && wd <= 5 && !isOfficialHolidayTr(ymd);
}

/** Her PDP’de gösterilecek geri sayım (13:00 kesimine veya sonraki iş günü 13:00’e). */
export function getShippingCountdownState(now = new Date()): ShippingCountdownState {
  const { hour, minute } = istanbulDateParts(now);
  const ymd = getIstanbulYmd(now);
  const nowMins = hour * 60 + minute;
  const cutoffMins = CUTOFF_HOUR * 60 + CUTOFF_MINUTE;

  if (isBusinessYmd(ymd) && nowMins < cutoffMins) {
    const total = cutoffMins - nowMins;
    return {
      hours: Math.floor(total / 60),
      minutes: total % 60,
      tail: "içinde sipariş verirsen bugün DHL Kargo'ya teslim edilir.",
      urgency: "same-day",
    };
  }

  let nextYmd = addDaysYmd(ymd, 1);
  let daysAhead = 1;
  while (!isBusinessYmd(nextYmd) && daysAhead < 21) {
    nextYmd = addDaysYmd(nextYmd, 1);
    daysAhead += 1;
  }

  const minsToMidnight = 24 * 60 - nowMins;
  const extraFullDays = daysAhead - 1;
  const total = minsToMidnight + extraFullDays * 24 * 60 + cutoffMins;

  const tomorrowYmd = addDaysYmd(ymd, 1);
  const dayLabel = nextYmd === tomorrowYmd ? "yarın" : TR_WEEKDAY[weekdayFromYmd(nextYmd)];
  const tail = `içinde sipariş verirsen ${dayLabel} DHL Kargo'ya teslim edilir.`;

  return {
    hours: Math.floor(total / 60),
    minutes: total % 60,
    tail,
    urgency: "next-window",
  };
}

/** Geri sayım şeridi / duyuru metni — “13:00'e kadar verilen siparişler … kargoda”. */
export function formatShippingCountdownBanner(state: ShippingCountdownState, now = new Date()): string {
  const bayram = formatBayramShippingBanner(now);
  if (bayram) return bayram;

  if (state.urgency === "same-day") {
    const timeLabel =
      state.hours > 0 ? `${state.hours} sa ${state.minutes} dk` : `${state.minutes} dk`;
    return `13:00'e kadar verilen siparişler aynı gün kargoda · ${timeLabel} kaldı`;
  }

  /**
   * Sonraki pencere (kesimden sonra / hafta sonu / tatil): kalan süre 13–72 saat olabilir;
   * büyük bir "X sa kaldı" sayacı korkutucu ve gereksiz. Sadece sevk gününü göster.
   */
  const match = state.tail.match(
    /sipariş verirsen (yarın|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)/,
  );
  const dispatchDay = match?.[1] ?? "yarın";
  return `Şimdi verilen siparişler ${dispatchDay} kargoda`;
}

/** Mağaza vitrininde gösterilecek kargo özeti. */
export function buildPdpShippingPromise(now = new Date()): PdpShippingPromise {
  const bayram = isBayramShippingPause(now);
  return {
    carrierLabel: "DHL Kargo",
    deliveryLine: bayram
      ? "Siparişiniz 1 Haziran Pazartesi kargoya verilir · teslimat 2–4 iş günü"
      : "Tahmini teslimat: 2–4 iş günü içinde kapında",
    policyLine: bayram ? BAYRAM_POLICY_LINE : SHIPPING_POLICY_LINE,
  };
}
