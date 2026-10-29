/**
 * Loader-level admin exclusion regression (GA / Clarity / Meta source guards).
 * Usage: node scripts/verify-analytics-loader-exclusion.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";

function isAnalyticsExcludedPath(raw) {
  const pathname = (String(raw).split("?")[0] ?? "").trim() || "/";
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Mirrors loader allow decision after session exclude resolves. */
function shouldAllowGaAdsLoader({ pathname, sessionExclude, hasScriptId }) {
  if (!hasScriptId) return false;
  if (isAnalyticsExcludedPath(pathname)) return false;
  if (sessionExclude) return false;
  return true;
}

function shouldAllowClarityLoader({ pathname, sessionExclude, hasProjectId, analyticsConsent }) {
  if (!hasProjectId) return false;
  if (isAnalyticsExcludedPath(pathname)) return false;
  if (sessionExclude) return false;
  return analyticsConsent === true;
}

function shouldAllowMetaLoader({ pathname, sessionExclude, hasPixelId, marketingConsent }) {
  if (!hasPixelId) return false;
  if (isAnalyticsExcludedPath(pathname)) return false;
  if (sessionExclude) return false;
  return marketingConsent === true;
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

for (const p of ["/admin", "/admin/", "/admin/orders", "/admin/products/x"]) {
  assert(isAnalyticsExcludedPath(p), `path exclude ${p}`);
}
for (const p of ["/", "/urunler", "/urunler/foo", "/adminx", "/hesabim"]) {
  assert(!isAnalyticsExcludedPath(p), `path allow ${p}`);
}
console.log("PASS: isAnalyticsExcludedPath");

assert(
  !shouldAllowGaAdsLoader({ pathname: "/admin", sessionExclude: false, hasScriptId: true }),
  "GA blocked on /admin even if sessionExclude false",
);
assert(
  !shouldAllowGaAdsLoader({ pathname: "/admin/orders", sessionExclude: false, hasScriptId: true }),
  "GA blocked on /admin/*",
);
assert(
  !shouldAllowGaAdsLoader({ pathname: "/", sessionExclude: true, hasScriptId: true }),
  "GA blocked for authenticated admin on storefront",
);
assert(
  shouldAllowGaAdsLoader({ pathname: "/", sessionExclude: false, hasScriptId: true }),
  "GA allowed for normal storefront",
);
assert(
  shouldAllowGaAdsLoader({ pathname: "/urunler/x", sessionExclude: false, hasScriptId: true }),
  "GA allowed PDP (Consent Mode: consent not required for script allow)",
);
console.log("PASS: GA/Ads loader matrix");

assert(
  !shouldAllowClarityLoader({
    pathname: "/admin",
    sessionExclude: false,
    hasProjectId: true,
    analyticsConsent: true,
  }),
  "Clarity blocked on /admin even with consent",
);
assert(
  !shouldAllowClarityLoader({
    pathname: "/",
    sessionExclude: true,
    hasProjectId: true,
    analyticsConsent: true,
  }),
  "Clarity blocked for admin session on storefront",
);
assert(
  !shouldAllowClarityLoader({
    pathname: "/",
    sessionExclude: false,
    hasProjectId: true,
    analyticsConsent: false,
  }),
  "Clarity still requires analytics consent",
);
assert(
  shouldAllowClarityLoader({
    pathname: "/",
    sessionExclude: false,
    hasProjectId: true,
    analyticsConsent: true,
  }),
  "Clarity allowed normal+consent",
);
console.log("PASS: Clarity loader matrix");

assert(
  !shouldAllowMetaLoader({
    pathname: "/admin",
    sessionExclude: false,
    hasPixelId: true,
    marketingConsent: true,
  }),
  "Meta blocked on /admin",
);
assert(
  !shouldAllowMetaLoader({
    pathname: "/",
    sessionExclude: true,
    hasPixelId: true,
    marketingConsent: true,
  }),
  "Meta blocked admin session storefront",
);
assert(
  shouldAllowMetaLoader({
    pathname: "/",
    sessionExclude: false,
    hasPixelId: true,
    marketingConsent: true,
  }),
  "Meta allowed normal+marketing",
);
console.log("PASS: Meta loader matrix (regression)");

const root = process.cwd();
const gaSrc = readFileSync(path.join(root, "src/components/analytics/GoogleAnalyticsLoader.tsx"), "utf8");
const claritySrc = readFileSync(
  path.join(root, "src/components/analytics/MicrosoftClarityLoader.tsx"),
  "utf8",
);
const metaSrc = readFileSync(path.join(root, "src/components/analytics/MetaPixelLoader.tsx"), "utf8");

assert(gaSrc.includes("isAnalyticsExcludedPath"), "GA uses path guard");
assert(gaSrc.includes("shouldExcludeStorefrontAnalytics"), "GA uses session guard");
assert(gaSrc.includes("adminPath || !allow"), "GA sync render gate");
assert(gaSrc.includes("if (!allow || adminPath) return"), "GA config effect gated");

assert(claritySrc.includes("isAnalyticsExcludedPath"), "Clarity uses path guard");
assert(claritySrc.includes("shouldExcludeStorefrontAnalytics"), "Clarity uses session guard");
assert(claritySrc.includes("adminPath || !allow"), "Clarity sync render gate");

assert(metaSrc.includes("isAnalyticsExcludedPath"), "Meta still has path guard");
assert(metaSrc.includes("shouldExcludeStorefrontAnalytics"), "Meta still has session guard");
console.log("PASS: source guards present");

console.log("\nAll loader exclusion checks passed.");
