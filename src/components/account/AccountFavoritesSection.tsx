import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductListingGrid } from "@/components/product/ProductListingGrid";
import { listFavoriteProductsForUser } from "@/lib/account/favorites";

export async function AccountFavoritesSection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const favorites = await listFavoriteProductsForUser(supabase, user.id);

  return (
    <section id="favorilerim" className="scroll-mt-28">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">Listeler</p>
      <div className="zl-divider mt-2" />
      <div className="mt-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-serif text-xl text-stone-900 sm:text-2xl">Favorilerim</h2>
      </div>
      {favorites.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-[#e0d5c8] bg-[#faf8f5]/80 px-5 py-10 text-center text-sm text-stone-600">
          Henüz favori ürünün yok. Ürün görsellerindeki kalbe dokunarak ekleyebilirsin.{" "}
          <Link href="/urunler" className="font-medium text-[#7a5f38] underline-offset-2 hover:underline">
            Ürünlere göz at
          </Link>
        </p>
      ) : (
        <ProductListingGrid
          products={favorites}
          isSignedIn
          favoriteIds={new Set(favorites.map((p) => p.id))}
          conversionOverlay={false}
          fallbackImage="https://picsum.photos/id/90/900/900"
        />
      )}
    </section>
  );
}
