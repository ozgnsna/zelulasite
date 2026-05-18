"use client";
import { useState } from "react";
import { ZELULA_TRENDYOL_BRAND_ID, ZELULA_TRENDYOL_VAT_RATE } from "@/lib/marketplaces/trendyol/shop-defaults";

const microBase =
  "rounded-md border border-transparent bg-transparent px-1.5 py-0.5 font-medium leading-tight tracking-tight text-stone-600/90 underline decoration-stone-300/70 underline-offset-2 transition-colors hover:border-[#e7ded2]/80 hover:bg-[#fdfcfa] hover:text-amber-900/90 hover:decoration-amber-700/50 active:scale-[0.98]";

const microCompact = `${microBase} shrink-0 text-[10px]`;

const microWide = `${microBase} max-w-[min(100%,13rem)] text-end text-[9px] sm:max-w-[16rem] sm:text-[10px]`;

const IDS = {
  name: "product-name",
  slug: "product-slug",
  category: "product-category",
  sku: "product-sku",
  price: "product-price",
  compare: "product-compare",
  stock: "product-stock",
  productIsActive: "product-is-active",
  trendyolStock: "trendyol_stock_code",
  trendyolBrand: "trendyol_brand",
  trendyolList: "trendyol_list_price",
  trendyolSale: "trendyol_sale_price",
  trendyolQty: "trendyol_quantity",
  trendyolVat: "trendyol_vat_rate",
  trendyolActive: "trendyol_active",
} as const;

