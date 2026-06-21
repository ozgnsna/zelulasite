/**
 * PTT postakodu.ptt.gov.tr — il/ilçe listesini tarayıcı ile çeker.
 * SPA client-side API isteğini yakalar, src/data/turkiye-ptt-districts.json üretir.
 *
 *   node scripts/fetch-ptt-addresses.mjs
 *   node scripts/fetch-ptt-addresses.mjs --city=Ordu
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const OUT_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/data/turkiye-ptt-districts.json");
const CITY_FILTER = (() => {
  const idx = process.argv.findIndex((a) => a.startsWith("--city="));
  return idx >= 0 ? process.argv[idx].slice("--city=".length).trim() : "";
})();

function normalizeTrUpper(s) {
  return String(s ?? "")
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/\s+/g, " ");
}

function titleCaseTr(s) {
  return String(s ?? "")
    .trim()
    .split(/\s+/)
    .map((w) => {
      if (!w) return w;
      return w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1).toLocaleLowerCase("tr-TR");
    })
    .join(" ");
}

/** PTT il adını sitedeki il adına eşle. */
function mapPttCityLabel(label) {
  const upper = normalizeTrUpper(label);
  if (upper.startsWith("MERSİN")) return "Mersin";
  if (upper.includes("(")) return titleCaseTr(label.replace(/\([^)]*\)/g, "").trim());
  return titleCaseTr(label);
}

function mapPttDistrictLabel(label) {
  return titleCaseTr(label);
}

function parseDistrictResponse(body) {
  if (!body) return [];
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return [];
  }
  const list = Array.isArray(data) ? data : data?.data ?? data?.ilceler ?? data?.districts ?? data?.result ?? [];
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (typeof item === "string") return mapPttDistrictLabel(item);
      const name = item?.ad ?? item?.name ?? item?.ilceAdi ?? item?.ilce ?? item?.label ?? "";
      return mapPttDistrictLabel(name);
    })
    .filter(Boolean);
}

async function discoverDistrictFetcher(page) {
  let captured = null;

  page.on("response", async (response) => {
    if (captured) return;
    const url = response.url();
    const ct = response.headers()["content-type"] ?? "";
    if (!/json|text\/plain/i.test(ct) && !/\/api\//i.test(url)) return;
    if (!/ilce|ilçe|district|postakodu|adres|lookup|52/i.test(url)) return;
    try {
      const body = await response.text();
      const districts = parseDistrictResponse(body);
      if (districts.length >= 5) {
        captured = { url, districts, body: body.slice(0, 500) };
      }
    } catch {
      /* ignore */
    }
  });

  await page.goto("https://postakodu.ptt.gov.tr/", { waitUntil: "networkidle", timeout: 120000 });
  await page.selectOption("#il-select", "52");
  await page.waitForTimeout(2500);

  const options = await page.locator("#ilce-select option").allTextContents();
  const fromDom = options.filter((o) => o && o !== "İlçe Seçiniz").map(mapPttDistrictLabel);

  if (fromDom.length >= 5) {
    return { mode: "dom", fetchDistricts: async () => fromDom };
  }
  if (captured) {
    console.log("API yakalandı:", captured.url);
    return {
      mode: "api",
      apiUrl: captured.url,
      fetchDistricts: async (cityCode, browserContext) => {
        const apiUrl = captured.url.replace(/52/g, String(cityCode));
        const res = await browserContext.request.get(apiUrl);
        return parseDistrictResponse(await res.text());
      },
    };
  }

  throw new Error("İlçe listesi yüklenemedi (DOM veya API bulunamadı).");
}

async function main() {
  console.log("PTT postakodu.ptt.gov.tr — Playwright ile il/ilçe senkronu…");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "tr-TR" });
  const page = await context.newPage();

  const fetcher = await discoverDistrictFetcher(page);

  // İl listesi
  await page.goto("https://postakodu.ptt.gov.tr/", { waitUntil: "networkidle", timeout: 120000 });
  const cityOptions = await page.locator("#il-select option").evaluateAll((opts) =>
    opts
      .map((o) => ({ value: o.value, label: o.textContent?.trim() ?? "" }))
      .filter((o) => o.value && o.label !== "İl Seçiniz"),
  );

  let cities = cityOptions.map((o) => ({ code: o.value, name: mapPttCityLabel(o.label) }));
  if (CITY_FILTER) {
    const want = normalizeTrUpper(CITY_FILTER);
    cities = cities.filter((c) => normalizeTrUpper(c.name) === want);
    if (cities.length === 0) throw new Error(`Filtre il bulunamadı: ${CITY_FILTER}`);
  }

  const districtsByCity = {};
  let done = 0;

  for (const city of cities) {
    process.stdout.write(`\r${++done}/${cities.length} ${city.name.padEnd(22).slice(0, 22)}`);

    if (fetcher.mode === "dom") {
      await page.selectOption("#il-select", city.code);
      await page.waitForTimeout(800);
      const opts = await page.locator("#ilce-select option").allTextContents();
      districtsByCity[city.name] = opts.filter((o) => o && o !== "İlçe Seçiniz").map(mapPttDistrictLabel);
    } else {
      districtsByCity[city.name] = await fetcher.fetchDistricts(city.code, context);
    }
  }

  process.stdout.write("\n");
  await browser.close();

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  let existing = {};
  if (fs.existsSync(OUT_PATH) && CITY_FILTER) {
    existing = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
  }
  const merged = CITY_FILTER ? { ...existing, ...districtsByCity } : districtsByCity;

  fs.writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2) + "\n", "utf8");
  console.log(`Yazıldı: ${OUT_PATH} (${Object.keys(merged).length} il)`);
  const ordu = merged.Ordu ?? merged["Ordu"];
  if (ordu) console.log(`Ordu örnek (${ordu.length} ilçe):`, ordu.slice(0, 5).join(", "), "…");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
