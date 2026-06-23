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
