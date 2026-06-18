import { CategoryClickLink } from "@/components/analytics/CategoryClickLink";
import { ProductImage } from "@/components/product/ProductImage";

type HomeCategoryGridItem = {
  label: string;
  href: string;
  image: string;
};

const DEFAULT_CATEGORIES: HomeCategoryGridItem[] = [
  {
    label: "Kolye",
    href: "/kategori/kolye",
    image: "https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    label: "Küpe",
    href: "/kategori/kupe",
    image: "https://images.pexels.com/photos/1454174/pexels-photo-1454174.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    label: "Bileklik",
    href: "/kategori/bileklik",
    image: "https://images.pexels.com/photos/10983783/pexels-photo-10983783.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    label: "Yüzük",
    href: "/kategori/yuzuk",
    image: "https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
] as const;

export function HomeCategoryGrid({ items }: { items?: HomeCategoryGridItem[] }) {
  const categories = items && items.length > 0 ? items : DEFAULT_CATEGORIES;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {categories.map((c) => (
        <li key={c.href}>
          <CategoryClickLink
            href={c.href}
            category={c.label}
            location="home_category_grid"
            className="group relative block overflow-hidden rounded-2xl border border-[#e8e2d9] bg-[#fffdfb] shadow-[0_8px_28px_rgba(55,48,40,0.06)] transition-shadow duration-300 hover:shadow-[0_16px_40px_rgba(55,48,40,0.1)]"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-[#f6f1e9] to-[#ece4d8]">
              <ProductImage
                src={c.image}
                alt=""
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-contain transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 via-black/15 to-transparent" aria-hidden />
              <p className="absolute bottom-2 left-3 font-serif text-base font-medium tracking-tight text-white drop-shadow-sm sm:bottom-4 sm:left-5 sm:text-2xl">
                {c.label}
              </p>
            </div>
          </CategoryClickLink>
        </li>
      ))}
    </ul>
  );
}
