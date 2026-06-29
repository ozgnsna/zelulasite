"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleProductFavorite } from "@/app/actions/favorites";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  productSlug: string;
  initialFavorited: boolean;
  isSignedIn: boolean;
  className?: string;
  /** card: görsel köşesi; inline: PDP başlık yanı */
  variant?: "card" | "inline";
};

export function ProductFavoriteButton({
  productId,
  productSlug,
  initialFavorited,
  isSignedIn,
  className,
  variant = "card",
}: Props) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  const nextPath = `/urunler/${productSlug}`;
  const signInHref = `/giris?next=${encodeURIComponent(nextPath)}`;

  const baseBtn =
    variant === "card"
      ? "touch-target rounded-full border border-[#e8dfd3]/95 bg-[#fffdfb]/95 text-stone-600 shadow-sm backdrop-blur-sm transition hover:border-[color:var(--brand-gold)]/40 hover:text-[#8b6a3f]"
      : "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e8dfd3]/95 bg-[#fffdfb]/90 text-stone-600 shadow-sm transition hover:border-[color:var(--brand-gold)]/40 hover:text-[#8b6a3f]";

  if (!isSignedIn) {
    return (
      <Link
        href={signInHref}
        className={cn(baseBtn, className)}
        aria-label="Favorilere eklemek için giriş yap"
        title="Favorilere eklemek için giriş yap"
      >
        <Heart className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.75} aria-hidden />
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      className={cn(baseBtn, pending && "opacity-60", className)}
      aria-pressed={favorited}
      aria-label={favorited ? "Favorilerden çıkar" : "Favorilere ekle"}
      title={favorited ? "Favorilerden çıkar" : "Favorilere ekle"}
      onClick={() => {
        startTransition(async () => {
          const prev = favorited;
          setFavorited(!prev);
          const r = await toggleProductFavorite(productId, productSlug);
          if (!r.ok) {
            setFavorited(prev);
            return;
          }
          setFavorited(r.favorited);
          router.refresh();
        });
      }}
    >
      <Heart
        className={cn("h-[1.15rem] w-[1.15rem] transition", favorited && "fill-[#c6a15b] text-[#c6a15b]")}
        strokeWidth={1.75}
        fill={favorited ? "currentColor" : "none"}
        aria-hidden
      />
    </button>
  );
}
