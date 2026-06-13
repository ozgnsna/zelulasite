import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findQualifyingOrderIdForProduct,
  getProductReviewSummary,
  getUserProductReview,
  listApprovedProductReviews,
  type ProductReviewRow,
  type ProductReviewSummary,
  type PublicProductReview,
} from "@/lib/account/reviews";
import { ProductReviewForm } from "@/components/reviews/ProductReviewForm";
import { ReviewPhoto } from "@/components/reviews/ReviewPhoto";
import { StarRatingDisplay } from "@/components/reviews/StarRating";

function formatReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export async function loadProductReviewSectionData(
  supabase: SupabaseClient,
  product: { id: string; slug: string; name: string },
  userId: string | null | undefined,
  options?: { highlightForm?: boolean },
) {
  const [reviews, summary, userReview, canReview] = await Promise.all([
    listApprovedProductReviews(supabase, product.id),
    getProductReviewSummary(supabase, product.id),
    userId ? getUserProductReview(supabase, userId, product.id) : Promise.resolve(null),
    userId ? findQualifyingOrderIdForProduct(supabase, userId, product.id).then(Boolean) : Promise.resolve(false),
  ]);

  return {
    reviews,
    summary,
    userReview,
    canReview,
    highlightForm: options?.highlightForm ?? false,
    loginNext: `/urunler/${product.slug}#yorumlar`,
  };
}

export function ProductReviewsSection({
  productName,
  productId,
  productSlug,
  reviews,
  summary,
  userReview,
  canReview,
  isLoggedIn,
  highlightForm,
  loginNext,
}: {
  productName: string;
  productId: string;
  productSlug: string;
  reviews: PublicProductReview[];
  summary: ProductReviewSummary | null;
  userReview: ProductReviewRow | null;
  canReview: boolean;
  isLoggedIn: boolean;
  highlightForm?: boolean;
  loginNext: string;
}) {
  const showForm =
    isLoggedIn && canReview && userReview?.status !== "approved" && userReview?.status !== "pending";

  return (
    <section
      id="yorumlar"
      className={`scroll-mt-28 space-y-6 ${highlightForm ? "rounded-2xl ring-2 ring-[#c6a15b]/40 ring-offset-4" : ""}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-gold">Müşteri yorumları</h2>
          <p className="mt-2 font-serif text-xl text-stone-900 sm:text-2xl">{productName}</p>
        </div>
        {summary ? (
          <div className="text-right">
            <StarRatingDisplay rating={summary.average} />
            <p className="mt-1 text-sm text-stone-600">
              {summary.average.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5 ·{" "}
              {summary.count.toLocaleString("tr-TR")} yorum
            </p>
          </div>
        ) : (
          <p className="text-sm text-stone-500">Henüz yayınlanmış yorum yok.</p>
        )}
      </div>

      {showForm ? (
        <ProductReviewForm
          productId={productId}
          productSlug={productSlug}
          existingReview={userReview}
          loginNext={loginNext}
        />
      ) : !isLoggedIn ? (
        <div className="rounded-2xl border border-[#e8dfd3] bg-[#faf8f5] px-4 py-4 text-sm text-stone-700">
          Yorum yazmak için{" "}
          <Link href={`/giris?next=${encodeURIComponent(loginNext)}`} className="font-semibold text-[#8a734f] underline-offset-2 hover:underline">
            giriş yap
          </Link>{" "}
          ve bu ürünü satın almış olmalısın.
        </div>
      ) : !canReview ? (
        <div className="rounded-2xl border border-[#e8dfd3] bg-[#faf8f5] px-4 py-4 text-sm text-stone-600">
          Bu ürün için yorum yalnızca ödenmiş siparişlerden sonra açılır.
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-2xl border border-[#e8dfd3] bg-white px-5 py-4 shadow-[0_8px_22px_rgba(62,53,42,0.04)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StarRatingDisplay rating={review.rating} size="sm" />
                <time className="text-[11px] text-stone-500" dateTime={review.created_at}>
                  {formatReviewDate(review.created_at)}
                </time>
              </div>
              {review.title ? <p className="mt-2 text-sm font-semibold text-stone-900">{review.title}</p> : null}
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{review.body}</p>
              {review.image_url ? (
                <div className="mt-3">
                  <ReviewPhoto src={review.image_url} alt={`${review.reviewer_display_name} yorum fotoğrafı`} className="size-32 sm:size-36" sizes="144px" />
                </div>
              ) : null}
              <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
                {review.reviewer_display_name}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-500">İlk yorumu sen bırakabilirsin.</p>
      )}
    </section>
  );
}
