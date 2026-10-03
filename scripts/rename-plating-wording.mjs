/**
 * Kaplama → renk dil revizyonu (ad + short/full description).
 * Slug değişmez. Varsayılan: dry-run. --apply ile DB yazar.
 *
 *   node scripts/rename-plating-wording.mjs
 *   node scripts/rename-plating-wording.mjs --apply
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 0) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (process.env[key] == null) process.env[key] = value;
}

const apply = process.argv.includes("--apply");

/** Özel 7 ürün — ad override (genel kuralların üzerine yazılır) */
const NAME_OVERRIDES = {
  Zelula277: "Altın Renk Deniz Esintisi Halhal - Balık ve Deniz Kabuğu Figürlü Şans Halhalı",
  Zelula249: "Luna Takı Çelik Altın Renk Kararmaz Antialerjik İnci Detaylı U-Tasarım Küpe",
  Zelula250: "Işıltılı Sıra Taşlı Altın Renk Halka Küpe",
  Zelula299: "Altın Renk Kiraz ve Acı Biber Detaylı Yeşil Doğal Taş Görünümlü Boncuklu Halhal",
  Zelula319: "Altın Renk Donut Detaylı Doğal Taş Boncuklu Halhal",
  Zelula102: "Luxury Nail Altın Renk Zirkon Taşlı Çivi Yüzük - Ayarlanabilir",
  Zelula288: "El Yapımı Bohem İnci Kolye - Antik Altın Renk ve Mavi Taşlı",
};

/** Açıklama metni override sonrası ek temizlik (SKU → [(re, replacer), ...]) */
const DESCRIPTION_EXTRAS = {
  Zelula277: [[/\bSilver\s+/g, ""]],
};

