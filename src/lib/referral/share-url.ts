/** Append ?ref= or &ref= without duplicating ref param. */
export function withReferralQuery(url: string, refCode: string) {
  if (!refCode) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("ref", refCode);
    return u.toString();
  } catch {
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}ref=${encodeURIComponent(refCode)}`;
  }
}

export function siteBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
