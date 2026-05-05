import Link from "next/link";

export function AdminQuickLinks() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="font-medium text-stone-800">Ürün Yönetimi</h2>
      <p className="mt-2 text-sm text-stone-500">Ürün ekleme ve düzenleme ekranları dashboard&apos;dan ayrıldı.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin/products/new"
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
        >
          Yeni ürün ekle
        </Link>
        <Link
          href="/admin/products"
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
        >
          Ürün listesine git
        </Link>
      </div>
    </div>
  );
}
