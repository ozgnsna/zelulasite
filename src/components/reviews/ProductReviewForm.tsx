"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitProductReview } from "@/app/actions/reviews";
import type { ProductReviewRow } from "@/lib/account/reviews";
import { reviewStatusLabelTr } from "@/lib/account/reviews";
import { StarRatingInput } from "@/components/reviews/StarRating";

export function ProductReviewForm({
  productId,
  productSlug,
  existingReview,
  loginNext,
}: {
  productId: string;
  productSlug: string;
  existingReview: ProductReviewRow | null;
  loginNext: string;
}) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (existingReview?.status === "approved") {
    return (
      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
        Yorumun yayında. Teşekkürler ✨
      </div>
    );
  }

  if (existingReview?.status === "pending") {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
        Yorumun inceleniyor. Onaylandığında bu sayfada görünecek.
      </div>
    );
  }

  return (
    <form
      className="rounded-2xl border border-[#e8dfd3] bg-[#fffdfb] p-5 shadow-[0_10px_26px_rgba(70,53,38,0.05)]"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        setError(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await submitProductReview(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setMessage("Yorumun alındı — incelendikten sonra yayınlanacak. Teşekkürler ✨");
        });
      }}
    >
      <h3 className="font-serif text-lg text-stone-900">Deneyimini paylaş</h3>
      <p className="mt-1 text-sm text-stone-600">Yalnızca bu ürünü satın alan müşteriler yorum yazabilir.</p>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Puanın</p>
        <div className="mt-2">
          <StarRatingInput name="rating" value={rating} onChange={setRating} disabled={pending} />
        </div>
      </div>

      <label className="mt-4 block">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Başlık (isteğe bağlı)</span>
        <input
          name="title"
          defaultValue={existingReview?.title ?? ""}
          maxLength={120}
          disabled={pending}
          className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900"
          placeholder="Kısa bir başlık"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Yorumun</span>
        <textarea
          name="body"
          defaultValue={existingReview?.status === "rejected" ? existingReview.body : ""}
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          disabled={pending}
          className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-relaxed text-stone-900"
          placeholder="Ürün hakkındaki deneyimini birkaç cümleyle anlat…"
        />
      </label>

      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productSlug" value={productSlug} />

      {existingReview?.status === "rejected" ? (
        <p className="mt-3 text-sm text-rose-800">Önceki yorumun yayınlanmadı — istersen düzenleyip tekrar gönderebilirsin.</p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-rose-700" role="alert">
          {error.includes("giriş") ? (
            <>
              {error}{" "}
              <Link href={`/giris?next=${encodeURIComponent(loginNext)}`} className="font-semibold underline">
                Giriş yap
              </Link>
            </>
          ) : (
            error
          )}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm text-emerald-800" role="status">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || rating < 1}
        className="mt-5 inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50"
      >
        {pending ? "Gönderiliyor…" : existingReview ? "Yeniden gönder" : "Yorumu gönder"}
      </button>

      {existingReview ? (
        <p className="mt-2 text-[11px] text-stone-500">Durum: {reviewStatusLabelTr(existingReview.status)}</p>
      ) : null}
    </form>
  );
}
