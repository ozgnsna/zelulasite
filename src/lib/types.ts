export type Category = {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  /** Opsiyonel; Supabase `categories.parent_id` ile uyumlu */
  parent_id?: string | null;
};

export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url?: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  full_description: string;
  price: number;
  compare_at_price: number | null;
  sku: string;
  stock_quantity: number;
  featured: boolean;
  new_arrival: boolean;
  category_id: string;
  collection_id: string | null;
  material: string | null;
  color: string | null;
  is_active: boolean;
  product_kind?: "physical" | "gift_card";
  trendyol_barcode?: string | null;
  trendyol_stock_code?: string | null;
  trendyol_brand?: string | null;
  trendyol_category_id?: string | null;
  trendyol_category_attributes?: unknown;
  trendyol_vat_rate?: number;
  trendyol_list_price?: number | null;
  trendyol_sale_price?: number | null;
  trendyol_quantity?: number | null;
  trendyol_dimensional_weight?: number | null;
  trendyol_active?: boolean;
  created_at: string;
  category?: Category;
  collection?: Collection | null;
  product_images?: { id: string; image_url: string; is_cover: boolean }[];
  /** Ölçü/varyant satırları (örn. yüzük ölçüsü). Boşsa ürün varyantsızdır. */
  variants?: ProductVariant[];
  /** `category?.slug` ile aynı; liste/grid kolaylığı için */
  categorySlug?: string;
};

/** Ürün varyantı — örn. yüzük ölçüsü "6", "7". Her varyantın kendi stoğu var. */
export type ProductVariant = {
  id: string;
  product_id: string;
  label: string;
  sku: string | null;
  stock_quantity: number;
  sort_order: number;
  is_active: boolean;
};

import type { GiftCardCartMeta } from "@/lib/gift-cards/types";

export type { GiftCardCartMeta };

export type CartItem = {
  productId: string;
  quantity: number;
  /** Seçilen varyant (örn. yüzük ölçüsü). Varyantlı üründe zorunlu. */
  variantId?: string;
  /** Sepet/checkout görünümü için anlık etiket kopyası (örn. "7"). */
  variantLabel?: string;
  /** Dijital hediye kartı satın alımı — checkout / fulfillment için */
  giftCard?: GiftCardCartMeta;
};

/** `customer_saved_addresses` — checkout ve Hesabım */
export type SavedAddress = {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string;
  district: string;
  postal_code: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

export type {
  LegalContractSnapshot,
  LegalContractSnapshotDocuments,
} from "@/lib/legal/legal-snapshot";

/** `orders` yasal kanıt alanları (sipariş detayı / raporlama) */
export type OrderLegalProofColumns = {
  legal_contract_hash: string | null;
};

export type { CookieConsent } from "@/lib/cookies/consent";
