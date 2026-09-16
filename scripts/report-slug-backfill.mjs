/**
 * Read-only: gerçekten bozuk slug'lar.
 *   node scripts/report-slug-backfill.mjs
 *
 * Bozuk: kesik token, tek harfli token, uç/çift tire, ASCII dışı.
 * Kısa ama temiz kelime slug'ları listelenmez.
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

function slugifyTrFromName(name) {
  let s = String(name ?? "").trim();
  const pairs = [
    ["ğ", "g"],
    ["ü", "u"],
    ["ş", "s"],
    ["ı", "i"],
    ["ö", "o"],
    ["ç", "c"],
    ["Ğ", "g"],
    ["Ü", "u"],
    ["Ş", "s"],
    ["İ", "i"],
    ["I", "i"],
    ["Ö", "o"],
    ["Ç", "c"],
  ];
  for (const [a, b] of pairs) s = s.split(a).join(b);
  s = s.toLocaleLowerCase("tr-TR");
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s || "urun";
}

function sanitizeGeneratedSlug(slug) {
  let out = slug;
  out = out.replace(/(?:-(?:ig|instagram|source))+$/i, "");
  out = out.replace(/-(?:ig|instagram|source)-[a-z0-9]+$/i, "");
  return out.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Ürün adındaki kelimeler + tire parçaları (hexa-linear → hexa, linear).
 * Tam eşleşen slug token'lar "kesik" sayılmaz.
 */
function nameWordTokens(name) {
  const raw = String(name ?? "")
    .split(/[\s/|&–—·,.;:()+]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  const tokens = [];
  const seen = new Set();
  const push = (t) => {
    if (!t || t === "urun" || seen.has(t)) return;
    seen.add(t);
    tokens.push(t);
  };
  for (const w of raw) {
    const t = slugifyTrFromName(w);
    push(t);
    if (t.includes("-")) {
      for (const part of t.split("-")) push(part);
    }
  }
  return tokens;
}

/**
 * Gerçekten bozuk mu? Kısa ama temiz (tam kelime) slug'lar false.
 * Tek harfli: yalnızca adında karşılığı olmayan (ı/ş/ğ kaybı, ör. alt-n).
 * @returns {{ broken: boolean, reasons: string[] }}
 */
function diagnoseBrokenSlug(oldSlug, name) {
  const reasons = [];
  if (!oldSlug) {
    return { broken: true, reasons: ["boş slug"] };
  }

  if (oldSlug.startsWith("-") || oldSlug.endsWith("-")) {
    reasons.push("başta/sonda tire");
  }
  if (oldSlug.includes("--")) {
    reasons.push("ardışık çift tire");
  }
  if (/[^\x00-\x7F]/.test(oldSlug)) {
    reasons.push("ASCII dışı karakter");
  }

  const slugTokens = oldSlug.split("-").filter(Boolean);
  const wordTokens = nameWordTokens(name);
  const wordSet = new Set(wordTokens);

  for (const tok of slugTokens) {
    // Tam kelime / tire parçası → temiz (Gold A, Hexa-Linear, …)
    if (wordSet.has(tok)) continue;

    // ı/ş/ğ kaybı: adında tek harfli kelime yokken slug'da "n", "y" vb.
    if (tok.length === 1 && /[a-z]/.test(tok)) {
      reasons.push(`tek harfli token "${tok}" (TR karakter kaybı)`);
      continue;
    }

    // Kesik: tok, daha uzun ad kelimesinin strict prefix'i (ör. tasl←tasli, alt←altin)
    // Min 3 harf: "re"←"renkli" gibi rastgele prefix gürültüsünü ele
    for (const word of wordTokens) {
      if (
        !word.includes("-") &&
        word.length >= 4 &&
        tok.length >= 3 &&
        tok.length < word.length &&
        word.startsWith(tok)
      ) {
        reasons.push(`kesik token "${tok}" ← "${word}"`);
        break;
      }
    }
  }

  const seen = new Set();
  const uniq = [];
  for (const r of reasons) {
    if (seen.has(r)) continue;
    seen.add(r);
    uniq.push(r);
  }

  return { broken: uniq.length > 0, reasons: uniq };
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await admin
  .from("products")
  .select("sku,name,slug,stock_quantity,is_active")
  .eq("is_active", true)
  .order("sku");
if (error) throw error;

const products = (data ?? []).filter((p) => !String(p.sku ?? "").startsWith("HEDIYE_KARTI_"));

const rows = [];
const skippedDiff = []; // slug ≠ expected ama bozuk değil
let zelula375 = null;

for (const p of products) {
  const oldSlug = String(p.slug ?? "").trim();
  const neu = sanitizeGeneratedSlug(slugifyTrFromName(p.name));
  const diag = diagnoseBrokenSlug(oldSlug, p.name);

  if (String(p.sku) === "Zelula375") {
    zelula375 = { ...p, oldSlug, neu, diag, equal: oldSlug === neu };
  }

  if (!diag.broken) {
    if (oldSlug !== neu) {
      skippedDiff.push({
        sku: p.sku,
        name: p.name,
        old: oldSlug,
        neu,
      });
    }
    continue;
  }

  rows.push({
    sku: p.sku ?? "",
    name: p.name ?? "",
    old: oldSlug,
    neu,
    reason: diag.reasons.join("; "),
  });
}

console.log("SKU | ürün adı | eski slug | yeni slug | bozukluk nedeni");
console.log("-".repeat(100));
for (const r of rows) {
  console.log(`${r.sku} | ${r.name} | ${r.old} | ${r.neu} | ${r.reason}`);
}
console.log(`\nToplam gerçekten bozuk: ${rows.length} (güncelleme yok)`);

console.log("\n=== SAMPLE_SLUGIFY ===");
for (const sample of [
  "Aves Radiance Pavé Zirkon Kuş Figürlü Altın Kaplama Sallantılı Küpe",
  "Lumière Stream Zirkon Taşlı Gümüş Renk Çelik Su Yolu Kolye",
  "Deniz Kabuğu ve İnci Detaylı Mavi Boncuklu Altın Kaplama Çelik Halhal",
]) {
  console.log(JSON.stringify({ name: sample, slug: sanitizeGeneratedSlug(slugifyTrFromName(sample)) }));
}

console.log("\n=== ZELULA375 ===");
console.log(JSON.stringify(zelula375, null, 2));

console.log(`\n=== SLUG≠EXPECTED ama bozuk değil (atlanan): ${skippedDiff.length} ===`);
for (const r of skippedDiff.slice(0, 40)) {
  console.log(`${r.sku} | ${r.old} → ${r.neu}`);
}
if (skippedDiff.length > 40) console.log(`… +${skippedDiff.length - 40} daha`);
