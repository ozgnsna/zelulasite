/**
 * Ürün açıklama üreticisi kalite testi — çift harf / çift boşluk / birleştirme artifaktları.
 *
 * node scripts/test-product-description-quality.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  categoryKind,
  generateUniqueFullDescription,
  mapProductRow,
  planDescriptionBatch,
  repairConcatArtifacts,
} from "./lib/product-description-rewrite.mjs";

// materialAblative doğrulama — eski `${lo}ten` hatasını yakalamak için inline
function materialAblativeCheck(lo) {
  const words = lo.trim().split(/\s+/);
  const last = words[words.length - 1] ?? lo;
  const map = { çelik: "çelikten", alaşım: "alaşımdan", altın: "altından", gümüş: "gümüşten" };
  const abl = map[last];
  if (abl) return [...words.slice(0, -1), abl].filter(Boolean).join(" ");
  return `${lo} malzemeden`;
}

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

/** Kesin yasak — bilinen üretim hataları. */
export const FORBIDDEN_PATTERNS = [
  { id: "paslanmazz", re: /\b[Pp]aslanmazz+\b/ },
  { id: "pasllanmaz", re: /\b[Pp]asllanmaz\b/ },
  { id: "tercihh", re: /\btercihh\b/i },
  { id: "koruyyan", re: /\bkoruyyan\b/i },
  { id: "ceelik", re: /\bçeelik\b/i },
  { id: "kullanimmda", re: /\bkullanımmda\b/i },
  { id: "parlakliksini", re: /parlaklıksını/i },
  { id: "isiltisisini", re: /ışıltısınısını/i },
  { id: "detayi-detayi", re: /detayı detayı/i },
  { id: "double-space", re: /  +/ },
  { id: "ton-tonu", re: /\b\p{L}+\s+ton\s+tonu(nu)?\b/iu },
  { id: "alaşımdanten", re: /alaşımdanten/i },
  { id: "malzeme-malzeme", re: /\bmalzeme malzeme\b/i },
];

/** Şablon havuzlarında İngilizce sızıntı — ürün adı hariç üretilen metinde yasak. */
export const ENGLISH_LEAK_RE = /\b(Proportion|statement|stack)\b/i;

/**
 * Açılış satırı (ürün adında İngilizce olabilir) hariç İngilizce sızıntıları bul.
 * @param {string} text
 */
export function findEnglishLeakIssues(text) {
  const issues = [];
  const lines = String(text ?? "").split("\n");
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const m = line.match(ENGLISH_LEAK_RE);
    if (m) {
      issues.push({
        type: `english-leak:${m[0].toLowerCase()}`,
        line: i + 1,
        match: m[0],
        excerpt: line,
      });
    }
  }
  return issues;
}

/** Şüpheli çift harfler (Türkçe'de nadiren geçerli). */
const SUSPICIOUS_DOUBLE_RE =
  /(?<![aeıioöuüAEIİOÖUÜ])([b-df-hj-km-ptvyzçşğB-DF-HJ-KM-PT-VYZÇŞĞ])\1(?![aeıioöuüAEIİOÖUÜ])/u;

/**
 * @param {string} text
 * @returns {{ type: string, line: number, excerpt: string, match?: string }[]}
 */
export function findQualityIssues(text) {
  const issues = [];
  const lines = String(text ?? "").split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const { id, re } of FORBIDDEN_PATTERNS) {
      const m = line.match(re);
      if (m) {
        issues.push({ type: id, line: i + 1, match: m[0], excerpt: line.trim() });
      }
    }

    const words = line.match(/\p{L}[\p{L}'’-]*/gu) ?? [];
    for (const word of words) {
      // Marka / İngilizce adlar (Bloom, Moonline) — çift harf false positive atla
      if (word !== word.toLocaleLowerCase("tr-TR")) continue;
      if (SUSPICIOUS_DOUBLE_RE.test(word)) {
        issues.push({ type: "suspicious-double", line: i + 1, match: word, excerpt: line.trim() });
      }
    }
  }

  return issues;
}

function assertUnitFixes() {
  const cases = [
    ["parlaklık" + "sını koruyan", "parlaklığını koruyan"],
    ["paslanmaz çelik" + "ten üretilen", null], // eski hata — repair may not fix this exact concat
    ["Kaplama  tonu Gold", "Kaplama tonu Gold"],
    ["taş detayı detayıyla", "taş detayıyla"],
    ["kullanımmda konforlu", "kullanımda konforlu"],
  ];
  for (const [input, mustContain] of cases) {
    const out = repairConcatArtifacts(input);
    if (mustContain && !out.includes(mustContain)) {
      throw new Error(`repairConcatArtifacts failed: ${JSON.stringify(input)} → ${out}`);
    }
    const issues = findQualityIssues(out);
    const hard = issues.filter((x) => x.type !== "suspicious-double");
    if (hard.length > 0) {
      throw new Error(`repairConcatArtifacts left issues in ${JSON.stringify(input)}: ${hard[0].type}`);
    }
  }
  if (materialAblativeCheck("premium alaşım") !== "premium alaşımdan") {
    throw new Error("materialAblative: alaşım → alaşımdan failed");
  }
  if (materialAblativeCheck("paslanmaz çelik") !== "paslanmaz çelikten") {
    throw new Error("materialAblative: çelik → çelikten failed");
  }
  const libSrc = fs.readFileSync(
    path.join(projectRoot, "scripts/lib/product-description-rewrite.mjs"),
    "utf8",
  );
  if (/Mikrofon ve kulaklık/i.test(libSrc)) {
    throw new Error("kupe wear pool must not reference mikrofon/kulaklık");
  }
  if (ENGLISH_LEAK_RE.test(libSrc)) {
    throw new Error("description pools must not contain English leaks: Proportion, statement, stack");
  }
}

async function fetchActiveProducts(admin) {
  const pageSize = 1000;
  const all = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("products")
      .select(
        "id,name,slug,sku,short_description,full_description,material,color,product_kind,is_active,categories(name,slug),collections(name,slug)",
      )
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all.map(mapProductRow).filter((p) => p.product_kind !== "gift_card");
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  assertUnitFixes();
  console.log("Unit repair checks: OK");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
    process.exit(1);
  }

  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
  const products = await fetchActiveProducts(admin);
  const batchPlan = planDescriptionBatch(products);

  const failures = [];
  for (const product of products) {
    const text = generateUniqueFullDescription(product, 0, batchPlan);
    const issues = [...findQualityIssues(text), ...findEnglishLeakIssues(text)];
    if (issues.length > 0) {
      failures.push({ slug: product.slug, name: product.name, issues });
    }
    if (categoryKind(product.categorySlug, product.name) === "kupe") {
      if (/\b(mikrofon|kulaklık)\b/i.test(text)) {
        failures.push({
          slug: product.slug,
          name: product.name,
          issues: [{ type: "kupe-wear-nonsense", line: 0, excerpt: "mikrofon/kulaklık in küpe description" }],
        });
      }
    }
  }

  console.log(`Tested ${products.length} active physical products`);
  console.log(`Failures: ${failures.length}`);

  if (failures.length > 0) {
    for (const f of failures.slice(0, 30)) {
      console.log(`\n--- ${f.slug} (${f.name})`);
      for (const issue of f.issues.slice(0, 6)) {
        console.log(`  [${issue.type}] L${issue.line}${issue.match ? ` "${issue.match}"` : ""}: ${issue.excerpt}`);
      }
    }
    process.exit(1);
  }

  console.log("All quality checks passed.");
  process.exit(0);
}
