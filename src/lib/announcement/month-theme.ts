export type AnnouncementMonthTheme = {
  /** 0 = Ocak … 11 = Aralık (Europe/Istanbul) */
  monthIndex: number;
  monthName: string;
  background: string;
  text: string;
  accent: string;
};

const MONTH_NAMES_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

/** Zelula markasına uyumlu, mevsimsel ay paletleri. */
const MONTH_THEMES: AnnouncementMonthTheme[] = [
  {
    monthIndex: 0,
    monthName: "Ocak",
    background: "linear-gradient(180deg, #f4f6f8 0%, #e3e8ee 100%)",
    text: "#3d4f63",
    accent: "#8fa3b8",
  },
  {
    monthIndex: 1,
    monthName: "Şubat",
    background: "linear-gradient(180deg, #faf0f2 0%, #f0dde3 100%)",
    text: "#7a3f52",
    accent: "#c97b8f",
  },
  {
    monthIndex: 2,
    monthName: "Mart",
    background: "linear-gradient(180deg, #f2f8f0 0%, #dce9d6 100%)",
    text: "#3f5c42",
    accent: "#7faa72",
  },
  {
    monthIndex: 3,
    monthName: "Nisan",
    background: "linear-gradient(180deg, #f7f2fa 0%, #e8ddf0 100%)",
    text: "#5a4570",
    accent: "#9a7ab8",
  },
  {
    monthIndex: 4,
    monthName: "Mayıs",
    background: "linear-gradient(180deg, #f5f9ed 0%, #e2efd0 100%)",
    text: "#4a5f34",
    accent: "#8fad5c",
  },
  {
    monthIndex: 5,
    monthName: "Haziran",
    background: "linear-gradient(180deg, #fff8ec 0%, #f5e6c8 100%)",
    text: "#7a5a28",
    accent: "#c9a06e",
  },
  {
    monthIndex: 6,
    monthName: "Temmuz",
    background: "linear-gradient(180deg, #eef8f8 0%, #d7ecec 100%)",
    text: "#0f5c5f",
    accent: "#2aa4a9",
  },
  {
    monthIndex: 7,
    monthName: "Ağustos",
    background: "linear-gradient(180deg, #fff4eb 0%, #f8dcc8 100%)",
    text: "#8f4a2a",
    accent: "#e07a5f",
  },
  {
    monthIndex: 8,
    monthName: "Eylül",
    background: "linear-gradient(180deg, #faf5eb 0%, #eddcc0 100%)",
    text: "#6b4e2a",
    accent: "#b8894a",
  },
  {
    monthIndex: 9,
    monthName: "Ekim",
    background: "linear-gradient(180deg, #f9f0e8 0%, #ecd4be 100%)",
    text: "#7a3f24",
    accent: "#c4683f",
  },
  {
    monthIndex: 10,
    monthName: "Kasım",
    background: "linear-gradient(180deg, #f6f0f4 0%, #e5d5df 100%)",
    text: "#5c3a4d",
    accent: "#9a6b84",
  },
  {
    monthIndex: 11,
    monthName: "Aralık",
    background: "linear-gradient(180deg, #f0f5f2 0%, #d9e8df 100%)",
    text: "#2f4f3f",
    accent: "#5f8a72",
  },
];

export function getIstanbulMonthIndex(date = new Date()): number {
  const monthPart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    month: "numeric",
  })
    .formatToParts(date)
    .find((p) => p.type === "month")?.value;

  const month = Number(monthPart ?? 1);
  return Math.min(11, Math.max(0, month - 1));
}

export function getAnnouncementMonthTheme(date = new Date()): AnnouncementMonthTheme {
  const monthIndex = getIstanbulMonthIndex(date);
  return MONTH_THEMES[monthIndex] ?? MONTH_THEMES[0]!;
}

export function getAnnouncementMonthNameTr(monthIndex: number): string {
  return MONTH_NAMES_TR[monthIndex] ?? MONTH_NAMES_TR[0];
}
