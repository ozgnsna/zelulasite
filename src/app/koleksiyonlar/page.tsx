import Link from "next/link";
import { getHomeData } from "@/lib/storefront";

export const metadata = { title: "Koleksiyonlar" };

export default async function CollectionsPage() {
  const { collections } = await getHomeData();
  return (
    <main className="container-premium py-12">
      <h1 className="font-serif text-4xl">Koleksiyonlar</h1>
      <p className="mt-3 text-stone-600">Her koleksiyon kendi hikayesine sahip; size en yakın ruhu seçin.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {collections.map((c) => (
          <Link key={c.id} href={`/urunler?koleksiyon=${c.slug}`} className="rounded-2xl border border-[#e7ddcf] bg-white p-6 hover:shadow-sm">
            <p className="font-medium text-stone-900">{c.name}</p>
            <p className="mt-2 text-sm text-stone-500">{c.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
