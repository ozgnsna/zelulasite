import { StarRatingDisplay } from "@/components/reviews/StarRating";
import { fetchFeaturedReviewsForHome } from "@/lib/account/reviews";
import { createClient } from "@/lib/supabase/server";

function formatQuote(body: string) {
  const trimmed = body.trim();
  if (!trimmed) return "“”";
  return trimmed.startsWith("“") ? trimmed : `“${trimmed}”`;
}

export async function HomeSocialProof() {
  const supabase = await createClient();
  const reviews = await fetchFeaturedReviewsForHome(supabase, 2);

  return (
    <section className="container-premium py-14 sm:py-16">
      <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-stone-600">Sosyal kanıt</p>
        <h2 className="mt-4 font-serif text-2xl font-light text-stone-900 sm:text-3xl">Zelula&apos;yı tercih edenler</h2>
        <p className="mt-3 text-base font-light leading-relaxed text-stone-700 sm:text-lg">
          {reviews.length > 0 ? (
            <>
              Müşterilerimizden gelen <span className="text-brand-gold-a11y">gerçek yorumlar</span>
            </>
          ) : (
            <>Satın alan müşterilerimizin yorumları onay sonrası burada görünecek.</>
          )}
        </p>
      </div>

      {reviews.length > 0 ? (
        <ul className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2 sm:gap-5">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-2xl border border-[#e8e2d9] bg-[#fffdfb] px-5 py-5 text-left shadow-[0_8px_24px_rgba(55,48,40,0.04)]"
            >
              <StarRatingDisplay rating={review.rating} size="sm" />
              {review.title ? <p className="mt-2 text-sm font-semibold text-stone-900">{review.title}</p> : null}
              <p className="mt-2 text-sm font-light leading-relaxed text-stone-800">{formatQuote(review.body)}</p>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-600">
                {review.reviewer_display_name}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
