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

loadEnv();

const cid = process.argv[2];
if (!cid) {
  console.error("Usage: node scripts/query-analytics-client-id.mjs <client_id>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await admin
  .from("analytics_events")
  .select("event_name, page_path, occurred_at")
  .eq("client_id", cid)
  .order("occurred_at", { ascending: false });

if (error) {
  console.error(error);
  process.exit(1);
}

console.log("client_id:", cid);
console.log("TOTAL:", data.length);

const byEvent = {};
const byPage = {};
for (const r of data) {
  byEvent[r.event_name] = (byEvent[r.event_name] ?? 0) + 1;
  const p = r.page_path ?? "(null)";
  byPage[p] = (byPage[p] ?? 0) + 1;
}

console.log("\nBy event:");
for (const [k, v] of Object.entries(byEvent).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}

console.log("\nBy page:");
for (const [k, v] of Object.entries(byPage).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}
