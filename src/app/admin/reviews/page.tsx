import Link from "next/link";
import { redirect } from "next/navigation";
import { moderateProductReviewAction } from "@/app/actions/reviews-admin";
import { ADMIN_OPERATIONS_MAIN } from "@/lib/admin/admin-shell-layout";
import { listReviewsForAdmin, reviewStatusLabelTr, type ProductReviewStatus } from "@/lib/account/reviews";
import { StarRatingDisplay } from "@/components/reviews/StarRating";
import { ReviewPhoto } from "@/components/reviews/ReviewPhoto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? "")) redirect("/admin/login");

  const statusRaw = String(sp.status ?? "pending").trim() as ProductReviewStatus | "all";
  const status: ProductReviewStatus | "all" =
    statusRaw === "approved" || statusRaw === "rejected" || statusRaw === "hidden" || statusRaw === "all"
      ? statusRaw
      : "pending";

  const admin = createAdminClient();
  const reviews = await listReviewsForAdmin(admin, status);
  const pendingCount = status === "pending" ? reviews.length : (await listReviewsForAdmin(admin, "pending")).length;

  const filters: Array<{ key: ProductReviewStatus | "all"; label: string }> = [
    { key: "pending", label: "Bekleyen" },
    { key: "approved", label: "Yayında" },
    { key: "rejected", label: "Reddedilen" },
    { key: "hidden", label: "Gizli" },
    { key: "all", label: "Tümü" },
  ];

  return (
    <main className={`${ADMIN_OPERATIONS_MAIN} py-8 sm:py-10 lg:py-12`}>
      <header className="border-b border-stone-200/55 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Müşteri içeriği</p>
        <h1 className="mt-1 font-serif text-2xl font-light text-stone-900 sm:text-3xl">Ürün yorumları</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Satın alma doğrulamalı yorumlar onaydan sonra ürün sayfasında ve ana sayfada görünür.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={`/admin/reviews?status=${f.key}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              status === f.key
                ? "bg-stone-900 text-white"
                : "border border-stone-200 bg-white text-stone-700 hover:border-stone-300"
            }`}
          >
            {f.label}
            {f.key === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </Link>
        ))}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-8 rounded-xl border border-stone-200 bg-stone-50 px-4 py-6 text-sm text-stone-600">
          Bu filtrede yorum yok.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map((review) => {
            const product = review.products;
            return (
              <li key={review.id} className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StarRatingDisplay rating={review.rating} size="sm" />
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                        {reviewStatusLabelTr(review.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-stone-900">
                      {product?.name ?? "Ürün"}{" "}
                      {product?.slug ? (
                        <Link href={`/urunler/${product.slug}`} className="font-normal text-[#8a734f] hover:underline">
                          (vitrin)
                        </Link>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {review.reviewer_display_name} · {formatWhen(review.created_at)}
                    </p>
                  </div>
                  {review.status === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={moderateProductReviewAction}>
                        <input type="hidden" name="reviewId" value={review.id} />
                        <input type="hidden" name="productSlug" value={product?.slug ?? ""} />
                        <input type="hidden" name="status" value="approved" />
                        <button type="submit" className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">
                          Onayla
                        </button>
                      </form>
                      <form action={moderateProductReviewAction}>
                        <input type="hidden" name="reviewId" value={review.id} />
                        <input type="hidden" name="productSlug" value={product?.slug ?? ""} />
                        <input type="hidden" name="status" value="rejected" />
                        <button type="submit" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100">
                          Reddet
                        </button>
                      </form>
                    </div>
                  ) : review.status === "approved" ? (
                    <form action={moderateProductReviewAction}>
                      <input type="hidden" name="reviewId" value={review.id} />
                      <input type="hidden" name="productSlug" value={product?.slug ?? ""} />
                      <input type="hidden" name="status" value="hidden" />
                      <button type="submit" className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                        Gizle
                      </button>
                    </form>
                  ) : review.status === "hidden" ? (
                    <form action={moderateProductReviewAction}>
                      <input type="hidden" name="reviewId" value={review.id} />
                      <input type="hidden" name="productSlug" value={product?.slug ?? ""} />
                      <input type="hidden" name="status" value="approved" />
                      <button type="submit" className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800">
                        Yeniden yayınla
                      </button>
                    </form>
                  ) : null}
                </div>
                {review.title ? <p className="mt-3 text-sm font-medium text-stone-900">{review.title}</p> : null}
                <p className="mt-2 text-sm leading-relaxed text-stone-700">{review.body}</p>
                {review.image_url ? (
                  <div className="mt-3">
                    <ReviewPhoto src={review.image_url} alt="Yorum fotoğrafı" className="size-32" sizes="128px" />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
