"use client";

import { useActionState } from "react";
import {
  syncGiftCardProductImagesAction,
  type GiftCardImageSyncState,
} from "@/app/actions/gift-cards-admin";

export function GiftCardImageSyncPanel({ targetUrl }: { targetUrl: string | null }) {
  const [state, action, pending] = useActionState<GiftCardImageSyncState | undefined, FormData>(
    syncGiftCardProductImagesAction,
    undefined,
  );

  return (
    <section className="mt-10 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-700">Kapak görseli</h2>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        Storage: <code className="rounded bg-stone-100 px-1">product-images/zelula-gift-card.svg</code>. Önce{" "}
        <code className="rounded bg-stone-100 px-1">npm run upload:gift-card-image</code>, sonra veritabanına uygulayın.
      </p>
      {targetUrl ? (
        <p className="mt-3 break-all font-mono text-[11px] text-stone-600">{targetUrl}</p>
      ) : (
        <p className="mt-3 text-xs text-amber-800">NEXT_PUBLIC_SUPABASE_URL tanımlı değil — URL üretilemiyor.</p>
      )}
      <form action={action} className="mt-4">
        <button
          type="submit"
          disabled={pending || !targetUrl}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Uygulanıyor…" : "Görseli veritabanına uygula"}
        </button>
      </form>
      {state?.ok ? (
        <p className="mt-3 text-xs text-emerald-800" role="status">
          {state.message}
        </p>
      ) : null}
      {state && !state.ok ? (
        <p className="mt-3 text-xs text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}
