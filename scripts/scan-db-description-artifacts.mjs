/**
 * Mevcut DB açıklamalarında bilinen üretim/birleştirme hatalarını tarar (salt okunur).
 *
 * node scripts/scan-db-description-artifacts.mjs
 * INCLUDE_INACTIVE=YES node scripts/scan-db-description-artifacts.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { findQualityIssues, FORBIDDEN_PATTERNS } from "./test-product-description-quality.mjs";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(projectRoot, ".env"));

const includeInactive = process.env.INCLUDE_INACTIVE === "YES";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

async function fetchProducts(admin) {
  const pageSize = 1000;
  const all = [];
  for (let from = 0; ; from += pageSize) {
    let q = admin
      .from("products")
      .select("id,name,slug,sku,short_description,full_description,product_kind,is_active")
      .order("name", { ascending: true })
      .range(from, from + pageSize - 1);
    if (!includeInactive) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) throw error;
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all.filter((p) => p.product_kind !== "gift_card");
}

function scanField(text, field) {
  const issues = findQualityIssues(text);
  const hard = issues.filter((x) => x.type !== "suspicious-double");
  const soft = issues.filter((x) => x.type === "suspicious-double");
  return { field, issues, hard, soft };
}

const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
const products = await fetchProducts(admin);

const affectedRows = new Map();
const patternCounts = Object.fromEntries(FORBIDDEN_PATTERNS.map((p) => [p.id, 0]));
let suspiciousDoubleRows = 0;

for (const product of products) {
  const fields = [
    scanField(product.short_description, "short_description"),
    scanField(product.full_description, "full_description"),
  ];

  const rowHard = [];
  const rowSoft = [];
  for (const f of fields) {
    for (const issue of f.hard) {
      patternCounts[issue.type] = (patternCounts[issue.type] ?? 0) + 1;
      rowHard.push({ ...issue, field: f.field });
    }
    for (const issue of f.soft) {
      rowSoft.push({ ...issue, field: f.field });
    }
  }

  if (rowHard.length > 0 || rowSoft.length > 0) {
    affectedRows.set(product.id, {
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      is_active: product.is_active,
      hard: rowHard,
      soft: rowSoft,
    });
    if (rowSoft.length > 0) suspiciousDoubleRows += 1;
  }
}

const hardOnlyRows = [...affectedRows.values()].filter((r) => r.hard.length > 0);
const hardRowCount = hardOnlyRows.length;
const anyIssueRowCount = affectedRows.size;

console.log("=== DB açıklama taraması (salt okunur) ===");
console.log(`Filtre: is_active = ${includeInactive ? "tümü" : "true"}`);
console.log(`Taranan ürün (gift_card hariç): ${products.length}`);
console.log(`Kesin hata deseni içeren satır: ${hardRowCount}`);
console.log(`Kesin + şüpheli çift harf (herhangi): ${anyIssueRowCount}`);
if (suspiciousDoubleRows > 0) {
  console.log(`  (yalnızca şüpheli çift harf, kesin hata yok: ${anyIssueRowCount - hardRowCount})`);
}

const patternHits = Object.entries(patternCounts).filter(([, n]) => n > 0);
if (patternHits.length > 0) {
  console.log("\nDesen bazında eşleşme (alan başına; bir üründe birden fazla olabilir):");
  for (const [id, n] of patternHits.sort((a, b) => b[1] - a[1])) {
    console.log(`  ${id}: ${n}`);
  }
}

if (hardRowCount > 0) {
  console.log("\nÖrnek etkilenen ürünler (ilk 25, kesin hatalar):");
  for (const row of hardOnlyRows.slice(0, 25)) {
    console.log(`\n--- ${row.slug} | ${row.name}${row.is_active ? "" : " [pasif]"}`);
    for (const issue of row.hard.slice(0, 5)) {
      console.log(
        `  [${issue.type}] ${issue.field} L${issue.line}${issue.match ? ` "${issue.match}"` : ""}: ${issue.excerpt}`,
      );
    }
  }
  process.exit(1);
}

console.log("\nKesin hata deseni bulunamadı.");
process.exit(0);
