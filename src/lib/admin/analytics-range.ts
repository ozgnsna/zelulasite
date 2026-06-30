export type AnalyticsRangeKey = "today" | "week" | "month" | "custom";

export type ResolvedAnalyticsRange = {
  key: AnalyticsRangeKey;
  start: Date;
  end: Date;
  compareStart: Date;
  compareEnd: Date;
  periodLabel: string;
  compareLabel: string;
};

function istanbulYmd(d = new Date()): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
}

function dayRangeFromYmd(ymd: string): { start: Date; end: Date } {
  return {
    start: new Date(`${ymd}T00:00:00+03:00`),
    end: new Date(`${ymd}T23:59:59.999+03:00`),
  };
}

function parseYmd(s: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00+03:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
}

/** Monday-start week in Europe/Istanbul. */
function mondayOfWeekYmd(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00+03:00`);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
}

function firstOfMonthYmd(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function formatTrYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${Number(d)} ${["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"][Number(m) - 1]} ${y}`;
}

export function resolveAnalyticsRange(params: {
  analyticsRange?: string;
  analyticsFrom?: string;
  analyticsTo?: string;
}): ResolvedAnalyticsRange {
  const rawKey = String(params.analyticsRange ?? "").trim().toLowerCase();
  const key: AnalyticsRangeKey =
    rawKey === "today" || rawKey === "week" || rawKey === "month" || rawKey === "custom" ? rawKey : "month";

  const todayYmd = istanbulYmd();
  let startYmd: string;
  let endYmd: string;
  let periodLabel: string;
  let compareLabel: string;

  if (key === "week") {
    startYmd = mondayOfWeekYmd(todayYmd);
    endYmd = todayYmd;
    periodLabel = "Bu hafta";
    compareLabel = "önceki dönem";
  } else if (key === "month") {
    startYmd = firstOfMonthYmd(todayYmd);
    endYmd = todayYmd;
    periodLabel = "Bu ay";
    compareLabel = "önceki dönem";
  } else if (key === "custom") {
    const from = parseYmd(String(params.analyticsFrom ?? "")) ?? todayYmd;
    const to = parseYmd(String(params.analyticsTo ?? "")) ?? todayYmd;
    startYmd = from <= to ? from : to;
    endYmd = from <= to ? to : from;
    periodLabel =
      startYmd === endYmd ? formatTrYmd(startYmd) : `${formatTrYmd(startYmd)} – ${formatTrYmd(endYmd)}`;
    compareLabel = "önceki dönem";
  } else {
    startYmd = todayYmd;
    endYmd = todayYmd;
    periodLabel = "Bugün";
    compareLabel = "dün";
  }

  const rangeStart = dayRangeFromYmd(startYmd).start;
  const rangeEnd = dayRangeFromYmd(endYmd).end;

  if (key === "today") {
    const yesterdayYmd = addDaysYmd(todayYmd, -1);
    const yRange = dayRangeFromYmd(yesterdayYmd);
    return {
      key,
      start: rangeStart,
      end: rangeEnd,
      compareStart: yRange.start,
      compareEnd: yRange.end,
      periodLabel,
      compareLabel,
    };
  }

  const durationMs = rangeEnd.getTime() - rangeStart.getTime();
  const compareEnd = new Date(rangeStart.getTime() - 1);
  const compareStart = new Date(compareEnd.getTime() - durationMs);

  return {
    key,
    start: rangeStart,
    end: rangeEnd,
    compareStart,
    compareEnd,
    periodLabel,
    compareLabel,
  };
}

export function buildAnalyticsFilterHref(
  key: AnalyticsRangeKey,
  options?: { from?: string; to?: string; hash?: string },
): string {
  const params = new URLSearchParams();
  params.set("analyticsRange", key);
  if (key === "custom") {
    if (options?.from) params.set("analyticsFrom", options.from);
    if (options?.to) params.set("analyticsTo", options.to);
  }
  const hash = options?.hash ?? "analytics-detail";
  return `/admin?${params.toString()}#${hash}`;
}