function tidySpacing(text) {
  return String(text ?? "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ +([,.;:!?…])/g, "$1")
    .replace(/([(\[])\s+/g, "$1")
    .replace(/\s+([)\]])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ");
}

/**
 * @returns {{ text: string, count: number, risky: string[] }}
 */
function rewritePlating(input) {
  const original = String(input ?? "");
  let text = original;
  let count = 0;
  const risky = [];

  const sub = (re, replacer) => {
    const before = text;
    text = text.replace(re, (...args) => {
      count += 1;
      return typeof replacer === "function" ? replacer(...args) : replacer;
    });
    if (text === before && re.global) {
      // no-op
    }
  };

  // ——— Tur 1: ana kaplama → renk ———

  // Görünüm (önce — iki tonlu kalıplar generic'ten önce)
  sub(/altın\s*&\s*gümüş\s+kaplama\s+görünüm(?:lü)?/gi, "altın & gümüş renk");
  sub(/gümüş\s*&\s*altın\s+kaplama\s+görünüm(?:lü)?/gi, "gümüş & altın renk");
  sub(/altın\s*[-–]\s*gümüş\s+kaplama\s+görünüm(?:lü)?/gi, "altın-gümüş renk");
  sub(/Gümüş\s+[Kk]aplama\s+görünüm(?:lü)?/g, "Gümüş renk");
  sub(/gümüş\s+kaplama\s+görünüm(?:lü)?/g, "gümüş renk");
  sub(/Altın\s+[Kk]aplama\s+görünüm(?:lü)?/g, "Altın renk");
  sub(/altın\s+kaplama\s+görünüm(?:lü)?/g, "altın renk");
  // Yalın "kaplama görünüm" → renk (önünde renk adı yoksa)
  sub(/(?<![\wçğıöşüÇĞİÖŞÜ])kaplama\s+görünümlü/gi, "altın renk");
  sub(/(?<![\wçğıöşüÇĞİÖŞÜ])kaplama\s+görünüm/gi, "altın renk");

  // Renkli/ön ekli kaplamalı
  sub(/Altın\s+[Kk]aplamalı/g, "Altın renkli");
  sub(/altın\s+kaplamalı/g, "altın renkli");
  sub(/Gold\s+[Kk]aplamalı/g, "Altın renkli");
  sub(/gold\s+kaplamalı/g, "altın renkli");
  sub(/Gümüş\s+[Kk]aplamalı/g, "Gümüş renkli");
  sub(/gümüş\s+kaplamalı/g, "gümüş renkli");

  sub(/14\s*[Kk]\s*Kaplama/g, "Altın Renk");

  sub(/Altın\s+Kaplama/g, "Altın Renk");
  sub(/Altın\s+kaplama/g, "Altın renk");
  sub(/altın\s+kaplama/g, "altın renk");

  sub(/Gold\s+Kaplama/g, "Altın Renk");
  sub(/Gold\s+kaplama/g, "Altın renk");
  sub(/gold\s+kaplama/g, "altın renk");
  sub(/GOLD\s+KAPLAMA/g, "ALTIN RENK");

  sub(/Gümüş\s+Kaplama/g, "Gümüş Renk");
  sub(/Gümüş\s+kaplama/g, "Gümüş renk");
  sub(/gümüş\s+kaplama/g, "gümüş renk");

  // ——— Tur 2 ———

  // Kaplama tonu: X / Kaplama tonu X → Renk: X
  sub(/Kaplama\s+tonu\s*:?\s*/gi, "Renk: ");

  // altın renk kaplama (çift ifade)
  sub(/Altın\s+[Rr]enk\s+kaplama/g, "Altın renk");
  sub(/altın\s+renk\s+kaplama/g, "altın renk");
  sub(/ALTIN\s+RENK\s+KAPLAMA/g, "ALTIN RENK");

  // gold kaplama kalıntıları (tur 1 sonrası / bileşik)
  sub(/Gold\s*[\/]\s*[Bb]eyaz\s+kaplama/g, "altın/beyaz renk");
  sub(/gold\s*[\/]\s*beyaz\s+kaplama/gi, "altın/beyaz renk");
  sub(/Gold\s+kaplama/g, "Altın renk");
  sub(/gold\s+kaplama/g, "altın renk");
  sub(/GOLD\s+KAPLAMA/g, "ALTIN RENK");

  // mine / pirinç / Xuping — uzun biçimler önce
  sub(/[Mm]ine\s+kaplamasının/g, (m) => (m[0] === "M" ? "Mine işlemesinin" : "mine işlemesinin"));
  sub(/[Mm]ine\s+kaplamanın/g, (m) => (m[0] === "M" ? "Mine işlemenin" : "mine işlemenin"));
  sub(/[Mm]ine\s+kaplaması/g, (m) => (m[0] === "M" ? "Mine işlemesi" : "mine işlemesi"));
  sub(/[Mm]ine\s+kaplamalı/g, (m) => (m[0] === "M" ? "Mine işlemeli" : "mine işlemeli"));
  sub(/[Mm]ine\s+kaplama/g, (m) => (m[0] === "M" ? "Mine işleme" : "mine işleme"));

  sub(/[Pp]irinç\s+kaplamasının/g, (m) => (m[0] === "P" ? "Pirinç'in" : "pirinç'in"));
  sub(/[Pp]irinç\s+kaplamanın/g, (m) => (m[0] === "P" ? "Pirinç'in" : "pirinç'in"));
  sub(/[Pp]irinç\s+kaplaması/g, (m) => (m[0] === "P" ? "Pirinç" : "pirinç"));
  sub(/[Pp]irinç\s+kaplamalı/g, (m) => (m[0] === "P" ? "Pirinç" : "pirinç"));
  sub(/[Pp]irinç\s+kaplama/g, (m) => (m[0] === "P" ? "Pirinç" : "pirinç"));

  sub(/Xuping\s+kaplamasının/gi, "Xuping'in");
  sub(/Xuping\s+kaplamanın/gi, "Xuping'in");
  sub(/Xuping\s+kaplaması/gi, "Xuping");
  sub(/Xuping\s+kaplamalı/gi, "Xuping");
  sub(/Xuping\s+kaplama/gi, "Xuping");

  // Sabit cümle kalıpları
  sub(/Kaplama\s+altında\s+paslanmaz\s+çelik/gi, "Gövde: 316L paslanmaz çelik");
  sub(/dengeli\s+bir\s+kaplama\s+ile\s+sunulur/gi, "dengeli bir renk tonuyla sunulur");

  // Genel: kaplamalı / kaplaması / kaplamanın (cümle bozmadan)
  sub(/kaplamalı/gi, (m) => (m[0] === m[0].toLocaleUpperCase("tr-TR") ? "Renkli" : "renkli"));

  // "… kaplamasının" → "… renginin"
  sub(/kaplamasının/gi, (m) => (m[0] === "K" ? "Renginin" : "renginin"));
  sub(/kaplamanın/gi, (m) => (m[0] === "K" ? "Rengin" : "rengin"));
  sub(/kaplaması/gi, (m) => (m[0] === "K" ? "Rengi" : "rengi"));
  sub(/kaplamaya/gi, (m) => (m[0] === "K" ? "Renge" : "renge"));
  sub(/kaplamayı/gi, (m) => (m[0] === "K" ? "Rengi" : "rengi"));
  sub(/kaplamalar(?:ı|in|ın)?/gi, (m) => {
    if (/^K/.test(m)) return m.toLocaleLowerCase("tr-TR").startsWith("kaplamaları") ? "Renkleri" : "Renkler";
    if (/kaplamaları/i.test(m)) return "renkleri";
    if (/kaplamaların/i.test(m)) return "renklerin";
    return "renkler";
  });

  // Renkli sıfat kalıntıları: "Beyaz/Yeşil kaplama", "MOR kaplama", "çok renkli kaplama" vb.
  sub(
    /((?:Beyaz|Yeşil|Pembe|Kırmızı|Mavi|Mor|Turuncu|Siyah|Nötr|nötr|Çok\s+Renkli|çok\s+renkli|beyaz|yeşil|pembe|kırmızı|mavi|mor|turuncu|siyah|MAVİ|LACİVERT|YEŞİL|MOR|TURKUAZ|Gold|gold|Gümüş|gümüş)(?:\s*\/\s*(?:Beyaz|Yeşil|Pembe|Kırmızı|Mavi|Mor|beyaz|yeşil|pembe|Sarı|sarı))?)\s+kaplama\b/g,
    "$1 renk",
  );

  // "özel kaplama", "metal kaplama", "kaliteli … kaplama", yalın "kaplama"
  sub(/özel\s+kaplama/gi, (m) => (m[0] === "Ö" || m[0] === "O" ? "Özel renk" : "özel renk"));
  sub(/metal\s+kaplama/gi, (m) => (m[0] === "M" ? "Metal yüzey" : "metal yüzey"));
  sub(/antik\s+kaplama/gi, (m) => (m[0] === "A" ? "Antik renk" : "antik renk"));

  // "Materyal & Kaplama:" etiketleri
  sub(/Materyal\s*&\s*Kaplama\s*:/gi, "Materyal & Renk:");
  sub(/Özel\s+Antik\s+Kaplama\s*:/gi, "Özel Antik Renk:");

  // Kalan yalın "kaplama" kelimesi (kelime sınırı) — son çare
  // "kaplama ile" → "renk ile"; başta büyük K
  sub(/\bKaplama\b/g, "Renk");
  sub(/\bkaplama\b/g, "renk");

  if (count === 0 && text === original) {
    return { text: original, count: 0, risky: [] };
  }

  text = tidySpacing(text);

  // Bozuk türev kontrolü
  if (/işlemes[iı]/i.test(text) && /işlemesı/i.test(text)) {
    risky.push("olası bozuk: işlemesı");
  }
  if (/renkl[iı]{2,}/i.test(text) || /renkliı/i.test(text)) {
    risky.push("olası bozuk: renklı/renkliı");
  }
  if (/renk\s+renk/i.test(text)) {
    risky.push('"renk renk" çiftlemesi');
  }
  if (/kaplama/i.test(text)) {
    // kök kaldı (kaplamalı vb. türevler dahil) — üst katmanda listelenir
  }

  return { text, count, risky };
}

function kaplamaSnippets(text, limit = 8) {
  return [...String(text ?? "").matchAll(/.{0,55}kaplama.{0,55}/gi)]
    .map((m) => m[0].replace(/\s+/g, " ").trim())
    .slice(0, limit);
}

function hasKaplamaRoot(text) {
  return /kaplama/i.test(String(text ?? ""));
}

function spacingIssues(text) {
  const issues = [];
  if (/[ \t]{2,}/.test(text)) issues.push("çift boşluk");
  if (/ +\n/.test(text)) issues.push("satır sonu öncesi boşluk");
  if (/ +[,.;:!?…]/.test(text)) issues.push("noktalama öncesi boşluk");
  if (/\(\s+|\s+\)/.test(text)) issues.push("parantez boşluk");
  if (/\(\s*\)/.test(text)) issues.push("boş parantez");
  return issues;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Supabase env eksik.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await admin
  .from("products")
  .select("id,sku,name,slug,is_active,short_description,full_description")
  .order("sku", { ascending: true });

if (error) {
  console.error(error.message);
  process.exit(1);
}

const planned = [];
const remainingKaplama = [];
const riskyRewrites = [];
const spacingProblems = [];

for (const p of data ?? []) {
  const sku = String(p.sku ?? "");
  const nameR = rewritePlating(p.name);
  const shortR = rewritePlating(p.short_description);
  const fullR = rewritePlating(p.full_description);

  let nextName = nameR.count > 0 ? nameR.text : String(p.name ?? "");
  const override = NAME_OVERRIDES[sku];
  if (override != null) {
    nextName = override;
  }

  let nextShort = shortR.count > 0 ? shortR.text : String(p.short_description ?? "");
  let nextFull = fullR.count > 0 ? fullR.text : String(p.full_description ?? "");

  // SKU'ya özel açıklama ekstraları (örn. Zelula277 "Silver ")
  const descExtras = DESCRIPTION_EXTRAS[sku];
  if (descExtras) {
    for (const [re, repl] of descExtras) {
      if (re.global) re.lastIndex = 0;
      const s2 = nextShort.replace(re, repl);
      if (re.global) re.lastIndex = 0;
      const f2 = nextFull.replace(re, repl);
      if (s2 !== nextShort) {
        nextShort = tidySpacing(s2);
        shortR.count += 1;
      }
      if (f2 !== nextFull) {
        nextFull = tidySpacing(f2);
        fullR.count += 1;
      }
    }
  }

  const nameChanged = nextName !== String(p.name ?? "");
  const shortChanged = nextShort !== String(p.short_description ?? "");
  const fullChanged = nextFull !== String(p.full_description ?? "");
  const anyChange = nameChanged || shortChanged || fullChanged;

  const afterBlob = `${nextName}\n${nextShort}\n${nextFull}`;
  const replaceCount = nameR.count + shortR.count + fullR.count + (override && nameChanged ? 1 : 0);

  const risky = [...nameR.risky, ...shortR.risky, ...fullR.risky];
  if (risky.length) {
    riskyRewrites.push({ sku, name: nextName, risky: [...new Set(risky)] });
  }

  const spaceIssues = [
    ...spacingIssues(nextName).map((i) => `ad: ${i}`),
    ...spacingIssues(nextShort).map((i) => `short: ${i}`),
    ...spacingIssues(nextFull).map((i) => `full: ${i}`),
  ];
  // Yalnızca değişen alanlarda kontrol et (mevcut DB kirini şişirmesin)
  const relevantIssues = [];
  if (nameChanged) relevantIssues.push(...spacingIssues(nextName).map((i) => `ad: ${i}`));
  if (shortChanged) relevantIssues.push(...spacingIssues(nextShort).map((i) => `short: ${i}`));
  if (fullChanged) relevantIssues.push(...spacingIssues(nextFull).map((i) => `full: ${i}`));
  if (relevantIssues.length) {
    spacingProblems.push({ sku, issues: relevantIssues });
  }

  if (hasKaplamaRoot(afterBlob)) {
    remainingKaplama.push({
      sku,
      name: nextName,
      active: Boolean(p.is_active),
      changed: anyChange,
      snippets: kaplamaSnippets(afterBlob),
    });
  }

  if (!anyChange) continue;

  planned.push({
    id: p.id,
    sku,
    slug: p.slug,
    active: Boolean(p.is_active),
    oldName: String(p.name ?? ""),
    newName: nextName,
    nameChanged,
    nameOverride: override != null,
    descChanges: shortR.count + fullR.count,
    replaceCount,
    shortChanged,
    fullChanged,
    oldShort: String(p.short_description ?? ""),
    oldFull: String(p.full_description ?? ""),
    shortNext: nextShort,
    fullNext: nextFull,
  });
}

// Rastgele 5 (deterministik seed) — açıklaması değişenlerden
const descChanged = planned.filter((p) => p.shortChanged || p.fullChanged);
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261003);
const pool = [...descChanged];
for (let i = pool.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [pool[i], pool[j]] = [pool[j], pool[i]];
}
const samples = pool.slice(0, 5);

const lines = [];
const log = (s = "") => {
  lines.push(s);
  console.log(s);
};

log(`MODE=${apply ? "APPLY" : "DRY_RUN"}`);
log(`Güncellenecek ürün: ${planned.length}`);
log(`  - adı değişen: ${planned.filter((p) => p.nameChanged).length}`);
log(`  - ad override (7 özel): ${planned.filter((p) => p.nameOverride).length}`);
log(`  - yalnızca açıklama: ${planned.filter((p) => !p.nameChanged).length}`);
log(`İşlem sonrası "kaplama" kökü kalan: ${remainingKaplama.length}`);
log(`Bozuk yeniden yazım şüphesi: ${riskyRewrites.length}`);
log(`Çift boşluk / noktalama sorunu (değişen alanlar): ${spacingProblems.length}`);
log("");

log("=== ADI DEĞİŞENLER (eski → yeni) ===");
for (const r of planned.filter((p) => p.nameChanged)) {
  const tag = r.nameOverride ? " [OVERRIDE]" : "";
  log(`${r.sku}${tag}\t${r.oldName} → ${r.newName}\taktif=${r.active ? "evet" : "hayır"}`);
}

if (remainingKaplama.length) {
  log('\n=== İŞLEM SONRASI HÂLÂ "kaplama" KÖKÜ (elle karar) ===');
  for (const r of remainingKaplama) {
    log(`\n${r.sku} [${r.active ? "aktif" : "pasif"}][değişti=${r.changed ? "evet" : "hayır"}] ${r.name}`);
    for (const s of r.snippets) log(`  … ${s}`);
  }
} else {
  log('\n=== İŞLEM SONRASI "kaplama" kökü: YOK (hedef tutuldu) ===');
}

log("\n=== ÇİFT BOŞLUK / BOZUK NOKTALAMA ===");
if (!spacingProblems.length) {
  log("Değişen alanlarda sorun yok.");
} else {
  for (const s of spacingProblems) {
    log(`${s.sku}: ${s.issues.join("; ")}`);
  }
}

if (riskyRewrites.length) {
  log("\n=== BOZUK YENİDEN YAZIM ŞÜPHESİ ===");
  for (const r of riskyRewrites) {
    log(`${r.sku}: ${r.risky.join("; ")}`);
  }
}

function dumpBeforeAfter(s, label) {
  log(`\n----- ${label}${s.sku} | ${s.newName} -----`);
  if (s.shortChanged) {
    log("--- short_description ÖNCE ---");
    log(s.oldShort || "(boş)");
    log("--- short_description SONRA ---");
    log(s.shortNext || "(boş)");
  }
  if (s.fullChanged) {
    log("--- full_description ÖNCE ---");
    log(s.oldFull || "(boş)");
    log("--- full_description SONRA ---");
    log(s.fullNext || "(boş)");
  }
  const after = `${s.shortNext}\n${s.fullNext}`;
  if (/\bSilver\b/i.test(after) && DESCRIPTION_EXTRAS[s.sku]) {
    log("⚠ DESCRIPTION_EXTRAS sonrası hâlâ Silver kaldı!");
  }
}

log("\n=== RASTGELE 5 ÜRÜN — AÇIKLAMA ÖNCESİ / SONRASI ===");
for (const s of samples) dumpBeforeAfter(s, "");

const extraSkus = Object.keys(DESCRIPTION_EXTRAS);
const extraRows = planned.filter((p) => extraSkus.includes(p.sku));
if (extraRows.length) {
  log("\n=== DESCRIPTION_EXTRAS DOĞRULAMA ===");
  for (const s of extraRows) dumpBeforeAfter(s, "EXTRA ");
}

log(
  "\n" +
    JSON.stringify(
      {
        mode: apply ? "APPLY" : "DRY_RUN",
        planned: planned.length,
        nameChanges: planned.filter((p) => p.nameChanged).length,
        nameOverridesApplied: planned.filter((p) => p.nameOverride && p.nameChanged).map((p) => p.sku),
        descOnly: planned.filter((p) => !p.nameChanged).length,
        remainingKaplama: remainingKaplama.length,
        remainingSkus: remainingKaplama.map((r) => r.sku),
        spacingProblems: spacingProblems.length,
        riskyRewrites: riskyRewrites.length,
        sampleSkus: samples.map((s) => s.sku),
      },
      null,
      2,
    ),
);

writeFileSync("agent-tools-plating-dryrun.txt", lines.join("\n"), "utf8");

if (!apply) {
  log("\nDB yazılmadı. Uygulamak için: node scripts/rename-plating-wording.mjs --apply");
  log("UTF-8 kopya: agent-tools-plating-dryrun.txt");
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const row of planned) {
  const patch = {};
  if (row.nameChanged) patch.name = row.newName;
  if (row.shortChanged) patch.short_description = row.shortNext;
  if (row.fullChanged) patch.full_description = row.fullNext;
  const { error: upErr } = await admin.from("products").update(patch).eq("id", row.id);
  if (upErr) {
    fail += 1;
    console.error(`FAIL ${row.sku}: ${upErr.message}`);
  } else {
    ok += 1;
  }
}
console.log(JSON.stringify({ applied: ok, failed: fail }, null, 2));
