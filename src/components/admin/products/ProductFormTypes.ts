import type {
  CategoryAttributeDefinition,
  TrendyolCategoryAttributePickerRow,
} from "@/lib/marketplaces/trendyol/categories";

export type ProductFormInitialProduct = {
  id?: string;
  name?: string | null;
  slug?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  sku?: string | null;
  stock_quantity?: number | null;
  category_id?: string | null;
  collection_id?: string | null;
  material?: string | null;
  color?: string | null;
  featured?: boolean | null;
  new_arrival?: boolean | null;
  is_active?: boolean | null;
  trendyol_barcode?: string | null;
  trendyol_stock_code?: string | null;
  trendyol_brand?: string | null;
  trendyol_category_id?: string | null;
  trendyol_category_attributes?: unknown;
  trendyol_vat_rate?: number | null;
  trendyol_list_price?: number | null;
  trendyol_sale_price?: number | null;
  trendyol_quantity?: number | null;
  trendyol_dimensional_weight?: number | null;
  trendyol_active?: boolean | null;
  product_images?: { id: string; image_url: string; is_cover?: boolean | null }[];
};

export type ProductFormCategoryOption = { id: string; name: string };
export type ProductFormCollectionOption = { id: string; name: string };

export type ProductFormCategoryAttributeDefinition = CategoryAttributeDefinition;
export type { TrendyolCategoryAttributePickerRow };

export type ProductFormTrendyolReadiness = {
  status: "ready" | "missing" | "disabled";
  missingFields: string[];
};

export type ProductFormProps = {
  mode: "create" | "edit";
  initialProduct?: ProductFormInitialProduct | null;
  /** ISO; ürün düzenle sayfasında son kayıt göstergesi için */
  productUpdatedAt?: string | null;
  importedNeedsReview?: boolean;
  categories: ProductFormCategoryOption[];
  collections: ProductFormCollectionOption[];
  trendyolReadiness?: ProductFormTrendyolReadiness | null;
  /** When set (e.g. edit page), sticky summary can validate category JSON against required attributes. */
  trendyolCategoryAttributeDefinitions?: ProductFormCategoryAttributeDefinition[];
  /** Sunucudan gelen kategori özellik şeması — personel JSON yazmadan seçim listesi. */
  trendyolCategoryAttributePickerRows?: TrendyolCategoryAttributePickerRow[];
  openTrendyolByDefault?: boolean;
  returnTo: string;
  uploadProductImageAction?: (formData: FormData) => Promise<void>;
  deleteProductImageAction?: (formData: FormData) => Promise<void>;
  setProductCoverImageAction?: (formData: FormData) => Promise<void>;
  /** Edit sayfasında: kayıtlı ürünü Trendyol ürün + fiyat/stok API’lerine iter. */
  pushTrendyolProductAndInventoryAction?: (formData: FormData) => Promise<void>;
  saveProductAction: (formData: FormData) => Promise<void>;
};
