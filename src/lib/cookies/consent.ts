export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export const COOKIE_CONSENT_STORAGE_KEY = "zelula_cookie_consent";

/** Footer / diğer bileşenlerden çerez ayarı modali açmak için */
export const OPEN_COOKIE_SETTINGS_EVENT = "zelula-open-cookie-settings";

/** Çerez tercihi güncellendiğinde (aynı sekme) */
export const CONSENT_UPDATED_EVENT = "zelula-consent-updated";

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<CookieConsent>;
    if (o.necessary !== true) return null;
    if (typeof o.analytics !== "boolean" || typeof o.marketing !== "boolean") return null;
    if (typeof o.updatedAt !== "string" || !o.updatedAt.trim()) return null;
    return {
      necessary: true,
      analytics: o.analytics,
      marketing: o.marketing,
      updatedAt: o.updatedAt,
    };
  } catch {
    return null;
  }
}

export function setCookieConsent(consent: CookieConsent): void {
  if (typeof window === "undefined") return;
  const payload: CookieConsent = {
    necessary: true,
    analytics: consent.analytics,
    marketing: consent.marketing,
    updatedAt: consent.updatedAt.trim() || new Date().toISOString(),
  };
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(CONSENT_UPDATED_EVENT, { detail: payload }));
}

export function hasConsent(): boolean {
  return getCookieConsent() !== null;
}

export function openCookieSettingsFromUi(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}
