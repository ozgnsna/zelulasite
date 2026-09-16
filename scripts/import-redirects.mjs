/**
 * CSV → url_redirects import.
 * Kullanım:
 *   node scripts/import-redirects.mjs redirects.csv           # dry-run
 *   node scripts/import-redirects.mjs redirects.csv --apply   # yazar
 *
 * CSV sütunları: from_path,to_path[,status_code]
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const RESERVED_ROOT = new Set([
  "_next",
  "_vercel",
  "admin",
  "api",
  "apple-icon",
  "auth",
  "bakim-rehberi",
  "cok-satanlar",
  "giris",
  "gizlilik-politikasi",
  "hediye-karti",
  "hesabim",
  "iade-ve-degisim",
  "icon",
  "kargo-iade",
  "kategori",
  "kayit",
  "mesafeli-satis-sozlesmesi",
  "odeme",
  "on-bilgilendirme-formu",
  "sepet",
  "sifre-yenile",
  "sifremi-unuttum",
  "siparis",
  "urunler",
  "erkek",
  "kampanya",
]);

function normalizePath(p) {
  let s = String(p ?? "").trim();
  if (!s) return "";
  if (!s.startsWith("/")) s = `/${s}`;
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase();
  const start = header.includes("from_path") ? 1 : 0;
  const rows = [];
  for (let i = start; i < lines.length; i += 1) {
    const parts = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (parts.length < 2) continue;
    const from_path = normalizePath(parts[0]);
    const to_path = normalizePath(parts[1]);
    const status_code = parts[2] ? Number(parts[2]) : 301;
    rows.push({ from_path, to_path, status_code, line: i + 1 });
  }
  return rows;
}

function isReservedRoute(pathname) {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return true;
  return RESERVED_ROOT.has(segs[0].toLocaleLowerCase("tr-TR"));
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const fileArg = args.find((a) => !a.startsWith("--"));
  if (!fileArg) {
    console.error("Kullanım: node scripts/import-redirects.mjs <file.csv> [--apply]");
    process.exit(1);
  }

  const csvPath = path.resolve(fileArg);
  if (!fs.existsSync(csvPath)) {
    console.error("Dosya yok:", csvPath);
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  console.log(`Satır: ${rows.length} · mod: ${apply ? "APPLY" : "dry-run"}`);

  const byFrom = new Map();
  const warnings = [];

  for (const row of rows) {
    if (![301, 308, 410].includes(row.status_code)) {
      warnings.push(`L${row.line}: geçersiz status_code ${row.status_code}`);
      continue;
    }
    if (!row.from_path.startsWith("/") || !row.to_path.startsWith("/")) {
      warnings.push(`L${row.line}: path / ile başlamalı`);
      continue;
    }
    if (row.from_path === row.to_path) {
      warnings.push(`L${row.line}: from_path === to_path (${row.from_path})`);
      continue;
    }
    if (byFrom.has(row.from_path)) {
      warnings.push(`L${row.line}: conflict from_path ${row.from_path}`);
    }
    byFrom.set(row.from_path, row);
  }

  // Chain / loop detection in CSV set
  for (const [from, row] of byFrom) {
    if (row.status_code === 410) continue;
    const seen = new Set([from]);
    let cur = row.to_path;
    let depth = 0;
    while (byFrom.has(cur) && depth < 8) {
      if (seen.has(cur)) {
        warnings.push(`loop: ${[...seen, cur].join(" → ")}`);
        break;
      }
      seen.add(cur);
      const next = byFrom.get(cur);
      if (!next || next.status_code === 410) break;
      cur = next.to_path;
      depth += 1;
    }
    if (depth >= 5) {
      warnings.push(`uzun zincir (≥5): ${from} → … → ${cur}`);
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("SUPABASE env eksik");
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: products } = await admin.from("products").select("slug").eq("is_active", true);
  const activeSlugs = new Set((products ?? []).map((p) => String(p.slug ?? "").trim()).filter(Boolean));

  for (const row of byFrom.values()) {
    if (row.status_code === 410) continue;
    const segs = row.to_path.split("/").filter(Boolean);
    if (segs[0] === "urunler" && segs.length === 2) {
      if (!activeSlugs.has(segs[1])) {
        warnings.push(`to_path 404 riski (pasif/yok ürün): ${row.to_path}`);
      }
    } else if (!isReservedRoute(row.to_path)) {
      // tek segment ürün değilse ve reserved değilse — bilinmeyen rota
      if (segs.length === 1 && !activeSlugs.has(segs[0])) {
        warnings.push(`to_path 404 riski (rezerve değil / ürün yok): ${row.to_path}`);
      }
    }
  }

  if (warnings.length) {
    console.log("\nUyarılar:");
    for (const w of warnings) console.log(" -", w);
  } else {
    console.log("\nUyarı yok.");
  }

  const payload = [...byFrom.values()].map(({ from_path, to_path, status_code }) => ({
    from_path,
    to_path,
    status_code,
    note: "csv import",
  }));

  console.log(`\nYazılacak: ${payload.length}`);
  if (!apply) {
    console.log("Dry-run — yazılmadı. --apply ile uygula.");
    return;
  }

  const { error } = await admin.from("url_redirects").upsert(payload, { onConflict: "from_path" });
  if (error) {
    console.error("upsert hata:", error.message);
    process.exit(1);
  }
  console.log(`✓ ${payload.length} yönlendirme yazıldı`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
