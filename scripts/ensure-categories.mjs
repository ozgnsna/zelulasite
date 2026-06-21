/**
 * Kategorileri listeler ve eksik olanları (Broş, Şapka, Bileklik, Bilezik) ekler.
 * .env.local → NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(projectRoot, ".env"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const WANTED = [
  { name: "Kolye", slug: "kolye" },
  { name: "Küpe", slug: "kupe" },
  { name: "Yüzük", slug: "yuzuk" },
  { name: "Bileklik", slug: "bileklik" },
  { name: "Bilezik", slug: "bilezik" },
  { name: "Halhal", slug: "halhal" },
  { name: "Şahmeran", slug: "sahmeran" },
  { name: "Broş", slug: "bros" },
  { name: "Şapka", slug: "sapka" },
];

const { data: existing, error } = await supabase.from("categories").select("id,name,slug").order("name");
if (error) {
  console.error("Kategoriler okunamadı:", error.message);
  process.exit(1);
}

console.log("Mevcut kategoriler:");
for (const c of existing ?? []) console.log(`  - ${c.name} (${c.slug})`);

const existingSlugs = new Set((existing ?? []).map((c) => String(c.slug)));
const missing = WANTED.filter((w) => !existingSlugs.has(w.slug));

if (missing.length === 0) {
  console.log("\nEklenecek eksik kategori yok. Hepsi mevcut.");
  process.exit(0);
}

console.log("\nEklenecek eksik kategoriler:", missing.map((m) => m.slug).join(", "));
const { error: insertError } = await supabase.from("categories").insert(missing);
if (insertError) {
  console.error("Ekleme hatası:", insertError.message);
  process.exit(1);
}
console.log("Eklendi ✓");
