"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ZELULA_REFERRAL_COOKIE, ZELULA_REFERRAL_TTL_SECONDS } from "@/lib/referral/constants";

const REF_STORAGE_KEY = "zelula_ref";

function isValidRef(code: string | null) {
  if (!code) return false;
  return /^[a-z0-9_-]{4,32}$/.test(code);
}

export function ReferralTrackingBridge() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const fromQuery = searchParams.get("ref")?.trim().toLowerCase() ?? null;
    const rawStored = localStorage.getItem(REF_STORAGE_KEY);
    let storedCode: string | null = null;
    if (rawStored) {
      try {
        const parsed = JSON.parse(rawStored) as { code?: string; expiresAt?: number };
        if (parsed.expiresAt && parsed.expiresAt > Date.now() && isValidRef(parsed.code ?? null)) {
          storedCode = parsed.code ?? null;
        } else {
          localStorage.removeItem(REF_STORAGE_KEY);
        }
      } catch {
        if (isValidRef(rawStored)) storedCode = rawStored;
      }
    }
    const code = isValidRef(fromQuery) ? fromQuery : storedCode;
    if (!code) return;

    localStorage.setItem(
      REF_STORAGE_KEY,
      JSON.stringify({
        code,
        expiresAt: Date.now() + ZELULA_REFERRAL_TTL_SECONDS * 1000,
      }),
    );
    document.cookie = `${ZELULA_REFERRAL_COOKIE}=${encodeURIComponent(code)}; max-age=${ZELULA_REFERRAL_TTL_SECONDS}; path=/; samesite=lax`;
  }, [searchParams]);

  return null;
}
