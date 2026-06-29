import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}

function isAnalyticsExcludedPath(path) {
  const pathname = (path.split("?")[0] ?? "").trim() || "/";
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function normalizePagePath(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const pathname = trimmed.startsWith("/")
    ? trimmed.split("?")[0]
    : new URL(trimmed, "https://example.com").pathname;
  return pathname.slice(0, 512);
}

async function trackLikeRoute(admin, payload) {
  const pagePath = normalizePagePath(payload.page_path);
  if (pagePath && isAnalyticsExcludedPath(pagePath)) {
    return { skipped: true };
  }
  const { error } = await admin.from("analytics_events").insert({
    event_name: payload.event_name,
    occurred_at: payload.occurred_at ?? new Date().toISOString(),
    page_path: pagePath,
    client_id: payload.client_id ?? null,
    ecommerce: payload.ecommerce ?? null,
    meta: payload.meta ?? null,
  });
  if (error) throw error;
  return { skipped: false };
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function countAdminEventsSince(sinceIso) {
  const { count, error } = await admin
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .gte("occurred_at", sinceIso)
    .like("page_path", "/admin%");
  if (error) throw error;
  return count ?? 0;
}

for (const p of ["/admin", "/admin/orders", "/admin/products/1"]) {
  if (!isAnalyticsExcludedPath(p)) {
    console.error("FAIL path helper:", p);
    process.exit(1);
  }
}
console.log("PASS: isAnalyticsExcludedPath");

const marker = new Date().toISOString();
const before = await countAdminEventsSince(marker);

for (const page_path of ["/admin", "/admin/orders", "/admin/products"]) {
  const result = await trackLikeRoute(admin, {
    event_name: "page_view",
    page_path,
    client_id: "cid_verify_admin_skip",
    occurred_at: new Date().toISOString(),
  });
  console.log("track", page_path, "->", result.skipped ? "skipped" : "inserted");
  if (!result.skipped) {
    console.error("FAIL: expected skip for", page_path);
    process.exit(1);
  }
}

const store = await trackLikeRoute(admin, {
  event_name: "page_view",
  page_path: "/verify-analytics-guard-test",
  client_id: "cid_verify_storefront",
  occurred_at: new Date().toISOString(),
});
if (store.skipped) {
  console.error("FAIL: storefront path should not be skipped");
  process.exit(1);
}
console.log("track /verify-analytics-guard-test -> inserted");

const after = await countAdminEventsSince(marker);
console.log("Admin events since marker:", before, "->", after);

if (after > before) {
  console.error("FAIL: admin-path rows were inserted");
  process.exit(1);
}

console.log("PASS: /admin/* tracking excluded from analytics_events");
