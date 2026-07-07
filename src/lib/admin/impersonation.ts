export const IMPERSONATION_COOKIE = "zelula_impersonation";

export type ImpersonationCookie = {
  adminEmail: string;
  targetUserId: string;
  targetName: string;
  startedAt: string;
};

export function parseImpersonationCookie(raw: string | undefined): ImpersonationCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ImpersonationCookie;
    if (!parsed?.targetUserId || !parsed?.targetName) return null;
    return parsed;
  } catch {
    return null;
  }
}

const IMPERSONATION_COOKIE_CLEAR = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 0,
};

/** Admin «Hesaba gir» çerezi ile aktif oturum uyuşmuyorsa çerezi temizler (eski müşteri adı bandı kalmasın). */
export async function resolveImpersonationState(
  cookieRaw: string | undefined,
  sessionUserId: string | null | undefined,
): Promise<{ impersonation: ImpersonationCookie | null; sessionActive: boolean }> {
  const impersonation = parseImpersonationCookie(cookieRaw);
  if (!impersonation) return { impersonation: null, sessionActive: false };

  const sessionActive = Boolean(sessionUserId && sessionUserId === impersonation.targetUserId);
  if (sessionActive) return { impersonation, sessionActive: true };

  const { cookies } = await import("next/headers");
  const store = await cookies();
  store.set(IMPERSONATION_COOKIE, "", IMPERSONATION_COOKIE_CLEAR);
  return { impersonation: null, sessionActive: false };
}
