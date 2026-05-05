const FALLBACK = "/";

/**
 * Returns a safe same-origin path for post-login redirects.
 * Rejects open redirects (//, http:, encoded tricks, backslashes, control chars).
 */
export function getSafeReturnPath(raw: string | null | undefined): string {
  if (raw == null) return FALLBACK;
  let s = typeof raw === "string" ? raw.trim() : FALLBACK;
  if (!s) return FALLBACK;

  try {
    s = decodeURIComponent(s);
  } catch {
    return FALLBACK;
  }

  if (s.length > 2048) return FALLBACK;
  if (/[\u0000-\u001f\u007f]/.test(s)) return FALLBACK;
  if (!s.startsWith("/") || s.startsWith("//")) return FALLBACK;
  if (s.includes("://") || s.includes("\\")) return FALLBACK;

  const noHash = s.split("#")[0] ?? "";
  if (!noHash.startsWith("/")) return FALLBACK;

  try {
    const resolved = new URL(noHash, "https://internal.invalid");
    if (resolved.origin !== "https://internal.invalid") return FALLBACK;
    if (!resolved.pathname.startsWith("/")) return FALLBACK;
    return noHash;
  } catch {
    return FALLBACK;
  }
}
