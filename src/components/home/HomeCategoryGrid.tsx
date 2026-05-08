import Image from "next/image";
import Link from "next/link";
import { trackCategoryClick } from "@/lib/analytics";

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
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {categories.map((c) => (
        <li key={c.href}>
          <Link
            href={c.href}
            className="group relative block overflow-hidden rounded-2xl border border-[#e8e2d9] bg-[#fffdfb] shadow-[0_8px_28px_rgba(55,48,40,0.06)] transition-shadow duration-300 hover:shadow-[0_16px_40px_rgba(55,48,40,0.1)]"
            onClick={() =>
              trackCategoryClick({ category: c.label, location: "home_category_grid", href: c.href })
            }
          >
            <div className="relative aspect-[16/11] overflow-hidden bg-stone-100">
              <Image
                src={c.image}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.06]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" aria-hidden />
              <p className="absolute bottom-3 left-4 font-serif text-xl font-medium tracking-tight text-white drop-shadow-sm sm:bottom-4 sm:left-5 sm:text-2xl">
                {c.label}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
