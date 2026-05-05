"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CONSENT_UPDATED_EVENT,
  getCookieConsent,
  hasConsent,
  OPEN_COOKIE_SETTINGS_EVENT,
  setCookieConsent,
  type CookieConsent,
} from "@/lib/cookies/consent";
import { CookieSettingsModal } from "@/components/CookieSettingsModal";

function nowIso() {
  return new Date().toISOString();
}

export function CookieBanner() {
  const pathname = usePathname() ?? "";
  const isAdmin = pathname.startsWith("/admin");

  const [mounted, setMounted] = useState(false);
  const [consentExists, setConsentExists] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftAnalytics, setDraftAnalytics] = useState(false);
  const [draftMarketing, setDraftMarketing] = useState(false);

  const syncFromStorage = useCallback(() => {
    const c = getCookieConsent();
    setConsentExists(hasConsent());
    if (c) {
      setDraftAnalytics(c.analytics);
      setDraftMarketing(c.marketing);
    } else {
      setDraftAnalytics(false);
      setDraftMarketing(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    const onConsent = () => syncFromStorage();
    const onOpenSettings = () => {
      syncFromStorage();
      setSettingsOpen(true);
    };
    window.addEventListener(CONSENT_UPDATED_EVENT, onConsent);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
    window.addEventListener("storage", onConsent);
    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, onConsent);
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
      window.removeEventListener("storage", onConsent);
    };
  }, [syncFromStorage]);

  const saveConsent = useCallback(
    (analytics: boolean, marketing: boolean) => {
      const next: CookieConsent = {
        necessary: true,
        analytics,
        marketing,
        updatedAt: nowIso(),
      };
      setCookieConsent(next);
      setSettingsOpen(false);
      syncFromStorage();
    },
    [syncFromStorage],
  );

  if (isAdmin) return null;

  if (!mounted) return null;

  const showBar = !consentExists;

  return (
    <>
      {showBar ? (
        <div
          className="zl-cookie-banner-enter pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center p-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] sm:p-3"
          role="region"
          aria-label="Çerez bildirimi"
        >
          <div className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#f8f3ec_100%)] px-3.5 py-3 shadow-[0_-8px_28px_rgba(62,52,38,0.12)] sm:px-5 sm:py-4">
            <h2 className="font-serif text-base text-stone-900 sm:text-lg">Çerez Kullanımı</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-stone-600 sm:text-sm">
              Sitemizde deneyiminizi iyileştirmek ve hizmetlerimizi geliştirmek için çerezler kullanıyoruz.
            </p>
            <div className="mt-3 flex flex-col gap-1.5 sm:mt-4 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                className="min-h-[42px] w-full rounded-full border border-[#d9c9b2] bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50 sm:min-h-[40px] sm:w-auto sm:px-4.5"
                onClick={() => saveConsent(false, false)}
              >
                Sadece Gerekli
              </button>
              <button
                type="button"
                className="min-h-[42px] w-full rounded-full border border-[#c6a15b]/50 bg-[linear-gradient(135deg,#faf4ea,#f0e4d0)] px-4 py-2.5 text-sm font-semibold text-stone-900 shadow-sm transition hover:brightness-[0.98] sm:min-h-[40px] sm:w-auto sm:px-4.5"
                onClick={() => setSettingsOpen(true)}
              >
                Ayarları Yönet
              </button>
              <button
                type="button"
                className="min-h-[42px] w-full rounded-full bg-[linear-gradient(135deg,#2f2a24,#1f1b17)] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 sm:min-h-[40px] sm:min-w-[10rem] sm:flex-1 sm:px-4.5"
                onClick={() => saveConsent(true, true)}
              >
                Tümünü Kabul Et
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CookieSettingsModal
        open={settingsOpen}
        initialAnalytics={draftAnalytics}
        initialMarketing={draftMarketing}
        onClose={() => setSettingsOpen(false)}
        onSave={(next) => saveConsent(next.analytics, next.marketing)}
      />
    </>
  );
}
