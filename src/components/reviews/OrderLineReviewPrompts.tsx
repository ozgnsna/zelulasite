import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserProductReview, canWriteProductReview } from "@/lib/account/reviews";

type OrderLine = {
  product_id: string;
  products: { name?: string | null; slug?: string | null } | null;
};

export async function OrderLineReviewPrompts({
  supabase,
  userId,
  paymentStatus,
  orderStatus,
  lines,
}: {
  supabase: SupabaseClient;
  userId: string;
  paymentStatus: string;
  orderStatus: string;
  lines: OrderLine[];
}) {
  if (!canWriteProductReview(paymentStatus, orderStatus)) return null;

  const uniqueProducts = new Map<string, { name: string; slug: string }>();
  for (const line of lines) {
    const productId = String(line.product_id ?? "").trim();
    const slug = String(line.products?.slug ?? "").trim();
    const name = String(line.products?.name ?? "Ürün").trim();
    if (productId && slug) uniqueProducts.set(productId, { name, slug });
  }

  if (uniqueProducts.size === 0) return null;

  const prompts = await Promise.all(
    [...uniqueProducts.entries()].map(async ([productId, product]) => {
      const review = await getUserProductReview(supabase, userId, productId);
      return { productId, product, review };
    }),
  );

  const actionable = prompts.filter((p) => !p.review || p.review.status === "rejected");
  if (actionable.length === 0) return null;

  return (
    <div className="mt-8 rounded-2xl border border-[#e8dfd3] bg-[#fffdfb] p-5">
      <h2 className="font-serif text-lg text-stone-900">Deneyimini paylaş</h2>
      <p className="mt-1 text-sm text-stone-600">Teslim aldığın ürünler hakkında yorum bırakabilirsin.</p>
      <ul className="mt-4 space-y-2">
        {actionable.map(({ productId, product, review }) => (
          <li key={productId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eadfce] bg-white px-4 py-3">
            <span className="text-sm font-medium text-stone-800">{product.name}</span>
            <Link
              href={`/urunler/${product.slug}?yorum=1#yorumlar`}
              className="inline-flex rounded-full border border-stone-900 bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
            >
              {review?.status === "rejected" ? "Yeniden yorum yaz" : "Yorum yaz"}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
