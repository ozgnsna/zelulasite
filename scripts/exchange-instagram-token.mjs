/**
 * Kısa ömürlü Instagram/Meta token → uzun ömürlü page token.
 * .env.local okur; başarılı olursa INSTAGRAM_ACCESS_TOKEN günceller.
 *
 * Gerekli env:
 *   INSTAGRAM_ACCESS_TOKEN  (Graph Explorer kısa token)
 *   INSTAGRAM_USER_ID       (instagram_business_account.id)
 *   META_APP_ID
 *   META_APP_SECRET
 *
 *   node scripts/exchange-instagram-token.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[key] = v;
  }
}

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const graphVersion = process.env.META_GRAPH_API_VERSION?.trim() || "v21.0";
const shortToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() ?? "";
const targetIgId = process.env.INSTAGRAM_USER_ID?.trim() ?? "";
const appId = process.env.META_APP_ID?.trim() ?? "";
const appSecret = process.env.META_APP_SECRET?.trim() ?? "";

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!shortToken) fail("INSTAGRAM_ACCESS_TOKEN eksik");
if (!targetIgId) fail("INSTAGRAM_USER_ID eksik");
if (!appId || !appSecret) fail("META_APP_ID ve META_APP_SECRET .env.local'a ekleyin");

const exchangeUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
exchangeUrl.searchParams.set("grant_type", "fb_exchange_token");
exchangeUrl.searchParams.set("client_id", appId);
exchangeUrl.searchParams.set("client_secret", appSecret);
exchangeUrl.searchParams.set("fb_exchange_token", shortToken);

const exRes = await fetch(exchangeUrl);
const exJson = await exRes.json();
if (exJson.error) {
  fail(`Token exchange hatası (${exJson.error.code}): ${exJson.error.message}`);
}

const longUserToken = exJson.access_token;
const days = Math.round((exJson.expires_in ?? 0) / 86400);
console.log(`Uzun user token alındı (~${days} gün)`);

const accountsUrl = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`);
accountsUrl.searchParams.set("fields", "name,access_token,instagram_business_account");
accountsUrl.searchParams.set("access_token", longUserToken);
const accJson = await (await fetch(accountsUrl)).json();
if (accJson.error) {
  fail(`me/accounts hatası: ${accJson.error.message}`);
}

const pages = accJson.data ?? [];
const page =
  pages.find((p) => p.instagram_business_account?.id === targetIgId) ??
  pages.find((p) => p.instagram_business_account?.id) ??
  null;

const finalToken = page?.access_token ?? longUserToken;
if (page) {
  console.log(`Page token seçildi: ${page.name} (IG: ${page.instagram_business_account?.id ?? "?"})`);
} else {
  console.log("Sayfa bulunamadı — uzun user token kullanılıyor");
}

const mediaUrl = new URL(`https://graph.facebook.com/${graphVersion}/${targetIgId}/media`);
mediaUrl.searchParams.set("fields", "id,media_type,permalink");
mediaUrl.searchParams.set("limit", "2");
mediaUrl.searchParams.set("access_token", finalToken);
const mediaJson = await (await fetch(mediaUrl)).json();
if (mediaJson.error) {
  fail(`Feed testi başarısız: ${mediaJson.error.message}`);
}
console.log(`Feed testi OK — ${(mediaJson.data ?? []).length} gönderi`);

const envPath = path.join(ROOT, ".env.local");
let envText = fs.readFileSync(envPath, "utf8");
if (/^INSTAGRAM_ACCESS_TOKEN=.*/m.test(envText)) {
  envText = envText.replace(/^INSTAGRAM_ACCESS_TOKEN=.*/m, `INSTAGRAM_ACCESS_TOKEN=${finalToken}`);
} else {
  envText += `\nINSTAGRAM_ACCESS_TOKEN=${finalToken}\n`;
}
fs.writeFileSync(envPath, envText, "utf8");
console.log(".env.local güncellendi (INSTAGRAM_ACCESS_TOKEN)");
console.log("Vercel'de aynı token'ı güncelleyip redeploy edin.");
