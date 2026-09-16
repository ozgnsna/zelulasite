/**
 * Zelula402 açıklama metnini günceller (olumsuz "çelik değil" ifadesi kaldırılır).
 *   node scripts/patch-zelula402-description.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

const full = `Dikdörtgen zümrüt yeşili merkez taş, etrafında konsantrik sıralar halinde pavé zirkon taşlarla taç/halo formunda çevrelenir. Yan bantlarda üç paralel şerit zirkon kaplamasıyla yüzük hem lüks hem modern bir signet etkisi sunar.

Ayarlanabilir açık bant yapısı sayesinde farklı parmak ölçülerine kolay uyum sağlar; tek parça olarak kombinlerin odak noktası olur. Sağlam altın kaplama alaşım gövde günlük kullanıma uygun, parlak bir finish sunar.

Özellikler:
• Materyal: Sağlam altın kaplama alaşım
• Taş: Parlak zirkon taşlar + koyu zümrüt yeşili merkez taş
• Tip: Ayarlanabilir yüzük
• Kargo: 350₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`;

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await admin
  .from("products")
  .update({ full_description: full, material: "Sağlam Altın Kaplama Alaşım" })
  .eq("sku", "Zelula402")
  .select("sku,slug")
  .maybeSingle();

if (error || !data) throw new Error(error?.message ?? "Zelula402 bulunamadı");
console.log(`✓ ${data.sku} güncellendi — /urunler/${data.slug}`);
