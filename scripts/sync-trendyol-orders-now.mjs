/**
 * Trendyol siparişlerini hemen çeker ve site stoğunu günceller.
 *   node scripts/sync-trendyol-orders-now.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

// Register ts paths via Next's compiled output is heavy; use ts-node alternative:
// Run sync via dynamic import of transpiled modules — use `next` experimental or duplicate minimal path.

// Use jiti-free approach: spawn `node --import` won't work. Call via `npx tsx` if available.
import { spawnSync } from "node:child_process";

const tsxBin = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
const runner = fs.existsSync(tsxBin) ? "node" : null;

const inline = `
import { createClient } from "@supabase/supabase-js";
import { syncTrendyolInboundOrders } from "./src/lib/marketplaces/trendyol/daily-stock-reconcile.ts";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const result = await syncTrendyolInboundOrders(admin, { orderLookbackDays: 2 });
console.log(JSON.stringify(result, null, 2));
`;

const tmp = path.join(process.cwd(), "scripts", ".tmp-sync-orders-run.mjs");
fs.writeFileSync(
  tmp,
  `import { createClient } from "@supabase/supabase-js";
import { syncTrendyolInboundOrders } from "../src/lib/marketplaces/trendyol/daily-stock-reconcile.ts";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const result = await syncTrendyolInboundOrders(admin, { orderLookbackDays: 2 });
console.log(JSON.stringify(result, null, 2));
`,
);

// Try tsx from npx
const r = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", tmp],
  { cwd: process.cwd(), env: process.env, encoding: "utf8", shell: true },
);

console.log(r.stdout || "");
if (r.stderr) console.error(r.stderr);
process.exit(r.status ?? 1);
