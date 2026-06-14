import { ProductCard } from "@/components/ProductCard";
import { pickProductCoverImageUrl } from "@/lib/products/cover-image";
import type { Product } from "@/lib/types";

/** Kategori / ürün listelerinde mobil 2 sütun, kompakt kart. */
export const PRODUCT_LISTING_GRID_CLASS = "grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 lg:gap-8";

const DEFAULT_FALLBACK_IMAGE = "https://picsum.photos/id/99/900/900";

export function ProductListingGrid({
  products,
  isSignedIn,
  favoriteIds,
  conversionOverlay = true,
  fallbackImage = DEFAULT_FALLBACK_IMAGE,
}: {
  products: Product[];
  isSignedIn: boolean;
  favoriteIds: Set<string>;
  conversionOverlay?: boolean;
  fallbackImage?: string;
}) {
  return (
    <ul className={PRODUCT_LISTING_GRID_CLASS}>
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard
            id={p.id}
            slug={p.slug}
            name={p.name}
            summary={p.short_description}
            imageUrl={pickProductCoverImageUrl(p.product_images, fallbackImage)}
            price={Number(p.price)}
            compareAtPrice={p.compare_at_price ? Number(p.compare_at_price) : null}
            category={p.category?.name}
            collection={p.collection?.name ?? null}
            badges={{ bestseller: p.featured, new: p.new_arrival }}
            conversionOverlay={conversionOverlay}
            density="compact"
            isSignedIn={isSignedIn}
            initialFavorited={favoriteIds.has(p.id)}
          />
        </li>
      ))}
    </ul>
  );
}
