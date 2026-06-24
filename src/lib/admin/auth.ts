export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) return false;
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) return false;
  return adminEmails.includes(normalized);
}

/** Diğer admin sayfalarıyla aynı kural: whitelist yoksa giriş yapmış herkes; varsa listedekiler. */
export function canAccessAdminPanel(email: string | null | undefined): boolean {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) return Boolean(String(email ?? "").trim());
  return isAdminEmail(email);
}
