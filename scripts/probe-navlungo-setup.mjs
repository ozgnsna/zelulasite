/**
 * Navlungo'dan Vercel için gereken ID'leri bulur.
 *
 * 1) .env.local dosyasına yazın:
 *    NAVLUNGO_API_USERNAME=...
 *    NAVLUNGO_API_PASSWORD=...
 *    NAVLUNGO_API_BASE_URL=https://domestic-api-qa.navlungo.com/v2.1/
 *
 * 2) Çalıştırın:
 *    node scripts/probe-navlungo-setup.mjs
 */
import fs from "node:fs";
import path from "node:path";

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

const username = process.env.NAVLUNGO_API_USERNAME?.trim();
const password = process.env.NAVLUNGO_API_PASSWORD?.trim();
const baseRaw = process.env.NAVLUNGO_API_BASE_URL?.trim() || "https://domestic-api-qa.navlungo.com/v2.1/";
const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`;

console.log("\n=== Navlungo kurulum kontrolü ===\n");

if (!username || !password) {
  console.log("Eksik: NAVLUNGO_API_USERNAME ve NAVLUNGO_API_PASSWORD");
  console.log("Bunları proje kökündeki .env.local dosyasına yazın, sonra tekrar çalıştırın.\n");
  process.exit(1);
}

console.log(`API adresi: ${base}`);
console.log(`Kullanıcı: ${username}\n`);

async function navlungo(pathSuffix, { method = "GET", body, token } = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-localization": "tr",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${pathSuffix}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

console.log("1) Navlungo'ya giriş yapılıyor...");
const login = await navlungo("auth/api", {
  method: "POST",
  body: { username, password },
});

if (!login.ok || !login.json?.status) {
  console.log("Giriş BAŞARISIZ.");
  console.log(JSON.stringify(login.json, null, 2));
  console.log("\nKullanıcı adı/şifre yanlış olabilir veya QA/canlı URL karışmış olabilir.\n");
  process.exit(1);
}

const token = String(login.json?.data?.access_token ?? "").trim();
if (!token) {
  console.log("Token alınamadı:", login.json);
  process.exit(1);
}
console.log("Giriş OK.\n");

console.log("2) Gönderici adresleriniz aranıyor...");
const addresses = await navlungo("address-book/getAll", {
  method: "GET",
  token,
  body: {
    limit: 50,
    page: 1,
    filters: { address_type: "sender" },
  },
});

const addressRows = extractRows(addresses.json);
if (addressRows.length === 0) {
  console.log("GÖNDERİCİ ADRES BULUNAMADI.");
  console.log("Navlungo desteğe yazın: \"API için sender adresi oluşturun\" deyin.");
  console.log("Veya Postman'de AddressBook > Create Address ile kendiniz oluşturun.\n");
} else {
  console.log("Bulunan gönderici adresler:\n");
  for (const row of addressRows) {
    const id = row.id ?? row.address_id ?? row.addressId;
    const name = row.location_name || row.address_name || row.name || "—";
    const line = row.address_line || row.address || "—";
    console.log(`  ID: ${id}  |  ${name}`);
    console.log(`       ${line}\n`);
  }
  const firstId = addressRows[0].id ?? addressRows[0].address_id ?? addressRows[0].addressId;
  console.log("→ Vercel'e yazın:");
  console.log(`   NAVLUNGO_SENDER_ADDRESS_ID=${firstId}\n`);
}

console.log("3) Kargo firmalarınız aranıyor...");
const carriers = await navlungo("carrier/my-carriers", {
  method: "GET",
  token,
  body: { limit: 50 },
});

const carrierRows = extractRows(carriers.json);
if (carrierRows.length === 0) {
  const allCarriers = await navlungo("carrier/getAll", {
    method: "GET",
    token,
    body: { limit: 50 },
  });
  const fallback = extractRows(allCarriers.json);
  if (fallback.length === 0) {
    console.log("KARGO FİRMASI BULUNAMADI. Navlungo hesabınızda taşıyıcı tanımlı olmayabilir.\n");
  } else {
    printCarriers(fallback);
  }
} else {
  printCarriers(carrierRows);
}

console.log("=== Bitti ===");
console.log("Yukarıdaki iki satırı Vercel > Settings > Environment Variables'a yapıştırın.");
console.log("Sonra Vercel'de Redeploy yapın.\n");

function extractRows(json) {
  if (!json || typeof json !== "object") return [];
  if (Array.isArray(json.data)) return json.data;
  if (json.data && typeof json.data === "object") {
    const d = json.data;
    if (Array.isArray(d.items)) return d.items;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.addresses)) return d.addresses;
    if (Array.isArray(d.carriers)) return d.carriers;
  }
  if (Array.isArray(json.items)) return json.items;
  return [];
}

function printCarriers(rows) {
  console.log("Bulunan taşıyıcılar:\n");
  for (const row of rows) {
    const id = row.id ?? row.carrier_id ?? row.carrierId;
    const name = row.name ?? row.carrier_name ?? row.title ?? "—";
    console.log(`  ID: ${id}  |  ${name}`);
  }
  const firstId = rows[0].id ?? rows[0].carrier_id ?? rows[0].carrierId;
  console.log("\n→ Vercel'e yazın:");
  console.log(`   NAVLUNGO_CARRIER_ID=${firstId}\n`);
}