function setInputValue(id: string, value: string) {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function setFeedback(setter: (v: string) => void, text: string) {
  setter(text);
  setTimeout(() => setter(""), 1600);
}

function inputVal(id: string): string {
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : "";
}

function setCheckbox(id: string, checked: boolean) {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement && el.type === "checkbox") {
    el.checked = checked;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function numEq(a: string, b: string): boolean {
  const x = a.trim();
  const y = b.trim();
  if (x === "" || y === "") return false;
  return Number(x) === Number(y);
}

const OVERWRITE_CONFIRM = "Mevcut Trendyol alanları değiştirilsin mi?";

function needsOverwriteConfirm(): boolean {
  const sku = inputVal(IDS.sku).trim();
  const price = inputVal(IDS.price).trim();
  const compare = inputVal(IDS.compare).trim();
  const stock = inputVal(IDS.stock).trim();
  const listSrc = compare !== "" ? compare : price;

  const tStock = inputVal(IDS.trendyolStock).trim();
  if (tStock !== "" && tStock !== sku) return true;

  const tSale = inputVal(IDS.trendyolSale).trim();
  if (tSale !== "" && !numEq(tSale, price)) return true;

  const tList = inputVal(IDS.trendyolList).trim();
  if (tList !== "" && !numEq(tList, listSrc)) return true;

  const tQty = inputVal(IDS.trendyolQty).trim();
  if (tQty !== "" && !numEq(tQty, stock)) return true;

  const isActiveEl = document.getElementById(IDS.productIsActive);
  const productActive = isActiveEl instanceof HTMLInputElement && isActiveEl.checked;
  const tyAct = document.getElementById(IDS.trendyolActive);
  const trendyolOn = tyAct instanceof HTMLInputElement && tyAct.checked;
  if (productActive && !trendyolOn) return true;

  return false;
}

function applyTrendyolFillFromSite(overwrite: boolean) {
  const sku = inputVal(IDS.sku).trim();
  const price = inputVal(IDS.price).trim();
  const compare = inputVal(IDS.compare).trim();
  const stock = inputVal(IDS.stock).trim();
  const listSrc = compare !== "" ? compare : price;

  const isActiveEl = document.getElementById(IDS.productIsActive);
  const productActive = isActiveEl instanceof HTMLInputElement && isActiveEl.checked;

  const tStock = inputVal(IDS.trendyolStock).trim();
  if (overwrite || tStock === "" || tStock === sku) {
    setInputValue(IDS.trendyolStock, sku);
  }

  const tBrand = inputVal(IDS.trendyolBrand).trim();
  if (tBrand === "") {
    setInputValue(IDS.trendyolBrand, ZELULA_TRENDYOL_BRAND_ID);
  }

  const tSale = inputVal(IDS.trendyolSale).trim();
  if (overwrite || tSale === "" || numEq(tSale, price)) {
    setInputValue(IDS.trendyolSale, price);
  }

  const tList = inputVal(IDS.trendyolList).trim();
  if (overwrite || tList === "" || numEq(tList, listSrc)) {
    setInputValue(IDS.trendyolList, listSrc);
  }

  const tQty = inputVal(IDS.trendyolQty).trim();
  if (overwrite || tQty === "" || numEq(tQty, stock)) {
    setInputValue(IDS.trendyolQty, stock);
  }

  const tVat = inputVal(IDS.trendyolVat).trim();
  if (tVat === "") {
    setInputValue(IDS.trendyolVat, String(ZELULA_TRENDYOL_VAT_RATE));
  }

  if (productActive && overwrite) {
    setCheckbox(IDS.trendyolActive, true);
  }
}

const microSectionBtn =
  "shrink-0 rounded-lg border border-[#e7ded2]/70 bg-white/90 px-2.5 py-1.5 text-[10px] font-medium text-stone-700 shadow-sm transition-[background-color,box-shadow,transform] hover:border-[#dfd3c4] hover:bg-[#fdfcfa] hover:text-amber-900/90 active:scale-[0.99]";

function slugifyTrFromName(name: string): string {
  let s = name.trim();
  const pairs: [string, string][] = [
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
  for (const [a, b] of pairs) {
    s = s.split(a).join(b);
  }
  s = s.toLocaleLowerCase("tr-TR");
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s || "urun";
}

function sanitizeGeneratedSlug(slug: string): string {
  // Guard rail: historical source suffixes should never survive generation.
  let out = slug;
  // remove terminal tokens like -ig, -instagram, -source (single or repeated at end)
  out = out.replace(/(?:-(?:ig|instagram|source))+$/i, "");
  // remove patterns like -ig-123 or -instagram-abc at end
  out = out.replace(/-(?:ig|instagram|source)-[a-z0-9]+$/i, "");
  return out.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

const CATEGORY_PREFIX: Record<string, string> = {
  kupe: "KP",
  kolye: "KL",
  bileklik: "BL",
  bilezik: "BZ",
  yuzuk: "YZ",
  bros: "BR",
  halhal: "HH",
  set: "ST",
};

function normalizeCategoryKey(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function categoryShortFromLabel(label: string): string {
  const key = normalizeCategoryKey(label);
  return CATEGORY_PREFIX[key] ?? "ZL";
}

function selectedCategoryLabel(selectId: string): string {
  const sel = document.getElementById(selectId);
  if (!(sel instanceof HTMLSelectElement)) return "";
  const opt = sel.options[sel.selectedIndex];
  return opt?.text?.trim() ?? "";
}

function generateZelSku(): string {
  const name = inputVal(IDS.name);
  const label = selectedCategoryLabel(IDS.category);
  const prefix = label ? categoryShortFromLabel(label) : "ZL";
  const normalized = slugifyTrFromName(name).toUpperCase();
  const words = normalized.split("-").filter(Boolean);

  const generic = new Set(["KRISTAL", "TASLI", "MODEL", "OZEL", "TASARIM", "CELIK", "KUPE", "KOLYE", "BILEKLIK", "YUZUK", "BROS", "HALHAL", "SET"]);
  const variantWords = ["BUYUK", "KUCUK", "GOLD", "ROSE", "SILVER", "INCI", "ZIRKON"];

  const core = words.filter((w) => !generic.has(w) && !variantWords.includes(w));
  const variants = words.filter((w) => variantWords.includes(w));
  const model = core[0] ?? words[0] ?? "URUN";
  const variant = variants[0] ?? "";
  let sku = [prefix, model, variant].filter(Boolean).join("-");
  sku = sku.replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  return sku || `${prefix}-URUN`;
}

export function SlugFromNameButton() {
  const [feedback, setFeedbackMsg] = useState("");
  return (
    <button
      type="button"
      className={microCompact}
      onClick={() => {
        const nameEl = document.getElementById(IDS.name);
        const raw = nameEl instanceof HTMLInputElement ? nameEl.value : "";
        const nextSlug = sanitizeGeneratedSlug(slugifyTrFromName(raw));
        const current = inputVal(IDS.slug).trim();
        if (current && current !== nextSlug) {
          if (typeof window !== "undefined" && !window.confirm("Mevcut slug değiştirilsin mi?")) return;
        }
        setInputValue(IDS.slug, nextSlug);
        setFeedback(setFeedbackMsg, "Slug oluşturuldu");
      }}
    >
      {feedback || "Slug oluştur"}
    </button>
  );
}

export function SkuFromCategoryButton() {
  const [feedback, setFeedbackMsg] = useState("");
  return (
    <button
      type="button"
      className={microCompact}
      onClick={() => {
        const nextSku = generateZelSku();
        const current = inputVal(IDS.sku).trim();
        if (current && current !== nextSku) {
          if (typeof window !== "undefined" && !window.confirm("Mevcut değer değiştirilsin mi?")) return;
        }
        setInputValue(IDS.sku, nextSku);

        const tStock = inputVal(IDS.trendyolStock).trim();
        if (!tStock) {
          setInputValue(IDS.trendyolStock, nextSku);
        } else if (tStock !== nextSku) {
          if (typeof window !== "undefined" && window.confirm("Mevcut Trendyol stok kodu değiştirilsin mi?")) {
            setInputValue(IDS.trendyolStock, nextSku);
          }
        }
        setFeedback(setFeedbackMsg, "SKU oluşturuldu");
      }}
    >
      {feedback || "SKU oluştur"}
    </button>
  );
}

export function CopySkuToTrendyolStockButton() {
  return (
    <button
      type="button"
      className={microWide}
      onClick={() => {
        const skuEl = document.getElementById(IDS.sku);
        const v = skuEl instanceof HTMLInputElement ? skuEl.value.trim() : "";
        if (v) setInputValue(IDS.trendyolStock, v);
      }}
    >
      Trendyol stok koduna kopyala
    </button>
  );
}

export function CopyPriceToTrendyolSaleButton() {
  return (
    <button
      type="button"
      className={microWide}
      onClick={() => {
        const pEl = document.getElementById(IDS.price);
        const v = pEl instanceof HTMLInputElement ? pEl.value : "";
        if (v !== "") setInputValue(IDS.trendyolSale, v);
      }}
    >
      Fiyattan Trendyol satış fiyatına kopyala
    </button>
  );
}

export function CopyStockToTrendyolQtyButton() {
  return (
    <button
      type="button"
      className={microWide}
      onClick={() => {
        const sEl = document.getElementById(IDS.stock);
        const v = sEl instanceof HTMLInputElement ? sEl.value : "";
        if (v !== "") setInputValue(IDS.trendyolQty, v);
      }}
    >
      Stoktan Trendyol adede kopyala
    </button>
  );
}

export function FillTrendyolFromSiteButton() {
  return (
    <button
      type="button"
      className={microSectionBtn}
      onClick={() => {
        if (needsOverwriteConfirm()) {
          if (typeof window !== "undefined" && window.confirm(OVERWRITE_CONFIRM)) {
            applyTrendyolFillFromSite(true);
          } else {
            applyTrendyolFillFromSite(false);
          }
        } else {
          applyTrendyolFillFromSite(false);
        }
      }}
    >
      Site bilgilerinden doldur
    </button>
  );
}
