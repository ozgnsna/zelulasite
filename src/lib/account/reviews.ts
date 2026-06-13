import type { SupabaseClient } from "@supabase/supabase-js";

export type ProductReviewStatus = "pending" | "approved" | "rejected" | "hidden";

export type ProductReviewRow = {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string;
  reviewer_display_name: string;
  image_url: string | null;
  status: ProductReviewStatus;
  created_at: string;
  updated_at: string;
};

export type ProductReviewSummary = {
  count: number;
  average: number;
};

export type PublicProductReview = Pick<
  ProductReviewRow,
  "id" | "rating" | "title" | "body" | "reviewer_display_name" | "image_url" | "created_at"
>;

export function maskReviewerDisplayName(fullName: string | null | undefined): string {
  const clean = String(fullName ?? "").trim();
  if (!clean) return "Zelula müşterisi";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0];
    const lastInitial = parts[parts.length - 1]?.charAt(0).toUpperCase();
    if (lastInitial) return `${first} ${lastInitial}.`;
  }
  return clean;
}

export function isQualifyingPaidOrder(paymentStatus: string | null | undefined, orderStatus: string | null | undefined): boolean {
  return paymentStatus === "paid" && String(orderStatus ?? "") !== "cancelled";
}

export async function findQualifyingOrderIdForProduct(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("orders")
    .select("id, created_at, order_items!inner(product_id)")
    .eq("user_id", userId)
    .eq("payment_status", "paid")
    .neq("order_status", "cancelled")
    .eq("order_items.product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1);

  const orderId = String(data?.[0]?.id ?? "").trim();
  return orderId || null;
}

export async function getUserProductReview(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
): Promise<ProductReviewRow | null> {
  const { data } = await supabase
    .from("customer_product_reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  return (data as ProductReviewRow | null) ?? null;
}

export async function listApprovedProductReviews(
  supabase: SupabaseClient,
  productId: string,
  limit = 20,
): Promise<PublicProductReview[]> {
  const { data } = await supabase
    .from("customer_product_reviews")
    .select("id, rating, title, body, reviewer_display_name, image_url, created_at")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as PublicProductReview[];
}

export async function getProductReviewSummary(
  supabase: SupabaseClient,
  productId: string,
): Promise<ProductReviewSummary | null> {
  const { data } = await supabase
    .from("customer_product_reviews")
    .select("rating")
    .eq("product_id", productId)
    .eq("status", "approved");

  const rows = data ?? [];
  if (rows.length === 0) return null;
  const sum = rows.reduce((acc, row) => acc + Number(row.rating ?? 0), 0);
  return {
    count: rows.length,
    average: Math.round((sum / rows.length) * 10) / 10,
  };
}

export async function fetchFeaturedReviewsForHome(
  supabase: SupabaseClient,
  limit = 2,
): Promise<PublicProductReview[]> {
  const { data } = await supabase
    .from("customer_product_reviews")
    .select("id, rating, title, body, reviewer_display_name, image_url, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as PublicProductReview[];
}

export type AdminReviewRow = ProductReviewRow & {
  products: { name: string; slug: string } | null;
};

export async function listReviewsForAdmin(
  admin: SupabaseClient,
  status: ProductReviewStatus | "all",
  limit = 100,
): Promise<AdminReviewRow[]> {
  let query = admin
    .from("customer_product_reviews")
    .select("*, products(name, slug)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data } = await query;
  return (data ?? []) as AdminReviewRow[];
}

export function reviewStatusLabelTr(status: ProductReviewStatus): string {
  switch (status) {
    case "pending":
      return "İnceleniyor";
    case "approved":
      return "Yayında";
    case "rejected":
      return "Reddedildi";
    case "hidden":
      return "Gizli";
    default:
      return status;
  }
}
