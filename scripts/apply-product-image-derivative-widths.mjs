/**
 * product_images.derivative_widths
 *   node scripts/apply-product-image-derivative-widths.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION = path.join(ROOT, "supabase/migrations/20261009140000_product_image_derivative_widths.sql");

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
  console.log("DATABASE_URL yok. SQL'i Supabase Dashboard → SQL Editor'da çalıştırın:\n");
  console.log(sql);
  process.exit(0);
}

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log("Migration uygulandı: product_images.derivative_widths");
} finally {
  await client.end();
}
