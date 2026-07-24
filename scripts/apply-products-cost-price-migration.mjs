/**
 * products.cost_price migration — Supabase SQL Editor'da çalıştırın veya:
 *   node scripts/apply-products-cost-price-migration.mjs
 *
 * .env.local içinde DATABASE_URL (postgres connection string) varsa otomatik uygular.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION = path.join(
  ROOT,
  "supabase/migrations/20260724170000_products_cost_price.sql",
);

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

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const sql = fs.readFileSync(MIGRATION, "utf8");
const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? "";

if (!databaseUrl) {
  console.log("DATABASE_URL tanımlı değil. Aşağıdaki SQL'i Supabase Dashboard → SQL Editor'da çalıştırın:\n");
  console.log(sql);
  process.exit(0);
}

if (!databaseUrl) {
  console.log("DATABASE_URL tanımlı değil. Aşağıdaki SQL'i Supabase Dashboard → SQL Editor'da çalıştırın:\n");
  console.log(sql);
  process.exit(0);
}

try {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log("✓ Migration uygulandı: products.cost_price");
  } finally {
    await client.end();
  }
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Cannot find package 'pg'")) {
    console.log("pg paketi yüklü değil. SQL'i Supabase Dashboard → SQL Editor'da çalıştırın:\n");
    console.log(sql);
    process.exit(0);
  }
  throw err;
}
