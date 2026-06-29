/** Storefront analytics only — admin panel traffic must not inflate visitor metrics. */
export function isAnalyticsExcludedPath(path: string): boolean {
  const pathname = (path.split("?")[0] ?? "").trim() || "/";
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
