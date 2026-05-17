/**
 * Hediye kartı kapak görselini Supabase Storage'a yükler.
 * Gerekli: .env.local → NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 *   node scripts/upload-gift-card-image.mjs
 *   node scripts/upload-gift-card-image.mjs path/to/custom.svg
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUCKET = "product-images";
const OBJECT = "zelula-gift-card.svg";
const DEFAULT_ASSET = resolve(__dirname, "assets/zelula-gift-card.png");

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local).");
  process.exit(1);
}

const inputPath = resolve(process.argv[2] ?? DEFAULT_ASSET);
if (!existsSync(inputPath)) {
  console.error("Dosya bulunamadı:", inputPath);
  process.exit(1);
}

const body = readFileSync(inputPath);
const ext = inputPath.toLowerCase().split(".").pop();
const contentType =
  ext === "svg" ? "image/svg+xml" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "application/octet-stream";

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const { error } = await supabase.storage.from(BUCKET).upload(OBJECT, body, {
  upsert: true,
  contentType,
  cacheControl: "3600",
});

if (error) {
  console.error("Upload failed:", error.message);
  process.exit(1);
}

const { data } = supabase.storage.from(BUCKET).getPublicUrl(OBJECT);
console.log("Uploaded:", `${BUCKET}/${OBJECT}`);
console.log("Public URL:", data.publicUrl);
console.log("\nSonra Admin → Hediye kartları → «Görseli veritabanına uygula» veya deploy sonrası otomatik senkron.");
